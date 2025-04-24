/* global UB AC appAC $App _ */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    reportParams = (typeof reportParams === 'string') ? JSON.parse(reportParams) : reportParams
    return me.getReportData(reportParams).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (reportParams) {
    const pDate = appAC.globalApplicationDate()
    const result = {
      empName: '',
      empPosition: '',
      onDate: AC.dateService.formatDate(pDate),
      rows: [],
      totals: []
    }

    const employeeNumber = await UB.Repository('hr_employeeNumberS')
      .attrs(['ID', 'orgID'])
      .where('orgID.state', '=', 'ACTIVE')
      .where('orgID.mi_dateFrom', '<=', pDate)
      .where('orgID.mi_dateTo', '>=', pDate)
      .where('orgID.mi_deleteDate', '=', AC.dateService.maxDate())
      .whereIf(reportParams.employeeNumberID, 'ID', '=', reportParams.employeeNumberID)
      .whereIf(!reportParams.employeeNumberID, 'employeeID', '=', reportParams.employeeID)
      .whereIf(!reportParams.employeeNumberID, 'tabNum', '=', reportParams.tabNum)
      .selectSingle()

    const organizationID = employeeNumber.orgID

    const fixMonth = AC.settings.get('hrVacFixMonth', organizationID) || 0

    result.empName = await UB.Repository('hr_employee')
      .attrs(['fullFIO'])
      .where('ID', '=', reportParams.employeeID)
      .selectScalar()

    const employeePosition = await UB.Repository('hr_employeePositionS')
      .attrs(['positionID'])
      .where('dateFrom', '<=', pDate)
      .where('dateTo', '>=', pDate)
      .where('employeeNumberID', '=', (employeeNumber ? employeeNumber.ID : 0))
      .selectScalar()

    let positionFullNameNom = ''
    const posNames = await UB.Repository('hr_position')
      .attrs(['fullName', 'fullNameNom'])
      .where('mi_data_id', '=', employeePosition || 0)
      .where('state', '=', 'ACTIVE')
      .misc({ __mip_ondate: pDate })
      .selectSingle()
    if (posNames) {
      positionFullNameNom = posNames.fullNameNom || posNames.fullName || ''
    }

    result.empInfo = (result.empName || '') + (result.empName && positionFullNameNom ? ', ' : '') + positionFullNameNom

    const periods = await UB.Repository('hr_empVacationPeriod')
      .attrs(['ID', 'dateFrom', 'dateTo', 'dayCountPlan', 'dayCountFact', 'dayDiff', 'dayFix',
        'empVacationPlanID', 'empVacationPlanID.dictVacationKindID', 'empVacationPlanID.dictVacationKindID.name'])
      .where('empVacationPlanID.employeeNumberID', '=', (employeeNumber ? employeeNumber.ID : 0))
      .where('mi_deleteDate', '>=', '#maxdate')
      .where('empVacationPlanID.mi_deleteDate', '>=', '#maxdate')
      .where('dayCountPlan', '!=', 0, 'planNotNull')
      .where('dayCountFact', '!=', 0, 'factNotNull')
      .where('dayDiff', '!=', 0, 'diffNotNull')
      .logic('(([planNotNull]) or ([factNotNull]) or ([diffNotNull]))')
      .orderBy('empVacationPlanID.dictVacationKindID.name')
      .orderBy('dateFrom')
      .orderBy('dateTo')
      .selectAsObject()

    let orders = await UB.Repository('hr_employeeVacation')
      .attrs(['empVacationPeriodID', 'orderID', 'dayCount', 'orderNumber', 'orderDate', 'orderID.orderNumberFullView',
        'paraID'])
      .where('employeeNumberID.mi_deleteDate', '>=', '#maxdate')
      .where('employeeNumberID', '=', (employeeNumber ? employeeNumber.ID : 0))
      .where('mi_deleteDate', '>=', '#maxdate')
      .where('empVacationPeriodID.mi_deleteDate', '>=', '#maxdate')
      .selectAsObject({
        'orderID.orderNumberFullView': 'orderNumberFullView'
      })
    const ids = orders && orders.length ? _.compact(orders.map(el => el.paraID)) : []

    const empOrderVacationListDet = ids && ids.length ? await UB.Repository('hr_empOrderVacationListDet')
      .attrs(['ID', 'isContinuous'])
      .where('ID', 'in', ids)
      .selectAsObject() : []

    _.forEach(orders, function (el) {
      const item = empOrderVacationListDet ? _.find(empOrderVacationListDet, { ID: el.paraID }) : undefined
      el.isContinuous = item ? item.isContinuous : false
    })

    orders = orders ? _.groupBy(orders, 'empVacationPeriodID') : []

    const plans = await UB.Repository('hr_empVacationPlan')
      .attrs(['dictVacationKindID', 'dictVacationKindID.name'])
      .where('employeeNumberID', '=', (employeeNumber ? employeeNumber.ID : 0))
      .where('mi_deleteDate', '>=', '#maxdate')
      .groupBy(['dictVacationKindID', 'dictVacationKindID.name'])
      .orderBy('dictVacationKindID.name')
      .selectAsObject()

    const showFixDays = fixMonth > 0
    const colSpan1 = showFixDays ? 5 : 4
    const colSpan2 = showFixDays ? 7 : 6
    const colSpan3 = showFixDays ? 8 : 7

    _.forEach(periods, function (el) {
      if (el.dateFrom.getFullYear() <= pDate.getFullYear()) {
        const data = {
          // periodName: `${AC.dateService.formatDate(el.dateFrom)} - ${'&nbsp;'.repeat(4)} ${AC.dateService.formatDate(el.dateTo)}`,
          periodName: `${AC.dateService.formatDate(el.dateFrom)} - ${AC.dateService.formatDate(el.dateTo)}`,
          vacationName: el['empVacationPlanID.dictVacationKindID.name'],
          dayCountPlan: el.dayCountPlan || 0,
          dayCountFact: el.dayCountFact || 0,
          dayDiff: el.dayDiff || 0,
          dayFix: el.dayFix || 0,
          orders: [],
          showFixDays,
          colSpan1,
          colSpan2,
          colSpan3
        }
        if (orders[el.ID]) {
          const orderByID = _.groupBy(orders[el.ID], 'orderID')
          _.forEach(orderByID, function (orders) {
            const order = orders[0]
            const dayCount1 = orders.filter(o => !o.isContinuous).reduce((res, item) => res + (item.dayCount || 0), 0)
            const dayCount2 = orders.filter(o => o.isContinuous).reduce((res, item) => res + (item.dayCount || 0), 0)
            const text = UB.i18n(`Наказ № {0} від {1}`, order.orderNumberFullView || order.orderNumber, AC.dateService.formatDate(order.orderDate)) +
              (dayCount1 || dayCount2 ? ' (' : '') + (dayCount1 ? `${dayCount1} ${UB.i18n('д.')}` : '') +
              (dayCount1 && dayCount2 ? '; ' : '') + (dayCount2 ? `${dayCount2} ${UB.i18n('д.')} ${UB.i18n('нерозр.')}` : '') +
              (dayCount1 || dayCount2 ? ')' : '')
            data.orders.push({ value: text })
          })
        }
        const planItem = plans ? _.find(plans, { dictVacationKindID: el['empVacationPlanID.dictVacationKindID'] }) : undefined
        if (planItem) {
          if (!planItem.dayDiff) {
            planItem.dayDiff = 0
          }
          planItem.dayDiff += el.dayDiff
        }
        result.rows.push(data)
      }
    })

    const total = {
      vacationName: UB.i18n('Всього'),
      daysPlanDiff: 0,
      daysDiff: 0,
      daysFix: 0,
      showFixDays,
      colSpan1,
      colSpan2,
      colSpan3
    }
    for (let i = 0; i < plans.length; i++) {
      const empVacData = await $App.connection.run({
        entity: 'hr_empVacationPlan',
        method: 'getDataReq',
        orgID: organizationID,
        employeeNumberID: employeeNumber ? employeeNumber.ID : 0,
        dictVacationKindID: plans[i].dictVacationKindID,
        onDate: pDate,
        isGrouped: true
      })
      const empVac = JSON.parse(empVacData.resultData)

      const data = {
        vacationName: plans[i]['dictVacationKindID.name'],
        daysPlanDiff: plans[i].dayDiff,
        daysDiff: empVac && empVac.length > 0 ? empVac.reduce((res, item) => res + (item.daysDiff || 0), 0) : 0
      }
      total.daysPlanDiff += data.daysPlanDiff || 0
      total.daysDiff += data.daysDiff || 0
      result.totals.push(data)
    }
    result.totals.push(total)
    result.showFixDays = showFixDays
    result.colSpan1 = colSpan1
    result.colSpan2 = colSpan2
    result.colSpan3 = colSpan3

    return result
  }
}
