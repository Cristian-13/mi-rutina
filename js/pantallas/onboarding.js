/* CONFIGURACIÓN INICIAL.
   Cinco preguntas y el plan queda ajustado. Se guarda en un borrador aparte y
   solo se escribe en el perfil al terminar, para que salir a media pregunta no
   deje el plan a medias. */

import { html, pintarEn } from "../plantilla.js";
import { $, toast } from "../util.js";
import { state, perfil, guardar, PERFIL_POR_DEFECTO } from "../almacen.js";
import { ir } from "../navegacion.js";

const PASOS = 5;
const borrador = Object.assign({}, PERFIL_POR_DEFECTO, { molestias: [], acceso: [] });
let paso = 0;

function pintarPasos() {
  pintarEn($("onbSteps"), Array.from({ length: PASOS }, (_, i) => html`<i class="${i <= paso ? "on" : ""}"></i>`));
  document.querySelectorAll(".onb .q").forEach(q => q.classList.toggle("on", Number(q.dataset.step) === paso));
  window.scrollTo(0, 0);
}

export function abrirOnboarding() {
  Object.assign(borrador, JSON.parse(JSON.stringify(perfil())));
  $("onbNombre").value = borrador.nombre || "";
  document.querySelectorAll(".onb .opts").forEach(g => {
    const val = borrador[g.dataset.group];
    g.querySelectorAll(".opt").forEach(o => o.setAttribute("aria-pressed",
      String(Array.isArray(val) ? val.includes(o.dataset.val) : String(val) === o.dataset.val)));
  });
  paso = 0; pintarPasos();
  $("onb").classList.add("on");
}

export function cablearOnboarding() {
  document.querySelectorAll(".onb .opt").forEach(btn => btn.addEventListener("click", () => {
    const grupo = btn.parentElement.dataset.group;
    if (btn.parentElement.hasAttribute("data-single")) {
      btn.parentElement.querySelectorAll(".opt").forEach(o => o.setAttribute("aria-pressed", "false"));
      btn.setAttribute("aria-pressed", "true");
      borrador[grupo] = grupo === "dias" ? Number(btn.dataset.val) : btn.dataset.val;
    } else {
      const on = btn.getAttribute("aria-pressed") === "true";
      btn.setAttribute("aria-pressed", String(!on));
      const set = new Set(borrador[grupo]);
      on ? set.delete(btn.dataset.val) : set.add(btn.dataset.val);
      borrador[grupo] = [...set];
    }
  }));

  document.querySelectorAll(".onb [data-next]").forEach(b => b.addEventListener("click", () => {
    if (paso === 0) borrador.nombre = $("onbNombre").value.trim().slice(0, 24);
    if (paso < PASOS - 1) { paso++; pintarPasos(); return; }
    // El borrador ya trae la variante que había, porque se copió al abrir; el
    // primer término solo cubre el caso de que no hubiera perfil todavía.
    state.perfil = Object.assign({ variante: perfil().variante || "base" }, JSON.parse(JSON.stringify(borrador)));
    guardar();
    $("onb").classList.remove("on");
    ir("hoy");
    toast(borrador.nombre ? "Plan listo, " + borrador.nombre : "Tu plan está listo");
  }));
}
