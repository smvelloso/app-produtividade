/* ============================================================
   REDE GIRASSOL — ia.js — Integração Claude (Anthropic)
   ============================================================ */

// ── ESTADO DA IA ──────────────────────────────────────────────
const IA = {
  conversationHistory: [],  // { role: 'user'|'assistant', content: string }
  isThinking: false,
  contextData: null,        // dados dos relatórios carregados
};

// ── CHAVE E MODELO ────────────────────────────────────────────
function getApiKey()   { return localStorage.getItem('girassol_claude_key') || ''; }
function getModel()    { return localStorage.getItem('girassol_claude_model') || 'claude-haiku-4-5'; }
function saveApiKey(k) { localStorage.setItem('girassol_claude_key', k.trim()); }
function saveModel(m)  { localStorage.setItem('girassol_claude_model', m); }

// ── CARREGAR CONTEXTO DOS RELATÓRIOS ─────────────────────────
async function loadReportsContext() {
  const tables = [
    { key: 'relatorios_pauta',              label: 'Relatórios de Pauta' },
    { key: 'relatorios_programas_diarios',  label: 'Programas Diários' },
    { key: 'relatorios_programas_gravados', label: 'Programas Gravados' },
    { key: 'relatorios_semanais',           label: 'Relatórios Semanais' },
  ];
  const ctx = {};
  for (const t of tables) {
    try {
      const res = await fetch(`tables/${t.key}?limit=200`);
      const json = await res.json();
      ctx[t.key] = json.data || [];
    } catch { ctx[t.key] = []; }
  }
  IA.contextData = ctx;
  return ctx;
}

// ── CONSTRUIR SYSTEM PROMPT COM CONTEXTO ─────────────────────
function buildSystemPrompt(ctx) {
  const counts = {
    pauta:    (ctx.relatorios_pauta              || []).length,
    diarios:  (ctx.relatorios_programas_diarios  || []).length,
    gravados: (ctx.relatorios_programas_gravados || []).length,
    semanais: (ctx.relatorios_semanais           || []).length,
  };

  // Resumo compacto dos dados para o prompt
  const summarize = (arr, fields) =>
    arr.slice(0, 50).map(r => {
      const obj = {};
      fields.forEach(f => { if (r[f]) obj[f] = r[f]; });
      // Parse JSON fields
      Object.keys(obj).forEach(k => {
        try { const p = JSON.parse(obj[k]); if (Array.isArray(p) || typeof p === 'object') obj[k] = p; } catch {}
      });
      return obj;
    });

  const pautaData    = summarize(ctx.relatorios_pauta || [], ['data_referencia','elaborado_por','pautas_confirmadas','pautas_canceladas','pautas_pendentes','equipas_tecnicas','notas_gerais','status']);
  const diariosData  = summarize(ctx.relatorios_programas_diarios || [], ['data_emissao','elaborado_por','programas','incidentes','observacoes_gerais','status']);
  const gravadosData = summarize(ctx.relatorios_programas_gravados || [], ['nome_programa','data_gravacao','local_gravacao','duracao_total','conteudo_gravado','equipa_tecnica','incidentes','status']);
  const semanalData  = summarize(ctx.relatorios_semanais || [], ['semana_referencia','numero_semana','elaborado_por','gravacoes_semana','programas_emitidos','pendencias','indicadores','observacoes_gerais','status']);

  return `Você é o assistente de IA da Rede Girassol, especializado em análise de produção televisiva e gestão de conteúdos.

Você tem acesso COMPLETO e em TEMPO REAL à base de dados de relatórios da Direcção de Produção da Rede Girassol.

## DADOS ACTUAIS DA BASE DE DADOS

### Resumo Quantitativo
- Relatórios de Pauta: ${counts.pauta} registos
- Programas Diários: ${counts.diarios} registos  
- Programas Gravados: ${counts.gravados} registos
- Relatórios Semanais: ${counts.semanais} registos
- TOTAL: ${counts.pauta + counts.diarios + counts.gravados + counts.semanais} relatórios

### Dados de Pautas
${JSON.stringify(pautaData, null, 1)}

### Dados de Programas Diários
${JSON.stringify(diariosData, null, 1)}

### Dados de Programas Gravados
${JSON.stringify(gravadosData, null, 1)}

### Dados de Relatórios Semanais
${JSON.stringify(semanalData, null, 1)}

## SUAS RESPONSABILIDADES

1. **Análise de Padrões** — Identifique tendências, repetições, programas problemáticos, horários críticos
2. **Detecção de Problemas** — Incidentes recorrentes, pautas canceladas com frequência, atrasos sistemáticos
3. **Indicadores de Performance** — Taxa de cumprimento de pautas, eficiência de gravação, pontualidade
4. **Recomendações Concretas** — Sugestões práticas baseadas nos dados reais
5. **Comparações Temporais** — Evoluções semana a semana, mês a mês
6. **Gestão de Recursos** — Análise de equipas, equipamentos, reportagens

## INSTRUÇÕES DE RESPOSTA

- Responda SEMPRE em Português Europeu (de Angola)
- Use os dados reais da base de dados nas suas análises
- Seja directo, prático e orientado a soluções
- Use emojis e formatação clara (listas, negrito) para facilitar a leitura
- Quando não houver dados suficientes, diga claramente e sugira o que registar
- Identifique nomes de programas, repórteres, locais que aparecem com mais frequência
- Calcule percentagens e métricas quando relevante
- Dê prioridade a problemas urgentes ou recorrentes

Hoje é: ${new Date().toLocaleDateString('pt-AO', { weekday:'long', day:'2-digit', month:'long', year:'numeric' })}`;
}

// ── CHAMADA À API CLAUDE ──────────────────────────────────────
async function callClaude(userMessage) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('NO_KEY');

  const model = getModel();
  const ctx   = IA.contextData || await loadReportsContext();
  const systemPrompt = buildSystemPrompt(ctx);

  // Adicionar mensagem do utilizador ao histórico
  IA.conversationHistory.push({ role: 'user', content: userMessage });

  const body = {
    model,
    max_tokens: 2048,
    system: systemPrompt,
    messages: IA.conversationHistory.slice(-20), // últimas 20 msgs para não exceder tokens
  };

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    if (response.status === 401) throw new Error('INVALID_KEY');
    if (response.status === 429) throw new Error('RATE_LIMIT');
    throw new Error(err.error?.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  const assistantMsg = data.content?.[0]?.text || '';

  // Adicionar resposta ao histórico
  IA.conversationHistory.push({ role: 'assistant', content: assistantMsg });

  return assistantMsg;
}

// ── RENDERIZAR MARKDOWN SIMPLES ───────────────────────────────
function renderMarkdown(text) {
  return text
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    // Cabeçalhos
    .replace(/^### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    // Negrito e itálico
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,     '<em>$1</em>')
    // Código inline
    .replace(/`(.+?)`/g, '<code>$1</code>')
    // Listas não ordenadas
    .replace(/^[•\-] (.+)$/gm, '<li>$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
    // Separadores
    .replace(/^---$/gm, '<hr>')
    // Parágrafos (linhas vazias)
    .replace(/\n\n/g, '</p><p>')
    // Quebras de linha simples
    .replace(/\n/g, '<br>')
    // Envolver listas
    .replace(/(<li>.*?<\/li>)(\s*<br>\s*(<li>))/g, '$1$3')
    .replace(/((?:<li>.*?<\/li>)+)/gs, '<ul>$1</ul>');
}

// ── PÁGINA: ANÁLISE COM IA ────────────────────────────────────
async function renderIA(el) {
  const hasKey = !!getApiKey();

  el.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title"><i class="fas fa-robot" style="color:var(--primary);margin-right:8px;"></i>Análise com <span>IA — Claude</span></div>
        <p style="color:var(--text-muted);font-size:14px;margin-top:4px;">Converse com a IA sobre os seus relatórios e obtenha insights de gestão</p>
      </div>
      ${!hasKey ? `<button class="btn btn-outline" onclick="navigate('configuracoes')"><i class="fas fa-key"></i> Configurar API Key</button>` : ''}
    </div>

    ${!hasKey ? `
    <div class="info-box" style="margin-bottom:20px;">
      <i class="fas fa-exclamation-triangle" style="color:#E67E22;"></i>
      <div>
        <strong>Chave API não configurada.</strong> Para usar a análise com IA, vá às 
        <a href="#" onclick="navigate('configuracoes');return false;" style="color:var(--primary);font-weight:700;">Configurações</a> 
        e insira a sua chave API da Anthropic (Claude).
      </div>
    </div>` : ''}

    <div class="ia-layout">
      <!-- CHAT -->
      <div class="ia-chat-card">
        <div class="ia-chat-header">
          <div class="ia-avatar"><i class="fas fa-robot"></i></div>
          <div>
            <h3>Claude — Assistente de Produção</h3>
            <p id="iaModelLabel">${getModel()}</p>
          </div>
          <div class="ia-status-dot ${hasKey ? 'online' : ''}" id="iaStatusDot"></div>
        </div>

        <div class="ia-messages" id="iaMessages">
          <!-- mensagem de boas-vindas -->
          <div class="ia-msg assistant">
            <div class="ia-msg-avatar"><i class="fas fa-robot"></i></div>
            <div>
              <div class="ia-msg-bubble">${renderMarkdown(hasKey
                ? `Olá! 👋 Sou o assistente de IA da **Rede Girassol**.\n\nTenho acesso a todos os seus relatórios de produção e posso ajudá-lo a:\n\n- 📊 **Analisar padrões** e tendências nos dados\n- 🔴 **Identificar problemas** recorrentes\n- 💡 **Sugerir melhorias** de gestão\n- 📈 **Comparar** desempenho entre períodos\n\nO que pretende analisar hoje?`
                : `Olá! 👋 Para activar a análise com IA, precisa de configurar a sua **chave API da Anthropic**.\n\nClique em **Configurações** na barra lateral e insira a sua API Key.\n\nSe ainda não tem uma conta, aceda a [console.anthropic.com](https://console.anthropic.com) para criar.`
              )}</div>
              <div class="ia-msg-time">${new Date().toLocaleTimeString('pt-AO',{hour:'2-digit',minute:'2-digit'})}</div>
            </div>
          </div>
        </div>

        <div class="ia-input-area">
          <textarea
            id="iaInput"
            placeholder="${hasKey ? 'Escreva a sua pergunta sobre os relatórios…' : 'Configure a API Key nas Configurações para activar…'}"
            rows="1"
            ${!hasKey ? 'disabled' : ''}
            onkeydown="iaHandleKey(event)"
            oninput="iaAutoResize(this)"
          ></textarea>
          <button class="ia-send-btn" id="iaSendBtn" onclick="iaSend()" ${!hasKey ? 'disabled' : ''} title="Enviar (Enter)">
            <i class="fas fa-paper-plane"></i>
          </button>
        </div>
      </div>

      <!-- PAINEL LATERAL -->
      <div class="ia-side-panel">

        <!-- Contexto -->
        <div class="ia-context-info" id="iaContextInfo">
          <h4><i class="fas fa-database" style="margin-right:6px;color:var(--primary);"></i>Dados Carregados</h4>
          <div class="ia-context-row"><span>Pautas</span><span class="val" id="ctxPauta">…</span></div>
          <div class="ia-context-row"><span>Prog. Diários</span><span class="val" id="ctxDiarios">…</span></div>
          <div class="ia-context-row"><span>Prog. Gravados</span><span class="val" id="ctxGravados">…</span></div>
          <div class="ia-context-row"><span>Semanais</span><span class="val" id="ctxSemanais">…</span></div>
          <div class="ia-context-row" style="border:none;margin-top:6px;">
            <span style="font-size:11px;color:var(--text-muted);">Total de registos</span>
            <span class="val" id="ctxTotal">…</span>
          </div>
        </div>

        <!-- Análises Rápidas -->
        <div class="ia-quick-card">
          <div class="ia-quick-card-header"><i class="fas fa-bolt"></i> Análises Rápidas</div>
          <div class="ia-quick-card-body">
            <button class="ia-quick-btn" onclick="iaSendQuick('Faz uma análise geral do desempenho de produção com base em todos os relatórios disponíveis. Destaca os pontos fortes e as áreas a melhorar.')">
              <i class="fas fa-chart-pie"></i> Análise Geral de Desempenho
            </button>
            <button class="ia-quick-btn" onclick="iaSendQuick('Quais são os incidentes e falhas mais recorrentes nos relatórios? Identifica padrões e sugere medidas preventivas.')">
              <i class="fas fa-exclamation-triangle"></i> Incidentes Recorrentes
            </button>
            <button class="ia-quick-btn" onclick="iaSendQuick('Analisa as pautas canceladas e pendentes. Há programas ou repórteres com mais cancelamentos? Quais os principais motivos?')">
              <i class="fas fa-ban"></i> Pautas Canceladas / Pendentes
            </button>
            <button class="ia-quick-btn" onclick="iaSendQuick('Analisa a pontualidade das gravações. Os horários convocados estão a ser cumpridos? Há atrasos sistemáticos?')">
              <i class="fas fa-clock"></i> Pontualidade das Gravações
            </button>
            <button class="ia-quick-btn" onclick="iaSendQuick('Quais os programas com mais gravações registadas? Faz um ranking de produtividade por programa.')">
              <i class="fas fa-trophy"></i> Ranking de Produtividade
            </button>
            <button class="ia-quick-btn" onclick="iaSendQuick('Com base nos relatórios semanais, como tem evoluído a produção? Compara os indicadores disponíveis e identifica tendências.')">
              <i class="fas fa-trending-up"></i> Tendências Semanais
            </button>
            <button class="ia-quick-btn" onclick="iaSendQuick('Analisa a equipa técnica nos relatórios de gravação. Quem são os colaboradores mais activos? Há sobrecarga de algum membro?')">
              <i class="fas fa-users"></i> Análise de Equipas
            </button>
            <button class="ia-quick-btn" onclick="iaSendQuick('Que melhorias concretas e prioritárias recomendas para optimizar a gestão da Direcção de Produção da Rede Girassol?')">
              <i class="fas fa-lightbulb"></i> Recomendações de Melhoria
            </button>
          </div>
        </div>

        <!-- Controles -->
        <div class="ia-quick-card">
          <div class="ia-quick-card-header"><i class="fas fa-sliders-h"></i> Controlos</div>
          <div class="ia-quick-card-body">
            <button class="ia-quick-btn" onclick="iaRefreshContext()">
              <i class="fas fa-sync"></i> Actualizar Dados
            </button>
            <button class="ia-quick-btn" onclick="iaClearChat()">
              <i class="fas fa-trash"></i> Limpar Conversa
            </button>
          </div>
        </div>

      </div>
    </div>
  `;

  // Carregar contexto e actualizar contadores
  iaLoadContext();
}

async function iaLoadContext() {
  try {
    const ctx = await loadReportsContext();
    const p  = (ctx.relatorios_pauta              || []).length;
    const d  = (ctx.relatorios_programas_diarios  || []).length;
    const g  = (ctx.relatorios_programas_gravados || []).length;
    const s  = (ctx.relatorios_semanais           || []).length;
    document.getElementById('ctxPauta')?.setAttribute('textContent', p);
    document.getElementById('ctxDiarios')?.setAttribute('textContent', d);
    document.getElementById('ctxGravados')?.setAttribute('textContent', g);
    document.getElementById('ctxSemanais')?.setAttribute('textContent', s);
    document.getElementById('ctxTotal')?.setAttribute('textContent', p+d+g+s);

    // usar textContent directamente
    const setVal = (id, v) => { const el = document.getElementById(id); if(el) el.textContent = v; };
    setVal('ctxPauta', p);
    setVal('ctxDiarios', d);
    setVal('ctxGravados', g);
    setVal('ctxSemanais', s);
    setVal('ctxTotal', p + d + g + s);
  } catch {}
}

async function iaRefreshContext() {
  IA.contextData = null;
  await iaLoadContext();
  showToast('Dados actualizados!', 'success');
}

// ── ENVIAR MENSAGEM ───────────────────────────────────────────
async function iaSend() {
  const input = document.getElementById('iaInput');
  const msg = input?.value?.trim();
  if (!msg || IA.isThinking) return;
  input.value = '';
  iaAutoResize(input);
  await iaProcessMessage(msg);
}

async function iaSendQuick(prompt) {
  if (IA.isThinking) return;
  if (!getApiKey()) {
    showToast('Configure a API Key nas Configurações primeiro.', 'error');
    return;
  }
  // Colocar no input e enviar
  const input = document.getElementById('iaInput');
  if (input) input.value = prompt;
  await iaProcessMessage(prompt);
  if (input) input.value = '';
}

function iaHandleKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    iaSend();
  }
}

function iaAutoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

async function iaProcessMessage(userMsg) {
  if (!getApiKey()) {
    showToast('Configure a API Key nas Configurações.', 'error');
    navigate('configuracoes');
    return;
  }

  const messagesEl = document.getElementById('iaMessages');
  const sendBtn    = document.getElementById('iaSendBtn');
  const statusDot  = document.getElementById('iaStatusDot');

  // Adicionar mensagem do utilizador ao chat
  iaAppendMessage('user', userMsg, messagesEl);

  // Estado: a pensar
  IA.isThinking = true;
  if (sendBtn)    sendBtn.disabled = true;
  if (statusDot) { statusDot.classList.remove('online'); statusDot.classList.add('thinking'); }

  // Indicador de digitação
  const typingId = 'iaTyping_' + Date.now();
  messagesEl.insertAdjacentHTML('beforeend', `
    <div class="ia-msg assistant" id="${typingId}">
      <div class="ia-msg-avatar"><i class="fas fa-robot"></i></div>
      <div class="ia-typing"><span></span><span></span><span></span></div>
    </div>
  `);
  iaScrollBottom(messagesEl);

  try {
    const reply = await callClaude(userMsg);

    // Remover typing
    document.getElementById(typingId)?.remove();

    // Adicionar resposta
    iaAppendMessage('assistant', reply, messagesEl);

  } catch (err) {
    document.getElementById(typingId)?.remove();

    let errMsg = '❌ Ocorreu um erro ao contactar o Claude.';
    if (err.message === 'NO_KEY')      errMsg = '🔑 API Key não configurada. Vá às **Configurações** e insira a sua chave.';
    if (err.message === 'INVALID_KEY') errMsg = '🚫 API Key inválida ou expirada. Verifique nas **Configurações**.';
    if (err.message === 'RATE_LIMIT')  errMsg = '⏳ Limite de pedidos atingido. Aguarde um momento e tente novamente.';

    iaAppendMessage('assistant', errMsg, messagesEl);

    // Remover última mensagem do histórico (falhou)
    IA.conversationHistory.pop();
    if (IA.conversationHistory.length && IA.conversationHistory[IA.conversationHistory.length-1].role === 'user') {
      IA.conversationHistory.pop();
    }
  } finally {
    IA.isThinking = false;
    if (sendBtn)    sendBtn.disabled = false;
    if (statusDot) { statusDot.classList.remove('thinking'); statusDot.classList.add('online'); }
    document.getElementById('iaInput')?.focus();
  }
}

function iaAppendMessage(role, content, container) {
  const time = new Date().toLocaleTimeString('pt-AO', { hour:'2-digit', minute:'2-digit' });
  const isUser = role === 'user';
  const avatarIcon = isUser ? 'fa-user' : 'fa-robot';
  const html = `
    <div class="ia-msg ${role}">
      <div class="ia-msg-avatar"><i class="fas ${avatarIcon}"></i></div>
      <div>
        <div class="ia-msg-bubble">${isUser ? escapeHtml(content) : renderMarkdown(content)}</div>
        <div class="ia-msg-time">${time}</div>
      </div>
    </div>`;
  container.insertAdjacentHTML('beforeend', html);
  iaScrollBottom(container);
}

function iaScrollBottom(el) {
  if (el) setTimeout(() => { el.scrollTop = el.scrollHeight; }, 50);
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
}

function iaClearChat() {
  IA.conversationHistory = [];
  const el = document.getElementById('iaMessages');
  if (!el) return;
  el.innerHTML = `
    <div class="ia-msg assistant">
      <div class="ia-msg-avatar"><i class="fas fa-robot"></i></div>
      <div>
        <div class="ia-msg-bubble">${renderMarkdown('Conversa reiniciada. 🔄\n\nComo posso ajudá-lo a analisar os seus dados de produção?')}</div>
        <div class="ia-msg-time">${new Date().toLocaleTimeString('pt-AO',{hour:'2-digit',minute:'2-digit'})}</div>
      </div>
    </div>`;
  showToast('Conversa limpa.', 'info');
}

// ════════════════════════════════════════════════════════════════
//  PÁGINA: CONFIGURAÇÕES
// ════════════════════════════════════════════════════════════════
function renderConfiguracoes(el) {
  const currentKey   = getApiKey();
  const currentModel = getModel();
  const maskedKey    = currentKey ? '•'.repeat(Math.max(0, currentKey.length - 8)) + currentKey.slice(-8) : '';

  el.innerHTML = `
    <div class="page-header">
      <div class="page-title"><i class="fas fa-cog" style="color:var(--text-muted);margin-right:8px;"></i><span>Configurações</span></div>
    </div>

    <!-- API KEY -->
    <div class="config-card">
      <div class="config-card-header"><i class="fas fa-key"></i> Chave API — Anthropic (Claude)</div>
      <div class="config-card-body">
        <div class="form-group" style="margin-bottom:16px;">
          <label>API Key <span class="required">*</span></label>
          <div class="api-key-field">
            <input
              type="password"
              id="cfgApiKey"
              class="form-control"
              placeholder="sk-ant-api03-…"
              value="${currentKey}"
              autocomplete="off"
            >
            <button class="api-key-toggle" onclick="toggleKeyVisibility()" id="keyToggleBtn" type="button">
              <i class="fas fa-eye" id="keyToggleIcon"></i>
            </button>
          </div>

          ${currentKey
            ? `<div class="api-status ok"><i class="fas fa-check-circle"></i> Chave configurada: <code style="font-size:12px;background:rgba(0,0,0,.05);padding:1px 6px;border-radius:4px;">${maskedKey}</code></div>`
            : `<div class="api-status missing"><i class="fas fa-exclamation-circle"></i> Nenhuma chave configurada</div>`
          }
        </div>

        <div class="info-box">
          <i class="fas fa-shield-alt"></i>
          <div>
            <strong>Segurança:</strong> A sua chave API é guardada <strong>apenas no seu browser</strong> (localStorage).
            Nunca é enviada para servidores externos nem incluída no código-fonte da aplicação.
            Só é usada directamente para contactar a API da Anthropic.
          </div>
        </div>

        <div class="info-box" style="background:#EAFAF1;border-color:#A9DFBF;color:#1E8449;margin-top:10px;">
          <i class="fas fa-info-circle" style="color:var(--success);"></i>
          <div>
            Obtenha a sua chave API em <strong>console.anthropic.com</strong> → API Keys → Create Key.
            Certifique-se de que a chave começa com <code>sk-ant-</code>.
          </div>
        </div>

        <div class="form-actions" style="margin-top:20px;">
          <button class="btn btn-danger btn-sm" onclick="clearApiKey()" ${!currentKey ? 'disabled' : ''}>
            <i class="fas fa-trash"></i> Remover Chave
          </button>
          <button class="btn btn-primary" onclick="saveApiKeyFromForm()">
            <i class="fas fa-save"></i> Guardar Chave
          </button>
        </div>
      </div>
    </div>

    <!-- MODELO -->
    <div class="config-card">
      <div class="config-card-header"><i class="fas fa-microchip"></i> Modelo Claude</div>
      <div class="config-card-body">
        <p style="font-size:14px;color:var(--text-muted);margin-bottom:16px;">Escolha o modelo Claude a utilizar nas análises. Modelos mais avançados oferecem melhores análises mas são mais lentos.</p>
        <div class="model-selector">
          <div class="model-option ${currentModel === 'claude-haiku-4-5' ? 'selected' : ''}" onclick="selectModel('claude-haiku-4-5')">
            <div class="model-name">Claude Haiku</div>
            <div class="model-desc">Rápido e eficiente</div>
            <div class="model-speed speed-fast">⚡ Rápido</div>
          </div>
          <div class="model-option ${currentModel === 'claude-sonnet-4-5' ? 'selected' : ''}" onclick="selectModel('claude-sonnet-4-5')">
            <div class="model-name">Claude Sonnet</div>
            <div class="model-desc">Equilíbrio ideal</div>
            <div class="model-speed speed-medium">⚖️ Equilibrado</div>
          </div>
          <div class="model-option ${currentModel === 'claude-opus-4-5' ? 'selected' : ''}" onclick="selectModel('claude-opus-4-5')">
            <div class="model-name">Claude Opus</div>
            <div class="model-desc">Máxima capacidade</div>
            <div class="model-speed speed-slow">🧠 Avançado</div>
          </div>
        </div>
        <p style="font-size:12px;color:var(--text-muted);margin-top:12px;">
          <i class="fas fa-check-circle" style="color:var(--success);"></i>
          Modelo seleccionado: <strong>${currentModel}</strong>
        </p>
      </div>
    </div>

    <!-- DADOS -->
    <div class="config-card">
      <div class="config-card-header"><i class="fas fa-database"></i> Dados e Armazenamento</div>
      <div class="config-card-body">
        <p style="font-size:14px;color:var(--text-muted);margin-bottom:16px;">
          Todos os relatórios são guardados na base de dados da aplicação (Genspark Table API).
          A chave API fica guardada apenas no localStorage do seu browser.
        </p>
        <div id="storageStats">
          <div style="font-size:13px;color:var(--text-muted);"><i class="fas fa-spinner fa-spin"></i> A calcular…</div>
        </div>
      </div>
    </div>
  `;

  loadStorageStats();
}

async function loadStorageStats() {
  const tables = [
    { key: 'relatorios_pauta', label: 'Relatórios de Pauta' },
    { key: 'relatorios_programas_diarios', label: 'Programas Diários' },
    { key: 'relatorios_programas_gravados', label: 'Programas Gravados' },
    { key: 'relatorios_semanais', label: 'Relatórios Semanais' },
  ];
  let html = '<div style="display:flex;flex-direction:column;gap:8px;">';
  let total = 0;
  for (const t of tables) {
    try {
      const res = await fetch(`tables/${t.key}?limit=1`);
      const json = await res.json();
      const count = json.total || 0;
      total += count;
      html += `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:var(--bg);border-radius:8px;">
          <span style="font-size:14px;">${t.label}</span>
          <span style="font-weight:700;color:var(--secondary);">${count} registos</span>
        </div>`;
    } catch {
      html += `<div style="padding:8px 12px;font-size:14px;color:var(--text-muted);">${t.label}: erro ao carregar</div>`;
    }
  }
  html += `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:var(--primary-light);border-radius:8px;border:1px solid var(--primary);margin-top:4px;">
      <span style="font-size:14px;font-weight:700;">Total</span>
      <span style="font-weight:800;color:var(--primary-dark);font-size:16px;">${total} relatórios</span>
    </div>`;
  html += '</div>';
  const el = document.getElementById('storageStats');
  if (el) el.innerHTML = html;
}

// ── HELPERS DE CONFIGURAÇÕES ──────────────────────────────────
function toggleKeyVisibility() {
  const input = document.getElementById('cfgApiKey');
  const icon  = document.getElementById('keyToggleIcon');
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    icon.className = 'fas fa-eye-slash';
  } else {
    input.type = 'password';
    icon.className = 'fas fa-eye';
  }
}

function saveApiKeyFromForm() {
  const val = document.getElementById('cfgApiKey')?.value?.trim();
  if (!val) return showToast('Insira uma chave API válida.', 'error');
  if (!val.startsWith('sk-ant-')) return showToast('A chave deve começar com "sk-ant-".', 'error');
  saveApiKey(val);
  showToast('Chave API guardada com sucesso!', 'success');
  // Actualizar página
  navigate('configuracoes');
}

function clearApiKey() {
  if (!confirm('Tem a certeza que deseja remover a chave API?')) return;
  localStorage.removeItem('girassol_claude_key');
  showToast('Chave removida.', 'info');
  navigate('configuracoes');
}

function selectModel(model) {
  saveModel(model);
  // Actualizar visual
  document.querySelectorAll('.model-option').forEach(el => el.classList.remove('selected'));
  event?.currentTarget?.classList.add('selected');
  showToast(`Modelo ${model} seleccionado.`, 'success');
  // Actualizar label na página IA se aberta
  const lbl = document.getElementById('iaModelLabel');
  if (lbl) lbl.textContent = model;
}
