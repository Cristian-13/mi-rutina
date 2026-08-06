/* Pantalla GUÍA: de qué va todo esto, y el resumen de tu plan.
   El texto largo vive en el HTML, que es donde se lee bien; aquí solo se
   pinta lo que depende del perfil. */

import { html, pintarEn } from "../plantilla.js";
import { $ } from "../util.js";
import { perfil, VERSION_DATOS } from "../almacen.js";
import { varianteDe } from "../catalogo.js";
import { abrirOnboarding } from "./onboarding.js";

const NIVELES = { cero: "Empiezo de cero", algo: "Algo de actividad", vuelvo: "Vuelvo después de un tiempo" };
const ZONAS = { rodilla: "rodillas", hombro: "hombros", espalda: "zona lumbar" };

const dato = (etiqueta, valor) => html`<div class="b"><span>${etiqueta}</span>
  <span style="font-family:var(--body);font-size:14px;color:var(--ink)">${valor}</span></div>`;

export function pintarGuia() {
  const p = perfil();
  const molestias = p.molestias.length ? p.molestias.map(m => ZONAS[m]).join(", ") : "ninguna";

  pintarEn($("perfilBox"), html`
    <div class="bars" style="padding:0">
      ${dato("Nivel", NIVELES[p.nivel])}
      ${dato("Días", p.dias + " por semana")}
      ${dato("Variante", varianteDe(p.variante).nombre)}
      ${dato("Molestias", molestias)}
    </div>
    <div style="height:14px"></div>
    <button class="btn wide" id="editPerfil">Cambiar mi plan</button>
    <div class="note" style="text-align:center;padding-bottom:0">
      Versión ${window.VERSION_APP || "?"} · datos v${VERSION_DATOS}</div>`);

  $("editPerfil").addEventListener("click", abrirOnboarding);
}
