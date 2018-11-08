const YAML = require('js-yaml')
const fs = require('fs')
const path = require('path')

let system = module.exports = {}

module.exports.strings = (array) => {
  for (let value of array) {
    if (!value) return false
  }

  return true
}

module.exports.path = (...target) => {
  if (!system.strings(target)) return null

  let p = path.join.apply(path, target)

  if (path.isAbsolute(p)) return p

  target.unshift(process.cwd())

  return path.join.apply(null, target)
}

module.exports.yaml = {}
module.exports.yaml.load = (...args) => {
  let p = system.path.apply(null, args)

  if (!p || !fs.existsSync(p)) return null

  return YAML.safeLoad(fs.readFileSync(p, 'utf-8'))
}
