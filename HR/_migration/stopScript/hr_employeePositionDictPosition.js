module.exports.run = (conn) => {
  const employeePositions = conn.Repository('hr_employeePosition')
    .attrs(['ID', 'dictPositionValue'])
    .where('dictPositionID', 'isNull')
    .misc({ __skipRls: true })
    .selectAsObject()
  employeePositions.forEach(row => {
    if (row.dictPositionValue) {
      conn.update({
        entity: 'hr_employeePosition',
        __skipOptimisticLock: true,
        execParams: {
          ID: row.ID,
          dictPositionID: row.dictPositionValue
        }
      })
    }
  })
}
