/* global UB, AC, HR */
exports.reportCode = {
  buildReport (reportParams) {
    const me = this
    const showAddDescrPerson = AC.settings.get('hrShowAddDescrPerson', reportParams.execParams.organizationID)
    const useActualPositionName = AC.settings.get('hrOrderActualPositionName', reportParams.organizationID)
    const execParams = reportParams.execParams

    const rowsQuery = Object.assign({
      entity: 'hr_empListByChilds',
      method: 'search'
    }, execParams)

    const organizationQuery = HR.reportUtils.getOrganizationQuery(reportParams.execParams.onDate, reportParams.execParams.organizationID)
    const departmentQuery = HR.reportUtils.getDepartmentQuery(reportParams.execParams.onDate, reportParams.execParams.organizationID, reportParams.execParams.departmentID)

    return UB.connection.runTransAsObject([
      rowsQuery,
      organizationQuery,
      departmentQuery
    ]).then(([rowsResp, orgResp, depResp]) => {
      let prevEmpID = 0
      let idx = 0
      const rows = rowsResp.resultData.map((row, index) => {
        row.showAddDescrPerson = showAddDescrPerson
        row.childBirthDate = row.childBirthDate ? AC.dateService.formatDate(row.childBirthDate) : ''
        let empID = row.employeeID
        let changes
        if (empID !== prevEmpID) {
          changes = {
            index: ++idx,
            fullFIO: row.fullFIO ? row.fullFIO.trim().replace(/^(.*?)\s(.*)/g, (match, p1, p2) => [p1.toUpperCase(), p2].join(' ')) : '',
            depName: HR.reportUtils.getReportDepStructFld(row.depID, row.depName),
            structDepName: HR.reportUtils.getReportDepStructFld(row.depID, row.selfStructDepName)
          }
        } else {
          changes = {
            index: '',
            lastName: '',
            firstName: '',
            middleName: '',
            fullFIO: '',
            sexType: '',
            maritalStatus: '',
            posName: '',
            depName: '',
            structDepName: '',
            depTree: ''
          }
        }
        let res = Object.assign({}, row, changes)
        prevEmpID = empID
        return res
      })

      let organizationName = ''
      if (orgResp && orgResp.resultData && orgResp.resultData[0]) {
        organizationName = orgResp.resultData[0].name
      }
      let departmentName = ''
      if (depResp && depResp.resultData && depResp.resultData[0]) {
        departmentName = depResp.resultData[0].name
      }
      const colSpan = 11 + (showAddDescrPerson ? 1 : 0) + (useActualPositionName ? 1 : 0)
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
          colSpan2: (colSpan - 3) - 3,
          colSpan3: 3,
          tableWidth: 1450 + (showAddDescrPerson ? 150 : 0) + (useActualPositionName ? 150 : 0),
          onDate: AC.dateService.formatDate(execParams.onDate),
          organizationName,
          departmentName,
          title: UB.i18n(`Список осіб, які мають дітей до ${execParams.maxYear} років`)
        }),
        me
      )
    })
  }
}
