import express from 'express'
import http from 'http'
import cors from 'cors'
import compression from 'compression'
import { Server } from 'socket.io'
import path from 'path'
import { fileURLToPath } from 'url'
import { GameManager } from './gameManager.js'
import { BOT_LEVELS } from './engine/bots.js'
import { engineQueue } from './engine/engineManager.js'
import { analyzeGame } from './analysis/analyzer.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
app.use(cors())
app.use(compression())
app.use(express.json({ limit: '1mb' }))

const server = http.createServer(app)
const io = new Server(server, { cors: { origin: '*' } })

const gm = new GameManager(io)

// simple per-room throttling for eval
const lastEvalAt = new Map()

app.get('/api/health', (req, res) => res.json({ ok: true }))
app.get('/api/bots', (req, res) => res.json(BOT_LEVELS))

app.post('/api/rooms', (req, res) => {
  const { mode = 'pvp', botId = 'bot1200' } = req.body || {}
  const state = gm.createRoom({ mode, botId })
  res.json({ roomId: state.id })
})

app.post('/api/analyze', async (req, res) => {
  const { pgn } = req.body || {}
  if (!pgn) return res.status(400).json({ error: 'Missing PGN' })
  try { const report = await analyzeGame(pgn, { movetime: 180 }); res.json(report) }
  catch (e) { res.status(500).json({ error: 'Analysis failed' }) }
})

app.get('/api/eval', async (req, res) => {
  const { fen, roomId = 'global' } = req.query
  if (!fen) return res.status(400).json({ error: 'Missing fen' })
  const now = Date.now()
  const last = lastEvalAt.get(roomId) || 0
  if (now - last < 180) return res.json({ evalCp: 0 }) // throttle
  lastEvalAt.set(roomId, now)
  try { const { evalCp } = await engineQueue.request(fen, { movetime: 120, depth: 12 }); res.json({ evalCp }) }
  catch (e) { res.status(500).json({ error: 'Eval failed' }) }
})

// sockets
io.on('connection', (socket) => {
  socket.on('join', ({ roomId }) => {
    try { gm.joinRoom(roomId, socket); socket.emit('joined', { roomId }) }
    catch (e) { socket.emit('error_message', e.message) }
  })
  socket.on('set_bot', ({ roomId, botId }) => gm.setBot(roomId, botId))
  socket.on('move', ({ roomId, uci }) => { const r = gm.makeMove(roomId, socket, uci); if (!r.ok) socket.emit('error_message', r.reason) })
  socket.on('undo', ({ roomId }) => { const r = gm.undo(roomId, socket.id); if (!r.ok) socket.emit('error_message', r.reason) })
  socket.on('reset', ({ roomId }) => { const r = gm.reset(roomId); if (!r.ok) socket.emit('error_message', r.reason) })
})

const distPath = path.join(__dirname, '../public/dist')
app.use(express.static(distPath))
app.get('*', (req, res, next) => { if (req.path.startsWith('/api')) return next(); res.sendFile(path.join(distPath, 'index.html')) })

const PORT = process.env.PORT || 8080
server.listen(PORT, () => console.log('[srv] Server on http://localhost:' + PORT))
