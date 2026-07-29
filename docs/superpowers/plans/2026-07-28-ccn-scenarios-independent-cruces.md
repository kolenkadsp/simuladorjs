# CCN Escenarios + Cruces Independientes por Sección — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** CCN obtiene la misma UI de escenarios que CCR; las columnas de cruce de CCN, CCR y Dirección son independientes entre sí.

**Architecture:** Refactor de `index.html` en 11 tareas secuenciales. Los cruzNames dejan de ser globales y pasan a vivir en `state.ccn.cruzNames`, `state.ccrCruzNames` y `state.direccion.cruzNames`. Los helpers de cruz reciben `cruzNames` (o `n = cruzNames.length`) como parámetro explícito. El CSS del grid pasa de un selector global `.cand-row` a selectores por panel (`#panel-ccn .cand-row` etc.). CCN recibe funciones de escenarios espejo de las de CCR.

**Tech Stack:** Vanilla JS, HTML inline, Tailwind CSS CDN, localStorage.

**Archivo único modificado:** `index.html`

---

### Task 1: Estado inicial + emptyRegionCCN + getCruzNames + getContext('ccn')

**Files:**
- Modify: `index.html` (líneas ~202–227)

- [ ] **Reemplazar `emptyContext`, `emptyRegionCCR` y la declaración de `state`**

```js
function emptyContext() { return { pactos: [], candidatos: [] }; }
function emptyRegionCCR() { return { escenarios: [{ nombre: 'Escenario 1', pactos: [], candidatos: [] }], escenarioActivo: 0 }; }
function emptyRegionCCN() { return { escenarios: [{ nombre: 'Escenario 1', pactos: [], candidatos: [] }], escenarioActivo: 0, cruzNames: ['Cruz.1','Cruz.2','Cruz.3'] }; }
const state = {
  ccn: emptyRegionCCN(),
  ccr: Object.fromEntries(REGIONES.map(r => [r.id, emptyRegionCCR()])),
  ccrRegionActiva: REGIONES[0].id,
  ccrCruzNames: ['Cruz.1','Cruz.2','Cruz.3'],
  jsEstimado: {},
  tabActiva: 'ccn',
  direccion: {
    pactos: [],
    cruzNames: ['Cruz.1','Cruz.2','Cruz.3'],
    presidente:      { candidatos: [] },
    secGeneral:      { candidatos: [] },
    vpMujer:         { candidatos: [] },
    vicepresidencia: { candidatos: [] },
  },
};
```

- [ ] **Reemplazar `getContext`**

```js
function getContext(tipo, regionId) {
  if (tipo === 'ccn') {
    return state.ccn.escenarios[state.ccn.escenarioActivo || 0];
  }
  const rid = regionId != null ? regionId : state.ccrRegionActiva;
  const reg = state.ccr[rid];
  if (!reg) return emptyContext();
  if (reg.escenarios) return reg.escenarios[reg.escenarioActivo || 0];
  return reg;
}
```

- [ ] **Agregar `getCruzNames` justo después de `getContext`**

```js
function getCruzNames(tipo) {
  if (tipo === 'ccn') return state.ccn.cruzNames;
  if (tipo === 'ccr') return state.ccrCruzNames;
  return state.direccion.cruzNames;
}
```

- [ ] **Commit**
```bash
git add index.html && git commit -m "refactor: estado ccn con escenarios + cruzNames por sección"
```

---

### Task 2: saveState + loadState (migración)

**Files:**
- Modify: `index.html` (líneas ~377–431)

- [ ] **Reemplazar `saveState`**

```js
function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ccn: state.ccn, ccr: state.ccr, ccrCruzNames: state.ccrCruzNames,
      nextId, jsEstimado: state.jsEstimado, tabActiva: state.tabActiva,
      ccrRegionActiva: state.ccrRegionActiva, direccion: state.direccion,
    }));
  } catch(e) {}
}
```

- [ ] **Reemplazar bloque CCN dentro de `loadState` (incluye migración de formato viejo)**

Reemplazar:
```js
    if (s.ccn) {
      s.ccn.candidatos = (s.ccn.candidatos||[]).map(migrateCandidate);
      state.ccn = s.ccn;
    }
```
Por:
```js
    if (s.ccn) {
      if (s.ccn.escenarios) {
        s.ccn.escenarios.forEach(function(e){ e.candidatos=(e.candidatos||[]).map(migrateCandidate); });
        state.ccn = s.ccn;
        if (!state.ccn.cruzNames) state.ccn.cruzNames = ['Cruz.1','Cruz.2','Cruz.3'];
      } else {
        // formato viejo {pactos, candidatos}
        s.ccn.candidatos = (s.ccn.candidatos||[]).map(migrateCandidate);
        state.ccn = { escenarios: [Object.assign({ nombre: 'Escenario 1' }, s.ccn)], escenarioActivo: 0, cruzNames: ['Cruz.1','Cruz.2','Cruz.3'] };
      }
    }
```

- [ ] **Reemplazar línea de cruzNames global en loadState**

Reemplazar:
```js
    if (s.cruzNames && Array.isArray(s.cruzNames)) state.cruzNames = s.cruzNames;
```
Por:
```js
    if (s.ccrCruzNames && Array.isArray(s.ccrCruzNames)) state.ccrCruzNames = s.ccrCruzNames;
    // migración: si había cruzNames global viejo, aplicar a todos
    else if (s.cruzNames && Array.isArray(s.cruzNames)) {
      state.ccn.cruzNames = s.cruzNames.slice();
      state.ccrCruzNames = s.cruzNames.slice();
      state.direccion.cruzNames = s.cruzNames.slice();
    }
```

- [ ] **Cargar `direccion.cruzNames` en loadState — dentro del bloque `if (s.direccion)`**

Agregar al inicio del bloque:
```js
      if (s.direccion.cruzNames) state.direccion.cruzNames = s.direccion.cruzNames;
```

- [ ] **Commit**
```bash
git add index.html && git commit -m "refactor: saveState/loadState con cruzNames por sección + migración"
```

---

### Task 3: Refactorizar helpers de cruz para recibir cruzNames como parámetro

**Files:**
- Modify: `index.html` (bloque `// ── cruce dynamic helpers`, líneas ~236–375)

- [ ] **Reemplazar `updateCandRowStyle`**

```js
function updateCandRowStyle(panelId, cruzNames) {
  const n = cruzNames.length;
  const cruzCols = new Array(n).fill('58px').join(' ');
  const tpl = '18px minmax(140px,2fr) minmax(90px,1.2fr) minmax(80px,1fr) minmax(70px,1fr) 58px '+cruzCols+' 62px 80px 26px';
  const styleId = 'cand-row-grid-style-'+panelId;
  let el = document.getElementById(styleId);
  if (!el) { el = document.createElement('style'); el.id=styleId; document.head.appendChild(el); }
  el.textContent = '#panel-'+panelId+' .cand-row{grid-template-columns:'+tpl+';}';
}
```

- [ ] **Reemplazar `renderCandHeader`**

```js
function renderCandHeader(id, cruzNames) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = '<span></span><span>Nombre</span><span>Pacto</span><span>Lote</span><span>Comunal</span>'+
    '<span>V.Base</span>'+
    cruzNames.map(function(n,i){ return '<span>'+n+'</span>'; }).join('')+
    '<span class="font-bold text-gray-700">Total</span><span>Sexo</span><span></span>';
}
```

- [ ] **Reemplazar `renderCruzConfig`**

```js
function renderCruzConfig(containerId, cruzNames, tipo) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = '<span class="whitespace-nowrap text-gray-400 mr-1">Cruces:</span>'+
    cruzNames.map(function(name,i){
      return '<div class="flex items-center gap-0">'+
        '<input class="border rounded px-1 py-0.5 w-20 text-xs" value="'+name+'" '+
          'onchange="window._setCruzName(\''+tipo+'\','+i+',this.value)" onkeydown="if(event.key===\'Enter\')this.blur()">'+
        (cruzNames.length>1
          ? '<button class="text-red-400 hover:text-red-600 text-xs px-0.5 leading-none" onclick="removeCruz(\''+tipo+'\','+i+')" title="Eliminar columna">×</button>'
          : '')+
      '</div>';
    }).join('')+
    '<button class="text-xs text-blue-500 hover:text-blue-700 border border-blue-300 rounded px-1.5 py-0.5 whitespace-nowrap ml-1" onclick="addCruz(\''+tipo+'\')">+ Cruce</button>';
}
```

- [ ] **Reemplazar `renderCruzAddInputs`**

```js
function renderCruzAddInputs(pfx, cruzNames) {
  const el = document.getElementById(pfx+'-cruz-add-inputs');
  if (!el) return;
  el.innerHTML = cruzNames.map(function(name,i){
    return '<input id="'+pfx+'-vcruz'+i+'" type="number" min="0" placeholder="'+name+'" class="border rounded px-1 py-1 text-sm w-16">';
  }).join('');
}
```

- [ ] **Reemplazar `_cruzInlineInputs`**

```js
function _cruzInlineInputs(c, pfx, ac, enter, updateFn, cruzNames) {
  const cruces = c.cruces || [];
  return cruzNames.map(function(name,i){
    return '<input type="number" class="inline-cell w-full text-center" id="ei-'+pfx+'-vcruz'+i+'-'+c.id+'" value="'+(cruces[i]||0)+'" onchange="'+ac+'" oninput="'+updateFn+'('+c.id+')" onkeydown="'+enter+'">';
  }).join('');
}
```

- [ ] **Reemplazar `_calcTotalFromInputs`**

```js
function _calcTotalFromInputs(pfx, id, n) {
  const g = function(sel){ const el=document.getElementById(sel); return el?parseInt(el.value)||0:0; };
  let tot = g('ei-'+pfx+'-vbase-'+id);
  for (let i=0;i<n;i++) tot += g('ei-'+pfx+'-vcruz'+i+'-'+id);
  return tot;
}
```

- [ ] **Reemplazar `_readCruces`**

```js
function _readCruces(pfx, id, n) {
  const arr=[];
  for(let i=0;i<n;i++){const el=document.getElementById('ei-'+pfx+'-vcruz'+i+'-'+id);arr.push(parseInt(el&&el.value)||0);}
  return arr;
}
```

- [ ] **Reemplazar `_readCruzAddForm`**

```js
function _readCruzAddForm(pfx, n) {
  const arr=[];
  for(let i=0;i<n;i++){const el=document.getElementById(pfx+'-vcruz'+i);arr.push(parseInt(el&&el.value)||0);}
  return arr;
}
```

- [ ] **Reemplazar `_clearCruzAddForm`**

```js
function _clearCruzAddForm(pfx, n) {
  for(let i=0;i<n;i++){const el=document.getElementById(pfx+'-vcruz'+i);if(el)el.value='';}
}
```

- [ ] **Reemplazar `_renderTotalsEl`**

```js
function _renderTotalsEl(elId, candidatos, cruzNames) {
  const el = document.getElementById(elId);
  if (!el) return;
  if (!candidatos.length) { el.innerHTML = ''; return; }
  const sumBase = candidatos.reduce(function(s,c){return s+(parseInt(c.votosBase)||0);},0);
  const sumCruces = cruzNames.map(function(_,i){
    return candidatos.reduce(function(s,c){return s+((c.cruces&&c.cruces[i])||0);},0);
  });
  const sumTotal = candidatos.reduce(function(s,c){return s+totalVotos(c);},0);
  el.innerHTML = '<div class="cand-row border-t-2 border-gray-300 py-0.5 bg-gray-50 text-xs font-bold text-gray-600 mb-2">'+
    '<span></span><span class="uppercase tracking-wide text-gray-400">Total</span>'+
    '<span></span><span></span><span></span>'+
    '<span class="text-center">'+sumBase+'</span>'+
    sumCruces.map(function(v){ return '<span class="text-center">'+v+'</span>'; }).join('')+
    '<span class="text-center text-gray-800">'+sumTotal+'</span>'+
    '<span></span><span></span>'+
  '</div>';
}
```

- [ ] **Commit**
```bash
git add index.html && git commit -m "refactor: helpers de cruz reciben cruzNames como parámetro"
```

---

### Task 4: Actualizar _setCruzName, addCruz, removeCruz, _propagateCruzChange

**Files:**
- Modify: `index.html` (bloque funciones de cruce, líneas ~311–338 + `window._setCruzName` ~1084)

- [ ] **Reemplazar `addCruz`**

```js
function addCruz(tipo) {
  const names = getCruzNames(tipo);
  names.push('Cruz.'+(names.length+1));
  _propagateCruzChange(tipo, 'add', null);
  _rebuildAfterCruzChange(tipo);
}
```

- [ ] **Reemplazar `removeCruz`**

```js
function removeCruz(tipo, idx) {
  const names = getCruzNames(tipo);
  if (names.length<=1) return;
  if (!confirm('¿Eliminar columna "'+names[idx]+'"?\nSe perderán los votos asignados en esa columna.')) return;
  names.splice(idx,1);
  _propagateCruzChange(tipo, 'remove', idx);
  _rebuildAfterCruzChange(tipo);
}
```

- [ ] **Reemplazar `_propagateCruzChange`**

```js
function _propagateCruzChange(tipo, action, idx) {
  const all = [];
  if (tipo === 'ccn') {
    state.ccn.escenarios.forEach(function(e){ e.candidatos.forEach(function(c){all.push(c);}); });
  } else if (tipo === 'ccr') {
    REGIONES.forEach(function(r){
      const reg=state.ccr[r.id];
      if(reg&&reg.escenarios) reg.escenarios.forEach(function(e){e.candidatos.forEach(function(c){all.push(c);});});
    });
  } else {
    DIR_CARGOS.forEach(function(cargo){state.direccion[cargo.id].candidatos.forEach(function(c){all.push(c);});});
  }
  all.forEach(function(c){
    if(!c.cruces) c.cruces=[];
    if(action==='add') c.cruces.push(0);
    else if(action==='remove') c.cruces.splice(idx,1);
  });
}
```

- [ ] **Reemplazar `window._setCruzName`**

```js
window._setCruzName = function(tipo, idx, name) {
  const names = getCruzNames(tipo);
  names[idx] = name.trim() || ('Cruz.'+(idx+1));
  _rebuildAfterCruzChange(tipo);
  saveState();
};
```

- [ ] **Commit**
```bash
git add index.html && git commit -m "refactor: addCruz/removeCruz/_setCruzName reciben tipo"
```

---

### Task 5: Actualizar _rebuildAfterCruzChange + updateCruzHeaders

**Files:**
- Modify: `index.html` (funciones `_rebuildAfterCruzChange` y `updateCruzHeaders`, líneas ~360–375 + ~1080–1095)

- [ ] **Reemplazar `_rebuildAfterCruzChange`**

```js
function _rebuildAfterCruzChange(tipo) {
  const cn = getCruzNames(tipo);
  if (tipo === 'ccn') {
    updateCandRowStyle('ccn', cn);
    renderCruzConfig('ccn-cruz-config', cn, 'ccn');
    renderCandHeader('ccn-cands-header', cn);
    renderCruzAddInputs('ccn', cn);
    renderCCNCandidatos();
  } else if (tipo === 'ccr') {
    updateCandRowStyle('ccr', cn);
    renderCruzConfig('ccr-cruz-config', cn, 'ccr');
    renderCandHeader('ccr-cands-header', cn);
    renderCruzAddInputs('ccr', cn);
    renderCCRCandidatos(state.ccrRegionActiva);
  } else {
    updateCandRowStyle('direccion', cn);
    DIR_CARGOS.forEach(function(cargo){
      renderCandHeader('dir-cands-header-'+cargo.id, cn);
      renderCruzAddInputs('dir-'+cargo.id, cn);
      renderDirCandidatos(cargo.id);
    });
  }
  saveState();
}
```

- [ ] **Reemplazar `updateCruzHeaders`**

```js
function updateCruzHeaders() {
  renderCandHeader('ccn-cands-header', state.ccn.cruzNames);
  renderCandHeader('ccr-cands-header', state.ccrCruzNames);
  DIR_CARGOS.forEach(function(cargo){ renderCandHeader('dir-cands-header-'+cargo.id, state.direccion.cruzNames); });
}
```

- [ ] **Commit**
```bash
git add index.html && git commit -m "refactor: _rebuildAfterCruzChange y updateCruzHeaders por tipo"
```

---

### Task 6: Actualizar callers CCN (filaInlineCCN, _updateTotalCCN, _autoSaveCCNCandidato, addCCNCandidato, doAddCCN, renderCCNCandidatos)

**Files:**
- Modify: `index.html` (funciones CCN, líneas ~670–745)

- [ ] **En `filaInlineCCN` — reemplazar llamada a `_cruzInlineInputs` y `_calcTotalFromInputs`**

Cambiar la línea de `_cruzInlineInputs`:
```js
    _cruzInlineInputs(c,'ccn',ac,enter,'window._updateTotalCCN', state.ccn.cruzNames)+
```

- [ ] **En `_updateTotalCCN` — pasar `n`**

```js
window._updateTotalCCN = function(id) {
  const tot = _calcTotalFromInputs('ccn', id, state.ccn.cruzNames.length);
  const el=document.getElementById('ei-ccn-total-'+id); if(el) el.textContent=tot;
};
```

- [ ] **En `_autoSaveCCNCandidato` — pasar `n` y `cruzNames`**

```js
  c.cruces = _readCruces('ccn', id, state.ccn.cruzNames.length);
  // ...
  _renderTotalsEl('ccn-cands-totals', getContext('ccn').candidatos, state.ccn.cruzNames);
```

- [ ] **En `renderCCNCandidatos` — pasar `cruzNames`**

```js
  _renderTotalsEl('ccn-cands-totals', ctx.candidatos, state.ccn.cruzNames);
```

- [ ] **En `addCCNCandidato` — ajustar cruces al tamaño actual**

```js
    cruces:(datos.cruces||[]).slice(0,state.ccn.cruzNames.length).concat(
      new Array(Math.max(0, state.ccn.cruzNames.length-(datos.cruces||[]).length)).fill(0)),
```

- [ ] **En `doAddCCN` — pasar `n`**

```js
    cruces:  _readCruzAddForm('ccn', state.ccn.cruzNames.length),
    // ...
    _clearCruzAddForm('ccn', state.ccn.cruzNames.length);
```

- [ ] **Commit**
```bash
git add index.html && git commit -m "refactor: callers CCN usan state.ccn.cruzNames"
```

---

### Task 7: Actualizar callers CCR

**Files:**
- Modify: `index.html` (funciones CCR, líneas ~780–855)

- [ ] **En `filaInlineCCR` — reemplazar `_cruzInlineInputs`**

```js
    _cruzInlineInputs(c,'ccr',ac,enter,'window._updateTotalCCR.bind(null,\''+regionId+'\')', state.ccrCruzNames)+
```

- [ ] **En `_updateTotalCCR` — pasar `n`**

```js
window._updateTotalCCR = function(regionId, id) {
  const tot = _calcTotalFromInputs('ccr', id, state.ccrCruzNames.length);
  const el=document.getElementById('ei-ccr-total-'+id); if(el) el.textContent=tot;
};
```

- [ ] **En `_autoSaveCCRCandidato` — pasar `n` y `cruzNames`**

```js
  c.cruces = _readCruces('ccr', id, state.ccrCruzNames.length);
  // ...
  _renderTotalsEl('ccr-cands-totals', getContext('ccr',regionId).candidatos, state.ccrCruzNames);
```

- [ ] **En `renderCCRCandidatos` — pasar `cruzNames`**

```js
  _renderTotalsEl('ccr-cands-totals', ctx.candidatos, state.ccrCruzNames);
```

- [ ] **En `addCCRCandidato` — ajustar cruces**

```js
    cruces:(datos.cruces||[]).slice(0,state.ccrCruzNames.length).concat(
      new Array(Math.max(0, state.ccrCruzNames.length-(datos.cruces||[]).length)).fill(0)),
```

- [ ] **En `doAddCCR` — pasar `n`**

```js
    cruces:  _readCruzAddForm('ccr', state.ccrCruzNames.length),
    // ...
    _clearCruzAddForm('ccr', state.ccrCruzNames.length);
```

- [ ] **Commit**
```bash
git add index.html && git commit -m "refactor: callers CCR usan state.ccrCruzNames"
```

---

### Task 8: Actualizar callers Dirección

**Files:**
- Modify: `index.html` (funciones Dir, líneas ~1260–1400)

- [ ] **En `filaInlineDir` — reemplazar `_cruzInlineInputs`**

```js
    _cruzInlineInputs(c,'dir',ac,enter,'window._updateTotalDir', state.direccion.cruzNames)+
```

- [ ] **En `_updateTotalDir` — pasar `n`**

```js
window._updateTotalDir = function(id) {
  const tot = _calcTotalFromInputs('dir', id, state.direccion.cruzNames.length);
  const el = document.getElementById('ei-dir-total-'+id); if(el) el.textContent=tot;
};
```

- [ ] **En `_autoSaveDir` — pasar `n` y `cruzNames`**

```js
  c.cruces = _readCruces('dir', id, state.direccion.cruzNames.length);
  // ...
  _renderTotalsEl('dir-cands-totals-'+cargoId, state.direccion[cargoId].candidatos, state.direccion.cruzNames);
```

- [ ] **En `renderDirCandidatos` — pasar `cruzNames`**

```js
  _renderTotalsEl('dir-cands-totals-'+cargoId, ctx.candidatos, state.direccion.cruzNames);
```

- [ ] **En `addDirCandidato` — ajustar cruces**

```js
    cruces: (datos.cruces||[]).slice(0,state.direccion.cruzNames.length).concat(
      new Array(Math.max(0, state.direccion.cruzNames.length-(datos.cruces||[]).length)).fill(0)),
```

- [ ] **En `doAddDir` — pasar `n`**

```js
    cruces:  _readCruzAddForm('dir-'+cargoId, state.direccion.cruzNames.length),
    // ...
    _clearCruzAddForm('dir-'+cargoId, state.direccion.cruzNames.length);
```

- [ ] **En `buildDireccionPanel` al final — pasar `cruzNames`**

```js
  DIR_CARGOS.forEach(function(cargo){
    renderCandHeader('dir-cands-header-'+cargo.id, state.direccion.cruzNames);
    renderCruzAddInputs('dir-'+cargo.id, state.direccion.cruzNames);
    renderDirCandidatos(cargo.id);
  });
```

- [ ] **Commit**
```bash
git add index.html && git commit -m "refactor: callers Dirección usan state.direccion.cruzNames"
```

---

### Task 9: Funciones de escenarios CCN (mirror de CCR)

**Files:**
- Modify: `index.html` — agregar bloque junto a funciones de escenarios CCR

- [ ] **Agregar funciones CCN scenario (después del bloque `// ── CCN Pactos`)**

```js
// ── CCN Escenarios ────────────────────────────────────────────────────────────
function renderCCNScenarios() {
  const el = document.getElementById('ccn-escenarios-tabs');
  if (!el) return;
  const esc = state.ccn.escenarios;
  const activo = state.ccn.escenarioActivo || 0;
  el.innerHTML = esc.map(function(e,i){
    const isActive = i === activo;
    return '<button class="px-3 py-1 text-sm rounded-t border-x border-t '+(isActive?'bg-white border-gray-200 font-semibold':'bg-gray-100 border-transparent text-gray-500 hover:bg-gray-200')+'" onclick="switchCCNScenario('+i+')">'+
      e.nombre+
      (isActive && esc.length>1 ? ' <span class="ml-1 text-gray-400 hover:text-red-500 cursor-pointer" onclick="event.stopPropagation();deleteCCNScenario('+i+')" title="Eliminar">×</span>' : '')+
      (isActive ? ' <span class="ml-1 text-gray-400 hover:text-blue-500 cursor-pointer text-xs" onclick="event.stopPropagation();renameCCNScenario('+i+')" title="Renombrar">✏</span>' : '')+
    '</button>';
  }).join('')+
  '<button class="px-2 py-1 text-xs text-gray-400 hover:text-gray-600 rounded-t border-x border-t border-transparent hover:bg-gray-100 ml-1" onclick="addCCNScenario()" title="Nuevo escenario vacío">+ Nuevo</button>'+
  '<button class="px-2 py-1 text-xs text-gray-400 hover:text-gray-600 rounded-t border-x border-t border-transparent hover:bg-gray-100" onclick="duplicateCCNScenario()" title="Duplicar escenario actual con sus candidatos">⧉ Copiar</button>';
}

function addCCNScenario() {
  const n = state.ccn.escenarios.length + 1;
  const ctx = getContext('ccn');
  state.ccn.escenarios.push({ nombre: 'Escenario '+n, pactos: ctx.pactos.slice(), candidatos: [] });
  state.ccn.escenarioActivo = state.ccn.escenarios.length - 1;
  renderCCNScenarios(); renderCCNPactos(); renderCCNCandidatos(); saveState();
  document.getElementById('ccn-resultado-output').classList.add('hidden');
}

function deleteCCNScenario(idx) {
  if (state.ccn.escenarios.length <= 1) return;
  if (!confirm('¿Eliminar escenario "'+state.ccn.escenarios[idx].nombre+'"?')) return;
  state.ccn.escenarios.splice(idx, 1);
  state.ccn.escenarioActivo = Math.min(state.ccn.escenarioActivo || 0, state.ccn.escenarios.length - 1);
  renderCCNScenarios(); renderCCNPactos(); renderCCNCandidatos(); saveState();
}

function switchCCNScenario(idx) {
  state.ccn.escenarioActivo = idx;
  renderCCNScenarios(); renderCCNPactos(); renderCCNCandidatos(); saveState();
  document.getElementById('ccn-resultado-output').classList.add('hidden');
}

function renameCCNScenario(idx) {
  const name = prompt('Nombre del escenario:', state.ccn.escenarios[idx].nombre);
  if (name === null || !name.trim()) return;
  state.ccn.escenarios[idx].nombre = name.trim();
  renderCCNScenarios(); saveState();
}

function duplicateCCNScenario() {
  const src = JSON.parse(JSON.stringify(getContext('ccn')));
  src.nombre = src.nombre + ' (copia)';
  src.candidatos.forEach(function(c){ c.id = newId(); });
  state.ccn.escenarios.push(src);
  state.ccn.escenarioActivo = state.ccn.escenarios.length - 1;
  renderCCNScenarios(); renderCCNPactos(); renderCCNCandidatos(); saveState();
  document.getElementById('ccn-resultado-output').classList.add('hidden');
}
```

- [ ] **Commit**
```bash
git add index.html && git commit -m "feat: funciones de escenarios CCN (mirror de CCR)"
```

---

### Task 10: HTML — CCN tabs + cruz config

**Files:**
- Modify: `index.html` (sección HTML de CCN, líneas ~60–95)

- [ ] **Agregar div de escenarios tabs antes de `overflow-x-auto` en panel CCN**

Buscar en el HTML (panel CCN):
```html
        <div class="overflow-x-auto">
          <div id="ccn-cands-header"
```
Insertar antes:
```html
        <div id="ccn-escenarios-tabs" class="flex items-end gap-0.5 mb-0 border-b border-gray-200"></div>
        <div class="overflow-x-auto pt-2">
          <div id="ccn-cands-header"
```
Y cerrar el `overflow-x-auto` que envuelve la lista de candidatos CCN correctamente (verificar que el `</div>` cierre esta nueva envoltura).

- [ ] **Agregar div de cruz config CCN — buscar en HTML el bloque de CCN add-form, insertar antes del input de nombre**

Buscar en el HTML del panel CCN donde aparece `ccr-cruz-config` como referencia. En panel CCN, insertar:
```html
        <div id="ccn-cruz-config" class="flex items-center gap-1 flex-wrap text-xs text-gray-400 mb-2"></div>
```
Justo antes del bloque `<div class="relative mb-2">` que contiene `ccn-nombre`.

- [ ] **Commit**
```bash
git add index.html && git commit -m "feat: HTML CCN - tabs de escenarios y config de cruces"
```

---

### Task 11: Init — conectar todo

**Files:**
- Modify: `index.html` (bloque `// ── Init`, líneas ~1530–1560)

- [ ] **Reemplazar el bloque init de cruce (el que llama `updateCandRowStyle`, `renderCruzConfig`, etc.)**

El bloque actual es:
```js
updateCandRowStyle();
renderCruzConfig();
renderCandHeader('ccn-cands-header');
renderCandHeader('ccr-cands-header');
renderCruzAddInputs('ccn');
renderCruzAddInputs('ccr');
```

Reemplazar por:
```js
// CCN grid + config
updateCandRowStyle('ccn', state.ccn.cruzNames);
renderCruzConfig('ccn-cruz-config', state.ccn.cruzNames, 'ccn');
renderCandHeader('ccn-cands-header', state.ccn.cruzNames);
renderCruzAddInputs('ccn', state.ccn.cruzNames);
renderCCNScenarios();
// CCR grid + config
updateCandRowStyle('ccr', state.ccrCruzNames);
renderCruzConfig('ccr-cruz-config', state.ccrCruzNames, 'ccr');
renderCandHeader('ccr-cands-header', state.ccrCruzNames);
renderCruzAddInputs('ccr', state.ccrCruzNames);
// Dir grid (headers/add-inputs se renderizan en buildDireccionPanel)
updateCandRowStyle('direccion', state.direccion.cruzNames);
```

- [ ] **Agregar `renderCCNScenarios()` en el bloque init de CCN** (si no está ya por el paso anterior)

- [ ] **Commit + push final**
```bash
git add index.html && git commit -m "feat: init conecta CCN escenarios + cruces independientes por sección"
git push
```

---

### Task 12: Verificación en browser

- [ ] Abrir la app en el browser
- [ ] CCN: verificar que aparecen pestañas de escenarios (+ Nuevo, ⧉ Copiar, ✏ renombrar, × eliminar)
- [ ] CCN: agregar columna de cruce → verificar que NO aparece en CCR
- [ ] CCR: eliminar columna de cruce → verificar que NO afecta CCN
- [ ] Dirección: agregar/eliminar cruce → independiente de CCN y CCR
- [ ] Editar valor de cruce en candidato → verificar que el total de fila y la sumatoria de columna se actualizan
- [ ] Recargar página → verificar que los datos (escenarios, cruzNames por sección) persisten correctamente
- [ ] Verificar migración: si hay datos guardados con formato viejo (`cruzNames` global), deben cargarse correctamente en las tres secciones
