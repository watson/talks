var n = 2
var src = '2 * ' + n

var fn = new Function('return (' + src + ')')

console.log(fn())
