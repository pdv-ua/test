/* global AC $App appAC UB _ */

exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    reportParams = (typeof reportParams === 'string') ? JSON.parse(reportParams) : reportParams
    return me.getData(reportParams).then(data => AC.reportService.generateReport(me.getParams(data), me))
  },

  getData (reportParams) {
    const dictProgClassIDs = reportParams.dictProgClassID.length ? JSON.stringify(reportParams.dictProgClassID.split(',').map(q => Number(q.trim().replace(/"/g, '')))) : null
    const dictFundSourceIDs = reportParams.dictFundSourceID.length ? JSON.stringify(reportParams.dictFundSourceID.split(',').map(q => Number(q.trim().replace(/"/g, '')))) : null
    return Promise.all([
      $App.connection.run({
        entity: 'hr_rl',
        method: 'getRL',
        orgID: reportParams.orgID,
        employeeNumberID: reportParams.employeeNumberID,
        periodID: reportParams.periodID,
        dictFundSourceIDs,
        dictProgClassIDs,
        detailBalance: true,
        noEmployeePart: true,
        isPrintForm: true
      }),
      UB.Repository('trf_position').attrs(['dictPositionID', 'dictPositionID.name', 'dictFundSourceID', 'dictFundSourceID.name', 'posIndex'])
        .where('workPlaceID.employeeNumberID', '=', reportParams.employeeNumberID)
        .where('workPlaceID.dateFrom', '<=', reportParams.dateTo)
        .where('workPlaceID.dateTo', '>=', reportParams.dateTo)
        .where('workPlaceID.documentID.orgID', '=', reportParams.orgID)
        .where('workPlaceID.state', '=', 'POSTED')
        .where('workPlaceID.documentID.type', '=', 'FACT')
        .where('workPlaceID.employeeNumberID.workPlaceCode', '<>', 5)
        .whereIf(dictProgClassIDs, 'dictProgClassID', 'in', reportParams.dictProgClassID.split(',').map(q => Number(q)))
        .whereIf(dictFundSourceIDs, 'dictFundSourceID', 'in', reportParams.dictFundSourceID.split(',').map(q => Number(q)))
        .selectAsObject({
          'dictFundSourceID.name': 'dictPositionFundSource', 'dictPositionID.name': 'dictPositionName'
        }),
      UB.Repository('hr_employeePositionS')
        .attrs(['dictPositionID', 'dictPositionID.name', 'dictFundSourceID', 'dictFundSourceID.name', 'employeeNumberID.tabNumSort', 'payElID.calcProportion'])
        .where('organizationID', '=', reportParams.orgID)
        .where('employeeNumberID', '=', reportParams.employeeNumberID)
        .where('employeeNumberID.workPlaceCode', '<>', 5)
        .where('dateFrom', '<=', AC.dateService.shiftDate(reportParams.dateTo))
        .where('dateTo', '>=', AC.dateService.shiftDate(reportParams.dateTo))
        .whereIf(dictProgClassIDs, 'dictProgClassID', 'in', reportParams.dictProgClassID.split(',').map(q => Number(q)))
        .whereIf(dictFundSourceIDs, 'dictFundSourceID', 'in', reportParams.dictFundSourceID.split(',').map(q => Number(q)))
        .where('isActive', '=', 1)
        .selectAsObject({
          'dictFundSourceID.name': 'dictPositionFundSource',
          'dictPositionID.name': 'dictPositionName',
          'employeeNumberID.tabNumSort': 'tabNumSort',
          'payElID.calcProportion': 'calcProportion'
        })
    ]).then((result) => {
      return result
    })
  },

  getParams: function (getData) {
    let data
    let dictEmployeePositions
    const useTariffing = AC.settings.get('hrTariffingEducational', appAC.globalOrganization())
    getData.forEach((o, index) => {
      if (!index) data = o
      if (!useTariffing && (index === 2)) {
        dictEmployeePositions = o.sort((a, b) => a.tabNumSort - b.tabNumSort)
      } else if (index === 1) {
        dictEmployeePositions = o.sort((a, b) => a.posIndex - b.posIndex)
      }
    })
    const emplInfo = getData[2]
    dictEmployeePositions = dictEmployeePositions.reduce((acc, item) => {
      if (acc.find(o => (o.dictPositionID === item.dictPositionID) && (o.dictFundSourceID === item.dictFundSourceID))) {
        return acc
      }
      return [...acc, item]
    }, [])

    const datesParams = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }
    const leaveWithoutPay = JSON.parse(data.resultData).accrual.filter(o => o.methodCode === '15')
    const resultData = JSON.parse(data.resultData).accrual.filter(o => o.paySum)
    const params = {
      periodDescription: '',
      orgName: appAC.globalOrganizationName(),
      tabNum: data.employeeData ? data.employeeData.tabNum : '',
      departmentName: data.employeeData ? data.employeeData.departmentName : '',
      employee: data.employeeData ? `${data.employeeData.fullFIO}` : '',
      position: data.employeeData ? data.employeeData.dictPositionName : '',
      timeSheets: data.employeeData ? UB.i18n(`{0} днів / {1} год.`, data.employeeData.planDay, data.employeeData.planHour) : '',
      sumAccrual: data.employeeData ? data.employeeData.accrualSum : '',
      orgSumFrom: data.balanceIn ? AC.currencyService.formatAsCurrency(data.balanceIn) : '0,00',
      fssuSumFrom: data.balanceInFssu ? AC.currencyService.formatAsCurrency(data.balanceInFssu) : '0,00',
      debtFirst: data.balanceOut ? AC.currencyService.formatAsCurrency(data.balanceOut) : '0,00',
      debtSec: data.balanceOutFssu ? AC.currencyService.formatAsCurrency(data.balanceOutFssu) : '0,00',
      payoutName: '',
      taxLimit: (data.employeeData && data.employeeData.taxLimit) ? data.employeeData.taxLimit : 'Пільга відсутня',
      planDay: data.employeeData ? (data.employeeData.planDay || '0 днів') : '',
      taxCode: data.employeeData ? data.employeeData.taxCode : ''
    }
    if (leaveWithoutPay.length) {
      const findMainPos = emplInfo.find(o => o.posIndex === 1)
      const mainPos = findMainPos || emplInfo[0]
      leaveWithoutPay.forEach(o => { o.workNorm = mainPos.calcProportion && (mainPos.calcProportion === 'HOUR') ? o.hours : o.days })
      params.leaveBlock = leaveWithoutPay
    }
    // group
    let groupAccrual = []
    resultData.forEach(acc => {
      let groupObj = groupAccrual.find(obj => obj.payType === acc.payType && obj.payElID === acc.payElID && obj.dateFrom === acc.dateFrom && obj.dateTo === acc.dateTo &&
        ((!acc.rate && !obj.rate) || obj.rate === acc.rate) && obj.dictPositionID === acc.dictPositionID)

      if (!groupObj) {
        if (!acc.rate) acc.rate = null
        groupAccrual.push(Object.assign({}, acc))
      } else {
        groupObj.days = groupObj.days || 0
        groupObj.hours = groupObj.hours || 0
        groupObj.paySum = AC.currencyService.round(groupObj.paySum += acc.paySum)
        // if (!(acc.flagsRec & 1 << 10 && acc.linkToParentID === groupObj.ID)) {
        groupObj.days = AC.currencyService.round(groupObj.days += acc.days)
        groupObj.hours = AC.currencyService.round(groupObj.hours += acc.hours)
        // }
      }
    })

    const accrualArr = groupAccrual.filter(item => item['payType'] === 'PAYMENT').map(o => {
      if (!o.dictPositionID) {
        const mainPosition = dictEmployeePositions.find(o => o.posIndex === 1) || { dictPositionName: false }
        o.dictPositionID = mainPosition.dictPositionID
        o.dictPositionName = mainPosition.dictPositionName
      }
      return o
    })

    let accrual = []
    let prevDictPositionID
    accrualArr.sort((a, b) => {
      return a.dictPositionID === b.dictPositionID ? AC.dateService.shiftDate(a.dateFrom) - AC.dateService.shiftDate(b.dateFrom) : a.dictPositionID - b.dictPositionID
    })
    accrualArr.forEach((item, index, array) => {
      if (item.days || item.hours || item.paySum) {
        const dateFrom = item.dateFrom ? item.dateFrom.toLocaleString('uk-UA', datesParams) : ''
        if (item.dictPositionID && (prevDictPositionID !== item.dictPositionID)) {
          accrual.push({
            dictPosition: {
              dictPositionName: item.dictPositionName
            }
          })
          prevDictPositionID = item.dictPositionID
        }
        accrual.push({
          payElNameAcc: item.description,
          paySumAcc: AC.currencyService.formatAsCurrency(item.paySum),
          periodAcc: `${AC.dateService.formatDate(dateFrom, 'mm')}.${AC.dateService.formatDate(dateFrom, 'yyyy')}`,
          daysAcc: item.days || item.hours ? `${item.days ? item.days : 0}/${item.hours ? AC.currencyService.formatAsCurrency(item.hours) : 0}` : '',
          payRate: item.rate,
          dictPositionID: item.dictPositionID
        })
      }
    })

    const paySumAccTotal = accrualArr.reduce((sum, item) => {
      sum += item.paySum
      return sum
    }, 0)
    params.paySumAccTotal = AC.currencyService.formatAsCurrency(paySumAccTotal)
    params.periodDescription = data.periodName ? data.periodName : data.period.name
    const keepsArr = groupAccrual.filter(item => item['payType'] === 'OFFTAKE').map(o => {
      if (!o.dictPositionID) {
        const mainPosition = dictEmployeePositions.find(o => o.posIndex === 1) || { dictPositionName: false }
        o.dictPositionID = mainPosition.dictPositionID
        o.dictPositionName = mainPosition.dictPositionName
      }
      return o
    })
    keepsArr.sort((a, b) => {
      return a.dictPositionID === b.dictPositionID ? AC.dateService.shiftDate(a.dateFrom) - AC.dateService.shiftDate(b.dateFrom) : a.dictPositionID - b.dictPositionID
    })
    let keeps = []
    prevDictPositionID = null
    keepsArr.forEach((item, index, array) => {
      if (item.paySum || item.rate) {
        const dateFrom = item.dateFrom.toLocaleString('uk-UA', datesParams)
        if (item.dictPositionID && (prevDictPositionID !== item.dictPositionID)) {
          keeps.push({
            dictPosition: { dictPositionName: item.dictPositionName }
          })
          prevDictPositionID = item.dictPositionID
        }

        keeps.push({
          firstSalKeep: !array.indexOf(item),
          payElNameKeep: item.description,
          paySumKeep: AC.currencyService.formatAsCurrency(item.paySum),
          periodKeep: `${AC.dateService.formatDate(dateFrom, 'mm')}.${AC.dateService.formatDate(dateFrom, 'yyyy')}`,
          keepRate: item.rate
        })
      }
    })

    const paySumKeepTotal = keepsArr.reduce((sum, item) => {
      sum += item.paySum
      return sum
    }, 0)
    params.paySumKeepTotal = AC.currencyService.formatAsCurrency(paySumKeepTotal)

    const paySumTotal = paySumAccTotal - paySumKeepTotal
    params.paySumTotal = AC.currencyService.formatAsCurrency(paySumTotal)

    const payouts = resultData.filter(item => item['payType'] === 'FORPAY')
    params.payouts = payouts.map(item => {
      const dateFrom = item.dateFrom.toLocaleString('uk-UA', datesParams)
      const dateTo = item.dateTo.toLocaleString('uk-UA', datesParams)

      return {
        payoutName: item.name,
        payoutDate: AC.dateService.formatDate(item.orderDate),
        payoutPeriod: `${AC.dateService.formatDate(dateFrom)} - ${AC.dateService.formatDate(dateTo)}`,
        payoutSum: AC.currencyService.formatAsCurrency(item.paySum)
      }
    })

    const payoutSumTotal = payouts.reduce((sum, item) => {
      sum += item.paySum
      return sum
    }, 0)
    params.dictEmployeePositions = dictEmployeePositions
    params.payEl = accrual
    params.keeps = keeps
    params.showTitle = accrual.length || keeps.length
    params.payoutSumTotal = AC.currencyService.formatAsCurrency(payoutSumTotal)
    return AC.reportService.removeEmptyValues(params)
  }
}
