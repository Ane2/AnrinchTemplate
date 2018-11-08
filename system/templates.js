const Walker = require('walk')
const System = require('./system.js')
const path = require('path')
const fs = require('fs')

require.extensions['.html'] = (module, filename) => {
  // TODO: Extend with own template engine, if supplied.
  module.exports = fs.readFileSync(filename, 'utf-8')
}

class Templates {
  constructor(theme) {
    // console.log('templates list for:', theme.directory)

    this.list = {}


    this.walker = (directory) => {
      let templates = []

      Walker.walkSync(directory, {
        listeners: {

          file: (root, stats) => {
            let file = path.parse(stats.name)
            if (['.html'].includes(file.ext)) {
              templates.push(path.join(root, file.name))
            }

          }

        }
      })

      return templates
    }

    let directory = System.path(theme.directory, 'template', '/')

    for (let root of this.walker(directory)) {
      let template = root.replace(directory, '').replace(/\\/g, '/')

      this.list[template.toLowerCase()] = require(root)
    }
  }

  extend(list) {
    for (let key in list) {
      this.list[key] = list[key]
    }
  }
}

module.exports = Templates
