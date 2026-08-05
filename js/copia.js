/* Copia de seguridad.
   Los datos viven en este navegador y en ninguna parte más, así que hay que
   poder sacarlos y volverlos a meter. Es lo que salva un cambio de móvil. */

import { $, toast, hoyISO } from "./util.js";
import { state, reemplazarEstado, guardar, migrar, VERSION_DATOS } from "./almacen.js";
import { ir } from "./navegacion.js";

function nombreArchivo() { return "mi-rutina-" + hoyISO() + ".json"; }

async function exportar() {
  const datos = JSON.stringify({
    app: "mirutina", version: VERSION_DATOS,
    versionApp: window.VERSION_APP || "", exportado: hoyISO(),
    perfil: state.perfil, historial: state.historial, peso: state.peso
  }, null, 2);
  const nombre = nombreArchivo();

  // Dentro del visor de Claude no hay descargas del navegador, pero sí un
  // guardado propio. Fuera de ahí, un enlace de toda la vida.
  if (window.claude && window.claude.downloads) {
    try { await window.claude.downloads.save({ filename: nombre, data: datos }); toast("Copia guardada"); }
    catch (err) { toast(err && err.code === "declined" ? "Exportación cancelada" : "No se pudo exportar"); }
    return;
  }
  try {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([datos], { type: "application/json" }));
    a.download = nombre; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast("Copia descargada");
  } catch (e) { toast("Este navegador no permite descargar aquí"); }
}

function importar(archivo) {
  const lector = new FileReader();
  lector.onload = () => {
    try {
      const d = JSON.parse(lector.result);
      if (!Array.isArray(d.historial)) throw new Error("formato");
      if (!confirm("Esto reemplaza tus datos actuales por los del archivo. ¿Continuar?")) return;
      const m = migrar(d);
      reemplazarEstado({ version: VERSION_DATOS, historial: m.historial, peso: m.peso, perfil: m.perfil || state.perfil });
      guardar(); ir("progreso");
      toast("Importado: " + state.historial.length + " sesiones");
    } catch (e) { toast("Ese archivo no es una copia válida"); }
  };
  lector.readAsText(archivo);
}

export function cablearCopia() {
  $("expBtn").addEventListener("click", exportar);
  $("impBtn").addEventListener("click", () => $("impFile").click());
  $("impFile").addEventListener("change", ev => {
    const f = ev.target.files && ev.target.files[0];
    if (f) importar(f);
    ev.target.value = "";
  });
  $("resetBtn").addEventListener("click", () => {
    if (!confirm("Se borran todas tus sesiones y pesadas. No se puede deshacer.")) return;
    reemplazarEstado({ historial: [], peso: [], perfil: state.perfil });
    guardar(); ir("progreso"); toast("Datos borrados");
  });
}
