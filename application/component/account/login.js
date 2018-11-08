// Component.post((request, response) => {
//
// })

// Request.on('post', async (request, response) => {
//
// })


// Component.post = async () => {
//
// }

// Form
// Query
// Param
// Flow.after(this, 'form', (request, response, next) => {
//
// })

Flow.use('body-parser', require('body-parser').urlencoded({ extended: false }))

Component.post = async (request, response) => {
  // console.log(Form)
  return new Template('games')
}
