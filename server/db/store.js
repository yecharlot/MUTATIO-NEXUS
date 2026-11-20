/**
 * Persistencia JSON en disco (sin módulos nativos — compatible con Render free).
 */
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const DATA_DIR = process.env.MUTATIO_DATA_DIR || path.join(process.cwd(), 'data');
const DB_FILE = () => path.join(DATA_DIR, 'mutatio.json');

let memory = null;

function ensureDir(d) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

function emptyDb() {
  return {
    users: [], worlds: [], events: [], proposals: [], votes: [],
    cbn_accounts: [], cbn_ledger: [], posts: [], comments: [], idempotency: [],
  };
}

function load() {
  ensureDir(DATA_DIR);
  if (!fs.existsSync(DB_FILE())) {
    memory = emptyDb();
    save();
    return memory;
  }
  memory = JSON.parse(fs.readFileSync(DB_FILE(), 'utf8'));
  for (const k of Object.keys(emptyDb())) {
    if (!Array.isArray(memory[k])) memory[k] = [];
  }
  return memory;
}

function save() {
  ensureDir(DATA_DIR);
  fs.writeFileSync(DB_FILE(), JSON.stringify(memory));
}

function init() {
  if (!memory) load();
  return memory;
}

function now() { return new Date().toISOString(); }
function newId() { return uuidv4(); }

function get(sql, params = []) {
  init();
  if (/FROM users WHERE username/i.test(sql)) return memory.users.find((u) => u.username === params[0]);
  if (/FROM users WHERE id/i.test(sql)) {
    const u = memory.users.find((x) => x.id === params[0]);
    if (!u) return null;
    if (/SELECT id, username/.test(sql)) {
      return { id: u.id, username: u.username, display_name: u.display_name, community: u.community, reputation: u.reputation, created_at: u.created_at };
    }
    return u;
  }
  if (/FROM worlds WHERE id/i.test(sql)) return memory.worlds.find((w) => w.id === params[0]);
  if (/FROM cbn_accounts WHERE user_id/i.test(sql)) return memory.cbn_accounts.find((a) => a.user_id === params[0]);
  if (/FROM proposals WHERE id/i.test(sql)) return memory.proposals.find((p) => p.id === params[0]);
  return null;
}

function all(sql, params = []) {
  init();
  if (/FROM events WHERE world_id/i.test(sql))
    return memory.events.filter((e) => e.world_id === params[0]).sort((a, b) => (a.created_at < b.created_at ? 1 : -1)).slice(0, 30);
  if (/FROM proposals WHERE world_id/i.test(sql))
    return memory.proposals.filter((p) => p.world_id === params[0]).sort((a, b) => (a.created_at < b.created_at ? 1 : -1)).slice(0, 40);
  if (/FROM posts WHERE world_id/i.test(sql))
    return memory.posts.filter((p) => p.world_id === params[0]).sort((a, b) => (a.created_at < b.created_at ? 1 : -1)).slice(0, 40);
  if (/FROM comments WHERE post_id/i.test(sql))
    return memory.comments.filter((c) => c.post_id === params[0]).sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
  if (/FROM cbn_ledger WHERE user_id/i.test(sql))
    return memory.cbn_ledger.filter((l) => l.user_id === params[0]).sort((a, b) => (a.created_at < b.created_at ? 1 : -1)).slice(0, 50);
  return [];
}

function run(sql, params = []) {
  init();
  if (/INSERT INTO users/i.test(sql)) {
    if (memory.users.some((u) => u.username === params[1])) throw new Error('UNIQUE');
    memory.users.push({ id: params[0], username: params[1], display_name: params[2], password_hash: params[3], community: params[4], reputation: params[5], created_at: params[6] });
    save(); return;
  }
  if (/INSERT INTO cbn_accounts/i.test(sql)) { memory.cbn_accounts.push({ user_id: params[0], balance: params[1] }); save(); return; }
  if (/INSERT INTO cbn_ledger/i.test(sql)) {
    memory.cbn_ledger.push({ id: params[0], user_id: params[1], delta: params[2], reason: params[3], ref_type: params[4], ref_id: params[5], created_at: params[6] });
    save(); return;
  }
  if (/INSERT INTO worlds/i.test(sql)) {
    memory.worlds.push({ id: params[0], universe: params[1], name: params[2], slug: params[3], config_json: params[4], state_json: params[5], updated_at: params[6] });
    save(); return;
  }
  if (/UPDATE worlds SET state_json/i.test(sql)) {
    const w = memory.worlds.find((x) => x.id === params[2]);
    if (w) { w.state_json = params[0]; w.updated_at = params[1]; save(); }
    return;
  }
  if (/INSERT INTO events/i.test(sql)) {
    memory.events.push({ id: params[0], world_id: params[1], kind: params[2], title: params[3], body: params[4], payload_json: params[5], created_at: params[6] });
    save(); return;
  }
  if (/INSERT INTO posts/i.test(sql)) {
    memory.posts.push({ id: params[0], world_id: params[1], author_id: params[2], event_id: params[3], title: params[4], body: params[5], created_at: params[6] });
    save(); return;
  }
  if (/INSERT INTO proposals/i.test(sql)) {
    memory.proposals.push({ id: params[0], world_id: params[1], event_id: params[2], author_id: params[3], title: params[4], body: params[5], action_key: params[6], status: 'open', votes_for: 0, votes_against: 0, created_at: params[7] });
    save(); return;
  }
  if (/INSERT INTO votes/i.test(sql)) {
    if (memory.votes.some((v) => v.proposal_id === params[1] && v.user_id === params[2])) throw new Error('UNIQUE');
    memory.votes.push({ id: params[0], proposal_id: params[1], user_id: params[2], value: params[3], created_at: params[4] });
    save(); return;
  }
  if (/UPDATE proposals SET votes_for/i.test(sql)) {
    const p = memory.proposals.find((x) => x.id === params[0]);
    if (p) p.votes_for += 1; save(); return;
  }
  if (/UPDATE proposals SET votes_against/i.test(sql)) {
    const p = memory.proposals.find((x) => x.id === params[0]);
    if (p) p.votes_against += 1; save(); return;
  }
  if (/UPDATE proposals SET status/i.test(sql)) {
    const m = sql.match(/status\s*=\s*'([^']+)'/i);
    const status = m ? m[1] : params[0];
    const id = m ? params[0] : params[1];
    const p = memory.proposals.find((x) => x.id === id);
    if (p) p.status = status;
    save(); return;
  }
  if (/UPDATE cbn_accounts SET balance/i.test(sql)) {
    const a = memory.cbn_accounts.find((x) => x.user_id === params[1]);
    if (a) a.balance = params[0];
    save(); return;
  }
  if (/UPDATE users SET reputation/i.test(sql)) {
    const u = memory.users.find((x) => x.id === params[0]);
    if (u) u.reputation += 3;
    save(); return;
  }
  if (/INSERT INTO comments/i.test(sql)) {
    memory.comments.push({ id: params[0], post_id: params[1], author_id: params[2], body: params[3], created_at: params[4] });
    save(); return;
  }
}

module.exports = { init, run, get, all, now, newId, DATA_DIR, mode: () => 'json' };
