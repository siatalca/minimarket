// Service worker de la consulta de precios (misión M-037). Alcance: /consulta/.
// Guarda solo la estructura de la página para que abra rápido y sea instalable.
// Nunca guarda ni responde nada de /api/: precios, stock, cuentas y carrito siempre van a la red.
'use strict';

const CACHE = 'consulta-v20261118a';
const SHELL = [
    './',
    './consulta.css?v=20261118a',
    './consulta_core.js?v=20261118a',
    './consulta_ui.js?v=20261118a',
    './consulta.js?v=20261118a',
    './manifest.webmanifest',
    './icon-192.png',
    '../js/api_base.js?v=20261003a',
    '../js/html_escape.js?v=20261112a',
    '../js/camera_barcode_scanner.js?v=20261116b',
];

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((key) => key.startsWith('consulta-') && key !== CACHE).map((key) => caches.delete(key))))
            .then(() => self.clients.claim()),
    );
});

function isShellRequest(url) {
    if (url.origin !== self.location.origin) return false;
    if (url.pathname.startsWith('/api/')) return false;
    return url.pathname.startsWith('/consulta/') || url.pathname.startsWith('/js/');
}

// Red primero (para recibir siempre la versión nueva); si no hay red, lo guardado.
self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') return;
    const url = new URL(request.url);
    if (!isShellRequest(url)) return;
    event.respondWith(
        fetch(request)
            .then((response) => {
                if (response.ok && response.type === 'basic' && SHELL.some((path) => new URL(path, self.location.href).href === url.href)) {
                    const copy = response.clone();
                    caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
                }
                return response;
            })
            .catch(() => caches.match(request, { ignoreSearch: request.mode === 'navigate' })
                .then((cached) => cached || (request.mode === 'navigate' ? caches.match('./') : undefined))
                .then((cached) => cached || Response.error())),
    );
});
