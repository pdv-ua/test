module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: "update hr_payRoll set orderType = 'hr_payRollWithinBank' where orderType = 'hr_payRollWithin' and paymentMethod = 1"
  })

  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: "update hr_payRoll set orderType = 'hr_payRollWithinCash' where orderType = 'hr_payRollWithin' and paymentMethod = 2"
  })
}
