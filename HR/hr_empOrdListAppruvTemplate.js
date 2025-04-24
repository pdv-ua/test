const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]

me.on('insert:after', afterInsert)
me.on('delete:after', afterDelete)

me.entity.addMethod('loadFromTemplate')

function afterInsert (ctx) {
  const mParams = ctx.mParams
  if (mParams.orderID) {
    const empOrdListAppruvList = UB.Repository('hr_empOrdListAppruv')
      .attrs(['respPositionID', 'respEmployeePositionID', 'stageKind', 'KEP'])
      .where('orderID', '=', mParams.orderID)
      .selectAsObject()
    const store = UB.DataStore('hr_empOrdListAppruvTemplateDt')
    empOrdListAppruvList.forEach(o => {
      store.run('insert', {
        execParams: {
          empOrdListAppruvTemplateID: mParams.execParams.ID,
          ID: store.generateID(),
          respPositionID: o.respPositionID || null,
          respEmployeePositionID: o.respEmployeePositionID || null,
          stageKind: o.stageKind || null,
          dateAppruv: o.dateAppruv || null,
          KEP: o.KEP || null
        }
      })
    })
  }
}

me.loadFromTemplate = function (ctx) {
  const { empOrdListAppruvTemplateID, orderID, isDeleteExisting } = ctx.mParams
  const store = UB.DataStore('hr_empOrdListAppruv')
  if (isDeleteExisting) {
    UB.Repository('hr_mailingLetter')
      .attrs('ID')
      .where('empOrderID', '=', orderID)
      .selectAsObject()
      .forEach(item => {
        store.run('delete', {
          execParams: {
            ID: item.ID
          }
        })
      })
  }
  const templateList = UB.Repository('hr_empOrdListAppruvTemplateDt')
    .attrs(['empOrdListAppruvTemplateID', 'respPositionID', 'respEmployeePositionID', 'stageKind', 'KEP', 'dateAppruv'])
    .where('empOrdListAppruvTemplateID', '=', empOrdListAppruvTemplateID)
    .selectAsObject()

  templateList.forEach(item => {
    store.run('insert', {
      execParams: {
        ID: store.generateID(),
        orderID,
        stageKind: item.stageKind,
        respPositionID: item.respPositionID,
        respEmployeePositionID: item.respEmployeePositionID,
        KEP: item.KEP,
        participantID: item.participantID,
        copies: item.copies,
        dateAppruv: item.dateAppruv
      }
    })
  })
}

function afterDelete (ctx) {
  const execParams = ctx.mParams.execParams
  const store = UB.DataStore('hr_empOrdListAppruvTemplateDt')
  UB.Repository('hr_empOrdListAppruvTemplateDt')
    .attrs(['ID'])
    .where('empOrdListAppruvTemplateID', '=', execParams.ID)
    .selectAsArrayOfValues()
    .forEach(o => {
      store.run('delete', {
        __skipOptimisticLock: true,
        execParams: {
          ID: o
        }
      })
    })
}
