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
        id: 'financeiro', icone: 'cash', texto: 'Financeiro',
        itens: [
          { href: 'valores.html', icone: 'file-invoice', texto: 'Valores' }
        ]
      },
      {
        id: 'gestao', icone: 'adjustments', texto: 'Gestão',
        itens: [
          { href: 'equipes.html',    icone: 'users',         texto: 'Cadastro de Equipes' },
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

  // ---- permissão: só entra no menu a tela que a pessoa pode abrir ----------
  // Quem decide é o mariua-auth.js. Enquanto o login não resolve (ou numa
  // página sem guarda, como admin.html), monta tudo: a página inteira está
  // escondida pela trava nesse meio-tempo, e a guarda manda redesenhar o menu
  // assim que sabe quem entrou.
  function podeItem(href) {
    if (!window.MARIUA_USER || typeof window.mariuaTemTela !== 'function') return true;
    var tela = (typeof window.mariuaTelaDeArquivo === 'function') ? window.mariuaTelaDeArquivo(href) : null;
    if (!tela) return true;   // tela fora do catálogo: não esconde o que não conhece
    return window.mariuaTemTela(tela);
  }

  function montarHtml() {
    var h = '<div class="sm-toggle"><button type="button" onclick="smToggle()" title="Recolher / expandir">↔</button></div>' +
            '<nav class="sm-nav">' + link(NAV.inicio, false);
    NAV.grupos.forEach(function (g) {
      var itens = g.itens.filter(function (i) { return podeItem(i.href); });
      if (!itens.length) return;   // módulo sem nenhuma tela liberada: nem aparece
      var temAtivo = itens.some(function (i) { return arquivoDe(i.href) === atual; });
      h += '<div class="sm-group' + (temAtivo ? ' open' : '') + '" data-group="' + g.id + '">' +
             '<div class="sm-group-head" onclick="smGroupToggle(this)">' +
               '<span class="sm-ic"><i class="ti ti-' + g.icone + '"></i></span>' +
               '<span class="sm-tx">' + esc(g.texto) + '</span>' +
               '<span class="sm-arrow">▸</span>' +
             '</div><div class="sm-group-items">' +
               itens.map(function (i) { return link(i, true); }).join('') +
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

/* ============================================================================
   TEMA ESCURO "PRETO TOTAL" — vale para todas as páginas
   ----------------------------------------------------------------------------
   A preferência é a mesma de sempre: localStorage 'mariua_darkmode' = '1'
   (ligada pela engrenagem do Turno). Este bloco faz duas coisas:

   1) CSS fixo do tema: fundo preto, barra do topo preta, menu lateral escuro,
      controles do mapa. Vale em todas as páginas.

   2) Conversão automática das cores da página: lê o CSS da própria página e os
      estilos escritos direto no HTML/JS, e troca cada cor clara pela
      equivalente escura (branco vira #111, cinza-claro vira cinza-escuro,
      texto escuro vira claro, tons pastel viram tons escuros da mesma cor).
      Cores fortes (botões verdes, etiquetas vermelhas...) ficam como estão.
      Conteúdo criado depois pelo JavaScript também é convertido.

   Para corrigir algum detalhe numa página, escreva a regra com body.dark no
   CSS dela (ex.: body.dark .meu-botao.active{background:#14a085}): regras
   assim valem por cima da conversão automática.

   Página que já tem o próprio CSS escuro completo (o Turno) avisa com
   <style id="dark-mode-css" data-tema="proprio"> e fica só com a parte 1.

   Para ligar/desligar por código: window.mariuaTema.definir(true | false).
   ========================================================================== */
(function () {
  'use strict';

  var CHAVE = 'mariua_darkmode';
  var doc = document, raiz = doc.documentElement;

  function preferenciaEscura() {
    try { return localStorage.getItem(CHAVE) === '1'; } catch (e) { return false; }
  }

  // ---- 1) CSS fixo ---------------------------------------------------------
  // Fica numa camada (@layer) própria e com !important: assim ganha tanto do
  // CSS original da página quanto das cores convertidas na parte 2.
  var CSS_BASE = [
    '@layer tema-base, tema-pag, tema-imp, tema-norm;',
    '@layer tema-base {',
    'html:has(body.dark){background:#000!important;color-scheme:dark}',
    'body.dark{',
    '  --e-fundo:#000000;--e-painel:#0a0a0a;--e-cartao:#111111;--e-sub:#0b0b0b;',
    '  --e-elev:#1a1a1a;--e-elev2:#252525;--e-linha:#222222;--e-linha2:#303030;',
    '  --e-texto:#f2f2f2;--e-texto2:#b8b8b8;--e-rotulo:#8c8c8c;--e-apagado:#5a5a5a;',
    '  --e-acento:#14a085;--e-acento-txt:#5eead4;',
    '  background:#000!important;color:#f2f2f2!important}',
    /* barra do topo */
    'body.dark .top-bar{background:#0a0a0a!important;box-shadow:0 2px 20px rgba(0,0,0,.5)!important}',
    /* menu lateral (montado acima pelo nav.js) */
    'body.dark .sm-side{background:#0a0a0a!important;border-right-color:#222!important;box-shadow:2px 0 12px rgba(0,0,0,.35)!important}',
    'body.dark .sm-toggle,body.dark .sm-top{border-bottom-color:#222!important}',
    'body.dark .sm-toggle button{background:#1a1a1a!important;border-color:#303030!important;color:#5eead4!important}',
    'body.dark .sm-toggle button:hover{background:#252525!important}',
    'body.dark .sm-item,body.dark .sm-group-head{color:#b8b8b8!important;background:transparent!important}',
    'body.dark .sm-ic{background:#1a1a1a!important;color:inherit!important}',
    'body.dark .sm-item:hover,body.dark .sm-group-head:hover{background:#1a1a1a!important;color:#f2f2f2!important}',
    'body.dark .sm-item:hover .sm-ic,body.dark .sm-group-head:hover .sm-ic{background:#252525!important}',
    'body.dark .sm-item.active,body.dark .sm-item.active:hover{background:linear-gradient(135deg,#0d7377,#14a085)!important;color:#fff!important;box-shadow:0 4px 12px rgba(0,0,0,.35)!important}',
    'body.dark .sm-item.active .sm-ic{background:rgba(255,255,255,.18)!important}',
    'body.dark .sm-arrow{color:#5a5a5a!important}',
    'body.dark .sm-group-items{border-left-color:#222!important}',
    'body.dark .sm-foot{border-top-color:#222!important;color:#5a5a5a!important}',
    /* campos sem cor definida pela página (sem !important: só vale se a página não pintar) */
    'body.dark :is(input,select,textarea):not([type=checkbox]):not([type=radio]):not([type=range]):not([type=color]){background-color:#111;color:#f2f2f2;border-color:#303030}',
    /* mapa (Leaflet): botões, popups e créditos; as imagens do mapa ficam como são */
    'body.dark .leaflet-container{background:#0a0a0a!important}',
    'body.dark .leaflet-bar a,body.dark .leaflet-control-layers{background:#111!important;color:#f2f2f2!important;border-color:#303030!important}',
    'body.dark .leaflet-bar a:hover{background:#1a1a1a!important}',
    'body.dark .leaflet-popup-content-wrapper,body.dark .leaflet-popup-tip{background:#111!important;color:#f2f2f2!important;box-shadow:0 3px 14px rgba(0,0,0,.6)!important}',
    'body.dark .leaflet-control-attribution{background:rgba(0,0,0,.65)!important;color:#8c8c8c!important}',
    'body.dark .leaflet-control-attribution a{color:#5eead4!important}',
    '}'
  ].join('\n');

  function garantirBase() {
    if (doc.getElementById('tema-base')) return;
    var s = doc.createElement('style');
    s.id = 'tema-base';
    s.textContent = CSS_BASE;
    (doc.head || raiz).appendChild(s);
  }

  // ---- 2) conversão automática de cores -------------------------------------
  var cv = null;
  try { cv = doc.createElement('canvas').getContext('2d'); } catch (e) {}
  var cache = {};

  function lerCor(txt) {
    if (!txt) return null;
    if (cache.hasOwnProperty(txt)) return cache[txt];
    var t = String(txt).trim().toLowerCase(), r = null;
    if (cv && t && !/^(transparent|none|inherit|initial|unset|revert|currentcolor)$/.test(t) &&
        t.indexOf('var(') < 0 && t.indexOf('gradient') < 0 && t.indexOf('url(') < 0) {
      cv.fillStyle = '#000'; cv.fillStyle = t; var a = cv.fillStyle;
      cv.fillStyle = '#fff'; cv.fillStyle = t; var b = cv.fillStyle;
      if (a === b) r = rgbDe(a);          // cor válida: o canvas aceitou nas duas vezes
    }
    cache[txt] = r;
    return r;
  }
  function rgbDe(v) {
    if (v.charAt(0) === '#') return [parseInt(v.substr(1, 2), 16), parseInt(v.substr(3, 2), 16), parseInt(v.substr(5, 2), 16), 1];
    var m = v.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    var p = m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat);
    return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
  }
  function hsl(c) {
    var r = c[0] / 255, g = c[1] / 255, b = c[2] / 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn, h = 0, s = 0;
    if (d) {
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h *= 60;
    }
    // neutro = cinza. Nos tons bem claros vale a saturação (#f0fff4 é verde-claro,
    // #f0f4f5 é cinza); nos demais, a diferença entre os canais.
    var neutro = l > 0.85 ? (d * 255 < 6 || s < 0.5) : (d * 255 < 18 || s < 0.12);
    return { h: h, s: s, l: l, a: c[3], neutro: neutro };
  }
  function cinza(l, a) {
    var v = Math.round(Math.max(0, Math.min(1, l)) * 255);
    return a < 1 ? 'rgba(' + v + ',' + v + ',' + v + ',' + a + ')' : 'rgb(' + v + ',' + v + ',' + v + ')';
  }
  function tom(h, s, l, a) {
    return 'hsla(' + h.toFixed(1) + ',' + (s * 100).toFixed(1) + '%,' + (l * 100).toFixed(1) + '%,' + a + ')';
  }

  // fundo: branco -> #111 (cartão); quase-branco -> #0a0a0a (fundo de página);
  // cinza-claro -> cinza-escuro (botões, chips); pastel -> tom escuro da mesma cor
  function mapFundo(txt, ehRaiz) {
    var c = lerCor(txt); if (!c || c[3] === 0) return null;
    var k = hsl(c);
    if (k.a < 0.5) return null;                           // véu translúcido: mantém
    if (k.l < 0.3) {                                      // já é escuro
      // azul-acinzentado escuro (barras #1a2a3a etc.) vira cinza, no espírito do preto total;
      // cores escuras fortes (verde da marca, roxo...) ficam
      return (!k.neutro && k.s < 0.45) ? cinza(k.l * 0.6, k.a) : null;
    }
    if (ehRaiz && k.l > 0.5) return cinza(0, k.a);
    if (k.neutro) {
      var L = k.l >= 0.985 ? 0.067 : k.l >= 0.93 ? 0.04 : k.l >= 0.8 ? 0.10 + (0.93 - k.l) * 0.5 : 0.165 + (0.8 - k.l) * 0.3;
      return cinza(L, k.a);
    }
    if (k.l >= 0.85) return tom(k.h, Math.min(k.s, 0.55), 0.09 + (1 - k.l) * 0.35, k.a);
    return null;                                          // cor de destaque: mantém
  }
  // fundo que continua claro (amarelo, verde-claro...): o texto dele não é invertido
  function fundoClaroMantido(txt) {
    var c = lerCor(txt); if (!c || c[3] < 0.5) return false;
    return hsl(c).l >= 0.5 && mapFundo(txt) === null;
  }
  function mapTexto(txt) {
    var c = lerCor(txt); if (!c) return null;
    var k = hsl(c);
    if (k.l > 0.62) return null;                          // já é claro
    // texto cinza ou azul-acinzentado (#1a2a3a, #4a5568...) vira cinza-claro; texto colorido vira a mesma cor, clara
    if (k.neutro || k.s < 0.4) return cinza(0.95 - k.l * 0.55, k.a);
    return tom(k.h, Math.min(k.s, 0.7), Math.min(0.8, 0.62 + (0.6 - k.l) * 0.35), k.a);
  }
  function mapBorda(txt) {
    var c = lerCor(txt); if (!c || c[3] < 0.5) return null;
    var k = hsl(c);
    if (k.l < 0.55) return null;
    if (k.neutro) return cinza(k.l >= 0.7 ? 0.13 + (1 - k.l) * 0.35 : 0.24, k.a);
    if (k.l >= 0.8) return tom(k.h, Math.min(k.s, 0.45), 0.22, k.a);
    return null;
  }
  function mapImagem(txt) {
    if (!txt || txt.indexOf('gradient') < 0) return null;
    var mudou = false;
    var out = txt.replace(/#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)|\bwhite\b/gi, function (m) {
      var n = mapFundo(m); if (n) { mudou = true; return n; } return m;
    });
    return mudou ? out : null;
  }
  // variáveis CSS (--bg, --text, --line...): o nome diz o papel da cor
  function mapVar(nome, valor) {
    var c = lerCor(valor); if (!c) return null;
    var n = nome.toLowerCase();
    if (/bg|fundo|surface|wash|card|back/.test(n)) return mapFundo(valor);
    if (/line|linha|border|borda/.test(n)) return mapBorda(valor);
    if (/ink|text|txt|texto|muted|sub|fg/.test(n)) return mapTexto(valor);
    var k = hsl(c);
    if (k.neutro && k.l > 0.8) return mapFundo(valor);
    if (k.neutro && k.l < 0.4) return mapTexto(valor);
    return null;
  }

  var EH_COR = /^(color|background-color|background-image|border-(top|right|bottom|left)-color|outline-color)$/;

  // devolve [[propriedade, valorNovo], ...] para todas as propriedades de cor da
  // declaração (convertidas ou não: as não convertidas também precisam ir junto
  // para o CSS gerado manter a mesma ordem de prioridade da página)
  function converterDecl(st, ehRaiz) {
    var out = [];
    var textoLivre = !fundoClaroMantido(st.getPropertyValue('background-color'));
    for (var i = 0; i < st.length; i++) {
      var p = st[i], v = st.getPropertyValue(p), n = null, ehVar = p.charAt(0) === '-' && p.charAt(1) === '-';
      if (ehVar) { if (!lerCor(v)) continue; n = mapVar(p, v); }
      else if (!EH_COR.test(p)) continue;
      else if (p === 'background-color') n = mapFundo(v, ehRaiz);
      else if (p === 'background-image') n = mapImagem(v);
      else if (p === 'color') n = textoLivre ? mapTexto(v) : null;
      else n = mapBorda(v);
      out.push([p, n || v, st.getPropertyPriority(p) === 'important', !!n]);
    }
    return out;
  }

  // ---- 2a) CSS da página -> CSS escuro gerado --------------------------------
  var folha = null, modoAuto = false, ativo = false;
  var RAIZ_SEL = /^(html|body|:root)([.#:][\w-]+)*$/i;

  function percorrer(regras, norm, imp, pag) {
    for (var i = 0; i < regras.length; i++) {
      var r = regras[i];
      if (r.type === 1) {                                   // regra comum
        var sel = r.selectorText || '';
        if (/\.sm-|tema-escuro/.test(sel)) continue;        // menu lateral: CSS fixo acima
        if (/\.dark\b/.test(sel)) {                         // ajuste escuro escrito na própria página:
          var t = '';                                        // vale por cima da conversão automática
          for (var q = 0; q < r.style.length; q++) t += r.style[q] + ':' + r.style.getPropertyValue(r.style[q]) + '!important;';
          if (t) pag.push(sel + '{' + t + '}');
          continue;
        }
        var ehRaiz = sel.split(',').some(function (x) { return RAIZ_SEL.test(x.trim()); });
        var d = converterDecl(r.style, ehRaiz);
        if (!d.length) continue;
        var n = '', m = '';
        d.forEach(function (x) { var t = x[0] + ':' + x[1] + '!important;'; if (x[2]) m += t; else n += t; });
        if (n) norm.push(sel + '{' + n + '}');
        if (m) imp.push(sel + '{' + m + '}');
      } else if (r.type === 4 || r.type === 12) {           // @media / @supports
        var n2 = [], m2 = [], p2 = [];
        percorrer(r.cssRules, n2, m2, p2);
        var cab = r.type === 4 ? '@media ' + r.media.mediaText : '@supports ' + r.conditionText;
        if (n2.length) norm.push(cab + '{' + n2.join('\n') + '}');
        if (m2.length) imp.push(cab + '{' + m2.join('\n') + '}');
        if (p2.length) pag.push(cab + '{' + p2.join('\n') + '}');
      }
    }
  }

  function construirFolha() {
    var norm = [], imp = [], pag = [];
    for (var i = 0; i < doc.styleSheets.length; i++) {
      var sh = doc.styleSheets[i], dono = sh.ownerNode;
      if (dono && (dono.id === 'tema-base' || dono.id === 'tema-auto')) continue;
      var regras;
      try { regras = sh.cssRules; } catch (e) { continue; }   // CSS de outro site (ícones, Leaflet)
      if (regras) percorrer(regras, norm, imp, pag);
    }
    if (!folha) { folha = doc.createElement('style'); folha.id = 'tema-auto'; }
    folha.textContent = '@layer tema-pag{\n' + pag.join('\n') + '\n}\n@layer tema-imp{\n' + imp.join('\n') + '\n}\n@layer tema-norm{\n' + norm.join('\n') + '\n}';
    folha.media = 'all';
    if (folha.parentNode !== doc.body || folha.nextElementSibling) doc.body.appendChild(folha);
  }

  // ---- 2b) estilos escritos direto no elemento (style="...") -----------------
  // As cores do elemento são regravadas com !important (convertidas ou não),
  // para continuarem valendo por cima do CSS gerado, como no tema claro.
  var PROPS_EL = ['background-color', 'background-image', 'color', 'border-top-color',
                  'border-right-color', 'border-bottom-color', 'border-left-color', 'outline-color'];

  function procEl(el) {
    var st = el.style;
    if (!st || !st.length) return;
    var reg = el.__temaOrig || null, mexeu = false;
    var nomes = PROPS_EL.slice();
    for (var i = 0; i < st.length; i++) if (st[i].charAt(0) === '-' && st[i].charAt(1) === '-') nomes.push(st[i]);

    // valor original (o da página) de cada propriedade
    function original(p) {
      var v = st.getPropertyValue(p), pri = st.getPropertyPriority(p);
      if (reg && reg[p] && reg[p].aplicado === v && pri === 'important') return reg[p];
      return v ? { valor: v, pri: pri } : null;
    }
    var bg = original('background-color');
    var textoLivre = !(bg && fundoClaroMantido(bg.valor));

    nomes.forEach(function (p) {
      var o = original(p);
      if (!o) { if (reg && reg[p]) delete reg[p]; return; }
      var n = null, ehVar = p.charAt(0) === '-';
      if (ehVar) { if (!lerCor(o.valor)) return; n = mapVar(p, o.valor); }
      else if (p === 'background-color') n = mapFundo(o.valor);
      else if (p === 'background-image') n = mapImagem(o.valor);
      else if (p === 'color') n = textoLivre ? mapTexto(o.valor) : null;
      else n = mapBorda(o.valor);
      var alvo = n || o.valor;
      if (st.getPropertyValue(p) !== alvo || st.getPropertyPriority(p) !== 'important') st.setProperty(p, alvo, 'important');
      reg = reg || (el.__temaOrig = {});
      reg[p] = { valor: o.valor, pri: o.pri, aplicado: st.getPropertyValue(p) };
      mexeu = true;
    });
    if (mexeu && !el.hasAttribute('data-tema-esc')) el.setAttribute('data-tema-esc', '');
  }

  function varrer(no) {
    if (no.nodeType !== 1) return;
    if (no.hasAttribute && no.hasAttribute('style')) procEl(no);
    var l = no.querySelectorAll ? no.querySelectorAll('[style]') : [];
    for (var i = 0; i < l.length; i++) procEl(l[i]);
  }

  function restaurarTudo() {
    var l = doc.querySelectorAll('[data-tema-esc]');
    for (var i = 0; i < l.length; i++) {
      var el = l[i], reg = el.__temaOrig;
      if (reg) Object.keys(reg).forEach(function (p) { el.style.setProperty(p, reg[p].valor, reg[p].pri); });
      el.__temaOrig = null;
      el.removeAttribute('data-tema-esc');
    }
  }

  // ---- acompanhamento do que a página muda depois ---------------------------
  var obs = null, refazerFolha = false, agendado = false;
  function observar() {
    if (obs || !window.MutationObserver) return;
    obs = new MutationObserver(function (muts) {
      if (!ativo || !modoAuto) return;
      for (var i = 0; i < muts.length; i++) {
        var m = muts[i];
        if (m.type === 'attributes') { procEl(m.target); continue; }
        if (m.type === 'characterData') { if (m.target.parentNode && m.target.parentNode.tagName === 'STYLE') refazerFolha = true; continue; }
        for (var j = 0; j < m.addedNodes.length; j++) {
          var n = m.addedNodes[j];
          if (n.nodeType === 3 && m.target.tagName === 'STYLE') { refazerFolha = true; continue; }
          if (n.nodeType !== 1 || n.id === 'tema-auto' || n.id === 'tema-base') continue;
          if (n.tagName === 'STYLE' || (n.tagName === 'LINK' && /stylesheet/i.test(n.rel))) { refazerFolha = true; continue; }
          if (n.querySelector && n.querySelector('style')) refazerFolha = true;
          varrer(n);
        }
      }
      if (refazerFolha && !agendado) {
        agendado = true;
        setTimeout(function () { agendado = false; refazerFolha = false; if (ativo && modoAuto) construirFolha(); obs.takeRecords(); }, 0);
      }
      obs.takeRecords();   // descarta as mudanças que este próprio código acabou de fazer
    });
    obs.observe(raiz, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['style'] });
  }

  // gráficos (Chart.js), se a página usar: texto e grade em cinza
  var graficosMexidos = false;
  function ajustarGraficos(escuro) {
    var C = window.Chart; if (!C || !C.defaults || (!escuro && !graficosMexidos)) return;
    graficosMexidos = true;
    try {
      if (C.defaults.global) { C.defaults.global.defaultFontColor = escuro ? '#b8b8b8' : '#666'; }
      else { C.defaults.color = escuro ? '#b8b8b8' : '#666'; C.defaults.borderColor = escuro ? '#262626' : 'rgba(0,0,0,0.1)'; }
    } catch (e) {}
  }

  function definir(escuro) {
    ativo = !!escuro;
    garantirBase();
    if (doc.body) doc.body.classList.toggle('dark', ativo);
    if (modoAuto && doc.body) {
      if (ativo) { construirFolha(); varrer(doc.body); observar(); }
      else { if (folha) folha.media = 'not all'; restaurarTudo(); }
      if (obs) obs.takeRecords();
    }
    ajustarGraficos(ativo);
    raiz.classList.remove('tema-escuro-carregando');
  }

  function iniciar() {
    var proprio = doc.querySelector('style[data-tema="proprio"]');
    modoAuto = !proprio;
    if (!proprio) definir(preferenciaEscura());   // na página com tema próprio, quem liga é ela
    else { garantirBase(); raiz.classList.remove('tema-escuro-carregando'); }
  }

  iniciar();
  // ao terminar de carregar: passa de novo, para pegar o que veio depois desta tag
  doc.addEventListener('DOMContentLoaded', function () {
    if (modoAuto && ativo) { construirFolha(); varrer(doc.body); if (obs) obs.takeRecords(); }
  });
  // trocou em outra aba (ex.: na engrenagem do Turno): acompanha aqui também
  window.addEventListener('storage', function (e) {
    if (e.key === CHAVE && modoAuto) definir(e.newValue === '1');
  });

  window.mariuaTema = {
    escuro: function () { return ativo; },
    definir: function (b) {
      try { localStorage.setItem(CHAVE, b ? '1' : '0'); } catch (e) {}
      if (modoAuto) definir(b); else if (doc.body) doc.body.classList.toggle('dark', !!b);
    }
  };
})();
