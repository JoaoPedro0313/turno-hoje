/* ============================================================================
   mariua-ui.js — BARRA DO TOPO, BUSCA GLOBAL E UTILIDADES DAS TELAS NOVAS
   ----------------------------------------------------------------------------
   - Busca no topo (Ctrl+K ou /): telas que a pessoa pode abrir, obras da
     carteira e equipes do turno. Obras e equipes só aparecem nas telas que
     carregam os dados do painel (Início e Painel do dia).
   - A lista de telas vem do nav.js (fonte única) e do catálogo do login.
   - Lembra menu aberto/recolhido, liga o tema escuro, mostra o estado da
     sincronização e as iniciais de quem está logado.
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
  UI.sinc = function (estado, texto) {
    var el = document.getElementById('m-sinc');
    if (!el) return;
    el.setAttribute('data-estado', estado);
    var s = el.querySelector('span');
    if (s) s.textContent = texto;
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

  // ─── menu: lembra aberto/recolhido, véu no celular, nome nos ícones ─────
  function prepararMenu() {
    var celular = window.matchMedia('(max-width:780px)').matches;
    try { if (!celular && localStorage.getItem('mariua_menu') === 'recolhido') document.body.classList.add('sm-collapsed'); } catch (e) {}
    var veu = document.createElement('div');
    veu.className = 'm-veu';
    veu.addEventListener('click', function () { document.body.classList.remove('sm-expanded'); });
    document.body.appendChild(veu);
    function titulos() {
      document.querySelectorAll('.sm-item').forEach(function (a) {
        var t = a.querySelector('.sm-tx');
        if (t && !a.title) a.title = t.textContent;
      });
    }
    titulos();
    if (window.mariuaNav && typeof window.mariuaNav.render === 'function' && !window.mariuaNav.render.__m) {
      var r = window.mariuaNav.render;
      window.mariuaNav.render = function () { r.apply(this, arguments); titulos(); };
      window.mariuaNav.render.__m = true;
    }
    var t = window.smToggle;
    if (typeof t === 'function' && !t.__m) {
      window.smToggle = function () {
        t.apply(this, arguments);
        try {
          if (!window.matchMedia('(max-width:780px)').matches) {
            localStorage.setItem('mariua_menu', document.body.classList.contains('sm-collapsed') ? 'recolhido' : 'aberto');
          }
        } catch (e) {}
      };
      window.smToggle.__m = true;
    }
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') document.body.classList.remove('sm-expanded');
    });
  }

  // ─── tema escuro próprio (preferência do sistema todo) ──────────────────
  function aplicarTema() {
    try { document.body.classList.toggle('dark', localStorage.getItem('mariua_darkmode') === '1'); } catch (e) {}
  }

  // ─── avatar ─────────────────────────────────────────────────────────────
  function pintarAvatar() {
    var b = document.getElementById('user-avatar'), u = window.MARIUA_USER;
    if (!b || !u) return;
    var partes = String(u.nome || u.email || '?').replace(/@.*/, '').replace(/[._-]+/g, ' ').trim().split(/\s+/);
    var ini = (partes[0] || '?').charAt(0) + (partes.length > 1 ? partes[partes.length - 1].charAt(0) : '');
    b.textContent = ini.toUpperCase();
    b.setAttribute('aria-label', 'Minha conta: ' + (u.nome || u.email || ''));
  }

  // ─── busca global ───────────────────────────────────────────────────────
  function normaliza(s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
  function iniciarBusca() {
    var campo = document.getElementById('m-busca-campo'), caixa = document.getElementById('m-busca-res');
    if (!campo || !caixa) return;
    var opcoes = [], sel = -1;

    function resultados(q) {
      var qn = normaliza(q).trim(), grupos = [];
      var telas = UI.telas().filter(function (t) {
        return !qn || normaliza(t.texto + ' ' + t.desc + ' ' + t.chaves + ' ' + t.grupo).indexOf(qn) >= 0;
      }).slice(0, qn ? 6 : 8).map(function (t) {
        return { href: t.href, icone: t.icone, titulo: t.texto, sub: t.desc, meta: t.grupo };
      });
      if (telas.length) grupos.push({ nome: 'Telas', itens: telas });
      var dados = window.MariuaPainel && window.MariuaPainel.ultimo;
      if (dados && qn.length >= 2) {
        var obras = dados.busca.obras.filter(function (o) {
          return normaliza(o.pep + ' ' + o.titulo + ' ' + o.mun + ' ' + o.enc).indexOf(qn) >= 0;
        }).slice(0, 5).map(function (o) {
          return { href: 'mapa.html', icone: 'building', titulo: o.pep, sub: [o.titulo, o.mun].filter(Boolean).join(', '), meta: o.statusTxt || '' };
        });
        if (obras.length) grupos.push({ nome: 'Obras na carteira', itens: obras });
        var SIT = { ok: 'Abriu turno', justif: 'Falta justificada', falta: 'Não abriu' };
        var eqs = dados.busca.equipes.filter(function (e) {
          return normaliza(e.codigo + ' ' + e.enc + ' ' + e.sup).indexOf(qn) >= 0;
        }).slice(0, 5).map(function (e) {
          return { href: 'turno.html', icone: 'users', titulo: e.codigo,
                   sub: [e.enc ? 'Encarregado ' + window.MariuaPainel.util.nomeProprio(e.enc) : '', e.base ? e.base.nome : ''].filter(Boolean).join(', '),
                   meta: SIT[e.turno] || '' };
        });
        if (eqs.length) grupos.push({ nome: 'Equipes de hoje', itens: eqs });
      }
      return grupos;
    }

    function desenhar() {
      var grupos = resultados(campo.value);
      opcoes = [];
      var h = '';
      if (!grupos.length) {
        h = '<div class="m-res-vazio">Nada encontrado. Tente o PEP, o código da equipe ou o nome da tela.</div>';
      } else {
        grupos.forEach(function (g) {
          h += '<div class="m-res-grupo" role="presentation">' + UI.esc(g.nome) + '</div>';
          g.itens.forEach(function (it) {
            var i = opcoes.length;
            opcoes.push(it);
            h += '<a class="m-res-item" role="option" id="m-res-' + i + '" aria-selected="false" href="' + UI.esc(it.href) + '">' +
                 '<i class="ti ti-' + UI.esc(it.icone) + '" aria-hidden="true"></i>' +
                 '<span class="m-res-txt"><b>' + UI.esc(it.titulo) + '</b>' + (it.sub ? '<small>' + UI.esc(it.sub) + '</small>' : '') + '</span>' +
                 (it.meta ? '<span class="m-res-meta">' + UI.esc(it.meta) + '</span>' : '') + '</a>';
          });
        });
      }
      caixa.innerHTML = h;
      sel = opcoes.length ? 0 : -1;
      marcar();
      caixa.classList.add('aberto');
      campo.setAttribute('aria-expanded', 'true');
    }
    function marcar() {
      caixa.querySelectorAll('.m-res-item').forEach(function (a, i) { a.setAttribute('aria-selected', i === sel ? 'true' : 'false'); });
      if (sel >= 0) {
        campo.setAttribute('aria-activedescendant', 'm-res-' + sel);
        var el = document.getElementById('m-res-' + sel);
        if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
      } else campo.removeAttribute('aria-activedescendant');
    }
    function fechar() { caixa.classList.remove('aberto'); campo.setAttribute('aria-expanded', 'false'); }

    campo.addEventListener('input', desenhar);
    campo.addEventListener('focus', desenhar);
    campo.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); if (opcoes.length) { sel = (sel + 1) % opcoes.length; marcar(); } }
      else if (e.key === 'ArrowUp') { e.preventDefault(); if (opcoes.length) { sel = (sel - 1 + opcoes.length) % opcoes.length; marcar(); } }
      else if (e.key === 'Enter') { if (sel >= 0 && opcoes[sel]) { e.preventDefault(); location.href = opcoes[sel].href; } }
      else if (e.key === 'Escape') { fechar(); campo.blur(); }
    });
    document.addEventListener('click', function (e) { if (!e.target.closest || !e.target.closest('.m-busca')) fechar(); });
    document.addEventListener('keydown', function (e) {
      var alvo = document.activeElement, editando = alvo && /^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName);
      if ((e.ctrlKey || e.metaKey) && String(e.key).toLowerCase() === 'k') { e.preventDefault(); campo.focus(); campo.select(); }
      else if (e.key === '/' && !editando) { e.preventDefault(); campo.focus(); }
    });
  }

  // ─── início ─────────────────────────────────────────────────────────────
  function iniciar() {
    aplicarTema();
    prepararMenu();
    iniciarBusca();
    UI.esperarLogin().then(pintarAvatar);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
