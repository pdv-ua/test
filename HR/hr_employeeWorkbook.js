const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const orderService = require('../HR/modules/orderService')
const dateService = require('../AC/modules/dataServices/dateService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')
const settingsService = require('../AC/modules/entityServices/settingsService')
const csvLoader = require('../HR/modules/import/csvLoader')
const iconv = require('iconv-lite')
const queryString = require('querystring')
const App = UB.App

App.registerEndpoint('loadImportWorkbookData', loadData, true)

me.on('delete:before', beforeDelete)
me.on('update:before', beforeUpdate)
me.on('insert:after', afterInsert)
me.on('update:after', afterUpdate)
me.on('select:after', afterSelect)

me.entity.addMethod('autoFillExperience')
me.entity.addMethod('accWorkbookEditAlways')
me.entity.addMethod('updateWorkbookByOrder')
me.entity.addMethod('getPositionFullName')

me.details = [
  {
    detailName: 'employeeWorkbookDt',
    entityName: 'hr_employeeWorkbookDt',
    docIDName: 'employeeWorkbookID',
    fieldList: orderService.setFieldListAttribute([
      'dateFrom', 'dateTo', 'dictExperienceID.name', 'comment', 'coefficient'
    ], ['lineNum'])
  }
]

me.updateWorkbookByOrder = ctx => {
  let sql = `
  merge into hr_employeeWorkbook wb
      using (
          select 
               wb.ID,
               wb.appointOrder,
               ord.description appointOrderDescription,
               wb.appointReason,
               coalesce(reasonMoving.name,reasonAppoint.name)  orderReason,
               ord.empOrderType orderType,
               epos.paraID,
               ord.empOrderType,
               ePos.orderID
          from hr_employeeWorkbook wb
          join hr_employeePosition ePos on ePos.ID = wb.employeePositionID and epos.mi_deleteDate >= '9999-12-31'
          join hr_empOrder ord on ord.ID = ePos.orderID   and ord.mi_deleteDate >= '9999-12-31'
          left join hr_empOrderMoveDet moveDet on moveDet.ID = epos.paraID   and moveDet.mi_deleteDate >= '9999-12-31'
          left join hr_dictReasonMoving reasonMoving on reasonMoving.ID = moveDet.dictReasonMovingKindID   and reasonMoving.mi_deleteDate >= '9999-12-31'
          left join hr_empOrderAppointDet appointDet on appointDet.ID = epos.paraID   and appointDet.mi_deleteDate >= '9999-12-31'
          left join hr_dictAppointKind reasonAppoint on reasonAppoint.ID = appointDet.dictAppointKindID   and reasonAppoint.mi_deleteDate >= '9999-12-31'
          where (wb.appointReason is null or wb.appointOrder is Null)  and wb.mi_deleteDate >= '9999-12-31'
      ) a on a.ID = wb.ID
when matched then
update set appointOrder = coalesce(a.appointOrder, appointOrderDescription),
       appointReason = coalesce(a.appointReason, orderReason)
;
merge into hr_employeeWorkbook wb
using (
      select 
           wb.ID,
           wb.dismOrder,
           ord.description dismOrderDescription,
           wb.dischargeReason,
           coalesce(reasonMoving.name,reasonDism.name)  orderReason,
           ord.empOrderType orderType,
           epos.paraID,
           ord.empOrderType,
           ePos.orderID,
           ePos.employeeNumberID
      from hr_employeeWorkbook wb
      join hr_employeePosition ePos on ePos.ID = wb.employeePositionID 
      join hr_empOrder ord on ord.ID = ePos.changeOrderID and ord.empOrderType in ('MOVE', 'DISM')
      left join hr_empOrderMoveDet moveDet on moveDet.employeeNumberID = ePos.employeeNumberID and moveDet.orderID = ord.ID  and moveDet.mi_deleteDate >= '9999-12-31'
      left join hr_dictReasonMoving reasonMoving on reasonMoving.ID = moveDet.dictReasonMovingKindID and reasonMoving.mi_deleteDate >= '9999-12-31'
      left join hr_empOrderDismDet dismDet on dismDet.employeeNumberID = ePos.employeeNumberID and dismDet.orderID = ord.ID  and dismDet.mi_deleteDate >= '9999-12-31'
      left join hr_dictReasonDism reasonDism on reasonDism.ID = dismDet.dictReasonDismID and reasonDism.mi_deleteDate >= '9999-12-31'
      where (wb.dismOrder is null or wb.dischargeReason is Null) and wb.mi_deleteDate >= '9999-12-31'
      ) a on a.ID = wb.ID
when matched then
update set dismOrder = coalesce(a.dismOrder, dismOrderDescription),
       dischargeReason = coalesce(a.dischargeReason, orderReason)
; 
-----------------------------------------------------------------------
`
  UB.DataStore(__entityName).runSQL(sql, {})
  updateClose()
}

function updateClose () {
  let ordMove = UB.Repository('hr_empOrderMoveDet')
    .attrs(['ID', 'dictReasonMovingKindID.name', 'orderID.description', 'dateFrom', 'employeePositionID'])
    .where('orderID.orderState', '=', 'POSTED')
    .selectAsObject({
      'dictReasonMovingKindID.name': 'dischargeReason',
      'orderID.description': 'dismOrder'
    })

  let ordDism = UB.Repository('hr_empOrderDismDet')
    .attrs(['ID', 'dictReasonDismID.name', 'orderID.description', 'dateFrom', 'employeePositionID'])
    .where('orderID.orderState', '=', 'POSTED')
    .selectAsObject({
      'dictReasonDismID.name': 'dischargeReason',
      'orderID.description': 'dismOrder'
    })
  ordMove = ordMove.concat(ordDism)
  let store = UB.DataStore(__entityName)
  ordMove.forEach((item) => {
    let wb = UB.Repository('hr_employeeWorkbook').attrs(['ID', 'dateTo', 'dischargeReason', 'dismOrder']).where('employeePositionID', '=', item.employeePositionID).selectSingle()
    if (!wb) {
      let pos = UB.Repository('hr_employeePositionS').attrs(['ID', 'dateFrom', 'employeeNumberID']).where('ID', '=', item.employeePositionID).selectSingle()
      if (!pos) {
        return
      }
      pos = UB.Repository('hr_employeePositionS').attrs(['ID', 'dateFrom', 'employeeNumberID'])
        .where('employeeNumberID', '=', pos.employeeNumberID)
        .where('dateFrom', '<', dateService.shiftDate(pos.dateFrom))
        .limit(1)
        .orderBy('dateFrom', 'desc')
        .selectSingle()
      if (!pos) {
        return
      }
      wb = UB.Repository('hr_employeeWorkbook').attrs(['ID', 'dateTo', 'dischargeReason', 'dismOrder'])
        .where('employeePositionID', '=', pos.ID)
        .selectSingle()
    }
    if (!wb || (wb.dischargeReason && wb.dismOrder)) {
      return
    }
    let execParams = {
      ID: wb.ID,
      dischargeReason: wb.dischargeReason || item.dischargeReason,
      dismOrder: wb.dismOrder || item.dismOrder
    }
    if (new Date(wb.dateTo).getFullYear() === 9999) {
      execParams.dateTo = dateService.addDays(item.dateFrom, -1)
    }
    store.run('update', {
      __skipOptimisticLock: true,
      execParams: execParams
    })
  })
}
function afterInsert (ctx) {
  const execParams = ctx.mParams.execParams
  orderService.saveDetails(ctx, me.details)
  const wbDtCount = UB.Repository('hr_employeeWorkbookDt')
    .attrs('count(*)')
    .where('employeeWorkbookID', '=', execParams.ID)
    .selectScalar()
  if (!wbDtCount && execParams.positionType) {
    // add experience by positionType
    const onDate = dateService.shiftDate(execParams.dateFrom) < dateService.minDate() ? dateService.minDate() : dateService.shiftDate(execParams.dateFrom)
    UB.Repository('hr_dictExperienceByPos')
      .attrs(['dictExperienceID'])
      .where('positionType', '=', execParams.positionType)
      .where('dictExperienceID.dateFrom', '<=', onDate)
      .where('dictExperienceID.dateTo', '>=', onDate)
      .selectAsObject()
      .forEach(row => {
        UB.DataStore('hr_employeeWorkbookDt').run('insert', {
          execParams: {
            employeeWorkbookID: execParams.ID,
            dateFrom: execParams.dateFrom,
            dateTo: dateService.isMaxDate(execParams.dateTo) ? null : execParams.dateTo,
            dictExperienceID: row.dictExperienceID
          }
        })
      })
  }
  ctx.mParams.detail = orderService.getEntityDetail(execParams.ID, me.details)
}

function beforeUpdate (ctx) {
  orderService.saveDetails(ctx, me.details)
}

function afterUpdate (ctx) {
  const execParams = ctx.mParams.execParams
  if (execParams.dateTo !== undefined) {
    UB.Repository('hr_employeeWorkbookDt')
      .attrs('ID')
      .where('employeeWorkbookID', '=', execParams.ID)
      .selectAsObject()
      .forEach((detail) => {
        UB.DataStore('hr_employeeWorkbookDt').run('update', {
          __skipOptimisticLock: true,
          execParams: {
            ID: detail.ID,
            dateTo: dateService.isMaxDate(execParams.dateTo) ? null : execParams.dateTo
          }
        })
      })
  }
  ctx.mParams.detail = orderService.getEntityDetail(execParams.ID, me.details)
}

function afterSelect (ctx) {
  const mParams = ctx.mParams
  if (mParams.ID && !mParams.execParams) {
    ctx.mParams.detail = orderService.getEntityDetail(mParams.ID, me.details)
  }
}

function beforeDelete (ctx) {
  if (ctx.mParams.isDeleteAllowed || ctx.mParams.isOrderOperation) {
    return
  }
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  if (instanceData.employeePositionID) {
    if (!entityBaseService.userIsMemberOf({ roleNames: ['acc_adminEmpWorkbook'] })) {
      throw new UB.UBAbort(`<<<${UB.i18n('Неможливо видалити запис - до запису прив\'язане призначення')}>>>`)
    }
  }
  UB.Repository('hr_employeeWorkbookDt')
    .attrs('ID')
    .where('employeeWorkbookID', '=', ctx.mParams.execParams.ID)
    .selectAsObject()
    .forEach(item => {
      UB.DataStore('hr_employeeWorkbookDt')
        .run('delete', {
          execParams: {
            ID: item.ID
          }
        })
    })
}

me.autoFillExperience = function (ctx) {
  const mParams = ctx.mParams
  const employeeID = mParams.employeeID
  if (!employeeID) return

  const dictExpByPos = UB.Repository('hr_dictExperienceByPos')
    .attrs(['positionType', 'dictExperienceID'])
    .selectAsObject()

  const list = UB.Repository(__entityName)
    .attrs(['ID', 'dateFrom', 'dateTo', 'positionType'])
    .where('employeeID', '=', employeeID)
    .notExists(UB.Repository('hr_employeeWorkbookDt')
      .correlation('employeeWorkbookID', 'ID')
      .where('mi_deleteDate', '>=', '#maxdate'))
    .orderBy('dateFrom')
    .selectAsObject()
  let dict
  list.forEach((record) => {
    dict = dictExpByPos.filter(item => item.positionType === record.positionType)
    dict.forEach((d) => {
      UB.DataStore('hr_employeeWorkbookDt').run('insert', {
        execParams: {
          employeeWorkbookID: record.ID,
          dateFrom: record.dateFrom,
          dateTo: dateService.isMaxDate(record.dateTo) ? null : record.dateTo,
          dictExperienceID: d.dictExperienceID
        }
      })
    })
  })
}

me.accWorkbookEditAlways = () => {}

me.getPositionFullName = function (ctx) {
  const mParams = ctx.mParams
  const employeePositionID = mParams.employeePositionID
  const onDate = dateService.shiftDate(mParams.onDate)
  let positionFullName = null
  const empPos = UB.Repository('hr_employeePosition')
    .attrs(['positionID', 'organizationID'])
    .selectById(employeePositionID)
  if (empPos) {
    const isOrderActualPositionName = settingsService.getByCode('hrOrderActualPositionName', empPos.organizationID)
    if (isOrderActualPositionName) {
      positionFullName = orderService.getEmployeeFactPositionName(employeePositionID, onDate)
    } else {
      const posName = UB.Repository('hr_position')
        .attrs('fullName', 'fullNameNom')
        .where('mi_data_id', '=', empPos.positionID)
        .misc({
          __mip_ondate: onDate
        })
        .where('state', '=', 'ACTIVE')
        .limit(1)
        .selectSingle()
      positionFullName = posName && (posName['fullNameNom'] || posName['fullName'])
    }
  }
  ctx.mParams.positionFullName = positionFullName || null
}
function loadData (req, resp) {
  if (req.method !== 'POST') {
    return resp.badRequest('invalid HTTP verb' + req.method)
  }
  let params = queryString.parse(req.parameters)
  let data = req.read('bin')

  let attrRow
  const WorkBookData = []
  let noError = true
  let result = ''

  try {
    const csvStr = iconv.decode(Buffer.from(data), params.encoding)
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
          row[attrRow[i]] = (rowData[i] === 'NULL' || rowData[i] === 'null') ? null : rowData[i]
        }
        WorkBookData.push(row)
        delete row.ID
      }
    }
  } catch (err) {
    noError = false
    result = {
      error: UB.i18n('Помилка опрацювання файлу: "{0}"', err.message)
    }
  }

  if (noError) {
    importWorkBookData(WorkBookData, params.orgID, 'active', params, 'csv')
  }

  resp.statusCode = 200
  resp.writeHead('Content-Type: application/json;charset=UTF-8')
  resp.writeEnd(result)
  data = null
}

function importWorkBookData (WorkBookData, orgID, mode, params, type) {
  const store = UB.DataStore('hr_employeeWorkbook')
  WorkBookData.forEach(element => {
    let myDateFrom = new Date(element['Дата початку'].substr(6) + '-' + element['Дата початку'].substr(3, 2) + '-' + element['Дата початку'].substr(0, 2))
    let myDateTo = dateService.maxDate()
    let posTypeName
    myDateTo = element['Дата кінця'] ? new Date(element['Дата кінця'].substr(6) + '-' + element['Дата кінця'].substr(3, 2) + '-' + element['Дата кінця'].substr(0, 2)) : dateService.maxDate()
    UB.Repository('hr_employeeWorkbook')
      .attrs(['ID'])
      .where('dateFrom', '=', myDateFrom)
      .where('dateTo', '=', myDateTo)
      .selectAsObject()
      .forEach(elementQuery => {
        store.run('delete', {
          execParams: {
            ID: elementQuery.ID
          }
        })
      })
    if (element['Тип посади']) {
      posTypeName = UB.Repository('ubm_enum')
        .attrs(['code'])
        .where('eGroup', '=', 'HR_POSITION_TYPE')
        .where('name', '=', element['Тип посади'])
        .selectScalar()
    }
    if (params.taxCode === element['ІНН']) {
      store.run('insert', {
        execParams: {
          employeeID: Number(params.employeeID),
          dateFrom: myDateFrom,
          appointOrder: element['Наказ (про початок)'],
          dismOrder: element['Наказ (про закінчення)'],
          workPlace: element['Місце роботи'],
          workPosition: element['Посада'],
          positionType: posTypeName,
          dateTo: myDateTo,
          isManualWorkPlace: true
        }
      })
    }
  })
  App.dbCommit()
}
