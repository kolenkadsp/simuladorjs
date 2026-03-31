// js/dhondt.js

/**
 * Ejecuta el algoritmo D'Hondt.
 *
 * @param {Array} candidatos - [{id, nombre, pacto, votos, sexo}]
 * @param {string[]} pactos  - lista de nombres de pactos
 * @param {number} N         - cupos a elegir
 * @returns {Object} resultado con: electos, noElectos, cuposPorPacto,
 *                   cifraRepartidora, cocientes, advertencias, listaUnica
 */
export function runDhondt(candidatos, pactos, N) {
  const advertencias = [];

  // 1. Votos totales por pacto
  const votosPorPacto = {};
  for (const p of pactos) votosPorPacto[p] = 0;
  for (const c of candidatos) {
    if (votosPorPacto[c.pacto] !== undefined) votosPorPacto[c.pacto] += c.votos;
  }

  // Guard: si todos los votos son 0, retornar resultado vacío
  const totalVotos = Object.values(votosPorPacto).reduce((a, b) => a + b, 0);
  if (totalVotos === 0) {
    return { electos: [], noElectos: candidatos.map(c => ({...c, estado:'no_electo'})),
             cuposPorPacto: Object.fromEntries(pactos.map(p => [p, 0])),
             cifraRepartidora: 0, cocientes: {}, advertencias: [{ tipo: 'votos_cero' }], listaUnica: false };
  }

  // 2. Lista única (art. 74)
  const listaUnica = pactos.length === 1;

  // 3. Generar cocientes para la tabla
  const cocientes = {};
  for (const p of pactos) {
    cocientes[p] = [];
    for (let k = 1; k <= N; k++) {
      cocientes[p].push(votosPorPacto[p] / k);
    }
  }

  // 4. Cifra repartidora y cupos
  let cuposPorPacto;
  let cifraRepartidora;

  if (listaUnica) {
    cuposPorPacto = {};
    cuposPorPacto[pactos[0]] = N;
    cifraRepartidora = null;
  } else {
    // Reunir todos los cocientes, ordenar desc, tomar posición N
    const todosLosCocientes = pactos.flatMap(p => cocientes[p]);
    todosLosCocientes.sort((a, b) => b - a);
    cifraRepartidora = todosLosCocientes[N - 1];

    // Cupos iniciales
    cuposPorPacto = {};
    for (const p of pactos) {
      cuposPorPacto[p] = Math.floor(votosPorPacto[p] / cifraRepartidora);
    }

    // Reconciliación si suma < N (empates en el límite)
    let sumaActual = Object.values(cuposPorPacto).reduce((a, b) => a + b, 0);
    while (sumaActual < N) {
      // Candidatos al cupo extra: pactos cuyo siguiente cociente = cifraRepartidora
      const candidatosCupoExtra = pactos.filter(p =>
        Math.abs(votosPorPacto[p] / (cuposPorPacto[p] + 1) - cifraRepartidora) < 1e-9
      );
      if (candidatosCupoExtra.length === 0) break; // no debería pasar

      // Ordenar por votos totales desc
      candidatosCupoExtra.sort((a, b) => votosPorPacto[b] - votosPorPacto[a]);

      // Verificar empate perfecto de votos totales entre los candidatos
      if (candidatosCupoExtra.length > 1 &&
          votosPorPacto[candidatosCupoExtra[0]] === votosPorPacto[candidatosCupoExtra[1]]) {
        // Sorteo: elegir aleatoriamente
        const idx = Math.floor(Math.random() * candidatosCupoExtra.length);
        const ganador = candidatosCupoExtra[idx];
        cuposPorPacto[ganador]++;
        advertencias.push({ tipo: 'sorteo_dhondt', cupo: sumaActual + 1, pactoGanador: ganador });
      } else {
        cuposPorPacto[candidatosCupoExtra[0]]++;
      }
      sumaActual++;
    }
  }

  // 5. Dentro de cada pacto, elegir los más votados
  const electos = [];
  const noElectos = [];

  for (const p of pactos) {
    const del_pacto = candidatos
      .filter(c => c.pacto === p)
      .sort((a, b) => b.votos - a.votos);
    const nCupos = cuposPorPacto[p] ?? 0;

    for (let i = 0; i < del_pacto.length; i++) {
      const c = { ...del_pacto[i], coeficiente: null, estado: null, sorteo: false };
      if (i < nCupos) {
        // Verificar empate en votos individuales en el límite
        if (i === nCupos - 1 && del_pacto[i + 1] &&
            del_pacto[i].votos === del_pacto[i + 1].votos) {
          advertencias.push({ tipo: 'sorteo_individual', pacto: p, votos: del_pacto[i].votos });
          c.sorteo = true;
          c.estado = 'sorteo';
        } else {
          c.estado = 'electo';
        }
        electos.push(c);
      } else {
        c.estado = 'no_electo';
        noElectos.push(c);
      }
    }
  }

  return {
    electos,
    noElectos,
    cuposPorPacto,
    cifraRepartidora: cifraRepartidora ?? null,
    cocientes,
    advertencias,
    listaUnica,
  };
}
