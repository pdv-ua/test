module.exports.run = (conn) => {
  const dict = conn.Repository('trf_position')
    .attrs(['ID'])
    .selectAsObject()

  dict.forEach(item => {
    conn.update({
      entity: 'trf_position',
      __skipOptimisticLock: true,
      execParams: {
        ID: item.ID,
        description: null
      }
    })
  })
}
