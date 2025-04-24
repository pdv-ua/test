const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const selectService = require('../AC/modules/dataServices/selectService')
const dateService = require('../AC/modules/dataServices/dateService')
const calendarService = require('../HR/modules/calendarService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')

me.entity.addMethod('search')

me.search = function (ctx) {
  const mParams = ctx.mParams
  let runsql
  const today = dateService.currentTruncDate()
  const year = mParams.year || today.getFullYear()
  const firstDateOfYear = `${year}-01-01`
  const lastDateOfYear = `${year}-12-31`
  let vacKindFilter = mParams.vacKindID ? `vs.dictVacationKindID = '${mParams.vacKindID}'` : '1 = 1'
  let stateFilter = mParams.orderState ? `vs.state = '${mParams.orderState}'` : '1 = 1'
  let dateInterval1 = selectService.dateInterval(1)
  let recursiveStatment = entityBaseService.isPostgreSql() ? 'RECURSIVE' : ''
  let sqlText = `WITH ${recursiveStatment} dates AS
    (select
      ${selectService.dateAddMonth(firstDateOfYear, 0)} as df1, ${selectService.dateAddMonth(firstDateOfYear, 1)} - ${dateInterval1} as dt1,
      ${selectService.dateAddMonth(firstDateOfYear, 1)} as df2, ${selectService.dateAddMonth(firstDateOfYear, 2)} - ${dateInterval1} as dt2,
      ${selectService.dateAddMonth(firstDateOfYear, 2)} as df3, ${selectService.dateAddMonth(firstDateOfYear, 3)} - ${dateInterval1} as dt3,
      ${selectService.dateAddMonth(firstDateOfYear, 3)} as df4, ${selectService.dateAddMonth(firstDateOfYear, 4)} - ${dateInterval1} as dt4,
      ${selectService.dateAddMonth(firstDateOfYear, 4)} as df5, ${selectService.dateAddMonth(firstDateOfYear, 5)} - ${dateInterval1} as dt5,
      ${selectService.dateAddMonth(firstDateOfYear, 5)} as df6, ${selectService.dateAddMonth(firstDateOfYear, 6)} - ${dateInterval1} as dt6,
      ${selectService.dateAddMonth(firstDateOfYear, 6)} as df7, ${selectService.dateAddMonth(firstDateOfYear, 7)} - ${dateInterval1} as dt7,
      ${selectService.dateAddMonth(firstDateOfYear, 7)} as df8, ${selectService.dateAddMonth(firstDateOfYear, 8)} - ${dateInterval1} as dt8,
      ${selectService.dateAddMonth(firstDateOfYear, 8)} as df9, ${selectService.dateAddMonth(firstDateOfYear, 9)} - ${dateInterval1} as dt9,
      ${selectService.dateAddMonth(firstDateOfYear, 9)} as df10, ${selectService.dateAddMonth(firstDateOfYear, 10)} - ${dateInterval1} as dt10,
      ${selectService.dateAddMonth(firstDateOfYear, 10)} as df11, ${selectService.dateAddMonth(firstDateOfYear, 11)} - ${dateInterval1} as dt11,
      ${selectService.dateAddMonth(firstDateOfYear, 11)} as df12, CAST('${lastDateOfYear}' as DATE) as dt12),
    departments AS 
    (SELECT dpt.mi_data_id, dpt.name, dpt.mi_dateFrom, dpt.mi_dateTo, dpt.treePath
      FROM hr_department dpt
      WHERE dpt.orgID = :orgID:
       and dpt.mi_deleteDate >= '9999-12-31' 
       and dpt.state = 'ACTIVE'
    ),
    ${calendarService.getHolidayWithSql(firstDateOfYear, lastDateOfYear)}
  SELECT {0} {1}
      FROM 
      (SELECT ep.ID, en.ID as employeeNumberID, dept.treePath, dept.name as dept_name, pos.idxNum as pos_idxNum,
        pos.name as pos_name, emp.fullFIO as fullFIO,
        CASE WHEN vs.dateFrom <= '${lastDateOfYear}' and vs.dateTo >= '${firstDateOfYear}' THEN
          CASE WHEN vs.dateFrom < '${firstDateOfYear}' THEN '${firstDateOfYear}' ELSE vs.dateFrom END ELSE null END as periodFrom,
        CASE WHEN vs.dateFrom <= '${lastDateOfYear}' and vs.dateTo >= '${firstDateOfYear}' THEN
          CASE WHEN vs.dateTo < '${lastDateOfYear}' THEN vs.dateTo ELSE '${lastDateOfYear}' END ELSE null END as periodTo,
        CASE WHEN vs.dateFrom <= dates.dt1 and vs.dateTo >= dates.df1 THEN
          CASE WHEN vs.dateFrom < dates.df1 THEN dates.df1 ELSE vs.dateFrom END ELSE null END as df1,
        CASE WHEN vs.dateFrom <= dates.dt1 and vs.dateTo >= dates.df1 THEN  
          CASE WHEN vs.dateTo < dates.dt1 THEN vs.dateTo ELSE dates.dt1 END ELSE null END as dt1,
        CASE WHEN vs.dateFrom <= dates.dt2 and vs.dateTo >= dates.df2 THEN
          CASE WHEN vs.dateFrom < dates.df2 THEN dates.df2 ELSE vs.dateFrom END ELSE null END as df2,
        CASE WHEN vs.dateFrom <= dates.dt2 and vs.dateTo >= dates.df2 THEN  
          CASE WHEN vs.dateTo < dates.dt2 THEN vs.dateTo ELSE dates.dt2 END ELSE null END as dt2,
        CASE WHEN vs.dateFrom <= dates.dt3 and vs.dateTo >= dates.df3 THEN
          CASE WHEN vs.dateFrom < dates.df3 THEN dates.df3 ELSE vs.dateFrom END ELSE null END as df3,
        CASE WHEN vs.dateFrom <= dates.dt3 and vs.dateTo >= dates.df3 THEN  
          CASE WHEN vs.dateTo < dates.dt3 THEN vs.dateTo ELSE dates.dt3 END ELSE null END as dt3,
        CASE WHEN vs.dateFrom <= dates.dt4 and vs.dateTo >= dates.df4 THEN
          CASE WHEN vs.dateFrom < dates.df4 THEN dates.df4 ELSE vs.dateFrom END ELSE null END as df4,
        CASE WHEN vs.dateFrom <= dates.dt4 and vs.dateTo >= dates.df4 THEN  
          CASE WHEN vs.dateTo < dates.dt4 THEN vs.dateTo ELSE dates.dt4 END ELSE null END as dt4,
        CASE WHEN vs.dateFrom <= dates.dt5 and vs.dateTo >= dates.df5 THEN
          CASE WHEN vs.dateFrom < dates.df5 THEN dates.df5 ELSE vs.dateFrom END ELSE null END as df5,
        CASE WHEN vs.dateFrom <= dates.dt5 and vs.dateTo >= dates.df5 THEN  
          CASE WHEN vs.dateTo < dates.dt5 THEN vs.dateTo ELSE dates.dt5 END ELSE null END as dt5,
        CASE WHEN vs.dateFrom <= dates.dt6 and vs.dateTo >= dates.df6 THEN
          CASE WHEN vs.dateFrom < dates.df6 THEN dates.df6 ELSE vs.dateFrom END ELSE null END as df6,
        CASE WHEN vs.dateFrom <= dates.dt6 and vs.dateTo >= dates.df6 THEN  
          CASE WHEN vs.dateTo < dates.dt6 THEN vs.dateTo ELSE dates.dt6 END ELSE null END as dt6,
        CASE WHEN vs.dateFrom <= dates.dt7 and vs.dateTo >= dates.df7 THEN
          CASE WHEN vs.dateFrom < dates.df7 THEN dates.df7 ELSE vs.dateFrom END ELSE null END as df7,
        CASE WHEN vs.dateFrom <= dates.dt7 and vs.dateTo >= dates.df7 THEN  
          CASE WHEN vs.dateTo < dates.dt7 THEN vs.dateTo ELSE dates.dt7 END ELSE null END as dt7,
        CASE WHEN vs.dateFrom <= dates.dt8 and vs.dateTo >= dates.df8 THEN
          CASE WHEN vs.dateFrom < dates.df8 THEN dates.df8 ELSE vs.dateFrom END ELSE null END as df8,
        CASE WHEN vs.dateFrom <= dates.dt8 and vs.dateTo >= dates.df8 THEN  
          CASE WHEN vs.dateTo < dates.dt8 THEN vs.dateTo ELSE dates.dt8 END ELSE null END as dt8,
        CASE WHEN vs.dateFrom <= dates.dt9 and vs.dateTo >= dates.df9 THEN
          CASE WHEN vs.dateFrom < dates.df9 THEN dates.df9 ELSE vs.dateFrom END ELSE null END as df9,
        CASE WHEN vs.dateFrom <= dates.dt9 and vs.dateTo >= dates.df9 THEN  
          CASE WHEN vs.dateTo < dates.dt9 THEN vs.dateTo ELSE dates.dt9 END ELSE null END as dt9,
        CASE WHEN vs.dateFrom <= dates.dt10 and vs.dateTo >= dates.df10 THEN
          CASE WHEN vs.dateFrom < dates.df10 THEN dates.df10 ELSE vs.dateFrom END ELSE null END as df10,
        CASE WHEN vs.dateFrom <= dates.dt10 and vs.dateTo >= dates.df10 THEN
          CASE WHEN vs.dateTo < dates.dt10 THEN vs.dateTo ELSE dates.dt10 END ELSE null END as dt10,
        CASE WHEN vs.dateFrom <= dates.dt11 and vs.dateTo >= dates.df11 THEN
          CASE WHEN vs.dateFrom < dates.df11 THEN dates.df11 ELSE vs.dateFrom END ELSE null END as df11,
        CASE WHEN vs.dateFrom <= dates.dt11 and vs.dateTo >= dates.df11 THEN
          CASE WHEN vs.dateTo < dates.dt11 THEN vs.dateTo ELSE dates.dt11 END ELSE null END as dt11,
        CASE WHEN vs.dateFrom <= dates.dt12 and vs.dateTo >= dates.df12 THEN
          CASE WHEN vs.dateFrom < dates.df12 THEN dates.df12 ELSE vs.dateFrom END ELSE null END as df12,
        CASE WHEN vs.dateFrom <= dates.dt12 and vs.dateTo >= dates.df12 THEN
          CASE WHEN vs.dateTo < dates.dt12 THEN vs.dateTo ELSE dates.dt12 END ELSE null END as dt12,
        CASE WHEN vs.dateFrom <= dates.dt1 and vs.dateTo >= dates.df1 THEN CASE WHEN vs.state = 'APPROVED' THEN 1 ELSE 2 END ELSE 0 END as state1,
        CASE WHEN vs.dateFrom <= dates.dt2 and vs.dateTo >= dates.df2 THEN CASE WHEN vs.state = 'APPROVED' THEN 1 ELSE 2 END ELSE 0 END as state2,
        CASE WHEN vs.dateFrom <= dates.dt3 and vs.dateTo >= dates.df3 THEN CASE WHEN vs.state = 'APPROVED' THEN 1 ELSE 2 END ELSE 0 END as state3,
        CASE WHEN vs.dateFrom <= dates.dt4 and vs.dateTo >= dates.df4 THEN CASE WHEN vs.state = 'APPROVED' THEN 1 ELSE 2 END ELSE 0 END as state4,
        CASE WHEN vs.dateFrom <= dates.dt5 and vs.dateTo >= dates.df5 THEN CASE WHEN vs.state = 'APPROVED' THEN 1 ELSE 2 END ELSE 0 END as state5,
        CASE WHEN vs.dateFrom <= dates.dt6 and vs.dateTo >= dates.df6 THEN CASE WHEN vs.state = 'APPROVED' THEN 1 ELSE 2 END ELSE 0 END as state6,
        CASE WHEN vs.dateFrom <= dates.dt7 and vs.dateTo >= dates.df7 THEN CASE WHEN vs.state = 'APPROVED' THEN 1 ELSE 2 END ELSE 0 END as state7,
        CASE WHEN vs.dateFrom <= dates.dt8 and vs.dateTo >= dates.df8 THEN CASE WHEN vs.state = 'APPROVED' THEN 1 ELSE 2 END ELSE 0 END as state8,
        CASE WHEN vs.dateFrom <= dates.dt9 and vs.dateTo >= dates.df9 THEN CASE WHEN vs.state = 'APPROVED' THEN 1 ELSE 2 END ELSE 0 END as state9,
        CASE WHEN vs.dateFrom <= dates.dt10 and vs.dateTo >= dates.df10 THEN CASE WHEN vs.state = 'APPROVED' THEN 1 ELSE 2 END ELSE 0 END as state10,
        CASE WHEN vs.dateFrom <= dates.dt11 and vs.dateTo >= dates.df11 THEN CASE WHEN vs.state = 'APPROVED' THEN 1 ELSE 2 END ELSE 0 END as state11,
        CASE WHEN vs.dateFrom <= dates.dt12 and vs.dateTo >= dates.df12 THEN CASE WHEN vs.state = 'APPROVED' THEN 1 ELSE 2 END ELSE 0 END as state12,
        (SELECT COUNT(*) FROM holidays h WHERE h.dayDate between '${firstDateOfYear}' and '${lastDateOfYear}') as hld,
        (SELECT COUNT(*) FROM holidays h WHERE h.dayDate between CASE WHEN vs.dateFrom < dates.df1 THEN dates.df1 ELSE vs.dateFrom END
          and CASE WHEN vs.dateTo < dates.dt1 THEN vs.dateTo ELSE dates.dt1 END) as hld1,
        (SELECT COUNT(*) FROM holidays h WHERE h.dayDate between CASE WHEN vs.dateFrom < dates.df2 THEN dates.df2 ELSE vs.dateFrom END
          and CASE WHEN vs.dateTo < dates.dt2 THEN vs.dateTo ELSE dates.dt2 END) as hld2,
        (SELECT COUNT(*) FROM holidays h WHERE h.dayDate between CASE WHEN vs.dateFrom < dates.df3 THEN dates.df3 ELSE vs.dateFrom END
          and CASE WHEN vs.dateTo < dates.dt3 THEN vs.dateTo ELSE dates.dt3 END) as hld3,
        (SELECT COUNT(*) FROM holidays h WHERE h.dayDate between CASE WHEN vs.dateFrom < dates.df4 THEN dates.df4 ELSE vs.dateFrom END
          and CASE WHEN vs.dateTo < dates.dt4 THEN vs.dateTo ELSE dates.dt4 END) as hld4,
        (SELECT COUNT(*) FROM holidays h WHERE h.dayDate between CASE WHEN vs.dateFrom < dates.df5 THEN dates.df5 ELSE vs.dateFrom END
          and CASE WHEN vs.dateTo < dates.dt5 THEN vs.dateTo ELSE dates.dt5 END) as hld5,
        (SELECT COUNT(*) FROM holidays h WHERE h.dayDate between CASE WHEN vs.dateFrom < dates.df6 THEN dates.df6 ELSE vs.dateFrom END
          and CASE WHEN vs.dateTo < dates.dt6 THEN vs.dateTo ELSE dates.dt6 END) as hld6,
        (SELECT COUNT(*) FROM holidays h WHERE h.dayDate between CASE WHEN vs.dateFrom < dates.df7 THEN dates.df7 ELSE vs.dateFrom END
          and CASE WHEN vs.dateTo < dates.dt7 THEN vs.dateTo ELSE dates.dt7 END) as hld7,
        (SELECT COUNT(*) FROM holidays h WHERE h.dayDate between CASE WHEN vs.dateFrom < dates.df8 THEN dates.df8 ELSE vs.dateFrom END
          and CASE WHEN vs.dateTo < dates.dt8 THEN vs.dateTo ELSE dates.dt8 END) as hld8,
        (SELECT COUNT(*) FROM holidays h WHERE h.dayDate between CASE WHEN vs.dateFrom < dates.df9 THEN dates.df9 ELSE vs.dateFrom END
          and CASE WHEN vs.dateTo < dates.dt9 THEN vs.dateTo ELSE dates.dt9 END) as hld9,
        (SELECT COUNT(*) FROM holidays h WHERE h.dayDate between CASE WHEN vs.dateFrom < dates.df10 THEN dates.df10 ELSE vs.dateFrom END
          and CASE WHEN vs.dateTo < dates.dt10 THEN vs.dateTo ELSE dates.dt10 END) as hld10,
        (SELECT COUNT(*) FROM holidays h WHERE h.dayDate between CASE WHEN vs.dateFrom < dates.df11 THEN dates.df11 ELSE vs.dateFrom END
          and CASE WHEN vs.dateTo < dates.dt11 THEN vs.dateTo ELSE dates.dt11 END) as hld11,
        (SELECT COUNT(*) FROM holidays h WHERE h.dayDate between CASE WHEN vs.dateFrom < dates.df12 THEN dates.df12 ELSE vs.dateFrom END
          and CASE WHEN vs.dateTo < dates.dt12 THEN vs.dateTo ELSE dates.dt12 END) as hld12
      FROM hr_vacationSchedule vs
      INNER JOIN hr_employeePosition ep ON vs.employeePositionID = ep.ID
        and vs.organizationID = :orgID:
        and vs.year = :year:
        and vs.mi_deleteDate >= '9999-12-31'
        and ${vacKindFilter}
        and ${stateFilter}
      INNER JOIN hr_employeeNumber en ON en.ID = ep.employeeNumberID
        and en.mi_deleteDate >= '9999-12-31' 
      INNER JOIN hr_employee emp on en.employeeID = emp.ID
        and emp.mi_deleteDate >= '9999-12-31'
      LEFT JOIN hr_position pos on pos.mi_data_id = ep.positionID
        and ep.dateTo between pos.mi_dateFrom and pos.mi_dateTo 
        and pos.mi_deleteDate >= '9999-12-31' 
        and pos.state = 'ACTIVE'
      LEFT JOIN departments dept on dept.mi_data_id = ep.departmentID
        and ep.dateTo between dept.mi_dateFrom and dept.mi_dateTo 
      CROSS JOIN dates       
      {2}
      ) d
    GROUP BY d.ID, d.employeeNumberID, d.treePath, d.dept_name, d.pos_idxNum, d.pos_name, d.fullFIO
    {3}
    {4}`
  let sqlCountText = `WITH departments AS 
    (SELECT dpt.mi_data_id, dpt.name, dpt.mi_dateFrom, dpt.mi_dateTo, dpt.treePath
      FROM hr_department dpt
      WHERE dpt.orgID = :orgID:
       and dpt.mi_deleteDate >= '9999-12-31' 
       and dpt.state = 'ACTIVE'
    ) 
    SELECT COUNT(*) as cnt
    FROM
    (SELECT ep.ID
      FROM hr_vacationSchedule vs
      INNER JOIN hr_employeePosition ep ON vs.employeePositionID = ep.ID
        and vs.organizationID = :orgID:
        and vs.year = :year:
        and vs.mi_deleteDate >= '9999-12-31'
        and ${vacKindFilter}
        and ${stateFilter}
      INNER JOIN hr_employeeNumber en ON en.ID = ep.employeeNumberID
        and en.mi_deleteDate >= '9999-12-31' 
      INNER JOIN hr_employee emp on en.employeeID = emp.ID
        and emp.mi_deleteDate >= '9999-12-31'
      LEFT JOIN hr_position pos on pos.mi_data_id = ep.positionID
        and ep.dateTo between pos.mi_dateFrom and pos.mi_dateTo 
        and pos.mi_deleteDate >= '9999-12-31' 
        and pos.state = 'ACTIVE'
      LEFT JOIN departments dept on dept.mi_data_id = ep.departmentID
        and ep.dateTo between dept.mi_dateFrom and dept.mi_dateTo 
    {0}
    GROUP BY ep.ID, en.ID, dept.treePath, dept.name, pos.idxNum, pos.name, emp.fullFIO) d`

  let sqlBuilder = {
    text: sqlText,
    clauses: {},
    aliases: {
      ID: { field: 'd.ID' },
      employeeNumberID: { field: 'd.employeeNumberID' },
      dept: { field: 'd.dept_name', fieldwhere: 'dept.name' },
      pos: { field: 'd.pos_name', fieldwhere: 'pos.name' },
      emp: { field: 'd.fullFIO', fieldwhere: 'emp.fullFIO' },
      days: {
        field: `SUM(CASE WHEN d.df1 is not null and d.dt1 is not null THEN ${selectService.dateDiffFn('d.df1', 'd.dt1')} + 1 - d.hld1 ELSE 0 END) +
          SUM(CASE WHEN d.df2 is not null and d.dt2 is not null THEN ${selectService.dateDiffFn('d.df2', 'd.dt2')} + 1 - d.hld2 ELSE 0 END) +
          SUM(CASE WHEN d.df3 is not null and d.dt3 is not null THEN ${selectService.dateDiffFn('d.df3', 'd.dt3')} + 1 - d.hld3 ELSE 0 END) +
          SUM(CASE WHEN d.df4 is not null and d.dt4 is not null THEN ${selectService.dateDiffFn('d.df4', 'd.dt4')} + 1 - d.hld4 ELSE 0 END) +
          SUM(CASE WHEN d.df5 is not null and d.dt5 is not null THEN ${selectService.dateDiffFn('d.df5', 'd.dt5')} + 1 - d.hld5 ELSE 0 END) +
          SUM(CASE WHEN d.df6 is not null and d.dt6 is not null THEN ${selectService.dateDiffFn('d.df6', 'd.dt6')} + 1 - d.hld6 ELSE 0 END) +
          SUM(CASE WHEN d.df7 is not null and d.dt7 is not null THEN ${selectService.dateDiffFn('d.df7', 'd.dt7')} + 1 - d.hld7 ELSE 0 END) +
          SUM(CASE WHEN d.df8 is not null and d.dt8 is not null THEN ${selectService.dateDiffFn('d.df8', 'd.dt8')} + 1 - d.hld8 ELSE 0 END) +
          SUM(CASE WHEN d.df9 is not null and d.dt9 is not null THEN ${selectService.dateDiffFn('d.df9', 'd.dt9')} + 1 - d.hld9 ELSE 0 END) +
          SUM(CASE WHEN d.df10 is not null and d.dt10 is not null THEN ${selectService.dateDiffFn('d.df10', 'd.dt10')} + 1 - d.hld10 ELSE 0 END) +
          SUM(CASE WHEN d.df11 is not null and d.dt11 is not null THEN ${selectService.dateDiffFn('d.df11', 'd.dt11')} + 1 - d.hld11 ELSE 0 END) +
          SUM(CASE WHEN d.df12 is not null and d.dt12 is not null THEN ${selectService.dateDiffFn('d.df12', 'd.dt12')} + 1 - d.hld12 ELSE 0 END)`
      },
      month01: {
        field: `SUM(CASE WHEN d.df1 is not null and d.dt1 is not null THEN ${selectService.dateDiffFn('d.df1', 'd.dt1')} + 1 - d.hld1 ELSE 0 END)`
      },
      month02: {
        field: `SUM(CASE WHEN d.df2 is not null and d.dt2 is not null THEN ${selectService.dateDiffFn('d.df2', 'd.dt2')} + 1 - d.hld2 ELSE 0 END)`
      },
      month03: {
        field: `SUM(CASE WHEN d.df3 is not null and d.dt3 is not null THEN ${selectService.dateDiffFn('d.df3', 'd.dt3')} + 1 - d.hld3 ELSE 0 END)`
      },
      month04: {
        field: `SUM(CASE WHEN d.df4 is not null and d.dt4 is not null THEN ${selectService.dateDiffFn('d.df4', 'd.dt4')} + 1 - d.hld4 ELSE 0 END)`
      },
      month05: {
        field: `SUM(CASE WHEN d.df5 is not null and d.dt5 is not null THEN ${selectService.dateDiffFn('d.df5', 'd.dt5')} + 1 - d.hld5 ELSE 0 END)`
      },
      month06: {
        field: `SUM(CASE WHEN d.df6 is not null and d.dt6 is not null THEN ${selectService.dateDiffFn('d.df6', 'd.dt6')} + 1 - d.hld6 ELSE 0 END)`
      },
      month07: {
        field: `SUM(CASE WHEN d.df7 is not null and d.dt7 is not null THEN ${selectService.dateDiffFn('d.df7', 'd.dt7')} + 1 - d.hld7 ELSE 0 END)`
      },
      month08: {
        field: `SUM(CASE WHEN d.df8 is not null and d.dt8 is not null THEN ${selectService.dateDiffFn('d.df8', 'd.dt8')} + 1 - d.hld8 ELSE 0 END)`
      },
      month09: {
        field: `SUM(CASE WHEN d.df9 is not null and d.dt9 is not null THEN ${selectService.dateDiffFn('d.df9', 'd.dt9')} + 1 - d.hld9 ELSE 0 END)`
      },
      month10: {
        field: `SUM(CASE WHEN d.df10 is not null and d.dt10 is not null THEN ${selectService.dateDiffFn('d.df10', 'd.dt10')} + 1 - d.hld10 ELSE 0 END)`
      },
      month11: {
        field: `SUM(CASE WHEN d.df11 is not null and d.dt11 is not null THEN ${selectService.dateDiffFn('d.df11', 'd.dt11')} + 1 - d.hld11 ELSE 0 END)`
      },
      month12: {
        field: `SUM(CASE WHEN d.df12 is not null and d.dt12 is not null THEN ${selectService.dateDiffFn('d.df12', 'd.dt12')} + 1 - d.hld12 ELSE 0 END)`
      },
      stateApproved01: {
        field: `MAX(state1)`
      },
      stateApproved02: {
        field: `MAX(state2)`
      },
      stateApproved03: {
        field: `MAX(state3)`
      },
      stateApproved04: {
        field: `MAX(state4)`
      },
      stateApproved05: {
        field: `MAX(state5)`
      },
      stateApproved06: {
        field: `MAX(state6)`
      },
      stateApproved07: {
        field: `MAX(state7)`
      },
      stateApproved08: {
        field: `MAX(state8)`
      },
      stateApproved09: {
        field: `MAX(state9)`
      },
      stateApproved10: {
        field: `MAX(state10)`
      },
      stateApproved11: {
        field: `MAX(state11)`
      },
      stateApproved12: {
        field: `MAX(state12)`
      }
    },
    params: {}
  }

  sqlBuilder.clauses = selectService.getClauses(ctx,
    sqlBuilder.params,
    sqlBuilder.aliases,
    me.getWhereClause(mParams),
    '',
    true)

  sqlBuilder.clauses.whereParams.orgID = mParams.orgID
  sqlBuilder.clauses.whereParams.onDate = dateService.shiftDate(mParams.onDate) || today
  sqlBuilder.clauses.whereParams.year = year

  sqlBuilder.clauses.orderClause = sqlBuilder.clauses.orderClause || 'ORDER BY d.treePath, d.pos_idxNum, d.fullFIO'

  if (mParams.options && mParams.options.totalRequired) {
    runsql = UB.format(sqlCountText, sqlBuilder.clauses.whereClause)
    ctx.dataStore.runSQL(runsql, sqlBuilder.clauses.whereParams)
    if (!ctx.dataStore.eof) {
      mParams.__totalRecCount = ctx.dataStore.get(0)
    }
  }
  runsql = UB.format(sqlBuilder.text,
    sqlBuilder.clauses.limitClause,
    sqlBuilder.clauses.fieldList,
    sqlBuilder.clauses.whereClause,
    sqlBuilder.clauses.orderClause,
    sqlBuilder.clauses.maxLimitClause)

  ctx.dataStore.runSQL(runsql, sqlBuilder.clauses.whereParams)

  ctx.inherite = false

  return true
}

me.getWhereClause = function (mParams) {
  const today = dateService.currentTruncDate()
  const year = mParams.year || today.getFullYear()
  const firstDateOfYear = `${year}-01-01`
  const lastDateOfYear = `${year}-12-31`
  let depClause = mParams.departmentID && !mParams.subDepartment ? `ep.departmentID = ${mParams.departmentID}` : '1 = 1'
  let subDepClause
  if (mParams.departmentID && mParams.subDepartment) {
    let depTreePath = UB.Repository('hr_department')
      .attrs(['mi_treePath'])
      .where('state', '=', 'ACTIVE')
      .where('mi_data_id', '=', mParams.departmentID)
      .misc({ __mip_ondate: mParams.onDate || today })
      .limit(1)
      .selectScalar()
    subDepClause = ` ep.departmentID in (select distinct mi_data_id from hr_department d
  where d.orgID = :orgID: 
    and d.state = 'ACTIVE' 
    and d.mi_deleteDate >= '9999-12-31' 
    and '${lastDateOfYear}' >= d.mi_dateFrom
    and '${firstDateOfYear}' <= d.mi_dateTo 
    and d.mi_treePath like '${depTreePath}%' 
  )`
  } else {
    subDepClause = '1 = 1'
  }

  let isCatChiefs = mParams.catChiefs
  let isCatOthers = mParams.catOthers
  let catFilter = '1 = 1'
  if ((isCatChiefs || isCatOthers) && !(isCatChiefs && isCatOthers)) {
    if (isCatChiefs) {
      catFilter = `pos.positionCategory = '1'`
    } else {
      catFilter = `(pos.positionCategory != '1' or pos.positionCategory is NULL)`
    }
  }

  let whereClause = ` ep.isActive = 1 and ep.organizationID = :orgID:    
    and ep.mi_deleteDate >= '9999-12-31' 
    and ${depClause}
    and ${subDepClause}
    and ${catFilter}
  `

  return whereClause
}
