module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `UPDATE hr_order SET orderState = 'PROJECT' WHERE mi_deleteUser is not null and orderState = 'POSTED'`
  })
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `UPDATE hr_timeSheetChange SET orderState = 'PROJECT' WHERE mi_deleteUser is not null and orderState = 'POSTED'`
  })
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `UPDATE hr_employeeAccrual SET orderState = 'PROJECT' WHERE mi_deleteUser is not null and orderState = 'POSTED'`
  })
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `UPDATE hr_orderPay SET orderState = 'PROJECT' WHERE mi_deleteUser is not null and orderState = 'POSTED'`
  })
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `UPDATE tim_timeSheet SET mi_deleteUser = 10, mi_deleteDate = subquery.mi_createDate
FROM (SELECT t.ID, t.mi_createDate from tim_timeSheet t
JOIN hr_order o ON o.ID = t.orderID
JOIN hr_orderClass c On c.ID = o.orderClass
WHERE t.mi_deleteUser is NULL AND (o.mi_deleteUser is not null OR o.orderState = 'PROJECT') AND c.entityName = 'hr_timeSheetChange')  AS subquery 
WHERE tim_timeSheet.ID = subquery.ID`
  })
}
