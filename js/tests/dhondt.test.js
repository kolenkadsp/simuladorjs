// js/tests/dhondt.test.js
import { runDhondt } from '../dhondt.js';

QUnit.module('D\'Hondt', () => {

  // Caso básico: 2 listas, 3 cupos
  // Lista A: 100 votos, Lista B: 60 votos
  // Cocientes A: 100, 50, 33.3  B: 60, 30, 20
  // Top 3: 100(A), 60(B), 50(A) → A=2, B=1
  QUnit.test('distribución básica sin empate', assert => {
    const candidatos = [
      { id: 1, nombre: 'A1', pacto: 'A', votos: 60, sexo: 'H' },
      { id: 2, nombre: 'A2', pacto: 'A', votos: 40, sexo: 'M' },
      { id: 3, nombre: 'B1', pacto: 'B', votos: 60, sexo: 'H' },
    ];
    const resultado = runDhondt(candidatos, ['A', 'B'], 3);
    assert.equal(resultado.cuposPorPacto['A'], 2, 'Pacto A obtiene 2 cupos');
    assert.equal(resultado.cuposPorPacto['B'], 1, 'Pacto B obtiene 1 cupo');
    assert.equal(resultado.electos.length, 3, 'Se eligen 3 candidatos');
    // Los más votados dentro de cada pacto son elegidos
    assert.ok(resultado.electos.find(c => c.nombre === 'A1'), 'A1 (60v) es electo');
    assert.ok(resultado.electos.find(c => c.nombre === 'A2'), 'A2 (40v) es electo');
    assert.ok(resultado.electos.find(c => c.nombre === 'B1'), 'B1 (60v) es electo');
  });

  // Lista única (art. 74)
  QUnit.test('lista única — todos los cupos van al único pacto', assert => {
    const candidatos = [
      { id: 1, nombre: 'A1', pacto: 'A', votos: 80, sexo: 'H' },
      { id: 2, nombre: 'A2', pacto: 'A', votos: 50, sexo: 'M' },
    ];
    const resultado = runDhondt(candidatos, ['A'], 2);
    assert.equal(resultado.listaUnica, true, 'Marcado como lista única');
    assert.equal(resultado.cuposPorPacto['A'], 2, 'Todos los cupos van a A');
    assert.equal(resultado.electos.length, 2, 'Se eligen 2 candidatos');
  });

  // Cupos reales: RM con 7 cupos
  QUnit.test('RM: 7 cupos, 3 pactos proporcionales', assert => {
    const candidatos = [
      // Tercerismo: 420 votos total
      { id: 1, pacto: 'T', votos: 200, sexo: 'H', nombre: 'T1' },
      { id: 2, pacto: 'T', votos: 120, sexo: 'M', nombre: 'T2' },
      { id: 3, pacto: 'T', votos: 100, sexo: 'H', nombre: 'T3' },
      // Renova: 280 votos total
      { id: 4, pacto: 'R', votos: 150, sexo: 'M', nombre: 'R1' },
      { id: 5, pacto: 'R', votos: 130, sexo: 'H', nombre: 'R2' },
      // NI: 140 votos total
      { id: 6, pacto: 'N', votos: 90,  sexo: 'M', nombre: 'N1' },
      { id: 7, pacto: 'N', votos: 50,  sexo: 'H', nombre: 'N2' },
    ];
    const resultado = runDhondt(candidatos, ['T', 'R', 'N'], 7);
    assert.equal(resultado.cuposPorPacto['T'] + resultado.cuposPorPacto['R'] + resultado.cuposPorPacto['N'], 7, 'Total cupos = 7');
  });

  // Cifra repartidora — verificar que los cocientes se calculan bien
  QUnit.test('cifra repartidora y cocientes expuestos en resultado', assert => {
    const candidatos = [
      { id: 1, pacto: 'A', votos: 100, sexo: 'H', nombre: 'A1' },
      { id: 2, pacto: 'B', votos: 60,  sexo: 'M', nombre: 'B1' },
    ];
    const resultado = runDhondt(candidatos, ['A', 'B'], 3);
    assert.ok(resultado.cifraRepartidora > 0, 'cifraRepartidora es positiva');
    assert.ok(resultado.cocientes, 'cocientes están presentes para la tabla');
    // A tiene cocientes [100, 50, 33.3...], B tiene [60, 30, 20]
    assert.equal(resultado.cocientes['A'].length, 3, 'A tiene N=3 cocientes');
    assert.equal(resultado.cocientes['B'].length, 3, 'B tiene N=3 cocientes');
  });
});
