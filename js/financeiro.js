// FINANCEIRO
// Módulo Financeiro - calendário de previsões de recebimento

let finMesAtual=new Date().getMonth();
let finAnoAtual=new Date().getFullYear();
zSetState('state.ui.finMesAtual', finMesAtual);
zSetState('state.ui.finAnoAtual', finAnoAtual);

function renderFinanceiro(){
  if(!['dono','fin','dir'].includes(role)){
    document.getElementById('financeiro-content').innerHTML=`<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:40px;"><div style="font-size:48px;">${zUiText('🔒')}</div><div style="font-family:'Playfair Display',serif;font-size:22px;font-weight:600;color:var(--gold);">${zUiText('Acesso restrito')}</div><div style="font-size:12px;color:var(--tm);text-align:center;max-width:280px;">${zUiText('Apenas o Dono, Diretor e Financeiro têm acesso a este módulo.')}</div></div>`;
    return;
  }

  const meses=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const mes=finMesAtual, ano=finAnoAtual;

  // Coleta previsões do mês
  const previsoes={};
  VENDAS.forEach(v=>{
    if(v.distratada||v.etapa===0||v.etapa>=ETAPAS.length-1) return;
    const prev=calcPrevisao(v);
    if(!prev) return;
    const partes=prev.data.split('/');
    if(parseInt(partes[1])-1!==mes||parseInt(partes[2])!==ano) return;
    const dia=parseInt(partes[0]);
    if(!previsoes[dia]) previsoes[dia]=[];
    previsoes[dia].push({v,prev});
  });

  // Vendas concluídas neste mês
  const recebidas=VENDAS.filter(v=>{
    if(v.distratada||v.etapa!==ETAPAS.length-1) return false;
    const ultHist=v.hist&&v.hist.length?v.hist[v.hist.length-1]:null;
    if(!ultHist||!ultHist.d) return false;
    const p=ultHist.d.split('/');
    return p.length>=2&&parseInt(p[1])-1===mes;
  });

  const totalPrevistoLiq=Object.values(previsoes).flat().reduce((s,{v})=>s+comZ(v),0);
  const totalPrevistoBrut=Object.values(previsoes).flat().reduce((s,{v})=>s+(v.valor*v.pct),0);
  const totalRecebidoLiq=recebidas.reduce((s,v)=>s+comZ(v),0);
  const totalRecebidoBrut=recebidas.reduce((s,v)=>s+(v.valor*v.pct),0);

  const primeiroDia=new Date(ano,mes,1).getDay();
  const diasNoMes=new Date(ano,mes+1,0).getDate();
  const hoje=new Date();
  const diasSemana=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

  let cells='';
  for(let i=0;i<primeiroDia;i++) cells+=`<div class="fcal-cell fcal-empty"></div>`;

  for(let d=1;d<=diasNoMes;d++){
    const isHoje=d===hoje.getDate()&&mes===hoje.getMonth()&&ano===hoje.getFullYear();
    const isPast=new Date(ano,mes,d)<new Date(hoje.getFullYear(),hoje.getMonth(),hoje.getDate());
    const prevs=previsoes[d]||[];
    const receb=recebidas.filter(v=>{
      const p=v.hist[v.hist.length-1]?.d?.split('/');
      return p&&parseInt(p[0])===d;
    });
    const totalDiaBrut=prevs.reduce((s,{v})=>s+(v.valor*v.pct),0)+receb.reduce((s,v)=>s+(v.valor*v.pct),0);
    cells+=`<div class="fcal-cell${isHoje?' fcal-hoje':''}${isPast&&(prevs.length||receb.length)?' fcal-past':''}">
      <div class="fcal-num${isHoje?' fcal-num-hoje':''}">${d}</div>
      ${receb.map(v=>`<div class="fcal-ev fcal-recebida" onclick="irParaVenda(${v.id})" title="${zUiText(`${v.cliente.split('/')[0].trim()} — clique para ver a venda`)}" style="cursor:pointer;"><div class="fcal-ev-nome">${zUiText('✅')} ${zUiText(nomeCalendario(v.cliente))}</div><div class="fcal-ev-val">${fmt(v.valor*v.pct)}</div></div>`).join('')}
      ${prevs.map(({v,prev})=>`<div class="fcal-ev ${prev.totalAtraso>0?'fcal-atrasada':'fcal-prevista'}" onclick="irParaVenda(${v.id})" title="${zUiText(`${v.cliente.split('/')[0].trim()} — clique para ver a venda`)}" style="cursor:pointer;"><div class="fcal-ev-nome">${prev.totalAtraso>0?zUiText('🔴'):zUiText('📅')} ${zUiText(nomeCalendario(v.cliente))}</div><div class="fcal-ev-val">${fmt(v.valor*v.pct)}</div></div>`).join('')}
      ${totalDiaBrut>0?`<div class="fcal-total">${fmtK(totalDiaBrut)}</div>`:''}
    </div>`;
  }

  document.getElementById('financeiro-content').innerHTML=`
  <style>
    .fcal-wrap{display:flex;flex-direction:column;gap:12px;padding:4px;}
    .fcal-header{display:flex;align-items:center;justify-content:space-between;background:var(--bg);border:1px solid var(--bd);border-radius:10px;padding:14px 18px;}
    .fcal-title{font-family:'Playfair Display',serif;font-size:20px;font-weight:700;color:var(--gold);}
    .fcal-nav{display:flex;gap:6px;}
    .fcal-nav button{background:var(--bg2);border:1px solid var(--bd);border-radius:6px;padding:5px 12px;cursor:pointer;font-size:12px;color:var(--ts);font-family:'Inter',sans-serif;}
    .fcal-nav button:hover{border-color:var(--gold);color:var(--gold);}
    .fcal-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}
    .fcal-kpi{background:var(--bg);border:1px solid var(--bd);border-radius:9px;padding:12px 16px;}
    .fcal-kpi-l{font-size:9px;text-transform:uppercase;letter-spacing:0.08em;color:var(--tm);font-weight:600;margin-bottom:4px;}
    .fcal-kpi-v{font-size:20px;font-weight:700;font-family:'Playfair Display',serif;}
    .fcal-grid-header{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;}
    .fcal-dow{text-align:center;font-size:9px;font-weight:700;color:var(--tm);text-transform:uppercase;padding:4px 0;}
    .fcal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;}
    .fcal-cell{background:var(--bg);border:1px solid var(--bd);border-radius:6px;padding:6px;min-height:80px;position:relative;}
    .fcal-cell.fcal-empty{background:transparent;border-color:transparent;}
    .fcal-cell.fcal-hoje{border-color:var(--gold);box-shadow:0 0 0 1px var(--gold);}
    .fcal-num{font-size:11px;font-weight:600;color:var(--tm);margin-bottom:4px;}
    .fcal-num-hoje{color:var(--gold);}
    .fcal-ev{border-radius:4px;padding:2px 5px;margin-bottom:2px;cursor:pointer;transition:opacity 0.15s;}
    .fcal-ev:hover{opacity:0.75;}
    .fcal-prevista{background:#EEF4FE;border-left:2px solid #3060B8;}
    .fcal-atrasada{background:#FEF0EC;border-left:2px solid #C05030;}
    .fcal-recebida{background:#E8F5EE;border-left:2px solid #2E9E6E;}
    .fcal-ev-nome{font-size:8px;font-weight:600;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .fcal-ev-val{font-size:8px;color:var(--tm);}
    .fcal-total{font-size:9px;font-weight:700;color:var(--gold);margin-top:3px;text-align:right;}
    .fcal-legend{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;font-size:10px;color:var(--tm);}
    .fcal-leg-dot{width:10px;height:10px;border-radius:2px;display:inline-block;margin-right:4px;}
  </style>
  <div class="fcal-wrap">
    <div class="fcal-header">
      <div>
        <div class="fcal-title">${zUiText('📅')} ${zUiText(meses[mes])} ${ano}</div>
        <div style="font-size:10px;color:var(--tm);margin-top:2px;">${zUiText('Previsão de recebimento de comissões')}</div>
      </div>
      <div class="fcal-nav">
        <button onclick="finMesAtual--;if(finMesAtual<0){finMesAtual=11;finAnoAtual--;}renderFinanceiro()">${zUiText('← Anterior')}</button>
        <button onclick="finMesAtual=new Date().getMonth();finAnoAtual=new Date().getFullYear();renderFinanceiro()" style="background:var(--gold-bg);color:var(--gold);border-color:var(--gold-bd);">${zUiText('Hoje')}</button>
        <button onclick="finMesAtual++;if(finMesAtual>11){finMesAtual=0;finAnoAtual++;}renderFinanceiro()">${zUiText('Próximo →')}</button>
      </div>
    </div>
    <div class="fcal-kpis">
      <div class="fcal-kpi"><div class="fcal-kpi-l">${zUiText('💰 Previsto no mês')}</div><div class="fcal-kpi-v" style="color:var(--gold);">${fmt(totalPrevistoBrut)}</div><div style="font-size:9px;color:#2E9E6E;margin-top:3px;">${zUiText(`Líquido: ${fmt(totalPrevistoLiq)}`)}</div><div style="font-size:9px;color:var(--tm);margin-top:1px;">${zUiText(`${Object.values(previsoes).flat().length} venda${Object.values(previsoes).flat().length!==1?'s':''} em andamento`)}</div></div>
      <div class="fcal-kpi"><div class="fcal-kpi-l">${zUiText('✅ Já recebido')}</div><div class="fcal-kpi-v" style="color:#2E9E6E;">${fmt(totalRecebidoBrut)}</div><div style="font-size:9px;color:#2E9E6E;margin-top:3px;">${zUiText(`Líquido: ${fmt(totalRecebidoLiq)}`)}</div><div style="font-size:9px;color:var(--tm);margin-top:1px;">${zUiText(`${recebidas.length} venda${recebidas.length!==1?'s':''} concluída${recebidas.length!==1?'s':''}`)}</div></div>
      <div class="fcal-kpi"><div class="fcal-kpi-l">${zUiText('📊 Total do mês')}</div><div class="fcal-kpi-v" style="color:#3060B8;">${fmt(totalPrevistoBrut+totalRecebidoBrut)}</div><div style="font-size:9px;color:#3060B8;margin-top:3px;">${zUiText(`Líquido: ${fmt(totalPrevistoLiq+totalRecebidoLiq)}`)}</div><div style="font-size:9px;color:var(--tm);margin-top:1px;">${zUiText('previsto + recebido')}</div></div>
    </div>
    <div style="background:var(--bg);border:1px solid var(--bd);border-radius:10px;padding:12px;">
      <div class="fcal-grid-header">${diasSemana.map(d=>`<div class="fcal-dow">${zUiText(d)}</div>`).join('')}</div>
      <div class="fcal-grid" style="margin-top:4px;">${cells}</div>
    </div>
    <div class="fcal-legend">
      <span><span class="fcal-leg-dot" style="background:#E8F5EE;border-left:2px solid #2E9E6E;"></span>${zUiText('Comissão recebida')}</span>
      <span><span class="fcal-leg-dot" style="background:#EEF4FE;border-left:2px solid #3060B8;"></span>${zUiText('Previsão no prazo')}</span>
      <span><span class="fcal-leg-dot" style="background:#FEF0EC;border-left:2px solid #C05030;"></span>${zUiText('Previsão com atraso')}</span>
    </div>
  </div>`;
}

zRegisterModule('financeiro', {
  renderFinanceiro
});
