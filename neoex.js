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
        var btnImp = document.getElementById('neoex-import-btn');
        if(btnImp) btnImp.innerHTML = '<i class="ti ti-upload"></i> Importar outro GPM';
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
  var neoexMatItens = {};    // { 'B-xxx': [ {cod,mat,un,tipo,nec,sep,exp,mov,av} ] }
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
      var iCod=col('COD'); if(iCod<0) iCod=7;
      var iMat=col('MATERIAL'); if(iMat<0) iMat=8;
      var iUn=col('UN'); if(iUn<0) iUn=9;
      var iTipo=col('TIPO MAT'); if(iTipo<0) iTipo=6;
      var iNec=col('NECESSIDADE'); if(iNec<0) iNec=10;
      var iSep=col('SEPARADO'); if(iSep<0) iSep=12;
      var iExp=col('EXPEDIDO'); if(iExp<0) iExp=14;
      var iMov=col('MOVIMENTADO (+)'); if(iMov<0) iMov=16;
      var iAv=col('AVANÇO'); if(iAv<0) iAv=col('AVANCO'); if(iAv<0) iAv=23;
      var agg={}; neoexMatItens={};
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
        // guarda o item detalhado
        if(!neoexMatItens[pep]) neoexMatItens[pep]=[];
        neoexMatItens[pep].push({
          cod:(row[iCod]||'').trim(), mat:(row[iMat]||'').trim(), un:(row[iUn]||'').trim(),
          tipo:(row[iTipo]||'').trim(), nec:nec, sep:numMat(row[iSep]), exp:numMat(row[iExp]), mov:mov, av:av
        });
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

  // ===================== TELA: lista de obras + detalhe da obra escolhida =====================
  var neoexSel = null;   // B- da obra aberta no detalhe

  function esc(s){ return (s==null?'':String(s)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function fmtN(v){ return v==null ? '\u2014' : (Math.round(v*100)/100).toLocaleString('pt-BR'); }
  function sinal(d){ return (d>0?'+':'\u2212') + fmtN(Math.abs(d)); }
  function temDif(l){ return (l.covasDiff!=null && l.covasDiff!==0) || (l.postesDiff!=null && l.postesDiff!==0); }

  // situação mostrada na bolinha e na etiqueta
  function situacao(l){
    if(temDif(l)) return 'div';
    if(!l.temBase) return 'fora';
    if(!l.temGpm || (l.covasDiff==null && l.postesDiff==null)) return 'sem';
    return 'ok';
  }
  function rotulo(l, st){
    if(st==='div') return 'Diferen\u00e7a';
    if(st==='fora') return 'Fora da planilha';
    if(st==='ok') return 'Bate';
    return l.temGpm ? 'Sem n\u00fameros do Ren\u00e9' : 'Sem GPM';
  }
  // filtros: mesma regra de antes
  function passa(l, f){
    if(f==='div') return temDif(l);
    if(f==='ok') return l.temBase && !temDif(l);
    if(f==='so-gpm') return !l.temBase;
    return true;
  }
  function resumoLista(l, st){
    var mun = l.mun || 'sem munic\u00edpio';
    if(st==='fora') return mun + ' \u00b7 fora da planilha do Ren\u00e9';
    if(st==='div'){
      var p = [];
      if(l.covasDiff) p.push('covas ' + sinal(l.covasDiff));
      if(l.postesDiff) p.push('postes ' + sinal(l.postesDiff));
      return mun + ' \u00b7 ' + p.join(', ');
    }
    if(st==='ok') return mun + ' \u00b7 covas e postes batem';
    return mun + (l.temGpm ? ' \u00b7 Ren\u00e9 sem covas/postes' : ' \u00b7 aguardando GPM');
  }
  function frase(l, st){
    if(st==='fora') return l.temGpm
      ? 'Esta obra est\u00e1 no GPM, mas n\u00e3o aparece na planilha do Ren\u00e9.'
      : 'Esta obra aparece na planilha de materiais, mas n\u00e3o est\u00e1 na planilha do Ren\u00e9.';
    if(!l.temGpm) return 'Importe o relat\u00f3rio do GPM para comparar as covas e os postes desta obra com a planilha do Ren\u00e9.';
    if(l.covasDiff==null && l.postesDiff==null) return 'A planilha do Ren\u00e9 n\u00e3o tem covas nem postes preenchidos para esta obra.';
    function qtd(d, um, varios){ var a = Math.abs(d); return fmtN(a) + ' ' + (a===1?um:varios) + ' a ' + (d>0?'mais':'menos'); }
    var partes = [];
    if(l.covasDiff) partes.push(qtd(l.covasDiff, 'cova', 'covas'));
    if(l.postesDiff) partes.push(qtd(l.postesDiff, 'poste', 'postes'));
    if(!partes.length) return 'Covas e postes do GPM batem com a planilha do Ren\u00e9.';
    return 'O GPM tem ' + partes.join(' e ') + ' que a planilha do Ren\u00e9.';
  }
  function corAvanco(av){ return av>=100 ? 'ok' : (av>=50 ? 'meio' : 'baixo'); }

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
    // maiores diferenças primeiro
    linhas.sort(function(a,b){
      var da = (a.covasDiff && Math.abs(a.covasDiff)) + (a.postesDiff && Math.abs(a.postesDiff)) || 0;
      var db = (b.covasDiff && Math.abs(b.covasDiff)) + (b.postesDiff && Math.abs(b.postesDiff)) || 0;
      if(db !== da) return db - da;
      return a.pep < b.pep ? -1 : 1;
    });
    neoexLinhas = linhas;
    var carregando = document.getElementById('neoex-carregando');
    if(carregando) carregando.style.display = 'none';
    document.getElementById('neoex-content').style.display = 'flex';
    neoexRenderKpis();
    neoexRender();
  }

  // contadores dos filtros + resumo de materiais
  function neoexRenderKpis(){
    ['todos','div','ok','so-gpm'].forEach(function(f){
      var el = document.getElementById('neoex-n-'+f);
      if(el) el.textContent = neoexLinhas.filter(function(l){ return passa(l, f); }).length;
    });
    var avs = neoexLinhas.map(function(l){ var m=neoexMatDe(l.pep); return (m&&m.itens)?m.avanco:null; }).filter(function(v){ return v!=null; });
    var avMed = avs.length ? Math.round(avs.reduce(function(a,b){return a+b;},0)/avs.length) : 0;
    var res = document.getElementById('neoex-kpis');
    if(res) res.textContent = neoexLinhas.length + ' obras \u00b7 ' + avs.length + ' com materiais (m\u00e9dia ' + avMed + '%)'
      + (neoexGPM ? '' : ' \u00b7 GPM ainda n\u00e3o importado');
  }

  window.neoexSetFiltro = function(f){
    neoexFiltro = f;
    ['todos','div','ok','so-gpm'].forEach(function(k){
      var btn = document.getElementById('neoex-fbtn-'+k);
      if(!btn) return;
      btn.classList.toggle('on', k===f);
      btn.setAttribute('aria-pressed', k===f ? 'true' : 'false');
    });
    neoexRender();
  };

  // monta a lista da esquerda e abre o detalhe da obra escolhida
  window.neoexRender = function(){
    var box = document.getElementById('neoex-itens');
    var empty = document.getElementById('neoex-empty');
    if(!box) return;
    var q = (document.getElementById('neoex-search').value || '').toLowerCase().trim();
    var linhas = neoexLinhas.filter(function(l){
      if(!passa(l, neoexFiltro)) return false;
      if(q){ var hay=(l.pep+' '+l.titulo+' '+l.mun).toLowerCase(); if(hay.indexOf(q)<0) return false; }
      return true;
    });
    if(!linhas.some(function(l){ return l.pep===neoexSel; })) neoexSel = linhas.length ? linhas[0].pep : null;
    if(empty) empty.style.display = linhas.length ? 'none' : 'block';
    box.innerHTML = linhas.map(function(l){
      var st = situacao(l), m = neoexMatDe(l.pep), on = l.pep===neoexSel;
      return '<button type="button" class="nx-item'+(on?' on':'')+'" data-pep="'+esc(l.pep)+'" aria-pressed="'+(on?'true':'false')+'">'
        + '<span class="nx-dot '+st+'" title="'+esc(rotulo(l, st))+'"></span>'
        + '<span class="nx-item-tx">'
        +   '<span class="nx-item-pep">'+esc(l.pep)+'</span>'
        +   '<span class="nx-item-nome">'+esc(l.titulo || 'Obra sem t\u00edtulo na planilha')+'</span>'
        +   '<span class="nx-item-res">'+esc(resumoLista(l, st))+'</span>'
        + '</span>'
        + (m && m.itens ? '<span class="nx-item-mat nx-av-'+corAvanco(m.avanco)+'">'+m.avanco+'%</span>' : '')
        + '</button>';
    }).join('');
    neoexRenderDetalhe();
  };

  function neoexRenderDetalhe(){
    var det = document.getElementById('neoex-detalhe');
    if(!det) return;
    var l = neoexLinhas.filter(function(x){ return x.pep===neoexSel; })[0];
    if(!l){
      det.innerHTML = '<div class="nx-vazio"><i class="ti ti-list-search" style="font-size:2rem;"></i><div style="margin-top:8px;">Nenhuma obra neste filtro.</div></div>';
      return;
    }
    var st = situacao(l), m = neoexMatDe(l.pep), itens = neoexMatItens[l.pep] || [];

    function bloco(titulo, g, r, d){
      var max = Math.max(g||0, r||0) || 1;
      var chip = d==null ? '' : (d===0 ? '<span class="nx-dif zero">Bate</span>' : '<span class="nx-dif">'+sinal(d)+'</span>');
      return '<div class="nx-bloco"><div class="nx-bloco-topo"><h3 class="nx-h3">'+titulo+'</h3>'+chip+'</div>'
        + '<div class="nx-barras">'
        +   '<span>GPM</span><div class="nx-trilho"><i style="width:'+Math.round((g||0)/max*100)+'%"></i></div><strong>'+fmtN(g)+'</strong>'
        +   '<span>Ren\u00e9</span><div class="nx-trilho"><i class="rene" style="width:'+Math.round((r||0)/max*100)+'%"></i></div><strong class="rene">'+fmtN(r)+'</strong>'
        + '</div></div>';
    }
    function exec(valor, nome){ return '<div><strong>'+valor+'</strong><span>'+nome+'</span></div>'; }
    var semG = !l.temGpm;

    var mat;
    if(!m || !m.itens){
      mat = '<p class="nx-mat-sub" style="margin-top:6px;">Este B- n\u00e3o aparece na planilha de materiais.</p>';
    } else {
      var arr = itens.slice().sort(function(a,b){ return a.av - b.av; });   // pendentes primeiro
      mat = '<div class="nx-mat-trilho"><i class="nx-bg-'+corAvanco(m.avanco)+'" style="width:'+Math.min(m.avanco,100)+'%"></i></div>'
        + '<div class="nx-tab-wrap"><table class="nx-tab"><thead><tr>'
        +   '<th class="e">C\u00f3d.</th><th class="e">Material</th><th class="c">Un</th><th>Necess.</th><th>Separ.</th><th>Exped.</th><th>Movim.</th><th>Avan\u00e7o</th>'
        + '</tr></thead><tbody>'
        + arr.map(function(it){
            return '<tr><td class="e nx-cod">'+esc(it.cod)+'</td><td class="mat">'+esc(it.mat)+'</td><td class="c">'+esc(it.un)+'</td>'
              + '<td><b>'+fmtN(it.nec)+'</b></td><td>'+fmtN(it.sep)+'</td><td>'+fmtN(it.exp)+'</td><td>'+fmtN(it.mov)+'</td>'
              + '<td><b class="nx-av-'+corAvanco(it.av)+'">'+Math.round(it.av)+'%</b></td></tr>';
          }).join('')
        + '</tbody></table></div>';
    }

    det.innerHTML =
        '<div class="nx-det-topo"><div style="min-width:0;">'
      +   '<div class="nx-det-pep">'+esc(l.pep)+'</div>'
      +   '<h2>'+esc(l.titulo || 'Obra sem t\u00edtulo na planilha')+'</h2>'
      +   (l.mun ? '<div class="nx-det-mun">'+esc(l.mun)+'</div>' : '')
      + '</div><span class="nx-pill nx-tom '+st+'">'+esc(rotulo(l, st))+'</span></div>'
      + '<p class="nx-frase nx-tom '+st+'">'+esc(frase(l, st))+'</p>'
      + '<div class="nx-comp">' + bloco('Covas', l.gCovas, l.rCava, l.covasDiff) + bloco('Postes', l.gPostes, l.rPost, l.postesDiff) + '</div>'
      + '<div><h3 class="nx-h3">Executado no GPM</h3><div class="nx-exec">'
      +   exec(semG ? '\u2014' : fmtN(l.gEstrut), 'Estruturas')
      +   exec(semG ? '\u2014' : fmtN(Math.round(l.gCabo)), 'Cabo (m)')
      +   exec(semG ? '\u2014' : fmtN(Math.round(l.gPoda)), 'Poda')
      +   exec(semG ? '\u2014' : (l.gLig ? 'Sim' : 'N\u00e3o'), 'Liga\u00e7\u00e3o de cliente')
      + '</div></div>'
      + '<div class="nx-mat"><div class="nx-mat-topo"><h3 class="nx-h3">Avan\u00e7o de materiais</h3>'
      +   (m && m.itens ? '<div><span class="nx-mat-pct nx-av-'+corAvanco(m.avanco)+'">'+m.avanco+'%</span> <span class="nx-mat-sub">'+m.concluidos+' de '+m.itens+' itens conclu\u00eddos</span></div>' : '')
      + '</div>' + mat + '</div>';
  }

  // escolhe uma obra (clique ou setas do teclado) sem remontar a lista
  function neoexSelecionar(pep, focar){
    neoexSel = pep;
    var box = document.getElementById('neoex-itens');
    if(box) Array.prototype.forEach.call(box.querySelectorAll('.nx-item'), function(b){
      var on = b.getAttribute('data-pep')===pep;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      if(on && focar){ b.focus(); b.scrollIntoView({block:'nearest'}); }
    });
    neoexRenderDetalhe();
  }
  (function(){
    var box = document.getElementById('neoex-itens');
    if(!box) return;
    box.addEventListener('click', function(e){
      var b = e.target.closest('.nx-item'); if(!b) return;
      neoexSelecionar(b.getAttribute('data-pep'), false);
      // no celular o detalhe fica embaixo da lista: rola até ele
      if(window.matchMedia('(max-width:900px)').matches){
        var det = document.getElementById('neoex-detalhe');
        if(det) det.scrollIntoView({behavior:'smooth', block:'start'});
      }
    });
    box.addEventListener('keydown', function(e){
      if(e.key!=='ArrowDown' && e.key!=='ArrowUp') return;
      var itens = Array.prototype.slice.call(box.querySelectorAll('.nx-item'));
      var i = itens.findIndex(function(b){ return b.getAttribute('data-pep')===neoexSel; });
      var j = e.key==='ArrowDown' ? Math.min(itens.length-1, i+1) : Math.max(0, i-1);
      if(itens[j]){ e.preventDefault(); neoexSelecionar(itens[j].getAttribute('data-pep'), true); }
    });
  })();

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
