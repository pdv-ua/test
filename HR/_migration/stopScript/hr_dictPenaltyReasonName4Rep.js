module.exports.run = (conn) => {
  const penaltyReason = conn.Repository('hr_dictPenaltyReason')
    .attrs(['ID', 'name'])
    .selectAsObject()

  penaltyReason.forEach(pen => {
    conn.update({
      entity: 'hr_dictPenaltyReason',
      __skipOptimisticLock: true,
      execParams: {
        ID: pen.ID,
        name4Rep: pen.name
      }
    })
  })
}
