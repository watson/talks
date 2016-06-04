'use strict'

module.exports = Trace

function Trace (name, onEnd) {
  this.name = name
  this._onEnd = onEnd
  this._start = process.hrtime()
}

Trace.prototype.end = function () {
  var diff = process.hrtime(this._start)
  var ns = diff[0] * 1e9 + diff[1]
  this.duration = ns / 1e6
  this._onEnd(this)
}
