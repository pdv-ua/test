module.exports.run = (conn) => {
  const paymentOrder = conn.Repository('hr_paymentOrder')
    .attrs(['ID', 'payObligatoryID.contrAccountID'])
    .selectAsObject()

  paymentOrder.forEach(payment => {
    conn.update({
      entity: 'hr_paymentOrder',
      __skipOptimisticLock: true,
      execParams: {
        ID: payment.ID,
        contrAccountID: payment['payObligatoryID.contrAccountID']
      }
    })
  })
}
