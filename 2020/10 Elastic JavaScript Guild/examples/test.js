'use strict'

const interpreter = require('./generated')
const assert = require('assert')

const matcher = interpreter({
  hello: {
    $eq: 'world'
  }
})

const bool = matcher({
  hello: 'world'
})

assert(bool === true)

const bool1 = matcher({
  hello: 'verden'
})

assert(bool1 === false)

const matcher2 = interpreter({
  age: {
    $gt: 10
  }
})

const bool2 = matcher2({
  age: 12
})

assert(bool2 === true)

const bool3 = matcher2({
  age: 9
})

assert(bool3 === false)

const matcher3 = interpreter({
  age: {
    $lt: 10
  }
})

const bool4 = matcher3({
  age: 12
})

assert(bool4 === false)

const bool5 = matcher3({
  age: 9
})

assert(bool5 === true)

const matcher4 = interpreter({
  age: {
    $not: {
      $lt: 10
    }
  }
})

const bool6 = matcher4({
  age: 20
})

assert(bool6 === true)

const bool7 = matcher4({
  age: 9
})

assert(bool7 === false)

const bool8 = matcher4({
  age: 'hello'
})

assert(bool8 === true)
