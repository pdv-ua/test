module.exports.run = (conn, migrationParams) => {
  const dictPositions = conn.Repository('hr_dictPosition')
    .attrs(['ID', 'description'])
    .selectAsObject()

  dictPositions.forEach(item => {
    conn.update({
      entity: 'hr_dictPosition',
      __skipOptimisticLock: true,
      execParams: {
        ID: item.ID,
        description: item.description
      }
    })
  })
}
