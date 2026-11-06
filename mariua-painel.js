/* ============================================================================
   mariua-painel.js — DADOS E REGRAS DO PAINEL DO DIA
   ----------------------------------------------------------------------------
   Usado pelo painel.html (lista completa) e pelo index.html (resumo).

   - Lê tudo numa consulta só ao turno_data, com o LOGIN de quem está usando
     (window.MARIUA_SB, criado pelo mariua-auth.js). Se a leitura com o login
     voltar vazia, tenta a chave pública e avisa no console: é sinal de que a
     RLS ainda não libera leitura para usuários autenticados.
   - Cruza turno, programação, RDO, carteira de obras, cadastro de equipes e
     SESMT e devolve uma lista de pendências, cada uma com nível, responsável
     e um botão para a tela onde se resolve.
   - Não grava nada.

   Para mudar uma regra (horário limite, dias de obra parada...), edite REGRAS.
   ========================================================================== */
(function () {
  'use strict';

  var REGRAS = {
    horaLimiteTurno: 8,       // depois deste horário, equipe sem turno vira "crítico"
    diasObraParada: 5,        // obra em execução sem produção há este número de dias
    execucaoMinima: 0.5,      // abaixo de 50% do valor previsto vira pendência
    diasAvisoVencimento: 30,  // cursos e brigada: avisa com esta antecedência
    diasCarteiraVelha: 7,     // carteira de obras sem sincronizar há este número de dias
    horaProgramacao: 9        // depois deste horário, dia útil sem programação vira aviso
  };

  var CHAVES = ['turno', 'rdo_atual', 'prog_diaria', 'obras_base', 'cadastro_equipes',
                'sesmt_cursos', 'sesmt_brigada', 'usuario_contrato'];

  var FONTES = {
    turno:            { nome: 'Turno do dia',          tela: 'turno.html' },
    rdo_atual:        { nome: 'RDO importado',         tela: 'rdo.html' },
    prog_diaria:      { nome: 'Programação',           tela: 'prog.html' },
    obras_base:       { nome: 'Carteira de obras',     tela: 'mapa.html' },
    cadastro_equipes: { nome: 'Cadastro de equipes',   tela: 'equipes.html' },
    sesmt_cursos:     { nome: 'Cursos (SESMT)',        tela: 'vencimento_cursos.html' },
    sesmt_brigada:    { nome: 'Brigada (SESMT)',       tela: 'brigada.html' }
  };

  var BASES = {
    JAC: { id: 'jac', nome: 'Jacobina',         uf: 'ba' },
    IRC: { id: 'irc', nome: 'Irecê',            uf: 'ba' },
    FSA: { id: 'fsa', nome: 'Feira de Santana', uf: 'ba' },
    SRR: { id: 'srr', nome: 'Serrinha',         uf: 'ba' },
    PA:  { id: 'pa',  nome: 'Congonhal',        uf: 'mg' },
    ITA: { id: 'ita', nome: 'Itajubá',          uf: 'mg' },
    AJU: { id: 'aju', nome: 'Aracaju',          uf: 'se' }
  };
  var ORDEM_BASES = ['JAC', 'IRC', 'FSA', 'SRR', 'PA', 'ITA', 'AJU'];
  var NIVEL_ORDEM = { critico: 0, atencao: 1, aviso: 2 };
  var CAT_ORDEM = { turno: 0, prog: 1, rdo: 2, obras: 3, sesmt: 4, dados: 5 };

  // ─── utilidades ─────────────────────────────────────────────────────────
  function norm(s) {
    return String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toUpperCase().replace(/\s+/g, ' ').trim();
  }
  function squash(s) { return norm(s).replace(/[^A-Z0-9]/g, ''); }
  function parse(v) {
    if (typeof v === 'string') { try { return JSON.parse(v); } catch (e) { return v; } }
    return v;
  }
  function p2(n) { return String(n).padStart(2, '0'); }
  function zerar(d) { var x = new Date(d.getTime()); x.setHours(0, 0, 0, 0); return x; }
  function dataDe(s) {
    if (!s) return null;
    if (s instanceof Date) return zerar(s);
    var t = String(s).trim(), m;
    if ((m = t.match(/^(\d{4})-(\d{2})-(\d{2})/))) return new Date(+m[1], +m[2] - 1, +m[3]);
    if ((m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/))) return new Date(+m[3], +m[2] - 1, +m[1]);
    return null;
  }
  function diasEntre(a, b) { return Math.round((zerar(b) - zerar(a)) / 86400000); }
  function diasUteisDepois(a, b) {            // dias de segunda a sexta em (a, b]
    var n = 0, d = zerar(a), fim = zerar(b);
    while (d < fim) { d.setDate(d.getDate() + 1); var w = d.getDay(); if (w !== 0 && w !== 6) n++; }
    return n;
  }
  function br(d) { return d ? p2(d.getDate()) + '/' + p2(d.getMonth() + 1) : ''; }
  function moeda(v) { return 'R$ ' + Math.round(+v || 0).toLocaleString('pt-BR'); }
  var MINUSC = { DA: 1, DE: 1, DO: 1, DAS: 1, DOS: 1, E: 1 };
  function nomeProprio(s) {
    return norm(s).split(' ').filter(Boolean).map(function (w, i) {
      if (i > 0 && MINUSC[w]) return w.toLowerCase();
      return w.charAt(0) + w.slice(1).toLowerCase();
    }).join(' ');
  }
  function nomeDe(n) { return typeof n === 'string' ? n : ((n && (n.name || n.nome)) || ''); }
  function soma(lista, campo) { return lista.reduce(function (t, x) { return t + (+x[campo] || 0); }, 0); }
  function plural(n, um, varios) { return n === 1 ? um : varios.replace('#', n); }

  // ─── bases ──────────────────────────────────────────────────────────────
  function baseDoCodigo(code) {
    var n = norm(code), m = n.match(/-(IRC|JAC|FSA|SRR|AJU|PA|ITA)$/);
    if (m) return BASES[m[1]];
    if (/^(CON.?MNT|EQUIPE\b)/.test(n)) return BASES.PA;   // turmas de MG pelo nome novo ou antigo
    return null;
  }
  function baseDoTexto(t) {
    var n = norm(t);
    if (!n) return null;
    if (/JACOBINA|\bJAC\b/.test(n)) return BASES.JAC;
    if (/IRECE|\bIRC\b/.test(n)) return BASES.IRC;
    if (/SERRINHA|\bSRR\b/.test(n)) return BASES.SRR;
    if (/FEIRA|\bFSA\b/.test(n)) return BASES.FSA;
    if (/ARACAJU|\bAJU\b/.test(n)) return BASES.AJU;
    if (/ITAJUBA|\bITA\b/.test(n)) return BASES.ITA;
    if (/CONGONHAL|POUSO ALEGRE|\bPA\b/.test(n)) return BASES.PA;
    return null;
  }
  function raizDoCodigo(code) { return norm(code).replace(/-(IRC|JAC|FSA|SRR|AJU|PA|ITA)$/, ''); }
  function nomesBatem(a, b) {                 // "DOUGLAS MELO" x "DOUGLAS ALEXANDRE DE MELO"
    var ta = norm(a).split(' ').filter(Boolean), tb = norm(b).split(' ').filter(Boolean);
    if (!ta.length || !tb.length || ta[0] !== tb[0]) return false;
    var menor = ta.length <= tb.length ? ta : tb, maior = menor === ta ? tb : ta;
    return menor.every(function (t) { return MINUSC[t] || maior.indexOf(t) >= 0; });
  }

  // ─── leitura do banco ───────────────────────────────────────────────────
  function lerAnonimo(sb) {
    var url = sb.supabaseUrl, key = sb.supabaseKey;
    if (!url || !key) return Promise.resolve([]);
    return fetch(url + '/rest/v1/turno_data?select=key,value,updated_at&key=in.(' + CHAVES.join(',') + ')', {
      headers: { apikey: key, Authorization: 'Bearer ' + key }
    }).then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; });
  }

  function carregar() {
    var sb = window.MARIUA_SB;
    if (!sb) return Promise.reject(new Error('O login ainda não terminou.'));
    return sb.from('turno_data').select('key,value,updated_at').in('key', CHAVES).then(function (r) {
      if (r.error) throw new Error(r.error.message || 'Erro ao ler o banco.');
      var linhas = r.data || [];
      if (linhas.length) return { linhas: linhas, viaAnonima: false };
      return lerAnonimo(sb).then(function (l2) {
        if (l2.length) {
          console.warn('[painel] A leitura com o login voltou vazia e só funcionou com a chave pública. ' +
            'Libere SELECT no turno_data para usuários autenticados (RLS).');
        }
        return { linhas: l2, viaAnonima: l2.length > 0 };
      });
    }).then(function (res) {
      var chaves = {};
      res.linhas.forEach(function (l) {
        chaves[l.key] = { valor: parse(l.value), atualizado: l.updated_at ? new Date(l.updated_at) : null };
      });
      API.bruto = { em: new Date(), viaAnonima: res.viaAnonima, chaves: chaves };
      // Quem não lançou RDO é medido contra quem abriu turno NAQUELE dia: busca o histórico do turno.
      var rdo = chaves.rdo_atual && chaves.rdo_atual.valor, tur = chaves.turno && chaves.turno.valor;
      var dRdo = rdo && dataDe(rdo.date), dTur = tur && dataDe(tur.date);
      if (!dRdo || (dTur && +dRdo === +dTur)) return API.bruto;
      var chaveHist = 'turno_hist_' + p2(dRdo.getDate()) + '-' + p2(dRdo.getMonth() + 1) + '-' + dRdo.getFullYear();
      return sb.from('turno_data').select('key,value').eq('key', chaveHist).then(function (r) {
        var l = r && !r.error && r.data && r.data[0];
        if (l) chaves.turno_rdo = { valor: parse(l.value), atualizado: null };
        return API.bruto;
      }, function () { return API.bruto; });
    });
  }

  // ─── contrato do usuário (OBRAS - BA, CON_MANUT - MG, OBRAS - SE) ────────
  var REGRAS_UF = [
    ['se', /\b(SE|SERGIPE|ARACAJU|AJU)\b/],
    ['ba', /\b(BA|BAHIA|IRECE|IRC|JACOBINA|JAC|FEIRA|FSA|SERRINHA|SRR)\b/],
    ['mg', /\b(MG|MINAS|CONGONHAL|ITAJUBA|ITA|POUSO ALEGRE)\b/]
  ];
  function ufsDoValor(v, prof) {
    prof = prof || 0;
    var out = [];
    function add(x) { if (out.indexOf(x) < 0) out.push(x); }
    if (v == null || prof > 4) return out;
    if (Array.isArray(v)) { v.forEach(function (x) { ufsDoValor(x, prof + 1).forEach(add); }); return out; }
    if (typeof v === 'object') {
      Object.keys(v).forEach(function (k) {
        if (v[k] === true) ufsDoValor(k, prof + 1).forEach(add);
        else if (v[k] && typeof v[k] !== 'boolean') ufsDoValor(v[k], prof + 1).forEach(add);
      });
      return out;
    }
    var t = norm(v).replace(/[-_]/g, ' ');
    REGRAS_UF.forEach(function (r) { if (r[1].test(t)) add(r[0]); });
    return out;
  }
  function estadosDoUsuario(bruto, user) {
    if (!user || user.gestor) return null;
    var c = bruto && bruto.chaves.usuario_contrato;
    if (!c || !c.valor) return null;
    var v = c.valor, email = String(user.email || '').toLowerCase(), nome = squash(user.nome);
    var achado = null;
    if (Array.isArray(v)) {
      v.forEach(function (x) {
        if (!x || typeof x !== 'object') return;
        if (String(x.email || '').toLowerCase() === email || (nome && squash(x.nome) === nome)) achado = x;
      });
      if (achado) achado = achado.contratos || achado.contrato || achado.estados || achado;
    } else if (typeof v === 'object') {
      Object.keys(v).forEach(function (k) {
        if (k.toLowerCase() === email || (nome && squash(k) === nome)) achado = v[k];
      });
    }
    var ufs = achado ? ufsDoValor(achado) : [];
    return ufs.length ? ufs : null;           // nenhum contrato marcado = vê tudo
  }

  // ─── análise ────────────────────────────────────────────────────────────
  function analisar(bruto, opc) {
    opc = opc || {};
    var agora = opc.agora || new Date();
    var hoje = zerar(agora), hora = agora.getHours(), diaSemana = agora.getDay();
    var C = (bruto && bruto.chaves) || {};
    function val(k) { return C[k] ? C[k].valor : null; }
    var T = val('turno'), R = val('rdo_atual'), P = val('prog_diaria'), OB = val('obras_base'),
        CAD = val('cadastro_equipes'), CUR = val('sesmt_cursos'), BRI = val('sesmt_brigada');
    var estados = opc.estados || null, filtroBase = opc.base || '', filtroSup = norm(opc.supervisor || '');

    function passa(base, sup) {
      if (estados && base && estados.indexOf(base.uf) < 0) return false;
      if (filtroBase && (!base || base.id !== filtroBase)) return false;
      if (filtroSup && norm(sup) !== filtroSup) return false;
      return true;
    }

    // cadastro de equipes
    var cad = ((CAD && Array.isArray(CAD.equipes)) ? CAD.equipes : []).map(function (q) {
      var encN = norm(q.encarregado);
      return {
        enc: q.encarregado || '', encN: encN, toks: encN.split(' ').filter(Boolean),
        sup: q.supervisor || '', equipe: q.equipe || q.codigo || '',
        base: baseDoTexto(q.utd) || baseDoTexto(q.centro) || baseDoTexto(q.base)
      };
    }).filter(function (r) { return r.encN; });
    function cadDoCodigo(code) {
      var sq = squash(code), b = baseDoCodigo(code), raiz = squash(raizDoCodigo(code));
      var exato = cad.filter(function (r) { return r.equipe && squash(r.equipe) === sq; });
      if (exato.length === 1) return exato[0];
      var cand = cad.filter(function (r) {
        return r.toks[0] === raiz || (r.toks.length > 1 && r.toks[0] + r.toks[1] === raiz);
      });
      if (cand.length > 1 && b) {
        var mesma = cand.filter(function (r) { return r.base && r.base.id === b.id; });
        if (mesma.length) cand = mesma;
      }
      return cand.length === 1 ? cand[0] : null;
    }

    // equipes (chave = código sem espaço, hífen ou acento)
    var eq = {};
    function equipe(code) {
      var k = squash(code);
      if (!k) return null;
      if (!eq[k]) {
        var c = cadDoCodigo(code);
        eq[k] = { codigo: String(code).trim().toUpperCase(), chave: k,
                  base: baseDoCodigo(code) || (c && c.base) || null,
                  enc: c ? c.enc : '', sup: c ? c.sup : '', turno: '', obs: '' };
      }
      return eq[k];
    }

    // turno
    var tData = T ? dataDe(T.date) : null;
    var turnoHoje = !!(tData && +tData === +hoje);
    var turnoOk = [], turnoJust = [], turnoFalta = [], vistos = {};
    if (T) {
      [['ok', T.ok], ['justif', T.justif], ['falta', T.falta]].forEach(function (par) {
        (par[1] || []).forEach(function (n) {
          var e = equipe(nomeDe(n));
          if (!e || vistos[e.chave]) return;
          vistos[e.chave] = 1;
          e.turno = par[0];
          if (par[0] === 'justif') e.obs = (n && n.obs) || '';
          (par[0] === 'ok' ? turnoOk : par[0] === 'justif' ? turnoJust : turnoFalta).push(e);
        });
      });
    }
    var ativos = turnoOk.concat(turnoJust, turnoFalta);

    // RDO
    var rData = R ? dataDe(R.date) : null;
    var rdoLanc = (R && R.lancou && typeof R.lancou === 'object') ? Object.keys(R.lancou) : [];
    var rdoJust = (R && R.justif && typeof R.justif === 'object') ? Object.keys(R.justif) : [];
    var lancSet = {}, justSet = {};
    rdoLanc.forEach(function (c) { var e = equipe(c); if (e) lancSet[e.chave] = 1; });
    rdoJust.forEach(function (c) { var e = equipe(c); if (e) justSet[e.chave] = 1; });

    // programação: liga o encarregado do registro à equipe do turno
    var porRaiz = {};
    Object.keys(eq).forEach(function (k) {
      var rz = squash(raizDoCodigo(eq[k].codigo));
      (porRaiz[rz] = porRaiz[rz] || []).push(eq[k]);
    });
    var cacheLig = {};
    function ligar(encN) {
      if (!encN) return null;
      if (encN in cacheLig) return cacheLig[encN];
      var t = encN.split(' ').filter(Boolean), cand = [];
      (porRaiz[t[0]] || []).concat(t.length > 1 ? (porRaiz[t[0] + t[1]] || []) : []).forEach(function (e) {
        if (cand.indexOf(e) < 0) cand.push(e);
      });
      if (cand.length > 1) {
        var c = cad.filter(function (r) { return r.encN === encN || nomesBatem(r.encN, encN); })[0];
        if (c && c.base) {
          var mesma = cand.filter(function (e) { return e.base && e.base.id === c.base.id; });
          if (mesma.length) cand = mesma;
        }
      }
      if (cand.length > 1) {
        var porNome = cand.filter(function (e) { return e.enc && nomesBatem(e.enc, encN); });
        if (porNome.length === 1) cand = porNome;
      }
      return (cacheLig[encN] = cand.length === 1 ? cand[0] : null);
    }
    var regsBrutos = Array.isArray(P) ? P : ((P && Array.isArray(P.registros)) ? P.registros : []);
    var regs = regsBrutos.map(function (r) {
      var d = dataDe(r && r.data);
      if (!d) return null;
      var x = {
        r: r, d: d, enc: r.encarregado || '', encN: norm(r.encarregado),
        pep: norm(r.pep).replace(/\s/g, ''), obra: r.nome_obra || '', atv: r.atividade || '',
        prev: +r.valor_previsto || 0, real: +r.valor_realizado || 0,
        qReal: +r.qtd_realizado || 0, st: norm(r.status), sup: r.supervisor || ''
      };
      x.eq = ligar(x.encN);
      if (x.eq && !x.eq.sup && x.sup) x.eq.sup = x.sup;
      if (x.eq && !x.eq.enc && x.enc) x.eq.enc = x.enc;
      return x;
    }).filter(Boolean);
    var regsHoje = regs.filter(function (x) { return +x.d === +hoje; });
    var cobertura = {};
    regs.forEach(function (x) { if (x.eq && x.eq.base && diasEntre(x.d, hoje) <= 30) cobertura[x.eq.base.id] = 1; });
    var semLigacao = regsHoje.filter(function (x) { return !x.eq; }).length;

    // carteira de obras
    var obrasArr = (OB && Array.isArray(OB.data)) ? OB.data : (Array.isArray(OB) ? OB : []);
    var obras = {}, listaObras = [];
    obrasArr.forEach(function (o) {
      var pep = norm(o['PEP OBRA'] || o.pep).replace(/\s/g, '');
      if (!pep || obras[pep]) return;
      var ob = { pep: pep, titulo: o['TÍTULO'] || o['TITULO'] || o.titulo || '',
                 mun: o['MUNICIPIO'] || o['MUNICÍPIO'] || o.municipio || '',
                 status: norm(o['STATUS DA OBRA'] || o.status), statusTxt: o['STATUS DA OBRA'] || o.status || '',
                 base: baseDoTexto(o['_UTD']), enc: o['ENCARREGADO'] || '' };
      obras[pep] = ob; listaObras.push(ob);
    });

    // ── pendências ──────────────────────────────────────────────────────
    var itens = [];
    function add(it) {
      if (!it.global && !passa(it.base || null, it.resp || '')) return;
      it.base = it.base || null;
      it.resp = it.resp ? nomeProprio(it.resp) : '';
      it.peso = it.peso || 0;
      itens.push(it);
    }
    var depoisLimite = hora >= REGRAS.horaLimiteTurno;
    var limiteTxt = p2(REGRAS.horaLimiteTurno) + ':00';

    // Turno
    if (!T) {
      add({ cat: 'dados', nivel: 'aviso', grupo: 'dados-turno', global: true,
            titulo: 'Nenhum turno salvo no banco', detalhe: 'Importe o arquivo de turno para o painel funcionar.',
            alvo: 'Turno', acao: { texto: 'Abrir o Turno', href: 'turno.html' } });
    } else if (!turnoHoje) {
      add({ cat: 'turno', nivel: (depoisLimite && diaSemana !== 0) ? 'atencao' : 'aviso', grupo: 'turno-sem-importar',
            global: true, titulo: 'O turno de hoje ainda não foi importado',
            detalhe: 'O último turno salvo é de ' + (T.date || 'data desconhecida') + '.',
            alvo: 'Turno', desde: T.date || '', acao: { texto: 'Abrir o Turno', href: 'turno.html' } });
    } else {
      turnoFalta.forEach(function (e) {
        var ph = regsHoje.filter(function (x) { return x.eq === e; });
        var det = [];
        if (e.enc) det.push('Encarregado ' + nomeProprio(e.enc));
        if (ph.length) det.push(plural(ph.length, '1 frente programada', '# frentes programadas') + ' (' + moeda(soma(ph, 'prev')) + ')');
        add({ cat: 'turno', nivel: depoisLimite ? 'critico' : 'aviso', grupo: 'turno-nao-abriu',
              titulo: depoisLimite ? 'Não abriu turno' : 'Ainda não abriu turno',
              detalhe: det.join('. ') || 'Encarregado não encontrado no cadastro.',
              alvo: e.codigo, base: e.base, resp: e.sup, desde: depoisLimite ? limiteTxt : 'hoje',
              acao: { texto: 'Abrir no Turno', href: 'turno.html' }, peso: ph.length ? 0 : 1 });
      });
      turnoJust.forEach(function (e) {
        if (String(e.obs || '').trim()) return;
        add({ cat: 'turno', nivel: 'atencao', grupo: 'turno-justif-sem-motivo', titulo: 'Falta justificada sem motivo',
              detalhe: 'Escreva o motivo no Turno para o relatório de faltas sair completo.',
              alvo: e.codigo, base: e.base, resp: e.sup, desde: 'hoje',
              acao: { texto: 'Abrir no Turno', href: 'turno.html' } });
      });
      if (regsHoje.length) {
        turnoOk.forEach(function (e) {
          if (!e.base || !cobertura[e.base.id]) return;
          if (regsHoje.some(function (x) { return x.eq === e; })) return;
          add({ cat: 'turno', nivel: 'atencao', grupo: 'turno-sem-prog', titulo: 'Abriu turno sem programação',
                detalhe: e.enc ? 'Encarregado ' + nomeProprio(e.enc) : 'Nenhuma frente lançada para esta equipe hoje.',
                alvo: e.codigo, base: e.base, resp: e.sup, desde: 'hoje',
                acao: { texto: 'Programar', href: 'prog.html' } });
        });
      }
    }

    // Programação
    var antes = regs.filter(function (x) { return x.d < hoje; });
    var D = antes.reduce(function (m, x) { return (!m || x.d > m) ? x.d : m; }, null);
    var Drecente = !!(D && diasEntre(D, hoje) <= 7);   // pendências de execução só valem para programação recente
    if (regs.length && !regsHoje.length && diaSemana >= 1 && diaSemana <= 5 && hora >= REGRAS.horaProgramacao) {
      var ultima = regs.reduce(function (m, x) { return (!m || x.d > m) ? x.d : m; }, null);
      add({ cat: 'prog', nivel: 'aviso', grupo: 'prog-vazia', global: true, titulo: 'Nenhuma frente programada para hoje',
            detalhe: 'A programação mais recente é de ' + br(ultima) + '.', alvo: 'Programação',
            acao: { texto: 'Abrir a Programação', href: 'prog.html' } });
    }
    var execResumo = null;
    if (D) {
      var doDia = antes.filter(function (x) { return +x.d === +D; });
      var grupos = {};
      doDia.forEach(function (x) {
        var k = x.eq ? 'E' + x.eq.chave : 'N' + x.encN;
        (grupos[k] = grupos[k] || []).push(x);
      });
      var prevF = 0, realF = 0;
      Object.keys(grupos).forEach(function (k) {
        var g = grupos[k], x0 = g[0], e = x0.eq;
        var base = e ? e.base : null, sup = (e && e.sup) || x0.sup;
        if (!passa(base, sup)) return;
        var prev = soma(g, 'prev'), real = soma(g, 'real');
        prevF += prev; realF += real;
        var semRes = g.filter(function (x) { return !x.st && x.qReal === 0; }).length;
        var alvo = e ? e.codigo : nomeProprio(x0.enc);
        if (!Drecente) return;
        if (semRes === g.length) {
          add({ cat: 'prog', nivel: 'aviso', grupo: 'prog-sem-resultado', titulo: 'Resultado de ' + br(D) + ' não lançado',
                detalhe: plural(g.length, '1 frente sem quantidade realizada', '# frentes sem quantidade realizada') + '.',
                alvo: alvo, base: base, resp: sup, desde: br(D), acao: { texto: 'Lançar resultado', href: 'prog.html' } });
        } else if (prev > 0 && real / prev < REGRAS.execucaoMinima) {
          var mot = {};
          g.forEach(function (x) { if (/CHUVA|SEM ACESSO|NAO EXECUTADO/.test(x.st)) mot[x.st] = (mot[x.st] || 0) + 1; });
          var ROT = { 'CHUVA': 'Chuva', 'SEM ACESSO': 'Sem acesso', 'NAO EXECUTADO': 'Não executado' };
          var motTxt = Object.keys(mot).map(function (m) { return (ROT[m] || m) + ' em ' + plural(mot[m], '1 frente', '# frentes'); }).join(', ');
          add({ cat: 'prog', nivel: 'atencao', grupo: 'prog-baixa',
                titulo: 'Execução abaixo de ' + Math.round(REGRAS.execucaoMinima * 100) + '% em ' + br(D),
                detalhe: 'Previsto ' + moeda(prev) + ', realizado ' + moeda(real) + ' (' + Math.round(real / prev * 100) + '%)' + (motTxt ? '. ' + motTxt : '') + '.',
                alvo: alvo, base: base, resp: sup, desde: br(D), acao: { texto: 'Ver programação', href: 'prog.html' } });
        }
      });
      execResumo = { data: D, recente: Drecente, previsto: prevF, realizado: realF, pct: prevF > 0 ? realF / prevF : null };
    }
    regsHoje.forEach(function (x) {
      if (x.st !== 'CHUVA' && x.st !== 'SEM ACESSO') return;
      add({ cat: 'prog', nivel: 'aviso', grupo: 'prog-suspensa', titulo: x.st === 'CHUVA' ? 'Frente parada por chuva' : 'Frente sem acesso',
            detalhe: [x.pep, x.atv].filter(Boolean).join(', ') + '.', alvo: x.eq ? x.eq.codigo : nomeProprio(x.enc),
            base: x.eq ? x.eq.base : null, resp: (x.eq && x.eq.sup) || x.sup, desde: 'hoje',
            acao: { texto: 'Reprogramar', href: 'prog.html' } });
    });
    var vistoFut = {};
    regs.forEach(function (x) {
      if (x.d < hoje || !x.pep) return;
      var k = x.pep + '|' + (+x.d) + '|' + x.encN;
      if (vistoFut[k]) return;
      vistoFut[k] = 1;
      var o = obras[x.pep];
      var base = x.eq ? x.eq.base : (o ? o.base : null), sup = (x.eq && x.eq.sup) || x.sup;
      if (o && /CANCELAD|RETIRAD/.test(o.status)) {
        add({ cat: 'prog', nivel: 'atencao', grupo: 'prog-obra-cancelada',
              titulo: 'Programada em obra ' + (/CANCELAD/.test(o.status) ? 'cancelada' : 'retirada da carteira'),
              detalhe: [o.titulo, nomeProprio(o.mun)].filter(Boolean).join(', ') + '. Frente de ' + br(x.d) + ' com ' + nomeProprio(x.enc) + '.',
              alvo: x.pep, base: base, resp: sup, desde: br(x.d), acao: { texto: 'Corrigir', href: 'prog.html' } });
      } else if (!o && listaObras.length) {
        add({ cat: 'prog', nivel: 'aviso', grupo: 'prog-pep-fora', titulo: 'PEP fora da carteira',
              detalhe: (x.obra || 'Obra sem nome') + '. Frente de ' + br(x.d) + ' com ' + nomeProprio(x.enc) + '.',
              alvo: x.pep, base: base, resp: sup, desde: br(x.d), acao: { texto: 'Conferir', href: 'prog.html' } });
      }
    });

    // RDO
    var rdoResumo = null;
    if (R) {
      var atraso = rData ? diasUteisDepois(rData, hoje) : 99;
      var rdoValido = rdoLanc.length > 0 && atraso <= 1;
      if (!rdoValido) {
        add({ cat: 'dados', nivel: 'aviso', grupo: 'dados-rdo', global: true,
              titulo: rData ? 'RDO sem importar desde ' + br(rData) : 'RDO ainda não importado',
              detalhe: 'Importe o arquivo de RDO para ver quem não lançou.', alvo: 'RDO',
              desde: rData ? br(rData) : '', acao: { texto: 'Abrir o RDO', href: 'rdo.html' } });
      } else {
        var TR = val('turno_rdo'), quemTrabalhou;
        if (tData && +tData === +rData) quemTrabalhou = turnoOk;
        else if (TR && Array.isArray(TR.ok)) quemTrabalhou = TR.ok.map(function (n) { return equipe(nomeDe(n)); }).filter(Boolean);
        else quemTrabalhou = ativos;
        quemTrabalhou.forEach(function (e) {
          if (lancSet[e.chave] || justSet[e.chave]) return;
          add({ cat: 'rdo', nivel: 'atencao', grupo: 'rdo-nao-lancou', titulo: 'RDO de ' + br(rData) + ' não lançado',
                detalhe: e.enc ? 'Encarregado ' + nomeProprio(e.enc) : 'Equipe ' + e.codigo,
                alvo: e.codigo, base: e.base, resp: e.sup, desde: br(rData),
                acao: { texto: 'Abrir no RDO', href: 'rdo.html' } });
        });
      }
      var lancF = Object.keys(lancSet).filter(function (k) { return eq[k] && passa(eq[k].base, eq[k].sup); }).length;
      rdoResumo = { data: rData, valido: rdoValido, lancou: lancF,
                    nao: itens.filter(function (i) { return i.grupo === 'rdo-nao-lancou'; }).length };
    }

    // Obras paradas
    var ultimaProd = {}, temFuturo = {};
    regs.forEach(function (x) {
      if (!x.pep) return;
      if (x.d >= hoje) temFuturo[x.pep] = 1;
      if (x.d <= hoje && (x.qReal > 0 || x.st === 'EXECUTADO' || x.st === 'EM EXECUCAO')) {
        if (!ultimaProd[x.pep] || x.d > ultimaProd[x.pep].d) ultimaProd[x.pep] = x;
      }
    });
    listaObras.forEach(function (o) {
      if (!/EM EXECUCAO|EM ANDAMENTO/.test(o.status)) return;
      var u = ultimaProd[o.pep];
      if (!u || temFuturo[o.pep]) return;
      var dias = diasEntre(u.d, hoje);
      if (dias < REGRAS.diasObraParada) return;
      add({ cat: 'obras', nivel: 'atencao', grupo: 'obra-parada', titulo: 'Obra sem produção há ' + dias + ' dias',
            detalhe: [o.titulo, nomeProprio(o.mun)].filter(Boolean).join(', ') + '. Última frente: ' + nomeProprio(u.enc) + ' em ' + br(u.d) + '.',
            alvo: o.pep, base: o.base || (u.eq && u.eq.base), resp: (u.eq && u.eq.sup) || u.sup, desde: br(u.d),
            acao: { texto: 'Ver estágio', href: 'estagios.html' }, peso: -dias });
    });

    // SESMT: cursos
    var cursosResumo = null;
    if (CUR && Array.isArray(CUR.dados)) {
      var nVenc = 0, nProx = 0;
      CUR.dados.forEach(function (p) {
        if (!p) return;
        var certs = p.certificados || {}, nome = p.nome || p.colaborador || p.funcionario || p.name || '';
        var base = baseDoTexto(p.base || p.filial || p.centro || p.utd);
        var venc = [], prox = [];
        Object.keys(certs).forEach(function (k) {
          var d = dataDe(certs[k]);
          if (!d) return;
          var dd = diasEntre(hoje, d);
          if (dd < 0) venc.push({ curso: k, d: d });
          else if (dd <= REGRAS.diasAvisoVencimento) prox.push({ curso: k, d: d, dd: dd });
        });
        if (!passa(base, '')) return;
        nVenc += venc.length; nProx += prox.length;
        var quem = nome ? nomeProprio(nome) : 'Colaborador sem nome';
        if (venc.length) {
          add({ cat: 'sesmt', nivel: 'critico', grupo: 'sesmt-vencido',
                titulo: venc.length === 1 ? 'Curso vencido: ' + venc[0].curso : venc.length + ' cursos vencidos',
                detalhe: venc.map(function (v) { return v.curso + ' venceu em ' + br(v.d); }).join(', ') + '.',
                alvo: quem, base: base, desde: br(venc[0].d), acao: { texto: 'Abrir cursos', href: 'vencimento_cursos.html' } });
          var dele = nome ? regsHoje.filter(function (x) { return x.encN && nomesBatem(x.encN, nome); }) : [];
          if (dele.length) {
            add({ cat: 'sesmt', nivel: 'critico', grupo: 'sesmt-escalado', titulo: 'Programado hoje com curso vencido',
                  detalhe: quem + ' é encarregado de ' + plural(dele.length, '1 frente', '# frentes') + ' hoje. Vencido: ' +
                           venc.map(function (v) { return v.curso; }).join(', ') + '.',
                  alvo: dele[0].eq ? dele[0].eq.codigo : quem, base: base || (dele[0].eq && dele[0].eq.base),
                  resp: (dele[0].eq && dele[0].eq.sup) || dele[0].sup, desde: 'hoje',
                  acao: { texto: 'Trocar na programação', href: 'prog.html' }, peso: -1 });
          }
        }
        if (prox.length) {
          add({ cat: 'sesmt', nivel: 'atencao', grupo: 'sesmt-vencendo',
                titulo: prox.length === 1 ? prox[0].curso + ' vence em ' + prox[0].dd + ' dias' : prox.length + ' cursos vencem em breve',
                detalhe: prox.map(function (v) { return v.curso + ' em ' + br(v.d); }).join(', ') + '.',
                alvo: quem, base: base, desde: '', acao: { texto: 'Agendar reciclagem', href: 'vencimento_cursos.html' } });
        }
      });
      cursosResumo = { vencidos: nVenc, proximos: nProx };
    }

    // SESMT: brigada
    var brigadaResumo = null;
    if (BRI && Array.isArray(BRI.dados)) {
      var bVenc = 0, bProx = 0;
      BRI.dados.forEach(function (d) {
        if (!d) return;
        var a = dataDe(d.recp), h = dataDe(d.hidp);
        var prox = (a && h) ? (a <= h ? a : h) : (a || h);
        if (!prox) return;
        var base = baseDoTexto(d.base || d.unidade || d.local);
        if (!passa(base, '')) return;
        var dd = diasEntre(hoje, prox), oque = (a && +prox === +a) ? 'Recarga' : 'Teste hidrostático';
        var nome = d.local || d.nome || d.descricao || d.numero || d.codigo || d.id || 'Item da brigada';
        if (dd < 0) {
          bVenc++;
          add({ cat: 'sesmt', nivel: 'critico', grupo: 'brigada-vencido', titulo: oque + (oque === 'Recarga' ? ' vencida' : ' vencido'),
                detalhe: 'Venceu em ' + br(prox) + '.', alvo: String(nome), base: base, desde: br(prox),
                acao: { texto: 'Abrir brigada', href: 'brigada.html' } });
        } else if (dd <= REGRAS.diasAvisoVencimento) {
          bProx++;
          add({ cat: 'sesmt', nivel: 'atencao', grupo: 'brigada-vencendo', titulo: oque + ' vence em ' + dd + ' dias',
                detalhe: 'Data: ' + br(prox) + '.', alvo: String(nome), base: base, desde: '',
                acao: { texto: 'Abrir brigada', href: 'brigada.html' } });
        }
      });
      brigadaResumo = { vencidos: bVenc, proximos: bProx };
    }

    // Fontes velhas
    if (C.obras_base) {
      var info = (OB && OB.info) || {}, quando = C.obras_base.atualizado || dataDe(info.updatedAt);
      var idade = quando ? diasEntre(quando, hoje) : null;
      if (idade != null && idade >= REGRAS.diasCarteiraVelha) {
        add({ cat: 'dados', nivel: 'aviso', grupo: 'dados-carteira', global: true,
              titulo: 'Carteira de obras sem sincronizar há ' + idade + ' dias',
              detalhe: 'Status das obras e obras paradas podem estar desatualizados.', alvo: 'Carteira',
              desde: br(zerar(quando)), acao: { texto: 'Sincronizar no Mapa', href: 'mapa.html' } });
      }
    }

    itens.sort(function (a, b) {
      return (NIVEL_ORDEM[a.nivel] - NIVEL_ORDEM[b.nivel]) || (CAT_ORDEM[a.cat] - CAT_ORDEM[b.cat]) ||
             (a.peso - b.peso) || String(a.alvo).localeCompare(String(b.alvo));
    });
    itens.forEach(function (it, i) { it.id = 'p' + i; });

    // ── resumo ──────────────────────────────────────────────────────────
    function f(l) { return l.filter(function (e) { return passa(e.base, e.sup); }); }
    var porBase = [];
    ORDEM_BASES.concat(['']).forEach(function (sig) {
      var b = sig ? BASES[sig] : null;
      function daBase(l) { return f(l).filter(function (e) { return b ? (e.base && e.base.id === b.id) : !e.base; }).length; }
      var linha = { base: b, ok: daBase(turnoOk), justif: daBase(turnoJust), falta: daBase(turnoFalta) };
      linha.total = linha.ok + linha.justif + linha.falta;
      if (linha.total) porBase.push(linha);
    });
    var regsHojeF = regsHoje.filter(function (x) { return passa(x.eq ? x.eq.base : null, (x.eq && x.eq.sup) || x.sup); });
    var supervisores = {};
    Object.keys(eq).forEach(function (k) { if (eq[k].sup) supervisores[nomeProprio(eq[k].sup)] = 1; });
    regs.forEach(function (x) { if (x.sup && diasEntre(x.d, hoje) <= 30) supervisores[nomeProprio(x.sup)] = 1; });
    ((CAD && CAD.supervisores) || []).forEach(function (s) { if (s && s.nome) supervisores[nomeProprio(s.nome)] = 1; });
    var basesPresentes = {};
    ativos.forEach(function (e) { if (e.base) basesPresentes[e.base.id] = e.base; });
    listaObras.forEach(function (o) { if (o.base) basesPresentes[o.base.id] = o.base; });

    var resultado = {
      em: bruto ? bruto.em : agora, agora: agora, viaAnonima: !!(bruto && bruto.viaAnonima),
      itens: itens,
      resumo: {
        turno: T ? { data: T.date || '', hoje: turnoHoje, ok: f(turnoOk).length, justif: f(turnoJust).length,
                     falta: f(turnoFalta).length, depoisLimite: depoisLimite } : null,
        rdo: rdoResumo,
        progHoje: { frentes: regsHojeF.length, previsto: soma(regsHojeF, 'prev'), semLigacao: semLigacao },
        execucao: execResumo,
        obrasParadas: itens.filter(function (i) { return i.grupo === 'obra-parada'; }).length,
        cursos: cursosResumo, brigada: brigadaResumo, porBase: porBase
      },
      fontes: Object.keys(FONTES).map(function (k) {
        return { chave: k, nome: FONTES[k].nome, tela: FONTES[k].tela, existe: !!C[k],
                 atualizado: C[k] ? C[k].atualizado : null };
      }),
      opcoes: {
        bases: ORDEM_BASES.map(function (s) { return BASES[s]; }).filter(function (b) {
          return basesPresentes[b.id] && (!estados || estados.indexOf(b.uf) >= 0);
        }),
        supervisores: Object.keys(supervisores).sort()
      },
      busca: {
        obras: listaObras,
        equipes: Object.keys(eq).map(function (k) { return eq[k]; }).filter(function (e) { return e.turno; })
      }
    };
    API.ultimo = resultado;
    return resultado;
  }

  // ─── agrupamento para o Início e para o resumo de WhatsApp ───────────────
  var MODELOS = {
    'turno-nao-abriu':        ['# equipes não abriram turno', 'turno.html', 'Ver no Turno'],
    'turno-justif-sem-motivo':['# faltas justificadas sem motivo', 'turno.html', 'Ver no Turno'],
    'turno-sem-prog':         ['# equipes abriram turno sem programação', 'prog.html', 'Programar'],
    'prog-baixa':             ['# equipes abaixo da meta de execução', 'prog.html', 'Ver programação'],
    'prog-sem-resultado':     ['# equipes sem resultado lançado', 'prog.html', 'Lançar resultado'],
    'prog-suspensa':          ['# frentes paradas hoje por chuva ou sem acesso', 'prog.html', 'Reprogramar'],
    'prog-obra-cancelada':    ['# frentes em obra cancelada ou retirada', 'prog.html', 'Corrigir'],
    'prog-pep-fora':          ['# frentes com PEP fora da carteira', 'prog.html', 'Conferir'],
    'rdo-nao-lancou':         ['# equipes sem RDO lançado', 'rdo.html', 'Ver no RDO'],
    'obra-parada':            ['# obras em execução sem produção', 'estagios.html', 'Ver estágios'],
    'sesmt-vencido':          ['# colaboradores com curso vencido', 'vencimento_cursos.html', 'Abrir cursos'],
    'sesmt-escalado':         ['# programados hoje com curso vencido', 'prog.html', 'Trocar na programação'],
    'sesmt-vencendo':         ['# colaboradores com curso vencendo', 'vencimento_cursos.html', 'Abrir cursos'],
    'brigada-vencido':        ['# itens da brigada vencidos', 'brigada.html', 'Abrir brigada'],
    'brigada-vencendo':       ['# itens da brigada vencendo', 'brigada.html', 'Abrir brigada']
  };
  function contarPorBase(lista) {
    var semBase = lista.filter(function (i) { return !i.base; }).length;
    if (semBase === lista.length || semBase > lista.length / 2) {
      var nomes = lista.slice(0, 3).map(function (i) { return i.alvo; });
      return nomes.join(', ') + (lista.length > 3 ? ' e mais ' + (lista.length - 3) : '');
    }
    var c = {};
    lista.forEach(function (i) { if (i.base) c[i.base.nome] = (c[i.base.nome] || 0) + 1; });
    var txt = Object.keys(c).sort(function (a, b) { return c[b] - c[a]; }).map(function (n) { return n + ' ' + c[n]; }).join(', ');
    return semBase ? txt + ' e ' + semBase + ' sem base definida' : txt;
  }
  function agrupar(itens) {
    var mapa = {}, ordem = [];
    itens.forEach(function (i) {
      if (!mapa[i.grupo]) { mapa[i.grupo] = []; ordem.push(i.grupo); }
      mapa[i.grupo].push(i);
    });
    return ordem.map(function (g) {
      var l = mapa[g], i0 = l[0], m = MODELOS[g];
      var nivel = l.reduce(function (n, i) { return NIVEL_ORDEM[i.nivel] < NIVEL_ORDEM[n] ? i.nivel : n; }, 'aviso');
      if (l.length === 1 || !m) {
        return { grupo: g, nivel: nivel, qtd: l.length, itens: l,
                 titulo: i0.titulo + (i0.global ? '' : ': ' + i0.alvo), detalhe: i0.detalhe, acao: i0.acao };
      }
      var det = contarPorBase(l);
      if (g === 'turno-nao-abriu' && i0.nivel === 'aviso') det = 'Antes do limite das ' + p2(REGRAS.horaLimiteTurno) + 'h. ' + det;
      return { grupo: g, nivel: nivel, qtd: l.length, itens: l, titulo: m[0].replace('#', l.length),
               detalhe: det + '.', acao: { texto: m[2], href: m[1] } };
    }).sort(function (a, b) { return (NIVEL_ORDEM[a.nivel] - NIVEL_ORDEM[b.nivel]) || (b.qtd - a.qtd); });
  }

  function resumoTexto(a, rotulo) {
    var r = a.resumo, linhas = ['*Painel do dia, ' + br(zerar(a.agora)) + '*' + (rotulo ? ' (' + rotulo + ')' : '')];
    if (r.turno) {
      linhas.push(r.turno.hoje
        ? 'Turno: ' + r.turno.ok + ' de ' + (r.turno.ok + r.turno.justif + r.turno.falta) + ' abriram, ' + r.turno.falta + ' sem abrir, ' + r.turno.justif + ' justificadas'
        : 'Turno: ainda não importado hoje');
    }
    if (r.rdo && r.rdo.valido) linhas.push('RDO de ' + br(r.rdo.data) + ': ' + r.rdo.lancou + ' lançados, ' + r.rdo.nao + ' faltando');
    if (r.progHoje.frentes) linhas.push('Programação de hoje: ' + r.progHoje.frentes + ' frentes, ' + moeda(r.progHoje.previsto) + ' previstos');
    if (r.execucao && r.execucao.pct != null) linhas.push('Execução de ' + br(r.execucao.data) + ': ' + Math.round(r.execucao.pct * 100) + '% do previsto');
    var g = agrupar(a.itens);
    linhas.push('');
    if (!g.length) linhas.push('Nada fora do previsto.');
    else {
      linhas.push('Pendências:');
      g.forEach(function (x) { linhas.push('- ' + x.titulo + (x.qtd > 1 && x.detalhe ? ' (' + x.detalhe.replace(/\.$/, '') + ')' : '')); });
    }
    return linhas.join('\n');
  }

  var API = window.MariuaPainel = {
    REGRAS: REGRAS, BASES: BASES, FONTES: FONTES,
    carregar: carregar, analisar: analisar, agrupar: agrupar,
    estadosDoUsuario: estadosDoUsuario, resumoTexto: resumoTexto,
    util: { norm: norm, br: br, moeda: moeda, nomeProprio: nomeProprio, dataDe: dataDe, diasEntre: diasEntre },
    bruto: null, ultimo: null
  };
})();
