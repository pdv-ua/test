module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `update hr_dictRank set code = '1' where code like '%.%'`
  })
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `update hr_dictRank set code = '1' where isnumeric(code) = 0`
  })
}
