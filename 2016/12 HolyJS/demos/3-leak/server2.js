'use strict'

var util = require('util')
var express = require('express')

var app = express()

var active = {}
var reqCounter = 0

app.use(function (req, res, next) {
  req.id = ++reqCounter
  active[req.id] = req

  req.on('end', function () {
    delete active[req.id]
  })

  req.on('close', function () {
    delete active[req.id]
  })

  next()
})

app.use(function (req, res, next) {
  console.log(req.method, req.url)
  next()
})

app.get('/', function (req, res) {
  setTimeout(function () {
    res.end('Hello World')
  }, 1000)
})

app.get('/active', function (req, res) {
  process.nextTick(function () {
    res.end(Object.count(activ))
  })
})

app.listen(3000, function () {
  console.log('Server is listening on port 3000')
})
