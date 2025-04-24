module.exports.run = (conn) => {
  const payElList = conn.Repository('hr_payEl')
    .attrs(['ID', 'methodID.code'])
    .where('methodID.code', 'in', ['146', '147', '156'])
    .where('isMtCount', '=', 0)
    .selectAsObject()
  payElList.forEach(item => {
    conn.update({
      entity: 'hr_payEl',
      __skipOptimisticLock: true,
      execParams: {
        ID: item.ID,
        isMtCount: 1
      }
    })
  })
}
