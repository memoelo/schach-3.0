import React, { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import Sidebar from './components/Sidebar.jsx'
import EvalBar from './components/EvalBar.jsx'
import ChessBoardView from './components/ChessBoard.jsx'
import SoundManager from './components/SoundManager.jsx'

const socket = io('/', { autoConnect: true, reconnection: true, reconnectionDelayMax: 2000 })

export default function App() {
  const [connected, setConnected] = useState(false)
  const [roomId, setRoomId] = useState('')
  const [state, setState] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [playingBot, setPlayingBot] = useState(false)
  const [botId, setBotId] = useState('bot1200')
  const [bots, setBots] = useState([])
  const [status, setStatus] = useState('')
  const [analysis, setAnalysis] = useState(null)
  const [orientation, setOrientation] = useState('white')
  const [boardScale, setBoardScale] = useState(85)
  const [evalCp, setEvalCp] = useState(0)
  const [evalOn, setEvalOn] = useState(true) // Toggle

  useEffect(() => { fetch('/api/bots').then(r => r.json()).then(setBots).catch(() => setBots([])) }, [])

  useEffect(() => {
    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))
    socket.on('joined', ({ roomId }) => setRoomId(roomId))
    socket.on('state', (s) => setState(s))
    socket.on('error_message', (m) => setStatus(m))
    socket.on('game_over', (p) => { setStatus('Spielende: ' + p.reason + ' – Ergebnis ' + p.result); setTimeout(() => window.__sound?.lose(), 50) })
    return () => { socket.off() }
  }, [])

  // auto-join if hash present
  useEffect(() => { const hash = location.hash.replace('#',''); if (hash && !roomId) socket.emit('join', { roomId: hash }) }, [roomId])

  // eval bar update (debounced, only vs bot and if evalOn)
  useEffect(() => {
    let abort = false
    const timer = setTimeout(async () => {
      if (!state?.fen) return
      if (state?.mode !== 'bot') return
      if (!evalOn) return
      try {
        const r = await fetch(`/api/eval?fen=${encodeURIComponent(state.fen)}&roomId=${encodeURIComponent(roomId||'')}`)
        const j = await r.json()
        if (!abort && typeof j.evalCp === 'number') setEvalCp(j.evalCp)
      } catch {}
    }, 220)
    return () => { abort = true; clearTimeout(timer) }
  }, [state?.fen, state?.mode, roomId, evalOn])

  const joinExisting = () => { const id = prompt('Raum-ID eingeben:'); if (id) socket.emit('join', { roomId: id }) }
  const newRoom = async (mode='pvp') => {
    const body = { mode, botId }
    const r = await fetch('/api/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const j = await r.json()
    socket.emit('join', { roomId: j.roomId })
    if (mode === 'bot') { setPlayingBot(true); socket.emit('set_bot', { roomId: j.roomId, botId }) }
  }
  const shareUrl = roomId ? (location.origin + '/#' + roomId) : ''

  const handleMove = (uci) => { if (!roomId) return; socket.emit('move', { roomId, uci }); window.__sound?.move() }
  const analyze = async () => {
    if (!state?.pgn) return
    setStatus('Analyse läuft...'); setAnalysis(null)
    try { const r = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pgn: state.pgn }) }); const j = await r.json(); setAnalysis(j); setStatus('Analyse fertig.') }
    catch (e) { setStatus('Analyse fehlgeschlagen.') }
  }
  const flipBoard = () => setOrientation(o => (o === 'white' ? 'black' : 'white'))
  const undo = () => { if (roomId) socket.emit('undo', { roomId }) }
  const resetGame = () => { if (roomId) socket.emit('reset', { roomId }) }

  return (
    <div className="container">
      <div className="card">
        <div className="toolbar" style={{ marginBottom: 8 }}>
          <button className="btn" onClick={() => setSidebarOpen(s => !s)}>{sidebarOpen ? 'Sidebar ausblenden' : 'Sidebar einblenden'}</button>
          <span className="badge">{connected ? 'Verbunden' : 'Getrennt'}</span>
          <span className="badge">{state ? (state.turn === 'w' ? 'Weiß am Zug' : 'Schwarz am Zug') : '—'}</span>
          {roomId && <span className="badge">Raum: {roomId}</span>}
          {shareUrl && <a className="btn" href={shareUrl} target="_blank">Link kopieren/öffnen</a>}
          <span style={{ marginLeft: 'auto' }}>{status}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) 24px', gap: 12, alignItems: 'stretch' }}>
          <ChessBoardView state={state} onMove={handleMove} orientation={orientation} boardScale={boardScale} />
          <EvalBar evalCp={evalCp} />
        </div>

        <div className="toolbar" style={{ marginTop: 12, flexWrap: 'wrap' }}>
          <button className="btn primary" onClick={() => newRoom('pvp')}>Neues Online-Spiel</button>
          <button className="btn" onClick={() => newRoom('bot')}>Gegen Bot</button>
          <button className="btn" onClick={joinExisting}>Raum beitreten</button>
          <button className="btn" onClick={analyze}>Analyse</button>
          <select className="btn" value={botId} onChange={e => setBotId(e.target.value)}>
            {bots.map(b => <option key={b.id} value={b.id}>{b.name} ({b.elo})</option>)}
          </select>
          <button className="btn" onClick={flipBoard}>Brett drehen</button>
          <button className="btn" onClick={undo}>Zug zurück</button>
          <button className="btn" onClick={resetGame}>Neustart</button>
          <label className="btn" style={{ display: 'flex', gap: 8 }}>Größe <input type="range" min="60" max="100" value={boardScale} onChange={e => setBoardScale(parseInt(e.target.value))} /></label>
          <label className="btn" style={{ display: 'flex', gap: 8 }}>
            Eval {evalOn ? 'an' : 'aus'}
            <input type="checkbox" checked={evalOn} onChange={e => setEvalOn(e.target.checked)} />
          </label>
        </div>
      </div>

      <div className={sidebarOpen ? 'sidebar' : 'sidebar hidden'}>
        <Sidebar state={state} analysis={analysis} />
      </div>

      <SoundManager />
    </div>
  )
}
