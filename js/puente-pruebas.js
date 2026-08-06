/* La superficie global.
   Cuando la app entera vivía en un solo archivo, todo esto eran variables
   sueltas del guion y se podía tocar desde la consola —y desde las pruebas de
   punta a punta, que es lo que las hace posibles—. Al partirla en módulos esa
   superficie desaparecía, así que se vuelve a poner aquí, en un sitio, a la
   vista y de solo lectura.

   Nada del código de la app pasa por aquí: si se borrara este archivo, la app
   seguiría funcionando igual y solo se quedarían ciegas las pruebas. */

import { state, guardar, perfil } from "./almacen.js";
import * as catalogo from "./catalogo.js";
import { circuito, posta } from "./circuito.js";
import { ir } from "./navegacion.js";
import * as guiado from "./pantallas/guiado.js";
import * as Analisis from "./analisis.js";

export function instalarPuente() {
  /* Con captador, no por copia: `state` y `gui` se sustituyen enteros al
     importar datos o al abrir el modo guiado, y una copia se quedaría vieja. */
  const asomar = (nombre, leer) => Object.defineProperty(window, nombre, { get: leer, configurable: true });

  asomar("state", () => state);
  asomar("gui", () => guiado.gui);
  asomar("EJ", () => catalogo.EJ);
  asomar("CIRCUITO", () => catalogo.CIRCUITO);
  asomar("VARIANTES", () => catalogo.VARIANTES);
  asomar("ADAPTA", () => catalogo.ADAPTA);
  asomar("ACCESOS", () => catalogo.ACCESOS);
  asomar("CALENTAMIENTO", () => catalogo.CALENTAMIENTO);
  asomar("VUELTA", () => catalogo.VUELTA);

  Object.assign(window, {
    guardar, perfil, circuito, posta, ir,
    postaActual: guiado.postaActual,
    arrancarGui: guiado.arrancarGui,
    Analisis
  });
}
