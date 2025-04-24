/* TubDataStore */
const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]

me.entity.addMethod('addEvaluationType')
me.on('insert:before', beforeInsert)
me.on('delete:before', beforeDelete)

function beforeDelete (ctx) {
  const { execParams } = ctx.mParams
  const acquaintanceListStore = new TubDataStore(__entityName)
  const recparticipantStore = UB.DataStore('hr_recparticipant')
  const recStageStore = UB.DataStore('hr_recstage')
  const acquaintanceList = UB.Repository(__entityName).attrs(['ID', 'participantID', 'participantID.recStageID', 'orderID']).where('ID', '=', execParams.ID).selectAsObject({ 'participantID.recStageID': 'recStageID' })
  UB.Repository('hr_empOrderSignature')
    .attrs(['ID', 'participantID'])
    .where('docID', 'in', acquaintanceList.filter((o, i, arr) => (arr.findIndex(el => el.orderID === o.orderID) === i) && o.orderID).map((o, i, arr) => o.orderID))
    .selectAsObject().forEach(o => {
      UB.DataStore('hr_empOrderSignature').run('delete', {
        __skipOptimisticLock: true,
        execParams: {
          ID: o.ID
        }
      })
    })
  acquaintanceList.forEach(o => {
    acquaintanceListStore.run('update', {
      __skipOptimisticLock: true,
      skipUpdate: true,
      execParams: {
        ID: o.ID,
        participantID: null
      }
    })
    o.participantID && recparticipantStore.run('delete', { __skipOptimisticLock: true, execParams: { ID: o.participantID } })
    o.recStageID && recStageStore.run('delete', { __skipOptimisticLock: true, execParams: { ID: o.recStageID } })
  })
}

function beforeInsert (ctx) {
  const execParams = ctx.mParams.execParams
  const recparticipantStore = UB.DataStore('hr_recparticipant')
  const recStageStore = UB.DataStore('hr_recstage')
  const docID = execParams.orderID
  const recStageID = recStageStore.generateID()
  const recparticipantID = recparticipantStore.generateID()
  recStageStore.run('insert', {
    execParams: {
      ID: recStageID,
      stageKind: 'INFO',
      recstageTemplateID: null,
      docID,
      entityName: __entityName,
      mi_wfState: 'NEW'
    }
  })
  recparticipantStore.run('insert', {
    execParams: {
      ID: recparticipantID,
      recStageID: recStageID,
      employeePosition: execParams.employeePosition,
      resolution: 'NEW',
      docID
    }
  })
  execParams.participantID = recparticipantID
}
me.addEvaluationType = function (ctx) {
  const { mParams } = ctx
  const gridItems = JSON.parse(mParams.gridItems)
  if (gridItems && gridItems.length) {
    const store = UB.DataStore(mParams.entity)
    const recStageStore = UB.DataStore('hr_recstage')
    gridItems.length && gridItems.forEach(o => {
      if (!o.acquaintanceStatus || (o.acquaintanceStatus === 'APPEALED')) {
        store.run('update', {
          __skipOptimisticLock: true,
          execParams: {
            ID: o.ID,
            evaluationType: mParams.evaluationType
          }
        })
        recStageStore.run('update', {
          __skipOptimisticLock: true,
          execParams: {
            ID: o.recStageID,
            stageKind: mParams.evaluationType
          }
        })
      }
    })
  }
}
