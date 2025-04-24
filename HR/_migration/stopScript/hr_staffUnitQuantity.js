module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: 'UPDATE hr_staffUnit SET quantity = 1 WHERE mi_unityEntity = \'hr_position\' AND quantity IS NULL'
  })
}
