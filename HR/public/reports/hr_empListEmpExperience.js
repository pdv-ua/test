/* global UB, HR, AC, appAC */

exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    return me.getReportData(reportParams).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (reportParams) {
    const onDate = appAC.globalApplicationDate()
    const showAddDescrPerson = AC.settings.get('hrShowAddDescrPerson', reportParams.organizationID)
    const useActualPositionName = AC.settings.get('hrOrderActualPositionName', reportParams.organizationID) === true
    const colSpan = 14 + (showAddDescrPerson ? 1 : 0) + (useActualPositionName ? 1 : 0)
    const colNums = []
    for (let i = 1; i <= colSpan; i++) {
      colNums.push({ name: i })
    }

    const result = {
      showAddDescrPerson,
      useActualPositionName,
      colNums,
      colSpan: colSpan,
      colSpan2: Math.ceil((colSpan - 3) / 2),
      colSpan3: (colSpan - 3) - Math.ceil((colSpan - 3) / 2),
      tableWidth: 1730 + (showAddDescrPerson ? 150 : 0) + (useActualPositionName ? 200 : 0),
      dateFrom: AC.dateService.formatDate(AC.dateService.shiftDate(reportParams.dateFrom)),
      dateTo: AC.dateService.formatDate(AC.dateService.shiftDate(reportParams.dateTo)),
      respName: '',
      respPosName: '',
      subOrg: '',
      onDate: AC.dateService.formatDate(onDate)
    }

    result.organizationName = await HR.reportUtils.getNameOrganization(onDate, reportParams.organizationID)
    result.departmentName = await HR.reportUtils.getNameDepartment(onDate, reportParams.organizationID, reportParams.departmentID)

    if (reportParams.respID) {
      const respPosInfo = await HR.reportUtils.getResponsiblesIncaseInfo(reportParams.respID, onDate, undefined, true)
      result.respName = respPosInfo ? respPosInfo.respName || '' : ''
      result.respPosName = respPosInfo ? respPosInfo.respPosFull || '' : ''
    }

    const fieldList = ['fullFIO', 'tabNum', 'stageYear', 'expName', 'setDate', 'posName', 'departmentID', 'structDepName',
      'depName', 'workPlaceName', 'dictStaffCat', 'eduName', 'workYear', 'certificatDate']
    if (showAddDescrPerson) fieldList.push('addDescrPerson')
    if (useActualPositionName) fieldList.push('actualPositionName')
    const rowsQuery1 = Object.assign({
      entity: 'hr_empListEmpExperience',
      fieldList: fieldList,
      method: 'search'
    }, reportParams)

    const [
      { resultData: emps }
    ] = await UB.connection.runTransAsObject([rowsQuery1])

    const rows = emps.map((row, index) => {
      return Object.assign({}, row, {
        showAddDescrPerson,
        useActualPositionName,
        setDate: AC.dateService.formatDate(row.setDate),
        cerDate: AC.dateService.formatDate(row.certificatDate),
        num: index + 1,
        depName: HR.reportUtils.getReportDepStructFld(row.departmentID, row.depName),
        structDepName: HR.reportUtils.getReportDepStructFld(row.departmentID, row.structDepName)
      })
    })
    Object.assign(result, { items: rows })

    return result
  }
}
