const store = require('../db/store');
const rules = require('./rules');
const bcrypt = require('bcryptjs');

const WORLD_SLUG = 'cuba-legado';
const WORLD_ID = 'world-cuba-nexus';

function ensureSeed() {
  store.init();
  let world = store.get('SELECT * FROM worlds WHERE id = ?', [WORLD_ID]);
  if (!world) {
    const state = rules.initialWorldState();
    const config = {
      communities: rules.COMMUNITIES,
      actions: Object.keys(rules.ACTIONS),
      regions: rules.REGIONS,
    };
    store.run(
      `INSERT INTO worlds (id, universe, name, slug, config_json, state_json, updated_at) VALUES (?,?,?,?,?,?,?)`,
      [
        WORLD_ID,
        'NEXUS',
        'Cuba — El legado de la isla',
        WORLD_SLUG,
        JSON.stringify(config),
        JSON.stringify(state),
        store.now(),
      ]
    );
    for (const ev of rules.INITIAL_EVENTS) {
      const id = store.newId();
      store.run(
        `INSERT INTO events (id, world_id, kind, title, body, payload_json, created_at) VALUES (?,?,?,?,?,?,?)`,
        [
          id,
          WORLD_ID,
          ev.kind,
          ev.title,
          ev.body,
          JSON.stringify({ suggestedActions: ev.suggestedActions }),
          store.now(),
        ]
      );
      store.run(
        `INSERT INTO posts (id, world_id, author_id, event_id, title, body, created_at) VALUES (?,?,?,?,?,?,?)`,
        [store.newId(), WORLD_ID, null, id, ev.title, ev.body, store.now()]
      );
    }
  }
}

function getWorld() {
  ensureSeed();
  const w = store.get('SELECT * FROM worlds WHERE id = ?', [WORLD_ID]);
  return {
    id: w.id,
    universe: w.universe,
    name: w.name,
    slug: w.slug,
    config: JSON.parse(w.config_json),
    state: JSON.parse(w.state_json),
    updatedAt: w.updated_at,
  };
}

function saveWorldState(state) {
  store.run(`UPDATE worlds SET state_json = ?, updated_at = ? WHERE id = ?`, [
    JSON.stringify(state),
    store.now(),
    WORLD_ID,
  ]);
}

function registerUser({ username, password, displayName, community }) {
  ensureSeed();
  const u = (username || '').trim().toLowerCase();
  if (u.length < 3) throw Object.assign(new Error('Usuario demasiado corto'), { code: 400 });
  if (!password || password.length < 6) throw Object.assign(new Error('Clave mínima 6 caracteres'), { code: 400 });
  const allowed = Object.keys(rules.COMMUNITIES);
  const com = allowed.includes(community) ? community : 'cientificos';
  const id = store.newId();
  const hash = bcrypt.hashSync(password, 10);
  try {
    store.run(
      `INSERT INTO users (id, username, display_name, password_hash, community, reputation, created_at) VALUES (?,?,?,?,?,?,?)`,
      [id, u, displayName || u, hash, com, 0, store.now()]
    );
  } catch (e) {
    throw Object.assign(new Error('Usuario ya existe'), { code: 409 });
  }
  store.run(`INSERT INTO cbn_accounts (user_id, balance) VALUES (?, ?)`, [id, 100]);
  store.run(
    `INSERT INTO cbn_ledger (id, user_id, delta, reason, ref_type, ref_id, created_at) VALUES (?,?,?,?,?,?,?)`,
    [store.newId(), id, 100, 'dotacion_inicial', 'system', null, store.now()]
  );
  return getUserPublic(id);
}

function authenticate(username, password) {
  const u = store.get(`SELECT * FROM users WHERE username = ?`, [(username || '').trim().toLowerCase()]);
  if (!u || !bcrypt.compareSync(password, u.password_hash)) {
    throw Object.assign(new Error('Credenciales inválidas'), { code: 401 });
  }
  return getUserPublic(u.id);
}

function getUserPublic(id) {
  const u = store.get(`SELECT id, username, display_name, community, reputation, created_at FROM users WHERE id = ?`, [
    id,
  ]);
  if (!u) return null;
  const acc = store.get(`SELECT balance FROM cbn_accounts WHERE user_id = ?`, [id]);
  return {
    id: u.id,
    username: u.username,
    displayName: u.display_name,
    community: u.community,
    reputation: u.reputation,
    cbn: acc ? acc.balance : 0,
    createdAt: u.created_at,
  };
}

function cbnLedger(userId) {
  return store.all(
    `SELECT id, delta, reason, ref_type, ref_id, created_at FROM cbn_ledger WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
    [userId]
  );
}

function changeCbn(userId, delta, reason, refType, refId) {
  const acc = store.get(`SELECT balance FROM cbn_accounts WHERE user_id = ?`, [userId]);
  if (!acc) throw new Error('Cuenta CBN inexistente');
  const next = acc.balance + delta;
  if (next < 0) throw Object.assign(new Error('Saldo CBN insuficiente'), { code: 400 });
  store.run(`UPDATE cbn_accounts SET balance = ? WHERE user_id = ?`, [next, userId]);
  store.run(
    `INSERT INTO cbn_ledger (id, user_id, delta, reason, ref_type, ref_id, created_at) VALUES (?,?,?,?,?,?,?)`,
    [store.newId(), userId, delta, reason, refType || null, refId || null, store.now()]
  );
  return next;
}

function listEvents() {
  ensureSeed();
  return store.all(`SELECT * FROM events WHERE world_id = ? ORDER BY created_at DESC LIMIT 30`, [WORLD_ID]).map((e) => ({
    id: e.id,
    kind: e.kind,
    title: e.title,
    body: e.body,
    payload: JSON.parse(e.payload_json || '{}'),
    createdAt: e.created_at,
  }));
}

function listProposals() {
  return store
    .all(`SELECT * FROM proposals WHERE world_id = ? ORDER BY created_at DESC LIMIT 40`, [WORLD_ID])
    .map((p) => ({
      id: p.id,
      eventId: p.event_id,
      authorId: p.author_id,
      title: p.title,
      body: p.body,
      actionKey: p.action_key,
      status: p.status,
      votesFor: p.votes_for,
      votesAgainst: p.votes_against,
      createdAt: p.created_at,
    }));
}

function createProposal(userId, { title, body, actionKey, eventId }) {
  if (!rules.ACTIONS[actionKey]) throw Object.assign(new Error('Acción no válida'), { code: 400 });
  const id = store.newId();
  store.run(
    `INSERT INTO proposals (id, world_id, event_id, author_id, title, body, action_key, status, votes_for, votes_against, created_at)
     VALUES (?,?,?,?,?,?,?,'open',0,0,?)`,
    [id, WORLD_ID, eventId || null, userId, title || rules.ACTIONS[actionKey].title, body || '', actionKey, store.now()]
  );
  changeCbn(userId, -2, 'coste_propuesta', 'proposal', id);
  return listProposals().find((p) => p.id === id);
}

function vote(userId, proposalId, value) {
  const v = value === -1 ? -1 : 1;
  const p = store.get(`SELECT * FROM proposals WHERE id = ?`, [proposalId]);
  if (!p || p.status !== 'open') throw Object.assign(new Error('Propuesta no abierta'), { code: 400 });
  try {
    store.run(`INSERT INTO votes (id, proposal_id, user_id, value, created_at) VALUES (?,?,?,?,?)`, [
      store.newId(),
      proposalId,
      userId,
      v,
      store.now(),
    ]);
  } catch {
    throw Object.assign(new Error('Ya votaste esta propuesta'), { code: 409 });
  }
  if (v === 1) store.run(`UPDATE proposals SET votes_for = votes_for + 1 WHERE id = ?`, [proposalId]);
  else store.run(`UPDATE proposals SET votes_against = votes_against + 1 WHERE id = ?`, [proposalId]);
  changeCbn(userId, 1, 'recompensa_voto', 'vote', proposalId);
  return store.get(`SELECT * FROM proposals WHERE id = ?`, [proposalId]);
}

function resolveProposal(userId, proposalId) {
  const p = store.get(`SELECT * FROM proposals WHERE id = ?`, [proposalId]);
  if (!p || p.status !== 'open') throw Object.assign(new Error('Propuesta no resoluble'), { code: 400 });
  if (p.votes_for + p.votes_against < 1) {
    throw Object.assign(new Error('Se necesita al menos un voto'), { code: 400 });
  }
  const approved = p.votes_for >= p.votes_against;
  if (!approved) {
    store.run(`UPDATE proposals SET status = 'rejected' WHERE id = ?`, [proposalId]);
    const evId = store.newId();
    store.run(
      `INSERT INTO events (id, world_id, kind, title, body, payload_json, created_at) VALUES (?,?,?,?,?,?,?)`,
      [
        evId,
        WORLD_ID,
        'resolution',
        `Rechazada: ${p.title}`,
        'La comunidad no reunió apoyo suficiente.',
        JSON.stringify({ proposalId, approved: false }),
        store.now(),
      ]
    );
    return { approved: false, proposalId };
  }

  const action = rules.ACTIONS[p.action_key];
  const world = getWorld();
  // Coste CBN del autor al resolver (además del coste de proponer)
  try {
    changeCbn(p.author_id, -action.costCbn, `ejecucion_${p.action_key}`, 'proposal', proposalId);
  } catch (e) {
    store.run(`UPDATE proposals SET status = 'failed_funds' WHERE id = ?`, [proposalId]);
    throw Object.assign(new Error('El autor no tiene CBN suficiente para ejecutar'), { code: 400 });
  }

  let result;
  try {
    result = rules.applyAction(world.state, p.action_key);
  } catch (e) {
    // reembolso parcial del coste de ejecución
    changeCbn(p.author_id, action.costCbn, 'reembolso_fallo_requisitos', 'proposal', proposalId);
    throw e;
  }

  saveWorldState(result.state);
  store.run(`UPDATE proposals SET status = 'passed' WHERE id = ?`, [proposalId]);
  store.run(`UPDATE users SET reputation = reputation + 3 WHERE id = ?`, [p.author_id]);
  changeCbn(p.author_id, 5, 'recompensa_resolucion', 'proposal', proposalId);

  const evId = store.newId();
  const riskNote = result.riskHit ? ' El riesgo se materializó parcialmente.' : ' La ejecución fue estable.';
  store.run(
    `INSERT INTO events (id, world_id, kind, title, body, payload_json, created_at) VALUES (?,?,?,?,?,?,?)`,
    [
      evId,
      WORLD_ID,
      'resolution',
      `Aprobada: ${p.title}`,
      `${action.description}${riskNote}`,
      JSON.stringify({
        proposalId,
        approved: true,
        actionKey: p.action_key,
        riskHit: result.riskHit,
        resources: result.state.resources,
        indicators: result.state.indicators,
      }),
      store.now(),
    ]
  );
  store.run(
    `INSERT INTO posts (id, world_id, author_id, event_id, title, body, created_at) VALUES (?,?,?,?,?,?,?)`,
    [
      store.newId(),
      WORLD_ID,
      p.author_id,
      evId,
      `Decisión colectiva: ${p.title}`,
      `${action.description}${riskNote} Los indicadores del mapa se han actualizado.`,
      store.now(),
    ]
  );

  return { approved: true, riskHit: result.riskHit, state: result.state, eventId: evId };
}

function listPosts() {
  return store.all(`SELECT * FROM posts WHERE world_id = ? ORDER BY created_at DESC LIMIT 40`, [WORLD_ID]).map((p) => ({
    id: p.id,
    title: p.title,
    body: p.body,
    eventId: p.event_id,
    authorId: p.author_id,
    createdAt: p.created_at,
  }));
}

function addComment(userId, postId, body) {
  if (!body || body.length < 2) throw Object.assign(new Error('Comentario vacío'), { code: 400 });
  const id = store.newId();
  store.run(`INSERT INTO comments (id, post_id, author_id, body, created_at) VALUES (?,?,?,?,?)`, [
    id,
    postId,
    userId,
    body.slice(0, 1000),
    store.now(),
  ]);
  changeCbn(userId, 1, 'recompensa_comentario', 'comment', id);
  return { id, postId, body, createdAt: store.now() };
}

function listComments(postId) {
  return store.all(`SELECT * FROM comments WHERE post_id = ? ORDER BY created_at ASC`, [postId]);
}

function catalog() {
  return {
    communities: rules.COMMUNITIES,
    actions: rules.ACTIONS,
    resources: rules.RESOURCE_KEYS,
    indicators: rules.INDICATOR_KEYS,
  };
}

module.exports = {
  ensureSeed,
  getWorld,
  registerUser,
  authenticate,
  getUserPublic,
  cbnLedger,
  listEvents,
  listProposals,
  createProposal,
  vote,
  resolveProposal,
  listPosts,
  addComment,
  listComments,
  catalog,
  WORLD_SLUG,
};
