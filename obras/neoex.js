/* ===================== NEOEX (standalone) — comparação GPM × planilha do René ===================== */
(function(){
  var neoexGPM = null;       // { 'B-xxxx': {covas,postes,estrutura,cabo,poda,ligacaoFlag} }
  var neoexFiltro = 'todos';
  var neoexLinhas = [];

  function num(s){
    s = (s==null?'':String(s)).trim();
    if(!s) return 0;
    s = s.replace(/\./g,'').replace(',', '.');
    var v = parseFloat(s);
    return isNaN(v) ? 0 : v;
  }
  function numReve(s){
    s = (s==null?'':String(s)).trim();
    if(!s) return null;
    s = s.replace(/\./g,'').replace(',', '.');
    var v = parseFloat(s);
    return isNaN(v) ? null : v;
  }

  function categoria(a, grupo){
    a = (a||'').toUpperCase();
    grupo = (grupo||'').toUpperCase();
    if(a.indexOf('CAVA') >= 0) return 'covas';
    if(a.indexOf('POSTE') === 0 || a.indexOf('TRANSPORTE DE POSTE') >= 0 || a.indexOf('DISTRIBUICAO DE POSTES') >= 0) return 'postes';
    if(a.indexOf('INSTALAR EST') >= 0 || a.indexOf('INST EST') === 0) return 'estrutura';
    if(a.indexOf('CONDUTOR') >= 0 || a.indexOf('CABO') >= 0) return 'cabo';
    if(grupo === 'PODA' || a.indexOf('ARVORE') >= 0 || a.indexOf('ABERTURA DE FAIXA') >= 0 || a.indexOf('PODA') >= 0) return 'poda';
    if(a.indexOf('LIGA\u00c7\u00c3O DE CLIENTE') >= 0 || a.indexOf('LIGACAO DE CLIENTE') >= 0 || grupo === 'LC' ||
       a.indexOf('RAMAL DE LIG') >= 0 || a.indexOf('MEDIDOR') >= 0 || a.indexOf('INSTALACAO INTERNA') >= 0) return 'ligacao';
    return null;
  }

  function parseCSVSemicolon(text){
    if(text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    var linhas = [];
    var i=0, campo='', linha=[], dentroAspas=false;
    while(i < text.length){
      var c = text[i];
      if(dentroAspas){
        if(c === '"'){ if(text[i+1] === '"'){ campo+='"'; i+=2; continue; } dentroAspas = false; i++; continue; }
        campo += c; i++; continue;
      }
      if(c === '"'){ dentroAspas = true; i++; continue; }
      if(c === ';'){ linha.push(campo); campo=''; i++; continue; }
      if(c === '\n'){ linha.push(campo); linhas.push(linha); linha=[]; campo=''; i++; continue; }
      if(c === '\r'){ i++; continue; }
      campo += c; i++;
    }
    if(campo.length || linha.length){ linha.push(campo); linhas.push(linha); }
    return linhas;
  }

  window.neoexImportar = function(file){
    if(!file) return;
    var msg = document.getElementById('neoex-import-msg');
    function showMsg(txt, ok){
      msg.style.display='block';
      msg.style.background = ok ? '#d0f0ee' : '#fde8e8';
      msg.style.color = ok ? '#0d7377' : '#c53030';
      msg.innerHTML = txt;
    }
    var reader = new FileReader();
    reader.onload = function(e){
      try{
        var rows = parseCSVSemicolon(e.target.result);
        if(rows.length < 2){ showMsg('Arquivo vazio ou inv\u00e1lido.', false); return; }
        var hdr = rows[0].map(function(h){ return (h||'').trim(); });
        function idx(nome){ for(var k=0;k<hdr.length;k++){ if(hdr[k].toUpperCase()===nome.toUpperCase()) return k; } return -1; }
        var iSS = idx('SS/OT'); if(iSS<0) iSS=14;
        var iAtiv = idx('des_atividade'); if(iAtiv<0) iAtiv=31;
        var iQtd = idx('qtd_atividade'); if(iQtd<0) iQtd=34;
        var iGrupo = idx('des_grupo'); if(iGrupo<0) iGrupo=28;

        var agg = {}, nLinhas = 0;
        for(var r=1; r<rows.length; r++){
          var row = rows[r];
          if(!row || row.length <= iAtiv) continue;
          var bp = (row[iSS]||'').trim();
          if(bp.indexOf('B-') !== 0) continue;
          var cat = categoria(row[iAtiv], row[iGrupo]);
          var q = num(row[iQtd]);
          if(!agg[bp]) agg[bp] = {covas:0,postes:0,estrutura:0,cabo:0,poda:0,ligacao:0,ligacaoFlag:false};
          if(cat){ agg[bp][cat] += q; if(cat==='ligacao' && q>0) agg[bp].ligacaoFlag = true; }
          nLinhas++;
        }
        neoexGPM = agg;
        var nObras = Object.keys(agg).length;
        showMsg('\u2705 GPM importado: <b>'+nObras+'</b> obras (B-) \u00b7 '+nLinhas+' linhas processadas', true);
        document.getElementById('neoex-drop').style.borderColor = '#14a085';
        neoexMontar();
      }catch(err){ showMsg('Erro ao ler o arquivo: '+err.message, false); }
    };
    reader.onerror = function(){ showMsg('N\u00e3o foi poss\u00edvel ler o arquivo.', false); };
    reader.readAsText(file, 'utf-8');
  };

  // lê a planilha do René (obras_base) direto do Supabase
  function neoexCarregarBase(){
    var st = document.getElementById('neoex-base-status');
    return fetch(SUPA_URL + '/rest/v1/turno_data?select=value&key=eq.obras_base&limit=1', {
      headers: { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + SUPA_KEY }
    }).then(function(r){ return r.json(); }).then(function(arr){
      var val = (arr && arr[0] && arr[0].value) ? arr[0].value : null;
      var data = val && val.data ? val.data : null;
      neoexBanco = data || [];
      if(neoexBanco.length){
        st.textContent = 'Planilha do Ren\u00e9: ' + neoexBanco.length + ' obras carregadas \u2713';
        st.style.background = 'rgba(255,255,255,0.22)';
      } else {
        st.textContent = 'Planilha do Ren\u00e9: vazia \u2014 abra o MAPA para sincronizar';
      }
      return neoexBanco;
    }).catch(function(){
      neoexBanco = [];
      st.textContent = 'Planilha do Ren\u00e9: erro ao carregar';
      return neoexBanco;
    });
  }

  // ===== MATERIAIS (planilha ao vivo via gviz) =====
  var neoexMateriais = null; // { 'B-xxx': {itens, concluidos, avanco, somaNec, somaMov} }
  var NEOEX_MAT_SHEET = '187jP2WPva-xbotAcAcuY9EFsP-7dbITtlNNfBOk_M1s';

  function parseCSVComma(text){
    if(text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    var linhas=[], i=0, campo='', linha=[], aspas=false;
    while(i<text.length){
      var c=text[i];
      if(aspas){
        if(c==='"'){ if(text[i+1]==='"'){campo+='"';i+=2;continue;} aspas=false;i++;continue; }
        campo+=c;i++;continue;
      }
      if(c==='"'){aspas=true;i++;continue;}
      if(c===','){linha.push(campo);campo='';i++;continue;}
      if(c==='\n'){linha.push(campo);linhas.push(linha);linha=[];campo='';i++;continue;}
      if(c==='\r'){i++;continue;}
      campo+=c;i++;
    }
    if(campo.length||linha.length){linha.push(campo);linhas.push(linha);}
    return linhas;
  }
  function numMat(s){
    s=(s==null?'':String(s)).trim();
    if(!s) return 0;
    s=s.replace('%','').replace(/\./g,'').replace(',', '.');
    var v=parseFloat(s); return isNaN(v)?0:v;
  }
  function pctMat(s){
    // AVANÇO pode vir "100%", "0.5", "50%" — normaliza para 0..100
    s=(s==null?'':String(s)).trim();
    if(!s) return 0;
    var temPct = s.indexOf('%')>=0;
    s=s.replace('%','').replace(',', '.');
    var v=parseFloat(s); if(isNaN(v)) return 0;
    if(!temPct && v<=1) v=v*100; // fração 0..1 -> %
    return v;
  }

  function neoexCarregarMateriais(){
    var st = document.getElementById('neoex-mat-status');
    var url = 'https://docs.google.com/spreadsheets/d/'+NEOEX_MAT_SHEET+'/gviz/tq?tqx=out:csv&sheet=P%C3%A1gina1';
    return fetch(url).then(function(r){ return r.text(); }).then(function(txt){
      var rows = parseCSVComma(txt);
      if(!rows.length){ neoexMateriais={}; if(st) st.textContent='Materiais: vazio'; return neoexMateriais; }
      // localizar colunas por nome no cabeçalho
      var hdr = rows[0].map(function(h){return (h||'').trim().toUpperCase();});
      function col(nome){ for(var k=0;k<hdr.length;k++){ if(hdr[k]===nome) return k; } return -1; }
      var iPep=col('PEP'); if(iPep<0) iPep=1;
      var iNec=col('NECESSIDADE'); if(iNec<0) iNec=10;
      var iMov=col('MOVIMENTADO (+)'); if(iMov<0) iMov=16;
      var iAv=col('AVANÇO'); if(iAv<0) iAv=col('AVANCO'); if(iAv<0) iAv=23;
      var agg={};
      for(var r=1;r<rows.length;r++){
        var row=rows[r]; if(!row||row.length<=iPep) continue;
        var pep=(row[iPep]||'').trim();
        if(pep.indexOf('B-')!==0) continue;
        var nec=numMat(row[iNec]);
        if(nec<=0) continue; // só itens necessários
        var mov=numMat(row[iMov]);
        var av=pctMat(row[iAv]);
        if(!agg[pep]) agg[pep]={itens:0,concluidos:0,somaAv:0,somaNec:0,somaMov:0};
        agg[pep].itens++;
        agg[pep].somaAv+=av;
        agg[pep].somaNec+=nec;
        agg[pep].somaMov+=mov;
        if(av>=100 || mov>=nec) agg[pep].concluidos++;
      }
      // fecha avanço médio
      Object.keys(agg).forEach(function(k){
        var a=agg[k];
        a.avanco = a.itens? Math.round(a.somaAv/a.itens) : 0;
      });
      neoexMateriais=agg;
      var nObras=Object.keys(agg).length;
      if(st){ st.textContent='Materiais: '+nObras+' obras \u2713'; st.style.background='rgba(255,255,255,0.22)'; }
      return neoexMateriais;
    }).catch(function(){
      neoexMateriais={};
      if(st) st.textContent='Materiais: erro ao carregar';
      return neoexMateriais;
    });
  }

  function neoexMatDe(pep){
    return (neoexMateriais && neoexMateriais[pep]) ? neoexMateriais[pep] : null;
  }
  function celMateriais(pep){
    var m = neoexMatDe(pep);
    if(!m || !m.itens){
      return '<span style="color:#ccc;font-size:0.72rem;">—</span>';
    }
    var av = m.avanco;
    var cor = av>=100?'#14a085':(av>=50?'#f0a500':'#e53e3e');
    return '<div style="min-width:90px;">'
      + '<div style="display:flex;align-items:center;justify-content:center;gap:5px;">'
      +   '<span style="font-weight:800;color:'+cor+';font-size:0.82rem;">'+av+'%</span>'
      + '</div>'
      + '<div style="height:5px;background:#edf2f4;border-radius:3px;overflow:hidden;margin-top:3px;">'
      +   '<div style="height:100%;width:'+Math.min(av,100)+'%;background:'+cor+';"></div>'
      + '</div>'
      + '<div style="font-size:0.6rem;color:#94a3b8;margin-top:2px;">'+m.concluidos+'/'+m.itens+' itens</div>'
      + '</div>';
  }


  function neoexBaseReve(){
    var base = {};
    (neoexBanco || []).forEach(function(o){
      var pep = (o['PEP OBRA'] || o.pep || '').trim();
      if(pep.indexOf('B-') !== 0) return;
      var cava = numReve(o['CAVA REALIZADA'] != null ? o['CAVA REALIZADA'] : o['CAVA  REALIZADA']);
      var post = numReve(o['POSTES REALIZADO'] != null ? o['POSTES REALIZADO'] : o['POSTES  REALIZADO']);
      base[pep] = {
        cava: cava, postR: post,
        titulo: o['T\u00cdTULO'] || o['TITULO'] || o.titulo || '',
        mun: o['MUNICIPIO'] || o['MUNIC\u00cdPIO'] || o.municipio || ''
      };
    });
    return base;
  }

  function neoexMontar(){
    // precisa de pelo menos uma fonte carregada
    if(neoexBanco===null && neoexMateriais===null && !neoexGPM) return;
    var base = neoexBaseReve();
    var peps = {};
    Object.keys(base).forEach(function(p){ peps[p]=true; });
    if(neoexMateriais) Object.keys(neoexMateriais).forEach(function(p){ peps[p]=true; });
    if(neoexGPM) Object.keys(neoexGPM).forEach(function(p){ peps[p]=true; });
    var linhas = [];
    Object.keys(peps).forEach(function(bp){
      var b = base[bp] || null;
      var g = (neoexGPM && neoexGPM[bp]) || null;
      var cavaReve = b ? b.cava : null;
      var postReve = b ? b.postR : null;
      var gCovas = g ? g.covas : null;
      var gPostes = g ? g.postes : null;
      var covasDiff = (g && cavaReve!=null) ? (gCovas - cavaReve) : null;
      var postesDiff = (g && postReve!=null) ? (gPostes - postReve) : null;
      linhas.push({
        pep: bp, titulo: b ? b.titulo : '', mun: b ? b.mun : '', temBase: !!b, temGpm: !!g,
        gCovas: gCovas, gPostes: gPostes,
        gEstrut: g ? g.estrutura : null, gCabo: g ? g.cabo : null, gPoda: g ? g.poda : null, gLig: g ? g.ligacaoFlag : false,
        rCava: cavaReve, rPost: postReve, covasDiff: covasDiff, postesDiff: postesDiff
      });
    });
    linhas.sort(function(a,b){
      var da = (a.covasDiff && Math.abs(a.covasDiff)) + (a.postesDiff && Math.abs(a.postesDiff)) || 0;
      var db = (b.covasDiff && Math.abs(b.covasDiff)) + (b.postesDiff && Math.abs(b.postesDiff)) || 0;
      if(db !== da) return db - da;
      return a.pep < b.pep ? -1 : 1;
    });
    neoexLinhas = linhas;
    neoexRenderKpis();
    document.getElementById('neoex-kpis').style.display = 'flex';
    document.getElementById('neoex-content').style.display = 'block';
    neoexRender();
  }

  function neoexRenderKpis(){
    var total = neoexLinhas.length;
    var comMat = neoexLinhas.filter(function(l){ var m=neoexMatDe(l.pep); return m&&m.itens; }).length;
    var avs = neoexLinhas.map(function(l){ var m=neoexMatDe(l.pep); return (m&&m.itens)?m.avanco:null; }).filter(function(v){ return v!=null; });
    var avMed = avs.length ? Math.round(avs.reduce(function(a,b){return a+b;},0)/avs.length) : 0;
    var temGpm = neoexLinhas.some(function(l){ return l.temGpm; });
    var comDif = neoexLinhas.filter(function(l){ return (l.covasDiff!=null && l.covasDiff!==0) || (l.postesDiff!=null && l.postesDiff!==0); }).length;
    function card(val, lbl, cor){
      return '<div style="flex:1;min-width:130px;background:#fff;border-radius:12px;padding:14px 16px;box-shadow:0 2px 10px rgba(0,0,0,0.06);border-top:3px solid '+cor+';">'
        +'<div style="font-size:1.7rem;font-weight:800;color:#2d3748;">'+val+'</div>'
        +'<div style="font-size:0.62rem;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:1px;margin-top:2px;">'+lbl+'</div></div>';
    }
    document.getElementById('neoex-kpis').innerHTML =
      card(total, 'Obras', '#0d7377') +
      card(comMat, 'Com materiais', '#2b6cb0') +
      card(avMed+'%', 'Avan\u00e7o m\u00e9dio', '#14a085') +
      card(temGpm?comDif:'\u2014', 'Com diferen\u00e7a (GPM)', '#e53e3e');
  }

  window.neoexSetFiltro = function(f){
    neoexFiltro = f;
    ['todos','div','ok','so-gpm'].forEach(function(k){
      var btn = document.getElementById('neoex-fbtn-'+k);
      if(!btn) return;
      var on = k===f;
      btn.style.background = on ? '#0d7377' : '#fff';
      btn.style.color = on ? '#fff' : '#666';
      btn.style.borderColor = on ? '#0d7377' : '#e2e8f0';
    });
    neoexRender();
  };

  function esc(s){ return (s==null?'':String(s)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  function celComp(gpm, reve, diff){
    var fmt = function(v){ return v==null ? '\u2014' : (Math.round(v*100)/100); };
    if(gpm == null){
      // sem GPM importado: mostra apenas o valor do René
      if(reve == null) return '<span style="color:#ccc;">\u2014</span>';
      return '<div style="font-weight:700;color:#888;">'+fmt(reve)+'</div><div style="font-size:0.6rem;color:#bbb;">René</div>';
    }
    if(reve == null){
      return '<div style="font-weight:800;color:#1a365d;">'+fmt(gpm)+'</div><div style="font-size:0.6rem;color:#bbb;">sem Ren\u00e9</div>';
    }
    var cor = diff===0 ? '#14a085' : '#e53e3e';
    var sinal = diff>0 ? '+'+ (Math.round(diff*100)/100) : (Math.round(diff*100)/100);
    var badge = diff===0
      ? '<span style="display:inline-block;font-size:0.6rem;font-weight:800;padding:1px 6px;border-radius:5px;background:#d0f0ee;color:#0d7377;">OK</span>'
      : '<span style="display:inline-block;font-size:0.6rem;font-weight:800;padding:1px 6px;border-radius:5px;background:#fde8e8;color:#c53030;">'+sinal+'</span>';
    return '<div style="display:flex;align-items:center;justify-content:center;gap:5px;">'
      + '<span style="font-weight:800;color:'+cor+';">'+fmt(gpm)+'</span>'
      + '<span style="color:#ccc;font-size:0.7rem;">\u00d7</span>'
      + '<span style="color:#888;">'+fmt(reve)+'</span></div>'
      + '<div style="margin-top:2px;">'+badge+'</div>';
  }

  window.neoexRender = function(){
    var tb = document.getElementById('neoex-tbody');
    var empty = document.getElementById('neoex-empty');
    if(!tb) return;
    var q = (document.getElementById('neoex-search').value || '').toLowerCase().trim();
    var linhas = neoexLinhas.filter(function(l){
      if(neoexFiltro==='div' && !((l.covasDiff!=null&&l.covasDiff!==0)||(l.postesDiff!=null&&l.postesDiff!==0))) return false;
      if(neoexFiltro==='ok' && !l.temBase) return false;
      if(neoexFiltro==='ok' && !((l.covasDiff===0||l.covasDiff==null) && (l.postesDiff===0||l.postesDiff==null))) return false;
      if(neoexFiltro==='so-gpm' && l.temBase) return false;
      if(q){ var hay=(l.pep+' '+l.titulo+' '+l.mun).toLowerCase(); if(hay.indexOf(q)<0) return false; }
      return true;
    });
    if(!linhas.length){ tb.innerHTML=''; empty.style.display='block'; return; }
    empty.style.display='none';
    var html = '';
    linhas.forEach(function(l){
      var temDif = (l.covasDiff!=null&&l.covasDiff!==0)||(l.postesDiff!=null&&l.postesDiff!==0);
      var borda = temDif ? 'border-left:3px solid #e53e3e;' : (l.temBase ? 'border-left:3px solid #14a085;' : 'border-left:3px solid #f0a500;');
      html += '<tr style="border-bottom:1px solid #edf0f2;'+borda+'">'
        + '<td style="padding:10px 12px;"><div style="font-weight:800;color:#0d7377;font-size:0.78rem;">'+esc(l.pep)+'</div>'
          + '<div style="font-size:0.68rem;color:#555;font-weight:600;max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+esc(l.titulo||'\u2014')+'</div>'
          + (l.mun?'<div style="font-size:0.62rem;color:#aaa;">'+esc(l.mun)+'</div>':'')
          + (!l.temBase?'<div style="font-size:0.6rem;color:#b97400;font-weight:800;">\u26a0\ufe0f n\u00e3o est\u00e1 na planilha do Ren\u00e9</div>':'')+'</td>'
        + '<td style="padding:8px;text-align:center;">'+celComp(l.gCovas, l.rCava, l.covasDiff)+'</td>'
        + '<td style="padding:8px;text-align:center;">'+celComp(l.gPostes, l.rPost, l.postesDiff)+'</td>'
        + '<td style="padding:8px;text-align:center;font-weight:700;color:#1a365d;">'+(l.gEstrut==null?'<span style="color:#ccc;">\u2014</span>':l.gEstrut)+'</td>'
        + '<td style="padding:8px;text-align:center;font-weight:700;color:#1a365d;">'+(l.gCabo==null?'<span style="color:#ccc;">\u2014</span>':Math.round(l.gCabo))+'</td>'
        + '<td style="padding:8px;text-align:center;font-weight:700;color:#6b21a8;">'+(l.gPoda==null?'<span style="color:#ccc;">\u2014</span>':Math.round(l.gPoda))+'</td>'
        + '<td style="padding:8px;text-align:center;">'+(l.gLig?'<span style="display:inline-block;font-size:0.62rem;font-weight:800;padding:2px 9px;border-radius:5px;background:#d0f0ee;color:#0d7377;">SIM</span>':'<span style="color:#ccc;">\u2014</span>')+'</td>'
        + '<td style="padding:8px 10px;text-align:center;">'+celMateriais(l.pep)+'</td>'
        + '</tr>';
    });
    tb.innerHTML = html;
  };

  window.neoexExportCSV = function(){
    if(!neoexLinhas.length){ alert('Nenhuma obra carregada ainda.'); return; }
    var sep = ';';
    var head = ['B-','OBRA','MUNICIPIO','GPM_COVAS','RENE_CAVA','DIF_COVAS','GPM_POSTES','RENE_POSTES','DIF_POSTES','GPM_ESTRUTURA','GPM_CABO_M','GPM_PODA','GPM_LIGACAO','SO_NO_GPM','MAT_AVANCO','MAT_ITENS','MAT_CONCLUIDOS'];
    var linhas = [head.join(sep)];
    neoexLinhas.forEach(function(l){
      var m = neoexMatDe(l.pep);
      linhas.push([
        l.pep, '"'+(l.titulo||'').replace(/"/g,'""')+'"', '"'+(l.mun||'')+'"',
        l.gCovas, l.rCava==null?'':l.rCava, l.covasDiff==null?'':l.covasDiff,
        l.gPostes, l.rPost==null?'':l.rPost, l.postesDiff==null?'':l.postesDiff,
        l.gEstrut, Math.round(l.gCabo), Math.round(l.gPoda), l.gLig?'SIM':'NAO', l.temBase?'NAO':'SIM',
        m?m.avanco+'%':'', m?m.itens:'', m?m.concluidos:''
      ].join(sep));
    });
    var blob = new Blob(['\ufeff'+linhas.join('\n')], {type:'text/csv;charset=utf-8;'});
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'neoex_comparacao.csv'; a.click();
  };

  // carrega base do René e materiais ao abrir; monta a tabela assim que cada fonte chega
  neoexCarregarBase().then(function(){ neoexMontar(); });
  neoexCarregarMateriais().then(function(){ neoexMontar(); });
})();
