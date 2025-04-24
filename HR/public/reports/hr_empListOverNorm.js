/* global UB, AC, HR */
exports.reportCode = {
  buildReport (reportParams) {
    const me = this

    const rowsQuery = Object.assign({
      entity: 'hr_empListOverNorm',
      method: 'search'
    }, reportParams)

    const organizationQuery = HR.reportUtils.getOrganizationQuery(reportParams.onDate, reportParams.organizationID)
    const departmentQuery = HR.reportUtils.getDepartmentQuery(reportParams.onDate, reportParams.organizationID, reportParams.departmentID)
    const showAddDescrPerson = AC.settings.get('hrShowAddDescrPerson', reportParams.organizationID)
    const useActualPositionName = AC.settings.get('hrOrderActualPositionName', reportParams.organizationID) === true

    return UB.connection.runTransAsObject([
      rowsQuery,
      organizationQuery,
      departmentQuery
    ])
      .then(([rowsResp, orgResp, depResp]) => {
        const rows = rowsResp.resultData.map((row, index) => {
          return Object.assign({}, row, {
            useActualPositionName,
            addInfo: (showAddDescrPerson && row.addDescrPerson ? row.addDescrPerson + (row.addInfo ? '<br />' : '') : '') + (row.addInfo || ''),
            index: index + 1,
            fullFIO: row.fullFIO ? row.fullFIO.trim().replace(/^(.*?)\s(.*)/g, (match, p1, p2) => [p1.toUpperCase(), p2].join(' ')) : '',
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

        const colSpan = 9 + (useActualPositionName ? 1 : 0)
        const colNums = []
        for (let i = 1; i <= colSpan; i++) {
          colNums.push({ name: i })
        }
        return AC.reportService.generateReport(
          Object.assign({ rows }, {
            colNums,
            colSpan: colSpan,
            colSpan2: Math.ceil((colSpan - 3) / 2),
            colSpan3: (colSpan - 3) - Math.ceil((colSpan - 3) / 2),
            tableWidth: 1500 + (useActualPositionName ? 200 : 0),
            dateFrom: AC.dateService.formatDate(reportParams.dateFrom),
            dateTo: AC.dateService.formatDate(reportParams.dateTo),
            onDate: AC.dateService.formatDate(reportParams.onDate),
            organizationName,
            departmentName,
            useActualPositionName
          }),
          me
        )
      })
  }
}
