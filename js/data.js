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
function emptyContext() {
  return { pactos: [], candidatos: [] };
}

export const state = {
  ccn: emptyContext(),
  ccr: Object.fromEntries(REGIONES.map(r => [r.id, emptyContext()])),
  ccrRegionActiva: REGIONES[0].id,
};

export function getContext(tipo, regionId = null) {
  if (tipo === 'ccn') return state.ccn;
  return state.ccr[regionId ?? state.ccrRegionActiva];
}

let nextId = 1;
export function newId() { return nextId++; }
