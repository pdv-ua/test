module.exports.run = (conn) => {
  const empOrderPluraList = conn.Repository('hr_empOrderPluralistDet')
    .attrs(['ID'])
    .where('empOrderType', '=', 'PLURALIST')
    .selectAsObject()
  empOrderPluraList.forEach(row => {
    conn.update({
      entity: 'hr_empOrderPluralistDet',
      __skipOptimisticLock: true,
      execParams: {
        ID: row.ID,
        description: null
      }
    })
  })
}
