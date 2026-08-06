/* La sesión que se está entrenando ahora mismo, y las cuentas que salen de
   una sesión ya guardada. La llevan dos pantallas —la lista y el modo
   guiado—, así que vive fuera de las dos. */

import { state } from "./almacen.js";
import { CIRCUITO } from "./catalogo.js";

export let sesionActiva = null;
let inicio = 0;

/** Abre una sesión en blanco con una entrada por posta. */
export function abrirSesion({ fecha, variante, semana, postas }) {
  sesionActiva = { fecha, variante, semana, postas: {}, sensacion: 3, notas: "" };
  postas.forEach(e => { sesionActiva.postas[e.id] = { valor: "", hecho: false }; });
  inicio = Date.now();
  return sesionActiva;
}

export function cerrarSesion() { sesionActiva = null; }

export function postasHechas() {
  return sesionActiva ? Object.values(sesionActiva.postas).filter(x => x.hecho).length : 0;
}

export const segundosDeSesion = () => Math.floor((Date.now() - inicio) / 1000);
export const minutosDeSesion = () => Math.round((Date.now() - inicio) / 60000);

/* ── cuentas sobre sesiones guardadas ── */

export function valorNum(r) { return r && r.hecho && r.valor ? Number(r.valor) || 0 : 0; }

/** Carga de una sesión: repeticiones y pasos tal cual, más un tercio de los
    segundos aguantados, que si no los isométricos se comerían el número. */
export function cargaDe(s) {
  let t = 0;
  CIRCUITO.forEach(b => {
    const v = valorNum((s.postas || {})[b.id]);
    if (!v) return;
    t += b.tipo === "tiempo" ? v / 3 : v;
  });
  return Math.round(t);
}

export function mejorHasta(id, fechaTope) {
  let m = 0;
  state.historial.forEach(s => {
    if (fechaTope && s.fecha >= fechaTope) return;
    const v = valorNum((s.postas || {})[id]);
    if (v > m) m = v;
  });
  return m;
}

/** Postas de esta sesión que superan todo lo anterior. */
export function recordsDe(s) {
  const out = [];
  CIRCUITO.forEach(b => {
    const v = valorNum((s.postas || {})[b.id]);
    if (!v) return;
    const previo = mejorHasta(b.id, s.fecha);
    if (previo > 0 && v > previo) out.push({ id: b.id, valor: v, previo: previo });
  });
  return out;
}
