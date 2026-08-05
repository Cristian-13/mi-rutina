/* Pantalla HOY: qué toca, qué trabajas, en qué variante vas y cómo queda la
   semana. Es la portada, y lo único que tiene que conseguir es que hoy se
   entrene. */

import { html, pintarEn } from "../plantilla.js";
import { $, toast } from "../util.js";
import { state, perfil, guardar, ALMACEN } from "../almacen.js";
import { EJ, VARIANTES, ACCESOS, varianteDe } from "../catalogo.js";
import { circuito, textoMeta } from "../circuito.js";
import {
  SEMANAS_PLAN, SESIONES_ANTES_DE_VARIAR, SESIONES_POR_BLOQUE,
  semanaActual, sesionesEstaSemana, diasDesdeUltima,
  variantesPosibles, sesionesEnVariante, tocaRotar, siguienteVariante
} from "../plan.js";
import { anillo } from "../graficos.js";
import { lienzoHTML, registrarFiguras } from "../figuras.js";
import { sePuedeInstalar, pedirInstalacion } from "../instalacion.js";
import { empezarLista } from "./sesion.js";
import { abrirGuiado } from "./guiado.js";

/** Cuántas postas tocan cada grupo muscular: es la idea del circuito hecha barra. */
function cargaMuscular(postas) {
  const cuenta = {};
  postas.forEach(e => EJ[e.ej].musculos.forEach(m => cuenta[m] = (cuenta[m] || 0) + 1));
  const pares = Object.entries(cuenta).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...pares.map(p => p[1]));
  return pares.map(([m, n]) => html`
    <div class="b"><span>${m}</span>
      <div class="track"><div class="fill" style="width:${n / max * 100}%"></div></div>
      <em>${n}${n === 1 ? " posta" : " postas"}</em></div>`);
}

/** Aviso rojo si los datos no van a sobrevivir, y botón de instalar si se puede. */
function bloqueAlmacen() {
  if (!ALMACEN) {
    return html`<div class="alerta"><b>Aquí tus datos no se guardan</b>
      <p>Estás viendo la app dentro de un visor que no le da almacenamiento permanente: al cerrar,
      el historial se pierde. Para que se guarde de verdad hay que abrirla desde su propia dirección
      y añadirla a la pantalla de inicio. Tienes los pasos en la Guía.</p></div>`;
  }
  if (sePuedeInstalar()) {
    return html`<div class="panel"><div class="pad">
      <p style="font-size:14.5px;margin:0"><b>Instálala en el móvil.</b> Se abre como una app,
      funciona sin internet y tus datos dejan de depender del navegador.</p>
      <div style="height:12px"></div>
      <button class="btn wide primary" id="instalarBtn">Instalar Mi Rutina</button></div></div>`;
  }
  return "";
}

function bloqueVariantes(p) {
  const posibles = variantesPosibles();
  const actual = p.variante || "base";
  const hechas = sesionesEnVariante();
  const sig = siguienteVariante();
  const fuera = Object.keys(VARIANTES).filter(k => posibles.indexOf(k) < 0);

  const aviso = tocaRotar()
    ? html`<div class="rulebox" style="border-radius:0">
        <b>Llevas ${hechas} sesiones con ${VARIANTES[actual].nombre}.</b>
        El vídeo lo dice claro: las variantes están para no estancarse.
        Toca cambiar a <b>${VARIANTES[sig].nombre}</b>.
        <div style="height:10px"></div>
        <button class="btn primary" data-var="${sig}">Cambiar a ${VARIANTES[sig].corto}</button></div>`
    : html`<div class="pad" style="padding-bottom:2px"><div class="note" style="padding:0">
        Bloque actual: ${hechas} de ${SESIONES_POR_BLOQUE} sesiones con ${VARIANTES[actual].nombre}.
        Al completarlo toca cambiar.</div></div>`;

  return html`<div><h2 class="sec">Variante · rotación</h2><div class="panel">${aviso}
    <div class="pad" style="padding-top:12px;padding-bottom:6px">
    ${posibles.map(k => html`
      <button class="opt" data-var="${k}" aria-pressed="${String(actual === k)}" style="margin-bottom:8px">
        <span class="mk"></span>
        <span class="ot"><b>${VARIANTES[k].nombre}</b><span>${VARIANTES[k].resumen}</span></span></button>`)}
    </div></div>
    ${fuera.length
      ? html`<div class="note">Te faltan por poder hacer:
          ${fuera.map((k, i) => html`${i ? " · " : ""}${VARIANTES[k].nombre} (necesitas ${ACCESOS[VARIANTES[k].falta]})`)}.
          Puedes activarlas desde la Guía si te haces con ello.</div>`
      : html`<div class="note">Cambia una sola cosa cada vez, y si algo te duele en una articulación,
          vuelve al básico. Son las reglas del vídeo.</div>`}
    </div>`;
}

function bloqueVariantesBloqueado(total) {
  const faltan = SESIONES_ANTES_DE_VARIAR - total;
  return html`<div><h2 class="sec">Variantes</h2><div class="panel"><div class="pad">
    <p style="font-size:14.5px;margin:0">El vídeo pide hacer el básico <b>dos semanas completas</b>
    antes de tocar nada. Te ${faltan === 1 ? "queda 1 sesión" : "quedan " + faltan + " sesiones"}
    para desbloquear las cuatro variantes: agua, mochila cargada, escaleras y suelo.</p>
    </div></div></div>`;
}

function tablaSemana(dias) {
  const plan = {
    2: [["Lunes", 1], ["Martes", 0], ["Miércoles", 0], ["Jueves", 1], ["Viernes", 0], ["Sáb / Dom", 0]],
    3: [["Lunes", 1], ["Martes", 0], ["Miércoles", 1], ["Jueves", 0], ["Viernes", 1], ["Sáb / Dom", 0]],
    4: [["Lunes", 1], ["Martes", 0], ["Miércoles", 1], ["Jueves", 0], ["Viernes", 1], ["Sáb / Dom", 1]]
  }[dias] || [];
  return plan.map(([d, hay]) => hay
    ? html`<tr><td class="day">${d}</td><td>El circuito · 25–30 min</td></tr>`
    : html`<tr class="rest"><td class="day">${d}</td><td>Descanso o caminata suave</td></tr>`);
}

/** El estado de la semana, dicho como se lo diría alguien que te conoce. */
function mensajeDelDia(p, total, hechas) {
  const dias = diasDesdeUltima();
  if (!total) return "Primera sesión. Empieza donde estás hoy, no donde crees que deberías estar: es la regla del vídeo.";
  if (dias === 0) return "Hoy ya entrenaste. El cuerpo necesita un día entero entre sesiones.";
  if (dias === 1) return "Ayer entrenaste. El vídeo pide un día completo de descanso entre sesiones.";
  if (hechas >= p.dias) return "Semana completa. Descansa, que es donde se construye.";
  return "Última sesión hace " + dias + " días.";
}

export function pintarHoy() {
  const p = perfil();
  const sem = semanaActual();
  const postas = circuito(sem);
  const hechas = sesionesEstaSemana();
  const total = state.historial.length;
  const v = varianteDe(p.variante);

  $("topSub").textContent = "Semana " + sem + " · " + total + (total === 1 ? " sesión" : " sesiones");

  pintarEn($("hoyView"), html`
    ${bloqueAlmacen()}
    <div class="panel">
      <div class="hero">
        <div class="k">${p.nombre ? p.nombre + ", hoy toca" : "Hoy toca"} · semana ${sem} de ${SEMANAS_PLAN}</div>
        <h3>${v.nombre}</h3>
        <div class="meta">${postas.length} postas encadenadas · 25 a 30 minutos</div>
        <div class="ring">
          ${anillo({
            lado: 58, radio: 24, grosor: 6, color: "var(--done)",
            fraccion: p.dias ? hechas / p.dias : 0,
            dentro: html`<text x="29" y="33" text-anchor="middle" font-family="var(--data)"
                          font-size="15" font-weight="600" fill="var(--ink)">${hechas}</text>`
          })}
          <div class="rt"><b>${hechas} de ${p.dias} sesiones</b> esta semana<br>${mensajeDelDia(p, total, hechas)}</div>
        </div>
      </div>
      <ul class="prev">${postas.map((e, i) => html`
        <li>${lienzoHTML(e.ej, "mini")}
          <span class="t"><b>${i + 1}. ${e.nombre}</b><span>${EJ[e.ej].musculos.join(" · ")}</span></span>
          <span class="d">${textoMeta(e)}</span></li>`)}
      </ul>
      <div class="pad" style="border-top:1px solid var(--hair)">
        <button class="btn primary" id="startBtn">Empezar guiado</button>
        <div style="height:9px"></div>
        <button class="btn wide ghost" id="startLista">Verlo como lista</button>
        <div class="note" style="padding-top:9px">El modo guiado va posta a posta y cuenta los tiempos
        solo, para que no tengas que tocar el móvil mientras entrenas.</div>
      </div>
    </div>

    <div><h2 class="sec">Qué trabajas</h2>
      <div class="panel"><div class="bars" style="padding-top:16px">${cargaMuscular(postas)}</div></div>
      <div class="note">Es la idea del vídeo: en vez de un día de pecho y otro de piernas, todo a la vez
      y encadenado. Lo llama entrenamiento de estrés compuesto.</div></div>

    ${total >= SESIONES_ANTES_DE_VARIAR ? bloqueVariantes(p) : bloqueVariantesBloqueado(total)}

    <div><h2 class="sec">Tu semana</h2><div class="panel"><table class="week">
      <tr><th>Día</th><th>Qué toca</th></tr>${tablaSemana(p.dias)}</table></div>
      <div class="note">Tres veces por semana con un día completo de descanso entre medias.
      Los días exactos dan igual; lo que no da igual es entrenar dos días seguidos.</div></div>`);

  const bi = $("instalarBtn");
  if (bi) bi.addEventListener("click", pedirInstalacion);
  $("startBtn").addEventListener("click", abrirGuiado);
  $("startLista").addEventListener("click", empezarLista);
  document.querySelectorAll("[data-var]").forEach(b => b.addEventListener("click", () => {
    state.perfil = Object.assign(perfil(), { variante: b.dataset.var });
    guardar(); pintarHoy();
    toast(VARIANTES[b.dataset.var].nombre + " activada");
  }));
  registrarFiguras($("hoyView"));
}
