module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: 'UPDATE hr_payRoll SET applyRetention = 1'
  })
}
