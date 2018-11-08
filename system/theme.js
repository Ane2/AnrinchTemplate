const path = require('path')
const Templates = require('./templates.js')
const Mustache = require('mustache')
const Assets = require('./assets.js')
const System = require('./system.js')

class Theme {
  constructor(directory, name, site) {
    this.directory = path.join(directory, name)
    this.name = name

    this.templates = new Templates(this)

    this.assets = Assets.add(this, site)

    // console.log('Theme ('+name+') directory:', this.directory)
  }

  render(template, view, partials = null) {
    return Mustache.render(template, view, partials)
  }

  template(name) {
    return (this.templates.list[name] || require(System.path(this.directory, 'template', name)))
  }
}

module.exports = Theme
