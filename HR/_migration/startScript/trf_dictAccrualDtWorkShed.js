module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: 'update trf_dictAccrualDt set workScheduleID = null'
  })
}
