'use strict'

var util = require('util')
var crypto = require('crypto')
var db = require('memdb')()
var id = 0

exports.root = function root (req, res) {
  res.end('Hello World')
}

exports.signup = function signup (req, res) {
  var user = req.body

  user.id = ++id
  user.password = crypto
    .pbkdf2Sync(user.password, 'salt', 10000, 512, 'sha512')
    .toString('hex')

  var key = 'user!' + user.id
  db.put(key, JSON.stringify(user), function (err) {
    if (err) return res.status(500).end()
    res.status(204).end()
  })
}

exports.users = function users (req, res) {
  res.write('Users:\n')
  db.createValueStream()
    .on('data', function (user) {
      user = JSON.parse(user)
      res.write(util.format('%d, %s: %s\n', user.id, user.name, user.password))
    })
    .on('end', function () {
      res.end()
    })
}
