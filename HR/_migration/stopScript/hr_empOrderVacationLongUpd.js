module.exports.run = (conn) => {
  const ordersRet = conn.Repository('hr_empOrderVacationretDet')
    .attrs(['ID', 'empOrderVacationLongID', 'empOrderVacationLongID.mi_unityEntity'])
    .selectAsObject()

  ordersRet.forEach(row => {
    conn.update({
      entity: 'hr_empOrderVacationretDet',
      __skipOptimisticLock: true,
      execParams: {
        ID: row.ID,
        primeVacationParaID: row['empOrderVacationLongID.mi_unityEntity'] === 'hr_empOrderVacationlongDet' ? row.empOrderVacationLongID : null
      }
    })
  })
  const ordersProlong = conn.Repository('hr_empOrderVacationprolonglDet')
    .attrs(['ID', 'grantVacationParaID', 'grantVacationParaID.mi_unityEntity'])
    .selectAsObject()

  ordersProlong.forEach(row => {
    conn.update({
      entity: 'hr_empOrderVacationprolonglDet',
      __skipOptimisticLock: true,
      execParams: {
        ID: row.ID,
        primeVacationParaID: row['grantVacationParaID.mi_unityEntity'] === 'hr_empOrderVacationlongDet' ? row.grantVacationParaID : null
      }
    })
  })
}
