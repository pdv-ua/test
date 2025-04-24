module.exports.run = (conn, migrationParams) => {
  if (migrationParams.dialect === 'PostgreSQL') {
    conn.xhr({
      endpoint: 'runSQL',
      URLParams: { CONNECTION: 'main' },
      data: `UPDATE tim_timeSheet SET normMonthHour = COALESCE(subquery.normHour, 0)
FROM (select t.ID,
(SELECT SUM(COALESCE(pl.workHours, 0)) FROM tim_plan pl WHERE pl.organizationID = p.organizationID 
 AND pl.workScheduleID = COALESCE(ws.planScheduleID, p.workScheduleID) AND 
 pl.dayDate >= date_trunc('month', p.dayDate) AND pl.dayDate <= (date_trunc('month', p.dayDate) + interval '1 month - 1 day')
AND pl.mi_deleteUser is NULL) * COALESCE(t.mtCount, 1) normHour
from tim_timeSheet t 
JOIN tim_plan p ON p.ID = t.planID
JOIN hr_workSchedule ws ON ws.ID = p.workScheduleID
LEFT JOIN hr_workSchedule ps ON ps.ID = ws.planScheduleID
where t.mi_deleteUser is NULL
) AS subquery WHERE  tim_timeSheet.ID = subquery.ID`
    })
  } else {
    conn.xhr({
      endpoint: 'runSQL',
      URLParams: { CONNECTION: 'main' },
      data: `UPDATE tim_timeSheet SET normMonthHour = COALESCE(subquery.normHour, 0)
FROM (select t.ID,
(SELECT SUM(COALESCE(pl.workHours, 0)) FROM tim_plan pl WHERE pl.organizationID = p.organizationID 
 AND pl.workScheduleID = COALESCE(ws.planScheduleID, p.workScheduleID) AND 
 pl.dayDate >= CONVERT(DATETIME, CONVERT(VARCHAR(7), p.dayDate, 120) + '-01') AND pl.dayDate <= EOMONTH(p.dayDate)
AND pl.mi_deleteUser is NULL) * COALESCE(t.mtCount, 1) as 'normHour'
from tim_timeSheet t 
JOIN tim_plan p ON p.ID = t.planID
JOIN hr_workSchedule ws ON ws.ID = p.workScheduleID
LEFT JOIN hr_workSchedule ps ON ps.ID = ws.planScheduleID
where t.mi_deleteUser is NULL) AS subquery 
WHERE  tim_timeSheet.ID = subquery.ID`
    })
  }
}
