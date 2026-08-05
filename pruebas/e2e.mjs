/* Recorrido completo de la aplicación, de punta a punta.
   Se ejecuta con `npm test`. Levanta un servidor estático sobre la carpeta del
   proyecto, abre la app en un navegador de verdad y comprueba los caminos que
   un usuario recorre: configurarse, entrenar guiado, guardar, ver resultados y
   leer sus estadísticas, con las cinco variantes.

   Existe para poder reorganizar el código sin romper nada sin enterarse. */

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
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

  console.log("\nCopia de seguridad");
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
