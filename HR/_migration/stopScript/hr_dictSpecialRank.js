module.exports.run = (conn) => {
  const empOrderPluraList = conn.Repository('hr_dictSpecialRank')
    .attrs(['ID', 'name'])
    .selectAsObject()
  empOrderPluraList.forEach(row => {
    conn.update({
      entity: 'hr_dictSpecialRank',
      __skipOptimisticLock: true,
      execParams: {
        ID: row.ID,
        description: row.name
      }
    })
  })
}
