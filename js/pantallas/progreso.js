/* Pantalla PROGRESO: qué dicen tus datos.
   Todo lo de aquí sale de las sesiones guardadas. Donde no hay marcas
   suficientes no se dibuja una línea bonita: se dice que no hay datos. */

import { html, pintarEn } from "../plantilla.js";
import { $, toast, hoyISO, fechaCorta, lunesDe } from "../util.js";
import { state, guardar, perfil } from "../almacen.js";
import { EJ, CIRCUITO, varianteDe, nombreDePosta } from "../catalogo.js";
import { rachaSemanas } from "../plan.js";
import { cargaDe, valorNum } from "../registro.js";
import { grafLinea, grafBarras, pieGrafico, conPista } from "../graficos.js";
import * as Analisis from "../analisis.js";

const unidadCorta = (b) => b && b.tipo === "tiempo" ? "s" : (b && b.tipo === "pasos" ? "pasos" : "reps");

export function pintarProgreso() {
  const total = state.historial.length;
  const postasHechas = state.historial.reduce((n, s) =>
    n + Object.values(s.postas || {}).filter(x => x.hecho).length, 0);

  pintarEn($("statsBox"), html`
    <div><div class="v">${total}</div><div class="l">Sesiones</div></div>
    <div><div class="v">${rachaSemanas()}</div><div class="l">Semanas seguidas</div></div>
    <div><div class="v">${postasHechas}</div><div class="l">Postas hechas</div></div>`);

  pintarAnalisis();
  pintarKpis();
  pintarMapa();
  pintarCarga();
  pintarRecords();
  pintarRepartos();
  pintarHistorial(total);
  llenarSelector();
  pintarEjercicio();
  pintarPeso();
}

/* ── lo que dice el análisis ── */

function pintarAnalisis() {
  const hs = Analisis.hallazgos(state.historial, CIRCUITO, perfil(), nombreDePosta);
  pintarEn($("hallazgos"), hs.length
    ? hs.map(x => html`<div class="hallazgo tipo-${x.tipo}"><span class="marca"></span>
        <div><b>${x.titulo}</b><p>${x.texto}</p></div></div>`)
    : html`<div class="hallazgo"><span class="marca"></span><div><b>Todo en orden</b>
        <p>No hay nada que corregir ahora mismo: constancia bien, marcas subiendo y ninguna posta atascada.</p>
        </div></div>`);

  const fichas = Analisis.porEjercicio(state.historial, CIRCUITO).filter(f => f.registrable);
  pintarEn($("fichas"), html`
    <tr><th>Ejercicio</th><th>1.ª → mejor</th><th>Estado</th></tr>
    ${fichas.map(f => {
      const etiqueta = ["subiendo", "estancado", "bajando"].includes(f.estado) ? f.estado : "";
      const detalle = f.sesiones >= 2
        ? html`${f.primera} → ${f.mejor}${f.progreso
            ? html`  <span class="delta ${f.progreso > 0 ? "up" : "flat"}">${f.progreso > 0 ? "+" : ""}${f.progreso}%</span>`
            : ""}`
        : (f.sesiones === 1 ? String(f.ultima) : "—");
      return html`<tr>
        <td>${nombreDePosta(f.id)}<br><span class="note" style="padding:0">
          ${f.sesiones}${f.sesiones === 1 ? " marca" : " marcas"}</span></td>
        <td class="n">${detalle}</td>
        <td><span class="etq ${etiqueta}">${f.estado}</span></td></tr>`;
    })}`);
}

/* ── los cuatro indicadores ── */

function pintarKpis() {
  const h = state.historial;
  const minutos = h.reduce((n, s) => n + (s.duracion || 0), 0);
  const cargas = h.map(cargaDe);
  const cargaTotal = cargas.reduce((a, b) => a + b, 0);
  const media = h.length ? Math.round(cargaTotal / h.length) : 0;

  let hueco = "—";
  if (h.length > 1) {
    let suma = 0;
    for (let i = 1; i < h.length; i++)
      suma += (new Date(h[i].fecha) - new Date(h[i - 1].fecha)) / 86400000;
    hueco = (suma / (h.length - 1)).toFixed(1) + " d";
  }
  const evol = cargas[0] ? Math.round((cargas[cargas.length - 1] - cargas[0]) / cargas[0] * 100) : 0;

  pintarEn($("kpisBox"), html`
    <div><div class="v">${minutos}</div><div class="l">Minutos entrenados</div></div>
    <div><div class="v">${cargaTotal}</div><div class="l">Carga acumulada</div></div>
    <div><div class="v">${media}</div><div class="l">Carga media</div>
      ${h.length > 1 && html`<div class="d ${evol > 0 ? "delta up" : "delta flat"}">
        ${evol > 0 ? "+" : ""}${evol}% desde la primera</div>`}</div>
    <div><div class="v">${hueco}</div><div class="l">Entre sesiones</div></div>`);
}

/* ── el mapa de constancia: 12 semanas de 7 días ── */

function pintarMapa() {
  const hoy = new Date(hoyISO() + "T12:00:00");
  const lunEsta = new Date(lunesDe(hoyISO()) + "T12:00:00");
  const fechas = new Set(state.historial.map(s => s.fecha));
  const columnas = [];

  for (let w = 11; w >= 0; w--) {
    const dias = [];
    for (let d = 0; d < 7; d++) {
      const f = new Date(lunEsta);
      f.setDate(f.getDate() - w * 7 + d);
      const iso = f.toISOString().slice(0, 10);
      dias.push(html`<i class="${fechas.has(iso) ? "on " : ""}${iso === hoyISO() ? "hoy" : ""}"
        ${f > hoy ? html`style="opacity:.35"` : ""} title="${iso}"></i>`);
    }
    columnas.push(html`<div class="col">${dias}</div>`);
  }
  pintarEn($("mapa"), columnas);

  const ini = new Date(lunEsta); ini.setDate(ini.getDate() - 11 * 7);
  pintarEn($("mapaPie"), html`<span>${ini.getDate()}/${ini.getMonth() + 1}</span>
    <span>${state.historial.length} sesiones en 12 semanas</span><span>hoy</span>`);
}

/* ── carga por sesión ── */

function pintarCarga() {
  const h = state.historial;
  if (h.length < 2) {
    pintarEn($("cargaChart"), html`<div class="note" style="padding:10px 0 4px">
      ${h.length ? "Con la segunda sesión empieza la línea." : "Aún no hay sesiones."}</div>`);
    return;
  }
  const vals = h.map(cargaDe);
  pintarEn($("cargaChart"), html`
    ${grafLinea({ valores: vals, gradiente: "cg", aria: "Carga de cada sesión", desdeCero: true })}
    ${pieGrafico(fechaCorta(h[0].fecha) + " · " + vals[0],
                 "máximo " + Math.max(...vals, 1),
                 fechaCorta(h[h.length - 1].fecha) + " · " + vals[vals.length - 1])}`);

  conPista($("cargaChart"), {
    n: h.length,
    texto: (i) => fechaCorta(h[i].fecha) + " · carga " + vals[i]
  });
}

/* ── récords y reparto por variante ── */

function pintarRecords() {
  const filas = CIRCUITO.map(b => {
    let mejor = 0, cuando = "", primera = 0;
    state.historial.forEach(s => {
      const v = valorNum((s.postas || {})[b.id]);
      if (!v) return;
      if (!primera) primera = v;
      if (v > mejor) { mejor = v; cuando = s.fecha; }
    });
    return { b, mejor, cuando, primera };
  }).filter(f => f.mejor > 0);

  if (!filas.length) {
    pintarEn($("recsBox"), html`<tr><td class="note" style="border:0">
      Todavía no hay marcas. Aparecerán en cuanto guardes una sesión.</td></tr>`);
    return;
  }
  pintarEn($("recsBox"), html`
    <tr><th>Ejercicio</th><th>Mejor</th><th>Desde la 1.ª</th></tr>
    ${filas.map(f => {
      const pct = f.primera ? Math.round((f.mejor - f.primera) / f.primera * 100) : 0;
      return html`<tr>
        <td>${f.b.alias || EJ[f.b.ej].nombre}<br>
          <span class="note" style="padding:0">${f.cuando ? fechaCorta(f.cuando) : ""}</span></td>
        <td class="n">${f.mejor} ${unidadCorta(f.b)}</td>
        <td class="n"><span class="delta ${pct > 0 ? "up" : "flat"}">${pct > 0 ? "+" : ""}${pct}%</span></td></tr>`;
    })}`);
}

function pintarRepartos() {
  const cuenta = {};
  state.historial.forEach(s => { const k = s.variante || "base"; cuenta[k] = (cuenta[k] || 0) + 1; });
  const claves = Object.keys(cuenta);
  if (!claves.length) {
    pintarEn($("repartos"), "");
    pintarEn($("repartosLeyenda"), html`<span class="note" style="padding:0">Sin sesiones todavía.</span>`);
    return;
  }
  const total = claves.reduce((n, k) => n + cuenta[k], 0);
  const tonos = ["var(--accent)", "var(--done)", "var(--hair-strong)", "var(--hot)", "var(--ink-3)"];
  const tono = (i) => tonos[i % tonos.length];

  pintarEn($("repartos"), claves.map((k, i) =>
    html`<i style="width:${cuenta[k] / total * 100}%;background:${tono(i)}"></i>`));
  pintarEn($("repartosLeyenda"), claves.map((k, i) =>
    html`<span><b style="background:${tono(i)}"></b>${varianteDe(k).nombre} · ${cuenta[k]}</span>`));
}

/* ── historial ── */

function pintarHistorial(total) {
  pintarEn($("histList"), total
    ? state.historial.slice().reverse().slice(0, 30).map(s => html`<li>
        <span class="badge">${varianteDe(s.variante).nombre.slice(0, 3).toUpperCase()}</span>
        <span class="dt">${fechaCorta(s.fecha)}</span>
        <span class="vol">${Object.values(s.postas || {}).filter(x => x.hecho).length} postas ·
          ${s.duracion || 0} min</span></li>`)
    : html`<li><span class="vol">Todavía no hay sesiones. La primera es la que cuesta.</span></li>`);
}

/* ── progreso por ejercicio ── */

function llenarSelector() {
  const usados = new Set();
  state.historial.forEach(s => Object.keys(s.postas || {}).forEach(k => usados.add(k)));
  const conNombre = CIRCUITO.filter(b => usados.size ? usados.has(b.id) : true);
  const previo = $("exPicker").value;
  pintarEn($("exPicker"), conNombre.map(b =>
    html`<option value="${b.id}">${b.alias || EJ[b.ej].nombre}</option>`));
  if (previo && conNombre.some(b => b.id === previo)) $("exPicker").value = previo;
}

function pintarEjercicio() {
  const id = $("exPicker").value;
  if (!id) return;
  const base = CIRCUITO.find(b => b.id === id);
  const filas = [];
  state.historial.forEach(s => {
    const r = (s.postas || {})[id];
    if (r && r.hecho && r.valor) filas.push({ fecha: s.fecha, total: Number(r.valor) });
  });

  if (!filas.length) {
    pintarEn($("exChart"), html`<div class="note" style="padding:10px 0 4px">
      Sin datos todavía. Aparecerá en cuanto lo apuntes.</div>`);
    pintarEn($("exLog"), "");
    return;
  }

  const vals = filas.map(f => f.total);
  const u = unidadCorta(base);
  pintarEn($("exChart"), html`
    ${grafBarras({ valores: vals, aria: "Marca en cada sesión" })}
    ${pieGrafico(fechaCorta(filas[0].fecha),
                 "tu marca por sesión · máximo " + Math.max(...vals, 1) + " " + u,
                 fechaCorta(filas[filas.length - 1].fecha))}`);

  conPista($("exChart"), {
    n: filas.length, modo: "bandas", arriba: 6,
    texto: (i) => fechaCorta(filas[i].fecha) + " · " + filas[i].total + " " + u
  });

  pintarEn($("exLog"), filas.slice().reverse().slice(0, 12).map(f => {
    const antes = filas.filter(x => x.fecha < f.fecha).map(x => x.total);
    const esPR = antes.length > 0 && f.total > Math.max(...antes);
    return html`<li><span class="d">${fechaCorta(f.fecha)}</span>
      <span class="s">${f.total} ${u}</span>${esPR ? html`<span class="pr">récord</span>` : ""}</li>`;
  }));
}

/* ── peso corporal ── */

function pintarPeso() {
  const p = state.peso;
  if (p.length < 2) {
    pintarEn($("wChart"), html`<div class="note" style="padding:6px 0 2px">
      ${p.length ? "Anotado " + p[0].kg + " kg. Con dos pesadas te dibujo la tendencia."
                 : "Anota tu peso para ver la tendencia. Es opcional."}</div>`);
    return;
  }
  const vals = p.map(x => x.kg);
  const pri = p[0], ult = p[p.length - 1];
  const dif = (ult.kg - pri.kg).toFixed(1);

  pintarEn($("wChart"), html`
    ${grafLinea({ valores: vals, gradiente: "wg", aria: "Evolución del peso corporal" })}
    ${pieGrafico(fechaCorta(pri.fecha) + " · " + pri.kg + " kg",
                 (dif > 0 ? "+" : "") + dif + " kg en " + p.length + " pesadas",
                 fechaCorta(ult.fecha) + " · " + ult.kg + " kg")}`);
}

/* ── cableado fijo de la pantalla ── */

export function cablearProgreso() {
  $("exPicker").addEventListener("change", pintarEjercicio);

  $("wAdd").addEventListener("click", () => {
    const v = parseFloat(String($("wInput").value).replace(",", "."));
    if (!v || v < 20 || v > 400) { toast("Escribe un peso válido en kilos"); return; }
    const f = hoyISO();
    const i = state.peso.findIndex(x => x.fecha === f);
    if (i >= 0) state.peso[i].kg = v; else state.peso.push({ fecha: f, kg: v });
    state.peso.sort((a, b) => a.fecha.localeCompare(b.fecha));
    guardar(); $("wInput").value = ""; pintarPeso();
    toast("Anotado: " + v + " kg");
  });
}
