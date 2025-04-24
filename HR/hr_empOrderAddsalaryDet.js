const UB = require('@unitybase/ub')
const moment = require('moment')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const ebs = require('../AC/modules/entityServices/entityBaseService')
const dateService = require('../AC/modules/dataServices/dateService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)
me.on('update:after', afterUpdate)

me.entity.addMethod('recalc')
me.entity.addMethod('clearEmployees')
me.entity.addMethod('loadAccrualChangesFromStaffTable')
me.entity.addMethod('loadAccrualChangesFromStaffTariffing')

function setDescription (ctx) {
  const execParams = ctx.mParams.execParams
  let parts = ebs.getCompositeAttributeValue(ctx, 'description',
    ['payElID.name', 'departmentID.name', 'dateFrom'], '^', true).split('^')
  execParams.description = UB.i18n(`{0} Вид оплати "{1}" з {2} `, parts[1] ? ('Підрозділ ' + parts[1] + ',') : '', parts[0], moment(parts[2], 'DD.MM.YYYY').format('LL'))
  execParams.title = execParams.description
}

function beforeInsert (ctx) {
  global['hr_empOrderDet'].setItemIdx(ctx)
  setDescription(ctx)
}

me.recalc = function (ctx) {
  const mParams = ctx.mParams
  const me = UB.Repository(__entityName)
    .attrs(['payElID', 'payType', 'accrualValue', 'dateFrom', 'dateTo', 'dictFundSourceID'])
    .selectById(mParams.ID)
  const emp = UB.Repository('hr_empOrderChgSalEmpDet')
    .attrs(['ID', 'positionID', 'employeeNumberID.dateFrom', 'employeePositionID.posName', 'departmentID', 'employeePositionID.depName'])
    .where('paraID', '=', mParams.ID)
    .selectAsObject()
  if (!emp.length) {
    return
  }
  const dateFrom = dateService.shiftDate(me.dateFrom)
  const ds = UB.DataStore('hr_empOrderChgSalEmpDet')
  emp.forEach(item => {
    const enDateFrom = dateService.shiftDate(item['employeeNumberID.dateFrom'])
    ds.run('update', {
      __skipOptimisticLock: true,
      execParams: {
        ID: item.ID,
        payElID: me.payElID,
        dictFundSourceID: me.dictFundSourceID,
        newValue: me.payType === 'PRC' ? null : me.accrualValue,
        accrualRate: me.payType === 'PRC' ? me.accrualValue : null,
        dateFrom: enDateFrom > dateFrom ? enDateFrom : dateFrom,
        dateTo: me.dateTo || '#maxdate',
        positionID: item.positionID,
        departmentID: item.departmentID,
        depName: item['employeePositionID.depName'],
        posName: item['employeePositionID.posName']
      }
    })
  })
}

me.clearEmployees = ctx => {
  let detail = UB.Repository('hr_empOrderChgSalEmpDet').attrs('ID').where('paraID', '=', ctx.mParams.ID).selectAsObject()
  let store = UB.DataStore('hr_empOrderChgSalEmpDet')
  detail.forEach(item => {
    store.run('delete', {
      execParams: {
        ID: item.ID
      }
    })
  })
}

function beforeUpdate (ctx) {
  if (ctx.mParams.isOrderOperation) {
    return
  }
  setDescription(ctx)
}

function afterUpdate (ctx) {
  if (ctx.mParams.isOrderOperation || (ctx.mParams.execParams.dateTo === undefined && ctx.mParams.execParams.dictFundSourceID === undefined)) {
    return
  }
  const dateTo = ctx.mParams.execParams.dateTo ? dateService.shiftDate(ctx.mParams.execParams.dateTo) : '#maxdate'
  let detail = UB.Repository('hr_empOrderChgSalEmpDet')
    .attrs(['ID', 'payElID', 'dictFundSourceID', 'dateTo'])
    .where('paraID', '=', ctx.mParams.execParams.ID)
    .selectAsObject()
  let store = UB.DataStore('hr_empOrderChgSalEmpDet')
  detail.forEach(item => {
    store.run('update', {
      __skipOptimisticLock: true,
      execParams: {
        ID: item.ID,
        payElID: item.payElID,
        dictFundSourceID: ctx.mParams.execParams.dictFundSourceID === undefined ? item.dictFundSourceID : ctx.mParams.execParams.dictFundSourceID,
        dateTo: ctx.mParams.execParams.dateTo === undefined ? item.dateTo : dateTo
      }
    })
  })
}

me.loadAccrualChangesFromStaffTable = function (ctx) {
  const mParams = ctx.mParams
  const staffTableID = mParams.staffTableID
  const orderID = mParams.orderID
  const datePosCheck = dateService.shiftDate(mParams.datePosCheck)
  const posAccrualCheck = mParams.posAccrualCheck

  if (staffTableID && orderID) {
    const staffTable = UB.Repository('hr_staffTable')
      .attrs(['entryOrderID.entryDate', 'description', 'entryOrderID.description'])
      .selectById(staffTableID)
    const order = UB.Repository('hr_empOrder')
      .attrs(['organizationID'])
      .selectById(orderID)

    const entryDate = staffTable['entryOrderID.entryDate']
    const addAccruals = []
    const cancelAccruals = []

    const positionList = UB.Repository('hr_position')
      .attrs(['ID', 'mi_data_id', ''])
      .where('staffOrderID', '=', staffTableID)
      .misc({ __mip_recordhistory_all: true })
      .selectAsObject()
    positionList.forEach(pos => {
      const curAccruals = UB.Repository('hr_positionAccrual')
        .attrs(['ID', 'payElID', 'accrualSum', 'accrualRate'])
        .where('positionID', '=', pos.ID)
        .selectAsObject()
      const prevPos = UB.Repository('hr_position')
        .attrs(['ID'])
        .where('mi_data_id', '=', pos.mi_data_id)
        .where('state', '=', 'ACTIVE')
        .where('mi_dateTo', '<', entryDate)
        .misc({ __mip_recordhistory_all: true })
        .orderBy('mi_dateFrom', 'desc')
        .selectSingle()
      if (prevPos) {
        const prevAccruals = UB.Repository('hr_positionAccrual')
          .attrs(['ID', 'payElID', 'accrualSum', 'accrualRate'])
          .where('positionID', '=', prevPos.ID)
          .selectAsObject()
        curAccruals.forEach(acc => {
          const prevAcc = prevAccruals.find(o => o.payElID === acc.payElID)
          if (!prevAcc || prevAcc.accrualSum !== acc.accrualSum || prevAcc.accrualRate !== acc.accrualRate) {
            addAccruals.push({
              positionID: pos['mi_data_id'],
              payElID: acc.payElID,
              accrualSum: acc.accrualSum,
              accrualRate: acc.accrualRate
            })
          }
        })
        prevAccruals.forEach(acc => {
          const curAcc = curAccruals.find(o => o.payElID === acc.payElID)
          if (!curAcc) {
            cancelAccruals.push({
              positionID: pos['mi_data_id'],
              payElID: acc.payElID
            })
          }
        })
      }
    })
    const addSalaryStore = UB.DataStore('hr_empOrderAddsalaryDet')
    const cancelSalaryStore = UB.DataStore('hr_empOrderCancelsalaryDet')
    const empDetStore = UB.DataStore('hr_empOrderChgSalEmpDet')

    const addSalaryDet = UB.Repository('hr_empOrderAddsalaryDet')
      .attrs('ID')
      .where('orderID', '=', orderID)
      .selectAsObject()
    addSalaryDet.forEach(row => {
      addSalaryStore.run('delete', {
        __skipOptimisticLock: true,
        execParams: {
          ID: row.ID
        }
      })
    })
    const cancelSalaryDet = UB.Repository('hr_empOrderCancelsalaryDet')
      .attrs('ID')
      .where('orderID', '=', orderID)
      .selectAsObject()
    cancelSalaryDet.forEach(row => {
      cancelSalaryStore.run('delete', {
        __skipOptimisticLock: true,
        execParams: {
          ID: row.ID
        }
      })
    })
    addAccruals.forEach(acc => {
      const empPosQuery = UB.Repository('hr_employeePositionS')
        .attrs(['ID'])
        .where('positionID', '=', acc.positionID)
        .where('dateFrom', '<=', entryDate)
        .where('dateTo', '>=', entryDate)

      if (posAccrualCheck !== 'ALL' && datePosCheck) {
        if (posAccrualCheck === 'CORRESPOND') {
          empPosQuery.where('[positionID.accrualSum] = [accrualSum]', 'custom')
        }
        if (posAccrualCheck === 'NOT_CORRESPOND') {
          empPosQuery.where('[positionID.accrualSum] <> [accrualSum]', 'custom')
        }
        empPosQuery
          .joinCondition('positionID.mi_dateFrom', '<=', datePosCheck)
          .joinCondition('positionID.mi_dateTo', '>=', datePosCheck)
          .joinCondition('positionID.mi_deleteDate', '>=', '#maxdate')
          .joinCondition('positionID.state', '=', 'ACTIVE')
      }

      const empPos = empPosQuery.selectAsObject()
      if (empPos.length) {
        const paraID = addSalaryStore.generateID()
        addSalaryStore.run('insert', {
          execParams: {
            ID: paraID,
            orderID,
            organizationID: order.organizationID,
            empOrderType: 'ADDSALARY',
            dateFrom: dateService.shiftDate(entryDate),
            payElID: acc.payElID,
            payType: acc.accrualSum ? 'SUM' : (acc.accrualRate ? 'PRC' : null),
            accrualValue: acc.accrualSum || acc.accrualRate,
            isGroup: 1,
            reason: staffTable['entryOrderID.description']
          }
        })
        empPos.forEach(emp => {
          empDetStore.run('insert', {
            execParams: {
              orderID,
              paraID,
              empOrderType: 'ADDSALARY',
              employeePositionID: emp.ID,
              payElID: acc.payElID,
              dateFrom: dateService.shiftDate(entryDate),
              newValue: acc.accrualSum,
              accrualRate: acc.accrualRate,
              valuation: acc.accrualSum ? 'SUM' : (acc.accrualRate ? 'PRC' : null)
            }
          })
        })
      }
    })
    cancelAccruals.forEach(acc => {
      const empPosQuery = UB.Repository('hr_employeePositionS')
        .attrs(['ID', 'employeeNumberID'])
        .where('positionID', '=', acc.positionID)
        .where('dateFrom', '<=', entryDate)
        .where('dateTo', '>=', entryDate)
        .exists(UB.Repository('hr_employeeAccrual')
          .correlation('employeeNumberID', 'employeeNumberID')
          .where('payElID', '=', acc.payElID)
          .where('dateFrom', '<=', entryDate)
          .where('dateTo', '>=', entryDate)
        )

      if (posAccrualCheck !== 'ALL' && datePosCheck) {
        if (posAccrualCheck === 'CORRESPOND') {
          empPosQuery.where('[positionID.accrualSum] = [accrualSum]', 'custom')
        }
        if (posAccrualCheck === 'NOT_CORRESPOND') {
          empPosQuery.where('[positionID.accrualSum] <> [accrualSum]', 'custom')
        }
        empPosQuery
          .joinCondition('positionID.mi_dateFrom', '<=', datePosCheck)
          .joinCondition('positionID.mi_dateTo', '>=', datePosCheck)
          .joinCondition('positionID.mi_deleteDate', '>=', '#maxdate')
          .joinCondition('positionID.state', '=', 'ACTIVE')
      }

      const empPos = empPosQuery.selectAsObject()
      if (empPos.length) {
        const paraID = cancelSalaryStore.generateID()
        cancelSalaryStore.run('insert', {
          execParams: {
            ID: paraID,
            orderID,
            organizationID: order.organizationID,
            empOrderType: 'CANCELSALARY',
            dateFrom: dateService.shiftDate(entryDate),
            payElID: acc.payElID,
            isGroup: 1,
            reason: staffTable['entryOrderID.description']
          }
        })
        empPos.forEach(emp => {
          const empAccruals = UB.Repository('hr_employeeAccrual')
            .attrs('ID', 'dateFrom')
            .where('employeeNumberID', 'in', emp.employeeNumberID)
            .where('payElID', '=', acc.payElID)
            .where('dateFrom', '<=', entryDate)
            .where('dateTo', '>=', entryDate)
            .selectAsObject()
          empAccruals.forEach(pAccr => {
            empDetStore.run('insert', {
              execParams: {
                orderID,
                paraID,
                empOrderType: 'CANCELSALARY',
                employeePositionID: emp.ID,
                payElID: acc.payElID,
                accrualID: pAccr.ID,
                dateFrom: dateService.shiftDate(pAccr.dateFrom),
                dateTo: dateService.addDays(dateService.shiftDate(entryDate), -1)
              }
            })
          })
        })
      }
    })
  }
}

me.loadAccrualChangesFromStaffTariffing = function (ctx) {
  const mParams = ctx.mParams
  const staffTariffingID = mParams.staffTariffingID
  const orderID = mParams.orderID
  const organizationID = mParams.organizationID

  if (staffTariffingID && orderID) {
    const staffTariffing = UB.Repository('hr_staffTariffing')
      .attrs(['entryDate', 'description'])
      .selectById(staffTariffingID)

    const entryDate = dateService.shiftDate(staffTariffing['entryDate'])
    const addAccruals = []
    const cancelAccruals = []

    const empPosData = UB.Repository('hr_staffTariffingPos')
      .attrs(['employeePositionID', 'employeePositionID.employeeNumberID', 'accrualDt'])
      .where('staffTariffingID', '=', staffTariffingID)
      .where('employeePositionID', 'isNotNull')
      .where('employeePositionID.isActive', '=', 1)
      .where('employeePositionID.mi_deleteDate', '>=', '#maxdate')
      .selectAsObject({
        'employeePositionID.employeeNumberID': 'employeeNumberID'
      })
    const empNumbers = empPosData.map(o => o.employeeNumberID)

    if (!empNumbers.length) empNumbers.push(0)

    const empAccruals = UB.Repository('hr_employeeAccrual')
      .attrs('ID', 'employeeNumberID', 'payElID', 'accrualSum', 'accrualRate', 'dateFrom')
      .where('employeeNumberID', 'in', empNumbers)
      .where('dateFrom', '<=', entryDate)
      .where('dateTo', '>=', entryDate)
      .where('isActive', '=', 1)
      .selectAsObject()

    const payElTariffIDs = UB.Repository('hr_payEl')
      .attrs('ID')
      .where('methodID.code', '=', '144')
      .selectAsArrayOfValues()

    empPosData.forEach(emp => {
      const prevAccruals = empAccruals.filter(o => o.employeeNumberID === emp.employeeNumberID)
      // to add
      const curAccruals = (emp.accrualDt ? JSON.parse(emp.accrualDt) : []).filter(o => !payElTariffIDs.includes(o.payElID))
      curAccruals.forEach(acc => {
        const prevAcc = prevAccruals.find(o => o.payElID === acc.payElID)
        if ((!prevAcc || prevAcc.accrualSum !== acc.paySum || prevAcc.accrualRate !== acc.rate) && (acc.paySum || acc.rate)) {
          addAccruals.push({
            employeePositionID: emp.employeePositionID,
            payElID: acc.payElID,
            accrualSum: acc.paySum,
            accrualRate: acc.rate
          })
        }
      })
      // to cancel
      prevAccruals.forEach(acc => {
        const curAcc = curAccruals.find(o => o.payElID === acc.payElID)
        if (!curAcc) {
          cancelAccruals.push({
            employeePositionID: emp.employeePositionID,
            dateFrom: acc.dateFrom,
            accrualID: acc.ID,
            payElID: acc.payElID
          })
        }
      })
    })

    const addSalaryStore = UB.DataStore('hr_empOrderAddsalaryDet')
    const cancelSalaryStore = UB.DataStore('hr_empOrderCancelsalaryDet')
    const empDetStore = UB.DataStore('hr_empOrderChgSalEmpDet')

    const addSalaryDet = UB.Repository('hr_empOrderAddsalaryDet')
      .attrs('ID')
      .where('orderID', '=', orderID)
      .selectAsObject()
    addSalaryDet.forEach(row => {
      addSalaryStore.run('delete', {
        __skipOptimisticLock: true,
        execParams: {
          ID: row.ID
        }
      })
    })
    const cancelSalaryDet = UB.Repository('hr_empOrderCancelsalaryDet')
      .attrs('ID')
      .where('orderID', '=', orderID)
      .selectAsObject()
    cancelSalaryDet.forEach(row => {
      cancelSalaryStore.run('delete', {
        __skipOptimisticLock: true,
        execParams: {
          ID: row.ID
        }
      })
    })
    addAccruals.forEach(acc => {
      const paraID = addSalaryStore.generateID()
      addSalaryStore.run('insert', {
        execParams: {
          ID: paraID,
          orderID,
          organizationID: organizationID,
          empOrderType: 'ADDSALARY',
          dateFrom: dateService.shiftDate(entryDate),
          payElID: acc.payElID,
          payType: acc.accrualRate ? 'PRC' : (acc.accrualSum ? 'SUM' : null),
          accrualValue: acc.accrualRate || acc.accrualSum,
          isGroup: 1,
          reason: staffTariffing['description']
        }
      })
      empDetStore.run('insert', {
        execParams: {
          orderID,
          paraID,
          empOrderType: 'ADDSALARY',
          employeePositionID: acc.employeePositionID,
          payElID: acc.payElID,
          dateFrom: dateService.shiftDate(entryDate),
          newValue: acc.accrualRate ? null : acc.accrualSum,
          accrualRate: acc.accrualRate || null,
          valuation: acc.accrualRate ? 'PRC' : (acc.accrualSum ? 'SUM' : null)
        }
      })
    })
    cancelAccruals.forEach(acc => {
      const paraID = cancelSalaryStore.generateID()
      cancelSalaryStore.run('insert', {
        execParams: {
          ID: paraID,
          orderID,
          organizationID: organizationID,
          empOrderType: 'CANCELSALARY',
          dateFrom: dateService.shiftDate(entryDate),
          payElID: acc.payElID,
          isGroup: 1,
          reason: staffTariffing['description']
        }
      })
      empDetStore.run('insert', {
        execParams: {
          orderID,
          paraID,
          empOrderType: 'CANCELSALARY',
          employeePositionID: acc.employeePositionID,
          payElID: acc.payElID,
          accrualID: acc.accrualID,
          dateFrom: dateService.shiftDate(acc.dateFrom),
          dateTo: dateService.addDays(dateService.shiftDate(entryDate), -1)
        }
      })
    })
  }
}
