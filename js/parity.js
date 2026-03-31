// js/parity.js

/**
 * Corrección de paridad para CCN (art. 76–77a).
 * Mínimo: Math.ceil(11 * 0.4) = 5 de cada género.
 *
 * @param {Array} electos    - candidatos electos
 * @param {Array} noElectos  - candidatos no electos (pool de reemplazos)
 * @returns {{ electos, noElectos, corregido, imposible, advertencias }}
 */
export function aplicarParidadCCN(electos, noElectos) {
  const N = electos.length; // debería ser 11
  const minGenero = Math.ceil(N * 0.4);

  let electosActuales = electos.map(c => ({ ...c }));
  let noElectosActuales = noElectos.map(c => ({ ...c }));
  const advertencias = [];
  let corregido = false;

  const contarGenero = (arr, sexo) => arr.filter(c => c.sexo === sexo).length;

  for (let iter = 0; iter < N * 2; iter++) {
    const nH = contarGenero(electosActuales, 'H');
    const nM = contarGenero(electosActuales, 'M');

    if (nH >= minGenero && nM >= minGenero) break;

    const generoSub = nH < nM ? 'H' : 'M';
    const generoSobre = generoSub === 'H' ? 'M' : 'H';

    // Calcular déficit por lista (recalcular tras cada reemplazo)
    const pactos = [...new Set(electosActuales.map(c => c.pacto))];
    const deficits = pactos.map(p => {
      const delPacto = electosActuales.filter(c => c.pacto === p);
      const nSub = delPacto.filter(c => c.sexo === generoSub).length;
      const nTot = delPacto.length;
      const minDelPacto = Math.ceil(nTot * 0.4);
      return { pacto: p, deficit: Math.max(0, minDelPacto - nSub) };
    });
    deficits.sort((a, b) => b.deficit - a.deficit);

    let reemplazado = false;
    for (const { pacto } of deficits) {
      const candidatosSalientes = electosActuales
        .filter(c => c.pacto === pacto && c.sexo === generoSobre)
        .sort((a, b) => a.votos - b.votos);

      const candidatosEntrantes = noElectosActuales
        .filter(c => c.pacto === pacto && c.sexo === generoSub)
        .sort((a, b) => b.votos - a.votos);

      if (candidatosSalientes.length > 0 && candidatosEntrantes.length > 0) {
        const saliente = candidatosSalientes[0];
        const entrante = candidatosEntrantes[0];

        electosActuales = electosActuales.filter(c => c.id !== saliente.id);
        noElectosActuales = noElectosActuales.filter(c => c.id !== entrante.id);
        electosActuales.push({ ...entrante, estado: 'paridad' });
        noElectosActuales.push({ ...saliente, estado: 'no_electo' });

        corregido = true;
        reemplazado = true;
        break;
      }
    }

    if (!reemplazado) {
      return { electos: electosActuales, noElectos: noElectosActuales, corregido, imposible: true, advertencias };
    }
  }

  return { electos: electosActuales, noElectos: noElectosActuales, corregido, imposible: false, advertencias };
}

/**
 * Corrección de paridad para CCR (art. 77b).
 * Usa coeficiente electoral = votos_candidato / padron_region.
 * Mínimo: Math.ceil(cupos * 0.4) de cada género.
 *
 * @param {Array} electos    - candidatos electos
 * @param {Array} noElectos  - candidatos no electos
 * @param {number} padron    - padrón de la región (afiliados + adherentes)
 * @param {number} cupos     - cupos de la región
 * @returns {{ electos, noElectos, corregido, imposible }}
 */
export function aplicarParidadCCR(electos, noElectos, padron, cupos) {
  const minGenero = Math.ceil(cupos * 0.4);

  const conCoef = arr => arr.map(c => ({ ...c, coeficiente: c.votos / padron }));

  let electosActuales = conCoef(electos);
  let noElectosActuales = conCoef(noElectos);
  let corregido = false;

  const contarGenero = (arr, sexo) => arr.filter(c => c.sexo === sexo).length;

  for (let iter = 0; iter < cupos * 2; iter++) {
    const nH = contarGenero(electosActuales, 'H');
    const nM = contarGenero(electosActuales, 'M');

    if (nH >= minGenero && nM >= minGenero) break;

    const generoSub = nH < nM ? 'H' : 'M';
    const generoSobre = generoSub === 'H' ? 'M' : 'H';

    const salientes = electosActuales
      .filter(c => c.sexo === generoSobre)
      .sort((a, b) => a.coeficiente - b.coeficiente);

    if (salientes.length === 0) break;
    const saliente = salientes[0];

    const entrantes = noElectosActuales
      .filter(c => c.pacto === saliente.pacto && c.sexo === generoSub)
      .sort((a, b) => b.coeficiente - a.coeficiente);

    if (entrantes.length > 0) {
      const entrante = entrantes[0];
      electosActuales = electosActuales.filter(c => c.id !== saliente.id);
      noElectosActuales = noElectosActuales.filter(c => c.id !== entrante.id);
      electosActuales.push({ ...entrante, estado: 'paridad' });
      noElectosActuales.push({ ...saliente, estado: 'no_electo' });
      corregido = true;
    } else {
      // Buscar en otras listas con sobrerepresentación del mismo género
      const otrasPactos = [...new Set(
        electosActuales.filter(c => c.sexo === generoSobre && c.pacto !== saliente.pacto).map(c => c.pacto)
      )];
      let encontrado = false;
      for (const p of otrasPactos) {
        const e = noElectosActuales
          .filter(c => c.pacto === p && c.sexo === generoSub)
          .sort((a, b) => b.coeficiente - a.coeficiente);
        const sal = electosActuales
          .filter(c => c.pacto === p && c.sexo === generoSobre)
          .sort((a, b) => a.coeficiente - b.coeficiente);
        if (e.length > 0 && sal.length > 0) {
          electosActuales = electosActuales.filter(c => c.id !== sal[0].id);
          noElectosActuales = noElectosActuales.filter(c => c.id !== e[0].id);
          electosActuales.push({ ...e[0], estado: 'paridad' });
          noElectosActuales.push({ ...sal[0], estado: 'no_electo' });
          corregido = true;
          encontrado = true;
          break;
        }
      }
      if (!encontrado) {
        return { electos: electosActuales, noElectos: noElectosActuales, corregido, imposible: true };
      }
    }
  }

  return { electos: electosActuales, noElectos: noElectosActuales, corregido, imposible: false };
}
