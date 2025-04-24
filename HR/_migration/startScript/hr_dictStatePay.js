module.exports.run = (conn) => {
  const dictPeriod = conn.Repository('hr_dictStatePay').attrs(['ID'])
    .where('description', '=', 'ID')
    .selectAsObject()

  dictPeriod.forEach(row => {
    conn.update({
      entity: 'hr_dictStatePay',
      execParams: {
        ID: row.ID,
        description: null
      },
      __skipOptimisticLock: true
    })
  })
}
