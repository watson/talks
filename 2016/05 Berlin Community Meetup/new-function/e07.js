var src = 'n + 1'

var fn = new Function('n', 'return (' + src + ')')

console.log(fn(1))
