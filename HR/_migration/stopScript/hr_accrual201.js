module.exports.run = (conn) => {
  let dict = conn.Repository('hr_accrual')
    .attrs(['ID', 'calculatedSum'])
    .where('payElID.methodID.code', '=', '201')
    .selectAsObject()
  if (dict && dict.calculatedSum) {
    conn.run({
      entity: 'hr_accrual',
      method: 'update',
      __skipOptimisticLock: true,
      execParams: {
        ID: dict.ID,
        paySumAccrual: dict.calculatedSum
      }
    })
  }
}
