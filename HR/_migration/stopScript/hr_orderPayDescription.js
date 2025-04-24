module.exports.run = (conn, migrationParams) => {
  if (migrationParams.dialect === 'PostgreSQL') {
    conn.xhr({
      endpoint: 'runSQL',
      URLParams: { CONNECTION: 'main' },
      data: `update hr_order set description = subquery.description
FROM (
SELECT p.ID,
CONCAT((CASE WHEN empOrderType = 'APPOINT' THEN 'Прийнято на роботу через особовий рахунок' ELSE 
  CASE WHEN empOrderType = 'DISM' THEN 'Звільнено через особовий рахунок' ELSE 
 CASE WHEN empOrderType = 'MOVE' THEN 'Додано призначення через особовий рахунок' ELSE 
 'Змінено ранг через особовий рахунок' END END END), ' ', COALESCE(p.orderNumber, '')) description
FROM hr_orderPay p 
WHERE p.empOrderType in ('MOVE', 'APPOINT', 'RANK', 'DISM') AND p.description is NULL AND p.mi_deleteUser is NULL
)  AS subquery
 WHERE subquery.ID = hr_order.ID`
    })
    conn.xhr({
      endpoint: 'runSQL',
      URLParams: { CONNECTION: 'main' },
      data: `update hr_orderPay set description = subquery.description
FROM (
SELECT p.ID,
CONCAT((CASE WHEN empOrderType = 'APPOINT' THEN 'Прийнято на роботу через особовий рахунок' ELSE 
  CASE WHEN empOrderType = 'DISM' THEN 'Звільнено через особовий рахунок' ELSE 
 CASE WHEN empOrderType = 'MOVE' THEN 'Додано призначення через особовий рахунок' ELSE 
 'Змінено ранг через особовий рахунок' END END END), ' ', COALESCE(p.orderNumber, '')) description
FROM hr_orderPay p 
WHERE p.empOrderType in ('MOVE', 'APPOINT', 'RANK', 'DISM') AND p.description is NULL AND p.mi_deleteUser is NULL
)  AS subquery
 WHERE subquery.ID = hr_orderPay.ID`
    })
  } else {
    conn.xhr({
      endpoint: 'runSQL',
      URLParams: { CONNECTION: 'main' },
      data: `update hr_order set description = subquery.description
FROM (
SELECT p.ID,
((CASE WHEN empOrderType = 'APPOINT' THEN 'Прийнято на роботу через особовий рахунок' ELSE 
  CASE WHEN empOrderType = 'DISM' THEN 'Звільнено через особовий рахунок' ELSE 
 CASE WHEN empOrderType = 'MOVE' THEN 'Додано призначення через особовий рахунок' ELSE 
 'Змінено ранг через особовий рахунок' END END END) + ' ' + COALESCE(p.orderNumber, '')) description
FROM hr_orderPay p 
WHERE p.empOrderType in ('MOVE', 'APPOINT', 'RANK', 'DISM') AND p.description is NULL AND p.mi_deleteUser is NULL
)  AS subquery
 WHERE subquery.ID = hr_order.ID`
    })
    conn.xhr({
      endpoint: 'runSQL',
      URLParams: { CONNECTION: 'main' },
      data: `update hr_orderPay set description = subquery.description
FROM (
SELECT p.ID,
((CASE WHEN empOrderType = 'APPOINT' THEN 'Прийнято на роботу через особовий рахунок' ELSE 
  CASE WHEN empOrderType = 'DISM' THEN 'Звільнено через особовий рахунок' ELSE 
 CASE WHEN empOrderType = 'MOVE' THEN 'Додано призначення через особовий рахунок' ELSE 
 'Змінено ранг через особовий рахунок' END END END) + ' ' + COALESCE(p.orderNumber, '')) description
FROM hr_orderPay p 
WHERE p.empOrderType in ('MOVE', 'APPOINT', 'RANK', 'DISM') AND p.description is NULL AND p.mi_deleteUser is NULL
)  AS subquery
 WHERE subquery.ID = hr_orderPay.ID`
    })
  }
}
