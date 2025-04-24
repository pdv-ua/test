module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `merge hr_accrual as target
  USING (
  select a.ID, os.rate, os.standingYearMonth, os.standingAll, os.dictIllnessReasonID 
  from hr_accrual a 
  JOIN hr_order o on o.ID = a.orderID 
  JOIN hr_orderClass c on c.ID = o.orderClass and c.entityName = 'hr_docRegSickness'
  JOIN hr_docRegSickness os on os.ID = o.ID
  where a.flagsRec & 2 = 2) as source
  on (source.ID = target.ID)
  when matched then update set target.rate = source.rate, target.standingAll = source.standingAll, target.standingYearMonth = source.standingYearMonth, target.dictIllnessReasonID = source.dictIllnessReasonID; 
  ---------------------------------------------------------------------
  `
  })
}
