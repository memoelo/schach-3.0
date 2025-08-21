import React, { useEffect } from 'react'
function tone(ctx, freq=440, dur=0.06, type='sine', gain=0.05) {
  const osc = ctx.createOscillator(); const g = ctx.createGain()
  osc.type = type; osc.frequency.value = freq; g.gain.value = gain
  osc.connect(g).connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + dur)
}
export default function SoundManager() {
  useEffect(() => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const api = {
      move: () => { tone(ctx, 520, 0.05, 'sine', 0.03) },
      capture: () => { tone(ctx, 200, 0.08, 'square', 0.04) },
      check: () => { tone(ctx, 880, 0.05, 'sawtooth', 0.05) },
      lose: () => { const osc = ctx.createOscillator(); const g = ctx.createGain(); osc.type='sawtooth'; osc.frequency.setValueAtTime(800, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime+0.8); g.gain.setValueAtTime(0.05, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime+0.8); osc.connect(g).connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime+0.85) }
    }
    window.__sound = api; return () => { delete window.__sound }
  }, [])
  return null
}