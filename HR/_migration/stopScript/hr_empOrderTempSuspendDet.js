module.exports.run = (conn) => {
  const empOrderTempsuspendDet = conn.Repository('hr_empOrderTempsuspendDet')
    .attrs(['ID', 'orderID', 'employeeID', 'employeeNumberID', 'employeePositionID'])
    .selectAsObject()

  empOrderTempsuspendDet.forEach(row => {
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
          mi_unityEntity: 'hr_empOrderTempsuspendDet'
        }
      })
    }
  })
}
