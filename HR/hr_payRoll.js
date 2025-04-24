const UB = require('@unitybase/ub')
const App = UB.App
const Session = UB.Session
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const orderService = require('../HR/modules/orderService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')
const selectService = require('../AC/modules/dataServices/selectService')
const algorithmService = require('../HR/modules/algorithmService')
const dateService = require('../AC/modules/dataServices/dateService')
const rlService = require('../HR/modules/rlService')
const accrualService = require('../HR/modules/accrualService')
const periodService = require('../HR/modules/periodService')
const payRollPrint = require('../HR/modules/printForm/payRollPrint')
const payRollService = require('../HR/modules/payRollService')
const tpManager = require('../AC/modules/documentBuilder/tpManager')
const { generateBase64Str } = require('../AC/modules/dataServices/filesService')
const paySummaryService = require('../HR/modules/paySummaryService')
const payAccService = require('../HR/modules/payAccService')
const dbfBuilder = require('../AC/public/core/dbf.js')
const iconv = require('iconv-lite')
const { generateCsvStr } = require('../GL/modules/accountingCore/integrationsService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)
me.on('update:after', afterUpdate)
me.on('insert:after', afterInsert)
me.on('delete:before', beforeDelete)
me.on('select:after', afterSelect)

me.entity.addMethod('doPosting')
me.entity.addMethod('doCancelPosting')
me.entity.addMethod('getOrderNum')
me.entity.addMethod('calcPayRollCash')
me.entity.addMethod('calcPayRollBank')
me.entity.addMethod('calcPayRollPost')
me.entity.addMethod('getPayOutByEmployee')
me.entity.addMethod('calcPayWithinPeriod')
me.entity.addMethod('calcPaySicknessRequis')
me.entity.addMethod('calcFundSourceBank')
me.entity.addMethod('docPrintForm')
me.entity.addMethod('docPrintFormFSS')
me.entity.addMethod('exportBank')
me.entity.addMethod('generateXLSX')
me.entity.addMethod('generateXLSXFSS')
me.entity.addMethod('restorePayRoll')
me.entity.addMethod('search')
me.entity.addMethod('getSourceForWithin')

me.details = [
  {
    detailName: 'payRollDt',
    entityName: 'hr_payRollDt',
    orderType: 'hr_payRollCash',
    docIDName: 'payRollID',
    fieldList: orderService.setFieldListAttribute([
      'employeeNumberID.description', 'docSum', 'deltaSum', 'taxSum', 'paidSum', 'depSum', 'baseSum', 'paySum', 'planPaySum',
      'periodCalcID', 'payRetentionID', 'payRetentionID.payOutID.name', 'employeePayOutID', 'employeePayOutID.payOutID.name', 'payOutID.name',
      'reason', 'mask', 'flagsFix', 'accrualDt', 'paymentDt', 'offtakeAccrual', 'dopTaxSum', 'balanceSum',
      'rate', 'source', 'sourceID', 'incomingDebtSum', 'repaymentDebtSum', 'calculatedSum', 'repaymentSum',
      'periodCalc', 'periodSalaryID', 'periodSalary', 'posName', 'depName',
      'payRetentionID.contrAccountID.organizationID.description', 'payRollID', 'rlAccrual'
    ], ['lineNum', 'mi_modifyDate'])
  },
  {
    detailName: 'payRollDt',
    entityName: 'hr_payRollDt',
    orderType: 'hr_payRollBank',
    docIDName: 'payRollID',
    fieldList: orderService.setFieldListAttribute([
      'employeeNumberID.description', 'employeeNumberID.dateTo', 'docSum', 'deltaSum', 'baseSum', 'taxSum', 'baseSum', 'paySum', 'planPaySum',
      'payRetentionID', 'payRetentionID.payOutID.name', 'employeePayOutID', 'employeePayOutID.payOutID.name', 'payOutID.name',
      'reason', 'mask', 'flagsFix', 'accrualDt', 'paymentDt', 'offtakeAccrual', 'dopTaxSum', 'balanceSum',
      'source', 'sourceID', 'incomingDebtSum', 'repaymentDebtSum', 'calculatedSum', 'repaymentSum', 'basePayment',
      'periodCalcID', 'periodCalc', 'periodSalaryID', 'periodSalary', 'posName', 'depName',
      'payRetentionID.contrAccountID.organizationID.description', 'payRollID', 'rlAccrual'
    ], ['lineNum', 'mi_modifyDate'])
  },
  {
    detailName: 'payRollDt',
    entityName: 'hr_payRollDt',
    orderType: 'hr_payRollPost',
    docIDName: 'payRollID',
    fieldList: orderService.setFieldListAttribute([
      'employeeNumberID.description', 'baseSum', 'paySum', 'planPaySum',
      'payRetentionID', 'payRetentionID.payOutID.name', 'employeePayOutID', 'employeePayOutID.payOutID.name', 'payOutID.name',
      'reason', 'mask', 'flagsFix', 'accrualDt', 'paymentDt', 'offtakeAccrual', 'dopTaxSum', 'balanceSum',
      'rate', 'source', 'sourceID', 'incomingDebtSum', 'repaymentDebtSum', 'calculatedSum', 'repaymentSum',
      'periodCalcID', 'periodCalc', 'periodSalaryID', 'periodSalary', 'posName', 'depName',
      'payRetentionID.contrAccountID.organizationID.description', 'payRollID', 'rlAccrual'
    ], ['lineNum', 'mi_modifyDate'])
  },
  {
    detailName: 'payRollPerm',
    entityName: 'hr_RollReg',
    orderType: 'hr_payRollWithinBank',
    docIDName: 'payRollID',
    fieldList: orderService.setFieldListAttribute([
      'payRollID', 'orderRegistryID', 'orderRegistryID.orderDate', 'orderRegistryID.orderNumber', 'orderRegistryID.description',
      'orderRegistryID.orderType', 'orderRegistryID.periodID.name', 'orderRegistryID.lineCount', 'orderRegistryID.paySum'
    ], ['lineNum', 'mi_modifyDate'])
  },
  {
    detailName: 'payRollDt',
    entityName: 'hr_payRollDt',
    orderType: 'hr_payRollWithinBank',
    docIDName: 'payRollID',
    fieldList: orderService.setFieldListAttribute([
      'employeeNumberID', 'employeeNumberID.description', 'employeeNumberID.dateTo', 'docSum', 'deltaSum', 'baseSum', 'taxSum', 'paySum', 'paidSum',
      'planPaySum', 'depSum', 'periodCalcID', 'periodCalc', 'periodSalaryID', 'periodSalary', 'dopTaxSum', 'balanceSum',
      'payRetentionID', 'payRetentionID.payOutID.name', 'employeePayOutID', 'employeePayOutID.payOutID.name', 'payOutID.name',
      'reason', 'mask', 'flagsFix', 'posName', 'depName', 'accrualDt', 'paymentDt', 'payRollID', 'offtakeAccrual'
    ], ['lineNum', 'mi_modifyDate'])
  },
  {
    detailName: 'payOrder',
    entityName: 'hr_paymentOrder',
    orderType: 'hr_payRollWithinBank',
    docIDName: 'payRollID',
    fieldList: orderService.setFieldListAttribute([
      'periodCalcID', 'payObligatoryID', 'payRollID', 'postedDate',
      'payObligatoryID.name', 'contrAccountID.description', 'contrAccountID.organizationID.name', 'payObligatoryID.orgName', 'paySum'
    ], ['lineNum', 'mi_modifyDate']),
    JSONAttr: ['paymentOrderDt', 'paymentOrderAccDt'],
    subDetail: [
      {
        subDetailName: 'paymentOrderDt',
        subEntityName: 'hr_paymentOrderDt',
        subDocIDName: 'paymentOrderID',
        subFieldList: orderService.setFieldListAttribute([
          'paymentOrderID', 'employeeNumberID', 'employeeNumberID.description', 'payRollDtID', 'paySum'],
        ['lineNum', 'mi_modifyDate'])
      },
      {
        subDetailName: 'paymentOrderAccDt',
        subEntityName: 'hr_paymentOrderAccDt',
        subDocIDName: 'paymentOrderID',
        subFieldList: orderService.setFieldListAttribute(['paymentOrderID',
          'dictFundSourceID', 'dictProgClassID', 'dictProjectID',
          'paySum', 'd0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9',
          'd0Value', 'd1Value', 'd2Value', 'd3Value', 'd4Value', 'd5Value', 'd6Value', 'd7Value', 'd8Value', 'd9Value'],
        ['lineNum', 'mi_modifyDate'])
      }
    ]
  },
  {
    detailName: 'payRollPerm',
    entityName: 'hr_RollReg',
    orderType: 'hr_payRollWithinCash',
    docIDName: 'payRollID',
    fieldList: orderService.setFieldListAttribute([
      'payRollID', 'orderRegistryID', 'orderRegistryID.orderDate', 'orderRegistryID.orderNumber', 'orderRegistryID.description',
      'orderRegistryID.orderType', 'orderRegistryID.periodID.name', 'orderRegistryID.lineCount', 'orderRegistryID.paySum'
    ], ['lineNum', 'mi_modifyDate'])
  },
  {
    detailName: 'payRollDt',
    entityName: 'hr_payRollDt',
    orderType: 'hr_payRollWithinCash',
    docIDName: 'payRollID',
    fieldList: orderService.setFieldListAttribute([
      'employeeNumberID', 'employeeNumberID.description', 'docSum', 'deltaSum', 'baseSum', 'taxSum', 'paySum', 'paidSum',
      'planPaySum', 'depSum', 'periodCalcID', 'periodCalc', 'periodSalaryID', 'periodSalary',
      'payRetentionID', 'payRetentionID.payOutID.name', 'employeePayOutID', 'employeePayOutID.payOutID.name', 'payOutID.name',
      'reason', 'mask', 'flagsFix', 'posName', 'depName', 'accrualDt', 'paymentDt', 'payRollID', 'offtakeAccrual'
    ], ['lineNum', 'mi_modifyDate'])
  },
  {
    detailName: 'payOrder',
    entityName: 'hr_paymentOrder',
    orderType: 'hr_payRollWithinCash',
    docIDName: 'payRollID',
    fieldList: orderService.setFieldListAttribute([
      'periodCalcID', 'payObligatoryID', 'payRollID', 'postedDate',
      'payObligatoryID.name', 'contrAccountID.description', 'contrAccountID.organizationID.name', 'payObligatoryID.orgName', 'paySum'
    ], ['lineNum', 'mi_modifyDate']),
    JSONAttr: ['paymentOrderDt', 'paymentOrderAccDt'],
    subDetail: [
      {
        subDetailName: 'paymentOrderDt',
        subEntityName: 'hr_paymentOrderDt',
        subDocIDName: 'paymentOrderID',
        subFieldList: orderService.setFieldListAttribute([
          'paymentOrderID', 'employeeNumberID', 'employeeNumberID.description', 'payRollDtID', 'paySum'],
        ['lineNum', 'mi_modifyDate'])
      },
      {
        subDetailName: 'paymentOrderAccDt',
        subEntityName: 'hr_paymentOrderAccDt',
        subDocIDName: 'paymentOrderID',
        subFieldList: orderService.setFieldListAttribute(['paymentOrderID',
          'dictFundSourceID', 'dictProgClassID', 'dictProjectID',
          'paySum', 'd0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9',
          'd0Value', 'd1Value', 'd2Value', 'd3Value', 'd4Value', 'd5Value', 'd6Value', 'd7Value', 'd8Value', 'd9Value'],
        ['lineNum', 'mi_modifyDate'])
      }
    ]
  },
  {
    detailName: 'payRollSicknessRequis',
    entityName: 'hr_RollRequis',
    orderType: 'hr_payFSSBank',
    docIDName: 'payRollID',
    fieldList: orderService.setFieldListAttribute([
      'payRollID', 'sicknessRequisID', 'sicknessRequisID.description', 'sicknessRequisID.orderDate', 'sicknessRequisID.orderNumber',
      'sicknessRequisID.periodID', 'sicknessRequisID.lineCount', 'sicknessRequisID.totalPaySum', 'sicknessRequisID.orderState'
    ], ['lineNum', 'mi_modifyDate'])
  },
  {
    detailName: 'payRollDt',
    entityName: 'hr_payRollDt',
    orderType: 'hr_payFSSBank',
    docIDName: 'payRollID',
    skipRls: true,
    fieldList: orderService.setFieldListAttribute([
      'employeeNumberID', 'employeeNumberID.description', 'baseSum', 'taxSum', 'paySum', 'paidSum', 'depSum', 'planPaySum',
      'periodCalcID', 'periodCalc', 'periodSalaryID', 'periodSalary',
      'payRetentionID', 'payRetentionID.payOutID.name', 'employeePayOutID', 'employeePayOutID.payOutID.name', 'payOutID.name',
      'reason', 'mask', 'dateFrom', 'dateTo', 'flagsFix', 'posName', 'depName', 'accrualDt', 'paymentDt', 'payRollID', 'offtakeAccrual'
    ], ['lineNum', 'mi_modifyDate'])
  },
  {
    detailName: 'payOrder',
    entityName: 'hr_paymentOrder',
    orderType: 'hr_payFSSBank',
    docIDName: 'payRollID',
    fieldList: orderService.setFieldListAttribute([
      'periodCalcID', 'payObligatoryID', 'payRollID', 'postedDate',
      'payObligatoryID.name', 'contrAccountID.description', 'contrAccountID.organizationID.name', 'payObligatoryID.orgName', 'paySum'
    ], ['lineNum', 'mi_modifyDate']),
    JSONAttr: ['paymentOrderDt', 'paymentOrderAccDt'],
    subDetail: [
      {
        subDetailName: 'paymentOrderDt',
        subEntityName: 'hr_paymentOrderDt',
        subDocIDName: 'paymentOrderID',
        subFieldList: orderService.setFieldListAttribute([
          'paymentOrderID', 'employeeNumberID', 'employeeNumberID.description', 'payRollDtID', 'paySum'],
        ['lineNum', 'mi_modifyDate'])
      },
      {
        subDetailName: 'paymentOrderAccDt',
        subEntityName: 'hr_paymentOrderAccDt',
        subDocIDName: 'paymentOrderID',
        subFieldList: orderService.setFieldListAttribute(['paymentOrderID',
          'dictFundSourceID', 'dictProgClassID', 'dictProjectID',
          'paySum', 'd0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9',
          'd0Value', 'd1Value', 'd2Value', 'd3Value', 'd4Value', 'd5Value', 'd6Value', 'd7Value', 'd8Value', 'd9Value'],
        ['lineNum', 'mi_modifyDate'])
      }
    ]
  },
  {
    detailName: 'payOrder',
    entityName: 'hr_paymentOrder',
    orderType: 'hr_payRollBank',
    docIDName: 'payRollID',
    fieldList: orderService.setFieldListAttribute([
      'periodCalcID', 'payObligatoryID', 'payRollID', 'postedDate',
      'payObligatoryID.name', 'contrAccountID.description', 'contrAccountID.organizationID.name', 'payObligatoryID.orgName', 'paySum'
    ], ['lineNum', 'mi_modifyDate']),
    JSONAttr: ['paymentOrderDt', 'paymentOrderAccDt'],
    subDetail: [
      {
        subDetailName: 'paymentOrderDt',
        subEntityName: 'hr_paymentOrderDt',
        subDocIDName: 'paymentOrderID',
        subFieldList: orderService.setFieldListAttribute([
          'paymentOrderID', 'employeeNumberID', 'employeeNumberID.description', 'payRollDtID', 'paySum'],
        ['lineNum', 'mi_modifyDate'])
      },
      {
        subDetailName: 'paymentOrderAccDt',
        subEntityName: 'hr_paymentOrderAccDt',
        subDocIDName: 'paymentOrderID',
        subFieldList: orderService.setFieldListAttribute(['paymentOrderID',
          'dictFundSourceID', 'dictProgClassID', 'dictProjectID',
          'paySum', 'd0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9',
          'd0Value', 'd1Value', 'd2Value', 'd3Value', 'd4Value', 'd5Value', 'd6Value', 'd7Value', 'd8Value', 'd9Value'],
        ['lineNum', 'mi_modifyDate'])
      }
    ]
  },
  {
    detailName: 'payOrder',
    entityName: 'hr_paymentOrder',
    orderType: 'hr_payRollCash',
    docIDName: 'payRollID',
    fieldList: orderService.setFieldListAttribute([
      'periodCalcID', 'payObligatoryID', 'payRollID', 'postedDate',
      'payObligatoryID.name', 'contrAccountID.description', 'contrAccountID.organizationID.name', 'payObligatoryID.orgName', 'paySum'
    ], ['lineNum', 'mi_modifyDate']),
    JSONAttr: ['paymentOrderDt', 'paymentOrderAccDt'],
    subDetail: [
      {
        subDetailName: 'paymentOrderDt',
        subEntityName: 'hr_paymentOrderDt',
        subDocIDName: 'paymentOrderID',
        subFieldList: orderService.setFieldListAttribute([
          'paymentOrderID', 'employeeNumberID', 'employeeNumberID.description', 'payRollDtID', 'paySum'],
        ['lineNum', 'mi_modifyDate'])
      },
      {
        subDetailName: 'paymentOrderAccDt',
        subEntityName: 'hr_paymentOrderAccDt',
        subDocIDName: 'paymentOrderID',
        subFieldList: orderService.setFieldListAttribute(['paymentOrderID',
          'dictFundSourceID', 'dictProgClassID', 'dictProjectID',
          'paySum', 'd0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9',
          'd0Value', 'd1Value', 'd2Value', 'd3Value', 'd4Value', 'd5Value', 'd6Value', 'd7Value', 'd8Value', 'd9Value'],
        ['lineNum', 'mi_modifyDate'])
      }
    ]
  },
  {
    detailName: 'payRollDt',
    entityName: 'hr_payRollDt',
    orderType: 'hr_payFundSourceBank',
    docIDName: 'payRollID',
    fieldList: orderService.setFieldListAttribute([
      'employeeNumberID.description', 'employeeNumberID.dateTo', 'docSum', 'deltaSum', 'baseSum', 'taxSum', 'baseSum', 'paySum', 'planPaySum',
      'payRetentionID', 'payRetentionID.payOutID.name', 'employeePayOutID', 'employeePayOutID.payOutID.name', 'payOutID.name',
      'reason', 'mask', 'flagsFix', 'accrualDt', 'paymentDt', 'offtakeAccrual',
      'source', 'sourceID', 'incomingDebtSum', 'repaymentDebtSum', 'calculatedSum', 'repaymentSum', 'basePayment',
      'periodCalcID', 'periodCalc', 'periodSalaryID', 'periodSalary', 'posName', 'depName', 'baseSumAll', 'taxSumAll',
      'rollSumAll', 'payRetentionID.contrAccountID.organizationID.description', 'payRollID'
    ], ['lineNum', 'mi_modifyDate'])
  },
  {
    detailName: 'payOrder',
    entityName: 'hr_paymentOrder',
    orderType: 'hr_payFundSourceBank',
    docIDName: 'payRollID',
    fieldList: orderService.setFieldListAttribute([
      'periodCalcID', 'payObligatoryID', 'payRollID', 'postedDate',
      'payObligatoryID.name', 'contrAccountID.description', 'contrAccountID.organizationID.name', 'payObligatoryID.orgName', 'paySum'
    ], ['lineNum', 'mi_modifyDate']),
    JSONAttr: ['paymentOrderDt', 'paymentOrderAccDt'],
    subDetail: [
      {
        subDetailName: 'paymentOrderDt',
        subEntityName: 'hr_paymentOrderDt',
        subDocIDName: 'paymentOrderID',
        subFieldList: orderService.setFieldListAttribute([
          'paymentOrderID', 'employeeNumberID', 'employeeNumberID.description', 'payRollDtID', 'paySum'],
        ['lineNum', 'mi_modifyDate'])
      },
      {
        subDetailName: 'paymentOrderAccDt',
        subEntityName: 'hr_paymentOrderAccDt',
        subDocIDName: 'paymentOrderID',
        subFieldList: orderService.setFieldListAttribute(['paymentOrderID',
          'dictFundSourceID', 'dictProgClassID', 'dictProjectID',
          'paySum', 'd0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9',
          'd0Value', 'd1Value', 'd2Value', 'd3Value', 'd4Value', 'd5Value', 'd6Value', 'd7Value', 'd8Value', 'd9Value'],
        ['lineNum', 'mi_modifyDate'])
      }
    ]
  }
]

function beforeInsert (ctx) {
  const { execParams } = ctx.mParams
  const boolAttr = ['includeSubDep', 'includeSubDepGroup', 'applyRetention', 'applyAddRetention']
  boolAttr.forEach(attrName => {
    if (execParams[attrName] === undefined) {
      execParams[attrName] = 0
    }
  })

  if (execParams.applyBalance === undefined) {
    execParams.applyBalance = 1
  }
  setDefaultAttribute(ctx)
}

function beforeUpdate (ctx) {
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || { }
  ctx.previousValues = instanceData
  const { execParams } = ctx.mParams
  setDefaultAttribute(ctx)
  const detail = me.details.filter(o => o.orderType === (execParams.orderType || instanceData.orderType))
  if (detail.length && !(instanceData.orderState === 'POSTED' && execParams.orderState !== 'PROJECT')) {
    orderService.saveDetails(ctx, detail, { checkExist: true })
    savePaymentOrder(ctx)
  }
  if (!(instanceData.orderState === 'POSTED' && execParams.orderState !== 'PROJECT')) {
    paySummaryService.recalcPaymentOrder(execParams.organizationID || instanceData.organizationID, execParams.periodSalaryID || instanceData.periodSalaryID)
  }
  if (execParams.orderState === 'POSTED') {
    const period = periodService.getCurrentPeriod(execParams.organizationID || instanceData.organizationID)
    execParams.periodEntryID = period.ID
    me.doPosting(ctx)
    const payRoll = UB.Repository('hr_payRoll').attrs(['orderState', 'description']).selectById(execParams.ID)
    if (payRoll && payRoll.orderState === 'POSTED') {
      throw new UB.UBAbort(`<<<${UB.i18n('Платіжна відомість {0} вже проведена', execParams.description || payRoll.description)}>>>`)
    }
  }
  if (execParams.orderState === 'PROJECT') {
    me.doCancelPosting(ctx)
    const payRoll = UB.Repository('hr_payRoll').attrs(['orderState', 'description']).selectById(execParams.ID)
    if (payRoll && payRoll.orderState === 'PROJECT') {
      throw new UB.UBAbort(`<<<${UB.i18n('Платіжна відомість {0} вже розпроведена', execParams.description || payRoll.description)}>>>`)
    }
  }
}

function afterInsert (ctx) {
  const { execParams } = ctx.mParams
  const detail = me.details.filter(o => o.orderType === execParams.orderType)
  if (detail.length) {
    orderService.saveDetails(ctx, detail, { checkExist: true })
    savePaymentOrder(ctx)
    ctx.mParams.detail = orderService.getEntityDetail(execParams.ID, detail)
  }
  paySummaryService.recalcPaymentOrder(execParams.organizationID, execParams.periodSalaryID)
}

function afterUpdate (ctx) {
  const { execParams } = ctx.mParams
  const instanceData = ctx.previousValues
  const detail = me.details.filter(o => o.orderType === (execParams.orderType || instanceData.orderType))
  if (detail.length) {
    ctx.mParams.detail = orderService.getEntityDetail(execParams.ID, detail)
  }
}

function afterSelect (ctx) {
  const { mParams } = ctx
  if (mParams.ID && !mParams.execParams && ctx.dataStore.get('orderType')) {
    const detail = me.details.filter(o => o.orderType === (ctx.dataStore.get('orderType')))
    if (detail.length) {
      ctx.mParams.detail = orderService.getEntityDetail(mParams.ID, detail)
    }
  }
}

function savePaymentOrder (ctx) {
  const { execParams } = ctx.mParams
  const store = UB.DataStore('hr_paymentOrder')
  const paymentOrderStore = UB.DataStore('hr_paymentOrder')
  const payRollDt = UB.Repository('hr_payRollDt').attrs(['paymentDt']).where('payRollID', '=', execParams.ID).selectAsObject()
  store.execSQL(`DELETE FROM hr_paymentOrderDt WHERE paymentOrderID in (SELECT ID FROM hr_paymentOrder WHERE payRollID = :payRollID:)`,
    { payRollID: execParams.ID })
  store.execSQL(`DELETE FROM hr_paymentOrderAccDt WHERE paymentOrderID in (SELECT ID FROM hr_paymentOrder WHERE payRollID = :payRollID:)`,
    { payRollID: execParams.ID })
  store.execSQL(`DELETE FROM hr_paymentOrder WHERE payRollID = :payRollID:`, { payRollID: execParams.ID })
  const paymentOrder = []
  payRollDt.forEach(accr => {
    if (accr.paymentDt) {
      JSON.parse(accr.paymentDt).forEach(paymentDt => {
        const payOrder = paymentOrder.find(o => o.payObligatoryID === paymentDt.payObligatoryID && o.contrAccountID === paymentDt.contrAccountID)
        if (payOrder) {
          payOrder.paySum = accrualService.round(payOrder.paySum + paymentDt.paySum, 2)
          payOrder.paymentOrderAccDt.push(...paymentDt.paymentOrderAccDt)
          paymentDt.paymentOrderDt.forEach(payDt => {
            delete payDt['employeeNumberID.description']
            payOrder.paymentOrderDt.push(payDt)
          })
        } else {
          paymentDt.payRollID = execParams.ID
          delete paymentDt['payObligatoryID.orgName']
          delete paymentDt['payObligatoryID.name']
          delete paymentDt['payObligatoryID.contractorID.name']
          delete paymentDt['contrAccountID.organizationID.name']
          delete paymentDt['contrAccountID.description']
          paymentDt.paymentOrderDt.forEach(payDt => {
            delete payDt['employeeNumberID.description']
          })
          paymentOrder.push(paymentDt)
        }
      })
    }
  })
  paymentOrder.forEach(payOrder => {
    payOrder.paymentOrderAccDt = algorithmService.calcGroupSumAccrualPaymentDt(payOrder.paymentOrderAccDt, payOrder.paySum)
    payOrder.paymentOrderDt = JSON.stringify(payOrder.paymentOrderDt)
    payOrder.paymentOrderAccDt = JSON.stringify(payOrder.paymentOrderAccDt)
    paymentOrderStore.run('insert', {
      execParams: payOrder
    })
  })
}

function beforeDelete (ctx) {
  const { execParams } = ctx.mParams
  orderService.beforeDeleteOrder(ctx)
  if (execParams) {
    const store = UB.DataStore('hr_paymentOrder')
    const payRoll = UB.Repository('hr_payRoll').attrs(['organizationID', 'periodCalcID']).selectById(execParams.ID)
    store.execSQL(`DELETE FROM hr_RollRequis WHERE payRollID = :payRollID:`, { payRollID: execParams.ID })
    store.execSQL(`DELETE FROM hr_RollReg WHERE payRollID = :payRollID:`, { payRollID: execParams.ID })
    store.execSQL(`UPDATE hr_payRollDt SET mi_deleteUser = :userID:, mi_deleteDate = :deleteDate: WHERE payRollID = :payRollID:`,
      { payRollID: execParams.ID, deleteDate: new Date(), userID: Session.uData.userID })
    store.execSQL(`DELETE FROM hr_paymentOrderDt WHERE paymentOrderID in (SELECT ID FROM hr_paymentOrder WHERE payRollID = :payRollID:)`,
      { payRollID: execParams.ID })
    store.execSQL(`DELETE FROM hr_paymentOrderAccDt WHERE paymentOrderID in (SELECT ID FROM hr_paymentOrder WHERE payRollID = :payRollID:)`,
      { payRollID: execParams.ID })
    store.execSQL(`DELETE FROM hr_paymentOrder WHERE payRollID = :payRollID:`, { payRollID: execParams.ID })
    paySummaryService.recalcPaymentOrder(payRoll.organizationID, payRoll.periodCalcID)
  }
}

me.getSourceForWithin = function (ctx) {
  const mParams = ctx.mParams
  const orderRegistryIDs = JSON.parse(mParams.orderRegistryIDs)
  const result = {
    dictFundSourceIDs: [],
    dictProgClassIDs: [],
    dictProjectIDs: []
  }
  const accrualDts = orderRegistryIDs.length
    ? UB.Repository('hr_orderRegistryDt').attrs(['accrualDt']).where('orderRegistryID', 'in', orderRegistryIDs).selectAsObject()
    : []
  accrualDts.forEach(accDt => {
    const accrualDt = accDt.accrualDt ? JSON.parse(accDt.accrualDt) : []
    accrualDt.forEach(dt => {
      if (dt.dictFundSourceID && !result.dictFundSourceIDs.includes(dt.dictFundSourceID)) {
        result.dictFundSourceIDs.push(dt.dictFundSourceID)
      }
      if (dt.dictProgClassID && !result.dictProgClassIDs.includes(dt.dictProgClassID)) {
        result.dictProgClassIDs.push(dt.dictProgClassID)
      }
      if (dt.dictProjectID && !result.dictProjectIDs.includes(dt.dictProjectID)) {
        result.dictProjectIDs.push(dt.dictProjectID)
      }
    })
  })
  mParams.resultData = JSON.stringify(result)
}

me.restorePayRoll = function (ctx) {
  const mParams = ctx.mParams
  const store = UB.DataStore('hr_payRoll')
  const storeDt = UB.DataStore('hr_payRollDt')
  store.runSQL(` SELECT * from uba_auditTrail where entity = 'hr_payRollDt' and actionType = 'INSERT' AND
    JSON_VALUE(toValue, '$.payRollID') = :payRollID: 
 `, { payRollID: mParams.payRollID })
  const insertData = store.getAsJsObject()
  const payRollDt = insertData.map(o => o.entityinfo_id)
  insertData.forEach(row => {
    const execParams = JSON.parse(row.toValue)
    execParams.ID = row.entityinfo_id
    storeDt.run('insert', {
      __skipOptimisticLock: true,
      __skipSelectAfterInsert: true,
      __skipRls: true,
      __skipAclRls: true,
      execParams: execParams
    })
  })
  if (payRollDt.length) {
    store.runSQL(` SELECT * from uba_auditTrail where entity = 'hr_payRollDt' and actionType = 'UPDATE' 
      AND entityinfo_id${entityBaseService.getInExpression('payRollDt')}
 `, { payRollDt })
    const updateData = store.getAsJsObject()
    updateData.forEach(row => {
      const execParams = JSON.parse(row.toValue)
      storeDt.run('update', {
        __skipOptimisticLock: true,
        __skipSelectAfterInsert: true,
        __skipRls: true,
        __skipAclRls: true,
        execParams: execParams
      })
    })

    store.runSQL(` SELECT * from uba_auditTrail where entity = 'hr_payRollDt' and actionType = 'DELETE' 
      AND entityinfo_id${entityBaseService.getInExpression('payRollDt')}
 `, { payRollDt })
    const deleteData = store.getAsJsObject()
    deleteData.forEach(row => {
      const execParams = { ID: row.entityinfo_id }
      Session.runAsAdmin(function () {
        storeDt.run('delete', {
          __skipOptimisticLock: true,
          __skipSelectAfterInsert: true,
          __skipRls: true,
          __skipAclRls: true,
          execParams: execParams
        })
      })
    })
  }
}

function setDefaultAttribute (ctx) {
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  const { execParams } = ctx.mParams

  if (!instanceData && !execParams.orderState) {
    execParams.orderState = 'PROJECT'
  }
  if (execParams.orderDate) { execParams.orderDate = dateService.shiftDate(execParams.orderDate) }
  if (!execParams.orderDate && !instanceData.orderDate) {
    const period = UB.Repository('hr_dictPeriod').attrs(['dateFrom', 'description']).selectById(execParams.periodCalcID || instanceData.periodCalcID)
    if (execParams.periodCalcID) {
      execParams.orderDate = dateService.shiftDate(period.dateFrom)
    }
  }
  if ((!execParams.orderNumber && !instanceData.orderNumber) || execParams.orderNumber === null) {
    execParams.orderNumber = orderService.getOrderNum(me.entity.name,
      execParams.orderDate || instanceData.orderDate, execParams.organizationID || instanceData.organizationID)
  }
}

me.doPosting = function (ctx) {
  const accruals = []
  const { execParams } = ctx.mParams
  const order = UB.Repository('hr_payRoll').attrs(['ID', 'periodCalcID', 'periodCalcID.name', 'periodCalcID.isClosed',
    'periodSalaryID.dateFrom', 'periodSalaryID',
    'orderType', 'payElID', 'payElID.methodID.code', 'organizationID', 'orderNumber', 'description']).selectById(execParams.ID)
  const detail = UB.Repository('hr_payRollDt').attrs(['*', 'employeeNumberID.orgID']).where('payRollID', '=', execParams.ID).selectAsObject()
  const depPayEl = UB.Repository('hr_payEl').attrs(['ID']).where('methodID.code', '=', '50').selectSingle()
  const period = periodService.getCurrentPeriod(order.organizationID)
  const paymentOrderStore = UB.DataStore('hr_paymentOrder')
  const paymentOrders = UB.Repository('hr_paymentOrder')
    .attrs(['ID'])
    .where('payRollID', '=', execParams.ID)
    .selectAsObject()
  paymentOrders.forEach(paymentOrder => {
    paymentOrderStore.run('update', {
      __skipOptimisticLock: true,
      __skipSelectAfterUpdate: true,
      __skipRls: true,
      __skipAclRls: true,
      execParams: {
        ID: paymentOrder.ID,
        periodCalcID: period.ID,
        orderState: 'POSTED'
      }
    })
  })
  order['periodSalaryID.dateFrom'] = dateService.shiftDate(order['periodSalaryID.dateFrom'])
  switch (order['payElID.methodID.code']) {
    case '31':
    case '61':
    case '62':
      detail.forEach(row => {
        if (row.periodCalcID !== order.periodCalcID) {
          throw new UB.UBAbort(`<<<${UB.i18n('Період розрахунку !== періоду розрахунку деталі {0}', row.ID)}>>>`)
        }
        if (row.source && ((order.orderType === 'hr_payRollCash' && row.paidSum >= 0) || (order.orderType !== 'hr_payRollCash' && row.paySum >= 0)) &&
          (!['31', '61'].includes(order['payElID.methodID.code']) || period.dateFrom <= dateService.shiftDate(row.periodSalary))
        ) {
          accruals.push({
            orgID: order.organizationID,
            orderID: execParams.ID,
            orderDtID: row.ID,
            periodCalcID: period.ID,
            periodCalc: period.dateFrom,
            periodSalaryID: row.periodSalaryID,
            periodSalary: row.periodSalary,
            employeeNumberID: row.employeeNumberID,
            payElID: order.payElID,
            flagsRec: 2,
            flagsFix: row.flagsFix || 0,
            paySum: order.orderType === 'hr_payRollCash' ? row.paidSum : row.paySum,
            dateFrom: row.dateFrom,
            dateTo: row.dateTo,
            mask: row.mask,
            rate: row.rate,
            baseSum: row.baseSum,
            source: row.source,
            sourceID: row.sourceID,
            incomingDebtSum: row.incomingDebtSum,
            repaymentDebtSum: row.repaymentDebtSum,
            calculatedSum: row.calculatedSum,
            repaymentSum: row.repaymentSum,
            basePayment: row.basePayment,
            accrualDt: row.accrualDt ? JSON.parse(row.accrualDt) : []
          })
          if (order.orderType === 'hr_payRollCash' && row.depSum > 0) {
            if (!depPayEl) {
              throw new UB.UBAbort(`<<<${UB.i18n('Не знайдено вид оплати "Депонент"')}>>>`)
            }
            accruals.push({
              orgID: order.organizationID,
              orderID: execParams.ID,
              orderDtID: row.ID,
              periodCalcID: period.ID,
              periodCalc: period.dateFrom,
              periodSalaryID: row.periodSalaryID,
              periodSalary: row.periodSalary,
              employeeNumberID: row.employeeNumberID,
              payElID: depPayEl.ID,
              flagsRec: 2,
              flagsFix: row.flagsFix,
              paySum: row.depSum,
              dateFrom: row.dateFrom,
              dateTo: row.dateTo,
              mask: row.mask
            })
          }
        }
        const rlAccrual = row.rlAccrual ? JSON.parse(row.rlAccrual) : null
        if (rlAccrual && rlAccrual.flagsRec & 1 << 2) {
          accrualService.deleteAccrual(rlAccrual.ID)
        }
      })
      accrualService.saveAccruals({ accruals, calcBalance: 0, description: UB.i18n(`Проведення Платіжної відомості {0} {1}`, order.orderNumber, order.description) })
      break
    default:
      switch (order.orderType) {
        case 'hr_payRollCash':
          detail.forEach(row => {
            if (row.periodCalcID !== order.periodCalcID) {
              throw new UB.UBAbort(`<<<${UB.i18n('Період розрахунку !== періоду розрахунку деталі {0}', row.ID)}>>>`)
            }
            if (row.paidSum > 0) {
              accruals.push({
                orgID: order.organizationID,
                orderID: execParams.ID,
                orderDtID: row.ID,
                periodCalcID: period.ID,
                periodCalc: period.dateFrom,
                periodSalaryID: row.periodSalaryID,
                periodSalary: row.periodSalary,
                employeeNumberID: row.employeeNumberID,
                payElID: order.payElID,
                flagsRec: 2,
                flagsFix: row.flagsFix,
                paySum: row.paidSum,
                dateFrom: row.dateFrom,
                dateTo: row.dateTo,
                mask: row.mask,
                accrualDt: row.accrualDt ? JSON.parse(row.accrualDt) : []
              })
            }
            if (row.depSum > 0) {
              if (!depPayEl) {
                throw new UB.UBAbort(`<<<${UB.i18n('Не знайдено вид оплати "Депонент"')}>>>`)
              }
              if (row.periodCalc !== order.periodCalcID) {
                throw new UB.UBAbort(`<<<${UB.i18n('Період розрахунку !== періоду розрахунку деталі {0}', row.ID)}>>>`)
              }
              accruals.push({
                orgID: order.organizationID,
                orderID: execParams.ID,
                orderDtID: row.ID,
                periodCalcID: period.ID,
                periodCalc: period.dateFrom,
                periodSalaryID: row.periodSalaryID,
                periodSalary: row.periodSalary,
                employeeNumberID: row.employeeNumberID,
                payElID: depPayEl.ID,
                flagsRec: 2,
                flagsFix: row.flagsFix,
                paySum: row.depSum,
                dateFrom: row.dateFrom,
                dateTo: row.dateTo,
                mask: row.mask
              })
            }
          })
          accrualService.saveAccruals({ accruals, calcBalance: 1, description: UB.i18n(`Проведення Платіжної відомості {0} {1}`, order.orderNumber, order.description) })
          break
        case 'hr_payRollBank':
          detail.forEach(row => {
            if (row.periodCalcID !== order.periodCalcID) {
              throw new UB.UBAbort(`<<<${UB.i18n('Період розрахунку !== періоду розрахунку деталі {0}', row.ID)}>>>`)
            }
            if (row.paySum > 0) {
              accruals.push({
                orgID: order.organizationID,
                orderID: execParams.ID,
                orderDtID: row.ID,
                periodCalcID: order['periodSalaryID.dateFrom'] > period.dateFrom ? order.periodSalaryID : period.ID,
                periodCalc: order['periodSalaryID.dateFrom'] > period.dateFrom ? order['periodSalaryID.dateFrom'] : period.dateFrom,
                periodSalaryID: row.periodSalaryID,
                periodSalary: row.periodSalary,
                employeeNumberID: row.employeeNumberID,
                payElID: order.payElID,
                flagsRec: 2,
                flagsFix: row.flagsFix,
                paySum: row.paySum,
                dateFrom: row.dateFrom,
                dateTo: row.dateTo,
                mask: row.mask,
                accrualDt: row.accrualDt ? JSON.parse(row.accrualDt) : []
              })
            }
          })
          accrualService.saveAccruals({ accruals, calcBalance: 1, description: UB.i18n(`Проведення Платіжної відомості {0} {1}`, order.orderNumber, order.description) })
          break
        case 'hr_payRollPost':
          detail.forEach(row => {
            if (row.periodCalcID !== order.periodCalcID) {
              throw new UB.UBAbort(`<<<${UB.i18n('Період розрахунку !== періоду розрахунку деталі {0}', row.ID)}>>>`)
            }
            accruals.push({
              orgID: order.organizationID,
              orderID: execParams.ID,
              orderDtID: row.ID,
              periodCalcID: period.ID,
              periodCalc: period.dateFrom,
              periodSalaryID: row.periodSalaryID,
              periodSalary: row.periodSalary,
              employeeNumberID: row.employeeNumberID,
              payElID: order.payElID,
              flagsRec: 2,
              flagsFix: row.flagsFix,
              paySum: row.paySum,
              dateFrom: row.dateFrom,
              dateTo: row.dateTo,
              mask: row.mask,
              accrualDt: row.accrualDt ? JSON.parse(row.accrualDt) : []
            })
          })
          accrualService.saveAccruals({ accruals, calcBalance: 1, description: UB.i18n(`Проведення Платіжної відомості {0} {1}`, order.orderNumber, order.description) })
          break
        case 'hr_payRollWithinBank':
          detail.forEach(row => {
            if (row.periodCalcID !== order.periodCalcID) {
              throw new UB.UBAbort(`<<<${UB.i18n('Період розрахунку !== періоду розрахунку деталі {0}', row.ID)}>>>`)
            }
            if (row.paySum > 0) {
              accruals.push({
                orgID: order.organizationID,
                orderID: execParams.ID,
                orderDtID: row.ID,
                sourceID: row.ID,
                source: 4,
                periodCalcID: order['periodSalaryID.dateFrom'] > period.dateFrom ? order.periodSalaryID : period.ID,
                periodCalc: order['periodSalaryID.dateFrom'] > period.dateFrom ? order['periodSalaryID.dateFrom'] : period.dateFrom,
                periodSalaryID: row.periodSalaryID,
                periodSalary: row.periodSalary,
                employeeNumberID: row.employeeNumberID,
                payElID: order.payElID,
                flagsRec: 2,
                flagsFix: row.flagsFix,
                paySum: row.paySum,
                dateFrom: row.dateFrom,
                dateTo: row.dateTo,
                mask: row.mask,
                accrualDt: row.accrualDt ? JSON.parse(row.accrualDt) : []
              })
            }
          })
          accrualService.saveAccruals({ accruals, calcBalance: 1, description: UB.i18n(`Проведення Платіжної відомості {0} {1}`, order.orderNumber, order.description) })
          break
        case 'hr_payFSSBank':
          const orgCurrentPeriods = {}
          detail.forEach(row => {
            if (row.periodCalcID !== order.periodCalcID) {
              throw new UB.UBAbort(`<<<${UB.i18n('Період розрахунку !== періоду розрахунку деталі {0}', row.ID)}>>>`)
            }

            const empOrgID = row['employeeNumberID.orgID'] || order.organizationID
            let periodCalcID = order['periodSalaryID.dateFrom'] > period.dateFrom ? order.periodSalaryID : period.ID
            let periodCalc = order['periodSalaryID.dateFrom'] > period.dateFrom ? order['periodSalaryID.dateFrom'] : period.dateFrom

            if (empOrgID !== order.organizationID && !orgCurrentPeriods[String(empOrgID)]) {
              orgCurrentPeriods[String(empOrgID)] = periodService.getPeriodOnDate(empOrgID, periodCalc)
            }
            accruals.push({
              orgID: empOrgID,
              orderID: execParams.ID,
              orderDtID: row.ID,
              sourceID: row.ID,
              source: 4,
              periodCalcID: empOrgID === order.organizationID ? periodCalcID : orgCurrentPeriods[String(empOrgID)].ID,
              periodCalc: empOrgID === order.organizationID ? periodCalc : orgCurrentPeriods[String(empOrgID)].dateFrom,
              periodSalaryID: empOrgID === order.organizationID ? row.periodSalaryID : periodService.getPeriodOnDate(empOrgID, periodService.getPeriod(row.periodSalaryID).dateFrom).ID,
              periodSalary: row.periodSalary,
              employeeNumberID: row.employeeNumberID,
              payElID: order.payElID,
              flagsRec: 2,
              flagsFix: row.flagsFix,
              paySum: row.paySum,
              dateFrom: row.dateFrom,
              dateTo: row.dateTo,
              mask: row.mask,
              accrualDt: row.accrualDt ? JSON.parse(row.accrualDt) : []
            })
          })
          accrualService.saveAccruals({ accruals, calcBalance: 1, description: UB.i18n(`Проведення Платіжної відомості {0} {1}`, order.orderNumber, order.description) })
          break
        case 'hr_payFSSCash':
          detail.forEach(row => {
            if (row.periodCalcID !== order.periodCalcID) {
              throw new UB.UBAbort(`<<<${UB.i18n('Період розрахунку !== періоду розрахунку деталі {0}', row.ID)}>>>`)
            }
            accruals.push({
              orgID: order.organizationID,
              orderID: execParams.ID,
              orderDtID: row.ID,
              sourceID: row.ID,
              source: 4,
              periodCalcID: period.ID,
              periodCalc: period.dateFrom,
              periodSalaryID: row.periodSalaryID,
              periodSalary: row.periodSalary,
              employeeNumberID: row.employeeNumberID,
              payElID: order.payElID,
              flagsRec: 2,
              flagsFix: row.flagsFix,
              paySum: row.paySum,
              dateFrom: row.dateFrom,
              dateTo: row.dateTo,
              mask: row.mask
            })
          })
          accrualService.saveAccruals({ accruals, calcBalance: 1, description: UB.i18n(`Проведення Платіжної відомості {0} {1}`, order.orderNumber, order.description) })
          break
        case 'hr_payFundSourceBank':
          detail.forEach(row => {
            if (row.periodCalcID !== order.periodCalcID) {
              throw new UB.UBAbort(`<<<${UB.i18n('Період розрахунку !== періоду розрахунку деталі {0}', row.ID)}>>>`)
            }
            if (row.paySum > 0) {
              accruals.push({
                orgID: order.organizationID,
                orderID: execParams.ID,
                orderDtID: row.ID,
                periodCalcID: period.ID,
                periodCalc: period.dateFrom,
                periodSalaryID: row.periodSalaryID,
                periodSalary: row.periodSalary,
                employeeNumberID: row.employeeNumberID,
                payElID: order.payElID,
                flagsRec: 2,
                flagsFix: row.flagsFix,
                paySum: row.paySum,
                dateFrom: row.dateFrom,
                dateTo: row.dateTo,
                mask: row.mask,
                accrualDt: row.accrualDt ? JSON.parse(row.accrualDt) : []
              })
            }
          })
          accrualService.saveAccruals({ accruals, calcBalance: 1, description: UB.i18n(`Проведення Платіжної відомості {0} {1}`, order.orderNumber, order.description) })
          break
      }
  }
  payAccService.exportToAcc(execParams.ID)
}

me.doCancelPosting = function (ctx) {
  const { execParams } = ctx.mParams
  const order = UB.Repository('hr_payRoll')
    .attrs([ 'ID', 'periodEntryID', 'periodEntryID.name', 'periodEntryID.isClosed', 'periodCalcID', 'periodCalcID.name',
      'periodCalcID.isClosed', 'orderType', 'payElID.methodID.code', 'orderNumber', 'description'])
    .selectById(execParams.ID)
  if (order.periodEntryID && order['periodEntryID.isClosed']) {
    throw new UB.UBAbort(`<<<${UB.i18n('Неможливо відмінити проведення платіжної відомості у закритому періоді {0}', order['periodEntryID.name'])}>>>`)
  }
  if (!order.periodEntryID && order['periodCalcID.isClosed']) {
    throw new UB.UBAbort(`<<<${UB.i18n('Неможливо відмінити проведення платіжної відомості у закритому періоді {0}', order['periodCalcID.name'])}>>>`)
  }

  // Функція "Відкликати з бухгалтерії"
  payAccService.cancelExportToAcc(execParams.ID)

  const paymentOrderStore = UB.DataStore('hr_paymentOrder')
  const paymentOrders = UB.Repository('hr_paymentOrder')
    .attrs(['ID'])
    .where('payRollID', '=', execParams.ID)
    .selectAsObject()
  paymentOrders.forEach(paymentOrder => {
    paymentOrderStore.run('update', {
      __skipOptimisticLock: true,
      __skipSelectAfterUpdate: true,
      __skipRls: true,
      __skipAclRls: true,
      execParams: {
        ID: paymentOrder.ID,
        periodCalcID: order.periodCalcID,
        orderState: 'PROJECT'
      }
    })
  })

  switch (order.orderType) {
    case 'hr_payRollCash':
    case 'hr_payRollBank':
    case 'hr_payRollPost':
    case 'hr_payRollWithinBank':
    case 'hr_payRollWithinCash':
    case 'hr_payFSSBank':
    case 'hr_payFSSCash':
    case 'hr_payFundSourceBank':
      accrualService.deleteAccrualsByOrder({ orderID: execParams.ID, calcBalance: ['31', '61', '62'].includes(order['payElID.methodID.code']) ? 0 : 1, description: UB.i18n(`Відміна проведення {0}`, order.description), checkSicknessRequis: false })
      break
  }
  if (['31', '61', '62'].includes(order['payElID.methodID.code'])) {
    const detail = UB.Repository('hr_payRollDt').attrs(['ID', 'rlAccrual']).where('payRollID', '=', execParams.ID).selectAsObject()
    detail.forEach(row => {
      const rlAccrual = row.rlAccrual ? JSON.parse(row.rlAccrual) : null
      if (rlAccrual && rlAccrual.flagsRec & 1 << 2) {
        accrualService.saveAccruals({ accruals: [rlAccrual], checkPeriod: false, description: UB.i18n(`Відміна проведення Платіжної відомості {0} {1}`, order.orderNumber, order.description) })
      }
    })
  }

  const store = UB.DataStore('hr_payRoll')
  store.execSQL(` UPDATE hr_payRoll set periodEntryID = null WHERE ID = :ID: 
    `, { ID: execParams.ID })
}

me.getOrderNum = function (ctx) {
  const { mParams } = ctx
  mParams.orderNumber = orderService.getOrderNum(__entityName, mParams.onDate, mParams.organizationID)
}

me.calcPayRollCash = function (ctx) {
  const { mParams } = ctx
  const params = JSON.parse(mParams.params)
  const store = UB.DataStore('hr_employeeNumber')
  const payEl = UB.Repository('hr_payEl').attrs(['code', 'methodID.code']).selectById(params.payElID)
  const period = periodService.getPeriod(params.periodSalaryID)
  const sqlDialect = entityBaseService.getSQLDialect()
  let employeeNumberSQL = ''
  switch (payEl['methodID.code']) {
    case '31':
    case '61':
    case '62':
      employeeNumberSQL = `
        SELECT
          en.ID AS "employeeNumberID",
          en.description, 
          en.payOutID "payOutID",
          en.dateTo AS "employeeNumberDateTo",
          pr.ID AS "payRetentionID",
          pr.paymentMethod AS "payRetentionMethod",
          ac.description AS "contractor",
          null AS "employeePayOutID",
          (select ${sqlDialect.top} pos.name from hr_employeePosition ep join hr_position pos on pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' and pos.mi_deleteDate >= '9999-12-31' and pos.mi_dateFrom <= en.dateTo and pos.mi_dateTo >= en.dateFrom and ep.dateFrom <= :dateTo: where ep.employeeNumberID = en.ID and ep.isActive = 1 and ep.dateFrom <= en.dateTo and ep.dateTo >= en.dateFrom order by ep.dateFrom desc ${sqlDialect.limit}) AS "posName",  
          (select ${sqlDialect.top} dep.name from hr_employeePosition ep join hr_department dep on dep.mi_data_id = ep.departmentID and dep.state = 'ACTIVE'  and dep.mi_deleteDate >= '9999-12-31' and dep.mi_dateFrom <= en.dateTo and dep.mi_dateTo >= en.dateFrom and ep.dateFrom <= :dateTo: where ep.employeeNumberID = en.ID and ep.isActive = 1 and ep.dateFrom <= en.dateTo and ep.dateTo >= en.dateFrom order by ep.dateFrom desc ${sqlDialect.limit}) AS "depName"
        FROM hr_employeeNumber en
        JOIN hr_payRetention pr ON pr.employeeNumberID = en.ID AND pr.dateFrom <= :dateTo: AND pr.dateTo >= :dateFrom: AND pr.mi_deleteDate >= '9999-12-31' and pr.payElID = :payElID: AND pr.paymentMethod = '2'
        LEFT JOIN ac_contractor ac on ac.ID = pr.contractorID and ac.mi_deleteDate >= '9999-12-31'
        WHERE
      `
      break
    default:
      employeeNumberSQL = `
         SELECT
           en.ID as "employeeNumberID",
           en.description,
           en.dateTo as "employeeNumberDateTo",
           (select ${sqlDialect.top} pos.name from hr_employeePosition ep join hr_position pos on pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' and pos.mi_deleteDate >= '9999-12-31' and pos.mi_dateFrom <= en.dateTo and pos.mi_dateTo >= en.dateFrom where ep.employeeNumberID = en.ID and ep.isActive = 1 and ep.dateFrom <= en.dateTo and ep.dateTo >= en.dateFrom and ep.dateFrom <= :dateTo: order by ep.dateFrom desc ${sqlDialect.limit}) AS "posName",  
           (select ${sqlDialect.top} dep.name from hr_employeePosition ep join hr_department dep on dep.mi_data_id = ep.departmentID and dep.state = 'ACTIVE'  and dep.mi_deleteDate >= '9999-12-31' and dep.mi_dateFrom <= en.dateTo and dep.mi_dateTo >= en.dateFrom where ep.employeeNumberID = en.ID and ep.isActive = 1 and ep.dateFrom <= en.dateTo and ep.dateTo >= en.dateFrom and ep.dateFrom <= :dateTo: order by ep.dateFrom desc ${sqlDialect.limit}) AS "depName",
           (select ${sqlDialect.top} pr.ID from hr_payRetention pr where pr.employeeNumberID = en.ID and pr.payElID = :payElID: and pr.dateFrom <= :dateTo: and pr.dateTo >= :dateFrom: and pr.mi_deleteDate >= '9999-12-31' order by pr.dateFrom desc ${sqlDialect.limit}) AS "payRetentionID",
           (select ${sqlDialect.top} pr.paymentMethod from hr_payRetention pr where pr.employeeNumberID = en.ID and pr.payElID = :payElID: and pr.dateFrom <= :dateTo: and pr.dateTo >= :dateFrom: and pr.mi_deleteDate >= '9999-12-31' order by pr.dateFrom desc ${sqlDialect.limit}) AS "payRetentionMethod",
           (select ${sqlDialect.top} po.ID from hr_employeePayOut po where po.employeeNumberID = en.ID and (po.paymentMethod = '2' OR po.paymentMethod = '4') and po.dateFrom <= :dateTo: and po.dateTo >= :dateFrom: and po.mi_deleteDate >= '9999-12-31' order by po.isDefault DESC, po.dateFrom DESC ${sqlDialect.limit}) AS "employeePayOutID",
           (select ${sqlDialect.top} po.paymentMethod from hr_employeePayOut po where po.employeeNumberID = en.ID and (po.paymentMethod = '2' OR po.paymentMethod = '4') and po.dateFrom <= :dateTo: and po.dateTo >= :dateFrom: and po.mi_deleteDate >= '9999-12-31' order by po.isDefault DESC, po.dateFrom DESC ${sqlDialect.limit}) AS "employeePayOutMethod"
         FROM hr_employeeNumber en
         WHERE 
      `
  }
  if (params.reloadEmployee) {
    params.accruals = []
    store.runSQL(`${employeeNumberSQL}
    en.orgID = :orgID: AND en.dateFrom <= :dateTo: AND en.dateTo >= :dateFromPrior: AND en.mi_deleteDate= '9999-12-31'
    ${params.depID ? ` AND :depID: = (select ${sqlDialect.top} dep.mi_data_id from hr_employeePosition ep join hr_department dep on dep.mi_data_id = ep.departmentID and dep.state = 'ACTIVE'  and dep.mi_deleteDate >= '9999-12-31' and dep.mi_dateFrom <= en.dateTo and dep.mi_dateTo >= en.dateFrom where ep.employeeNumberID = en.ID and ep.isActive = 1 and ep.dateFrom <= :dateTo: and ep.dateTo >= :dateFrom: order by ep.dateFrom desc ${sqlDialect.limit})` : ''}
     ${!App.domainInfo.isEntityMethodsAccessible('hr_employeeNumber', 'employeeLimitedAccess') ? ' AND en.limitedAccess = 0' : ''}
     ORDER BY en.tabNumSort`,
    {
      orgID: params.orgID,
      dateFromPrior: dateService.addMonths(period.dateFrom, -12),
      dateFrom: period.dateFrom,
      dateTo: period.dateTo,
      depID: params.depID || 0,
      payElID: params.payElID,
      orderDate: params.orderDate
    })

    const data = store.getAsJsObject()
    store.freeNative()
    data.forEach(row => {
      row['employeeNumberID.description'] = row.description
      row['payRetentionID.contrAccountID.organizationID.description'] = row.contractor
      delete row.description
      delete row.contractor
      row.periodSalaryID = params.periodSalaryID
      row.periodCalcID = params.periodCalcID
      if (row.payRetentionMethod) {
        row.employeePayOutID = null
        row.employeePayOutMethod = null
      }
      if (row.payRetentionMethod === '2' || row.employeePayOutMethod === '2') {
        params.accruals.push(row)
      }
    })
  } else {
    const employeeNumbers = params.accruals.filter(o => !(o.payRetentionID || o.employeePayOutID))
    if (employeeNumbers.length) {
      store.runSQL(`${employeeNumberSQL} en.ID${entityBaseService.getInExpression('employeeNumbers')}
      ${!App.domainInfo.isEntityMethodsAccessible('hr_employeeNumber', 'employeeLimitedAccess') ? ' AND en.limitedAccess = 0' : ''}
       ORDER BY en.tabNumSort`,
      {
        employeeNumbers: employeeNumbers.map(o => o.employeeNumberID)
      })
      const data = store.getAsJsObject()
      store.freeNative()
      data.forEach(row => {
        row['employeeNumberID.description'] = row.description
        row['payRetentionID.contrAccountID.organizationID.description'] = row.contractor
        delete row.description
        delete row.contractor
        const accrual = employeeNumbers.find(o => o.employeeNumberID === row.employeeNumberID)
        accrual.periodSalaryID = params.periodSalaryID
        accrual.periodCalcID = params.periodCalcID
        // if (row.payRetentionID || row.employeePayOutID) {
        if (accrual) {
          if (row.payRetentionID) {
            accrual.payRetentionID = row.payRetentionID
          } else {
            accrual.employeePayOutID = row.employeePayOutID
          }
        }
        // }
      })
    }
  }
  const resultData = rlService.calculateOrderAccrual(params)
  if (params.reloadEmployee && resultData.accruals) {
    for (let i = resultData.accruals.length - 1; i >= 0; i--) {
      if (resultData.accruals[i].employeeNumberDateTo && resultData.accruals[i].paySum === 0 && period.dateFrom > dateService.shiftDate(resultData.accruals[i].employeeNumberDateTo)) {
        resultData.accruals.splice(i, 1)
      }
    }
  }
  mParams.resultData = JSON.stringify(resultData)
}

me.calcPayRollBank = function (ctx) {
  const { mParams } = ctx
  const params = JSON.parse(mParams.params)
  const store = UB.DataStore('hr_employeeNumber')
  const payEl = UB.Repository('hr_payEl').attrs(['code', 'methodID.code', 'excludePartTimeEmp', 'hiredThisMonth', 'includeSecondJobs']).selectById(params.payElID)
  const workPlaces = UB.Repository('hr_payElWorkPlace').attrs(['workPlace']).where('payElID', '=', params.payElID).selectAsObject().map(o => o.workPlace)
  const payOut = payRollService.getPayOutList(params.orgID, ['ID', 'name', 'isDefault', 'organizationID'], {})
  const payOutDef = payOut.find(o => o.isDefault && o.organizationID === params.orgID) || payOut.find(o => o.isDefault)
  const deptIDs = accrualService.getDepIDs(params)
  const sqlDialect = entityBaseService.getSQLDialect()
  const payOutIsDefault = (payOutDef && params.payOutID && payOutDef === params.payOutID)

  entityBaseService.initEntityJsonData(mParams.instanceID)
  let employeeNumberSQL = ''
  switch (payEl['methodID.code']) {
    case '31':
    case '61':
    case '62':
      employeeNumberSQL = `
        SELECT
          en.ID AS "employeeNumberID",
          en.description, 
          en.payOutID "payOutID",
          pout.name "payOutName",
          en.dateTo AS "employeeNumberDateTo",
          pr.ID AS "payRetentionID",
          pr.paymentMethod AS "payRetentionMethod",
          ac.description AS "contractor",
          pr.payOutID AS "payRetentionPayOutID",
          po.name AS "payRetentionPayOutName",
          (select ${sqlDialect.top} po.ID from hr_employeePayOut po where po.employeeNumberID = en.ID and (po.paymentMethod = :paymentMethod: OR po.paymentMethod = '4') and po.dateFrom <= :dateTo: and po.dateTo >= :dateFrom: and po.mi_deleteDate >= '9999-12-31' order by po.isDefault DESC, po.dateFrom DESC ${sqlDialect.limit}) AS "employeePayOutID",
          (select ${sqlDialect.top} po.paymentMethod from hr_employeePayOut po where po.employeeNumberID = en.ID and (po.paymentMethod = :paymentMethod: OR po.paymentMethod = '4') and po.dateFrom <= :dateTo: and po.dateTo >= :dateFrom: and po.mi_deleteDate >= '9999-12-31' order by po.isDefault DESC, po.dateFrom DESC ${sqlDialect.limit}) AS "employeePayOutMethod",
          (select ${sqlDialect.top} po.payOutID from hr_employeePayOut po where po.employeeNumberID = en.ID and (po.paymentMethod = :paymentMethod: OR po.paymentMethod = '4') and po.dateFrom <= :dateTo: and po.dateTo >= :dateFrom: and po.mi_deleteDate >= '9999-12-31' order by po.isDefault DESC, po.dateFrom DESC ${sqlDialect.limit}) AS "employeePayOutPayOutID",
          (select ${sqlDialect.top} pou.name from hr_employeePayOut po JOIN hr_payOut pou ON pou.ID = po.payOutID where po.employeeNumberID = en.ID and (po.paymentMethod = :paymentMethod: OR po.paymentMethod = '4') and po.dateFrom <= :dateTo: and po.dateTo >= :dateFrom: and po.mi_deleteDate >= '9999-12-31' and pou.mi_deleteDate >= '9999-12-31' order by po.isDefault DESC, po.dateFrom DESC ${sqlDialect.limit}) AS "employeePayOutPayOutName",
          (select ${sqlDialect.top} pos.name from hr_employeePosition ep join hr_position pos on pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' and pos.mi_deleteDate >= '9999-12-31' and pos.mi_dateFrom <= en.dateTo and pos.mi_dateTo >= en.dateFrom where ep.employeeNumberID = en.ID and ep.isActive = 1 and ep.dateFrom <= en.dateTo and ep.dateTo >= en.dateFrom and ep.dateFrom <= :dateTo: and ep.mi_deleteDate >= '9999-12-31' order by ep.dateFrom desc ${sqlDialect.limit}) AS "posName",  
          (select ${sqlDialect.top} dep.name from hr_employeePosition ep join hr_department dep on dep.mi_data_id = ep.departmentID and dep.state = 'ACTIVE'  and dep.mi_deleteDate >= '9999-12-31' and dep.mi_dateFrom <= en.dateTo and dep.mi_dateTo >= en.dateFrom where ep.employeeNumberID = en.ID and ep.isActive = 1 and ep.dateFrom <= en.dateTo and ep.dateTo >= en.dateFrom and ep.dateFrom <= :dateTo: and ep.mi_deleteDate >= '9999-12-31' order by ep.dateFrom desc ${sqlDialect.limit}) AS "depName"
        FROM hr_employeeNumber en
        LEFT JOIN hr_payOut pout ON pout.ID = en.payOutID
        JOIN hr_payRetention pr ON pr.employeeNumberID = en.ID AND pr.dateFrom <= :dateTo: AND pr.dateTo >= :dateFrom: AND pr.mi_deleteDate >= '9999-12-31' and pr.payElID = :payElID: AND pr.paymentMethod = '1'
        LEFT JOIN hr_payOut po ON po.ID = pr.payOutID
        LEFT JOIN ac_contrAccount ca ON ca.ID = pr.contrAccountID and ca.mi_deleteDate >= '9999-12-31'
        LEFT JOIN ac_contractor ac on ac.ID = ca.organizationID and ac.mi_deleteDate >= '9999-12-31'
        WHERE
      `
      break
    default:
      employeeNumberSQL = `
        SELECT
          en.ID as "employeeNumberID",
          en.description,
          en.payOutID "payOutID", 
          pout.name "payOutName",
          en.dateTo as "employeeNumberDateTo",
          (select ${sqlDialect.top} pos.name from hr_employeePosition ep join hr_position pos on pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' and pos.mi_deleteDate >= '9999-12-31' and pos.mi_dateFrom <= en.dateTo and pos.mi_dateTo >= en.dateFrom where ep.employeeNumberID = en.ID and ep.isActive = 1 and ep.dateFrom <= en.dateTo and ep.dateTo >= en.dateFrom and ep.dateFrom <= :dateTo: and ep.mi_deleteDate >= '9999-12-31' order by ep.dateFrom desc ${sqlDialect.limit}) AS "posName",  
          (select ${sqlDialect.top} dep.name from hr_employeePosition ep join hr_department dep on dep.mi_data_id = ep.departmentID  and dep.state = 'ACTIVE'  and dep.mi_deleteDate >= '9999-12-31' and dep.mi_dateFrom <= en.dateTo and dep.mi_dateTo >= en.dateFrom where ep.employeeNumberID = en.ID and ep.isActive = 1 and ep.dateFrom <= en.dateTo and ep.dateTo >= en.dateFrom and ep.dateFrom <= :dateTo: and ep.mi_deleteDate >= '9999-12-31' order by ep.dateFrom desc ${sqlDialect.limit}) AS "depName",
          (select ${sqlDialect.top} pr.ID from hr_payRetention pr where pr.employeeNumberID = en.ID and pr.payElID = :payElID: and pr.dateFrom <= :dateTo: and pr.dateTo >= :dateFrom: and pr.mi_deleteDate >= '9999-12-31' order by pr.dateFrom desc ${sqlDialect.limit}) AS "payRetentionID",
          (select ${sqlDialect.top} pr.paymentMethod from hr_payRetention pr where pr.employeeNumberID = en.ID and pr.payElID = :payElID: and pr.dateFrom <= :dateTo: and pr.dateTo >= :dateFrom: and pr.mi_deleteDate >= '9999-12-31' order by pr.dateFrom desc ${sqlDialect.limit}) AS "payRetentionMethod",
          (select ${sqlDialect.top} pr.payOutID from hr_payRetention pr where pr.employeeNumberID = en.ID and pr.payElID = :payElID: and pr.dateFrom <= :dateTo: and pr.dateTo >= :dateFrom: and pr.mi_deleteDate >= '9999-12-31' order by pr.dateFrom desc ${sqlDialect.limit}) AS "payRetentionPayOutID",
          (select ${sqlDialect.top} pou.name from hr_payRetention pr JOIN hr_payOut pou ON pou.ID = pr.payOutID  where pr.employeeNumberID = en.ID and pr.payElID = :payElID: and pr.dateFrom <= :dateTo: and pr.dateTo >= :dateFrom: and pr.mi_deleteDate >= '9999-12-31' and pou.mi_deleteDate >= '9999-12-31' order by pr.dateFrom desc ${sqlDialect.limit}) AS "payRetentionPayOutName",
          (select ${sqlDialect.top} po.ID from hr_employeePayOut po where po.employeeNumberID = en.ID and (po.paymentMethod = :paymentMethod: OR po.paymentMethod = '4') and po.dateFrom <= :dateTo: and po.dateTo >= :dateFrom: and po.mi_deleteDate >= '9999-12-31' order by po.isDefault DESC, po.dateFrom DESC ${sqlDialect.limit}) AS "employeePayOutID",
          (select ${sqlDialect.top} po.paymentMethod from hr_employeePayOut po where po.employeeNumberID = en.ID and (po.paymentMethod = :paymentMethod: OR po.paymentMethod = '4') and po.dateFrom <= :dateTo: and po.dateTo >= :dateFrom: and po.mi_deleteDate >= '9999-12-31' order by po.isDefault DESC, po.dateFrom DESC ${sqlDialect.limit}) AS "employeePayOutMethod",
          (select ${sqlDialect.top} po.payOutID from hr_employeePayOut po where po.employeeNumberID = en.ID and (po.paymentMethod = :paymentMethod: OR po.paymentMethod = '4') and po.dateFrom <= :dateTo: and po.dateTo >= :dateFrom: and po.mi_deleteDate >= '9999-12-31' order by po.isDefault DESC, po.dateFrom DESC ${sqlDialect.limit}) AS "employeePayOutPayOutID",
          (select ${sqlDialect.top} pou.name from hr_employeePayOut po JOIN hr_payOut pou ON pou.ID = po.payOutID where po.employeeNumberID = en.ID and (po.paymentMethod = :paymentMethod: OR po.paymentMethod = '4') and po.dateFrom <= :dateTo: and po.dateTo >= :dateFrom: and po.mi_deleteDate >= '9999-12-31' and pou.mi_deleteDate >= '9999-12-31' order by po.isDefault DESC, po.dateFrom DESC ${sqlDialect.limit}) AS "employeePayOutPayOutName"
        FROM hr_employeeNumber en
        LEFT JOIN hr_payOut pout ON pout.ID = en.payOutID and pout.mi_deleteDate >= '9999-12-31' 
        WHERE
      `
  }
  const period = periodService.getPeriod(params.periodSalaryID)
  const priorMonth = dateService.addMonths(period.dateFrom, -1)
  if (params.reloadEmployee) {
    store.runSQL(`${employeeNumberSQL}
    en.orgID = :orgID: AND en.dateFrom <= :dateTo: AND en.dateTo >= :dateFromPrior: AND en.mi_deleteDate= '9999-12-31'
     ${deptIDs ? ` AND EXISTS (select ${sqlDialect.top} ep.departmentID from hr_employeePosition ep where ep.employeeNumberID = en.ID and ep.isActive = 1 and 
     ((ep.dateFrom <= :dateTo: and ep.dateTo >= :dateFrom:) OR (ep.dateTo = en.dateTo AND ep.dateTo < :dateFrom:)) and ep.mi_deleteDate >= '9999-12-31' and ep.departmentID${entityBaseService.getInExpression('deptIDs')}
     order by ep.dateFrom desc ${sqlDialect.limit})` : ''}
    ${workPlaces.length ? ` AND EXISTS ( select ep.ID from hr_employeePosition ep where ep.employeeNumberID = en.ID AND ep.workPlace${entityBaseService.getInExpression('workPlaces')}
     and ep.dateFrom <= :dateTo: and ep.dateTo >= :dateFrom: and ep.isActive = 1 and ep.mi_deleteDate >= '9999-12-31' )` : ` `}
    ${payEl.excludePartTimeEmp ? ` AND NOT EXISTS ( select ep.ID from hr_employeePosition ep where ep.employeeNumberID = en.ID AND ep.mtCount < 1 and ep.dateFrom <= :dateTo: and ep.dateTo >= :dateFrom: and ep.isActive = 1 and ep.mi_deleteDate >= '9999-12-31' )` : ``}
    ${payEl.includeSecondJobs ? ` AND NOT EXISTS ( select ep.ID from hr_employeePosition ep where ep.employeeNumberID = en.ID AND ep.workPlace = '2' and ep.dateFrom <= :dateTo: and ep.dateTo >= :dateFrom: and ep.isActive = 1 and ep.mi_deleteDate >= '9999-12-31' )` : ``}
    ${payEl.hiredThisMonth ? ` AND en.dateFrom < :dateFrom: ` : ``}
    ${!App.domainInfo.isEntityMethodsAccessible('hr_employeeNumber', 'employeeLimitedAccess') ? ' AND en.limitedAccess = 0' : ''}
        ORDER BY en.tabNumSort`,
    {
      orgID: params.orgID,
      dateFromPrior: dateService.addMonths(period.dateFrom, -12),
      orderDate: params.orderDate,
      dateFrom: period.dateFrom,
      dateTo: period.dateTo,
      depID: params.depID || 0,
      payOutID: params.payOutID || 0,
      payElID: params.payElID,
      paymentMethod: params.paymentMethod,
      workPlaces,
      deptIDs
    })
    const data = store.getAsJsObject()
    store.freeNative()
    data.forEach(row => {
      row.periodSalaryID = params.periodSalaryID
      row.periodCalcID = params.periodCalcID
      if (row.payRetentionMethod) {
        row.employeePayOutID = null
        row.employeePayOutMethod = null
        row.paymentMethod = row.payRetentionMethod
        if (row.payRetentionPayOutName) {
          row['payRetentionID.payOutID.name'] = row.payRetentionPayOutName
          row.payOutID = null
        } else if (row.employeePayOutPayOutID) {
          row.payOutID = row.employeePayOutPayOutID
          row['payOutID.name'] = row.employeePayOutPayOutName
        } else if (row.payOutID) {
          row['payOutID.name'] = row.payOutName
        } else if (payOutDef) {
          row.payOutID = payOutDef.ID
          row['payOutID.name'] = payOutDef.name
        }
      } else if (row.employeePayOutMethod) {
        row.paymentMethod = params.paymentMethod
        if (row.employeePayOutPayOutName) {
          row['employeePayOutID.payOutID.name'] = row.employeePayOutPayOutName
          row.payOutID = null
        } else if (row.payOutID) {
          row['payOutID.name'] = row.payOutName
        } else if (payOutDef) {
          row.payOutID = payOutDef.ID
          row['payOutID.name'] = payOutDef.name
        }
      } else if (row.payOutID) {
        row['payOutID.name'] = row.payOutName
      } else if (payOutDef) {
        row.payOutID = payOutDef.ID
        row['payOutID.name'] = payOutDef.name
      }
      if ((params.payOutID &&
          ((payOutIsDefault && ((row.payOutID === params.payOutID || row.payRetentionPayOutID === params.payOutID || row.employeePayOutPayOutID === params.payOutID) ||
            (!row.payOutID && !row.employeePayOutID && !row.payRetentionID))) ||
            (!payOutIsDefault && (row.payOutID === params.payOutID || row.payRetentionPayOutID === params.payOutID || row.employeePayOutPayOutID === params.payOutID)))) ||
        (!params.payOutID &&
          ((payOutDef && ((!row.payOutID && !row.employeePayOutID && !row.payRetentionID) || ['1', '4'].includes(row.payRetentionMethod) ||
            row.employeePayOutMethod === '1' || row.payOutID)) || (!payOutDef && (['1', '4'].includes(row.payRetentionMethod) || row.employeePayOutMethod === '1' || row.payOutID))))) {
        params.accruals.push(row)
      } else {
        if (!payOutDef && !row.payRetentionMethod && !row.employeePayOutMethod && !row.payOutID && dateService.shiftDate(row.employeeNumberDateTo) >= priorMonth) {
          params.employeeOut.push(row.description)
        }
      }
      row['employeeNumberID.description'] = row.description
      row['employeeNumberID.dateTo'] = row.employeeNumberDateTo
      row['payRetentionID.contrAccountID.organizationID.description'] = row.contractor
      delete row.description
      delete row.employeeNumberDateTo
      delete row.contractor
    })
  } else {
    const employeeNumbers = params.accruals.filter(o => o.employeeNumberID || !(o.payRetentionID || o.employeePayOutID || o.payOutID))
    if (employeeNumbers.length) {
      store.runSQL(`${employeeNumberSQL} en.ID${entityBaseService.getInExpression('employeeNumbers')}
       ${!App.domainInfo.isEntityMethodsAccessible('hr_employeeNumber', 'employeeLimitedAccess') ? ' AND en.limitedAccess = 0' : ''}
       ORDER BY en.tabNumSort`,
      {
        orderDate: params.orderDate,
        dateFrom: period.dateFrom,
        dateTo: period.dateTo,
        depID: params.depID || 0,
        payOutID: params.payOutID || 0,
        payElID: params.payElID,
        employeeNumbers: employeeNumbers.map(o => o.employeeNumberID),
        paymentMethod: params.paymentMethod
      })
      const data = store.getAsJsObject()
      store.freeNative()
      data.forEach(row => {
        row['employeeNumberID.description'] = row.description
        row['employeeNumberID.dateTo'] = row.employeeNumberDateTo
        row['payRetentionID.contrAccountID.organizationID.description'] = row.contractor
        delete row.description
        delete row.employeeNumberDateTo
        delete row.contractor
        const accrual = employeeNumbers.find(o => o.employeeNumberID === row.employeeNumberID)
        if (accrual) {
          accrual.periodSalaryID = params.periodSalaryID
          accrual.periodCalcID = params.periodCalcID
          if (!(accrual.flagsFix & 1 << 22)) {
            if (row.payRetentionID) {
              accrual.paymentMethod = row.payRetentionMethod
              accrual.payRetentionID = row.payRetentionID
              if (row.payRetentionPayOutName) {
                accrual['payRetentionID.payOutID.name'] = row.payRetentionPayOutName
              } else if (row.employeePayOutPayOutID) {
                accrual.payOutID = row.employeePayOutPayOutID
                accrual['payOutID.name'] = row.employeePayOutPayOutName
              } else if (row.payOutID) {
                accrual.payOutID = row.payOutID
                accrual['payOutID.name'] = row.payOutName
              } else if (payOutDef) {
                accrual.payOutID = payOutDef.ID
                accrual['payOutID.name'] = payOutDef.name
              }
            } else {
              accrual.paymentMethod = params.paymentMethod
              if (row.employeePayOutID) {
                accrual.employeePayOutID = row.employeePayOutID
                if (row.employeePayOutPayOutName) {
                  accrual['employeePayOutID.payOutID.name'] = row.employeePayOutPayOutName
                } else if (row.payOutID) {
                  accrual.payOutID = row.payOutID
                  accrual['payOutID.name'] = row.payOutName
                } else if (payOutDef) {
                  accrual.payOutID = payOutDef.ID
                  accrual['payOutID.name'] = payOutDef.name
                }
              } else if (row.payOutID) {
                accrual.payOutID = row.payOutID
                accrual['payOutID.name'] = row.payOutName
              } else if (payOutDef) {
                accrual.payOutID = payOutDef.ID
                accrual['payOutID.name'] = payOutDef.name
              }
            }
          }
        }
      })
    }
  }
  const resultData = rlService.calculateOrderAccrual(params)
  if (params.reloadEmployee && resultData.accruals) {
    for (let i = resultData.accruals.length - 1; i >= 0; i--) {
      if (resultData.accruals[i].employeeNumberDateTo && resultData.accruals[i].paySum === 0 && period.dateFrom > dateService.shiftDate(resultData.accruals[i].employeeNumberDateTo)) {
        resultData.accruals.splice(i, 1)
      }
    }
  }
  mParams.resultData = JSON.stringify(resultData)
  entityBaseService.writeEntityJsonData(mParams.instanceID, mParams.resultData)
}

me.calcPayRollPost = function (ctx) {
  const { mParams } = ctx
  const params = JSON.parse(mParams.params)
  const store = UB.DataStore('hr_employeeNumber')
  const period = periodService.getPeriod(params.periodSalaryID)
  const payEl = UB.Repository('hr_payEl').attrs(['code', 'methodID.code']).selectById(params.payElID)
  const sqlDialect = entityBaseService.getSQLDialect()
  let employeeNumberSQL = ''
  switch (payEl['methodID.code']) {
    case '31':
      employeeNumberSQL = `
         SELECT
          en.ID AS "employeeNumberID",
          en.description, 
          en.payOutID "payOutID",
          en.dateTo AS "employeeNumberDateTo",
          pr.ID AS "payRetentionID",
          pr.paymentMethod AS "payRetentionMethod",
          ac.description AS contractor,
          null AS "employeePayOutID",
          (select ${sqlDialect.top} pos.name from hr_employeePosition ep join hr_position pos on pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' and pos.mi_deleteDate >= '9999-12-31' and pos.mi_dateFrom <= en.dateTo and pos.mi_dateTo >= en.dateFrom where ep.employeeNumberID = en.ID and ep.isActive = 1 and ep.dateFrom <= en.dateTo and ep.dateTo >= en.dateFrom and ep.dateFrom <= :dateTo: and ep.mi_deleteDate >= '9999-12-31' order by ep.dateFrom desc ${sqlDialect.limit}) AS "posName",  
          (select ${sqlDialect.top} dep.name from hr_employeePosition ep join hr_department dep on dep.mi_data_id = ep.departmentID and dep.state = 'ACTIVE'  and dep.mi_deleteDate >= '9999-12-31' and dep.mi_dateFrom <= en.dateTo and dep.mi_dateTo >= en.dateFrom where ep.employeeNumberID = en.ID and ep.isActive = 1 and ep.dateFrom <= en.dateTo and ep.dateTo >= en.dateFrom and ep.dateFrom <= :dateTo: and ep.mi_deleteDate >= '9999-12-31' order by ep.dateFrom desc ${sqlDialect.limit}) AS "depName"
        FROM hr_employeeNumber en
        JOIN hr_payRetention pr ON pr.employeeNumberID = en.ID AND pr.dateFrom <= :dateTo: AND pr.dateTo >= :dateFrom: AND pr.mi_deleteDate >= '9999-12-31' and pr.payElID = :payElID: AND pr.paymentMethod = '3'
        LEFT JOIN ac_contractor ac on ac.ID = pr.contractorID and ac.mi_deleteDate >= '9999-12-31'
        WHERE
      `
      break
    default:
      employeeNumberSQL = `
         SELECT
           en.ID as "employeeNumberID",
           en.description,
           en.dateTo as "employeeNumberDateTo",
           (select ${sqlDialect.top} pos.name from hr_employeePosition ep join hr_position pos on pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' and pos.mi_deleteDate >= '9999-12-31' and pos.mi_dateFrom <= en.dateTo and pos.mi_dateTo >= en.dateFrom where ep.employeeNumberID = en.ID and ep.isActive = 1 and ep.dateFrom <= en.dateTo and ep.dateTo >= en.dateFrom and ep.dateFrom <= :dateTo: and ep.mi_deleteDate >= '9999-12-31' order by ep.dateFrom desc ${sqlDialect.limit}) AS "posName",  
           (select ${sqlDialect.top} dep.name from hr_employeePosition ep join hr_department dep on dep.mi_data_id = ep.departmentID and dep.state = 'ACTIVE'  and dep.mi_deleteDate >= '9999-12-31' and dep.mi_dateFrom <= en.dateTo and dep.mi_dateTo >= en.dateFrom where ep.employeeNumberID = en.ID and ep.isActive = 1 and ep.dateFrom <= en.dateTo and ep.dateTo >= en.dateFrom and ep.dateFrom <= :dateTo: and ep.mi_deleteDate >= '9999-12-31' order by ep.dateFrom desc ${sqlDialect.limit}) AS "depName",
           (select ${sqlDialect.top} pr.ID from hr_payRetention pr where pr.employeeNumberID = en.ID and pr.dateFrom <= :dateTo: and pr.dateTo >= :dateFrom: and pr.mi_deleteDate >= '9999-12-31' AND pr.paymentMethod = '3' ${sqlDialect.limit}) AS "payRetentionID",
           (select ${sqlDialect.top} po.ID from hr_employeePayOut po where po.employeeNumberID = en.ID and (po.paymentMethod = '3' OR po.paymentMethod = '4') and po.dateFrom <= :dateTo: and po.dateTo >= :dateFrom: and po.mi_deleteDate >= '9999-12-31' AND po.paymentMethod = '3' order by po.isDefault DESC, po.dateFrom DESC  ${sqlDialect.limit}) AS "employeePayOutID"
           FROM hr_employeeNumber en WHERE
      `
  }
  if (params.reloadEmployee) {
    params.accruals = []
    store.runSQL(`${employeeNumberSQL}
    en.orgID = :orgID: AND en.dateFrom <= :dateTo: AND en.dateTo >= :dateFromPrior: AND en.mi_deleteDate= '9999-12-31'
    ${params.depID ? ` AND :depID: = (select ${sqlDialect.top} dep.mi_data_id from hr_employeePosition ep join hr_department dep on dep.mi_data_id = ep.departmentID and dep.state = 'ACTIVE'  and dep.mi_deleteDate >= '9999-12-31' and dep.mi_dateFrom <= :dateTo: and dep.mi_dateTo >= :dateFrom: where ep.employeeNumberID = en.ID and ep.isActive = 1 and ep.dateFrom <= en.dateTo and ep.dateTo >= en.dateFrom order by ep.dateFrom desc ${sqlDialect.limit})` : ''}
     ${!App.domainInfo.isEntityMethodsAccessible('hr_employeeNumber', 'employeeLimitedAccess') ? ' AND en.limitedAccess = 0' : ''}
    ORDER BY en.tabNumSort `,
    {
      orgID: params.orgID,
      dateFromPrior: dateService.addMonths(period.dateFrom, -12),
      dateFrom: period.dateFrom,
      dateTo: period.dateTo,
      depID: params.depID || 0,
      payElID: params.payElID,
      orderDate: params.orderDate
    })

    const data = store.getAsJsObject()
    store.freeNative()
    data.forEach(row => {
      row['employeeNumberID.description'] = row.description
      row['payRetentionID.contrAccountID.organizationID.description'] = row.contractor
      delete row.description
      delete row.contractor
      if (row.payRetentionMethod) {
        row.employeePayOutID = null
      }
      if (row.payRetentionMethod === '3' || row.employeePayOutMethod === '3') {
        params.accruals.push(row)
      }
    })
  } else {
    const employeeNumbers = params.accruals.filter(o => !(o.payRetentionID || o.employeePayOutID))
    if (employeeNumbers.length) {
      store.runSQL(`${employeeNumberSQL} en.ID${entityBaseService.getInExpression('employeeNumbers')}
       ${!App.domainInfo.isEntityMethodsAccessible('hr_employeeNumber', 'employeeLimitedAccess') ? ' AND en.limitedAccess = 0' : ''}
       ORDER BY en.tabNumSort`,
      {
        dateFrom: period.dateFrom,
        dateTo: period.dateTo,
        depID: params.depID || 0,
        payElID: params.payElID,
        orderDate: params.orderDate,
        employeeNumbers: employeeNumbers.map(o => o.employeeNumberID)
      })
      const data = store.getAsJsObject()
      store.freeNative()
      data.forEach(row => {
        row['employeeNumberID.description'] = row.description
        row['payRetentionID.contrAccountID.organizationID.description'] = row.contractor
        delete row.description
        delete row.contractor
        const accrual = employeeNumbers.find(o => o.employeeNumberID === row.employeeNumberID)
        if (accrual) {
          if (row.payRetentionID) {
            accrual.payRetentionID = row.payRetentionID
          } else {
            accrual.employeePayOutID = row.employeePayOutID
          }
        }
      })
    }
  }
  const resultData = rlService.calculateOrderAccrual(params)
  if (params.reloadEmployee && resultData.accruals) {
    for (let i = resultData.accruals.length - 1; i >= 0; i--) {
      if (resultData.accruals[i].employeeNumberDateTo && resultData.accruals[i].paySum === 0 && period.dateFrom > dateService.shiftDate(resultData.accruals[i].employeeNumberDateTo)) {
        resultData.accruals.splice(i, 1)
      }
    }
  }
  mParams.resultData = JSON.stringify(resultData)
}

me.getPayOutByEmployee = function (ctx) {
  const sqlDialect = entityBaseService.getSQLDialect()
  const { mParams } = ctx
  const employeeNumbers = JSON.parse(mParams.employeeNumbers)
  const store = UB.DataStore('hr_employeeNumber')
  const payOut = payRollService.getPayOutList(mParams.orgID, ['ID', 'name', 'isDefault', 'organizationID'], {})
  const payOutDef = payOut.find(o => o.isDefault && o.organizationID === mParams.orgID) || payOut.find(o => o.isDefault)
  store.runSQL(`
   SELECT en.ID as "employeeNumberID", en.payOutID "payOutID", pout.name "payOutName",
   (select ${sqlDialect.top} pr.ID from hr_payRetention pr where pr.employeeNumberID = en.ID and pr.payElID = :payElID: and pr.dateFrom <= en.dateTo and pr.dateTo >= en.dateFrom and pr.mi_deleteDate >= '9999-12-31' order by pr.dateFrom desc ${sqlDialect.limit}) AS "payRetentionID",
          (select ${sqlDialect.top} pr.paymentMethod from hr_payRetention pr where pr.employeeNumberID = en.ID and pr.payElID = :payElID: and pr.dateFrom <= en.dateTo and pr.dateTo >= en.dateFrom and pr.mi_deleteDate >= '9999-12-31' order by pr.dateFrom desc ${sqlDialect.limit}) AS "payRetentionMethod",
          (select ${sqlDialect.top} pr.payOutID from hr_payRetention pr where pr.employeeNumberID = en.ID and pr.payElID = :payElID: and pr.dateFrom <= en.dateTo and pr.dateTo >= en.dateFrom and pr.mi_deleteDate >= '9999-12-31' order by pr.dateFrom desc ${sqlDialect.limit}) AS "payRetentionPayOutID",
          (select ${sqlDialect.top} pou.name from hr_payRetention pr JOIN hr_payOut pou ON pou.ID = pr.payOutID  where pr.employeeNumberID = en.ID and pr.payElID = :payElID: and pr.dateFrom <= en.dateTo and pr.dateTo >= en.dateFrom and pr.mi_deleteDate >= '9999-12-31' order by pr.dateFrom desc ${sqlDialect.limit}) AS "payRetentionPayOutName",
          (select ${sqlDialect.top} po.ID from hr_employeePayOut po where po.employeeNumberID = en.ID and po.paymentMethod = :paymentMethod: and po.dateFrom <= en.dateTo and po.dateTo >= en.dateFrom and po.mi_deleteDate >= '9999-12-31' order by po.isDefault DESC, po.dateFrom DESC ${sqlDialect.limit}) AS "employeePayOutID",
          (select ${sqlDialect.top} po.paymentMethod from hr_employeePayOut po where po.employeeNumberID = en.ID and po.paymentMethod = :paymentMethod: and po.dateFrom <= en.dateTo and po.dateTo >= en.dateFrom and po.mi_deleteDate >= '9999-12-31' order by po.isDefault DESC, po.dateFrom DESC ${sqlDialect.limit}) AS "employeePayOutMethod",
          (select ${sqlDialect.top} po.payOutID from hr_employeePayOut po where po.employeeNumberID = en.ID and po.paymentMethod = :paymentMethod: and po.dateFrom <= en.dateTo and po.dateTo >= en.dateFrom and po.mi_deleteDate >= '9999-12-31' order by po.isDefault DESC, po.dateFrom DESC ${sqlDialect.limit}) AS "employeePayOutPayOutID",
          (select ${sqlDialect.top} pou.name from hr_employeePayOut po JOIN hr_payOut pou ON pou.ID = po.payOutID where po.employeeNumberID = en.ID and po.paymentMethod = :paymentMethod: and po.dateFrom <= en.dateTo and po.dateTo >= en.dateFrom and po.mi_deleteDate >= '9999-12-31' order by po.isDefault DESC, po.dateFrom DESC ${sqlDialect.limit}) AS "employeePayOutPayOutName"
   FROM hr_employeeNumber en 
   LEFT JOIN hr_payOut pout ON pout.ID = en.payOutID
   WHERE en.orgID = :orgID: and en.ID${entityBaseService.getInExpression('employeeNumbers')} and en.mi_deleteDate >= '9999-12-31' 
   
      ORDER BY en.tabNumSort `,
  {
    orgID: mParams.orgID,
    employeeNumbers: employeeNumbers.length ? employeeNumbers.map(o => o.employeeNumberID) : [0],
    payElID: mParams.payElID,
    paymentMethod: mParams.paymentMethod
  })
  store.getAsJsObject().forEach(row => {
    const employeeNumber = employeeNumbers.find(o => o.employeeNumberID === row.employeeNumberID)
    if (row.payRetentionMethod) {
      row.employeePayOutID = null
      row.employeePayOutMethod = null
      row.paymentMethod = row.payRetentionMethod
      if (row.payRetentionPayOutName) {
        row['payRetentionID.payOutID.name'] = row.payRetentionPayOutName
        row.payOutID = null
      } else if (row.employeePayOutPayOutID) {
        row.payOutID = row.employeePayOutPayOutID
        row['payOutID.name'] = row.employeePayOutPayOutName
      } else if (row.payOutID) {
        row['payOutID.name'] = row.payOutName
      } else if (payOutDef) {
        row.payOutID = payOutDef.ID
        row['payOutID.name'] = payOutDef.name
      }
    } else if (row.employeePayOutMethod) {
      row.paymentMethod = mParams.paymentMethod
      if (row.employeePayOutPayOutName) {
        row['employeePayOutID.payOutID.name'] = row.employeePayOutPayOutName
        row.payOutID = null
      } else if (row.payOutID) {
        row['payOutID.name'] = row.payOutName
      } else if (payOutDef) {
        row.payOutID = payOutDef.ID
        row['payOutID.name'] = payOutDef.name
      }
    } else if (row.payOutID) {
      row['payOutID.name'] = row.payOutName
    } else if (payOutDef) {
      row.payOutID = payOutDef.ID
      row['payOutID.name'] = payOutDef.name
    }
    employeeNumber.payOutID = row.payOutID
    employeeNumber.employeePayOutID = row.employeePayOutID
    employeeNumber.payRetentionID = row.payRetentionID
    employeeNumber['payOutID.name'] = row['payOutID.name']
    employeeNumber['payRetentionID.payOutID.name'] = row['payRetentionID.payOutID.name']
    employeeNumber['employeePayOutID.payOutID.name'] = row['employeePayOutID.payOutID.name']
  })
  mParams.resultData = JSON.stringify(employeeNumbers)
}

me.calcPayWithinPeriod = function (ctx) {
  const { mParams } = ctx
  const params = JSON.parse(mParams.params)
  const store = UB.DataStore('hr_employeeNumber')
  const { orgID } = params
  const sqlDialect = entityBaseService.getSQLDialect()
  const payOut = payRollService.getPayOutList(params.orgID, ['ID', 'name', 'isDefault', 'organizationID'], {})
  const payOutDef = payOut.find(o => o.isDefault && o.organizationID === params.orgID) || payOut.find(o => o.isDefault)
  const payOutIsDefault = (payOutDef && params.payOutID && payOutDef === params.payOutID)
  const deptIDs = accrualService.getDepIDs(params)
  const employeeNumberSQL = `
   SELECT   en.ID as "employeeNumberID", en.description, pr.paySum "paySum", pr.periodSalaryID "periodSalaryID",
    pr.periodCalcID "periodCalcID", pr.periodCalc "periodCalc", pr.periodSalary "periodSalary", pr.dateFrom "dateFrom",
     pr.dateTo "dateTo", pr.payElID "payElID", pr.mask, pr.accrualDt "accrualDt",
     en.payOutID "payOutID", 
     pout.name "payOutName",
    (select ${sqlDialect.top} pos.name from hr_employeePosition ep 
      join hr_position pos on pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' and pos.mi_dateFrom <= en.dateTo and pos.mi_dateTo >= en.dateFrom and pos.mi_deleteDate >= '9999-12-31' 
      where ep.employeeNumberID = en.ID and ep.isActive = 1 and ep.dateFrom <= en.dateTo and ep.dateTo >= en.dateFrom and ep.dateFrom <= :dateTo: and ep.mi_deleteDate >= '9999-12-31' 
      order by ep.dateFrom desc ${sqlDialect.limit})
    as "posName",
    (select ${sqlDialect.top} dep.name from hr_employeePosition ep 
      join hr_department dep on dep.mi_data_id = ep.departmentID and dep.state = 'ACTIVE' and dep.mi_dateFrom <= en.dateTo and dep.mi_dateTo >= en.dateFrom and dep.mi_deleteDate >= '9999-12-31' 
      where ep.employeeNumberID = en.ID and ep.isActive = 1 and ep.dateFrom <= en.dateTo and ep.dateTo >= en.dateFrom and ep.dateFrom <= :dateTo: and ep.mi_deleteDate >= '9999-12-31'
      order by ep.dateFrom desc ${sqlDialect.limit})
    as "depName",
    (select ${sqlDialect.top} pr.ID from hr_payRetention pr where pr.employeeNumberID = en.ID and pr.payElID = :payElID: and pr.dateFrom <= en.dateTo and pr.dateTo >= en.dateFrom and pr.mi_deleteDate >= '9999-12-31' order by pr.dateFrom desc ${sqlDialect.limit}) AS "payRetentionID",
          (select ${sqlDialect.top} pr.paymentMethod from hr_payRetention pr where pr.employeeNumberID = en.ID and pr.payElID = :payElID: and pr.dateFrom <= en.dateTo and pr.dateTo >= en.dateFrom and pr.mi_deleteDate >= '9999-12-31' order by pr.dateFrom desc ${sqlDialect.limit}) AS "payRetentionMethod",
          (select ${sqlDialect.top} pr.payOutID from hr_payRetention pr where pr.employeeNumberID = en.ID and pr.payElID = :payElID: and pr.dateFrom <= en.dateTo and pr.dateTo >= en.dateFrom and pr.mi_deleteDate >= '9999-12-31' order by pr.dateFrom desc ${sqlDialect.limit}) AS "payRetentionPayOutID",
          (select ${sqlDialect.top} pou.name from hr_payRetention pr JOIN hr_payOut pou ON pou.ID = pr.payOutID  where pr.employeeNumberID = en.ID and pr.payElID = :payElID: and pr.dateFrom <= en.dateTo and pr.dateTo >= en.dateFrom and pr.mi_deleteDate >= '9999-12-31' order by pr.dateFrom desc ${sqlDialect.limit}) AS "payRetentionPayOutName",
          (select ${sqlDialect.top} po.ID from hr_employeePayOut po where po.employeeNumberID = en.ID and (po.paymentMethod = :paymentMethod: OR po.paymentMethod = '4') and po.dateFrom <= en.dateTo and po.dateTo >= en.dateFrom and po.mi_deleteDate >= '9999-12-31' order by po.isDefault DESC, po.dateFrom DESC ${sqlDialect.limit}) AS "employeePayOutID",
          (select ${sqlDialect.top} po.paymentMethod from hr_employeePayOut po where po.employeeNumberID = en.ID and (po.paymentMethod = :paymentMethod: OR po.paymentMethod = '4') and po.dateFrom <= en.dateTo and po.dateTo >= en.dateFrom and po.mi_deleteDate >= '9999-12-31' order by po.isDefault DESC, po.dateFrom DESC ${sqlDialect.limit}) AS "employeePayOutMethod",
          (select ${sqlDialect.top} po.payOutID from hr_employeePayOut po where po.employeeNumberID = en.ID and (po.paymentMethod = :paymentMethod: OR po.paymentMethod = '4') and po.dateFrom <= en.dateTo and po.dateTo >= en.dateFrom and po.mi_deleteDate >= '9999-12-31' order by po.isDefault DESC, po.dateFrom DESC ${sqlDialect.limit}) AS "employeePayOutPayOutID",
          (select ${sqlDialect.top} pou.name from hr_employeePayOut po JOIN hr_payOut pou ON pou.ID = po.payOutID where po.employeeNumberID = en.ID and (po.paymentMethod = :paymentMethod: OR po.paymentMethod = '4') and po.dateFrom <= en.dateTo and po.dateTo >= en.dateFrom and po.mi_deleteDate >= '9999-12-31' order by po.isDefault DESC, po.dateFrom DESC ${sqlDialect.limit}) AS "employeePayOutPayOutName"
   FROM hr_employeeNumber en 
   JOIN hr_orderRegistryDt pr on en.ID = pr.employeeNumberID 
   JOIN hr_orderregistry doc on doc.ID = pr.orderregistryid
   LEFT JOIN hr_payOut pout ON pout.ID = en.payOutID
   WHERE`
  const isReload = !params.accruals.length
  params.accruals.forEach(accrual => {
    if (accrual.docSum === 0) {
      accrual.baseSum = accrual.paySum
    }
    accrual.docSum = 0
  })
  const period = periodService.getPeriod(params.periodSalaryID)

  params.orderRegistry.forEach(rec => {
    store.runSQL(`${employeeNumberSQL}
      en.orgID = :orgID: and pr.orderRegistryID = :orderRegistryID: and doc.orderState = 'POSTED' and en.mi_deleteDate >= '9999-12-31' and pr.mi_deleteDate >= '9999-12-31'
      ${deptIDs ? ` AND EXISTS (select ${sqlDialect.top} ep.departmentID from hr_employeePosition ep where ep.employeeNumberID = en.ID and ep.isActive = 1 and ep.dateFrom <= :dateTo: and ep.dateTo >= :dateFrom: and ep.mi_deleteDate >= '9999-12-31' and ep.departmentID${entityBaseService.getInExpression('deptIDs')} order by ep.dateFrom desc ${sqlDialect.limit})` : ''}
      ${params.employeeNumbers ? `and en.ID${entityBaseService.getInExpression('employeeNumbers')}` : ''} 
       ${!App.domainInfo.isEntityMethodsAccessible('hr_employeeNumber', 'employeeLimitedAccess') ? ' AND en.limitedAccess = 0' : ''}
      ORDER BY en.tabNumSort `,
    {
      orgID: orgID,
      orderDate: dateService.shiftDate(params.orderDate),
      orderRegistryID: rec.orderRegistryID,
      deptIDs,
      employeeNumbers: params.employeeNumbers || [0],
      payElID: params.payElID,
      dateFrom: period.dateFrom,
      dateTo: period.dateTo,
      paymentMethod: params.paymentMethod
    })

    store.getAsJsObject().forEach(row => {
      if (row.accrualDt) { row.accrualDt = JSON.parse(row.accrualDt) }
      if (row.payRetentionMethod) {
        row.employeePayOutID = null
        row.employeePayOutMethod = null
        row.paymentMethod = row.payRetentionMethod
        if (row.payRetentionPayOutName) {
          row['payRetentionID.payOutID.name'] = row.payRetentionPayOutName
          row.payOutID = null
        } else if (row.employeePayOutPayOutID) {
          row.payOutID = row.employeePayOutPayOutID
          row['payOutID.name'] = row.employeePayOutPayOutName
        } else if (row.payOutID) {
          row['payOutID.name'] = row.payOutName
        } else if (payOutDef) {
          row.payOutID = payOutDef.ID
          row['payOutID.name'] = payOutDef.name
        }
      } else if (row.employeePayOutMethod) {
        row.paymentMethod = params.paymentMethod
        if (row.employeePayOutPayOutName) {
          row['employeePayOutID.payOutID.name'] = row.employeePayOutPayOutName
          row.payOutID = null
        } else if (row.payOutID) {
          row['payOutID.name'] = row.payOutName
        } else if (payOutDef) {
          row.payOutID = payOutDef.ID
          row['payOutID.name'] = payOutDef.name
        }
      } else if (row.payOutID) {
        row['payOutID.name'] = row.payOutName
      } else if (payOutDef) {
        row.payOutID = payOutDef.ID
        row['payOutID.name'] = payOutDef.name
      }
      row['employeeNumberID.description'] = row.description
      delete row.description
      const accrual = params.accruals.find(o => o.employeeNumberID === row.employeeNumberID)
      if (!accrual && isReload && ((params.payOutID &&
          ((payOutIsDefault && ((row.payOutID === params.payOutID || row.payRetentionPayOutID === params.payOutID || row.employeePayOutPayOutID === params.payOutID) ||
            (!row.payOutID && !row.employeePayOutID && !row.payRetentionID))) ||
            (!payOutIsDefault && (row.payOutID === params.payOutID || row.payRetentionPayOutID === params.payOutID || row.employeePayOutPayOutID === params.payOutID)))) ||
          (!params.payOutID &&
            ((payOutDef && ((!row.payOutID && !row.employeePayOutID && !row.payRetentionID) || ['1'].includes(row.payRetentionMethod) ||
              row.employeePayOutMethod === '1' || row.payOutID)) || (!payOutDef && (['1', '4'].includes(row.payRetentionMethod) || row.employeePayOutMethod === '1' || row.payOutID)))))) {
        params.accruals.push({
          employeeNumberID: row.employeeNumberID,
          'employeeNumberID.description': row['employeeNumberID.description'],
          periodCalcID: params.periodSalaryID,
          periodSalaryID: params.periodSalaryID,
          depName: row.depName,
          posName: row.posName,
          docSum: row.paySum,
          baseSum: row.paySum,
          taxSum: 0,
          dopTaxSum: 0,
          paySum: 0,
          paidSum: 0,
          depSum: 0,
          planPaySum: 0,
          flagsFix: 0,
          payOutID: row.payOutID,
          employeePayOutID: row.employeePayOutID,
          payRetentionID: row.payRetentionID,
          'payOutID.name': row['payOutID.name'],
          'payRetentionID.payOutID.name': row['payRetentionID.payOutID.name'],
          'employeePayOutID.payOutID.name': row['employeePayOutID.payOutID.name'],
          orderAcc: [row]
        })
      } else if (accrual) {
        accrual.docSum += row.paySum
        accrual.baseSum = accrual.docSum
        if (!accrual.orderAcc) {
          accrual.orderAcc = [row]
        } else {
          accrual.orderAcc.push(row)
        }
      }
    })
  })
  store.freeNative()
  const resultData = rlService.calculateOrderAccrual(params)
  mParams.resultData = JSON.stringify(resultData)
}
me.calcFundSourceBank = function (ctx) {
  const { mParams } = ctx
  const params = JSON.parse(mParams.params)
  const store = UB.DataStore('hr_employeeNumber')
  const payEl = UB.Repository('hr_payEl').attrs(['code', 'methodID.code', 'dictFundSourceID', 'dictProgClassID', 'dictProjectID']).selectById(params.payElID)
  const payOut = payRollService.getPayOutList(params.orgID, ['ID', 'name', 'isDefault', 'organizationID'], {})
  const payOutDef = payOut.find(o => o.isDefault && o.organizationID === params.orgID) || payOut.find(o => o.isDefault)
  const sqlDialect = entityBaseService.getSQLDialect()
  const deptIDs = accrualService.getDepIDs(params)
  entityBaseService.initEntityJsonData(mParams.instanceID)
  let employeeNumberSQL = `SELECT
          en.ID as "employeeNumberID",
          en.description,
          en.payOutID "payOutID",
          pout.name "payOutName", 
          en.dateTo as "employeeNumberDateTo",
          (select ${sqlDialect.top} pos.name from hr_employeePosition ep join hr_position pos on pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' and pos.mi_deleteDate >= '9999-12-31' and pos.mi_dateFrom <= en.dateTo and pos.mi_dateTo >= en.dateFrom where ep.employeeNumberID = en.ID and ep.isActive = 1 and ep.dateFrom <= en.dateTo and ep.dateTo >= en.dateFrom and ep.dateFrom <= :dateTo: and ep.mi_deleteDate >= '9999-12-31' order by ep.dateFrom desc ${sqlDialect.limit}) AS "posName",  
          (select ${sqlDialect.top} dep.name from hr_employeePosition ep join hr_department dep on dep.mi_data_id = ep.departmentID  and dep.state = 'ACTIVE'  and dep.mi_deleteDate >= '9999-12-31' and dep.mi_dateFrom <= en.dateTo and dep.mi_dateTo >= en.dateFrom where ep.employeeNumberID = en.ID and ep.isActive = 1 and ep.dateFrom <= en.dateTo and ep.dateTo >= en.dateFrom and ep.dateFrom <= :dateTo: and ep.mi_deleteDate >= '9999-12-31' order by ep.dateFrom desc ${sqlDialect.limit}) AS "depName",
         (select ${sqlDialect.top} pr.ID from hr_payRetention pr where pr.employeeNumberID = en.ID and pr.payElID = :payElID: and pr.dateFrom <= :dateTo: and pr.dateTo >= :dateFrom: and pr.mi_deleteDate >= '9999-12-31' order by pr.dateFrom desc ${sqlDialect.limit}) AS "payRetentionID",
          (select ${sqlDialect.top} pr.paymentMethod from hr_payRetention pr where pr.employeeNumberID = en.ID and pr.payElID = :payElID: and pr.dateFrom <= :dateTo: and pr.dateTo >= :dateFrom: and pr.mi_deleteDate >= '9999-12-31' order by pr.dateFrom desc ${sqlDialect.limit}) AS "payRetentionMethod",
          (select ${sqlDialect.top} pr.payOutID from hr_payRetention pr where pr.employeeNumberID = en.ID and pr.payElID = :payElID: and pr.dateFrom <= :dateTo: and pr.dateTo >= :dateFrom: and pr.mi_deleteDate >= '9999-12-31' order by pr.dateFrom desc ${sqlDialect.limit}) AS "payRetentionPayOutID",
          (select ${sqlDialect.top} pou.name from hr_payRetention pr JOIN hr_payOut pou ON pou.ID = pr.payOutID  where pr.employeeNumberID = en.ID and pr.payElID = :payElID: and pr.dateFrom <= :dateTo: and pr.dateTo >= :dateFrom: and pr.mi_deleteDate >= :maxdate: order by pr.dateFrom desc ${sqlDialect.limit}) AS "payRetentionPayOutName",
          (select ${sqlDialect.top} po.ID from hr_employeePayOut po where po.employeeNumberID = en.ID and po.dateFrom <= :dateTo: and po.dateTo >= :dateFrom: and po.mi_deleteDate >= '9999-12-31' order by po.isDefault DESC, po.dateFrom DESC ${sqlDialect.limit}) AS "employeePayOutID",
          (select ${sqlDialect.top} po.paymentMethod from hr_employeePayOut po where po.employeeNumberID = en.ID and po.dateFrom <= :dateTo: and po.dateTo >= :dateFrom: and po.mi_deleteDate >= '9999-12-31' order by po.isDefault DESC, po.dateFrom DESC ${sqlDialect.limit}) AS "employeePayOutMethod",
          (select ${sqlDialect.top} po.payOutID from hr_employeePayOut po where po.employeeNumberID = en.ID and po.dateFrom <= :dateTo: and po.dateTo >= :dateFrom: and po.mi_deleteDate >= '9999-12-31' order by po.isDefault DESC, po.dateFrom DESC ${sqlDialect.limit}) AS "employeePayOutPayOutID",
          (select ${sqlDialect.top} pou.name from hr_employeePayOut po JOIN hr_payOut pou ON pou.ID = po.payOutID where po.employeeNumberID = en.ID and po.dateFrom <= :dateTo: and po.dateTo >= :dateFrom: and po.mi_deleteDate >= '9999-12-31' order by po.isDefault DESC, po.dateFrom DESC ${sqlDialect.limit}) AS "employeePayOutPayOutName"
        FROM hr_employeeNumber en
        LEFT JOIN hr_payOut pout ON pout.ID = en.payOutID
        WHERE `
  const period = periodService.getPeriod(params.periodSalaryID)
  if (params.reloadEmployee) {
    store.runSQL(`${employeeNumberSQL}
    en.orgID = :orgID: AND en.mi_deleteDate= '9999-12-31' and exists (select 1 from hr_accrual a join hr_accrualDt adt on adt.accrualID = a.ID 
      ${payEl.dictFundSourceID ? ' and adt.dictFundSourceID = :dictFundSourceID: ' : ''} 
      ${payEl.dictProgClassID ? ' and adt.dictProgClassID = :dictProgClassID: ' : ''}
      ${payEl.dictProjectID ? ' and adt.dictProjectID = :dictProjectID: ' : ''}
    where a.periodCalcID = :periodSalaryID: and a.employeeNumberID = en.ID ${params.periodSalarySelectID ? ' and a.periodSalaryID = :periodSalarySelectID: ' : ''}) 
    ${deptIDs ? ` AND EXISTS (select ${sqlDialect.top} ep.departmentID from hr_employeePosition ep where ep.employeeNumberID = en.ID and ep.isActive = 1 and ep.dateFrom <= :dateTo: and ep.dateTo >= :dateFrom: and ep.mi_deleteDate >= '9999-12-31' and ep.departmentID${entityBaseService.getInExpression('deptIDs')} order by ep.dateFrom desc ${sqlDialect.limit})` : ''}        
    ${!App.domainInfo.isEntityMethodsAccessible('hr_employeeNumber', 'employeeLimitedAccess') ? ' AND en.limitedAccess = 0' : ''}
    ORDER BY en.tabNumSort`,
    {
      orgID: params.orgID,
      periodSalaryID: params.periodSalaryID,
      periodCalcID: params.periodCalcID,
      dateFrom: period.dateFrom,
      dateTo: period.dateTo,
      deptIDs,
      payOutID: params.payOutID || 0,
      dictFundSourceID: payEl.dictFundSourceID || 0,
      dictProgClassID: payEl.dictProgClassID || 0,
      dictProjectID: payEl.dictProjectID || 0,
      periodSalarySelectID: params.periodSalarySelectID || 0
    })

    const data = store.getAsJsObject()
    store.freeNative()
    data.forEach(row => {
      row.periodSalaryID = params.periodSalaryID
      row.periodCalcID = params.periodCalcID
      if (row.payRetentionMethod) {
        row.employeePayOutID = null
        row.employeePayOutMethod = null
        row.paymentMethod = row.payRetentionMethod
        if (row.payRetentionPayOutName) {
          row['payRetentionID.payOutID.name'] = row.payRetentionPayOutName
          row.payOutID = null
        } else if (row.employeePayOutPayOutID) {
          row.payOutID = row.employeePayOutPayOutID
          row['payOutID.name'] = row.employeePayOutPayOutName
        } else if (row.payOutID) {
          row['payOutID.name'] = row.payOutName
        } else if (payOutDef) {
          row.payOutID = payOutDef.ID
          row['payOutID.name'] = payOutDef.name
        }
      } else if (row.employeePayOutMethod) {
        row.paymentMethod = '1'
        if (row.employeePayOutPayOutName) {
          row['employeePayOutID.payOutID.name'] = row.employeePayOutPayOutName
          row.payOutID = null
        } else if (row.payOutID) {
          row['payOutID.name'] = row.payOutName
        } else if (payOutDef) {
          row.payOutID = payOutDef.ID
          row['payOutID.name'] = payOutDef.name
        }
      } else if (row.payOutID) {
        row['payOutID.name'] = row.payOutName
      } else if (payOutDef) {
        row.payOutID = payOutDef.ID
        row['payOutID.name'] = payOutDef.name
      }
      params.accruals.push(row)
      row['employeeNumberID.description'] = row.description
      row['employeeNumberID.dateTo'] = row.employeeNumberDateTo
      row['payRetentionID.contrAccountID.organizationID.description'] = row.contractor
      delete row.description
      delete row.employeeNumberDateTo
      delete row.contractor
    })
  } else {
    const employeeNumbers = params.accruals.filter(o => !(o.payRetentionID || o.employeePayOutID || o.payOutID))
    if (employeeNumbers.length) {
      store.runSQL(`${employeeNumberSQL} en.ID${entityBaseService.getInExpression('employeeNumbers')} 
       ${!App.domainInfo.isEntityMethodsAccessible('hr_employeeNumber', 'employeeLimitedAccess') ? ' AND en.limitedAccess = 0' : ''}
      ORDER BY en.tabNumSort`,
      {
        orderDate: params.orderDate,
        dateFrom: period.dateFrom,
        dateTo: period.dateTo,
        depID: params.depID || 0,
        payOutID: params.payOutID || 0,
        payElID: params.payElID,
        employeeNumbers: employeeNumbers.map(o => o.employeeNumberID)
      })
      const data = store.getAsJsObject()
      store.freeNative()
      data.forEach(row => {
        row['employeeNumberID.description'] = row.description
        row['employeeNumberID.dateTo'] = row.employeeNumberDateTo
        row['payRetentionID.contrAccountID.organizationID.description'] = row.contractor
        delete row.description
        delete row.employeeNumberDateTo
        delete row.contractor
        const accrual = employeeNumbers.find(o => o.employeeNumberID === row.employeeNumberID)
        if (accrual) {
          accrual.periodSalaryID = params.periodSalaryID
          accrual.periodCalcID = params.periodCalcID
          if (!(accrual.flagsFix & 1 << 22)) {
            if (row.payRetentionID) {
              accrual.paymentMethod = row.payRetentionMethod
              accrual.payRetentionID = row.payRetentionID
              accrual['payRetentionID.payOutID.name'] = row.payRetentionPayOutName
              if (row.payRetentionPayOutName) {
                accrual['payRetentionID.payOutID.name'] = row.payRetentionPayOutName
              } else if (payOutDef) {
                accrual.payOutID = payOutDef.ID
                accrual['payOutID.name'] = payOutDef.name
              }
            } else {
              accrual.paymentMethod = '1'
              if (row.employeePayOutID) {
                accrual.employeePayOutID = row.employeePayOutID
                if (row.employeePayOutPayOutName) {
                  accrual['employeePayOutID.payOutID.name'] = row.employeePayOutPayOutName
                } else if (payOutDef) {
                  accrual.payOutID = payOutDef.ID
                  accrual['payOutID.name'] = payOutDef.name
                }
              } else if (row.payOutID) {
                accrual.payOutID = row.payOutID
                accrual['payOutID.name'] = row.payOutName
              } else if (payOutDef) {
                accrual.payOutID = payOutDef.ID
                accrual['payOutID.name'] = payOutDef.name
              }
            }
          }
        }
      })
    }
  }
  const resultData = rlService.calculateOrderAccrual(params)
  if (params.reloadEmployee && resultData.accruals) {
    for (let i = resultData.accruals.length - 1; i >= 0; i--) {
      if (resultData.accruals[i].employeeNumberDateTo && resultData.accruals[i].paySum === 0 && period.dateFrom > dateService.shiftDate(resultData.accruals[i].employeeNumberDateTo)) {
        resultData.accruals.splice(i, 1)
      }
    }
  }
  if (params.payOutID) {
    resultData.accruals = resultData.accruals.filter(el => el.payOutID === params.payOutID || el.employeePayOutPayOutID === params.payOutID)
  }
  mParams.resultData = JSON.stringify(resultData)
  entityBaseService.writeEntityJsonData(mParams.instanceID, mParams.resultData)
}

me.calcPaySicknessRequis = function (ctx) {
  const { mParams } = ctx
  const params = JSON.parse(mParams.params)
  const store = UB.DataStore('hr_employeeNumber')
  const periodCalc = periodService.getPeriod(params.periodCalcID)
  const periodSalary = periodService.getPeriod(params.periodSalaryID)
  const sqlDialect = entityBaseService.getSQLDialect()
  const payOut = payRollService.getPayOutList(params.orgID, ['ID', 'name', 'isDefault', 'organizationID'], {})
  const payOutDef = payOut.find(o => o.isDefault && o.organizationID === params.orgID) || payOut.find(o => o.isDefault)
  const employeeNumberSQL = `
   SELECT en.orgID "orgID", en.ID as "employeeNumberID", en.description, ha.paySum "paySum", srd.payElID "payElID", srd.orderDate "orderDate",
    srd.accrualDt "accrualDt",
     ha.periodSalaryID  "periodSalaryID",
     ha.periodCalcID "periodCalcID",
     ha.periodCalc "periodCalc",
     ha.periodSalary "periodSalary",
     pout.name "payOutName",
     en.payOutID "payOutID",
     en.dateFrom "dateFrom",
     en.dateTo "dateTo",
     (select ${sqlDialect.top} po.ID from hr_employeePayOut po where po.employeeNumberID = en.ID and po.dateFrom <= :dateTo: and po.dateTo >= :dateFrom: and po.mi_deleteDate >= '9999-12-31' order by po.isDefault DESC, po.dateFrom DESC ${sqlDialect.limit}) AS "employeePayOutID",
          (select ${sqlDialect.top} po.paymentMethod from hr_employeePayOut po where po.employeeNumberID = en.ID and po.dateFrom <= :dateTo: and po.dateTo >= :dateFrom: and po.mi_deleteDate >= '9999-12-31' order by po.isDefault DESC, po.dateFrom DESC ${sqlDialect.limit}) AS "employeePayOutMethod",
          (select ${sqlDialect.top} po.payOutID from hr_employeePayOut po where po.employeeNumberID = en.ID and po.dateFrom <= :dateTo: and po.dateTo >= :dateFrom: and po.mi_deleteDate >= '9999-12-31' order by po.isDefault DESC, po.dateFrom DESC ${sqlDialect.limit}) AS "employeePayOutPayOutID",
          (select ${sqlDialect.top} pou.name from hr_employeePayOut po JOIN hr_payOut pou ON pou.ID = po.payOutID where po.employeeNumberID = en.ID and po.dateFrom <= :dateTo: and po.dateTo >= :dateFrom: and po.mi_deleteDate >= '9999-12-31' order by po.isDefault DESC, po.dateFrom DESC ${sqlDialect.limit}) AS "employeePayOutPayOutName",
    (select ${sqlDialect.top} pos.name from hr_employeePosition ep 
      join hr_position pos on pos.mi_data_id = ep.positionID and pos.mi_dateFrom <= en.dateTo and pos.mi_dateTo >= en.dateFrom 
      where ep.employeeNumberID = en.ID and ep.isActive = 1 and ep.dateFrom <= en.dateTo and ep.dateTo >= en.dateFrom and ep.dateFrom <= :dateTo: and ep.mi_deleteDate >= '9999-12-31' order by ep.dateFrom desc ${sqlDialect.limit}) AS "posName",  
    (select ${sqlDialect.top} dep.name from hr_employeePosition ep 
      join hr_department dep on dep.mi_data_id = ep.departmentID and dep.mi_dateFrom <= en.dateTo and dep.mi_dateTo >= en.dateFrom 
      where ep.employeeNumberID = en.ID and ep.isActive = 1 and ep.dateFrom <= en.dateTo and ep.dateTo >= en.dateFrom and ep.dateFrom <= :dateTo: and ep.mi_deleteDate >= '9999-12-31' order by ep.dateFrom desc ${sqlDialect.limit}) AS "depName"
   FROM hr_employeeNumber en 
   JOIN hr_sicknessRequisDt srd on en.ID = srd.employeeNumberID
   JOIN hr_sicknessRequisAccrual sra on sra.sicknessrequisdtid = srd.id
   join hr_accrual ha on ha.id=sra.accrualid
   LEFT JOIN hr_payOut pout ON pout.ID = en.payOutID
   WHERE`
  params.emp = {}
  params.sicknessRequis.forEach(rec => {
    // організація заявки === організації платіжної відомості
    //  ? включаємо усіх працівників із заявки
    //  : тільки працівників організації платіжної відомості
    const filterByOrgID = rec['sicknessRequisID.orgID'] === params.orgID ? '' : ` and en.orgID = ${params.orgID}`
    store.runSQL(`${employeeNumberSQL} srd.sicknessRequisID = :sicknessRequisID: AND en.mi_deleteDate >= '9999-12-31' and srd.mi_deleteDate >= '9999-12-31' ${filterByOrgID} order by en.orgID`, {
      dateFrom: periodSalary.dateFrom,
      dateTo: periodSalary.dateTo,
      sicknessRequisID: rec.sicknessRequisID
    })
    const data = store.getAsJsObject()
    data.forEach(row => {
      if (row.employeePayOutMethod) {
        row.payOutID = null
        row.paymentMethod = '1'
        row['payOutID.name'] = row.employeePayOutPayOutName
        if (row.employeePayOutPayOutName) {
          row['payOutID.name'] = row.employeePayOutPayOutName
        } else if (payOutDef) {
          row.payOutID = payOutDef.ID
          row['payOutID.name'] = payOutDef.name
        }
      } else if (row.payOutID) {
        row['payOutID.name'] = row.payOutName
      } else if (payOutDef) {
        row.payOutID = payOutDef.ID
        row['payOutID.name'] = payOutDef.name
      }
      row['employeeNumberID.description'] = row.description
      delete row.description
      row.dateFrom = dateService.shiftDate(row.dateFrom)
      row.dateTo = dateService.shiftDate(row.dateTo)
      const empDateFrom = (row.dateFrom > periodSalary.dateFrom && row.dateFrom < periodSalary.dateTo) ? row.dateFrom : null
      const empDateTo = (row.dateTo > periodSalary.dateFrom && row.dateTo < periodSalary.dateTo) ? row.dateTo : null

      row.baseSum = row.paySum
      // add pdv 17.12.24
      // При расчете удержаний при выплате больничных нужен период для удержания военного сбора за прошлые периоды
      if (!row.periodCalcID) row.periodCalcID = periodCalc.ID
      if (!row.periodSalaryID) row.periodSalaryID = periodSalary.ID
      if (!row.periodCalc) row.periodCalc = periodCalc.dateFrom
      if (!row.periodSalary) row.periodSalary = periodSalary.dateFrom
      row.dateFrom = empDateFrom || periodSalary.dateFrom
      row.dateTo = empDateTo || periodSalary.dateTo
      row.accrualDt = row.accrualDt ? JSON.parse(row.accrualDt) : []
      //row.mask = algorithmService.getFillMaskByPeriod(empDateFrom || periodSalary.dateFrom, empDateTo || periodSalary.dateTo)
      //change pdv
      row.mask = algorithmService.getFillMaskByPeriod(empDateFrom || row.periodSalary, empDateTo || periodService.getPeriod(row.periodSalaryID).dateTo)
      if (!params.emp[row.employeeNumberID]) {
        params.emp[row.employeeNumberID] = []
      }
      params.emp[row.employeeNumberID].push(Object.assign({}, row))
      const accrual = params.accruals.find(o => o.employeeNumberID === row.employeeNumberID)
      if (accrual) {
        accrual.baseSum += row.baseSum
        accrual.accrualDt = accrual.accrualDt.concat(row.accrualDt)
      } else {
        params.accruals.push(row)
      }
    })
  })
  store.freeNative()
  const resultData = rlService.calculateOrderAccrual(params)
  mParams.resultData = JSON.stringify(resultData)
}

me.docPrintFormFSS = function (ctx) {
  const { mParams } = ctx
  mParams.doc = payRollPrint.getPayFormFSS(mParams.params)
}

me.docPrintForm = function (ctx) {
  const { mParams } = ctx
  switch (mParams.params.reportCode) {
    case 'hr_payRollBank_1':
      mParams.doc = payRollPrint.payRollBank(mParams.params)
      break
    case 'hr_payRollBankByAlimony':
      mParams.doc = payRollPrint.payRollByAlimony(mParams.params)
      break
    case 'payForm53':
      mParams.doc = payRollPrint.getPayForm53(mParams.params)
      break
    case 'hr_payRoll_calcApplication':
      mParams.doc = payRollPrint.getСalcApplication(mParams.params)
      break
    default:
      mParams.doc = payRollPrint.getPayForm53(mParams.params)
  }
}

function getExportRow (metodExport, params, emp, row, idx) {
  let metodExportStd = {
    'branchCode': params.branch || '',
    'projectCode': params.zpcod || '',
    'tranDate': params.orderDate,
    'personalAccount': emp.personalAccount || '',
    'taxCodeType': emp['employeeID.taxCode'] || '',
    'lastName': emp['employeeID.lastName'] || '',
    'firstName': emp['employeeID.firstName'] || '',
    'middleName': emp['employeeID.middleName'] || '',
    'paySum': row.paySum,
    'taxCode9': emp['employeeID.empTaxCodeType'] === 'TAXCODE' ? (emp['employeeID.taxCode'] || '') : '000000000',
    'taxCode10': emp['employeeID.empTaxCodeType'] === 'TAXCODE' ? (emp['employeeID.taxCode'] || '') : '0000000000',
    'namePayRoll': params.rlcod || '',
    'bankSubAccount': emp.subAccount || '',
    'fullFIO': emp['employeeID.fullFIO'] || ''
  }

  const metodFields = UB.Repository('hr_exportMethodFields')
    .attrs(['name', 'exportFieldsID.code', 'fixValue'])
    .where('exportMethodID', '=', metodExport)
    .orderBy('indexNom')
    .selectAsObject()
  const el = {}
  metodFields.forEach(row => {
    el[row.name] = row['exportFieldsID.code'] === 'pNum' ? idx + 1 : row['exportFieldsID.code'] === 'fixValue' ? row.fixValue : metodExportStd[row['exportFieldsID.code']]
  })
  return el
}

me.exportBank = function (ctx) {
  const dataStructure = {}
  const { mParams } = ctx
  const employee = JSON.parse(mParams.employee)
  const files = []
  const empMissingMetods = []
  const employeePayOutIDs = []
  const payRetentionIDs = []
  const employeeNumberIDs = []
  const payOut = payRollService.getPayOutList(mParams.orgID, null, { 'exportMethodID': 'exportMethod' })
  if (mParams.metodExport !== 'all') {
    const struct = []
    const payOutStructure = UB.Repository('hr_exportMethodFields')
      .attrs(['exportMethodID', 'name', 'exportFieldsID.code', 'size', 'typeColumn'])
      .where('exportMethodID', '=', mParams.metodExport)
      .orderBy('indexNom')
      .selectAsObject()
    payOutStructure.forEach(srt => {
      const el = {}
      el.name = srt.name
      el.code = srt['exportFieldsID.code']
      el.caption = srt.name
      el.size = srt.size
      el.type = srt.typeColumn
      if (el.type === 'N') {
        el.dec = 2
        el.accuracy = 2
      }
      if (el.type === 'D') {
        el.size = 8
      }
      struct.push(el)
    })
    dataStructure[mParams.metodExport] = struct
  } else {
    payOut.forEach(row => {
      if (!dataStructure[row.exportMethod]) {
        const struct = []
        const payOutStructure = UB.Repository('hr_exportMethodFields')
          .attrs(['exportMethodID', 'name', 'exportFieldsID.code', 'size', 'typeColumn'])
          .where('exportMethodID', '=', row.exportMethod)
          .orderBy('indexNom')
          .selectAsObject()
        payOutStructure.forEach(srt => {
          const el = {}
          el.name = srt.name
          el.code = srt['exportFieldsID.code']
          el.caption = srt.name
          el.size = srt.size
          el.type = srt.typeColumn
          if (el.type === 'N') {
            el.dec = 2
            el.accuracy = 2
          }
          if (el.type === 'D') {
            el.size = 8
          }
          struct.push(el)
        })
        dataStructure[row.exportMethod] = struct
      }
    })

    if (!dataStructure.length) {
      const employeePayOut = UB.Repository('hr_employeePayOut')
        .attrs(['exportMethodID', 'projectCode', 'branchCode'])
        .where('employeeNumberID.orgID', '=', mParams.orgID)
        .groupBy(['exportMethodID', 'projectCode', 'branchCode'])
        .selectAsObject({ 'exportMethodID': 'exportMethod' })
      employeePayOut.forEach(row => {
        if (!dataStructure[row.exportMethod]) {
          const struct = []
          const payOutStructure = UB.Repository('hr_exportMethodFields')
            .attrs(['exportMethodID', 'name', 'exportFieldsID.code', 'size', 'typeColumn'])
            .where('exportMethodID', '=', row.exportMethod)
            .orderBy('indexNom')
            .selectAsObject()
          payOutStructure.forEach(srt => {
            const el = {}
            el.name = srt.name
            el.code = srt['exportFieldsID.code']
            el.caption = srt.name
            el.size = srt.size
            el.type = srt.typeColumn
            if (el.type === 'N') {
              el.dec = 2
              el.accuracy = 2
            }
            if (el.type === 'D') {
              el.size = 8
            }
            struct.push(el)
          })
          dataStructure[row.exportMethod] = struct
        }
      })
    }
  }
  const payOutDef = payOut.find(o => o.isDefault && o.organizationID === mParams.orgID) || payOut.find(o => o.isDefault)
  employee.forEach(row => {
    employeeNumberIDs.push(row.employeeNumberID)
    if (row.payRetentionID) {
      payRetentionIDs.push(row.payRetentionID)
    } else if (row.employeePayOutID) {
      employeePayOutIDs.push(row.employeePayOutID)
    }
  })
  const employeeNumbers = UB.Repository('hr_employeeNumberSR')
    .attrs(['ID', 'tabNum', 'employeeID.fullFIO', 'employeeID.firstName', 'employeeID.lastName', 'employeeID.middleName',
      'employeeID.taxCode', 'employeeID.empTaxCodeType', 'personalAccount', 'bankSubAccount'])
    .where('ID', 'in', employeeNumberIDs)
    .orderBy('ID').selectAsObject()
  const payRetention = payRetentionIDs.length ? UB.Repository('hr_payRetention').attrs(['ID', 'payOutID', 'exportMethodID', 'personalAccount', 'personalSubAccount', 'projectCode', 'branchCode'])
    .where('ID', 'in', payRetentionIDs).misc({ __allowSelectSafeDeleted: true }).selectAsObject({ 'exportMethodID': 'exportMethod' }) : []
  const employeePayOut = employeePayOutIDs.length ? UB.Repository('hr_employeePayOut').attrs(['ID', 'payOutID', 'exportMethodID', 'personalAccount', 'personalSubAccount', 'projectCode', 'branchCode'])
    .where('ID', 'in', employeePayOutIDs).misc({ __allowSelectSafeDeleted: true }).selectAsObject({ 'exportMethodID': 'exportMethod', 'payOutID.name': 'name' }) : []
  const exportData = {}
  employee.forEach(row => {
    let add = false
    if (row.payRetentionID) {
      const payRetentionData = payRetention.find(o => o.ID === row.payRetentionID)
      add = true
      if (payRetentionData) {
        if (payRetentionData.personalAccount) {
          row.personalAccount = payRetentionData.personalAccount
        }
        if (payRetentionData.personalSubAccount) {
          row.subAccount = payRetentionData.personalSubAccount
        }
        row.branch = payRetentionData.branchCode
        row.zpcod = payRetentionData.projectCode
        let exportMethod = payRetentionData.exportMethod
        let payOutID = '1'
        if (!exportMethod && payRetentionData.payOutID) {
          const payOutData = payOut.find(o => o.ID === payRetentionData.payOutID)
          if (payOutData) {
            exportMethod = payOutData.exportMethod
            payOutID = payOutData.ID
            if (!row.branch) { row.branch = payOutData.branchCode }
            if (!row.zpcod) { row.zpcod = payOutData.projectCode }
          }
        }
        if (!exportMethod && row.payOutID) {
          const payOutData = payOut.find(o => o.ID === row.payOutID)
          if (payOutData) {
            exportMethod = payOutData.exportMethod
            payOutID = row.payOutID
            row.branch = payOutData.branchCode
            row.zpcod = payOutData.projectCode
          }
        }
        if (!exportMethod && payOutDef && payOutDef.exportMethod) {
          exportMethod = payOutDef.exportMethod
          payOutID = payOutDef.ID
          if (!row.branch) { row.branch = payOutDef.branchCode }
          if (!row.zpcod) { row.zpcod = payOutDef.projectCode }
        }

        if (mParams.metodExport === 'all' || mParams.metodExport === exportMethod) {
          if (exportMethod) {
            if (!exportData[`${exportMethod}_${payOutID}`]) {
              exportData[`${exportMethod}_${payOutID}`] = []
            }
            exportData[`${exportMethod}_${payOutID}`].push(row)
          } else {
            empMissingMetods.push(row.employeeDescription)
          }
        } else {
          add = true
        }
      }
    } else if (row.employeePayOutID) {
      let exportMethod
      const employeePayOutData = employeePayOut.find(o => o.ID === row.employeePayOutID)
      let payOutID = '1'
      add = true
      if (employeePayOutData) {
        if (employeePayOutData.personalAccount) {
          row.personalAccount = employeePayOutData.personalAccount
        }
        if (employeePayOutData.personalSubAccount) {
          row.subAccount = employeePayOutData.personalSubAccount
        }
        row.branch = employeePayOutData.branchCode
        row.zpcod = employeePayOutData.projectCode
        exportMethod = employeePayOutData.exportMethod

        if (!exportMethod && employeePayOutData.payOutID) {
          const payOutData = payOut.find(o => o.ID === employeePayOutData.payOutID)
          if (payOutData) {
            exportMethod = payOutData.exportMethod
            payOutID = payOutData.ID
            if (!row.branch) { row.branch = payOutData.branchCode }
            if (!row.zpcod) { row.zpcod = payOutData.projectCode }
          }
        }
      }

      if (!exportMethod && row.payOutID) {
        const payOutData = payOut.find(o => o.ID === row.payOutID)
        if (payOutData) {
          exportMethod = payOutData.exportMethod
          payOutID = row.payOutID
          row.branch = payOutData.branchCode
          row.zpcod = payOutData.projectCode
        }
      }
      if (!exportMethod && payOutDef && payOutDef.exportMethod) {
        exportMethod = payOutDef.exportMethod
        payOutID = payOutDef.ID
        if (!row.branch) { row.branch = payOutDef.branchCode }
        if (!row.zpcod) { row.zpcod = payOutDef.projectCode }
      }
      if (mParams.metodExport === 'all' || mParams.metodExport === exportMethod) {
        if (exportMethod) {
          if (!exportData[`${exportMethod}_${payOutID}`]) {
            exportData[`${exportMethod}_${payOutID}`] = []
          }
          exportData[`${exportMethod}_${payOutID}`].push(row)
        } else {
          empMissingMetods.push(row.employeeDescription)
        }
      } else {
        add = true
      }
    } else if (row.payOutID) {
      const payOutData = payOut.find(o => o.ID === row.payOutID)
      if (payOutData) {
        let exportMethod = payOutData.exportMethod
        row.branch = payOutData.branchCode
        row.zpcod = payOutData.projectCode
        add = true
        if (mParams.metodExport === 'all' || mParams.metodExport === exportMethod) {
          if (exportMethod) {
            if (!exportData[`${exportMethod}_${payOutData.ID}`]) {
              exportData[`${exportMethod}_${payOutData.ID}`] = []
            }
            exportData[`${exportMethod}_${payOutData.ID}`].push(row)
          } else {
            empMissingMetods.push(row.employeeDescription)
          }
        } else {
          add = true
        }
      }
    }
    if (!add && mParams.metodExport === 'all') {
      if (mParams.payOutID) {
        const payOutData = payOut.find(o => o.ID === mParams.payOutID)
        if (payOutData) {
          let exportMethod = payOutData.exportMethod
          if (exportMethod) {
            if (!exportData[`${exportMethod}_${payOutData.ID}`]) {
              exportData[`${exportMethod}_${payOutData.ID}`] = []
            }
            row.branch = payOutData.branchCode
            row.zpcod = payOutData.projectCode
            exportData[`${exportMethod}_${payOutData.ID}`].push(row)
          } else {
            empMissingMetods.push(row.employeeDescription)
          }
        }
      } else if (payOutDef) {
        const exportMethod = payOutDef.exportMethod
        if (exportMethod) {
          if (!exportData[`${exportMethod}_${payOutDef.ID}`]) {
            exportData[`${exportMethod}_${payOutDef.ID}`] = []
          }
          row.branch = payOutDef.branchCode
          row.zpcod = payOutDef.projectCode
          exportData[`${exportMethod}_${payOutDef.ID}`].push(row)
        } else {
          empMissingMetods.push(row.employeeDescription)
        }
      } else {
        empMissingMetods.push(row.employeeDescription)
      }
    }
  })
  const orderDate = mParams.orderDate ? (mParams.typeExport === 'dbf' ? dateService.formatDate(dateService.shiftDate(mParams.orderDate), 'yyyymmdd') : dateService.shiftDate(mParams.orderDate)) : null
  Object.keys(exportData).forEach(expData => {
    const data = []
    const exportParams = expData.split('_')
    const exportMethod = exportParams[0]
    const payOutName = (exportParams[1] && exportParams[1] !== '1') ? (payOut.find(o => o.ID === Number(exportParams[1])) || { name: '' }).name : null
    exportData[expData].forEach((row, idx) => {
      const emp = accrualService.binarySearch(employeeNumbers, row.employeeNumberID, 0, employeeNumbers.length - 1, 'ID')
      if (row.personalAccount) {
        emp.personalAccount = row.personalAccount
      }
      if (row.bankSubAccount) {
        emp.bankSubAccount = row.bankSubAccount
      }
      if (row.subAccount) {
        emp.subAccount = row.subAccount
      } else {
        emp.subAccount = emp.bankSubAccount
      }
      data.push(getExportRow(exportMethod, {
        branch: row.branch,
        zpcod: row.zpcod,
        rlcod: mParams.rlcod,
        orderDate
      }, emp, row, idx))
    })
    files.push({
      data: mParams.typeExport === 'dbf'
        ? generateBase64Str(dbfBuilder.structure(data, dataStructure[exportMethod], iconv.encode, 'cp866').buffer)
        : generateCsvStr(data, dataStructure[exportMethod]),
      fileName: `${dateService.formatDate(dateService.currentDate(), 'yyyymmdd')}_${mParams.description || ''}${payOutName ? `_${payOutName}` : ''}`
    })
  })
  mParams.files = JSON.stringify(files)
  mParams.empMissingMetods = JSON.stringify(empMissingMetods)
}

me.generateXLSXFSS = function (ctx) {
  const mParams = ctx.mParams
  const viewData = JSON.parse(mParams.viewData)
  const data = viewData.accrualDataFSS
  const doc = new tpManager({
    document: {
      margin: {
        top: 10,
        right: 8,
        bottom: 8,
        left: 20
      },
      align: 'left',
      orientation: '2',
      bottomColontitle: {
        font: {
          name: 'TimesNewRoman',
          type: 'Normal',
          size: 10
        },
        height: 8
      }
    },
    headerFooter: {
      baseStyle: 'baseBlock',
      font: { size: 10, name: 'TimesNewRoman' },
      align: 'left',
      wordWrap: true,
      allowEmpty: true,
      columns: {
        verticalAlign: 'center',
        config: [
          { width: 15 },
          { width: 15 },
          { width: 15 },
          { width: 15 },
          { width: 15 },
          { width: 15 },
          { width: 15 },
          { width: 15 },
          { width: 15 },
          { width: 15 },
          { width: 15 },
          { width: 15 },
          { width: 15 },
          { width: 15 },
          { width: 15 }
        ]
      }
    },
    table: {
      baseStyle: 'baseBlock',
      font: { size: 10, name: 'TimesNewRoman' },
      align: 'left',
      wordWrap: true,
      allowEmpty: true,
      border: {
        left: 0.1,
        top: 0.1,
        bottom: 0.1,
        right: 0.1
      },
      columns: {
        verticalAlign: 'center',
        config: [
          { width: 15 },
          { width: 15 },
          { width: 15 },
          { width: 15 },
          { width: 15 },
          { width: 15 },
          { width: 15 },
          { width: 15 },
          { width: 15 },
          { width: 15 },
          { width: 15 },
          { width: 15 },
          { width: 15 },
          { width: 15 },
          { width: 15 }
        ]
      }
    }
  }, 'xlsx')
  const styleCap = { font: { size: 10, type: 'Bold' }, align: 'center', padding: '2px', colSpan: 15 }
  const styleTableHeader = { font: { size: 10, type: 'Bold' }, align: 'center', padding: '2px', rowSpan: 2, border: { left: 0.1, top: 0.1, bottom: 0.1, right: 0.1 } }
  /* const tableCellStyle = { border: '1px solid #000', padding: '2px', align: 'right' } */
  let header = []
  let table = []
  let footer = []
  createHeaderXLSXFSS(header, styleCap, viewData)
  createTableXLSXFSS(table, styleTableHeader, data)
  createFooterXLSXFSS(footer, viewData)
  doc.table(header, 'headerFooter')
  doc.table(table, 'table')
  doc.table(footer, 'headerFooter')
  mParams.data = JSON.stringify(generateBase64Str(doc.getDocument()))
}

function createHeaderXLSXFSS (table, styleCap, viewData) {
  table.push([
    {
      content: viewData.orgName,
      colSpan: 15,
      style: { font: { size: 10, type: 'Bold' }, align: 'center', padding: '2px', colSpan: 15 }
    }
  ])
  table.push([
    {
      content: 'Розрахунково-платіжна відомість виплати коштів СС',
      colspan: 15,
      style: { font: { size: 10, type: 'Bold' }, align: 'center', padding: '2px', colSpan: 15 }
    }
  ])
  table.push([
    { content: `${viewData.orderDate || ''} № ${viewData.orderNumber || ''} дата виплати ${viewData.paymentDate || ''}`, style: styleCap }
  ])
  table.push([
    { content: viewData.periodSalary || '', style: { font: { size: 10 }, align: 'center', padding: '2px', colSpan: 15 } }
  ])
  table.push([
    { content: `${viewData.formattingStartDate || ''}, ${viewData.formattingStartTime || ''}`, style: styleCap }
  ])
}

function createTableXLSXFSS (table, styleTableHeader, data) {
  table.push([
    { content: '№', style: styleTableHeader },
    { content: 'Таб.№', style: styleTableHeader },
    { content: 'Прізвище І.Б.', style: styleTableHeader },
    { content: 'Обліковий період', style: { font: { size: 10, type: 'Bold' }, align: 'center', padding: '2px', rowSpan: 2, border: { left: 0.1, top: 0.1, bottom: 0.1, right: 0.1 } } },
    { content: 'Лікарняний лист', style: { colSpan: 2, rowSpan: 1, border: { left: 0.1, top: 0.1, bottom: 0.1, right: 0.1 }, font: { size: 10, type: 'Bold' }, align: 'center', padding: '2px' } },
    { content: 'Дні', style: { border: { left: 0.1, top: 0.1, bottom: 0.1, right: 0.1 }, colSpan: 2, rowSpan: 1, font: { size: 10, type: 'Bold' }, align: 'center', padding: '2px' } },
    { content: 'Середній заробіток', style: styleTableHeader },
    { content: 'Відсоток оплати', style: styleTableHeader },
    { content: 'Сума лікарняного', style: styleTableHeader },
    { content: 'Сума ПДФО', style: styleTableHeader },
    { content: 'Військовий збір', style: styleTableHeader },
    { content: 'До виплати', style: styleTableHeader },
    { content: 'ЄСВ', style: styleTableHeader }
  ])
  table.push([
    { content: 'Номер', style: { border: { left: 0.1, top: 0.1, bottom: 0.1, right: 0.1 }, colSpan: 1, rowSpan: 1, font: { size: 10, type: 'Bold' }, align: 'center', padding: '2px' } },
    { content: 'Дата', style: { border: { left: 0.1, top: 0.1, bottom: 0.1, right: 0.1 }, colSpan: 1, rowSpan: 1, font: { size: 10, type: 'Bold' }, align: 'center', padding: '2px' } },
    { content: 'Оплачувані', style: { border: { left: 0.1, top: 0.1, bottom: 0.1, right: 0.1 }, colSpan: 1, rowSpan: 1, font: { size: 10, type: 'Bold' }, align: 'center', padding: '2px' } },
    { content: 'Календарні', style: { border: { left: 0.1, top: 0.1, bottom: 0.1, right: 0.1 }, colSpan: 1, rowSpan: 1, font: { size: 10, type: 'Bold' }, align: 'center', padding: '2px' } }
  ])
  data.forEach(row => {
    table.push([
      { content: row.rowNum || '', style: { align: 'center', border: { left: 0.1, top: 0.1, bottom: 0.1, right: 0.1 } } },
      { content: row.tabNum || '', style: { align: 'center', border: { left: 0.1, top: 0.1, bottom: 0.1, right: 0.1 } } },
      { content: row.fullFIO || '', style: { border: { left: 0.1, top: 0.1, bottom: 0.1, right: 0.1 } } },
      { content: row.periodSalaryName || '', style: { format: '00.0000', align: 'right', border: { left: 0.1, top: 0.1, bottom: 0.1, right: 0.1 } } },
      { content: row.sickSeriaNumber || '', style: { align: 'right', border: { left: 0.1, top: 0.1, bottom: 0.1, right: 0.1 } } },
      { content: row.sickDate || '0', style: { align: 'right', border: { left: 0.1, top: 0.1, bottom: 0.1, right: 0.1 } } },
      { content: row.accPayDays || '0', style: { align: 'right', border: { left: 0.1, top: 0.1, bottom: 0.1, right: 0.1 } } },
      { content: row.accCalendarDays || '0', style: { align: 'right', border: { left: 0.1, top: 0.1, bottom: 0.1, right: 0.1 } } },
      { content: row.accBaseSum || '0', style: { align: 'right', border: { left: 0.1, top: 0.1, bottom: 0.1, right: 0.1 } } },
      { content: row.accRate || '0', style: { align: 'right', border: { left: 0.1, top: 0.1, bottom: 0.1, right: 0.1 } } },
      { content: row.accPaySum || '0', style: { align: 'right', border: { left: 0.1, top: 0.1, bottom: 0.1, right: 0.1 } } },
      { content: row.incomeTaxSum || '0', style: { align: 'right', border: { left: 0.1, top: 0.1, bottom: 0.1, right: 0.1 } } },
      { content: row.militaryTaxSum || '0', style: { align: 'right', border: { left: 0.1, top: 0.1, bottom: 0.1, right: 0.1 } } },
      { content: row.payRollDtPaySum || '0', style: { align: 'right', border: { left: 0.1, top: 0.1, bottom: 0.1, right: 0.1 } } },
      { content: row.socialTaxSum || '0', style: { align: 'right', border: { left: 0.1, top: 0.1, bottom: 0.1, right: 0.1 } } }
    ])
  })
}

function createFooterXLSXFSS (table, viewData) {
  table.push([
    { content: '', style: { colSpan: 4 } },
    { content: viewData.mainChiefPosName, style: { height: 25, colSpan: 2 } },
    { content: '_______________', style: {} },
    { content: viewData.mainChiefFullFIO, style: { height: 25, colSpan: 2 } }
  ])
  table.push([
    { content: '', style: { height: 40, colSpan: 4 } },
    { content: viewData.accChiefPosName, style: { height: 25, colSpan: 2 } },
    { content: '_______________', style: { height: 40 } },
    { content: viewData.accChiefFullFIO, style: { height: 25, colSpan: 2 } }
  ])
}

me.generateXLSX = function (ctx) {
  const mParams = ctx.mParams
  const viewData = JSON.parse(mParams.viewData)
  const exportFrom = mParams.exportFrom
  const doc = new tpManager({
    document: {
      margin: {
        top: 10,
        right: 8,
        bottom: 8,
        left: 20
      },
      align: 'left',
      orientation: '2',
      bottomColontitle: {
        font: {
          name: 'TimesNewRoman',
          type: 'Normal',
          size: 10
        },
        height: 8
      }
    },
    docTable: {
      baseStyle: 'baseBlock',
      font: { size: 10, name: 'TimesNewRoman' },
      align: 'left',
      wordWrap: true,
      allowEmpty: true,
      columns: {
        verticalAlign: 'center',
        config: (exportFrom === 'hr_payFundSourceBank') ? [{ width: 30 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 30 }, { width: 30 }, { width: 20 }] : [{ width: 30 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 30 }, { width: 30 }, { width: 20 }]
      }
    }
  }, 'xlsx')

  const styleCap = { font: { size: 10, type: 'Bold' }, align: 'center' }
  let table = []
  if (exportFrom === 'hr_payFundSourceBank') {
    table.push([
      { content: 'Працівник', style: styleCap },
      { content: 'Всього нараховано', style: styleCap },
      { content: 'Всього утримано', style: styleCap },
      { content: 'Вже виплачено', style: styleCap },
      { content: 'Нараховано', style: styleCap },
      { content: 'Утримано', style: styleCap },
      { content: 'Планова сума виплати', style: styleCap },
      { content: 'До виплати', style: styleCap },
      { content: 'Отримувач', style: styleCap },
      { content: 'Посада', style: styleCap },
      { content: 'Підрозділ', style: styleCap },
      { content: 'Примітка', style: styleCap }
    ])
    viewData.forEach(row => {
      table.push([
        { content: row.employee || '' },
        { content: row.baseSumAll || '0', style: { align: 'right', format: '0.00' } },
        { content: row.taxSumAll || '0', style: { align: 'right', format: '0.00' } },
        { content: row.rollSumAll || '0', style: { align: 'right', format: '0.00' } },
        { content: row.baseSum || '0', style: { align: 'right', format: '0.00' } },
        { content: row.taxSum || '0', style: { align: 'right', format: '0.00' } },
        { content: row.planPaySum || '0', style: { align: 'right', format: '0.00' } },
        { content: row.paySum || '0', style: { align: 'right', format: '0.00' } },
        { content: row.contractor || '' },
        { content: row.posName || '' },
        { content: row.depName || '' },
        { content: row.reason || '' }
      ])
    })
  } else if (exportFrom === 'hr_payFSSBank') {
    table.push([
      { content: 'Працівник', style: styleCap },
      { content: 'Нараховано', style: styleCap },
      { content: 'Утримано', style: styleCap },
      { content: 'До виплати', style: styleCap },
      { content: 'Виплачено', style: styleCap },
      { content: 'Шаблон виплати', style: styleCap },
      { content: 'Депоновано', style: styleCap },
      { content: 'Підрозділ', style: styleCap },
      { content: 'Посада', style: styleCap }
    ])
    viewData.forEach(row => {
      table.push([
        { content: row.employee || '' },
        { content: row.baseSum || '0', style: { align: 'right', format: '0.00' } },
        { content: row.taxSum || '0', style: { align: 'right', format: '0.00' } },
        { content: row.paySum || '0', style: { align: 'right', format: '0.00' } },
        { content: row.paidSum || '0', style: { align: 'right', format: '0.00' } },
        { content: row.payOutName || '' },
        { content: row.depSum || '0', style: { align: 'right', format: '0.00' } },
        { content: row.depName || '' },
        { content: row.posName || '' }
      ])
    })
  } else if (exportFrom === 'hr_payRollWithinBank') {
    table.push([
      { content: 'Працівник', style: styleCap },
      { content: 'Нараховано за документами', style: styleCap },
      { content: 'Нараховано', style: styleCap },
      { content: 'Планова сума виплати', style: styleCap },
      { content: 'Утримано', style: styleCap },
      { content: 'До виплати', style: styleCap },
      { content: 'Шаблон виплати', style: styleCap },
      { content: 'Підрозділ', style: styleCap },
      { content: 'Посада', style: styleCap }
    ])
    viewData.forEach(row => {
      table.push([
        { content: row.employee || '' },
        { content: row.docSum || '0', style: { align: 'right', format: '0.00' } },
        { content: row.baseSum || '0', style: { align: 'right', format: '0.00' } },
        { content: row.planPaySum || '0', style: { align: 'right', format: '0.00' } },
        { content: row.taxSum || '0', style: { align: 'right', format: '0.00' } },
        { content: row.paySum || '0', style: { align: 'right', format: '0.00' } },
        { content: row.payOutName || '' },
        { content: row.depName || '' },
        { content: row.posName || '' }
      ])
    })
  } else {
    table.push([
      { content: 'Працівник', style: styleCap },
      { content: 'Нараховано', style: styleCap },
      { content: 'Утримано', style: styleCap },
      { content: 'Планова сума виплати', style: styleCap },
      { content: 'До виплати', style: styleCap },
      { content: 'Шаблон виплати', style: styleCap },
      { content: 'Отримувач', style: styleCap },
      { content: 'Посада', style: styleCap },
      { content: 'Підрозділ', style: styleCap },
      { content: 'Примітка', style: styleCap }
    ])
    viewData.forEach(row => {
      table.push([
        { content: row.employee || '' },
        { content: row.baseSum || '0', style: { align: 'right', format: '0.00' } },
        { content: row.taxSum || '0', style: { align: 'right', format: '0.00' } },
        { content: row.planPaySum || '0', style: { align: 'right', format: '0.00' } },
        { content: row.paySum || '0', style: { align: 'right', format: '0.00' } },
        { content: row.payOutName || '' },
        { content: row.contractor || '' },
        { content: row.posName || '' },
        { content: row.depName || '' },
        { content: row.reason || '' }
      ])
    })
  }
  doc.table(table, 'docTable')
  mParams.data = JSON.stringify(generateBase64Str(doc.getDocument()))
}

me.search = function (ctx) {
  const mParams = ctx.mParams
  let runsql
  const limitedAccess = !App.domainInfo.isEntityMethodsAccessible('hr_employeeNumber', 'employeeLimitedAccess')
  let sqlBuilder = {
    text: `SELECT {0} {1}
      FROM hr_payRoll pr
INNER JOIN hr_payEl pe ON pe.ID = pr.payElID
INNER JOIN hr_dictPeriod dps ON dps.ID = pr.periodSalaryID
INNER JOIN hr_dictPeriod dpc ON dpc.ID = pr.periodCalcID
LEFT JOIN hr_dictPeriod dpe ON dpe.ID = pr.periodEntryID
      {2}
      {3}
      {4}
      {5}`,
    clauses: {},
    whereParams: {},
    aliases: {
      orderNumber: { field: 'pr.orderNumber' },
      orderDate: { field: 'pr.orderDate' },
      description: { field: 'pr.description' },
      paymentMethod: { field: 'pr.paymentMethod' },
      totalAmount: { field: `(SELECT COUNT(*) FROM hr_payRollDt dt JOIN hr_employeeNumber en ON en.ID = dt.employeeNumberID 
      WHERE dt.payRollID = pr.ID AND dt.mi_deleteDate >= '9999-12-31' AND reason = '0' ${limitedAccess ? ` AND (en.limitedAccess = 0 OR pr.orderType = 'hr_payFSSBank') ` : ''})` },
      totalPaySum: { field: `(SELECT SUM(dt.paySum) FROM hr_payRollDt dt  JOIN hr_employeeNumber en ON en.ID = dt.employeeNumberID 
      WHERE dt.payRollID = pr.ID AND dt.mi_deleteDate >= '9999-12-31' AND reason = '0' ${limitedAccess ? ` AND (en.limitedAccess = 0 OR pr.orderType = 'hr_payFSSBank') ` : ''})` },
      payElName: { field: 'pe.name' },
      orderState: { field: 'pr.orderState' },
      periodSalaryName: { field: 'dps.name' },
      periodCalcName: { field: 'dpc.name' },
      periodEntryName: { field: 'dpe.name' },
      orderType: { field: 'pr.orderType' },
      organizationID: { field: 'pr.organizationID' },
      ID: { field: 'pr.ID' },
      periodCalcID: { field: 'pr.periodCalcID' }
    },
    params: {}
  }

  const userOrgs = UB.Session.uData.userOrg
  if (!(userOrgs && userOrgs.length && userOrgs.includes(mParams.whereList.organizationID.value))) {
    mParams.whereList.organizationID = {
      expression: '[organizationID]',
      condition: 'equal',
      isExternal: true,
      value: 0
    }
  }

  sqlBuilder.clauses = selectService.getClauses(ctx,
    sqlBuilder.params,
    sqlBuilder.aliases,
    '',
    '',
    true)
  sqlBuilder.clauses.orderClause = sqlBuilder.clauses.orderClause || 'ORDER BY pr.docDate DESC'
  sqlBuilder.clauses.whereClause = `${sqlBuilder.clauses.whereClause} AND pr.mi_deleteDate >= '9999-12-31'`
  sqlBuilder.clauses.whereParams.userOrgs = userOrgs

  if (mParams.options && mParams.options.totalRequired) {
    runsql = UB.format(sqlBuilder.text, '', 'count(*)', sqlBuilder.clauses.whereClause, '', '', '')
    ctx.dataStore.runSQL(runsql, sqlBuilder.clauses.whereParams)
    if (!ctx.dataStore.eof) {
      mParams.__totalRecCount = ctx.dataStore.get(0)
    }
  }
  runsql = UB.format(sqlBuilder.text,
    sqlBuilder.clauses.limitClause,
    sqlBuilder.clauses.fieldList,
    sqlBuilder.clauses.whereClause,
    '',
    sqlBuilder.clauses.orderClause,
    sqlBuilder.clauses.maxLimitClause)

  ctx.dataStore.runSQL(runsql, sqlBuilder.clauses.whereParams)
  ctx.inherite = false
  return true
}
