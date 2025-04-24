const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]

me.entity.addMethod('setItemIdx')
me.entity.addMethod('moveItemUp')
me.entity.addMethod('moveItemDown')
me.entity.addMethod('enumerateItems')

// eslint-disable-next-line no-unused-vars

function updateOrderFieldLastChangeDate (ID) {
  global['hr_empOrder'].updateOrderFieldLastChangeDate(ID)
}

me.on('delete:before', ctx => {
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  ctx.mParams.orderID = instanceData.orderID || UB.Repository(__entityName).attrs('orderID').where('ID', ctx.mParams.execParams.ID).selectScalar()
})

me.on('delete:after', ctx => {
  global.hr_empOrder.saveEmployeeList(ctx.mParams.orderID, null)
})

me.on('update:after', ctx => {
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  global.hr_empOrder.saveEmployeeList(instanceData.orderID, ctx.mParams.execParams.ID)
})

me.on('insert:after', ctx => {
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  global.hr_empOrder.saveEmployeeList(instanceData.orderID, ctx.mParams.execParams.ID)
})

me.on('delete:before', ctx => {
  if (ctx.mParams.isOrderOperation) {
    return
  }
  checkIsEditable(ctx)
  let detail = UB.Repository(__entityName).attrs('ID', 'orderID', 'isGroup', 'mi_unityEntity').where('paraID', '=', ctx.mParams.execParams.ID).selectAsObject()
  detail.forEach(item => {
    updateOrderFieldLastChangeDate(item.orderID)
    let ID = UB.Repository(item.mi_unityEntity).attrs('ID').where('ID', '=', item.ID).selectScalar()
    if (ID) {
      UB.DataStore(item.mi_unityEntity).run('delete', {
        execParams: {
          ID: ID
        }
      })
    }
  })
})

me.on('update:before', ctx => {
  if (ctx.mParams.isOrderOperation) {
    return
  }
  // checkDuplicateEmployeeNumber(ctx)
  let execParams = ctx.mParams.execParams
  let orderID = UB.Repository(__entityName).attrs(['orderID'])
    .where('ID', '=', execParams.ID)
    .selectScalar()
  updateOrderFieldLastChangeDate(orderID)

  /* Параметр isOrderOperation не передається через ub.exe, не можливо відрізнити клієнтський update від hr_empOrder.saveOldValues */
  /* if (ctx.mParams.isOrderOperation) {
    return
  }
  checkIsEditable(ctx) */
})

me.on('insert:before', ctx => {
  // checkDuplicateEmployeeNumber(ctx)
  let execParams = ctx.mParams.execParams
  if (!execParams.paraID) {
    execParams.paraID = execParams.ID
  }
  if (!execParams.firstName) {
    execParams.firstName = '..'
  }
  if (!execParams.lastName) {
    execParams.lastName = '..'
  }
  updateOrderFieldLastChangeDate(execParams.orderID)
})

me.enumerateItems = ctx => {
  const unityEntity = ctx.mParams.mi_unityEntity
  let items = UB.Repository(__entityName).attrs(['ID', 'itemIdx', 'mi_unityEntity'])
    .where('orderID', '=', ctx.mParams.orderID)
    .whereIf(unityEntity, 'mi_unityEntity', '=', unityEntity)
    .orderBy('itemIdx')
    .select()
  let dataStore
  if (unityEntity) {
    dataStore = UB.DataStore(unityEntity)
  }
  let i = 1
  while (!items.eof) {
    let ds = dataStore || UB.DataStore(items.get('mi_unityEntity'))
    ds.run('update', {
      __skipOptimisticLock: true,
      __skipSelectAfterUpdate: true,
      execParams: {
        ID: items.get('ID'),
        itemIdx: i++
      }
    })
    !dataStore && ds.freeNative()
    items.next()
  }
  dataStore && dataStore.freeNative()
}

me.setItemIdx = function (ctx) {
  let execParams = ctx.mParams.execParams
  let itemIdx
  if (execParams.itemIdx) {
    return
  }
  if (execParams.paraID) {
    itemIdx = UB.Repository(__entityName).attrs('max([itemIdx])').where('paraID', '=', execParams.paraID).select().get(0)
  } else if (execParams.orderID) {
    itemIdx = UB.Repository(__entityName).attrs('max([itemIdx])').where('orderID', '=', execParams.orderID).select().get(0)
  }
  execParams.itemIdx = itemIdx ? itemIdx + 1 : 1
}

me.moveItemUp = function (ctx) {
  if (ctx.mParams.itemIdx === null) {
    return
  }
  let otherItem = UB.Repository(__entityName)
    .attrs(['ID', 'itemIdx', 'mi_unityEntity'])
    .where('orderID', '=', ctx.mParams.orderID)
    .where('itemIdx', '<', ctx.mParams.itemIdx)
    .where('ID', '<>', ctx.mParams.ID)
    .whereIf(ctx.mParams.mi_unityEntity === 'hr_empOrderActingDet', 'mi_unityEntity', '=', ctx.mParams.mi_unityEntity)
    .orderByDesc('itemIdx')
    .limit(1)
    .select()
  if (otherItem.eof) {
    return
  }
  UB.DataStore(ctx.mParams.mi_unityEntity).run('update', {
    __skipOptimisticLock: true,
    __skipSelectAfterUpdate: true,
    execParams: {
      ID: ctx.mParams.ID,
      itemIdx: otherItem.get('itemIdx')
    }
  })
  UB.DataStore(otherItem.get('mi_unityEntity')).run('update', {
    __skipOptimisticLock: true,
    __skipSelectAfterUpdate: true,
    execParams: {
      ID: otherItem.get('ID'),
      itemIdx: ctx.mParams.itemIdx
    }
  })
  ctx.mParams.isMoved = true
}

me.moveItemDown = function (ctx) {
  if (ctx.mParams.itemIdx === null) {
    return
  }
  let otherItem = UB.Repository(__entityName)
    .attrs(['ID', 'itemIdx', 'mi_unityEntity'])
    .where('orderID', '=', ctx.mParams.orderID)
    .where('itemIdx', '>', ctx.mParams.itemIdx)
    .where('ID', '<>', ctx.mParams.ID)
    .whereIf(ctx.mParams.mi_unityEntity === 'hr_empOrderActingDet', 'mi_unityEntity', '=', ctx.mParams.mi_unityEntity)
    .orderBy('itemIdx')
    .limit(1)
    .select()
  if (otherItem.eof) {
    return
  }
  UB.DataStore(ctx.mParams.mi_unityEntity).run('update', {
    __skipOptimisticLock: true,
    __skipSelectAfterUpdate: true,
    execParams: {
      ID: ctx.mParams.ID,
      itemIdx: otherItem.get('itemIdx')
    }
  })
  UB.DataStore(otherItem.get('mi_unityEntity')).run('update', {
    __skipOptimisticLock: true,
    __skipSelectAfterUpdate: true,
    execParams: {
      ID: otherItem.get('ID'),
      itemIdx: ctx.mParams.itemIdx
    }
  })
  ctx.mParams.isMoved = true
}

function checkIsEditable (ctx, isSilence) {
  const execParams = ctx.mParams.execParams
  let attrs = Object.keys(execParams)
  let errorList = []
  if (attrs.includes('changedValues')) {
    return true
  }

  let orderState = UB.Repository(__entityName).attrs(['orderID.orderState']).where('ID', '=', execParams.ID).select().get(0)
  if (orderState !== 'PROJECT' && orderState !== 'ON_COMPLETION') {
    errorList.push(`<<<${UB.i18n('Неможливо видалити або оновити позицію з проведеного документу')}>>>`)
  }
  if (!errorList.length) {
    let detail = UB.Repository(__entityName).attrs(['ID', 'mi_unityEntity']).where('paraID', '=', execParams.ID).where('ID', '<>', execParams.ID).selectAsObject()
    if (detail.length) {
      detail.forEach(item => {
        if (!UB.Repository(item.mi_unityEntity).attrs(['ID']).where('ID', '=', item.ID).select().eof) {
          UB.DataStore(item.mi_unityEntity).run('delete', { execParams: { ID: item.ID } })
        }
      })
    }
  }
  if (errorList.length) {
    if (isSilence) {
      return false
    }
    throw new UB.UBAbort(errorList.join(' '))
  }
  return true
}
