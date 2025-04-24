module.exports.run = (conn) => {
  conn.run({
    entity: 'hr_import',
    method: 'updateVacation'
  })
}
