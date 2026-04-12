/* ============================================================
   REDE GIRASSOL — pdf.js — Geração de PDFs com jsPDF
   ============================================================ */

// ── CONSTANTES DE LAYOUT ──────────────────────────────────────
const PDF = {
  marginL: 14,
  marginR: 14,
  marginT: 18,
  pageW:   210,
  pageH:   297,
  get contentW() { return this.pageW - this.marginL - this.marginR; },

  // Cores
  yellow:  [245, 166, 35],
  navy:    [26,  43,  74],
  white:   [255, 255, 255],
  light:   [244, 246, 251],
  border:  [226, 232, 240],
  text:    [30,  41,  59],
  muted:   [100, 116, 139],
  success: [39,  174,  96],
  danger:  [231, 76,  60],
};

// ── HELPERS ───────────────────────────────────────────────────
function pdfNew() {
  return new window.jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
}

function pdfHeader(doc, titulo, subtitulo) {
  // Barra amarela topo
  doc.setFillColor(...PDF.yellow);
  doc.rect(0, 0, PDF.pageW, 22, 'F');

  // Logo ícone (círculo com sol)
  doc.setFillColor(...PDF.navy);
  doc.circle(PDF.marginL + 6, 11, 6, 'F');
  doc.setTextColor(...PDF.yellow);
  doc.setFontSize(9);
  doc.setFont('helvetica','bold');
  doc.text('☀', PDF.marginL + 6, 13.5, { align: 'center' });

  // Título no topo
  doc.setTextColor(...PDF.navy);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('REDE GIRASSOL  |  Direcção de Produção', PDF.marginL + 16, 10);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text(subtitulo || '', PDF.marginL + 16, 16);

  // Data geração no canto direito
  const now = new Date().toLocaleString('pt-AO');
  doc.setFontSize(7);
  doc.setTextColor(80, 80, 80);
  doc.text(`Gerado: ${now}`, PDF.pageW - PDF.marginR, 19, { align: 'right' });

  // Barra azul escuro com título do relatório
  doc.setFillColor(...PDF.navy);
  doc.rect(0, 22, PDF.pageW, 14, 'F');
  doc.setTextColor(...PDF.white);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(titulo.toUpperCase(), PDF.pageW / 2, 32, { align: 'center' });

  return 42; // y inicial após cabeçalho
}

function pdfFooter(doc) {
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(...PDF.navy);
    doc.rect(0, PDF.pageH - 10, PDF.pageW, 10, 'F');
    doc.setTextColor(...PDF.yellow);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('REDE GIRASSOL — Direcção de Produção', PDF.marginL, PDF.pageH - 4);
    doc.setTextColor(200, 200, 200);
    doc.setFont('helvetica', 'normal');
    doc.text(`Página ${i} de ${totalPages}`, PDF.pageW - PDF.marginR, PDF.pageH - 4, { align: 'right' });
  }
}

// Secção com título estilo bloco azul escuro
function pdfSectionTitle(doc, y, title) {
  doc.setFillColor(...PDF.navy);
  doc.rect(PDF.marginL, y, PDF.contentW, 7, 'F');
  doc.setTextColor(...PDF.yellow);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text(title.toUpperCase(), PDF.marginL + 3, y + 5);
  return y + 10;
}

// Sub-secção (linha cinza)
function pdfSubSection(doc, y, title) {
  doc.setFillColor(...PDF.light);
  doc.rect(PDF.marginL, y, PDF.contentW, 6, 'F');
  doc.setDrawColor(...PDF.border);
  doc.rect(PDF.marginL, y, PDF.contentW, 6, 'S');
  doc.setTextColor(...PDF.navy);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(title, PDF.marginL + 3, y + 4.3);
  return y + 8;
}

// Par label: valor em linha
function pdfField(doc, y, label, value, col = 0, cols = 2) {
  const colW = PDF.contentW / cols;
  const x = PDF.marginL + col * colW;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PDF.muted);
  doc.text(label.toUpperCase(), x, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...PDF.text);
  doc.setFontSize(8.5);
  const val = value && value !== '—' ? String(value) : '—';
  const lines = doc.splitTextToSize(val, colW - 4);
  doc.text(lines, x, y + 4);
  return Math.max(4 + lines.length * 4, 4);
}

// Bloco de campos identificação (grid 2 colunas)
function pdfIdBlock(doc, y, fields) {
  // fundo branco com borda
  doc.setFillColor(255,255,255);
  doc.setDrawColor(...PDF.border);
  doc.rect(PDF.marginL, y, PDF.contentW, 20, 'FD');

  let maxH = 0;
  fields.forEach((f, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const fy = y + 4 + row * 10;
    const h = pdfField(doc, fy, f.label, f.value, col, 2);
    maxH = Math.max(maxH, (row + 1) * 10);
  });

  const blockH = maxH + 8;
  // redesenha com altura correcta
  doc.setFillColor(255,255,255);
  doc.setDrawColor(...PDF.border);
  doc.rect(PDF.marginL, y, PDF.contentW, blockH, 'FD');
  // redesenha campos
  fields.forEach((f, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    pdfField(doc, y + 4 + row * 10, f.label, f.value, col, 2);
  });

  return y + blockH + 4;
}

// Tabela dinâmica
function pdfTable(doc, y, headers, rows, colWidths) {
  const totalW = PDF.contentW;
  const cellPad = 2.5;
  const headerH = 7;
  const rowH = 6.5;

  // Verifica se cabe na página
  if (y + headerH + rows.length * rowH > PDF.pageH - 16) {
    doc.addPage();
    y = PDF.marginT;
  }

  // Cabeçalho da tabela
  doc.setFillColor(...PDF.navy);
  doc.rect(PDF.marginL, y, totalW, headerH, 'F');
  doc.setTextColor(...PDF.white);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');

  let xOff = PDF.marginL;
  headers.forEach((h, i) => {
    const cw = colWidths ? colWidths[i] : totalW / headers.length;
    doc.text(h, xOff + cellPad, y + headerH - 2);
    xOff += cw;
  });

  y += headerH;

  // Linhas
  rows.forEach((row, ri) => {
    // Nova página se necessário
    if (y + rowH > PDF.pageH - 16) {
      doc.addPage();
      y = PDF.marginT;
      // repetir cabeçalho
      doc.setFillColor(...PDF.navy);
      doc.rect(PDF.marginL, y, totalW, headerH, 'F');
      doc.setTextColor(...PDF.white);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      xOff = PDF.marginL;
      headers.forEach((h, i) => {
        const cw = colWidths ? colWidths[i] : totalW / headers.length;
        doc.text(h, xOff + cellPad, y + headerH - 2);
        xOff += cw;
      });
      y += headerH;
    }

    const bgColor = ri % 2 === 0 ? [255,255,255] : [248,250,252];
    doc.setFillColor(...bgColor);
    doc.rect(PDF.marginL, y, totalW, rowH, 'F');
    doc.setDrawColor(...PDF.border);
    doc.rect(PDF.marginL, y, totalW, rowH, 'S');

    doc.setTextColor(...PDF.text);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');

    xOff = PDF.marginL;
    row.forEach((cell, i) => {
      const cw = colWidths ? colWidths[i] : totalW / headers.length;
      const txt = cell !== undefined && cell !== null && cell !== '' ? String(cell) : '—';
      const truncated = doc.splitTextToSize(txt, cw - cellPad * 2)[0] || '—';
      doc.text(truncated, xOff + cellPad, y + rowH - 2);
      xOff += cw;
    });

    y += rowH;
  });

  return y + 4;
}

// Caixa de texto livre (observações)
function pdfTextBox(doc, y, label, text) {
  if (!text) return y;
  doc.setFillColor(...PDF.light);
  doc.setDrawColor(...PDF.border);
  const lines = doc.splitTextToSize(text, PDF.contentW - 8);
  const boxH = 6 + lines.length * 4.5;

  if (y + boxH > PDF.pageH - 16) { doc.addPage(); y = PDF.marginT; }

  doc.rect(PDF.marginL, y, PDF.contentW, boxH, 'FD');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PDF.muted);
  doc.text(label.toUpperCase(), PDF.marginL + 3, y + 4);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...PDF.text);
  doc.setFontSize(8);
  doc.text(lines, PDF.marginL + 3, y + 8.5);
  return y + boxH + 4;
}

// Bloco de indicadores (badges numerados)
function pdfIndicadores(doc, y, items) {
  const cols = 3;
  const cellW = PDF.contentW / cols;
  const cellH = 14;
  const rows = Math.ceil(items.length / cols);
  const totalH = rows * cellH;

  if (y + totalH > PDF.pageH - 16) { doc.addPage(); y = PDF.marginT; }

  items.forEach((item, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = PDF.marginL + col * cellW;
    const cy = y + row * cellH;

    doc.setFillColor(...PDF.white);
    doc.setDrawColor(...PDF.border);
    doc.rect(x, cy, cellW, cellH, 'FD');

    // valor grande
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PDF.navy);
    doc.text(String(item.value || '0'), x + cellW / 2, cy + 8, { align: 'center' });

    // label pequena
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...PDF.muted);
    doc.text(item.label, x + cellW / 2, cy + 12, { align: 'center' });
  });

  return y + totalH + 4;
}

// ── ESPAÇO SEGURO ─────────────────────────────────────────────
function ensureSpace(doc, y, needed = 20) {
  if (y + needed > PDF.pageH - 16) {
    doc.addPage();
    return PDF.marginT;
  }
  return y;
}

// ═══════════════════════════════════════════════════════════════
//  GERADOR: RELATÓRIO DE PAUTA
// ═══════════════════════════════════════════════════════════════
function generatePdfPauta(data) {
  const doc = pdfNew();
  let y = pdfHeader(doc, 'Relatório de Pauta', 'Direcção de Produção — Rede Girassol');

  // 1. Identificação
  y = pdfSectionTitle(doc, y, '1. Identificação');
  y = pdfIdBlock(doc, y, [
    { label: 'Data de Referência', value: formatDate(data.data_referencia) },
    { label: 'Data de Envio',      value: formatDate(data.data_envio) },
    { label: 'Elaborado por',      value: data.elaborado_por },
    { label: 'Cargo / Função',     value: data.cargo_funcao },
  ]);

  // PARTE A
  y = ensureSpace(doc, y, 30);
  y = pdfSectionTitle(doc, y, 'PARTE A — Planeamento do Dia Seguinte');

  // A1 - Pautas Confirmadas
  const conf = tryParse(data.pautas_confirmadas);
  y = pdfSubSection(doc, y, 'A1 — Pautas Confirmadas');
  if (conf.length) {
    y = pdfTable(doc, y,
      ['Programa', 'Pauta / Tema', 'Repórter / Produtor', 'Local', 'Saída', 'Regresso'],
      conf.map(r => [r.programa, r.pauta, r.reporter, r.local, r.saida, r.regresso]),
      [35, 45, 35, 30, 18, 19]
    );
  } else {
    y = pdfEmptyRow(doc, y, 'Sem pautas confirmadas.');
  }

  // A2 - Pendentes
  y = ensureSpace(doc, y, 20);
  const pend = tryParse(data.pautas_pendentes);
  y = pdfSubSection(doc, y, 'A2 — Pautas Pendentes de Confirmação');
  if (pend.length) {
    y = pdfTable(doc, y,
      ['Programa', 'Pauta / Tema', 'Responsável', 'Motivo Pendência', 'Prazo'],
      pend.map(r => [r.programa, r.pauta, r.responsavel, r.motivo, formatDate(r.prazo)]),
      [35, 42, 35, 40, 30]
    );
  } else {
    y = pdfEmptyRow(doc, y, 'Sem pautas pendentes.');
  }

  // A3 - Canceladas
  y = ensureSpace(doc, y, 20);
  const canc = tryParse(data.pautas_canceladas);
  y = pdfSubSection(doc, y, 'A3 — Pautas Canceladas / Adiadas');
  if (canc.length) {
    y = pdfTable(doc, y,
      ['Programa', 'Pauta / Tema', 'Motivo', 'Nova Data'],
      canc.map(r => [r.programa, r.pauta, r.motivo, formatDate(r.nova_data)]),
      [40, 50, 55, 37]
    );
  } else {
    y = pdfEmptyRow(doc, y, 'Sem pautas canceladas.');
  }

  // PARTE B - Equipas
  y = ensureSpace(doc, y, 30);
  y = pdfSectionTitle(doc, y, 'PARTE B — Equipas Técnicas Destacadas');
  const equip = tryParse(data.equipas_tecnicas);
  if (equip.length) {
    y = pdfTable(doc, y,
      ['Programa / Pauta', 'Repórter', 'Cameraman', 'Sonoplasta', 'Motorista', 'Obs.'],
      equip.map(r => [r.programa, r.reporter, r.cameraman, r.sonoplasta, r.motorista, r.obs]),
      [38, 30, 28, 28, 28, 30]
    );
  } else {
    y = pdfEmptyRow(doc, y, 'Sem equipas registadas.');
  }

  // Notas
  if (data.notas_gerais) {
    y = ensureSpace(doc, y, 20);
    y = pdfSectionTitle(doc, y, 'Notas Gerais / Observações');
    y = pdfTextBox(doc, y, 'Observações', data.notas_gerais);
  }

  // Rodapé de assinatura
  y = ensureSpace(doc, y, 30);
  y = pdfSignature(doc, y, data.elaborado_por, data.cargo_funcao, data.data_envio);

  pdfFooter(doc);
  doc.save(`Relatorio_Pauta_${data.data_referencia || 'sem_data'}.pdf`);
  showToast('PDF gerado com sucesso!', 'success');
}

// ═══════════════════════════════════════════════════════════════
//  GERADOR: PROGRAMAS DIÁRIOS
// ═══════════════════════════════════════════════════════════════
function generatePdfDiarios(data) {
  const doc = pdfNew();
  let y = pdfHeader(doc, 'Relatório de Programas Diários', 'Direcção de Produção — Rede Girassol');

  y = pdfSectionTitle(doc, y, '1. Identificação');
  y = pdfIdBlock(doc, y, [
    { label: 'Data de Emissão', value: formatDate(data.data_emissao) },
    { label: 'Data de Envio',   value: formatDate(data.data_envio) },
    { label: 'Elaborado por',   value: data.elaborado_por },
    { label: 'Cargo / Função',  value: data.cargo_funcao },
  ]);

  // Programas
  y = ensureSpace(doc, y, 30);
  y = pdfSectionTitle(doc, y, '2. Programas do Dia — Confirmação de Emissão');
  const progs = tryParse(data.programas);
  if (progs.length) {
    y = pdfTable(doc, y,
      ['Nome do Programa', 'Hor. Prev.', 'Hor. Real', 'Dur. Prev.', 'Dur. Real', 'Confirmação', 'Formato', 'Responsável'],
      progs.map(r => [r.nome, r.hor_previsto, r.hor_real, r.dur_prevista, r.dur_real, r.confirmacao, r.formato, r.responsavel]),
      [36, 16, 16, 16, 14, 30, 18, 36]
    );
  } else {
    y = pdfEmptyRow(doc, y, 'Sem programas registados.');
  }

  // Incidentes
  y = ensureSpace(doc, y, 20);
  y = pdfSectionTitle(doc, y, '3. Falhas / Incidentes de Emissão');
  const incs = tryParse(data.incidentes);
  if (incs.length) {
    y = pdfTable(doc, y,
      ['Programa', 'Tipo de Falha', 'Horário', 'Duração', 'Causa', 'Medida Correctiva'],
      incs.map(r => [r.programa, r.tipo, r.horario, r.duracao, r.causa, r.medida]),
      [30, 25, 15, 14, 42, 56]
    );
  } else {
    y = pdfEmptyRow(doc, y, 'Sem incidentes registados.');
  }

  if (data.observacoes_gerais) {
    y = ensureSpace(doc, y, 20);
    y = pdfSectionTitle(doc, y, '4. Observações Gerais');
    y = pdfTextBox(doc, y, 'Observações', data.observacoes_gerais);
  }

  y = ensureSpace(doc, y, 30);
  y = pdfSignature(doc, y, data.elaborado_por, data.cargo_funcao, data.data_envio);

  pdfFooter(doc);
  doc.save(`Relatorio_Programas_Diarios_${data.data_emissao || 'sem_data'}.pdf`);
  showToast('PDF gerado com sucesso!', 'success');
}

// ═══════════════════════════════════════════════════════════════
//  GERADOR: PROGRAMAS GRAVADOS
// ═══════════════════════════════════════════════════════════════
function generatePdfGravados(data) {
  const doc = pdfNew();
  let y = pdfHeader(doc, 'Relatório de Programas Gravados', 'Direcção de Produção — Rede Girassol');

  y = pdfSectionTitle(doc, y, '1. Identificação da Gravação');
  y = pdfIdBlock(doc, y, [
    { label: 'Nome do Programa',     value: data.nome_programa },
    { label: 'Data da Gravação',     value: formatDate(data.data_gravacao) },
    { label: 'Local',                value: data.local_gravacao },
    { label: 'Estúdio / Exteriores', value: data.estudio_exteriores },
    { label: 'Horário Convocado',    value: data.horario_convocado },
    { label: 'Início Real',          value: data.horario_real_inicio },
    { label: 'Encerramento',         value: data.horario_encerramento },
    { label: 'Duração Total',        value: data.duracao_total },
  ]);
  // Elaborado por (linha extra)
  y = ensureSpace(doc, y, 10);
  doc.setFillColor(255,255,255);
  doc.setDrawColor(...PDF.border);
  doc.rect(PDF.marginL, y, PDF.contentW, 10, 'FD');
  pdfField(doc, y + 3, 'Elaborado por (Coordenadora de Produção)', data.elaborado_por, 0, 1);
  y += 14;

  // 2. Conteúdo
  y = ensureSpace(doc, y, 25);
  y = pdfSectionTitle(doc, y, '2. Conteúdo Gravado');
  const cont = tryParse(data.conteudo_gravado);
  if (cont.length) {
    y = pdfTable(doc, y,
      ['Ep. / Seg.', 'Título / Descrição', 'Duração Gravada', 'Estado', 'Obs.'],
      cont.map(r => [r.ep, r.titulo, r.duracao, r.estado, r.obs]),
      [22, 60, 28, 24, 48]
    );
  } else { y = pdfEmptyRow(doc, y, 'Sem conteúdo registado.'); }

  // 3. Equipa Técnica
  y = ensureSpace(doc, y, 20);
  y = pdfSectionTitle(doc, y, '3. Equipa Técnica');
  const etec = tryParse(data.equipa_tecnica);
  if (etec.length) {
    y = pdfTable(doc, y,
      ['Nome', 'Função', 'Presente', 'Observações'],
      etec.map(r => [r.nome, r.funcao, r.presente, r.obs]),
      [55, 40, 22, 65]
    );
  } else { y = pdfEmptyRow(doc, y, 'Sem equipa técnica registada.'); }

  // 4. Equipa Artística
  y = ensureSpace(doc, y, 20);
  y = pdfSectionTitle(doc, y, '4. Equipa Artística / Elenco');
  const eart = tryParse(data.equipa_artistica);
  if (eart.length) {
    y = pdfTable(doc, y,
      ['Nome', 'Papel / Função', 'Presente', 'Observações'],
      eart.map(r => [r.nome, r.papel, r.presente, r.obs]),
      [55, 40, 22, 65]
    );
  } else { y = pdfEmptyRow(doc, y, 'Sem equipa artística registada.'); }

  // 5. Incidentes
  y = ensureSpace(doc, y, 20);
  y = pdfSectionTitle(doc, y, '5. Incidentes / Ocorrências');
  const incs = tryParse(data.incidentes);
  if (incs.length) {
    y = pdfTable(doc, y,
      ['Tipo', 'Descrição', 'Horário', 'Impacto', 'Medida Tomada'],
      incs.map(r => [r.tipo, r.descricao, r.horario, r.impacto, r.medida]),
      [28, 48, 16, 18, 72]
    );
  } else { y = pdfEmptyRow(doc, y, 'Sem incidentes registados.'); }

  // 6. Materiais
  y = ensureSpace(doc, y, 20);
  y = pdfSectionTitle(doc, y, '6. Materiais / Equipamentos Utilizados');
  const mats = tryParse(data.materiais_utilizados);
  if (mats.length) {
    y = pdfTable(doc, y,
      ['Item', 'Qtd.', 'Estado', 'Observações'],
      mats.map(r => [r.item, r.qtd, r.estado, r.obs]),
      [80, 16, 28, 58]
    );
  } else { y = pdfEmptyRow(doc, y, 'Sem materiais registados.'); }

  if (data.observacoes) {
    y = ensureSpace(doc, y, 20);
    y = pdfSectionTitle(doc, y, '7. Observações Finais');
    y = pdfTextBox(doc, y, 'Observações', data.observacoes);
  }

  y = ensureSpace(doc, y, 30);
  y = pdfSignature(doc, y, data.elaborado_por, 'Coordenadora de Produção', data.data_gravacao);

  pdfFooter(doc);
  const prog = (data.nome_programa || 'programa').replace(/\s+/g, '_');
  doc.save(`Relatorio_Gravacao_${prog}_${data.data_gravacao || 'sem_data'}.pdf`);
  showToast('PDF gerado com sucesso!', 'success');
}

// ═══════════════════════════════════════════════════════════════
//  GERADOR: RELATÓRIO SEMANAL
// ═══════════════════════════════════════════════════════════════
function generatePdfSemanal(data) {
  const doc = pdfNew();
  let y = pdfHeader(doc, 'Relatório Semanal de Produção', 'Direcção de Produção — Rede Girassol');

  y = pdfSectionTitle(doc, y, '1. Identificação');
  y = pdfIdBlock(doc, y, [
    { label: 'Semana de Referência', value: data.semana_referencia },
    { label: 'Nº da Semana',         value: data.numero_semana },
    { label: 'Data de Envio',        value: formatDate(data.data_envio) },
    { label: 'Elaborado por',        value: data.elaborado_por },
    { label: 'Cargo / Função',       value: data.cargo_funcao },
  ]);

  // 7. Indicadores (destaque visual)
  const ind = tryParse(data.indicadores, {});
  y = ensureSpace(doc, y, 30);
  y = pdfSectionTitle(doc, y, '7. Indicadores da Semana');
  y = pdfIndicadores(doc, y, [
    { label: 'Total de Gravações',    value: ind.total_gravacoes  || '0' },
    { label: 'Horas de Produção',     value: ind.horas_producao   || '—' },
    { label: 'Emissões Directas',     value: ind.directo          || '0' },
    { label: 'Pautas Cobertas',       value: ind.pautas_cobertas  || '0' },
    { label: 'Pautas Canceladas',     value: ind.pautas_canceladas|| '0' },
    { label: 'Incidentes',            value: ind.incidentes       || '0' },
  ]);

  // 2. Gravações
  y = ensureSpace(doc, y, 25);
  y = pdfSectionTitle(doc, y, '2. Gravações Realizadas na Semana');
  const gravs = tryParse(data.gravacoes_semana);
  if (gravs.length) {
    y = pdfTable(doc, y,
      ['Programa', 'Data', 'Duração Real', 'Episódios / Segmentos', 'Observações'],
      gravs.map(r => [r.programa, formatDate(r.data), r.duracao, r.episodios, r.obs]),
      [42, 22, 22, 48, 48]
    );
  } else { y = pdfEmptyRow(doc, y, 'Sem gravações registadas.'); }

  // 3. Emissões Directas
  y = ensureSpace(doc, y, 20);
  y = pdfSectionTitle(doc, y, '3. Programas Emitidos em Directo');
  const emits = tryParse(data.programas_emitidos);
  if (emits.length) {
    y = pdfTable(doc, y,
      ['Programa', 'Data', 'Horário', 'Duração', 'Confirmação', 'Obs.'],
      emits.map(r => [r.programa, formatDate(r.data), r.horario, r.duracao, r.confirmacao, r.obs]),
      [40, 22, 16, 18, 32, 54]
    );
  } else { y = pdfEmptyRow(doc, y, 'Sem emissões directas registadas.'); }

  // 4. Pendências
  y = ensureSpace(doc, y, 20);
  y = pdfSectionTitle(doc, y, '4. Pendências e Acompanhamentos');
  const pends = tryParse(data.pendencias);
  if (pends.length) {
    y = pdfTable(doc, y,
      ['Assunto / Programa', 'Responsável', 'Prazo', 'Status', 'Obs.'],
      pends.map(r => [r.assunto, r.responsavel, formatDate(r.prazo), r.status, r.obs]),
      [50, 38, 22, 22, 50]
    );
  } else { y = pdfEmptyRow(doc, y, 'Sem pendências registadas.'); }

  // 5. RH
  const rh = tryParse(data.recursos_humanos, {});
  y = ensureSpace(doc, y, 20);
  y = pdfSectionTitle(doc, y, '5. Recursos Humanos');
  y = pdfIdBlock(doc, y, [
    { label: 'Total de Colaboradores Activos', value: rh.total_activos || '—' },
    { label: 'Ausências / Faltas',             value: rh.ausencias    || '—' },
  ]);
  if (rh.obs) {
    y = pdfTextBox(doc, y, 'Observações sobre RH', rh.obs);
  }

  // 6. Equipamentos
  y = ensureSpace(doc, y, 20);
  y = pdfSectionTitle(doc, y, '6. Equipamentos e Infraestrutura');
  const equips = tryParse(data.equipamentos);
  if (equips.length) {
    y = pdfTable(doc, y,
      ['Equipamento', 'Estado', 'Problema / Avaria', 'Acção Necessária'],
      equips.map(r => [r.equipamento, r.estado, r.problema, r.accao]),
      [55, 26, 55, 46]
    );
  } else { y = pdfEmptyRow(doc, y, 'Sem equipamentos registados.'); }

  // 8. Observações
  if (data.observacoes_gerais) {
    y = ensureSpace(doc, y, 20);
    y = pdfSectionTitle(doc, y, '8. Observações Gerais e Recomendações');
    y = pdfTextBox(doc, y, 'Observações', data.observacoes_gerais);
  }

  y = ensureSpace(doc, y, 30);
  y = pdfSignature(doc, y, data.elaborado_por, data.cargo_funcao, data.data_envio);

  pdfFooter(doc);
  const semRef = (data.semana_referencia || 'sem_semana').replace(/[\/\s]/g, '_').slice(0, 20);
  doc.save(`Relatorio_Semanal_${semRef}.pdf`);
  showToast('PDF gerado com sucesso!', 'success');
}

// ── LINHA VAZIA ───────────────────────────────────────────────
function pdfEmptyRow(doc, y, msg) {
  doc.setFillColor(...PDF.light);
  doc.setDrawColor(...PDF.border);
  doc.rect(PDF.marginL, y, PDF.contentW, 8, 'FD');
  doc.setTextColor(...PDF.muted);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text(msg, PDF.marginL + PDF.contentW / 2, y + 5.5, { align: 'center' });
  return y + 10;
}

// ── BLOCO DE ASSINATURA ───────────────────────────────────────
function pdfSignature(doc, y, nome, cargo, data) {
  const boxW = 75;
  const boxH = 20;
  const x = PDF.pageW - PDF.marginR - boxW;

  doc.setDrawColor(...PDF.border);
  doc.setFillColor(255,255,255);
  doc.rect(x, y, boxW, boxH, 'FD');

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...PDF.muted);
  doc.text('Assinatura:', x + 3, y + 5);

  // Linha de assinatura
  doc.setDrawColor(150,150,150);
  doc.line(x + 3, y + 13, x + boxW - 3, y + 13);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PDF.text);
  doc.text(nome || '___________________', x + boxW / 2, y + 16.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...PDF.muted);
  if (cargo) doc.text(cargo, x + boxW / 2, y + 19, { align: 'center' });

  // Data
  doc.setFontSize(7);
  doc.setTextColor(...PDF.muted);
  doc.text(`Data: ${formatDate(data) || '___/___/______'}`, PDF.marginL, y + 13);

  return y + boxH + 4;
}

// ── DISPATCHER: gerar PDF a partir de dados e tipo ────────────
function exportToPdf(typeKey, data) {
  try {
    switch (typeKey) {
      case 'pauta':    generatePdfPauta(data);    break;
      case 'diarios':  generatePdfDiarios(data);  break;
      case 'gravados': generatePdfGravados(data); break;
      case 'semanal':  generatePdfSemanal(data);  break;
      default: showToast('Tipo de relatório desconhecido.', 'error');
    }
  } catch (e) {
    console.error(e);
    showToast('Erro ao gerar PDF. Verifique o console.', 'error');
  }
}

// ── PDF A PARTIR DO FORMULÁRIO ACTIVO ─────────────────────────
function exportCurrentFormToPdf(typeKey) {
  let data;
  switch (typeKey) {
    case 'pauta':    data = collectPauta();    break;
    case 'diarios':  data = collectDiarios();  break;
    case 'gravados': data = collectGravados(); break;
    case 'semanal':  data = collectSemanal();  break;
  }
  if (!data) return showToast('Não foi possível recolher os dados.', 'error');
  exportToPdf(typeKey, data);
}
