
module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `update hr_employeePosition SET mi_deleteDate = GETDATE(), mi_deleteUser = 10
            where ID in (SELECT p.ID from hr_employeePosition p
              join hr_employeeNumber n ON n.ID = p.employeeNumberID
              where n.mi_deleteUser is NOT NULL and p.mi_deleteDate>='9999-12-31')`
  })
}
