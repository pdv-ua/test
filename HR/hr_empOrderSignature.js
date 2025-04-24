/* global App */
const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)

function beforeInsert (ctxt) {
  extractSignatureFields(ctxt)
}

function beforeUpdate (ctxt) {
  extractSignatureFields(ctxt)
}

function extractSignatureFields (ctxt) {
  const iitCrypto = require('@ub-d/iit-crypto')
  iitCrypto.init()
  const execParams = ctxt.mParams.execParams
  if (execParams.signature) {
    const { docID } = execParams
    if (!docID) throw new UB.UBAbort('Document ID not passed (client should call insert with docID')
    const docData = App.blobStores.getContent(
      { ID: docID, entity: 'hr_order', attribute: 'document', isDirty: false },
      { encoding: 'bin' }
    )
    const signData = App.blobStores.getContent(
      { ID: execParams.ID, entity: __entityName, attribute: 'signature', isDirty: true },
      { encoding: 'bin' }
    )
    if (!signData) {
      throw new UB.UBAbort(`<<<${UB.i18n('Немає файла підпису')}>>>`)
    }

    const verifyResult = iitCrypto.verify(signData, docData)
    if (!verifyResult.valid) {
      throw new UB.UBAbort(`<<<${UB.i18n('Помилка підпису {0}', JSON.stringify(verifyResult))}>>>`)
    }
    execParams.signerName = verifyResult.subject.fullName
    execParams.signatureDate = verifyResult.signingTime.toISOString()
  }
}

me.getSignatureToPrint = function (ctx) {
  console.log('!!! getSignatureToPrint: 1')
  const iitCrypto = require('@ub-d/iit-crypto')
  // iitCrypto.init()
  const execParams = ctx.mParams.execParams
  const signsResult = []
  if (execParams.docID) {

    const signatureData = UB.Repository('hr_empOrderSignature')
      .attrs(['ID', 'participantID', 'signerName', 'signatureDate'])
      .where('participantID', 'isNotNull')
      .where('canceled', '=', false)
      .where('docID', '=', execParams.docID)
      .selectAsObject()

    console.log('!!! getSignatureToPrint: 2. recCount: ', signatureData.length)

    signatureData.forEach(sign => {
      console.log('!!! getSignatureToPrint: 3. sign: ', sign)

      let docData, signData
      try {
        console.log('!!! getSignatureToPrint: 4.')
        const order = UB.Repository('hr_order')
          .attrs(['ID', 'orderClass.entityName'])
          .selectById(execParams.docID)

        docData = App.blobStores.getContent(
          { ID: execParams.docID, entity: order ? order['orderClass.entityName'] : 'hr_order', attribute: 'document', isDirty: false },
          { encoding: 'bin' }
        )
        console.log('!!! getSignatureToPrint: 5.')

        /*
        signData = App.blobStores.getContent(
          //{ ID: sign.ID, entity: __entityName, attribute: 'signature', isDirty: true },
          { ID: sign.ID, entity: 'hr_empOrderSignature', attribute: 'signature', isDirty: true },
          { encoding: 'bin'}
        )
         */
        signData = {} /*connection.getDocument(
          { entity: 'hr_empOrderSignature',  attribute: 'signature', ID: sign.ID },
          { bypassCache: true, resultIsBinary: true }
        ) */
        console.log('!!! getSignatureToPrint: 6.')
      } catch (e) {
        console.log('!!! getSignatureToPrint error: ', e.message)
      }
      console.log('!!! getSignatureToPrint: 7.')
      if (docData && signData) {
        console.log('!!! getSignatureToPrint: 8.')
        const verifyResult = iitCrypto.verify(signData, docData)
        console.log('!!! getSignatureToPrint: 9.')
        if (verifyResult && verifyResult.valid) {
          console.log('!!! getSignatureToPrint: 10. verifyResult: ', verifyResult)
          signsResult.push({
            ID: sign.ID,
            participantID: sign.participantID,
            certificateSerial: verifyResult.certificate.serial,
            certificateIssuedBy: verifyResult.certificate.issuedBy.fullName,
            signerName: verifyResult.subject.fullName || sign.signerName,
            signatureDate: verifyResult.signingTime.toISOString() || sign.signatureDate
          })
        } else {
          signsResult.push({
            ID: sign.ID,
            participantID: sign.participantID,
            certificateSerial: '-',
            certificateIssuedBy: '',
            signerName: sign.signerName,
            signatureDate: sign.signatureDate
          })
        }
      } else {
        signsResult.push({
          ID: sign.ID,
          participantID: sign.participantID,
          certificateSerial: '-',
          certificateIssuedBy: '',
          signerName: sign.signerName,
          signatureDate: sign.signatureDate
        })
      }
    })
  }

  console.log('!!! getSignatureToPrint: End.')
  ctx.mParams.resultData = JSON.stringify(signsResult)
}
