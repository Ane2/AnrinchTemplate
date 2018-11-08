const express = require('express')
const fs = require('fs')
const System = require('./system.js')
const Site = require('./site.js')
const Locale = require('./locale.js')
const path = require('path')

const Access = require('./access.js')
const Assets = require('./assets.js')

const { Attr } = require('./util.js')

const Flow = require('./flow.js')

const Process = require('./process.js')
const Environment = require('./environment.js')

class Application {
  constructor(){
    this.environment = Process.environment

    this.directory = System.path('application')

    this.attribute = Attr.default(
      System.yaml.load('default', 'application.yaml'),
      System.yaml.load(this.directory, 'application.yaml'),
      System.yaml.load(this.directory, Environment.filename('application.yaml'))
    )

    Assets.addDirectory(path.join(this.directory, 'assets'))

    this.sites_directory = System.path(this.attribute.multisite.directory)

    this.default = new Site('application')

    // TODO: Add access route regular expression handlers

    if (this.attribute.admin.enabled) {
      this.admin = new Site(this.attribute.admin.directory)
    }

    this.sites = []

    if (this.attribute.multisite.enabled) {
      for (let directory of fs.readdirSync(this.sites_directory)) {
        let stat = fs.statSync(path.join(this.sites_directory, directory))

        if (!stat.isDirectory()) continue

        this.sites.push(new Site('application', 'sites', directory))
      }
    }
  }

  use(flow, router) {
    router.use((request, response, next) => {
      request.full_url = request.url

      next()
    })

    flow.use('assets', async (request, response) => {
      return await Assets.middleware(request, response)
    })

    if (this.attribute.admin.enabled) {
      this.admin.use(flow)
      this.admin.bind(router, this.admin.route)
    }

    for (let site of this.sites) {
      site.use(flow)
      site.bind(router, site.route)
    }

    this.default.use(flow)
    this.default.bind(router, this.default.unnamed_route)

    router.use((...args) => this.default.run.apply(this.default, args))
    router.use((e, request, response, next) => this.default.exception.call(this.default, e, request, response, next))

    // this.router.use((...args) => { Assets.middleware.apply(Assets, args) })
  }

}

module.exports = new Application
