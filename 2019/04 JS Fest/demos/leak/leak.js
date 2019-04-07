'use strict'

const { createServer } = require('http')
const { writeHeapSnapshot } = require('v8')
const processRequest = require('./lib/process-request')

const server = createServer((req, res) => {
  processRequest(req, (err, response) => {
    if (err) {
      res.writeHead(500)
      res.end()
      return
    }
    res.end(response)
  })
})

server.listen(3000, () => {
  console.log('Server listening on port 3000')
})

process.on('SIGUSR2', () => {
  if (global.gc) global.gc()
  console.log('Heap snapshot written:', writeHeapSnapshot())
})
