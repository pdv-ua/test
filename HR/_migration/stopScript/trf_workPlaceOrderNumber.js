module.exports.run = (conn) => {
  const dict = conn.Repository('trf_workPlace')
    .attrs(['ID', 'orderNumber', 'orderDate', 'documentID.docNumber', 'documentID.dateFrom'])
    .selectAsObject()

  dict.forEach(row => {
    if (!row.orderNumber || !row.orderDate) {
      const execParams = {
        ID: row.ID
      }
      if (!row.orderNumber) {
        execParams.orderNumber = row['documentID.docNumber']
      }
      if (!row.orderDate) {
        execParams.orderDate = row['documentID.dateFrom']
      }
      conn.update({
        entity: 'trf_workPlace',
        __skipOptimisticLock: true,
        execParams
      })
    }
  })
}
