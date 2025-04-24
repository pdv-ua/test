module.exports.run = conn => {
  let dism = conn.Repository('hr_empOrderDismDet')
    .attrs('ID', 'employeePositionID', 'employeeNumberID', 'employeeNumberID.employeeID')
    .selectAsObject()

  dism.forEach(dismItem => {
    const vac = conn.Repository('hr_empOrderDismVac')
      .attrs('ID', 'employeeNumberID')
      .where('orderDetID', '=', dismItem.ID)
      .where('employeeNumberID.employeeID', '<>', dismItem['employeeNumberID.employeeID'])
      .selectAsObject()
    vac.forEach(vacItem => {
      conn.update({
        entity: 'hr_empOrderDismVac',
        __skipOptimisticLock: true,
        execParams: {
          ID: vacItem.ID,
          employeeNumberID: dismItem.employeeNumberID
        }
      })
    })
  })
}
