/* Motor de figuras.
   Cada ejercicio se dibuja como un cuerpo articulado sobre un lienzo, a partir
   de las dos posturas que trae el catálogo. Se anima solo lo que está a la
   vista, y con la pausa de los extremos, para no calentar el móvil dibujando
   cosas que nadie está mirando. */

import { EJ } from "./catalogo.js";
import { html } from "./plantilla.js";
import { W, H, SUELO, SEG, dir, add, lerpP, ik, mezclar } from "./postura.js";

/* ── colores, leídos del tema y recordados hasta que el tema cambie ── */

let PAL = null;
function paleta() {
  if (PAL) return PAL;
  const cs = getComputedStyle(document.documentElement);
  PAL = {
    ink: cs.getPropertyValue("--fig-ink").trim(),
    dim: cs.getPropertyValue("--fig-dim").trim(),
    prop: cs.getPropertyValue("--fig-prop").trim(),
    load: cs.getPropertyValue("--fig-load").trim(),
    fondo: cs.getPropertyValue("--surface-2").trim()
  };
  return PAL;
}
function olvidarPaleta() { PAL = null; }

/* ── trazos ── */

function trazo(ctx, pts, ancho, color) {
  ctx.strokeStyle = color; ctx.lineWidth = ancho;
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke();
}
function rect(ctx, x, y, w, h, r, color) {
  ctx.fillStyle = color; ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
  ctx.fill();
}

/* ── el decorado: lo que hay alrededor del cuerpo ── */

const ATREZO = {
  silla(ctx, c, p) {
    const [x1, x2, y] = p;
    rect(ctx, x1, y, x2 - x1, 6, 2, c.prop);
    rect(ctx, x1, y + 6, 5, SUELO - y - 6, 1, c.prop);
    rect(ctx, x2 - 5, y + 6, 5, SUELO - y - 6, 1, c.prop);
    rect(ctx, x1, y - 46, 5, 46, 1, c.prop);
    rect(ctx, x1, y - 46, 24, 5, 2, c.prop);
  },
  mesa(ctx, c, p) {
    const [x1, x2, y] = p;
    rect(ctx, x1, y, x2 - x1, 7, 2, c.prop);
    rect(ctx, x1 + 8, y + 7, 5, SUELO - y - 7, 1, c.prop);
    rect(ctx, x2 - 14, y + 7, 5, SUELO - y - 7, 1, c.prop);
  },
  pared(ctx, c, p) {
    const [x, arriba] = p;
    rect(ctx, x, arriba, 7, SUELO - arriba, 2, c.prop);
  },
  esterilla(ctx, c, p) {
    const [x1, x2] = p;
    rect(ctx, x1, SUELO - 3, x2 - x1, 5, 2, c.prop);
  },
  agua(ctx, c, p) {
    const [y] = p;
    ctx.save();
    ctx.globalAlpha = 0.5;
    rect(ctx, 0, y, W, SUELO + 4 - y, 0, c.prop);
    ctx.restore();
    trazo(ctx, [[6, y], [W - 6, y]], 2.5, c.prop);
  },
  escalera(ctx, c, p) {
    const [x0, ancho, alto, n] = p;
    for (let i = 0; i < n; i++) {
      const x = x0 + i * ancho, y = SUELO - (i + 1) * alto;
      rect(ctx, x, y, W - x, SUELO - y, 1, c.prop);
    }
  }
};

/* ── el cuerpo ── */

function dibujarFigura(ctx, po, ej, c) {
  const s = po.escala || 1;
  ctx.save();
  ctx.translate(160, SUELO);
  ctx.scale(s, s);
  ctx.translate(-160, -SUELO);

  const d = dir(po.tors);
  const cuello = add(po.cad, d, SEG.torso);
  const cab = add(cuello, d, SEG.cabeza + 3);

  const pierN = ik(po.cad, po.pieN, SEG.muslo, SEG.tibia, po.flexRod);
  const pierF = ik(po.cad, po.pieF, SEG.muslo, SEG.tibia, po.flexRod);
  const brazN = ik(cuello, po.manN, SEG.brazo, SEG.antebrazo, po.flexCod);
  const brazF = ik(cuello, po.manF, SEG.brazo, SEG.antebrazo, po.flexCod);

  const pieDe = (tob) => [[tob[0], tob[1]], [tob[0] + SEG.pie, Math.min(SUELO, tob[1] + 4)]];

  // El lado lejano va apagado para dar profundidad, salvo en los ejercicios
  // que se ven de frente: ahí los dos lados pesan igual y la simetría se lee.
  const lejos = ej.frontal ? c.ink : c.dim;
  trazo(ctx, [po.cad, pierF.j, pierF.fin], ej.frontal ? 10 : 8, lejos);
  trazo(ctx, pieDe(pierF.fin), ej.frontal ? 8 : 7, lejos);
  trazo(ctx, [cuello, brazF.j, brazF.fin], ej.frontal ? 9 : 7, lejos);

  // tronco y cabeza
  trazo(ctx, [po.cad, cuello], 15, c.ink);
  ctx.fillStyle = c.ink;
  ctx.beginPath(); ctx.arc(cab[0], cab[1], SEG.cabeza, 0, Math.PI * 2); ctx.fill();

  // lado cercano
  trazo(ctx, [po.cad, pierN.j, pierN.fin], 10, c.ink);
  trazo(ctx, pieDe(pierN.fin), 8, c.ink);
  trazo(ctx, [cuello, brazN.j, brazN.fin], 9, c.ink);

  // carga
  if (ej.peso === "manos") {
    const m = lerpP(brazN.fin, brazF.fin, 0.5);
    if (ej.pesoTipo === "mancuernas") {
      rect(ctx, m[0] - 3, m[1] - 9, 6, 18, 3, c.load);
      rect(ctx, m[0] - 7, m[1] - 6, 14, 4, 2, c.load);
      rect(ctx, m[0] - 7, m[1] + 2, 14, 4, 2, c.load);
    } else {
      rect(ctx, m[0] - 11, m[1] - 2, 22, 24, 5, c.load);
      trazo(ctx, [[m[0] - 6, m[1] - 2], [m[0] - 6, m[1] - 8], [m[0] + 6, m[1] - 8], [m[0] + 6, m[1] - 2]], 3, c.load);
    }
  } else if (ej.peso === "espalda") {
    const m = lerpP(po.cad, cuello, 0.55);
    const n = [-d[1], d[0]];
    rect(ctx, m[0] + n[0] * 9 - 10, m[1] + n[1] * 9 - 11, 20, 22, 5, c.load);
  }
  ctx.restore();
}

function dibujar(cv, ej, t) {
  const ctx = cv.getContext("2d");
  const c = paleta();
  const esc = cv.width / W;
  ctx.setTransform(esc, 0, 0, esc, 0, 0);
  ctx.clearRect(0, 0, W, H);

  (ej.atrezo || []).forEach(a => { if (ATREZO[a[0]]) ATREZO[a[0]](ctx, c, a.slice(1)); });
  trazo(ctx, [[8, SUELO + 2], [W - 8, SUELO + 2]], 3, c.prop);

  const [A, B] = ej.poses;
  if (t === null) {                       // sin animación: fantasma + postura final
    ctx.globalAlpha = 0.28; dibujarFigura(ctx, A, ej, c);
    ctx.globalAlpha = 1;    dibujarFigura(ctx, B, ej, c);
  } else {
    dibujarFigura(ctx, mezclar(A, B, t), ej, c);
  }
}

/* ── bucle de animación: solo lo visible, y con pausa en los extremos ── */

const lienzos = new Set();
const sinMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)");
let observador = null;

function ritmo(ms, dur) {
  const u = (ms % dur) / dur;             // 0…1
  const f = u < 0.5 ? u * 2 : (1 - u) * 2;
  return f < 0.5 ? 4 * f * f * f : 1 - Math.pow(-2 * f + 2, 3) / 2;
}
function medirLienzo(cv) {
  const r = cv.getBoundingClientRect();
  if (!r.width) return false;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.round(r.width * dpr);
  if (cv.width !== w) { cv.width = w; cv.height = Math.round(w * H / W); }
  return true;
}
function limpiarFiguras() {
  lienzos.forEach(cv => { if (!cv.isConnected) { lienzos.delete(cv); if (observador) observador.unobserve(cv); } });
}
function bucle(ms) {
  limpiarFiguras();
  if (EJ) lienzos.forEach(cv => {
    if (!cv._ver || !medirLienzo(cv)) return;
    const ej = EJ[cv.dataset.ej];
    if (!ej) return;
    dibujar(cv, ej, sinMovimiento.matches ? null : ritmo(ms + (cv._fase || 0), ej.ritmo || 2600));
  });
  requestAnimationFrame(bucle);
}

/** Apunta los lienzos que acaban de aparecer para que el bucle los dibuje. */
export function registrarFiguras(raiz) {
  if (!observador && "IntersectionObserver" in window) {
    observador = new IntersectionObserver(es => es.forEach(e => { e.target._ver = e.isIntersecting; }),
      { rootMargin: "120px" });
  }
  raiz.querySelectorAll("canvas[data-ej]").forEach(cv => {
    if (cv._reg) return;
    cv._reg = true; cv._ver = true;
    lienzos.add(cv);
    if (observador) observador.observe(cv);
  });
}

export function lienzoHTML(id, clase) {
  return html`<canvas class="fig ${clase || ""}" data-ej="${id}" role="img"
    aria-label="Ilustración del ejercicio ${EJ[id].nombre}"></canvas>`;
}

export function arrancarFiguras() {
  requestAnimationFrame(bucle);
  new MutationObserver(olvidarPaleta)
    .observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  if (window.matchMedia) window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", olvidarPaleta);
}
