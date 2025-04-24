/* global UB */
const TPManager = require('../../../AC/modules/documentBuilder/tpManager')
const dateService = require('../../../AC/modules/dataServices/dateService')
const xlsxService = require('../../../AC/modules/documentBuilder/xlsxService')
const currencyService = require('../../../AC/public/core/currencyService')

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

  const colConf = [{ width: 4 }, { width: 36 }, { width: 12 }, { width: 12 }, { width: 9 }, { width: 10 }]
  if (params.useHourlyPay) {
    colConf.push({ width: 12 })
  }

  for (let i = 0; i < addpayCount; i++) {
    colConf.push({ width: 10 })
  }

  colConf.push({ width: 16 })
  colConf.push({ width: 22 })

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

  addPageFooter(footer, params)
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
  if (!params.planPayrollFund) {
    header.push(emptyCells.concat([{
      content: 'Наказ Міністерства фінансів України',
      style: { colSpan: rightColCount }
    }]))
    header.push(emptyCells.concat([{
      content: 'від 28.01.2002р. №57 (у редакції наказу Міністерства фінансів України',
      style: { colSpan: rightColCount }
    }]))
    header.push(emptyCells.concat([{ content: 'від 26.11.2012 №1220', style: { colSpan: rightColCount } }]))
  }
  header.push(emptyCells.concat([{ content: 'ЗАТВЕРДЖУЮ', style: { font: { type: 'Bold', size: 12 }, colSpan: rightColCount } }]))
  header.push(emptyCells.concat([{ content: 'штат у кількості', style: { colSpan: 2 } },
    { content: `${params.quantity || ''}` }, { content: 'штатних одиниць', style: { colSpan: 2 } }]))
  header.push(emptyCells.concat([{ content: 'з місячним фондом заробітної плати', style: { colSpan: rightColCount } }]))
  header.push(emptyCells.concat([{ content: `${params.fundSum1 || ''}`, style: { align: 'right', colSpan: 2, format: '#,##0.00' } },
    { content: 'гривень', style: { font: { type: 'Bold' } } }]))
  header.push(emptyCells.concat([{ content: `${params.fundSum1InWords || ''}`, style: { colSpan: rightColCount } }]))
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
  const row = [
    { content: '№ з/п', style: { height: 84 } },
    { content: 'Назва посади та структурного\nпідрозділу та посад' },
    { content: 'Категорія' },
    { content: 'Код НКУ "Класифікатор професій" ДК 003:2010' },
    { content: 'Кількість штатних посад' },
    { content: 'Посадовий оклад (грн.)' }
  ]
  if (params.useHourlyPay) {
    row.push({ content: 'Оклад за місяць (грн.)' })
  }
  for (let i = 0; i < params.accNames.length; i++) {
    row.push({ content: params.accNames[i].name })
  }

  row.push({ content: 'Фонд заробітної плати на місяць (грн.)' })
  row.push({ content: UB.i18n(`Фонд заробітної плати на {0} рік / з {1} до {2} (грн.)**`, params.year, dateService.formatDate(params.onDate), dateService.formatDate(params.toDate)) })

  table.push(row)
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
  // const groupBy = params.groupBy
  const depts = []
  const rangesCache = {}
  // const minSalarySum = params.minSalarySum || 0
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
        let depRow = { content: row.name, style: { align: 'left', font: { type: 'Bold', size: 12 }, colSpan: params.colCount } }
        if (row.level === 1) {
          depRow.style.font.color = '#0000FF'
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
          let formulaQ
          let formulaFS1
          let formulaFS2

          let formulaAccValues = []
          for (let i = 0; i < addpayCount; i++) {
            formulaAccValues.push({ formula: null })
          }

          if (!row.isCatTotal) {
            totalContentCell.style.font = { type: 'Bold' }

            let totalDept = depts.find(dept => dept.mi_data_id === row.mi_data_id)
            if (totalDept) {
              totalDept.end = currIdx
              formulaQ = getSumFormula(5, totalDept.beg, totalDept.end)

              formulaFS1 = getSumFormula(colCount - 1, totalDept.beg, totalDept.end)
              formulaFS2 = getSumFormula(colCount, totalDept.beg, totalDept.end)

              for (let i = 0; i < addpayCount; i++) {
                formulaAccValues[i].formula = getSumFormula(6 + (params.useHourlyPay ? 1 : 0) + i + 1, totalDept.beg, totalDept.end)
              }
            }
          }
          if (!row.isCatTotal && row.level <= 2) {
            totalContentCell.style.height = 36
          }
          let totalRow = [
            totalContentCell,
            { content: row.quantity, formula: formulaQ, style: { font: totalContentCell.style.font } },
            { content: row.basepay, style: { font: totalContentCell.style.font, align: 'right', format: '#,##0.00' } },
          ]
          if (params.useHourlyPay) {
            totalRow.push({ content: row.basepayHour, style: { font: totalContentCell.style.font, align: 'right', format: '#,##0.00' } })
          }

          for (let i = 0; i < addpayCount; i++) {
            totalRow.push({ content: row.accValues[i].value, formula: formulaAccValues[i].formula, style: { font: totalContentCell.style.font, align: 'right', format: '#,##0.00' } })
          }

          totalRow.push({ content: row.fundSum1, formula: formulaFS1, style: { font: totalContentCell.style.font, align: 'right', format: '#,##0.00' } })
          totalRow.push({ content: row.fundSum2, formula: formulaFS2, style: { font: totalContentCell.style.font, align: 'right', format: '#,##0.00' } })

          addRow(totalRow, row)
        } else {
          let rn = currIdx
          let qntCell = xlsxService.getCellName(5, rn)
          let basepayCell = xlsxService.getCellName(params.useHourlyPay ? 7 : 6, rn)
          let summaTypeO = []
          let summaTypeM = []
          let summaTypeD = []

          for (let i = 0; i < addpayCount; i++) {
            if (row.accValues[i].minPay) {
              summaTypeM.push(xlsxService.getCellName((params.useHourlyPay ? 7 : 6) + i + 1, rn))
            }
            if (row.catCode2) {
              if (!row.accValues[i].minPay) {
                summaTypeO.push(xlsxService.getCellName((params.useHourlyPay ? 7 : 6) + i + 1, rn))
              }
            } else {
              if (!row.accValues[i].minPay && !row.accValues[i].dezPay) {
                summaTypeO.push(xlsxService.getCellName((params.useHourlyPay ? 7 : 6) + i + 1, rn))
              }
              if (row.accValues[i].dezPay) {
                summaTypeD.push(xlsxService.getCellName((params.useHourlyPay ? 7 : 6) + i + 1, rn))
              }
            }
          }

          summaTypeO = summaTypeO.length ? summaTypeO.join('+') : ''
          summaTypeM = summaTypeM.length ? summaTypeM.join('+') : ''
          summaTypeD = summaTypeD.length ? summaTypeD.join('+') : ''
          /*
          let formulaFS1 = `=ROUND((${basepayCell}${summaTypeO ? '+' + summaTypeO : ''})*${qntCell}, 2)` +
          `${summaTypeM ? '+' + summaTypeM : ''}` +
          `${summaTypeD ? '+ROUND((' + summaTypeD + ')*' + qntCell + ', 2)' : ''}`
           */
          let formulaFS1 = `=ROUND(${basepayCell}*${qntCell}, 2)${summaTypeO ? '+' + summaTypeO : ''}` +
          `${summaTypeM ? '+' + summaTypeM : ''}` +
          `${summaTypeD ? '+' + summaTypeD : ''}`

          if (row.fundSum1_delta) {
            formulaFS1 += '+' + currencyService.formatAsCurrency(row.fundSum1_delta, 2, '.')
          }

          let fundSum1Cell = xlsxService.getCellName(colCount - 1, rn)
          let formulaFS2 = `=ROUND(${fundSum1Cell}*${monthsFop},2)`
          let nameStyle = { align: 'left' }

          if (row.nameIsRed) {
            nameStyle.font = { color: '#FF0000' }
          }

          const rowData = [
            { content: row.indexNum },
            { content: row.text, style: nameStyle },
            { content: row.profCode, style: { align: 'center' } },
            { content: row.empCategoryName },
            { content: row.quantity },
            { content: row.basepay, style: { align: 'right', format: '#,##0.00' } }
          ]
          if (params.useHourlyPay) {
            rowData.push({ content: row.basepayHour, style: { align: 'right', format: '#,##0.00' } })
          }

          for (let i = 0; i < addpayCount; i++) {
            rowData.push({ content: row.accValues[i].value, /* formula: formulaAccValues[i].formula, */ style: { align: 'right', format: '#,##0.00' } })
          }

          rowData.push({ content: row.fundSum1, formula: formulaFS1, style: { align: 'right', format: '#,##0.00' } })
          rowData.push({ content: row.fundSum2, formula: formulaFS2, style: { align: 'right', format: '#,##0.00' } })
          addRow(rowData, row)
        }
      }
    }
  }
  return table.length
}

function addPageFooter (footer, params) {
  const underline = '____________'
  footer.push(getEmptyRow(params))

  params.signerInfo.forEach(elem => {
    footer.push(getEmptyRow(params))
    const rowData = [
      {},
      { content: elem.pos },
      {},
      { content: underline, style: { align: 'center' } },
      {},
      { content: elem.name, style: { colSpan: 2 } },
      {}
    ]
    for (let i = 0; i < params.addSColCount; i++) {
      rowData.push({})
    }
    footer.push(rowData)
  })

  return footer.length
}
