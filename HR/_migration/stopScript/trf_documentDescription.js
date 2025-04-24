module.exports.run = (conn) => {
  const dict = conn.Repository('trf_document')
    .attrs(['ID'])
    .selectAsObject()

  dict.forEach(item => {
    conn.update({
      entity: 'trf_document',
      __skipOptimisticLock: true,
      execParams: {
        ID: item.ID,
        description: null
      }
    })
  })
}
