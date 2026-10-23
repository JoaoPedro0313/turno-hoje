/* ============================================================================
   agente.js — AGENTE DE NORMAS (chat flutuante)
   ----------------------------------------------------------------------------
   Carregado pelo nav.js em todas as telas. Aparece só depois do login
   (usa o window.MARIUA_SB criado pelo mariua-auth.js) e conversa com a
   Edge Function "agente-normas" do Supabase.

   A conversa fica guardada só nesta aba (sessionStorage): troca de tela e
   continua; fecha a aba e começa do zero.
   ========================================================================== */
(function () {
  'use strict';
  if (window.__agenteNormas) return;
  window.__agenteNormas = true;

  var FUNCAO = 'agente-normas';
  var CHAVE = 'mariua_agente_conversa';
  var EXEMPLOS = [
    'Qual o vão máximo da rede multiplexada em área rural?',
    'Que cabo usar no primeiro vão de um trafo de 75 kVA em 220/127 V?',
    'Qual o prazo para reenviar um projeto reprovado na análise?'
  ];

  var sb, conversa = [], ocupado = false;
  var el = {};

  // ---------------------------------------------------------------- estilos
  var css = [
    '.agn-botao{position:fixed;right:18px;bottom:18px;z-index:1150;width:54px;height:54px;border:none;border-radius:50%;',
    'background:#0d7377;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;',
    'box-shadow:0 6px 18px rgba(13,115,119,.35);transition:transform .15s,background .15s}',
    '.agn-botao:hover{background:#0a5f62;transform:translateY(-1px)}',
    '.agn-botao:focus-visible,.agn-painel button:focus-visible,.agn-painel textarea:focus-visible,.agn-painel a:focus-visible{outline:3px solid #ff6b35;outline-offset:2px}',
    '.agn-botao svg{width:26px;height:26px}',
    '.agn-botao[aria-expanded="true"]{background:#3d4a4f}',

    '.agn-painel{position:fixed;right:18px;bottom:84px;z-index:1200;width:400px;max-width:calc(100vw - 24px);',
    'height:min(600px,calc(100vh - 120px));display:none;flex-direction:column;background:#fff;color:#1f2a2e;',
    "border-radius:14px;overflow:hidden;box-shadow:0 18px 50px rgba(15,35,40,.28);font-family:'Barlow',system-ui,sans-serif}",
    '.agn-painel.aberto{display:flex;animation:agn-entra .16s ease-out}',
    '@keyframes agn-entra{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}',
    '@media (prefers-reduced-motion:reduce){.agn-painel.aberto{animation:none}.agn-botao{transition:none}}',

    '.agn-topo{background:#0d7377;color:#fff;padding:12px 12px 11px 16px;border-bottom:3px solid #ff6b35;display:flex;align-items:center;gap:10px}',
    '.agn-topo h2{margin:0;font-size:1.02rem;font-weight:800;letter-spacing:.2px;line-height:1.15}',
    '.agn-topo p{margin:2px 0 0;font-size:.74rem;font-weight:600;opacity:.85}',
    '.agn-topo .agn-tit{flex:1;min-width:0}',
    '.agn-ico{background:transparent;border:none;color:#fff;cursor:pointer;border-radius:8px;padding:6px;display:flex;opacity:.9}',
    '.agn-ico:hover{background:rgba(255,255,255,.14);opacity:1}',
    '.agn-ico svg{width:19px;height:19px}',

    '.agn-lista{flex:1;overflow-y:auto;padding:14px 14px 6px;background:#f4f7f8;scroll-behavior:smooth}',
    '.agn-vazio{padding:6px 4px}',
    '.agn-vazio p{margin:0 0 12px;font-size:.88rem;line-height:1.45;color:#3d4a4f}',
    '.agn-ex{display:block;width:100%;text-align:left;margin:0 0 8px;padding:10px 12px;border:1.5px solid #c0e8e5;border-radius:10px;',
    "background:#fff;color:#0d5c5f;font-family:inherit;font-size:.84rem;font-weight:700;line-height:1.3;cursor:pointer}",
    '.agn-ex:hover{border-color:#14a085;background:#effaf8}',

    '.agn-msg{margin:0 0 12px;display:flex}',
    '.agn-msg.eu{justify-content:flex-end}',
    '.agn-bolha{max-width:88%;padding:10px 12px;border-radius:12px;font-size:.88rem;line-height:1.5;overflow-wrap:anywhere}',
    '.agn-msg.eu .agn-bolha{background:#0d7377;color:#fff;border-bottom-right-radius:4px;white-space:pre-wrap}',
    '.agn-msg.ag .agn-bolha{background:#fff;border:1px solid #dfe7ea;border-bottom-left-radius:4px}',
    '.agn-bolha p{margin:0 0 8px}.agn-bolha p:last-child{margin-bottom:0}',
    '.agn-bolha ul,.agn-bolha ol{margin:0 0 8px;padding-left:20px}.agn-bolha li{margin:2px 0}',
    '.agn-bolha strong{font-weight:800}',
    '.agn-cita{display:inline-flex;align-items:baseline;gap:4px;margin:0 2px;padding:0 6px;border:1px solid #9fd3cf;border-radius:5px;',
    'background:#effaf8;color:#0d5c5f;font-size:.76rem;font-weight:800;text-decoration:none;white-space:nowrap;vertical-align:1px}',
    'a.agn-cita:hover{background:#d8f1ee;border-color:#14a085}',
    '.agn-cita span{font-weight:600}',
    '.agn-aval{display:flex;align-items:center;gap:4px;margin-top:8px;padding-top:7px;border-top:1px dashed #e2e8ea;font-size:.74rem;color:#6b7a80;font-weight:600}',
    '.agn-aval button{border:1px solid transparent;background:transparent;border-radius:6px;padding:2px 6px;cursor:pointer;font-size:.9rem;line-height:1;opacity:.6}',
    '.agn-aval button:hover{opacity:1;border-color:#dfe7ea}',
    '.agn-aval button[aria-pressed="true"]{opacity:1;background:#effaf8;border-color:#9fd3cf}',
    '.agn-erro{background:#fff4f1!important;border-color:#f3c3b4!important;color:#9a3412}',
    '.agn-pensando{display:inline-flex;gap:8px;align-items:center;color:#5b6b70;font-weight:600}',
    '.agn-pontos{display:inline-flex;gap:3px}.agn-pontos i{width:5px;height:5px;border-radius:50%;background:#14a085;animation:agn-p 1s infinite}',
    '.agn-pontos i:nth-child(2){animation-delay:.15s}.agn-pontos i:nth-child(3){animation-delay:.3s}',
    '@keyframes agn-p{0%,80%,100%{opacity:.25}40%{opacity:1}}',
    '@media (prefers-reduced-motion:reduce){.agn-pontos i{animation:none;opacity:.7}}',

    '.agn-rodape{border-top:1px solid #e2e8ea;padding:10px 12px 8px;background:#fff}',
    '.agn-entrada{display:flex;gap:8px;align-items:flex-end}',
    '.agn-entrada textarea{flex:1;resize:none;max-height:120px;min-height:42px;padding:10px 12px;border:1.5px solid #c9d6da;border-radius:10px;',
    'font-family:inherit;font-size:.9rem;line-height:1.35;color:inherit;background:#fff;outline:none}',
    '.agn-entrada textarea:focus{border-color:#14a085}',
    '.agn-enviar{flex:none;height:42px;padding:0 14px;border:none;border-radius:10px;background:#0d7377;color:#fff;font-family:inherit;',
    'font-weight:800;font-size:.86rem;cursor:pointer}',
    '.agn-enviar:disabled{background:#9db3b8;cursor:default}',
    '.agn-aviso{margin:6px 2px 0;font-size:.7rem;color:#6b7a80;line-height:1.3}',

    '@media (max-width:640px){.agn-painel{right:0;left:0;bottom:0;width:auto;max-width:none;height:88vh;border-radius:16px 16px 0 0}',
    '.agn-botao{right:14px;bottom:14px}}',

    'body.dark .agn-painel{background:#151a1c!important;color:#e6eef0!important}',
    'body.dark .agn-lista{background:#0d1112!important}',
    'body.dark .agn-msg.ag .agn-bolha{background:#1b2225!important;border-color:#2a3438!important;color:#e6eef0!important}',
    'body.dark .agn-vazio p{color:#b9c7cb!important}',
    'body.dark .agn-ex{background:#1b2225!important;border-color:#25504e!important;color:#9fe0d8!important}',
    'body.dark .agn-cita{background:#12302e!important;border-color:#2a6b66!important;color:#9fe0d8!important}',
    'body.dark .agn-aval{border-top-color:#2a3438!important;color:#8fa1a6!important}',
    'body.dark .agn-rodape{background:#151a1c!important;border-top-color:#2a3438!important}',
    'body.dark .agn-entrada textarea{background:#0d1112!important;border-color:#33424a!important;color:#e6eef0!important}',
    'body.dark .agn-erro{background:#2b1712!important;border-color:#6b2e1e!important;color:#ffb59e!important}',
    'body.dark .agn-aviso{color:#8fa1a6!important}'
  ].join('');

  var ICONE_LIVRO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 19a9 9 0 0 1 9 0a9 9 0 0 1 9 0"/><path d="M3 6a9 9 0 0 1 9 0a9 9 0 0 1 9 0"/><path d="M3 6v13"/><path d="M12 6v13"/><path d="M21 6v13"/></svg>';
  var ICONE_FECHAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>';
  var ICONE_NOVA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1l1-4z"/></svg>';

  // ---------------------------------------------------------------- utilidades
  function esc(t) {
    return String(t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function salvar() {
    try { sessionStorage.setItem(CHAVE, JSON.stringify(conversa.slice(-30))); } catch (e) {}
  }
  function carregar() {
    try { conversa = JSON.parse(sessionStorage.getItem(CHAVE) || '[]') || []; } catch (e) { conversa = []; }
  }

  // Markdown leve: parágrafos, listas, negrito e as citações [DIS-NOR-014, pág. 7].
  function formatar(texto, fontes) {
    var links = {};
    (fontes || []).forEach(function (f) { if (f.url) links[f.codigo + '#' + f.pagina] = f.url; });
    function inline(s) {
      s = esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      return s.replace(/\[([A-Z]{2,5}(?:-[A-Z0-9]{2,12}){1,3}),\s*p[áa]g\.?\s*(\d+)\]/g, function (_, cod, pag) {
        var url = links[cod + '#' + pag];
        var miolo = cod + ' <span>pág. ' + pag + '</span>';
        return url
          ? '<a class="agn-cita" href="' + esc(url) + '" target="_blank" rel="noopener" title="Abrir o documento nesta página">' + miolo + '</a>'
          : '<span class="agn-cita" title="PDF não disponível no sistema">' + miolo + '</span>';
      });
    }
    var html = '', lista = null;
    String(texto).split(/\n/).forEach(function (linha) {
      var l = linha.trim();
      var mUl = /^[-*•]\s+(.*)$/.exec(l), mOl = /^\d+[.)]\s+(.*)$/.exec(l);
      if (mUl || mOl) {
        var tipo = mUl ? 'ul' : 'ol';
        if (lista !== tipo) { if (lista) html += '</' + lista + '>'; html += '<' + tipo + '>'; lista = tipo; }
        html += '<li>' + inline((mUl || mOl)[1]) + '</li>';
        return;
      }
      if (lista) { html += '</' + lista + '>'; lista = null; }
      if (!l) return;
      l = l.replace(/^#{1,4}\s+(.*)$/, '**$1**');
      html += '<p>' + inline(l) + '</p>';
    });
    if (lista) html += '</' + lista + '>';
    return html;
  }

  // ---------------------------------------------------------------- tela
  function montar() {
    var st = document.createElement('style');
    st.textContent = css;
    document.head.appendChild(st);

    el.botao = document.createElement('button');
    el.botao.className = 'agn-botao';
    el.botao.type = 'button';
    el.botao.setAttribute('aria-label', 'Perguntar sobre as normas técnicas');
    el.botao.setAttribute('aria-expanded', 'false');
    el.botao.setAttribute('aria-controls', 'agn-painel');
    el.botao.title = 'Normas técnicas';
    el.botao.innerHTML = ICONE_LIVRO;

    el.painel = document.createElement('section');
    el.painel.className = 'agn-painel';
    el.painel.id = 'agn-painel';
    el.painel.setAttribute('role', 'dialog');
    el.painel.setAttribute('aria-label', 'Normas técnicas');
    el.painel.innerHTML =
      '<header class="agn-topo">' +
        '<div class="agn-tit"><h2>Normas técnicas</h2><p>Respostas a partir das normas Neoenergia</p></div>' +
        '<button type="button" class="agn-ico" data-acao="nova" title="Nova conversa" aria-label="Nova conversa">' + ICONE_NOVA + '</button>' +
        '<button type="button" class="agn-ico" data-acao="fechar" title="Fechar" aria-label="Fechar">' + ICONE_FECHAR + '</button>' +
      '</header>' +
      '<div class="agn-lista" aria-live="polite"></div>' +
      '<div class="agn-rodape">' +
        '<div class="agn-entrada">' +
          '<textarea rows="1" maxlength="1500" placeholder="Escreva sua pergunta" aria-label="Sua pergunta"></textarea>' +
          '<button type="button" class="agn-enviar">Perguntar</button>' +
        '</div>' +
        '<p class="agn-aviso">Resposta gerada por IA a partir das normas. Confira na página citada antes de executar.</p>' +
      '</div>';

    document.body.appendChild(el.painel);
    document.body.appendChild(el.botao);
    el.lista = el.painel.querySelector('.agn-lista');
    el.texto = el.painel.querySelector('textarea');
    el.enviar = el.painel.querySelector('.agn-enviar');

    el.botao.addEventListener('click', function () { alternar(); });
    el.painel.querySelector('[data-acao="fechar"]').addEventListener('click', function () { alternar(false); });
    el.painel.querySelector('[data-acao="nova"]').addEventListener('click', function () {
      if (ocupado) return;
      conversa = []; salvar(); desenhar(); el.texto.focus();
    });
    el.enviar.addEventListener('click', function () { perguntar(el.texto.value); });
    el.texto.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); perguntar(el.texto.value); }
    });
    el.texto.addEventListener('input', crescer);
    el.painel.addEventListener('keydown', function (e) { if (e.key === 'Escape') alternar(false); });
    el.lista.addEventListener('click', function (e) {
      var ex = e.target.closest('.agn-ex');
      if (ex) { perguntar(ex.textContent); return; }
      var av = e.target.closest('.agn-aval button');
      if (av) avaliar(Number(av.getAttribute('data-i')), av.getAttribute('data-util') === '1');
    });

    window.addEventListener('resize', posicionar);
    setTimeout(posicionar, 1200);
    posicionar();
    desenhar();
  }

  function crescer() {
    el.texto.style.height = 'auto';
    el.texto.style.height = Math.min(el.texto.scrollHeight, 120) + 'px';
  }

  // Sobe o botão se a tela tiver uma barra fixa embaixo (ex.: botões de salvar).
  function posicionar() {
    if (!el.botao) return;
    var base = 18, x = window.innerWidth - 45, y = window.innerHeight - 45;
    el.botao.style.visibility = 'hidden';
    var pilha = document.elementsFromPoint ? document.elementsFromPoint(x, y) : [];
    el.botao.style.visibility = '';
    for (var i = 0; i < pilha.length; i++) {
      var n = pilha[i];
      if (n === el.painel || el.painel.contains(n)) continue;
      while (n && n !== document.body) {
        if (getComputedStyle(n).position === 'fixed') {
          var topo = n.getBoundingClientRect().top;
          // só barras na parte de baixo; janelas e mapas de tela cheia não contam
          if (topo > window.innerHeight * 0.6) base = Math.max(base, window.innerHeight - topo + 12);
          break;
        }
        n = n.parentElement;
      }
    }
    el.botao.style.bottom = base + 'px';
    if (window.innerWidth > 640) el.painel.style.bottom = (base + 66) + 'px';
    else el.painel.style.bottom = '';
  }

  function alternar(abrir) {
    var vai = typeof abrir === 'boolean' ? abrir : !el.painel.classList.contains('aberto');
    el.painel.classList.toggle('aberto', vai);
    el.botao.setAttribute('aria-expanded', vai ? 'true' : 'false');
    if (vai) { posicionar(); rolar(); setTimeout(function () { el.texto.focus(); }, 30); }
    else el.botao.focus();
  }

  function rolar() { el.lista.scrollTop = el.lista.scrollHeight; }

  function desenhar(pensando) {
    if (!conversa.length && !pensando) {
      el.lista.innerHTML = '<div class="agn-vazio"><p>Pergunte sobre as normas de projeto e construção de redes, ' +
        'as especificações de material e o envio de projetos para análise. Dá para colar uma pendência do ' +
        'e-mail de reprovação para entender o que corrigir. A resposta cita o documento e a página, com link para o PDF.</p>' +
        EXEMPLOS.map(function (t) { return '<button type="button" class="agn-ex">' + esc(t) + '</button>'; }).join('') +
        '</div>';
      return;
    }
    el.lista.innerHTML = conversa.map(function (m, i) {
      if (m.papel === 'eu') return '<div class="agn-msg eu"><div class="agn-bolha">' + esc(m.texto) + '</div></div>';
      var aval = m.id ? '<div class="agn-aval">Ajudou?' +
        '<button type="button" data-i="' + i + '" data-util="1" aria-pressed="' + (m.util === true) + '" aria-label="Ajudou">👍</button>' +
        '<button type="button" data-i="' + i + '" data-util="0" aria-pressed="' + (m.util === false) + '" aria-label="Não ajudou">👎</button></div>' : '';
      return '<div class="agn-msg ag"><div class="agn-bolha' + (m.erro ? ' agn-erro' : '') + '">' +
        (m.erro ? esc(m.texto) : formatar(m.texto, m.fontes)) + aval + '</div></div>';
    }).join('') + (pensando
      ? '<div class="agn-msg ag"><div class="agn-bolha"><span class="agn-pensando"><span class="agn-pontos"><i></i><i></i><i></i></span>Consultando as normas…</span></div></div>'
      : '');
    rolar();
  }

  // ---------------------------------------------------------------- conversa
  function perguntar(texto) {
    texto = String(texto || '').trim();
    if (!texto || ocupado) return;
    ocupado = true;
    el.enviar.disabled = true;
    el.texto.value = ''; crescer();
    var historico = conversa.filter(function (m) { return !m.erro; })
      .map(function (m) { return { papel: m.papel === 'eu' ? 'eu' : 'agente', texto: m.texto }; });
    conversa.push({ papel: 'eu', texto: texto });
    salvar();
    desenhar(true);

    var tela = (location.pathname.split('/').pop() || 'index.html');
    sb.functions.invoke(FUNCAO, { body: { pergunta: texto, historico: historico, tela: decodeURIComponent(tela) } })
      .then(function (r) {
        if (r.error) return lerErro(r.error).then(function (msg) { throw new Error(msg); });
        var d = r.data || {};
        conversa.push({ papel: 'agente', texto: d.resposta || '', fontes: d.fontes || [], id: d.id || null });
      })
      .catch(function (e) {
        conversa.push({ papel: 'agente', erro: true, texto: e && e.message ? e.message : 'Sem conexão com o agente. Verifique a internet e tente de novo.' });
      })
      .then(function () {
        ocupado = false;
        el.enviar.disabled = false;
        salvar();
        desenhar();
        el.texto.focus();
      });
  }

  function lerErro(err) {
    var resp = err && err.context;
    if (resp && typeof resp.json === 'function') {
      return resp.json().then(function (b) { return (b && b.erro) || 'O agente não respondeu. Tente de novo.'; },
        function () { return 'O agente não respondeu. Tente de novo.'; });
    }
    return Promise.resolve('Sem conexão com o agente. Verifique a internet e tente de novo.');
  }

  function avaliar(i, util) {
    var m = conversa[i];
    if (!m || !m.id) return;
    m.util = m.util === util ? null : util;
    salvar();
    desenhar();
    sb.from('agente_perguntas').update({ util: m.util }).eq('id', m.id).then(function () {}, function () {});
  }

  // ---------------------------------------------------------------- início
  function iniciar() {
    var tentativas = 0;
    (function esperar() {
      if (window.MARIUA_SB && window.MARIUA_USER && document.body) {
        sb = window.MARIUA_SB;
        carregar();
        montar();
        return;
      }
      if (++tentativas < 150) setTimeout(esperar, 400);   // espera o login por até 1 minuto
    })();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
