// js/tests/parity.test.js
import { aplicarParidadCCN, aplicarParidadCCR } from '../parity.js';

QUnit.module('Paridad CCN', () => {

  QUnit.test('no corrige si ya cumple paridad', assert => {
    // 11 electos: 6H 5M → cumple mín 5 c/u
    const electos = [
      { id: 1, pacto: 'A', votos: 100, sexo: 'H', estado: 'electo' },
      { id: 2, pacto: 'A', votos: 90,  sexo: 'M', estado: 'electo' },
      { id: 3, pacto: 'A', votos: 80,  sexo: 'H', estado: 'electo' },
      { id: 4, pacto: 'A', votos: 70,  sexo: 'M', estado: 'electo' },
      { id: 5, pacto: 'A', votos: 60,  sexo: 'H', estado: 'electo' },
      { id: 6, pacto: 'B', votos: 55,  sexo: 'M', estado: 'electo' },
      { id: 7, pacto: 'B', votos: 50,  sexo: 'H', estado: 'electo' },
      { id: 8, pacto: 'B', votos: 45,  sexo: 'M', estado: 'electo' },
      { id: 9, pacto: 'B', votos: 40,  sexo: 'H', estado: 'electo' },
      { id:10, pacto: 'B', votos: 35,  sexo: 'M', estado: 'electo' },
      { id:11, pacto: 'B', votos: 30,  sexo: 'H', estado: 'electo' },
    ];
    const noElectos = [];
    const res = aplicarParidadCCN(electos, noElectos);
    assert.equal(res.corregido, false, 'No se corrigió');
    assert.equal(res.electos.filter(c => c.estado === 'paridad').length, 0, 'Ningún badge paridad');
  });

  QUnit.test('corrige cuando hay déficit de mujeres', assert => {
    // Pacto A: 6H 1M electos, 2M no electas
    // Pacto B: 2H 2M electos
    // Total: 8H 3M → faltan 2M
    const electos = [
      { id: 1,  pacto: 'A', votos: 100, sexo: 'H', estado: 'electo' },
      { id: 2,  pacto: 'A', votos: 90,  sexo: 'H', estado: 'electo' },
      { id: 3,  pacto: 'A', votos: 80,  sexo: 'H', estado: 'electo' },
      { id: 4,  pacto: 'A', votos: 70,  sexo: 'H', estado: 'electo' },
      { id: 5,  pacto: 'A', votos: 60,  sexo: 'H', estado: 'electo' },
      { id: 6,  pacto: 'A', votos: 50,  sexo: 'H', estado: 'electo' },
      { id: 7,  pacto: 'A', votos: 40,  sexo: 'M', estado: 'electo' },
      { id: 8,  pacto: 'B', votos: 35,  sexo: 'H', estado: 'electo' },
      { id: 9,  pacto: 'B', votos: 30,  sexo: 'H', estado: 'electo' },
      { id: 10, pacto: 'B', votos: 25,  sexo: 'M', estado: 'electo' },
      { id: 11, pacto: 'B', votos: 20,  sexo: 'M', estado: 'electo' },
    ];
    const noElectos = [
      { id: 12, pacto: 'A', votos: 38, sexo: 'M', estado: 'no_electo' },
      { id: 13, pacto: 'A', votos: 25, sexo: 'M', estado: 'no_electo' },
    ];
    const res = aplicarParidadCCN(electos, noElectos);
    assert.equal(res.corregido, true, 'Se corrigió');
    const mujeres = res.electos.filter(c => c.sexo === 'M').length;
    assert.ok(mujeres >= 5, `Al menos 5 mujeres (hay ${mujeres})`);
    const conParidad = res.electos.filter(c => c.estado === 'paridad').length;
    assert.ok(conParidad >= 1, 'Al menos 1 badge paridad asignado');
  });

  QUnit.test('reporta imposible cuando no hay reemplazos disponibles', assert => {
    const electos = Array.from({length: 11}, (_, i) => ({
      id: i+1, pacto: 'A', votos: 100-i*5, sexo: 'H', estado: 'electo'
    }));
    const noElectos = [];
    const res = aplicarParidadCCN(electos, noElectos);
    assert.equal(res.imposible, true, 'Paridad imposible');
  });
});

QUnit.module('Paridad CCR', () => {

  QUnit.test('región 2 cupos: corrige cuando hay solo hombres', assert => {
    const electos = [
      { id: 1, pacto: 'A', votos: 100, sexo: 'H', estado: 'electo' },
      { id: 2, pacto: 'A', votos: 80,  sexo: 'H', estado: 'electo' },
    ];
    const noElectos = [
      { id: 3, pacto: 'A', votos: 70, sexo: 'M', estado: 'no_electo' },
    ];
    const res = aplicarParidadCCR(electos, noElectos, 293, 2); // Valparaíso
    const mujeres = res.electos.filter(c => c.sexo === 'M').length;
    assert.equal(mujeres, 1, 'Hay 1 mujer electa tras corrección');
    assert.equal(res.corregido, true, 'Se marcó como corregido');
  });

  QUnit.test('RM 7 cupos: calcula mínimo correcto con ceil', assert => {
    const minEsperado = Math.ceil(7 * 0.4); // 3
    assert.equal(minEsperado, 3, 'Mínimo RM = 3');
    const electos = [
      { id:1,  pacto:'A', votos:200, sexo:'H', estado:'electo' },
      { id:2,  pacto:'A', votos:180, sexo:'H', estado:'electo' },
      { id:3,  pacto:'A', votos:160, sexo:'H', estado:'electo' },
      { id:4,  pacto:'A', votos:140, sexo:'M', estado:'electo' },
      { id:5,  pacto:'B', votos:120, sexo:'H', estado:'electo' },
      { id:6,  pacto:'B', votos:100, sexo:'M', estado:'electo' },
      { id:7,  pacto:'B', votos:80,  sexo:'H', estado:'electo' },
    ];
    const noElectos = [
      { id:8,  pacto:'A', votos:130, sexo:'M', estado:'no_electo' },
    ];
    const res = aplicarParidadCCR(electos, noElectos, 2212, 7);
    const mujeres = res.electos.filter(c => c.sexo === 'M').length;
    assert.ok(mujeres >= 3, `Al menos 3 mujeres (hay ${mujeres})`);
  });

  QUnit.test('coeficiente electoral = votos / padrón', assert => {
    const electos = [
      { id:1, pacto:'A', votos:10, sexo:'H', estado:'electo' },
      { id:2, pacto:'A', votos:5,  sexo:'H', estado:'electo' },
    ];
    const noElectos = [
      { id:3, pacto:'A', votos:8, sexo:'M', estado:'no_electo' },
    ];
    const padron = 29; // Aysén
    const res = aplicarParidadCCR(electos, noElectos, padron, 2);
    const entrante = res.electos.find(c => c.id === 3);
    assert.ok(entrante, 'Candidata M con mayor coef entra');
    assert.equal(entrante.estado, 'paridad', 'Badge paridad asignado');
    assert.ok(Math.abs(entrante.coeficiente - 8/29) < 1e-9, 'Coeficiente calculado correctamente');
  });
});
