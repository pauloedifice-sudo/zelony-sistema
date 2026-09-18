// AGENDAMENTOS - parte 4/4: render principal, modal de cadastro/edicao e registro do modulo
function renderAgendamentos() {
  const cont = document.getElementById('agendamentos-content');
  if (!cont) return;
  if (agModuloVisivel()) {
    agAtualizarDadosCompartilhadosEmSegundoPlano({
      cooldownMs: AG_REFRESH_COOLDOWN_MS,
      renderizar: true
    });
  }

  const syncInfo = agStatusSyncInfo();
  const pendentesSync = agPendentesSyncLista();
  const pendentesQtd = pendentesSync.length;
  const mutacaoBloqueada = agMutacaoBloqueada();
  const periodo = agPeriodoNormalizado();
  const base = agOrdenarLista((Array.isArray(AGENDAMENTOS) ? AGENDAMENTOS : []).filter(agendamentoVisivel));
  const basePeriodo = agFiltrarPeriodo(base, periodo);
  const unidadesOpcoes = [...new Set(basePeriodo.map(item => agTexto(item.unidade)).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  if (agFiltroUnidade && !unidadesOpcoes.includes(agFiltroUnidade)) agFiltroUnidade = '';

  const baseEquipe = basePeriodo.filter(item => !agFiltroUnidade || agTexto(item.unidade) === agFiltroUnidade);
  const equipesOpcoes = [...new Set(baseEquipe.map(item => agEquipeValor(item)).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  if (agFiltroEquipe && !equipesOpcoes.includes(agFiltroEquipe)) agFiltroEquipe = '';

  const baseCorretor = baseEquipe.filter(item => !agFiltroEquipe || agEquipeValor(item) === agFiltroEquipe);
  const corretoresMap = new Map();
  baseCorretor.forEach(item => {
    const chave = agCorretorFiltroValor(item);
    if (chave && !corretoresMap.has(chave)) {
      corretoresMap.set(chave, { value: chave, label: agTexto(item.corretor || 'Não informado') });
    }
  });
  const corretoresOpcoes = Array.from(corretoresMap.values()).sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  if (agFiltroCorretor && !corretoresOpcoes.some(item => item.value === agFiltroCorretor)) agFiltroCorretor = '';

  const lista = agFiltrarLista(basePeriodo, true);
  const listaAgenda = lista.filter(agAgendamentoAtivo);
  const listaAtivos = lista.filter(agAgendamentoAtivoFuturo);
  agGarantirDataSelecionada();

  const listaMes = listaAgenda.filter(item => agDataNoMes(item.dataAgendamento, agMesRef));
  const listaDia = agOrdenarLista(listaAgenda.filter(item => item.dataAgendamento === agDataSelecionada));
  const limiteProximos = 5;
  const proximosTodos = agOrdenarLista(listaAtivos);
  const mostrarTodosProximos = agMostrarTodosProximos || proximosTodos.length <= limiteProximos;
  const proximos = mostrarTodosProximos ? proximosTodos : proximosTodos.slice(0, limiteProximos);
  const proximosRestantes = Math.max(proximosTodos.length - proximos.length, 0);

  const totalFeitos = lista.length;
  const totalAtivos = listaAtivos.length;
  const listaConcluidos = lista.filter(item => agSituacaoNormalizada(item) === 'concluida');
  const listaCancelados = lista.filter(item => agSituacaoNormalizada(item) === 'cliente cancelou');
  const totalConcluidos = listaConcluidos.length;
  const totalPrimeirosAtivos = listaAtivos.filter(agTipoPrimeiro).length;
  const totalDocumentacaoAtivos = listaAtivos.filter(agTipoDocumentacao).length;
  const totalFechamentosAtivos = listaAtivos.filter(agTipoFechamento).length;
  const totalPrimeirosCancelados = listaCancelados.filter(agTipoPrimeiro).length;
  const totalDocumentacaoCancelada = listaCancelados.filter(agTipoDocumentacao).length;
  const totalFechamentosCancelados = listaCancelados.filter(agTipoFechamento).length;
  const totalPrimeirosProximos7 = agContarProximosDias(listaAtivos.filter(agTipoPrimeiro), 7);
  const totalDocumentacaoProximos7 = agContarProximosDias(listaAtivos.filter(agTipoDocumentacao), 7);
  const totalFechamentosProximos7 = agContarProximosDias(listaAtivos.filter(agTipoFechamento), 7);
  const periodoResumo = agPeriodoResumo(periodo);
  const resumoPrimeiroDashboard = agResumoDashboardTipo(lista, agTipoPrimeiro);
  const resumoFechamentoDashboard = agResumoDashboardTipo(lista, agTipoFechamento);
  const resumoDocumentacaoDashboard = agResumoDashboardTipo(lista, agTipoDocumentacao);
  const resumoDiaPrimeiro = listaDia.filter(agTipoPrimeiro).length;
  const resumoDiaDocumentacao = listaDia.filter(agTipoDocumentacao).length;
  const resumoDiaFechamento = listaDia.filter(agTipoFechamento).length;
  const resumoProximosPrimeiro = proximos.filter(agTipoPrimeiro).length;
  const resumoProximosDocumentacao = proximos.filter(agTipoDocumentacao).length;
  const resumoProximosFechamento = proximos.filter(agTipoFechamento).length;
  const orientacaoSync = encodeURIComponent('Aplicar o arquivo supabase-agendamentos.sql no SQL Editor do Supabase antes de liberar novamente o módulo de agendamentos.');
  const avisoSync = syncInfo.tabelaAusente
    ? `<div class="ag-sync-banner danger">
        <div class="ag-sync-banner-main">
          <strong>Sincronização compartilhada indisponível</strong>
          <span>A tabela de agendamentos ainda não existe no Supabase. Novos lançamentos e tratativas foram bloqueados para evitar perda operacional.</span>
          <small>${agTexto(syncInfo.erro || 'A aplicação não encontrou a tabela public.agendamentos no banco compartilhado.')}</small>
        </div>
        <div class="ag-sync-banner-actions">
          <button class="ag-sync-btn" type="button" onclick="copiarTexto(decodeURIComponent('${orientacaoSync}'),'Orientação do Supabase')">Copiar orientação</button>
          ${pendentesQtd ? `<button class="ag-sync-btn" type="button" onclick="exportarAgendamentosPendentes()">Exportar pendentes (${pendentesQtd})</button>` : ''}
        </div>
      </div>`
    : !syncInfo.tabelaDisponivel
      ? `<div class="ag-sync-banner warn">
          <div class="ag-sync-banner-main">
            <strong>Sincronização temporariamente indisponível</strong>
            <span>Enquanto o Supabase não responder com segurança, o módulo fica em modo protegido e bloqueia novos lançamentos e tratativas.</span>
            <small>${agTexto(syncInfo.erro || 'Tente novamente em alguns instantes.')}</small>
          </div>
          <div class="ag-sync-banner-actions">
            <button class="ag-sync-btn" type="button" onclick="agTentarSincronizarPendentes()">Tentar novamente</button>
            ${pendentesQtd ? `<button class="ag-sync-btn" type="button" onclick="exportarAgendamentosPendentes()">Exportar pendentes (${pendentesQtd})</button>` : ''}
          </div>
        </div>`
      : pendentesQtd
        ? `<div class="ag-sync-banner info">
            <div class="ag-sync-banner-main">
              <strong>${syncInfo.sincronizando ? 'Sincronizando agendamentos pendentes' : 'Agendamentos pendentes de sincronização'}</strong>
              <span>${pendentesQtd} registro${pendentesQtd !== 1 ? 's' : ''} deste navegador ainda precisa${pendentesQtd !== 1 ? 'm' : ''} subir para o Supabase.</span>
              <small>${syncInfo.ultimaSync ? `Última sincronização: ${formatarDataLocal(new Date(syncInfo.ultimaSync), { comAno: true, comHora: true })}` : 'Assim que a sincronização concluir, eles passam a ficar visíveis para toda a equipe.'}</small>
            </div>
            <div class="ag-sync-banner-actions">
              <button class="ag-sync-btn" type="button" onclick="agTentarSincronizarPendentes()" ${syncInfo.sincronizando ? 'disabled' : ''}>${syncInfo.sincronizando ? 'Sincronizando...' : 'Sincronizar agora'}</button>
              <button class="ag-sync-btn" type="button" onclick="exportarAgendamentosPendentes()">Exportar pendentes</button>
            </div>
          </div>`
        : '';

  cont.innerHTML = `<div class="ag-wrap">
    <div class="ag-top">
      <div class="ag-title-wrap">
        <div class="ag-title">Agenda comercial</div>
        <div class="ag-sub">${agTexto(agResumoPermissao())}</div>
      </div>
      <div class="ag-top-actions">
        <div class="ag-report-range">
          <div class="ag-report-date-field">
            <label>De</label>
            <input type="date" value="${agAttr(agFiltroDataDe)}" onchange="agAtualizarFiltroPeriodo('de',this.value)">
          </div>
          <div class="ag-report-date-field">
            <label>Ate</label>
            <input type="date" value="${agAttr(agFiltroDataAte)}" onchange="agAtualizarFiltroPeriodo('ate',this.value)">
          </div>
        </div>
        <button class="ag-clear-btn ag-report-btn" id="ag-report-btn" type="button" onclick="exportarRelatorioAgendamentos()">
          Relatório geral
        </button>
        <button class="ag-clear-btn ag-report-btn ag-docs-report-btn" id="ag-docs-report-btn" type="button" onclick="exportarRelatorioDocumentacoes()">
          Relatório documentações
        </button>
        <button class="ag-clear-btn ag-report-btn ag-close-report-btn" id="ag-close-report-btn" type="button" onclick="exportarRelatorioFechamentos()">
          Relatório fechamentos
        </button>
        <button class="btn-add-trein" type="button" onclick="abrirAgendamentoModal('${agDataSelecionada || agHojeIso()}')" ${mutacaoBloqueada ? 'disabled' : ''} style="${mutacaoBloqueada ? 'opacity:0.55;cursor:not-allowed;' : ''}">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/></svg>
          Novo compromisso
        </button>
      </div>
    </div>

    ${avisoSync}

    <div class="ag-stat-grid agenda-dashboard-grid">
      <div class="ag-stat-group first">
        <div class="ag-stat-group-title">Primeiro atendimento</div>
        <div class="ag-stat-group-body">
          <div class="ag-stat-row">
            <span>Total de agendamentos feitos</span>
            <strong>${resumoPrimeiroDashboard.total}</strong>
          </div>
          <div class="ag-stat-row">
            <span>Agendamentos concluidos</span>
            <strong>${resumoPrimeiroDashboard.concluidos}</strong>
          </div>
          <div class="ag-stat-row">
            <span>Agendamentos reagendados</span>
            <strong>${resumoPrimeiroDashboard.reagendados}</strong>
          </div>
          <div class="ag-stat-row">
            <span>Agendamentos cancelados</span>
            <strong>${resumoPrimeiroDashboard.cancelados}</strong>
          </div>
        </div>
      </div>
      <div class="ag-stat-group close">
        <div class="ag-stat-group-title">Fechamento</div>
        <div class="ag-stat-group-body">
          <div class="ag-stat-row">
            <span>Total de agendamentos feitos</span>
            <strong>${resumoFechamentoDashboard.total}</strong>
          </div>
          <div class="ag-stat-row">
            <span>Agendamentos concluidos</span>
            <strong>${resumoFechamentoDashboard.concluidos}</strong>
          </div>
          <div class="ag-stat-row">
            <span>Agendamentos reagendados</span>
            <strong>${resumoFechamentoDashboard.reagendados}</strong>
          </div>
          <div class="ag-stat-row">
            <span>Agendamentos cancelados</span>
            <strong>${resumoFechamentoDashboard.cancelados}</strong>
          </div>
        </div>
      </div>
      <div class="ag-stat-group docs">
        <div class="ag-stat-group-title">Documentacao</div>
        <div class="ag-stat-group-body">
          <div class="ag-stat-row">
            <span>Total de promessas feitos</span>
            <strong>${resumoDocumentacaoDashboard.total}</strong>
          </div>
          <div class="ag-stat-row">
            <span>Documentacao recebida</span>
            <strong>${resumoDocumentacaoDashboard.concluidos}</strong>
          </div>
          <div class="ag-stat-row">
            <span>Documentacao reagendada</span>
            <strong>${resumoDocumentacaoDashboard.reagendados}</strong>
          </div>
          <div class="ag-stat-row">
            <span>Documentacao cancelada</span>
            <strong>${resumoDocumentacaoDashboard.cancelados}</strong>
          </div>
        </div>
      </div>
    </div>

    <div class="ag-stat-grid" style="display:none;">
      <div class="ag-stat">
        <div class="ag-stat-tag">Agendamentos feitos</div>
        <div class="ag-stat-value">${totalFeitos}</div>
        <div class="ag-stat-copy">${agTexto(periodoResumo)}</div>
      </div>
      <div class="ag-stat">
        <div class="ag-stat-tag">Agendamentos ativos</div>
        <div class="ag-stat-value">${totalAtivos}</div>
        <div class="ag-stat-copy">Somente compromissos futuros ainda sem conclusão ou cancelamento.</div>
      </div>
      <div class="ag-stat">
        <div class="ag-stat-tag">Agendamentos concluídos</div>
        <div class="ag-stat-value">${totalConcluidos}</div>
        <div class="ag-stat-copy">Compromissos finalizados como visita concluida ou documentacao recebida dentro do periodo analisado.</div>
      </div>
      <div class="ag-stat">
        <div class="ag-stat-tag">Primeiro atendimento ativos</div>
        <div class="ag-stat-value">${totalPrimeirosAtivos}</div>
        <div class="ag-stat-copy">${totalPrimeirosProximos7} primeiros atendimentos ativos previstos nos proximos 7 dias.</div>
      </div>
      <div class="ag-stat">
        <div class="ag-stat-tag">Documentacao online ativa</div>
        <div class="ag-stat-value">${totalDocumentacaoAtivos}</div>
        <div class="ag-stat-copy">${totalDocumentacaoProximos7} envios de documentacao online previstos nos proximos 7 dias.</div>
      </div>
      <div class="ag-stat">
        <div class="ag-stat-tag">Fechamentos ativos</div>
        <div class="ag-stat-value">${totalFechamentosAtivos}</div>
        <div class="ag-stat-copy">${totalFechamentosProximos7} fechamentos ativos previstos nos proximos 7 dias.</div>
      </div>
      <div class="ag-stat cancelled">
        <div class="ag-stat-tag">Primeiro atendimento cancelado</div>
        <div class="ag-stat-value">${totalPrimeirosCancelados}</div>
        <div class="ag-stat-copy">${totalPrimeirosCancelados} cancelamento${totalPrimeirosCancelados !== 1 ? 's' : ''} de primeiro atendimento dentro do periodo analisado.</div>
      </div>
      <div class="ag-stat cancelled">
        <div class="ag-stat-tag">Documentacao cancelada</div>
        <div class="ag-stat-value">${totalDocumentacaoCancelada}</div>
        <div class="ag-stat-copy">${totalDocumentacaoCancelada} cancelamento${totalDocumentacaoCancelada !== 1 ? 's' : ''} de documentacao online dentro do periodo analisado.</div>
      </div>
      <div class="ag-stat cancelled">
        <div class="ag-stat-tag">Fechamento cancelado</div>
        <div class="ag-stat-value">${totalFechamentosCancelados}</div>
        <div class="ag-stat-copy">${totalFechamentosCancelados} cancelamento${totalFechamentosCancelados !== 1 ? 's' : ''} de fechamento dentro do periodo analisado.</div>
      </div>
    </div>

    <div class="ag-toolbar">
      <div class="ag-search">
        <span class="ag-search-icon">🔍</span>
        <input type="text" value="${agAttr(agBusca)}" placeholder="Buscar cliente, telefone ou corretor..." oninput="agBusca=this.value;zSetState('state.ui.agBusca',agBusca);renderAgendamentos()">
      </div>
      <div class="ag-date-range">
        <div class="ag-date-field">
          <label>De</label>
          <input type="date" value="${agAttr(agFiltroDataDe)}" onchange="agAtualizarFiltroPeriodo('de',this.value)">
        </div>
        <div class="ag-date-field">
          <label>Até</label>
          <input type="date" value="${agAttr(agFiltroDataAte)}" onchange="agAtualizarFiltroPeriodo('ate',this.value)">
        </div>
      </div>
      <select class="ag-filter" onchange="agFiltroUnidade=this.value;agFiltroEquipe='';agFiltroCorretor='';zSetState('state.ui.agFiltroUnidade',agFiltroUnidade);zSetState('state.ui.agFiltroEquipe',agFiltroEquipe);zSetState('state.ui.agFiltroCorretor',agFiltroCorretor);renderAgendamentos()">
        <option value="">Todas as unidades</option>
        ${unidadesOpcoes.map(unidade => `<option value="${agTexto(unidade)}" ${agFiltroUnidade === unidade ? 'selected' : ''}>${agTexto(unidade)}</option>`).join('')}
      </select>
      <select class="ag-filter" onchange="agFiltroEquipe=this.value;agFiltroCorretor='';zSetState('state.ui.agFiltroEquipe',agFiltroEquipe);zSetState('state.ui.agFiltroCorretor',agFiltroCorretor);renderAgendamentos()">
        <option value="">Todas as equipes</option>
        ${equipesOpcoes.map(equipe => `<option value="${agTexto(equipe)}" ${agFiltroEquipe === equipe ? 'selected' : ''}>${agTexto(equipe)}</option>`).join('')}
      </select>
      <select class="ag-filter" onchange="agFiltroCorretor=this.value;zSetState('state.ui.agFiltroCorretor',agFiltroCorretor);renderAgendamentos()">
        <option value="">Todos os corretores</option>
        ${corretoresOpcoes.map(item => `<option value="${agTexto(item.value)}" ${agFiltroCorretor === item.value ? 'selected' : ''}>${agTexto(item.label)}</option>`).join('')}
      </select>
      ${(agBusca || agFiltroUnidade || agFiltroEquipe || agFiltroCorretor || agFiltroDataDe || agFiltroDataAte) ? `<button class="ag-clear-btn" type="button" onclick="limparFiltrosAgendamento()">Limpar filtros</button>` : ''}
    </div>

    <div class="ag-layout">
      <div class="ag-card">
        <div class="ag-card-head">
          <div>
            <div class="ag-card-title">${agTexto(agFormatarMesAno(agMesRef))}</div>
            <div class="ag-card-sub">Cada dia mostra uma prévia de até 2 compromissos. Clique na data para ver a lista completa ao lado.</div>
          </div>
          <div class="ag-month-nav">
            <button class="ag-month-btn" type="button" onclick="mudarMesAgendamento(-1)">‹</button>
            <button class="ag-month-btn" type="button" onclick="mudarMesAgendamento(1)">›</button>
          </div>
        </div>
        <div class="ag-calendar-body">
          ${agRenderCalendario(listaMes)}
        </div>
      </div>

      <div class="ag-side">
        <div class="ag-card">
          <div class="ag-card-head">
            <div>
              <div class="ag-card-title-row">
                <div class="ag-card-title">${agTexto(agFormatarDiaPainel(agDataSelecionada))}</div>
                <span class="ag-count-chip">${listaDia.length}</span>
              </div>
              <div class="ag-card-sub">Lista completa do dia selecionado com ${listaDia.length} compromisso${listaDia.length !== 1 ? 's' : ''} ativo${listaDia.length !== 1 ? 's' : ''}.</div>
            </div>
            <button class="ag-clear-btn" type="button" onclick="abrirAgendamentoModal('${agDataSelecionada}')" ${mutacaoBloqueada ? 'disabled' : ''} style="${mutacaoBloqueada ? 'opacity:0.55;cursor:not-allowed;' : ''}">Agendar neste dia</button>
          </div>
          <div class="ag-side-body">
            <div class="ag-side-section">
              <div class="ag-side-label">Compromissos do dia</div>
              <div class="ag-inline-note">O calendário mostra apenas um resumo visual. Todos os compromissos ativos da data selecionada aparecem nesta lista.</div>
              <div class="ag-panel-stats">
                <div class="ag-panel-stat">
                  <span>Primeiro atendimento</span>
                  <strong>${resumoDiaPrimeiro}</strong>
                </div>
                <div class="ag-panel-stat">
                  <span>Docs online</span>
                  <strong>${resumoDiaDocumentacao}</strong>
                </div>
                <div class="ag-panel-stat">
                  <span>Fechamento</span>
                  <strong>${resumoDiaFechamento}</strong>
                </div>
              </div>
              <div class="ag-list">
                ${listaDia.length ? listaDia.map(item => agRenderItem(item)).join('') : `<div class="ag-empty"><strong>Sem compromissos ativos neste dia</strong>Use o botao acima para registrar um novo compromisso na data selecionada.</div>`}
              </div>
            </div>
          </div>
        </div>

        <div class="ag-card">
          <div class="ag-card-head">
            <div>
              <div class="ag-card-title-row">
                <div class="ag-card-title">Próximos compromissos</div>
                <span class="ag-count-chip">${mostrarTodosProximos ? proximosTodos.length : `${proximos.length}/${proximosTodos.length}`}</span>
              </div>
              <div class="ag-card-sub">${mostrarTodosProximos ? 'Lista completa dos compromissos ativos futuros dentro do período filtrado.' : `Mostrando os próximos ${limiteProximos} de ${proximosTodos.length} compromissos ativos futuros.`}</div>
            </div>
            ${proximosTodos.length > limiteProximos ? `<button class="ag-clear-btn" type="button" onclick="alternarListaProximosAgendamentos()">${mostrarTodosProximos ? `Mostrar só ${limiteProximos}` : `Ver todos (${proximosTodos.length})`}</button>` : ''}
          </div>
          <div class="ag-side-body">
            <div class="ag-side-section">
              <div class="ag-side-label">${mostrarTodosProximos ? 'Lista completa do período' : `Prévia dos próximos ${limiteProximos} registros`}</div>
              ${proximosTodos.length ? `<div class="ag-inline-note compact">${mostrarTodosProximos ? 'Você está vendo todos os compromissos ativos futuros deste período.' : `Ainda existem mais ${proximosRestantes} compromisso${proximosRestantes !== 1 ? 's' : ''} fora desta prévia. Use "Ver todos" para abrir a lista completa.`}</div>` : ''}
              <div class="ag-panel-stats">
                <div class="ag-panel-stat">
                  <span>Primeiro atendimento</span>
                  <strong>${resumoProximosPrimeiro}</strong>
                </div>
                <div class="ag-panel-stat">
                  <span>Docs online</span>
                  <strong>${resumoProximosDocumentacao}</strong>
                </div>
                <div class="ag-panel-stat">
                  <span>Fechamento</span>
                  <strong>${resumoProximosFechamento}</strong>
                </div>
              </div>
              <div class="ag-list">
                ${proximos.length ? proximos.map(item => agRenderItem(item, { mostrarData: true })).join('') : `<div class="ag-empty"><strong>Nenhum agendamento ativo no período</strong>Assim que houver novos compromissos futuros, eles aparecem aqui.</div>`}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

function agAtualizarFiltroPeriodo(campo, valor) {
  const data = agDataValidaIso(valor) ? valor : '';
  if (campo === 'de') agFiltroDataDe = data;
  if (campo === 'ate') agFiltroDataAte = data;

  if (agFiltroDataDe && agFiltroDataAte && agFiltroDataDe > agFiltroDataAte) {
    if (campo === 'de') agFiltroDataAte = agFiltroDataDe;
    else agFiltroDataDe = agFiltroDataAte;
  }

  const dataBase = agFiltroDataDe || agFiltroDataAte || agHojeIso();
  const refBase = agDataHoraRef(dataBase, '12:00');
  if (refBase) {
    agMesRef = new Date(refBase.getFullYear(), refBase.getMonth(), 1, 12, 0, 0, 0);
    agDataSelecionada = agIsoFromDate(refBase);
    zSetState('state.ui.agMesRef', agMesRef);
    zSetState('state.ui.agDataSelecionada', agDataSelecionada);
  }

  zSetState('state.ui.agFiltroDataDe', agFiltroDataDe);
  zSetState('state.ui.agFiltroDataAte', agFiltroDataAte);
  renderAgendamentos();
}

function limparFiltrosAgendamento() {
  agBusca = '';
  agFiltroUnidade = '';
  agFiltroEquipe = '';
  agFiltroCorretor = '';
  agFiltroDataDe = '';
  agFiltroDataAte = '';
  agMesRef = new Date(new Date().getFullYear(), new Date().getMonth(), 1, 12, 0, 0, 0);
  agDataSelecionada = agHojeIso();
  zSetState('state.ui.agBusca', agBusca);
  zSetState('state.ui.agFiltroUnidade', agFiltroUnidade);
  zSetState('state.ui.agFiltroEquipe', agFiltroEquipe);
  zSetState('state.ui.agFiltroCorretor', agFiltroCorretor);
  zSetState('state.ui.agFiltroDataDe', agFiltroDataDe);
  zSetState('state.ui.agFiltroDataAte', agFiltroDataAte);
  zSetState('state.ui.agMesRef', agMesRef);
  zSetState('state.ui.agDataSelecionada', agDataSelecionada);
  renderAgendamentos();
}

function selecionarAgendamentoData(dataIso) {
  if (!agDataValidaIso(dataIso)) return;
  agDataSelecionada = dataIso;
  zSetState('state.ui.agDataSelecionada', agDataSelecionada);
  renderAgendamentos();
}

function mudarMesAgendamento(delta) {
  agMesRef = new Date(agMesRef.getFullYear(), agMesRef.getMonth() + delta, 1, 12, 0, 0, 0);
  agDataSelecionada = agDataNoMes(agHojeIso(), agMesRef)
    ? agHojeIso()
    : agIsoFromDate(new Date(agMesRef.getFullYear(), agMesRef.getMonth(), 1, 12, 0, 0, 0));
  zSetState('state.ui.agMesRef', agMesRef);
  zSetState('state.ui.agDataSelecionada', agDataSelecionada);
  renderAgendamentos();
}

function abrirAgendamentoModal(dataIso) {
  const corretorSelect = document.getElementById('ma-corretor');
  if (!corretorSelect) return;
  if (agMutacaoBloqueada()) {
    const info = agStatusSyncInfo();
    showToast('⚠️', info.tabelaAusente
      ? 'Novos compromissos estao bloqueados ate aplicar a tabela no Supabase.'
      : 'Novos compromissos estao temporariamente bloqueados enquanto a sincronizacao compartilhada estiver indisponivel.');
    return;
  }

  const usuariosPermitidos = agUsuariosPermitidosCadastro();
  if (!usuariosPermitidos.length) {
    showToast('⚠️', 'Nao ha corretores disponiveis para o seu perfil cadastrar compromissos.');
    return;
  }

  document.getElementById('ma-title').textContent = zUiText('Novo compromisso');
  document.getElementById('ma-preenchimento').value = agHojeIso();
  document.getElementById('ma-cliente').value = '';
  document.getElementById('ma-telefone').value = '';
  document.getElementById('ma-horario').value = '';
  document.getElementById('ma-tipo').value = '';
  document.getElementById('ma-canal').value = '';
  document.getElementById('ma-data').value = '';

  atualizarCamposAgendamentoModal();

  if (role === 'cor' && usuarioLogado) {
    const usuarioAtual = usuariosPermitidos.find(usuario => agMesmoUsuario(usuario, usuarioLogado));
    if (usuarioAtual) corretorSelect.value = String(usuarioAtual.id);
  }

  document.getElementById('m-agendamento').classList.add('show');
  setTimeout(() => document.getElementById('ma-cliente').focus(), 100);
}

function fecharAgendamentoModal() {
  const modal = document.getElementById('m-agendamento');
  if (modal) modal.classList.remove('show');
}

function handleBackdropAgendamento(event) {
  if (event.target === document.getElementById('m-agendamento')) fecharAgendamentoModal();
}

function atualizarCamposAgendamentoModal() {
  const unidadeSelect = document.getElementById('ma-unidade');
  const equipeSelect = document.getElementById('ma-equipe');
  const tipoSelect = document.getElementById('ma-tipo');
  const canalSelect = document.getElementById('ma-canal');
  if (!unidadeSelect || !equipeSelect || !tipoSelect || !canalSelect) return;

  const tipoAtual = AG_TIPOS_VISITA.includes(tipoSelect.value) ? tipoSelect.value : '';
  tipoSelect.innerHTML = ['<option value="">Selecione o tipo</option>']
    .concat(AG_TIPOS_VISITA.map(tipo => `<option value="${agTexto(tipo)}">${agTexto(tipo)}</option>`))
    .join('');
  tipoSelect.value = tipoAtual;

  const canalAtual = AG_CANAIS_AGENDAMENTO.includes(canalSelect.value) ? canalSelect.value : '';
  canalSelect.innerHTML = ['<option value="">Selecione o canal</option>']
    .concat(AG_CANAIS_AGENDAMENTO.map(canal => `<option value="${agTexto(canal)}">${agTexto(canal)}</option>`))
    .join('');
  canalSelect.value = agTipoDocumentacao({ tipoVisita: tipoSelect.value }) ? 'Online - WhatsApp' : canalAtual;
  canalSelect.disabled = agTipoDocumentacao({ tipoVisita: tipoSelect.value });

  const unidades = agUnidadesPermitidasCriacao();
  const unidadeAtual = unidades.includes(unidadeSelect.value) ? unidadeSelect.value : (unidades[0] || '');
  unidadeSelect.innerHTML = unidades.map(unidade => `<option value="${agTexto(unidade)}">${agTexto(unidade)}</option>`).join('');
  unidadeSelect.value = unidadeAtual;
  unidadeSelect.disabled = unidades.length <= 1;

  const usuariosUnidade = agUsuariosPermitidosCadastro().filter(usuario => agUsuarioDisponivelNaUnidade(usuario, unidadeSelect.value));
  const equipes = [...new Set(usuariosUnidade.map(agEquipeValor).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const equipeAtual = equipes.includes(equipeSelect.value) ? equipeSelect.value : (equipes[0] || '');

  if (equipes.length) {
    equipeSelect.innerHTML = equipes.map(equipe => `<option value="${agTexto(equipe)}">${agTexto(equipe)}</option>`).join('');
    equipeSelect.value = equipeAtual;
  } else {
    equipeSelect.innerHTML = '<option value="">Sem equipe disponível</option>';
    equipeSelect.value = '';
  }

  equipeSelect.disabled = equipes.length <= 1;
  atualizarCorretoresAgendamentoModal();
}

function atualizarCorretoresAgendamentoModal() {
  const unidade = document.getElementById('ma-unidade');
  const equipe = document.getElementById('ma-equipe');
  const corretor = document.getElementById('ma-corretor');
  if (!unidade || !equipe || !corretor) return;

  const atual = corretor.value;
  const usuarios = agUsuariosPermitidosCadastro()
    .filter(usuario => agUsuarioDisponivelNaUnidade(usuario, unidade.value))
    .filter(usuario => !equipe.value || agEquipeValor(usuario) === equipe.value)
    .sort((a, b) => agTexto(a.nome).localeCompare(agTexto(b.nome), 'pt-BR'));

  if (usuarios.length) {
    corretor.innerHTML = usuarios.map(usuario => `<option value="${usuario.id}">${zUiHtml(usuario.nome)}</option>`).join('');
    const opcaoAtual = usuarios.some(usuario => String(usuario.id) === String(atual)) ? atual : String(usuarios[0].id);
    corretor.value = opcaoAtual;
  } else {
    corretor.innerHTML = '<option value="">Nenhum corretor disponível</option>';
    corretor.value = '';
  }

  corretor.disabled = role === 'cor' || usuarios.length <= 1;
}

async function salvarAgendamento() {
  if (agMutacaoBloqueada()) {
    const info = agStatusSyncInfo();
    showToast('⚠️', info.tabelaAusente
      ? 'Novos compromissos estao bloqueados ate aplicar a tabela no Supabase.'
      : 'Novos compromissos estao temporariamente bloqueados enquanto a sincronizacao compartilhada estiver indisponivel.');
    return;
  }
  const btn = document.getElementById('ma-save-btn');
  const preenchidoEm = document.getElementById('ma-preenchimento').value;
  const unidade = document.getElementById('ma-unidade').value;
  const equipe = document.getElementById('ma-equipe').value;
  const corretorId = document.getElementById('ma-corretor').value;
  const cliente = agTexto(document.getElementById('ma-cliente').value).toUpperCase();
  const telefoneInput = document.getElementById('ma-telefone');
  const telefone = agFormatarTelefone(telefoneInput ? telefoneInput.value : '');
  const dataAgendamento = document.getElementById('ma-data').value;
  const horarioAgendamento = agHoraNormalizada(document.getElementById('ma-horario').value);
  const tipoVisita = document.getElementById('ma-tipo').value;
  const canalSelecionado = document.getElementById('ma-canal').value;
  const canalAgendamento = agCanalAgendamentoValor(canalSelecionado, tipoVisita);
  const corretorUsuario = agUsuariosPermitidosCadastro().find(usuario => String(usuario.id) === String(corretorId));

  if (!agDataValidaIso(preenchidoEm)) { showToast('⚠️', 'Informe a data do preenchimento.'); return; }
  if (!unidade) { showToast('⚠️', 'Selecione a unidade.'); return; }
  if (!equipe) { showToast('⚠️', 'Selecione a equipe.'); return; }
  if (!corretorUsuario) { showToast('⚠️', 'Selecione o corretor responsável.'); return; }
  if (!cliente) { showToast('⚠️', 'Informe o nome do cliente.'); return; }
  if (!telefone) { showToast('⚠️', 'Informe o telefone do cliente.'); return; }
  if (!agDataValidaIso(dataAgendamento)) { showToast('⚠️', 'Informe a data do compromisso.'); return; }
  if (!horarioAgendamento) { showToast('⚠️', 'Informe o horario do compromisso.'); return; }
  if (!AG_TIPOS_VISITA.includes(tipoVisita)) { showToast('⚠️', 'Selecione o tipo de compromisso.'); return; }
  if (!AG_CANAIS_AGENDAMENTO.includes(canalSelecionado || canalAgendamento)) { showToast('⚠️', 'Selecione o canal do compromisso.'); return; }

  const conflitoTelefone = agEncontrarConflitoTelefoneAgendamento(telefone);
  if (conflitoTelefone) {
    if (telefoneInput) telefoneInput.focus();
    showToast('âš ï¸', agMensagemConflitoTelefoneAgendamento(conflitoTelefone));
    return;
  }

  const novo = {
    id: nextAgendamentoId++,
    preenchidoEm,
    unidade,
    equipe,
    corretorId: parseInt(corretorUsuario.id, 10) || 0,
    corretor: agTexto(corretorUsuario.nome),
    corretorEmail: agTexto(corretorUsuario.email).toLowerCase(),
    cliente,
    telefone,
    dataAgendamento,
    horarioAgendamento,
    tipoVisita,
    canalAgendamento,
    criadoPor: usuarioLogado ? agTexto(usuarioLogado.nome) : 'Sistema',
    criadoPorId: usuarioLogado ? (parseInt(usuarioLogado.id, 10) || 0) : 0,
    criadoPorEmail: usuarioLogado ? agTexto(usuarioLogado.email).toLowerCase() : '',
    situacao: AG_SITUACAO_AGENDADO,
    tratativaEm: '',
    tratativaPor: '',
    tratativaPorId: 0,
    tratativaPorEmail: '',
    reagendadoParaData: '',
    reagendadoParaHorario: '',
    origemAgendamentoId: 0,
    novoAgendamentoId: 0,
    rendaBrutaFamiliar: 0,
    localCompra: '',
    tipoImovelInteresse: '',
    finalidadeImovel: '',
    assinouPropostaCompra: null,
    pagouAto: null,
    atualizadoEm: new Date().toISOString(),
    refLocal: typeof gerarRefLocalAgendamento === 'function' ? gerarRefLocalAgendamento() : '',
    syncPendente: true,
    syncErro: ''
  };
  if (typeof marcarAgendamentoSyncPendente === 'function') marcarAgendamentoSyncPendente(novo);

  AGENDAMENTOS.push(novo);
  const ordenados = agOrdenarLista(AGENDAMENTOS);
  AGENDAMENTOS.splice(0, AGENDAMENTOS.length, ...ordenados);
  zSetState('state.data.agendamentos', AGENDAMENTOS);
  zSetState('state.ui.nextAgendamentoId', nextAgendamentoId);
  salvarLS();

  agMesRef = new Date(agDataHoraRef(novo.dataAgendamento, '12:00').getFullYear(), agDataHoraRef(novo.dataAgendamento, '12:00').getMonth(), 1, 12, 0, 0, 0);
  agDataSelecionada = novo.dataAgendamento;
  zSetState('state.ui.agMesRef', agMesRef);
  zSetState('state.ui.agDataSelecionada', agDataSelecionada);

  if (btn) {
    btn.disabled = true;
    btn.textContent = zUiText('💾 Salvando...');
  }

  fecharAgendamentoModal();
  renderAgendamentos();
  verificarPendenciasAgendamento();

  try {
    await dbSalvarAgendamento(novo);
    if (parseInt(novo.id, 10) >= nextAgendamentoId) {
      nextAgendamentoId = parseInt(novo.id, 10) + 1;
      zSetState('state.ui.nextAgendamentoId', nextAgendamentoId);
    }
    salvarLS();
    renderAgendamentos();
    showToast('✅', 'Compromisso salvo com sucesso.');
  } catch (erro) {
    if (typeof erroAgendamentoTelefoneDuplicado === 'function' && erroAgendamentoTelefoneDuplicado(erro)) {
      const refLocalNovo = agTexto(novo.refLocal || novo.ref_local || '');
      const indiceLocal = AGENDAMENTOS.findIndex(item => item && (
        item === novo
        || (refLocalNovo && agTexto(item.refLocal || item.ref_local || '') === refLocalNovo)
      ));
      if (indiceLocal >= 0) AGENDAMENTOS.splice(indiceLocal, 1);
      zSetState('state.data.agendamentos', AGENDAMENTOS);
      salvarLS();
      renderAgendamentos();
      agAtualizarDadosCompartilhadosEmSegundoPlano({ forcar: true });
      if (telefoneInput) telefoneInput.focus();
      showToast('âš ï¸', typeof mensagemErroAgendamentoTelefoneDuplicado === 'function'
        ? mensagemErroAgendamentoTelefoneDuplicado(erro)
        : 'Ja existe um compromisso em aberto para este telefone.');
      return;
    }
    console.warn('Falha ao sincronizar agendamento no banco:', erro && erro.message ? erro.message : erro);
    salvarLS();
    renderAgendamentos();
    showToast('⚠️', 'O compromisso nao foi sincronizado com o Supabase. Este registro ficou pendente apenas neste navegador.');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = zUiText('✓ Salvar compromisso');
    }
  }
}

const salvarAgendamentoOriginal = salvarAgendamento;
salvarAgendamento = async function salvarAgendamentoComTelefoneObrigatorio() {
  const preenchimentoInput = document.getElementById('ma-preenchimento');
  const dataInput = document.getElementById('ma-data');
  if (preenchimentoInput && !agDataOperacionalValida(preenchimentoInput.value)) {
    showToast('!', 'Informe uma data de preenchimento valida.');
    preenchimentoInput.focus();
    return;
  }
  if (dataInput && !agDataOperacionalValida(dataInput.value)) {
    showToast('!', 'Informe uma data do compromisso valida.');
    dataInput.focus();
    return;
  }
  const telefoneInput = document.getElementById('ma-telefone');
  if (telefoneInput) {
    telefoneInput.value = agFormatarTelefone(telefoneInput.value);
    if (telefoneInput.value && !agTelefoneValido(telefoneInput.value)) {
      telefoneInput.focus();
      showToast('!', 'Informe o telefone com DDD. Ex.: (41) 99999-9999.');
      return;
    }
  }
  return salvarAgendamentoOriginal();
};

zRegisterModule('agendamentos', {
  renderAgendamentos,
  abrirAgendamentoModal,
  fecharAgendamentoModal,
  handleBackdropAgendamento,
  atualizarCamposAgendamentoModal,
  atualizarCorretoresAgendamentoModal,
  selecionarAgendamentoData,
  mudarMesAgendamento,
  agAtualizarFiltroPeriodo,
  limparFiltrosAgendamento,
  salvarAgendamento,
  exportarRelatorioAgendamentos,
  exportarRelatorioDocumentacoes,
  exportarRelatorioFechamentos,
  temTratativaAgendamentoObrigatoriaAberta,
  verificarPendenciasAgendamento,
  iniciarMonitorTratativaAgendamento,
  encerrarMonitorTratativaAgendamento,
  selecionarTratativaAgendamento,
  confirmarTratativaAgendamento,
  handleBackdropAgendamentoTratativa,
  abrirTratativaAgendamentoManual,
  handleAgendamentoCardKeydown,
  fecharTratativaAgendamentoModal
});
