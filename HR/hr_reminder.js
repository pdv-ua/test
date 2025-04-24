const UB = require('@unitybase/ub')
const App = UB.App
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const dateService = require('../AC/modules/dataServices/dateService')
const staffService = require('../HR/modules/staffService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')
// const selectService = require('../AC/modules/dataServices/selectService')
const _ = require('lodash')

me.entity.addMethod('birthDays') // Дні народження
me.entity.addMethod('endProbationaryPeriod') // Закінчення випробувального терміну
me.entity.addMethod('endParentalLeave') // Закінчення відпусток (за видами)
me.entity.addMethod('endTemporaryAssignment') // Закінчення тимчасового призначення
me.entity.addMethod('getMyAudit') // Мої перевірки
me.entity.addMethod('getMyTasks') // Мої завдання
me.entity.addMethod('getCabRequest') // Заявки з Кабінету
me.entity.addMethod('getTimeSheet') // Відсутність за неявками тебелю
me.entity.addMethod('getTimeSheetPieData') // Відсутність за неявками тебелю (Дані для діаграми)
me.entity.addMethod('getFiredEmpsPieData') // Звільнені (за причинами звільнення) (Дані для діаграми)
me.entity.addMethod('getOrderAll') // Накази
me.entity.addMethod('getOrderAllPieData') // Накази (Дані для діаграми)
me.entity.addMethod('getEmpAmountLineData') // Чисельність персоналу (рік) (Дані для діаграми)
me.entity.addMethod('getRetirementData') // Настання пенсійного віку
me.entity.addMethod('getReminderOfWorkExperienceData') // Щомісячне нагадування про стажі

function getDepartment (params, onDate) {
  let allDeptsID = []
  if (params.filterAttr.depID) {
    let depIDs = params.filterAttr.depID.split(',')
    if (params.filterAttr.depIDSubDep) {
      for (let i = 0; i < depIDs.length; i++) {
        let childDep = UB.Repository('hr_department')
          .attrs('mi_data_id')
          .where('mi_treePath', 'like', `%${depIDs[i]}%`)
          .where('state', '=', 'ACTIVE')
          .where('mi_deleteDate', '>=', '9999-12-31')
          .where('mi_dateFrom', '<=', onDate)
          .where('mi_dateTo', '>=', onDate)
          .selectAsArrayOfValues()
        allDeptsID = allDeptsID.concat(childDep)
      }
    } else {
      allDeptsID = depIDs
    }
  }
  return allDeptsID
}

me.birthDays = function (ctx) {
  const mParams = ctx.mParams
  const userData = JSON.parse(mParams.userData)
  const reminder = UB.Repository('ac_reminder')
    .attrs(['params']).selectById(mParams.reminderID)
  const params = (reminder && reminder.params) ? JSON.parse(reminder.params) : { attr: {}, filterAttr: {} }
  const sqlDialect = entityBaseService.getSQLDialect()
  let store = UB.DataStore('hr_employeePosition')
  const dateFrom = dateService.todayDate()
  const dateTo = dateService.addDays(dateFrom, mParams.days)
  let indexDateFrom = (dateFrom - dateService.firstDayOfYear(dateFrom)) / 1000 / 60 / 60 / 24
  if (dateFrom.getMonth() > 1 && dateService.lastDayOfMonth(new Date(dateFrom.getFullYear(), 1, 1)).getDate() === 28) {
    indexDateFrom++
  }
  let indexDateTo = (dateTo - dateService.firstDayOfYear(dateTo)) / 1000 / 60 / 60 / 24
  if (dateTo.getMonth() > 1 && dateService.lastDayOfMonth(new Date(dateTo.getFullYear(), 1, 1)).getDate() === 28) {
    indexDateTo++
  }
  let allDeptsID = getDepartment(params, dateFrom)
  store.runSQL(` SELECT en.ID "employeeNumberID", ep.organizationID "rowOrgID", emp.ID "ID", emp.fullFIO "fullFIO", ${staffService.getPosFldOnDateSql(':onDate:', 'ep.positionID', 'fullNameNom')} "posName", emp.birthDate "dateEvent", o.name "rowOrgName"
      FROM hr_employeePosition ep 
        INNER JOIN hr_employeeNumber en ON en.ID = ep.employeeNumberID 
        INNER JOIN hr_employee emp on en.employeeID = emp.ID
        LEFT JOIN ac_organization o ON o.ID = en.orgID
        WHERE ep.organizationID${entityBaseService.getInExpression('orgIDs')}
    and en.dateFrom <= :onDate: 
    and en.dateTo >= :onDate:  
    and emp.birthDate is not null 
    and emp.mi_deleteDate >= '9999-12-31'
    and ep.isActive = 1     
    and ep.mi_deleteDate >= '9999-12-31' 
    and en.mi_deleteDate >= '9999-12-31'
    and :onDate: between ep.dateFrom and ep.dateTo
    ${params.filterAttr.dictStaffCatID ? `and ep.dictStaffCatID${entityBaseService.getInExpression('dictStaffCatID')}` : ''}
    ${allDeptsID.length ? `and ep.departmentID${entityBaseService.getInExpression('allDeptsID')}` : ''}
  and ${sqlDialect.dialect === 'MSSQL2012'
    ? `((YEAR(:dateFrom:) = YEAR(:dateTo:)
      and DATEDIFF(day, DATEFROMPARTS(YEAR(emp.birthDate), 1, 1), emp.birthDate)
        + IIF(MONTH(emp.birthDate) > 2 and DAY(EOMONTH(DATEFROMPARTS(YEAR(emp.birthDate), 2, 1))) = 28, 1, 0) BETWEEN :indexDateFrom: AND :indexDateTo:)
    or (YEAR(:dateFrom:) <> YEAR(:dateTo:)
      and (DATEDIFF(day, DATEFROMPARTS(YEAR(emp.birthDate), 1, 1), emp.birthDate)
        + IIF(MONTH(emp.birthDate) > 2 and DAY(EOMONTH(DATEFROMPARTS(YEAR(emp.birthDate), 2, 1))) = 28, 1, 0) >= :indexDateFrom:
      or DATEDIFF(day, DATEFROMPARTS(YEAR(emp.birthDate), 1, 1), emp.birthDate)
        + IIF(MONTH(emp.birthDate) > 2 and DAY(EOMONTH(DATEFROMPARTS(YEAR(emp.birthDate), 2, 1))) = 28, 1, 0) <= :indexDateTo:)))
    `
    : `(extract(year from cast(:dateFrom: as timestamp)) = extract(year from cast(:dateTo: as timestamp))
  and (date_part('days', emp.birthDate - make_date(date_part('years',(emp.birthDate))::int, 1, 1)) +
case when date_part('months', emp.birthDate) > 2
  and date_part('days', (date_trunc('month', make_date(date_part('years', emp.birthDate)::int, 2, 1)) + interval '1 month' - interval '1 day')::date) = 28
  then 1 else 0 end between :indexDateFrom: and :indexDateTo:)
  or (extract(year from cast(:dateFrom: as timestamp)) <> extract(year from cast(:dateTo: as timestamp))
  and (date_part('days', emp.birthDate - make_date(date_part('years',(emp.birthDate))::int, 1, 1)) +
case when date_part('months', emp.birthDate) > 2
  and date_part('days', (date_trunc('month', make_date(date_part('years', emp.birthDate)::int, 2, 1)) + interval '1 month' - interval '1 day')::date) = 28
  then 1 else 0 end >= :indexDateFrom:
    or date_part('days', emp.birthDate - make_date(date_part('years',(emp.birthDate))::int, 1, 1)) +
case when date_part('months', emp.birthDate) > 2
  and date_part('days', (date_trunc('month', make_date(date_part('years', emp.birthDate)::int, 2, 1)) + interval '1 month' - interval '1 day')::date) = 28
  then 1 else 0 end <= :indexDateTo:
    )
)
)`}
 `,
  {
    orgID: mParams.orgID,
    orgIDs: mParams.showOnlyCurrentOrg ? [mParams.orgID] : userData.userOrg,
    onDate: dateService.todayDate(),
    dateFrom,
    dateTo,
    indexDateFrom,
    indexDateTo,
    dictStaffCatID: params.filterAttr.dictStaffCatID ? params.filterAttr.dictStaffCatID.split(',') : null,
    allDeptsID
  })

  let empData = store.getAsJsObject()
  store.freeNative()
  empData.forEach(row => {
    row.fullYears = dateService.getYmd(dateService.shiftDate(row.dateEvent), dateService.currentDate()).years + 1
    row.dateEvent = dateService.formatDate(dateService.shiftDate(row.dateEvent), 'dd.mm')
  })

  let onlyAnniversaries = params.filterAttr.onlyAnniversaries
  empData = empData.filter(el => el.fullYears % (onlyAnniversaries ? (onlyAnniversaries === 'multi5' ? 5 : 10) : 1) === 0)

  ctx.mParams.resultData = JSON.stringify(empData)
}

me.endProbationaryPeriod = function (ctx) {
  const mParams = ctx.mParams
  const userData = JSON.parse(mParams.userData)
  const reminder = UB.Repository('ac_reminder')
    .attrs(['params']).selectById(mParams.reminderID)
  const params = (reminder && reminder.params) ? JSON.parse(reminder.params) : { attr: {}, filterAttr: {} }
  let store = UB.DataStore('hr_employeePosition')
  const dateFrom = dateService.todayDate()
  const dateTo = dateService.addDays(dateFrom, mParams.days)

  let allDeptsID = getDepartment(params, dateFrom)
  store.runSQL(` SELECT en.ID "employeeNumberID", ep.organizationID "rowOrgID", emp.ID "ID", emp.fullFIO "fullFIO", 
  ${staffService.getPosFldOnDateSql(':onDate:', 'ep.positionID', 'fullNameNom')} "posName", tp.dateTrialEnd "dateEvent", o.name "rowOrgName"
      FROM hr_employeeTrialPeriod tp 
        JOIN hr_employeePosition ep ON ep.ID = tp.employeePositionID 
        JOIN hr_employeeNumber en ON en.ID = tp.employeeNumberID 
        JOIN hr_employee emp on en.employeeID = emp.ID
        LEFT JOIN ac_organization o ON o.ID = en.orgID
        WHERE ep.organizationID${entityBaseService.getInExpression('orgIDs')}

          and tp.dateTrialEnd >= :dateFrom: and tp.dateTrialEnd <= :dateTo:
          and tp.mi_deleteDate >= '9999-12-31' 
          and ep.mi_deleteDate >= '9999-12-31'
          and en.mi_deleteDate >= '9999-12-31'
          and emp.mi_deleteDate >= '9999-12-31'
        ${params.filterAttr.dictStaffCatID ? `and ep.dictStaffCatID${entityBaseService.getInExpression('dictStaffCatID')}` : ''}
       ${allDeptsID.length ? `and ep.departmentID${entityBaseService.getInExpression('allDeptsID')}` : ''}
       ORDER BY tp.dateTrialEnd, emp.fullFIO
  `,
  {
    orgID: mParams.orgID,
    orgIDs: mParams.showOnlyCurrentOrg ? [mParams.orgID] : userData.userOrg,
    onDate: dateService.todayDate(),
    dateFrom,
    dateTo,
    dictStaffCatID: params.filterAttr.dictStaffCatID ? params.filterAttr.dictStaffCatID.split(',') : null,
    allDeptsID
  })

  let empData = store.getAsJsObject()
  store.freeNative()
  empData.forEach(row => {
    row.dateEvent = dateService.formatDate(dateService.shiftDate(row.dateEvent), 'dd.mm')
  })
  ctx.mParams.resultData = JSON.stringify(empData)
}

me.endParentalLeave = function (ctx) {
  const mParams = ctx.mParams
  const userData = JSON.parse(mParams.userData)
  const sqlDialect = entityBaseService.getSQLDialect()
  const reminder = UB.Repository('ac_reminder')
    .attrs(['params']).selectById(mParams.reminderID)
  const params = (reminder && reminder.params) ? JSON.parse(reminder.params) : { attr: {}, filterAttr: {} }
  let store = UB.DataStore('hr_employeePosition')
  const dateFrom = dateService.todayDate()
  const dateTo = dateService.addDays(dateFrom, mParams.days)
  const dictVacationKindID = params.filterAttr.dictVacationKindID ? params.filterAttr.dictVacationKindID.split(',') : null
  let allDeptsID = getDepartment(params, dateFrom)
  store.runSQL(` SELECT en.ID "employeeNumberID", ev.dictVacationKindID "dictVacationKind", ep.organizationID "rowOrgID", emp.ID "ID", emp.fullFIO "fullFIO",
   ${staffService.getPosFldOnDateSql(':onDate:', 'ep.positionID', 'fullNameNom')} "posName", ev.dateTo "dateEvent", o.name "rowOrgName"
      FROM hr_employeeVacation ev 
        JOIN hr_employeeNumber en ON en.ID = ev.employeeNumberID 
        JOIN hr_employee emp on en.employeeID = emp.ID
        LEFT JOIN ac_organization o ON o.ID = en.orgID
        JOIN  hr_employeePosition ep ON 
 ep.ID = (select ${sqlDialect.top} ep2.ID from hr_employeePosition ep2 where 
 ep2.employeeNumberID = en.ID 
 and ep2.isActive = 1
 and ep2.dateFrom <= :dateTo:   
 and ep2.mi_deleteDate >= '9999-12-31' 
 order by ep2.dateFrom desc ${sqlDialect.limit}) 
        WHERE ep.organizationID${entityBaseService.getInExpression('orgIDs')}
          ${dictVacationKindID ? `and ev.dictVacationKindID${entityBaseService.getInExpression('dictVacationKindID')}` : ''}
          and ev.dateTo >= :dateFrom: and ev.dateTo <= :dateTo:
          and ev.mi_deleteDate >= '9999-12-31' 
          and ep.mi_deleteDate >= '9999-12-31'
          and en.mi_deleteDate >= '9999-12-31'
          and emp.mi_deleteDate >= '9999-12-31'
        ${params.filterAttr.dictStaffCatID ? `and ep.dictStaffCatID${entityBaseService.getInExpression('dictStaffCatID')}` : ''}
       ${allDeptsID.length ? `and ep.departmentID${entityBaseService.getInExpression('allDeptsID')}` : ''}
       ORDER BY ev.dateTo, emp.fullFIO
  `,
  {
    orgID: mParams.orgID,
    orgIDs: mParams.showOnlyCurrentOrg ? [mParams.orgID] : userData.userOrg,
    onDate: dateService.todayDate(),
    dateFrom,
    dateTo,
    dictVacationKindID: dictVacationKindID,
    dictStaffCatID: params.filterAttr.dictStaffCatID ? params.filterAttr.dictStaffCatID.split(',') : null,
    allDeptsID
  })

  let empData = store.getAsJsObject()
  store.freeNative()
  empData.forEach(row => {
    row.dateEvent = dateService.formatDate(dateService.shiftDate(row.dateEvent), 'dd.mm')
  })
  ctx.mParams.resultData = JSON.stringify(empData)
}

me.endTemporaryAssignment = function (ctx) {
  const mParams = ctx.mParams
  const userData = JSON.parse(mParams.userData)
  const reminder = UB.Repository('ac_reminder')
    .attrs(['params']).selectById(mParams.reminderID)
  const params = (reminder && reminder.params) ? JSON.parse(reminder.params) : { attr: {}, filterAttr: {} }
  let store = UB.DataStore('hr_employeePosition')
  const dateFrom = dateService.todayDate()
  const dateTo = dateService.addDays(dateFrom, mParams.days)

  let allDeptsID = getDepartment(params, dateFrom)
  store.runSQL(` SELECT en.ID "employeeNumberID", ep.organizationID "rowOrgID", emp.ID "ID", emp.fullFIO "fullFIO", 
  ${staffService.getPosFldOnDateSql(':onDate:', 'ep.positionID', 'fullNameNom')} "posName", ep.dateTo "dateEvent", o.name "rowOrgName"
      FROM hr_employeePosition ep 
        JOIN hr_employeeNumber en ON en.ID = ep.employeeNumberID 
        JOIN hr_employee emp on en.employeeID = emp.ID
        JOIN hr_dictContractKind ck ON ck.ID = ep.dictContractKindID and ck.isTerm = 1
        LEFT JOIN ac_organization o ON o.ID = en.orgID
        WHERE ep.organizationID${entityBaseService.getInExpression('orgIDs')}
          and ep.dateTo >= :dateFrom: and ep.dateTo <= :dateTo:
          and ep.mi_deleteDate >= '9999-12-31'
          and ep.isActive = 1
          and en.mi_deleteDate >= '9999-12-31'
          and emp.mi_deleteDate >= '9999-12-31'
        ${params.filterAttr.dictStaffCatID ? `and ep.dictStaffCatID${entityBaseService.getInExpression('dictStaffCatID')}` : ''}
       ${allDeptsID.length ? `and ep.departmentID${entityBaseService.getInExpression('allDeptsID')}` : ''}
       ORDER BY ep.dateTo, emp.fullFIO
  `,
  {
    orgID: mParams.orgID,
    orgIDs: mParams.showOnlyCurrentOrg ? [mParams.orgID] : userData.userOrg,
    onDate: dateService.todayDate(),
    dateFrom,
    dateTo,
    dictStaffCatID: params.filterAttr.dictStaffCatID ? params.filterAttr.dictStaffCatID.split(',') : null,
    allDeptsID
  })

  let empData = store.getAsJsObject()
  store.freeNative()
  empData.forEach(row => {
    row.dateEvent = dateService.formatDate(dateService.shiftDate(row.dateEvent), 'dd.mm')
  })
  ctx.mParams.resultData = JSON.stringify(empData)
}

function getEmpPosList (mParams, params, userData) {
  const store = UB.DataStore('hr_employeePosition')
  store.runSQL(`
          SELECT
        en.employeeID AS "employeeID", ep.organizationID "rowOrgID"
       ,en.ID AS "employeeNumberID"
      FROM hr_employeePosition ep
      INNER JOIN hr_employeeNumber en
        ON en.ID = ep.employeeNumberID
      INNER JOIN hr_employee emp
        ON en.employeeID = emp.ID
      INNER JOIN (SELECT
          MIN(CASE
            WHEN empPos.workPlace IS NOT NULL THEN empPos.workPlace
            ELSE '99'
          END) AS workPlace
         ,employeeID
        FROM hr_employeePosition empPos
        WHERE empPos.isActive = 1
        AND empPos.mi_deleteDate >= '9999-12-31'
        AND :onDate: BETWEEN empPos.dateFrom AND empPos.dateTo
        GROUP BY empPos.employeeID) ep_uniq
        ON ep.employeeID = ep_uniq.employeeID
          AND (CASE
            WHEN ep.workPlace IS NOT NULL THEN ep.workPlace
            ELSE '99'
          END) = ep_uniq.workPlace
      WHERE ep.isActive = 1
      AND ep.mi_deleteDate >= '9999-12-31'
      AND en.mi_deleteDate >= '9999-12-31'
      ${mParams.dictStaffCatIDs && mParams.dictStaffCatIDs.length ? `and ep.dictStaffCatID${entityBaseService.getInExpression('dictStaffCatIDs')}` : ''}
      AND :onDate: BETWEEN en.dateFrom AND en.dateTo
      AND :onDate: BETWEEN ep.dateFrom AND ep.dateTo
      AND ep.organizationID${entityBaseService.getInExpression('orgIDs')}

    `,
  {
    onDate: mParams.onDate,
    orgID: mParams.orgID,
    orgIDs: mParams.showOnlyCurrentOrg ? [mParams.orgID] : userData.userOrg,
    dictStaffCatIDs: mParams.dictStaffCatIDs && mParams.dictStaffCatIDs.length ? mParams.dictStaffCatIDs.split(',') : []
  })
  const employeePosition = store.getAsJsObject()
  return employeePosition
}

me.getMyAudit = function (ctx) {
  const mParams = ctx.mParams
  let resultData = []
  const employeeNumberID = mParams.employeeNumberID
  if (mParams.isModelWFM && employeeNumberID) {
    const dateFrom = dateService.todayDate()
    const dateTo = dateService.addDays(dateFrom, mParams.days)

    resultData = UB.Repository('wfm_auditTime')
      .attrs('auditID', 'auditDate', 'employeeNumberID.employeeID.fullFIO', 'employeeNumberID.posName')
      .where('auditorID.employeeNumberID', '=', employeeNumberID)
      .where('auditID.docState', '=', 'POSTED')
      .where('auditDate', '>=', dateFrom)
      .where('auditDate', '<=', dateTo)
      .selectAsObject({
        'employeeNumberID.employeeID.fullFIO': 'fullFIO',
        'employeeNumberID.posName': 'posName',
        'auditID': 'ID'
      })
    resultData.forEach(row => {
      row.dateEvent = dateService.formatDate(dateService.shiftDate(row.auditDate), 'dd.mm')
    })
  }
  ctx.mParams.resultData = JSON.stringify(resultData)
}

me.getMyTasks = function (ctx) {
  const mParams = ctx.mParams
  const params = JSON.parse(mParams.params)
  const userData = JSON.parse(mParams.userData)
  const employeeNumberID = userData.employeeNumberID
  const todayDate = dateService.todayDate()

  let empOrderActingDet = UB.Repository('hr_empOrderActingDet')
    .attrs('paraID.positionID.mi_data_id')
    .where('employeeNumberID', '=', employeeNumberID || 0)
    .where('orderID.orderState', '=', 'POSTED')
    .where('dateFrom', '<=', dateService.shiftDate(todayDate))
    .where('dateTo', '>=', dateService.shiftDate(todayDate))
    .selectAsObject()
  const pos = empOrderActingDet ? empOrderActingDet.map(p => p['paraID.positionID.mi_data_id']) : [0]
  let dictTempExecution = UB.Repository('hr_dictTempExecution')
    .attrs('employeePositionTempID.employeeNumberID')
    .where('employeePositionID.employeeNumberID', '=', employeeNumberID || 0)
    .where('dateFrom', '<=', dateService.shiftDate(todayDate))
    .where('dateTo', '>=', dateService.shiftDate(todayDate))
    .where('employeePositionTempID.employeeNumberID', 'isNotNull')
    .selectAsObject()
  let p2 = UB.Repository('hr_employeePositionS')
    .attrs('employeeNumberID')
    .where('positionID', 'in', pos)
    .selectAsObject()
  let empOrderDet = UB.Repository('hr_empOrderDet')
    .attrs('paraID.employeeNumberID')
    .where('empOrderType', '=', 'ACTING')
    .where('orderID.orderState', '=', 'POSTED')
    .where('employeeNumberID', '=', employeeNumberID || 0)
    .where('dateFrom', '<=', dateService.shiftDate(todayDate), 'df')
    .where('dateFrom', 'isNull', undefined, 'dfn')
    .where('dateTo', '>=', dateService.shiftDate(todayDate), 'dt')
    .where('dateTo', 'isNull', undefined, 'dtn')
    .logic('(([df] or [dfn]) and ([dt] or [dtn]))')
    .selectAsObject()

  let stageKind
  if (params.attr.stageKind && params.attr.stageKind.length) {
    stageKind = params.attr.stageKind.split(',').map(o => o.replace(/"/g, ''))
  } else {
    stageKind = []
  }
  const dictTempExecutionIds = dictTempExecution ? dictTempExecution.map(i => i['employeePositionTempID.employeeNumberID'] || 0) : 0
  const employeePositionIDs = p2 ? p2.map(i => i['employeeNumberID'] || 0) : 0
  const empOrderEmpIDs = empOrderDet ? empOrderDet.map(i => i['paraID.employeeNumberID'] || 0) : 0
  let data = UB.Repository('hr_task')
    .attrs(['ID', 'participantID.recStageID.stageKind.name', 'docID.empOrderType.name', 'docID.orderDate', 'docID.orderNumber', 'mi_wfState.name', 'mi_createDate', 'mi_wfState'])
    .where('employeePositionID.employeeNumberID', 'in', [employeeNumberID || 0, ...dictTempExecutionIds, ...employeePositionIDs, ...empOrderEmpIDs])
    .whereIf(!!params.attr.taskState.length, 'mi_wfState', 'in', params.attr.taskState.length ? params.attr.taskState.split(',').map(o => o.replace(/"/g, '')) : [])
    .whereIf(!!stageKind.length, 'participantID.recStageID.stageKind', 'in', stageKind)
    .selectAsObject({
      'participantID.recStageID.stageKind.name': 'taskType',
      'docID.empOrderType.name': 'document',
      'mi_createDate': 'docDate',
      'docID.orderNumber': 'docNumber',
      'mi_wfState.name': 'taskState',
      'mi_wfState': 'taskStateCode'
    })

  data.forEach(row => {
    row.docDate = row.docDate ? dateService.formatDate(row.docDate) : ''
    row.docDescription = `${row.document} ${row.docNumber ? `№${row.docNumber}` : ''}`
  })

  ctx.mParams.resultData = JSON.stringify(data)
}

me.getCabRequest = function (ctx) {
  const mParams = ctx.mParams
  const params = JSON.parse(mParams.params)
  const userData = JSON.parse(mParams.userData)
  const orgID = mParams.orgID
  const orgIDs = mParams.showOnlyCurrentOrg ? [orgID] : userData.userOrg
  const employeeNumberID = userData.employeeNumberID
  const todayDate = dateService.todayDate()
  let showOnlyCurrUser = params.filterAttr.showOnlyCurrUser
  let allDepsID = getDepartment(params, todayDate)

  let request = UB.Repository('hr_request')
    .attrs(['ID', 'requestNumber', 'mi_createDate', 'employeeNumberID.description', 'requestType.name',
      'dateFrom', 'dateTo', 'dayCount', 'requestState.name', 'organizationID', 'organizationID.name'])
    .where('organizationID', 'in', orgIDs)
    .whereIf(showOnlyCurrUser, 'employeeNumberID', '=', employeeNumberID)
    .whereIf(!showOnlyCurrUser && params.filterAttr.depID && params.filterAttr.depID.length, 'employeeNumberID.depID', 'in', allDepsID)
    .whereIf(!showOnlyCurrUser && params.filterAttr.dictStaffCatID && params.filterAttr.dictStaffCatID.length, 'employeeNumberID.dictStaffCatID', 'in', params.filterAttr.dictStaffCatID.split(','))
    .whereIf(!!params.attr.requestState.length, 'requestState', 'in', params.attr.requestState.length ? params.attr.requestState.split(',').map(o => o.replace(/"/g, '')) : [])
    .where('organizationID.mi_dateFrom', '<=', todayDate)
    .where('organizationID.mi_dateTo', '>=', todayDate)
    .where('organizationID.mi_deleteDate', '>=', '#maxdate')
    .where('organizationID.state', '=', 'ACTIVE')
    .orderByDesc('requestDate')
    .selectAsObject({
      'employeeNumberID.description': 'fullFIO',
      'requestState.name': 'requestState',
      'requestType.name': 'requestType',
      'organizationID': 'rowOrgID',
      'organizationID.name': 'rowOrgName'
    })

  request.forEach(row => {
    row.mi_createDate = row.mi_createDate ? dateService.formatDate(row.mi_createDate, 'dd.mm.yyyy') : ''
    row.dateFrom = row.dateFrom ? dateService.formatDate(row.dateFrom) : ''
    row.dateTo = row.dateTo ? dateService.formatDate(row.dateTo) : ''

    row.requestNumDate = `№${row.requestNumber} від ${row.mi_createDate}`
    row.term = `${row.dateFrom.length ? `З ${row.dateFrom} ` : ''}${row.dateTo.length ? `По ${row.dateTo} ` : ''} ${row.dayCount ? `(${row.dayCount} днів)` : ''} `
  })

  ctx.mParams.resultData = JSON.stringify(request)
}

me.getTimeSheet = function (ctx) {
  const mParams = ctx.mParams
  const params = JSON.parse(mParams.params)
  const userData = JSON.parse(mParams.userData)
  const orgID = mParams.orgID
  const orgIDs = mParams.showOnlyCurrentOrg ? [orgID] : userData.userOrg
  const days = mParams.days

  const todayDate = dateService.todayDate()
  let dateList = []
  for (let day = 0; day < days; day++) {
    dateList.push(dateService.shiftDate(dateService.addDays(todayDate, day)))
  }

  let allDepsID = getDepartment(params, todayDate)

  let timeSheet = UB.Repository('tim_timeSheet')
    .attrs(['ID', 'factTimeCostID.nameSmall', 'employeeNumberID.orgID', 'employeeNumberID.description', 'employeeNumberID.posName',
      'dateWork', 'employeeNumberID', 'periodID', 'employeeNumberID.orgID.name'])
    .where('employeeNumberID.orgID', 'in', orgIDs)
    .where('isActive', '=', 1)
    .whereIf(params.filterAttr.depID && params.filterAttr.depID.length, 'employeeNumberID.depID', 'in', allDepsID)
    .whereIf(params.filterAttr.dictStaffCatID && params.filterAttr.dictStaffCatID.length, 'employeeNumberID.dictStaffCatID', 'in', params.filterAttr.dictStaffCatID.split(','))
    .whereIf(params.attr.factTimeCostID && params.attr.factTimeCostID.length, 'factTimeCostID', 'in', params.attr.factTimeCostID.split(','))
    .where('dateWork', 'in', dateList)
    .where('employeeNumberID.orgID.mi_dateFrom', '<=', todayDate)
    .where('employeeNumberID.orgID.mi_dateTo', '>=', todayDate)
    .where('employeeNumberID.orgID.mi_deleteDate', '>=', '#maxdate')
    .where('employeeNumberID.orgID.state', '=', 'ACTIVE')
    .selectAsObject({
      'factTimeCostID.nameSmall': 'factTimeCostName',
      'employeeNumberID.description': 'fullFIO',
      'employeeNumberID.posName': 'posName',
      'employeeNumberID.orgID': 'rowOrgID',
      'employeeNumberID.orgID.name': 'rowOrgName'
    })
  timeSheet.forEach(row => {
    row.dateEvent = row.dateWork ? dateService.formatDate(row.dateWork) : ''
    row.ID = row.employeeNumberID
  })

  ctx.mParams.resultData = JSON.stringify(timeSheet)
}

me.getTimeSheetPieData = function (ctx) {
  const mParams = ctx.mParams
  const params = JSON.parse(mParams.params)
  const userData = JSON.parse(mParams.userData)
  const orgID = mParams.orgID
  const orgIDs = mParams.showOnlyCurrentOrg ? [orgID] : userData.userOrg
  const days = mParams.days

  const todayDate = dateService.todayDate()
  let dateList = []
  for (let day = 0; day < days; day++) {
    dateList.push(dateService.shiftDate(dateService.addDays(todayDate, day)))
  }
  let allDepsID = getDepartment(params, todayDate)

  let timeSheetData = UB.Repository('tim_timeSheet')
    .attrs(['employeeNumberID.employeeID', 'employeeNumberID.orgID', 'employeeNumberID.employeeID.fullFIO', 'factTimeCostID.nameSmall', 'factTimeCostID', 'employeeNumberID'])
    .where('employeeNumberID.orgID', 'in', orgIDs)
    .where('isActive', '=', 1)
    .whereIf(params.filterAttr.depID && params.filterAttr.depID.length, 'employeeNumberID.depID', 'in', allDepsID)
    .whereIf(params.filterAttr.dictStaffCatID && params.filterAttr.dictStaffCatID.length, 'employeeNumberID.dictStaffCatID', 'in', params.filterAttr.dictStaffCatID.split(','))
    .whereIf(params.attr.factTimeCostID && params.attr.factTimeCostID.length, 'factTimeCostID', 'in', params.attr.factTimeCostID.split(','))
    .where('dateWork', 'in', dateList)
    .selectAsObject({
      'factTimeCostID.nameSmall': 'timeCostName',
      'employeeNumberID.employeeID': 'employeeID',
      'employeeNumberID.employeeID.fullFIO': 'fullFIO',
      'employeeNumberID.orgID': 'rowOrgID'
    })
  let timeSheet = []
  timeSheetData.forEach(ts => {
    let timeSheetGroup = timeSheet.find(el => el.factTimeCostID === ts.factTimeCostID)
    if (timeSheetGroup) {
      timeSheetGroup.count++
      timeSheetGroup.employeeList.push(ts)
    } else {
      timeSheet.push({
        factTimeCostID: ts.factTimeCostID,
        count: 1,
        name: ts.timeCostName,
        employeeList: [ts],
        rowOrgID: ts.rowOrgID
      })
    }
  })

  timeSheet.map(ts => {
    let newEmployeeList = []
    ts.employeeList.forEach(emp => {
      let empGroup = newEmployeeList.find(el => el.factTimeCostID === emp.factTimeCostID && el.employeeID === emp.employeeID)
      if (empGroup) {
        empGroup.count++
      } else {
        newEmployeeList.push({
          factTimeCostID: emp.factTimeCostID,
          count: 1,
          name: emp.timeCostName,
          employeeID: emp.employeeID,
          employeeNumberID: emp.employeeNumberID,
          fullFIO: emp.fullFIO,
          rowOrgName: 'rowOrgName'
        })
      }
    })
    ts.employeeList = newEmployeeList
    let rowOrgData = UB.Repository('hr_organization')
      .attrs(['ID', 'name'])
      .where('mi_data_id', '=', ts.rowOrgID)
      .where('state', '=', 'ACTIVE')
      .selectSingle()
    ts.rowOrgName = rowOrgData && rowOrgData.name
  })

  ctx.mParams.resultData = JSON.stringify(timeSheet)
}

me.getFiredEmpsPieData = function (ctx) {
  const mParams = ctx.mParams
  const userData = JSON.parse(mParams.userData)
  const orgID = mParams.orgID
  const orgIDs = mParams.showOnlyCurrentOrg ? [orgID] : userData.userOrg
  const days = mParams.days

  let dateTo = dateService.todayDate()
  let dateFrom = dateService.addDays(dateTo, -days)
  let result = []
  let empFiredList = UB.Repository('hr_employeeNumber')
    .attrs(['ID', 'changeOrderID', 'orgID', 'changeOrderID.orderClass.entityName', 'description'])
    .where('orgID', 'in', orgIDs)
    .where('dateTo', '>=', dateFrom)
    .where('dateTo', '<=', dateTo)
    .where('changeOrderID', 'isNotNull')
    .selectAsObject({
      'changeOrderID.orderClass.entityName': 'dismissOrderEntityName',
      'description': 'empName',
      'orgID': 'rowOrgID'
    })

  for (let idx = 0; idx < empFiredList.length; idx++) {
    let empNum = empFiredList[idx]
    let order
    if (empNum.dismissOrderEntityName === 'hr_orderPay') {
      order = UB.Repository('hr_orderPay').attrs(['reasonDismID', 'reasonDismID.caption']).where('ID', '=', empNum['changeOrderID']).selectSingle({
        'reasonDismID': 'reasonID',
        'reasonDismID.caption': 'reasonName'
      })
    } else if (empNum.dismissOrderEntityName === 'hr_empOrder') {
      order = UB.Repository('hr_empOrderDismDet').attrs(['dictReasonDismID', 'dictReasonDismID.caption', 'orderID.description', 'orderID'])
        .where('orderID', '=', empNum['changeOrderID']).where('employeeNumberID', '=', empNum.ID).selectSingle({
          'dictReasonDismID': 'reasonID',
          'dictReasonDismID.caption': 'reasonName',
          'orderID.description': 'orderDescription'
        })
    }

    empNum['reasonID'] = order && order.reasonID ? order.reasonID : 1
    empNum['reasonName'] = order && order['reasonName'] ? order['reasonName'] : 'Не заповнено'
    empNum['orderID'] = order && order['orderID'] ? order['orderID'] : null
    empNum['orderDescription'] = order && order['orderDescription'] ? order['orderDescription'] : 'Ручне коригування'
    let rowOrgData = UB.Repository('hr_organization')
      .attrs(['ID', 'name'])
      .where('mi_data_id', '=', empNum.rowOrgID)
      .where('state', '=', 'ACTIVE')
      .selectSingle()
    empNum.rowOrgName = rowOrgData && rowOrgData.name
    let reasonGroup = result.find(el => el.reasonID === empNum.reasonID)
    if (reasonGroup) {
      reasonGroup.count++
      reasonGroup.employeeList.push(empNum)
    } else {
      result.push({
        reasonID: empNum.reasonID,
        count: 1,
        name: empNum['reasonName'],
        employeeList: [empNum]
      })
    }
  }

  ctx.mParams.resultData = JSON.stringify(result)
}

me.getOrderAll = function (ctx) {
  const mParams = ctx.mParams
  const params = JSON.parse(mParams.params)
  const userData = JSON.parse(mParams.userData)
  const orgID = mParams.orgID
  const orgIDs = mParams.showOnlyCurrentOrg ? [orgID] : userData.userOrg
  const days = mParams.days

  let dateTo = dateService.addDays(dateService.todayDate(), 1)
  let dateFrom = dateService.addDays(dateTo, -days - 1)

  let result = UB.Repository('hr_empOrder')
    .attrs(['ID', 'description', 'organizationID', 'orderState.name', 'mi_createDate', 'employeeList', 'organizationID.name'])
    .where('organizationID', 'in', orgIDs)
    .whereIf(params.attr.orderState && params.attr.orderState.length, 'orderState', 'in', params.attr.orderState.length ? params.attr.orderState.replace(/"/g, '').split(',') : [])
    .where('mi_createDate', '<', dateTo)
    .where('mi_createDate', '>=', dateFrom)
    .where('organizationID.mi_dateFrom', '<=', dateTo)
    .where('organizationID.mi_dateTo', '>=', dateTo)
    .where('organizationID.mi_deleteDate', '>=', '#maxdate')
    .where('organizationID.state', '=', 'ACTIVE')
    .selectAsObject({
      'description': 'orderDesccriprion',
      'orderState.name': 'orderState',
      'organizationID': 'rowOrgID',
      'organizationID.name': 'rowOrgName'
    })
  result.forEach(row => {
    row.mi_createDate = dateService.formatDate(row.mi_createDate)
  })
  ctx.mParams.resultData = JSON.stringify(result)
}

me.getOrderAllPieData = function (ctx) {
  const mParams = ctx.mParams
  const userData = JSON.parse(mParams.userData)
  const orgID = mParams.orgID
  const days = mParams.days

  let dateTo = dateService.addDays(dateService.todayDate(), 1)
  let dateFrom = dateService.addDays(dateTo, -days - 1)

  let empOrder = UB.Repository('hr_empOrder')
    .attrs(['ID', 'description', 'orderState.name', 'mi_createDate', 'employeeList', 'orderState'])
    .whereIf(mParams.showOnlyCurrentOrg, 'organizationID', '=', orgID)
    .whereIf(!mParams.showOnlyCurrentOrg, 'organizationID', 'in', userData.userOrg)
    .where('mi_createDate', '<', dateTo)
    .where('mi_createDate', '>=', dateFrom)
    .selectAsObject({
      'description': 'orderDesccriprion'
    })
  let result = []
  empOrder.forEach(row => {
    let empOrderGroup = result.find(el => el.orderState === row.orderState)
    if (empOrderGroup) {
      empOrderGroup.count++
    } else {
      result.push({
        orderState: row.orderState,
        dateFrom: dateFrom,
        dateTo: dateTo,
        count: 1,
        name: row['orderState.name'],
        orgIDList: mParams.showOnlyCurrentOrg ? [orgID] : userData.userOrg
      })
    }
  })

  ctx.mParams.resultData = JSON.stringify(result)
}

me.getEmpAmountLineData = function (ctx) {
  const mParams = ctx.mParams
  const params = JSON.parse(mParams.params)
  const userData = JSON.parse(mParams.userData)
  const orgID = mParams.orgID
  const orgIDs = mParams.showOnlyCurrentOrg ? [orgID] : userData.userOrg

  const year = params.attr.year || dateService.todayDate().getFullYear()
  let data = [{ name: 'Січень', countEmployee: 0, countPos: 0, onDate: `${year}-01-01` }, { name: 'Лютий', countEmployee: 0, countPos: 0, onDate: `${year}-02-01` }, { name: 'Березень', countEmployee: 0, countPos: 0, onDate: `${year}-03-01` },
    { name: 'Квітень', countEmployee: 0, countPos: 0, onDate: `${year}-04-01` }, { name: 'Травень', countEmployee: 0, countPos: 0, onDate: `${year}-05-01` }, { name: 'Червень', countEmployee: 0, countPos: 0, onDate: `${year}-06-01` },
    { name: 'Липень', countEmployee: 0, countPos: 0, onDate: `${year}-07-01` }, { name: 'Серпень', countEmployee: 0, countPos: 0, onDate: `${year}-08-01` }, { name: 'Вересень', countEmployee: 0, countPos: 0, onDate: `${year}-09-01` },
    { name: 'Жовтень', countEmployee: 0, countPos: 0, onDate: `${year}-10-01` }, { name: 'Листопад', countEmployee: 0, countPos: 0, onDate: `${year}-11-01` }, { name: 'Грудень', countEmployee: 0, countPos: 0, onDate: `${year}-12-01` }]

  for (let month = 0; month < data.length; month++) {
    let onDate = dateService.shiftDate(data[month].onDate)

    const employeePosition = getEmpPosList({ orgID, onDate, dictStaffCatIDs: params.filterAttr.dictStaffCatID }, params, userData)

    data[month].countEmployee += employeePosition.length

    let positionData = UB.Repository('hr_position')
      .attrs(['quantity'])
      .where('orgID', 'in', orgIDs)
      .where('parentUnitID', 'isNull', undefined, 'parentIsNull')
      .where('parentUnitID.mi_dateTo', '>=', onDate, 'parentDateFrom')
      .where('parentUnitID.mi_dateFrom', '<=', onDate, 'parentDateTo')
      .where('parentUnitID.state', '=', 'ACTIVE', 'parentState')
      .where('mi_dateTo', '>=', onDate)
      .where('mi_dateFrom', '<=', onDate)
      .where('state', '=', 'ACTIVE')
      .whereIf(params.filterAttr.dictStaffCatID && params.filterAttr.dictStaffCatID.length, 'dictStaffCatID', 'in', params.filterAttr.dictStaffCatID.split(','))
      .logic('([parentIsNull] OR ([parentState] AND [parentDateFrom] AND [parentDateTo]))')
      .selectAsArrayOfValues()
    data[month].countPos += (positionData || [0]).reduce((a, b) => a + b, 0)
  }

  ctx.mParams.resultData = JSON.stringify(data)
}

me.getRetirementData = function (ctx) {
  const mParams = ctx.mParams
  const userData = JSON.parse(mParams.userData)

  let orgIDlist
  if (App.domainInfo.isEntityMethodsAccessible('ac_service', 'subOrg')) {
    const orgs = UB.Repository('hr_organization')
      .attrs(['mi_data_id'])
      .where('state', '=', 'ACTIVE')
      .where('mi_treePath', 'like', `%/${mParams.orgID}/%`)
      .groupBy('mi_data_id')
      .selectAsObject()
    if (orgs.length) {
      orgIDlist = orgs.filter(o => userData.userOrg.includes(o.mi_data_id)).map(o => o.mi_data_id)
    }
  } else {
    orgIDlist = [mParams.orgID]
  }

  const reminder = UB.Repository('ac_reminder')
    .attrs(['params']).selectById(mParams.reminderID)
  const params = (reminder && reminder.params) ? JSON.parse(reminder.params) : { attr: {}, filterAttr: {} }
  const sqlDialect = entityBaseService.getSQLDialect()
  let store = UB.DataStore('hr_employeePosition')
  const dateFrom = dateService.todayDate()
  const dateTo = dateService.addDays(dateFrom, mParams.days)
  let indexDateFrom = (dateFrom - dateService.firstDayOfYear(dateFrom)) / 1000 / 60 / 60 / 24
  if (dateFrom.getMonth() > 1 && dateService.lastDayOfMonth(new Date(dateFrom.getFullYear(), 1, 1)).getDate() === 28) {
    indexDateFrom++
  }

  let indexDateTo = (dateTo - dateService.firstDayOfYear(dateTo)) / 1000 / 60 / 60 / 24
  if (dateTo.getMonth() > 1 && dateService.lastDayOfMonth(new Date(dateTo.getFullYear(), 1, 1)).getDate() === 28) {
    indexDateTo++
  }
  let allDeptsID = getDepartment(params, dateFrom)
  store.runSQL(`SELECT T.rowOrgID "rowOrgName", T.ID, T.fullFIO, T.posName "posName", T.dateEvent FROM (
  SELECT emp.ID "ID"
  ,emp.fullFIO AS "fullFIO"
  ,(SELECT STRING_AGG(uniqOrg.name, ', ') "rowOrgID" From (SELECT DISTINCT org.name
    FROM hr_organization org
    INNER JOIN hr_employeePosition epOrg ON epOrg.organizationID = org.ID
    AND epOrg.mi_deleteDate >= '9999-12-31'
    AND epOrg.dateFrom <= :dateFrom:
    AND epOrg.dateTo >= :dateFrom:
    AND epOrg.isActive = 1
    INNER JOIN hr_employee eOrg ON epOrg.employeeID = eOrg.ID
    WHERE eOrg.ID = emp.ID
    AND org.state = 'ACTIVE') "uniqOrg") "rowOrgID"
  ,
  (SELECT STRING_AGG(uniqPos.fullNameNom, ', ') "posName" From (SELECT DISTINCT posSubQ.fullNameNom
    FROM hr_position posSubQ
    INNER JOIN hr_employeePosition epOrg ON epOrg.positionID = posSubQ.ID
    AND epOrg.mi_deleteDate >= '9999-12-31'
    AND epOrg.dateFrom <= :dateTo:
    AND epOrg.dateTo >= :dateTo:
    AND epOrg.isActive = 1
    INNER JOIN hr_employee eOrg ON epOrg.employeeID = eOrg.ID
    WHERE eOrg.ID = emp.ID
    AND posSubQ.state = 'ACTIVE' 
    AND posSubQ.mi_dateFrom <= :dateFrom:
    AND posSubQ.mi_deleteDate >= '9999-12-31'
    AND epOrg.organizationID${entityBaseService.getInExpression('orgIDs')}
    AND posSubQ.fullNameNom IS NOT NULL) "uniqPos") "posName",
  ${dateAddYear(dateAddMonth('emp.birthDate', `COALESCE(
    (SELECT TOP 1 months
    FROM hr_dictPensionAge
    WHERE dateTo = '9999-12-31'
    AND sexType = emp.sexType
    AND mi_deleteDate >= '9999-12-31'
    ORDER BY dateFrom DESC),
    0
)`), `COALESCE(
    (SELECT TOP 1 years
    FROM hr_dictPensionAge
    WHERE dateTo = '9999-12-31'
    AND sexType = emp.sexType
    AND mi_deleteDate >= '9999-12-31'
    ORDER BY dateFrom DESC),
    60
)`)} AS "dateEvent"
      FROM hr_employeePosition ep 
        INNER JOIN hr_employeeNumber en ON en.ID = ep.employeeNumberID 
        INNER JOIN hr_employee emp on en.employeeID = emp.ID
        WHERE ep.organizationID${entityBaseService.getInExpression('orgIDs')}
        
    and en.dateFrom <= :onDate: 
    and en.dateTo >= :onDate:  
    and emp.birthDate is not null 
    and emp.mi_deleteDate >= '9999-12-31'
    and ep.isActive = 1     
    and ep.mi_deleteDate >= '9999-12-31' 
    and en.mi_deleteDate >= '9999-12-31'
    and :onDate: between ep.dateFrom and ep.dateTo
    ${params.filterAttr.dictStaffCatID ? `and ep.dictStaffCatID${entityBaseService.getInExpression('dictStaffCatID')}` : ''}
    ${allDeptsID.length ? `and ep.departmentID${entityBaseService.getInExpression('allDeptsID')}` : ''}  
 ` + `) as T where 
 ${sqlDialect.dialect === 'MSSQL2012'
    ? `(DATEDIFF(day, DATEFROMPARTS(YEAR(T.dateEvent), 1, 1), T.dateEvent)
    + IIF(MONTH(T.dateEvent) > 2 AND DAY(EOMONTH(DATEFROMPARTS(YEAR(T.dateEvent), 2, 1))) = 28, 1, 0)
    BETWEEN :indexDateFrom: AND :indexDateTo:)
    AND YEAR(T.dateEvent) BETWEEN YEAR(:dateFrom:) AND YEAR(:dateTo:)
    `
    : `   (EXTRACT(DOY FROM T.dateEvent) 
    + CASE 
        WHEN EXTRACT(MONTH FROM T.dateEvent) > 2 
            AND EXTRACT(DAY FROM LAST_DAY(DATE_TRUNC('YEAR', T.dateEvent) + INTERVAL '1 month' - INTERVAL '1 day')) = 28 
        THEN 1 
        ELSE 0 
    END)
    BETWEEN EXTRACT(DOY FROM DATE_TRUNC('YEAR', T.dateEvent) + INTERVAL '1 day' - INTERVAL '1 day') + :indexDateFrom
    AND EXTRACT(DOY FROM DATE_TRUNC('YEAR', T.dateEvent) + INTERVAL '1 day' - INTERVAL '1 day') + :indexDateTo
    AND EXTRACT(YEAR FROM T.dateEvent) BETWEEN EXTRACT(YEAR FROM :dateFrom) AND EXTRACT(YEAR FROM :dateTo)`}
    GROUP BY T.ID, T.fullFIO, T.dateEvent, T.rowOrgID, T.posName`,
  {
    orgID: mParams.orgID,
    orgIDs: mParams.showOnlyCurrentOrg ? [mParams.orgID] : orgIDlist,
    onDate: dateService.todayDate(),
    dateFrom,
    dateTo,
    indexDateFrom,
    indexDateTo,
    dictStaffCatID: params.filterAttr.dictStaffCatID ? params.filterAttr.dictStaffCatID.split(',') : null,
    allDeptsID
  })

  let empData = store.getAsJsObject()
  store.freeNative()
  empData.forEach(row => {
    row.dateEvent = dateService.formatDate(dateService.shiftDate(row.dateEvent), 'dd.mm')
  })
  ctx.mParams.resultData = JSON.stringify(empData)
}

function dateAddFn (dt, datePart, addedValue) {
  if (_.isDate(dt)) {
    dt = dateService.formatDate4Sql(dt)
  }
  let dateStr = `CAST(${dt} as ${entityBaseService.isMsSql() ? 'DATETIME' : 'DATE'})`
  return entityBaseService.isMsSql() ? `DATEADD(${datePart}, ${addedValue}, ${dateStr})` : `${dateStr} + INTERVAL '${addedValue} ${datePart}'`
}

function dateAddMonth (dt, addedValue) {
  return dateAddFn(dt, 'month', addedValue)
}

function dateAddYear (dt, addedValue) {
  return dateAddFn(dt, 'year', addedValue)
}

me.getReminderOfWorkExperienceData = function (ctx) {
  const mParams = ctx.mParams
  const userData = JSON.parse(mParams.userData)
  const actualParams = JSON.parse(mParams.params)
  const orgIDs = actualParams.attr.showOnlyCurrentOrg ? [mParams.orgID] : userData.userOrg

  let deptIDs = []
  if (actualParams.filterAttr.depID) {
    const dept = UB.Repository('hr_department')
      .attrs(['description', 'fullName', 'mi_treePath'])
      .where('mi_data_id', '=', actualParams.filterAttr.depID)
      .where('state', '=', 'ACTIVE')
      .misc({ __mip_ondate: mParams.onDate })
      .selectSingle()

    if (actualParams.filterAttr.depIDSubDep) {
      const departments = UB.Repository('hr_department')
        .attrs(['mi_data_id'])
        .where('orgID', '=', mParams.orgID)
        .where('state', '=', 'ACTIVE')
        .where('mi_treePath', 'startsWith', dept.mi_treePath)
        .misc({ __mip_recordhistory_all: true })
        .groupBy('mi_data_id')
        .selectAsObject()
      if (departments.length) {
        deptIDs = departments.map(o => o.mi_data_id)
      } else {
        deptIDs = [actualParams.filterAttr.depID]
      }
    } else {
      deptIDs = [actualParams.filterAttr.depID]
    }
  }
  let myPeriod
  if (!mParams.periodMonth) {
    myPeriod = UB.Repository('hr_dictPeriod')
      .attrs(['ID'])
      .where('dateFrom', '>=', new Date(dateService.todayDate().setDate(1)))
      .where('dateTo', '<=', new Date(dateService.todayDate().setDate(1)))
      .selectSingle()
  } else {
    myPeriod = UB.Repository('hr_dictPeriod')
      .attrs('dictMonthID.code')
      .where('ID', '=', mParams.periodMonth)
      .selectSingle()
  }

  let resultData = []
  const resultEmployee = UB.Repository('hr_employeeNumberS')
    .attrs('employeeID', 'positionName', 'orgID', 'orgName')
    .whereIf(actualParams.filterAttr.dictStaffCatID, 'dictStaffCatID', '=', actualParams.filterAttr.dictStaffCatID)
    .where('orgID', 'in', orgIDs)
    .whereIf(deptIDs.length, 'depID', 'in', deptIDs)
    .selectAsObject()

  const employeeIDs = resultEmployee.map(employee => employee.employeeID)

  const resultQuestionExp = UB.Repository('hr_employeeExperience')
    .attrs('employeeID.fullFIO', 'dictExperienceID', 'calcDate', 'employeeID')
    .where('employeeID.organizationID', 'in', orgIDs)
    .whereIf(actualParams.attr.dictExperience, 'dictExperienceID', '=', actualParams.attr.dictExperience)
    .where('employeeID', 'in', employeeIDs)
    .selectAsObject()

  let myPosName
  let myOrgID
  let actualDate = dateService.currentDate()
  resultQuestionExp.forEach(strReuslt => {
    let dateExp = dateService.unshiftDate(strReuslt['calcDate'])
    if (dateExp.getMonth() === myPeriod['dictMonthID.code'] - 1) {
      let foundNamePos = resultEmployee.filter(item => item.employeeID === strReuslt.employeeID)
      let timeDifference = Math.abs(dateExp.getTime() - actualDate.getTime())
      let yearsDifference = Math.floor(timeDifference / (1000 * 3600 * 24 * 365.25))
      dateExp.setFullYear(dateExp.getFullYear() + yearsDifference)

      if (foundNamePos.length) {
        myPosName = foundNamePos[0].positionName
        myOrgID = foundNamePos[0].orgName
      }

      resultData.push({
        fullFIO: strReuslt['employeeID.fullFIO'],
        posName: myPosName,
        dateEvent: dateService.formatDate(dateExp, 'dd.mm'),
        factTimeCostExp: yearsDifference,
        rowOrgName: myOrgID,
        employeeID: strReuslt.employeeID
      }
      )
    }
  })
  ctx.mParams.resultData = JSON.stringify(resultData)
}
