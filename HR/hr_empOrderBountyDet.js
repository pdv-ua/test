const __entityName = __filename.slice(__dirname.length + 1, -3)
const UB = require('@unitybase/ub')
const me = global[__entityName]
// const orderService = require('../HR/modules/orderService')
const ebs = require('../AC/modules/entityServices/entityBaseService')
const accrualService = require('../HR/modules/accrualService')
const orderService = require('../HR/modules/orderService')
const periodService = require('../HR/modules/periodService')
const dateService = require('../AC/modules/dataServices/dateService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)
me.on('update:after', afterUpdate)

me.entity.addMethod('recalcBounty')
me.entity.addMethod('updateBountyPayEl')

me.entity.addMethod('fillEmployee')
me.entity.addMethod('loadEmployeeList')

me.entity.addMethod('doPosting')

me.entity.addMethod('importList')

function changeSum (ctx) {
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  const bountySum = ctx.mParams.execParams.bountySum || instanceData.bountySum
  let newValue
  let oldValue
  let accrualRate
  let accrualCount
  const emp = UB.Repository('hr_empOrderChgSalEmpDet')
    .attrs(['employeePositionID.accrualSum', 'ID', 'bountyParaID.bountySum', 'bountyParaID.payType', 'bountyParaID.roundUpTo'])
    .where('paraID', '=', ctx.mParams.execParams.ID)
    .selectAsObject()
  const ds = UB.DataStore('hr_empOrderChgSalEmpDet')
  emp.forEach(item => {
    if (item['bountyParaID.payType'] === 'PLAN') {
      accrualCount = Number(bountySum)
      accrualRate = null
      oldValue = null
      newValue = null
    } else if (item['bountyParaID.payType'] === 'PRC') {
      accrualRate = Number(bountySum)
      oldValue = null
      newValue = null
      accrualCount = null
    } else {
      accrualRate = null
      oldValue = Number(bountySum)
      newValue = Number(bountySum)
      accrualCount = null
    }
    ds.run('update', {
      __skipOptimisticLock: true,
      execParams: {
        ID: item.ID,
        newValue: newValue,
        accrualRate: accrualRate,
        oldValue: oldValue,
        accrualCount: accrualCount
      }
    })
  })
}

me.fillEmployee = function (ctx) {
  const mParams = ctx.mParams
  const empOrderType = mParams.empOrderType
  let employeePosition = UB.Repository('hr_employeePositionS')
    .attrs('ID', 'accrualSum', 'positionID')
    .where('isActive', '=', true)
    .where('dateFrom', '<=', mParams.onDate)
    .where('dateTo', '>=', mParams.onDate)
  if (mParams['departmentID.mi_data_id']) {
    employeePosition = employeePosition.where('departmentID', '=', mParams['departmentID.mi_data_id'])
  } else {
    employeePosition = employeePosition.where('organizationID', '=', mParams.organizationID)
  }
  employeePosition = employeePosition.selectAsObject()
  // let newValue = accrualService.roundPayEl(oldValue + diff, para.roundUpTo || '1')
  const ds = UB.DataStore('hr_empOrderChgSalEmpDet')
  if (mParams.isDeleteExisting) {
    const existing = UB.Repository('hr_empOrderChgSalEmpDet').attrs('ID')
      .where('paraID', '=', mParams.paraID)
      .select()
    while (!existing.eof) {
      ds.run('delete', { execParams: { ID: existing.get('ID') } })
      existing.next()
    }
  }
  employeePosition.filter(item => item.positionID !== null).forEach(item => {
    let newValue
    let oldValue
    let accrualRate
    const isRecordNotExists = mParams.isDeleteExisting || UB.Repository('hr_empOrderChgSalEmpDet').attrs('ID')
      .where('paraID', '=', mParams.paraID)
      .where('employeePositionID', '=', item.ID)
      .select()
      .eof
    if (isRecordNotExists) {
      if (mParams.payType === 'PRC') {
        accrualRate = Number(mParams.bountySum)
        if (empOrderType === 'BOUNTY') {
          oldValue = null
          newValue = null
        } else {
          oldValue = Number(item.accrualSum)
          newValue = accrualService.roundPayEl(Number(oldValue / 100 * accrualRate), mParams.roundUpTo || '1')
        }
      } else {
        accrualRate = null
        oldValue = Number(mParams.bountySum)
        newValue = oldValue
      }
      ds.run('insert', {
        execParams: {
          employeePositionID: item.ID,
          positionID: item.positionID,
          accrualRate: accrualRate,
          oldValue: oldValue,
          newValue: newValue,
          payElID: mParams.payElID,
          orderID: mParams.orderID,
          paraID: mParams.paraID,
          dateFrom: mParams.onDate,
          dateTo: mParams.onDate
        }
      })
    }
  })
}

me.loadEmployeeList = function (ctx) {
  const mParams = ctx.mParams
  const ds = UB.DataStore('hr_empOrderChgSalEmpDet')
  if (mParams.isDeleteExisting) {
    const existing = UB.Repository('hr_empOrderChgSalEmpDet').attrs('ID')
      .where('paraID', '=', mParams.paraID)
      .select()
    while (!existing.eof) {
      ds.run('delete', { execParams: { ID: existing.get('ID') } })
      existing.next()
    }
  }
  const empOrderType = mParams.empOrderType
  const employeePosition = UB.Repository('hr_employeePositionS')
    .attrs('ID', 'accrualSum', 'positionID', 'workPlace')
    .where('ID', 'in', mParams.records)
    .selectAsObject()
  employeePosition.forEach(item => {
    let newValue = null
    let oldValue = null
    let accrualRate = null
    let avgCount = null
    let accrualCount = null
    const isRecordNotExists = mParams.isDeleteExisting || UB.Repository('hr_empOrderChgSalEmpDet').attrs('ID')
      .where('paraID', '=', mParams.paraID)
      .where('employeePositionID', '=', item.ID)
      .select()
      .eof
    if (isRecordNotExists) {
      if (empOrderType === 'BOUNTY_HELP') {
        switch (mParams.payType) {
          case 'PLAN': {
            accrualCount = mParams.bountySum
            break
          }
          case 'AVG': {
            avgCount = mParams.bountySum
            break
          }
          case 'SUM': {
            newValue = mParams.bountySum
            break
          }
          case 'PRC': {
            accrualRate = mParams.bountySum
            break
          }
        }
      } else if (empOrderType === 'BOUNTY') {
        if (mParams.payType === 'PLAN') {
          accrualCount = Number(mParams.bountySum)
          accrualRate = null
          oldValue = null
          newValue = null
        } else if (mParams.payType === 'PRC') {
          accrualRate = Number(mParams.bountySum)
          oldValue = null
          newValue = null
          accrualCount = null
        } else {
          accrualRate = null
          oldValue = Number(mParams.bountySum)
          newValue = oldValue
          accrualCount = null
        }
      }
      const workPlace = UB.Repository('ubm_enum')
        .attrs(['name'])
        .where('eGroup', '=', 'HR_WORKER_PLACE')
        .where('code', '=', item.workPlace)
        .selectScalar()

      ds.run('insert', {
        execParams: {
          employeePositionID: item.ID,
          positionID: item.positionID,
          accrualRate: accrualRate,
          oldValue: oldValue,
          newValue: newValue,
          avgCount: avgCount,
          accrualCount: accrualCount,
          payElID: mParams.payElID,
          orderID: mParams.orderID,
          paraID: mParams.paraID,
          dateFrom: mParams.dateFrom || mParams.onDate,
          dateTo: mParams.dateTo || null,
          valuation: mParams.payType,
          workPlace: workPlace
        }
      })
    }
  })
}

me.importList = function (ctx) {
  const mParams = ctx.mParams
  const ds = UB.DataStore('hr_empOrderChgSalEmpDet')
  const data = JSON.parse(mParams.parsedData)
  mParams.resultData = {
    msg: '',
    allRecordCount: 0,
    successLoadingCount: 0
  }
  let notFoundEmp = []
  data.forEach((row) => {
    const oldValue = null
    const avgCount = null
    const accrualCount = null
    const accrualRate = parseFloat(row.rate)
    const newValue = parseFloat(row.total)

    let empPosRequest = UB.Repository('hr_employeePosition')
      .attrs(['ID', 'description'])
      .where('organizationID', '=', mParams.organizationID)
      .where('isActive', '=', true)
      .where('dateFrom', '<=', mParams.onDate)

    if (!row.tabNum && row.taxCode) {
      empPosRequest.where('employeeID.taxCode', '=', row.taxCode, 'taxCode')
    } else if (row.tabNum && !row.taxCode) {
      empPosRequest.where('employeeNumberID.tabNum', '=', row.tabNum, 'tabNum')
    } else {
      empPosRequest.where('employeeID.taxCode', '=', row.taxCode, 'taxCode')
      empPosRequest.where('employeeNumberID.tabNum', '=', row.tabNum, 'tabNum')
    }
    empPosRequest = empPosRequest.selectSingle()
    const employeePositionID = (empPosRequest && empPosRequest.ID) || 0

    if (employeePositionID) {
      if (accrualRate) {
        ds.run('insert', {
          execParams: {
            empOrderType: mParams.empOrderType,
            employeePositionID: employeePositionID,
            accrualRate: accrualRate,
            newValue: null,
            payElID: mParams.payElID,
            orderID: mParams.orderID,
            paraID: mParams.paraID,
            dateFrom: mParams.dateFrom || mParams.onDate,
            dateTo: mParams.dateTo || null,
            valuation: 'PRC',
            accrualCount: accrualCount,
            avgCount: avgCount,
            oldValue: oldValue
          }
        })
        mParams.resultData.allRecordCount++
        mParams.resultData.successLoadingCount++
      }
      if (newValue) {
        ds.run('insert', {
          execParams: {
            empOrderType: mParams.empOrderType,
            employeePositionID: employeePositionID,
            accrualRate: null,
            newValue: newValue,
            payElID: mParams.payElID,
            orderID: mParams.orderID,
            paraID: mParams.paraID,
            dateFrom: mParams.dateFrom || mParams.onDate,
            dateTo: mParams.dateTo || null,
            valuation: 'SUM',
            accrualCount: accrualCount,
            avgCount: avgCount,
            oldValue: oldValue
          }
        })
        mParams.resultData.allRecordCount++
        mParams.resultData.successLoadingCount++
      }
      if (accrualRate && newValue) {
        notFoundEmp.push(`<br>Для працівника ${empPosRequest.description} вказано і відсотки і суму, тому було додано два записи!`)
      }
    } else {
      mParams.resultData.allRecordCount++

      if (row.taxCode && row.tabNum) {
        notFoundEmp.push(`<br>Не знайдено номер РНОКПП ${row.taxCode || ''} або табельний номер ${row.tabNum || ''} в системі!`)
      } else if (row.taxCode && !row.tabNum) {
        notFoundEmp.push(`<br>Не знайдено номер РНОКПП ${row.taxCode} в системі!`)
      } else if (!row.taxCode && row.tabNum) {
        notFoundEmp.push(`<br>Не знайдено табельний номер ${row.tabNum} в системі!`)
      } else {
        notFoundEmp.push(`<br>Не заповнено дані для ідентифікації працівника!`)
      }
    }
  })
  mParams.resultData.msg = `Завантажено записів:${mParams.resultData.successLoadingCount}, Всього записів:${mParams.resultData.allRecordCount}`
  if (notFoundEmp.length) {
    mParams.resultData.msg += '<br><br>Не завантажились:'
    notFoundEmp.forEach(row => {
      mParams.resultData.msg += row
    })
  }
}

me.recalcBounty = function (ctx) {
  const mParams = ctx.mParams
  let newValue = null
  let oldValue = null
  let accrualRate = null
  let accrualCount = null
  let avgCount = null
  let valuation = mParams.valuation
  const emp = UB.Repository('hr_empOrderChgSalEmpDet')
    .attrs(['employeePositionID.accrualSum', 'ID', 'bountyParaID.empOrderType', 'bountyParaID.payElID', 'bountyParaID.bountySum', 'bountyParaID.payType', 'bountyParaID.roundUpTo'])
    .where('paraID', '=', mParams.ID)
    .selectAsObject()
  if (!emp.length) {
    return
  }
  const ds = UB.DataStore('hr_empOrderChgSalEmpDet')
  const empOrderType = emp[0]['bountyParaID.empOrderType']
  emp.forEach(item => {
    if (/* item['bountyParaID.payType'] */ valuation === 'PRC') {
      accrualRate = Number(item['bountyParaID.bountySum'])
    } else if (/* item['bountyParaID.payType'] */ valuation === 'SUM') {
      newValue = Number(item['bountyParaID.bountySum'])
      if (empOrderType === 'BOUNTY') {
        oldValue = newValue
      }
    } else if (/* item['bountyParaID.payType'] */ valuation === 'PLAN') {
      accrualCount = Number(item['bountyParaID.bountySum'])
    } else if (/* item['bountyParaID.payType'] */ valuation === 'AVG') {
      avgCount = Number(item['bountyParaID.bountySum'])
    }
    ds.run('update', {
      __skipOptimisticLock: true,
      execParams: {
        ID: item.ID,
        payElID: mParams.payElID,
        newValue: newValue,
        oldValue: oldValue,
        accrualRate: accrualRate,
        accrualCount: accrualCount,
        avgCount: avgCount,
        valuation: valuation,
        dateFrom: mParams.dateFrom
      }
    })
  })
}

me.updateBountyPayEl = function (ctx) {
  const mParams = ctx.mParams
  const emp = UB.Repository('hr_empOrderChgSalEmpDet')
    .attrs(['employeePositionID.accrualSum', 'ID', 'bountyParaID.empOrderType', 'bountyParaID.payElID', 'bountyParaID.bountySum', 'bountyParaID.payType', 'bountyParaID.roundUpTo'])
    .where('paraID', '=', mParams.ID)
    .selectAsObject()
  if (!emp.length) {
    return
  }
  const ds = UB.DataStore('hr_empOrderChgSalEmpDet')
  emp.forEach(item => {
    ds.run('update', {
      __skipOptimisticLock: true,
      execParams: {
        ID: item.ID,
        payElID: mParams.payElID,
        dateFrom: mParams.dateFrom
      }
    })
  })
}

me.updateBountyFundSourceDescription = function (ctx) {
  const emp = UB.Repository('hr_empOrderChgSalEmpDet')
    .attrs(['ID', 'payElID'])
    .where('paraID', '=', ctx.mParams.execParams.ID)
    .selectAsObject()
  if (!emp.length) {
    return
  }
  const ds = UB.DataStore('hr_empOrderChgSalEmpDet')
  emp.forEach(item => {
    ds.run('update', {
      __skipOptimisticLock: true,
      execParams: {
        ID: item.ID,
        payElID: item.payElID,
        dictFundSourceID: ctx.mParams.execParams.dictFundSourceID
      }
    })
  })
}

function setDescription (ctx) {
  const execParams = ctx.mParams.execParams
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  const payType = execParams.payType || instanceData.payType
  const fields = ebs.getCompositeAttributeValue(ctx, 'description', ['payElID.name', 'bountySum'], '^', true).split('^')
  const tail = (payType === 'PLAN' ? 'оклад ' : payType === 'PRC' ? 'відсоток ' : 'cума ') + fields[1]
  execParams.description = fields[0] + ', ' + tail
  execParams.title = '..'
}

function beforeInsert (ctx) {
  global.hr_empOrderDet.setItemIdx(ctx)
  setDescription(ctx)
}

function beforeUpdate (ctx) {
  ebs.setDateTo(ctx)
  setDescription(ctx)
}

function afterUpdate (ctx) {
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  const empOrderType = instanceData.empOrderType
  const payType = ctx.mParams.execParams.payType
  if (empOrderType === 'BOUNTY') {
    if (payType) {
      changeSum(ctx)
      return
    }
  }
  if (ctx.mParams.execParams.dictFundSourceID !== undefined) {
    me.updateBountyFundSourceDescription(ctx)
  }
}

me.doPosting = function ({ item, order, isImportOperation, saved }) {
  if (item.mi_unityEntity === 'hr_empOrderChgSalEmpDet') {
    const para = UB.Repository(item.mi_unityEntity)
      .attrs(['ID', 'dateFrom', 'dateTo', 'orderID', 'orderID.orderDate', 'employeeNumberID',
        'employeePositionID', 'employeeFamilyID', 'employeeFamilyID.peopleID'])
      .selectById(item.ID)
    if (para && para.employeeFamilyID) {
      const people = UB.Repository('hr_people')
        .attrs('*')
        .selectById(para['employeeFamilyID.peopleID'])
      if (!people) {
        throw new UB.UBAbort(`<<<${UB.i18n('Не знайдено запис фізичної особи')}>>>`)
      }
      if (!people.taxCode) {
        throw new UB.UBAbort(`<<<${UB.i18n(`Для оформлення виплати матеріальної допомоги необхідно заповнити значення коду "РНОКПП" для отримувача {0}`, people['fullFIO'])}>>>`)
      }
      const currentPeriod = periodService.getCurrentPeriod(order.organizationID)

      let employeeID = people.linkEmployeeID
      if (!employeeID) {
        const empStore = UB.DataStore('hr_employee')
        employeeID = empStore.generateID()
        empStore.run('insert', {
          __skipSelectAfterInsert: true,
          __skipOptimisticLock: true,
          isOrderOperation: true,
          isImportOperation: isImportOperation,
          execParams: {
            ID: employeeID,
            firstName: people.firstName,
            lastName: people.lastName,
            middleName: people.middleName,
            shortFIO: people.shortFIO,
            fullFIO: people.fullFIO,
            sexType: people.sexType,
            birthDate: people.birthDate,
            taxCode: people.taxCode,
            changeOrderID: null,
            orderID: order.ID
          }
        })
        const peopleStore = UB.DataStore('hr_people')
        peopleStore.run('update', {
          __skipSelectAfterInsert: true,
          __skipOptimisticLock: true,
          isOrderOperation: true,
          isImportOperation: isImportOperation,
          execParams: {
            ID: para['employeeFamilyID.peopleID'],
            linkEmployeeID: employeeID
          }
        })
      }
      let empOrgID = UB.Repository('ac_employeeOrg').attrs('ID')
        .where('organizationID', '=', order.organizationID)
        .where('employeeID', '=', employeeID)
        .selectScalar()
      if (!empOrgID) {
        const store = UB.DataStore('ac_employeeOrg')
        store.run('insert', {
          __skipOptimisticLock: true,
          execParams: {
            employeeID,
            organizationID: order.organizationID
          }
        })
      }

      const empNum = UB.Repository('hr_employeeNumber')
        .attrs(['ID', 'dateFrom', 'dateTo'])
        .where('employeeID', '=', employeeID)
        .where('orgID', '=', order.organizationID)
        .selectSingle()

      let employeeNumberID = empNum ? empNum.ID : null
      if (!employeeNumberID) {
        const tabNum = global['hr_employeeNumber'].getNextTabNum({
          mParams: {
            orderItemID: me.paraID,
            organizationID: order.organizationID,
            employeeID
          }
        })
        employeeNumberID = orderService.insertByOrder({
          store: 'hr_employeeNumber',
          params: {
            employeeID: employeeID,
            dateFrom: currentPeriod.dateFrom,
            dateTo: currentPeriod.dateTo,
            tabNum,
            orgID: order.organizationID,
            orderID: order.ID,
            paraID: para.ID,
            changeOrderID: null
          },
          saved: saved
        })
      } else {
        if (dateService.shiftDate(empNum.dateTo) < currentPeriod.dateTo) {
          orderService.updateByOrder({
            store: 'hr_employeeNumber',
            params: {
              ID: employeeNumberID,
              dateTo: currentPeriod.dateTo
            },
            saved: saved,
            oldValues: {
              dateTo: empNum.dateTo
            }
          })
        }
      }
      const empPos = UB.Repository('hr_employeePosition')
        .attrs(['ID'])
        .where('employeeNumberID', '=', employeeNumberID)
        .orderBy('dateFrom', 'desc').limit(1)
        .selectSingle()
      let employeePositionID = empPos ? empPos.ID : null
      if (!empPos) {
        employeePositionID = orderService.insertByOrder({
          store: 'hr_employeePosition',
          params: {
            employeeID,
            employeeNumberID,
            organizationID: order.organizationID,
            dateFrom: currentPeriod.dateFrom,
            dateTo: currentPeriod.dateTo,
            mtCount: 0,
            workPlace: '4',
            orderID: order.ID,
            paraID: para.ID,
            changeOrderID: null
          },
          saved: saved
        })
      }
      orderService.updateByOrder({
        store: 'hr_empOrderChgSalEmpDet',
        params: {
          ID: item.ID,
          employeeFamilyPosID: employeePositionID
        },
        saved: saved,
        oldValues: {
          employeeFamilyPosID: null
        }
      })
    }
  }
}
