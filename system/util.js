const fs = require('fs')
const path = require('path')
const URL = require('url')

module.exports.findInDirSync = (directory, recursion = false) => {
  let elements = []

  for(let element of fs.readdirSync(directory)){
    let stat = fs.statSync(path.join(directory, element))

    // console.log(stat)
  }
}

module.exports.normalize_middleware = (request, response, next) => {
  let url = URL.parse(request.full_url)

  let pathname = url.pathname.replace(/[\/\\]+/g, '/')

  if (pathname === '/') {
    if (pathname !== url.pathname) {
      return response.redirect('/')
    }

    return
  }

  if (url.pathname !== pathname) {
    return response.redirect(URL.format({ pathname: pathname, query: request.query }))
  }
}

module.exports.Attr = require('./util/attr.js')

module.exports.Route = {
  default: (route) => {
    if (route.lastIndexOf('/') === 0 && route.length === 1) {
      route = '*'
    } else {
      if (route.lastIndexOf('/') !== route.length - 1) {
        route += '/'
      }

      route += '*'
    }

    return route
  }
}

module.exports.trim = (string) => {
  return string.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '')
}

module.exports.select = (array, values) => {
  for (let element of array) {
    for (let key in element) {
      if (values.indexOf(key) === -1) {
        delete element[key]
      }
    }
  }

  return array
}
