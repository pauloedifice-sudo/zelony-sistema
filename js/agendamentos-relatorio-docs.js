// AGENDAMENTOS - parte 2/4: relatorios de documentacao e de fechamento (PDF)
function agDocumentacaoRecebida(item) {
  return agTipoDocumentacao(item) && agSituacaoNormalizada(item) === 'concluida';
}

function agPercentualDocumentacao(valor, total) {
  if (!total) return '0%';
  return `${((Number(valor) || 0) / total * 100).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}%`;
}

function agFormatarMoedaRelatorio(valor) {
  const numero = Number(valor) || 0;
  if (!numero) return '—';
  return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function agMedianaDocumentacao(valores) {
  const lista = (Array.isArray(valores) ? valores : [])
    .map(Number)
    .filter(valor => Number.isFinite(valor) && valor > 0)
    .sort((a, b) => a - b);
  if (!lista.length) return 0;
  const meio = Math.floor(lista.length / 2);
  return lista.length % 2 ? lista[meio] : (lista[meio - 1] + lista[meio]) / 2;
}

function agDocumentacaoDadosCompletos(item) {
  return agRendaBrutaFamiliarNumero(item && item.rendaBrutaFamiliar) > 0
    && AG_LOCAIS_COMPRA.includes(agTexto(item && item.localCompra))
    && AG_TIPOS_IMOVEL_INTERESSE.includes(agTexto(item && item.tipoImovelInteresse))
    && AG_FINALIDADES_IMOVEL.includes(agTexto(item && item.finalidadeImovel));
}

function agDistribuicaoDocumentacao(lista, campo, opcoes) {
  const base = Array.isArray(lista) ? lista : [];
  const itens = (Array.isArray(opcoes) ? opcoes : []).map(opcao => {
    const valor = typeof opcao === 'string' ? opcao : opcao.valor;
    const rotulo = typeof opcao === 'string' ? opcao : opcao.rotulo;
    return {
      rotulo,
      quantidade: base.filter(item => agTexto(item && item[campo]) === valor).length
    };
  });
  const informados = itens.reduce((total, item) => total + item.quantidade, 0);
  itens.push({ rotulo: 'Não informado', quantidade: Math.max(base.length - informados, 0) });
  return itens;
}

function agDistribuicaoRendaDocumentacao(lista) {
  const base = Array.isArray(lista) ? lista : [];
  const faixas = [
    { rotulo: 'Até R$ 4 mil', teste: renda => renda <= 4000 },
    { rotulo: 'De R$ 4 mil a R$ 8 mil', teste: renda => renda > 4000 && renda <= 8000 },
    { rotulo: 'De R$ 8 mil a R$ 12 mil', teste: renda => renda > 8000 && renda <= 12000 },
    { rotulo: 'De R$ 12 mil a R$ 20 mil', teste: renda => renda > 12000 && renda <= 20000 },
    { rotulo: 'Acima de R$ 20 mil', teste: renda => renda > 20000 }
  ];
  const rendas = base.map(item => agRendaBrutaFamiliarNumero(item && item.rendaBrutaFamiliar));
  const itens = faixas.map(faixa => ({
    rotulo: faixa.rotulo,
    quantidade: rendas.filter(renda => renda > 0 && faixa.teste(renda)).length
  }));
  itens.push({ rotulo: 'Não informado', quantidade: rendas.filter(renda => !renda).length });
  return itens;
}

function agColetarDadosRelatorioDocumentacao() {
  const dadosGerais = agColetarDadosRelatorio();
  const lista = dadosGerais.lista.filter(agDocumentacaoRecebida);
  const rendas = lista
    .map(item => agRendaBrutaFamiliarNumero(item && item.rendaBrutaFamiliar))
    .filter(renda => renda > 0);
  const completos = lista.filter(agDocumentacaoDadosCompletos).length;
  const total = lista.length;
  return {
    ...dadosGerais,
    lista,
    total,
    completos,
    incompletos: Math.max(total - completos, 0),
    rendasInformadas: rendas.length,
    rendaMedia: rendas.length ? rendas.reduce((soma, renda) => soma + renda, 0) / rendas.length : 0,
    rendaMediana: agMedianaDocumentacao(rendas),
    localizacao: agDistribuicaoDocumentacao(lista, 'localCompra', AG_LOCAIS_COMPRA),
    tipoImovel: agDistribuicaoDocumentacao(lista, 'tipoImovelInteresse', AG_TIPOS_IMOVEL_INTERESSE),
    finalidade: agDistribuicaoDocumentacao(lista, 'finalidadeImovel', AG_FINALIDADES_IMOVEL),
    faixasRenda: agDistribuicaoRendaDocumentacao(lista)
  };
}

function agResumoDocumentacaoPorCampo(lista, obterNome, obterChave) {
  const mapa = new Map();
  (Array.isArray(lista) ? lista : []).forEach(item => {
    const nome = agTexto(obterNome(item)) || 'Não informado';
    const chave = (obterChave && agTexto(obterChave(item))) || agNormalizarTexto(nome) || nome;
    if (!mapa.has(chave)) {
      mapa.set(chave, {
        nome,
        total: 0,
        completos: 0,
        rendas: [],
        curitiba: 0,
        metropolitana: 0,
        casa: 0,
        apartamento: 0,
        moradia: 0,
        investimento: 0
      });
    }
    const resumo = mapa.get(chave);
    const renda = agRendaBrutaFamiliarNumero(item && item.rendaBrutaFamiliar);
    resumo.total += 1;
    if (agDocumentacaoDadosCompletos(item)) resumo.completos += 1;
    if (renda) resumo.rendas.push(renda);
    if (agTexto(item && item.localCompra) === 'Curitiba') resumo.curitiba += 1;
    if (agTexto(item && item.localCompra) === 'Região metropolitana') resumo.metropolitana += 1;
    if (agTexto(item && item.tipoImovelInteresse) === 'Casa') resumo.casa += 1;
    if (agTexto(item && item.tipoImovelInteresse) === 'Apartamento') resumo.apartamento += 1;
    if (agTexto(item && item.finalidadeImovel) === 'Moradia') resumo.moradia += 1;
    if (agTexto(item && item.finalidadeImovel) === 'Investimento') resumo.investimento += 1;
  });
  return Array.from(mapa.values())
    .map(item => ({
      ...item,
      rendaMedia: item.rendas.length ? item.rendas.reduce((soma, renda) => soma + renda, 0) / item.rendas.length : 0
    }))
    .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome, 'pt-BR'));
}

function agCabecalhoRelatorioDocumentacao(doc, titulo, total, largura) {
  doc.setFillColor(184, 93, 31);
  doc.rect(0, 0, largura, 18, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.text(titulo, 10, 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(`${total} documentação(ões) recebida(s)`, largura - 10, 11, { align: 'right' });
}

function agDesenharDistribuicaoDocumentacao(doc, config) {
  const itens = Array.isArray(config.itens) ? config.itens : [];
  doc.setFillColor(253, 248, 238);
  doc.setDrawColor(224, 186, 150);
  doc.roundedRect(config.x, config.y, config.w, config.h, 2.5, 2.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.4);
  doc.setTextColor(145, 71, 24);
  doc.text(config.titulo, config.x + 4, config.y + 6);
  itens.forEach((item, index) => {
    const linhaY = config.y + 12 + (index * 6.4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.7);
    doc.setTextColor(72, 58, 38);
    doc.text(agTexto(item.rotulo), config.x + 4, linhaY);
    doc.setFont('helvetica', 'bold');
    doc.text(`${item.quantidade} (${agPercentualDocumentacao(item.quantidade, config.total)})`, config.x + config.w - 4, linhaY, { align: 'right' });
  });
}

function agTabelaResumoDocumentacao(doc, config) {
  doc.autoTable({
    startY: config.startY,
    margin: { left: 10, right: 10, top: 22 },
    head: [[config.titulo, 'Docs', 'Dados completos', 'Renda média', 'Curitiba', 'RMC', 'Casa', 'Apto.', 'Moradia', 'Invest.']],
    body: (config.lista || []).map(item => [
      item.nome,
      item.total,
      `${item.completos} (${agPercentualDocumentacao(item.completos, item.total)})`,
      agFormatarMoedaRelatorio(item.rendaMedia),
      item.curitiba,
      item.metropolitana,
      item.casa,
      item.apartamento,
      item.moradia,
      item.investimento
    ]),
    theme: 'plain',
    headStyles: { fillColor: [253, 241, 232], textColor: [164, 75, 22], fontSize: 6.5, fontStyle: 'bold', halign: 'center' },
    bodyStyles: { fontSize: 6.3, textColor: [60, 48, 30], valign: 'middle', halign: 'center' },
    alternateRowStyles: { fillColor: [250, 245, 236] },
    styles: { cellPadding: 1.5, overflow: 'linebreak', lineColor: [232, 214, 195], lineWidth: 0.12 },
    columnStyles: {
      0: { cellWidth: 60, halign: 'left', fontStyle: 'bold' },
      1: { cellWidth: 18 },
      2: { cellWidth: 32 },
      3: { cellWidth: 32 },
      4: { cellWidth: 22 },
      5: { cellWidth: 22 },
      6: { cellWidth: 22 },
      7: { cellWidth: 22 },
      8: { cellWidth: 22 },
      9: { cellWidth: 25 }
    }
  });
  return doc.lastAutoTable.finalY;
}

function exportarRelatorioDocumentacoes() {
  const btn = document.getElementById('ag-docs-report-btn');
  const textoOriginal = btn ? btn.textContent : '';
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Gerando documentação...';
  }

  setTimeout(() => {
    try {
      const dados = agColetarDadosRelatorioDocumentacao();
      if (!dados.lista.length) {
        showToast('PDF', 'Não há documentações recebidas com os filtros atuais para gerar o relatório.');
        return;
      }
      if (!window.jspdf || !window.jspdf.jsPDF) throw new Error('Biblioteca PDF indisponível.');
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      if (typeof doc.autoTable !== 'function') throw new Error('Plugin de tabelas do PDF indisponível.');

      const W = doc.internal.pageSize.getWidth();
      const H = doc.internal.pageSize.getHeight();
      const filtrosLinha = dados.filtrosResumo.join(' | ');
      const resumoEquipe = agResumoDocumentacaoPorCampo(dados.lista, item => agEquipeValor(item));
      const resumoCorretor = agResumoDocumentacaoPorCampo(dados.lista, item => item && item.corretor, item => agCorretorFiltroValor(item));

      doc.setFillColor(184, 93, 31);
      doc.rect(0, 0, W, 24, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.text('ZELONY IMOVEIS', 10, 9);
      doc.setFontSize(10.5);
      doc.text('RELATORIO DE DOCUMENTACOES RECEBIDAS', 10, 17);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(`Gerado em ${hoje()} | ${dados.total} registro(s)`, W - 10, 16, { align: 'right' });

      doc.setFillColor(253, 248, 238);
      doc.setDrawColor(224, 186, 150);
      doc.roundedRect(10, 29, W - 20, 20, 3, 3, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.4);
      doc.setTextColor(145, 71, 24);
      doc.text('Escopo', 14, 35);
      doc.text('Filtros', 14, 43);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(70, 56, 32);
      doc.text(doc.splitTextToSize(agResumoPermissao(), W - 42), 36, 35);
      doc.text(doc.splitTextToSize(filtrosLinha, W - 42), 36, 43);

      const kpis = [
        ['Recebidas', String(dados.total)],
        ['Dados completos', `${dados.completos} (${agPercentualDocumentacao(dados.completos, dados.total)})`],
        ['Renda informada', `${dados.rendasInformadas} de ${dados.total}`],
        ['Renda média', agFormatarMoedaRelatorio(dados.rendaMedia)],
        ['Renda mediana', agFormatarMoedaRelatorio(dados.rendaMediana)],
        ['Sem dados completos', String(dados.incompletos)]
      ];
      const kpiY = 55;
      const kpiW = (W - 20) / kpis.length;
      kpis.forEach(([label, value], index) => {
        const x = 10 + (index * kpiW);
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(224, 186, 150);
        doc.roundedRect(x, kpiY, kpiW - 2, 19, 2.5, 2.5, 'FD');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.2);
        doc.setTextColor(145, 91, 50);
        doc.text(label.toUpperCase(), x + ((kpiW - 2) / 2), kpiY + 6, { align: 'center' });
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(value.length > 15 ? 8 : 10);
        doc.setTextColor(184, 93, 31);
        doc.text(value, x + ((kpiW - 2) / 2), kpiY + 14, { align: 'center' });
      });

      const gap = 5;
      const blocoW = (W - 20 - (gap * 2)) / 3;
      agDesenharDistribuicaoDocumentacao(doc, { x: 10, y: 81, w: blocoW, h: 35, titulo: 'LOCAL DE COMPRA', itens: dados.localizacao, total: dados.total });
      agDesenharDistribuicaoDocumentacao(doc, { x: 10 + blocoW + gap, y: 81, w: blocoW, h: 35, titulo: 'TIPO DE IMOVEL', itens: dados.tipoImovel, total: dados.total });
      agDesenharDistribuicaoDocumentacao(doc, { x: 10 + ((blocoW + gap) * 2), y: 81, w: blocoW, h: 35, titulo: 'FINALIDADE', itens: dados.finalidade, total: dados.total });
      agDesenharDistribuicaoDocumentacao(doc, { x: 10, y: 122, w: W - 20, h: 52, titulo: 'DISTRIBUICAO POR FAIXA DE RENDA', itens: dados.faixasRenda, total: dados.total });

      doc.setFillColor(253, 241, 232);
      doc.setDrawColor(224, 186, 150);
      doc.roundedRect(10, 180, W - 20, 15, 2.5, 2.5, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(145, 71, 24);
      doc.text('Leitura dos dados', 14, 186);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(70, 56, 32);
      const nota = `${dados.incompletos} registro(s) sem qualificação completa podem corresponder a documentações recebidas antes da criação destas perguntas. Médias de renda consideram somente os ${dados.rendasInformadas} registro(s) com renda informada.`;
      doc.text(doc.splitTextToSize(nota, W - 28), 14, 191);

      doc.addPage();
      agCabecalhoRelatorioDocumentacao(doc, 'VISAO OPERACIONAL POR EQUIPE E CORRETOR', dados.total, W);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(145, 71, 24);
      doc.text('Resumo por equipe', 10, 24);
      let finalY = agTabelaResumoDocumentacao(doc, { titulo: 'Equipe', lista: resumoEquipe, startY: 27 });
      let proximoY = finalY + 11;
      if (proximoY > H - 45) {
        doc.addPage();
        agCabecalhoRelatorioDocumentacao(doc, 'VISAO OPERACIONAL POR CORRETOR', dados.total, W);
        proximoY = 27;
      } else {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(145, 71, 24);
        doc.text('Resumo por corretor', 10, proximoY - 3);
      }
      agTabelaResumoDocumentacao(doc, { titulo: 'Corretor', lista: resumoCorretor, startY: proximoY });

      doc.addPage();
      agCabecalhoRelatorioDocumentacao(doc, 'DETALHAMENTO DAS DOCUMENTACOES RECEBIDAS', dados.total, W);
      doc.autoTable({
        startY: 23,
        margin: { left: 7, right: 7, top: 23 },
        head: [['#', 'Recebida em', 'Agendada para', 'Unidade', 'Equipe', 'Corretor', 'Cliente', 'Telefone', 'Renda familiar', 'Local', 'Imóvel', 'Finalidade']],
        body: dados.lista.map(item => [
          item.id || '',
          agFormatarDataRelatorio(item.tratativaEm, { comHora: true }),
          agFormatarDataHoraRelatorio(item.dataAgendamento, item.horarioAgendamento),
          agTexto(item.unidade || '—'),
          agTexto(agEquipeValor(item)),
          agTexto(item.corretor || '—'),
          agTexto(item.cliente || '—'),
          agTexto(agFormatarTelefone(item.telefone || '') || item.telefone || '—'),
          agFormatarMoedaRelatorio(agRendaBrutaFamiliarNumero(item.rendaBrutaFamiliar)),
          agTexto(item.localCompra || 'Não informado'),
          agTexto(item.tipoImovelInteresse || 'Não informado'),
          agTexto(item.finalidadeImovel || 'Não informado')
        ]),
        theme: 'plain',
        headStyles: { fillColor: [253, 241, 232], textColor: [164, 75, 22], fontSize: 6.1, fontStyle: 'bold', halign: 'center' },
        bodyStyles: { fontSize: 5.9, textColor: [60, 48, 30], valign: 'top' },
        alternateRowStyles: { fillColor: [250, 245, 236] },
        styles: { cellPadding: 1.3, overflow: 'linebreak', lineColor: [232, 214, 195], lineWidth: 0.12 },
        columnStyles: {
          0: { cellWidth: 7 },
          1: { cellWidth: 22 },
          2: { cellWidth: 22 },
          3: { cellWidth: 18 },
          4: { cellWidth: 22 },
          5: { cellWidth: 30 },
          6: { cellWidth: 38 },
          7: { cellWidth: 24 },
          8: { cellWidth: 27 },
          9: { cellWidth: 30 },
          10: { cellWidth: 21 },
          11: { cellWidth: 22 }
        }
      });

      const totalPaginas = doc.getNumberOfPages();
      for (let pagina = 1; pagina <= totalPaginas; pagina++) {
        doc.setPage(pagina);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.7);
        doc.setTextColor(140, 110, 80);
        doc.text(`Documentações recebidas | ${dados.periodoResumo} | Página ${pagina} de ${totalPaginas}`, W / 2, H - 4, { align: 'center' });
      }

      doc.save(`documentacoes-recebidas-${agHojeIso()}.pdf`);
      showToast('OK', 'Relatório de documentações recebidas gerado com sucesso.');
    } catch (erro) {
      console.error('Erro ao gerar relatório de documentações:', erro);
      showToast('ERRO', 'Não foi possível gerar o relatório de documentações recebidas.');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = textoOriginal || 'Relatório documentações';
      }
    }
  }, 80);
}

function agFechamentoConcluido(item) {
  return agTipoFechamento(item) && agSituacaoNormalizada(item) === 'concluida';
}

function agFechamentoDadosCompletos(item) {
  return agRendaBrutaFamiliarNumero(item && item.rendaBrutaFamiliar) > 0
    && AG_TIPOS_IMOVEL_INTERESSE.includes(agTexto(item && item.tipoImovelInteresse))
    && AG_FINALIDADES_IMOVEL.includes(agTexto(item && item.finalidadeImovel))
    && agRespostaBooleana(item && item.assinouPropostaCompra) !== null
    && agRespostaBooleana(item && item.pagouAto) !== null;
}

function agRespostaSimNaoRotulo(valor) {
  const resposta = agRespostaBooleana(valor);
  return resposta === true ? 'Sim' : (resposta === false ? 'Não' : 'Não informado');
}

function agDistribuicaoRespostaFechamento(lista, campo) {
  const base = Array.isArray(lista) ? lista : [];
  return [
    { rotulo: 'Sim', quantidade: base.filter(item => agRespostaBooleana(item && item[campo]) === true).length },
    { rotulo: 'Não', quantidade: base.filter(item => agRespostaBooleana(item && item[campo]) === false).length },
    { rotulo: 'Não informado', quantidade: base.filter(item => agRespostaBooleana(item && item[campo]) === null).length }
  ];
}

function agColetarDadosRelatorioFechamento() {
  const dadosGerais = agColetarDadosRelatorio();
  const lista = dadosGerais.lista.filter(agFechamentoConcluido);
  const rendas = lista
    .map(item => agRendaBrutaFamiliarNumero(item && item.rendaBrutaFamiliar))
    .filter(renda => renda > 0);
  const completos = lista.filter(agFechamentoDadosCompletos).length;
  const total = lista.length;
  return {
    ...dadosGerais,
    lista,
    total,
    completos,
    incompletos: Math.max(total - completos, 0),
    rendasInformadas: rendas.length,
    rendaMedia: rendas.length ? rendas.reduce((soma, renda) => soma + renda, 0) / rendas.length : 0,
    rendaMediana: agMedianaDocumentacao(rendas),
    propostasAssinadas: lista.filter(item => agRespostaBooleana(item && item.assinouPropostaCompra) === true).length,
    atosPagos: lista.filter(item => agRespostaBooleana(item && item.pagouAto) === true).length,
    tipoImovel: agDistribuicaoDocumentacao(lista, 'tipoImovelInteresse', AG_TIPOS_IMOVEL_INTERESSE),
    finalidade: agDistribuicaoDocumentacao(lista, 'finalidadeImovel', AG_FINALIDADES_IMOVEL),
    proposta: agDistribuicaoRespostaFechamento(lista, 'assinouPropostaCompra'),
    ato: agDistribuicaoRespostaFechamento(lista, 'pagouAto'),
    faixasRenda: agDistribuicaoRendaDocumentacao(lista)
  };
}

function agResumoFechamentoPorCampo(lista, obterNome, obterChave) {
  const mapa = new Map();
  (Array.isArray(lista) ? lista : []).forEach(item => {
    const nome = agTexto(obterNome(item)) || 'Não informado';
    const chave = (obterChave && agTexto(obterChave(item))) || agNormalizarTexto(nome) || nome;
    if (!mapa.has(chave)) {
      mapa.set(chave, {
        nome,
        total: 0,
        completos: 0,
        rendas: [],
        casa: 0,
        apartamento: 0,
        moradia: 0,
        investimento: 0,
        propostasAssinadas: 0,
        atosPagos: 0
      });
    }
    const resumo = mapa.get(chave);
    const renda = agRendaBrutaFamiliarNumero(item && item.rendaBrutaFamiliar);
    resumo.total += 1;
    if (agFechamentoDadosCompletos(item)) resumo.completos += 1;
    if (renda) resumo.rendas.push(renda);
    if (agTexto(item && item.tipoImovelInteresse) === 'Casa') resumo.casa += 1;
    if (agTexto(item && item.tipoImovelInteresse) === 'Apartamento') resumo.apartamento += 1;
    if (agTexto(item && item.finalidadeImovel) === 'Moradia') resumo.moradia += 1;
    if (agTexto(item && item.finalidadeImovel) === 'Investimento') resumo.investimento += 1;
    if (agRespostaBooleana(item && item.assinouPropostaCompra) === true) resumo.propostasAssinadas += 1;
    if (agRespostaBooleana(item && item.pagouAto) === true) resumo.atosPagos += 1;
  });
  return Array.from(mapa.values())
    .map(item => ({
      ...item,
      rendaMedia: item.rendas.length ? item.rendas.reduce((soma, renda) => soma + renda, 0) / item.rendas.length : 0
    }))
    .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome, 'pt-BR'));
}

function agCabecalhoRelatorioFechamento(doc, titulo, total, largura) {
  doc.setFillColor(35, 122, 82);
  doc.rect(0, 0, largura, 18, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.text(titulo, 10, 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(`${total} fechamento(s) concluído(s)`, largura - 10, 11, { align: 'right' });
}

function agDesenharDistribuicaoFechamento(doc, config) {
  const itens = Array.isArray(config.itens) ? config.itens : [];
  doc.setFillColor(238, 248, 242);
  doc.setDrawColor(166, 212, 183);
  doc.roundedRect(config.x, config.y, config.w, config.h, 2.5, 2.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(31, 101, 69);
  doc.text(config.titulo, config.x + 4, config.y + 6);
  itens.forEach((item, index) => {
    const linhaY = config.y + 12 + (index * 6.4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(52, 72, 60);
    doc.text(agTexto(item.rotulo), config.x + 4, linhaY);
    doc.setFont('helvetica', 'bold');
    doc.text(`${item.quantidade} (${agPercentualDocumentacao(item.quantidade, config.total)})`, config.x + config.w - 4, linhaY, { align: 'right' });
  });
}

function agTabelaResumoFechamento(doc, config) {
  doc.autoTable({
    startY: config.startY,
    margin: { left: 10, right: 10, top: 22 },
    head: [[config.titulo, 'Fech.', 'Dados completos', 'Renda média', 'Casa', 'Apto.', 'Moradia', 'Invest.', 'Proposta sim', 'Ato pago']],
    body: (config.lista || []).map(item => [
      item.nome,
      item.total,
      `${item.completos} (${agPercentualDocumentacao(item.completos, item.total)})`,
      agFormatarMoedaRelatorio(item.rendaMedia),
      item.casa,
      item.apartamento,
      item.moradia,
      item.investimento,
      item.propostasAssinadas,
      item.atosPagos
    ]),
    theme: 'plain',
    headStyles: { fillColor: [238, 248, 242], textColor: [31, 101, 69], fontSize: 6.5, fontStyle: 'bold', halign: 'center' },
    bodyStyles: { fontSize: 6.3, textColor: [44, 65, 52], valign: 'middle', halign: 'center' },
    alternateRowStyles: { fillColor: [244, 250, 246] },
    styles: { cellPadding: 1.5, overflow: 'linebreak', lineColor: [200, 225, 210], lineWidth: 0.12 },
    columnStyles: {
      0: { cellWidth: 60, halign: 'left', fontStyle: 'bold' },
      1: { cellWidth: 18 },
      2: { cellWidth: 32 },
      3: { cellWidth: 32 },
      4: { cellWidth: 22 },
      5: { cellWidth: 22 },
      6: { cellWidth: 22 },
      7: { cellWidth: 22 },
      8: { cellWidth: 25 },
      9: { cellWidth: 22 }
    }
  });
  return doc.lastAutoTable.finalY;
}

function exportarRelatorioFechamentos() {
  const btn = document.getElementById('ag-close-report-btn');
  const textoOriginal = btn ? btn.textContent : '';
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Gerando fechamentos...';
  }

  setTimeout(() => {
    try {
      const dados = agColetarDadosRelatorioFechamento();
      if (!dados.lista.length) {
        showToast('PDF', 'Não há fechamentos concluídos com os filtros atuais para gerar o relatório.');
        return;
      }
      if (!window.jspdf || !window.jspdf.jsPDF) throw new Error('Biblioteca PDF indisponível.');
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      if (typeof doc.autoTable !== 'function') throw new Error('Plugin de tabelas do PDF indisponível.');

      const W = doc.internal.pageSize.getWidth();
      const H = doc.internal.pageSize.getHeight();
      const filtrosLinha = dados.filtrosResumo.join(' | ');
      const resumoEquipe = agResumoFechamentoPorCampo(dados.lista, item => agEquipeValor(item));
      const resumoCorretor = agResumoFechamentoPorCampo(dados.lista, item => item && item.corretor, item => agCorretorFiltroValor(item));

      doc.setFillColor(35, 122, 82);
      doc.rect(0, 0, W, 24, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.text('ZELONY IMOVEIS', 10, 9);
      doc.setFontSize(10.5);
      doc.text('RELATORIO DE FECHAMENTOS CONCLUIDOS', 10, 17);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(`Gerado em ${hoje()} | ${dados.total} registro(s)`, W - 10, 16, { align: 'right' });

      doc.setFillColor(238, 248, 242);
      doc.setDrawColor(166, 212, 183);
      doc.roundedRect(10, 29, W - 20, 20, 3, 3, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.4);
      doc.setTextColor(31, 101, 69);
      doc.text('Escopo', 14, 35);
      doc.text('Filtros', 14, 43);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(44, 65, 52);
      doc.text(doc.splitTextToSize(agResumoPermissao(), W - 42), 36, 35);
      doc.text(doc.splitTextToSize(filtrosLinha, W - 42), 36, 43);

      const kpis = [
        ['Concluídos', String(dados.total)],
        ['Dados completos', `${dados.completos} (${agPercentualDocumentacao(dados.completos, dados.total)})`],
        ['Renda média', agFormatarMoedaRelatorio(dados.rendaMedia)],
        ['Renda mediana', agFormatarMoedaRelatorio(dados.rendaMediana)],
        ['Proposta assinada', `${dados.propostasAssinadas} (${agPercentualDocumentacao(dados.propostasAssinadas, dados.total)})`],
        ['Ato pago', `${dados.atosPagos} (${agPercentualDocumentacao(dados.atosPagos, dados.total)})`],
        ['Sem dados completos', String(dados.incompletos)]
      ];
      const kpiY = 55;
      const kpiW = (W - 20) / kpis.length;
      kpis.forEach(([label, value], index) => {
        const x = 10 + (index * kpiW);
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(166, 212, 183);
        doc.roundedRect(x, kpiY, kpiW - 2, 19, 2.5, 2.5, 'FD');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.9);
        doc.setTextColor(55, 105, 76);
        doc.text(label.toUpperCase(), x + ((kpiW - 2) / 2), kpiY + 6, { align: 'center' });
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(value.length > 15 ? 7.2 : 9.2);
        doc.setTextColor(35, 122, 82);
        doc.text(value, x + ((kpiW - 2) / 2), kpiY + 14, { align: 'center' });
      });

      const gap = 5;
      const blocoW = (W - 20 - (gap * 3)) / 4;
      agDesenharDistribuicaoFechamento(doc, { x: 10, y: 81, w: blocoW, h: 35, titulo: 'TIPO DE IMOVEL', itens: dados.tipoImovel, total: dados.total });
      agDesenharDistribuicaoFechamento(doc, { x: 10 + blocoW + gap, y: 81, w: blocoW, h: 35, titulo: 'FINALIDADE', itens: dados.finalidade, total: dados.total });
      agDesenharDistribuicaoFechamento(doc, { x: 10 + ((blocoW + gap) * 2), y: 81, w: blocoW, h: 35, titulo: 'PROPOSTA ASSINADA', itens: dados.proposta, total: dados.total });
      agDesenharDistribuicaoFechamento(doc, { x: 10 + ((blocoW + gap) * 3), y: 81, w: blocoW, h: 35, titulo: 'ATO PAGO', itens: dados.ato, total: dados.total });
      agDesenharDistribuicaoFechamento(doc, { x: 10, y: 122, w: W - 20, h: 52, titulo: 'DISTRIBUICAO POR FAIXA DE RENDA', itens: dados.faixasRenda, total: dados.total });

      doc.setFillColor(238, 248, 242);
      doc.setDrawColor(166, 212, 183);
      doc.roundedRect(10, 180, W - 20, 15, 2.5, 2.5, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(31, 101, 69);
      doc.text('Funil do fechamento', 14, 186);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(44, 65, 52);
      const nota = `${dados.total} fechamento(s) concluído(s) → ${dados.propostasAssinadas} proposta(s) assinada(s) → ${dados.atosPagos} ato(s) pago(s). ${dados.incompletos} registro(s) antigos ainda não possuem todos os dados de qualificação.`;
      doc.text(doc.splitTextToSize(nota, W - 28), 14, 191);

      doc.addPage();
      agCabecalhoRelatorioFechamento(doc, 'VISAO OPERACIONAL POR EQUIPE E CORRETOR', dados.total, W);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(31, 101, 69);
      doc.text('Resumo por equipe', 10, 24);
      let finalY = agTabelaResumoFechamento(doc, { titulo: 'Equipe', lista: resumoEquipe, startY: 27 });
      let proximoY = finalY + 11;
      if (proximoY > H - 45) {
        doc.addPage();
        agCabecalhoRelatorioFechamento(doc, 'VISAO OPERACIONAL POR CORRETOR', dados.total, W);
        proximoY = 27;
      } else {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(31, 101, 69);
        doc.text('Resumo por corretor', 10, proximoY - 3);
      }
      agTabelaResumoFechamento(doc, { titulo: 'Corretor', lista: resumoCorretor, startY: proximoY });

      doc.addPage();
      agCabecalhoRelatorioFechamento(doc, 'DETALHAMENTO DOS FECHAMENTOS CONCLUIDOS', dados.total, W);
      doc.autoTable({
        startY: 23,
        margin: { left: 7, right: 7, top: 23 },
        head: [['#', 'Concluído em', 'Agendado para', 'Unidade', 'Equipe', 'Corretor', 'Cliente', 'Telefone', 'Renda', 'Imóvel', 'Finalidade', 'Proposta', 'Ato']],
        body: dados.lista.map(item => [
          item.id || '',
          agFormatarDataRelatorio(item.tratativaEm, { comHora: true }),
          agFormatarDataHoraRelatorio(item.dataAgendamento, item.horarioAgendamento),
          agTexto(item.unidade || '—'),
          agTexto(agEquipeValor(item)),
          agTexto(item.corretor || '—'),
          agTexto(item.cliente || '—'),
          agTexto(agFormatarTelefone(item.telefone || '') || item.telefone || '—'),
          agFormatarMoedaRelatorio(agRendaBrutaFamiliarNumero(item.rendaBrutaFamiliar)),
          agTexto(item.tipoImovelInteresse || 'Não informado'),
          agTexto(item.finalidadeImovel || 'Não informado'),
          agRespostaSimNaoRotulo(item.assinouPropostaCompra),
          agRespostaSimNaoRotulo(item.pagouAto)
        ]),
        theme: 'plain',
        headStyles: { fillColor: [238, 248, 242], textColor: [31, 101, 69], fontSize: 6, fontStyle: 'bold', halign: 'center' },
        bodyStyles: { fontSize: 5.8, textColor: [44, 65, 52], valign: 'top' },
        alternateRowStyles: { fillColor: [244, 250, 246] },
        styles: { cellPadding: 1.3, overflow: 'linebreak', lineColor: [200, 225, 210], lineWidth: 0.12 },
        columnStyles: {
          0: { cellWidth: 7 },
          1: { cellWidth: 22 },
          2: { cellWidth: 22 },
          3: { cellWidth: 18 },
          4: { cellWidth: 22 },
          5: { cellWidth: 28 },
          6: { cellWidth: 36 },
          7: { cellWidth: 24 },
          8: { cellWidth: 26 },
          9: { cellWidth: 20 },
          10: { cellWidth: 22 },
          11: { cellWidth: 18 },
          12: { cellWidth: 18 }
        }
      });

      const totalPaginas = doc.getNumberOfPages();
      for (let pagina = 1; pagina <= totalPaginas; pagina++) {
        doc.setPage(pagina);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.7);
        doc.setTextColor(85, 120, 98);
        doc.text(`Fechamentos concluídos | ${dados.periodoResumo} | Página ${pagina} de ${totalPaginas}`, W / 2, H - 4, { align: 'center' });
      }

      doc.save(`fechamentos-concluidos-${agHojeIso()}.pdf`);
      showToast('OK', 'Relatório de fechamentos concluídos gerado com sucesso.');
    } catch (erro) {
      console.error('Erro ao gerar relatório de fechamentos:', erro);
      showToast('ERRO', 'Não foi possível gerar o relatório de fechamentos concluídos.');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = textoOriginal || 'Relatório fechamentos';
      }
    }
  }, 80);
}

