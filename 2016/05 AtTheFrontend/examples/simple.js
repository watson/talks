module.exports = function (query) {
  return function (doc) {
    return queryMatches(doc, query)
  }
}

function queryMatches (doc, query) {
  return Object.keys(query || {}).every(function (name) {
    return propertyMatches(doc, name, query[name])
  })
}

// subQuery example: { $eq: 'foo' }
function propertyMatches (doc, name, subQuery) {
  return Object.keys(subQuery).every(function (op) {
    // op is $eq
    switch (op) {
      case '$eq':
      return doc[name] === subQuery[op]

      case '$lt':
      return doc[name] < subQuery[op]

      case '$gt':
      return doc[name] > subQuery[op]

      case '$not':
      return !propertyMatches(doc, name, subQuery[op])
    }

    return false
  })
}
