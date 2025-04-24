/* global $App AC UB HR */

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
    const useFundSource = AC.settings.get('hrFundSourceAccounting', reportParams.organizationID) === 'STAFF'

    const colSpan = 12 + (showAddDescrPerson ? 1 : 0) + (useActualPositionName ? 1 : 0) + (useFundSource ? 1 : 0)
    let result = {
      showAddDescrPerson,
      useActualPositionName,
      useFundSource,
      colSpan: colSpan,
      tableWidth: 1410 + (showAddDescrPerson ? 100 : 0) + (useActualPositionName ? 150 : 0) + (useFundSource ? 150 : 0),
      dateFrom: AC.dateService.formatDate(AC.dateService.shiftDate(reportParams.dateFrom)),
      dateTo: AC.dateService.formatDate(AC.dateService.shiftDate(reportParams.dateTo)),
      titlesRows: []
    }

    result.organizationName = await HR.reportUtils.getNameOrganization(appAC.globalApplicationDate(), reportParams.organizationID)
    result.departmentName = await HR.reportUtils.getNameDepartment(appAC.globalApplicationDate(), reportParams.organizationID, reportParams.departmentID)
    if (result.departmentName) {
      result.titlesRows.push({ value: result.departmentName })
    }
    if (result.departmentName) {
      result.titlesRows.push({ value: result.departmentName })
    }
    if (reportParams.dictBonusTypeName) {
      result.titlesRows.push({ value: `${UB.i18n('Тип нагороди')}: ${reportParams.dictBonusTypeName}` })
    }
    if (reportParams.workPlaceName) {
      result.titlesRows.push({ value: `${UB.i18n('Місце роботи')}: ${reportParams.workPlaceName}` })
    }
    if (reportParams.positionCategoryName) {
      result.titlesRows.push({ value: `${UB.i18n('Категорія посади')}: ${reportParams.positionCategoryName}` })
    }
    if (reportParams.dictFundSourceName) {
      result.titlesRows.push({ value: `${UB.i18n('Джерело фінансування')}: ${reportParams.dictFundSourceName}` })
    }

    if (reportParams.respID) {
      const respPosInfo = await HR.reportUtils.getResponsiblesIncaseInfo(reportParams.respID, appAC.globalApplicationDate(), undefined, true)
      result.respName = respPosInfo ? respPosInfo.respName || '' : ''
      result.respPosName = respPosInfo ? respPosInfo.respPosFull || '' : ''
    }

    const fieldList = ['tabNum', 'fullFIO', 'taxCode', 'sexType', 'docIssuedDate', 'bonusName',
      'depID', 'posName', 'depName', 'posCategory', 'orgName', 'workPlace', 'structDepName']
    if (showAddDescrPerson) fieldList.push('addDescrPerson')
    if (useActualPositionName) fieldList.push('actualPositionName')
    if (useFundSource) fieldList.push('fundSourceName')
    const rowsQuery1 = Object.assign({
      entity: 'hr_empListBonus',
      fieldList: fieldList,
      method: 'search'
    }, reportParams)

    const [
      { resultData: emps }
    ] = await UB.connection.runTransAsObject([rowsQuery1])

    const rows = emps.map(row => {
      return Object.assign({}, row, {
        showAddDescrPerson,
        useActualPositionName,
        useFundSource,
        docIssuedDate: row.docIssuedDate ? AC.dateService.formatDate(row.docIssuedDate) : '',
        structDepName: HR.reportUtils.getReportDepStructFld(row.depID, row.structDepName),
        depName: HR.reportUtils.getReportDepStructFld(row.depID, row.depName) ,
      })
    })
    Object.assign(result, { personTable: rows })

    return result
  }
}