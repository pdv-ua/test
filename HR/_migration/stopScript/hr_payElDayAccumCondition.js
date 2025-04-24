module.exports.run = (conn) => {
  const payElList = conn.Repository('hr_payEl')
    .attrs(['ID', 'methodID.dayAccumCondition'])
    .where('methodID.code', 'in', ['21'])
    .selectAsObject()

  payElList.forEach(item => {
    conn.update({
      entity: 'hr_payEl',
      __skipOptimisticLock: true,
      execParams: {
        ID: item.ID,
        dayAccumCondition: item['methodID.dayAccumCondition']
      }
    })
  })
}
