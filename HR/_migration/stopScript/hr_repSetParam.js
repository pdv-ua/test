module.exports.run = (conn) => {
  const repParams = conn.Repository('hr_repSetParam')
    .attrs(['ID'])
    .selectAsObject()

  repParams.forEach(pos => {
    conn.update({
      entity: 'hr_repSetParam',
      __skipOptimisticLock: true,
      execParams: {
        ID: pos.ID,
        dateFromEmpty: null,
        dateToEmpty: null
      }
    })
  })
}
