'use strict'

var autocannon = require('autocannon')
var csl = require('casualis')

var requests = []
for (var n = 0; n < 1000; n++) {
  requests.push(getRandomRequest())
}

var instance = autocannon({
  url: 'http://ubuntu.local:3000',
  requests: requests,
  // forever: true
  duration: 60
})

process.once('SIGINT', function () {
  instance.stop()
})

autocannon.track(instance)

function getRandomRequest () {
  var type = Math.round(Math.random() * 2)
  switch (type) {
    case 0:
      return {}
    case 1:
      return {path: '/users'}
    case 2:
      return {
        method: 'POST',
        path: '/signup',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({name: getRandomName(), password: getRandomName()})
      }
  }
}

function getRandomName () {
  var name
  if (Math.random() < 0.5) {
    name = csl.getRandomFullName('male')
  } else {
    name = csl.getRandomFullName('female')
  }
  return name.split(' ')[1]
}
