const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]

me.on('insert:after', afterInsert)

me.entity.addMethod('loadFromTemplate')

function afterInsert (ctx) {
  const mParams = ctx.mParams
  if (mParams.orderID) {
    const mailingList = UB.Repository('hr_mailingLetter')
      .attrs(['employeePositionID', 'participantTypeID', 'participantID', 'copies'])
      .where('empOrderID', '=', mParams.orderID)
      .selectAsObject()
    const store = UB.DataStore('hr_mailingLetterTemplateDet')
    mailingList.forEach(item => {
      store.run('insert', {
        execParams: {
          ID: store.generateID(),
          mailLetterTemplateID: mParams.execParams.ID,
          employeePositionID: item.employeePositionID,
          participantTypeID: item.participantTypeID,
          participantID: item.participantID,
          copies: item.copies
        }
      })
    })
  }
}

me.loadFromTemplate = function (ctx) {
  const { mailLetterTemplateID, orderID, isDeleteExisting, organizationID } = ctx.mParams
  const store = UB.DataStore('hr_mailingLetter')
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
  const templateList = UB.Repository('hr_mailingLetterTemplateDet')
    .attrs(['ID', 'employeePositionID', 'participantTypeID', 'participantID', 'copies'])
    .where('mailLetterTemplateID', '=', mailLetterTemplateID)
    .selectAsObject()

  templateList.forEach(item => {
    store.run('insert', {
      execParams: {
        ID: store.generateID(),
        empOrderID: orderID,
        organizationID,
        employeePositionID: item.employeePositionID,
        participantTypeID: item.participantTypeID,
        participantID: item.participantID,
        copies: item.copies
      }
    })
  })
}
