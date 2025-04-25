const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')
const selectService = require('../AC/modules/dataServices/selectService')
const currencyService = require('../AC/public/core/currencyService')
const dateService = require('../AC/modules/dataServices/dateService')
const staffService = require('./modules/staffService')
const _ = require('lodash')
const settingsService = require('../AC/modules/entityServices/settingsService')
const periodService = require('./modules/periodService')

me.entity.addMethod('search')
me.entity.addMethod('getMemOrder5PayReportData')
me.entity.addMethod('getSignerData')
me.entity.addMethod('getAnnexMemorialOrder5')
me.entity.addMethod('getSchoolID')
me.entity.addMethod('getMemOrder5Data')

me.getSchoolID = function (parentIDs) {
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
me.getMemOrder5PayReportData = function (ctx) {
  const mParams = ctx.mParams
  let store = UB.DataStore('hr_memorialOrder5')

  let objRunsql = getMemoOrder5BaseSQl(ctx)
  store.runSQL(objRunsql.runsql, objRunsql.params)

  let payAccOperationTable = store.getAsJsObject()
  let payTotalSum = 0

  if (payAccOperationTable.length > 0) {
    let arrEntryOperationID = payAccOperationTable.map(per => per.entryOperationID).filter(Boolean).filter((el, index, arr) => arr.indexOf(el) === index)
    let arrAccountDtID = payAccOperationTable.map(per => per.accountDtID).filter(Boolean).filter((el, index, arr) => arr.indexOf(el) === index)
    let arrAccountKtID = payAccOperationTable.map(per => per.accountKtID).filter(Boolean).filter((el, index, arr) => arr.indexOf(el) === index)
    let dictFundSource = (mParams.dictFundSourceID && !mParams.dictFundSourceID.length && mParams.isIncludeEmpty) ? `and pdt.dictFundSourceID IS NULL`
      : (mParams.dictFundSourceID && mParams.dictFundSourceID.length && !mParams.isIncludeEmpty) ? `and pdt.dictFundSourceID${entityBaseService.getInExpression('dictFundSourceID')}`
        : (mParams.dictFundSourceID && mParams.dictFundSourceID.length && mParams.isIncludeEmpty) ? `and (pdt.dictFundSourceID${entityBaseService.getInExpression('dictFundSourceID')} OR pdt.dictFundSourceID IS NULL)` : ''

    store.runSQL(`Select 
p.payElID as "payElID"
,pay.description as "payElDescription"
,sum(p.paySum) as "sumPay"
, pdt.accountDtID as "accountDtID"
, pdt.accountKtID as "accountKtID"
, pao.entryOperationID as "entryOperationID"
FROM
hr_payAccOperationPayEl p
JOIN hr_payAccOperationDt pdt on p.payAccOperationDtID = pdt.ID
JOIN hr_payEl pay on p.payElID = pay.ID and pay.mi_deleteDate >= '9999-12-31' 
JOIN hr_payAccOperation pao on pdt.payAccOperationID = pao.ID
WHERE pao.entryOperationID IN (${arrEntryOperationID}) 
AND pdt.accountDtID IN (${arrAccountDtID}) 
AND pdt.accountKtID IN (${arrAccountKtID}) 
AND pao.periodSalaryID = :periodCalc:
${dictFundSource}
GROUP BY pay.codeSort, p.payElID, pay.description, pdt.accountDtID, pdt.accountKtID, pao.entryOperationID
ORDER BY pay.codeSort
`,
    {
      periodCalc: mParams.periodID,
      dictFundSourceID: mParams.dictFundSourceID
    })
    let allPayAccOperationDt = store.getAsJsObject()
    store.freeNative()

    let k = 1
    payAccOperationTable.forEach(row => {
      row['pn'] = k
      row['sum'] = row['sum'] ? currencyService.round(row['sum'], 2) : 0
      payTotalSum = currencyService.round(payTotalSum + row['sum'], 2)
      row['sum'] = currencyService.formatAsCurrency(row['sum'], 2)

      row['payElCells'] = []
      let curRowDt = allPayAccOperationDt.filter(item => item.entryOperationID === row.entryOperationID &&
                item.accountDtID === row.accountDtID &&
                item.accountKtID === row.accountKtID)

      curRowDt.forEach(item => {
        row['payElCells'].push({ payElDescription: item.payElDescription,
          periodSalaryName: item.periodSalaryName,
          sumPay: item.sumPay ? currencyService.formatAsCurrency(item.sumPay, 2) : '0,00' })
      })
      k++
    })
  }

  const totalSum = payTotalSum ? currencyService.formatAsCurrency(payTotalSum, 2) : '0,00'
  const totalSumText = payTotalSum ? currencyService.currencyToWordsUkr(currencyService.round(payTotalSum > 0 ? payTotalSum : -payTotalSum, 2)) : '0,00'

  ctx.mParams.resultData = JSON.stringify({
    resultData: payAccOperationTable,
    totalSum,
    totalSumText
  })
}

me.search = function (ctx) {
  let objRunsql = getMemoOrder5BaseSQl(ctx)
  ctx.dataStore.runSQL(objRunsql.runsql, objRunsql.params)
  ctx.inherite = false

  return true
}

me.getWhereClause = function (mParams) {
  return `
    po.orgID = :orgID: 
    and po.periodSalaryID = :periodID:
    ${(mParams.dictFundSourceID && !mParams.dictFundSourceID.length && mParams.isIncludeEmpty) ? `and pd.dictFundSourceID IS NULL` : ''}
    ${(mParams.dictFundSourceID && mParams.dictFundSourceID.length && !mParams.isIncludeEmpty) ? `and pd.dictFundSourceID${entityBaseService.getInExpression('dictFundSourceID')}` : ''}
    ${(mParams.dictFundSourceID && mParams.dictFundSourceID.length && mParams.isIncludeEmpty) ? `and (pd.dictFundSourceID${entityBaseService.getInExpression('dictFundSourceID')} OR pd.dictFundSourceID IS NULL)` : ''}
  `
}
function getMemoOrder5BaseSQl (ctx) {
  const mParams = ctx.mParams
  let runsql
  const sqlDialect = entityBaseService.getSQLDialect()
  let sqlBuilder = {
    text: `
    select {0} {1}
    FROM hr_payAccOperation po
    JOIN hr_payAccOperationDt pd on po.ID = pd.payAccOperationID
    {2}
    GROUP BY po.entryOperationID, pd.accountDtID, pd.accountKtID
    {3} {4}
  `,
    clauses: {},
    aliases: {
      entryOperationName: { field: ` (select ${sqlDialect.top} enop.name from hr_entryOperation enop where po.entryOperationID = enop.ID and enop.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit}) ` },
      entryOperationCode: { field: ` (select ${sqlDialect.top} enop.code from hr_entryOperation enop where po.entryOperationID = enop.ID and enop.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit}) ` },
      accountDtCode: { field: ` (select ${sqlDialect.top} glacc.code from gl_account glacc where pd.accountDtID = glacc.ID and glacc.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit}) ` },
      accountKtCode: { field: ` (select ${sqlDialect.top} glacc.code from gl_account glacc where pd.accountKtID = glacc.ID and glacc.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit}) ` },
      sum: { field: ` sum(pd.sumOperation) ` },
      entryOperationID: { field: ` po.entryOperationID ` },
      accountDtID: { field: ` pd.accountDtID ` },
      accountKtID: { field: ` pd.accountKtID ` }
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
  sqlBuilder.clauses.whereParams.periodID = mParams.periodID
  sqlBuilder.clauses.whereParams.dictFundSourceID = mParams.dictFundSourceID
  if (mParams.auditOrganization) {
    sqlBuilder.clauses.whereParams.auditOrganization = mParams.auditOrganization
  }

  if (mParams.options && mParams.options.totalRequired) {
    runsql = UB.format(sqlBuilder.text, '', 'count(*)', sqlBuilder.clauses.whereClause, ' ORDER BY entryOperationCode', '')
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

  return { runsql, params: sqlBuilder.clauses.whereParams }
}
me.getSignerData = ctx => {
  const params = ctx.mParams
  let onDate = dateService.shiftDate(params.onDate)

  const fieldPos = params.useActualPositionName
    ? 'ep.factPosition as "posName"'
    : `${staffService.getPosFldOnDateSql(':onDate:', 'ep.positionID', 'name', 'ep.dictPositionID')} as "posName"`
  const employeePositionDS = UB.DataStore('hr_employeePositionS')
  employeePositionDS.runSQL(`  SELECT ep.ID as "epID", emp.shortFIO as "shortFIO", 
   ${fieldPos}    
    FROM hr_employeePosition ep 
    INNER JOIN hr_employee emp ON emp.ID = ep.employeeID and emp.mi_deleteDate >= '9999-12-31'      
    WHERE
      ep.ID in (${params.signers})
      and ep.isActive = 1
      and ep.mi_deleteDate >= '9999-12-31'      
  `, {
    onDate
  })
  const signersData = JSON.parse(employeePositionDS.asJSONObject)
  employeePositionDS.freeNative()

  ctx.mParams.resultData = JSON.stringify(signersData)
}
me.getAnnexMemorialOrder5 = ctx => {
  const params = ctx.mParams.execParams

  const dictProgClassIDs = params.dictProgClassID && params.dictProgClassID.length ? params.dictProgClassID.split(',').map(o => Number(o)) : null
  const dictFundSourceIDs = params.dictFundSourceID && params.dictFundSourceID.length ? params.dictFundSourceID.split(',').map(o => Number(o)) : null
  const dictFundSourceName = params.dictFundSourceName && params.dictFundSourceName.length ? params.dictFundSourceName.split(', ') : ''
  const orgIDs = me.getSchoolID(JSON.parse(params.orgIDs))
  const orgID = params.joinReport && orgIDs.length ? orgIDs : [params.orgID]
  const reportColum = ['salary1', 'salary2', 'salary3', 'salary4', 'salary5', 'salary6', 'salary7', 'salary8', 'salary19', 'salary20']
  const parentOrdID = settingsService.getByCode('hrUseReportSettingsParentOrg', params.orgID)

  const idParams = UB.Repository('hr_idParam')
    .attrs(['listParamID.code', 'listParamID.shortName', 'valuesID'])
    .where('[listParamID.code]', 'in', reportColum)
    .where('[orgID]', '=', Number(parentOrdID || params.orgID))
    .where('[listParamID.mi_deleteUser]', 'isNull')
    .selectAsObject({ 'listParamID.code': 'code', 'listParamID.shortName': 'shortName', 'valuesID': 'payElID' })
  // delete
  const orgsCode = UB.Repository('hr_organization')
    .attrs(['code', 'mi_data_id'])
    .where('mi_data_id', 'in', orgID)
    .where('state', '=', 'ACTIVE')
    .selectAsObject()

  const periodIDs = UB.Repository('hr_dictPeriod')
    .attrs(['ID', 'orgID'])
    .where('orgID', 'in', orgID)
    .where('dateFrom', '=', dateService.shiftDate(params.periodFrom))
    .where('dateTo', '=', dateService.shiftDate(params.periodTo))
    .selectAsObject().map(o => o.ID)

  const accrualFundReq = UB.DataStore('hr_accrualFund')
  accrualFundReq.runSQL(`SELECT f1.orgID as "orgID", f1.employeeNumberID as "employeeNumberID", d1.dictProgClassID as "dictProgClassID", d1.code as "code", sum(pd.paySum) as "paySum", f1.rate as "rate", e1.code as "taxECBCode", pd.payElID as "payElID", m.code as "methodCode", d1.entryOperationID as "entryOperationID"
    from hr_accrualFund f1
    join hr_accrualFundDt pd on pd.accrualFundID = f1.ID
    join hr_payEl pe on pe.ID = pd.payElID
    join hr_method m on m.ID = pe.methodID
    join hr_payFund d1 on d1.ID = f1.payFundID
    join hr_dictTypeTaxECB e1 on e1.ID = d1.typeTaxECBID 
    where f1.payFundID in (  
      select d2.ID 
      from hr_payFund d2
      inner join hr_payFundBase b1 on b1.payFundID = d2.ID 
        and b1.mi_deleteDate >= '9999-12-31'
      inner join hr_payEl l1 on l1.ID = b1.payElID
      inner join hr_method m1 on m1.ID = l1.methodID
      inner join hr_methodGroup g1 on g1.ID = m1.methodGroupID 
      group by d2.ID
      )
      and f1.periodCalcID in (${periodIDs})
      ${dictFundSourceIDs ? `and d1.dictFundSourceID in (${dictFundSourceIDs})` : ''}
      group by f1.orgID, f1.employeeNumberID, d1.dictProgClassID, d1.code, f1.rate, e1.code, pd.payElID, m.code, d1.entryOperationID`, {
    // periodCalcID: params.periodID
  })
  const accrualFund = JSON.parse(accrualFundReq.asJSONObject)

  const baseRequest = UB.Repository('hr_payAccOperationPayEl')
    .attrs(['paySum', 'payElID', 'payElID.description', 'payElID.methodID.code', 'payElID.methodID.methodGroupID.groupType', 'payElID.methodID.name', 'payAccOperationDtID.payAccOperationID.entryOperationID.description', 'payAccOperationDtID.accountDtID.code', 'payAccOperationDtID.accountDtID.name', 'payAccOperationDtID.dictProgClassID', 'payElID.code', 'payAccOperationDtID.dictProgClassID.code', 'payAccOperationDtID.payAccOperationID.orgID', 'payElID.methodID.methodGroupID.code', 'payAccOperationDtID.payAccOperationID.entryOperationID'])
    .whereIf(dictFundSourceIDs, 'payAccOperationDtID.dictFundSourceID', 'in', dictFundSourceIDs)
    .whereIf(dictProgClassIDs, 'payAccOperationDtID.dictProgClassID', 'in', dictProgClassIDs)
    .where('payAccOperationDtID.payAccOperationID.periodSalaryID', 'in', periodIDs)
    .selectAsObject({
      'payElID.description': 'description',
      'payElID.code': 'code',
      'payAccOperationDtID.payAccOperationID.orgID': 'orgID',
      'payElID.methodID.code': 'methodCode',
      'payElID.methodID.methodGroupID.code': 'methodGroupCode',
      'payElID.methodID.methodGroupID.groupType': 'payType',
      'payAccOperationDtID.payAccOperationID.entryOperationID.description': 'entryOperation',
      'payAccOperationDtID.accountDtID.code': 'accountDtCode',
      'payAccOperationDtID.accountDtID.name': 'accountDtName',
      'payAccOperationDtID.dictProgClassID': 'dictProgClassID',
      'payAccOperationDtID.payAccOperationID.orgID.code': 'orgCode',
      'payAccOperationDtID.dictProgClassID.code': 'dictProgClassCode',
      'payAccOperationDtID.payAccOperationID.entryOperationID': 'entryOperationID'
    }).filter(o => {
      return accrualFund.find(a => a.entryOperationID === o.entryOperationID) ? o.entryOperationID !== accrualFund.find(a => a.entryOperationID === o.entryOperationID).entryOperationID : o
    })

  const accrualFundHospReq = UB.DataStore('hr_accrualFund')
  accrualFundHospReq.runSQL(`SELECT f1.orgID as "orgID", f1.employeeNumberID as "employeeNumberID", d1.dictProgClassID as "dictProgClassID", d1.code as "code", sum(f1.paySum) as "paySum", f1.rate as "rate", e1.code as "taxECBCode"
    from hr_accrualFund f1
    inner join hr_payFund d1 on d1.ID = f1.payFundID
    inner join hr_dictTypeTaxECB e1 on e1.ID = d1.typeTaxECBID
    and e1.code in ('29', '36', '37', '39') 
    where f1.payFundID in (  
      select d2.ID 
      from hr_payFund d2
      inner join hr_payFundBase b1 on b1.payFundID = d2.ID 
        and b1.mi_deleteDate >= '9999-12-31'
      inner join hr_payEl l1 on l1.ID = b1.payElID
      inner join hr_method m1 on m1.ID = l1.methodID
      inner join hr_methodGroup g1 on g1.ID = m1.methodGroupID
      where g1.code = '5'
      and m1.code not in ('18','19','20','38','40','51','52','53','135')
      group by d2.ID
      )
      and f1.periodCalcID in (${periodIDs})
      ${dictFundSourceIDs ? `and d1.dictFundSourceID in (${dictFundSourceIDs})` : ''}
      group by f1.orgID, f1.employeeNumberID, d1.dictProgClassID, d1.code, f1.rate, e1.code`, {
    // periodCalcID: params.periodID
  })
  const accrualFundHosp = JSON.parse(accrualFundHospReq.asJSONObject)

  const accrualFundHospFssReq = UB.DataStore('hr_accrualFund')
  accrualFundHospFssReq.runSQL(`SELECT f1.orgID as "orgID", f1.employeeNumberID as "employeeNumberID", d1.dictProgClassID as "dictProgClassID", d1.code as "code", sum(f1.paySum) as "paySum", f1.rate as "rate", e1.code as "taxECBCode"
  from hr_accrualFund f1
  inner join hr_payFund d1 on d1.ID = f1.payFundID
  inner join hr_dictTypeTaxECB e1 on e1.ID = d1.typeTaxECBID
  and e1.code in ('29', '36', '37', '39') 
  where f1.payFundID in (  
    select d2.ID 
    from hr_payFund d2
    inner join hr_payFundBase b1 on b1.payFundID = d2.ID 
      and b1.mi_deleteDate >= '9999-12-31'
    inner join hr_payEl l1 on l1.ID = b1.payElID
    inner join hr_method m1 on m1.ID = l1.methodID
    inner join hr_methodGroup g1 on g1.ID = m1.methodGroupID
    where g1.code = '5'
    and m1.code in ('18','19','20','38','40','51','52','53','135')
    group by d2.ID
    )
    and f1.periodCalcID in (${periodIDs})
    ${dictFundSourceIDs ? `and d1.dictFundSourceID in (${dictFundSourceIDs})` : ''}
    group by f1.orgID, f1.employeeNumberID, d1.dictProgClassID, d1.code, f1.rate, e1.code`, {
  })
  const accrualFundHospFss = JSON.parse(accrualFundHospFssReq.asJSONObject)

  const accrualBalance = UB.Repository('hr_accrualBalance')
    .attrs(['*', 'employeeNumberID.orgID', 'dictProgClassID.code'])
    .where('periodCalcID', 'in', periodIDs)
    .whereIf(dictFundSourceIDs, 'dictFundSourceID', 'in', dictFundSourceIDs)
    .selectAsObject({ 'employeeNumberID.orgID': 'orgID', 'dictProgClassID.code': 'dictProgClassCode' })

  const employeePositionReq = UB.Repository('hr_employeePosition')
    .attrs(['dictCategoryECBID.dictTypeTaxECBID.code', 'employeeNumberID', 'employeeID.pensionDate', 'workPlace', 'dictPositionID.dictStaffSubCatID'])
    .where('organizationID', 'in', orgID)
    .where('mi_deleteDate', '>=', '9999-12-31')
    .where('employeeNumberID', 'in', accrualFund.map(o => o.employeeNumberID))
    .where('dateFrom', '<=', dateService.shiftDate(params.dateReport))
    .where('dateTo', '>=', dateService.shiftDate(params.dateReport))
    .selectAsObject({ 'dictCategoryECBID.dictTypeTaxECBID.code': 'dictTypeTaxECBCode', 'employeeID.pensionDate': 'pensionDate', 'dictPositionID.dictStaffSubCatID': 'dictStaffSubCatID' })

  const groupIDParams = _.groupBy(idParams, 'code')
  const groupIDParamsKeys = [...Object.keys(groupIDParams), ...['salary9', 'salary10', 'salary11', 'salary12', 'salary13', 'salary14', 'salary15', 'salary16', 'salary17', 'salary18', 'otherPayment', 'otherOfftake']]

  const setRowReport = (i, array, sumBlock, objArr, fccArray, fundHospFss, fundHosp, debt) => {
    const result = {
      dictProgClassCode: objArr[0].dictProgClassCode ? objArr[0].dictProgClassCode : 'Без КПК',
      dictProgClassID: objArr[0].dictProgClassID ? objArr[0].dictProgClassID : null,
      orgCode: orgsCode.find(o => o.mi_data_id === objArr[0].orgID) ? orgsCode.find(o => o.mi_data_id === objArr[0].orgID).code : '',
      salary12: null,
      totalOfftake: null,
      totalPayment: null,
      total: null,
      otherPayment: [],
      renderSumBlock: false,
      renderResultData: true,
      orgDebt: null
    }
    groupIDParamsKeys.forEach((o, index, keys) => {
      setCellReport(i, array, index, keys, sumBlock, result, groupIDParams[o], o, objArr, fccArray, fundHospFss, fundHosp, debt)
    })
    resultData.push(result)
  }

  function setCellReport (i, arr, index, keys, sumBlock, result, array, key, accrArray, fccArray, fundHospFss, fundHosp, debt) {
    let accruals = []
    let accrualsSum = null

    if (array) {
      array.forEach(o => {
        const filterPayEl = accrArray.filter(p => p.payElID === o.payElID)
        if (filterPayEl.length) {
          accruals = [...accruals, ...filterPayEl]
        }
      })
      if (accruals.length) {
        accrualsSum = accruals.reduce((acc, o) => {
          return acc + _.round(o.paySum, 2)
        }, 0)
        result[key] = accrualsSum
        if (['salary19'].includes(key)) {
          result['salary6Block'] = result['salary6Block'] ? accrualsSum + result['salary6Block'] : accrualsSum
          sumBlock['salary6Sum'] = sumBlock['salary6Sum'] ? accrualsSum + sumBlock['salary6Sum'] : accrualsSum
        }
        if (['salary20'].includes(key)) {
          sumBlock['salary7Sum'] = sumBlock['salary7Sum'] ? accrualsSum + sumBlock['salary7Sum'] : accrualsSum
          result['salary7Block'] = result['salary7Block'] ? accrualsSum + result['salary7Block'] : accrualsSum
        } else if (!['salary19'].includes(key)) {
          result[`${key}Block`] = result[`${key}Block`] ? accrualsSum + result[`${key}Block`] : accrualsSum
          sumBlock[`${key}Sum`] = sumBlock[`${key}Sum`] ? accrualsSum + sumBlock[`${key}Sum`] : accrualsSum
        }
        result.totalPayment += accrualsSum
        sumBlock.totalPaymentSum += accrualsSum
      }
    } else {
      switch (key) {
        case 'otherPayment':

          const colMethodCode = ['3', '4', '5', '6', '7', '8', '9', '10', '11', '29', '137', '148', '154', '155']
          const filterAccr = accrArray.filter(o => colMethodCode.includes(o.methodCode))
          if (filterAccr.length) {
            const groupFilterAccr = _.groupBy(filterAccr, 'code')
            const keyFilterAccr = Object.keys(groupFilterAccr)
            let otherPaymentSumDictProgClass = 0
            keyFilterAccr.forEach((o, i) => {
              if (!i) {
                result.otherPaymentCode = o
                result.otherPaymentSum = groupFilterAccr[o].reduce((acc, o) => {
                  return acc + _.round(o.paySum, 2)
                }, 0)
                result.totalPayment += result.otherPaymentSum
                sumBlock.sumOtherPayment += result.otherPaymentSum
                sumBlock.totalPaymentSum += result.otherPaymentSum
                otherPaymentSumDictProgClass += result.otherPaymentSum
              } else if (i) {
                const otherPaymentRow = {
                  otherPaymentCode: o,
                  otherPaymentCodeSum: groupFilterAccr[o].reduce((acc, o) => {
                    return acc + _.round(o.paySum, 2)
                  }, 0)
                }
                result.totalPayment += otherPaymentRow.otherPaymentCodeSum
                sumBlock.sumOtherPayment += otherPaymentRow.otherPaymentCodeSum
                sumBlock.totalPaymentSum += otherPaymentRow.otherPaymentCodeSum
                result.otherPayment.push(otherPaymentRow)
                otherPaymentSumDictProgClass += otherPaymentRow.otherPaymentCodeSum
              }
            })
            result.otherPaymentSumDictProgClass = otherPaymentSumDictProgClass
          }
          break
        case 'otherOfftake':
          const excludeMethod = ['26', '27', '29', '32']
          const filterOfftare = accrArray.filter(o => o.payType === 'OFFTAKE')
          const filterExcludeMethod = filterOfftare.filter(o => !(excludeMethod.includes(o.methodCode)))
          if (filterExcludeMethod.length) {
            const groupFilterExcludeMethod = _.groupBy(filterExcludeMethod, 'code')
            const keyExcludeMethod = Object.keys(groupFilterExcludeMethod)
            let otherOfftakeSumDictProgClass = 0
            keyExcludeMethod.forEach((o, i, arr) => {
              if (!i) {
                result.otherOfftakeCode = o
                result.otherOfftakeSum = groupFilterExcludeMethod[o].reduce((acc, o) => {
                  return acc + _.round(o.paySum, 2)
                }, 0)
                result.otherOfftakeSum += result.otherOfftakeSum
                sumBlock.sumOtherOfftake += result.otherOfftakeSum
                sumBlock.sumTotalOfftake = sumBlock.sumTotalOfftake + result.otherOfftakeSum
                otherOfftakeSumDictProgClass += result.otherOfftakeSum
              } else if (!result.otherPayment.length) {
                const otherPaymentRow = {
                  otherOfftakeCode: o,
                  otherOfftakeSum: groupFilterExcludeMethod[o].reduce((acc, o) => {
                    return acc + _.round(o.paySum, 2)
                  }, 0)
                }
                result.totalOfftake += otherPaymentRow.otherOfftakeSum
                sumBlock.sumOtherOfftake += otherPaymentRow.otherOfftakeSum
                sumBlock.sumTotalOfftake = sumBlock.sumTotalOfftake ? sumBlock.sumTotalOfftake + otherPaymentRow.otherOfftakeSum : otherPaymentRow.otherOfftakeSum
                result.otherPayment.push(otherPaymentRow)
                otherOfftakeSumDictProgClass += otherPaymentRow.otherOfftakeSum
              } else {
                result.otherPayment.forEach(r => {
                  r.otherOfftakeCode = o
                  r.otherOfftakeSum = groupFilterExcludeMethod[o].reduce((acc, o) => {
                    return acc + _.round(o.paySum, 2)
                  }, 0)
                  result.totalOfftake += r.otherOfftakeSum
                  sumBlock.sumOtherOfftake += r.otherOfftakeSum
                  sumBlock.sumTotalOfftake = sumBlock.sumTotalOfftake ? sumBlock.sumTotalOfftake + r.otherOfftakeSum : r.otherOfftakeSum
                  otherOfftakeSumDictProgClass += r.otherOfftakeSum
                })
              }
            })
            result.otherOfftakeSumDictProgClass = otherOfftakeSumDictProgClass
          }
          break
        case 'salary9':
          if (accrArray.filter(o => o.methodCode === '29').length) {
            result.salary9 = accrArray.filter(o => o.methodCode === '29').reduce((acc, o) => {
              return acc + _.round(o.paySum, 2)
            }, 0)
            result.totalOfftake += result.salary9
            sumBlock.salary9Sum = sumBlock.salary9Sum ? sumBlock.salary9Sum + result.salary9 : result.salary9
            sumBlock.sumTotalOfftake = sumBlock.sumTotalOfftake ? sumBlock.sumTotalOfftake + result.salary9 : result.salary9
          }
          break
        case 'salary10':
          if (accrArray.filter(o => o.methodCode === '27').length) {
            result.salary10 = accrArray.filter(o => o.methodCode === '27').reduce((acc, o) => {
              return acc + _.round(o.paySum, 2)
            }, 0)
            result.totalOfftake += result.salary10
            sumBlock.salary10Sum = sumBlock.salary10Sum ? sumBlock.salary10Sum + result.salary10 : result.salary10
            sumBlock.sumTotalOfftake = sumBlock.sumTotalOfftake ? sumBlock.sumTotalOfftake + result.salary10 : result.salary10
          }
          break
        case 'salary11':
          if (accrArray.filter(o => o.methodCode === '26').length) {
            result.salary11 = accrArray.filter(o => o.methodCode === '26').reduce((acc, o) => {
              return acc + _.round(o.paySum, 2)
            }, 0)
            result.totalOfftake += result.salary11
            sumBlock.salary11Sum = sumBlock.salary11Sum ? sumBlock.salary11Sum + result.salary11 : result.salary11
            sumBlock.sumTotalOfftake = sumBlock.sumTotalOfftake ? sumBlock.sumTotalOfftake + result.salary11 : result.salary11
          }
          break
        case 'salary12':
          if (fccArray && fccArray.find(o => !([29, 36, 37, 39].includes(Number(o.taxECBCode))))) {
            result.salary12 = fccArray.filter(o => !([29, 36, 37, 39].includes(Number(o.taxECBCode)))).reduce((acc, o) => {
              return acc + _.round(o.paySum, 2)
            }, 0)
            sumBlock.salary12Sum = sumBlock.salary12Sum ? sumBlock.salary12Sum + result.salary12 : result.salary12
          }
          break
        case 'salary13':
          if (accrArray.filter(o => o.methodCode === '32').length) {
            result.salary13 = accrArray.filter(o => o.methodCode === '32').reduce((acc, o) => {
              return acc + _.round(o.paySum, 2)
            }, 0)
            result.totalOfftake += result.salary13
            sumBlock.salary13Sum = sumBlock.salary13Sum ? sumBlock.salary13Sum + result.salary13 : result.salary13
            sumBlock.sumTotalOfftake = sumBlock.sumTotalOfftake ? sumBlock.sumTotalOfftake + result.salary13 : result.salary13
          }
          break
        case 'salary14':
          if (fccArray && fccArray.find(o => [29, 36, 37, 39].includes(Number(o.taxECBCode)))) {
            result.salary14 = fccArray.filter(o => [29, 36, 37, 39].includes(Number(o.taxECBCode))).reduce((acc, o) => {
              return acc + _.round(o.paySum, 2)
            }, 0)
            sumBlock.salary14Sum = sumBlock.salary14Sum ? sumBlock.salary14Sum + result.salary14 : result.salary14
          }
          break
        case 'salary15':
          if (fccArray && fccArray.find(o => o.rate === 22)) {
            const salary15 = fccArray.filter(o => o.rate === 22)
            const salary15Sum = salary15.reduce((acc, o) => {
              return acc + _.round(o.paySum, 2)
            }, 0)
            result.salary15 = salary15Sum
          }
          break
        case 'salary16':
          if (fccArray && fccArray.find(o => (o.rate < 9) && (o.rate > 8))) {
            const salary16 = fccArray.filter(o => (o.rate < 9) && (o.rate > 8))
            const salary16Sum = salary16.reduce((acc, o) => {
              return acc + _.round(o.paySum, 2)
            }, 0)
            result.salary16 = salary16Sum
          }
          break
        case 'salary17':
          if (fundHospFss && fundHospFss.find(o => o.rate === 22)) {
            const salary17 = fundHospFss.filter(o => o.rate === 22)
            const salary17Sum = salary17.reduce((acc, o) => {
              return acc + _.round(o.paySum, 2)
            }, 0)
            if (result.otherPayment.length && salary17Sum) {
              result.otherPayment.forEach((o, i) => {
                o.salary17 = salary17Sum
              })
            } else if (!result.otherPayment.length && salary17Sum) {
              result.otherPayment.push({ salary17: salary17Sum })
            }
          } else if (fundHospFss && fundHospFss.find(o => (o.rate < 9) && (o.rate > 8))) {
            const salary17 = fundHospFss.filter(o => (o.rate < 9) && (o.rate > 8))
            const salary17Sum = salary17.reduce((acc, o) => {
              return acc + _.round(o.paySum, 2)
            }, 0)
            if (result.otherPayment.length && salary17Sum) {
              result.otherPayment.forEach((o, i) => {
                if (i) o.salary17 = salary17Sum
              })
            } else if (!result.otherPayment.length && salary17Sum) {
              result.otherPayment.push({ salary17: salary17Sum })
            }
          }
          break
        case 'salary18':
          if (fundHosp && fundHosp.find(o => o.rate === 22)) {
            const salary18 = fundHosp.filter(o => o.rate === 22)
            const salary18Sum = salary18.reduce((acc, o) => {
              return acc + _.round(o.paySum, 2)
            }, 0)
            if (result.otherPayment.length && salary18Sum) {
              result.otherPayment.forEach((o, i) => {
                o.salary18 = salary18Sum
              })
            } else if (!result.otherPayment.length && salary18Sum) {
              result.otherPayment.push({ salary18: salary18Sum })
            }
          } else if (fundHosp && fundHosp.find(o => (o.rate < 9) && (o.rate > 8))) {
            const salary18 = fundHosp.filter(o => (o.rate < 9) && (o.rate > 8))
            const salary18Sum = salary18.reduce((acc, o) => {
              return acc + _.round(o.paySum, 2)
            }, 0)
            if (result.otherPayment.length && salary18Sum) {
              result.otherPayment.forEach((o, i) => {
                if (i) o.salary17 = salary18Sum
              })
            } else if (!result.otherPayment.length && salary18Sum) {
              result.otherPayment.push({ })
              result.otherPayment.push({ salary18: salary18Sum })
            }
          }
          break
      }
    }
    return result
  }

  function addDictProgClassID (arr) {
    const accrualFundDictProgClass = UB.Repository('hr_accrual')
      .attrs(['dictProgClassID', 'employeeNumberID'])
      .where('periodCalcID', 'in', periodIDs)
      .where('dictProgClassID', '!==', null)
      .where('employeeNumberID', 'in', arr.map(o => o.employeeNumberID))
      .groupBy(['dictProgClassID', 'employeeNumberID'])
      .selectAsObject()
    arr.forEach(acc => {
      if (!acc.dictProgClassID && accrualFundDictProgClass.find(a => a.employeeNumberID === acc.employeeNumberID)) acc.dictProgClassID = accrualFundDictProgClass.find(a => a.employeeNumberID === acc.employeeNumberID).dictProgClassID
    })
    return arr
  }
  function addPartTime (employeeArr, accrualBalanceArr) {
    const employeeArrFilter = employeeArr.filter(o => ['2', '3'].includes(o.workPlace))
    const salaryCount = employeeArrFilter.length
    const result = {
      partTimeSum: 0,
      salaryCount: 0
    }
    if (salaryCount) {
      const uniqEmployeeArr = _.uniqBy(employeeArrFilter, 'employeeNumberID')
      result.salaryCount = salaryCount
      result.partTimeSum = accrualBalanceArr.reduce((acc, o) => {
        if (uniqEmployeeArr.find(e => e.employeeNumberID === o.employeeNumberID)) {
          return acc + _.round((o.sumFrom + o.sumPlus - o.sumMinus), 2)
        } else {
          return acc
        }
      }, 0)
    }
    return result
  }
  function addPension (employeeArr, accrualBalanceArr) {
    const employeeArrFilter = employeeArr.filter(o => o.pensionDate && (dateService.shiftDate(o.pensionDate) <= dateService.shiftDate(params.dateReport)))
    const salaryCount = employeeArrFilter.length
    const result = {
      pensionSum: null,
      salaryCount: 0
    }
    if (salaryCount) {
      const uniqEmployeeArr = _.uniqBy(employeeArrFilter, 'employeeNumberID')
      result.salaryCount = salaryCount
      result.pensionSum = accrualBalanceArr.reduce((acc, o) => {
        if (uniqEmployeeArr.find(e => e.employeeNumberID === o.employeeNumberID)) {
          return acc + _.round((o.sumFrom + o.sumPlus - o.sumMinus), 2)
        } else {
          return acc
        }
      }, 0)
    }
    return result
  }
  function addInvalidSalary (employeeArr, accrualBalanceArr) {
    const employeeArrFilter = employeeArr.filter(o => o.dictTypeTaxECBCode === '2')
    const salaryCount = employeeArrFilter.length
    const result = {
      invalidSalarySum: null,
      salaryCount: 0
    }
    if (salaryCount) {
      const uniqEmployeeArr = _.uniqBy(employeeArrFilter, 'employeeNumberID')
      result.salaryCount = salaryCount
      result.invalidSalarySum = accrualBalanceArr.reduce((acc, o) => {
        if (uniqEmployeeArr.find(e => e.employeeNumberID === o.employeeNumberID)) {
          return acc + _.round((o.sumPlus - o.sumMinus), 2)
        } else {
          return acc
        }
      }, 0)
    }
    return result
  }
  function addExpertSalary (employeeArr, accrualBalanceArr) {
    const employeeArrFilter = employeeArr.filter(o => (!params.dictStaffSubCatID || (o.dictStaffSubCatID === params.dictStaffSubCatID)) && (o.dictTypeTaxECBCode !== '2'))
    const salaryCount = employeeArrFilter.length
    const result = {
      expertSalarySum: null,
      salaryCount: 0
    }
    if (salaryCount) {
      const uniqEmployeeArr = _.uniqBy(employeeArrFilter, 'employeeNumberID')
      result.salaryCount = uniqEmployeeArr.length
      result.expertSalarySum = accrualBalanceArr.reduce((acc, o) => {
        if (uniqEmployeeArr.find(e => e.employeeNumberID === o.employeeNumberID)) {
          return acc + _.round((o.sumPlus - o.sumMinus), 2)
        } else {
          return acc
        }
      }, 0)
    }
    return result
  }
  function addExpertSalaryInvalid (employeeArr, accrualBalanceArr) {
    const employeeArrFilter = employeeArr.filter(o => (!params.dictStaffSubCatID || (o.dictStaffSubCatID === params.dictStaffSubCatID)) && (o.dictTypeTaxECBCode === '2'))
    const salaryCount = employeeArrFilter.length
    const result = {
      expertSalarySum: null,
      salaryCount: 0
    }
    if (salaryCount) {
      const uniqEmployeeArr = _.uniqBy(employeeArrFilter, 'employeeNumberID')
      result.salaryCount = salaryCount
      result.expertSalarySum = accrualBalanceArr.reduce((acc, o) => {
        if (uniqEmployeeArr.find(e => e.employeeNumberID === o.employeeNumberID)) {
          return acc + _.round((o.sumPlus - o.sumMinus), 2)
        } else {
          return acc
        }
      }, 0)
    }
    return result
  }
  function addOrgDebt (dictProgClassID, groupProgClassAccrualBalance, result, sumBlock) {
    if (result.find(o => o.dictProgClassID === dictProgClassID)) {
      result.forEach(o => {
        if (o.dictProgClassID === dictProgClassID) {
          const sum = groupProgClassAccrualBalance.reduce((acc, o) => {
            return acc + _.round((o.sumFrom + o.sumPlus) - (o.sumMinus + o.sumPay), 2)
          }, 0)
          o.orgDebt += sum
          sumBlock.orgDebtSum = sumBlock.orgDebtSum ? sumBlock.orgDebtSum + sum : sum
        }
      })
    } else {
      const sum = groupProgClassAccrualBalance.reduce((acc, o) => {
        return acc + _.round((o.sumFrom + o.sumPlus) - (o.sumMinus + o.sumPay), 2)
      }, 0)
      if (result.find(o => !o.dictProgClassID === !dictProgClassID)) {
        const debt = result.find(o => !o.dictProgClassID === !dictProgClassID)
        debt.orgDebt += sum
        sumBlock.orgDebtSum = sumBlock.orgDebtSum ? sumBlock.orgDebtSum + sum : sum
      } else {
        const obj = {
          dictProgClassCode: 'Без КПК',
          dictProgClassID: groupProgClassAccrualBalance[0].dictProgClassID,
          orgCode: orgsCode.find(o => o.mi_data_id === groupProgClassAccrualBalance[0].orgID) ? orgsCode.find(o => o.mi_data_id === groupProgClassAccrualBalance[0].orgID).code : '',
          renderSumBlock: false,
          orgDebt: sum,
          renderResultData: true
        }
        sumBlock.orgDebtSum = sumBlock.orgDebtSum ? sumBlock.orgDebtSum + sum : sum
        resultData.push(obj)
      }
    }
  }
  const resultData = []
  const hrOrgGroup = _.groupBy(baseRequest, 'orgID')
  const hrOrgGroupFcc = _.groupBy(addDictProgClassID(accrualFund), 'orgID')
  const groupOrgAccrualFundHospFss = _.groupBy(addDictProgClassID(accrualFundHospFss), 'orgID')
  const groupOrgAccrualFundHosp = _.groupBy(addDictProgClassID(accrualFundHosp), 'orgID')
  const groupAccrualBalance = _.groupBy(addDictProgClassID(accrualBalance), 'orgID')
  const hrOrgKeys = Object.keys(hrOrgGroup)

  const bottomBlock = {
    classLeadCode: null,
    hospitalSum: null,
    classLeadSum: null,
    hospitalSumECB: null,
    hospitalSumOrg: null
  }
  const sumBlock = {
    renderSumBlock: false,
    totalPaymentSum: null,
    total: null,
    sumOtherPayment: null,
    sumOtherOfftake: null,
    orgDebtSum: null
  }
  hrOrgKeys.forEach((o, i, hrOrgKeysArr) => {
    const groupDictProgClassID = _.groupBy(hrOrgGroup[o], 'dictProgClassID')
    const groupDictProgClassIDFcc = _.groupBy(hrOrgGroupFcc[o], 'dictProgClassID')
    const progClassAccrualFundHospFss = _.groupBy(groupOrgAccrualFundHospFss[o], 'dictProgClassID')
    const progClassAccrualFundHosp = _.groupBy(groupOrgAccrualFundHosp[o], 'dictProgClassID')
    const groupProgClassAccrualBalance = _.groupBy(groupAccrualBalance[o], 'dictProgClassID')
    const dictProgClassIDKeys = Object.keys(groupDictProgClassID)
    const dictProgClassIDFccKeys = Object.keys(groupDictProgClassIDFcc)
    const groupAccrualBalanceKeys = Object.keys(groupProgClassAccrualBalance)

    dictProgClassIDFccKeys.forEach(b => {
      if (!dictProgClassIDKeys.includes(b)) dictProgClassIDKeys.push(b)
    })

    dictProgClassIDKeys.forEach((d, i, array) => {
      let objArr = groupDictProgClassID[d]
      if (!objArr) {
        objArr = [{
          dictProgClassID: null,
          orgID: groupDictProgClassIDFcc[d].orgID
        }]
      }
      setRowReport(i, array, sumBlock, objArr, groupDictProgClassIDFcc[d], progClassAccrualFundHospFss[d], progClassAccrualFundHosp[d])
    })
    groupAccrualBalanceKeys.forEach(a => {
      addOrgDebt(Number(a), groupProgClassAccrualBalance[a], resultData, sumBlock)
    })

    bottomBlock.hospitalSum = baseRequest.filter(o => o.methodCode === '20').reduce((acc, o) => {
      return acc + o.paySum
    }, 0)
    bottomBlock.hospitalSumECB = accrualFund.filter(o => o.methodCode === '20').reduce((acc, o) => {
      return acc + o.paySum
    }, 0)
    resultData.forEach((o, i) => {
      o.totalSum = o.totalPayment - o.totalOfftake
      if (o.renderResultData) {
        sumBlock.total = sumBlock.total ? sumBlock.total + o.totalSum : o.totalSum
      }
    })
    if (i === hrOrgKeysArr.length - 1) {
      sumBlock.renderSumBlock = true
      sumBlock.renderResultData = false
      sumBlock.codeSort = hrOrgKeysArr.length + 1
      resultData.push(sumBlock)
    }
  })
  const accountCode = Object.keys(_.groupBy(baseRequest.filter(o => o.accountDtCode), 'accountDtCode')).join(', ')
  const dictProgClassCode = []
  baseRequest.forEach(o => {
    if (o.dictProgClassID && !dictProgClassCode.find(d => d === o.dictProgClassCode)) {
      dictProgClassCode.push(o.dictProgClassCode)
    }
  })
  bottomBlock.hospitalSumOrg = baseRequest.filter(o => o.methodCode === '17').reduce((acc, o) => {
    return acc + _.round(o.paySum, 2)
  }, 0)
  bottomBlock.otherHospitalSum = baseRequest.filter(o => o.methodCode === '18').reduce((acc, o) => {
    return acc + _.round(o.paySum, 2)
  }, 0)
  bottomBlock.partTime = addPartTime(employeePositionReq, accrualBalance)
  bottomBlock.pensionRow = addPension(employeePositionReq, accrualBalance)
  bottomBlock.invalidSalary = addInvalidSalary(employeePositionReq, accrualBalance)
  bottomBlock.expertSalary = addExpertSalary(employeePositionReq, accrualBalance)
  bottomBlock.expertSalaryInvalid = addExpertSalaryInvalid(employeePositionReq, accrualBalance)
  baseRequest.filter(h => h.methodCode === '154').forEach(h => {
    bottomBlock.classLeadCode = h.code
    bottomBlock.classLeadSum += _.round(h.paySum, 2)
  })
  const report = {
    period: params.periodName,
    dictStaffSubCatName: params.dictStaffSubCatName ? params.dictStaffSubCatName.toLowerCase() : '',
    accountCode,
    dictProgClassCodes: dictProgClassCode.join(', '),
    resultData,
    bottomBlock,
    fullFIO: params.shortFIO,
    dictPosition: params.dictPosition,
    titleFundsourse: dictFundSourceName.length ? `(${dictFundSourceName && dictProgClassCode ? `ДФ ${dictFundSourceName}, КПК ${dictProgClassCode.join(', ')}` : `${dictFundSourceName}`})` : dictProgClassCode.length ? `(${dictProgClassCode.join(', ')})` : ''
  }
  ctx.mParams.resultData = JSON.stringify({
    report
  })
}

me.getMemOrder5Data = function (ctx) {
  const mParams = ctx.mParams
  const sqlDialect = entityBaseService.getSQLDialect()
  const store = UB.DataStore(__entityName)

  let dictFundSourceSQL
  const isIncludeEmptyFundSource = mParams.includeEmptyFoundSource

  if (mParams.dictFundSourceID.length && !isIncludeEmptyFundSource) {
    dictFundSourceSQL = ` and pd.dictFundSourceID in (${mParams.dictFundSourceID.join(',')}) `
  } else if (mParams.dictFundSourceID.length === 0 && isIncludeEmptyFundSource) {
    dictFundSourceSQL = ` and pd.dictFundSourceID is null `
  } else if (mParams.dictFundSourceID.length && isIncludeEmptyFundSource) {
    dictFundSourceSQL = ` and ((pd.dictFundSourceID in (${mParams.dictFundSourceID.join(',')})) or (pd.dictFundSourceID is null)) `
  }

  let dictProgClassSQL
  const includeEmptyProgClass = mParams.includeEmptyProgClass

  if (mParams.dictProgClassID.length && !includeEmptyProgClass) {
    dictProgClassSQL = ` and pd.dictProgClassID in (${mParams.dictProgClassID.join(',')}) `
  } else if (mParams.dictProgClassID.length === 0 && includeEmptyProgClass) {
    dictProgClassSQL = ` and pd.dictProgClassID is null `
  } else if (mParams.dictProgClassID.length && includeEmptyProgClass) {
    dictProgClassSQL = ` and ((pd.dictProgClassID in (${mParams.dictProgClassID.join(',')})) or (pd.dictProgClassID is null)) `
  }

  const orgIDs = mParams.joinReport ? mParams.orgSubListID.concat(mParams.orgID) : [mParams.orgID]

  const period = periodService.getPeriod(mParams.periodID)

  const periodIDs = UB.Repository('hr_dictPeriod')
    .attrs(['ID', 'orgID'])
    .where('orgID', 'in', orgIDs)
    .where('dateFrom', '<=', period.dateFrom)
    .where('dateTo', '>=', period.dateFrom)
    .selectAsObject().map(o => o.ID)

  store.runSQL(`
    SELECT 
        (select ${sqlDialect.top} enop.name from hr_entryOperation enop where po.entryOperationID = enop.ID and enop.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit}) "entryOperationName",
        (select ${sqlDialect.top} enop.code from hr_entryOperation enop where po.entryOperationID = enop.ID and enop.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit}) "entryOperationCode",
        (select ${sqlDialect.top} glacc.code from gl_account glacc where pd.accountDtID = glacc.ID and glacc.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit}) "accountDtCode",
        (select ${sqlDialect.top} glacc.code from gl_account glacc where pd.accountKtID = glacc.ID and glacc.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit}) "accountKtCode",
        pd.dictFundSourceID,
        pd.dictProgClassID,
        sum(pd.sumOperation) sum
    FROM hr_payAccOperation po
        JOIN hr_payAccOperationDt pd on po.ID = pd.payAccOperationID
    WHERE po.orgID${entityBaseService.getInExpression('orgIDs')}
        AND po.periodSalaryID${entityBaseService.getInExpression('periodIDs')} 
        ${dictFundSourceSQL || ''} 
        ${dictProgClassSQL || ''}                 
    GROUP BY po.entryOperationID, pd.accountDtID, pd.accountKtID, pd.dictFundSourceID, pd.dictProgClassID
  `, {
    orgIDs,
    periodIDs
  })
  const rawReportData = store.getAsJsObject()
  const reportData = []
  const usedFundSource = []
  const usedProgClass = []

  rawReportData.forEach(row => {
    const item = reportData.find(o => o.entryOperationName === row.entryOperationName && o.entryOperationCode === row.entryOperationCode && o.accountDtCode === row.accountDtCode && o.accountKtCode === row.accountKtCode)
    if (item) {
      item.sum += row.sum || 0
    } else {
      reportData.push({
        entryOperationName: row.entryOperationName,
        entryOperationCode: row.entryOperationCode,
        accountDtCode: row.accountDtCode,
        accountKtCode: row.accountKtCode,
        sum: row.sum || 0
      })
    }
    if (!usedFundSource.includes(row.dictFundSourceID)) {
      usedFundSource.push(row.dictFundSourceID)
    }
    if (!usedProgClass.includes(row.dictProgClassID)) {
      usedProgClass.push(row.dictProgClassID)
    }
  })

  const fundSourceList = []

  const fundSource = UB.Repository('ac_fundSource')
    .attrs('ID', 'name')
    .where('ID', 'in', mParams.dictFundSourceID)
    .orderBy('name')
    .selectAsObject()

  usedFundSource.filter(Boolean).forEach(ID => {
    const fs = ID && fundSource.find(o => o.ID === ID)
    if (fs) {
      fundSourceList.push(fs.name)
    }
  })
  fundSourceList.sort()

  if (isIncludeEmptyFundSource && usedFundSource.includes(null)) {
    fundSourceList.push(UB.i18n('Без джерела фінансування'))
  }

  const progClassList = []

  const progClass = UB.Repository('ac_dictProgClass')
    .attrs('ID', 'code')
    .where('ID', 'in', mParams.dictProgClassID)
    .orderBy('code')
    .selectAsObject()

  usedProgClass.filter(Boolean).forEach(ID => {
    const pg = ID && progClass.find(o => o.ID === ID)
    if (pg) {
      progClassList.push(pg.code)
    }
  })
  progClassList.sort()

  if (includeEmptyProgClass && usedProgClass.includes(null)) {
    progClassList.push(UB.i18n('Без КПК'))
  }

  const dateReport = dateService.shiftDate(mParams.dateReport)

  const orgName = UB.Repository('hr_organization')
    .attrs(['fullName', 'EDRPOUCode'])
    .where('mi_data_id', '=', mParams.orgID)
    .where('state', '=', 'ACTIVE')
    .misc({ __mip_ondate: dateReport })
    .selectSingle()

  const params = {
    personTable: [],
    onDate: '',
    dateFrom: '',
    dateTo: '',
    org: orgName['fullName'],
    departmentName: '',
    EDRPOUCode: orgName['EDRPOUCode'],
    period: period.name,
    dateReport: dateService.getStringFormatDate(dateReport, '', ''),
    perfomerIDPosition: '',
    perfomerIDFIO: '',
    checkingIDPosition: '',
    checkingIDFIO: '',
    accountantIDFIO: ''
  }

  let respEmps = [ mParams.perfomerID, mParams.checkingID, mParams.accountantID ].filter(Boolean).filter((el, index, arr) => arr.indexOf(el) === index)
  const useActualPositionName = settingsService.get('hrOrderActualPositionName', mParams.orgID)

  if (respEmps.length > 0) {
    let onDate = dateService.shiftDate(mParams.onDate)

    const fieldPos = useActualPositionName
      ? 'ep.factPosition as "posName"'
      : `${staffService.getPosFldOnDateSql(':onDate:', 'ep.positionID', 'name', 'ep.dictPositionID')} as "posName"`
    const employeePositionDS = UB.DataStore('hr_employeePositionS')
    employeePositionDS.runSQL(`  SELECT ep.ID as "epID", emp.shortFIO as "shortFIO", 
     ${fieldPos}    
      FROM hr_employeePosition ep 
      INNER JOIN hr_employee emp ON emp.ID = ep.employeeID and emp.mi_deleteDate >= '9999-12-31'      
      WHERE
        ep.ID in (${respEmps.join(',')})
        and ep.isActive = 1
        and ep.mi_deleteDate >= '9999-12-31'      
    `, {
      onDate
    })
    const signersData = employeePositionDS.getAsJsObject()

    signersData.forEach(item => {
      if (item.epID === mParams.perfomerID) {
        params[`perfomerIDPosition`] = item['posName'] ? item['posName'] : ''
        params[`perfomerIDFIO`] = item['shortFIO'] ? item['shortFIO'] : ''
      }
      if (item.epID === mParams.checkingID) {
        params[`checkingIDPosition`] = item['posName'] ? item['posName'] : ''
        params[`checkingIDFIO`] = item['shortFIO'] ? item['shortFIO'] : ''
      }
      if (item.epID === mParams.accountantID) {
        params[`accountantIDFIO`] = item['shortFIO'] ? item['shortFIO'] : ''
      }
    })
  }

  const tableFields = ['entryOperationName', 'entryOperationCode', 'accountDtCode', 'accountKtCode', 'sum']

  // set data for personTable
  let totalSum = 0
  if (reportData.length === 0) {
    for (let i = 1; i < 6; i++) {
      let obj = {}
      obj['pn'] = i
      tableFields.forEach(item => {
        obj[item] = ' '
      })
      params.personTable.push(obj)
    }
  } else {
    reportData.forEach((item, idx) => {
      item['pn'] = idx + 1
      totalSum += item['sum']
      params.personTable.push(item)
    })
  }
  params.totalSum = totalSum
  params.totalSumText = ''

  params.reportComment = mParams.comment || ''
  params.fundSource = fundSourceList.length ? fundSourceList.join(', ') : null
  params.progClass = progClassList.length ? progClassList.join(', ') : null

  params.personTable = params.personTable.sort((rFirstItem, rSecondItem) => {
    let result
    if (Number(String(rFirstItem.entryOperationCode || '0').replace(/,/g, '.').replace(/[^\d-.]/g, '') || 0) < Number(String(rSecondItem.entryOperationCode || '0').replace(/,/g, '.').replace(/[^\d-.]/g, '') || 0)) {
      result = -1
    } else if (Number(String(rFirstItem.entryOperationCode || '0').replace(/,/g, '.').replace(/[^\d-.]/g, '') || 0) > Number(String(rSecondItem.entryOperationCode || '0').replace(/,/g, '.').replace(/[^\d-.]/g, '') || 0)) {
      result = 1
    }
    return result
  })
  params.personTable.forEach((row, idx) => {
    row['pn'] = idx + 1
  })
  ctx.mParams.resultData = JSON.stringify(params)
}
