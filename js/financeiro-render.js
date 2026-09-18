// FINANCEIRO - parte 4/4: render principal e registro do modulo
function renderFinanceiro() {
  const alvo = document.getElementById('financeiro-content');
  if (!alvo) return;
  alvo.style.padding = '12px';
  alvo.style.overflowY = 'auto';
  alvo.style.overflowX = 'hidden';
  alvo.style.background = 'linear-gradient(180deg,#FCFBF7 0%,#FAF7EF 100%)';

  if (!['dono','fin','dir'].includes(role)) {
    alvo.innerHTML = `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:40px;">
      <div style="font-size:48px;">${zUiText('🔒')}</div>
      <div style="font-family:'Playfair Display',serif;font-size:22px;font-weight:600;color:var(--gold);">${zUiText('Acesso restrito')}</div>
      <div style="font-size:12px;color:var(--tm);text-align:center;max-width:280px;">${zUiText('Apenas Dono, Diretor e Financeiro tem acesso a este modulo.')}</div>
    </div>`;
    return;
  }

  syncFinState();

  const meses = finMeses();
  const mes = finMesAtual;
  const ano = finAnoAtual;
  const hoje = new Date();
  const diasSemana = ['Dom','Seg','Ter','Qua','Qui','Sex','Sab'];
  const primeiroDia = new Date(ano, mes, 1).getDay();
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();

  const unidades = finUnidadesDisponiveis();
  const categorias = finCategoriasDisponiveis();
  const dreMeta = finVisao === 'dre' ? finDreMetaAtual() : null;
  const dreDados = dreMeta ? finMontarDadosDre(dreMeta) : null;
  const anosDre = finVisao === 'dre' ? finDreAnosDisponiveis() : [];

  const atual = finColetarMes(mes, ano);
  const anteriorRef = finPeriodoComparado();
  const anterior = finColetarMes(anteriorRef.mes, anteriorRef.ano);

  const dataInicioRecorte = (mes === hoje.getMonth() && ano === hoje.getFullYear())
    ? new Date(ano, mes, hoje.getDate(), 12, 0, 0, 0)
    : new Date(ano, mes, 1, 12, 0, 0, 0);
  const dataFim7 = new Date(dataInicioRecorte.getTime());
  dataFim7.setDate(dataFim7.getDate() + 7);

  const movimentacoesVisiveis = finVisao === 'dre'
    ? (dreDados && Array.isArray(dreDados.linhas) ? dreDados.linhas : [])
    : finVisao === 'entradas'
    ? atual.entradas.todos
    : finVisao === 'saidas'
      ? atual.saidas.todos
      : atual.todos;

  const calendarioHtml = finBuildCalendario(atual, ano, mes, hoje, primeiroDia, diasNoMes);
  const kpisHtml = finBuildKpisPainel(atual, anterior, anteriorRef, meses);
  const conciliacao = finVisao === 'geral' ? finConciliacaoMes(mes, ano) : null;
  const conciliacaoHtml = conciliacao ? finBuildConciliacaoBancaria(conciliacao) : '';
  const cardsLaterais = finBuildSideCards(atual, dataInicioRecorte, dataFim7);
  const legenda = finLegendaAtual();
  const detalheDiaItens = finDiaDetalheAberto ? finItensDoDia(atual, finDiaDetalheAtual) : [];
  const detalheDiaAtivo = !!(finDiaDetalheAberto && finDiaDetalheAtual && detalheDiaItens.length);
  const itemEditando = finLancamentoAtual();
  const saldoModalRegistro = finSaldoModalAberto ? finSaldoBancarioPorData(finSaldoModalData) : null;
  const saldoModalDataRef = finSaldoModalAberto ? finDataIsoParaDate(finSaldoModalData) : null;
  const saldoModalAnterior = saldoModalDataRef ? finSaldoBancarioAnterior(saldoModalDataRef) : null;
  const saldoModalAnteriorData = saldoModalAnterior ? finDataIsoParaDate(saldoModalAnterior.dataReferencia) : null;
  const saldoModalSistema = saldoModalAnterior && saldoModalDataRef
    ? finValorSeguro(saldoModalAnterior.saldo) + finFluxoRealizadoEntre(saldoModalAnteriorData, saldoModalDataRef)
    : null;
  const tipoModal = finModalTipoAtual();
  const categoriaModal = itemEditando ? (itemEditando.categoria || '') : (finCategoriasPorTipo(tipoModal)[0] || '');
  const statusModal = itemEditando ? statusLancamentoFinanceiroNormalizado(itemEditando.status) : 'previsto';
  const actionLabel = finVisao === 'saidas' ? 'Nova saida' : finVisao === 'entradas' ? 'Nova entrada' : 'Novo lancamento';
  const podeEscolherTipo = !itemEditando && finVisao === 'geral';
  const comprovanteModalAtual = finComprovanteModalAtual(itemEditando);
  const tituloModal = itemEditando
    ? (finModalBaixaRapida
      ? (tipoModal === 'saida' ? 'Registrar pagamento' : 'Registrar recebimento')
      : 'Editar lancamento do caixa')
    : actionLabel;
  const tituloPainel = finVisao === 'dre'
    ? `${zUiText('Financeiro')} · ${zUiText('DRE')} · ${zUiText(dreMeta && dreMeta.etiqueta || '')}`
    : `${zUiText('Financeiro')} · ${zUiText(meses[mes])} ${ano}`;
  const subtituloPainel = finVisao === 'dre'
    ? zUiText(finSubtituloVisao())
    : zUiText(finSubtituloVisao());
  const filtroDrePeriodoHtml = finVisao === 'dre'
    ? (dreMeta.escopo === 'mes'
      ? `<select onchange="finDreSetIndice(this.value)">${meses.map((item, idx) => `<option value="${idx + 1}" ${dreMeta.indice === idx + 1 ? 'selected' : ''}>${zUiText(item)}</option>`).join('')}</select>`
      : dreMeta.escopo === 'trimestre'
        ? `<select onchange="finDreSetIndice(this.value)">
            <option value="1" ${dreMeta.indice === 1 ? 'selected' : ''}>${zUiText('1º trimestre')}</option>
            <option value="2" ${dreMeta.indice === 2 ? 'selected' : ''}>${zUiText('2º trimestre')}</option>
            <option value="3" ${dreMeta.indice === 3 ? 'selected' : ''}>${zUiText('3º trimestre')}</option>
            <option value="4" ${dreMeta.indice === 4 ? 'selected' : ''}>${zUiText('4º trimestre')}</option>
          </select>`
        : dreMeta.escopo === 'semestre'
          ? `<select onchange="finDreSetIndice(this.value)">
              <option value="1" ${dreMeta.indice === 1 ? 'selected' : ''}>${zUiText('1º semestre')}</option>
              <option value="2" ${dreMeta.indice === 2 ? 'selected' : ''}>${zUiText('2º semestre')}</option>
            </select>`
          : '')
    : '';
  const filtroBarHtml = finVisao === 'dre'
    ? `
      <div class="fcal-filterbar dre-toolbar">
        <div class="fcal-filter-group">
          <div class="dre-scope-switch">
            ${finDreEscopos().map(item => `<button class="${finDreEscopo === item.id ? 'active' : ''}" type="button" onclick="finDreSetEscopo('${item.id}')">${zUiText(item.label)}</button>`).join('')}
          </div>
          <select onchange="finDreSetAno(this.value)">
            ${anosDre.map(item => `<option value="${item}" ${item === finAnoAtual ? 'selected' : ''}>${item}</option>`).join('')}
          </select>
          ${filtroDrePeriodoHtml}
          <select onchange="finSetFiltro('unidade', this.value)">
            <option value="">${zUiText('Todas as unidades')}</option>
            ${unidades.map(item => `<option value="${finEscapeAttr(item)}" ${finFiltroUnidade === item ? 'selected' : ''}>${zUiText(item)}</option>`).join('')}
          </select>
        </div>
        <div class="fcal-filter-right">
          <div class="fcal-filter-meta">${zUiText(`${movimentacoesVisiveis.length} movimentos realizados no recorte`)}</div>
          <button class="fcal-add-btn" type="button" onclick="finExportarDreExcel()">${zUiText('⬇ Excel DRE')}</button>
        </div>
      </div>`
    : `
      <div class="fcal-filterbar">
        <div class="fcal-filter-group">
          <select onchange="finSetFiltro('unidade', this.value)">
            <option value="">${zUiText('Todas as unidades')}</option>
            ${unidades.map(item => `<option value="${finEscapeAttr(item)}" ${finFiltroUnidade === item ? 'selected' : ''}>${zUiText(item)}</option>`).join('')}
          </select>
          <select onchange="finSetFiltro('situacao', this.value)">
            <option value="">${zUiText('Todas as situacoes')}</option>
            <option value="realizado" ${finFiltroSituacao === 'realizado' ? 'selected' : ''}>${zUiText(finRotuloFiltroSituacao('realizado'))}</option>
            <option value="previsto" ${finFiltroSituacao === 'previsto' ? 'selected' : ''}>${zUiText(finRotuloFiltroSituacao('previsto'))}</option>
            <option value="atrasado" ${finFiltroSituacao === 'atrasado' ? 'selected' : ''}>${zUiText(finRotuloFiltroSituacao('atrasado'))}</option>
          </select>
          <select onchange="finSetFiltro('categoria', this.value)">
            <option value="">${zUiText('Todas as categorias')}</option>
            ${categorias.map(item => `<option value="${finEscapeAttr(item)}" ${finFiltroCategoria === item ? 'selected' : ''}>${zUiText(item)}</option>`).join('')}
          </select>
          <select onchange="finSetFiltro('faixa', this.value)">
            <option value="">${zUiText('Todas as faixas')}</option>
            <option value="ate5" ${finFiltroFaixa === 'ate5' ? 'selected' : ''}>${zUiText('Ate R$ 5k')}</option>
            <option value="5a10" ${finFiltroFaixa === '5a10' ? 'selected' : ''}>${zUiText('R$ 5k a R$ 10k')}</option>
            <option value="10a20" ${finFiltroFaixa === '10a20' ? 'selected' : ''}>${zUiText('R$ 10k a R$ 20k')}</option>
            <option value="20mais" ${finFiltroFaixa === '20mais' ? 'selected' : ''}>${zUiText('Acima de R$ 20k')}</option>
          </select>
        </div>
        <div class="fcal-filter-right">
          <div class="fcal-filter-meta">${zUiText(`${movimentacoesVisiveis.length} movimentacoes no recorte`)}</div>
          <button class="fcal-add-btn" onclick="finAbrirModalLancamento('${finEscapeAttr(finTipoPadraoNovaAcao() || 'entrada')}')">+ ${zUiText(actionLabel)}</button>
        </div>
      </div>`;
  const conteudoPrincipalHtml = finVisao === 'dre'
    ? `
      <div class="fcal-kpis">${finDreBuildKpis(dreDados)}</div>
      <div class="fcal-board dre-board">
        <div class="dre-main-wrap">${finDreBuildTabela(dreDados)}</div>
        <div class="fcal-side-wrap dre-side-wrap">${finDreBuildSide(dreDados)}</div>
      </div>`
    : `
      <div class="fcal-kpis">${kpisHtml}</div>
      ${conciliacaoHtml}
      <div class="fcal-board">
        <div class="fcal-calendar-card">
          <div class="fcal-grid-header">${diasSemana.map(item => `<div class="fcal-dow">${zUiText(item)}</div>`).join('')}</div>
          <div class="fcal-grid">${calendarioHtml}</div>
          <div class="fcal-legend">
            ${legenda.map(item => `<span><span class="fcal-leg-dot" style="${finLegendaStyle(item.classe)}"></span>${zUiText(item.label)}</span>`).join('')}
          </div>
        </div>
        <div class="fcal-side-wrap">${cardsLaterais}</div>
      </div>`;

  alvo.innerHTML = `
  <style>
    .fcal-wrap{display:flex;flex-direction:column;gap:10px;min-height:100%;padding:0;background:transparent;}
    .fcal-header{display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:center;gap:10px;background:rgba(255,255,255,0.96);border:1px solid var(--bd);border-radius:14px;padding:14px 16px;box-shadow:0 10px 24px rgba(184,144,42,0.06);}
    .fcal-title{font-family:'Playfair Display',serif;font-size:18px;font-weight:700;color:var(--gold);line-height:1.08;}
    .fcal-title-wrap{display:flex;flex-direction:column;gap:4px;min-width:0;}
    .fcal-title-sub{font-size:10px;color:var(--tm);line-height:1.4;}
    .fcal-segment{display:inline-flex;align-items:center;gap:4px;padding:5px;background:rgba(255,248,232,0.9);border:1px solid var(--gold-bd);border-radius:999px;justify-self:center;flex-wrap:wrap;max-width:100%;scrollbar-width:thin;}
    .fcal-segment button{background:transparent;border:none;border-radius:999px;padding:7px 12px;cursor:pointer;font-size:10px;font-weight:700;color:var(--tm);font-family:'Inter',sans-serif;white-space:nowrap;}
    .fcal-segment button.active{background:#fff;border:1px solid rgba(184,144,42,0.2);color:var(--gold);box-shadow:0 6px 16px rgba(184,144,42,0.08);}
    .fcal-nav{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;min-width:0;}
    .fcal-nav button{background:var(--bg);border:1px solid var(--bd);border-radius:8px;padding:7px 12px;cursor:pointer;font-size:11px;color:var(--ts);font-family:'Inter',sans-serif;white-space:nowrap;}
    .fcal-nav button:hover{border-color:var(--gold);color:var(--gold);}
    .fcal-nav .today{background:var(--gold-bg);border-color:var(--gold-bd);color:var(--gold);}
    .fcal-filterbar{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;background:rgba(255,255,255,0.96);border:1px solid var(--bd);border-radius:12px;padding:10px 12px;box-shadow:0 10px 24px rgba(184,144,42,0.05);}
    .fcal-filter-group{display:flex;gap:8px;flex-wrap:wrap;flex:1;}
    .fcal-filter-group select{flex:1 1 142px;min-width:136px;max-width:100%;background:var(--bg2);border:1px solid var(--bd);border-radius:8px;padding:8px 10px;font-size:11px;color:var(--ts);outline:none;font-family:'Inter',sans-serif;}
    .fcal-filter-group select:focus{border-color:var(--gold-l);}
    .fcal-filter-right{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:flex-end;}
    .fcal-filter-meta{font-size:10px;color:var(--tm);}
    .fcal-add-btn{background:linear-gradient(180deg,#FFF9EC 0%,#FFF1CF 100%);border:1px solid var(--gold-bd);border-radius:999px;padding:9px 14px;font-size:11px;font-weight:700;color:var(--gold);cursor:pointer;font-family:'Inter',sans-serif;}
    .fcal-add-btn:hover{transform:translateY(-1px);box-shadow:0 8px 18px rgba(184,144,42,0.08);}
    .dre-toolbar .fcal-filter-group{align-items:center;}
    .dre-scope-switch{display:inline-flex;align-items:center;gap:4px;padding:4px;background:rgba(255,248,232,0.9);border:1px solid var(--gold-bd);border-radius:999px;flex-wrap:wrap;scrollbar-width:thin;}
    .dre-scope-switch button{background:transparent;border:none;border-radius:999px;padding:7px 11px;font-size:10px;font-weight:700;color:var(--tm);cursor:pointer;font-family:'Inter',sans-serif;}
    .dre-scope-switch button.active{background:#fff;border:1px solid rgba(184,144,42,0.2);color:var(--gold);box-shadow:0 5px 14px rgba(184,144,42,0.08);}
    .fcal-kpis{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px;}
    .fcal-kpi{position:relative;overflow:hidden;background:rgba(255,255,255,0.96);border:1px solid var(--bd);border-radius:14px;padding:13px 14px 12px;box-shadow:0 10px 24px rgba(184,144,42,0.05);min-height:102px;display:flex;flex-direction:column;justify-content:space-between;}
    .fcal-kpi::before{content:'';position:absolute;left:0;top:0;bottom:0;width:4px;background:rgba(184,144,42,0.18);}
    .fcal-kpi::after{content:'';position:absolute;right:-18px;top:-20px;width:74px;height:74px;border-radius:50%;background:rgba(184,144,42,0.05);}
    .fcal-kpi.tone-projected{background:linear-gradient(180deg,#FFFDF7 0%,#FEF8EA 100%);}
    .fcal-kpi.tone-projected::before{background:#D4A840;}
    .fcal-kpi.tone-realized{background:linear-gradient(180deg,#F7FDF9 0%,#EEF8F2 100%);}
    .fcal-kpi.tone-realized::before{background:#2E9E6E;}
    .fcal-kpi.tone-outflow{background:linear-gradient(180deg,#FFF9F7 0%,#FEF1EC 100%);}
    .fcal-kpi.tone-outflow::before{background:#D65145;}
    .fcal-kpi.tone-paid{background:linear-gradient(180deg,#FFFDF7 0%,#FFF6E4 100%);}
    .fcal-kpi.tone-paid::before{background:#B8902A;}
    .fcal-kpi.tone-total{background:linear-gradient(180deg,#F8FBFF 0%,#EEF4FF 100%);}
    .fcal-kpi.tone-total::before{background:#3060B8;}
    .fcal-kpi.tone-balance{background:linear-gradient(180deg,#F9FCFF 0%,#F3F8FF 100%);}
    .fcal-kpi.tone-balance::before{background:#7C9FDD;}
    .fcal-kpi.tone-compare{background:linear-gradient(180deg,#FFFEFB 0%,#FFF8EE 100%);}
    .fcal-kpi.tone-compare::before{background:#C8A03A;}
    .fcal-kpi.tone-progress{background:linear-gradient(180deg,#FFFEFA 0%,#FFF9F0 100%);}
    .fcal-kpi.tone-progress::before{background:#B8902A;}
    .fcal-kpi.tone-neutral::before{background:rgba(184,144,42,0.28);}
    .fcal-kpi-l{position:relative;z-index:1;font-size:9px;text-transform:uppercase;letter-spacing:0.11em;color:var(--tm);font-weight:800;margin-bottom:7px;}
    .fcal-kpi-v{position:relative;z-index:1;font-size:19px;font-weight:700;font-family:'Playfair Display',serif;line-height:1.02;}
    .fcal-kpi-s{position:relative;z-index:1;font-size:10px;color:var(--tm);margin-top:6px;line-height:1.45;max-width:24ch;}
    .fcal-kpi-s.good{color:#2E9E6E;}
    .fcal-kpi-s.bad{color:#C05030;}
    .fin-recon-card{background:linear-gradient(135deg,#17140D 0%,#211B0F 100%);border:1px solid rgba(218,174,65,.35);border-radius:16px;padding:16px;color:#fff;box-shadow:0 14px 30px rgba(50,35,5,.14);}
    .fin-recon-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:14px;}
    .fin-recon-title-wrap{min-width:0;}
    .fin-recon-kicker{font-size:9px;font-weight:800;letter-spacing:.14em;color:#E6BD55;margin-bottom:5px;}
    .fin-recon-title{font-family:'Playfair Display',serif;font-size:20px;font-weight:700;color:#FFF6DE;line-height:1.1;}
    .fin-recon-copy{font-size:10px;color:rgba(255,255,255,.62);line-height:1.5;margin-top:5px;max-width:660px;}
    .fin-recon-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-wrap:wrap;}
    .fin-recon-status{display:inline-flex;align-items:center;min-height:28px;padding:5px 9px;border-radius:999px;font-size:9px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.07);color:#F7E8BD;white-space:nowrap;}
    .fin-recon-status.ok{color:#8BE0B4;background:rgba(46,158,110,.13);border-color:rgba(83,197,145,.32);}
    .fin-recon-status.warn{color:#FFB39D;background:rgba(192,80,48,.15);border-color:rgba(220,111,79,.34);}
    .fin-recon-status.pending,.fin-recon-status.setup{color:#F0D27D;background:rgba(218,174,65,.12);border-color:rgba(218,174,65,.28);}
    .fin-recon-primary,.fin-recon-secondary{min-height:32px;padding:7px 11px;border-radius:999px;font:700 10px 'Inter',sans-serif;cursor:pointer;white-space:nowrap;}
    .fin-recon-primary{color:#241B08;background:linear-gradient(180deg,#F7D878 0%,#D9AC3C 100%);border:1px solid #E9C35D;}
    .fin-recon-secondary{color:#F2D783;background:transparent;border:1px solid rgba(218,174,65,.38);}
    .fin-recon-primary:hover,.fin-recon-secondary:hover{transform:translateY(-1px);filter:brightness(1.04);}
    .fin-recon-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;}
    .fin-recon-metric{min-width:0;padding:11px 12px;border:1px solid rgba(255,255,255,.09);border-radius:11px;background:rgba(255,255,255,.045);}
    .fin-recon-metric.system{background:rgba(218,174,65,.08);border-color:rgba(218,174,65,.2);}
    .fin-recon-metric.bank{background:rgba(49,96,184,.11);border-color:rgba(91,135,216,.25);}
    .fin-recon-metric.matched{background:rgba(46,158,110,.11);border-color:rgba(83,197,145,.25);}
    .fin-recon-metric.difference{background:rgba(192,80,48,.12);border-color:rgba(220,111,79,.28);}
    .fin-recon-label{font-size:8px;text-transform:uppercase;letter-spacing:.11em;color:rgba(255,255,255,.5);font-weight:800;}
    .fin-recon-value{font-family:'Playfair Display',serif;font-size:18px;font-weight:700;color:#FFF6DE;line-height:1.12;margin-top:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .fin-recon-metric.bank .fin-recon-value{color:#B9D3FF;}
    .fin-recon-metric.matched .fin-recon-value{color:#8BE0B4;}
    .fin-recon-metric.difference .fin-recon-value{color:#FFB39D;}
    .fin-recon-metric.muted .fin-recon-value{color:rgba(255,255,255,.46);}
    .fin-recon-detail{font-size:8px;color:rgba(255,255,255,.48);line-height:1.4;margin-top:5px;min-height:22px;}
    .fin-balance-modal{max-width:560px !important;}
    .fin-balance-summary{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:12px;border-radius:12px;background:linear-gradient(180deg,#FFFDF7 0%,#FFF8E9 100%);border:1px solid var(--gold-bd);}
    .fin-balance-summary-item{display:flex;flex-direction:column;gap:4px;}
    .fin-balance-summary-item span{font-size:9px;text-transform:uppercase;letter-spacing:.09em;color:var(--tm);font-weight:800;}
    .fin-balance-summary-item strong{font-family:'Playfair Display',serif;font-size:18px;color:var(--gold);}
    .fcal-board{display:grid;grid-template-columns:minmax(0,1.58fr) minmax(240px,0.72fr);gap:10px;align-items:start;min-height:0;}
    .fcal-calendar-card,.fcal-side-wrap{background:rgba(255,255,255,0.96);border:1px solid var(--bd);border-radius:14px;box-shadow:0 10px 24px rgba(184,144,42,0.05);}
    .fcal-calendar-card{padding:10px;display:flex;flex-direction:column;gap:6px;min-height:0;overflow:hidden;}
    .fcal-grid-header{display:grid;grid-template-columns:repeat(7,1fr);gap:3px;margin-bottom:2px;}
    .fcal-dow{text-align:center;font-size:9px;font-weight:700;color:var(--tm);text-transform:uppercase;padding:4px 0;}
    .fcal-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));grid-auto-rows:minmax(86px,auto);gap:3px;min-height:0;}
    .fcal-cell{background:linear-gradient(180deg,#fff 0%,#FEFCF6 100%);border:1px solid rgba(184,144,42,0.18);border-radius:10px;padding:6px;min-height:86px;display:flex;flex-direction:column;gap:5px;overflow:hidden;}
    .fcal-cell.fcal-empty{background:transparent;border-color:transparent;box-shadow:none;}
    .fcal-cell.fcal-hoje{border-color:var(--gold);box-shadow:0 0 0 1px rgba(184,144,42,0.2);}
    .fcal-cell.fcal-cell-clickable{cursor:pointer;transition:border-color .12s ease,box-shadow .12s ease,transform .12s ease;}
    .fcal-cell.fcal-cell-clickable:hover{border-color:rgba(184,144,42,0.34);box-shadow:0 10px 22px rgba(184,144,42,0.08);transform:translateY(-1px);}
    .fcal-headline{display:flex;align-items:center;justify-content:space-between;gap:8px;}
    .fcal-num{font-size:11px;font-weight:700;color:var(--tm);}
    .fcal-num-hoje{color:var(--gold);}
    .fcal-day-total{font-size:8px;font-weight:700;color:var(--gold);background:var(--gold-bg);padding:2px 5px;border-radius:999px;border:1px solid var(--gold-bd);white-space:nowrap;}
    .fcal-day-total.pos{color:#2E9E6E;background:#F1FAF4;border-color:#B8DEC8;}
    .fcal-day-total.neg{color:#C05030;background:#FEF3EE;border-color:#E7C0B4;}
    .fcal-events{display:flex;flex-direction:column;gap:4px;min-height:0;overflow:hidden;}
    .fcal-ev{background:#fff;border:1px solid rgba(184,144,42,0.16);border-left:3px solid transparent;border-radius:9px;padding:5px 6px;display:flex;flex-direction:column;gap:3px;cursor:pointer;transition:transform .12s ease,box-shadow .12s ease,opacity .12s ease;min-height:0;box-shadow:inset 0 1px 0 rgba(255,255,255,0.7);}
    .fcal-ev:hover{transform:translateY(-1px);box-shadow:0 6px 18px rgba(184,144,42,0.08);}
    .fcal-ev-ok{background:#EBF8F1;border-left-color:#15803D;}
    .fcal-ev-soon{background:#EEF5FF;border-left-color:#7DB3FF;}
    .fcal-ev-invoice{background:#E7F0FF;border-left-color:#1D4ED8;}
    .fcal-ev-delay{background:#FFF4E5;border-left-color:#D97706;}
    .fcal-ev-out{background:#FFF0EE;border-left-color:#D65145;}
    .fcal-ev-paid{background:#EFF8F0;border-left-color:#2F8F5B;}
    .fcal-ev-out-delay{background:#FAD9D5;border-left-color:#B42318;}
    .fcal-ev-top{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;}
    .fcal-ev-top strong{font-size:10px;color:var(--gold);line-height:1.1;white-space:nowrap;}
    .fcal-ev-ok .fcal-ev-top strong{color:#15803D;}
    .fcal-ev-soon .fcal-ev-top strong{color:#4A86E8;}
    .fcal-ev-invoice .fcal-ev-top strong{color:#1D4ED8;}
    .fcal-ev-delay .fcal-ev-top strong{color:#D97706;}
    .fcal-ev-out .fcal-ev-top strong{color:#D65145;}
    .fcal-ev-paid .fcal-ev-top strong{color:#2F8F5B;}
    .fcal-ev-out-delay .fcal-ev-top strong{color:#B42318;}
    .fcal-ev-status{display:inline-flex;align-items:center;min-height:18px;padding:1px 5px;border-radius:999px;background:rgba(184,144,42,0.1);font-size:7px;text-transform:uppercase;letter-spacing:0.08em;color:var(--tm);font-weight:700;white-space:nowrap;}
    .fcal-ev-ok .fcal-ev-status{background:#DDF3E5;color:#15803D;}
    .fcal-ev-soon .fcal-ev-status{background:#DCEBFF;color:#4A86E8;}
    .fcal-ev-invoice .fcal-ev-status{background:#D9E8FF;color:#1D4ED8;}
    .fcal-ev-delay .fcal-ev-status{background:#FDE9CC;color:#D97706;}
    .fcal-ev-out .fcal-ev-status{background:#FCD9D4;color:#D65145;}
    .fcal-ev-paid .fcal-ev-status{background:#DCEFE1;color:#2F8F5B;}
    .fcal-ev-out-delay .fcal-ev-status{background:#F6C2BC;color:#B42318;}
    .fcal-ev-name{font-size:9px;font-weight:700;color:var(--tx);line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .fcal-ev-meta{font-size:8px;color:var(--tm);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .fcal-more{font-size:8px;color:var(--tm);padding-top:1px;background:transparent;border:none;text-align:left;cursor:pointer;font-family:'Inter',sans-serif;}
    .fcal-more:hover{color:var(--gold);}
    .fcal-side-wrap{padding:12px;display:flex;flex-direction:column;gap:10px;min-height:0;overflow:auto;}
    .fcal-side-card{border:1px solid rgba(184,144,42,0.16);border-radius:14px;padding:12px;background:linear-gradient(180deg,#fff 0%,#FEFCF6 100%);box-shadow:inset 0 1px 0 rgba(255,255,255,0.7);}
    .fcal-side-title{font-size:10px;text-transform:uppercase;letter-spacing:0.11em;color:var(--gold);font-weight:800;}
    .fcal-side-sub{font-size:9px;color:var(--tm);margin-top:4px;line-height:1.55;max-width:27ch;}
    .fcal-side-list{display:flex;flex-direction:column;gap:8px;margin-top:10px;}
    .fcal-side-item-wrap{display:flex;flex-direction:column;gap:7px;}
    .fcal-side-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
    .fcal-side-item{background:var(--bg2);border:1px solid rgba(184,144,42,0.14);border-left:3px solid transparent;border-radius:10px;padding:10px 11px;text-align:left;cursor:pointer;transition:transform .12s ease,box-shadow .12s ease;}
    .fcal-side-item:hover{transform:translateY(-1px);box-shadow:0 6px 16px rgba(184,144,42,0.07);}
    .fcal-side-item.ok{border-left-color:#15803D;background:#EBF8F1;}
    .fcal-side-item.soon{border-left-color:#7DB3FF;background:#EEF5FF;}
    .fcal-side-item.invoice{border-left-color:#1D4ED8;background:#E7F0FF;}
    .fcal-side-item.delay{border-left-color:#D97706;background:#FFF4E5;}
    .fcal-side-item.out{border-left-color:#D65145;background:#FFF0EE;}
    .fcal-side-item.paid{border-left-color:#2F8F5B;background:#EFF8F0;}
    .fcal-side-item.out-delay{border-left-color:#B42318;background:#FAD9D5;}
    .fcal-side-item-top{display:flex;align-items:center;justify-content:space-between;gap:10px;}
    .fcal-side-item-top strong{font-size:10px;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .fcal-side-item-top span{font-size:9px;font-weight:700;color:var(--gold);white-space:nowrap;}
    .fcal-side-item.ok .fcal-side-item-top span{color:#15803D;}
    .fcal-side-item.soon .fcal-side-item-top span{color:#4A86E8;}
    .fcal-side-item.invoice .fcal-side-item-top span{color:#1D4ED8;}
    .fcal-side-item.delay .fcal-side-item-top span{color:#D97706;}
    .fcal-side-item.out .fcal-side-item-top span{color:#D65145;}
    .fcal-side-item.paid .fcal-side-item-top span{color:#2F8F5B;}
    .fcal-side-item.out-delay .fcal-side-item-top span{color:#B42318;}
    .fcal-side-item-meta{font-size:8px;color:var(--tm);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .fcal-side-action-btn{align-self:flex-start;display:inline-flex;align-items:center;justify-content:center;background:#fff;border:1px solid var(--gold-bd);border-radius:999px;padding:6px 10px;font-size:9px;font-weight:700;color:var(--gold);cursor:pointer;font-family:'Inter',sans-serif;}
    .fcal-side-action-btn.secondary{color:var(--ts);border-color:rgba(184,144,42,0.22);}
    .fcal-side-action-btn:hover{background:var(--gold-bg);}
    .fcal-empty-state{font-size:10px;color:var(--tm);padding:6px 0 2px;}
    .fcal-legend{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;font-size:10px;color:var(--tm);padding-top:2px;}
    .fcal-leg-dot{width:10px;height:10px;border-radius:3px;display:inline-block;margin-right:4px;}
    .dre-board{grid-template-columns:minmax(0,1.7fr) minmax(270px,0.82fr);}
    .dre-main-wrap{min-width:0;}
    .dre-card{background:rgba(255,255,255,0.96);border:1px solid var(--bd);border-radius:16px;box-shadow:0 10px 24px rgba(184,144,42,0.05);overflow:hidden;}
    .dre-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding:16px 18px;border-bottom:1px solid rgba(184,144,42,0.1);background:linear-gradient(180deg,#FFFDF7 0%,#FDF8EE 100%);}
    .dre-card-kicker{font-size:9px;text-transform:uppercase;letter-spacing:0.14em;color:var(--tm);font-weight:800;margin-bottom:4px;}
    .dre-card-title{font-family:'Playfair Display',serif;font-size:24px;line-height:1;color:var(--gold);}
    .dre-card-copy{max-width:320px;font-size:10px;color:var(--tm);line-height:1.55;text-align:right;}
    .dre-table-wrap{padding:8px 10px 12px;}
    .dre-table{width:100%;border-collapse:separate;border-spacing:0 6px;}
    .dre-table th{position:static;background:transparent;border:none;padding:0 12px 4px;font-size:9px;letter-spacing:0.1em;color:var(--tm);}
    .dre-table td{padding:10px 12px;border:none;background:#fff;}
    .dre-table tbody tr td:first-child{border-top-left-radius:10px;border-bottom-left-radius:10px;}
    .dre-table tbody tr td:last-child{border-top-right-radius:10px;border-bottom-right-radius:10px;text-align:right;font-weight:700;white-space:nowrap;}
    .dre-row td{box-shadow:inset 0 0 0 1px rgba(184,144,42,0.12);}
    .dre-section td{background:linear-gradient(180deg,#FFFDF8 0%,#FEF8EC 100%);font-weight:800;color:#8B6C1A;}
    .dre-group td{background:#FCFBF7;font-weight:700;}
    .dre-account td{background:#fff;font-size:11px;}
    .dre-result td{background:linear-gradient(180deg,#FAFCFF 0%,#F3F8FF 100%);font-weight:800;}
    .dre-result.subtotal td{color:#315EAE;}
    .dre-result.liquido td{background:linear-gradient(180deg,#F7FDF9 0%,#EEF8F2 100%);}
    .dre-result.caixa td{background:linear-gradient(180deg,#FFFDF7 0%,#FFF6E4 100%);}
    .dre-indent{display:inline-block;}
    .dre-indent-1{padding-left:14px;}
    .dre-indent-2{padding-left:30px;color:var(--ts);font-weight:500;}
    .dre-mini-list{display:flex;flex-direction:column;gap:8px;margin-top:10px;}
    .dre-mini-item{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:9px 10px;border-radius:10px;background:var(--bg2);border:1px solid rgba(184,144,42,0.1);}
    .dre-mini-main{min-width:0;display:flex;flex-direction:column;gap:3px;}
    .dre-mini-main strong{font-size:10px;color:var(--tx);line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .dre-mini-main span{font-size:8px;color:var(--tm);line-height:1.45;}
    .dre-mini-item b{font-size:10px;white-space:nowrap;color:var(--gold);}
    .dre-mini-item b.good{color:#2E9E6E;}
    .dre-mini-item b.bad{color:#C05030;}
    .dre-side-wrap{padding-top:0;}
    .fin-modal{max-width:620px !important;}
    .fin-modal-body{display:flex;flex-direction:column;gap:12px;padding:18px;max-height:72vh;overflow-y:auto;}
    .fin-inline-help{font-size:10px;color:var(--tm);line-height:1.5;}
    .fin-category-tools{display:flex;align-items:center;justify-content:flex-start;margin-top:8px;}
    .fin-category-new{display:none;flex-direction:column;gap:8px;margin-top:10px;padding:10px 12px;border:1px dashed rgba(184,144,42,0.28);border-radius:10px;background:linear-gradient(180deg,#FFFDF7 0%,#FEF8EA 100%);}
    .fin-category-new input{background:#fff;border:1px solid rgba(184,144,42,0.18);border-radius:8px;padding:9px 10px;font-size:12px;color:var(--tx);outline:none;font-family:'Inter',sans-serif;}
    .fin-category-new input:focus{border-color:var(--gold-l);}
    .fin-modal-chip{display:inline-flex;align-items:center;min-height:42px;padding:0 12px;border-radius:10px;background:var(--bg2);border:1px solid var(--bd);font-size:12px;color:var(--ts);font-weight:600;}
    .fin-modal-note{font-size:10px;color:var(--tm);background:var(--gold-bg);border:1px solid var(--gold-bd);border-radius:10px;padding:10px 12px;line-height:1.5;}
    .fin-proof-card{display:flex;flex-direction:column;gap:10px;padding:12px;border:1px dashed rgba(184,144,42,0.3);border-radius:12px;background:linear-gradient(180deg,#FFFDF7 0%,#FEF8EA 100%);}
    .fin-proof-top{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;flex-wrap:wrap;}
    .fin-proof-title{font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:var(--gold);font-weight:700;}
    .fin-proof-badge{display:inline-flex;align-items:center;max-width:100%;padding:7px 10px;border-radius:999px;background:#fff;border:1px solid rgba(184,144,42,0.16);font-size:10px;color:var(--ts);line-height:1.4;}
    .fin-proof-actions{display:flex;gap:8px;flex-wrap:wrap;}
    .fin-proof-remove{border-color:#E0B6AE;color:#C05030;}
    .fin-day-modal{max-width:680px !important;width:min(680px,calc(100vw - 24px));max-height:min(78vh,720px);display:flex;flex-direction:column;}
    .fin-day-modal-body{display:flex;flex-direction:column;gap:12px;padding:18px;max-height:72vh;overflow-y:auto;}
    .fin-day-summary{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:12px;border:1px solid var(--bd);border-radius:12px;background:linear-gradient(180deg,#FFFEFB 0%,#FFF8ED 100%);}
    .fin-day-summary-copy{display:flex;flex-direction:column;gap:3px;min-width:0;flex:1;}
    .fin-day-summary-kicker{font-size:10px;font-weight:800;letter-spacing:.11em;text-transform:uppercase;color:var(--tm);}
    .fin-day-summary-sub{font-size:11px;color:var(--tm);line-height:1.4;}
    .fin-day-summary-total{font-family:'Playfair Display',serif;font-size:24px;font-weight:700;color:var(--gold);text-align:right;}
    .fin-day-list{display:flex;flex-direction:column;gap:10px;}
    .fin-day-item{display:flex;flex-direction:column;gap:8px;}
    .fin-day-item-main{width:100%;text-align:left;border:1px solid var(--bd);border-left:4px solid transparent;border-radius:12px;padding:12px;background:#fff;display:flex;flex-direction:column;gap:6px;cursor:pointer;transition:transform .12s ease,box-shadow .12s ease,border-color .12s ease;font-family:'Inter',sans-serif;}
    .fin-day-item-main:hover{transform:translateY(-1px);box-shadow:0 10px 24px rgba(184,144,42,0.08);}
    .fin-day-item-top{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;}
    .fin-day-item-top strong{font-family:'Playfair Display',serif;font-size:19px;line-height:1;color:var(--gold);}
    .fin-day-item-status{display:inline-flex;align-items:center;min-height:20px;padding:2px 7px;border-radius:999px;font-size:9px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;background:rgba(184,144,42,0.1);color:var(--tm);}
    .fin-day-item-name{font-size:13px;font-weight:800;color:var(--ts);line-height:1.25;}
    .fin-day-item-meta{font-size:10px;color:var(--tm);line-height:1.45;}
    .fin-day-item-note{font-size:11px;color:var(--ts);line-height:1.45;padding-top:2px;border-top:1px dashed rgba(184,144,42,0.2);}
    .fin-day-item-paid .fin-day-item-main{background:#F3FAF5;border-left-color:#2F8F5B;}
    .fin-day-item-out .fin-day-item-main{background:#FFF6F3;border-left-color:#D65145;}
    .fin-day-item-out-delay .fin-day-item-main{background:#FBE0DC;border-left-color:#B42318;}
    .fin-day-item-ok .fin-day-item-main{background:#F0FAF4;border-left-color:#15803D;}
    .fin-day-item-soon .fin-day-item-main{background:#F3F8FF;border-left-color:#7DB3FF;}
    .fin-day-item-invoice .fin-day-item-main{background:#EBF2FF;border-left-color:#1D4ED8;}
    .fin-day-item-delay .fin-day-item-main{background:#FFF4E5;border-left-color:#D97706;}
    .fin-day-item-paid .fin-day-item-top strong{color:#2F8F5B;}
    .fin-day-item-out .fin-day-item-top strong{color:#D65145;}
    .fin-day-item-out-delay .fin-day-item-top strong{color:#B42318;}
    .fin-day-item-paid .fin-day-item-status{background:#DCEFE1;color:#2F8F5B;}
    .fin-day-item-out .fin-day-item-status{background:#FCD9D4;color:#D65145;}
    .fin-day-item-out-delay .fin-day-item-status{background:#F6C2BC;color:#B42318;}
    .fin-modal-actions{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;}
    .fin-delete-btn{background:#fff;border:1px solid #E0B6AE;border-radius:999px;padding:8px 12px;font-size:10px;color:#C05030;cursor:pointer;font-family:'Inter',sans-serif;}
    @media (max-width:1260px){
      .fcal-filter-group select{flex-basis:128px;min-width:124px;}
      .fcal-board{grid-template-columns:minmax(0,1.48fr) minmax(216px,0.68fr);}
    }
    @media (max-width:1100px){
      .fcal-kpis{grid-template-columns:repeat(3,minmax(0,1fr));}
      .fin-recon-grid{grid-template-columns:repeat(3,minmax(0,1fr));}
    }
    @media (max-width:1040px){
      .fcal-header{grid-template-columns:1fr;}
      .fcal-segment{justify-self:start;}
      .fcal-nav{justify-content:flex-start;}
      .fcal-filterbar{align-items:flex-start;}
      .fcal-board{grid-template-columns:minmax(0,1.42fr) minmax(204px,0.64fr);}
    }
    @media (max-width:980px){
      .fcal-board{grid-template-columns:1fr;}
      .fcal-grid{grid-template-columns:repeat(2,1fr);}
      .fcal-grid-header{display:none;}
    }
    @media (max-width:920px){
      .fcal-header{padding:12px 14px;}
      .fcal-segment,.dre-scope-switch{justify-self:stretch;width:100%;flex-wrap:nowrap;overflow-x:auto;overflow-y:hidden;}
      .fcal-nav{width:100%;justify-content:flex-start;}
      .fcal-filterbar{padding:10px;}
      .fcal-filter-group,.fcal-filter-right{width:100%;}
      .fcal-filter-right{justify-content:space-between;}
      .fcal-side-wrap{padding:10px;}
      .fcal-side-item-top{align-items:flex-start;flex-direction:column;}
      .fcal-legend{justify-content:flex-start;}
      .fin-day-modal{width:calc(100vw - 20px);}
    }
    @media (max-height:900px){
      .fcal-wrap{gap:8px;}
      .fcal-header{padding:12px 14px;}
      .fcal-filterbar{padding:9px 11px;}
      .fcal-kpi{padding:11px 12px;}
      .fcal-kpi-v{font-size:17px;}
      .fcal-grid{grid-auto-rows:minmax(74px,auto);}
      .fcal-ev-meta{display:none;}
      .fcal-side-sub{font-size:8px;}
    }
    @media (max-height:820px){
      .fcal-title-sub{display:none;}
      .fcal-grid{grid-auto-rows:minmax(68px,auto);}
      .fcal-cell{padding:5px;gap:4px;min-height:68px;}
      .fcal-ev{padding:4px 5px;}
      .fcal-side-sub{display:none;}
      .fcal-side-wrap{gap:7px;}
    }
    @media (max-width:760px){
      .fcal-header{padding:12px;}
      .fcal-title{font-size:17px;}
      .fcal-title-sub{font-size:9px;}
      .fcal-nav button{flex:1 1 96px;}
      .fcal-filter-group select,.fcal-filter-group,.fcal-filter-right{min-width:100%;width:100%;}
      .fcal-filter-right{align-items:stretch;justify-content:flex-start;}
      .fcal-add-btn{width:100%;text-align:center;}
      .fcal-kpis{grid-template-columns:1fr;}
      .fcal-grid{grid-template-columns:1fr;}
      .fcal-cell{min-height:88px;}
      .fcal-side-actions{flex-direction:column;align-items:stretch;}
      .fcal-side-action-btn{width:100%;}
      .fin-recon-head{flex-direction:column;}
      .fin-recon-actions{width:100%;justify-content:flex-start;}
      .fin-recon-grid{grid-template-columns:1fr;}
      .fin-recon-primary,.fin-recon-secondary{flex:1 1 180px;}
      .fin-balance-summary{grid-template-columns:1fr;}
      .fin-modal-body,.fin-day-modal-body{padding:14px;}
      .fin-proof-top,.fin-day-summary,.fin-day-item-top{flex-direction:column;align-items:flex-start;}
      .fin-day-summary-total{width:100%;text-align:left;}
      .fin-proof-actions{flex-direction:column;}
      .fin-proof-actions .btn-c{width:100%;justify-content:center;}
      .fin-modal-actions{align-items:stretch;}
      .fin-modal-actions > div{width:100%;}
      .fin-modal-actions > div:last-child{justify-content:stretch;}
      .fin-modal-actions > div:last-child > button{flex:1 1 140px;}
      .fin-delete-btn{width:100%;}
    }
    @media (max-width:560px){
      .fcal-wrap{gap:8px;}
      .fcal-header{padding:10px;}
      .fcal-nav{gap:6px;}
      .fcal-nav button{padding:8px 10px;font-size:10px;}
      .fcal-filterbar{padding:9px;}
      .fcal-filter-group select{min-width:100%;}
      .fcal-calendar-card{padding:8px;}
      .fcal-cell{padding:5px;}
      .fcal-day-total{font-size:7px;}
      .fin-day-modal{width:100%;max-height:calc(100dvh - 20px);}
      .fin-day-item-top strong{font-size:18px;}
    }
  </style>
  <div class="fcal-wrap">
    <div class="fcal-header">
      <div class="fcal-title-wrap">
        <div class="fcal-title">${zUiText('Financeiro')} · ${zUiText(meses[mes])} ${ano}</div>
        <div class="fcal-title-sub">${subtituloPainel}</div>
      </div>
      <div class="fcal-segment">
        <button class="${finVisao === 'geral' ? 'active' : ''}" onclick="finSetVisao('geral')">${zUiText('Entrada / Saida')}</button>
        <button class="${finVisao === 'entradas' ? 'active' : ''}" onclick="finSetVisao('entradas')">${zUiText('Entradas')}</button>
        <button class="${finVisao === 'saidas' ? 'active' : ''}" onclick="finSetVisao('saidas')">${zUiText('Saidas')}</button>
        <button class="${finVisao === 'dre' ? 'active' : ''}" onclick="finSetVisao('dre')">${zUiText('DRE')}</button>
      </div>
      <div class="fcal-nav">
        <button onclick="finAnterior()">${zUiText('← Anterior')}</button>
        <button class="today" onclick="finHoje()">${zUiText('Hoje')}</button>
        <button onclick="finProximo()">${zUiText('Proximo →')}</button>
      </div>
    </div>

    ${filtroBarHtml}

    ${conteudoPrincipalHtml}
  </div>

  <div class="modal-backdrop${detalheDiaAtivo ? ' show' : ''}" id="m-fin-dia" onclick="finHandleBackdropDetalheDia(event)">
    <div class="modal fin-day-modal">
      <div class="modal-top">
        <div>
          <div class="modal-title">${zUiText(detalheDiaAtivo ? finTituloDetalheDia(finDiaDetalheAtual) : '')}</div>
          <div style="font-size:10px;color:var(--tm);margin-top:2px;">${zUiText(detalheDiaAtivo ? finSubtituloDetalheDia(finDiaDetalheAtual, mes, ano, detalheDiaItens) : '')}</div>
        </div>
        <button class="mclose" onclick="finFecharDetalheDia()">âœ•</button>
      </div>
      <div class="modal-body fin-day-modal-body">
        <div class="fin-day-summary">
          <div class="fin-day-summary-copy">
            <div class="fin-day-summary-kicker">${zUiText(finVisao === 'saidas' ? 'Saidas do calendario' : finVisao === 'entradas' ? 'Entradas do calendario' : 'Movimentacoes do calendario')}</div>
            <div class="fin-day-summary-sub">${zUiText(detalheDiaAtivo ? finSubtituloDetalheDia(finDiaDetalheAtual, mes, ano, detalheDiaItens) : '')}</div>
          </div>
          <div class="fin-day-summary-total">${detalheDiaAtivo ? (finVisao === 'geral' ? finFmtAssinado(finValorTotalDia(detalheDiaItens)) : finFmtMoeda(finValorTotalDia(detalheDiaItens))) : ''}</div>
        </div>
        <div class="fin-day-list">
          ${detalheDiaAtivo ? detalheDiaItens.map(item => finDetalheDiaItem(item)).join('') : ''}
        </div>
      </div>
    </div>
  </div>

  <div class="modal-backdrop${finSaldoModalAberto ? ' show' : ''}" id="m-fin-saldo" onclick="finHandleBackdropSaldoBancario(event)">
    <div class="modal fin-balance-modal">
      <div class="modal-top">
        <div>
          <div class="modal-title">${zUiText(saldoModalRegistro ? 'Atualizar saldo bancario' : 'Informar saldo bancario')}</div>
          <div style="font-size:10px;color:var(--tm);margin-top:2px;">${zUiText('Digite o saldo que aparece na conta na data da conferencia.')}</div>
        </div>
        <button class="mclose" onclick="finFecharModalSaldoBancario()">✕</button>
      </div>
      <div class="modal-body fin-modal-body">
        <div class="fin-balance-summary">
          <div class="fin-balance-summary-item">
            <span>${zUiText('Ultimo saldo anterior')}</span>
            <strong>${saldoModalAnterior ? finFmtMoeda(saldoModalAnterior.saldo) : zUiText('Nao informado')}</strong>
            <div class="fin-inline-help">${zUiText(saldoModalAnterior ? `Conferido em ${finFmtDataCurta(saldoModalAnterior.dataReferencia)}` : 'Este registro sera a base inicial das proximas conciliacoes.')}</div>
          </div>
          <div class="fin-balance-summary-item">
            <span>${zUiText('Saldo esperado nesta data')}</span>
            <strong>${saldoModalSistema != null ? finFmtMoeda(saldoModalSistema) : '—'}</strong>
            <div class="fin-inline-help">${zUiText(saldoModalSistema != null ? 'Saldo anterior mais as movimentacoes realizadas no sistema.' : 'Disponivel depois que houver um saldo anterior.')}</div>
          </div>
        </div>
        <div class="f-row">
          <div class="f-field">
            <label>${zUiText('Conta')}</label>
            <div class="fin-modal-chip">${zUiText('CONTA PRINCIPAL')}</div>
          </div>
          <div class="f-field">
            <label>${zUiText('Data da conferencia')}</label>
            <input type="date" id="fin-saldo-data" value="${finEscapeAttr(finSaldoModalData)}" onchange="finCarregarSaldoModalPorData(this.value)">
          </div>
        </div>
        <div class="f-field">
          <label>${zUiText('Saldo bancario (R$)')}</label>
          <input type="text" id="fin-saldo-valor" inputmode="decimal" placeholder="0,00" value="${saldoModalRegistro ? finEscapeAttr(finValorParaInput(saldoModalRegistro.saldo)) : ''}">
          <div class="fin-inline-help">${zUiText('Pode ser positivo, zero ou negativo. Use exatamente o valor exibido pelo banco.')}</div>
        </div>
        <div class="f-field">
          <label>${zUiText('Observacao')}</label>
          <textarea id="fin-saldo-observacao" rows="3" placeholder="${zUiText('EX: SALDO APOS CONFERENCIA DO EXTRATO.') }" oninput="finAtualizarCampoMaiusculo(this)" style="background:var(--bg2);border:1px solid var(--bd);border-radius:7px;padding:10px;font-size:12px;color:var(--tx);outline:none;width:100%;font-family:'Inter',sans-serif;resize:vertical;min-height:68px;text-transform:uppercase;">${finEscapeAttr(saldoModalRegistro ? saldoModalRegistro.observacao || '' : '')}</textarea>
        </div>
        <div class="fin-modal-note">${zUiText('A conciliacao nao altera entradas ou saidas. Ela apenas compara o saldo informado com o saldo que o sistema calcula a partir da ultima conferencia.')}</div>
      </div>
      <div class="modal-foot">
        <div class="fin-modal-actions" style="width:100%;">
          <div>
            <button class="fin-delete-btn" type="button" id="fin-saldo-excluir-btn" style="display:${saldoModalRegistro ? 'inline-flex' : 'none'};" onclick="finExcluirSaldoBancarioAtual()">${zUiText('Excluir saldo')}</button>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button class="btn-c" type="button" id="fin-saldo-cancel-btn" onclick="finFecharModalSaldoBancario()">${zUiText('Cancelar')}</button>
            <button class="btn-s" type="button" id="fin-saldo-save-btn" onclick="finSalvarSaldoBancario()">${zUiText('Salvar saldo bancario')}</button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="modal-backdrop${finModalAberto ? ' show' : ''}" id="m-fin-lanc" onclick="finHandleBackdropModal(event)">
    <div class="modal fin-modal">
      <div class="modal-top">
        <div>
          <div class="modal-title">${zUiText(tituloModal)}</div>
          <div style="font-size:10px;color:var(--tm);margin-top:2px;">${zUiText('Cadastre cada entrada ou saida manualmente, incluindo os recebimentos e repasses de comissao.')}</div>
        </div>
        <button class="mclose" onclick="finFecharModalLancamento()">✕</button>
      </div>
      <div class="modal-body fin-modal-body">
        <div class="f-row">
          <div class="f-field">
            <label>Tipo</label>
            ${podeEscolherTipo || itemEditando ? `
              <select id="fin-lanc-tipo" onchange="finAtualizarCamposModalLancamento()">
                <option value="entrada" ${tipoModal === 'entrada' ? 'selected' : ''}>${zUiText('Entrada')}</option>
                <option value="saida" ${tipoModal === 'saida' ? 'selected' : ''}>${zUiText('Saida')}</option>
              </select>` : `
              <div class="fin-modal-chip">${zUiText(tipoModal === 'saida' ? 'Saida' : 'Entrada')}</div>
              <input type="hidden" id="fin-lanc-tipo" value="${finEscapeAttr(tipoModal)}">`}
          </div>
          <div class="f-field">
            <label>Status</label>
            <select id="fin-lanc-status" onchange="finHandleStatusLancamentoChange()">
              <option value="previsto" ${statusModal === 'previsto' ? 'selected' : ''}>${zUiText('Previsto')}</option>
              <option value="realizado" ${statusModal === 'realizado' ? 'selected' : ''}>${zUiText('Realizado')}</option>
            </select>
            <div class="fin-inline-help" id="fin-lanc-status-help"></div>
          </div>
        </div>
        <div class="f-row">
          <div class="f-field">
            <label>Categoria</label>
            <select id="fin-lanc-categoria">${finCategoriasPorTipo(tipoModal, categoriaModal ? [categoriaModal] : []).map(item => `<option value="${finEscapeAttr(item)}" ${categoriaModal === item ? 'selected' : ''}>${zUiText(item)}</option>`).join('')}</select>
            <div class="fin-category-tools">
              <button class="btn-c" type="button" id="fin-categoria-nova-btn" onclick="finAlternarCategoriaNova()">${zUiText('Nova categoria')}</button>
            </div>
            <div class="fin-category-new" id="fin-categoria-nova-wrap">
              <input type="text" id="fin-lanc-categoria-nova" value="${finEscapeAttr(finCategoriaNovaValor)}" placeholder="${finEscapeAttr(finPlaceholderCategoriaNova(tipoModal))}" oninput="finAtualizarCategoriaNovaValor(this.value,this)" style="text-transform:uppercase;">
              <div class="fin-inline-help">${zUiText('Depois de salvar este lancamento, a nova categoria passa a ficar disponivel nesta lista.')}</div>
            </div>
          </div>
          <div class="f-field">
            <label>Unidade</label>
            <select id="fin-lanc-unidade">
              <option value="">${zUiText('Geral / nao vinculada')}</option>
              ${unidades.map(item => `<option value="${finEscapeAttr(item)}" ${itemEditando && itemEditando.unidade === item ? 'selected' : ''}>${zUiText(item)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="f-field">
          <label>Descricao</label>
          <input type="text" id="fin-lanc-descricao" value="${finEscapeAttr(itemEditando ? itemEditando.descricao || '' : '')}" oninput="finAtualizarCampoMaiusculo(this)" style="text-transform:uppercase;">
        </div>
        <div class="f-row">
          <div class="f-field">
            <label>Data prevista</label>
            <input type="date" id="fin-lanc-data-prevista" value="${finEscapeAttr(itemEditando ? itemEditando.dataPrevista || '' : finDateParaIso(new Date(ano, mes, 1, 12, 0, 0, 0)))}">
          </div>
          <div class="f-field" id="fin-lanc-realizada-wrap" style="display:${statusModal === 'realizado' ? 'block' : 'none'};">
            <label>Data realizada</label>
            <input type="date" id="fin-lanc-data-realizada" value="${finEscapeAttr(itemEditando ? itemEditando.dataRealizada || '' : '')}">
          </div>
        </div>
        <div class="f-row">
          <div class="f-field">
            <label>Valor (R$)</label>
            <input type="text" id="fin-lanc-valor" inputmode="decimal" placeholder="0,00" value="${itemEditando ? finEscapeAttr(finValorParaInput(itemEditando.valor)) : ''}">
          </div>
        </div>
        <div class="f-field">
          <label>Observacao</label>
          <textarea id="fin-lanc-observacao" rows="4" placeholder="${zUiText('CAMPO OPCIONAL PARA CONTEXTO INTERNO DO FINANCEIRO.')}" oninput="finAtualizarCampoMaiusculo(this)" style="background:var(--bg2);border:1px solid var(--bd);border-radius:7px;padding:10px;font-size:12px;color:var(--tx);outline:none;width:100%;font-family:'Inter',sans-serif;resize:vertical;min-height:74px;text-transform:uppercase;">${finEscapeAttr(itemEditando ? itemEditando.observacao || '' : '')}</textarea>
        </div>
        <div class="fin-proof-card">
          <div class="fin-proof-top">
            <div>
              <div class="fin-proof-title">${zUiText('Comprovante')}</div>
              <div class="fin-inline-help" id="fin-comprovante-help">${zUiText(statusModal === 'realizado' ? (tipoModal === 'saida' ? 'Anexe o comprovante do pagamento em foto ou PDF.' : 'Se existir, anexe o comprovante do recebimento em foto ou PDF.') : 'Opcional. Quando a movimentacao for realizada, voce pode anexar foto ou PDF do comprovante.')}</div>
            </div>
            <div class="fin-proof-badge" id="fin-comprovante-badge">${zUiText(finComprovanteResumo(itemEditando))}</div>
          </div>
          <input type="file" id="fin-comprovante-input" accept=".pdf,image/*" onchange="finSelecionarComprovanteFile(event)" style="display:none;">
          <div class="fin-proof-actions">
            <button class="btn-c" type="button" id="fin-comprovante-trigger" onclick="document.getElementById('fin-comprovante-input').click()">${zUiText('Selecionar comprovante')}</button>
            <button class="btn-c" type="button" id="fin-comprovante-view-btn" style="display:${comprovanteModalAtual ? 'inline-flex' : 'none'};" onclick="finVerComprovanteAtual()">${zUiText('Ver comprovante')}</button>
            <button class="btn-c fin-proof-remove" type="button" id="fin-comprovante-remove-btn" style="display:${comprovanteModalAtual ? 'inline-flex' : 'none'};" onclick="finLimparComprovanteSelecionado()">${zUiText('Remover')}</button>
          </div>
        </div>
        <div class="fin-modal-note">${zUiText('Novas movimentacoes sao manuais desde 26/08/2026. Comissoes recebidas ate 25/08 e repasses ja registrados permanecem no caixa e no DRE. Editar um repasse antigo nao cria outro lancamento.')}</div>
      </div>
      <div class="modal-foot">
        <div class="fin-modal-actions" style="width:100%;">
          <div>
            ${itemEditando ? `<button class="fin-delete-btn" onclick="finExcluirLancamentoAtual()">${zUiText('Excluir lancamento')}</button>` : ''}
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button class="btn-c" type="button" id="fin-lanc-realizar-btn" style="display:none;" onclick="finMarcarModalComoRealizado(true)">${zUiText(tipoModal === 'saida' ? 'Dar como pago' : 'Dar como recebido')}</button>
            <button class="btn-c" onclick="finFecharModalLancamento()">${zUiText('Cancelar')}</button>
            <button class="btn-s" id="fin-lanc-save-btn" onclick="finSalvarLancamento()">${zUiText(itemEditando ? 'Salvar alteracoes' : 'Salvar lancamento')}</button>
          </div>
        </div>
      </div>
    </div>
  </div>`;

  const tituloEl = alvo.querySelector('.fcal-title');
  if (tituloEl) tituloEl.textContent = tituloPainel;
  const exportBtnEl = alvo.querySelector('.dre-toolbar .fcal-add-btn');
  if (exportBtnEl) exportBtnEl.textContent = zUiText('Exportar Excel');

  if (finModalAberto) setTimeout(finAtualizarCamposModalLancamento, 0);
}

zRegisterModule('financeiro', {
  renderFinanceiro
});
