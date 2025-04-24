module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `DELETE FROM hr_importPlan where impEntityName = 'hr_importDictFundSource'`
  })
}
