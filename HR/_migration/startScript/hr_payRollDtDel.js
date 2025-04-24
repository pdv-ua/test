module.exports.run = (conn) => {
  /* conn.xhr({
    endpoint: 'runSQL',
    URLParams: {CONNECTION: 'main'},
    data: 'DELETE FROM hr_payRollDt WHERE mi_deleteUser IS NOT NULL'
  }) */
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: 'DELETE FROM hr_paymentOrderAccDt WHERE paymentOrderID in (SELECT p.ID FROM hr_paymentOrder p WHERE p.mi_deleteUser IS NOT NULL)'
  })
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: 'DELETE FROM hr_paymentOrderDt WHERE paymentOrderID in (SELECT p.ID FROM hr_paymentOrder p WHERE p.mi_deleteUser IS NOT NULL)'
  })

  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: 'DELETE FROM hr_paymentOrder WHERE mi_deleteUser IS NOT NULL'
  })
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: 'DELETE FROM hr_RollRequis WHERE mi_deleteUser IS NOT NULL'
  })
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: 'DELETE FROM hr_RollReg WHERE mi_deleteUser IS NOT NULL'
  })
}
