module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: 'DROP TABLE IF EXISTS hr_empOrderCombiningPosDet'
  })
}
