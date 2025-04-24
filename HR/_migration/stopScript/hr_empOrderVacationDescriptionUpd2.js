const dateService = require('../../../AC/modules/dataServices/dateService')

module.exports.run = (conn) => {
  /*
  const empOrderVac = conn.Repository('hr_empOrder')
    .attrs(['ID', 'orderNumber', 'orderDate', 'dictEmpOrderIndexID.code'])
    .where('empOrderType', '=', 'VACATION')
    .where('mi_createDate', '<', '2021-03-01')
    .selectAsObject()
  empOrderVac.forEach(row => {
    const orderDateStr = row['orderDate'] ? dateService.formatDate(row['orderDate']) : '?'
    const description = `Наказ про надання відпустки № ${row['orderNumber']}${(row['dictEmpOrderIndexID.code'] ? ('/' + row['dictEmpOrderIndexID.code']) : '')} від ${orderDateStr}`
    conn.xhr({
      endpoint: 'runSQL',
      URLParams: { CONNECTION: 'main' },
      data: `update hr_empOrder set description = '${(description || '').replace(/'/g, `''`)}' where ID=${row.ID}`
    })
    conn.xhr({
      endpoint: 'runSQL',
      URLParams: { CONNECTION: 'main' },
      data: `update hr_order set description = '${(description || '').replace(/'/g, `''`)}' where ID=${row.ID}`
    })
  })
  */
}
