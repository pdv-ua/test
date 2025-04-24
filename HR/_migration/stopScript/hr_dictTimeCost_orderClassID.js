module.exports.run = (conn) => {
  const rows = [
    { code: 'НеПідЛ', entityName: 'hr_empOrderUni' }, // Непідтверджений лікарняний
    { code: 'Вобов', entityName: 'hr_empOrderUni' }, // Відпустка не оплачувана за законом
    { code: 'ВзстТУЦ', entityName: 'hr_empOrderUni' }, // Відпустка не оплачувана за згодою сторін до 15 днів
    { code: 'ВКарнт', entityName: 'hr_empOrderUni' } // Відп.карантин
  ]

  rows.forEach((row) => {
    const ID = conn.Repository('hr_dictTimeCost').attrs(['ID']).where('code', '=', row.code).selectScalar()
    const orderClassID = conn.Repository('hr_orderClass').attrs(['ID']).where('entityName', '=', row.entityName).selectScalar()
    if (ID && orderClassID) {
      try {
        conn.update({
          entity: 'hr_dictTimeCost',
          __skipOptimisticLock: true,
          execParams: {
            ID,
            orderClassID
          }
        })
      } catch (error) {
        console.log(error.message)
      }
    }
  })
}
