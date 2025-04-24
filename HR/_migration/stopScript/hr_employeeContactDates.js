module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `update hr_employeeContact SET dateFrom = '2000-01-01', dateTo = '9999-12-31'`
  })
}
