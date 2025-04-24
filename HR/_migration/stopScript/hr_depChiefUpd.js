module.exports.run = (conn) => {
  const depList = conn.Repository('hr_department')
    .attrs(['ID', 'positionChiefID'])
    .where('state', '=', 'ACTIVE')
    .where('positionChiefID', 'isNotNull')
    .misc({ __mip_recordhistory_all: true })
    .selectAsObject()
  depList.forEach(dep => {
    const employeeID = conn.Repository('hr_employeePositionS')
      .attrs('employeeID')
      .where('positionID', '=', dep['positionChiefID'])
      .orderBy('dateFrom', 'desc')
      .limit(1)
      .selectScalar()
    if (employeeID) {
      conn.update({
        entity: 'hr_department',
        __skipOptimisticLock: true,
        execParams: {
          ID: dep.ID,
          employeeChiefID: employeeID
        }
      })
    }
  })
}
