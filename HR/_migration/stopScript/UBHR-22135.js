module.exports.run = (conn, migrationParams) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `UPDATE hr_accrual SET mask = 0
WHERE ID IN (
SELECT a.ID
FROM hr_accrual a
JOIN hr_order o ON o.ID = a.orderID
JOIN hr_orderClass c ON c.ID = o.orderClass
WHERE c.entityName = 'hr_docRegShift') `
  })
}
