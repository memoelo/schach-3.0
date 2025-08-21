import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'

export default function ChessBoardView({ state, onMove, orientation='white', boardScale=85 }) {
  const [game, setGame] = useState(new Chess())
  const [moveSquares, setMoveSquares] = useState({})
  const [lastMove, setLastMove] = useState(null)
  const [premove, setPremove] = useState(null)
  const containerRef = useRef(null)
  const [boardWidth, setBoardWidth] = useState(520)

  useEffect(() => {
    if (!containerRef.current) return
    let raf = null
    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        cancelAnimationFrame(raf)
        raf = requestAnimationFrame(() => {
          const w = e.contentRect.width
          const h = window.innerHeight - 180
          const size = Math.min(w, h) * (boardScale/100)
          setBoardWidth(Math.max(300, Math.floor(size)))
        })
      }
    })
    ro.observe(containerRef.current)
    return () => { cancelAnimationFrame(raf); ro.disconnect() }
  }, [boardScale])

  useEffect(() => {
    if (!state?.fen) return
    const g = new Chess(state.fen)
    setGame(g)
    setLastMove(state.lastMove || null)
    if (premove && g.turn() !== (premove.color === 'w' ? 'w' : 'b')) {
      const legal = g.moves({ verbose: true })
      const mv = legal.find(m => (m.from + m.to + (m.promotion || '')) === premove.uci)
      if (mv) { onMove(premove.uci); setPremove(null) }
    }
  }, [state?.fen])

  const onPieceDrop = (sourceSquare, targetSquare) => {
    const legal = game.moves({ verbose: true })
    const mv = legal.find(m => m.from === sourceSquare && m.to === targetSquare)
    const uci = mv ? (mv.from + mv.to + (mv.promotion || '')) : null
    if (!uci) { setPremove({ uci: sourceSquare + targetSquare, color: game.turn() }); return false }
    onMove(uci); setMoveSquares({}); return true
  }

  const customSquareStyles = useMemo(() => {
    const styles = { ...moveSquares }
    if (lastMove) {
      const from = lastMove.slice(0,2), to = lastMove.slice(2,4)
      styles[from] = { backgroundColor: 'rgba(34,197,94,0.5)' }
      styles[to] = { backgroundColor: 'rgba(34,197,94,0.5)' }
    }
    return styles
  }, [moveSquares, lastMove])

  return (
    <div ref={containerRef} style={{ width: '100%', height: 'calc(100vh - 140px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Chessboard
        id="Board"
        position={state?.fen || 'start'}
        boardWidth={boardWidth}
        onPieceDrop={onPieceDrop}
        customBoardStyle={{ borderRadius: '12px', boxShadow: '0 0 0 1px #1f2937 inset' }}
        customSquareStyles={customSquareStyles}
        boardOrientation={orientation}
        animationDuration={100}
        arePiecesDraggable={true}
        arePremovesAllowed={true}
        showBoardNotation={true}
        customLightSquareStyle={{ backgroundColor: '#9ca3af' }}
        customDarkSquareStyle={{ backgroundColor: '#374151' }}
      />
    </div>
  )
}
