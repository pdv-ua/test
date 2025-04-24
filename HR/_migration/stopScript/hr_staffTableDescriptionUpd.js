module.exports.run = (conn, migrationParams) => {
  if (migrationParams && migrationParams.defaultLang === 'uk') {
    const staffTableList = conn.Repository('hr_staffTable')
      .attrs(['ID', 'entryOrderID', 'entryOrderID.orderNumber', 'entryOrderID.orderDate', 'description'])
      .where('orderState', '=', 'POSTED')
      .selectAsObject()
    staffTableList.forEach(row => {
      conn.update({
        entity: 'hr_staffTable',
        __skipOptimisticLock: true,
        execParams: {
          ID: row.ID,
          entryOrderID: row.entryOrderID
        }
      })
    })
  }
}
