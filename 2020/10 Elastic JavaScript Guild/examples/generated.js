'use strict'

module.exports = function (query) {
  const match = compileQuery(query)
  const fn = new Function('doc', 'return ' + match)
  return fn
}

function compileQuery (query) {
  const expressions = Object.keys(query || {}).map(function (name) {
    return compileProperty(name, query[name])
  })

  return every(expressions)
}

function compileProperty (name, prop) {
  const expressions = Object.keys(prop).map(function (op) {
    // op is $eq
    switch (op) {
      case '$eq':
      return 'doc['
        + JSON.stringify(name) + '] === '
        + JSON.stringify(prop[op])

      case '$lt':
      return 'doc['
        + JSON.stringify(name) + '] < '
        + JSON.stringify(prop[op])

      case '$gt':
      return 'doc['
        + JSON.stringify(name) + '] > '
        + JSON.stringify(prop[op])

      case '$not':
      const expression = compileProperty(name, prop[op])
      return '!(' + expression + ')'
    }

    return 'false'
  })

  return every(expressions)
}

function every (expressions) {
  if (!expressions || !expressions.length) {
    return 'true'
  }

  return '(' + expressions.join(' && ') + ')'
}
