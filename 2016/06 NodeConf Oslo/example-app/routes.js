'use strict'

var stats = require('./stats')
var db = require('mongojs')('localhost/oslo', ['posts'])

exports.listPosts = function listPosts (req, res) {
  db.posts.find({}, function (err, results) {
    if (err) {
      console.log(err.stack)
      res.writeHead(500)
      res.end()
      return
    }
    res.end(JSON.stringify(results) + '\n')
  })
}

exports.showPost = function showPost (req, res) {
  try {
    var id = db.ObjectId(req.params.id)
  } catch (e) {
    res.writeHead(404)
    res.end()
    return
  }

  db.posts.findOne({ _id: id }, function (err, msg) {
    if (err) {
      console.log(err.stack)
      res.writeHead(500)
      res.end()
    } else if (!msg) {
      res.writeHead(404)
      res.end()
    } else {
      res.end(JSON.stringify(msg) + '\n')
    }
  })
}

exports.coffee = function coffee (req, res) {
  var t1 = stats.newTrace('grind')
  var t2 = stats.newTrace('boil')
  setTimeout(function () {
    if (t1) t1.end()
    if (t2) t2.end()
    var t3 = stats.newTrace('pour')
    setTimeout(function () {
      if (t3) t3.end()
      res.end('Hello Oslo\n')
    }, 50)
  }, 25)
}
