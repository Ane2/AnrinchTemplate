const cluster = require('cluster')
const path = require('path')

const Attribute = require(path.resolve(__dirname, 'system/util/attr.js'))
const System = require(path.resolve(__dirname, 'system/system.js'))
const Process = require('./system/process')
const Environment = require('./system/environment.js')

// TODO: Clusters of specific function! (website mirrors, admin, fallback)
// NOTE: We are running everything in one mirror, only switches between fallback.

if (cluster.isMaster) {
  const chokidar = require('chokidar')

  let application

  class Sentinel {
    constructor() {
      this.tasks = []

      this.instances = []
      this.unreloaded = []

      this.versioning = {}

      this.fallback = null
      this.resolved = false

      this.lock = null
    }

    resolving(task) {
      return this.lock === task || this.tasks.indexOf(task) > -1
    }

    resolve(task, unshift = false, start = true) {
      if (unshift) {
        this.tasks.unshift(task)
      } else {
        this.tasks.push(task)
      }

      if (this.tasks.length && start && !this.lock) {
        this.resolver()
      }
    }

    resolver() {
      let task = this.tasks[0]

      if (task === undefined || this.lock) return

      this.tasks.splice(0, 1)

      this.lock = task

      let resolved = false
      new Promise((resolve, reject) => {
        task.apply(null, [
          () => {
            if (resolved) return
            resolved = true
            resolve()
          },

          () => {
            if (resolved) return
            resolved = true
            reject()
          }
        ])
      })
      .then(() => { this.lock = null })
      .then(this.resolver.bind(this))
      .catch(e => {
        console.log('handle resolver error:', e.message)

        // then continue with resolver, if problem is gone
      })
    }
  }

  let sentinel = new Sentinel

  try {
    application = Attribute.default(
      System.yaml.load('./default/application.yaml'),
      System.yaml.load('./application/application.yaml'),
      System.yaml.load('./application/', Environment.filename('application.yaml'))
    )
  } catch(e) {
    console.log(e)
    sentinel.resolved = false
  }

  let task_resolve = (next) => {
    let instance = cluster.fork({
      debug: true
    })

    instance.on('exit', (code, signal) => {
      if (code === 0) {
        sentinel.resolved = true
        sentinel.resolve(task_spawn)

        if (sentinel.unreloaded.length) {
          sentinel.resolve(task_unload)
        }
      } else {
        sentinel.resolved = false

        if (sentinel.instances.length === 0 && sentinel.fallback === null) {
          sentinel.resolve(task_fallback, true)
        }
      }

      next()
    })

    instance.on('listening', () => {
      instance.disconnect()
    })

    instance.on('error', (e) => {
      console.log(e)
    })
  }

  let task_fallback = (next) => {
    if (sentinel.fallback !== null || sentinel.instances.length !== 0) return next()

    let instance = cluster.fork({fallback: true})

    instance.on('exit', (code, signal) => {
      if (code !== 0) {
        sentinel.resolve(task_fallback, true)
      } else {
        sentinel.fallback = null
      }

      next()
    })

    instance.on('online', () => {
      sentinel.fallback = instance
    })

    instance.on('listening', () => {
      sentinel.resolve(task_spawn)

      next()
    })

    instance.on('error', (e) => {
      console.log(e)
    })
  }

  let task_spawn = (next) => {
    if (!sentinel.resolved || sentinel.instances.length >= application.virtualization.instances) {
      sentinel.resolve(task_fallback, true)
      return next()
    }

    console.log('\x1b[32m\# Loading\x1b[0m')

    let instance = cluster.fork()

    instance.on('exit', (code, signal) => {
      sentinel.instances.splice(sentinel.instances.indexOf(instance), 1)

      if (code !== 0) {
        sentinel.resolve(task_resolve, true, false)
        sentinel.resolve(task_fallback, true)
      }

      console.log(code)

      next()
    })

    instance.on('online', () => {
      sentinel.instances.push(instance)
    })

    instance.on('listening', () => {
      if (sentinel.fallback) {
        sentinel.fallback.disconnect()
      }

      if (sentinel.unreloaded.length) {
        sentinel.resolve(task_unload, true)
      } else {
        sentinel.resolve(task_spawn, true)
      }

      console.log(sentinel.instances.length + ' / ' + application.virtualization.instances)

      next()
    })

    instance.on('error', (e) => {
      console.log(e)
    })
  }

  let task_unload = (next) => {
    if (!sentinel.resolved) {
      sentinel.resolve(task_resolve, true)
      return next()
    }

    let [instance] = sentinel.unreloaded.splice(0, 1)

    if (instance === undefined) {
      if (sentinel.instances.length === 0) {
        sentinel.resolve(task_resolve, true)
      }

      return next()
    }

    instance.removeAllListeners('exit')
    instance.removeAllListeners('online')
    instance.removeAllListeners('listening')

    instance.on('exit', (code, signal) => {
      sentinel.instances.splice(sentinel.instances.indexOf(instance), 1)

      console.log('\x1b[31m\# Disconnected ('+instance.process.pid+')')
      console.log(sentinel.instances.length + ' / ' + application.virtualization.instances)

      if (code !== 0) {
        sentinel.unreloaded = []

        sentinel.resolve(task_fallback)

        if (sentinel.resolved) {
          sentinel.resolve(task_spawn)
        } else {
          sentinel.resolve(task_resolve)
        }

        return next()
      }

      if (sentinel.resolved) {
        sentinel.resolve(task_spawn)
      } else {
        sentinel.resolve(task_resolve)
      }

      next()
    })

    instance.on('error', (e) => {
      console.log(e)
    })

    instance.disconnect()
  }

  let task_disconnect = (next) => {
    if (sentinel.instances.length <= application.virtualization.instances.length) {
      return next()
    }

    let [instance] = sentinel.instances.splice(0, 1)

    if (instance === undefined) {
      return next()
    }

    console.log('\x1b[31m\# Disconnected ('+instance.process.pid+')')
    console.log(sentinel.instances.length + ' / ' + application.virtualization.instances)

    instance.removeAllListeners('exit')
    instance.removeAllListeners('online')
    instance.removeAllListeners('listening')

    instance.on('exit', (code, signal) => {
      sentinel.resolve(task_disconnect)

      if (code !== 0) {
        sentinel.resolve(task_fallback, true)

        return next()
      }

      next()
    })

    instance.on('error', (e) => {
      console.log(e)
    })

    instance.disconnect()
  }

  let task_reload = (next) => {
    if (sentinel.unreloaded.length !== 0) return next()

    for (let i=0; i<sentinel.instances.length; i++) {
      sentinel.unreloaded.push(sentinel.instances[i])
    }

    sentinel.resolve(task_unload, true)

    next()
  }

  let task_reconfigure = (next) => {
    if (application.virtualization.instances > sentinel.instances.length) {
      sentinel.resolve(task_spawn)
    }

    // TODO: Find difference and unload them

    next()
  }

  let scanner_watch = [
    'system',
    'application',
    'default',
    'setup.js',
    'start.js'
  ]

  let scanner = chokidar.watch(scanner_watch, {
    cwd: process.cwd(),
    ignored: [
      application.multisite.directory + '/**/uploads/**',
      'application/uploads/**'
    ]
  })

  let action = (p) => {
    if (p === path.resolve('./application/application.yaml') || p === path.resolve('./application/default/application.yaml')) {
      try {
        application = Attribute.default(
          System.yaml.load('./default/application.yaml'),
          System.yaml.load('./application/application.yaml'),
          System.yaml.load('./application/', Environment.filename('application.yaml'))
        )
      } catch(e) {
        console.log(e)

        sentinel.resolved = false
      }
    }

    if (
      sentinel.unreloaded.length === 0
      && !sentinel.resolving(task_unload)
      && !sentinel.resolving(task_reload)
      && !sentinel.lock)
    {
      sentinel.resolve(task_reload)
    } else if (!sentinel.resolved && !sentinel.lock && !sentinel.resolving(task_resolve) && sentinel.tasks.length === 0) {
      sentinel.resolve(task_resolve)
    } else if (sentinel.resolved && !sentinel.lock && !sentinel.resolving(task_reload)) {
      sentinel.unreloaded = []
      sentinel.resolve(task_reload)
    }
  }

  scanner.on('ready', () => {
    sentinel.resolve(task_resolve)

    for (let i=0; i<application.virtualization.instances; i++) {
      sentinel.resolve(task_spawn)
    }

    scanner.on('change', action)
    scanner.on('unlink', action)
    scanner.on('add', action)

    scanner.on('error', (e) => {
      console.log('Scanner error:', e.message)
    })
  })

  scanner.on('error', (e, ...rest) => {
    console.log(e, rest)

  })
} else {
  require('./setup.js')
}
