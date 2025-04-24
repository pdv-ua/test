const UB = require('@unitybase/ub')
const App = UB.App
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const ebs = require('../AC/modules/entityServices/entityBaseService')

me.entity.addMethod('doSend')
me.entity.addMethod('doAccept')
me.entity.addMethod('doReject')
me.entity.addMethod('allOrgAccess')

const details = {
  hr_accessRequestRole: { destEntity: 'uba_userrole', field: 'roleID' },
  hr_accessRequestGroup: { destEntity: 'uba_usergroup', field: 'groupID' },
  hr_accessRequestOrg: { destEntity: 'ac_userOrganization', field: 'organizationID' }
}
const detailEntityNames = Object.keys(details)

me.doSend = function (ctx) {
}
me.doAccept = function (ctx) {
}
me.doReject = function (ctx) {
}
me.allOrgAccess = function (ctx) {
}

// -------------------------------------------------------------------------

function loadFromExisting (ctx) {
  let execParams = ctx.mParams.execParams
  if (execParams.userID) {
    let isBlocked = execParams.isBlocked !== undefined ? execParams.isBlocked : ctx.dataStore.get('isBlocked')
    detailEntityNames.forEach(entityName => {
      let field = details[entityName].field
      let destEntity = details[entityName].destEntity
      let existed = UB.Repository(destEntity).attrs([field, 'ID']).where('userID', '=', execParams.userID).selectAsObject()
      existed.forEach(item => {
        if (!UB.Repository(entityName).attrs('ID').where(field, '=', item[field]).where('accessRequestID', '=', execParams.ID).selectSingle()) {
          let insParams = { accessRequestID: execParams.ID, isFromExisted: true, isDelete: isBlocked, sourceID: item.ID }
          insParams[field] = item[field]
          UB.DataStore(entityName).run('insert', { isInternalOperation: true, execParams: insParams })
        }
      })
    })
  }
}

function checkIsDetailCanEdit (ctx) {
  if (ctx.mParams.isInternalOperation) {
    return
  }
  let instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0]
  let masterID
  if (ctx.mParams.method === 'delete') {
    if (instanceData.isFromExisted) {
      throw new UB.UBAbort(`<<<${UB.i18n('Цей запис неможливо видалити, так як він доданий згідно діючих прав працівника. Якщо бажаєте видалити запис, встановіть ознаку "Вилучити" для нього')}>>>`)
    }
    masterID = UB.Repository(ctx.dataStore.entityCode).attrs('accessRequestID').selectById(ctx.mParams.execParams.ID).accessRequestID
  } else {
    masterID = ctx.mParams.execParams.accessRequestID || ctx.dataStore.get('accessRequestID')
  }
  if (UB.Repository(__entityName).attrs('requestState').selectById(masterID).requestState !== 'PROJECT') {
    throw new UB.UBAbort(`<<<${UB.i18n('Редагування або видалення заявки не в стані "Нова" неможливе')}>>>`)
  }
}

function setDescription (ctx) {
  let parts = ebs.getCompositeAttributeValue(ctx, 'description', ['docDate', 'employeeNumberID.description', 'requestState.name', 'processingDate'], '^', true).split('^')
  ctx.mParams.execParams.description = `${parts[0]} ${parts[1]} ${parts[2]} ${parts[3]}`
}

function changeState (ctx) {
  let execParams = ctx.mParams.execParams
  let requestStateOld = ctx.mParams.method === 'insert' ? 'PROJECT' : ctx.dataStore.get('requestState')

  if (!execParams.requestState) {
    if (requestStateOld !== 'PROJECT') {
      throw new UB.UBAbort(`<<<${UB.i18n('Редагування або видалення заявки не в стані "Нова" неможливе')}>>>`)
    }
    return
  }
  let userID = execParams.userID || ctx.dataStore.get('userID')
  switch (execParams.requestState) {
    case 'ONRECONCILATION' :
      if (requestStateOld !== 'PROJECT') {
        throw new UB.UBAbort(`<<<${UB.i18n('Перехід стану {0}-> {1} не дозволено', requestStateOld, execParams.requestState)}>>>`)
      }
      let org = 0
      let rol = 0
      let grp = 0
      detailEntityNames.forEach(detail => {
        let res = UB.Repository(detail).attrs('ID').where('accessRequestID', '=', execParams.ID).selectScalar()
        if (detail === 'hr_accessRequestOrg') {
          org = res
        } else if (detail === 'hr_accessRequestRole') {
          rol = res
        } else if (detail === 'hr_accessRequestGroup') {
          grp = res
        }
      })
      if (!org) {
        throw new UB.UBAbort(`<<<${UB.i18n('Не додано жодного запису у список організацій заявки')}>>>`)
      }
      if (!rol && !grp) {
        throw new UB.UBAbort(`<<<${UB.i18n('До деталі заявки повинна бути додана хоча б одна група АБО хоча б одна роль')}>>>`)
      }
      break
    case 'RECONCILED' :
      if (requestStateOld !== 'ONRECONCILATION') {
        throw new UB.UBAbort(`<<<${UB.i18n('Перехід стану {0}-> {1} не дозволено', requestStateOld, execParams.requestState)}>>>`)
      }
      let isBlocked = execParams.isBlocked || ctx.dataStore.get('isBlocked')
      if (isBlocked) {
        UB.DataStore('uba_user').run('update', {
          __skipOptimisticLock: true,
          execParams: {
            ID: userID,
            disabled: true
          }
        })
      }
      detailEntityNames.forEach(detail => {
        let destEntity = details[detail].destEntity
        let field = details[detail].field
        let detailData = UB.Repository(detail).attrs([field, 'isDelete', 'sourceID']).where('accessRequestID', '=', execParams.ID).selectAsObject()
        detailData.forEach(detailDataItem => {
          if (detailDataItem.isDelete) {
            if (UB.Repository(destEntity).attrs('ID').selectById(detailDataItem.sourceID)) { // Можливо хтось вже видалив
              UB.DataStore(destEntity).run('delete', {
                execParams: { ID: detailDataItem.sourceID }
              })
            }
          } else if (!detailDataItem.sourceID /* && !isBlocked */) {
            let rowExists = UB.Repository(destEntity).attrs('ID').where('userID', '=', userID).where(field, '=', detailDataItem[field]).selectScalar()
            if (!rowExists) {
              let insParams = {
                userID: userID
              }
              insParams[field] = detailDataItem[field]
              UB.DataStore(destEntity).run('insert', {
                execParams: insParams
              })
            }
          }
        })
      })
      break
    case 'CANCELED' :
      if (requestStateOld !== 'ONRECONCILATION') {
        throw new UB.UBAbort(`<<<${UB.i18n('Перехід стану {0}->{1} не дозволено', requestStateOld, execParams.requestState)}>>>`)
      }
      break
    case 'PROJECT' :
      break
    default:
      throw new UB.UBAbort(`<<<${UB.i18n('Неправильний статус заявки {0}', execParams.requestState)}>>>`)
  }
}

me.on('insert:after', ctx => {
  loadFromExisting(ctx)
})

me.on('update:after', ctx => {
  loadFromExisting(ctx)
})

me.on('insert:before', ctx => {
  setDescription(ctx)
  changeState(ctx)
  let docNum = App.dbConnections.DEFAULT.config.dialect === 'MSSQL2012'
    ? UB.Repository(__entityName)
      .attrs('max(cast([docNum] as bigint))')
      .where('ISNUMERIC(docNum)=1', 'custom')
      .select().get(0)
    : UB.Repository(__entityName)
      .attrs('max(docNum::integer)')
      .where(`docNum ~ E'^\\\\d+$'`, 'custom')
      .select().get(0)

  if (docNum) {
    ctx.mParams.execParams.docNum = parseInt(docNum) + 1 || '1'
  } else {
    ctx.mParams.execParams.docNum = 1
  }
})
me.on('update:before', ctx => {
  let execParams = ctx.mParams.execParams
  if (execParams.employeeNumberID) {
    detailEntityNames.forEach(entityName => {
      let detail = UB.Repository(entityName).attrs('ID').where('accessRequestID', '=', execParams.ID).selectAsObject()
      detail.forEach(item => {
        UB.DataStore(entityName).run('delete', { isInternalOperation: true, execParams: { ID: item.ID } })
      })
    })
  }
  setDescription(ctx)
  changeState(ctx)
})
detailEntityNames.forEach(detailEntityName => {
  global[detailEntityName].on('insert:before', ctx => {
    if (ctx.mParams.execParams.isFromExisted === undefined || ctx.mParams.execParams.isFromExisted === null) {
      ctx.mParams.execParams.isFromExisted = 0
    }
    if (ctx.mParams.execParams.isDelete === undefined || ctx.mParams.execParams.isDelete === null) {
      ctx.mParams.execParams.isDelete = 0
    }
    checkIsDetailCanEdit(ctx)
  })
  global[detailEntityName].on('update:before', ctx => {
    checkIsDetailCanEdit(ctx)
  })
  global[detailEntityName].on('delete:before', ctx => {
    checkIsDetailCanEdit(ctx)
  })
})

// -------------------------------------------------------------------------
