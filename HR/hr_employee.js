const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')
const employeePrint = require('../HR/modules/printForm/employeePrint')
const dateService = require('../AC/modules/dataServices/dateService')
const orderService = require('../HR/modules/orderService')
const employeeService = require('../HR/modules/employeeService')
const App = UB.App
const csvLoader = require('../HR/modules/import/csvLoader')
const queryString = require('querystring')
const iconv = require('iconv-lite')
const importEmployeeService = require('../HR/modules/import/importEmployeeService')
const { generateBase64Str } = require('../AC/modules/dataServices/filesService')
App.registerEndpoint('loadImportEmployeeData', loadData, true)

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)

me.on('insert:after', afterInsert)
me.on('update:after', updateEmployee)
me.on('update:after', createEmployeeOrg)

me.on('delete:before', beforeDelete)

me.entity.addMethod('docPrintForm')
me.entity.addMethod('repPrintForm')
me.entity.addMethod('view')
me.entity.addMethod('viewMilitary')
me.entity.addMethod('viewMilitaryEXP')

me.entity.addMethod('getNextPublServRang')
me.entity.addMethod('viewAccrualBalance')
me.entity.addMethod('importSelect')
me.entity.addMethod('exportCsv')

global['org_employee'].on('insert:after', orgEmployee)
global['org_employee'].on('update:after', orgEmployee)
global['org_employee'].on('delete:after', deleteOrgEmployee)

/**
 * Права на перегляд картки
 */
me.view = function (ctx) {

}
me.importSelect = ctx => {
  let mParams = ctx.mParams
  const options = mParams.options

  if (mParams.data) {
    let inData = JSON.parse(mParams.data)
    if (options && options.totalRequired) {
      mParams.__totalRecCount = inData.length
    }
    let data = UB.Repository(__entityName)
      .attrs(mParams.fieldList)
      .where('ID', 'in', inData.map(o => o.ID))
      .start(mParams.options.start)
      .limit(mParams.options.limit)
      .selectAsObject()
    data.forEach(item => {
      const inItem = inData.find(i => i.ID === item.ID)
      item.impFullFIO = inItem.impFullFIO
      item.impBirthDate = inItem.impBirthDate
    })
    ctx.dataStore.initialize(data)
  } else {
    ctx.dataStore.initialize([])
  }
}
me.viewAccrualBalance = ctx => {}

me.viewMilitary = function (ctx) {}
me.viewMilitaryEXP = function (ctx) {}
/**
 * Отримати наступний ранг
 * @param {object} ctx
 * @param {number} ctx.employeeID особа
 * @param {Date} ctx.onDate на дату
 * @return {number} dictRankID ранг
 */
me.getNextPublServRang = function (ctx) {
  const { mParams } = ctx
  const { employeeID } = mParams
  const onDate = dateService.shiftDate(mParams.onDate)
  let result = null
  let data = UB.Repository('hr_publServRang')
    .attrs(['dictRankID.rankType', 'dictRankID.code', 'dictRankID'])
    .where('employeeID', '=', employeeID)
    .where('dateFrom', '<=', onDate)
    .orderBy('dateFrom', 'desc').limit(1)
    .selectSingle()
  mParams.curRankCode = data ? parseInt(data['dictRankID.code']) : null
  mParams.curRankID = data ? data['dictRankID'] : null
  if (data) {
    const code = mParams.curRankCode === 1 ? 1 : mParams.curRankCode - 1
    if (code && data['dictRankID.rankType'] && data['dictRankID.rankType'] === 'COMMON') {
      data = UB.Repository('hr_dictRank')
        .attrs('ID', 'dictRankNextID')
        .where(`cast(code as integer)=${code}`, 'custom')
        .where('isActive', '=', true)
        .selectSingle()
      if (data) {
        result = data.dictRankNextID || data.ID
      }
    }
  } else {
    const ds = UB.DataStore(__entityName)
    const sqlDialect = entityBaseService.getSQLDialect()
    ds.runSQL(`select ${sqlDialect.top} ID as "ID" from hr_dictRank where mi_deleteDate >= '9999-12-31' and isActive=1 order by cast(code as integer) desc ${sqlDialect.limit}`, {})
    data = ds.asJSONObject
    if (data) {
      result = JSON.parse(data)[0].ID
    }
  }
  mParams.dictRankID = result
}

function createEmployeeOrg (ctx) {
  const execParams = ctx.mParams.execParams
  let empOrgID = null
  if (execParams.organizationID) {
    if (ctx.mParams.importRow) {
      empOrgID = UB.Repository('hr_employeeOrgInfo').attrs('ID')
        .where('organizationID', '=', execParams.organizationID)
        .where('employeeID', '=', execParams.ID)
        .selectScalar()
      if (!empOrgID) {
        const store = UB.DataStore('hr_employeeOrgInfo')
        store.run('insert', {
          execParams: {
            employeeID: execParams.ID,
            organizationID: execParams.organizationID,
            numberOS: ctx.mParams.importRow.impNumberOS
          }
        })
      }
    }
  }
}
function beforeInsert (ctx) {
  setBirthDate(ctx)
  replaceApostrophe(ctx)
  normalizeNames(ctx)
  checkParams(ctx)
}

function saveFormData (ctx, method) {
  const formData = ctx.mParams.formData
  const store = UB.DataStore('hr_employeeNumber')
  if (method === 'insert') {
    formData.employeeID = ctx.mParams.execParams.ID
    formData.ID = store.generateID()
    formData.dateTo = formData.dateToEmpty
    store.run('insert', {
      __skipOptimisticLock: true,
      execParams: formData
    })
    ctx.mParams.employeeNumberID = formData.ID
  }
  if (method === 'update' && formData.ID) {
    store.run('update', {
      __skipOptimisticLock: true,
      execParams: formData
    })
  }
  store.freeNative()
}

function beforeUpdate (ctx) {
  setBirthDate(ctx)
  replaceApostrophe(ctx)
  normalizeNames(ctx)
  checkParams(ctx)
  ctx.previousValues = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  if (ctx.mParams.formData) {
    saveFormData(ctx, 'update')
  }
}

function afterInsert (ctx) {
  createEmployeeOrg(ctx)
  updateEmployee(ctx)
  if (ctx.mParams.formData) {
    saveFormData(ctx, 'insert')
  }
}

function replaceApostrophe (ctx) {
  const execParams = ctx.mParams.execParams
  const attrs = [
    'firstName',
    'lastName',
    'middleName',
    'shortFIO',
    'fullFIO',
    'genName',
    'datName',
    'accusativeName',
    'insName',
    'locName',
    'vocName'
  ]
  attrs.forEach(item => {
    if (execParams[item]) {
      execParams[item] = execParams[item].replace(/[«´»„“‘’'"`]/gi, `’`)
    }
  })
}

function updateEmployee (ctx) {
  let mParams = ctx.mParams
  let execParams = mParams.execParams
  const employee = UB.Repository('hr_employee').attrs(['*']).selectById(execParams.ID)
  if (!employee) {
    return
  }
  if (!ctx.mParams.byAC) {
    orderService.updateEmployee(employee)
  }
  const curDate = dateService.currentDate()
  if (ctx.previousValues && employee.fullFIO !== ctx.previousValues.fullFIO) {
    UB.Repository('hr_employeePositionS')
      .attrs('ID')
      .where('dateFrom', '<=', curDate)
      .where('dateTo', '>=', curDate)
      .where('employeeID', '=', employee.ID)
      .selectAsObject()
      .forEach((item) => {
        UB.DataStore('hr_employeePosition').run('update', {
          __skipOptimisticLock: true,
          __skipSelectAfterUpdate: true,
          isDirectUpdate: true,
          execParams: {
            ID: item.ID,
            description: null
          }
        })
      })
    // update hr_employeeNumber
    UB.Repository('hr_employeeNumberS')
      .attrs('ID')
      .where('dateFrom', '<=', curDate)
      .where('dateTo', '>=', curDate)
      .where('employeeID', '=', employee.ID)
      .selectAsObject()
      .forEach((item) => {
        UB.DataStore('hr_employeeNumber').run('update', {
          __skipOptimisticLock: true,
          __skipSelectAfterUpdate: true,
          execParams: {
            ID: item.ID,
            description: null
          }
        })
      })
  }
  if (execParams.addInfo !== undefined) {
    employeeService.updateAddDescriptionPerson(execParams.ID)
  }
}

function beforeDelete (ctx) {
  const execParams = ctx.mParams.execParams
  if (UB.Repository('hr_employeePositionS')
    .attrs(['ID'])
    .where('employeeID', '=', execParams.ID)
    .selectScalar()) {
    throw new UB.UBAbort(`<<<${UB.i18n('Неможливо видалити картку. Наявне призначення')}>>>`)
  }
  let employeeNumbers = UB.Repository('hr_employeeNumberS')
    .attrs(['ID', 'tabNum'])
    .where('employeeID', '=', execParams.ID)
    .selectAsObject()
  if (employeeNumbers && employeeNumbers.length) {
    let employee = UB.Repository('hr_employee')
      .attrs(['ID', 'taxCode', 'fullFIO'])
      .selectById(execParams.ID)
    let tabNums = ''
    for (const employeeNumber of employeeNumbers) {
      tabNums = tabNums === '' ? `${employeeNumber.tabNum}` : tabNums + `, ${employeeNumber.tabNum}`
    }
    throw new UB.UBAbort(`<<<У особи ${employee.fullFIO} ${employee.taxCode} існують табельні номери ${tabNums}! \nВидалити картку особи неможливо!>>>`)
  }

  if (UB.Repository('org_employee').attrs(['ID']).selectById(ctx.mParams.execParams.ID)) {
    UB.DataStore('org_employee').run('delete', {
      byHR: true,
      execParams: {
        ID: ctx.mParams.execParams.ID
      }
    })
  }
}

/**
 * Отримати дані для друкованих форм
 * @param {object} ctx
 * @param {string} ctx.code код форми
 * @param {string} ctx.reportCode код звіта
 * @param {number} ctx.instanceID особа
 * @param {number} ctx.tabNumID працівник
 * @param {Date} ctx.onDate на дату
 * @param {number} ctx.orgID організація
 * @return {object}
 */

me.docPrintForm = function (ctx) {
  let mParams = ctx.mParams
  mParams.docs = employeePrint.getDocx(mParams.params)
}

/**
 * Права на друковані форми
 */
me.repPrintForm = function (ctx) {
  let mParams = ctx.mParams
  mParams.content = JSON.stringify({ instanceID: mParams.params.instanceID })
}

function setBirthDate (ctx) {
  const execParams = ctx.mParams.execParams
  if (execParams.birthDate) {
    let date = dateService.shiftDate(execParams.birthDate)

    if (date.getTime() >= dateService.currentDate().getTime()) {
      throw new UB.UBAbort(`<<<${UB.i18n('Дата народження {0} має бути меншою за поточну дату ', dateService.formatDate(date))}>>>`)
    }

    execParams.dayBirthDate = date.getDate()
    execParams.monthBirthDate = date.getMonth() + 1
    execParams.yearBirthDate = date.getFullYear()
  } else if (execParams.birthDate === null) {
    execParams.dayBirthDate = null
    execParams.monthBirthDate = null
    execParams.yearBirthDate = null
  }
}

function checkParams (ctx) {
  if (ctx.mParams.skipUpdate) {
    return
  }
  const execParams = ctx.mParams.execParams
  if (execParams.taxCode) {
    const employee = UB.Repository('hr_employee')
      .attrs(['fullFIO', 'ID'])
      .where('ID', '!=', execParams.ID)
      .where('taxCode', '=', execParams.taxCode)
      .where('mi_deleteDate', '>=', '#maxdate')
      .selectSingle()
    if (employee) {
      const employeeOrg = UB.Repository('ac_employeeOrg')
        .attrs(['organizationID.name'])
        .where('employeeID', '=', employee.ID)
        .orderBy('mi_createDate', 'desc')
        .selectSingle()
      const employeeOrgName = employeeOrg ? employeeOrg['organizationID.name'] : UB.i18n('не визначений')
      throw new UB.UBAbort(`<<<${UB.i18n('Неможливо зберегти картку. Особа з РНОКПП {0} вже є у базі (власник даних: {1}). Для того, щоб отримати доступ до картки цієї особи зверніться до адміністраторів', execParams.taxCode, employeeOrgName)}>>>`)
    }
  }
  if (execParams.recordNumber) {
    const employee = UB.Repository('hr_employee')
      .attrs(['fullFIO', 'ID'])
      .where('ID', '!=', execParams.ID)
      .where('recordNumber', '=', execParams.recordNumber)
      .where('mi_deleteDate', '>=', '#maxdate')
      .selectSingle()
    if (employee) {
      const employeeOrg = UB.Repository('ac_employeeOrg')
        .attrs(['organizationID.name'])
        .where('employeeID', '=', employee.ID)
        .orderBy('mi_createDate', 'desc')
        .selectSingle()
      const employeeOrgName = employeeOrg ? employeeOrg['organizationID.name'] : UB.i18n('не визначений')
      throw new UB.UBAbort(`<<<${UB.i18n('Неможливо зберегти картку. Особа з "Код УНЗР" {0} вже є у базі (власник даних: {1}). Для того, щоб отримати доступ до картки цієї особи зверніться до адміністраторів', execParams.recordNumber, employeeOrgName)}>>>`)
    }
  }
}

function trimStr (v) {
  const r = `${v}`
  return r.replace(/(?:(?:^|\n)\s+|\s+(?:$|\n))/g, '').replace(/\s+/g, ' ').trim()
}

function normalizeNames (ctx) {
  const execParams = ctx.mParams.execParams
  if (execParams.firstName) execParams.firstName = trimStr(execParams.firstName)
  if (execParams.lastName) execParams.lastName = trimStr(execParams.lastName)
  if (execParams.middleName) execParams.middleName = trimStr(execParams.middleName)
}

function orgEmployee (ctx) {
  if (!ctx.mParams.byHR) {
    const data = UB.Repository('org_employee')
      .attrs(['ID', 'code', 'lastName', 'firstName', 'middleName', 'birthDate', 'sexType', 'shortFIO', 'fullFIO', 'organizationID'])
      .selectById(ctx.mParams.execParams.ID)
    const employee = UB.Repository('hr_employee').attrs(['ID']).where('ID', '=', data.ID).selectSingle()
    const store = UB.DataStore('hr_employee')
    const execParams = {
      ID: data.ID,
      taxCode: data.code,
      organizationID: data.organizationID,
      lastName: data.lastName,
      firstName: data.firstName,
      middleName: data.middleName,
      birthDate: data.birthDate,
      sexType: (!data.sexType || data.sexType === '?') ? 'N' : (data.sexType === 'F' ? 'W' : 'M'),
      shortFIO: data.shortFIO,
      fullFIO: data.fullFIO
    }
    store.run(employee ? 'update' : 'insert', {
      byAC: true,
      isImportOperation: true,
      __skipOptimisticLock: true,
      entity: 'hr_employee',
      execParams: execParams
    })
  }
}

function deleteOrgEmployee (ctx) {
  if (!ctx.mParams.byHR) {
    throw new UB.UBAbort(`<<<${UB.i18n('Неможливо видалити картку. Картку можливо видалити на робочому столі Персонал')}>>>`)
  }
}

function loadData (req, resp) {
  if (req.method !== 'POST') {
    return resp.badRequest('invalid HTTP verb' + req.method)
  }
  let params = queryString.parse(req.parameters)
  let data = req.read('bin')

  let attrRow
  const employeeData = []
  let noError = true
  let result = {}

  function setRow (rowData) {
    if (!attrRow) {
      attrRow = rowData
    } else {
      const row = {}
      if ((rowData.length !== 1) && rowData[0].length) {
        for (let i = 0; i < rowData.length; i++) {
          row[attrRow[i]] = (rowData[i] === 'NULL' || rowData[i] === 'null') ? null : rowData[i]
        }
        employeeData.push(row)
        delete row.ID
      }
    }
  }

  try {
    const csvStr = iconv.decode(Buffer.from(data), params.encoding)
    csvLoader.DETECT_TYPES = false
    csvLoader.parse(csvStr, ';', setRow)
    csvLoader.DETECT_TYPES = true
  } catch (err) {
    noError = false
    result.error = UB.i18n('Помилка опрацювання файлу: "{0}"', err.message)
  }

  if (noError) {
    let dateFromStipend = params.dateFromStipend ? dateService.shiftDate(Number(params.dateFromStipend)) : dateService.firstDayOfMonth(dateService.currentDate())
    const test = importEmployeeService.importEmployeeData(employeeData, params.orgID, 'active', null, dateFromStipend, 'csv')
    result.empl = test.empl
  }

  resp.statusCode = 200
  resp.writeHead('Content-Type: application/json;charset=UTF-8')
  resp.writeEnd(result)
  data = null
}

me.exportCsv = function (ctx) {
  const { content } = ctx.mParams
  ctx.mParams.result = generateBase64Str(content, 'win1251')
}
