/* RDO de campo · Mariuá — service worker
   Guarda os arquivos do app no celular para ele abrir sem internet.

   PARA PUBLICAR UMA VERSÃO NOVA: mude só o VERSAO abaixo (e as NOVIDADES).
   Os celulares percebem a mudança ao abrir o app, ao voltar para ele e a cada
   15 minutos com ele aberto, e mostram "Nova versão do app" com o botão
   Atualizar agora. As NOVIDADES aparecem nesse aviso (até 3 linhas curtas). */
var VERSAO = '1.2.4';
var NOVIDADES = [
  'Abre o modo de teste enquanto o sistema não está ligado ao banco'
];

var CACHE = 'rdo-campo-' + VERSAO;
var ARQUIVOS = [
  './',
  'index.html',
  'app.css',
  'app.js',
  'vendor/supabase-2.118.0.js',
  'manifest.webmanifest',
  'fonts/barlow-latin-500-normal.woff2',
  'fonts/barlow-latin-600-normal.woff2',
  'fonts/barlow-latin-700-normal.woff2',
  'fonts/barlow-condensed-latin-600-normal.woff2',
  'fonts/barlow-condensed-latin-700-normal.woff2',
  'icons/logo-96.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-512.png',
  'icons/apple-touch-icon.png',
  'icons/favicon-32.png'
];

// Baixa tudo direto do servidor (sem cache do navegador), para a versão nova
// vir inteira. O app continua na versão atual até o encarregado tocar em Atualizar.
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return c.addAll(ARQUIVOS.map(function (u) { return new Request(u, { cache: 'reload' }); }));
  }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (nomes) {
      return Promise.all(nomes.filter(function (n) { return n.indexOf('rdo-campo-') === 0 && n !== CACHE; })
        .map(function (n) { return caches.delete(n); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('message', function (e) {
  var d = e.data || {};
  if (d.tipo === 'ativar') self.skipWaiting();
  if (d.tipo === 'info' && e.ports && e.ports[0]) e.ports[0].postMessage({ versao: VERSAO, novidades: NOVIDADES });
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;          // Supabase e outros: sempre direto na rede
  if (url.pathname.slice(-6) === '/sw.js') return;
  if (req.mode === 'navigate' && /\/(index\.html)?$/.test(url.pathname)) {
    // abre na hora com a versão guardada; a versão nova chega pelo aviso do app
    e.respondWith(caches.match('index.html', { cacheName: CACHE }).then(function (r) { return r || fetch(req); }));
    return;
  }
  e.respondWith(caches.match(req, { cacheName: CACHE, ignoreSearch: true }).then(function (r) { return r || fetch(req); }));
});
