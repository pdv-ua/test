module.exports.run = (conn) => {
  const employeeAccruals = conn.Repository('hr_employeeAccrual')
    .attrs(['ID'])
    .selectAsObject()
  employeeAccruals.forEach(row => {
    conn.update({
      entity: 'hr_employeeAccrual',
      __skipOptimisticLock: true,
      isImport: true,
      execParams: {
        ID: row.ID,
        descriptionExt: null
      }
    })
  })
}
