module.exports.run = (conn) => {
  const items = conn.Repository('hr_reportParam')
    .attrs('ID')
    .where('reportCode', '=', 'fileExpress')
    .selectAsObject()
  items.forEach(row => {
    conn.run({
      entity: 'hr_reportParam',
      method: 'delete',
      execParams: { ID: row.ID },
      __skipOptimisticLock: true
    })
  })
}
