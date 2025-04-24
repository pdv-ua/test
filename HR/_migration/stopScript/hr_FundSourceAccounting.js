module.exports.run = (conn) => {
  let constantID = conn.Repository('ac_constant')
    .attrs(['ID'])
    .where('code', '=', 'hrFundSourceAccounting')
    .selectScalar()

  if (!constantID) {
    constantID = conn.insert({
      entity: 'ac_constant',
      fieldList: ['ID'],
      execParams: {
        code: 'hrFundSourceAccounting',
        constantGroup: 'general',
        type: 'BOOL',
        generalSettings: 1,
        orgSettings: 1,
        empSettings: 0
      }
    })
  }
  const settingsID = conn.Repository('ac_settings')
    .attrs(['ID'])
    .where('constantID', '=', constantID)
    .selectScalar()

  if (!settingsID) {
    conn.insert({
      entity: 'ac_settings',
      execParams: {
        constantID: constantID,
        value: '0'
      }
    })
  }
}
