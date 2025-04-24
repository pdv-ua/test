module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: 'update hr_employee set impIsNotUpdateExisting = 0'
  })
}
