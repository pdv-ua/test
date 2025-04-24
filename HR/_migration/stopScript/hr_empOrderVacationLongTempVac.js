module.exports.run = (conn) => {
  const lvac = conn.Repository('hr_empOrderVacationlongDet')
    .attrs(['ID', 'isTempVacancy', 'dictVacationKindID.isTempVacancy'])
    .selectAsObject()

  lvac.forEach(row => {
    let orderIsTempVac = !!row.isTempVacancy
    let dictIsTempVac = !!row['dictVacationKindID.isTempVacancy']
    if (orderIsTempVac !== dictIsTempVac) {
      conn.update({
        entity: 'hr_empOrderVacationlongDet',
        __skipOptimisticLock: true,
        execParams: {
          ID: row.ID,
          isTempVacancy: row['dictVacationKindID.isTempVacancy']
        }
      })
    }
  })
}
