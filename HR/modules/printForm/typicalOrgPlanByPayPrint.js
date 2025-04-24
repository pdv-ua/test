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
  params.colCount = 11
  const colConf = [{ width: 4 }, { width: 32 }, { width: 12 }, { width: 9 }, { width: 10 }, { width: 10 }, { width: 10 },
    { width: 10 }, { width: 10 }, { width: 12 }, { width: 18 }]
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

function getEmptyRow (params) {
  let res = []
  for (let i = 0; i < params.colCount; i++) {
    res.push({ content: '' })
  }
  return res
}

function addPageHeader (header, params) {
  const underlinedCell = { content: '', style: { border: { bottom: 0.5 } } }
  header.push([{}, {}, {}, {}, {}, {}, { content: 'Наказ Міністерства фінансів України', style: { colSpan: 5 } }])
  header.push([{}, {}, {}, {}, {}, {}, { content: 'від 28.01.2002р. №57 (у редакції наказу Міністерства фінансів України', style: { colSpan: 5 } }])
  header.push([{}, {}, {}, {}, {}, {}, { content: 'від 26.11.2012 №1220', style: { colSpan: 5 } }])
  header.push([{}, {}, {}, {}, {}, {}, { content: 'ЗАТВЕРДЖУЮ', style: { font: { type: 'Bold', size: 12 }, colSpan: 5 } }])
  header.push([{}, {}, {}, {}, {}, {}, { content: 'штат у кількості', style: { font: { type: 'Bold' }, colSpan: 2 } },
    { content: `${params.quantity || ''}`, style: { font: { type: 'Bold' } } }, { content: 'штатних одиниць', style: { font: { type: 'Bold' }, colSpan: 2 } }])
  header.push([{}, {}, {}, {}, {}, {}, { content: 'з місячним фондом заробітної плати', style: { colSpan: 5 } }])
  header.push([{}, {}, {}, {}, {}, {}, {}, { content: `${params.fundSum1 || ''}`, style: { align: 'right', font: { type: 'Bold' }, colSpan: 2, format: '#,##0.00' } },
    { content: 'гривень', style: { font: { type: 'Bold' } } }])
  header.push([{ style: { height: 24 } }, {}, {}, {}, {}, {}, { content: `${params.fundSum1InWords || ''}`, style: { font: { type: 'Bold' }, colSpan: 5 } }])
  header.push([{}, {}, {}, {}, {}, {}, { content: `${params.chiefPosName || ''}`, style: { colSpan: 5 } }])
  header.push([{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}])
  header.push([{}, {}, {}, {}, {}, {}, underlinedCell, {}, { content: `${params.chiefPib || ''}`, style: { colSpan: 3 } }])
  header.push([{}, {}, {}, {}, {}, {}, { content: `${params.onDateStr || ''}` }, {}, {}, {}, { content: 'М.П.', style: { align: 'right', font: { type: 'Bold' } } }])
  header.push([{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}])

  header.push([{ content: UB.i18n(`ШТАТНИЙ РОЗПИС на {0} рік`, params.year), style: { align: 'center', font: { type: 'Bold', size: 12 }, colSpan: params.colCount } }])
  header.push([{ content: `${params.orgName}`, style: { align: 'center', font: { type: 'Bold', size: 12 }, colSpan: params.colCount } }])
  if (params.structDepName) {
    header.push([{ content: `${params.structDepName}`, style: { align: 'center', font: { type: 'Bold', size: 12 }, colSpan: params.colCount } }])
  }
  if (params.childDepName) {
    header.push([{ content: `${params.childDepName}`, style: { align: 'center', font: { type: 'Bold', size: 12 }, colSpan: params.colCount } }])
  }
  if (params.progClassName) {
    header.push([{ content: `${params.progClassName || ''}`, style: { align: 'center', font: { type: 'Bold' }, colSpan: params.colCount } }])
  }
  header.push([{ content: 'Загальний фонд (спеціальний фонд)', style: { align: 'center', font: { type: 'Bold', size: 12 }, colSpan: params.colCount } }])
  header.push([{}, {}, {}, {}, {}, {}, {}, {}, { content: 'Уводиться з ________________ 20___ року', style: { colSpan: 3 } }])
  header.push([{}, {}, {}, {}, {}, {}, {}, {}, {}, { content: '(число, місяць, рік)', style: { colSpan: 2 } }])

  header.push(getEmptyRow(params))
  return header.length
}

function addTableHeaders (table, params) {
  table.push([
    { content: '№ з/п', style: { rowSpan: 2, height: 22 } },
    { content: 'Назва посади та структурного\nпідрозділу та посад', style: { rowSpan: 2 } },
    { content: 'Код НКУ "Класифікатор профеій" ДК003:2010', style: { rowSpan: 2 } },
    { content: 'Кількість штатних посад', style: { rowSpan: 2 } },
    { content: 'Посадовий оклад (грн.)', style: { rowSpan: 2 } },
    { content: 'Надбавки (грн.)', style: { colSpan: 2 } },
    { content: 'Доплати (грн.)', style: { colSpan: 2, rowSpan: 2 } },
    { content: 'Фонд заробітної плати на місяць (грн.)', style: { rowSpan: 2 } },
    { content: UB.i18n(`Фонд заробітної плати на {0} рік / з {1} до {2} (грн.)**`, params.year, dateService.formatDate(params.onDate), dateService.formatDate(params.toDate)), style: { rowSpan: 2 } }
  ])
  table.push([
    { content: '' },
    { content: 'стаж' }
  ])
  return table.length
}

function addColNums (table, params) {
  let colNumHeader = []
  let colNumHeaderCell = { style: { font: { size: 8 }, height: 12 } }
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

  currIdx += addColNums(table, params)

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
          let totalContentCell = { content: row.name, style: { align: 'left', colSpan: 3 } }
          let formula4
          let formula10
          let formula11
          if (!row.isCatTotal) {
            totalContentCell.style.font = { type: 'Bold' }
            let totalDept = depts.find(dept => dept.mi_data_id === row.mi_data_id)
            if (totalDept) {
              totalDept.end = currIdx
              formula4 = getSumFormula(4, totalDept.beg, totalDept.end)
              formula10 = getSumFormula(10, totalDept.beg, totalDept.end)
              formula11 = getSumFormula(11, totalDept.beg, totalDept.end)
            }
          }
          if (!row.isCatTotal && row.level <= 2) {
            totalContentCell.style.height = 36
          }
          addRow([
            totalContentCell,
            { content: row.quantity, formula: formula4, style: { font: totalContentCell.style.font } },
            {}, {}, {}, {}, {},
            { content: row.fundSum1, formula: formula10, style: { font: totalContentCell.style.font, align: 'right', format: '#,##0.00' } },
            { content: row.fundSum2, formula: formula11, style: { font: totalContentCell.style.font, align: 'right', format: '#,##0.00' } }
          ], row)
        } else {
          let rn = currIdx
          let formula9
          let qntCell = xlsxService.getCellName(4, rn)
          let basepayCell = xlsxService.getCellName(5, rn)
          let addpay6Cell = xlsxService.getCellName(6, rn)
          let addpay7Cell = xlsxService.getCellName(7, rn)
          let addpay8Cell = xlsxService.getCellName(8, rn)
          let addpay9Cell = xlsxService.getCellName(9, rn)
          let fundSum1Cell = xlsxService.getCellName(10, rn)
          let addPays = `(${basepayCell}+${addpay6Cell}+${addpay7Cell}+${addpay8Cell})*${qntCell}`
          let val9 = minSalarySum > ((row.basepay || 0) + (row.addpay6 || 0) + (row.addpay7 || 0) + (row.addpay8 || 0))
          if (val9 > 0) {
            formula9 = `=ROUND(${minSalarySum}*${qntCell}-${addPays},2)`
          }
          let formula10 = `=ROUND(${addPays}+${addpay9Cell},2)`
          let formula11 = `=ROUND(${fundSum1Cell}*${monthsFop},2)`
          let nameStyle = { align: 'left' }
          if (row.nameIsRed) {
            nameStyle.font = { color: '#FF0000' }
          }
          addRow([
            { content: row.indexNum },
            { content: row.text, style: nameStyle },
            { content: row.profCode, style: { align: 'center' } },
            { content: row.quantity },
            { content: row.basepay, style: { align: 'right', format: '#,##0.00' } },
            { content: row.addpay6, style: { align: 'right', format: '#,##0.00' } },
            { content: row.addpay7, style: { align: 'right', format: '#,##0.00' } },
            { content: row.addpay8, style: { align: 'right', format: '#,##0.00' } },
            { formula: formula9, style: { align: 'right', format: '#,##0.00' } },
            { content: row.fundSum1, formula: formula10, style: { align: 'right', format: '#,##0.00' } },
            { content: row.fundSum2, formula: formula11, style: { align: 'right', format: '#,##0.00' } }
          ], row)
        }
      }
    }
  }
  return table.length
}

function addPageFooter (footer, params, rowIndex) {
  footer.push(getEmptyRow(params))
  footer.push(getEmptyRow(params))
  footer.push([
    {},
    { content: `${params.signerChiefPos || ''}` },
    {},
    {},
    { content: '____________________', style: { align: 'center', colSpan: 2 } },
    {},
    {},
    {},
    { content: `${params.signerChiefEmp || ''}`, style: { colSpan: 2 } }
  ])
  footer.push(getEmptyRow(params))
  footer.push([
    {},
    { content: `${params.signerAccChiefPos || ''}` },
    {},
    {},
    { content: '____________________', style: { align: 'center', colSpan: 2 } },
    {},
    {},
    {},
    { content: `${params.signerAccChiefEmp || ''}`, style: { colSpan: 2 } }
  ])
  footer.push(getEmptyRow(params))
  footer.push([
    {},
    { content: `${params.signer4EmpOrderPos || ''}` },
    {},
    {},
    { content: '____________________', style: { align: 'center', colSpan: 2 } },
    {},
    {},
    {},
    { content: `${params.signer4EmpOrderEmp || ''}`, style: { colSpan: 2 } }
  ])
  return footer.length
}
