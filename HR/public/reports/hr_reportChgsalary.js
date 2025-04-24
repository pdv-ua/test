/* global UB AC HR _ */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this

    return me.getReportData(reportParams.instanceID).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (ID) {
    const order = await HR.reportUtils.getEmpOrder(ID)
    const onDate = AC.dateService.truncTimeToUtcNull(order.orderDate || order.entryDate)

    const orderDet = await HR.reportUtils.getEmpOrderDet(ID, onDate, ['isGroup', 'employeePositionID.dateTo'], [['empOrderType', '=', 'CHGSALARYEMP'], ['isGroup', '=', '0']], true)
    const orderDetSecond = await UB.Repository('hr_empOrderChgSalPosDet')
      .attrs(['ID', 'posAccrualSum', 'accrualSum', 'paraID.dateFrom', 'empPosDateFrom',
        'employeeID.fullFIO', 'employeeID.genName'])
      .where('orderID', '=', ID)
      .where('accrualSum', '>=', 0)
      .orderBy('itemIdx')
      .selectAsObject()

    const params = {
      organizationNameGen: order['organizationID.nameGen'] || order['organizationID.name'] || '',
      numberPerson: orderDetSecond && orderDetSecond.length ? orderDetSecond.length : '0',
      sumPerson: orderDetSecond && orderDetSecond.length ? HR.reportUtils.formatAsCurrency(orderDetSecond.reduce((sum, item) => {
        sum += item.accrualSum
        return sum
      }, 0)) : '0',
      dataFrom: orderDetSecond && orderDetSecond.length ? UB.i18n(' з&nbsp;') + AC.dateService.formatDate(orderDetSecond[0]['paraID.dateFrom']) : '',
      roundTo: 'numberGroup',
      positions: []
    }
    let settingsOrg = await UB.Repository('ac_settingsOrg')
      .attrs(['value', 'constantID.code'])
      .where('organizationID', '=', order.masterOrganizationID || order.organizationID)
      .where('[constantID.code]', '=', 'hrRoundAccrualStaffTable')
      .selectAsObject({
        'constantID.code': 'code'
      })
    if (settingsOrg) {
      settingsOrg = _.groupBy(settingsOrg, 'code')
      params.roundTo = settingsOrg['hrRoundAccrualStaffTable'] && settingsOrg['hrRoundAccrualStaffTable'][0].value === '1' ? 'decimal2' : params.roundTo
    }

    if (orderDetSecond && orderDetSecond.length) {
      const ids = _.compact(_.uniq(orderDet.map(item => item['employeePositionID.positionID.parentUnitID'])))
      const parentUnit = ids && ids.length ? await HR.reportUtils.getUnitsName(ids, ['description', 'name'], onDate, order.organizationID) : []

      const det = _.groupBy(orderDet.filter(item => orderDetSecond.find(o => o.ID === item.ID)), 'employeePositionID.positionID.parentUnitID')
      _.forEach(det, (item, id) => {
        params.positions.push({
          department: parentUnit[id] ? parentUnit[id].name || '' : '',
          items: item.map(elem => {
            const itm = orderDetSecond.find(o => o.ID === elem.ID)
            _.merge(elem, itm || [])
            return {
              name: elem['employeeID.fullFIO'],
              nameDep: elem['employeePositionID.positionID.name'],
              data: elem['paraID.dateFrom'] && elem.empPosDateFrom && elem['paraID.dateFrom'] < elem.empPosDateFrom ? AC.dateService.formatDate(elem.empPosDateFrom) : '',
              oldValue: elem.posAccrualSum,
              newValue: elem.accrualSum,
              dataTo: !elem['employeePositionID.dateTo'] || (elem['employeePositionID.dateTo'] && AC.dateService.formatDate(elem['employeePositionID.dateTo']) === '31.12.9999') ? '' : AC.dateService.formatDate(elem['employeePositionID.dateTo'])
            }
          })
        })
      })
    }
    return AC.reportService.removeEmptyValues(params)
  }
}
