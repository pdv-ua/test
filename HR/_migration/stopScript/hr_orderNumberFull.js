module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: ` update hr_order SET orderNumber = subquery.orderNumberFull
    FROM ( SELECT ID, orderNumberFull FROM hr_empOrder where dictEmpOrderIndexID is not null and mi_deleteUser is null) subquery
    WHERE hr_order.ID = subquery.ID `
  })
}
