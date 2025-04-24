/* global AC UB HR */

exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    return me.getReportData(reportParams).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },

  getReportData: async function (reportParams) {
    const showAddDescrPerson = AC.settings.get('hrShowAddDescrPerson', reportParams.organizationID)
    const useActualPositionName = AC.settings.get('hrOrderActualPositionName', reportParams.organizationID)
    const fieldList = ['tabNum', 'fullFIO', 'posName', 'dictVacationKindName', 'dayCount', 'childAge', 'orgName',
      'vacDescription', 'vdateFrom', 'vdateTo', 'depName', 'selfStructDepName', 'employeeNumberID', 'orderID', 'workPlace']
    if (showAddDescrPerson) fieldList.push('addDescrPerson')
    if (useActualPositionName) fieldList.push('actualPositionName')
    const rowsQuery = Object.assign({
      entity: 'hr_empListUnpaidLongVac',
      method: 'search',
      fieldList: fieldList
    }, reportParams)

    const [
      { resultData: resData }
    ] = await UB.connection.runTransAsObject([rowsQuery])

    const params = {
      personTable: resData.map((row, index) => {
        const dateFrom = row.vdateFrom ? AC.dateService.formatDate(row.vdateFrom) : ''
        const dateTo = row.vdateTo ? AC.dateService.formatDate(row.vdateTo) : ''
        return Object.assign({}, row, {
          showAddDescrPerson: showAddDescrPerson,
          pn: index + 1,
          vdateFrom: dateFrom,
          vdateTo: dateTo,
          depFirst: HR.reportUtils.getReportDepStructFld(row.depName, row.selfStructDepName)
        })
      }),
      showAddDescrPerson: showAddDescrPerson,
      useActualPositionName: useActualPositionName,
      colSpan: 14 + (showAddDescrPerson ? 1 : 0) + (useActualPositionName ? 1 : 0),
      colSpan2: 13 + (showAddDescrPerson ? 1 : 0) + (useActualPositionName ? 1 : 0),
      tableWidth: 1750 + (showAddDescrPerson ? 200 : 0) + (useActualPositionName ? 200 : 0),
      period: reportParams.dateFrom && reportParams.dateTo ? UB.i18n(`з {0} по {1}`, AC.dateService.formatDate(reportParams.dateFrom), AC.dateService.formatDate(reportParams.dateTo)) : '',
      onDate: reportParams.onDate ? AC.dateService.formatDate(reportParams.onDate) : '',
      dateFrom: reportParams.dateFrom ? AC.dateService.formatDate(reportParams.dateFrom) : '',
      daySum: 0
    }
    params.daySum = resData.reduce((acc, row) => acc + (row.dayCount || 0), 0)
    params.organizationName = await HR.reportUtils.getNameOrganization(reportParams.onDate, reportParams.organizationID)
    params.departmentName = await HR.reportUtils.getNameDepartment(reportParams.onDate, reportParams.organizationID, reportParams.departmentID)

    return AC.reportService.removeEmptyValues(params)
  }

}
