module.exports.run = (conn, migrationParams) => {
  const empOrderFuneral = conn.Repository('hr_empOrderFuneral')
    .attrs(['ID', 'employeeFuneralID.organizationID', 'organizationID'])
    .where('organizationID', 'isNull')
    .selectAsObject()

  empOrderFuneral.forEach(row => {
    conn.update({
      entity: 'hr_empOrderFuneral',
      __skipOptimisticLock: true,
      execParams: {
        ID: row.ID,
        organizationID: row['employeeFuneralID.organizationID']
      }
    })
  })

  const docRegFuneral = conn.Repository('hr_docRegFuneral')
    .attrs(['ID', 'employeeFuneralID', 'employeePositionID'])
    .where('employeeFuneralID', 'isNull')
    .selectAsObject()

  docRegFuneral.forEach(row => {
    conn.update({
      entity: 'hr_docRegFuneral',
      __skipOptimisticLock: true,
      execParams: {
        ID: row.ID,
        employeeFuneralID: row['employeePositionID']
      }
    })
  })
}
