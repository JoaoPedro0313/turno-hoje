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
   =========================================================================== */
(function () {
  'use strict';
  if (window.__MARIUA_AUTH__) return;
  window.__MARIUA_AUTH__ = true;

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
  var st = document.createElement('style');
  st.textContent =
    'html.mariua-check body>*{visibility:hidden!important}' +
    '#mariua-ovl,#mariua-ovl *{visibility:visible!important}' +
    '#mariua-ovl{position:fixed;inset:0;z-index:2147483000;background:#0d7377;' +
    'display:flex;align-items:center;justify-content:center;padding:18px;' +
    "font-family:'Barlow',system-ui,sans-serif;overflow:auto}" +
    '#mariua-ovl .mx{background:#fff;border-radius:16px;max-width:400px;width:100%;' +
    'padding:26px 24px;box-shadow:0 20px 60px rgba(0,0,0,.35)}' +
    '#mariua-ovl h3{margin:0 0 4px;font-size:1.05rem;font-weight:900;color:#0b5e62}' +
    '#mariua-ovl p{margin:0 0 16px;font-size:.78rem;color:#64748b;font-weight:600}' +
    '#mariua-ovl label{display:block;font-size:.68rem;font-weight:800;color:#94a3b8;' +
    'letter-spacing:1px;text-transform:uppercase;margin:10px 0 4px}' +
    '#mariua-ovl input{width:100%;box-sizing:border-box;padding:11px 13px;' +
    "border:1.5px solid #e2e8f0;border-radius:10px;font-family:'Barlow',sans-serif;" +
    'font-size:.92rem;font-weight:700;color:#1a365d;outline:none}' +
    '#mariua-ovl input:focus{border-color:#14a085}' +
    '#mariua-ovl .bt{width:100%;margin-top:16px;padding:12px;border:none;border-radius:10px;' +
    "background:linear-gradient(135deg,#0d7377,#14a085);color:#fff;font-family:'Barlow',sans-serif;" +
    'font-size:.9rem;font-weight:900;cursor:pointer}' +
    '#mariua-ovl .bt:disabled{opacity:.6;cursor:default}' +
    '#mariua-ovl .lk{background:none;border:none;color:#0d7377;font-weight:800;' +
    "font-size:.74rem;cursor:pointer;font-family:'Barlow',sans-serif;padding:6px 0}" +
    '#mariua-ovl .ms{min-height:18px;font-size:.76rem;font-weight:700;margin-top:10px}' +
    '#mariua-ovl .er{color:#c53030}#mariua-ovl .ok{color:#0d7377}' +
    '#mariua-ovl .tg{display:inline-block;background:#f0fafa;color:#0d7377;border:1px solid #c0e8e5;' +
    'border-radius:7px;padding:4px 10px;font-size:.72rem;font-weight:800;margin:3px 4px 0 0}';
  (document.head || document.documentElement).appendChild(st);
  document.documentElement.classList.add('mariua-check');

  function liberarTela() { document.documentElement.classList.remove('mariua-check'); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]; }); }

  function ovl() {
    var d = document.getElementById('mariua-ovl');
    if (!d) {
      d = document.createElement('div');
      d.id = 'mariua-ovl';
      (document.body || document.documentElement).appendChild(d);
    }
    d.style.display = 'flex';
    return d;
  }
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
    var d = ovl();
    d.innerHTML = '<div class="mx"><h3>⚠️ Login indisponível</h3><p>' + esc(msg) +
      '</p><button class="bt" onclick="location.reload()">Tentar de novo</button></div>';
  }

  // ─── 4. TELA DE LOGIN ─────────────────────────────────────────────────────
  function telaLogin(aviso) {
    var d = ovl();
    d.innerHTML =
      '<div class="mx">' +
        '<h3>🔐 Sistema de Obras</h3>' +
        '<p>Entre com o mesmo e-mail e senha do sistema.</p>' +
        '<div id="mx-login">' +
          '<label>E-mail</label><input id="mx-email" type="email" autocomplete="username" placeholder="nome@empresa.com">' +
          '<label>Senha</label><input id="mx-senha" type="password" autocomplete="current-password" placeholder="••••••••">' +
          '<button class="bt" id="mx-bt">Entrar</button>' +
          '<div style="display:flex;justify-content:space-between;gap:8px;margin-top:6px;">' +
            '<button class="lk" id="mx-esq">Esqueci minha senha</button>' +
            '<button class="lk" id="mx-sol">Solicitar acesso</button>' +
          '</div>' +
        '</div>' +
        '<div id="mx-solic" style="display:none">' +
          '<label>Nome</label><input id="mx-s-nome" placeholder="Seu nome completo">' +
          '<label>E-mail</label><input id="mx-s-email" type="email" placeholder="nome@empresa.com">' +
          '<label>Matrícula</label><input id="mx-s-mat" placeholder="ex.: 27680">' +
          '<button class="bt" id="mx-s-bt">Enviar solicitação</button>' +
          '<button class="lk" id="mx-s-volta" style="display:block;margin:6px auto 0">← Voltar ao login</button>' +
        '</div>' +
        '<div class="ms ' + (aviso ? 'er' : '') + '" id="mx-ms">' + esc(aviso || '') + '</div>' +
      '</div>';

    var ms = document.getElementById('mx-ms');
    function diz(t, ok) { ms.textContent = t || ''; ms.className = 'ms ' + (ok ? 'ok' : 'er'); }

    function entrar() {
      var bt = document.getElementById('mx-bt');
      var em = (document.getElementById('mx-email').value || '').trim();
      var pw = document.getElementById('mx-senha').value || '';
      if (!em || !pw) { diz('Preencha e-mail e senha.'); return; }
      bt.disabled = true; bt.textContent = 'Entrando…'; diz('');
      sb.auth.signInWithPassword({ email: em, password: pw }).then(function (r) {
        bt.disabled = false; bt.textContent = 'Entrar';
        if (r.error) { diz('E-mail ou senha inválidos.'); return; }
        aposLogin();
      });
    }
    document.getElementById('mx-bt').onclick = entrar;
    document.getElementById('mx-senha').onkeydown = function (e) { if (e.key === 'Enter') entrar(); };
    document.getElementById('mx-email').onkeydown = function (e) { if (e.key === 'Enter') entrar(); };

    document.getElementById('mx-esq').onclick = function () {
      var em = (document.getElementById('mx-email').value || '').trim();
      if (!em) { diz('Digite seu e-mail primeiro.'); return; }
      sb.auth.resetPasswordForEmail(em, { redirectTo: location.origin + location.pathname })
        .then(function (r) { diz(r.error ? 'Não foi possível enviar.' : 'Link de redefinição enviado para seu e-mail.', !r.error); });
    };
    document.getElementById('mx-sol').onclick = function () {
      document.getElementById('mx-login').style.display = 'none';
      document.getElementById('mx-solic').style.display = 'block'; diz('');
    };
    document.getElementById('mx-s-volta').onclick = function () {
      document.getElementById('mx-solic').style.display = 'none';
      document.getElementById('mx-login').style.display = 'block'; diz('');
    };
    document.getElementById('mx-s-bt').onclick = function () {
      var bt = this;
      var nome = (document.getElementById('mx-s-nome').value || '').trim();
      var em = (document.getElementById('mx-s-email').value || '').trim();
      var mat = (document.getElementById('mx-s-mat').value || '').trim();
      if (!nome || !em || !mat) { diz('Preencha nome, e-mail e matrícula.'); return; }
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

  function normArq(v) {
    v = String(v || '').split('?')[0].split('#')[0];
    try { v = decodeURIComponent(v); } catch (e) {}
    return v.replace(/^\.?\//, '').toLowerCase();
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
      return '<a class="tg" style="text-decoration:none" href="' + t.arquivos[0] + '">' + esc(t.nome) + '</a>';
    }).join('');
    var d = ovl();
    d.innerHTML = '<div class="mx"><h3>🚫 Sem permissão</h3>' +
      '<p>Seu usuário não tem acesso à tela <b>' + esc(nome || '') + '</b>. ' +
      'Fale com o administrador se precisar dessa liberação.</p>' +
      (links ? '<div style="margin-bottom:12px">' + links + '</div>' : '') +
      '<button class="bt" onclick="window.mariuaSair()">Sair</button></div>';
    liberarTela();
  }

  function aplicar() {
    var t = telaDaPagina();
    if (t && !podeVer(t.id)) { avisoSemAcesso(t.nome); return; }
    fecharOvl();
    liberarTela();
    var passos = 0;
    var aplicaTudo = function () {
      esconderNav();
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
    var tags = (u.gestor ? ['Todas as telas (gestor)']
      : TELAS.filter(function (t) { return (u.telas || []).indexOf(t.id) >= 0; })
             .map(function (t) { return t.nome; }));
    var d = ovl();
    d.innerHTML = '<div class="mx"><h3>👤 ' + esc(u.nome || '—') + '</h3>' +
      '<p>' + esc(u.email || '') + '</p>' +
      '<label>Telas liberadas</label><div style="margin-bottom:14px">' +
      (tags.length ? tags.map(function (n) { return '<span class="tg">' + esc(n) + '</span>'; }).join('')
                   : '<span class="tg">nenhuma</span>') + '</div>' +
      '<button class="bt" onclick="window.mariuaSair()">Sair da conta</button>' +
      '<button class="lk" style="display:block;margin:8px auto 0" onclick="document.getElementById(\'mariua-ovl\').remove()">Fechar</button></div>';
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
        var d = ovl();
        d.innerHTML = '<div class="mx"><h3>Definir nova senha</h3><p>Escolha uma senha de pelo menos 6 caracteres.</p>' +
          '<label>Nova senha</label><input id="mx-nv" type="password" placeholder="nova senha">' +
          '<button class="bt" id="mx-nv-bt">Salvar e entrar</button><div class="ms" id="mx-nv-ms"></div></div>';
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
