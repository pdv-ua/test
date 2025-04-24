module.exports.run = (conn) => {
  const empOrderChgsalaryDet = conn.Repository('hr_empOrderChgsalaryDet')
    .attrs(['ID', 'orderID'])
    .selectAsObject()

  empOrderChgsalaryDet.forEach(item => {
    let empOrderChgSalPosDet = conn.Repository('hr_empOrderChgSalPosDet')
      .attrs(['ID', 'orderID', 'employeeID', 'employeeNumberID', 'employeePositionID'])
      .where('orderID', '=', item.orderID)
      .selectAsObject()
    empOrderChgSalPosDet.forEach(row => {
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
            mi_unityEntity: 'hr_empOrderChgsalaryDet'
          }
        })
      }
    })
  })
}
