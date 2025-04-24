module.exports.run = (conn) => {
  const workScheduleDays = conn.Repository('hr_workScheduleDays')
    .attrs(['ID'])
    .selectAsObject()

  workScheduleDays.forEach(item => {
    conn.update({
      entity: 'hr_workScheduleDays',
      __skipOptimisticLock: true,
      execParams: {
        ID: item.ID,
        hoursWorkHarm: 0,
        hoursWorkDop: 0
      }
    })
  })
}
