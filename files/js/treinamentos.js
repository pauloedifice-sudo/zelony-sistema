// TREINAMENTOS

const CAT_BADGE = {
  Corretor: 'bg-b',
  Capitao: 'bg-p',
  'Capitão': 'bg-p',
  'CapitÃ£o': 'bg-p',
  Gerente: 'bg-g'
};

const CAT_ICON = {
  Corretor: '👤',
  Capitao: '⭐',
  'Capitão': '⭐',
  'CapitÃ£o': '⭐',
  Gerente: '🏆'
};

const EMOJIS_T = ['🏠','🤝','📄','📋','📊','💬','🎯','📈','⚖️','🏆','💡','🔑','📚','🎓','💼','📝','🔎','💰','👥','🌟'];

const CAT_BG_T = {
  Corretor: '#EEF4FE',
  Capitao: '#F4EEFE',
  'Capitão': '#F4EEFE',
  'CapitÃ£o': '#F4EEFE',
  Gerente: '#E8F5EE'
};

let tcatAtivo = 'Corretor';
let emojiSel = '🏠';
let editIdx = -1;
zSetState('state.ui.tcatAtivo', tcatAtivo);
zSetState('state.ui.emojiSel', emojiSel);
zSetState('state.ui.editTreinIdx', editIdx);

function renderTrein(){
  if(['cor','cap','ger'].includes(role)){
    document.getElementById('mod-trein').innerHTML = `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:40px;">
      <div style="font-size:48px;">${zUiText('🚀')}</div>
      <div style="font-family:'Playfair Display',serif;font-size:22px;font-weight:600;color:var(--gold);">${zUiText('Em Breve')}</div>
      <div style="font-size:12px;color:var(--tm);text-align:center;max-width:280px;line-height:1.6;">${zUiText('O módulo de Treinamentos está sendo preparado com conteúdo exclusivo para a sua equipe.')}</div>
      <div style="background:var(--gold-bg);border:1px solid var(--gold-bd);border-radius:8px;padding:8px 20px;font-size:11px;color:var(--gold);font-weight:600;">${zUiText('🔔 Em desenvolvimento')}</div>
    </div>`;
    return;
  }

  const cats = ['Corretor','Capitão','Gerente'];
  document.getElementById('tcats').innerHTML = cats.map(c => `<button class="cat ${tcatAtivo===c?'active':''}" onclick="setTcat('${c}',this)">${zUiText(CAT_ICON[c]||'⭐')} ${zUiText(c)}</button>`).join('');

  const isDiretor = role === 'dir';
  document.getElementById('btn-add-wrap').innerHTML = isDiretor
    ? `<button class="btn-add-trein" onclick="abrirModalTrein()"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/></svg>${zUiText('Novo treinamento')}</button>`
    : `<div class="btn-add-lock"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="7" width="8" height="7" rx="1"/><path d="M5.5 7V5a2.5 2.5 0 015 0v2"/></svg>${zUiText('Apenas o Diretor pode adicionar')}</div>`;

  const l = TREIN.filter(t => t.cat === tcatAtivo || (tcatAtivo === 'Capitão' && (t.cat === 'Capitao' || t.cat === 'CapitÃ£o')));
  const conc = l.filter(t=>t.prog===100).length;
  const em = l.filter(t=>t.prog>0&&t.prog<100).length;
  const ni = l.filter(t=>t.prog===0).length;

  document.getElementById('trein-stats').innerHTML = `<div class="mc a"><div class="mc-l">${zUiText(`Cursos ${tcatAtivo}`)}</div><div class="mc-v" style="color:var(--gold);">${l.length}</div></div><div class="mc" style="border-top-color:#2E9E6E;"><div class="mc-l">${zUiText('Concluídos')}</div><div class="mc-v" style="color:#2E9E6E;">${conc}</div></div><div class="mc" style="border-top-color:var(--gold);"><div class="mc-l">${zUiText('Em andamento')}</div><div class="mc-v">${em}</div></div><div class="mc"><div class="mc-l">${zUiText('Não iniciados')}</div><div class="mc-v">${ni}</div></div>`;

  document.getElementById('trein-grid').innerHTML = l.length
    ? l.map(t => {
        const idx = TREIN.indexOf(t);
        const editBtn = isDiretor ? `<div class="tcard-edit" onclick="editarTrein(${idx})" title="${zUiText('Editar treinamento')}">${zUiText('✏️')}</div>` : '';
        return `<div class="tcard"><div class="tcard-th" style="background:${t.bg};">${editBtn}${zUiText(t.thumb)}</div><div class="tcard-b"><div><span class="zbg ${CAT_BADGE[t.cat]||'bg-gr'}" style="margin-bottom:4px;display:inline-block;">${zUiText(t.cat)}</span></div><div class="tcard-t">${zUiText(t.titulo)}</div><div class="tcard-m">${t.aulas} ${zUiText('aulas')} ${zUiText('·')} ${zUiText(t.dur)}</div><div class="pb"><div class="pf ${t.prog===100?'done':''}" style="width:${t.prog}%"></div></div><div class="pl" style="color:${t.prog===100?'#2E9E6E':'var(--tm)'}">${t.prog===100?zUiText('✓ Concluído'):t.prog>0?`${t.prog}% ${zUiText('em andamento')}`:zUiText('Não iniciado')}</div></div></div>`;
      }).join('')
    : `<div style="grid-column:1/-1;padding:40px;text-align:center;color:var(--tm);"><div style="font-size:28px;margin-bottom:8px;">${zUiText('📭')}</div><div style="font-size:13px;">${zUiText(`Nenhum treinamento ainda.${isDiretor?' Clique em "Novo treinamento" para adicionar.':''}`)}</div></div>`;
}

function setTcat(c,el){
  tcatAtivo = c;
  zSetState('state.ui.tcatAtivo', tcatAtivo);
  document.querySelectorAll('.cat').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  renderTrein();
}

function abrirModalTrein(){
  if(role!=='dir'){ showToast(zUiText('🔒'), zUiText('Apenas o Diretor pode adicionar treinamentos.')); return; }
  editIdx = -1;
  document.getElementById('mt-titulo').value = '';
  document.getElementById('mt-aulas').value = '';
  document.getElementById('mt-dur').value = '';
  document.getElementById('mt-prog').value = 0;
  document.getElementById('mt-cat-lbl').textContent = zUiText(tcatAtivo);
  document.getElementById('mt-modal-title').textContent = zUiText('Novo Treinamento');
  document.getElementById('mt-save-btn').textContent = zUiText('✓ Adicionar treinamento');
  emojiSel = '🏠';
  atualizarProgT();
  document.getElementById('emoji-grid').innerHTML = EMOJIS_T.map(e => `<div class="em ${e===emojiSel?'sel':''}" onclick="selEmoji('${e}',this)">${zUiText(e)}</div>`).join('');
  document.getElementById('mtrein').classList.add('show');
  setTimeout(() => document.getElementById('mt-titulo').focus(), 100);
}

function editarTrein(idx){
  if(role!=='dir'){ showToast(zUiText('🔒'), zUiText('Apenas o Diretor pode editar treinamentos.')); return; }
  const t = TREIN[idx];
  editIdx = idx;
  document.getElementById('mt-titulo').value = t.titulo;
  document.getElementById('mt-aulas').value = t.aulas;
  document.getElementById('mt-dur').value = t.dur;
  document.getElementById('mt-prog').value = t.prog;
  document.getElementById('mt-cat-lbl').textContent = zUiText(t.cat);
  document.getElementById('mt-modal-title').textContent = zUiText('Editar Treinamento');
  document.getElementById('mt-save-btn').textContent = zUiText('✓ Salvar alterações');
  emojiSel = t.thumb;
  atualizarProgT();
  document.getElementById('emoji-grid').innerHTML = EMOJIS_T.map(e => `<div class="em ${e===emojiSel?'sel':''}" onclick="selEmoji('${e}',this)">${zUiText(e)}</div>`).join('');
  document.getElementById('mtrein').classList.add('show');
  setTimeout(() => document.getElementById('mt-titulo').focus(), 100);
}

function fecharMT(){
  document.getElementById('mtrein').classList.remove('show');
  editIdx = -1;
  zSetState('state.ui.editTreinIdx', editIdx);
}

function handleBackdropT(e){ if(e.target===document.getElementById('mtrein')) fecharMT(); }

function selEmoji(e,el){
  emojiSel = e;
  zSetState('state.ui.emojiSel', emojiSel);
  document.querySelectorAll('.em').forEach(x=>x.classList.remove('sel'));
  el.classList.add('sel');
}

function atualizarProgT(){
  const v = parseInt(document.getElementById('mt-prog').value);
  document.getElementById('rfill').style.width = v + '%';
  document.getElementById('rfill').className = 'rfill' + (v===100?' done':'');
  document.getElementById('rlbl').textContent = v===100 ? zUiText('✓ 100%') : v + '%';
  document.getElementById('rlbl').style.color = v===100 ? '#2E9E6E' : 'var(--gold)';
}

function salvarTrein(){
  const titulo = document.getElementById('mt-titulo').value.trim();
  const aulas = parseInt(document.getElementById('mt-aulas').value);
  const dur = document.getElementById('mt-dur').value.trim();
  const prog = parseInt(document.getElementById('mt-prog').value);
  if(!titulo){ document.getElementById('mt-titulo').focus(); showToast(zUiText('⚠️'), zUiText('Informe o título do treinamento.')); return; }
  if(!aulas||aulas<1){ document.getElementById('mt-aulas').focus(); showToast(zUiText('⚠️'), zUiText('Informe o número de aulas.')); return; }
  if(!dur){ document.getElementById('mt-dur').focus(); showToast(zUiText('⚠️'), zUiText('Informe a duração.')); return; }
  if(editIdx>=0){
    TREIN[editIdx] = { ...TREIN[editIdx], titulo, aulas, dur, thumb:emojiSel, prog };
    fecharMT(); renderTrein();
    dbSalvarTrein(TREIN[editIdx],editIdx).catch(e=>console.error(e));
    salvarLS();
    showToast(zUiText('✅'), zUiText(`"${titulo}" atualizado com sucesso!`));
  } else {
    const novo = { titulo, cat:tcatAtivo, aulas, dur, thumb:emojiSel, bg:CAT_BG_T[tcatAtivo], prog };
    TREIN.push(novo);
    zSetState('state.data.treinamentos', TREIN);
    fecharMT(); renderTrein();
    dbSalvarTrein(novo,-1).catch(e=>console.error(e));
    salvarLS();
    showToast(zUiText('✅'), zUiText(`"${titulo}" adicionado com sucesso!`));
  }
}

function renderProc(){
  if(['cor','cap','ger'].includes(role)){
    const cont = document.getElementById('mod-proc');
    const existing = cont.querySelector('#proc-embreve');
    if(!existing){
      document.getElementById('proc-grid').innerHTML = '';
      document.getElementById('proc-det').classList.add('hidden');
      const div = document.createElement('div');
      div.id = 'proc-embreve';
      div.style.cssText = 'flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:40px;';
      div.innerHTML = `<div style="font-size:48px;">${zUiText('📋')}</div><div style="font-family:'Playfair Display',serif;font-size:22px;font-weight:600;color:var(--gold);">${zUiText('Em Breve')}</div><div style="font-size:12px;color:var(--tm);text-align:center;max-width:280px;line-height:1.6;">${zUiText('Os Processos Operacionais estão sendo estruturados para orientar o trabalho da equipe.')}</div><div style="background:var(--gold-bg);border:1px solid var(--gold-bd);border-radius:8px;padding:8px 20px;font-size:11px;color:var(--gold);font-weight:600;">${zUiText('🔔 Em desenvolvimento')}</div>`;
      cont.appendChild(div);
    }
    return;
  }

  const eb = document.getElementById('proc-embreve');
  if(eb) eb.remove();

  const ic = {
    'Comercial': ['🔑','🤝','🏠'],
    'Jurídico': ['⚖️'],
    'JurÃ­dico': ['⚖️'],
    'Financeiro': ['💰'],
    'RH / Pessoas': ['👤','📣']
  };

  let h = '';
  Object.entries(PROC_DATA).forEach(([s,pp])=>{
    h += `<div class="proc-sec"><div class="psec-lbl">${zUiText(s)}</div>`;
    pp.forEach((p,i)=>{
      h += `<div class="pitem" onclick="showProc('${s}',${i})"><div class="picon">${zUiText(ic[s]?.[i]||'📋')}</div><div style="flex:1"><div class="pname">${zUiText(p.nome)}</div><div class="pdesc">${p.etapas} ${zUiText('etapas')}</div></div><span class="zbg ${p.badge}">${zUiText(p.status)}</span></div>`;
    });
    h += '</div>';
  });
  document.getElementById('proc-grid').innerHTML = h;
  document.getElementById('proc-det').classList.add('hidden');
}

function showProc(s,i){
  const p = PROC_DATA[s][i];
  const det = document.getElementById('proc-det');
  det.classList.remove('hidden');
  det.innerHTML = `<div class="proc-d-top"><div class="proc-d-title">${zUiText(p.nome)}</div><div style="display:flex;align-items:center;gap:8px;"><span class="zbg ${p.badge}">${zUiText(p.status)}</span><button class="proc-close" onclick="document.getElementById('proc-det').classList.add('hidden')">${zUiText('✕')}</button></div></div><div class="etapa-list">${p.steps.map((s2,i2)=>`<div class="etapa-item"><div class="enum">${i2+1}</div><div class="etxt">${zUiText(s2)}</div></div>`).join('')}</div>`;
  det.scrollIntoView({behavior:'smooth',block:'nearest'});
}

zRegisterModule('treinamentos', {
  renderTrein,
  setTcat,
  abrirModalTrein,
  editarTrein,
  fecharMT,
  salvarTrein,
  renderProc,
  showProc
});
