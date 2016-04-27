'use strict'

var agent = module.exports = {}

require('./modules')(agent) // Hook into Module._load
require('./async-hook')(agent) // Hook into every async function in Node core

var util = require('util')
var Transaction = require('./transaction')

agent.newTransaction = function (name) {
  agent.currentTransaction = new Transaction(name, logTransaction)
  return agent.currentTransaction
}

agent.newTrace = function (name) {
  if (!agent.currentTransaction) return
  return agent.currentTransaction.newTrace(name)
}

function logTransaction (trans) {
  var total = trans.rootTrace.duration
  var traces = trans.traces
    .filter(function (trace) {
      return trace !== trans.rootTrace
    })
    .map(function (trace) {
      var percent = trace.duration / total * 100
      return util.format('%s: %s%', trace.name, Math.round(percent))
    })

  // GET /foo [200] - 202ms (db: 23%, view: 2%)
  console.log('%s [%s] - %dms (%s)', trans.name, trans.status, Math.round(total), traces.join(', '))
}
