/* Pantalla RUTINAS: el circuito entero para leerlo con calma, sin cronómetro
   ni casillas. Es la referencia, no la sesión. */

import { html, pintarEn } from "../plantilla.js";
import { $ } from "../util.js";
import { perfil } from "../almacen.js";
import { EJ, CIRCUITO, VARIANTES, VUELTA, ACCESOS } from "../catalogo.js";
import { circuito, calentamientoDe, textoMeta } from "../circuito.js";
import { semanaActual, variantesPosibles } from "../plan.js";
import { lienzoHTML, registrarFiguras } from "../figuras.js";

const puntos = (lista) => html`<ul class="checklist" style="pointer-events:none">
  ${lista.map(t => html`<li><label><span>${t}</span></label></li>`)}</ul>`;

function bloquePosta(e, i) {
  const ej = EJ[e.ej];
  return html`<div class="exc">
    <div class="exc-head"><span class="i">${i + 1}</span>
      <span class="nm"><b>${e.nombre}</b><span>${textoMeta(e)} · ${ej.musculos.join(", ")}</span></span></div>
    <div class="figwrap">${lienzoHTML(e.ej)}</div>
    <div class="cues on">
      ${e.avisos.map(a => html`<div class="aviso">${a}</div>`)}
      ${e.nota && html`<p style="font-size:14px;margin:0 0 10px">${e.nota}</p>`}
      <ol>${ej.cues.map(c => html`<li>${c}</li>`)}</ol>
      <div class="lvl"><span><b>Más fácil</b>${ej.facil}</span><span><b>Más difícil</b>${ej.dificil}</span></div>
    </div></div>`;
}

/** Qué cambia una variante respecto al circuito básico, dicho en una línea. */
function cambiosDe(v) {
  const fuera = [];
  if (v.calentamiento) fuera.push("Calentamiento: " + v.calentamiento + ".");
  Object.keys(v.postas).forEach(id => {
    const c = v.postas[id];
    const orig = CIRCUITO.find(b => b.id === id);
    const nombre = EJ[orig.ej].nombre + (id === "flexion2" ? " (segunda tanda)" : "");
    if (c.ej) fuera.push(nombre + " → " + EJ[c.ej].nombre +
      (c.meta ? " · " + c.meta + (c.tipo === "tiempo" ? " s" : "") : ""));
    else if (c.nota) fuera.push(nombre + ": " + c.nota);
  });
  return fuera;
}

function bloqueVariante(clave) {
  const v = VARIANTES[clave];
  const puede = variantesPosibles().indexOf(clave) >= 0;
  return html`<div class="exc">
    <div class="exc-head"><span class="nm"><b>${v.nombre}</b>
      <span>${puede ? "Disponible para ti" : "Necesitas " + ACCESOS[v.falta]}</span></span></div>
    <div class="cues on"><p style="font-size:14px">${v.resumen}</p>
      <div class="lvl">${cambiosDe(v).map(c => html`<span>${c}</span>`)}</div></div></div>`;
}

export function pintarRutinas() {
  const postas = circuito(semanaActual());

  pintarEn($("routinesView"), html`
    <div><h2 class="sec">Antes · calentamiento</h2>
      <div class="panel">${puntos(calentamientoDe(perfil().variante))}</div></div>

    <div><h2 class="sec">El circuito · ${postas.length} postas encadenadas</h2>
      <div class="panel">${postas.map(bloquePosta)}</div></div>

    <div><h2 class="sec">Después · vuelta a la calma</h2>
      <div class="panel">${puntos(VUELTA)}</div></div>

    <div><h2 class="sec">Las cuatro variantes</h2>
      <div class="panel">${Object.keys(VARIANTES).filter(k => k !== "base").map(bloqueVariante)}</div>
      <div class="note">Solo después de dos semanas completas con el básico, y cambiando una sola cosa
      cada vez.</div></div>`);

  registrarFiguras($("routinesView"));
}
