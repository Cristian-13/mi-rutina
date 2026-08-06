/* Geometría de las posturas.
   Cada ejercicio se describe por dónde están la cadera, los pies y las manos;
   las rodillas y los codos los resuelve la cinemática inversa, así los pies
   nunca se despegan del suelo ni salen posturas rotas.

   Vive aparte del motor de dibujo porque el catálogo también lo necesita: es
   lo que convierte las posturas abreviadas del JSON en posturas completas. */

export const W = 320, H = 200, SUELO = 176;
export const SEG = { torso: 44, muslo: 40, tibia: 38, brazo: 30, antebrazo: 28, cabeza: 11, pie: 13 };

/* De pie y de perfil: es la postura de la que parten todas las demás, y de la
   que cada ejercicio cambia solo lo que necesita. */
const POR_DEFECTO = {
  cad: [160, 98], tors: -90,
  pieN: [160, SUELO], pieF: [152, SUELO],
  manN: [166, 140], manF: [158, 140],
  flexRod: -1, flexCod: -1, escala: 1
};

export function dir(g) { const r = g * Math.PI / 180; return [Math.cos(r), Math.sin(r)]; }
export function add(p, d, l) { return [p[0] + d[0] * l, p[1] + d[1] * l]; }
export function lerp(a, b, t) { return a + (b - a) * t; }
export function lerpP(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)]; }

/** Codo o rodilla: punto intermedio entre origen y destino. `flex` elige el lado de la flexión. */
export function ik(o, d, l1, l2, flex) {
  let dx = d[0] - o[0], dy = d[1] - o[1];
  let dist = Math.hypot(dx, dy) || 0.0001;
  const max = l1 + l2 - 0.02, min = Math.abs(l1 - l2) + 0.02;
  if (dist > max) { dx *= max / dist; dy *= max / dist; dist = max; }
  if (dist < min) { dx *= min / dist; dy *= min / dist; dist = min; }
  const a = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const mx = o[0] + dx * a / dist, my = o[1] + dy * a / dist;
  return { j: [mx + flex * h * (-dy / dist), my + flex * h * (dx / dist)],
           fin: [o[0] + dx, o[1] + dy] };
}

/** Completa una postura abreviada. Las coordenadas se copian para que dos
    ejercicios que compartan la postura de partida nunca se pisen entre sí. */
export function postura(p) {
  const o = Object.assign({}, POR_DEFECTO, p);
  for (const k in o) if (Array.isArray(o[k])) o[k] = o[k].slice();
  return o;
}

export function mezclar(a, b, t) {
  const o = {};
  for (const k in a) {
    if (Array.isArray(a[k])) o[k] = lerpP(a[k], b[k] || a[k], t);
    else if (typeof a[k] === "number") o[k] = lerp(a[k], b[k] === undefined ? a[k] : b[k], t);
    else o[k] = a[k];
  }
  return o;
}
