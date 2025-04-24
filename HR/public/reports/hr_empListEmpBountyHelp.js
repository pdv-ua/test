/* global UB, HR, AC, appAC */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    return me.getReportData(reportParams).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (reportParams) {
    const showAddDescrPerson = AC.settings.get('hrShowAddDescrPerson', reportParams.organizationID)
    const useActualPositionName = AC.settings.get('hrOrderActualPositionName', reportParams.organizationID) === true
    const colSpan = 11 + (showAddDescrPerson ? 1 : 0) + (useActualPositionName ? 1 : 0)
    let result = {
      showAddDescrPerson: showAddDescrPerson,
      useActualPositionName: useActualPositionName,
      colSpan: colSpan,
      colSpan2: Math.ceil((colSpan - 3) / 2),
      colSpan3: (colSpan - 3) - Math.ceil((colSpan - 3) / 2),
      tableWidth: 1700 + (showAddDescrPerson ? 200 : 0) + (useActualPositionName ? 200 : 0),
      dateFrom: AC.dateService.formatDate(AC.dateService.shiftDate(reportParams.dateFrom)),
      dateTo: AC.dateService.formatDate(AC.dateService.shiftDate(reportParams.dateTo)),
      respName: '',
      respPosName: ''
    }

    result.organizationName = await HR.reportUtils.getNameOrganization(appAC.globalApplicationDate(), reportParams.organizationID)
    result.departmentName = await HR.reportUtils.getNameDepartment(appAC.globalApplicationDate(), reportParams.organizationID, reportParams.departmentID)

    if (reportParams.respID) {
      const respPosInfo = await HR.reportUtils.getResponsiblesIncaseInfo(reportParams.respID, appAC.globalApplicationDate(), undefined, true)
      result.respName = respPosInfo ? respPosInfo.respName || '' : ''
      result.respPosName = respPosInfo ? respPosInfo.respPosFull || '' : ''
    }

    const fieldList = ['fullFIO', 'posName', 'depName', 'depFirst', 'orgName', 'payElName', 'accrual', 'orderDescription',
      'dictStaffCatName', 'workPlaceName']
    if (showAddDescrPerson) fieldList.push('addDescrPerson')
    if (useActualPositionName) fieldList.push('actualPositionName')
    const rowsQuery1 = Object.assign({
      entity: 'hr_empListEmpBountyHelp',
      fieldList: fieldList,
      method: 'search'
    }, reportParams)

    const [
      { resultData: emps }
    ] = await UB.connection.runTransAsObject([rowsQuery1])

    const rows = emps.map((row, index) => {
      return Object.assign({}, row, {
        showAddDescrPerson: showAddDescrPerson,
        useActualPositionName: useActualPositionName,
        pn: index + 1,
        // depTree: HR.reportUtils.getReportDepStructFld(row.depName, row.depTree),
        depFirst: HR.reportUtils.getReportDepStructFld(row.depName, row.depFirst)
      })
    })
    Object.assign(result, { items: rows })

    return result
  }
}
