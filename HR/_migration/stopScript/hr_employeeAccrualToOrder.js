module.exports.run = (conn) => {
  let orderClassID = conn.Repository('hr_orderClass')
    .attrs('ID')
    .where('numCode', '=', 6000)
    .selectScalar()
  if (!orderClassID) {
    orderClassID = conn.insert({
      entity: 'hr_orderClass',
      fieldList: ['ID'],
      execParams: {
        numCode: 6000,
        description: 'Нарахування працівника',
        ordersType: 'Нарахування працівника',
        entityName: 'hr_employeeAccrual'
      }
    })
  }
  if (orderClassID) {
    const permanentAccruals = conn.Repository('hr_employeeAccrual')
      .attrs(['ID'])
      .selectAsObject()

    let msg
    permanentAccruals.forEach(row => {
      const order = conn.Repository('hr_order').attrs('*').selectById(row.ID)
      msg = '##### orderID=' + row.ID
      if (!order) {
        conn.insert({
          entity: 'hr_order',
          execParams: {
            ID: row.ID,
            orderClass: orderClassID,
            orderState: 'POSTED',
            description: 'Постійні нарахування працівника'
          }
        })
        msg += ' - inserted'
      } else {
        msg += ' - existed'
      }
      console.log(msg)
    })
  }
}
