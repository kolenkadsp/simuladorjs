# Diseño: Escenarios en CCN + Cruces independientes por sección

**Fecha:** 2026-07-28  
**Estado:** Aprobado

---

## Contexto

La app es un simulador de elecciones JS 2026 (vanilla JS, index.html único). CCR ya tiene soporte de múltiples escenarios y configuración de columnas de cruce. Este diseño extiende las mismas capacidades a CCN y hace que cada sección (CCN, CCR, Dirección) maneje sus propios cruces de forma independiente.

---

## Objetivo

1. CCN recibe la misma estructura de escenarios que CCR (pestañas, renombrar, duplicar, eliminar).
2. Las columnas de cruce son independientes por sección: agregar o eliminar una en CCN no afecta CCR ni Dirección, y viceversa.
3. La fila de sumatoria por columna se mantiene y sigue actualizándose en tiempo real.

---

## Estado actual vs estado objetivo

### Estado actual
```js
state.cruzNames   // array global, compartido por CCN/CCR/Dir
state.ccn         // { pactos: [], candidatos: [] }
state.ccr         // { [regionId]: { escenarios: [...], escenarioActivo } }
state.direccion   // { pactos: [], presidente: {...}, ... }
```

### Estado objetivo
```js
// cruzNames eliminado del nivel raíz
state.ccn = {
  escenarios: [{ nombre, pactos, candidatos }],
  escenarioActivo: 0,
  cruzNames: ['Cruz.1', 'Cruz.2', 'Cruz.3']
}
state.ccr  // sin cambios en escenarios; agrega state.ccrCruzNames a nivel raíz
state.ccrCruzNames = ['Cruz.1', 'Cruz.2', 'Cruz.3']
state.direccion = {
  pactos: [],
  cruzNames: ['Cruz.1', 'Cruz.2', 'Cruz.3'],
  presidente: { candidatos: [] },
  ...
}
```

---

## Arquitectura

### CSS: grid por panel

Actualmente hay un `<style id="cand-row-grid-style">` global para `.cand-row`. Pasa a tres estilos con selectores acotados:

```
#panel-ccn .cand-row       { grid-template-columns: ... }
#panel-ccr .cand-row       { grid-template-columns: ... }
#panel-direccion .cand-row { grid-template-columns: ... }
```

`updateCandRowStyle(panelId, cruzNames)` actualiza el estilo correspondiente.  
Los tres `<style>` llevan IDs `cand-row-grid-style-ccn`, `cand-row-grid-style-ccr`, `cand-row-grid-style-dir`.

### Helper functions — nuevo parámetro `cruzNames`

Todas las funciones que antes leían `state.cruzNames` pasan a recibir el arreglo como parámetro:

| Función | Firma actualizada |
|---|---|
| `updateCandRowStyle` | `(panelId, cruzNames)` |
| `renderCandHeader` | `(id, cruzNames)` |
| `renderCruzConfig` | `(pfx, cruzNames, tipo)` |
| `renderCruzAddInputs` | `(pfx, cruzNames)` |
| `_cruzInlineInputs` | `(c, pfx, ac, enter, updateFn, cruzNames)` |
| `_readCruces` | `(pfx, id, n)` — n = cruzNames.length |
| `_renderTotalsEl` | `(elId, candidatos, cruzNames)` |
| `_setCruzName` | `(tipo, idx, name)` — tipo: 'ccn' \| 'ccr' \| 'dir' |
| `addCruz` | `(tipo)` |
| `removeCruz` | `(tipo, idx)` |
| `propagateCruzChange` | `(tipo)` |

### Nuevo helper: `getCruzNames(tipo)`
```js
function getCruzNames(tipo) {
  if (tipo === 'ccn') return state.ccn.cruzNames;
  if (tipo === 'ccr') return state.ccrCruzNames;
  return state.direccion.cruzNames;
}
```

---

## CCN: estructura de escenarios

`state.ccn` se convierte en objeto con escenarios. Se crean las siguientes funciones (mirror de las de CCR):

- `renderCCNScenarios()` — pestañas con ✏ renombrar y × eliminar
- `addCCNScenario()` — escenario vacío nuevo
- `deleteCCNScenario(idx)` — confirm + eliminar
- `switchCCNScenario(idx)` — cambiar activo
- `renameCCNScenario(idx)` — prompt inline
- `duplicateCCNScenario()` — deep copy + newId() en cada candidato

`getContext('ccn')` ya existe; cambia para leer `state.ccn.escenarios[state.ccn.escenarioActivo]`.

---

## HTML

### CCN
Agregar antes de la lista de candidatos:
```html
<div id="ccn-escenarios-tabs" class="flex items-end gap-0.5 mb-0 border-b border-gray-200"></div>
```

Agregar el bloque de configuración de cruces (idéntico al de CCR):
```html
<div id="ccn-cruz-config" class="flex items-center gap-1 flex-wrap text-xs text-gray-400"></div>
```

### CCR
Sin cambios en HTML (ya tiene su estructura). Solo se desconecta del `state.cruzNames` global.

### Dirección
Sin cambios en HTML (los headers se regeneran vía `buildDireccionPanel` que ya es dinámico).

---

## Persistencia (saveState / loadState)

### saveState
```js
{ ccn, ccrCruzNames, ccr, nextId, jsEstimado, tabActiva, ccrRegionActiva, direccion }
// ccn.cruzNames viaja dentro de ccn
// direccion.cruzNames viaja dentro de direccion
```

### loadState — migración
- Si existe `s.cruzNames` (formato viejo global): copiar a `ccn.cruzNames`, `ccrCruzNames`, `direccion.cruzNames`.
- Si existe `s.ccn` sin escenarios: envolver igual que se hizo con CCR (`{ escenarios: [{ nombre: 'Escenario 1', ...old }], escenarioActivo: 0, cruzNames: [...] }`).

---

## Flujo de renderizado por sección

### CCN (después del cambio)
```
initCCN()
  └─ renderCCNScenarios()
  └─ renderCCNPactos()
  └─ renderCCNCandidatos()
       └─ _renderTotalsEl('ccn-cands-totals', ctx.candidatos, state.ccn.cruzNames)
  └─ updateCandRowStyle('panel-ccn', state.ccn.cruzNames)
  └─ renderCruzConfig('ccn', state.ccn.cruzNames, 'ccn')
  └─ renderCandHeader('ccn-cands-header', state.ccn.cruzNames)
  └─ renderCruzAddInputs('ccn', state.ccn.cruzNames)
```

### CCR (sin cambios estructurales, solo desacoplado de global)
```
actualizarCCRRegion(regionId)
  └─ renderCCRScenarios(regionId)
  └─ renderCCRPactos(regionId)
  └─ renderCCRCandidatos(regionId)
       └─ _renderTotalsEl('ccr-cands-totals', ctx.candidatos, state.ccrCruzNames)
  └─ updateCandRowStyle('panel-ccr', state.ccrCruzNames)
  └─ renderCruzConfig('ccr', state.ccrCruzNames, 'ccr')
  └─ renderCandHeader('ccr-cands-header', state.ccrCruzNames)
  └─ renderCruzAddInputs('ccr', state.ccrCruzNames)
```

---

## Fuera de alcance

- Escenarios en Dirección (solo se independizan sus cruces)
- Cruces por-escenario dentro de una misma sección
- Cambios en la lógica de cálculo D'Hondt / paridad

---

## Orden de implementación sugerido

1. Actualizar estado inicial y `saveState`/`loadState` (migración)
2. Refactorizar helpers para recibir `cruzNames` como parámetro
3. Actualizar CSS a selectores por panel
4. Actualizar `getCruzNames`, `_setCruzName`, `addCruz`, `removeCruz`, `propagateCruzChange`
5. Convertir `state.ccn` a estructura de escenarios + `getContext('ccn')`
6. Agregar funciones de escenarios CCN + HTML tabs
7. Conectar CCN cruz config en HTML + init
8. Actualizar todos los callers de helpers (CCN, CCR, Dir) para pasar cruzNames correcto
9. Verificar migración con datos guardados en versión anterior
