'use strict'

var app = require('express')()
var bodyParser = require('body-parser')
var routes = require('./lib/routes')

app.use(function (req, res, next) {
  // console.log(req.method, req.url)
  next()
})

app.use(bodyParser.json())

app.get('/', routes.root)
app.post('/signup', routes.signup)
app.get('/users', routes.users)

app.listen(3000, function () {
  // console.log('server is running on http://localhost:3000')
})
