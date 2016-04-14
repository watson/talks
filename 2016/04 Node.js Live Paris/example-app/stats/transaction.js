'use strict'

var Trace = require('./trace')

module.exports = Transaction

function Transaction (name, onEnd) {
  this.traces = []
  this.status = 200
  this.ended = false
  this.name = name
  this._onEnd = onEnd
  this.rootTrace = this.newTrace('transaction')
}

Transaction.prototype.newTrace = function (name) {
  var trans = this
  return new Trace(name, function (trace) {
    if (trans.ended) return
    trans.traces.push(trace)
  })
}

Transaction.prototype.end = function () {
  this.rootTrace.end()
  this.ended = true
  this._onEnd(this)
}
