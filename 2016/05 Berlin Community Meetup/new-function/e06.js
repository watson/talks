var src = '\n"Hello World"\n'

var fn = new Function('return (' + src + ')')

console.log(fn())
