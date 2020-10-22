'use strict'

// Usage:
// node bench.js <interpreter>
const interpreter = require('./' + process.argv[2])
const docs = require('./docs.json') // 7500 documents

const match = interpreter({
  city: {
    $eq: 'copenhagen'
  },
  population: {
    $lt: 10
  },
  awesome: {
    $eq: true
  },
  stuff: {
    $not: {
      $eq: 'data'
    }
  }
})

const then = Date.now()
const runs = 1000

for (let j = 0; j < runs; j++) {
  for (let i = 0; i < docs.length; i++) {
    match(docs[i])
  }
}

const delta = Date.now() - then
const count = runs * docs.length

console.log(`${count} matches took ${delta}ms (${Math.floor(count / delta)} match/ms)`)
