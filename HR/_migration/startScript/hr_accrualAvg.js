module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: 'DELETE FROM hr_accrualAvg WHERE mi_deleteUser IS NOT NULL'
  })
}
