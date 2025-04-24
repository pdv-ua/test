/* AC */
const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const orderService = require('./modules/orderService')
const dateService = require('../AC/modules/dataServices/dateService')
const periodService = require('../HR/modules/periodService')
const timService = require('../HR/modules/timService')
const stringService = require('../AC/modules/dataServices/stringService')
const employeeService = require('../HR/modules/employeeService')

me.on('insert:before', beforeInsert)
me.on('delete:before', orderService.beforeDeleteOrder)
me.on('select:after', afterSelect)
me.on('update:before', beforeUpdate)
me.entity.addMethod('doPosting')
me.entity.addMethod('doCancelPosting')
me.entity.addMethod('setSicknessList')
me.entity.addMethod('setFuneralList')
me.entity.addMethod('getCalculatedDaysSickness')
me.entity.addMethod('getPrintData')
me.entity.addMethod('removeDt')

me.onAfterOrderEvent = function () {
  me.on('insert:after', afterInsert)
  me.on('update:after', afterUpdate)
}

me.details = [
  {
    detailName: 'commissionDetail',
    entityName: 'hr_commission',
    docIDName: 'orderID',
    fieldList: orderService.setFieldListAttribute(['employeePositionID.description', 'memberType'], ['lineNum'])
  }
]

function afterSelect (ctx) {
  const mParams = ctx.mParams
  if (mParams.ID && !mParams.execParams) {
    mParams.detail = orderService.getEntityDetail(mParams.ID, me.details)
  }
}

function beforeInsert (ctx) {
  const execParams = ctx.mParams.execParams
  execParams.empOrderType = 'SICKNESSMEETING'
  execParams.orderNumber = orderService.getOrderNum(__entityName, execParams.orderDate, execParams.organizationID)
  global['hr_service'].setDocDefaultParams(ctx)
}

function afterUpdate (ctx) {
  const execParams = ctx.mParams.execParams
  ctx.mParams.detail = orderService.getEntityDetail(execParams.ID, me.details)
  if (execParams.orderState) {
    if (execParams.orderState === 'POSTED') {
      if (!ctx.mParams.skipPosting) {
        me.doPosting(ctx)
      }
    }
    if (execParams.orderState === 'PROJECT') {
      me.doCancelPosting(ctx)
    }
  }
}

function afterInsert (ctx) {
  const execParams = ctx.mParams.execParams
  orderService.saveDetails(ctx, me.details)
  ctx.mParams.detail = orderService.getEntityDetail(execParams.ID, me.details)
}

function beforeUpdate (ctx) {
  orderService.saveDetails(ctx, me.details)
}

me.removeDt = function (ctx) {
  const mParams = ctx.mParams
  const store = UB.DataStore(mParams.detailName)
  const order = UB.Repository('hr_sicknessMeeting').attrs(['ID', 'orderState', 'description']).selectById(mParams.instanceID)
  if (order.orderState !== 'PROJECT') {
    throw new UB.UBAbort(`<<<${UB.i18n('Документ {0} - проведено. Видалення неможливе.', order.description)}>>>`)
  }
  const orderDt = UB.Repository('hr_sicknessMeetingDt').attrs(['ID']).where('sicknessMeetingID', '=', mParams.instanceID).selectAsObject()
  orderDt.forEach(row => {
    store.run('delete', {
      __skipOptimisticLock: true,
      execParams: {
        ID: row.ID
      }
    })
  })
}

me.doPosting = function (ctx) {
  const execParams = ctx.mParams.execParams
  const errorMessages = []
  const allowPosting = UB.Repository(__entityName).attrs('allowPosting').where('ID', '=', execParams.ID).selectScalar()

  const orgID = UB.Repository(__entityName).attrs('organizationID')
    .where('ID', '=', execParams.ID)
    .selectScalar()

  const currentPeriod = periodService.getCurrentPeriod(orgID)

  const periodID = currentPeriod.ID
  if (!periodID) {
    throw new UB.UBAbort(`<<<${UB.i18n('Для організації не знайдено поточного періоду')}>>>`)
  }
  if ((currentPeriod && currentPeriod.isBlock) && !allowPosting) {
    throw new UB.UBAbort(`<<<${UB.i18n('Проведення тимчасово заборонено фахівцями з розрахунку заробітної плати')}>>>`)
  }

  // лікарняні
  const dtSickness = UB.Repository('hr_sicknessMeetingDt')
    .attrs(['ID', 'isPay', 'empOrderSicknessID', 'empOrderSicknessID.number', 'empOrderSicknessID.orderDate',
      'empOrderSicknessID.orderState', 'empOrderSicknessID.parentID', 'empOrderSicknessID.parentID.number',
      'empOrderSicknessID.illnessReasonID.payElUnpaidID.dictTimeCostID',
      'empOrderSicknessID.illnessReasonID.payElFSSUID.dictTimeCostID'
    ])
    .where('sicknessMeetingID', '=', execParams.ID)
    .where('empOrderSicknessID.mi_deleteDate', '>=', '#maxdate')
    .where('empOrderSicknessID', 'isNotNull')
    .selectAsObject({
      'empOrderSicknessID.illnessReasonID.payElUnpaidID.dictTimeCostID': 'unpaidDictTimeCostID',
      'empOrderSicknessID.illnessReasonID.payElFSSUID.dictTimeCostID': 'factTimeCostID'
    })
  dtSickness.forEach(item => {
    if (item['empOrderSicknessID.orderState'] !== 'POSTED') {
      errorMessages.push(UB.i18n(`Лікарняний №{0} від {1} не проведено!`, item['empOrderSicknessID.number'], item['empOrderSicknessID.orderDate']))
    }
    if (item['empOrderSicknessID.parentID']) {
      const pData = UB.Repository('hr_sicknessMeetingDt')
        .attrs(['ID', 'sicknessMeetingID', 'sicknessMeetingID.orderNumber', 'sicknessMeetingID.orderState'])
        .where('sicknessMeetingID.mi_deleteDate', '>=', '#maxdate')
        .where('empOrderSicknessID', '=', item['empOrderSicknessID.parentID'])
        .selectSingle()
      if (pData) {
        if (pData['sicknessMeetingID.orderState'] === 'PROJECT' && pData['sicknessMeetingID'] !== execParams.ID) {
          errorMessages.push(UB.i18n(`Для лікарняного №{0} попередній лікарняний №{1} занесен у протокол №{2}, що ще не проведено!`, item['empOrderSicknessID.number'], item['empOrderSicknessID.parentID.number'], pData['sicknessMeetingID.orderNumber']))
        }
      } else {
        errorMessages.push(UB.i18n(`Для лікарняного №{0} попередній лікарняний №{1} не занесен у жодний протокол!`, item['empOrderSicknessID.number'], item['empOrderSicknessID.parentID.number']))
      }
    }
  })

  // допомога на поховання
  const dtFuneral = UB.Repository('hr_sicknessMeetingDt')
    .attrs(['ID', 'empOrderFuneralID', 'empOrderFuneralID.orderState', 'empOrderFuneralID.orderDate', 'empOrderFuneralID.employeeFuneralID.employeeID.fullFIO'])
    .where('sicknessMeetingID', '=', execParams.ID)
    .where('empOrderFuneralID.mi_deleteDate', '>=', '#maxdate')
    .where('empOrderFuneralID', 'isNotNull')
    .selectAsObject()
  dtFuneral.forEach(item => {
    if (item['empOrderFuneralID.orderState'] !== 'POSTED') {
      errorMessages.push(UB.i18n(`Допомога для {0} від {1} не проведено!`, item['empOrderFuneralID.employeeFuneralID.employeeID.fullFIO'], item['empOrderFuneralID.orderDate']))
    }
  })

  if (errorMessages.length) {
    throw new UB.UBAbort(`<<<${UB.i18n('Неможливо провести наказ<br>{0}', errorMessages.join('<br>'))}>>>`)
  }

  UB.DataStore(__entityName).run('update', {
    __skipOptimisticLock: true,
    isInternalCall: true,
    simpleUpdate: true,
    execParams: {
      ID: execParams.ID,
      periodID: periodID
    }
  })

  const storeSickness = UB.DataStore('hr_empOrderSickness')
  dtSickness.forEach(item => {
    if (item.empOrderSicknessID) {
      storeSickness.run('update', {
        __skipOptimisticLock: true,
        isInternalCall: true,
        simpleUpdate: true,
        execParams: {
          ID: item.empOrderSicknessID,
          orderState: 'PROCESSED'
        }
      })
      if (!item.isPay && item.unpaidDictTimeCostID) {
        const timeSheetParams = []
        const timeSheetData = UB.Repository('tim_timeSheet')
          .attrs(['dateWork', 'employeeNumberID'])
          .where('orderID', '=', item.empOrderSicknessID)
          .where('factTimeCostID', '!=', item.unpaidDictTimeCostID)
          .where('isActive', '=', 1)
          .selectAsObject()
        timeSheetData.forEach(row => {
          timeSheetParams.push({
            orderID: execParams.ID,
            entityName: 'hr_sicknessMeeting',
            employeeNumberID: row.employeeNumberID,
            periodID: periodID,
            dateWork: dateService.shiftDate(row.dateWork),
            factTimeCostID: item.unpaidDictTimeCostID,
            factHour: 0
          })
        })
        timService.setTimeSheet(timeSheetParams)
      }
    }
  })
  storeSickness.freeNative()

  const storeFuneral = UB.DataStore('hr_empOrderFuneral')
  dtFuneral.forEach(item => {
    if (item.empOrderFuneralID) {
      storeFuneral.run('update', {
        __skipOptimisticLock: true,
        isInternalCall: true,
        simpleUpdate: true,
        execParams: {
          ID: item.empOrderFuneralID,
          orderState: 'PROCESSED'
        }
      })
    }
  })
  storeFuneral.freeNative()
}

me.doCancelPosting = function (ctx) {
  const execParams = ctx.mParams.execParams

  const orgID = UB.Repository(__entityName).attrs('organizationID')
    .where('ID', '=', execParams.ID)
    .selectScalar()

  const currentPeriod = periodService.getCurrentPeriod(orgID)
  if (currentPeriod && currentPeriod.isBlock) {
    throw new UB.UBAbort(`<<<${UB.i18n('Скасування проведення тимчасово заборонено фахівцями з розрахунку заробітної плати')}>>>`)
  }

  const errorMessages = []
  const dtData = UB.Repository('hr_sicknessMeetingDt')
    .attrs(['ID', 'empOrderSicknessID', 'empOrderSicknessID.number', 'empOrderSicknessID.orderState',
      'empOrderFuneralID', 'empOrderFuneralID.orderDate'])
    .where('sicknessMeetingID', '=', execParams.ID)
    .where('empOrderSicknessID.mi_deleteDate', '>=', '#maxdate', 'sickness')
    .where('empOrderFuneralID.mi_deleteDate', '>=', '#maxdate', 'funeral')
    .logic('[sickness] or [funeral]')
    .selectAsObject()
  dtData.forEach(item => {
    if (item.empOrderSicknessID) {
      const pData = UB.Repository('hr_sicknessMeetingDt')
        .attrs(['ID', 'empOrderSicknessID.parentID.number', 'sicknessMeetingID.orderNumber', 'sicknessMeetingID.orderState'])
        .where('empOrderSicknessID.parentID', '=', item['empOrderSicknessID'])
        .where('empOrderSicknessID.mi_deleteDate', '>=', '#maxdate')
        .selectSingle()

      if (pData) {
        if (pData['sicknessMeetingID.orderState'] === 'POSTED') {
          errorMessages.push(`Для лікарняного №${item['empOrderSicknessID.number']} 
        продовження №${pData['empOrderSicknessID.parentID.number']} у протоколі №${pData['sicknessMeetingID.orderNumber']}, що має статус "Проведено"!`)
        }
      }
    }
  })

  if (errorMessages.length) {
    throw new UB.UBAbort(`<<<${UB.i18n('Неможливо розпровести наказ<br>{0}', errorMessages.join('<br>'))}>>>`)
  }
  timService.cancelTimeSheet(execParams.ID)

  const storeSickness = UB.DataStore('hr_empOrderSickness')
  const storeFuneral = UB.DataStore('hr_empOrderFuneral')
  dtData.forEach(function (item) {
    if (item.empOrderSicknessID) {
      storeSickness.run('update', {
        __skipOptimisticLock: true,
        isInternalCall: true,
        simpleUpdate: true,
        execParams: {
          ID: item.empOrderSicknessID,
          orderState: 'POSTED'
        }
      })
    }
    if (item.empOrderFuneralID) {
      storeFuneral.run('update', {
        __skipOptimisticLock: true,
        isInternalCall: true,
        simpleUpdate: true,
        execParams: {
          ID: item.empOrderFuneralID,
          orderState: 'POSTED'
        }
      })
    }
  })
  storeFuneral.freeNative()
  storeSickness.freeNative()
}

me.setSicknessList = function (ctx) {
  const mParams = ctx.mParams
  const store = UB.DataStore('hr_sicknessMeetingDt')
  const data = UB.Repository('hr_empOrderSickness')
    .attrs(['ID', 'description', 'employeeID.fullFIO', 'illnessReasonID.name', 'illnessReasonID.maxDayFOP', 'employeeNumberID',
      'dateFrom', 'dateTo', 'parentID', 'parentID.dateFrom', 'parentID.dateTo', 'firstID.dateFrom', 'firstID.dateTo',
      'illnessReasonID.payElUnpaidID.dictTimeCostID', 'msekDateFrom', 'msekDateTo', 'msekResult'
    ])
    .where('organizationID', '=', mParams.organizationID)
    .where('illnessKind', 'in', ['1', '3'])
    .where('orderState', '=', 'POSTED')
    .notExists(UB.Repository('hr_sicknessMeetingDt')
      .correlation('empOrderSicknessID', 'ID')
      .where('sicknessMeetingID', '!=', mParams.instanceID)
      .where('empOrderSicknessID.organizationID', '=', mParams.organizationID)
      .where('empOrderSicknessID.illnessKind', 'in', ['1', '3'])
      .where('empOrderSicknessID.orderState', '=', 'POSTED')
      .where('mi_deleteDate', '=', dateService.maxDate())
      .where('sicknessMeetingID.mi_deleteDate', '=', dateService.maxDate())
      .where('empOrderSicknessID.mi_deleteDate', '=', dateService.maxDate()), 'existed')
    .logic('([existed])')
    .orderBy('description', 'asc')
    .selectAsObject().map(item => {
      const row = {
        isPay: mParams.isPay,
        fullFIO: item['employeeID.fullFIO'],
        empOrderSicknessID: item['ID'],
        illnessReason: item['illnessReasonID.name'],
        parent: item['parentID'] ? 'Продовжений' : 'Первинний',
        dateFrom: item['dateFrom'],
        dateTo: item['dateTo']
      }
      return Object.assign({ sicknessMeetingID: mParams.instanceID }, row, calcDaysSickness(item, mParams.isPay))
    })
  data.forEach(row => {
    store.run('insert', {
      execParams: row
    })
  })
  mParams.orderCount = data.length
}

function makeRefusalBySickness (empOrderSickness, employeeNumberID, dateFrom, dateTo) {
  const timeSheetFact = UB.Repository('tim_timeSheet')
    .attrs(['orderID', 'factTimeCostID', 'factTimeCostID.nameSmall', 'min([dateWork])', 'max([dateWork])'])
    .where('employeeNumberID', '=', employeeNumberID)
    .where('dateWork', '>=', dateService.shiftDate(dateFrom))
    .where('dateWork', '<=', dateService.shiftDate(dateTo))
    .where('orderID', '!=', empOrderSickness['ID'], 'order')
    .where('orderID', 'isNull', undefined, 'orderNull')
    .where('isActive', '=', 1)
    .logic('([order] OR [orderNull])')
    .groupBy(['orderID', 'factTimeCostID', 'factTimeCostID.nameSmall'])
    .selectAsObject({
      'min([dateWork])': 'dateFrom',
      'max([dateWork])': 'dateTo',
      'factTimeCostID.nameSmall': 'nameSmall'
    })
  const reasons = []
  timeSheetFact.forEach(el => {
    reasons.push(
      UB.i18n(`{0} з {1} по {2}`, el.nameSmall, dateService.formatDate(el.dateFrom), dateService.formatDate(el.dateTo))
    )
  })
  if (empOrderSickness['msekDateTo'] && empOrderSickness['msekResult'] === '1') {
    reasons.push(
      UB.i18n('день огляду МСЕК {0}', dateService.formatDate(empOrderSickness['msekDateTo']))
    )
  }
  const violationRegime = UB.Repository('hr_empOrderSicknessDt')
    .attrs('ID', 'dateFrom', 'dateTo', 'illnessRegime', 'illnessRegime.name')
    .where('empOrderSicknessID', '=', empOrderSickness['ID'])
    .where('illnessRegime', 'in', ['5', '6'])
    .orderBy('dateFrom')
    .selectAsObject()
  violationRegime.forEach(row => {
    let illnessRegimeName = row['illnessRegime.name']
    if (illnessRegimeName.length) {
      illnessRegimeName = illnessRegimeName.charAt(0).toUpperCase() + illnessRegimeName.slice(1)
    }
    reasons.push(
      UB.i18n('{0} з {1} по {2}', illnessRegimeName, dateService.formatDate(row.dateFrom), dateService.formatDate(row.dateTo))
    )
  })
  return reasons.length ? 'Непрацездатність припала на ' + reasons.join(',') : null
}

me.setFuneralList = function (ctx) {
  const mParams = ctx.mParams
  const store = UB.DataStore('hr_sicknessMeetingDt')
  const data = UB.Repository('hr_empOrderFuneral')
    .attrs(['ID', 'description', 'dead', 'addDoc'])
    .where('organizationID', '=', mParams.organizationID)
    .where('orderState', '=', 'POSTED')
    .notExists(UB.Repository('hr_sicknessMeetingDt')
      .correlation('empOrderFuneralID', 'ID')
      .where('sicknessMeetingID', '!=', mParams.instanceID)
      .where('empOrderFuneralID.organizationID', '=', mParams.organizationID)
      .where('empOrderFuneralID.orderState', '=', 'POSTED')
      .where('mi_deleteDate', '=', dateService.maxDate())
      .where('sicknessMeetingID.mi_deleteDate', '=', dateService.maxDate())
      .where('empOrderFuneralID.mi_deleteDate', '=', dateService.maxDate()), 'existed')
    .logic('([existed])')
    .orderBy('description', 'asc')
    .selectAsObject()
  data.forEach(item => {
    const row = {
      sicknessMeetingID: mParams.instanceID,
      empOrderFuneralID: item['ID'],
      isPay: true,
      dead: item['dead'],
      addDoc: item['addDoc']
    }

    store.run('insert', {
      execParams: row
    })
  })
  mParams.orderCount = data.length
}

me.getCalculatedDaysSickness = function (ctx) {
  const mParams = ctx.mParams
  const empOrderSickness = UB.Repository('hr_empOrderSickness')
    .attrs(['ID', 'description', 'employeeID.fullFIO', 'illnessReasonID.name', 'illnessReasonID.maxDayFOP', 'employeeNumberID',
      'dateFrom', 'dateTo', 'parentID', 'parentID.dateFrom', 'parentID.dateTo', 'firstID.dateFrom', 'firstID.dateTo',
      'illnessReasonID.payElUnpaidID.dictTimeCostID', 'msekDateFrom', 'msekDateTo', 'msekResult', 'employeeNumberID.parentEmpNumberID'])
    .selectById(mParams.empOrderSicknessID)
  if (!empOrderSickness) return
  mParams.data = JSON.stringify(calcDaysSickness(empOrderSickness, mParams.isPay))
}

function calcDaysSickness (empOrderSickness, isPay) {
  const calculated = {}
  const start = dateService.shiftDate(empOrderSickness['dateFrom'])
  const end = dateService.shiftDate(empOrderSickness[`dateTo`])
  const calendarDays = dateService.dayDiff(start, end) + 1

  const empNumbers = [empOrderSickness['employeeNumberID']]
  if (empOrderSickness['employeeNumberID.parentEmpNumberID']) {
    const parentEmpNumbers = []
    employeeService.getParentEmpNumberIDs(empOrderSickness['employeeNumberID'], parentEmpNumbers)
    empNumbers.push(...parentEmpNumbers.map(o => o.employeeNumberID))
  }
  const data = UB.Repository('tim_timeSheet')
    .attrs(['ID', 'dateWork', 'orderID', 'orderID.description', 'factTimeCostID.nameSmall'])
    .where('employeeNumberID', 'in', empNumbers)
    .where('orderID', '=', empOrderSickness['ID'])
    .where('dateWork', '>=', start)
    .where('dateWork', '<=', end)
    .whereIf(empOrderSickness['illnessReasonID.payElUnpaidID.dictTimeCostID'], 'factTimeCostID', '!=', empOrderSickness['illnessReasonID.payElUnpaidID.dictTimeCostID'])
    .where('isActive', '=', true)
    .orderBy('dateWork')
    .selectAsObject()
  data.forEach(item => {
    item.dateWork = dateService.shiftDate(item.dateWork)
  })
  /*
    let msekDay = 0
    if (empSickness.msekDateTo && empSickness.msekResult === '1') {
      const msekDate = dateService.shiftDate(empSickness.msekDateTo)
      if (data.find(o => dateService.shiftDate(o.dateWork).getTime() === msekDate.getTime())) msekDay = 1
    }
    const dayPay = data.length - msekDay
    */
  const dayPay = data.length
  let dayFSSU
  let dateFSSU = dateService.shiftDate(empOrderSickness['parentID'] ? (empOrderSickness['firstID.dateFrom'] || empOrderSickness['parentID.dateFrom']) : empOrderSickness['dateFrom'])
  if (empOrderSickness['illnessReasonID.maxDayFOP'] > 0) {
    dateFSSU = dateService.addDays(dateFSSU, empOrderSickness['illnessReasonID.maxDayFOP'])
  }
  if (dateFSSU < start) {
    dateFSSU = start
  }
  dayFSSU = dateFSSU <= end ? data.filter(o => o.dateWork >= dateFSSU).length : 0
  let dayNotPay = calendarDays - dayPay

  calculated[`dayPay`] = dayPay
  calculated[`dayFSSU`] = dayFSSU // (dayPay - dayFSSU) > 0 ? (dayPay - dayFSSU) : 0
  calculated[`dayNotPay`] = dayNotPay
  if (dayNotPay === 0) {
    calculated[`dateFromStop`] = null
    calculated[`refusal`] = null
  } else {
    calculated[`refusal`] = makeRefusalBySickness(empOrderSickness, empOrderSickness['employeeNumberID'], start, end)
  }
  if (!isPay) {
    calculated[`dayNotPay`] = calendarDays
    calculated[`dayPay`] = 0
    calculated[`dayFSSU`] = 0
    calculated[`dateFromStop`] = start
  }
  return calculated
}

me.getPrintData = function (ctx) {
  const mParams = ctx.mParams
  let result = {
    orderNumber: '',
    orderDate: '',
    orgName: '',
    commission: [],
    title: '',
    sicknessList: [],
    assignHelpText: '',
    refuseHelpText: '',
    refuseList: [],
    illnessKind1: false,
    illnessKind2: false
  }

  const sicknessMeeting = UB.Repository('hr_sicknessMeeting')
    .attrs(['orderDate', 'orderNumber', 'organizationID', 'commissionHRID'])
    .where('ID', '=', mParams.instanceID)
    .selectSingle()
  if (!sicknessMeeting) {
    mParams.resultData = JSON.stringify(result)
    return
  }

  result.orderNumber = sicknessMeeting.orderNumber

  let orderDate = sicknessMeeting.orderDate ? new Date(sicknessMeeting.orderDate) : new Date()
  result.orderDateM = sicknessMeeting.orderDate ? getMonthName(orderDate.getMonth() + 1) : ''
  result.orderDateD = sicknessMeeting.orderDate ? orderDate.getDate() : ''
  result.orderDateY = sicknessMeeting.orderDate ? orderDate.getFullYear().toString().slice(-2) : ''

  // result.orderDate = sicknessMeeting.orderDate

  const orgName = UB.Repository('hr_organization')
    .attrs(['name'])
    .where('mi_data_id', '=', sicknessMeeting['organizationID'])
    .where('state', '=', 'ACTIVE')
    .selectSingle()
  result.orgName = orgName['name']

  // ac_commission
  if (sicknessMeeting) {
    result.commission = UB.Repository('hr_commission')
      .attrs(['employeePositionID.employeeID.fullFIO', 'memberType.name', 'memberName'])
      .where('orderID', '=', mParams.instanceID)
      .orderBy('lineNum')
      .selectAsObject({
        'employeePositionID.employeeID.fullFIO': 'member',
        'memberType.name': 'memberTypeName' }
      )

    let memberName = ''
    result.commission.forEach(el => {
      el.memberName = el.memberName || el.memberTypeName || ''
      if (memberName === el.memberName) {
        el.memberName = ''
      } else {
        memberName = el.memberName
      }
    })
  }
  if (!result.commission.length) {
    result.commission.push({ member: '', memberName: '' })
  }
  result.showCommission = result.commission.length > 1
  result.title = result.commission.length > 1 ? UB.i18n('ПРОТОКОЛ') : UB.i18n('РІШЕННЯ')
  result.titleAbout = result.commission.length > 1 ? UB.i18n('засідання комісії уповноважених осіб із питань призначення страхових виплат') : UB.i18n('уповноваженого з питань призначення страхових виплат')
  result.titleCommission = result.commission.length > 1 ? UB.i18n('комісія уповноважених осіб з питань призначення страхових виплат ') :  UB.i18n('уповноважена особа з питань призначення страхових виплат')

  let store = UB.DataStore('hr_sicknessMeetingDt')
  store.runSQL(` SELECT 
smdt.isPay as "isPay" 
,smdt.empOrderSicknessID as "empOrderSicknessID"
,smdt.empOrderFuneralID as "empOrderFuneralID" 
,illr.code as "illCode"
,ordSick.employeeID as "semployeeID"
,empSick.fullFIO as "sFIO"
,empSick.taxCode as "staxCode"
,ordSick.serie as "serie"
,ordSick.number as "number"
,illr.code as "reason"
,ordSick.parentID as "parentID"
,ordSick.dateFrom as "dateFrom"
,ordSick.dateTo as "dateTo"
,smdt.dayPay as "dayPay"
,smdt.dayFSSU as "dayFSSU"
,ordSick.percentWork as "spercentWork"
,empF.fullFIO as "fFIO"
,empF.taxCode as "ftaxCode"
,ordF.addDoc as "fdocs" 
,ordF.seriaDoc as "fseriaDoc" 
,ordF.numberDoc as "fnumberDoc" 
,ordF.dateDoc as "fdateDoc"
,ordF.paySum as "fpaySum"
,smdt.dateFromStop as "dateFromStop"
,smdt.refusal as "refusal"
,ordSick.illnessKind as "illnessKind"
FROM
hr_sicknessMeetingDt smdt
LEFT JOIN hr_empOrderSickness ordSick on ordSick.ID = smdt.empOrderSicknessID and ordSick.mi_deleteDate >= '9999-12-31' 
LEFT JOIN hr_empOrderFuneral ordF on ordF.ID = smdt.empOrderFuneralID and ordF.mi_deleteDate >= '9999-12-31'
LEFT JOIN hr_dictIllnessReason illr on illr.ID = ordSick.illnessReasonID and illr.mi_deleteDate >= '9999-12-31'
LEFT JOIN hr_employee empSick on empSick.ID = ordSick.employeeID and empSick.mi_deleteDate >= '9999-12-31'
LEFT JOIN hr_employeePosition empPosF on empPosF.ID = ordF.employeeFuneralID and empPosF.isActive = 1 and empPosF.mi_deleteDate >= '9999-12-31' 
LEFT JOIN hr_employee empF on empF.ID = empPosF.employeeID and empF.mi_deleteDate >= '9999-12-31'  
WHERE
smdt.mi_deleteDate >= '9999-12-31'
AND sicknessMeetingID = :sicknessMeetingID:
AND (smdt.empOrderFuneralID is not null OR
smdt.empOrderSicknessID is not null) `,
  {
    sicknessMeetingID: mParams.instanceID
  })
  let sicknessMeetingDt = store.getAsJsObject()
  store.freeNative()

  // соцстрах
  for (let i = 1; i <= 2; i++) {
    let sumDayPay = 0
    let sumDayFSSU = 0
    const fldSickness = sicknessMeetingDt.filter(el => el.isPay && el.empOrderSicknessID && el.illnessKind === (i === 1 ? '1' : '3')).sort((a, b) =>
      stringService.compareStringUa(a.sFIO, b.sFIO) === 1 ? 1
        : stringService.compareStringUa(a.sFIO, b.sFIO) === 0
        ? ((a.dateFrom ? dateService.shiftDate(a.dateFrom) : dateService.minDate()) > (b.dateFrom ? dateService.shiftDate(b.dateFrom) : dateService.minDate()) ? 1 : -1) : -1)
    const sickness = fldSickness.map((item, k) => {
      sumDayPay += item['dayPay']
      sumDayFSSU += item['dayFSSU']
      return Object.assign({}, item, {
        pn: k + 1,
        total: false,
        parentID: item['parentID'] ? '2' : '1',
        dateFrom: item['dateFrom'] ? dateService.formatDate(item['dateFrom']) : '',
        dateTo: item['dateTo'] ? dateService.formatDate(item['dateTo']) : ''
      })
    })
    if (sickness.length) {
      result[`illnessKind${i}`] = true
      sickness.push({
        total: true,
        dayPay: sumDayPay,
        dayFSSU: sumDayFSSU
      })
      result.sicknessList.push({
        sicknessE: i === 2,
        sickness,
        titleIllnessKind: ''
      })
    }
  }

  if (result.illnessKind1 || result.illnessKind2) {
    result.assignHelpText = UB.i18n('I. Призначити допомогу:')
    if (result.illnessKind1 && result.illnessKind2) {
      result.sicknessList[0].titleIllnessKind = UB.i18n('1.1. По тимчасовій непрацездатності, вагітності та пологах (згідно паперових листків непрацездатності).')
      result.sicknessList[1].titleIllnessKind = UB.i18n('1.2. По тимчасовій непрацездатності, вагітності та пологах (згідно електронних листків непрацездатності).')
    } else {
      result.sicknessList[0].titleIllnessKind = UB.i18n('1. По тимчасовій непрацездатності, вагітності та пологах.')
    }
  }

  //--------------------
  result.funeral = sicknessMeetingDt.filter(el => el.isPay && el.empOrderFuneralID).sort((a, b) => stringService.compareStringUa(a.sFIO, b.sFIO) === 1 ? 1 : -1)
  result.funeralTitle = result.funeral.length ? UB.i18n('{0}. На поховання.', result.illnessKind1 || result.illnessKind2 ? 2 : 1) : ''
  result.funeral.forEach((item, k) => {
    item['pn'] = k + 1
    let doc = item['fdocs'] ? `; ${item['fdocs']}` : ''
    item['fdocs'] = UB.i18n(`Свідоцтво про смерть {0}{1} вiд {2}{3}`, item['fseriaDoc'], item['fnumberDoc'], dateService.formatDate(item['fdateDoc']), doc)
  })
  if (result.funeral.length && !result.illnessKindText) {
    result.assignHelpText = UB.i18n('I. Призначити допомогу:')
  }

  //--------------------
  let nppRefus = 0
  const refusalSick = sicknessMeetingDt.filter(el => {
    let calendarDays = el.dateFrom && el.dateFrom ? dateService.dayDiff(el.dateFrom, el.dateTo) + 1 : null
    el.calendarDays = calendarDays
    return el.empOrderSicknessID && el.illCode !== '8' && (!el.isPay || (el.isPay && calendarDays !== el.dayPay))
  }).sort((a, b) =>
    stringService.compareStringUa(a.sFIO, b.sFIO) === 1 ? 1
      : stringService.compareStringUa(a.sFIO, b.sFIO) === 0
        ? ((a.dateFrom ? dateService.shiftDate(a.dateFrom) : dateService.minDate()) > (b.dateFrom ? dateService.shiftDate(b.dateFrom) : dateService.minDate()) ? 1 : -1) : -1)
  if (refusalSick.length) {
    refusalSick.forEach((item, k) => {
      item['pn'] = k + 1
      item['refusalDate'] = [item['dateFrom'] ? dateService.formatDate(item['dateFrom']) : '',
        item['dateTo'] ? dateService.formatDate(item['dateTo']) : ''].filter(Boolean).join(' - ')

      item['noPayDays'] = item['calendarDays'] - item['dayPay']
      item['dateFromStop'] = item['dateFromStop'] ? dateService.formatDate(item['dateFromStop']) : ''
    })
    result.refuseList.push({
      refuseTitle: UB.i18n(`${++nppRefus}. По тимчасовій непрацездатності`),
      refuse: refusalSick
    })
  }

  const refusalPreg = sicknessMeetingDt.filter(el => {
    let calendarDays = el.dateFrom && el.dateFrom ? dateService.dayDiff(el.dateFrom, el.dateTo) + 1 : null
    el.calendarDays = calendarDays
    return el.empOrderSicknessID && el.illCode === '8' && (!el.isPay || (el.isPay && calendarDays !== el.dayPay))
  }).sort((a, b) =>
    stringService.compareStringUa(a.sFIO, b.sFIO) === 1 ? 1
      : stringService.compareStringUa(a.sFIO, b.sFIO) === 0
        ? ((a.dateFrom ? dateService.shiftDate(a.dateFrom) : dateService.minDate()) > (b.dateFrom ? dateService.shiftDate(b.dateFrom) : dateService.minDate()) ? 1 : -1) : -1)

  if (refusalPreg.length) {
    refusalPreg.forEach((item, k) => {
      item['pn'] = k + 1
      item['refusalDate'] = [item['dateFrom'] ? dateService.formatDate(item['dateFrom']) : '',
        item['dateTo'] ? dateService.formatDate(item['dateTo']) : ''].filter(Boolean).join(' - ')
      item['noPayDays'] = item['calendarDays'] - item['dayPay']
      item['dateFromStop'] = item['dateFromStop'] ? dateService.formatDate(item['dateFromStop']) : ''
    })
    result.refuseList.push({
      refuseTitle: UB.i18n(`${++nppRefus}. По вагітності та пологах`),
      refuse: refusalPreg
    })
  }

  const refusalFuneral = sicknessMeetingDt.filter(el => {
    let calendarDays = el.dateFrom && el.dateFrom ? dateService.dayDiff(el.dateFrom, el.dateTo) + 1 : null
    el.calendarDays = calendarDays
    return el.empOrderFuneralID && !el.isPay
  }).sort((a, b) => stringService.compareStringUa(a.sFIO, b.sFIO) === 1 ? 1 : -1)

  if (refusalFuneral.length) {
    refusalFuneral.forEach((item, k) => {
      item['pn'] = k + 1
      item['serie'] = ''
      item['number'] = ''
      item['refusalDate'] = ''
      item['noPayDays'] = ''
      item['dateFromStop'] = ''
    })
    result.refuseList.push({
      refuseTitle: UB.i18n(`${++nppRefus}. На поховання`),
      refuse: refusalFuneral
    })
  }

  result.refuseHelpText = nppRefus ? UB.i18n('{0}. Відмовити в призначенні (припинити виплату) допомоги:', result.assignHelpText ? 'II' : 'I') : ''

  mParams.resultData = JSON.stringify(result)

  function getMonthName (numberMonth) {
    let months = ['сiчня', 'лютого', 'березня', 'квiтня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня']
    return months[numberMonth - 1]
  }
}
