const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]

const UB = require('@unitybase/ub')

function fillFakeOrderN (ctx) {
  if (!ctx.mParams.execParams.orderN) {
    ctx.mParams.execParams.orderN = -1
  }
}

me.on('insert:before', fillFakeOrderN)

function getSrcParams (ctx) {
  if (!ctx.mParams.skipRenumbering) {
    ctx.mParams.listParamID = ctx.dataStore.get('listParamID')
    ctx.mParams.orgID = ctx.dataStore.get('orgID')
  }
}

me.on('beforeupdate:after', getSrcParams)
me.on('beforedelete:after', getSrcParams)

function renumberRows (ctx) {
  if (!ctx.mParams.skipRenumbering) {
    const allRows = UB.Repository('hr_valuesParam')
      .where('[listParamID]', '=', ctx.mParams.listParamID || ctx.mParams.execParams.listParamID)
      .where('[orgID]', '=', ctx.mParams.orgID || ctx.mParams.execParams.orgID)
      .attrs(['orderN', 'valuesFloat', 'ID', 'mi_modifyDate'])
      .orderBy('valuesFloat')
      .selectAsObject()
    allRows.forEach((row, i) => {
      if (row.orderN != (i + 1)) {
        UB.DataStore('hr_valuesParam')
          .run('update', { skipRenumbering: true, execParams: { ID: row.ID, orderN: i + 1, mi_modifyDate: row.mi_modifyDate } })
      }
    })
  }
}

me.on('insert:after', renumberRows)
me.on('update:after', renumberRows)
me.on('delete:after', renumberRows)
