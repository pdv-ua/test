module.exports.run = (conn, migrationParams) => {
  let payFunds = conn.Repository('hr_payFund')
    .attrs(['ID', 'dateFrom', 'dateTo'])
    .where('isAutoCalc', '=', 1)
    .selectAsObject()

  payFunds.forEach(row => {
    conn.insert({
      entity: 'hr_fundPerm',
      execParams: {
        payFundID: row.ID,
        dateFromEmpty: row.dateFrom,
        dateToEmpty: row.dateTo
      }
    })
  })
}
