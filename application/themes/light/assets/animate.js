(function () {
  // TODO: Use this support object for animating prefixes
  // to a different browsers.

  let Expression = {
    number: new RegExp(/[-+]?\d+(\.\d+)?/i)
  }

  let Support = {}

  let Queue = {}

  Queue.list = []
  Queue.paused = true
  Queue.force_pause = false

  Queue.add = (layer) => {
    if (Queue.list.indexOf(layer) === -1) {
      Queue.list.push(layer)
    }

    animate()
  }

  Queue.remove = (layer) => {
    let index = Queue.list.indexOf(layer)
    if (index !== -1) {
      Queue.list.splice(index, 1)
    }
  }

  Queue.pause = () => {
    Queue.force_pause = true
  }

  Queue.unpause = () => {
    Queue.force_pause = false
    window.requestAnimationFrame(animate)
  }

  Queue.timestamp = new Date()

  let timeperframe = 1000 / 60

  let animate = () => {
    if (!Queue.list.length || Queue.force_pause) return Queue.paused = true

    let timestamp = new Date()

    if (Queue.paused) {
      Queue.paused = false
      Queue.timestamp = timestamp
    }

    let step = timestamp.getTime() - Queue.timestamp.getTime()
    Queue.timestamp = timestamp

    for (let layer of Queue.list) {
      layer.animate(step)
    }

    let tick = new Date().getTime() - timestamp.getTime()

    setTimeout(() => {
      window.requestAnimationFrame(animate)
    }, timeperframe - tick)
  }

  class Assembler {
    constructor(stack) {
      this.values = []
      this.template = []

      let transform
      while(transform = stack.match(Expression.number)) {
        let [result] = transform

        this.values.push(parseFloat(result))

        this.template.push(stack.substr(0, transform.index))
        stack = stack.substr(transform.index + result.length)
      }

      this.template.push(stack)
    }

    compile(...input) {
      let result = this.template[0]
      let index = 1

      for (let i in input) {
        result += input[i]
        result += this.template[index++]
      }

      return result
    }

    subtract(assembler) {
      let result = new Array(assembler.values.length)

      for (let index in assembler.values) {
        result[index] = this.values[index] - assembler.values[index]
      }

      return result
    }

  }

  let ease = (t) => {
    return t<.5 ? 4*t*t*t : (t-1)*(2*t-2)*(2*t-2)+1
  }

  let Layer = class Layer {
    constructor(element) {
      this.element = element

      this.default = {}
      this.variables = {}

      this.to = {}
      this.played = false

      this.step = 0
      this.duration
      this.delay

      this.style = element.attr('style')
    }

    play(options = {}) {
      this.duration = options.duration

      delete options.duration

      if (options.opacity !== undefined) {
        this.to.opacity = options.opacity
      }

      if (options.transform) {
        this.to.transform = new Assembler(options.transform)
      }

      if (options.width !== undefined) {
        this.to.width = new Assembler(options.width)
      }

      if (options.delay) {
        clearTimeout(this.delay)
        this.delay = setTimeout(() => {
          Queue.add(this)
          this.played = true
        }, options.delay)
      } else {
        Queue.add(this)
        this.played = true
      }

      return this
    }

    base(defaults) {
      this.default = defaults

      if (this.default.opacity !== undefined) {
        this.variables.opacity = this.default.opacity
      }

      if (this.default.transform) {
        this.variables.transform = new Assembler(this.default.transform)
      }

      if (this.default.width !== undefined) {
        this.variables.width = new Assembler(this.default.width)
      }

      return this
    }

    reset() {
      this.base(this.default)
      this.step = 0

      this.element.removeAttr('style')
      this.element.attr('style', this.style)

      return this
    }

    stop() {
      Queue.remove(this)
      return this
    }

    animate(step) {
      this.step += step

      let delta = 1.0 / this.duration * this.step

      delta = ease(delta)

      if (delta >= 1.0) {
        this.stop()
        delta = 1.0
      }

      let result = {}

      if (this.variables.opacity !== undefined) {
        result.opacity = this.variables.opacity + ((this.to.opacity - this.variables.opacity) * delta)
      }

      if (this.variables.width instanceof Assembler) {
        let [width] = this.to.width.subtract(this.variables.width)
        let [fromwidth] = this.variables.width.values
        result.width = this.variables.width.compile(fromwidth + (width * delta))
      }

      if (this.variables.transform instanceof Assembler) {
        let variables = this.to.transform.subtract(this.variables.transform)

        let values = this.variables.transform.values
        let matrix = new Array(values.length)

        for (let index in variables) {
          matrix[index] = values[index] + (variables[index] * delta)
        }

        result.transform = this.variables.transform.compile(matrix)
      }

      this.element.css(result)

      return this
    }
  }

  const layers = []

  jQuery.fn.extend({
    frame: function Frame (base) {
      let index = layers.indexOf(this)

      if (index !== -1) {
        let layered = layers[index]

        if (base) {
          layered.base(base)
        }

        return layered
      }

      let layer = this.layer = new Layer(this)

      layers.push(layer)

      if (base) {
        layer.base(base)
      }

      return layer
    }
  })
})()
