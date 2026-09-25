/* ============================================================
   Mariuá — Identidade do dispositivo · v5
   O sistema só abre com login (mariua-auth.js), então este arquivo
   NÃO pergunta nome nenhum. Ele só:
   - espera o login terminar e pega o nome da conta que entrou;
   - guarda esse nome no aparelho (localStorage 'mariua_user') e no
     "quem está online" do Turno;
   - registra o acesso na tabela 'dispositivos' (aparelho -> nome, datas).
   Não mexe em window.MARIUA_USER: ele é do login (e-mail, telas, gestor).
   ============================================================ */
(function () {
  'use strict';
  var SUPA_URL = 'https://eqxejfoibebcbtsqymji.supabase.co';
  var SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxeGVqZm9pYmViY2J0c3F5bWppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NjUzMTEsImV4cCI6MjA4NzQ0MTMxMX0.lwf7_EJ6UchEOpzhW3cVKztxDGy78gaQblRvgiEwWh8';
  var LS_USER = 'mariua_user';               // nome da conta, guardado no aparelho
  var LS_DEV = 'mariua_device_id';           // id do aparelho
  var LS_PRESENCA = 'mariua_presence_name';  // nome em "quem está online" (Turno)

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

  // Conta que entrou: objeto do mariua-auth.js ({email, nome, gestor, telas}) ou o cache dele na aba
  function contaLogada(){
    var u = window.MARIUA_USER;
    if (u && typeof u === 'object' && (u.email || u.nome)) return u;
    try { var c = JSON.parse(sessionStorage.getItem('mariua_user_cache') || 'null'); if (c && (c.email || c.nome)) return c; } catch(e){}
    return null;
  }
  // Nome para mostrar. Sem nome no cadastro, o login devolve o começo do e-mail: "joao.silva" -> "Joao Silva"
  function nomeDaConta(u){
    var n = String(u.nome || '').trim().replace(/\s+/g,' ');
    var prefixo = String(u.email || '').split('@')[0];
    if (!n || n === prefixo) {
      n = String(prefixo || n).replace(/[._\-+]+/g,' ').replace(/\d+/g,' ').trim().replace(/\s+/g,' ')
            .toLowerCase().replace(/(^|\s)\S/g, function(c){ return c.toUpperCase(); });
      if (!n) n = String(u.email || 'Usuário');
    }
    return n;
  }

  var _contaUsada = '';
  function usarConta(u){
    var nome = nomeDaConta(u);
    var chave = String(u.email || '') + '|' + nome;
    if (chave === _contaUsada) return;
    _contaUsada = chave;
    var anterior = String(lsGet(LS_USER) || '').trim();
    lsSet(LS_USER, nome);
    // "quem está online": acompanha a conta, a não ser que a pessoa tenha escrito outro nome lá
    var pres = String(lsGet(LS_PRESENCA) || '').trim();
    if (!pres || pres === anterior) {
      if (typeof window.presenceSaveName === 'function') { try { window.presenceSaveName(nome); } catch(e){ lsSet(LS_PRESENCA, nome); } }
      else lsSet(LS_PRESENCA, nome);
    }
    registrar(deviceId(), nome, !anterior);
    document.dispatchEvent(new CustomEvent('mariua:user', { detail: { nome: nome, email: String(u.email || '') } }));
  }

  // Espera o login (a pessoa pode estar digitando a senha). O cache da aba vale na hora;
  // segue conferindo até o login confirmar a conta.
  function start(){
    var n = 0;
    (function esperar(){
      var u = contaLogada();
      if (u) usarConta(u);
      var confirmado = window.MARIUA_USER && typeof window.MARIUA_USER === 'object';
      if (!confirmado && ++n < 2000) setTimeout(esperar, 600);   // até ~20 min
    })();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  // Trocar de usuário = sair da conta e entrar com outra (quem identifica é o login)
  window.mariuaTrocarUsuario = function(){
    if (typeof window.mariuaSair === 'function') window.mariuaSair();
    else location.reload();
  };

  // Abre a configuração disponível na página (varia conforme a tela)
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
  // O cartão de perfil (avatar) é o do mariua-auth.js: conta, telas liberadas e "Sair".
})();
