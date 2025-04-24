/* global UB, AC, HR */

exports.reportCode = {
  buildReport (reportParams) {
    const me = this
    const showAddDescrPerson = AC.settings.get('hrShowAddDescrPerson', reportParams.execParams.organizationID)
    const useActualPositionName = AC.settings.get('hrOrderActualPositionName', reportParams.organizationID)

    const rowsQuery = Object.assign({
      entity: 'hr_empListBirth',
      method: 'search'
    }, reportParams.execParams)

    const organizationQuery = HR.reportUtils.getOrganizationQuery(reportParams.execParams.onDate, reportParams.execParams.organizationID)
    const departmentQuery = HR.reportUtils.getDepartmentQuery(reportParams.execParams.onDate, reportParams.execParams.organizationID, reportParams.execParams.departmentID)

    return UB.connection.runTransAsObject([
      rowsQuery,
      organizationQuery,
      departmentQuery
    ])
      .then(([rowsResp, orgResp, depResp]) => {
        const rows = rowsResp.resultData.map((row, index) => {
          return Object.assign({}, row, {
            showAddDescrPerson: showAddDescrPerson,
            useActualPositionName: useActualPositionName,
            index: index + 1,
            fullFIO: row.fullFIO ? row.fullFIO.trim().replace(/^(.*?)\s(.*)/g, (match, p1, p2) => [p1.toUpperCase(), p2].join(' ')) : '',
            birthDate: AC.dateService.formatDate(row.birthDate),
            posName: HR.nameCase.cap(row.posName)
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

        const colSpan = 5 + (showAddDescrPerson ? 1 : 0) + (useActualPositionName ? 1 : 0)
        const colNums = []
        for (let i = 1; i <= colSpan; i++) {
          colNums.push({ name: i })
        }
        return AC.reportService.generateReport(
          Object.assign({ rows }, {
            colNums,
            showAddDescrPerson,
            useActualPositionName,
            colSpan: colSpan,
            tableWidth: 750 + (showAddDescrPerson ? 200 : 0) + (useActualPositionName ? 250 : 0),
            dateFrom: AC.dateService.formatDate(reportParams.dateFrom),
            dateTo: AC.dateService.formatDate(reportParams.dateTo),
            organizationName,
            departmentName
          }),
          me
        )
      })
  }
}
