export const log = (...args) => { if (process.env.NODE_ENV !== 'test') console.log('[srv]', ...args) }
export const warn = (...args) => console.warn('[srv:warn]', ...args)
export const err = (...args) => console.error('[srv:err]', ...args)
