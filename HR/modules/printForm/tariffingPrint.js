/* global UB */
const TPManager = require('../../../AC/modules/documentBuilder/tpManager')
const xlsxService = require('../../../AC/modules/documentBuilder/xlsxService')

module.exports = {
  getXlsx
}

const colConf = [
  { width: 5 }, // 1
  { width: 22 }, // 2
  { width: 22 }, // 3
  { width: 6 }, // 4
  { width: 10 }, // 5
  { width: 7 }, // 6
  { width: 7 }, // 7
  { width: 7 }, // 8
  { width: 7 }, // 9
  { width: 7 }, // 10
  { width: 7 }, // 11
  { width: 10 }, // 12
  { width: 6 }, // 13
  { width: 6 }, // 14
  { width: 7 }, // 15
  { width: 6 }, // 16
  { width: 8 }, // 17
  { width: 7 }, // 18
  { width: 6 }, // 19
  { width: 8 }, // 20
  { width: 6 }, // 21
  { width: 8 }, // 22
  { width: 6 }, // 23
  { width: 8 }, // 24
  { width: 9 }, // 25
  { width: 9 }, // 26
  { width: 7 }, // 27
  { width: 6 }, // 28
  { width: 8 }, // 29
  { width: 12 } // 30
]
const totalsColCount = 11

function getXlsx (params) {
  const doc = new TPManager(getConfig(params), 'xlsx')
  writeDocument(doc, params)
  return doc.getDocument()
}

function getBorderObject (border) {
  return {
    left: border,
    top: border,
    bottom: border,
    right: border
  }
}

function getConfig (params) {
  params.colCount = 30
  //  params.isMed = true
  return {
    document: {
      orientation: '1'
    },
    header: {
      font: {
        name: 'Arial Cyr',
        size: 12,
        type: 'Bold'
      },
      border: getBorderObject(0),
      align: 'center',
      verticalAlign: 'center',
      columns: {
        config: colConf
      }
    },
    tableBody: {
      title: '',
      font: {
        name: 'Arial Cyr',
        size: 8
      },
      border: getBorderObject(0.5),
      align: 'center',
      verticalAlign: 'center',
      columns: {
        hStretch: true,
        config: colConf
      }
    },
    footer: {
      font: {
        name: 'Arial Cyr',
        size: 8
      },
      border: getBorderObject(0),
      align: 'left',
      verticalAlign: 'center',
      columns: {
        hStretch: true,
        config: colConf
      }
    }
  }
}

function writeDocument (doc, params) {
  const header = []
  const tableHeader = []
  const table = []
  const totalsHeader = []
  const totals = []
  const footer = []

  let rowIndex = addPageHeader(header, params)
  doc.table(header, 'header')

  rowIndex += addTableHeaders(tableHeader, params)
  doc.table(tableHeader, 'tableBody')

  rowIndex += addRows(table, params, rowIndex)
  doc.table(table, 'tableBody')

  if (params.isMed) {
    rowIndex += addTotalsHeader(totalsHeader, params)
    doc.table(totalsHeader, 'header')

    rowIndex += addTotals(totals, params, rowIndex)
    doc.table(totals, 'tableBody')
  }

  rowIndex += addPageFooter(footer, params, rowIndex)
  doc.table(footer, 'footer')
}

function getEmptyRow (params, cfg) {
  let res = []
  let cell = Object.assign({}, cfg)
  for (let i = 0; i < params.colCount; i++) {
    res.push(cell)
  }
  return res
}

function getNoBorderCell () {
  return {
    style: { border: getBorderObject(0) }
  }
}

function addPageHeader (header, params) {
  const title = params.reportKind === 'plan' ? 'Тарифікаційний список працівників' : 'Тарифікаційний список (фактичний)'
  header.push([{ content: title, style: { colSpan: params.colCount } }])
  if (params.childDepName) {
    header.push([{ content: `${params.childDepName || ''}`, style: { colSpan: params.colCount } }])
  }
  if (params.structDepName) {
    header.push([{ content: `${params.structDepName || ''}`, style: { colSpan: params.colCount } }])
  }
  header.push([{ content: `${params.orgName || ''}`, style: { colSpan: params.colCount } }])
  if (params.progClassName) {
    header.push([{ content: `${params.progClassName || ''}`, style: { colSpan: params.colCount } }])
  }
  if (params.fundName) {
    header.push([{ content: `${params.fundName || ''}`, style: { colSpan: params.colCount } }])
  }
  header.push([{ content: `на ${params.onDateStr}р.`, style: { colSpan: params.colCount } }])
  header.push(getEmptyRow(params))
  return header.length
}

function addTableHeaders (table, params) {
  table.skipAutoFill = true
  table.push([
    { content: '№ з/п', style: { rowSpan: 3, height: 54 } }, // 1
    { content: 'Назва структурного підрозділу, посада, кваліфікаційна категорія (розряд)', style: { rowSpan: 3 } }, // 2
    { content: 'Прізвище,ім’я та по батькові', style: { rowSpan: 3 } }, // 3
    { content: 'Тарифний розряд', style: { rowSpan: 3, textRotation: 90 } }, // 4
    { content: 'Посадовий оклад визначений за тарифним розрядом', style: { rowSpan: 3, textRotation: 90 } }, // 5
    { content: 'Підвищення посадового окладу', style: { colSpan: 6 } }, // 6
    {}, // 7
    {}, // 8
    {}, // 9
    {}, // 10
    {}, // 11
    { content: 'Посадовий оклад з підвищеннями Сума (гр.5-11)', style: { rowSpan: 3 } }, // 12
    { content: 'Обсяг роботи за даною посадою (1,0; 0,75; 0,5; 0,25)', style: { colSpan: 2 } }, // 13
    {}, // 14
    { content: 'Доплати, що мають обов’язковий характер', style: { colSpan: 3 } }, // 15
    {}, // 16
    {}, // 17
    { content: 'Надбавки, що мають обов’язковий характер', style: { colSpan: 7 } }, // 18
    {}, // 19
    {}, // 20
    {}, // 21
    {}, // 22
    {}, // 23
    {}, // 24
    { content: 'Місячний фонд заробітної плати без урахування доплати до мінімальної заробітної плати (у грн)', style: { rowSpan: 3, textRotation: 90 } }, // 25
    { content: 'Доплата до мінімальної заробітної плати, Доплата  згідно Постанови КМУ 28 від 13.01.2023 р.', style: { rowSpan: 3, textRotation: 90 } }, // 26
    { content: 'Доплати, що мають обов’язковий характер', style: { colSpan: 3 } }, // 27
    {}, // 28
    {}, // 29
    { content: 'Місячний фонд заробітної плати (у грн.)', style: { rowSpan: 3 } } // 30
  ])
  table.push([
    {}, // 1
    {}, // 2
    {}, // 3
    {}, // 4
    {}, // 5
    { content: 'за кваліфікаційну категорію керівникам та їх заступника, завідування, старшинство, санітарний транспорт (до посадового окладу за гр.5)',
      style: { height: 90, rowSpan: 2, textRotation: 90, font: { size: 7 } } }, // 6
    { content: 'за оперативні втручання (до посадового окладу гр.5)', style: { rowSpan: 2, textRotation: 90, font: { size: 7 } } }, // 7
    { content: 'за диплом з відзнакою (до посадового окладу за гр.5)', style: { rowSpan: 2, textRotation: 90, font: { size: 7 } } }, // 8
    { content: 'інші підвищення, передбачені пунктом 2.2 (до посадового окладу за гр.5)', style: { rowSpan: 2, textRotation: 90, font: { size: 7 } } }, // 9
    { content: 'у зв’язку зі шкідливими і важкими умовами оплати праці (до посадового окладу за гр.5 + гр.6 + гр.7 + гр.8 + гр.9)', // 10
      style: { rowSpan: 2, textRotation: 90, font: { size: 7 } } },
    { content: 'інші підвищення (до посадового окладу за гр.6 + гр.7 + гр.8 + гр.9)', style: { rowSpan: 2, textRotation: 90, font: { size: 7 } } }, // 11
    {}, // 12
    { content: 'за основною посадою', style: { border: { bottom: 0 }, rowSpan: 2, textRotation: 90 } }, // 13
    { content: 'за сумісництвом', style: { border: { bottom: 0 }, rowSpan: 2, textRotation: 90 } }, // 14
    { content: 'за науковий ступінь', style: { border: { bottom: 0 }, rowSpan: 2, textRotation: 90 } }, // 15
    { content: '%', style: { rowSpan: 2 } }, // 16
    { content: 'грн', style: { rowSpan: 2 } }, // 17
    { content: 'Стаж', style: { colSpan: 3 } }, // 18
    {}, // 19
    {}, // 20
    { content: 'за почесне звання, тривалість безперервної роботи, класність водіїв, доплата шеф-кухарю', style: { colSpan: 2 } }, // 21
    {}, // 22
    { content: params.isMed ? 'Надбавки, згідно Постанови КМУ 1025 від 26.11.2008р.' : 'Інші надбавки, дозволені законодавством', style: { colSpan: 2 } }, // 23
    {}, // 24
    {}, // 25
    {}, // 26
    { content: 'за використання дезінфікуючих засобів', style: { rowSpan: 2, textRotation: 90 } }, // 27
    { content: '%', style: { rowSpan: 2 } }, // 28
    { content: 'грн', style: { rowSpan: 2 } }, // 29
    {} // 30
  ])
  table.push([
    {}, // 1
    {}, // 2
    {}, // 3
    {}, // 4
    {}, // 5
    {}, // 6
    {}, // 7
    {}, // 8
    {}, // 9
    {}, // 10
    {}, // 11
    {}, // 12
    {}, // 13
    {}, // 14
    {}, // 15
    {}, // 16
    {}, // 17
    { content: 'вислуга років', style: { height: 72, textRotation: 90 } }, // 18
    { content: '%' }, // 19
    { content: 'грн' }, // 20
    { content: '%' }, // 21
    { content: 'грн' }, // 22
    { content: '%' }, // 23
    { content: 'грн' }, // 24
    {}, // 25
    {}, // 26
    {}, // 27
    {}, // 28
    {}, // 29
    {} // 30
  ])
  return table.length
}

function addColNums (table, params) {
  let colNumHeader = []
  let colNumHeaderCell = { style: { font: { size: 7 } } }
  for (let i = 1; i <= params.colCount; i++) {
    colNumHeader.push(Object.assign({ content: i.toString() }, colNumHeaderCell))
  }
  table.push(colNumHeader)
  return table.length
}

function addRows (table, params, rowIndex) {
  const data = params.data
  const depts = []
  const rangesCache = {}
  // const minSalarySum = params.minSalarySum || 0
  let currIdx = ++rowIndex
  const numberFormt = params.roundTo === 'decimal2' ? '#,##0.00;-#,##0.00;;@' : '#,##0;-#,##0;;@'

  function addRow (cfg, row) {
    table.push(cfg)
    row.rowIndex = ++currIdx
  }

  function getSumFormula (col, row1, row2) {
    let res = ''
    let key = `${row1}_${row2}`
    let ranges = rangesCache[key]
    if (!ranges) {
      ranges = []
      let currRange = { beg: row1, end: row1, isPushed: true }
      for (let i = row1; i <= row2; i++) {
        let dataRow = data[i - rowIndex - 1]
        if (dataRow === undefined) {
          res = ''
        } else if (dataRow.isPosition) {
          if (currRange.isPushed) {
            // Починається підрозділ
            currRange.beg = i
            currRange.isPushed = false
          }
          currRange.end = i
        } else {
          if (!currRange.isPushed && currRange.end >= currRange.beg) {
            ranges.push(Object.assign({}, currRange))
            currRange.isPushed = true
          }
        }
      }
      if (!currRange.isPushed && currRange.end >= currRange.beg) {
        ranges.push(Object.assign({}, currRange))
      }
      rangesCache[key] = ranges
    }
    if (ranges.length > 0) {
      if (ranges.length > 1) {
        res = ''
        // todo: не виводить в Excel формулу для декількох діапазонів, наприклад, '=SUM(D1:D2;D3:D4;D5:D6)'
      } else {
        let excelRanges = ranges.map(r => `${xlsxService.getCellName(col, r.beg)}:${xlsxService.getCellName(col, r.end)}`)
        res = `=SUM(${excelRanges.join(';')})`
      }
    }
    return res
  }

  function getFirstDepPos (fromIdx) {
    let res = currIdx
    for (let i = fromIdx + 1; i < data.length; i++) {
      let row = data[i]
      if (!row.isDepartment && !row.isTotal) {
        res += (i - (fromIdx + 1))
        break
      }
    }
    return res
  }

  currIdx += addColNums(table, params)

  if (data && data.length > 0) {
    for (let i = 0; i < data.length; i++) {
      let row = data[i]
      if (row.isDepartment) {
        if (row.hasPos) {
          let depRow = { content: row.name, style: { align: 'left', font: { type: 'Bold', size: 12 }, colSpan: params.colCount } }
          if (row.level === 1) {
            depRow.style.font.color = 'blue'
          } else if (row.level === 2) {
            depRow.style.font.decoration = 'underline'
          }
          if (row.level <= 2) {
            depRow.style.height = 36
          }
          addRow([ depRow ], row)
          row.beg = getFirstDepPos(i)
          depts.push(row)
        }
      } else {
        if (row.isTotal) {
          if (row.hasPos) {
            let totalContentCell = { content: row.name, style: { align: 'left', colSpan: 4 } }
            let formula13
            let formula14
            let formulaQuantitySum
            let formulaScienceSum
            let formulaWorkexpSum
            let formulaDesertsSum
            let formulaAddpaySum
            let formulaFundMonth
            let formulaFundAddpay
            let formulaObligatorySum
            let formulaFundSum

            if (!row.isCatTotal) {
              totalContentCell.style.font = { type: 'Bold' }
              let totalDept = depts.find(dept => dept.mi_data_id === row.mi_data_id)
              if (totalDept) {
                totalDept.end = currIdx
                formula13 = getSumFormula(13, totalDept.beg, totalDept.end)
                formula14 = getSumFormula(14, totalDept.beg, totalDept.end)
                if (formula13.length > 0) {
                  formulaQuantitySum = formula13
                }
                if (formula14.length > 0) {
                  formulaQuantitySum = formulaQuantitySum ? `${formulaQuantitySum}+${formula14.slice(1)}` : formula14
                }
                formulaScienceSum = getSumFormula(17, totalDept.beg, totalDept.end)
                formulaWorkexpSum = getSumFormula(20, totalDept.beg, totalDept.end)
                formulaDesertsSum = getSumFormula(22, totalDept.beg, totalDept.end)
                formulaAddpaySum = getSumFormula(24, totalDept.beg, totalDept.end)
                formulaFundMonth = getSumFormula(25, totalDept.beg, totalDept.end)
                formulaFundAddpay = getSumFormula(26, totalDept.beg, totalDept.end)
                formulaObligatorySum = getSumFormula(29, totalDept.beg, totalDept.end)
                formulaFundSum = getSumFormula(30, totalDept.beg, totalDept.end)
              }
            }
            if (!row.isCatTotal && row.isTotalAll) {
              totalContentCell.style.height = 16
            }
            if (row.isTotal2Rows) {
              if (row.row1) {
                totalContentCell.style.rowSpan = 2
                addRow([
                  totalContentCell,
                  { content: row.basepay, style: { rowSpan: 2, align: 'right', font: totalContentCell.style.font, format: numberFormt } },
                  { content: row.basepayAdd1, style: { rowSpan: 2, align: 'right', font: totalContentCell.style.font, format: numberFormt } },
                  { content: row.basepayAdd2, style: { rowSpan: 2, align: 'right', font: totalContentCell.style.font, format: numberFormt } },
                  { content: row.basepayAdd3, style: { rowSpan: 2, align: 'right', font: totalContentCell.style.font, format: numberFormt } },
                  { content: row.basepayAdd4, style: { rowSpan: 2, align: 'right', font: totalContentCell.style.font, format: numberFormt } },
                  { content: row.basepayAdd5, style: { rowSpan: 2, align: 'right', font: totalContentCell.style.font, format: numberFormt } },
                  { content: row.basepayAdd6, style: { rowSpan: 2, align: 'right', font: totalContentCell.style.font, format: numberFormt } },
                  { content: row.basepaySum, style: { rowSpan: 2, align: 'right', font: totalContentCell.style.font, format: numberFormt } },
                  { content: row.quantityBase, formula: formula13, style: { font: totalContentCell.style.font } },
                  { content: row.quantityAdd, formula: formula14, style: { font: totalContentCell.style.font } },
                  // { style: { colSpan: 15, rowSpan: 2, border: { bottom: 0 } } },
                  { style: { rowSpan: 2 } },
                  { style: { rowSpan: 2 } },
                  { content: row.scienceSum, formula: formulaScienceSum, style: { rowSpan: 2, align: 'right', font: totalContentCell.style.font, format: numberFormt } },
                  { style: { rowSpan: 2 } },
                  { style: { rowSpan: 2 } },
                  { content: row.workexpSum, formula: formulaWorkexpSum, style: { rowSpan: 2, align: 'right', font: totalContentCell.style.font, format: numberFormt } },
                  { style: { rowSpan: 2 } },
                  { content: row.desertsSum, formula: formulaDesertsSum, style: { rowSpan: 2, align: 'right', font: totalContentCell.style.font, format: numberFormt } },
                  { style: { rowSpan: 2 } },
                  { content: row.addpaySum, formula: formulaAddpaySum, style: { rowSpan: 2, align: 'right', font: totalContentCell.style.font, format: numberFormt } },
                  { content: row.fundMonth, formula: formulaFundMonth, style: { rowSpan: 2, align: 'right', font: totalContentCell.style.font, format: numberFormt } },
                  { content: row.fundAddpay, formula: formulaFundAddpay, style: { rowSpan: 2, align: 'right', font: totalContentCell.style.font, format: numberFormt } },
                  { style: { rowSpan: 2 } },
                  { style: { rowSpan: 2 } },
                  { content: row.obligatorySum, formula: formulaObligatorySum, style: { rowSpan: 2, align: 'right', font: totalContentCell.style.font, format: numberFormt } },
                  { content: row.fundSum, formula: formulaFundSum, style: { rowSpan: 2, align: 'right', font: totalContentCell.style.font, format: numberFormt, border: { bottom: 0 } } }
                ], row)
              }
              if (row.row2) {
                addRow([
                  { content: row.quantity, formula: formulaQuantitySum, style: { font: totalContentCell.style.font, colSpan: 2 } }
                ], row)
              }
            } else if (row.isTotalAll) {
              totalContentCell.style.border = getBorderObject(0)
              if (row.isTotalOrg) {
                addRow([
                  { style: { colSpan: 30, border: getBorderObject(0) } }
                ], row)
              }
              addRow([
                totalContentCell,
                { content: row.basepay, style: { align: 'right', font: totalContentCell.style.font, format: numberFormt } },
                { content: row.basepayAdd1, style: { align: 'right', font: totalContentCell.style.font, format: numberFormt } },
                { content: row.basepayAdd2, style: { align: 'right', font: totalContentCell.style.font, format: numberFormt } },
                { content: row.basepayAdd3, style: { align: 'right', font: totalContentCell.style.font, format: numberFormt } },
                { content: row.basepayAdd4, style: { align: 'right', font: totalContentCell.style.font, format: numberFormt } },
                { content: row.basepayAdd5, style: { align: 'right', font: totalContentCell.style.font, format: numberFormt } },
                { content: row.basepayAdd6, style: { align: 'right', font: totalContentCell.style.font, format: numberFormt } },
                { content: row.basepaySum, style: { align: 'right', font: totalContentCell.style.font, format: numberFormt } },
                { content: row.quantity, formula: formulaQuantitySum, style: { font: totalContentCell.style.font, colSpan: 2 } },
                { style: { colSpan: 2 } },
                { content: row.scienceSum, formula: formulaScienceSum, style: { align: 'right', font: totalContentCell.style.font, format: numberFormt } },
                { style: { colSpan: 2 } },
                { content: row.workexpSum, formula: formulaWorkexpSum, style: { align: 'right', font: totalContentCell.style.font, format: numberFormt } },
                {},
                { content: row.desertsSum, formula: formulaDesertsSum, style: { align: 'right', font: totalContentCell.style.font, format: numberFormt } },
                {},
                { content: row.addpaySum, formula: formulaAddpaySum, style: { align: 'right', font: totalContentCell.style.font, format: numberFormt } },
                { content: row.fundMonth, formula: formulaFundMonth, style: { align: 'right', font: totalContentCell.style.font, format: numberFormt } },
                { content: row.fundAddpay, formula: formulaFundAddpay, style: { align: 'right', font: totalContentCell.style.font, format: numberFormt } },
                { style: { colSpan: 2 } },
                { content: row.obligatorySum, formula: formulaObligatorySum, style: { align: 'right', font: totalContentCell.style.font, format: numberFormt } },
                { content: row.fundSum, formula: formulaFundSum, style: { align: 'right', font: totalContentCell.style.font, format: numberFormt } }
              ], row)
              if (row.isTotalOrg) {
                addRow([
                  { style: { colSpan: 30, border: getBorderObject(0) } }
                ], row)
              }
            } else {
              if (params.isMed) {
                addRow([
                  totalContentCell,
                  { style: { colSpan: 8 } },
                  { content: row.quantity, formula: formulaQuantitySum, style: { font: totalContentCell.style.font, colSpan: 2 } },
                  { style: { colSpan: 15 } },
                  { content: row.fundSum, formula: formulaFundSum, style: { align: 'right', font: totalContentCell.style.font, format: numberFormt } }
                ], row)
              } else {
                addRow([
                  totalContentCell,
                  { content: row.basepay, style: { align: 'right', font: totalContentCell.style.font, format: numberFormt } },
                  { content: row.basepayAdd1, style: { align: 'right', font: totalContentCell.style.font, format: numberFormt } },
                  { content: row.basepayAdd2, style: { align: 'right', font: totalContentCell.style.font, format: numberFormt } },
                  { content: row.basepayAdd3, style: { align: 'right', font: totalContentCell.style.font, format: numberFormt } },
                  { content: row.basepayAdd4, style: { align: 'right', font: totalContentCell.style.font, format: numberFormt } },
                  { content: row.basepayAdd5, style: { align: 'right', font: totalContentCell.style.font, format: numberFormt } },
                  { content: row.basepayAdd6, style: { align: 'right', font: totalContentCell.style.font, format: numberFormt } },
                  { content: row.basepaySum, style: { align: 'right', font: totalContentCell.style.font, format: numberFormt } },
                  { content: row.quantityBase, style: { font: totalContentCell.style.font } },
                  { content: row.quantityAdd, style: { font: totalContentCell.style.font } },
                  {},
                  {},
                  { content: row.scienceSum, style: { align: 'right', font: totalContentCell.style.font, format: numberFormt } },
                  {},
                  {},
                  { content: row.workexpSum, style: { align: 'right', font: totalContentCell.style.font, format: numberFormt } },
                  {},
                  { content: row.desertsSum, style: { align: 'right', font: totalContentCell.style.font, format: numberFormt } },
                  {},
                  { content: row.addpaySum, style: { align: 'right', font: totalContentCell.style.font, format: numberFormt } },
                  { content: row.fundMonth, style: { align: 'right', font: totalContentCell.style.font, format: numberFormt } },
                  { content: row.fundAddpay, style: { align: 'right', font: totalContentCell.style.font, format: numberFormt } },
                  {},
                  {},
                  { content: row.obligatorySum, style: { align: 'right', font: totalContentCell.style.font, format: numberFormt } },
                  { content: row.fundSum, style: { align: 'right', font: totalContentCell.style.font, format: numberFormt } }
                ], row)
              }
            }
          }
        } else {
          let rn = currIdx
          let basepayCell = xlsxService.getCellName(5, rn)
          let basepayCell1 = xlsxService.getCellName(6, rn)
          let basepayCell2 = xlsxService.getCellName(7, rn)
          let basepayCell3 = xlsxService.getCellName(8, rn)
          let basepayCell4 = xlsxService.getCellName(9, rn)
          let basepayCell5 = xlsxService.getCellName(10, rn)
          let basepayCell6 = xlsxService.getCellName(11, rn)
          let basepaySumCell = xlsxService.getCellName(12, rn)
          let qntCell1 = xlsxService.getCellName(13, rn)
          let qntCell2 = xlsxService.getCellName(14, rn)
          // let sciencePercentCell = xlsxService.getCellName(16, rn)
          let scienceSumCell = xlsxService.getCellName(17, rn)
          // let workexpPercentCell = xlsxService.getCellName(19, rn)
          let workexpSumCell = xlsxService.getCellName(20, rn)
          // let desertsPercentCell = xlsxService.getCellName(21, rn)
          let desertsSumCell = xlsxService.getCellName(22, rn)
          // let addpayPercentCell = xlsxService.getCellName(23, rn)
          let addpaySumCell = xlsxService.getCellName(24, rn)
          let fundMonthCell = xlsxService.getCellName(25, rn)
          let fundAddpayCell = xlsxService.getCellName(26, rn)
          let formulaQuantity = `(${qntCell1}+${qntCell2})`
          // let formulaFundAddpay = (minSalarySum > (row.fundMonth || 0)) && `=IF(${minSalarySum}*${formulaQuantity}>${row.fundMonth || 0},${minSalarySum}*${formulaQuantity}-${row.fundMonth || 0},0)`
          // let formulaFundAddpay = (minSalarySum > (row.fundMonth || 0)) && `=IF(${minSalarySum}*${formulaQuantity}>${fundMonthCell},${minSalarySum}*${formulaQuantity}-${fundMonthCell},0)`
          let obligatoryPercentCell = xlsxService.getCellName(28, rn)
          let obligatorySumCell = xlsxService.getCellName(29, rn)
          let nameStyle = { align: 'left' }
          if (row.nameIsRed) {
            nameStyle.font = { color: '#FF0000' }
          }
          let empNameStyle = { align: 'left' }
          if (row.empNameIsRed) {
            empNameStyle.font = { color: '#FF0000' }
          }
          const formulaFundMonthRow = params.useCoef
            ? row.catCode2
              ? `=ROUND(${basepaySumCell}*${formulaQuantity},2)+${scienceSumCell}+${workexpSumCell}+${desertsSumCell}+${addpaySumCell}+${obligatorySumCell}`
              : `=ROUND(${basepaySumCell}*${formulaQuantity},2)+${scienceSumCell}+${workexpSumCell}+${desertsSumCell}+${addpaySumCell}`
            : row.catCode2
              ? `=ROUND((${basepaySumCell}+${scienceSumCell}+${workexpSumCell}+${desertsSumCell}+${addpaySumCell}+${obligatorySumCell})*${formulaQuantity},2)`
              : `=ROUND((${basepaySumCell}+${scienceSumCell}+${workexpSumCell}+${desertsSumCell}+${addpaySumCell})*${formulaQuantity},2)`

          const formulaFundSumRow = params.useCoef
            ? row.catCode2
              ? `=ROUND(${fundMonthCell}+${fundAddpayCell},2)`
              : `=ROUND(${fundMonthCell}+${fundAddpayCell}+${obligatorySumCell},2)`
            : row.catCode2
              ? `=ROUND(${fundMonthCell}+${fundAddpayCell},2)`
              : `=ROUND(${fundMonthCell}+${fundAddpayCell}+${obligatorySumCell}*${formulaQuantity},2)`

          if (row.vacationChildText) {
            addRow([
              { content: row.indexNum },
              { content: row.name, style: nameStyle },
              { content: row.empName, style: empNameStyle },
              { content: row.tarifCode, style: { align: 'center' } },
              { content: row.basepay, style: { align: 'right', format: numberFormt } },
              { content: row.vacationChildText, style: { align: 'center', colSpan: 6 } },
              {
                content: row.basepaySum,
                formula: `=${basepayCell}`,
                style: { align: 'right', format: numberFormt }
              },
              { content: row.quantityBase },
              { content: row.quantityAdd },
              { content: row.scienceName, style: { align: 'center' } },
              { content: row.sciencePercent, style: { align: 'right', format: numberFormt } },
              {
                content: row.scienceSum,
                // formula: `=ROUND(${sciencePercentCell}*${basepaySumCell}/100,2)`,
                style: { align: 'right', format: numberFormt }
              },
              { content: row.workexp, style: { align: 'center' } },
              { content: row.workexpPercent, style: { align: 'right', format: numberFormt } },
              {
                content: row.workexpSum,
                // formula: `=ROUND(${workexpPercentCell}*${basepaySumCell}/100,2)`,
                style: { align: 'right', format: numberFormt }
              },
              { content: row.desertsPercent, style: { align: 'right', format: numberFormt } },
              {
                content: row.desertsSum,
                // formula: `=ROUND(${desertsPercentCell}*${basepaySumCell}/100,2)`,
                style: { align: 'right', format: numberFormt }
              },
              { content: row.addpayPercent, style: { align: 'right', format: numberFormt } },
              {
                content: row.addpaySum,
                // formula: `=ROUND(${addpayPercentCell}*${basepaySumCell}/100,2)`,
                style: { align: 'right', format: numberFormt }
              },
              {
                content: row.fundMonth,
                formula: formulaFundMonthRow,
                style: { align: 'right', format: numberFormt }
              },
              {
                content: row.fundAddpay,
                // formula: formulaFundAddpay,
                style: { align: 'right', format: numberFormt }
              },
              {},
              { content: row.obligatoryPercent, style: { align: 'right', format: numberFormt } },
              {
                content: row.obligatorySum,
                formula: `=ROUND(${obligatoryPercentCell}*${basepaySumCell}*${formulaQuantity}/100,2)`,
                style: { align: 'right', format: numberFormt }
              },
              {
                content: row.fundSum,
                formula: formulaFundSumRow,
                style: { font: { type: 'Bold' }, align: 'right', format: numberFormt }
              }
            ], row)
          } else {
            addRow([
              { content: row.indexNum },
              { content: row.name, style: nameStyle },
              { content: row.empName, style: empNameStyle },
              { content: row.tarifCode, style: { align: 'center' } },
              { content: row.basepay, style: { align: 'right', format: numberFormt } },
              { content: row.basepayAdd1, style: { align: 'right', format: numberFormt } },
              { content: row.basepayAdd2, style: { align: 'right', format: numberFormt } },
              { content: row.basepayAdd3, style: { align: 'right', format: numberFormt } },
              { content: row.basepayAdd4, style: { align: 'right', format: numberFormt } },
              { content: row.basepayAdd5, style: { align: 'right', format: numberFormt } },
              { content: row.basepayAdd6, style: { align: 'right', format: numberFormt } },
              {
                content: row.basepaySum,
                formula: `=(${basepayCell}+${basepayCell1}+${basepayCell2}+${basepayCell3}+${basepayCell4}+${basepayCell5}+${basepayCell6})`,
                style: { align: 'right', format: numberFormt }
              },
              { content: row.quantityBase },
              { content: row.quantityAdd },
              { content: row.scienceName, style: { align: 'center' } },
              { content: row.sciencePercent, style: { align: 'right', format: numberFormt } },
              {
                content: row.scienceSum,
                // formula: `=ROUND(${sciencePercentCell}*${basepaySumCell}/100,2)`,
                style: { align: 'right', format: numberFormt }
              },
              { content: row.workexp, style: { align: 'center' } },
              { content: row.workexpPercent, style: { align: 'right', format: numberFormt } },
              {
                content: row.workexpSum,
                // formula: `=ROUND(${workexpPercentCell}*${basepaySumCell}/100,2)`,
                style: { align: 'right', format: numberFormt }
              },
              { content: row.desertsPercent, style: { align: 'right', format: numberFormt } },
              {
                content: row.desertsSum,
                // formula: `=ROUND(${desertsPercentCell}*${basepaySumCell}/100,2)`,
                style: { align: 'right', format: numberFormt }
              },
              { content: row.addpayPercent, style: { align: 'right', format: numberFormt } },
              {
                content: row.addpaySum,
                // formula: `=ROUND(${addpayPercentCell}*${basepaySumCell}/100,2)`,
                style: { align: 'right', format: numberFormt }
              },
              {
                content: row.fundMonth,
                formula: formulaFundMonthRow,
                style: { align: 'right', format: numberFormt }
              },
              {
                content: row.fundAddpay,
                // formula: formulaFundAddpay,
                style: { align: 'right', format: numberFormt }
              },
              {},
              { content: row.obligatoryPercent, style: { align: 'right', format: numberFormt } },
              {
                content: row.obligatorySum,
                // formula: `=ROUND(${obligatoryPercentCell}*${basepaySumCell}*${formulaQuantity}/100,2)`,
                style: { align: 'right', format: numberFormt }
              },
              {
                content: row.fundSum,
                formula: formulaFundSumRow,
                style: { font: { type: 'Bold' }, align: 'right', format: numberFormt }
              }
            ], row)
          }
        }
      }
    }
  }
  return table.length
}

function addTotalsHeader (header, params) {
  header.push(getEmptyRow(params))
  header.push(getEmptyRow(params))
  header.push([{ content: UB.i18n(`Зведення штатних одиниць станом на {0}р. по {1}`, params.onDateStr, params.orgNameDat),
    style: { align: 'left', font: { type: 'Bold', size: 12 }, colSpan: totalsColCount } },
  {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}
  ])
  return header.length
}

function addTotals (totals, params, rowIndex) {
  const emptyCell = getNoBorderCell()
  let currIdx = rowIndex + totals.length
  function addTotalRow (cfg, row) {
    currIdx++
    totals.push(cfg)
    row.rowIndex = currIdx
  }

  totals.push([
    { content: '№\nз/п' },
    { content: 'Найменування відділення', style: { colSpan: 4 } },
    { content: 'Разом' },
    { content: 'Лікарі' },
    { content: 'Середній медичний персонал' },
    { content: 'Молодший медичний персонал' },
    { content: 'Спеціалісти немедики з в/о' },
    { content: 'Інші' },
    emptyCell, emptyCell, emptyCell, emptyCell, emptyCell, emptyCell, emptyCell, emptyCell, emptyCell, emptyCell,
    emptyCell, emptyCell, emptyCell, emptyCell, emptyCell, emptyCell, emptyCell, emptyCell, emptyCell
  ])
  if (params.totals && params.totals.length > 0) {
    params.totals.forEach(row => {
      if (row.isTitle) {
        addTotalRow([
          { content: row.name, style: { align: 'left', font: { type: 'Bold' }, border: getBorderObject(0), colSpan: totalsColCount } },
          emptyCell, emptyCell, emptyCell, emptyCell, emptyCell, emptyCell, emptyCell, emptyCell, emptyCell, emptyCell,
          emptyCell, emptyCell, emptyCell, emptyCell, emptyCell, emptyCell, emptyCell, emptyCell, emptyCell
        ], row)
      } else if (row.isTotal) {
        addTotalRow([
          { content: row.name, style: { align: 'left', font: { type: 'Bold' }, colSpan: 5 } },
          { content: row.quantity, style: { font: { type: 'Bold' } } },
          { content: row.quantity1, style: { font: { type: 'Bold' } } },
          { content: row.quantity2, style: { font: { type: 'Bold' } } },
          { content: row.quantity3, style: { font: { type: 'Bold' } } },
          { content: row.quantity4, style: { font: { type: 'Bold' } } },
          { content: row.quantity5, style: { font: { type: 'Bold' } } },
          emptyCell, emptyCell, emptyCell, emptyCell, emptyCell, emptyCell, emptyCell, emptyCell, emptyCell, emptyCell,
          emptyCell, emptyCell, emptyCell, emptyCell, emptyCell, emptyCell, emptyCell, emptyCell, emptyCell
        ], row)
      } else {
        addTotalRow([
          { content: row.indexNum },
          { content: row.name, style: { align: 'left', colSpan: 4 } },
          { content: row.quantity, style: { font: { type: 'Bold' } } },
          { content: row.quantity1 },
          { content: row.quantity2 },
          { content: row.quantity3 },
          { content: row.quantity4 },
          { content: row.quantity5 },
          emptyCell, emptyCell, emptyCell, emptyCell, emptyCell, emptyCell, emptyCell, emptyCell, emptyCell, emptyCell,
          emptyCell, emptyCell, emptyCell, emptyCell, emptyCell, emptyCell, emptyCell, emptyCell, emptyCell
        ], row)
      }
    })
  }
  return totals.length
}

function addPageFooter (footer, params, rowIndex) {
  if (!params.signData || !params.signData.length) return 0
  footer.push(getEmptyRow(params))
  params.signData.forEach(item => {
    footer.push(getEmptyRow(params))
    footer.push([
      {}, { content: `${item.posName || ''}`, style: { colSpan: 4 } },
      {}, { content: '________________', style: { align: 'center', colSpan: 2 } },
      {}, { content: `${item.empName || ''}`, style: { colSpan: 3 } },
      {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}
    ])
    footer.push([
      {}, { content: '(посада)', style: { align: 'center', colSpan: 4 } },
      {}, { content: '(підпис)', style: { align: 'center', colSpan: 2 } },
      {}, { content: '(ініціали прізвище)', style: { align: 'center', colSpan: 3 } },
      {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}
    ])
  })
  return footer.length
}
