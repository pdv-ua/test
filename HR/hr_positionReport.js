const UB = require('@unitybase/ub')
const App = UB.App
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const dateService = require('../AC/modules/dataServices/dateService')
const tpManager = require('../AC/modules/documentBuilder/tpManager')
const { generateBase64Str } = require('../AC/modules/dataServices/filesService')
const currencyService = require('../AC/modules/dataServices/currencyService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')

const { XLSXWorkbook } = require('@unitybase/xlsx')

me.entity.addMethod('getPositionReportData')
me.entity.addMethod('buildReport')

const calcFields = ['quantity', 'accrualSum', 'totalSum', 'fundBasePay', 'fundAddPay', 'fundOtherPay', 'fundTotal']
const nowShowFields = ['accrualSum', 'fundBasePay', 'fundAddPay', 'fundOtherPay', 'fundTotal']
const divider = '#!#!#!'

me.getPositionReportData = function (ctx) {
  const params = JSON.parse(ctx.mParams.params) || null
  let posList = []
  let hrOrg, hrDept
  const roundTo = params.roundTo === undefined ? 2 : params.roundTo
  const notShowSalary = App.domainInfo.isEntityMethodsAccessible('hr_service', 'notShowSalary') && !entityBaseService.isAdmin()

  if (params) {
    const fieldMapping = {
      'positionType': { fieldName: 'positionType.name', groupField: 'positionType.name', orderBy: 'positionType.code' },
      'dictPositionID': { fieldName: 'dictPositionID.description', groupField: 'dictPositionID.description', orderBy: 'dictPositionID.codeSort' },
      'dictProfessionID': {
        fieldName: 'dictPositionID.dictProfessionID.description',
        groupField: 'dictPositionID.dictProfessionID.description',
        orderBy: 'dictPositionID.dictProfessionID.description'
      },
      'dictCostTypeID': { fieldName: 'dictCostTypeID.description', groupField: 'dictCostTypeID.description' },
      'positionCategory': { fieldName: 'positionCategory.name', groupField: 'positionCategory.name', orderBy: 'positionCategory.code' },
      'dictStaffCatID': { fieldName: 'dictStaffCatID.description', groupField: 'dictStaffCatID.description', orderBy: 'dictStaffCatID.code' },
      'dictTarifCoeffID': { fieldName: 'dictTarifCoeffID.name', groupField: 'dictTarifCoeffID.name', orderBy: 'dictTarifCoeffID.code' },
      'dictEmpCategoryID': { fieldName: 'dictEmpCategoryID.description', groupField: 'dictEmpCategoryID.description' },
      'dictAcademStatusID': { fieldName: 'dictAcademStatusID.name', groupField: 'dictAcademStatusID.name' },
      'dictMilitaryRankID': { fieldName: 'dictMilitaryRankID.description', groupField: 'dictMilitaryRankID.description', orderBy: 'dictMilitaryRankID.code' },
      'dictMilitarySpecialityID': { fieldName: 'dictMilitarySpecialityID.description', groupField: 'dictMilitarySpecialityID.description' },
      'psCategory': { fieldName: 'psCategory.name', groupField: 'psCategory.name' },
      'dictFundSourceID': { fieldName: 'dictFundSourceID.description', groupField: 'dictFundSourceID.description' },
      'dictSalarySchemeLevelID': { fieldName: 'dictSalarySchemeLevelID.description', groupField: 'dictSalarySchemeLevelID.description' },
      'orgName': { fieldName: 'orgName', groupField: 'orgID', orderBy: 'orgName' },
      'parentUnitID': { fieldName: 'depName', groupField: ['mi_data_id', 'parentUnitID'], orderBy: 'depName' },
      'parentTreeDepName': { fieldName: 'parentTreeDepName', groupField: 'mi_treePath' },
      'workScheduleID': { fieldName: 'workScheduleID.description', groupField: 'workScheduleID.description' },
      'accountID': { fieldName: 'dictCostTypeID.accountID.description', groupField: 'dictCostTypeID.accountID.description' },
      'dictStaffSubCatID': { fieldName: 'dictStaffSubCatID.description', groupField: 'dictStaffSubCatID.description' },
      'dictPositionKindID': { fieldName: 'dictPositionKindID.description', groupField: 'dictPositionKindID.description' },
      'dictPositionGroupID': { fieldName: 'dictPositionGroupID.description', groupField: 'dictPositionGroupID.description' },
      'dictSpecialtyID': { fieldName: 'dictSpecialtyID.description', groupField: 'dictSpecialtyID.description' },
      'paymentType': { fieldName: 'paymentType.name', groupField: 'paymentType.name' },
      'payElID': { fieldName: 'payElID.description', groupField: 'payElID.description' }
    }

    const onDate = dateService.shiftDate(params.onDate)

    hrOrg = UB.Repository('hr_organization')
      .attrs('name', 'description')
      .where('mi_data_id', '=', params.organizationID)
      .where('state', '=', 'ACTIVE')
      .misc({ __mip_ondate: onDate })
      .orderBy('mi_dateFrom', 'desc')
      .selectSingle()

    let orgIDs = [params.organizationID]
    if (params.includeChildOrgs) {
      const orgs = UB.Repository('hr_organization')
        .attrs(['mi_data_id'])
        .where('state', '=', 'ACTIVE')
        .where('mi_treePath', 'like', `%/${params.organizationID}/%`)
        .groupBy('mi_data_id')
        .misc({ __mip_recordhistory_all: true })
        .selectAsObject()
      if (orgs.length) {
        orgIDs = orgs.map(o => o.mi_data_id)
      }
    }

    let deptIDs = []
    if (params.departmentID) {
      hrDept = UB.Repository('hr_department')
        .attrs(['mi_treePath', 'name', 'description'])
        .where('mi_data_id', '=', params.departmentID)
        .where('state', '=', 'ACTIVE')
        .misc({ __mip_ondate: onDate })
        .selectSingle()

      if (params.includeChildDepts && hrDept) {
        const deptList = UB.Repository('hr_department')
          .attrs(['mi_data_id', 'mi_treePath', 'name', 'description'])
          .where('orgID', 'in', orgIDs)
          .where('state', '=', 'ACTIVE')
          .where('mi_dateFrom', '<=', onDate)
          .where('mi_dateTo', '>=', onDate)
          .where('mi_treePath', 'startsWith', hrDept.mi_treePath)
          .misc({ __mip_recordhistory_all: true })
          .selectAsObject()
        if (deptList.length) {
          deptIDs = deptList.map(o => o.mi_data_id)
        } else {
          deptIDs = [params.departmentID]
        }
      } else {
        deptIDs = [params.departmentID]
      }
    }

    const fields = []
    const orderByFields = []
    const mapping = {}

    if (params.groupFields.length) {
      params.groupFields.forEach(f => {
        const fieldName = fieldMapping[f.fieldName] ? fieldMapping[f.fieldName].fieldName : f.fieldName
        fields.push(fieldName)
        if (fieldName !== f.fieldName) {
          mapping[fieldName] = f.fieldName
        }
        if (fieldMapping[f.fieldName] && fieldMapping[f.fieldName].orderBy) {
          orderByFields.push(fieldMapping[f.fieldName].orderBy)
        } else {
          orderByFields.push(fieldMapping[f.fieldName] ? fieldMapping[f.fieldName].fieldName : f.fieldName)
        }
      })
    }
    if (params.calcFOP) {
      const fopFields = ['fundBasePay', 'fundAddPay', 'fundOtherPay', 'fundTotal']
      fields.push(...fopFields)
    }
    params.reportFields.forEach(f => {
      if (f.fieldName === 'totalSum') {
        return
      }
      if (!calcFields.includes(f.fieldName)) {
        const fieldName = fieldMapping[f.fieldName] ? fieldMapping[f.fieldName].fieldName : f.fieldName
        if (!fields.includes(fieldName)) {
          fields.push(fieldName)
          if (fieldName !== f.fieldName) {
            mapping[fieldName] = f.fieldName
          }
        }
        if (fieldMapping[f.fieldName] && fieldMapping[f.fieldName].orderBy) {
          orderByFields.push(fieldMapping[f.fieldName].orderBy)
        } else {
          orderByFields.push(fieldMapping[f.fieldName] ? fieldMapping[f.fieldName].fieldName : f.fieldName)
        }
      } else {
        if (!fields.includes(f.fieldName)) {
          fields.push(f.fieldName)
        }
      }
    })
    let posQuery = UB.Repository('hr_position')
      .attrs(fields)
      .misc({
        __mip_ondate: onDate
      })
      .where('orgID', 'in', orgIDs)
      .where('state', '=', 'ACTIVE')
      .where('liquidate', '=', 0)
      .whereIf(deptIDs.length, 'parentUnitID', 'in', deptIDs)
    params.groupFields.filter(f => Boolean(f.valueID)).forEach(f => {
      if (f.fieldName === 'name') {
        posQuery = posQuery.where('name', 'like', `%${f.valueID}%`)
      } else {
        posQuery = posQuery.where(f.fieldName, 'in', String(f.valueID).split(','))
      }
    })
    orderByFields.forEach(f => {
      posQuery = posQuery.orderBy(f)
    })
    posList = posQuery.selectAsObject(mapping)
  }

  const totalFields = []
  if (params.calcFOP) {
    totalFields.push(...calcFields)
  } else {
    params.reportFields.forEach(item => {
      if (calcFields.includes(item.fieldName)) totalFields.push(item.fieldName)
    })
  }
  const reportTotals = {}
  totalFields.forEach(f => {
    reportTotals[f] = 0
  })
  posList.forEach(row => {
    if (notShowSalary) {
      nowShowFields.forEach(f => {
        if (row[f]) row[f] = 0
      })
    }
    row.totalSum = currencyService.round((row.quantity || 0) * (row.accrualSum || 0), roundTo)
    calcFields.forEach(f => {
      if (f !== 'quantity') row[f] = currencyService.round(row[f] || 0, roundTo)
    })
    totalFields.forEach(f => {
      reportTotals[f] += row[f] || 0
    })
  })
  const groupTotals = {}
  let prevValue
  let curValue
  params.groupFields.forEach((grp, idx) => {
    posList.forEach(row => {
      curValue = getGroupValue(row, params.groupFields, idx)
      if (prevValue !== curValue) {
        groupTotals[curValue] = {
          caption: row[grp.fieldName],
          level: idx,
          groupName: grp.caption,
          items: [Object.assign({}, row)]
        }
        totalFields.forEach(f => {
          groupTotals[curValue][f] = row[f] || 0
        })
        prevValue = curValue
      } else {
        if (prevValue) {
          totalFields.forEach(f => {
            groupTotals[prevValue][f] += row[f] || 0
          })
          groupTotals[prevValue].items.push(Object.assign({}, row))
        }
      }
    })
  })
  const resultData = {
    posList,
    totalFields,
    groupTotals,
    reportTotals,
    organizationName: hrOrg ? hrOrg.description : '',
    departmentName: hrDept ? hrDept.description : ''
  }
  ctx.mParams.resultData = JSON.stringify(resultData)
  return resultData
}

me.buildReport = function (ctx) {
  const data = me.getPositionReportData(ctx)
  const params = JSON.parse(ctx.mParams.params) || null
  if (params) {
    const reportParams = {
      onDate: dateService.shiftDate(params.onDate),
      organizationName: data.organizationName,
      departmentName: data.departmentName || [],
      includeChildOrgs: params.includeChildOrgs,
      includeChildDepts: params.includeChildDepts,
      reportFields: params.reportFields || [],
      groupFields: params.groupFields
    }
    const doc = new tpManager(getConfig(reportParams), 'xlsx')
    writeDocument(doc, data, reportParams)
    const result = doc.getDocument()
    ctx.mParams.response = JSON.stringify(generateBase64Str(result))
  }
}

function writeDocument (doc, data, params) {
  const table = []
  const wb = new XLSXWorkbook()
  const fillBG = wb.style.fills.add({ fgColor: { rgb: 'F0F0F0' } })
  const decimalFormat = '#,##0.00_ '
  const levelStyleFill = [
    wb.style.fills.add({ fgColor: { rgb: '909090' } }),
    wb.style.fills.add({ fgColor: { rgb: '999999' } }),
    wb.style.fills.add({ fgColor: { rgb: 'AEAEAE' } }),
    wb.style.fills.add({ fgColor: { rgb: 'BFBFBF' } }),
    wb.style.fills.add({ fgColor: { rgb: 'D9D9D9' } }),
    wb.style.fills.add({ fgColor: { rgb: 'FCFCFC' } })
  ]

  const colSpanHead = params.reportFields.length - 1
  const colSpanBody = Math.max(params.reportFields.length, 1)

  table.push([
    { content: `${UB.i18n('Оформлено')}:`, style: { font: { size: 12, type: 'Normal' }, align: 'right' } },
    { content: dateService.formatDate(dateService.currentDate(), 'dd.mm.yyyy hh:nn:ss'), style: { font: { size: 12, type: 'Normal' }, align: 'left', colSpan: colSpanHead } }
  ])

  const organizationName = params.organizationName + (params.includeChildOrgs ? ' ' + UB.i18n('(з підлеглими)') : '')
  table.push([
    { content: `${UB.i18n('Організація')}:`, style: { font: { size: 12, type: 'Normal' }, align: 'right' } },
    { content: organizationName, style: { font: { size: 12, type: 'Normal' }, align: 'left', colSpan: colSpanHead } }
  ])
  if (params.departmentName) {
    const departmentName = params.departmentName + (params.includeChildDepts ? ' ' + UB.i18n('(з підлеглими)') : '')
    table.push([
      { content: `${UB.i18n('Підрозділ')}:`, style: { font: { size: 12, type: 'Normal' }, align: 'right' } },
      { content: departmentName, style: { font: { size: 12, type: 'Normal' }, align: 'left', colSpan: colSpanHead } }
    ])
  }
  table.push([
    { content: '', style: { font: { size: 12, type: 'Normal' }, align: 'left', colSpan: colSpanBody } }
  ])
  params.groupFields.forEach(row => {
    table.push([
      { content: `${row.caption}:`, style: { font: { size: 12, type: 'Normal' }, align: 'right' } },
      { content: row.valueName, style: { font: { size: 12, type: 'Normal' }, align: 'left', colSpan: colSpanHead } }
    ])
  })
  table.push([
    { content: UB.i18n('Станом на'), style: { font: { size: 12, type: 'Normal' }, align: 'right' } },
    { content: dateService.formatDate(params.onDate), style: { font: { size: 12, type: 'Normal' }, align: 'left', colSpan: colSpanHead } }
  ])
  table.push([
    { content: '', style: { font: { size: 12, type: 'Normal' }, align: 'left', colSpan: colSpanBody } }
  ])
  const tableHeaderColumns = []
  params.reportFields.forEach(item => {
    tableHeaderColumns.push({ content: item.caption, style: { fill: fillBG, font: { size: 12, type: 'Bold' }, align: 'center' } })
  })
  table.push(tableHeaderColumns)

  const colSpanGroup = colSpanBody - data.totalFields.length

  if (params.groupFields.length) {
    const maxLevel = params.groupFields.length
    const outGroupTotal = function (value, level) {
      if (level === maxLevel) return
      Object.keys(data.groupTotals).forEach(item => {
        if (data.groupTotals[item].level === level && (!value || item.startsWith(value))) {
          const caption = '   '.repeat(level) + data.groupTotals[item].groupName + ': ' + (data.groupTotals[item].caption || '-')
          const totalRow = [
            {
              content: caption,
              style: { fill: levelStyleFill[level], font: { size: 12, type: 'Bold' }, align: 'left', colSpan: colSpanGroup }
            }
          ]
          data.totalFields.forEach(f => {
            if (f === 'accrualSum') {
              totalRow.push({
                content: '-',
                style: {
                  fill: levelStyleFill[level],
                  font: { size: 12, type: 'Bold' },
                  align: 'center'
                }
              })
            } else {
              totalRow.push({
                content: data.groupTotals[item][f],
                style: {
                  fill: levelStyleFill[level],
                  font: { size: 12, type: 'Bold' },
                  align: 'right',
                  format: decimalFormat
                }
              })
            }
          })
          table.push(totalRow)
          if (level !== maxLevel - 1) {
            outGroupTotal(item + divider, level + 1)
          } else {
            data.groupTotals[item].items.forEach(row => {
              const tableRow = []
              params.reportFields.forEach(item => {
                if (calcFields.includes(item.fieldName)) {
                  tableRow.push(
                    {
                      content: row[item.fieldName],
                      style: { font: { size: 12, type: 'Normal' }, align: 'right', format: decimalFormat }
                    }
                  )
                } else {
                  tableRow.push(
                    { content: row[item.fieldName], style: { font: { size: 12, type: 'Normal' }, align: 'left' } }
                  )
                }
              })
              table.push(tableRow)
            })
          }
        }
      })
    }
    outGroupTotal(null, 0)
  } else {
    data.posList.forEach(row => {
      const tableRow = []
      params.reportFields.forEach(item => {
        if (calcFields.includes(item.fieldName)) {
          tableRow.push({ content: row[item.fieldName], style: { font: { size: 12, type: 'Normal' }, align: 'right', format: decimalFormat } })
        } else {
          tableRow.push({ content: row[item.fieldName], style: { font: { size: 12, type: 'Normal' }, align: 'left' } })
        }
      })
      table.push(tableRow)
    })
  }
  const totalRow = [
    { content: UB.i18n('Разом'), style: { fill: fillBG, font: { size: 12, type: 'Bold' }, align: 'left', colSpan: colSpanGroup } }
  ]
  data.totalFields.forEach(f => {
    if (f === 'accrualSum') {
      totalRow.push({
        content: '-',
        style: { fill: fillBG, font: { size: 12, type: 'Bold' }, align: 'center' }
      })
    } else {
      totalRow.push({
        content: data.reportTotals[f],
        style: { fill: fillBG, font: { size: 12, type: 'Bold' }, align: 'right', format: decimalFormat }
      })
    }
  })
  table.push(totalRow)
  doc.table(table, 'tableBody')
}

function getGroupValue (row, groupFields, level) {
  const values = []
  for (let i = 0; i <= level; i++) {
    values.push(row[groupFields[i].fieldName] || 'null')
  }
  return values.join(divider)
}

function getConfig (params) {
  return {
    'document': {
      margin: {
        top: 10,
        right: 8,
        bottom: 8,
        left: 20
      },
      orientation: 'l',
      bottomColontitle: {
        font: {
          name: 'TimesNewRoman',
          type: 'Normal',
          size: 12
        },
        height: 8
      }
    },
    tableBody: {
      orientation: 'l',
      title: '',
      font: {
        name: 'TimesNewRoman',
        size: 12
      },
      border: {
        left: 0.5,
        top: 0.5,
        bottom: 0.5,
        right: 0.5
      },
      align: 'center',
      verticalAlign: 'top',
      columns: {
        hStretch: true,
        config: params.reportFields.length ? params.reportFields.map(item => ({ width: 17 })) : [{ width: 17 }]
      }
    }
  }
}
