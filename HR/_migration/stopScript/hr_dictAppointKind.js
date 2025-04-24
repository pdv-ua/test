module.exports.run = (conn) => {
  const dictAppointKind = conn.Repository('hr_dictAppointKind').attrs(['ID']).selectAsObject()
  dictAppointKind.forEach(row => {
    conn.update({
      entity: 'hr_dictAppointKind',
      __skipOptimisticLock: true,
      execParams: {
        ID: row.ID,
        description: null,
        caption: null
      }
    })
  })
}
