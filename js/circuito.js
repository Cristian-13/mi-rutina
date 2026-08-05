/* Construir el circuito del día.
   El vídeo dicta once postas fijas. Lo que las convierte en las de hoy son
   tres capas encima, en este orden: la variante elegida, las molestias
   marcadas y el nivel de quien entrena. */

import { EJ, CIRCUITO, ADAPTA, CALENTAMIENTO, varianteDe } from "./catalogo.js";
import { perfil } from "./almacen.js";
import { SEMANAS_PLAN, ultimaVez } from "./plan.js";

/** Une la posta del vídeo con el nivel, las molestias y la variante elegida. */
export function posta(base, semana) {
  const p = perfil();
  const mol = p.molestias || [];
  const v = varianteDe(p.variante);
  const o = {
    id: base.id, ej: base.ej, tipo: base.tipo, meta: base.meta, medida: base.medida,
    nota: base.nota, sinRegistro: base.sinRegistro, respiro: base.respiro,
    avisos: []
  };

  // 1) la variante sustituye la posta antes que nada
  const cam = v.postas[base.id];
  if (cam) {
    if (cam.ej) { o.ej = cam.ej; o.avisos.push(v.nombre + ": esta posta cambia de ejercicio."); }
    if (cam.tipo) o.tipo = cam.tipo;
    if (cam.meta !== undefined) o.meta = cam.meta;
    if (cam.nota) o.avisos.push(v.nombre + ": " + cam.nota);
  }

  // 2) y encima de eso, lo que pidan las molestias
  mol.forEach(m => {
    const r = (ADAPTA[m] || {})[base.id];
    if (!r) return;
    if (r.usarAlt && base.alt) { o.ej = base.alt.ej; o.tipo = base.alt.tipo; o.meta = base.alt.meta; }
    if (r.ej) { o.ej = r.ej; o.tipo = r.tipo || o.tipo; o.meta = r.meta !== undefined ? r.meta : o.meta; }
    if (r.aviso) o.avisos.push(r.aviso);
  });

  // «Empieza donde estás, no donde crees que deberías estar»: el vídeo lo repite,
  // así que quien nunca ha entrenado arranca por debajo y sube semana a semana.
  if (o.meta !== null && o.meta !== undefined && !o.sinRegistro) {
    let m = o.meta;
    if (p.nivel === "cero") m = Math.max(o.tipo === "tiempo" ? 15 : 3, Math.round(m * 0.65));
    else if (p.nivel === "algo") m = Math.round(m * 0.85);
    m += (Math.min(semana, SEMANAS_PLAN) - 1) * (o.tipo === "tiempo" ? 5 : 1);
    o.meta = o.tipo === "tiempo" ? Math.max(10, Math.round(m / 5) * 5) : Math.round(m);
  }
  o.nombre = (o.ej === base.ej && base.alias) ? base.alias : EJ[o.ej].nombre;
  return o;
}

export function circuito(semana) { return CIRCUITO.map(b => posta(b, semana)); }

/** La variante puede cambiar el calentamiento; el resto de la preparación se queda. */
export function calentamientoDe(clave) {
  const v = varianteDe(clave);
  return v.calentamiento ? [v.calentamiento].concat(CALENTAMIENTO.slice(1)) : CALENTAMIENTO.slice();
}

export function textoMeta(e) {
  if (e.meta === null || e.meta === undefined) return "las que salgan";
  if (e.tipo === "tiempo") return e.meta + " s";
  if (e.medida) return e.meta + " " + e.medida;
  if (e.tipo === "pasos") return e.meta + " pasos por pierna";
  return e.meta + " repeticiones";
}

export function unidad(e) { return e.tipo === "tiempo" ? "seg" : (e.tipo === "pasos" ? "pasos" : "reps"); }

/** Qué pedirle hoy a una posta, a partir de lo que se hizo la última vez. */
export function objetivo(e) {
  if (e.sinRegistro) return "";
  const prev = ultimaVez(e.id);
  if (!prev) return e.meta ? "Objetivo de hoy: " + textoMeta(e) + "." : "Primera vez: las que salgan, y apúntalas.";
  return "La última vez: " + prev + " " + unidad(e) + ". Hoy: " + (prev + 1) + " o más.";
}
