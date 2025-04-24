module.exports.run = (conn) => {
  const payEl = conn.Repository('hr_payEl')
    .attrs(['ID', 'name', 'code'])
    .selectAsObject()

  payEl.forEach(item => {
    conn.update({
      entity: 'hr_payEl',
      __skipOptimisticLock: true,
      execParams: {
        ID: item.ID,
        caption: null
      }
    })
  })
}
