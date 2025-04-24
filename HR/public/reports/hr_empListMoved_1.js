/* global AC UB HR */

exports.reportCode = {
  buildReport (reportParams) {
    const me = this
    const rowsQuery = Object.assign({
      entity: 'hr_empListMoved',
      method: 'search'
    }, reportParams)

    const organizationQuery = HR.reportUtils.getOrganizationQuery(reportParams.onDate, reportParams.organizationID)
    const departmentQuery = HR.reportUtils.getDepartmentQuery(reportParams.onDate, reportParams.organizationID, reportParams.departmentID)
    const showAddDescrPerson = reportParams.beFormedGroup === 'byOrders' ? AC.settings.get('hrShowAddDescrPerson', reportParams.organizationID) : false
    const useActualPositionName = reportParams.beFormedGroup === 'byOrders' ? AC.settings.get('hrOrderActualPositionName', reportParams.organizationID) : false

    const reasonMoveQuery = {
      entity: 'hr_dictReasonMoving',
      fieldList: ['name'],
      method: 'select',
      whereList: {
        c1: { expression: '[ID]', condition: 'equal', value: reportParams.dictReasonMovingKindID }
      }
    }

    const requestArray = reportParams.dictReasonMovingKindID ? [rowsQuery, organizationQuery, departmentQuery, reasonMoveQuery] : [rowsQuery, organizationQuery, departmentQuery]

    return UB.connection.runTransAsObject(requestArray).then(([rowsResp, orgResp, depResp, reasonMoveQuery]) => {
      const tableWidth = reportParams.beFormedGroup === 'byOrders' ? 2910 + (showAddDescrPerson ? 100 : 0) + (useActualPositionName ? 250 : 0) : 1710
      const columnCount = reportParams.beFormedGroup === 'byOrders' ? 32 + (showAddDescrPerson ? 1 : 0)+ (useActualPositionName ? 2 : 0) : 16
      const columnsNumbers = []
      for (let i = 0; i < columnCount; i++) { columnsNumbers.push({ colNum: i + 1 }) }

      const movedTable = rowsResp.resultData.map((row, index) => {
        const rw = Object.assign({}, row, {
          showAddDescrPerson,
          useActualPositionName,
          index: index + 1,
          fullFIO: row.fullFIO ? row.fullFIO.trim().replace(/^(.*?)\s(.*)/g, (match, p1, p2) => [p1.toUpperCase(), p2].join(' ')) : '',
          moveDate: row.moveDate ? AC.dateService.formatDate(row.moveDate) : '',
          birthDate: row.birthDate ? AC.dateService.formatDate(row.birthDate) : '',
          orderDate: row.orderDate ? AC.dateService.formatDate(row.orderDate) : '',
          dismDate: row.dismDate ? AC.dateService.formatDate(row.dismDate) : ''
        })
        reportParams.beFormedGroup === 'byOrders' ? rw.byOrders = 1 : rw.byOrders = 0
        if (reportParams.beFormedGroup === 'byOrders') {
          rw.selfStructDepName = HR.reportUtils.getReportDepStructFld(row.depID, row.selfStructDepName)
          rw.depNameTo = HR.reportUtils.getReportDepStructFld(row.mDepID, row.depNameTo)
          rw.depName = HR.reportUtils.getReportDepStructFld(row.depID, row.depName)
          rw.accrualSum = row.accrualSum ? AC.currencyService.formatAsCurrency(row.accrualSum) : ''
        }

        return rw
      })

      let organizationName = ''
      if (orgResp && orgResp.resultData && orgResp.resultData[0]) {
        organizationName = orgResp.resultData[0].name
      }
      let departmentName = ''
      if (depResp && depResp.resultData && depResp.resultData[0]) {
        departmentName = depResp.resultData[0].name
      }

      const reasonMove = reasonMoveQuery && reasonMoveQuery.resultData && reasonMoveQuery.resultData[0]
        ? UB.i18n(`Причина переведення: {0}`, reasonMoveQuery.resultData[0].name) : ''

      const result = Object.assign({ movedTable }, {
        showAddDescrPerson,
        useActualPositionName,
        period: reportParams.dateFrom && reportParams.dateTo ? UB.i18n(`за перiод з {0} по {1}`, AC.dateService.formatDate(reportParams.dateFrom), AC.dateService.formatDate(reportParams.dateTo)) : '',
        organizationName,
        departmentName,
        byOrders: reportParams.beFormedGroup === 'byOrders' ? 1 : 0,
        columnCount,
        reasonMove,
        columnsNumbers,
        tableWidth,
        columnCount2: Math.ceil((columnCount - 3) / 2),
        columnCount3: (columnCount - 3) - Math.ceil((columnCount - 3) / 2)
      })

      return AC.reportService.generateReport(result, me)
    })
  }
}
