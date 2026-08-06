/* Lo pequeño que usa todo el mundo: buscar un elemento, dar formato a una
   fecha y avisar de algo sin interrumpir. */

export const $ = (id) => document.getElementById(id);

export const hoyISO = () => new Date().toISOString().slice(0, 10);
export const fechaCorta = (iso) => iso.slice(8, 10) + "/" + iso.slice(5, 7);

/** El lunes de la semana en la que cae esa fecha. La semana es la unidad con
    la que se mide la constancia, así que todo se agrupa por su lunes. */
export function lunesDe(fecha) {
  const d = new Date(fecha + "T12:00:00");
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

export function toast(msg) {
  const el = $("toast");
  el.textContent = msg; el.classList.add("on");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("on"), 2600);
}
