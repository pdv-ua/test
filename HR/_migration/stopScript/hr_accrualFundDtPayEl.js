module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `UPDATE hr_accrualFundDt SET payElID = NULL
WHERE ID in (select dt.ID from hr_accrualFundDt dt
join hr_accrualFund a On a.ID = dt.accrualFundID
join hr_payFund f On f.ID = a.payFundID
join hr_payFundMethod m ON m.ID = f.payFundMethodID
Where dt.payElID is not null AND m.code = '2')`
  })
}
