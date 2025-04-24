module.exports.run = (conn, migrationParams) => {
  const vacList1 = conn.Repository('hr_employeeVacation')
    .attrs('ID')
    .where('paraID.mi_deleteDate', '<', '#maxdate')
    .selectAsObject()

  vacList1.forEach(row => {
    conn.run({
      entity: 'hr_employeeVacation',
      method: 'delete',
      execParams: { ID: row.ID },
      __skipOptimisticLock: true
    })
  })

  const vacList2 = conn.Repository('hr_employeeVacation')
    .attrs('ID')
    .where('orderID.mi_deleteDate', '<', '#maxdate')
    .selectAsObject()

  vacList2.forEach(row => {
    conn.run({
      entity: 'hr_employeeVacation',
      method: 'delete',
      execParams: { ID: row.ID },
      __skipOptimisticLock: true
    })
  })
}
