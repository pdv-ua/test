module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `update hr_listParam set code = 'listChild' where code = 'listСhild'`
  })
}
