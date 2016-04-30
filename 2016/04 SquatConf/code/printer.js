var fs = require('fs')
var Printer = require('ipp-printer')

var printer = new Printer('SquatConf')

printer.on('job', function (job) {
  console.log('Received new job (id: %d) named: %s', job.id, job.name)

  var filename = 'printjob-' + job.id + '.ps' // PostScript
  var file = fs.createWriteStream(filename)

  job.pipe(file)

  job.on('end', function () {
    console.log('--> written ' + filename)
  })
})
