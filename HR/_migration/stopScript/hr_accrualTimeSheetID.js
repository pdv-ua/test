module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `merge hr_accrual as target
  USING (SELECT a.ID, c.ID timeSheetID  from hr_accrual a
  join hr_timeSheetChangeEmp ce on ce.employeeNumberID = a.employeeNumberID AND ce.mi_deleteDate >= '9999-12-31'
  join hr_timeSheetChange c on c.ID = ce.timeSheetChangeID AND c.orderID = a.empOrderID AND c.mi_deleteDate >= '9999-12-31'
where a.empOrderID IS NOT NULL and c.ID IS NOT NULL AND a.timeSheetID IS NULL) as source
on (source.ID = target.ID)
  when matched then update set target.timeSheetID = source.timeSheetID;
  ---------------------------------------------------------------------
  `
  })
}
