/* global UB AC HR _ */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    reportParams = (typeof reportParams === 'string') ? JSON.parse(reportParams) : reportParams
    return me.getReportData(reportParams).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (reportParams) {
    let onDate = reportParams.onDate
    const orderID = reportParams.orderID
    const staffTableID = reportParams.staffTableID
    let empOrderType = reportParams.empOrderType
    const result = {
      orgName: '',
      respName: '',
      respPosName: '',
      orderNumber: '',
      orderDate: '',
      employees: []
    }

    let order
    if (empOrderType !== 'STAFFTABLE') {
      order = await UB.Repository('hr_empOrder')
        .attrs(['orderNumber', 'orderDate', 'titleOrder', 'orderState', 'empOrderType.name',
          'organizationID', 'organizationID.nameGen', 'organizationID.name', 'respEmployeeID.shortFIO', 'respEmployeePositionID'])
        .joinCondition('organizationID.mi_dateFrom', '<=', onDate)
        .joinCondition('organizationID.mi_dateTo', '>=', onDate)
        .joinCondition('organizationID.mi_deleteDate', '>=', '#maxdate')
        .joinCondition('organizationID.state', '=', 'ACTIVE')
        .selectById(orderID) || {}
    } else {
      order = await UB.Repository('hr_empOrder')
        .where('staffTableID', '=', staffTableID)
        .attrs(['orderNumber', 'orderDate', 'titleOrder', 'orderState', 'empOrderType.name',
          'organizationID', 'organizationID.nameGen', 'organizationID.name', 'respEmployeeID.shortFIO', 'respEmployeePositionID'])
        .joinCondition('organizationID.mi_dateFrom', '<=', onDate)
        .joinCondition('organizationID.mi_dateTo', '>=', onDate)
        .joinCondition('organizationID.mi_deleteDate', '>=', '#maxdate')
        .joinCondition('organizationID.state', '=', 'ACTIVE')
        .selectSingle() || {}
    }
    const staffTable = staffTableID ? await UB.Repository('hr_staffTable')
      .attrs(['organizationID', 'organizationID.nameGen', 'organizationID.name'])
      .joinCondition('organizationID.mi_dateFrom', '<=', onDate)
      .joinCondition('organizationID.mi_dateTo', '>=', onDate)
      .joinCondition('organizationID.mi_deleteDate', '>=', '#maxdate')
      .joinCondition('organizationID.state', '=', 'ACTIVE')
      .selectById(staffTableID) || {} : {}

    onDate = onDate || order.orderDate
    const orderState = order.orderState
    const organizationID = order.organizationID || staffTable.organizationID || 0

    result.orgName = order
      ? order['organizationID.nameGen'] || order['organizationID.name'] || ''
      : staffTable['organizationID.nameGen'] || staffTable['organizationID.name'] || ''
    result.orderNumber = order['orderNumber'] || ''
    result.orderYear = order['orderDate'] ? AC.dateService.formatDate(order['orderDate']) : ''
    result.orderName = order['empOrderType.name'] || ''
    if (order.respEmployeePositionID) {
      const respData = await HR.reportUtils.getResponsiblesIncaseInfo(order.respEmployeePositionID, AC.dateService.truncTimeToUtcNull(order.orderDate || order.entryDate))
      result.respName = respData ? respData.respName || '' : ''
      result.respPosName = respData ? respData.respPos || '' : ''
    }

    let newOrgStruct = await UB.Repository('hr_staffUnit')
      .attrs(['mi_data_id', 'parentUnitID', 'name', 'mi_unityEntity', 'liquidate', 'staffOrderID', 'mi_treePath'])
      .where('orgID', '=', organizationID)
    /* старі посади, що вже існували на дату onDate */
      .where('mi_dateFrom', '<=', onDate, 'dateFrom')
      .where('mi_dateTo', '>=', onDate, 'dateTo')
      .where('state', '=', 'ACTIVE', 'active')
      .where('liquidate', '=', 0, 'liqu')
      .notExists(UB.Repository('hr_staffUnit')
        .correlation('mi_data_id', 'mi_data_id')
        .where('staffOrderID', '=', staffTableID)
        .where('mi_deleteDate', '>=', '#maxdate'),
      'notExist')
    /* нові \ змінені \ видалені посади по плановому розпису staffTableID */
      .where('staffOrderID', '=', staffTableID, 'order')
      .logic('(([active] and [liqu] and [notExist] and [dateFrom] and [dateTo]) or ([order]))')
      .orderBy('idxNum')
      .selectAsObject()

    /* Старі посади на onDate. Вважається, що нові зміни будуть введені в дію датою onDate */
    const oldOnDate = (orderState === 'POSTED') ? AC.dateService.addDays(onDate, -1) : onDate
    let oldOrgStruct = await UB.Repository('hr_staffUnit')
      .attrs(['ID', 'mi_data_id', 'parentUnitID', 'name', 'fullName', 'mi_unityEntity', 'liquidate', 'staffOrderID', 'mi_treePath'])
      .where('orgID', '=', organizationID)
      .where('mi_dateFrom', '<=', oldOnDate)
      .where('mi_dateTo', '>=', oldOnDate)
      .where('state', '=', 'ACTIVE')
      .where('liquidate', '=', 0)
      .selectAsObject()

    const posData = await UB.Repository('hr_position')
      .attrs(['ID', 'mi_data_id', 'parentUnitID', 'dictPositionID.fullName', 'dictPositionID.name'])
      .where('staffOrderID', '=', staffTableID)
      .whereIf(organizationID, 'orgID', '=', organizationID)
      .where('liquidate', '=', 1)
      .misc({ __mip_recordhistory_all: true })
      .orderBy('dictPositionID.fullName')
      .orderBy('dictPositionID.name')
      .selectAsObject({
        'dictPositionID.fullName': 'fullName',
        'dictPositionID.name': 'name'
      })

    const ids = posData.map(item => item.mi_data_id)
    if (ids && ids.length > 0) {
      let employeeData = await UB.Repository('hr_employeePositionS')
        .attrs(['departmentID', 'positionID', 'employeeID.fullFIO'])
        .where('dateFrom', '<=', onDate)
        .where('dateTo', '>=', onDate)
        .whereIf(organizationID, 'organizationID', '=', organizationID)
        .whereIf(ids, 'positionID', 'in', ids)
        .selectAsObject()
      if (employeeData && employeeData.length > 0) {
        employeeData = employeeData ? _.groupBy(employeeData, 'positionID') : []
        oldOrgStruct = oldOrgStruct ? _.groupBy(oldOrgStruct, 'mi_data_id') : []
        newOrgStruct = newOrgStruct ? _.groupBy(newOrgStruct, 'mi_data_id') : []

        let obj
        posData.forEach(item => {
          if (employeeData[item.mi_data_id]) {
            for (let i = 0; i < employeeData[item.mi_data_id].length; i++) {
              const employee = employeeData[item.mi_data_id][i]
              obj = {
                breakRow: true,
                data: []
              }
              let depName = ''
              if (oldOrgStruct[employee['departmentID']]) {
                depName = oldOrgStruct[employee['departmentID']][0].name
              } else if (newOrgStruct[employee['departmentID']]) {
                depName = newOrgStruct[employee['departmentID']][0].name
              }
              for (let j = 1; j <= 2; j++) { // need twice
                const empObj = {
                  row: j === 1 ? '____   '.repeat(12) : '',
                  employeeName: employee['employeeID.fullFIO'],
                  employeePositionName: `${item.fullName || item.name} ${depName}`
                }
                obj.data.push(empObj)
              }
              result.employees.push(obj)
            }
          }
        })
        if (obj) obj.breakRow = false // for last object not need breake page
      } else {
        result.noData = [{ text: UB.i18n('На ліквідованих посадах працівників немає') }]
      }
    } else {
      result.noData = [{ text: UB.i18n('Ліквідованих посад немає') }]
    }
    return result
  }
}
