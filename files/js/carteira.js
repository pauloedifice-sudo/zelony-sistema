// CARTEIRA
// Módulo Minha Carteira - saldo, KPIs, tabela por perfil

function getCols(){
  if(role==='cor') return['data','cliente','produto','corretor','gerente','vgv','com_cor','minha','bonus_cor','etapa'];
  if(role==='cap') return['data','cliente','produto','corretor','gerente','vgv','com_cor','com_cap','minha','etapa'];
  if(role==='ger') return['data','cliente','produto','corretor','gerente','vgv','com_cor','com_cap','com_ger','minha','bonus_ger','etapa'];
  if(role==='dir') return['data','cliente','produto','corretor','gerente','vgv','com_bruta','com_total','com_cor','com_cap','com_ger','com_dir','bonus_dir','etapa'];
  if(role==='dono') return['data','cliente','produto','corretor','gerente','vgv','com_bruta','com_total','com_cor','com_cap','com_ger','com_dir','com_zel','bonus_total','etapa'];
  return['data','cliente','produto','corretor','gerente','vgv','com_bruta','com_total','com_cor','com_cap','com_ger','com_dir','com_zel','bonus_total','etapa'];
}

function renderCarteira(){
  const lMinhas=vendasU(VENDAS, true);
  const calcSaldo=(v)=>{
    if(role==='fin') return comZ(v);
    if(role==='dono') return comTotal(v)+(v.bonus||0);
    if(role==='rh') return comRH(v);
    if(!usuarioLogado) return 0;
    const matchNome=(campo)=>{
      if(!campo) return false;
      const c=campo.toLowerCase().trim();
      const nomeCompleto=usuarioLogado.nome.toLowerCase().trim();
      const primeiroNome=nomeCompleto.split(' ')[0];
      return c===nomeCompleto||(primeiroNome.length>=3&&c===primeiroNome);
    };
    let total=0;
    if(matchNome(v.corretor)){total+=comC(v);total+=bonusCor(v);}
    if(matchNome(v.capitao)){total+=comCap(v);}
    if(matchNome(v.gerente)){total+=comG(v);total+=bonusGer(v);}
    if(matchNome(v.diretor)){total+=comD(v);total+=bonusDir(v);}
    if(matchNome(v.diretor2)){total+=comD2(v);}
    if(total===0){
      if(role==='cor') return comC(v)+bonusCor(v);
      if(role==='cap') return comCap(v);
      if(role==='ger') return comG(v)+bonusGer(v);
      if(role==='dir') return comD(v)+bonusDir(v);
    }
    return total;
  };

  const saldo=lMinhas.filter(v=>!v.distratada).reduce((s,v)=>s+calcSaldo(v),0);
  const pend=lMinhas.filter(v=>!v.distratada&&v.etapa<ETAPAS.length-1).reduce((s,v)=>s+calcSaldo(v),0);
  const rec=lMinhas.filter(v=>!v.distratada&&v.etapa===ETAPAS.length-1).reduce((s,v)=>s+calcSaldo(v),0);
  const distratas=lMinhas.filter(v=>v.distratada);
  const perdido=distratas.reduce((s,v)=>s+calcSaldo(v),0);
  const l=lMinhas;
  const rd=RD[role];
  const saldoLabel='Saldo a receber';
  const saldoSub=zUiText(`Minha comissão - ${rd.nome} · ${rd.role}`);
  const cols=getCols();

  const hdrMap={data:'Data',cliente:'Cliente',produto:'Produto',corretor:'Corretor',capitao:'Capitão',gerente:'Gerente',vgv:'Valor venda',com_bruta:'Com. bruta',com_total:'Com. líquida',com_cor:'Corretor',com_cap:'Capitão',com_ger:'Gerente',com_dir:'Minha comissão',com_zel:'Zelony',minha:'Minha comissão',bonus_cor:'🎁 Bônus',bonus_ger:'🎁 Bônus',bonus_dir:'🎁 Bônus',bonus_total:'🎁 Bônus total',etapa:'Etapa'};

  const rows=l.map(v=>`<tr style="${v.distratada?'opacity:0.55;background:#FEF8F6;':''}">${cols.map(c=>{
    if(c==='data')return`<td>${zUiText(v.data)}</td>`;
    if(c==='cliente')return`<td style="max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${zUiText(v.cliente.split('/')[0].trim())}</td>`;
    if(c==='produto')return`<td>${zUiText(v.produto)}</td>`;
    if(c==='corretor')return`<td>${zUiText(v.corretor)}</td>`;
    if(c==='capitao')return`<td>${zUiText(v.capitao||'—')}</td>`;
    if(c==='gerente')return`<td>${zUiText(v.gerente)}</td>`;
    if(c==='com_cor')return`<td class="pos">${fmt(comC(v))}</td>`;
    if(c==='com_cap')return`<td class="pos">${fmt(comCap(v))}</td>`;
    if(c==='com_ger')return`<td class="pos">${fmt(comG(v))}</td>`;
    if(c==='com_dir')return`<td class="pos">${fmt(comD(v))}</td>`;
    if(c==='com_zel')return`<td class="pos">${fmt(comZ(v))}</td>`;
    if(c==='vgv')return`<td class="pos">${fmt(v.valor)}</td>`;
    if(c==='com_bruta')return`<td class="pos">${fmt(v.valor*v.pct)}</td>`;
    if(c==='com_total')return`<td class="pos">${fmt(comTotal(v))}</td>`;
    if(c==='minha')return`<td class="pos">${fmt(comVis(v))}</td>`;
    if(c==='bonus_cor'||c==='bonus_ger'||c==='bonus_dir'){
      if(!v.bonus||v.bonus<=0) return`<td class="pos" style="color:#2E9E6E;">${zUiText('—')}</td>`;
      let totalBonus=0;
      if(usuarioLogado){
        const mn=(campo)=>{if(!campo)return false;const c2=campo.toLowerCase().trim();const nc=usuarioLogado.nome.toLowerCase().trim();const pn=nc.split(' ')[0];return c2===nc||(pn.length>=3&&c2===pn);};
        if(mn(v.corretor)) totalBonus+=bonusCor(v);
        if(mn(v.gerente)) totalBonus+=bonusGer(v);
        if(mn(v.diretor)) totalBonus+=bonusDir(v);
        if(mn(v.diretor2)) totalBonus+=bonusDir(v);
      } else {
        if(c==='bonus_cor') totalBonus=bonusCor(v);
        if(c==='bonus_ger') totalBonus=bonusGer(v);
        if(c==='bonus_dir') totalBonus=bonusDir(v);
      }
      return`<td class="pos" style="color:#2E9E6E;">${totalBonus>0?fmt(totalBonus):zUiText('—')}</td>`;
    }
    if(c==='bonus_total')return`<td class="pos" style="color:#2E9E6E;">${v.bonus>0?fmt(v.bonus):zUiText('—')}</td>`;
    if(c==='etapa')return`<td><span class="spill${v.etapa===ETAPAS.length-1?' f':''}">${zUiText(ETAPAS[v.etapa])}</span>${v.distratada?`<span style="font-size:8px;background:#FEF0EC;color:#C05030;border:1px solid #E0A090;border-radius:3px;padding:1px 4px;margin-left:3px;">${zUiText('⚠️ Distrato')}</span>`:''}</td>`;
    return`<td>${zUiText('—')}</td>`;
  }).join('')}</tr>`).join('');

  // Dashboard Dono
  if(role==='dono'||role==='fin'){
    const ativas=lMinhas.filter(v=>!v.distratada);
    const vgv=ativas.reduce((s,v)=>s+v.valor,0);
    const cBruta=ativas.reduce((s,v)=>s+v.valor*v.pct,0);
    const cLiq=ativas.reduce((s,v)=>s+comTotal(v),0);
    const imp=cBruta-cLiq;
    const zelony=ativas.reduce((s,v)=>s+comZ(v),0);
    const cCor=ativas.reduce((s,v)=>s+comC(v),0);
    const cGer=ativas.reduce((s,v)=>s+comG(v),0);
    const cDir=ativas.reduce((s,v)=>s+comD(v)+comD2(v),0);
    const cRH=ativas.reduce((s,v)=>s+comRH(v),0);
    const cBonus=ativas.reduce((s,v)=>s+(v.bonus||0),0);
    const concl=ativas.filter(v=>v.etapa===ETAPAS.length-1).length;
    const emAnd=ativas.filter(v=>v.etapa<ETAPAS.length-1).length;
    const dist=lMinhas.filter(v=>v.distratada).length;
    document.getElementById('carteira-content').innerHTML=`
    <div class="ch"><div class="ch-lbl">${zUiText('VGV Total')}</div><div class="ch-val">${fmtK(vgv)}</div><div class="ch-sub">${zUiText(`Zelony Imóveis · ${ativas.length} venda${ativas.length!==1?'s':''} ativas`)}</div><div class="ch-badge"><div class="ch-dot"></div> ${zUiText('Atualizado agora')}</div></div>
    <div class="c3">
      <div class="cmc a"><div class="cmc-l">${zUiText('Com. Bruta')}</div><div class="cmc-v go">${fmtK(cBruta)}</div><div class="cmc-s">${zUiText('antes do imposto')}</div></div>
      <div class="cmc g"><div class="cmc-l">${zUiText('Com. Líquida')}</div><div class="cmc-v gr">${fmtK(cLiq)}</div><div class="cmc-s">${zUiText('após imposto')}</div></div>
      <div class="cmc"><div class="cmc-l">${zUiText('Imposto')}</div><div class="cmc-v">${fmtK(imp)}</div><div class="cmc-s">${zUiText('retido')}</div></div>
      <div class="cmc a"><div class="cmc-l">${zUiText('Lucro Líquido Zelony')}</div><div class="cmc-v go">${fmtK(zelony)}</div></div>
      <div class="cmc g"><div class="cmc-l">${zUiText('Concluídas')}</div><div class="cmc-v gr">${concl}</div></div>
      <div class="cmc r"><div class="cmc-l">${zUiText('Em andamento')}</div><div class="cmc-v" style="color:#C06030;">${emAnd}</div></div>
    </div>
    <div style="background:var(--bg);border:1px solid var(--bd);border-radius:9px;padding:13px;">
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.08em;color:var(--gold);font-weight:600;margin-bottom:10px;">${zUiText('Distribuição da comissão líquida')}</div>
      ${[{l:'Corretor(es)',v:cCor},{l:'Gerente(s)',v:cGer},{l:'Diretor(es)',v:cDir},{l:'RH',v:cRH},{l:'Zelony',v:zelony}].map(({l,v})=>{
        const pct2=cLiq>0?Math.round(v/cLiq*100):0;
        return`<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;"><div style="width:90px;font-size:10px;color:var(--ts);">${zUiText(l)}</div><div style="flex:1;height:5px;background:var(--bg3);border-radius:3px;overflow:hidden;"><div style="height:100%;background:var(--gold);border-radius:3px;width:${pct2}%;"></div></div><div style="font-size:10px;color:var(--gold);font-weight:600;width:40px;text-align:right;">${fmt(v)}</div><div style="font-size:9px;color:var(--tm);width:28px;">${pct2}%</div></div>`;
      }).join('')}
      ${cBonus>0?`<div style="margin-top:8px;padding-top:8px;border-top:1px dashed var(--bd);font-size:10px;color:#2E9E6E;">${zUiText(`🎁 Bônus construtoras: ${fmt(cBonus)}`)}</div>`:''}
      ${dist>0?`<div style="margin-top:4px;font-size:10px;color:#C05030;">${zUiText(`⚠️ ${dist} distrato${dist>1?'s':''}`)}</div>`:''}
    </div>
    <div class="ctbl"><div class="ctbl-h"><span class="ctbl-t">${zUiText('Detalhe por venda')}</span><span style="font-size:10px;color:var(--tm);">${zUiText(`${l.length} venda${l.length!==1?'s':''}`)}</span></div><div class="tscroll"><table><thead><tr>${cols.map(c=>`<th>${zUiText(hdrMap[c]||c)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div></div>`;
    return;
  }

  // Outros perfis
  document.getElementById('carteira-content').innerHTML=`
  <div class="ch"><div class="ch-lbl">${zUiText(saldoLabel)}</div><div class="ch-val">${fmt(saldo)}</div><div class="ch-sub">${saldoSub}</div><div class="ch-badge"><div class="ch-dot"></div> ${zUiText('Atualizado agora')}</div></div>
  <div class="c3">
    <div class="cmc a"><div class="cmc-l">${zUiText('Minhas vendas')}</div><div class="cmc-v go">${lMinhas.filter(v=>!v.distratada).length}</div><div class="cmc-s">${zUiText(`${lMinhas.filter(v=>!v.distratada&&v.etapa===ETAPAS.length-1).length} concluídas`)}</div></div>
    <div class="cmc g"><div class="cmc-l">${zUiText('Já recebido')}</div><div class="cmc-v gr">${fmt(rec)}</div><div class="cmc-s">${zUiText('comissão recebida')}</div></div>
    <div class="cmc r"><div class="cmc-l">${zUiText('A receber')}</div><div class="cmc-v" style="color:#C06030;">${fmt(pend)}</div><div class="cmc-s">${zUiText('em andamento')}</div></div>
  </div>
  ${perdido>0?`<div style="background:#FEF0EC;border:1px solid #E0A090;border-radius:9px;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;gap:10px;"><div><div style="font-size:9px;text-transform:uppercase;letter-spacing:0.08em;color:#C05030;font-weight:700;margin-bottom:2px;">${zUiText(`⚠️ Perdido com distrato${distratas.length>1?'s':''}`)}</div><div style="font-size:11px;color:#C05030;opacity:0.8;">${zUiText(`${distratas.length} venda${distratas.length>1?'s':''} distratada${distratas.length>1?'s':''}`)}</div></div><div style="font-size:22px;font-weight:700;color:#C05030;font-family:'Playfair Display',serif;">- ${fmt(perdido)}</div></div>`:''}
  <div class="ctbl"><div class="ctbl-h"><span class="ctbl-t">${zUiText('Detalhe por venda')}</span><span style="font-size:10px;color:var(--tm);">${zUiText(`${l.length} venda${l.length!==1?'s':''}`)}</span></div><div class="tscroll"><table><thead><tr>${cols.map(c=>`<th>${zUiText(hdrMap[c]||c)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div></div>`;
}

zRegisterModule('carteira', {
  renderCarteira,
  getCols
});
