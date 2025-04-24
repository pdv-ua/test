module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: 'UPDATE hr_taxIndividAcc SET taxFreeSum = 0'
  })
}
