/* Plantillas de HTML.
   `html` compone marcado escapando por defecto todo lo que se interpola, así
   que quien escribe una pantalla ya no tiene que acordarse de llamar a esc()
   en cada hueco —que es justo donde se cuela el fallo—. Lo que ya viene siendo
   HTML se marca con `crudo`, y una plantilla anidada lo está de por sí. */

const MAPA = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };

export function esc(s) { return String(s).replace(/[&<>"]/g, c => MAPA[c]); }

class Marcado {
  constructor(html) { this.html = html; }
  toString() { return this.html; }
}

/** Marca un texto como HTML ya listo, para que no se vuelva a escapar. */
export function crudo(texto) { return new Marcado(String(texto)); }

/* null, undefined y false no pintan nada: así `condicion && html`...`` sirve
   como trozo opcional sin tener que escribir un ternario con cadena vacía.
   El precio es que un booleano que sí quieras ver escrito —aria-pressed, sin ir
   más lejos— hay que pasarlo por String().
   Una lista se pega sin separador, que es lo que hacían todos los .join(""). */
function pinta(v) {
  if (v === null || v === undefined || v === false) return "";
  if (v instanceof Marcado) return v.html;
  if (Array.isArray(v)) return v.map(pinta).join("");
  return esc(v);
}

export function html(partes, ...valores) {
  let out = partes[0];
  for (let i = 0; i < valores.length; i++) out += pinta(valores[i]) + partes[i + 1];
  return new Marcado(out);
}

/** Vuelca una plantilla dentro de un elemento y lo devuelve. */
export function pintarEn(el, contenido) {
  el.innerHTML = pinta(contenido);
  return el;
}
