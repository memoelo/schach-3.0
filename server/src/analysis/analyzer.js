import { Chess } from 'chess.js'
import { createEngine } from '../engine/engineManager.js'

const thresholds = { blunder: 200, mistake: 80, inaccuracy: 30, good: 10 }

export async function analyzeGame(pgn, { movetime = 180 } = {}) {
  const chess = new Chess()
  chess.loadPgn(pgn)
  const history = chess.history({ verbose: true })
  const engine = createEngine({ skill: 20, depth: 14, movetime })

  const report = []
  const base = new Chess()

  for (let i = 0; i < history.length; i++) {
    const move = history[i]
    const fenBefore = base.fen()
    const { evalCp: evalBefore } = await engine.go(fenBefore, { movetime })
    base.move(move)
    const { evalCp: evalAfter } = await engine.go(base.fen(), { movetime })

    const side = move.color === 'w' ? 'White' : 'Black'
    const diff = (evalAfter ?? 0) - (evalBefore ?? 0)
    const signed = side === 'White' ? diff : -diff

    let label = 'Best'
    const abs = Math.abs(signed)
    if (abs >= thresholds.blunder) label = 'Blunder'
    else if (abs >= thresholds.mistake) label = 'Mistake'
    else if (abs >= thresholds.inaccuracy) label = 'Inaccuracy'
    else if (abs >= thresholds.good) label = 'Good'
    if (Math.abs(evalAfter) > 90000) label = signed < 0 ? 'Missed Mate' : 'Delivering Mate'

    report.push({ ply: i+1, side, san: move.san, cpChange: Math.round(signed), label })
  }
  return { summary: summarize(report), moves: report }
}

function summarize(report) {
  const s = { Blunder: 0, Mistake: 0, Inaccuracy: 0, Good: 0, Best: 0, 'Missed Mate': 0, 'Delivering Mate': 0 }
  report.forEach(r => { s[r.label] = (s[r.label] || 0) + 1 })
  const total = report.length
  return { total, ...s }
}
