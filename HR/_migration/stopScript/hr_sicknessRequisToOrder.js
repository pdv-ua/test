module.exports.run = (conn) => {
  let orderClassID = conn.Repository('hr_orderClass')
    .attrs('ID')
    .where('numCode', '=', 3014)
    .selectScalar()
  if (!orderClassID) {
    orderClassID = conn.insert({
      entity: 'hr_orderClass',
      fieldList: ['ID'],
      execParams: {
        numCode: 3014,
        description: 'Заява-розрахунок СС',
        ordersType: 'Заява-розрахунок СС',
        entityName: 'hr_sicknessRequis'
      }
    })
  }
  if (orderClassID) {
    const sicknessRequis = conn.Repository('hr_sicknessRequis')
      .attrs(['ID', 'orderDate', 'orderNumber', 'orderState', 'description', 'periodID'])
      .selectAsObject()

    let msg
    sicknessRequis.forEach(row => {
      const order = conn.Repository('hr_order').attrs('*').selectById(row.ID)
      msg = '##### orderID=' + row.ID
      if (!order) {
        conn.insert({
          entity: 'hr_order',
          execParams: {
            ID: row.ID,
            orderClass: orderClassID,
            orderDate: row.orderDate,
            orderNumber: row.orderNumber,
            orderState: row.orderState,
            description: row.description,
            periodID: row.periodID
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
