const Process = require('./process.js')
const path = require('path')

class Environment {
  static filename(name) {
    if (!Process.environment) return null

    let object = path.parse(name)

    return path.format({
      name: object.name,
      ext: ['.' + Process.environment, object.ext].join('')
    })
  }
}

module.exports = Environment
