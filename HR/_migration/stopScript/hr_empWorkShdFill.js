module.exports.run = (conn) => {
  conn.run({
    entity: 'hr_empWorkShdChange',
    method: 'fillWorkShdByOrder'
  })
}
