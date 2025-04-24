module.exports.run = (conn, migrationParams) => {
  const constantID = conn.Repository('ac_constant')
    .attrs('ID')
    .where('code', '=', 'hrFundSourceAccounting')
    .selectScalar()

  if (constantID) {
    const constList = conn.Repository('ac_settings')
      .attrs(['ID', 'value'])
      .where('constantID', '=', constantID)
      .selectAsObject()
    constList.forEach(row => {
      conn.update({
        entity: 'ac_settings',
        __skipOptimisticLock: true,
        execParams: {
          ID: row.ID,
          value: row.value === '1' ? 'STAFF' : 'WITHOUT'
        }
      })
    })
    const constOrgList = conn.Repository('ac_settingsOrg')
      .attrs(['ID', 'value'])
      .where('constantID', '=', constantID)
      .selectAsObject()
    constOrgList.forEach(row => {
      conn.update({
        entity: 'ac_settingsOrg',
        __skipOptimisticLock: true,
        execParams: {
          ID: row.ID,
          value: row.value === '1' ? 'STAFF' : 'WITHOUT'
        }
      })
    })
  }
}
