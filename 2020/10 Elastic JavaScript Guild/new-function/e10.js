var util = require('util')

var n = 'console.log("owned")'
var src = util.format('2 * %j', n)

var fn = new Function('return (' + src + ')')

console.log(fn())
