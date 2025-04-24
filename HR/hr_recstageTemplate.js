const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const UB = require('@unitybase/ub')
me.entity.addMethod('loadFromTemplate')

me.loadFromTemplate = ctx => {
  const { recstageTemplateID, docID, isDeleteExisting } = ctx.mParams
  let maxOrderIndex
  if (!recstageTemplateID || !docID) {
    throw new Error('hr_recstageTemplate.replaceFromTemplate :  docID and recstageTemplateID should be provided in mParams')
  }
  const recStageStore = UB.DataStore('hr_recstage')
  if (isDeleteExisting) {
    UB.Repository('hr_recstage')
      .attrs('ID')
      .where('docID', '=', docID)
      .where('entityName', '=', 'hr_recstage')
      .selectAsObject()
      .forEach(item => {
        recStageStore.run('delete', {
          execParams: {
            ID: item.ID
          }
        })
      })
  } else {
    maxOrderIndex = UB.Repository('hr_recstage')
      .attrs('max([orderIndex])')
      .where('docID', '=', docID)
      .where('entityName', '=', 'hr_recstage')
      .selectScalar()
  }
  let template = UB.Repository('hr_recstage')
    .attrs(['ID', 'docID', 'recstageTemplateID', 'orderIndex', 'stageKind', 'stagePosition', 'resolutionText'])
    .where('recstageTemplateID', '=', recstageTemplateID)
    .where('entityName', '=', 'hr_recstage')
    .orderBy('orderIndex')
    .selectAsObject()

  template.forEach(templateItem => {
    const ID = recStageStore.generateID()
    recStageStore.run('insert', {
      execParams: {
        ID: ID,
        stageKind: templateItem.stageKind,
        recstageTemplateID: null,
        docID: docID,
        orderIndex: maxOrderIndex ? ++maxOrderIndex : templateItem.orderIndex
      }
    })
    const recparticipant = UB.Repository('hr_recparticipant')
      .attrs(['employeePosition', 'positionID', 'plannedEmployeePosition'])
      .where('recStageID', '=', templateItem.ID)
      .selectAsObject()
    const recparticipantStore = UB.DataStore('hr_recparticipant')
    recparticipant.forEach(item => {
      recparticipantStore.run('insert', {
        execParams: {
          recStageID: ID,
          employeePosition: item.employeePosition,
          resolution: 'NEW',
          docID: docID
        }
      })
    })
  })
}

me.on('insert:after', function (ctx) {
  const mParams = ctx.mParams
  const execParams = mParams.execParams
  if (mParams.sourceDocID) {
    let sourceRec = UB.Repository('hr_recstage')
      .attrs(['ID', 'docID', 'recstageTemplateID', 'orderIndex', 'stageKind', 'stagePosition', 'resolutionText'])
      .where('docID', '=', mParams.sourceDocID)
      .where('entityName', '=', 'hr_recstage')
      .orderBy('orderIndex')
      .selectAsObject()
    const templRecStageStore = UB.DataStore('hr_recstage')
    sourceRec.forEach(recStageItem => {
      let ID = templRecStageStore.generateID()
      templRecStageStore.run('insert', {
        execParams: {
          ID: ID,
          stageKind: recStageItem.stageKind,
          recstageTemplateID: execParams.ID,
          docID: null,
          orderIndex: recStageItem.orderIndex
        }
      })
      const recparticipant = UB.Repository('hr_recparticipant')
        .attrs(['employeePosition', 'positionID', 'plannedEmployeePosition'])
        .where('recStageID', '=', recStageItem.ID)
        .selectAsObject()
      const recparticipantStore = UB.DataStore('hr_recparticipant')
      recparticipant.forEach(item => {
        recparticipantStore.run('insert', {
          execParams: {
            recStageID: ID,
            employeePosition: item.employeePosition,
            resolution: 'NEW',
            docID: null
          }
        })
      })
    })
  }
})
