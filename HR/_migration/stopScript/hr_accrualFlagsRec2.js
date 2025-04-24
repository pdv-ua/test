module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `merge hr_accrual as target
  USING (
  select a.ID, a.flagsRec | 2 as flagsRec 
  from hr_accrual a 
  where (flagsRec & 1 = 0) and (flagsRec & 2 = 0) and (flagsRec & 4 = 0) and (flagsRec & 8 = 0)) as source
  on (source.ID = target.ID)
  when matched then update set target.flagsRec = source.flagsRec; 
  ---------------------------------------------------------------------
  `
  })
}
