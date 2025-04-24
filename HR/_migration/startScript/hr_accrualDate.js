module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: 'UPDATE hr_accrual set dateFrom = periodSalary where dateFrom IS NULL'
  })
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: 'UPDATE hr_accrual set dateTo = periodSalary where dateTo IS NULL'
  })
}
