'use strict'

var http = require('http')
var patterns = require('patterns')()
var routes = require('./routes')

patterns.add('GET /posts', routes.listPosts)
patterns.add('GET /posts/{id}', routes.showPost)

var server = http.createServer(function (req, res) {
  console.log(req.method, req.url)

  var match = patterns.match(req.method + ' ' + req.url)

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
