module.exports.run = (conn) => {
  conn.run({
    entity: 'hr_employeeWorkbook',
    method: 'updateWorkbookByOrder'
  })
}
