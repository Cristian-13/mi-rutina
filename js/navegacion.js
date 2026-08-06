/* Ir de una pantalla a otra.
   Las pantallas se apuntan aquí al arrancar en vez de estar enumeradas dentro
   de `ir`: así este módulo no conoce a ninguna, y no hay que tocarlo para
   añadir una. */

import { $ } from "./util.js";

const pintores = {};

export function registrarPantalla(nombre, pintar) { pintores[nombre] = pintar; }

export function ir(p) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("on"));
  $("s-" + p).classList.add("on");
  document.querySelectorAll(".tabbar button").forEach(b => b.setAttribute("aria-selected", String(b.dataset.go === p)));
  window.scrollTo(0, 0);
  if (pintores[p]) pintores[p]();
}

export function pantallaVisible(p) { return $("s-" + p).classList.contains("on"); }

export function cablearTabbar() {
  document.querySelectorAll(".tabbar button").forEach(b => b.addEventListener("click", () => ir(b.dataset.go)));
}
