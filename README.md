# Mi Rutina

Circuito de entrenamiento guiado, instalable en el móvil y con seguimiento del
progreso. Sin dependencias y sin compilación: los archivos que hay en el
repositorio son exactamente los que se publican.

Para abrirla en el ordenador hace falta servirla, porque va en módulos y lee
sus datos de disco, y eso el navegador no lo permite abriendo el archivo a
pelo:

```
python3 -m http.server 8000     # y abrir http://localhost:8000
```

En el móvil no hay que hacer nada de esto: se abre por su dirección web.

## Qué es

Un circuito de once postas encadenadas, de estilo militar: en vez de repartir
la semana en día de pecho y día de piernas, mete fuerza, resistencia y
acondicionamiento en una sola sesión de 25 a 30 minutos, tres veces por semana
con un día completo de descanso entre medias.

- **Modo guiado** a pantalla completa, posta a posta, con cuenta atrás para las
  postas de tiempo y contador para las de repeticiones. No hace falta tocar el
  móvil mientras entrenas, y la pantalla no se apaga.
- **Figuras animadas** de cada ejercicio, dibujadas con cinemática inversa, para
  ver el movimiento en vez de leerlo.
- **Cinco rutinas**: el circuito básico y cuatro variantes (agua, mochila
  cargada, escaleras y suelo), que rotan cada dos semanas para no estancarse.
- **Adaptación** al nivel, a los días disponibles y a las molestias de rodilla,
  hombro o zona lumbar.
- **Progreso**: mapa de constancia, carga por sesión, récords por ejercicio y
  peso corporal.
- **Sin conexión** una vez instalada, y con los datos guardados en el móvil.

## Archivos

| Archivo | Para qué |
|---|---|
| `index.html` | El esqueleto de las pantallas y los textos largos |
| `datos/` | El circuito, los ejercicios, las variantes y las adaptaciones. Son datos, no código: cambiar una nota o un objetivo no obliga a tocar nada más |
| `js/` | La aplicación, en módulos. `app.js` es el arranque y `js/pantallas/` una pantalla por archivo |
| `css/` | Los estilos, repartidos en tokens, base, componentes y pantallas |
| `pruebas/e2e.mjs` | El recorrido completo en un navegador de verdad. `npm test` |
| `version.js` | El número de versión, en el único sitio donde vive |
| `manifest.webmanifest`, `sw.js`, `icono-*.png` | La convierten en app instalable y sin conexión |
| `extractor.html` | Herramienta aparte: saca fotogramas y audio de un vídeo local, para transcribirlo |
| `transcripcion-video.txt` | Transcripción del vídeo del que sale la rutina |

Al añadir un módulo o un archivo de datos hay que meterlo también en la lista
de `sw.js`, o sin conexión no estará. Las pruebas lo comprueban y avisan.

## Publicarla y usarla en el móvil

La app guarda el historial en el almacenamiento del navegador, que va ligado al
sitio desde el que se sirve la página. Por eso necesita una dirección propia: si
se abre dentro de un visor que la mete en un marco aislado, el navegador deniega
ese almacenamiento y los datos se pierden al cerrar. La app lo detecta y avisa
en rojo en vez de perderlos en silencio.

Se publica sola en **Netlify**, que es lo que configura `netlify.toml`: cada vez
que algo llega a `main` se despliega, y cada pull request trae su propia
dirección de prueba. No hay nada que construir, así que el despliegue es copiar
los archivos tal cual. El nombre del sitio se cambia desde el panel de Netlify.

> **Una sola dirección, siempre la misma.** El historial vive en el
> almacenamiento del navegador, y ese almacenamiento va por dirección. Si la
> misma app se publica también en otro sitio —GitHub Pages, otro dominio, la
> dirección de prueba de un pull request—, lo que entrenes en una no aparece en
> la otra, y no hay forma de juntarlas después salvo exportando e importando a
> mano. Elige una dirección, instálala desde ahí y no vuelvas a tocarlo.

Y para instalarla, con esa dirección abierta en el móvil:

- **Android** (Chrome, Brave, Edge): menú de tres puntos → *Añadir a pantalla
  principal*, o *Instalar aplicación*.
- **iPhone** (Safari): compartir → *Añadir a pantalla de inicio*.

## Al publicar una versión nueva

Sube el número de `VERSION_APP` en `version.js`. De ahí lo leen la página y el
service worker, así que con eso basta: los móviles que ya la tengan instalada
descartan lo guardado y se traen la versión nueva.

## Aviso

Es información general para empezar a moverse, no consejo médico. Si tienes una
lesión, un problema de corazón, estás embarazada o llevas años sin actividad
física, consúltalo antes de empezar.
