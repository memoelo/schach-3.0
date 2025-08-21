import { createFallbackEngine } from './fallback.js'
import { warn } from '../utils/logger.js'

let Stockfish = null
try { Stockfish = (await import('stockfish')).default || (await import('stockfish')).default } catch { warn('Stockfish not available, fallback engine in use') }

// cache for evals
const evalCache = new Map() // key: fen -> { cp, ts }
const EVAL_TTL = 1500 // ms

function createStockfishEngine({ skill=10, depth=12 } = {}) {
  const sf = Stockfish()
  sf.postMessage('uci')
  sf.postMessage('setoption name Skill Level value ' + Math.max(0, Math.min(20, Math.round(skill))))
  sf.postMessage('setoption name Threads value 1')
  sf.postMessage('setoption name Ponder value false')
  sf.postMessage('ucinewgame')
  const listeners = new Set()
  sf.onmessage = (l) => { listeners.forEach(fn => fn(typeof l === 'string' ? l : l.data)) }
  const add = fn => listeners.add(fn); const remove = fn => listeners.delete(fn)

  async function go(fen, { movetime=200, depth: d=12 } = {}) {
    return new Promise(resolve => {
      let best=null, cp=0
      const on = (line) => {
        if (typeof line !== 'string') return
        if (line.startsWith('info ')) {
          const m = line.match(/ score (cp|mate) (-?\d+)/)
          if (m) cp = m[1]==='cp' ? parseInt(m[2],10) : (parseInt(m[2],10)>0 ? 100000 : -100000)
        }
        if (line.startsWith('bestmove')) {
          best = line.split(' ')[1]; remove(on); resolve({ bestMove: best, evalCp: cp })
        }
      }
      add(on)
      sf.postMessage('position fen ' + fen)
      if (movetime) sf.postMessage('go movetime ' + movetime); else sf.postMessage('go depth ' + d)
      setTimeout(()=>{ remove(on); resolve({ bestMove: best, evalCp: cp }) }, Math.max(1200, (movetime||0)+400))
    })
  }

  return { type: 'stockfish', go }
}

export function createEngine({ skill=10, depth=12, movetime=200 } = {}) {
  if (Stockfish) return createStockfishEngine({ skill, depth, movetime })
  return createFallbackEngine({ depth })
}

// A single shared engine instance with a request queue to prevent overload
class EngineQueue {
  constructor() {
    this.eng = createEngine({ skill: 15, depth: 12, movetime: 150 })
    this.busy = false
    this.queue = []
  }
  async request(fen, opts={}) {
    const now = Date.now()
    const cached = evalCache.get(fen)
    if (cached && now - cached.ts < EVAL_TTL) return { bestMove: null, evalCp: cached.cp }
    return new Promise((resolve) => {
      this.queue.push({ fen, opts, resolve })
      this._drain()
    })
  }
  async _drain() {
    if (this.busy) return
    const job = this.queue.shift()
    if (!job) return
    this.busy = true
    try {
      const res = await this.eng.go(job.fen, job.opts)
      if (typeof res.evalCp === 'number') evalCache.set(job.fen, { cp: res.evalCp, ts: Date.now() })
      job.resolve(res)
    } catch (e) {
      job.resolve({ bestMove: null, evalCp: 0 })
    } finally {
      this.busy = false
      if (this.queue.length) setTimeout(() => this._drain(), 10)
    }
  }
}

export const engineQueue = new EngineQueue()
