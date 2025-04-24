const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]

me.entity.addMethod('moveItemUp')
me.entity.addMethod('moveItemDown')
me.entity.addMethod('enumerateItems')

me.enumerateItems = ctx => {
  let items = UB.Repository(__entityName)
    .attrs(['ID', 'itemIdx'])
    .where('vacationScheduleID', '=', ctx.mParams.vacationScheduleID)
    .orderBy('itemIdx')
    .select()
  const dataStore = UB.DataStore(__entityName)
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
  dataStore.freeNative()
}

me.moveItemUp = function (ctx) {
  if (ctx.mParams.itemIdx === null) {
    return
  }
  let otherItem = UB.Repository(__entityName)
    .attrs(['ID', 'itemIdx'])
    .where('vacationScheduleID', '=', ctx.mParams.vacationScheduleID)
    .where('itemIdx', '<', ctx.mParams.itemIdx)
    .where('ID', '<>', ctx.mParams.ID)
    .orderByDesc('itemIdx')
    .limit(1)
    .select()
  if (otherItem.eof) {
    return
  }
  const dataStore = UB.DataStore(__entityName)
  dataStore.run('update', {
    __skipOptimisticLock: true,
    __skipSelectAfterUpdate: true,
    execParams: {
      ID: ctx.mParams.ID,
      itemIdx: otherItem.get('itemIdx')
    }
  })
  dataStore.run('update', {
    __skipOptimisticLock: true,
    __skipSelectAfterUpdate: true,
    execParams: {
      ID: otherItem.get('ID'),
      itemIdx: ctx.mParams.itemIdx
    }
  })
  dataStore.freeNative()
  ctx.mParams.isMoved = true
}

me.moveItemDown = function (ctx) {
  if (ctx.mParams.itemIdx === null) {
    return
  }
  let otherItem = UB.Repository(__entityName).attrs(['ID', 'itemIdx'])
    .where('vacationScheduleID', '=', ctx.mParams.vacationScheduleID)
    .where('itemIdx', '>', ctx.mParams.itemIdx)
    .where('ID', '<>', ctx.mParams.ID)
    .orderBy('itemIdx')
    .limit(1)
    .select()
  if (otherItem.eof) {
    return
  }
  const dataStore = UB.DataStore(__entityName)
  dataStore.run('update', {
    __skipOptimisticLock: true,
    __skipSelectAfterUpdate: true,
    execParams: {
      ID: ctx.mParams.ID,
      itemIdx: otherItem.get('itemIdx')
    }
  })
  dataStore.run('update', {
    __skipOptimisticLock: true,
    __skipSelectAfterUpdate: true,
    execParams: {
      ID: otherItem.get('ID'),
      itemIdx: ctx.mParams.itemIdx
    }
  })
  dataStore.freeNative()
  ctx.mParams.isMoved = true
}
