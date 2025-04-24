module.exports.run = (conn) => {
  const dictRank = conn.Repository('hr_dictReasonDism')
    .attrs(['ID'])
    .where('code', 'in', ['02', '05', '08', '13', '19', '22', '23'])
    .selectAsObject()

  dictRank.forEach(item => {
    conn.update({
      entity: 'hr_dictReasonDism',
      __skipOptimisticLock: true,
      execParams: {
        ID: item.ID,
        isDeductExcessLeave: 1
      }
    })
  })
}
