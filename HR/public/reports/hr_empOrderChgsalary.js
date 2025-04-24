/* global UB AC HR _ */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this

    return me.getReportData(reportParams.instanceID).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (ID) {
    const me = this
    const order = await HR.reportUtils.getEmpOrder(ID)
    const onDate = AC.dateService.truncTimeToUtcNull(order.orderDate || order.entryDate)
    const orderResp = await HR.reportUtils.getResponsiblesForOrder(order)
    const city = await HR.reportUtils.getCityName(order['organizationID'])
    const configObj = { printDocumentView: '' }
    await HR.reportUtils.getOrderPrintConfig(configObj, order.subOrganization ? order.masterOrganizationID : order.organizationID)

    const task = await HR.reportUtils.getTask(ID, order.orderDate || order.entryDate, order.showTabNum, configObj.notUseMiddleNameInOrder)
    let orderDet = await HR.reportUtils.getEmpOrderDet(ID, onDate, ['isGroup', 'employeePositionID.dateTo'], [['empOrderType', '=', 'CHGSALARYEMP'], ['isGroup', '=', '0']], true)
    const orderDetSecond = await UB.Repository('hr_empOrderChgSalPosDet')
      .attrs(['ID', 'previousAccrualSum', 'accrualSum', 'paraID.dateFrom', 'posDateFrom', 'empPosDateFrom',
        'employeeID.fullFIO', 'employeeID.genName'])
      .where('orderID', '=', ID)
      .where('accrualSum', '>=', 0)
      .orderBy('itemIdx')
      .selectAsObject()

    let i = 2
    let titleName
    if (orderDetSecond && orderDetSecond.length === 1) {
      titleName = HR.reportUtils.formatShortNameInOrder(orderDetSecond[0]['employeeID.genName'] || orderDetSecond[0]['employeeID.fullFIO'], { notUseMiddleNameInOrder: configObj.notUseMiddleNameInOrder })
    } else {
      titleName = ''
    }
    const orgStruct = await UB.Repository('hr_staffUnit')
      .attrs(['mi_data_id', 'parentUnitID', 'code', 'name', 'mi_unityEntity'])
      .where('state', '=', 'ACTIVE')
      .where('mi_dateFrom', '<=', order.orderDate || order.entryDate)
      .where('mi_dateTo', '>=', order.orderDate || order.entryDate)
      .whereIf(order.organizationID, 'orgID', '=', order.masterOrganizationID || order.organizationID)
      .whereIf(!order.organizationID, 'parentUnitID', 'isNotNull')
      .orderBy('treePath')
      .selectAsObject()

    const ids = orgStruct.map(el => el.mi_data_id)
    orderDet = orderDet.filter(item => orderDetSecond.find(o => o.ID === item.ID))
    orderDet.forEach(elem => {
      const itm = orderDetSecond.find(o => o.ID === elem.ID)
      _.merge(elem, itm || [])
      if (ids.indexOf(elem['employeePositionID.positionID']) === -1) {
        elem['employeePositionID.positionID'] = null
      }
    })

    const params = {
      line: '_'.repeat(30),
      emblem: HR.reportUtils.getEmblem(),
      orderNumber: order.orderNumber,
      orderIndex: order['dictEmpOrderIndexID.code'] === null ? '' : `/${order['dictEmpOrderIndexID.code']}`,
      orderDate: AC.dateService.getStringFormatDate(order.orderDate, '', ''),
      titleOrder: `${order.titleOrder || ''} <br />${titleName}`.replace(/&/g, '&nbsp;'),
      preamble: (order.preamble || '').replace(/&/g, '&nbsp;'),
      orderReason: {
        reason: order.reason ? UB.i18n(`Підстава: {0}.`, order.reason) : ''
      },
      city: city,
      organizationName: order.orderOrganizationName,
      organizationNameGen: order['organizationID.nameGen'],
      responsiblesInfo: orderResp,
      tasks: task.tasks.map(e => ({
        task: `${i++}. ${e.task}${e['positionName'] ? ` ${e['positionName']}` : ''}${e['employeeName'] ? ` ${e['employeeName']}` : ''}.`
      })),
      dataFrom: orderDetSecond && orderDetSecond.length ? UB.i18n(' з&nbsp;') + AC.dateService.formatDate(orderDetSecond[0]['paraID.dateFrom']) : '',
      addition: [],
      roundTo: 'numberGroup'
    }
    HR.reportUtils.copyToParams(params, configObj)
    params.roundTo = AC.settings.get('hrRoundAccrualStaffTable', order.masterOrganizationID || order.organizationID) === '1' ? 'decimal2' : params.roundTo
    params.addition = me.generateDataForReport(order.organizationID, orgStruct, orderDet, params.notUseMiddleNameInOrder)
    return AC.reportService.removeEmptyValues(params)
  },
  generateDataForReport: function (organizationID, orgStruct, orderDet, notUseMiddleNameInOrder) {
    const me = this
    if (!orgStruct || !orgStruct.length) return []

    function getEmployee (det, result) {
      if (det && det.length) {
        const obj = det.sort(me.sortFunc).map(elem => {
          const posInfo = HR.reportUtils.getInfoItemOrderInCase(elem, 'nom', true, notUseMiddleNameInOrder)

          return {
            isDepartment: false,
            npp: result.indexNpp++,
            name: posInfo.empName, // elem['employeeID.fullFIO'],
            nameDep: posInfo.posName, // elem['employeePositionID.positionID.name'],
            data: elem['paraID.dateFrom'] && elem.empPosDateFrom && elem['paraID.dateFrom'] < elem.empPosDateFrom ? AC.dateService.formatDate(elem.empPosDateFrom) : '',
            oldValue: elem.previousAccrualSum,
            newValue: elem.accrualSum,
            dataTo: !elem['employeePositionID.dateTo'] || (elem['employeePositionID.dateTo'] && AC.dateService.formatDate(elem['employeePositionID.dateTo']) === '31.12.9999') ? '' : AC.dateService.formatDate(elem['employeePositionID.dateTo'])
          }
        })
        result.data.push(...obj)
      }
    }

    function getData (indexNpp, parentID, level = 1, orgStructTree, withOutOfStruct) {
      const result = {
        data: [],
        indexNpp: indexNpp
      }
      if (!orgStructTree || !orgStructTree.length) return result

      const curStruct = orgStructTree.filter(el => el.parentUnitID === parentID)
      const str = level === 1 ? '' : '&nbsp;&nbsp;'.repeat(level - 1)
      const styleBegin = level === 1 ? '<font color="blue">' : level === 2 ? '<u>' : ''
      const styleEnd = level === 1 ? '</font>' : level === 2 ? '</u>' : ''

      curStruct.forEach(orgItem => {
        if (orgItem.mi_unityEntity === 'hr_department') {
          const subTree = getData(result.indexNpp, orgItem.mi_data_id, level + 1, orgStructTree)
          if (subTree && subTree.data && subTree.data.length) {
            const obj = {
              isDepartment: true,
              name: orgItem.name ? `${str}${styleBegin}${level === 1 ? orgItem.name.toUpperCase() : HR.nameCase.cap(orgItem.name)}${styleEnd}` : ''
            }
            result.data.push(obj)
            result.data.push(...subTree.data)
            result.indexNpp = subTree.indexNpp || 1
          }
        } else {
          const det = orderDet.filter(item => item['employeePositionID.positionID'] === orgItem.mi_data_id)
          getEmployee(det, result)
        }
      })

      if (withOutOfStruct) {
        const det = orderDet.filter(item => !item['employeePositionID.positionID'])
        getEmployee(det, result)
      }

      return result
    }

    // должности, которые на прямую подчиняются организации выводим первым в отчете, так же и ликвидированные посады
    let tree = getData(1, organizationID, 1, orgStruct.filter(el => el.parentUnitID === organizationID && el.mi_unityEntity === 'hr_position'), true)
    const data = tree.data
    tree = getData(tree.indexNpp, organizationID, 1, orgStruct.filter(el => !(el.parentUnitID === organizationID && el.mi_unityEntity === 'hr_position')), false)
    data.push(...tree.data)
    return data
  },
  sortFunc: function (s1, s2) {
    return HR.reportUtils.CompareStringUa((s1['employeeID.fullFIO'] || ''), (s2['employeeID.fullFIO'] || ''))
  }
}
