import React from 'react'
export default function Sidebar({ state, analysis }) {
  return (
    <div>
      <h3 style={{marginTop:0}}>Partie</h3>
      <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12, lineHeight: 1.4 }}>
        {state?.pgn || '—'}
      </div>
      <hr style={{ borderColor: '#1f2937', margin: '12px 0' }} />
      <h3>Analyse</h3>
      {!analysis && <div>Nach Spielende auf „Analyse“ klicken.</div>}
      {analysis && (
        <div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Object.entries(analysis.summary).map(([k,v]) => <span key={k} className="badge">{k}: {v}</span>)}
          </div>
          <div style={{ marginTop: 8, maxHeight: 300, overflow: 'auto' }}>
            {analysis.moves.map(m => (
              <div key={m.ply} className="row" style={{ justifyContent: 'space-between' }}>
                <div>#{m.ply} {m.side[0] === 'W' ? '♔' : '♚'} {m.san}</div>
                <div className="badge">{m.label} ({m.cpChange}cp)</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}