Component.get = async () => {
  switch (Param.game) {
    case 'infinitesky':
    break

    default:
    Response.redirect('/')
  }

  // Request.flow.after

  return new Template('games')
}
