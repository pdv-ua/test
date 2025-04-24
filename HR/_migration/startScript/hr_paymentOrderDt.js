module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: 'DELETE FROM hr_paymentOrderDt WHERE mi_deleteUser is NOT NULL'
  })
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: 'DELETE FROM hr_paymentOrderAccDt WHERE mi_deleteUser is NOT NULL'
  })
}
