'use strict'

var stats = require('./stats')
var http = require('http')
var patterns = require('patterns')()
var routes = require('./routes')

patterns.add('GET /posts', routes.listPosts)
patterns.add('GET /posts/{id}', routes.showPost)
patterns.add('GET /coffee', routes.coffee)

var server = http.createServer(function (req, res) {
  var match = patterns.match(req.method + ' ' + req.url)

  var trans = stats.newTransaction(match ? match.pattern : 'Unknown route')
  trans.req = req
  res.on('finish', function () {
    trans.status = res.statusCode
    trans.end()
  })

  if (!match) {
    res.writeHead(404)
    res.end()
    return
  }

  var route = match.value
  req.params = match.params

  route(req, res)
})

server.listen(3000, function () {
  console.log('Server running on port 3000')
})

process.on('uncaughtException', function (err) {
  var trans = stats.currentTransaction
  if (trans && trans.req) {
    console.log('An error occurred during HTTP request:', trans.req.method, trans.req.url)
  } else {
    console.log('An error occurred outside the scope of an HTTP request!')
  }
  console.log(err.stack)
  process.exit(1)
})
