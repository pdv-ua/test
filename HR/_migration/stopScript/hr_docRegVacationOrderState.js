module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `update hr_docRegVacation set orderState = 'POSTED'
where ID in (SELECT v.ID
  from hr_docRegVacation v
  JOIN hr_orderRegistry r on r.ID = v.orderRegistryID
  where v.orderState != r.orderState and v.mi_deleteDate>='9999-12-31' and r.orderState = 'POSTED' and v.orderState = 'PROJECT')`
  })
}
