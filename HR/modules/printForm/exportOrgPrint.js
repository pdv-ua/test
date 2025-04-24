const UB = require('@unitybase/ub')
const TPManager = require('../../../AC/modules/documentBuilder/tpManager')
const xlsxService = require('../../../AC/modules/documentBuilder/xlsxService')
const dateService = require('../../../AC/modules/dataServices/dateService')
const publicTotals = require('../export/publicTotals')

module.exports = {
  getXlsx
}

function getXlsx () {
  let onDate = UB.Repository('hr_exportTotals')
    .attrs('calcDate')
    .where('ID', '=', 1)
    .selectScalar() || dateService.currentTruncDate()
  const params = { onDate }
  const data = prepareData(params)
  const doc = new TPManager(getConfig(params), 'xlsx')
  writeDocument(doc, data, params)
  return doc.getDocument()
}

function prepareData (params) {
  const ds = UB.DataStore('hr_exportTotals')
  let sql = `${publicTotals.getMainSql()}
ORDER BY o.name`
  ds.runSQL(sql, { onDate: params.onDate })
  let res = JSON.parse(ds.asJSONObject)
  ds.freeNative()
  return res
}

function getConfig (params) {
  params.colCount = 7
  const colConf = [{ width: 4 }, { width: 32 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 }]
  return {
    document: {
      orientation: '1'
    },
    header: {
      font: {
        name: 'Arial Cyr',
        size: 9
      },
      border: {
        left: 0,
        top: 0,
        bottom: 0,
        right: 0
      },
      align: 'left',
      verticalAlign: 'center',
      columns: {
        config: colConf
      }
    },
    tableBody: {
      title: '',
      font: {
        name: 'Arial Cyr',
        size: 10
      },
      border: {
        left: 0.5,
        top: 0.5,
        bottom: 0.5,
        right: 0.5
      },
      align: 'center',
      verticalAlign: 'center',
      columns: {
        hStretch: true,
        config: colConf
      }
    }
  }
}

function writeDocument (doc, data, params) {
  const header = []
  const table = []

  addPageHeader(header, params)
  doc.table(header, 'header')

  addTableHeaders(table, params)
  addRows(table, data, params)
  doc.table(table, 'tableBody')
}

function getEmptyRow (params) {
  let res = []
  for (let i = 0; i < params.colCount; i++) {
    res.push({ content: '' })
  }
  return res
}

function addPageHeader (header, params) {
  header.push([{ content: 'Дані по організаціям для публічного порталу', style: { font: { type: 'Bold', size: 12 }, colSpan: params.colCount } }])
  header.push(getEmptyRow(params))
  params.headerRows = 2
}

function addTableHeaders (table, params) {
  table.push([
    { content: '№ з/п' },
    { content: 'Організація' },
    { content: 'Кількість підрозділів' },
    { content: 'Кількість посад' },
    { content: 'Кількість ставок призначень' },
    { content: 'Гранична чисельність працівників' },
    { content: 'Відсоток призначених' }
  ])
}

function addRows (table, data, params) {
  let idx = 1
  let tableRow1 = params.headerRows + table.length + 1
  for (let i = 0; i < data.length; i++) {
    let item = data[i]
    let row = tableRow1 + i
    let empPosPrcFormula = item.limit_empnum ? `=ROUND(${xlsxService.getCellName(5, row)}*100.0/${xlsxService.getCellName(6, row)},2)` : undefined
    table.push([
      { content: idx++ },
      { content: item.name, style: { align: 'left' } },
      { content: item.dept_count },
      { content: item.pos_count },
      { content: item.emppos_count },
      { content: item.limit_empnum },
      { content: item.emppos_percent || '', formula: empPosPrcFormula }
    ])
  }
  let tableRow2 = params.headerRows + table.length
  if (tableRow2 >= tableRow1) {
    let sumEmpPosCountFormula = `=SUM(${xlsxService.getCellName(5, tableRow1)}:${xlsxService.getCellName(5, tableRow2)})`
    table.push([
      { content: 'ВСЬОГО', style: { align: 'left', colSpan: 4, font: { type: 'Bold' } } },
      { formula: sumEmpPosCountFormula, style: { font: { type: 'Bold' } } },
      { content: '' },
      { content: '' }
    ])
  }
}
