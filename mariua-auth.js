/* ===========================================================================
   MARIUÁ · LOGIN ÚNICO E PERMISSÃO POR TELA
   ---------------------------------------------------------------------------
   Coloque este arquivo ao lado dos HTMLs e inclua UMA linha em cada página,
   logo no começo do <head>:

       <script src="mariua-auth.js"></script>

   NÃO inclua no admin.html — ele já tem o login dele.

   O que faz:
   - exige o mesmo e-mail/senha do admin em qualquer tela;
   - a sessão é compartilhada: entra uma vez, vale para todas as páginas;
   - esconde do menu (e bloqueia por URL) as telas que o usuário não pode ver;
   - gestor vê tudo.

   Onde ficam as permissões: linha `usuario_telas` da tabela turno_data,
   gravada pela tela de admin (Editar usuário → Telas liberadas).

   Registro de acessos: cada tela aberta grava uma linha na tabela `acessos`
   (quem, qual tela, horário). O admin mostra na aba "Acessos".
   Crie a tabela uma vez rodando o acessos.sql no SQL Editor do Supabase.
   =========================================================================== */
(function () {
  'use strict';
  if (window.__MARIUA_AUTH__) return;
  window.__MARIUA_AUTH__ = true;

  /* Pasta onde este arquivo está. Algumas telas (neoex, cadastro_obra) ficam
     em subpasta e carregam a guarda como ../mariua-auth.js — sem esta base,
     a foto do login e os links de "sem permissão" apontariam para o lugar
     errado. */
  var BASE = (function () {
    var sc = document.currentScript;
    if (!sc) {
      var todos = document.getElementsByTagName('script');
      for (var i = todos.length - 1; i >= 0; i--) {
        if ((todos[i].src || '').indexOf('mariua-auth.js') >= 0) { sc = todos[i]; break; }
      }
    }
    if (!sc || !sc.src) return '';
    return sc.src.replace(/[?#].*$/, '').replace(/[^\/]*$/, '');
  })();
  window.MARIUA_BASE = BASE;

  // ─── 1. CONFIGURAÇÃO ──────────────────────────────────────────────────────
  var SUPA_URL = 'https://eqxejfoibebcbtsqymji.supabase.co';
  var SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxeGVqZm9pYmViY2J0c3F5bWppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NjUzMTEsImV4cCI6MjA4NzQ0MTMxMX0.lwf7_EJ6UchEOpzhW3cVKztxDGy78gaQblRvgiEwWh8';

  /* Catálogo real do sistema (um arquivo = uma tela).
     index.html fica de fora de propósito: é o hub, todo mundo logado entra nele. */
  var TELAS = [
    { id:'turno',      nome:'Turno',                  arquivos:['turno.html'] },
    { id:'rdo',        nome:'RDO',                    arquivos:['rdo.html','apr.html'] },
    { id:'prog',       nome:'Programação',            arquivos:['prog.html'] },
    { id:'mapa',       nome:'Mapa de obras',          arquivos:['mapa.html'] },
    { id:'comp',       nome:'Comparador de postes',   arquivos:['comp.html'] },
    { id:'estagios',   nome:'Estágios de obras',      arquivos:['estagios.html'] },
    { id:'projecao',   nome:'Projeção / PDA',         arquivos:['projeçao.html','projecao.html'] },
    { id:'neoex',      nome:'NEOEX · apontamento',    arquivos:['neoex.html'] },
    { id:'obra',       nome:'Cadastro de obra',       arquivos:['cadastro_obra.html'] },
    { id:'equipes',    nome:'Cadastro de equipes',    arquivos:['equipes.html'] },
    { id:'cursos',     nome:'Vencimento de cursos',   arquivos:['vencimento_cursos.html'] },
    { id:'ensaios',    nome:'Ensaios · SESMT',        arquivos:['ensaios.html'] },
    { id:'brigada',    nome:'Brigada / extintores',   arquivos:['brigada.html'] },
    { id:'permissoes', nome:'Telas × usuários',       arquivos:['permissoes.html'] },
    { id:'valores',    nome:'Financeiro',             arquivos:['valores.html'], soGestor:true },
    { id:'admin',      nome:'Admin',                  arquivos:['admin.html'],  soGestor:true }
  ];

  // Telas que um usuário SEM nada marcado no admin recebe.
  // Deixe [] para exigir liberação explícita de todo mundo.
  var TELAS_PADRAO = ['turno', 'mapa'];

  window.MARIUA_TELAS = TELAS;

  // ─── 2. ANTI-FLASH: esconde a página até decidir ──────────────────────────
  var LOGO = 'data:image/png;base64,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';
  window.MARIUA_LOGO = LOGO;

  var st = document.createElement('style');
  st.textContent =
    'html.mariua-check body>*{visibility:hidden!important}' +
    '#mariua-ovl,#mariua-ovl *{visibility:visible!important}' +
    // ── moldura ──────────────────────────────────────────────────────────
    '#mariua-ovl{position:fixed;inset:0;z-index:2147483000;display:flex;' +
    'align-items:center;justify-content:center;padding:20px;overflow:auto;' +
    "font-family:'Barlow',system-ui,-apple-system,sans-serif;" +
    'background:rgba(9,42,44,.68);backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px)}' +
    // fundo da tela de login: foto da cidade + véu da marca
    "#mariua-ovl.is-login{background:linear-gradient(180deg,rgba(13,115,119,.90) 0%,rgba(13,115,119,.72) 42%,rgba(240,90,26,.42) 100%),url(\'" + BASE + "login-bg.jpg\') center/cover no-repeat,#0d7377;backdrop-filter:none;-webkit-backdrop-filter:none}" +
    // ── cartão ───────────────────────────────────────────────────────────
    '#mariua-ovl .mx{background:#fff;border-radius:18px;max-width:404px;width:100%;' +
    'padding:30px 30px 24px;box-shadow:0 26px 70px rgba(0,0,0,.34);' +
    'animation:mxsobe .32s cubic-bezier(.2,.8,.2,1)}' +
    '@keyframes mxsobe{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}' +
    '#mariua-ovl .mx-logo{display:block;height:40px;margin:0 auto 18px}' +
    '#mariua-ovl .mx-top{text-align:center;margin-bottom:22px}' +
    '#mariua-ovl h3{margin:0;font-size:1.12rem;font-weight:900;color:#12343b;letter-spacing:-.2px}' +
    '#mariua-ovl p{margin:5px 0 0;font-size:.8rem;color:#7c8b95;font-weight:600;line-height:1.45}' +
    // faixa laranja fina como assinatura da marca
    '#mariua-ovl .mx-bar{height:3px;width:46px;margin:12px auto 0;border-radius:3px;' +
    'background:linear-gradient(90deg,#f05a1a,#ff8a4d)}' +
    // ── campos ───────────────────────────────────────────────────────────
    '#mariua-ovl label{display:block;font-size:.64rem;font-weight:800;color:#9aa7b1;' +
    'letter-spacing:1.4px;text-transform:uppercase;margin:0 0 6px}' +
    '#mariua-ovl .mx-fld{position:relative;margin-bottom:14px}' +
    '#mariua-ovl input{width:100%;box-sizing:border-box;padding:12px 14px;' +
    'border:1.6px solid #e3eaee;border-radius:11px;background:#fbfcfd;' +
    "font-family:'Barlow',sans-serif;font-size:.94rem;font-weight:700;color:#12343b;" +
    'outline:none;transition:border-color .15s,background .15s,box-shadow .15s}' +
    '#mariua-ovl input::placeholder{color:#b6c1c9;font-weight:600}' +
    '#mariua-ovl input:focus{border-color:#0d7377;background:#fff;box-shadow:0 0 0 3.5px rgba(13,115,119,.13)}' +
    '#mariua-ovl input.erro{border-color:#e53e3e;background:#fff7f7;animation:mxtrema .34s}' +
    '@keyframes mxtrema{0%,100%{transform:translateX(0)}22%,66%{transform:translateX(-5px)}44%,88%{transform:translateX(5px)}}' +
    '#mariua-ovl .mx-olho{position:absolute;right:6px;top:50%;transform:translateY(-50%);' +
    'border:none;background:none;cursor:pointer;color:#9aa7b1;font-size:.66rem;font-weight:800;' +
    "letter-spacing:.8px;text-transform:uppercase;padding:8px 10px;font-family:'Barlow',sans-serif}" +
    '#mariua-ovl .mx-olho:hover{color:#0d7377}' +
    // ── botão ────────────────────────────────────────────────────────────
    '#mariua-ovl .bt{width:100%;margin-top:6px;padding:13px;border:none;border-radius:11px;' +
    'background:linear-gradient(135deg,#f05a1a,#ff7a3d);color:#fff;' +
    "font-family:'Barlow',sans-serif;font-size:.92rem;font-weight:900;letter-spacing:.3px;" +
    'cursor:pointer;box-shadow:0 8px 20px rgba(240,90,26,.30);transition:filter .15s,box-shadow .15s,transform .1s}' +
    '#mariua-ovl .bt:hover{filter:brightness(1.05);box-shadow:0 10px 26px rgba(240,90,26,.38)}' +
    '#mariua-ovl .bt:active{transform:translateY(1px)}' +
    '#mariua-ovl .bt:disabled{opacity:.62;cursor:default;box-shadow:none;filter:none}' +
    '#mariua-ovl .bt.teal{background:linear-gradient(135deg,#0d7377,#14a085);box-shadow:0 8px 20px rgba(13,115,119,.28)}' +
    '#mariua-ovl .bt.teal:hover{box-shadow:0 10px 26px rgba(13,115,119,.36)}' +
    // ── links e rodapé ───────────────────────────────────────────────────
    '#mariua-ovl .mx-links{display:flex;justify-content:space-between;gap:10px;margin-top:14px}' +
    '#mariua-ovl .lk{background:none;border:none;color:#0d7377;font-weight:800;' +
    "font-size:.76rem;cursor:pointer;font-family:'Barlow',sans-serif;padding:4px 0}" +
    '#mariua-ovl .lk:hover{color:#f05a1a;text-decoration:underline}' +
    '#mariua-ovl .ms{min-height:18px;font-size:.78rem;font-weight:700;margin-top:12px;text-align:center}' +
    '#mariua-ovl .er{color:#c53030}#mariua-ovl .ok{color:#0d7377}' +
    '#mariua-ovl .mx-pe{margin-top:20px;padding-top:14px;border-top:1px solid #eef2f4;' +
    'text-align:center;font-size:.64rem;font-weight:800;color:#b6c1c9;letter-spacing:1.4px;text-transform:uppercase}' +
    '#mariua-ovl .tg{display:inline-block;background:#f0fafa;color:#0d7377;border:1px solid #c7e7e6;' +
    'border-radius:8px;padding:5px 11px;font-size:.73rem;font-weight:800;margin:4px 5px 0 0;text-decoration:none}' +
    '#mariua-ovl .tg:hover{background:#0d7377;color:#fff;border-color:#0d7377}' +
    '#mariua-ovl .mx-quem{display:flex;align-items:center;gap:13px;margin-bottom:18px}' +
    '#mariua-ovl .mx-ava{width:46px;height:46px;border-radius:50%;flex-shrink:0;display:flex;' +
    'align-items:center;justify-content:center;background:linear-gradient(135deg,#0d7377,#14a085);' +
    'color:#fff;font-size:1.06rem;font-weight:900}' +
    '@media(max-width:560px){#mariua-ovl{padding:14px}#mariua-ovl .mx{padding:24px 20px 20px}}';
  (document.head || document.documentElement).appendChild(st);
  document.documentElement.classList.add('mariua-check');

  function liberarTela() { document.documentElement.classList.remove('mariua-check'); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]; }); }

  function ovl(modo) {
    var d = document.getElementById('mariua-ovl');
    if (!d) {
      d = document.createElement('div');
      d.id = 'mariua-ovl';
      (document.body || document.documentElement).appendChild(d);
    }
    d.className = (modo === 'login') ? 'is-login' : '';
    d.style.display = 'flex';
    return d;
  }
  function cabecalho(titulo, texto) {
    return '<img class="mx-logo" src="' + LOGO + '" alt="Mariuá">' +
      '<div class="mx-top"><h3>' + titulo + '</h3>' +
      (texto ? '<p>' + texto + '</p>' : '') +
      '<div class="mx-bar"></div></div>';
  }
  var RODAPE = '<div class="mx-pe">Mariuá · Construção e Energia</div>';
  function fecharOvl() { var d = document.getElementById('mariua-ovl'); if (d) d.remove(); }

  // ─── 3. CLIENTE SUPABASE ──────────────────────────────────────────────────
  var sb = null;
  var CDNS = [
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
    'https://unpkg.com/@supabase/supabase-js@2'
  ];
  function carregarSDK(cb, i) {
    if (window.supabase && window.supabase.createClient) return cb();
    i = i || 0;
    if (i >= CDNS.length) {
      falha('Não foi possível carregar o componente de login. Verifique a conexão ou libere cdn.jsdelivr.net no CSP da página.');
      return;
    }
    var s = document.createElement('script');
    s.src = CDNS[i];
    s.onload = function () {
      if (window.supabase && window.supabase.createClient) cb();
      else carregarSDK(cb, i + 1);
    };
    s.onerror = function () { carregarSDK(cb, i + 1); };
    (document.head || document.documentElement).appendChild(s);
  }
  function falha(msg) {
    var d = ovl('login');
    d.innerHTML = '<div class="mx">' +
      cabecalho('Login indisponível', esc(msg)) +
      '<button class="bt" onclick="location.reload()">Tentar de novo</button>' +
      RODAPE + '</div>';
  }

  // ─── 4. TELA DE LOGIN ─────────────────────────────────────────────────────
  // Mostra o motivo REAL da recusa. Antes qualquer falha virava "senha inválida",
  // o que escondia caso de e-mail não confirmado, conta inexistente ou bloqueio.
  function traduzErro(err) {
    var m = String((err && err.message) || '');
    console.warn('[mariua-auth] login recusado:', err);
    if (/invalid login credentials/i.test(m)) return 'E-mail ou senha incorretos.';
    if (/email not confirmed/i.test(m))       return 'E-mail ainda não confirmado. Peça ao administrador para confirmar no painel do Supabase, ou use “Esqueci minha senha”.';
    if (/user not found/i.test(m))            return 'Não existe conta com esse e-mail.';
    if (/user is banned|disabled/i.test(m))   return 'Esta conta está desativada.';
    if (/rate limit|too many/i.test(m))       return 'Muitas tentativas seguidas. Aguarde um minuto e tente de novo.';
    if (/failed to fetch|network/i.test(m))   return 'Sem conexão com o servidor de login.';
    return 'Não foi possível entrar: ' + m;
  }

  function telaLogin(aviso) {
    var d = ovl('login');
    d.innerHTML =
      '<div class="mx">' +
        cabecalho('Sistema de Obras', 'Acesso restrito a usuários cadastrados.') +
        '<div id="mx-login">' +
          '<label for="mx-email">E-mail</label>' +
          '<div class="mx-fld"><input id="mx-email" type="email" autocomplete="username" inputmode="email" placeholder="nome@empresa.com"></div>' +
          '<label for="mx-senha">Senha</label>' +
          '<div class="mx-fld">' +
            '<input id="mx-senha" type="password" autocomplete="current-password" placeholder="sua senha">' +
            '<button type="button" class="mx-olho" id="mx-ver">ver</button>' +
          '</div>' +
          '<button class="bt" id="mx-bt">Entrar</button>' +
          '<div class="mx-links">' +
            '<button class="lk" id="mx-esq">Esqueci minha senha</button>' +
            '<button class="lk" id="mx-sol">Solicitar acesso</button>' +
          '</div>' +
        '</div>' +
        '<div id="mx-solic" style="display:none">' +
          '<label for="mx-s-nome">Nome completo</label>' +
          '<div class="mx-fld"><input id="mx-s-nome" placeholder="como está no cadastro"></div>' +
          '<label for="mx-s-email">E-mail</label>' +
          '<div class="mx-fld"><input id="mx-s-email" type="email" inputmode="email" placeholder="nome@empresa.com"></div>' +
          '<label for="mx-s-mat">Matrícula</label>' +
          '<div class="mx-fld"><input id="mx-s-mat" inputmode="numeric" placeholder="ex.: 27680"></div>' +
          '<button class="bt teal" id="mx-s-bt">Enviar solicitação</button>' +
          '<div class="mx-links" style="justify-content:center">' +
            '<button class="lk" id="mx-s-volta">Voltar ao login</button>' +
          '</div>' +
        '</div>' +
        '<div class="ms ' + (aviso ? 'er' : '') + '" id="mx-ms">' + esc(aviso || '') + '</div>' +
        RODAPE +
      '</div>';

    var ms = document.getElementById('mx-ms');
    var iEmail = document.getElementById('mx-email');
    var iSenha = document.getElementById('mx-senha');
    function diz(t, ok) { ms.textContent = t || ''; ms.className = 'ms ' + (ok ? 'ok' : 'er'); }
    function marca(el) {
      if (!el) return;
      el.classList.add('erro');
      setTimeout(function () { el.classList.remove('erro'); }, 500);
      el.focus();
    }

    function entrar() {
      var bt = document.getElementById('mx-bt');
      var em = (iEmail.value || '').trim();
      var pw = iSenha.value || '';
      if (!em) { diz('Informe seu e-mail.'); marca(iEmail); return; }
      if (!pw) { diz('Informe sua senha.'); marca(iSenha); return; }
      bt.disabled = true; bt.textContent = 'Entrando…'; diz('');
      sb.auth.signInWithPassword({ email: em, password: pw }).then(function (r) {
        bt.disabled = false; bt.textContent = 'Entrar';
        if (r.error) { diz(traduzErro(r.error)); marca(iSenha); return; }
        aposLogin();
      });
    }
    document.getElementById('mx-bt').onclick = entrar;
    [iEmail, iSenha].forEach(function (el) {
      el.onkeydown = function (e) { if (e.key === 'Enter') entrar(); };
    });
    document.getElementById('mx-ver').onclick = function () {
      var vendo = iSenha.type === 'text';
      iSenha.type = vendo ? 'password' : 'text';
      this.textContent = vendo ? 'ver' : 'ocultar';
      iSenha.focus();
    };
    setTimeout(function () { try { iEmail.focus(); } catch (e) {} }, 120);

    document.getElementById('mx-esq').onclick = function () {
      var em = (iEmail.value || '').trim();
      if (!em) { diz('Digite seu e-mail primeiro.'); marca(iEmail); return; }
      diz('Enviando…', true);
      sb.auth.resetPasswordForEmail(em, { redirectTo: location.origin + location.pathname })
        .then(function (r) {
          diz(r.error ? 'Não foi possível enviar.'
                      : 'Link de redefinição enviado para ' + em + '.', !r.error);
        });
    };
    document.getElementById('mx-sol').onclick = function () {
      document.getElementById('mx-login').style.display = 'none';
      document.getElementById('mx-solic').style.display = 'block';
      diz('');
      setTimeout(function () { document.getElementById('mx-s-nome').focus(); }, 60);
    };
    document.getElementById('mx-s-volta').onclick = function () {
      document.getElementById('mx-solic').style.display = 'none';
      document.getElementById('mx-login').style.display = 'block';
      diz('');
    };
    document.getElementById('mx-s-bt').onclick = function () {
      var bt = this;
      var nome = (document.getElementById('mx-s-nome').value || '').trim();
      var em = (document.getElementById('mx-s-email').value || '').trim();
      var mat = (document.getElementById('mx-s-mat').value || '').trim();
      if (!nome || !em || !mat) { diz('Preencha nome, e-mail e matrícula.'); return; }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { diz('E-mail inválido.'); return; }
      bt.disabled = true; bt.textContent = 'Enviando…';
      fetch(SUPA_URL + '/rest/v1/solicitacoes', {
        method: 'POST',
        headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY,
                   'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ nome: nome, email: em, matricula: mat, status: 'pendente' })
      }).then(function (r) {
        bt.disabled = false; bt.textContent = 'Enviar solicitação';
        diz(r.ok ? '✅ Solicitação enviada. Aguarde a liberação do administrador.'
                 : 'Não foi possível enviar. Tente novamente.', r.ok);
      }).catch(function () {
        bt.disabled = false; bt.textContent = 'Enviar solicitação'; diz('Falha de conexão.');
      });
    };
  }

  // ─── 5. PERFIL E PERMISSÕES ───────────────────────────────────────────────
  function normalizaTelas(v) {
    if (!v) return null;
    if (typeof v === 'string') v = v.split(',');
    if (!Array.isArray(v)) return null;
    var ids = TELAS.map(function (t) { return t.id; });
    var out = [];
    v.forEach(function (x) {
      x = String(x || '').trim().toLowerCase();
      if (ids.indexOf(x) >= 0 && out.indexOf(x) < 0) out.push(x);
    });
    return out;
  }

  function buscarTelas(email, token) {
    // 1º: RPC minhas_telas (se o SQL opcional estiver instalado)
    return sb.rpc('minhas_telas').then(function (r) {
      var t = (!r.error) ? normalizaTelas(r.data) : null;
      if (t && t.length) return t;
      throw 0;
    }).catch(function () {
      // 2º: mapa em turno_data.usuario_telas (é o que o admin grava hoje)
      return fetch(SUPA_URL + '/rest/v1/turno_data?select=value&key=eq.usuario_telas', {
        headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + (token || SUPA_KEY) }
      }).then(function (r) { return r.ok ? r.json() : []; })
        .then(function (arr) {
          var map = (arr && arr[0] && arr[0].value) || {};
          var k = String(email || '').trim().toLowerCase();
          return normalizaTelas(map[k]) || null;
        }).catch(function () { return null; });
    });
  }

  function aposLogin() {
    sb.auth.getSession().then(function (s) {
      var sess = s && s.data && s.data.session;
      if (!sess) { liberarTela(); telaLogin('Sessão expirada. Entre novamente.'); return; }
      var user = sess.user || {};
      var email = (user.email || '').toLowerCase();

      Promise.all([
        sb.rpc('is_gestor').then(function (r) { return !r.error && r.data === true; }).catch(function () { return false; }),
        buscarTelas(email, sess.access_token)
      ]).then(function (res) {
        var gestor = res[0];
        var telas = res[1];
        if (gestor) telas = TELAS.map(function (t) { return t.id; });
        else if (!telas) telas = TELAS_PADRAO.slice();

        window.MARIUA_USER = {
          email: email,
          nome: (user.user_metadata && (user.user_metadata.nome || user.user_metadata.full_name)) || email.split('@')[0],
          gestor: gestor,
          telas: telas
        };
        try { sessionStorage.setItem('mariua_user_cache', JSON.stringify(window.MARIUA_USER)); } catch (e) {}
        console.log('[mariua-auth] entrou:', email, '| gestor:', gestor, '| telas:', telas.join(', ') || '(nenhuma)');
        aplicar();
      });
    });
  }

  function podeVer(id) {
    var u = window.MARIUA_USER;
    if (!u) return false;
    if (u.gestor) return true;
    var t = TELAS.filter(function (x) { return x.id === id; })[0];
    if (t && t.soGestor) return false;
    return u.telas.indexOf(id) >= 0;
  }
  window.mariuaTemTela = podeVer;
  /* O nav.js pergunta isto para cada item do menu: qual tela é este arquivo?
     Devolve null para arquivo fora do catálogo (aí o nav deixa passar). */
  window.mariuaTelaDeArquivo = function (href) {
    var f = normArq(href);
    for (var i = 0; i < TELAS.length; i++) {
      if (TELAS[i].arquivos.map(normArq).indexOf(f) >= 0) return TELAS[i].id;
    }
    return null;
  };

  function normArq(v) {
    v = String(v || '').split('?')[0].split('#')[0];
    try { v = decodeURIComponent(v); } catch (e) {}
    // compara só o nome do arquivo: as telas em subpasta usam ../prog.html
    v = v.replace(/\\$/, '/').split('/').pop();
    return v.toLowerCase();
  }
  function arquivoAtual() {
    return normArq(location.pathname.split('/').pop() || '');
  }
  function telaDaPagina() {
    var f = arquivoAtual();
    for (var i = 0; i < TELAS.length; i++) {
      if (TELAS[i].arquivos.map(normArq).indexOf(f) >= 0) return TELAS[i];
    }
    return null;
  }

  function esconderNav() {
    TELAS.forEach(function (t) {
      if (podeVer(t.id)) return;
      // por seletor declarado
      (t.nav || []).forEach(function (sel) {
        document.querySelectorAll(sel).forEach(function (el) { el.style.display = 'none'; });
      });
      // por link para o arquivo
      (t.arquivos || []).forEach(function (arq) {
        if (!arq) return;
        document.querySelectorAll('a[href]').forEach(function (a) {
          var h = normArq(a.getAttribute('href'));
          if (h === normArq(arq)) {
            var alvo = a.closest('.sm-item') || a.closest('li') || a;
            alvo.style.display = 'none';
            alvo.setAttribute('data-mariua-oculto', '1');
          }
        });
      });
      // por marcação manual data-tela="id"
      document.querySelectorAll('[data-tela="' + t.id + '"]').forEach(function (el) { el.style.display = 'none'; });
      // divs de página internas (sistema de aba única)
      (t.divs || []).forEach(function (id) {
        var el = document.getElementById(id);
        if (el) { el.style.display = 'none'; el.dataset.mariuaBloqueada = '1'; }
      });
    });
  }

  /* Um módulo do menu (o grupo "Obras", "SESMT", "Financeiro"…) só aparece se
     sobrou ao menos um item liberado dentro dele. Sem isso ficava o título do
     grupo sozinho, abrindo para uma lista vazia.
     Funciona pela estrutura que o nav.js gera: .sm-group > .sm-group-items > .sm-item */
  function esconderModulos() {
    var grupos = document.querySelectorAll('.sm-group, [data-modulo]');
    for (var i = 0; i < grupos.length; i++) {
      var g = grupos[i];
      var itens = g.querySelectorAll('.sm-item, a[href]');
      if (!itens.length) continue;            // grupo sem itens: não mexe
      var algum = false;
      for (var j = 0; j < itens.length; j++) {
        var it = itens[j];
        var esc = it.closest('.sm-item') || it;
        if (esc.getAttribute('data-mariua-oculto') !== '1' && esc.style.display !== 'none') {
          algum = true; break;
        }
      }
      g.style.display = algum ? '' : 'none';
      if (!algum) g.classList.remove('open');
    }
  }

  function blindarSwitchPage() {
    if (typeof window.switchPage !== 'function' || window.switchPage.__mariua) return;
    var orig = window.switchPage;
    var nova = function (page) {
      var t = TELAS.filter(function (x) { return x.divs && x.divs.indexOf('page-' + page) >= 0; })[0]
           || TELAS.filter(function (x) { return x.id === page; })[0];
      if (t && !podeVer(t.id)) { avisoSemAcesso(t.nome); return; }
      return orig.apply(this, arguments);
    };
    nova.__mariua = true;
    window.switchPage = nova;
  }

  function avisoSemAcesso(nome) {
    var permitidas = TELAS.filter(function (t) { return podeVer(t.id) && t.arquivos[0]; });
    var links = permitidas.map(function (t) {
      return '<a class="tg" href="' + BASE + t.arquivos[0] + '">' + esc(t.nome) + '</a>';
    }).join('');
    var d = ovl();
    d.innerHTML = '<div class="mx">' +
      cabecalho('Sem permissão', 'Seu usuário não tem acesso à tela <b>' + esc(nome || '') +
        '</b>. Fale com o administrador se precisar dessa liberação.') +
      (links ? '<label>Telas que você pode abrir</label><div style="margin-bottom:16px">' + links + '</div>'
             : '<p style="text-align:center;margin-bottom:16px">Você ainda não tem nenhuma tela liberada.</p>') +
      '<a class="bt teal" href="' + BASE + 'index.html" style="display:block;text-align:center;text-decoration:none;box-sizing:border-box">Ir para o início</a>' +
      '<div class="mx-links" style="justify-content:center"><button class="lk" onclick="window.mariuaSair()">Sair da conta</button></div>' +
      RODAPE + '</div>';
    liberarTela();
  }


  // ─── 5b. REGISTRO DE ACESSOS ──────────────────────────────────────────────
  /* Cada tela aberta vira uma linha na tabela `acessos` do Supabase: quem, qual
     tela, a que horas entrou e o "último sinal" (atualizado a cada minuto enquanto
     a tela está aberta e visível). O admin.html mostra isso na aba "Acessos".
     - Recarregar a mesma tela na mesma aba continua a mesma visita (não duplica).
     - Voltar depois de mais de 30 min parado conta como nova visita.
     - Tentativa de abrir tela sem permissão também é registrada (bloqueado = true).
     - Se a tabela ainda não existir (acessos.sql não rodado), não faz nada. */
  var ACESSO_SS = 'mariua_acesso_atual';
  var ACESSO_PAUSA_MS = 30 * 60 * 1000;
  var ACESSO_SINAL_MS = 60 * 1000;
  var _acesso = null, _acessoTimer = null, _acessoDesligado = false;

  function novoId() {
    try { if (window.crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (e) {}
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }
  function tipoAparelho() {
    var ua = navigator.userAgent || '';
    return /ipad|tablet/i.test(ua) ? 'tablet' : (/mobile|android|iphone/i.test(ua) ? 'celular' : 'computador');
  }
  function acessoFalhou(err) {
    _acessoDesligado = true; pararSinal();
    console.warn('[mariua-auth] registro de acessos desligado:', err && (err.message || err.code || err));
  }
  function pararSinal() { if (_acessoTimer) clearInterval(_acessoTimer); _acessoTimer = null; }
  function iniciarSinal() {
    pararSinal();
    _acessoTimer = setInterval(function () { if (!document.hidden) sinalAcesso(); }, ACESSO_SINAL_MS);
  }
  function guardarAcesso() { try { sessionStorage.setItem(ACESSO_SS, JSON.stringify(_acesso)); } catch (e) {} }
  function sinalAcesso() {
    if (!_acesso || !sb || _acessoDesligado) return;
    var agora = Date.now();
    if (agora - _acesso.ultimo > ACESSO_PAUSA_MS) {      // ficou parado demais: nova visita
      pararSinal(); _acesso = null;
      try { sessionStorage.removeItem(ACESSO_SS); } catch (e) {}
      registrarAcesso(false);
      return;
    }
    _acesso.ultimo = agora; guardarAcesso();
    sb.from('acessos').update({ ultimo_em: new Date(agora).toISOString() }).eq('id', _acesso.id)
      .then(function (r) { if (r && r.error) acessoFalhou(r.error); }, function () {});
  }
  function registrarAcesso(bloqueado) {
    var u = window.MARIUA_USER;
    if (!u || !u.email || !sb || _acessoDesligado) return;
    var t = telaDaPagina();
    var arq = arquivoAtual() || 'index.html';
    var telaId = t ? t.id : (arq === 'index.html' ? 'inicio' : '');
    var telaNome = t ? t.nome : (telaId === 'inicio' ? 'Início' : arq);
    var agora = Date.now();
    var prev = null;
    try { prev = JSON.parse(sessionStorage.getItem(ACESSO_SS) || 'null'); } catch (e) {}
    if (!bloqueado && prev && prev.id && prev.email === u.email && prev.arq === arq && agora - prev.ultimo < ACESSO_PAUSA_MS) {
      _acesso = prev; sinalAcesso(); iniciarSinal();   // recarregou a mesma tela: mesma visita
      return;
    }
    var dev = null; try { dev = localStorage.getItem('mariua_device_id'); } catch (e) {}
    var linha = {
      id: novoId(), email: u.email, nome: u.nome || '', tela: telaId, tela_nome: telaNome,
      arquivo: arq, bloqueado: !!bloqueado, aparelho: tipoAparelho(), device_id: dev
    };
    sb.from('acessos').insert(linha).then(function (r) {
      if (r && r.error) { acessoFalhou(r.error); return; }
      if (bloqueado) return;
      _acesso = { id: linha.id, email: u.email, arq: arq, ultimo: agora };
      guardarAcesso(); iniciarSinal();
    }, function () {});
  }
  document.addEventListener('visibilitychange', function () { if (_acesso) sinalAcesso(); });

  function aplicar() {
    var t = telaDaPagina();
    if (t && !podeVer(t.id)) { avisoSemAcesso(t.nome); registrarAcesso(true); return; }
    fecharOvl();
    liberarTela();
    registrarAcesso(false);
    var passos = 0;
    var navRedesenhado = false;
    var aplicaTudo = function () {
      // o jeito limpo: o nav.js remonta o menu já filtrado pela permissão
      if (!navRedesenhado && window.mariuaNav && typeof window.mariuaNav.render === 'function') {
        try { window.mariuaNav.render(); navRedesenhado = true; } catch (e) {}
      }
      // rede de segurança, para menus montados de outra forma
      esconderNav();
      esconderModulos();
      blindarSwitchPage();
      pintarAvatar();
      if (++passos < 12) setTimeout(aplicaTudo, 400); // menus montados depois
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', aplicaTudo);
    else aplicaTudo();
  }

  // ─── 6. AVATAR / PERFIL / SAIR ────────────────────────────────────────────
  function pintarAvatar() {
    var b = document.getElementById('user-avatar');
    var u = window.MARIUA_USER;
    if (!b || !u) return;
    b.title = u.nome + (u.gestor ? ' (gestor)' : '');
  }

  var _perfilAuth = function () {
    var u = window.MARIUA_USER || {};
    var nome = u.nome || '—';
    var inicial = String(nome).trim().charAt(0).toUpperCase() || '?';
    var tags = (u.gestor ? ['Todas as telas (gestor)']
      : TELAS.filter(function (t) { return (u.telas || []).indexOf(t.id) >= 0; })
             .map(function (t) { return t.nome; }));
    var d = ovl();
    d.innerHTML = '<div class="mx">' +
      '<div class="mx-quem"><div class="mx-ava">' + esc(inicial) + '</div>' +
        '<div style="min-width:0"><h3 style="text-transform:capitalize">' + esc(nome) + '</h3>' +
        '<p style="word-break:break-all">' + esc(u.email || '') + '</p></div></div>' +
      '<label>Telas liberadas</label><div style="margin-bottom:18px">' +
      (tags.length ? tags.map(function (n) { return '<span class="tg">' + esc(n) + '</span>'; }).join('')
                   : '<span class="tg">nenhuma</span>') + '</div>' +
      '<button class="bt" onclick="window.mariuaSair()">Sair da conta</button>' +
      '<div class="mx-links" style="justify-content:center">' +
        '<button class="lk" onclick="document.getElementById(\'mariua-ovl\').remove()">Fechar</button>' +
      '</div>' + RODAPE + '</div>';
  };
  window.mariuaPerfil = _perfilAuth;

  window.mariuaSair = function () {
    try { sessionStorage.removeItem('mariua_user_cache'); } catch (e) {}
    var fim = function () { location.reload(); };
    if (sb) sb.auth.signOut().then(fim, fim); else fim();
  };

  // identidade.js carrega depois e também define mariuaPerfil. Reassume o cartão
  // no fim do load (guarda o outro em mariuaPerfilIdentidade, se existir), senão
  // a pessoa perde o acesso ao "Sair" e à lista de telas liberadas.
  window.addEventListener('load', function () {
    setTimeout(function () {
      if (window.mariuaPerfil !== _perfilAuth) {
        window.mariuaPerfilIdentidade = window.mariuaPerfil;
        window.mariuaPerfil = _perfilAuth;
      }
    }, 300);
  });

  // ─── 7. ARRANQUE ──────────────────────────────────────────────────────────
  window.mariuaDiag = function () {
    var u = window.MARIUA_USER;
    var d = {
      arquivo: arquivoAtual(),
      tela: (telaDaPagina() || {}).id || '(fora do catálogo — só exige login)',
      guardaCarregada: true,
      sdkCarregado: !!(window.supabase && window.supabase.createClient),
      logado: !!u,
      email: u ? u.email : null,
      gestor: u ? u.gestor : null,
      telas: u ? u.telas : null,
      podeVerEstaTela: u ? (!telaDaPagina() || podeVer(telaDaPagina().id)) : null
    };
    console.table ? console.table(d) : console.log(d);
    return d;
  };

  carregarSDK(function () {
    try {
      sb = window.supabase.createClient(SUPA_URL, SUPA_KEY);
    } catch (e) { falha('Erro ao iniciar o login: ' + e.message); return; }
    window.MARIUA_SB = sb;

    sb.auth.onAuthStateChange(function (ev) {
      if (ev === 'SIGNED_OUT') { location.reload(); }
      if (ev === 'PASSWORD_RECOVERY') {
        var d = ovl('login');
        d.innerHTML = '<div class="mx">' +
          cabecalho('Definir nova senha', 'Escolha uma senha de pelo menos 6 caracteres.') +
          '<label for="mx-nv">Nova senha</label>' +
          '<div class="mx-fld"><input id="mx-nv" type="password" placeholder="nova senha"></div>' +
          '<button class="bt" id="mx-nv-bt">Salvar e entrar</button>' +
          '<div class="ms" id="mx-nv-ms"></div>' + RODAPE + '</div>';
        document.getElementById('mx-nv-bt').onclick = function () {
          var v = document.getElementById('mx-nv').value || '';
          var m = document.getElementById('mx-nv-ms');
          if (v.length < 6) { m.className = 'ms er'; m.textContent = 'Mínimo 6 caracteres.'; return; }
          sb.auth.updateUser({ password: v }).then(function (r) {
            if (r.error) { m.className = 'ms er'; m.textContent = 'Erro: ' + r.error.message; return; }
            aposLogin();
          });
        };
      }
    });

    sb.auth.getSession().then(function (s) {
      if (s && s.data && s.data.session) aposLogin();
      else { liberarTela(); telaLogin(''); }
    }).catch(function () { liberarTela(); telaLogin(''); });
  });
})();
