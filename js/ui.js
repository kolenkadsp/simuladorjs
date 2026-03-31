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
    electo:  '<span class="badge-electo">✓ Electo</span>',
    paridad: '<span class="badge-paridad">★ Paridad</span>',
    sorteo:  '<span class="badge-sorteo">🎲 Sorteo</span>',
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
  if (ctx.candidatos.some(c => c.pacto === nombre)) return;
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
      output.appendChild(renderDhondtTable(dhondt, ctx.pactos, CCN_CUPOS));
    }

    const paridad = aplicarParidadCCN(dhondt.electos, dhondt.noElectos);

    if (paridad.imposible) {
      output.appendChild(renderBanner('⚠ No es posible alcanzar la paridad con los candidatos ingresados.', 'err'));
    } else if (paridad.corregido) {
      output.appendChild(renderBanner('Se aplicó corrección de paridad (art. 76–77a)', 'warn'));
    }

    output.appendChild(renderElectos(paridad.electos, false));
    output.appendChild(renderIndicadorParidad(paridad.electos, CCN_CUPOS));
  });
}

// ── Render compartido ────────────────────────────────────────────────────────

export function renderDhondtTable(dhondt, pactos, N) {
  const { cocientes, cuposPorPacto, cifraRepartidora } = dhondt;
  const ganadores = new Set();

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

    output.appendChild(renderElectos(paridad.electos, true));
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
