const path = require('path')
const URL = require('url')
const fs = require('fs')
const querystring = require('querystring')
const System = require('./system.js')

class Locale {
  constructor(site) {
    this.directory = path.join(site.directory, 'locale')

    let result = fs.readdirSync(this.directory)

    result = result.filter((locale, index, array) => {
      let result = path.parse(locale)
      let match = result.name.match(/[a-z]+\-[a-zA-Z]+/)

      if (!match) {
        match = result.name.match(/[a-z]+/)
      }

      return ['.yaml'].includes(result.ext) && match && match.index === 0 && match[0].length === result.name.length
    })

    this.locales = {}
    this.list = []

    for (let locale of result) {
      let result = path.parse(locale)
      let name = this.normalize(result.name)

      this.locales[name] = System.yaml.load(this.directory, locale)

      let data = {}
      data.name = name

      let [language, region] = name.split('-')

      data.language = language
      data.region = region || language

      data.tag = Locale.format(name)

      this.list.push(data)
    }

    this.default = this.normalize(site.attribute.locale.default)
  }

  normalize(name = '') {
    let split = name.replace(/[\-\_\s]+/, '-').split('-')

    if (split.length === 1) return name.toLowerCase()

    return [split[0].toLowerCase(), split[1].toLowerCase()].join('-')
  }

  middleware(request, response) {
    // TODO: Get the locale of ip address range?

    let result = URL.parse(request.full_url)

    let split = result.pathname.split('/').filter((value) => {
      return value !== ''
    })

    if (!this.locale.isValid(request.locale)) {
      if (!this.locale.isValid(this.locale.default)) {
        return response.end('Locale default is not valid! ('+this.locale.default+')')
      }

      let format = URL.format({
        pathname: '/' + this.locale.default + '/' + split.join('/'),
        query: request.query
      })

      return response.redirect(format)
    }

    split.splice(0, 1)

    let predicted_url = URL.format({
      pathname: '/' + request.locale + '/' + split.join('/'),
      query: request.query
    })

    if (request.full_url !== predicted_url) {
      return response.redirect(predicted_url)
    }
  }

  isValid(locale) {
    return this.locales.hasOwnProperty(locale)
  }

  get(locale = null) {
    if (locale === null) {
      return this.locales[this.default]
    }

    locale = this.normalize(locale)

    if (!this.isValid(locale)) {
      return this.locales[this.normalize(this.default)]
    }

    return this.locales[locale]
  }

  stringify(needle, document) {
    if (typeof document === 'string' || !needle) return document
    return document[needle]
  }

  static format(tag) {
    let [language, region] = tag.match(/[a-zA-Z0-9]+/g)

    return language.toLowerCase() + '_' + region.toUpperCase()
  }
}

module.exports = Locale
