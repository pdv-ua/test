module.exports.run = (conn) => {
  const orders = conn.Repository('hr_employeeAccrual').attrs(['ID']).selectAsObject()
  orders.forEach(row => {
    conn.update({
      entity: 'hr_employeeAccrual',
      __skipOptimisticLock: true,
      isImport: true,
      execParams: {
        ID: row.ID,
        orderState: 'POSTED',
        description: 'Постійні нарахування працівника'
      }
    })
  })
}
