const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
me.on('insert:before', beforeInsert)

me.entity.addMethod('moveItemUp')
me.entity.addMethod('moveItemDown')
me.entity.addMethod('enumerateItems')

function beforeInsert (ctx) {
  setItemIdx(ctx)
}

function setItemIdx (ctx) {
  let execParams = ctx.mParams.execParams
  let itemIdx = execParams.itemIdx
  if (itemIdx) {
    return
  }
  if (execParams.empTrainingProgramID) {
    itemIdx = UB.Repository(__entityName).attrs('max([itemIdx])').where('empTrainingProgramID', '=', execParams.empTrainingProgramID).select().get(0)
  }
  execParams.itemIdx = itemIdx ? itemIdx + 1 : 1
}

me.moveItemUp = function (ctx) {
  if (ctx.mParams.itemIdx === null) {
    return
  }
  let otherItem = UB.Repository(__entityName)
    .attrs(['ID', 'itemIdx'])
    .where('empTrainingProgramID', '=', ctx.mParams.empTrainingProgramID)
    .where('itemIdx', '<', ctx.mParams.itemIdx)
    .where('ID', '<>', ctx.mParams.ID)
    .orderByDesc('itemIdx')
    .limit(1)
    .select()
  if (otherItem.eof) {
    return
  }
  UB.DataStore(__entityName).run('update', {
    __skipOptimisticLock: true,
    __skipSelectAfterUpdate: true,
    execParams: {
      ID: ctx.mParams.ID,
      itemIdx: otherItem.get('itemIdx')
    }
  })
  UB.DataStore(__entityName).run('update', {
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
    .attrs(['ID', 'itemIdx'])
    .where('empTrainingProgramID', '=', ctx.mParams.empTrainingProgramID)
    .where('itemIdx', '>', ctx.mParams.itemIdx)
    .where('ID', '<>', ctx.mParams.ID)
    .orderBy('itemIdx')
    .limit(1)
    .select()
  if (otherItem.eof) {
    return
  }
  UB.DataStore(__entityName).run('update', {
    __skipOptimisticLock: true,
    __skipSelectAfterUpdate: true,
    execParams: {
      ID: ctx.mParams.ID,
      itemIdx: otherItem.get('itemIdx')
    }
  })
  UB.DataStore(__entityName).run('update', {
    __skipOptimisticLock: true,
    __skipSelectAfterUpdate: true,
    execParams: {
      ID: otherItem.get('ID'),
      itemIdx: ctx.mParams.itemIdx
    }
  })
  ctx.mParams.isMoved = true
}

me.enumerateItems = ctx => {
  let items = UB.Repository(__entityName).attrs(['ID', 'itemIdx'])
    .where('empTrainingProgramID', '=', ctx.mParams.empTrainingProgramID)
    .orderBy('itemIdx')
    .select()
  let dataStore = UB.DataStore(__entityName)
  let i = 1
  while (!items.eof) {
    dataStore.run('update', {
      __skipOptimisticLock: true,
      __skipSelectAfterUpdate: true,
      execParams: {
        ID: items.get('ID'),
        itemIdx: i++
      }
    })
    items.next()
  }
  dataStore && dataStore.freeNative()
}
