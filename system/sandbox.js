class Template {
  constructor(route) {
    this.route = route
  }

  findIn(templates) {
    return templates[this.route] || null
  }
}

const path = require('path')
const System = require('./system.js')
const APPLICATION_DIRECTORY = System.path('application')

// TODO: Use it as Util function

// TODO: Use more convinient way to prevent requiring a definitely not found thing earlier.
// (App takes advantage of reloading, and requiring once :)) so why bother checking missing files if it will reload anyways ;)
// Maybe require does that naturally anyways?

const unfound_cache = {}

function rmany(paths = []) {
  for (let path of paths) {
    if (unfound_cache[path]) continue

    try {
      return require(path)
    } catch (e) {
      unfound_cache[path] = true

      if (e instanceof SyntaxError) {
        throw e
      }

    }
  }

  return null
}

module.exports.Template = Template
module.exports.Require = (directory) => {

  return (...names) => {
    let name = path.join.apply(path, names)

    let result = rmany([
      path.join(directory, name),
      // TODO: Fetch application name from trusted source
      path.join(process.cwd(), 'application', 'module', name),
      name,
      path.join(process.cwd(), name)
    ])

    if (result === null) {
      throw new Error('Module not found in (' + name + ')')
    }

    return result
  }
}
