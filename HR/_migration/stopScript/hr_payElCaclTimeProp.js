module.exports.run = (conn) => {
  const payElList = conn.Repository('hr_payEl')
    .attrs(['ID', 'methodID.code'])
    .where('methodID.code', 'in', ['45', '46', '47', '65'])
    .selectAsObject()

  payElList.forEach(item => {
    conn.update({
      entity: 'hr_payEl',
      __skipOptimisticLock: true,
      execParams: {
        ID: item.ID,
        calcTimeProportion: 'DAY'
      }
    })
  })
}
