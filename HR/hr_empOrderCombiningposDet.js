const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const ebs = require('../AC/modules/entityServices/entityBaseService')
const orderService = require('../HR/modules/orderService')
const moment = require('moment')
const dateService = require('../AC/modules/dataServices/dateService')
const timService = require('../HR/modules/timService')
const periodService = require('../HR/modules/periodService')
const calcService = require('../HR/modules/calcService')
const settingsService = require('../AC/modules/entityServices/settingsService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')
const employeeService = require('../HR/modules/employeeService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)
me.on('insert:after', afterInsertUpdate)
me.on('update:after', afterInsertUpdate)

me.entity.addMethod('checkTabNum')
me.entity.addMethod('doPosting')

function setDescription (ctx) {
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  const execParams = ctx.mParams.execParams

  let attr = ctx.dataStore.entity.attributes['description']
  if (attr) {
    // execParams.description = ebs.getCompositeAttributeValue(ctx, 'description', cs.compositeFields, cs.compositeSeparator, false)
    const tarifCode = UB.Repository('hr_dictTarifCoeff').attrs('code').where('ID', '=', execParams.dictTarifCoeffID || instanceData.dictTarifCoeffID || -1).selectScalar() || '-'
    const wsName = UB.Repository('hr_workSchedule').attrs('name').where('ID', '=', execParams.workScheduleID || instanceData.workScheduleID || -1).selectScalar() || '-'
    const ecbName = UB.Repository('hr_dictCategoryECB').attrs('name').where('ID', '=', execParams.dictCategoryECBID || instanceData.dictCategoryECBID || -1).selectScalar() || '-'
    execParams.description = UB.i18n(`ставок {0}; розряд {1}; графік {2}; кат.заст.ос. {3}`, execParams.mtCount || instanceData.mtCount, tarifCode, wsName, ecbName)
  }
  execParams.title = ebs.getCompositeAttributeValue(ctx, 'title', ['departmentID.name', 'positionID.name', 'tabNum'], ' ', false)
  if (!execParams.description && !instanceData.description) {
    execParams.description = execParams.title
  }
  if (execParams.employeePositionID) {
    let pos = UB.Repository('hr_employeePositionS')
      .attrs([
        'description',
        'employeeID',
        'employeeID.firstName',
        'employeeID.lastName',
        'employeeID.middleName',
        'departmentID',
        'positionID',
        'posStaffName',
        'dictPositionID',
        'dictPositionID.name',
        'employeeNumberID',
        'depName'
      ])
      .where('ID', '=', execParams.employeePositionID)
      .select()
    if (pos.get('depName')) {
      execParams.title = `${pos.get('posStaffName') || pos.get['dictPositionID.name'] || ''} ${pos.get('depName')}`
    } else {
      execParams.title = `${pos.get('posStaffName') || pos.get['dictPositionID.name'] || ''}`
    }
    execParams.firstName = pos.get('employeeID.firstName')
    execParams.lastName = pos.get('employeeID.lastName')
    execParams.middleName = pos.get('employeeID.middleName')
    execParams.employeeID = pos.get('employeeID')
    execParams.employeeNumberID = pos.get('employeeNumberID')
  }
  if (!execParams.organizationID && !instanceData.organizationID && execParams.orderID) {
    let order = UB.Repository('hr_empOrder').attrs(['empOrderType', 'organizationID']).selectById(execParams.orderID)
    execParams.organizationID = order['organizationID']
  }
}

function beforeInsert (ctx) {
  global['hr_empOrderDet'].setItemIdx(ctx)
  ctx.mParams.method = 'insert'
  ebs.setDateTo(ctx)
  setDescription(ctx)
}

function beforeUpdate (ctx) {
  ebs.setDateTo(ctx)
  setDescription(ctx)
}

/**
 * Перевірити табельний номер
 * @param {object} ctx
 * @param {string} ctx.tabNum табельний номер
 * @param {number} ctx.organizationID організація
 * @param {number} ctx.ID Наказ про прийом на роботу. Деталь
 */
me.checkTabNum = function (ctx) {
  const execParams = ctx.mParams.execParams
  let tabNum = (execParams && execParams.tabNum) || ctx.mParams.tabNum
  const ID = (execParams && execParams.ID) || ctx.mParams.ID
  const organizationID = (execParams && execParams.organizationID) || ctx.mParams.organizationID

  if (!tabNum) {
    return
  }
  tabNum = String(tabNum)
  const allowSameTabNum = settingsService.getByCode('hrAllowSameTabNum', organizationID)
  const excludeEmployeeID = allowSameTabNum ? ctx.mParams.employeeID : null
  let info = UB.Repository('hr_employeeNumberS')
    .attrs('description')
    .where('tabNum', '=', tabNum)
    .whereIf(excludeEmployeeID, 'employeeID', '!=', excludeEmployeeID)
    .where('orgID', '=', organizationID)
    .selectScalar()
  if (info) {
    ctx.mParams.info = UB.i18n(`Табельний номер вже зайнятий ({0})`, info)
    return
  }
  info = UB.Repository(__entityName)
    .attrs(['orderID.orderDate', 'orderID.orderNumber'])
    .where('tabNum', '=', tabNum)
    .where('organizationID', '=', organizationID)
    .where('ID', '<>', ID).select()
  if (!info.eof) {
    ctx.mParams.info = UB.i18n(`Табельний номер вже введений у наказі про сумісництво та суміщення № {0} від {1}`, info.get(1), info.get(0) ? moment(info.get(0)).format('DD.MM.YYYY') : '""')
  }
  info = UB.Repository('hr_empOrderAppointDet')
    .attrs(['orderID.orderDate', 'orderID.orderNumber'])
    .where('tabNum', '=', tabNum)
    .where('organizationID', '=', organizationID)
    .where('ID', '<>', ID).select()
  if (!info.eof) {
    ctx.mParams.info = UB.i18n(`Табельний номер вже введений у наказі про призначення № {0} від {1}`, info.get(1), info.get(0) ? moment(info.get(0)).format('DD.MM.YYYY') : '""')
  }
}

me.doPosting = ({ item, order, saved, isImportOperation, currentPeriod }) => {
  const para = UB.Repository(item.mi_unityEntity)
    .attrs(['ID', 'tabNum', 'dateFrom', 'dateTo', 'isResponsible', 'dictStaffCatID', 'employeePositionID',
      'employeePositionID.mi_deleteDate', 'employeePositionID.employeeNumberID', 'employeePositionID.dictCategoryECBID',
      'employeePositionID.dictFundSourceID', 'employeePositionID.accountID', 'employeePositionID.description',
      'organizationID.mi_data_id', 'departmentID.mi_data_id', 'positionID', 'positionID.state', 'positionID.mi_data_id',
      'positionID.mi_dateFrom', 'positionID.mi_dateTo', 'employeeID', 'accrualSum', 'payElID', 'dictCategoryECBID',
      'workScheduleID', 'workerType', 'workPlace', 'contractType', 'mtCount', 'dictContractKindID', 'dictTarifCoeffID',
      'positionID.positionCategory.name', 'positionID.positionType', 'positionID.name',
      'orderID', 'orderID.description', 'positionID.psCategory.name', 'employeeID.fullFIO', 'positionID.fullName',
      'dictFundSourceID', 'positionID.dictFundSourceID', 'dictCostTypeID', 'dictCostTypeID.accountID', 'dictEmpCategoryID',
      'posNameAddition', 'dictPositionID', 'positionID.fullNameNom', 'positionID.fullNameNomF', 'employeeID.sexType'
    ])
    .selectById(item.ID)
  para.dateFrom = dateService.shiftDate(para.dateFrom)
  para.dateTo = dateService.shiftDate(para.dateTo)

  if (new Date(para['employeePositionID.mi_deleteDate']).getFullYear() !== 9999) {
    throw new UB.UBAbort(`<<<${UB.i18n('Неможливо провести наказ - призначення {0} було видалене, можливо, внаслідок розпроведення наказу, в якому воно було створене. Виберіть ще раз', para['employeePositionID.description'])}>>>`)
  }

  orderService.checkIsParaOk(para)
  if (!para.payElID) {
    throw new UB.UBAbort(`<<<${UB.i18n('{0}. Не вказано вид оплати для окладу, проведення неможливе', para['employeeID.fullFIO'])}>>>`)
  }
  if (!para['dictFundSourceID']) para['dictFundSourceID'] = para['positionID.dictFundSourceID']
  para.employeeNumberID = orderService.insertByOrder({
    store: 'hr_employeeNumber',
    params: {
      employeeID: para.employeeID,
      dateFrom: para.dateFrom,
      dateTo: '#maxdate',
      tabNum: para.tabNum,
      orgID: para['organizationID.mi_data_id'],
      orderID: order.ID,
      paraID: para.ID,
      mainEmpNumberID: para['employeePositionID.employeeNumberID'],
      changeOrderID: null
    },
    saved: saved
  })

  para['accountID'] = para['dictCostTypeID.accountID']
  let coa = global['COA']
  if (coa && coa.dims['ac_dictCostType']) {
    para.d0 = coa.dims['ac_dictCostType'].ID
    para.d0Value = para['dictCostTypeID']
  }
  const isUseSexType = settingsService.getByCode('hrUseSexTypeInOrders', order.organizationID)
  const workPosition = (isUseSexType && para['employeeID.sexType'] === 'W' ? para['positionID.fullNameNomF'] : para['positionID.fullNameNom']) || para['positionID.fullName']

  if (!para.dictCategoryECBID) para.dictCategoryECBID = para['employeePositionID.dictCategoryECBID']
  if (!para.dictFundSourceID) para.dictFundSourceID = para['employeePositionID.dictFundSourceID']
  if (!para.accountID) para.accountID = para['employeePositionID.accountID']
  para.changeOrderID = null
  para.appointOrder = para['orderID.description']
  para.appointReason = UB.i18n('Суміщення')
  para.planDateTo = null
  const newEmployeePositionID = orderService.createEmployeePosition({
    para: para,
    saved: saved,
    isCreateWorkBookRecord: false,
    isImportOperation: isImportOperation,
    mParams: {
      isOrgAppoint: true,
      positionCategory: para['positionID.positionType'] === '1' ? para['positionID.psCategory.name'] : null,
      positionType: para['positionID.positionType'],
      workPosition
    }
  })
  /*
  orderService.updateByOrder({
    store: item.mi_unityEntity,
    params: {
      ID: para.ID,
      employeePositionID: newEmployeePositionID,
      employeeNumberID: para.employeeNumberID
    },
    saved: saved,
    oldValues: {
      employeePositionID: para.employeePositionID,
      employeeNumberID: para.employeeNumberID
    }
  })
  */
  const dictFundSource = UB.Repository('hr_empOrderFundSource')
    .attrs(['dictFundSourceID', 'mtCount'])
    .where('paraID', '=', para.ID)
    .selectAsObject()
  dictFundSource.forEach(row => {
    orderService.insertByOrder({
      store: 'hr_empPosFundSource',
      params: {
        employeePositionID: newEmployeePositionID,
        employeeNumberID: para.employeeNumberID,
        dictFundSourceID: row.dictFundSourceID,
        mtCount: row.mtCount || 0
      },
      saved: saved
    })
  })

  const dictTimeCost = UB.Repository('hr_dictTimeCost').attrs(['ID']).where('[code]', '=', entityBaseService.langCodei18n('Ні')).limit(1).selectScalar()
  const dictTimeCostNotWork = UB.Repository('hr_dictTimeCost').attrs(['ID']).where('[code]', '=', entityBaseService.langCodei18n('НіПр')).limit(1).selectScalar()
  const dateFrom = dateService.shiftDate(para.dateFrom)
  // const period = periodService.getPeriodOnDate(para['organizationID.mi_data_id'], dateFrom)
  if (!para.isNewTabNum) {
    if (currentPeriod && currentPeriod.ID && (dictTimeCost || dictTimeCostNotWork)) {
      timService.cancelTimeSheetByTimeCost(para.employeeNumberID, currentPeriod, [dictTimeCost || 0, dictTimeCostNotWork || 0], order.ID, dateFrom)
    }
  }

  // Нарахування
  orderService.createOrderAccrual({ para: para, saved: saved, isClosePrev: true, skipAutoCalcCondition: true, isAddMethod74: true })
  employeeService.updateEmployeeAddPersonDescription(para.employeeNumberID)
  calcService.addCalcTimeSheetQueue({ employeeNumberID: para.employeeNumberID, entityName: 'hr_empOrderCombiningposDet' })
}

function afterInsertUpdate (ctx) {
  orderService.saveOrderFundSource(ctx)
}
