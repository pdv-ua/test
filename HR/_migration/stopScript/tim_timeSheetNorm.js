module.exports.run = (conn, migrationParams) => {
  if (migrationParams.dialect === 'PostgreSQL') {
    conn.xhr({
      endpoint: 'runSQL',
      URLParams: { CONNECTION: 'main' },
      data: `UPDATE tim_timeSheet SET normMonthDay = COALESCE(subquery.normDay, 0), normMonthHour = COALESCE(subquery.normHour, 0)
FROM (select t.ID, t.normMonthDay, t.normMonthHour,
p.workScheduleID, ws.planScheduleID, COALESCE(ws.planScheduleID, p.workScheduleID),
(SELECT SUM(CASE WHEN pl.workHours > 0 THEN 1 ELSE 0 END) FROM tim_plan pl WHERE pl.organizationID = p.organizationID 
 AND pl.workScheduleID = COALESCE(ws.planScheduleID, p.workScheduleID) AND 
 pl.dayDate >= date_trunc('month', p.dayDate) AND pl.dayDate <= (date_trunc('month', p.dayDate) + interval '1 month - 1 day')
AND pl.mi_deleteUser is NULL) normDay,
(SELECT SUM(COALESCE(pl.workHours, 0)) FROM tim_plan pl WHERE pl.organizationID = p.organizationID 
 AND pl.workScheduleID = COALESCE(ws.planScheduleID, p.workScheduleID) AND 
 pl.dayDate >= date_trunc('month', p.dayDate) AND pl.dayDate <= (date_trunc('month', p.dayDate) + interval '1 month - 1 day')
AND pl.mi_deleteUser is NULL) normHour
from tim_timeSheet t 
JOIN tim_plan p ON p.ID = t.planID
JOIN hr_workSchedule ws ON ws.ID = p.workScheduleID
LEFT JOIN hr_workSchedule ps ON ps.ID = ws.planScheduleID
where t.normMonthDay = 0 and t.mi_deleteUser is NULL
) AS subquery WHERE  tim_timeSheet.ID = subquery.ID`
    })
  } else {
    conn.xhr({
      endpoint: 'runSQL',
      URLParams: { CONNECTION: 'main' },
      data: `UPDATE tim_timeSheet SET normMonthDay = COALESCE(subquery.normDay, 0), normMonthHour = COALESCE(subquery.normHour, 0)
FROM (select t.ID,
(SELECT SUM(CASE WHEN pl.workHours > 0 THEN 1 ELSE 0 END) FROM tim_plan pl WHERE pl.organizationID = p.organizationID 
 AND pl.workScheduleID = COALESCE(ws.planScheduleID, p.workScheduleID) AND 
 pl.dayDate >= CONVERT(DATETIME, CONVERT(VARCHAR(7), p.dayDate, 120) + '-01') AND pl.dayDate <= EOMONTH(p.dayDate)
AND pl.mi_deleteUser is NULL) as 'normDay',
(SELECT SUM(COALESCE(pl.workHours, 0)) FROM tim_plan pl WHERE pl.organizationID = p.organizationID 
 AND pl.workScheduleID = COALESCE(ws.planScheduleID, p.workScheduleID) AND 
 pl.dayDate >= CONVERT(DATETIME, CONVERT(VARCHAR(7), p.dayDate, 120) + '-01') AND pl.dayDate <= EOMONTH(p.dayDate)
AND pl.mi_deleteUser is NULL) as 'normHour'
from tim_timeSheet t 
JOIN tim_plan p ON p.ID = t.planID
JOIN hr_workSchedule ws ON ws.ID = p.workScheduleID
LEFT JOIN hr_workSchedule ps ON ps.ID = ws.planScheduleID
where t.normMonthDay = 0 and t.mi_deleteUser is NULL) AS subquery 
WHERE  tim_timeSheet.ID = subquery.ID`
    })
  }
}
