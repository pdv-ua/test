module.exports.run = (conn, migrationParams) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `ALTER TABLE hr_employeePayOut ADD exportMethodIdOld VARCHAR(32)`
  })
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `update hr_employeePayOut SET exportMethodIdOld = exportMethodID`
  })
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `update hr_employeePayOut SET exportMethodID = NULL`
  })
  if (migrationParams.dialect === 'PostgreSQL') {
    conn.xhr({
      endpoint: 'runSQL',
      URLParams: { CONNECTION: 'main' },
      data: `alter table hr_employeePayOut alter column exportMethodID type BIGINT USING (exportMethodID::bigint)`
    })
  }
}
