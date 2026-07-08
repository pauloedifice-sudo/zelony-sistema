// DASH RH
// Estrutura atual de usuarios, equipes e unidades com recortes operacionais.

let rhBusca = '';
let rhFiltroUnidade = '';
let rhFiltroEquipe = '';
let rhFiltroPerfil = '';
let rhFiltroStatus = 'todos';
let rhFiltroOrigem = 'todos';
let rhFiltroCadastro = 'todos';

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

zSetState('state.ui.rhDashboard', {
  busca: rhBusca,
  unidade: rhFiltroUnidade,
  equipe: rhFiltroEquipe,
  perfil: rhFiltroPerfil,
  status: rhFiltroStatus,
  origem: rhFiltroOrigem,
  cadastro: rhFiltroCadastro
});

function rhSyncState() {
  zSetState('state.ui.rhDashboard', {
    busca: rhBusca,
    unidade: rhFiltroUnidade,
    equipe: rhFiltroEquipe,
    perfil: rhFiltroPerfil,
    status: rhFiltroStatus,
    origem: rhFiltroOrigem,
    cadastro: rhFiltroCadastro
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
    rhFiltroCadastro !== 'todos' ? rhFiltroCadastro : ''
  ].filter(Boolean).length;
}

function rhSetFiltro(campo, valor) {
  if (campo === 'busca') rhBusca = valor || '';
  if (campo === 'unidade') rhFiltroUnidade = valor || '';
  if (campo === 'equipe') rhFiltroEquipe = valor || '';
  if (campo === 'perfil') rhFiltroPerfil = valueOrEmpty(valor);
  if (campo === 'status') rhFiltroStatus = valor || 'todos';
  if (campo === 'origem') rhFiltroOrigem = valor || 'todos';
  if (campo === 'cadastro') rhFiltroCadastro = valor || 'todos';
  if (campo === 'unidade' && rhFiltroEquipe) {
    const equipes = rhOpcoesFiltros().equipes;
    if (!equipes.includes(rhFiltroEquipe)) rhFiltroEquipe = '';
  }
  rhSyncState();
  renderRhDashboard();
}

function valueOrEmpty(valor) {
  return valor || '';
}

function rhLimparFiltros() {
  rhBusca = '';
  rhFiltroUnidade = '';
  rhFiltroEquipe = '';
  rhFiltroPerfil = '';
  rhFiltroStatus = 'todos';
  rhFiltroOrigem = 'todos';
  rhFiltroCadastro = 'todos';
  rhSyncState();
  renderRhDashboard();
}

function renderRhDashboardLegacy() {
  const cont = document.getElementById('rh-dashboard-content');
  if (!cont) return;

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
            <input type="text" value="${rhAttr(rhBusca)}" placeholder="${zUiText('Nome, e-mail, equipe ou unidade...')}" oninput="rhSetFiltro('busca', this.value)">
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

function renderRhDashboard() {
  const cont = document.getElementById('rh-dashboard-content');
  if (!cont) return;

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
  const filtrosAtivos = rhFiltrosAtivosCount();
  const cardProntos = resumo.ativos.length ? rhPercentual(resumo.prontos.length, resumo.ativos.length) : '0%';
  const origemRhAtiva = resumo.ativos.filter(usuario => !!(usuario && usuario.rhContratacao)).length;
  const origemDiretaAtiva = resumo.ativos.length - origemRhAtiva;
  const headcountAtivo = resumo.total ? rhPercentual(resumo.ativos.length, resumo.total) : '0%';

  cont.innerHTML = `
    <div class="rh-stage">
      <div class="rh-stage-main">
        <div class="rh-eyebrow">${zUiText('Dash RH')}</div>
        <h2>${zUiText('Leitura executiva do quadro atual')}</h2>
        <p>${zUiText('Esta versao foi reorganizada para ficar mais clara: primeiro a historia principal do quadro, depois os filtros e na sequencia os recortes por unidade, equipe e saude cadastral.')}</p>
        <div class="rh-stage-pills">
          <div class="rh-highlight-chip"><span>${zUiText('Usuarios no recorte')}</span> <strong>${rhNumero(resumo.total)}</strong></div>
          <div class="rh-highlight-chip"><span>${zUiText('Headcount ativo')}</span> <strong>${headcountAtivo}</strong></div>
          <div class="rh-highlight-chip"><span>${zUiText('Origem RH ativa')}</span> <strong>${rhNumero(origemRhAtiva)}</strong></div>
          <div class="rh-highlight-chip"><span>${zUiText('Origem direta ativa')}</span> <strong>${rhNumero(origemDiretaAtiva)}</strong></div>
          <div class="rh-highlight-chip"><span>${zUiText('Cadastros prontos')}</span> <strong>${cardProntos}</strong></div>
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

    <div class="rh-toolbar">
      <div class="rh-toolbar-head">
        <div>
          <div class="rh-toolbar-kicker">${zUiText('Filtros do modulo')}</div>
          <h3>${zUiText('Afine o recorte do RH')}</h3>
          <p>${zUiText('Todos os cards, rankings e tabelas acompanham a selecao abaixo.')}</p>
        </div>
        <span class="rh-badge gray">${rhNumero(filtrosAtivos)} ${zUiText('filtros ativos')}</span>
      </div>

      <div class="rh-toolbar-grid">
        <div class="rh-filter-field rh-filter-search">
          <label>${zUiText('Busca')}</label>
          <input type="text" value="${rhAttr(rhBusca)}" placeholder="${zUiText('Nome, e-mail, equipe ou unidade...')}" oninput="rhSetFiltro('busca', this.value)">
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

      <div class="rh-toolbar-foot">
        <div class="rh-toolbar-meta">${zUiText(`Mostrando ${rhNumero(resumo.total)} de ${rhNumero(listaTotal.length)} usuario(s).`)}</div>
        <button type="button" class="rh-filter-btn ghost" onclick="rhLimparFiltros()">${zUiText('Limpar filtros')}</button>
      </div>
    </div>

    <div class="rh-kpis rh-kpis-compact">
      ${rhCardKpi('Inativos', rhNumero(resumo.inativos.length), zUiText('Fora da operacao ou sem acesso liberado'))}
      ${rhCardKpi('Pendentes', rhNumero(resumo.pendentes.length), zUiText('Convites ou cadastros ainda nao concluidos'))}
      ${rhCardKpi('Corretores totais', rhNumero(resumo.corretores.length), zUiText('Base comercial no recorte atual'))}
      ${rhCardKpi('Unidades com ativos', rhNumero(resumo.unidadesAtivas), zUiText('Unidades com pelo menos um usuario ativo'))}
      ${rhCardKpi('Origem RH ativa', rhNumero(origemRhAtiva), zUiText('Usuarios ativos marcados como entrada via RH'), true)}
    </div>

    <div class="rh-grid rh-grid-heroic">
      ${rhPainelInsights(resumo, { origemRhAtiva })}
      ${rhPanelRanking('Quadro por unidade', 'Leitura consolidada da estrutura por unidade', resumo.porUnidade, { mostrarMeta: false, limite: 6 })}
      ${rhPanelRanking('Quadro por equipe', 'Onde o quadro esta concentrado hoje', resumo.porEquipe, { metaPrefix: 'Unidade: ', limite: 8, className: 'rh-panel-wide' })}
      ${rhPanelSaude(resumo.alertas, resumo.ativos.length)}
      ${rhPanelRanking('Distribuicao por perfil', 'Composicao de acessos, lideranca e operacao', resumo.porPerfil, { mostrarMeta: false, limite: 7 })}
      ${rhPanelRanking('Origem do cadastro', 'Comparativo entre entrada via RH e entrada direta', resumo.porOrigem, { mostrarMeta: false, limite: 4 })}
      ${rhPainelHistoricoFuturo()}
    </div>

    ${rhTabelaResumo('Resumo por unidade', 'Comparativo executivo do quadro atual por unidade.', resumo.porUnidade, { colunaNome: 'Unidade' })}
    ${rhTabelaResumo('Resumo por equipe', 'Leitura das equipes com unidade de referencia e prontidao cadastral.', resumo.porEquipe, { colunaNome: 'Equipe', mostrarMeta: true, colunaMeta: 'Unidade' })}
  `;
}

zRegisterModule('rhDashboard', {
  renderRhDashboard,
  rhSetFiltro,
  rhLimparFiltros,
  rhDashboardPodeAcessar
});
