module.exports.run = (conn) => {
  const dictPeriod = conn.Repository('hr_dictProfession').attrs(['ID', 'name'])
    .where('addName', '=', 'ID')
    .selectAsObject()

  dictPeriod.forEach(row => {
    conn.update({
      entity: 'hr_dictProfession',
      execParams: {
        ID: row.ID,
        addName: row.name
      },
      __skipOptimisticLock: true
    })
  })
}
