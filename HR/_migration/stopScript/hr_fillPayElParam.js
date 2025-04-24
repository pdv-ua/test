module.exports.run = (conn) => {
  const payElBonus = conn.Repository('hr_payEl')
    .attrs(['ID'])
    .where('methodID.methodGroupID.code', '=', 3)
    .selectAsObject()

  payElBonus.forEach(row => {
    conn.update({
      entity: 'hr_payEl',
      __skipOptimisticLock: true,
      execParams: {
        ID: row.ID,
        includeInCalcAvg: '1'
      }
    })
  })
}
