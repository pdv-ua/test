/* global UB AC */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    reportParams = (typeof reportParams === 'string') ? JSON.parse(reportParams) : reportParams
    return me.getData(reportParams).then(data => AC.reportService.generateReport(me.getParams(data), me))
  },
  getData (reportParams) {
    const onDate = AC.dateService.todayDate()
    return Promise.all([
      UB.Repository('hr_employeeWorkbookDt')
        .attrs(['dictExperienceID', 'dictExperienceID.name', 'dateFrom', 'dateTo', 'coefficient',
          'employeeWorkbookID.dateFrom', 'employeeWorkbookID.dateToEmpty', 'employeeWorkbookID.appointOrder',
          'employeeWorkbookID.dismOrder', 'employeeWorkbookID.workPosition', 'employeeWorkbookID.workPlace',
          'employeeWorkbookID.description', 'employeeWorkbookID.appointReason', 'employeeWorkbookID.dischargeReason',
          'employeeWorkbookID.positionType.name', 'employeeWorkbookID.isAuto'])
        .where('employeeWorkbookID.employeeID', '=', reportParams.instanceID)
        .where('employeeWorkbookID.mi_deleteDate', '>=', '#maxdate')
        .orderBy('employeeWorkbookID.dateFrom', 'asc')
        .orderBy('employeeWorkbookID', 'asc')
        .orderBy('dictExperienceID.name', 'asc')
        .selectAsObject(),
      UB.Repository('hr_employeePositionS')
        .attrs(['positionID.fullName', 'positionID.name', 'organizationID.name', 'employeeID.fullFIO'])
        .where('employeeID', '=', reportParams.instanceID)
        .where('employeeNumberID', '=', reportParams.employeeNumberID)
        .where('employeeID.mi_deleteDate', '>=', '#maxdate')
        .where('positionID.state', '=', 'ACTIVE')
        .where('positionID.mi_dateFrom', '<=', onDate)
        .where('positionID.mi_dateTo', '>=', onDate)
        .where('positionID.mi_deleteDate', '>=', '#maxdate')
        .joinCondition('organizationID.mi_dateFrom', '<=', onDate)
        .joinCondition('organizationID.mi_dateTo', '>=', onDate)
        .joinCondition('organizationID.mi_deleteDate', '>=', '#maxdate')
        .joinCondition('organizationID.state', '=', 'ACTIVE')
        .selectSingle(),
      UB.Repository('hr_employeePositionS')
        .attrs(['positionID.fullName', 'positionID.name', 'organizationID.name', 'employeeID.fullFIO'])
        .where('employeeID', '=', reportParams.instanceID)
        .where('employeeNumberID', '=', reportParams.employeeNumberID)
        .where('employeeID.mi_deleteDate', '>=', '#maxdate')
        .where('positionID.state', '=', 'ACTIVE')
        .where('positionID.mi_deleteDate', '>=', '#maxdate')
        .joinCondition('organizationID.mi_dateFrom', '<=', onDate)
        .joinCondition('organizationID.mi_dateTo', '>=', onDate)
        .joinCondition('organizationID.mi_deleteDate', '>=', '#maxdate')
        .joinCondition('organizationID.state', '=', 'ACTIVE')
        .orderBy('positionID.mi_dateFrom', 'desc')
        .orderBy('positionID.mi_dateTo', 'desc')
        .selectSingle(),
      UB.Repository('hr_employeeExperience')
        .attrs(['dictExperienceID.name', 'calcDate', 'startCalcDate'])
        .where('employeeID', 'in', reportParams.instanceID)
        .orderBy('calcDate')
        .orderBy('dictExperienceID.name')
        .selectAsObject()
    ]).then(([employeeWorkbookDt, employeeInfo, employeeInfoLast, experience]) => ({
      employeeWorkbookDt,
      employeeInfo,
      employeeInfoLast,
      experience
    }))
  },
  getParams: function (data) {
    const empInfo = data.employeeInfo || data.employeeInfoLast || null
    let aTitle = ''
    if (empInfo) {
      aTitle = empInfo['employeeID.fullFIO'] || ''
      aTitle += '<br />' + [empInfo['positionID.fullName'] || empInfo['positionID.name'] || '', empInfo['organizationID.name'] || ''].join(', ')
    }

    const currDate = AC.dateService.todayDate()
    const result = {
      title: aTitle,
      rows: data.employeeWorkbookDt.map(item => {
        const ymd = AC.dateService.getYmd(item.dateFrom, item.dateTo || currDate, true)
        const cd = item.dateFrom < (item.dateTo || currDate) ? (AC.dateService.dateDiff(item.dateFrom, item.dateTo || currDate) || 0) + 1 : 0
        return {
          dateFromDt: item.dateFrom ? AC.dateService.formatDate(item.dateFrom) : '',
          dateToDt: item.dateTo ? AC.dateService.formatDate(item.dateTo) : '',
          dictExperienceName: item['dictExperienceID.name'] || '',
          years: ymd.years,
          months: ymd.months,
          days: ymd.days,
          countDays: cd,
          countDays2: cd ? Math.floor(cd * (item.coefficient || 1)) : '',
          coefficient: item.coefficient || 1,
          dateFrom: item['employeeWorkbookID.dateFrom'] ? AC.dateService.formatDate(item['employeeWorkbookID.dateFrom']) : '',
          dateToEmpty: item['employeeWorkbookID.dateToEmpty'] ? AC.dateService.formatDate(item['employeeWorkbookID.dateToEmpty']) : '',
          appointOrder: item['employeeWorkbookID.appointOrder'] || '',
          dismOrder: item['employeeWorkbookID.dismOrder'] || '',
          workPosition: item['employeeWorkbookID.workPosition'] || '',
          workPlace: item['employeeWorkbookID.workPlace'] || '',
          description: item['employeeWorkbookID.description'] || '',
          appointReason: item['employeeWorkbookID.appointReason'] || '',
          dischargeReason: item['employeeWorkbookID.dischargeReason'] || '',
          positionType: item['employeeWorkbookID.positionType.name'] || '',
          isAuto: item['employeeWorkbookID.isAuto'] ? UB.i18n('Так') : UB.i18n('Ні')
        }
      }),
      experience: data.experience.map(item => {
        const ymd = AC.dateService.getYmd(item.calcDate, item.startCalcDate && item.startCalcDate < currDate ? item.startCalcDate : currDate, true)
        return {
          name: item['dictExperienceID.name'],
          calcDate: item.calcDate ? AC.dateService.formatDate(item.calcDate) : '',
          years: ymd.years,
          months: ymd.months,
          days: ymd.days
        }
      })
    }

    return AC.reportService.removeEmptyValues(result)
  }
}
