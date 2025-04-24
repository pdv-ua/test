/* global AC HR UB */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this

    return me.getReportData(reportParams.instanceID).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (ID) {
    const result = {
      data1: [],
      data2: [],
      responsible: ''
    }
    const order = await HR.reportUtils.getEmpOrder(ID)
    if (!order) {
      return result
    }

    await HR.reportUtils.getOrderPrintConfig(result, order.subOrganization ? order.masterOrganizationID : order.organizationID)
    result.fontSize = result.ecoPrint ? 10 : 14
    result.fontSizeBtw = result.ecoPrint ? 6 : 9

    let respEmployeeNumID = await UB.Repository('hr_empOrder')
      .attrs(['respEmployeeNumID'])
      .where('ID', '=', ID)
      .selectScalar()
    if (respEmployeeNumID) {
      const employee = await UB.Repository('hr_employeeNumberS')
        .attrs('employeeID.lastName', 'employeeID.firstName')
        .selectById(respEmployeeNumID)
      if (employee) {
        result.responsible = [employee['employeeID.firstName'], employee['employeeID.lastName']].filter(Boolean).join(' ')
      }
    }

    let appruv = await UB.Repository('hr_empOrdListAppruv')
      .attrs(['ID', 'respPositionID', 'respEmployeePositionID', 'stageKind', 'stageKind.name'])
      .where('orderID', '=', ID)
      .orderBy('stageKind.sortOrder')
      .orderBy('ID')
      .selectAsObject()
    appruv = appruv.length ? _.groupBy(appruv, 'stageKind') : {}

    const appruvInfo = await HR.reportUtils.getResponsiblesForOrder(order, false, 'hr_empOrdListAppruv')

    _.forEach(appruv, items => {
      const objAppruv = {
        name: items[0]['stageKind'] === 'VISA'
          ? UB.i18n('Погоджено') + ':'
          : items[0]['stageKind'] === 'ONLAW' ? UB.i18n('Перевірено на відповідність законодавству') + ':' : '',
        rows: []
      }
      items.forEach(item => {
        const responsibles = appruvInfo.find(el => el.respPositionID === item.respPositionID && el.respEmployeePositionID === item.respEmployeePositionID)
        objAppruv.rows.push({
          posName: responsibles ? responsibles.respPos : '',
          empName: responsibles ? responsibles.respFirstName : ''
        })
      })

      result.data1.push(objAppruv)
    })

    const acquaintance = await UB.Repository('hr_acquaintanceList')
      .attrs(['ID', 'dictEventKnowledgID.name', 'dictEventKnowledgID.nameM', 'dictEventKnowledgID.nameW', 'introductionDate',
        'employeePositionID', 'employeePositionID.employeeID', 'employeePositionID.employeeID.sexType', 'employeePositionID.employeeID.firstName', 'employeePositionID.employeeID.lastName',
        'employeeResponsibleID', 'employeeResponsibleID.employeeID', 'employeeResponsibleID.employeeID.sexType', 'employeeResponsibleID.employeeID.firstName', 'employeeResponsibleID.employeeID.lastName'])
      .where('orderID', '=', ID)
      .orderBy('ID')
      .selectAsObject()
    await HR.reportUtils.checkEmployeeChange(order.orderDate, ['lastName', 'firstName'], acquaintance, undefined, 'employeeResponsibleID.employeeID')
    await HR.reportUtils.checkEmployeeChange(order.orderDate, ['lastName', 'firstName'], acquaintance, undefined, 'employeePositionID.employeeID')

    acquaintance.forEach((item, i) => {
      const sexType = (item.employeePositionID ? item['employeePositionID.employeeID.sexType'] : item['employeeID.sexType'])
      result.data2.push({
        emptyRow: (i + 1) < acquaintance.length,
        eventName: sexType === 'W'
          ? item['dictEventKnowledgID.nameW'] || item['dictEventKnowledgID.name']
          : item['dictEventKnowledgID.nameM'] || item['dictEventKnowledgID.name'],
        introductionDate: item.introductionDate ? AC.dateService.formatDate(item.introductionDate) : '________',
        empName: item.employeePositionID
          ? item['employeePositionID.employeeID.firstName'] + ' ' + (item['employeePositionID.employeeID.lastName'] || '').toUpperCase()
          : item['employeeResponsibleID.employeeID'] ? item['employeeResponsibleID.employeeID.firstName'] + ' ' + (item['employeeResponsibleID.employeeID.lastName'] || '').toUpperCase() : ''
      })
    })

    return result
  }
}
