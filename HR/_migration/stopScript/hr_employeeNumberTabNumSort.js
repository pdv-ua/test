module.exports.run = (conn) => {
  const employeeNumbers = conn.Repository('hr_employeeNumber')
    .attrs(['ID', 'tabNum'])
    .where('tabNumSort', '=', null, 'tabNumSortIsNull')
    .where('tabNumSort', '=', 0, 'tabNumSortEqual0')
    .logic('([tabNumSortIsNull] OR [tabNumSortEqual0])')
    .misc({ __skipRls: true })
    .selectAsObject()
  employeeNumbers.forEach(row => {
    try {
      conn.update({
        entity: 'hr_employeeNumber',
        __skipOptimisticLock: true,
        execParams: {
          ID: row.ID,
          tabNum: row.tabNum
        },
        setTabNumAttribute: true
      })
    } catch (error) {
      console.log(error.message)
    }
  })
}
