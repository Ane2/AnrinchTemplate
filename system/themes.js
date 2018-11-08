const path = require('path')
const fs = require('fs')

const Theme = require('./theme.js')

class Themes {
  constructor(site) {
    this.directory = path.join(site.directory, 'themes')

    this.default = null

    this.list = {}

    for (let name of fs.readdirSync(this.directory)) {
      if (!fs.statSync(path.join(this.directory, name)).isDirectory()) continue

      let theme = new Theme(this.directory, name, site)

      if (name === site.attribute.pages.theme) {
        this.default = theme
      }

      this.list[name] = theme
    }
  }

  get(name = null) {
    if (name === null && this.default) {
      return this.default
    }

    let theme = this.list[name]

    if (theme) {
      return theme
    }

    if (this.default === null) {
      let keys = Object.keys(this.list)

      if (keys.length) {
        return this.list[keys[0]]
      }

      return null
    }

    return null
  }
}

module.exports = Themes
