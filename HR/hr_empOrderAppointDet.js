const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const ebs = require('../AC/modules/entityServices/entityBaseService')
const moment = require('moment')
const orderService = require('./modules/orderService')
const dateService = require('../AC/modules/dataServices/dateService')
const employeeService = require('./modules/employeeService')
const settingsService = require('../AC/modules/entityServices/settingsService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)
me.on('delete:before', beforeDelete)
me.on('insert:after', afterInsertUpdate)
me.on('update:after', afterInsertUpdate)

me.entity.addMethod('checkTabNum')
me.entity.addMethod('doPosting')
me.entity.addMethod('doCancelPosting')

function checkIsEmpty (paramName) {
  throw new UB.UBAbort(`<<<${UB.i18n('{0}.js -> doPosting() - not enough parameters ({1})', __entityName, paramName)}>>>`)
}

me.doPosting = function ({
  item = checkIsEmpty('item'),
  order = checkIsEmpty('order'),
  isImportOperation = checkIsEmpty('isImportOperation'),
  saved = checkIsEmpty('saved'),
  isSingle = false
}) {
  const para = UB.Repository(item.mi_unityEntity)
    .attrs(['ID', 'tabNum', 'dateFrom', 'dateTo', 'isResponsible', 'isRankAssign', 'isRankSave', 'raiseSalary', 'dictStaffCatID',
      'organizationID.mi_data_id', 'departmentID.mi_data_id', 'positionID', 'positionID.state', 'positionID.mi_data_id',
      'positionID.mi_dateFrom', 'positionID.mi_dateTo', 'employeeID', 'employeeID.sexType', 'accrualSum', 'payElID', 'workScheduleID', 'workerType',
      'workPlace', 'contractType', 'mtCount', 'dictContractKindID', 'dictTarifCoeffID', 'positionID.positionCategory.name',
      'positionID.positionType', 'positionID.name', 'positionID.fullName', 'positionID.fullNameNom', 'positionID.fullNameNomF', 'dictCategoryECBID',
      'dictRankID', 'dictRankID.code', 'orderID', 'orderID.description', 'dictAppointKindID.name', 'dateTrialEnd',
      'dictTrialPeriodID', 'positionID.psCategory.name', 'employeeID.fullFIO', 'isAppoint', 'isMove', 'dateStartWork',
      'appointmentOrderDate', 'appointmentOrderNumber', 'notStoreInWorkBook', 'srcOrganizationID.mi_data_id', 'isTransfer',
      'dictPositionID', 'isByHours', 'planHours', 'dictFundSourceID', 'positionID.dictFundSourceID', 'dictCostTypeID',
      'dictCostTypeID.accountID', 'addGuarant', 'parentEmpNumberID', 'parentEmpNumberID.dateTo', 'dictEmpCategoryID',
      'posNameAddition', 'vacPositionID', 'vacPositionID.employeeNumberID',
      'dictVehicleID'
    ])
    .selectById(item.ID)
  const isAppointMove = item.empOrderType === 'APPOINT_MOVE'

  if (dateService.shiftDate(para.dateFrom) <= dateService.shiftDate(para['parentEmpNumberID.dateTo'])) {
    throw new UB.UBAbort(`<<<${UB.i18n(`Дата призначення працівника {0} має бути більшою за {1}`, para['employeeID.fullFIO'], dateService.formatDate(para['parentEmpNumberID.dateTo']))}>>>`)
  }

  const mainPosition = employeeService.getMainPosition({
    orgID: para['organizationID.mi_data_id'],
    employeeID: para.employeeID,
    dateFrom: para.dateFrom,
    dateTo: para.dateTo
  })
  if (['1', '3'].includes(para.workPlace) && mainPosition) {
    throw new UB.UBAbort(`<<<${UB.i18n('У працівника {0} вже є призначення з місцем роботи - основне', para['employeeID.fullFIO'])}>>>`)
  }
  if (['1'].includes(para.workPlace) &&
    UB.Repository('hr_employeePositionS')
      .attrs(['ID'])
      .where('organizationID', '=', para['organizationID.mi_data_id'])
      .where('employeeID', '=', para.employeeID)
      .where('dateFrom', '<=', para.dateTo)
      .where('dateTo', '>=', para.dateFrom)
      .where('workPlace', '=', '3')
      .where('employeeNumberID.mi_deleteDate', '>=', '#maxdate')
      .selectSingle()) {
    throw new UB.UBAbort(`<<<${UB.i18n('У працівника {0} вже є призначення з місцем роботи - зовнішній сумісник', para['employeeID.fullFIO'])}>>>`)
  }

  if (para.workPlace === '2') {
    const mainPositionOnDate = UB.Repository('hr_employeePositionS')
      .attrs(['ID'])
      .where('organizationID', '=', para['organizationID.mi_data_id'])
      .where('employeeID', '=', para.employeeID)
      .where('dateFrom', '<=', para.dateFrom)
      .where('dateTo', '>=', para.dateFrom)
      .where('workPlace', '=', '1')
      .selectSingle()
    if (!mainPositionOnDate) {
      throw new UB.UBAbort(`<<<${UB.i18n('У працівника {0} не має призначення за основним місцем роботи', para['employeeID.fullFIO'])}>>>`)
    }
  }

  orderService.checkIsParaOk(para)
  if (!para.payElID) {
    throw new UB.UBAbort(`<<<${UB.i18n('{0}. Не вказано вид оплати для окладу, проведення неможливе', para['employeeID.fullFIO'])}>>>`)
  }
  if (para.tabNum) {
    const allowSameTabNum = settingsService.getByCode('hrAllowSameTabNum', para['organizationID.mi_data_id'])
    const excludeEmployeeID = allowSameTabNum ? para.employeeID : null
    const emp = employeeService.getEmpByTabNum(0, para.tabNum, para['organizationID.mi_data_id'], excludeEmployeeID)
    if (emp) {
      throw new UB.UBAbort(`<<<${UB.i18n('Табельний номер {0} вже призначено для особового рахунку {1}. Проведення неможливе, виправіть табельний номер', para.tabNum, emp.description)}>>>`)
    }
  }
  if (para.dictTarifCoeffID) {
    const empTarifCategory = UB.Repository('hr_empTarifCategory')
      .attrs(['ID', 'dateFrom', 'dateTo', 'dictTarifCoeffID'])
      .where('employeeID', '=', para.employeeID)
      .selectAsObject()

    if (!empTarifCategory.length) {
      orderService.insertByOrder({
        store: 'hr_empTarifCategory',
        params: {
          employeeID: para.employeeID,
          dateFrom: para.dateFrom,
          dictTarifCoeffID: para.dictTarifCoeffID,
          orderCause: para['orderID.description'],
          empOrderID: order.ID
        },
        saved: saved
      })
    } else {
      empTarifCategory.forEach(currTarif => {
        let currDateFrom = currTarif.dateFrom
        let currDateTo = currTarif.dateTo
        let curDictTarifCoeffID = currTarif.dictTarifCoeffID

        if (currDateFrom > para.dateFrom) {
          orderService.deleteByOrder({
            store: 'hr_empTarifCategory',
            params: {
              ID: currTarif.ID
            },
            saved: saved
          })
        } else if (currDateFrom < para.dateFrom && currDateTo >= para.dateFrom) {
          if (curDictTarifCoeffID !== para.dictTarifCoeffID) {
            orderService.updateByOrder({
              store: 'hr_empTarifCategory',
              params: {
                ID: currTarif.ID,
                dateTo: dateService.addDays(para.dateFrom, -1)
              },
              saved: saved,
              oldValues: {
                dateTo: currDateTo
              }
            })
            orderService.insertByOrder({
              store: 'hr_empTarifCategory',
              params: {
                employeeID: para.employeeID,
                dateFrom: para.dateFrom,
                dictTarifCoeffID: para.dictTarifCoeffID,
                orderCause: para['orderID.description']
              },
              saved: saved
            })
          }
        } else if (currDateFrom === para.dateFrom && currDateTo > para.dateFrom) {
          if (curDictTarifCoeffID !== para.dictTarifCoeffID) {
            orderService.updateByOrder({
              store: 'hr_empTarifCategory',
              params: {
                ID: currTarif.ID,
                dictTarifCoeffID: para.dictTarifCoeffID
              },
              saved: saved,
              oldValues: {
                dictTarifCoeffID: curDictTarifCoeffID
              }
            })
          }
        }
      })
    }
  }

  para.employeeNumberID = orderService.insertByOrder({
    store: 'hr_employeeNumber',
    params: {
      employeeID: para.employeeID,
      dateFrom: isAppointMove && para.isMove && para.dateStartWork ? para.dateStartWork : para.dateFrom,
      dateTo: para.dateTo,
      tabNum: para.tabNum,
      orgID: para['organizationID.mi_data_id'],
      orderID: order.ID,
      paraID: para.ID,
      changeOrderID: null,
      parentEmpNumberID: para.parentEmpNumberID,
      appointmentOrderNumber: isAppointMove && para.isMove ? para.appointmentOrderNumber : null,
      appointmentOrderDate: isAppointMove && para.isMove ? para.appointmentOrderDate : null
    },
    saved: saved
  })
  if (para.addGuarant) {
    orderService.insertByOrder({
      store: 'hr_empAddGuarantees',
      params: {
        employeeID: para.employeeID,
        dateFrom: isAppointMove && para.isMove && para.dateStartWork ? para.dateStartWork : para.dateFrom,
        dateTo: para.dateTo,
        addGuarant: para.addGuarant
      },
      saved: saved
    })
  }
  if (para['vacPositionID.employeeNumberID']) {
    orderService.insertByOrder({
      store: 'hr_longTermReplace',
      params: {
        employeeNumberReplID: para.employeeNumberID,
        employeeNumberAbsID: para['vacPositionID.employeeNumberID'],
        organizationID: para['organizationID.mi_data_id'],
        dateFrom: para.dateFrom,
        dateToEmpty: para.dateTo,
        createOrderID: order.ID,
        changeOrderID: null
      },
      saved: saved
    })
  }

  if (item.empOrderType === 'APPOINT' && order.masterOrganizationID !== order.organizationID) {
    [order.masterOrganizationID, order.organizationID].forEach(orgID => {
      const empOrg = UB.Repository('ac_employeeOrg')
        .attrs('ID')
        .where('employeeID', '=', para.employeeID)
        .where('organizationID', '=', orgID)
        .selectSingle()
      if (!empOrg) {
        orderService.insertByOrder({
          store: 'ac_employeeOrg',
          params: {
            employeeID: para.employeeID,
            organizationID: orgID
          },
          saved: saved
        })
      }
    })
  }

  para.changeOrderID = null
  if (isAppointMove) {
    para.appointOrder = UB.i18n(`Наказ про {0} № {1} від {2}`, para.isAppoint ? 'призначення' : 'переведення', order.orderNumberFull, dateService.formatDate(order.orderDate))
  } else {
    para.appointOrder = order.description
  }

  para.appointReason = para['dictAppointKindID.name']
  if (item.empOrderType === 'APPOINT_LIQ') {
    let posDateTo = new Date(para['positionID.mi_dateTo'])
    if (posDateTo.getFullYear() === 9999) {
      posDateTo = new Date(para['dateFrom'])
    }
    orderService.updateByOrder({
      store: 'hr_position',
      params: {
        ID: para.positionID,
        mi_dateTo: posDateTo,
        state: 'ACTIVE'
      },
      oldValues: {
        mi_dateTo: para['positionID.mi_dateTo'],
        state: para['positionID.state']
      },
      saved: saved
    })
  }
  if (!para['dictFundSourceID']) para['dictFundSourceID'] = para['positionID.dictFundSourceID']
  para['accountID'] = para['dictCostTypeID.accountID']
  if (!para['accountID'] && para['positionID']) {
    const account = UB.Repository('hr_position').attrs('dictCostTypeID.accountID').selectById(para['positionID'])
    para['accountID'] = account['dictCostTypeID.accountID']
  }

  let coa = global['COA']
  if (coa && coa.dims['ac_dictCostType']) {
    para.d0 = coa.dims['ac_dictCostType'].ID
    para.d0Value = para['dictCostTypeID']
  }
  const isUseSexType = settingsService.getByCode('hrUseSexTypeInOrders', order.organizationID)
  const workPosition = (isUseSexType && para['employeeID.sexType'] === 'W' ? para['positionID.fullNameNomF'] : para['positionID.fullNameNom']) || para['positionID.fullName']
  para.employeePositionID = orderService.createEmployeePosition({
    para: para,
    saved: saved,
    isCreateWorkBookRecord: !para['notStoreInWorkBook'],
    isImportOperation: isImportOperation,
    isNotCheckPosition: item.empOrderType === 'APPOINT_LIQ',
    mParams: {
      isOrgAppoint: isAppointMove ? para.isAppoint : true,
      positionCategory: para['positionID.positionType'] === '1' ? para['positionID.psCategory.name'] : null,
      positionType: para['positionID.positionType'],
      workPosition
    }
  })

  const dictFundSource = UB.Repository('hr_empOrderFundSource')
    .attrs(['dictFundSourceID', 'mtCount'])
    .where('paraID', '=', para.ID)
    .selectAsObject()
  dictFundSource.forEach(row => {
    orderService.insertByOrder({
      store: 'hr_empPosFundSource',
      params: {
        employeePositionID: para.employeePositionID,
        employeeNumberID: para.employeeNumberID,
        dictFundSourceID: row.dictFundSourceID,
        mtCount: row.mtCount || 0
      },
      saved: saved
    })
  })

  if (para.isRankAssign) {
    if (para.dictRankID) {
      orderService.createRank({ para: para, saved: saved, order: order })
    }
  } else if (para.isTransfer) {
    /* UBHR-15313 - відмінено пошук рангу за 3 останні роки, береться взагалі останній ранг до дати призначення */
    // let rankDateFrom = dateService.addYears(para.dateFrom, -3)
    let rankDateTo = para.dateFrom
    const rankData = UB.Repository('hr_publServRang')
      .attrs(['ID', 'dictRankID', 'dateFrom', 'dateTo', 'dateNext', 'orderID', 'orderNumber', 'orderDate'])
      .where('employeeID', '=', para.employeeID)
      // .where('dateFrom', '>', rankDateFrom)
      .where('dateFrom', '<=', rankDateTo)
      .orderBy('dateFrom', 'desc').limit(1)
      .selectSingle()
    if (rankData) {
      let rankUpdateParams
      let rankOldValues
      if (para.isTransfer) {
        rankUpdateParams = {
          ID: rankData.ID,
          dateTo: dateService.maxDate(),
          dateNext: dateService.addYears(rankData.dateFrom, 3)
        }
        rankOldValues = {
          dateTo: rankData.dateTo,
          dateNext: rankData.dateNext
        }
        orderService.updateByOrder({
          store: 'hr_publServRang',
          params: rankUpdateParams,
          saved: saved,
          oldValues: rankOldValues
        })
      } else {
        orderService.insertByOrder({
          store: 'hr_publServRang',
          params: {
            dictRankID: rankData.dictRankID,
            dateFrom: para.dateFrom,
            employeeID: para.employeeID,
            dateNext: dateService.addYears(para.dateFrom, 3),
            dateTo: '#maxdate',
            orderDate: order.orderDate,
            orderNumber: order.orderNumberFull || order.orderNumber,
            orderID: order.ID,
            rankAssignKindID: para.rankAssignKindID || null
          },
          saved: saved
        })
        /*
        rankUpdateParams = {
          ID: rankData.ID,
          dateFrom: para.dateFrom,
          dateTo: dateService.maxDate(),
          dateNext: dateService.addYears(para.dateFrom, 3),
          orderID: order.ID,
          orderNumber: order.orderNumber,
          orderDate: order.orderDate
        }
        rankOldValues = {
          dateFrom: rankData.dateFrom,
          dateTo: rankData.dateTo,
          dateNext: rankData.dateNext,
          orderID: rankData.orderID,
          orderNumber: rankData.orderNumber,
          orderDate: rankData.orderDate
        }
        */
      }
    }
  }

  // UBHR-20737
  // закрываем все ранги, кроме последнего
  orderService.tryClosePublServRangsExceptLast(para['employeeID'], order, saved)

  if (para['dateTrialEnd']) {
    orderService.insertByOrder({
      store: 'hr_employeeTrialPeriod',
      params: {
        employeeNumberID: para['employeeNumberID'],
        employeePositionID: para['employeePositionID'],
        orderID: order.ID,
        orderNumber: order.orderNumber,
        orderDate: order.orderDate,
        dateFrom: para['dateFrom'],
        dateTo: para['dateTrialEnd'],
        dateTrialEnd: para['dateTrialEnd'],
        dictTrialPeriodID: para['dictTrialPeriodID'],
        positionID: para['positionID']
      },
      saved: saved
    })
  }

  if (!para['isByHours']) {
    // Нарахування
    orderService.createOrderAccrual({
      para: para,
      saved: saved,
      isClosePrev: true,
      skipAutoCalcCondition: true,
      isAddMethod74: item.empOrderType === 'APPOINT'
    })
    // Стажі
    orderService.createExperience({ para: para, saved: saved })

    orderService.createWorkSched({
      params: Object.assign({ paraID: para.ID }, para),
      mParams: {
        isClosePrev: false
      },
      saved: saved
    })

    global.hr_empOrderVacationPlan.doPosting(order, para, saved)
  }
  employeeService.updateEmployeeAddPersonDescription(para.employeeNumberID)

  orderService.updateByOrder({
    store: item.mi_unityEntity,
    params: {
      ID: para.ID,
      employeePositionID: para.employeePositionID,
      employeeNumberID: para.employeeNumberID
    },
    saved: saved,
    oldValues: {
      employeePositionID: null,
      employeeNumberID: null
    }
  })
  if (isSingle) {
    orderService.saveOldValues(item, saved)
  }

  if (para['dictVehicleID']) {
    const vehicle = UB.Repository('trans_vehicle')
      .attrs(['ID', 'vehicleName'])
      .where('ID', '=', para['dictVehicleID'])
      .selectSingle()
    if (vehicle) {
      orderService.insertByOrder({
        store: 'hr_employeeVehicle',
        params: {
          employeeID: para['employeeID'],
          vehicleID: vehicle.ID,
          strVehicle: vehicle.vehicleName,
          dateFrom: para['dateFrom'],
          dateTo: para['dateTo'] ? para['dateTo'] : dateService.maxDate(),
          orderID: order.ID
        },
        saved: saved
      })
    }
  }
}

me.doCancelPosting = function (item) {
  if (item.orderState === 'CANCELED') {
    return
  }

  orderService.restoreOldValues(item)
}

function setDescription (ctx) {
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  const execParams = ctx.mParams.execParams

  let attr = ctx.dataStore.entity.attributes['description']
  if (attr) {
    let cs = attr.customSettings
    if (cs && cs.compositeFields) {
      execParams.description = ebs.getCompositeAttributeValue(ctx, 'description', cs.compositeFields, cs.compositeSeparator, false)
    }
  }
  execParams.title = ebs.getCompositeAttributeValue(ctx, 'title', ['departmentID.name', 'positionID.name', 'tabNum'], ' ', false)
  if (!execParams.description || !instanceData.description) {
    execParams.description = execParams.title
  }
  if (execParams.employeeID) {
    let pos = UB.Repository('hr_employee')
      .attrs([
        'firstName',
        'lastName',
        'middleName'
      ])
      .where('ID', '=', execParams.employeeID)
      .select()
    execParams.firstName = pos.get('firstName')
    execParams.lastName = pos.get('lastName')
    execParams.middleName = pos.get('middleName')

    let order
    if (!execParams.empOrderType && !instanceData.empOrderType && execParams.orderID) {
      order = UB.Repository('hr_empOrder').attrs(['empOrderType', 'organizationID']).where('ID', '=', execParams.orderID).select()
      execParams.empOrderType = order.get('empOrderType')
    }
    if (!execParams.organizationID && !instanceData.organizationID && execParams.orderID) {
      order = order || UB.Repository('hr_empOrder').attrs(['empOrderType', 'organizationID']).where('ID', '=', execParams.orderID).select()
      execParams.organizationID = order.get('organizationID')
    }
  }
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
    ctx.mParams.info = UB.i18n(`Табельний номер вже введений у наказі про призначення № {0} від {1}`, info.get(1), info.get(0) ? moment(info.get(0)).format('DD.MM.YYYY') : '""')
  }
  info = UB.Repository('hr_empOrderPluralistDet')
    .attrs(['orderID.orderDate', 'orderID.orderNumber'])
    .where('tabNum', '=', tabNum)
    .where('organizationID', '=', organizationID)
    .where('ID', '<>', ID).select()
  if (!info.eof) {
    ctx.mParams.info = UB.i18n(`Табельний номер вже введений у наказі про сумісництво № {0} від {1}`, info.get(1), info.get(0) ? moment(info.get(0)).format('DD.MM.YYYY') : '""')
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

  if (ctx.mParams.execParams.positionID || ctx.mParams.execParams.employeeID) { beforeDelete(ctx) }
}

function beforeDelete (ctx) {
  const vEmps = UB.Repository('hr_empOrderVehicleassignDet')
    .attrs('ID')
    .where('orderDetEmployeeID', '=', ctx.mParams.execParams.ID)
    .selectAsObject()
  const store = UB.DataStore('hr_empOrderVehicleassignDet')
  vEmps.forEach(r => {
    store.run('delete', {
      skipOrderDelete: true,
      execParams: {
        ID: r.ID
      }
    })
  })
}

function afterInsertUpdate (ctx) {
  orderService.saveOrderFundSource(ctx)
}
