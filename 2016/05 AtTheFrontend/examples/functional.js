module.exports = function (query) {
  var match = compileQuery(query)
  return match
}

function compileQuery (query) {
  var fns = Object.keys(query || {}).map(function (name) {
    return compileProperty(name, query[name])
  })

  return every(fns)
}

function compileProperty (name, subQuery) {
  var fns = Object.keys(subQuery).map(function (op) {
    // op is $eq
    switch (op) {
      case '$eq':
      return function eq (doc) {
        return doc[name] === subQuery[op]
      }

      case '$lt':
      return function lt (doc) {
        return doc[name] < subQuery[op]
      }

      case '$gt':
      return function gt (doc) {
        return doc[name] > subQuery[op]
      }

      case '$not':
      var fn = compileProperty(name, subQuery[op])
      return function not (doc) {
        return !fn(doc)
      }
    }

    return function (doc) {
      return false
    }
  })

  return every(fns)
}

function every (fns) {
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
