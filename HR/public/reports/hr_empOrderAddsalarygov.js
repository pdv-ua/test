/* global UB AC HR _ */
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
    const orgType = AC.settings.get('hrFuncOrgType', order.masterOrganizationID || order.organizationID)
    const documentView = AC.settings.get('hrEmpOrderPrintType', order.masterOrganizationID || order.organizationID)
    const printDocumentView = documentView === order.documentOrderType ? documentView : order.documentOrderType
    const responsiblesInfo = await HR.reportUtils.getResponsiblesForOrder(order, printDocumentView === 'APPOINTMENT')
    const result = {
      emblem: HR.reportUtils.getEmblem(),
      detail: [],
      positionType: null,
      isPrintAddon: false,
      addons: [],
      line: '_'.repeat(30),
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
      preamble: (order.preamble || '').replace(/&/g, '&nbsp;'),
      titleOrder: (order.titleOrder || '').replace(/&/g, '&nbsp;'),
      organizationNameGen: order['organizationID.nameGen'] || order['organizationID.name'] || ''
    }

    await HR.reportUtils.getOrderPrintConfig(result, order.subOrganization ? order.masterOrganizationID : order.organizationID)
    const boldFormatBegin = result.normalFullName ? '' : '<b>'
    const boldFormatEnd = result.normalFullName ? '' : '</b>'
    let orderWord = UB.i18n('Встановити')
    orderWord = result.smallOrderWord ? orderWord : orderWord.toUpperCase()

    const orgGen = order.subOrganization && (order['organizationID.nameGen'] || order['organizationID.name'])
      ? ' ' + (order['organizationID.nameGen'] || order['organizationID.name']) : ''
    const showTabNum = order.showTabNum //AC.settings.get('hrOrderTabNum', order.organizationID)

    const whereArray = order.sortItems === 'ORDER' && !order.isAppendix ? [['empOrderType', 'in', ['TASK', 'ADDSALARYGOV']]] : [['empOrderType', '=', 'ADDSALARYGOV']]

    const orderDet = await HR.reportUtils.getEmpOrderDet(ID, order.orderDate || order.entryDate, ['departmentID'], whereArray, order.sortItems === 'STAFF')
    let addsalarygovDet = await UB.Repository('hr_empOrderAddsalarygovDet')
      .attrs(['ID', 'inAmountOfText'])
      .where('inAmountOfText', 'isNotNull')
      .where('orderID', '=', ID)
      .selectAsObject()
    addsalarygovDet = addsalarygovDet && addsalarygovDet.length ? _.groupBy(addsalarygovDet, 'ID') : {}

    let detail = await UB.Repository('hr_empOrderChgSalEmpDet')
      .attrs(['ID', 'accrualRate', 'dateFrom', 'employeeID.datName', 'employeeID.fullFIO', 'stageYear', 'payElID', 'payElID.printName', 'payElID.name',
        'payElID.dictExperienceID', 'payElID.dictExperienceID.printName', 'payElID.dictExperienceID.name', 'stageMonth', 'stageDay', 'paraID'])
      .where('orderID', '=', ID)
      .selectAsObject()
    result.titleOrder = (order.titleOrder || '').replace(/&/g, '&nbsp;')
    result.isPrintAddon = order.isAppendix
    result.positionType = orderDet.length && orderDet.filter(item => item['employeePositionID.positionID.positionType'] !== '1' && _.find(detail, { ID: item.ID })).length === 0 // && result.positionType
    const taskDet = await HR.reportUtils.getTask(ID, order.orderDate || order.entryDate, order.showTabNum, result.notUseMiddleNameInOrder)

    const ids = order.sortItems === 'STAFF' ? _.compact(_.uniq(orderDet.map(item => item['employeePositionID.departmentID']))) : []
    const departments = await HR.reportUtils.getDepartmentStructName(ids, order.organizationID, order.orderDate || order.entryDate)
    _.forEach(detail, orderItem => {
      const item = orderDet.find(o => o.ID === orderItem.ID)
      _.merge(orderItem, item || [])
      orderItem.toOrder = orderExtract && orderExtract.ID
        ? ((orderExtract.departmentID ? orderExtract.departmentID === item.departmentID : true) && (orderExtract.employeePositionID ? orderExtract.employeePositionID === item.employeePositionID : true))
        : true
      if (order.sortItems === 'STAFF' && item['employeePositionID.departmentID'] && departments[item['employeePositionID.departmentID']]) {
        orderItem['structID'] = departments[item['employeePositionID.departmentID']].treePath
        orderItem['structName'] = departments[item['employeePositionID.departmentID']].name
      } else {
        orderItem['structID'] = (order.subOrganization ? order['masterOrganizationID.treePath'] : order['organizationID.treePath'])
        orderItem['structName'] = ''
      }
    })

    let i = 1
    const cntPunkt = (taskDet.tasks ? taskDet.tasks.length : 0) + (detail ? detail.length : 0)
    if (detail && detail.length) {
      if (detail.length === 1) {
        const titleName = HR.reportUtils.formatShortNameInOrder(detail[0]['employeeID.datName'] || detail[0]['employeeID.fullFIO'], { notUseMiddleNameInOrder: result.notUseMiddleNameInOrder })
        result.titleOrder = `${result.titleOrder || ''}${result.titleOrder && titleName ? '<br/>' : ''}${titleName || ''}`
      } else {
        result.titleOrder = `${result.titleOrder || ''}${result.titleOrder ? '<br/>' : ''}${UB.i18n('працівникам')} ${result.organizationNameGen}`
      }
      if (result.isPrintAddon) {
        result.detail.push({
          toOrder: true,
          text: (cntPunkt > 1 ? `${i++}. ` : '') + UB.i18n(`{2} надбавки {0} {1} згідно із додатком.`, result.positionType ? UB.i18n('державним службовцям') : UB.i18n('працівникам'), result.organizationNameGen, orderWord),
          stDeps: []
        })
      }

      const detailObj = order.sortItems === 'ORDER' && !result.isPrintAddon ? _.groupBy(orderDet, 'ID') : _.groupBy(detail, el => result.isPrintAddon ? `${el.payElID}/${el.dictExperienceID}` : el.payElID)
      _.forEach(detailObj, detailItems => {
        let payElName = HR.nameCase.uncap(detailItems[0]['payElID.printName'] || detailItems[0]['payElID.name'] || '')
        let mainObj
        let objAddon
        let indexText = result.isPrintAddon ? '' : (cntPunkt > 0 ? `${i++}.` : '')
        if (result.isPrintAddon) {
          objAddon = {
            payElID: detailItems[0].payElID,
            payElName: payElName,
            dictExperienceID: detailItems[0]['payElID.dictExperienceID'],
            experienceName: HR.nameCase.uncap(detailItems[0]['payElID.dictExperienceID.name'] || ''),
            stDeps: []
          }
          // result.addons.push(objAddon)
        } else {
          mainObj = {
            toOrder: false,
            text: result.isPrintAddon || (detailItems.length === 1 && order.sortItems !== 'STAFF') ? '' : indexText + ` ${orderWord} ${payElName} таким ${result.positionType ? 'державним службовцям' : 'працівникам'} ${result.organizationNameGen}:`,
            stDeps: []
          }
          // result.detail.push(mainObj)
        }

        detailItems = order.sortItems === 'STAFF' ? _.sortBy(detailItems, ['structID']) : detailItems
        const stDepts = _.groupBy(detailItems, item => order.sortItems === 'STAFF' ? item.structID : 'null')
        _.forEach(stDepts, stItems => {
          stItems = order.sortItems === 'STAFF' ? _.sortBy(stItems, ['structID']) : stItems
          const objSt = {
            stName: order.sortItems === 'STAFF' ? HR.nameCase.cap(stItems[0].structName || '') : '',
            deps: []
          }
          const depts = _.groupBy(stItems, item => order.sortItems === 'STAFF' ? item['employeePositionID.departmentID'] : 'null')
          _.forEach(depts, depItems => {
            const depName = HR.nameCase.cap(depItems[0]['employeePositionID.departmentID.name'] || '')

            if (order.sortItems === 'STAFF') {
              depItems = depItems.sort(HR.reportUtils.funcOrderTreePathSort)
            }
            if (!order.sortItems || order.sortItems === 'ALPHABET') {
              depItems = depItems.sort(HR.reportUtils.funcOrderFioTabNumSort)
            }
            let npp = 1
            let items = depItems.map((item, index) => {
              if (item.empOrderType === 'TASK') {
                const orderItem = taskDet.tasks.find(o => o.ID === item.ID)
                if (orderItem) {
                  const text = ` ${orderItem.task}${orderItem['positionName'] ? ` ${orderItem['positionName']}` : ''}${orderItem['employeeName'] ? ` ${orderItem['employeeName']}` : ''}.`
                  return {
                    task: true,
                    toOrder: true,
                    text: text
                  }
                }
              } else {
                const el = detail.find(o => o.ID === item.ID)
                if (el) {
                  payElName = HR.nameCase.uncap(el['payElID.printName'] || el['payElID.name'] || '') // второй раз нужно если order.sortItems === 'ORDER'
                  const posName = result.isPrintAddon
                    ? HR.nameCase.cap(el['employeePositionID.positionID.fullName'] || el['employeePositionID.positionID.name'] || '')
                    : HR.reportUtils.makePositionName(el['employeePositionID.positionID.fullNameDat'] || el['employeePositionID.positionID.nameDat'] || el['employeePositionID.positionID.name'] || '', el['employeePositionID.positionID.isOrgBoss'])

                  if (result.isPrintAddon) {
                    return {
                      toOrder: el.toOrder,
                      index: npp++,
                      empName: HR.reportUtils.formatFullNameInOrder(el['employeeID.fullFIO'], { notUseMiddleNameInOrder: result.notUseMiddleNameInOrder }) + (showTabNum && el['employeeNumberID.tabNum'] ? UB.i18n(` (Таб.&nbsp;№&nbsp;{0})`, el['employeeNumberID.tabNum']) : ''),
                      posName: posName || '',
                      dateFrom: AC.dateService.formatDate(el.dateFrom),
                      stageYear: el.stageYear || 0,
                      stageMonth: el.stageMonth || 0,
                      stageDay: el.stageDay || 0,
                      value: el.accrualRate || 0,
                      valueIsInt: AC.currencyService.isInt(el.accrualRate || 0)
                    }
                  } else {
                    if (mainObj && el.toOrder) {
                      mainObj.toOrder = true
                    }
                    const nameDat = HR.reportUtils.formatFullNameInOrder(el['employeeID.datName'] || el['employeeID.fullFIO'], { notUseMiddleNameInOrder: result.notUseMiddleNameInOrder })
                    const experience = HR.nameCase.uncap(el['payElID.dictExperienceID.printName'] || el['payElID.dictExperienceID.name'] || '')
                    let stageValue = ''
                    if (orgType !== '2') {
                      stageValue = el.stageYear ? `${el.stageYear || '0'}&nbsp;${HR.reportUtils.suffixesOfYears(el.stageYear)}` : ''
                      stageValue += el.stageMonth ? (stageValue ? ' ' : '') + `${el.stageMonth || ''}&nbsp;${AC.dateService.plural(UB.i18n('місяць_місяці_місяців'), el.stageMonth)}` : ''
                      stageValue += el.stageDay ? (stageValue ? ' ' : '') + `${el.stageDay || ''}&nbsp;${AC.dateService.plural(UB.i18n('день_дні_днів'), el.stageDay)}` : ''
                      if (!stageValue) {
                        stageValue = `0&nbsp;${HR.reportUtils.suffixesOfYears(0)}`
                      }
                    } else {
                      stageValue = `${el.stageYear || '0'}&nbsp;${HR.reportUtils.suffixesOfYears(el.stageYear)}`
                    }

                    const inAmountOfText = addsalarygovDet[el.paraID] ? addsalarygovDet[el.paraID][0].inAmountOfText : UB.i18n('у розмірі')
                    return {
                      toOrder: el.toOrder,
                      text: `${detailItems.length === 1 && order.sortItems !== 'STAFF' ? ' ' + orderWord + ' ' : indexText + (index + 1) + '. '}` +
                  `${boldFormatBegin}${nameDat}${showTabNum && el['employeeNumberID.tabNum'] ? ' ' + boldFormatEnd + UB.i18n(`(Таб. №&nbsp;{0})`, el['employeeNumberID.tabNum']) : boldFormatEnd}${posName ? ', ' + posName + (detailItems.length === 1 ? orgGen : '') + ',' : ''}${detailItems.length === 1 ? ' ' + payElName : ''} ${inAmountOfText} ` +
                  `${el.accrualRate || ''}&nbsp;${AC.dateService.plural('відсотка_відсотки_відсотків', el.accrualRate)} ${UB.i18n('посадового окладу')} ` +
                  `з&nbsp;${AC.dateService.formatDate(el.dateFrom)} ${stageValue ? 'за&nbsp;' + stageValue : ''}${experience ? ' ' + experience : ''}.`
                    }
                  }
                } else {
                  return {
                    toOrder: false,
                    text: ''
                  }
                }
              }
            }).filter(el => el.toOrder)

            if (order.sortItems !== 'STAFF' && items.length === 1 && !result.isPrintAddon) {
              mainObj.text = indexText + items[0].text
              items = []
            }

            if (items.length) {
              objSt.deps.push({
                depName: order.sortItems !== 'STAFF' || depName === objSt.stName ? '' : depName,
                items: items
              })
            }
          })
          if (result.isPrintAddon) {
            if (objSt.deps.length) {
              objAddon.stDeps.push(objSt)
            }
          } else {
            if (objSt.deps.length) {
              mainObj.stDeps.push(objSt)
            }
          }
        })
        if (result.isPrintAddon) {
          if (objAddon.stDeps.length) {
            result.addons.push(objAddon)
          }
        } else {
          if (mainObj.text) {
            result.detail.push(mainObj)
          } else {
            i-- // вернем итератор
          }
        }
      })
    }
    /*
    result.detail = result.detail.filter(el => el.toOrder)
    if (result.isPrintAddon && orderExtract && orderExtract.ID) {
      for (let j = 0; j < result.addons.length; j++) {
        result.addons[j].items = result.addons[j].items.filter(el => el.toOrder)
      }
      result.addons = result.addons.filter(el => el.items.length)
    }
     */

    result.tasks = order.sortItems === 'ORDER' && !result.isPrintAddon ? [] : taskDet.tasks.map(e => ({
      task: `${cntPunkt === 1 ? '' : i++ + '. '}${e.task}${e['positionName'] ? ` ${e['positionName']}` : ''}${e['employeeName'] ? ` ${e['employeeName']}` : ''}.`
    }))
    result.positionType = result.positionType ? UB.i18n('державних службовців') : UB.i18n('працівників')
    return result
  }
}
