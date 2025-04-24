const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]

me.entity.addMethod('empOrdAcquaintanceLoadFromTemplate')

me.on('insert:after', afterInsert)
me.on('delete:before', beforeDelete)

me.empOrdAcquaintanceLoadFromTemplate = function (ctx) {
  const { empOrdAcquaintanceListTemplateID, orderID } = ctx.mParams
  const store = UB.DataStore('hr_acquaintanceList')

  const templateList = UB.Repository('hr_empOrderAcquaintListTplDet')
    .attrs(['empOrdAcquaintanceListTemplateID', 'evaluationType', 'employeePositionID', 'respEmployeePositionID', 'dictEventKnowledgID'])
    .where('empOrdAcquaintanceListTemplateID', '=', empOrdAcquaintanceListTemplateID)
    .selectAsObject()

  const acquaintanceList = UB.Repository('hr_acquaintanceList')
    .attrs(['*'])
    .where('orderID', '=', orderID)
    .selectAsObject()
  templateList.forEach(item => {
    const duplicate = acquaintanceList.find(o => {
      return ((o.employeePositionID === item.employeePositionID) || ((o.employeeResponsibleID === item.respEmployeePositionID) && (o.employeeResponsibleID || item.respEmployeePositionID)) || ((o.employeeID === item.employeeID) && (o.employeeID || item.employeeID))) && (o.evaluationType === item.evaluationType) && (o.dictEventKnowledgID === item.dictEventKnowledgID)
    })
    if (!duplicate) {
      store.run('insert', {
        execParams: {
          ID: store.generateID(),
          orderID,
          evaluationType: item.evaluationType,
          employeePositionID: item.employeePositionID,
          employeeResponsibleID: item.respEmployeePositionID,
          dictEventKnowledgID: item.dictEventKnowledgID
        }
      })
    }
  })
}

function afterInsert (ctx) {
  const mParams = ctx.mParams
  if (mParams.orderID) {
    const acquaintanceList = UB.Repository('hr_acquaintanceList')
      .attrs(['evaluationType', 'employeePositionID', 'employeeResponsibleID', 'dictEventKnowledgID'])
      .where('orderID', '=', mParams.orderID)
      .selectAsObject()
    const store = UB.DataStore('hr_empOrderAcquaintListTplDet')
    acquaintanceList.forEach(o => {
      store.run('insert', {
        execParams: {
          empOrdAcquaintanceListTemplateID: mParams.execParams.ID,
          ID: store.generateID(),
          evaluationType: o.evaluationType || null,
          employeePositionID: o.employeePositionID || null,
          respEmployeePositionID: o.employeeResponsibleID || null,
          dictEventKnowledgID: o.dictEventKnowledgID || null
        }
      })
    })
  }
}

function beforeDelete (ctx) {
  const execParams = ctx.mParams.execParams
  const store = UB.DataStore('hr_empOrderAcquaintListTplDet')
  UB.Repository('hr_empOrderAcquaintListTplDet')
    .attrs(['ID'])
    .where('empOrdAcquaintanceListTemplateID', '=', execParams.ID)
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
