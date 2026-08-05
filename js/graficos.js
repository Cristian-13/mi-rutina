/* Gráficos.
   Tres formas cubren todo lo que la app dibuja con datos: un anillo de
   progreso, una línea con área bajo ella y una fila de barras. Estaban
   repetidas en cuatro sitios con pequeñas diferencias entre copias; aquí
   están una vez, y la pantalla solo pone los números y los textos. */

import { html, crudo } from "./plantilla.js";

/* ── anillos ── */

export const vueltaAnillo = (radio) => 2 * Math.PI * radio;

/** Cuánto hay que desplazar el trazo para que se vea la fracción pedida. */
export function desfaseAnillo(radio, fraccion) {
  return (vueltaAnillo(radio) * (1 - Math.max(0, Math.min(1, fraccion)))).toFixed(1);
}

export function anillo({ lado, radio, grosor, fraccion, color = "var(--accent)",
                         pista = "var(--surface-2)", id, dentro }) {
  const c = lado / 2;
  return html`<svg viewBox="0 0 ${lado} ${lado}" aria-hidden="true">
    <circle cx="${c}" cy="${c}" r="${radio}" fill="none" stroke="${pista}" stroke-width="${grosor}"></circle>
    <circle ${id ? crudo('id="' + id + '"') : ""} cx="${c}" cy="${c}" r="${radio}" fill="none"
            stroke="${color}" stroke-width="${grosor}" stroke-linecap="round"
            transform="rotate(-90 ${c} ${c})"
            stroke-dasharray="${vueltaAnillo(radio).toFixed(1)}"
            stroke-dashoffset="${desfaseAnillo(radio, fraccion)}"></circle>
    ${dentro || ""}</svg>`;
}

/* ── línea con área ──────────────────────────────────────────────────────
   El lienzo va de 0 a 100 en los dos ejes y se estira con la caja, así que
   los trazos llevan vector-effect para no engordar al deformarse. */

const ARRIBA = 14, ABAJO = 92;

/** Dónde cae cada valor en vertical. `desdeCero` ancla el suelo en el cero
    —lo que quieres para una carga— y si no, encuadra entre el mínimo y el
    máximo, que es lo que deja ver el movimiento de un peso corporal. */
function escala(valores, desdeCero) {
  const max = Math.max(...valores, desdeCero ? 1 : -Infinity);
  const min = desdeCero ? 0 : Math.min(...valores);
  const span = (max - min) || 1;
  return { max, min, y: (v) => ABAJO - ((v - min) / span) * (ABAJO - ARRIBA) };
}

const guias = () => html`
  <line x1="0" y1="${ARRIBA}" x2="100" y2="${ARRIBA}" stroke="var(--hair)" stroke-width="0.4" stroke-dasharray="1.5 1.5"></line>
  <line x1="0" y1="${ABAJO}" x2="100" y2="${ABAJO}" stroke="var(--hair)" stroke-width="0.4" stroke-dasharray="1.5 1.5"></line>`;

export function grafLinea({ valores, gradiente, aria, desdeCero = false }) {
  const e = escala(valores, desdeCero);
  const x = (i) => (i / (valores.length - 1)) * 100;
  const pts = valores.map((v, i) => x(i).toFixed(2) + "," + e.y(v).toFixed(2));
  const area = "0," + e.y(valores[0]).toFixed(2) + " " + pts.join(" ") + " 100,100 0,100";

  return html`<svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="${aria}">
    <defs><linearGradient id="${gradiente}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="var(--accent)" stop-opacity=".22"></stop>
      <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"></stop></linearGradient></defs>
    ${guias()}
    <polygon points="${area}" fill="url(#${gradiente})"></polygon>
    <polyline points="${pts.join(" ")}" fill="none" stroke="var(--accent)" stroke-width="2"
              vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"></polyline>
    <circle cx="100" cy="${e.y(valores[valores.length - 1]).toFixed(2)}" r="2" fill="var(--accent)"
            vector-effect="non-scaling-stroke"></circle></svg>`;
}

/* ── barras ── */

export function grafBarras({ valores, aria }) {
  const n = valores.length;
  const max = Math.max(...valores, 1);
  const alto = 100, paso = 100 / n;
  const ancho = Math.max(3, Math.min(9, paso - 2));

  const barras = valores.map((v, i) => {
    const h = Math.max(1.5, (v / max) * (alto - 12));
    const x = paso * i + (paso - ancho) / 2;
    return html`<rect class="mk" data-i="${i}" x="${x.toFixed(2)}" y="${(alto - h).toFixed(2)}"
      width="${ancho.toFixed(2)}" height="${h.toFixed(2)}" rx="1.6"
      fill="${i === n - 1 ? "var(--accent)" : "var(--hair-strong)"}"></rect>`;
  });

  return html`<svg viewBox="0 0 100 106" preserveAspectRatio="none" role="img" aria-label="${aria}">
    <line x1="0" y1="12" x2="100" y2="12" stroke="var(--hair)" stroke-width="0.4" stroke-dasharray="1.5 1.5"></line>
    <line x1="0" y1="100.4" x2="100" y2="100.4" stroke="var(--hair-strong)" stroke-width="0.8"></line>
    ${barras}</svg>`;
}

/* ── el pie con las tres referencias ── */

export function pieGrafico(izquierda, centro, derecha) {
  return html`<div class="cap"><span>${izquierda}</span><span>${centro}</span><span>${derecha}</span></div>`;
}

/* ── la etiqueta que sigue al dedo ────────────────────────────────────────
   `modo` decide cómo se traduce la posición del dedo a un dato: "puntos" para
   una línea, donde se busca el vértice más cercano, y "bandas" para unas
   barras, donde cada una ocupa su franja. */

export function conPista(host, { n, texto, modo = "puntos", arriba = 0 }) {
  const svg = host.querySelector("svg");
  if (!svg || n < 1) return;
  const tip = document.createElement("div");
  tip.className = "tip";
  host.appendChild(tip);

  const PADDING = 16;   // el mismo que .chart lleva a los lados

  svg.addEventListener("pointermove", ev => {
    const r = svg.getBoundingClientRect();
    const u = (ev.clientX - r.left) / r.width;
    const i = modo === "bandas"
      ? Math.max(0, Math.min(n - 1, Math.floor(u * n)))
      : Math.max(0, Math.min(n - 1, Math.round(u * (n - 1))));
    const fraccion = modo === "bandas" ? (i + 0.5) / n : (n > 1 ? i / (n - 1) : 0.5);
    tip.textContent = texto(i);
    tip.style.left = (PADDING + fraccion * r.width) + "px";
    tip.style.top = arriba + "px";
    tip.classList.add("on");
    svg.querySelectorAll(".mk").forEach(m => m.setAttribute("opacity", Number(m.dataset.i) === i ? "1" : ".55"));
  });
  svg.addEventListener("pointerleave", () => {
    tip.classList.remove("on");
    svg.querySelectorAll(".mk").forEach(m => m.setAttribute("opacity", "1"));
  });
}
