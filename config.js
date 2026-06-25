/* ═══════════════════════════════════════════════════════════════
   config.js — Painel de Configurações compartilhado (OBRAS BA)
   Carregado por todas as páginas exceto turno.html (que já tem o seu).
   Injeta o modal #gear-modal + CSS + funções, com abas habilitadas
   conforme as capacidades disponíveis em cada página.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__configJsLoaded) return;       // evita duplicar
  if (document.getElementById('gear-modal')) return; // página já tem o seu
  window.__configJsLoaded = true;

  // ── Capacidades disponíveis nesta página ──
  var hasEquipes  = typeof window.renderManageList === 'function' && typeof window.addTeam === 'function';
  var hasReconect = typeof window.dbReconectar === 'function';
  var hasPresence = typeof window.presenceSaveName === 'function';
  var hasReport   = typeof window.gearReportPaneHTML === 'function';

  // ── CSS (estilos do gear + dark mode) ──
  var css = ''
    + ".gear-tab-btn{display:flex;align-items:center;gap:9px;width:100%;padding:10px 12px;border:none;border-radius:10px;background:transparent;font-family:'Barlow',sans-serif;font-size:0.78rem;font-weight:800;color:#888;cursor:pointer;text-align:left;transition:all .15s;margin-bottom:2px;}"
    + ".gear-tab-btn:hover{background:#f0f4f5;color:#444;}"
    + ".gear-tab-btn.active{background:linear-gradient(135deg,#0d7377,#14a085);color:#fff;box-shadow:0 3px 10px rgba(13,115,119,0.3);}"
    + ".gear-tab-icon{width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:0.95rem;flex-shrink:0;background:rgba(0,0,0,0.05);}"
    + ".gear-tab-btn.active .gear-tab-icon{background:rgba(255,255,255,0.18);}"
    + ".gear-section-title{font-size:0.65rem;font-weight:800;letter-spacing:2px;text-transform:uppercase;margin-bottom:14px;padding-bottom:8px;}"
    + ".gear-card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px;margin-bottom:12px;}"
    + ".gear-btn{width:100%;padding:11px;border:none;border-radius:10px;font-family:'Barlow',sans-serif;font-size:0.85rem;font-weight:800;cursor:pointer;transition:all .15s;margin-bottom:8px;display:flex;align-items:center;justify-content:center;gap:8px;}"
    + ".team-list{max-height:320px;overflow-y:auto;border:1.5px solid #e8ecef;border-radius:10px;}"
    // Dark mode
    + "body.dark{background:#0f1923 !important;color:#e2e8f0 !important;}"
    + "body.dark .top-bar{box-shadow:0 2px 20px rgba(0,0,0,0.5);}"
    + "body.dark .page-nav{border-bottom-color:rgba(255,255,255,0.04) !important;}"
    + "body.dark .page-nav-btn{color:rgba(255,255,255,0.35) !important;}"
    + "body.dark .page-nav-btn:hover{background:rgba(255,255,255,0.08) !important;color:rgba(255,255,255,0.7) !important;}"
    + "body.dark .section{background:#1a2535 !important;box-shadow:0 2px 12px rgba(0,0,0,0.4) !important;}"
    + "body.dark .section-header.green{background:#0d2320 !important;border-bottom-color:#14584e !important;}"
    + "body.dark .section-header.red{background:#2a1515 !important;border-bottom-color:#5a2020 !important;}"
    + "body.dark .section-header.orange{background:#2a2010 !important;border-bottom-color:#5a3a10 !important;}"
    + "body.dark .section-header.blue{background:#101e2a !important;border-bottom-color:#1e4060 !important;}"
    + "body.dark .section-label{color:#e2e8f0 !important;}"
    + "body.dark .card{border-color:#243044 !important;}"
    + "body.dark .card:hover{background:#1e2d3d !important;}"
    + "body.dark .card-name{color:#e2e8f0 !important;}"
    + "body.dark .footer{color:#4a5568 !important;}"
    + "body.dark .bottom-bar{background:rgba(15,25,35,0.95) !important;border-top-color:#243044 !important;}"
    + "body.dark #gear-modal[style*=\"flex\"]{background:rgba(0,0,10,0.8) !important;}"
    + "body.dark #gear-modal > div{background:#1a2535 !important;}"
    + "body.dark .gear-card{background:#141f2e !important;border-color:#243044 !important;}"
    + "body.dark .gear-tab-btn{color:#94a3b8 !important;}"
    + "body.dark .gear-tab-btn:hover{background:#243044 !important;color:#e2e8f0 !important;}"
    + "body.dark #gear-modal [style*=\"background:#f8fafc\"]{background:#141f2e !important;}"
    + "body.dark #gear-modal [style*=\"background:#fff\"]{background:#1a2535 !important;}"
    + "body.dark .team-row{border-bottom-color:#243044 !important;}"
    + "body.dark .team-row:hover{background:#1e2d3d !important;}"
    + "body.dark .team-row-name{color:#e2e8f0 !important;}"
    + "body.dark .team-list{border-color:#2d4060 !important;}"
    + "body.dark input[type=\"text\"],body.dark input[type=\"date\"],body.dark select{background:#243044 !important;color:#e2e8f0 !important;border-color:#2d4060 !important;}"
    + "body.dark input::placeholder{color:#4a6080 !important;}";
  var st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);

  // ── Abas (sidebar) e painéis, conforme capacidade ──
  var tabs = [];
  if (hasEquipes)  tabs.push({ id: 'equipes', icon: '👥', label: 'Equipes' });
  tabs.push({ id: 'online',  icon: '🟢', label: 'Online' });
  if (hasReport)   tabs.push({ id: 'relatorio', icon: '📲', label: 'Relatório' });
  tabs.push({ id: 'visual', icon: '🎨', label: 'Visual' });
  tabs.push({ id: 'dados',  icon: '🗄️', label: 'Dados' });
  var firstTab = tabs[0].id;

  var sidebar = tabs.map(function (t, i) {
    var onclick = "gearSwitchTab('" + t.id + "')" + (t.id === 'online' ? ';gearRefreshPresence();' : '');
    return '<button class="gear-tab-btn' + (i === 0 ? ' active' : '') + '" id="gtab-' + t.id + '" onclick="' + onclick + '">'
      + '<span class="gear-tab-icon">' + t.icon + '</span><span>' + t.label + '</span></button>';
  }).join('');

  // Painel Equipes
  var paneEquipes = !hasEquipes ? '' :
    '<div id="gear-content-equipes" style="display:' + (firstTab === 'equipes' ? '' : 'none') + ';">'
    + '<div class="gear-section-title" style="color:#0d7377;border-bottom:2px solid #c0e8e5;">👥 Gerenciar Equipes</div>'
    + '<div class="gear-card">'
    + '<div style="font-size:0.72rem;font-weight:800;color:#555;margin-bottom:8px;">Adicionar equipe</div>'
    + '<input id="new-name" type="text" placeholder="Nome (ex: JOAO-JAC)" style="width:100%;box-sizing:border-box;padding:8px 12px;border:1.5px solid #c0e8e5;border-radius:8px;font-family:\'Barlow\',sans-serif;font-size:0.82rem;font-weight:700;margin-bottom:8px;outline:none;">'
    + '<input id="new-obs" type="text" placeholder="Observação (opcional)" style="width:100%;box-sizing:border-box;padding:8px 12px;border:1.5px solid #c0e8e5;border-radius:8px;font-family:\'Barlow\',sans-serif;font-size:0.82rem;font-weight:700;margin-bottom:8px;outline:none;">'
    + '<button onclick="if(window.addTeam)window.addTeam()" style="width:100%;padding:10px;background:linear-gradient(135deg,#0d7377,#14a085);color:#fff;border:none;border-radius:9px;font-family:\'Barlow\',sans-serif;font-size:0.85rem;font-weight:800;cursor:pointer;">+ Adicionar</button>'
    + '</div>'
    + '<div style="position:relative;margin-bottom:8px;">'
    + '<span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:0.9rem;">🔍</span>'
    + '<input id="search-input" type="text" placeholder="Buscar equipe..." oninput="if(window.renderManageList)window.renderManageList()" style="width:100%;box-sizing:border-box;padding:8px 12px 8px 32px;border:1.5px solid #e2e8f0;border-radius:8px;font-family:\'Barlow\',sans-serif;font-size:0.82rem;font-weight:700;outline:none;">'
    + '</div>'
    + '<div id="manage-list" class="team-list"></div>'
    + '</div>';

  // Painel Online
  var paneOnline =
    '<div id="gear-content-online" style="display:' + (firstTab === 'online' ? '' : 'none') + ';">'
    + (hasPresence ?
        '<div class="gear-section-title" style="color:#276749;border-bottom:2px solid #c6f6d5;">🟢 Quem está Online</div>'
        + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">'
        + '<div id="gear-presence-count" style="font-size:0.78rem;font-weight:700;color:#555;"></div>'
        + '<button onclick="gearRefreshPresence()" style="padding:5px 14px;background:#f0fff4;border:1.5px solid #c6f6d5;border-radius:8px;font-family:\'Barlow\',sans-serif;font-size:0.7rem;font-weight:800;color:#276749;cursor:pointer;">🔄 Atualizar</button>'
        + '</div>'
        + '<div id="gear-presence-list" style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;min-height:60px;margin-bottom:22px;"><div style="text-align:center;padding:20px;color:#aaa;font-size:0.82rem;font-weight:600;">Carregando...</div></div>'
      : '')
    + '<div class="gear-section-title" style="color:#0d7377;border-bottom:2px solid #c0e8e5;">📋 Todos que já acessaram</div>'
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">'
    + '<div id="gear-acessos-count" style="font-size:0.78rem;font-weight:700;color:#555;"></div>'
    + '<button onclick="gearLoadAcessos()" style="padding:5px 14px;background:#f0fafa;border:1.5px solid #c0e8e5;border-radius:8px;font-family:\'Barlow\',sans-serif;font-size:0.7rem;font-weight:800;color:#0d7377;cursor:pointer;">🔄 Atualizar</button>'
    + '</div>'
    + '<div id="gear-acessos-list" style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;min-height:60px;max-height:340px;overflow-y:auto;"><div style="text-align:center;padding:20px;color:#aaa;font-size:0.82rem;font-weight:600;">Carregando...</div></div>'
    + '</div>';

  // Painel Visual (dark mode + nome de presença, se houver)
  var paneRelatorio = !hasReport ? '' :
    '<div id="gear-content-relatorio" style="display:' + (firstTab === 'relatorio' ? '' : 'none') + ';">'
    + window.gearReportPaneHTML()
    + '</div>';

  var paneVisual =
    '<div id="gear-content-visual" style="display:' + (firstTab === 'visual' ? '' : 'none') + ';">'
    + '<div class="gear-section-title" style="color:#553c9a;border-bottom:2px solid #d6bcfa;">🎨 Aparência</div>'
    + '<div class="gear-card" style="display:flex;align-items:center;justify-content:space-between;">'
    + '<div><div style="font-size:0.88rem;font-weight:800;color:#2d3748;">🌙 Modo Escuro</div>'
    + '<div style="font-size:0.72rem;color:#888;margin-top:2px;">Alterna tema claro/escuro</div></div>'
    + '<label style="position:relative;display:inline-block;width:44px;height:24px;cursor:pointer;">'
    + '<input type="checkbox" id="dark-mode-toggle" style="opacity:0;width:0;height:0;" onchange="toggleDarkMode(this.checked)">'
    + '<span id="dark-mode-slider" style="position:absolute;cursor:pointer;inset:0;background:#ccc;border-radius:24px;transition:0.3s;"></span>'
    + '<span id="dark-mode-knob" style="position:absolute;height:18px;width:18px;left:3px;bottom:3px;background:#fff;border-radius:50%;transition:0.3s;box-shadow:0 1px 4px rgba(0,0,0,0.2);"></span>'
    + '</label></div>'
    + (hasPresence ?
        '<div class="gear-card"><div style="font-size:0.88rem;font-weight:800;color:#2d3748;">🔤 Meu Nome</div>'
        + '<div style="font-size:0.72rem;color:#888;margin:2px 0 8px;">Aparece na lista de usuários online</div>'
        + '<input id="presence-my-name" type="text" placeholder="Seu nome (ex: João)" oninput="if(window.presenceSaveName)presenceSaveName(this.value)" style="width:100%;box-sizing:border-box;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:10px;font-family:\'Barlow\',sans-serif;font-size:0.88rem;font-weight:700;outline:none;"></div>'
        : '')
    + '</div>';

  // Painel Dados (importar CSV do RDO + reconectar + limpar cache)
  var paneDados =
    '<div id="gear-content-dados" style="display:' + (firstTab === 'dados' ? '' : 'none') + ';">'
    + '<div class="gear-section-title" style="color:#c53030;border-bottom:2px solid #fde8e8;">🗄️ Dados e Conexão</div>'
    + '<div class="gear-card"><div style="font-size:0.78rem;font-weight:800;color:#0d7377;margin-bottom:4px;">📋 Importar CSV do RDO</div>'
    + '<div style="font-size:0.7rem;color:#888;margin-bottom:10px;">Suba o arquivo CSV do RDO para carregar as equipes do dia</div>'
    + '<input type="file" id="gear-rdo-file" accept=".csv" style="display:none" onchange="(function(inp){ if(window.rdoImportar){ window.rdoImportar(inp.files[0]); document.getElementById(\'gear-modal\').style.display=\'none\'; } else { try{ if(inp.files[0]) sessionStorage.setItem(\'gear_rdo_pending\',\'1\'); }catch(e){} alert(\'Abrindo a aba RDO para importar o CSV...\'); location.href=\'rdo.html\'; } inp.value=\'\'; })(this)">'
    + '<button onclick="document.getElementById(\'gear-rdo-file\').click()" class="gear-btn" style="background:linear-gradient(135deg,#0d7377,#14a085);color:#fff;">📤 Selecionar CSV do RDO</button></div>'
    + (hasReconect ?
        '<div class="gear-card"><div style="font-size:0.78rem;font-weight:800;color:#2d3748;margin-bottom:4px;">🔄 Conexão com Banco</div>'
        + '<div style="font-size:0.7rem;color:#888;margin-bottom:10px;">Reconecta ao Supabase e recarrega os dados</div>'
        + '<button onclick="if(window.dbReconectar)window.dbReconectar();document.getElementById(\'gear-modal\').style.display=\'none\';" class="gear-btn" style="background:linear-gradient(135deg,#0d7377,#14a085);color:#fff;">🔄 Reconectar ao Banco</button></div>'
        : '')
    + '<div class="gear-card"><div style="font-size:0.78rem;font-weight:800;color:#c53030;margin-bottom:4px;">⚠️ Limpar Cache Local</div>'
    + '<div style="font-size:0.7rem;color:#888;margin-bottom:10px;">Remove os dados salvos localmente e recarrega a página</div>'
    + '<button onclick="if(confirm(\'Limpar todo o cache local? Esta ação não pode ser desfeita.\')){localStorage.clear();location.reload();}" class="gear-btn" style="background:#fff5f5;color:#c53030;border:2px solid #fde8e8;margin-bottom:0;">🗑️ Limpar Cache Local</button></div>'
    + '</div>';

  // ── Monta o modal ──
  var modal = document.createElement('div');
  modal.id = 'gear-modal';
  modal.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(10,20,30,0.65);z-index:5000;align-items:center;justify-content:center;padding:12px;backdrop-filter:blur(4px);';
  modal.innerHTML =
    '<div style="background:#fff;border-radius:20px;width:100%;max-width:680px;box-shadow:0 32px 80px rgba(0,0,0,0.28);overflow:hidden;max-height:94vh;display:flex;flex-direction:column;">'
    + '<div style="background:linear-gradient(135deg,#0b5e62,#0d7377,#14a085);padding:0 24px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;height:62px;">'
    + '<div style="display:flex;align-items:center;gap:12px;">'
    + '<div style="width:38px;height:38px;border-radius:10px;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;font-size:1.2rem;">⚙️</div>'
    + '<div><div style="color:#fff;font-size:1rem;font-weight:900;letter-spacing:0.5px;">Configurações</div>'
    + '<div style="color:rgba(255,255,255,0.6);font-size:0.68rem;font-weight:600;letter-spacing:0.5px;">Sistema OBRAS BA</div></div></div>'
    + '<button onclick="document.getElementById(\'gear-modal\').style.display=\'none\'" style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.2);color:#fff;width:34px;height:34px;border-radius:10px;cursor:pointer;font-size:1rem;font-weight:800;display:flex;align-items:center;justify-content:center;">✕</button>'
    + '</div>'
    + '<div style="display:flex;flex:1;overflow:hidden;min-height:0;">'
    + '<div style="width:150px;flex-shrink:0;background:#f8fafc;border-right:1px solid #e8ecef;padding:14px 10px;display:flex;flex-direction:column;overflow-y:auto;">'
    + sidebar
    + '<div style="flex:1;"></div><div style="font-size:0.6rem;color:#bbb;font-weight:600;text-align:center;padding:8px 0;letter-spacing:0.5px;">OBRAS BA</div>'
    + '</div>'
    + '<div style="flex:1;overflow-y:auto;padding:20px;">'
    + paneEquipes + paneOnline + paneRelatorio + paneVisual + paneDados
    + '</div></div></div>';

  function mount() {
    if (document.getElementById('gear-modal')) return;
    document.body.appendChild(modal);
    // fechar clicando fora
    modal.addEventListener('click', function (e) { if (e.target === modal) modal.style.display = 'none'; });
    // restaurar dark mode
    if (localStorage.getItem('mariua_darkmode') === '1') toggleDarkMode(true);
    // abrir via hash #gear (ex.: link vindo de outra página)
    if (location.hash === '#gear') { window.abrirGear(); history.replaceState(null, '', location.pathname + location.search); }
  }
  // ── Funções públicas ──
  window.abrirGear = function () {
    var m = document.getElementById('gear-modal');
    if (!m) return;
    m.style.display = 'flex';
    gearSwitchTab(firstTab);
    if (firstTab === 'online') gearRefreshPresence();
  };

  window.gearSwitchTab = function (tab) {
    tabs.forEach(function (t) {
      var btn = document.getElementById('gtab-' + t.id);
      var pane = document.getElementById('gear-content-' + t.id);
      if (btn)  btn.className = 'gear-tab-btn' + (t.id === tab ? ' active' : '');
      if (pane) pane.style.display = (t.id === tab) ? '' : 'none';
    });
    if (tab === 'equipes') setTimeout(function () { if (typeof window.renderManageList === 'function') window.renderManageList(); }, 50);
    if (tab === 'online') { if (typeof window.gearRefreshPresence === 'function') window.gearRefreshPresence(); if (typeof window.gearLoadAcessos === 'function') window.gearLoadAcessos(); }
    if (tab === 'relatorio' && typeof window.pdaRefreshGearStatus === 'function') window.pdaRefreshGearStatus();
    if (tab === 'visual') {
      var inp = document.getElementById('presence-my-name');
      if (inp && typeof window.presenceGetMyName === 'function') inp.value = window.presenceGetMyName();
      var tog = document.getElementById('dark-mode-toggle');
      if (tog) tog.checked = document.body.classList.contains('dark');
    }
  };

  window.toggleDarkMode = function (on) {
    document.querySelectorAll('#dark-mode-slider').forEach(function (s) { s.style.background = on ? '#0d7377' : '#ccc'; });
    document.querySelectorAll('#dark-mode-knob').forEach(function (k) { k.style.transform = on ? 'translateX(20px)' : 'translateX(0)'; });
    document.querySelectorAll('#dark-mode-toggle').forEach(function (t) { t.checked = !!on; });
    if (on) { document.body.classList.add('dark'); localStorage.setItem('mariua_darkmode', '1'); }
    else { document.body.classList.remove('dark'); localStorage.setItem('mariua_darkmode', '0'); }
  };

  window.gearRefreshPresence = function () {
    if (typeof window.presencePoll === 'function') {
      try { window.presencePoll().then(gearRenderPresenceList); return; } catch (e) {}
    }
    gearRenderPresenceList();
  };

  function gearRenderPresenceList() {
    var listEl = document.getElementById('gear-presence-list');
    var countEl = document.getElementById('gear-presence-count');
    if (!listEl) return;
    var users = (typeof window.presenceActive !== 'undefined' && window.presenceActive) ? window.presenceActive : [];
    var count = users.length;
    if (countEl) countEl.textContent = count + ' usuário' + (count !== 1 ? 's' : '') + ' online agora';
    if (!count) {
      listEl.innerHTML = '<div style="text-align:center;padding:18px;color:#aaa;font-size:0.8rem;font-weight:600;">Nenhum usuário online</div>';
      return;
    }
    var myUID = (typeof window.presenceUID !== 'undefined') ? window.presenceUID : '';
    var now = Date.now();
    listEl.innerHTML = users.map(function (u) {
      var isMe = u.uid === myUID;
      var name = u.name || 'Anônimo';
      var initials = name.trim().charAt(0).toUpperCase() || '?';
      var ms = now - new Date(u.last_seen).getTime();
      var when = ms < 30000 ? 'agora' : ms < 60000 ? Math.floor(ms / 1000) + 's' : Math.floor(ms / 60000) + 'min';
      var device = /mobile|android|iphone/i.test(u.user_agent || '') ? '📱' : '💻';
      return '<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid ' + (isMe ? '#c6f6d5' : '#e2e8f0') + ';background:' + (isMe ? '#f0fff4' : '#fff') + ';">'
        + '<div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,' + (isMe ? '#276749,#38a169' : '#0d7377,#14a085') + ');color:#fff;font-size:0.82rem;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;">' + initials + '</div>'
        + '<div style="flex:1;min-width:0;"><div style="font-size:0.82rem;font-weight:800;color:#1a365d;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + name + (isMe ? ' <span style="background:#c6f6d5;color:#276749;font-size:0.58rem;padding:1px 6px;border-radius:8px;font-weight:800;">VOCÊ</span>' : '') + '</div>'
        + '<div style="font-size:0.65rem;font-weight:600;color:#888;margin-top:1px;">' + device + ' ' + when + '</div></div>'
        + '<div style="width:8px;height:8px;border-radius:50%;background:#38d996;box-shadow:0 0 5px #38d996;flex-shrink:0;"></div></div>';
    }).join('');
  }

  // ── Lista de TODOS que já acessaram (tabela dispositivos) ──
  var GEAR_SUPA_URL = 'https://eqxejfoibebcbtsqymji.supabase.co';
  var GEAR_SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxeGVqZm9pYmViY2J0c3F5bWppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NjUzMTEsImV4cCI6MjA4NzQ0MTMxMX0.lwf7_EJ6UchEOpzhW3cVKztxDGy78gaQblRvgiEwWh8';
  function gearFmtData(iso) {
    if (!iso) return '—';
    try {
      var d = new Date(iso), p = function (n) { return (n < 10 ? '0' : '') + n; };
      return p(d.getDate()) + '/' + p(d.getMonth() + 1) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
    } catch (e) { return '—'; }
  }
  window.gearLoadAcessos = function () {
    var listEl = document.getElementById('gear-acessos-list');
    var countEl = document.getElementById('gear-acessos-count');
    if (!listEl) return;
    fetch(GEAR_SUPA_URL + '/rest/v1/dispositivos?select=nome,criado_em,ultimo_em,user_agent&order=ultimo_em.desc', {
      headers: { 'apikey': GEAR_SUPA_KEY, 'Authorization': 'Bearer ' + GEAR_SUPA_KEY }
    }).then(function (r) { return r.json(); }).then(function (rows) {
      if (!Array.isArray(rows)) rows = [];
      if (countEl) countEl.textContent = rows.length + ' aparelho' + (rows.length !== 1 ? 's' : '') + ' já acessaram';
      if (!rows.length) { listEl.innerHTML = '<div style="text-align:center;padding:18px;color:#aaa;font-size:0.8rem;font-weight:600;">Ninguém acessou ainda</div>'; return; }
      listEl.innerHTML = rows.map(function (u) {
        var name = (u.nome || 'Anônimo').trim();
        var initials = name.charAt(0).toUpperCase() || '?';
        var device = /mobile|android|iphone/i.test(u.user_agent || '') ? '📱' : '💻';
        return '<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid #e2e8f0;background:#fff;">'
          + '<div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#0d7377,#14a085);color:#fff;font-size:0.82rem;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;">' + initials + '</div>'
          + '<div style="flex:1;min-width:0;"><div style="font-size:0.82rem;font-weight:800;color:#1a365d;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + device + ' ' + name + '</div>'
          + '<div style="font-size:0.64rem;font-weight:600;color:#888;margin-top:1px;">último: ' + gearFmtData(u.ultimo_em) + ' · 1º acesso: ' + gearFmtData(u.criado_em) + '</div></div></div>';
      }).join('');
    }).catch(function () {
      if (listEl) listEl.innerHTML = '<div style="text-align:center;padding:18px;color:#c53030;font-size:0.8rem;font-weight:600;">Erro ao carregar (sem conexão?)</div>';
    });
  };

  // ── Inicialização (após todas as funções definidas) ──
  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount);
  window.addEventListener('hashchange', function () { if (location.hash === '#gear') window.abrirGear(); });
})();
