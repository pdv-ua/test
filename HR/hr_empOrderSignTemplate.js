const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]

me.on('insert:after', afterInsert)

me.entity.addMethod('loadFromTemplate')

function afterInsert (ctx) {
  const mParams = ctx.mParams
  if (mParams.orderID) {
    const signerList = UB.Repository('hr_empOrderSignDet')
      .attrs(['respNum', 'respPosition', 'respPositionID', 'respEmployeePositionID'])
      .where('orderID', '=', mParams.orderID)
      .selectAsObject()
    const store = UB.DataStore('hr_empOrderSignTemplateDet')
    signerList.forEach(item => {
      store.run('insert', {
        execParams: {
          ID: store.generateID(),
          empOrderSignTemplateID: mParams.execParams.ID,
          respNum: item.respNum,
          respPosition: item.respPosition,
          respPositionID: item.respPositionID,
          respEmployeePositionID: item.respEmployeePositionID
        }
      })
    })
  }
}

me.loadFromTemplate = function (ctx) {
  const { empOrderSignTemplateID, orderID, isDeleteExisting } = ctx.mParams
  const store = UB.DataStore('hr_empOrderSignDet')
  if (isDeleteExisting) {
    UB.Repository('hr_empOrderSignDet')
      .attrs('ID')
      .where('orderID', '=', orderID)
      .selectAsObject()
      .forEach(item => {
        store.run('delete', {
          execParams: {
            ID: item.ID
          }
        })
      })
  }
  const templateList = UB.Repository('hr_empOrderSignTemplateDet')
    .attrs(['ID', 'respNum', 'respPosition', 'respPositionID', 'respEmployeePositionID'])
    .where('empOrderSignTemplateID', '=', empOrderSignTemplateID)
    .selectAsObject()

  templateList.forEach(item => {
    store.run('insert', {
      execParams: {
        ID: store.generateID(),
        orderID: orderID,
        respNum: item.respNum,
        respPosition: item.respPosition,
        respPositionID: item.respPositionID,
        respEmployeePositionID: item.respEmployeePositionID
      }
    })
  })
}
