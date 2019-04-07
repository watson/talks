var express = require('express')
var bodyParser = require('body-parser')

var app = express()

app.use(function (req, res, next) {
  console.log(req.method, req.url)
  next()
})

app.use(bodyParser.json())

app.post('/signup', function singupRoute (req, res) {
  save(req.body, function onSave (err, user) {
    if (err) return res.status(500).send('Error: ' + err.message)
    res.end('Welcome ' + user.name.first)
  })
})

app.get('/abort', function abortRoute (req, res) {
  process.abort()
})

app.listen(3000, function () {
  console.log('Server is listening on port 3000')
})

function save (user, cb) {
  // pretend that we save the user
  setTimeout(function () {
    cb(null, user)
  }, 10)
}
