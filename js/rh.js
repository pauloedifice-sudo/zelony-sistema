// DASH RH
// Estrutura atual de usuarios, equipes e unidades com recortes operacionais.

let rhBusca = '';
let rhFiltroUnidade = '';
let rhFiltroEquipe = '';
let rhFiltroPerfil = '';
let rhFiltroStatus = 'todos';
let rhFiltroOrigem = 'todos';
let rhFiltroCadastro = 'todos';
let rhAbaAtiva = 'visao_geral';
let rhFiltroPeriodo = 'all';
let rhBuscaRenderTimer = null;

const RH_ATIVACAO_LEGADO_SEM_VENDA_ISO = '2026-07-01';

const RH_STATUS_LABELS = {
  todos: 'Todos',
  ativo: 'Ativos',
  inativo: 'Inativos',
  pendente: 'Pendentes'
};

const RH_PERFIL_LABELS = {
  dono: 'Dono',
  dir: 'Diretor',
  ger: 'Gerente',
  cap: 'Capitão',
  cor: 'Corretor',
  fin: 'Financeiro',
  rh: 'RH'
};

const RH_CADASTRO_LABELS = {
  todos: 'Todos',
  prontos: 'Prontos para recebimento',
  pendencias: 'Com pendências',
  sem_telefone: 'Sem telefone',
  sem_banco: 'Sem banco/conta',
  sem_pix: 'Sem Pix'
};

const RH_ABA_LABELS = {
  visao_geral: 'Visao geral',
  producao: 'Producao',
  historico_status: 'Historico de status'
};

const RH_PERIODO_LABELS = {
  all: 'Toda a base',
  ytd: 'Ano atual',
  '12m': 'Ultimos 12 meses',
  '6m': 'Ultimos 6 meses',
  '3m': 'Ultimos 3 meses',
  '1m': 'Mes atual'
};

zSetState('state.ui.rhDashboard', {
  busca: rhBusca,
  unidade: rhFiltroUnidade,
  equipe: rhFiltroEquipe,
  perfil: rhFiltroPerfil,
  status: rhFiltroStatus,
  origem: rhFiltroOrigem,
  cadastro: rhFiltroCadastro,
  aba: rhAbaAtiva,
  periodo: rhFiltroPeriodo
});

function rhSyncState() {
  zSetState('state.ui.rhDashboard', {
    busca: rhBusca,
    unidade: rhFiltroUnidade,
    equipe: rhFiltroEquipe,
    perfil: rhFiltroPerfil,
    status: rhFiltroStatus,
    origem: rhFiltroOrigem,
    cadastro: rhFiltroCadastro,
    aba: rhAbaAtiva,
    periodo: rhFiltroPeriodo
  });
}

function rhDashboardPodeAcessar(roleAtual = role) {
  return ['dono', 'dir', 'fin', 'rh'].includes(String(roleAtual || '').toLowerCase());
}

function rhModuloVisivel() {
  const el = document.getElementById('mod-rh');
  return !!(el && !el.classList.contains('hidden'));
}

function rhTexto(valor, fallback = '') {
  const bruto = String(valor || '').trim();
  if (!bruto) return fallback;
  return typeof zUiText === 'function' ? zUiText(bruto) : bruto;
}

function rhAttr(valor) {
  return String(valor == null ? '' : valor)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function rhNorm(valor) {
  if (typeof normalizarTextoBusca === 'function') return normalizarTextoBusca(valor);
  return String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}

function rhNumero(valor) {
  return new Intl.NumberFormat('pt-BR').format(Number(valor) || 0);
}

function rhPercentual(parte, total, casas = 1) {
  if (!total) return '0%';
  return `${((Number(parte) || 0) / total * 100).toFixed(casas).replace('.', ',')}%`;
}

function rhStatusChave(usuario) {
  const status = typeof usuarioStatusNormalizado === 'function'
    ? usuarioStatusNormalizado(usuario)
    : rhTexto(usuario && usuario.status, 'Ativo');
  return rhNorm(status) || 'ativo';
}

function rhPerfilChave(usuario) {
  return typeof getPerfil === 'function' ? getPerfil(usuario && usuario.perfil) : rhNorm(usuario && usuario.perfil);
}

function rhPerfilLabel(chave) {
  return RH_PERFIL_LABELS[chave] || rhTexto(chave, 'Sem perfil');
}

function rhUnidadeValor(usuario) {
  return rhTexto(usuario && usuario.unidade, 'Sem unidade');
}

function rhEquipeValor(usuario) {
  return rhTexto(usuario && usuario.equipe, 'Sem equipe');
}

function rhListaUsuarios() {
  return Array.isArray(USUARIOS) ? USUARIOS.filter(Boolean) : [];
}

function rhUsuarioEhCorretor(usuario) {
  return rhPerfilChave(usuario) === 'cor';
}

function rhUsuarioEntraNaProducao(usuario) {
  const perfil = rhPerfilChave(usuario);
  return perfil === 'cor' || perfil === 'cap';
}

function rhUsuarioTemTelefone(usuario) {
  return !!String(usuario && usuario.tel || '').trim();
}

function rhUsuarioTemBanco(usuario) {
  return !!(String(usuario && usuario.banco || '').trim() && String(usuario && usuario.conta || '').trim());
}

function rhUsuarioTemPix(usuario) {
  return !!(String(usuario && usuario.pixTipo || '').trim() && String(usuario && usuario.pix || '').trim());
}

function rhUsuarioProntoRecebimento(usuario) {
  return rhUsuarioTemTelefone(usuario) && rhUsuarioTemBanco(usuario) && rhUsuarioTemPix(usuario);
}

function rhUsuarioEquipeObrigatoria(usuario) {
  return ['cor', 'cap', 'ger'].includes(rhPerfilChave(usuario));
}

function rhUsuarioTemPendenciaCadastro(usuario) {
  return !rhUsuarioProntoRecebimento(usuario)
    || !String(usuario && usuario.unidade || '').trim()
    || (rhUsuarioEquipeObrigatoria(usuario) && !String(usuario && usuario.equipe || '').trim());
}

function rhStatusAtende(usuario) {
  return rhFiltroStatus === 'todos' || rhStatusChave(usuario) === rhFiltroStatus;
}

function rhUnidadeAtende(usuario) {
  return !rhFiltroUnidade || rhUnidadeValor(usuario) === rhFiltroUnidade;
}

function rhEquipeAtende(usuario) {
  return !rhFiltroEquipe || rhEquipeValor(usuario) === rhFiltroEquipe;
}

function rhPerfilAtende(usuario) {
  return !rhFiltroPerfil || rhPerfilChave(usuario) === rhFiltroPerfil;
}

function rhOrigemAtende(usuario) {
  if (rhFiltroOrigem === 'todos') return true;
  const origemRh = !!(usuario && usuario.rhContratacao);
  return rhFiltroOrigem === 'rh' ? origemRh : !origemRh;
}

function rhCadastroAtende(usuario) {
  if (rhFiltroCadastro === 'todos') return true;
  if (rhFiltroCadastro === 'prontos') return rhUsuarioProntoRecebimento(usuario);
  if (rhFiltroCadastro === 'pendencias') return rhUsuarioTemPendenciaCadastro(usuario);
  if (rhFiltroCadastro === 'sem_telefone') return !rhUsuarioTemTelefone(usuario);
  if (rhFiltroCadastro === 'sem_banco') return !rhUsuarioTemBanco(usuario);
  if (rhFiltroCadastro === 'sem_pix') return !rhUsuarioTemPix(usuario);
  return true;
}

function rhBuscaAtende(usuario) {
  const busca = rhNorm(rhBusca);
  if (!busca) return true;
  return [
    usuario && usuario.nome,
    usuario && usuario.email,
    usuario && usuario.perfil,
    usuario && usuario.status,
    usuario && usuario.unidade,
    usuario && usuario.equipe
  ].some(valor => rhNorm(valor).includes(busca));
}

function rhBaseFiltrada() {
  return rhListaUsuarios().filter(usuario =>
    rhBuscaAtende(usuario)
    && rhStatusAtende(usuario)
    && rhUnidadeAtende(usuario)
    && rhEquipeAtende(usuario)
    && rhPerfilAtende(usuario)
    && rhOrigemAtende(usuario)
    && rhCadastroAtende(usuario)
  );
}

function rhOpcoesFiltros() {
  const lista = rhListaUsuarios();
  const unidades = [...new Set(lista.map(rhUnidadeValor))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const baseEquipes = lista.filter(usuario => !rhFiltroUnidade || rhUnidadeValor(usuario) === rhFiltroUnidade);
  const equipes = [...new Set(baseEquipes.map(rhEquipeValor))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const perfis = [...new Set(lista.map(rhPerfilChave).filter(Boolean))].sort((a, b) => rhPerfilLabel(a).localeCompare(rhPerfilLabel(b), 'pt-BR'));
  return { unidades, equipes, perfis };
}

function rhGarantirFiltrosValidos(opcoes) {
  let mudou = false;
  if (rhFiltroUnidade && !opcoes.unidades.includes(rhFiltroUnidade)) {
    rhFiltroUnidade = '';
    mudou = true;
  }
  if (rhFiltroEquipe && !opcoes.equipes.includes(rhFiltroEquipe)) {
    rhFiltroEquipe = '';
    mudou = true;
  }
  if (rhFiltroPerfil && !opcoes.perfis.includes(rhFiltroPerfil)) {
    rhFiltroPerfil = '';
    mudou = true;
  }
  if (mudou) rhSyncState();
}

function rhAgrupar(lista, seletorNome, seletorMeta) {
  const mapa = new Map();
  lista.forEach(usuario => {
    const nome = rhTexto(seletorNome(usuario), 'Sem identificação');
    const chave = rhNorm(nome) || nome;
    if (!mapa.has(chave)) {
      mapa.set(chave, {
        nome,
        total: 0,
        ativos: 0,
        inativos: 0,
        pendentes: 0,
        corretoresTotal: 0,
        corretoresAtivos: 0,
        origemRh: 0,
        prontos: 0,
        semTelefone: 0,
        semBanco: 0,
        semPix: 0,
        metas: new Set()
      });
    }
    const item = mapa.get(chave);
    const status = rhStatusChave(usuario);
    item.total += 1;
    if (status === 'ativo') item.ativos += 1;
    else if (status === 'inativo') item.inativos += 1;
    else item.pendentes += 1;
    if (rhUsuarioEhCorretor(usuario)) {
      item.corretoresTotal += 1;
      if (status === 'ativo') item.corretoresAtivos += 1;
    }
    if (usuario && usuario.rhContratacao) item.origemRh += 1;
    if (rhUsuarioProntoRecebimento(usuario)) item.prontos += 1;
    if (!rhUsuarioTemTelefone(usuario)) item.semTelefone += 1;
    if (!rhUsuarioTemBanco(usuario)) item.semBanco += 1;
    if (!rhUsuarioTemPix(usuario)) item.semPix += 1;
    const meta = seletorMeta ? rhTexto(seletorMeta(usuario), '') : '';
    if (meta) item.metas.add(meta);
  });

  return [...mapa.values()]
    .map(item => ({
      ...item,
      meta: item.metas.size === 1 ? [...item.metas][0] : item.metas.size > 1 ? 'Múltiplas' : '—'
    }))
    .sort((a, b) =>
      (b.ativos - a.ativos)
      || (b.total - a.total)
      || a.nome.localeCompare(b.nome, 'pt-BR')
    );
}

function rhResumoBase(lista) {
  const ativos = lista.filter(usuario => rhStatusChave(usuario) === 'ativo');
  const inativos = lista.filter(usuario => rhStatusChave(usuario) === 'inativo');
  const pendentes = lista.filter(usuario => rhStatusChave(usuario) === 'pendente');
  const corretores = lista.filter(rhUsuarioEhCorretor);
  const corretoresAtivos = ativos.filter(rhUsuarioEhCorretor);
  const equipesAtivas = new Set(ativos.map(rhEquipeValor).filter(equipe => equipe && equipe !== 'Sem equipe')).size;
  const unidadesAtivas = new Set(ativos.map(rhUnidadeValor).filter(unidade => unidade && unidade !== 'Sem unidade')).size;
  const prontos = ativos.filter(rhUsuarioProntoRecebimento);

  const alertas = {
    semTelefone: ativos.filter(usuario => !rhUsuarioTemTelefone(usuario)),
    semBanco: ativos.filter(usuario => !rhUsuarioTemBanco(usuario)),
    semPix: ativos.filter(usuario => !rhUsuarioTemPix(usuario)),
    semEquipe: ativos.filter(usuario => rhUsuarioEquipeObrigatoria(usuario) && rhEquipeValor(usuario) === 'Sem equipe'),
    semUnidade: ativos.filter(usuario => rhUnidadeValor(usuario) === 'Sem unidade'),
    prontos
  };

  return {
    total: lista.length,
    ativos,
    inativos,
    pendentes,
    corretores,
    corretoresAtivos,
    equipesAtivas,
    unidadesAtivas,
    prontos,
    porUnidade: rhAgrupar(lista, rhUnidadeValor),
    porEquipe: rhAgrupar(lista, rhEquipeValor, rhUnidadeValor),
    porPerfil: rhAgrupar(lista, usuario => rhPerfilLabel(rhPerfilChave(usuario))),
    porOrigem: rhAgrupar(lista, usuario => usuario && usuario.rhContratacao ? 'RH' : 'Direto'),
    alertas
  };
}

function rhPreviewNomes(lista, vazio = 'Nenhum usuário neste grupo.') {
  if (!lista.length) return vazio;
  const nomes = lista.slice(0, 3).map(usuario => rhTexto(usuario && usuario.nome, 'Sem nome'));
  const extras = lista.length - nomes.length;
  return extras > 0 ? `${nomes.join(', ')} +${extras}` : nomes.join(', ');
}

function rhCardKpi(rotulo, valor, sub, destaque = false, classeExtra = '') {
  return `
    <div class="rh-kpi${destaque ? ' main' : ''}${classeExtra ? ` ${classeExtra}` : ''}">
      <div class="rh-kpi-label">${zUiText(rotulo)}</div>
      <div class="rh-kpi-value">${valor}</div>
      <div class="rh-kpi-sub">${sub || ''}</div>
    </div>
  `;
}

function rhPanelRanking(titulo, subtitulo, lista, opcoes = {}) {
  const itens = (lista || []).slice(0, opcoes.limite || 8);
  const totalAtivos = itens.reduce((soma, item) => soma + (item.ativos || 0), 0);
  const classePainel = opcoes.className ? ` ${opcoes.className}` : '';
  const linhas = itens.length ? itens.map(item => {
    const pct = totalAtivos ? Math.max(6, ((item.ativos || 0) / totalAtivos) * 100) : 0;
    return `
      <div class="rh-rank-row">
        <div class="rh-rank-main">
          <div class="rh-rank-name">${zUiText(item.nome)}</div>
          ${opcoes.mostrarMeta !== false ? `<div class="rh-rank-meta">${zUiText(opcoes.metaPrefix ? `${opcoes.metaPrefix}${item.meta}` : item.meta)}</div>` : ''}
          <div class="rh-rank-bar"><span style="width:${pct.toFixed(2)}%"></span></div>
        </div>
        <div class="rh-rank-metrics">
          <div class="rh-rank-metric">
            <strong>${rhNumero(item.ativos)}</strong>
            <span>${zUiText('Ativos')}</span>
          </div>
          <div class="rh-rank-metric">
            <strong>${rhNumero(item.total)}</strong>
            <span>${zUiText('Total')}</span>
          </div>
          <div class="rh-rank-metric">
            <strong>${rhNumero(item.corretoresAtivos)}</strong>
            <span>${zUiText('Corretores')}</span>
          </div>
        </div>
      </div>
    `;
  }).join('') : `
    <div class="rh-empty">
      <strong>${zUiText('Nenhum usuário encontrado')}</strong>
      <span>${zUiText('Ajuste os filtros para visualizar esse recorte.')}</span>
    </div>
  `;

  return `
    <section class="rh-panel${classePainel}">
      <div class="rh-panel-head">
        <div>
          <h3>${zUiText(titulo)}</h3>
          <p>${zUiText(subtitulo)}</p>
        </div>
        <div class="rh-panel-count">${rhNumero(lista.length)}</div>
      </div>
      <div class="rh-rank-list">${linhas}</div>
    </section>
  `;
}

function rhMaiorGargaloCadastro(alertas) {
  const lista = [
    {
      titulo: 'Sem banco/conta',
      valor: alertas.semBanco.length,
      copy: rhPreviewNomes(alertas.semBanco)
    },
    {
      titulo: 'Sem Pix',
      valor: alertas.semPix.length,
      copy: rhPreviewNomes(alertas.semPix)
    },
    {
      titulo: 'Sem telefone',
      valor: alertas.semTelefone.length,
      copy: rhPreviewNomes(alertas.semTelefone)
    },
    {
      titulo: 'Sem equipe',
      valor: alertas.semEquipe.length,
      copy: rhPreviewNomes(alertas.semEquipe)
    },
    {
      titulo: 'Sem unidade',
      valor: alertas.semUnidade.length,
      copy: rhPreviewNomes(alertas.semUnidade)
    }
  ].sort((a, b) => b.valor - a.valor);

  return lista[0] && lista[0].valor
    ? lista[0]
    : {
        titulo: 'Cadastros consistentes',
        valor: 0,
        copy: 'Nao ha pendencia predominante entre os usuarios ativos.'
      };
}

function rhPanelSaude(alertas, totalAtivos) {
  const cards = [
    {
      titulo: 'Ativos sem telefone',
      valor: alertas.semTelefone.length,
      copy: rhPreviewNomes(alertas.semTelefone),
      classe: alertas.semTelefone.length ? 'warn' : 'ok'
    },
    {
      titulo: 'Ativos sem banco/conta',
      valor: alertas.semBanco.length,
      copy: rhPreviewNomes(alertas.semBanco),
      classe: alertas.semBanco.length ? 'warn' : 'ok'
    },
    {
      titulo: 'Ativos sem Pix',
      valor: alertas.semPix.length,
      copy: rhPreviewNomes(alertas.semPix),
      classe: alertas.semPix.length ? 'warn' : 'ok'
    },
    {
      titulo: 'Ativos sem equipe',
      valor: alertas.semEquipe.length,
      copy: rhPreviewNomes(alertas.semEquipe),
      classe: alertas.semEquipe.length ? 'warn' : 'ok'
    },
    {
      titulo: 'Ativos sem unidade',
      valor: alertas.semUnidade.length,
      copy: rhPreviewNomes(alertas.semUnidade),
      classe: alertas.semUnidade.length ? 'warn' : 'ok'
    },
    {
      titulo: 'Prontos para recebimento',
      valor: alertas.prontos.length,
      copy: `${rhPercentual(alertas.prontos.length, totalAtivos)} dos ativos estão completos para recebimento.`,
      classe: 'ok'
    }
  ];

  return `
    <section class="rh-panel rh-panel-wide">
      <div class="rh-panel-head">
        <div>
          <h3>${zUiText('Saúde cadastral')}</h3>
          <p>${zUiText('Pendências operacionais que afetam rotina, recebimento e gestão de equipe.')}</p>
        </div>
        <div class="rh-panel-count">${rhNumero(cards.reduce((soma, item) => soma + item.valor, 0))}</div>
      </div>
      <div class="rh-alert-grid">
        ${cards.map(card => `
          <div class="rh-alert-card ${card.classe}">
            <div class="rh-alert-top">
              <div class="rh-alert-title">${zUiText(card.titulo)}</div>
              <div class="rh-alert-value">${rhNumero(card.valor)}</div>
            </div>
            <div class="rh-alert-copy">${zUiText(card.copy)}</div>
          </div>
        `).join('')}
      </div>
    </section>
  `;
}

function rhPainelInsights(resumo, contexto = {}) {
  const maiorGargalo = rhMaiorGargaloCadastro(resumo.alertas);
  const ativosPct = rhPercentual(resumo.ativos.length, resumo.total || 0);
  const origemRhPct = rhPercentual(contexto.origemRhAtiva || 0, resumo.ativos.length || 0);
  const prontosPct = rhPercentual(resumo.prontos.length, resumo.ativos.length || 0);
  const corretoresPct = rhPercentual(resumo.corretoresAtivos.length, resumo.ativos.length || 0);
  const unidadeLider = resumo.porUnidade[0];
  const equipeLider = resumo.porEquipe[0];

  return `
    <section class="rh-panel rh-insights">
      <div class="rh-panel-head">
        <div>
          <h3>${zUiText('Leituras rapidas do quadro')}</h3>
          <p>${zUiText('Resumo executivo do momento atual da operacao para nao depender so das tabelas.')}</p>
        </div>
        <div class="rh-panel-count">${zUiText('Hoje')}</div>
      </div>

      <div class="rh-insight-grid">
        <article class="rh-insight-card accent">
          <span>${zUiText('Ritmo da operacao')}</span>
          <strong>${ativosPct}</strong>
          <p>${zUiText(`${rhNumero(resumo.ativos.length)} de ${rhNumero(resumo.total)} usuarios do recorte estao ativos.`)}</p>
        </article>

        <article class="rh-insight-card">
          <span>${zUiText('Origem RH entre ativos')}</span>
          <strong>${origemRhPct}</strong>
          <p>${zUiText(`${rhNumero(contexto.origemRhAtiva || 0)} usuarios ativos vieram de contratacao via RH.`)}</p>
        </article>

        <article class="rh-insight-card">
          <span>${zUiText('Prontos para recebimento')}</span>
          <strong>${prontosPct}</strong>
          <p>${zUiText(`${rhNumero(resumo.prontos.length)} ativos com telefone, banco/conta e Pix completos.`)}</p>
        </article>

        <article class="rh-insight-card">
          <span>${zUiText('Corretores dentro da base ativa')}</span>
          <strong>${corretoresPct}</strong>
          <p>${zUiText(`${rhNumero(resumo.corretoresAtivos.length)} corretores ativos no recorte atual.`)}</p>
        </article>
      </div>

      <div class="rh-insight-footer">
        <div class="rh-insight-foot-card">
          <span>${zUiText('Unidade lider')}</span>
          <strong>${zUiText(unidadeLider ? unidadeLider.nome : 'Sem unidade')}</strong>
          <p>${zUiText(unidadeLider ? `${rhNumero(unidadeLider.ativos)} ativos e ${rhNumero(unidadeLider.corretoresAtivos)} corretores em operacao.` : 'Nenhuma unidade apareceu com os filtros atuais.')}</p>
        </div>

        <div class="rh-insight-foot-card">
          <span>${zUiText('Equipe lider')}</span>
          <strong>${zUiText(equipeLider ? equipeLider.nome : 'Sem equipe')}</strong>
          <p>${zUiText(equipeLider ? `${rhNumero(equipeLider.ativos)} ativos no recorte e referencia ${equipeLider.meta || 'sem unidade definida'}.` : 'Nenhuma equipe apareceu com os filtros atuais.')}</p>
        </div>

        <div class="rh-insight-foot-card warn">
          <span>${zUiText('Principal ajuste agora')}</span>
          <strong>${zUiText(maiorGargalo.titulo)}</strong>
          <p>${zUiText(maiorGargalo.valor ? `${rhNumero(maiorGargalo.valor)} ativo(s): ${maiorGargalo.copy}` : maiorGargalo.copy)}</p>
        </div>
      </div>
    </section>
  `;
}

function rhTabelaResumo(titulo, subtitulo, lista, opcoes = {}) {
  const linhas = lista.length ? lista.map(item => `
    <tr>
      <td><strong>${zUiText(item.nome)}</strong></td>
      ${opcoes.mostrarMeta ? `<td>${zUiText(item.meta)}</td>` : ''}
      <td>${rhNumero(item.total)}</td>
      <td>${rhNumero(item.ativos)}</td>
      <td>${rhNumero(item.inativos)}</td>
      <td>${rhNumero(item.pendentes)}</td>
      <td>${rhNumero(item.corretoresAtivos)}</td>
      <td>${rhNumero(item.prontos)}</td>
      <td>${rhPercentual(item.ativos, item.total)}</td>
    </tr>
  `).join('') : `
    <tr>
      <td colspan="${opcoes.mostrarMeta ? 9 : 8}">${zUiText('Nenhum registro encontrado com os filtros atuais.')}</td>
    </tr>
  `;

  return `
    <section class="rh-panel rh-panel-wide rh-future-panel">
      <div class="rh-panel-head">
        <div>
          <h3>${zUiText(titulo)}</h3>
          <p>${zUiText(subtitulo)}</p>
        </div>
        <div class="rh-panel-count">${rhNumero(lista.length)}</div>
      </div>
      <div class="rh-table-wrap">
        <table class="rh-table">
          <thead>
            <tr>
              <th>${zUiText(opcoes.colunaNome || 'Grupo')}</th>
              ${opcoes.mostrarMeta ? `<th>${zUiText(opcoes.colunaMeta || 'Meta')}</th>` : ''}
              <th>${zUiText('Total')}</th>
              <th>${zUiText('Ativos')}</th>
              <th>${zUiText('Inativos')}</th>
              <th>${zUiText('Pendentes')}</th>
              <th>${zUiText('Corretores ativos')}</th>
              <th>${zUiText('Prontos')}</th>
              <th>${zUiText('% ativo')}</th>
            </tr>
          </thead>
          <tbody>${linhas}</tbody>
        </table>
      </div>
    </section>
  `;
}

function rhPainelHistoricoFuturoLegacy() {
  return `
    <section class="rh-panel">
      <div class="rh-panel-head">
        <div>
          <h3>${zUiText('Próxima etapa do Dash RH')}</h3>
          <p>${zUiText('O módulo já entrega a fotografia atual da estrutura. Os indicadores históricos entram na próxima camada de dados.')}</p>
        </div>
        <div class="rh-panel-count">${zUiText('Fase 2')}</div>
      </div>
      <div class="rh-note">
        <strong>${zUiText('Turnover e contratações por período ainda não estão ativos aqui.')}</strong>
        ${zUiText('Para calcular esses números sem distorção, o sistema precisa gravar data de admissão, data de desligamento e movimentações como troca de equipe, troca de unidade e reativação.')}
      </div>
      <div class="rh-future-grid">
        <div class="rh-note-item">
          <strong>${zUiText('Contratações')}</strong>
          ${zUiText('Entram quando passarmos a registrar a data efetiva de entrada do usuário na operação.')}
        </div>
        <div class="rh-note-item">
          <strong>${zUiText('Desligamentos e turnover')}</strong>
          ${zUiText('Serão calculados sobre eventos reais de inativação, e não apenas sobre o status atual do cadastro.')}
        </div>
        <div class="rh-note-item">
          <strong>${zUiText('Movimentações')}</strong>
          ${zUiText('Também poderemos mostrar reativações, transferências entre unidades e histórico por equipe.')}
        </div>
      </div>
    </section>
  `;
}

function rhFiltrosAtivosCount() {
  return [
    rhBusca,
    rhFiltroUnidade,
    rhFiltroEquipe,
    rhFiltroPerfil,
    rhFiltroStatus !== 'todos' ? rhFiltroStatus : '',
    rhFiltroOrigem !== 'todos' ? rhFiltroOrigem : '',
    rhFiltroCadastro !== 'todos' ? rhFiltroCadastro : '',
    rhFiltroPeriodo !== 'all' ? rhFiltroPeriodo : ''
  ].filter(Boolean).length;
}

function rhCancelarBuscaRenderPendente() {
  if (!rhBuscaRenderTimer) return;
  clearTimeout(rhBuscaRenderTimer);
  rhBuscaRenderTimer = null;
}

function rhAgendarRenderBusca() {
  rhCancelarBuscaRenderPendente();
  rhBuscaRenderTimer = setTimeout(() => {
    rhBuscaRenderTimer = null;
    renderRhDashboard();
  }, 140);
}

function rhCapturarEstadoBusca() {
  if (typeof document === 'undefined') return null;
  const ativo = document.activeElement;
  if (!ativo || ativo.id !== 'rh-busca') return null;
  const valor = String(ativo.value || '');
  const fimPadrao = valor.length;
  return {
    inicio: typeof ativo.selectionStart === 'number' ? ativo.selectionStart : fimPadrao,
    fim: typeof ativo.selectionEnd === 'number' ? ativo.selectionEnd : fimPadrao
  };
}

function rhRestaurarEstadoBusca(estado) {
  if (!estado || typeof document === 'undefined') return;
  const campo = document.getElementById('rh-busca');
  if (!campo) return;
  campo.focus({ preventScroll: true });
  const tamanho = String(campo.value || '').length;
  const inicio = Math.max(0, Math.min(estado.inicio, tamanho));
  const fim = Math.max(0, Math.min(estado.fim, tamanho));
  try {
    campo.setSelectionRange(inicio, fim);
  } catch (_e) {}
}

function rhSetFiltro(campo, valor) {
  if (campo === 'busca') rhBusca = valor || '';
  if (campo === 'unidade') rhFiltroUnidade = valor || '';
  if (campo === 'equipe') rhFiltroEquipe = valor || '';
  if (campo === 'perfil') rhFiltroPerfil = valueOrEmpty(valor);
  if (campo === 'status') rhFiltroStatus = valor || 'todos';
  if (campo === 'origem') rhFiltroOrigem = valor || 'todos';
  if (campo === 'cadastro') rhFiltroCadastro = valor || 'todos';
  if (campo === 'periodo') rhFiltroPeriodo = valor || 'all';
  if (campo === 'aba') rhAbaAtiva = valor || 'visao_geral';
  if (campo === 'unidade' && rhFiltroEquipe) {
    const equipes = rhOpcoesFiltros().equipes;
    if (!equipes.includes(rhFiltroEquipe)) rhFiltroEquipe = '';
  }
  rhSyncState();
  if (campo === 'busca') {
    rhAgendarRenderBusca();
    return;
  }
  rhCancelarBuscaRenderPendente();
  renderRhDashboard();
}

function valueOrEmpty(valor) {
  return valor || '';
}

function rhLimparFiltros() {
  rhCancelarBuscaRenderPendente();
  rhBusca = '';
  rhFiltroUnidade = '';
  rhFiltroEquipe = '';
  rhFiltroPerfil = '';
  rhFiltroStatus = 'todos';
  rhFiltroOrigem = 'todos';
  rhFiltroCadastro = 'todos';
  rhFiltroPeriodo = 'all';
  rhSyncState();
  renderRhDashboard();
}

function renderRhDashboardLegacy() {
  const cont = document.getElementById('rh-dashboard-content');
  if (!cont) return;
  const estadoBusca = rhCapturarEstadoBusca();

  if (!rhDashboardPodeAcessar()) {
    cont.innerHTML = `<div class="rh-locked">
      <div class="rh-locked-icon">${zUiText('🔒')}</div>
      <div class="rh-locked-title">${zUiText('Acesso restrito')}</div>
      <div class="rh-locked-sub">${zUiText('O Dash RH fica disponível somente para RH, Dono, Diretor e Financeiro, porque reúne estrutura da equipe, situação cadastral e leitura gerencial dos usuários.')}</div>
    </div>`;
    return;
  }

  const opcoes = rhOpcoesFiltros();
  rhGarantirFiltrosValidos(opcoes);
  const listaTotal = rhListaUsuarios();
  const base = rhBaseFiltrada();
  const resumo = rhResumoBase(base);
  const filtrosAtivos = rhFiltrosAtivosCount();
  const cardProntos = resumo.ativos.length ? rhPercentual(resumo.prontos.length, resumo.ativos.length) : '0%';
  const origemRhAtiva = resumo.ativos.filter(usuario => !!(usuario && usuario.rhContratacao)).length;
  const origemDiretaAtiva = resumo.ativos.length - origemRhAtiva;

  cont.innerHTML = `
    <div class="rh-hero">
      <div class="rh-hero-copy">
        <div class="rh-eyebrow">${zUiText('Dash RH')}</div>
        <h2>${zUiText('Estrutura viva da operação')}</h2>
        <p>${zUiText('Leitura em tempo real dos usuários, com visão por unidade, equipe, perfil e saúde cadastral. Esta primeira versão é totalmente confiável para o quadro atual e já prepara o terreno para contratações e turnover históricos.')}</p>
        <div class="rh-hero-highlights">
          <div class="rh-highlight-chip"><span>${zUiText('Usuários no recorte')}</span> <strong>${rhNumero(resumo.total)}</strong></div>
          <div class="rh-highlight-chip"><span>${zUiText('Origem RH ativa')}</span> <strong>${rhNumero(origemRhAtiva)}</strong></div>
          <div class="rh-highlight-chip"><span>${zUiText('Origem direta ativa')}</span> <strong>${rhNumero(origemDiretaAtiva)}</strong></div>
          <div class="rh-highlight-chip"><span>${zUiText('Cadastros prontos')}</span> <strong>${cardProntos}</strong></div>
        </div>
      </div>

      <div class="rh-filter-card">
        <div class="rh-filter-head">
          <div>
            <h3>${zUiText('Filtros do módulo')}</h3>
            <p>${zUiText('Os cards, rankings e tabelas respeitam os filtros abaixo.')}</p>
          </div>
          <span class="rh-badge">${rhNumero(filtrosAtivos)} ${zUiText('ativos')}</span>
        </div>
        <div class="rh-filter-grid">
          <div class="rh-filter-field rh-filter-search">
            <label>${zUiText('Busca')}</label>
            <input type="text" id="rh-busca" value="${rhAttr(rhBusca)}" placeholder="${zUiText('Nome, e-mail, equipe ou unidade...')}" oninput="rhSetFiltro('busca', this.value)">
          </div>
          <div class="rh-filter-field">
            <label>${zUiText('Status')}</label>
            <select onchange="rhSetFiltro('status', this.value)">
              ${Object.entries(RH_STATUS_LABELS).map(([valor, rotulo]) => `<option value="${valor}" ${rhFiltroStatus === valor ? 'selected' : ''}>${zUiText(rotulo)}</option>`).join('')}
            </select>
          </div>
          <div class="rh-filter-field">
            <label>${zUiText('Unidade')}</label>
            <select onchange="rhSetFiltro('unidade', this.value)">
              <option value="">${zUiText('Todas')}</option>
              ${opcoes.unidades.map(unidade => `<option value="${rhAttr(unidade)}" ${rhFiltroUnidade === unidade ? 'selected' : ''}>${zUiText(unidade)}</option>`).join('')}
            </select>
          </div>
          <div class="rh-filter-field">
            <label>${zUiText('Equipe')}</label>
            <select onchange="rhSetFiltro('equipe', this.value)">
              <option value="">${zUiText('Todas')}</option>
              ${opcoes.equipes.map(equipe => `<option value="${rhAttr(equipe)}" ${rhFiltroEquipe === equipe ? 'selected' : ''}>${zUiText(equipe)}</option>`).join('')}
            </select>
          </div>
          <div class="rh-filter-field">
            <label>${zUiText('Perfil')}</label>
            <select onchange="rhSetFiltro('perfil', this.value)">
              <option value="">${zUiText('Todos')}</option>
              ${opcoes.perfis.map(perfil => `<option value="${perfil}" ${rhFiltroPerfil === perfil ? 'selected' : ''}>${zUiText(rhPerfilLabel(perfil))}</option>`).join('')}
            </select>
          </div>
          <div class="rh-filter-field">
            <label>${zUiText('Origem')}</label>
            <select onchange="rhSetFiltro('origem', this.value)">
              <option value="todos" ${rhFiltroOrigem === 'todos' ? 'selected' : ''}>${zUiText('Todos')}</option>
              <option value="rh" ${rhFiltroOrigem === 'rh' ? 'selected' : ''}>${zUiText('RH')}</option>
              <option value="direto" ${rhFiltroOrigem === 'direto' ? 'selected' : ''}>${zUiText('Direto')}</option>
            </select>
          </div>
          <div class="rh-filter-field">
            <label>${zUiText('Cadastro')}</label>
            <select onchange="rhSetFiltro('cadastro', this.value)">
              ${Object.entries(RH_CADASTRO_LABELS).map(([valor, rotulo]) => `<option value="${valor}" ${rhFiltroCadastro === valor ? 'selected' : ''}>${zUiText(rotulo)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="rh-filter-actions">
          <div class="rh-filter-meta">${zUiText(`Mostrando ${rhNumero(resumo.total)} de ${rhNumero(listaTotal.length)} usuário(s).`)}</div>
          <button type="button" class="rh-filter-btn ghost" onclick="rhLimparFiltros()">${zUiText('Limpar filtros')}</button>
        </div>
      </div>
    </div>

    <div class="rh-kpis">
      ${rhCardKpi('Headcount total', rhNumero(resumo.total), zUiText('Todos os usuários no recorte atual'), true)}
      ${rhCardKpi('Ativos', rhNumero(resumo.ativos.length), zUiText('Cadastros liberados para operar'))}
      ${rhCardKpi('Inativos', rhNumero(resumo.inativos.length), zUiText('Fora dos novos lançamentos e do acesso'))}
      ${rhCardKpi('Pendentes', rhNumero(resumo.pendentes.length), zUiText('Convites ou cadastros ainda não concluídos'))}
      ${rhCardKpi('Corretores totais', rhNumero(resumo.corretores.length), zUiText('Base total de corretores no filtro'))}
      ${rhCardKpi('Corretores ativos', rhNumero(resumo.corretoresAtivos.length), zUiText('Corretores hoje em operação'))}
      ${rhCardKpi('Equipes com ativos', rhNumero(resumo.equipesAtivas), zUiText('Equipes com pelo menos um usuário ativo'))}
      ${rhCardKpi('Prontos para recebimento', rhNumero(resumo.prontos.length), zUiText(`${cardProntos} dos ativos com telefone, banco/conta e Pix`))}
    </div>

    <div class="rh-grid">
      ${rhPanelRanking('Quadro por unidade', 'Leitura consolidada por unidade', resumo.porUnidade, { mostrarMeta: false, limite: 6 })}
      ${rhPanelRanking('Quadro por equipe', 'Onde a base está concentrada hoje', resumo.porEquipe, { metaPrefix: 'Unidade: ', limite: 8 })}
      ${rhPanelRanking('Distribuição por perfil', 'Composição de acessos e liderança', resumo.porPerfil, { mostrarMeta: false, limite: 7 })}
      ${rhPanelRanking('Origem do cadastro', 'Leitura entre RH e entrada direta', resumo.porOrigem, { mostrarMeta: false, limite: 4 })}
      ${rhPanelSaude(resumo.alertas, resumo.ativos.length)}
    </div>

    ${rhTabelaResumo('Resumo por unidade', 'Comparativo executivo do quadro atual por unidade.', resumo.porUnidade, { colunaNome: 'Unidade' })}
    ${rhTabelaResumo('Resumo por equipe', 'Leitura das equipes com unidade de referência e prontidão cadastral.', resumo.porEquipe, { colunaNome: 'Equipe', mostrarMeta: true, colunaMeta: 'Unidade' })}
    ${rhPainelHistoricoFuturo()}
  `;
  rhRestaurarEstadoBusca(estadoBusca);
}

function rhPainelHistoricoFuturo() {
  return `
    <section class="rh-panel rh-panel-wide rh-future-panel">
      <div class="rh-panel-head">
        <div>
          <h3>${zUiText('Proxima camada do Dash RH')}</h3>
          <p>${zUiText('O modulo atual resolve bem a fotografia do quadro. O passo seguinte e adicionar historico real de movimentacoes.')}</p>
        </div>
        <div class="rh-panel-count">${zUiText('Fase 2')}</div>
      </div>
      <div class="rh-future-grid">
        <div class="rh-note-item">
          <strong>${zUiText('Contratacoes')}</strong>
          ${zUiText('Entram quando o sistema passar a registrar a data efetiva de entrada do usuario na operacao.')}
        </div>
        <div class="rh-note-item">
          <strong>${zUiText('Turnover real')}</strong>
          ${zUiText('Vai considerar desligamentos, reativacoes e a janela correta de tempo, sem depender so do status atual.')}
        </div>
        <div class="rh-note-item">
          <strong>${zUiText('Movimentacoes internas')}</strong>
          ${zUiText('Tambem podemos mostrar trocas de equipe, unidade e evolucao de cada lideranca ao longo do tempo.')}
        </div>
      </div>
    </section>
  `;
}

function rhPad2(valor) {
  return String(valor).padStart(2, '0');
}

function rhDateParaIso(data) {
  if (!(data instanceof Date) || Number.isNaN(data.getTime())) return '';
  return `${data.getFullYear()}-${rhPad2(data.getMonth() + 1)}-${rhPad2(data.getDate())}`;
}

function rhIsoParaDate(valor) {
  const bruto = String(valor || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(bruto)) return null;
  const [ano, mes, dia] = bruto.split('-').map(Number);
  const data = new Date(ano, mes - 1, dia, 12, 0, 0, 0);
  return Number.isNaN(data.getTime()) ? null : data;
}

function rhIsoParaBr(valor, fallback = 'Sem data') {
  const data = rhIsoParaDate(valor);
  return data ? formatarDataLocal(data, { comAno: true }) : fallback;
}

function rhInicioMes(data) {
  return new Date(data.getFullYear(), data.getMonth(), 1, 12, 0, 0, 0);
}

function rhFimMes(data) {
  return new Date(data.getFullYear(), data.getMonth() + 1, 0, 12, 0, 0, 0);
}

function rhMesKey(data) {
  return `${data.getFullYear()}-${rhPad2(data.getMonth() + 1)}`;
}

function rhMesLabel(chave) {
  const match = String(chave || '').match(/^(\d{4})-(\d{2})$/);
  if (!match) return 'Mes';
  const ano = match[1];
  const mes = parseInt(match[2], 10) - 1;
  const nomes = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  return `${nomes[mes] || 'MES'}/${ano.slice(-2)}`;
}

function rhCompararDataAsc(a, b) {
  return a.getTime() - b.getTime();
}

function rhCompararDataDesc(a, b) {
  return b.getTime() - a.getTime();
}

function rhEventoTipoNormalizado(tipo) {
  const valor = rhNorm(tipo);
  if (valor === 'ativado') return 'ativado';
  if (valor === 'inativado') return 'inativado';
  if (valor === 'reativado') return 'reativado';
  return '';
}

function rhEventoData(evento) {
  if (!evento || typeof evento !== 'object') return null;
  if (typeof evento.ts === 'string' && evento.ts.trim()) {
    const dataTs = new Date(evento.ts);
    if (!Number.isNaN(dataTs.getTime())) {
      return new Date(dataTs.getFullYear(), dataTs.getMonth(), dataTs.getDate(), 12, 0, 0, 0);
    }
  }
  const bruto = String(evento.data || evento.d || '').trim();
  if (!bruto) return null;
  const info = typeof obterMomentoHistorico === 'function'
    ? obterMomentoHistorico({ d: bruto }, { preferTs: false })
    : null;
  return info && info.date ? new Date(info.date.getFullYear(), info.date.getMonth(), info.date.getDate(), 12, 0, 0, 0) : null;
}

function rhHistAfetaFluxo(hist) {
  const tipo = String(hist && hist.tipo || '').trim().toLowerCase();
  return tipo !== 'edicao'
    && tipo !== 'distrato'
    && tipo !== 'reversao'
    && tipo !== 'obs'
    && tipo !== 'pend_comercial'
    && tipo !== 'pend_comercial_editada'
    && tipo !== 'pend_comercial_resolvida'
    && tipo !== 'corretor_vinculo'
    && tipo !== 'prev_receb_manual'
    && tipo !== 'prev_receb_editada';
}

function rhVendaData(venda) {
  if (!venda || typeof venda !== 'object') return null;
  const hist = Array.isArray(venda.hist) ? venda.hist : [];
  const base = hist.find(item => item && rhHistAfetaFluxo(item)) || hist[0] || null;
  const infoHist = base && typeof obterMomentoHistorico === 'function'
    ? (obterMomentoHistorico(base, { preferTs: false }) || obterMomentoHistorico(base))
    : null;
  if (infoHist && infoHist.date) {
    return new Date(infoHist.date.getFullYear(), infoHist.date.getMonth(), infoHist.date.getDate(), 12, 0, 0, 0);
  }
  const bruto = String(venda.data || '').trim();
  if (!bruto || typeof obterMomentoHistorico !== 'function') return null;
  const infoData = obterMomentoHistorico({ d: bruto }, { preferTs: false });
  return infoData && infoData.date
    ? new Date(infoData.date.getFullYear(), infoData.date.getMonth(), infoData.date.getDate(), 12, 0, 0, 0)
    : null;
}

function rhListaVendasIndexadas() {
  const lista = [];
  (Array.isArray(VENDAS) ? VENDAS : []).forEach(venda => {
    if (!venda || venda.distratada) return;
    const data = rhVendaData(venda);
    if (!data) return;
    const usuario = typeof getUsuarioCorretorDaVenda === 'function'
      ? getUsuarioCorretorDaVenda(venda, { permitirAproximado: true })
      : null;
    if (!usuario || usuario.id == null) return;
    lista.push({ venda, data, usuario });
  });
  return lista.sort((a, b) => rhCompararDataAsc(a.data, b.data));
}

function rhPrimeiraVendaPorUsuario(vendasIndexadas) {
  const mapa = new Map();
  (vendasIndexadas || []).forEach(item => {
    const chave = String(item && item.usuario && item.usuario.id || '');
    if (!chave) return;
    const atual = mapa.get(chave);
    if (!atual || item.data.getTime() < atual.getTime()) mapa.set(chave, item.data);
  });
  return mapa;
}

function rhNormalizarDataIso(valor) {
  const bruto = String(valor || '').trim();
  if (!bruto) return '';
  if (typeof normalizarDataUsuarioCampo === 'function') return normalizarDataUsuarioCampo(bruto);
  const iso = rhIsoParaDate(bruto);
  if (iso) return rhDateParaIso(iso);
  const info = typeof obterMomentoHistorico === 'function'
    ? obterMomentoHistorico({ d: bruto }, { preferTs: false })
    : null;
  return info && info.date ? rhDateParaIso(info.date) : '';
}

function rhUsuarioHistoricoStatusBase(usuario) {
  if (typeof usuarioHistoricoStatusLista === 'function') return usuarioHistoricoStatusLista(usuario && usuario.historicoStatus);
  if (Array.isArray(usuario && usuario.historicoStatus)) return usuario.historicoStatus.map(item => ({ ...item }));
  return [];
}

function rhUsuarioPrimeiraAtivacaoHistoricoIso(usuario) {
  let primeiraData = null;
  rhUsuarioHistoricoStatusBase(usuario).forEach(evento => {
    const tipo = rhEventoTipoNormalizado(evento && evento.tipo);
    if (!tipo || (tipo !== 'ativado' && tipo !== 'reativado')) return;
    const data = rhEventoData(evento);
    if (!data) return;
    if (!primeiraData || data.getTime() < primeiraData.getTime()) primeiraData = data;
  });
  return primeiraData ? rhDateParaIso(primeiraData) : '';
}

function rhUsuarioUltimaInativacaoHistoricoIso(usuario) {
  let ultimaData = null;
  rhUsuarioHistoricoStatusBase(usuario).forEach(evento => {
    const tipo = rhEventoTipoNormalizado(evento && evento.tipo);
    if (tipo !== 'inativado') return;
    const data = rhEventoData(evento);
    if (!data) return;
    if (!ultimaData || data.getTime() > ultimaData.getTime()) ultimaData = data;
  });
  return ultimaData ? rhDateParaIso(ultimaData) : '';
}

function rhUsuarioAtivacaoIso(usuario, primeiraVendaMap) {
  const explicita = rhNormalizarDataIso(usuario && (usuario.dataAtivacao || usuario.data_ativacao));
  if (explicita) return explicita;
  const ativacaoHistorico = rhUsuarioPrimeiraAtivacaoHistoricoIso(usuario);
  if (ativacaoHistorico) return ativacaoHistorico;
  const primeiraVenda = primeiraVendaMap && primeiraVendaMap.get(String(usuario && usuario.id || ''));
  if (primeiraVenda instanceof Date && !Number.isNaN(primeiraVenda.getTime())) {
    const dataBase = rhIsoParaDate(RH_ATIVACAO_LEGADO_SEM_VENDA_ISO);
    if (dataBase && primeiraVenda.getTime() < dataBase.getTime()) return rhDateParaIso(primeiraVenda);
  }
  return rhStatusChave(usuario) === 'pendente' ? '' : RH_ATIVACAO_LEGADO_SEM_VENDA_ISO;
}

function rhUsuarioInativacaoIso(usuario, ativacaoIso = '') {
  const explicita = rhNormalizarDataIso(usuario && (usuario.dataInativacao || usuario.data_inativacao));
  if (explicita) return explicita;
  const historico = rhUsuarioUltimaInativacaoHistoricoIso(usuario);
  if (historico) return historico;
  if (rhStatusChave(usuario) !== 'inativo') return '';
  const ativacaoRef = rhNormalizarDataIso(ativacaoIso || usuario && (usuario.dataAtivacao || usuario.data_ativacao));
  const dataAtivacao = rhIsoParaDate(ativacaoRef);
  const dataBase = rhIsoParaDate(RH_ATIVACAO_LEGADO_SEM_VENDA_ISO);
  if (dataAtivacao && dataBase && dataAtivacao.getTime() < dataBase.getTime()) return RH_ATIVACAO_LEGADO_SEM_VENDA_ISO;
  return ativacaoRef || RH_ATIVACAO_LEGADO_SEM_VENDA_ISO;
}

function rhUsuarioEventosStatus(usuario, primeiraVendaMap) {
  const base = rhUsuarioHistoricoStatusBase(usuario);
  const eventos = base.filter(item => rhEventoTipoNormalizado(item && item.tipo)).map(item => ({ ...item }));
  const ativacaoIso = rhUsuarioAtivacaoIso(usuario, primeiraVendaMap);
  const inativacaoIso = rhUsuarioInativacaoIso(usuario, ativacaoIso);

  if (ativacaoIso) {
    const jaTemAtivacao = eventos.some(item => {
      const tipo = rhEventoTipoNormalizado(item && item.tipo);
      const data = rhEventoData(item);
      return (tipo === 'ativado' || tipo === 'reativado') && data && rhDateParaIso(data) === ativacaoIso;
    });
    if (!jaTemAtivacao) {
      eventos.push({
        tipo: 'ativado',
        data: rhIsoParaBr(ativacaoIso, ''),
        ts: `${ativacaoIso}T12:00:00.000Z`,
        por: 'Sistema',
        statusAnterior: '',
        statusNovo: 'Ativo',
        origem: 'base'
      });
    }
  }

  if (inativacaoIso) {
    const jaTemInativacao = eventos.some(item => {
      const tipo = rhEventoTipoNormalizado(item && item.tipo);
      const data = rhEventoData(item);
      return tipo === 'inativado' && data && rhDateParaIso(data) === inativacaoIso;
    });
    if (!jaTemInativacao) {
      eventos.push({
        tipo: 'inativado',
        data: rhIsoParaBr(inativacaoIso, ''),
        ts: `${inativacaoIso}T12:00:00.000Z`,
        por: 'Sistema',
        statusAnterior: 'Ativo',
        statusNovo: 'Inativo',
        origem: 'base'
      });
    }
  }

  return eventos.sort((a, b) => {
    const dataA = rhEventoData(a) || new Date(0);
    const dataB = rhEventoData(b) || new Date(0);
    return rhCompararDataAsc(dataA, dataB);
  });
}

function rhUsuarioPeriodosAtivos(usuario, primeiraVendaMap) {
  const ativacaoIso = rhUsuarioAtivacaoIso(usuario, primeiraVendaMap);
  const inicioBase = rhIsoParaDate(ativacaoIso);
  if (!inicioBase) return [];
  const eventos = rhUsuarioEventosStatus(usuario, primeiraVendaMap);
  const periodos = [];
  let inicioAtual = new Date(inicioBase.getTime());

  eventos.forEach(evento => {
    const data = rhEventoData(evento);
    if (!data) return;
    const tipo = rhEventoTipoNormalizado(evento && evento.tipo);
    if ((tipo === 'ativado' || tipo === 'reativado') && !inicioAtual) {
      inicioAtual = data;
      return;
    }
    if (tipo !== 'inativado' || !inicioAtual) return;
    const fim = data.getTime() < inicioAtual.getTime() ? inicioAtual : data;
    periodos.push({ inicio: new Date(inicioAtual.getTime()), fim: new Date(fim.getTime()) });
    inicioAtual = null;
  });

  if (inicioAtual) {
    const fimBase = rhStatusChave(usuario) === 'inativo'
      ? (rhIsoParaDate(rhUsuarioInativacaoIso(usuario, ativacaoIso)) || inicioBase)
      : new Date();
    const fim = fimBase.getTime() < inicioAtual.getTime() ? inicioAtual : fimBase;
    periodos.push({ inicio: new Date(inicioAtual.getTime()), fim: new Date(fim.getTime()) });
  }

  return periodos.filter(periodo => periodo.inicio && periodo.fim && periodo.fim.getTime() >= periodo.inicio.getTime());
}

function rhDataNosPeriodos(data, periodos) {
  return (periodos || []).some(periodo => data.getTime() >= periodo.inicio.getTime() && data.getTime() <= periodo.fim.getTime());
}

function rhRecortePeriodo() {
  const hoje = new Date();
  const fim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 12, 0, 0, 0);
  if (rhFiltroPeriodo === 'all') return { inicio: null, fim };
  if (rhFiltroPeriodo === 'ytd') return { inicio: new Date(fim.getFullYear(), 0, 1, 12, 0, 0, 0), fim };
  if (rhFiltroPeriodo === '1m') return { inicio: rhInicioMes(fim), fim };
  const meses = parseInt(String(rhFiltroPeriodo).replace(/\D/g, ''), 10);
  if (Number.isFinite(meses) && meses > 0) {
    return { inicio: new Date(fim.getFullYear(), fim.getMonth() - (meses - 1), 1, 12, 0, 0, 0), fim };
  }
  return { inicio: null, fim };
}

function rhDataNoRecorte(data, recorte) {
  if (!(data instanceof Date) || Number.isNaN(data.getTime())) return false;
  if (!recorte || !recorte.inicio) return data.getTime() <= recorte.fim.getTime();
  return data.getTime() >= recorte.inicio.getTime() && data.getTime() <= recorte.fim.getTime();
}

function rhMesesDosPeriodos(periodos, recorte) {
  const chaves = new Set();
  (periodos || []).forEach(periodo => {
    const inicioReal = recorte && recorte.inicio && periodo.inicio.getTime() < recorte.inicio.getTime()
      ? recorte.inicio
      : periodo.inicio;
    const fimReal = recorte && recorte.fim && periodo.fim.getTime() > recorte.fim.getTime()
      ? recorte.fim
      : periodo.fim;
    if (!inicioReal || !fimReal || fimReal.getTime() < inicioReal.getTime()) return;
    let cursor = rhInicioMes(inicioReal);
    const limite = rhInicioMes(fimReal);
    while (cursor.getTime() <= limite.getTime()) {
      chaves.add(rhMesKey(cursor));
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1, 12, 0, 0, 0);
    }
  });
  return [...chaves].sort();
}

function rhMediaNumero(valor, divisor) {
  if (!divisor) return 0;
  return Number((valor / divisor).toFixed(1));
}

function rhMontarDadosProducao(baseUsuarios, vendasIndexadas, primeiraVendaMap) {
  const operadores = (baseUsuarios || []).filter(rhUsuarioEntraNaProducao);
  const recorte = rhRecortePeriodo();
  const vendasPorUsuario = new Map();
  (vendasIndexadas || []).forEach(item => {
    const chave = String(item && item.usuario && item.usuario.id || '');
    if (!chave) return;
    if (!vendasPorUsuario.has(chave)) vendasPorUsuario.set(chave, []);
    vendasPorUsuario.get(chave).push(item);
  });

  const mesesVisiveis = new Set();
  const linhas = operadores.map(usuario => {
    const chave = String(usuario.id);
    const periodos = rhUsuarioPeriodosAtivos(usuario, primeiraVendaMap);
    const mesesAtivos = rhMesesDosPeriodos(periodos, recorte);
    mesesAtivos.forEach(item => mesesVisiveis.add(item));
    const meses = {};
    let totalVendas = 0;
    let vgv = 0;

    (vendasPorUsuario.get(chave) || []).forEach(item => {
      if (!rhDataNoRecorte(item.data, recorte)) return;
      if (!rhDataNosPeriodos(item.data, periodos)) return;
      const mes = rhMesKey(item.data);
      meses[mes] = (meses[mes] || 0) + 1;
      mesesVisiveis.add(mes);
      totalVendas += 1;
      vgv += Number(item.venda && item.venda.valor) || 0;
    });

    const mesesAtivosTotal = mesesAtivos.length || (totalVendas ? new Set(Object.keys(meses)).size : 0);
    const mediaMensal = rhMediaNumero(totalVendas, mesesAtivosTotal || 0);
    return {
      usuario,
      equipe: rhEquipeValor(usuario),
      status: usuarioStatusPadrao(usuario && usuario.status),
      ativacaoIso: rhUsuarioAtivacaoIso(usuario, primeiraVendaMap),
      mesesAtivos: mesesAtivosTotal,
      meses,
      totalVendas,
      mediaMensal,
      vgv,
      periodos
    };
  }).sort((a, b) => b.totalVendas - a.totalVendas || b.mediaMensal - a.mediaMensal || String(a.usuario.nome || '').localeCompare(String(b.usuario.nome || ''), 'pt-BR'));

  const equipesMap = new Map();
  linhas.forEach(linha => {
    const chaveEquipe = rhNorm(linha.equipe) || linha.equipe;
    if (!equipesMap.has(chaveEquipe)) {
      equipesMap.set(chaveEquipe, {
        nome: linha.equipe,
        totalVendas: 0,
        vgv: 0,
        corretores: 0,
        corretoresAtivos: 0,
        semVenda: 0,
        meses: {},
        mesesAtivos: new Set()
      });
    }
    const item = equipesMap.get(chaveEquipe);
    item.totalVendas += linha.totalVendas;
    item.vgv += linha.vgv;
    item.corretores += 1;
    if (linha.status === 'Ativo') item.corretoresAtivos += 1;
    if (!linha.totalVendas) item.semVenda += 1;
    Object.entries(linha.meses).forEach(([mes, valor]) => {
      item.meses[mes] = (item.meses[mes] || 0) + valor;
    });
    rhMesesDosPeriodos(linha.periodos, recorte).forEach(mes => item.mesesAtivos.add(mes));
  });

  const equipes = [...equipesMap.values()].map(item => ({
    nome: item.nome,
    totalVendas: item.totalVendas,
    vgv: item.vgv,
    corretores: item.corretores,
    corretoresAtivos: item.corretoresAtivos,
    semVenda: item.semVenda,
    meses: item.meses,
    mesesAtivos: item.mesesAtivos.size,
    mediaMensal: rhMediaNumero(item.totalVendas, item.mesesAtivos.size || 0)
  })).sort((a, b) => b.totalVendas - a.totalVendas || b.mediaMensal - a.mediaMensal || a.nome.localeCompare(b.nome, 'pt-BR'));

  const totalVendas = linhas.reduce((soma, linha) => soma + linha.totalVendas, 0);
  const totalVgv = linhas.reduce((soma, linha) => soma + linha.vgv, 0);
  const operadoresSemVenda = linhas.filter(linha => !linha.totalVendas).length;
  const mediaMensalOperadores = linhas.length
    ? Number((linhas.reduce((soma, linha) => soma + linha.mediaMensal, 0) / linhas.length).toFixed(1))
    : 0;

  return {
    operadores,
    corretores: operadores,
    linhas,
    equipes,
    meses: [...mesesVisiveis].sort(),
    totalVendas,
    totalVgv,
    operadoresSemVenda,
    corretoresSemVenda: operadoresSemVenda,
    mediaMensalOperadores,
    mediaMensalCorretores: mediaMensalOperadores,
    topOperador: linhas[0] || null,
    topCorretor: linhas[0] || null,
    topEquipe: equipes[0] || null
  };
}

function rhMontarDadosStatus(baseUsuarios, primeiraVendaMap) {
  const recorte = rhRecortePeriodo();
  const eventos = [];
  const mesesMap = new Map();
  (baseUsuarios || []).forEach(usuario => {
    rhUsuarioEventosStatus(usuario, primeiraVendaMap).forEach(evento => {
      const data = rhEventoData(evento);
      if (!data || !rhDataNoRecorte(data, recorte)) return;
      const tipo = rhEventoTipoNormalizado(evento.tipo);
      if (!tipo) return;
      const mes = rhMesKey(data);
      if (!mesesMap.has(mes)) mesesMap.set(mes, { mes, ativado: 0, inativado: 0, reativado: 0 });
      const resumoMes = mesesMap.get(mes);
      resumoMes[tipo] += 1;
      eventos.push({
        usuario,
        tipo,
        data,
        dataBr: formatarDataLocal(data, { comAno: true }),
        por: String(evento.por || 'Sistema').trim() || 'Sistema',
        origem: String(evento.origem || '').trim(),
        statusAnterior: String(evento.statusAnterior || '').trim(),
        statusNovo: String(evento.statusNovo || '').trim()
      });
    });
  });

  eventos.sort((a, b) => rhCompararDataDesc(a.data, b.data) || String(a.usuario && a.usuario.nome || '').localeCompare(String(b.usuario && b.usuario.nome || ''), 'pt-BR'));
  const porMes = [...mesesMap.values()].sort((a, b) => String(b.mes).localeCompare(String(a.mes)));
  const ativados = eventos.filter(item => item.tipo === 'ativado').length;
  const inativados = eventos.filter(item => item.tipo === 'inativado').length;
  const reativados = eventos.filter(item => item.tipo === 'reativado').length;

  return {
    eventos,
    porMes,
    ativados,
    inativados,
    reativados,
    saldo: ativados + reativados - inativados
  };
}

function rhTabsHtml() {
  return `
    <div class="rh-tabs">
      ${Object.entries(RH_ABA_LABELS).map(([chave, rotulo]) => `
        <button type="button" class="rh-tab${rhAbaAtiva === chave ? ' active' : ''}" onclick="rhSetFiltro('aba', '${chave}')">${zUiText(rotulo)}</button>
      `).join('')}
    </div>
  `;
}

function rhDescricaoAba() {
  if (rhAbaAtiva === 'producao') return zUiText('Cruze usuarios e vendas validas para medir a producao liquida desde a ativacao.');
  if (rhAbaAtiva === 'historico_status') return zUiText('Leia ativacoes, inativacoes e reativacoes com a linha do tempo da equipe.');
  return zUiText('Veja o quadro atual do RH e um resumo rapido da producao comercial da base filtrada.');
}

function rhToolbarHtml(opcoes, resumo, totalUsuarios) {
  const filtrosAtivos = rhFiltrosAtivosCount();
  const mostraPeriodo = rhAbaAtiva !== 'visao_geral';
  return `
    <div class="rh-toolbar">
      <div class="rh-toolbar-head">
        <div>
          <div class="rh-toolbar-kicker">${zUiText('Filtros do modulo')}</div>
          <h3>${zUiText(RH_ABA_LABELS[rhAbaAtiva] || 'Dash RH')}</h3>
          <p>${rhDescricaoAba()}</p>
        </div>
        <span class="rh-badge gray">${rhNumero(filtrosAtivos)} ${zUiText('filtros ativos')}</span>
      </div>

      <div class="rh-toolbar-grid rh-toolbar-grid--wide">
        <div class="rh-filter-field rh-filter-search">
          <label>${zUiText('Busca')}</label>
          <input type="text" id="rh-busca" value="${rhAttr(rhBusca)}" placeholder="${zUiText('Nome, e-mail, equipe ou unidade...')}" oninput="rhSetFiltro('busca', this.value)">
        </div>
        <div class="rh-filter-field">
          <label>${zUiText('Status')}</label>
          <select onchange="rhSetFiltro('status', this.value)">
            ${Object.entries(RH_STATUS_LABELS).map(([valor, rotulo]) => `<option value="${valor}" ${rhFiltroStatus === valor ? 'selected' : ''}>${zUiText(rotulo)}</option>`).join('')}
          </select>
        </div>
        <div class="rh-filter-field">
          <label>${zUiText('Unidade')}</label>
          <select onchange="rhSetFiltro('unidade', this.value)">
            <option value="">${zUiText('Todas')}</option>
            ${opcoes.unidades.map(unidade => `<option value="${rhAttr(unidade)}" ${rhFiltroUnidade === unidade ? 'selected' : ''}>${zUiText(unidade)}</option>`).join('')}
          </select>
        </div>
        <div class="rh-filter-field">
          <label>${zUiText('Equipe')}</label>
          <select onchange="rhSetFiltro('equipe', this.value)">
            <option value="">${zUiText('Todas')}</option>
            ${opcoes.equipes.map(equipe => `<option value="${rhAttr(equipe)}" ${rhFiltroEquipe === equipe ? 'selected' : ''}>${zUiText(equipe)}</option>`).join('')}
          </select>
        </div>
        <div class="rh-filter-field">
          <label>${zUiText('Perfil')}</label>
          <select onchange="rhSetFiltro('perfil', this.value)">
            <option value="">${zUiText('Todos')}</option>
            ${opcoes.perfis.map(perfil => `<option value="${perfil}" ${rhFiltroPerfil === perfil ? 'selected' : ''}>${zUiText(rhPerfilLabel(perfil))}</option>`).join('')}
          </select>
        </div>
        <div class="rh-filter-field">
          <label>${zUiText('Origem')}</label>
          <select onchange="rhSetFiltro('origem', this.value)">
            <option value="todos" ${rhFiltroOrigem === 'todos' ? 'selected' : ''}>${zUiText('Todos')}</option>
            <option value="rh" ${rhFiltroOrigem === 'rh' ? 'selected' : ''}>${zUiText('RH')}</option>
            <option value="direto" ${rhFiltroOrigem === 'direto' ? 'selected' : ''}>${zUiText('Direto')}</option>
          </select>
        </div>
        <div class="rh-filter-field">
          <label>${zUiText('Cadastro')}</label>
          <select onchange="rhSetFiltro('cadastro', this.value)">
            ${Object.entries(RH_CADASTRO_LABELS).map(([valor, rotulo]) => `<option value="${valor}" ${rhFiltroCadastro === valor ? 'selected' : ''}>${zUiText(rotulo)}</option>`).join('')}
          </select>
        </div>
        ${mostraPeriodo ? `
          <div class="rh-filter-field">
            <label>${zUiText('Periodo')}</label>
            <select onchange="rhSetFiltro('periodo', this.value)">
              ${Object.entries(RH_PERIODO_LABELS).map(([valor, rotulo]) => `<option value="${valor}" ${rhFiltroPeriodo === valor ? 'selected' : ''}>${zUiText(rotulo)}</option>`).join('')}
            </select>
          </div>
        ` : ''}
      </div>

      <div class="rh-toolbar-foot">
        <div class="rh-toolbar-meta">${zUiText(`Mostrando ${rhNumero(resumo.total)} de ${rhNumero(totalUsuarios)} usuario(s).`)}</div>
        <button type="button" class="rh-filter-btn ghost" onclick="rhLimparFiltros()">${zUiText('Limpar filtros')}</button>
      </div>
    </div>
  `;
}

function rhHeroResumoHtml(resumo, producao, historicoStatus) {
  let titulo = 'Leitura executiva do quadro atual';
  let texto = 'Pessoas, estrutura e produtividade em uma unica visao do RH.';
  let chips = [
    { label: 'Usuarios no recorte', valor: rhNumero(resumo.total) },
    { label: 'Headcount ativo', valor: resumo.total ? rhPercentual(resumo.ativos.length, resumo.total) : '0%' },
    { label: 'Corretores ativos', valor: rhNumero(resumo.corretoresAtivos.length) },
    { label: 'Cadastros prontos', valor: resumo.ativos.length ? rhPercentual(resumo.prontos.length, resumo.ativos.length) : '0%' }
  ];

  if (rhAbaAtiva === 'producao') {
    titulo = 'Producao liquida por corretor, capitao e equipe';
    texto = 'As vendas contam no mes do cadastro e saem da metrificacao quando viram distrato.';
    chips = [
      { label: 'Vendas validas', valor: rhNumero(producao.totalVendas) },
      { label: 'Media mensal/operador', valor: String(producao.mediaMensalOperadores).replace('.', ',') },
      { label: 'Operadores sem venda', valor: rhNumero(producao.operadoresSemVenda) },
      { label: 'Equipe lider', valor: producao.topEquipe ? rhTexto(producao.topEquipe.nome, 'Sem equipe') : 'Sem base' }
    ];
  } else if (rhAbaAtiva === 'historico_status') {
    titulo = 'Linha do tempo de ativacoes e reativacoes';
    texto = 'O historico mostra quando a base entrou, saiu e voltou para a operacao.';
    chips = [
      { label: 'Ativados', valor: rhNumero(historicoStatus.ativados) },
      { label: 'Inativados', valor: rhNumero(historicoStatus.inativados) },
      { label: 'Reativados', valor: rhNumero(historicoStatus.reativados) },
      { label: 'Saldo do periodo', valor: rhNumero(historicoStatus.saldo) }
    ];
  }

  return `
    <div class="rh-stage">
      <div class="rh-stage-main">
        <div class="rh-eyebrow">${zUiText('Dash RH')}</div>
        <h2>${zUiText(titulo)}</h2>
        <p>${zUiText(texto)}</p>
        <div class="rh-stage-pills">
          ${chips.map(item => `<div class="rh-highlight-chip"><span>${zUiText(item.label)}</span> <strong>${zUiText(item.valor)}</strong></div>`).join('')}
        </div>
      </div>

      <div class="rh-stage-side">
        <div class="rh-stage-total">
          <span>${zUiText('Headcount do recorte')}</span>
          <strong>${rhNumero(resumo.total)}</strong>
          <p>${zUiText(`${rhNumero(resumo.ativos.length)} ativos, ${rhNumero(resumo.inativos.length)} inativos e ${rhNumero(resumo.pendentes.length)} pendentes neste momento.`)}</p>
        </div>

        <div class="rh-spot-grid">
          <article class="rh-spot-card">
            <span>${zUiText('Ativos')}</span>
            <strong>${rhNumero(resumo.ativos.length)}</strong>
            <small>${zUiText('Base liberada para operar')}</small>
          </article>
          <article class="rh-spot-card">
            <span>${zUiText('Corretores ativos')}</span>
            <strong>${rhNumero(resumo.corretoresAtivos.length)}</strong>
            <small>${zUiText('Forca comercial ativa')}</small>
          </article>
          <article class="rh-spot-card">
            <span>${zUiText('Prontos')}</span>
            <strong>${rhNumero(resumo.prontos.length)}</strong>
            <small>${zUiText('Aptos para recebimento')}</small>
          </article>
          <article class="rh-spot-card">
            <span>${zUiText('Equipes com ativos')}</span>
            <strong>${rhNumero(resumo.equipesAtivas)}</strong>
            <small>${zUiText('Equipes vivas no recorte')}</small>
          </article>
        </div>
      </div>
    </div>
  `;
}

function rhPanelProducaoRanking(titulo, subtitulo, lista, opcoes = {}) {
  const itens = (lista || []).slice(0, opcoes.limite || 8);
  const baseMaior = itens.reduce((maior, item) => Math.max(maior, item.totalVendas || 0), 0);
  const linhas = itens.length ? itens.map(item => {
    const pct = baseMaior ? Math.max(6, ((item.totalVendas || 0) / baseMaior) * 100) : 0;
    const meta = opcoes.meta ? opcoes.meta(item) : '';
    return `
      <div class="rh-rank-row">
        <div class="rh-rank-main">
          <div class="rh-rank-name">${zUiText(item.nome || item.usuario && item.usuario.nome || 'Sem nome')}</div>
          <div class="rh-rank-meta">${zUiText(meta)}</div>
          <div class="rh-rank-bar"><span style="width:${pct.toFixed(2)}%"></span></div>
        </div>
        <div class="rh-rank-metrics">
          <div class="rh-rank-metric">
            <strong>${rhNumero(item.totalVendas || 0)}</strong>
            <span>${zUiText('Vendas')}</span>
          </div>
          <div class="rh-rank-metric">
            <strong>${String(item.mediaMensal || 0).replace('.', ',')}</strong>
            <span>${zUiText('Media/mes')}</span>
          </div>
          <div class="rh-rank-metric">
            <strong>${fmtK(item.vgv || 0)}</strong>
            <span>${zUiText('VGV')}</span>
          </div>
        </div>
      </div>
    `;
  }).join('') : `
    <div class="rh-empty">
      <strong>${zUiText('Sem producao no recorte')}</strong>
      <span>${zUiText('Ajuste os filtros ou aguarde novas vendas validas entrarem na base.')}</span>
    </div>
  `;

  return `
    <section class="rh-panel">
      <div class="rh-panel-head">
        <div>
          <h3>${zUiText(titulo)}</h3>
          <p>${zUiText(subtitulo)}</p>
        </div>
        <div class="rh-panel-count">${rhNumero((lista || []).length)}</div>
      </div>
      <div class="rh-rank-list">${linhas}</div>
    </section>
  `;
}

function rhTabelaProducao(producao) {
  const linhasAtivas = (producao.linhas || []).filter(linha => linha.status === 'Ativo');
  if (!linhasAtivas.length) {
    return `
      <section class="rh-panel rh-panel-wide">
        <div class="rh-panel-head">
          <div>
            <h3>${zUiText('Matriz mensal por corretor e capitao')}</h3>
            <p>${zUiText('Sem corretores ou capitoes ativos com vendas validas para montar a serie do recorte atual.')}</p>
          </div>
        </div>
        <div class="rh-empty">
          <strong>${zUiText('Nenhuma linha para exibir')}</strong>
          <span>${zUiText('A matriz mostra corretores e capitoes ativos com vendas mensais desde a ativacao.')}</span>
        </div>
      </section>
    `;
  }
  const meses = producao.meses;
  return `
    <section class="rh-panel rh-panel-wide">
      <div class="rh-panel-head">
        <div>
          <h3>${zUiText('Matriz mensal por corretor e capitao')}</h3>
          <p>${zUiText('A media mensal considera apenas os meses em que o profissional esteve ativo na operacao. Esta tabela mostra corretores e capitoes ativos.')}</p>
        </div>
        <div class="rh-panel-count">${rhNumero(linhasAtivas.length)}</div>
      </div>
      <div class="rh-table-wrap">
        <table class="rh-table rh-table-matrix">
          <thead>
            <tr>
              <th>${zUiText('Profissional')}</th>
              <th>${zUiText('Equipe')}</th>
              <th>${zUiText('Status')}</th>
              <th>${zUiText('Ativacao')}</th>
              <th>${zUiText('Meses ativos')}</th>
              ${meses.map(mes => `<th>${zUiText(rhMesLabel(mes))}</th>`).join('')}
              <th>${zUiText('Total')}</th>
              <th>${zUiText('Media/mes')}</th>
            </tr>
          </thead>
          <tbody>
            ${linhasAtivas.map(linha => `
              <tr>
                <td><strong>${zUiText(linha.usuario.nome)}</strong></td>
                <td>${zUiText(linha.equipe)}</td>
                <td>${zUiText(linha.status)}</td>
                <td>${zUiText(rhIsoParaBr(linha.ativacaoIso))}</td>
                <td>${rhNumero(linha.mesesAtivos)}</td>
                ${meses.map(mes => `<td>${rhNumero(linha.meses[mes] || 0)}</td>`).join('')}
                <td><strong>${rhNumero(linha.totalVendas)}</strong></td>
                <td>${String(linha.mediaMensal).replace('.', ',')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function rhTabelaEventosStatus(dados) {
  if (!dados.eventos.length) {
    return `
      <section class="rh-panel rh-panel-wide">
        <div class="rh-panel-head">
          <div>
            <h3>${zUiText('Eventos do periodo')}</h3>
            <p>${zUiText('Nenhum evento de status entrou no recorte atual.')}</p>
          </div>
        </div>
        <div class="rh-empty">
          <strong>${zUiText('Sem movimentacoes')}</strong>
          <span>${zUiText('Ativacoes, inativacoes e reativacoes aparecerao aqui automaticamente.')}</span>
        </div>
      </section>
    `;
  }
  return `
    <section class="rh-panel rh-panel-wide">
      <div class="rh-panel-head">
        <div>
          <h3>${zUiText('Eventos do periodo')}</h3>
          <p>${zUiText('Lista cronologica mais recente das mudancas de status da base filtrada.')}</p>
        </div>
        <div class="rh-panel-count">${rhNumero(dados.eventos.length)}</div>
      </div>
      <div class="rh-table-wrap">
        <table class="rh-table">
          <thead>
            <tr>
              <th>${zUiText('Usuario')}</th>
              <th>${zUiText('Equipe')}</th>
              <th>${zUiText('Evento')}</th>
              <th>${zUiText('Data')}</th>
              <th>${zUiText('Por')}</th>
              <th>${zUiText('Origem')}</th>
            </tr>
          </thead>
          <tbody>
            ${dados.eventos.map(item => `
              <tr>
                <td><strong>${zUiText(item.usuario.nome)}</strong></td>
                <td>${zUiText(rhEquipeValor(item.usuario))}</td>
                <td>${zUiText(item.tipo === 'inativado' ? 'Inativado' : item.tipo === 'reativado' ? 'Reativado' : 'Ativado')}</td>
                <td>${zUiText(item.dataBr)}</td>
                <td>${zUiText(item.por || 'Sistema')}</td>
                <td>${zUiText(item.origem || 'status')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function rhConteudoVisaoGeral(resumo, origemRhAtiva, producao) {
  const cardProntos = resumo.ativos.length ? rhPercentual(resumo.prontos.length, resumo.ativos.length) : '0%';
  const equipeLider = producao.topEquipe ? producao.topEquipe.nome : 'Sem equipe';
  return `
    <div class="rh-kpis rh-kpis-compact">
      ${rhCardKpi('Inativos', rhNumero(resumo.inativos.length), zUiText('Fora da operacao ou sem acesso liberado'))}
      ${rhCardKpi('Pendentes', rhNumero(resumo.pendentes.length), zUiText('Convites ou cadastros ainda nao concluidos'))}
      ${rhCardKpi('Corretores totais', rhNumero(resumo.corretores.length), zUiText('Base comercial no recorte atual'))}
      ${rhCardKpi('Origem RH ativa', rhNumero(origemRhAtiva), zUiText('Usuarios ativos marcados como entrada via RH'), true)}
      ${rhCardKpi('Vendas validas no periodo', rhNumero(producao.totalVendas), zUiText('Producao liquida sem distratos'))}
      ${rhCardKpi('Media mensal/operador', String(producao.mediaMensalOperadores).replace('.', ','), zUiText('Media de vendas por corretor ou capitao no recorte'))}
      ${rhCardKpi('Equipe lider', zUiText(equipeLider), zUiText('Equipe com maior volume de vendas validas'))}
      ${rhCardKpi('Operadores sem venda', rhNumero(producao.operadoresSemVenda), zUiText('Corretores e capitoes sem venda valida no recorte'))}
      ${rhCardKpi('Prontos para recebimento', rhNumero(resumo.prontos.length), zUiText(`${cardProntos} dos ativos com telefone, banco/conta e Pix`))}
    </div>

    <div class="rh-grid rh-grid-heroic">
      ${rhPainelInsights(resumo, { origemRhAtiva })}
      ${rhPanelRanking('Quadro por unidade', 'Leitura consolidada da estrutura por unidade', resumo.porUnidade, { mostrarMeta: false, limite: 6 })}
      ${rhPanelRanking('Quadro por equipe', 'Onde o quadro esta concentrado hoje', resumo.porEquipe, { metaPrefix: 'Unidade: ', limite: 8, className: 'rh-panel-wide' })}
      ${rhPanelSaude(resumo.alertas, resumo.ativos.length)}
      ${rhPanelProducaoRanking('Operadores com mais producao', 'Volume liquido de vendas no recorte atual', producao.linhas, {
        limite: 6,
        meta: item => `${item.equipe} · ${rhIsoParaBr(item.ativacaoIso)}`
      })}
      ${rhPanelProducaoRanking('Equipes com mais producao', 'Resumo por equipe da base filtrada', producao.equipes, {
        limite: 6,
        meta: item => `${rhNumero(item.corretores)} operador(es) · ${rhNumero(item.semVenda)} sem venda`
      })}
    </div>

    ${rhTabelaResumo('Resumo por unidade', 'Comparativo executivo do quadro atual por unidade.', resumo.porUnidade, { colunaNome: 'Unidade' })}
    ${rhTabelaResumo('Resumo por equipe', 'Leitura das equipes com unidade de referencia e prontidao cadastral.', resumo.porEquipe, { colunaNome: 'Equipe', mostrarMeta: true, colunaMeta: 'Unidade' })}
  `;
}

function rhConteudoProducao(producao) {
  const topOperador = producao.topOperador ? producao.topOperador.usuario.nome : 'Sem base';
  const topEquipe = producao.topEquipe ? producao.topEquipe.nome : 'Sem base';
  return `
    <div class="rh-kpis rh-kpis-compact">
      ${rhCardKpi('Vendas validas', rhNumero(producao.totalVendas), zUiText('Conta no cadastro e sai da base se virar distrato'), true)}
      ${rhCardKpi('VGV valido', fmtK(producao.totalVgv), zUiText('Soma dos valores das vendas validas'))}
      ${rhCardKpi('Media mensal/operador', String(producao.mediaMensalOperadores).replace('.', ','), zUiText('Media individual de corretor ou capitao dentro da janela ativa'))}
      ${rhCardKpi('Top operador', zUiText(topOperador), zUiText('Maior volume de vendas validas no recorte'))}
      ${rhCardKpi('Top equipe', zUiText(topEquipe), zUiText('Equipe lider em vendas validas no recorte'))}
      ${rhCardKpi('Operadores sem venda', rhNumero(producao.operadoresSemVenda), zUiText('Corretores e capitoes do filtro com zero venda valida'))}
    </div>

    <div class="rh-grid rh-grid-heroic">
      ${rhPanelProducaoRanking('Ranking de operadores', 'Quem mais vendeu no recorte atual', producao.linhas, {
        limite: 8,
        meta: item => `${item.equipe} · ${item.status}`
      })}
      ${rhPanelProducaoRanking('Ranking de equipes', 'Consolidado da producao por equipe', producao.equipes, {
        limite: 8,
        meta: item => `${rhNumero(item.corretores)} operador(es) · ${rhNumero(item.corretoresAtivos)} ativo(s)`
      })}
    </div>

    ${rhTabelaProducao(producao)}
  `;
}

function rhConteudoHistoricoStatus(dados) {
  return `
    <div class="rh-kpis rh-kpis-compact">
      ${rhCardKpi('Ativados', rhNumero(dados.ativados), zUiText('Entradas registradas no periodo'), true)}
      ${rhCardKpi('Inativados', rhNumero(dados.inativados), zUiText('Saidas registradas no periodo'))}
      ${rhCardKpi('Reativados', rhNumero(dados.reativados), zUiText('Retornos para a operacao no periodo'))}
      ${rhCardKpi('Saldo do periodo', rhNumero(dados.saldo), zUiText('Ativados + reativados menos inativados'))}
      ${rhCardKpi('Eventos', rhNumero(dados.eventos.length), zUiText('Movimentacoes de status no recorte'))}
    </div>

    <div class="rh-grid rh-grid-heroic">
      <section class="rh-panel">
        <div class="rh-panel-head">
          <div>
            <h3>${zUiText('Resumo mensal de status')}</h3>
            <p>${zUiText('Acompanhe entradas, saidas e retornos por mes.')}</p>
          </div>
          <div class="rh-panel-count">${rhNumero(dados.porMes.length)}</div>
        </div>
        <div class="rh-rank-list">
          ${dados.porMes.length ? dados.porMes.map(item => `
            <div class="rh-rank-row">
              <div class="rh-rank-main">
                <div class="rh-rank-name">${zUiText(rhMesLabel(item.mes))}</div>
                <div class="rh-rank-meta">${zUiText(`Saldo ${rhNumero(item.ativado + item.reativado - item.inativado)}`)}</div>
                <div class="rh-rank-bar"><span style="width:${Math.min(100, Math.max(8, ((item.ativado + item.reativado + item.inativado) || 0) * 18))}%"></span></div>
              </div>
              <div class="rh-rank-metrics">
                <div class="rh-rank-metric"><strong>${rhNumero(item.ativado)}</strong><span>${zUiText('Ativados')}</span></div>
                <div class="rh-rank-metric"><strong>${rhNumero(item.inativado)}</strong><span>${zUiText('Inativados')}</span></div>
                <div class="rh-rank-metric"><strong>${rhNumero(item.reativado)}</strong><span>${zUiText('Reativados')}</span></div>
              </div>
            </div>
          `).join('') : `
            <div class="rh-empty">
              <strong>${zUiText('Sem eventos no periodo')}</strong>
              <span>${zUiText('Os meses com movimentacao de status serao exibidos aqui.')}</span>
            </div>
          `}
        </div>
      </section>

      <section class="rh-panel">
        <div class="rh-panel-head">
          <div>
            <h3>${zUiText('Leitura do historico')}</h3>
            <p>${zUiText('O sistema agora registra ativado, inativado e reativado para apoiar o RH e a lideranca.')}</p>
          </div>
          <div class="rh-panel-count">${zUiText('Status')}</div>
        </div>
        <div class="rh-future-grid">
          <div class="rh-note-item">
            <strong>${zUiText('Ativados')}</strong>
            ${zUiText('Quando o usuario entra na operacao ativa, o registro aparece automaticamente neste historico.')}
          </div>
          <div class="rh-note-item">
            <strong>${zUiText('Inativados')}</strong>
            ${zUiText('Quando o status muda para inativo, a data fica gravada para apoiar leitura de base e producao.')}
          </div>
          <div class="rh-note-item">
            <strong>${zUiText('Reativados')}</strong>
            ${zUiText('Quando o usuario volta para ativo, um novo evento de reativacao entra na linha do tempo.')}
          </div>
        </div>
      </section>
    </div>

    ${rhTabelaEventosStatus(dados)}
  `;
}

function renderRhDashboard() {
  const cont = document.getElementById('rh-dashboard-content');
  if (!cont) return;
  const estadoBusca = rhCapturarEstadoBusca();

  if (!rhDashboardPodeAcessar()) {
    cont.innerHTML = `<div class="rh-locked">
      <div class="rh-locked-icon">${zUiText('RH')}</div>
      <div class="rh-locked-title">${zUiText('Acesso restrito')}</div>
      <div class="rh-locked-sub">${zUiText('O Dash RH fica disponivel somente para RH, Dono, Diretor e Financeiro, porque reune estrutura da equipe, situacao cadastral e leitura gerencial dos usuarios.')}</div>
    </div>`;
    return;
  }

  const opcoes = rhOpcoesFiltros();
  rhGarantirFiltrosValidos(opcoes);
  const listaTotal = rhListaUsuarios();
  const base = rhBaseFiltrada();
  const resumo = rhResumoBase(base);
  const origemRhAtiva = resumo.ativos.filter(usuario => !!(usuario && usuario.rhContratacao)).length;
  const vendasIndexadas = rhListaVendasIndexadas();
  const primeiraVendaMap = rhPrimeiraVendaPorUsuario(vendasIndexadas);
  const producao = rhMontarDadosProducao(base, vendasIndexadas, primeiraVendaMap);
  const historicoStatus = rhMontarDadosStatus(base, primeiraVendaMap);
  let conteudo = '';

  if (rhAbaAtiva === 'producao') {
    conteudo = rhConteudoProducao(producao);
  } else if (rhAbaAtiva === 'historico_status') {
    conteudo = rhConteudoHistoricoStatus(historicoStatus);
  } else {
    conteudo = rhConteudoVisaoGeral(resumo, origemRhAtiva, producao);
  }

  cont.innerHTML = `
    ${rhHeroResumoHtml(resumo, producao, historicoStatus)}
    ${rhTabsHtml()}
    ${rhToolbarHtml(opcoes, resumo, listaTotal.length)}
    ${conteudo}
  `;
  rhRestaurarEstadoBusca(estadoBusca);
}

zRegisterModule('rhDashboard', {
  renderRhDashboard,
  rhSetFiltro,
  rhLimparFiltros,
  rhDashboardPodeAcessar
});
