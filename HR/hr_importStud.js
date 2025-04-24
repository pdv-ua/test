const UB = require('@unitybase/ub')
const App = UB.App
const queryString = require('querystring')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const iconv = require('iconv-lite')
const csvLoader = require('../HR/modules/import/csvLoader')
const periodService = require('../HR/modules/periodService')
const dateService = require('../AC/modules/dataServices/dateService')

App.registerEndpoint('loadImportStudData', loadData, true)
me.entity.addMethod('doImport')

function loadData (req, resp) {
  if (req.method !== 'POST') {
    return resp.badRequest('invalid HTTP verb' + req.method)
  }
  let params = queryString.parse(req.parameters)
  let data = req.read('bin')

  const store = UB.DataStore(__entityName)
  const storeLog = UB.DataStore('hr_importLog')
  store.execSQL(`DELETE FROM ${__entityName} WHERE orgID = :orgID: `, { orgID: params.orgID })
  storeLog.execSQL(`DELETE FROM hr_importLog WHERE orgID = :orgID: and entityName = :entityName:`,
    { orgID: params.orgID, entityName: __entityName })

  const errorMessages = []
  let attrRow
  let count = 0
  try {
    const csvStr = iconv.decode(Buffer.from(data), params.encoding)
    const attributes = App.domainInfo.entities[__entityName].attributes
    csvLoader.DETECT_TYPES = false
    csvLoader.parse(csvStr, ';', setRow)
    csvLoader.DETECT_TYPES = true
    // eslint-disable-next-line no-inner-declarations
    function setRow (rowData) {
      if (!attrRow) {
        attrRow = rowData
      } else {
        const row = {}
        for (let i = 0; i < rowData.length; i++) {
          if (attributes[attrRow[i]] && attrRow[i] !== 'ID') {
            row[attrRow[i]] = (rowData[i] === 'NULL' || rowData[i] === 'null') ? null : rowData[i]
          } else if (attrRow[i] === 'ID') {
            row.impID = rowData[i]
          }
        }
        delete row.ID
        try {
          row.orgID = params.orgID
          store.run('insert', {
            __skipOptimisticLock: true,
            __skipSelectAfterInsert: true,
            __skipRls: true,
            __skipAclRls: true,
            execParams: row
          })
          count++
        } catch (error) {
          errorMessages.push(error.message)
        }
      }
    }
  } catch (error) {
    errorMessages.push(error.message)
  }

  let result = { state: errorMessages.length ? '1' : '2', logCount: errorMessages.length, recordCount: count }
  resp.statusCode = 200
  resp.writeHead('Content-Type: application/json;charset=UTF-8')
  resp.writeEnd(result)
  data = null
}

me.doImport = function (ctx) {
  const execParams = ctx.mParams.execParams
  if (!execParams.orgID) return
  if (!execParams.workScheduleID) {
    throw new UB.UBAbort(`<<<${UB.i18n('Не вказано графік роботи!')}'>>>`)
  }
  if (!execParams.payElID) {
    throw new UB.UBAbort(`<<<${UB.i18n('Не вказана система оплати!')}>>>`)
  }
  const importData = UB.Repository(__entityName)
    .attrs(['ID', 'taxCode', 'studentNumber', 'firstName', 'lastName', 'middleName', 'birthDate', 'dateFrom', 'dateTo', 'accrualSum'])
    .where('orgID', '=', execParams.orgID)
    .selectAsObject()

  const currentPeriod = periodService.getCurrentPeriod(execParams.orgID)
  const impStore = UB.DataStore(__entityName)
  const empStore = UB.DataStore('hr_employee')
  const numStore = UB.DataStore('hr_employeeNumber')
  const posStore = UB.DataStore('hr_employeePosition')
  const orderStore = UB.DataStore('hr_orderPay')

  if (execParams.isDeleteExisting) {
    const curPositionList = UB.Repository('hr_employeePositionS')
      .attrs(['ID', 'description'])
      .where('organizationID', '=', execParams.orgID)
      .where('dateFrom', '>=', currentPeriod.dateFrom)
      .where('dateTo', '<=', currentPeriod.dateTo)
      .selectAsObject()
    curPositionList.forEach(row => {
      posStore.run('delete', {
        execParams: {
          ID: row.ID
        }
      })
    })
  }

  const orderID = orderStore.generateID()
  orderStore.run('insert', {
    execParams: {
      ID: orderID,
      orderState: 'POSTED',
      empOrderType: 'APPOINT',
      orderNumber: null,
      orderDate: dateService.currentDate(),
      entryDate: currentPeriod.dateFrom
    }
  })
  const storeLog = UB.DataStore('hr_importLog')
  storeLog.execSQL(`DELETE FROM hr_importLog WHERE orgID = :orgID: and entityName = :entityName:`,
    { orgID: execParams.orgID, entityName: __entityName })

  App.dbCommit()

  const errorMessages = []
  importData.forEach(item => {
    item.dateFrom = dateService.shiftDate(item.dateFrom)
    item.dateTo = dateService.shiftDate(item.dateTo)
    let emp = UB.Repository('hr_employee')
      .attrs(['ID', 'firstName', 'lastName', 'middleName', 'fullFIO', 'shortFIO', 'birthDate'])
      .where('taxCode', '=', item.taxCode)
      .selectSingle()
    const fullFIO = `${item.lastName || '?'} ${item.firstName || '?'}${item.middleName ? ' ' + item.middleName : ''}`
    const shortFIO = `${item.lastName || '?'} ${(item.firstName || '?')[0].toUpperCase() + '.'}${item.middleName ? item.middleName[0].toUpperCase() + '.' : ''}`

    try {
      if (emp && (emp.firstName !== item.firstName || emp.lastName !== item.lastName || emp.middleName !== item.middleName ||
        emp.fullFIO !== item.fullFIO || emp.shortFIO !== item.shortFIO || emp.birthDate !== item.birthDate)) {
        empStore.run('update', {
          __skipOptimisticLock: true,
          execParams: {
            ID: emp.ID,
            firstName: item.firstName,
            lastName: item.lastName,
            middleName: item.middleName,
            fullFIO,
            shortFIO,
            birthDate: dateService.shiftDate(item.birthDate)
          }
        })
      } else {
        emp = {
          ID: empStore.generateID()
        }
        empStore.run('insert', {
          execParams: {
            ID: emp.ID,
            firstName: item.firstName,
            lastName: item.lastName,
            middleName: item.middleName,
            birthDate: item.birthDate,
            taxCode: item.taxCode,
            fullFIO,
            shortFIO,
            organizationID: execParams.orgID
          }
        })
      }
      let empNum = UB.Repository('hr_employeeNumberS')
        .attrs(['ID', 'tabNum', 'dateFrom', 'dateTo'])
        .where('employeeID', '=', emp.ID)
        .selectSingle()
      if (empNum) {
        const params = {
          ID: empNum.ID
        }
        if (empNum.tabNum !== item.studentNumber) {
          params.tabNum = item.studentNumber
        }
        if (item.dateFrom < dateService.shiftDate(empNum.dateFrom)) {
          params.dateFrom = item.dateFrom
        }
        if (item.dateTo > dateService.shiftDate(empNum.dateTo)) {
          params.dateTo = item.dateTo
        }
        if (params.tabNum || params.dateFrom || params.dateTo) {
          numStore.run('update', {
            __skipOptimisticLock: true,
            execParams: params
          })
        }
      } else {
        empNum = {
          ID: numStore.generateID()
        }
        numStore.run('insert', {
          execParams: {
            ID: empNum.ID,
            employeeID: emp.ID,
            orgID: execParams.orgID,
            tabNum: item.studentNumber,
            dateFrom: currentPeriod.dateFrom > item.dateFrom ? currentPeriod.dateFrom : item.dateFrom,
            dateTo: currentPeriod.dateTo < item.dateTo ? currentPeriod.dateTo : item.dateTo,
            kind: 'STUD'
          }
        })
      }
      const empPos = UB.Repository('hr_employeePositionS')
        .attrs(['ID', 'dateFrom', 'dateTo', 'description'])
        .where('employeeNumberID', '=', empNum.ID)
        .selectAsObject()
      const curPos = empPos.find(o => dateService.shiftDate(o.dateFrom).getTime() === item.dateFrom.getTime() && item.dateTo.getTime() === dateService.shiftDate(o.dateTo).getTime())
      if (curPos) {
        posStore.run('update', {
          __skipOptimisticLock: true,
          execParams: {
            ID: curPos.ID,
            workScheduleID: execParams.workScheduleID,
            payElID: execParams.payElID,
            accrualSum: item.accrualSum
          }
        })
      } else {
        const prevPos = empPos.find(o => dateService.shiftDate(o.dateFrom) <= item.dateFrom && item.dateFrom < dateService.shiftDate(o.dateTo))
        if (prevPos) {
          if (dateService.shiftDate(prevPos.dateFrom).getTime() === item.dateFrom.getTime()) {
            posStore.run('update', {
              __skipOptimisticLock: true,
              execParams: {
                ID: prevPos.ID,
                dateTo: item.dateFrom,
                changeOrderID: orderID,
                isActive: 0
              }
            })
          } else {
            posStore.run('update', {
              __skipOptimisticLock: true,
              execParams: {
                ID: prevPos.ID,
                dateTo: dateService.addDays(item.dateFrom, -1),
                changeOrderID: orderID
              }
            })
          }
        }
        const nextPos = empPos.find(o => dateService.shiftDate(o.dateFrom) < item.dateTo && item.dateTo <= dateService.shiftDate(o.dateTo))
        if (nextPos) {
          if (dateService.shiftDate(nextPos.dateFrom).getTime() === item.dateFrom.getTime()) {
            posStore.run('update', {
              __skipOptimisticLock: true,
              execParams: {
                ID: nextPos.ID,
                dateFrom: item.dateTo,
                changeOrderID: orderID,
                isActive: 0
              }
            })
          } else if (!prevPos) {
            posStore.run('update', {
              __skipOptimisticLock: true,
              execParams: {
                ID: nextPos.ID,
                dateFrom: dateService.addDays(item.dateTo, 1),
                changeOrderID: orderID
              }
            })
          }
        }
        posStore.run('insert', {
          execParams: {
            employeeNumberID: empNum.ID,
            employeeID: emp.ID,
            organizationID: execParams.orgID,
            dateFrom: item.dateFrom,
            dateTo: item.dateTo,
            workScheduleID: execParams.workScheduleID,
            payElID: execParams.payElID,
            mtCount: 1,
            accrualSum: item.accrualSum,
            orderID
          }
        })
      }
      impStore.run('delete', {
        execParams: {
          ID: item.ID
        }
      })
      App.dbCommit()
    } catch (e) {
      App.dbRollback()
      errorMessages.push(`${UB.i18n('РНОКПП')}: ${item['taxCode']}. Помилка: ${e.message}`)
    }
  })
  errorMessages.forEach(row => {
    storeLog.run('insert', {
      __skipOptimisticLock: true,
      __skipSelectAfterInsert: true,
      __skipRls: true,
      __skipAclRls: true,
      execParams: {
        orgID: execParams.orgID,
        entityName: __entityName,
        description: row.substring(0, 1999)
      }
    })
  })
  App.dbCommit()
  ctx.mParams.result = JSON.stringify({ errCount: errorMessages.length })
}
