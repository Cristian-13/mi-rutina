/* Pantalla SESIÓN: el circuito como lista, para quien prefiere apuntar a mano
   en vez de dejarse llevar por el modo guiado. Comparte con él la sesión en
   curso y el guardado; lo único suyo es esta lista y el cronómetro pequeño. */

import { html, pintarEn } from "../plantilla.js";
import { $, toast, hoyISO } from "../util.js";
import { perfil } from "../almacen.js";
import { EJ, VUELTA, varianteDe } from "../catalogo.js";
import { circuito, calentamientoDe, textoMeta, unidad, objetivo } from "../circuito.js";
import { SEMANAS_PLAN, semanaActual, ultimaVez, estancado } from "../plan.js";
import { sesionActiva, abrirSesion, cerrarSesion, postasHechas, segundosDeSesion, minutosDeSesion } from "../registro.js";
import { lienzoHTML, registrarFiguras } from "../figuras.js";
import { vueltaAnillo, desfaseAnillo } from "../graficos.js";
import { ir } from "../navegacion.js";
import { terminarSesion } from "./resumen.js";

const RADIO_RELOJ = 16;
let relojId = null;

/* ══ la lista ══ */

function bloquePosta(e, i) {
  const ej = EJ[e.ej];
  const obj = objetivo(e);
  return html`<div class="exc" data-ex="${e.id}">
    <div class="exc-head"><span class="i">${i + 1}</span>
      <span class="nm"><b>${e.nombre}</b><span>${textoMeta(e)} · ${ej.musculos.join(", ")}</span></span>
      <button class="help" aria-expanded="false" aria-label="Cómo se hace">?</button></div>
    <div class="figwrap">${lienzoHTML(e.ej)}<span class="tag">Cómo se ve</span></div>
    <div class="cues">
      ${e.avisos.map(a => html`<div class="aviso">${a}</div>`)}
      <ol>${ej.cues.map(c => html`<li>${c}</li>`)}</ol>
      <div class="lvl"><span><b>Más fácil</b>${ej.facil}</span><span><b>Más difícil</b>${ej.dificil}</span></div>
    </div>
    ${e.nota && html`<div class="obj" style="color:var(--ink-2)">${e.nota}</div>`}
    ${obj && html`<div class="obj">${obj}</div>`}
    ${!e.sinRegistro && estancado(e.id) && html`<div class="obj" style="color:var(--hot)">
      Tres sesiones sin subir aquí. Prueba la versión difícil de abajo, o cambia de variante.</div>`}
    <div class="sets">
      ${e.sinRegistro
        ? html`<button class="btn tick-wide" data-hecho="${e.id}">Hecho · ${textoMeta(e)}</button>`
        : html`<div class="set" data-ex="${e.id}">
            <span class="sn">${e.tipo === "tiempo" ? "Aguanté" : "Hice"}</span>
            <input inputmode="numeric" placeholder="${unidad(e)}" aria-label="${unidad(e)} en ${e.nombre}">
            <span class="sn" style="text-align:center">${unidad(e)}</span>
            <button class="tick" aria-label="Marcar como hecho">
              <svg viewBox="0 0 24 24"><path d="M4 12l6 6L20 6"/></svg></button></div>`}
      ${e.tipo === "tiempo" && html`<button class="btn small ghost" data-crono="${e.meta || 30}"
        data-nom="${e.nombre}" style="margin-top:6px;align-self:flex-start">Cronómetro ${e.meta || 30} s</button>`}
    </div></div>`;
}

function cablearLista(postas) {
  const porId = {};
  postas.forEach(e => porId[e.id] = e);

  $("exList").querySelectorAll(".help").forEach(btn => btn.addEventListener("click", () => {
    const abierto = btn.getAttribute("aria-expanded") === "true";
    btn.setAttribute("aria-expanded", String(!abierto));
    btn.closest(".exc").querySelector(".cues").classList.toggle("on", !abierto);
  }));

  $("exList").querySelectorAll(".set").forEach(fila => {
    const id = fila.dataset.ex, e = porId[id];
    const campo = fila.querySelector("input");
    campo.addEventListener("input", () => { sesionActiva.postas[id].valor = campo.value; });
    fila.querySelector(".tick").addEventListener("click", () => {
      const reg = sesionActiva.postas[id];
      reg.hecho = !reg.hecho;
      if (reg.hecho && !campo.value) {
        const prev = ultimaVez(id);
        const sug = prev ? prev + 1 : (e.meta || "");
        if (sug) { campo.value = sug; reg.valor = String(sug); }
      }
      fila.classList.toggle("on", reg.hecho);
      $("exList").querySelector('.exc[data-ex="' + id + '"]').classList.toggle("complete", reg.hecho);
      tick();
    });
  });

  $("exList").querySelectorAll("[data-hecho]").forEach(b => b.addEventListener("click", () => {
    const id = b.dataset.hecho, reg = sesionActiva.postas[id];
    reg.hecho = !reg.hecho;
    b.classList.toggle("primary", reg.hecho);
    b.textContent = reg.hecho ? "Hecho ✓" : "Hecho · " + textoMeta(porId[id]);
    $("exList").querySelector('.exc[data-ex="' + id + '"]').classList.toggle("complete", reg.hecho);
    tick();
    if (reg.hecho && porId[id].tipo === "tiempo") arrancarCrono(porId[id].meta, porId[id].nombre);
  }));

  $("exList").querySelectorAll("[data-crono]").forEach(b =>
    b.addEventListener("click", () => arrancarCrono(Number(b.dataset.crono), b.dataset.nom)));
}

export function empezarLista() {
  const sem = semanaActual();
  const postas = circuito(sem);
  const s = abrirSesion({ fecha: hoyISO(), variante: perfil().variante || "base", semana: sem, postas });

  $("sessionKicker").textContent = "Semana " + sem + " de " + SEMANAS_PLAN;
  $("sessionTitle").textContent = varianteDe(s.variante).nombre;
  $("sessionMeta").textContent = postas.length + " postas seguidas, sin descanso entre ellas salvo donde se indica";
  $("feel").value = "3"; $("notesQuick").value = "";

  const casilla = (t) => html`<li><label><input type="checkbox"><span>${t}</span></label></li>`;
  pintarEn($("warmupList"), calentamientoDe(s.variante).map(casilla));
  pintarEn($("cooldownList"), VUELTA.map(casilla));
  pintarEn($("exList"), postas.map(bloquePosta));

  cablearLista(postas);
  registrarFiguras($("exList"));
  clearInterval(relojId); relojId = setInterval(tick, 1000); tick();
  ir("sesion");
}

function tick() {
  if (!sesionActiva) return;
  const s = segundosDeSesion();
  const total = Object.keys(sesionActiva.postas).length;
  $("sessionProg").textContent = postasHechas() + "/" + total + " postas · " +
    String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
}

/* ══ el cronómetro pequeño ══ */

let cronoId = null, cronoQueda = 0, cronoTotal = 0;

function arrancarCrono(seg, etiqueta) {
  cronoQueda = seg || 30; cronoTotal = cronoQueda;
  $("timerL").textContent = etiqueta || "Cuenta atrás";
  $("timer").classList.add("on");
  pintarCrono();
  clearInterval(cronoId);
  cronoId = setInterval(() => {
    cronoQueda--;
    pintarCrono();
    if (cronoQueda <= 0) {
      pararCrono();
      if (navigator.vibrate) navigator.vibrate([120, 60, 120]);
      toast("Tiempo · sigue con la siguiente posta");
    }
  }, 1000);
}
function pintarCrono() {
  const q = Math.max(0, cronoQueda);
  $("timerT").textContent = Math.floor(q / 60) + ":" + String(q % 60).padStart(2, "0");
  $("timerRing").setAttribute("stroke-dasharray", vueltaAnillo(RADIO_RELOJ).toFixed(1));
  $("timerRing").setAttribute("stroke-dashoffset", desfaseAnillo(RADIO_RELOJ, q / cronoTotal));
}
function pararCrono() { clearInterval(cronoId); $("timer").classList.remove("on"); }

/* ══ cableado fijo de la pantalla ══ */

export function cablearSesion() {
  $("timerStop").addEventListener("click", pararCrono);
  $("timerPlus").addEventListener("click", () => {
    cronoQueda += 15; cronoTotal = Math.max(cronoTotal, cronoQueda); pintarCrono();
  });
  $("timerMinus").addEventListener("click", () => { cronoQueda = Math.max(1, cronoQueda - 15); pintarCrono(); });

  $("backBtn").addEventListener("click", () => {
    if (postasHechas() && !confirm("Vas a salir sin guardar la sesión. ¿Seguro?")) return;
    clearInterval(relojId); pararCrono(); cerrarSesion(); ir("hoy");
  });

  $("finishBtn").addEventListener("click", () => {
    if (!sesionActiva) return;
    if (!postasHechas()) { toast("Marca al menos una posta antes de guardar"); return; }
    sesionActiva.sensacion = Number($("feel").value);
    sesionActiva.notas = $("notesQuick").value;
    sesionActiva.duracion = minutosDeSesion();
    pararCrono();
    clearInterval(relojId);
    terminarSesion();
  });
}
