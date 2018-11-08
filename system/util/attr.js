const Lodash = require('lodash')

class Attr {
  static default(...array) {

    if (array.length < 2) throw new Error('Function `Attr.default` requires atleast `2` arguments of objects')

    let last_index = array.length
    let reference = array[0] || {}

    for (let index = 1; index < last_index; index++) {
      this.replace_deeply(reference, array[index])
    }

    return reference
  }

  static defaultdeep(...array) {

    if (array.length < 2) throw new Error('Function `Attr.defaultdeep` requires atleast `2` arguments of objects')

    let last_index = array.length
    let reference = Lodash.cloneDeep(array[0] || {})

    for (let index = 1; index < last_index; index++) {
      this.replace_deeply(reference, array[index])
    }

    return reference
  }

  static replace_deeply(result, values) {
    if (!values || typeof values !== 'object') {
      return
    }

    if (!result || typeof result !== 'object') {
      result = {}
    }

    for (let key of Object.keys(values)) {
      let value = values[key]

      if (typeof value === 'object' && value !== null && value.constructor.name === 'Object') {
        this.add(result, key, value)
      } else {
        result[key] = value
      }
    }

  }

  static add(result = {}, name, object) {
    if (object === null) {
      return result[name] = null
    }

    if (!result[name] || typeof result[name] !== 'object') {
      result[name] = {}
    }

    let reference = result[name]

    for (let key of Object.keys(object)) {
      let value = object[key]

      if (typeof value === 'object' && value !== null && value.constructor.name === 'Object') {
        this.add(reference, key, value)
      } else {
        reference[key] = value
      }
    }
  }
}

module.exports = Attr
