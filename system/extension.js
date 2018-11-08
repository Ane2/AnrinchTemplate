const fs = require('fs')
const path = require('path')
const vm = require('vm')
const Sandbox = require('./sandbox.js')

const Environment = require('./environment.js')
const { Attr } = require('./util.js')
const System = require('./system.js')

const Walker = require('walk')

class Extension {
  constructor(directory, name, options = {}) {
    // TODO: Name mapping for default names? Or with space, dash/underline to match same folder name

    this.name = name

    this.sandbox = {}

    this.sandbox.Extension = null
    this.sandbox.Logger = null

    this.sandbox.console = console

    this.sandbox.Api = require('./api.js')

    this.sandbox.self = {}
    this.sandbox.self.directory = directory
    this.sandbox.self.name = name
    this.sandbox.self.require = Sandbox.Require(this.directory)

    this.sandbox.setTimeout = setTimeout

    this.attribute = this.sandbox.self.attribute = Attr.default(
      {
        global: false,
        enabled: true,
        local: options.local,
        namespace: null
      },
      System.yaml.load(directory, name + '.yaml'),
      System.yaml.load(directory, Environment.filename(name + '.yaml'))
    )

    let pathname = path.join(directory, name + '.js')

    this.script = fs.existsSync(pathname) ? new vm.Script(fs.readFileSync(pathname)) : null

    this.templates = {}

    let templates = []

    let walker = Walker.walkSync(directory, {
      listeners: {

        file: (root, stats) => {
          let file = path.parse(stats.name)
          if (['.html'].includes(file.ext)) {
            templates.push(path.join(root, file.name))
          }
        }

      }
    })

    for (let root of templates) {
      let template = root.replace(path.join(directory, '/'), '').replace(/\\/g, '/')

      let namespace = []

      namespace.push('extension')

      if (this.attribute.namespace) {
        namespace.push(this.attribute.namespace)
      }

      namespace.push(template.toLowerCase())

      this.templates[path.join.apply(null, namespace).replace(/\\/g, '/')] = require(root)
    }
  }

  use(extension) {
    this.attribute = this.sandbox.self.attribute = Attr.default(
      extension.attribute,
      this.attribute
    )

    this.script = this.script || extension.script

    // TODO: Add to templates, templates used by this extension.
  }
}

module.exports = Extension
