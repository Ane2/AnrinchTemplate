const System = require('./system.js')
const express = require('express')
const path = require('path')
const fs = require('fs')
const YAML = require('js-yaml')

const Pages = require('./pages.js')
const Access = require('./access.js')
const Assets = require('./assets.js')
const Locale = require('./locale.js')
const Extensions = require('./extensions.js')
const Themes = require('./themes.js')

const Flow = require('./flow.js')

const Util = require('./util.js')

const { Attr, Route } = require('./util.js')

const URL = require('url')

const Sandbox = require('./sandbox.js')
const Cheerio = require('cheerio')

const Environment = require('./environment.js')
const Transporter = require('./transporter.js')
const Mailer = require('./mailer.js')

class Site {
  constructor(...args) {
    this.directory = System.path.apply(System, args)

    this.name = path.parse(this.directory).base

    console.log('# Site setup ('+this.name+')')

    this.attribute = Attr.default(
      System.yaml.load('default', 'site.yaml'),
      System.yaml.load(this.directory, this.name + '.yaml'),
      System.yaml.load(this.directory, Environment.filename(this.name + '.yaml'))
    )

    this.extension = this.attribute.extension || {}

    this.access = new Access(this)
    this.locale = new Locale(this)
    this.pages = new Pages(this)
    this.themes = new Themes(this)

    this.transporter = new Transporter(this)
    this.mailer = new Mailer(this)

    this.route = {}
    this.unnamed_route = {}

    let route = '/'

    if (this.attribute.locale.enabled) {
      route += ':locale'
    }

    if (route !== '/') {
      route += '/'
    }

    this.unnamed_route.index = route
    this.unnamed_route.default = Route.default(route)

    route += this.name

    this.route.index = route
    this.route.default = Route.default(route)
  }

  use(flow) {
    this.flow = new Flow(flow)

    this.extensions = Extensions.construct(this)

    // TODO: Call asynchronously or in parallel the extensions callables.
    // Or push them to the flow, and make the flow able to call things async (with limit) (required) in parallel.

    this.flow.use('extension')

    if (this.attribute.cookie.enabled) {
      this.flow.use('cookies', (request, response) => {
        let middleware = require('cookie-parser')()

        middleware(request, response, () => {})
      })
    }

    // TODO: Do hard access and normal, access
    // (hard would prevent a request, normal would prevent component to execute and/or redirect,
    // render themed message)

    this.flow.use('access', (request, response, next) => {
      let access = this.attribute.access

      if (!access) {
        return next()
      }

      let driver = this.access.drivers[access.driver]

      if (!driver) {
        throw new Error('driver `' + access.driver + '` not found in `' + this.name + '`')
      }

      Promise.resolve(driver.middleware(request, response))
      .then(access => {
        next()
      })
      .catch(next)
    })

    this.flow.use('site', (request, response) => {
      request.site = this
      request.locale = request.params.locale
    })

    if (this.attribute.locale.enabled) {
      this.flow.use('locale', (...args) => {
        this.locale.middleware.apply(this, args)
      })
    }

    // this.flow.use('cached.render', (request, response) => {
    //
    // })

    this.flow.use('page', (request, response) => {
      // TODO: Make page inherit attributes per request from parent chain.

      let result = this.pages.fetch(request.path)

      if (result === null) {
        request.page = this.pages.default
        return // response.end('page default')
      }

      request.page = result.page

      let redirect = request.page.redirect
      let redirection_type = typeof redirect

      if (redirect && redirection_type === 'string') {
        return response.redirect(redirect)
      }

      let method = request.method.toUpperCase()

      if (redirect && redirection_type === 'object') {
        if (redirect.ifnot && Object.values(redirect.ifnot).indexOf(method) === -1) {
          return response.redirect(redirect.url)
        }

        if (redirect.if && Object.values(redirect.if).indexOf(method) > -1) {
          return response.redirect(redirect.url)
        }
      }

      request.params = result.params
    })

    this.flow.use('page.access', (request, response, next) => {
      // TODO: Figure out how to avoid access clash between application global, and page specific for index.yaml

      let page = request.page

      while (!page.attribute.access && page.parent) {
        page = page.parent
      }

      if (!page.parent && this.attribute.access) {
        return next()
      }

      let access = page.attribute.access

      if (!access) {
        return next()
      }

      let driver = this.access.drivers[access.driver]

      if (!driver) {
        throw new Error('driver `' + access.driver + '` not found in `' + this.name + '`')
      }

      Promise.resolve(driver.middleware(request, response))
      .then(access => {
        next()
      })
      .catch(next)
    })

    this.flow.use('page.extension', (request, response) => {
      let list = request.page.extension || {}
      let site_list = this.attribute.extension || {}

      for (let name in list) {
        let extension = this.extensions[name]

        if (!extension) continue

        let attribute = Attr.defaultdeep(
          extension.attribute,
          site_list[name],
          list[name]
        )

        if (attribute.enabled) {

          let sandbox = Object.assign({}, extension.sandbox)

          sandbox.Flow = request.flow
          sandbox.self.argument = attribute.args || {}
          sandbox.self.attribute = attribute
          sandbox.require = Sandbox.Require(path.join(this.directory, 'module'))

          sandbox.Site = this
          sandbox.Mailer = this.mailer

          // TODO: Think about adding options here?
          extension.script.runInNewContext(sandbox)

          let request_function = sandbox.Request || null

          if (request_function) {
            request.flow.after('page.extension', attribute.namespace || name, request_function)
          }

          for (let name in this.themes.list) {
            let theme = this.themes.list[name]

            theme.templates.extend(extension.templates)
          }
        }
      }
    })

    this.flow.use('component', (request, response) => {
      if (!request.page || request.page.component === null) return

      let component = request.page.component

      request.component = {}

      // TODO: Replace flow for components to Promise chain with ability to synchronize or asynchronize.
      // sync(async) -> next -> sync(async) -> next -> async, async (parallel) -> finish

      request.component.method = null
      request.component.result = null
      request.component.flow = new Flow
      request.component.error = null

      // TODO: Simulate sandbox, on page init per page basis, if possible and this is
      // will be not performent enough.

      request.component.sandbox = {
        Request: request,
        Response: response,
        Component: {},
        Query: request.query,
        Param: request.params,
        Form: request.body || {},
        Flow: request.flow,
        Template: Sandbox.Template,
        View: {},
        Site: request.site,
        Mailer: this.mailer,

        Api: require('./api.js'),

        // TODO: Add Page and or Url's object.

        require: Sandbox.Require(path.join(this.directory, 'module')),

        console: console
      }

      component.script.runInNewContext(request.component.sandbox, {
        lineOffset: 0,
        columnOffset: 0,
        timeout: 30000,
        contextName: 'ComponentSandbox'
      })

      if (typeof request.component.sandbox.Component === 'function') {
        request.component.method = request.component.sandbox.Component
      } else {
        let method = request.component.sandbox.Component[request.method.toLowerCase()]

        if (!method) return

        request.component.method = method
      }
    })

    this.flow.use('component.result', (request, response, next) => {
      if (!request.component || !request.component.method) return next()


      request.component.sandbox.Form = request.body || {}

      Promise.resolve(request.component.method())
      .then(result => {
        request.component.result = result
        next()
      })
      .catch(e => {
        console.log(e)
        request.component.error = e
        next()
      })
    })

    this.flow.use('theme', (request, response) => {
      request.theme = this.themes.get()

      if (request.theme === null) {
        response.end('No themes found, seems like your application has not been yet setted up! For more information visit <>')
      }
    })

    this.flow.use('view', (request, response) => {
      const Application = require('./application.js')

      request.view = {}

      request.view.error = {}

      request.view.meta = {
        title: request.site.title(request),
        description: request.site.description(request),
        sitename: this.attribute.title || 'noname @ sitename.yaml'
      }

      let date = new Date()

      request.view.date = {
        full_year: date.getFullYear()
      }

      request.view.form = request.body || {}
      request.view.query = request.query
      request.view.param = request.params

      request.view.component = {}


      if (request.component) {
        if (request.component.error) {
          request.view.error.message = request.component.error.message
        }

        request.view.component = request.component.sandbox.View
      }

      request.view.locale = {}

      request.view.locale.name = request.view.locale.tag = request.locale || request.site.attribute.locale.default

      let [language, region] = request.view.locale.tag.split('-')

      request.view.locale.language = language
      request.view.locale.region = region || language

      request.view.string = request.site.locale.get(request.view.locale.tag)

      let language_list = request.site.locale.list
      let languages = request.view.languages = new Array(language_list.length)

      for (let index in language_list) {
        let language = language_list[index]
        let result = language

        if (language.name === request.view.locale.tag) {
          result = Object.assign({}, result)
          result.selected = true
        }

        languages[index] = result
      }

      request.view.locale.tag = Locale.format(request.view.locale.tag)

      // let host = URL.parse(request.hostname)

      request.view.self = {}
      request.view.self.path = request.url
      request.view.self.fullpath = request.full_url

      request.view.self.hostname = request.hostname
      request.view.self.protocol = Application.attribute.https.enabled ? 'https' : 'http'
      request.view.self.domain = this.attribute.domain

      let method = request.method.toUpperCase()

      request.view.self.method = {
        GET: method === 'GET',
        POST: method === 'POST'
      }

      request.view.theme = {}
      request.view.theme.path = request.theme.assets

      request.view.extension = {}

      request.view.error = Object.keys(request.view.error).length ? request.view.error : null

      request.view.page = {}

      request.view.page.type = request.page ? request.page.attribute.type : 'website'
    })

    this.flow.use('template', (request, response) => {
      try {
        let component_template

        if (request.component) {
          let result = request.component.result
          if (result instanceof Sandbox.Template) {
            component_template = result.findIn(request.theme.templates.list)
          }
        }

        let component_error

        if (request.component && request.component.error) {
          let filename = [request.page.template, 'exception'].join('.')
          try {
            component_error = request.theme.template(filename)
          } catch(e) {

          }
        }

        request.template = component_error || (component_template || request.theme.template(request.page.template))
      } catch(e) {
        throw new Error('TEMPLATE_NOT_FOUND: ' + path.join(request.theme.directory.replace(process.cwd(), ''), 'template', request.page.template) + '.html')
      }
    })

    this.flow.use('render', (request, response) => {
      request.render_result = request.theme.render(request.template, request.view, request.theme.templates.list)
    })

    // this.flow.use('cache', (request, response) => {
    //
    // })

    this.flow.use('response', (request, response) => {
      // TODO: Move cheerio to its own flow function.

      response.type('text/html; charset=utf-8')

      if (request.locale) {
        let result = Cheerio.load(request.render_result)
        let is_absolute = new RegExp('^(?:[a-z]+:)?//', 'i')

        result('a').each(function() {
          let element = result(this)
          let url = element.attr('href')

          if (is_absolute.test(url) || element.attr('rel') === 'plain') return

          element.attr('href', '/' + request.locale + url)
        })

        response.status(request.page.attribute.status || 404).end(result.html())
      } else {
        response.status(request.page.attribute.status || 404).end(request.render_result)
      }

    })

    let extensions = this.attribute.extension || {}

    for (let name in this.extensions) {
      let extension = this.extensions[name]

      if (!extension) continue

      let attribute = Attr.default(
        extension.attribute,
        extensions[extension.name]
      )

      if ((attribute.global && attribute.enabled && extension.script) || (attribute.local && attribute.enabled && extension.script)) {

        let sandbox = Object.assign({}, extension.sandbox)

        sandbox.Flow = this.flow
        sandbox.self.argument = attribute.args || {}
        sandbox.self.attribute = attribute
        sandbox.require = Sandbox.Require(path.join(this.directory, 'module'))

        sandbox.Site = this
        sandbox.Mailer = this.mailer

        // TODO: Think about adding options here?
        extension.script.runInNewContext(sandbox)

        let request_function = sandbox.Request || null

        if (request_function) {
          this.flow.after('extension', name, request_function)
        }

        for (let name in this.themes.list) {
          let theme = this.themes.list[name]

          theme.templates.extend(extension.templates)
        }
      }
    }

  }

  bind(router, route) {
    router.use(route.index, (...args) => { this.run.apply(this, args) })
    router.use(route.default,  (...args) => { this.run.apply(this, args) })
    router.use(route.index, (e, request, response, next) => this.exception.call(this, e, request, response, next))
    router.use(route.default, (e, request, response, next) => this.exception.call(this, e, request, response, next))
  }

  exception(e, request, response, next) {
    // If exception and has theme, do it via templating.
    // If exception raised in system, use system templating and render
    // Otherwise use hard defined style, if its deep internal error

    // console.log(e)

    if (request.site) {
      try {
        let page = this.pages.exception

        let theme = request.theme || this.themes.get()

        let template = theme.template(page.template)

        request.flow.fetch('theme').callable.call(request.site, request, response)
        request.flow.fetch('view').callable.call(request.site, request, response)

        request.view.error = {}
        request.view.error.message = e.message

        let render_result = theme.render(template, request.view, theme.templates.list)

        let result = Cheerio.load(render_result)
        let is_absolute = new RegExp('^(?:[a-z]+:)?//', 'i')

        result('a').each(function() {
          let element = result(this)
          let url = element.attr('href')

          if (is_absolute.test(url) || element.attr('rel') === 'plain') return

          element.attr('href', '/' + request.locale + url)
        })

        response.type('text/html; charset=utf-8')
        response.status(page.attribute.status || 404).end(result.html())

        console.log('response statused')
      } catch(unsuccessful_try) {
        console.log('the try', unsuccessful_try)
        response.end(e.message)
      }
    } else {
      response.end(e.message)
    }
  }

  run(request, response, request_next) {
    let flow = request.flow = new Flow(this.flow)

    let instruction = flow.fetch(flow.first.name)

    let next = (exception) => {
      if (exception) return request_next(exception)

      if (!instruction) return finish()

      let callable = instruction.callable || null

      if (!callable) {
        instruction = instruction.next ? flow.fetch(instruction.next.name) : null

        return next()
      }

      if (callable.length === 3) {
        try {

          callable(request, response, (e) => {
            if (e) {
              return next(e)
            }

            instruction = flow.instruction[instruction.name] || instruction
            instruction = instruction.next ? flow.fetch(instruction.next ? instruction.next.name : null) : null

            next()
          })

        } catch(e) {
          console.log(e)
          next(new Error(instruction.name + ' called error: ' + e.message))
        }
      } else {
        Promise.resolve(callable(request, response))
        .then((result) => {
          if (response.headersSent || result) return finish(result)

          instruction = flow.instruction[instruction.name] || instruction
          instruction = instruction.next ? flow.fetch(instruction.next ? instruction.next.name : null) : null

          next()
        })
        .catch(next)
      }
    }

    let finish = (result) => {
      flow.destroy()

      if (!response.headersSent && !result) {
        throw new Error('No result from site stack!')
      }
    }

    next()
  }

  title(request) {
    let page = request.page

    // NOTE: This check should be gone if we define our default page finally!
    if (page === null) {
      return 'Broken Page' + ' | ' + request.site.attribute.title
    }

    let locale = request.locale || null

    let title = page.attribute.title
    let type = typeof title

    let result = []

    if (title && type === 'object') {
      let keys = Object.keys(title)

      title = title[locale] || title[keys[0]]

      if (typeof title === 'object') {
        title = Object.values(title)
      }
    }

    if (type === 'undefined' || !title) {
      result.push('undefined @ ' + page.directory)
      result.push(request.site.name)
    }

    if (title && Array.isArray(title)) {
      result = title
    } else if(title) {
      result.push(title)
    }

    // TODO: Add parent $parent reference to titles :) that replaces
    // the title and does all that above ^
    // NOTE: Probably being bestif above code could be per page basis on request.
    // And then replaced & colated.

    return result.join(' - ') + ' – ' + request.site.attribute.title
  }

  description(request) {
    let page = request.page
    let locale = request.locale || null

    // NOTE: This check should be gone if we define our default page finally!
    if (page === null) {
      return 'Broken Page' + ' – ' + request.site.attribute.title
    }

    let description = page.attribute.description
    let type = typeof description

    if (description && type === 'object') {
      let keys = Object.keys(description)
      description = description[locale] || description[keys[0]]
    }

    if (!description) {
      description = request.site.attribute.description
    }

    if (description && typeof description === 'object') {
      let keys = Object.keys(description)
      description = description[locale] || description[keys[0]]
    }

    if (!description) {
      return null
    }

    return description
  }
}

module.exports = Site
