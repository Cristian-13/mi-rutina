/* El catálogo: los ejercicios, el circuito, las variantes y las adaptaciones.
   Son datos, no código, así que viven en `datos/*.json` y se leen al arrancar.
   Cambiar una nota, un objetivo o una postura ya no obliga a tocar la lógica.

   Las coordenadas de las posturas están en el sistema del motor de figuras,
   donde el suelo está en y=176 y el lienzo mide 320 × 200. */

import { postura } from "./postura.js";

export let EJ = null;
export let CIRCUITO = null;
export let VARIANTES = null;
export let ADAPTA = null;
export let CALENTAMIENTO = null;
export let VUELTA = null;
export let ACCESOS = null;

const CARPETA = new URL("../datos/", import.meta.url);

async function leer(nombre) {
  const res = await fetch(new URL(nombre, CARPETA));
  if (!res.ok) throw new Error("No se pudo leer datos/" + nombre + " · " + res.status);
  return res.json();
}

/** Un ejercicio con `igualQue` es el mismo movimiento con otro nombre o con
    carga a la espalda: hereda todo lo del original y encima pone lo suyo. */
function resolverEjercicios(crudos) {
  const out = {};
  Object.keys(crudos).forEach(id => {
    const propio = crudos[id];
    const base = propio.igualQue ? crudos[propio.igualQue] : null;
    const ej = Object.assign({}, base, propio);
    delete ej.igualQue;
    ej.poses = ej.poses.map(postura);
    out[id] = ej;
  });
  return out;
}

export async function cargarCatalogo() {
  const [ejercicios, circuito, variantes, adaptaciones] = await Promise.all([
    leer("ejercicios.json"), leer("circuito.json"),
    leer("variantes.json"), leer("adaptaciones.json")
  ]);
  EJ = resolverEjercicios(ejercicios);
  CIRCUITO = circuito.postas;
  CALENTAMIENTO = circuito.calentamiento;
  VUELTA = circuito.vuelta;
  VARIANTES = variantes.variantes;
  ACCESOS = variantes.accesos;
  ADAPTA = adaptaciones;
}

/** La variante activa, o el básico si el perfil trae una que ya no existe. */
export function varianteDe(clave) { return VARIANTES[clave] || VARIANTES.base; }

/** Nombre legible de una posta, para que nada hable en clave por ahí fuera. */
export function nombreDePosta(id) {
  const b = CIRCUITO.find(x => x.id === id);
  return b ? (b.alias || EJ[b.ej].nombre) : id;
}
