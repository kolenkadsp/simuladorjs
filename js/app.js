// js/app.js
import { REGIONES, state } from './data.js';
import {
  addCCNPacto, removeCCNPacto, renderCCNPactos,
  addCCNCandidato, removeCCNCandidato, renderCCNCandidatos, calcularCCN,
  initCCR, actualizarCCRRegion,
  addCCRPacto, removeCCRPacto,
  addCCRCandidato, removeCCRCandidato,
  calcularCCR, renderResumenNacionalCCR,
} from './ui.js';

// Helpers globales para onclick en HTML dinámico
window._removeCCNPacto     = removeCCNPacto;
window._removeCCNCandidato = removeCCNCandidato;
window._removeCCRPacto     = (regionId, nombre) => removeCCRPacto(regionId, nombre);
window._removeCCRCandidato = (regionId, id) => removeCCRCandidato(regionId, id);

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
