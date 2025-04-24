module.exports.run = (conn) => {
  const dictRank = conn.Repository('hr_dictRank')
    .attrs(['ID', 'code'])
    .selectAsObject()

  dictRank.forEach(item => {
    conn.update({
      entity: 'hr_dictRank',
      __skipOptimisticLock: true,
      execParams: {
        ID: item.ID,
        isActive: parseInt(item.code) < 10
      }
    })
  })
}
