// Painel de Agendamentos — TV
// Pagina estatica, sem login, so-visualizacao. Le agendamentos diretamente
// do Supabase (a tabela e publica para leitura) e pede o total de vendas a
// uma Edge Function (a tabela vendas exige login para leitura direta, entao
// o numero agregado vem do servidor — nunca os dados de vendas em si).

(function () {
  'use strict';

  const SB_URL = 'https://szaxwkfaferrfqcmzfab.supabase.co';
  const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6YXh3a2ZhZmVycmZxY216ZmFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMTk4NjksImV4cCI6MjA4OTU5NTg2OX0.JhD9PraW5tIcR6gTP_K4olC0eka8KXITu0ajcFDsnOY';
  const REFRESH_MS = 3 * 60 * 1000; // 3 minutos

  const sbTV = supabase.createClient(SB_URL, SB_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

  function pad2(n) { return String(n).padStart(2, '0'); }
  function toIso(d) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }

  function inicioSemana(d) {
    const diaSemana = d.getDay(); // 0=domingo .. 6=sabado
    const offset = diaSemana === 0 ? 6 : diaSemana - 1;
    const seg = new Date(d);
    seg.setDate(d.getDate() - offset);
    seg.setHours(0, 0, 0, 0);
    return seg;
  }

  function periodoAtual(nome) {
    const hoje = new Date();
    if (nome === 'dia') {
      return { dataDe: toIso(hoje), dataAte: toIso(hoje) };
    }
    if (nome === 'mes') {
      const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
      return { dataDe: toIso(inicio), dataAte: toIso(fim) };
    }
    const seg = inicioSemana(hoje);
    const dom = new Date(seg);
    dom.setDate(seg.getDate() + 6);
    return { dataDe: toIso(seg), dataAte: toIso(dom) };
  }

  function formatarDataLabel(nome, periodo) {
    const hoje = new Date();
    if (nome === 'dia') {
      return `${hoje.getDate()} de ${MESES[hoje.getMonth()]} de ${hoje.getFullYear()}`;
    }
    if (nome === 'mes') {
      const mes = MESES[hoje.getMonth()];
      return `${mes.charAt(0).toUpperCase()}${mes.slice(1)} de ${hoje.getFullYear()}`;
    }
    const [anoDe, mesDe, diaDe] = periodo.dataDe.split('-').map(Number);
    const [anoAte, mesAte, diaAte] = periodo.dataAte.split('-').map(Number);
    if (mesDe === mesAte) {
      return `${diaDe} a ${diaAte} de ${MESES[mesAte - 1]} de ${anoAte}`;
    }
    return `${diaDe} de ${MESES[mesDe - 1].slice(0, 3)} – ${diaAte} de ${MESES[mesAte - 1].slice(0, 3)} de ${anoAte}`;
  }

  function periodoValido(nome) {
    return ['dia', 'semana', 'mes'].includes(nome);
  }

  function lerPeriodoDaUrl() {
    const url = new URL(location.href);
    const nome = (url.searchParams.get('periodo') || 'semana').toLowerCase();
    return periodoValido(nome) ? nome : 'semana';
  }

  function gravarPeriodoNaUrl(nome) {
    const url = new URL(location.href);
    url.searchParams.set('periodo', nome);
    history.replaceState(null, '', url);
  }

  async function buscarAgendamentos(dataDe, dataAte) {
    const { data, error } = await sbTV
      .from('agendamentos')
      .select('tipo_visita,situacao,corretor,corretor_id,corretor_email,equipe')
      .gte('data_agendamento', dataDe)
      .lte('data_agendamento', dataAte)
      .in('tipo_visita', ['Primeiro atendimento', 'Fechamento'])
      .limit(5000);
    if (error) throw error;
    return (data || []).map(a => ({
      tipoVisita: a.tipo_visita,
      situacao: a.situacao,
      corretor: a.corretor,
      corretorId: a.corretor_id,
      corretorEmail: a.corretor_email,
      equipe: a.equipe
    }));
  }

  async function buscarVendasTotal(dataDe, dataAte) {
    const resp = await fetch(`${SB_URL}/functions/v1/dash-tv-metrics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
      body: JSON.stringify({ dataDe, dataAte })
    });
    const json = await resp.json().catch(() => null);
    if (!resp.ok) {
      const msg = (json && (json.error || json.message)) || `HTTP ${resp.status}`;
      throw new Error(msg);
    }
    return (json && typeof json.totalVendas === 'number') ? json.totalVendas : 0;
  }

  function withRankAndPct(resumoLista) {
    const top5 = resumoLista.slice(0, 5);
    const max = top5[0] ? top5[0].totalGeral : 0;
    return top5.map((it, i) => ({
      rank: i + 1,
      nome: it.nome,
      total: it.totalGeral,
      pct: max > 0 ? Math.round((it.totalGeral / max) * 100) : 0
    }));
  }

  function renderLista(containerId, itens) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    if (!itens.length) {
      const vazio = document.createElement('div');
      vazio.className = 'rank-vazio';
      vazio.textContent = 'Sem agendamentos no período.';
      container.appendChild(vazio);
      return;
    }
    itens.forEach(item => {
      const row = document.createElement('div');
      row.className = 'rank-row';
      row.innerHTML = `
        <div class="rank-badge num">${item.rank}</div>
        <span class="rank-nome">${item.nome}</span>
        <div class="rank-bar-track"><div class="rank-bar-fill" style="width:${item.pct}%;"></div></div>
        <span class="rank-total num grad-gold">${item.total}</span>
      `;
      container.appendChild(row);
    });
  }

  function marcarStatus(ok) {
    const dot = document.getElementById('statusDot');
    if (!dot) return;
    if (ok) {
      dot.style.background = '#3FBF6A';
      dot.style.boxShadow = '0 0 8px rgba(63,191,106,0.7)';
    } else {
      dot.style.background = '#D08A3F';
      dot.style.boxShadow = '0 0 8px rgba(208,138,63,0.7)';
    }
  }

  let periodoAtualNome = lerPeriodoDaUrl();

  function atualizarBotoesPeriodo() {
    document.querySelectorAll('.periodo-btn').forEach(btn => {
      btn.classList.toggle('ativo', btn.dataset.periodo === periodoAtualNome);
    });
  }

  async function atualizarDashboard() {
    const periodo = periodoAtual(periodoAtualNome);
    document.getElementById('dataLabel').textContent = formatarDataLabel(periodoAtualNome, periodo);

    try {
      const [agendamentos, totalVendas] = await Promise.all([
        buscarAgendamentos(periodo.dataDe, periodo.dataAte),
        buscarVendasTotal(periodo.dataDe, periodo.dataAte).catch(err => {
          console.error('Falha ao buscar total de vendas:', err);
          return null;
        })
      ]);

      const totalGeral = agendamentos.length;
      const totalConcluido = agendamentos.filter(item => agSituacaoNormalizada(item) === 'concluida').length;
      const percentConcluido = totalGeral > 0 ? Math.round((totalConcluido / totalGeral) * 100) : 0;
      const corretores = withRankAndPct(agResumoPorCorretor(agendamentos));
      const equipes = withRankAndPct(agResumoPorEquipe(agendamentos));

      document.getElementById('totalGeral').textContent = totalGeral;
      document.getElementById('totalConcluido').textContent = totalConcluido;
      document.getElementById('percentConcluido').textContent = percentConcluido;
      document.getElementById('barraConcluido').style.width = percentConcluido + '%';
      if (totalVendas !== null) {
        document.getElementById('totalVendas').textContent = totalVendas;
      }
      renderLista('listaCorretores', corretores);
      renderLista('listaEquipes', equipes);

      const agora = new Date();
      document.getElementById('horaAtualizacao').textContent = `${pad2(agora.getHours())}:${pad2(agora.getMinutes())}`;
      marcarStatus(true);
    } catch (err) {
      console.error('Falha ao atualizar o painel de agendamentos:', err);
      marcarStatus(false);
    }
  }

  function escolherPeriodo(nome) {
    if (!periodoValido(nome) || nome === periodoAtualNome) return;
    periodoAtualNome = nome;
    gravarPeriodoNaUrl(nome);
    atualizarBotoesPeriodo();
    atualizarDashboard();
  }

  function ajustarEscala() {
    const stage = document.getElementById('stage');
    const escala = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    stage.style.transform = `scale(${escala})`;
  }

  document.addEventListener('DOMContentLoaded', () => {
    atualizarBotoesPeriodo();
    document.querySelectorAll('.periodo-btn').forEach(btn => {
      btn.addEventListener('click', () => escolherPeriodo(btn.dataset.periodo));
    });
    ajustarEscala();
    window.addEventListener('resize', ajustarEscala);
    atualizarDashboard();
    setInterval(atualizarDashboard, REFRESH_MS);
  });
})();
