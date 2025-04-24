module.exports.run = (conn) => {
  const positions = conn.Repository('hr_position')
    .attrs(['ID', 'name', 'fullName', 'description'])
    .selectAsObject()
  const attrs = ['name', 'fullName', 'description']
  positions.forEach(item => {
    let isUpdate = false
    const execParams = {
      ID: item.ID
    }
    attrs.forEach(attr => {
      if (item[attr].match(/(\r\n|\r|\n)/g)) {
        const value = String(item[attr])
        execParams[attr] = value.replace(/(\r\n|\r|\n)/g, ' ').trim()
        isUpdate = true
      }
    })
    if (isUpdate) {
      conn.update({
        entity: 'hr_position',
        __skipOptimisticLock: true,
        execParams: execParams
      })
    }
  })

  const organization = conn.Repository('hr_organization')
    .attrs(['ID', 'name', 'fullName', 'description'])
    .selectAsObject()
  organization.forEach(item => {
    let isUpdate = false
    const execParams = {
      ID: item.ID
    }
    attrs.forEach(attr => {
      if (item[attr].match(/(\r\n|\r|\n)/g)) {
        const value = String(item[attr])
        execParams[attr] = value.replace(/(\r\n|\r|\n)/g, ' ').trim()
        isUpdate = true
      }
    })
    if (isUpdate) {
      conn.update({
        entity: 'hr_organization',
        __skipOptimisticLock: true,
        execParams: execParams
      })
    }
  })
}
