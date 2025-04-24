module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: 'update hr_accrual set flagsFix = 2147483647 where flagsFix = 4294967295'
  })
}
