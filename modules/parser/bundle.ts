import * as parser from './src'

// @ts-ignore
globalThis.msagl = globalThis.msagl || {}

Object.assign(globalThis.msagl, parser)
