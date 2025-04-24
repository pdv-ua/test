/* global UB, AC, HR */

exports.reportCode = {
  buildReport (reportParams) {
    const me = this
    const showAddDescrPerson = AC.settings.get('hrShowAddDescrPerson', reportParams.execParams.organizationID)
    const useActualPositionName = AC.settings.get('hrOrderActualPositionName', reportParams.organizationID)
    const organizationQuery = HR.reportUtils.getOrganizationQuery(reportParams.execParams.onDate, reportParams.execParams.organizationID)

    return UB.connection.runTransAsObject([
      organizationQuery
    ])
      .then(([orgResp]) => {
        const rows = reportParams.gridData || []

        rows.forEach(row => {
          row.showAddDescrPerson = showAddDescrPerson
          row.useActualPositionName = useActualPositionName
          row.birthDate = row.birthDate ? AC.dateService.formatDate(row.birthDate) : ''
          row.certificationDate = row.certificationDate ? AC.dateService.formatDate(row.certificationDate) : ''
          row.validityDate = row.validityDate ? AC.dateService.formatDate(row.validityDate) : ''
          row.startWork = row.startWork ? AC.dateService.formatDate(row.startWork) : ''
          row.docIssuedDate = row.docIssuedDate ? AC.dateService.formatDate(row.docIssuedDate) : ''
          row.eduDateTo = row.eduDateTo ? AC.dateService.formatDate(row.eduDateTo) : ''
        })

        let orgName = ''
        if (orgResp && orgResp.resultData && orgResp.resultData[0]) {
          orgName = orgResp.resultData[0].name
        }

        return AC.reportService.generateReport(
          Object.assign({ rows }, {
            showAddDescrPerson,
            useActualPositionName,
            colSpan: 30 + (showAddDescrPerson ? 1 : 0) + (useActualPositionName ? 1 : 0),
            tableWidth: 3330 + (showAddDescrPerson ? 100 : 0) + (useActualPositionName ? 150 : 0),
            onDate: AC.dateService.formatDate(reportParams.onDate),
            orgName,
            titles: reportParams.titles
          }),
          me
        )
      })
  }
}
