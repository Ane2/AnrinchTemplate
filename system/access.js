const path = require('path')
const fs = require('fs')
const vm = require('vm')

class AccessInterface {
  constructor(configuration) {
    this.config = configuration
  }

  async middleware() {
    throw new Error('Access driver middleware for class `' + this.constructor.name + '` is undefined')
  }
}

class Access {
  constructor(site) {
    this.directory = path.join(site.directory, 'access')

    this.drivers = {}

    if (fs.existsSync(this.directory)) {
      for (let filename of fs.readdirSync(this.directory)) {
        let format = path.parse(filename)

        if (['.js'].indexOf(format.ext) === -1) {
          continue
        }

        let sandbox = {}

        sandbox.Access = AccessInterface
        sandbox.module = {}

        let script = fs.readFileSync(path.join(this.directory, filename))

        vm.runInNewContext(script, sandbox)

        if (!(new sandbox.module.exports instanceof AccessInterface)) {
          throw new Error('Access class extension in `' + path.join(site.name, this.directory.replace(site.directory, ''), filename) + '` is required to `extends Access`')
        }

        this.drivers[format.name] = new sandbox.module.exports(site)
      }
    }
  }
}

module.exports = Access
