/* Dónde viven los datos.
   Todo se guarda bajo una clave estable. Lo que cambia entre versiones no es
   la clave, sino el número de versión que llevan dentro: así una actualización
   nunca deja el historial huérfano en una clave vieja que nadie vuelve a leer. */

import { toast } from "./util.js";

export const CLAVE = "mirutina";
export const VERSION_DATOS = 4;
const CLAVES_ANTERIORES = ["mirutina.v3", "mirutina.v2", "mirutina.v1"];

export const PERFIL_POR_DEFECTO = { nombre: "", nivel: "cero", dias: 3, molestias: [], acceso: [], variante: "base" };

/* Datos guardados por una versión más nueva de la app. Puede pasar si el móvil
   abre una copia cacheada vieja: en ese caso NO se escribe, para no destruir
   lo que ya hay. */
let soloLectura = false;

function leerCrudo(clave) {
  try { const r = localStorage.getItem(clave); return r ? JSON.parse(r) : null; }
  catch (e) { return null; }
}

/** Convierte lo guardado a la forma que entiende esta versión. */
export function migrar(d) {
  if (!d) return null;
  const version = d.version || 3;   // lo anterior a que existieran versiones era la 3
  const out = {
    version: VERSION_DATOS,
    perfil: d.perfil ? Object.assign({}, PERFIL_POR_DEFECTO, d.perfil) : null,
    historial: Array.isArray(d.historial) ? d.historial : [],
    peso: Array.isArray(d.peso) ? d.peso : []
  };
  // Las sesiones del plan A/B anterior guardaban series por ejercicio, no postas
  // de un circuito. No hay forma honesta de convertirlas, así que no se cuelan
  // en las estadísticas; el peso corporal y el perfil sí se conservan.
  out.historial = out.historial.filter(s => s && s.postas && typeof s.postas === "object");
  if (version < 3) out.descartadas = (Array.isArray(d.historial) ? d.historial.length : 0);
  return out;
}

function cargar() {
  let crudo = leerCrudo(CLAVE);
  if (!crudo) {
    for (const vieja of CLAVES_ANTERIORES) {
      const previo = leerCrudo(vieja);
      if (previo) { crudo = previo; break; }
    }
  }
  if (crudo && (crudo.version || 0) > VERSION_DATOS) {
    soloLectura = true;
    console.warn("Datos de una versión más nueva: no se escribirá nada.");
  }
  return migrar(crudo) || { version: VERSION_DATOS, historial: [], peso: [], perfil: null };
}

/** ¿Este navegador guarda de verdad? Dentro de un marco aislado —como el visor
    de artifacts— el almacenamiento se deniega o se borra al cerrar, y conviene
    decirlo en vez de perder el historial en silencio. */
export const ALMACEN = (function () {
  try {
    localStorage.setItem("__prueba__", "1");
    const ok = localStorage.getItem("__prueba__") === "1";
    localStorage.removeItem("__prueba__");
    return ok;
  } catch (e) { return false; }
})();

export let state = cargar();

/** Sustituye el estado entero: al importar una copia y al borrarlo todo. */
export function reemplazarEstado(nuevo) { state = nuevo; }

export function guardar() {
  if (soloLectura) {
    toast("Hay datos de una versión más nueva: recarga la app antes de entrenar");
    return;
  }
  try {
    state.version = VERSION_DATOS;
    localStorage.setItem(CLAVE, JSON.stringify(state));
  } catch (e) { toast("Este navegador no deja guardar datos"); }
}

/** El perfil, o uno vacío mientras no lo haya. Las listas se crean nuevas para
    que nadie acabe escribiendo sobre las del perfil por defecto. */
export function perfil() {
  return state.perfil || Object.assign({}, PERFIL_POR_DEFECTO, { molestias: [], acceso: [] });
}
