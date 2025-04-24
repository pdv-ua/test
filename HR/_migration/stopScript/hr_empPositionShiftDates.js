module.exports.run = (conn) => {
  conn.run({
    entity: 'hr_employeePosition',
    method: 'shiftIncorrectDates'
  })
}
