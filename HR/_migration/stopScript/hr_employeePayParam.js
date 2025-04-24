module.exports.run = (conn) => {
  const employeePayParam = conn.Repository('hr_employeePayParam')
    .attrs(['ID', 'employeeNumberID', 'employeeNumberID.employeeID', 'payElID', 'dateFrom', 'dateTo', 'accrualSum', 'accrualRate'])
    .selectAsObject({
      'employeeNumberID.employeeID': 'employeeID'
    })
  employeePayParam.forEach(row => {
    row.dateFromEmpty = row.dateFrom
    row.dateToEmpty = row.dateTo
    conn.insert({
      entity: 'hr_employeeAccrual',
      execParams: row
    })
  })
}
