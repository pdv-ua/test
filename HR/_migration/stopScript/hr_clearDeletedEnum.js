module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `delete from ubm_enum where mi_deleteDate <> '9999-12-31'`
  })
}
