'use strict'

const stringify = require('./lib/stringify')

// Turn this:
//   { foo: 1, bar: 2 }
// Into this:
//   { foo: "1", bar: "2" }
console.log(stringify({ foo: 1, bar: 2 }))
