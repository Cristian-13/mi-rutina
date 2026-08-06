/* Instalarla en el móvil.
   El navegador avisa cuando puede ofrecerlo, y solo entonces tiene sentido
   enseñar el botón. Si ya se está usando desde la pantalla de inicio, no hay
   nada que ofrecer. */

import { toast } from "./util.js";

let invitacion = null;
let alCambiar = () => {};

export const enApp = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;

export const sePuedeInstalar = () => !!invitacion && !enApp;

export function vigilarInstalacion(avisar) {
  if (avisar) alCambiar = avisar;
  window.addEventListener("beforeinstallprompt", ev => { ev.preventDefault(); invitacion = ev; alCambiar(); });
  window.addEventListener("appinstalled", () => {
    invitacion = null;
    toast("Instalada. Ábrela desde tu pantalla de inicio");
  });
}

export async function pedirInstalacion() {
  if (!invitacion) return;
  invitacion.prompt();
  try { await invitacion.userChoice; } catch (e) { /* la cancelación no es un fallo */ }
  invitacion = null;
  alCambiar();
}
