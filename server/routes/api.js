const express = require('express');
const game = require('../services/game');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'mutatio-nexus',
    universe: 'NEXUS',
    world: 'cuba-legado',
    time: new Date().toISOString(),
  });
});

router.get('/v1/catalog', (_req, res) => {
  res.json(game.catalog());
});

router.get('/v1/world', (_req, res) => {
  res.json(game.getWorld());
});

router.get('/v1/events', (_req, res) => {
  res.json({ events: game.listEvents() });
});

router.get('/v1/proposals', (_req, res) => {
  res.json({ proposals: game.listProposals() });
});

router.get('/v1/posts', (_req, res) => {
  res.json({ posts: game.listPosts() });
});

router.get('/v1/posts/:id/comments', (req, res) => {
  res.json({ comments: game.listComments(req.params.id) });
});

router.post('/v1/auth/register', (req, res) => {
  try {
    const user = game.registerUser(req.body || {});
    const token = auth.sign(user);
    res.status(201).json({ token, user });
  } catch (e) {
    res.status(e.code || 500).json({ error: e.message });
  }
});

router.post('/v1/auth/login', (req, res) => {
  try {
    const user = game.authenticate(req.body?.username, req.body?.password);
    const token = auth.sign(user);
    res.json({ token, user });
  } catch (e) {
    res.status(e.code || 500).json({ error: e.message });
  }
});

router.get('/v1/me', auth.required, (req, res) => {
  const user = game.getUserPublic(req.userId);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json({ user });
});

router.get('/v1/me/cbn', auth.required, (req, res) => {
  const user = game.getUserPublic(req.userId);
  res.json({ balance: user.cbn, ledger: game.cbnLedger(req.userId) });
});

router.post('/v1/proposals', auth.required, (req, res) => {
  try {
    const p = game.createProposal(req.userId, req.body || {});
    res.status(201).json({ proposal: p });
  } catch (e) {
    res.status(e.code || 500).json({ error: e.message });
  }
});

router.post('/v1/proposals/:id/vote', auth.required, (req, res) => {
  try {
    const row = game.vote(req.userId, req.params.id, req.body?.value);
    res.json({
      proposal: {
        id: row.id,
        status: row.status,
        votesFor: row.votes_for,
        votesAgainst: row.votes_against,
      },
    });
  } catch (e) {
    res.status(e.code || 500).json({ error: e.message });
  }
});

router.post('/v1/proposals/:id/resolve', auth.required, (req, res) => {
  try {
    const result = game.resolveProposal(req.userId, req.params.id);
    res.json(result);
  } catch (e) {
    res.status(e.code || 500).json({ error: e.message });
  }
});

router.post('/v1/posts/:id/comments', auth.required, (req, res) => {
  try {
    const c = game.addComment(req.userId, req.params.id, req.body?.body);
    res.status(201).json({ comment: c });
  } catch (e) {
    res.status(e.code || 500).json({ error: e.message });
  }
});

module.exports = router;
