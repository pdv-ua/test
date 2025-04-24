module.exports.run = (conn) => {
  const groupPlan = conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: ` select count(*), workScheduleID, workScheduleDaysID, organizationID, dayDate from tim_plan 
  where isCorrection = 0 AND mi_deleteDate>='9999-12-31'
  group BY workScheduleID, workScheduleDaysID, organizationID, dayDate 
  HAVING count(*) > 1
  ORDER BY dayDate`
  })
  groupPlan.forEach(group => {
    const plan = conn.xhr({
      endpoint: 'runSQL',
      URLParams: { CONNECTION: 'main' },
      data: ` select top 1 ID from tim_plan  where isCorrection = 0 AND mi_deleteUser is null
    and workScheduleID = ${group.workScheduleID} and workScheduleDaysID = ${group.workScheduleDaysID} 
    and organizationID = ${group.organizationID} and dayDate = '${group.dayDate}'
  ` })
    if (plan.length) {
      conn.xhr({
        endpoint: 'runSQL',
        URLParams: { CONNECTION: 'main' },
        data: ` update tim_plan SET mi_deleteDate = GETDATE(), mi_deleteUser = 10
         where ID <> ${plan[0].ID} and workScheduleID = ${group.workScheduleID} and workScheduleDaysID = ${group.workScheduleDaysID} 
    and organizationID = ${group.organizationID} and dayDate = '${group.dayDate}' and isCorrection = 0 AND mi_deleteUser is null
  ` })
    }
  })
}
