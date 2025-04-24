module.exports.run = (conn) => {
  const dictIllnessReason = conn.Repository('hr_dictIllnessReason')
    .attrs(['ID'])
    .selectAsObject()
  dictIllnessReason.forEach(item => {
    conn.update({
      entity: 'hr_dictIllnessReason',
      __skipOptimisticLock: true,
      execParams: {
        ID: item.ID,
        dateFromEmpty: null,
        dateToEmpty: null
      }
    })
  })
}
