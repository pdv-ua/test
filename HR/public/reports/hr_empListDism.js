/* global UB, AC, HR */

exports.reportCode = {
  buildReport (reportParams) {
    const me = this

    const rowsQuery = Object.assign({
      entity: 'hr_empListDism',
      method: 'search'
    }, reportParams)

    const organizationQuery = HR.reportUtils.getOrganizationQuery(reportParams.onDate, reportParams.organizationID)
    const departmentQuery = HR.reportUtils.getDepartmentQuery(reportParams.onDate, reportParams.organizationID, reportParams.departmentID)
    const showAddDescrPerson = reportParams.beFormedGroup === 'byOrders' ? AC.settings.get('hrShowAddDescrPerson', reportParams.organizationID) : false
    const useActualPositionName = AC.settings.get('hrOrderActualPositionName', reportParams.organizationID)

    const reasonDismQuery = {
      entity: 'hr_dictReasonDism',
      fieldList: ['name'],
      method: 'select',
      whereList: {
        c1: { expression: '[ID]', condition: 'equal', value: reportParams.dictReasonDismID }
      }
    }

    const requestArray = reportParams.dictReasonDismID ? [rowsQuery, organizationQuery, departmentQuery, reasonDismQuery] : [rowsQuery, organizationQuery, departmentQuery]

    return UB.connection.runTransAsObject(requestArray)
      .then(([rowsResp, orgResp, depResp, reasonDismQuery]) => {
        const tableWidth = reportParams.beFormedGroup === 'byOrders' ? 2220 + (showAddDescrPerson ? 100 : 0) + (useActualPositionName ? 150 : 0) : 1710
        const columnCount = reportParams.beFormedGroup === 'byOrders' ? 22 + (showAddDescrPerson ? 1 : 0) + (useActualPositionName ? 1 : 0) : 16
        const columnsNumbers = []
        for (let i = 0; i < columnCount; i++) { columnsNumbers.push({ colNum: i + 1 }) }

        const rows = rowsResp.resultData.map((row, index) => {
          return Object.assign({}, row, {
            showAddDescrPerson: showAddDescrPerson,
            useActualPositionName: useActualPositionName,
            index: index + 1,
            fullFIO: row.fullFIO ? row.fullFIO.trim().replace(/^(.*?)\s(.*)/g, (match, p1, p2) => [p1.toUpperCase(), p2].join(' ')) : '',
            dismDate: row.dismDate ? AC.dateService.formatDate(row.dismDate) : '',
            byOrders: reportParams.beFormedGroup === 'byOrders' ? 1 : 0,
            birthDate: row.birthDate ? AC.dateService.formatDate(row.birthDate) : '',
            orderDate: row.orderDate ? AC.dateService.formatDate(row.orderDate) : '',
            dictReasonDism: row.dictReasonDism && row.dictReasonDismLaw ? `${row.dictReasonDism} (${row.dictReasonDismLaw})`
              : row.dictReasonDism && !row.dictReasonDismLaw ? row.dictReasonDism
                : !row.dictReasonDism && row.dictReasonDismLaw ? `(${row.dictReasonDismLaw})`
                  : null,
            structDepName: reportParams.beFormedGroup === 'byOrders' ? HR.reportUtils.getReportDepStructFld(row.depName, row.structDepName) : row.structDepName,
            depTree: reportParams.beFormedGroup === 'byOrders' ? HR.reportUtils.getReportDepStructFld(row.depName, row.depTree) : row.depTree
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

        const reasonDism = reasonDismQuery && reasonDismQuery.resultData && reasonDismQuery.resultData[0]
          ? UB.i18n(`Причина звільнення: {0}`, reasonDismQuery.resultData[0].name) : ''

        return AC.reportService.generateReport(
          Object.assign({ rows }, {
            showAddDescrPerson,
            useActualPositionName,
            dateFrom: AC.dateService.formatDate(reportParams.dateFrom),
            dateTo: AC.dateService.formatDate(reportParams.dateTo),
            organizationName,
            departmentName,
            byOrders: reportParams.beFormedGroup === 'byOrders' ? 1 : 0,
            columnCount,
            columnsNumbers,
            reasonDism,
            tableWidth,
            columnCount2: Math.ceil((columnCount - 3) / 2),
            columnCount3: (columnCount - 3) - Math.ceil((columnCount - 3) / 2)
          }),
          me
        )
      })
  }
}
