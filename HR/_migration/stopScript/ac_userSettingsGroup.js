module.exports.run = (conn) => {
  let settings = conn.Repository('ac_userSettings')
    .attrs(['ID', 'params'])
    .where('params', 'like', '%myEmployeeGroups%')
    .selectAsObject()

  settings.forEach(userSettings => {
    let userParams = userSettings.params ? JSON.parse(userSettings.params) : null
    delete userParams.myEmployeeGroups
    conn.run({
      entity: 'ac_userSettings',
      method: 'update',
      execParams: {
        ID: userSettings.ID,
        params: JSON.stringify(userParams)
      }
    })
  })
}
