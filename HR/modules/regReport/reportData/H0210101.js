const UB = require('@unitybase/ub')
const _ = require('lodash')
const { structureReport, setDataProps, setMainData, getCellSettings, createDeclarAt, buildAttrsExt, createDeclarExt } = require('../../../../AC/modules/regReport/index')
const dateService = require('../../../../AC/modules/dataServices/dateService')
const { updateCellInArray } = require('../../../../AC/modules/regReport/taxInvoice')
const reportService = require('../../../../HR/modules/reportService')
const entityBaseService = require('../../../../AC/modules/entityServices/entityBaseService')
const stringService = require('../../../../AC/modules/dataServices/stringService')

module.exports = {
  generateData,
  exportConfig: ['xml'],
  xmlExport
}

function generateData (params = {}) {
  const errorMessages = []
  const data = structureReport()
  prepareStructureReport(data)
  const { DECLARBODY, DECLARHEAD, PARAMS } = data.DECLAR

  setDataProps({ data: DECLARBODY, source: params })
  setDataProps({ data: DECLARHEAD, source: params })
  params.C_DOC_STAN = DECLARHEAD.C_DOC_STAN
  params.C_DOC_TYPE = DECLARHEAD.C_DOC_TYPE
  params.C_RAJ = DECLARHEAD.C_RAJ
  params.C_REG = DECLARHEAD.C_REG
  setMainData({ data, params })
  prepareQueryParams({ data, params })

  addTempleteForCustomRow(PARAMS)
  data.cellSettings = getCellSettings(params.repConfig.dictRepID)
  prepareDataSpecific({ data, params })

  return { data, errorMessages }
}

const allHeadAttrNames = ['TIN', 'C_DOC', 'C_DOC_SUB', 'C_DOC_VER', 'C_DOC_TYPE', 'C_DOC_CNT', 'C_REG', 'C_RAJ', 'PERIOD_MONTH', 'PERIOD_TYPE', 'PERIOD_YEAR', 'D_FILL', 'SOFTWARE']

const allBodyAttrNames = [
  'HZY', 'FIRM_ADR', 'FIRM_ADR_FIZ', 'EDRPOU', 'FIRM_NAME', 'FIRM_SPATO', 'REP_NYEAR', 'REP_PERNM', 'MY_DATE', 'FIRM_KVED',
  'A2010_1', 'A2020_1', 'A2030_1', 'A2040_1', 'A2050_1', 'OBL', 'RAY', 'A2000',
  'REP_PER1', 'MY_DATE', 'S1_1', 'SPATO', 'KVED', 'N1', 'PERIOD', 'VIK', 'VIK_TEL', 'VIK_EMAIL', 'KVED1', 'REASON', 'CAPTION', 'MFO', 'ACCOUNT',
  'KOATUU', 'KVED', 'ONPR', 'KOPFD', 'DATES4', 'FULLFIO'
]
function prepareStructureReport (data) {
  const cellNames = allBodyAttrNames
  data.DECLAR['$'] = {
    'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
    'xsi:noNamespaceSchemaLocation': 'H0210101.xsd'
  }
  data.DECLAR.DECLARHEAD.C_DOC_STAN = 1
  data.DECLAR.DECLARHEAD.C_DOC_TYPE = 0
  delete data.DECLAR.DECLARHEAD.C_STI_ORIG
  delete data.DECLAR.DECLARHEAD.LINKED_DOCS

  const excludeCell = Object.keys(data.DECLAR.DECLARBODY).filter(cName => cellNames.indexOf(cName) < 0)
  excludeCell.forEach(cName => {
    delete data.DECLAR.DECLARBODY[cName]
  })
  cellNames.forEach(cName => {
    data.DECLAR.DECLARBODY[cName] = null
  })
}

function prepareQueryParams ({ data, params }) {
  params.dateFrom = new Date(Date.UTC(data.DECLAR.DECLARHEAD.PERIOD_YEAR, data.DECLAR.DECLARHEAD.PERIOD_MONTH - 1, 1, 0, 0, 0, 0))
  params.dateTo = dateService.lastDayOfMonth(params.dateFrom)
}

function prepareDataSpecific ({ data, params }) {
  const sqlDialect = entityBaseService.getSQLDialect()
  const { DECLARHEAD, DECLARBODY } = data.DECLAR

  DECLARHEAD.C_REG = params.C_REG
  DECLARHEAD.C_RAJ = params.C_RAJ

  let paramDateFrom = dateService.shiftDate(params.dateFrom)

  const infoByAcc = UB.Repository('hr_payObligatory')
    .attrs(['orgAccountID.bankID.MFO', 'orgAccountID.bankID.name', 'orgAccountID.code'])
    .where(['organizationID'], '=', params.organizationID)
    .where(['type'], '=', '3')
    .limit(1)
    .selectSingle() || {}

  DECLARBODY.CAPTION = infoByAcc['orgAccountID.bankID.name']
  DECLARBODY.MFO = infoByAcc['orgAccountID.bankID.MFO']
  DECLARBODY.ACCOUNT = infoByAcc['orgAccountID.code']

  const respCode = UB.Repository('hr_organization')
    .attrs(['EDRPOUCode', 'hkoatuu', 'hkved', 'dgoznNpr', 'hkopfg'])
    .where('mi_data_id', '=', params.organizationID)
    .where('state', '=', 'ACTIVE')
    .limit(1)
    .selectSingle() || {}

  DECLARBODY.EDRPOU = respCode['EDRPOUCode']
  DECLARBODY.KOATUU = respCode['hkoatuu']
  DECLARBODY.KVED = respCode['hkved']
  DECLARBODY.ONPR = respCode['dgoznNpr']
  DECLARBODY.KOPFD = respCode['hkopfg']
  DECLARBODY.FFINANCE = 1

  const orgAddress = UB.Repository('ac_address')
    .attrs(['address'])
    .where('ownerID', '=', params.organizationID)
    .where('addressType', '=', '1')
    .limit(1)
    .selectSingle() || {}

  DECLARBODY.REP_PERNM = DECLARHEAD.PERIOD + ' ' + DECLARHEAD.PERIOD_YEAR
  DECLARBODY.FIRM_NAME = DECLARBODY.HNAME
  DECLARBODY.FIRM_ADR = DECLARBODY.HLOC
  DECLARBODY.FIRM_ADR_FIZ = orgAddress.address || DECLARBODY.FIRM_ADR
  DECLARBODY.KVED = DECLARBODY.HKVED
  DECLARBODY.SPATO = DECLARBODY.HKOATUU_S

  if (DECLARHEAD.PERIOD_MONTH === 12) {
    DECLARBODY.REP_PER1 = 1
    DECLARBODY.REP_NYEAR = DECLARHEAD.PERIOD_YEAR + 1
  } else {
    DECLARBODY.REP_PER1 = DECLARHEAD.PERIOD_MONTH + 1
    DECLARBODY.REP_NYEAR = DECLARHEAD.PERIOD_YEAR
  }
  DECLARBODY.REP_PER1 = DECLARBODY.MY_DATE = dateService.formatDate(dateService.addMonths(paramDateFrom, 1), 'd mmm')

  const bos = (params.bosID) ? UB.Repository('hr_employeeNumberS').attrs(['employeeID.shortFIO', 'employeeID.taxCode', 'employeeID', 'employeeID.phoneWorking']).selectById(params.bosID) : {}
  if (bos['employeeID']) {
    UB.Repository('hr_employeeContact')
      .attrs(['value', 'contactTypeID.code'])
      .where('employeeID', '=', bos['employeeID'])
      .where('contactTypeID.code', '=', 'email')
      .selectAsObject()
      .forEach(contact => { bos[contact['contactTypeID.code']] = contact.value })
  }
  DECLARBODY.VIK = bos['employeeID.shortFIO']
  DECLARBODY.VIK_TEL = bos['employeeID.phoneWorking']
  DECLARBODY.VIK_EMAIL = bos['email']
  DECLARBODY.PERIOD = params.yearOfCurrentPeriod

  const reportParams = reportService.getReportParams(params.organizationID, [ 'listChild' ])

  const dateTo = dateService.shiftDate(params.dateTo)

  const organiozations = params.includeSubOrg
    ? UB.Repository('hr_organization')
      .attrs(['mi_data_id'])
      .where('state', '=', 'ACTIVE')
      .where('mi_treePath', 'like', `%/${params.organizationID}/%`)
      .where('mi_dateFrom', '<=', params.dateTo)
      .where('mi_dateTo', '>=', params.dateTo)
      .groupBy('mi_data_id')
      .misc({ __mip_recordhistory_all: true })
      .selectAsObject().map(o => o.mi_data_id)
    : [params.organizationID]
  const resultData = []
  const store = UB.DataStore('hr_employeePosition')
  organiozations.forEach((orgID) => {
    store.runSQL(`SELECT n.employeeID "employeeID", e.fullFIO "fullFIO", e.birthDate "birthDate", o.orderDate "orderDate", o.orderNumber "orderNumber",
                  g.orderNumber "gOrderNumber", g.orderDate "gOrderDate", g.addGuarant "addGuarant", n.parentEmpNumberID "parentEmpNumberID", n.ID "employeeNumberID"
                  FROM hr_employeeNumber n
                    JOIN hr_empAddGuarantees g ON n.employeeID = g.employeeID AND g.dateFrom <= :dateTo:
                    AND g.dateTo >= :dateTo: AND g.addGuarant is NOT NULL AND g.addGuarant <> '0' AND g.mi_deleteDate>='9999-12-31'
                    JOIN hr_employee e ON e.ID = n.employeeID 
                  LEFT JOIN hr_order o ON o.ID = n.orderID
                    WHERE n.orgID = :orgID: AND n.mi_deleteDate>='9999-12-31'
                  AND EXISTS (SELECT 1 FROM hr_employeePosition p WHERE p.employeeNumberID = n.ID AND p.workPlace = '1' AND p.mtCount >= 1 
                  AND p.dateFrom <= :dateTo: AND p.dateTo >= :dateTo: AND p.isActive = 1 AND p.mi_deleteDate >= '9999-12-31') 
                  ORDER BY n.ID, g.addGuarant
  `, {
      orgID,
      dateTo
    })

    const employeeList = store.getAsJsObject()
    employeeList.forEach(row => {
      const employee = resultData.find(o => o.employeeID === row.employeeID)
      if (row.parentEmpNumberID) {
        let parentEmpNumberData = getParentEmpNumberData(row.employeeNumberID)
        if (parentEmpNumberData) {
          row.gOrderDate = parentEmpNumberData['orderID.orderDate']
          row.gOrderNumber = parentEmpNumberData['orderID.orderNumber']
        }
      }

      if (row.addGuarant === '1') {
        const peopleBirthDate = UB.Repository('hr_employeeFamily')
          .attrs(['peopleID.birthDate'])
          .where('dictKinshipKindID', 'in', reportParams['listChildIDs'].length ? reportParams['listChildIDs'] : [0])
          .where('employeeID', '=', row.employeeID)
          .where('peopleID.birthDate', 'isNotNull')
          .selectAsObject({
            'peopleID.birthDate': 'birthDate'
          })
        const child = []
        peopleBirthDate.forEach(childData => {
          const vik = dateService.getYmd(dateService.shiftDate(childData.birthDate), dateTo)
          if (vik.years < 6) {
            childData.birthDate = dateService.formatDate(childData.birthDate)
            child.push(childData)
          }
        })
        if (employee) {
          employee.addGuarant = employee.addGuarant > Number(row.addGuarant) ? Number(row.addGuarant) : employee.addGuarant
          if (row.gOrderDate || row.gOrderNumber) {
            employee.order = `${row.gOrderDate ? dateService.formatDate(row.gOrderDate) : ''} ${(row.gOrderNumber ? (' №' + row.gOrderNumber) : '')}`
          }
          if (!employee.child4) {
            employee.child4 = child
          }
        } else {
          resultData.push({
            fullFIO: row.fullFIO,
            order: (row.gOrderDate || row.gOrderNumber)
              ? `${row.gOrderDate ? dateService.formatDate(row.gOrderDate) : ''} ${(row.gOrderNumber ? (' №' + row.gOrderNumber) : '')}`
              : `${row.orderDate ? dateService.formatDate(row.orderDate) : ''} ${(row.orderNumber ? (' №' + row.orderNumber) : '')}`,
            employeeID: row.employeeID,
            addGuarant: Number(row.addGuarant),
            child4: child
          })
        }
      } else if (row.addGuarant === '2') {
        const child = []
        const peopleBirthDate = reportParams['listChildIDs'].length ? UB.Repository('hr_employeeFamily')
          .attrs(['peopleID.birthDate', 'dictBenefitsKindID.type'])
          .where('dictKinshipKindID', 'in', reportParams['listChildIDs'].length ? reportParams['listChildIDs'] : [0])
          .where('employeeID', '=', row.employeeID)
          .selectAsObject({
            'peopleID.birthDate': 'birthDate',
            'dictBenefitsKindID.type': 'dictBenefitsKindType'
          }) : []
        peopleBirthDate.forEach(childData => {
          const vik = dateService.getYmd(dateService.shiftDate(childData.birthDate), dateTo)
          if ((childData.birthDate && vik.years < 14) || childData.dictBenefitsKindType === '1') {
            const benefitsText = childData.dictBenefitsKindType === '1' ? ' дитина з інвалідністю' : ''
            childData.birthDate = (childData.birthDate ? dateService.formatDate(childData.birthDate) : '__.__.____') + benefitsText
            child.push(childData)
          }
        })
        if (employee) {
          employee.addGuarant = employee.addGuarant > Number(row.addGuarant) ? Number(row.addGuarant) : employee.addGuarant
          if (row.gOrderDate || row.gOrderNumber) {
            employee.order = `${row.gOrderDate ? dateService.formatDate(row.gOrderDate) : ''} ${(row.gOrderNumber ? (' №' + row.gOrderNumber) : '')}`
          }
          if (!employee.child5) {
            employee.child5 = child
          }
        } else {
          resultData.push({
            fullFIO: row.fullFIO,
            order: (row.gOrderDate || row.gOrderNumber)
              ? `${row.gOrderDate ? dateService.formatDate(row.gOrderDate) : ''} ${(row.gOrderNumber ? (' №' + row.gOrderNumber) : '')}`
              : `${row.orderDate ? dateService.formatDate(row.orderDate) : ''} ${(row.orderNumber ? (' №' + row.orderNumber) : '')}`,
            employeeID: row.employeeID,
            addGuarant: Number(row.addGuarant),
            child5: child
          })
        }
      } else if (row.addGuarant === '6') {
        const education = UB.Repository('hr_employeeEducation')
          .attrs(['dateTo', 'educationName'])
          .where('employeeID', '=', row.employeeID)
          .where('dateTo', 'isNotNull')
          .orderByDesc('dateTo')
          .limit(1)
          .selectSingle({
            'dateTo': 'dateTo',
            'educationName': 'educationName'
          })
        const military = UB.Repository('hr_empStateMilitary')
          .attrs(['dismissDate'])
          .where('employeeID', '=', row.employeeID)
          .where('dismissDate', 'isNotNull')
          .orderByDesc('dismissDate')
          .limit(1)
          .selectSingle({
            'dismissDate': 'dismissDate'
          })
        const educationDate = education ? dateService.shiftDate(education.dateTo).getTime() : 0
        const militaryDate = military ? dateService.shiftDate(military.dismissDate).getTime() : 0
        if (educationDate <= militaryDate) {
          if (employee) {
            employee.addGuarant = employee.addGuarant > Number(row.addGuarant) ? Number(row.addGuarant) : employee.addGuarant
            if (row.gOrderDate || row.gOrderNumber) {
              employee.order = `${row.gOrderDate ? dateService.formatDate(row.gOrderDate) : ''} ${(row.gOrderNumber ? (' №' + row.gOrderNumber) : '')}`
            }
            if (!employee.dismissDateMilitary && military) {
              employee.dismissDateMilitary = dateService.formatDate(military.dismissDate)
            }
          } else {
            resultData.push({
              fullFIO: row.fullFIO,
              order: (row.gOrderDate || row.gOrderNumber)
                ? `${row.gOrderDate ? dateService.formatDate(row.gOrderDate) : ''} ${(row.gOrderNumber ? (' №' + row.gOrderNumber) : '')}`
                : `${row.orderDate ? dateService.formatDate(row.orderDate) : ''} ${(row.orderNumber ? (' №' + row.orderNumber) : '')}`,
              employeeID: row.employeeID,
              addGuarant: Number(row.addGuarant),
              dismissDateMilitary: military ? dateService.formatDate(military.dismissDate) : null
            })
          }
        } else if (educationDate > militaryDate) {
          if (employee) {
            employee.addGuarant = employee.addGuarant > Number(row.addGuarant) ? Number(row.addGuarant) : employee.addGuarant
            if (row.gOrderDate || row.gOrderNumber) {
              employee.order = `${row.gOrderDate ? dateService.formatDate(row.gOrderDate) : ''} ${(row.gOrderNumber ? (' №' + row.gOrderNumber) : '')}`
            }
            if (!employee.empBirthDate && row.birthDate) {
              employee.empBirthDate = dateService.formatDate(row.birthDate)
            }
            if (!employee.dateToEducation && education) {
              employee.dateToEducation = dateService.formatDate(education.dateTo)
            }
            if (!employee.educationName && education) {
              employee.educationName = education.educationName
            }
          } else {
            resultData.push({
              fullFIO: row.fullFIO,
              order: (row.gOrderDate || row.gOrderNumber)
                ? `${row.gOrderDate ? dateService.formatDate(row.gOrderDate) : ''} ${(row.gOrderNumber ? (' №' + row.gOrderNumber) : '')}`
                : `${row.orderDate ? dateService.formatDate(row.orderDate) : ''} ${(row.orderNumber ? (' №' + row.orderNumber) : '')}`,
              employeeID: row.employeeID,
              addGuarant: Number(row.addGuarant),
              empBirthDate: row.birthDate ? dateService.formatDate(row.birthDate) : null,
              dateToEducation: education ? dateService.formatDate(education.dateTo) : null,
              educationName: education ? education.educationName : null
            })
          }
        }
      } else if (row.addGuarant === '7') {
        if (employee) {
          employee.addGuarant = employee.addGuarant > Number(row.addGuarant) ? Number(row.addGuarant) : employee.addGuarant
          if (row.gOrderDate || row.gOrderNumber) {
            employee.order = `${row.gOrderDate ? dateService.formatDate(row.gOrderDate) : ''} ${(row.gOrderNumber ? (' №' + row.gOrderNumber) : '')}`
          }
          if (!employee.empBirthDate7) {
            employee.empBirthDate7 = dateService.formatDate(row.birthDate)
          }
        } else {
          resultData.push({
            fullFIO: row.fullFIO,
            order: (row.gOrderDate || row.gOrderNumber)
              ? `${row.gOrderDate ? dateService.formatDate(row.gOrderDate) : ''} ${(row.gOrderNumber ? (' №' + row.gOrderNumber) : '')}`
              : `${row.orderDate ? dateService.formatDate(row.orderDate) : ''} ${(row.orderNumber ? (' №' + row.orderNumber) : '')}`,
            employeeID: row.employeeID,
            addGuarant: Number(row.addGuarant),
            empBirthDate7: dateService.formatDate(row.birthDate)
          })
        }
      } else {
        if (employee) {
          employee.addGuarant = employee.addGuarant > Number(row.addGuarant) ? Number(row.addGuarant) : employee.addGuarant
          if (row.gOrderDate || row.gOrderNumber) {
            employee.order = `${row.gOrderDate ? dateService.formatDate(row.gOrderDate) : ''} ${(row.gOrderNumber ? (' №' + row.gOrderNumber) : '')}`
          }
        } else {
          resultData.push({
            fullFIO: row.fullFIO,
            order: (row.gOrderDate || row.gOrderNumber)
              ? `${row.gOrderDate ? dateService.formatDate(row.gOrderDate) : ''} ${(row.gOrderNumber ? (' №' + row.gOrderNumber) : '')}`
              : `${row.orderDate ? dateService.formatDate(row.orderDate) : ''} ${(row.orderNumber ? (' №' + row.orderNumber) : '')}`,
            employeeID: row.employeeID,
            addGuarant: Number(row.addGuarant)
          })
        }
      }
    })
  })
  resultData.sort((a, b) =>
    a.addGuarant > b.addGuarant ? 1 : a.addGuarant < b.addGuarant ? -1 : stringService.compareStringUa(a.fullFIO, b.fullFIO) === 1 ? 1 : 0
  ).forEach((row, idx) => {
    let data4 = ''
    let data5 = ''
    const data6 = row.empBirthDate || ''
    const data7 = row.dateToEducation || ''
    const data8 = row.educationName || ''
    const data9 = row.dismissDateMilitary || ''
    const data10 = row.empBirthDate7 || ''
    const rownum = idx + 1
    if (row.child4 && row.child4.length) {
      row.child4.forEach(c => {
        data4 += `${data4 !== '' ? ', ' : ''} ${c.birthDate}`
      })
    }
    if (row.child5 && row.child5.length) {
      row.child5.forEach(c => {
        data5 += `${data5 !== '' ? ', ' : ''} ${c.birthDate}`
      })
    }
    /*
    if (row.addGuarant === 1) {
      row.child.forEach(c => {
        data4 += `${data4 !== '' ? ', ' : ''} ${c.birthDate}`
      })
    }
    if (row.addGuarant === 2) {
      row.child.forEach(c => {
        data5 += `${data5 !== '' ? ', ' : ''} ${c.birthDate}`
      })
    }

    if (row.addGuarant === 6) {
      data6 = row.empBirthDate || ''
      data7 = row.dateToEducation || ''
      data8 = row.educationName || ''
      data9 = row.dismissDateMilitary || ''
    }
    if (row.addGuarant === 7) {
      data10 = row.empBirthDate
    } */
    updateCellInArray(data, 'T1RXXXXFULLFIO', rownum, (row.fullFIO))
    updateCellInArray(data, 'T1RXXXXK3', rownum, (row.order))
    updateCellInArray(data, 'T1RXXXXK4', rownum, data4)
    updateCellInArray(data, 'T1RXXXXK5', rownum, data5)
    updateCellInArray(data, 'T1RXXXXK6', rownum, data6)
    updateCellInArray(data, 'T1RXXXXK7', rownum, data7)
    updateCellInArray(data, 'T1RXXXXK8', rownum, data8)
    updateCellInArray(data, 'T1RXXXXK9', rownum, data9)
    updateCellInArray(data, 'T1RXXXXK10', rownum, data10)
  })
}

function getParentEmpNumberData (employeeNumberID) {
  const emp = UB.Repository('hr_employeeNumberS')
    .attrs('parentEmpNumberID', 'orderID.orderNumber', 'orderID.orderDate')
    .selectById(employeeNumberID)

  if (emp && emp['parentEmpNumberID']) {
    return getParentEmpNumberData(emp['parentEmpNumberID'])
  } else {
    return emp
  }

}

// non std xml file name
function generateFileName (params) {
  return [
    zeroFill(params.C_REG, 2),
    zeroFill(params.C_RAJ, 3),
    zeroFill(params.TIN, 10),
    zeroFill(params.C_DOC, 3),
    zeroFill(params.C_DOC_SUB, 3),
    zeroFill(params.C_DOC_VER, 2),
    '1',
    '00',
    zeroFill(params.C_DOC_CNT, 5),
    zeroFill(params.PERIOD_MONTH, 2),
    zeroFill(params.PERIOD_YEAR, 4)
  ].join('')
}

function zeroFill (number = 0, width) {
  if (typeof number === 'object') {
    number = 0
  }
  return ('0000000000' + number).slice(-width)
}

const cellFormats = [
  {
    names: ['FIRM_ADR', 'FIRM_ADR_FIZ', 'EDRPOU', 'FIRM_NAME', 'FIRM_SPATO', 'REP_PERNM', 'FIRM_KVED', 'MY_DATE',
      'OBL', 'RAY', 'S1_1', 'SPATO', 'KVED', 'N1', 'CAPTION', 'ACCOUNT', 'KOATUU', 'KVED', 'ONPR', 'KOPFD', 'T1RXXXXK3', 'T1RXXXXK4', 'T1RXXXXK5', 'T1RXXXXK6', 'T1RXXXXK7', 'T1RXXXXK8', 'T1RXXXXK9', 'T1RXXXXK10',
      'T1RXXXXFULLFIO', 'PERIOD', 'VIK', 'VIK_TEL', 'VIK_EMAIL', 'KVED1', 'REASON'],
    format: {
      type: 'string',
      nillable: true
    }
  },
  {
    names: ['HZY', 'REP_NYEAR', 'A1040', 'A2030_1', 'A2000', 'MFO'],
    format: {
      type: 'number',
      nillable: true,
      precision: 0
    }
  },
  {
    names: ['A1020', 'A2010_1', 'A2020_1', 'A2040_1', 'A2050_1'],
    format: {
      type: 'number',
      nillable: true,
      precision: 1
    }
  }
]

function xmlExport ({ data }) {
  const { DECLARBODY, DECLARHEAD } = _.get(data, 'data.DECLAR', { })
  if (!(DECLARBODY && DECLARHEAD)) {
    throw new UB.UBAbort(`<<<${UB.i18n('Не корректні дані для вивантаження')}>>>`)
  }
  const attrListExt = buildAttrsExt(allBodyAttrNames, cellFormats)
  const xmlData = {
    DECLAR: {
      $: JSON.parse(JSON.stringify(data.data.DECLAR.$)),
      DECLARHEAD: createDeclarAt({ declar: data.data.DECLAR.DECLARHEAD, attrList: allHeadAttrNames }),
      DECLARBODY: createDeclarExt({ declar: data.data.DECLAR.DECLARBODY, attrListExt })
    }
  }
  const xmlFileName = `${generateFileName(DECLARHEAD)}.xml`
  return { xmlData, xmlFileName }
}

function addTempleteForCustomRow (params) {
  params.T1 = [
    `<tr>
  <td style="border: 1px solid black;"><span class="row_num">ROWNUM</span></td>
  <td style="border: 1px solid black;text-align: left;">{{#textSpanInput}}DECLAR.DECLARBODY.T1RXXXXFULLFIO##ROWNUM##{{{}}}{{/textSpanInput}}</td>
  <td style="border: 1px solid black;">{{#textSpanInput}}DECLAR.DECLARBODY.T1RXXXXK3##ROWNUM##{{{}}}{{/textSpanInput}}</td>
  <td style="border: 1px solid black;">{{#textSpanInput}}DECLAR.DECLARBODY.T1RXXXXK4##ROWNUM##{{{}}}{{/textSpanInput}}</td>
  <td style="border: 1px solid black;">{{#textSpanInput}}DECLAR.DECLARBODY.T1RXXXXK5##ROWNUM##{{{}}}{{/textSpanInput}}</td>
  <td style="border: 1px solid black;">{{#textSpanInput}}DECLAR.DECLARBODY.T1RXXXXK6##ROWNUM##{{{}}}{{/textSpanInput}}</td>
  <td style="border: 1px solid black;">{{#textSpanInput}}DECLAR.DECLARBODY.T1RXXXXK7##ROWNUM##{{{}}}{{/textSpanInput}}</td>
  <td style="border: 1px solid black;">{{#textSpanInput}}DECLAR.DECLARBODY.T1RXXXXK8##ROWNUM##{{{}}}{{/textSpanInput}}</td>
  <td style="border: 1px solid black;">{{#textSpanInput}}DECLAR.DECLARBODY.T1RXXXXK9##ROWNUM##{{{}}}{{/textSpanInput}}</td>
  <td style="border: 1px solid black;">{{#textSpanInput}}DECLAR.DECLARBODY.T1RXXXXK10##ROWNUM##{{{}}}{{/textSpanInput}}</td>
  </tr>`
  ]
}
