/* global AC UB HR  */

exports.reportCode = {

  buildReport (reportParams) {
    const me = this
    const showAddDescrPerson = AC.settings.get('hrShowAddDescrPerson', reportParams.organizationID)

    const rowsQuery = Object.assign({
      entity: 'hr_empListByExperience',
      method: 'search'
    }, reportParams)

    const organizationQuery = HR.reportUtils.getOrganizationQuery(reportParams.onDate, reportParams.organizationID)
    const departmentQuery = HR.reportUtils.getDepartmentQuery(reportParams.onDate, reportParams.organizationID, reportParams.departmentID)

    return UB.connection.runTransAsObject([
      rowsQuery,
      organizationQuery,
      departmentQuery
    ])
      .then(([rowsResp, orgResp, depResp]) => {
        const rows = rowsResp.resultData.map((row, index) => {
          return Object.assign({}, row, {
            showAddDescrPerson: showAddDescrPerson,
            index: index + 1,
            fullFIO: row.fullFIO ? row.fullFIO.trim().replace(/^(.*?)\s(.*)/g, (match, p1, p2) => [p1.toUpperCase(), p2].join(' ')) : '',
            rankDateFrom: row.rankDateFrom ? AC.dateService.formatDate(row.rankDateFrom) : '',
            rankDateNext: row.rankDateNext ? AC.dateService.formatDate(row.rankDateNext) : '',
            depName: HR.reportUtils.getReportDepStructFld(row.depID, row.depName),
            depFirst: HR.reportUtils.getReportDepStructFld(row.depID, row.depFirst)
          })
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
            showAddDescrPerson: showAddDescrPerson,
            colSpan: showAddDescrPerson ? 12 : 11,
            tableWidth: showAddDescrPerson ? 1740 : 1540,
            onDate: AC.dateService.formatDate(reportParams.onDate),
            organizationName,
            departmentName
          }),
          me
        )
      })
  }
}
