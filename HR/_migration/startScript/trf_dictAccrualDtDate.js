module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `update trf_dictAccrualDt set dateFrom = '2000-01-01' where dateFrom is null`
  })
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `update trf_dictAccrualDt set dateTo = '9999-12-31' where dateTo is null`
  })
}
