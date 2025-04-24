module.exports.run = (conn, migrationParams) => {
  if (migrationParams.dialect === 'PostgreSQL') {
    conn.xhr({
      endpoint: 'runSQL',
      URLParams: { CONNECTION: 'main' },
      data: `UPDATE tim_timeSheet SET mtCount = COALESCE(subquery.newMtCount, 0)
FROM (
SELECT t.ID,
(SELECT t1.mtCount FROM tim_timeSheet t1 WHERE t1.employeeNumberID = t.employeeNumberID AND
 t1.dateWork = t.dateWork AND t1.isSchedule = 1 AND t1.mi_deleteUser is NULL LIMIT 1) newMtCount
from tim_timeSheet t 
where t.isSchedule =0 AND t.mi_deleteUser is NULL 
) AS subquery 
WHERE tim_timeSheet.ID = subquery.ID AND tim_timeSheet.mtCount <> subquery.newMtCount`
    })
  } else {
    conn.xhr({
      endpoint: 'runSQL',
      URLParams: { CONNECTION: 'main' },
      data: `UPDATE tim_timeSheet SET mtCount = COALESCE(subquery.newMtCount, 0)
FROM (
SELECT t.ID,
(SELECT TOP 1 t1.mtCount FROM tim_timeSheet t1 WHERE t1.employeeNumberID = t.employeeNumberID AND
 t1.dateWork = t.dateWork AND t1.isSchedule = 1 AND t1.mi_deleteUser is NULL) newMtCount
from tim_timeSheet t 
where t.isSchedule =0 AND t.mi_deleteUser is NULL 
) AS subquery 
WHERE tim_timeSheet.ID = subquery.ID AND tim_timeSheet.mtCount <> subquery.newMtCount`
    })
  }
}
