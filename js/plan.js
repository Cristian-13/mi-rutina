/* El plan: cuántas semanas dura, cuándo toca cambiar de variante y qué dice
   el historial de lo que llevas hecho. Todo se calcula sobre las sesiones
   guardadas; aquí no hay valores de referencia inventados. */

import { state, perfil } from "./almacen.js";
import { VARIANTES } from "./catalogo.js";
import { hoyISO, lunesDe } from "./util.js";

export const SEMANAS_PLAN = 8;
export const SESIONES_ANTES_DE_VARIAR = 6;   // dos semanas, como pide el vídeo
export const SESIONES_POR_BLOQUE = 6;        // y cada bloque de dos semanas toca cambiar

export function semanaActual() {
  return Math.min(SEMANAS_PLAN, Math.floor(state.historial.length / perfil().dias) + 1);
}

export function sesionesEstaSemana() {
  const l = lunesDe(hoyISO());
  return state.historial.filter(s => s.fecha >= l).length;
}

export function rachaSemanas() {
  if (!state.historial.length) return 0;
  const semanas = new Set(state.historial.map(s => lunesDe(s.fecha)));
  let n = 0;
  const cur = new Date(lunesDe(hoyISO()) + "T12:00:00");
  if (!semanas.has(cur.toISOString().slice(0, 10))) cur.setDate(cur.getDate() - 7);
  while (semanas.has(cur.toISOString().slice(0, 10))) { n++; cur.setDate(cur.getDate() - 7); }
  return n;
}

export function diasDesdeUltima() {
  if (!state.historial.length) return 99;
  const u = state.historial[state.historial.length - 1].fecha;
  return Math.round((new Date(hoyISO()) - new Date(u)) / 86400000);
}

/** La última marca registrada en una posta, mirando hacia atrás. */
export function ultimaVez(id) {
  for (let i = state.historial.length - 1; i >= 0; i--) {
    const v = state.historial[i].postas[id];
    if (v && v.valor) return Number(v.valor);
  }
  return null;
}

/** Tres sesiones seguidas sin mejorar en una posta: eso es un estancamiento. */
export function estancado(id) {
  const vals = [];
  for (let i = state.historial.length - 1; i >= 0 && vals.length < 3; i--) {
    const r = (state.historial[i].postas || {})[id];
    if (r && r.hecho && r.valor) vals.push(Number(r.valor));
  }
  return vals.length === 3 && Math.max(vals[0], vals[1]) <= vals[2];
}

/* ── rotación de variantes ── */

/** Variantes que el usuario puede hacer de verdad, según lo que tenga a mano. */
export function variantesPosibles() {
  const acc = perfil().acceso || [];
  return Object.keys(VARIANTES).filter(k => !VARIANTES[k].falta || acc.includes(VARIANTES[k].falta));
}

/** Sesiones seguidas hechas con la variante actual. */
export function sesionesEnVariante() {
  const v = perfil().variante || "base";
  let n = 0;
  for (let i = state.historial.length - 1; i >= 0; i--) {
    if ((state.historial[i].variante || "base") !== v) break;
    n++;
  }
  return n;
}

/** El vídeo pide cambiar para no estancarse: aquí es donde toca. */
export function tocaRotar() {
  return state.historial.length >= SESIONES_ANTES_DE_VARIAR &&
         sesionesEnVariante() >= SESIONES_POR_BLOQUE &&
         variantesPosibles().length > 1;
}

export function siguienteVariante() {
  const lista = variantesPosibles();
  const i = lista.indexOf(perfil().variante || "base");
  return lista[(i + 1) % lista.length];
}
