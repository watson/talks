var crypto = require('crypto')
var http = require('http')

var server = http.createServer(function (req, res) {
  if (Math.random() > 0.5) foo(res)
  else bar(res)
})
  
server.listen(3000, function () {
  console.log('Server is listening on port 3000')
})

function foo (res) {
  var key = crypto.pbkdf2Sync('secret', 'salt', 100000, 512, 'sha512')
  res.end(key.toString('hex'))
}

function bar (res) {
  var key = crypto.pbkdf2Sync('secret', 'salt', 100000, 512, 'sha512')
  res.end(key.toString('hex'))
}
