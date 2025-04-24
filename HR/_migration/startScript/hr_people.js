module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: ' alter table hr_people add employeeID BIGINT null; '
  })

  const peoples = conn.Repository('hr_people').attrs(['ID', 'mi_deleteUser'])
    .where('employeeID', 'isNull')
    .selectAsObject()

  const baseEmploeeID = (conn.Repository('hr_employee').attrs(['ID']).selectSingle() || {}).ID
  peoples.forEach(row => {
    const employeeID = conn.Repository('hr_employeeFamily').attrs(['employeeID'])
      .where('peopleID', '=', row.ID)
      .selectScalar()
    conn.update({
      entity: 'hr_people',
      execParams: {
        ID: row.ID,
        employeeID: employeeID || baseEmploeeID
      },
      __skipOptimisticLock: true
    })
  })
}
