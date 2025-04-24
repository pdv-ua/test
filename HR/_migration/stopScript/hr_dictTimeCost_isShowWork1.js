module.exports.run = (conn, migrationParams) => {
  const dictPositions = conn.Repository('hr_dictTimeCost')
    .attrs(['ID', 'timeCostType', 'timeColumns'])
    .where('timeCostType', '=', 'WORK')
    .selectAsObject()

  dictPositions.forEach(row => {
    conn.update({
      entity: 'hr_dictTimeCost',
      __skipOptimisticLock: true,
      execParams: {
        ID: row.ID,
        isShowWork: 1
      }
    })
  })
}
