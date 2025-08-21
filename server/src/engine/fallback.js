import { Chess } from 'chess.js'

function evaluateBoard(chess) {
  const pieceValues = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 }
  let total = 0
  const board = chess.board()
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const sq = board[r][c]; if (!sq) continue
    total += (sq.color === 'w' ? 1 : -1) * (pieceValues[sq.type] || 0)
  }
  return total
}

function minimax(chess, depth, alpha, beta, isMax, tt) {
  const key = chess.fen() + ':' + depth + ':' + (isMax?1:0)
  if (tt.has(key)) return tt.get(key)
  if (depth === 0 || chess.isGameOver()) {
    const v = { score: evaluateBoard(chess) }
    tt.set(key, v); return v
  }
  const moves = chess.moves({ verbose: true })
  moves.sort((a, b) => (b.flags.includes('c') - a.flags.includes('c')))
  let best = { score: isMax ? -Infinity : Infinity, move: null }
  for (const m of moves) {
    chess.move(m)
    const { score } = minimax(chess, depth - 1, alpha, beta, !isMax, tt)
    chess.undo()
    if (isMax && score > best.score) { best = { score, move: m }; alpha = Math.max(alpha, score) }
    else if (!isMax && score < best.score) { best = { score, move: m }; beta = Math.min(beta, score) }
    if (beta <= alpha) break
  }
  tt.set(key, best)
  return best
}

export const createFallbackEngine = ({ depth = 3 } = {}) => {
  const go = async (fen) => {
    const chess = new Chess(fen)
    const isMax = chess.turn() === 'w'
    const tt = new Map()
    const result = minimax(chess, Math.max(2, Math.min(4, depth)), -Infinity, Infinity, isMax, tt)
    if (!result.move) return { bestMove: null, evalCp: 0 }
    const m = result.move
    const uci = m.from + m.to + (m.promotion || '')
    return { bestMove: uci, evalCp: Math.round(result.score) }
  }
  return { type: 'fallback', go }
}
