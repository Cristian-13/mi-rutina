# Mi Rutina

Circuito de entrenamiento guiado, instalable en el móvil y con seguimiento del
progreso. Un solo archivo, sin dependencias ni compilación.

Abre `index.html` y ya está.

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
| `index.html` | La aplicación entera |
| `manifest.webmanifest`, `sw.js`, `icono-*.png` | La convierten en app instalable y sin conexión |
| `extractor.html` | Herramienta aparte: saca fotogramas y audio de un vídeo local, para transcribirlo |
| `transcripcion-video.txt` | Transcripción del vídeo del que sale la rutina |

## Publicarla y usarla en el móvil

La app guarda el historial en el almacenamiento del navegador, que va ligado al
sitio desde el que se sirve la página. Por eso necesita una dirección propia: si
se abre dentro de un visor que la mete en un marco aislado, el navegador deniega
ese almacenamiento y los datos se pierden al cerrar. La app lo detecta y avisa
en rojo en vez de perderlos en silencio.

Para publicarla con GitHub Pages:

1. **Settings → Pages** en este repositorio.
2. En *Source*, **Deploy from a branch**.
3. Rama `main`, carpeta `/ (root)`. Guardar.
4. Al minuto queda en `https://<usuario>.github.io/mi-rutina/`.

Y para instalarla, con esa dirección abierta en el móvil:

- **Android** (Chrome, Brave, Edge): menú de tres puntos → *Añadir a pantalla
  principal*, o *Instalar aplicación*.
- **iPhone** (Safari): compartir → *Añadir a pantalla de inicio*.

## Al publicar una versión nueva

Sube el número de `CACHE` en `sw.js`. Sin eso, los móviles que ya la tengan
instalada seguirán abriendo la versión guardada.

## Trabajar en el proyecto con Claude Code

El repositorio trae configurados unos plugins de Claude Code (`.claude/settings.json`)
y el servidor MCP de Playwright (`.mcp.json`), que se cargan solos al abrir una
sesión aquí. Para tenerlos también en tu computador y en el resto de tus
proyectos, ejecuta una vez:

```sh
bash scripts/setup-claude-plugins.sh
```

| Plugin | Para qué |
|---|---|
| `superpowers` | Skills de desarrollo: TDD, depuración sistemática, planes, worktrees |
| `frontend-design` | Diseño de interfaces |
| `ralph-wiggum` | Bucles autónomos: `/ralph-loop "tarea" --max-iterations 10` |
| `context7` | Documentación de librerías al día: `/context7:docs <librería>` |
| Playwright (MCP) | Control del navegador y pruebas de la app |
| `graphify` | Convierte el proyecto en un grafo de conocimiento consultable |

### Obsidian + graphify

`graphify` recorre el proyecto y lo convierte en un grafo: cada función, archivo
y concepto es un nodo, con las relaciones entre ellos explicadas. En vez de
rastrear `index.html` entero a base de búsquedas, Claude consulta el grafo, que
es mucho más pequeño. Y ese mismo grafo se puede exportar como vault de
Obsidian, para navegarlo tú a mano.

Obsidian es una app de escritorio, así que se instala aparte desde
[obsidian.md](https://obsidian.md/download). Después:

```
/graphify . --obsidian
```

Eso deja el grafo en `graphify-out/` y el vault en `graphify-out/obsidian/`, que
se abre en Obsidian con *Abrir carpeta como vault*. Incluye un `graph.canvas`
para ver el mapa completo. La carpeta está en `.gitignore`: se regenera en cada
máquina, no se versiona.

Para consultarlo desde la línea de órdenes:

```sh
graphify query "cómo se calcula la carga por sesión"
graphify explain "hallazgos()"           # un nodo y sus vecinos
graphify path "hallazgos()" "pct()"      # la relación entre dos piezas
graphify god-nodes                       # las piezas más conectadas
graphify update .                        # refrescar tras tocar código, sin coste de API
```

El mapeo de código es local y determinista, con tree-sitter: no sale nada de tu
máquina ni cuesta tokens. La pasada semántica sobre `index.html`, la
documentación y las imágenes sí usa el modelo de tu sesión, y por eso conviene
lanzarla desde `/graphify .` dentro de Claude Code en vez de por consola.

## Aviso

Es información general para empezar a moverse, no consejo médico. Si tienes una
lesión, un problema de corazón, estás embarazada o llevas años sin actividad
física, consúltalo antes de empezar.
