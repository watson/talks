var compileQuery = function (query) {
  var fns = Object.keys(query || {}).map(function (name) {
    return compileProperty(name, query[name])
  })

  return every(fns)
}

var every = function (fns) {
  if (!fns || !fns.length) {
    return function (doc) {
      return true
    }
  }

  return fns.reduce(function (fn1, fn2) {
    return function (doc) {
      return fn1(doc) && fn2(doc)
    }
  })
}

var compileProperty = function (name, prop) {
  var fns = Object.keys(prop).map(function (op) {
    // op is $eq
    switch (op) {
      case '$eq':
      return function (doc) {
        return doc[name] === prop[op]
      }

      case '$lt':
      return function (doc) {
        return doc[name] < prop[op]
      }

      case '$gt':
      return function (doc) {
        return doc[name] > prop[op]
      }

      case '$not':
      var fn = compileProperty(name, prop[op])
      return function (doc) {
        return !fn(doc)
      }
    }

    return function (doc) {
      return false
    }
  })

  return every(fns)
}

module.exports = function (query) {
  var match = compileQuery(query)
  return match
}
