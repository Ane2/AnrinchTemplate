const Flow = require('../system/flow.js')




// -home
// -blog
// -categories
// --category
//
// site -> access -> page -> template -> render


let sample = new Flow

sample.then('site', (request, response, next) => {
  console.log('site')
})


sample.then('access', (request, response, next) => {
  console.log('access')
})

// sample.after('site', 'access5', (request, response, next) => {
//   console.log('access')
// })
//

// sample.before('access', 'access2', (request, response, next) => {
//   console.log('access2')
// })
//
//
// sample.before('access', 'access3', (request, response, next) => {
//   console.log('access2')
// })
//
// sample.before('access', 'access42', (request, response, next) => {
//   console.log('access2')
// })


// sample.before('site', 'before_site', (request, response, next) => {
//   console.log('access2')
// })

// sample.before('before_site', 'before_site2', (request, response, next) => {
//   console.log('access2')
// })

// sample.before('access', 'access4', (request, response, next) => {
//   console.log('access2')
// })

for(let i=0; i<100; i++) {
  // sample.before('access', 'access' + i, (request, response, next) => {
  //   console.log('access' + i)
  // })
}

let start = process.hrtime()

let flow = new Flow(sample)
// let flow2 = new Flow(sample)





// flow.then('test4', () => {
//   console.log('some test')
// })
//
// flow.then('test3', () => {
//   console.log('some test')
// })
//
// flow.then('test2', () => {
//   console.log('some test')
// })
//

flow.after('access', 'test10', () => {
  console.log('test 10')
})

for(let i=0; i<100; i++) {
  flow.after('access', 'access' + i, (request, response, next) => {
    console.log('access' + i)
  })
}

flow.before('site', 'test', () => {
  console.log('some test')
})

flow.after('test', 'test23', () => {
  console.log('some test')
})

// sample.then('test', () => {
//   console.log('some test 2')
// })

// let final_flow = new Flow(flow)

// final_flow.before('site', 'finally', () => {
//   console.log('should be before site')
// })
//
// final_flow.before('test', 'finally2', () => {
//   console.log('final flow2')
// })
//
// final_flow.before('test', 'finally3', () => {
//   console.log('final flow3')
// })
//
// final_flow.before('finally', 'finally_access', () => {
//   console.log('before_access')
// })
//
// final_flow.before('finally_access', 'finally_access2', () => {
//   console.log('before_access2')
// })

let end = process.hrtime(start)

for(let i=0; i<100; i++) {
  // sample.then('access' + i, new Promise((fulfil, reject) => {
  //   fulfil()
  // }))
}

let iliteration = 0
let max = 10000

for(let i=0; i<100000; i++) {
  sample.then('access' + i, (request, response, next) => {
    console.log('access' + i)
  })
}

let interval = setInterval(() => {
  let start = process.hrtime()

  let flow = new Flow(sample)

  flow.after('access', 'test10', () => {
    console.log('test 10')
  })

  for(let i=0; i<100; i++) {
    flow.then('access' + i, (request, response, next) => {
      console.log('access' + i)
    })
  }

  // flow.before('site', 'test', () => {
  //   console.log('some test')
  // })
  //
  // flow.after('test', 'test23', () => {
  //   console.log('some test')
  // })


  let end = process.hrtime(start)
  console.log('Took: ' + ((end[0] * NS_PER_SEC + end[1]) / 1000000) )
  console.log('Sample length:', sample.length, 'Flow length:', flow.length)

  // let callable = flow.callable()

  // flow.destroy()

  if (iliteration++ === max) {
    clearInterval(interval)
    setInterval(() => {
      console.log('5sec wait')
    }, 5000)
  }
}, 25)

const NS_PER_SEC = 1e9

// console.log(start, end)

console.log('Took: ' + ((end[0] * NS_PER_SEC + end[1]) / 1000000) )

for(let method of flow.callable()) {
  // console.log('m:', (method ? method.name : null) + ' -> ' + (method && method.next ? method.next.name : null))
  method()
}

console.log('--- SAMPLE ---')

for(let method of sample.callable()) {
  // console.log('m:', (method ? method.name : null) + ' -> ' + (method && method.next ? method.next.name : null))
  method()
}


// console.log('---')
//
// for(let method of final_flow.methods()) {
//   method()
// }

// console.log(flow.list())
