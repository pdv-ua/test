const UB = require('@unitybase/ub')
const _ = require('lodash')
const { setDataProps, getCellSettings, createDeclarAt, buildAttrsExt, createDeclarExt, updateCellInArray } = require('../../../../AC/modules/regReport/index')
const dateService = require('../../../../AC/modules/dataServices/dateService')
const entityBaseService = require('../../../../AC/modules/entityServices/entityBaseService')
const reportService = require('../../../../HR/modules/reportService')

module.exports = {
  generateData
}

function generateData (params = {}) {
  const errorMessages = []
  const data = prepareStructureReport()
  const { DECLARBODY, DECLARHEAD } = data.DECLAR
  setDataProps({ data: DECLARBODY, source: params })
  setDataProps({ data: DECLARHEAD, source: params })
  setHeadData({ data, params })
  data.cellSettings = getCellSettings(params.repConfig.dictRepID)
  setBodyData({ data, params })
  return { data, errorMessages }
}

const allBodyAttrNames = [ 'CHIEF', 'BOOKKEEPER', 'EXNAME', 'TEL']

const allHeadAttrNames = ['TIN', 'ORG', 'C_DOC', 'C_DOC_SUB', 'C_DOC_VER', 'PERIOD_TYPE', 'PERIOD_MONTH',
  'PERIOD', 'PERIOD_YEAR', 'C_DOC_STAN', 'SOFTWARE']

function prepareStructureReport () {
  let data = {
    DECLAR: {
      DECLARHEAD: {
      },
      DECLARBODY: {
      },
      PARAMS: {
        REPORTNAME: null
      }
    }
  }

  data.DECLAR['$'] = {
    'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
    'xsi:noNamespaceSchemaLocation': 'H0501001.xsd'
  }

  let rows = ['', '1', '11', '12', '13', '2', '21', '22', '23', '3', '31', '32', '33', '4', '5', '6']
  let part = '1'
  rows.forEach(item => {
    for (let i = 4; i <= 16; i++) {
      allBodyAttrNames.push(`F${part}${i}${item}`)
    }
  })

  rows = ['', '2710', '2730', '2240', '1', '11', '12', '13', '2', '21', '22', '23', '3', '31', '32', '33', '4']
  part = '2'
  rows.forEach(item => {
    for (let i = 4; i <= 16; i++) {
      allBodyAttrNames.push(`F${part}${i}${item}`)
    }
  })

  rows = ['', '2710', '2240', '1', '2', '3']
  part = '3'
  rows.forEach(item => {
    for (let i = 4; i <= 16; i++) {
      allBodyAttrNames.push(`F${part}${i}${item}`)
    }
  })

  rows = ['', '1', '2', '3']
  part = '4'
  rows.forEach(item => {
    for (let i = 4; i <= 16; i++) {
      allBodyAttrNames.push(`F${part}${i}${item}`)
    }
  })

  rows = ['']
  part = '5'
  rows.forEach(item => {
    for (let i = 4; i <= 16; i++) {
      allBodyAttrNames.push(`F${part}${i}${item}`)
    }
  })

  rows = ['', '1', '11', '112', '113', '114', '115', '116', '12', '121', '122', '123', '124', '125', '126', '127', '2', '21', '22', '23', '3', '4']
  part = '6'
  rows.forEach(item => {
    for (let i = 4; i <= 16; i++) {
      allBodyAttrNames.push(`F${part}${i}${item}`)
    }
  })

  rows = ['']
  part = '7'
  rows.forEach(item => {
    for (let i = 4; i <= 16; i++) {
      allBodyAttrNames.push(`F${part}${i}${item}`)
    }
  })

  rows = ['', '1', '11', '12', '2', '21', '22', '3']
  part = '8'
  rows.forEach(item => {
    for (let i = 4; i <= 16; i++) {
      allBodyAttrNames.push(`F${part}${i}${item}`)
    }
  })

  rows = ['']
  part = '9'
  rows.forEach(item => {
    for (let i = 4; i <= 16; i++) {
      allBodyAttrNames.push(`F${part}${i}${item}`)
    }
  })

  rows = ['', '1', '2', '3']
  part = '10'
  rows.forEach(item => {
    for (let i = 4; i <= 16; i++) {
      allBodyAttrNames.push(`F${part}${i}${item}`)
    }
  })

  allHeadAttrNames.forEach(cName => {
    data.DECLAR.DECLARHEAD[cName] = null
  })

  allBodyAttrNames.forEach(cName => {
    data.DECLAR.DECLARBODY[cName] = null
  })
  return data
}

function setBodyData ({ data, params }) {
  params.dateFrom = new Date(Date.UTC(params.PERIOD_YEAR, ((parseInt(params.PERIOD_MONTH) / 3) - 1) * 3, 1, 0, 0, 0, 0))
  params.dateTo = dateService.lastDayOfMonth(new Date(Date.UTC(params.PERIOD_YEAR, params.PERIOD_MONTH - 1, 1, 0, 0, 0, 0)))
  params.dateFromYearBegin = new Date(Date.UTC(params.PERIOD_YEAR, 0, 1, 0, 0, 0, 0))
  params.reportParams = reportService.getReportParams(params.organizationID,
    [ 'ChAES1', 'ChAES2', 'ChAES3', 'ChAESCh', 'invalid1gr', 'invalid2gr', 'invalid3gr', 'FamWithoutEarn', 'ParentsOfDead', 'invalidCh', 'ChWithoutParent', 'EvacPeopleCh',
'VacChAES', 'VacRadiat', 'VacRadiatZonaVidchuz', 'VacRadiatZonaVidsel', 'VacRadiatZonaContr', 'PayTransfer', 'PayDaysTrip', 'PayNewProf', 'PayRadiat', 'PayChildFood1',
'PayChildFood2', 'PayChildFood3', 'PayPost2', 'PayFood50', 'PayFood25', 'PayPost3', 'CompLostProp', 'ComRelocat', 'AssistCMU', 'PropertyEstim', 'CompInjury', 'OneTimePay',
'PayWelln', 'PayCalling', 'LostPayComp', 'PayPost6', 'BankLoans', 'PaySanatorium', 'CompSanatorium', 'PayPost8', 'PayPost9'])

  const { DECLARBODY } = data.DECLAR

  const bos = UB.Repository('hr_employeeNumberS').attrs(['employeeID.shortFIO']).selectById(params.bosID || 0)
  const buh = UB.Repository('hr_employeeNumberS').attrs(['employeeID.shortFIO']).selectById(params.buhID || 0)

  params.organiozations = params.includeSubOrg
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

  if (!params.organiozations.length) {
    params.organiozations = [params.organizationID]
  }

  DECLARBODY.CHIEF = bos ? bos['employeeID.shortFIO'] : ''
  DECLARBODY.BOOKKEEPER = buh ? buh['employeeID.shortFIO'] : ''

  //==== 10 general total
  const objData10_2240 = getObjData('10','1')
  const objData10_2710 = getObjData('10','2')
  const objData10_2730 = getObjData('10','3')

  //==== 1
  const objData1 = getObjData('1','')

  let codes = ['VacChAES', 'VacRadiat', 'PayTransfer', 'PayDaysTrip', 'PayNewProf', 'PayRadiat']
  const addCodes = {
    0: ['ChAES1', 'ChAES2', 'ChAESCh'],
    1: ['VacRadiatZonaVidchuz', 'VacRadiatZonaVidsel', 'VacRadiatZonaContr'],
    2: ['ChAES1', 'ChAES2', 'ChAES3']
  }
  codes.forEach((codePay, index) => {
    const objData = getObjData('1',`${index + 1}`, codePay)
    calcData(objData, params)
    addToObjData(objData, objData1)

    const addCode = addCodes[index] ? addCodes[index] : []
    addCode.forEach((code, index2) => {
      const objDataSub = getObjData('1',`${index + 1}${index2 + 1}`, index === 1 ? code : codePay, index === 1 ? '' : code)
      calcData(objDataSub, params)
      getRowObject(DECLARBODY, objDataSub)
    })
    getRowObject(DECLARBODY, objData)
  })

  getRowObject(DECLARBODY, objData1)

  addToObjData(objData1, objData10_2730)

  //==== 2
  const objData2 = getObjData('2','')
  const objData2_2710 = getObjData('2','2710')
  const objData2_2730 = getObjData('2','2730')
  const objData2_2240 = getObjData('2','2240')

  codes = ['PayChildFood1', 'PayChildFood2', 'PayChildFood3', 'PayPost2']
  codes.forEach((codePay, index) => {
    const objData = getObjData('2',`${index + 1}`, codePay)
    calcData(objData, params)
    addToObjData(objData, objData2)
    if (index === 0) {
      addToObjData(objData, objData2_2710)
    }
    if (index === 1 || index === 2) {
      addToObjData(objData, objData2_2730)
    }
    if (index === 3) {
      addToObjData(objData, objData2_2240)
    }
    if (index <= 2) {
      for (let i = 1; i <= 3; i++) {
        const ageFrom = i === 1 ? 6 : i === 2 ? 11 : 14
        const ageTo = i === 1 ? 10 : i === 2 ? 13 : 0

        const objDataSub = getObjData('2', `${index + 1}${i}`, codePay, '', '', true, ageFrom, ageTo, 'invalidCh')
        calcData(objDataSub, params)
        getRowObject(DECLARBODY, objDataSub)
      }
    }

    getRowObject(DECLARBODY, objData)
  })

  getRowObject(DECLARBODY, objData2_2240)
  getRowObject(DECLARBODY, objData2_2730)
  getRowObject(DECLARBODY, objData2_2710)
  getRowObject(DECLARBODY, objData2)

  addToObjData(objData2_2730, objData10_2730)
  addToObjData(objData2_2710, objData10_2710)
  addToObjData(objData2_2240, objData10_2240)

  //==== 3
  const objData3 = getObjData('3','')
  const objData3_2710 = getObjData('3','2710')
  const objData3_2240 = getObjData('3','2240')

  codes = ['PayFood50', 'PayFood25', 'PayPost3']
  codes.forEach((codePay, index) => {
    const objData = getObjData('3',`${index + 1}`, codePay)
    calcData(objData, params)
    addToObjData(objData, objData3)
    if (index === 2) {
      addToObjData(objData, objData3_2240)
    } else {
      addToObjData(objData, objData3_2710)
    }

    getRowObject(DECLARBODY, objData)
  })
  getRowObject(DECLARBODY, objData3_2710)
  getRowObject(DECLARBODY, objData3_2240)
  getRowObject(DECLARBODY, objData3)

  addToObjData(objData3_2710, objData10_2710)
  addToObjData(objData3_2240, objData10_2240)

  //==== 4
  const objData4 = getObjData('4','')

  codes = ['CompLostProp', 'ComRelocat', 'AssistCMU']
  codes.forEach((codePay, index) => {
    const objData = getObjData('4',`${index + 1}`, codePay)
    calcData(objData, params)
    addToObjData(objData, objData4)
    getRowObject(DECLARBODY, objData)
  })

  getRowObject(DECLARBODY, objData4)

  addToObjData(objData4, objData10_2710)

  //==== 5
  const objData5 = getObjData('5','', 'PropertyEstim')
  calcData(objData5, params)
  getRowObject(DECLARBODY, objData5)

  addToObjData(objData5, objData10_2240)

  //==== 6
  const objData6 = getObjData('6','')

  codes = ['CompInjury', 'PayCalling', 'LostPayComp', 'PayPost6']
  codes.forEach((codePay, index) => {
    const objData = getObjData('6',`${index + 1}`, codePay)
    calcData(objData, params)
    addToObjData(objData, objData6)
    getRowObject(DECLARBODY, objData)

    if (index === 3) {
      addToObjData(objData, objData10_2240)
    } else {
      addToObjData(objData, objData10_2710)
    }
  })

  codes = ['OneTimePay', 'PayWelln']
  codes.forEach((codePay, index) => {
    const objData = getObjData('6',`1${index + 1}`, codePay)
    calcData(objData, params)
    getRowObject(DECLARBODY, objData)

    const codes2 = index === 0 ? ['invalid1gr', 'invalid2gr', 'invalid3gr', 'FamWithoutEarn', 'ParentsOfDead', 'invalidCh'] : ['invalid1gr', 'invalid3gr', 'invalidCh', 'ChAES2', 'ChAES3', 'ChWithoutParent', 'EvacPeopleCh']
    codes2.forEach((codePay2, index2) => {
      const objDataSub = getObjData('6',`1${index + 1}${index2 + 1}`, codePay, (index === 0 && index2 === 5) || (index === 1 && index2 === 2) ? '' : codePay2, index === 1 && index2 === 0 ? 'invalid2gr' : '', (index === 0 && index2 === 5) || (index === 1 && index2 === 2), 0, 0, (index === 0 && index2 === 5) || (index === 1 && index2 === 2) ? codePay2 : '')
      calcData(objDataSub, params)
      getRowObject(DECLARBODY, objDataSub)
    })
  })

  codes = ['ChAES1', 'ChAES2', 'ChAES3']
  codes.forEach((codePay, index) => {
    const objData = getObjData('6',`2${index + 1}`, 'PayCalling', codePay)
    calcData(objData, params)
    getRowObject(DECLARBODY, objData)
  })

  getRowObject(DECLARBODY, objData6)

  //==== 7
  const objData7 = getObjData('7','', 'BankLoans')
  calcData(objData7, params)
  getRowObject(DECLARBODY, objData7)

  addToObjData(objData7, objData10_2710)

  //==== 8
  const objData8 = getObjData('8','')

  codes = ['PaySanatorium', 'CompSanatorium', 'PayPost8']
  codes.forEach((codePay, index) => {
    const objData = getObjData('8',`${index + 1}`, codePay)
    calcData(objData, params)
    addToObjData(objData, objData8)
    if (index === 0) {
      addToObjData(objData, objData10_2730)
    }
    if (index === 1) {
      addToObjData(objData, objData10_2710)
    }
    if (index === 2) {
      addToObjData(objData, objData10_2240)
    }
    if (index <= 1) {
      const codes2 = ['ChAES1', 'invalidCh']
      codes2.forEach((codePay2, index2) => {
        const objDataSub = getObjData('8',`${index + 1}${index2 + 1}`, codePay, codePay2)
        calcData(objDataSub, params)
        getRowObject(DECLARBODY, objDataSub)
      })
    }

    getRowObject(DECLARBODY, objData)
  })

  getRowObject(DECLARBODY, objData8)

  //==== 9
  const objData9 = getObjData('9','', 'PayPost9')
  calcData(objData9, params)
  getRowObject(DECLARBODY, objData9)

  addToObjData(objData9, objData10_2710)

  //==== 10
  const objData10 = getObjData('10','')
  addToObjData(objData10_2240, objData10)
  addToObjData(objData10_2710, objData10)
  addToObjData(objData10_2730, objData10)

  getRowObject(DECLARBODY, objData10_2730)
  getRowObject(DECLARBODY, objData10_2710)
  getRowObject(DECLARBODY, objData10_2240)
  getRowObject(DECLARBODY, objData10)
}

function getObjData(partTable, rowName, codePay, codeBenefits, codeBenefits2, haveChild, ageFrom, ageTo, childCodeBenefits) {
  return {
    codePay,
    codeBenefits, codeBenefits2,
    haveChild, ageFrom, ageTo, childCodeBenefits,
    partTable, rowName,
    F4: 0,
    F5: 0,
    F6: 0,
    F7: 0,
    F8: 0,
    F9: 0,
    F10: 0,
    F11: 0,
    F12: 0,
    F13: 0,
    F14: 0,
    F15: 0,
    F16: 0
  }
}

function addToObjData(fromObj, toObj) {
  for (let i = 4; i <= 16; i++) {
    toObj[`F${i}`] += fromObj[`F${i}`] || 0
  }
}

function getRowObject(rowData, objValue) {
  rowData[`F${objValue.partTable}4${objValue.rowName}`] = objValue.F4
  rowData[`F${objValue.partTable}5${objValue.rowName}`] = objValue.F5
  rowData[`F${objValue.partTable}6${objValue.rowName}`] = objValue.F6
  rowData[`F${objValue.partTable}7${objValue.rowName}`] = objValue.F7
  rowData[`F${objValue.partTable}8${objValue.rowName}`] = objValue.F8
  rowData[`F${objValue.partTable}9${objValue.rowName}`] = objValue.F9
  rowData[`F${objValue.partTable}10${objValue.rowName}`] = objValue.F10
  rowData[`F${objValue.partTable}11${objValue.rowName}`] = objValue.F11
  rowData[`F${objValue.partTable}12${objValue.rowName}`] = objValue.F12
  rowData[`F${objValue.partTable}13${objValue.rowName}`] = objValue.F13
  rowData[`F${objValue.partTable}14${objValue.rowName}`] = objValue.F14
  rowData[`F${objValue.partTable}15${objValue.rowName}`] = objValue.F15
  rowData[`F${objValue.partTable}16${objValue.rowName}`] = objValue.F16
}

function calcData (valueData, params) {
  params.organiozations.forEach(organizationID => {
    const payElIDs = params.reportParams[`${valueData.codePay}IDs`].length ? params.reportParams[`${valueData.codePay}IDs`] : []
    const codeBenefits = []

    if (valueData.codeBenefits && params.reportParams[`${valueData.codeBenefits}IDs`].length) {
      codeBenefits.push(...params.reportParams[`${valueData.codeBenefits}IDs`])
    }
    if (valueData.codeBenefits2 && params.reportParams[`${valueData.codeBenefits2}IDs`].length) {
      codeBenefits.push(...params.reportParams[`${valueData.codeBenefits2}IDs`])
    }

		const childCodeBenefits = valueData.childCodeBenefits && params.reportParams[`${valueData.childCodeBenefits}IDs`].length ? params.reportParams[`${valueData.childCodeBenefits}IDs`] : []

    const calc = payElIDs.length &&
			(((valueData.codeBenefits || valueData.codeBenefits2) && codeBenefits.length) || (!valueData.codeBenefits && !valueData.codeBenefits2)) &&
			((valueData.childCodeBenefits && childCodeBenefits.length) || !valueData.childCodeBenefits)

    if (calc) {
      const p = {
        dateFrom: dateService.shiftDate(params.dateFrom),
        dateTo: dateService.shiftDate(params.dateTo),
        organizationID,
        codeBenefits: codeBenefits,
        payElIDs: payElIDs,
        ageFrom: valueData.ageFrom,
        ageTo: valueData.ageTo,
				childCodeBenefits: childCodeBenefits
      }
      const p01 = {
        dateFrom: dateService.shiftDate(params.dateFromYearBegin),
        dateTo: dateService.shiftDate(params.dateTo),
        organizationID,
        codeBenefits: codeBenefits,
        payElIDs: payElIDs,
        ageFrom: valueData.ageFrom,
        ageTo: valueData.ageTo,
				childCodeBenefits: childCodeBenefits
      }
      const countSQL = getSQLCounter(!!codeBenefits.length, valueData.haveChild, valueData.ageFrom, valueData.ageTo, !!childCodeBenefits.length)
      const store = UB.DataStore('hr_payEl')
      store.runSQL(countSQL, p)
      const data = store.getAsJsObject()
      valueData.F4 = (data.length ? data[0].col_1 : 0) || 0
    }
  })
}

function getSQLCounter (withBenefits, haveChild, ageFrom, ageTo, withChildBenefits) {
  const sqlDialect = entityBaseService.getSQLDialect()

  const sqlAge  = sqlDialect.dialect === 'MSSQL2012'
    ? `(select DATEDIFF(yy, people.birthDate, :dateTo:) - CASE WHEN MONTH(:dateTo:) < MONTH(people.birthDate) THEN 1
    WHEN MONTH(:dateTo:) > MONTH(people.birthDate) THEN 0 WHEN DAY(:dateTo:) < DAY(people.birthDate) THEN 1 ELSE 0 END)`
    : `(select date_part('years', AGE(:dateTo:, people.birthDate)))`

  const sqlChildren = haveChild ? `and exists (select 1 from hr_employeeFamily fam
    inner join hr_people people on people.id = fam.peopleID and people.mi_deleteDate >= '9999-12-31'
    ${ageFrom ? `and ${sqlAge} >= :ageFrom: ` : ''}
    ${ageTo ? `and ${sqlAge} <= :ageTo: ` : ''}
    inner join hr_dictKinshipKind dictKind on dictKind.id = fam.dictKinshipKindID and dictKind.mi_deleteDate >= '9999-12-31' and dictKind.code in ('05', '06')
    where fam.employeeID = n1.employeeID and fam.mi_deleteDate >= '9999-12-31'  
    ${withChildBenefits ? ` and fam.dictBenefitsKindID${entityBaseService.getInExpression('childCodeBenefits')} ` : '' } 
    )`
    : ''

  return withBenefits
    ? `
    select COUNT(distinct n1.employeeID) as "col_1"
      from hr_employeeNumber n1
      inner join hr_employeeBenefits b1 on b1.employeeID = n1.employeeID and b1.mi_deleteDate >= '9999-12-31'
      where n1.orgID = :organizationID:
      and n1.mi_deleteDate >= '9999-12-31'
      and n1.dateFrom <= :dateTo: and n1.dateTo >= :dateFrom:
      and b1.dateFrom <= :dateTo: and b1.dateTo >= :dateFrom:
      and b1.dictBenefitsKindID${entityBaseService.getInExpression('codeBenefits')}
      and exists (
        select null from hr_accrual a1
        where a1.employeeNumberID = n1.ID and a1.periodCalc <= :dateTo: and a1.periodCalc >= :dateFrom: and (a1.flagsRec & 8192 = 0)
        and payElID${entityBaseService.getInExpression('payElIDs')}
       )
       ${sqlChildren} 
   `
    : `
    select COUNT(distinct n1.employeeID) as "col_1"
      from hr_employeeNumber n1
      where n1.orgID = :organizationID:
      and n1.mi_deleteDate >= '9999-12-31'
      and n1.dateFrom <= :dateTo: and n1.dateTo >= :dateFrom:
      and exists (
        select null from hr_accrual a1
        where a1.employeeNumberID = n1.ID and a1.periodCalc <= :dateTo: and a1.periodCalc >= :dateFrom: and (a1.flagsRec & 8192 = 0)
        and payElID${entityBaseService.getInExpression('payElIDs')}
       )
       ${sqlChildren}
  
   `
}

function getSQLSum () {
  return `
  select SUM(a1.paySum) as "col_1" from hr_accrual a1
    inner join hr_employeeNumber n1 on n1.ID = a1.employeeNumberID
        and n1.orgID = :organizationID:
    where a1.periodCalc <= :dateTo: and a1.periodCalc >= :dateFrom: and (a1.flagsRec & 8192 = 0)
    and payElID${entityBaseService.getInExpression('categoryChAES')}
    and exists (
      select 1
        from hr_employeeBenefits b1
        where b1.employeeID = n1.employeeID and b1.mi_deleteDate >= '9999-12-31'
          and b1.dateFrom <= :dateTo: and b1.dateTo >= :dateFrom:
          and dictBenefitsKindID${entityBaseService.getInExpression('codeChAES')} 
    )
  `
}

function setHeadData ({ data, params }) {
  const { DECLARHEAD } = data.DECLAR

  const nameOrg = UB.Repository('hr_organization')
    .attrs(['ID', 'fullName', 'EDRPOUCode'])
    .where('mi_data_id', '=', params.organizationID)
    .where('state', '=', 'ACTIVE')
    .limit(1)
    .selectSingle()
  DECLARHEAD.ORG = nameOrg && nameOrg['fullName'] ? nameOrg['fullName'] : ''
  DECLARHEAD.TIN = nameOrg && nameOrg['EDRPOUCode'] ? nameOrg['EDRPOUCode'] : ''

  const repVersion = UB.Repository('ac_dictRepVersion').attrs(['code', 'subCode', 'version']).selectById(params.repConfig.dictRepVersionID) || {}
  DECLARHEAD.C_DOC = repVersion.code
  DECLARHEAD.C_DOC_SUB = repVersion.subCode
  DECLARHEAD.C_DOC_VER = Number.parseInt(repVersion.version)

  const repType = UB.Repository('ac_dictRepType').attrs(['namePerType', 'name', 'periodMonth', 'periodType']).selectById(params.dictRepTypeID) || {}
  DECLARHEAD.PERIOD_TYPE = repType.periodType
  DECLARHEAD.PERIOD_MONTH = repType.periodMonth
  DECLARHEAD.PERIOD = String(repType.name) + ' ' + String(params.PERIOD_YEAR)

  DECLARHEAD.PERIOD_YEAR = params.PERIOD_YEAR

  DECLARHEAD.SOFTWARE = 'A5'
  DECLARHEAD.C_DOC_STAN = 1
}
