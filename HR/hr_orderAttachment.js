const __entityName = __filename.slice(__dirname.length + 1, -3)
const UB = require('@unitybase/ub')
const me = global[__entityName]

me.on('insert:after', afterInsert)

me.entity.addMethod('saveParentAttachments')
me.entity.addMethod('canEditPostedOrderAttachments')

function afterInsert (ctx) {
  const mParams = ctx.mParams
  if (mParams.isInternalOperation) {
    return
  }
  let doc = mParams.document
  if (doc) {
    UB.DataStore(__entityName).execSQL(`
        update hr_orderAttachment set document = :document: where ID = :ID: `, {
      ID: mParams.execParams.ID,
      document: doc
    })
  }
}

me.canEditPostedOrderAttachments = () => {} // метод для перевірки права редагування додатків у проведених наказах

me.saveParentAttachments = function (ctx) {
  const mParams = ctx.mParams
  if (!mParams.parentOrderID || !mParams.ID || !mParams.parentEntityName) {
    return
  }
  switch (mParams.parentEntityName) {
    case 'hr_request': {
      let attachStore = UB.DataStore('hr_orderAttachment')
      let parentInstance = UB.Repository(mParams.parentEntityName)
        .attrs(['document', 'requestType.name', 'requestDescription', 'requestNumber', 'attachment'])
        .where('ID', '=', mParams.parentOrderID)
        .selectSingle()
      if (parentInstance) {
        if (parentInstance.document) {
          attachStore.run('insert', {
            document: parentInstance.document,
            execParams: {
              documentID: mParams.ID,
              caption: `${parentInstance['requestType.name']} № ${parentInstance.requestNumber}`,
              description: parentInstance.requestDescription
            }
          })
        }
        if (parentInstance.attachment) {
          let attachData = JSON.parse(parentInstance.attachment)
          attachStore.run('insert', {
            document: parentInstance.attachment,
            execParams: {
              documentID: mParams.ID,
              caption: attachData.origName,
              description: parentInstance.requestDescription
            }
          })
        }
      }
      break
    }
  }
}
