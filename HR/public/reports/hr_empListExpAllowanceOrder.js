/* global UB, HR, AC, appAC */

exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    return me.getReportData(reportParams).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (reportParams) {
    let onDate = appAC.globalApplicationDate()
    const showAddDescrPerson = AC.settings.get('hrShowAddDescrPerson', reportParams.organizationID)
    const useActualPositionName = AC.settings.get('hrOrderActualPositionName', reportParams.organizationID)
    const colSpan = 10 + (showAddDescrPerson ? 1 : 0) + (useActualPositionName ? 1 : 0)
    let result = {
      showAddDescrPerson: showAddDescrPerson,
      useActualPositionName: useActualPositionName,
      colSpan: colSpan,
      colSpan2: (colSpan - 3) - 3,
      colSpan3: 3,
      tableWidth: 1520 + (showAddDescrPerson ? 200 : 0) + (useActualPositionName ? 200 : 0),
      dateFrom: AC.dateService.formatDate(AC.dateService.shiftDate(reportParams.dateFrom)),
      dateTo: AC.dateService.formatDate(AC.dateService.shiftDate(reportParams.dateTo)),
      respName: '',
      respPosName: '',
      onDate: AC.dateService.formatDate(onDate)
    }

    result.organizationName = await HR.reportUtils.getNameOrganization(onDate, reportParams.organizationID)
    result.departmentName = await HR.reportUtils.getNameDepartment(onDate, reportParams.organizationID, reportParams.departmentID)

    if (reportParams.respID) {
      let respPosInfo = await UB.Repository('hr_employeePositionS')
        .attrs('ID', 'employeeID.shortFIO', 'positionID')
        .where('ID', '=', reportParams.respID)
        .where('employeeID.mi_deleteDate', '>=', '#maxdate')
        .selectSingle()
      if (respPosInfo) {
        result.respName = respPosInfo['employeeID.shortFIO']
        result.respPosName = await UB.Repository('hr_position')
          .attrs(['fullName'])
          .where('mi_data_id', '=', respPosInfo['positionID'] ? respPosInfo['positionID'] : 0)
          .where('state', '=', 'ACTIVE')
          .misc({ __mip_ondate: onDate })
          .selectScalar()
      }
    }

    const fieldList = ['fullFIO', 'tabNum', 'stageYear', 'rate', 'setDate', 'posName', 'departmentID', 'structDepName',
      'depName', 'orgName', 'employeePositionID']
    if (showAddDescrPerson) fieldList.push('addDescrPerson')
    if (useActualPositionName) fieldList.push('actualPositionName')
    const rowsQuery1 = Object.assign({
      entity: 'hr_empListExpAllowance',
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
        setDate: AC.dateService.formatDate(row.setDate),
        num: index + 1,
        checked: reportParams.selectedRows.includes(row.employeePositionID) ? '*' : '',
        depName: HR.reportUtils.getReportDepStructFld(row.departmentID, row.depName),
        structDepName: HR.reportUtils.getReportDepStructFld(row.departmentID, row.structDepName)
      })
    })
    Object.assign(result, { emps: rows })

    return result
  }
}
