module.exports.run = (conn) => {
  const empOrderDet = conn.Repository('hr_empOrderCwsworkhourDet')
    .attrs(['ID', 'orderID', 'orderID.organizationID', 'employeePositionID', 'employeePositionID.depName', 'employeePositionID.workScheduleID.name'])
    .selectAsObject()

  empOrderDet.forEach(item => {
    conn.insert({
      entity: 'hr_empOrderEmployeeDet',
      execParams: {
        organizationID: item['orderID.organizationID'],
        employeePositionID: item.employeePositionID,
        depName: item['employeePositionID.depName'],
        workScheduleName: item['employeePositionID.workScheduleID.name'],
        orderID: item.orderID,
        paraID: item.ID,
        empOrderType: 'CWSWORKHOUR'
      }
    })
  })
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `update hr_empOrderDet set isGroup = 1 where ID in (select ID from hr_empOrderCwsworkhourDet where mi_deleteDate>='9999-12-31')`
  })
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `update hr_empOrderCwsworkhourDet set isGroup = 1 where mi_deleteDate>='9999-12-31'`
  })
}
