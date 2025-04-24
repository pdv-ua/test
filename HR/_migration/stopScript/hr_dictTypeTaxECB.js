module.exports.run = (conn) => {
  const empOrderPluraList = conn.Repository('hr_dictTypeTaxECB')
    .attrs(['ID'])
    .selectAsObject()
  empOrderPluraList.forEach(row => {
    conn.update({
      entity: 'hr_dictTypeTaxECB',
      __skipOptimisticLock: true,
      execParams: {
        ID: row.ID,
        description: null
      }
    })
  })
}
