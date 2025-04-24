/* global _ UB AC HR */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this

    return me.getReportData(reportParams.instanceID, reportParams.params ? reportParams.params.orderExtraID || 0 : 0).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (ID, orderExtraID) {
    const orderExtract = await HR.reportUtils.getEmpOrderExtract(orderExtraID)
    const order = await HR.reportUtils.getEmpOrder(ID)
    if (!order) {
      return {
        emblem: HR.reportUtils.getEmblem()
      }
    }
    const documentView = AC.settings.get('hrEmpOrderPrintType', order.masterOrganizationID || order.organizationID)
    const printDocumentView = documentView === order.documentOrderType ? documentView : order.documentOrderType
    const responsiblesInfo = await HR.reportUtils.getResponsiblesForOrder(order, printDocumentView === 'APPOINTMENT')
    const showTabNum = order.showTabNum

    const result = {
      emblem: HR.reportUtils.getEmblem(),
      funcOrgType: false,
      showAccrual: true,
      items: [],
      titleOrderParams: printDocumentView === 'APPOINTMENT' ? 'padding-left: 34px; ' : '',
      printDocumentView: printDocumentView,
      orderType: printDocumentView === 'APPOINTMENT'
        ? UB.i18n('РОЗПОРЯДЖЕННЯ')
        : orderExtract && orderExtract.ID ? UB.i18n('В И Т Я Г &nbsp;З&nbsp; Н А К А З У') : UB.i18n('Н А К А З'),
      responsiblesInfo: responsiblesInfo,
      orderReason: order.reason
        ? {
          indent: printDocumentView === 'APPOINTMENT' ? 'text-indent: 34px;' : '',
          text: UB.i18n(`Підстава: {0}.`, order.reason)
        }
        : null,
      orderBlock: printDocumentView !== 'APPOINTMENT'
        ? {
          city: await HR.reportUtils.getCityName(order.subOrganization ? order.masterOrganizationID : order.organizationID),
          orderNumber: order.orderNumber || '',
          orderDate: AC.dateService.getStringFormatDate(order.orderDate, '', ''),
          orderIndex: order['dictEmpOrderIndexID.code'] === null ? '' : `/${order['dictEmpOrderIndexID.code']}`,
          organizationName: order.orderOrganizationName,
          order: UB.i18n('НАКАЗУЮ:')
        }
        : null,
      appointmentBlock: printDocumentView === 'APPOINTMENT'
        ? {
          orderDate: AC.dateService.formatDate(order.orderDate) || '________________',
          orderNumber: order.orderNumber || '________________',
          orderIndex: order['dictEmpOrderIndexID.code'] === null ? '' : `/${order['dictEmpOrderIndexID.code']}`
        }
        : null,
      mainRespPos: printDocumentView === 'APPOINTMENT' && responsiblesInfo.length ? responsiblesInfo[0].respPos || '' : '',
      titleOrder: order.titleOrder || '',
      preamble: (order.preamble || '').replace(/&/g, '&nbsp;')
    }

    await HR.reportUtils.getOrderPrintConfig(result, order.subOrganization ? order.masterOrganizationID : order.organizationID)
    const boldFormatBegin = result.normalFullName ? '' : '<b>'
    const boldFormatEnd = result.normalFullName ? '' : '</b>'
    let orderWordAveragepay = UB.i18n('Увільнити')
    orderWordAveragepay = result.smallOrderWord ? orderWordAveragepay : orderWordAveragepay.toUpperCase()

    const orgGen = order.subOrganization && (order['organizationID.nameGen'] || order['organizationID.name'])
      ? ' ' + (order['organizationID.nameGen'] || order['organizationID.name']) : ''

    const whereArray = order.sortItems === 'ORDER' ? [['empOrderType', 'in', ['TASK', 'AVERAGEPAY', 'TEMPAVGPAY']]] : [['empOrderType', 'in', ['AVERAGEPAY', 'TEMPAVGPAY']]]
    let orderDet = await HR.reportUtils.getEmpOrderDet(ID, order.orderDate || order.entryDate, ['departmentID'], whereArray, true)
    const ids = order.sortItems === 'STAFF' || order.sortItems === 'DEPART' ? _.compact(_.uniq(orderDet.map(item => item['employeePositionID.departmentID']))) : []
    const departments = await HR.reportUtils.getDepartmentStructName(ids, order.organizationID, order.orderDate || order.entryDate)

    const averagepayDet = await UB.Repository('hr_empOrderAveragepayDet')
      .attrs(['ID', 'orderWord'])
      .where('orderID', '=', ID)
      .orderBy('itemIdx')
      .selectAsObject()
    const employeeDet = await UB.Repository('hr_empOrderEmployeeDet')
      .attrs(['ID', 'employeeID.genName', 'employeeID.fullFIO', 'paraID', 'dateFrom', 'dateTo'])
      .where('orderID', '=', ID)
      .orderBy('itemIdx')
      .selectAsObject()

    const tempavgpayDet = await UB.Repository('hr_empOrderTempavgpayDet')
      .attrs(['ID', 'dateFrom', 'dateTo', 'departmentID', 'positionID', 'orderWord', 'employeePositionID'])
      .where('orderID', '=', ID)
      .orderBy('itemIdx')
      .selectAsObject()
    const positionIDs = _.compact(_.uniq(tempavgpayDet.map(elem => elem.positionID)))
    const posGen = await HR.reportUtils.getPositionName(positionIDs, ['fullNameGen', 'nameGen', 'name'], order.orderDate || order.entryDate, order.organizationID, [], 'ID')

    _.forEach(employeeDet, orderItem => {
      const itm = orderDet.find(o => o.ID === orderItem.ID)
      _.merge(orderItem, itm || [])
      orderItem.toOrder = orderExtract && orderExtract.ID
        ? ((orderExtract.departmentID ? orderExtract.departmentID === orderItem.departmentID : true) && (orderExtract.employeePositionID ? orderExtract.employeePositionID === orderItem.employeePositionID : true))
        : true
      if ((order.sortItems === 'STAFF' || order.sortItems === 'DEPART') && orderItem['employeePositionID.departmentID'] && departments[orderItem['employeePositionID.departmentID']]) {
        orderItem['structID'] = departments[orderItem['employeePositionID.departmentID']].treePath
        orderItem['structName'] = departments[orderItem['employeePositionID.departmentID']].name
      } else {
        orderItem['structID'] = (order.subOrganization ? order['masterOrganizationID.treePath'] : order['organizationID.treePath'])
        orderItem['structName'] = ''
      }
    })

    _.forEach(tempavgpayDet, orderItem => {
      const itm = orderDet.find(o => o.ID === orderItem.ID)
      _.merge(orderItem, itm || [])
      orderItem.toOrder = orderExtract && orderExtract.ID
        ? ((orderExtract.departmentID ? orderExtract.departmentID === orderItem.departmentID : true) && (orderExtract.employeePositionID ? orderExtract.employeePositionID === orderItem.employeePositionID : true))
        : true
      if ((order.sortItems === 'STAFF' || order.sortItems === 'DEPART') && orderItem['employeePositionID.departmentID'] && departments[orderItem['employeePositionID.departmentID']]) {
        orderItem['structID'] = departments[orderItem['employeePositionID.departmentID']].treePath
        orderItem['structName'] = departments[orderItem['employeePositionID.departmentID']].name
      } else {
        orderItem['structID'] = (order.subOrganization ? order['masterOrganizationID.treePath'] : order['organizationID.treePath'])
        orderItem['structName'] = ''
      }
    })
    const tempavgpayDetByEP = tempavgpayDet.length ? _.groupBy(tempavgpayDet, 'employeePositionID') : {}

    const taskDet = await HR.reportUtils.getTask(ID, order.orderDate || order.entryDate, order.showTabNum, result.notUseMiddleNameInOrder)
    const totalCount = averagepayDet.length + _.size(tempavgpayDetByEP)

    if (order.titleOrder) {
      result.titleOrder = order.titleOrder
    } else {
      let titleName = ''
      if (totalCount === 1) {
        titleName = HR.reportUtils.formatShortNameInOrder(employeeDet.length ? employeeDet[0]['employeeID.datName'] || employeeDet[0]['employeeID.fullFIO'] : tempavgpayDet[0]['employeeID.datName'] || tempavgpayDet[0]['employeeID.fullFIO'], { notUseMiddleNameInOrder: result.notUseMiddleNameInOrder })
      } else if (totalCount !== 0) {
        titleName = UB.i18n('працівникам')
      }
      result.titleOrder = employeeDet.length && tempavgpayDet.length
        ? UB.i18n('Про оплату за середнім та тимчасове переведення з оплатою по середньому')
        : tempavgpayDet.length
          ? UB.i18n('Про тимчасове переведення з оплатою по середньому')
          : UB.i18n('Про оплату за середнім')

      result.titleOrder += titleName ? '<br/>' + titleName : ''
    }
    result.titleOrder = result.titleOrder.replace(/&/g, '&nbsp;')

    function getDatesText (objItem) {
      return (objItem.dateFrom && objItem.dateTo && AC.dateService.dateDiff(objItem.dateFrom, objItem.dateTo)
        ? (objItem.dateFrom ? UB.i18n(' з&nbsp;') + AC.dateService.formatDate(objItem.dateFrom) : '') +
        (objItem.dateTo && AC.dateService.formatDate(objItem.dateTo) !== '31.12.9999' ? UB.i18n(' по&nbsp;') + AC.dateService.formatDate(objItem.dateTo) : '')
        : (objItem.dateTo ? UB.i18n(' на&nbsp;') + AC.dateService.formatDate(objItem.dateFrom) : ''))
    }

    function getAveragepayData (det, itemOrderWord) {
      const data = []
      _.forEach(det, (detItem, npp) => {
        let posInfoAcc = HR.reportUtils.getInfoItemOrderInCase(detItem, 'acc', true, result.notUseMiddleNameInOrder)
        const tabNum = showTabNum && itm['employeeNumberID.tabNum'] ? UB.i18n(`(Таб. №&nbsp;{0})`, itm['employeeNumberID.tabNum']) : ''
        data.push({
          toOrder: detItem.toOrder,
          text: `${boldFormatBegin + (posInfoAcc.empName || '')}${tabNum ? ' ' + boldFormatEnd + tabNum : boldFormatEnd}${posInfoAcc && posInfoAcc.posName ? ', ' + posInfoAcc.posName + orgGen + ',' : ''}` +
            getDatesText(detItem) +
            (itemOrderWord ? ' ' + UB.i18n(`в зв’язку {0}`, itemOrderWord) : '') +
            ' ' + UB.i18n(`зі збереженням місця роботи, посади  та середньомісячної заробітної плати`) + (npp < det.length - 1 ? ';' : '.')
        })
      })
      return data
    }

    function getTempavgpayData (tempavgpayDetRow) {
      const data = []
      if (tempavgpayDetRow && !tempavgpayDetRow.alreadyAdd) {
        tempavgpayDetRow.alreadyAdd = true
        const rows = tempavgpayDetByEP[tempavgpayDetRow.employeePositionID]
        const itemIdxText = totalCount === 1 && taskDet.tasks.length === 0 ? '' : `${index++}. `

        let posInfoAcc = HR.reportUtils.getInfoItemOrderInCase(tempavgpayDetRow, 'acc', true, result.notUseMiddleNameInOrder)
        const tabNum = showTabNum && tempavgpayDetRow['employeeNumberID.tabNum'] ? UB.i18n(`(Таб. №&nbsp;{0})`, itm['employeeNumberID.tabNum']) : ''

        let text = tempavgpayDetRow.orderWord ? tempavgpayDetRow.orderWord + ' ' : ''
        text += `${boldFormatBegin + (posInfoAcc.empName || '')}${tabNum ? ' ' + boldFormatEnd + tabNum : boldFormatEnd}${posInfoAcc && posInfoAcc.posName ? ', ' + posInfoAcc.posName + orgGen : ''}`
        const cntPosition = _.compact(_.uniq(rows.map(elem => elem.positionID))).length
        text += cntPosition === 1 ? ' ' + UB.i18n('на посаду') + ' ' + posGen[tempavgpayDetRow.positionID].name : ''
        text += rows.length === 1 ? getDatesText(tempavgpayDetRow) + '.' : ''
        data.push({
          toOrder: tempavgpayDetRow.toOrder,
          text: itemIdxText + text
        })

        if (rows.length > 1) {
          _.forEach(rows, (rowItem, ind) => {
            rowItem.alreadyAdd = true
            data.push({
              toOrder: tempavgpayDetRow.toOrder,
              text: (cntPosition > 1 ? UB.i18n('на посаду') + ' ' + posGen[rowItem.positionID].name + ' ' : '') + getDatesText(rowItem) + (ind < rows.length - 1 ? ';' : '.')
            })
          })
        }
      }
      return data
    }
    let index = 1

    if (order.sortItems === 'ORDER') {
      for (let i = 0; i < orderDet.length; i++) {
        const item = orderDet[i]
        if (item.empOrderType === 'TASK') {
          const taskItem = taskDet.tasks.find(o => o.ID === item.ID)
          if (taskItem) {
            const itemIdxText = totalCount === 0 && taskDet.tasks.length === 1 ? '' : `${index++}. `
            const text = ` ${taskItem.task}${taskItem['positionName'] ? ` ${taskItem['positionName']}` : ''}${taskItem['employeeName'] ? ` ${taskItem['employeeName']}` : ''}.`
            result.items.push({
              toOrder: true,
              text: itemIdxText + text
            })
          }
        } // 'TASK'
        if (item.empOrderType === 'AVERAGEPAY') {
          const averagepayDetRow = _.find(averagepayDet, { ID: item.ID })
          if (averagepayDetRow) {
            if (employeeDet && employeeDet.length) {
              let det = employeeDet.filter(elem => elem.paraID === averagepayDetRow.ID)
              const itemIdxText = totalCount === 1 && taskDet.tasks.length === 0 ? '' : `${index++}. `
              const puntkObj = {
                toOrder: false,
                text: `${itemIdxText}${orderWordAveragepay}:`
              }
              result.items.push(puntkObj)
              result.items.push(...getAveragepayData(det, averagepayDetRow.orderWord))
            }
          }
        } // AVERAGEPAY
        if (item.empOrderType === 'TEMPAVGPAY') {
          const tempavgpayDetRow = _.find(tempavgpayDet, { ID: item.ID })
          result.items.push(...getTempavgpayData(tempavgpayDetRow))
        } // TEMPAVGPAY
      }
    } else {
      // 'AVERAGEPAY'
      for (let i = 0; i < averagepayDet.length; i++) {
        let det = employeeDet && employeeDet.length ? employeeDet.filter(elem => elem.paraID === averagepayDet[i].ID) : []
        if (det.length) {
          const itemIdxText = totalCount === 1 && taskDet.tasks.length === 0 ? '' : `${index++}. `
          const puntkObj = {
            toOrder: !!det.filter(elem => elem.toOrder).length,
            text: `${itemIdxText}${orderWordAveragepay}:`
          }
          if (puntkObj.toOrder) {
            result.items.push(puntkObj)
            if (order.sortItems === 'STAFF' || order.sortItems === 'DEPART') {
              det = det.sort(HR.reportUtils.funcOrderTreePathSort)
            }

            const stDepts = _.groupBy(det, order.sortItems === 'STAFF' || order.sortItems === 'DEPART' ? 'structID' : 'null')
            _.forEach(stDepts, stItems => {
              stItems = order.sortItems === 'STAFF' || order.sortItems === 'DEPART' ? _.sortBy(stItems, ['structID']) : stItems
              const objSt = {
                stName: order.sortItems === 'STAFF' || order.sortItems === 'DEPART' ? HR.nameCase.cap(stItems[0].structName || '') : '',
                deps: []
              }
              const depts = _.groupBy(stItems, item => order.sortItems === 'STAFF' ? item['employeePositionID.departmentID'] : 'null')
              _.forEach(depts, depItems => {
                const depName = HR.nameCase.cap(depItems[0]['employeePositionID.departmentID.name'] || '')
                // let payType = ''
                if (order.sortItems === 'STAFF') {
                  depItems = depItems.sort(HR.reportUtils.funcOrderTreePathSort)
                }
                if (order.sortItems === 'ALPHABET') {
                  depItems = depItems.sort(HR.reportUtils.funcOrderFioTabNumSort)
                }

                const objDep = {
                  depName: order.sortItems !== 'STAFF' || depName === objSt.stName ? '' : depName,
                  items: getAveragepayData(depItems, averagepayDet[i].orderWord)
                }

                objDep.items = objDep.items.filter(el => el.toOrder)
                if (objDep.items.length) {
                  objSt.deps.push(objDep)
                }
              })
              if (objSt.deps.length) {
                result.items.push(objSt)
              }
            })
          }
        }
      } // AVERAGEPAY

      // TEMPAVGPAY
      const stDepts = _.groupBy(tempavgpayDet, order.sortItems === 'STAFF' || order.sortItems === 'DEPART' ? 'structID' : 'null')
      _.forEach(stDepts, stItems => {
        stItems = order.sortItems === 'STAFF' || order.sortItems === 'DEPART' ? _.sortBy(stItems, ['structID']) : stItems
        const objSt = {
          stName: order.sortItems === 'STAFF' || order.sortItems === 'DEPART' ? HR.nameCase.cap(stItems[0].structName || '') : '',
          deps: []
        }
        if (order.sortItems === 'STAFF') {
          stItems = stItems.sort(HR.reportUtils.funcOrderTreePathSort)
        }

        const depts = _.groupBy(stItems, item => order.sortItems === 'STAFF' ? item['employeePositionID.departmentID'] : 'null')
        _.forEach(depts, depItems => {
          const depName = HR.nameCase.cap(depItems[0]['employeePositionID.departmentID.name'] || '')

          if (order.sortItems === 'STAFF') {
            depItems = depItems.sort(HR.reportUtils.funcOrderTreePathSort)
          }
          if (order.sortItems === 'ALPHABET') {
            depItems = depItems.sort(HR.reportUtils.funcOrderFioTabNumSort)
          }

          const objDep = {
            depName: order.sortItems !== 'STAFF' || depName === objSt.stName ? '' : depName,
            items: []
          }

          for (let i = 0; i < depItems.length; i++) {
            objDep.items.push(...getTempavgpayData(depItems[i]))
          }

          objDep.items = objDep.items.filter(el => el.toOrder)
          if (objDep.items.length) {
            objSt.deps.push(objDep)
          }
        })
        if (objSt.deps.length) {
          result.items.push(objSt)
        }
      })
    } // TEMPAVGPAY

    // result.items = result.items.filter(el => el.toOrder)
    result.tasks = order.sortItems === 'ORDER' ? [] : taskDet.tasks.map(e => ({
      task: `${index === 1 && taskDet.tasks.length === 1 ? '' : index++ + '. '}${e.task}${e['positionName'] ? ` ${e['positionName']}` : ''}${e['employeeName'] ? ` ${e['employeeName']}` : ''}.`
    }))
    return result
  }
}
