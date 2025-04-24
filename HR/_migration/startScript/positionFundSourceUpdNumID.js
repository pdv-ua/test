module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `alter table hr_empPosFundSource add employeeNumberID BIGINT null`
  })

  const empPosFundSource = conn.Repository('hr_empPosFundSource')
    .attrs(['ID', 'employeePositionID.employeeNumberID'])
    .where('employeeNumberID', 'isNull')
    .selectAsObject()

  empPosFundSource.forEach(row => {
    conn.update({
      __skipOptimisticLock: true,
      entity: 'hr_empPosFundSource',
      execParams: {
        ID: row.ID,
        employeeNumberID: row['employeePositionID.employeeNumberID']
      }
    })
  })
}
