module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `merge hr_accrual as target
  USING (
  select a.ID, a.flagsFix | 65536 as flagsFix 
  from hr_accrual a 
  where a.flagsFix & 16384 = 16384) as source
  on (source.ID = target.ID)
  when matched then update set target.flagsFix = source.flagsFix; 
  ---------------------------------------------------------------------
  `
  })

  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `merge hr_payRollDt as target
  USING (
  select a.ID, a.flagsFix | 65536 as flagsFix 
  from hr_payRollDt a 
  where a.flagsFix & 16384 = 16384) as source
  on (source.ID = target.ID)
  when matched then update set target.flagsFix = source.flagsFix; 
  ---------------------------------------------------------------------
  `
  })
}
