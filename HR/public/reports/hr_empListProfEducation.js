/* global UB, AC, HR */

exports.reportCode = {
  buildReport (reportParams) {
    const me = this
    const showAddDescrPerson = AC.settings.get('hrShowAddDescrPerson', reportParams.execParams.organizationID)
    const useActualPositionName = AC.settings.get('hrOrderActualPositionName', reportParams.organizationID) === true
    const organizationQuery = HR.reportUtils.getOrganizationQuery(reportParams.execParams.onDate, reportParams.execParams.organizationID)
    const departmentQuery = HR.reportUtils.getDepartmentQuery(reportParams.execParams.onDate, reportParams.execParams.organizationID, reportParams.execParams.departmentID)

    return UB.connection.runTransAsObject([
      organizationQuery,
      departmentQuery
    ])
      .then(([orgResp, depResp]) => {
        let rows = reportParams.gridData || []

        rows.forEach(row => {
          row.showAddDescrPerson = showAddDescrPerson
          row.useActualPositionName = useActualPositionName
          row.dateFrom = row.dateFrom ? AC.dateService.formatDate(row.dateFrom) : ''
          row.dateTo = row.dateTo ? AC.dateService.formatDate(row.dateTo) : ''
        })

        let organizationName = ''
        if (orgResp && orgResp.resultData && orgResp.resultData[0]) {
          organizationName = orgResp.resultData[0].name
        }
        let departmentName = ''
        if (depResp && depResp.resultData && depResp.resultData[0]) {
          departmentName = depResp.resultData[0].name
        }

        return AC.reportService.generateReport(
          Object.assign({ rows }, {
            showAddDescrPerson,
            useActualPositionName,
            colSpan:  12 + (showAddDescrPerson ? 1 : 0) + (useActualPositionName ? 1 : 0),
            tableWidth: 1380 + (showAddDescrPerson ? 100 : 0) + (useActualPositionName ? 200 : 0),
            onDate: AC.dateService.formatDate(reportParams.onDate),
            organizationName,
            departmentName
          }),
          me
        )
      })
  }
}
