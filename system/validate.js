const { Attr } = require('./util.js')
const Reference = require('./reference.js')

class Validate {
  static string(value, options = {}) {
    options = Attr.default({
      trim: true,
      length: null,
      throw: 'Default Validate.throw message',
      match: null,
      filter: null
    }, options)

    let isreferenced = value instanceof Reference
    let v = isreferenced ? value.get() : value
    let type = typeof v

    if (type !== 'string') {
       throw new Error(options.throw)
    }

    if (options.trim) {
      if (isreferenced) {
        value.set(Validate.trim(value.get()))
        v = value.get()
      } else {
        v = Validate.trim(value)
      }
    }

    if (options.lowercase) {
      if (isreferenced) {
        value.set(value.get().toLowerCase())
        v = value.get()
      } else {
        v = v.toLowerCase()
      }
    }

    if (options.length) {
      let type = typeof options.length

      switch (type) {
        case 'object':
        let min = options.length.min || 0
        let max = options.length.max || 0

        if (min && min > v.length) {
          throw new Error(options.length.throw || options.throw)
        }

        if (max && max < v.length) {
          throw new Error(options.length.throw || options.throw)
        }
        break

        // TODO: Add functional type of check?

        default:
        throw new Error('Undefined options.length Validation type')
        break
      }
    }

    let regexp = options.match

    // TODO: Add functional type of check?

    if (regexp && regexp instanceof RegExp) {
      let result = regexp.exec(v)

      if (!result) throw new Error(options.throw)

      let [match] = result

      if (match !== v) throw new Error(options.throw)
    }

    if (regexp && typeof regexp === 'function') {
      if (!regexp(v)) throw new Error(options.throw)
    }

    let final

    if (isreferenced) {
      final = value.get()
    } else {
      final = v
    }

    if (typeof options.filter === 'function') {
      let filtered = options.filter(v)

      if (isreferenced) {
        value.set(filtered)
        v = value.get()
      } else {
        v = filtered
      }

      return filtered
    }

    return final
  }

  static trim(value) {
    return value.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '')
  }
}


module.exports = Validate
