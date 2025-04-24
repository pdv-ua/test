module.exports.run = (conn) => {
  const orderData = conn.Repository('hr_empOrderVacationprolongDet')
    .attrs(['ID'])
    .where('isMovement', '=', true)
    .selectAsObject()

  orderData.forEach(row => {
    conn.update({
      entity: 'hr_empOrderVacationprolongDet',
      __skipOptimisticLock: true,
      execParams: {
        ID: row.ID,
        action: 'TRANSFER'
      }
    })
  })
}
