require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const game = require('./services/game');
const api = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 4050;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.use((req, res, next) => {
  const t0 = Date.now();
  res.on('finish', () => {
    if (req.path.startsWith('/api')) {
      console.log(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - t0}ms`);
    }
  });
  next();
});

app.use('/api', api);
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/juego', (req, res) => {\n  res.sendFile(path.join(__dirname, '..', 'public', 'game.html'));\n});\n\napp.get('/{*path}', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

game.ensureSeed();

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`MUTATIO NEXUS listening on :${PORT}`);
  });
}

module.exports = app;
