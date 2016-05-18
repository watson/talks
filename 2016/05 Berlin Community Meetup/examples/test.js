var interpreter = require('./generated')
var assert = require('assert')

var matcher = interpreter({
  hello: {
    $eq: 'world'
  }
})

var bool = matcher({
  hello: 'world'
})

assert(bool === true)

var bool1 = matcher({
  hello: 'verden'
})

assert(bool1 === false)

var matcher2 = interpreter({
  age: {
    $gt: 10
  }
})

var bool2 = matcher2({
  age: 12
})

assert(bool2 === true)

var bool3 = matcher2({
  age: 9
})

assert(bool3 === false)

var matcher3 = interpreter({
  age: {
    $lt: 10
  }
})

var bool4 = matcher3({
  age: 12
})

assert(bool4 === false)

var bool5 = matcher3({
  age: 9
})

assert(bool5 === true)

var matcher4 = interpreter({
  age: {
    $not: {
      $lt: 10
    }
  }
})

var bool6 = matcher4({
  age: 20
})

assert(bool6 === true)

var bool7 = matcher4({
  age: 9
})

assert(bool7 === false)

var bool8 = matcher4({
  age: 'hello'
})

assert(bool8 === true)
