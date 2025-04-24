module.exports.run = (conn) => {
  const accruals = conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: ` SELECT a.ID, c.entityName, a.orderID  
    from hr_accrual a 
    join hr_order o on o.ID = a.orderID
    join hr_orderClass c on c.ID = o.orderClass
    where c.entityName in ('hr_docRegVacation', 'hr_docRegSickness', 'hr_docRegBountyHelp', 'hr_docRegBusinessTrip',
    'hr_docRegFuneral', 'hr_docRegRenewal', 'hr_docRegSeverancePay', 'hr_docRegSinglePay', 'hr_docRegUnpaidAbsence',
    'hr_docRegVacationCompensation', 'hr_docRegVacationKid')`
  })
  for (const acc of accruals) {
    const empOrderID = conn.Repository(acc.entityName)
      .attrs([acc.entityName === 'hr_docRegSickness' ? 'empOrderSicknessID' : 'empOrderID'])
      .where('ID', '=', acc.orderID)
      .selectScalar()
    if (empOrderID) {
      conn.run({
        entity: 'hr_accrual',
        method: 'update',
        execParams: {
          ID: acc.ID,
          empOrderID
        }
      })
    }
  }
}
