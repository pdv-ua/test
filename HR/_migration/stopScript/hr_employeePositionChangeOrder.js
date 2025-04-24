module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `UPDATE hr_employeePosition SET changeOrderID = subquery.changeOrderID
FROM (select p.ID, n.changeOrderID from hr_employeePosition p
JOIN hr_employeeNumber n ON n.ID = p.employeeNumberID
WHERE p.dateTo < '9999-12-31' AND n.dateTo < '9999-12-31' AND n.changeOrderID is not null 
AND p.changeOrderID is null AND p.dateTo = n.dateTo) AS subquery 
WHERE  hr_employeePosition.ID = subquery.ID `
  })
}
