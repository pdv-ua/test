module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: "update hr_recstage set entityName = 'hr_recstage' where entityName is null"
  })
}
