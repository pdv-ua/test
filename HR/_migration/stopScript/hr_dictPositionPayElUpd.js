module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `UPDATE hr_dictPositionPayEl SET dateFrom = '2000-01-01', dateTo='9999-12-31'`
  })
}
