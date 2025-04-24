module.exports.run = (conn) => {
  conn.Repository('ac_constant')
    .attrs('ID')
    .where('code', 'in', ['hrStaffUnitFDefFundSource', 'hrOrderEcoPrint', 'hrOrderFilterByFundSource', 'hrUseFundSourceInDescription'])
    .selectAsObject()
    .forEach(row => {
      const settingsOrg = conn.Repository('ac_settingsOrg')
        .attrs('ID')
        .where('constantID', '=', row.ID)
        .selectAsObject()
      settingsOrg.forEach(item => {
        conn.run({
          entity: 'ac_settingsOrg',
          method: 'delete',
          execParams: {
            ID: item.ID
          }
        })
      })
      const settings = conn.Repository('ac_settings')
        .attrs('ID')
        .where('constantID', '=', row.ID)
        .selectAsObject()
      settings.forEach(item => {
        conn.run({
          entity: 'ac_settings',
          method: 'delete',
          execParams: {
            ID: item.ID
          }
        })
      })
      const settingsEmp = conn.Repository('ac_settingsEmp')
        .attrs('ID')
        .where('constantID', '=', row.ID)
        .selectAsObject()
      settingsEmp.forEach(item => {
        conn.run({
          entity: 'ac_settingsEmp',
          method: 'delete',
          execParams: {
            ID: item.ID
          }
        })
      })
      const settingsTemp = conn.Repository('ac_settingsOrgTemplate')
        .attrs('ID')
        .where('constantID', '=', row.ID)
        .selectAsObject()
      settingsTemp.forEach(item => {
        conn.run({
          entity: 'ac_settingsOrgTemplate',
          method: 'delete',
          execParams: {
            ID: item.ID
          }
        })
      })
      conn.run({
        entity: 'ac_constant',
        method: 'delete',
        execParams: {
          ID: row.ID
        }
      })
    })
}
