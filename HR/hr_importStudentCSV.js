const UB = require('@unitybase/ub')
const App = UB.App
const queryString = require('querystring')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const iconv = require('iconv-lite')
const csvLoader = require('../HR/modules/import/csvLoader')
const dateService = require('../AC/modules/dataServices/dateService')
const importStudentService = require('../HR/modules/import/importStudentService')

App.registerEndpoint('loadImportStudentData', loadData, true)

/**
 * @param {THTTPRequest} req
 * @param {THTTPResponse} resp
 */
function loadData (req, resp) {
  if (req.method !== 'POST') {
    return resp.badRequest('invalid HTTP verb' + req.method)
  }
  let params = queryString.parse(req.parameters)
  let data = req.read('bin')

  let attrRow
  const studentData = []
  let noError = true
  let result = ''

  try {
    const csvStr = iconv.decode(Buffer.from(data), params.encoding)
    csvLoader.DETECT_TYPES = false
    csvLoader.parse(csvStr, ',', setRow)
    csvLoader.DETECT_TYPES = true
    // eslint-disable-next-line no-inner-declarations
    function setRow (rowData) {
      if (!attrRow) {
        attrRow = rowData
      } else {
        const row = {}
        for (let i = 0; i < rowData.length; i++) {
          row[attrRow[i]] = (rowData[i] === 'NULL' || rowData[i] === 'null') ? null : rowData[i]
        }
        studentData.push(row)
        delete row.ID
      }
    }
  } catch (err) {
    noError = false
    result = {
      error: UB.i18n('Помилка опрацювання файлу: "{0}"', err.message)
    }
  }

  if (noError) {
    let dateFromStipend = params.dateFromStipend ? dateService.shiftDate(Number(params.dateFromStipend)) : dateService.firstDayOfMonth(dateService.currentDate())
    importStudentService.importStudData(studentData, params.orgID, 'active', null, dateFromStipend, 'csv')
  }

  resp.statusCode = 200
  resp.writeHead('Content-Type: application/json;charset=UTF-8')
  resp.writeEnd(result)
  data = null
}
