const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const settingsService = require('../AC/modules/entityServices/settingsService')

me.on('insert:before', beforeInsert)
me.on('delete:before', beforeDelete)
me.entity.addMethod('setRequestState')

function beforeInsert (ctx) {
  const execParams = ctx.mParams.execParams
  setDocNum(ctx)
  const isAuto = !settingsService.get('manualAccessStaffRequest', execParams.organizationOwnerID, null)
  if (isAuto) {
    try {
      UB.DataStore('ac_employeeOrg')
        .run('insert', {
          execParams: {
            employeeID: execParams.employeeID,
            organizationID: execParams.organizationID
          }
        })
      execParams.requestState = 'AGREED'
      execParams.isAuto = 1
    } catch (e) {
      throw new UB.UBAbort(`<<<${UB.i18n('Запис вже існує або доступ вже надано')}>>>`)
    }
  }
}

function setDocNum (ctx) {
  const execParams = ctx.mParams.execParams
  let docNum = execParams.docNum
  if (docNum) {
    return
  }
  docNum = UB.Repository(__entityName).attrs('max([docNum])').select().get(0)
  execParams.docNum = docNum ? docNum + 1 : 1
}

function beforeDelete (ctx) {
  const state = ctx.dataStore.get('requestState')
  if (state !== 'NEW' && state !== 'SENDED') {
    throw new UB.UBAbort(`<<<${UB.i18n('Видалення заявки не в стані "Нова" або "Відправлена" неможливе')}>>>`)
  }
}

me.setRequestState = function (ctx) {
  const execParams = ctx.mParams.execParams
  ctx.mParams.result = ''
  if (execParams.ID && execParams.state) {
    if (execParams.state === 'AGREED') {
      const instanceData = UB.Repository(__entityName)
        .attrs(['*'])
        .selectById(execParams.ID)
      const empOrgItem = UB.Repository('ac_employeeOrg')
        .attrs('ID')
        .where('employeeID', '=', instanceData.employeeID)
        .where('organizationID', '=', instanceData.organizationID)
        .selectSingle()
      if (empOrgItem) {
        ctx.mParams.result = 'Доступ до Електронної картки даної Особи вже був наданий для поточного Організації'
      } else {
        UB.DataStore('ac_employeeOrg')
          .run('insert', {
            execParams: {
              employeeID: instanceData.employeeID,
              organizationID: instanceData.organizationID
            }
          })
      }
    }
    UB.DataStore(__entityName)
      .run('update', {
        __skipOptimisticLock: true,
        execParams: {
          ID: execParams.ID,
          requestState: execParams.state
        }
      })
  }
}
