module.exports.run = (conn) => {
  const empOrderExitdowntimeDet = conn.Repository('hr_empOrderExitdowntimeDet')
    .attrs(['ID', 'orderID'])
    .selectAsObject()

  empOrderExitdowntimeDet.forEach(item => {
    let empOrderExitdowntimeListDet = conn.Repository('hr_empOrderExitdowntimeListDet')
      .attrs(['ID', 'orderID', 'employeeID', 'employeeNumberID', 'employeePositionID'])
      .where('orderID', '=', item.orderID)
      .selectAsObject()
    empOrderExitdowntimeListDet.forEach(row => {
      let employeeOrder = conn.Repository('hr_employeeOrder')
        .attrs(['ID'])
        .where('ID', '=', row.ID)
        .where('orderID', '=', row.orderID)
        .selectAsObject()
      if (!employeeOrder.length) {
        conn.insert({
          entity: 'hr_employeeOrder',
          execParams: {
            ID: row.ID,
            orderID: row.orderID,
            employeeID: row.employeeID ? row.employeeID : conn.Repository('hr_employeeNumberS').attrs(['employeeID']).selectById(row.employeeNumberID).employeeID,
            employeeNumberID: row.employeeNumberID || null,
            employeePositionID: row.employeePositionID || null,
            mi_unityEntity: 'hr_empOrderExitdowntimeDet'
          }
        })
      }
    })
  })
}
