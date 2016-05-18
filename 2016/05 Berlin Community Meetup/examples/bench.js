var interpreter = require('./' + process.argv[2])
var docs = require('./docs.json')

var match = interpreter({
  city: {
    $eq: 'berlin'
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

var then = Date.now()
var runs = 1000

for (var j = 0; j < runs; j++) {
  for (var i = 0; i < docs.length; i++) {
    match(docs[i])
  }
}

var delta = Date.now() - then
var count = runs * docs.length

console.log(count + ' matches took ' + delta + 'ms ' +
  '(' + Math.floor(count / delta) + ' match/ms)')


