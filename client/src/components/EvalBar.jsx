import React from 'react'
function toWhitePct(cp=0) { const x = Math.max(-800, Math.min(800, cp)) / 200; const s = 1/(1+Math.exp(-x)); return Math.round(s*100) }
export default function EvalBar({ evalCp = 0 }) {
  const pctWhite = toWhitePct(evalCp)
  return (<div className="evalbar" title={(evalCp>0?'+':'') + (Math.abs(evalCp)/100).toFixed(2)}>
    <div className="marker" style={{ top: (100 - pctWhite) + '%' }}></div>
  </div>)
}