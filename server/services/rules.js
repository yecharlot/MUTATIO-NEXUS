/**
 * Reglas económicas y de resolución centralizadas (servidor).
 * El cliente NUNCA decide costes ni efectos.
 */

const COMMUNITIES = {
  cientificos: {
    id: 'cientificos',
    name: 'Científicos',
    focus: 'investigación, tecnología e innovación',
    color: '#5ec8ff',
  },
  constructores: {
    id: 'constructores',
    name: 'Constructores',
    focus: 'infraestructura, producción y desarrollo',
    color: '#f0b429',
  },
  guardianes: {
    id: 'guardianes',
    name: 'Guardianes',
    focus: 'protección territorial, recursos y estabilidad',
    color: '#3dd68c',
  },
};

const RESOURCE_KEYS = ['energia', 'alimentos', 'materiales', 'conocimiento', 'influencia'];

const INDICATOR_KEYS = [
  'estabilidad_economica',
  'seguridad_alimentaria',
  'disponibilidad_energetica',
  'infraestructura',
  'confianza_social',
  'desarrollo_tecnologico',
];

/** Acciones votables: coste CBN, requisitos de recursos, efectos sobre recursos e indicadores */
const ACTIONS = {
  inversion_solar: {
    key: 'inversion_solar',
    title: 'Inversión en micro-redes solares',
    description: 'Desplegar generación distribuida en la región occidental.',
    costCbn: 15,
    requires: { materiales: 8, conocimiento: 5 },
    effects: {
      resources: { energia: 12, materiales: -8, conocimiento: -3 },
      indicators: { disponibilidad_energetica: 8, desarrollo_tecnologico: 4, estabilidad_economica: 2 },
    },
    risk: 0.15,
    riskEffects: { resources: { materiales: -4 }, indicators: { confianza_social: -3 } },
  },
  plan_agricola: {
    key: 'plan_agricola',
    title: 'Plan agrícola de resiliencia',
    description: 'Priorizar cultivos de ciclo corto y almacenamiento comunitario.',
    costCbn: 12,
    requires: { alimentos: 3, influencia: 4 },
    effects: {
      resources: { alimentos: 14, influencia: -4, energia: -2 },
      indicators: { seguridad_alimentaria: 10, confianza_social: 3 },
    },
    risk: 0.1,
    riskEffects: { resources: { alimentos: -5 }, indicators: { seguridad_alimentaria: -4 } },
  },
  reparar_infra: {
    key: 'reparar_infra',
    title: 'Reparación de infraestructuras críticas',
    description: 'Puentes, almacenes y nodos logísticos deteriorados.',
    costCbn: 18,
    requires: { materiales: 12, energia: 4 },
    effects: {
      resources: { materiales: -12, energia: -4, influencia: 2 },
      indicators: { infraestructura: 12, estabilidad_economica: 5 },
    },
    risk: 0.12,
    riskEffects: { indicators: { infraestructura: -2, confianza_social: -2 } },
  },
  cooperacion_territorial: {
    key: 'cooperacion_territorial',
    title: 'Pacto de cooperación entre territorios',
    description: 'Compartir excedentes y rutas entre comunidades.',
    costCbn: 10,
    requires: { influencia: 6 },
    effects: {
      resources: { influencia: -6, alimentos: 3, energia: 3 },
      indicators: { confianza_social: 8, estabilidad_economica: 4 },
    },
    risk: 0.08,
    riskEffects: { indicators: { confianza_social: -5 } },
  },
  exploracion_arqueologica: {
    key: 'exploracion_arqueologica',
    title: 'Expedición a formaciones submarinas',
    description: 'Investigar señales geométricas frente a Guanahacabibes sin afirmar orígenes.',
    costCbn: 20,
    requires: { conocimiento: 10, energia: 6, influencia: 5 },
    effects: {
      resources: { conocimiento: 15, energia: -6, influencia: -5 },
      indicators: { desarrollo_tecnologico: 6, confianza_social: 2 },
    },
    risk: 0.25,
    riskEffects: { resources: { energia: -4, conocimiento: -3 }, indicators: { confianza_social: -4 } },
    narrativeFlags: ['mystery_progress'],
  },
  laboratorio_abierto: {
    key: 'laboratorio_abierto',
    title: 'Laboratorio abierto de evidencia',
    description: 'Publicar hallazgos como hipótesis, no como certezas.',
    costCbn: 14,
    requires: { conocimiento: 8 },
    effects: {
      resources: { conocimiento: 6, influencia: 5 },
      indicators: { desarrollo_tecnologico: 5, confianza_social: 4 },
    },
    risk: 0.05,
    riskEffects: {},
    narrativeFlags: ['open_science'],
  },
  racionar_energia: {
    key: 'racionar_energia',
    title: 'Protocolo de racionamiento energético',
    description: 'Reducir consumo para evitar colapso de la red.',
    costCbn: 5,
    requires: {},
    effects: {
      resources: { energia: 6, influencia: -3 },
      indicators: { disponibilidad_energetica: 5, confianza_social: -4, estabilidad_economica: -2 },
    },
    risk: 0.05,
    riskEffects: { indicators: { confianza_social: -3 } },
  },
};

const INITIAL_EVENTS = [
  {
    kind: 'crisis',
    title: 'Crisis energética en el occidente',
    body: 'La red intermitente amenaza hospitales y cadena de frío. Hay que decidir si invertir, racionar o cooperar.',
    suggestedActions: ['inversion_solar', 'racionar_energia', 'cooperacion_territorial'],
  },
  {
    kind: 'crisis',
    title: 'Escasez de alimentos en el oriente',
    body: 'Retrasos logísticos y mal clima reducen reservas. El plan agrícola y la cooperación están sobre la mesa.',
    suggestedActions: ['plan_agricola', 'cooperacion_territorial'],
  },
  {
    kind: 'infra',
    title: 'Deterioro de infraestructuras costeras',
    body: 'Almacenes y vías secundarias se degradan. Reparar cuesta materiales; no hacerlo eleva el riesgo sistémico.',
    suggestedActions: ['reparar_infra', 'cooperacion_territorial'],
  },
  {
    kind: 'mystery',
    title: 'Señales bajo el mar frente a Guanahacabibes',
    body: 'Formaciones geométricas detectadas por sonar. Nadie ha demostrado origen artificial. La expedición es costosa y arriesgada; el laboratorio abierto permite debatir sin cerrar el misterio.',
    suggestedActions: ['exploracion_arqueologica', 'laboratorio_abierto'],
  },
  {
    kind: 'opportunity',
    title: 'Oportunidad de inversión regional',
    body: 'Un fondo externo ofrece apoyo condicionado a estabilidad y transparencia de proyectos colectivos.',
    suggestedActions: ['inversion_solar', 'laboratorio_abierto', 'plan_agricola'],
  },
];

const REGIONS = [
  { id: 'occidente', name: 'Occidente', x: 1, y: 2 },
  { id: 'habana', name: 'La Habana', x: 2, y: 2 },
  { id: 'centro', name: 'Centro', x: 3, y: 2 },
  { id: 'oriente', name: 'Oriente', x: 5, y: 2 },
  { id: 'guanahacabibes', name: 'Guanahacabibes', x: 0, y: 2 },
  { id: 'sur', name: 'Sur insular', x: 3, y: 3 },
];

function clamp(n, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function initialWorldState() {
  const resources = {
    energia: 42,
    alimentos: 48,
    materiales: 40,
    conocimiento: 35,
    influencia: 38,
  };
  const indicators = {
    estabilidad_economica: 45,
    seguridad_alimentaria: 50,
    disponibilidad_energetica: 40,
    infraestructura: 44,
    confianza_social: 52,
    desarrollo_tecnologico: 38,
  };
  const regions = REGIONS.map((r) => ({
    ...r,
    mood: 'tenso',
    energy: resources.energia,
    food: resources.alimentos,
  }));
  return {
    turn: 1,
    resources,
    indicators,
    regions,
    mystery: {
      evidence: 0,
      interpretation: 'indeterminada',
      notes: [
        'Hallazgos de ocre en cuevas sumergidas de Yucatán inspiran hipótesis, no pruebas sobre Cuba.',
        'Sonar en Guanahacabibes: geometrías no confirmadas como artificiales.',
      ],
    },
    flags: {},
  };
}

function applyAction(state, actionKey, rng = Math.random) {
  const action = ACTIONS[actionKey];
  if (!action) throw new Error('Acción desconocida');

  for (const [k, need] of Object.entries(action.requires || {})) {
    if ((state.resources[k] || 0) < need) {
      const err = new Error(`Recursos insuficientes: se requieren ${need} de ${k}`);
      err.code = 'INSUFFICIENT_RESOURCES';
      throw err;
    }
  }

  const next = JSON.parse(JSON.stringify(state));
  const riskHit = rng() < (action.risk || 0);

  const applyMap = (target, map, sign = 1) => {
    if (!map) return;
    for (const [k, v] of Object.entries(map)) {
      if (target[k] === undefined) target[k] = 0;
      target[k] = clamp(target[k] + sign * v, k.includes('indicador') ? 0 : 0, 100);
      if (RESOURCE_KEYS.includes(k)) target[k] = clamp(target[k], 0, 200);
    }
  };

  applyMap(next.resources, action.effects.resources);
  applyMap(next.indicators, action.effects.indicators);

  if (riskHit && action.riskEffects) {
    applyMap(next.resources, action.riskEffects.resources);
    applyMap(next.indicators, action.riskEffects.indicators);
  }

  if (action.narrativeFlags?.includes('mystery_progress')) {
    next.mystery.evidence = clamp(next.mystery.evidence + (riskHit ? 4 : 12), 0, 100);
    if (next.mystery.evidence >= 40 && next.mystery.interpretation === 'indeterminada') {
      next.mystery.interpretation = 'hipotesis_abierta';
      next.mystery.notes.push('Nuevos datos aumentan el debate; la interpretación sigue abierta.');
    }
  }
  if (action.narrativeFlags?.includes('open_science')) {
    next.mystery.notes.push('Se publica un informe de hipótesis concurrentes sin cerrar el caso.');
    next.flags.open_science = true;
  }

  next.turn = (next.turn || 1) + 1;
  next.regions = (next.regions || REGIONS).map((r) => {
    const energy = next.resources.energia;
    const food = next.resources.alimentos;
    let mood = 'estable';
    if (energy < 30 || food < 30) mood = 'crisis';
    else if (energy < 45 || food < 45) mood = 'tenso';
    else if (next.indicators.confianza_social > 65) mood = 'esperanza';
    return { ...r, mood, energy, food };
  });

  return { state: next, riskHit, action };
}

module.exports = {
  COMMUNITIES,
  RESOURCE_KEYS,
  INDICATOR_KEYS,
  ACTIONS,
  INITIAL_EVENTS,
  REGIONS,
  initialWorldState,
  applyAction,
  clamp,
};
