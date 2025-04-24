module.exports.run = (conn) => {
  const payElList = conn.Repository('hr_payEl')
    .attrs(['ID', 'calcProportion'])
    .where('calcProportion', 'isNotNull')
    .selectAsObject()

  payElList.forEach(item => {
    const execParams = {
      ID: item.ID,
      useTimeSheetBy: ['DAY_PLAN', 'HOUR_PLAN'].includes(item.calcProportion) ? 'PLAN' : 'NORMA'
    }
    if (item.calcProportion === 'DAY_PLAN') {
      execParams.calcProportion = 'DAY'
    }
    if (item.calcProportion === 'HOUR_PLAN') {
      execParams.calcProportion = 'HOUR'
    }
    conn.update({
      entity: 'hr_payEl',
      __skipOptimisticLock: true,
      execParams
    })
  })
}
