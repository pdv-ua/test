/* global UB AC HR _ */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this

    return me.getReportData(reportParams.instanceID, reportParams.params ? reportParams.params.orderExtraID || 0 : 0).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (ID, orderExtraID) {
    const me = this
    let numb = 1
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
      detail: [],
      tasks: [],
      titleOrderParams: printDocumentView === 'APPOINTMENT' ? 'padding-left: 34px; ' : '',
      printDocumentView: printDocumentView,
      orderType: printDocumentView === 'APPOINTMENT'
        ? UB.i18n('РОЗПОРЯДЖЕННЯ')
        : orderExtract && orderExtract.ID ? UB.i18n('В И Т Я Г &nbsp;З&nbsp; Н А К А З У') : UB.i18n('Н А К А З'),
      responsiblesInfo: responsiblesInfo,
      reason: order.reason
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
      preamble: (order.preamble || '').replace(/&/g, '&nbsp;'),
      titleOrder: (order.titleOrder || '').replace(/&/g, '&nbsp;'),
      organizationNameGen: order['organizationID.nameGen'] || order['organizationID.name'] || '',
      funcOrgType: AC.settings.get('hrFuncOrgType', order.organizationID) || '0'
    }

    await HR.reportUtils.getOrderPrintConfig(result, order.subOrganization ? order.masterOrganizationID : order.organizationID)
    const boldFormatBegin = result.normalFullName ? '' : '<b>'
    const boldFormatEnd = result.normalFullName ? '' : '</b>'
    // let orderWord = UB.i18n('Встановити')
    // orderWord = result.smallOrderWord ? orderWord : orderWord.toUpperCase()

    const onDate = AC.dateService.truncTimeToUtcNull(order.orderDate || order.entryDate)
    const whereArray = order.sortItems === 'ORDER' ? [['empOrderType', 'in', ['TASK', 'ADDSALARY', 'CANCELSALARY']]] : [['empOrderType', 'in', ['ADDSALARY', 'CANCELSALARY']]]
    const empOrder = await HR.reportUtils.getEmpOrderDet(ID, onDate, ['departmentID'], whereArray, true)
    const orderAddsalaryDet = await UB.Repository('hr_empOrderAddsalaryDet')
      .attrs(['ID', 'reason'])
      .where('orderID', '=', ID)
      .where('empOrderType', 'in', ['ADDSALARY', 'CANCELSALARY'])
      .orderBy('itemIdx')
      .selectAsObject()

    const orderDet = await UB.Repository('hr_empOrderChgSalEmpDet')
      .attrs(['ID', 'payElID.name', 'dateFrom', 'dateTo', 'newValue', 'firstName', 'lastName', 'middleName',
        'employeeID.datName', 'organizationID.nameGen', 'organizationID.name', 'accrualRate', 'paraID',
        'employeeNumberID', 'orderID.preamble', 'orderID.comment', 'employeeID.fullFIO', 'employeeID.genName',
        'payElID', 'entityParaID', 'payElID.printName', 'payElID.genName', 'empOrderType', 'cancelPrevAccrual',
        'accrualID.accrualSum', 'accrualID.accrualRate'])
      .where('orderID', '=', ID)
      .where('empOrderType', 'in', ['ADDSALARY', 'CANCELSALARY'])
      .orderBy('itemIdx')
      .selectAsObject()
    const tasks = await HR.reportUtils.getTask(ID, order.orderDate || order.entryDate, order.showTabNum, result.notUseMiddleNameInOrder)

    if (orderDet.length === 1) {
      result.titleName = `Про встановлення ${orderDet[0]['payElID.genName'] || orderDet[0]['payElID.name'] || ''} ` +
          HR.reportUtils.formatShortNameInOrder(orderDet[0]['employeeID.datName'] || orderDet[0]['employeeID.fullFIO'], { notUseMiddleNameInOrder: result.notUseMiddleNameInOrder })
    } else if (orderDet.length === 0) {
      result.titleName = ''
    } else {
      result.titleName = `Про встановлення надбавок<br />працівникам ${result.organizationNameGen}`
    }

    let departments = []
    if (order.sortItems === 'STAFF') {
      const ids = _.compact(_.uniq(empOrder.map(item => item['employeePositionID.departmentID'])))
      departments = await HR.reportUtils.getDepartmentStructName(ids, order.organizationID, order.orderDate || order.entryDate)
    }

    // для сортировки делаем сразу
    const employeeNumberIDtoOrder = []
    orderDet.forEach(el => {
      const item = empOrder.find(o => o.ID === el.ID)
      _.merge(el, item || [])
      el.toOrder = orderExtract && orderExtract.ID
        ? ((orderExtract.departmentID ? orderExtract.departmentID === item.departmentID || orderExtract.departmentID === item['employeePositionID.departmentID'] : true) && (orderExtract.employeePositionID ? orderExtract.employeePositionID === item.employeePositionID : true))
        : true
      if (el.toOrder) {
        employeeNumberIDtoOrder.push(el.employeeNumberID)
      }
      if (order.sortItems === 'STAFF' && item['employeePositionID.departmentID'] && departments[item['employeePositionID.departmentID']]) {
        el['structID'] = departments[item['employeePositionID.departmentID']].idxNum + '_' + departments[item['employeePositionID.departmentID']].name
        el['structName'] = departments[item['employeePositionID.departmentID']].name
      } else {
        el['structID'] = ''
        el['structName'] = ''
      }
      const item2 = orderAddsalaryDet.find(o => o.ID === el.paraID)
      el.reason = (item2 && item2.reason) || ''
    })

    if (order.sortItems === 'STAFF') {
      // для сумісництва необхідно змінити підрозділ на підрозділ основного місця роботи
      orderDet.filter(item => item['employeePositionID.workPlace'] !== '1').forEach(el => {
        const item = orderDet.find(o => o['employeePositionID.workPlace'] === '1' && o.employeeID === el.employeeID)
        if (item) {
          el['employeePositionID.departmentID.idxNum'] = item['employeePositionID.departmentID.idxNum']
          el['employeePositionID.departmentID.name'] = item['employeePositionID.departmentID.name']
          el['structID'] = item.structID
          el['structName'] = item.name
        }
      })
    }

    const getFormatArr = (arr, one, typeText, titleOrg, index = '') => {
      const getFormatRate = (value) => {
        if (!value) {
          return '0'
        }
        const res = HR.reportUtils.formatAsCurrency(value, 2, ',')
        return res.length ? res.replace(',00', '') : res
      }

      if (order.sortItems === 'STAFF') {
        arr.sort(HR.reportUtils.funcOrderTreePathSort)
      } else if (result.funcOrgType === '2') {
        arr = _.sortBy(arr, ['dateFrom', 'dateTo'])
      }
      const res = []
      let text
      const stDepts = order.sortItems === 'ORDER'
        ? _.groupBy(arr, 'null')
        : (_.groupBy(arr, item => order.sortItems === 'STAFF' && typeText !== 2
          ? item.structID : (order.sortItems !== 'STAFF' && result.funcOrgType === '2' ? `${item.dateFrom}/${item.dateTo}` : 'null')))

      _.forEach(stDepts, stItems => {
        if (order.sortItems === 'STAFF') {
          stItems = _.sortBy(stItems, ['employeePositionID.departmentID.idxNum'])
        }
        const objSt = {
          stName: typeText === 2 || order.sortItems === 'ORDER'
            ? ''
            : order.sortItems !== 'STAFF' && result.funcOrgType === '2'
              ? `${UB.i18n('з')}&nbsp;${AC.dateService.formatDate(stItems[0].dateFrom)}${stItems[0].dateTo ? (AC.dateService.formatDate(stItems[0].dateTo) === '31.12.9999' ? '' : UB.i18n(' по&nbsp;') + AC.dateService.formatDate(stItems[0].dateTo)) : ''}:`
              : (order.sortItems === 'STAFF' && typeText !== 2 ? HR.nameCase.cap(stItems[0].structName || '') : ''),
          indent: order.sortItems !== 'STAFF' && result.funcOrgType === '2' ? 'text-indent: 34px;' : '',
          deps: []
        }
        const depts = _.groupBy(stItems, item => order.sortItems === 'STAFF' && typeText !== 2 && order.sortItems !== 'STAFF' ? item['employeePositionID.departmentID.name'] : 'null')
        _.forEach(depts, depItems => {
          const depName = typeText !== 2 && order.sortItems === 'ORDER' ? HR.nameCase.cap(depItems[0]['employeePositionID.departmentID.name'] || '') : ''

          const objDep = {
            depName: order.sortItems !== 'STAFF' || (depName === objSt.stName && objSt.deps.length === 0) ? '' : depName,
            persons: []
          }
          if (order.sortItems === 'ALPHABET' || !order.sortItems) {
            if (result.funcOrgType === '2' && order.sortItems !== 'STAFF') {
              depItems.sort(me.uaSortFIO_WP)
            } else {
              if (order.sortItems === 'STAFF') {
                depItems.sort(me.uaSortFIO_WP_DD)
              } else {
                depItems.sort(me.uaSortFIO_DD)
              }
            }
          }

          depItems.forEach((el, ind) => {
            if (typeText === 1 || typeText === 3) {
              const posInfo = HR.reportUtils.getInfoItemOrderInCase(el, 'dat', true, result.notUseMiddleNameInOrder)
              const tabNum = showTabNum && el['employeeNumberID.tabNum'] ? UB.i18n(`(Таб. №&nbsp;{0})`, el['employeeNumberID.tabNum']) : ''
              // const posName = HR.reportUtils.makePositionName(posInfo.posName, el['employeePositionID.positionID.isOrgBoss'])
              text = one ? index + (typeText === 1 ? 'Встановити ' : 'Скасувати ') : (order.sortItems !== 'STAFF' && result.funcOrgType === '2' ? '' : (typeText === 1 ? `${index ? index.replace(' ', '') : ''}${ind + 1}. ` : ''))
              text += `${boldFormatBegin}${posInfo.empName}${tabNum ? ' ' + boldFormatEnd + tabNum : boldFormatEnd}`
              text += posInfo.posName ? `, ${posInfo.posName}` : ''
              text += one ? ` ${titleOrg} ${UB.i18n('нарахування')} ${HR.nameCase.uncap(el['payElID.printName'] || el['payElID.name'] || '')}` : ''
              text += one ? (el['reason'] ? ' ' + el['reason'] : '') : ''
              text += UB.i18n(', у розмірі ') + (el[typeText === 3 ? 'accrualID.accrualSum' : 'newValue']
                ? `${HR.reportUtils.formatAsCurrency(el[typeText === 3 ? 'accrualID.accrualSum' : 'newValue'] || 0, 2, ',')}&nbsp;${UB.i18n('грн')}.`
                : `${getFormatRate(el[typeText === 3 ? 'accrualID.accrualRate' : 'accrualRate'] || 0)}&nbsp;${AC.dateService.plural('відсотка_відсотки_відсотків', el[typeText === 3 ? 'accrualID.accrualRate' : 'accrualRate'] || 0)} ${UB.i18n('посадового окладу')}`)
              text += typeText === 1 && !el.cancelPrevAccrual ? UB.i18n(' додатково') : ''
              text += order.sortItems !== 'STAFF' && result.funcOrgType === '2' ? '' : (typeText === 1 ? ` ${UB.i18n('з')}&nbsp;${AC.dateService.formatDate(el.dateFrom)}` : '')
              text += order.sortItems !== 'STAFF' && result.funcOrgType === '2' ? '' : (typeText === 3 ? ` ${UB.i18n('з')}&nbsp;${AC.dateService.formatDate(el.dateTo)}` : '')
              text += order.sortItems !== 'STAFF' && result.funcOrgType === '2' ? '' : (typeText === 1 ? AC.dateService.formatDate(el.dateTo) === '31.12.9999' ? '' : ` ${UB.i18n('по')}&nbsp;${AC.dateService.formatDate(el.dateTo)}` : '')
              text += order.sortItems !== 'STAFF' && result.funcOrgType === '2' ? '' : UB.i18n('&nbsp;року')
              text += (ind + 1 < depItems.length ? ';' : '.')
              if (el.toOrder) {
                objDep.persons.push({
                  text: text
                })
              }
            } else {
              text = one ? UB.i18n(`{0}Визнати таким, що втратив чинність, наказ {1}`, index, titleOrg) : ''
              text += el['orderID.orderDate'] ? UB.i18n(' від&nbsp;') + AC.dateService.formatDate(el['orderID.orderDate']) : ''
              text += `${el['orderID.orderNumber'] ? UB.i18n(' №&nbsp;') + el['orderID.orderNumber'] : ''} ${UB.i18n('у частині встановлення')} ${el['payElID.genName'] || el['payElID.name'] || ''} ${el['employeeID.genName'] || el['employeeID.fullFIO']}`
              text += ` (` + (el.accrualSum ? `${HR.reportUtils.formatAsCurrency(el.accrualSum || 0, 2)}&nbsp;${UB.i18n('грн')}.` : `${el.accrualRate || 0}&nbsp;${AC.dateService.plural('відсотка_відсотки_відсотків', el.accrualRate || 0)}`)
              text += ` ${UB.i18n('з')}&nbsp;${AC.dateService.formatDate(el.dateFrom)}${el.dateTo ? (AC.dateService.formatDate(el.dateTo) === '31.12.9999' ? '' : UB.i18n(' по&nbsp;') + AC.dateService.formatDate(el.dateTo)) : ''}` + ')'
              text += (ind + 1) < depItems.length ? ';' : '.'
              if (el.toOrder) {
                objDep.persons.push({
                  text: text
                })
              }
            }
          })

          if (objDep.persons.length) {
            objSt.deps.push(objDep)
          }
        })
        if (objSt.deps.length) {
          res.push(objSt)
        }
      })

      return res
    }

    const orderForCancel = []
    const array = [] // объект пуктов по которым уже делали выборку с hr_employeeAccrual для избежания monkeyRequests
    const fltOrder = orderDet.filter(el => el.cancelPrevAccrual && el.empOrderType === 'ADDSALARY')
    if (fltOrder && fltOrder.length) {
      for (let i = 0; i < fltOrder.length; i++) {
        if (!array.find(o => o.payElID === fltOrder[i].payElID && o.employeeNumberID === fltOrder[i].employeeNumberID &&
            AC.dateService.equals(o.dateFrom, fltOrder[i].dateFrom) && AC.dateService.equals(o.dateTo, fltOrder[i].dateTo))) {
          array.push({
            payElID: fltOrder[i].payElID,
            employeeNumberID: fltOrder[i].employeeNumberID,
            dateFrom: fltOrder[i].dateFrom,
            dateTo: fltOrder[i].dateTo
          })
          const ord = await UB.Repository('hr_employeeAccrual')
            .attrs(['ID', 'payElID', 'payElID.name', 'employeeNumberID', 'orderID.orderNumber', 'orderID.orderDate', 'payElID.printName', 'payElID.genName',
              'employeeID.genName', 'employeeID.fullFIO', 'accrualSum', 'accrualRate',
              'dateFrom', 'dateTo'])
            .where('payElID', '=', fltOrder[i].payElID)
            .where('employeeNumberID', '=', fltOrder[i].employeeNumberID)
            .where('dateFrom', '<=', AC.dateService.shiftDate(fltOrder[i].dateTo))
            .where('dateTo', '>=', AC.dateService.shiftDate(fltOrder[i].dateFrom))
            .where('changeOrderID', 'isNull')
            .where('mi_deleteDate', '>=', '#maxdate')
            .whereIf(ID, 'orderID', '<>', ID)
            .selectAsObject()
          if (ord && ord.length) {
            orderForCancel.push(...ord)
          }
        }
      }
    }
    orderForCancel.forEach(item => {
      item.toOrder = employeeNumberIDtoOrder.indexOf(item.employeeNumberID) !== -1
    })

    const orderGrp = order.sortItems === 'ORDER' ? {} : _.groupBy(orderDet.filter(e => e.empOrderType === 'ADDSALARY'), el => `${el.payElID}/${el.reason}`)
    const orderGrp2 = order.sortItems === 'ORDER' ? {} : _.groupBy(orderDet.filter(e => e.empOrderType === 'CANCELSALARY'), el => `${el.payElID}/${el.reason}`)
    const orderGrp3 = order.sortItems === 'ORDER' ? empOrder.filter(el => el.empOrderType === 'TASK' || orderDet.find(o => o.ID === el.ID)) : []
    const size = _.size(orderGrp) + _.size(orderGrp2) + orderGrp3.length

    _.forEach(orderGrp, flt => {
      const one = order.sortItems !== 'STAFF' && result.funcOrgType === '2' ? false : size === 1 && flt.length === 1 && order.sortItems !== 'STAFF'
      const iStr = size > 1 || (orderForCancel && orderForCancel.length > 0) || (tasks.tasks && tasks.tasks.length) ? `${numb++}. ` : ''
      const items = getFormatArr(flt, one, 1, result.organizationNameGen, iStr)
      if (items.length) {
        result.detail.push({
          one: one,
          i: iStr,
          text: one ? '' : UB.i18n(`Встановити {0} {1} таким працівникам {2}:`, HR.nameCase.uncap(flt[0]['payElID.printName'] || flt[0]['payElID.name'] || ''), flt[0]['reason'] ? ' ' + flt[0]['reason'] : '', result.organizationNameGen),
          items: items
        })
      }
    })

    _.forEach(orderGrp2, flt => {
      const one = size === 1 && flt.length === 1 && order.sortItems !== 'STAFF'
      const iStr = size > 1 || (tasks.tasks && tasks.tasks.length) ? `${numb++}. ` : ''
      const items = getFormatArr(flt, one, 3, result.organizationNameGen, iStr)
      if (items.length) {
        result.detail.push({
          one: one,
          i: iStr,
          text: one ? '' : UB.i18n(`Скасувати нарахування {0} таким працівникам {1}:`, HR.nameCase.uncap(flt[0]['payElID.printName'] || flt[0]['payElID.name'] || ''), result.organizationNameGen),
          items: items
        })
      }
    })

    // сортировка по порядку - каждый пункт отдельно
    _.forEach(orderGrp3, det => {
      const one = true
      const iStr = size > 1 ? `${numb++}. ` : ''

      if (det.empOrderType === 'TASK') {
        const orderItem = tasks.tasks.find(o => o.ID === det.ID)
        let text = `${orderItem.task}${orderItem['positionName'] ? ` ${orderItem['positionName']}` : ''}${orderItem['employeeName'] ? ` ${orderItem['employeeName']}` : ''}.`
        result.detail.push({
          i: iStr,
          text: text,
          items: []
        })
      } else {
        const flt = orderDet.find(o => o.ID === det.ID)
        if (flt) {
          const items = getFormatArr([flt], one, flt.empOrderType === 'ADDSALARY' ? 1 : 3, result.organizationNameGen, iStr)
          if (items.length) {
            result.detail.push({
              one: one,
              i: iStr,
              text: '',
              items: items
            })
          }
        }
      }
    })

    if (orderForCancel && orderForCancel.length > 0) {
      const iStr = `${numb++}. `
      result.detail.push({
        one: orderForCancel.length === 1,
        i: orderForCancel.length === 1 ? '' : iStr,
        text: orderForCancel.length === 1 ? '' : UB.i18n(`Визнати такими, що втратили чинність, накази {0}:`, result.organizationNameGen),
        items: getFormatArr(orderForCancel, orderForCancel.length === 1, 2, result.organizationNameGen, iStr)
      })
    }

    result.tasks = order.sortItems === 'ORDER' ? [] : tasks.tasks.map(e => ({
      task: `${numb === 1 && tasks.tasks.length === 1 ? '' : numb++ + '. '}${e.task}${e['positionName'] ? ` ${e['positionName']}` : ''}${e['employeeName'] ? ` ${e['employeeName']}` : ''}.`
    }))

    return AC.reportService.removeEmptyValues(result)
  },
  uaSortFIO_WP: function (s1, s2) {
    let i = HR.reportUtils.CompareStringUa((s1['employeeID.fullFIO'] || ''), (s2['employeeID.fullFIO'] || ''))
    if (i === 0) {
      i = (s1['employeeID.workPlace'] || '9').localeCompare((s2['employeeID.workPlace'] || '9'))
    }
    return i
  },
  uaSortFIO_WP_DD: function (s1, s2) {
    let i = HR.reportUtils.CompareStringUa((s1['employeeID.fullFIO'] || ''), (s2['employeeID.fullFIO'] || ''))
    if (i === 0) {
      i = (s1['employeeID.workPlace'] || '9').localeCompare((s2['employeeID.workPlace'] || '9'))
    }
    if (i === 0) {
      i = HR.reportUtils.compareDates(s1.dateFrom, s2.dateFrom)
    }
    if (i === 0) {
      i = HR.reportUtils.compareDates(s1.dateTo, s2.dateTo)
    }
    return i
  },
  uaSortFIO_DD: function (s1, s2) {
    let i = HR.reportUtils.CompareStringUa((s1['employeeID.fullFIO'] || ''), (s2['employeeID.fullFIO'] || ''))
    if (i === 0) {
      i = HR.reportUtils.compareDates(s1.dateFrom, s2.dateFrom)
    }
    if (i === 0) {
      i = HR.reportUtils.compareDates(s1.dateTo, s2.dateTo)
    }
    return i
  }
}
