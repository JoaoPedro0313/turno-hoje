/* ============================================================
   Mariuá — Identidade do dispositivo ("login leve")
   - Na 1ª vez em QUALQUER página, pergunta o nome (uma vez).
   - Salva no navegador (vale para todas as telas) e registra no
     banco (tabela 'dispositivos': aparelho -> nome, datas de acesso).
   - Nas próximas vezes não pergunta; só registra o último acesso.
   ============================================================ */
(function () {
  'use strict';
  var SUPA_URL = 'https://eqxejfoibebcbtsqymji.supabase.co';
  var SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxeGVqZm9pYmViY2J0c3F5bWppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NjUzMTEsImV4cCI6MjA4NzQ0MTMxMX0.lwf7_EJ6UchEOpzhW3cVKztxDGy78gaQblRvgiEwWh8';
  var H = { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + SUPA_KEY, 'Content-Type': 'application/json' };
  var LS_USER = 'mariua_user';      // nome salvo
  var LS_DEV = 'mariua_device_id';  // id do aparelho

  function lsGet(k){ try { return localStorage.getItem(k); } catch(e){ return null; } }
  function lsSet(k,v){ try { localStorage.setItem(k,v); } catch(e){} }

  function deviceId(){
    var d = lsGet(LS_DEV);
    if (!d) {
      d = 'dev-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,10);
      lsSet(LS_DEV, d);
    }
    return d;
  }

  // upsert no banco (insere ou atualiza a linha do aparelho)
  function registrar(dev, nome, primeira){
    var body = { device_id: dev, nome: nome, ultimo_em: new Date().toISOString() };
    if (primeira) { body.user_agent = (navigator.userAgent || '').slice(0,300); body.criado_em = new Date().toISOString(); }
    try {
      fetch(SUPA_URL + '/rest/v1/dispositivos?on_conflict=device_id', {
        method: 'POST',
        headers: { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + SUPA_KEY, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify(body)
      }).catch(function(){});
    } catch(e){}
  }

  function expoeNome(nome){
    // disponibiliza o nome para o resto do sistema
    try { window.MARIUA_USER = nome; } catch(e){}
    document.dispatchEvent(new CustomEvent('mariua:user', { detail: { nome: nome } }));
  }

  function abrirModal(){
    if (document.getElementById('mariua-id-ov')) return;
    var ov = document.createElement('div');
    ov.id = 'mariua-id-ov';
    ov.innerHTML =
      '<div id="mariua-id-card">' +
        '<div id="mariua-id-logo">🔆 MARIUÁ</div>' +
        '<div id="mariua-id-tt">Identifique-se</div>' +
        '<div id="mariua-id-sub">Digite seu nome para continuar. Vamos lembrar deste aparelho.</div>' +
        '<input id="mariua-id-inp" type="text" autocomplete="name" placeholder="Seu nome" />' +
        '<button id="mariua-id-btn" disabled>Entrar</button>' +
      '</div>';
    var css = document.createElement('style');
    css.textContent =
      '#mariua-id-ov{position:fixed;inset:0;z-index:99999;background:rgba(7,40,38,.55);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;padding:18px;font-family:Barlow,system-ui,sans-serif}' +
      '#mariua-id-card{background:#fff;border-radius:18px;max-width:380px;width:100%;padding:26px 24px;box-shadow:0 20px 60px rgba(0,0,0,.3);text-align:center;animation:miup .18s ease}' +
      '@keyframes miup{from{transform:translateY(12px);opacity:0}to{transform:none;opacity:1}}' +
      '#mariua-id-logo{font-weight:900;color:#0d7377;letter-spacing:.04em;font-size:.95rem;margin-bottom:14px}' +
      '#mariua-id-tt{font-size:1.4rem;font-weight:800;color:#0f3a33}' +
      '#mariua-id-sub{font-size:.86rem;color:#6b7280;margin:6px 0 18px;line-height:1.45}' +
      '#mariua-id-inp{width:100%;box-sizing:border-box;padding:13px 14px;font-size:1.05rem;border:1px solid #cbd5e1;border-radius:11px;font-family:inherit;text-align:center}' +
      '#mariua-id-inp:focus{outline:none;border-color:#0d7377;box-shadow:0 0 0 3px rgba(13,115,119,.15)}' +
      '#mariua-id-btn{margin-top:14px;width:100%;padding:13px;font-size:1.05rem;font-weight:800;color:#fff;background:linear-gradient(90deg,#0d7377,#14a085);border:0;border-radius:11px;cursor:pointer;font-family:inherit}' +
      '#mariua-id-btn:disabled{opacity:.5;cursor:not-allowed}' +
      '#mariua-id-btn:not(:disabled):active{transform:translateY(1px)}';
    document.head.appendChild(css);
    document.body.appendChild(ov);
    var inp = document.getElementById('mariua-id-inp');
    var btn = document.getElementById('mariua-id-btn');
    function val(){ return (inp.value || '').trim().replace(/\s+/g,' '); }
    function check(){ btn.disabled = val().length < 2; }
    inp.addEventListener('input', check);
    inp.addEventListener('keydown', function(e){ if (e.key === 'Enter' && !btn.disabled) confirmar(); });
    btn.addEventListener('click', confirmar);
    setTimeout(function(){ try{ inp.focus(); }catch(e){} }, 60);
    function confirmar(){
      var nome = val(); if (nome.length < 2) return;
      lsSet(LS_USER, nome);
      registrar(deviceId(), nome, true);
      expoeNome(nome);
      ov.parentNode && ov.parentNode.removeChild(ov);
    }
  }

  function start(){
    var nome = lsGet(LS_USER);
    if (nome && nome.trim()) {
      expoeNome(nome.trim());
      registrar(deviceId(), nome.trim(), false); // registra o acesso (último)
    } else {
      abrirModal();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  // permite trocar de identidade depois:  mariuaTrocarUsuario()
  window.mariuaTrocarUsuario = function(){ try{ localStorage.removeItem(LS_USER); }catch(e){} abrirModal(); };

  // avatar clicável -> mostra quem está usando o aparelho e permite trocar
  // abre a configuração disponível na página (varia conforme a tela)
  window.mariuaTemConfig = function(){
    return (typeof window.abrirGear === 'function') ||
           !!document.getElementById('gear-modal') ||
           !!document.getElementById('rdo-gear-modal');
  };
  window.mariuaConfig = function(){
    if(typeof window.abrirGear === 'function'){ window.abrirGear(); return; }
    var gm=document.getElementById('gear-modal');
    if(gm){ gm.style.display='flex'; if(typeof renderManageList==='function'){ setTimeout(renderManageList,100); } return; }
    var rm=document.getElementById('rdo-gear-modal');
    if(rm){ rm.style.display='flex'; return; }
  };

  window.mariuaPerfil = function(){
    var nome = lsGet(LS_USER);
    if(!nome || !nome.trim()){ abrirModal(); return; }
    nome = nome.trim();
    var ex = document.getElementById('mariua-perfil-ov');
    if(ex){ ex.parentNode.removeChild(ex); return; } // toggle: fecha se já aberto
    var ini = nome.charAt(0).toUpperCase();
    var safe = nome.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    var temCfg = window.mariuaTemConfig();
    var ov = document.createElement('div'); ov.id = 'mariua-perfil-ov';
    ov.innerHTML =
      '<div id="mariua-perfil-menu">' +
        '<div class="mp-head"><div class="mp-av">' + ini + '</div>' +
          '<div class="mp-nm">' + safe + '<span>Identificação deste aparelho</span></div></div>' +
        (temCfg ? '<button class="mp-item" id="mariua-perfil-config"><span class="mp-ic">⚙️</span>Configurações</button>' : '') +
        '<button class="mp-item" id="mariua-perfil-trocar"><span class="mp-ic">✏️</span>Trocar nome</button>' +
      '</div>';
    if(!document.getElementById('mariua-perfil-css')){
      var css = document.createElement('style'); css.id='mariua-perfil-css';
      css.textContent =
        '#mariua-perfil-ov{position:fixed;inset:0;z-index:100000;font-family:Barlow,system-ui,sans-serif}' +
        '#mariua-perfil-menu{position:absolute;top:58px;right:12px;background:#fff;border-radius:14px;width:236px;box-shadow:0 16px 48px rgba(0,0,0,.22);padding:6px;animation:mpIn .12s ease-out}' +
        '@keyframes mpIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}' +
        '.mp-head{display:flex;align-items:center;gap:10px;padding:10px 10px 12px;border-bottom:1px solid #eef2f7;margin-bottom:6px}' +
        '.mp-av{width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#0d7377,#14a085);color:#fff;font-size:1.1rem;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0}' +
        '.mp-nm{font-size:1rem;font-weight:800;color:#0f3a33;line-height:1.25}' +
        '.mp-nm span{display:block;font-size:.7rem;font-weight:600;color:#94a3b8}' +
        '.mp-item{display:flex;align-items:center;gap:11px;width:100%;padding:11px 12px;border:0;background:none;font-family:inherit;font-size:.95rem;font-weight:700;color:#334155;cursor:pointer;border-radius:9px;text-align:left}' +
        '.mp-item:hover{background:#f0fafa;color:#0d7377}' +
        '.mp-ic{font-size:1.05rem;width:20px;text-align:center;flex-shrink:0}';
      document.head.appendChild(css);
    }
    document.body.appendChild(ov);
    function close(){ if(ov.parentNode) ov.parentNode.removeChild(ov); }
    ov.addEventListener('click', function(e){ if(e.target===ov) close(); });
    var cfg = document.getElementById('mariua-perfil-config');
    if(cfg) cfg.onclick = function(){ close(); window.mariuaConfig(); };
    document.getElementById('mariua-perfil-trocar').onclick = function(){ close(); window.mariuaTrocarUsuario(); };
  };
})();
