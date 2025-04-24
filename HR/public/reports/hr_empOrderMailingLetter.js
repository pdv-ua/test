/* global AC HR UB _ */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this

    return me.getReportData(reportParams.instanceID).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (ID) {
    const me = this
    const result = {
      tableRows: [],
      listRows: []
    }
    const order = await HR.reportUtils.getEmpOrder(ID)
    if (!order) {
      return result
    }

    await HR.reportUtils.getOrderPrintConfig(result, order.masterOrganizationID || order.organizationID)

    const mailingLetter = await UB.Repository('hr_mailingLetter')
      .attrs(['employeePositionID', 'participantTypeID', 'participantTypeID.code', 'participantTypeID.name', 'participantTypeID.isTable',
        'participantID.name', 'copies'])
      .where('empOrderID', '=', ID)
      .selectAsObject()

    const employeePositionIDs = _.uniq(_.compact(mailingLetter.map(el => el.employeePositionID)))
    let employees = employeePositionIDs && employeePositionIDs.length > 0
      ? await UB.Repository('hr_employeePositionS')
        .attrs(['ID', 'employeeID', 'employeeID.lastName', 'employeeID.firstName', 'employeeID.middleName'])
        .where('ID', 'in', employeePositionIDs)
        .where('organizationID', '=', order.masterOrganizationID || order.organizationID)
        .selectAsObject()
      : []

    await HR.reportUtils.checkEmployeeChange(order.orderDate, ['lastName', 'firstName', 'middleName'], employees)

    result.tableRows = me.getList(mailingLetter.filter(el => el['participantTypeID.isTable']), true, employees)
    result.listRows = me.getList(mailingLetter.filter(el => !el['participantTypeID.isTable']), false, employees)

    return result
  },

  getList: function (data, isTable, employees) {
    const getEmpName = (emp) => {
      if (!emp) return ''
      const lastName = (emp['employeeID.lastName'] || '').trim()
      let firstName = (emp['employeeID.firstName'] || '').trim()
      let middleName = (emp['employeeID.middleName'] || '').trim()
      let result = ''
      if (isTable) {
        firstName = firstName ? firstName.substr(0, 1).toUpperCase() + '.' : ''
        middleName = middleName ? middleName.substr(0, 1).toUpperCase() + '.' : ''
        result = lastName + (lastName && (firstName || middleName) ? '&nbsp;' : '') + firstName + middleName
      } else {
        result = firstName + (firstName && lastName ? ' ' : '') + lastName.toUpperCase()
      }
      return result
    }

    const result = []
    const grpdata = _.groupBy(_.sortBy(data, 'participantTypeID.code'), 'participantTypeID')
    _.forEach(grpdata, items => {
      result.push({
        typeName: (items[0]['participantTypeID.name'] || '').toUpperCase(),
        rows: items.map((el, npp) => {
          const obj = {
            npp: npp + 1,
            participantName: el['participantID.name'],
            empName: getEmpName(employees.find(e => e.ID === el.employeePositionID)),
            copies: el.copies || ''
          }
          return obj
        })
      })
    })

    return result
  }
}
