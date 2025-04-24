module.exports.run = (conn) => {
  const payElList = conn.Repository('hr_payEl')
    .attrs(['ID', 'methodID.code'])
    .where('methodID.code', 'in', ['21', '23', '44'])
    .selectAsObject()

  payElList.forEach(item => {
    conn.update({
      entity: 'hr_payEl',
      __skipOptimisticLock: true,
      execParams: {
        ID: item.ID,
        accrueFuturePeriod: 'CURRENT',
        calcEarnings: item['methodID.code'] === '21' ? null : 'DAY'
      }
    })
  })
}
