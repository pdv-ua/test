module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `update hr_employeeAccrual SET dateFrom = subquery.dateFrom, dateTo = subquery.dateTo 
FROM (SELECT p.ID, p.dateFrom, p.dateTo FROM hr_employeePayParam p 
JOIN hr_employeeAccrual a ON a.ID = p.ID
where p.mi_deleteUser is null) AS subquery 
WHERE  hr_employeeAccrual.ID = subquery.ID `
  })
}
