import { Chess } from 'chess.js'
import { v4 as uuidv4 } from 'uuid'
import { BOT_LEVELS } from './engine/bots.js'
import { engineQueue, createEngine } from './engine/engineManager.js'

export class GameManager {
  constructor(io) { this.io = io; this.rooms = new Map() }

  createRoom({ mode = 'pvp', botId = 'bot1200' }) {
    const id = uuidv4().split('-')[0]
    const state = { id, mode, botId, chess: new Chess(), white: null, black: null, moves: [], lastMove: null, createdAt: Date.now() }
    this.rooms.set(id, state); return state
  }

  joinRoom(roomId, socket) {
    const s = this.rooms.get(roomId); if (!s) throw new Error('Room not found')
    if (!s.white) s.white = socket.id
    else if (!s.black) s.black = socket.id
    socket.join(roomId); this.emitState(roomId); return s
  }

  setBot(roomId, botId) { const s = this.rooms.get(roomId); if (!s) return; s.mode = 'bot'; s.botId = botId; this.emitState(roomId) }

  makeMove(roomId, socket, uci) {
    const s = this.rooms.get(roomId); if (!s) return { ok: false, reason: 'Room gone' }
    const { chess } = s
    const mv = chess.moves({ verbose: true }).find(m => (m.from + m.to + (m.promotion || '')) === uci)
    if (!mv) return { ok: false, reason: 'Illegal move' }
    if (s.mode === 'pvp') {
      const isWhiteTurn = chess.turn() === 'w'
      if ((isWhiteTurn && socket.id !== s.white) || (!isWhiteTurn && socket.id !== s.black)) return { ok: false, reason: 'Not your turn' }
    }
    chess.move(mv); s.moves.push(uci); s.lastMove = uci; this.emitState(roomId)
    if (chess.isGameOver()) { this.io.to(roomId).emit('game_over', this.getResult(chess)); return { ok: true } }
    if (s.mode === 'bot') this.botReply(roomId).catch(()=>{})
    return { ok: true }
  }

  async botReply(roomId) {
    const s = this.rooms.get(roomId); if (!s) return
    const { chess } = s; if (chess.isGameOver()) return
    const bot = BOT_LEVELS.find(b => b.id === s.botId) || BOT_LEVELS[4]
    const res = await engineQueue.request(chess.fen(), { movetime: bot.movetime, depth: bot.depth, skill: bot.skill })
    const mv = chess.moves({ verbose: true }).find(m => (m.from + m.to + (m.promotion || '')) === res.bestMove)
    if (!mv) return
    chess.move(mv); s.moves.push(res.bestMove); s.lastMove = res.bestMove; this.emitState(roomId)
    if (chess.isGameOver()) this.io.to(roomId).emit('game_over', this.getResult(chess))
  }

  undo(roomId, requester) {
    const s = this.rooms.get(roomId); if (!s) return { ok: false, reason: 'Room gone' }
    const { chess } = s
    const isParticipant = [s.white, s.black].includes(requester)
    if (s.mode === 'pvp' && !isParticipant) return { ok: false, reason: 'Not allowed' }
    const undoOnce = () => { if (chess.history().length) chess.undo() }
    if (s.mode === 'bot') { undoOnce(); undoOnce() } else { undoOnce() }
    const hist = chess.history({ verbose: true })
    s.moves = hist.map(m => m.from + m.to + (m.promotion || '')); s.lastMove = s.moves.at(-1) || null
    this.emitState(roomId); return { ok: true }
  }

  reset(roomId) {
    const s = this.rooms.get(roomId); if (!s) return { ok: false, reason: 'Room gone' }
    s.chess = new Chess(); s.moves = []; s.lastMove = null; this.emitState(roomId); return { ok: true }
  }

  getResult(chess) {
    let result = '1/2-1/2'
    if (chess.isCheckmate()) result = chess.turn() === 'w' ? '0-1' : '1-0'
    else if (chess.isDraw()) result = '1/2-1/2'
    return { result, reason: this.reason(chess) }
  }
  reason(chess) {
    if (chess.isCheckmate()) return 'Checkmate'
    if (chess.isStalemate()) return 'Stalemate'
    if (chess.isThreefoldRepetition()) return 'Threefold repetition'
    if (chess.isInsufficientMaterial()) return 'Insufficient material'
    if (chess.isDraw()) return 'Draw'
    return 'Game over'
  }
  emitState(roomId) {
    const s = this.rooms.get(roomId); if (!s) return
    this.io.to(roomId).emit('state', { id: s.id, mode: s.mode, botId: s.botId, fen: s.chess.fen(), moves: s.moves, lastMove: s.lastMove, turn: s.chess.turn(), isCheck: s.chess.isCheck(), pgn: s.chess.pgn() })
  }
}
