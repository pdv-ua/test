/* global AC UB HR */

exports.reportCode = {

  buildReport (reportParams) {
    const me = this
    const showAddDescrPerson = AC.settings.get('hrShowAddDescrPerson', reportParams.organizationID)
    const useActualPositionName = AC.settings.get('hrOrderActualPositionName', reportParams.organizationID) === true

    const rowsQuery = Object.assign({
      entity: 'hr_empListEducation',
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
        const colSpan = 14 + (reportParams.lastEducationLevelType ? 2 : 0)

        const rows = rowsResp.resultData.map((row, index) => {
          return Object.assign({}, row, {
            showAddDescrPerson,
            useActualPositionName,
            index: index + 1,
            fullFIO: row.fullFIO ? row.fullFIO.trim().replace(/^(.*?)\s(.*)/g, (match, p1, p2) => [p1.toUpperCase(), p2].join(' ')) : '',
            docNum: row.docSeries ? `${row.docSeries} ${row.docNumber} ${UB.i18n('від')} ${AC.dateService.formatDate(row.dateIssue)}` : AC.dateService.formatDate(row.dateIssue),
            depName: HR.reportUtils.getReportDepStructFld(row.depID, row.depName),
            depFirst: HR.reportUtils.getReportDepStructFld(row.depID, row.depFirst),
            last: reportParams.lastEducationLevelType,
            colSpan: colSpan
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
            showAddDescrPerson,
            useActualPositionName,
            onDate: AC.dateService.formatDate(reportParams.onDate),
            organizationName,
            departmentName,
            last: reportParams.lastEducationLevelType,
            colSpan: colSpan + (showAddDescrPerson ? 1 : 0)+ (useActualPositionName ? 1 : 0),
            widthTable: 1740 + (reportParams.lastEducationLevelType ? 200 : 0) + (showAddDescrPerson ? 200 : 0) + (useActualPositionName ? 200 : 0)
          }),
          me
        )
      })
  }
}
