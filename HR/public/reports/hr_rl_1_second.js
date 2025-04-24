/* global AC $App UB */

exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    reportParams = (typeof reportParams === 'string') ? JSON.parse(reportParams) : reportParams
    return me.getData(reportParams).then(data => AC.reportService.generateReport(me.getParams(data), me))
  },

  getData (reportParams) {
    return $App.connection.run({
      entity: 'hr_rl',
      method: 'getRL',
      orgID: reportParams.orgID,
      employeeNumberID: reportParams.employeeNumberID,
      periodID: reportParams.periodID,
      detailBalance: true,
      noEmployeePart: true,
      isPrintForm: true
    }).then(response => {
      return (response)
    })
  },

  getParams: function (data) {
    const datesParams = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }
    // const resultData = JSON.parse(data.rl.resultData).accrual

    const resultData = JSON.parse(data.resultData).accrual
    const params = {
      periodDescription: '',
      departmentName: data.employeeData ? data.employeeData.departmentName : '',
      employee: data.employeeData ? `${data.employeeData.tabNum} ${data.employeeData.fullFIO}` : '',
      position: data.employeeData ? data.employeeData.factPosName : '',
      timeSheets: data.employeeData ? UB.i18n(`{0} днів / {1} год.`, data.employeeData.planDay, data.employeeData.planHour) : '',
      sumAccrual: data.employeeData ? `${data.employeeData.accrualSum ? data.employeeData.accrualSum : 0}${data.employeeData.mtCount && data.employeeData.accrualSum ? ` (${data.employeeData.mtCount} ст.)` : ''}` : '',
      orgSumFrom: data.balanceIn ? AC.currencyService.formatAsCurrency(data.balanceIn) : '0,00',
      fssuSumFrom: data.balanceInFssu ? AC.currencyService.formatAsCurrency(data.balanceInFssu) : '0,00',
      debtFirst: data.balanceOut ? AC.currencyService.formatAsCurrency(data.balanceOut) : '0,00',
      debtSec: data.balanceOutFssu ? AC.currencyService.formatAsCurrency(data.balanceOutFssu) : '0,00',
      payoutName: '',
      taxLimit: (data.employeeData && data.employeeData.taxLimit) ? data.employeeData.taxLimit : 'Пільга відсутня'
    }

    // group
    let groupAccrual = []
    resultData.forEach(acc => {
      let groupObj = groupAccrual.find(obj => obj.payType === acc.payType && obj.payElID === acc.payElID && obj.dateFrom === acc.dateFrom && obj.dateTo === acc.dateTo &&
          ((!acc.rate && !obj.rate) || obj.rate === acc.rate))

      if (!groupObj) {
        if (acc.rate === 0)acc.rate = null
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

    const accrualArr = groupAccrual.filter(item => item['payType'] === 'PAYMENT')
    accrualArr.sort((a, b) => {
      if (a.periodSalaryID === b.periodSalaryID) {
        if (a.code === b.code) {
          return AC.dateService.shiftDate(a.dateFrom) - AC.dateService.shiftDate(b.dateFrom)
        }
        return a.code - b.code
      }
      return AC.dateService.shiftDate(a.periodSalary) - AC.dateService.shiftDate(b.periodSalary)
    })

    let prevPeriodSalaryID
    let accrual = []
    accrualArr.forEach(item => {
      if (item.days || item.hours || item.paySum) {
        const dateFrom = item.dateFrom ? item.dateFrom.toLocaleString('uk-UA', datesParams) : ''
        const dateTo = item.dateTo ? item.dateTo.toLocaleString('uk-UA', datesParams) : ''
        if (prevPeriodSalaryID !== item.periodSalaryID) {
          accrual.push({ periodSalaryAcc: { perSalAccName: item['periodSalaryID.name'] } })
          prevPeriodSalaryID = item.periodSalaryID
        }

        accrual.push({
          payElNameAcc: item.description,
          paySumAcc: AC.currencyService.formatAsCurrency(item.paySum),
          periodAcc: `${AC.dateService.formatDate(dateFrom)} - ${AC.dateService.formatDate(dateTo)}`,
          daysAcc: item.days || item.hours ? `${item.days ? item.days : 0}/${item.hours ? item.hours : 0}` : '',
          payRate: item.rate
        })
      }
    })

    const paySumAccTotal = accrualArr.reduce((sum, item) => {
      sum += item.paySum
      return sum
    }, 0)
    params.paySumAccTotal = AC.currencyService.formatAsCurrency(paySumAccTotal)
    // params.periodDescription = resultData.length ? resultData[0].periodName : data.periodName
    params.periodDescription = data.periodName ? data.periodName : data.period.name
    const keepsArr = groupAccrual.filter(item => item['payType'] === 'OFFTAKE')
    keepsArr.sort((a, b) => {
      if (a.periodSalaryID === b.periodSalaryID) {
        if (a.code === b.code) {
          return AC.dateService.shiftDate(a.dateFrom) - AC.dateService.shiftDate(b.dateFrom)
        }
        return a.code - b.code
      }
      return AC.dateService.shiftDate(a.periodSalary) - AC.dateService.shiftDate(b.periodSalary)
    })
    prevPeriodSalaryID = null
    let keeps = []
    keepsArr.forEach(item => {
      if (item.paySum || item.rate) {
        const dateFrom = item.dateFrom.toLocaleString('uk-UA', datesParams)
        const dateTo = item.dateTo.toLocaleString('uk-UA', datesParams)
        if (prevPeriodSalaryID !== item.periodSalaryID) {
          keeps.push({ periodSalaryKeep: { perSalKeepName: item['periodSalaryID.name'] } })
          prevPeriodSalaryID = item.periodSalaryID
        }

        keeps.push({
          payElNameKeep: item.description,
          paySumKeep: AC.currencyService.formatAsCurrency(item.paySum),
          periodKeep: `${AC.dateService.formatDate(dateFrom)} - ${AC.dateService.formatDate(dateTo)}`,
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
    const iter = accrual.length >= keeps.length ? accrual.length : keeps.length
    let result = []
    const joinArr = (accrual, keeps) => {
      for (let i = 0; i <= iter; i++) {
        if (keeps[i] === undefined || null) {
          keeps[i] = ''
        } else if (accrual[i] === undefined || null) {
          accrual[i] = ''
        }
        let arrSum = Object.assign({}, accrual[i], keeps[i])
        result[i] = arrSum
      }
      return result
    }
    result = joinArr(accrual, keeps)
    params.payEl = result

    params.payoutSumTotal = AC.currencyService.formatAsCurrency(payoutSumTotal)
    return AC.reportService.removeEmptyValues(params)
  }
}
