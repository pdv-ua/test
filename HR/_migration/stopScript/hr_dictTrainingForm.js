module.exports.run = (conn) => {
  const dict = conn.Repository('hr_dictTrainingForm')
    .attrs(['ID'])
    .selectAsObject()

  dict.forEach(item => {
    conn.update({
      entity: 'hr_dictTrainingForm',
      __skipOptimisticLock: true,
      execParams: {
        ID: item.ID,
        description: null
      }
    })
  })
}
