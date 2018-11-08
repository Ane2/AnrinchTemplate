const Util = require('./util')

class Formatter {
  constructor(object) {
    this.reference = object
    this.stack = []
  }

  capitalize(key) {
    let value = this.reference[key]
    this.reference[key] = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()

    return this
  }

  trim(key = null) {
    if (key === null) {
      let keys = Object.keys(this.reference)

      for (let k of keys) {
        let value = this.reference[k]

        if (typeof value === 'string') {
          this.reference[k] = Util.trim(value)
        }
      }
    } else {
      let value = this.reference[key]

      if (typeof value === 'string') {
        this.reference[key] = Util.trim(value)
      }
    }

    return this
  }

  length(key, length, exception) {
    let value = this.reference[key]

    if (typeof length === 'object') {
      if (length.min && length.min > value.length) {
        this.exception(key, exception)
      }

      if (length.max && length.max < value.length) {
        this.exception(key, exception)
      }
    } else if(value.length !== length) {
      this.exception(key, exception)
    }

    return this
  }

  match(key, regexp, exception) {
    let value = this.reference[key]
    let result = regexp.exec(value)

    if (!result) {
      this.exception(key, exception)
    } else {
      let [match] = result

      if (match !== value) {
        this.exception(key, exception)
      }
    }

    return this
  }

  default(key, value) {
    if (!this.reference[key]) {
      this.reference[key] = value
    }

    return this
  }

  integer(key) {
    this.reference[key] = parseInt(this.reference[key])
    return this
  }

  replace(key, regexp, value) {

    return this
  }

  enum(key, table) {
    if (Array.isArray(table)) {
      this.reference[key] = table[parseInt(this.reference[key])]
    } else {
      this.reference[key] = table[value]
    }

    return this
  }

  exception(key, exception) {
    this.stack.push({ name: key, message: exception})
  }
}

module.exports = Formatter
