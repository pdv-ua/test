module.exports.run = (conn) => {
  const orders = conn.Repository('hr_empOrder')
    .attrs(['ID', 'organizationID', 'respEmployeeNumID', 'documentOrderType'])
    .misc({
      __mip_recordhistory_all: true
    })
    .selectAsObject()

  orders.forEach(row => {
    conn.update({
      entity: 'hr_order',
      __skipOptimisticLock: true,
      execParams: {
        ID: row.ID,
        organizationID: row.organizationID,
        respEmployeeNumID: row.respEmployeeNumID
      }
    })
    // conn.update({
    //   entity: 'hr_empOrder',
    //   __skipOptimisticLock: true,
    //   execParams: {
    //     ID: row.ID,
    //     documentOrderType: !row.documentOrderType ? 'ORDER' : row.documentOrderType
    //   }
    // })
  })
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `update hr_empOrder set documentOrderType = 'ORDER' where documentOrderType is null and mi_deleteDate >= '9999-12-31'`
  })
}
