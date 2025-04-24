module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `delete from ac_performedScript where fileName in ('hr_accrualTimeSheetID.js', 'hr_empLongTermAbsc.js')`
  })
}
