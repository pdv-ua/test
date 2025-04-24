module.exports.run = (conn, migrationParams) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `update hr_orderRegistry SET periodSalaryID = periodID  WHERE orderType = 'hr_orderRegistryShift' `
  })

  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `update hr_docRegShift set periodSalaryID = subquery.periodID
FROM (SELECT rs.ID, r.periodID  FROM hr_docRegShift rs
JOIN hr_orderRegistry r ON r.ID = rs.orderRegistryID
WHERE rs.mi_deleteUser is NULL) AS subquery 
WHERE hr_docRegShift.ID = subquery.ID `
  })
}
