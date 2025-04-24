module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `UPDATE hr_accrual SET calcEarnings = subquery.calcEarnings 
FROM ( SELECT a.ID, p.calcEarnings 
FROM hr_accrual a
JOIN hr_payEl pl ON pl.ID = a.payElID
JOIN hr_method m ON m.ID = pl.methodID
JOIN hr_docRegBusinessTrip p ON p.ID = a.orderID  
WHERE m.code in ('21', '22', '23', '44', '58', '73') and a.flagsRec & 2 = 2 AND a.calcEarnings IS NULL AND p.calcEarnings IS NOT NULL
) AS subquery WHERE hr_accrual.ID = subquery.ID`
  })
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `UPDATE hr_accrual SET calcEarnings = subquery.calcEarnings 
FROM ( SELECT a.ID, p.calcEarnings 
FROM hr_accrual a
JOIN hr_payEl pl ON pl.ID = a.payElID
JOIN hr_method m ON m.ID = pl.methodID
JOIN hr_docRegAvgPay p ON p.ID = a.orderID  
WHERE m.code in ('21', '22', '23', '44', '58', '73') and a.flagsRec & 2 = 2 AND a.calcEarnings IS NULL AND p.calcEarnings IS NOT NULL
) AS subquery WHERE hr_accrual.ID = subquery.ID`
  })
}
