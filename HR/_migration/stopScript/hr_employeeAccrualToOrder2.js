module.exports.run = (conn) => {
  let orderClassID = conn.Repository('hr_orderClass')
    .attrs('ID')
    .where('numCode', '=', 6000)
    .selectScalar()
  if (orderClassID) {
    const orders = conn.Repository('hr_order').attrs(['ID']).where('orderClass', '=', orderClassID).selectAsObject()
    orders.forEach(row => {
      conn.update({
        entity: 'hr_order',
        __skipOptimisticLock: true,
        execParams: {
          ID: row.ID,
          orderState: 'POSTED',
          description: 'Постійні нарахування працівника'
        }
      })
    })
  }
}
