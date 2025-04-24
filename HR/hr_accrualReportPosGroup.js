const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const dateService = require('../AC/modules/dataServices/dateService')
const currencyService = require('../AC/public/core/currencyService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')

me.entity.addMethod('getNReportData')
me.entity.addMethod('getIncomeReportData')
me.entity.addMethod('getPaymentReportData')
me.entity.addMethod('selectAccrualForPayment')
me.entity.addMethod('getCreditReportData')

me.getNReportData = ctx => {
  let params = ctx.mParams.execParams

  const org = UB.Repository('hr_organization').attrs('name', 'EDRPOUCode')
    .misc({ __mip_recordhistory_all: true }).selectById(params.orgID)
  const reportDate = dateService.formatDate(params.reportDate)
  const period = params.periodRaw.split(' ')

  const accrual = {}
  let accrualData = []
  let order = {}

  let tabs = ['FOZP', 'FDZP', 'ZKV']

  let rowValByTab = {
    'FOZP': 'Фонд основної заробітної плати:',
    'FDZP': 'Фонд додаткової заробітної плати:',
    'ZKV': 'Інші заохочувальні та компенсаційні виплати:',
    'other': 'Інші виплати, що не належать до фонду оплати праці:'
  }

  function getQueryByRow (rowType, tabCode) {
    let query = UB.Repository('hr_accrual')
      .attrs('sum([paySum])', 'payElID', 'payElID.name')
      .where('periodCalcID', '=', params.periodID)
      .where(`(flagsRec & 8192 != 8192)`, 'custom')
      .groupBy(['payElID', 'payElID.name'])
    switch (rowType) {
      case 'tabs':
        query = query
          .exists(
            UB.Repository('hr_idParam')
              .correlation('valuesID', 'payElID')
              .where('listParamID.code', '=', tabCode)
              .where('listParamID.tableName', '=', 'hr_payEl')
              .where('mi_deleteDate', '>=', '#maxdate')
          )
        break
      case 'other':
        query = query
          .where('payElID.methodID.methodGroupID.groupType', '=', 'PAYMENT')
          .notExists(
            UB.Repository('hr_idParam')
              .correlation('valuesID', 'payElID')
              .where('listParamID.code', 'in', tabs)
              .where('listParamID.tableName', '=', 'hr_payEl')
              .where('mi_deleteDate', '>=', '#maxdate')
          )
        break
      case 'hold':
        query = query.where('payElID.methodID.methodGroupID.groupType', '!=', 'PAYMENT')
        break
    }

    switch (params.reportCode) {
      case 'hr_accrual-N6':
        query.where('employeeNumberID', '=', params.employeeNumberID)
        break
      case 'hr_accrual-N7':
        query.where('employeeNumberID.orgID', '=', params.orgID)
        break
    }

    return query.selectAsObject({
      'sum([paySum])': 'paySum',
      'payElID.name': 'payElName'
    })
  }

  let globalOrder = 0

  tabs.forEach(tabCode => {
    order = {}
    accrual[tabCode + 'Sum'] = 0
    UB.Repository('hr_idParam')
      .attrs('orderN', 'valuesID')
      .where('listParamID.code', '=', tabCode)
      .where('listParamID.tableName', '=', 'hr_payEl')
      .selectAsObject().forEach(idParam => {
        order[idParam.valuesID] = idParam.orderN
      })

    accrual[tabCode] = getQueryByRow('tabs', tabCode)

    accrual[tabCode].forEach(item => {
      item.orderN = order[item.payElID]
      accrual[tabCode + 'Sum'] += item.paySum * 100
      item.paySum = (item.paySum || 0).toFixed(2)
    })

    accrual[tabCode].sort((a, b) => (a.orderN > b.orderN) ? 1 : ((b.orderN > a.orderN) ? -1 : 0))

    accrual[tabCode].forEach(item => {
      item.orderN = ++globalOrder
    })

    accrualData = accrualData.concat([{
      orderN: '',
      paySum: (accrual[tabCode + 'Sum'] / 100).toFixed(2),
      payElID: '',
      payElName: `<strong>${rowValByTab[tabCode]}</strong>`
    }],
    accrual[tabCode], [{
      orderN: '',
      paySum: '',
      payElID: '',
      payElName: '&nbsp;'
    }])
  })

  accrual['other'] = getQueryByRow('other')

  accrual['otherSum'] = 0
  accrual['other'].forEach((item, i) => {
    item.orderN = ++globalOrder
    accrual['otherSum'] += item.paySum * 100
    item.paySum = (item.paySum || 0).toFixed(2)
  })

  accrualData = accrualData.concat([{
    orderN: null,
    paySum: (accrual['otherSum'] / 100).toFixed(2),
    payElID: null,
    payElName: `<strong>${rowValByTab['other']}</strong>`
  }],
  accrual['other'], [{
    orderN: '',
    paySum: '',
    payElID: '',
    payElName: '&nbsp;'
  }])

  accrual['hold'] = getQueryByRow('hold')

  accrual['holdSum'] = 0
  accrual['hold'].forEach((item, i) => {
    item.orderN = i + 1
    accrual['holdSum'] += item.paySum * 100
    item.paySum = (item.paySum || 0).toFixed(2)
  })

  if (accrual['hold'].length) {
    if (accrualData.length > accrual['hold'].length) {
      for (let i = 0; i < accrualData.length; i++) {
        if (accrual['hold'].length <= i) {
          break
        }

        Object.assign(accrualData[i], {
          hOrderN: i + 1,
          hPayElName: accrual['hold'][i].payElName,
          hPaySum: accrual['hold'][i].paySum
        })
      }
    } else {
      for (let i = 0; i < accrual['hold'].length; i++) {
        if (accrualData[i]) {
          Object.assign(accrualData[i], {
            hOrderN: i + 1,
            hPayElName: accrual['hold'][i].payElName,
            hPaySum: accrual['hold'][i].paySum
          })
        } else {
          accrualData.push({
            orderN: '',
            payElName: '',
            paySum: '',
            hOrderN: i + 1,
            hPayElName: accrual['hold'][i].payElName,
            hPaySum: accrual['hold'][i].paySum
          })
        }
      }
    }
  }

  const otherParams = {}

  if (params.reportCode === 'hr_accrual-N6') {
    otherParams.empPosData = UB.Repository('hr_employeePositionSR')
      .attrs('employeeNumberID.employeeID.fullFIO', 'employeeNumberID.employeeID.sexType.name', 'employeeNumberID.tabNum',
        'employeeNumberID.employeeID.taxCode', 'posName', 'posCodeZKPPTR')
      .where('ID', '=', params.employeePositionID)
      .selectSingle({
        'employeeNumberID.employeeID.fullFIO': 'fullFIO',
        'employeeNumberID.employeeID.sexType.name': 'sexType',
        'employeeNumberID.tabNum': 'tabNum',
        'employeeNumberID.employeeID.taxCode': 'taxCode'
      })

    if (otherParams.empPosData.posName) otherParams.empPosData.posFull = otherParams.empPosData.posName
    if (otherParams.empPosData.posCodeZKPPTR) otherParams.empPosData.posFull = `${otherParams.empPosData.posFull || ''} (${otherParams.empPosData.posCodeZKPPTR})`.trim()

    otherParams.timeSheet = UB.Repository('tim_timeSheet')
      .attrs('count([ID])', 'sum([factHour])')
      .where('employeeNumberID', '=', params.employeeNumberID)
      .where('dateWork', '>=', params.periodFrom)
      .where('dateWork', '<=', params.periodTo)
      .where('factTimeCostID.timeCostType', '=', 'WORK')
      .where('isActive', '=', 1)
      .selectSingle({
        'count([ID])': 'count',
        'sum([factHour])': 'factHour'
      })

    otherParams.timeSheet.timeSheetFull = otherParams.timeSheet.count
    if (otherParams.timeSheet.factHour) otherParams.timeSheet.timeSheetFull = `${otherParams.timeSheet.timeSheetFull} (${otherParams.timeSheet.factHour})`
  }

  ctx.mParams.resultData = JSON.stringify({
    orgName: org.name,
    EDRPOUCode: org.EDRPOUCode,
    periodMonth: period[0],
    periodYear: period[1].substring(2),
    reportDate,
    accrualData,
    sumAll: (((accrual['FOZPSum'] + accrual['FDZPSum'] + accrual['ZKVSum'] + accrual['otherSum']) || 0) / 100).toFixed(2),
    accountant: params.accEmployeePositionID ? UB.Repository('hr_employeePositionS').attrs('employeeNumberID.employeeID.shortFIO').where('ID', '=', params.accEmployeePositionID).selectScalar() : null,
    otherParams,
    holdSum: ((accrual.holdSum / 100) || 0).toFixed(2)
  })
}

function getFixed2Val (v, checkField) {
  if (checkField) return v && v[checkField] ? v[checkField].toFixed(2) : '0.00'
  else return v && v ? v.toFixed(2) : '0.00'
}

me.getIncomeReportData = ctx => {
  let params = ctx.mParams.execParams
  const periodFrom = dateService.shiftDate(params.periodFrom)
  const periodTo = dateService.shiftDate(params.periodTo)
  const hrOrg = UB.Repository('hr_organization').attrs('name', 'nameDat', 'EDRPOUCode')
    .where('mi_data_id', '=', params.orgID)
    .where('state', '=', 'ACTIVE')
    .misc({ __mip_ondate: periodTo })
    .selectSingle()
  const orgAddress = UB.Repository('ac_address').attrs('address').where('ownerID', '=', params.orgID)
    .where('addressType', '=', '2').selectScalar()
  const orgPhone = UB.Repository('cdn_contact').attrs('value').where('subjectID', '=', params.orgID)
    .where('contactTypeID.code', '=', 'phone').selectScalar()
  const orgOKPOCode = (hrOrg && hrOrg.EDRPOUCode) || null
  const employeePosData = UB.Repository('hr_employeePositionSR')
    .attrs('workPlace.name', 'posName')
    .where('ID', '=', params.employeePositionID).selectSingle({
      'workPlace.name': 'workPlace'
    }) || {}

  employeePosData.taxCode = employeePosData.taxCode || '&nbsp;'

  const headEmployeePosData = params.headEmployeePositionID ? UB.Repository('hr_employeePositionSR')
    .attrs('employeeNumberID.employeeID.shortFIO', 'posName')
    .where('ID', '=', params.headEmployeePositionID).selectSingle({
      'employeeNumberID.employeeID.shortFIO': 'shortFIO'
    }) : {}

  const employeeData = UB.Repository('hr_employeeNumberS')
    .attrs('employeeID.datName', 'employeeID.taxCode', 'employeeID.shortFIO')
    .where('ID', '=', params.employeeNumberID)
    .selectSingle({
      'employeeID.datName': 'datName',
      'employeeID.taxCode': 'taxCode',
      'employeeID.shortFIO': 'shortFIO'
    })

  function getQueryPaySum () {
    return UB.Repository('hr_accrual')
      .attrs('sum([paySum])', 'periodSalaryID', 'periodSalaryID.dateFrom')
      .where('employeeNumberID', '=', params.employeeNumberID)
      .where('periodSalaryID.dateFrom', '<=', periodTo)
      .where('periodSalaryID.dateTo', '>=', periodFrom)
      .where(`(flagsRec & 8192 != 8192)`, 'custom')
      .groupBy(['periodSalaryID', 'periodSalaryID.dateFrom'])
      .orderBy('periodSalaryID.dateFrom')
  }

  function groupByPeriod (data) {
    const obj = {}
    data.forEach(row => {
      obj[row['periodSalaryID']] = row
    })
    return obj
  }

  function groupByPeriodArr (data) {
    const obj = {}
    data.forEach(row => {
      if (!obj[row['periodSalaryID']]) obj[row['periodSalaryID']] = []
      obj[row['periodSalaryID']].push(row)
    })
    return obj
  }

  const accrual1 = groupByPeriod(getQueryPaySum() // Отриманий дохід
    .where('payElID.methodID.methodGroupID.groupType', '=', 'PAYMENT')
    .selectAsObject())
  const accrual2 = groupByPeriod(getQueryPaySum() // Заробітна плата
    .exists(
      UB.Repository('hr_idParam')
        .correlation('valuesID', 'payElID')
        .where('listParamID.code', 'in', ['FOZP', 'FDZP', 'ZKV'])
        .where('listParamID.tableName', '=', 'hr_payEl')
        .where('mi_deleteDate', '>=', '#maxdate')
    )
    .selectAsObject())
  const accrual3 = groupByPeriod(getQueryPaySum() // Податки
    .where('payElID.methodID.methodGroupID.code', '=', 127)
    .selectAsObject())
  const accrual4 = groupByPeriod(getQueryPaySum() // Аліменти
    .where('payElID.methodID.code', '=', '31')
    .selectAsObject())

  const dictPeriod = UB.Repository('hr_dictPeriod')
    .attrs('ID', 'name', 'dateFrom', 'dateTo')
    .where('dateFrom', '<=', periodTo)
    .where('dateTo', '>=', periodFrom)
    .where('orgID', '=', params.orgID)
    .orderBy('dateFrom')
    .selectAsObject()

  let allAccrual = []

  let accrual5 = groupByPeriodArr(UB.Repository('hr_accrual')
    .attrs('periodSalaryID', 'payElID', 'payElID.methodID.code', 'sum([paySum])', 'sum([baseSum])')
    .where('employeeNumberID', '=', params.employeeNumberID)
    .where('periodSalaryID.dateFrom', '<=', periodTo)
    .where('periodSalaryID.dateTo', '>=', periodFrom)
    .where('payElID.methodID.methodGroupID.code', '=', 127)
    .where(`(flagsRec & 8192 != 8192)`, 'custom')
    .groupBy(['periodSalaryID', 'payElID', 'payElID.methodID.code'])
    .selectAsObject({
      'sum([paySum])': 'paySum',
      'sum([baseSum])': 'baseSum',
      'payElID.methodID.code': 'methodCode'
    }))

  let accrualTotal = { c2: 0, c3: 0, c4: 0, c5: 0, c6: 0 }
  dictPeriod.forEach(period => {
    let obj = {
      c1: period.name,
      c2: getFixed2Val(accrual2[period.ID], 'sum([paySum])'),
      c3: 0,
      c4: getFixed2Val(((accrual1[period.ID] ? accrual1[period.ID]['sum([paySum])'] : 0) - (accrual2[period.ID] ? accrual2[period.ID]['sum([paySum])'] || 0 : 0))),
      c5: '0.00',
      c6: getFixed2Val(accrual4[period.ID], 'sum([paySum])')
    }

    if (accrual2[period.ID] && accrual1[period.ID] && accrual2[period.ID]['sum([paySum])'] === accrual1[period.ID]['sum([paySum])']) obj.c3 = accrual3[period.ID] ? accrual3[period.ID]['sum([paySum])'] : 0
    else {
      const currAcc = accrual5[period.ID] || []
      currAcc.forEach(row => {
        let zpSumByTax = UB.Repository('hr_accrual')
          .attrs('sum([paySum])')
          .where('employeeNumberID', '=', params.employeeNumberID)
          .where('periodSalaryID', '=', period.ID)
          .where(`(flagsRec & 8192 != 8192)`, 'custom')
          .exists(
            UB.Repository('hr_idParam')
              .correlation('valuesID', 'payElID')
              .where('listParamID.code', 'in', ['FOZP', 'FDZP', 'ZKV'])
              .where('listParamID.tableName', '=', 'hr_payEl')
              .where('mi_deleteDate', '>=', '#maxdate')
          )

        if (row.methodCode === '26') {
          zpSumByTax.exists(
            UB.Repository('hr_payElTaxIndivid')
              .correlation('payElID', 'payElID')
              .exists(
                UB.Repository('hr_payElTaxIndividEntry')
                  .correlation('taxIndividID', 'taxIndividID')
                  .where('payElID', '=', row.payElID)
                  .where('mi_deleteDate', '>=', '#maxdate')
              )
              .where('mi_deleteDate', '>=', '#maxdate')
          )
        } else {
          zpSumByTax.exists(
            UB.Repository('hr_payElEntry')
              .correlation('payElBaseID', 'payElID')
              .where('payElID', '=', row.payElID)
              .where('mi_deleteDate', '>=', '#maxdate')
          )
        }
        zpSumByTax = zpSumByTax.selectScalar() || 0
        obj.c3 += (zpSumByTax * row.paySum / row.baseSum)
      })
    }

    obj.c5 = getFixed2Val((accrual3[period.ID] ? accrual3[period.ID]['sum([paySum])'] : 0) - obj.c3)
    obj.c3 = getFixed2Val(obj.c3)

    Object.keys(accrualTotal).forEach(sum => {
      accrualTotal[sum] += (Number(obj[sum]) * 100)
    })
    allAccrual.push(obj)
  })

  const allSum = currencyService.currencyToWordsUkr((accrualTotal.c2 + accrualTotal.c4 - accrualTotal.c3 - accrualTotal.c5) / 100)

  Object.keys(accrualTotal).forEach(sum => {
    accrualTotal[sum] = getFixed2Val(accrualTotal[sum] / 100)
  })

  const periodFromYTable = dateService.formatDate(periodFrom, 'yy')
  const periodToYTable = dateService.formatDate(periodTo, 'yy')

  ctx.mParams.resultData = JSON.stringify({
    orgName: hrOrg.name || '&nbsp;',
    orgNameDat: hrOrg.nameDat,
    orgAddress,
    orgPhone,
    orgOKPOCode,
    employeeData,
    employeePosData,
    allAccrual,
    accrualTotal,
    periodFromYTable,
    periodToYTable: periodFromYTable !== periodToYTable ? periodToYTable : null,
    periodFromM: dictPeriod[0] ? dateService.formatDate(dictPeriod[0].dateFrom, 'mmm') : '',
    periodFromY: dictPeriod[0] ? dateService.formatDate(dictPeriod[0].dateFrom, 'yy') : '',
    periodToM: dictPeriod[dictPeriod.length - 1] ? dateService.formatDate(dictPeriod[dictPeriod.length - 1].dateTo, 'mmmm').toLocaleLowerCase() : '',
    periodToY: dictPeriod[dictPeriod.length - 1] ? dateService.formatDate(dictPeriod[dictPeriod.length - 1].dateTo, 'yy') : '',
    allSum: allSum ? allSum.toLocaleLowerCase() : null,
    accountant: params.accEmployeePositionID ? UB.Repository('hr_employeePositionS').attrs('employeeNumberID.employeeID.shortFIO').where('ID', '=', params.accEmployeePositionID).selectScalar() : null,
    currDateD: dateService.formatDate(params.currDate, 'dd'),
    currDateM: dateService.formatDate(params.currDate, 'mmmm'),
    currDateY: dateService.formatDate(params.currDate, 'yy'),
    headEmployeePosData
  })
}
me.getPaymentReportData = ctx => {
  let params = ctx.mParams.execParams
  const orgName = UB.Repository('hr_organization').attrs('name')
    .misc({ __mip_recordhistory_all: true }).where('ID', '=', params.orgID).selectScalar()
  let data = []
  const accEmployeeShortFIO = params.accEmployeeNumberID ? UB.Repository('hr_employeeNumberS')
    .attrs('employeeID.shortFIO')
    .where('ID', '=', params.accEmployeeNumberID)
    .selectScalar() : '&nbsp;'
  const accEmployeePos = params.accEmployeePositionID ? UB.Repository('hr_employeePositionSR')
    .attrs('posName')
    .where('ID', '=', params.accEmployeePositionID)
    .selectScalar() : ''
  params.periodFrom = dateService.shiftDate(params.periodFrom)
  params.periodTo = dateService.shiftDate(params.periodTo)

  const dateFromArr = dateService.formatDate(params.periodFrom, 'dd.mmm.yy').split('.')
  const dateToArr = dateService.formatDate(params.periodTo, 'dd.mmm.yy').split('.')
  JSON.parse(params.selectedRows).forEach(row => {
    const payRetention = UB.Repository('hr_payRetention')
      .attrs('docDate', 'docNumber', "COALESCE([execNameDoc], '&nbsp;')", 'docExecutive')
      .where('ID', '=', row.sourceID)
      .selectSingle({
        "COALESCE([execNameDoc], '&nbsp;')": 'execNameDoc'
      }) || {}

    if (payRetention.docDate) payRetention.docDate = dateService.formatDate(payRetention.docDate)
    if (!payRetention.execNameDoc) payRetention.execNameDoc = '&nbsp;'
    const employeeFullFIO = UB.Repository('hr_employeeNumberS')
      .attrs('employeeID.fullFIO')
      .where('ID', '=', row.employeeNumberID)
      .selectScalar() || '&nbsp;'
    // 1. Вибрати з розрахункового листа  Розрахунковий лист (hr_accrual) записи за умовою
    // відповідає вибраному виконавчому листу : hr_accrual.sourceID=Постійне утримання(hr_accrual.sourceID) (виконавчий лист вибраного рядка списку виконавчих листів)
    // розрахунковий період (hr_accrual. periodCalcID.hr_dictPeriod.dateFrom-hr_accrual. periodCalcID.hr_dictPeriod.dateTo) перетинається з періодом звіту
    // вид оплати має метод розрахунку="Аліменти"
    // Впорядкувати записи за зростанням періода розрахунка
    const accrual = UB.Repository('hr_accrual')
      .attrs('COALESCE([paySum], 0)', 'periodCalcID.dateFrom', '(COALESCE([incomingDebtSum], 0) + COALESCE([calculatedSum], 0) + COALESCE([repaymentDebtSum], 0) - COALESCE([repaymentSum], 0))',
        'rate', 'orderID', 'periodCalcID', 'periodCalcID.pYear', 'periodCalcID.dictMonthID.name', 'employeeNumberID',
        'payElID', 'payElID.methodID.methodGroupID.groupType')
      .where('sourceID', '=', row.sourceID)
      .where('periodCalc', '<=', params.periodTo)
      .where('periodCalc', '>=', params.periodFrom)
      .where('payElID.methodID.code', '=', '31')
      .where(`(flagsRec & 8192 != 8192)`, 'custom')
      .orderBy('periodCalcID.dateFrom')
      .selectAsObject({
        'COALESCE([paySum], 0)': 'paySum',
        'periodCalcID.pYear': 'year',
        'periodCalcID.dictMonthID.name': 'month',
        '(COALESCE([incomingDebtSum], 0) + COALESCE([calculatedSum], 0) + COALESCE([repaymentDebtSum], 0) - COALESCE([repaymentSum], 0))': 'debtSum',
        'payElID.methodID.methodGroupID.groupType': 'groupType'
      })
    const payElEntryKeyBy = {}
    UB.Repository('hr_payElEntry')
      .attrs('payElBaseID')
      .where('payElID', '=', row.payElID)
      .selectAsObject().forEach(payEl => {
        payElEntryKeyBy[payEl.payElBaseID] = true
      })

    const payRollKeyBy = {}
    UB.Repository('hr_payRoll')
      .attrs('ID', 'orderNumber', 'orderDate')
      .exists(
        UB.Repository('hr_accrual')
          .correlation('orderID', 'ID')
          .where('sourceID', '=', row.sourceID)
          .where('periodCalc', '<=', params.periodTo)
          .where('periodCalc', '>=', params.periodFrom)
          .where('payElID.methodID.code', '=', '31')
          .where(`(flagsRec & 8192 != 8192)`, 'custom')
      )
      .selectAsObject().forEach(payRoll => {
        payRollKeyBy[payRoll.ID] = payRoll
      })

    const accrualGrouped = new Map()

    accrual.forEach(item => {
      // 2.Згрупувати вибрані записи (Період; Відсоток; Відомість виплати)
      const group = { periodCalcID: item.periodCalcID, rate: item.rate, orderID: item.orderID }
      let currGroup
      if (!accrualGrouped.get(group)) {
        accrualGrouped.set(group, {
          year: item.year,
          month: item.month,
          paySum1: 0, // 10. sum(hr_accrual.paySum)
          paySum2: 0, // 11. sum(hr_accrual.paySum)
          rate: item.rate,
          paySum: 0,
          orderNumberDate: payRollKeyBy[item.orderID] ? UB.i18n(`{0} від {1}`, payRollKeyBy[item.orderID].orderNumber, dateService.formatDate(payRollKeyBy[item.orderID].orderDate)) : '',
          debtSum: 0
        })
      }
      currGroup = accrualGrouped.get(group)
      currGroup.paySum += (item.paySum * 100) // Сума
      currGroup.debtSum += (item.debtSum * 100) // Сума заборгованості
      // запис належить працівникові з поточного рядка списку
      // вид оплати належить списку видів оплати з налаштування виду оплати з документа з поточного рядка списку
      if (item.employeeNumberID === row.employeeNumberID && payElEntryKeyBy[item.payElID]) {
        if (item.groupType === 'PAYMENT') currGroup.paySum1 += (item.paySum * 100) // вид оплати має метод розрахунку, що належить групі методів з типом="Нарахування"
        if (item.groupType === 'OFFTAKE') currGroup.paySum2 += (item.paySum * 100) // вид оплати має метод розрахунку, що належить групі методів з типом="Утримання"
      }
    })

    const tableRows = []

    accrualGrouped.forEach(group => {
      group.paySum1 = getFixed2Val(group.paySum1 / 100)
      group.paySum2 = getFixed2Val(group.paySum2 / 100)
      group.paySum = getFixed2Val(group.paySum / 100)

      group.debtSum = group.debtSum > 0 ? UB.i18n(`Залишок несплаченої суми заборгованості складає {0}`, getFixed2Val(group.debtSum / 100)) : ''

      tableRows.push(group)
    })

    data.push({
      payRetention,
      orgName,
      accEmployeePos,
      accEmployeeShortFIO,
      employeeFullFIO,
      tableRows,
      dateFromD: dateFromArr[0],
      dateFromM: dateFromArr[1],
      dateFromY: dateFromArr[2],
      dateToD: dateToArr[0],
      dateToM: dateToArr[1],
      dateToY: dateToArr[2]
    })
  })

  if (data.length) data[data.length - 1].isLast = true
  ctx.mParams.resultData = JSON.stringify({ docs: data })
}

me.selectAccrualForPayment = ctx => {
  const sqlDialect = entityBaseService.getSQLDialect()
  ctx.dataStore.runSQL(`SELECT accrual.C1 AS tabNum, accrual.C2 AS fullFIO,
  CONCAT('№ ', B01.docNumber, ' від ', ${sqlDialect.dialect === 'MSSQL2012'
    ? `convert(varchar, B01.docDate, 104)` : `to_char(B01.docDate, 'DD.MM.YYYY')`}) AS docNumberDate, B02.fullName AS contractorFullName,
  B01.dateFrom AS dateFrom, ${sqlDialect.dialect === 'MSSQL2012' ? 'year(B01.dateTo)' : 'Extract(YEAR from B01.dateTo)'} when 9999 then null else B01.dateTo end) AS dateTo,
   accrual.C3 AS paySum, accrual.sourceID, accrual.employeeNumberID, B01.payElID
from
(SELECT
  A02.tabNum      AS C1,
  A03.fullFIO     AS C2,
  sum(A01.paySum) AS C3,
  A01.sourceID,
  A01.employeeNumberID
FROM hr_accrual A01 INNER JOIN hr_employeeNumber A02 ON A02.ID = A01.employeeNumberID AND A02.mi_deleteDate>='9999-12-31'
  LEFT JOIN hr_payEl A06 ON A06.ID = A01.payElID
  LEFT JOIN hr_employee A03 ON A03.ID = A02.employeeID
  LEFT JOIN hr_method A07 ON A07.ID = A06.methodID
  LEFT JOIN hr_dictPeriod A08 ON A08.ID=A01.periodCalcID
WHERE A07.code = '31' AND A01.flagsRec & 8192 != 8192 AND A08.dateFrom <= :dateTo: AND A08.dateTo >= :dateFrom: and A02.orgID=:orgID:
GROUP BY A01.employeeNumberID, A02.tabNum, A03.fullFIO, A01.sourceID) accrual
LEFT JOIN hr_payRetention B01 ON B01.ID=accrual.sourceID AND B01.mi_deleteDat>='9999-12-31'
LEFT JOIN ac_contractor B02 ON B02.ID = B01.contractorID AND B01.mi_deleteDate>='9999-12-31'
ORDER BY fullFIO, contractorFullName`, {
    dateFrom: ctx.mParams.customParams.dateFrom,
    dateTo: ctx.mParams.customParams.dateTo,
    orgID: ctx.mParams.customParams.orgID
  })
}

me.getCreditReportData = ctx => {
  let params = ctx.mParams.execParams
  params.periodFrom = dateService.shiftDate(params.periodFrom)
  params.periodTo = dateService.shiftDate(params.periodTo)

  const employee = params.employeeNumberID ? UB.Repository('hr_employeeNumberS')
    .attrs('employeeID.datName', 'employeeID.taxCode', 'dateFrom', 'posName')
    .where('ID', '=', params.employeeNumberID)
    .selectSingle({
      'employeeID.datName': 'datName',
      'employeeID.taxCode': 'taxCode'
    }) : {}

  const headEmployeeName = params.headEmployeePositionID ? UB.Repository('hr_employeePositionS')
    .attrs('employeeNumberID.employeeID.shortFIO')
    .where('ID', '=', params.headEmployeePositionID)
    .selectScalar() : ''

  const accEmployeeName = params.accEmployeePositionID ? UB.Repository('hr_employeePositionS')
    .attrs('employeeNumberID.employeeID.shortFIO')
    .where('ID', '=', params.accEmployeePositionID)
    .selectScalar() : ''

  employee.dateFrom = employee.dateFrom ? dateService.formatDate(employee.dateFrom) : ''

  const accrualSum = UB.Repository('hr_employeePositionSR')
    .attrs('accrualSum')
    .where('employeeNumberID', '=', params.employeeNumberID)
    .where('dateFrom', '<=', params.issueDate || params.currDate)
    .where('dateTo', '>=', params.issueDate || params.currDate)
    .selectScalar()

  const orgDat = UB.Repository('hr_organization').attrs('nameDat')
    .misc({ __mip_recordhistory_all: true }).where('ID', '=', params.orgID).selectScalar()

  const months = dateService.monthDiff(params.periodFrom, params.periodTo) + 1

  const periods = UB.Repository('hr_dictPeriod')
    .attrs('ID', 'name')
    .where('dateFrom', '>=', params.periodFrom)
    .where('dateFrom', '<=', params.periodTo)
    .where('orgID', '=', params.orgID)
    .orderBy('dateFrom')
    .selectAsObject()

  let currPeriod = UB.Repository('hr_dictPeriod')
    .attrs('pYear', 'dictMonthID.code', 'dateTo')
    .where('orgID', '=', params.orgID)
    .where('isCurrent', '=', true)
    .selectSingle({ 'dictMonthID.code': 'pMonth' })

  const accrualBalanceMonth = new Date(params.periodTo.getFullYear(), params.periodTo.getMonth(), 1) < new Date(currPeriod.pYear, currPeriod.pMonth, 1) ? params.periodTo : currPeriod.dateTo

  let accrualBalance = UB.Repository('hr_accrualBalance')
    .attrs('sum([sumFrom]-[sumPay])')
    .where('periodCalcID.dateFrom', '<=', accrualBalanceMonth)
    .where('periodCalcID.dateTo', '>=', accrualBalanceMonth)
    .where('employeeNumberID', '=', params.employeeNumberID)
    .selectScalar() || 0

  if (accrualBalance <= 0) {
    accrualBalance = 'не було'
  } else {
    let accrualBalanceStr = currencyService.currencyToWordsUkr(accrualBalance).toLowerCase()
    const accrualBalanceArr = accrualBalance.toFixed(2).split('.')
    const indexOfGrn = accrualBalanceStr.indexOf(' грив')
    accrualBalance = UB.i18n(`складає {0} ({1}){2}`, accrualBalanceArr[0], accrualBalanceStr.substr(0, indexOfGrn), accrualBalanceStr.substr(indexOfGrn, accrualBalanceStr.length))
  }

  const accrualByPeriod = {}
  UB.Repository('hr_accrual')
    .attrs('periodSalaryID', 'periodSalaryID.name',
      `sum(CASE WHEN [payElID.methodID.methodGroupID.groupType] = 'PAYMENT' THEN [paySum] ELSE 0 END)`,
      `sum(CASE WHEN [payElID.methodID.methodGroupID.code] = 127 THEN [paySum] ELSE 0 END)`,
      'sum(CASE WHEN [payElID.methodID.methodGroupID.code] = 129 THEN [paySum] ELSE 0 END)')
    .where('employeeNumberID', '=', params.employeeNumberID)
    .where('periodSalaryID.dateFrom', '>=', params.periodFrom)
    .where('periodSalaryID.dateFrom', '<=', params.periodTo)
    .where(`(flagsRec & 8192 != 8192)`, 'custom')
    .groupBy(['periodSalaryID', 'periodSalaryID.name', 'periodSalaryID.dateFrom'])
    .orderBy('periodSalaryID.dateFrom')
    .selectAsObject({
      'periodSalaryID.name': 'periodName',
      "sum(CASE WHEN [payElID.methodID.methodGroupID.groupType] = 'PAYMENT' THEN [paySum] ELSE 0 END)": 'sum1',
      'sum(CASE WHEN [payElID.methodID.methodGroupID.code] = 127 THEN [paySum] ELSE 0 END)': 'sum2',
      'sum(CASE WHEN [payElID.methodID.methodGroupID.code] = 129 THEN [paySum] ELSE 0 END)': 'sum3'
    }).forEach(item => {
      accrualByPeriod[item.periodSalaryID] = item
    })

  const accrualData = []
  let allSum = {
    sum1: 0,
    sum2: 0,
    sum3: 0,
    sum4: 0
  }

  periods.forEach(period => {
    const currData = accrualByPeriod[period.ID]

    if (currData) {
      currData.sum4 = (currData.sum1 || 0) - (currData.sum2 || 0) - (currData.sum3 || 0)

      let currObj = {
        periodDesc: period.name
      }
      let currSum
      for (let i = 1; i <= 4; i++) {
        currSum = 'sum' + i
        currObj[currSum] = getFixed2Val(currData[currSum])
        allSum[currSum] += ((currData[currSum] || 0) * 100)
      }

      accrualData.push(currObj)
    } else {
      accrualData.push({
        periodDesc: period.name,
        sum1: '0.00',
        sum2: '0.00',
        sum3: '0.00',
        sum4: '0.00'
      })
    }
  })

  const allSum1Word = currencyService.currencyToWordsUkr(allSum.sum1 / 100)
  const allSum4Word = currencyService.currencyToWordsUkr(allSum.sum4 / 100)

  for (let i = 1; i <= 4; i++) {
    allSum['sum' + i] = getFixed2Val(allSum['sum' + i] / 100)
  }

  ctx.mParams.resultData = JSON.stringify({
    employee,
    accrualSum,
    orgDat,
    months,
    accrualData,
    allSum,
    allSum1Word,
    allSum4Word,
    headEmployeeName,
    accEmployeeName,
    accrualBalance
  })
}
