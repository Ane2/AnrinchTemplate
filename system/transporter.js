const nodemailer = require('nodemailer')

class Transporter {
  constructor(site) {
    // console.log('constructing ('+site.name+') Transporter table')

    this.table = {}

    let list = site.attribute.transporter || {}

    for (let name in list) {
      this.table[name] = nodemailer.createTransport(list[name])
    }
  }

  get(name = 'default') {
    let result = this.table[name]

    if (!result) throw new Error('Transporter (' + name + ') not found in the table')

    return result
  }
}

module.exports = Transporter
