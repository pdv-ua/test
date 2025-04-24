const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const App = UB.App
const rlService = require('../HR/modules/rlService')
const periodService = require('../HR/modules/periodService')
const dateService = require('../AC/modules/dataServices/dateService')
const paySummaryService = require('../HR/modules/paySummaryService')
const accrualService = require('../HR/modules/accrualService')
const calcService = require('../HR/modules/calcService')
const { generateBase64Str } = require('../AC/modules/dataServices/filesService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')
const exportSapService = require('../HR/modules/export/exportSapService')

me.entity.addMethod('setPackCalc')
me.entity.addMethod('getPaySummary')
me.entity.addMethod('getPaySummaryCalcState')
me.entity.addMethod('getDataByOperation')
me.entity.addMethod('getDataByPayEl')
me.entity.addMethod('getDataByPayFund')
me.entity.addMethod('postingXLSX')
me.entity.addMethod('doPosting')
me.entity.addMethod('doCancelPosting')
me.entity.addMethod('calcEntry')
me.entity.addMethod('calcPeriodOrgBalance')
me.entity.addMethod('calcPeriodOrg')
me.entity.addMethod('exportSap')
me.entity.addMethod('getDebtSummary')

me.setPackCalc = function (ctx) {
  const mParams = ctx.mParams
  if (!mParams.orgID) {
    return
  }
  calcService.addCalcQueue({ orgID: mParams.orgID, calcBalance: mParams.calcBalance, description: `Натиснули кнопку Розрахувати в Розрахункових періодах` })
  if (mParams.withSubOrg) {
    const orgIDs = UB.Repository('hr_organization')
      .attrs(['mi_data_id'])
      .where('state', '=', 'ACTIVE')
      .where('mi_treePath', 'like', `%${mParams.orgID}%`)
      .where('mi_data_id', 'notEqual', mParams.orgID)
      .groupBy('mi_data_id')
      .selectAsObject()
    orgIDs.forEach(org => {
      calcService.addCalcQueue({ orgID: org.mi_data_id, calcBalance: mParams.calcBalance, description: `Натиснули кнопку Розрахувати в Розрахункових періодах` })
    })
  }
}

me.calcEntry = function (ctx) {
  const mParams = ctx.mParams
  if (!mParams.orgID) {
    return
  }
  const period = periodService.getPeriod(mParams.periodID)
  paySummaryService.savePeriodOrgEntry(mParams.orgID, period)
}
me.calcPeriodOrgBalance = function (ctx) {
  const mParams = ctx.mParams
  if (!mParams.orgID) {
    return
  }
  const period = periodService.getCurrentPeriod(mParams.orgID)
  paySummaryService.savePeriodOrgBalance(mParams.orgID, period)
}

me.calcPeriodOrg = function (ctx) {
  const db = App.dbConnections[App.domainInfo.entities.ubm_enum.connectionName]
  const mParams = ctx.mParams
  const sqlDialect = entityBaseService.getSQLDialect()
  const store = UB.DataStore('hr_calcQueue')
  if (!mParams.orgID) {
    return
  }
  const period = periodService.getCurrentPeriod(mParams.orgID)
  if (period.ID) {
    const runQuery = () => {
      store.execSQL(`UPDATE hr_employeeNumState SET flags = 0, mi_modifyDate = :modifyDate: 
        WHERE flags != 0 AND employeeNumberID IN (SELECT en.ID FROM hr_employeeNumber en  
        WHERE en.orgID = :orgID: AND en.dateFrom <= :dateTo: AND en.dateTo >= :dateFrom: 
        AND en.mi_deleteDate >= '9999-12-31')`,
      {
        modifyDate: new Date((new Date()).setMilliseconds(0)),
        orgID: mParams.orgID,
        dateFrom: dateService.addMonths(period.dateFrom, -3),
        dateTo: period.dateTo
      })
    }
    try {
      db.savepointWrap(runQuery)
      App.dbCommit()
    } catch (error) {
      console.error(error)
    }

    store.runSQL(` SELECT ns.ID "ID", en.ID AS "employeeNumberID", ns.mi_modifyDate "mi_modifyDate", ns.flags
                   FROM hr_employeeNumber en
                   LEFT JOIN hr_employeeNumState ns ON en.ID = ns.employeeNumberID
                   WHERE en.orgID = :orgID: AND ((en.dateFrom <= :dateTo: AND en.dateTo >= :dateFrom:)
                   ${period.priorPeriodID ? ` OR (EXISTS (select 1 from hr_accrualBalance b where b.employeeNumberID = en.ID and b.periodCalcID = :priorPeriodID: and b.sumTo <> 0))
                   OR (EXISTS (select 1 from hr_accrual a where a.employeeNumberID = en.ID and a.periodCalcID = :periodID:))` : ''})
                   AND en.empWorkPlace is null 
                   AND NOT EXISTS (SELECT 1 from hr_employeePosition p where p.employeeNumberID = en.ID and p.workPlace = '2' AND p.isActive = 1 AND p.dateFrom <= :dateTo: AND p.dateTo >= :dateFrom: 
           AND p.mi_deleteDate >= '9999-12-31') AND en.mi_deleteDate >= '9999-12-31'`,
    {
      orgID: mParams.orgID,
      dateFrom: dateService.addMonths(period.dateFrom, -3),
      dateTo: period.dateTo,
      priorPeriodID: period.priorPeriodID,
      periodID: period.ID
    })
    const employeeNumbers = store.getAsJsObject()
    const payCalcID = rlService.startPayCalc(mParams.orgID, employeeNumbers.length, 0, `Перерахунок ЗП orgID = ${mParams.orgID}`)
    const stopDate = rlService.autoCalculate({
      orgID: mParams.orgID,
      periodID: period.ID,
      payCalcID,
      employeeNumbers
    })
    rlService.stopPayCalc(payCalcID, stopDate)
  }
}
me.getPaySummaryCalcState = function (ctx) {
  const mParams = ctx.mParams
  if (!mParams.periodID) {
    return
  }

  const period = periodService.getPeriod(mParams.periodID)
  if (period.isCurrent) {
    const employeeNumbers = UB.Repository('hr_employeeNumberS')
      .attrs(['ID'])
      .where('orgID', '=', period.orgID)
      .where('dateFrom', '<=', period.dateTo)
      .where('dateTo', '>=', period.dateFrom)
      .selectAsObject().map(o => o.ID)
    const recalcEmployeeNumbers = UB.Repository('hr_employeeNumState')
      .attrs(['employeeNumberID.tabNum', 'employeeNumberID.employeeID.fullFIO'])
      .where('flags', '=', 0)
      .where('employeeNumberID', 'in', employeeNumbers)
      .orderBy('employeeNumberID.tabNum')
      .selectAsObject({
        'employeeNumberID.tabNum': 'tabNum',
        'employeeNumberID.employeeID.fullFIO': 'fullFIO'
      })
    const calcOrgState = UB.Repository('hr_calcOrgState')
      .attrs(['flags'])
      .where('orgID', '=', period.orgID)
      .selectScalar()
    mParams.resultData = JSON.stringify(recalcEmployeeNumbers)
    mParams.orgBalance = calcOrgState
    mParams.percent = accrualService.round(Math.max((100 / (employeeNumbers.length || 1) * ((employeeNumbers.length || 0) - recalcEmployeeNumbers.length)) - (!calcOrgState ? 2 : 0), 0), 0)
  } else {
    mParams.resultData = JSON.stringify([])
    mParams.orgBalance = true
    mParams.percent = 100
  }
}

me.getPaySummary = function (ctx) {
  const mParams = ctx.mParams
  if (!mParams.periodID) {
    return
  }

  const period = periodService.getPeriod(mParams.periodID)
  let percent = 100
  if (period.isCurrent) {
    const employeeNumbers = UB.Repository('hr_employeeNumberS')
      .attrs(['ID'])
      .where('orgID', '=', period.orgID)
      .where('dateFrom', '<=', period.dateTo)
      .where('dateTo', '>=', period.dateFrom)
      .selectAsObject().map(o => o.ID)
    const recalcEmployeeNumbers = UB.Repository('hr_employeeNumState')
      .attrs(['employeeNumberID'])
      .where('flags', '=', 0)
      .where('employeeNumberID', 'in', employeeNumbers)
      .selectAsObject()
    const calcOrgState = UB.Repository('hr_calcOrgState')
      .attrs(['flags'])
      .where('orgID', '=', period.orgID)
      .selectScalar()
    percent = accrualService.round(Math.max((100 / (employeeNumbers.length || 1) * ((employeeNumbers.length || 0) - recalcEmployeeNumbers.length)) - (!calcOrgState ? 2 : 0), 0), 0)
  }
  mParams.percent = percent
  mParams.currentPeriod = periodService.getCurrentPeriod(period.orgID)
  mParams.resultData = JSON.stringify(paySummaryService.getDataByPeriod(mParams.periodID, mParams.dictFundSourceID, mParams.departmentID, mParams.childDep, mParams.dictProgClassID, mParams.dictProjectID))
}

me.getDataByOperation = function (ctx) {
  const mParams = ctx.mParams
  mParams.resultData = JSON.stringify(paySummaryService.getDataByOperation(mParams.operationID))
}

me.getDataByPayEl = function (ctx) {
  const mParams = ctx.mParams
  mParams.resultData = JSON.stringify(paySummaryService.getDataByPayEl(mParams.periodID, mParams.payElID, mParams.dictFundSourceID, mParams.departmentID, mParams.childDep, mParams.dictProgClassID, mParams.dictProjectID))
}

me.getDataByPayFund = function (ctx) {
  const mParams = ctx.mParams
  mParams.resultData = JSON.stringify(paySummaryService.getDataByPayFund(mParams.periodID, mParams.payFundID, mParams.dictFundSourceID, mParams.departmentID, mParams.childDep, mParams.dictProgClassID, mParams.dictProjectID))
}
me.postingXLSX = function (ctx) {
  const mParams = ctx.mParams
  const period = periodService.getPeriod(mParams.periodID)
  const result = paySummaryService.postingXLSX(period)
  mParams.data = JSON.stringify(generateBase64Str(result.data))
  mParams.fileName = result.fileName
}

me.doPosting = function (ctx) {
  const mParams = ctx.mParams
  const period = mParams.closePeriod ? periodService.getCurrentPeriod(mParams.orgID) : periodService.getPeriod(mParams.periodID)
  if (!period.isClosed && !mParams.closePeriod) {
    mParams.message = UB.i18n(`Операція неможлива для періода {0}`, period.name)
  }
  mParams.message = paySummaryService.doPostingEntry(period, mParams.withoutFundSource)
}

me.doCancelPosting = function (ctx) {
  const mParams = ctx.mParams
  const currentPeriod = mParams.openPeriod ? periodService.getCurrentPeriod(mParams.orgID) : null
  const period = mParams.openPeriod ? periodService.getPeriod(currentPeriod.priorPeriodID) : periodService.getPeriod(mParams.periodID)
  if (!period.isClosed) {
    mParams.message = UB.i18n(`Операція неможлива для періода {0}`, period.name)
  }
  mParams.message = paySummaryService.doCancelPostingEntry(period)
}

me.exportSap = function (ctx) {
  const mParams = ctx.mParams
  mParams.exportMethods = JSON.stringify(exportSapService.exportSap(mParams))
}

me.getDebtSummary = function (ctx) {
  const sqlDialect = entityBaseService.getSQLDialect()
  const mParams = ctx.mParams
  const params = JSON.parse(mParams.params)
  const calcPeriod = periodService.getPeriod(params.periodCalcID)
  let dictFundSource = ''
  let dictProgClass = ''
  let dictProject = ''
  if (params.dictFundSourceIDs) {
    params.dictFundSourceIDs = params.dictFundSourceIDs.filter(ID => ID !== 0)
  }
  if (params.dictProgClassIDs) {
    params.dictProgClassIDs = params.dictProgClassIDs.filter(ID => ID !== 0)
  }
  if (params.dictProjectIDs) {
    params.dictProjectIDs = params.dictProjectIDs.filter(ID => ID !== 0)
  }
  if (params.dictFundSourceIDs && params.dictFundSourceIDs.length && params.isWithEmptyFundSource) {
    dictFundSource = `AND (ab.dictFundSourceID IS NULL OR ab.dictFundSourceID${entityBaseService.getInExpression('dictFundSourceIDs')} )`
  } else if (params.dictFundSourceIDs && params.dictFundSourceIDs.length && !params.isWithEmptyFundSource) {
    dictFundSource = `AND ab.dictFundSourceID${entityBaseService.getInExpression('dictFundSourceIDs')}`
  } else if (params.isWithEmptyFundSource) {
    dictFundSource = `AND ab.dictFundSourceID IS NULL`
  }
  if (params.dictProgClassIDs && params.dictProgClassIDs.length && params.isWithEmptyDictProgClass) {
    dictProgClass = `AND (ab.dictProgClassID IS NULL OR ab.dictProgClassID${entityBaseService.getInExpression('dictProgClassIDs')} )`
  } else if (params.dictProgClassIDs && params.dictProgClassIDs.length && !params.isWithEmptyDictProgClass) {
    dictProgClass = `AND ab.dictProgClassID${entityBaseService.getInExpression('dictProgClassIDs')}`
  } else if (params.isWithEmptyDictProgClass) {
    dictProgClass = `AND ab.dictProgClassID IS NULL`
  }
  if (params.dictProjectIDs && params.dictProjectIDs.length && params.isWithEmptyDictProject) {
    dictProject = `AND (ab.dictProjectID IS NULL OR ab.dictProjectID${entityBaseService.getInExpression('dictProjectIDs')} )`
  } else if (params.dictProjectIDs && params.dictProjectIDs.length && !params.isWithEmptyDictProject) {
    dictProject = `AND ab.dictProjectID${entityBaseService.getInExpression('dictProjectIDs')}`
  } else if (params.isWithEmptyDictProject) {
    dictProject = `AND ab.dictProjectID IS NULL`
  }

  let deptIDs = null
  if (params.departmentID) {
    const dept = UB.Repository('hr_department')
      .attrs(['description', 'fullName', 'mi_treePath'])
      .where('mi_data_id', '=', params.departmentID)
      .where('state', '=', 'ACTIVE')
      .misc({ __mip_ondate: calcPeriod.dateTo })
      .selectSingle()
    if (params.childDep) {
      const departments = UB.Repository('hr_department')
        .attrs(['mi_data_id'])
        .where('orgID', '=', params.orgID)
        .where('state', '=', 'ACTIVE')
        .where('mi_dateFrom', '<=', calcPeriod.dateTo)
        .where('mi_dateTo', '>=', calcPeriod.dateTo)
        .where('mi_treePath', 'startsWith', dept.mi_treePath)
        .misc({ __mip_recordhistory_all: true })
        .groupBy('mi_data_id')
        .selectAsObject()
      if (departments.length) {
        deptIDs = departments.map(o => o.mi_data_id)
      } else {
        deptIDs = [params.departmentID]
      }
    } else {
      deptIDs = [params.departmentID]
    }
  }
  const accrualBalance = UB.DataStore('hr_accrualBalance')
  accrualBalance.runSQL(`SELECT ab.employeeNumberID "employeeNumberID", n.description, ab.sumFrom "sumFrom",
    n.dateFrom AS "dateFrom", ab.sumPlus "sumPlus", ab.sumMinus "sumMinus", ab.sumPay "sumPay", ab.sumTo "sumTo",
    ab.dictProjectID as "dictProjectID",
    ab.dictProgClassID as "dictProgClassID",
    (SELECT  ${sqlDialect.top} fs.description from ac_fundSource fs where fs.ID = ab.dictFundSourceID
     ${sqlDialect.limit}) AS "fundSource",
    (SELECT  ${sqlDialect.top} fs.ID from ac_fundSource fs where fs.ID = ab.dictFundSourceID
     ${sqlDialect.limit}) AS "fundSourceID",
    (SELECT  ${sqlDialect.top} dp.description from ac_dictProject dp where dp.ID = ab.dictProjectID
     ${sqlDialect.limit}) AS "dictProject",
    (SELECT  ${sqlDialect.top} dp.ID from ac_dictProject dp where dp.ID = ab.dictProjectID
     ${sqlDialect.limit}) AS "dictProjectID",
    (SELECT  ${sqlDialect.top} dpc.description from ac_dictProgClass dpc where dpc.ID = ab.dictProgClassID
     ${sqlDialect.limit}) AS "dictProgClass",
    (SELECT  ${sqlDialect.top} dpc.ID from ac_dictProgClass dpc where dpc.ID = ab.dictProgClassID
     ${sqlDialect.limit}) AS "dictProgClassID",
     
   (SELECT ${sqlDialect.top} dep.name FROM hr_department dep 
      WHERE dep.mi_data_id = p.departmentID AND dep.state = 'ACTIVE' AND dep.mi_dateFrom <= p.dateTo AND dep.mi_deleteDate >= '9999-12-31'
      ORDER BY dep.mi_dateTo DESC ${sqlDialect.limit}) AS "depName",
      
   (SELECT ${sqlDialect.top} (CASE WHEN pos.name IS NOT NULL THEN pos.name ELSE dp.name END)
    FROM hr_employeePosition ep
    LEFT JOIN hr_position pos
      ON pos.mi_data_id = ep.positionID
      AND pos.orgID = ep.organizationID
      AND pos.state = 'ACTIVE' AND ep.dateFrom <= :dateTo:
      AND pos.mi_dateFrom <= ep.dateTo
      AND pos.mi_deleteDate >= '9999-12-31'
    LEFT JOIN hr_dictPosition dp
      ON dp.ID = ep.dictPositionID
    WHERE ep.ID = p.ID
    AND ep.isActive = 1
    AND ep.mi_deleteDate >= '9999-12-31'
    ORDER BY ep.dateTo DESC, pos.mi_dateTo DESC ${sqlDialect.limit}) AS "posName",
    
    ${entityBaseService.isMsSql() ? '(CASE YEAR(n.dateTo)  WHEN 9999 THEN NULL  ELSE n.dateTo END)'
    : '(CASE Extract(YEAR from n.dateTo) WHEN 9999 THEN null ELSE n.dateTo END)'} AS "dateTo",
    
 (SELECT ${sqlDialect.top} en.code 
     FROM ubm_enum en WHERE en.code = p.workPlace AND en.eGroup = 'HR_WORKER_PLACE' ${sqlDialect.limit}) AS "workPlace"
   
     
    FROM hr_accrualBalance ab
    JOIN hr_employeeNumber n ON n.ID = ab.employeeNumberID
    LEFT JOIN hr_employeePosition p ON p.employeeNumberID = n.ID AND p.isActive = 1 
    AND (p.ID = (select ${sqlDialect.top}
    ep2.ID from hr_employeePosition ep2
    where ep2.employeeNumberID = n.ID
    and ep2.mi_deleteDate >= '9999-12-31'
    and ep2.isActive = 1 AND ep2.dateFrom <= :dateTo:
    AND (ep2.dateTo >= :dateTo: OR (n.dateTo < :dateTo: AND ep2.dateTo < :dateTo:)) 
    ${deptIDs ? ` and ep2.departmentID${entityBaseService.getInExpression('deptIDs')}` : ''}
    order by ep2.dateTo desc ${sqlDialect.limit})) AND p.mi_deleteDate >= '9999-12-31'
    WHERE ab.periodCalcID = :periodCalcID:
    ${deptIDs ? ` and p.departmentID${entityBaseService.getInExpression('deptIDs')}` : ''}
  ${dictFundSource}
  ${dictProgClass}
  ${dictProject}
     `,
  {
    dateTo: calcPeriod.dateTo,
    periodCalcID: params.periodCalcID,
    deptIDs,
    dictFundSourceIDs: params.dictFundSourceIDs,
    dictProgClassIDs: params.dictProgClassIDs,
    dictProjectIDs: params.dictProjectIDs
  })
  mParams.resultData = JSON.stringify(accrualBalance.getAsJsObject())
}
