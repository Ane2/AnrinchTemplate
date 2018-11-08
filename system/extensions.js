const path = require('path')
const fs = require('fs')
const Extension = require('./extension.js')

class File {
  static parse(name) {

    return new class {
      constructor() {
        this.extensions = []

        this.object = path.parse(name)

        while (this.object.ext.length) {
          this.extensions.unshift(this.object.ext)
          this.object = path.parse(this.object.name)
        }

        this.name = this.object.name
        this.filename = this.object.name + this.extensions.join('')
      }

      ends(extension, remove = false) {
        let index = this.extensions.indexOf(extension)

        if (index === -1 || index !== this.extensions.length - 1) return false

        if (remove) {
          this.extensions.splice(index, 1)
          this.filename = this.name + this.extensions.join('')
        }

        return true
      }
    }
  }

}

class Extensions {

  static construct(site) {
    let application = require('./application.js')

    let directory = path.join(site.directory, 'extension')
    let application_directory = path.join(application.default.directory, 'extension')

    let table = {}

    if (application.default !== site && fs.existsSync(application_directory)) {
      for (let extension of Extensions.readdir(application_directory)) {
        let object = new Extension(extension.directory, extension.filename, {
          local: false
        })

        table[object.name] = object
      }
    }

    if (fs.existsSync(directory)) {
      for (let extension of Extensions.readdir(directory)) {
        let object = new Extension(extension.directory, extension.filename,
          {
            local: true
          }
        )

        let found = table[object.name]

        if (found) {
          object.use(found)
        }

        table[object.name] = object
      }
    }

    return table
  }

  static readdir(directory) {
    let result = []
    let found = []

    for (let name of fs.readdirSync(directory)) {
      let p = path.join(directory, name)
      let extension = fs.statSync(p)

      if (extension.isDirectory()) {
        result.push({directory: p, filename: name})
        continue
      }

      let file = File.parse(name)

      if (found.indexOf(file.name) > -1) {
        continue
      }

      found.push(file.name)

      if (file.ends('.yaml') || file.ends('.js')) {
        result.push({directory, filename: file.name})
      }
    }

    return result
  }

}

module.exports = Extensions
