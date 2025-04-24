/* global UB, AC, HR */

exports.reportCode = {
  buildReport (reportParams) {
    const me = this
    const showAddDescrPerson = AC.settings.get('hrShowAddDescrPerson', reportParams.execParams.organizationID)
    const useActualPositionName = AC.settings.get('hrOrderActualPositionName', reportParams.organizationID)

    const rowsQuery = Object.assign({
      entity: 'hr_empListByAge',
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
            showAddDescrPerson,
            useActualPositionName,
            dateAppointmentDep: AC.dateService.formatDate(row.dateAppointmentDep),
            dateAppointmentPos: AC.dateService.formatDate(row.dateAppointmentPos),
            fullFIO: row.fullFIO ? row.fullFIO.trim().replace(/^(.*?)\s(.*)/g, (match, p1, p2) => [p1.toUpperCase(), p2].join(' ')) : '',
            index: index + 1,
            depName: HR.reportUtils.getReportDepStructFld(row.depID, row.depName),
            structDepName: HR.reportUtils.getReportDepStructFld(row.depID, row.structDepName)
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
        const colSpan = 9 + (showAddDescrPerson ? 1 : 0) + (useActualPositionName ? 1 : 0)
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
            colSpan2: (colSpan - 3) - (colSpan === 9 ? 2 : 3),
            colSpan3: colSpan === 9 ? 2 : 3,
            tableWidth: 1250 + (showAddDescrPerson ? 200 : 0) + (useActualPositionName ? 200 : 0),
            onDate: AC.dateService.formatDate(reportParams.onDate),
            organizationName,
            departmentName
          }),
          me
        )
      })
  }
}
