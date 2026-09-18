// CARTEIRA - parte 2/4: distratos (linhas do relatorio, ranking, board) e conclusoes (metricas, resumo, board)
function renderCarteiraDistratoRows(lista, config = {}) {
  if (!lista.length) {
    return `<div class="cart-distrato-empty">${carteiraUiHtml(config.vazio || 'Sem base para este recorte.')}</div>`;
  }
  const valores = lista.map(item => Number(config.widthFn ? config.widthFn(item) : 0)).filter(valor => isFinite(valor) && valor > 0);
  const max = valores.length ? Math.max(...valores) : 0;
  return `<div class="cart-distrato-list">${lista.map(item => {
    const baseWidth = Number(config.widthFn ? config.widthFn(item) : 0);
    const width = max > 0 ? Math.max(8, Math.min(100, (baseWidth / max) * 100)) : 8;
    const tone = config.tone ? ` ${config.tone}` : '';
    const label = config.labelFn ? config.labelFn(item) : item.nome;
    const meta = config.metaFn ? config.metaFn(item) : '';
    const value = config.valueFn ? config.valueFn(item) : '';
    const extra = config.extraFn ? config.extraFn(item) : '';
    return `
      <div class="cart-distrato-row">
        <div class="cart-distrato-row-head">
          <div class="cart-distrato-row-label">${carteiraUiHtml(label)}</div>
          <div class="cart-distrato-row-value">${carteiraUiHtml(value)}</div>
        </div>
        <div class="cart-distrato-row-meta">
          <span>${carteiraUiHtml(meta)}</span>
          ${extra ? `<strong>${carteiraUiHtml(extra)}</strong>` : ''}
        </div>
        <div class="cart-distrato-bar"><div class="cart-distrato-bar-fill${tone}" style="width:${width}%;"></div></div>
      </div>`;
  }).join('')}</div>`;
}

function renderCarteiraDistratoRanking(lista, titulo, subtitulo, legenda) {
  return `
    <div class="cart-ranking-card">
      <div class="cart-ranking-head">
        <div>
          <div class="cart-ranking-tag">${carteiraUiHtml(subtitulo)}</div>
          <div class="cart-ranking-title">${carteiraUiHtml(titulo)}</div>
        </div>
        <span>${carteiraUiHtml(legenda)}</span>
      </div>
      <div class="cart-ranking-list">
        ${lista.length ? lista.map((item, idx) => `
          <div class="cart-ranking-item">
            <div class="cart-ranking-pos">${idx + 1}</div>
            <div class="cart-ranking-main">
              <div class="cart-ranking-name">${carteiraUiHtml(item.nome)}</div>
              <div class="cart-ranking-meta">${carteiraUiHtml(`${item.distratos} distrato${item.distratos !== 1 ? 's' : ''} • ${item.total} venda${item.total !== 1 ? 's' : ''} • taxa ${fmtPctCarteira(item.taxa)}`)}</div>
            </div>
            <div class="cart-ranking-value">${carteiraUiHtml(fmtK(item.perdido))}</div>
          </div>
        `).join('') : `<div class="cart-ranking-empty">${carteiraUiHtml('Sem base de distratos neste recorte.')}</div>`}
      </div>
    </div>`;
}

function renderCarteiraDistratoBoard(analise, opts = {}) {
  const chips = [
    analise.piorCoorte ? `Pior coorte: ${analise.piorCoorte.nome} (${fmtPctCarteira(analise.piorCoorte.taxa)})` : '',
    analise.principalEtapa ? `Etapa crítica: ${analise.principalEtapa.nome}` : '',
    analise.principalMotivo ? `Motivo líder: ${analise.principalMotivo.nome}` : '',
    analise.principalCCA ? `CCA com mais distratos: ${analise.principalCCA.nome} (${analise.principalCCA.distratos})` : '',
    analise.principalConstrutora ? `Construtora com mais distratos: ${analise.principalConstrutora.nome} (${analise.principalConstrutora.distratos})` : '',
    analise.principalUnidade ? `Unidade com mais distratos: ${analise.principalUnidade.nome}` : ''
  ].filter(Boolean);
  const tempoMedio = carteiraFmtDias(analise.tempoMedioDias);

  return `
    <div class="cart-distrato-board">
      <div class="cart-distrato-hero">
        <div class="cart-distrato-hero-main">
          <div class="cart-distrato-kicker">${carteiraUiHtml('Inteligência de distratos')}</div>
          <div class="cart-distrato-title">${carteiraUiHtml('Consolidado de vendas lançadas x distratos')}</div>
          <div class="cart-distrato-big">${carteiraUiHtml(fmtPctCarteira(analise.taxaDistrato))}</div>
          <div class="cart-distrato-copy">${carteiraUiHtml(`${analise.totalDistratos} distrato${analise.totalDistratos !== 1 ? 's' : ''} em ${analise.totalLancadas} venda${analise.totalLancadas !== 1 ? 's' : ''} do recorte • ${fmtK(analise.comissaoPerdida)} de comissão líquida perdida`)}</div>
          ${chips.length ? `<div class="cart-distrato-chips">${chips.map(texto => `<span>${carteiraUiHtml(texto)}</span>`).join('')}</div>` : ''}
        </div>
        <div class="cart-distrato-hero-side">
          <div class="cart-distrato-mini danger">
            <span>${carteiraUiHtml('Distratos realizados')}</span>
            <strong>${analise.totalDistratos}</strong>
            <small>${carteiraUiHtml(`${fmtPctCarteira(analise.taxaDistrato)} do recorte atual`)}</small>
          </div>
          <div class="cart-distrato-mini">
            <span>${carteiraUiHtml('Taxa de retenção')}</span>
            <strong>${carteiraUiHtml(fmtPctCarteira(analise.taxaRetencao))}</strong>
            <small>${carteiraUiHtml('vendas que permanecem ativas')}</small>
          </div>
          <div class="cart-distrato-mini">
            <span>${carteiraUiHtml('Tempo médio até o distrato')}</span>
            <strong>${carteiraUiHtml(tempoMedio)}</strong>
            <small>${carteiraUiHtml('média entre lançamento e cancelamento')}</small>
          </div>
          <div class="cart-distrato-mini danger">
            <span>${carteiraUiHtml('Lucro Zelony perdido')}</span>
            <strong>${carteiraUiHtml(fmtK(analise.lucroPerdido))}</strong>
            <small>${carteiraUiHtml('impacto direto no resultado')}</small>
          </div>
        </div>
      </div>

      <div class="cart-distrato-kpis">
        <div class="cart-distrato-kpi">
          <span>${carteiraUiHtml('Vendas lançadas')}</span>
          <strong>${analise.totalLancadas}</strong>
          <small>${carteiraUiHtml('base usada na conciliação')}</small>
        </div>
        <div class="cart-distrato-kpi danger">
          <span>${carteiraUiHtml('Distratos')}</span>
          <strong>${analise.totalDistratos}</strong>
          <small>${carteiraUiHtml('casos efetivamente registrados')}</small>
        </div>
        <div class="cart-distrato-kpi">
          <span>${carteiraUiHtml('Taxa de distrato')}</span>
          <strong>${carteiraUiHtml(fmtPctCarteira(analise.taxaDistrato))}</strong>
          <small>${carteiraUiHtml('distratos / vendas lançadas')}</small>
        </div>
        <div class="cart-distrato-kpi">
          <span>${carteiraUiHtml('VGV distratado')}</span>
          <strong>${carteiraUiHtml(fmtK(analise.vgvDistratado))}</strong>
          <small>${carteiraUiHtml('valor bruto que saiu do pipeline')}</small>
        </div>
        <div class="cart-distrato-kpi danger">
          <span>${carteiraUiHtml('Comissão perdida')}</span>
          <strong>${carteiraUiHtml(fmtK(analise.comissaoPerdida))}</strong>
          <small>${carteiraUiHtml('receita líquida não realizada')}</small>
        </div>
        <div class="cart-distrato-kpi">
          <span>${carteiraUiHtml('Ticket médio distratado')}</span>
          <strong>${carteiraUiHtml(fmtK(analise.ticketDistrato))}</strong>
          <small>${carteiraUiHtml('valor médio por venda distratada')}</small>
        </div>
      </div>

      <div class="cart-distrato-grid">
        <div class="cart-distrato-card">
          <div class="cart-distrato-card-head">
            <div>
              <div class="cart-distrato-card-kicker">${carteiraUiHtml('Coorte de venda')}</div>
              <h3>${carteiraUiHtml('Lançadas x distratadas')}</h3>
            </div>
            <span>${carteiraUiHtml('6m')}</span>
          </div>
          <div class="cart-distrato-card-copy">${carteiraUiHtml(opts.cohortCopy || 'Leitura por mês de lançamento. A barra acompanha a taxa de distrato da coorte.')}</div>
          ${renderCarteiraDistratoRows(analise.cohorts, {
            vazio: 'Sem histórico suficiente para comparar meses.',
            tone: 'gold',
            widthFn: item => item.taxa,
            valueFn: item => fmtPctCarteira(item.taxa),
            metaFn: item => `${item.total} lançadas • ${item.distratos} distrato${item.distratos !== 1 ? 's' : ''}`,
            extraFn: item => fmtK(item.perdido)
          })}
        </div>

        <div class="cart-distrato-card">
          <div class="cart-distrato-card-head">
            <div>
              <div class="cart-distrato-card-kicker">${carteiraUiHtml('Mês do evento')}</div>
              <h3>${carteiraUiHtml('Ritmo de distratos')}</h3>
            </div>
            <span>${carteiraUiHtml('6m')}</span>
          </div>
          <div class="cart-distrato-card-copy">${carteiraUiHtml('Leitura por data de distrato registrada no histórico. Ajuda a ver aceleração ou alívio nas perdas.')}</div>
          ${renderCarteiraDistratoRows(analise.eventos, {
            vazio: 'Sem datas de distrato suficientes para montar a serie.',
            tone: 'danger',
            widthFn: item => item.distratos,
            valueFn: item => `${item.distratos} caso${item.distratos !== 1 ? 's' : ''}`,
            metaFn: item => `${fmtK(item.perdido)} de comissão perdida`,
            extraFn: item => fmtK(item.zelony)
          })}
        </div>

        <div class="cart-distrato-card">
          <div class="cart-distrato-card-head">
            <div>
              <div class="cart-distrato-card-kicker">${carteiraUiHtml('Etapas críticas')}</div>
              <h3>${carteiraUiHtml('Onde os distratos estão acontecendo')}</h3>
            </div>
            <span>${carteiraUiHtml('Top 5')}</span>
          </div>
          <div class="cart-distrato-card-copy">${carteiraUiHtml('Etapa em que a venda estava no momento do distrato. A barra mostra o peso dentro do total de distratos.')}</div>
          ${renderCarteiraDistratoRows(analise.etapas, {
            vazio: 'Nenhum distrato no recorte para distribuir por etapa.',
            tone: 'danger',
            widthFn: item => item.taxa,
            valueFn: item => fmtPctCarteira(item.taxa),
            metaFn: item => `${item.distratos} distrato${item.distratos !== 1 ? 's' : ''}`,
            extraFn: item => fmtK(item.perdido)
          })}
        </div>
      </div>

      <div class="cart-distrato-grid">
        <div class="cart-distrato-card">
          <div class="cart-distrato-card-head">
            <div>
              <div class="cart-distrato-card-kicker">${carteiraUiHtml('Categorias de motivo')}</div>
              <h3>${carteiraUiHtml('Por que estamos perdendo venda')}</h3>
            </div>
            <span>${carteiraUiHtml('Top 5')}</span>
          </div>
          <div class="cart-distrato-card-copy">${carteiraUiHtml('Agrupa os distratos pela categoria escolhida e usa a observação para destacar os principais sinais dentro de cada motivo.')}</div>
          ${renderCarteiraDistratoRows(analise.motivos, {
            vazio: 'Os distratos ainda não possuem categorias ou observações registradas neste recorte.',
            tone: 'danger',
            widthFn: item => item.distratos,
            valueFn: item => `${item.distratos} caso${item.distratos !== 1 ? 's' : ''}`,
            metaFn: item => `${fmtPctCarteira(item.taxa)} • ${item.insight}`,
            extraFn: item => fmtK(item.perdido)
          })}
        </div>

        <div class="cart-distrato-card">
          <div class="cart-distrato-card-head">
            <div>
              <div class="cart-distrato-card-kicker">${carteiraUiHtml('Concentração por unidade')}</div>
              <h3>${carteiraUiHtml('Unidades com mais pressão')}</h3>
            </div>
            <span>${carteiraUiHtml('Top 5')}</span>
          </div>
          <div class="cart-distrato-card-copy">${carteiraUiHtml('Concilia volume, taxa e perda financeira para apontar onde a atenção deve entrar primeiro.')}</div>
          ${renderCarteiraDistratoRows(analise.unidades, {
            vazio: 'Sem distratos suficientes para ranquear unidades.',
            tone: 'gold',
            widthFn: item => item.distratos,
            valueFn: item => fmtPctCarteira(item.taxa),
            metaFn: item => `${item.distratos} distrato${item.distratos !== 1 ? 's' : ''} em ${item.total} venda${item.total !== 1 ? 's' : ''}`,
            extraFn: item => fmtK(item.perdido)
          })}
        </div>

        <div class="cart-distrato-card">
          <div class="cart-distrato-card-head">
            <div>
              <div class="cart-distrato-card-kicker">${carteiraUiHtml('Concentração por construtora')}</div>
              <h3>${carteiraUiHtml('Parceiros com maior incidência')}</h3>
            </div>
            <span>${carteiraUiHtml('Top 5')}</span>
          </div>
          <div class="cart-distrato-card-copy">${carteiraUiHtml('Mostra em quais construtoras a taxa de distrato e a perda financeira estão mais presentes.')}</div>
          ${renderCarteiraDistratoRows(analise.construtoras, {
            vazio: 'Sem distratos suficientes para ranquear construtoras.',
            tone: 'gold',
            widthFn: item => item.distratos,
            valueFn: item => fmtPctCarteira(item.taxa),
            metaFn: item => `${item.distratos} distrato${item.distratos !== 1 ? 's' : ''} em ${item.total} venda${item.total !== 1 ? 's' : ''}`,
            extraFn: item => fmtK(item.perdido)
          })}
        </div>

        <div class="cart-distrato-card">
          <div class="cart-distrato-card-head">
            <div>
              <div class="cart-distrato-card-kicker">${carteiraUiHtml('Concentração por CCA')}</div>
              <h3>${carteiraUiHtml('Quem mais concentra distratos')}</h3>
            </div>
            <span>${carteiraUiHtml('Top 5')}</span>
          </div>
          <div class="cart-distrato-card-copy">${carteiraUiHtml('Mostra quais CCAs concentram mais distratos, qual a taxa dentro da própria base e o impacto financeiro desse recorte.')}</div>
          ${renderCarteiraDistratoRows(analise.ccas, {
            vazio: 'Sem distratos suficientes para ranquear CCAs.',
            tone: 'gold',
            widthFn: item => item.distratos,
            valueFn: item => fmtPctCarteira(item.taxa),
            metaFn: item => `${item.distratos} distrato${item.distratos !== 1 ? 's' : ''} em ${item.total} venda${item.total !== 1 ? 's' : ''} • taxa ${fmtPctCarteira(item.taxa)}`,
            extraFn: item => fmtK(item.perdido)
          })}
        </div>

      </div>

      <div class="cart-ranking">
        ${renderCarteiraDistratoRanking(analise.corretores, 'Corretores com mais distratos', 'Radar comercial', 'perda líquida')}
        ${renderCarteiraDistratoRanking(analise.gerentes, 'Gerentes com mais distratos', 'Gestão de carteira', 'perda líquida')}
      </div>
    </div>`;
}

function renderCarteiraDistratoRankingRefinado(lista, titulo, subtitulo, legenda) {
  return `
    <div class="cart-ranking-card">
      <div class="cart-ranking-head">
        <div>
          <div class="cart-ranking-tag">${carteiraUiHtml(subtitulo)}</div>
          <div class="cart-ranking-title">${carteiraUiHtml(titulo)}</div>
        </div>
        <span>${carteiraUiHtml(legenda)}</span>
      </div>
      <div class="cart-ranking-list">
        ${lista.length ? lista.map((item, idx) => `
          <div class="cart-ranking-item">
            <div class="cart-ranking-pos">${idx + 1}</div>
            <div class="cart-ranking-main">
              <div class="cart-ranking-name">${carteiraUiHtml(item.nome)}</div>
              <div class="cart-ranking-meta">${carteiraUiHtml(`${item.distratos} distrato${item.distratos !== 1 ? 's' : ''} • ${item.total} venda${item.total !== 1 ? 's' : ''} • taxa ${fmtPctCarteira(item.taxa)}`)}</div>
            </div>
            <div class="cart-ranking-value">${carteiraUiHtml(fmtK(item.perdido))}</div>
          </div>
        `).join('') : `<div class="cart-ranking-empty">${carteiraUiHtml('Sem base de distratos neste recorte.')}</div>`}
      </div>
    </div>`;
}

function renderCarteiraDistratoBoardRefinado(analise, opts = {}) {
  const chips = [
    analise.piorCoorte ? `Coorte mais exposta: ${analise.piorCoorte.nome} (${fmtPctCarteira(analise.piorCoorte.taxa)})` : '',
    analise.principalEtapa ? `Etapa mais crítica: ${analise.principalEtapa.nome}` : '',
    analise.principalMotivo ? `Categoria mais recorrente: ${analise.principalMotivo.nome}` : '',
    analise.principalCCA ? `CCA com mais distratos: ${analise.principalCCA.nome} (${analise.principalCCA.distratos})` : '',
    analise.principalConstrutora ? `Construtora com mais distratos: ${analise.principalConstrutora.nome} (${analise.principalConstrutora.distratos})` : '',
    analise.principalUnidade ? `Unidade com mais distratos: ${analise.principalUnidade.nome}` : ''
  ].filter(Boolean);
  const tempoMedio = carteiraFmtDias(analise.tempoMedioDias);

  return `
    <div class="cart-distrato-board">
      <div class="cart-distrato-hero">
        <div class="cart-distrato-hero-main">
          <div class="cart-distrato-kicker">${carteiraUiHtml('Inteligência de distratos')}</div>
          <div class="cart-distrato-title">${carteiraUiHtml('Conciliação entre vendas lançadas e distratos')}</div>
          <div class="cart-distrato-big">${carteiraUiHtml(fmtPctCarteira(analise.taxaDistrato))}</div>
          <div class="cart-distrato-copy">${carteiraUiHtml(`${analise.totalDistratos} distrato${analise.totalDistratos !== 1 ? 's' : ''} em ${analise.totalLancadas} venda${analise.totalLancadas !== 1 ? 's' : ''} do recorte • ${fmtK(analise.comissaoPerdida)} em comissão líquida perdida`)}</div>
          ${chips.length ? `<div class="cart-distrato-chips">${chips.map(texto => `<span>${carteiraUiHtml(texto)}</span>`).join('')}</div>` : ''}
        </div>
        <div class="cart-distrato-hero-side">
          <div class="cart-distrato-mini danger">
            <span>${carteiraUiHtml('Distratos realizados')}</span>
            <strong>${analise.totalDistratos}</strong>
            <small>${carteiraUiHtml(`${fmtPctCarteira(analise.taxaDistrato)} do recorte atual`)}</small>
          </div>
          <div class="cart-distrato-mini">
            <span>${carteiraUiHtml('Taxa de retenção')}</span>
            <strong>${carteiraUiHtml(fmtPctCarteira(analise.taxaRetencao))}</strong>
            <small>${carteiraUiHtml('vendas que permanecem ativas')}</small>
          </div>
          <div class="cart-distrato-mini">
            <span>${carteiraUiHtml('Tempo médio até o distrato')}</span>
            <strong>${carteiraUiHtml(tempoMedio)}</strong>
            <small>${carteiraUiHtml('média entre lançamento e cancelamento')}</small>
          </div>
          <div class="cart-distrato-mini danger">
            <span>${carteiraUiHtml('Lucro Zelony perdido')}</span>
            <strong>${carteiraUiHtml(fmtK(analise.lucroPerdido))}</strong>
            <small>${carteiraUiHtml('impacto direto no resultado')}</small>
          </div>
        </div>
      </div>

      <div class="cart-distrato-kpis">
        <div class="cart-distrato-kpi">
          <span>${carteiraUiHtml('Vendas lançadas')}</span>
          <strong>${analise.totalLancadas}</strong>
          <small>${carteiraUiHtml('base usada na conciliação')}</small>
        </div>
        <div class="cart-distrato-kpi danger">
          <span>${carteiraUiHtml('Distratos')}</span>
          <strong>${analise.totalDistratos}</strong>
          <small>${carteiraUiHtml('casos efetivamente registrados')}</small>
        </div>
        <div class="cart-distrato-kpi">
          <span>${carteiraUiHtml('Taxa de distrato')}</span>
          <strong>${carteiraUiHtml(fmtPctCarteira(analise.taxaDistrato))}</strong>
          <small>${carteiraUiHtml('distratos / vendas lançadas')}</small>
        </div>
        <div class="cart-distrato-kpi">
          <span>${carteiraUiHtml('VGV distratado')}</span>
          <strong>${carteiraUiHtml(fmtK(analise.vgvDistratado))}</strong>
          <small>${carteiraUiHtml('valor bruto que saiu do pipeline')}</small>
        </div>
        <div class="cart-distrato-kpi danger">
          <span>${carteiraUiHtml('Comissão perdida')}</span>
          <strong>${carteiraUiHtml(fmtK(analise.comissaoPerdida))}</strong>
          <small>${carteiraUiHtml('receita líquida não realizada')}</small>
        </div>
        <div class="cart-distrato-kpi">
          <span>${carteiraUiHtml('Ticket médio distratado')}</span>
          <strong>${carteiraUiHtml(fmtK(analise.ticketDistrato))}</strong>
          <small>${carteiraUiHtml('valor médio por venda distratada')}</small>
        </div>
      </div>

      <div class="cart-distrato-grid">
        <div class="cart-distrato-card">
          <div class="cart-distrato-card-head">
            <div>
              <div class="cart-distrato-card-kicker">${carteiraUiHtml('Coorte de venda')}</div>
              <h3>${carteiraUiHtml('Lançadas x distratadas')}</h3>
            </div>
            <span>${carteiraUiHtml('6m')}</span>
          </div>
          <div class="cart-distrato-card-copy">${carteiraUiHtml(opts.cohortCopy || 'Leitura por mês de lançamento. A barra acompanha a taxa de distrato de cada coorte.')}</div>
          ${renderCarteiraDistratoRows(analise.cohorts, {
            vazio: 'Sem histórico suficiente para comparar os meses.',
            tone: 'gold',
            widthFn: item => item.taxa,
            valueFn: item => fmtPctCarteira(item.taxa),
            metaFn: item => `${item.total} lançadas • ${item.distratos} distrato${item.distratos !== 1 ? 's' : ''}`,
            extraFn: item => fmtK(item.perdido)
          })}
        </div>

        <div class="cart-distrato-card">
          <div class="cart-distrato-card-head">
            <div>
              <div class="cart-distrato-card-kicker">${carteiraUiHtml('Mês do evento')}</div>
              <h3>${carteiraUiHtml('Ritmo de distratos')}</h3>
            </div>
            <span>${carteiraUiHtml('6m')}</span>
          </div>
          <div class="cart-distrato-card-copy">${carteiraUiHtml('Leitura por data de distrato registrada no histórico. Ajuda a identificar aceleração ou alívio nas perdas.')}</div>
          ${renderCarteiraDistratoRows(analise.eventos, {
            vazio: 'Sem datas de distrato suficientes para montar a série.',
            tone: 'danger',
            widthFn: item => item.distratos,
            valueFn: item => `${item.distratos} caso${item.distratos !== 1 ? 's' : ''}`,
            metaFn: item => `${fmtK(item.perdido)} de comissão perdida`,
            extraFn: item => fmtK(item.zelony)
          })}
        </div>

        <div class="cart-distrato-card">
          <div class="cart-distrato-card-head">
            <div>
              <div class="cart-distrato-card-kicker">${carteiraUiHtml('Etapas críticas')}</div>
              <h3>${carteiraUiHtml('Onde os distratos estão acontecendo')}</h3>
            </div>
            <span>${carteiraUiHtml('Top 5')}</span>
          </div>
          <div class="cart-distrato-card-copy">${carteiraUiHtml('Mostra em qual etapa a venda estava no momento do distrato e qual o peso desse ponto no total do recorte.')}</div>
          ${renderCarteiraDistratoRows(analise.etapas, {
            vazio: 'Nenhum distrato no recorte para distribuir por etapa.',
            tone: 'danger',
            widthFn: item => item.taxa,
            valueFn: item => fmtPctCarteira(item.taxa),
            metaFn: item => `${item.distratos} distrato${item.distratos !== 1 ? 's' : ''}`,
            extraFn: item => fmtK(item.perdido)
          })}
        </div>
      </div>

      <div class="cart-distrato-grid">
        <div class="cart-distrato-card">
          <div class="cart-distrato-card-head">
            <div>
              <div class="cart-distrato-card-kicker">${carteiraUiHtml('Categorias de motivo')}</div>
              <h3>${carteiraUiHtml('Por que as vendas se perdem')}</h3>
            </div>
            <span>${carteiraUiHtml('Top 5')}</span>
          </div>
          <div class="cart-distrato-card-copy">${carteiraUiHtml('Agrupa os distratos pela categoria escolhida e usa a observação para destacar os principais sinais dentro de cada motivo.')}</div>
          ${renderCarteiraDistratoRows(analise.motivos, {
            vazio: 'Os distratos ainda não possuem categorias ou observações registradas neste recorte.',
            tone: 'danger',
            widthFn: item => item.distratos,
            valueFn: item => `${item.distratos} caso${item.distratos !== 1 ? 's' : ''}`,
            metaFn: item => `${fmtPctCarteira(item.taxa)} • ${item.insight}`,
            extraFn: item => fmtK(item.perdido)
          })}
        </div>

        <div class="cart-distrato-card">
          <div class="cart-distrato-card-head">
            <div>
              <div class="cart-distrato-card-kicker">${carteiraUiHtml('Concentração por unidade')}</div>
              <h3>${carteiraUiHtml('Unidades com mais pressão')}</h3>
            </div>
            <span>${carteiraUiHtml('Top 5')}</span>
          </div>
          <div class="cart-distrato-card-copy">${carteiraUiHtml('Concilia volume, taxa e perda financeira para apontar onde a atenção deve entrar primeiro.')}</div>
          ${renderCarteiraDistratoRows(analise.unidades, {
            vazio: 'Sem distratos suficientes para ranquear unidades.',
            tone: 'gold',
            widthFn: item => item.distratos,
            valueFn: item => fmtPctCarteira(item.taxa),
            metaFn: item => `${item.distratos} distrato${item.distratos !== 1 ? 's' : ''} em ${item.total} venda${item.total !== 1 ? 's' : ''} • taxa ${fmtPctCarteira(item.taxa)}`,
            extraFn: item => fmtK(item.perdido)
          })}
        </div>

        <div class="cart-distrato-card">
          <div class="cart-distrato-card-head">
            <div>
              <div class="cart-distrato-card-kicker">${carteiraUiHtml('Concentração por construtora')}</div>
              <h3>${carteiraUiHtml('Parceiros com maior incidência')}</h3>
            </div>
            <span>${carteiraUiHtml('Top 5')}</span>
          </div>
          <div class="cart-distrato-card-copy">${carteiraUiHtml('Mostra em quais construtoras a taxa de distrato e a perda financeira estão mais presentes.')}</div>
          ${renderCarteiraDistratoRows(analise.construtoras, {
            vazio: 'Sem distratos suficientes para ranquear construtoras.',
            tone: 'gold',
            widthFn: item => item.distratos,
            valueFn: item => fmtPctCarteira(item.taxa),
            metaFn: item => `${item.distratos} distrato${item.distratos !== 1 ? 's' : ''} em ${item.total} venda${item.total !== 1 ? 's' : ''} • taxa ${fmtPctCarteira(item.taxa)}`,
            extraFn: item => fmtK(item.perdido)
          })}
        </div>

        <div class="cart-distrato-card">
          <div class="cart-distrato-card-head">
            <div>
              <div class="cart-distrato-card-kicker">${carteiraUiHtml('Concentração por CCA')}</div>
              <h3>${carteiraUiHtml('Quem mais concentra distratos')}</h3>
            </div>
            <span>${carteiraUiHtml('Top 5')}</span>
          </div>
          <div class="cart-distrato-card-copy">${carteiraUiHtml('Mostra quais CCAs concentram mais distratos, qual a taxa dentro da própria base e o impacto financeiro desse recorte.')}</div>
          ${renderCarteiraDistratoRows(analise.ccas, {
            vazio: 'Sem distratos suficientes para ranquear CCAs.',
            tone: 'gold',
            widthFn: item => item.distratos,
            valueFn: item => fmtPctCarteira(item.taxa),
            metaFn: item => `${item.distratos} distrato${item.distratos !== 1 ? 's' : ''} em ${item.total} venda${item.total !== 1 ? 's' : ''} • taxa ${fmtPctCarteira(item.taxa)}`,
            extraFn: item => fmtK(item.perdido)
          })}
        </div>
      </div>

      <div class="cart-ranking">
        ${renderCarteiraDistratoRankingRefinado(analise.corretores, 'Corretores com mais distratos', 'Radar comercial', 'perda líquida')}
        ${renderCarteiraDistratoRankingRefinado(analise.gerentes, 'Gerentes com mais distratos', 'Gestão de carteira', 'perda líquida')}
      </div>
    </div>`;
}

function carteiraHistoricoFluxo(v) {
  if (!v || !Array.isArray(v.hist)) return [];
  return v.hist
    .filter(item => item && (typeof histAfetaFluxo !== 'function' || histAfetaFluxo(item)))
    .map(item => {
      const info = obterMomentoHistorico(item, { preferTs: false }) || obterMomentoHistorico(item);
      if (!info || !info.date) return null;
      return { ...item, __date: new Date(info.date.getTime()) };
    })
    .filter(Boolean)
    .sort((a, b) => a.__date.getTime() - b.__date.getTime());
}

function carteiraDiffDias(inicio, fim) {
  if (!(inicio instanceof Date) || Number.isNaN(inicio.getTime())) return null;
  if (!(fim instanceof Date) || Number.isNaN(fim.getTime())) return null;
  const refInicio = new Date(inicio.getTime());
  const refFim = new Date(fim.getTime());
  refInicio.setHours(0, 0, 0, 0);
  refFim.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((refFim.getTime() - refInicio.getTime()) / (1000 * 60 * 60 * 24)));
}

function carteiraFmtDias(valor, vazio = 'Sem base') {
  if (!Number.isFinite(valor)) return vazio;
  return `${valor} ${valor === 1 ? 'dia' : 'dias'}`;
}

function carteiraDataConclusao(v) {
  const finalIdx = ETAPAS.length - 1;
  const hist = carteiraHistoricoFluxo(v);
  const registro = [...hist].reverse().find(item => Number(item.e) === finalIdx);
  return registro ? new Date(registro.__date.getTime()) : null;
}

function carteiraMetricaConclusao(v) {
  if (!v || v.distratada || v.etapa !== ETAPAS.length - 1) return null;
  const cadastro = carteiraDataVenda(v);
  const conclusao = carteiraDataConclusao(v);
  const dias = carteiraDiffDias(cadastro, conclusao);
  if (dias === null) return null;
  return { cadastro, conclusao, dias };
}

function carteiraMediana(valores) {
  if (!Array.isArray(valores) || !valores.length) return null;
  const lista = [...valores].filter(valor => Number.isFinite(valor)).sort((a, b) => a - b);
  if (!lista.length) return null;
  const meio = Math.floor(lista.length / 2);
  if (lista.length % 2) return lista[meio];
  return Math.round((lista[meio - 1] + lista[meio]) / 2);
}

function carteiraSerieMensalConcluidas(lista) {
  const concluidas = lista.filter(v => !v.distratada && v.etapa === ETAPAS.length - 1);
  const mapa = {};
  concluidas.forEach(v => {
    const conclusao = carteiraDataConclusao(v);
    if (!(conclusao instanceof Date) || Number.isNaN(conclusao.getTime())) return;
    const chave = `${conclusao.getFullYear()}-${pad2(conclusao.getMonth() + 1)}`;
    if (!mapa[chave]) {
      mapa[chave] = {
        nome: carteiraMesAnoLabel(conclusao),
        ordem: (conclusao.getFullYear() * 100) + (conclusao.getMonth() + 1),
        concluidas: 0,
        vgv: 0,
        liq: 0,
        zelony: 0,
        totalDias: 0,
        comDias: 0
      };
    }
    const ciclo = carteiraMetricaConclusao(v);
    mapa[chave].concluidas++;
    mapa[chave].vgv += v.valor || 0;
    mapa[chave].liq += comTotal(v);
    mapa[chave].zelony += comZ(v);
    if (ciclo) {
      mapa[chave].totalDias += ciclo.dias;
      mapa[chave].comDias++;
    }
  });
  return Object.values(mapa)
    .map(item => ({
      ...item,
      diasMedios: item.comDias ? Math.round(item.totalDias / item.comDias) : null
    }))
    .sort((a, b) => a.ordem - b.ordem)
    .slice(-6);
}

function carteiraCoortesCadastroConclusao(lista) {
  const mapa = {};
  lista.forEach(v => {
    const cadastro = carteiraDataVenda(v);
    const labelFallback = v.mes || 'Sem data';
    const chave = cadastro
      ? `${cadastro.getFullYear()}-${pad2(cadastro.getMonth() + 1)}`
      : `MES-${normalizarCarteiraTexto(labelFallback)}`;
    const ordem = cadastro
      ? (cadastro.getFullYear() * 100) + (cadastro.getMonth() + 1)
      : (900000 + ordemMesCarteira(labelFallback));
    if (!mapa[chave]) {
      mapa[chave] = {
        nome: cadastro ? carteiraMesAnoLabel(cadastro) : labelFallback,
        ordem,
        total: 0,
        concluidas: 0,
        vgv: 0,
        liq: 0,
        totalDias: 0,
        comDias: 0
      };
    }
    mapa[chave].total++;
    if (!v.distratada && v.etapa === ETAPAS.length - 1) {
      const ciclo = carteiraMetricaConclusao(v);
      mapa[chave].concluidas++;
      mapa[chave].vgv += v.valor || 0;
      mapa[chave].liq += comTotal(v);
      if (ciclo) {
        mapa[chave].totalDias += ciclo.dias;
        mapa[chave].comDias++;
      }
    }
  });
  return Object.values(mapa)
    .filter(item => item.concluidas > 0)
    .map(item => ({
      ...item,
      taxaConclusao: item.total ? (item.concluidas / item.total) * 100 : 0,
      diasMedios: item.comDias ? Math.round(item.totalDias / item.comDias) : null
    }))
    .sort((a, b) => a.ordem - b.ordem)
    .slice(-6);
}

function carteiraGruposConclusao(lista, valorFn, opts = {}) {
  const mapa = {};
  lista.forEach(v => {
    const nomeBruto = valorFn(v);
    const nome = carteiraRotuloPadrao(nomeBruto, opts.fallback || 'Não informado');
    const chave = normalizarCarteiraTexto(nome);
    if (!mapa[chave]) {
      mapa[chave] = {
        nome,
        total: 0,
        concluidas: 0,
        vgv: 0,
        liq: 0,
        zelony: 0,
        totalDias: 0,
        comDias: 0
      };
    }
    mapa[chave].total++;
    if (!v.distratada && v.etapa === ETAPAS.length - 1) {
      const ciclo = carteiraMetricaConclusao(v);
      mapa[chave].concluidas++;
      mapa[chave].vgv += v.valor || 0;
      mapa[chave].liq += comTotal(v);
      mapa[chave].zelony += comZ(v);
      if (ciclo) {
        mapa[chave].totalDias += ciclo.dias;
        mapa[chave].comDias++;
      }
    }
  });
  return Object.values(mapa)
    .filter(item => item.concluidas > 0)
    .map(item => ({
      ...item,
      taxaConclusao: item.total ? (item.concluidas / item.total) * 100 : 0,
      diasMedios: item.comDias ? Math.round(item.totalDias / item.comDias) : null
    }))
    .sort((a, b) => b.concluidas - a.concluidas || b.zelony - a.zelony || b.vgv - a.vgv)
    .slice(0, opts.limite || 5);
}

function carteiraGargalosConclusao(lista) {
  const mapa = {};
  lista
    .filter(v => !v.distratada && v.etapa === ETAPAS.length - 1)
    .forEach(v => {
      const hist = carteiraHistoricoFluxo(v);
      for (let i = 0; i < hist.length - 1; i++) {
        const atual = hist[i];
        const proximo = hist[i + 1];
        const etapaIdx = Number(atual.e);
        if (!Number.isInteger(etapaIdx) || etapaIdx < 0 || etapaIdx >= ETAPAS.length - 1) continue;
        const dias = carteiraDiffDias(atual.__date, proximo.__date);
        if (dias === null) continue;
        if (!mapa[etapaIdx]) {
          mapa[etapaIdx] = {
            nome: ETAPAS[etapaIdx] || 'Etapa',
            totalDias: 0,
            trechos: 0,
            pico: 0,
            vendas: new Set()
          };
        }
        mapa[etapaIdx].totalDias += dias;
        mapa[etapaIdx].trechos++;
        mapa[etapaIdx].pico = Math.max(mapa[etapaIdx].pico, dias);
        mapa[etapaIdx].vendas.add(v.id);
      }
    });
  return Object.values(mapa)
    .map(item => ({
      nome: item.nome,
      diasMedios: item.trechos ? Math.round(item.totalDias / item.trechos) : 0,
      trechos: item.trechos,
      pico: item.pico,
      vendas: item.vendas.size
    }))
    .sort((a, b) => b.diasMedios - a.diasMedios || b.pico - a.pico || b.vendas - a.vendas)
    .slice(0, 5);
}

function resumoConclusoesCarteira(listaRecorte, listaComparativa) {
  const base = Array.isArray(listaRecorte) ? [...listaRecorte] : [];
  const comparativa = Array.isArray(listaComparativa) ? [...listaComparativa] : [...base];
  const concluidas = base.filter(v => !v.distratada && v.etapa === ETAPAS.length - 1);
  const ciclos = concluidas
    .map(v => carteiraMetricaConclusao(v))
    .filter(Boolean)
    .map(item => item.dias);
  const totalLancadas = base.length;
  const totalConcluidas = concluidas.length;
  const taxaConclusao = totalLancadas ? (totalConcluidas / totalLancadas) * 100 : 0;
  const vgvConcluido = concluidas.reduce((s, v) => s + (v.valor || 0), 0);
  const comissaoLiquida = concluidas.reduce((s, v) => s + comTotal(v), 0);
  const lucroZelony = concluidas.reduce((s, v) => s + comZ(v), 0);
  const ticketMedio = totalConcluidas ? vgvConcluido / totalConcluidas : 0;
  const diasMedios = ciclos.length ? Math.round(ciclos.reduce((s, valor) => s + valor, 0) / ciclos.length) : null;
  const diasMediana = carteiraMediana(ciclos);
  const diasMenor = ciclos.length ? Math.min(...ciclos) : null;
  const diasMaior = ciclos.length ? Math.max(...ciclos) : null;
  const serieMensal = carteiraSerieMensalConcluidas(comparativa);
  const coortesCadastro = carteiraCoortesCadastroConclusao(comparativa);
  const gargalos = carteiraGargalosConclusao(concluidas);
  const unidades = carteiraGruposConclusao(base, v => v.unidade, { fallback: 'Não informada' });
  const construtoras = carteiraGruposConclusao(base, v => v.construtora, { fallback: 'Não informada' });
  const origens = carteiraGruposConclusao(base, v => v.origem, { fallback: 'Não informada' });
  const gerentes = carteiraGruposConclusao(base, v => v.gerente, { fallback: 'Não informado' });
  const corretores = carteiraGruposConclusao(base, v => v.corretor, { fallback: 'Não informado' });
  const melhorCoorte = [...coortesCadastro]
    .filter(item => item.diasMedios !== null)
    .sort((a, b) => a.diasMedios - b.diasMedios || b.taxaConclusao - a.taxaConclusao || b.concluidas - a.concluidas)[0] || null;
  const principalGargalo = gargalos[0] || null;
  const melhorOrigem = [...origens]
    .filter(item => item.diasMedios !== null)
    .sort((a, b) => a.diasMedios - b.diasMedios || b.taxaConclusao - a.taxaConclusao)[0] || null;

  return {
    totalLancadas,
    totalConcluidas,
    taxaConclusao,
    vgvConcluido,
    comissaoLiquida,
    lucroZelony,
    ticketMedio,
    diasMedios,
    diasMediana,
    diasMenor,
    diasMaior,
    serieMensal,
    coortesCadastro,
    gargalos,
    unidades,
    construtoras,
    origens,
    gerentes,
    corretores,
    melhorCoorte,
    principalGargalo,
    melhorOrigem
  };
}

function renderCarteiraConclusaoRanking(lista, titulo, subtitulo, legenda) {
  return `
    <div class="cart-ranking-card">
      <div class="cart-ranking-head">
        <div>
          <div class="cart-ranking-tag">${carteiraUiHtml(subtitulo)}</div>
          <div class="cart-ranking-title">${carteiraUiHtml(titulo)}</div>
        </div>
        <span>${carteiraUiHtml(legenda)}</span>
      </div>
      <div class="cart-ranking-list">
        ${lista.length ? lista.map((item, idx) => `
          <div class="cart-ranking-item">
            <div class="cart-ranking-pos">${idx + 1}</div>
            <div class="cart-ranking-main">
              <div class="cart-ranking-name">${carteiraUiHtml(item.nome)}</div>
              <div class="cart-ranking-meta">${carteiraUiHtml(`${item.concluidas} concluídas • taxa ${fmtPctCarteira(item.taxaConclusao)} • ciclo ${carteiraFmtDias(item.diasMedios)}`)}</div>
            </div>
            <div class="cart-ranking-value">${carteiraUiHtml(fmtK(item.zelony))}</div>
          </div>
        `).join('') : `<div class="cart-ranking-empty">${carteiraUiHtml('Sem base de concluídas neste recorte.')}</div>`}
      </div>
    </div>`;
}

function renderCarteiraConclusaoBoard(analise, opts = {}) {
  const diasMedios = carteiraFmtDias(analise.diasMedios);
  const diasMediana = carteiraFmtDias(analise.diasMediana);
  const diasMenor = carteiraFmtDias(analise.diasMenor);
  const diasMaior = carteiraFmtDias(analise.diasMaior);
  const chips = [
    analise.melhorCoorte ? `Coorte mais rápida: ${analise.melhorCoorte.nome} (${carteiraFmtDias(analise.melhorCoorte.diasMedios)})` : '',
    analise.principalGargalo ? `Maior gargalo: ${analise.principalGargalo.nome} (${carteiraFmtDias(analise.principalGargalo.diasMedios)})` : '',
    analise.melhorOrigem ? `Origem mais ágil: ${analise.melhorOrigem.nome}` : ''
  ].filter(Boolean);

  return `
    <div class="cart-conclusao-board">
      <div class="cart-conclusao-hero">
        <div class="cart-conclusao-hero-main">
          <div class="cart-conclusao-kicker">${carteiraUiHtml('Inteligência de concluídas')}</div>
          <div class="cart-conclusao-title">${carteiraUiHtml('Ciclo médio do cadastro até a conclusão')}</div>
          <div class="cart-conclusao-big">${carteiraUiHtml(diasMedios)}</div>
          <div class="cart-conclusao-copy">${carteiraUiHtml(`${analise.totalConcluidas} venda${analise.totalConcluidas !== 1 ? 's' : ''} concluída${analise.totalConcluidas !== 1 ? 's' : ''} entre ${analise.totalLancadas} cadastradas no recorte • ${fmtK(analise.comissaoLiquida)} de comissão líquida convertida`)}</div>
          ${chips.length ? `<div class="cart-conclusao-chips">${chips.map(texto => `<span>${carteiraUiHtml(texto)}</span>`).join('')}</div>` : ''}
        </div>
        <div class="cart-distrato-hero-side">
          <div class="cart-distrato-mini success">
            <span>${carteiraUiHtml('Concluídas')}</span>
            <strong>${analise.totalConcluidas}</strong>
            <small>${carteiraUiHtml(`${fmtPctCarteira(analise.taxaConclusao)} do recorte atual`)}</small>
          </div>
          <div class="cart-distrato-mini success">
            <span>${carteiraUiHtml('Ticket médio')}</span>
            <strong>${carteiraUiHtml(fmtK(analise.ticketMedio))}</strong>
            <small>${carteiraUiHtml('VGV médio das vendas concluídas')}</small>
          </div>
          <div class="cart-distrato-mini">
            <span>${carteiraUiHtml('Mediana de ciclo')}</span>
            <strong>${carteiraUiHtml(diasMediana)}</strong>
            <small>${carteiraUiHtml('tempo central para fechar uma venda')}</small>
          </div>
          <div class="cart-distrato-mini">
            <span>${carteiraUiHtml('Lucro Zelony')}</span>
            <strong>${carteiraUiHtml(fmtK(analise.lucroZelony))}</strong>
            <small>${carteiraUiHtml('resultado das vendas concluídas')}</small>
          </div>
        </div>
      </div>

      <div class="cart-distrato-kpis">
        <div class="cart-distrato-kpi success">
          <span>${carteiraUiHtml('Vendas cadastradas')}</span>
          <strong>${analise.totalLancadas}</strong>
          <small>${carteiraUiHtml('base usada na taxa de conclusão')}</small>
        </div>
        <div class="cart-distrato-kpi success">
          <span>${carteiraUiHtml('Taxa de conclusão')}</span>
          <strong>${carteiraUiHtml(fmtPctCarteira(analise.taxaConclusao))}</strong>
          <small>${carteiraUiHtml('concluídas / cadastradas')}</small>
        </div>
        <div class="cart-distrato-kpi">
          <span>${carteiraUiHtml('VGV concluído')}</span>
          <strong>${carteiraUiHtml(fmtK(analise.vgvConcluido))}</strong>
          <small>${carteiraUiHtml('volume total que virou receita')}</small>
        </div>
        <div class="cart-distrato-kpi">
          <span>${carteiraUiHtml('Comissão líquida')}</span>
          <strong>${carteiraUiHtml(fmtK(analise.comissaoLiquida))}</strong>
          <small>${carteiraUiHtml('comissão convertida nas concluídas')}</small>
        </div>
        <div class="cart-distrato-kpi">
          <span>${carteiraUiHtml('Menor ciclo')}</span>
          <strong>${carteiraUiHtml(diasMenor)}</strong>
          <small>${carteiraUiHtml('venda mais rápida do recorte')}</small>
        </div>
        <div class="cart-distrato-kpi">
          <span>${carteiraUiHtml('Maior ciclo')}</span>
          <strong>${carteiraUiHtml(diasMaior)}</strong>
          <small>${carteiraUiHtml('venda mais longa do recorte')}</small>
        </div>
      </div>

      <div class="cart-distrato-grid">
        <div class="cart-distrato-card">
          <div class="cart-distrato-card-head">
            <div>
              <div class="cart-distrato-card-kicker">${carteiraUiHtml('Mês da conclusão')}</div>
              <h3>${carteiraUiHtml('Ritmo de fechamento')}</h3>
            </div>
            <span>${carteiraUiHtml('6m')}</span>
          </div>
          <div class="cart-distrato-card-copy">${carteiraUiHtml('Leitura por data em que a venda entrou em Comissão recebida.')}</div>
          ${renderCarteiraDistratoRows(analise.serieMensal, {
            vazio: 'Sem histórico suficiente para comparar meses de conclusão.',
            tone: 'success',
            widthFn: item => item.concluidas,
            valueFn: item => `${item.concluidas} concluídas`,
            metaFn: item => item.diasMedios === null ? 'ciclo sem base' : `ciclo médio de ${carteiraFmtDias(item.diasMedios)}`,
            extraFn: item => fmtK(item.zelony)
          })}
        </div>

        <div class="cart-distrato-card">
          <div class="cart-distrato-card-head">
            <div>
              <div class="cart-distrato-card-kicker">${carteiraUiHtml('Coorte de cadastro')}</div>
              <h3>${carteiraUiHtml('Velocidade por mês de entrada')}</h3>
            </div>
            <span>${carteiraUiHtml('6m')}</span>
          </div>
          <div class="cart-distrato-card-copy">${carteiraUiHtml(opts.cohortCopy || 'Mostra se as vendas cadastradas em cada mês estão fechando mais rápido ou mais devagar.')}</div>
          ${renderCarteiraDistratoRows(analise.coortesCadastro, {
            vazio: 'Sem base suficiente para montar as coortes de cadastro.',
            tone: 'gold',
            widthFn: item => item.taxaConclusao,
            valueFn: item => item.diasMedios === null ? 'Sem base' : `${item.diasMedios} dias`,
            metaFn: item => `${item.concluidas} concluídas de ${item.total} cadastradas • taxa ${fmtPctCarteira(item.taxaConclusao)}`,
            extraFn: item => fmtK(item.vgv)
          })}
        </div>

        <div class="cart-distrato-card">
          <div class="cart-distrato-card-head">
            <div>
              <div class="cart-distrato-card-kicker">${carteiraUiHtml('Gargalos do processo')}</div>
              <h3>${carteiraUiHtml('Etapas que mais seguram a venda')}</h3>
            </div>
            <span>${carteiraUiHtml('Top 5')}</span>
          </div>
          <div class="cart-distrato-card-copy">${carteiraUiHtml('Tempo médio gasto em cada etapa entre uma movimentação e a próxima.')}</div>
          ${renderCarteiraDistratoRows(analise.gargalos, {
            vazio: 'Sem base suficiente para medir duração por etapa.',
            tone: 'danger',
            widthFn: item => item.diasMedios,
            valueFn: item => `${item.diasMedios} dias`,
            metaFn: item => `${item.vendas} venda${item.vendas !== 1 ? 's' : ''} • pico de ${carteiraFmtDias(item.pico)}`,
            extraFn: item => `${item.trechos} passagens`
          })}
        </div>
      </div>

      <div class="cart-distrato-grid">
        <div class="cart-distrato-card">
          <div class="cart-distrato-card-head">
            <div>
              <div class="cart-distrato-card-kicker">${carteiraUiHtml('Unidades')}</div>
              <h3>${carteiraUiHtml('Onde mais se conclui')}</h3>
            </div>
            <span>${carteiraUiHtml('Top 5')}</span>
          </div>
          <div class="cart-distrato-card-copy">${carteiraUiHtml('Cruza volume concluído, taxa de conclusão e velocidade média do ciclo.')}</div>
          ${renderCarteiraDistratoRows(analise.unidades, {
            vazio: 'Sem concluídas suficientes para ranquear unidades.',
            tone: 'success',
            widthFn: item => item.concluidas,
            valueFn: item => fmtPctCarteira(item.taxaConclusao),
            metaFn: item => `${item.concluidas} concluídas em ${item.total} cadastradas • ${item.diasMedios === null ? 'ciclo sem base' : `ciclo médio de ${carteiraFmtDias(item.diasMedios)}`}`,
            extraFn: item => fmtK(item.vgv)
          })}
        </div>

        <div class="cart-distrato-card">
          <div class="cart-distrato-card-head">
            <div>
              <div class="cart-distrato-card-kicker">${carteiraUiHtml('Construtoras')}</div>
              <h3>${carteiraUiHtml('Parceiros com mais fechamento')}</h3>
            </div>
            <span>${carteiraUiHtml('Top 5')}</span>
          </div>
          <div class="cart-distrato-card-copy">${carteiraUiHtml('Ajuda a ver quais parcerias estão convertendo melhor e mais rápido.')}</div>
          ${renderCarteiraDistratoRows(analise.construtoras, {
            vazio: 'Sem concluídas suficientes para ranquear construtoras.',
            tone: 'success',
            widthFn: item => item.concluidas,
            valueFn: item => fmtPctCarteira(item.taxaConclusao),
            metaFn: item => `${item.concluidas} concluídas em ${item.total} cadastradas • ${item.diasMedios === null ? 'ciclo sem base' : `ciclo médio de ${carteiraFmtDias(item.diasMedios)}`}`,
            extraFn: item => fmtK(item.vgv)
          })}
        </div>

        <div class="cart-distrato-card">
          <div class="cart-distrato-card-head">
            <div>
              <div class="cart-distrato-card-kicker">${carteiraUiHtml('Origens')}</div>
              <h3>${carteiraUiHtml('Origens com melhor conversão')}</h3>
            </div>
            <span>${carteiraUiHtml('Top 5')}</span>
          </div>
          <div class="cart-distrato-card-copy">${carteiraUiHtml('Mostra quais origens entregam mais vendas concluídas e ciclos mais curtos.')}</div>
          ${renderCarteiraDistratoRows(analise.origens, {
            vazio: 'Sem concluídas suficientes para ranquear origens.',
            tone: 'gold',
            widthFn: item => item.taxaConclusao,
            valueFn: item => fmtPctCarteira(item.taxaConclusao),
            metaFn: item => `${item.concluidas} concluídas em ${item.total} cadastradas • ${item.diasMedios === null ? 'ciclo sem base' : `ciclo médio de ${carteiraFmtDias(item.diasMedios)}`}`,
            extraFn: item => fmtK(item.liq)
          })}
        </div>
      </div>

      <div class="cart-ranking">
        ${renderCarteiraConclusaoRanking(analise.corretores, 'Corretores com mais concluídas', 'Radar comercial', 'lucro Zelony')}
        ${renderCarteiraConclusaoRanking(analise.gerentes, 'Gerentes com mais concluídas', 'Liderança', 'lucro Zelony')}
      </div>
    </div>`;
}

