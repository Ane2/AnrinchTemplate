

class Flow {
  constructor(sample = null) {
    this.instruction = {}
    this.chain = null

    this.last = null
    this.first = null

    this.length = 0

    this.copy(sample)
  }

  copy(flow) {
    if (flow === null) return

    this.chain = flow

    this.last = flow.last
    this.first = flow.first
    this.length = flow.length
  }

  fetch(name) {
    let instruction = this.instruction[name]

    if (instruction) return instruction

    let chain = this.chain

    if (!chain) return null

    while (chain) {
      let result = chain.instruction[name]
      if (result) return result

      chain = chain.chain
    }

    return null
  }

  use(name, callable) {
    let instruction = {
      name: name,
      callable: callable,
      next: null,
      related: null,
      flow: this
    }

    if (!this.first) {
      this.first = instruction
    }

    if (this.last) {
      instruction.related = this.last

      if (this.last.flow === this) {
        this.last.next = instruction
      } else {
        this.instruction[this.last.name] = {
          name: this.last.name,
          callable: this.last.callable,
          next: instruction,
          related: this.last.related,
          flow: this
        }
      }
    }

    this.last = instruction

    this.instruction[name] = instruction
    this.length++
  }

  after(callable_name, name, callable) {
    let instruction = this.fetch(callable_name)

    if (!instruction) {
      return console.warn('Instruction not found: ' + callable_name)
    }

    let after_instruction = {
      name: name,
      callable: callable,
      next: instruction.next,
      related: null,
      flow: this
    }

    if (instruction.next === null) {
      this.last = after_instruction
    } else {
      instruction.next.related = after_instruction
    }

    if (instruction.flow === this) {
      instruction.next = after_instruction
    } else {
      this.instruction[instruction.name] = {
        name: instruction.name,
        callable: instruction.callable,
        next: after_instruction,
        related: instruction.related,
        flow: this
      }
    }

    this.instruction[name] = after_instruction
    this.length++
  }

  before(callable_name, name, callable) {
    let instruction = this.fetch(callable_name)

    if (!instruction) {
      return console.warn('Instruction not found: ' + callable_name)
    }

    let related = instruction.related

    let before_instruction = {
      name: name,
      callable: callable,
      next: instruction,
      related: related,
      flow: this
    }

    if (related === null) {
      if (instruction.flow === this) {
        instruction.related = before_instruction
      } else {
        this.instruction[callable_name] = {
          name: callable_name,
          callable: instruction.callable,
          next: instruction.next,
          related: before_instruction,
          flow: this
        }
      }

      this.first = before_instruction
    } else {
      if (instruction.flow === this) {
        instruction.related.next = before_instruction
        instruction.related = before_instruction
      } else {
        this.instruction[callable_name] = {
          name: callable_name,
          callable: instruction.callable,
          next: instruction.next,
          related: before_instruction,
          flow: this
        }

        this.instruction[instruction.related.name] = {
          name: instruction.related.name,
          callable: instruction.callable,
          next: before_instruction,
          related: instruction.related.related,
          flow: this
        }
      }
    }

    this.instruction[name] = before_instruction
    this.length++
  }

  override(name, callable) {
    let instruction = this.fetch(name)

    if (!instruction) {
      return console.warn('Instruction not found: ' + name)
    }

    if (instruction.flow !== this) {
      this.instruction[name] = {
        name: instruction.name,
        callable: callable,
        next: instruction.next,
        related: instruction.related,
        flow: this
      }
    } else {
      instruction.callable = callable
    }
  }

  callable() {
    if (this.first === null) return []

    // TODO: If added to the flow and can be called at next. Do it - if possible.

    let instruction = this.fetch(this.first.name)

    let result = new Array(this.length)
    let index = 0

    while (instruction) {
      result[index++] = instruction.callable

      if (!instruction.next) break

      instruction = this.fetch(instruction.next.name)
    }

    return result
  }

  instructions() {
    if (this.first === null) return []

    let instruction = this.fetch(this.first.name)

    let result = new Array(this.length)
    let index = 0

    while (instruction) {
      result[index++] = instruction

      if (!instruction.next) break

      instruction = this.fetch(instruction.next.name)
    }

    return result
  }

  forEach(handler) {
    let instruction = this.fetch(this.first.name)

    while (instruction) {
      handler(instruction)

      if (!instruction.next) break

      instruction = this.fetch(instruction.next.name)
    }
  }

  destroy() {
    delete this.instruction
    delete this.chain
    delete this.first
    delete this.last
  }
}

module.exports = Flow
