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
      UB.Repository('hr_employeeWorkbook')
        .attrs(['ID', 'dateFrom', 'dateToEmpty', 'appointOrder', 'dismOrder', 'workPosition', 'workPlace',
          'description', 'appointReason', 'dischargeReason', 'positionType.name', 'isAuto'])
        .where('employeeID', '=', reportParams.instanceID)
        .orderBy('dateFrom', 'asc')
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
        .selectSingle()
    ]).then(([employeeWorkbook, employeeInfo, employeeInfoLast]) => ({
      employeeWorkbook,
      employeeInfo,
      employeeInfoLast
    }))
  },
  getParams: function (data) {
    const empInfo = data.employeeInfo || data.employeeInfoLast || null
    const result = {
      title1: empInfo ? empInfo['employeeID.fullFIO'] || '' : '',
      title2: empInfo ? empInfo['positionID.fullName'] || empInfo['positionID.name'] || '' : '',
      currDate: AC.dateService.formatDate(new Date()),
      rows: data.employeeWorkbook.map(item => {
        return {
          dateFrom: item.dateFrom ? AC.dateService.formatDate(item.dateFrom) : '',
          dateToEmpty: item.dateToEmpty ? AC.dateService.formatDate(item.dateToEmpty) : '',
          appointOrder: item.appointOrder || '',
          dismOrder: item.dismOrder || '',
          workPosition: item.workPosition || '',
          workPlace: item.workPlace || '',
          description: item.description || '',
          appointReason: item.appointReason || '',
          dischargeReason: item.dischargeReason || '',
          positionType: item['positionType.name'] || '',
          isAuto: item.isAuto ? UB.i18n('Так') : UB.i18n('Ні')
        }
      })
    }

    return AC.reportService.removeEmptyValues(result)
  }
}
