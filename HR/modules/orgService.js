const UB = require('@unitybase/ub')
const dateService = require('../../AC/modules/dataServices/dateService')

module.exports = {
  getOrgData,
  getOrgAccrual,
  getOrgFund,
  getOrgAccrualSqlFilter,
  getOrgObligatory,
  getOrgPeriod,
  getOrgConstant
}

function getOrgAccrual (orgID, payElID, dateFrom, dateTo, payType) {
  let accrualBuilder = UB.Repository('hr_payPerm')
    .attrs(['ID', 'payElID', 'dateFrom', 'dateTo', 'paySum', 'rate', 'limitSum', 'dictFundSourceID', 'accountID', 'payType',
      'd0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9',
      'd0Value', 'd1Value', 'd2Value', 'd3Value', 'd4Value', 'd5Value', 'd6Value', 'd7Value', 'd8Value', 'd9Value',
      'excludeOrg', 'excludeStaff', 'excludePosition', 'excludeDepartment', 'excludeWorkPlace', 'excludeWorkerType', 'excludeEmpCategory'])
    .where('excludeOrg', '=', 0, 'excOrg')
    .where('excludeOrg', '=', 1, 'inexcOrg')
    .exists(UB.Repository('hr_payPermDt')
      .correlation('payPermID', 'ID')
      .where('orgID', '=', orgID)
      .where('permType', '=', '1')
      .where('mi_deleteDate', '>=', '#maxdate'),
    'org'
    ).notExists(UB.Repository('hr_payPermDt')
      .correlation('payPermID', 'ID')
      .where('permType', '=', '1')
      .where('mi_deleteDate', '>=', '#maxdate'),
    'notOrg')
    .notExists(UB.Repository('hr_payPermDt')
      .correlation('payPermID', 'ID')
      .where('orgID', '=', orgID)
      .where('permType', '=', '1')
      .where('mi_deleteDate', '>=', '#maxdate'),
    'inorg'
    )
    .logic('(([org] AND [excOrg]) OR ([notOrg]) OR ([inorg] AND [inexcOrg]))')

  if (payElID) {
    if (Array.isArray(payElID)) {
      accrualBuilder.where('payElID', 'in', payElID.length ? payElID : [0])
    } else {
      accrualBuilder.where('payElID', '=', payElID)
    }
  }
  if (dateFrom) {
    accrualBuilder.where('dateTo', '>=', dateFrom)
  }
  if (dateTo) {
    accrualBuilder.where('dateFrom', '<=', dateTo)
  }
  if (payType) {
    accrualBuilder.where('payType', '=', payType)
  }

  let orgAccrual = accrualBuilder.selectAsObject()

  const payPermDt = UB.Repository('hr_payPermDt')
    .attrs(['ID', 'payPermID', 'orgID', 'dictStaffCatID', 'dictPositionID', 'permType', 'departmentID', 'workPlace', 'workerType', 'dictEmpCategoryID'])
    .where('permType', '!=', '1')
    //add pdv 29.07.24 - удаленные исключаем
    .where('mi_deleteDate', '>=', '#maxdate')
    // ---
    .where('payPermID', 'in', orgAccrual.length ? orgAccrual.map(o => o.ID) : [0])
    .selectAsObject()

  orgAccrual.forEach(orgAccr => {
    orgAccr.dateFrom = dateService.shiftDate(orgAccr.dateFrom)
    orgAccr.dateTo = dateService.shiftDate(orgAccr.dateTo)
    orgAccr.department = payPermDt.filter(o => o.permType === '4' && o.payPermID === orgAccr.ID).map(o => o.departmentID)
    orgAccr.position = payPermDt.filter(o => o.permType === '3' && o.payPermID === orgAccr.ID).map(o => o.dictPositionID)
    orgAccr.category = payPermDt.filter(o => o.permType === '2' && o.payPermID === orgAccr.ID).map(o => o.dictStaffCatID)
    orgAccr.workPlace = payPermDt.filter(o => o.permType === '5' && o.payPermID === orgAccr.ID).map(o => String(o.workPlace))
    orgAccr.workerType = payPermDt.filter(o => o.permType === '6' && o.payPermID === orgAccr.ID).map(o => String(o.workerType))
    orgAccr.empCategory = payPermDt.filter(o => o.permType === '11' && o.payPermID === orgAccr.ID).map(o => o.dictEmpCategoryID)
  })
  return orgAccrual
}
function getOrgFund (orgID, payElID, dateFrom, dateTo, payType) {
  //Change pdv 27/07/24
  let accrualBuilder = UB.Repository('hr_fundPerm')
    .attrs(['ID', 'payFundID', 'dateFrom', 'dateTo', 'dictFundSourceID', 'accountID',
      'd0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9',
      'd0Value', 'd1Value', 'd2Value', 'd3Value', 'd4Value', 'd5Value', 'd6Value', 'd7Value', 'd8Value', 'd9Value',
      'excludeOrg', 'excludeStaff', 'excludePosition', 'excludeDepartment', 'excludeWorkPlace', 'excludeWorkerType', 'excludeEmpCategory','excludeTabNum'])
    .where('excludeOrg', '=', 0, 'excOrg')
    .where('excludeOrg', '=', 1, 'inexcOrg')
    .where('mi_deleteDate', '>=', '#maxdate')
    .exists(UB.Repository('hr_fundPermDt')
      .correlation('fundPermID', 'ID')
      .where('orgID', '=', orgID)
      .where('permType', '=', '1')
      .where('mi_deleteDate', '>=', '#maxdate'),
    'org'
    ).notExists(UB.Repository('hr_fundPermDt')
      .correlation('fundPermID', 'ID')
      .where('permType', '=', '1')
      .where('mi_deleteDate', '>=', '#maxdate'),
    'notOrg')
    .notExists(UB.Repository('hr_fundPermDt')
      .correlation('fundPermID', 'ID')
      .where('orgID', '=', orgID)
      .where('permType', '=', '1')
      .where('mi_deleteDate', '>=', '#maxdate'),
    'inorg'
    )
    .logic('(([org] AND [excOrg]) OR ([notOrg]) OR ([inorg] AND [inexcOrg]))')

  if (payElID) {
    if (Array.isArray(payElID)) {
      accrualBuilder.where('payElID', 'in', payElID.length ? payElID : [0])
    } else {
      accrualBuilder.where('payElID', '=', payElID)
    }
  }
  if (dateFrom) {
    accrualBuilder.where('dateTo', '>=', dateFrom)
  }
  if (dateTo) {
    accrualBuilder.where('dateFrom', '<=', dateTo)
  }
  if (payType) {
    accrualBuilder.where('payType', '=', payType)
  }

  let orgFund = accrualBuilder.selectAsObject()

  

  //Change pdv 27/07/24
  const fundPermDt = UB.Repository('hr_fundPermDt')
    .attrs(['ID', 'fundPermID', 'orgID', 'dictStaffCatID', 'dictPositionID', 'permType', 'departmentID', 'workPlace', 'workerType', 'dictEmpCategoryID','tabNumID'])
    .where('permType', '!=', '1')
    //add pdv 29.07.24 - удаленные исключаем
    .where('mi_deleteDate', '>=', '#maxdate')
    // ---
    .where('fundPermID', 'in', orgFund.length ? orgFund.map(o => o.ID) : [0])
    .selectAsObject()

  orgFund.forEach(orgF => {
    orgF.dateFrom = dateService.shiftDate(orgF.dateFrom)
    orgF.dateTo = dateService.shiftDate(orgF.dateTo)
    orgF.department = fundPermDt.filter(o => o.permType === '4' && o.fundPermID === orgF.ID).map(o => o.departmentID)
    orgF.position = fundPermDt.filter(o => o.permType === '3' && o.fundPermID === orgF.ID).map(o => o.dictPositionID)
    orgF.category = fundPermDt.filter(o => o.permType === '2' && o.fundPermID === orgF.ID).map(o => o.dictStaffCatID)
    orgF.workPlace = fundPermDt.filter(o => o.permType === '5' && o.fundPermID === orgF.ID).map(o => String(o.workPlace))
    orgF.workerType = fundPermDt.filter(o => o.permType === '6' && o.fundPermID === orgF.ID).map(o => String(o.workerType))
    orgF.empCategory = fundPermDt.filter(o => o.permType === '11' && o.fundPermID === orgF.ID).map(o => o.dictEmpCategoryID)
    //Add pdv 27/07/24
    orgF.tabNums = fundPermDt.filter(o => o.permType === '7' && o.fundPermID === orgF.ID).map(o => o.tabNumID)
  })
  return orgFund
}

function getOrgAccrualSqlFilter (orgID, payElID, dateFrom, dateTo, payType, payPermAlias, empPosAlias) {
  let res = ''
  const orgAccrual = getOrgAccrual(orgID, payElID, dateFrom, dateTo, payType)
  if (orgAccrual.length > 0) {
    const fBuilder = []
    orgAccrual.forEach(acc => {
      let depClause
      if (acc.department.length) {
        let depIDs = acc.department.join(',')
        depClause = `${empPosAlias}.departmentID ${acc.excludeDepartment ? 'not ' : ''}in (${depIDs})`
      }
      let posClause
      if (acc.position.length) {
        let posIDs = acc.position.join(',')
        posClause = `${empPosAlias}.dictPositionID ${acc.excludePosition ? 'not ' : ''}in (${posIDs})`
      }
      let catClause
      if (acc.category.length) {
        let catIDs = acc.category.join(',')
        catClause = `${empPosAlias}.dictStaffCatID ${acc.excludeStaff ? 'not ' : ''}in (${catIDs})`
      }
      let workPlaceClause
      if (acc.workPlace.length) {
        let workPlaceIDs = acc.workPlace.join(`','`)
        workPlaceClause = `${empPosAlias}.workPlace ${acc.excludeWorkPlace ? 'not ' : ''}in ('${workPlaceIDs}')`
      }
      let workerTypeClause
      if (acc.workerType.length) {
        let workerTypeIDs = acc.workerType.join(`','`)
        workerTypeClause = `${empPosAlias}.workerType ${acc.excludeWorkerType ? 'not ' : ''}in ('${workerTypeIDs}')`
      }
      let empCatClause
      if (acc.empCategory.length) {
        let empCatIDs = acc.empCategory.join(',')
        empCatClause = `${empPosAlias}.dictEmpCategoryID ${acc.excludeEmpCategory ? 'not ' : ''}in (${empCatIDs})`
      }
      let excludeFilter = ''
      if (depClause || posClause || catClause || workPlaceClause || workerTypeClause) {
        let accFilter = []
        depClause && accFilter.push(depClause)
        posClause && accFilter.push(posClause)
        catClause && accFilter.push(catClause)
        workPlaceClause && accFilter.push(workPlaceClause)
        workerTypeClause && accFilter.push(workerTypeClause)
        empCatClause && accFilter.push(empCatClause)
        excludeFilter = `and ${accFilter.join(' and ')}`
      }
      fBuilder.push(`(${payPermAlias}.ID = ${acc.ID} ${excludeFilter})`)
    })
    if (fBuilder.length) {
      res = `and (${fBuilder.join('\r\n\t\tOR ')})`
    }
  }
  return res
}

function getOrgObligatory (orgID) {
  const payObligatoryByParentOrg = UB.Repository('hr_payObligatoryOrg')
    .attrs(['payObligatoryID'])
    .where('orgID', 'equal', orgID)
    .selectAsObject()
    .map(o => o.payObligatoryID)
  const payObligatory = UB.Repository('hr_payObligatory')
    .attrs(['ID', 'name', 'orgAccountID', 'contractorID', 'contractorID.name', 'contrAccountID', 'organizationID.name', 'contrAccountID.description'])
    .where('organizationID', '=', orgID, 'byOrgID')
    .where('ID', 'in', payObligatoryByParentOrg, 'byParentOrg')
    .logic('([byOrgID] or [byParentOrg])')
    .selectAsObject({ 'contractorID.name': 'contractor', 'organizationID.name': 'payer', 'contrAccountID.description': 'contrAccount' })

  const payObligatoryDep = payObligatory.length
    ? UB.Repository('hr_payObligatoryDep')
      .attrs(['ID', 'payObligatoryID', 'departmentID', 'positionID', 'dictPositionID', 'employeeNumberID', 'contractorID', 'contrAccountID', 'contractorID.name', 'contrAccountID.description'])
      .where('payObligatoryID', 'in', payObligatory.map(o => o.ID))
      .orderBy('payObligatoryID')
      .orderByDesc('employeeNumberID')
      .orderByDesc('dictPositionID')
      .orderByDesc('positionID')
      .orderByDesc('departmentID')
      .selectAsObject({ 'contractorID.name': 'contractor', 'contrAccountID.description': 'contrAccount' })
    : []
  payObligatory.forEach(row => {
    row.payObligatoryDep = payObligatoryDep.filter(o => o.payObligatoryID === row.ID)
  })
  return payObligatory
}

function getOrgPeriod (orgID) {
  const period = UB.Repository('hr_dictPeriod')
    .attrs(['ID', 'orgID', 'dateFrom', 'dateTo', 'isClosed', 'isCurrent', 'isBlock', 'name'])
    .where('orgID', '=', orgID)
    .orderBy('dateFrom')
    .selectAsObject()
  period.forEach(row => {
    row.dateFrom = dateService.shiftDate(row.dateFrom)
    row.dateTo = dateService.shiftDate(row.dateTo)
  })
  return period
}

function getOrgData (orgID) {
  const result = {
    orgAccrual: getOrgAccrual(orgID),
    orgFund: getOrgFund(orgID),
    orgObligatory: getOrgObligatory(orgID),
    orgPeriods: getOrgPeriod(orgID)
  }
  return result
}

function getOrgConstant (orgID) {
  const constants = {}
  const codeList = [ 'hrMinReCalcDate', 'hrTimeSheetReCalcDate', 'hrSkipCheckDt', 'hrShowOtherOrgsTabNums',
    'hrTariffingEducational', 'hrKPI', 'hrUsePlanByOrg', 'hrAccrualAvgCalcSumDate', 'hrAccrualAvgCalcTimeDate' ]
  const settingsOrg = UB.Repository('ac_settingsOrg')
    .attrs(['value', 'constantID.type', 'constantID.code'])
    .where('organizationID', '=', orgID)
    .where('[constantID.code]', 'in', codeList)
    .selectAsObject()
  const settings = UB.Repository('ac_settings')
    .attrs(['value', 'constantID.type', 'constantID.code'])
    .where('[constantID.code]', 'in', codeList)
    .selectAsObject()
  codeList.forEach(constName => {
    const constValue = settingsOrg.find(o => o['constantID.code'] === constName) || settings.find(o => o['constantID.code'] === constName)
    if (constValue) {
      if (['INT', 'ENTITY'].includes(constValue['constantID.type'])) {
        constValue.value = Number(constValue.value)
      } else if (['BOOL'].includes(constValue['constantID.type'])) {
        constValue.value = !!Number(constValue.value)
      }
      if (['hrMinReCalcDate', 'hrTimeSheetReCalcDate', 'hrAccrualAvgCalcSumDate', 'hrAccrualAvgCalcTimeDate'].includes(constName)) {
        constants[constName] = constValue.value ? dateService.shiftDate(new Date(Number(constValue.value.substr(6, 4)), Number(constValue.value.substr(3, 2)) - 1, Number(constValue.value.substr(0, 2)))) : null
        if (['hrAccrualAvgCalcSumDate', 'hrAccrualAvgCalcTimeDate'].includes(constName) && constants[constName]) {
          constants[constName] = dateService.firstDayOfMonth(constants[constName])
        }
      } else {
        constants[constName] = constValue.value
      }
    } else {
      constants[constName] = null
    }
  })
  return constants
}
