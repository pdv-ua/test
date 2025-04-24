module.exports.run = (conn) => {
  const entity = conn.Repository('hr_timeSheetChange')
    .attrs(['ID'])
    .selectAsObject()

  entity.forEach(item => {
    conn.update({
      entity: 'hr_timeSheetChange',
      __skipOptimisticLock: true,
      execParams: {
        ID: item.ID,
        employeeList: null
      }
    })
  })
}
