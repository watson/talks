'use strict'

module.exports = function stringify (obj) {
  const keys = Object.keys(obj)
  let key = keys.pop()
  while (key !== null) {
    obj[key] = String(obj[key])
    key = keys.pop()
  }
  return obj
}
