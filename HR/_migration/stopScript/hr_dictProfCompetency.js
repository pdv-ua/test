module.exports.run = (conn) => {
  const dict = conn.Repository('hr_dictProfCompetency')
    .attrs(['ID'])
    .selectAsObject()

  dict.forEach(item => {
    conn.update({
      entity: 'hr_dictProfCompetency',
      __skipOptimisticLock: true,
      execParams: {
        ID: item.ID,
        description: null
      }
    })
  })
}
