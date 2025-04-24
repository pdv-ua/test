module.exports.run = (conn) => {
  let employeeNumbers = conn.Repository('hr_employeeNumber')
    .attrs(['ID', 'employeeID', 'dateFrom', 'dateTo', 'addGuarant'])
    .where('addGuarant', '!=', '0')
    .selectAsObject()
  employeeNumbers.forEach(row => {
    if (row.addGuarant) {
      conn.run({
        entity: 'hr_empAddGuarantees',
        method: 'insert',
        execParams: {
          employeeID: row.employeeID,
          dateFrom: row.dateFrom,
          dateTo: row.dateTo,
          addGuarant: row.addGuarant
        }
      })
    }
  })
}
