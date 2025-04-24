module.exports.run = (conn) => {
  conn.run({
    entity: 'hr_empVacationPlan',
    method: 'updateVacationTimeSheet',
    execParams: {}
  })
  conn.run({
    entity: 'hr_empVacationPeriod',
    method: 'calcFields',
    execParams: {}
  })

  const vacationPeriodList = conn.Repository('hr_empVacationPeriod')
    .attrs(['ID'])
    .selectAsObject()

  vacationPeriodList.forEach(item => {
    conn.update({
      entity: 'hr_empVacationPeriod',
      __skipOptimisticLock: true,
      execParams: {
        ID: item.ID,
        description: null
      }
    })
  })
}
