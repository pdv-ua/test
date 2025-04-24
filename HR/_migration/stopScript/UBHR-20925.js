module.exports.run = (conn, migrationParams) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `update hr_workSchedule SET weekDays = subquery.weekDays
FROM (SELECT ID,
(select Count(sd.ID) FROM hr_workScheduleDays sd 
JOIN hr_dictTimeCost tc ON tc.ID = sd.dictTimeCostID
WHERE sd.workScheduleID = ws.ID AND tc.timeCostType = 'WORK' AND sd.mi_deleteUser is NULL) weekDays
FROM hr_workSchedule ws 
WHERE ws.begins = 'FROM_WEEKBEGIN' AND ws.mi_deleteUser is NULL) AS subquery 
WHERE  hr_workSchedule.ID = subquery.ID`
  })
  if (migrationParams.dialect === 'PostgreSQL') {
    conn.xhr({
      endpoint: 'runSQL',
      URLParams: { CONNECTION: 'main' },
      data: `update trf_workNorm SET name = subquery.name, dateFrom = '2000-01-01', dateTo = '9999-12-31'
FROM (select wn.ID, ('Тижнева норма группування ' || CAST(wn.weekHours as varchar)) name FROM trf_workNorm wn) AS subquery 
WHERE  trf_workNorm.ID = subquery.ID `
    })
  } else {
    conn.xhr({
      endpoint: 'runSQL',
      URLParams: { CONNECTION: 'main' },
      data: `update trf_workNorm SET name = subquery.name, dateFrom = '2000-01-01', dateTo = '9999-12-31'
FROM (select wn.ID, ('Тижнева норма группування ' + CAST(wn.weekHours as varchar)) name FROM trf_workNorm wn) AS subquery 
WHERE  trf_workNorm.ID = subquery.ID`
    })
  }
  let workNorms = conn.Repository('trf_workNorm')
    .attrs(['ID', 'weekHours'])
    .orderBy('weekHours')
    .selectAsObject()

  let workNorm = {}
  workNorms.forEach(row => {
    if (workNorm.weekHours !== row.weekHours) {
      workNorm = row
    } else {
      conn.xhr({
        endpoint: 'runSQL',
        URLParams: { CONNECTION: 'main' },
        data: `update hr_accrual SET workNormID = ${workNorm.ID} WHERE workNormID = ${row.ID}`
      })
      conn.xhr({
        endpoint: 'runSQL',
        URLParams: { CONNECTION: 'main' },
        data: `update hr_accrualCopy SET workNormID = ${workNorm.ID} WHERE workNormID = ${row.ID}`
      })
      conn.xhr({
        endpoint: 'runSQL',
        URLParams: { CONNECTION: 'main' },
        data: `update hr_dictPosition SET workNormID = ${workNorm.ID} WHERE workNormID = ${row.ID}`
      })
      conn.xhr({
        endpoint: 'runSQL',
        URLParams: { CONNECTION: 'main' },
        data: `update hr_docRegShift SET workNormID = ${workNorm.ID} WHERE workNormID = ${row.ID}`
      })
      conn.xhr({
        endpoint: 'runSQL',
        URLParams: { CONNECTION: 'main' },
        data: `update trf_position SET workNormID = ${workNorm.ID} WHERE workNormID = ${row.ID}`
      })
      conn.xhr({
        endpoint: 'runSQL',
        URLParams: { CONNECTION: 'main' },
        data: `update trf_workNorm SET mi_deleteDate = '2020-12-31', mi_deleteUser = 10 WHERE ID = ${row.ID}`
      })
      conn.xhr({
        endpoint: 'runSQL',
        URLParams: { CONNECTION: 'main' },
        data: `update trf_workNormDt SET mi_deleteDate = '2020-12-31', mi_deleteUser = 10 WHERE workNormID = ${row.ID}`
      })
    }
  })
}
