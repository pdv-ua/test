const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const dateService = require('../AC/modules/dataServices/dateService')
const settingsService = require('../AC/modules/entityServices/settingsService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)
me.on('delete:before', beforeDelete)

me.entity.addMethod('massStipendChange')

function beforeInsert (ctx) {
  const execParams = ctx.mParams.execParams

  const empPosStore = UB.DataStore('hr_employeePosition')
  const store = UB.DataStore(__entityName)

  const dateFrom = dateService.shiftDate(execParams.dateFrom)
  const dateTo = dateService.shiftDate(execParams.dateTo)

  const lastStudStipend = UB.Repository(__entityName)
    .attrs('ID', 'dateFrom')
    .where('employeeNumberID', '=', execParams.employeeNumberID)
    .where('dateTo', '>=', '#maxdate')
    .limit(1)
    .selectSingle()
  if (lastStudStipend) {
    if (dateService.shiftDate(lastStudStipend['dateFrom']) < dateFrom) {
      store.run('update', {
        __skipOptimisticLock: true,
        execParams: {
          ID: lastStudStipend['ID'],
          dateTo: dateService.addDays(dateFrom, -1)
        }
      })
    } else if (!dateService.isMaxDate(execParams.dateTo) && dateService.shiftDate(lastStudStipend['dateFrom']) <= dateTo) {
      store.run('update', {
        __skipOptimisticLock: true,
        execParams: {
          ID: lastStudStipend['ID'],
          dateFrom: dateService.addDays(dateTo, 1)
        }
      })
    }
  }

  if (!ctx.mParams.skipCreateEmpPos) {
    const orgID = UB.Repository('hr_employeeNumber')
      .attrs('orgID')
      .where('ID', '=', execParams.employeeNumberID)
      .selectScalar()
    const departmentID = UB.Repository('hr_studEducationHistory')
      .attrs('departmentID')
      .where('employeeNumberID', '=', execParams.employeeNumberID)
      .where('dateFrom', '<=', dateTo)
      .where('dateTo', '>=', dateFrom)
      .limit(1)
      .selectScalar()
    const orderStore = UB.DataStore('hr_orderPay')
    const orderID = orderStore.generateID()
    orderStore.run('insert', {
      execParams: {
        ID: orderID,
        employeeNumberID: execParams.employeeNumberID,
        orderState: 'POSTED',
        empOrderType: 'APPOINT',
        orderNumber: null,
        orderDate: dateFrom,
        entryDate: dateFrom
      }
    })
    const payElID = UB.Repository('hr_dictStipendAmount')
      .attrs('payElID')
      .where('orgID', '=', orgID)
      .where('dictTypeStipendID', '=', execParams.typeStipend || 0)
      .where('averageScoreMin', '<=', execParams.averageScore || 0)
      .where('averageScoreMax', '>=', execParams.averageScore || 0)
      .where('dateFrom', '<=', dateFrom)
      .where('dateTo', '>=', dateFrom)
      .limit(1)
      .selectScalar() || null
    const dictPositionID = settingsService.get('hrDefaultStudentPosition', orgID, null)
    const dictPositionItem = dictPositionID ? UB.Repository('hr_dictPosition')
      .attrs('dictStaffCatID', 'workScheduleID')
      .selectById(Number(dictPositionID) || 0) : null
    const employeePositionID = empPosStore.generateID()
    empPosStore.run('insert', {
      execParams: {
        ID: employeePositionID,
        employeeID: execParams.employeeID,
        employeeNumberID: execParams.employeeNumberID,
        dictPositionID,
        dateFrom,
        dateTo,
        departmentID,
        orderID,
        organizationID: orgID,
        accrualSum: execParams.sumStipend || 0,
        payElID,
        dictStaffCatID: dictPositionItem ? dictPositionItem['dictStaffCatID'] : null,
        workScheduleID: dictPositionItem ? dictPositionItem['workScheduleID'] : null,
        mtCount: 1
      }
    })
    execParams.employeePositionID = employeePositionID
  }
}

function beforeUpdate (ctx) {
  if (ctx.mParams.skipBefore) {
    return
  }
  const execParams = ctx.mParams.execParams
  if ((execParams.dateFrom || execParams.dateTo || execParams.dateToEmpty || execParams.sumStipend !== undefined)) {
    const instanceData = ctx.dataStore.getAsJsObject()[0] || {}
    const params = {}
    if (execParams.dateFrom) {
      params.dateFrom = execParams.dateFrom
    }
    if (execParams.dateTo) {
      params.dateTo = execParams.dateTo
    }
    if (execParams.dateToEmpty) {
      params.dateToEmpty = execParams.dateToEmpty
    }
    if (execParams.sumStipend !== undefined) {
      params.accrualSum = execParams.sumStipend
    }

    if (instanceData.employeePositionID) {
      const empPos = UB.Repository('hr_employeePosition')
        .attrs('ID')
        .selectById(instanceData.employeePositionID)
      if (empPos) {
        const empPosStore = UB.DataStore('hr_employeePosition')
        params.ID = instanceData.employeePositionID
        empPosStore.run('update', {
          __skipSelectAfterUpdate: true,
          __skipOptimisticLock: true,
          isDirectUpdate: true,
          execParams: params
        })
      }
    }
    if (instanceData.employeeAccrualID) {
      const empAccrual = UB.Repository('hr_employeeAccrual')
        .attrs('ID')
        .selectById(instanceData.employeeAccrualID)
      if (empAccrual) {
        const empAccrualStore = UB.DataStore('hr_employeeAccrual')
        params.ID = instanceData.employeeAccrualID
        empAccrualStore.run('update', {
          __skipSelectAfterUpdate: true,
          __skipOptimisticLock: true,
          execParams: params
        })
      }
    }
  }
}

function beforeDelete (ctx) {
  const instanceData = ctx.dataStore.getAsJsObject()[0] || {}
  if (instanceData.employeePositionID) {
    const empPos = UB.Repository('hr_employeePosition')
      .attrs('ID')
      .selectById(instanceData.employeePositionID)
    if (empPos) {
      const empPosStore = UB.DataStore('hr_employeePosition')
      empPosStore.run('delete', {
        __skipOptimisticLock: true,
        execParams: {
          ID: instanceData.employeePositionID
        }
      })
    }
  }
  if (instanceData.employeeAccrualID) {
    const empAccrual = UB.Repository('hr_employeeAccrual')
      .attrs('ID')
      .selectById(instanceData.employeeAccrualID)
    if (empAccrual) {
      const empAccrualStore = UB.DataStore('hr_employeeAccrual')
      empAccrualStore.run('delete', {
        __skipOptimisticLock: true,
        execParams: {
          ID: instanceData.employeeAccrualID
        }
      })
    }
  }
}

me.massStipendChange = function (ctx) {
  const mParams = ctx.mParams
  if (!mParams.orgID || !mParams.dateFrom) {
    return
  }
  const store = UB.DataStore('hr_studStipend')
  const empPosStore = UB.DataStore('hr_employeePosition')
  const empAccStore = UB.DataStore('hr_employeeAccrual')
  const dateFrom = dateService.shiftDate(mParams.dateFrom)
  const dateTo = dateService.addDays(dateFrom, -1)

  const dictStipendAmount = UB.Repository('hr_dictStipendAmount')
    .attrs('dictTypeStipendID', 'accrualSum', 'payElID')
    .where('orgID', '=', mParams.orgID)
    .where('dateFrom', '<=', dateFrom)
    .where('dateTo', '>=', dateFrom)
    .selectAsObject()

  const studStipend = UB.Repository('hr_studStipend')
    .attrs('ID', 'dateFrom', 'dateTo', 'employeeID', 'employeeNumberID', 'averageScore', 'typeStipend', 'sumStipend',
      'employeePositionID', 'employeePositionID.payElID', 'employeeAccrualID', 'employeeAccrualID.payElID')
    .exists(UB.Repository('hr_employeeNumberSR')
      .correlation('ID', 'employeeNumberID')
      .where('orgID', '=', mParams.orgID)
      .where('mi_deleteDate', '>=', '#maxdate'))
    .where('dateFrom', '<=', dateFrom)
    .where('dateTo', '>=', dateFrom)
    .selectAsObject()

  studStipend.forEach(row => {
    row['dateFrom'] = dateService.shiftDate(row['dateFrom'])
    row['dateTo'] = dateService.shiftDate(row['dateTo'])
    const dictStipendAmountItem = dictStipendAmount.find(o => o['dictTypeStipendID'] === row.typeStipend)
    if (dictStipendAmountItem && (dictStipendAmountItem['accrualSum'] !== row['sumStipend'] || dictStipendAmountItem['payElID'] !== row['employeePositionID.payElID'])) {
      if (row['dateFrom'].getTime() === dateFrom.getTime()) {
        if (dictStipendAmountItem['accrualSum'] !== row['sumStipend']) {
          store.run('update', {
            __skipOptimisticLock: true,
            skipBefore: true,
            execParams: {
              ID: row['ID'],
              sumStipend: dictStipendAmountItem['accrualSum']
            }
          })
        }
        if (row['employeePositionID']) {
          const empPos = UB.Repository('hr_employeePosition')
            .attrs('ID')
            .selectById(row['employeePositionID'])
          if (empPos) {
            empPosStore.run('update', {
              __skipSelectAfterUpdate: true,
              __skipOptimisticLock: true,
              isDirectUpdate: true,
              execParams: {
                ID: row['employeePositionID'],
                accrualSum: dictStipendAmountItem['accrualSum'] || 0,
                payElID: dictStipendAmountItem['payElID']
              }
            })
          }
        }
        if (row['employeeAccrualID']) {
          const empAcc = UB.Repository('hr_employeeAccrual')
            .attrs('ID')
            .selectById(row['employeeAccrualID'])
          if (empAcc) {
            empAccStore.run('update', {
              __skipSelectAfterUpdate: true,
              __skipOptimisticLock: true,
              isDirectUpdate: true,
              execParams: {
                ID: row['employeeAccrualID'],
                accrualSum: dictStipendAmountItem['accrualSum'] || 0,
                payElID: dictStipendAmountItem['payElID']
              }
            })
          }
        }
      } else {
        const skipCreateEmpPos = !!row['employeeAccrualID']
        store.run('update', {
          __skipOptimisticLock: true,
          execParams: {
            ID: row['ID'],
            dateTo: row['dateFrom'] < dateTo ? dateTo : row['dateFrom']
          }
        })
        let employeeAccrualID = null
        if (!skipCreateEmpPos) {
          employeeAccrualID = empAccStore.generateID()
          empAccStore.run('insert', {
            execParams: {
              ID: employeeAccrualID,
              employeeNumberID: row['employeeNumberID'],
              employeeID: row['employeeID'],
              dateFrom: dateFrom,
              dateTo: row['dateTo'],
              payElID: dictStipendAmountItem['payElID'],
              accrualSum: dictStipendAmountItem['accrualSum']
            }
          })
        }
        store.run('insert', {
          skipCreateEmpPos,
          execParams: {
            employeeNumberID: row['employeeNumberID'],
            employeeID: row['employeeID'],
            dateFrom: dateFrom,
            dateTo: row['dateTo'],
            typeStipend: row['typeStipend'],
            averageScore: row['averageScore'],
            sumStipend: dictStipendAmountItem['accrualSum'],
            employeeAccrualID
          }
        })
      }
    }
  })
}
