'use strict'

var shimmer = require('shimmer')

module.exports = function (mongodb, agent) {
  if (mongodb.Server) {
    shimmer.wrap(mongodb.Server.prototype, 'command', instrument)
    shimmer.massWrap(mongodb.Server.prototype, ['insert', 'update', 'remove', 'auth'], instrument)
  }

  if (mongodb.Cursor) {
    shimmer.massWrap(mongodb.Cursor.prototype, ['_find', '_getmore'], instrument)
  }

  return mongodb

  function instrument (orig) {
    return function () {
      var trans = agent.currentTransaction

      if (trans && arguments.length > 0) {
        var index = arguments.length - 1
        var cb = arguments[index]
        if (typeof cb === 'function') {
          arguments[index] = wrappedCallback
          var trace = trans.newTrace('db')
        }
      }

      return orig.apply(this, arguments)

      function wrappedCallback () {
        trace.end()
        return cb.apply(this, arguments)
      }
    }
  }
}
