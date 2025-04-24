module.exports.run = (conn) => {
  let orders = conn.Repository('hr_staffTable')
    .attrs(['ID', 'orgID'])
    .selectAsObject()

  orders.forEach(row => {
    try {
      conn.update({
        entity: 'hr_order',
        __skipOptimisticLock: true,
        execParams: {
          ID: row.ID,
          organizationID: row.orgID
        }
      })
    } catch (error) {}
  })
  orders = conn.Repository('hr_staffOrder')
    .attrs(['ID', 'orgID'])
    .selectAsObject()

  orders.forEach(row => {
    try {
      conn.update({
        entity: 'hr_order',
        __skipOptimisticLock: true,
        execParams: {
          ID: row.ID,
          organizationID: row.orgID
        }
      })
    } catch (error) {}
  })
  orders = conn.Repository('hr_staffOrderOrgStructure')
    .attrs(['ID', 'orgID'])
    .selectAsObject()

  orders.forEach(row => {
    try {
      conn.update({
        entity: 'hr_order',
        __skipOptimisticLock: true,
        execParams: {
          ID: row.ID,
          organizationID: row.orgID
        }
      })
    } catch (error) {}
  })
  orders = conn.Repository('hr_staffTableOrgStructure')
    .attrs(['ID', 'orgID'])
    .selectAsObject()

  orders.forEach(row => {
    try {
      conn.update({
        entity: 'hr_order',
        __skipOptimisticLock: true,
        execParams: {
          ID: row.ID,
          organizationID: row.orgID
        }
      })
    } catch (error) {}
  })
}
