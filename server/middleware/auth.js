const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'mutatio-dev-secret-change-me-in-production-32chars';

function sign(user) {
  return jwt.sign({ sub: user.id, username: user.username }, SECRET, { expiresIn: '7d' });
}

function required(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No autorizado' });
  try {
    const payload = jwt.verify(token, SECRET);
    req.userId = payload.sub;
    req.username = payload.username;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

function optional(req, _res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (token) {
    try {
      const payload = jwt.verify(token, SECRET);
      req.userId = payload.sub;
      req.username = payload.username;
    } catch {
      /* ignore */
    }
  }
  next();
}

module.exports = { sign, required, optional, SECRET };
