module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: 'update hr_accrual set orgID = (select orgID from hr_employeeNumber n where n.ID = employeeNumberID)'
  })
}
