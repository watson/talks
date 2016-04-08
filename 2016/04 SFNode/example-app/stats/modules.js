'use strict'

var hook = require('require-in-the-middle')

var MODULES = ['mongodb-core']

module.exports = function (agent) {
  hook(MODULES, function (exports, name) {
    return require('./modules/' + name)(exports, agent)
  })
}
