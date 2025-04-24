module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `UPDATE hr_payAccOperation SET periodSalaryID = subquery.periodCalcID
      FROM (select ID, periodCalcID  from hr_payAccOperation) AS subquery
      WHERE hr_payAccOperation.ID = subquery.ID;`
  })
}
