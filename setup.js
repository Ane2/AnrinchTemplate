const path = require('path')
const fs = require('fs')
const Attribute = require(path.resolve(__dirname, 'system/util/attr.js'))
const System = require(path.resolve(__dirname, 'system/system.js'))

const Process = require('./system/process')
const Environment = require('./system/environment.js')

let application = Attribute.default(
  System.yaml.load('./default/application.yaml'),
  System.yaml.load('./application/application.yaml'),
  System.yaml.load('./application/', Environment.filename('application.yaml'))
)

const http = require('http')

if (process.env.fallback) {
  const server = http.createServer((request, response) => {
    response.end('fallback server')
  })

  server.listen(application.http.port, application.http.host)

  console.log('\x1b[32m\# Fallback online: '+process.pid+'\x1b[0m')
} else {
  const Process = require('./system/process')

  const Flow = new (require('./system/flow.js'))

  const express = require('express')
  const Application = require('./system/application.js')

  // const Logger = require('./system/logger.js')
  const Util = require('./system/util.js')

  const http = require('http')
  const https = require('https')

  const instance = express()

  Flow.use('request', (...args) => {
    Util.normalize_middleware.apply(null, args)
  })

  Application.use(Flow, instance)

  if (application.https.enabled) {
    let options = {}

    let key = path.join(process.cwd(), application.https.key || '/application/certificate.key')
    let certificate = path.join(process.cwd(), application.https.certificate || '/application/certificate.pem')

    if (fs.existsSync(key)) {
      options.key = fs.readFileSync(key)
    }

    if (fs.existsSync(certificate)) {
      options.cert = fs.readFileSync(certificate)
    }

    let mirror = https.createServer(options, instance).listen(application.https.port, application.https.host, () => {
      console.log('\x1b[36mMirror (https) pid ('+process.pid+') listening on '+mirror.address().address+':'+mirror.address().port + '\x1b[0m')
    })

  } else {
    let mirror = http.createServer(instance).listen(application.http.port, application.http.host, () => {
      console.log('\x1b[36mMirror (http) pid ('+process.pid+') listening on '+mirror.address().address+':'+mirror.address().port + '\x1b[0m')
    })
  }
}
