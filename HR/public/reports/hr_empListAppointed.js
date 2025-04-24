/* global UB, AC, HR */
exports.reportCode = {
  buildReport (reportParams) {
    const me = this
    const rowsQuery = Object.assign({
      entity: 'hr_empListAppointed',
      method: 'search'
    }, reportParams)

    const organizationQuery = HR.reportUtils.getOrganizationQuery(reportParams.onDate, reportParams.organizationID)
    const departmentQuery = HR.reportUtils.getDepartmentQuery(reportParams.onDate, reportParams.organizationID, reportParams.departmentID)
    const showAddDescrPerson = reportParams.beFormedGroup === 'byOrders' ? AC.settings.get('hrShowAddDescrPerson', reportParams.organizationID) : false
    const useActualPositionName = AC.settings.get('hrOrderActualPositionName', reportParams.organizationID)

    const appointKindQuery = {
      entity: 'hr_dictAppointKind',
      fieldList: ['name'],
      method: 'select',
      whereList: {
        c1: { expression: '[ID]', condition: 'equal', value: reportParams.dictAppointKindID }
      }
    }

    const requestArray = reportParams.dictAppointKindID ? [rowsQuery, organizationQuery, departmentQuery, appointKindQuery] : [rowsQuery, organizationQuery, departmentQuery]

    return UB.connection.runTransAsObject(requestArray)
      .then(([rowsResp, orgResp, depResp, appointKindQuery]) => {
        const columnCount = reportParams.beFormedGroup === 'byOrders' ? 31 + (showAddDescrPerson ? 1 : 0) + (useActualPositionName ? 1 : 0) : 17
        const columnsNumbers = []
        for (let i = 0; i < columnCount; i++) { columnsNumbers.push({ colNum: i + 1 }) }

        const rows = rowsResp.resultData.map((row, index) => {
          return Object.assign({}, row, {
            byOrders: reportParams.beFormedGroup === 'byOrders' ? 1 : 0,
            showAddDescrPerson: showAddDescrPerson,
            useActualPositionName: useActualPositionName,
            index: index + 1,
            fullFIO: row.fullFIO ? row.fullFIO.trim().replace(/^(.*?)\s(.*)/g, (match, p1, p2) => [p1.toUpperCase(), p2].join(' ')) : '',
            birthDate: row.birthDate ? AC.dateService.formatDate(row.birthDate) : '',
            appointDate: row.appointDate ? AC.dateService.formatDate(row.appointDate) : '',
            dateTrialEnd: row.dateTrialEnd ? AC.dateService.formatDate(row.dateTrialEnd) : row.dateTrialEnd,
            dismDate: row.dismDate ? AC.dateService.formatDate(row.dismDate) : '',
            orderDate: reportParams.beFormedGroup === 'byOrders' && row.orderDate ? AC.dateService.formatDate(row.orderDate) : '',
            structDepName: reportParams.beFormedGroup === 'byOrders' ? HR.reportUtils.getReportDepStructFld(row.depID, row.structDepName) : '',
            depName: reportParams.beFormedGroup === 'byOrders' ? HR.reportUtils.getReportDepStructFld(row.depID, row.depName) : '',
            accrualSum: reportParams.beFormedGroup === 'byOrders' && row.accrualSum ? AC.currencyService.formatAsCurrency(row.accrualSum) : ''
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

        const appointKind = appointKindQuery && appointKindQuery.resultData && appointKindQuery.resultData[0]
          ? UB.i18n(`Тип призначення: {0}`, appointKindQuery.resultData[0].name) : ''

        const result = Object.assign({ rows }, {
          byOrders: reportParams.beFormedGroup === 'byOrders' ? 1 : 0,
          showAddDescrPerson,
          useActualPositionName,
          dateFrom: AC.dateService.formatDate(reportParams.dateFrom),
          dateTo: AC.dateService.formatDate(reportParams.dateTo),
          organizationName,
          departmentName,
          appointKind,
          columnsNumbers,
          columnCount,
          tableWidth: reportParams.beFormedGroup === 'byOrders' ? 3040 + (showAddDescrPerson ? 100 : 0) + (useActualPositionName ? 150 : 0) : 1660,
          columnCount2: Math.ceil((columnCount - 3) / 2),
          columnCount3: (columnCount - 3) - Math.ceil((columnCount - 3) / 2)
        })

        return AC.reportService.generateReport(result, me)
      })
  }
}
