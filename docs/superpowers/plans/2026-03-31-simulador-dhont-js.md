# Simulador D'Hondt JS 2026 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir una interfaz web estática que simule las elecciones del Comité Central Nacional (11 cupos) y Regional (30 cupos en 16 regiones) de la Juventud Socialista de Chile 2026, aplicando D'Hondt con corrección de paridad de salida.

**Architecture:** Tres módulos JS puros (`data.js`, `dhondt.js`, `parity.js`) con lógica testeable de forma aislada, más un módulo de UI (`ui.js`) que los consume. Sin framework, sin build step, sin dependencias npm. Tests corren en el browser via QUnit CDN (`tests.html`).

**Tech Stack:** HTML5, CSS3 (Tailwind via CDN), JavaScript ES6+ (módulos), QUnit (tests, via CDN)

**Spec de referencia:** `docs/superpowers/specs/2026-03-31-simulador-dhont-js-design.md`

---

## File Map

```
index.html          — estructura de pestañas, formularios, sección de resultados
style.css           — estilos complementarios a Tailwind
tests.html          — runner de tests QUnit (solo abrir en browser)
js/
  data.js           — constantes hardcodeadas (regiones, cupos, padrón) + estado en memoria
  dhondt.js         — algoritmo D'Hondt puro (sin DOM)
  parity.js         — corrección de paridad CCN y CCR (sin DOM)
  ui.js             — render y manejo de eventos (usa data/dhondt/parity)
  app.js            — inicialización y wiring
```

---

## Task 1: Scaffold del proyecto

**Files:**
- Create: `index.html`
- Create: `style.css`
- Create: `js/app.js`

- [ ] **Step 1: Crear `index.html` con estructura base**

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Simulador Elecciones JS 2026</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="style.css">
</head>
<body class="bg-gray-50 text-gray-900 min-h-screen">

  <!-- Header -->
  <header class="bg-red-700 text-white p-4 shadow">
    <h1 class="text-2xl font-bold">Simulador Elecciones JS 2026</h1>
    <p class="text-sm opacity-80">Juventud Socialista de Chile</p>
  </header>

  <!-- Tabs -->
  <div class="max-w-6xl mx-auto mt-6 px-4">
    <div class="flex border-b border-gray-300 mb-6">
      <button id="tab-ccn" class="tab-btn px-6 py-3 font-semibold border-b-2 border-red-600 text-red-700">
        Comité Central Nacional <span class="text-xs font-normal">(11 cupos)</span>
      </button>
      <button id="tab-ccr" class="tab-btn px-6 py-3 font-semibold text-gray-500 hover:text-gray-700">
        Comité Central Regional <span class="text-xs font-normal">(30 cupos)</span>
      </button>
    </div>

    <!-- CCN Panel -->
    <div id="panel-ccn">
      <!-- Bloque 1: Pactos -->
      <section id="ccn-pactos" class="mb-6 bg-white rounded-lg shadow p-4">
        <h2 class="font-bold text-lg mb-3">Pactos / Listas</h2>
        <div id="ccn-pactos-list" class="flex flex-wrap gap-2 mb-3"></div>
        <div class="flex gap-2">
          <input id="ccn-new-pacto" type="text" placeholder="Nombre del pacto"
            class="border rounded px-3 py-1 text-sm flex-1">
          <button id="ccn-add-pacto" class="bg-red-600 text-white px-4 py-1 rounded text-sm hover:bg-red-700">
            + Agregar Pacto
          </button>
        </div>
      </section>

      <!-- Bloque 2: Candidatos -->
      <section id="ccn-candidatos" class="mb-6 bg-white rounded-lg shadow p-4">
        <h2 class="font-bold text-lg mb-3">Candidatos</h2>
        <div class="grid grid-cols-5 gap-2 mb-2 text-xs font-semibold text-gray-500 uppercase">
          <span class="col-span-2">Nombre</span><span>Pacto</span><span>Votos</span><span>Sexo</span>
        </div>
        <div id="ccn-candidatos-list" class="space-y-1 mb-3"></div>
        <!-- Formulario agregar -->
        <div class="grid grid-cols-5 gap-2 items-center">
          <input id="ccn-nombre" type="text" placeholder="Nombre"
            class="col-span-2 border rounded px-2 py-1 text-sm">
          <select id="ccn-pacto-sel" class="border rounded px-2 py-1 text-sm">
            <option value="">-- Pacto --</option>
          </select>
          <input id="ccn-votos" type="number" min="0" placeholder="Votos"
            class="border rounded px-2 py-1 text-sm">
          <select id="ccn-sexo" class="border rounded px-2 py-1 text-sm">
            <option value="">Sexo</option>
            <option value="H">Hombre</option>
            <option value="M">Mujer</option>
          </select>
        </div>
        <button id="ccn-add-candidato"
          class="mt-2 bg-gray-700 text-white px-4 py-1 rounded text-sm hover:bg-gray-800">
          + Agregar Candidato
        </button>
      </section>

      <!-- Bloque 3: Resultados CCN -->
      <section id="ccn-resultados" class="mb-6">
        <button id="ccn-calcular"
          class="bg-red-700 text-white px-6 py-2 rounded font-semibold hover:bg-red-800 mb-4">
          Calcular
        </button>
        <div id="ccn-resultado-output" class="hidden"></div>
      </section>
    </div>

    <!-- CCR Panel (hidden by default) -->
    <div id="panel-ccr" class="hidden">
      <!-- Selector de región -->
      <div class="mb-4">
        <label class="font-semibold mr-2">Región:</label>
        <select id="ccr-region-sel" class="border rounded px-3 py-2 text-sm">
        </select>
        <span id="ccr-cupos-badge" class="ml-2 text-sm text-gray-500"></span>
      </div>

      <!-- Bloque 1: Pactos CCR -->
      <section id="ccr-pactos" class="mb-6 bg-white rounded-lg shadow p-4">
        <h2 class="font-bold text-lg mb-3">Pactos / Listas</h2>
        <div id="ccr-pactos-list" class="flex flex-wrap gap-2 mb-3"></div>
        <div class="flex gap-2">
          <input id="ccr-new-pacto" type="text" placeholder="Nombre del pacto"
            class="border rounded px-3 py-1 text-sm flex-1">
          <button id="ccr-add-pacto" class="bg-red-600 text-white px-4 py-1 rounded text-sm hover:bg-red-700">
            + Agregar Pacto
          </button>
        </div>
      </section>

      <!-- Bloque 2: Candidatos CCR -->
      <section id="ccr-candidatos" class="mb-6 bg-white rounded-lg shadow p-4">
        <h2 class="font-bold text-lg mb-3">Candidatos</h2>
        <div class="grid grid-cols-5 gap-2 mb-2 text-xs font-semibold text-gray-500 uppercase">
          <span class="col-span-2">Nombre</span><span>Pacto</span><span>Votos</span><span>Sexo</span>
        </div>
        <div id="ccr-candidatos-list" class="space-y-1 mb-3"></div>
        <div class="grid grid-cols-5 gap-2 items-center">
          <input id="ccr-nombre" type="text" placeholder="Nombre"
            class="col-span-2 border rounded px-2 py-1 text-sm">
          <select id="ccr-pacto-sel" class="border rounded px-2 py-1 text-sm">
            <option value="">-- Pacto --</option>
          </select>
          <input id="ccr-votos" type="number" min="0" placeholder="Votos"
            class="border rounded px-2 py-1 text-sm">
          <select id="ccr-sexo" class="border rounded px-2 py-1 text-sm">
            <option value="">Sexo</option>
            <option value="H">Hombre</option>
            <option value="M">Mujer</option>
          </select>
        </div>
        <button id="ccr-add-candidato"
          class="mt-2 bg-gray-700 text-white px-4 py-1 rounded text-sm hover:bg-gray-800">
          + Agregar Candidato
        </button>
      </section>

      <!-- Bloque 3: Resultados CCR -->
      <section id="ccr-resultados" class="mb-6">
        <div class="flex gap-3 mb-4">
          <button id="ccr-calcular"
            class="bg-red-700 text-white px-6 py-2 rounded font-semibold hover:bg-red-800">
            Calcular esta región
          </button>
          <button id="ccr-calcular-todas"
            class="bg-gray-600 text-white px-6 py-2 rounded font-semibold hover:bg-gray-700">
            Ver resumen nacional CCR
          </button>
        </div>
        <div id="ccr-resultado-output" class="hidden"></div>
      </section>
    </div>

  </div>

  <script type="module" src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Crear `style.css` con estilos complementarios**

```css
/* Badge estados */
.badge-electo   { background: #d1fae5; color: #065f46; padding: 2px 8px; border-radius: 999px; font-size: 0.75rem; font-weight: 600; }
.badge-paridad  { background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 999px; font-size: 0.75rem; font-weight: 600; }
.badge-sorteo   { background: #e0e7ff; color: #3730a3; padding: 2px 8px; border-radius: 999px; font-size: 0.75rem; font-weight: 600; }

/* Tabla D'Hondt — celda ganadora */
.dhondt-winner { background: #fee2e2; font-weight: bold; }

/* Tab activo */
.tab-active { border-bottom: 2px solid #b91c1c; color: #b91c1c; font-weight: 700; }

/* Banner de aviso */
.banner-warn { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 6px; padding: 8px 12px; font-size: 0.875rem; color: #92400e; margin-bottom: 12px; }
.banner-ok   { background: #f0fdf4; border: 1px solid #86efac; border-radius: 6px; padding: 8px 12px; font-size: 0.875rem; color: #166534; margin-bottom: 12px; }
.banner-err  { background: #fef2f2; border: 1px solid #fca5a5; border-radius: 6px; padding: 8px 12px; font-size: 0.875rem; color: #991b1b; margin-bottom: 12px; }
```

- [ ] **Step 3: Crear `js/app.js` vacío (placeholder hasta Task 8)**

```javascript
// Entry point — wiring se agrega en Task 8
console.log('Simulador JS 2026 cargando...');
```

- [ ] **Step 4: Abrir `index.html` en el browser y verificar que carga sin errores de consola**

Abrir con doble clic o `file://` en el navegador. Verificar:
- Header rojo visible
- Dos pestañas visibles
- Formularios de CCN visibles
- Sin errores en consola

- [ ] **Step 5: Commit**

```bash
git add index.html style.css js/app.js
git commit -m "feat: scaffold HTML+CSS del simulador"
```

---

## Task 2: Módulo de datos y estado (`data.js`)

**Files:**
- Create: `js/data.js`

- [ ] **Step 1: Crear `js/data.js` con las constantes del Cuadro I y el estado de la sesión**

```javascript
// js/data.js

// Cuadro I — art. 34 del Reglamento
// padrón = afiliados + adherentes (art. 27)
export const REGIONES = [
  { id: 'arica',       nombre: 'De Arica',                           cupos: 1, padron: 138  },
  { id: 'tarapaca',    nombre: 'De Tarapacá',                        cupos: 1, padron: 144  },
  { id: 'antofagasta', nombre: 'De Antofagasta',                     cupos: 2, padron: 233  },
  { id: 'atacama',     nombre: 'De Atacama',                         cupos: 2, padron: 313  },
  { id: 'coquimbo',    nombre: 'De Coquimbo',                        cupos: 1, padron: 128  },
  { id: 'valparaiso',  nombre: 'De Valparaíso',                      cupos: 2, padron: 293  },
  { id: 'rm',          nombre: 'Metropolitana de Santiago',           cupos: 7, padron: 2212 },
  { id: 'ohiggins',    nombre: "Del Libertador B. O'Higgins",        cupos: 2, padron: 163  },
  { id: 'maule',       nombre: 'Del Maule',                          cupos: 2, padron: 179  },
  { id: 'nuble',       nombre: 'De Ñuble',                           cupos: 1, padron: 154  },
  { id: 'biobio',      nombre: 'Del BioBío',                         cupos: 2, padron: 266  },
  { id: 'araucania',   nombre: 'De La Araucanía',                    cupos: 2, padron: 196  },
  { id: 'losrios',     nombre: 'De Los Ríos',                        cupos: 1, padron: 118  },
  { id: 'loslagos',    nombre: 'De Los Lagos',                       cupos: 2, padron: 278  },
  { id: 'aysen',       nombre: 'De Aysén',                           cupos: 1, padron: 29   },
  { id: 'magallanes',  nombre: 'De Magallanes',                      cupos: 1, padron: 62   },
];

export const CCN_CUPOS = 11;

// Estado en memoria de la sesión
// Cada context tiene: { pactos: string[], candidatos: Candidato[] }
// Candidato: { id, nombre, pacto, votos, sexo }

function emptyContext() {
  return { pactos: [], candidatos: [] };
}

export const state = {
  ccn: emptyContext(),
  ccr: Object.fromEntries(REGIONES.map(r => [r.id, emptyContext()])),
  ccrRegionActiva: REGIONES[0].id,
};

// Helpers
export function getContext(tipo, regionId = null) {
  if (tipo === 'ccn') return state.ccn;
  return state.ccr[regionId ?? state.ccrRegionActiva];
}

let nextId = 1;
export function newId() { return nextId++; }
```

- [ ] **Step 2: Verificar que el módulo se importa correctamente**

Agregar temporalmente al final de `js/app.js`:
```javascript
import { REGIONES, CCN_CUPOS, state } from './data.js';
console.log('Regiones:', REGIONES.length);   // esperado: 16
console.log('CCN cupos:', CCN_CUPOS);         // esperado: 11
console.log('CCR regiones en state:', Object.keys(state.ccr).length); // esperado: 16
```
Abrir en browser, revisar consola. Luego eliminar el log.

- [ ] **Step 3: Commit**

```bash
git add js/data.js js/app.js
git commit -m "feat: módulo de datos y estado (Cuadro I + state)"
```

---

## Task 3: Algoritmo D'Hondt (`dhondt.js`)

**Files:**
- Create: `js/dhondt.js`
- Create: `tests.html`

- [ ] **Step 1: Crear `tests.html` con QUnit**

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Tests — Simulador JS 2026</title>
  <link rel="stylesheet" href="https://code.jquery.com/qunit/qunit-2.20.0.css">
</head>
<body>
  <div id="qunit"></div>
  <div id="qunit-fixture"></div>
  <script src="https://code.jquery.com/qunit/qunit-2.20.0.js"></script>
  <script type="module" src="js/tests/dhondt.test.js"></script>
  <script type="module" src="js/tests/parity.test.js"></script>
</body>
</html>
```

- [ ] **Step 2: Crear `js/tests/dhondt.test.js` con casos de prueba**

```javascript
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
    // Total: 840 votos, 7 cupos → cifra repartidora ~120
    // T: floor(420/120)=3, R: floor(280/120)=2, N: floor(140/120)=1 → suma=6 < 7
    // El cupo extra va al de mayor resto: N tiene 140/120=1.16 (resto 0.16), T tiene 420/120=3.5 (resto 0.5)
    // → T debería tener 4 cupos
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
```

- [ ] **Step 3: Abrir `tests.html` en browser — verificar que los tests FALLAN (función no existe aún)**

Se debe ver en QUnit: 4 tests fallados con "runDhondt is not defined" o similar.

- [ ] **Step 4: Crear `js/dhondt.js` con implementación**

```javascript
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

  if (listaUnica) {
    cuposPorPacto = {};
    cuposPorPacto[pactos[0]] = N;
  } else {
    // Reunir todos los cocientes, ordenar desc, tomar posición N
    const todosLosCocientes = pactos.flatMap(p => cocientes[p]);
    todosLosCocientes.sort((a, b) => b - a);
    let cifraRepartidora = todosLosCocientes[N - 1];

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

    // cifraRepartidora ya está declarada con let, accesible en el return
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
```

- [ ] **Step 5: Abrir `tests.html` en browser — verificar que los tests PASAN**

Esperado: 4 tests verdes. Si alguno falla, revisar la lógica del test o la implementación.

- [ ] **Step 6: Commit**

```bash
git add js/dhondt.js tests.html js/tests/dhondt.test.js
git commit -m "feat: algoritmo D'Hondt con tests"
```

---

## Task 4: Corrección de paridad CCN (`parity.js`)

**Files:**
- Create: `js/parity.js`
- Create: `js/tests/parity.test.js`

- [ ] **Step 1: Crear `js/tests/parity.test.js` con tests de paridad CCN**

```javascript
// js/tests/parity.test.js
import { aplicarParidadCCN, aplicarParidadCCR } from '../parity.js';

QUnit.module('Paridad CCN', () => {

  // Caso sin necesidad de corrección (ya cumple paridad)
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

  // Caso que requiere corrección: 8H 3M → faltan 2 mujeres
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
    const electosFinales = res.electos;
    const mujeres = electosFinales.filter(c => c.sexo === 'M').length;
    assert.ok(mujeres >= 5, `Al menos 5 mujeres (hay ${mujeres})`);
    const conParidad = electosFinales.filter(c => c.estado === 'paridad').length;
    assert.ok(conParidad >= 1, 'Al menos 1 badge paridad asignado');
  });

  // Caso imposible: no hay candidatas mujeres no electas
  QUnit.test('reporta imposible cuando no hay reemplazos disponibles', assert => {
    const electos = Array.from({length: 11}, (_, i) => ({
      id: i+1, pacto: 'A', votos: 100-i*5, sexo: 'H', estado: 'electo'
    }));
    const noElectos = []; // no hay mujeres no electas
    const res = aplicarParidadCCN(electos, noElectos);
    assert.equal(res.imposible, true, 'Paridad imposible');
  });
});
```

- [ ] **Step 2: Verificar que los tests FALLAN (función no existe)**

- [ ] **Step 3: Crear `js/parity.js` con `aplicarParidadCCN`**

```javascript
// js/parity.js

/**
 * Corrección de paridad para CCN (art. 76–77a).
 * Mínimo: Math.ceil(11 * 0.4) = 5 de cada género.
 *
 * @param {Array} electos    - candidatos electos (mutados con .estado y .pacto)
 * @param {Array} noElectos  - candidatos no electos (pool de reemplazos)
 * @returns {{ electos, noElectos, corregido, imposible, advertencias }}
 */
export function aplicarParidadCCN(electos, noElectos) {
  const N = electos.length; // debería ser 11
  const minGenero = Math.ceil(N * 0.4);

  // Clonar para no mutar los originales
  let electosActuales = electos.map(c => ({ ...c }));
  let noElectosActuales = noElectos.map(c => ({ ...c }));
  const advertencias = [];
  let corregido = false;

  const contarGenero = (arr, sexo) => arr.filter(c => c.sexo === sexo).length;

  for (let iter = 0; iter < N * 2; iter++) {
    const nH = contarGenero(electosActuales, 'H');
    const nM = contarGenero(electosActuales, 'M');

    if (nH >= minGenero && nM >= minGenero) break; // paridad cumplida

    const generoSub = nH < nM ? 'H' : 'M';
    const generoSobre = generoSub === 'H' ? 'M' : 'H';

    // Calcular déficit por lista
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
      // Electo del género sobre-representado con menor votación en esta lista
      const candidatosSalientes = electosActuales
        .filter(c => c.pacto === pacto && c.sexo === generoSobre)
        .sort((a, b) => a.votos - b.votos);

      // No electo del género sub-representado con mayor votación en esta lista
      const candidatosEntrantes = noElectosActuales
        .filter(c => c.pacto === pacto && c.sexo === generoSub)
        .sort((a, b) => b.votos - a.votos);

      if (candidatosSalientes.length > 0 && candidatosEntrantes.length > 0) {
        const saliente = candidatosSalientes[0];
        const entrante = candidatosEntrantes[0];

        // Ejecutar reemplazo
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

  // Calcular coeficientes
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

    // Electo del género sobre-representado con MENOR coeficiente
    const salientes = electosActuales
      .filter(c => c.sexo === generoSobre)
      .sort((a, b) => a.coeficiente - b.coeficiente);

    if (salientes.length === 0) break;
    const saliente = salientes[0];

    // No electo del género sub-representado con MAYOR coeficiente en la MISMA lista
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
```

- [ ] **Step 4: Abrir `tests.html` — verificar que los tests de paridad CCN PASAN**

- [ ] **Step 5: Commit**

```bash
git add js/parity.js js/tests/parity.test.js
git commit -m "feat: corrección de paridad CCN y CCR con tests"
```

---

## Task 5: Tests de paridad CCR

**Files:**
- Modify: `js/tests/parity.test.js`

- [ ] **Step 1: Agregar tests de `aplicarParidadCCR` al archivo de tests**

Agregar al final de `js/tests/parity.test.js`:

```javascript
QUnit.module('Paridad CCR', () => {

  // Región con 2 cupos → mín 1 de cada género (ceil(2*0.4)=1)
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

  // RM: 7 cupos → mín 3 de cada género (ceil(7*0.4)=3)
  QUnit.test('RM 7 cupos: calcula mínimo correcto con ceil', assert => {
    const minEsperado = Math.ceil(7 * 0.4); // 3
    assert.equal(minEsperado, 3, 'Mínimo RM = 3');
    // 7 electos con 2M y 5H → debe corregir hasta 3M
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

  // El coeficiente usa el padrón correcto
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
    // Electo con menor coef: id=2, votos=5, coef=5/29≈0.172
    // Entrante: id=3, votos=8, coef=8/29≈0.276
    // → id=3 entra con badge paridad
    const entrante = res.electos.find(c => c.id === 3);
    assert.ok(entrante, 'Candidata M con mayor coef entra');
    assert.equal(entrante.estado, 'paridad', 'Badge paridad asignado');
    assert.ok(Math.abs(entrante.coeficiente - 8/29) < 1e-9, 'Coeficiente calculado correctamente');
  });
});
```

- [ ] **Step 2: Abrir `tests.html` — verificar que todos los tests (CCN + CCR) PASAN**

- [ ] **Step 3: Commit**

```bash
git add js/tests/parity.test.js
git commit -m "test: tests de paridad CCR"
```

---

## Task 6: UI del módulo CCN (`ui.js` + wiring en `app.js`)

**Files:**
- Create: `js/ui.js`
- Modify: `js/app.js`

- [ ] **Step 1: Crear `js/ui.js` con las funciones de render y eventos para CCN**

```javascript
// js/ui.js
import { state, getContext, newId } from './data.js';
import { runDhondt } from './dhondt.js';
import { aplicarParidadCCN } from './parity.js';

// ── Helpers generales ────────────────────────────────────────────────────────

export function renderBanner(texto, tipo = 'warn') {
  const div = document.createElement('div');
  div.className = `banner-${tipo}`;
  div.textContent = texto;
  return div;
}

function estadoBadge(estado) {
  const mapa = {
    electo:   '<span class="badge-electo">✓ Electo</span>',
    paridad:  '<span class="badge-paridad">★ Paridad</span>',
    sorteo:   '<span class="badge-sorteo">🎲 Sorteo</span>',
  };
  return mapa[estado] ?? '';
}

// ── CCN: Gestión de Pactos ───────────────────────────────────────────────────

export function renderCCNPactos() {
  const ctx = getContext('ccn');
  const lista = document.getElementById('ccn-pactos-list');
  const sel   = document.getElementById('ccn-pacto-sel');

  lista.innerHTML = ctx.pactos.map(p => `
    <span class="inline-flex items-center gap-1 bg-gray-100 border rounded px-2 py-1 text-sm">
      ${p}
      <button class="text-red-500 hover:text-red-700 font-bold"
        onclick="window._removeCCNPacto('${p}')"
        ${ctx.candidatos.some(c => c.pacto === p) ? 'disabled title="Tiene candidatos"' : ''}>×</button>
    </span>
  `).join('');

  sel.innerHTML = '<option value="">-- Pacto --</option>' +
    ctx.pactos.map(p => `<option value="${p}">${p}</option>`).join('');
}

export function addCCNPacto(nombre) {
  const ctx = getContext('ccn');
  if (!nombre.trim() || ctx.pactos.includes(nombre.trim())) return false;
  ctx.pactos.push(nombre.trim());
  renderCCNPactos();
  return true;
}

export function removeCCNPacto(nombre) {
  const ctx = getContext('ccn');
  if (ctx.candidatos.some(c => c.pacto === nombre)) return; // tiene candidatos
  ctx.pactos = ctx.pactos.filter(p => p !== nombre);
  renderCCNPactos();
}

// ── CCN: Gestión de Candidatos ───────────────────────────────────────────────

export function renderCCNCandidatos() {
  const ctx = getContext('ccn');
  const lista = document.getElementById('ccn-candidatos-list');
  if (ctx.candidatos.length === 0) {
    lista.innerHTML = '<p class="text-sm text-gray-400">Sin candidatos aún.</p>';
    return;
  }
  lista.innerHTML = ctx.candidatos.map(c => `
    <div class="grid grid-cols-5 gap-2 text-sm items-center border-b py-1">
      <span class="col-span-2">${c.nombre}</span>
      <span>${c.pacto}</span>
      <span>${c.votos}</span>
      <span class="flex items-center gap-1">
        ${c.sexo === 'H' ? 'Hombre' : 'Mujer'}
        <button class="ml-2 text-red-400 hover:text-red-600"
          onclick="window._removeCCNCandidato(${c.id})">×</button>
      </span>
    </div>
  `).join('');
}

export function addCCNCandidato({ nombre, pacto, votos, sexo }) {
  if (!nombre.trim() || !pacto || votos === '' || !sexo) return false;
  const ctx = getContext('ccn');
  ctx.candidatos.push({ id: newId(), nombre: nombre.trim(), pacto, votos: parseInt(votos), sexo });
  renderCCNCandidatos();
  // Resetear resultado si había uno calculado
  document.getElementById('ccn-resultado-output').classList.add('hidden');
  return true;
}

export function removeCCNCandidato(id) {
  const ctx = getContext('ccn');
  ctx.candidatos = ctx.candidatos.filter(c => c.id !== id);
  renderCCNCandidatos();
}

// ── CCN: Cálculo y Render de Resultados ─────────────────────────────────────

export function calcularCCN() {
  const ctx = getContext('ccn');
  const output = document.getElementById('ccn-resultado-output');
  output.innerHTML = '';
  output.classList.remove('hidden');

  if (ctx.pactos.length === 0 || ctx.candidatos.length === 0) {
    output.appendChild(renderBanner('Ingresa al menos un pacto y un candidato antes de calcular.', 'err'));
    return;
  }

  import('./data.js').then(({ CCN_CUPOS }) => {
    const dhondt = runDhondt(ctx.candidatos, ctx.pactos, CCN_CUPOS);

    if (dhondt.listaUnica) {
      output.appendChild(renderBanner('Lista única — se aplica conteo directo (art. 74)', 'warn'));
    }

    // Advertencias de sorteo
    dhondt.advertencias.forEach(adv => {
      if (adv.tipo === 'sorteo_dhondt') {
        output.appendChild(renderBanner(
          `⚠ Empate en cifra repartidora — se requiere sorteo para el cupo N°${adv.cupo}. Simulación asignó a: ${adv.pactoGanador}`, 'warn'
        ));
      }
      if (adv.tipo === 'sorteo_individual') {
        output.appendChild(renderBanner(
          `⚠ Empate en votos individuales en pacto ${adv.pacto} (${adv.votos} votos) — se requiere sorteo`, 'warn'
        ));
      }
    });

    // Tabla D'Hondt
    if (!dhondt.listaUnica) {
      output.appendChild(renderDhondtTable(dhondt, ctx.pactos, CCN_CUPOS));
    }

    // Corrección de paridad
    const paridad = aplicarParidadCCN(dhondt.electos, dhondt.noElectos);

    if (paridad.imposible) {
      output.appendChild(renderBanner('⚠ No es posible alcanzar la paridad con los candidatos ingresados.', 'err'));
    } else if (paridad.corregido) {
      output.appendChild(renderBanner('Se aplicó corrección de paridad (art. 76–77a)', 'warn'));
    }

    // Tabla de electos
    output.appendChild(renderElectos(paridad.electos, false));

    // Indicador de paridad
    output.appendChild(renderIndicadorParidad(paridad.electos, CCN_CUPOS));
  });
}

// ── Render compartido ────────────────────────────────────────────────────────

export function renderDhondtTable(dhondt, pactos, N) {
  const { cocientes, cuposPorPacto, cifraRepartidora } = dhondt;
  const ganadores = new Set(); // "pacto-k" de celdas ganadoras

  // Marcar celdas ganadoras
  const todos = pactos.flatMap(p =>
    cocientes[p].map((v, i) => ({ p, k: i + 1, v }))
  ).sort((a, b) => b.v - a.v).slice(0, N);
  todos.forEach(({ p, k }) => ganadores.add(`${p}-${k}`));

  const wrap = document.createElement('div');
  wrap.className = 'overflow-x-auto mb-4';
  wrap.innerHTML = `
    <h3 class="font-semibold mb-2">Tabla D'Hondt</h3>
    <table class="text-sm border-collapse w-full">
      <thead>
        <tr class="bg-gray-100">
          <th class="border px-2 py-1 text-left">Pacto</th>
          <th class="border px-2 py-1">Total votos</th>
          ${Array.from({length: N}, (_, i) => `<th class="border px-2 py-1">÷${i+1}</th>`).join('')}
          <th class="border px-2 py-1">Cupos</th>
        </tr>
      </thead>
      <tbody>
        ${pactos.map(p => `
          <tr>
            <td class="border px-2 py-1 font-medium">${p}</td>
            <td class="border px-2 py-1 text-center">${cocientes[p][0] * 1}</td>
            ${cocientes[p].map((v, i) => `
              <td class="border px-2 py-1 text-center ${ganadores.has(`${p}-${i+1}`) ? 'dhondt-winner' : ''}">
                ${v.toFixed(1)}
              </td>
            `).join('')}
            <td class="border px-2 py-1 text-center font-bold">${cuposPorPacto[p] ?? 0}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    <p class="text-xs text-gray-400 mt-1">Cifra repartidora: ${cifraRepartidora?.toFixed(2) ?? '—'}</p>
  `;
  return wrap;
}

export function renderElectos(electos, mostrarCoef = false) {
  const wrap = document.createElement('div');
  wrap.className = 'mb-4';
  wrap.innerHTML = `
    <h3 class="font-semibold mb-2">Candidatos Electos</h3>
    <table class="text-sm border-collapse w-full">
      <thead>
        <tr class="bg-gray-100">
          <th class="border px-2 py-1">#</th>
          <th class="border px-2 py-1 text-left">Nombre</th>
          <th class="border px-2 py-1">Pacto</th>
          <th class="border px-2 py-1">Votos</th>
          <th class="border px-2 py-1">Sexo</th>
          ${mostrarCoef ? '<th class="border px-2 py-1">Coef.</th>' : ''}
          <th class="border px-2 py-1">Estado</th>
        </tr>
      </thead>
      <tbody>
        ${electos.map((c, i) => `
          <tr class="${c.estado === 'paridad' ? 'bg-yellow-50' : ''}">
            <td class="border px-2 py-1 text-center">${i+1}</td>
            <td class="border px-2 py-1">${c.nombre}</td>
            <td class="border px-2 py-1 text-center">${c.pacto}</td>
            <td class="border px-2 py-1 text-center">${c.votos}</td>
            <td class="border px-2 py-1 text-center">${c.sexo === 'H' ? 'Hombre' : 'Mujer'}</td>
            ${mostrarCoef ? `<td class="border px-2 py-1 text-center">${c.coeficiente?.toFixed(4) ?? '—'}</td>` : ''}
            <td class="border px-2 py-1 text-center">${estadoBadge(c.estado)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  return wrap;
}

export function renderIndicadorParidad(electos, totalCupos) {
  const nH = electos.filter(c => c.sexo === 'H').length;
  const nM = electos.filter(c => c.sexo === 'M').length;
  const min = Math.ceil(totalCupos * 0.4);
  const cumple = nH >= min && nM >= min;
  const div = document.createElement('div');
  div.className = `banner-${cumple ? 'ok' : 'err'}`;
  div.innerHTML = `Hombres: <strong>${nH}</strong> &nbsp; Mujeres: <strong>${nM}</strong> &nbsp;→&nbsp; ${
    cumple
      ? `✓ Cumple paridad (mín. ${min} c/u)`
      : `⚠ No cumple paridad (mín. ${min} c/u)`
  }`;
  return div;
}
```

- [ ] **Step 2: Actualizar `js/app.js` para conectar eventos CCN**

```javascript
// js/app.js
import { addCCNPacto, removeCCNPacto, renderCCNPactos,
         addCCNCandidato, removeCCNCandidato, renderCCNCandidatos,
         calcularCCN } from './ui.js';
// Nota: initCCR y funciones CCR se importan en Task 7

// Exponer helpers globales para onclick en HTML
window._removeCCNPacto      = removeCCNPacto;
window._removeCCNCandidato  = removeCCNCandidato;

// ── Tabs ─────────────────────────────────────────────────────────────────────
document.getElementById('tab-ccn').addEventListener('click', () => {
  document.getElementById('panel-ccn').classList.remove('hidden');
  document.getElementById('panel-ccr').classList.add('hidden');
  document.getElementById('tab-ccn').classList.add('tab-active');
  document.getElementById('tab-ccr').classList.remove('tab-active');
});
document.getElementById('tab-ccr').addEventListener('click', () => {
  document.getElementById('panel-ccn').classList.add('hidden');
  document.getElementById('panel-ccr').classList.remove('hidden');
  document.getElementById('tab-ccn').classList.remove('tab-active');
  document.getElementById('tab-ccr').classList.add('tab-active');
});

// ── CCN: Pactos ──────────────────────────────────────────────────────────────
document.getElementById('ccn-add-pacto').addEventListener('click', () => {
  const input = document.getElementById('ccn-new-pacto');
  if (addCCNPacto(input.value)) input.value = '';
});
document.getElementById('ccn-new-pacto').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('ccn-add-pacto').click();
});

// ── CCN: Candidatos ──────────────────────────────────────────────────────────
document.getElementById('ccn-add-candidato').addEventListener('click', () => {
  const ok = addCCNCandidato({
    nombre: document.getElementById('ccn-nombre').value,
    pacto:  document.getElementById('ccn-pacto-sel').value,
    votos:  document.getElementById('ccn-votos').value,
    sexo:   document.getElementById('ccn-sexo').value,
  });
  if (ok) {
    document.getElementById('ccn-nombre').value = '';
    document.getElementById('ccn-votos').value  = '';
    document.getElementById('ccn-sexo').value   = '';
  }
});

// ── CCN: Calcular ────────────────────────────────────────────────────────────
document.getElementById('ccn-calcular').addEventListener('click', calcularCCN);

// ── Init ─────────────────────────────────────────────────────────────────────
renderCCNPactos();
renderCCNCandidatos();
```

- [ ] **Step 3: Abrir `index.html`, agregar pactos y candidatos CCN, hacer clic en Calcular**

Verificar:
- Pactos se agregan y eliminan correctamente
- Candidatos se agregan con validación
- Al calcular: aparece tabla D'Hondt + lista de electos + indicador paridad
- Badges correctos (✓ Electo, ★ Paridad según el escenario)

- [ ] **Step 4: Commit**

```bash
git add js/ui.js js/app.js
git commit -m "feat: UI CCN completa con D'Hondt y paridad"
```

---

## Task 7: UI del módulo CCR

**Files:**
- Modify: `js/ui.js`
- Modify: `js/app.js`

- [ ] **Step 1: Agregar funciones CCR a `js/ui.js`**

Agregar al final de `js/ui.js`:

```javascript
// ── CCR: Init y selector de región ──────────────────────────────────────────

export function initCCR(regiones) {
  const sel = document.getElementById('ccr-region-sel');
  sel.innerHTML = regiones.map(r =>
    `<option value="${r.id}">${r.nombre} (${r.cupos} cupo${r.cupos > 1 ? 's' : ''})</option>`
  ).join('');
  actualizarCCRRegion(regiones[0].id, regiones);
}

export function actualizarCCRRegion(regionId, regiones) {
  const region = regiones.find(r => r.id === regionId);
  document.getElementById('ccr-cupos-badge').textContent =
    `${region.cupos} cupo${region.cupos > 1 ? 's' : ''} — Padrón: ${region.padron}`;
  renderCCRPactos(regionId);
  renderCCRCandidatos(regionId);
  document.getElementById('ccr-resultado-output').classList.add('hidden');
}

// ── CCR: Gestión de Pactos ───────────────────────────────────────────────────

export function renderCCRPactos(regionId) {
  const ctx = getContext('ccr', regionId);
  const lista = document.getElementById('ccr-pactos-list');
  const sel   = document.getElementById('ccr-pacto-sel');

  lista.innerHTML = ctx.pactos.map(p => `
    <span class="inline-flex items-center gap-1 bg-gray-100 border rounded px-2 py-1 text-sm">
      ${p}
      <button class="text-red-500 hover:text-red-700 font-bold"
        onclick="window._removeCCRPacto('${regionId}', '${p}')"
        ${ctx.candidatos.some(c => c.pacto === p) ? 'disabled title="Tiene candidatos"' : ''}>×</button>
    </span>
  `).join('');

  sel.innerHTML = '<option value="">-- Pacto --</option>' +
    ctx.pactos.map(p => `<option value="${p}">${p}</option>`).join('');
}

export function addCCRPacto(regionId, nombre) {
  const ctx = getContext('ccr', regionId);
  if (!nombre.trim() || ctx.pactos.includes(nombre.trim())) return false;
  ctx.pactos.push(nombre.trim());
  renderCCRPactos(regionId);
  return true;
}

export function removeCCRPacto(regionId, nombre) {
  const ctx = getContext('ccr', regionId);
  if (ctx.candidatos.some(c => c.pacto === nombre)) return;
  ctx.pactos = ctx.pactos.filter(p => p !== nombre);
  renderCCRPactos(regionId);
}

// ── CCR: Gestión de Candidatos ───────────────────────────────────────────────

export function renderCCRCandidatos(regionId) {
  const ctx = getContext('ccr', regionId);
  const lista = document.getElementById('ccr-candidatos-list');
  if (ctx.candidatos.length === 0) {
    lista.innerHTML = '<p class="text-sm text-gray-400">Sin candidatos aún.</p>';
    return;
  }
  lista.innerHTML = ctx.candidatos.map(c => `
    <div class="grid grid-cols-5 gap-2 text-sm items-center border-b py-1">
      <span class="col-span-2">${c.nombre}</span>
      <span>${c.pacto}</span>
      <span>${c.votos}</span>
      <span class="flex items-center gap-1">
        ${c.sexo === 'H' ? 'Hombre' : 'Mujer'}
        <button class="ml-2 text-red-400 hover:text-red-600"
          onclick="window._removeCCRCandidato('${regionId}', ${c.id})">×</button>
      </span>
    </div>
  `).join('');
}

export function addCCRCandidato(regionId, { nombre, pacto, votos, sexo }) {
  if (!nombre.trim() || !pacto || votos === '' || !sexo) return false;
  const ctx = getContext('ccr', regionId);
  ctx.candidatos.push({ id: newId(), nombre: nombre.trim(), pacto, votos: parseInt(votos), sexo });
  renderCCRCandidatos(regionId);
  document.getElementById('ccr-resultado-output').classList.add('hidden');
  return true;
}

export function removeCCRCandidato(regionId, id) {
  const ctx = getContext('ccr', regionId);
  ctx.candidatos = ctx.candidatos.filter(c => c.id !== id);
  renderCCRCandidatos(regionId);
}

// ── CCR: Cálculo región individual ──────────────────────────────────────────

export function calcularCCR(regionId, regiones) {
  const region = regiones.find(r => r.id === regionId);
  const ctx = getContext('ccr', regionId);
  const output = document.getElementById('ccr-resultado-output');
  output.innerHTML = '';
  output.classList.remove('hidden');

  if (ctx.pactos.length === 0 || ctx.candidatos.length === 0) {
    output.appendChild(renderBanner('Ingresa al menos un pacto y un candidato antes de calcular.', 'err'));
    return;
  }

  const dhondt = runDhondt(ctx.candidatos, ctx.pactos, region.cupos);

  if (dhondt.listaUnica) {
    output.appendChild(renderBanner('Lista única — se aplica conteo directo (art. 74)', 'warn'));
  }

  dhondt.advertencias.forEach(adv => {
    if (adv.tipo === 'sorteo_dhondt') {
      output.appendChild(renderBanner(
        `⚠ Empate en cifra repartidora — se requiere sorteo para el cupo N°${adv.cupo}. Simulación asignó a: ${adv.pactoGanador}`, 'warn'
      ));
    }
    if (adv.tipo === 'sorteo_individual') {
      output.appendChild(renderBanner(
        `⚠ Empate en votos individuales en pacto ${adv.pacto} (${adv.votos} votos) — se requiere sorteo`, 'warn'
      ));
    }
  });

  if (!dhondt.listaUnica) {
    output.appendChild(renderDhondtTable(dhondt, ctx.pactos, region.cupos));
  }

  import('./parity.js').then(({ aplicarParidadCCR }) => {
    const paridad = aplicarParidadCCR(dhondt.electos, dhondt.noElectos, region.padron, region.cupos);

    if (paridad.imposible) {
      output.appendChild(renderBanner('⚠ No es posible alcanzar la paridad con los candidatos ingresados.', 'err'));
    } else if (paridad.corregido) {
      output.appendChild(renderBanner('Se aplicó corrección de paridad (art. 77b)', 'warn'));
    }

    output.appendChild(renderElectos(paridad.electos, true)); // mostrar coeficiente
    output.appendChild(renderIndicadorParidad(paridad.electos, region.cupos));
  });
}

// ── CCR: Resumen nacional ────────────────────────────────────────────────────

export function renderResumenNacionalCCR(regiones) {
  const output = document.getElementById('ccr-resultado-output');
  output.innerHTML = '';
  output.classList.remove('hidden');

  const regionesConDatos = regiones.filter(r => {
    const ctx = getContext('ccr', r.id);
    return ctx.candidatos.length > 0;
  });

  if (regionesConDatos.length === 0) {
    output.appendChild(renderBanner('No hay datos ingresados en ninguna región.', 'err'));
    return;
  }

  const titulo = document.createElement('h3');
  titulo.className = 'font-bold text-lg mb-4';
  titulo.textContent = 'Resumen Nacional CCR';
  output.appendChild(titulo);

  import('./parity.js').then(({ aplicarParidadCCR }) => {
    regionesConDatos.forEach(region => {
      const ctx = getContext('ccr', region.id);
      const seccion = document.createElement('div');
      seccion.className = 'mb-6 border rounded p-3 bg-white';

      const dhondt = runDhondt(ctx.candidatos, ctx.pactos, region.cupos);
      const paridad = aplicarParidadCCR(dhondt.electos, dhondt.noElectos, region.padron, region.cupos);

      seccion.innerHTML = `<h4 class="font-semibold mb-2">${region.nombre} (${region.cupos} cupo${region.cupos > 1 ? 's' : ''})</h4>`;
      seccion.appendChild(renderElectos(paridad.electos, true));
      seccion.appendChild(renderIndicadorParidad(paridad.electos, region.cupos));
      output.appendChild(seccion);
    });
  });
}
```

- [ ] **Step 2: Actualizar `js/app.js` para conectar eventos CCR**

Reemplazar el import inicial y agregar los eventos CCR:

```javascript
// js/app.js
import { REGIONES } from './data.js';
import { state } from './data.js';
import {
  addCCNPacto, removeCCNPacto, renderCCNPactos,
  addCCNCandidato, removeCCNCandidato, renderCCNCandidatos, calcularCCN,
  initCCR, actualizarCCRRegion,
  addCCRPacto, removeCCRPacto,
  addCCRCandidato, removeCCRCandidato,
  calcularCCR, renderResumenNacionalCCR,
} from './ui.js';

// Helpers globales para onclick
window._removeCCNPacto      = removeCCNPacto;
window._removeCCNCandidato  = removeCCNCandidato;
window._removeCCRPacto      = (regionId, nombre) => removeCCRPacto(regionId, nombre);
window._removeCCRCandidato  = (regionId, id) => removeCCRCandidato(regionId, id);

// ── Tabs ─────────────────────────────────────────────────────────────────────
document.getElementById('tab-ccn').addEventListener('click', () => {
  document.getElementById('panel-ccn').classList.remove('hidden');
  document.getElementById('panel-ccr').classList.add('hidden');
  document.getElementById('tab-ccn').classList.add('tab-active');
  document.getElementById('tab-ccr').classList.remove('tab-active');
});
document.getElementById('tab-ccr').addEventListener('click', () => {
  document.getElementById('panel-ccn').classList.add('hidden');
  document.getElementById('panel-ccr').classList.remove('hidden');
  document.getElementById('tab-ccn').classList.remove('tab-active');
  document.getElementById('tab-ccr').classList.add('tab-active');
});

// ── CCN: Pactos ──────────────────────────────────────────────────────────────
document.getElementById('ccn-add-pacto').addEventListener('click', () => {
  const input = document.getElementById('ccn-new-pacto');
  if (addCCNPacto(input.value)) input.value = '';
});
document.getElementById('ccn-new-pacto').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('ccn-add-pacto').click();
});

// ── CCN: Candidatos ──────────────────────────────────────────────────────────
document.getElementById('ccn-add-candidato').addEventListener('click', () => {
  const ok = addCCNCandidato({
    nombre: document.getElementById('ccn-nombre').value,
    pacto:  document.getElementById('ccn-pacto-sel').value,
    votos:  document.getElementById('ccn-votos').value,
    sexo:   document.getElementById('ccn-sexo').value,
  });
  if (ok) {
    document.getElementById('ccn-nombre').value = '';
    document.getElementById('ccn-votos').value  = '';
    document.getElementById('ccn-sexo').value   = '';
  }
});
document.getElementById('ccn-calcular').addEventListener('click', calcularCCN);

// ── CCR: Selector de región ──────────────────────────────────────────────────
document.getElementById('ccr-region-sel').addEventListener('change', e => {
  state.ccrRegionActiva = e.target.value;
  actualizarCCRRegion(e.target.value, REGIONES);
});

// ── CCR: Pactos ──────────────────────────────────────────────────────────────
document.getElementById('ccr-add-pacto').addEventListener('click', () => {
  const input = document.getElementById('ccr-new-pacto');
  const regionId = state.ccrRegionActiva;
  if (addCCRPacto(regionId, input.value)) input.value = '';
});
document.getElementById('ccr-new-pacto').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('ccr-add-pacto').click();
});

// ── CCR: Candidatos ──────────────────────────────────────────────────────────
document.getElementById('ccr-add-candidato').addEventListener('click', () => {
  const regionId = state.ccrRegionActiva;
  const ok = addCCRCandidato(regionId, {
    nombre: document.getElementById('ccr-nombre').value,
    pacto:  document.getElementById('ccr-pacto-sel').value,
    votos:  document.getElementById('ccr-votos').value,
    sexo:   document.getElementById('ccr-sexo').value,
  });
  if (ok) {
    document.getElementById('ccr-nombre').value = '';
    document.getElementById('ccr-votos').value  = '';
    document.getElementById('ccr-sexo').value   = '';
  }
});

// ── CCR: Calcular ────────────────────────────────────────────────────────────
document.getElementById('ccr-calcular').addEventListener('click', () =>
  calcularCCR(state.ccrRegionActiva, REGIONES)
);
document.getElementById('ccr-calcular-todas').addEventListener('click', () =>
  renderResumenNacionalCCR(REGIONES)
);

// ── Init ─────────────────────────────────────────────────────────────────────
renderCCNPactos();
renderCCNCandidatos();
initCCR(REGIONES);
```

- [ ] **Step 3: Probar CCR en browser**

Verificar:
- Selector de región muestra las 16 regiones con cupos
- Cambiar de región preserva datos de la región anterior
- Agregar pactos y candidatos por región funciona independientemente
- Calcular muestra tabla D'Hondt + electos con coeficiente + paridad
- "Ver resumen nacional CCR" muestra todas las regiones con datos

- [ ] **Step 4: Commit**

```bash
git add js/ui.js js/app.js
git commit -m "feat: UI CCR completa con selector de región y resumen nacional"
```

---

## Task 8: Pulido final

**Files:**
- Modify: `index.html` (pequeños ajustes si se detectan en prueba)
- Modify: `style.css`

- [ ] **Step 1: Prueba integral con escenario real**

Simular un escenario completo:
- CCN: 3 pactos (Tercerismo+Renova, NI, CS), al menos 12 candidatos (mezcla H/M), calcular y verificar que los 11 electos cumplen paridad
- CCR RM: 3 pactos, al menos 8 candidatos, verificar 7 cupos distribuidos con paridad
- CCR Aysén: 1 cupo, verificar que el más votado es electo (sin D'Hondt multi-cupo)
- Verificar resumen nacional con 2 regiones cargadas

- [ ] **Step 2: Ajustar cualquier bug visual o de UX detectado en la prueba**

Ajustes típicos esperados:
- Overflow en tablas largas (ya tiene `overflow-x-auto`)
- Botón deshabilitado de eliminar pacto cuando tiene candidatos
- Mensaje de error claro si el usuario hace clic en Calcular sin pactos

- [ ] **Step 3: Commit final**

```bash
git add -A
git commit -m "feat: simulador D'Hondt JS 2026 completo"
```

---

## Verificación final

Abrir `index.html` y confirmar:
- [ ] Dos pestañas: CCN y CCR, navegables
- [ ] CCN: se pueden agregar/eliminar pactos dinámicamente
- [ ] CCN: se pueden agregar/eliminar candidatos (Nombre, Pacto, Votos, Sexo)
- [ ] CCN: Calcular muestra tabla D'Hondt (si hay competencia) + lista de electos + indicador paridad
- [ ] CCN: badge ★ Paridad en candidatos corregidos
- [ ] CCR: selector con 16 regiones + cupos + padrón
- [ ] CCR: datos independientes por región
- [ ] CCR: columna Coef. electoral en resultados
- [ ] CCR: "Ver resumen nacional" muestra todas las regiones con datos
- [ ] Advertencias de sorteo cuando hay empates
- [ ] Advertencia de lista única (art. 74) cuando corresponde
- [ ] Aviso "paridad imposible" cuando no hay candidatos del género subrepresentado
- [ ] `tests.html`: todos los tests pasan (verde)
