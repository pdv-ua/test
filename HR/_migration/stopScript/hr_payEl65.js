module.exports.run = (conn) => {
  const payElList = conn.Repository('hr_payEl')
    .attrs(['ID', 'isTimeSheet'])
    .where('methodID.code', '=', '65')
    .selectAsObject()

  payElList.forEach(item => {
    if (!item.isTimeSheet) {
      conn.update({
        entity: 'hr_payEl',
        __skipOptimisticLock: true,
        execParams: {
          ID: item.ID,
          isTimeSheet: 1
        }
      })
    }
  })
}
