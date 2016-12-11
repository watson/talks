'use strict'

var http = require('http')

var host = process.argv[2] || 'localhost'

connect()

function connect () {
  console.log('-- connecting')

  var req = http.get('http://' + host + ':3000', function (res) {
    res.resume()
  })

  req.on('socket', function (socket) {
    if (Math.random() >= 0.8) {
      setTimeout(function () {
        console.log('-- destroying...')
        socket.destroy()
      }, 10)
    }
  })

  req.on('error', function () {})

  setTimeout(connect, 25)
}
