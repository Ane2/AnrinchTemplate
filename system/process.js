class Process {
  constructor() {
    let argv = require('optimist').argv

    this.environment = argv.environment || (argv.env || null)

    console.log('Process environment:', this.environment)
  }
}

module.exports = new Process
