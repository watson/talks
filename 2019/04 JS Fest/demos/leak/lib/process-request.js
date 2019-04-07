'use strict'

const fs = require('fs')

const activeRequests = new Set()

module.exports = function (req, cb) {
  activeRequests.add(req)

  req.resume()

  getData((err, data) => {
    if (err) return cb(err)
    activeRequests.delete(req)
    cb(null, data)
  })
}

function getData (cb) {
  fs.readFile(__filename, (err, data) => {
    if (!err && Math.random() > 0.5) err = new Error('boom')
    cb(err, data)
  })
}
