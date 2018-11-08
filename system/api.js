const Request = require('request-promise')
const url = require('url')
const path = require('path')

class Api {
  constructor(host, ...pathnames) {
    this.request = {}

    this.request.headers = {}

    this.request.headers['Content-type'] = 'application/json'

    this.path = {}

    this.path.host = host
    this.path.protocol = 'http'
    this.path.pathname = pathnames.join('/')

    this.request.json = true
  }

  header(key, value) {
    this.request.headers[key] = value
  }

  secure(is_secure = true) {
    this.path.protocol = is_secure ? 'https' : 'http'
    return this
  }

  form(...data) {
    switch (data.length) {
      case 1:
      if (this.request.json) throw new Error('Could not set API Form object, seems like its already set')

      let [obj] = data

      this.request.json = obj
      break

      case 2:
      if (typeof this.request.json !== 'object') {
        this.request.json = {}
      }

      let [key, value] = data

      this.request.json[key] = value
      break

      default:
      throw new Error('Api Form requires (string key, any value) or (object data)')
      break
    }

    return this
  }

  query(...data) {
    switch (data.length) {
      case 1:
      if (this.path.query) throw new Error('Could not set API Query object, seems like its already set')

      let [obj] = data

      this.path.query = obj
      break

      case 2:
      if (!this.path.query) {
        this.path.query = {}
      }

      let [key, value] = data

      this.path.query[key] = value
      break

      default:
      throw new Error('Api Query requires (string key, any value) or (object data)')
      break
    }

    return this
  }

  async get() {
    this.request.uri = url.format(this.path)
    this.request.method = 'GET'

    return Request(this.request)
  }

  async post() {
    this.request.uri = url.format(this.path)
    this.request.method = 'POST'

    return Request(this.request)
  }

  // TODO: Add rest of the methods
}

module.exports = Api
