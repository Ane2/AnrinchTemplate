
class Reference {
  constructor(stack, needle) {
    this.get = () => {
      return stack[needle]
    }

    this.set = (value) => {
      stack[needle] = value
    }
  }
}

module.exports = Reference
