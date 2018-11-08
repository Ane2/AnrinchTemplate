const Page = require('./page.js')
const express = require('express')

const fs = require('fs')
const path = require('path')

const bodyParser = require('body-parser')
const Parser = require('path-to-regexp')

class Pages {
  constructor(site) {
    this.directory = path.join(site.directory, 'pages')

    this.array = this.findSync(this.directory)

    this.stack = []

    this.table = {}

    for(let file_path of this.array) {
      let page = new Page(file_path, this, site)

      if (!page.route) continue

      this.stack.push(page)
      this.table[page.id] = page
    }

    for (let page of this.stack) {
      if (page.parent) {
        page.parent = this.table[page.parent]
      }
    }

    this.default = new Page(path.join(this.directory, 'default.yaml'), this, site)

    this.default.parent = this.table[this.default.parent] || null

    this.exception = new Page(path.join(this.directory, 'exception.yaml'), this, site)

    this.exception.parent = this.table[this.exception.parent] || null
  }

  findSync(directory) {
    let result = []

    for (let element of fs.readdirSync(directory)) {
      let p = path.join(directory, element)
      let stat = fs.statSync(p)

      if(stat.isDirectory()) {
        result = result.concat(this.findSync(p))
      }else{
        result.push(p)
      }
    }

    return result.filter(this.filter.bind(this))
  }

  filter(page_file) {
    return ['.yaml'].includes(path.parse(page_file).ext.toLowerCase())
  }

  fetch(url) {
    for (let page of this.stack) {
      let result = page.match(url)

      if (result) {
        // TODO: Default page might have keys? Make it

        let params = {}
        let index = 1

        for (let key of result.keys) {
          params[key.name] = result.result[index++]
        }

        return { page, params }
      }
    }

    return null
  }
}

module.exports = Pages
