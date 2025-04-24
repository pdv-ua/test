module.exports.run = (conn) => {
  const empOrderVac = conn.Repository('hr_empOrder')
    .attrs(['ID', 'orderNumber', 'orderDate', 'dictEmpOrderIndexID.code'])
    .where('empOrderType', '=', 'VACATION')
    .selectAsObject()
  empOrderVac.forEach(row => {
    const description = `Наказ про надання відпустки № ${row['orderNumber']}${(row['dictEmpOrderIndexID.code'] ? ('/' + row['dictEmpOrderIndexID.code']) : '')} від ${(row['orderDate'] || ' ? ')}`
    conn.xhr({
      endpoint: 'runSQL',
      URLParams: { CONNECTION: 'main' },
      data: `update hr_empOrder set description = '${(description || '').replace(/'/g, `''`)}' where ID=${row.ID}`
    })
  })
}
