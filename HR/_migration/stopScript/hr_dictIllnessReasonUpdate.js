module.exports.run = (conn) => {
  const dictIllnessReason = conn.Repository('hr_dictIllnessReason')
    .attrs(['*'])
    .where('illnessKind', '=', '1')
    .selectAsObject()

  const payElUnpaid = conn.Repository('hr_payEl')
    .attrs(['ID'])
    .where('methodID.code', '=', '48')
    .selectSingle()

  dictIllnessReason.forEach(item => {
    conn.update({
      entity: 'hr_dictIllnessReason',
      __skipOptimisticLock: true,
      execParams: {
        ID: item['ID'],
        fullName: item['name'],
        payElUnpaidID: payElUnpaid.ID
      }
    })
  })
}
