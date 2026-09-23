// AGENDAMENTOS - parte 3/4: relatorio geral de agendamentos (PDF), calendario e modal de tratativa
function exportarRelatorioAgendamentos() {
  const btn = document.getElementById('ag-report-btn');
  const textoOriginal = btn ? btn.textContent : '';
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Gerando relatorio...';
  }

  setTimeout(() => {
    try {
      const dados = agColetarDadosRelatorio();
      if (!dados.lista.length) {
        showToast('PDF', 'Nao ha agendamentos visiveis com os filtros atuais para gerar o relatorio.');
        return;
      }
      if (!window.jspdf || !window.jspdf.jsPDF) throw new Error('Biblioteca PDF indisponivel.');
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      if (typeof doc.autoTable !== 'function') throw new Error('Plugin de tabelas do PDF indisponivel.');

      const W = doc.internal.pageSize.getWidth();
      const H = doc.internal.pageSize.getHeight();
      const filtrosLinha = dados.filtrosResumo.join(' | ');
      const resumoCorretor = agResumoPorCorretor(dados.lista);
      const resumoEquipe = agResumoPorEquipe(dados.lista);

      doc.setFillColor(184, 144, 42);
      doc.rect(0, 0, W, 24, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(255, 255, 255);
      doc.text('ZELONY IMOVEIS', 12, 10);
      doc.setFontSize(11);
      doc.text('RELATORIO DE AGENDAMENTOS', 12, 17);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`Gerado em ${hoje()} | ${dados.total} registro(s)`, W - 12, 16, { align: 'right' });

      doc.setFillColor(253, 248, 238);
      doc.roundedRect(10, 29, W - 20, 22, 3, 3, 'F');
      doc.setDrawColor(220, 185, 100);
      doc.roundedRect(10, 29, W - 20, 22, 3, 3);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(120, 92, 46);
      doc.text('Escopo visivel', 14, 35);
      doc.text('Filtros aplicados', 14, 43);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.4);
      doc.setTextColor(70, 56, 32);
      doc.text(doc.splitTextToSize(agResumoPermissao(), W - 44), 42, 35);
      doc.text(doc.splitTextToSize(filtrosLinha, W - 44), 42, 43);

      const kpis = [
        ['Total', String(dados.total)],
        ['Ativos', String(dados.ativos)],
        ['Concluidos', String(dados.concluidos)],
        ['Reagendados', String(dados.reagendados)],
        ['Cancelados', String(dados.cancelados)],
        ['1o atendimento', String(dados.primeiros)],
        ['Docs online', String(dados.documentacaoOnline)],
        ['Fechamentos', String(dados.fechamentos)],
        ['Prox. 7 dias', String(dados.proximos7Dias)]
      ];
      const kpiY = 56;
      const kpiW = (W - 20) / kpis.length;
      kpis.forEach(([label, value], index) => {
        const x = 10 + (index * kpiW);
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(x, kpiY, kpiW - 2, 19, 2.5, 2.5, 'F');
        doc.setDrawColor(220, 185, 100);
        doc.roundedRect(x, kpiY, kpiW - 2, 19, 2.5, 2.5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.4);
        doc.setTextColor(135, 108, 58);
        doc.text(label.toUpperCase(), x + ((kpiW - 2) / 2), kpiY + 6, { align: 'center' });
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(184, 144, 42);
        doc.text(value, x + ((kpiW - 2) / 2), kpiY + 14, { align: 'center' });
      });

      let tabelaResumoY = 81;
      const tabelaResumoW = W - 20;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(120, 92, 46);
      doc.text('Resumo por corretor', 10, tabelaResumoY - 3);
      let resumoCorretorFinalY = agDesenharTabelaResumoTipo(doc, {
        titulo: 'Corretor',
        lista: resumoCorretor,
        startY: tabelaResumoY,
        tableWidth: tabelaResumoW,
        left: 10,
        nomeWidth: 60,
        numeroWidth: 17
      });

      tabelaResumoY = resumoCorretorFinalY + 11;
      if (tabelaResumoY > H - 58) {
        doc.addPage();
        tabelaResumoY = 24;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(120, 92, 46);
      doc.text('Resumo por equipe', 10, tabelaResumoY - 3);
      let resumoEquipeFinalY = agDesenharTabelaResumoTipo(doc, {
        titulo: 'Equipe',
        lista: resumoEquipe,
        startY: tabelaResumoY,
        tableWidth: tabelaResumoW,
        left: 10,
        nomeWidth: 60,
        numeroWidth: 17
      });

      let infoY = resumoEquipeFinalY + 6;
      if (infoY > H - 22) {
        doc.addPage();
        infoY = 18;
      }
      doc.setFillColor(253, 248, 238);
      doc.roundedRect(10, infoY, W - 20, 15, 2.5, 2.5, 'F');
      doc.setDrawColor(220, 185, 100);
      doc.roundedRect(10, infoY, W - 20, 15, 2.5, 2.5);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.4);
      doc.setTextColor(120, 92, 46);
      doc.text('Leitura rapida do periodo', 14, infoY + 5.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.1);
      doc.setTextColor(70, 56, 32);
      const linhaInfo = `Ativos = agendados com data/hora futura. Concluidos = visita concluida ou documentacao recebida. Cancelados = cliente cancelou. Pendentes de tratativa: ${dados.tratativasPendentes}. Pendentes de sincronizacao: ${dados.pendentesSync}.`;
      doc.text(doc.splitTextToSize(linhaInfo, W - 28), 14, infoY + 10.8);

      doc.addPage();
      doc.setFillColor(184, 144, 42);
      doc.rect(0, 0, W, 16, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(255, 255, 255);
      doc.text('Detalhamento completo dos agendamentos', 12, 10);

      doc.autoTable({
        startY: 22,
        tableWidth: W - 14,
        margin: { left: 7, right: 7 },
        head: [[
          '#',
          'Preench.',
          'Data',
          'Hora',
          'Tipo',
          'Canal',
          'Situacao',
          'Unidade',
          'Equipe',
          'Corretor',
          'Cliente',
          'Telefone',
          'Lancado',
          'Tratativa',
          'Reag.'
        ]],
        body: dados.lista.map(item => [
          item.id || '',
          agFormatarDataRelatorio(item.preenchidoEm),
          agFormatarDataRelatorio(item.dataAgendamento),
          agTexto(item.horarioAgendamento || '—'),
          agTexto(agTipoVisitaValor(item && item.tipoVisita)),
          agTexto(agCanalAgendamentoValor(item && item.canalAgendamento, item && item.tipoVisita)),
          agTexto(agSituacaoExibicao(item)),
          agTexto(item.unidade || '—'),
          agTexto(agEquipeValor(item)),
          agTexto(item.corretor || '—'),
          agTexto(item.cliente || '—'),
          agTexto(agFormatarTelefone(item.telefone || '') || item.telefone || '—'),
          agTexto(item.criadoPor || 'Sistema'),
          agTexto(agResumoTratativaRelatorio(item)),
          agTexto(agResumoReagendamentoRelatorio(item))
        ]),
        theme: 'plain',
        headStyles: { fillColor: [253, 248, 238], textColor: [184, 144, 42], fontSize: 6.2, fontStyle: 'bold', halign: 'center' },
        bodyStyles: { fontSize: 5.9, textColor: [60, 48, 30], valign: 'top' },
        alternateRowStyles: { fillColor: [250, 245, 236] },
        styles: { cellPadding: 1.3, overflow: 'linebreak', lineColor: [232, 220, 192], lineWidth: 0.12 },
        columnStyles: {
          0: { cellWidth: 7 },
          1: { cellWidth: 12 },
          2: { cellWidth: 12 },
          3: { cellWidth: 9 },
          4: { cellWidth: 20 },
          5: { cellWidth: 18 },
          6: { cellWidth: 18 },
          7: { cellWidth: 12 },
          8: { cellWidth: 15 },
          9: { cellWidth: 22 },
          10: { cellWidth: 24 },
          11: { cellWidth: 17 },
          12: { cellWidth: 18 },
          13: { cellWidth: 30 },
          14: { cellWidth: 20 }
        },
        didDrawPage: data => {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(5.5);
          doc.setTextColor(140, 110, 60);
          doc.text(`Relatorio de agendamentos | ${hoje()} | Pag. ${data.pageNumber}`, W / 2, H - 4, { align: 'center' });
        }
      });

      doc.save(`agendamentos-relatorio-${agHojeIso()}.pdf`);
      showToast('OK', 'Relatorio de agendamentos gerado com sucesso.');
    } catch (erro) {
      console.error('Erro ao gerar relatorio de agendamentos:', erro);
      showToast('ERRO', 'Nao foi possivel gerar o relatorio dos agendamentos.');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = textoOriginal || 'Relatorio PDF';
      }
    }
  }, 80);
}

function agGarantirDataSelecionada() {
  const fallback = agDataNoMes(agHojeIso(), agMesRef)
    ? agHojeIso()
    : agIsoFromDate(new Date(agMesRef.getFullYear(), agMesRef.getMonth(), 1, 12, 0, 0, 0));
  if (!agDataValidaIso(agDataSelecionada) || !agDataNoMes(agDataSelecionada, agMesRef)) {
    agDataSelecionada = fallback;
    zSetState('state.ui.agDataSelecionada', agDataSelecionada);
  }
}

function agContarProximosDias(lista, dias) {
  const agora = new Date();
  if (Number.isNaN(agora.getTime())) return 0;
  const limite = new Date(agora.getTime());
  limite.setDate(limite.getDate() + dias);
  return lista.filter(item => {
    const ref = agDataHoraRef(item.dataAgendamento, item.horarioAgendamento || '00:00');
    return ref && ref.getTime() >= agora.getTime() && ref < limite;
  }).length;
}

function alternarListaProximosAgendamentos() {
  agMostrarTodosProximos = !agMostrarTodosProximos;
  zSetState('state.ui.agMostrarTodosProximos', agMostrarTodosProximos);
  renderAgendamentos();
}

function agRenderCalendario(listaMes) {
  const eventosPorDia = {};
  agOrdenarLista(listaMes).forEach(item => {
    const chave = item.dataAgendamento;
    if (!eventosPorDia[chave]) eventosPorDia[chave] = [];
    eventosPorDia[chave].push(item);
  });

  const primeiroDia = new Date(agMesRef.getFullYear(), agMesRef.getMonth(), 1, 12, 0, 0, 0);
  const ultimoDia = new Date(agMesRef.getFullYear(), agMesRef.getMonth() + 1, 0, 12, 0, 0, 0);
  const offset = primeiroDia.getDay();
  const totalCelulas = Math.ceil((offset + ultimoDia.getDate()) / 7) * 7;
  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

  const cabecalho = diasSemana.map(dia => `<div class="ag-weekday">${agTexto(dia)}</div>`).join('');
  const hojeIso = agHojeIso();
  let corpo = '';

  for (let indice = 0; indice < totalCelulas; indice++) {
    const ref = new Date(agMesRef.getFullYear(), agMesRef.getMonth(), indice - offset + 1, 12, 0, 0, 0);
    const iso = agIsoFromDate(ref);
    const dentroDoMes = ref.getMonth() === agMesRef.getMonth();
    const eventos = dentroDoMes ? (eventosPorDia[iso] || []) : [];
    const classes = ['ag-day'];
    if (!dentroDoMes) classes.push('outside');
    if (dentroDoMes && iso === hojeIso) classes.push('today');
    if (dentroDoMes && iso === agDataSelecionada) classes.push('selected');

    const topo = `<div class="ag-day-top"><span class="ag-day-number">${ref.getDate()}</span>${eventos.length ? `<span class="ag-day-pill">${eventos.length}</span>` : ''}</div>`;
    const previews = eventos.slice(0, 2).map(item =>
      `<div class="ag-day-event"><strong>${agTexto(item.horarioAgendamento || '—')}</strong>${agTexto(item.cliente)}</div>`
    ).join('');
    const mais = eventos.length > 2
      ? `<div class="ag-day-more">+${eventos.length - 2} compromisso${eventos.length - 2 !== 1 ? 's' : ''} • clique no dia para ver todos</div>`
      : '';
    const rotuloDia = eventos.length
      ? `Ver agenda completa de ${agFormatoDataCurta(iso)} com ${eventos.length} compromisso${eventos.length !== 1 ? 's' : ''}`
      : `Selecionar ${agFormatoDataCurta(iso)}`;

    if (dentroDoMes) {
      corpo += `<button type="button" class="${classes.join(' ')}" title="${agAttr(rotuloDia)}" aria-label="${agAttr(rotuloDia)}" onclick="selecionarAgendamentoData('${iso}')">${topo}<div class="ag-day-list">${previews}${mais}</div></button>`;
    } else {
      corpo += `<div class="${classes.join(' ')}">${topo}</div>`;
    }
  }

  return `<div class="ag-calendar-scroll"><div class="ag-calendar-shell"><div class="ag-weekdays">${cabecalho}</div><div class="ag-grid">${corpo}</div></div></div>`;
}

// Ícones inline (substituem os emojis antigos, que renderizavam de forma
// inconsistente/quebrada em alguns aparelhos — ex.: o ícone de corretor).
const AG_ICON_PIN = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s7-7.58 7-12A7 7 0 0 0 5 10c0 4.42 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>';
const AG_ICON_TEAM = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>';
const AG_ICON_PERSON = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
const AG_ICON_PHONE = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>';
const AG_ICON_COPY = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
const AG_ICON_CLOCK = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#171512" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';

function agRenderItem(item, opcoes = {}) {
  const mostrarData = !!opcoes.mostrarData;
  const telefoneExibicao = agFormatarTelefone(item.telefone || '') || agTexto(item.telefone || 'Telefone nÃ£o informado');
  const telefoneEncoded = encodeURIComponent(String(telefoneExibicao || ''));
  const tipoClass = agTipoBadgeClasse(item);
  const situacaoClasse = agSituacaoClasse(agSituacao(item));
  const itemId = parseInt(item && item.id, 10) || 0;
  const podeTratar = !!itemId && agPodeTratarManual(item);
  const dataRef = agDataHoraRef(item.dataAgendamento, item.horarioAgendamento || '12:00');
  const dataLabel = dataRef
    ? dataRef.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')
    : '';
  const pendente = agTratativaPendente(item);
  return `<div class="ag-item ${podeTratar ? 'clickable' : ''} ${pendente ? 'pending' : ''}" ${podeTratar ? `role="button" tabindex="0" onclick="abrirTratativaAgendamentoManual(${itemId})" onkeydown="handleAgendamentoCardKeydown(event,${itemId})"` : ''}>
    ${pendente ? `<div class="ag-pending-ribbon">${AG_ICON_CLOCK}Aguardando retorno</div>` : ''}
    <div class="ag-item-head">
      <div class="ag-item-head-time">
        <span class="ag-time-dot ${tipoClass}"></span>
        <span class="ag-item-hour">${agTexto(item.horarioAgendamento || '—')}</span>
        ${mostrarData ? `<span class="ag-item-date-inline">· ${agTexto(dataLabel || '—')}</span>` : ''}
      </div>
      <span class="ag-badge status ${situacaoClasse}">${agSituacaoExibicao(item)}</span>
    </div>
    <div class="ag-client">${agTexto(item.cliente || 'Cliente não informado')}</div>
    <div class="ag-type-row">
      <span class="ag-type-label ${tipoClass}">${agTipoBadgeRotulo(item)}</span>
      <span class="ag-channel-label">${agCanalBadgeRotulo(item)}</span>
    </div>
    <div class="ag-meta-icons">
      <span class="ag-meta-item">${AG_ICON_PIN}${agTexto(item.unidade || '—')}</span>
      <span class="ag-meta-item">${AG_ICON_TEAM}${agTexto(agEquipeValor(item))}</span>
      <span class="ag-meta-item">${AG_ICON_PERSON}${agTexto(item.corretor || '—')}</span>
    </div>
    <div class="ag-phone-row">
      ${AG_ICON_PHONE}
      <span class="ag-phone-text">${agTexto(item.telefone || 'Telefone não informado')}</span>
      ${item.telefone ? `<button class="ag-copy-icon-btn" type="button" aria-label="Copiar telefone" onclick="event.stopPropagation();copiarTexto(decodeURIComponent('${telefoneEncoded}'),'Telefone do cliente')">${AG_ICON_COPY}</button>` : ''}
    </div>
    ${podeTratar ? `<div class="ag-item-hint">${agHintTratativa(item)}</div>` : ''}
  </div>`;
}

function agPendenciasTratativa() {
  return agOrdenarLista((Array.isArray(AGENDAMENTOS) ? AGENDAMENTOS : []).filter(agTratativaPendente));
}

function agTratativaAtual() {
  return (Array.isArray(AGENDAMENTOS) ? AGENDAMENTOS : []).find(item => item.id === agTratativaAtualId) || null;
}

function temTratativaAgendamentoAberta() {
  const modal = document.getElementById('m-agendamento-tratativa');
  return !!(modal && modal.classList.contains('show'));
}

function temTratativaAgendamentoObrigatoriaAberta() {
  return temTratativaAgendamentoAberta() && agTratativaModo === 'obrigatoria';
}

function agAtualizarFilaTratativa() {
  agTratativaFila = agPendenciasTratativa().map(item => item.id);
  zSetState('state.ui.agTratativaFila', agTratativaFila);
  return agTratativaFila;
}

function renderTratativaAgendamentoModal() {
  const corpo = document.getElementById('mat-body');
  const atual = agTratativaAtual();
  if (!corpo || !atual) return;

  const modoObrigatorio = agTratativaModo === 'obrigatoria';
  const botaoFechar = document.getElementById('mat-cancel-btn');
  const botaoSalvar = document.getElementById('mat-save-btn');
  const rotuloConclusao = agRotuloConclusao(atual);
  const descricaoConclusao = agDescricaoConclusao(atual);
  const canalAgendamento = agCanalAgendamentoValor(atual && atual.canalAgendamento, atual && atual.tipoVisita);
  const documentacaoRecebidaSelecionada = agTipoDocumentacao(atual) && agTratativaSelecao === AG_SITUACAO_CONCLUIDA;
  const fechamentoConcluidoSelecionado = agTipoFechamento(atual) && agTratativaSelecao === AG_SITUACAO_CONCLUIDA;
  const rendaBrutaFamiliar = agFormatarRendaBrutaFamiliar(atual && atual.rendaBrutaFamiliar);
  const localCompra = agTexto(atual && atual.localCompra);
  const tipoImovelInteresse = agTexto(atual && atual.tipoImovelInteresse);
  const finalidadeImovel = agTexto(atual && atual.finalidadeImovel);
  const assinouPropostaCompra = agRespostaSimNaoValor(atual && atual.assinouPropostaCompra);
  const pagouAto = agRespostaSimNaoValor(atual && atual.pagouAto);

  const idxAtual = Math.max(agTratativaFila.indexOf(atual.id), 0);
  const totalFila = agTratativaFila.length || 1;
  const infoAgendamento = `${agTexto(atual.cliente)} • ${agTexto(atual.dataAgendamento)} às ${agTexto(atual.horarioAgendamento)}`;
  const tituloFila = totalFila > 1 ? `Pendência ${idxAtual + 1} de ${totalFila}` : 'Pendência de tratativa';

  document.getElementById('mat-title').textContent = zUiText(modoObrigatorio ? 'Tratativa obrigatoria do compromisso' : 'Atualizar compromisso');
  document.getElementById('mat-sub').textContent = zUiText(modoObrigatorio ? `${tituloFila} • ${infoAgendamento}` : `Escolha como este compromisso deve ficar registrado. • ${infoAgendamento}`);
  if (botaoFechar) botaoFechar.style.display = modoObrigatorio ? 'none' : 'inline-flex';
  if (botaoSalvar) botaoSalvar.textContent = zUiText(modoObrigatorio ? 'Confirmar tratativa' : 'Salvar atualização');

  corpo.innerHTML = `
    <div class="agt-alert">
      ${modoObrigatorio
        ? 'Este compromisso passou do horario ha mais de 30 minutos. Para seguir usando o sistema, registre a tratativa agora.'
        : 'Se o cliente ja foi atendido, enviou a documentacao, cancelou ou precisou remarcar, registre aqui sem precisar esperar o horario vencer.'}
    </div>

    <div class="agt-info-grid">
      <div class="agt-info-card">
        <span>Cliente</span>
        <strong>${agTexto(atual.cliente)}</strong>
        <small>${agTexto(atual.telefone || 'Telefone não informado')}</small>
      </div>
      <div class="agt-info-card">
        <span>Compromisso</span>
        <strong>${agTexto(atual.dataAgendamento)}</strong>
        <small>${agTexto(atual.horarioAgendamento)} • ${agTexto(agTipoVisitaValor(atual && atual.tipoVisita))} • ${agTexto(canalAgendamento)}</small>
      </div>
      <div class="agt-info-card">
        <span>Equipe</span>
        <strong>${agTexto(agEquipeValor(atual))}</strong>
        <small>${agTexto(atual.unidade)} • ${agTexto(atual.corretor)}</small>
      </div>
      <div class="agt-info-card">
        <span>${modoObrigatorio ? 'Prazo da tratativa' : 'Status atual'}</span>
        <strong>${agTexto(modoObrigatorio ? agFormatarPrazoTratativa(atual) : agSituacaoExibicao(atual))}</strong>
        <small>Lançado por ${agTexto(atual.criadoPor || 'Sistema')}</small>
      </div>
    </div>

    <div class="agt-section">
      <div class="agt-label">Escolha a tratativa</div>
      <div class="agt-options">
        <button type="button" class="agt-option ${agTratativaSelecao === AG_SITUACAO_CONCLUIDA ? 'active' : ''}" onclick="selecionarTratativaAgendamento('${agAttr(AG_SITUACAO_CONCLUIDA)}')">
          <strong>${rotuloConclusao}</strong>
          <span>${descricaoConclusao}</span>
        </button>
        <button type="button" class="agt-option ${agTratativaSelecao === AG_SITUACAO_REAGENDADO ? 'active' : ''}" onclick="selecionarTratativaAgendamento('${agAttr(AG_SITUACAO_REAGENDADO)}')">
          <strong>Reagendamento</strong>
          <span>Cria automaticamente um novo compromisso com nova data e horario.</span>
        </button>
        <button type="button" class="agt-option ${agTratativaSelecao === AG_SITUACAO_CANCELADO ? 'active' : ''}" onclick="selecionarTratativaAgendamento('${agAttr(AG_SITUACAO_CANCELADO)}')">
          <strong>Cliente cancelou</strong>
          <span>Fecha este compromisso como cancelado pelo cliente.</span>
        </button>
      </div>
    </div>

    ${agTipoDocumentacao(atual) ? `
      <div id="agt-documentacao-box" class="agt-documentacao-box ${documentacaoRecebidaSelecionada ? 'show' : ''}" aria-live="polite">
        <div class="agt-label">Informações obrigatórias do cliente</div>
        <div class="agt-documentacao-intro">Preencha todos os campos abaixo para confirmar o recebimento da documentação.</div>
        <div class="agt-documentacao-grid">
          <div class="f-field">
            <label for="agt-renda-bruta-familiar">Qual é a renda bruta familiar? *</label>
            <div class="agt-money-input">
              <span>R$</span>
              <input type="text" id="agt-renda-bruta-familiar" value="${agAttr(rendaBrutaFamiliar)}" placeholder="Ex.: 8.500,00" inputmode="decimal" maxlength="18" oninput="zMascararValorMonetario(this)" onblur="formatarRendaBrutaFamiliarAgendamento(this)" required>
            </div>
          </div>
          <div class="f-field">
            <label for="agt-local-compra">Quer comprar em Curitiba ou Região Metropolitana? *</label>
            <select id="agt-local-compra" required>
              <option value="">Selecione...</option>
              ${AG_LOCAIS_COMPRA.map(opcao => `<option value="${agAttr(opcao)}" ${localCompra === opcao ? 'selected' : ''}>${agTexto(opcao)}</option>`).join('')}
            </select>
          </div>
          <div class="f-field">
            <label for="agt-tipo-imovel">Quer comprar casa ou apartamento? *</label>
            <select id="agt-tipo-imovel" required>
              <option value="">Selecione...</option>
              ${AG_TIPOS_IMOVEL_INTERESSE.map(opcao => `<option value="${agAttr(opcao)}" ${tipoImovelInteresse === opcao ? 'selected' : ''}>${agTexto(opcao)}</option>`).join('')}
            </select>
          </div>
          <div class="f-field">
            <label for="agt-finalidade-imovel">Moradia ou investimento? *</label>
            <select id="agt-finalidade-imovel" required>
              <option value="">Selecione...</option>
              ${AG_FINALIDADES_IMOVEL.map(opcao => `<option value="${agAttr(opcao)}" ${finalidadeImovel === opcao ? 'selected' : ''}>${agTexto(opcao)}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>
    ` : ''}

    ${agTipoFechamento(atual) ? `
      <div id="agt-fechamento-box" class="agt-documentacao-box ${fechamentoConcluidoSelecionado ? 'show' : ''}" aria-live="polite">
        <div class="agt-label">Informações obrigatórias do fechamento</div>
        <div class="agt-documentacao-intro">Preencha todos os campos abaixo para confirmar o fechamento concluído.</div>
        <div class="agt-documentacao-grid">
          <div class="f-field">
            <label for="agt-renda-bruta-familiar">Qual é a renda bruta? *</label>
            <div class="agt-money-input">
              <span>R$</span>
              <input type="text" id="agt-renda-bruta-familiar" value="${agAttr(rendaBrutaFamiliar)}" placeholder="Ex.: 8.500,00" inputmode="decimal" maxlength="18" oninput="zMascararValorMonetario(this)" onblur="formatarRendaBrutaFamiliarAgendamento(this)" required>
            </div>
          </div>
          <div class="f-field">
            <label for="agt-tipo-imovel">Seu cliente estava buscando casa ou apartamento? *</label>
            <select id="agt-tipo-imovel" required>
              <option value="">Selecione...</option>
              ${AG_TIPOS_IMOVEL_INTERESSE.map(opcao => `<option value="${agAttr(opcao)}" ${tipoImovelInteresse === opcao ? 'selected' : ''}>${agTexto(opcao)}</option>`).join('')}
            </select>
          </div>
          <div class="f-field">
            <label for="agt-finalidade-imovel">Era para moradia ou investimento? *</label>
            <select id="agt-finalidade-imovel" required>
              <option value="">Selecione...</option>
              ${AG_FINALIDADES_IMOVEL.map(opcao => `<option value="${agAttr(opcao)}" ${finalidadeImovel === opcao ? 'selected' : ''}>${agTexto(opcao)}</option>`).join('')}
            </select>
          </div>
          <div class="f-field">
            <label for="agt-assinou-proposta">Cliente assinou proposta de compra? *</label>
            <select id="agt-assinou-proposta" required>
              <option value="">Selecione...</option>
              <option value="sim" ${assinouPropostaCompra === 'sim' ? 'selected' : ''}>Sim</option>
              <option value="nao" ${assinouPropostaCompra === 'nao' ? 'selected' : ''}>Não</option>
            </select>
          </div>
          <div class="f-field">
            <label for="agt-pagou-ato">Pagou o ato? *</label>
            <select id="agt-pagou-ato" required>
              <option value="">Selecione...</option>
              <option value="sim" ${pagouAto === 'sim' ? 'selected' : ''}>Sim</option>
              <option value="nao" ${pagouAto === 'nao' ? 'selected' : ''}>Não</option>
            </select>
          </div>
        </div>
      </div>
    ` : ''}

    <div id="agt-reagendar-box" class="agt-reagendar-box ${agTratativaSelecao === AG_SITUACAO_REAGENDADO ? 'show' : ''}">
      <div class="agt-label">Novo horário do compromisso</div>
      <div class="f-row">
        <div class="f-field">
          <label>Nova data *</label>
          <input type="date" id="agt-nova-data" value="${agAttr(atual.reagendadoParaData || '')}">
        </div>
        <div class="f-field">
          <label>Novo horário *</label>
          <input type="time" id="agt-novo-horario" value="${agAttr(atual.reagendadoParaHorario || '')}">
        </div>
      </div>
      <div class="agt-help">Ao confirmar, este compromisso atual fica marcado como reagendado e um novo compromisso sera criado automaticamente.</div>
    </div>
  `;
}

function abrirTratativaAgendamentoModal(item, opcoes = {}) {
  if (!item) return;
  if (opcoes.modo === 'obrigatoria' && agMutacaoBloqueada()) {
    agAvisarTratativaBloqueada();
    return;
  }
  agAtualizarFilaTratativa();
  agTratativaModo = opcoes.modo === 'obrigatoria' ? 'obrigatoria' : 'manual';
  agTratativaAtualId = item.id;
  agTratativaSelecao = '';
  zSetState('state.ui.agTratativaModo', agTratativaModo);
  zSetState('state.ui.agTratativaAtualId', agTratativaAtualId);
  zSetState('state.ui.agTratativaSelecao', agTratativaSelecao);
  renderTratativaAgendamentoModal();
  const modal = document.getElementById('m-agendamento-tratativa');
  if (modal) modal.classList.add('show');
}

function abrirTratativaAgendamentoManual(id) {
  const item = (Array.isArray(AGENDAMENTOS) ? AGENDAMENTOS : []).find(agendamento => agendamento.id === id);
  if (!item) return;
  if (agMutacaoBloqueada()) {
    const info = agStatusSyncInfo();
    showToast('⚠️', info.tabelaAusente
      ? 'Tratativas bloqueadas até aplicar a tabela de agendamentos no Supabase.'
      : 'Tratativas temporariamente bloqueadas enquanto a sincronização compartilhada estiver indisponível.');
    return;
  }
  if (agPendenciasTratativa().length) {
    verificarPendenciasAgendamento({ forcar: true });
    return;
  }
  if (temTratativaAgendamentoObrigatoriaAberta()) {
    showToast('⚠️', 'Finalize primeiro a tratativa obrigatória que está pendente.');
    return;
  }
  if (!agPodeTratarManual(item)) {
    const situacao = agSituacaoExibicao(item);
    showToast('⚠️', situacao === 'Agendado'
      ? 'Voce nao tem permissao para alterar este compromisso.'
      : `Esse compromisso ja esta marcado como ${situacao.toLowerCase()}.`);
    return;
  }
  abrirTratativaAgendamentoModal(item, { modo: 'manual' });
}

function handleAgendamentoCardKeydown(event, id) {
  if (!event || !['Enter', ' '].includes(event.key)) return;
  event.preventDefault();
  abrirTratativaAgendamentoManual(id);
}

function selecionarTratativaAgendamento(valor) {
  agTratativaSelecao = valor;
  zSetState('state.ui.agTratativaSelecao', agTratativaSelecao);
  renderTratativaAgendamentoModal();
}

function fecharTratativaAgendamentoModal(forcado = false) {
  const modal = document.getElementById('m-agendamento-tratativa');
  if (!modal) return;
  if (!forcado && temTratativaAgendamentoObrigatoriaAberta()) return;
  if (modal) modal.classList.remove('show');
  agTratativaAtualId = 0;
  agTratativaSelecao = '';
  agTratativaModo = '';
  zSetState('state.ui.agTratativaAtualId', agTratativaAtualId);
  zSetState('state.ui.agTratativaSelecao', agTratativaSelecao);
  zSetState('state.ui.agTratativaModo', agTratativaModo);
}

function handleBackdropAgendamentoTratativa(event) {
  if (event.target === document.getElementById('m-agendamento-tratativa')) {
    if (temTratativaAgendamentoObrigatoriaAberta()) {
      showToast('⚠️', 'Esse agendamento precisa de tratativa antes de continuar.');
      return;
    }
    fecharTratativaAgendamentoModal();
  }
}

function verificarPendenciasAgendamento(opcoes = {}) {
  if (!usuarioLogado) return;
  const telaLogin = document.getElementById('login-screen');
  if (telaLogin && !telaLogin.classList.contains('hidden')) return;

  const fila = agAtualizarFilaTratativa();
  if (!fila.length) {
    if (agTratativaModo === 'manual' && temTratativaAgendamentoAberta() && !opcoes.forcar) return;
    agTratativaAtualId = 0;
    agTratativaSelecao = '';
    agTratativaModo = '';
    zSetState('state.ui.agTratativaAtualId', agTratativaAtualId);
    zSetState('state.ui.agTratativaSelecao', agTratativaSelecao);
    zSetState('state.ui.agTratativaModo', agTratativaModo);
    fecharTratativaAgendamentoModal(true);
    return;
  }

  if (agMutacaoBloqueada()) {
    agTratativaAtualId = 0;
    agTratativaSelecao = '';
    agTratativaModo = '';
    zSetState('state.ui.agTratativaAtualId', agTratativaAtualId);
    zSetState('state.ui.agTratativaSelecao', agTratativaSelecao);
    zSetState('state.ui.agTratativaModo', agTratativaModo);
    fecharTratativaAgendamentoModal(true);
    agAvisarTratativaBloqueada();
    return;
  }

  if (temTratativaAgendamentoObrigatoriaAberta() && !opcoes.forcar) return;
  const atual = (Array.isArray(AGENDAMENTOS) ? AGENDAMENTOS : []).find(item => item.id === fila[0]);
  if (!atual || !agPodeReceberTratativaObrigatoria(atual)) {
    fecharTratativaAgendamentoModal(true);
    return;
  }
  if (atual) abrirTratativaAgendamentoModal(atual, { modo: 'obrigatoria' });
}

function iniciarMonitorTratativaAgendamento() {
  encerrarMonitorTratativaAgendamento();
  agMonitorarAgendaCompartilhada({
    forcar: true,
    renderizar: agModuloVisivel(),
    verificarPendencias: true,
    forcarPendencias: true
  });
  agPendenciaTimer = window.setInterval(() => {
    agMonitorarAgendaCompartilhada({
      renderizar: agModuloVisivel(),
      verificarPendencias: true
    });
  }, AG_REFRESH_INTERVAL_MS);
  if (!agPendenciaEventosRegistrados) {
    window.addEventListener('focus', () => {
      agMonitorarAgendaCompartilhada({
        renderizar: agModuloVisivel(),
        verificarPendencias: true
      });
    });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        agMonitorarAgendaCompartilhada({
          renderizar: agModuloVisivel(),
          verificarPendencias: true
        });
      }
    });
    agPendenciaEventosRegistrados = true;
  }
}

function encerrarMonitorTratativaAgendamento() {
  if (agPendenciaTimer) {
    window.clearInterval(agPendenciaTimer);
    agPendenciaTimer = null;
  }
  agUltimoAvisoTratativaBloqueadaEm = 0;
  agTratativaFila = [];
  agTratativaAtualId = 0;
  agTratativaSelecao = '';
  agTratativaModo = '';
  zSetState('state.ui.agTratativaFila', agTratativaFila);
  zSetState('state.ui.agTratativaAtualId', agTratativaAtualId);
  zSetState('state.ui.agTratativaSelecao', agTratativaSelecao);
  zSetState('state.ui.agTratativaModo', agTratativaModo);
  fecharTratativaAgendamentoModal(true);
}

async function confirmarTratativaAgendamento() {
  const atual = agTratativaAtual();
  if (!atual) {
    fecharTratativaAgendamentoModal(true);
    return;
  }
  if (agMutacaoBloqueada()) {
    const info = agStatusSyncInfo();
    showToast('⚠️', info.tabelaAusente
      ? 'Tratativas bloqueadas até aplicar a tabela de agendamentos no Supabase.'
      : 'Tratativas temporariamente bloqueadas enquanto a sincronização compartilhada estiver indisponível.');
    return;
  }
  if (!AG_SITUACOES.includes(agTratativaSelecao) || agTratativaSelecao === AG_SITUACAO_AGENDADO) {
    showToast('⚠️', 'Escolha a tratativa deste compromisso.');
    return;
  }

  const agoraIso = new Date().toISOString();
  const usuarioAtual = usuarioLogado || {};
  const btn = document.getElementById('mat-save-btn');
  const modoTratativa = agTratativaModo || 'manual';
  const novosAgendamentos = [];
  let qualificacaoDocumentacao = null;
  let qualificacaoFechamento = null;

  if (agTipoDocumentacao(atual) && agTratativaSelecao === AG_SITUACAO_CONCLUIDA) {
    const rendaInput = document.getElementById('agt-renda-bruta-familiar');
    const localInput = document.getElementById('agt-local-compra');
    const tipoImovelInput = document.getElementById('agt-tipo-imovel');
    const finalidadeInput = document.getElementById('agt-finalidade-imovel');
    const rendaBrutaFamiliar = agRendaBrutaFamiliarNumero(rendaInput && rendaInput.value);
    const localCompra = agTexto(localInput && localInput.value);
    const tipoImovelInteresse = agTexto(tipoImovelInput && tipoImovelInput.value);
    const finalidadeImovel = agTexto(finalidadeInput && finalidadeInput.value);

    if (!rendaBrutaFamiliar) {
      if (rendaInput) rendaInput.focus();
      showToast('⚠️', 'Informe a renda bruta familiar do cliente.');
      return;
    }
    if (!AG_LOCAIS_COMPRA.includes(localCompra)) {
      if (localInput) localInput.focus();
      showToast('⚠️', 'Informe se o cliente quer comprar em Curitiba ou na Região metropolitana.');
      return;
    }
    if (!AG_TIPOS_IMOVEL_INTERESSE.includes(tipoImovelInteresse)) {
      if (tipoImovelInput) tipoImovelInput.focus();
      showToast('⚠️', 'Informe se o cliente quer comprar casa ou apartamento.');
      return;
    }
    if (!AG_FINALIDADES_IMOVEL.includes(finalidadeImovel)) {
      if (finalidadeInput) finalidadeInput.focus();
      showToast('⚠️', 'Informe se o imóvel será para moradia ou investimento.');
      return;
    }

    qualificacaoDocumentacao = {
      rendaBrutaFamiliar,
      localCompra,
      tipoImovelInteresse,
      finalidadeImovel
    };
  }

  if (agTipoFechamento(atual) && agTratativaSelecao === AG_SITUACAO_CONCLUIDA) {
    const rendaInput = document.getElementById('agt-renda-bruta-familiar');
    const tipoImovelInput = document.getElementById('agt-tipo-imovel');
    const finalidadeInput = document.getElementById('agt-finalidade-imovel');
    const propostaInput = document.getElementById('agt-assinou-proposta');
    const atoInput = document.getElementById('agt-pagou-ato');
    const rendaBrutaFamiliar = agRendaBrutaFamiliarNumero(rendaInput && rendaInput.value);
    const tipoImovelInteresse = agTexto(tipoImovelInput && tipoImovelInput.value);
    const finalidadeImovel = agTexto(finalidadeInput && finalidadeInput.value);
    const assinouPropostaCompra = agRespostaBooleana(propostaInput && propostaInput.value);
    const pagouAto = agRespostaBooleana(atoInput && atoInput.value);

    if (!rendaBrutaFamiliar) {
      if (rendaInput) rendaInput.focus();
      showToast('⚠️', 'Informe a renda bruta do cliente.');
      return;
    }
    if (!AG_TIPOS_IMOVEL_INTERESSE.includes(tipoImovelInteresse)) {
      if (tipoImovelInput) tipoImovelInput.focus();
      showToast('⚠️', 'Informe se o cliente estava buscando casa ou apartamento.');
      return;
    }
    if (!AG_FINALIDADES_IMOVEL.includes(finalidadeImovel)) {
      if (finalidadeInput) finalidadeInput.focus();
      showToast('⚠️', 'Informe se o imóvel era para moradia ou investimento.');
      return;
    }
    if (assinouPropostaCompra === null) {
      if (propostaInput) propostaInput.focus();
      showToast('⚠️', 'Informe se o cliente assinou a proposta de compra.');
      return;
    }
    if (pagouAto === null) {
      if (atoInput) atoInput.focus();
      showToast('⚠️', 'Informe se o cliente pagou o ato.');
      return;
    }

    qualificacaoFechamento = {
      rendaBrutaFamiliar,
      tipoImovelInteresse,
      finalidadeImovel,
      assinouPropostaCompra,
      pagouAto
    };
  }

  if (agTratativaSelecao === AG_SITUACAO_REAGENDADO) {
    const novaData = document.getElementById('agt-nova-data') ? document.getElementById('agt-nova-data').value : '';
    const novoHorario = document.getElementById('agt-novo-horario') ? agHoraNormalizada(document.getElementById('agt-novo-horario').value) : '';
    if (!agDataOperacionalValida(novaData)) {
      showToast('âš ï¸', 'Informe uma nova data valida para o reagendamento.');
      return;
    }
    const novoRef = agDataHoraRef(novaData, novoHorario);
    if (!novoRef) {
      showToast('⚠️', 'Informe a nova data e horário do reagendamento.');
      return;
    }
    if (novoRef.getTime() <= Date.now()) {
      showToast('⚠️', 'O novo compromisso precisa ficar em um horario futuro.');
      return;
    }

    const conflitoTelefone = agEncontrarConflitoTelefoneAgendamento(atual.telefone, {
      ignorarId: atual.id,
      ignorarRefLocal: atual.refLocal || atual.ref_local || ''
    });
    if (conflitoTelefone) {
      showToast('âš ï¸', agMensagemConflitoTelefoneAgendamento(conflitoTelefone));
      return;
    }

    const novoAgendamento = {
      id: nextAgendamentoId++,
      preenchidoEm: agHojeIso(),
      unidade: atual.unidade,
      equipe: atual.equipe,
      corretorId: atual.corretorId || 0,
      corretor: atual.corretor || '',
      corretorEmail: atual.corretorEmail || '',
      cliente: atual.cliente || '',
      telefone: atual.telefone || '',
      dataAgendamento: novaData,
      horarioAgendamento: novoHorario,
      tipoVisita: atual.tipoVisita || 'Primeiro atendimento',
      canalAgendamento: agCanalAgendamentoValor(atual.canalAgendamento, atual.tipoVisita),
      criadoPor: agTexto(usuarioAtual.nome || atual.criadoPor || 'Sistema'),
      criadoPorId: parseInt(usuarioAtual.id, 10) || 0,
      criadoPorEmail: agTexto(usuarioAtual.email).toLowerCase(),
      situacao: AG_SITUACAO_AGENDADO,
      tratativaEm: '',
      tratativaPor: '',
      tratativaPorId: 0,
      tratativaPorEmail: '',
      reagendadoParaData: '',
      reagendadoParaHorario: '',
      origemAgendamentoId: atual.id || 0,
      novoAgendamentoId: 0,
      rendaBrutaFamiliar: 0,
      localCompra: '',
      tipoImovelInteresse: '',
      finalidadeImovel: '',
      assinouPropostaCompra: null,
      pagouAto: null,
      atualizadoEm: agoraIso,
      refLocal: typeof gerarRefLocalAgendamento === 'function' ? gerarRefLocalAgendamento() : '',
      syncPendente: true,
      syncErro: ''
    };
    novosAgendamentos.push(novoAgendamento);
    atual.reagendadoParaData = novaData;
    atual.reagendadoParaHorario = novoHorario;
  }

  atual.situacao = agTratativaSelecao;
  atual.tratativaEm = agoraIso;
  atual.tratativaPor = agTexto(usuarioAtual.nome || 'Sistema');
  atual.tratativaPorId = parseInt(usuarioAtual.id, 10) || 0;
  atual.tratativaPorEmail = agTexto(usuarioAtual.email).toLowerCase();
  if (qualificacaoDocumentacao) Object.assign(atual, qualificacaoDocumentacao);
  if (qualificacaoFechamento) Object.assign(atual, qualificacaoFechamento);
  atual.atualizadoEm = agoraIso;
  if (typeof marcarAgendamentoSyncPendente === 'function') marcarAgendamentoSyncPendente(atual);
  novosAgendamentos.forEach(item => {
    if (typeof marcarAgendamentoSyncPendente === 'function') marcarAgendamentoSyncPendente(item);
  });

  if (novosAgendamentos.length) {
    atual.novoAgendamentoId = novosAgendamentos[0].id;
  }

  AGENDAMENTOS.push(...novosAgendamentos);
  const ordenados = agOrdenarLista(AGENDAMENTOS);
  AGENDAMENTOS.splice(0, AGENDAMENTOS.length, ...ordenados);
  zSetState('state.data.agendamentos', AGENDAMENTOS);
  zSetState('state.ui.nextAgendamentoId', nextAgendamentoId);
  salvarLS();

  if (btn) {
    btn.disabled = true;
    btn.textContent = zUiText(modoTratativa === 'obrigatoria' ? 'Salvando tratativa...' : 'Salvando atualização...');
  }

  try {
    await dbSalvarAgendamento(atual, atual.id);
    for (const item of novosAgendamentos) {
      item.origemAgendamentoId = atual.id || item.origemAgendamentoId || 0;
      await dbSalvarAgendamento(item);
    }
    if (novosAgendamentos.length) {
      atual.novoAgendamentoId = novosAgendamentos[0].id;
      await dbSalvarAgendamento(atual, atual.id);
      if (parseInt(novosAgendamentos[0].id, 10) >= nextAgendamentoId) {
        nextAgendamentoId = parseInt(novosAgendamentos[0].id, 10) + 1;
        zSetState('state.ui.nextAgendamentoId', nextAgendamentoId);
      }
    }
    salvarLS();
    showToast('✅', modoTratativa === 'obrigatoria' ? 'Tratativa registrada com sucesso.' : 'Atualização registrada com sucesso.');
  } catch (erro) {
    if (typeof erroAgendamentoTelefoneDuplicado === 'function' && erroAgendamentoTelefoneDuplicado(erro)) {
      const refsNovas = novosAgendamentos
        .map(item => agTexto(item && (item.refLocal || item.ref_local || '')))
        .filter(Boolean);
      for (let i = AGENDAMENTOS.length - 1; i >= 0; i--) {
        const refItem = agTexto(AGENDAMENTOS[i] && (AGENDAMENTOS[i].refLocal || AGENDAMENTOS[i].ref_local || ''));
        if (refsNovas.includes(refItem)) AGENDAMENTOS.splice(i, 1);
      }
      atual.novoAgendamentoId = 0;
      zSetState('state.data.agendamentos', AGENDAMENTOS);
      salvarLS();
      agAtualizarDadosCompartilhadosEmSegundoPlano({ forcar: true });
      showToast('âš ï¸', typeof mensagemErroAgendamentoTelefoneDuplicado === 'function'
        ? mensagemErroAgendamentoTelefoneDuplicado(erro)
        : 'Ja existe um compromisso em aberto para este telefone.');
      return;
    }
    console.warn('Falha ao sincronizar tratativa do agendamento:', erro && erro.message ? erro.message : erro);
    salvarLS();
    showToast('⚠️', 'A tratativa não foi sincronizada com o Supabase. Este ajuste ficou pendente apenas neste navegador.');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = zUiText(modoTratativa === 'obrigatoria' ? 'Confirmar tratativa' : 'Salvar atualização');
    }
    agTratativaSelecao = '';
    zSetState('state.ui.agTratativaSelecao', agTratativaSelecao);
    renderAgendamentos();
    verificarPendenciasAgendamento({ forcar: true });
  }
}

