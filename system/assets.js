const express = require('express')
const path = require('path')
const fs = require('fs')
const URL = require('url')
const Application = require('./application.js')
const querystring = require('querystring')

const sass = require('node-sass')

class RenderSass {
  constructor() {
    this.filename
    this.options
  }

  render() {
    return new Promise((resolve, reject) => {
      sass.render({
        file: this.filename,
        ...this.options
      }, function(err, result) {
        if (err) {
          console.log(err)
          return reject(err)
        }

        resolve(result)
      })
    })
  }
}

class Assets {
  constructor() {
    this.list = {}
    this.cache = {}
  }

  find(directory) {
    let result = []

    if (!fs.existsSync(directory)) return result

    for (let element of fs.readdirSync(directory)) {
      let p = path.join(directory, element)
      let stat = fs.statSync(p)

      if(stat.isDirectory()) {
        result = result.concat(this.find(p))
      }else{
        result.push(p)
      }
    }

    return result
  }

  async middleware(request, response) {
    if(request.method.toLowerCase() !== 'get') return

    let url = querystring.unescape(request.full_url)
    let asset = this.list[url]

    if (!asset) return

    let file_name = path.parse(url).base

    response.type(file_name)

    if (asset instanceof RenderSass) {
      let cached = this.cache[url]

      if (cached) {
        return response.end(cached)
      }

      let result = await asset.render()
      let css = this.cache[url] = result.css.toString()

      response.end(css)
    } else {
      response.sendFile(asset, {
        // acceptRanges: false,
        headers: {
          // 'Access-Control-Allow-Origin': '*',
          // 'Access-Control-Allow-Headers': 'Content-Type,X-Requested-With',
          // 'Access-Control-Allow-Methods': 'POST,GET',
          // 'Content-Type': 'text/css'
        }
      })
    }

    return true
  }

  sanitize(pathname) {
    return pathname.replace(/\\/g, '/').replace(/\/+/g, '/')
  }

  add(theme, site) {
    let directory = path.join(theme.directory, 'assets')

    for (let asset of this.find(directory)) {
      let url = URL.format({
        pathname: this.sanitize(['/', site.name, theme.name, asset.replace(directory, '')].join('/'))
      })

      let file = path.parse(asset)

      switch (file.ext) {
        case '.scss':
        let renderer = new RenderSass

        renderer.filename = asset

        file.base = file.name + '.css'

        asset = path.format(file)

        url = URL.format({
          pathname: this.sanitize(['/', site.name, theme.name, asset.replace(directory, '')].join('/'))
        })

        renderer.options = site.attribute.sass || {}
        renderer.options.includePaths = [directory]

        this.list[url] = renderer
        break

        default:
        this.list[url] = asset
        break
      }
    }
  }

  addDirectory(directory) {
    for (let asset of this.find(directory)) {
      let url = URL.format({
        pathname: this.sanitize(asset.replace(directory, ''))
      })

      this.list[url] = asset
    }
  }
}

module.exports = new Assets
