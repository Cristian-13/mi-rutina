/* Pantalla RESUMEN: lo que acaba de pasar, comparado con lo de antes.
   Aquí también está el punto único de guardado, lo venga a llamar el modo
   guiado o la lista: una sesión se guarda una sola vez y por un solo sitio. */

import { html, pintarEn } from "../plantilla.js";
import { $ } from "../util.js";
import { state, guardar } from "../almacen.js";
import { CIRCUITO, varianteDe, nombreDePosta } from "../catalogo.js";
import { sesionActiva, cerrarSesion, cargaDe, recordsDe } from "../registro.js";
import { ir } from "../navegacion.js";

/** Guarda la sesión en curso y enseña sus resultados. */
export function terminarSesion() {
  const s = sesionActiva;
  s.récords = recordsDe(s);
  state.historial.push(s);
  guardar();
  cerrarSesion();
  pintarResumen(s);
  ir("resumen");
}

function comparacion(carga, otra, etiqueta) {
  if (!otra) return "";
  const c = cargaDe(otra);
  if (!c) return "";
  const pct = Math.round((carga - c) / c * 100);
  return html`<div class="b"><span>${etiqueta}</span>
    <span class="delta ${pct > 0 ? "up" : "flat"}">${pct > 0 ? "+" : ""}${pct}% · ${c} → ${carga}</span></div>`;
}

export function pintarResumen(s) {
  const carga = cargaDe(s);
  const hechas = Object.values(s.postas || {}).filter(x => x.hecho).length;
  const total = CIRCUITO.length;
  const anteriores = state.historial.filter(x => x !== s);
  const recs = s.récords || [];

  pintarEn($("resumenView"), html`
    <div class="panel"><div class="res-hero">
      <div class="big">${hechas}/${total}</div><div class="sub">postas completadas</div>
      <h3>${hechas === total ? "Circuito completo" : "Sesión guardada"}</h3>
      <p style="margin-top:6px;font-size:14.5px">${varianteDe(s.variante).nombre} ·
        ${s.duracion || 0} minutos · carga ${carga}</p>
    </div></div>

    ${recs.length ? html`<div><h2 class="sec">Récords de hoy</h2><div class="panel"><ul class="pr-list">
      ${recs.map(r => html`<li><span class="medalla">◆</span>
        <span class="n">${nombreDePosta(r.id)}</span>
        <span class="v">${r.previo} → ${r.valor}</span></li>`)}
      </ul></div></div>` : ""}

    ${anteriores.length
      ? html`<div><h2 class="sec">Comparado con antes</h2><div class="panel">
          <div class="bars" style="padding:14px 16px">
            ${comparacion(carga, anteriores[anteriores.length - 1], "Sesión anterior")}
            ${comparacion(carga, anteriores[0], "Primera sesión")}
          </div></div></div>`
      : html`<div class="note">Esta es tu referencia. A partir de aquí todo se compara con hoy.</div>`}

    <div><h2 class="sec">¿Cómo te fue?</h2><div class="panel"><div class="pad">
      <select id="resFeel">
        <option value="3">Bien — podría haber hecho un poco más</option>
        <option value="1">Muy fácil — subo de nivel la próxima</option>
        <option value="2">Fácil</option>
        <option value="4">Duro, pero terminé</option>
        <option value="5">Demasiado duro — bajo de nivel</option>
      </select></div></div></div>

    <button class="btn primary" id="resVolver">Listo</button>
    <div style="height:10px"></div>`);

  $("resFeel").value = String(s.sensacion || 3);
  $("resFeel").addEventListener("change", () => { s.sensacion = Number($("resFeel").value); guardar(); });
  $("resVolver").addEventListener("click", () => ir("hoy"));
}
