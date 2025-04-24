module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: ` update hr_employeeWorkbook
SET organizationID = subquery.organizationID
FROM (select w.ID, p.organizationID 
  from hr_employeeWorkbook w
  join hr_employeePosition p ON p.ID = w.employeePositionID
  where w.organizationID IS NULL )  AS subquery
WHERE hr_employeeWorkbook.ID = subquery.ID`
  })
}
