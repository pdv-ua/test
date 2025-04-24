
/* global App TubDataStore */
const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const iitCrypto = require('@ub-d/iit-crypto')

me.entity.addMethod('insertEmpOrdListAppruvList')
me.entity.addMethod('updateEmpOrdListAppruvList')
me.on('delete:before', beforeDelete)

function beforeDelete (ctx) {
  const { execParams } = ctx.mParams
  UB.Repository(__entityName)
    .attrs(['ID', 'participantID'])
    .where('ID', '=', execParams.ID)
    .selectAsObject().forEach(o => {
      new TubDataStore(__entityName).run('update', {
        __skipOptimisticLock: true,
        execParams: {
          ID: o.ID,
          participantID: null
        }
      })
    })
}
me.insertEmpOrdListAppruvList = function (ctx) {
  const { mParams } = ctx
  const orderID = mParams.orderID
  const recparticipant = UB.Repository('hr_recparticipant')
    .attrs(['ID', 'employeePosition.positionID', 'employeePosition', 'executionDate', 'recStageID.stageKind', 'positionID'])
    .where('recStageID.docID.empOrderID', '=', orderID)
    .where('recStageID.stageKind', 'in', ['VISA', 'ONLAW'])
    .where('recStageID.entityName', '=', 'hr_recstage')
    .orderBy('recStageID.orderIndex', 'asc')
    .selectAsObject({
      'employeePosition.positionID': 'position',
      'employeePosition': 'employeePositionID',
      'recStageID.stageKind': 'stageKind'
    })
  const signatureData = UB.Repository('hr_empOrderSignature')
    .attrs(['ID', 'participantID', 'docID', 'employeeNumberID.employeePositionID'])
    .where('docID.empOrderID', '=', orderID)
    .where('participantID.recStageID.entityName', '=', 'hr_recstage')
    .where('canceled', '=', false)
    .selectAsObject({ 'employeeNumberID.employeePositionID': 'employeePositionID' })
    .map(sign => {
      let docData, signData
      try {
        docData = App.blobStores.getContent(
          { ID: sign.docID, entity: 'hr_order', attribute: 'document', isDirty: false },
          { encoding: 'bin' }
        )

        signData = App.blobStores.getContent(
          { ID: sign.ID, entity: 'hr_empOrderSignature', attribute: 'signature', isDirty: false },
          { encoding: 'bin' }
        )
      } catch (e) {
      }
      if (docData && signData) {
        const verifyResult = iitCrypto.verify(signData, docData)
        if (verifyResult && verifyResult.valid) sign.serial = verifyResult.certificate.serial
        sign.signingTime = verifyResult.signingTime
      }
      return sign
    })
  const participantIDs = UB.Repository('hr_empOrdListAppruv')
    .attrs(['ID', 'participantID'])
    .where('orderID', '=', orderID)
    .selectAsObject()

  if (recparticipant.length) {
    const empOrdListAppruvStore = UB.DataStore('hr_empOrdListAppruv')
    recparticipant.forEach(o => {
      const signature = signatureData.find(s => s && (s.participantID === o.ID))
      const participantID = participantIDs.find(p => p.participantID === o.ID)
      if (o.position || o.positionID) {
        empOrdListAppruvStore.run('insert', {
          execParams: {
            orderID,
            respPositionID: o.position || o.positionID,
            respEmployeePositionID: o.employeePositionID,
            stageKind: o.stageKind,
            KEP: signature ? signature.serial : null,
            dateAppruv: signature ? signature.signingTime : null,
            participantID: o.ID
          }
        })
        participantID && empOrdListAppruvStore.run('delete', {
          execParams: { ID: participantID.ID }
        })
      }
    })
  }
  ctx.mParams.addItems = !!recparticipant.length
}
me.updateEmpOrdListAppruvList = function (ctx) {
  const { mParams } = ctx
  const participantIDs = UB.Repository('hr_empOrdListAppruv')
    .attrs(['ID', 'participantID'])
    .exists(
      UB.Repository('hr_task')
        .correlation('participantID', 'participantID')
        .where('ID', '=', mParams.taskID)
    )
    .selectAsObject()

  if (participantIDs.length) {
    const recparticipant = UB.Repository('hr_recparticipant')
      .attrs(['ID', 'employeePosition.positionID', 'employeePosition', 'executionDate', 'recStageID.stageKind', 'positionID'])
      .where('recStageID.stageKind', 'in', ['VISA', 'ONLAW'])
      .where('recStageID.entityName', '=', 'hr_recstage')
      .exists(
        UB.Repository('hr_task')
          .correlation('participantID', 'ID')
          .where('ID', '=', mParams.taskID)
      )
      .orderBy('recStageID.orderIndex', 'asc')
      .selectAsObject({
        'employeePosition.positionID': 'position',
        'employeePosition': 'employeePositionID',
        'recStageID.stageKind': 'stageKind'
      })
    const signatureData = UB.Repository('hr_empOrderSignature')
      .attrs(['ID', 'participantID', 'docID', 'employeeNumberID.employeePositionID'])
      .exists(
        UB.Repository('hr_task')
          .correlation('participantID', 'participantID')
          .where('ID', '=', mParams.taskID)
      )
      .where('participantID.recStageID.entityName', '=', 'hr_recstage')
      .where('canceled', '=', false)
      .selectAsObject({ 'employeeNumberID.employeePositionID': 'employeePositionID' })
      .map(sign => {
        let docData, signData
        try {
          docData = App.blobStores.getContent(
            { ID: sign.docID, entity: 'hr_order', attribute: 'document', isDirty: false },
            { encoding: 'bin' }
          )

          signData = App.blobStores.getContent(
            { ID: sign.ID, entity: 'hr_empOrderSignature', attribute: 'signature', isDirty: false },
            { encoding: 'bin' }
          )
        } catch (e) {
        }
        if (docData && signData) {
          const verifyResult = iitCrypto.verify(signData, docData)
          if (verifyResult && verifyResult.valid) sign.serial = verifyResult.certificate.serial
          sign.signingTime = verifyResult.signingTime
        }
        return sign
      })
    const empOrdListAppruvStore = UB.DataStore('hr_empOrdListAppruv')
    recparticipant.forEach(o => {
      const signature = signatureData.find(s => s && (s.participantID === o.ID))
      const participantID = participantIDs.find(p => p.participantID === o.ID)
      if (participantID && signature) {
        empOrdListAppruvStore.run('update', {
          __skipOptimisticLock: true,
          execParams: {
            ID: participantID.ID,
            KEP: signature ? signature.serial : null,
            dateAppruv: signature ? signature.signingTime : null
          }
        })
      }
    })
  }
}
