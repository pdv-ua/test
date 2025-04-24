const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const mustache = require('mustache')
const dateService = require('../AC/modules/dataServices/dateService')

me.entity.addMethod('getReport')

me.getReport = function (ctx) {
  const params = ctx.mParams.params
  const dictUniversalRef = UB.Repository('hr_dictUniversalRef')
    .attrs(['ID', 'name', 'docText'])
    .where('organizationID', '=', params.organizationID)
    .where('code', '=', params.refCode)
    .selectSingle()

  if (dictUniversalRef) {
    const employeeNumberData = UB.Repository('hr_employeeNumberS')
      .attrs([ 'employeeID',
        'employeeID.fullFIO', 'employeeID.shortFIO',
        'employeeID.genName', 'employeeID.lastName', 'employeeID.firstName',
        'employeeID.middleName', 'employeeID.datName', 'employeeID.accusativeName',
        'employeeID.insName', 'employeeID.locName', 'employeeID.vocName',
        'employeeID.engName'])
      .selectById(params.employeeNumberID) || {}
    const docData = UB.Repository('hr_employeeDocs')
      .attrs(['ID', 'docSeries', 'docNumber'])
      .where('employeeID', '=', employeeNumberData.employeeID)
      .where('dictDocKindID.docType', '=', '1')
      .where('state', '=', '1')
      .selectSingle()
    let refText = mustache.render(dictUniversalRef.docText, {
      firstName: employeeNumberData['employeeID.firstName'] || '',
      lastName: employeeNumberData['employeeID.lastName'] || '',
      middleName: employeeNumberData['employeeID.middleName'] || '',
      shortFIO: employeeNumberData['employeeID.shortFIO'] || '',
      fullFIO: employeeNumberData['employeeID.fullFIO'] || '',
      genName: employeeNumberData['employeeID.genName'] || '',
      datName: employeeNumberData['employeeID.datName'] || '',
      accusativeName: employeeNumberData['employeeID.accusativeName'] || '',
      insName: employeeNumberData['employeeID.insName'] || '',
      locName: employeeNumberData['employeeID.locName'] || '',
      vocName: employeeNumberData['employeeID.vocName'] || '',
      fullNameEng: employeeNumberData['employeeID.engName'] || '',
      onDate: dateService.formatDate(params.onDate),
      docSeries: docData ? docData.docSeries : '',
      docNumber: docData ? docData.docNumber : ''
    }).replace(/\n/g, '<br />')

    refText = `<html><body>` + refText || '' + `</body></html>`
    ctx.mParams.refText = refText
    ctx.mParams.refName = dictUniversalRef.name
  }
}
