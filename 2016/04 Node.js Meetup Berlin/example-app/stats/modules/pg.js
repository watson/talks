'use strict'

var shimmer = require('shimmer')

module.exports = function (pg, agent) {
  patchClient(pg.Client, agent)
  try {
    patchClient(pg.native.Client, agent)
  } catch (e) {}
  return pg
}

function patchClient (Client, agent) {
  shimmer.wrap(Client.prototype, 'query', wrapQuery)

  function wrapQuery (orig) {
    return function wrappedFunction () {
      var trans = agent.currentTransaction

      if (trans) {
        var args = arguments
        var index = args.length - 1
        var cb = args[index]

        if (Array.isArray(cb)) {
          args = cb
          index = args.length - 1
          cb = args[index]
        }

        var trace = trans.newTrace('db')

        if (typeof cb === 'function') {
          args[index] = end
          return orig.apply(this, arguments)
        } else {
          cb = null
          var query = orig.apply(this, arguments)
          query.on('end', end)
          query.on('error', end)
          return query
        }
      } else {
        return orig.apply(this, arguments)
      }

      function end () {
        trace.end()
        if (cb) return cb.apply(this, arguments)
      }
    }
  }
}
