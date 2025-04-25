const UB = require('@unitybase/ub')
const App = UB.App

const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const payElService = require('../HR/modules/payElService')
const dateService = require('../AC/modules/dataServices/dateService')
const currencyService = require('../AC/public/core/currencyService')
const tarifficationService = require('../HR/modules/tarifficationService')
const settingsService = require('../AC/modules/entityServices/settingsService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')
const _ = require('lodash')

const selectService = require('../AC/modules/dataServices/selectService')
const reportService = require('../HR/modules/reportService')

me.entity.addMethod('getBaseReport')
me.entity.addMethod('getReportList')
me.entity.addMethod('getSammaryRates')
me.entity.addMethod('calcEmployeeExperience')
me.entity.addMethod('getStatement')
me.entity.addMethod('getWholeSchoolIndicators')
me.entity.addMethod('getSalaryCosts')
me.entity.addMethod('getSchoolID')
me.entity.addMethod('getConsolidatedStatementDeductions')
me.entity.addMethod('getConsolidatedStatementDictProgClass')
me.entity.addMethod('getConsolidatedStatementDepartment')
me.entity.addMethod('getLeaderDepartmentEmpl')
me.entity.addMethod('getTimesheet')
me.entity.addMethod('getPayrollEducation')

me.getLeaderDepartmentEmpl = ctx => {
  let runsql
  const orgID = ctx.mParams.organizationID
  const leadOrganization = getLeadOrg(orgID)
  function getLeadOrg (orgID) {
    const organization = UB.Repository('hr_organization')
      .attrs('mi_data_id', 'parentUnitID')
      .where('mi_data_id', '=', orgID)
      .where('mi_treePath', 'like', `%/${orgID}/%`)
      .selectSingle({ 'mi_data_id': 'orgID' })
    return organization.parentUnitID ? organization.parentUnitID : null
  }
  let sqlBuilder = {
    text: `select orgPer.ID AS ID, emp.shortFIO AS shortFIO, orgPer.dateFrom AS dateFrom, orgPer.dateTo AS dateTo
      from ac_orgRespPerson orgPer
      left join org_employeeonstaff empSt on empSt.ID = orgPer.emponstaffID
	    left join hr_employee emp on emp.ID = empSt.employeeID
	    where orgPer.organizationID = :organizationID:
      and orgPer.mi_deleteDate >= '9999-12-31'
      and orgPer.dateFrom <= :dateFrom:
      and orgPer.dateTo IS NULL or orgPer.dateTo >= :dateTo:
      and orgPer.responsiblePerson = 'chief'
      group by orgPer.ID, emp.shortFIO,orgPer.dateFrom, orgPer.dateTo
    `,
    params: {}
  }
  sqlBuilder.clauses = selectService.getClauses(ctx,
    sqlBuilder.params,
    me.getWhereClause(ctx.mParams),
    '',
    true)
  sqlBuilder.clauses.whereParams.organizationID = leadOrganization
  sqlBuilder.clauses.whereParams.IDs = ctx.mParams.IDs
  sqlBuilder.clauses.whereParams.dateFrom = ctx.mParams.currentDate || dateService.currentDate()
  sqlBuilder.clauses.whereParams.dateTo = ctx.mParams.currentDate || dateService.currentDate()
  runsql = UB.format(sqlBuilder.text,
    sqlBuilder.clauses.limitClause,
    sqlBuilder.clauses.fieldList,
    sqlBuilder.clauses.whereClause,
    sqlBuilder.clauses.orderClause,
    sqlBuilder.clauses.maxLimitClause
  )
  ctx.dataStore.runSQL(runsql, sqlBuilder.clauses.whereParams)
  ctx.inherite = false
  return true
}
me.calcEmployeeExperience = ctx => {
  const params = JSON.parse(ctx.mParams.params)
  const employeesExperience = params.map(o => {
    const employeeExperience = tarifficationService.calcEmployeeExperience(o)
    o.employeeExperience = JSON.stringify(employeeExperience)
    return o
  })
  ctx.mParams.employeeExperience = JSON.stringify(employeesExperience)
}
me.getSchoolID = parentIDs => {
  let org = UB.Repository('hr_organization')
    .attrs(['name', 'mi_data_id', 'EDRPOUCode', 'staffOrderID.description', 'mi_dateFrom'])
    .where('state', '=', 'ACTIVE')
    .where('parentUnitID', 'in', parentIDs)
    .selectAsObject()
  if (org && org.length) {
    const orgIDs = org.map(o => o.mi_data_id)
    return me.getSchoolID(orgIDs)
  } else {
    return parentIDs
  }
}

me.getWhereClause = function (mParams) {
  return mParams.IDs ? ` t.ID in (${mParams.IDs}) ` : ' 1 = 1'
}
me.getBaseReport = ctx => {
  const params = ctx.mParams.execParams
  const documentID = params.reportParams ? params.reportParams.documentID : null
  const periodTo = dateService.shiftDate(params.objPeriodToDateTo)
  const orgID = params.joinReport ? JSON.parse(params.orgIDs) : params.organization
  const dictProgClassID = params.dictProgClassID ? params.dictProgClassID.split(',').map(o => Number(o)) : []
  const dictFundSourceID = params.dictFundSourceID ? params.dictFundSourceID.split(',').map(o => Number(o)) : []
  const showPostedWorkPlace = params.reportParams ? params.reportParams.showPostedWorkPlace : true
  const departmentIDs = params.subDivision ? params.subDivision.split(',').map(o => Number(o)) : null

  const hrOrg = UB.Repository('hr_organization')
    .attrs('name', 'mi_data_id')
    .where('mi_data_id', 'in', orgID)
    .where('state', '=', 'ACTIVE')
    .misc({ __mip_ondate: periodTo })
    .orderBy('mi_dateFrom', 'desc')
    .selectAsObject()

  const dictFundSource = UB.Repository('trf_position')
    .attrs('dictFundSourceID', 'dictFundSourceID.name')
    .where('workPlaceID.documentID.orgID', 'in', orgID)
    .where('workPlaceID.dateFrom', '<=', dateService.shiftDate(params.issueDate))
    .where('workPlaceID.dateTo', '>=', dateService.shiftDate(params.issueDate))
    .where('dictProgClassID', '!=', null)
    .whereIf(documentID, 'workPlaceID.documentID', '=', documentID)
    .whereIf(dictFundSourceID.length, 'dictFundSourceID', 'in', dictFundSourceID)
    .whereIf(dictProgClassID.length, 'dictProgClassID', 'in', dictProgClassID)
    .whereIf(departmentIDs, 'workPlaceID.departmentID', 'in', departmentIDs)
    .where('mi_deleteDate', '>=', '#maxdate', 'deleteDate')
    .groupBy(['dictFundSourceID', 'dictFundSourceID.name'])
    .selectAsObject({ 'dictFundSourceID.name': 'dictFundSourceName' })
  const baseRequest = UB.DataStore('trf_accrual')
  const sqlDialect = entityBaseService.getSQLDialect()
  if (params.lessAccrual) {
    baseRequest.runSQL(`
  select n1.tabNum "tabNum",
  p1.ID "positionID",
  d1.orgID "orgID",
  w1.employeeNumberID "employeeNumberID",
  e1.ID "ID",
  e1.fullFIO "fullFIO",
  dp1.name,
  n1.dateFrom "dateFrom",
  p1.posIndex,
  coalesce(d1.ID, null) "documentID",
  coalesce(s1.name, '') "subjectName",
  coalesce(dq1.name, '') "dictQualificationName",
  coalesce(el.name, '') "dictEducationLevel",
  coalesce(dt1.code, '') "dictTarifCoeff",
  coalesce(w1.dateFrom, null) "onDate",
  p1.dictFundSourceID "dictFundSourceID",
  dp1.positionCategory "positionCategory",
  dpa.name "departmentName",
   (SELECT sum(a1.accrualSum) FROM trf_accrual a1 
  left join hr_payEl pE1 on a1.payElID=pE1.ID
  left join hr_method m1 on pE1.methodID=m1.ID
  where a1.positionID = p1.ID and m1.code in ('1', '143') and a1.mi_deleteDate >= '9999-12-31'
  ) "accrualSum1",
  (SELECT sum(a2.accrualSum) FROM trf_accrual a2 
  left join hr_payEl pE2 on a2.payElID=pE2.ID
  left join hr_method m2 on pE2.methodID=m2.ID
  where a2.positionID = p1.ID and m2.code in ('154') and a2.mi_deleteDate >= '9999-12-31'
  ) "classLead",
  (SELECT sum(a2.hours) FROM trf_accrual a2 
  left join hr_payEl pE2 on a2.payElID=pE2.ID
  left join hr_method m2 on pE2.methodID=m2.ID
  where a2.positionID = p1.ID and pE2.code in ('1025') and a2.mi_deleteDate >= '9999-12-31'
  ) "workshopHours",
  (SELECT sum(a2.accrualSum) FROM trf_accrual a2 
  left join hr_payEl pE2 on a2.payElID=pE2.ID
  left join hr_method m2 on pE2.methodID=m2.ID
  where a2.positionID = p1.ID and pE2.code in ('1025') and a2.mi_deleteDate >= '9999-12-31'
  ) "workshopAccrSum",
  (SELECT sum(a1.accrualSum) FROM trf_accrual a1 
  left join hr_payEl pE1 on a1.payElID=pE1.ID
  left join hr_method m1 on pE1.methodID=m1.ID
  where a1.positionID = p1.ID and m1.code not in ('143', '144', '152', '145') and a1.mi_deleteDate >= '9999-12-31'
  ) "positionSum",
  coalesce(p1.rate, null) "workPlaceRate",
  coalesce(wn1.weekhours,null) "weekHours",
  (SELECT sum(a2.accrualSum) FROM trf_accrual a2 
  left join hr_payEl pE2 on a2.payElID=pE2.ID
  left join hr_method m2 on pE2.methodID=m2.ID
    where a2.positionID = p1.ID and m2.code in ('145') and a2.mi_deleteDate >= '9999-12-31'
    ) "accrualSum2",
  p1.dictPartID "dictPartID"
from trf_position p1
inner join trf_workPlace w1 on w1.id = p1.workPlaceID and w1.mi_deleteDate = '9999-12-31'
inner join trf_document d1 on d1.id = w1.documentID and d1.mi_deleteDate = '9999-12-31'
left join trf_worknorm wn1 on wn1.ID = p1.workNormID
left join hr_dictPosition dp1 ON dp1.ID = p1.dictPositionID
left join hr_dictTarifCoeff dt1 on dt1.ID = p1.dictTarifCoeffID 
left join hr_dictEducationLevel el on el.ID = p1.dictEducationLevelID 
left join trf_dictQualification dq1 on dq1.ID = p1.dictQualificationID
left join trf_dictSubject s1 on s1.ID = p1.dictSubjectID
left join hr_employeeNumber n1 on n1.id = w1.employeeNumberID 
left join hr_employee e1 on e1.id = n1.employeeID
left join hr_department dpa on w1.departmentID = dpa.id
where :dateFrom: between w1.dateFrom and w1.dateTo
and d1.orgID in (${orgID})
${departmentIDs ? `and w1.departmentid in (${departmentIDs})` : ''}
and d1.type = :type:
and p1.mi_deleteDate = '9999-12-31'
and d1.mi_deleteDate = '9999-12-31'
and w1.mi_deleteDate = '9999-12-31'
and w1.dateTo > :dateFrom:
and coalesce(n1.dateTo,'9999-12-31') > :dateFrom:
order by n1.tabNumSort
  `,
    {
      dateFrom: dateService.shiftDate(params.issueDate),
      type: params.tarificationType
    })
  } else {
    baseRequest.runSQL(`
  select n1.tabNum "tabNum",
  n1.tabNumSort "tabNumSort",
  p1.ID "positionID",
  d1.orgID "orgID",
  w1.employeeNumberID "employeeNumberID",
  w1.ID "ID",
  e1.fullFIO "fullFIO",
  dp1.name,
  p1.posIndex "posIndex",
  n1.dateFrom "dateFrom",
  coalesce(d1.ID, null) "documentID",
  coalesce(s1.name, '') "subjectName",
  coalesce(dq1.name, '') "dictQualificationName",
  coalesce(el.name, '') "dictEducationLevel",
  coalesce(dt1.code, '') "dictTarifCoeff",
  coalesce(w1.dateFrom, null) "onDate",
  p1.dictFundSourceID "dictFundSourceID",
  dp1.positionCategory "positionCategory",
  dpa.name "departmentName",
  (SELECT sum(a1.accrualSum) FROM trf_accrual a1 
  left join hr_payEl pE1 on a1.payElID=pE1.ID
  left join hr_method m1 on pE1.methodID=m1.ID
  where a1.positionID = p1.ID and m1.code in ('1', '143') and a1.mi_deleteDate >= '9999-12-31'
  ) "accrualSum1",
  (SELECT sum(a2.accrualSum) FROM trf_accrual a2 
  left join hr_payEl pE2 on a2.payElID=pE2.ID
  left join hr_method m2 on pE2.methodID=m2.ID
  where a2.positionID = p1.ID and m2.code in ('154') and a2.mi_deleteDate >= '9999-12-31'
  ) "classLead",
  (SELECT  ${sqlDialect.top} a2.leadingClass FROM trf_accrual a2 
    left join hr_payEl pE2 on a2.payElID=pE2.ID
    left join hr_method m2 on pE2.methodID=m2.ID
    left join trf_position p2 on p2.ID = a2.positionID
    left join trf_workPlace w2 on w2.ID = p1.workPlaceID
    where a2.positionID = p1.ID and m2.code in ('154') 
    and a2.mi_deleteDate >= '9999-12-31'
    and w2.mi_deleteDate >= '9999-12-31'
    and p2.dictSubjectID = p1.dictSubjectID
    and a2.positionID = p1.ID
    and w2.ID = w1.ID
    order by w2.dateFrom
    asc ${sqlDialect.limit}) "leadingClass",
  (SELECT sum(a2.hours) FROM trf_accrual a2 
  left join hr_payEl pE2 on a2.payElID=pE2.ID
  left join hr_method m2 on pE2.methodID=m2.ID
  where a2.positionID = p1.ID and pE2.code in ('1025') and a2.mi_deleteDate >= '9999-12-31'
  ) "workshopHours",
  (SELECT sum(a2.accrualSum) FROM trf_accrual a2 
  left join hr_payEl pE2 on a2.payElID=pE2.ID
  left join hr_method m2 on pE2.methodID=m2.ID
  where a2.positionID = p1.ID and pE2.code in ('1025') and a2.mi_deleteDate >= '9999-12-31'
  ) "workshopAccrSum",
  (SELECT sum(a1.accrualSum) FROM trf_accrual a1 
  left join hr_payEl pE1 on a1.payElID=pE1.ID
  left join hr_method m1 on pE1.methodID=m1.ID
  where a1.positionID = p1.ID and m1.code not in ('74', '143', '144', '152', '145') and a1.mi_deleteDate >= '9999-12-31'
  ) "positionSum",
  coalesce(p1.rate, null) "workPlaceRate",
  coalesce(wn1.weekhours,null) "weekHours",
  (SELECT sum(a2.accrualSum) FROM trf_accrual a2 
  left join hr_payEl pE2 on a2.payElID=pE2.ID
  left join hr_method m2 on pE2.methodID=m2.ID
    where a2.positionID = p1.ID and m2.code in ('145') and a2.mi_deleteDate >= '9999-12-31'
    ) "accrualSum2",
  p1.dictPartID "dictPartID"
from trf_position p1
inner join trf_workPlace w1 on w1.id = p1.workPlaceID
inner join trf_document d1 on d1.id = w1.documentID
left join trf_worknorm wn1 on wn1.ID = p1.workNormID
left join hr_dictPosition dp1 on dp1.ID = p1.dictPositionID
left join hr_dictTarifCoeff dt1 on dt1.ID = p1.dictTarifCoeffID 
left join hr_dictEducationLevel el on el.ID = p1.dictEducationLevelID 
left join trf_dictQualification dq1 on dq1.ID = p1.dictQualificationID
left join trf_dictSubject s1 on s1.ID = p1.dictSubjectID
left join hr_employeeNumber n1 on n1.id = w1.employeeNumberID
left join hr_employee e1 on e1.id = n1.employeeID
left join hr_department dpa on w1.departmentID = dpa.id
where :dateFrom: between w1.dateFrom and w1.dateTo
and d1.orgID in (${orgID})
and d1.type = :type:
and p1.mi_deleteDate = '9999-12-31'
and d1.mi_deleteDate = '9999-12-31'
and w1.mi_deleteDate = '9999-12-31'
${showPostedWorkPlace ? `and w1.state = 'POSTED'` : ''}
${documentID ? `and d1.id = ${documentID}` : ''}
${departmentIDs ? `and w1.departmentid in (${departmentIDs})` : ''}
and w1.dateTo > :dateFrom:
and coalesce(n1.dateTo,'9999-12-31') > :dateFrom:
order by n1.tabNumSort
  `,
    {
      dateFrom: dateService.shiftDate(params.issueDate),
      type: params.tarificationType
    })
  }
  let posArr = JSON.parse(baseRequest.asJSONObject)

  if (posArr.length && params.workPlaceType === '3') posArr = posArr.filter(o => o.employeeNumberID === null)
  if (posArr.length && params.workPlaceType === '2') posArr = posArr.filter(o => o.employeeNumberID !== null)
  if (documentID) posArr = posArr.filter(o => o.documentID === documentID)

  const trfAccruals = UB.Repository('trf_accrual')
    .attrs('positionID', 'positionID.workPlaceID.employeeNumberID.employeeID', 'positionID.dictFundSourceID', 'positionID.workPlaceID.documentID.orgID', 'payElID.name', 'accrualSum', 'hours', 'payElID', 'positionID.dictPositionID.positionCategory', 'rate', 'payElID.comment', 'payElID.methodID.code', 'baseSum', 'payElID.methodID.name', 'dictPupilID.code', 'payElID.code')
    .where('positionID.workPlaceID.documentID.orgID', 'in', orgID)
    .where('positionID.workPlaceID.dateFrom', '<=', dateService.shiftDate(params.issueDate))
    .where('positionID.workPlaceID.dateTo', '>=', dateService.shiftDate(params.issueDate))
    .where('positionID.workPlaceID.documentID.type', '=', params.tarificationType)
    .where('positionID.workPlaceID.employeeNumberID.dateTo', '>', dateService.shiftDate(params.issueDate),'cond1')
    .where('positionID.workPlaceID.employeeNumberID', 'isNull',undefined,'cond2')
    .whereIf(showPostedWorkPlace, 'positionID.workPlaceID.state', '=', 'POSTED')
    .whereIf(documentID, 'positionID.workPlaceID.documentID', '=', documentID)
    .where('positionID.mi_deleteDate', '>=', '9999-12-31')
    .whereIf(params.dictPartID && params.dictPartID.length, 'positionID.dictPartID', 'in', params.dictPartID.split(','))
    .whereIf(params.dictFundSourceID.length, 'positionID.dictFundSourceID', 'in', params.dictFundSourceID.split(','))
    .whereIf(params.workPlaceType === '2', 'positionID.workPlaceID.employeeNumberID', 'isNotNull')
    .whereIf(params.workPlaceType === '3', 'positionID.workPlaceID.employeeNumberID', 'isNull')
    .whereIf(params.positionCategory.length, 'positionID.dictPositionID.positionCategory', 'in', params.positionCategory)
    .whereIf(departmentIDs, 'workPlaceID.departmentID', 'in', departmentIDs)
    .logic('(([cond1]) or ([cond2]))')
    .selectAsObject({
      'positionID.workPlaceID.employeeNumberID.employeeID': 'ID', 'payElID.name': 'rise', 'positionID.dictFundSourceID': 'dictFundSourceID', 'positionID.workPlaceID.documentID.orgID': 'orgID', 'positionID.dictPositionID.positionCategory': 'positionCategory', 'accrualSum': 'riseSum', 'payElID.comment': 'payElComment', 'payElID.methodID.code': 'methodCode', 'payElID.methodID.name': 'methodName', 'dictPupilID.code': 'code', 'payElID.code': 'payElCode'
    }).sort((a, b) => a.payElCode - b.payElCode)

  const accrualAlt = trfAccruals.filter(o => ['144', '152'].includes(o.methodCode))

  const teachLoad = trfAccruals.filter(o => ['146'].includes(o.methodCode))

  const noteBooksLoad = trfAccruals.filter(o => ['148'].includes(o.methodCode))

  const overpayPositions = trfAccruals.filter(o => ['4', '6'].includes(o.methodCode))

  const maternityLeave = trfAccruals.filter(o => ['14', '57', '140'].includes(o.methodCode))


  // Experience filter
  if (params.dictExperienceID) {
    const dictExperienceID = params.dictExperienceID.split(',')
    posArr = posArr.filter(o => {
      params.employeeNumberID = o.employeeNumberID
      params.onDate = dateService.shiftDate(o.onDate)
      const experience = tarifficationService.calcEmployeeExperience(params)
      if (experience.length && dictExperienceID.find(p => Number(p) === experience[0].ID)) {
        o.experience = differencExperience(experience[0])
        return o
      }
    })
  }
  if (params.positionCategory.length) {
    posArr = filterAccrParams(posArr, 'positionCategory')
  }
  if (params.dictFundSourceID.length) {
    posArr = filterAccrParams(posArr, 'dictFundSourceID')
  }
  if (params.dictPartID.length) {
    posArr = filterAccrParams(posArr, 'dictPartID')
  }

  function filterAccrParams (arr, val) {
    const filterArr = []
    let valArr
    if (typeof params[val] === 'string') {
      valArr = params[val].split(',').map(o => {
        o = Number(o)
        if (o) {
          return o
        } else {
          return null
        }
      })
    } else {
      valArr = params[val]
    }
    arr.forEach(o => valArr.forEach(e => {
      if (o[val] === e) filterArr.push(o)
    }))
    return filterArr
  }


  function setExperience (pos, params) {
    params.employeeNumberID = pos.employeeNumberID
    params.onDate = dateService.shiftDate(params.issueDate)
    const employeeExperience = tarifficationService.calcEmployeeExperience(params)
    const experience = employeeExperience.length ? differencExperience(employeeExperience[0]) : null
    return experience
  }

  //pdv 14.08.24 add function
  function setExperienceEmp (pos, params) {
    params.employeeNumberID = pos.employeeNumberID
    params.onDate = dateService.shiftDate(pos.onDate)
    const employeeExperience = setExperience
    const experience = employeeExperience.length ? differencExperience(employeeExperience[0]) : null
    return experience
  }

  function differencExperience (experience) {
    return `${experience.years || 0}р. ${experience.months || 0}м. ${experience.days || 0}д.`
  }

  function setAccrual (accruals, pos) {
    const filterAccruals = accruals.filter(o => o.positionID === pos.positionID)
    if (!filterAccruals.length) return { rise: '', rate: null, riseSum: null }
    filterAccruals.forEach(o => {
      o.rate = o.rate || null
      o.riseSum = o.riseSum || null
    })
    return filterAccruals
  }

  function getPositionTeachLoad (teachLoad, positionID) {
    const result = []
    teachLoad.filter(o => o.positionID === positionID).forEach(s => {
      let index = result.findIndex(r => r.payElID === s.payElID)
      if (index < 0) {
        index = result.push({
          payElID: s.payElID,
          loadName: s.rise,
          pupil1hours: null,
          pupil1sum: null,
          pupil2hours: null,
          pupil2sum: null,
          pupil3hours: null,
          pupil3sum: null
        }) - 1
      }
      switch (s.code) {
        case '1-4':
          result[index].pupil1hours += s.hours
          result[index].pupil1sum += s.riseSum
          break
        case '5-9':
          result[index].pupil2hours += s.hours
          result[index].pupil2sum += s.riseSum
          break
        case '10-11':
          result[index].pupil3hours += s.hours
          result[index].pupil3sum += s.riseSum
          break
      }
    })
    return result
  }

  function setTeachLoad (teachLoad, pos) {
    if (teachLoad.find(o => pos.positionID === o.positionID)) {
      return getPositionTeachLoad(teachLoad, pos.positionID)
    } else {
      return {
        positionID: null,
        loadName: '',
        pupil1hours: null,
        pupil1sum: null,
        pupil2hours: null,
        pupil2sum: null,
        pupil3hours: null,
        pupil3sum: null
      }
    }
  }

  function setOverpayPosition (overpayPositions, pos) {
    return overpayPositions.filter(o => pos.positionID === o.positionID) || {
      name: '',
      rate: null,
      riseSum: null
    }
  }

  function setRenderBottomBlock (posArr, pos) {
    if (posArr.length === 1) {
      return true
    } else {
      const lastPos = posArr[posArr.length - 1]
      return lastPos.positionID === pos.positionID
    }
  }
  function setTeachLoadSum (teachLoad, pos) {
    if (teachLoad.find(o => pos.positionID === o.positionID)) {
      const teachAccrualSum = teachLoad.filter(o => o.positionID === pos.positionID && o.payElCode !='1025').reduce((acc, o) => {
        return acc + o.riseSum
      }, null)
      return { teachAccrualSum }
    } else {
      return { teachAccrualSum: null }
    }
  }
  function setAllTeachLoad (arr, pos, code, field) {
    return arr.filter(o => (o.ID === pos.ID) && o.code === code).reduce((acc, o) => {
      return acc + o[field]
    }, null) || null
  }
  function setAllTeachLoadPos (arr, pos, colSum) {
    return arr.filter(o => (o.ID === pos.ID)).reduce((acc, o) => {
      return acc + o[colSum]
    }, null) || null
  }

  function setTeachLoadUnit (arr, ID, code, field) {
    return arr.filter(o => (o.orgID === ID) && o.code === code).reduce((acc, o) => {
      return acc + o[field]
    }, null)
  }

  //add pdv
  function setTeachLoadDepUnit (arr, departmentName, code, field) {
    return arr.filter(o => (o.departmentName === departmentName) && o.code === code).reduce((acc, o) => {
      return acc + o[field]
    }, null)
  }
  function setUnitDepTeachLoadPos (arr, departmentName, colSum) {
    return arr.filter(o => (o.departmentName === departmentName)).reduce((acc, o) => {
      return acc + o[colSum]
    }, null) || null
  }
  function setUnitDepSum3 (trfAccruals, arr, departmentName) {
    return arr.filter(o => (o.departmentName === departmentName)).reduce((acc, o) => {
      return acc + getRate2(o)
    }, null) || null
  }
  //
  function setUnitTeachLoadPos (arr, ID, colSum) {
    return arr.filter(o => (o.orgID === ID)).reduce((acc, o) => {
      return acc + o[colSum]
    }, null) || null
  }

  //add pdv 26.08.2024 
  function setUnitSum3 (trfAccruals, arr, ID) {
    return arr.filter(o => (o.orgID === ID)).reduce((acc, o) => {
      return acc + getRate2(o)
    }, null) || null
  }
  function setAllSum3Pos (trfAccruals, arr, pos) {
    return arr.filter(o => (o.ID === pos.ID)).reduce((acc, o) => {
      return acc + getRate2(o)
    }, null) || null
  }
  //

  function getPages (allColumnCount, rh, resultPos) {
    let pageHeight = 0
    const titleHeight = 273
    let pageCount = 1
    let cardItems = []
    const result = []
    resultPos.forEach((pos, i) => {
      const cardPositionHeight = getCardHeight(pos)
      pageHeight += cardPositionHeight
      if (!i) pageHeight += titleHeight
      if (pageHeight >= 900) {
        //cardItems[cardItems.length - 1].isPageBreak = i !== resultPos.length - 1
        cardItems[cardItems.length - 1].isPageBreak = true
        pageCount === 1 ? result.push({ allColumnCount, rh, resultPos: cardItems }) : result.push({ allColumnCount, resultPos: cardItems })
        pageCount += 1
        cardItems = []
        cardItems.push(pos)
        pageHeight = 15 + cardPositionHeight
        if (i === resultPos.length - 1) result.push({ allColumnCount, resultPos: cardItems })
      } else {
        cardItems.push(pos)
        //pdv 20.082024 - убрали инфо о предприятии с последней страницы
        //if (i === resultPos.length - 1) result.push({ allColumnCount,rh, resultPos: cardItems })
        if (i === resultPos.length - 1) result.push({ allColumnCount, resultPos: cardItems })
      }
    })
    if (result.length) {
      const lastCard = result[result.length - 1].resultPos[result[result.length - 1].resultPos.length - 1]
      lastCard.isPageBreak = false
      lastCard.renderUnit = true
      lastCard.isLastDescription = {
        headEmployeePositionShortFIO: params.headEmployeePositionShortFIO,
        headTradeUnionCommitteeShortFIO: params.headTradeUnionCommitteeShortFIO
      }
    }
    return result
  }

  function getCardHeight (pos) {
    const FIO = 16
    const date = 15
    const tabNumber = pos.tabNum && pos.tabNum.length > 23 ? 29 : 15
    if (pos.name && pos.name.length > 23) pos.name.slice(0, 23)
    let position = 27
    if (pos.subjectName && pos.subjectName.length > 23) pos.subjectName.slice(0, 23)
    const subject = 37
    const education = 37
    const total = pos.renderBottomBlock ? 30 : 0
    const unit = pos.renderUnit ? 52 : 0
    const rd = pos.renderDep ? 20 : 0
    const unitD = pos.renderUnitDep ? 52 : 0
    const calcCardHeight = FIO + date + tabNumber + position + subject + education
    const deltaHeight = getAdditionHeight(pos, calcCardHeight)
    return calcCardHeight + total + unit + rd + unitD + deltaHeight
  }

  function getAdditionHeight (pos, calcCardHeight) {
    let result = 0
    if (pos.overpayPosition.length) {
      const overpayPositionHeight = (pos.overpayPosition.length * 40) + 6
      result += calcCardHeight < overpayPositionHeight ? overpayPositionHeight - calcCardHeight : 0
    }
    return result
  }


  function addFullFIO (pos, maternityLeave) {
    const posMaternityLeave = maternityLeave.find(o => o.positionID === pos.positionID)
    if (posMaternityLeave) pos.fullFIO = `${pos.fullFIO} (${posMaternityLeave.methodName})`
    return pos.fullFIO ? `${pos.fullFIO}` : 'Вакансія'
  }

  function isSortArr (arr) {
    const result = []
    const items = _.groupBy(arr, 'tabNumSort')
    _.forEach(items, specs => {
      const sortByPosIndex = _.sortBy(specs, 'posIndex')
      const sortByOnDate = _.sortBy(sortByPosIndex, 'onDate')
      sortByOnDate.forEach(o => result.push(o))
    })
    return result
  }

  function getRate (trfAccruals, pos) {
    const posAccruals = trfAccruals.filter(o => (o.positionID === pos.positionID) && o.payElComment)
    let payElComment = []
    const _str = 'код типу ставка'
    if (posAccruals.length) {
      posAccruals.forEach(o => {
        const comment = o.payElComment.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, '').toLowerCase()
        comment && comment.length && payElComment.push(comment)
      })
    }
    return payElComment.includes(_str) ? pos.accrualSum2 * pos.workPlaceRate : pos.accrualSum2
  }

  function getRate2 (pos) {
    return pos.accrualSum2 * pos.workPlaceRate;
  }

  const fixedColumn = 0
  const dynamicColumn = 29
  const allColumnCount = fixedColumn + dynamicColumn
  const resultPos = []
  let porInd = 0
  let numberPage = 1
  const rd = []
  const rh = []
  const org = {}

  org.hrOrg = hrOrg.length ? hrOrg.find(o => o.mi_data_id === params.organization).name : ''
  org.issueDate = dateService.formatDate(params.issueDate)
  org.leaderDepartmentShortFIO = params.leaderDepartmentShortFIO || ''
  org.tradeUnionCommitteeShortFIO = params.tradeUnionCommitteeShortFIO || ''
  org.headEmployeePositionShortFIO = params.headEmployeePositionShortFIO || ''
  org.headTradeUnionCommitteeShortFIO = params.headTradeUnionCommitteeShortFIO || ''
  org.dictFundSource = dictFundSource ? Object.keys(_.groupBy(dictFundSource, 'dictFundSourceName')).join(', ') : null
  rh.push(org)
  //add pdv
  //posArr.forEach(o => {if (o.departmentName == null) o.departmentName = 'Без підрозділу'})
  const departmentList = _.groupBy(posArr, 'departmentName')
  const departmentListKeys = Object.keys(departmentList)
  departmentListKeys.forEach((ee, ii, darr) => {
    let depArr = departmentList[ee]
    // end pdv
    const employeeList = _.groupBy(depArr, 'employeeNumberID')
    const employeeListKeys = Object.keys(employeeList)
    if (!params.lessAccrual) {
      employeeListKeys.forEach((e, i, arr) => {
        let empArr = employeeList[e]
        empArr = isSortArr(empArr)
        empArr.forEach((pos, ind, array) => {
          //add pdv
          pos.renderDep = !i && !ind && pos.departmentName != null
          //if (!pos.departmentName) pos.departmentName = 'Без підрозділу'
          pos.renderUnit = false
          pos.renderUnitDep = false
          const accr = {}
          //Предприятие
          if ((ii === (darr.length - 1)) && (i === (arr.length - 1)) && (ind === (array.length - 1))) {
            const orgHr = params.orgID
            accr.pupil1hoursUnit = setTeachLoadUnit(teachLoad, orgHr, '1-4', 'hours')
            accr.pupil1sumUnit = setTeachLoadUnit(teachLoad, orgHr, '1-4', 'riseSum')
            accr.pupil2hoursUnit = setTeachLoadUnit(teachLoad, orgHr, '5-9', 'hours')
            accr.pupil2sumUnit = setTeachLoadUnit(teachLoad, orgHr, '5-9', 'riseSum')
            accr.pupil3hoursUnit = setTeachLoadUnit(teachLoad, orgHr, '10-11', 'hours')
            accr.pupil3sumUnit = setTeachLoadUnit(teachLoad, orgHr, '10-11', 'riseSum')
            accr.noteBooksLoadHours1Unit = setTeachLoadUnit(noteBooksLoad, orgHr, '1-4', 'hours')
            accr.noteBooksLoadSum1Unit = setTeachLoadUnit(noteBooksLoad, orgHr, '1-4', 'riseSum')
            accr.noteBooksLoadHours2Unit = setTeachLoadUnit(noteBooksLoad, orgHr, '5-9', 'hours')
            accr.noteBooksLoadSum2Unit = setTeachLoadUnit(noteBooksLoad, orgHr, '5-9', 'riseSum')
            accr.noteBooksLoadHours3Unit = setTeachLoadUnit(noteBooksLoad, orgHr, '10-11', 'hours')
            accr.noteBooksLoadSum3Unit = setTeachLoadUnit(noteBooksLoad, orgHr, '10-11', 'riseSum')
            accr.allPositionSumUnit = setUnitTeachLoadPos(posArr, orgHr, 'positionSum')
            accr.allAccrualSum3Unit = setUnitSum3(trfAccruals, posArr, orgHr)
            pos.renderUnit = true
            pos.unit = accr
          }
          //Подразделение
          const depUnit = {}
          if ((i === (arr.length - 1)) && (ind === (array.length - 1))) {      
            if (pos.departmentName!=null)  {    
              depUnit.pupil1hoursUnit = setTeachLoadDepUnit(teachLoad, pos.departmentName, '1-4', 'hours')
              depUnit.pupil1sumUnit = setTeachLoadDepUnit(teachLoad, pos.departmentName, '1-4', 'riseSum')
              depUnit.pupil2hoursUnit = setTeachLoadDepUnit(teachLoad, pos.departmentName, '5-9', 'hours')
              depUnit.pupil2sumUnit = setTeachLoadDepUnit(teachLoad, pos.departmentName, '5-9', 'riseSum')
              depUnit.pupil3hoursUnit = setTeachLoadDepUnit(teachLoad, pos.departmentName, '10-11', 'hours')
              depUnit.pupil3sumUnit = setTeachLoadDepUnit(teachLoad, pos.departmentName, '10-11', 'riseSum')
              depUnit.noteBooksLoadHours1Unit = setTeachLoadDepUnit(noteBooksLoad, pos.departmentName, '1-4', 'hours')
              depUnit.noteBooksLoadSum1Unit = setTeachLoadDepUnit(noteBooksLoad, pos.departmentName, '1-4', 'riseSum')
              depUnit.noteBooksLoadHours2Unit = setTeachLoadDepUnit(noteBooksLoad, pos.departmentName, '5-9', 'hours')
              depUnit.noteBooksLoadSum2Unit = setTeachLoadDepUnit(noteBooksLoad, pos.departmentName, '5-9', 'riseSum')
              depUnit.noteBooksLoadHours3Unit = setTeachLoadDepUnit(noteBooksLoad, pos.departmentName, '10-11', 'hours')
              depUnit.noteBooksLoadSum3Unit = setTeachLoadDepUnit(noteBooksLoad, pos.departmentName, '10-11', 'riseSum')
              depUnit.allPositionSumUnit = setUnitDepTeachLoadPos(posArr, pos.departmentName, 'positionSum')
              depUnit.allAccrualSum3Unit = setUnitDepSum3(trfAccruals, posArr, pos.departmentName)
              pos.renderUnitDep = true
              pos.unitDep = depUnit
            } else {
              pos.renderUnitDep = false
            }
          }
          
          if (!params.dictExperienceID) pos.experience = !pos.ID ? '' : setExperience(pos, params)
          pos.fullFIO = addFullFIO(pos, maternityLeave)
          pos.dateFrom = dateService.formatDate(pos.onDate)
          pos.paymentPayEls = []
          pos.accrualSum1 = !pos.accrualSum1 ? null : pos.accrualSum1
          pos.sumTo = pos.sumFrom + pos.totalPayment - pos.totalOfftake - pos.totalForpay
          pos.allColumnCount = allColumnCount
          pos.accrualsAlt = setAccrual(accrualAlt, pos)
          pos.teachLoad = setTeachLoad(teachLoad, pos)
          pos.teachLoadSum = setTeachLoadSum(teachLoad, pos)
          pos.noteBooksLoad = setTeachLoad(noteBooksLoad, pos)
          pos.overpayPosition = setOverpayPosition(overpayPositions, pos)
          pos.renderBottomBlock = setRenderBottomBlock(array, pos)
          pos.allPupil1hours = setAllTeachLoad(teachLoad, pos, '1-4', 'hours')
          pos.pupil1sum = setAllTeachLoad(teachLoad, pos, '1-4', 'riseSum')
          pos.allPupil2hours = setAllTeachLoad(teachLoad, pos, '5-9', 'hours')
          pos.pupil2sum = setAllTeachLoad(teachLoad, pos, '5-9', 'riseSum')
          pos.allPupil3hours = setAllTeachLoad(teachLoad, pos, '10-11', 'hours')
          pos.pupil3sum = setAllTeachLoad(teachLoad, pos, '10-11', 'riseSum')
          pos.allTeachLoad = setAllTeachLoadPos(teachLoad, pos, 'riseSum')
          pos.noteBooksLoadHoursSum1 = setAllTeachLoad(noteBooksLoad, pos, '1-4', 'hours')
          pos.noteBooksLoadSum1 = setAllTeachLoad(noteBooksLoad, pos, '1-4', 'riseSum')
          pos.noteBooksLoadHoursSum2 = setAllTeachLoad(noteBooksLoad, pos, '5-9', 'hours')
          pos.noteBooksLoadSum2 = setAllTeachLoad(noteBooksLoad, pos, '5-9', 'riseSum')
          pos.noteBooksLoadHoursSum3 = setAllTeachLoad(noteBooksLoad, pos, '10-11', 'hours')
          pos.noteBooksLoadSum3 = setAllTeachLoad(noteBooksLoad, pos, '10-11', 'riseSum')
          pos.positionSum = !pos.positionSum ? null : pos.positionSum
          pos.posRate = !pos.workPlaceRate ? null : pos.workPlaceRate
          pos.weekHours = !pos.workPlaceRate || !pos.weekHours ? null : pos.weekHours * pos.workPlaceRate
          pos.allWorkshopHours = setAllTeachLoadPos(posArr, pos, 'hours')
          pos.allWorkshopAccrSum = setAllTeachLoadPos(posArr, pos, 'accrualSum')
          pos.showClassLead = !!pos.classLead
          pos.allClassLead = setAllTeachLoadPos(posArr, pos, 'classLead')
          pos.allOverpayPositions = setAllTeachLoadPos(overpayPositions, pos, 'riseSum')
          pos.allPositionSum = setAllTeachLoadPos(posArr, pos, 'positionSum')
          pos.allAccrualSum3 = setAllSum3Pos(trfAccruals,empArr, pos) 
          pos.headEmployeePositionShortFIO = params.headEmployeePositionShortFIO || ''
          pos.headTradeUnionCommitteeShortFIO = params.headTradeUnionCommitteeShortFIO || ''
          //pdv 26.08.2024 change accrualSum2 on accrualSum3 - зарплата
          pos.accrualSum3 = getRate2(pos)
          resultPos.push(pos)
        })
      })
    } else if (params.lessAccrual) {
      employeeListKeys.forEach((e, i, array) => {
        const accr = {}
        let empArr = employeeList[e]
        empArr = isSortArr(empArr)
        empArr.forEach((pos, ind, arr) => {
          pos.renderDep = !i && !ind
          pos.renderUnit = false
          //add pdv
          pos.renderUnit = false
          if ((ii === (darr.length - 1)) && (i === (array.length - 1)) && (ind === (arr.length - 1))) {
            accr.pupil1hoursUnit = null
            accr.pupil1sumUnit = null
            accr.pupil2hoursUnit = null
            accr.pupil2sumUnit = null
            accr.pupil3hoursUnit = null
            accr.pupil3sumUnit = null
            accr.noteBooksLoadHours1Unit = null
            accr.noteBooksLoadSum1Unit = null
            accr.noteBooksLoadHours2Unit = null
            accr.noteBooksLoadSum2Unit = null
            accr.noteBooksLoadHours3Unit = null
            accr.noteBooksLoadSum3Unit = null
            accr.allPositionSumUnit = null
            accr.allAccrualSum3Unit = null
            pos.renderUnit = true
            //pos.unit = accr
          }
          //Подразделение
          const depUnit = {}
          if ((i === (array.length - 1)) && (ind === (arr.length - 1))) {
            depUnit.pupil1hoursUnit = null
            depUnit.pupil1sumUnit = null
            depUnit.pupil2hoursUnit = null
            depUnit.pupil2sumUnit = null
            depUnit.pupil3hoursUnit = null
            depUnit.pupil3sumUnit = null
            depUnit.noteBooksLoadHours1Unit = null
            depUnit.noteBooksLoadSum1Unit = null
            depUnit.noteBooksLoadHours2Unit = null
            depUnit.noteBooksLoadSum2Unit = null
            depUnit.noteBooksLoadHours3Unit = null
            depUnit.noteBooksLoadSum3Unit = null
            depUnit.allPositionSumUnit = null
            depUnit.allAccrualSum3Unit = null
            pos.renderUnitDep = true
            pos.unitDep = depUnit
          }
          if (!ind) {
            pos.org = hrOrg.find(o => o.mi_data_id === pos.orgID).name
          }
          pos.fullFIO = addFullFIO(pos, maternityLeave)
          pos.dateFrom = dateService.formatDate(pos.onDate)
          pos.renderBottomBlock = setRenderBottomBlock(posArr, pos)
          pos.accrualSum2 = null
          pos.accrualSum3 = null
          pos.accrualsAlt = [{
            accrualSum2: null,
            positionCategory: null,
            rate: null,
            rise: null,
            riseSum: null
          }]
          pos.teachLoad = null
          pos.noteBooksLoad = [{ pupil1hours: null, pupil2hours: null, pupil3hours: null, pupil1sum: null, pupil2sum: null, pupil3sum: null }]
          pos.allOverpayPositions = null
          pos.allPositionSum = null
          pos.allAccrualSum3 = null
          pos.allPupil1hours = null
          pos.allPupil2hours = null
          pos.allPupil3hours = null
          pos.allTeachLoad = null
          pos.allWorkshopAccrSum = null
          pos.allWorkshopHours = null
          pos.allclassLead = null
          pos.classLead = null
          pos.noteBooksLoadHoursSum1 = null
          pos.noteBooksLoadHoursSum2 = null
          pos.noteBooksLoadHoursSum3 = null
          pos.overpayPosition = [{
            name: '',
            rate: null,
            accrualSum: null
          }]
          pos.posRate = null
          pos.positionSum = null
          pos.pupil1sum = null
          pos.pupil2sum = null
          pos.pupil3sum = null
          pos.sumTo = null
          pos.teachLoadSum = [{ teachAccrualSum: null }]
          pos.workPlaceRate = null
          pos.workshopAccrSum = null
          pos.workshopHours = null
          pos.noteBooksLoadSum1 = null
          pos.noteBooksLoadSum2 = null
          pos.noteBooksLoadSum3 = null
          pos.headEmployeePositionShortFIO = params.headEmployeePositionShortFIO || ''
          pos.headTradeUnionCommitteeShortFIO = params.headTradeUnionCommitteeShortFIO || ''
          if (!params.dictExperienceID) pos.experience = !pos.ID ? '' : setExperience(pos, params)
          resultPos.push(pos)
        })
      })
      //add pdv 20.08.2024 - добавляем пустую страницу
      for (i=0; i<11; i++) {
        const pos = {}
        pos.renderUnit = false
        pos.renderDep = false
        pos.org = hrOrg.find(o => o.mi_data_id === params.organization).name
        pos.fullFIO = ''
          pos.dateFrom = ''
          pos.renderBottomBlock = null
          pos.accrualSum2 = null
          pos.accrualSum3 = null
          pos.accrualsAlt = [{
            accrualSum2: null,
            positionCategory: null,
            rate: null,
            rise: null,
            riseSum: null
          }]
          pos.teachLoad = null
          pos.noteBooksLoad = [{ pupil1hours: null, pupil2hours: null, pupil3hours: null, pupil1sum: null, pupil2sum: null, pupil3sum: null }]
          pos.allOverpayPositions = null
          pos.allPositionSum = null
          pos.allPupil1hours = null
          pos.allPupil2hours = null
          pos.allPupil3hours = null
          pos.allTeachLoad = null
          pos.allWorkshopAccrSum = null
          pos.allWorkshopHours = null
          pos.allclassLead = null
          pos.classLead = null
          pos.noteBooksLoadHoursSum1 = null
          pos.noteBooksLoadHoursSum2 = null
          pos.noteBooksLoadHoursSum3 = null
          pos.overpayPosition = [{
            name: '',
            rate: null,
            accrualSum: null
          }]
          pos.posRate = null
          pos.positionSum = null
          pos.pupil1sum = null
          pos.pupil2sum = null
          pos.pupil3sum = null
          pos.sumTo = null
          pos.teachLoadSum = [{ teachAccrualSum: null }]
          pos.workPlaceRate = null
          pos.workshopAccrSum = null
          pos.workshopHours = null
          pos.noteBooksLoadSum1 = null
          pos.noteBooksLoadSum2 = null
          pos.noteBooksLoadSum3 = null
          pos.headEmployeePositionShortFIO = params.headEmployeePositionShortFIO || ''
          pos.headTradeUnionCommitteeShortFIO = params.headTradeUnionCommitteeShortFIO || ''
          if (!params.dictExperienceID) pos.experience = null
          resultPos.push(pos)
      }
    } else {
      posArr = false
    }

})
  const pages = getPages(allColumnCount, rh, resultPos)

  ctx.mParams.resultData = JSON.stringify({
    pages
  })
}
me.getReportList = ctx => {
  const params = ctx.mParams.execParams
  const workPlaceID = params.reportParams ? params.reportParams.workPlaceID : null
  const documentID = params.reportParams ? params.reportParams.documentID : null
  const showPostedWorkPlace = params.reportParams ? params.reportParams.showPostedWorkPlace : true
  const dictProgClassID = params.dictProgClassID.length ? params.dictProgClassID.split(',').map(o => Number(o)) : null
  const dictFundSourceID = params.dictFundSourceID.length ? params.dictFundSourceID.split(',').map(o => Number(o)) : null
  const periodTo = dateService.shiftDate(params.objPeriodToDateTo)
  const hrOrg = UB.Repository('hr_organization')
    .attrs('name', 'orgID')
    .where('mi_data_id', '=', params.orgID)
    .where('state', '=', 'ACTIVE')
    .misc({ __mip_ondate: periodTo })
    .orderBy('mi_dateFrom', 'desc')
    .selectSingle()

  const baseRequest = UB.DataStore('trf_accrual')
  baseRequest.runSQL(`select n1.tabNum "tabNum", n1.tabNumSort "tabNumSort", n1.empWorkPlace "empWorkPlace",
coalesce(p1.ID, null) "positionID",
p1.dictFundSourceID "dictFundSourceID",
dp1.positionCategory "positionCategory",
p1.dictProgClassID "dictProgClassID",
e1.ID "ID",
p1.posIndex "posIndex",
coalesce(w1.dateFrom, null) "onDate",
w1.employeeNumberID "employeeNumberID",
coalesce(w1.ID, null) "workPlaceID",
coalesce(e1.fullFIO, 'Вакансія') "fullFIO",
dp1.name,
coalesce(d1.ID, null) "documentID",
coalesce(n1.dateFrom, null) "expDateFrom",
coalesce(s1.name, '') "subjectName",
coalesce(dq1.name, '') "dictQualificationName",
coalesce(el.name, '') "dictEducationLevel",
coalesce(dt1.code, '') "dictTarifCoeff",
(SELECT sum(a1.accrualSum)  
FROM trf_accrual a1
left join hr_payEl pE1 on a1.payElID=pE1.ID
left join hr_method m1 on pE1.methodID=m1.ID
where a1.positionID = p1.ID and m1.code in ('1', '143') and a1.mi_deleteDate >= '9999-12-31'
) "accrualSum1",
(SELECT sum(a2.accrualSum) FROM trf_accrual a2 
left join hr_payEl pE2 on a2.payElID=pE2.ID
left join hr_method m2 on pE2.methodID=m2.ID
where a2.positionID = p1.ID and m2.code in ('145') and a2.mi_deleteDate >= '9999-12-31') "accrualSum3",
p1.rate
from trf_position p1
inner join trf_workPlace w1 on w1.id = p1.workPlaceID and w1.mi_deleteDate = '9999-12-31'
inner join trf_document d1 on d1.id = w1.documentID and d1.mi_deleteDate = '9999-12-31'
left JOIN hr_dictPosition dp1 ON dp1.ID = p1.dictPositionID 
left join hr_dictTarifCoeff dt1 on dt1.ID = p1.dictTarifCoeffID
left join hr_dictEducationLevel el on el.ID = p1.dictEducationLevelID
left join trf_dictQualification dq1 on dq1.ID = p1.dictQualificationID
left join trf_dictSubject s1 on s1.ID = p1.dictSubjectID
left join hr_employeeNumber n1 on n1.id = w1.employeeNumberID
left join hr_employee e1 on e1.id = n1.employeeID
where :dateFrom: between w1.dateFrom and w1.dateTo
and d1.orgID = :orgID:
and d1.type = :type:
${showPostedWorkPlace ? `and w1.state = 'POSTED'` : ''}
${dictProgClassID ? `and p1.dictProgClassID in (${dictProgClassID})` : ''}
${dictFundSourceID ? `and p1.dictFundSourceID in (${dictFundSourceID})` : ''}
${params.positionCategory.length ? `and dp1.positionCategory in (${params.positionCategory})` : ''}
and p1.mi_deleteDate = '9999-12-31'
order by n1.tabNumSort
`,
  {
    orgID: params.orgID,
    dateFrom: dateService.shiftDate(params.issueDate),
    type: params.tarificationType
  })
  let posArr = JSON.parse(baseRequest.asJSONObject)

  if (posArr.length && params.workPlaceType === '3') posArr = posArr.filter(o => o.employeeNumberID === null)
  if (posArr.length && params.workPlaceType === '2') posArr = posArr.filter(o => o.employeeNumberID !== null)

  if (workPlaceID) posArr = posArr.filter(o => o.workPlaceID === workPlaceID)
  if (documentID) posArr = posArr.filter(o => o.documentID === documentID)

  const accrualAlt = UB.Repository('trf_accrual')
    .attrs(['positionID', 'positionID.workPlaceID.employeeNumberID.employeeID', 'positionID.dictFundSourceID', 'positionID.workPlaceID.documentID.orgID', 'payElID.name', 'accrualSum', 'payElID', 'positionID.dictPositionID.positionCategory', 'rate', 'positionID.workPlaceID.employeeNumberID.empWorkPlace', 'positionID.workPlaceID.employeeNumberID'])
    .where('positionID.workPlaceID.documentID.orgID', '=', params.orgID)
    .where('positionID.workPlaceID.dateFrom', '<=', dateService.shiftDate(params.issueDate))
    .where('positionID.workPlaceID.dateTo', '>=', dateService.shiftDate(params.issueDate))
    .where('positionID.workPlaceID.documentID.type', '=', params.tarificationType)
    .whereIf(showPostedWorkPlace, 'positionID.workPlaceID.state', '=', 'POSTED')
    .where('positionID.workPlaceID.mi_deleteDate', '>=', '9999-12-31')
    .where('positionID.mi_deleteDate', '>=', '9999-12-31')
    .where('mi_deleteDate', '>=', '9999-12-31')
    .where('payElID.methodID.code', 'in', ['144', '152'])
    .whereIf(documentID, 'positionID.workPlaceID.documentID', '=', documentID)
    .whereIf(workPlaceID, 'positionID.workPlaceID', '=', workPlaceID)
    .whereIf(dictProgClassID, 'positionID.dictProgClassID', 'in', dictProgClassID)
    .whereIf(dictFundSourceID, 'positionID.dictFundSourceID', 'in', dictFundSourceID)
    .whereIf(params.positionCategory.length, 'positionID.dictPositionID.positionCategory', 'in', params.positionCategory)
    .selectAsObject({ 'positionID.workPlaceID.employeeNumberID.employeeID': 'ID', 'payElID.name': 'rise', 'positionID.dictFundSourceID': 'dictFundSourceID', 'positionID.workPlaceID.documentID.orgID': 'orgID', 'positionID.dictPositionID.positionCategory': 'positionCategory', 'accrualSum': 'riseSum', 'positionID.workPlaceID.employeeNumberID.empWorkPlace': 'empWorkPlace', 'positionID.workPlaceID.employeeNumberID': 'employeeNumberID' })

  const overpayPositions = UB.Repository('trf_accrual')
    .attrs(['positionID', 'positionID.workPlaceID.employeeNumberID.employeeID', 'payElID.name', 'accrualSum', 'payElID', 'rate', 'dictPupilID.code', 'hours', 'payElID.methodID.code', 'leadingClass', 'positionID.workPlaceID.employeeNumberID.empWorkPlace', 'positionID.workPlaceID.employeeNumberID'])
    .where('positionID.workPlaceID.documentID.orgID', '=', params.orgID)
    .where('positionID.workPlaceID.dateFrom', '<=', dateService.shiftDate(params.issueDate))
    .where('positionID.workPlaceID.dateTo', '>=', dateService.shiftDate(params.issueDate))
    .where('positionID.workPlaceID.documentID.type', '=', params.tarificationType)
    .whereIf(showPostedWorkPlace, 'positionID.workPlaceID.state', '=', 'POSTED')
    .where('positionID.workPlaceID.documentID.mi_deleteDate', '>=', '9999-12-31')
    .where('positionID.workPlaceID.mi_deleteDate', '>=', '9999-12-31')
    .where('positionID.mi_deleteDate', '>=', '9999-12-31')
    .where('mi_deleteDate', '>=', '9999-12-31')
    .where('payElID.methodID.code', 'notIn', ['143', '145', '144', '152'])
    .whereIf(documentID, 'positionID.workPlaceID.documentID', '=', documentID)
    .whereIf(workPlaceID, 'positionID.workPlaceID', '=', workPlaceID)
    .whereIf(dictProgClassID, 'positionID.dictProgClassID', 'in', dictProgClassID)
    .whereIf(dictFundSourceID, 'positionID.dictFundSourceID', 'in', dictFundSourceID)
    .whereIf(params.positionCategory.length, 'positionID.dictPositionID.positionCategory', 'in', params.positionCategory)
    .orderBy('positionID.workPlaceID.employeeNumberID.tabNumSort', 'desc')
    .selectAsObject({ 'positionID.workPlaceID.employeeNumberID.employeeID': 'ID', 'payElID.name': 'name', 'dictPupilID.code': 'dictPupilCode', 'payElID.methodID.code': 'code', 'positionID.workPlaceID.employeeNumberID.empWorkPlace': 'empWorkPlace', 'positionID.workPlaceID.employeeNumberID': 'employeeNumberID' })

  const maternityLeave = UB.Repository('trf_accrual')
    .attrs(['positionID.workPlaceID.employeeNumberID.employeeID', 'positionID.workPlaceID.employeeNumberID.employeeID.fullFIO', 'baseSum', 'positionID.workPlaceID.employeeNumberID', 'payElID.methodID.name', 'positionID.workPlaceID.employeeNumberID.empWorkPlace'])
    .where('positionID.workPlaceID.documentID.orgID', '=', params.orgID)
    .where('positionID.workPlaceID.dateFrom', '<=', dateService.shiftDate(params.issueDate))
    .where('positionID.workPlaceID.dateTo', '>=', dateService.shiftDate(params.issueDate))
    .where('positionID.workPlaceID.documentID.type', '=', params.tarificationType)
    .whereIf(showPostedWorkPlace, 'positionID.workPlaceID.state', '=', 'POSTED')
    .where('payElID.methodID.code', 'in', ['14', '57', '140'])
    .where('mi_deleteDate', '>=', '9999-12-31')
    .whereIf(documentID, 'positionID.workPlaceID.documentID', '=', documentID)
    .whereIf(workPlaceID, 'positionID.workPlaceID', '=', workPlaceID)
    .whereIf(dictProgClassID, 'positionID.dictProgClassID', 'in', dictProgClassID)
    .whereIf(dictFundSourceID, 'positionID.dictFundSourceID', 'in', dictFundSourceID)
    .whereIf(params.positionCategory.length, 'positionID.dictPositionID.positionCategory', 'in', params.positionCategory)
    .selectAsObject({
      'positionID.workPlaceID.employeeNumberID.employeeID': 'employeeID',
      'positionID.workPlaceID.employeeNumberID.employeeID.fullFIO': 'fullFIO',
      'positionID.workPlaceID.employeeNumberID': 'employeeNumberID',
      'payElID.methodID.name': 'methodName',
      'positionID.workPlaceID.employeeNumberID.empWorkPlace': 'empWorkPlace'
    })

  const orgIDs = JSON.parse(params.empGrid)
  const getWorkPlaceCode = UB.Repository('hr_employeeNumberS')
    .attrs(['ID', 'workPlaceCode'])
    .where('ID', 'in', [...posArr.map(o => o.employeeNumberID), ...maternityLeave.map(o => o.employeeNumberID), ...overpayPositions.map(o => o.employeeNumberID), ...accrualAlt.map(o => o.employeeNumberID)])
    .selectAsObject()
  const setEmpWorkPlace = (arr, workPlaceCode) => {
    arr.forEach(o => {
      if (!o.empWorkPlace) {
        const empWorkPlaceCode = getWorkPlaceCode.find(w => w.ID === o.employeeNumberID)
        o.empWorkPlace = empWorkPlaceCode ? empWorkPlaceCode.workPlaceCode : null
      }
    })
  }
  setEmpWorkPlace(posArr, getWorkPlaceCode)
  setEmpWorkPlace(maternityLeave, getWorkPlaceCode)
  setEmpWorkPlace(overpayPositions, getWorkPlaceCode)
  setEmpWorkPlace(accrualAlt, getWorkPlaceCode)
  let empData = []
  orgIDs.forEach(o => posArr.forEach(e => {
    if (!params.dictFundSourceID && (e.ID === o) && !empData.find(emp => (emp.positionID === e.positionID) && (emp.empWorkPlace === e.empWorkPlace))) {
      empData.push(e)
    } else if ((e.ID === o) && (Number(params.dictFundSourceID) === e.dictFundSourceID) && !empData.find(emp => (emp.positionID === e.positionID) && (emp.empWorkPlace === e.empWorkPlace))) {
      empData.push(e)
    }
  }))

  if (params.dictExperienceID) {
    const dictExperienceID = params.dictExperienceID.split(',')
    posArr = posArr.filter(o => {
      params.employeeNumberID = o.employeeNumberID
      params.onDate = dateService.shiftDate(o.onDate)
      const experience = tarifficationService.calcEmployeeExperience(params)
      if (experience.length && dictExperienceID.find(p => Number(p) === experience[0].ID)) {
        o.experience = differencExperience(experience[0])
        return o
      }
    })
  }

  const posIDArr = empData.map(o => o.positionID)

  const educationRankArr = UB.Repository('trf_position')
    .attrs(['dictEducationRankID.name', 'ID'])
    .where('ID', 'in', posIDArr)
    .selectAsObject({ 'dictEducationRankID.name': 'educationRank' })

  const sheetWidth = 750

  function setExperience (pos, params) {
    params.employeeNumberID = pos.employeeNumberID
    params.onDate = dateService.shiftDate(pos.onDate)
    const employeeExperience = tarifficationService.calcEmployeeExperience(params)
    const experience = employeeExperience.length ? differencExperience(employeeExperience[0]) : null
    return experience
  }
  function differencExperience (experience) {
    return `${experience.years || 0}р. ${experience.months || 0}м. ${experience.days || 0}д.`
  }
  function posRank (pos, educationRankArr) {
    const posRank = educationRankArr.filter(o => o.ID === pos.positionID)
    return posRank[0].educationRank
  }
  function setOverpayPosition (overpayPositions, pos, cont, onDate) {
    let addMarkPersent = {
      name: '',
      rate: null,
      accrualSum: null
    }
    const posAccr = overpayPositions.filter(o => (pos.positionID === o.positionID) && (o.empWorkPlace === pos.empWorkPlace))
    const sortPosAccr = posAccr.length ? tarifficationService.sortAccruals({ cont, accrual: posAccr, onDate }) : []
    addMarkPersent = sortPosAccr.length
      ? sortPosAccr.map(o => {
        if (o.dictPupilID) {
          o.rate = `${o.rate} ${o.dictPupilCode} ${o.rate ? `(${o.rate} %)` : ''}`
        }
        if (o.hours || o.code === '148') {
          return {
            name: o.dictPupilCode ? `${o.name} ${o.dictPupilCode} ${o.rate ? `(${o.rate} %)` : ''}` : `${o.name}`,
            rate: `${o.hours}год`,
            accrualSum: o.accrualSum
          }
        } else if (o.leadingClass && o.code === '154') {
          if (!o.dictPupilCode) {
            return {
              name: o.leadingClass ? `${o.name} ${o.leadingClass} ` : `${o.name}`,
              rate: `${o.rate}%`,
              accrualSum: o.accrualSum
            }
          } else {
            return {
              name: o.leadingClass ? `${o.name} ${o.dictPupilCode} (${o.leadingClass}) ` : `${o.name}`,
              rate: `${o.rate}%`,
              accrualSum: o.accrualSum
            }
          }
        } else if (o.rate) {
          return {
            name: o.name,
            rate: `${o.rate}%`,
            accrualSum: o.accrualSum
          }
        } else { return o }
      })
      : addMarkPersent
    return addMarkPersent
  }
  function setAllAccrSum (arr, pos, colSum) {
    return arr.filter(o => (o.positionID === pos.positionID) && (o.empWorkPlace === pos.empWorkPlace)).reduce((acc, o) => {
      return acc + o[colSum]
    }, null) || null
  }
  function setAllSum (arr, pos, colSum) {
    return arr.filter(o => (o.ID === pos.ID) && (o.empWorkPlace === pos.empWorkPlace)).reduce((acc, o) => {
      return acc + o[colSum]
    }, null) || null
  }
  function setRenderHeadBlock (empData, pos) {
    const findDuplicatePos = empData.filter(o => (o.ID === pos.ID) && (o.empWorkPlace === pos.empWorkPlace))
    if (findDuplicatePos.find(o => o.positionID === pos.positionID) && !findDuplicatePos.find(o => o.setRenderHeadBlock)) return true
  }
  function setRenderBottomBlock (empData, pos) {
    const findDuplicatePos = empData.filter(o => (o.ID === pos.ID) && (o.empWorkPlace === pos.empWorkPlace))
    return findDuplicatePos[findDuplicatePos.length - 1].positionID === pos.positionID
  }
  function setAccrual (accruals, pos) {
    const filterAccruals = accruals.filter(o => (o.positionID === pos.positionID) && (o.empWorkPlace === pos.empWorkPlace))
    if (!filterAccruals.length) return { loading: '', rate: null, riseSum: null }
    filterAccruals.forEach(o => {
      o.rate = `${o.rate}%` || null
      o.riseSum = o.riseSum || null
    })
    return filterAccruals
  }

  // Устанавливаем розрыв и разбиваем данные на две колонки

  let pageHeight = 0
  let rightTable = []
  let leftTable = []
  let transitionOnTable = false
  const listHeigt = 23
  function isPageBreak (ID, groupPosArr, array) {
    const positionArr = !ID ? groupPosArr.null : groupPosArr[ID]
    const positionsHeight = calcCardHeight(positionArr)
    const sumHeight = Math.round(pageHeight + positionsHeight)
    if (sumHeight >= listHeigt && !(positionsHeight >= listHeigt)) {
      transitionOnTable = !transitionOnTable
      if ((array.length - 1 !== array.indexOf(ID)) && leftTable.length) {
        leftTable[leftTable.length - 1].isPageBreak = true
        pageHeight = positionsHeight
      }
      if ((array.length - 1 !== array.indexOf(ID)) && rightTable.length) {
        rightTable[rightTable.length - 1].isPageBreak = true
        pageHeight = positionsHeight
      }
      if (rightTable.length && leftTable.length) {
        pages.push({
          leftTable,
          rightTable
        })
        rightTable = []
        leftTable = []
      }
      transitionOnTable ? rightTable.push(...positionArr) : leftTable.push(...positionArr)
    } else if (positionsHeight >= listHeigt) {
      if ((array.length - 1 !== array.indexOf(ID)) && !transitionOnTable && leftTable.length) {
        leftTable[leftTable.length - 1].isPageBreak = true
        transitionOnTable = !transitionOnTable
      }
      if ((array.length - 1 !== array.indexOf(ID)) && transitionOnTable && rightTable.length) {
        rightTable[rightTable.length - 1].isPageBreak = true
        transitionOnTable = !transitionOnTable
        pages.push({
          rightTable,
          leftTable
        })
        rightTable = []
        leftTable = []
      }
      pageHeight = 0
      positionArr.forEach((o, i, arr) => {
        const posHeight = calcPositionHeight(o)
        if (Math.round(pageHeight + posHeight) > listHeigt) {
          arr[i - 1].isPageBreak = true
          pageHeight = 0
          transitionOnTable = !transitionOnTable
        } else {
          pageHeight += posHeight
        }
        transitionOnTable ? rightTable.push(o) : leftTable.push(o)
      })
    } else {
      pageHeight += positionsHeight
      transitionOnTable ? rightTable.push(...positionArr) : leftTable.push(...positionArr)
    }
    if (array.length - 1 === array.indexOf(ID)) {
      pages.push({
        leftTable,
        rightTable
      })
      pages.forEach((p, i, arr) => {
        if (i === arr.length - 1) {
          if (i && p.leftTable && p.leftTable.length) {
            isRemoveLastPageBreak(p.leftTable)
          } else if (p.leftTable && !p.leftTable.length && arr[i - 1].leftTable && arr[i - 1].leftTable.length) {
            isRemoveLastPageBreak(arr[i - 1].leftTable)
          }
          if (p.rightTable && p.rightTable.length) {
            isRemoveLastPageBreak(p.rightTable)
          }
        }
      })

      rightTable = []
      leftTable = []
      pageHeight = 0
    }
  }
  function isRemoveLastPageBreak (item) {
    item.forEach((o, i, arr) => {
      if ((i === arr.length - 1) && o.isPageBreak) o.isPageBreak = !o.isPageBreak
    })
  }
  function isPageBreakOneColum (ID, groupPosArr, array) {
    const positionArr = !ID ? groupPosArr.null : groupPosArr[ID]
    const positionsHeight = calcCardHeight(positionArr)
    const sumHeight = Math.round(pageHeight + positionsHeight)
    if ((sumHeight >= 24) && !(positionsHeight >= 24)) {
      leftTable[leftTable.length - 1].isPageBreak = true
      pages.push({
        leftTable
      })
      leftTable = []
      pageHeight = positionsHeight
    } else if (positionsHeight >= 24) {
      if ((array.length - 1 !== array.indexOf(ID)) && leftTable.length) {
        leftTable[leftTable.length - 1].isPageBreak = true
        pages.push({
          leftTable
        })
      }
      leftTable = []
      pageHeight = 0
      positionArr.forEach((o, i, arr) => {
        const posHeight = calcPositionHeight(o)
        if (Math.round(pageHeight + posHeight) >= 24) {
          arr[i - 1].isPageBreak = true
          pageHeight = 0
        }
        pageHeight += posHeight
      })
    } else {
      pageHeight += positionsHeight
    }
    leftTable.push(...positionArr)
    if (array.length - 1 === array.indexOf(ID)) {
      pages.push({
        leftTable
      })
      leftTable = []
      pageHeight = 0
    }
  }
  function calcCardHeight (array) {
    return array.reduce((sum, current, i, a) => {
      const orgStr = current.setRenderHeadBlock ? 13.6 : 0
      const addFullFIOLength = current.setRenderHeadBlock && current.fullFIO.length > 52 ? 21 : 16.4
      const addPositionLength = current.name && current.name.length > 21 ? 21.2 : 11.2
      const subjectStr = current.subjectName && current.subjectName.length > 30 ? 21.2 : 11.2
      const dictEducationLevelStr = current.dictEducationLevel && current.dictEducationLevel.length > 35 ? 31.2 : 20.8
      const experienceStr = 10.4
      const educationRankStr = current.educationRank && current.educationRank.length > 20 ? 31.2 : 21.2
      const rank = 11.2
      const totalPos = 15.4
      const currentHeightAccrual = current.accrualAlt && current.accrualAlt.length ? current.accrualAlt.length * 10.8 : 1
      const currentHeightBottomBlock = current.setRenderBottomBlock ? 29.4 : 0
      const currentHeightOverpayPosition = current.overpayPosition && current.overpayPosition.length ? current.overpayPosition.length * 10.4 : 1

      const result = sum + currentHeightAccrual + currentHeightBottomBlock + currentHeightOverpayPosition + addFullFIOLength + addPositionLength + orgStr + subjectStr + dictEducationLevelStr + educationRankStr + totalPos + experienceStr + rank
      return result
    }, 0) * 0.02646
  }
  function calcPositionHeight (obj) {
    const orgStr = obj.setRenderHeadBlock ? 13.6 : 0
    const addFullFIOLength = obj.setRenderHeadBlock && obj.fullFIO.length > 52 ? 21 : 16.4
    const addPositionLength = obj.name && obj.name.length > 21 ? 21.2 : 11.2
    const subjectStr = obj.subjectName && obj.subjectName.length > 30 ? 21.2 : 11.2
    const dictEducationLevelStr = obj.dictEducationLevel && obj.dictEducationLevel.length > 35 ? 31.2 : 20.8
    const experienceStr = 10.4
    const educationRankStr = obj.educationRank && obj.educationRank.length > 20 ? 31.2 : 21.2

    const rank = 11.2
    const totalPos = 15.4
    const currentHeightAccrual = obj.accrualAlt && obj.accrualAlt.length ? obj.accrualAlt.length * 10.8 : 1
    const currentHeightBottomBlock = obj.setRenderBottomBlock ? 29.4 : 0
    const currentHeightOverpayPosition = obj.overpayPosition && obj.overpayPosition.length ? obj.overpayPosition.length * 10.4 : 1

    const result = currentHeightAccrual + currentHeightBottomBlock + currentHeightOverpayPosition + addFullFIOLength + addPositionLength + orgStr + subjectStr + dictEducationLevelStr + educationRankStr + totalPos + experienceStr + rank
    return result * 0.02646
  }
  function addFullFIO (pos, maternityLeave) {
    const posMaternityLeave = maternityLeave.find(o => o.employeeNumberID === pos.employeeNumberID)
    if (posMaternityLeave) pos.fullFIO = `${pos.fullFIO} (${posMaternityLeave.methodName})`
    return pos.fullFIO ? pos.fullFIO : 'Вакансія'
  }

  function isSortArr (arr) {
    const result = []
    const items = _.groupBy(arr, 'tabNumSort')
    _.forEach(items, specs => {
      const sortByPosIndex = _.sortBy(specs, 'posIndex')
      const sortByOnDate = _.sortBy(sortByPosIndex, 'onDate')
      sortByOnDate.forEach(o => {
        result.push(o)
      })
    })
    return result
  }

  const orgID = params.orgID
  const cont = { payEl: payElService.getPayEl({ orgID }) }
  const pages = []
  if (empData && empData.length > 0) {
    empData = isSortArr(empData)
    empData.forEach((pos, ind, array) => {
      pos.fullFIO = addFullFIO(pos, maternityLeave)
      pos.experience = pos.ID && setExperience(pos, params)
      pos.hrOrg = hrOrg && hrOrg.name ? hrOrg.name : ''
      pos.issueDate = dateService.formatDate(params.issueDate)
      pos.dateFrom = dateService.formatDate(pos.onDate)
      pos.educationRank = posRank(pos, educationRankArr)
      pos.overpayPosition = setOverpayPosition(overpayPositions, pos, cont, pos.onDate)
      pos.allAccrualSum = setAllAccrSum(overpayPositions, pos, 'accrualSum')
      pos.accrualAlt = setAccrual(accrualAlt, pos)
      pos.setRenderHeadBlock = setRenderHeadBlock(array, pos)
      pos.setRenderBottomBlock = setRenderBottomBlock(array, pos)
      pos.allAccrual = pos.setRenderBottomBlock ? setAllSum(overpayPositions, pos, 'accrualSum') : null
    })
    const groupPosArr = _.groupBy(empData, 'ID')
    const employeeIDArray = Object.keys(groupPosArr).map(o => { return Number(o) || null })

    employeeIDArray.forEach((ID, ind, array) => {
      if (params.reportParams) {
        params.reportParams.colCount ? isPageBreakOneColum(ID, groupPosArr, array) : isPageBreak(ID, groupPosArr, array)
      } else {
        params.reportColum ? isPageBreakOneColum(ID, groupPosArr, array) : isPageBreak(ID, groupPosArr, array)
      }
    })
  } else {
    empData = false
  }
  ctx.mParams.resultData = JSON.stringify({
    sheetWidth,
    pages
  })
}
me.getSammaryRates = ctx => {
  const params = ctx.mParams.execParams
  const orgIDs = me.getSchoolID(JSON.parse(params.orgIDs))
  const orgID = params.joinReport && orgIDs.length ? orgIDs : [params.orgID]
  const documentID = params.reportParams ? JSON.parse(params.reportParams.documentID) : null
  const dictProgClassIDs = params.dictProgClassID ? params.dictProgClassID.split(',').map(o => Number(o)) : null
  const dictFundSourceIDs = params.dictFundSourceID ? params.dictFundSourceID.split(',').map(o => Number(o)) : null
  const departmentIDs = params.subDivision ? params.subDivision.split(',').map(o => Number(o)) : null
  const showPostedWorkPlace = params.reportParams ? params.reportParams.showPostedWorkPlace : true
  const tarificationTypeStatementRates = params.reportParams ? params.reportParams.tarificationTypeStatementRates : null

  const hrOrg = UB.Repository('hr_organization')
    .attrs('mi_data_id', 'name', 'orgID')
    .where('mi_data_id', 'in', orgID)
    .where('state', '=', 'ACTIVE')
    .orderBy('mi_dateFrom', 'desc')
    .selectAsObject()

  const accrRate = UB.Repository('trf_position')
    .attrs('dictProgClassID', 'dictFundSourceID', 'workPlaceID.dateFrom', 'workPlaceID.dateTo', 'workPlaceID.departmentID', 'dictPositionID.dictStaffSubCatID', 'dictPositionID.dictStaffSubCatID.name', 'rate', 'workPlaceID.documentID.orgID', 'dictProgClassID.code')
    .where('workPlaceID.documentID.orgID', 'in', orgID)
    .where('workPlaceID.documentID.type', '=', tarificationTypeStatementRates || params.tarificationType)
    .where('workPlaceID.dateFrom', '<=', dateService.shiftDate(params.periodToDateTo))
    .where('workPlaceID.dateTo', '>=', dateService.shiftDate(params.periodFromDateFrom))
    .whereIf(showPostedWorkPlace, 'workPlaceID.state', '=', 'POSTED')
    .where('mi_deleteDate', '>=', '9999-12-31')
    .where('workPlaceID.mi_deleteDate', '>=', '9999-12-31')
    .whereIf(documentID, 'workPlaceID.documentID', '=', documentID)
    .whereIf(dictProgClassIDs, 'dictProgClassID', 'in', dictProgClassIDs)
    .whereIf(dictFundSourceIDs, 'dictFundSourceID', 'in', dictFundSourceIDs)
    .whereIf(departmentIDs, 'workPlaceID.departmentID', 'in', departmentIDs)
    .selectAsObject({ 'workPlaceID.dateFrom': 'dateFrom', 'workPlaceID.dateTo': 'dateTo', 'workPlaceID.departmentID': 'departmentID', 'dictPositionID.dictStaffSubCatID': 'id', 'dictPositionID.dictStaffSubCatID.name': 'name', 'workPlaceID.documentID.orgID': 'orgID', 'dictProgClassID.code': 'dictProgCode' })

  function setPeriod (periodFromDateFrom, periodToDateTo) {
    const periodFrom = dateService.shiftDate(periodFromDateFrom)
    let periodTo = dateService.shiftDate(periodToDateTo)
    periodTo = (periodToDateTo.getMonth() !== 11 && periodToDateTo.getFullYear() !== periodFromDateFrom.getFullYear()) ? dateService.addMonths(periodFrom, 11 - periodFrom.getMonth()) : periodTo
    return `${dateService.formatDate(periodFrom, 'mmmm')} - ${dateService.formatDate(periodTo, 'mmmm')} ${dateService.formatDate(periodFrom, 'yyyy')} року`
  }

  function isUniqueItem (accrRate) {
    const resArr = []
    accrRate.filter(function (item, array) {
      const i = resArr.findIndex(x => (x.name === item.name))
      if (i < 0) {
        resArr.push({ name: item.name, id: item.id })
      }
      return null
    })
    return resArr
  }

  function isLayoutRates (accrRate) {
    const result = []
    const uniqueAccr = isUniqueItem(accrRate)
    uniqueAccr.forEach(o => {
      accrRate.filter(s => s.id === o.id).forEach(a => {
        let index = result.findIndex(r => r.id === a.id)
        if (index < 0) {
          index = result.push({
            id: a.id,
            name: a.name ? a.name : 'Не визначено',
            col1: null,
            col2: null,
            col3: null,
            col4: null,
            col5: null,
            col6: null,
            col7: null,
            col8: null,
            col9: null,
            col10: null,
            col11: null,
            col12: null
          }) - 1
        }
        const colMonthDateFrom = dateService.shiftDate(a.dateFrom).getFullYear() >= dateService.shiftDate(params.periodFromDateFrom).getFullYear() ? dateService.shiftDate(a.dateFrom).getMonth() + 1 : 1
        const colMonthDateTo = dateService.shiftDate(a.dateTo).getFullYear() <= dateService.shiftDate(params.periodToDateTo).getFullYear() ? dateService.shiftDate(a.dateTo).getMonth() + 1 : dateService.shiftDate(params.periodToDateTo).getMonth() + 1
        const periodFrom = dateService.shiftDate(params.periodFromDateFrom).getMonth() + 1
        const periodTo = dateService.shiftDate(params.periodToDateTo).getMonth() + 1
        const exit = colMonthDateTo <= periodTo ? colMonthDateTo : periodTo
        for (let i = 1; i <= exit; i++) {
          if (i >= periodFrom && i >= colMonthDateFrom) result[index][`col${i}`] += a.rate
        }
      })
    })
    return result
  }
  function isLayoutYear (periodFromDateFrom) {
    const layoutArr = []
    const Obj = {}
    for (let i = 0; i < 12; i++) {
      const mounth = `${i + 1}`.length === 1 ? `0${i + 1}` : `${i + 1}`
      Obj[`col${i + 1}`] = `${dateService.lastDayOfMonth(new Date(params.periodFromDateFrom.getFullYear(), i, 1)).getDate()}.${mounth}.${params.periodFromDateFrom.getFullYear()}`
    }
    layoutArr.push(Obj)
    return layoutArr
  }

  function isAllColSum (layoutRates) {
    const result = [{
      sumCol1: null,
      sumCol2: null,
      sumCol3: null,
      sumCol4: null,
      sumCol5: null,
      sumCol6: null,
      sumCol7: null,
      sumCol8: null,
      sumCol9: null,
      sumCol10: null,
      sumCol11: null,
      sumCol12: null
    }]
    layoutRates.forEach(o => {
      result[0].sumCol1 += o.col1
      result[0].sumCol2 += o.col2
      result[0].sumCol3 += o.col3
      result[0].sumCol4 += o.col4
      result[0].sumCol5 += o.col5
      result[0].sumCol6 += o.col6
      result[0].sumCol7 += o.col7
      result[0].sumCol8 += o.col8
      result[0].sumCol9 += o.col9
      result[0].sumCol10 += o.col10
      result[0].sumCol11 += o.col11
      result[0].sumCol12 += o.col12
    })
    return result
  }

  function isRoundUpTo (array, col, roundUpTo) {
    const result = []
    array.forEach(o => {
      const obj = {}
      for (const prop in o) {
        o[prop] === 0 ? o[prop] = null : o[prop]
        if (o[prop] && prop.slice(0, 3) === col) {
          obj[prop] = currencyService.formatAsCurrency(o[prop], Number(roundUpTo) || 4)
        } else {
          obj[prop] = o[prop]
        }
      }
      result.push(obj)
    })
    return result
  }
  function addOrgName (org, params) {
    const globalOrg = org.find(o => o.orgID === params.orgID)
    let result = null
    if (globalOrg && params.showJoinReport) {
      result = `по організації ${globalOrg.name}`
    } else if (org.length && globalOrg) {
      result = `по району ${globalOrg.name}`
    } else if (org.length && !globalOrg) {
      result = `по району ${params.orgName}`
    }
    return result
  }
  function setSelectOrg (org) {
    if (org.length > 1) {
      return `Вибрані установи: ${org.map(o => o.name).join(', ')}`
    }
  }
  const allDictProgClass = Object.keys(_.groupBy(accrRate, 'dictProgCode')).join(', ')
  const layoutRates = isLayoutRates(accrRate)
  const colSum = isAllColSum(layoutRates)
  const report = {
    layoutRates,
    colSum,
    ratesSum: isRoundUpTo(layoutRates, 'col', params.roundUpTo),
    allColSum: isRoundUpTo(colSum, 'sum', params.roundUpTo),
    layoutYear: isLayoutYear(params.periodFromDateFrom),

    headReport: [{
      hrOrg: addOrgName(hrOrg, params),
      dictProgClassName: allDictProgClass ? `КПК: ${allDictProgClass}` : null,
      period: setPeriod(params.periodFromDateFrom, params.periodToDateTo)
    }],
    selectOrg: setSelectOrg(hrOrg)
  }

  ctx.mParams.resultData = JSON.stringify({
    report
  })
}
me.getStatement = ctx => {
  const params = ctx.mParams.execParams
  const orgIDs = me.getSchoolID(JSON.parse(params.orgIDs))
  const orgID = params.joinReport && orgIDs.length ? orgIDs : [params.orgID]
  const dictProgClassID = params.dictProgClassID ? params.dictProgClassID.split(',').map(o => Number(o)) : []
  const dictFundSourceID = params.dictFundSourceID ? params.dictFundSourceID.split(',').map(o => Number(o)) : []
  const documentID = params.reportParams ? JSON.parse(params.reportParams.documentID) : null
  const showPostedWorkPlace = params.reportParams ? params.reportParams.showPostedWorkPlace : true

  const dictProgCode = UB.Repository('trf_position')
    .attrs('dictProgClassID', 'dictProgClassID.code')
    .where('workPlaceID.documentID.orgID', 'in', orgID)
    .where('workPlaceID.dateFrom', '<=', dateService.shiftDate(params.issueDate))
    .where('workPlaceID.dateTo', '>=', dateService.shiftDate(params.issueDate))
    .where('dictProgClassID', '!=', null)
    .where('workPlaceID.state', '=', 'POSTED')
    //.where('workPlaceID.employeeNumberID.dateTo', '>', dateService.shiftDate(params.issueDate))
    .where('workPlaceID.employeeNumberID.dateTo', '>', dateService.shiftDate(params.issueDate),'cond1')
    .where('workPlaceID.employeeNumberID', 'isNull',undefined,'cond2')
    .whereIf(documentID, 'workPlaceID.documentID', '=', documentID)
    .whereIf(dictProgClassID.length, 'dictProgClassID', 'in', dictProgClassID)
    .groupBy(['dictProgClassID', 'dictProgClassID.code'])
    .logic('(([cond1]) or ([cond2]))')
    .selectAsObject({ 'dictProgClassID.code': 'dictProgCode' })

  const dictFundSource = UB.Repository('trf_position')
    .attrs('dictFundSourceID', 'dictFundSourceID.name')
    .where('workPlaceID.documentID.orgID', 'in', orgID)
    .where('workPlaceID.dateFrom', '<=', dateService.shiftDate(params.issueDate))
    .where('workPlaceID.dateTo', '>=', dateService.shiftDate(params.issueDate))
    .where('dictProgClassID', '!=', null)
    .where('workPlaceID.state', '=', 'POSTED')
    //.where('workPlaceID.employeeNumberID.dateTo', '>', dateService.shiftDate(params.issueDate))
    .where('workPlaceID.employeeNumberID.dateTo', '>', dateService.shiftDate(params.issueDate),'cond1')
    .where('workPlaceID.employeeNumberID', 'isNull',undefined,'cond2')
    .whereIf(documentID, 'workPlaceID.documentID', '=', documentID)
    .whereIf(dictFundSourceID.length, 'dictFundSourceID', 'in', dictFundSourceID)
    .groupBy(['dictFundSourceID', 'dictFundSourceID.name'])
    .logic('(([cond1]) or ([cond2]))')
    .selectAsObject({ 'dictFundSourceID.name': 'dictFundSourceName' })

  const hrOrg = UB.Repository('hr_organization')
    .attrs('name', 'mi_data_id', 'fullName')
    .where('mi_data_id', 'in', orgID)
    .where('state', '=', 'ACTIVE')
    .orderBy('mi_dateFrom', 'desc')
    .selectAsObject({ mi_data_id: 'orgID' })

  let teachLoads = UB.Repository('trf_accrual')
    .attrs('positionID', 'positionID.workPlaceID.documentID.orgID', 'payElID.description', 'dictPupilID.code', 'accrualSum',
      'hours', 'payElID', 'positionID.workPlaceID.documentID.dateFrom', 'positionID.dictPositionID',
      'positionID.workPlaceID.employeeNumberID')
    .where('accrualSum', '!=', 0)
    .where('positionID.workPlaceID.documentID.orgID', 'in', orgID)
    .where('positionID.workPlaceID.dateFrom', '<=', dateService.shiftDate(params.issueDate))
    .where('positionID.workPlaceID.dateTo', '>=', dateService.shiftDate(params.issueDate))
    .where('positionID.workPlaceID.documentID.type', '=', params.tarificationType)
    //.where('positionID.workPlaceID.employeeNumberID.dateTo', '>', dateService.shiftDate(params.issueDate))
    .where('positionID.workPlaceID.employeeNumberID.dateTo', '>', dateService.shiftDate(params.issueDate),'cond1')
    .where('positionID.workPlaceID.employeeNumberID', 'isNull',undefined,'cond2')
    .whereIf(showPostedWorkPlace, 'positionID.workPlaceID.state', '=', 'POSTED')
    .where('payElID.methodID.code', '=', '146')
    .whereIf(documentID, 'positionID.workPlaceID.documentID', '=', documentID)
    .whereIf(params.dictFundSourceID.length, 'positionID.dictFundSourceID', 'in', params.dictFundSourceID.split(','))
    .whereIf(params.workPlaceType === '2', 'positionID.workPlaceID.employeeNumberID', 'isNotNull')
    .whereIf(params.workPlaceType === '3', 'positionID.workPlaceID.employeeNumberID', 'isNull')
    .whereIf(params.positionCategory.length, 'positionID.dictPositionID.positionCategory', 'in', params.positionCategory)
    .whereIf(dictProgClassID.length, 'positionID.dictProgClassID', 'in', dictProgClassID)
    .logic('(([cond1]) or ([cond2]))')
    .selectAsObject({
      'dictPupilID.code': 'code',
      'payElID.description': 'name',
      'positionID.workPlaceID.documentID.orgID': 'orgID',
      'positionID.workPlaceID.documentID.dateFrom': 'docDateFrom',
      'positionID.dictPositionID': 'dictPositionID',
      'positionID.workPlaceID.employeeNumberID': 'employeeNumberID'
    })

  let noteBooksLoad = UB.Repository('trf_accrual')
    .attrs('positionID', 'positionID.workPlaceID.documentID.orgID', 'payElID.description', 'dictPupilID.code', 'accrualSum',
      'hours', 'payElID', 'positionID.workPlaceID.documentID.dateFrom', 'positionID.dictPositionID',
      'positionID.workPlaceID.employeeNumberID')
    .where('accrualSum', '!=', 0)
    .where('positionID.workPlaceID.documentID.orgID', 'in', orgID)
    .where('positionID.workPlaceID.dateFrom', '<=', dateService.shiftDate(params.issueDate))
    .where('positionID.workPlaceID.dateTo', '>=', dateService.shiftDate(params.issueDate))
    .where('positionID.workPlaceID.documentID.type', '=', params.tarificationType)
    //.where('positionID.workPlaceID.employeeNumberID.dateTo', '>', dateService.shiftDate(params.issueDate))
    .where('positionID.workPlaceID.employeeNumberID.dateTo', '>', dateService.shiftDate(params.issueDate),'cond1')
    .where('positionID.workPlaceID.employeeNumberID', 'isNull',undefined,'cond2')
    .whereIf(showPostedWorkPlace, 'positionID.workPlaceID.state', '=', 'POSTED')
    .where('payElID.methodID.code', '=', '148')
    .whereIf(documentID, 'positionID.workPlaceID.documentID', '=', documentID)
    .whereIf(params.dictFundSourceID.length, 'positionID.dictFundSourceID', 'in', params.dictFundSourceID.split(','))
    .whereIf(params.workPlaceType === '2', 'positionID.workPlaceID.employeeNumberID', 'isNotNull')
    .whereIf(params.workPlaceType === '3', 'positionID.workPlaceID.employeeNumberID', 'isNull')
    .whereIf(params.positionCategory.length, 'positionID.dictPositionID.positionCategory', 'in', params.positionCategory)
    .whereIf(dictProgClassID.length, 'positionID.dictProgClassID', 'in', dictProgClassID)
    .logic('(([cond1]) or ([cond2]))')
    .selectAsObject({
      'dictPupilID.code': 'code',
      'payElID.description': 'name',
      'positionID.workPlaceID.documentID.orgID': 'orgID',
      'positionID.workPlaceID.documentID.dateFrom': 'docDateFrom',
      'positionID.dictPositionID': 'dictPositionID',
      'positionID.workPlaceID.employeeNumberID': 'employeeNumberID'
    })

  let positionRequest = UB.Repository('trf_accrual')
    .attrs('positionID.dictPositionID', 'positionID.dictPositionID.name', 'positionID.rate',
      'positionID.workPlaceID.documentID.dateFrom', 'hours', 'positionID.workPlaceID.documentID.orgID', 'accrualSum',
      'positionID.workPlaceID.employeeNumberID', 'payElID.methodID.code')
    .where('accrualSum', '!=', 0)
    .where('positionID.workPlaceID.documentID.orgID', 'in', orgID)
    .where('positionID.workPlaceID.dateFrom', '<=', dateService.shiftDate(params.issueDate))
    .where('positionID.workPlaceID.dateTo', '>=', dateService.shiftDate(params.issueDate))
    .where('positionID.workPlaceID.documentID.type', '=', params.tarificationType)
    .where('positionID.workPlaceID.employeeNumberID.dateTo', '>', dateService.shiftDate(params.issueDate),'cond1')
    .where('positionID.workPlaceID.employeeNumberID', 'isNull',undefined,'cond2')
    .whereIf(showPostedWorkPlace, 'positionID.workPlaceID.state', '=', 'POSTED')
    .where('payElID.methodID.code', 'in', ['1', '2', '147', '156'])
    .whereIf(documentID, 'positionID.workPlaceID.documentID', '=', documentID)
    .whereIf(params.dictFundSourceID.length, 'positionID.dictFundSourceID', 'in', params.dictFundSourceID.split(','))
    .whereIf(params.workPlaceType === '2', 'positionID.workPlaceID.employeeNumberID', 'isNotNull')
    .whereIf(params.workPlaceType === '3', 'positionID.workPlaceID.employeeNumberID', 'isNull')
    .whereIf(params.positionCategory.length, 'positionID.dictPositionID.positionCategory', 'in', params.positionCategory)
    .whereIf(dictProgClassID.length, 'positionID.dictProgClassID', 'in', dictProgClassID)
    .logic('(([cond1]) or ([cond2]))')
    .selectAsObject({
      'positionID.rate': 'rate',
      'positionID.dictPositionID.name': 'dictPositionName',
      'positionID.dictPositionID': 'dictPositionID',
      'positionID.workPlaceID.documentID.dateFrom': 'docDateFrom',
      'positionID.workPlaceID.documentID.orgID': 'orgID',
      'positionID.workPlaceID.employeeNumberID': 'employeeNumberID',
      'payElID.methodID.code': 'payElCode'
    })

  let overpayPositions = UB.Repository('trf_accrual')
    .attrs('positionID.dictPositionID', 'positionID.workPlaceID.documentID.orgID', 'payElID.description', 'dictPupilID.code',
      'accrualSum', 'payElID', 'positionID.workPlaceID.documentID.dateFrom',
      'positionID.workPlaceID.employeeNumberID')
    .where('accrualSum', '!=', 0)
    .where('positionID.workPlaceID.documentID.orgID', 'in', orgID)
    .where('positionID.workPlaceID.dateFrom', '<=', dateService.shiftDate(params.issueDate))
    .where('positionID.workPlaceID.dateTo', '>=', dateService.shiftDate(params.issueDate))
    .where('positionID.workPlaceID.documentID.type', '=', params.tarificationType)
    //.where('positionID.workPlaceID.employeeNumberID.dateTo', '>', dateService.shiftDate(params.issueDate))
    .where('positionID.workPlaceID.employeeNumberID.dateTo', '>', dateService.shiftDate(params.issueDate),'cond1')
    .where('positionID.workPlaceID.employeeNumberID', 'isNull',undefined,'cond2')
    .whereIf(showPostedWorkPlace, 'positionID.workPlaceID.state', '=', 'POSTED')
    .where('payElID.methodID.code', 'in', ['7', '8', '9', '10', '11', '33', '50', '51', '56', '153', '207'])
    .whereIf(documentID, 'positionID.workPlaceID.documentID', '=', documentID)
    .whereIf(params.dictFundSourceID.length, 'positionID.dictFundSourceID', 'in', params.dictFundSourceID.split(','))
    .whereIf(params.workPlaceType === '2', 'positionID.workPlaceID.employeeNumberID', 'isNotNull')
    .whereIf(params.workPlaceType === '3', 'positionID.workPlaceID.employeeNumberID', 'isNull')
    .whereIf(params.positionCategory.length, 'positionID.dictPositionID.positionCategory', 'in', params.positionCategory)
    .whereIf(dictProgClassID.length, 'positionID.dictProgClassID', 'in', dictProgClassID)
    .logic('(([cond1]) or ([cond2]))')
    .selectAsObject({
      'dictPupilID.code': 'code',
      'payElID.description': 'overpayPositionsName',
      'positionID.workPlaceID.documentID.orgID': 'orgID',
      'positionID.dictPositionID': 'dictPositionID',
      'accrualSum': 'accrualSumOverpayPositions',
      'positionID.workPlaceID.documentID.dateFrom': 'docDateFrom',
      'positionID.workPlaceID.employeeNumberID': 'employeeNumberID'
    })

  let premiumPositions = UB.Repository('trf_accrual')
    .attrs('positionID.dictPositionID', 'positionID.workPlaceID.documentID.orgID', 'payElID.description', 'dictPupilID.code',
      'accrualSum', 'positionID.workPlaceID.documentID.dateFrom', 'payElID',
      'positionID.workPlaceID.employeeNumberID')
    .where('accrualSum', '!=', 0)
    .where('positionID.workPlaceID.documentID.orgID', 'in', orgID)
    .where('positionID.workPlaceID.dateFrom', '<=', dateService.shiftDate(params.issueDate))
    .where('positionID.workPlaceID.dateTo', '>=', dateService.shiftDate(params.issueDate))
    .where('positionID.workPlaceID.documentID.type', '=', params.tarificationType)
    .whereIf(showPostedWorkPlace, 'positionID.workPlaceID.state', '=', 'POSTED')
    //.where('positionID.workPlaceID.employeeNumberID.dateTo', '>', dateService.shiftDate(params.issueDate))
    .where('positionID.workPlaceID.employeeNumberID.dateTo', '>', dateService.shiftDate(params.issueDate),'cond1')
    .where('positionID.workPlaceID.employeeNumberID', 'isNull',undefined,'cond2')
    .where('payElID.methodID.code', 'in', ['4', '5', '6', '150', '154', '155'])
    .whereIf(documentID, 'positionID.workPlaceID.documentID', '=', documentID)
    .whereIf(params.dictFundSourceID.length, 'positionID.dictFundSourceID', 'in', params.dictFundSourceID.split(','))
    .whereIf(params.workPlaceType === '2', 'positionID.workPlaceID.employeeNumberID', 'isNotNull')
    .whereIf(params.workPlaceType === '3', 'positionID.workPlaceID.employeeNumberID', 'isNull')
    .whereIf(params.positionCategory.length, 'positionID.dictPositionID.positionCategory', 'in', params.positionCategory)
    .whereIf(dictProgClassID.length, 'positionID.dictProgClassID', 'in', dictProgClassID)
    .logic('(([cond1]) or ([cond2]))')
    .selectAsObject({
      'dictPupilID.code': 'code',
      'payElID.description': 'premiumPositionsName',
      'positionID.workPlaceID.documentID.orgID': 'orgID',
      'positionID.dictPositionID': 'dictPositionID',
      'accrualSum': 'accrualSumPremiumPositions',
      'positionID.workPlaceID.documentID.dateFrom': 'docDateFrom',
      'positionID.workPlaceID.employeeNumberID': 'employeeNumberID'
    })

  const sortPosition = UB.Repository('hr_idParam')
    .attrs('dictPositionID', 'orderN')
    .where('listParamID.code', '=', params.dictPositionGrid)
    .where('mi_deleteUser', 'isNull')
    .selectAsObject()
  positionRequest = positionRequest.map(o => {
    const positionSort = sortPosition.find(dictPosition => dictPosition.dictPositionID === o.dictPositionID)
    o.sortNumber = positionSort ? positionSort.orderN : 0
    return o
  }).sort((a, b) => a.sortNumber - b.sortNumber)
  if (params.dictExperienceID) {
    const dictExperienceID = params.dictExperienceID.split(',')
    const calcEmployeeExperience = []
    positionRequest = positionRequest.filter(o => {
      const dataObj = {
        employeeNumberID: o.employeeNumberID,
        onDate: dateService.shiftDate(o.docDateFrom)
      }
      const experience = tarifficationService.calcEmployeeExperience(dataObj)
      experience.forEach(p => { p.employeeNumberID = o.employeeNumberID })
      calcEmployeeExperience.push(...experience)
      if (experience.length && dictExperienceID.find(p => experience.find(k => Number(p) === k.ID))) {
        return o
      }
    })
    teachLoads = teachLoads.filter(o => {
      if (calcEmployeeExperience.length && dictExperienceID.find(p => calcEmployeeExperience.find(k => Number(p) === k.ID))) {
        return o
      } else {
        const dataObj = {
          employeeNumberID: o.employeeNumberID,
          onDate: dateService.shiftDate(o.docDateFrom)
        }
        const experience = tarifficationService.calcEmployeeExperience(dataObj)
        experience.forEach(p => { p.employeeNumberID = o.employeeNumberID })
        calcEmployeeExperience.push(...experience)
        if (experience.length && dictExperienceID.find(p => experience.find(k => Number(p) === k.ID))) {
          return o
        }
      }
    })
    noteBooksLoad = noteBooksLoad.filter(o => {
      if (calcEmployeeExperience.length && dictExperienceID.find(p => calcEmployeeExperience.find(k => Number(p) === k.ID))) {
        return o
      } else {
        const dataObj = {
          employeeNumberID: o.employeeNumberID,
          onDate: dateService.shiftDate(o.docDateFrom)
        }
        const experience = tarifficationService.calcEmployeeExperience(dataObj)
        experience.forEach(p => { p.employeeNumberID = o.employeeNumberID })
        calcEmployeeExperience.push(...experience)
        if (experience.length && dictExperienceID.find(p => experience.find(k => Number(p) === k.ID))) {
          return o
        }
      }
    })
    overpayPositions = overpayPositions.filter(o => {
      if (calcEmployeeExperience.length && dictExperienceID.find(p => calcEmployeeExperience.find(k => Number(p) === k.ID))) {
        return o
      } else {
        const dataObj = {
          employeeNumberID: o.employeeNumberID,
          onDate: dateService.shiftDate(o.docDateFrom)
        }
        const experience = tarifficationService.calcEmployeeExperience(dataObj)
        experience.forEach(p => { p.employeeNumberID = o.employeeNumberID })
        calcEmployeeExperience.push(...experience)
        if (experience.length && dictExperienceID.find(p => experience.find(k => Number(p) === k.ID))) {
          return o
        }
      }
    })
    premiumPositions = premiumPositions.filter(o => {
      if (calcEmployeeExperience.length && dictExperienceID.find(p => calcEmployeeExperience.find(k => Number(p) === k.ID))) {
        return o
      } else {
        const dataObj = {
          employeeNumberID: o.employeeNumberID,
          onDate: dateService.shiftDate(o.docDateFrom)
        }
        const experience = tarifficationService.calcEmployeeExperience(dataObj)
        experience.forEach(p => { p.employeeNumberID = o.employeeNumberID })
        calcEmployeeExperience.push(...experience)
        if (experience.length && dictExperienceID.find(p => experience.find(k => Number(p) === k.ID))) {
          return o
        }
      }
    })
  }

  function setPositionTeachLoad (teachLoad) {
    const result = []
    teachLoad.forEach(s => {
      let index = result.findIndex(r => r.payElID === s.payElID)
      if (index < 0) {
        index = result.push({
          payElID: s.payElID,
          loadName: s.name,
          dictPositionID: s.dictPositionID,
          pupil1Hours: null,
          pupil1Sum: null,
          pupil2Hours: null,
          pupil2Sum: null,
          pupil3Hours: null,
          pupil3Sum: null,
          hoursSum: null,
          paySum: null
        }) - 1
      }
      switch (s.code) {
        case '1-4':
          result[index].pupil1Hours += s.hours
          result[index].pupil1Sum += s.accrualSum
          result[index].hoursSum += s.hours
          result[index].paySum += s.accrualSum
          break
        case '5-9':
          result[index].pupil2Hours += s.hours
          result[index].pupil2Sum += s.accrualSum
          result[index].hoursSum += s.hours
          result[index].paySum += s.accrualSum
          break
        case '10-11':
          result[index].pupil3Hours += s.hours
          result[index].pupil3Sum += s.accrualSum
          result[index].hoursSum += s.hours
          result[index].paySum += s.accrualSum
          break
        default:
          result[index].hoursSum += s.hours
          result[index].paySum += s.accrualSum
      }
    })
    return result
  }

  function setRowsDivide (loads) {
    const loadLength = loads.length
    const result = loads.map((o, i) => {
      const result = {
        load: o
      }
      result.rowspan = i === 0 ? loadLength + 1 : false
      return result
    })
    return result
  }

  function setAccrualsSum (accr) {
    const result = [{
      allPupil1Hours: null,
      allPupil1Sum: null,
      allPupil2Hours: null,
      allPupil2Sum: null,
      allPupil3Hours: null,
      allPupil3Sum: null,
      allHoursSum: null,
      allPaySum: null
    }]

    accr.forEach(o => {
      result[0].allPupil1Hours += o.pupil1Hours
      result[0].allPupil1Sum += o.pupil1Sum
      result[0].allPupil2Hours += o.pupil2Hours
      result[0].allPupil2Sum += o.pupil2Sum
      result[0].allPupil3Hours += o.pupil3Hours
      result[0].allPupil3Sum += o.pupil3Sum
      result[0].allHoursSum += o.hoursSum
      result[0].allPaySum += o.paySum
    })
    return result
  }

  function isUniqueItemArray (arr, key) {
    const resArr = []
    arr.filter(function (item, array) {
      const i = resArr.findIndex(x => (x[key] === item[key]))
      if (i < 0) {
        resArr.push(item)
      }
      return null
    })
    return resArr
  }

  function fieldsUnion (array, uniquePos, key, groupKey) {
    const result = []
    const groupArr = _.groupBy(array, groupKey)
    Object.keys(groupArr).forEach(k => {
      const accr = groupArr[k]
      switch (key) {
        case 'pos':
          const objPos = {
            dictPositionID: null,
            dictPositionName: null,
            hours: null,
            rate: null,
            payment: null,
            accrualSum: null
          }
          accr.forEach(p => {
            objPos.dictPositionID = p.dictPositionID
            objPos.dictPositionName = p.dictPositionName
            objPos.rate += p.rate
            objPos.payment += p.accrualSum
            objPos.hours += p.hours
          })
          objPos.middleRate = objPos.payment / (objPos.rate || 1)
          result.push(objPos)
          break
        case 'overpay':
          const objOverpay = {
            overpayPositionsName: null,
            accrualSumOverpayPositions: null
          }
          accr.forEach(p => {
            objOverpay.overpayPositionsName = p.overpayPositionsName
            objOverpay.accrualSumOverpayPositions += p.accrualSumOverpayPositions
          })
          result.push(objOverpay)
          break
        case 'premium':
          const objPremium = {
            premiumPositionsName: null,
            accrualSumPremiumPositions: null
          }
          accr.forEach(p => {
            objPremium.premiumPositionsName = p.premiumPositionsName
            objPremium.accrualSumPremiumPositions += p.accrualSumPremiumPositions
          })
          result.push(objPremium)
          break
      }
    })
    return result
  }

  function isMoreArrayName (positionRequest, overpayPositions, premiumPositions) {
    const array = [{
      length: positionRequest.length,
      arrayName: 'positionRequest'
    }, {
      length: overpayPositions.length,
      arrayName: 'overpayPositions'
    }, {
      length: premiumPositions.length,
      arrayName: 'premiumPositions'
    }]
    const maxLength = array.reduce(function (max, obj) {
      return obj.length > max.length ? obj : max
    })
    return maxLength.arrayName
  }

  function addHourseFromAccruals (fieldsUnionPos, accr) {
    fieldsUnionPos.forEach(o => {
      o.hours = accr.reduce((acc, cur) => {
        if (o.dictPositionID === cur.dictPositionID) {
          return acc + cur.hoursSum
        }
      }, 0)
    })
    return fieldsUnionPos
  }

  function setFieldPosOverpayPremium (positionRequest, overpayPositions, premiumPositions, accr) {
    const result = []
    positionRequest = positionRequest.filter(o => o.dictPositionID !== null)
    overpayPositions = overpayPositions.filter(o => o.payElID !== null)
    premiumPositions = premiumPositions.filter(o => o.payElID !== null)
    const uniquePos = positionRequest.length > 1 ? isUniqueItemArray(positionRequest, 'dictPositionID') : positionRequest
    const uniqueOverpayPos = overpayPositions.length > 1 ? isUniqueItemArray(overpayPositions, 'payElID') : overpayPositions
    const uniquePremiumPos = premiumPositions.length > 1 ? isUniqueItemArray(premiumPositions, 'payElID') : premiumPositions

    const maxArrayName = isMoreArrayName(uniquePos, uniqueOverpayPos, uniquePremiumPos)
    const fieldsUnionPos = fieldsUnion(positionRequest, uniquePos, 'pos', 'dictPositionID')
    const fieldsSumOverpayPositions = fieldsUnion(overpayPositions, uniqueOverpayPos, 'overpay', 'overpayPositionsName')
    const fieldsSumPremiumPositions = fieldsUnion(premiumPositions, uniquePremiumPos, 'premium', 'premiumPositionsName')
    addHourseFromAccruals(fieldsUnionPos, accr)
    switch (maxArrayName) {
      case 'positionRequest':
        fieldsUnionPos.forEach((o, i, array) => {
          const obj = {
            dictPositionName: o.dictPositionName,
            rate: o.rate ? o.rate : null,
            payment: o.payment ? o.payment : null,
            hours: o.hours ? o.hours : null,
            middleRate: o.middleRate ? o.middleRate : null,
            overpayPositionsName: fieldsSumOverpayPositions.length >= (i + 1) ? fieldsSumOverpayPositions[i].overpayPositionsName : null,
            accrualSumOverpayPositions: fieldsSumOverpayPositions.length >= (i + 1) ? fieldsSumOverpayPositions[i].accrualSumOverpayPositions : null,
            premiumPositionsName: fieldsSumPremiumPositions.length >= (i + 1) ? fieldsSumPremiumPositions[i].premiumPositionsName : null,
            accrualSumPremiumPositions: fieldsSumPremiumPositions.length >= (i + 1) ? fieldsSumPremiumPositions[i].accrualSumPremiumPositions : null,
            // Style total cell

            fontWeightPosName: fieldsUnionPos.length === i ? 'bold' : 'normal',
            fontWeightOverpayPos: fieldsSumOverpayPositions.length === i ? 'bold' : 'normal',
            fontWeightPremiumPos: fieldsSumPremiumPositions.length === i ? 'bold' : 'normal',

            textAlignPremiumPos: fieldsSumPremiumPositions.length === i ? 'right' : 'left',
            textAlignOverpayPos: fieldsSumOverpayPositions.length === i ? 'right' : 'left',
            textAlignPosName: fieldsUnionPos.length === i ? 'right' : 'left',

            borderPosName: fieldsUnionPos.length >= i ? '1px solid' : 'none',
            borderOverpayPos: fieldsSumOverpayPositions.length >= i ? '1px solid' : 'none',
            borderPremiumPos: fieldsSumPremiumPositions.length >= i ? '1px solid' : 'none'
          }
          result.push(obj)
        })
        result.push({
          borderPosName: '1px solid',
          fontWeightPosName: 'bold',
          textAlignPosName: 'right',
          dictPositionName: null,
          payment: null
        })
        break
      case 'overpayPositions':
        fieldsSumOverpayPositions.forEach((o, i, array) => {
          const obj = {
            dictPositionName: fieldsUnionPos.length >= (i + 1) ? fieldsUnionPos[i].dictPositionName : null,
            rate: fieldsUnionPos.length >= (i + 1) ? fieldsUnionPos[i].rate : null,
            hours: fieldsUnionPos.length >= (i + 1) ? fieldsUnionPos[i].hours : null,
            payment: fieldsUnionPos.length >= (i + 1) ? fieldsUnionPos[i].payment : null,
            middleRate: fieldsUnionPos.length >= (i + 1) ? fieldsUnionPos[i].middleRate : null,
            overpayPositionsName: o.overpayPositionsName,
            accrualSumOverpayPositions: o.accrualSumOverpayPositions,
            premiumPositionsName: fieldsSumPremiumPositions.length >= (i + 1) ? fieldsSumPremiumPositions[i].premiumPositionsName : null,
            accrualSumPremiumPositions: fieldsSumPremiumPositions.length >= (i + 1) ? fieldsSumPremiumPositions[i].accrualSumPremiumPositions : null,
            // Style total cell

            fontWeightPosName: fieldsUnionPos.length === i ? 'bold' : 'normal',
            fontWeightOverpayPos: fieldsSumOverpayPositions.length === i ? 'bold' : 'normal',
            fontWeightPremiumPos: fieldsSumPremiumPositions.length === i ? 'bold' : 'normal',

            textAlignPremiumPos: fieldsSumPremiumPositions.length === i ? 'right' : 'left',
            textAlignOverpayPos: fieldsSumOverpayPositions.length === i ? 'right' : 'left',
            textAlignPosName: fieldsUnionPos.length === i ? 'right' : 'left',

            borderPosName: fieldsUnionPos.length >= i ? '1px solid' : 'none',
            borderOverpayPos: fieldsSumOverpayPositions.length >= i ? '1px solid' : 'none',
            borderPremiumPos: fieldsSumPremiumPositions.length >= i ? '1px solid' : 'none'
          }
          fieldsUnionPos.length && result.push(obj)
        })
        result.push({
          borderOverpayPos: '1px solid',
          textAlignOverpayPos: 'right',
          fontWeightOverpayPos: 'bold',
          overpayPositionsName: null,
          accrualSumOverpayPositions: null
        })
        break
      case 'premiumPositions':
        fieldsSumPremiumPositions.forEach((o, i, array) => {
          const obj = {
            dictPositionName: fieldsUnionPos.length >= (i + 1) ? fieldsUnionPos[i].dictPositionName : null,
            rate: fieldsUnionPos.length >= (i + 1) ? fieldsUnionPos[i].rate : null,
            hours: fieldsUnionPos.length >= (i + 1) ? fieldsUnionPos[i].hours : null,
            payment: fieldsUnionPos.length >= (i + 1) ? fieldsUnionPos[i].payment : null,
            middleRate: fieldsUnionPos.length >= (i + 1) ? fieldsUnionPos[i].middleRate : null,
            overpayPositionsName: fieldsSumOverpayPositions.length >= (i + 1) ? fieldsSumOverpayPositions[i].overpayPositionsName : null,
            accrualSumOverpayPositions: fieldsSumOverpayPositions.length >= (i + 1) ? fieldsSumOverpayPositions[i].accrualSumOverpayPositions : null,
            premiumPositionsName: o.premiumPositionsName,
            accrualSumPremiumPositions: o.accrualSumPremiumPositions,
            // Style total cell
            fontWeightPosName: fieldsUnionPos.length === i ? 'bold' : 'normal',
            fontWeightOverpayPos: fieldsSumOverpayPositions.length === i ? 'bold' : 'normal',
            fontWeightPremiumPos: fieldsSumPremiumPositions.length === i ? 'bold' : 'normal',

            textAlignPremiumPos: fieldsSumPremiumPositions.length === i ? 'right' : 'left',
            textAlignOverpayPos: fieldsSumOverpayPositions.length === i ? 'right' : 'left',
            textAlignPosName: fieldsUnionPos.length === i ? 'right' : 'left',

            borderPosName: fieldsUnionPos.length >= i ? '1px solid' : 'none',
            borderOverpayPos: fieldsSumOverpayPositions.length >= i ? '1px solid' : 'none',
            borderPremiumPos: fieldsSumPremiumPositions.length >= i ? '1px solid' : 'none'
          }
          fieldsSumPremiumPositions.length && result.push(obj)
        })
        result.push({
          borderPremiumPos: '1px solid',
          fontWeightPremiumPos: 'bold',
          textAlignPremiumPos: 'right',
          premiumPositionsName: null,
          accrualSumPremiumPositions: null
        })
        break
    }
    return result
  }

  function accrSum (arr, key) {
    const result = arr.reduce((acc, o) => {
      return acc + (o[key] ? o[key] : 0)
    }, null)
    return result !== 0 ? result : null
  }

  function firstEmptyProperty (array, key, searchKey) {
    return array.findIndex(o => o[key] === searchKey)
  }

  function blockAccr (posAccr) {
    const firstEmptyPosIdx = firstEmptyProperty(posAccr, 'dictPositionName', null)
    const firstEmptyOverpayIdx = firstEmptyProperty(posAccr, 'overpayPositionsName', null)
    const firstEmptyPremiumIdx = firstEmptyProperty(posAccr, 'premiumPositionsName', null)
    const emptyPosIdx = firstEmptyPosIdx === -1 ? posAccr.length - 1 : firstEmptyPosIdx
    const emptyOverpayIdx = firstEmptyOverpayIdx === -1 ? posAccr.length - 1 : firstEmptyOverpayIdx
    const emptyPremiumIdx = firstEmptyPremiumIdx === -1 ? posAccr.length - 1 : firstEmptyPremiumIdx

    posAccr[emptyPosIdx].rate = accrSum(posAccr, 'rate')
    posAccr[emptyPosIdx].payment = accrSum(posAccr, 'payment')
    posAccr[emptyPosIdx].hours = accrSum(posAccr, 'hours')
    posAccr[emptyPosIdx].dictPositionName = 'Всього'
    posAccr[emptyPosIdx] ? posAccr[emptyPosIdx].fontWeightPosName = 'bold' : posAccr[emptyOverpayIdx].fontWeightPosName = 'normal'
    posAccr[emptyPosIdx] ? posAccr[emptyPosIdx].textAlignPosName = 'right' : posAccr[emptyOverpayIdx].textAlignPosName = 'left'
    posAccr[emptyPosIdx] ? posAccr[emptyPosIdx].borderPosName = '1px solid' : posAccr[emptyOverpayIdx].borderPosName = 'none'

    posAccr[emptyOverpayIdx] ? posAccr[emptyOverpayIdx].overpayPositionsName = 'Всього' : posAccr[emptyOverpayIdx].overpayPositionsName = null
    posAccr[emptyOverpayIdx] ? posAccr[emptyOverpayIdx].fontWeightOverpayPos = 'bold' : posAccr[emptyOverpayIdx].fontWeightOverpayPos = 'normal'
    posAccr[emptyOverpayIdx] ? posAccr[emptyOverpayIdx].textAlignOverpayPos = 'right' : posAccr[emptyOverpayIdx].textAlignOverpayPos = 'left'
    posAccr[emptyOverpayIdx] ? posAccr[emptyOverpayIdx].borderOverpayPos = '1px solid' : posAccr[emptyOverpayIdx].borderOverpayPos = 'none'
    posAccr[emptyOverpayIdx].accrualSumOverpayPositions = accrSum(posAccr, 'accrualSumOverpayPositions')

    posAccr[emptyPremiumIdx] ? posAccr[emptyPremiumIdx].premiumPositionsName = 'Всього' : posAccr[emptyPremiumIdx].premiumPositionsName = null
    posAccr[emptyPremiumIdx] ? posAccr[emptyPremiumIdx].fontWeightPremiumPos = 'bold' : posAccr[emptyPremiumIdx].fontWeightPremiumPos = 'normal'
    posAccr[emptyPremiumIdx] ? posAccr[emptyPremiumIdx].textAlignPremiumPos = 'right' : posAccr[emptyPremiumIdx].textAlignPremiumPos = 'left'
    posAccr[emptyPremiumIdx] ? posAccr[emptyPremiumIdx].borderPremiumPos = '1px solid' : posAccr[emptyPremiumIdx].borderPremiumPos = 'none'
    posAccr[emptyPremiumIdx].accrualSumPremiumPositions = accrSum(posAccr, 'accrualSumPremiumPositions')
    return posAccr
  }

  function totalSumPayment (posAccr, allLoads) {
    const firstEmptyPaymentIdx = firstEmptyProperty(posAccr, 'dictPositionName', 'Всього')
    const firstEmptyOverpayIdx = firstEmptyProperty(posAccr, 'overpayPositionsName', 'Всього')
    const firstEmptyPremiumIdx = firstEmptyProperty(posAccr, 'premiumPositionsName', 'Всього')
    const emptyPosIdx = firstEmptyPaymentIdx === -1 ? posAccr.length - 1 : firstEmptyPaymentIdx
    const emptyOverpayIdx = firstEmptyOverpayIdx === -1 ? posAccr.length - 1 : firstEmptyOverpayIdx
    const emptyPremiumIdx = firstEmptyPremiumIdx === -1 ? posAccr.length - 1 : firstEmptyPremiumIdx

    const allPaySumTopTable = Number(allLoads[0].allPaySum)
    const accrualSumOverpayPositions = posAccr[emptyOverpayIdx] ? posAccr[emptyOverpayIdx].accrualSumOverpayPositions : 0
    const accrualSumPremiumPositions = posAccr[emptyPremiumIdx] ? posAccr[emptyPremiumIdx].accrualSumPremiumPositions : 0
    const payment = posAccr[emptyPosIdx] ? posAccr[emptyPosIdx].payment : 0

    const sum = payment + accrualSumOverpayPositions + accrualSumPremiumPositions + allPaySumTopTable
    return sum
  }
  function addOrgName (org, params) {
    const globalOrg = org.find(o => o.orgID === params.orgID)
    let result = null
    if (globalOrg && params.showJoinReport) {
      result = `по організації ${globalOrg.name}`
    } else if (org.length && globalOrg) {
      result = `по району ${globalOrg.name}`
    } else if (org.length && !globalOrg) {
      result = `по району ${params.orgName}`
    }
    return result
  }
  function setSelectOrg (org, teachLoads, noteBooksLoad, positionRequest, overpayPositions, premiumPositions) {
    if (org.length > 1) {
      return `установах ${org.filter(o => teachLoads.find(t => t.orgID === o.orgID) || noteBooksLoad.find(n => n.orgID === o.orgID) || positionRequest.find(p => p.orgID === o.orgID) || overpayPositions.find(ov => ov.orgID === o.orgID) || premiumPositions.find(pr => pr.orgID === o.orgID)).map(o => o.name).join(', ')}:`
    } else {
      return 'установі'
    }
  }
  const loads = teachLoads.length ? setPositionTeachLoad(teachLoads) : []
  const noteBooks = noteBooksLoad.length ? setPositionTeachLoad(noteBooksLoad) : []
  const posAccr = setFieldPosOverpayPremium(positionRequest, overpayPositions, premiumPositions, [...loads, ...noteBooks])
  const allLoads = (loads || noteBooks) && setAccrualsSum([...loads, ...noteBooks])

  const report = {
    org: addOrgName(hrOrg, params),
    dictProg: dictProgCode ? Object.keys(_.groupBy(dictProgCode, 'dictProgCode')).join(', ') : null,
    dictFundSource: dictFundSource ? Object.keys(_.groupBy(dictFundSource, 'dictFundSourceName')).join(', ') : null,
    dateFrom: dateService.formatDate(params.issueDate),
    rowsDivideLoads: loads.length && setRowsDivide(loads),
    allLoadsSum: loads.length && setAccrualsSum(loads),
    allNoteBooksSum: noteBooks.length && setAccrualsSum(noteBooks),
    allLoads: (loads || noteBooks) && setAccrualsSum([...loads, ...noteBooks]),
    rowsDivideNoteBooks: noteBooksLoad.length && setRowsDivide(noteBooks),
    renderAccr: posAccr.length && blockAccr(posAccr),
    totalSum: (posAccr || allLoads) && [{ totalSum: totalSumPayment(posAccr, allLoads) }],
    selectOrg: setSelectOrg(hrOrg, teachLoads, noteBooksLoad, positionRequest, overpayPositions, premiumPositions),
    totalReport: true,
    chief: params.headEmployeePositionShortFIO
  }

  ctx.mParams.resultData = JSON.stringify({
    report
  })
}
me.getWholeSchoolIndicators = ctx => {
  const params = ctx.mParams.execParams
  const year = [{ year: dateService.shiftDate(params.issueDate).getFullYear() }]
  const hrOrg = UB.Repository('hr_organization')
    .attrs('name', 'orgID')
    .where('mi_data_id', '=', params.orgID)
    .where('state', '=', 'ACTIVE')
    .misc({ __mip_ondate: dateService.shiftDate(params.issueDate) })
    .orderBy('mi_dateFrom', 'desc')
    .selectSingle()
  const orgAddress = UB.Repository('ac_address').attrs('address').where('ownerID', '=', params.orgID).selectScalar()
  const address = [{ address: orgAddress || null }]
  ctx.mParams.resultData = JSON.stringify({
    hrOrg,
    year,
    address
  })
}
me.getSalaryCosts = ctx => {
  const params = ctx.mParams.execParams
  const reportColum = ['trf_salary_1', 'trf_salary_2', 'trf_salary_3', 'trf_salary_4', 'trf_salary_5', 'trf_salary_6', 'trf_salary_7', 'trf_salary_8', 'trf_salary_9', 'trf_salary_10', 'trf_salary_11', 'trf_salary_12', 'trf_salary_13', 'trf_salary_14', 'trf_salary_15', 'trf_salary_16', 'trf_salary_17', 'trf_salary_18', 'trf_salary_19', 'trf_salary_20', 'trf_salary_21', 'trf_salary_22', 'trf_salary_23', 'trf_salary_24', 'trf_salary_25', 'trf_salary_26', 'trf_salary_27', 'trf_salary_28', 'trf_salary_29', 'trf_salary_30', 'trf_salary_31', 'trf_salary_32', 'trf_salary_33', 'trf_salary_34', 'trf_salary_35', 'trf_salary_36', 'trf_salary_37','trf_salary_38','trf_salary_39','trf_salary_40']

  const parentOrdID = settingsService.getByCode('hrUseReportSettingsParentOrg', params.orgID)
  const orgIDs = me.getSchoolID(JSON.parse(params.orgIDs))
  const orgID = params.joinReport && orgIDs.length ? orgIDs : [params.orgID]
  const idParams = UB.Repository('hr_idParam')
    .attrs(['listParamID.code', 'listParamID.shortName', 'payElID'])
    .where('[listParamID.code]', 'in', reportColum, 'cond1')
    .where('[listParamID.code]', 'like', 'trf_salary_%', 'cond2')
    .where('[orgID]', '=', Number(parentOrdID || params.orgID))
    .where('[listParamID.mi_deleteUser]', 'isNull')
    .logic('(([cond1]) or ([cond2]))')
    .selectAsObject({ 'listParamID.code': 'code', 'listParamID.shortName': 'shortName' })

  const trf_salary_1 = idParams.filter(idParam => idParam.code === 'trf_salary_1').map(idParam => idParam.payElID)
  const trf_salary_2 = idParams.filter(idParam => idParam.code === 'trf_salary_2').map(idParam => idParam.payElID)
  const trf_salary_3 = idParams.filter(idParam => idParam.code === 'trf_salary_3').map(idParam => idParam.payElID)
  const trf_salary_4 = idParams.filter(idParam => idParam.code === 'trf_salary_4').map(idParam => idParam.payElID)
  const trf_salary_5 = idParams.filter(idParam => idParam.code === 'trf_salary_5').map(idParam => idParam.payElID)
  const trf_salary_6 = idParams.filter(idParam => idParam.code === 'trf_salary_6').map(idParam => idParam.payElID)
  const trf_salary_7 = idParams.filter(idParam => idParam.code === 'trf_salary_7').map(idParam => idParam.payElID)
  const trf_salary_8 = idParams.filter(idParam => idParam.code === 'trf_salary_8').map(idParam => idParam.payElID)
  const trf_salary_9 = idParams.filter(idParam => idParam.code === 'trf_salary_9').map(idParam => idParam.payElID)
  const trf_salary_10 = idParams.filter(idParam => idParam.code === 'trf_salary_10').map(idParam => idParam.payElID)
  const trf_salary_11 = idParams.filter(idParam => idParam.code === 'trf_salary_11').map(idParam => idParam.payElID)
  const trf_salary_12 = idParams.filter(idParam => idParam.code === 'trf_salary_12').map(idParam => idParam.payElID)
  const trf_salary_13 = idParams.filter(idParam => idParam.code === 'trf_salary_13').map(idParam => idParam.payElID)
  const trf_salary_14 = idParams.filter(idParam => idParam.code === 'trf_salary_14').map(idParam => idParam.payElID)
  const trf_salary_15 = idParams.filter(idParam => idParam.code === 'trf_salary_15').map(idParam => idParam.payElID)
  const trf_salary_16 = idParams.filter(idParam => idParam.code === 'trf_salary_16').map(idParam => idParam.payElID)
  const trf_salary_17 = idParams.filter(idParam => idParam.code === 'trf_salary_17').map(idParam => idParam.payElID)
  const trf_salary_18 = idParams.filter(idParam => idParam.code === 'trf_salary_18').map(idParam => idParam.payElID)
  const trf_salary_19 = idParams.filter(idParam => idParam.code === 'trf_salary_19').map(idParam => idParam.payElID)
  const trf_salary_20 = idParams.filter(idParam => idParam.code === 'trf_salary_20').map(idParam => idParam.payElID)
  const trf_salary_21 = idParams.filter(idParam => idParam.code === 'trf_salary_21').map(idParam => idParam.payElID)
  const trf_salary_22 = idParams.filter(idParam => idParam.code === 'trf_salary_22').map(idParam => idParam.payElID)
  const trf_salary_23 = idParams.filter(idParam => idParam.code === 'trf_salary_23').map(idParam => idParam.payElID)
  const trf_salary_24 = idParams.filter(idParam => idParam.code === 'trf_salary_24').map(idParam => idParam.payElID)
  const trf_salary_25 = idParams.filter(idParam => idParam.code === 'trf_salary_25').map(idParam => idParam.payElID)
  const trf_salary_26 = idParams.filter(idParam => idParam.code === 'trf_salary_26').map(idParam => idParam.payElID)
  const trf_salary_27 = idParams.filter(idParam => idParam.code === 'trf_salary_27').map(idParam => idParam.payElID)
  const trf_salary_28 = idParams.filter(idParam => idParam.code === 'trf_salary_28').map(idParam => idParam.payElID)
  const trf_salary_29 = idParams.filter(idParam => idParam.code === 'trf_salary_29').map(idParam => idParam.payElID)
  const trf_salary_30 = idParams.filter(idParam => idParam.code === 'trf_salary_30').map(idParam => idParam.payElID)
  const trf_salary_31 = idParams.filter(idParam => idParam.code === 'trf_salary_31').map(idParam => idParam.payElID)
  const trf_salary_32 = idParams.filter(idParam => idParam.code === 'trf_salary_32').map(idParam => idParam.payElID)
  const trf_salary_33 = idParams.filter(idParam => idParam.code === 'trf_salary_33').map(idParam => idParam.payElID)
  const trf_salary_34 = idParams.filter(idParam => idParam.code === 'trf_salary_34').map(idParam => idParam.payElID)
  const trf_salary_35 = idParams.filter(idParam => idParam.code === 'trf_salary_35').map(idParam => idParam.payElID)
  const trf_salary_36 = idParams.filter(idParam => idParam.code === 'trf_salary_36').map(idParam => idParam.payElID)
  const trf_salary_37 = idParams.filter(idParam => idParam.code === 'trf_salary_37').map(idParam => idParam.payElID)
  const trf_salary_38 = idParams.filter(idParam => idParam.code === 'trf_salary_38').map(idParam => idParam.payElID)
  const trf_salary_39 = idParams.filter(idParam => idParam.code === 'trf_salary_39').map(idParam => idParam.payElID)
  const trf_salary_40 = idParams.filter(idParam => idParam.code === 'trf_salary_40').map(idParam => idParam.payElID)

  const reportParams = [trf_salary_1, trf_salary_2, trf_salary_3, trf_salary_4, trf_salary_5, trf_salary_6, trf_salary_7, trf_salary_8, trf_salary_9, trf_salary_10, trf_salary_11, trf_salary_12, trf_salary_13, trf_salary_14, trf_salary_15, trf_salary_16, trf_salary_17, trf_salary_18, trf_salary_19, trf_salary_20, trf_salary_21, trf_salary_22, trf_salary_23, trf_salary_24, trf_salary_25, trf_salary_26, trf_salary_27, trf_salary_28, trf_salary_29, trf_salary_30, trf_salary_31, trf_salary_32, trf_salary_33, trf_salary_34, trf_salary_35, trf_salary_36, trf_salary_37, trf_salary_38, trf_salary_39, trf_salary_40]

  const dictProgClassIDs = params.dictProgClassID.length ? params.dictProgClassID.split(',').map(o => Number(o)).sort() : null
  const dictFundSourceIDs = params.dictFundSourceID.length ? params.dictFundSourceID.split(',').map(o => Number(o)).sort() : null
  const departmentIDs = params.subDivision.length ? params.subDivision.split(',').map(o => Number(o)) : null

  const trfAccrualRequest = UB.Repository('trf_position')
    .attrs('sum([rate])', 'dictPositionID.dictStaffSubCatID', 'dictProgClassID')
    .where('workPlaceID.documentID.orgID', 'in', orgID)
    .where('workPlaceID.dateFrom', '<=', dateService.shiftDate(params.periodToDateTo))
    .where('workPlaceID.dateTo', '>=', dateService.shiftDate(params.periodFromDateFrom))
    .where('workPlaceID.documentID.type', '=', 'FACT')
    .where('workPlaceID.state', '=', 'POSTED')
    .where('workPlaceID.mi_deleteDate', '>=', '#maxdate', 'deleteDate')
    .where('mi_deleteDate', '>=', '#maxdate', 'deleteDate')
    .whereIf(dictFundSourceIDs, 'dictFundSourceID', 'in', dictFundSourceIDs)
    .whereIf(departmentIDs, 'workPlaceID.departmentID', 'in', departmentIDs)
    .groupBy(['dictPositionID.dictStaffSubCatID', 'dictProgClassID'])
    .selectAsObject({ 'sum([rate])': 'rate', 'dictPositionID.dictStaffSubCatID': 'dictStaffSubCatID' })

  const hrOrg = UB.Repository('hr_organization')
    .attrs('name', 'mi_data_id')
    .where('mi_data_id', 'in', orgID)
    .where('state', '=', 'ACTIVE')
    .misc({ __mip_ondate: dateService.shiftDate(params.currDate) })
    .orderBy('mi_dateFrom', 'desc')
    .selectAsObject({ mi_data_id: 'ID' })

  const dictStaffSubCatRequest = UB.Repository('hr_dictPosition')
    .attrs('dictStaffSubCatID', 'dictStaffSubCatID.name','dictStaffSubCatID.code')
    .where('mi_deleteDate', '>=', '#maxdate', 'deleteDate')
    .groupBy(['dictStaffSubCatID', 'dictStaffSubCatID.code','dictStaffSubCatID.name'])
    .selectAsObject({ 'dictStaffSubCatID.name': 'dictStaffSubCatName','dictStaffSubCatID.code': 'dictStaffSubCatCode' })

  const dictStaffSubCatPayment = UB.Repository('hr_accrualDt')
    .attrs('accrualID.mtCount', 'accrualID.dictPositionID.dictStaffSubCatID', 'dictProgClassID', 'dictProgClassID.code', 'accrualID.dictPositionID.dictStaffSubCatID.name', 'paySum')
    .where('accrualID.orgID', 'in', orgID)
    .where('accrualID.periodCalc', '>=', dateService.shiftDate(params.periodFromDateFrom))
    .where('accrualID.periodCalc', '<=', dateService.shiftDate(params.periodToDateTo))
    .where('accrualID.employeeNumberPartID', 'isNull', undefined)
    .where('accrualID.payElID.methodID.methodGroupID.groupType', '=', 'PAYMENT')
    .where('accrualID.payElID.methodID.code', 'in', ['147', '156', '146'])
    .whereIf(dictFundSourceIDs, 'dictFundSourceID', 'in', dictFundSourceIDs)
    .whereIf(departmentIDs, 'accrualID.employeeNumberID.employeePositionID.departmentID', 'in', departmentIDs)
    .selectAsObject({ 'dictProgClassID.code': 'dictProgClassCode', 'accrualID.dictPositionID.dictStaffSubCatID': 'dictStaffSubCatID', 'accrualID.dictPositionID.dictStaffSubCatID.name': 'dictStaffSubCatName', 'accrualID.mtCount': 'rate', 'paySum': 'accrualSum' })

  const arrEmpl = []
  UB.Repository('hr_accrualDt')
    .attrs('accrualID.employeeNumberID')
    .where('accrualID.orgID', 'in', orgID)
    .where('accrualID.periodCalc', '>=', dateService.shiftDate(params.periodFromDateFrom))
    .where('accrualID.periodCalc', '<=', dateService.shiftDate(params.periodToDateTo))
    .where('accrualID.employeeNumberPartID', 'isNull', undefined)
    //.where('accrualID.employeeNumberID.tabNum','in',['8'])
    .where('accrualID.payElID.methodID.methodGroupID.groupType', '=', 'PAYMENT')
    .whereIf(dictFundSourceIDs, 'dictFundSourceID', 'in', dictFundSourceIDs)
    .whereIf(departmentIDs, 'accrualID.employeeNumberID.employeePositionID.departmentID', 'in', departmentIDs)
    .selectAsArrayOfValues()
    .forEach(o => !arrEmpl.includes(o) && arrEmpl.push(o))

  const getDictStaffSubCat = UB.Repository('hr_employeePositionS')
    .attrs(['ID', 'employeeID', 'employeeNumberID', 'organizationID', 'dictPositionID.dictStaffSubCatID'])
    .where('employeeNumberID', 'in', arrEmpl)
    .orderBy('dateFrom')
    .selectAsObject({ 'dictPositionID.dictStaffSubCatID': 'dictStaffSubCatID' })

  let accrReport = reportParams.map((o, i) => {
    let result = null
    if (o.length) {
      const item = {
        [`trf_salary_${i + 1}`]: (i>2) ? UB.Repository('hr_accrualDt')
          .attrs('ID', 'paySum', 'accrualID.employeeNumberID', 'dictProgClassID', 'accrualID.dictPositionID.dictStaffSubCatID')
          .where('accrualID.orgID', 'in', orgID)
          .where('accrualID.payElID', 'in', o)
          .where('accrualID.periodCalc', '>=', dateService.shiftDate(params.periodFromDateFrom))
          .where('accrualID.periodCalc', '<=', dateService.shiftDate(params.periodToDateTo))
          .where('accrualID.employeeNumberPartID', 'isNull', undefined)
          //.where('accrualID.employeeNumberID.tabNum','in',['8'])
          .whereIf(dictFundSourceIDs, 'dictFundSourceID', 'in', dictFundSourceIDs)
          .whereIf(departmentIDs, 'employeeNumberID.employeePositionID.departmentID', 'in', departmentIDs)
          .selectAsObject({ 'paySum': 'accrualSum', 'accrualID.employeeNumberID': 'employeeNumberID', 'accrualID.dictPositionID.dictStaffSubCatID': 'dictStaffSubCatID' })
          :
          UB.Repository('trf_accrual')
          .attrs('accrualSum','positionID.workPlaceID.employeeNumberID','positionID.dictProgClassID','positionID.dictPositionID.dictStaffSubCatID')
          .where('positionID.workPlaceID.documentID.orgID', 'in', orgID)
          .where('payElID', 'in', o)
          .where('positionID.workPlaceID.dateFrom', '<=', dateService.shiftDate(params.periodToDateTo))
          .where('positionID.workPlaceID.dateTo', '>=', dateService.shiftDate(params.periodFromDateFrom))
          .where('positionID.workPlaceID.documentID.type', '=', 'FACT')
          .where('positionID.workPlaceID.state', '=', 'POSTED')
          .where('positionID.workPlaceID.mi_deleteDate', '>=', '#maxdate', 'deleteDate')
          .where('mi_deleteDate', '>=', '#maxdate', 'deleteDate')
          .whereIf(dictFundSourceIDs, 'positionID.dictFundSourceID', 'in', dictFundSourceIDs)
          .whereIf(departmentIDs, 'positionID.workPlaceID.departmentID', 'in', departmentIDs)
          .selectAsObject({ 'accrualSum': 'accrualSum', 'positionID.workPlaceID.employeeNumberID': 'employeeNumberID','positionID.dictProgClassID': 'dictProgClassID', 'positionID.dictPositionID.dictStaffSubCatID': 'dictStaffSubCatID' })
      }
      result = item //&& item.length ? item.filter(e=>e.employeeNumberID.tabNum === '4001' || e.employeeNumberID.tabNum === '8014') : item
    }
    return result
  })
  accrReport.forEach((o, i) => {
    if (o) {
      o[`trf_salary_${i + 1}`].forEach(k => {
        const findDictStaffSubCat = getDictStaffSubCat.find(s => s.employeeNumberID === k.employeeNumberID && s.dictStaffSubCatID)
        if (!k.dictStaffSubCatID && findDictStaffSubCat) {
          k.dictStaffSubCatID = findDictStaffSubCat.dictStaffSubCatID
        }
      })
    }
  })
  accrReport = accrReport.filter(o => o)

  function setPeriod (periodFromDateFrom, periodToDateTo) {
    const periodFrom = dateService.shiftDate(periodFromDateFrom)
    let periodTo = dateService.shiftDate(periodToDateTo)
    periodTo = periodToDateTo.getMonth() !== 11 && periodToDateTo.getFullYear() !== periodFromDateFrom.getFullYear() ? dateService.addMonths(periodFrom, 11 - periodFrom.getMonth()) : periodTo
    return `${dateService.formatDate(periodFrom, 'mmmm')} - ${dateService.formatDate(periodTo, 'mmmm')} ${dateService.formatDate(periodFrom, 'yyyy')} року`
  }
  function isRoundUpTo (array, col, roundUpTo) {
    const result = []
    array.forEach(o => {
      const obj = {}
      for (const prop in o) {
        o[prop] = o[prop] === 0 ? null : o[prop]
        if (o[prop] && ((prop.slice(0, 3) === col) || prop.slice(0, 4) === 'rate' || prop.slice(0, 4) === 'accr')) {
          obj[prop] = currencyService.formatAsCurrency(o[prop], Number(roundUpTo) || 4)
        } else {
          obj[prop] = o[prop]
        }
      }
      result.push(obj)
    })
    return result
  }
  function accrSum (arr, key) {
    //change pdv 24.10.2024
    const exists_subCat3 = arr.find(e => e.dictStaffSubCatCode === '3');
    const result = arr.reduce((acc, o) => {
      if (exists_subCat3)
      return acc + (Number(o[key]) && !['4','5'].includes(o.dictStaffSubCatCode) ? Number(o[key]) : 0)
      else
      return acc + (Number(o[key]) ? Number(o[key]) : 0)
    }, 0)
    // end
    return result !== 0 ? result : null
  }
  function setStaffSubCat (dictStaffSubCatRequest, dictStaffSubCat, trfPayment, accrReport) {
    if (dictStaffSubCatRequest && dictStaffSubCatRequest.length) {
      const groupPositionCategoryRequest = _.groupBy(dictStaffSubCatRequest, 'dictStaffSubCatID')
      const groupCategory345Request = dictStaffSubCatRequest.filter(e => e && e.dictStaffSubCatCode==='3'||e.dictStaffSubCatCode==='4'||e.dictStaffSubCatCode==='5')
      const positionRequestObjKey = Object.keys(groupPositionCategoryRequest).map(o => Number(o) ? Number(o) : null)
      const groupDictStaffSubCatPayment = _.groupBy(dictStaffSubCat, 'dictStaffSubCatID')
      const groupTrfAccrualRequest = _.groupBy(trfPayment, 'dictStaffSubCatID')
      const positionCategoryRequest = positionRequestObjKey.map(o => {
        let result = {}
        if (!o) {
          o = null
          groupPositionCategoryRequest[`${o}`].forEach(p => { p.dictStaffSubCatName = 'Не призначено' })
        }
        if (groupPositionCategoryRequest[o].length) {
          result.dictStaffSubCatID = o
          result.dictStaffSubCatName = groupPositionCategoryRequest[o][0].dictStaffSubCatName
          result.dictStaffSubCatCode = dictStaffSubCatRequest.find(e => e.dictStaffSubCatID === o).dictStaffSubCatCode
          if (groupCategory345Request && groupCategory345Request.length && groupCategory345Request.filter(e => e.dictStaffSubCatID === o && e.dictStaffSubCatCode === '3').length) {
            result.accrualSum = 0;
            result.rate = 0;
            groupCategory345Request.forEach(e => {
              const res = groupDictStaffSubCatPayment[e.dictStaffSubCatID] && groupDictStaffSubCatPayment[e.dictStaffSubCatID].length ? groupDictStaffSubCatPayment[e.dictStaffSubCatID].reduce((acc, ob) => acc + ob.accrualSum, 0) : 0
              result.accrualSum = result.accrualSum + res
              const add = groupTrfAccrualRequest[e.dictStaffSubCatID] && groupTrfAccrualRequest[e.dictStaffSubCatID].length ? groupTrfAccrualRequest[e.dictStaffSubCatID].reduce((acc, cur) => acc + cur.rate, 0) : 0
              result.rate = result.rate + add
            })
            
          } else {
            result.accrualSum = groupDictStaffSubCatPayment[o] && groupDictStaffSubCatPayment[o].length ? groupDictStaffSubCatPayment[o].reduce((acc, o) => acc + o.accrualSum, 0) : 0
            result.rate = groupTrfAccrualRequest[o] && groupTrfAccrualRequest[o].length ? groupTrfAccrualRequest[o].reduce((acc, cur) => acc + cur.rate, 0) : 0
          }
        }
        return result
      })

      if (positionCategoryRequest.length) {
        positionCategoryRequest.forEach(o => {
          o.trf_10_11_12 = null
          o.trf_salary_sum_23_26 = null
          o.trf_salary_sum_27_30 = null
          o.trf_salary_sum_31_34 = null
          o.trf_salary_sum_16_17_19 = null
          o.trf_salary_sum_20_21 = null
          o.trf_salary_sum_10_13_14_18_27_30 = null
          o.trf_salary_sum_4_9_15_23_26_35_36 = null
          o.trf_salary_sum_total = null
          const specCat = groupCategory345Request && groupCategory345Request.length && groupCategory345Request.filter(e => e.dictStaffSubCatID === o.dictStaffSubCatID && e.dictStaffSubCatCode === '3').length


          accrReport.forEach(n => {
            switch (Object.keys(n)[0]) {
              case 'trf_salary_1':
                if (specCat && n.trf_salary_1.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID)).length) {
                  const array = n.trf_salary_1.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID))
                  o.trf_salary_1 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  //o.trf_salary_sum_total += o.trf_salary_1 ? o.trf_salary_1 : null
                } else
                if (n.trf_salary_1.length && n.trf_salary_1.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID).length) {
                  const array = n.trf_salary_1.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID)
                  o.trf_salary_1 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  //o.trf_salary_sum_total += o.trf_salary_1 ? o.trf_salary_1 : null
                }
                break
              case 'trf_salary_2':
                if (specCat && n.trf_salary_2.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID)).length) {
                  const array = n.trf_salary_2.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID))
                  o.trf_salary_2 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  //o.trf_salary_sum_total += o.trf_salary_2 ? o.trf_salary_2 : null
                } else
                if (n.trf_salary_2.length && n.trf_salary_2.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID).length) {
                  const array = n.trf_salary_2.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID)
                  o.trf_salary_2 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  //o.trf_salary_sum_total += o.trf_salary_2 ? o.trf_salary_2 : null
                }
                break
              case 'trf_salary_3':
                if (specCat && n.trf_salary_3.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID)).length) {
                  const array = n.trf_salary_3.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID))
                  o.trf_salary_3 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  //o.trf_salary_sum_total += o.trf_salary_3 ? o.trf_salary_3 : null
                } else
                if (n.trf_salary_3.length && n.trf_salary_3.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID).length) {
                  const array = n.trf_salary_3.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID)
                  o.trf_salary_3 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  //o.trf_salary_sum_total += o.trf_salary_3 ? o.trf_salary_3 : null
                }
                break
              case 'trf_salary_4':
                if (specCat && n.trf_salary_4.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID)).length) {
                  const array = n.trf_salary_4.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID))
                  o.trf_salary_4 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_salary_sum_4_9_15_23_26_35_36 += o.trf_salary_4 ? o.trf_salary_4 : null
                  o.trf_salary_sum_total += o.trf_salary_4 ? o.trf_salary_4 : null
                } else
                if (n.trf_salary_4.length && n.trf_salary_4.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID).length) {
                  const array = n.trf_salary_4.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID)
                  o.trf_salary_4 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_salary_sum_4_9_15_23_26_35_36 += o.trf_salary_4 ? o.trf_salary_4 : null
                  o.trf_salary_sum_total += o.trf_salary_4 ? o.trf_salary_4 : null
                }
                break
              case 'trf_salary_5':
                if (specCat && n.trf_salary_5.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID)).length) {
                  const array = n.trf_salary_5.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID))
                  o.trf_salary_5 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_salary_sum_4_9_15_23_26_35_36 += o.trf_salary_5 ? o.trf_salary_5 : null
                  o.trf_salary_sum_total += o.trf_salary_5 ? o.trf_salary_5 : null
                } else
                if (n.trf_salary_5.length && n.trf_salary_5.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID).length) {
                  const array = n.trf_salary_5.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID)
                  o.trf_salary_5 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_salary_sum_4_9_15_23_26_35_36 += o.trf_salary_5 ? o.trf_salary_5 : null
                  o.trf_salary_sum_total += o.trf_salary_5 ? o.trf_salary_5 : null
                }
                break
              case 'trf_salary_6':
                if (specCat && n.trf_salary_6.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID)).length) {
                  const array = n.trf_salary_6.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID))
                  o.trf_salary_6 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_salary_sum_4_9_15_23_26_35_36 += o.trf_salary_6 ? o.trf_salary_6 : null
                  o.trf_salary_sum_total += o.trf_salary_6 ? o.trf_salary_6 : null
                } else
                if (n.trf_salary_6.length && n.trf_salary_6.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID).length) {
                  const array = n.trf_salary_6.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID)
                  o.trf_salary_6 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_salary_sum_4_9_15_23_26_35_36 += o.trf_salary_6 ? o.trf_salary_6 : null
                  o.trf_salary_sum_total += o.trf_salary_6 ? o.trf_salary_6 : null
                }
                break
              case 'trf_salary_7':
                if (specCat && n.trf_salary_7.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID)).length) {
                  const array = n.trf_salary_7.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID))
                  o.trf_salary_7 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_salary_sum_4_9_15_23_26_35_36 += o.trf_salary_7 ? o.trf_salary_7 : null
                  o.trf_salary_sum_total += o.trf_salary_7 ? o.trf_salary_7 : null
                } else
                if (n.trf_salary_7.length && n.trf_salary_7.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID).length) {
                  const array = n.trf_salary_7.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID)
                  o.trf_salary_7 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_salary_sum_4_9_15_23_26_35_36 += o.trf_salary_7 ? o.trf_salary_7 : null
                  o.trf_salary_sum_total += o.trf_salary_7 ? o.trf_salary_7 : null
                }
                break
              case 'trf_salary_8':
                if (specCat && n.trf_salary_8.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID)).length) {
                  const array = n.trf_salary_8.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID))
                  o.trf_salary_8 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_salary_sum_4_9_15_23_26_35_36 += o.trf_salary_8 ? o.trf_salary_8 : null
                  o.trf_salary_sum_total += o.trf_salary_8 ? o.trf_salary_8 : null
                } else
                if (n.trf_salary_8.length && n.trf_salary_8.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID).length) {
                  const array = n.trf_salary_8.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID)
                  o.trf_salary_8 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_salary_sum_4_9_15_23_26_35_36 += o.trf_salary_8 ? o.trf_salary_8 : null
                  o.trf_salary_sum_total += o.trf_salary_8 ? o.trf_salary_8 : null
                }
                break
              case 'trf_salary_9':
                if (specCat && n.trf_salary_9.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID)).length) {
                  const array = n.trf_salary_9.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID))
                  o.trf_salary_9 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_salary_sum_4_9_15_23_26_35_36 += o.trf_salary_9 ? o.trf_salary_9 : null
                  o.trf_salary_sum_total += o.trf_salary_9 ? o.trf_salary_9 : null
                } else
                if (n.trf_salary_9.length && n.trf_salary_9.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID).length) {
                  const array = n.trf_salary_9.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID)
                  o.trf_salary_9 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_salary_sum_4_9_15_23_26_35_36 += o.trf_salary_9 ? o.trf_salary_9 : null
                  o.trf_salary_sum_total += o.trf_salary_9 ? o.trf_salary_9 : null
                }
                break
              case 'trf_salary_10':
                if (specCat && n.trf_salary_10.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID)).length) {
                  const array = n.trf_salary_10.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID))
                  o.trf_salary_10 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_10_11_12 += o.trf_salary_10 ? o.trf_salary_10 : null
                  o.trf_salary_sum_10_13_14_18_27_30 += o.trf_salary_10 ? o.trf_salary_10 : null
                  o.trf_salary_sum_total += o.trf_salary_10 ? o.trf_salary_10 : null
                } else
                if (n.trf_salary_10.length && n.trf_salary_10.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID).length) {
                  const array = n.trf_salary_10.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID)
                  o.trf_salary_10 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_10_11_12 += o.trf_salary_10 ? o.trf_salary_10 : null
                  o.trf_salary_sum_10_13_14_18_27_30 += o.trf_salary_10 ? o.trf_salary_10 : null
                  o.trf_salary_sum_total += o.trf_salary_10 ? o.trf_salary_10 : null
                }
                break
              case 'trf_salary_11':
                if (specCat && n.trf_salary_11.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID)).length) {
                  const array = n.trf_salary_11.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID))
                  o.trf_salary_11 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_10_11_12 += o.trf_salary_11 ? o.trf_salary_11 : null
                  o.trf_salary_sum_total += o.trf_salary_11 ? o.trf_salary_11 : null
                } else
                if (n.trf_salary_11.length && n.trf_salary_11.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID).length) {
                  const array = n.trf_salary_11.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID)
                  o.trf_salary_11 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_10_11_12 += o.trf_salary_11 ? o.trf_salary_11 : null
                  o.trf_salary_sum_total += o.trf_salary_11 ? o.trf_salary_11 : null
                }
                break
              case 'trf_salary_12':
                if (specCat && n.trf_salary_12.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID)).length) {
                  const array = n.trf_salary_12.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID))
                  o.trf_salary_12 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_10_11_12 += o.trf_salary_12 ? o.trf_salary_12 : null
                  o.trf_salary_sum_total += o.trf_salary_12 ? o.trf_salary_12 : null
                } else
                if (n.trf_salary_12.length && n.trf_salary_12.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID).length) {
                  const array = n.trf_salary_12.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID)
                  o.trf_salary_12 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_10_11_12 += o.trf_salary_12 ? o.trf_salary_12 : null
                  o.trf_salary_sum_total += o.trf_salary_12 ? o.trf_salary_12 : null
                }
                break
              case 'trf_salary_13':
                if (specCat && n.trf_salary_13.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID)).length) {
                  const array = n.trf_salary_13.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID))
                  o.trf_salary_13 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_salary_sum_10_13_14_18_27_30 += o.trf_salary_13 ? o.trf_salary_13 : null
                  o.trf_salary_sum_total += o.trf_salary_13 ? o.trf_salary_13 : null
                } else
                if (n.trf_salary_13.length && n.trf_salary_13.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID).length) {
                  const array = n.trf_salary_13.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID)
                  o.trf_salary_13 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_salary_sum_10_13_14_18_27_30 += o.trf_salary_13 ? o.trf_salary_13 : null
                  o.trf_salary_sum_total += o.trf_salary_13 ? o.trf_salary_13 : null
                }
                break
              case 'trf_salary_14':
                if (specCat && n.trf_salary_14.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID)).length) {
                  const array = n.trf_salary_14.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID))
                  o.trf_salary_14 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_salary_sum_10_13_14_18_27_30 += o.trf_salary_14 ? o.trf_salary_14 : null
                  o.trf_salary_sum_total += o.trf_salary_14 ? o.trf_salary_14 : null
                } else
                if (n.trf_salary_14.length && n.trf_salary_14.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID).length) {
                  const array = n.trf_salary_14.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID)
                  o.trf_salary_14 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_salary_sum_10_13_14_18_27_30 += o.trf_salary_14 ? o.trf_salary_14 : null
                  o.trf_salary_sum_total += o.trf_salary_14 ? o.trf_salary_14 : null
                }
                break
              case 'trf_salary_15':
                if (specCat && n.trf_salary_15.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID)).length) {
                  const array = n.trf_salary_15.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID))
                  o.trf_salary_15 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_salary_sum_4_9_15_23_26_35_36 += o.trf_salary_15 ? o.trf_salary_15 : null
                  o.trf_salary_sum_total += o.trf_salary_15 ? o.trf_salary_15 : null
                } else
                if (n.trf_salary_15.length && n.trf_salary_15.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID).length) {
                  const array = n.trf_salary_15.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID)
                  o.trf_salary_15 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_salary_sum_4_9_15_23_26_35_36 += o.trf_salary_15 ? o.trf_salary_15 : null
                  o.trf_salary_sum_total += o.trf_salary_15 ? o.trf_salary_15 : null
                }
                break
              case 'trf_salary_16':
                if (specCat && n.trf_salary_16.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID)).length) {
                  const array = n.trf_salary_16.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID))
                  o.trf_salary_16 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_salary_sum_16_17_19 += o.trf_salary_16 ? o.trf_salary_16 : null
                  o.trf_salary_sum_total += o.trf_salary_16 ? o.trf_salary_16 : null
                } else
                if (n.trf_salary_16.length && n.trf_salary_16.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID).length) {
                  const array = n.trf_salary_16.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID)
                  o.trf_salary_16 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_salary_sum_16_17_19 += o.trf_salary_16 ? o.trf_salary_16 : null
                  o.trf_salary_sum_total += o.trf_salary_16 ? o.trf_salary_16 : null
                }
                break
              case 'trf_salary_17':
                if (specCat && n.trf_salary_17.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID)).length) {
                  const array = n.trf_salary_17.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID))
                  o.trf_salary_17 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_salary_sum_16_17_19 += o.trf_salary_17 ? o.trf_salary_17 : null
                  o.trf_salary_sum_total += o.trf_salary_17 ? o.trf_salary_17 : null
                } else
                if (n.trf_salary_17.length && n.trf_salary_17.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID).length) {
                  const array = n.trf_salary_17.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID)
                  o.trf_salary_17 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_salary_sum_16_17_19 += o.trf_salary_17 ? o.trf_salary_17 : null
                  o.trf_salary_sum_total += o.trf_salary_17 ? o.trf_salary_17 : null
                }
                break
              case 'trf_salary_18':
                if (specCat && n.trf_salary_18.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID)).length) {
                  const array = n.trf_salary_18.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID))
                  o.trf_salary_18 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_salary_sum_10_13_14_18_27_30 += o.trf_salary_18 ? o.trf_salary_18 : null
                  o.trf_salary_sum_total += o.trf_salary_18 ? o.trf_salary_18 : null
                } else
                if (n.trf_salary_18.length && n.trf_salary_18.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID).length) {
                  const array = n.trf_salary_18.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID)
                  o.trf_salary_18 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_salary_sum_10_13_14_18_27_30 += o.trf_salary_18 ? o.trf_salary_18 : null
                  o.trf_salary_sum_total += o.trf_salary_18 ? o.trf_salary_18 : null
                }
                break
              case 'trf_salary_19':
                if (specCat && n.trf_salary_19.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID)).length) {
                  const array = n.trf_salary_19.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID))
                  o.trf_salary_19 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_salary_sum_16_17_19 += o.trf_salary_19 ? o.trf_salary_19 : null
                  o.trf_salary_sum_total += o.trf_salary_19 ? o.trf_salary_19 : null
                } else
                if (n.trf_salary_19.length && n.trf_salary_19.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID).length) {
                  const array = n.trf_salary_19.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID)
                  o.trf_salary_19 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_salary_sum_16_17_19 += o.trf_salary_19 ? o.trf_salary_19 : null
                  o.trf_salary_sum_total += o.trf_salary_19 ? o.trf_salary_19 : null
                }
                break
              case 'trf_salary_20':
                if (specCat && n.trf_salary_20.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID)).length) {
                  const array = n.trf_salary_20.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID))
                  o.trf_salary_20 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_salary_sum_20_21 += o.trf_salary_20 ? o.trf_salary_20 : null
                  o.trf_salary_sum_total += o.trf_salary_20 ? o.trf_salary_20 : null
                } else
                if (n.trf_salary_20.length && n.trf_salary_20.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID).length) {
                  const array = n.trf_salary_20.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID)
                  o.trf_salary_20 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_salary_sum_20_21 += o.trf_salary_20 ? o.trf_salary_20 : null
                  o.trf_salary_sum_total += o.trf_salary_20 ? o.trf_salary_20 : null
                }
                break
              case 'trf_salary_21':
                if (specCat && n.trf_salary_21.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID)).length) {
                  const array = n.trf_salary_21.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID))
                  o.trf_salary_21 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_salary_sum_20_21 += o.trf_salary_21 ? o.trf_salary_21 : null
                  o.trf_salary_sum_total += o.trf_salary_21 ? o.trf_salary_21 : null
                } else
                if (n.trf_salary_21.length && n.trf_salary_21.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID).length) {
                  const array = n.trf_salary_21.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID)
                  o.trf_salary_21 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_salary_sum_20_21 += o.trf_salary_21 ? o.trf_salary_21 : null
                  o.trf_salary_sum_total += o.trf_salary_21 ? o.trf_salary_21 : null
                }
                break
              case 'trf_salary_22':
                if (specCat && n.trf_salary_22.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID)).length) {
                  const array = n.trf_salary_22.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID))
                  o.trf_salary_22 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_salary_sum_total += o.trf_salary_22 ? o.trf_salary_22 : null
                } else
                if (n.trf_salary_22.length && n.trf_salary_22.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID).length) {
                  const array = n.trf_salary_22.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID)
                  o.trf_salary_22 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_salary_sum_total += o.trf_salary_22 ? o.trf_salary_22 : null
                }
                break
              case 'trf_salary_23':
                if (specCat && n.trf_salary_23.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID)).length) {
                  const array = n.trf_salary_23.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID))
                  o.trf_salary_23 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_salary_sum_23_26 += o.trf_salary_23 ? o.trf_salary_23 : null
                  o.trf_salary_sum_4_9_15_23_26_35_36 += o.trf_salary_23 ? o.trf_salary_23 : null
                  o.trf_salary_sum_total += o.trf_salary_23 ? o.trf_salary_23 : null
                } else
                if (n.trf_salary_23.length && n.trf_salary_23.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID).length) {
                  const array = n.trf_salary_23.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID)
                  o.trf_salary_23 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_salary_sum_23_26 += o.trf_salary_23 ? o.trf_salary_23 : null
                  o.trf_salary_sum_4_9_15_23_26_35_36 += o.trf_salary_23 ? o.trf_salary_23 : null
                  o.trf_salary_sum_total += o.trf_salary_23 ? o.trf_salary_23 : null
                }
                break
              case 'trf_salary_24':
                if (specCat && n.trf_salary_24.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID)).length) {
                  const array = n.trf_salary_24.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID))
                  o.trf_salary_24 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_salary_sum_23_26 += o.trf_salary_24 ? o.trf_salary_24 : null
                  o.trf_salary_sum_4_9_15_23_26_35_36 += o.trf_salary_24 ? o.trf_salary_24 : null
                  o.trf_salary_sum_total += o.trf_salary_24 ? o.trf_salary_24 : null
                } else
                if (n.trf_salary_24.length && n.trf_salary_24.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID).length) {
                  const array = n.trf_salary_24.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID)
                  o.trf_salary_24 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_salary_sum_23_26 += o.trf_salary_24 ? o.trf_salary_24 : null
                  o.trf_salary_sum_4_9_15_23_26_35_36 += o.trf_salary_24 ? o.trf_salary_24 : null
                  o.trf_salary_sum_total += o.trf_salary_24 ? o.trf_salary_24 : null
                }
                break
              case 'trf_salary_25':
                if (specCat && n.trf_salary_25.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID)).length) {
                  const array = n.trf_salary_25.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID))
                  o.trf_salary_25 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_salary_sum_23_26 += o.trf_salary_25 ? o.trf_salary_25 : null
                  o.trf_salary_sum_4_9_15_23_26_35_36 += o.trf_salary_25 ? o.trf_salary_25 : null
                  o.trf_salary_sum_total += o.trf_salary_25 ? o.trf_salary_25 : null
                } else
                if (n.trf_salary_25.length && n.trf_salary_25.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID).length) {
                  const array = n.trf_salary_25.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID)
                  o.trf_salary_25 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_salary_sum_23_26 += o.trf_salary_25 ? o.trf_salary_25 : null
                  o.trf_salary_sum_4_9_15_23_26_35_36 += o.trf_salary_25 ? o.trf_salary_25 : null
                  o.trf_salary_sum_total += o.trf_salary_25 ? o.trf_salary_25 : null
                }
                break
              case 'trf_salary_26':
                if (specCat && n.trf_salary_26.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID)).length) {
                  const array = n.trf_salary_26.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID))
                  o.trf_salary_26 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_salary_sum_23_26 += o.trf_salary_26 ? o.trf_salary_26 : null
                  o.trf_salary_sum_4_9_15_23_26_35_36 += o.trf_salary_26 ? o.trf_salary_26 : null
                  o.trf_salary_sum_total += o.trf_salary_26 ? o.trf_salary_26 : null
                } else
                if (n.trf_salary_26.length && n.trf_salary_26.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID).length) {
                  const array = n.trf_salary_26.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID)
                  o.trf_salary_26 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_salary_sum_23_26 += o.trf_salary_26 ? o.trf_salary_26 : null
                  o.trf_salary_sum_4_9_15_23_26_35_36 += o.trf_salary_26 ? o.trf_salary_26 : null
                  o.trf_salary_sum_total += o.trf_salary_26 ? o.trf_salary_26 : null
                }
                break
              case 'trf_salary_27':
                if (specCat && n.trf_salary_27.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID)).length) {
                  const array = n.trf_salary_27.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID))
                  o.trf_salary_27 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_salary_sum_27_30 += o.trf_salary_27 ? o.trf_salary_27 : null
                  o.trf_salary_sum_10_13_14_18_27_30 += o.trf_salary_27 ? o.trf_salary_27 : null
                  o.trf_salary_sum_total += o.trf_salary_27 ? o.trf_salary_27 : null
                } else
                if (n.trf_salary_27.length && n.trf_salary_27.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID).length) {
                  const array = n.trf_salary_27.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID)
                  o.trf_salary_27 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_salary_sum_27_30 += o.trf_salary_27 ? o.trf_salary_27 : null
                  o.trf_salary_sum_10_13_14_18_27_30 += o.trf_salary_27 ? o.trf_salary_27 : null
                  o.trf_salary_sum_total += o.trf_salary_27 ? o.trf_salary_27 : null
                }
                break
              case 'trf_salary_28':
                if (specCat && n.trf_salary_28.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID)).length) {
                  const array = n.trf_salary_28.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID))
                  o.trf_salary_28 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_salary_sum_27_30 += o.trf_salary_28 ? o.trf_salary_28 : null
                  o.trf_salary_sum_10_13_14_18_27_30 += o.trf_salary_28 ? o.trf_salary_28 : null
                  o.trf_salary_sum_total += o.trf_salary_28 ? o.trf_salary_28 : null
                } else
                if (n.trf_salary_28.length && n.trf_salary_28.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID).length) {
                  const array = n.trf_salary_28.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID)
                  o.trf_salary_28 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_salary_sum_27_30 += o.trf_salary_28 ? o.trf_salary_28 : null
                  o.trf_salary_sum_10_13_14_18_27_30 += o.trf_salary_28 ? o.trf_salary_28 : null
                  o.trf_salary_sum_total += o.trf_salary_28 ? o.trf_salary_28 : null
                }
                break
              case 'trf_salary_29':
                if (specCat && n.trf_salary_29.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID)).length) {
                  const array = n.trf_salary_29.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID))
                  o.trf_salary_29 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_salary_sum_27_30 += o.trf_salary_29 ? o.trf_salary_29 : null
                  o.trf_salary_sum_10_13_14_18_27_30 += o.trf_salary_29 ? o.trf_salary_29 : null
                  o.trf_salary_sum_total += o.trf_salary_29 ? o.trf_salary_29 : null
                } else
                if (n.trf_salary_29.length && n.trf_salary_29.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID).length) {
                  const array = n.trf_salary_29.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID)
                  o.trf_salary_29 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_salary_sum_27_30 += o.trf_salary_29 ? o.trf_salary_29 : null
                  o.trf_salary_sum_10_13_14_18_27_30 += o.trf_salary_29 ? o.trf_salary_29 : null
                  o.trf_salary_sum_total += o.trf_salary_29 ? o.trf_salary_29 : null
                }
                break
              case 'trf_salary_30':
                if (specCat && n.trf_salary_30.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID)).length) {
                  const array = n.trf_salary_30.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID))
                  o.trf_salary_30 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_salary_sum_27_30 += o.trf_salary_30 ? o.trf_salary_30 : null
                  o.trf_salary_sum_10_13_14_18_27_30 += o.trf_salary_30 ? o.trf_salary_30 : null
                  o.trf_salary_sum_total += o.trf_salary_30 ? o.trf_salary_30 : null
                } else
                if (n.trf_salary_30.length && n.trf_salary_30.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID).length) {
                  const array = n.trf_salary_30.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID)
                  o.trf_salary_30 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_salary_sum_27_30 += o.trf_salary_30 ? o.trf_salary_30 : null
                  o.trf_salary_sum_10_13_14_18_27_30 += o.trf_salary_30 ? o.trf_salary_30 : null
                  o.trf_salary_sum_total += o.trf_salary_30 ? o.trf_salary_30 : null
                }
                break
              case 'trf_salary_31':
                if (specCat && n.trf_salary_31.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID)).length) {
                  const array = n.trf_salary_31.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID))
                  o.trf_salary_31 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_salary_sum_31_34 += o.trf_salary_31 ? o.trf_salary_31 : null
                  o.trf_salary_sum_total += o.trf_salary_31 ? o.trf_salary_31 : null
                } else
                if (n.trf_salary_31.length && n.trf_salary_31.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID).length) {
                  const array = n.trf_salary_31.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID)
                  o.trf_salary_31 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_salary_sum_31_34 += o.trf_salary_31 ? o.trf_salary_31 : null
                  o.trf_salary_sum_total += o.trf_salary_31 ? o.trf_salary_31 : null
                }
                break
              case 'trf_salary_32':
                if (specCat && n.trf_salary_32.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID)).length) {
                  const array = n.trf_salary_32.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID))
                  o.trf_salary_32 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_salary_sum_31_34 += o.trf_salary_32 ? o.trf_salary_32 : null
                  o.trf_salary_sum_total += o.trf_salary_32 ? o.trf_salary_32 : null
                } else
                if (n.trf_salary_32.length && n.trf_salary_32.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID).length) {
                  const array = n.trf_salary_32.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID)
                  o.trf_salary_32 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_salary_sum_31_34 += o.trf_salary_32 ? o.trf_salary_32 : null
                  o.trf_salary_sum_total += o.trf_salary_32 ? o.trf_salary_32 : null
                }
                break
              case 'trf_salary_33':
                if (specCat && n.trf_salary_33.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID)).length) {
                  const array = n.trf_salary_33.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID))
                  o.trf_salary_33 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_salary_sum_31_34 += o.trf_salary_33 ? o.trf_salary_33 : null
                  o.trf_salary_sum_total += o.trf_salary_33 ? o.trf_salary_33 : null
                } else
                if (n.trf_salary_33.length && n.trf_salary_33.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID).length) {
                  const array = n.trf_salary_33.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID)
                  o.trf_salary_33 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_salary_sum_31_34 += o.trf_salary_33 ? o.trf_salary_33 : null
                  o.trf_salary_sum_total += o.trf_salary_33 ? o.trf_salary_33 : null
                }
                break
              case 'trf_salary_34':
                if (specCat && n.trf_salary_34.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID)).length) {
                  const array = n.trf_salary_34.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID))
                  o.trf_salary_34 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_salary_sum_31_34 += o.trf_salary_34 ? o.trf_salary_34 : null
                  o.trf_salary_sum_total += o.trf_salary_34 ? o.trf_salary_34 : null
                } else
                if (n.trf_salary_34.length && n.trf_salary_34.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID).length) {
                  const array = n.trf_salary_34.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID)
                  o.trf_salary_34 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_salary_sum_31_34 += o.trf_salary_34 ? o.trf_salary_34 : null
                  o.trf_salary_sum_total += o.trf_salary_34 ? o.trf_salary_34 : null
                }
                break
              case 'trf_salary_35':
                if (specCat && n.trf_salary_35.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID)).length) {
                  const array = n.trf_salary_35.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID))
                  o.trf_salary_35= array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_salary_sum_4_9_15_23_26_35_36 += o.trf_salary_35 ? o.trf_salary_35 : null
                  o.trf_salary_sum_total += o.trf_salary_35 ? o.trf_salary_35 : null
                } else
                if (n.trf_salary_35.length && n.trf_salary_35.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID).length) {
                  const array = n.trf_salary_35.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID)
                  o.trf_salary_35 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_salary_sum_4_9_15_23_26_35_36 += o.trf_salary_35 ? o.trf_salary_35 : null
                  o.trf_salary_sum_total += o.trf_salary_35 ? o.trf_salary_35 : null
                }
                break
              case 'trf_salary_36':
                if (specCat && n.trf_salary_36.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID)).length) {
                  const array = n.trf_salary_36.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID))
                  o.trf_salary_36 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_salary_sum_4_9_15_23_26_35_36 += o.trf_salary_36 ? o.trf_salary_36 : null
                  o.trf_salary_sum_total += o.trf_salary_36 ? o.trf_salary_36 : null
                } else
                if (n.trf_salary_36.length && n.trf_salary_36.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID).length) {
                  const array = n.trf_salary_36.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID)
                  o.trf_salary_36 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_salary_sum_4_9_15_23_26_35_36 += o.trf_salary_36 ? o.trf_salary_36 : null
                  o.trf_salary_sum_total += o.trf_salary_36 ? o.trf_salary_36 : null
                }
                break
              case 'trf_salary_37':
                if (specCat && n.trf_salary_37.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID)).length) {
                  const array = n.trf_salary_37.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID))
                  o.trf_salary_37 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_salary_sum_total += o.trf_salary_37 ? o.trf_salary_37 : null
                } else
                if (n.trf_salary_37.length && n.trf_salary_37.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID).length) {
                  const array = n.trf_salary_37.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID)
                  o.trf_salary_37 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_salary_sum_total += o.trf_salary_37 ? o.trf_salary_37 : null
                }
                break
                case 'trf_salary_38':
                  if (specCat && n.trf_salary_38.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID)).length) {
                    const array = n.trf_salary_38.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID))
                    o.trf_salary_38 = array.reduce((sum, current) => {
                      return sum + current.accrualSum
                    }, 0)
                    o.trf_salary_sum_4_9_15_23_26_35_36 += o.trf_salary_38 ? o.trf_salary_38 : null
                    o.trf_salary_sum_total += o.trf_salary_38 ? o.trf_salary_38 : null
                  } else
                if (n.trf_salary_38.length && n.trf_salary_38.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID).length)  {
                  const array = n.trf_salary_38.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID)
                  o.trf_salary_38 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_salary_sum_4_9_15_23_26_35_36 += o.trf_salary_38 ? o.trf_salary_38 : null
                  o.trf_salary_sum_total += o.trf_salary_38 ? o.trf_salary_38 : null
                }
                break
                case 'trf_salary_39':
                  if (specCat && n.trf_salary_39.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID)).length) {
                    const array = n.trf_salary_39.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID))
                    o.trf_salary_39 = array.reduce((sum, current) => {
                      return sum + current.accrualSum
                    }, 0)
                    o.trf_salary_sum_4_9_15_23_26_35_36 += o.trf_salary_39 ? o.trf_salary_39 : null
                    o.trf_salary_sum_total += o.trf_salary_39 ? o.trf_salary_39 : null
                  } else
                if (n.trf_salary_39.length && n.trf_salary_39.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID).length)  {
                  const array = n.trf_salary_39.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID)
                  o.trf_salary_39 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  o.trf_salary_sum_4_9_15_23_26_35_36 += o.trf_salary_39 ? o.trf_salary_39 : null
                  o.trf_salary_sum_total += o.trf_salary_39 ? o.trf_salary_39 : null
                }
                break
                case 'trf_salary_40':
                if (specCat && n.trf_salary_40.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID)).length) {
                  const array = n.trf_salary_40.filter(a => groupCategory345Request.map(e => e.dictStaffSubCatID).includes(a.dictStaffSubCatID))
                  o.trf_salary_40 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  //o.accrualSum = o.trf_salary_40? o.trf_salary_40:0;
                  o.trf_salary_sum_total += o.trf_salary_40 ? o.trf_salary_40 : null
                } else
                if (n.trf_salary_40.length && n.trf_salary_40.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID).length)  {
                  const array = n.trf_salary_40.filter(a => a.dictStaffSubCatID === o.dictStaffSubCatID)
                  o.trf_salary_40 = array.reduce((sum, current) => {
                    return sum + current.accrualSum
                  }, 0)
                  //o.accrualSum = o.trf_salary_40? o.trf_salary_40:0;
                  o.trf_salary_sum_total += o.trf_salary_40 ? o.trf_salary_40 : null
                }
                break
            }
          })
        })
        positionCategoryRequest.sort((a, b) => a.dictStaffSubCatID - b.dictStaffSubCatID)
      }

      return positionCategoryRequest
    }
  }
  function setTotalAccr (positionCategoryRequest) {
    let totalAccr = [{
      totalRate: accrSum(positionCategoryRequest, 'rate'),
      totalPosRate: accrSum(positionCategoryRequest, 'accrualSum'),
      totalTrf_salary_1: accrSum(positionCategoryRequest, 'trf_salary_1'),
      totalTrf_salary_2: accrSum(positionCategoryRequest, 'trf_salary_2'),
      totalTrf_salary_3: accrSum(positionCategoryRequest, 'trf_salary_3'),
      totalTrf_salary_4: accrSum(positionCategoryRequest, 'trf_salary_4'),
      totalTrf_salary_5: accrSum(positionCategoryRequest, 'trf_salary_5'),
      totalTrf_salary_6: accrSum(positionCategoryRequest, 'trf_salary_6'),
      totalTrf_salary_7: accrSum(positionCategoryRequest, 'trf_salary_7'),
      totalTrf_salary_8: accrSum(positionCategoryRequest, 'trf_salary_8'),
      totalTrf_salary_9: accrSum(positionCategoryRequest, 'trf_salary_9'),
      totalTrf_salary_10: accrSum(positionCategoryRequest, 'trf_salary_10'),
      totalTrf_salary_11: accrSum(positionCategoryRequest, 'trf_salary_11'),
      totalTrf_salary_12: accrSum(positionCategoryRequest, 'trf_salary_12'),
      totalTrf_salary_13: accrSum(positionCategoryRequest, 'trf_salary_13'),
      totalTrf_salary_14: accrSum(positionCategoryRequest, 'trf_salary_14'),
      totalTrf_salary_15: accrSum(positionCategoryRequest, 'trf_salary_15'),
      totalTrf_salary_16: accrSum(positionCategoryRequest, 'trf_salary_16'),
      totalTrf_salary_17: accrSum(positionCategoryRequest, 'trf_salary_17'),
      totalTrf_salary_18: accrSum(positionCategoryRequest, 'trf_salary_18'),
      totalTrf_salary_19: accrSum(positionCategoryRequest, 'trf_salary_19'),
      totalTrf_salary_20: accrSum(positionCategoryRequest, 'trf_salary_20'),
      totalTrf_salary_21: accrSum(positionCategoryRequest, 'trf_salary_21'),
      totalTrf_salary_22: accrSum(positionCategoryRequest, 'trf_salary_22'),
      totalTrf_salary_23: accrSum(positionCategoryRequest, 'trf_salary_23'),
      totalTrf_salary_24: accrSum(positionCategoryRequest, 'trf_salary_24'),
      totalTrf_salary_25: accrSum(positionCategoryRequest, 'trf_salary_25'),
      totalTrf_salary_26: accrSum(positionCategoryRequest, 'trf_salary_26'),
      totalTrf_salary_27: accrSum(positionCategoryRequest, 'trf_salary_27'),
      totalTrf_salary_28: accrSum(positionCategoryRequest, 'trf_salary_28'),
      totalTrf_salary_29: accrSum(positionCategoryRequest, 'trf_salary_29'),
      totalTrf_salary_30: accrSum(positionCategoryRequest, 'trf_salary_30'),
      totalTrf_salary_31: accrSum(positionCategoryRequest, 'trf_salary_31'),
      totalTrf_salary_32: accrSum(positionCategoryRequest, 'trf_salary_32'),
      totalTrf_salary_33: accrSum(positionCategoryRequest, 'trf_salary_33'),
      totalTrf_salary_34: accrSum(positionCategoryRequest, 'trf_salary_34'),
      totalTrf_salary_35: accrSum(positionCategoryRequest, 'trf_salary_35'),
      totalTrf_salary_36: accrSum(positionCategoryRequest, 'trf_salary_36'),
      totalTrf_salary_37: accrSum(positionCategoryRequest, 'trf_salary_37'),
      totalSumTrf_10_11_12: accrSum(positionCategoryRequest, 'trf_10_11_12'),
      totalTrf_salary_38: accrSum(positionCategoryRequest, 'trf_salary_38'),
      totalTrf_salary_39: accrSum(positionCategoryRequest, 'trf_salary_39'),
      totalTrf_salary_40: accrSum(positionCategoryRequest, 'trf_salary_40'),
      totalTrf_salary_sum_23_26: accrSum(positionCategoryRequest, 'trf_salary_sum_23_26'),
      totalTrf_salary_sum_27_30: accrSum(positionCategoryRequest, 'trf_salary_sum_27_30'),
      totalTrf_salary_sum_31_34: accrSum(positionCategoryRequest, 'trf_salary_sum_31_34'),
      totalTrf_salary_sum_16_17_19: accrSum(positionCategoryRequest, 'trf_salary_sum_16_17_19'),
      totalTrf_salary_sum_20_21: accrSum(positionCategoryRequest, 'trf_salary_sum_20_21'),
      totalTrf_salary_sum_10_13_14_18_27_30: accrSum(positionCategoryRequest, 'trf_salary_sum_10_13_14_18_27_30'),
      totalTrf_salary_sum_4_9_15_23_26_35_36: accrSum(positionCategoryRequest, 'trf_salary_sum_4_9_15_23_26_35_36'),
      totalTrf_salary_sum: accrSum(positionCategoryRequest, 'trf_salary_sum_total')
    }]
    return totalAccr
  }
  function addOrgName (org, params) {
    const globalOrg = org.find(o => o.ID === params.orgID)
    let result = null
    if (globalOrg && params.showJoinReport) {
      result = `по організації ${globalOrg.name}`
    } else if (org.length && globalOrg) {
      result = `по району ${globalOrg.name}`
    } else if (org.length && !globalOrg) {
      result = `по району ${params.orgName}`
    }
    return result
  }
  function createReport (dictStaffSubCat, subCatPayment, trfAccrual, dicProgClassName, index = 0, arr = [], dictProgClassIDD) {
    let aaa = 
    accrReport.map( n =>  {
      let tmp = {}
      tmp[Object.keys(n)[0]] = n[Object.keys(n)[0]].filter( e => !e.dictProgClassID || !dictProgClassIDD || e.dictProgClassID === dictProgClassIDD)
      return tmp
      }
    )
    /// accrReport.forEach( (n,i) => {
    //  aaa.push(n[Object.keys(n)[0]].filter( e => !e.dictProgClassID || !dictProgClassIDD || e.dictProgClassID === dictProgClassIDD))
    //})

    let positionCategoryRequest = setStaffSubCat(dictStaffSubCat, subCatPayment, trfAccrual, aaa)
    let totalAccr = positionCategoryRequest && positionCategoryRequest.length && setTotalAccr(positionCategoryRequest)
    totalAccr = totalAccr && totalAccr.length && isRoundUpTo(totalAccr, 'tot', params.roundUpTo)
    positionCategoryRequest = positionCategoryRequest && positionCategoryRequest.length && isRoundUpTo(positionCategoryRequest, 'trf', params.roundUpTo)
    const firstReportBlock = {
      headReport: [{
        hrOrg: addOrgName(hrOrg, params),
        period: setPeriod(params.periodFromDateFrom, params.periodToDateTo)
      }],
      positionCategoryRequest,
      totalAccr,
      year: [{ year: dateService.shiftDate(params.periodFromDateFrom).getFullYear() }],
      firstPageBreak: [{ isPageBreak: true }],
      secondPageBreak: [{ isPageBreak: true }],
      lastPageBreak: [{ isPageBreak: !index || arr.length === index - 1 }],
      dicProgClassName
    }
    return firstReportBlock
  }
  function setReport (dictStaffSubCatRequest, dictStaffSubCatPayment, trfAccrualRequest, dictProgClassIDs) {
    const result = []
    const payment = dictStaffSubCatPayment.filter(o => !dictProgClassIDs || dictProgClassIDs.includes(o.dictProgClassID))
    const trfPayment = trfAccrualRequest.filter(o => !dictProgClassIDs || dictProgClassIDs.includes(o.dictProgClassID))
    const dictProgClassArr = (payment && payment.length && payment.filter(o => o.dictProgClassCode).reduce((acc, cur) => [...acc.filter(o => o.dictProgClassID !== cur.dictProgClassID), cur], []))
    if (payment.length) {
      if (dictProgClassIDs && dictProgClassIDs.length === 1) {
        report.push(createReport(dictStaffSubCatRequest, payment, trfPayment, dictProgClassArr.map(o => o.dictProgClassCode).join(', '),0,[],dictProgClassIDs[0]))
      } else {
        report.push(createReport(dictStaffSubCatRequest, payment, trfPayment, []))
        dictProgClassArr.sort((a,b) => Number(a.dictProgClassCode)-Number(b.dictProgClassCode)).forEach((o, i, arr) => {
          const findDictProgClassCode = dictProgClassArr.find(d => o.dictProgClassID === d.dictProgClassID)
          const dictProgClassCode = findDictProgClassCode ? findDictProgClassCode.dictProgClassCode : ''
          report.push(createReport(dictStaffSubCatRequest, payment.filter(s => s.dictProgClassCode === o.dictProgClassCode), trfPayment.filter(s => s.dictProgClassID === o.dictProgClassID ), dictProgClassCode, i, arr,o.dictProgClassID))
        })
      }
    }
    return result
  }
  const report = []
  const madeReport = setReport(dictStaffSubCatRequest, dictStaffSubCatPayment, trfAccrualRequest, dictProgClassIDs)
  if (madeReport.length) report.push(madeReport)

  ctx.mParams.resultData = JSON.stringify({
    report
  })
}
me.getConsolidatedStatementDictProgClass = ctx => {
  const sqlDialect = entityBaseService.getSQLDialect()
  const params = ctx.mParams.execParams
  const orgIDs = JSON.parse(params.orgIDs)
  orgIDs.push(params.orgID)
  const orgID = params.joinReport && orgIDs.length ? orgIDs : [params.orgID]
  const dictProgClassIDs = params.dictProgClassID.length ? params.dictProgClassID.split(',').map(o => Number(o)) : null
  const dictFundSourceIDs = params.dictFundSourceID.length ? params.dictFundSourceID.split(',').map(o => Number(o)) : null
  const filterCode = 'dictProgClassID'
  const parentOrdID = settingsService.getByCode('hrUseReportSettingsParentOrg', params.orgID)
  const sortPayElArr = UB.Repository('hr_idParam')
    .attrs('payElID', 'orderN')
    .where('listParamID.code', '=', params.sortAccrGrid)
    .where('orgID', '=', parentOrdID || params.orgID)
    .where('mi_deleteUser', 'isNull')
    .selectAsObject()
  const orgNameArr = UB.Repository('hr_organization')
    .attrs('code', 'name', 'shortName', 'mi_data_id')
    .where('mi_data_id', 'in', orgID)
    .where('state', '=', 'ACTIVE')
    .misc({ __mip_ondate: dateService.shiftDate(params.currDate) })
    .orderBy('mi_dateFrom', 'desc')
    .selectAsObject({ mi_data_id: 'ID' })
  const periodIDs = UB.Repository('hr_dictPeriod')
    .attrs(['ID'])
    .where('orgID', 'in', orgID)
    .where('dateFrom', '=', dateService.shiftDate(params.periodFrom))
    .where('dateTo', '=', dateService.shiftDate(params.periodTo))
    .selectAsArrayOfValues()
  const accrualReq = UB.DataStore('hr_accrual')
  accrualReq.runSQL(`select pe.description as "description", pe.code,
    sum(adt.paySum) as "paySum",
    (select ${sqlDialect.top} accr.rate
    from hr_accrualFund accr
      left join hr_accrualFundDt accrDt on accrDt.accrualFundID = accr.ID
    where accr.periodCalcID = a.periodCalcID 
    and en.ID = accr.employeeNumberID 
    and a.payElID = accrDt.payElID ${sqlDialect.limit}) AS "rate",
    (select ${sqlDialect.top} f.name
      from hr_accrualFund accr
     JOIN hr_payFund f on f.ID = accr.payFundID
      left join hr_accrualFundDt accrDt on accrDt.accrualFundID = accr.ID
      where accr.periodCalcID = a.periodCalcID 
      and en.ID = accr.employeeNumberID 
      and a.payElID = accrDt.payElID ${sqlDialect.limit}) as "payFundName",
    (select sum(accrDt.sourceSum)
      from hr_accrualFund accr
        left join hr_accrualFundDt accrDt on accrDt.accrualFundID = accr.ID
      where accr.periodCalcID = a.periodCalcID
      and en.ID = accr.employeeNumberID 
      and a.payElID = accrDt.payElID) AS "sourceSum",
    a.payElID as "payElID",
    en.tabNum as "tabNum",
    pe.name as "payElName",
    en.orgID as "orgID",
    meg.groupType as "methodGroupType",
    me.code as "methodCode",
    empl.fullFIO AS "fullFIO",
    (select ${sqlDialect.top} dep.name from 
    hr_department dep 
    where dep.mi_data_id = ep.departmentID
    and dep.state = 'ACTIVE' 
    and dep.mi_deleteDate >= '9999-12-31' order by dep.mi_dateTo desc ${sqlDialect.limit}) as "departmentName",
    (select ${sqlDialect.top} dep.code from 
    hr_department dep 
    where dep.mi_data_id = ep.departmentID
    and dep.state = 'ACTIVE' 
    and dep.mi_deleteDate >= '9999-12-31' order by dep.mi_dateTo desc ${sqlDialect.limit}) as "departmentCode",
    ep.departmentID as "departmentID",
    en.ID as "employeeNumberID",
    (select ${sqlDialect.top} f.entryOperationID
    from hr_accrualFund accr
    JOIN hr_payFund f on f.ID = accr.payFundID
    left join hr_accrualFundDt accrDt on accrDt.accrualFundID = accr.ID
    where accr.periodCalcID = a.periodCalcID 
    and en.ID = accr.employeeNumberID 
    and a.payElID = accrDt.payElID ${sqlDialect.limit}) as "entryOperationID",
    dpc.code as "dictProgClassCode",
    dpc.ID as "dictProgClassID",
    adt.dictFundSourceID as "dictFundSourceID",
    fs.name as "dictFundSourceName" 
    FROM hr_employeeNumber en
    JOIN hr_accrual a on a.employeeNumberID = en.ID 
    JOIN hr_accrualDt adt on adt.accrualID = a.ID  
    left join hr_payEl pe on pe.ID = a.payElID
    left join hr_method me on me.ID = pe.methodID
    left join hr_methodGroup meg on meg.ID = me.methodGroupID
    left JOIN  hr_employeePosition ep ON 
       ep.ID = (select ${sqlDialect.top} ep2.ID from hr_employeePosition ep2 where 
       ep2.employeeNumberID = en.ID 
       and ep2.isActive = 1
       and ep2.dateFrom <= :periodDateTo:
       and ep2.mi_deleteDate >= '9999-12-31'
       order by ep2.dateFrom desc ${sqlDialect.limit})
    left JOIN hr_employee empl on empl.ID = en.employeeID
    left join ac_dictProgClass dpc on dpc.ID = adt.dictProgClassID
    left join ac_fundSource fs on fs.ID = adt.dictFundSourceID
    WHERE en.orgID ${entityBaseService.getInExpression('orgID')} 
    and a.periodCalcID ${entityBaseService.getInExpression('periodIDs')}  
    and en.mi_deleteDate >= '9999-12-31'
    ${!App.domainInfo.isEntityMethodsAccessible('hr_employeeNumber', 'employeeLimitedAccess') ? 'AND en.limitedAccess = 0' : ''}
    AND (a.flagsRec & 8192 != 8192)      
    AND en.empWorkPlace is null
    ${dictProgClassIDs ? `and adt.dictProgClassID ${entityBaseService.getInExpression('dictProgClassIDs')}` : ''}
    ${dictFundSourceIDs ? `and adt.dictFundSourceID ${entityBaseService.getInExpression('dictFundSourceIDs')}` : ''}
    and pe.ignoreInCalcPay = 0
    group by a.rate, a.payElID, pe.code, empl.fullFIO, pe.description, en.tabNum, en.orgID, me.code, meg.groupType, ep.departmentID, en.ID, pe.name, a.periodCalcID, dpc.ID, dpc.code, adt.dictFundSourceID, fs.name
    order by pe.code
    `, {
    orgID,
    periodIDs,
    periodDateTo: dateService.shiftDate(params.periodTo),
    periodDateFrom: dateService.shiftDate(params.periodFrom),
    departmentID: params.departmentID,
    dictProgClassIDs,
    dictFundSourceIDs
  })
  let accrual = accrualReq.getAsJsObject()

  const accrualFund = getAccrualFund(orgID, params.periodTo, params.periodFrom, dictProgClassIDs, dictFundSourceIDs, periodIDs)
  const accrualBalance = getAccrualBalance(dictProgClassIDs, dictFundSourceIDs, params.periodTo, periodIDs)

  let emloyeeList = getEmployeeList(orgID, params.periodTo, params.periodFrom, dictProgClassIDs, dictFundSourceIDs, params.dateReport)

  const timeSheets = getTimeSheet(orgID, params.periodTo, params.periodFrom, dictProgClassIDs, dictFundSourceIDs)

  const ttt = accrualFund.filter(e => e.code === '1127')
  const ttt1 = accrual.filter(e => e.paySum === 38.60)
  const ttt4 = accrual.filter(e => e.dictProgClassID === 3000035193389)
  
  const ttt2 = accrualFund.filter(e => e.sourceSum === 38.60)
  const ttt5 = accrualFund.filter(e => e.dictProgClassID === 3000035193389)


  const res1 = ttt4.reduce((sum, curValue) => sum + curValue.paySum, 0) 
  const res2 = ttt5.reduce((sum, curValue) => sum + curValue.sourceSum, 0) 

  const getListParam = UB.Repository('hr_listParam')
    .attrs(['ID', 'fullName'])
    .where('code', '=', 'consolidatedStatement')
    .selectAsObject()

  const getIdParams = UB.Repository('hr_idParam')
    .attrs(['listParamID.code', 'listParamID.shortName', 'entryOperationID', 'listParamID'])
    .where('[listParamID]', 'in', getListParam.map(o => o.ID))
    .where('[orgID]', '=', Number(parentOrdID || params.orgID))
    .where('[listParamID.mi_deleteUser]', 'isNull')
    .selectAsObject({ 'listParamID.code': 'code', 'listParamID.shortName': 'shortName' })

  const dictProgClassArr = []
  let organizationDictFundSourseStr = []
  accrual.forEach(o => {
    if (!dictProgClassArr.find(d => d.dictProgClassID === o.dictProgClassID) && o.paySum) {
      dictProgClassArr.push({
        dictProgClassID: o.dictProgClassID,
        dictProgClassCode: o.dictProgClassCode || 'Без КПК'
      })
    }
    if (!organizationDictFundSourseStr.filter(d => d.dictFundSourceID === o.dictFundSourceID).length) {
      organizationDictFundSourseStr.push({
        dictFundSourceID: o.dictFundSourceID,
        dictFundSourceName: o.dictFundSourceName || 'Без джерела фінансування'
      })
    }
  })
  accrualFund.forEach(o => {
    if (!dictProgClassArr.find(d => d.dictProgClassID === o.dictProgClassID) && (o.paySum || o.sourceSum || o.baseSum)) {
      dictProgClassArr.push({
        dictProgClassID: o.dictProgClassID,
        dictProgClassCode: o.dictProgClassCode || 'Без КПК'
      })
    }
    if (!organizationDictFundSourseStr.filter(d => d.dictFundSourceID === o.dictFundSourceID).length) {
      organizationDictFundSourseStr.push({
        dictFundSourceID: o.dictFundSourceID,
        dictFundSourceName: o.dictFundSourceName || 'Без джерела фінансування'
      })
    }
  })
  accrualBalance.forEach((o, i, arr) => {
    if (!dictProgClassArr.find(d => d.dictProgClassID === o.dictProgClassID) && (!arr.find(item => (item.employeeNumberID === o.employeeNumberID) && item.dictProgClassID))) {
      dictProgClassArr.push({
        dictProgClassID: o.dictProgClassID,
        dictProgClassCode: o.dictProgClassCode || 'Без КПК'
      })
    }
    if (!organizationDictFundSourseStr.filter(d => d.dictFundSourceID === o.dictFundSourceID).length) {
      organizationDictFundSourseStr.push({
        dictFundSourceID: o.dictFundSourceID,
        dictFundSourceName: o.dictFundSourceName || 'Без джерела фінансування'
      })
    }
  })
  emloyeeList.forEach((o, i, arr) => {
    if (!dictProgClassArr.find(d => d.dictProgClassID === o.dictProgClassID)) {
      dictProgClassArr.push({
        dictProgClassID: o.dictProgClassID,
        dictProgClassCode: o.dictProgClassCode || 'Без КПК'
      })
    }
    if (!organizationDictFundSourseStr.filter(d => d.dictFundSourceID === o.dictFundSourceID).length) {
      organizationDictFundSourseStr.push({
        dictFundSourceID: o.dictFundSourceID,
        dictFundSourceName: o.dictFundSourceName || 'Без джерела фінансування'
      })
    }
  })
  organizationDictFundSourseStr = organizationDictFundSourseStr.length ? organizationDictFundSourseStr.map(o => o.dictFundSourceName).join(', ') : 'Без джерела фінансування'
  const dictProgClassID = dictProgClassArr.map(o => o.dictProgClassID)
  const organizationDictProgClassStr = dictProgClassArr.length ? dictProgClassArr.map(o => o.dictProgClassCode).join(', ') : 'Без КПК'
  function setAccData (accData = [], totalSum, dictProgClassIDs) {
    let res = []
    if (!totalSum.length) dictProgClassIDs.forEach(scID => totalSum.push({ paySum: 0 }))

    let curObj
    accData.forEach(obj => {
      if (!res.find(o => o.payElID === obj.payElID)) {
        curObj = Object.assign({}, obj)
        let objsOfPayElID = accData.filter(el => el.payElID === obj.payElID)
        curObj.sum = []
        dictProgClassIDs.forEach((scID, ind) => {
          let accObj = objsOfPayElID.filter(el => el.dictProgClassID === scID).reduce((sum, curValue) => sum + curValue.paySum, 0) || 0
          let accObjPaySum = currencyService.round(accObj, 2)
          curObj.sum.push({ paySum: accObjPaySum })
          totalSum[ind].paySum = currencyService.round(totalSum[ind].paySum + accObjPaySum, 2)
        })
        curObj.paySum = accData.filter(el => el.payElID === obj.payElID).reduce((sum, curValue) => sum + curValue.paySum, 0)
        res.push(curObj)
      }
    })
    return res
  }
  function setSortData (accData) {
    return _.sortBy(accData, 'payElName')
  }
  function sortAccrual (accrual, sortArr) {
    return accrual.map(o => {
      const payElSort = sortArr.find(payEl => payEl.payElID === o.payElID)
      o.sortNumber = payElSort ? payElSort.orderN : 0
      return o
    }).sort((a, b) => {
      if (a.sortNumber === 0 && b.sortNumber !== 0) {
        return 1
      } else if (a.sortNumber !== 0 && b.sortNumber === 0) {
        return -1
      } else {
        return a.sortNumber - b.sortNumber
      }
    })
  }

  function setAccBalance (accData = [], dictProgClassIDs) {
    let res = []
    let curArr = []
    const curObj = {}
    const data = []
    const groupArr = _.groupBy(accData, 'employeeNumberID')
    const employeeNumberKeys = Object.keys(groupArr)
    employeeNumberKeys.forEach(o => {
      const curEmpl = groupArr[o].sort((a,b) => b.dictProgClassID - a.dictProgClassID)
      const curData = curEmpl.reduce((acc, cur, index) => {
        if (!index) {
          acc = Object.assign({}, cur)
        } else if ((!['02', '03'].includes(cur.dictFundTypeCode)) || !cur.dictFundTypeCode) {
          acc.sumFrom += cur.sumFrom
          acc.sumTo += cur.sumTo
        } else if (['02', '03'].includes(cur.dictFundTypeCode)) {
          data.push(cur)
        }
        return acc
      }, {})
      data.push(curData)
    })
    dictProgClassIDs.forEach(o => {
      const filterData = data.filter(a => a.dictProgClassID === o)
      const dataEnterprise = filterData.filter(o => (o.sumFrom > 0) && (!['02', '03'].includes(o.dictFundTypeCode) || !o.dictFundTypeCode))
      const dataSumFrom = filterData.filter(o => (o.sumFrom < 0) && (!['02', '03'].includes(o.dictFundTypeCode) || !o.dictFundTypeCode))
      const dataSocial = filterData.filter(o => o.dictFundTypeCode && (o.dictFundTypeCode === '02'))
      const dataCNPP = filterData.filter(o => o.dictFundTypeCode && (o.dictFundTypeCode === '03'))

      const dataEnterpriseSumTo = filterData.filter(o => (o.sumTo > 0) && (!['02', '03'].includes(o.dictFundTypeCode) || !o.dictFundTypeCode))
      const dataSumFomSumTo = filterData.filter(o => (o.sumTo < 0) && (!['02', '03'].includes(o.dictFundTypeCode) || !o.dictFundTypeCode))

      const filterAccDataSumFrom = dataSumFrom.reduce((sum, curValue) => sum + curValue.sumFrom, 0)
      const filterAccDataEnterprise = dataEnterprise.reduce((sum, curValue) => sum + curValue.sumFrom, 0)
      const filterAccDataSocial = dataSocial.reduce((sum, curValue) => sum + curValue.sumFrom, 0)
      const filterAccDataCNPP = dataCNPP.reduce((sum, curValue) => sum + curValue.sumFrom, 0)

      const filterAccDataSumTo = dataSumFomSumTo.reduce((sum, curValue) => sum + curValue.sumTo, 0)
      const filterAccDataEnterpriseSumTo = dataEnterpriseSumTo.reduce((sum, curValue) => sum + curValue.sumTo, 0)
      const filterAccDataSocialSumTo = dataSocial.reduce((sum, curValue) => sum + curValue.sumTo, 0)
      const filterAccDataCNPPSumTo = dataCNPP.reduce((sum, curValue) => sum + curValue.sumTo, 0)

      filterData && filterData.length ? curArr.push({
        sumFrom: filterAccDataSumFrom,
        sumEnterprise: filterAccDataEnterprise,
        sumSocial: filterAccDataSocial,
        sumCNPP: filterAccDataCNPP,
        sumTo: filterAccDataSumTo,
        sumToEnterprise: filterAccDataEnterpriseSumTo,
        sumToSocial: filterAccDataSocialSumTo,
        sumToCNPP: filterAccDataCNPPSumTo
      }) : curArr.push({
        sumFrom: 0,
        sumEnterprise: 0,
        sumSocial: 0,
        sumCNPP: 0,
        sumTo: 0,
        sumToEnterprise: 0,
        sumToSocial: 0,
        sumToCNPP: 0
      })
    })

    curObj.totalSumFrom = curArr && curArr.reduce((sum, curValue) => currencyService.round(sum + (curValue.sumFrom ? currencyService.round(curValue.sumFrom, 2) : 0), 2), 0)
    curObj.totalSumEnterprise = curArr && curArr.reduce((sum, curValue) => currencyService.round(sum + (curValue.sumEnterprise ? currencyService.round(curValue.sumEnterprise, 2) : 0), 2), 0)
    curObj.totalSumSocial = curArr && curArr.reduce((sum, curValue) => currencyService.round(sum + (curValue.sumSocial ? currencyService.round(curValue.sumSocial, 2) : 0), 2), 0)
    curObj.totalSumCNPP = curArr && curArr.reduce((sum, curValue) => currencyService.round(sum + (curValue.sumCNPP ? currencyService.round(curValue.sumCNPP, 2) : 0), 2), 0)

    curObj.totalSumTo = curArr && curArr.reduce((sum, curValue) => currencyService.round(sum + (curValue.sumTo ? currencyService.round(curValue.sumTo, 2) : 0), 2), 0)
    curObj.totalSumToEnterprise = curArr && curArr.reduce((sum, curValue) => currencyService.round(sum + (curValue.sumToEnterprise ? currencyService.round(curValue.sumToEnterprise, 2) : 0), 2), 0)
    curObj.totalToSumSocial = curArr && curArr.reduce((sum, curValue) => currencyService.round(sum + (curValue.sumToSocial ? currencyService.round(curValue.sumToSocial, 2) : 0), 2), 0)
    curObj.totalToSumCNPP = curArr && curArr.reduce((sum, curValue) => currencyService.round(sum + (curValue.sumToCNPP ? currencyService.round(curValue.sumToCNPP, 2) : 0), 2), 0)

    curObj.sum = curArr
    if (dictProgClassIDs.length) res.push(curObj)
    if (!dictProgClassIDs.length) {
      res = [{
        sum: [{
          sumFrom: 0,
          sumEnterprise: 0,
          sumSocial: 0,
          sumCNPP: 0,
          sumTo: 0,
          sumToEnterprise: 0,
          sumToSocial: 0,
          sumToCNPP: 0
        }],
        totalSumFrom: 0,
        totalSumEnterprise: 0,
        totalSumSocial: 0,
        totalSumCNPP: 0,
        totalSumTo: 0,
        totalSumToEnterprise: 0,
        totalToSumSocial: 0,
        totalToSumCNPP: 0
      }]
    }
    return res
  }
  function setOtherEmpArr (accData = [], dictProgClassIDs) {
    let res = []
    let curArr = []
    const curObj = {}
    dictProgClassIDs.forEach(o => {
      const filterAccData = accData.filter(a => (a.dictProgClassID === o))
      const filterAccDataPaySum = filterAccData.reduce((sum, curValue) => sum + currencyService.round(curValue.rate), 0) || 0

      filterAccData && filterAccData.length ? curArr.push({ employeesAmount: filterAccDataPaySum }) : curArr.push({ employeesAmount: 0 })
    })
    curObj.total = curArr && curArr.reduce((sum, curValue) => sum + (curValue.employeesAmount ? curValue.employeesAmount : 0), 0)
    curObj.sum = curArr
    if (dictProgClassIDs.length) res.push(curObj)
    if (!dictProgClassIDs.length) {
      res = [{
        sum: [{ employeesAmount: 0 }],
        total: 0
      }]
    }
    return res
  }
  function setEmpArr (accData = [], dictProgClassIDs) {
    let res = []
    let curArr = []
    const curObj = {}
    dictProgClassIDs.forEach(o => {
      const filterAccData = accData.filter(a => (a.dictProgClassID === o))
      const filterAccDataPaySum = filterAccData.reduce((sum, curValue) => sum + currencyService.round(curValue.employees), 0) || 0

      filterAccData && filterAccData.length ? curArr.push({ employeesAmount: filterAccDataPaySum }) : curArr.push({ employeesAmount: 0 })
    })
    curObj.total = curArr && curArr.reduce((sum, curValue) => sum + (curValue.employeesAmount ? curValue.employeesAmount : 0), 0)
    curObj.sum = curArr
    if (dictProgClassIDs.length) res.push(curObj)
    if (!dictProgClassIDs.length) {
      res = [{
        sum: [{ employeesAmount: 0 }],
        total: 0
      }]
    }
    return res
  }
  function setEmployeeEmount (accData = [], dictProgClassIDs) {
    let res = []
    let curArr = []
    const curObj = {}
    dictProgClassIDs.forEach(o => {
      const filterAccData = accData.filter(a => a.dictProgClassID === o)
      const filterAccDataPaySum = filterAccData.reduce((sum, curValue) => sum + curValue.rate || 0, 0) || 0

      filterAccData && filterAccData.length ? curArr.push({ rate: filterAccDataPaySum }) : curArr.push({ rate: 0 })
    })
    curObj.total = curArr && curArr.reduce((sum, curValue) => sum + curValue.rate, 0)
    curObj.sum = curArr
    if (dictProgClassIDs.length) res.push(curObj)
    if (!dictProgClassIDs.length) {
      res = [{
        sum: [{ rate: 0 }],
        total: 0
      }]
    }
    return res
  }
  function setWorkHoursTimeSheet (accData = [], dictProgClassIDs) {
    let res = []
    let curArr = []
    const curObj = {}
    dictProgClassIDs.forEach(o => {
      const filterAccDataPaySum = accData.reduce((sum, cur) => {
        return sum + (cur.dictProgClassID === o ? cur.factHour : 0)
      }, 0)
      filterAccDataPaySum ? curArr.push({ factHours: filterAccDataPaySum }) : curArr.push({ factHours: 0 })
    })
    curObj.totalFactHours = curArr && curArr.reduce((sum, curValue) => sum + curValue.factHours, 0)
    curObj.sum = curArr
    if (dictProgClassIDs.length) res.push(curObj)
    if (!dictProgClassIDs.length) {
      res = [{
        sum: [{ factHours: 0 }],
        totalFactHours: 0
      }]
    }
    return res
  }
  function setWorkDaysTimeSheet (accData = [], dictProgClassIDs) {
    let res = []
    let curArr = []
    const curObj = {}
    dictProgClassIDs.forEach(o => {
      const filterAccDataPaySum = accData.reduce((sum, cur) => {
        return sum + (cur.dictProgClassID === o ? cur.factDay : 0)
      }, 0)
      filterAccDataPaySum ? curArr.push({ workDays: filterAccDataPaySum }) : curArr.push({ workDays: 0 })
    })
    curObj.totalWorkDays = curArr && curArr.reduce((sum, curValue) => sum + curValue.workDays, 0)
    curObj.sum = curArr
    if (dictProgClassIDs.length) res.push(curObj)
    if (!dictProgClassIDs.length) {
      res = [{
        sum: [{ workDays: 0 }],
        totalWorkDays: 0
      }]
    }
    return res
  }

  function setECBtable (data, listParam, idParams, IDs, filterCode, dataAccrual) {
    const tableTitleArr = ['Загальна сума нарахувань', 'Сума, на яку нараховано ЄСВ', 'Нараховано ЄСВ']
    const tableTotalArr = ['Всього загальна сума нарахувань', 'Всього нараховано для ЄСВ', 'Нараховано ЄСВ']
    const curKeySumArr = ['sourceSum', 'baseSum', 'paySum']

    const res = []
    tableTitleArr.forEach((t, index, array) => {
      const tableList = { titleName: t, tableTotal: tableTotalArr[index] }
      const groupPayEl = []
      const curKeySum = curKeySumArr[index]
      let totalSum = IDs.map(scID => {
        const defObj = {}
        defObj[filterCode] = scID
        defObj.paySum = 0
        return defObj
      })
      let totalDelta = []
      listParam.forEach((o, listIndex, listArr) => {
        let totalGroupSum = IDs.map(scID => {
          const defObj = {}
          defObj[filterCode] = scID
          defObj.paySum = 0
          return defObj
        })
        const entryOperationList = idParams.filter(id => (id.listParamID === o.ID))
        const curData = data.filter(d => entryOperationList.find(p => p.entryOperationID === d.entryOperationID) || (!d.entryOperationID && !listIndex))
        const grouPayFundIDs = []
        const findDeltaArr = dataAccrual.filter(da => !da.sourceSum)
        if (curData.length) {
          curData.forEach(c => {
            if (!grouPayFundIDs.find(gr => (gr.payFundID === c.payFundID) && (gr.rate === c.rate)) && (c.payFundID && c.rate) && (c[curKeySum])) {
              grouPayFundIDs.push({
                payFundID: c.payFundID,
                rate: c.rate
              })
            }
          })
          const obj = {
            fullName: o.fullName,
            groupRowSpan: grouPayFundIDs.length + 1
          }
          let curObj
          grouPayFundIDs.forEach((g, i, arr) => {
            curObj = Object.assign({}, obj)
            curObj.showFullName = !i
            curObj.showTotalGroup = i === (arr.length - 1)
            const curPayData = curData.filter(c => (c.payFundID === g.payFundID) && (c.rate === g.rate))
            if (curPayData.length) {
              curObj.sum = []
              curObj.totalRow = 0
              IDs.forEach(dp => {
                let depAccr = curPayData.filter(c => c[filterCode] === dp)
                let depAccrPaySum = depAccr ? currencyService.round(depAccr.reduce((sum, curValue) => sum + curValue[curKeySum], 0), 2) : 0
                curObj.sum.push({ paySum: depAccrPaySum })
                totalGroupSum.forEach(o => {
                  if (o[filterCode] === dp) o.paySum += currencyService.round(depAccrPaySum, 2)
                })
                totalSum.forEach(o => {
                  if (o[filterCode] === dp) {
                    o.paySum += currencyService.round(depAccrPaySum, 2)
                  }
                })
              })
              curObj.totalGroupSum = totalGroupSum
              curObj.sumTotalGroupSum = totalGroupSum.reduce((acc, cur) => acc + cur.paySum, 0)
              curObj.totalRow = curPayData.reduce((sum, curValue) => sum + curValue[curKeySum], 0)
              curObj.payFundName = curPayData[0].payFundName
              curObj.rate = curPayData[0].rate === 'delta' ? '' : curPayData[0].rate
              curObj.sumTotalSum = totalSum.reduce((acc, cur) => acc + cur.paySum, 0)
              groupPayEl.push(curObj)
            }
          })
        }
        if (listIndex === (listArr.length - 1) && groupPayEl.length) {
          groupPayEl[groupPayEl.length - 1].showTotalSum = (listIndex === (listArr.length - 1))
          if (curKeySum === 'sourceSum') {
            const filterDelta = findDeltaArr.map(o => Object.assign({}, o)).map(o => {
              o.payFundID = 'delta'
              o.rate = 'delta'
              o.sourceSum = o.paySum
              return o
            })
            IDs.forEach(o => {
              const curIDValue = filterDelta.filter(fd => fd[filterCode] === o).reduce((acc, cur, index) => {
                if (!index) {
                  acc[filterCode] = o
                }
                acc.sourceSum += cur.sourceSum
                return acc
              }, { sourceSum: 0 })
              totalDelta.push(curIDValue)
            })
            groupPayEl[groupPayEl.length - 1].showDelta = !!((listIndex === (listArr.length - 1)) && findDeltaArr.length)
            groupPayEl[groupPayEl.length - 1].totalDelta = totalDelta
            groupPayEl[groupPayEl.length - 1].totalDeltaSum = totalDelta.reduce((acc, cur) => acc + cur.sourceSum, 0)
            groupPayEl[groupPayEl.length - 1].sumTotalSum += groupPayEl[groupPayEl.length - 1].totalDeltaSum
          }
        }
      })
      tableList.totalSum = totalSum.map(o => {
        if (totalDelta.length) {
          const totalDeltaSum = totalDelta.find(td => td[filterCode] === o[filterCode])
          o.paySum += totalDeltaSum ? totalDeltaSum.sourceSum : 0
        }
        return o
      })
      tableList.groupPayEl = groupPayEl
      res.push(tableList)
    })
    return res
  }
  function isSecondReport (accrual, varCol, report, curPeriodID) {
    const res = []
    let resObj
    const empArr = accrual.filter(o => (o.payFundMethodCode !== '2') && (o.sourceSum - o.baseSum > 0)).sort((a, b) => a.tabNum - b.tabNum)
    const accrNamesArr = []
    empArr.forEach(o => {
      if (!accrNamesArr.find(a => a.payFundID === o.payFundID)) {
        accrNamesArr.push({
          payFundID: o.payFundID || null,
          printPayElName: o.payFundName || 'Не визначенo',
          totalSourceSum: 0,
          totalDelta: 0,
          totalBaseSum: 0
        })
      }
      o.delta = o.sourceSum - o.baseSum
      o.prevPeriodDelta = o.salarySourceSum - o.salaryBaseSumSum
    })
    const employees = _.groupBy(empArr, 'employeeNumberID')
    const keys = Object.keys(employees)
    keys.forEach((o) => {
      const empData = employees[o]
      const groupEmpData = _.groupBy(empData, 'periodSalaryID')
      const keysGroupEmpData = Object.keys(groupEmpData)
      if (keysGroupEmpData.length > 1) {
        keysGroupEmpData.forEach(k => {
          const curData = groupEmpData[k]
          const payEls = []
          accrNamesArr.forEach((c) => {
            const newObj = Object.assign({}, c)
            const payElSum = curData.filter(e => (e.payFundID === newObj.payFundID) && (e.periodSalaryID === Number(k)))
            newObj.total = 0
            newObj.sourceSum = payElSum.reduce((acc, cur) => acc + cur.sourceSum, 0)
            newObj.baseSum = payElSum.reduce((acc, cur) => acc + cur.baseSum, 0)
            newObj.delta = payElSum.reduce((acc, cur) => acc + cur.delta + (cur.periodSalaryID !== curPeriodID ? cur.prevPeriodDelta : 0), 0)
            c.totalSourceSum += newObj.sourceSum
            c.totalDelta += newObj.delta
            c.totalBaseSum += newObj.baseSum
            payEls.push(newObj)
          })

          const curPerTotalSourceSum = accrual.filter(accrEmpl => (accrEmpl.employeeNumberID === curData[0].employeeNumberID) && (accrEmpl.periodCalcID === Number(k)) && (accrEmpl.periodSalaryID === Number(k))).reduce((acc, cur) => acc + cur.sourceSum, 0) || 0
          const prevPerTotalSourceSum = curData[0].salaryEmplSourceSum
          let salaryPeriodSum
          let periodCalcSum
          if (curData[0].periodCalcID === curData[0].periodSalaryID) {
            periodCalcSum = curPerTotalSourceSum
          } else {
            periodCalcSum = accrual.filter(accrEmpl => (accrEmpl.employeeNumberID === curData[0].employeeNumberID) && (accrEmpl.periodSalaryID === Number(k))).reduce((acc, cur) => acc + cur.sourceSum, 0) || 0
            salaryPeriodSum = prevPerTotalSourceSum
          }
          const totalPerSum = periodCalcSum + (salaryPeriodSum || 0)

          const employee = {
            departmentName: curData[0].departmentName,
            tabNum: curData[0].tabNum,
            fullFIO: curData[0].fullFIO,
            depsColums: varCol,
            periodSalaryName: curData[0].periodSalaryName,
            rate: curData[0].rate,
            salaryPeriodSum,
            periodCalcSum,
            totalPerSum,
            maxBaseECBMaxSum: curData[0].maxBaseECBMaxSum,
            addMinSum: curData.reduce((acc, cur) => acc + cur.addMinSum, 0),
            paySum: curData.reduce((acc, cur) => acc + cur.paySum, 0),
            total: payEls.reduce((acc, cur) => acc + cur.total, 0),
            totalDelta: payEls.reduce((acc, cur) => acc + cur.delta, 0),
            payEls
          }
          res.push(employee)
        })
      } else {
        const payEls = []
        accrNamesArr.forEach((c) => {
          const newObj = Object.assign({}, c)
          const payElSum = empData.filter(e => (e.payFundID === newObj.payFundID))
          newObj.total = 0
          newObj.sourceSum = payElSum.reduce((acc, cur) => acc + cur.sourceSum, 0)
          newObj.baseSum = payElSum.reduce((acc, cur) => acc + cur.baseSum, 0)
          newObj.delta = payElSum.reduce((acc, cur) => acc + cur.delta, 0)
          c.totalSourceSum += newObj.sourceSum
          c.totalDelta += newObj.delta
          c.totalBaseSum += newObj.baseSum
          payEls.push(newObj)
        })

        const curPerTotalSourceSum = accrual.filter(accrEmpl => (accrEmpl.employeeNumberID === empData[0].employeeNumberID) && (accrEmpl.periodCalcID === curPeriodID)).reduce((acc, cur) => acc + cur.sourceSum, 0) || 0
        const prevPerTotalSourceSum = empData[0].salaryEmplSourceSum
        let salaryPeriodSum
        let periodCalcSum
        if (empData[0].periodCalcID === empData[0].periodSalaryID) {
          periodCalcSum = curPerTotalSourceSum
        } else {
          periodCalcSum = accrual.filter(accrEmpl => (accrEmpl.employeeNumberID === empData[0].employeeNumberID) && (accrEmpl.periodSalaryID === curPeriodID)).reduce((acc, cur) => acc + cur.sourceSum, 0) || 0
          salaryPeriodSum = prevPerTotalSourceSum
        }
        const totalPerSum = periodCalcSum + (salaryPeriodSum || 0)
        const employee = {
          departmentName: empData[0].departmentName,
          tabNum: empData[0].tabNum,
          fullFIO: empData[0].fullFIO,
          depsColums: varCol,
          periodSalaryName: empData[0].periodSalaryName,
          rate: empData[0].rate,
          salaryPeriodSum,
          periodCalcSum,
          totalPerSum,
          maxBaseECBMaxSum: empData[0].maxBaseECBMaxSum,
          addMinSum: empData.reduce((acc, cur) => acc + cur.addMinSum, 0),
          paySum: empData.reduce((acc, cur) => acc + cur.paySum, 0),
          total: payEls.reduce((acc, cur) => acc + cur.total, 0),
          totalDelta: payEls.reduce((acc, cur) => acc + cur.delta, 0),
          payEls
        }
        res.push(employee)
      }
    })
    if (accrNamesArr.length) {
      resObj = {
        accrNamesArr,
        empArr: res,
        totalCols: dictProgColumn + 7,
        excessCol: accrNamesArr.length + 1,
        titleCol: accrNamesArr.length + dictProgColumn + 12,
        totalCol: 6 + dictProgColumn,
        amountAccruedAllColumn: allColumn + accrNamesArr.length,
        totalArr: [{
          totalSum: res.reduce((acc, cur) => acc + cur.totalDelta, 0),
          totalSalaryPeriodSum: res.reduce((acc, cur) => acc + (cur.salaryPeriodSum || 0), 0),
          totalPeriodCalcSum: res.reduce((acc, cur) => acc + cur.periodCalcSum, 0),
          totalPerSum: res.reduce((acc, cur) => acc + cur.totalPerSum, 0),
          totalSourceSum: res.reduce((acc, cur) => acc + cur.sourceSum, 0),
          accrNamesArr,
          totalTotalDelta: accrNamesArr.reduce((acc, cur) => acc + cur.totalDelta, 0)
        }]
      }
    }
    return resObj || {
      accrNamesArr: [],
      empArr: res,
      totalCols: dictProgColumn + 7,
      excessCol: 1,
      titleCol: dictProgColumn + 12,
      totalCol: 6 + dictProgColumn,
      amountAccruedAllColumn: allColumn,
      totalArr: [{
        totalSum: null,
        totalSalaryPeriodSum: null,
        totalPeriodCalcSum: null,
        totalBaseSum: null,
        totalSourceSum: null,
        accrNamesArr: [],
        totalTotalDelta: null
      }]
    }
  }
  function isAddPaymentMinBase (accrual, curPeriodID) {
    const empArr = []
    const filterArr = accrual.filter(o => (o.payFundMethodCode === '2') && (!o.isRecSum)).sort((a, b) => a.tabNum - b.tabNum)
    filterArr.forEach(o => {
      const findIndex = empArr.findIndex(e => (e.employeeNumberID === o.employeeNumberID) && (e.rate === o.rate) && (e.periodCalcID === o.periodCalcID) && (e.periodSalaryID === o.periodSalaryID))
      if (findIndex >= 0) {
        empArr[findIndex].paySum += o.paySum
        empArr[findIndex].baseSum += o.baseSum
        empArr[findIndex].sourceSum += o.sourceSum
      } else {
        empArr.push(o)
      }
    })
    empArr.forEach((o, index, arr) => {
      const curPerTotalSourceSum = accrual.filter(accrEmpl => (accrEmpl.employeeNumberID === o.employeeNumberID) && (accrEmpl.periodSalaryID === curPeriodID)).reduce((acc, cur) => acc + cur.sourceSum, 0) || 0
      const prevPerTotalSourceSum = o.salaryEmplSourceSum
      if (o.periodCalcID === o.periodSalaryID) {
        o.periodCalc = curPerTotalSourceSum
      } else {
        o.periodCalc = accrual.filter(accrEmpl => (accrEmpl.employeeNumberID === o.employeeNumberID) && (accrEmpl.periodSalaryID !== curPeriodID)).reduce((acc, cur) => acc + cur.sourceSum, 0) || 0
        o.salaryPeriod = prevPerTotalSourceSum
      }
      o.totalSourceSum = o.periodCalc + (o.salaryPeriod ? o.salaryPeriod : 0)
    })
    return {
      empArr,
      addPaymentMinBaseColumn: 13 + dictProgColumn,
      totalArr: [{
        totalCol: 7 + dictProgColumn,
        totalSalaryPeriodSum: empArr.reduce((acc, cur) => acc + (cur.salaryPeriod ? cur.salaryPeriod : 0), 0),
        totalPeriodCalcSum: empArr.reduce((acc, cur) => acc + cur.periodCalc, 0),
        totalBaseSum: empArr.reduce((acc, cur) => acc + cur.baseSum, 0),
        totalSourceSum: empArr.reduce((acc, cur) => acc + cur.totalSourceSum, 0),
        totalAddMinSum: empArr.reduce((acc, cur) => acc + cur.addMinSum, 0),
        totalPaySum: empArr.reduce((acc, cur) => acc + cur.paySum, 0)
      }]
    }
  }
  
  function isAmountAccruedSum(accrual, varCol, report) {
    const res = []
    let resObj
    const isDoesNotCountECB = accrual.filter(o => (o.paySum !== o.sourceSum) && o.paySum && !o.sourceSum).sort((a, b) => a.tabNum - b.tabNum)
    const accrNamesArr = []
    isDoesNotCountECB.forEach(o => {
      if (!accrNamesArr.find(a => a.payElID === o.payElID)) {
        accrNamesArr.push({
          payElID: o.payElID || null,
          printPayElName: o.printPayElName || o.payElName || 'Не визначений вид оплати',
          totalSourceSum: 0
        })
      }
    })
    const employeesDoesNotCountECB = _.groupBy(isDoesNotCountECB, 'employeeNumberID')
    const keys = Object.keys(employeesDoesNotCountECB)
    keys.forEach((o) => {
      const empData = employeesDoesNotCountECB[o]
      const payEls = []
      accrNamesArr.forEach((c) => {
        const newObj = Object.assign({}, c)
        // change pdv 115/11/24 
        // old const payElSum = empData.filter(e => (e.payFundID === newObj.payFundID))
        const payElSum = empData.filter(e => (e.payElID === newObj.payElID))
        newObj.total = 0
        newObj.sourceSum = payElSum.reduce((acc, cur) => acc + (cur.paySum - cur.sourceSum), 0)
        newObj.total += newObj.sourceSum
        c.totalSourceSum += newObj.sourceSum
        payEls.push(newObj)
      })
      const employee = {
        departmentName: empData[0].departmentName,
        tabNum: empData[0].tabNum,
        fullFIO: empData[0].fullFIO,
        depsColums: varCol,
        total: payEls.reduce((acc, cur) => acc + cur.total, 0),
        payEls
      }
      res.push(employee)
    })
    if (accrNamesArr.length) {
      resObj = {
        accrNamesArr,
        empArr: res,
        totalCols: dictProgColumn + 5,
        amountAccruedAllColumn: allColumn + accrNamesArr.length,
        totalArr: [{
          totalSum: res.reduce((acc, cur) => acc + cur.total, 0),
          accrNamesArr
        }]
      }
    }
    return resObj || {
      accrNamesArr: [],
      amountAccruedAllColumn: allColumn,
      empArr: [],
      totalArr: [{
        totalSum: null,
        accrNamesArr
      }],
      totalCols: dictProgColumn + 5
    }
  }

  let report = []
  let payment
  let offtake
  let forpay
  let totalPaySum

  let payDataECB = []
  let totalMaternityLeaveAccrual = []
  let payMaternityLeaveAccruals = []
  let payHospAccruals = []
  let payHospFssAccruals = []
  let totalPaymentSumArr = []
  let totalOfftakeSumPDFOArr = []
  let totalOfftakeSumArmyArr = []
  let totalOfftakeSumArr = []
  let totalForpaySumArr = []
  let balance = []
  let totalPaySumArr = []
  let payData = []
  let payDataBaseSum = []
  let totalBaseSumArr = []
  let payHospBaseSumAccruals = []
  let baseSumHospFssAccruals = []
  let totalBaseSumHospFssAccruals = []
  let payMaternityLeaveBaseSumAccruals = []
  let totalMaternityLeaveBaseSumAccrual = []
  let payHospECBAccruals = []
  let payHospECBFssAccruals = []
  let payMaternityLeaveECBAccruals = []
  let payDataAddedSum = []
  let totalPaymentSum = 0
  let totalOfftake = 0
  let totalOfftakeSum = 0
  let totalForpaySum = 0
  let totalHospFssSum = 0
  let totalMaternityLeaveSum = 0
  let totalBaseSum = 0
  let totalHospBaseSum = 0
  let totalBaseSumHospFssSum = 0
  let totalMaternityLeaveBaseSum = 0
  let totalPaySumECB = 0
  let totalHospECBSum = 0
  let totalHospFssECBSum = 0
  let totalMaternityLeaveECBSum = 0

  let firstRowspan = 0
  let secondHospRowspan = 0
  let firstHospFssRowspan = 0
  let firstMaternityLeaveRowspan = 0
  let firstRowspanBaseSum = 0

  let secondHospRowspanBaseSum = 0
  let firstHospFssRowspanBaseSum = 0
  let firstMaternityLeaveBaseSumRowspan = 0
  let firstHospECBRow = 0
  let secondHospECBRow = 0
  let firstRowspanECB = 0
  let firstHospFssECBRow = 0
  let firstMaternityLeaveECBRowspan = 0
  let totalPayDataAddedSum = 0
  let firstRowspanAddedSum = 0

  // Перша таблиця
  let paymentData = accrual && accrual.filter(el => el.methodGroupType === 'PAYMENT')
  const offtakeData = accrual && accrual.filter(el => el.methodGroupType === 'OFFTAKE')
  const forpayData = accrual && accrual.filter(el => el.methodGroupType === 'FORPAY')

  totalOfftake = offtakeData && offtakeData.reduce((sum, curValue) => currencyService.round(sum + (curValue.paySum ? currencyService.round(curValue.paySum, 2) : 0), 2), 0)
  totalPaymentSum = paymentData && paymentData.reduce((sum, curValue) => currencyService.round(sum + (curValue.paySum ? currencyService.round(curValue.paySum, 2) : 0), 2), 0)
  totalOfftakeSum = offtakeData.reduce((sum, curValue) => currencyService.round(sum + (curValue.paySum ? currencyService.round(curValue.paySum, 2) : 0), 2), 0)
  totalForpaySum = forpayData && forpayData.reduce((sum, curValue) => currencyService.round(sum + (curValue.paySum ? currencyService.round(curValue.paySum, 2) : 0), 2), 0)

  payment = setAccData(paymentData, totalPaymentSumArr, dictProgClassID)
  payment = sortAccrual(payment, sortPayElArr)
  offtake = setAccData(offtakeData, totalOfftakeSumArr, dictProgClassID)
  forpay = setAccData(forpayData || [], totalForpaySumArr, dictProgClassID)
  forpay = setSortData(forpay)
  balance = setAccBalance(accrualBalance, dictProgClassID)

  // Друга таблиця

  if (!dictProgClassArr.length) {
    dictProgClassArr.push({
      dictProgClassCode: '-'
    })
    totalPaymentSumArr = [{ paySum: 0 }]
    totalOfftakeSumPDFOArr = [{ paySum: 0 }]
    totalOfftakeSumArmyArr = [{ paySum: 0 }]
    totalOfftakeSumArr = [{ paySum: 0 }]
    totalForpaySumArr = [{ paySum: 0 }]
  }

  const date = new Date()
  const timeReport = date.toLocaleTimeString().slice(0, -3)
  const dictProgColumn = dictProgClassArr.length
  const allColumn = dictProgColumn + 6
  const accrualPayment = accrual.filter(o => o.methodGroupType === 'PAYMENT')

  const ECBtable = setECBtable(accrualFund, getListParam, getIdParams, dictProgClassID, filterCode, accrualPayment)

  const result = {
    ECBtable,
    timeReport,
    dictProgClassArr,
    dateReport: `${dateService.formatDate(params.dateReport)} ${timeReport}`,
    periodName: params.periodName,
    orgName: (orgNameArr.find(o => o.ID === params.orgID) && orgNameArr.find(o => o.ID === params.orgID).name) || params.orgName,
    allColumn,
    dictProgColumn,
    payment,
    totalPaymentSumArr,
    totalPaymentSum,
    totalOfftakeSumPDFOArr,
    totalOfftakeSumArmyArr,
    offtake,
    totalOfftake,
    totalOfftakeSum,
    totalOfftakeSumArr,
    forpay,
    totalForpaySum,
    totalForpaySumArr,
    balance,
    totalPaySum,
    totalPaySumArr,
    payData,
    firstRowspan,
    firstHospRowspan: firstHospFssRowspan + secondHospRowspan,
    secondHospRowspan,
    payHospAccruals,
    payHospFssAccruals,
    totalHospFssSum,
    firstHospFssRowspan,
    payMaternityLeaveAccruals,
    totalMaternityLeaveSum,
    totalMaternityLeaveAccrual,
    firstMaternityLeaveRowspan,
    payDataBaseSum,
    totalBaseSumArr,
    firstRowspanBaseSum,
    totalBaseSum,
    payHospBaseSumAccruals,
    totalHospBaseSum,
    firstHospRowspanBaseSum: secondHospRowspanBaseSum + secondHospRowspanBaseSum,
    secondHospRowspanBaseSum,
    baseSumHospFssAccruals,
    totalBaseSumHospFssAccruals,
    totalBaseSumHospFssSum,
    firstHospFssRowspanBaseSum,
    payMaternityLeaveBaseSumAccruals,
    firstMaternityLeaveBaseSumRowspan,
    totalMaternityLeaveBaseSumAccrual,
    totalMaternityLeaveBaseSum,
    payDataECB,
    totalPaySumECB,
    firstRowspanECB,
    payHospECBAccruals,
    firstHospECBRow,
    secondHospECBRow,
    totalHospECBSum,
    payHospECBFssAccruals,
    totalHospFssECBSum,
    firstHospFssECBRow,
    firstHospECBRowspan: firstHospECBRow + firstHospFssECBRow,
    payMaternityLeaveECBAccruals,
    firstMaternityLeaveECBRowspan,
    totalMaternityLeaveECBSum,
    totalPayDataAddedSum,
    employeeEmount: setEmployeeEmount(emloyeeList, dictProgClassID),
    empArr: setEmpArr(emloyeeList.filter((o, i, arr) => arr.findIndex(a => a.employeeID === o.employeeID) === i), dictProgClassID),
    disabledEmpArr: setEmpArr(emloyeeList.filter((o, i, arr) => o.employeeDisabilityID && (arr.findIndex(a => a.employeeID === o.employeeID) === i)), dictProgClassID),
    otherEmpArr: setOtherEmpArr(emloyeeList.filter((o, i, arr) => ['3'].includes(o.workPlace) && (arr.findIndex(a => a.employeeID === o.employeeID) === i)), dictProgClassID),
    factHoursTimeSheet: setWorkHoursTimeSheet(timeSheets, dictProgClassID),
    workDaysTimeSheet: setWorkDaysTimeSheet(timeSheets, dictProgClassID),
    payDataAddedSum,
    firstRowspanAddedSum,
    showSocialSumFrom: !!balance[0].totalSumSocial,
    showCNPPSumFrom: !!balance[0].totalSumCNPP,
    showSocialSumTo: !!balance[0].totalToSumSocial,
    showCNPPSumTo: !!balance[0].totalToSumCNPP,
    showTotalSumFrom: !!balance[0].totalSumFrom,
    showTotalSumEnterprise: !!balance[0].totalSumEnterprise,
    showTotalSumTo: !!balance[0].totalSumTo,
    showTotalSumToEnterprise: !!balance[0].totalSumToEnterprise,
    organizationDictProgClassStr,
    organizationDictFundSourseStr
  }
  report.push(result)

  if (!params.joinReport) {
    report[0].secondReport = [{
      empArr: accrualFund
    }]
    report[0].amountAccrued = isAmountAccruedSum(accrualPayment, dictProgClassID.length, report)
    report[0].addPaymentMinBase = isAddPaymentMinBase(accrualFund, params.periodID)
    report[0].secondReport = isSecondReport(accrualFund, dictProgClassID.length, report, params.periodID)
    report = setCorRow(report)
  }
  function setCorRow (rep) {
    const allColumnFirtRep = rep[0].allColumn || 0
    const titleColLastRep = (rep[0].secondReport && rep[0].secondReport.titleCol) || 0
    const addPaymentMinBaseColumn = (rep[0].addPaymentMinBase && rep[0].addPaymentMinBase.addPaymentMinBaseColumn) || 0
    const amountAccruedCol = (rep[0].amountAccrued && rep[0].amountAccrued.amountAccruedAllColumn) || 0
    const maxCol = Math.max(allColumnFirtRep, titleColLastRep, addPaymentMinBaseColumn, amountAccruedCol)

    rep[0].firstDeltaCol = allColumnFirtRep < maxCol ? maxCol - allColumnFirtRep : 0
    rep[0].amountColDelta = amountAccruedCol < maxCol ? maxCol - amountAccruedCol : 0
    rep[0].addPaymentMinBaseColumnDelta = addPaymentMinBaseColumn < maxCol ? maxCol - addPaymentMinBaseColumn : 0
    rep[0].titleColLastRepDelta = titleColLastRep < maxCol ? maxCol - titleColLastRep : 0

    return rep
  }
  ctx.mParams.resultData = JSON.stringify({
    report
  })
}
me.getConsolidatedStatementDepartment = ctx => {
  const sqlDialect = entityBaseService.getSQLDialect()
  const params = ctx.mParams.execParams
  const orgIDs = JSON.parse(params.orgIDs)
  orgIDs.push(params.orgID)
  const orgID = params.joinReport && orgIDs.length ? orgIDs : [params.orgID]
  const dictProgClassIDs = params.dictProgClassID.length ? params.dictProgClassID.split(',').map(o => Number(o)) : null
  const dictFundSourceIDs = params.dictFundSourceID.length ? params.dictFundSourceID.split(',').map(o => Number(o)) : null
  const filterCode = params.joinReport ? 'orgID' : 'departmentID'
  const parentOrdID = settingsService.getByCode('hrUseReportSettingsParentOrg', params.orgID)

  const sortPayElArr = UB.Repository('hr_idParam')
    .attrs('payElID', 'orderN')
    .where('listParamID.code', '=', params.sortAccrGrid)
    .where('orgID', '=', parentOrdID || params.orgID)
    .where('mi_deleteUser', 'isNull')
    .selectAsObject()

  const orgNameArr = UB.Repository('hr_organization')
    .attrs('code', 'name', 'shortName', 'mi_data_id')
    .where('mi_data_id', 'in', orgID)
    .where('state', '=', 'ACTIVE')
    .misc({ __mip_ondate: dateService.shiftDate(params.currDate) })
    .orderBy('mi_dateFrom', 'desc')
    .selectAsObject({ mi_data_id: 'ID' })

  const periodIDs = UB.Repository('hr_dictPeriod')
    .attrs(['ID'])
    .where('orgID', 'in', orgID)
    .where('dateFrom', '=', dateService.shiftDate(params.periodFrom))
    .where('dateTo', '=', dateService.shiftDate(params.periodTo))
    .selectAsObject()
    .map(o => o.ID)

  const accrualReq = UB.DataStore('hr_accrual')
  accrualReq.runSQL(`select pe.description as "description", pe.code,
    sum(adt.paySum) as "paySum",
    (select ${sqlDialect.top} accr.rate
      from hr_accrualFund accr
        left join hr_accrualFundDt accrDt on accrDt.accrualFundID = accr.ID
      where accr.periodCalcID = a.periodCalcID 
      and en.ID = accr.employeeNumberID 
      and a.payElID = accrDt.payElID ${sqlDialect.limit}) AS "rate",
      (select ${sqlDialect.top} f.name
        from hr_accrualFund accr
       JOIN hr_payFund f on f.ID = accr.payFundID
        left join hr_accrualFundDt accrDt on accrDt.accrualFundID = accr.ID
        where accr.periodCalcID = a.periodCalcID 
        and en.ID = accr.employeeNumberID 
        and a.payElID = accrDt.payElID ${sqlDialect.limit}) as "payFundName",
      (select sum(accrDt.sourceSum)
        from hr_accrualFund accr
          left join hr_accrualFundDt accrDt on accrDt.accrualFundID = accr.ID
        where accr.periodCalcID = a.periodCalcID 
        and en.ID = accr.employeeNumberID 
        and a.payElID = accrDt.payElID) AS "sourceSum",
    a.payElID as "payElID",
    en.tabNum as "tabNum",
    pe.name as "payElName",
    en.orgID as "orgID",
    meg.groupType as "methodGroupType",
    me.code as "methodCode",
    empl.fullFIO AS "fullFIO",
    (select ${sqlDialect.top} dep.name from 
      hr_department dep 
      where dep.mi_data_id = ep.departmentID
      and dep.state = 'ACTIVE' 
      and dep.mi_deleteDate >= '9999-12-31' order by dep.mi_dateTo desc ${sqlDialect.limit}) as "departmentName",
    (select ${sqlDialect.top} dep.code from 
      hr_department dep 
      where dep.mi_data_id = ep.departmentID
      and dep.state = 'ACTIVE' 
      and dep.mi_deleteDate >= '9999-12-31' order by dep.mi_dateTo desc ${sqlDialect.limit}) as "departmentCode",
    ep.departmentID as "departmentID",
    en.ID as "employeeNumberID",
    (select ${sqlDialect.top} f.entryOperationID
      from hr_accrualFund accr
     JOIN hr_payFund f on f.ID = accr.payFundID
      left join hr_accrualFundDt accrDt on accrDt.accrualFundID = accr.ID
      where accr.periodCalcID = a.periodCalcID 
      and en.ID = accr.employeeNumberID 
      and a.payElID = accrDt.payElID ${sqlDialect.limit}) as "entryOperationID",
    dpc.code as "dictProgClassCode",
    dpc.ID as "dictProgClassID",
    adt.dictFundSourceID as "dictFundSourceID",
    fs.name as "dictFundSourceName"
    FROM hr_employeeNumber en
    JOIN hr_accrual a on a.employeeNumberID = en.ID 
    JOIN hr_accrualDt adt on adt.accrualID = a.ID  
    left join hr_payEl pe on pe.ID = a.payElID
    left join hr_method me on me.ID = pe.methodID
    left join hr_methodGroup meg on meg.ID = me.methodGroupID
    left JOIN  hr_employeePosition ep ON 
         ep.ID = (select ${sqlDialect.top} ep2.ID from hr_employeePosition ep2 where 
         ep2.employeeNumberID = en.ID 
         and ep2.isActive = 1
         and ep2.dateFrom <= :periodDateTo:
         and ep2.mi_deleteDate >= '9999-12-31'
         order by ep2.dateFrom desc ${sqlDialect.limit})
    left JOIN hr_employee empl on empl.ID = en.employeeID
    left join ac_dictProgClass dpc on dpc.ID = adt.dictProgClassID
    left join ac_fundSource fs on fs.ID = adt.dictFundSourceID
    WHERE en.orgID ${entityBaseService.getInExpression('orgID')} 
      and a.periodCalcID ${entityBaseService.getInExpression('periodIDs')}  
      and en.mi_deleteDate >= '9999-12-31'
      ${!App.domainInfo.isEntityMethodsAccessible('hr_employeeNumber', 'employeeLimitedAccess') ? 'AND en.limitedAccess = 0' : ''}
      AND (a.flagsRec & 8192 != 8192)      
      AND en.empWorkPlace is null
      ${dictProgClassIDs ? `and adt.dictProgClassID ${entityBaseService.getInExpression('dictProgClassIDs')}` : ''}
      ${dictFundSourceIDs ? `and adt.dictFundSourceID ${entityBaseService.getInExpression('dictFundSourceIDs')}` : ''}
      and pe.ignoreInCalcPay = 0
    group by a.rate, a.payElID, pe.code, empl.fullFIO, pe.description, en.tabNum, en.orgID, me.code, meg.groupType, ep.departmentID, en.ID, pe.name, a.periodCalcID, dpc.ID, dpc.code, adt.dictFundSourceID, fs.name
    order by pe.code
    `, {
    orgID,
    periodIDs,
    periodDateTo: dateService.shiftDate(params.periodTo),
    periodDateFrom: dateService.shiftDate(params.periodFrom),
    dictProgClassIDs,
    dictFundSourceIDs
  })
  let accrual = accrualReq.getAsJsObject()

  const accrualFund = getAccrualFund(orgID, params.periodTo, params.periodFrom, dictProgClassIDs, dictFundSourceIDs, periodIDs)

  const accrualBalance = getAccrualBalance(dictProgClassIDs, dictFundSourceIDs, params.periodTo, periodIDs)
 
  let empData = getEmployeeList(orgID, params.periodTo, params.periodFrom, dictProgClassIDs, dictFundSourceIDs, params.dateReport)

  const timeSheets = getTimeSheet(orgID, params.periodTo, params.periodFrom, dictProgClassIDs, dictFundSourceIDs)

  const getListParam = UB.Repository('hr_listParam')
    .attrs(['ID', 'fullName'])
    .where('code', '=', 'consolidatedStatement')
    .selectAsObject()
  const getIdParams = UB.Repository('hr_idParam')
    .attrs(['listParamID.code', 'listParamID.shortName', 'entryOperationID', 'listParamID'])
    .where('[listParamID]', 'in', getListParam.map(o => o.ID))
    .where('[orgID]', '=', Number(parentOrdID || params.orgID))
    .where('[listParamID.mi_deleteUser]', 'isNull')
    .selectAsObject({ 'listParamID.code': 'code', 'listParamID.shortName': 'shortName' })

  const departmentID = []
  const departmentArr = []
  const organizationDictProgClassArr = []
  let organizationDictFundSourseStr = []
  if (params.joinReport) {
    accrual.forEach(o => {
      if (!departmentID.filter(d => d === o.orgID).length) {
        const curOrg = orgNameArr.find(org => org.ID === o.orgID)
        departmentID.push(o.orgID)
        departmentArr.push({
          departmentID: o.orgID,
          department: curOrg.shortName || curOrg.name,
          departmentCode: curOrg ? curOrg.code : ''
        })
      }
      if (!organizationDictProgClassArr.filter(d => d.dictProgClassID === o.dictProgClassID).length) {
        organizationDictProgClassArr.push({
          dictProgClassID: o.dictProgClassID,
          dictProgClassCode: o.dictProgClassCode || 'Без КПК'
        })
      }
      if (!organizationDictFundSourseStr.filter(d => d.dictFundSourceID === o.dictFundSourceID).length) {
        organizationDictFundSourseStr.push({
          dictFundSourceID: o.dictFundSourceID,
          dictFundSourceName: o.dictFundSourceName || 'Без джерела фінансування'
        })
      }
    })
    accrualFund.forEach(o => {
      if (!departmentID.filter(d => d === o.orgID).length) {
        const curOrg = orgNameArr.find(org => org.ID === o.orgID)
        departmentID.push(o.orgID)
        departmentArr.push({
          departmentID: o.orgID,
          department: curOrg.shortName || curOrg.name,
          departmentCode: curOrg ? curOrg.code : ''
        })
      }
      if (!organizationDictProgClassArr.filter(d => d.dictProgClassID === o.dictProgClassID).length) {
        organizationDictProgClassArr.push({
          dictProgClassID: o.dictProgClassID,
          dictProgClassCode: o.dictProgClassCode || 'Без КПК'
        })
      }
      if (!organizationDictFundSourseStr.filter(d => d.dictFundSourceID === o.dictFundSourceID).length) {
        organizationDictFundSourseStr.push({
          dictFundSourceID: o.dictFundSourceID,
          dictFundSourceName: o.dictFundSourceName || 'Без джерела фінансування'
        })
      }
    })
    accrualBalance.forEach(o => {
      if (!departmentID.filter(d => d === o.orgID).length) {
        const curOrg = orgNameArr.find(org => org.ID === o.orgID)
        departmentID.push(o.orgID)
        departmentArr.push({
          departmentID: o.orgID,
          department: curOrg.shortName || curOrg.name,
          departmentCode: curOrg ? curOrg.code : ''
        })
      }
      if (!organizationDictProgClassArr.filter(d => d.dictProgClassID === o.dictProgClassID).length) {
        organizationDictProgClassArr.push({
          dictProgClassID: o.dictProgClassID,
          dictProgClassCode: o.dictProgClassCode || 'Без КПК'
        })
      }
      if (!organizationDictFundSourseStr.filter(d => d.dictFundSourceID === o.dictFundSourceID).length) {
        organizationDictFundSourseStr.push({
          dictFundSourceID: o.dictFundSourceID,
          dictFundSourceName: o.dictFundSourceName || 'Без джерела фінансування'
        })
      }
    })
    empData.forEach(o => {
      if (!departmentID.filter(d => d === o.orgID).length) {
        const curOrg = orgNameArr.find(org => org.ID === o.orgID)
        departmentID.push(o.orgID)
        departmentArr.push({
          departmentID: o.orgID,
          department: curOrg.shortName || curOrg.name,
          departmentCode: curOrg ? curOrg.code : ''
        })
      }
      if (!organizationDictProgClassArr.filter(d => d.dictProgClassID === o.dictProgClassID).length) {
        organizationDictProgClassArr.push({
          dictProgClassID: o.dictProgClassID,
          dictProgClassCode: o.dictProgClassCode || 'Без КПК'
        })
      }
      if (!organizationDictFundSourseStr.filter(d => d.dictFundSourceID === o.dictFundSourceID).length) {
        organizationDictFundSourseStr.push({
          dictFundSourceID: o.dictFundSourceID,
          dictFundSourceName: o.dictFundSourceName || 'Без джерела фінансування'
        })
      }
    })
  } else {
    accrual.forEach(o => {
      if (!departmentID.filter(d => d === o.departmentID).length) {
        const curOrg = orgNameArr.find(org => org.ID === o.orgID)
        departmentID.push(o.departmentID)
        departmentArr.push({
          departmentID: o.departmentID,
          departmentCode: o.departmentCode,
          department: o.department || 'Підрозділ не призначено',
          orgName: curOrg ? curOrg.name : ''
        })
      }
      if (!organizationDictProgClassArr.filter(d => d.dictProgClassID === o.dictProgClassID).length) {
        organizationDictProgClassArr.push({
          dictProgClassID: o.dictProgClassID,
          dictProgClassCode: o.dictProgClassCode || 'Без КПК'
        })
      }
      if (!organizationDictFundSourseStr.filter(d => d.dictFundSourceID === o.dictFundSourceID).length) {
        organizationDictFundSourseStr.push({
          dictFundSourceID: o.dictFundSourceID,
          dictFundSourceName: o.dictFundSourceName || 'Без джерела фінансування'
        })
      }
    })
    accrualFund.forEach(o => {
      if (!departmentID.filter(d => d === o.departmentID).length) {
        departmentID.push(o.departmentID)
        departmentArr.push({
          departmentID: o.departmentID,
          departmentCode: o.departmentCode,
          department: o.department || 'Підрозділ не призначено'
        })
      }
      if (!organizationDictProgClassArr.filter(d => d.dictProgClassID === o.dictProgClassID).length) {
        organizationDictProgClassArr.push({
          dictProgClassID: o.dictProgClassID,
          dictProgClassCode: o.dictProgClassCode || 'Без КПК'
        })
      }
      if (!organizationDictFundSourseStr.filter(d => d.dictFundSourceID === o.dictFundSourceID).length) {
        organizationDictFundSourseStr.push({
          dictFundSourceID: o.dictFundSourceID,
          dictFundSourceName: o.dictFundSourceName || 'Без джерела фінансування'
        })
      }
    })
    accrualBalance.forEach(o => {
      if (!departmentID.filter(d => d === o.departmentID).length) {
        departmentID.push(o.departmentID)
        departmentArr.push({
          departmentID: o.departmentID,
          departmentCode: o.departmentCode,
          department: o.department || 'Підрозділ не призначено'
        })
      }
      if (!organizationDictProgClassArr.filter(d => d.dictProgClassID === o.dictProgClassID).length) {
        organizationDictProgClassArr.push({
          dictProgClassID: o.dictProgClassID,
          dictProgClassCode: o.dictProgClassCode || 'Без КПК'
        })
      }
      if (!organizationDictFundSourseStr.filter(d => d.dictFundSourceID === o.dictFundSourceID).length) {
        organizationDictFundSourseStr.push({
          dictFundSourceID: o.dictFundSourceID,
          dictFundSourceName: o.dictFundSourceName || 'Без джерела фінансування'
        })
      }
    })
    empData.forEach(o => {
      if (!departmentID.filter(d => d === o.departmentID).length) {
        departmentID.push(o.departmentID)
        departmentArr.push({
          departmentID: o.departmentID,
          departmentCode: o.departmentCode,
          department: o.department || 'Підрозділ не призначено'
        })
      }
      if (!organizationDictProgClassArr.filter(d => d.dictProgClassID === o.dictProgClassID).length) {
        organizationDictProgClassArr.push({
          dictProgClassID: o.dictProgClassID,
          dictProgClassCode: o.dictProgClassCode || 'Без КПК'
        })
      }
      if (!organizationDictFundSourseStr.filter(d => d.dictFundSourceID === o.dictFundSourceID).length) {
        organizationDictFundSourseStr.push({
          dictFundSourceID: o.dictFundSourceID,
          dictFundSourceName: o.dictFundSourceName || 'Без джерела фінансування'
        })
      }
    })
  }
  organizationDictFundSourseStr = organizationDictFundSourseStr.length ? organizationDictFundSourseStr.map(o => o.dictFundSourceName).join(', ') : 'Без джерела фінансування'
  const organizationDictProgClassStr = organizationDictProgClassArr.length ? organizationDictProgClassArr.map(o => o.dictProgClassCode).join(', ') : 'Без КПК'

  function setAccData (accData = [], totalSum, departmentIDs, filterCode) {
    let res = []
    if (!totalSum.length) departmentIDs.forEach(scID => totalSum.push({ paySum: 0 }))

    let curObj
    accData.forEach(obj => {
      if (!res.find(o => o.payElID === obj.payElID)) {
        curObj = Object.assign({}, obj)
        let objsOfPayElID = accData.filter(el => el.payElID === obj.payElID)
        curObj.sum = []
        departmentIDs.forEach((scID, ind) => {
          let accObj = objsOfPayElID.filter(el => el[filterCode] === scID).reduce((sum, curValue) => sum + curValue.paySum, 0) || 0
          let accObjPaySum = currencyService.round(accObj, 2)
          curObj.sum.push({ paySum: accObjPaySum })
          totalSum[ind].paySum = currencyService.round(totalSum[ind].paySum + accObjPaySum, 2)
        })
        curObj.paySum = accData.filter(el => el.payElID === obj.payElID).reduce((sum, curValue) => sum + curValue.paySum, 0)
        res.push(curObj)
      }
    })

    return res
  }
  function setWorkDaysTimeSheet (accData = [], departmentIDs, filterCode) {
    let res = []
    let curArr = []
    const curObj = {}
    departmentIDs.forEach(o => {
      const filterAccDataPaySum = accData.reduce((sum, cur) => {
        return sum + (cur[filterCode] === o ? cur.factDay : 0)
      }, 0)

      filterAccDataPaySum ? curArr.push({ workDays: filterAccDataPaySum }) : curArr.push({ workDays: 0 })
    })
    curObj.totalWorkDays = curArr && curArr.reduce((sum, curValue) => sum + curValue.workDays, 0)
    curObj.sum = curArr
    if (departmentIDs.length) res.push(curObj)
    if (!departmentIDs.length) {
      res = [{
        sum: [{ workDays: 0 }],
        totalWorkDays: 0
      }]
    }
    return res
  }
  function setWorkHoursTimeSheet (accData = [], departmentIDs, filterCode) {
    let res = []
    let curArr = []
    const curObj = {}
    departmentIDs.forEach(o => {
      const filterAccDataPaySum = accData.reduce((sum, cur) => {
        return sum + (cur[filterCode] === o ? cur.factHour : 0)
      }, 0)

      filterAccDataPaySum ? curArr.push({ factHours: filterAccDataPaySum }) : curArr.push({ factHours: 0 })
    })
    curObj.totalFactHours = curArr && curArr.reduce((sum, curValue) => sum + curValue.factHours, 0)
    curObj.sum = curArr
    if (departmentIDs.length) res.push(curObj)
    if (!departmentIDs.length) {
      res = [{
        sum: [{ factHours: 0 }],
        totalFactHours: 0
      }]
    }
    return res
  }
  function setOtherEmpArr (accData = [], departmentIDs) {
    let res = []
    let curArr = []
    const curObj = {}
    departmentIDs.forEach(o => {
      const filterAccData = accData.filter(a => (a[filterCode] === o) || (!a[filterCode] && !o))
      const filterAccDataPaySum = filterAccData.reduce((sum, curValue) => sum + currencyService.round(curValue.rate), 0) || 0

      filterAccData && filterAccData.length ? curArr.push({ employeesAmount: filterAccDataPaySum }) : curArr.push({ employeesAmount: 0 })
    })
    curObj.total = curArr && curArr.reduce((sum, curValue) => sum + (curValue.employeesAmount ? curValue.employeesAmount : 0), 0)
    curObj.sum = curArr
    if (departmentIDs.length) res.push(curObj)
    if (!departmentIDs.length) {
      res = [{
        sum: [{ employeesAmount: 0 }],
        total: 0
      }]
    }
    return res
  }
  function setEmpArr (accData = [], departmentIDs, filterCode) {
    let res = []
    let curArr = []
    const curObj = {}
    departmentIDs.forEach(o => {
      const filterAccData = accData.filter(a => (a[filterCode] === o) || (!a[filterCode] && !o))
      const filterAccDataPaySum = filterAccData.reduce((sum, curValue) => sum + currencyService.round(curValue.employees, 0), 0) || 0

      filterAccData && filterAccData.length ? curArr.push({ employeesAmount: filterAccDataPaySum }) : curArr.push({ employeesAmount: 0 })
    })
    curObj.total = curArr && curArr.reduce((sum, curValue) => currencyService.round(sum + (curValue.employeesAmount ? currencyService.round(curValue.employeesAmount, 0) : 0), 0), 0)
    curObj.sum = curArr
    if (departmentIDs.length) res.push(curObj)
    if (!departmentIDs.length) {
      res = [{
        sum: [{ employeesAmount: 0 }],
        total: 0
      }]
    }
    return res
  }
  function setEmployeeEmount (accData = [], departmentIDs, filterCode) {
    let res = []
    let curArr = []
    const curObj = {}
    departmentIDs.forEach(o => {
      const filterAccData = accData.filter(a => (a[filterCode] === o) || (!a[filterCode] && !o))
      const filterAccDataPaySum = filterAccData.reduce((sum, curValue) => sum + curValue.rate || 0, 0) || 0

      filterAccData && filterAccData.length ? curArr.push({ rate: filterAccDataPaySum }) : curArr.push({ rate: 0 })
    })
    curObj.total = curArr && curArr.reduce((sum, curValue) => sum + curValue.rate, 0)
    curObj.sum = curArr
    if (departmentIDs.length) res.push(curObj)
    if (!departmentIDs.length) {
      res = [{
        sum: [{ rate: 0 }],
        total: 0
      }]
    }
    return res
  }
  function setSortData (accData) {
    return _.sortBy(accData, 'payElName')
  }
  function sortAccrual (accrual, sortArr) {
    return accrual.map(o => {
      const payElSort = sortArr.find(payEl => payEl.payElID === o.payElID)
      o.sortNumber = payElSort ? payElSort.orderN : 0
      return o
    }).sort((a, b) => {
      if (a.sortNumber === 0 && b.sortNumber !== 0) {
        return 1
      } else if (a.sortNumber !== 0 && b.sortNumber === 0) {
        return -1
      } else {
        return a.sortNumber - b.sortNumber
      }
    })
  }
  function setAccBalance (accData = [], arr, filterCode) {
    let res = []
    let curArr = []
    const curObj = {}
    const data = []
    const groupArr = _.groupBy(accData, 'employeeNumberID')
    const employeeNumberKeys = Object.keys(groupArr)
    employeeNumberKeys.forEach(o => {
      const curEmpl = groupArr[o].sort((a,b) => b.dictProgClassID - a.dictProgClassID)
      const curData = curEmpl.reduce((acc, cur, index) => {
        if (!index) {
          acc = Object.assign({}, cur)
        } else if ((!['02', '03'].includes(cur.dictFundTypeCode)) || !cur.dictFundTypeCode) {
          acc.sumFrom += cur.sumFrom
          acc.sumTo += cur.sumTo
        } else if (['02', '03'].includes(cur.dictFundTypeCode)) {
          data.push(cur)
        }
        return acc
      }, {})
      data.push(curData)
    })
    arr.forEach(o => {
      const filterData = data.filter(a => a[filterCode] === o)
      const dataEnterprise = filterData.filter(o => (o.sumFrom > 0) && (!['02', '03'].includes(o.dictFundTypeCode) || !o.dictFundTypeCode))
      const dataSumFrom = filterData.filter(o => (o.sumFrom < 0) && (!['02', '03'].includes(o.dictFundTypeCode) || !o.dictFundTypeCode))
      const dataSocial = filterData.filter(o => o.dictFundTypeCode && (o.dictFundTypeCode === '02'))
      const dataCNPP = filterData.filter(o => o.dictFundTypeCode && (o.dictFundTypeCode === '03'))

      const dataEnterpriseSumTo = filterData.filter(o => (o.sumTo > 0) && (!['02', '03'].includes(o.dictFundTypeCode) || !o.dictFundTypeCode))
      const dataSumFomSumTo = filterData.filter(o => (o.sumTo < 0) && (!['02', '03'].includes(o.dictFundTypeCode) || !o.dictFundTypeCode))

      const filterAccDataSumFrom = dataSumFrom.reduce((sum, curValue) => sum + curValue.sumFrom, 0)
      const filterAccDataEnterprise = dataEnterprise.reduce((sum, curValue) => sum + curValue.sumFrom, 0)
      const filterAccDataSocial = dataSocial.reduce((sum, curValue) => sum + curValue.sumFrom, 0)
      const filterAccDataCNPP = dataCNPP.reduce((sum, curValue) => sum + curValue.sumFrom, 0)

      const filterAccDataSumTo = dataSumFomSumTo.reduce((sum, curValue) => sum + curValue.sumTo, 0)
      const filterAccDataEnterpriseSumTo = dataEnterpriseSumTo.reduce((sum, curValue) => sum + curValue.sumTo, 0)
      const filterAccDataSocialSumTo = dataSocial.reduce((sum, curValue) => sum + curValue.sumTo, 0)
      const filterAccDataCNPPSumTo = dataCNPP.reduce((sum, curValue) => sum + curValue.sumTo, 0)

      filterData && filterData.length ? curArr.push({
        sumFrom: filterAccDataSumFrom,
        sumEnterprise: filterAccDataEnterprise,
        sumSocial: filterAccDataSocial,
        sumCNPP: filterAccDataCNPP,
        sumTo: filterAccDataSumTo,
        sumToEnterprise: filterAccDataEnterpriseSumTo,
        sumToSocial: filterAccDataSocialSumTo,
        sumToCNPP: filterAccDataCNPPSumTo
      }) : curArr.push({
        sumFrom: 0,
        sumEnterprise: 0,
        sumSocial: 0,
        sumCNPP: 0,
        sumTo: 0,
        sumToEnterprise: 0,
        sumToSocial: 0,
        sumToCNPP: 0
      })
    })

    curObj.totalSumFrom = curArr && curArr.reduce((sum, curValue) => currencyService.round(sum + (curValue.sumFrom ? currencyService.round(curValue.sumFrom, 2) : 0), 2), 0)
    curObj.totalSumEnterprise = curArr && curArr.reduce((sum, curValue) => currencyService.round(sum + (curValue.sumEnterprise ? currencyService.round(curValue.sumEnterprise, 2) : 0), 2), 0)
    curObj.totalSumSocial = curArr && curArr.reduce((sum, curValue) => currencyService.round(sum + (curValue.sumSocial ? currencyService.round(curValue.sumSocial, 2) : 0), 2), 0)
    curObj.totalSumCNPP = curArr && curArr.reduce((sum, curValue) => currencyService.round(sum + (curValue.sumCNPP ? currencyService.round(curValue.sumCNPP, 2) : 0), 2), 0)

    curObj.totalSumTo = curArr && curArr.reduce((sum, curValue) => currencyService.round(sum + (curValue.sumTo ? currencyService.round(curValue.sumTo, 2) : 0), 2), 0)
    curObj.totalSumToEnterprise = curArr && curArr.reduce((sum, curValue) => currencyService.round(sum + (curValue.sumToEnterprise ? currencyService.round(curValue.sumToEnterprise, 2) : 0), 2), 0)
    curObj.totalToSumSocial = curArr && curArr.reduce((sum, curValue) => currencyService.round(sum + (curValue.sumToSocial ? currencyService.round(curValue.sumToSocial, 2) : 0), 2), 0)
    curObj.totalToSumCNPP = curArr && curArr.reduce((sum, curValue) => currencyService.round(sum + (curValue.sumToCNPP ? currencyService.round(curValue.sumToCNPP, 2) : 0), 2), 0)

    curObj.sum = curArr
    if (arr.length) res.push(curObj)
    if (!arr.length) {
      res = [{
        sum: [{
          sumFrom: 0,
          sumEnterprise: 0,
          sumSocial: 0,
          sumCNPP: 0,
          sumTo: 0,
          sumToEnterprise: 0,
          sumToSocial: 0,
          sumToCNPP: 0
        }],
        totalSumFrom: 0,
        totalSumEnterprise: 0,
        totalSumSocial: 0,
        totalSumCNPP: 0,
        totalSumTo: 0,
        totalSumToEnterprise: 0,
        totalToSumSocial: 0,
        totalToSumCNPP: 0
      }]
    }
    return res
  }

  function setECBtable (data, listParam, idParams, IDs, filterCode, dataAccrual) {
    const tableTitleArr = ['Загальна сума нарахувань', 'Сума, на яку нараховано ЄСВ', 'Нараховано ЄСВ']
    const tableTotalArr = ['Всього загальна сума нарахувань', 'Всього нараховано для ЄСВ', 'Нараховано ЄСВ']
    const curKeySumArr = ['sourceSum', 'baseSum', 'paySum']

    const res = []
    tableTitleArr.forEach((t, index, array) => {
      const tableList = { titleName: t, tableTotal: tableTotalArr[index] }
      const groupPayEl = []
      const curKeySum = curKeySumArr[index]
      let totalSum = IDs.map(scID => {
        const defObj = {}
        defObj[filterCode] = scID
        defObj.paySum = 0
        return defObj
      })
      let totalDelta = []
      listParam.forEach((o, listIndex, listArr) => {
        let totalGroupSum = IDs.map(scID => {
          const defObj = {}
          defObj[filterCode] = scID
          defObj.paySum = 0
          return defObj
        })
        const entryOperationList = idParams.filter(id => (id.listParamID === o.ID))
        const curData = data.filter(d => entryOperationList.find(p => p.entryOperationID === d.entryOperationID) || (!d.entryOperationID && !listIndex))
        const grouPayFundIDs = []
        const findDeltaArr = dataAccrual.filter(da => !da.sourceSum)
        if (curData.length) {
          curData.forEach(c => {
            if (!grouPayFundIDs.find(gr => (gr.payFundID === c.payFundID) && (gr.rate === c.rate)) && (c.payFundID && c.rate) && (c[curKeySum])) {
              grouPayFundIDs.push({
                payFundID: c.payFundID,
                rate: c.rate
              })
            }
          })
          const obj = {
            fullName: o.fullName,
            groupRowSpan: grouPayFundIDs.length + 1
          }
          let curObj
          grouPayFundIDs.forEach((g, i, arr) => {
            curObj = Object.assign({}, obj)
            curObj.showFullName = !i
            curObj.showTotalGroup = i === (arr.length - 1)
            const curPayData = curData.filter(c => (c.payFundID === g.payFundID) && (c.rate === g.rate))
            if (curPayData.length) {
              curObj.sum = []
              curObj.totalRow = 0
              IDs.forEach(dp => {
                let depAccr = curPayData.filter(c => c[filterCode] === dp)
                let depAccrPaySum = depAccr ? currencyService.round(depAccr.reduce((sum, curValue) => sum + curValue[curKeySum], 0), 2) : 0
                curObj.sum.push({ paySum: depAccrPaySum })
                totalGroupSum.forEach(o => {
                  if (o[filterCode] === dp) o.paySum += currencyService.round(depAccrPaySum, 2)
                })
                totalSum.forEach(o => {
                  if (o[filterCode] === dp) {
                    o.paySum += currencyService.round(depAccrPaySum, 2)
                  }
                })
              })
              curObj.totalGroupSum = totalGroupSum
              curObj.sumTotalGroupSum = totalGroupSum.reduce((acc, cur) => acc + cur.paySum, 0)
              curObj.totalRow = curPayData.reduce((sum, curValue) => sum + curValue[curKeySum], 0)
              curObj.payFundName = curPayData[0].payFundName
              curObj.rate = curPayData[0].rate === 'delta' ? '' : curPayData[0].rate
              curObj.sumTotalSum = totalSum.reduce((acc, cur) => acc + cur.paySum, 0)
              groupPayEl.push(curObj)
            }
          })
        }
        if (listIndex === (listArr.length - 1) && groupPayEl.length) {
          groupPayEl[groupPayEl.length - 1].showTotalSum = (listIndex === (listArr.length - 1))
          if (curKeySum === 'sourceSum') {
            const filterDelta = findDeltaArr.map(o => Object.assign({}, o)).map(o => {
              o.payFundID = 'delta'
              o.rate = 'delta'
              o.sourceSum = o.paySum
              return o
            })
            IDs.forEach(o => {
              const curIDValue = filterDelta.filter(fd => fd[filterCode] === o).reduce((acc, cur, index) => {
                if (!index) {
                  acc[filterCode] = o
                }
                acc.sourceSum += cur.sourceSum
                return acc
              }, { sourceSum: 0 })
              totalDelta.push(curIDValue)
            })
            groupPayEl[groupPayEl.length - 1].showDelta = !!((listIndex === (listArr.length - 1)) && findDeltaArr.length)
            groupPayEl[groupPayEl.length - 1].totalDelta = totalDelta
            groupPayEl[groupPayEl.length - 1].totalDeltaSum = totalDelta.reduce((acc, cur) => acc + cur.sourceSum, 0)
            groupPayEl[groupPayEl.length - 1].sumTotalSum += groupPayEl[groupPayEl.length - 1].totalDeltaSum
          }
        }
      })
      tableList.totalSum = totalSum.map(o => {
        if (totalDelta.length) {
          const totalDeltaSum = totalDelta.find(td => td[filterCode] === o[filterCode])
          o.paySum += totalDeltaSum ? totalDeltaSum.sourceSum : 0
        }
        return o
      })
      tableList.groupPayEl = groupPayEl
      res.push(tableList)
    })
    return res
  }
  function isSecondReport (accrual, varCol, report, curPeriodID) {
    const res = []
    let resObj
    const empArr = accrual.filter(o => (o.payFundMethodCode !== '2') && (o.sourceSum - o.baseSum > 0)).sort((a, b) => a.tabNum - b.tabNum)
    const accrNamesArr = []
    empArr.forEach(o => {
      if (!accrNamesArr.find(a => a.payFundID === o.payFundID)) {
        accrNamesArr.push({
          payFundID: o.payFundID || null,
          printPayElName: o.payFundName || 'Не визначенo',
          totalSourceSum: 0,
          totalDelta: 0,
          totalBaseSum: 0
        })
      }
      o.delta = o.sourceSum - o.baseSum
      o.prevPeriodDelta = o.salarySourceSum - o.salaryBaseSumSum
    })
    const employees = _.groupBy(empArr, 'employeeNumberID')
    const keys = Object.keys(employees)
    keys.forEach((o) => {
      const empData = employees[o]
      const groupEmpData = _.groupBy(empData, 'periodSalaryID')
      const keysGroupEmpData = Object.keys(groupEmpData)
      if (keysGroupEmpData.length > 1) {
        keysGroupEmpData.forEach(k => {
          const curData = groupEmpData[k]
          const payEls = []
          accrNamesArr.forEach((c) => {
            const newObj = Object.assign({}, c)
            const payElSum = curData.filter(e => (e.payFundID === newObj.payFundID) && (e.periodSalaryID === Number(k)))
            newObj.total = 0
            newObj.sourceSum = payElSum.reduce((acc, cur) => acc + cur.sourceSum, 0)
            newObj.baseSum = payElSum.reduce((acc, cur) => acc + cur.baseSum, 0)
            newObj.delta = payElSum.reduce((acc, cur) => acc + cur.delta + (cur.periodSalaryID !== curPeriodID ? cur.prevPeriodDelta : 0), 0)
            c.totalSourceSum += newObj.sourceSum
            c.totalDelta += newObj.delta
            c.totalBaseSum += newObj.baseSum
            payEls.push(newObj)
          })

          const curPerTotalSourceSum = accrual.filter(accrEmpl => (accrEmpl.employeeNumberID === curData[0].employeeNumberID) && (accrEmpl.periodCalcID === Number(k)) && (accrEmpl.periodSalaryID === Number(k))).reduce((acc, cur) => acc + cur.sourceSum, 0) || 0
          const prevPerTotalSourceSum = curData[0].salaryEmplSourceSum
          let salaryPeriodSum
          let periodCalcSum
          if (curData[0].periodCalcID === curData[0].periodSalaryID) {
            periodCalcSum = curPerTotalSourceSum
          } else {
            periodCalcSum = accrual.filter(accrEmpl => (accrEmpl.employeeNumberID === curData[0].employeeNumberID) && (accrEmpl.periodSalaryID === Number(k))).reduce((acc, cur) => acc + cur.sourceSum, 0) || 0
            salaryPeriodSum = prevPerTotalSourceSum
          }
          const totalPerSum = periodCalcSum + (salaryPeriodSum || 0)

          const employee = {
            departmentName: curData[0].departmentName,
            tabNum: curData[0].tabNum,
            fullFIO: curData[0].fullFIO,
            depsColums: varCol,
            periodSalaryName: curData[0].periodSalaryName,
            rate: curData[0].rate,
            salaryPeriodSum,
            periodCalcSum,
            totalPerSum,
            maxBaseECBMaxSum: curData[0].maxBaseECBMaxSum,
            addMinSum: curData.reduce((acc, cur) => acc + cur.addMinSum, 0),
            paySum: curData.reduce((acc, cur) => acc + cur.paySum, 0),
            total: payEls.reduce((acc, cur) => acc + cur.total, 0),
            totalDelta: payEls.reduce((acc, cur) => acc + cur.delta, 0),
            payEls
          }
          res.push(employee)
        })
      } else {
        const payEls = []
        accrNamesArr.forEach((c) => {
          const newObj = Object.assign({}, c)
          const payElSum = empData.filter(e => (e.payFundID === newObj.payFundID))
          newObj.total = 0
          newObj.sourceSum = payElSum.reduce((acc, cur) => acc + cur.sourceSum, 0)
          newObj.baseSum = payElSum.reduce((acc, cur) => acc + cur.baseSum, 0)
          newObj.delta = payElSum.reduce((acc, cur) => acc + cur.delta, 0)
          c.totalSourceSum += newObj.sourceSum
          c.totalDelta += newObj.delta
          c.totalBaseSum += newObj.baseSum
          payEls.push(newObj)
        })

        const curPerTotalSourceSum = accrual.filter(accrEmpl => (accrEmpl.employeeNumberID === empData[0].employeeNumberID) && (accrEmpl.periodCalcID === curPeriodID)).reduce((acc, cur) => acc + cur.sourceSum, 0) || 0
        const prevPerTotalSourceSum = empData[0].salaryEmplSourceSum
        let salaryPeriodSum
        let periodCalcSum
        if (empData[0].periodCalcID === empData[0].periodSalaryID) {
          periodCalcSum = curPerTotalSourceSum
        } else {
          periodCalcSum = accrual.filter(accrEmpl => (accrEmpl.employeeNumberID === empData[0].employeeNumberID) && (accrEmpl.periodSalaryID === curPeriodID)).reduce((acc, cur) => acc + cur.sourceSum, 0) || 0
          salaryPeriodSum = prevPerTotalSourceSum
        }
        const totalPerSum = periodCalcSum + (salaryPeriodSum || 0)
        const employee = {
          departmentName: empData[0].departmentName,
          tabNum: empData[0].tabNum,
          fullFIO: empData[0].fullFIO,
          depsColums: varCol,
          periodSalaryName: empData[0].periodSalaryName,
          rate: empData[0].rate,
          salaryPeriodSum,
          periodCalcSum,
          totalPerSum,
          maxBaseECBMaxSum: empData[0].maxBaseECBMaxSum,
          addMinSum: empData.reduce((acc, cur) => acc + cur.addMinSum, 0),
          paySum: empData.reduce((acc, cur) => acc + cur.paySum, 0),
          total: payEls.reduce((acc, cur) => acc + cur.total, 0),
          totalDelta: payEls.reduce((acc, cur) => acc + cur.delta, 0),
          payEls
        }
        res.push(employee)
      }
    })
    if (accrNamesArr.length) {
      resObj = {
        accrNamesArr,
        empArr: res,
        totalCols: depColumn + 7,
        excessCol: accrNamesArr.length + 1,
        titleCol: accrNamesArr.length + depColumn + 12,
        totalCol: 6 + depColumn,
        amountAccruedAllColumn: allColumn + accrNamesArr.length,
        totalArr: [{
          totalSum: res.reduce((acc, cur) => acc + cur.totalDelta, 0),
          totalSalaryPeriodSum: res.reduce((acc, cur) => acc + (cur.salaryPeriodSum || 0), 0),
          totalPeriodCalcSum: res.reduce((acc, cur) => acc + cur.periodCalcSum, 0),
          totalPerSum: res.reduce((acc, cur) => acc + cur.totalPerSum, 0),
          totalSourceSum: res.reduce((acc, cur) => acc + cur.sourceSum, 0),
          accrNamesArr,
          totalTotalDelta: accrNamesArr.reduce((acc, cur) => acc + cur.totalDelta, 0)
        }]
      }
    }
    return resObj || {
      accrNamesArr: [],
      empArr: res,
      totalCols: depColumn + 7,
      excessCol: 1,
      titleCol: depColumn + 12,
      totalCol: 6 + depColumn,
      amountAccruedAllColumn: allColumn,
      totalArr: [{
        totalSum: null,
        totalSalaryPeriodSum: null,
        totalPeriodCalcSum: null,
        totalBaseSum: null,
        totalSourceSum: null,
        accrNamesArr: [],
        totalTotalDelta: null
      }]
    }
  }
  function isAddPaymentMinBase (accrual, curPeriodID) {
    const empArr = []
    const filterArr = accrual.filter(o => (o.payFundMethodCode === '2') && (!o.isRecSum)).sort((a, b) => a.tabNum - b.tabNum)
    filterArr.forEach(o => {
      const findIndex = empArr.findIndex(e => (e.employeeNumberID === o.employeeNumberID) && (e.rate === o.rate) && (e.periodCalcID === o.periodCalcID) && (e.periodSalaryID === o.periodSalaryID))
      if (findIndex >= 0) {
        empArr[findIndex].paySum += o.paySum
        empArr[findIndex].baseSum += o.baseSum
        empArr[findIndex].sourceSum += o.sourceSum
      } else {
        empArr.push(o)
      }
    })
    empArr.forEach((o, index, arr) => {
      const curPerTotalSourceSum = accrual.filter(accrEmpl => (accrEmpl.employeeNumberID === o.employeeNumberID) && (accrEmpl.periodSalaryID === curPeriodID)).reduce((acc, cur) => acc + cur.sourceSum, 0) || 0
      const prevPerTotalSourceSum = o.salaryEmplSourceSum
      if (o.periodCalcID === o.periodSalaryID) {
        o.periodCalc = curPerTotalSourceSum
      } else {
        o.periodCalc = accrual.filter(accrEmpl => (accrEmpl.employeeNumberID === o.employeeNumberID) && (accrEmpl.periodSalaryID !== curPeriodID)).reduce((acc, cur) => acc + cur.sourceSum, 0) || 0
        o.salaryPeriod = prevPerTotalSourceSum
      }
      o.totalSourceSum = o.periodCalc + (o.salaryPeriod ? o.salaryPeriod : 0)
    })
    return {
      empArr,
      addPaymentMinBaseColumn: 13 + depColumn,
      totalArr: [{
        totalCol: 7 + depColumn,
        totalSalaryPeriodSum: empArr.reduce((acc, cur) => acc + (cur.salaryPeriod ? cur.salaryPeriod : 0), 0),
        totalPeriodCalcSum: empArr.reduce((acc, cur) => acc + cur.periodCalc || 0, 0),
        totalBaseSum: empArr.reduce((acc, cur) => acc + cur.baseSum, 0),
        totalSourceSum: empArr.reduce((acc, cur) => acc + cur.totalSourceSum, 0),
        totalAddMinSum: empArr.reduce((acc, cur) => acc + cur.addMinSum, 0),
        totalPaySum: empArr.reduce((acc, cur) => acc + cur.paySum, 0)
      }]
    }
  }
  function isAmountAccruedSum (accrual, varCol, report) {
    const res = []
    let resObj
    const isDoesNotCountECB = accrual.filter(o => (o.paySum !== o.sourceSum) && o.paySum && !o.sourceSum).sort((a, b) => a.tabNum - b.tabNum)
    const accrNamesArr = []
    isDoesNotCountECB.forEach(o => {
      if (!accrNamesArr.find(a => a.payElID === o.payElID)) {
        accrNamesArr.push({
          payElID: o.payElID || null,
          printPayElName: o.printPayElName || o.payElName || 'Не визначений вид оплати',
          totalSourceSum: 0
        })
      }
    })
    const employeesDoesNotCountECB = _.groupBy(isDoesNotCountECB, 'employeeNumberID')
    const keys = Object.keys(employeesDoesNotCountECB)
    keys.forEach((o) => {
      const empData = employeesDoesNotCountECB[o]
      const payEls = []
      accrNamesArr.forEach((c) => {
        const newObj = Object.assign({}, c)
        const payElSum = empData.filter(e => (e.payFundID === newObj.payFundID))
        newObj.total = 0
        newObj.sourceSum = payElSum.reduce((acc, cur) => acc + (cur.paySum - cur.sourceSum), 0)
        newObj.total += newObj.sourceSum
        c.totalSourceSum += newObj.sourceSum
        payEls.push(newObj)
      })
      const employee = {
        departmentName: empData[0].departmentName,
        tabNum: empData[0].tabNum,
        fullFIO: empData[0].fullFIO,
        depsColums: varCol,
        total: payEls.reduce((acc, cur) => acc + cur.total, 0),
        payEls
      }
      res.push(employee)
    })
    if (accrNamesArr.length) {
      resObj = {
        accrNamesArr,
        empArr: res,
        totalCols: depColumn + 5,
        amountAccruedAllColumn: allColumn + accrNamesArr.length,
        totalArr: [{
          totalSum: res.reduce((acc, cur) => acc + cur.total, 0),
          accrNamesArr
        }]
      }
    }
    return resObj || {
      accrNamesArr: [],
      amountAccruedAllColumn: allColumn,
      empArr: [],
      totalArr: [{
        totalSum: null,
        accrNamesArr
      }],
      totalCols: depColumn + 5
    }
  }

  let report = []
  let payment

  let offtake
  let forpay
  let totalPaySum

  let payDataECB = []
  let totalMaternityLeaveAccrual = []
  let payMaternityLeaveAccruals = []
  let payHospAccruals = []
  let payHospFssAccruals = []
  let totalPaymentSumArr = []
  let totalOfftakeSumArr = []
  let totalForpaySumArr = []
  let balance = []
  let totalPaySumArr = []
  let payDataBaseSum = []
  let payDataAddedSum = []
  let totalBaseSumArr = []
  let payHospBaseSumAccruals = []
  let baseSumHospFssAccruals = []
  let totalBaseSumHospFssAccruals = []
  let payMaternityLeaveBaseSumAccruals = []
  let totalMaternityLeaveBaseSumAccrual = []
  let payHospECBAccruals = []
  let payHospECBFssAccruals = []
  let payMaternityLeaveECBAccruals = []

  let totalPaymentSum = 0
  let totalOfftakeData = 0
  let totalOfftakeSum = 0
  let totalForpaySum = 0
  let totalHospFssSum = 0
  let totalMaternityLeaveSum = 0
  let totalBaseSum = 0
  let totalHospBaseSum = 0
  let totalBaseSumHospFssSum = 0
  let totalMaternityLeaveBaseSum = 0
  let totalPaySumECB = 0
  let totalHospECBSum = 0
  let totalHospFssECBSum = 0
  let totalMaternityLeaveECBSum = 0
  let totalPayDataAddedSum = 0

  let firstRowspan = 0
  let secondHospRowspan = 0
  let firstHospFssRowspan = 0
  let firstMaternityLeaveRowspan = 0
  let firstRowspanBaseSum = 0
  let firstRowspanAddedSum = 0
  let secondHospRowspanBaseSum = 0
  let firstHospFssRowspanBaseSum = 0
  let firstMaternityLeaveBaseSumRowspan = 0
  let firstHospECBRow = 0
  let secondHospECBRow = 0
  let firstRowspanECB = 0
  let firstHospFssECBRow = 0
  let firstMaternityLeaveECBRowspan = 0

  // Перша таблиця
  let paymentData = accrual && accrual.filter(el => el.methodGroupType === 'PAYMENT')
  const offtakeData = accrual && accrual.filter(el => el.methodGroupType === 'OFFTAKE')

  const forpayData = accrual && accrual.filter(el => el.methodGroupType === 'FORPAY')

  totalOfftakeData = offtakeData && offtakeData.reduce((sum, curValue) => currencyService.round(sum + (curValue.paySum ? currencyService.round(curValue.paySum, 2) : 0), 2), 0)
  totalPaymentSum = paymentData && paymentData.reduce((sum, curValue) => currencyService.round(sum + (curValue.paySum ? currencyService.round(curValue.paySum, 2) : 0), 2), 0)
  totalOfftakeSum = offtakeData.reduce((sum, curValue) => currencyService.round(sum + (curValue.paySum ? currencyService.round(curValue.paySum, 2) : 0), 2), 0)
  totalForpaySum = forpayData && forpayData.reduce((sum, curValue) => currencyService.round(sum + (curValue.paySum ? currencyService.round(curValue.paySum, 2) : 0), 2), 0)

  payment = setAccData(paymentData, totalPaymentSumArr, departmentID, filterCode)
  payment = sortAccrual(payment, sortPayElArr)
  offtake = setAccData(offtakeData, totalOfftakeSumArr, departmentID, filterCode)
  forpay = setAccData(forpayData || [], totalForpaySumArr, departmentID, filterCode)
  forpay = setSortData(forpay)
  balance = setAccBalance(accrualBalance, departmentID, filterCode)

  if (!departmentArr.length) {
    departmentArr.push({
      departmentID: '-',
      department: '-'
    })
    totalPaymentSumArr = [{ paySum: 0 }]
    totalOfftakeSumArr = [{ paySum: 0 }]
    totalForpaySumArr = [{ paySum: 0 }]
  }
  const date = new Date()
  const timeReport = date.toLocaleTimeString().slice(0, -3)
  const depColumn = departmentArr.length
  const allColumn = depColumn + 6
  const empArr = setEmpArr(empData.filter((o, i, arr) => arr.findIndex(a => a.employeeID === o.employeeID) === i), departmentID, filterCode)
  const otherEmpArr = setOtherEmpArr(empData.filter((o, i, arr) => ['3'].includes(o.workPlace) && (arr.findIndex(a => a.employeeID === o.employeeID) === i)), departmentID, filterCode)
  const disabledEmpArr = setEmpArr(empData.filter((o, i, arr) => o.employeeDisabilityID && (arr.findIndex(a => a.employeeID === o.employeeID) === i)), departmentID, filterCode)
  const employeeEmount = setEmployeeEmount(empData, departmentID, filterCode)
  const accrualPayment = accrual.filter(o => o.methodGroupType === 'PAYMENT')
  const ECBtable = setECBtable(accrualFund, getListParam, getIdParams, departmentID, filterCode, accrualPayment)
  const result = {
    ECBtable,
    timeReport,
    departmentArr,
    dateReport: `${dateService.formatDate(params.dateReport)} ${timeReport}`,
    periodName: params.periodName,
    orgName: (orgNameArr.find(o => o.ID === params.orgID) && orgNameArr.find(o => o.ID === params.orgID).name) || params.orgName,
    allColumn,
    depColumn,
    payment,
    totalPaymentSumArr,
    totalPaymentSum,
    totalOfftakeData,
    totalOfftakeSum,
    totalOfftakeSumArr,
    forpay,
    totalForpaySum,
    totalForpaySumArr,
    balance,
    totalPaySum,
    totalPaySumArr,
    firstRowspan,
    firstHospRowspan: firstHospFssRowspan + secondHospRowspan,
    secondHospRowspan,
    payHospAccruals,
    payHospFssAccruals,
    totalHospFssSum,
    firstHospFssRowspan,
    payMaternityLeaveAccruals,
    totalMaternityLeaveSum,
    totalMaternityLeaveAccrual,
    firstMaternityLeaveRowspan,
    payDataBaseSum,
    payDataAddedSum,
    totalBaseSumArr,
    firstRowspanBaseSum,
    firstRowspanAddedSum,
    totalBaseSum,
    payHospBaseSumAccruals,
    totalHospBaseSum,
    firstHospRowspanBaseSum: secondHospRowspanBaseSum + firstHospFssRowspanBaseSum,
    secondHospRowspanBaseSum,
    baseSumHospFssAccruals,
    totalBaseSumHospFssAccruals,
    totalBaseSumHospFssSum,
    firstHospFssRowspanBaseSum,
    payMaternityLeaveBaseSumAccruals,
    firstMaternityLeaveBaseSumRowspan,
    totalMaternityLeaveBaseSumAccrual,
    totalMaternityLeaveBaseSum,
    payDataECB,
    totalPaySumECB,
    firstRowspanECB,
    payHospECBAccruals,
    firstHospECBRow,
    secondHospECBRow,
    totalHospECBSum,
    payHospECBFssAccruals,
    totalHospFssECBSum,
    firstHospFssECBRow,
    firstHospECBRowspan: firstHospECBRow + firstHospFssECBRow,
    secondHospECBRowspan: secondHospECBRow,
    payMaternityLeaveECBAccruals,
    firstMaternityLeaveECBRowspan,
    totalMaternityLeaveECBSum,
    totalPayDataAddedSum,
    organizationDictFundSourseStr,
    organizationDictProgClassStr,
    workDaysTimeSheet: setWorkDaysTimeSheet(timeSheets, departmentID, filterCode),
    factHoursTimeSheet: setWorkHoursTimeSheet(timeSheets, departmentID, filterCode),
    empArr,
    otherEmpArr,
    disabledEmpArr,
    employeeEmount,
    offtake,
    showSocialSumFrom: !!balance[0].totalSumSocial,
    showCNPPSumFrom: !!balance[0].totalSumCNPP,
    showSocialSumTo: !!balance[0].totalToSumSocial,
    showCNPPSumTo: !!balance[0].totalToSumCNPP,
    showTotalSumFrom: !!balance[0].totalSumFrom,
    showTotalSumEnterprise: !!balance[0].totalSumEnterprise,
    showTotalSumTo: !!balance[0].totalSumTo,
    showTotalSumToEnterprise: !!balance[0].totalSumToEnterprise,
    titleName: params.joinReport ? 'Організації' : 'Підрозділи',
    depsColums: departmentID.length
  }
  report.push(result)
  if (!params.joinReport) {
    report[0].secondReport = [{
      empArr: accrualFund
    }]
    report[0].amountAccrued = isAmountAccruedSum(accrualPayment, departmentID.length, report)
    report[0].addPaymentMinBase = isAddPaymentMinBase(accrualFund, params.periodID)
    report[0].secondReport = isSecondReport(accrualFund, departmentID.length, report, params.periodID)
    report = setCorRow(report)
  }
  function setCorRow (rep) {
    const allColumnFirtRep = rep[0].allColumn || 0
    const titleColLastRep = (rep[0].secondReport && rep[0].secondReport.titleCol) || 0
    const addPaymentMinBaseColumn = (rep[0].addPaymentMinBase && rep[0].addPaymentMinBase.addPaymentMinBaseColumn) || 0
    const amountAccruedCol = (rep[0].amountAccrued && rep[0].amountAccrued.amountAccruedAllColumn) || 0
    const maxCol = Math.max(allColumnFirtRep, titleColLastRep, addPaymentMinBaseColumn, amountAccruedCol)

    rep[0].firstDeltaCol = allColumnFirtRep < maxCol ? maxCol - allColumnFirtRep : 0
    rep[0].amountColDelta = amountAccruedCol < maxCol ? maxCol - amountAccruedCol : 0
    rep[0].addPaymentMinBaseColumnDelta = addPaymentMinBaseColumn < maxCol ? maxCol - addPaymentMinBaseColumn : 0
    rep[0].titleColLastRepDelta = titleColLastRep < maxCol ? maxCol - titleColLastRep : 0

    return rep
  }
  ctx.mParams.resultData = JSON.stringify({
    report
  })
}
me.getConsolidatedStatementDeductions = ctx => {
  const sqlDialect = entityBaseService.getSQLDialect()
  const params = ctx.mParams.execParams
  const orgIDs = JSON.parse(params.orgIDs)
  orgIDs.push(params.orgID)
  const orgID = params.joinReport && orgIDs.length ? orgIDs : [params.orgID]
  const dictProgClassIDs = params.dictProgClassID.length ? params.dictProgClassID.split(',').map(o => Number(o)) : null
  const dictFundSourceIDs = params.dictFundSourceID.length ? params.dictFundSourceID.split(',').map(o => Number(o)) : null
  const parentOrdID = settingsService.getByCode('hrUseReportSettingsParentOrg', params.orgID)
  const sortPayElArr = UB.Repository('hr_idParam')
    .attrs('payElID', 'orderN')
    .where('listParamID.code', '=', params.sortAccrGrid)
    .where('orgID', '=', parentOrdID || params.orgID)
    .where('mi_deleteUser', 'isNull')
    .selectAsObject()
  const orgNames = UB.Repository('hr_organization')
    .attrs('code', 'name', 'shortName', 'mi_data_id')
    .where('mi_data_id', 'in', orgID)
    .where('state', '=', 'ACTIVE')
    .misc({ __mip_ondate: dateService.shiftDate(params.currDate) })
    .orderBy('mi_dateFrom', 'desc')
    .selectAsObject({ mi_data_id: 'ID' })
  const periodIDs = UB.Repository('hr_dictPeriod')
    .attrs(['ID'])
    .where('orgID', 'in', orgID)
    .where('dateFrom', '=', dateService.shiftDate(params.periodFrom))
    .where('dateTo', '=', dateService.shiftDate(params.periodTo))
    .selectAsArrayOfValues()
  const accrualReq = UB.DataStore('hr_accrual')
  accrualReq.runSQL(`select pe.description as "description", pe.code,
  sum(adt.paySum) as "paySum",
  (select ${sqlDialect.top} accr.rate
    from hr_accrualFund accr
      left join hr_accrualFundDt accrDt on accrDt.accrualFundID = accr.ID
    where accr.periodCalcID = a.periodCalcID 
    and en.ID = accr.employeeNumberID 
    and a.payElID = accrDt.payElID ${sqlDialect.limit}) AS "rate",
    (select ${sqlDialect.top} f.name
      from hr_accrualFund accr
     JOIN hr_payFund f on f.ID = accr.payFundID
      left join hr_accrualFundDt accrDt on accrDt.accrualFundID = accr.ID
      where accr.periodCalcID = a.periodCalcID 
      and en.ID = accr.employeeNumberID 
      and a.payElID = accrDt.payElID ${sqlDialect.limit}) as "payFundName",
    (select sum(accrDt.sourceSum)
      from hr_accrualFund accr
        left join hr_accrualFundDt accrDt on accrDt.accrualFundID = accr.ID
      where accr.periodCalcID = a.periodCalcID 
      and en.ID = accr.employeeNumberID 
      and a.payElID = accrDt.payElID) AS "sourceSum",
  a.payElID as "payElID",
  en.tabNum as "tabNum",
  pe.name as "payElName",
  a.periodCalcID,
  en.orgID as "orgID",
  meg.groupType as "methodGroupType",
  me.code as "methodCode",
  empl.fullFIO AS "fullFIO",
  (select ${sqlDialect.top} dep.name from 
    hr_department dep 
    where dep.mi_data_id = ep.departmentID
    and dep.state = 'ACTIVE' 
    and dep.mi_deleteDate >= '9999-12-31' order by dep.mi_dateTo desc ${sqlDialect.limit}) as "departmentName",
  (select ${sqlDialect.top} dep.code from 
    hr_department dep 
    where dep.mi_data_id = ep.departmentID
    and dep.state = 'ACTIVE' 
    and dep.mi_deleteDate >= '9999-12-31' order by dep.mi_dateTo desc ${sqlDialect.limit}) as "departmentCode",
  ep.departmentID as "departmentID",
  en.ID as "employeeNumberID",
  (select ${sqlDialect.top} f.entryOperationID
    from hr_accrualFund accr
   JOIN hr_payFund f on f.ID = accr.payFundID
    left join hr_accrualFundDt accrDt on accrDt.accrualFundID = accr.ID
    where accr.periodCalcID = a.periodCalcID 
    and en.ID = accr.employeeNumberID 
    and a.payElID = accrDt.payElID ${sqlDialect.limit}) as "entryOperationID",
  dpc.code as "dictProgClassCode",
  dpc.ID as "dictProgClassID",
  adt.dictFundSourceID as "dictFundSourceID",
  fs.name as "dictFundSourceName" 
  FROM hr_employeeNumber en
  JOIN hr_accrual a on a.employeeNumberID = en.ID 
  JOIN hr_accrualDt adt on adt.accrualID = a.ID  
  left join hr_payEl pe on pe.ID = a.payElID
  left join hr_method me on me.ID = pe.methodID
  left join hr_methodGroup meg on meg.ID = me.methodGroupID
  left JOIN  hr_employeePosition ep ON 
       ep.ID = (select ${sqlDialect.top} ep2.ID from hr_employeePosition ep2 where 
       ep2.employeeNumberID = en.ID 
       and ep2.isActive = 1
       and ep2.dateFrom <= :periodDateTo:
       and ep2.mi_deleteDate >= '9999-12-31'
       order by ep2.dateFrom desc ${sqlDialect.limit})
  left JOIN hr_employee empl on empl.ID = en.employeeID
  left join ac_dictProgClass dpc on dpc.ID = adt.dictProgClassID
  left join ac_fundSource fs on fs.ID = adt.dictFundSourceID
  WHERE en.orgID ${entityBaseService.getInExpression('orgID')} 
    and a.periodCalcID ${entityBaseService.getInExpression('periodIDs')}  
    and en.mi_deleteDate >= '9999-12-31'
    ${!App.domainInfo.isEntityMethodsAccessible('hr_employeeNumber', 'employeeLimitedAccess') ? 'AND en.limitedAccess = 0' : ''}
    AND (a.flagsRec & 8192 != 8192)      
    AND en.empWorkPlace is null
    ${dictProgClassIDs ? `and adt.dictProgClassID ${entityBaseService.getInExpression('dictProgClassIDs')}` : ''}
    ${dictFundSourceIDs ? `and adt.dictFundSourceID ${entityBaseService.getInExpression('dictFundSourceIDs')}` : ''}
    and pe.ignoreInCalcPay = 0
  group by a.rate, a.payElID, pe.code, empl.fullFIO, pe.description, en.tabNum, en.orgID, me.code, meg.groupType, ep.departmentID, en.ID, pe.name, a.periodCalcID, dpc.ID, dpc.code, adt.dictFundSourceID, fs.name
  order by pe.code
    `, {
    orgID,
    periodIDs,
    periodDateTo: dateService.shiftDate(params.periodTo),
    periodDateFrom: dateService.shiftDate(params.periodFrom),
    departmentID: params.departmentID,
    dictProgClassIDs,
    dictFundSourceIDs
  })
  let accrual = accrualReq.getAsJsObject()

  const accrualFund = getAccrualFund(orgID, params.periodTo, params.periodFrom, dictProgClassIDs, dictFundSourceIDs, periodIDs)
  const accrualBalance = getAccrualBalance(dictProgClassIDs, dictFundSourceIDs, params.periodTo, periodIDs)

  let emloyeeList = getEmployeeList(orgID, params.periodTo, params.periodFrom, dictProgClassIDs, dictFundSourceIDs, params.dateReport)

  const timeSheets = getTimeSheet(orgID, params.periodTo, params.periodFrom, dictProgClassIDs, dictFundSourceIDs)

  const getListParam = UB.Repository('hr_listParam')
    .attrs(['ID', 'fullName'])
    .where('code', '=', 'consolidatedStatement')
    .selectAsObject()

  const getIdParams = UB.Repository('hr_idParam')
    .attrs(['listParamID.code', 'listParamID.shortName', 'entryOperationID', 'listParamID'])
    .where('[listParamID]', 'in', getListParam.map(o => o.ID))
    .where('[orgID]', '=', Number(parentOrdID || params.orgID))
    .where('[listParamID.mi_deleteUser]', 'isNull')
    .selectAsObject({ 'listParamID.code': 'code', 'listParamID.shortName': 'shortName' })

  let organizationDictFundSourseStr = []
  const orgNameArr = []
  accrual.forEach(o => {
    if (!orgNameArr.find(d => (d.dictProgClassID === o.dictProgClassID) && (d.orgID === o.orgID)) && o.paySum) {
      const curOrg = orgNames.find(org => org.ID === o.orgID)
      orgNameArr.push({
        dictProgClassID: o.dictProgClassID,
        dictProgClassCode: o.dictProgClassCode || 'Без КПК',
        orgName: curOrg.shortName || curOrg.name,
        orgID: o.orgID
      })
    }
    if (!organizationDictFundSourseStr.filter(d => d.dictFundSourceID === o.dictFundSourceID).length) {
      organizationDictFundSourseStr.push({
        dictFundSourceID: o.dictFundSourceID,
        dictFundSourceName: o.dictFundSourceName || 'Без джерела фінансування'
      })
    }
  })
  accrualFund.forEach(o => {
    if (!orgNameArr.find(d => (d.dictProgClassID === o.dictProgClassID) && (d.orgID === o.orgID)) && (o.paySum || o.sourceSum || o.baseSum)) {
      const curOrg = orgNames.find(org => org.ID === o.orgID)
      curOrg && orgNameArr.push({
        dictProgClassID: o.dictProgClassID,
        dictProgClassCode: o.dictProgClassCode || 'Без КПК',
        orgName: curOrg.shortName || curOrg.name,
        orgID: o.orgID
      })
    }
    if (!organizationDictFundSourseStr.filter(d => d.dictFundSourceID === o.dictFundSourceID).length) {
      organizationDictFundSourseStr.push({
        dictFundSourceID: o.dictFundSourceID,
        dictFundSourceName: o.dictFundSourceName || 'Без джерела фінансування'
      })
    }
  })
  accrualBalance.forEach((o, i, arr) => {
    if (!orgNameArr.find(d => (d.dictProgClassID === o.dictProgClassID) && (d.orgID === o.orgID)) && (o.sumFrom || o.sumTo) && (!arr.find(item => (item.employeeNumberID === o.employeeNumberID) && item.dictProgClassID))) {
      const curOrg = orgNames.find(org => org.ID === o.orgID)
      curOrg && orgNameArr.push({
        dictProgClassID: o.dictProgClassID,
        dictProgClassCode: o.dictProgClassCode || 'Без КПК',
        orgName: curOrg.shortName || curOrg.name,
        orgID: o.orgID
      })
      if (!curOrg) {
        o.orgID = orgNameArr[0].orgID
        o.dictProgClassID = orgNameArr[0].dictProgClassID
      }
    }
    if (!organizationDictFundSourseStr.filter(d => d.dictFundSourceID === o.dictFundSourceID).length) {
      organizationDictFundSourseStr.push({
        dictFundSourceID: o.dictFundSourceID,
        dictFundSourceName: o.dictFundSourceName || 'Без джерела фінансування'
      })
    }
  })
  emloyeeList.forEach((o, i, arr) => {
    if (!orgNameArr.find(d => (d.dictProgClassID === o.dictProgClassID) && (d.orgID === o.orgID))) {
      const curOrg = orgNames.find(org => org.ID === o.orgID)
      orgNameArr.push({
        dictProgClassID: o.dictProgClassID,
        dictProgClassCode: o.dictProgClassCode || 'Без КПК',
        orgName: curOrg.shortName || curOrg.name,
        orgID: o.orgID
      })
    }
    if (!organizationDictFundSourseStr.filter(d => d.dictFundSourceID === o.dictFundSourceID).length) {
      organizationDictFundSourseStr.push({
        dictFundSourceID: o.dictFundSourceID,
        dictFundSourceName: o.dictFundSourceName || 'Без джерела фінансування'
      })
    }
  })
  const dictProgClassID = orgNameArr.map(o => o.dictProgClassID)
  const organizationDictProgClassStr = orgNameArr.length ? orgNameArr.map(o => o.dictProgClassCode).join(', ') : 'Без КПК'
  organizationDictFundSourseStr = organizationDictFundSourseStr.length ? organizationDictFundSourseStr.map(o => o.dictFundSourceName).join(', ') : 'Без джерела фінансування'
  function setAccData (accData = [], totalSum, iDsArr) {
    let res = []
    if (!totalSum.length) iDsArr.forEach(scID => totalSum.push({ paySum: 0 }))

    let curObj
    accData.forEach(obj => {
      if (!res.find(o => o.payElID === obj.payElID)) {
        curObj = Object.assign({}, obj)
        let objsOfPayElID = accData.filter(el => el.payElID === obj.payElID)
        curObj.sum = []
        iDsArr.forEach((scID, ind) => {
          let accObj = objsOfPayElID.filter(el => (el.dictProgClassID === scID.dictProgClassID) && (el.orgID === scID.orgID)).reduce((sum, curValue) => sum + curValue.paySum, 0) || 0
          let accObjPaySum = currencyService.round(accObj, 2)
          curObj.sum.push({ paySum: accObjPaySum })
          totalSum[ind].paySum = currencyService.round(totalSum[ind].paySum + accObjPaySum, 2)
        })
        curObj.paySum = accData.filter(el => el.payElID === obj.payElID).reduce((sum, curValue) => sum + curValue.paySum, 0)
        res.push(curObj)
      }
    })
    return res
  }
  function setSortData (accData) {
    return _.sortBy(accData, 'payElName')
  }
  function sortAccrual (accrual, sortArr) {
    return accrual.map(o => {
      const payElSort = sortArr.find(payEl => payEl.payElID === o.payElID)
      o.sortNumber = payElSort ? payElSort.orderN : 0
      return o
    }).sort((a, b) => {
      if (a.sortNumber === 0 && b.sortNumber !== 0) {
        return 1
      } else if (a.sortNumber !== 0 && b.sortNumber === 0) {
        return -1
      } else {
        return a.sortNumber - b.sortNumber
      }
    })
  }

  function setAccBalance (accData = [], iDsArr) {
    let res = []
    let curArr = []
    const curObj = {}
    const data = []
    const groupArr = _.groupBy(accData, 'employeeNumberID')
    const employeeNumberKeys = Object.keys(groupArr)
    employeeNumberKeys.forEach(o => {
      const curEmpl = groupArr[o].sort((a, b) => b.dictProgClassID - a.dictProgClassID)
      const curData = curEmpl.reduce((acc, cur, index) => {
        if (!index) {
          acc = Object.assign({}, cur)
        } else if ((!['02', '03'].includes(cur.dictFundTypeCode)) || !cur.dictFundTypeCode) {
          acc.sumFrom += cur.sumFrom
          acc.sumTo += cur.sumTo
        } else if (['02', '03'].includes(cur.dictFundTypeCode)) {
          data.push(cur)
        }
        return acc
      }, {})
      data.push(curData)
    })
    iDsArr.forEach(o => {
      const filterData = data.filter(a => (a.dictProgClassID === o.dictProgClassID) && (a.orgID === o.orgID))
      const dataEnterprise = filterData.filter(o => (o.sumFrom > 0) && (!['02', '03'].includes(o.dictFundTypeCode) || !o.dictFundTypeCode))
      const dataSumFrom = filterData.filter(o => (o.sumFrom < 0) && (!['02', '03'].includes(o.dictFundTypeCode) || !o.dictFundTypeCode))
      const dataSocial = filterData.filter(o => o.dictFundTypeCode && (o.dictFundTypeCode === '02'))
      const dataCNPP = filterData.filter(o => o.dictFundTypeCode && (o.dictFundTypeCode === '03'))

      const dataEnterpriseSumTo = filterData.filter(o => (o.sumTo > 0) && (!['02', '03'].includes(o.dictFundTypeCode) || !o.dictFundTypeCode))
      const dataSumFomSumTo = filterData.filter(o => (o.sumTo < 0) && (!['02', '03'].includes(o.dictFundTypeCode) || !o.dictFundTypeCode))

      const filterAccDataSumFrom = dataSumFrom.reduce((sum, curValue) => sum + curValue.sumFrom, 0)
      const filterAccDataEnterprise = dataEnterprise.reduce((sum, curValue) => sum + curValue.sumFrom, 0)
      const filterAccDataSocial = dataSocial.reduce((sum, curValue) => sum + curValue.sumFrom, 0)
      const filterAccDataCNPP = dataCNPP.reduce((sum, curValue) => sum + curValue.sumFrom, 0)

      const filterAccDataSumTo = dataSumFomSumTo.reduce((sum, curValue) => sum + curValue.sumTo, 0)
      const filterAccDataEnterpriseSumTo = dataEnterpriseSumTo.reduce((sum, curValue) => sum + curValue.sumTo, 0)
      const filterAccDataSocialSumTo = dataSocial.reduce((sum, curValue) => sum + curValue.sumTo, 0)
      const filterAccDataCNPPSumTo = dataCNPP.reduce((sum, curValue) => sum + curValue.sumTo, 0)

      filterData && filterData.length ? curArr.push({
        sumFrom: filterAccDataSumFrom,
        sumEnterprise: filterAccDataEnterprise,
        sumSocial: filterAccDataSocial,
        sumCNPP: filterAccDataCNPP,
        sumTo: filterAccDataSumTo,
        sumToEnterprise: filterAccDataEnterpriseSumTo,
        sumToSocial: filterAccDataSocialSumTo,
        sumToCNPP: filterAccDataCNPPSumTo
      }) : curArr.push({
        sumFrom: 0,
        sumEnterprise: 0,
        sumSocial: 0,
        sumCNPP: 0,
        sumTo: 0,
        sumToEnterprise: 0,
        sumToSocial: 0,
        sumToCNPP: 0
      })
    })

    curObj.totalSumFrom = curArr && curArr.reduce((sum, curValue) => currencyService.round(sum + (curValue.sumFrom ? currencyService.round(curValue.sumFrom, 2) : 0), 2), 0)
    curObj.totalSumEnterprise = curArr && curArr.reduce((sum, curValue) => currencyService.round(sum + (curValue.sumEnterprise ? currencyService.round(curValue.sumEnterprise, 2) : 0), 2), 0)
    curObj.totalSumSocial = curArr && curArr.reduce((sum, curValue) => currencyService.round(sum + (curValue.sumSocial ? currencyService.round(curValue.sumSocial, 2) : 0), 2), 0)
    curObj.totalSumCNPP = curArr && curArr.reduce((sum, curValue) => currencyService.round(sum + (curValue.sumCNPP ? currencyService.round(curValue.sumCNPP, 2) : 0), 2), 0)

    curObj.totalSumTo = curArr && curArr.reduce((sum, curValue) => currencyService.round(sum + (curValue.sumTo ? currencyService.round(curValue.sumTo, 2) : 0), 2), 0)
    curObj.totalSumToEnterprise = curArr && curArr.reduce((sum, curValue) => currencyService.round(sum + (curValue.sumToEnterprise ? currencyService.round(curValue.sumToEnterprise, 2) : 0), 2), 0)
    curObj.totalToSumSocial = curArr && curArr.reduce((sum, curValue) => currencyService.round(sum + (curValue.sumToSocial ? currencyService.round(curValue.sumToSocial, 2) : 0), 2), 0)
    curObj.totalToSumCNPP = curArr && curArr.reduce((sum, curValue) => currencyService.round(sum + (curValue.sumToCNPP ? currencyService.round(curValue.sumToCNPP, 2) : 0), 2), 0)

    curObj.sum = curArr
    if (iDsArr.length) res.push(curObj)
    if (!iDsArr.length) {
      res = [{
        sum: [{
          sumFrom: 0,
          sumEnterprise: 0,
          sumSocial: 0,
          sumCNPP: 0,
          sumTo: 0,
          sumToEnterprise: 0,
          sumToSocial: 0,
          sumToCNPP: 0
        }],
        totalSumFrom: 0,
        totalSumEnterprise: 0,
        totalSumSocial: 0,
        totalSumCNPP: 0,
        totalSumTo: 0,
        totalSumToEnterprise: 0,
        totalToSumSocial: 0,
        totalToSumCNPP: 0
      }]
    }
    return res
  }
  function setOtherEmpArr (accData = [], iDsArr) {
    let res = []
    let curArr = []
    const curObj = {}
    iDsArr.forEach(o => {
      const filterAccData = accData.filter(a => (a.dictProgClassID === o.dictProgClassID) && (a.orgID === o.orgID))
      const filterAccDataPaySum = filterAccData.reduce((sum, curValue) => sum + currencyService.round(curValue.rate), 0) || 0

      filterAccData && filterAccData.length ? curArr.push({ employeesAmount: filterAccDataPaySum }) : curArr.push({ employeesAmount: 0 })
    })
    curObj.total = curArr && curArr.reduce((sum, curValue) => sum + (curValue.employeesAmount ? curValue.employeesAmount : 0), 0)
    curObj.sum = curArr
    if (iDsArr.length) res.push(curObj)
    if (!iDsArr.length) {
      res = [{
        sum: [{ employeesAmount: 0 }],
        total: 0
      }]
    }
    return res
  }
  function setEmpArr (accData = [], iDsArr) {
    let res = []
    let curArr = []
    const curObj = {}
    iDsArr.forEach(o => {
      const filterAccData = accData.filter(a => (a.dictProgClassID === o.dictProgClassID) && (a.orgID === o.orgID))
      const filterAccDataPaySum = filterAccData.reduce((sum, curValue) => sum + currencyService.round(curValue.employees), 0) || 0

      filterAccData && filterAccData.length ? curArr.push({ employeesAmount: filterAccDataPaySum }) : curArr.push({ employeesAmount: 0 })
    })
    curObj.total = curArr && curArr.reduce((sum, curValue) => sum + (curValue.employeesAmount ? curValue.employeesAmount : 0), 0)
    curObj.sum = curArr
    if (iDsArr.length) res.push(curObj)
    if (!iDsArr.length) {
      res = [{
        sum: [{ employeesAmount: 0 }],
        total: 0
      }]
    }
    return res
  }
  function setEmployeeEmount (accData = [], iDsArr) {
    let res = []
    let curArr = []
    const curObj = {}
    iDsArr.forEach(o => {
      const filterAccData = accData.filter(a => (a.dictProgClassID === o.dictProgClassID) && (a.orgID === o.orgID))
      const filterAccDataPaySum = filterAccData.reduce((sum, curValue) => sum + curValue.rate || 0, 0) || 0

      filterAccData && filterAccData.length ? curArr.push({ rate: filterAccDataPaySum }) : curArr.push({ rate: 0 })
    })
    curObj.total = curArr && curArr.reduce((sum, curValue) => sum + curValue.rate, 0)
    curObj.sum = curArr
    if (iDsArr.length) res.push(curObj)
    if (!iDsArr.length) {
      res = [{
        sum: [{ rate: 0 }],
        total: 0
      }]
    }
    return res
  }
  function setWorkHoursTimeSheet (accData = [], iDsArr) {
    let res = []
    let curArr = []
    const curObj = {}

    iDsArr.forEach(o => {
      const filterAccDataPaySum = accData.reduce((sum, cur) => {
        return sum + ((cur.dictProgClassID === o.dictProgClassID) && (cur.orgID === o.orgID) ? cur.factHour : 0)
      }, 0)
      filterAccDataPaySum ? curArr.push({ factHours: filterAccDataPaySum }) : curArr.push({ factHours: 0 })
    })
    curObj.totalFactHours = curArr && curArr.reduce((sum, curValue) => sum + curValue.factHours, 0)
    curObj.sum = curArr
    if (iDsArr.length) res.push(curObj)
    if (!iDsArr.length) {
      res = [{
        sum: [{ factHours: 0 }],
        totalFactHours: 0
      }]
    }
    return res
  }
  function setWorkDaysTimeSheet (accData = [], iDsArr) {
    let res = []
    let curArr = []
    const curObj = {}
    iDsArr.forEach(o => {
      const filterAccDataPaySum = accData.reduce((sum, cur) => {
        return sum + ((cur.dictProgClassID === o.dictProgClassID) && (cur.orgID === o.orgID) ? cur.factDay : 0)
      }, 0)
      filterAccDataPaySum ? curArr.push({ workDays: filterAccDataPaySum }) : curArr.push({ workDays: 0 })
    })
    curObj.totalWorkDays = curArr && curArr.reduce((sum, curValue) => sum + curValue.workDays, 0)
    curObj.sum = curArr
    if (iDsArr.length) res.push(curObj)
    if (!iDsArr.length) {
      res = [{
        sum: [{ workDays: 0 }],
        totalWorkDays: 0
      }]
    }
    return res
  }

  function setECBtable (data, listParam, idParams, IDs, dataAccrual) {
    const tableTitleArr = ['Загальна сума нарахувань', 'Сума, на яку нараховано ЄСВ', 'Нараховано ЄСВ']
    const tableTotalArr = ['Всього загальна сума нарахувань', 'Всього нараховано для ЄСВ', 'Нараховано ЄСВ']
    const curKeySumArr = ['sourceSum', 'baseSum', 'paySum']

    const res = []
    tableTitleArr.forEach((t, index, array) => {
      const tableList = { titleName: t, tableTotal: tableTotalArr[index] }
      const groupPayEl = []
      const curKeySum = curKeySumArr[index]
      let totalSum = IDs.map(scID => {
        const defObj = {}
        defObj.dictProgClassID = scID.dictProgClassID
        defObj.orgID = scID.orgID
        defObj.paySum = 0
        return defObj
      })
      let totalDelta = []
      listParam.forEach((o, listIndex, listArr) => {
        let totalGroupSum = IDs.map(scID => {
          const defObj = {}
          defObj.dictProgClassID = scID.dictProgClassID
          defObj.orgID = scID.orgID
          defObj.paySum = 0
          return defObj
        })
        const entryOperationList = idParams.filter(id => (id.listParamID === o.ID))
        const curData = data.filter(d => entryOperationList.find(p => p.entryOperationID === d.entryOperationID) || (!d.entryOperationID && !listIndex))
        const grouPayFundIDs = []
        const findDeltaArr = dataAccrual.filter(da => !da.sourceSum)
        if (curData.length) {
          curData.forEach(c => {
            if (!grouPayFundIDs.find(gr => (gr.payFundID === c.payFundID) && (gr.rate === c.rate)) && (c.payFundID && c.rate) && (c[curKeySum])) {
              grouPayFundIDs.push({
                payFundID: c.payFundID,
                rate: c.rate
              })
            }
          })
          const obj = {
            fullName: o.fullName,
            groupRowSpan: grouPayFundIDs.length + 1
          }
          let curObj
          grouPayFundIDs.forEach((g, i, arr) => {
            curObj = Object.assign({}, obj)
            curObj.showFullName = !i
            curObj.showTotalGroup = i === (arr.length - 1)
            const curPayData = curData.filter(c => (c.payFundID === g.payFundID) && (c.rate === g.rate))
            if (curPayData.length) {
              curObj.sum = []
              curObj.totalRow = 0
              IDs.forEach(dp => {
                let depAccr = curPayData.filter(c => (c.dictProgClassID === dp.dictProgClassID) && (c.orgID === dp.orgID))
                let depAccrPaySum = depAccr ? currencyService.round(depAccr.reduce((sum, curValue) => sum + curValue[curKeySum], 0), 2) : 0
                curObj.sum.push({ paySum: depAccrPaySum })
                totalGroupSum.forEach(o => {
                  if ((o.dictProgClassID === dp.dictProgClassID) && (o.orgID === dp.orgID)) o.paySum += currencyService.round(depAccrPaySum, 2)
                })
                totalSum.forEach(o => {
                  if ((o.dictProgClassID === dp.dictProgClassID) && (o.orgID === dp.orgID)) {
                    o.paySum += currencyService.round(depAccrPaySum, 2)
                  }
                })
              })
              curObj.totalGroupSum = totalGroupSum
              curObj.sumTotalGroupSum = totalGroupSum.reduce((acc, cur) => acc + cur.paySum, 0)
              curObj.totalRow = curPayData.reduce((sum, curValue) => sum + curValue[curKeySum], 0)
              curObj.payFundName = curPayData[0].payFundName
              curObj.rate = curPayData[0].rate === 'delta' ? '' : curPayData[0].rate
              curObj.sumTotalSum = totalSum.reduce((acc, cur) => acc + cur.paySum, 0)
              groupPayEl.push(curObj)
            }
          })
        }
        if (listIndex === (listArr.length - 1) && groupPayEl.length) {
          groupPayEl[groupPayEl.length - 1].showTotalSum = (listIndex === (listArr.length - 1))
          if (curKeySum === 'sourceSum') {
            const filterDelta = findDeltaArr.map(o => Object.assign({}, o)).map(o => {
              o.payFundID = 'delta'
              o.rate = 'delta'
              o.sourceSum = o.paySum
              return o
            })
            IDs.forEach(o => {
              const curIDValue = filterDelta.filter(fd => (fd.dictProgClassID === o.dictProgClassID) && (fd.orgID === o.orgID)).reduce((acc, cur, index) => {
                if (!index) {
                  acc.dictProgClassID = o.dictProgClassID
                  acc.orgID = o.orgID
                }
                acc.sourceSum += cur.sourceSum
                return acc
              }, { sourceSum: 0 })
              totalDelta.push(curIDValue)
            })
            groupPayEl[groupPayEl.length - 1].showDelta = !!((listIndex === (listArr.length - 1)) && findDeltaArr.length)
            groupPayEl[groupPayEl.length - 1].totalDelta = totalDelta
            groupPayEl[groupPayEl.length - 1].totalDeltaSum = totalDelta.reduce((acc, cur) => acc + cur.sourceSum, 0)
            groupPayEl[groupPayEl.length - 1].sumTotalSum += groupPayEl[groupPayEl.length - 1].totalDeltaSum
          }
        }
      })
      tableList.totalSum = totalSum.map(o => {
        if (totalDelta.length) {
          const totalDeltaSum = totalDelta.find(td => (o.dictProgClassID === td.dictProgClassID) && (o.orgID === td.orgID))
          o.paySum += totalDeltaSum ? totalDeltaSum.sourceSum : 0
        }
        return o
      })
      tableList.groupPayEl = groupPayEl
      res.push(tableList)
    })
    return res
  }
  function isSecondReport (accrual, varCol, report, curPeriodID) {
    const res = []
    let resObj
    const empArr = accrual.filter(o => (o.payFundMethodCode !== '2') && (o.sourceSum - o.baseSum > 0)).sort((a, b) => a.tabNum - b.tabNum)
    const accrNamesArr = []
    empArr.forEach(o => {
      if (!accrNamesArr.find(a => a.payFundID === o.payFundID)) {
        accrNamesArr.push({
          payFundID: o.payFundID || null,
          printPayElName: o.payFundName || 'Не визначенo',
          totalSourceSum: 0,
          totalDelta: 0,
          totalBaseSum: 0
        })
      }
      o.delta = o.sourceSum - o.baseSum
      o.prevPeriodDelta = o.salarySourceSum - o.salaryBaseSumSum
    })
    const employees = _.groupBy(empArr, 'employeeNumberID')
    const keys = Object.keys(employees)
    keys.forEach((o) => {
      const empData = employees[o]
      const groupEmpData = _.groupBy(empData, 'periodSalaryID')
      const keysGroupEmpData = Object.keys(groupEmpData)
      if (keysGroupEmpData.length > 1) {
        keysGroupEmpData.forEach(k => {
          const curData = groupEmpData[k]
          const payEls = []
          accrNamesArr.forEach((c) => {
            const newObj = Object.assign({}, c)
            const payElSum = curData.filter(e => (e.payFundID === newObj.payFundID) && (e.periodSalaryID === Number(k)))
            newObj.total = 0
            newObj.sourceSum = payElSum.reduce((acc, cur) => acc + cur.sourceSum, 0)
            newObj.baseSum = payElSum.reduce((acc, cur) => acc + cur.baseSum, 0)
            newObj.delta = payElSum.reduce((acc, cur) => acc + cur.delta + (cur.periodSalaryID !== curPeriodID ? cur.prevPeriodDelta : 0), 0)
            c.totalSourceSum += newObj.sourceSum
            c.totalDelta += newObj.delta
            c.totalBaseSum += newObj.baseSum
            payEls.push(newObj)
          })

          const curPerTotalSourceSum = accrual.filter(accrEmpl => (accrEmpl.employeeNumberID === curData[0].employeeNumberID) && (accrEmpl.periodCalcID === Number(k)) && (accrEmpl.periodSalaryID === Number(k))).reduce((acc, cur) => acc + cur.sourceSum, 0) || 0
          const prevPerTotalSourceSum = curData[0].salaryEmplSourceSum
          let salaryPeriodSum
          let periodCalcSum
          if (curData[0].periodCalcID === curData[0].periodSalaryID) {
            periodCalcSum = curPerTotalSourceSum
          } else {
            periodCalcSum = accrual.filter(accrEmpl => (accrEmpl.employeeNumberID === curData[0].employeeNumberID) && (accrEmpl.periodSalaryID === Number(k))).reduce((acc, cur) => acc + cur.sourceSum, 0) || 0
            salaryPeriodSum = prevPerTotalSourceSum
          }
          const totalPerSum = periodCalcSum + (salaryPeriodSum || 0)

          const employee = {
            departmentName: curData[0].departmentName,
            tabNum: curData[0].tabNum,
            fullFIO: curData[0].fullFIO,
            depsColums: varCol,
            periodSalaryName: curData[0].periodSalaryName,
            rate: curData[0].rate,
            salaryPeriodSum,
            periodCalcSum,
            totalPerSum,
            maxBaseECBMaxSum: curData[0].maxBaseECBMaxSum,
            addMinSum: curData.reduce((acc, cur) => acc + cur.addMinSum, 0),
            paySum: curData.reduce((acc, cur) => acc + cur.paySum, 0),
            total: payEls.reduce((acc, cur) => acc + cur.total, 0),
            totalDelta: payEls.reduce((acc, cur) => acc + cur.delta, 0),
            payEls
          }
          res.push(employee)
        })
      } else {
        const payEls = []
        accrNamesArr.forEach((c) => {
          const newObj = Object.assign({}, c)
          const payElSum = empData.filter(e => (e.payFundID === newObj.payFundID))
          newObj.total = 0
          newObj.sourceSum = payElSum.reduce((acc, cur) => acc + cur.sourceSum, 0)
          newObj.baseSum = payElSum.reduce((acc, cur) => acc + cur.baseSum, 0)
          newObj.delta = payElSum.reduce((acc, cur) => acc + cur.delta, 0)
          c.totalSourceSum += newObj.sourceSum
          c.totalDelta += newObj.delta
          c.totalBaseSum += newObj.baseSum
          payEls.push(newObj)
        })

        const curPerTotalSourceSum = accrual.filter(accrEmpl => (accrEmpl.employeeNumberID === empData[0].employeeNumberID) && (accrEmpl.periodCalcID === curPeriodID)).reduce((acc, cur) => acc + cur.sourceSum, 0) || 0
        const prevPerTotalSourceSum = empData[0].salaryEmplSourceSum
        let salaryPeriodSum
        let periodCalcSum
        if (empData[0].periodCalcID === empData[0].periodSalaryID) {
          periodCalcSum = curPerTotalSourceSum
        } else {
          periodCalcSum = accrual.filter(accrEmpl => (accrEmpl.employeeNumberID === empData[0].employeeNumberID) && (accrEmpl.periodSalaryID === curPeriodID)).reduce((acc, cur) => acc + cur.sourceSum, 0) || 0
          salaryPeriodSum = prevPerTotalSourceSum
        }
        const totalPerSum = periodCalcSum + (salaryPeriodSum || 0)
        const employee = {
          departmentName: empData[0].departmentName,
          tabNum: empData[0].tabNum,
          fullFIO: empData[0].fullFIO,
          depsColums: varCol,
          periodSalaryName: empData[0].periodSalaryName,
          rate: empData[0].rate,
          salaryPeriodSum,
          periodCalcSum,
          totalPerSum,
          maxBaseECBMaxSum: empData[0].maxBaseECBMaxSum,
          addMinSum: empData.reduce((acc, cur) => acc + cur.addMinSum, 0),
          paySum: empData.reduce((acc, cur) => acc + cur.paySum, 0),
          total: payEls.reduce((acc, cur) => acc + cur.total, 0),
          totalDelta: payEls.reduce((acc, cur) => acc + cur.delta, 0),
          payEls
        }
        res.push(employee)
      }
    })
    if (accrNamesArr.length) {
      resObj = {
        accrNamesArr,
        empArr: res,
        totalCols: orgColumn + 7,
        excessCol: accrNamesArr.length + 1,
        titleCol: accrNamesArr.length + orgColumn + 12,
        totalCol: 6 + orgColumn,
        amountAccruedAllColumn: allColumn + accrNamesArr.length,
        totalArr: [{
          totalSum: res.reduce((acc, cur) => acc + cur.totalDelta, 0),
          totalSalaryPeriodSum: res.reduce((acc, cur) => acc + (cur.salaryPeriodSum || 0), 0),
          totalPeriodCalcSum: res.reduce((acc, cur) => acc + cur.periodCalcSum, 0),
          totalPerSum: res.reduce((acc, cur) => acc + cur.totalPerSum, 0),
          totalSourceSum: res.reduce((acc, cur) => acc + cur.sourceSum, 0),
          accrNamesArr,
          totalTotalDelta: accrNamesArr.reduce((acc, cur) => acc + cur.totalDelta, 0)
        }]
      }
    }
    return resObj || {
      accrNamesArr: [],
      empArr: res,
      totalCols: orgColumn + 7,
      excessCol: 1,
      titleCol: orgColumn + 12,
      totalCol: 6 + orgColumn,
      amountAccruedAllColumn: allColumn,
      totalArr: [{
        totalSum: null,
        totalSalaryPeriodSum: null,
        totalPeriodCalcSum: null,
        totalBaseSum: null,
        totalSourceSum: null,
        accrNamesArr: [],
        totalTotalDelta: null
      }]
    }
  }
  function isAddPaymentMinBase (accrual, curPeriodID) {
    const empArr = []
    const filterArr = accrual.filter(o => (o.payFundMethodCode === '2') && (!o.isRecSum)).sort((a, b) => a.tabNum - b.tabNum)
    filterArr.forEach(o => {
      const findIndex = empArr.findIndex(e => (e.employeeNumberID === o.employeeNumberID) && (e.rate === o.rate) && (e.periodCalcID === o.periodCalcID) && (e.periodSalaryID === o.periodSalaryID))
      if (findIndex >= 0) {
        empArr[findIndex].paySum += o.paySum
        empArr[findIndex].baseSum += o.baseSum
        empArr[findIndex].sourceSum += o.sourceSum
      } else {
        empArr.push(o)
      }
    })
    empArr.forEach((o, index, arr) => {
      const curPerTotalSourceSum = accrual.filter(accrEmpl => (accrEmpl.employeeNumberID === o.employeeNumberID) && (accrEmpl.periodSalaryID === curPeriodID)).reduce((acc, cur) => acc + cur.sourceSum, 0) || 0
      const prevPerTotalSourceSum = o.salaryEmplSourceSum
      if (o.periodCalcID === o.periodSalaryID) {
        o.periodCalc = curPerTotalSourceSum
      } else {
        o.periodCalc = accrual.filter(accrEmpl => (accrEmpl.employeeNumberID === o.employeeNumberID) && (accrEmpl.periodSalaryID !== curPeriodID)).reduce((acc, cur) => acc + cur.sourceSum, 0) || 0
        o.salaryPeriod = prevPerTotalSourceSum
      }
      o.totalSourceSum = o.periodCalc + (o.salaryPeriod ? o.salaryPeriod : 0)
    })
    return {
      empArr,
      addPaymentMinBaseColumn: 13 + orgColumn,
      totalArr: [{
        totalCol: 7 + orgColumn,
        totalSalaryPeriodSum: empArr.reduce((acc, cur) => acc + (cur.salaryPeriod ? cur.salaryPeriod : 0) || 0, 0),
        totalPeriodCalcSum: empArr.reduce((acc, cur) => acc + cur.periodCalc || 0, 0),
        totalBaseSum: empArr.reduce((acc, cur) => acc + cur.baseSum, 0),
        totalSourceSum: empArr.reduce((acc, cur) => acc + cur.totalSourceSum, 0),
        totalAddMinSum: empArr.reduce((acc, cur) => acc + cur.addMinSum, 0),
        totalPaySum: empArr.reduce((acc, cur) => acc + cur.paySum, 0)
      }]
    }
  }
  function isAmountAccruedSum (accrual, varCol, report) {
    const res = []
    let resObj
    const isDoesNotCountECB = accrual.filter(o => (o.paySum !== o.sourceSum) && o.paySum && !o.sourceSum).sort((a, b) => a.tabNum - b.tabNum)
    const accrNamesArr = []
    isDoesNotCountECB.forEach(o => {
      if (!accrNamesArr.find(a => a.payElID === o.payElID)) {
        accrNamesArr.push({
          payElID: o.payElID || null,
          printPayElName: o.printPayElName || o.payElName || 'Не визначений вид оплати',
          totalSourceSum: 0
        })
      }
    })
    const employeesDoesNotCountECB = _.groupBy(isDoesNotCountECB, 'employeeNumberID')
    const keys = Object.keys(employeesDoesNotCountECB)
    keys.forEach((o) => {
      const empData = employeesDoesNotCountECB[o]
      const payEls = []
      accrNamesArr.forEach((c) => {
        const newObj = Object.assign({}, c)
        const payElSum = empData.filter(e => (e.payFundID === newObj.payFundID))
        newObj.total = 0
        newObj.sourceSum = payElSum.reduce((acc, cur) => acc + (cur.paySum - cur.sourceSum), 0)
        newObj.total += newObj.sourceSum
        c.totalSourceSum += newObj.sourceSum
        payEls.push(newObj)
      })
      const employee = {
        departmentName: empData[0].departmentName,
        tabNum: empData[0].tabNum,
        fullFIO: empData[0].fullFIO,
        depsColums: varCol,
        total: payEls.reduce((acc, cur) => acc + cur.total, 0),
        payEls
      }
      res.push(employee)
    })
    if (accrNamesArr.length) {
      resObj = {
        accrNamesArr,
        empArr: res,
        totalCols: orgColumn + 5,
        amountAccruedAllColumn: allColumn + accrNamesArr.length,
        totalArr: [{
          totalSum: res.reduce((acc, cur) => acc + cur.total, 0),
          accrNamesArr
        }]
      }
    }
    return resObj || {
      accrNamesArr: [],
      amountAccruedAllColumn: allColumn,
      empArr: [],
      totalArr: [{
        totalSum: null,
        accrNamesArr
      }],
      totalCols: orgColumn + 5
    }
  }
  function setCorRow (rep) {
    const allColumnFirtRep = rep[0].allColumn || 0
    const titleColLastRep = (rep[0].secondReport && rep[0].secondReport.titleCol) || 0
    const addPaymentMinBaseColumn = (rep[0].addPaymentMinBase && rep[0].addPaymentMinBase.addPaymentMinBaseColumn) || 0
    const amountAccruedCol = (rep[0].amountAccrued && rep[0].amountAccrued.amountAccruedAllColumn) || 0
    const maxCol = Math.max(allColumnFirtRep, titleColLastRep, addPaymentMinBaseColumn, amountAccruedCol)

    rep[0].firstDeltaCol = allColumnFirtRep < maxCol ? maxCol - allColumnFirtRep : 0
    rep[0].amountColDelta = amountAccruedCol < maxCol ? maxCol - amountAccruedCol : 0
    rep[0].addPaymentMinBaseColumnDelta = addPaymentMinBaseColumn < maxCol ? maxCol - addPaymentMinBaseColumn : 0
    rep[0].titleColLastRepDelta = titleColLastRep < maxCol ? maxCol - titleColLastRep : 0

    return rep
  }
  let report = []
  let payment
  let offtake
  let forpay
  let totalPaySum

  let payDataECB = []
  let totalMaternityLeaveAccrual = []
  let payMaternityLeaveAccruals = []
  let payHospAccruals = []
  let payHospFssAccruals = []
  let totalPaymentSumArr = []
  let totalOfftakeSumPDFOArr = []
  let totalOfftakeSumArmyArr = []
  let totalOfftakeSumArr = []
  let totalForpaySumArr = []
  let balance = []
  let totalPaySumArr = []
  let payData = []
  let payDataBaseSum = []
  let totalBaseSumArr = []
  let payHospBaseSumAccruals = []
  let baseSumHospFssAccruals = []
  let totalBaseSumHospFssAccruals = []
  let payMaternityLeaveBaseSumAccruals = []
  let totalMaternityLeaveBaseSumAccrual = []
  let payHospECBAccruals = []
  let payHospECBFssAccruals = []
  let payMaternityLeaveECBAccruals = []
  let payDataAddedSum = []
  let totalPaymentSum = 0
  let totalOfftake = 0
  let totalOfftakeSum = 0
  let totalForpaySum = 0
  let totalHospFssSum = 0
  let totalMaternityLeaveSum = 0
  let totalBaseSum = 0
  let totalHospBaseSum = 0
  let totalBaseSumHospFssSum = 0
  let totalMaternityLeaveBaseSum = 0
  let totalPaySumECB = 0
  let totalHospECBSum = 0
  let totalHospFssECBSum = 0
  let totalMaternityLeaveECBSum = 0

  let firstRowspan = 0
  let secondHospRowspan = 0
  let firstHospFssRowspan = 0
  let firstMaternityLeaveRowspan = 0
  let firstRowspanBaseSum = 0

  let secondHospRowspanBaseSum = 0
  let firstHospFssRowspanBaseSum = 0
  let firstMaternityLeaveBaseSumRowspan = 0
  let firstHospECBRow = 0
  let secondHospECBRow = 0
  let firstRowspanECB = 0
  let firstHospFssECBRow = 0
  let firstMaternityLeaveECBRowspan = 0
  let totalPayDataAddedSum = 0
  let firstRowspanAddedSum = 0

  // Перша таблиця
  let paymentData = accrual && accrual.filter(el => el.methodGroupType === 'PAYMENT')
  const offtakeData = accrual && accrual.filter(el => el.methodGroupType === 'OFFTAKE')
  const forpayData = accrual && accrual.filter(el => el.methodGroupType === 'FORPAY')

  totalOfftake = offtakeData && offtakeData.reduce((sum, curValue) => currencyService.round(sum + (curValue.paySum ? currencyService.round(curValue.paySum, 2) : 0), 2), 0)
  totalPaymentSum = paymentData && paymentData.reduce((sum, curValue) => currencyService.round(sum + (curValue.paySum ? currencyService.round(curValue.paySum, 2) : 0), 2), 0)
  totalOfftakeSum = offtakeData.reduce((sum, curValue) => currencyService.round(sum + (curValue.paySum ? currencyService.round(curValue.paySum, 2) : 0), 2), 0)
  totalForpaySum = forpayData && forpayData.reduce((sum, curValue) => currencyService.round(sum + (curValue.paySum ? currencyService.round(curValue.paySum, 2) : 0), 2), 0)

  payment = setAccData(paymentData, totalPaymentSumArr, orgNameArr)
  payment = sortAccrual(payment, sortPayElArr)
  offtake = setAccData(offtakeData, totalOfftakeSumArr, orgNameArr)
  forpay = setAccData(forpayData || [], totalForpaySumArr, orgNameArr)
  forpay = setSortData(forpay)
  balance = setAccBalance(accrualBalance, orgNameArr)

  // Друга таблиця

  if (!orgNameArr.length) {
    orgNameArr.push({
      dictProgClassCode: '-'
    })
    totalPaymentSumArr = [{ paySum: 0 }]
    totalOfftakeSumPDFOArr = [{ paySum: 0 }]
    totalOfftakeSumArmyArr = [{ paySum: 0 }]
    totalOfftakeSumArr = [{ paySum: 0 }]
    totalForpaySumArr = [{ paySum: 0 }]
  }

  const date = new Date()
  const timeReport = date.toLocaleTimeString().slice(0, -3)
  const orgColumn = orgNameArr.length
  const allColumn = orgColumn + 6
  const accrualPayment = accrual.filter(o => o.methodGroupType === 'PAYMENT')

  const ECBtable = setECBtable(accrualFund, getListParam, getIdParams, orgNameArr, accrualPayment)

  const result = {
    ECBtable,
    timeReport,
    orgNameArr,
    dateReport: `${dateService.formatDate(params.dateReport)} ${timeReport}`,
    periodName: params.periodName,
    orgName: (orgNameArr.find(o => o.ID === params.orgID) && orgNameArr.find(o => o.ID === params.orgID).name) || params.orgName,
    allColumn,
    orgColumn,
    payment,
    totalPaymentSumArr,
    totalPaymentSum,
    totalOfftakeSumPDFOArr,
    totalOfftakeSumArmyArr,
    offtake,
    totalOfftake,
    totalOfftakeSum,
    totalOfftakeSumArr,
    forpay,
    totalForpaySum,
    totalForpaySumArr,
    balance,
    totalPaySum,
    totalPaySumArr,
    payData,
    firstRowspan,
    firstHospRowspan: firstHospFssRowspan + secondHospRowspan,
    secondHospRowspan,
    payHospAccruals,
    payHospFssAccruals,
    totalHospFssSum,
    firstHospFssRowspan,
    payMaternityLeaveAccruals,
    totalMaternityLeaveSum,
    totalMaternityLeaveAccrual,
    firstMaternityLeaveRowspan,
    payDataBaseSum,
    totalBaseSumArr,
    firstRowspanBaseSum,
    totalBaseSum,
    payHospBaseSumAccruals,
    totalHospBaseSum,
    firstHospRowspanBaseSum: secondHospRowspanBaseSum + secondHospRowspanBaseSum,
    secondHospRowspanBaseSum,
    baseSumHospFssAccruals,
    totalBaseSumHospFssAccruals,
    totalBaseSumHospFssSum,
    firstHospFssRowspanBaseSum,
    payMaternityLeaveBaseSumAccruals,
    firstMaternityLeaveBaseSumRowspan,
    totalMaternityLeaveBaseSumAccrual,
    totalMaternityLeaveBaseSum,
    payDataECB,
    totalPaySumECB,
    firstRowspanECB,
    payHospECBAccruals,
    firstHospECBRow,
    secondHospECBRow,
    totalHospECBSum,
    payHospECBFssAccruals,
    totalHospFssECBSum,
    firstHospFssECBRow,
    firstHospECBRowspan: firstHospECBRow + firstHospFssECBRow,
    payMaternityLeaveECBAccruals,
    firstMaternityLeaveECBRowspan,
    totalMaternityLeaveECBSum,
    totalPayDataAddedSum,
    employeeEmount: setEmployeeEmount(emloyeeList, orgNameArr),
    empArr: setEmpArr(emloyeeList.filter((o, i, arr) => arr.findIndex(a => a.employeeID === o.employeeID) === i), orgNameArr),
    disabledEmpArr: setEmpArr(emloyeeList.filter((o, i, arr) => o.employeeDisabilityID && (arr.findIndex(a => a.employeeID === o.employeeID) === i)), orgNameArr),
    otherEmpArr: setOtherEmpArr(emloyeeList.filter((o, i, arr) => ['3'].includes(o.workPlace) && (arr.findIndex(a => a.employeeID === o.employeeID) === i)), orgNameArr),
    factHoursTimeSheet: setWorkHoursTimeSheet(timeSheets, orgNameArr),
    workDaysTimeSheet: setWorkDaysTimeSheet(timeSheets, orgNameArr),
    payDataAddedSum,
    firstRowspanAddedSum,
    showSocialSumFrom: !!balance[0].totalSumSocial,
    showCNPPSumFrom: !!balance[0].totalSumCNPP,
    showSocialSumTo: !!balance[0].totalToSumSocial,
    showCNPPSumTo: !!balance[0].totalToSumCNPP,
    showTotalSumFrom: !!balance[0].totalSumFrom,
    showTotalSumEnterprise: !!balance[0].totalSumEnterprise,
    showTotalSumTo: !!balance[0].totalSumTo,
    showTotalSumToEnterprise: !!balance[0].totalSumToEnterprise,
    organizationDictProgClassStr,
    organizationDictFundSourseStr
  }
  report.push(result)

  if (!params.joinReport) {
    report[0].secondReport = [{
      empArr: accrualFund
    }]
    report[0].amountAccrued = isAmountAccruedSum(accrualPayment, dictProgClassID.length, report)
    report[0].addPaymentMinBase = isAddPaymentMinBase(accrualFund, params.periodID)
    report[0].secondReport = isSecondReport(accrualFund, dictProgClassID.length, report, params.periodID)
    report = setCorRow(report)
  }

  ctx.mParams.resultData = JSON.stringify({
    report
  })
}
me.getTimesheet = ctx => {
  const params = ctx.mParams.execParams
  const orgID = params.organization
  const periodFrom = params.periodFrom
  const periodTo = params.periodTo
  const employee = UB.Repository('hr_employeeNumberSR')
    .attrs(['tabNum', 'employeePositionID.dictPositionID', 'ID', 'employeeID', 'employeeID.shortFIO', 'posName', 'tabNumSort', 'mtCount', 'dateFrom', 'dateTo', 'accrualSum', 'empWorkPlace', 'tabNumMain', 'dateToEmpty'])
    .where('orgID', '=', orgID)
    .where('dateToEmpty', 'isNull', undefined, 'cond1')
    .where('dateToEmpty', '<=', dateService.shiftDate(params.periodTo), 'cond2')
    .where('dateToEmpty', '>=', dateService.shiftDate(params.periodFrom), 'cond3')
    .whereIf(params.dictStaffSubCatID && params.dictStaffSubCatID.length, 'employeePositionID.dictPositionID.dictStaffSubCatID', 'in', params.dictStaffSubCatID.split(',').map(o => Number(o)))
    .where('employeePositionID.dateFrom', '<=', dateService.shiftDate(periodTo))
    .logic('(([cond1]) or (([cond2] and [cond3])))')
    .orderBy('tabNumSort')
    .selectAsObject({ 'ID': 'employeeNumberID', 'employeeID.shortFIO': 'shortFIO', 'posName': 'dictPositionName', 'employeePositionID.dictPositionID': 'dictPositionID', 'mtCount': 'rate', 'dateTo': 'employeeNumberDateTo', 'accrualSum': 'paymentSum' })

  const employeeIDs = employee.filter((o, i, arr) => arr.findIndex(el => el.employeeID === o.employeeID) === i).map((o, i, arr) => o.employeeID)
  const trfPosition = UB.Repository('trf_position')
    .attrs(['workPlaceID.employeeNumberID.employeeID', 'dictPositionID.name', 'dictPositionID', 'accrualSum', 'workPlaceID.employeeNumberID.tabNum', 'workPlaceID.employeeNumberID', 'rate', 'workPlaceID.employeeNumberID.tabNumMain', 'workPlaceID.employeeNumberID.empWorkPlace', 'workPlaceID.employeeNumberID.tabNumSort'])
    .where('workPlaceID.documentID.orgID', '=', orgID)
    .where('workPlaceID.employeeNumberID.employeeID', 'in', employeeIDs)
    .whereIf(params.dictStaffSubCatID && params.dictStaffSubCatID.length, 'dictPositionID.dictStaffSubCatID', 'in', params.dictStaffSubCatID.split(',').map(o => Number(o)))
    .where('workPlaceID.dateTo', '>=', dateService.shiftDate(params.periodFrom))
    .where('workPlaceID.documentID.type', '=', 'FACT')
    .where('workPlaceID.state', '=', 'POSTED')
    .selectAsObject({ 'workPlaceID.employeeNumberID.employeeID': 'employeeID', 'workPlaceID.employeeNumberID.tabNum': 'tabNum', 'workPlaceID.employeeNumberID': 'employeeNumberID', 'workPlaceID.employeeNumberID.tabNumMain': 'tabNumMain', 'workPlaceID.employeeNumberID.empWorkPlace': 'empWorkPlace', 'workPlaceID.employeeNumberID.tabNumSort': 'tabNumSort' })

  const maternityLeaveEmpl = UB.Repository('hr_employeeAccrual')
    .attrs(['employeeNumberID.employeeID', 'employeeNumberID.employeeID.shortFIO', 'employeeNumberID.posName', 'employeeNumberID.tabNum', 'employeeNumberID.tabNumSort', 'employeeNumberID.employeePositionID.dictPositionID', 'employeeNumberID.mtCount', 'employeeNumberID.accrualSum', 'employeeNumberID.dateTo', 'dateFrom', 'dateTo', 'payElID.methodID.code', 'payElID.methodID.name', 'employeeNumberID', 'employeeNumberID.empWorkPlace'])
    .where('employeeNumberID.orgID', '=', orgID)
    .where('employeeNumberID.employeeID', 'in', employeeIDs)
    .where('dateFrom', '<=', dateService.shiftDate(params.periodFrom))
    .where('dateTo', '>=', dateService.shiftDate(params.periodFrom))
    .where('payElID.methodID.code', 'in', ['14', '57'])
    .exists(
      UB.Repository('hr_employeePositionS')
        .correlation('employeeNumberID', 'employeeNumberID')
        .whereIf(params.dictStaffSubCatID && params.dictStaffSubCatID.length, 'dictPositionID.dictStaffSubCatID', 'in', params.dictStaffSubCatID.split(',').map(o => Number(o)))
        .where('organizationID', '=', orgID)
        .where('mi_deleteDate', '>=', '#maxdate', 'deleteDate')
    )
    .selectAsObject({ 'employeeNumberID.employeeID': 'employeeID', 'employeeNumberID.employeeID.shortFIO': 'shortFIO', 'employeeNumberID.posName': 'dictPositionName', 'employeeNumberID.tabNum': 'tabNum', 'employeeNumberID.tabNumSort': 'tabNumSort', 'employeeNumberID.employeePositionID.dictPositionID': 'dictPositionID', 'employeeNumberID.mtCount': 'rate', 'payElID.methodID.code': 'methodCode', 'employeeNumberID.dateTo': 'employeeNumberDateTo', 'employeeNumberID.accrualSum': 'paymentSum', 'employeeNumberID.empWorkPlace': 'empWorkPlace' })
    .map(o => {
      switch (o.methodCode) {
        case '14':
          o.isHoliday = 'ВП'
          break
        case '57':
          o.isHoliday = 'ДД'
          break
      }
      return o
    })

  const getEmployeeWorkScheduleID = UB.Repository('hr_employeePosition')
    .attrs(['workScheduleID', 'employeeNumberID'])
    .where('workScheduleID', 'isNotNull')
    .where('isActive', '=', 1)
    .where('employeeID', 'in', employeeIDs)
    .selectAsObject()
    .filter((o, i, arr) => arr.findIndex(el => (el.employeeNumberID === o.employeeNumberID) && (el.workScheduleID === o.workScheduleID)) === i)
  const planByOrgID = settingsService.getByCode('hrUsePlanByOrg', orgID)
  const groupWorkScheduleDays = _.groupBy(UB.Repository('tim_plan')
    .attrs(['workScheduleID', 'dayDate', 'workHours', 'nightHours'])
    .where('organizationID', '=', planByOrgID || orgID)
    .where('dayDate', '>=', dateService.shiftDate(params.periodFrom))
    .where('dayDate', '<=', dateService.shiftDate(params.periodTo))
    .where('workScheduleID', 'in', getEmployeeWorkScheduleID.filter((o, i, arr) => arr.findIndex(el => el.workScheduleID === o.workScheduleID) === i).map((o, i, arr) => o.workScheduleID))
    .selectAsObject(), 'workScheduleID')
  const timeSheet = _.groupBy(UB.Repository('tim_timeSheet')
    .attrs(['dateWork', 'employeeNumberID.employeeID', 'factTimeCostID.nameShort', 'employeeNumberID', 'factTimeCostID.dictTimePrintID'])
    .where('dateWork', '>=', dateService.shiftDate(params.periodFrom))
    .where('dateWork', '<=', dateService.shiftDate(params.periodTo))
    .where('employeeNumberID.employeeID', 'in', employeeIDs)
    .where('isActive', '=', 1)
    .where('factTimeCostID.timeCostType', '=', 'ABSENCE')
    .selectAsObject({ 'employeeNumberID.employeeID': 'employeeID', 'factTimeCostID.nameShort': 'isHoliday' }), 'employeeID')

  const getMounthData = (periodFrom, periodTo) => {
    const mounthArr = []
    const daysInMounth = periodTo.getDate()
    let workDays = 0
    let sixWorkDaysOfMounth = 0
    let exitDayFirst = 0
    let exitDaySecond = 0
    for (let index = 1; index <= periodTo.getDate(); index++) {
      const mounthDate = new Date(periodFrom.getFullYear(), periodFrom.getMonth(), index)
      const dayOfWeek = mounthDate.getDay()
      let isExitDay = [0, 6].includes(dayOfWeek)
      if (isExitDay) {
        exitDayFirst += 1
        exitDaySecond += dayOfWeek === 6 ? 1 : 0
        sixWorkDaysOfMounth += dayOfWeek === 6 ? 1 : 0
      } else {
        workDays += 1
        sixWorkDaysOfMounth += 1
      }
      mounthArr.push({
        dayOfMounth: index,
        dayOfWeek: dayOfWeek || 7,
        isHoliday: isExitDay ? 'X' : '',
        mounthDate
      })
    }
    return {
      mounthArr,
      daysInMounth,
      workDays,
      sixWorkDaysOfMounth,
      exitDaySecond,
      exitDayFirst
    }
  }

  const getEmpHoliday = (empl) => {
    let mounthArr = empl.mounthArr
    const workScheduleDays = empl.workScheduleDays
    const maternityLeave = empl.maternityLeave
    const timeSheet = empl.timeSheet
    mounthArr.map((o, i, arr) => {
      let maternityLeaveDay
      const isWorkScheduleDays = workScheduleDays && workScheduleDays.find(d => dateService.shiftDate(d.dayDate).getDate() === dateService.shiftDate(o.mounthDate).getDate())
      if (maternityLeave) {
        const maternityLeaveDateFrom = dateService.shiftDate(maternityLeave.dateFrom)
        const maternityLeaveDateTo = dateService.shiftDate(maternityLeave.dateTo)
        const dayDateFrom = maternityLeaveDateFrom.getMonth() === dateService.shiftDate(o.mounthDate).getMonth() ? maternityLeaveDateFrom.getDate() : 1
        const dayDateTo = maternityLeaveDateTo.getMonth() === dateService.shiftDate(o.mounthDate).getMonth() ? maternityLeaveDateFrom.getDate() : 31
        maternityLeaveDay = dayDateFrom < o.dayOfMounth < dayDateTo
        o.isHoliday = maternityLeaveDay ? maternityLeave.isHoliday : o.isHoliday
      } else if (timeSheet && timeSheet.length) {
        const dayOfTimeSheet = timeSheet.find(d => dateService.shiftDate(d.dateWork).getDate() === dateService.shiftDate(o.mounthDate).getDate())
        o.isHoliday = dayOfTimeSheet ? dayOfTimeSheet.isHoliday !== 'ВД' ? dayOfTimeSheet.isHoliday : 'ВП' : o.isHoliday
      } else if ((isWorkScheduleDays && !isWorkScheduleDays.workHours && !isWorkScheduleDays.nightHours) || ((dateService.shiftDate(empl.dateTo).getTime() < dateService.shiftDate(o.mounthDate).getTime()) || (dateService.shiftDate(empl.dateFrom).getTime() > dateService.shiftDate(o.mounthDate).getTime()))) {
        o.isHoliday = 'X'
      } else if (isWorkScheduleDays && (isWorkScheduleDays.workHours || isWorkScheduleDays.nightHours)) {
        o.isHoliday = ''
      }
    })
    return mounthArr
  }

  const getEmpl = (employee, mounth, groupWorkScheduleDays, getEmployeeWorkScheduleID, timeSheet, maternityLeaveEmpl, trfPosition) => {
    const employeeGroup = _.groupBy(employee, 'tabNumMain')
    const employeeKeys = Object.keys(employeeGroup)
    const emps = []
    employeeKeys.forEach((o, index) => {
      const empPos = employeeGroup[o]
      let empl = {}
      let totalAccrualSum = 0
      let totalRate = 0
      empPos.forEach((e, i, arr) => {
        const emplPos = trfPosition.filter(acc => (acc.employeeID === e.employeeID) && (acc.tabNumMain === e.tabNumMain))
        totalAccrualSum += !totalAccrualSum ? emplPos.reduce((acc, cur) => acc + cur.accrualSum, 0) : 0
        totalRate += !totalRate ? emplPos.reduce((acc, cur) => acc + cur.rate, 0) : 0
        const dictPositionTrf = emplPos.length ? emplPos.filter(accr => (accr.dictPositionID === e.dictPositionID) && (accr.tabNumMain === e.tabNumMain)) : null
        if (((e.empWorkPlace === '1') && (e.empWorkPlace === '5')) || !e.empWorkPlace) {
          e.accrualSum = totalAccrualSum
          e.rate = totalRate
          e.dictPositionName = e.dictPositionName ? e.dictPositionName.slice(0, 44) : ''
        } else {
          if (dictPositionTrf && dictPositionTrf.length) {
            const isTrfPos = emplPos.filter(pos => (pos.dictPositionID === e.dictPositionID))
            e.accrualSum = isTrfPos.length ? isTrfPos.reduce((acc, cur) => acc + cur.accrualSum, 0) : 0
            e.rate = isTrfPos.length ? isTrfPos.reduce((acc, cur) => acc + cur.rate, 0) : 0
            e.dictPositionName = e.dictPositionName ? e.dictPositionName.slice(0, 44) : ''
          } else {
            e.paymentSum = ''
            e.rate = ''
            e.accrualSum = ''
            e.dictPositionName = e.dictPositionName ? e.dictPositionName.slice(0, 44) : ''
          }
        }
      })
      empl.employeeID = (empPos.find(emp => emp.empWorkPlace === '1') || empPos[0]).employeeID
      empl.timeSheet = timeSheet && timeSheet[empl.employeeID]
      empl.posArr = empPos
      empl.shortFIO = empPos[0].shortFIO
      empl.tabNum = empPos[0].tabNum
      empl.tabNumSort = empPos[0].tabNumSort
      empl.employeeNumberID = (empPos.find(emp => emp.empWorkPlace === '1') || empPos[0]).employeeNumberID
      empl.index = index + 1
      empl.workSchedule = getEmployeeWorkScheduleID.length && getEmployeeWorkScheduleID.filter(ws => ws.employeeNumberID === empl.employeeNumberID)
      empl.workScheduleDays = empl.workSchedule.length && empl.workSchedule.map(w => groupWorkScheduleDays[w.workScheduleID])[0]
      empl.maternityLeave = maternityLeaveEmpl.find(m => m.employeeID === empl.employeeID)
      empl.mounthArr = _.cloneDeep(mounth.mounthArr)
      const mainPos = empPos.find(o => Number(o.tabNum) === o.tabNumSort)
      empl.dateTo = mainPos ? mainPos.employeeNumberDateTo : empPos[0].employeeNumberDateTo
      empl.dateFrom = mainPos ? mainPos.dateFrom : empPos[0].dateFrom
      empl.timeSheetArr = getEmpHoliday(empl)
      emps.push(empl)
    })
    return emps
  }
  const getCardHeight = (card) => {
    let cardHeight = 0
    const fioHeight = card.shortFIO.length > 30 ? 33 : 17
    const positionsHeight = card.posArr.length * 24
    cardHeight += (fioHeight + positionsHeight)
    return cardHeight
  }
  const getPages = (employee, mounth, allColumn, periodFrom, periodTo, groupWorkScheduleDays, getEmployeeWorkScheduleID, timeSheet, maternityLeaveEmpl, trfPosition) => {
    const result = []
    const emp = getEmpl(employee, mounth, groupWorkScheduleDays, getEmployeeWorkScheduleID, timeSheet, maternityLeaveEmpl, trfPosition)
    const pageHeight = 790
    const titleHeight = 128
    const signatureHeight = 42
    const workDaysHeight = 37
    let curPageHeight = 0
    let empArr = []
    let pageNumber = 1
    emp.forEach((o, i, arr) => {
      if (!i) {
        curPageHeight += titleHeight
      }
      curPageHeight += getCardHeight(o)
      if (curPageHeight >= pageHeight) {
        curPageHeight = 0
        pageNumber += 1
        curPageHeight += workDaysHeight
        empArr[empArr.length - 1].isPageBreak = true
        empArr[empArr.length - 1].pageNumber = pageNumber
        result.push({
          firstTablePage: pageNumber === 2,
          mounthDaysArr: mounth.mounthArr,
          sixWorkDaysOfMounth: mounth.sixWorkDaysOfMounth,
          workDays: mounth.workDays,
          headOrg: params.shortFIO,
          responsiblePositionShortFIO: params.responsiblePositionShortFIO,
          orgColumn: allColumn - 17,
          emptyСell: allColumn - 32,
          daysColumn: allColumn - 9,
          calcCodeColumn: allColumn - 32,
          allColumn,
          titleColumn: 24,
          dateTableEmptyColumn: allColumn - 5,
          organizationName: params.organizationName,
          periodFrom: dateService.formatDate(periodFrom),
          periodTo: dateService.formatDate(periodTo),
          issueDate: dateService.formatDate(params.dateReport),
          empArr
        })
        empArr = []
        empArr.push(o)
      } else {
        empArr.push(o)
      }

      if (i === arr.length - 1) {
        o.signature = {
          headOrg: params.shortFIO,
          responsiblePositionShortFIO: params.responsiblePositionShortFIO
        }
        pageNumber += 1
        o.pageNumber = pageNumber
        result.push({
          firstTablePage: pageNumber === 2,
          mounthDaysArr: mounth.mounthArr,
          sixWorkDaysOfMounth: mounth.sixWorkDaysOfMounth,
          workDays: mounth.workDays,
          headOrg: params.headEmployeePositionShortFIO,
          responsiblePositionShortFIO: params.responsiblePositionShortFIO,
          orgColumn: allColumn - 17,
          emptyСell: allColumn - 32,
          daysColumn: allColumn - 9,
          calcCodeColumn: allColumn - 32,
          allColumn,
          titleColumn: 24,
          dateTableEmptyColumn: allColumn - 5,
          organizationName: params.organizationName,
          periodFrom: dateService.formatDate(periodFrom),
          periodTo: dateService.formatDate(periodTo),
          issueDate: dateService.formatDate(params.dateReport),
          empArr
        })
      }
    })
    return result
  }

  const mounth = getMounthData(periodFrom, periodTo)

  const allColumn = mounth.mounthArr.length + (params.reportCode === 'trf_reportsTimesheetTechnicalStaff' ? 13 : 12)

  const pages = getPages(employee, mounth, allColumn, periodFrom, periodTo, groupWorkScheduleDays, getEmployeeWorkScheduleID, timeSheet, maternityLeaveEmpl, trfPosition)

  const firstPage = {
    organizationName: params.organizationName,
    allColumn,
    periodFrom: dateService.formatDate(periodFrom),
    periodTo: dateService.formatDate(periodTo),
    issueDate: dateService.formatDate(params.dateReport),
    isPageBreak: true,
    headOrg: params.headEmployeePositionShortFIO,
    responsiblePositionShortFIO: params.responsiblePositionShortFIO,
    printConditionalDesignations: params.printConditionalDesignations
  }

  const report = {
    pages,
    allColumn
  }
  ctx.mParams.resultData = JSON.stringify({
    firstPage,
    report
  })
}
me.getPayrollEducation = ctx => {
  const { execParams } = ctx.mParams
  const params = ['payrollEducation1', 'payrollEducation2', 'payrollEducation3', 'payrollEducation4']
  const parentOrdID = settingsService.getByCode('hrUseReportSettingsParentOrg', params.orgID)
  const reportParam = reportService.getReportParams(Number(parentOrdID || execParams.orgID), params)
  const orgIDs = execParams.joinReport ? JSON.parse(execParams.orgIDs) : [execParams.orgID]
  const periodIDs = UB.Repository('hr_dictPeriod')
    .attrs(['ID'])
    .where('orgID', 'in', orgIDs)
    .where('dateFrom', '=', dateService.shiftDate(execParams.periodFrom))
    .where('dateTo', '=', dateService.shiftDate(execParams.periodTo))
    .selectAsArrayOfValues()
  const employeeNumberIDs = []
  const reportPayment = params.map(o => {
    const selectPayEl = reportParam[`${o}IDs`]
    const request = UB.Repository('hr_accrual')
      .attrs(['paySum', 'employeeNumberID.employeeID.fullFIO', 'employeeNumberID.tabNum', 'payElID', 'payElID.name', 'employeeNumberID.depID', 'employeeNumberID', 'orgID', 'days'])
      .where('payElID', 'in', selectPayEl)
      .where('periodCalcID', 'in', periodIDs)
      .where('employeeNumberID.workPlaceCode', '!=', '5')
      .where('orgID', 'in', orgIDs)
      .where('paySum', '!=', 0)
      .where(`(flagsRec & 8192 = 0)`, 'custom')
      .selectAsObject({
        'payElID.name': 'payElName',
        'employeeNumberID.employeeID.fullFIO': 'fullFIO',
        'employeeNumberID.tabNum': 'tabNum',
        'employeeNumberID.depID': 'depID'
      })
    request.forEach(el => {
      !employeeNumberIDs.find(empl => empl === el.employeeNumberID) && employeeNumberIDs.push(el.employeeNumberID)
    })
    return {
      [`${o}`]: request
    }
  })
  const taxAccrual = UB.Repository('hr_accrual')
    .attrs(['paySum', 'employeeNumberID.employeeID.fullFIO', 'employeeNumberID.tabNum', 'payElID', 'payElID.name', 'employeeNumberID.depID', 'employeeNumberID', 'orgID', 'payElID.methodID.code', 'payElID.methodID.methodGroupID.groupType'])
    .where('periodCalcID', 'in', periodIDs)
    .where('employeeNumberID.workPlace', '!=', '5')
    .where('orgID', 'in', orgIDs)
    .where(`(flagsRec & 8192 = 0)`, 'custom')
    .where('payElID.methodID.code', 'in', ['26', '27', '32', '31', '43', '61', '62', '28', '29', '30', '53', '75'])
    .selectAsObject({
      'payElID.name': 'payElName',
      'employeeNumberID.employeeID.fullFIO': 'fullFIO',
      'employeeNumberID.tabNum': 'tabNum',
      'employeeNumberID.depID': 'depID',
      'payElID.methodID.code': 'methodCode',
      'payElID.methodID.methodGroupID.groupType': 'methodGroupType'
    })
  const accrualBalance = UB.Repository('hr_accrualBalance')
    .attrs(['*', 'employeeNumberID.orgID', 'employeeNumberID.depID', 'employeeNumberID.description'])
    .where('periodCalcID', 'in', periodIDs)
    .where('employeeNumberID.orgID', 'in', orgIDs)
    .selectAsObject({ 'employeeNumberID.orgID': 'orgID', 'employeeNumberID.depID': 'depID' })
  taxAccrual.forEach(el => {
    !employeeNumberIDs.find(empl => empl === el.employeeNumberID) && employeeNumberIDs.push(el.employeeNumberID)
  })
  accrualBalance.forEach(el => {
    !employeeNumberIDs.find(empl => empl === el.employeeNumberID) && employeeNumberIDs.push(el.employeeNumberID)
  })
  const employeeNumbers = UB.Repository('hr_employeeNumberS')
    .attrs('depID', 'ID', 'orgID', 'employeeID.fullFIO', 'tabNum', 'orgName', 'depName', 'tabNumSort')
    .where('orgID', 'in', orgIDs)
    .where('ID', 'in', employeeNumberIDs)
    .where('employeePositionID.isActive', '=', 1)
    // .where('employeePositionID.dateTo', '>=', dateService.shiftDate(execParams.periodFrom))
    .where('employeePositionID.workPlace', '<>', '5')
    .selectAsObject({ 'employeeID.fullFIO': 'fullFIO' })

  const hrOrg = UB.Repository('hr_organization')
    .attrs(['name', 'mi_data_id', 'fullName'])
    .where('mi_data_id', 'in', orgIDs)
    .where('state', '=', 'ACTIVE')
    .orderBy('name', 'desc')
    .selectAsObject({ 'mi_data_id': 'orgID' })

  const departmentArr = UB.Repository('hr_department')
    .attrs(['name', 'mi_data_id', 'orgID', 'orgID.name'])
    .where('orgID', 'in', orgIDs)
    .where('state', '=', 'ACTIVE')
    .where('mi_dateFrom', '<=', dateService.shiftDate(execParams.periodTo))
    .where('mi_dateTo', '>=', dateService.shiftDate(execParams.periodTo))
    .where('mi_data_id', 'in', employeeNumbers.filter((o, i, arr) => (arr.findIndex(el => el.depID === o.depID) === i) && o.depID).map((o, i, arr) => o.depID))
    .misc({ __mip_recordhistory_all: true })
    .groupBy(['name', 'mi_data_id', 'orgID', 'orgID.name'])
    .selectAsObject({ 'mi_data_id': 'departmentID', 'orgID.name': 'orgName' })

  const accrualFund = UB.Repository('hr_accrualFund')
    .attrs(['orgID', 'paySum', 'employeeNumberID', 'employeeNumberID.depID', 'payFundID.name', 'payFundID.typeTaxECBID.code', 'rate'])
    .where('periodCalcID', 'in', periodIDs)
    .where('orgID', 'in', orgIDs)
    .where('paySum', '!=', 0)
    .where('employeeNumberID', 'in', employeeNumbers.map((o, i, arr) => o.ID))
    .selectAsObject({ 'employeeNumberID.depID': 'depID', 'payFundID.typeTaxECBID.code': 'taxECBCode' })

  const timeSheet = UB.Repository('tim_timeSheet')
    .attrs(['employeeNumberID.orgID', 'employeeNumberID', 'employeeNumberID.depID', 'factHour'])
    .where('periodID', 'in', periodIDs)
    .where('employeeNumberID.orgID', 'in', orgIDs)
    .where('employeeNumberID', 'in', employeeNumbers.map((o, i, arr) => o.ID))
    .where('factHour', '>', 0)
    .where('isActive', '=', 1)
    .selectAsObject({ 'employeeNumberID.depID': 'depID', 'employeeNumberID.orgID': 'orgID' })

  const withoutDepID = employeeNumbers.filter(o => !o.depID).reduce((acc, cur) => {
    if (!acc.find(o => o.orgID === cur.orgID)) {
      acc.push(cur)
    }
    return acc
  }, [])

  if (withoutDepID.length) {
    withoutDepID.forEach(o => departmentArr.push({
      name: 'Без підрозділу',
      orgID: o.orgID,
      departmentID: o.depID,
      orgName: o.orgName
    }))
  }

  let page = {}

  const getPayrollEducationSum = (payrollEducation, emplPayment, sumElem) => {
    const sum = emplPayment[params.findIndex(o => o === payrollEducation)][payrollEducation].reduce((acc, cur) => acc + cur[sumElem], 0)
    return sum !== 0 ? sum : null
  }

  const setOtherPayrollEducation = (res, payrollEducation, emplPayment) => {
    const arr = emplPayment[params.findIndex(o => o === payrollEducation)][payrollEducation].reduce((acc, cur) => {
      const curElIndexInAcc = acc.findIndex(o => o.payElID === cur.payElID)
      if (curElIndexInAcc < 0) {
        acc.push(cur)
      } else {
        acc[curElIndexInAcc].paySum += cur.paySum
      }
      return acc
    }, [])
    arr.forEach((o, i) => {
      if (!i && o.paySum) {
        res[i].payElName = o.payElName.slice(0, 50)
        res[i].payrollEducation4PaySum = o.paySum
      } else {
        o.paySum && res.push({
          payElName: o.payElName.slice(0, 50),
          payrollEducation4PaySum: o.paySum
        })
      }
    })
    return res
  }
  const setOther = (result, emplOtherTax, name, sum) => {
    emplOtherTax.reduce((acc, cur) => {
      const curElIndexInAcc = acc.findIndex(o => o.payElID === cur.payElID)
      if (curElIndexInAcc < 0) {
        acc.push(cur)
      } else {
        acc[curElIndexInAcc].paySum += cur.paySum
      }
      return acc
    }, []).forEach((o, i) => {
      if (result[i]) {
        result[i][`${name}`] = o.payElName.slice(0, 44)
        result[i][`${sum}`] = o.paySum
      } else {
        o.paySum && result.push({
          [`${name}`]: o.payElName.slice(0, 44),
          [`${sum}`]: o.paySum
        })
      }
    })
    return result
  }

  const getEmplRows = (emplAccrualBalance, emplAccrualFund, emplTimeSheet, emplPayment, emplPDFO, emplOtherTax, empPayout) => {
    const balanceIn = emplAccrualBalance.length ? emplAccrualBalance.reduce((a, b) => a + b.sumFrom, 0) || null : null
    const balanceOut = emplAccrualBalance.length ? emplAccrualBalance.reduce((a, b) => a + b.sumTo, 0) || null : null
    const emplTaxECB = emplAccrualFund.length ? emplAccrualFund.reduce((acc, cur) => {
      const findIndexDuplicate = acc.findIndex(o => o.rate === cur.rate)
      if (findIndexDuplicate >= 0) {
        acc[findIndexDuplicate].paySum += cur.paySum
      } else {
        acc.push({
          rate: cur.rate,
          paySum: cur.paySum
        })
      }
      return acc
    }, []).map(o => {
      o.paySum = currencyService.round(o.paySum, 2)
      return o
    }).sort((a, b) => a.rate - b.rate) : []
    const emplWorkDays = emplTimeSheet.length ? emplTimeSheet.length : null
    const emplWorkHours = emplTimeSheet.length ? currencyService.round(emplTimeSheet.reduce((a, b) => a + b.factHour, 0), 0) : null
    const payrollEducation1 = getPayrollEducationSum('payrollEducation1', emplPayment, 'paySum')
    const payrollEducation2Days = getPayrollEducationSum('payrollEducation2', emplPayment, 'days')
    const payrollEducation2PaySum = getPayrollEducationSum('payrollEducation2', emplPayment, 'paySum')
    const payrollEducation3Days = getPayrollEducationSum('payrollEducation3', emplPayment, 'days')
    const payrollEducation3PaySum = getPayrollEducationSum('payrollEducation3', emplPayment, 'paySum')
    const PDFOSum = emplPDFO.length ? emplPDFO.reduce((a, b) => a + b.paySum, 0) : null
    let result = [{
      balanceIn,
      balanceOut,
      emplWorkDays,
      emplWorkHours,
      payrollEducation1,
      payrollEducation2Days,
      payrollEducation2PaySum,
      payrollEducation3Days,
      payrollEducation3PaySum,
      PDFOSum
    }]

    result = setOtherPayrollEducation(result, 'payrollEducation4', emplPayment)
    const totalPayment = result.reduce((acc, cur) => {
      return acc + (cur.payrollEducation1 || 0) + (cur.payrollEducation2PaySum || 0) + (cur.payrollEducation3PaySum || 0) + (cur.payrollEducation4PaySum || 0)
    }, 0)
    result = setOther(result, emplOtherTax, 'emplOtherTaxName', 'emplOtherTaxSum')
    const totalTax = result.reduce((acc, cur) => {
      return acc + (cur.emplAccrualFundECBHosp || 0) + (cur.emplAccrualFundECB || 0) + (cur.PDFOSum || 0) + (cur.emplOtherTaxSum || 0)
    }, 0)
    result = setOther(result, empPayout, 'empPayoutName', 'empPayoutSum')
    const totalPayout = result.reduce((acc, cur) => {
      return acc + (cur.empPayoutSum || 0)
    }, 0)
    result[0].totalPayment = totalPayment || null
    result[0].totalTax = totalTax || null
    result[0].totalPayout = totalPayout || null
    if (emplTaxECB.length && result.length) {
      if ((result.length - emplTaxECB.length) >= emplTaxECB.length) {
        emplTaxECB.forEach((o, i) => {
          if (!i) {
            result[i].emplTaxECB = [{ rate: `${o.rate}%` }]
            result[i + 1].emplTaxECB = [{ paySum: o.paySum }]
          } else {
            result[i + 1].emplTaxECB = [{ rate: `${o.rate}%` }]
            result[i + 2].emplTaxECB = [{ paySum: o.paySum }]
          }
        })
      } else if ((result.length === emplTaxECB.length) && (emplTaxECB.length > 1)) {
        emplTaxECB.forEach((o, i) => {
          result[i].emplTaxECB = [{ rate: `${o.rate}%` }]
          result[i].emplTaxECB = [{ paySum: o.paySum }]
        })
      } else if (result.length) {
        result[0].emplTaxECBOneRow = emplTaxECB
      }
    }
    return result
  }

  const getEmplHeight = (empl, i, arr, page, index, pageArr) => {
    const totalHeight = i === (arr.length - 1) ? 45 : 0
    const totalOrgHeight = index === (page.length - 1) ? 45 : 0
    const totalAccrHeight = (i === (arr.length - 1)) && page.totalAccrDep && page.totalAccrDep.length ? page.totalAccrDep.length * 30 : 0
    const totalOfftakeHeight = (i === (arr.length - 1)) && page.totalOfftake && page.totalOfftake.length ? page.totalOfftake.length * 30 : 0
    const totalPayoutHeight = (i === (arr.length - 1)) && page.totalPayout && page.totalPayout.length ? page.totalPayout.length * 30 : 0
    const totalAccrOrgrHeight = (i === (arr.length - 1)) && (index === (pageArr.length - 1)) && page.totalAccrOrg && page.totalAccrOrg.length ? page.totalAccrOrg.length * 30 : 0
    const totalOfftakeOrgHeight = (i === (arr.length - 1)) && (index === (pageArr.length - 1)) && page.totalOfftakeOrg && page.totalOfftakeOrg.length ? page.totalOfftakeOrg.length * 30 : 0
    const totalPayoutOrgHeight = (i === (arr.length - 1)) && (index === (pageArr.length - 1)) && page.totalPayoutOrg && page.totalPayoutOrg.length ? page.totalPayoutOrg.length * 30 : 0
    const fullFIOHeight = empl.fullFIO ? 15 : 0
    const accrHeight = empl.emplAccr.length ? 30 * empl.emplAccr.length : 0
    return accrHeight + fullFIOHeight + totalHeight + totalAccrHeight + totalOfftakeHeight + totalPayoutHeight + totalAccrOrgrHeight + totalOfftakeOrgHeight + totalPayoutOrgHeight + totalOrgHeight
  }

  const setPageBreak = (pageArr) => {
    const pageHeight = 940
    const titleHeight = 57
    const tableTitleHeight = 76
    const defaultPageHeight = titleHeight + tableTitleHeight
    let curPageHeight = 0
    const res = []
    let pageNumber = 0
    pageArr.forEach((page, index, pageArr) => {
      let employeesArr = []
      page.employeesArr.forEach((o, i, arr) => {
        const curCardHeight = getEmplHeight(o, i, arr, page, index, pageArr)
        curPageHeight += !i ? defaultPageHeight + curCardHeight : curCardHeight
        if ((curPageHeight >= pageHeight) && (i !== (arr.length - 1))) {
          pageNumber += 1
          const lastElIndex = employeesArr.length > 0 ? employeesArr.length - 1 : 0
          if (employeesArr && employeesArr.length) {
            employeesArr[lastElIndex].emplAccr[employeesArr[lastElIndex].emplAccr.length > 0 ? employeesArr[lastElIndex].emplAccr.length - 1 : 0].borderBottom = 'border-bottom: 1px solid;'
          }
          const newPage = Object.assign({}, page)
          newPage.pageNumber = pageNumber
          newPage.isPageBreak = true
          newPage.employeesArr = employeesArr
          curPageHeight = defaultPageHeight + curCardHeight
          newPage.totalDep = i === (arr.length - 1)
          newPage.totalAccrDep = i === (arr.length - 1)
          newPage.totalOfftake = i === (arr.length - 1)
          newPage.totalPayout = i === (arr.length - 1)
          newPage.totalOrg = i === (arr.length - 1)
          newPage.totalAccrOrg = i === (arr.length - 1)
          newPage.totalOfftakeOrg = i === (arr.length - 1)
          newPage.totalPayoutOrg = i === (arr.length - 1)
          newPage.totalAccrYo = i === (arr.length - 1)
          newPage.totalOfftakeYo = i === (arr.length - 1)
          newPage.totalPayoutYo = i === (arr.length - 1)
          newPage.totalYo = i === (arr.length - 1)
          res.push(newPage)
          employeesArr = []
          employeesArr.push(o)
        } else if (i === (arr.length - 1)) {
          pageNumber += 1
          if (curPageHeight >= pageHeight) {
            const lastElIndex = employeesArr.length > 0 ? employeesArr.length - 1 : 0
            employeesArr[lastElIndex].emplAccr[employeesArr[lastElIndex].emplAccr.length > 0 ? employeesArr[lastElIndex].emplAccr.length - 1 : 0].borderBottom = 'border-bottom: 1px solid;'
            const newPage = Object.assign({}, page)
            newPage.pageNumber = pageNumber
            newPage.isPageBreak = true
            newPage.employeesArr = employeesArr
            newPage.totalDep = i !== (arr.length - 1)
            newPage.totalAccrDep = i !== (arr.length - 1)
            newPage.totalOfftake = i !== (arr.length - 1)
            newPage.totalPayout = i !== (arr.length - 1)
            newPage.totalOrg = i !== (arr.length - 1)
            newPage.totalAccrOrg = i !== (arr.length - 1)
            newPage.totalOfftakeOrg = i !== (arr.length - 1)
            newPage.totalPayoutOrg = i !== (arr.length - 1)
            newPage.totalAccrYo = i !== (arr.length - 1)
            newPage.totalOfftakeYo = i !== (arr.length - 1)
            newPage.totalPayoutYo = i !== (arr.length - 1)
            newPage.totalYo = i !== (arr.length - 1)
            res.push(newPage)
            pageNumber += 1
            employeesArr = []
            employeesArr.push(o)
            const secondNewPage = Object.assign({}, page)
            secondNewPage.pageNumber = pageNumber
            secondNewPage.isPageBreak = true
            secondNewPage.employeesArr = employeesArr
            res.push(secondNewPage)
            curPageHeight = defaultPageHeight
          } else {
            employeesArr.push(o)
            const newPage = Object.assign({}, page)
            newPage.pageNumber = pageNumber
            newPage.isPageBreak = true
            newPage.employeesArr = employeesArr
            curPageHeight = 0
            res.push(newPage)
            employeesArr = []
          }
        } else {
          employeesArr.push(o)
        }
      })
    })
    if (res.length) res[res.length - 1].isPageBreak = false
    return res
  }

  const getEmployees = (depEmployees, depAccrualBalance, depAccrualFund, depTimeSheet, depReportPayment, depPDFO, depOtherTax, depPayout) => {
    const res = []
    depEmployees.forEach((o, i, arr) => {
      const emplAccrualBalance = depAccrualBalance.filter(accr => accr.employeeNumberID === o.ID)
      const emplAccrualFund = depAccrualFund.filter(accr => accr.employeeNumberID === o.ID)
      const emplTimeSheet = depTimeSheet.filter(accr => accr.employeeNumberID === o.ID)
      const emplPayment = filterReportPayment(depReportPayment, 'employeeNumberID', o.ID)
      const emplPDFO = depPDFO.filter(accr => accr.employeeNumberID === o.ID)
      const emplOtherTax = depOtherTax.filter(accr => accr.employeeNumberID === o.ID)
      const empPayout = depPayout.filter(accr => accr.employeeNumberID === o.ID)
      o.emplAccr = getEmplRows(emplAccrualBalance, emplAccrualFund, emplTimeSheet, emplPayment, emplPDFO, emplOtherTax, empPayout)
      o.employeeInfo = `${o.tabNum} ${o.fullFIO}`
      if ((emplAccrualBalance.length && emplAccrualBalance.reduce((acc, cur) => acc + cur.sumFrom + cur.sumMinus + cur.sumPay + cur.sumPlus + cur.sumTo, 0)) || emplAccrualFund.length || emplTimeSheet.length || emplPDFO.length || emplOtherTax.length || empPayout.length) res.push(o)
    })
    return res
  }

  const getTotal = (arr) => {
    const depBalanceIn = arr.reduce((acc, cur) => acc + (cur.emplAccr ? cur.emplAccr.reduce((a, b) => a + (b.balanceIn || 0), 0) : 0), 0)
    const depPayrollEducation1 = arr.reduce((acc, cur) => acc + (cur.emplAccr ? cur.emplAccr.reduce((a, b) => a + (b.payrollEducation1 || 0), 0) : 0), 0)
    const depPayrollEducation2PaySum = arr.reduce((acc, cur) => acc + (cur.emplAccr ? cur.emplAccr.reduce((a, b) => a + (b.payrollEducation2PaySum || 0), 0) : 0), 0)
    const depPayrollEducation3PaySum = arr.reduce((acc, cur) => acc + (cur.emplAccr ? cur.emplAccr.reduce((a, b) => a + (b.payrollEducation3PaySum || 0), 0) : 0), 0)
    const depPayrollEducation4PaySum = arr.reduce((acc, cur) => acc + (cur.emplAccr ? cur.emplAccr.reduce((a, b) => a + (b.payrollEducation4PaySum || 0), 0) : 0), 0)
    const depTotalPayment = arr.reduce((acc, cur) => acc + (cur.emplAccr ? cur.emplAccr.reduce((a, b) => a + (b.totalPayment || 0), 0) : 0), 0)
    const depPDFOSum = arr.reduce((acc, cur) => acc + (cur.emplAccr ? cur.emplAccr.reduce((a, b) => a + (b.PDFOSum || 0), 0) : 0), 0)
    const depEmplAccrualFundECB = arr.reduce((acc, cur) => acc + (cur.emplAccr ? cur.emplAccr.reduce((a, b) => a + (b.emplAccrualFundECB || 0), 0) : 0), 0)
    const depEmplAccrualFundECBHosp = arr.reduce((acc, cur) => acc + (cur.emplAccr ? cur.emplAccr.reduce((a, b) => a + (b.emplAccrualFundECBHosp || 0), 0) : 0), 0)
    const depEmplOtherTaxSum = arr.reduce((acc, cur) => acc + (cur.emplAccr ? cur.emplAccr.reduce((a, b) => a + (b.emplOtherTaxSum || 0), 0) : 0), 0)
    const depTotalTax = arr.reduce((acc, cur) => acc + (cur.emplAccr ? cur.emplAccr.reduce((a, b) => a + (b.totalTax || 0), 0) : 0), 0)
    const depEmpPayoutSum = arr.reduce((acc, cur) => acc + (cur.emplAccr ? cur.emplAccr.reduce((a, b) => a + (b.empPayoutSum || 0), 0) : 0), 0)
    const depTotalPayout = arr.reduce((acc, cur) => acc + (cur.emplAccr ? cur.emplAccr.reduce((a, b) => a + (b.totalPayout || 0), 0) : 0), 0)
    const depbalanceOut = arr.reduce((acc, cur) => acc + (cur.emplAccr ? cur.emplAccr.reduce((a, b) => a + (b.balanceOut || 0), 0) : 0), 0)
    const depEmplTaxECB = arr.reduce((acc, cur) => acc + (cur.emplAccr ? cur.emplAccr.reduce((a, b) => a + (b.emplTaxECB && b.emplTaxECB.length ? b.emplTaxECB.reduce((accSum, el) => accSum + el.paySum || 0, 0) : 0), 0) : 0), 0)
    return [{
      depBalanceIn: depBalanceIn !== 0 ? depBalanceIn : null,
      depPayrollEducation1: depPayrollEducation1 !== 0 ? depPayrollEducation1 : null,
      depPayrollEducation2PaySum: depPayrollEducation2PaySum !== 0 ? depPayrollEducation2PaySum : null,
      depPayrollEducation3PaySum: depPayrollEducation3PaySum !== 0 ? depPayrollEducation3PaySum : null,
      depPayrollEducation4PaySum: depPayrollEducation4PaySum !== 0 ? depPayrollEducation4PaySum : null,
      depTotalPayment: depTotalPayment !== 0 ? depTotalPayment : null,
      depPDFOSum: depPDFOSum !== 0 ? depPDFOSum : null,
      depEmplAccrualFundECB: depEmplAccrualFundECB !== 0 ? depEmplAccrualFundECB : null,
      depEmplAccrualFundECBHosp: depEmplAccrualFundECBHosp !== 0 ? depEmplAccrualFundECBHosp : null,
      depEmplOtherTaxSum: depEmplOtherTaxSum !== 0 ? depEmplOtherTaxSum : null,
      depTotalTax: depTotalTax !== 0 ? depTotalTax : null,
      depEmpPayoutSum: depEmpPayoutSum !== 0 ? depEmpPayoutSum : null,
      depTotalPayout: depTotalPayout !== 0 ? depTotalPayout : null,
      depbalanceOut: depbalanceOut !== 0 ? depbalanceOut : null,
      depEmplTaxECB: depEmplTaxECB !== 0 ? depEmplTaxECB : null
    }]
  }
  const getTotalString = (arr) => {
    let row = []
    let string = []
    const array = arr.map(obj => {
      return Object.assign({}, obj)
    })
    array.forEach((o, i, array) => {
      o.renderTitle = !i
      o.lastColspan = 0
      row.push(o)
      if ((row.length === 4) || (i === (array.length - 1))) {
        const rowElementsColspan = row.length * 4
        row[row.length - 1].lastColspan = (i === array.length - 1) ? 16 - rowElementsColspan : 0
        row[row.length - 1].lastPaySumBorder = (row.length === 4) ? 'border-right: 1px solid;' : ''
        row[row.length - 1].lastBorder = (i === array.length - 1) ? 'border-right: 1px solid;' : i === array.length - 1
        row[0].renderEmpty = string.length >= 1
        string.push({ row })
        row = []
      }
    })
    return string
  }
  const getTotalAccr = (arr) => {
    const accrArr = arr[params.findIndex(o => o === 'payrollEducation4')].payrollEducation4.map(obj => {
      return Object.assign({}, obj)
    }).reduce((acc, cur) => {
      const findIndexElem = acc.findIndex(o => o.payElID === cur.payElID)
      if (findIndexElem >= 0) {
        acc[findIndexElem].paySum += cur.paySum
      } else {
        acc.push(cur)
      }
      return acc
    }, [])
    return getTotalString(accrArr)
  }
  const setTotal = (arr) => {
    const accrArr = arr.map(obj => {
      return Object.assign({}, obj)
    }).reduce((acc, cur) => {
      const findIndexElem = acc.findIndex(o => o.payElID === cur.payElID)
      if (findIndexElem >= 0) {
        acc[findIndexElem].paySum += cur.paySum
      } else {
        acc.push(cur)
      }
      return acc
    }, [])
    return getTotalString(accrArr)
  }
  const setBorderBottom = (page) => {
    const lastOfftake = page.totalOfftake.length && page.totalOfftake[page.totalOfftake.length - 1].row.length ? page.totalOfftake[page.totalOfftake.length - 1].row : []
    const lastPayout = page.totalPayout.length && page.totalPayout[page.totalPayout.length - 1].row.length ? page.totalPayout[page.totalPayout.length - 1].row : []
    if (lastPayout.length && lastPayout.length <= 4) {
      lastPayout.forEach(o => { o.borderBottom = 'border-bottom: 1px solid;' })
    } else {
      lastOfftake.forEach(o => { o.borderBottom = 'border-bottom: 1px solid;' })
    }
    return page
  }
  const setBorderBottomOrg = (page) => {
    const lastOfftake = page.totalOfftakeOrg.length && page.totalOfftakeOrg[page.totalOfftakeOrg.length - 1].row.length ? page.totalOfftakeOrg[page.totalOfftakeOrg.length - 1].row : []
    const lastPayout = page.totalPayoutOrg.length && page.totalPayoutOrg[page.totalPayoutOrg.length - 1].row.length ? page.totalPayoutOrg[page.totalPayoutOrg.length - 1].row : []
    if (lastPayout.length && lastPayout.length <= 4) {
      lastPayout.forEach(o => { o.borderBottom = 'border-bottom: 1px solid;' })
    } else {
      lastOfftake.forEach(o => { o.borderBottom = 'border-bottom: 1px solid;' })
    }
    return page
  }
  const setBorderBottomYo = (page) => {
    const lastOfftake = page.totalOfftakeYo.length && page.totalOfftakeYo[page.totalOfftakeYo.length - 1].row.length ? page.totalOfftakeYo[page.totalOfftakeYo.length - 1].row : []
    const lastPayout = page.totalPayoutYo.length && page.totalPayoutYo[page.totalPayoutYo.length - 1].row.length ? page.totalPayoutYo[page.totalPayoutYo.length - 1].row : []
    if (lastPayout.length && lastPayout.length <= 4) {
      lastPayout.forEach(o => { o.borderBottom = 'border-bottom: 1px solid;' })
    } else {
      lastOfftake.forEach(o => { o.borderBottom = 'border-bottom: 1px solid;' })
    }
    return page
  }
  const data = []
  const createReport = (dep, depAccrualBalance, depAccrualFund, depTimeSheet, depReportPayment, depPDFO, depOtherTax, depPayout, index, depsArr, obj, orgArr, i, reportPayment, employeeNumbers, orgID, totalObj) => {
    if (dep.length) {
      page.orgTitile = `${dep[0].depName || 'Підрозділ не призначено'} ${dep[0].orgName}`
      page.dictPeriodName = execParams.periodRaw.toLowerCase()
      page.totalAccrDep = getTotalAccr(depReportPayment)
      page.totalOfftake = setTotal(depOtherTax)
      page.totalPayout = setTotal(depPayout)
      page.employeesArr = getEmployees(dep, depAccrualBalance, depAccrualFund, depTimeSheet, depReportPayment, depPDFO, depOtherTax, depPayout)
      page.totalDep = getTotal(page.employeesArr)

      page = setBorderBottom(page)
      if (depsArr.length === index + 1) {
        page.totalAccrOrg = getTotalAccr(obj.reportPaymentOrg)
        page.totalOfftakeOrg = setTotal(obj.otherTaxOrg)
        page.totalPayoutOrg = setTotal(obj.payout)
        page.totalOrg = getTotal([...page.employeesArr, ...data.reduce((acc, cur) => {
          acc.push(...cur.employeesArr.filter(o => o.orgID === orgID))
          return acc
        }, [])])
        page = setBorderBottomOrg(page)
      }
      if (execParams.joinReport && (orgArr.length === i + 1) && (depsArr.length === index + 1)) {
        page.totalAccrYo = getTotalAccr(reportPayment)
        page.totalOfftakeYo = setTotal(totalObj.otherTax)
        page.totalPayoutYo = setTotal(totalObj.payoutYo)
        page.totalYo = getTotal(employeeNumbers)
        page = setBorderBottomYo(page)
      }
      data.push(page)
      page = {}
    }
  }

  const filterReportPayment = (payment, filterParams, filterID) => {
    return payment.map(obj => {
      return Object.assign({}, obj)
    }).map((o, i) => {
      o[`payrollEducation${i + 1}`] = o[`payrollEducation${i + 1}`].filter(el => el[filterParams] === filterID)
      return o
    })
  }
  hrOrg.forEach((org, i, orgArr) => {
    const department = departmentArr.filter(o => o.orgID === org.orgID)
    const accrualBalanceOrg = accrualBalance.filter(o => o.orgID === org.orgID)
    const accrualFundOrg = accrualFund.filter(o => o.orgID === org.orgID)
    const timeSheetOgr = timeSheet.filter(o => o.orgID === org.orgID)
    const reportPaymentOrg = filterReportPayment(reportPayment, 'orgID', org.orgID)
    const employeeNumbersOrg = employeeNumbers.filter(o => o.orgID === org.orgID).sort((a, b) => a.tabNumSort - b.tabNumSort)
    const PDFO = taxAccrual.filter(o => o.methodCode === '26')
    const otherTax = taxAccrual.filter(o => (o.methodGroupType === 'OFFTAKE') && (o.methodCode !== '26'))
    const payoutYo = taxAccrual.filter(o => o.methodGroupType === 'FORPAY')
    const PDFOOrg = PDFO.filter(o => o.orgID === org.orgID)
    const otherTaxOrg = otherTax.filter(o => o.orgID === org.orgID)
    const payout = payoutYo.filter(o => o.orgID === org.orgID)
    if (department.length) {
      department.forEach((dep, index, depsArr) => {
        const depAccrualBalance = accrualBalanceOrg.filter(o => o.depID === dep.departmentID)
        const depEmployees = employeeNumbersOrg.filter(o => o.depID === dep.departmentID)
        const depAccrualFund = accrualFundOrg.filter(o => o.depID === dep.departmentID)
        const depTimeSheet = timeSheetOgr.filter(o => o.depID === dep.departmentID)
        const depReportPayment = filterReportPayment(reportPaymentOrg, 'depID', dep.departmentID)
        const depPDFO = PDFOOrg.filter(o => o.depID === dep.departmentID)
        const depOtherTax = otherTaxOrg.filter(o => o.depID === dep.departmentID)
        const depPayout = payout.filter(o => o.depID === dep.departmentID)
        const obj = { reportPaymentOrg, otherTaxOrg, payout }
        const totalObj = { otherTax, payoutYo }
        createReport(depEmployees, depAccrualBalance, depAccrualFund, depTimeSheet, depReportPayment, depPDFO, depOtherTax, depPayout, index, depsArr, obj, orgArr, i, reportPayment, employeeNumbers, org.orgID, totalObj)
      })
    }
  })
  const pages = setPageBreak(data)
  ctx.mParams.resultData = JSON.stringify({
    pages
  })
}

function getTimeSheet (orgIDs, periodTo, periodFrom, dictProgClassIDs, dictFundSourceIDs) {
  const sqlDialect = entityBaseService.getSQLDialect()
  const employeeNumberIDs = UB.Repository('hr_employeePositionS')
    .attrs(['employeeNumberID'])
    .where('dateFrom', '<=', periodTo)
    .where('dateTo', '>=', periodFrom)
    .where('organizationID', 'in', orgIDs)
    .where('employeeNumberID.empWorkPlace', 'isNull')
    .where('mi_deleteDate', '>=', '#maxdate')
    .where('workScheduleID', 'isNotNull')
    .where('employeeNumberID.mi_deleteDate', '>=', '#maxdate')
    .selectAsArrayOfValues()

  const timeSheetS = UB.DataStore('tim_timeSheet')
  timeSheetS.runSQL(`select 
  emplNum.tabNum as "tabNum",
  sum(ts.factHour) as "factHour",
  count(*) as "factDay",
  empPos.workScheduleID as "workScheduleID",
  ts.employeeNumberID as "employeeNumberID",
  ws.isDayAsPlan as "isDayAsPlan",
  epf.dictProgClassID as "dictProgClassID",
  dtc.timeCostType as "planTimeCostType",
  dtcf.timeCostType as "factTimeCostType",
  empPos.departmentID as "departmentID",
  emplNum.orgID as "orgID"
  from tim_timeSheet ts
  left join tim_plan tp on tp.ID = ts.planID
  left join hr_employeeNumber emplNum on emplNum.ID = ts.employeeNumberID
  left join hr_dictTimeCost dtcf on dtcf.ID = ts.factTimeCostID
  left join hr_dictTimeCost dtc on dtc.ID = ts.planTimeCostID
  left JOIN  hr_employeePosition empPos ON
         empPos.ID = (select ${sqlDialect.top} empPos2.ID from hr_employeePosition empPos2 where 
         empPos2.employeeNumberID = emplNum.ID 
         and empPos2.isActive = 1
         and empPos2.dateFrom <= :dateTo:
         and empPos2.dateTo >= :dateFrom:
         and empPos2.mi_deleteDate >= '9999-12-31'
         and empPos2.workScheduleID is not null
         order by empPos2.dateFrom desc ${sqlDialect.limit})
  left join hr_empPosFundSource epf on epf.ID = (
          select ${sqlDialect.top} epf2.ID from hr_empPosFundSource epf2 where 
          epf2.employeePositionID = empPos.ID
          order by epf2.mi_createDate desc ${sqlDialect.limit})
  left join hr_workSchedule ws on ws.ID = tp.workScheduleID
  where emplNum.orgID${entityBaseService.getInExpression('orgIDs')}
  and emplNum.ID${entityBaseService.getInExpression('employeeNumberIDs')}
  and ts.dateWork >= :dateFrom:
  and ts.dateWork <= :dateTo:
  and ts.mi_deleteDate >= '9999-12-31' 
  and ts.isActive = 1
  and emplNum.empWorkPlace is NULL
  and emplNum.mi_deleteDate >= '9999-12-31'
  and dtcf.timeCostType = 'WORK'
  ${dictProgClassIDs ? `and epf.dictProgClassID ${entityBaseService.getInExpression('dictProgClassIDs')}` : ''}
  ${dictFundSourceIDs ? `and epf.dictFundSourceID ${entityBaseService.getInExpression('dictFundSourceIDs')}` : ''}
  group by ts.employeeNumberID, ws.isDayAsPlan, epf.dictProgClassID, emplNum.tabNum, dtc.timeCostType, dtcf.timeCostType, empPos.workScheduleID, emplNum.orgID, empPos.departmentID
  `,
  {
    orgIDs,
    dateTo: dateService.shiftDate(periodTo),
    dateFrom: dateService.shiftDate(periodFrom),
    dictProgClassIDs,
    dictFundSourceIDs,
    employeeNumberIDs
  })
  const res = JSON.parse(timeSheetS.asJSONObject)
  res.forEach(o => {
    o.factDay = o.isDayAsPlan ? ((['WORK', 'FREE'].includes(o.factTimeCostType) && o.planTimeCostType === 'WORK' ? o.factDay : 0)) : (o.factTimeCostType === 'WORK' ? o.factDay : 0)
  })
  return res
}
function getAccrualBalance (dictProgClassIDs, dictFundSourceIDs, periodTo, periodIDs) {
  const sqlDialect = entityBaseService.getSQLDialect()
  const accrualBalanceReq = UB.DataStore('hr_accrualBalance')
  accrualBalanceReq.runSQL(`SELECT 
    ab.employeeNumberID "employeeNumberID",
    ab.sumFrom "sumFrom",
    ab.sumTo "sumTo",
    n.description,
    ab.dictProgClassID as "dictProgClassID",
    ab.dictFundSourceID AS "dictFundSourceID",
    (SELECT  ${sqlDialect.top} fs.name from ac_fundSource fs where fs.ID = ab.dictFundSourceID
     ${sqlDialect.limit}) AS "dictFundSourceName",
    (SELECT  ${sqlDialect.top} dpc.name from ac_dictProgClass dpc where dpc.ID = ab.dictProgClassID
     ${sqlDialect.limit}) AS "dictProgClassName",
     (select ${sqlDialect.top} dep.name from 
      hr_department dep 
      where dep.mi_data_id = p.departmentID AND dep.state = 'ACTIVE' 
      and dep.mi_deleteDate >= '9999-12-31' order by dep.mi_dateTo ${sqlDialect.limit}) as "department",
    (select ${sqlDialect.top} dep.code from 
      hr_department dep where dep.mi_data_id = p.departmentID AND dep.state = 'ACTIVE' 
      and dep.mi_deleteDate >= '9999-12-31' order by dep.mi_dateTo  ${sqlDialect.limit}) as "departmentCode",
    p.departmentID as "departmentID",
    p.organizationID as "orgID",
    (SELECT ${sqlDialect.top} dep.name FROM hr_department dep 
      WHERE dep.mi_data_id = p.departmentID AND dep.state = 'ACTIVE' AND dep.mi_dateFrom <= p.dateTo AND dep.mi_deleteDate >= '9999-12-31'
      ORDER BY dep.mi_dateTo DESC ${sqlDialect.limit}) AS "depName",
    (SELECT  ${sqlDialect.top} dft.code 
      from ac_dictFundType dft
      left join ac_dictFundSource dfs2 on dfs2.dictFundTypeID = dft.ID  
      where dfs2.ID = ab.dictFundSourceID ${sqlDialect.limit}) AS "dictFundTypeCode"
    FROM hr_accrualBalance ab
    JOIN hr_employeeNumber n ON n.ID = ab.employeeNumberID
    LEFT JOIN hr_employeePosition p ON p.employeeNumberID = n.ID 
    AND (p.ID = (select ${sqlDialect.top}
    ep2.ID from hr_employeePosition ep2
    where ep2.employeeNumberID = n.ID
    and ep2.mi_deleteDate >= '9999-12-31'
    and ep2.isActive = 1 
    and ep2.dateFrom <= :dateTo:
    and (ep2.dateTo >= :dateTo: OR (n.dateTo < :dateTo: AND ep2.dateTo < :dateTo:))
    order by ep2.dateTo desc ${sqlDialect.limit})) AND p.mi_deleteDate >= '9999-12-31'
    WHERE ab.periodCalcID ${entityBaseService.getInExpression('periodIDs')} 
    ${dictProgClassIDs ? `and ab.dictProgClassID ${entityBaseService.getInExpression('dictProgClassIDs')}` : ''}
    ${dictFundSourceIDs ? `and ab.dictFundSourceID ${entityBaseService.getInExpression('dictFundSourceIDs')}` : ''}
     `,
  {
    dateTo: dateService.shiftDate(periodTo),
    periodIDs,
    dictProgClassIDs,
    dictFundSourceIDs
  })
  return accrualBalanceReq.getAsJsObject()
}
function getEmployeeList (orgIDs, periodTo, periodFrom, dictProgClassIDs, dictFundSourceIDs, dateReport) {
  const sqlDialect = entityBaseService.getSQLDialect()
  const employeeStore = UB.DataStore('hr_employeeNumber')
  employeeStore.runSQL(`SELECT  
    count(*) "employees", 
    ed.ID as "employeeDisabilityID", 
    n1.ID as "employeeNumberID",
    n1.employeeID as "employeeID", 
    ep.workPlace as "workPlace",
    epf.dictProgClassID as "dictProgClassID",
    epf.dictFundSourceID as "dictFundSourceID", 
    ep.mtCount as "rate",
    dpc.code as "dictProgClassCode",
    dfc.name as "dictFundSourceName",
    ep.departmentID as "departmentID",
    (select ${sqlDialect.top} dep.name from 
      hr_department dep 
      where dep.mi_data_id = ep.departmentID AND dep.state = 'ACTIVE' 
      and dep.mi_deleteDate >= '9999-12-31' order by dep.mi_dateTo ${sqlDialect.limit}) as "department",
    (select ${sqlDialect.top} dep.code from 
      hr_department dep where dep.mi_data_id = ep.departmentID AND dep.state = 'ACTIVE' 
      and dep.mi_deleteDate >= '9999-12-31' order by dep.mi_dateTo  ${sqlDialect.limit}) as "departmentCode",
    ep.organizationID as "orgID"
    FROM hr_employeeNumber n1
    left JOIN  hr_employeePosition ep ON ep.ID = (select ${sqlDialect.top} ep2.ID from hr_employeePosition ep2 where 
          ep2.employeeNumberID = n1.ID 
          and ep2.isActive = 1
          and ep2.dateFrom <= :dateTo:
          and ep2.mi_deleteDate >= '9999-12-31'
          order by ep2.dateFrom desc ${sqlDialect.limit})
    left join hr_empPosFundSource epf on epf.ID = (
            select ${sqlDialect.top} epf2.ID from hr_empPosFundSource epf2 
            where epf2.employeePositionID = ep.ID
            order by epf2.mi_createDate desc ${sqlDialect.limit})
    left join ac_dictProgClass dpc on dpc.ID = epf.dictProgClassID
    left join ac_dictFundSource dfc on dfc.ID = epf.dictFundSourceID
    LEFT JOIN hr_employeeDisability ed ON ed.ID = (select ${sqlDialect.top} ed2.ID from hr_employeeDisability ed2 where ed2.employeeID = n1.employeeID
      and ed2.dateFrom <= :dateTo:
      and ed2.dateTo >= :dateFrom:
      and ed2.mi_deleteDate >= '9999-12-31'
      order by ed2.dateFrom desc ${sqlDialect.limit})
    WHERE n1.orgID${entityBaseService.getInExpression('orgIDs')}
    and n1.dateFrom <= :dateTo:
    AND n1.dateTo >= :dateFrom:
    AND n1.mi_deleteDate >= '9999-12-31'
    and n1.empWorkPlace is NULL
    ${dictProgClassIDs ? `and epf.dictProgClassID ${entityBaseService.getInExpression('dictProgClassIDs')}` : ''}
    ${dictFundSourceIDs ? `and epf.dictFundSourceID ${entityBaseService.getInExpression('dictFundSourceIDs')}` : ''}
    group by ep.workPlace, ed.ID, n1.ID, epf.dictProgClassID, ep.mtCount, dpc.code, dfc.name, epf.dictFundSourceID, n1.employeeID, ep.organizationID, ep.departmentID`, {
    orgIDs,
    dateTo: dateService.shiftDate(periodTo),
    dateFrom: dateService.shiftDate(periodFrom),
    dateReport: dateService.shiftDate(dateReport),
    dictProgClassIDs,
    dictFundSourceIDs
  })
  const res = employeeStore.getAsJsObject()
  return res
}

function getAccrualFund (orgID, periodTo, periodFrom, dictProgClassIDs, dictFundSourceIDs, periodIDs) {
  const sqlDialect = entityBaseService.getSQLDialect()
  const accrualFundReq = UB.DataStore('hr_accrualFund')
  accrualFundReq.runSQL(`
      select pe.description as "description", pe.code,
      sum(adt.sourceSum) as "sourceSum",
      sum(adt.baseSum) as "baseSum",
      sum(adt.paySum) as "paySum",
      a.rate as "rate", adt.payElID as "payElID",
      f.isRecSum as "isRecSum",
      en.tabNum as "tabNum",
      f.name as "payFundName",
      en.orgID as "orgID",
      a.payFundID as "payFundID",
      meg.groupType as "methodGroupType",
      fm.code as "payFundMethodCode",  
      me.code as "methodCode",
      dpc.code as "dictProgClassCode",
      dpc.ID as "dictProgClassID",
      meg.name as "methodGroupName",
      meg.ID as "methodGroupID",
      en.ID AS "employeeNumberID",
      empl.fullFIO AS "fullFIO",
      a.periodSalaryID AS "periodSalaryID", 
      perSel.name AS "periodSalaryName",
      pe.name AS "payElName",
      pe.printName AS "printPayElName",
      a.periodCalcID AS "periodCalcID",
      (select name from hr_dictPeriod dictPer where dictPer.ID = a.periodCalcID and dictPer.mi_deleteDate >= '9999-12-31') AS "periodCalcName",
      (select ${sqlDialect.top} dep.name from 
        hr_department dep 
        where dep.mi_data_id = ep.departmentID AND dep.state = 'ACTIVE' 
          and dep.mi_deleteDate >= '9999-12-31' order by dep.mi_dateTo ${sqlDialect.limit}) as "departmentName",
      ep.departmentID as "departmentID",
      a.addMinSum as "addMinSum",
      (select ${sqlDialect.top} mbe.minSum from hr_maxBaseECB mbe where mbe.dateFrom <= perSel.dateFrom and mbe.dateTo >= perSel.dateTo and mbe.mi_deleteDate >= '9999-12-31' order by mbe.dateFrom desc ${sqlDialect.limit}) as "maxBaseECBMinSum",
      (select ${sqlDialect.top} mbe.maxSum from hr_maxBaseECB mbe where mbe.dateFrom <= perSel.dateFrom and mbe.dateTo >= perSel.dateTo and mbe.mi_deleteDate >= '9999-12-31' order by mbe.dateFrom desc ${sqlDialect.limit}) as "maxBaseECBMaxSum",
      f.entryOperationID as "entryOperationID",
      adt.dictFundSourceID as "dictFundSourceID",
      fs.name as "dictFundSourceName",
      (select sum(a2.sourceSum) from hr_accrualFund a2 
        JOIN hr_payFund f2 on f2.ID = a2.payFundID
        where a2.periodCalcID = a.periodSalaryID 
        and a2.periodSalaryID = a.periodSalaryID 
        and a2.employeeNumberID = en.ID 
        and a2.orgID = en.orgID
        AND f2.isRecSum = 0) as "salaryEmplSourceSum",
      (select sum(adt2.sourceSum) from hr_accrualFund a2
        JOIN hr_accrualFundDt adt2 on adt2.accrualFundID = a2.ID  
        JOIN hr_payFund f2 on f2.ID = a2.payFundID
        where a2.periodCalcID = a.periodSalaryID 
        and a2.periodSalaryID = a.periodSalaryID 
        and a2.employeeNumberID = en.ID 
        and a2.orgID = en.orgID
        AND f2.isRecSum = 0
        and a2.payFundID = a.payFundID
        and adt2.payElID = adt.payElID) as "salarySourceSum",
      (select sum(adt2.baseSum) from hr_accrualFund a2
        JOIN hr_accrualFundDt adt2 on adt2.accrualFundID = a2.ID  
        JOIN hr_payFund f2 on f2.ID = a2.payFundID
        where a2.periodCalcID = a.periodSalaryID 
        and a2.periodSalaryID = a.periodSalaryID 
        and a2.employeeNumberID = en.ID 
        and a2.orgID = en.orgID
        AND f2.isRecSum = 0
        and a2.payFundID = a.payFundID
        and adt2.payElID = adt.payElID) as "salaryBaseSumSum"
      FROM hr_employeeNumber en
      JOIN hr_accrualFund a on a.employeeNumberID = en.ID 
      JOIN hr_payFund f on f.ID = a.payFundID
      JOIN hr_payFundMethod fm on fm.ID = f.payFundMethodID    
      JOIN hr_accrualFundDt adt on adt.accrualFundID = a.ID  
      left join hr_payEl pe on pe.ID = adt.payElID
      left join hr_method me on me.ID = pe.methodID
      left join hr_methodGroup meg on meg.ID = me.methodGroupID
      left JOIN  hr_employeePosition ep ON 
           ep.ID = (select ${sqlDialect.top} ep2.ID from hr_employeePosition ep2 where 
           ep2.employeeNumberID = en.ID 
           and ep2.isActive = 1
           and ep2.dateFrom <= :periodDateTo:
           and ep2.mi_deleteDate >= '9999-12-31'
           order by ep2.dateFrom desc ${sqlDialect.limit})
      left join ac_dictProgClass dpc on dpc.ID = adt.dictProgClassID
      left join ac_fundSource fs on fs.ID = adt.dictFundSourceID
      left join hr_department dep on dep.ID = ep.departmentID
      left JOIN hr_employee empl on empl.ID = en.employeeID
      left join hr_dictPeriod perSel on perSel.ID = a.periodSalaryID
      WHERE en.orgID ${entityBaseService.getInExpression('orgID')} 
        and a.periodCalcID ${entityBaseService.getInExpression('periodIDs')}  
        ${!App.domainInfo.isEntityMethodsAccessible('hr_employeeNumber', 'employeeLimitedAccess') ? 'AND en.limitedAccess = 0' : ''}
        AND f.isRecSum = 0          
        AND en.empWorkPlace is null
        ${dictProgClassIDs ? `and adt.dictProgClassID ${entityBaseService.getInExpression('dictProgClassIDs')}` : ''}
        ${dictFundSourceIDs ? `and adt.dictFundSourceID ${entityBaseService.getInExpression('dictFundSourceIDs')}` : ''}
        and en.mi_deleteDate >= '9999-12-31'
      group by a.rate, adt.payElID, a.payFundID, pe.code, pe.description, f.isRecSum, en.tabNum, f.name, en.orgID, me.code, meg.groupType, fm.code, dpc.code, meg.name, meg.ID, en.ID, en.tabNum, empl.fullFIO, dep.name, pe.name, pe.printName, a.periodCalcID, pe.entryOperationID,a.periodSalaryID, a.addMinSum, dpc.ID, ep.departmentID, f.entryOperationID, adt.dictFundSourceID, fs.name, perSel.name, perSel.dateFrom, perSel.dateTo, ep.departmentID
      HAVING sum(a.sourceSum) <> 0 OR sum(a.baseSum) <> 0 OR sum(a.paySum) <> 0
      order by a.rate DESC`, {
    orgID,
    periodIDs,
    periodDateTo: dateService.shiftDate(periodTo),
    periodDateFrom: dateService.shiftDate(periodFrom),
    curDate: dateService.currentDate(),
    dictProgClassIDs,
    dictFundSourceIDs
  })
  const accrualFund = accrualFundReq.getAsJsObject()
  return accrualFund
}
