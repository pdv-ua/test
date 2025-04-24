module.exports.run = (conn, migrationParams) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `merge hr_docRegBountyHelp as target
  USING (
  select h.ID, dt.periodSalaryID 
  from hr_docRegBountyHelp h 
  JOIN hr_orderRegistryDt dt ON orderID = h.ID
  where h.mi_deleteDate>='9999-12-31') as source
  on (source.ID = target.ID)
  when matched then update set target.periodSalaryID = source.periodSalaryID; 
  ---------------------------------------------------------------------
  `
  })
}
