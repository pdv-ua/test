const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const UB = require('@unitybase/ub')
const dateService = require('../AC/modules/dataServices/dateService')

me.on('update:before', beforeInsert)
me.on('insert:before', beforeUpdate)

function beforeInsert (ctx) {
  setDescription(ctx)
}

function beforeUpdate (ctx) {
  setDescription(ctx)
}

function setDescription (ctx) {
  const execParams = ctx.mParams.execParams
  const instanceData = ctx.dataStore.getAsJsObject()[0] || {}
  let docName
  let dictDocKindID = (execParams.dictDocKindID === undefined ? instanceData.dictDocKindID : execParams.dictDocKindID) || null
  if (dictDocKindID) {
    docName = UB.Repository('ac_dictDocKind')
      .attrs(['name'])
      .where('ID', '=', dictDocKindID)
      .selectScalar()
  } else {
    docName = UB.i18n('Документ')
  }
  let docSeries = (execParams.docSeries === undefined ? instanceData.docSeries : execParams.docSeries) || ''
  let docNumber = (execParams.docNumber === undefined ? instanceData.docNumber : execParams.docNumber) || ''
  let docIssuedDate = (execParams.docIssuedDate === undefined ? instanceData.docIssuedDate : execParams.docIssuedDate) || ''
  let docIssued = (execParams.docIssued === undefined ? instanceData.docIssued : execParams.docIssued) || ''
  let docSeriesNumber = ''
  if (docSeries || docNumber) {
    if (docSeries) docSeriesNumber = ' ' + docSeries
    if (docNumber) docSeriesNumber += ' ' + docNumber
  }

  if (docIssuedDate) {
    docIssuedDate = ` ${UB.i18n('від')} ${dateService.formatDate(dateService.shiftDate(docIssuedDate))}`
  } else {
    docIssuedDate = ''
  }
  if (docIssued) {
    docIssued = ` ${UB.i18n('виданий')} ${docIssued}`
  } else {
    docIssued = ''
  }
  // <Вид документа> [<Серія>][<Номер>][ від <Коли виданий>][ виданий <Ким виданий>]
  execParams.description = `${docName}${docSeriesNumber}${docIssuedDate}${docIssued}`
}
