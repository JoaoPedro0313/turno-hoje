/* ============================================================================
   mariua-ui.js — UTILIDADES DO INÍCIO E DO PAINEL DO DIA
   ----------------------------------------------------------------------------
   - Relógio e selo do banco na barra do topo, iguais às outras telas.
   - A lista de telas vem do nav.js (fonte única) e do catálogo do login.
   - Lembra menu aberto/recolhido (mesma chave mariua_menu das outras telas).
   - O tema escuro fica por conta do nav.js, como nas outras telas.
   ========================================================================== */
(function () {
  'use strict';
  var UI = window.MariuaUI = {};

  UI.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  function p2(n) { return String(n).padStart(2, '0'); }
  UI.hora = function (d) { return p2(d.getHours()) + ':' + p2(d.getMinutes()); };
  UI.dataLonga = function (d) {
    var t = d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    return t.charAt(0).toUpperCase() + t.slice(1);
  };
  UI.moeda = function (v, curto) {
    v = +v || 0;
    if (curto && Math.abs(v) >= 1000) {
      return 'R$ ' + (v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: v >= 100000 ? 0 : 1 }) + ' mil';
    }
    return 'R$ ' + Math.round(v).toLocaleString('pt-BR');
  };
  UI.relativo = function (d) {
    if (!d) return 'sem data';
    var min = Math.round((Date.now() - d.getTime()) / 60000);
    if (min < 1) return 'agora';
    if (min < 60) return 'há ' + min + ' min';
    var h = Math.round(min / 60);
    if (h < 24) return 'há ' + h + ' h';
    var dias = Math.round(h / 24);
    return dias === 1 ? 'ontem' : 'há ' + dias + ' dias';
  };

  // ─── espera o login (mariua-auth.js publica MARIUA_USER e MARIUA_SB) ─────
  UI.esperarLogin = function () {
    return new Promise(function (ok) {
      (function olha() {
        if (window.MARIUA_USER && window.MARIUA_SB) return ok(window.MARIUA_USER);
        setTimeout(olha, 200);
      })();
    });
  };

  // ─── permissões e catálogo de telas ─────────────────────────────────────
  UI.pode = function (href) {
    if (typeof window.mariuaTemTela !== 'function' || typeof window.mariuaTelaDeArquivo !== 'function') return true;
    var id = window.mariuaTelaDeArquivo(href);
    return id ? window.mariuaTemTela(id) : true;
  };
  UI.podeId = function (id) {
    return typeof window.mariuaTemTela === 'function' ? window.mariuaTemTela(id) : true;
  };
  var INFO = {
    'index.html':             ['Início', 'Resumo do dia e atalhos', 'inicio home'],
    'painel.html':            ['Painel do dia', 'O que fugiu do previsto hoje', 'painel pendencia excecao alerta dia'],
    'turno.html':             ['Turno', 'Quem abriu turno no dia', 'turno equipe abertura efetivo presenca falta'],
    'rdo.html':               ['RDO', 'Quem lançou o relatório diário', 'rdo apr relatorio diario lancamento'],
    'mapa.html':              ['Mapa de obras', 'Obras no mapa, raio e rotas', 'mapa obra localizacao coordenada rota gps'],
    'prog.html':              ['Programação', 'Frentes por equipe e dia', 'programacao agenda frente equipe fator k'],
    'comp.html':              ['Comparador de postes', 'Mudanças nos postes da Coelba', 'comparador poste coelba cava'],
    'estagios.html':          ['Estágios de obras', 'Obras por etapa e pendência', 'estagio etapa andamento pendencia material poda'],
    'ocorrencias.html':       ['Ocorrências', 'Apontado e faturado por equipe', 'ocorrencia gpm faturado apontado manutencao'],
    'producao.html':          ['Produção de obras', 'Cavas, postes e cabos por equipe', 'producao ranking cava poste cabo lancamento equipe'],
    'faturamento.html':       ['Faturamento das turmas', 'Valor da produção por turma e meta', 'faturamento faturado valor turma equipe meta receita'],
    'neoex.html':             ['NEOEX', 'Apontamento do GPM e planilha', 'neoex apontamento gpm planilha material'],
    'cadastro_obra.html':     ['Cadastro de obra', 'Incluir obra na carteira', 'cadastro obra nova pep carteira'],
    'valores.html':           ['Financeiro', 'Lançamentos e fornecedores', 'financeiro valor custo fornecedor lancamento'],
    'equipes.html':           ['Cadastro de equipes', 'Supervisores, equipes e carteiras', 'equipe encarregado supervisor carteira cadastro'],
    'fator_k.html':           ['Fator K', 'Multiplicador de cada base', 'fator k multiplicador base contrato'],
    'permissoes.html':        ['Permissões do GPM', 'Telas do GPM por usuário', 'permissao gpm tela usuario'],
    'projeçao.html':          ['Projeção e PDA', 'Acesso e uso dos PDAs', 'projecao pda acesso ocioso'],
    'admin.html':             ['Admin', 'Usuários e telas liberadas', 'admin usuario acesso solicitacao'],
    'vencimento_cursos.html': ['Vencimento de cursos', 'Certificados e reciclagens', 'curso certificado nr10 nr35 sesmt vencimento'],
    'ensaios.html':           ['Ensaios', 'Ensaios de EPI', 'ensaio epi luva sesmt'],
    'brigada.html':           ['Brigada', 'Extintores e hidrantes', 'brigada extintor hidrante recarga sesmt']
  };
  var ICONE_ID = { cursos: 'certificate', ensaios: 'shield-check', brigada: 'flame', painel: 'activity' };
  function arquivo(href) {
    var a = String(href || '').split('?')[0].split('#')[0].split('/').pop();
    try { a = decodeURIComponent(a); } catch (e) {}
    try { a = a.normalize('NFC'); } catch (e) {}
    return a.toLowerCase();
  }
  UI.infoTela = function (href) { return INFO[arquivo(href)] || null; };

  /* Lista de telas que a pessoa pode abrir: primeiro as do menu (nav.js),
     depois as do catálogo do login que não estão no menu (SESMT, por exemplo).
     extra = true marca as que estão fora do menu (podem não estar instaladas). */
  UI.telas = function () {
    var out = [], vistos = {};
    function add(href, texto, icone, grupo, extra) {
      var k = arquivo(href);
      if (!k || vistos[k]) return;
      vistos[k] = 1;
      var info = INFO[k] || [texto, '', ''];
      out.push({ href: href, texto: info[0] || texto, desc: info[1], chaves: info[2], icone: icone || 'file', grupo: grupo || '', extra: !!extra });
    }
    var nav = window.mariuaNav && window.mariuaNav.itens;
    if (nav) {
      add(nav.inicio.href, nav.inicio.texto, nav.inicio.icone, '');
      nav.grupos.forEach(function (g) { g.itens.forEach(function (i) { add(i.href, i.texto, i.icone, g.texto); }); });
    }
    (window.MARIUA_TELAS || []).forEach(function (t) {
      var a = t.arquivos && t.arquivos[0];
      if (!a) return;
      var grupo = /cursos|ensaios|brigada/.test(t.id) ? 'SESMT' : 'Outras';
      add(a, t.nome, ICONE_ID[t.id] || 'file', grupo, true);
    });
    return out.filter(function (t) { return UI.pode(t.href); });
  };

  /* A tela existe neste site? (as do SESMT estão no catálogo mas podem não
     ter sido publicadas). Erro de rede conta como "existe" para não esconder. */
  var cacheExiste = {};
  UI.telaExiste = function (href) {
    var k = arquivo(href);
    if (!cacheExiste[k]) {
      cacheExiste[k] = fetch(href, { method: 'HEAD', cache: 'no-store' })
        .then(function (r) { return r.ok || r.status === 405; })
        .catch(function () { return true; });
    }
    return cacheExiste[k];
  };

  /* Botões que levam a telas do SESMT ainda não publicadas ficam desativados,
     em vez de abrir uma página que não existe. */
  UI.desativarTelasAusentes = function (raiz) {
    (raiz || document).querySelectorAll('a[href]').forEach(function (a) {
      var href = a.getAttribute('href');
      if (!/(vencimento_cursos|ensaios|brigada)\.html/.test(href)) return;
      UI.telaExiste(href).then(function (existe) {
        if (existe) return;
        a.removeAttribute('href');
        a.setAttribute('aria-disabled', 'true');
        a.title = 'Esta tela ainda não foi publicada no site';
      });
    });
  };

  // ─── estado da sincronização no topo ────────────────────────────────────
  UI.sinc = function (estado, texto) {        // estado: 'lendo' | 'ok' | 'erro'
    var el = document.getElementById('db-badge'), tx = document.getElementById('db-text');
    if (!el) return;
    el.className = 'db-badge ' + ({ lendo: 'syncing', ok: 'online', erro: 'offline' }[estado] || 'local');
    if (tx) tx.textContent = texto;
    el.title = texto;
  };

  // ─── aviso rápido ───────────────────────────────────────────────────────
  var tToast = null;
  UI.toast = function (msg) {
    var t = document.getElementById('m-toast');
    if (!t) { t = document.createElement('div'); t.id = 'm-toast'; t.className = 'm-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add('on');
    clearTimeout(tToast);
    tToast = setTimeout(function () { t.classList.remove('on'); }, 2600);
  };

  UI.copiar = function (texto) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(texto);
    return new Promise(function (ok, falha) {
      var ta = document.createElement('textarea');
      ta.value = texto; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy') ? ok() : falha(); } catch (e) { falha(e); }
      ta.remove();
    });
  };

  // ─── menu: grava aberto/recolhido como as outras telas ──────────────────
  function prepararMenu() {
    var t = window.smToggle;
    if (typeof t === 'function' && !t.__m) {
      window.smToggle = function () {
        t.apply(this, arguments);
        try { localStorage.setItem('mariua_menu', document.body.classList.contains('sm-collapsed') ? 'recolhido' : 'aberto'); } catch (e) {}
      };
      window.smToggle.__m = true;
    }
  }

  // ─── relógio do topo (mesmo formato das outras telas) ───────────────────
  function relogio() {
    var el = document.getElementById('page-time');
    if (!el) return;
    var dias = ['dom.', 'seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sáb.'];
    function tick() { var d = new Date(); el.textContent = dias[d.getDay()] + ', ' + p2(d.getDate()) + '/' + p2(d.getMonth() + 1) + ' · ' + p2(d.getHours()) + ':' + p2(d.getMinutes()); }
    tick(); setInterval(tick, 30000);
  }

  // ─── avatar: mesmo botão das outras telas, só o nome no título ───────────
  function pintarAvatar() {
    var b = document.getElementById('user-avatar'), u = window.MARIUA_USER;
    if (b && u) b.title = (u.nome || u.email || '') + (u.gestor ? ' (gestor)' : '');
  }

  // ─── início ─────────────────────────────────────────────────────────────
  function iniciar() {
    prepararMenu();
    relogio();
    UI.esperarLogin().then(pintarAvatar);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
