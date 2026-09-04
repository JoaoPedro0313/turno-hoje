/* ============================================================================
   nav.js — NAVEGAÇÃO ÚNICA DO SISTEMA MARIUÁ
   ----------------------------------------------------------------------------
   Esta é a ÚNICA lista de telas do sistema. Para adicionar uma tela nova,
   acrescente uma linha em NAV abaixo e pronto: ela aparece no menu lateral de
   todas as páginas automaticamente. Não é mais preciso editar página por página.

   - href .......... caminho a partir da RAIZ do site (ex.: 'obras/neoex.html').
                     O prefixo '../' das páginas dentro de /obras é calculado
                     sozinho, não escreva ele aqui.
   - icone ......... nome do ícone Tabler (https://tabler.io/icons), sem o 'ti-'.
   - texto ......... rótulo exibido.

   A marcação de página ativa também é automática, feita pela URL.
   ========================================================================== */
(function () {
  'use strict';

  var NAV = {
    inicio: { href: 'index.html', icone: 'home', texto: 'Início' },
    grupos: [
      {
        id: 'obras', icone: 'briefcase', texto: 'Obras',
        itens: [
          { href: 'turno.html',               icone: 'clipboard-list',   texto: 'Turno' },
          { href: 'rdo.html',                 icone: 'file-description', texto: 'RDO' },
          { href: 'mapa.html',                icone: 'map-2',            texto: 'Mapa' },
          { href: 'prog.html',                icone: 'calendar-event',   texto: 'Prog. Diária' },
          { href: 'comp.html',                icone: 'git-compare',      texto: 'Comparador' },
          { href: 'estagios.html',            icone: 'layout-kanban',    texto: 'Estágios' },
          { href: 'obras/neoex.html',         icone: 'box',              texto: 'NEOEX' },
          { href: 'obras/cadastro_obra.html', icone: 'building',         texto: 'Cadastro de Obra' }
        ]
      },
      {
        id: 'sesmt', icone: 'shield-check', texto: 'SESMT',
        itens: [
          { href: 'ensaios.html',            icone: 'test-pipe',   texto: 'Ensaios' },
          { href: 'vencimento_cursos.html',  icone: 'certificate', texto: 'Vencimento Cursos' },
          { href: 'brigada.html',            icone: 'flame',       texto: 'Brigada' }
        ]
      },
      {
        id: 'financeiro', icone: 'cash', texto: 'Financeiro',
        itens: [
          { href: 'valores.html', icone: 'file-invoice', texto: 'Valores' }
        ]
      },
      {
        id: 'gestao', icone: 'adjustments', texto: 'Gestão',
        itens: [
          { href: 'permissoes.html', icone: 'lock',          texto: 'Telas x Usuários' },
          { href: 'projeçao.html',   icone: 'device-mobile', texto: 'PDA' },
          { href: 'admin.html',      icone: 'settings',      texto: 'Admin' }
        ]
      }
    ]
  };

  // ---- caminho relativo: páginas dentro de /obras precisam de '../' ----------
  var pre = /(^|\/)obras\//i.test(location.pathname) ? '../' : '';

  // ---- arquivo da página atual, para marcar o item ativo ---------------------
  // normaliza acentos (NFC): o navegador pode entregar a URL em forma decomposta
  function normaliza(txt) {
    var t = txt;
    try { t = decodeURIComponent(t); } catch (e) {}
    try { if (t.normalize) t = t.normalize('NFC'); } catch (e) {}
    return t.toLowerCase();
  }
  var atual = normaliza(location.pathname.split('/').pop() || '');
  if (!atual) atual = 'index.html';

  function arquivoDe(href) { return normaliza(href.split('/').pop()); }
  function esc(t) {
    return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  // dentro de /obras, 'obras/neoex.html' vira 'neoex.html' em vez de '../obras/neoex.html'
  function caminho(href) {
    if (pre && href.slice(0, 6).toLowerCase() === 'obras/') return href.slice(6);
    return pre + href;
  }
  function link(item, sub) {
    var ativo = arquivoDe(item.href) === atual;
    return '<a class="sm-item' + (sub ? ' sm-sub' : '') + (ativo ? ' active' : '') + '"' +
           ' href="' + caminho(item.href) + '">' +
           '<span class="sm-ic"><i class="ti ti-' + item.icone + '"></i></span>' +
           '<span class="sm-tx">' + esc(item.texto) + '</span></a>';
  }

  function montarHtml() {
    var h = '<div class="sm-toggle"><button type="button" onclick="smToggle()" title="Recolher / expandir">↔</button></div>' +
            '<nav class="sm-nav">' + link(NAV.inicio, false);
    NAV.grupos.forEach(function (g) {
      var temAtivo = g.itens.some(function (i) { return arquivoDe(i.href) === atual; });
      h += '<div class="sm-group' + (temAtivo ? ' open' : '') + '" data-group="' + g.id + '">' +
             '<div class="sm-group-head" onclick="smGroupToggle(this)">' +
               '<span class="sm-ic"><i class="ti ti-' + g.icone + '"></i></span>' +
               '<span class="sm-tx">' + esc(g.texto) + '</span>' +
               '<span class="sm-arrow">▸</span>' +
             '</div><div class="sm-group-items">' +
               g.itens.map(function (i) { return link(i, true); }).join('') +
             '</div></div>';
    });
    return h + '</nav><div class="sm-foot">Mariuá · Sistema de Obras</div>';
  }

  // ---- funções de abrir/recolher -------------------------------------------
  // Definidas só se a página ainda não tiver a sua própria versão: turno.html e
  // mapa.html, por exemplo, precisam redimensionar o mapa ao recolher o menu.
  if (typeof window.smToggle !== 'function') {
    window.smToggle = function () {
      if (window.matchMedia('(max-width:780px)').matches) document.body.classList.toggle('sm-expanded');
      else document.body.classList.toggle('sm-collapsed');
      setTimeout(function () {
        try { if (window.mapaMap && window.mapaMap.invalidateSize) window.mapaMap.invalidateSize(); } catch (e) {}
        try { if (window.progMapaMap && window.progMapaMap.invalidateSize) window.progMapaMap.invalidateSize(); } catch (e) {}
      }, 250);
    };
  }
  if (typeof window.smGroupToggle !== 'function') {
    window.smGroupToggle = function (head) {
      var g = head.parentNode; if (g) g.classList.toggle('open');
    };
  }

  function render() {
    var aside = document.querySelector('aside.sm-side');
    if (!aside) return;
    aside.innerHTML = montarHtml();
    aside.querySelectorAll('.sm-item').forEach(function (a) {
      a.addEventListener('click', function () { document.body.classList.remove('sm-expanded'); });
    });
    // a barra superior antiga foi descontinuada; remove se sobrou em alguma página
    document.querySelectorAll('nav.page-nav').forEach(function (n) { n.remove(); });
  }

  // monta na hora (a <aside> vem antes desta tag <script>) e repete no
  // DOMContentLoaded como rede de segurança. render() é idempotente.
  render();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);

  window.mariuaNav = { itens: NAV, render: render };
})();
