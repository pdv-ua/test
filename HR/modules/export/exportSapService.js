const UB = require('@unitybase/ub')

const periodService = require('../../../HR/modules/periodService')
const dateService = require('../../../AC/modules/dataServices/dateService')
const entityBaseService = require('../../../AC/modules/entityServices/entityBaseService')
const accrualService = require('../../../HR/modules/accrualService')
const glCore = require('../../../GL/modules/glCore')

module.exports = {
  exportSap
}

function getDimValue (accOper, dimID, attrName, fieldName = 'dimensionDt', pre = 'ID') {
  return !dimID ? null : accOper[`${fieldName}0${pre}`] === dimID ? accOper[`${fieldName}0Value${attrName || ''}`]
    : accOper[`${fieldName}1${pre}`] === dimID ? accOper[`${fieldName}1Value${attrName || ''}`]
      : accOper[`${fieldName}2${pre}`] === dimID ? accOper[`${fieldName}2Value${attrName || ''}`]
        : accOper[`${fieldName}3${pre}`] === dimID ? accOper[`${fieldName}3Value${attrName || ''}`]
          : accOper[`${fieldName}4${pre}`] === dimID ? accOper[`${fieldName}4Value${attrName || ''}`]
            : accOper[`${fieldName}5${pre}`] === dimID ? accOper[`${fieldName}5Value${attrName || ''}`]
              : accOper[`${fieldName}6${pre}`] === dimID ? accOper[`${fieldName}6Value${attrName || ''}`]
                : accOper[`${fieldName}7${pre}`] === dimID ? accOper[`${fieldName}7Value${attrName || ''}`]
                  : accOper[`${fieldName}8${pre}`] === dimID ? accOper[`${fieldName}8Value${attrName || ''}`]
                    : accOper[`${fieldName}9${pre}`] === dimID ? accOper[`${fieldName}9Value${attrName || ''}`] : null
}

function getEntry (acc, period, entryOperations, employeeNumbers, dimMvvID, mvv) {
  const result = []
  const entryAcc = entryOperations.filter(o => o.entryOperationID === acc.entryOperationID)
  acc.periodSalary = dateService.shiftDate(acc.periodSalary)
  acc.periodCalc = dateService.shiftDate(acc.periodCalc)
  entryAcc.forEach(entry => {
    if ((!entry.operPeriod || (entry.operPeriod === 'prior' && acc.periodSalary < period.dateFrom) ||
        (entry.operPeriod === 'current' && acc.periodSalaryID === period.ID) ||
        (entry.operPeriod === 'priorCurrent' && acc.periodSalary <= period.dateFrom) ||
        (entry.operPeriod === 'next' && acc.periodSalary > period.dateFrom) ||
        (entry.operPeriod === 'nextAdditional' && acc.periodSalary > period.dateFrom)) &&
      (!entry.operSum || (entry.operSum && ((entry.operSum === 'moreZero' && acc.accrualPaySum > 0) || (entry.operSum === 'lessZero' && acc.accrualPaySum < 0)))) &&
      (!entry.entryAccDt || (
        (!entry.entryAccDt.org || !entry.entryAccDt.org.length || (entry.excludeOrg && !entry.entryAccDt.org.includes(period.orgID)) || (!entry.excludeOrg && entry.entryAccDt.org.includes(period.orgID))) &&
        (!entry.entryAccDt.dep || !entry.entryAccDt.dep.length || (entry.excludeDepartment && !entry.entryAccDt.dep.includes(acc.departmentID)) || (!entry.excludeDepartment && entry.entryAccDt.dep.includes(acc.departmentID))) &&
        (!entry.entryAccDt.fs || !entry.entryAccDt.fs.length || (entry.excludeFundSource && !entry.entryAccDt.fs.includes(acc.dictFundSourceID)) || (!entry.excludeFundSource && entry.entryAccDt.fs.includes(acc.dictFundSourceID))) &&
        (!entry.entryAccDt.wp || !entry.entryAccDt.wp.length ||
          (entry.excludeWorkPlace && !entry.entryAccDt.wp.includes((accrualService.binarySearch(employeeNumbers, acc.employeeNumberID, 0, employeeNumbers.length - 1, 'ID') || {}).wp)) ||
          (!entry.excludeWorkPlace && entry.entryAccDt.wp.includes((accrualService.binarySearch(employeeNumbers, acc.employeeNumberID, 0, employeeNumbers.length - 1, 'ID') || {}).wp)))
      ))
    ) {
      const dimMvvValue = getDimValue(acc, dimMvvID, '', 'd', '')
      if (!mvv.length || mvv.includes(dimMvvValue)) {
        result.push({
          accountDt: acc.groupType === 'PAYMENT' ? (entry.accountDtID || acc.accountID) : entry.accountDtID,
          paySum: acc.paySum,
          dimMvvValue
        })
      }
    }
  })
  return result
}

function exportSap (mParams) {
  const coa = glCore.getCOA()
  const sqlDialect = entityBaseService.getSQLDialect()
  let period = periodService.getPeriod(mParams.periodID)
  if (period.orgID !== mParams.orgID) {
    period = periodService.getPeriodOnDate(mParams.orgID, period.dateFrom)
  }
  const listParamIDs = []
  const dimMvvID = coa.dims['ac_dictCostType'] ? coa.dims['ac_dictCostType'].ID : null
  const dimEmpID = coa.dims['org_employee'] ? coa.dims['org_employee'].ID : null
  const exportMethods = UB.Repository('hr_exportMethod')
    .attrs(['ID', 'nameFile', 'isNegative'])
    .where('ID', 'in', mParams.params.methodIDs)
    .orderBy('ID')
    .selectAsObject()
  const exportMethodFields = UB.Repository('hr_exportMethodFields')
    .attrs(['ID', 'exportMethodID', 'name', 'indexNom', 'fixValue', 'listParamID', 'listParam1ID', 'exportFieldsID.code', 'exportFieldsID.tableName', 'listParamsIds'])
    .where('exportMethodID', 'in', mParams.params.methodIDs)
    .orderBy('indexNom')
    .orderBy('exportMethodID')
    .orderBy('ID')
    .selectAsObject({
      'exportFieldsID.tableName': 'tableName',
      'exportFieldsID.code': 'code'
    })
  const dictCostType = UB.Repository('ac_dictCostType').attrs(['*']).misc({ __allowSelectSafeDeleted: true }).orderBy('ID').selectAsObject()
  exportMethodFields.forEach(fields => {
    if (fields.listParamsIds) {
      const listParams = JSON.parse(fields.listParamsIds)
      listParams.forEach((params, idx) => {
        if (params && params.pid) {
          fields[`listParam${idx > 0 ? String(idx) : ''}ID`] = params.pid
          listParamIDs.push(params.pid)
        }
      })
    }
  })
  const idParams = listParamIDs.length ? UB.Repository('hr_idParam').attrs(['listParamID', 'valuesID']).where('listParamID', 'in', listParamIDs).selectAsObject() : []
  exportMethods.forEach(exportMethod => {
    exportMethod.fields = exportMethodFields.filter(o => o.exportMethodID === exportMethod.ID)
  })
  const orgIDs = mParams.childOrg
    ? UB.Repository('hr_organization')
      .attrs(['mi_data_id'])
      .where('state', '=', 'ACTIVE')
      .where('mi_treePath', 'like', `%${mParams.orgID}%`)
      .groupBy('mi_data_id')
      .misc({ __mip_ondate: period.dateTo })
      .selectAsObject().map(o => o.mi_data_id)
    : [mParams.orgID]
  const periods = mParams.childOrg
    ? UB.Repository('hr_dictPeriod')
      .attrs(['ID', 'orgID'])
      .where('dateFrom', '=', period.dateFrom)
      .where('dateTo', '=', period.dateTo)
      .where('orgID', 'in', orgIDs)
      .selectAsObject()
    : [ { ID: period.ID, orgID: mParams.orgID } ]
  const periodIDs = periods.map(o => o.ID)

  const employeeNumbers = UB.Repository('hr_employeeNumberS')
    .attrs('employeeID', 'employeeID.lastName', 'tabNum', 'orgID')
    .where('orgID', 'in', orgIDs)
    .where('workPlace', '<>', '2')
    .orderBy('employeeID')
    .selectAsObject()

  const accOperation = exportMethods.find(m => m.fields.find(o => o.code === 'payAccOperationSum'))
    ? UB.Repository('hr_payAccOperationDt')
      .attrs(['ID', 'payAccOperationID.periodSalaryID.dateTo', 'payAccOperationID', 'payAccOperationID.entryOperationID.name', 'payAccOperationID.entryOperationID.code',
        'sumOperation', 'accountDtID', 'accountDtID.description', 'accountKtID.description', 'accountDtID.code', 'accountKtID', 'accountKtID.code',
        'dictFundSourceID.name', 'dictFundSourceID', 'dictProgClassID.name', 'dictProgClassID', 'dictProjectID.name', 'dictProjectID',
        'dimensionDt0', 'dimensionDt0.description', 'dimensionDt0Value', 'dimensionDt0Value.caption', 'dimensionDt0Value.code',
        'dimensionDt1', 'dimensionDt1.description', 'dimensionDt1Value', 'dimensionDt1Value.caption', 'dimensionDt1Value.code',
        'dimensionDt2', 'dimensionDt2.description', 'dimensionDt2Value', 'dimensionDt2Value.caption', 'dimensionDt2Value.code',
        'dimensionDt3', 'dimensionDt3.description', 'dimensionDt3Value', 'dimensionDt3Value.caption', 'dimensionDt3Value.code',
        'dimensionDt4', 'dimensionDt4.description', 'dimensionDt4Value', 'dimensionDt4Value.caption', 'dimensionDt4Value.code',
        'dimensionDt5', 'dimensionDt5.description', 'dimensionDt5Value', 'dimensionDt5Value.caption', 'dimensionDt5Value.code',
        'dimensionDt6', 'dimensionDt6.description', 'dimensionDt6Value', 'dimensionDt6Value.caption', 'dimensionDt6Value.code',
        'dimensionDt7', 'dimensionDt7.description', 'dimensionDt7Value', 'dimensionDt7Value.caption', 'dimensionDt7Value.code',
        'dimensionDt8', 'dimensionDt8.description', 'dimensionDt8Value', 'dimensionDt8Value.caption', 'dimensionDt8Value.code',
        'dimensionDt9', 'dimensionDt9.description', 'dimensionDt9Value', 'dimensionDt9Value.caption', 'dimensionDt9Value.code',

        'dimensionKt0', 'dimensionKt0.description', 'dimensionKt0Value', 'dimensionKt0Value.caption', 'dimensionKt0Value.code',
        'dimensionKt1', 'dimensionKt1.description', 'dimensionKt1Value', 'dimensionKt1Value.caption', 'dimensionKt1Value.code',
        'dimensionKt2', 'dimensionKt2.description', 'dimensionKt2Value', 'dimensionKt2Value.caption', 'dimensionKt2Value.code',
        'dimensionKt3', 'dimensionKt3.description', 'dimensionKt3Value', 'dimensionKt3Value.caption', 'dimensionKt3Value.code',
        'dimensionKt4', 'dimensionKt4.description', 'dimensionKt4Value', 'dimensionKt4Value.caption', 'dimensionKt4Value.code',
        'dimensionKt5', 'dimensionKt5.description', 'dimensionKt5Value', 'dimensionKt5Value.caption', 'dimensionKt5Value.code',
        'dimensionKt6', 'dimensionKt6.description', 'dimensionKt6Value', 'dimensionKt6Value.caption', 'dimensionKt6Value.code',
        'dimensionKt7', 'dimensionKt7.description', 'dimensionKt7Value', 'dimensionKt7Value.caption', 'dimensionKt7Value.code',
        'dimensionKt8', 'dimensionKt8.description', 'dimensionKt8Value', 'dimensionKt8Value.caption', 'dimensionKt8Value.code',
        'dimensionKt9', 'dimensionKt9.description', 'dimensionKt9Value', 'dimensionKt9Value.caption', 'dimensionKt9Value.code'
      ])
      .where('payAccOperationID.periodSalaryID', 'in', periodIDs)
      .orderBy('payAccOperationID.entryOperationID.code')
      .selectAsObject({
        'payAccOperationID.entryOperationID.code': 'code',
        'payAccOperationID.entryOperationID.name': 'name',
        'accountDtID.description': 'dtDescription',
        'accountKtID.description': 'ktDescription',
        'accountDtID.code': 'dtCode',
        'accountKtID.code': 'ktCode',
        'dictFundSourceID.name': 'dictFundSourceIDName',
        'dictProgClassID.name': 'dictProgClassIDName',
        'dictProjectID.name': 'dictProjectIDName',
        'dimensionDt0': 'dimensionDt0ID',
        'dimensionDt0Value': 'dimensionDt0Value',
        'dimensionDt0.description': 'dimensionDt0',
        'dimensionDt0Value.caption': 'dimensionDt0ValueCaption',
        'dimensionDt1': 'dimensionDt1ID',
        'dimensionDt1Value': 'dimensionDt1Value',
        'dimensionDt1.description': 'dimensionDt1',
        'dimensionDt1Value.caption': 'dimensionDt1ValueCaption',
        'dimensionDt2': 'dimensionDt2ID',
        'dimensionDt2Value': 'dimensionDt2Value',
        'dimensionDt2.description': 'dimensionDt2',
        'dimensionDt2Value.caption': 'dimensionDt2ValueCaption',
        'dimensionDt3': 'dimensionDt3ID',
        'dimensionDt3Value': 'dimensionDt3Value',
        'dimensionDt3.description': 'dimensionDt3',
        'dimensionDt3Value.caption': 'dimensionDt3ValueCaption',
        'dimensionDt4': 'dimensionDt4ID',
        'dimensionDt4Value': 'dimensionDt4Value',
        'dimensionDt4.description': 'dimensionDt4',
        'dimensionDt4Value.caption': 'dimensionDt4ValueCaption',
        'dimensionDt5': 'dimensionDt5ID',
        'dimensionDt5Value': 'dimensionDt5Value',
        'dimensionDt5.description': 'dimensionDt5',
        'dimensionDt5Value.caption': 'dimensionDt5ValueCaption',
        'dimensionDt6': 'dimensionDt6ID',
        'dimensionDt6Value': 'dimensionDt6Value',
        'dimensionDt6.description': 'dimensionDt6',
        'dimensionDt6Value.caption': 'dimensionDt6ValueCaption',
        'dimensionDt7': 'dimensionDt7ID',
        'dimensionDt7Value': 'dimensionDt7Value',
        'dimensionDt7.description': 'dimensionDt7',
        'dimensionDt7Value.caption': 'dimensionDt7ValueCaption',
        'dimensionDt8': 'dimensionDt8ID',
        'dimensionDt8Value': 'dimensionDt8Value',
        'dimensionDt8.description': 'dimensionDt8',
        'dimensionDt8Value.caption': 'dimensionDt8ValueCaption',
        'dimensionDt9': 'dimensionDt9ID',
        'dimensionDt9Value': 'dimensionDt9Value',
        'dimensionDt9.description': 'dimensionDt9',
        'dimensionDt9Value.caption': 'dimensionDt9ValueCaption',
        'dimensionKt0': 'dimensionKt0ID',
        'dimensionKt0Value': 'dimensionKt0Value',
        'dimensionKt0.description': 'dimensionKt0',
        'dimensionKt0Value.caption': 'dimensionKt0ValueCaption',
        'dimensionKt1': 'dimensionKt1ID',
        'dimensionKt1Value': 'dimensionKt1Value',
        'dimensionKt1.description': 'dimensionKt1',
        'dimensionKt1Value.caption': 'dimensionKt1ValueCaption',
        'dimensionKt2': 'dimensionKt2ID',
        'dimensionKt2Value': 'dimensionKt2Value',
        'dimensionKt2.description': 'dimensionKt2',
        'dimensionKt2Value.caption': 'dimensionKt2ValueCaption',
        'dimensionKt3': 'dimensionKt3ID',
        'dimensionKt3Value': 'dimensionKt3Value',
        'dimensionKt3.description': 'dimensionKt3',
        'dimensionKt3Value.caption': 'dimensionKt3ValueCaption',
        'dimensionKt4': 'dimensionKt4ID',
        'dimensionKt4Value': 'dimensionKt4Value',
        'dimensionKt4.description': 'dimensionKt4',
        'dimensionKt4Value.caption': 'dimensionKt4ValueCaption',
        'dimensionKt5': 'dimensionKt5ID',
        'dimensionKt5Value': 'dimensionKt5Value',
        'dimensionKt5.description': 'dimensionKt5',
        'dimensionKt5Value.caption': 'dimensionKt5ValueCaption',
        'dimensionKt6': 'dimensionKt6ID',
        'dimensionKt6Value': 'dimensionKt6Value',
        'dimensionKt6.description': 'dimensionKt6',
        'dimensionKt6Value.caption': 'dimensionKt6ValueCaption',
        'dimensionKt7': 'dimensionKt7ID',
        'dimensionKt7Value': 'dimensionKt7Value',
        'dimensionKt7.description': 'dimensionKt7',
        'dimensionKt7Value.caption': 'dimensionKt7ValueCaption',
        'dimensionKt8': 'dimensionKt8ID',
        'dimensionKt8Value': 'dimensionKt8Value',
        'dimensionKt8.description': 'dimensionKt8',
        'dimensionKt8Value.caption': 'dimensionKt8ValueCaption',
        'dimensionKt9': 'dimensionKt9ID',
        'dimensionKt9Value': 'dimensionKt9Value',
        'dimensionKt9.description': 'dimensionKt9',
        'dimensionKt9Value.caption': 'dimensionKt9ValueCaption'
      }) : []

  exportMethods.forEach(exportMethod => {
    const data = []
    let sumAttr = ''
    let sumAttr2
    exportMethod.perionMonth = dateService.formatDate(period.dateTo, 'mm')
    if (exportMethod.fields.find(o => o.code === 'payAccOperationSum')) {
      sumAttr = 'payAccOperationSum'
      const accountDt = []
      const accountKt = []
      const mvv = []
      const groupFields = []
      exportMethod.fields.forEach(field => {
        switch (field.code) {
          case 'accountDt': {
            if (field.listParamID) {
              accountDt.push(...idParams.filter(o => o.listParamID === field.listParamID).map(o => o.valuesID))
            }
            if (!groupFields.includes('accountDt')) {
              groupFields.push('accountDt')
            }
            break
          }
          case 'accountKt': {
            if (field.listParamID) {
              accountKt.push(...idParams.filter(o => o.listParamID === field.listParamID).map(o => o.valuesID))
            }
            if (!groupFields.includes('accountKt')) {
              groupFields.push('accountKt')
            }
            break
          }
          case 'mvv': {
            if (field.listParamID) {
              mvv.push(...idParams.filter(o => o.listParamID === field.listParamID).map(o => o.valuesID))
            }
            if (!groupFields.includes('mvv')) {
              groupFields.push('mvv')
            }
            break
          }
          case 'nameMBB': {
            if (!groupFields.includes('mvv')) {
              groupFields.push('mvv')
            }
            break
          }
          case 'tTextDt': {
            if (!groupFields.includes('accountDt')) {
              groupFields.push('accountDt')
            }
            break
          }
          case 'tTextNumber': {
            if (!groupFields.includes('employee')) {
              groupFields.push('employee')
            }
            break
          }
          case 'tTextPeriodCalc':
          case 'orderDate': {
            if (!groupFields.includes('period')) {
              groupFields.push('period')
            }
            break
          }
        }
      })
      accOperation.forEach(accOper => {
        const mvvID = getDimValue(accOper, dimMvvID) || getDimValue(accOper, dimMvvID, '', 'dimensionKt')
        const empID = getDimValue(accOper, dimEmpID) || getDimValue(accOper, dimEmpID, '', 'dimensionKt')
        const periodDate = dateService.shiftDate(accOper['payAccOperationID.periodSalaryID.dateTo'])
        const periodM = dateService.formatDate(periodDate, 'mm.yyyy')
        const periodD = dateService.formatDate(periodDate)
        const numberMonth = dateService.formatDate(periodDate, 'm')
        if ((!accountDt.length || accountDt.includes(accOper.accountDtID)) && (!accountKt.length || accountKt.includes(accOper.accountKtID)) &&
          (!mvv.length || mvv.includes(mvvID))) {
          const existRow = data.find(o =>
            (!groupFields.includes('accountDt') || o.accountDtID === accOper.accountDtID) &&
            (!groupFields.includes('accountKt') || o.accountKtID === accOper.accountKtID) &&
            (!groupFields.includes('mvv') || o.mvvID === mvvID) &&
            (!groupFields.includes('employee') || o.empID === empID) &&
            (!groupFields.includes('period') || o.periodM === periodM)
          )
          if (existRow) {
            existRow.payAccOperationSum = accrualService.round(existRow.payAccOperationSum + accOper.sumOperation)
          } else {
            const newRow = {}
            const mvvValue = getDimValue(accOper, dimMvvID, '.code') || getDimValue(accOper, dimMvvID, '.code', 'dimensionKt')
            const empValue = getDimValue(accOper, dimEmpID, 'Caption') || getDimValue(accOper, dimEmpID, 'Caption', 'dimensionKt')
            groupFields.forEach(gFild => {
              if (gFild === 'accountDt') { newRow.accountDtID = accOper.accountDtID } else
              if (gFild === 'accountKt') { newRow.accountKtID = accOper.accountKtID } else
              if (gFild === 'mvv') { newRow.mvvID = mvvID } else
              if (gFild === 'employee') { newRow.empID = empID } else
              if (gFild === 'period') { newRow.periodM = periodM }
            })
            exportMethod.fields.forEach(field => {
              if (field.code === 'balanceCode') { newRow.balanceCode = (mvvValue || '').substring(0, 4) } else
              if (field.code === 'accountDt') { newRow.accountDt = accOper.dtCode || '' } else
              if (field.code === 'accountKt') { newRow.accountKt = accOper.ktCode || '' } else
              if (field.code === 'payAccOperationSum') { newRow.payAccOperationSum = accOper.sumOperation || 0 } else
              if (field.code === 'mvv') { newRow.mvv = mvvValue || '' } else
              if (field.code === 'nameMBB') {
                const mvvDict = mvvID ? dictCostType.find(o => o.ID === mvvID) : null
                newRow.nameMBB = (mvvDict ? mvvDict.name : '') || ''
              } else
              if (field.code === 'tTextDt') { newRow.tTextDt = accOper.dtDescription || '' } else
              if (field.code === 'tTextNumber') {
                newRow.tTextNumber = empValue || ''
                if (empID) {
                  const employeeNumber = employeeNumbers.find(o => o.employeeID === empID)
                  if (employeeNumber) {
                    newRow.tTextNumber = `${employeeNumber['employeeID.lastName']} (${employeeNumber.tabNum})`
                  }
                }
              } else
              if (field.code === 'tTextPeriodCalc') { newRow.tTextPeriodCalc = periodM || '' } else
              if (field.code === 'numberMonth') { newRow.numberMonth = numberMonth } else
              if (field.code === 'tText') {
                newRow.tText = accOper.dtDescription || ''
                let tTextNumber = empValue || null
                if (empID) {
                  const employeeNumber = employeeNumbers.find(o => o.employeeID === empID)
                  if (employeeNumber) {
                    tTextNumber = `${employeeNumber['employeeID.lastName']} (${employeeNumber.tabNum})`
                  }
                }
                if (tTextNumber) {
                  newRow.tText = `${newRow.tText}${newRow.tText ? ';' : ''}${tTextNumber}`
                }
                newRow.tText = `${newRow.tText}${newRow.tText ? ';' : ''}${periodM}`
              } else
              if (field.code === 'orderDate') { newRow.orderDate = periodD || '' }
            })
            data.push(newRow)
            if (!exportMethod.mvvCode && mvvValue) {
              exportMethod.mvvCode = mvvValue.substring(0, 2)
            }
          }
        }
      })
    } else if (exportMethod.fields.find(o => o.code === 'timeSheetHours')) {
      sumAttr = 'timeSheetHours'
      const timeCost = []
      const mvv = []
      const groupFields = []
      exportMethod.fields.forEach(field => {
        switch (field.code) {
          case 'timeSheetHours': {
            if (field.listParamID) {
              timeCost.push(...idParams.filter(o => o.listParamID === field.listParamID).map(o => o.valuesID))
            }
            break
          }
          case 'mvv': {
            if (field.listParamID) {
              mvv.push(...idParams.filter(o => o.listParamID === field.listParamID).map(o => o.valuesID))
            }
            if (!groupFields.includes('mvv')) {
              groupFields.push('mvv')
            }
            break
          }
          case 'tTextNumber': {
            if (!groupFields.includes('employee')) {
              groupFields.push('employee')
            }
            break
          }
          case 'tTextPeriodCalc':
          case 'orderDate': {
            if (!groupFields.includes('period')) {
              groupFields.push('period')
            }
            break
          }
        }
      })
      const timeSheet = UB.DataStore('tim_timeSheet')
      timeSheet.runSQL(` SELECT t.factHour "factHour", t.tabNum "tabNum", t.lastName "lastName", t.nID "nID", t.epID "epID", t.empID "empID",
 (SELECT ${sqlDialect.top} dct.code FROM ac_dictCostType dct WHERE dct.ID = ept.d0Value OR dct.ID = ept.d1Value OR dct.ID = ept.d2Value 
  OR dct.ID = ept.d3Value OR dct.ID = ept.d4Value OR dct.ID = ept.d5Value OR dct.ID = ept.d6Value OR dct.ID = ept.d7Value 
  OR dct.ID = ept.d8Value OR dct.ID = ept.d9Value ${sqlDialect.limit}) "mvvCode",
   (SELECT ${sqlDialect.top} dct.ID FROM ac_dictCostType dct WHERE dct.ID = ept.d0Value OR dct.ID = ept.d1Value OR dct.ID = ept.d2Value 
  OR dct.ID = ept.d3Value OR dct.ID = ept.d4Value OR dct.ID = ept.d5Value OR dct.ID = ept.d6Value OR dct.ID = ept.d7Value 
  OR dct.ID = ept.d8Value OR dct.ID = ept.d9Value ${sqlDialect.limit}) "mvvID"
  FROM (
SELECT SUM(ts.factHour) as factHour, n.tabNum, e.lastName, n.ID nID, ep.ID epID, e.ID empID  
 FROM hr_employeeNumber n 
   JOIN hr_employee e ON e.ID = n.employeeID 
   JOIN tim_timeSheet ts ON n.ID = ts.employeeNumberID AND  ts.dateWork between :dateFrom: and :dateTo: AND ts.isActive = 1  AND ts.factHour > 0 AND ts.mi_deleteDate >= '9999-12-31'
   LEFT JOIN hr_employeePosition ep ON ep.employeeNumberID = n.ID AND ep.dateFrom <= ts.dateWork AND ep.dateTo >= ts.dateWork AND ep.isActive = 1 AND ep.mi_deleteDate >= '9999-12-31'
  WHERE n.orgID${entityBaseService.getInExpression('orgIDs')}
  ${timeCost.length ? `AND ts.factTimeCostID${entityBaseService.getInExpression('timeCost')}` : ''}
 GROUP BY e.ID, n.ID, n.tabNum, e.lastName, ep.ID
  ) t
  LEFT JOIN hr_employeePosition ept ON ept.ID = t.epID`,
      {
        orgIDs,
        dateFrom: period.dateFrom,
        dateTo: period.dateTo,
        timeCost
      })
      const timeSheetData = timeSheet.getAsJsObject()
      const periodM = dateService.formatDate(period.dateTo, 'mm.yyyy')
      const periodD = dateService.formatDate(period.dateTo)
      timeSheetData.forEach(row => {
        const mvvID = row.mvvID
        const empID = row.empID
        if (!mvv.length || mvv.includes(mvvID)) {
          const existRow = data.find(o =>
            (!groupFields.includes('mvv') || o.mvvID === mvvID) &&
            (!groupFields.includes('employee') || o.empID === empID) &&
            (!groupFields.includes('period') || o.periodM === periodM)
          )
          if (existRow) {
            existRow.timeSheetHours = accrualService.round(existRow.timeSheetHours + row.factHour, 4)
          } else {
            const newRow = {}
            const mvvValue = row.mvvCode
            const empValue = `${row.lastName} (${row.tabNum})`
            groupFields.forEach(gFild => {
              if (gFild === 'mvv') { newRow.mvvID = mvvID } else
              if (gFild === 'employee') { newRow.empID = empID } else
              if (gFild === 'period') { newRow.periodM = periodM }
            })
            exportMethod.fields.forEach(field => {
              if (field.code === 'balanceCode') { newRow.balanceCode = (mvvValue || '').substring(0, 4) } else
              if (field.code === 'timeSheetHours') { newRow.timeSheetHours = row.factHour || 0 } else
              if (field.code === 'mvv') { newRow.mvv = mvvValue || '' } else
              if (field.code === 'tTextNumber') { newRow.tTextNumber = empValue || '' } else
              if (field.code === 'tTextPeriodCalc') { newRow.tTextPeriodCalc = periodM || '' } else
              if (field.code === 'tText') { newRow.tText = `${empValue};${periodM}` } else
              if (field.code === 'orderDate') { newRow.orderDate = periodD || '' }
            })
            data.push(newRow)
            if (!exportMethod.mvvCode && mvvValue) {
              exportMethod.mvvCode = mvvValue.substring(0, 2)
            }
          }
        }
      })
    } else if (exportMethod.fields.find(o => o.code === 'accrualSum')) {
      sumAttr = 'accrualSum'
      const payElIDs = []
      const groupFields = []
      exportMethod.fields.forEach(field => {
        switch (field.code) {
          case 'accrualSum': {
            if (field.listParamID) {
              payElIDs.push(...idParams.filter(o => o.listParamID === field.listParamID).map(o => o.valuesID))
            }
            break
          }
          case 'datePayRoll':
          case 'shortFIO':
          case 'IBANRecipient':
          case 'tTextNamePay':
          case 'tTextNumber':
          {
            if (!groupFields.includes(field.code)) {
              groupFields.push(field.code)
            }
            break
          }
          case 'fullFIORecipient':
          case 'tTextFullFIORecipient':
          {
            if (!groupFields.includes('fullFIORecipient')) {
              groupFields.push('fullFIORecipient')
            }
            break
          }
          case 'fullFIORecipientIBAN':
          case 'tTextFullFIORecipientIBAN':
          {
            if (!groupFields.includes('fullFIORecipientIBAN')) {
              groupFields.push('fullFIORecipientIBAN')
            }
            break
          }
          case 'taxCodeRecipient':
          case 'tTextTaxCodeRecipient':
          {
            if (!groupFields.includes('taxCodeRecipient')) {
              groupFields.push('taxCodeRecipient')
            }
            break
          }
          case 'taxCodeRecipientIBAN':
          case 'tTextTaxCodeRecipientIBAN':
          {
            if (!groupFields.includes('taxCodeRecipientIBAN')) {
              groupFields.push('taxCodeRecipientIBAN')
            }
            break
          }
        }
      })
      const accrual = UB.DataStore('hr_accrual')
      accrual.runSQL(
        `SELECT a.paySum "accrualSum", e.shortFIO "shortFIO", c.name "fullFIORecipient", c.OKPOCode "taxCodeRecipient",
          o.orderDate "datePayRoll", p.name "tTextPayElName", r.personalAccount "IBANRecipient", r.namePay "tTextNamePay",
          e.lastName "lastName", a.employeeNumberID "employeeNumberID", n.tabNum "tabNum",
          cac.fullName "fullFIORecipientIBAN", cac.OKPOCode "taxCodeRecipientIBAN"
        FROM hr_accrual a
        LEFT JOIN hr_payEl p ON p.ID = a.payElID
        LEFT JOIN hr_order o ON o.ID = a.orderID
        LEFT JOIN hr_employeeNumber n ON n.ID = a.employeeNumberID
        LEFT JOIN hr_employee e ON e.ID = n.employeeID 
        LEFT JOIN hr_payRetention r ON r.ID = a.sourceID
        LEFT JOIN ac_contrAccount ca ON ca.ID = r.contrAccountID
        LEFT JOIN ac_contractor cac ON cac.ID = ca.organizationID
        LEFT JOIN ac_contractor c ON c.ID = r.contractorID
        WHERE a.orgID${entityBaseService.getInExpression('orgIDs')}
         ${payElIDs.length ? `AND a.payElID${entityBaseService.getInExpression('payElIDs')}` : ''}
         AND a.periodCalc >= :dateFrom: AND a.periodCalc <= :dateTo:
         AND a.flagsRec & 4096 = 0 AND a.flagsRec & 2 = 2
        `,
        {
          orgIDs,
          payElIDs,
          dateFrom: period.dateFrom,
          dateTo: period.dateTo

        })
      const accrualData = accrual.getAsJsObject()
      const periodM = dateService.formatDate(period.dateTo, 'mm.yyyy')
      const periodD = dateService.formatDate(period.dateTo)
      accrualData.forEach(row => {
        const existRow = data.find(o =>
          (!groupFields.includes('datePayRoll') || o.datePayRoll === row.datePayRoll) &&
          (!groupFields.includes('shortFIO') || o.shortFIO === row.shortFIO) &&
          (!groupFields.includes('fullFIORecipient') || o.fullFIORecipient === row.fullFIORecipient) &&
          (!groupFields.includes('taxCodeRecipient') || o.taxCodeRecipient === row.taxCodeRecipient) &&
          (!groupFields.includes('fullFIORecipientIBAN') || o.fullFIORecipientIBAN === row.fullFIORecipientIBAN) &&
          (!groupFields.includes('taxCodeRecipientIBAN') || o.taxCodeRecipientIBAN === row.taxCodeRecipientIBAN) &&
          (!groupFields.includes('IBANRecipient') || o.IBANRecipient === row.IBANRecipient) &&
          (!groupFields.includes('tTextNamePay') || o.tTextNamePay === row.tTextNamePay) &&
          (!groupFields.includes('tTextPayElName') || o.tTextPayElName === row.tTextPayElName) &&
          (!groupFields.includes('tTextNumber') || o.employeeNumberID === row.employeeNumberID)
        )
        if (existRow) {
          existRow.accrualSum = accrualService.round(existRow.accrualSum + row.accrualSum)
        } else {
          const newRow = {
            employeeNumberID: row.employeeNumberID
          }
          exportMethod.fields.forEach(field => {
            if (field.code === 'shortFIO') { newRow.shortFIO = row.shortFIO || '' } else
            if (field.code === 'accrualSum') { newRow.accrualSum = row.accrualSum || 0 } else
            if (field.code === 'orderDate') { newRow.orderDate = periodD || '' }
            if (field.code === 'fullFIORecipient') { newRow.fullFIORecipient = row.fullFIORecipient || '' } else
            if (field.code === 'tTextFullFIORecipient') { newRow.tTextFullFIORecipient = row.fullFIORecipient || '' } else
            if (field.code === 'taxCodeRecipient') { newRow.taxCodeRecipient = row.taxCodeRecipient || '' } else
            if (field.code === 'tTextTaxCodeRecipient') { newRow.tTextTaxCodeRecipient = row.taxCodeRecipient || '' } else
            if (field.code === 'fullFIORecipientIBAN') { newRow.fullFIORecipientIBAN = row.fullFIORecipientIBAN || '' } else
            if (field.code === 'tTextFullFIORecipientIBAN') { newRow.tTextFullFIORecipientIBAN = row.fullFIORecipientIBAN || '' } else
            if (field.code === 'taxCodeRecipientIBAN') { newRow.taxCodeRecipientIBAN = row.taxCodeRecipientIBAN || '' } else
            if (field.code === 'tTextTaxCodeRecipientIBAN') { newRow.tTextTaxCodeRecipientIBAN = row.taxCodeRecipientIBAN || '' } else
            if (field.code === 'IBANRecipient') { newRow.IBANRecipient = row.IBANRecipient || '' } else
            if (field.code === 'datePayRoll') { newRow.datePayRoll = row.datePayRoll ? dateService.formatDate(row.datePayRoll, 'dd.mm.yyyy') : '' } else
            if (field.code === 'tTextPayElName') { newRow.tTextPayElName = row.tTextPayElName || '' } else
            if (field.code === 'tTextPeriodCalc') { newRow.tTextPeriodCalc = periodM || '' } else
            if (field.code === 'tTextNamePay') { newRow.tTextNamePay = row.tTextNamePay || '' } else
            if (field.code === 'tTextNumber') {
              newRow.tTextNumber = `${row.lastName || ''} (${row.tabNum || ''})`
            } else if (field.code === 'tText') {
              newRow.tText = ''
              exportMethod.fields.filter(o => o.code && o.code.indexOf('tText') >= 0 && o.code !== 'tText').forEach(tField => {
                switch (tField.code) {
                  case 'tTextFullFIORecipient' :
                    newRow.tText = `${newRow.tText}${newRow.tText.length ? ';' : ''}${row.fullFIORecipient || ''}`
                    break
                  case 'tTextTaxCodeRecipient' :
                    newRow.tText = `${newRow.tText}${newRow.tText.length ? ';' : ''}${row.taxCodeRecipient || ''}`
                    break
                  case 'tTextFullFIORecipientIBAN' :
                    newRow.tText = `${newRow.tText}${newRow.tText.length ? ';' : ''}${row.fullFIORecipientIBAN || ''}`
                    break
                  case 'tTextTaxCodeRecipientIBAN' :
                    newRow.tText = `${newRow.tText}${newRow.tText.length ? ';' : ''}${row.taxCodeRecipientIBAN || ''}`
                    break
                  case 'tTextPayElName' :
                  case 'tTextNamePay' :
                    newRow.tText = `${newRow.tText}${newRow.tText.length ? ';' : ''}${row[tField.code] || ''}`
                    break
                  case 'tTextPeriodCalc' :
                    newRow.tText = `${newRow.tText}${newRow.tText.length ? ';' : ''}${periodM || ''}`
                    break
                  case 'tTextNumber' :
                    newRow.tText = `${newRow.tText}${newRow.tText.length ? ';' : ''}${`${row.lastName || ''} (${row.tabNum || ''})`}`
                    break
                }
              })
            }
          })
          data.push(newRow)
        }
      })
    }
    if (exportMethod.fields.find(o => o.code === 'sumAccKtg') || exportMethod.fields.find(o => o.code === 'sumAccFundKtg') || exportMethod.fields.find(o => o.code === 'avgCountKtg')) {
      sumAttr = 'sumAccKtg'
      sumAttr2 = 'sumAccFundKtg'
      const mvv = []
      const groupFields = []
      const accountDt = []
      const calcFields = []
      exportMethod.fields.forEach(field => {
        switch (field.code) {
          case 'sumAccKtg': {
            const mvvType = field.listParam1ID ? idParams.filter(o => o.listParamID === field.listParam1ID).map(o => o.valuesID) : []
            const mvv = dictCostType.filter(o => mvvType.includes(o.dictCostPlaceTypeID)).map(o => o.ID)
            field.uCode = `${field.code}${field.ID}`
            calcFields.push({
              code: field.code,
              uCode: field.uCode,
              payElIDs: field.listParamID ? idParams.filter(o => o.listParamID === field.listParamID).map(o => o.valuesID) : [],
              salaryPayElIDs: field.listParam2ID ? idParams.filter(o => o.listParamID === field.listParam2ID).map(o => o.valuesID) : [],
              mvv
            })
            break
          }
          case 'sumAccFundKtg': {
            const mvvType = field.listParam1ID ? idParams.filter(o => o.listParamID === field.listParam1ID).map(o => o.valuesID) : []
            const mvv = dictCostType.filter(o => mvvType.includes(o.dictCostPlaceTypeID)).map(o => o.ID)
            field.uCode = `${field.code}${field.ID}`
            calcFields.push({
              code: field.code,
              uCode: field.uCode,
              payFundIDs: field.listParamID ? idParams.filter(o => o.listParamID === field.listParamID).map(o => o.valuesID) : [],
              salaryPayFundIDs: field.listParam2ID ? idParams.filter(o => o.listParamID === field.listParam2ID).map(o => o.valuesID) : [],
              mvv
            })
            break
          }
          case 'avgCountKtg': {
            const mvvType = field.listParam1ID ? idParams.filter(o => o.listParamID === field.listParam1ID).map(o => o.valuesID) : []
            const mvv = dictCostType.filter(o => mvvType.includes(o.dictCostPlaceTypeID)).map(o => o.ID)
            field.uCode = `${field.code}${field.ID}`
            calcFields.push({
              code: field.code,
              uCode: field.uCode,
              timeCost: field.listParamID ? idParams.filter(o => o.listParamID === field.listParamID).map(o => o.valuesID) : [],
              mvv
            })
            break
          }
          case 'mvv':
          case 'kodStruct':
          case 'nameMBB':
          case 'balanceCode':
          {
            if (!groupFields.includes('mvv')) {
              groupFields.push('mvv')
            }
            break
          }
          case 'accountDt': {
            if (field.listParamID) {
              accountDt.push(...idParams.filter(o => o.listParamID === field.listParamID).map(o => o.valuesID))
            }
            if (!groupFields.includes('accountDt')) {
              groupFields.push('accountDt')
            }
            break
          }
          case 'staffCat':
            if (!groupFields.includes('staffCat')) {
              groupFields.push('staffCat')
            }
            break
          case 'tTextNumber':
          case 'shortFIO':
          {
            if (!groupFields.includes('tTextNumber')) {
              groupFields.push('tTextNumber')
            }
            break
          }
        }
      })
      const entryOperations = UB.Repository('hr_entryAcc')
        .attrs(['entryOperationID', 'dictFundSourceID', 'dictProgClassID', 'dictProjectID', 'accountDtID', 'accountKtID',
          'operPeriod', 'operSum', 'isReversal', 'excludeOrg', 'excludeDepartment', 'excludeFundSource', 'excludeWorkPlace',
          'entryAccDt',
          'dimensionDt0', 'dimensionDt0Value', 'dimensionDt1', 'dimensionDt1Value',
          'dimensionDt2', 'dimensionDt2Value', 'dimensionDt3', 'dimensionDt3Value',
          'dimensionDt4', 'dimensionDt4Value', 'dimensionDt5', 'dimensionDt5Value',
          'dimensionDt6', 'dimensionDt6Value', 'dimensionDt7', 'dimensionDt7Value',
          'dimensionDt8', 'dimensionDt8Value', 'dimensionDt9', 'dimensionDt9Value',
          'dimensionKt0', 'dimensionKt0Value', 'dimensionKt1', 'dimensionKt1Value',
          'dimensionKt2', 'dimensionKt2Value', 'dimensionKt3', 'dimensionKt3Value',
          'dimensionKt4', 'dimensionKt4Value', 'dimensionKt5', 'dimensionKt5Value',
          'dimensionKt6', 'dimensionKt6Value', 'dimensionKt7', 'dimensionKt7Value',
          'dimensionKt8', 'dimensionKt8Value', 'dimensionKt9', 'dimensionKt9Value'
        ])
        .selectAsObject()
      entryOperations.forEach(row => {
        if (row.entryAccDt) {
          row.entryAccDt = JSON.parse(row.entryAccDt)
        }
      })
      let orgsEmployeeNumbers = []
      const employeeNumberStore = UB.DataStore('hr_employeeNumber')
      employeeNumberStore.runSQL(` 
    SELECT en.ID "ID", en.tabNum "tabNum", e.lastName "lastName", e.shortFIO "shortFIO",
    (SELECT ${sqlDialect.top} ep.workPlace FROM hr_employeePosition ep WHERE ep.employeeNumberID = en.ID AND 
    ep.dateFrom <= :dateTo: AND ep.isActive = 1 AND ep.mi_deleteDate >= '9999-12-31' order by ep.dateTo desc ${sqlDialect.limit}) "wp"
    FROM hr_employeeNumber en 
    LEFT JOIN hr_employee e ON e.ID = en.employeeID
    WHERE en.orgID${entityBaseService.getInExpression('orgIDs')}
    AND (EXISTS (SELECT 1 FROM hr_accrual a WHERE a.employeeNumberID = en.ID AND a.periodCalc >= :dateFrom: AND a.periodCalc <= :dateTo: AND a.flagsRec & 4096 = 0) OR
    EXISTS (SELECT 1 FROM hr_accrualFund a WHERE a.employeeNumberID = en.ID AND a.periodCalc >= :dateFrom: AND a.periodCalc <= :dateTo:))
    ORDER BY en.ID
  `, {
        orgIDs,
        dateFrom: period.dateFrom,
        dateTo: period.dateTo
      })
      orgsEmployeeNumbers = employeeNumberStore.getAsJsObject()
      employeeNumberStore.freeNative()

      const accrual = UB.DataStore('hr_accrual')
      accrual.runSQL(
        `SELECT p.entryOperationID "entryOperationID", g.groupType "groupType", a.paySum "accrualPaySum", 
    a.periodSalaryID "periodSalaryID", a.periodSalary "periodSalary", a.periodCalc "periodCalc", a.periodCalcID "periodCalcID", a.employeeNumberID "employeeNumberID",
    a.payElID "payElID", adt.paySum "paySum", adt.dictFundSourceID "dictFundSourceID", adt.dictProgClassID "dictProgClassID", adt.dictProjectID "dictProjectID",
    adt.departmentID "departmentID", adt.accountID "accountID", adt.d0, adt.d1, adt.d2, adt.d3, adt.d4, adt.d5, adt.d6, adt.d7, adt.d8, adt.d9,
    adt.d0Value "d0Value", adt.d1Value "d1Value", adt.d2Value "d2Value", adt.d3Value "d3Value", adt.d4Value "d4Value",
    adt.d5Value "d5Value", adt.d6Value "d6Value", adt.d7Value "d7Value", adt.d8Value "d8Value", adt.d9Value "d9Value"
  FROM hr_accrual a
    JOIN hr_payEl p ON p.ID = a.payElID
    JOIN hr_method m ON p.methodID = m.ID
    JOIN hr_methodGroup g ON m.methodGroupID = g.ID
    LEFT JOIN hr_accrualDt adt ON adt.accrualID = a.ID
       WHERE a.orgID${entityBaseService.getInExpression('orgIDs')}
         AND ((a.periodCalc >= :dateFrom: AND a.periodCalc <= :dateTo:) OR (a.periodSalary >= :dateFrom: AND a.periodSalary <= :dateTo: AND a.periodCalc <= :dateTo:))
         AND a.flagsRec & 4096 = 0
         ORDER BY a.employeeNumberID
        `,
        {
          orgIDs,
          dateFrom: period.dateFrom,
          dateTo: period.dateTo

        })
      const accrualData = accrual.getAsJsObject()
      accrual.freeNative()

      const accrualFundStore = UB.DataStore('hr_accrualFund')
      accrualFundStore.runSQL(` SELECT p.entryOperationID "entryOperationID", a.paySum AS "accrualPaySum", a.payFundID "payFundID",
   a.periodSalaryID "periodSalaryID", a.periodSalary "periodSalary", a.periodCalc "periodCalc", a.periodCalcID "periodCalcID", a.employeeNumberID "employeeNumberID",
   adt.payElID "payElID", adt.paySum "paySum", adt.dictFundSourceID "dictFundSourceID", adt.dictProgClassID "dictProgClassID",
    adt.dictProjectID "dictProjectID", adt.departmentID "departmentID", adt.accountID "accountID",
    adt.d0, adt.d1, adt.d2, adt.d3, adt.d4, adt.d5, adt.d6, adt.d7, adt.d8, adt.d9,
    adt.d0Value "d0Value", adt.d1Value "d1Value", adt.d2Value "d2Value", adt.d3Value "d3Value", adt.d4Value "d4Value",
    adt.d5Value "d5Value", adt.d6Value "d6Value", adt.d7Value "d7Value", adt.d8Value "d8Value", adt.d9Value "d9Value"
  FROM hr_accrualFund a
    LEFT JOIN hr_accrualFundDt adt ON adt.accrualFundID = a.ID
    JOIN hr_payFund p ON p.ID = a.payFundID
  WHERE a.orgID${entityBaseService.getInExpression('orgIDs')}
    AND ((a.periodCalc >= :dateFrom: AND a.periodCalc <= :dateTo:) OR (a.periodSalary >= :dateFrom: AND a.periodSalary <= :dateTo: AND a.periodCalc <= :dateTo:))
             ORDER BY a.employeeNumberID
   `, {
        orgIDs,
        dateFrom: period.dateFrom,
        dateTo: period.dateTo
      })
      const accrualFunds = accrualFundStore.getAsJsObject()
      accrualFundStore.freeNative()
      const employeePositionStore = UB.DataStore('hr_employeePosition')
      employeePositionStore.runSQL(`
      SELECT n.ID "employeeNumberID",
      (select  ${sqlDialect.top} pg.name from hr_employeePosition ep left join hr_position pos on pos.mi_data_id = ep.positionID and pos.orgID = ep.organizationID and pos.state = 'ACTIVE' and pos.mi_dateFrom <= ep.dateTo and pos.mi_deleteDate >= '9999-12-31' JOIN hr_dictPositionGroup pg ON pg.ID = pos.dictPositionGroupID where ep.employeeNumberID = n.ID and ep.dateFrom <= :dateTo: and ep.isActive = 1  and ep.mi_deleteDate >= '9999-12-31' order by ep.dateTo desc, pos.mi_dateTo desc ${sqlDialect.limit}) "staffCat"
      FROM hr_employeeNumber n
       WHERE n.orgID${entityBaseService.getInExpression('orgIDs')}
       AND n.mi_deleteDate >= '9999-12-31'
  `, {
        orgIDs,
        dateFrom: period.dateFrom,
        dateTo: period.dateTo
      })
      const employeePositions = employeePositionStore.getAsJsObject()
      const employeeNumberStaffCat = {}
      employeePositions.forEach(row => {
        employeeNumberStaffCat[row.employeeNumberID] = row.staffCat
      })
      const numberMonth = dateService.formatDate(period.dateTo, 'm')
      const periodM = dateService.formatDate(period.dateTo, 'mm.yyyy')
      const employeeData = []
      const baseColumn = {}
      calcFields.forEach(calcField => {
        baseColumn[calcField.uCode] = 0
      })
      accrualData.forEach(acc => {
        const accEntry = getEntry(acc, period, entryOperations, orgsEmployeeNumbers, dimMvvID, mvv)
        accEntry.forEach(row => {
          calcFields.forEach(calcField => {
            if (calcField.code === 'sumAccKtg' && (!calcField.payElIDs.length || calcField.payElIDs.find(o => o === acc.payElID)) &&
             (!calcField.mvv.length || calcField.mvv.find(o => o === row.dimMvvValue)) &&
              (((!calcField.salaryPayElIDs.length || !calcField.salaryPayElIDs.find(o => o === acc.payElID)) && period.dateFrom <= acc.periodCalc && period.dateTo >= acc.periodCalc) ||
                (calcField.salaryPayElIDs.length && calcField.salaryPayElIDs.find(o => o === acc.payElID) && period.dateFrom <= acc.periodSalary && period.dateTo >= acc.periodSalary))
            ) {
              const existRow = employeeData.find(o => o.employeeNumberID === acc.employeeNumberID && o.dimMvvValue === row.dimMvvValue && o.accountDt === row.accountDt)
              if (existRow) {
                existRow[calcField.uCode] = accrualService.round(existRow[calcField.uCode] + row.paySum)
              } else {
                const newRow = Object.assign({
                  employeeNumberID: acc.employeeNumberID,
                  dimMvvValue: row.dimMvvValue,
                  accountDt: row.accountDt,
                  staffCat: employeeNumberStaffCat[acc.employeeNumberID]
                }, baseColumn)
                newRow[calcField.uCode] = row.paySum
                employeeData.push(newRow)
              }
            }
          })
        })
      })

      accrualFunds.forEach(acc => {
        const accEntry = getEntry(acc, period, entryOperations, orgsEmployeeNumbers, dimMvvID, mvv)
        accEntry.forEach(row => {
          calcFields.forEach(calcField => {
            if (calcField.code === 'sumAccFundKtg' && (!calcField.payFundIDs.length || calcField.payFundIDs.find(o => o === acc.payFundID)) &&
                (!calcField.mvv.length || calcField.mvv.find(o => o === row.dimMvvValue)) &&
              (((!calcField.salaryPayFundIDs.length || !calcField.salaryPayFundIDs.find(o => o === acc.payFundID)) && period.dateFrom <= acc.periodCalc && period.dateTo >= acc.periodCalc) ||
                (calcField.salaryPayFundIDs.length && calcField.salaryPayFundIDs.find(o => o === acc.payFundID) && period.dateFrom <= acc.periodSalary && period.dateTo >= acc.periodSalary))) {
              const existRow = employeeData.find(o => o.employeeNumberID === acc.employeeNumberID && o.dimMvvValue === row.dimMvvValue && o.accountDt === row.accountDt)
              if (existRow) {
                existRow[calcField.uCode] = accrualService.round(existRow[calcField.uCode] + row.paySum)
              } else {
                const newRow = Object.assign({
                  employeeNumberID: acc.employeeNumberID,
                  dimMvvValue: row.dimMvvValue,
                  accountDt: row.accountDt,
                  staffCat: employeeNumberStaffCat[acc.employeeNumberID]
                }, baseColumn)
                newRow[calcField.uCode] = row.paySum
                employeeData.push(newRow)
              }
            }
          })
        })
      })
      calcFields.forEach(calcField => {
        if (calcField.code === 'avgCountKtg') {
          const empCountMounth = getAvgListEmpCountMounth({ orgIDs, dateFrom: period.dateFrom, dateTo: period.dateTo, notAvgQuantityIDs: calcField.timeCost, mvv: calcField.mvv, dimMvvID, workPlace: ['1', '3', '4'] })
          employeeData.forEach(row => {
            if (empCountMounth.employeeNumbers[row.employeeNumberID]) {
              empCountMounth.employeeNumbers[row.employeeNumberID].filter(o => o.dimMvvValue === row.dimMvvValue).forEach(item => {
                row[calcField.uCode] = accrualService.round((row[calcField.uCode] || 0) + (item.dayCount || 0) / empCountMounth.periodDayCount, 3)
              })
            }
          })
        }
      })
      employeeData.forEach(row => {
        row.accountDt = row.accountDt ? coa.byId[row.accountDt].code : ''
        const existRow = data.find(o =>
          (!groupFields.includes('mvv') || o.dimMvvValue === row.dimMvvValue) &&
            (!groupFields.includes('accountDt') || o.accountDt === row.accountDt) &&
            (!groupFields.includes('tTextNumber') || o.employeeNumberID === row.employeeNumberID) &&
          (!groupFields.includes('staffCat') || o.staffCat === (row.staffCat || ''))
        )

        if (existRow) {
          calcFields.forEach(calcField => {
            if (calcField.code === 'avgCountKtg') {
              if (groupFields.includes('tTextNumber')) {
                existRow[calcField.uCode] = Math.max((existRow[calcField.uCode] || 0), (row[calcField.uCode] || 0))
              } else {
                if (!existRow.numberAvgCountKtg) {
                  existRow.numberAvgCountKtg = {}
                }
                if (existRow.numberAvgCountKtg[row.employeeNumberID]) {
                  if (existRow.numberAvgCountKtg[row.employeeNumberID] < (row[calcField.uCode] || 0)) {
                    existRow[calcField.uCode] = accrualService.round((existRow[calcField.uCode] || 0) + (row[calcField.uCode] || 0) - existRow.numberAvgCountKtg[row.employeeNumberID])
                  }
                } else {
                  existRow.numberAvgCountKtg[row.employeeNumberID] = (row[calcField.uCode] || 0)
                  existRow[calcField.uCode] = accrualService.round((existRow[calcField.uCode] || 0) + (row[calcField.uCode] || 0))
                }
              }
            } else {
              existRow[calcField.uCode] = accrualService.round((existRow[calcField.uCode] || 0) + (row[calcField.uCode] || 0))
            }
          })
        } else {
          const newRow = {
            employeeNumberID: row.employeeNumberID,
            dimMvvValue: row.dimMvvValue
          }
          const mvvValue = dictCostType.find(o => o.ID === row.dimMvvValue)
          const mvvValueCode = (mvvValue ? mvvValue.code : '') || ''
          exportMethod.fields.forEach(field => {
            if (field.code === 'mvv') { newRow.mvv = mvvValueCode } else
            if (field.code === 'kodStruct') { newRow.kodStruct = (mvvValueCode).substring(2, 2) } else
            if (field.code === 'balanceCode') { newRow.balanceCode = (mvvValueCode).substring(0, 4) } else
            if (field.code === 'nameMBB') { newRow.nameMBB = (mvvValue ? mvvValue.name : '') || '' } else
            if (field.code === 'numberMonth') { newRow.numberMonth = numberMonth } else
            if (field.code === 'staffCat') { newRow.staffCat = row.staffCat || '' } else
            if (field.code === 'accountDt') { newRow.accountDt = row.accountDt } else
            if (field.code === 'tTextPeriodCalc') { newRow.tTextPeriodCalc = periodM || '' } else
            if (field.code === 'tTextNumber') {
              const empData = accrualService.binarySearch(orgsEmployeeNumbers, row.employeeNumberID, 0, orgsEmployeeNumbers.length - 1, 'ID') || {}
              newRow.tTextNumber = `${empData.lastName || ''} (${empData.tabNum || ''})`
            } else
            if (field.code === 'shortFIO') {
              const empData = accrualService.binarySearch(orgsEmployeeNumbers, row.employeeNumberID, 0, orgsEmployeeNumbers.length - 1, 'ID') || {}
              newRow.shortFIO = empData.shortFIO || ''
            }
            calcFields.forEach(calcField => {
              if (calcField.code === 'avgCountKtg' && !groupFields.includes('tTextNumber')) {
                if (!newRow.numberAvgCountKtg) {
                  newRow.numberAvgCountKtg = {}
                }
                newRow.numberAvgCountKtg[row.employeeNumberID] = (row[calcField.uCode] || 0)
              }
              newRow[calcField.uCode] = accrualService.round((row[calcField.uCode] || 0))
            })
          })
          data.push(newRow)
        }
      })
    }
    exportMethod.data = []
    exportMethod.dataNegative = []
    data.forEach(row => {
      delete row.numberAvgCountKtg
      if (row[sumAttr] !== 0 || (sumAttr2 && row[sumAttr2] !== 0)) {
        if (!exportMethod.isNegative || row[sumAttr] > 0 || (sumAttr2 && row[sumAttr2] > 0)) {
          exportMethod.data.push(row)
        } else
        if (exportMethod.isNegative && row[sumAttr] < 0) {
          exportMethod.dataNegative.push(row)
        }
      }
    })
  })

  return exportMethods
}

function getAvgListEmpCountMounth ({ orgIDs, dateFrom, dateTo, notAvgQuantityIDs, mvv, dimMvvID, workPlace = ['1'], avgCount = false, dec = 3 }) {
  const employeePositionStore = UB.DataStore('hr_employeePosition')
  employeePositionStore.runSQL(`
    SELECT ep.employeeNumberID "employeeNumberID", ep.employeeID "employeeID", ep.dateFrom "dateFrom", ep.dateTo "dateTo",
    d0, d1, d2, d3, d4, d5, d6, d7, d8, d9, d0Value "d0Value", d1Value "d1Value", d2Value "d2Value", d3Value "d3Value",
    d4Value "d4Value",  d5Value "d5Value", d6Value "d6Value",  d7Value "d7Value",  d8Value "d8Value",  d9Value "d9Value",
    ep.workPlace "workPlace" 
    FROM hr_employeePosition ep
    JOIN hr_employeeNumber n ON n.ID = ep.employeeNumberID
    LEFT JOIN hr_payEl pl ON pl.ID = ep.payElID
    LEFT JOIN hr_method m ON pl.methodID = m.ID
    WHERE ep.organizationID${entityBaseService.getInExpression('orgIDs')}
    AND ep.workPlace${entityBaseService.getInExpression('workPlace')}
    AND ep.dateFrom <= :dateTo: AND ep.dateTo >= :dateFrom:   
    AND ep.mi_deleteDate >= '9999-12-31' AND ep.isActive = 1
    AND n.mi_deleteDate >= '9999-12-31'
    AND (EXISTS (SELECT 1 FROM hr_accrual a WHERE a.employeeNumberID = ep.employeeNumberID AND  a.periodCalc >= :dateFrom: AND a.periodCalc <= :dateTo: AND a.flagsRec & 4096 = 0) OR
    EXISTS (SELECT 1 FROM hr_accrualFund a WHERE a.employeeNumberID = ep.employeeNumberID AND a.periodCalc >= :dateFrom: AND a.periodCalc <= :dateTo:))
    ORDER BY ep.employeeNumberID, ep.dateFrom
  `, {
    orgIDs,
    dateFrom,
    dateTo,
    workPlace
  })

  const empPosData = employeePositionStore.getAsJsObject()
  const periodDayCount = dateService.dayDiff(dateFrom, dateTo) + 1
  const empPosDataByEmp = {}
  empPosData.forEach(posData => {
    const dimMvvValue = getDimValue(posData, dimMvvID, '', 'd', '')
    if (!mvv.length || mvv.find(o => o === dimMvvValue)) {
      const perDateFrom = dateService.shiftDate(Math.max(dateFrom, dateService.shiftDate(posData['dateFrom'])))
      const perDateTo = dateService.shiftDate(Math.min(dateTo, (dateService.shiftDate(posData['dateTo'] || dateService.maxDate()))))
      let dayCount = 0
      if (workPlace.includes(posData.workPlace)) {
        dayCount = Math.max(0, dateService.dayDiff(perDateFrom, perDateTo) + 1)
        if (!avgCount) {
          const excludeEducation = UB.Repository('hr_employeeEducation')
            .attrs(['dateFrom', 'dateTo'])
            .where('employeeID', '=', posData.employeeID)
            .where('worksAndStudies', '=', 1)
            .where('dateFrom', '<=', perDateTo)
            .where('dateTo', '>=', perDateFrom, 'dateTo')
            .where('dateTo', 'isNull', undefined, 'dateToIsNull')
            .logic('(([dateTo]) or ([dateToIsNull]))')
            .limit(1)
            .selectSingle()
          let excludeEducationDay = 0
          if (excludeEducation) {
            excludeEducation.dateFrom = dateService.shiftDate(excludeEducation.dateFrom)
            excludeEducation.dateTo = dateService.shiftDate(excludeEducation.dateTo || perDateTo)
            excludeEducationDay = dateService.dayDiff(dateService.shiftDate(Math.max(perDateFrom, excludeEducation.dateFrom)),
              dateService.shiftDate(Math.min(perDateTo, excludeEducation.dateTo))) + 1
          }
          dayCount = Math.max(0, dayCount - excludeEducationDay)
          const excludeDay = notAvgQuantityIDs.length ? (UB.Repository('tim_timeSheet')
            .attrs(['COUNT(1)'])
            .where('[employeeNumberID]', '=', posData.employeeNumberID)
            .where('[dateWork]', '>=', perDateFrom)
            .where('[dateWork]', '<=', perDateTo)
            .where('[isActive]', '=', true)
            .where('[factTimeCostID]', 'in', notAvgQuantityIDs)
            .selectScalar() || 0) : 0
          dayCount = Math.max(0, dayCount - excludeDay)
        }
      }
      if (!empPosDataByEmp[posData.employeeNumberID]) {
        empPosDataByEmp[posData.employeeNumberID] = []
      }
      let existRow = empPosDataByEmp[posData.employeeNumberID].find(o => o.dimMvvValue === dimMvvValue)
      if (!existRow) {
        existRow = {
          dimMvvValue: dimMvvValue,
          dayCount: dayCount
        }
        empPosDataByEmp[posData.employeeNumberID].push(existRow)
      } else {
        existRow.dayCount += dayCount
      }
    }
  })
  return {
    periodDayCount: periodDayCount,
    employeeNumbers: empPosDataByEmp
  }
}
