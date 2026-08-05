/* Análisis de entrenamiento.
   Todo lo que sale de aquí se calcula con las sesiones que hay guardadas: no
   hay valores de referencia inventados, ni comparaciones con nadie, ni medias
   de población. Si un dato no da para concluir, no se concluye. */

export const MINIMO_SESIONES = 3;   // por debajo de esto no hay nada que decir
export const SIN_RECORD = 3;        // sesiones seguidas sin mejorar = estancado

const num = (r) => (r && r.hecho && r.valor ? Number(r.valor) || 0 : 0);
const media = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const pct = (de, a) => (de ? Math.round((a - de) / de * 100) : 0);

/** Serie de marcas de una posta, en orden, solo con lo que se registró. */
export function serie(historial, id) {
  const out = [];
  historial.forEach(s => {
    const v = num((s.postas || {})[id]);
    if (v) out.push({ fecha: s.fecha, valor: v });
  });
  return out;
}

/** Cuántas de las sesiones tenían esa posta completada. */
function constancia(historial, id) {
  let hubo = 0, hecha = 0;
  historial.forEach(s => {
    const r = (s.postas || {})[id];
    if (!r) return;
    hubo++;
    if (r.hecho) hecha++;
  });
  return { hubo, hecha, ratio: hubo ? hecha / hubo : 0 };
}

/** Sesiones seguidas, contando desde la última, sin superar la mejor marca. */
function sesionesSinMejorar(s) {
  if (s.length < 2) return 0;
  let mejor = 0, ultimaMejora = -1;
  s.forEach((p, i) => { if (p.valor > mejor) { mejor = p.valor; ultimaMejora = i; } });
  return s.length - 1 - ultimaMejora;
}

/** Ficha de cada posta: de dónde salió, dónde está y si se ha atascado. */
export function porEjercicio(historial, circuito) {
  return circuito.map(b => {
    const s = serie(historial, b.id);
    const c = constancia(historial, b.id);
    const primera = s.length ? s[0].valor : 0;
    const ultima = s.length ? s[s.length - 1].valor : 0;
    const mejor = s.length ? Math.max(...s.map(x => x.valor)) : 0;
    const parado = sesionesSinMejorar(s);
    let estado = "sin datos";
    if (s.length >= 2) {
      if (parado >= SIN_RECORD) estado = "estancado";
      else if (ultima > primera) estado = "subiendo";
      else if (ultima < primera) estado = "bajando";
      else estado = "estable";
    } else if (s.length === 1) estado = "una sola marca";
    return {
      id: b.id, sesiones: s.length, primera, ultima, mejor,
      progreso: pct(primera, mejor), parado, estado,
      constancia: c.ratio, registrable: !b.sinRegistro
    };
  });
}

/* ── Los hallazgos. Cada uno se emite solo si los datos lo sostienen. ── */

export function hallazgos(historial, circuito, perfil, nombreDe) {
  const H = [];
  const n = historial.length;
  const nom = nombreDe || ((id) => id);

  if (n < MINIMO_SESIONES) {
    H.push({ tipo: "espera", prioridad: 3,
      titulo: "Todavía no hay suficiente para analizar",
      texto: "Con " + n + (n === 1 ? " sesión" : " sesiones") + " no se puede distinguir una mejora real de un buen día. " +
             "A partir de la tercera empiezo a sacar conclusiones de verdad." });
    return H;
  }

  const fichas = porEjercicio(historial, circuito).filter(f => f.registrable && f.sesiones >= 2);

  // ── constancia: lo que más determina el resultado ──
  const hoy = new Date(historial[historial.length - 1].fecha);
  const hace28 = new Date(hoy); hace28.setDate(hace28.getDate() - 27);
  const recientes = historial.filter(s => new Date(s.fecha) >= hace28).length;
  const esperadas = (perfil.dias || 3) * 4;
  const cumpl = Math.round(recientes / esperadas * 100);
  if (n >= 4) {
    if (cumpl >= 85) {
      H.push({ tipo: "bien", prioridad: 2, titulo: "Tu constancia es el punto fuerte",
        texto: recientes + " sesiones en las últimas 4 semanas, de las " + esperadas + " previstas. " +
               "Es lo que más determina el resultado, y lo estás cumpliendo." });
    } else if (cumpl < 60) {
      H.push({ tipo: "aviso", prioridad: 1, titulo: "Estás entrenando menos de lo que planeaste",
        texto: recientes + " sesiones en las últimas 4 semanas, de " + esperadas + " previstas (" + cumpl + "%). " +
               "Antes de tocar la rutina, arregla esto: subir repeticiones no compensa faltar." });
    }
  }

  // ── dos días seguidos: el vídeo pide uno completo de descanso ──
  let seguidos = 0;
  for (let i = 1; i < historial.length; i++) {
    const d = (new Date(historial[i].fecha) - new Date(historial[i - 1].fecha)) / 86400000;
    if (d === 1) seguidos++;
  }
  if (seguidos >= 2) {
    H.push({ tipo: "aviso", prioridad: 2, titulo: "Estás encadenando días sin descanso",
      texto: "En " + seguidos + " ocasiones has entrenado dos días seguidos. El circuito pide un día " +
             "completo entre sesiones: el músculo se construye en el descanso, no en la repetición extra." });
  }

  // ── tendencia de la carga ──
  if (n >= 6) {
    const cargas = historial.map(s => cargaDe(s, circuito));
    const ult = media(cargas.slice(-3)), prev = media(cargas.slice(-6, -3));
    const dif = pct(prev, ult);
    if (dif >= 8) {
      H.push({ tipo: "bien", prioridad: 2, titulo: "La carga va subiendo",
        texto: "Tus últimas 3 sesiones promedian un " + dif + "% más de trabajo que las 3 anteriores. " +
               "Vas en la dirección correcta." });
    } else if (dif <= -8) {
      H.push({ tipo: "aviso", prioridad: 1, titulo: "La carga está bajando",
        texto: "Tus últimas 3 sesiones promedian un " + Math.abs(dif) + "% menos que las 3 anteriores. " +
               "Puede ser cansancio acumulado, falta de sueño o que estés dejando postas a medias. " +
               "Si te sientes bien, revisa si te estás saltando algo." });
    }
  }

  // ── postas atascadas ──
  const atascadas = fichas.filter(f => f.estado === "estancado").sort((a, b) => b.parado - a.parado);
  if (atascadas.length) {
    H.push({ tipo: "accion", prioridad: 1,
      titulo: atascadas.length === 1 ? "Un ejercicio se te ha atascado" : atascadas.length + " ejercicios se te han atascado",
      texto: atascadas.slice(0, 3).map(f => nom(f.id) + " (" + f.parado + " sesiones sin mejorar, tope en " + f.mejor + ")").join(" · ") +
             ". Ahí no vas a avanzar repitiendo lo mismo: sube a la versión difícil de la ficha, o cambia de variante." });
  }

  // ── lo que mejor y peor va ──
  const conProgreso = fichas.filter(f => f.sesiones >= 3).sort((a, b) => b.progreso - a.progreso);
  if (conProgreso.length >= 3) {
    const top = conProgreso[0], last = conProgreso[conProgreso.length - 1];
    if (top.progreso >= 15) {
      H.push({ tipo: "bien", prioridad: 3, titulo: "Donde más has crecido",
        texto: nom(top.id) + ": de " + top.primera + " a " + top.mejor + ", un " + top.progreso + "% más que el primer día." });
    }
    if (last.progreso <= 5 && top.progreso - last.progreso >= 25) {
      H.push({ tipo: "accion", prioridad: 2, titulo: "Un ejercicio se está quedando atrás",
        texto: nom(last.id) + " ha subido un " + last.progreso + "% mientras " + nom(top.id) + " subía un " +
               top.progreso + "%. Suele pasar cuando llega al final del circuito y ya no queda energía: " +
               "prueba a hacerlo un día en primer lugar y compara." });
    }
  }

  // ── postas que se saltan ──
  const saltadas = porEjercicio(historial, circuito)
    .filter(f => f.registrable && f.constancia < 0.6 && historial.length >= 4)
    .sort((a, b) => a.constancia - b.constancia);
  if (saltadas.length) {
    const f = saltadas[0];
    H.push({ tipo: "accion", prioridad: 2, titulo: "Hay una posta que sueles dejar fuera",
      texto: nom(f.id) + " solo la completas en el " + Math.round(f.constancia * 100) + "% de las sesiones. " +
             "Si es porque te puede, bájale el objetivo hasta que sea asumible: media posta hecha vale más que una entera saltada." });
  }

  // ── cómo lo estás sintiendo ──
  const sens = historial.slice(-3).map(s => s.sensacion || 3);
  if (historial.length >= 3) {
    const m = media(sens);
    if (m >= 4.4) {
      H.push({ tipo: "accion", prioridad: 1, titulo: "Lo estás pasando demasiado mal",
        texto: "En las últimas 3 sesiones has marcado que fue duro o demasiado duro. Baja los objetivos un escalón " +
               "durante una semana. Machacarse no acelera nada: es la vía más rápida a dejarlo." });
    } else if (m <= 1.8) {
      H.push({ tipo: "accion", prioridad: 2, titulo: "Se te está quedando corto",
        texto: "Llevas 3 sesiones marcando que fue fácil. Sube a la versión difícil de los dos o tres ejercicios " +
               "que mejor domines, o pasa a la siguiente variante." });
    }
  }

  return H.sort((a, b) => a.prioridad - b.prioridad);
}

/** Carga de una sesión: repeticiones y pasos tal cual, más un tercio de los
    segundos, para que las postas isométricas no se coman el número. */
export function cargaDe(s, circuito) {
  let t = 0;
  circuito.forEach(b => {
    const v = num((s.postas || {})[b.id]);
    if (!v) return;
    t += b.tipo === "tiempo" ? v / 3 : v;
  });
  return Math.round(t);
}

/* Puente transitorio: mientras el resto de la app siga en un solo archivo,
   se expone aquí. Desaparece cuando todo esté modularizado. */
if (typeof window !== "undefined") {
  window.Analisis = { hallazgos, porEjercicio, serie, cargaDe, MINIMO_SESIONES };
}

if (typeof window !== "undefined") {
  window.dispatchEvent(new Event("analisis-listo"));
}
