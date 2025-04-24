module.exports.run = (conn) => {
  let orderClassID = conn.Repository('hr_orderClass')
    .attrs('ID')
    .where('numCode', '=', 3050)
    .selectScalar()
  if (!orderClassID) {
    orderClassID = conn.insert({
      entity: 'hr_orderClass',
      fieldList: ['ID'],
      execParams: {
        numCode: 3050,
        description: 'Робочі місця тарифікації',
        ordersType: 'Робочі місця тарифікації',
        entityName: 'trf_workPlace'
      }
    })
  }
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `insert into hr_order (ID, orderNumber, orderDate, orderState, description, orderClass, mi_deleteDate, mi_deleteUser)
    select ID, orderNumber, orderDate, state, description, ${orderClassID}, mi_deleteDate, mi_deleteUser from trf_workPlace`
  })
}
