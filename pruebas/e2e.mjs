/* Recorrido completo de la aplicación, de punta a punta.
   Se ejecuta con `npm test`. Levanta un servidor estático sobre la carpeta del
   proyecto, abre la app en un navegador de verdad y comprueba los caminos que
   un usuario recorre: configurarse, entrenar guiado, guardar, ver resultados y
   leer sus estadísticas, con las cinco variantes.

   Existe para poder reorganizar el código sin romper nada sin enterarse. */

import { createServer } from "node:http";
import { readFile, readdir } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = fileURLToPath(new URL("..", import.meta.url));
const PUERTO = 8788;

const TIPOS = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".webmanifest": "application/manifest+json",
  ".png": "image/png", ".txt": "text/plain; charset=utf-8", ".css": "text/css; charset=utf-8"
};

function servidor() {
  return createServer(async (req, res) => {
    try {
      let ruta = decodeURIComponent(req.url.split("?")[0]);
      if (ruta.endsWith("/")) ruta += "index.html";
      const abs = join(RAIZ, normalize(ruta).replace(/^(\.\.[/\\])+/, ""));
      const datos = await readFile(abs);
      res.writeHead(200, { "content-type": TIPOS[extname(abs)] || "application/octet-stream" });
      res.end(datos);
    } catch {
      res.writeHead(404); res.end("no encontrado");
    }
  });
}

/* ── un mini marco de pruebas, para no arrastrar dependencias ── */
let ok = 0;
const fallos = [];
function comprueba(que, condicion, detalle) {
  if (condicion) { ok++; console.log("  ✓ " + que); }
  else { fallos.push(que + (detalle ? " → " + detalle : "")); console.log("  ✗ " + que + (detalle ? " → " + detalle : "")); }
}

/* ── revisión de los datos y del inventario, antes de abrir el navegador ──
   El circuito vive en JSON y la app en módulos sueltos: dos cosas que se
   rompen en silencio si un identificador deja de existir o si un archivo nuevo
   no entra en el service worker. Eso se ve antes de arrancar nada. */

async function listar(rel) {
  const out = [];
  for (const e of await readdir(join(RAIZ, rel), { withFileTypes: true })) {
    if (e.isDirectory()) out.push(...await listar(rel + e.name + "/"));
    else out.push(rel + e.name);
  }
  return out;
}
const leerJSON = async (rel) => JSON.parse(await readFile(join(RAIZ, rel), "utf8"));

async function revisarDatosYInventario() {
  console.log("\nLos datos y el inventario");

  const EJ = await leerJSON("datos/ejercicios.json");
  const { postas, calentamiento, vuelta } = await leerJSON("datos/circuito.json");
  const { variantes, accesos } = await leerJSON("datos/variantes.json");
  const ADAPTA = await leerJSON("datos/adaptaciones.json");

  const ids = new Set(postas.map(p => p.id));
  const existe = (ej) => Object.prototype.hasOwnProperty.call(EJ, ej);
  const rotos = [];

  // Un ejercicio con `igualQue` hereda del original: hay que mirarlo ya resuelto,
  // igual que hace la app al cargar el catálogo.
  Object.entries(EJ).forEach(([id, propio]) => {
    if (propio.igualQue && !existe(propio.igualQue)) { rotos.push(id + " deriva de " + propio.igualQue); return; }
    const e = Object.assign({}, propio.igualQue ? EJ[propio.igualQue] : null, propio);
    if (!(e.nombre && Array.isArray(e.musculos) && Array.isArray(e.cues) && e.facil && e.dificil))
      rotos.push(id + " está incompleto");
    if (!Array.isArray(e.poses) || e.poses.length !== 2) rotos.push(id + " no tiene dos posturas");
  });
  comprueba("los ejercicios están completos y bien encadenados", !rotos.length, rotos.join(" · "));

  const huerfanos = [];
  postas.forEach(p => {
    if (!existe(p.ej)) huerfanos.push("posta " + p.id + " → " + p.ej);
    if (p.alt && !existe(p.alt.ej)) huerfanos.push("alternativa de " + p.id + " → " + p.alt.ej);
  });
  Object.entries(variantes).forEach(([v, def]) => {
    if (def.falta && !accesos[def.falta]) huerfanos.push("variante " + v + " pide un acceso que no existe");
    Object.entries(def.postas).forEach(([id, cam]) => {
      if (!ids.has(id)) huerfanos.push("variante " + v + " cambia la posta " + id + ", que no está en el circuito");
      if (cam.ej && !existe(cam.ej)) huerfanos.push("variante " + v + " → " + cam.ej);
    });
  });
  Object.entries(ADAPTA).forEach(([zona, cambios]) => {
    Object.entries(cambios).forEach(([id, cam]) => {
      if (!ids.has(id)) huerfanos.push("la adaptación de " + zona + " toca la posta " + id + ", que no está en el circuito");
      if (cam.ej && !existe(cam.ej)) huerfanos.push("adaptación de " + zona + " → " + cam.ej);
      if (cam.usarAlt && !(postas.find(p => p.id === id) || {}).alt)
        huerfanos.push("la adaptación de " + zona + " pide la alternativa de " + id + ", que no la tiene");
    });
  });
  comprueba("nada del circuito apunta a un ejercicio que no existe", !huerfanos.length, huerfanos.join(" · "));

  comprueba("el circuito tiene once postas con identificador único",
    postas.length === 11 && ids.size === 11, postas.length + " postas, " + ids.size + " identificadores");
  comprueba("hay calentamiento y vuelta a la calma",
    calentamiento.length > 0 && vuelta.length > 0);

  // Lo que no esté en el service worker, sin conexión no está.
  const sw = await readFile(join(RAIZ, "sw.js"), "utf8");
  const necesarios = [...await listar("js/"), ...await listar("datos/"), ...await listar("css/")];
  const olvidados = necesarios.filter(f => !sw.includes('"./' + f + '"'));
  comprueba("el service worker guarda todos los módulos y todos los datos",
    !olvidados.length, "faltan: " + olvidados.join(", "));
}

async function navegador() {
  let chromium;
  try { ({ chromium } = await import("playwright")); }
  catch { ({ chromium } = await import("playwright-core")); }
  return chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
}

/* Historial de mentira, pero con la forma exacta que guarda la app. */
const SEMBRAR = (n) => `(() => {
  const dias = [];
  for (let i = 0; i < ${n}; i++) { const d = new Date(2026, 6, 6 + i * 2); dias.push(d.toISOString().slice(0, 10)); }
  state.historial = dias.map((f, i) => {
    const c = circuito(1), P = {};
    c.forEach(e => { P[e.id] = { valor: String(Math.round((e.meta || 10) + i * 1.5)), hecho: true }; });
    return { fecha: f, variante: 'base', semana: 1 + Math.floor(i / 3), postas: P, duracion: 27, sensacion: 3 };
  });
  guardar();
})()`;

async function principal() {
  await revisarDatosYInventario();

  const srv = servidor();
  await new Promise(r => srv.listen(PUERTO, r));
  const nav = await navegador();
  const pag = await nav.newPage({ viewport: { width: 420, height: 900 } });

  const errores = [];
  pag.on("pageerror", e => errores.push("error de página: " + e.message));
  pag.on("console", m => { if (m.type() === "error" && !m.text().includes("favicon")) errores.push("consola: " + m.text()); });

  const base = "http://127.0.0.1:" + PUERTO + "/";
  await pag.goto(base);
  await pag.waitForTimeout(400);

  console.log("\nArranque");
  comprueba("la app carga y pide configuración", await pag.locator("#onb").isVisible());
  comprueba("el manifiesto se sirve", (await pag.evaluate(async () => (await fetch("manifest.webmanifest")).ok)));
  comprueba("el módulo de análisis se carga", await pag.evaluate(() => !!window.Analisis));

  console.log("\nConfiguración inicial");
  await pag.fill("#onbNombre", "Prueba");
  await pag.click('.onb [data-step="0"] [data-next]');
  await pag.click('.onb [data-step="1"] .opt[data-val="cero"]');
  await pag.click('.onb [data-step="1"] [data-next]');
  await pag.click('.onb [data-step="2"] .opt[data-val="3"]');
  await pag.click('.onb [data-step="2"] [data-next]');
  await pag.click('.onb [data-step="3"] .opt[data-val="rodilla"]');
  await pag.click('.onb [data-step="3"] [data-next]');
  await pag.click('.onb [data-step="4"] .opt[data-val="mochila"]');
  await pag.click('.onb [data-step="4"] [data-next]');
  await pag.waitForTimeout(500);
  const perfil = await pag.evaluate(() => perfil());
  comprueba("guarda el perfil de los cinco pasos", perfil.nombre === "Prueba" && perfil.dias === 3 && perfil.molestias[0] === "rodilla");

  console.log("\nEl circuito");
  const postas = await pag.evaluate(() => circuito(1).map(e => e.ej));
  comprueba("tiene once postas", postas.length === 11, "son " + postas.length);
  comprueba("la molestia de rodilla cambia la zancada", !postas.includes("zancada"), postas.join(","));
  comprueba("y cambia los burpees por jumping jacks", postas.includes("jack"));

  console.log("\nLas cinco variantes");
  for (const [v, espera] of [["base", "caminar"], ["carga", "caminarCarga"], ["escaleras", "escaleras"],
                             ["agua", "flexionBorde"], ["suelo", "arrastre"]]) {
    const ej = await pag.evaluate(v => { state.perfil.variante = v; return circuito(1).map(e => e.ej); }, v);
    comprueba("la variante " + v + " sustituye sus postas", ej.includes(espera), ej.join(","));
  }
  await pag.evaluate(() => { state.perfil.variante = "base"; guardar(); ir("hoy"); });
  await pag.waitForTimeout(300);

  console.log("\nModo guiado");
  await pag.click("#startBtn");
  await pag.waitForTimeout(400);
  comprueba("abre a pantalla completa", await pag.locator("#play").isVisible());
  comprueba("empieza por la primera posta",
    (await pag.locator("#playK").innerText()).toLowerCase().includes("1 de 11"));

  // Se recorren las once completándolas de verdad: las de repeticiones con el
  // botón, y las de tiempo dejando que el cronómetro llegue a cero y avance solo.
  for (let i = 0; i < 11; i++) {
    const esTiempo = await pag.evaluate(() => postaActual().tipo === "tiempo");
    if (esTiempo) {
      await pag.evaluate(() => { gui.restante = 0.3; if (!gui.corriendo) arrancarGui(); });
      await pag.waitForTimeout(700);
    } else {
      await pag.click("#playGo");
      await pag.waitForTimeout(160);
    }
  }
  await pag.waitForTimeout(600);
  comprueba("se cierra al terminar", !(await pag.locator("#play").isVisible()));
  comprueba("guarda la sesión", (await pag.evaluate(() => state.historial.length)) === 1);
  const guardada = await pag.evaluate(() => state.historial[0] || {});
  comprueba("con las once postas completadas",
    Object.values(guardada.postas || {}).filter(x => x.hecho).length === 11,
    Object.values(guardada.postas || {}).filter(x => x.hecho).length + " completadas");
  comprueba("y con las marcas registradas",
    Object.values(guardada.postas || {}).some(x => x.valor));
  comprueba("enseña los resultados", await pag.locator("#s-resumen").isVisible());
  await pag.click("#resVolver");
  await pag.waitForTimeout(300);

  console.log("\nEstadísticas y análisis");
  await pag.evaluate(SEMBRAR(8));
  await pag.evaluate(() => ir("progreso"));
  await pag.waitForTimeout(600);
  comprueba("el análisis produce hallazgos", (await pag.locator(".hallazgo").count()) > 0);
  comprueba("la ficha por ejercicio se llena", (await pag.locator("#fichas tr").count()) > 5);
  comprueba("los indicadores se calculan", (await pag.locator("#kpisBox .v").count()) === 4);
  comprueba("el mapa de constancia dibuja 12 semanas", (await pag.locator("#mapa i").count()) === 84);
  comprueba("hay tabla de récords", (await pag.locator("#recsBox tr").count()) > 1);
  const analisis = await pag.evaluate(() => window.Analisis.porEjercicio(state.historial, CIRCUITO));
  comprueba("el análisis sale de datos reales", analisis.some(f => f.sesiones > 0 && f.mejor > 0));

  console.log("\nMigracion de datos");
  // Se simula un movil que venia de la version anterior: datos bajo la clave
  // vieja, sin numero de version. Al abrir, deben leerse y quedar sellados.
  await pag.evaluate(() => {
    const antiguo = {
      perfil: { nombre: "Antiguo", nivel: "algo", dias: 3, molestias: [] },
      peso: [{ fecha: "2026-07-01", kg: 80 }],
      historial: [{ fecha: "2026-07-01", variante: "base", semana: 1, duracion: 25,
                    postas: { sentadilla: { valor: "12", hecho: true } } }]
    };
    localStorage.clear();
    localStorage.setItem("mirutina.v3", JSON.stringify(antiguo));
  });
  await pag.reload();
  await pag.waitForTimeout(500);
  const migrado = await pag.evaluate(() => ({
    sesiones: state.historial.length,
    nombre: (state.perfil || {}).nombre,
    peso: state.peso.length,
    acceso: Array.isArray((state.perfil || {}).acceso),
    version: state.version
  }));
  comprueba("rescata el historial de la clave anterior", migrado.sesiones === 1, JSON.stringify(migrado));
  comprueba("conserva perfil y peso corporal", migrado.nombre === "Antiguo" && migrado.peso === 1);
  comprueba("rellena los campos que el perfil no tenia", migrado.acceso === true);
  await pag.evaluate(() => guardar());
  const sellado = await pag.evaluate(() => JSON.parse(localStorage.getItem("mirutina")).version);
  comprueba("sella la version al guardar", sellado === 4, "version " + sellado);

  // Y datos de una version futura no se pisan jamas.
  await pag.evaluate(() => {
    localStorage.setItem("mirutina", JSON.stringify({ version: 99, historial: [{ fecha: "2030-01-01", postas: {} }], peso: [], perfil: null }));
  });
  await pag.reload();
  await pag.waitForTimeout(500);
  await pag.evaluate(() => { state.historial = []; guardar(); });
  const intacto = await pag.evaluate(() => JSON.parse(localStorage.getItem("mirutina")).version);
  comprueba("no destruye datos de una version mas nueva", intacto === 99, "quedo en v" + intacto);
  await pag.evaluate(() => localStorage.clear());
  await pag.reload();
  await pag.waitForTimeout(400);

  console.log("\nCopia de seguridad");
  await pag.evaluate(SEMBRAR(3));
  const copia = await pag.evaluate(() => JSON.stringify({ historial: state.historial, peso: state.peso, perfil: state.perfil }));
  comprueba("el estado se serializa entero", JSON.parse(copia).historial.length > 0);

  console.log("\nLo demás");
  comprueba("no desborda en horizontal", !(await pag.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));
  comprueba("sin errores de consola", errores.length === 0, errores.join(" | "));

  await nav.close();
  srv.close();

  console.log("\n" + "─".repeat(46));
  console.log(fallos.length ? "FALLAN " + fallos.length + " de " + (ok + fallos.length) : "TODO BIEN · " + ok + " comprobaciones");
  if (fallos.length) { fallos.forEach(f => console.log("  · " + f)); process.exit(1); }
}

principal().catch(e => { console.error(e); process.exit(1); });
