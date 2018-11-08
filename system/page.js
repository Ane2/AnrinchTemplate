const path = require('path')
const URL = require('url')
const fs = require('fs')
const YAML = require('js-yaml')
const markdown = require('front-matter')

const Application = require('./application.js')
const System = require('./system.js')

const { Attr } = require('./util.js')

const Parser = require('path-to-regexp')
const vm = require('vm')

const Environment = require('./environment.js')

class Page {
  constructor(absolute_path, pages, site) {
    this.attribute = Attr.default(
      System.yaml.load('default', 'page.yaml'),
      System.yaml.load(absolute_path),
      System.yaml.load(Environment.filename(absolute_path))
    )

    this.extension = this.attribute.extension || {}

    this.absolute_path = absolute_path
    this.directory = this.id = absolute_path.replace(path.join(pages.directory, '/'), '')

    this.id = this.id.replace(/\\/g, '/')

    let path_result = path.parse(this.directory)

    this.template = this.attribute.template || path.join(path_result.dir, path_result.name).replace(/\\/g, '/')

    this.route = this.attribute.route || null

    if (path_result.name === 'index') {
      this.route = this.route || this.normalize_directory(this.directory)
    } else {
      this.route = this.route || this.normalize(this.directory)
    }

    this.expressions = []

    if (typeof this.route === 'object') {
      let keys = Object.keys(this.route)

      for (let key of keys) {
        let route = this.route[key]
        let expression = {}

        expression.keys = []
        expression.pattern = Parser(route, expression.keys)

        this.expressions.push(expression)
      }
    } else {
      let expression = {}

      expression.keys = []
      expression.pattern = Parser(this.route, expression.keys)

      this.expressions.push(expression)
    }

    let component = path.join(site.directory, 'component', (this.attribute.component || this.normalize_component(this.directory) || this.template))

    let component_extension = path.parse(component).ext
    if (component_extension === '') {
      component += '.js'
    }

    let component_filename = '/' + site.name + component.replace(site.directory, '').replace(/\\/g, '/')


    if (component && fs.existsSync(component)) {
      this.component = {
        script: new vm.Script(fs.readFileSync(component, 'utf-8')),
        filename: component_filename
      }
    } else {
      this.component = null
    }

    this.redirect = this.attribute.redirect || null

    if (this.attribute.parent) {
      this.parent = path.join(pages.directory, this.attribute.parent)

      if (!fs.existsSync(this.parent)) {
        this.parent = null
      } else {
        this.parent = this.parent.replace(path.join(pages.directory, '/'), '').replace(/\\/g, '/')
      }
    } else {
      this.parent = path.resolve(this.absolute_path, '..')

      if (path.join(this.parent, 'index.yaml') === this.absolute_path && this.parent !== pages.directory) {
        this.parent = path.resolve(this.parent, '..')
      }

      while (!fs.existsSync(path.join(this.parent, 'index.yaml'))) {

        if (this.parent === pages.directory) {
          break
        }

        this.parent = path.resolve(this.parent, '..')

        break
      }

      let final = path.join(this.parent, 'index.yaml')

      if (!fs.existsSync(final)) {
        this.parent = null
      } else {
        if (final === this.absolute_path) {
          this.parent = null
        } else {
          this.parent = final.replace(path.join(pages.directory, '/'), '').replace(/\\/g, '/')
        }
      }
    }

  }

  normalize_component(route) {
    let base = path.parse(route)

    let result = []

    if (base.dir === '/') {
      result.push(base.name)
    } else {
      result.push(base.dir)
      result.push(base.name)
    }

    return result.join('/').replace(/[:]/g, '')
  }

  normalize(route) {
    let base = path.parse(route)
    return URL.parse(path.join('/', base.dir.toLowerCase(), base.name.toLowerCase())).pathname
  }

  normalize_directory(route) {
    let base = path.parse(route)
    return URL.parse(path.join('/', base.dir.toLowerCase())).pathname
  }

  match(url, locale_tag) {
    // TODO: Wonder how to skip pattern matching for multiple routes.

    for (let expression of this.expressions) {
      let result = expression.pattern.exec(url)

      if (result) return {
        result: result,
        keys: expression.keys
      }
    }

    return null
  }

  title() {
    // TODO: Add page specific functions like title, description or similiar.
    return this.attribute.title
  }
}

module.exports = Page
