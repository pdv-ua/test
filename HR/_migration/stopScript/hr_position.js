module.exports.run = (conn) => {
  const positions = conn.Repository('hr_position')
    .attrs(['ID', 'name'])
    .misc({
      __mip_recordhistory_all: true
    })
    .selectAsObject()

  positions.forEach(pos => {
    conn.update({
      entity: 'hr_position',
      __skipOptimisticLock: true,
      execParams: {
        ID: pos.ID,
        description: pos.name
      }
    })
  })
}
