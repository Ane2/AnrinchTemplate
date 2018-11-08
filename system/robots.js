const fs = require('fs')
const path = require('path')

class Agent {
  constructor(name) {
    this.name = name
    this.allow = []
    this.disallow = []
    this.nofollow = []
    this.follow = []
  }
}

class Robots {
  constructor(site) {
    // TODO: If robots.txt found in application directory.
    // Concat the result at the end. And produce robots.txt everytime.

    this.agents = {}
  }
}

module.exports = Robots
