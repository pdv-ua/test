const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const App = UB.App
const dateService = require('../AC/modules/dataServices/dateService')
const orderService = require('../HR/modules/orderService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')

me.on('delete:before', beforeDelete)
me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)
me.on('insert:after', afterInsert)
me.on('update:after', afterUpdate)

me.entity.addMethod('doPosting')
me.entity.addMethod('doCancelPosting')
me.entity.addMethod('doPostingWorkPlace')
me.entity.addMethod('doCancelPostingWorkPlace')
me.entity.addMethod('copyRecord')
me.entity.addMethod('moveWorkPlace')
me.entity.addMethod('cleanPositionAccrual')

function beforeDelete (ctx) {
  orderService.beforeDeleteOrder(ctx, 'docState', 'Документ')
  const workPlace = UB.Repository('trf_workPlace').attrs(['ID', 'state', 'description'])
    .where('documentID', '=', ctx.mParams.execParams.ID)
    .selectAsObject()
  workPlace.forEach(row => {
    if (row.state === 'POSTED') {
      throw new UB.UBAbort(`<<<$Робоче місце тарифікації ${row.description} має стан "Проведено". Видалення неможливе.>>>`)
    }
    const store = UB.DataStore('trf_workPlace')
    store.run('delete', {
      __skipOptimisticLock: true,
      execParams: {
        ID: row.ID
      }
    })
  })
}

function beforeInsert (ctx) {
  const { execParams } = ctx.mParams
  if (!execParams.docNumber) {
    execParams.docNumber = getNextDocNumber(execParams.orgID)
  }
  execParams.description = `документ № ${execParams.docNumber || ''} від ${execParams.docDate ? dateService.formatDate(dateService.shiftDate(execParams.docDate)) : ''} ${execParams.name || ''}`
}

function afterInsert (ctx) {
  const execParams = ctx.mParams.execParams
  if (execParams.docState === 'POSTED') {
    me.doPosting(ctx)
  }
}

function beforeUpdate (ctx) {
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  const { execParams } = ctx.mParams
  if (execParams.dateFrom || (execParams.dateTo && !!execParams.dateFrom) || !!execParams.dateTo) {
    if (execParams.dateFrom) {
      fixWorkPlaceDateFrom(execParams)
      fixWorkPlaceDateTo(execParams)
    }
    if (execParams.dateTo) {
      setWorkPlaceDateTo(execParams)
    }
  }

  execParams.description = `документ № ${execParams.docNumber || instanceData.docNumber || ''} від ${(execParams.docDate || instanceData.docDate)
    ? dateService.formatDate((execParams.docDate || instanceData.docDate)) : ''} ${execParams.name || instanceData.name || ''}`
}

function fixWorkPlaceDateFrom (execParams) {
  const workPlace = UB.Repository('trf_workPlace').attrs(['ID', 'state', 'dateFrom'])
    .where('documentID', '=', execParams.ID)
    .where('dateFrom', '<', execParams.dateFrom)
    .selectAsObject()
  workPlace.forEach(row => {
    if (row.state === 'POSTED') {
      return
    }
    const store = UB.DataStore('trf_workPlace')
    store.run('update', {
      __skipOptimisticLock: true,
      execParams: {
        ID: row.ID,
        documentID: execParams.ID,
        dateFrom: execParams.dateFrom
      }
    })
  })
}
function fixWorkPlaceDateTo (execParams) {
  const workPlace = UB.Repository('trf_workPlace').attrs(['ID', 'state', 'dateTo'])
    .where('documentID', '=', execParams.ID)
    .where('dateTo', '<', execParams.dateFrom)
    .selectAsObject()
  workPlace.forEach(row => {
    if (row.state === 'POSTED') {
      return
    }
    const store = UB.DataStore('trf_workPlace')
    store.run('update', {
      __skipOptimisticLock: true,
      execParams: {
        ID: row.ID,
        documentID: execParams.ID,
        dateTo: dateService.maxDate()
      }
    })
  })
}

function setWorkPlaceDateTo (execParams) {
  const workPlace = UB.Repository('trf_workPlace').attrs(['ID', 'state', 'dateTo'])
    .where('documentID', '=', execParams.ID)
    .where('dateTo', '>', execParams.dateTo)
    .selectAsObject()
  workPlace.forEach(row => {
    if (row.state === 'POSTED') {
      return
    }
    const store = UB.DataStore('trf_workPlace')
    store.run('update', {
      __skipOptimisticLock: true,
      execParams: {
        ID: row.ID,
        documentID: execParams.ID,
        dateTo: execParams.dateTo
      }
    })
  })
}

function afterUpdate (ctx) {
  const execParams = ctx.mParams.execParams
  if (execParams.docState) {
    if (execParams.docState === 'POSTED') {
      me.doPosting(ctx)
    }
    if (execParams.docState === 'PROJECT') {
      me.doCancelPosting(ctx)
    }
  }
  if (execParams.orderNumber || execParams.orderDate) {
    me.updateWorkPlacesOrder(ctx)
  }
}

function getNextDocNumber (orgID) {
  const docNumber = App.dbConnections.DEFAULT.config.dialect === 'MSSQL2012'
    ? UB.Repository(__entityName)
      .attrs('max(cast(docNumber as bigint))')
      .where('ISNUMERIC(docNumber)=1', 'custom')
      .where('orgID', '=', orgID)
      .select().get(0)
    : UB.Repository(__entityName)
      .attrs('max(docNumber::integer)')
      .where('orgID', '=', orgID)
      .where(`docNumber ~ E'^\\\\d+$'`, 'custom')
      .select().get(0)
  return docNumber ? (parseInt(docNumber) + 1 || '1') : '1'
}

me.copyRecord = function (ctx) {
  const params = ctx.mParams
  const store = UB.DataStore(__entityName)
  const newDocID = store.generateID()
  // const copyRecordDateFrom = params.dateTo.getTime() >= dateService.unshiftDate(dateService.maxDate()).getTime() ? dateService.currentDate() : dateService.addDays(params.dateTo, 1)
  entityBaseService.cloneInstance(__entityName, params.ID, {
    ID: newDocID,
    docNumber: null,
    // dateFrom: copyRecordDateFrom,
    docDate: dateService.currentDate(),
    dateToEmpty: dateService.maxDate(),
    docState: 'PROJECT',
    orderNumber: null,
    orderDate: null
  })
  const dictWorkPlace = UB.Repository('trf_workPlace').attrs(['ID', 'state'])
    .where('documentID', '=', params.ID)
    .selectAsObject()
  dictWorkPlace.forEach(workPlace => {
    const newWorkPlace = entityBaseService.cloneInstance('trf_workPlace', workPlace.ID,
      workPlace.state === 'POSTED'
        ? { documentID: newDocID, state: 'PROJECT', orderNumber: null, orderDate: null }
        : { documentID: newDocID, state: 'PROJECT', orderNumber: null, orderDate: null, accrualSum: null, sumTrfPosition: null, position: null })
    const positions = UB.Repository('trf_position').attrs('ID').where('workPlaceID', '=', workPlace.ID).selectAsObject()
    positions.forEach(position => {
      const newPosition = entityBaseService.cloneInstance('trf_position', position.ID,
        workPlace.state === 'POSTED'
          ? { workPlaceID: newWorkPlace.ID }
          : { workPlaceID: newWorkPlace.ID, accrualSum: null, rate: null }
      )
      if (workPlace.state === 'POSTED') {
        const accruals = UB.Repository('trf_accrual').attrs('ID').where('positionID', '=', position.ID).selectAsObject()
        accruals.forEach(accrual => entityBaseService.cloneInstance('trf_accrual', accrual.ID, { positionID: newPosition.ID }))
      }
    })
  })
  ctx.mParams.newID = newDocID
}

me.doPosting = function (ctx) {
  const postedDocument = findPostedDocument(ctx)
  if (postedDocument) {
    postedDocument.dateFrom = dateService.formatDate(dateService.shiftDate(postedDocument.dateFrom))
    throw new UB.UBAbort(`<<<${UB.i18n('На вказану дату вже існує проведений документ № {0} від {1}, {2}.', postedDocument.docNumber, postedDocument.dateFrom, postedDocument.name)}>>>`)
  }
  const execParams = ctx.mParams.execParams
  const workPlaceStore = UB.DataStore('trf_workPlace')
  const workPlaces = UB.Repository('trf_workPlace')
    .attrs(['ID'])
    .where('documentID', '=', execParams.ID)
    .where('state', '=', 'PROJECT')
    .selectAsObject()
  workPlaces.forEach(row => {
    workPlaceStore.run('update', {
      __skipOptimisticLock: true,
      execParams: {
        ID: row.ID,
        documentID: execParams.ID,
        state: 'POSTED'
      }
    })
  })
}

me.doCancelPosting = function (ctx) {
  const execParams = ctx.mParams.execParams
  const workPlaceStore = UB.DataStore('trf_workPlace')
  const workPlaces = UB.Repository('trf_workPlace')
    .attrs(['ID'])
    .where('documentID', '=', execParams.ID)
    .where('state', '=', 'POSTED')
    .selectAsObject()
  workPlaces.forEach(row => {
    workPlaceStore.run('update', {
      __skipOptimisticLock: true,
      execParams: {
        ID: row.ID,
        documentID: execParams.ID,
        state: 'PROJECT'
      }
    })
  })
}

me.doPostingWorkPlace = function (ctx) {
  const execParams = ctx.mParams.execParams
  if (UB.Repository('trf_workPlace')
    .attrs('ID')
    .where('ID', '=', execParams.workPlaceID)
    .where('state', '=', 'PROJECT')
    .selectSingle()) {
    const store = UB.DataStore('trf_workPlace')
    store.run('update', {
      __skipOptimisticLock: true,
      execParams: {
        ID: execParams.workPlaceID,
        documentID: execParams.ID,
        state: 'POSTED'
      }
    })
  }
}

me.doCancelPostingWorkPlace = function (ctx) {
  const execParams = ctx.mParams.execParams
  if (UB.Repository('trf_workPlace')
    .attrs('ID')
    .where('ID', '=', execParams.workPlaceID)
    .where('state', '=', 'POSTED')
    .selectSingle()) {
    const store = UB.DataStore('trf_workPlace')
    store.run('update', {
      __skipOptimisticLock: true,
      execParams: {
        ID: execParams.workPlaceID,
        documentID: execParams.ID,
        state: 'PROJECT'
      }
    })
  }
}

me.updateWorkPlacesOrder = function (ctx) {
  const execParams = ctx.mParams.execParams
  const workPlaceStore = UB.DataStore('trf_workPlace')
  const document = UB.Repository('trf_document')
    .attrs(['ID', 'orderNumber', 'orderDate'])
    .selectById(execParams.ID)
  const workPlaces = UB.Repository('trf_workPlace')
    .attrs(['ID'])
    .where('documentID', '=', execParams.ID)
    // .where('orderNumber', 'isNull')
    // .where('orderDate', 'isNull')
    .selectAsObject()
  workPlaces.forEach(workPlace => {
    workPlaceStore.run('update', {
      __skipOptimisticLock: true,
      execParams: {
        ID: workPlace.ID,
        orderNumber: document.orderNumber,
        orderDate: document.orderDate
      }
    })
  })
}

me.moveWorkPlace = function (ctx) {
  const execParams = ctx.mParams.execParams
  const store = UB.DataStore('trf_workPlace')
  store.run('update', {
    __skipOptimisticLock: true,
    execParams: {
      ID: execParams.workPlaceID,
      documentID: execParams.documentID
    }
  })
}

me.cleanPositionAccrual = function (ctx) {
  const documentID = ctx.mParams.documentID
  const orgID = ctx.mParams.orgID
  const accrualStore = UB.DataStore('trf_accrual')
  const positionStore = UB.DataStore('trf_position')

  const employeeAccruals = UB.Repository('trf_accrual')
    .attrs(['ID'])
    .where('positionID.workPlaceID.documentID', '=', documentID)
    .where('positionID.workPlaceID.documentID.orgID', '=', orgID)
    .where('payElID.methodID.code', 'notIn', ['143', '144', '145'])
    .where('positionID.workPlaceID.state', '=', 'PROJECT')
    .where('positionID.mi_deleteDate', '>=', '9999-12-31')
    .selectAsObject()

  const documentPosition = UB.Repository('trf_position')
    .attrs(['ID'])
    .where('workPlaceID.documentID', '=', documentID)
    .where('workPlaceID.documentID.orgID', '=', orgID)
    .where('workPlaceID.state', '=', 'PROJECT')
    .where('mi_deleteDate', '>=', '9999-12-31')
    .selectAsObject()

  employeeAccruals.forEach(accrual => {
    accrualStore.run('delete', {
      __skipOptimisticLock: true,
      execParams: {
        ID: accrual.ID
      }
    })
  })

  documentPosition.forEach(pos => {
    positionStore.run('update', {
      __skipOptimisticLock: true,
      execParams: {
        ID: pos.ID,
        accrualSum: 0,
        rate: 0
      }
    })
  })
}

function findPostedDocument (ctx) {
  const document = UB.Repository('trf_document').attrs(['ID', 'dateFrom', 'type', 'orgID']).selectById(ctx.mParams.execParams.ID)
  if (document && document.dateFrom) {
    const dateFrom = dateService.shiftDate(document.dateFrom)
    return UB.Repository('trf_document')
      .attrs(['ID', 'docNumber', 'dateFrom', 'name'])
      .where('docState', '=', 'POSTED')
      .where('type', '=', document.type)
      .where('dateFrom', '=', dateFrom)
      .where('orgID', '=', document.orgID)
      .where('ID', '<>', ctx.mParams.execParams.ID)
      .selectSingle()
  }
  return null
}
