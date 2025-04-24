module.exports.run = (conn) => {
  const dictPosition = conn.Repository('hr_dictPosition')
    .attrs(['ID', 'code'])
    .selectAsObject()

  dictPosition.forEach(item => {
    conn.update({
      entity: 'hr_dictPosition',
      __skipOptimisticLock: true,
      execParams: {
        ID: item.ID,
        codeSort: Number(String(item.code || '').replace(/[^\d]/g, '') || 0)
      }
    })
  })
}
