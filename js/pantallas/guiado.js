/* MODO GUIADO.
   Un circuito no se entrena con una lista y un teclado: se entrena mirando una
   pantalla que va sola. Esto lleva posta a posta, cuenta los tiempos y avanza
   sin que haya que tocar nada con las manos sudadas. */

import { html, pintarEn } from "../plantilla.js";
import { $, hoyISO, toast } from "../util.js";
import { perfil } from "../almacen.js";
import { EJ } from "../catalogo.js";
import { circuito, textoMeta, unidad } from "../circuito.js";
import { semanaActual, ultimaVez } from "../plan.js";
import { sesionActiva, abrirSesion, cerrarSesion, postasHechas, minutosDeSesion } from "../registro.js";
import { lienzoHTML, registrarFiguras } from "../figuras.js";
import { anillo, desfaseAnillo } from "../graficos.js";
import { ir } from "../navegacion.js";
import { terminarSesion } from "./resumen.js";

const RADIO_CRONO = 58;

export let gui = null;
let tid = null, wakeLock = null;

/* ── que la pantalla no se apague en mitad de una plancha ── */
async function pantallaViva(on) {
  try {
    if (on && "wakeLock" in navigator) wakeLock = await navigator.wakeLock.request("screen");
    else if (wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch (e) { /* el navegador puede negarlo: no es crítico */ }
}

export function abrirGuiado() {
  const sem = semanaActual();
  const postas = circuito(sem);
  abrirSesion({ fecha: hoyISO(), variante: perfil().variante || "base", semana: sem, postas });

  gui = { postas: postas, i: 0, restante: 0, corriendo: false, valor: 0, ultimo: 0 };
  $("play").classList.add("on");
  pantallaViva(true);
  pintarGuiado();
}

export function postaActual() { return gui.postas[gui.i]; }

/* ── lo que se ve ── */

function bloqueCrono() {
  return html`<div class="crono">${anillo({
    lado: 132, radio: RADIO_CRONO, grosor: 9, fraccion: 1, id: "guiRing",
    dentro: html`<text id="guiNum" x="66" y="80" text-anchor="middle" class="n" fill="var(--ink)"
      style="font-family:var(--data);font-size:40px;font-weight:600">0</text>`
  })}</div>`;
}

function bloqueContador(e) {
  return html`<div class="contador">
    <button id="guiMenos" aria-label="Restar">−</button>
    <div><div class="v" id="guiVal">0</div><div class="u">${unidad(e)}</div></div>
    <button id="guiMas" aria-label="Sumar">+</button></div>`;
}

function pintarGuiado() {
  const e = postaActual();
  const ej = EJ[e.ej];
  const esTiempo = e.tipo === "tiempo";

  $("playK").textContent = "Posta " + (gui.i + 1) + " de " + gui.postas.length;
  pintarEn($("playBar"), gui.postas.map((x, k) =>
    html`<i class="${k < gui.i ? "hecho" : k === gui.i ? "ahora" : ""}"></i>`));

  if (esTiempo) gui.restante = gui.restante || (e.meta || 30);
  else {
    const prev = ultimaVez(e.id);
    gui.valor = gui.valor || (prev ? prev + 1 : (e.meta || 10));
  }

  pintarEn($("playBody"), html`
    <div class="play-fig">${lienzoHTML(e.ej)}</div>
    <h2>${e.nombre}</h2>
    <div class="obje">${textoMeta(e)}${e.respiro ? " · el único respiro" : ""}</div>
    ${e.avisos.map(a => html`<div class="avisop">${a}</div>`)}
    ${esTiempo ? bloqueCrono() : bloqueContador(e)}
    ${ej.cues.slice(0, 3).map((c, k) => html`<div class="pista"><b>${k + 1}</b><span>${c}</span></div>`)}
    ${e.nota && html`<div class="pista" style="color:var(--ink-3);margin-top:8px"><span>${e.nota}</span></div>`}
    <div style="height:20px"></div>`);

  registrarFiguras($("playBody"));
  $("playBody").scrollTop = 0;
  $("playPrev").disabled = gui.i === 0;
  $("playNext").disabled = false;
  pintarBoton();
  if (!esTiempo) {
    $("guiMenos").addEventListener("click", () => { gui.valor = Math.max(0, gui.valor - 1); pintarBoton(); });
    $("guiMas").addEventListener("click", () => { gui.valor++; pintarBoton(); });
  }
}

function pintarBoton() {
  const e = postaActual();
  if (e.tipo === "tiempo") {
    $("playGo").textContent = gui.corriendo ? "Pausa" : (gui.restante === (e.meta || 30) ? "Empezar" : "Seguir");
    pintarCuentaAtras();
  } else {
    $("playGo").textContent = gui.i === gui.postas.length - 1 ? "Hecho · terminar" : "Hecho · siguiente";
    const v = $("guiVal");
    if (v) v.textContent = gui.valor;
  }
}

function pintarCuentaAtras() {
  const tot = postaActual().meta || 30;
  const q = Math.max(0, Math.ceil(gui.restante));
  const num = $("guiNum"), ring = $("guiRing");
  if (num) num.textContent = q;
  if (ring) ring.setAttribute("stroke-dashoffset", desfaseAnillo(RADIO_CRONO, q / tot));
}

/* ── la cuenta atrás ── */

export function arrancarGui() {
  gui.corriendo = true;
  gui.ultimo = Date.now();
  clearInterval(tid);
  tid = setInterval(() => {
    const ahora = Date.now();
    gui.restante -= (ahora - gui.ultimo) / 1000;
    gui.ultimo = ahora;
    if (gui.restante <= 0) {
      gui.restante = 0;
      pararGui();
      if (navigator.vibrate) navigator.vibrate([160, 80, 160]);
      registrarYAvanzar();
      return;
    }
    if (navigator.vibrate && Math.ceil(gui.restante) <= 3 && Math.ceil(gui.restante) !== gui._pit) {
      gui._pit = Math.ceil(gui.restante);
      navigator.vibrate(45);
    }
    pintarCuentaAtras();
  }, 200);
  pintarBoton();
}

function pararGui() { clearInterval(tid); tid = null; gui.corriendo = false; }

/** Guarda lo hecho en la posta actual y pasa a la siguiente (o termina). */
function registrarYAvanzar() {
  const e = postaActual();
  const reg = sesionActiva.postas[e.id];
  reg.hecho = true;
  if (e.tipo === "tiempo") reg.valor = e.sinRegistro ? "" : String(e.meta || 0);
  else reg.valor = String(gui.valor);

  if (gui.i >= gui.postas.length - 1) { terminarGuiado(); return; }
  avanzar(1);
  if (postaActual().tipo === "tiempo") arrancarGui();
}

function avanzar(paso) {
  gui.i += paso;
  gui.restante = 0; gui.valor = 0; gui._pit = null;
  pintarGuiado();
}

function cerrarPlay() {
  $("play").classList.remove("on");
  pantallaViva(false);
  gui = null;
}

function terminarGuiado() {
  pararGui();
  const hechas = postasHechas();
  const duracion = minutosDeSesion();
  cerrarPlay();
  if (!hechas) {
    cerrarSesion(); ir("hoy");
    toast("Sesión descartada: no completaste ninguna posta");
    return;
  }
  sesionActiva.duracion = duracion;
  terminarSesion();
}

/* ── cableado fijo de la pantalla ── */

export function cablearGuiado() {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && gui) pantallaViva(true);
  });

  $("playGo").addEventListener("click", () => {
    if (postaActual().tipo === "tiempo") { gui.corriendo ? pararGui() : arrancarGui(); pintarBoton(); }
    else registrarYAvanzar();
  });
  $("playNext").addEventListener("click", () => {
    pararGui();
    if (gui.i >= gui.postas.length - 1) { terminarGuiado(); return; }
    avanzar(1);
  });
  $("playPrev").addEventListener("click", () => {
    pararGui();
    if (gui.i === 0) return;
    avanzar(-1);
  });
  $("playSaltar").addEventListener("click", () => {
    pararGui();
    sesionActiva.postas[postaActual().id].hecho = false;
    if (gui.i >= gui.postas.length - 1) { terminarGuiado(); return; }
    avanzar(1);
  });
  $("playSalir").addEventListener("click", () => {
    const algo = postasHechas();
    if (algo && !confirm("Vas a salir del circuito. Lo hecho hasta ahora se guardará. ¿Seguro?")) return;
    pararGui();
    if (algo) { terminarGuiado(); return; }
    cerrarPlay(); cerrarSesion(); ir("hoy");
  });
}
