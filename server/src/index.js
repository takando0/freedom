import fs from 'fs';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');
const dataDir = path.resolve(rootDir, 'data');

const app = express();
app.use(cors());
app.use(express.json());

// Serve root static assets like /logo.svg and /icon.svg
app.use(express.static(rootDir));

// API endpoints
app.get('/api/companies', (req, res) => {
  try {
    const companies = JSON.parse(fs.readFileSync(path.join(dataDir, 'companies.json'), 'utf-8'));
    res.json(companies);
  } catch (e) {
    res.status(500).json({ error: 'Failed to load companies' });
  }
});

// Serve built client (single origin)
const clientDist = path.resolve(rootDir, 'client', 'dist');
app.use(express.static(clientDist));
// SPA fallback for client routes (exclude API and Socket.IO)
app.use((req, res, next) => {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) return next();
    return res.sendFile(path.join(clientDist, 'index.html'));
  } catch {
    return next();
  }
});

app.get('/api/global-leaderboard', (req, res) => {
  try {
    const leaderboard = JSON.parse(fs.readFileSync(path.join(dataDir, 'global_leaderboard.json'), 'utf-8'));
    const since = Number(req.query.since || leaderboardViewSince || 0);
    const filtered = leaderboard.filter((row) => Number(row.timestamp || 0) >= since);
    res.json(filtered);
  } catch (e) {
    res.status(500).json({ error: 'Failed to load leaderboard' });
  }
});

// Сброс видимой таблицы (не удаляет данные)
app.post('/api/leaderboard/clear-view', (req, res) => {
  leaderboardViewSince = Date.now();
  res.json({ ok: true, since: leaderboardViewSince });
});

// Экспорт (сырые JSON)
app.get('/api/export/players.json', (req, res) => {
  try {
    const players = JSON.parse(fs.readFileSync(path.join(dataDir, 'players.json'), 'utf-8'));
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="players.json"');
    res.send(JSON.stringify(players, null, 2));
  } catch (e) {
    res.status(500).json({ error: 'Failed to export players' });
  }
});

app.get('/api/export/global_leaderboard.json', (req, res) => {
  try {
    const leaderboard = JSON.parse(fs.readFileSync(path.join(dataDir, 'global_leaderboard.json'), 'utf-8'));
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="global_leaderboard.json"');
    res.send(JSON.stringify(leaderboard, null, 2));
  } catch (e) {
    res.status(500).json({ error: 'Failed to export leaderboard' });
  }
});

app.get('/api/players', (req, res) => {
  try {
    const players = JSON.parse(fs.readFileSync(path.join(dataDir, 'players.json'), 'utf-8'));
    res.json(players);
  } catch (e) {
    res.status(500).json({ error: 'Failed to load players' });
  }
});

const server = http.createServer(app);
const io = new SocketIOServer(server, { cors: { origin: '*'} });

// In-memory game state (single-session per requirements)
const gameState = {
  status: 'waiting',
  currentQuestion: 0,
  round: 1,
  timer: 0,
  timerStartTime: null,
  timerDuration: 0,
  players: {}, // playerId -> { id, firstName, lastName, phone, socketId, score }
  answers: {},
  scores: {},
  leaderboard: [],
  lastResults: null,
  sessionId: Date.now(),
};

let companies = { companies: [] };
try {
  companies = JSON.parse(fs.readFileSync(path.join(dataDir, 'companies.json'), 'utf-8'));
} catch (e) {
  companies = { companies: [] };
}

const DURATIONS = {
  rules: 20,
  question: 30,
  results: 15,
  roundTransition: 5,
};

// Отметка времени для "очистки" видимой таблицы лидеров (не удаляет данные)
let leaderboardViewSince = 0; // 0 = показывать все

let timerInterval = null;
function startTimer(seconds, onEnd) {
  clearInterval(timerInterval);
  gameState.timerDuration = seconds;
  gameState.timer = seconds;
  gameState.timerStartTime = Date.now();
  timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - gameState.timerStartTime) / 1000);
    const remaining = Math.max(0, gameState.timerDuration - elapsed);
    gameState.timer = remaining;
    io.emit('timerUpdate', { timer: remaining, timerStartTime: gameState.timerStartTime, duration: gameState.timerDuration });
    if (remaining <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      if (onEnd) onEnd();
    }
  }, 500);
}

// Если все подключённые игроки ответили — показываем результаты раньше таймера
function maybeEndQuestionEarly() {
  try {
    if (gameState.status !== 'question') return;
    const connectedPlayers = Object.values(gameState.players).filter(p => !!p.socketId).length;
    const answersCount = Object.keys(gameState.answers || {}).length;
    if (connectedPlayers > 0 && answersCount >= connectedPlayers) {
      clearInterval(timerInterval);
      timerInterval = null;
      showResults();
    }
  } catch {}
}

function broadcastGameState() {
  const connectedPlayers = Object.values(gameState.players).filter(p => !!p.socketId).length;
  const publicState = {
    status: gameState.status,
    currentQuestion: gameState.currentQuestion,
    round: gameState.round,
    timer: gameState.timer,
    timerStartTime: gameState.timerStartTime,
    timerDuration: gameState.timerDuration,
    leaderboard: gameState.leaderboard,
    playersCount: connectedPlayers,
    playersList: Object.values(gameState.players)
      .filter(p => !!p.socketId)
      .map(p => ({ id: p.id, firstName: p.firstName, lastName: p.lastName })),
    question: buildPublicQuestion(),
    lastResults: gameState.status === 'results' ? gameState.lastResults : null,
    sessionId: gameState.sessionId,
  };
  io.emit('gameState', publicState);
  // Дополнительно подтверждаем регистрацию каждому подключенному игроку,
  // чтобы клиент не зависал на форме при потере события 'registered'
  try {
    for (const p of Object.values(gameState.players)) {
      if (p.socketId) {
        io.to(p.socketId).emit('registered', { playerId: p.id, playerName: `${p.firstName} ${p.lastName}`, sessionId: gameState.sessionId });
      }
    }
  } catch {}
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf-8'));
}

function writeJson(file, data) {
  fs.writeFileSync(path.join(dataDir, file), JSON.stringify(data, null, 2));
}

function buildPublicQuestion() {
  const q = companies.companies[gameState.currentQuestion];
  if (!q) return null;
  const isRound1 = gameState.round === 1;
  return {
    id: q.id,
    name: q.name,
    logo: q.logo,
    currentPrice: q.currentPrice,
    currency: q.currency,
    exchange: q.exchange,
    round: gameState.round,
    options: isRound1 ? q.options : null,
    question: q.question,
  };
}

function setStatus(status) {
  gameState.status = status;
  broadcastGameState();
}

function goToRules() {
  setStatus('rules');
  startTimer(DURATIONS.rules, () => goToQuestion(0));
}

function goToQuestion(index) {
  gameState.currentQuestion = index;
  gameState.round = index < 4 ? 1 : 2;
  gameState.answers = {};
  setStatus('question');
  startTimer(DURATIONS.question, () => showResults());
}

function pctError(given, correct) {
  const v = Math.abs(given - correct) / correct;
  return v; // 0..1
}

function awardPointsRound2(err) {
  if (err <= 0.05) return 4;
  if (err <= 0.10) return 3;
  if (err <= 0.20) return 2;
  if (err <= 0.50) return 1;
  return 0;
}

function computeAndApplyScores() {
  const q = companies.companies[gameState.currentQuestion];
  if (!q) return { correct: null };
  const correct = q.price2020;
  const isRound1 = gameState.round === 1;
  const playerEntries = Object.values(gameState.players);
  const awarded = {};
  const answerCounts = isRound1 && Array.isArray(q.options)
    ? Object.fromEntries(q.options.map((o) => [o, 0]))
    : null;
  // Предварительно рассчитываем близость вариантов для Раунда 1
  let nearestPositiveDiff = null;
  let secondPositiveDiff = null;
  if (isRound1 && Array.isArray(q.options)) {
    const correctNum = Number(correct);
    const CORRECT_TOL = 0.005;
    const EPS = 1e-9;
    const uniqueOptionValues = Array.from(new Set(q.options.map((v) => Number(v)).filter((v) => Number.isFinite(v))));
    const diffs = uniqueOptionValues
      .map((v) => ({ v, d: Math.abs(Number(v) - correctNum) }))
      .sort((a, b) => a.d - b.d);
    for (const { d } of diffs) {
      if (d <= CORRECT_TOL + EPS) continue; // это правильный ответ
      if (nearestPositiveDiff === null) {
        nearestPositiveDiff = d;
      } else if (secondPositiveDiff === null && Math.abs(d - nearestPositiveDiff) > EPS) {
        secondPositiveDiff = d;
        break;
      }
    }
  }

  for (const player of playerEntries) {
    const a = gameState.answers[player.id];
    if (a == null) continue;
    if (isRound1) {
      // Новая схема Раунда 1: 3 за точное совпадение; 2 — ближайший вариант; 1 — второй по близости
      const CORRECT_TOL = 0.005;
      const EPS = 1e-9;
      const given = Number(a);
      const diff = Math.abs(given - Number(correct));
      let pts = 0;
      if (diff <= CORRECT_TOL) {
        pts = 3;
      } else if (nearestPositiveDiff !== null && Math.abs(diff - nearestPositiveDiff) <= EPS) {
        pts = 2;
      } else if (secondPositiveDiff !== null && Math.abs(diff - secondPositiveDiff) <= EPS) {
        pts = 1;
      } else {
        pts = 0;
      }
      if (pts > 0) {
        player.score = (player.score || 0) + pts;
      }
      awarded[player.id] = pts;
      if (answerCounts && Object.prototype.hasOwnProperty.call(answerCounts, a)) {
        answerCounts[a] += 1;
      }
    } else {
      const given = Number(a);
      if (!Number.isFinite(given)) continue;
      const err = pctError(given, correct);
      const pts = awardPointsRound2(err);
      player.score = (player.score || 0) + pts;
      awarded[player.id] = pts;
    }
  }
  // Update leaderboard snapshot
  gameState.leaderboard = Object.values(gameState.players)
    .map(p => ({ playerName: `${p.firstName} ${p.lastName}`, score: p.score || 0 }))
    .sort((a,b) => b.score - a.score)
    .slice(0, 20);
  gameState.lastResults = {
    round: gameState.round,
    questionId: q.id,
    correct,
    answerCounts,
    awarded,
    explanation: q.answer,
    growth: q.growth,
    investment1000: q.investment1000,
    currentPrice: q.currentPrice,
    price2020: q.price2020,
    currency: q.currency,
  };
  return { correct, awarded };
}

function showResults() {
  const { correct, awarded } = computeAndApplyScores();
  setStatus('results');
  io.emit('results', { correct, lastResults: gameState.lastResults });
  // Send per-player self results
  try {
    for (const player of Object.values(gameState.players)) {
      if (player.socketId) {
        io.to(player.socketId).emit('resultsSelf', {
          correct,
          yourAnswer: gameState.answers[player.id],
          yourPoints: awarded[player.id] || 0,
        });
      }
    }
  } catch {}
  startTimer(DURATIONS.results, () => {
    const next = gameState.currentQuestion + 1;
    if (next === 4) {
      setStatus('round-transition');
      startTimer(DURATIONS.roundTransition, () => goToQuestion(next));
    } else if (next < companies.companies.length) {
      goToQuestion(next);
    } else {
      finishGame();
    }
  });
}

function finishGame() {
  setStatus('final');
  // Append results to global leaderboard
  try {
    const global = readJson('global_leaderboard.json');
    const entries = Object.values(gameState.players).map(p => ({
      playerName: `${p.firstName} ${p.lastName}`,
      firstName: p.firstName,
      lastName: p.lastName,
      phone: p.phone,
      score: p.score || 0,
      date: new Date().toISOString(),
      timestamp: Date.now(),
    }));
    writeJson('global_leaderboard.json', [...global, ...entries]);
  } catch (e) {}
  // Compute ranks
  const sorted = Object.values(gameState.players)
    .map(p => ({ id: p.id, playerName: `${p.firstName} ${p.lastName}`, score: p.score || 0, socketId: p.socketId }))
    .sort((a,b) => b.score - a.score);
  const withRank = sorted.map((p, idx) => ({ ...p, rank: idx + 1 }));
  io.emit('final', { leaderboard: withRank.slice(0, 20) });
  // Send personal final to each player
  for (const p of withRank) {
    if (p.socketId) {
      io.to(p.socketId).emit('finalSelf', { rank: p.rank, score: p.score });
    }
  }
  broadcastGameState();
}

io.on('connection', (socket) => {
  const connectedPlayers = Object.values(gameState.players).filter(p => !!p.socketId).length;
  socket.emit('gameState', {
    status: gameState.status,
    currentQuestion: gameState.currentQuestion,
    round: gameState.round,
    timer: gameState.timer,
    timerStartTime: gameState.timerStartTime,
    timerDuration: gameState.timerDuration,
    leaderboard: gameState.leaderboard,
    playersCount: connectedPlayers,
    playersList: Object.values(gameState.players)
      .filter(p => !!p.socketId)
      .map(p => ({ id: p.id, firstName: p.firstName, lastName: p.lastName })),
    question: buildPublicQuestion(),
    sessionId: gameState.sessionId,
  });

  socket.on('registerPlayer', ({ firstName, lastName, phone, consent }) => {
    try {
      if (typeof firstName !== 'string' || typeof lastName !== 'string' || typeof phone !== 'string') {
        return socket.emit('gameError', { message: 'Некорректные данные регистрации' });
      }
      if (consent !== true) {
        return socket.emit('gameError', { message: 'Необходимо согласие на обработку данных' });
      }
      const clean = (s) => s.replace(/<[^>]*>/g, '').trim();
      const fn = clean(firstName);
      const ln = clean(lastName);
      const ph = phone.replace(/\D/g, '');
      if (fn.length < 2 || fn.length > 30 || ln.length < 2 || ln.length > 30) {
        return socket.emit('gameError', { message: 'Имя/фамилия имеют недопустимую длину' });
      }
      if (!/^7\d{10}$/.test(ph)) {
        return socket.emit('gameError', { message: 'Телефон должен начинаться с 7 и содержать 11 цифр' });
      }

      // Уникальность телефона ГЛОБАЛЬНО (игрок может сыграть только один раз)
      let playersPersist = [];
      try { playersPersist = readJson('players.json'); } catch (e) { playersPersist = []; }
      const existsGlobal = playersPersist.some((p) => p.phone === ph);
      const existsInGame = Object.values(gameState.players).some((p) => p.phone === ph);
      if (existsGlobal || existsInGame) {
        return socket.emit('gameError', { message: 'Такой номер уже зарегистрирован' });
      }

      const newPlayer = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        firstName: fn,
        lastName: ln,
        phone: ph,
        consent: true,
        timestamp: Date.now(),
      };
      // Фиксируем игрока в players.json, чтобы запретить повторную игру в будущем
      try {
        const playersFile = 'players.json';
        let list = [];
        try { list = readJson(playersFile); } catch (e) { list = []; }
        list.push(newPlayer);
        writeJson(playersFile, list);
      } catch {}

      gameState.players[newPlayer.id] = { ...newPlayer, socketId: socket.id, score: 0 };
      socket.emit('registered', { playerId: newPlayer.id, playerName: `${fn} ${ln}`, sessionId: gameState.sessionId });
      broadcastGameState();
    } catch (e) {
      socket.emit('gameError', { message: 'Ошибка регистрации' });
    }
  });

  socket.on('submitAnswer', ({ playerId, value }) => {
    try {
      if (gameState.status !== 'question') return;
      const player = gameState.players[playerId];
      if (!player) return;
      const q = companies.companies[gameState.currentQuestion];
      if (!q) return;
      if (gameState.round === 1) {
        const v = Number(String(value).replace(',', '.'));
        if (!q.options.includes(v)) return;
        gameState.answers[playerId] = v;
      } else {
        const normalized = Number(String(value).replace(',', '.'));
        if (!Number.isFinite(normalized)) return;
        gameState.answers[playerId] = normalized;
      }
      // Проверяем, все ли ответили
      maybeEndQuestionEarly();
    } catch {}
  });

  socket.on('reconnectPlayer', ({ playerId }) => {
    try {
      if (typeof playerId !== 'string') return;
      const p = gameState.players[playerId];
      if (p) {
        p.socketId = socket.id;
        socket.emit('registered', { playerId: p.id, playerName: `${p.firstName} ${p.lastName}`, sessionId: gameState.sessionId });
        broadcastGameState();
      }
    } catch {}
  });

  // Позволяем клиенту явно спросить, кто он сейчас
  socket.on('whoami', () => {
    try {
      const p = Object.values(gameState.players).find(pp => pp.socketId === socket.id);
      if (p) {
        socket.emit('registered', { playerId: p.id, playerName: `${p.firstName} ${p.lastName}` });
      }
    } catch {}
  });

  socket.on('adminCommand', ({ type }) => {
    switch (type) {
      case 'startGame':
        if (gameState.status === 'waiting' || gameState.status === 'final') goToRules();
        break;
      case 'startNow':
        // Skip rules and go directly to question 1
        goToQuestion(0);
        break;
      case 'nextQuestion':
        if (gameState.status === 'results') {
          const next = gameState.currentQuestion + 1;
          if (next < companies.companies.length) goToQuestion(next);
        } else if (gameState.status === 'question') {
          // Если нажали «Следующий вопрос» во время вопроса — сначала показать результаты
          showResults();
        }
        break;
      case 'showResults':
        if (gameState.status === 'question') showResults();
        break;
      case 'resetGame':
        clearInterval(timerInterval);
        // Полностью очищаем игроков для новой регистрации в следующей игре
        gameState.players = {};
        gameState.currentQuestion = 0;
        gameState.round = 1;
        gameState.answers = {};
        gameState.leaderboard = [];
        gameState.timer = 0;
        gameState.timerDuration = 0;
        gameState.timerStartTime = null;
        gameState.sessionId = Date.now();
        setStatus('waiting');
        break;
      default:
        break;
    }
  });

  socket.on('disconnect', () => {
    const playerId = Object.keys(gameState.players).find((id) => gameState.players[id].socketId === socket.id);
    if (playerId) {
      // keep player in state for reconnection; only clear socketId
      gameState.players[playerId].socketId = null;
      broadcastGameState();
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

// Graceful shutdown to avoid EADDRINUSE on restarts
function shutdown(signal) {
  try { clearInterval(timerInterval); } catch {}
  try { io.close(); } catch {}
  try {
    server.close(() => {
      process.exit(0);
    });
  } catch {
    process.exit(0);
  }
  // Fallback in case close hangs
  setTimeout(() => process.exit(0), 3000).unref();
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
// Nodemon sends SIGUSR2 on restart
process.once('SIGUSR2', () => {
  shutdown('SIGUSR2');
  setTimeout(() => process.exit(0), 0);
});
