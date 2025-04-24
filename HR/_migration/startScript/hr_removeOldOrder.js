
module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: ' delete from hr_orderClass where numCode in (501,212,5002) '
  })
}
