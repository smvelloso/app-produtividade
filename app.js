/* ============================================================
   REDE GIRASSOL — app.js — Lógica principal
   ============================================================ */

// ── STATE ─────────────────────────────────────────────────────
const App = {
  currentPage: 'dashboard',
  pendingSubmit: null,
  pendingPdf: null,
};

// ── INIT ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setCurrentDate();
  bindNav();
  bindSidebar();
  bindModal();
  navigate('dashboard');
});

function setCurrentDate() {
  const d = new Date();
  const opts = { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' };
  document.getElementById('currentDate').textContent =
    d.toLocaleDateString('pt-AO', opts);
}

// ── NAVIGATION ────────────────────────────────────────────────
function bindNav() {
  document.querySelectorAll('.nav-item[data-page]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      navigate(el.dataset.page);
      closeSidebar();
    });
  });
}

function navigate(page) {
  App.currentPage = page;
  // active link
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
  // title
  const titles = {
    dashboard:           'Dashboard',
    pauta:               'Relatório de Pauta',
    'programas-diarios': 'Relatório de Programas Diários',
    'programas-gravados':'Relatório de Programas Gravados',
    semanal:             'Relatório Semanal de Produção',
    historico:           'Histórico de Envios',
    ia:                  'Análise com IA — Claude',
    configuracoes:       'Configurações',
  };
  document.getElementById('topbarTitle').textContent = titles[page] || page;

  const main = document.getElementById('mainContent');
  main.innerHTML = '';

  switch (page) {
    case 'dashboard':           renderDashboard(main);        break;
    case 'pauta':               renderPauta(main);            break;
    case 'programas-diarios':   renderProgramasDiarios(main); break;
    case 'programas-gravados':  renderProgramasGravados(main);break;
    case 'semanal':             renderSemanal(main);          break;
    case 'historico':           renderHistorico(main);        break;
    case 'ia':                  renderIA(main);               break;
    case 'configuracoes':       renderConfiguracoes(main);    break;
  }
}

// ── SIDEBAR ───────────────────────────────────────────────────
function bindSidebar() {
  document.getElementById('menuToggle').addEventListener('click', openSidebar);
  document.getElementById('sidebarClose').addEventListener('click', closeSidebar);
  document.getElementById('overlay').addEventListener('click', closeSidebar);
}
function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('overlay').classList.add('show');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('show');
}

// ── MODAL ─────────────────────────────────────────────────────
function bindModal() {
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalCancelBtn').addEventListener('click', closeModal);
  document.getElementById('modalConfirmBtn').addEventListener('click', confirmSubmit);
  document.getElementById('modalPdfBtn').addEventListener('click', () => {
    if (App.pendingPdf) App.pendingPdf();
  });
}
function openModal(title, bodyHTML, onConfirm, onPdf) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHTML;
  App.pendingSubmit = onConfirm;
  App.pendingPdf = onPdf || null;
  const pdfBtn = document.getElementById('modalPdfBtn');
  pdfBtn.style.display = onPdf ? '' : 'none';
  document.getElementById('modalConfirmBtn').style.display = '';
  document.getElementById('modalBackdrop').classList.add('show');
}
function closeModal() {
  document.getElementById('modalBackdrop').classList.remove('show');
  App.pendingSubmit = null;
  App.pendingPdf = null;
  document.getElementById('modalPdfBtn').style.display = 'none';
  document.getElementById('modalConfirmBtn').style.display = '';
}
async function confirmSubmit() {
  if (App.pendingSubmit) await App.pendingSubmit();
  closeModal();
}

// ── TOAST ─────────────────────────────────────────────────────
function showToast(msg, type = 'success', duration = 3500) {
  const icons = { success: 'fa-check-circle', error: 'fa-times-circle', info: 'fa-info-circle' };
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<i class="fas ${icons[type]}"></i> ${msg}`;
  document.getElementById('toastContainer').appendChild(t);
  setTimeout(() => t.remove(), duration);
}

// ── API HELPERS ───────────────────────────────────────────────
async function apiGet(table, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const r = await fetch(`tables/${table}?${qs}`);
  return r.json();
}
async function apiPost(table, data) {
  const r = await fetch(`tables/${table}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return r.json();
}
async function apiDelete(table, id) {
  await fetch(`tables/${table}/${id}`, { method: 'DELETE' });
}

// ── UTILS ─────────────────────────────────────────────────────
function today() {
  return new Date().toISOString().slice(0, 10);
}
function nowTime() {
  return new Date().toTimeString().slice(0, 5);
}
function formatDate(str) {
  if (!str) return '—';
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
}
function formatDateTime(ts) {
  if (!ts) return '—';
  const d = new Date(Number(ts));
  return d.toLocaleString('pt-AO');
}
function safe(v) { return v || '—'; }

// ── TABLE ROW HELPERS ─────────────────────────────────────────
function addRowToTable(tbodyId, rowHTML) {
  document.getElementById(tbodyId).insertAdjacentHTML('beforeend', rowHTML);
  bindRemoveRowBtns(tbodyId);
}
function bindRemoveRowBtns(tbodyId) {
  document.querySelectorAll(`#${tbodyId} .btn-remove-row`).forEach(btn => {
    btn.onclick = () => {
      const rows = document.querySelectorAll(`#${tbodyId} tr`);
      if (rows.length > 1) btn.closest('tr').remove();
      else showToast('Deve existir pelo menos uma linha.', 'info');
    };
  });
}
function getTableRows(tbodyId, fields) {
  return Array.from(document.querySelectorAll(`#${tbodyId} tr`)).map(tr => {
    const obj = {};
    fields.forEach(f => {
      const el = tr.querySelector(`[data-field="${f}"]`);
      obj[f] = el ? el.value.trim() : '';
    });
    return obj;
  }).filter(r => Object.values(r).some(v => v !== ''));
}

// ────────────────────────────────────────────────────────────────
//  PÁGINA: DASHBOARD
// ────────────────────────────────────────────────────────────────
async function renderDashboard(el) {
  el.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">Bem-vindo à <span>Rede Girassol</span></div>
        <p style="color:var(--text-muted);font-size:14px;margin-top:4px;">Gestão centralizada de relatórios — Direcção de Produção</p>
      </div>
    </div>

    <div class="stats-grid" id="statsGrid">
      <div class="stat-card orange"><div class="stat-icon"><i class="fas fa-calendar-alt"></i></div>
        <div><div class="stat-value" id="statPauta">…</div><div class="stat-label">Relatórios de Pauta</div></div></div>
      <div class="stat-card blue"><div class="stat-icon"><i class="fas fa-tv"></i></div>
        <div><div class="stat-value" id="statDiarios">…</div><div class="stat-label">Programas Diários</div></div></div>
      <div class="stat-card red"><div class="stat-icon"><i class="fas fa-video"></i></div>
        <div><div class="stat-value" id="statGravados">…</div><div class="stat-label">Programas Gravados</div></div></div>
      <div class="stat-card green"><div class="stat-icon"><i class="fas fa-chart-bar"></i></div>
        <div><div class="stat-value" id="statSemanal">…</div><div class="stat-label">Relatórios Semanais</div></div></div>
    </div>

    <div class="page-title" style="margin-bottom:16px;">Novo Relatório</div>
    <div class="quick-cards">
      <div class="quick-card qc-orange" onclick="navigate('pauta')">
        <div class="quick-card-icon"><i class="fas fa-calendar-alt"></i></div>
        <h4>Relatório de Pauta</h4>
        <p>Planeamento do dia seguinte e pautas confirmadas</p>
      </div>
      <div class="quick-card qc-blue" onclick="navigate('programas-diarios')">
        <div class="quick-card-icon"><i class="fas fa-tv"></i></div>
        <h4>Programas Diários</h4>
        <p>Confirmação de emissão e ocorrências do dia</p>
      </div>
      <div class="quick-card qc-purple" onclick="navigate('programas-gravados')">
        <div class="quick-card-icon"><i class="fas fa-video"></i></div>
        <h4>Programas Gravados</h4>
        <p>Registo de sessões de gravação em estúdio ou exteriores</p>
      </div>
      <div class="quick-card qc-green" onclick="navigate('semanal')">
        <div class="quick-card-icon"><i class="fas fa-chart-bar"></i></div>
        <h4>Relatório Semanal</h4>
        <p>Resumo semanal de produção e indicadores</p>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><h3><i class="fas fa-history"></i> Últimos Envios</h3>
        <button class="btn btn-sm btn-secondary" onclick="navigate('historico')"><i class="fas fa-eye"></i> Ver Todos</button>
      </div>
      <div class="card-body" id="dashRecentList"><div class="empty-state"><i class="fas fa-inbox"></i><h4>Nenhum envio ainda</h4><p>Crie e envie um relatório para vê-lo aqui.</p></div></div>
    </div>
  `;

  // load counts
  const tables = [
    { key: 'pauta', el: 'statPauta' },
    { key: 'programas_diarios', el: 'statDiarios' },
    { key: 'programas_gravados', el: 'statGravados' },
    { key: 'semanais', el: 'statSemanal' },
  ];
  for (const t of tables) {
    try {
      const res = await apiGet(`relatorios_${t.key}`, { limit: 1 });
      document.getElementById(t.el).textContent = res.total || 0;
    } catch { document.getElementById(t.el).textContent = 0; }
  }

  // recent
  await renderRecentList('dashRecentList');
}

async function renderRecentList(containerId) {
  const types = [
    { table: 'relatorios_pauta', label: 'Pauta', cls: 'type-pauta', icon: 'fa-calendar-alt' },
    { table: 'relatorios_programas_diarios', label: 'Prog. Diários', cls: 'type-diarios', icon: 'fa-tv' },
    { table: 'relatorios_programas_gravados', label: 'Prog. Gravados', cls: 'type-gravados', icon: 'fa-video' },
    { table: 'relatorios_semanais', label: 'Semanal', cls: 'type-semanal', icon: 'fa-chart-bar' },
  ];
  let all = [];
  for (const t of types) {
    try {
      const res = await apiGet(t.table, { limit: 100 });
      (res.data || []).forEach(r => all.push({ ...r, _type: t }));
    } catch {}
  }
  all.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
  const recent = all.slice(0, 8);

  const el = document.getElementById(containerId);
  if (!recent.length) return;
  el.innerHTML = `
    <table class="hist-table">
      <thead><tr>
        <th>Tipo</th><th>Referência</th><th>Elaborado por</th><th>Estado</th><th>Data</th>
      </tr></thead>
      <tbody>
        ${recent.map(r => `
          <tr>
            <td><span class="type-badge ${r._type.cls}"><i class="fas ${r._type.icon}"></i> ${r._type.label}</span></td>
            <td>${safe(r.data_referencia || r.data_emissao || r.data_gravacao || r.semana_referencia)}</td>
            <td>${safe(r.elaborado_por)}</td>
            <td><span class="badge ${r.status === 'enviado' ? 'badge-sent' : 'badge-draft'}">${r.status === 'enviado' ? 'Enviado' : 'Rascunho'}</span></td>
            <td>${formatDateTime(r.created_at)}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

// ────────────────────────────────────────────────────────────────
//  PÁGINA: RELATÓRIO DE PAUTA
// ────────────────────────────────────────────────────────────────
function renderPauta(el) {
  el.innerHTML = `
    <div class="page-header">
      <div class="page-title"><i class="fas fa-calendar-alt" style="color:var(--primary);margin-right:8px;"></i>Relatório de <span>Pauta</span></div>
    </div>

    <!-- Identificação -->
    <div class="form-section">
      <div class="form-section-header"><i class="fas fa-id-card"></i> 1. Identificação</div>
      <div class="form-section-body">
        <div class="form-grid">
          <div class="form-group">
            <label>Data de Referência <span class="required">*</span></label>
            <input type="date" id="p_dataRef" class="form-control" value="${today()}">
          </div>
          <div class="form-group">
            <label>Data de Envio <span class="required">*</span></label>
            <input type="date" id="p_dataEnvio" class="form-control" value="${today()}">
          </div>
          <div class="form-group">
            <label>Elaborado por <span class="required">*</span></label>
            <input type="text" id="p_elaborado" class="form-control" placeholder="Nome completo">
          </div>
          <div class="form-group">
            <label>Cargo / Função</label>
            <input type="text" id="p_cargo" class="form-control" placeholder="Ex: Editor de Pauta">
          </div>
        </div>
      </div>
    </div>

    <!-- PARTE A: Planeamento -->
    <div class="form-section">
      <div class="form-section-header"><i class="fas fa-clipboard-list"></i> PARTE A — Planeamento do Dia Seguinte</div>
      <div class="form-section-body">
        <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px;">Preencher com o plano previsto para o dia seguinte.</p>

        <div class="section-divider">A1 — Pautas Confirmadas</div>
        <div class="dynamic-table-wrapper">
          <table class="dynamic-table">
            <thead><tr>
              <th>Programa</th><th>Pauta / Tema</th><th>Repórter / Produtor</th>
              <th>Local</th><th>Saída</th><th>Regresso</th><th style="width:40px"></th>
            </tr></thead>
            <tbody id="tb_pautas_conf">
              ${pautaRow()}
            </tbody>
          </table>
        </div>
        <button class="btn-add-row" onclick="addRowToTable('tb_pautas_conf', pautaRow())">
          <i class="fas fa-plus"></i> Adicionar linha
        </button>

        <div class="section-divider" style="margin-top:28px;">A2 — Pautas Pendentes de Confirmação</div>
        <div class="dynamic-table-wrapper">
          <table class="dynamic-table">
            <thead><tr>
              <th>Programa</th><th>Pauta / Tema</th><th>Responsável</th>
              <th>Motivo Pendência</th><th>Prazo Confirmação</th><th style="width:40px"></th>
            </tr></thead>
            <tbody id="tb_pautas_pend">
              ${pautaPendRow()}
            </tbody>
          </table>
        </div>
        <button class="btn-add-row" onclick="addRowToTable('tb_pautas_pend', pautaPendRow())">
          <i class="fas fa-plus"></i> Adicionar linha
        </button>

        <div class="section-divider" style="margin-top:28px;">A3 — Pautas Canceladas / Adiadas</div>
        <div class="dynamic-table-wrapper">
          <table class="dynamic-table">
            <thead><tr>
              <th>Programa</th><th>Pauta / Tema</th><th>Motivo</th>
              <th>Nova Data (se aplicável)</th><th style="width:40px"></th>
            </tr></thead>
            <tbody id="tb_pautas_canc">
              ${pautaCancRow()}
            </tbody>
          </table>
        </div>
        <button class="btn-add-row" onclick="addRowToTable('tb_pautas_canc', pautaCancRow())">
          <i class="fas fa-plus"></i> Adicionar linha
        </button>
      </div>
    </div>

    <!-- PARTE B: Equipas -->
    <div class="form-section">
      <div class="form-section-header"><i class="fas fa-users"></i> PARTE B — Equipas Técnicas Destacadas</div>
      <div class="form-section-body">
        <div class="dynamic-table-wrapper">
          <table class="dynamic-table">
            <thead><tr>
              <th>Programa / Pauta</th><th>Repórter</th><th>Cameraman</th>
              <th>Sonoplasta</th><th>Motorista</th><th>Observações</th><th style="width:40px"></th>
            </tr></thead>
            <tbody id="tb_equipas">
              ${equipa6Row()}
            </tbody>
          </table>
        </div>
        <button class="btn-add-row" onclick="addRowToTable('tb_equipas', equipa6Row())">
          <i class="fas fa-plus"></i> Adicionar linha
        </button>
      </div>
    </div>

    <!-- Notas Gerais -->
    <div class="form-section">
      <div class="form-section-header"><i class="fas fa-sticky-note"></i> Notas Gerais / Observações</div>
      <div class="form-section-body">
        <div class="form-group">
          <textarea id="p_notas" class="form-control" rows="4" placeholder="Observações, notas adicionais, informações importantes para o dia…"></textarea>
        </div>
      </div>
    </div>

    <div class="form-actions">
      <button class="btn btn-secondary" onclick="clearForm_pauta()"><i class="fas fa-eraser"></i> Limpar</button>
      <button class="btn btn-outline" onclick="saveDraft('pauta')"><i class="fas fa-save"></i> Guardar Rascunho</button>
      <button class="btn btn-success" onclick="exportCurrentFormToPdf('pauta')"><i class="fas fa-file-pdf"></i> Exportar PDF</button>
      <button class="btn btn-primary" onclick="previewPauta()"><i class="fas fa-paper-plane"></i> Rever e Enviar</button>
    </div>
  `;

  // bind remove buttons
  ['tb_pautas_conf','tb_pautas_pend','tb_pautas_canc','tb_equipas'].forEach(bindRemoveRowBtns);
}

function pautaRow() {
  return `<tr>
    <td><input data-field="programa" placeholder="Nome do programa"></td>
    <td><input data-field="pauta" placeholder="Tema / assunto"></td>
    <td><input data-field="reporter" placeholder="Nome"></td>
    <td><input data-field="local" placeholder="Local"></td>
    <td><input data-field="saida" type="time"></td>
    <td><input data-field="regresso" type="time"></td>
    <td><button class="btn-remove-row"><i class="fas fa-trash"></i></button></td>
  </tr>`;
}
function pautaPendRow() {
  return `<tr>
    <td><input data-field="programa" placeholder="Programa"></td>
    <td><input data-field="pauta" placeholder="Tema"></td>
    <td><input data-field="responsavel" placeholder="Responsável"></td>
    <td><input data-field="motivo" placeholder="Motivo"></td>
    <td><input data-field="prazo" type="date"></td>
    <td><button class="btn-remove-row"><i class="fas fa-trash"></i></button></td>
  </tr>`;
}
function pautaCancRow() {
  return `<tr>
    <td><input data-field="programa" placeholder="Programa"></td>
    <td><input data-field="pauta" placeholder="Tema"></td>
    <td><input data-field="motivo" placeholder="Motivo"></td>
    <td><input data-field="nova_data" type="date"></td>
    <td><button class="btn-remove-row"><i class="fas fa-trash"></i></button></td>
  </tr>`;
}
function equipa6Row() {
  return `<tr>
    <td><input data-field="programa" placeholder="Programa/Pauta"></td>
    <td><input data-field="reporter" placeholder="Nome"></td>
    <td><input data-field="cameraman" placeholder="Nome"></td>
    <td><input data-field="sonoplasta" placeholder="Nome"></td>
    <td><input data-field="motorista" placeholder="Nome"></td>
    <td><input data-field="obs" placeholder="Observações"></td>
    <td><button class="btn-remove-row"><i class="fas fa-trash"></i></button></td>
  </tr>`;
}

function clearForm_pauta() {
  ['p_dataRef','p_dataEnvio','p_elaborado','p_cargo','p_notas'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = id.includes('data') ? today() : '';
  });
  ['tb_pautas_conf','tb_pautas_pend','tb_pautas_canc','tb_equipas'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = id === 'tb_pautas_conf' ? pautaRow() :
                            id === 'tb_pautas_pend' ? pautaPendRow() :
                            id === 'tb_pautas_canc' ? pautaCancRow() : equipa6Row();
    if (el) bindRemoveRowBtns(id);
  });
}

function collectPauta() {
  return {
    data_referencia: document.getElementById('p_dataRef').value,
    data_envio:      document.getElementById('p_dataEnvio').value,
    elaborado_por:   document.getElementById('p_elaborado').value.trim(),
    cargo_funcao:    document.getElementById('p_cargo').value.trim(),
    pautas_confirmadas: JSON.stringify(getTableRows('tb_pautas_conf', ['programa','pauta','reporter','local','saida','regresso'])),
    pautas_pendentes:   JSON.stringify(getTableRows('tb_pautas_pend', ['programa','pauta','responsavel','motivo','prazo'])),
    pautas_canceladas:  JSON.stringify(getTableRows('tb_pautas_canc', ['programa','pauta','motivo','nova_data'])),
    equipas_tecnicas:   JSON.stringify(getTableRows('tb_equipas', ['programa','reporter','cameraman','sonoplasta','motorista','obs'])),
    notas_gerais:       document.getElementById('p_notas').value.trim(),
  };
}

function previewPauta() {
  const d = collectPauta();
  if (!d.data_referencia || !d.elaborado_por) {
    return showToast('Preencha os campos obrigatórios (Data de referência e Elaborado por).', 'error');
  }
  const conf  = JSON.parse(d.pautas_confirmadas  || '[]');
  const pend  = JSON.parse(d.pautas_pendentes    || '[]');
  const canc  = JSON.parse(d.pautas_canceladas   || '[]');
  const equip = JSON.parse(d.equipas_tecnicas    || '[]');

  const html = `
    <div class="preview-block">
      <h4>Identificação</h4>
      <div class="preview-grid">
        <div class="preview-field"><label>Data de Referência</label><p>${formatDate(d.data_referencia)}</p></div>
        <div class="preview-field"><label>Data de Envio</label><p>${formatDate(d.data_envio)}</p></div>
        <div class="preview-field"><label>Elaborado por</label><p>${safe(d.elaborado_por)}</p></div>
        <div class="preview-field"><label>Cargo / Função</label><p>${safe(d.cargo_funcao)}</p></div>
      </div>
    </div>
    ${conf.length ? `<div class="preview-block"><h4>A1 — Pautas Confirmadas (${conf.length})</h4>
      <table class="preview-table"><thead><tr><th>Programa</th><th>Pauta/Tema</th><th>Repórter</th><th>Local</th><th>Saída</th><th>Regresso</th></tr></thead>
      <tbody>${conf.map(r=>`<tr><td>${safe(r.programa)}</td><td>${safe(r.pauta)}</td><td>${safe(r.reporter)}</td><td>${safe(r.local)}</td><td>${safe(r.saida)}</td><td>${safe(r.regresso)}</td></tr>`).join('')}</tbody></table></div>` : ''}
    ${pend.length ? `<div class="preview-block"><h4>A2 — Pautas Pendentes (${pend.length})</h4>
      <table class="preview-table"><thead><tr><th>Programa</th><th>Pauta</th><th>Responsável</th><th>Motivo</th><th>Prazo</th></tr></thead>
      <tbody>${pend.map(r=>`<tr><td>${safe(r.programa)}</td><td>${safe(r.pauta)}</td><td>${safe(r.responsavel)}</td><td>${safe(r.motivo)}</td><td>${formatDate(r.prazo)}</td></tr>`).join('')}</tbody></table></div>` : ''}
    ${canc.length ? `<div class="preview-block"><h4>A3 — Pautas Canceladas (${canc.length})</h4>
      <table class="preview-table"><thead><tr><th>Programa</th><th>Pauta</th><th>Motivo</th><th>Nova Data</th></tr></thead>
      <tbody>${canc.map(r=>`<tr><td>${safe(r.programa)}</td><td>${safe(r.pauta)}</td><td>${safe(r.motivo)}</td><td>${formatDate(r.nova_data)}</td></tr>`).join('')}</tbody></table></div>` : ''}
    ${equip.length ? `<div class="preview-block"><h4>Equipas Técnicas (${equip.length})</h4>
      <table class="preview-table"><thead><tr><th>Programa</th><th>Repórter</th><th>Cameraman</th><th>Sonoplasta</th><th>Motorista</th></tr></thead>
      <tbody>${equip.map(r=>`<tr><td>${safe(r.programa)}</td><td>${safe(r.reporter)}</td><td>${safe(r.cameraman)}</td><td>${safe(r.sonoplasta)}</td><td>${safe(r.motorista)}</td></tr>`).join('')}</tbody></table></div>` : ''}
    ${d.notas_gerais ? `<div class="preview-block"><h4>Notas Gerais</h4><p style="font-size:14px;">${d.notas_gerais}</p></div>` : ''}
  `;
  openModal('Pré-visualização — Relatório de Pauta', html, () => submitPauta(d), () => exportToPdf('pauta', d));
}

async function submitPauta(d) {
  try {
    await apiPost('relatorios_pauta', { ...d, status: 'enviado' });
    showToast('Relatório de Pauta enviado com sucesso!', 'success');
    clearForm_pauta();
  } catch { showToast('Erro ao enviar. Tente novamente.', 'error'); }
}

async function saveDraft(type) {
  try {
    let d;
    if (type === 'pauta') d = collectPauta();
    else if (type === 'diarios') d = collectDiarios();
    else if (type === 'gravados') d = collectGravados();
    else if (type === 'semanal') d = collectSemanal();
    const tableMap = {
      pauta: 'relatorios_pauta',
      diarios: 'relatorios_programas_diarios',
      gravados: 'relatorios_programas_gravados',
      semanal: 'relatorios_semanais',
    };
    await apiPost(tableMap[type], { ...d, status: 'rascunho' });
    showToast('Rascunho guardado!', 'info');
  } catch { showToast('Erro ao guardar rascunho.', 'error'); }
}

// ────────────────────────────────────────────────────────────────
//  PÁGINA: PROGRAMAS DIÁRIOS
// ────────────────────────────────────────────────────────────────
function renderProgramasDiarios(el) {
  el.innerHTML = `
    <div class="page-header">
      <div class="page-title"><i class="fas fa-tv" style="color:var(--info);margin-right:8px;"></i>Relatório de <span>Programas Diários</span></div>
    </div>

    <div class="form-section">
      <div class="form-section-header"><i class="fas fa-id-card"></i> 1. Identificação</div>
      <div class="form-section-body">
        <div class="form-grid">
          <div class="form-group">
            <label>Data de Emissão <span class="required">*</span></label>
            <input type="date" id="pd_dataEmissao" class="form-control" value="${today()}">
          </div>
          <div class="form-group">
            <label>Data de Envio <span class="required">*</span></label>
            <input type="date" id="pd_dataEnvio" class="form-control" value="${today()}">
          </div>
          <div class="form-group">
            <label>Elaborado por <span class="required">*</span></label>
            <input type="text" id="pd_elaborado" class="form-control" placeholder="Nome completo">
          </div>
          <div class="form-group">
            <label>Cargo / Função</label>
            <input type="text" id="pd_cargo" class="form-control" placeholder="Ex: Produtor Executivo">
          </div>
        </div>
      </div>
    </div>

    <div class="form-section">
      <div class="form-section-header"><i class="fas fa-list-check"></i> 2. Programas do Dia — Confirmação de Emissão</div>
      <div class="form-section-body">
        <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px;">Preencha uma linha por programa emitido.</p>
        <div class="dynamic-table-wrapper">
          <table class="dynamic-table">
            <thead><tr>
              <th>Nome do Programa</th><th>Hor. Previsto</th><th>Hor. Real Início</th>
              <th>Dur. Prevista</th><th>Dur. Real</th>
              <th>Confirmação</th><th>Formato</th><th>Responsável</th><th style="width:40px"></th>
            </tr></thead>
            <tbody id="tb_prog_dia">
              ${progDiaRow()}
            </tbody>
          </table>
        </div>
        <button class="btn-add-row" onclick="addRowToTable('tb_prog_dia', progDiaRow())">
          <i class="fas fa-plus"></i> Adicionar programa
        </button>
      </div>
    </div>

    <div class="form-section">
      <div class="form-section-header"><i class="fas fa-exclamation-triangle"></i> 3. Falhas / Incidentes de Emissão</div>
      <div class="form-section-body">
        <div class="dynamic-table-wrapper">
          <table class="dynamic-table">
            <thead><tr>
              <th>Programa</th><th>Tipo de Falha</th><th>Horário</th>
              <th>Duração (min)</th><th>Causa</th><th>Medida Correctiva</th><th style="width:40px"></th>
            </tr></thead>
            <tbody id="tb_incidentes_dia">
              ${incidentesDiaRow()}
            </tbody>
          </table>
        </div>
        <button class="btn-add-row" onclick="addRowToTable('tb_incidentes_dia', incidentesDiaRow())">
          <i class="fas fa-plus"></i> Adicionar incidente
        </button>
      </div>
    </div>

    <div class="form-section">
      <div class="form-section-header"><i class="fas fa-sticky-note"></i> 4. Observações Gerais</div>
      <div class="form-section-body">
        <div class="form-group">
          <textarea id="pd_obs" class="form-control" rows="4" placeholder="Observações sobre a emissão do dia, notas adicionais…"></textarea>
        </div>
      </div>
    </div>

    <div class="form-actions">
      <button class="btn btn-secondary" onclick="navigate('programas-diarios')"><i class="fas fa-eraser"></i> Limpar</button>
      <button class="btn btn-outline" onclick="saveDraft('diarios')"><i class="fas fa-save"></i> Guardar Rascunho</button>
      <button class="btn btn-success" onclick="exportCurrentFormToPdf('diarios')"><i class="fas fa-file-pdf"></i> Exportar PDF</button>
      <button class="btn btn-primary" onclick="previewDiarios()"><i class="fas fa-paper-plane"></i> Rever e Enviar</button>
    </div>
  `;

  ['tb_prog_dia','tb_incidentes_dia'].forEach(bindRemoveRowBtns);
}

function progDiaRow() {
  return `<tr>
    <td><input data-field="nome" placeholder="Nome do programa"></td>
    <td><input data-field="hor_previsto" type="time"></td>
    <td><input data-field="hor_real" type="time"></td>
    <td><input data-field="dur_prevista" placeholder="Ex: 30min"></td>
    <td><input data-field="dur_real" placeholder="Ex: 28min"></td>
    <td><select data-field="confirmacao">
      <option value="">Seleccionar</option>
      <option value="Emitido conforme previsto">Emitido conforme</option>
      <option value="Emitido com atraso">Com atraso</option>
      <option value="Emitido com cortes">Com cortes</option>
      <option value="Não emitido">Não emitido</option>
    </select></td>
    <td><select data-field="formato">
      <option value="">Formato</option>
      <option value="Directo">Directo</option>
      <option value="Gravado">Gravado</option>
      <option value="Enlatado">Enlatado</option>
    </select></td>
    <td><input data-field="responsavel" placeholder="Nome"></td>
    <td><button class="btn-remove-row"><i class="fas fa-trash"></i></button></td>
  </tr>`;
}
function incidentesDiaRow() {
  return `<tr>
    <td><input data-field="programa" placeholder="Programa"></td>
    <td><select data-field="tipo">
      <option value="">Tipo</option>
      <option value="Falha técnica">Falha técnica</option>
      <option value="Falha de sinal">Falha de sinal</option>
      <option value="Atraso">Atraso</option>
      <option value="Cancelamento">Cancelamento</option>
      <option value="Outro">Outro</option>
    </select></td>
    <td><input data-field="horario" type="time"></td>
    <td><input data-field="duracao" placeholder="Min"></td>
    <td><input data-field="causa" placeholder="Descrição da causa"></td>
    <td><input data-field="medida" placeholder="Acção correctiva tomada"></td>
    <td><button class="btn-remove-row"><i class="fas fa-trash"></i></button></td>
  </tr>`;
}

function collectDiarios() {
  return {
    data_emissao:  document.getElementById('pd_dataEmissao').value,
    data_envio:    document.getElementById('pd_dataEnvio').value,
    elaborado_por: document.getElementById('pd_elaborado').value.trim(),
    cargo_funcao:  document.getElementById('pd_cargo').value.trim(),
    programas:     JSON.stringify(getTableRows('tb_prog_dia', ['nome','hor_previsto','hor_real','dur_prevista','dur_real','confirmacao','formato','responsavel'])),
    incidentes:    JSON.stringify(getTableRows('tb_incidentes_dia', ['programa','tipo','horario','duracao','causa','medida'])),
    observacoes_gerais: document.getElementById('pd_obs').value.trim(),
  };
}

function previewDiarios() {
  const d = collectDiarios();
  if (!d.data_emissao || !d.elaborado_por) {
    return showToast('Preencha os campos obrigatórios.', 'error');
  }
  const progs = JSON.parse(d.programas  || '[]');
  const incs  = JSON.parse(d.incidentes || '[]');
  const html = `
    <div class="preview-block">
      <h4>Identificação</h4>
      <div class="preview-grid">
        <div class="preview-field"><label>Data de Emissão</label><p>${formatDate(d.data_emissao)}</p></div>
        <div class="preview-field"><label>Data de Envio</label><p>${formatDate(d.data_envio)}</p></div>
        <div class="preview-field"><label>Elaborado por</label><p>${safe(d.elaborado_por)}</p></div>
        <div class="preview-field"><label>Cargo / Função</label><p>${safe(d.cargo_funcao)}</p></div>
      </div>
    </div>
    ${progs.length ? `<div class="preview-block"><h4>Programas Emitidos (${progs.length})</h4>
      <table class="preview-table"><thead><tr><th>Programa</th><th>Hor. Previsto</th><th>Hor. Real</th><th>Dur. Prevista</th><th>Dur. Real</th><th>Confirmação</th><th>Formato</th></tr></thead>
      <tbody>${progs.map(r=>`<tr><td>${safe(r.nome)}</td><td>${safe(r.hor_previsto)}</td><td>${safe(r.hor_real)}</td><td>${safe(r.dur_prevista)}</td><td>${safe(r.dur_real)}</td><td>${safe(r.confirmacao)}</td><td>${safe(r.formato)}</td></tr>`).join('')}</tbody></table></div>` : ''}
    ${incs.length ? `<div class="preview-block"><h4>Incidentes (${incs.length})</h4>
      <table class="preview-table"><thead><tr><th>Programa</th><th>Tipo</th><th>Horário</th><th>Causa</th><th>Medida</th></tr></thead>
      <tbody>${incs.map(r=>`<tr><td>${safe(r.programa)}</td><td>${safe(r.tipo)}</td><td>${safe(r.horario)}</td><td>${safe(r.causa)}</td><td>${safe(r.medida)}</td></tr>`).join('')}</tbody></table></div>` : ''}
    ${d.observacoes_gerais ? `<div class="preview-block"><h4>Observações</h4><p style="font-size:14px;">${d.observacoes_gerais}</p></div>` : ''}
  `;
  openModal('Pré-visualização — Relatório de Programas Diários', html, () => submitDiarios(d), () => exportToPdf('diarios', d));
}

async function submitDiarios(d) {
  try {
    await apiPost('relatorios_programas_diarios', { ...d, status: 'enviado' });
    showToast('Relatório de Programas Diários enviado!', 'success');
    navigate('programas-diarios');
  } catch { showToast('Erro ao enviar. Tente novamente.', 'error'); }
}

// ────────────────────────────────────────────────────────────────
//  PÁGINA: PROGRAMAS GRAVADOS
// ────────────────────────────────────────────────────────────────
function renderProgramasGravados(el) {
  el.innerHTML = `
    <div class="page-header">
      <div class="page-title"><i class="fas fa-video" style="color:#7D3C98;margin-right:8px;"></i>Relatório de <span>Programas Gravados</span></div>
    </div>

    <div class="form-section">
      <div class="form-section-header"><i class="fas fa-film"></i> 1. Identificação da Gravação</div>
      <div class="form-section-body">
        <div class="form-grid">
          <div class="form-group">
            <label>Nome do Programa <span class="required">*</span></label>
            <input type="text" id="pg_nomeProg" class="form-control" placeholder="Ex: Notícias da Tarde">
          </div>
          <div class="form-group">
            <label>Data da Gravação <span class="required">*</span></label>
            <input type="date" id="pg_dataGrav" class="form-control" value="${today()}">
          </div>
          <div class="form-group">
            <label>Local da Gravação</label>
            <input type="text" id="pg_local" class="form-control" placeholder="Ex: Estúdio A, Exterior — Luanda">
          </div>
          <div class="form-group">
            <label>Estúdio / Exteriores</label>
            <select id="pg_estudio" class="form-control">
              <option value="">Seleccionar</option>
              <option>Estúdio</option>
              <option>Exteriores</option>
              <option>Estúdio + Exteriores</option>
            </select>
          </div>
          <div class="form-group">
            <label>Horário Convocado</label>
            <input type="time" id="pg_horConv" class="form-control">
          </div>
          <div class="form-group">
            <label>Horário Real de Início</label>
            <input type="time" id="pg_horInicio" class="form-control">
          </div>
          <div class="form-group">
            <label>Horário de Encerramento</label>
            <input type="time" id="pg_horEnc" class="form-control">
          </div>
          <div class="form-group">
            <label>Duração Total</label>
            <input type="text" id="pg_durTotal" class="form-control" placeholder="Ex: 3h45min">
          </div>
          <div class="form-group full">
            <label>Elaborado por (Coordenadora de Produção) <span class="required">*</span></label>
            <input type="text" id="pg_elaborado" class="form-control" placeholder="Nome completo">
          </div>
        </div>
      </div>
    </div>

    <div class="form-section">
      <div class="form-section-header"><i class="fas fa-list-ol"></i> 2. Conteúdo Gravado</div>
      <div class="form-section-body">
        <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px;">Liste cada episódio ou segmento gravado nesta sessão.</p>
        <div class="dynamic-table-wrapper">
          <table class="dynamic-table">
            <thead><tr>
              <th>Ep. / Seg.</th><th>Título / Descrição</th><th>Duração Gravada</th>
              <th>Estado</th><th>Observações</th><th style="width:40px"></th>
            </tr></thead>
            <tbody id="tb_conteudo">
              ${conteudoRow()}
            </tbody>
          </table>
        </div>
        <button class="btn-add-row" onclick="addRowToTable('tb_conteudo', conteudoRow())">
          <i class="fas fa-plus"></i> Adicionar episódio/segmento
        </button>
      </div>
    </div>

    <div class="form-section">
      <div class="form-section-header"><i class="fas fa-users-cog"></i> 3. Equipa Técnica</div>
      <div class="form-section-body">
        <div class="dynamic-table-wrapper">
          <table class="dynamic-table">
            <thead><tr>
              <th>Nome</th><th>Função</th><th>Presente</th><th>Observações</th><th style="width:40px"></th>
            </tr></thead>
            <tbody id="tb_eq_tecnica">
              ${equipaTecnicaRow()}
            </tbody>
          </table>
        </div>
        <button class="btn-add-row" onclick="addRowToTable('tb_eq_tecnica', equipaTecnicaRow())">
          <i class="fas fa-plus"></i> Adicionar membro
        </button>
      </div>
    </div>

    <div class="form-section">
      <div class="form-section-header"><i class="fas fa-theater-masks"></i> 4. Equipa Artística / Elenco</div>
      <div class="form-section-body">
        <div class="dynamic-table-wrapper">
          <table class="dynamic-table">
            <thead><tr>
              <th>Nome</th><th>Papel / Função</th><th>Presente</th><th>Observações</th><th style="width:40px"></th>
            </tr></thead>
            <tbody id="tb_eq_artistica">
              ${equipaArtisticaRow()}
            </tbody>
          </table>
        </div>
        <button class="btn-add-row" onclick="addRowToTable('tb_eq_artistica', equipaArtisticaRow())">
          <i class="fas fa-plus"></i> Adicionar membro
        </button>
      </div>
    </div>

    <div class="form-section">
      <div class="form-section-header"><i class="fas fa-exclamation-circle"></i> 5. Incidentes / Ocorrências</div>
      <div class="form-section-body">
        <div class="dynamic-table-wrapper">
          <table class="dynamic-table">
            <thead><tr>
              <th>Tipo</th><th>Descrição</th><th>Horário</th><th>Impacto</th><th>Medida Tomada</th><th style="width:40px"></th>
            </tr></thead>
            <tbody id="tb_inc_grav">
              ${incidenteGravRow()}
            </tbody>
          </table>
        </div>
        <button class="btn-add-row" onclick="addRowToTable('tb_inc_grav', incidenteGravRow())">
          <i class="fas fa-plus"></i> Adicionar incidente
        </button>
      </div>
    </div>

    <div class="form-section">
      <div class="form-section-header"><i class="fas fa-boxes"></i> 6. Materiais / Equipamentos Utilizados</div>
      <div class="form-section-body">
        <div class="dynamic-table-wrapper">
          <table class="dynamic-table">
            <thead><tr>
              <th>Item</th><th>Quantidade</th><th>Estado</th><th>Observações</th><th style="width:40px"></th>
            </tr></thead>
            <tbody id="tb_materiais">
              ${materiaisRow()}
            </tbody>
          </table>
        </div>
        <button class="btn-add-row" onclick="addRowToTable('tb_materiais', materiaisRow())">
          <i class="fas fa-plus"></i> Adicionar item
        </button>
      </div>
    </div>

    <div class="form-section">
      <div class="form-section-header"><i class="fas fa-sticky-note"></i> 7. Observações Finais</div>
      <div class="form-section-body">
        <div class="form-group">
          <textarea id="pg_obs" class="form-control" rows="4" placeholder="Notas finais, recomendações, próximos passos…"></textarea>
        </div>
      </div>
    </div>

    <div class="form-actions">
      <button class="btn btn-secondary" onclick="navigate('programas-gravados')"><i class="fas fa-eraser"></i> Limpar</button>
      <button class="btn btn-outline" onclick="saveDraft('gravados')"><i class="fas fa-save"></i> Guardar Rascunho</button>
      <button class="btn btn-success" onclick="exportCurrentFormToPdf('gravados')"><i class="fas fa-file-pdf"></i> Exportar PDF</button>
      <button class="btn btn-primary" onclick="previewGravados()"><i class="fas fa-paper-plane"></i> Rever e Enviar</button>
    </div>
  `;

  ['tb_conteudo','tb_eq_tecnica','tb_eq_artistica','tb_inc_grav','tb_materiais'].forEach(bindRemoveRowBtns);
}

function conteudoRow() {
  return `<tr>
    <td><input data-field="ep" placeholder="Ep. 01 / Seg. A"></td>
    <td><input data-field="titulo" placeholder="Título ou descrição"></td>
    <td><input data-field="duracao" placeholder="Ex: 22min"></td>
    <td><select data-field="estado">
      <option value="">Estado</option>
      <option value="Aprovado">Aprovado</option>
      <option value="Para revisão">Para revisão</option>
      <option value="Incompleto">Incompleto</option>
      <option value="Descartado">Descartado</option>
    </select></td>
    <td><input data-field="obs" placeholder="Obs."></td>
    <td><button class="btn-remove-row"><i class="fas fa-trash"></i></button></td>
  </tr>`;
}
function equipaTecnicaRow() {
  return `<tr>
    <td><input data-field="nome" placeholder="Nome"></td>
    <td><select data-field="funcao">
      <option value="">Função</option>
      <option value="Realizador">Realizador</option>
      <option value="Cameraman">Cameraman</option>
      <option value="Sonoplasta">Sonoplasta</option>
      <option value="Iluminador">Iluminador</option>
      <option value="Editor">Editor</option>
      <option value="Produtor">Produtor</option>
      <option value="Outro">Outro</option>
    </select></td>
    <td><select data-field="presente">
      <option value="Sim">Sim</option>
      <option value="Não">Não</option>
      <option value="Parcial">Parcial</option>
    </select></td>
    <td><input data-field="obs" placeholder="Obs."></td>
    <td><button class="btn-remove-row"><i class="fas fa-trash"></i></button></td>
  </tr>`;
}
function equipaArtisticaRow() {
  return `<tr>
    <td><input data-field="nome" placeholder="Nome"></td>
    <td><input data-field="papel" placeholder="Papel / personagem / função"></td>
    <td><select data-field="presente">
      <option value="Sim">Sim</option>
      <option value="Não">Não</option>
      <option value="Parcial">Parcial</option>
    </select></td>
    <td><input data-field="obs" placeholder="Obs."></td>
    <td><button class="btn-remove-row"><i class="fas fa-trash"></i></button></td>
  </tr>`;
}
function incidenteGravRow() {
  return `<tr>
    <td><select data-field="tipo">
      <option value="">Tipo</option>
      <option value="Falha técnica">Falha técnica</option>
      <option value="Atraso de elenco">Atraso de elenco</option>
      <option value="Problema de cenário">Problema de cenário</option>
      <option value="Problema de áudio">Problema de áudio</option>
      <option value="Outro">Outro</option>
    </select></td>
    <td><input data-field="descricao" placeholder="Descrição"></td>
    <td><input data-field="horario" type="time"></td>
    <td><select data-field="impacto">
      <option value="">Impacto</option>
      <option value="Baixo">Baixo</option>
      <option value="Médio">Médio</option>
      <option value="Alto">Alto</option>
    </select></td>
    <td><input data-field="medida" placeholder="Medida tomada"></td>
    <td><button class="btn-remove-row"><i class="fas fa-trash"></i></button></td>
  </tr>`;
}
function materiaisRow() {
  return `<tr>
    <td><input data-field="item" placeholder="Ex: Câmara Sony FX6"></td>
    <td><input data-field="qtd" placeholder="1"></td>
    <td><select data-field="estado">
      <option value="Bom">Bom</option>
      <option value="Danificado">Danificado</option>
      <option value="Em manutenção">Em manutenção</option>
    </select></td>
    <td><input data-field="obs" placeholder="Obs."></td>
    <td><button class="btn-remove-row"><i class="fas fa-trash"></i></button></td>
  </tr>`;
}

function collectGravados() {
  return {
    nome_programa:       document.getElementById('pg_nomeProg').value.trim(),
    data_gravacao:       document.getElementById('pg_dataGrav').value,
    local_gravacao:      document.getElementById('pg_local').value.trim(),
    estudio_exteriores:  document.getElementById('pg_estudio').value,
    horario_convocado:   document.getElementById('pg_horConv').value,
    horario_real_inicio: document.getElementById('pg_horInicio').value,
    horario_encerramento:document.getElementById('pg_horEnc').value,
    duracao_total:       document.getElementById('pg_durTotal').value.trim(),
    elaborado_por:       document.getElementById('pg_elaborado').value.trim(),
    conteudo_gravado:    JSON.stringify(getTableRows('tb_conteudo', ['ep','titulo','duracao','estado','obs'])),
    equipa_tecnica:      JSON.stringify(getTableRows('tb_eq_tecnica', ['nome','funcao','presente','obs'])),
    equipa_artistica:    JSON.stringify(getTableRows('tb_eq_artistica', ['nome','papel','presente','obs'])),
    incidentes:          JSON.stringify(getTableRows('tb_inc_grav', ['tipo','descricao','horario','impacto','medida'])),
    materiais_utilizados:JSON.stringify(getTableRows('tb_materiais', ['item','qtd','estado','obs'])),
    observacoes:         document.getElementById('pg_obs').value.trim(),
  };
}

function previewGravados() {
  const d = collectGravados();
  if (!d.nome_programa || !d.elaborado_por) {
    return showToast('Preencha os campos obrigatórios.', 'error');
  }
  const cont = JSON.parse(d.conteudo_gravado || '[]');
  const etec = JSON.parse(d.equipa_tecnica   || '[]');
  const eart = JSON.parse(d.equipa_artistica || '[]');
  const incs = JSON.parse(d.incidentes       || '[]');
  const html = `
    <div class="preview-block">
      <h4>Identificação</h4>
      <div class="preview-grid">
        <div class="preview-field"><label>Nome do Programa</label><p>${safe(d.nome_programa)}</p></div>
        <div class="preview-field"><label>Data</label><p>${formatDate(d.data_gravacao)}</p></div>
        <div class="preview-field"><label>Local</label><p>${safe(d.local_gravacao)}</p></div>
        <div class="preview-field"><label>Estúdio / Ext.</label><p>${safe(d.estudio_exteriores)}</p></div>
        <div class="preview-field"><label>Horário Convocado</label><p>${safe(d.horario_convocado)}</p></div>
        <div class="preview-field"><label>Início Real</label><p>${safe(d.horario_real_inicio)}</p></div>
        <div class="preview-field"><label>Encerramento</label><p>${safe(d.horario_encerramento)}</p></div>
        <div class="preview-field"><label>Duração Total</label><p>${safe(d.duracao_total)}</p></div>
        <div class="preview-field"><label>Elaborado por</label><p>${safe(d.elaborado_por)}</p></div>
      </div>
    </div>
    ${cont.length ? `<div class="preview-block"><h4>Conteúdo Gravado (${cont.length})</h4>
      <table class="preview-table"><thead><tr><th>Ep./Seg.</th><th>Título</th><th>Duração</th><th>Estado</th></tr></thead>
      <tbody>${cont.map(r=>`<tr><td>${safe(r.ep)}</td><td>${safe(r.titulo)}</td><td>${safe(r.duracao)}</td><td>${safe(r.estado)}</td></tr>`).join('')}</tbody></table></div>` : ''}
    ${etec.length ? `<div class="preview-block"><h4>Equipa Técnica (${etec.length})</h4>
      <table class="preview-table"><thead><tr><th>Nome</th><th>Função</th><th>Presente</th></tr></thead>
      <tbody>${etec.map(r=>`<tr><td>${safe(r.nome)}</td><td>${safe(r.funcao)}</td><td>${safe(r.presente)}</td></tr>`).join('')}</tbody></table></div>` : ''}
    ${eart.length ? `<div class="preview-block"><h4>Equipa Artística (${eart.length})</h4>
      <table class="preview-table"><thead><tr><th>Nome</th><th>Papel</th><th>Presente</th></tr></thead>
      <tbody>${eart.map(r=>`<tr><td>${safe(r.nome)}</td><td>${safe(r.papel)}</td><td>${safe(r.presente)}</td></tr>`).join('')}</tbody></table></div>` : ''}
    ${incs.length ? `<div class="preview-block"><h4>Incidentes (${incs.length})</h4>
      <table class="preview-table"><thead><tr><th>Tipo</th><th>Descrição</th><th>Horário</th><th>Impacto</th></tr></thead>
      <tbody>${incs.map(r=>`<tr><td>${safe(r.tipo)}</td><td>${safe(r.descricao)}</td><td>${safe(r.horario)}</td><td>${safe(r.impacto)}</td></tr>`).join('')}</tbody></table></div>` : ''}
    ${d.observacoes ? `<div class="preview-block"><h4>Observações Finais</h4><p style="font-size:14px;">${d.observacoes}</p></div>` : ''}
  `;
  openModal('Pré-visualização — Relatório de Programas Gravados', html, () => submitGravados(d), () => exportToPdf('gravados', d));
}

async function submitGravados(d) {
  try {
    await apiPost('relatorios_programas_gravados', { ...d, status: 'enviado' });
    showToast('Relatório de Programas Gravados enviado!', 'success');
    navigate('programas-gravados');
  } catch { showToast('Erro ao enviar.', 'error'); }
}

// ────────────────────────────────────────────────────────────────
//  PÁGINA: RELATÓRIO SEMANAL
// ────────────────────────────────────────────────────────────────
function renderSemanal(el) {
  el.innerHTML = `
    <div class="page-header">
      <div class="page-title"><i class="fas fa-chart-bar" style="color:var(--success);margin-right:8px;"></i>Relatório <span>Semanal de Produção</span></div>
    </div>

    <div class="form-section">
      <div class="form-section-header"><i class="fas fa-id-card"></i> 1. Identificação</div>
      <div class="form-section-body">
        <div class="form-grid">
          <div class="form-group">
            <label>Semana de Referência (de / a) <span class="required">*</span></label>
            <input type="text" id="sw_semana" class="form-control" placeholder="Ex: 01/07/2025 a 05/07/2025">
          </div>
          <div class="form-group">
            <label>Nº da Semana</label>
            <input type="text" id="sw_numSemana" class="form-control" placeholder="Ex: 27">
          </div>
          <div class="form-group">
            <label>Data de Envio <span class="required">*</span></label>
            <input type="date" id="sw_dataEnvio" class="form-control" value="${today()}">
          </div>
          <div class="form-group">
            <label>Elaborado por <span class="required">*</span></label>
            <input type="text" id="sw_elaborado" class="form-control" placeholder="Nome completo">
          </div>
          <div class="form-group">
            <label>Cargo / Função</label>
            <input type="text" id="sw_cargo" class="form-control" placeholder="Cargo na produção">
          </div>
        </div>
      </div>
    </div>

    <div class="form-section">
      <div class="form-section-header"><i class="fas fa-video"></i> 2. Gravações Realizadas na Semana</div>
      <div class="form-section-body">
        <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px;">Liste todos os programas gravados no período, independentemente de terem sido concluídos ou interrompidos.</p>
        <div class="dynamic-table-wrapper">
          <table class="dynamic-table">
            <thead><tr>
              <th>Programa</th><th>Data</th><th>Duração Real</th>
              <th>Episódios / Segmentos</th><th>Observações</th><th style="width:40px"></th>
            </tr></thead>
            <tbody id="tb_gravacoes_sem">
              ${gravacoesSemRow()}
            </tbody>
          </table>
        </div>
        <button class="btn-add-row" onclick="addRowToTable('tb_gravacoes_sem', gravacoesSemRow())">
          <i class="fas fa-plus"></i> Adicionar gravação
        </button>
      </div>
    </div>

    <div class="form-section">
      <div class="form-section-header"><i class="fas fa-broadcast-tower"></i> 3. Programas Emitidos em Directo na Semana</div>
      <div class="form-section-body">
        <div class="dynamic-table-wrapper">
          <table class="dynamic-table">
            <thead><tr>
              <th>Programa</th><th>Dia / Data</th><th>Horário</th>
              <th>Duração</th><th>Confirmação</th><th>Observações</th><th style="width:40px"></th>
            </tr></thead>
            <tbody id="tb_emitidos_dir">
              ${emitidosDirRow()}
            </tbody>
          </table>
        </div>
        <button class="btn-add-row" onclick="addRowToTable('tb_emitidos_dir', emitidosDirRow())">
          <i class="fas fa-plus"></i> Adicionar programa
        </button>
      </div>
    </div>

    <div class="form-section">
      <div class="form-section-header"><i class="fas fa-clock"></i> 4. Pendências e Acompanhamentos</div>
      <div class="form-section-body">
        <div class="dynamic-table-wrapper">
          <table class="dynamic-table">
            <thead><tr>
              <th>Assunto / Programa</th><th>Responsável</th>
              <th>Prazo</th><th>Status</th><th>Observações</th><th style="width:40px"></th>
            </tr></thead>
            <tbody id="tb_pendencias">
              ${pendenciasRow()}
            </tbody>
          </table>
        </div>
        <button class="btn-add-row" onclick="addRowToTable('tb_pendencias', pendenciasRow())">
          <i class="fas fa-plus"></i> Adicionar pendência
        </button>
      </div>
    </div>

    <div class="form-section">
      <div class="form-section-header"><i class="fas fa-user-friends"></i> 5. Recursos Humanos</div>
      <div class="form-section-body">
        <div class="form-grid">
          <div class="form-group">
            <label>Total de colaboradores activos</label>
            <input type="number" id="sw_rhTotal" class="form-control" placeholder="0" min="0">
          </div>
          <div class="form-group">
            <label>Ausências / Faltas</label>
            <input type="number" id="sw_rhAusencias" class="form-control" placeholder="0" min="0">
          </div>
          <div class="form-group full">
            <label>Observações sobre RH</label>
            <textarea id="sw_rhObs" class="form-control" rows="3" placeholder="Contratações, saídas, necessidades, formações…"></textarea>
          </div>
        </div>
      </div>
    </div>

    <div class="form-section">
      <div class="form-section-header"><i class="fas fa-tools"></i> 6. Equipamentos e Infraestrutura</div>
      <div class="form-section-body">
        <div class="dynamic-table-wrapper">
          <table class="dynamic-table">
            <thead><tr>
              <th>Equipamento</th><th>Estado</th><th>Problema / Avaria</th>
              <th>Acção Necessária</th><th style="width:40px"></th>
            </tr></thead>
            <tbody id="tb_equip_sem">
              ${equipSemRow()}
            </tbody>
          </table>
        </div>
        <button class="btn-add-row" onclick="addRowToTable('tb_equip_sem', equipSemRow())">
          <i class="fas fa-plus"></i> Adicionar equipamento
        </button>
      </div>
    </div>

    <div class="form-section">
      <div class="form-section-header"><i class="fas fa-chart-pie"></i> 7. Indicadores da Semana</div>
      <div class="form-section-body">
        <div class="form-grid form-grid-3">
          <div class="form-group">
            <label>Total de gravações</label>
            <input type="number" id="sw_indGrav" class="form-control" placeholder="0" min="0">
          </div>
          <div class="form-group">
            <label>Horas de produção</label>
            <input type="text" id="sw_indHoras" class="form-control" placeholder="Ex: 24h30min">
          </div>
          <div class="form-group">
            <label>Programas em emissão directa</label>
            <input type="number" id="sw_indDirecto" class="form-control" placeholder="0" min="0">
          </div>
          <div class="form-group">
            <label>Pautas cobertas</label>
            <input type="number" id="sw_indPautas" class="form-control" placeholder="0" min="0">
          </div>
          <div class="form-group">
            <label>Pautas canceladas</label>
            <input type="number" id="sw_indCanc" class="form-control" placeholder="0" min="0">
          </div>
          <div class="form-group">
            <label>Incidentes registados</label>
            <input type="number" id="sw_indInc" class="form-control" placeholder="0" min="0">
          </div>
        </div>
      </div>
    </div>

    <div class="form-section">
      <div class="form-section-header"><i class="fas fa-sticky-note"></i> 8. Observações Gerais e Recomendações</div>
      <div class="form-section-body">
        <div class="form-group">
          <textarea id="sw_obs" class="form-control" rows="5" placeholder="Resumo da semana, conquistas, desafios, recomendações para a próxima semana…"></textarea>
        </div>
      </div>
    </div>

    <div class="form-actions">
      <button class="btn btn-secondary" onclick="navigate('semanal')"><i class="fas fa-eraser"></i> Limpar</button>
      <button class="btn btn-outline" onclick="saveDraft('semanal')"><i class="fas fa-save"></i> Guardar Rascunho</button>
      <button class="btn btn-success" onclick="exportCurrentFormToPdf('semanal')"><i class="fas fa-file-pdf"></i> Exportar PDF</button>
      <button class="btn btn-primary" onclick="previewSemanal()"><i class="fas fa-paper-plane"></i> Rever e Enviar</button>
    </div>
  `;

  ['tb_gravacoes_sem','tb_emitidos_dir','tb_pendencias','tb_equip_sem'].forEach(bindRemoveRowBtns);
}

function gravacoesSemRow() {
  return `<tr>
    <td><input data-field="programa" placeholder="Programa"></td>
    <td><input data-field="data" type="date"></td>
    <td><input data-field="duracao" placeholder="Ex: 2h15min"></td>
    <td><input data-field="episodios" placeholder="Ex: Ep. 12 ao 14"></td>
    <td><input data-field="obs" placeholder="Obs."></td>
    <td><button class="btn-remove-row"><i class="fas fa-trash"></i></button></td>
  </tr>`;
}
function emitidosDirRow() {
  return `<tr>
    <td><input data-field="programa" placeholder="Programa"></td>
    <td><input data-field="data" type="date"></td>
    <td><input data-field="horario" type="time"></td>
    <td><input data-field="duracao" placeholder="Ex: 30min"></td>
    <td><select data-field="confirmacao">
      <option value="Emitido">Emitido</option>
      <option value="Não emitido">Não emitido</option>
      <option value="Emitido parcialmente">Parcialmente</option>
    </select></td>
    <td><input data-field="obs" placeholder="Obs."></td>
    <td><button class="btn-remove-row"><i class="fas fa-trash"></i></button></td>
  </tr>`;
}
function pendenciasRow() {
  return `<tr>
    <td><input data-field="assunto" placeholder="Assunto/Programa"></td>
    <td><input data-field="responsavel" placeholder="Responsável"></td>
    <td><input data-field="prazo" type="date"></td>
    <td><select data-field="status">
      <option value="Em curso">Em curso</option>
      <option value="Atrasado">Atrasado</option>
      <option value="Concluído">Concluído</option>
      <option value="Cancelado">Cancelado</option>
    </select></td>
    <td><input data-field="obs" placeholder="Obs."></td>
    <td><button class="btn-remove-row"><i class="fas fa-trash"></i></button></td>
  </tr>`;
}
function equipSemRow() {
  return `<tr>
    <td><input data-field="equipamento" placeholder="Ex: Câmara B — Sony FX6"></td>
    <td><select data-field="estado">
      <option value="Operacional">Operacional</option>
      <option value="Em manutenção">Em manutenção</option>
      <option value="Avariado">Avariado</option>
    </select></td>
    <td><input data-field="problema" placeholder="Descrição da avaria"></td>
    <td><input data-field="accao" placeholder="Acção necessária"></td>
    <td><button class="btn-remove-row"><i class="fas fa-trash"></i></button></td>
  </tr>`;
}

function collectSemanal() {
  const indicadores = {
    total_gravacoes: document.getElementById('sw_indGrav').value,
    horas_producao:  document.getElementById('sw_indHoras').value,
    directo:         document.getElementById('sw_indDirecto').value,
    pautas_cobertas: document.getElementById('sw_indPautas').value,
    pautas_canceladas: document.getElementById('sw_indCanc').value,
    incidentes:      document.getElementById('sw_indInc').value,
  };
  const rh = {
    total_activos: document.getElementById('sw_rhTotal').value,
    ausencias:     document.getElementById('sw_rhAusencias').value,
    obs:           document.getElementById('sw_rhObs').value.trim(),
  };
  return {
    semana_referencia: document.getElementById('sw_semana').value.trim(),
    numero_semana:     document.getElementById('sw_numSemana').value.trim(),
    data_envio:        document.getElementById('sw_dataEnvio').value,
    elaborado_por:     document.getElementById('sw_elaborado').value.trim(),
    cargo_funcao:      document.getElementById('sw_cargo').value.trim(),
    gravacoes_semana:  JSON.stringify(getTableRows('tb_gravacoes_sem', ['programa','data','duracao','episodios','obs'])),
    programas_emitidos:JSON.stringify(getTableRows('tb_emitidos_dir', ['programa','data','horario','duracao','confirmacao','obs'])),
    pendencias:        JSON.stringify(getTableRows('tb_pendencias', ['assunto','responsavel','prazo','status','obs'])),
    equipamentos:      JSON.stringify(getTableRows('tb_equip_sem', ['equipamento','estado','problema','accao'])),
    recursos_humanos:  JSON.stringify(rh),
    indicadores:       JSON.stringify(indicadores),
    observacoes_gerais:document.getElementById('sw_obs').value.trim(),
  };
}

function previewSemanal() {
  const d = collectSemanal();
  if (!d.semana_referencia || !d.elaborado_por) {
    return showToast('Preencha os campos obrigatórios.', 'error');
  }
  const gravs = JSON.parse(d.gravacoes_semana  || '[]');
  const emits = JSON.parse(d.programas_emitidos|| '[]');
  const pends = JSON.parse(d.pendencias        || '[]');
  const ind   = JSON.parse(d.indicadores       || '{}');
  const html = `
    <div class="preview-block">
      <h4>Identificação</h4>
      <div class="preview-grid">
        <div class="preview-field"><label>Semana</label><p>${safe(d.semana_referencia)}</p></div>
        <div class="preview-field"><label>Nº Semana</label><p>${safe(d.numero_semana)}</p></div>
        <div class="preview-field"><label>Elaborado por</label><p>${safe(d.elaborado_por)}</p></div>
        <div class="preview-field"><label>Cargo</label><p>${safe(d.cargo_funcao)}</p></div>
      </div>
    </div>
    <div class="preview-block">
      <h4>Indicadores</h4>
      <div class="preview-grid">
        <div class="preview-field"><label>Total Gravações</label><p>${safe(ind.total_gravacoes)}</p></div>
        <div class="preview-field"><label>Horas Produção</label><p>${safe(ind.horas_producao)}</p></div>
        <div class="preview-field"><label>Emissões Directas</label><p>${safe(ind.directo)}</p></div>
        <div class="preview-field"><label>Pautas Cobertas</label><p>${safe(ind.pautas_cobertas)}</p></div>
        <div class="preview-field"><label>Pautas Canceladas</label><p>${safe(ind.pautas_canceladas)}</p></div>
        <div class="preview-field"><label>Incidentes</label><p>${safe(ind.incidentes)}</p></div>
      </div>
    </div>
    ${gravs.length ? `<div class="preview-block"><h4>Gravações (${gravs.length})</h4>
      <table class="preview-table"><thead><tr><th>Programa</th><th>Data</th><th>Duração</th><th>Episódios</th></tr></thead>
      <tbody>${gravs.map(r=>`<tr><td>${safe(r.programa)}</td><td>${formatDate(r.data)}</td><td>${safe(r.duracao)}</td><td>${safe(r.episodios)}</td></tr>`).join('')}</tbody></table></div>` : ''}
    ${emits.length ? `<div class="preview-block"><h4>Emissões Directas (${emits.length})</h4>
      <table class="preview-table"><thead><tr><th>Programa</th><th>Data</th><th>Horário</th><th>Confirmação</th></tr></thead>
      <tbody>${emits.map(r=>`<tr><td>${safe(r.programa)}</td><td>${formatDate(r.data)}</td><td>${safe(r.horario)}</td><td>${safe(r.confirmacao)}</td></tr>`).join('')}</tbody></table></div>` : ''}
    ${pends.length ? `<div class="preview-block"><h4>Pendências (${pends.length})</h4>
      <table class="preview-table"><thead><tr><th>Assunto</th><th>Responsável</th><th>Prazo</th><th>Status</th></tr></thead>
      <tbody>${pends.map(r=>`<tr><td>${safe(r.assunto)}</td><td>${safe(r.responsavel)}</td><td>${formatDate(r.prazo)}</td><td>${safe(r.status)}</td></tr>`).join('')}</tbody></table></div>` : ''}
    ${d.observacoes_gerais ? `<div class="preview-block"><h4>Observações Gerais</h4><p style="font-size:14px;">${d.observacoes_gerais}</p></div>` : ''}
  `;
  openModal('Pré-visualização — Relatório Semanal de Produção', html, () => submitSemanal(d), () => exportToPdf('semanal', d));
}

async function submitSemanal(d) {
  try {
    await apiPost('relatorios_semanais', { ...d, status: 'enviado' });
    showToast('Relatório Semanal enviado com sucesso!', 'success');
    navigate('semanal');
  } catch { showToast('Erro ao enviar.', 'error'); }
}

// ────────────────────────────────────────────────────────────────
//  PÁGINA: HISTÓRICO
// ────────────────────────────────────────────────────────────────
async function renderHistorico(el) {
  el.innerHTML = `
    <div class="page-header">
      <div class="page-title"><i class="fas fa-history" style="color:var(--text-muted);margin-right:8px;"></i>Histórico de <span>Envios</span></div>
    </div>
    <div class="search-bar-wrapper">
      <input type="text" id="histSearch" placeholder="Pesquisar por elaborado por, referência…" oninput="filterHistorico()">
      <select id="histFilter" onchange="filterHistorico()">
        <option value="">Todos os tipos</option>
        <option value="pauta">Relatório de Pauta</option>
        <option value="diarios">Programas Diários</option>
        <option value="gravados">Programas Gravados</option>
        <option value="semanal">Relatório Semanal</option>
      </select>
      <select id="histStatus" onchange="filterHistorico()">
        <option value="">Todos os estados</option>
        <option value="enviado">Enviado</option>
        <option value="rascunho">Rascunho</option>
      </select>
    </div>
    <div class="card">
      <div class="card-body" id="histList" style="padding:0;">
        <div class="empty-state"><i class="fas fa-spinner fa-spin"></i><h4>A carregar…</h4></div>
      </div>
    </div>
  `;
  await loadHistorico();
}

let _histData = [];

async function loadHistorico() {
  const types = [
    { table: 'relatorios_pauta', label: 'Relatório de Pauta', cls: 'type-pauta', icon: 'fa-calendar-alt', key: 'pauta' },
    { table: 'relatorios_programas_diarios', label: 'Programas Diários', cls: 'type-diarios', icon: 'fa-tv', key: 'diarios' },
    { table: 'relatorios_programas_gravados', label: 'Programas Gravados', cls: 'type-gravados', icon: 'fa-video', key: 'gravados' },
    { table: 'relatorios_semanais', label: 'Relatório Semanal', cls: 'type-semanal', icon: 'fa-chart-bar', key: 'semanal' },
  ];
  _histData = [];
  for (const t of types) {
    try {
      const res = await apiGet(t.table, { limit: 200 });
      (res.data || []).forEach(r => _histData.push({ ...r, _type: t }));
    } catch {}
  }
  _histData.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
  renderHistoricoTable(_histData);
}

function renderHistoricoTable(data) {
  const el = document.getElementById('histList');
  if (!el) return;
  if (!data.length) {
    el.innerHTML = `<div class="empty-state"><i class="fas fa-inbox"></i><h4>Nenhum relatório encontrado</h4><p>Os relatórios enviados ou guardados como rascunho aparecerão aqui.</p></div>`;
    return;
  }
  el.innerHTML = `
    <table class="hist-table">
      <thead><tr>
        <th>Tipo</th><th>Referência</th><th>Elaborado por</th>
        <th>Estado</th><th>Data de Registo</th><th>Acções</th>
      </tr></thead>
      <tbody>
        ${data.map(r => `
          <tr data-id="${r.id}" data-table="${r._type.table}">
            <td><span class="type-badge ${r._type.cls}"><i class="fas ${r._type.icon}"></i> ${r._type.label}</span></td>
            <td>${safe(r.data_referencia || r.data_emissao || r.data_gravacao || r.semana_referencia)}</td>
            <td>${safe(r.elaborado_por)}</td>
            <td><span class="badge ${r.status === 'enviado' ? 'badge-sent' : 'badge-draft'}">${r.status === 'enviado' ? 'Enviado' : 'Rascunho'}</span></td>
            <td>${formatDateTime(r.created_at)}</td>
            <td>
              <button class="btn btn-sm btn-secondary" onclick="viewHistRecord('${r.id}','${r._type.key}')"><i class="fas fa-eye"></i></button>
              <button class="btn btn-sm btn-success" onclick="exportToPdf('${r._type.key}', _histData.find(x=>x.id==='${r.id}'))" title="Exportar PDF"><i class="fas fa-file-pdf"></i></button>
              <button class="btn btn-sm btn-danger" onclick="deleteHistRecord('${r.id}','${r._type.table}')"><i class="fas fa-trash"></i></button>
            </td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

function filterHistorico() {
  const search = (document.getElementById('histSearch')?.value || '').toLowerCase();
  const type   = document.getElementById('histFilter')?.value || '';
  const status = document.getElementById('histStatus')?.value || '';
  const filtered = _histData.filter(r => {
    const matchSearch = !search ||
      (r.elaborado_por || '').toLowerCase().includes(search) ||
      (r.data_referencia || r.data_emissao || r.data_gravacao || r.semana_referencia || '').toLowerCase().includes(search);
    const matchType   = !type   || r._type.key === type;
    const matchStatus = !status || r.status === status;
    return matchSearch && matchType && matchStatus;
  });
  renderHistoricoTable(filtered);
}

async function deleteHistRecord(id, table) {
  if (!confirm('Tem a certeza que deseja eliminar este registo?')) return;
  try {
    await apiDelete(table, id);
    showToast('Registo eliminado.', 'info');
    _histData = _histData.filter(r => r.id !== id);
    filterHistorico();
  } catch { showToast('Erro ao eliminar.', 'error'); }
}

function viewHistRecord(id, typeKey) {
  const r = _histData.find(x => x.id === id);
  if (!r) return;
  const builders = {
    pauta:    buildPreviewPautaFromRecord,
    diarios:  buildPreviewDiariosFromRecord,
    gravados: buildPreviewGravadosFromRecord,
    semanal:  buildPreviewSemanalFromRecord,
  };
  const fn = builders[typeKey];
  if (!fn) return;
  const html = fn(r);

  // Usar openModal com botão PDF e sem botão de envio
  document.getElementById('modalTitle').textContent = `Visualizar — ${r._type.label}`;
  document.getElementById('modalBody').innerHTML = html;
  App.pendingSubmit = null;
  App.pendingPdf = () => exportToPdf(typeKey, r);

  document.getElementById('modalConfirmBtn').style.display = 'none';
  document.getElementById('modalPdfBtn').style.display = '';
  document.getElementById('modalBackdrop').classList.add('show');

  // Ao fechar, restaurar estado normal
  const closeFn = () => {
    App.pendingPdf = null;
    document.getElementById('modalConfirmBtn').style.display = '';
    document.getElementById('modalPdfBtn').style.display = 'none';
    document.getElementById('modalBackdrop').classList.remove('show');
    document.getElementById('modalClose').onclick = closeModal;
  };
  document.getElementById('modalClose').onclick = closeFn;
  document.getElementById('modalCancelBtn').onclick = closeFn;
}

function buildPreviewPautaFromRecord(r) {
  const conf  = tryParse(r.pautas_confirmadas);
  const pend  = tryParse(r.pautas_pendentes);
  const canc  = tryParse(r.pautas_canceladas);
  const equip = tryParse(r.equipas_tecnicas);
  return `
    <div class="preview-block"><h4>Identificação</h4>
      <div class="preview-grid">
        <div class="preview-field"><label>Data Referência</label><p>${formatDate(r.data_referencia)}</p></div>
        <div class="preview-field"><label>Data Envio</label><p>${formatDate(r.data_envio)}</p></div>
        <div class="preview-field"><label>Elaborado por</label><p>${safe(r.elaborado_por)}</p></div>
        <div class="preview-field"><label>Cargo</label><p>${safe(r.cargo_funcao)}</p></div>
      </div>
    </div>
    ${conf.length ? `<div class="preview-block"><h4>Pautas Confirmadas (${conf.length})</h4>
      <table class="preview-table"><thead><tr><th>Programa</th><th>Pauta</th><th>Repórter</th><th>Local</th><th>Saída</th></tr></thead>
      <tbody>${conf.map(x=>`<tr><td>${safe(x.programa)}</td><td>${safe(x.pauta)}</td><td>${safe(x.reporter)}</td><td>${safe(x.local)}</td><td>${safe(x.saida)}</td></tr>`).join('')}</tbody></table></div>`:''}
    ${r.notas_gerais ? `<div class="preview-block"><h4>Notas Gerais</h4><p>${r.notas_gerais}</p></div>`:''}`;
}
function buildPreviewDiariosFromRecord(r) {
  const progs = tryParse(r.programas);
  const incs  = tryParse(r.incidentes);
  return `
    <div class="preview-block"><h4>Identificação</h4>
      <div class="preview-grid">
        <div class="preview-field"><label>Data Emissão</label><p>${formatDate(r.data_emissao)}</p></div>
        <div class="preview-field"><label>Elaborado por</label><p>${safe(r.elaborado_por)}</p></div>
      </div>
    </div>
    ${progs.length ? `<div class="preview-block"><h4>Programas (${progs.length})</h4>
      <table class="preview-table"><thead><tr><th>Nome</th><th>Hor. Previsto</th><th>Hor. Real</th><th>Confirmação</th></tr></thead>
      <tbody>${progs.map(x=>`<tr><td>${safe(x.nome)}</td><td>${safe(x.hor_previsto)}</td><td>${safe(x.hor_real)}</td><td>${safe(x.confirmacao)}</td></tr>`).join('')}</tbody></table></div>`:''}
    ${incs.length ? `<div class="preview-block"><h4>Incidentes (${incs.length})</h4>
      <table class="preview-table"><thead><tr><th>Programa</th><th>Tipo</th><th>Causa</th></tr></thead>
      <tbody>${incs.map(x=>`<tr><td>${safe(x.programa)}</td><td>${safe(x.tipo)}</td><td>${safe(x.causa)}</td></tr>`).join('')}</tbody></table></div>`:''}
    ${r.observacoes_gerais ? `<div class="preview-block"><h4>Observações</h4><p>${r.observacoes_gerais}</p></div>`:''}`;
}
function buildPreviewGravadosFromRecord(r) {
  const cont = tryParse(r.conteudo_gravado);
  const etec = tryParse(r.equipa_tecnica);
  return `
    <div class="preview-block"><h4>Identificação</h4>
      <div class="preview-grid">
        <div class="preview-field"><label>Programa</label><p>${safe(r.nome_programa)}</p></div>
        <div class="preview-field"><label>Data</label><p>${formatDate(r.data_gravacao)}</p></div>
        <div class="preview-field"><label>Local</label><p>${safe(r.local_gravacao)}</p></div>
        <div class="preview-field"><label>Duração Total</label><p>${safe(r.duracao_total)}</p></div>
        <div class="preview-field"><label>Elaborado por</label><p>${safe(r.elaborado_por)}</p></div>
      </div>
    </div>
    ${cont.length ? `<div class="preview-block"><h4>Conteúdo Gravado (${cont.length})</h4>
      <table class="preview-table"><thead><tr><th>Ep./Seg.</th><th>Título</th><th>Duração</th><th>Estado</th></tr></thead>
      <tbody>${cont.map(x=>`<tr><td>${safe(x.ep)}</td><td>${safe(x.titulo)}</td><td>${safe(x.duracao)}</td><td>${safe(x.estado)}</td></tr>`).join('')}</tbody></table></div>`:''}
    ${etec.length ? `<div class="preview-block"><h4>Equipa Técnica (${etec.length})</h4>
      <table class="preview-table"><thead><tr><th>Nome</th><th>Função</th><th>Presente</th></tr></thead>
      <tbody>${etec.map(x=>`<tr><td>${safe(x.nome)}</td><td>${safe(x.funcao)}</td><td>${safe(x.presente)}</td></tr>`).join('')}</tbody></table></div>`:''}
    ${r.observacoes ? `<div class="preview-block"><h4>Observações</h4><p>${r.observacoes}</p></div>`:''}`;
}
function buildPreviewSemanalFromRecord(r) {
  const ind   = tryParse(r.indicadores, {});
  const gravs = tryParse(r.gravacoes_semana);
  const pends = tryParse(r.pendencias);
  return `
    <div class="preview-block"><h4>Identificação</h4>
      <div class="preview-grid">
        <div class="preview-field"><label>Semana</label><p>${safe(r.semana_referencia)}</p></div>
        <div class="preview-field"><label>Nº Semana</label><p>${safe(r.numero_semana)}</p></div>
        <div class="preview-field"><label>Elaborado por</label><p>${safe(r.elaborado_por)}</p></div>
      </div>
    </div>
    <div class="preview-block"><h4>Indicadores</h4>
      <div class="preview-grid">
        <div class="preview-field"><label>Gravações</label><p>${safe(ind.total_gravacoes)}</p></div>
        <div class="preview-field"><label>Horas Prod.</label><p>${safe(ind.horas_producao)}</p></div>
        <div class="preview-field"><label>Directos</label><p>${safe(ind.directo)}</p></div>
        <div class="preview-field"><label>Pautas Cobertas</label><p>${safe(ind.pautas_cobertas)}</p></div>
      </div>
    </div>
    ${gravs.length ? `<div class="preview-block"><h4>Gravações (${gravs.length})</h4>
      <table class="preview-table"><thead><tr><th>Programa</th><th>Data</th><th>Duração</th></tr></thead>
      <tbody>${gravs.map(x=>`<tr><td>${safe(x.programa)}</td><td>${formatDate(x.data)}</td><td>${safe(x.duracao)}</td></tr>`).join('')}</tbody></table></div>`:''}
    ${pends.length ? `<div class="preview-block"><h4>Pendências (${pends.length})</h4>
      <table class="preview-table"><thead><tr><th>Assunto</th><th>Responsável</th><th>Status</th></tr></thead>
      <tbody>${pends.map(x=>`<tr><td>${safe(x.assunto)}</td><td>${safe(x.responsavel)}</td><td>${safe(x.status)}</td></tr>`).join('')}</tbody></table></div>`:''}
    ${r.observacoes_gerais ? `<div class="preview-block"><h4>Observações</h4><p>${r.observacoes_gerais}</p></div>`:''}`;
}

function tryParse(str, def = []) {
  try { return JSON.parse(str || '[]'); } catch { return def; }
}
