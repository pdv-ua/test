
module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: ' delete from hr_taxIndividAcc where accrualID is null or not EXISTS ( select ID from hr_accrual where ID = accrualID ) '
  })
}
