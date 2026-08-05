/* ARRANQUE.
   Los datos se leen de disco antes de pintar nada, así que el arranque es
   asíncrono: primero el catálogo, luego el cableado de las pantallas y solo
   entonces la primera pintada. */

import { $ } from "./util.js";
import { state } from "./almacen.js";
import { cargarCatalogo } from "./catalogo.js";
import { registrarPantalla, cablearTabbar } from "./navegacion.js";
import { arrancarFiguras } from "./figuras.js";
import { vigilarInstalacion } from "./instalacion.js";
import { cablearCopia } from "./copia.js";
import { pintarHoy } from "./pantallas/hoy.js";
import { pintarRutinas } from "./pantallas/rutinas.js";
import { pintarProgreso, cablearProgreso } from "./pantallas/progreso.js";
import { pintarGuia } from "./pantallas/guia.js";
import { cablearSesion } from "./pantallas/sesion.js";
import { cablearGuiado } from "./pantallas/guiado.js";
import { abrirOnboarding, cablearOnboarding } from "./pantallas/onboarding.js";
import { instalarPuente } from "./puente-pruebas.js";

/* El service worker solo tiene sentido servido por https; en local la app
   funciona igual, solo que sin quedarse guardada para usarla sin conexión. */
function registrarServicio() {
  if (!("serviceWorker" in navigator) || location.protocol !== "https:") return;
  const registrar = () => navigator.serviceWorker.register("sw.js")
    .catch(() => { /* sin conexión o sin permiso: la app funciona igual */ });
  if (document.readyState === "complete") registrar();
  else window.addEventListener("load", registrar);
}

async function arrancar() {
  await cargarCatalogo();

  registrarPantalla("hoy", pintarHoy);
  registrarPantalla("rutinas", pintarRutinas);
  registrarPantalla("progreso", pintarProgreso);
  registrarPantalla("guia", pintarGuia);

  cablearTabbar();
  cablearSesion();
  cablearGuiado();
  cablearProgreso();
  cablearOnboarding();
  cablearCopia();
  vigilarInstalacion(pintarHoy);

  instalarPuente();
  arrancarFiguras();
  registrarServicio();

  if (!state.perfil) abrirOnboarding();
  pintarHoy();
}

arrancar().catch(err => {
  console.error(err);
  $("hoyView").innerHTML = '<div class="alerta"><b>No he podido cargar la rutina</b>' +
    "<p>Faltan los datos del circuito o no se han podido leer. Recarga la página; si sigue igual, " +
    "vuelve a instalar la app desde su dirección.</p></div>";
});
