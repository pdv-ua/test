const dateService = require('../../../AC/modules/dataServices/dateService')

module.exports.run = (conn) => {
  const onDate = dateService.currentDate()
  const dYearVac = conn.Repository('hr_dictVacationKind')
    .attrs(['ID'])
    .where('code', 'like', 'dYear%')
    .misc({ __mip_ondate: onDate })
    .selectAsObject()
  dYearVac.forEach(vac => {
    conn.run({
      entity: 'hr_dictVacationKind',
      method: 'update',
      __skipOptimisticLock: true,
      execParams: {
        ID: vac.ID,
        isProportionalCompensate: true
      }
    })
  })

  const dChildVac = conn.Repository('hr_dictVacationKind')
    .attrs(['ID'])
    .where('code', 'like', 'dChild%', 'dChild')
    .where('code', 'like', 'dChS%', 'dChS')
    .logic('([dChild] or [dChS])')
    .misc({ __mip_ondate: onDate })
    .selectAsObject()
  dChildVac.forEach(vac => {
    conn.run({
      entity: 'hr_dictVacationKind',
      method: 'update',
      __skipOptimisticLock: true,
      execParams: {
        ID: vac.ID,
        isYearBeginStart: true
      }
    })
  })
}
