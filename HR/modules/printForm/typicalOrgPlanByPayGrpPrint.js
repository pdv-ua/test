/* global UB */
const TPManager = require('../../../AC/modules/documentBuilder/tpManager')
const dateService = require('../../../AC/modules/dataServices/dateService')
const xlsxService = require('../../../AC/modules/documentBuilder/xlsxService')

module.exports = {
  getXlsx
}

function getXlsx (params) {
  const doc = new TPManager(getConfig(params), 'xlsx')
  writeDocument(doc, params)
  return doc.getDocument()
}

function getConfig (params) {
  const addpayCount = params.addpayCount
  // params.colCount = addpayCount + 10
  let colConf = [{ width: 4 }, { width: 32 }, { width: 12 }, { width: 12 }, { width: 9 }, { width: 10 }]
  if (params.useHourlyPay) {
    colConf = colConf.concat([{ width: 10 }])
  }
  colConf = colConf.concat([{ width: 10 }])

  for (let i = 0; i < addpayCount; i++) {
    colConf.push({ width: 10 })
  }
  colConf = colConf.concat([{ width: 10 }, { width: 10 }, { width: 12 }, { width: 18 }])
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
    },
    footer: {
      font: {
        name: 'Arial Cyr',
        size: 10
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
  const footer = []

  let rowIndex = addPageHeader(header, params)
  doc.table(header, 'header')

  rowIndex += addTableHeaders(tableHeader, params)
  doc.table(tableHeader, 'tableBody')

  rowIndex += addRows(table, params, rowIndex)
  doc.table(table, 'tableBody')

  addPageFooter(footer, params, rowIndex)
  doc.table(footer, 'footer')
}

function getEmptyRow (params, colCount) {
  let res = []
  colCount = colCount || params.colCount
  for (let i = 0; i < colCount; i++) {
    res.push({})
  }
  return res
}

function addPageHeader (header, params) {
  const colCount = params.colCount
  const rightColCount = 5
  const emptyCellCount = colCount - rightColCount
  const underlinedCell = { content: '', style: { border: { bottom: 0.5 } } }
  const emptyCells = getEmptyRow(params, emptyCellCount)
  header.push(emptyCells.concat([{ content: 'Наказ Міністерства фінансів України', style: { colSpan: rightColCount } }]))
  header.push(emptyCells.concat([{ content: 'від 28.01.2002р. №57 (у редакції наказу Міністерства фінансів України', style: { colSpan: rightColCount } }]))
  header.push(emptyCells.concat([{ content: 'від 26.11.2012 №1220', style: { colSpan: rightColCount } }]))
  header.push(emptyCells.concat([{ content: 'ЗАТВЕРДЖУЮ', style: { font: { type: 'Bold', size: 12 }, colSpan: rightColCount } }]))
  header.push(emptyCells.concat([{ content: 'штат у кількості', style: { font: { type: 'Bold' }, colSpan: 2 } },
    { content: `${params.quantity || ''}`, style: { font: { type: 'Bold' } } }, { content: 'штатних одиниць', style: { font: { type: 'Bold' }, colSpan: 2 } }]))
  header.push(emptyCells.concat([{ content: 'з місячним фондом заробітної плати', style: { colSpan: rightColCount } }]))
  header.push(emptyCells.concat([{ content: `${params.fundSum1 || ''}`, style: { align: 'right', font: { type: 'Bold' }, colSpan: 2, format: '#,##0.00' } },
    { content: 'гривень', style: { font: { type: 'Bold' } } }]))
  header.push(emptyCells.concat([{ content: `${params.fundSum1InWords || ''}`, style: { font: { type: 'Bold' }, colSpan: rightColCount } }]))
  header.push(emptyCells.concat([{ content: `${params.chiefPosName || ''}`, style: { colSpan: rightColCount } }]))
  header.push(getEmptyRow(params))
  header.push(emptyCells.concat([underlinedCell, {}, { content: `${params.chiefPib || ''}`, style: { colSpan: 3 } }]))
  header.push(emptyCells.concat([{ content: `${params.onDateStr || ''}` }, { content: 'М.П.', style: { align: 'right', font: { type: 'Bold' } } }, {}, {}, {}]))
  header.push(getEmptyRow(params))

  header.push([{ content: UB.i18n(`ШТАТНИЙ РОЗПИС на {0} рік`, params.year), style: { align: 'center', font: { type: 'Bold', size: 12 }, colSpan: colCount } }])
  header.push([{ content: `${params.orgName}`, style: { align: 'center', font: { type: 'Bold', size: 12 }, colSpan: colCount } }])
  if (params.structDepName) {
    header.push([{ content: `${params.structDepName}`, style: { align: 'center', font: { type: 'Bold', size: 12 }, colSpan: colCount } }])
  }
  if (params.childDepName) {
    header.push([{ content: `${params.childDepName}`, style: { align: 'center', font: { type: 'Bold', size: 12 }, colSpan: colCount } }])
  }
  if (params.progClassName) {
    header.push([{ content: `${params.progClassName || ''}`, style: { align: 'center', font: { type: 'Bold' }, colSpan: colCount } }])
  }
  if (params.dictFundTypeName) {
    header.push([{ content: `${params.dictFundTypeName} фонд`, style: { align: 'center', font: { type: 'Bold', size: 12 }, colSpan: colCount } }])
  }
  header.push(emptyCells.concat([{}, {}, { content: 'Уводиться з ________________ 20___ року', style: { colSpan: 3 } }]))
  header.push(emptyCells.concat([{}, {}, {}, { content: '(число, місяць, рік)', style: { colSpan: 2 } }]))

  header.push(getEmptyRow(params))
  return header.length
}

function addTableHeaders (table, params) {
  const addpayCount = params.addpayCount
  let row1 = [
    { content: '№ з/п', style: { rowSpan: 2, height: 22 } },
    { content: 'Назва посади та структурного\nпідрозділу та посад', style: { rowSpan: 2 } },
    { content: 'Категорія', style: { rowSpan: 2 } },
    { content: 'Код НКУ "Класифікатор профеій" ДК003:2010', style: { rowSpan: 2 } },
    { content: 'Кількість штатних посад', style: { rowSpan: 2 } },
    { content: 'Посадовий оклад (грн.)', style: { rowSpan: 2 } }
  ]
  if (params.useHourlyPay) {
    row1.push({ content: 'Оклад за місяць (грн.)', style: { rowSpan: 2 } })
  }
  row1 = row1.concat([
    { content: 'Надбавки та доплати (грн)', style: { colSpan: addpayCount + 1 } },
    { content: 'Доплата до мінімальної ЗП', style: { rowSpan: 2 } },
    { content: 'Разом доплати та надбавки (грн.)', style: { rowSpan: 2 } },
    { content: 'Фонд заробітної плати на місяць (грн.)', style: { rowSpan: 2 } },
    { content: UB.i18n(`Фонд заробітної плати на {0} рік / з {1} до {2} (грн.)**`, params.year, dateService.formatDate(params.onDate), dateService.formatDate(params.toDate)), style: { rowSpan: 2 } }
  ])
  const row2 = [
    { content: 'Надбавка за стаж' }
  ]
  for (let i = 0; i < addpayCount; i++) {
    row2.push({ content: params['colName' + (i + 1)] })
  }
  table.push(row1)
  table.push(row2)
  return table.length
}

function addColNumRow (table, params) {
  let colNumHeader = []
  let colNumHeaderCell = { style: { font: { size: 8 }, height: 12 } }
  for (let i = 1; i <= params.colCount; i++) {
    colNumHeader.push(Object.assign({ content: i.toString() }, colNumHeaderCell))
  }
  table.push(colNumHeader)
  return table.length
}

function addRows (table, params, rowIndex) {
  const addpayCount = params.addpayCount
  const colCount = params.colCount
  const data = params.data
  const groupBy = params.groupBy
  const depts = []
  const rangesCache = {}
  const minSalarySum = params.minSalarySum || 0
  const monthsFop = params.monthsFop || 6
  let currIdx = ++rowIndex

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
        if (dataRow.isPosition) {
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

  currIdx += addColNumRow(table, params)
  let firstRow = currIdx

  if (data && data.length > 0) {
    for (let i = 0; i < data.length; i++) {
      let row = data[i]
      if (row.isDepartment) {
        let depRow = { content: row.name, style: { align: 'center', font: { type: 'Bold', size: 12 }, colSpan: params.colCount } }
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
      } else {
        if (row.isTotal) {
          let totalContentCell = { content: row.name, style: { align: 'left', colSpan: 4 } }
          let formula4
          let formula10
          let formula11
          if (!row.isCatTotal) {
            totalContentCell.style.font = { type: 'Bold' }
            if (!groupBy) {
              let totalDept = depts.find(dept => dept.mi_data_id === row.mi_data_id)
              if (totalDept) {
                totalDept.end = currIdx
                formula4 = getSumFormula(5, totalDept.beg, totalDept.end)
                formula10 = getSumFormula(colCount - 1, totalDept.beg, totalDept.end)
                formula11 = getSumFormula(colCount, totalDept.beg, totalDept.end)
              }
            }
          }
          if (!row.isCatTotal && row.level <= 2) {
            totalContentCell.style.height = 36
          }
          let totalRow
          if (!groupBy) {
            totalRow = [
              totalContentCell,
              { content: row.quantity, formula: formula4, style: { font: totalContentCell.style.font } },
              {}, {}
            ]
            for (let i = 0; i < addpayCount; i++) {
              totalRow.push({})
            }
            totalRow = totalRow.concat([
              {},
              {},
              { content: row.fundSum1, formula: formula10, style: { font: totalContentCell.style.font, align: 'right', format: '#,##0.00' } },
              { content: row.fundSum2, formula: formula11, style: { font: totalContentCell.style.font, align: 'right', format: '#,##0.00' } }
            ])
          } else {
            formula4 = getSumFormula(5, firstRow, currIdx)
            let formula5 = getSumFormula(params.useHourlyPay ? 7 : 6, firstRow, currIdx)
            let formula6 = getSumFormula(params.useHourlyPay ? 8 : 7, firstRow, currIdx)
            formula10 = getSumFormula(colCount - 1, firstRow, currIdx)
            formula11 = getSumFormula(colCount, firstRow, currIdx)
            totalRow = params.useHourlyPay
              ? [ totalContentCell,
              { content: row.quantity, formula: formula4, style: { font: totalContentCell.style.font } },
              { content: row.basepay, style: { font: totalContentCell.style.font, align: 'right', format: '#,##0.00' } },
              { content: row.basepayHour, formula: formula5, style: { font: totalContentCell.style.font, align: 'right', format: '#,##0.00' } },
              { content: row.addpay6, formula: formula6, style: { font: totalContentCell.style.font, align: 'right', format: '#,##0.00' } }
              ]
              : [ totalContentCell,
                { content: row.quantity, formula: formula4, style: { font: totalContentCell.style.font } },
                { content: row.basepay, formula: formula5, style: { font: totalContentCell.style.font, align: 'right', format: '#,##0.00' } },
                { content: row.addpay6, formula: formula6, style: { font: totalContentCell.style.font, align: 'right', format: '#,##0.00' } }
              ]

            for (let i = 0; i < addpayCount; i++) {
              let key = 'addpayN' + (i + 1)
              let formulaN = getSumFormula(i + (params.useHourlyPay ? 9 : 8), firstRow, currIdx)
              totalRow.push({ content: row[key], formula: formulaN, style: { font: totalContentCell.style.font, align: 'right', format: '#,##0.00' } })
            }
            let formula9 = getSumFormula(colCount - 3, firstRow, currIdx)
            let formula12 = getSumFormula(colCount - 2, firstRow, currIdx)
            totalRow = totalRow.concat([
              { content: row.addpaylast, formula: formula9, style: { font: totalContentCell.style.font, align: 'right', format: '#,##0.00' } },
              { content: row.addpayAll, formula: formula12, style: { font: totalContentCell.style.font, align: 'right', format: '#,##0.00' } },
              { content: row.fundSum1, formula: formula10, style: { font: totalContentCell.style.font, align: 'right', format: '#,##0.00' } },
              { content: row.fundSum2, formula: formula11, style: { font: totalContentCell.style.font, align: 'right', format: '#,##0.00' } }
            ])
          }
          addRow(totalRow, row)
        } else {
          let rn = currIdx
          let qntCell = xlsxService.getCellName(5, rn)
          let basepayCell = xlsxService.getCellName(6, rn)
          let basepayHourCell = params.useHourlyPay ? xlsxService.getCellName(7, rn) : undefined
          let addpay6Cell = xlsxService.getCellName(params.useHourlyPay ? 8 : 7, rn)
          let addpayNCells = []
          for (let i = 0; i < addpayCount; i++) {
            addpayNCells.push(xlsxService.getCellName(i + (params.useHourlyPay ? 9 : 8), rn))
          }
          let addpay9Cell = xlsxService.getCellName(colCount - 3, rn)
          let fundSum1Cell = xlsxService.getCellName(colCount - 1, rn)
          let fundSum12Cell = xlsxService.getCellName(colCount - 2, rn)
          let addPays = `(${params.useHourlyPay ? basepayHourCell : basepayCell}+${addpay6Cell}`
          let addPaysAll = `(${addpay6Cell}`
          for (let i = 0; i < addpayCount; i++) {
            addPays += `+${addpayNCells[i]}`
            addPaysAll += `+${addpayNCells[i]}`
          }
          addPays += `)*${qntCell}`
          addPaysAll += `)*${qntCell}`
          let sum4col9 = (row.basepay || 0) + (row.addpay6 || 0)
          for (let i = 0; i < addpayCount; i++) {
            sum4col9 += (row['addpayN' + (i + 1)] || 0)
          }
          let formula9
          let val9 = minSalarySum > sum4col9
          if (val9 > 0) {
            formula9 = `=ROUND(${minSalarySum}*${qntCell}-${addPays},2)`
          }
          let formula12 = `=ROUND(${addPaysAll} + ${addpay9Cell},2)`
          let formula10 = `=ROUND(${params.useHourlyPay ? basepayHourCell : basepayCell}*${qntCell}+${fundSum12Cell},2)`
          let formula11 = `=ROUND(${fundSum1Cell}*${monthsFop},2)`
          let nameStyle = { align: 'left' }
          if (row.nameIsRed) {
            nameStyle.font = { color: '#FF0000' }
          }
          let rowData = params.useHourlyPay
            ? [
            { content: row.indexNum },
            { content: row.text, style: nameStyle },
            { content: row.profCode, style: { align: 'center' } },
            { content: row.empCategoryName },
            { content: row.quantity },
            { content: row.basepay, style: { align: 'right', format: '#,##0.00' } },
            { content: row.basepayHour, style: { align: 'right', format: '#,##0.00' } },
            { content: row.addpay6, style: { align: 'right', format: '#,##0.00' } }
          ]
            : [
            { content: row.indexNum },
            { content: row.text, style: nameStyle },
            { content: row.profCode, style: { align: 'center' } },
            { content: row.empCategoryName },
            { content: row.quantity },
            { content: row.basepay, style: { align: 'right', format: '#,##0.00' } },
            { content: row.addpay6, style: { align: 'right', format: '#,##0.00' } }
          ]
          for (let i = 0; i < addpayCount; i++) {
            rowData.push({ content: row['addpayN' + (i + 1)], style: { align: 'right', format: '#,##0.00' } })
          }
          rowData = rowData.concat([
            { formula: formula9, style: { align: 'right', format: '#,##0.00' } },
            { formula: formula12, style: { align: 'right', format: '#,##0.00' } },
            { content: row.fundSum1, formula: formula10, style: { align: 'right', format: '#,##0.00' } },
            { content: row.fundSum2, formula: formula11, style: { align: 'right', format: '#,##0.00' } }
          ])
          addRow(rowData, row)
        }
      }
    }
  }
  return table.length
}

function addPageFooter (footer, params, rowIndex) {
  const addpayCount = params.addpayCount
  const underline = '____________________'
  const nameStyle = {}
  if (addpayCount > 0) {
    nameStyle.colSpan = 2
  }
  footer.push(getEmptyRow(params))
  footer.push(getEmptyRow(params))
  let row1Data = [
    {},
    { content: `${params.signerChiefPos || ''}` },
    {},
    {},
    { content: underline, style: { align: 'center', colSpan: 2 } },
    {},
    {},
    { content: `${params.signerChiefEmp || ''}`, style: nameStyle },
    {}
  ]
  const tailedRows = []
  for (let i = 0; i < addpayCount + (params.useHourlyPay ? 1 : 0); i++) {
    tailedRows.push({})
  }
  row1Data = row1Data.concat(tailedRows)
  footer.push(row1Data)
  footer.push(getEmptyRow(params))
  let row2Data = [
    {},
    { content: `${params.signerAccChiefPos || ''}` },
    {},
    {},
    { content: underline, style: { align: 'center', colSpan: 2 } },
    {},
    {},
    { content: `${params.signerAccChiefEmp || ''}`, style: nameStyle },
    {}
  ]
  row2Data = row2Data.concat(tailedRows)
  footer.push(row2Data)
  footer.push(getEmptyRow(params))
  let row3Data = [
    {},
    { content: `${params.signerFinPos || ''}` },
    {},
    {},
    { content: underline, style: { align: 'center', colSpan: 2 } },
    {},
    {},
    { content: `${params.signerFinEmp || ''}`, style: nameStyle },
    {}
  ]
  row3Data = row3Data.concat(tailedRows)
  footer.push(row3Data)
  footer.push(getEmptyRow(params))
  let row4Data = [
    {},
    { content: `${params.signer4EmpOrderPos || ''}` },
    {},
    {},
    { content: underline, style: { align: 'center', colSpan: 2 } },
    {},
    {},
    { content: `${params.signer4EmpOrderEmp || ''}`, style: nameStyle },
    {}
  ]
  row4Data = row4Data.concat(tailedRows)
  footer.push(row4Data)
  return footer.length
}
