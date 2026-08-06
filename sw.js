/* Service worker de Mi Rutina.
   Guarda la app entera en el dispositivo para que abra sin conexión: en el
   gimnasio, en el parque o con el móvil en modo avión. Al publicar una versión
   nueva basta con subir el número de VERSION_APP.

   La lista de abajo tiene que llevar todos los módulos y todos los datos: lo
   que no esté aquí, sin conexión no está. Las pruebas lo comprueban. */

importScripts("./version.js");

// El nombre del caché lleva la versión: al cambiarla, el navegador descarta
// automáticamente todo lo guardado de la anterior.
const CACHE = "mi-rutina-" + self.VERSION_APP;
const ARCHIVOS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./version.js",

  "./css/tokens.css",
  "./css/base.css",
  "./css/componentes.css",
  "./css/pantallas.css",

  "./datos/ejercicios.json",
  "./datos/circuito.json",
  "./datos/variantes.json",
  "./datos/adaptaciones.json",

  "./js/app.js",
  "./js/almacen.js",
  "./js/analisis.js",
  "./js/catalogo.js",
  "./js/circuito.js",
  "./js/copia.js",
  "./js/figuras.js",
  "./js/graficos.js",
  "./js/instalacion.js",
  "./js/navegacion.js",
  "./js/plan.js",
  "./js/plantilla.js",
  "./js/postura.js",
  "./js/puente-pruebas.js",
  "./js/registro.js",
  "./js/util.js",

  "./js/pantallas/guia.js",
  "./js/pantallas/guiado.js",
  "./js/pantallas/hoy.js",
  "./js/pantallas/onboarding.js",
  "./js/pantallas/progreso.js",
  "./js/pantallas/resumen.js",
  "./js/pantallas/rutinas.js",
  "./js/pantallas/sesion.js",

  "./icono-192.png",
  "./icono-512.png",
  "./icono-maskable.png"
];

self.addEventListener("install", ev => {
  ev.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ARCHIVOS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())   // si algo no está, no bloqueamos la instalación
  );
});

self.addEventListener("activate", ev => {
  ev.waitUntil(
    caches.keys()
      .then(claves => Promise.all(claves.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", ev => {
  const req = ev.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;

  // Para el documento: red primero, para recoger versiones nuevas; si no hay
  // conexión, lo guardado. Así nunca se queda una versión vieja pegada.
  if (req.mode === "navigate") {
    ev.respondWith(
      fetch(req)
        .then(res => {
          const copia = res.clone();
          caches.open(CACHE).then(c => c.put("./index.html", copia));
          return res;
        })
        .catch(() => caches.match("./index.html").then(r => r || caches.match("./")))
    );
    return;
  }

  // Para el resto: lo guardado primero, que es lo rápido.
  ev.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res && res.status === 200 && res.type === "basic") {
        const copia = res.clone();
        caches.open(CACHE).then(c => c.put(req, copia));
      }
      return res;
    }).catch(() => hit))
  );
});
