/* global UB AC HR _ */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    reportParams = (typeof reportParams === 'string') ? JSON.parse(reportParams) : reportParams
    return me.getData(reportParams).then(data => me.getParams(data)).then(params => AC.reportService.generateReport(params, me))
  },

  getData (reportParams) {
    return Promise.all([
      HR.reportUtils.getEmpOrderExtract(reportParams.params ? reportParams.params.orderExtraID || 0 : 0)])
      .then(([orderExtract]) => {
        const whereArray = [['empOrderType', 'in', ['TASK', 'BOUNTY_HELP']]]
        return Promise.all([
          HR.reportUtils.getEmpOrder(reportParams.instanceID)]).then(([order]) => {
            const documentView = AC.settings.get('hrEmpOrderPrintType', order.masterOrganizationID || order.organizationID)
            const printDocumentView = documentView === order.documentOrderType ? documentView : order.documentOrderType
            const configObj = { printDocumentView }
            return Promise.all([
              HR.reportUtils.getOrderPrintConfig(configObj, order.subOrganization ? order.masterOrganizationID : order.organizationID),
              HR.reportUtils.getEmpOrderDet(reportParams.instanceID, order.orderDate || order.entryDate, ['departmentID'], whereArray, order.sortItems === 'STAFF'),
              UB.Repository('hr_empOrderChgSalEmpDet')
                .attrs(['ID', 'entityParaID', 'dateFrom', 'dateTo', 'newValue', 'accrualCount', 'accrualRate', 'avgCount',
                  'payElID', 'payElID.name', 'payElID.printName', 'payElID.genName', 'employeeID.datName', 'employeeID.fullFIO',
                  'valuation', 'employeeFamilyID', 'employeeFamilyID.peopleID.fullFIO', // 'employeeFamilyID.peopleID.datName',
                  'employeeID.deathDate', 'employeeFamilyID.peopleID.sexType', 'employeeFamilyID.dictKinshipKindID.genNameBackwardMale',
                  'employeeFamilyID.dictKinshipKindID.genNameBackwardFemale', 'dictFundSourceID', 'dictFundSourceID.name', 'dictFundSourceID.genName'])
                .where('orderID', '=', reportParams.instanceID)
                .joinCondition('employeeFamilyID.mi_deleteDate', '>=', '#maxdate')
                .orderBy('itemIdx')
                .selectAsObject({
                  'valuation': 'payType'
                }),
              HR.reportUtils.getResponsiblesForOrder(order, printDocumentView === 'APPOINTMENT'),
              HR.reportUtils.getCityName(order.subOrganization ? order.masterOrganizationID : order.organizationID),
              printDocumentView
          ]).then(([configObj, empOrder, orderDetEmpl, respPosInfo, city, printDocumentView]) => {
            const ids = order.sortItems === 'STAFF' ? _.compact(_.uniq(empOrder.map(item => item['employeePositionID.departmentID']))) : []
            return Promise.all([
              HR.reportUtils.getTask(reportParams.instanceID, order.orderDate || order.entryDate, order.showTabNum, configObj.notUseMiddleNameInOrder),
              HR.reportUtils.getDepartmentStructName(ids, order.organizationID, order.orderDate || order.entryDate)
            ]).then(([tasks, departments]) => ({
              empOrder,
              orderDetEmpl,
              tasks,
              respPosInfo,
              city,
              order,
              orderExtract,
              departments,
              printDocumentView,
              configObj
            }))
          })
        })
      })
  },

  getParams: async function (data) {
    let i = 1
    const showTabNum = data.order.showTabNum

    const orgGen = data.order.subOrganization && (data.order['organizationID.nameGen'] || data.order['organizationID.name'])
      ? ' ' + (data.order['organizationID.nameGen'] || data.order['organizationID.name']) : ''
    const result = {
      line: '_'.repeat(30),
      emblem: HR.reportUtils.getEmblem(),
      titleOrderParams: data.printDocumentView === 'APPOINTMENT' ? 'padding-left: 34px; ' : '',
      printDocumentView: data.printDocumentView,
      orderType: data.printDocumentView === 'APPOINTMENT'
        ? UB.i18n('РОЗПОРЯДЖЕННЯ')
        : data.orderExtract && data.orderExtract.ID ? UB.i18n('В И Т Я Г &nbsp;З&nbsp; Н А К А З У') : UB.i18n('Н А К А З'),
      data: [],
      reason: data.order.reason
        ? {
          indent: data.printDocumentView === 'APPOINTMENT' ? 'text-indent: 34px;' : '',
          text: UB.i18n(`Підстава: {0}.`, data.order.reason)
        }
        : null,
      orderBlock: data.printDocumentView !== 'APPOINTMENT'
        ? {
          city: data.city,
          orderNumber: data.order.orderNumber || '',
          orderDate: AC.dateService.getStringFormatDate(data.order.orderDate, '', ''),
          orderIndex: data.order['dictEmpOrderIndexID.code'] === null ? '' : `/${data.order['dictEmpOrderIndexID.code']}`,
          organizationName: data.order.orderOrganizationName,
          order: UB.i18n('НАКАЗУЮ:')
        }
        : null,
      appointmentBlock: data.printDocumentView === 'APPOINTMENT'
        ? {
          orderDate: AC.dateService.formatDate(data.order.orderDate) || '________________',
          orderNumber: data.order.orderNumber || '________________',
          orderIndex: data.order['dictEmpOrderIndexID.code'] === null ? '' : `/${data.order['dictEmpOrderIndexID.code']}`
        }
        : null,
      mainRespPos: data.printDocumentView === 'APPOINTMENT' && data.respPosInfo.length ? data.respPosInfo[0].respPos || '' : '',
      isPrintAddon: data.order.isAppendix,
      titleOrder: '',
      preamble: (data.order.preamble || '').replace(/&/g, '&nbsp;'),
      organizationGen: data.order['organizationID.nameGen'] || data.order['organizationID.name'] || '',
      organizationNameGen: data.order.subOrganization
        ? data.order['masterOrganizationID.nameGen'] || data.order['masterOrganizationID.name'] || ''
        : data.order['organizationID.nameGen'] || data.order['organizationID.name'] || '',
      items: [],
      addons: [],
      responsiblesInfo: data.respPosInfo
    }
    HR.reportUtils.copyToParams(result, data.configObj)
    const boldFormatBegin = result.normalFullName ? '' : '<b>'
    const boldFormatEnd = result.normalFullName ? '' : '</b>'

    _.forEach(data.orderDetEmpl, orderItem => {
      const item = data.empOrder.find(o => o.ID === orderItem.ID)
      _.merge(orderItem, item || [])
      orderItem.toOrder = data.orderExtract && data.orderExtract.ID
        ? ((data.orderExtract.departmentID ? data.orderExtract.departmentID === item.departmentID : true) && (data.orderExtract.employeePositionID ? data.orderExtract.employeePositionID === item.employeePositionID : true))
        : true
      if (data.order.sortItems === 'STAFF' && item['employeePositionID.departmentID'] && data.departments[item['employeePositionID.departmentID']]) {
        orderItem['structID'] = data.departments[item['employeePositionID.departmentID']].treePath
        orderItem['structName'] = data.departments[item['employeePositionID.departmentID']].name
      } else {
        orderItem['structID'] = (data.order.subOrganization ? data.order['masterOrganizationID.treePath'] : data.order['organizationID.treePath'])
        orderItem['structName'] = ''
      }
    })

    if (data.orderDetEmpl.length === 1) {
      const titleName = data.orderDetEmpl[0].employeeFamilyID
        ? HR.reportUtils.formatShortNameInOrder(data.orderDetEmpl[0]['employeeFamilyID.datName'] || data.orderDetEmpl[0]['employeeFamilyID.fullFIO'], { notUseMiddleNameInOrder: result.notUseMiddleNameInOrder })
        : HR.reportUtils.formatShortNameInOrder(data.orderDetEmpl[0]['employeeID.datName'] || data.orderDetEmpl[0]['employeeID.fullFIO'], { notUseMiddleNameInOrder: result.notUseMiddleNameInOrder })
      result.titleOrder = `${UB.i18n('Про надання')} ${HR.nameCase.uncap(data.orderDetEmpl[0]['payElID.genName'] || data.orderDetEmpl[0]['payElID.name'] || '')} ${titleName}`
    } else if (data.orderDetEmpl.length !== 0) {
      result.titleOrder = UB.i18n('Про надання матеріальної допомоги')
    }

    // если сортировка по порядку, то каждый пункт отдельно
    // мат. помощь родственикам
    const familyData = data.orderDetEmpl.filter(el => !!el.employeeFamilyID)
    const helpToFamily = data.order.sortItems === 'ORDER' && !result.isPrintAddon ? [] : _.groupBy(familyData, 'ID') // каждая помощь отдельно
    // мат. помощь сатрудникам
    const arr = data.order.sortItems === 'ORDER' && !result.isPrintAddon
      ? _.groupBy(data.empOrder, 'ID')
      : _.groupBy(data.orderDetEmpl.filter(el => !el.employeeFamilyID), item => { return `${item.payElID}${item.payType}` })
    const sizeArr = _.size(arr) + _.size(helpToFamily)

    if (result.isPrintAddon && _.size(arr)) {
      const obj = {
        text: `${(data.tasks && data.tasks.tasks && data.tasks.tasks.length) || _.size(helpToFamily) ? `${i++}. ` : ''}${UB.i18n('ВИПЛАТИТИ матеріальну допомогу працівникам {0} за списком згідно з додатком до цього наказу.', result.organizationGen)}`,
        stDeps: []
      }
      result.items.push(obj)
    }
    if (result.isPrintAddon && familyData.length) {
      const obj = {
        text: `${(data.tasks && data.tasks.tasks && data.tasks.tasks.length) || _.size(arr) ? `${i++}. ` : ''}${UB.i18n('НАДАТИ матеріальну допомогу родичам працівників {0} за списком згідно з додатком до цього наказу.', result.organizationGen)}`,
        stDeps: []
      }
      result.items.push(obj)
    }

    for (let j = 0; j <= 1; j++) {
      const loopArray = j === 0 ? arr : helpToFamily
      if (_.size(loopArray) > 0) {
        _.forEach(loopArray, det => {
          det = data.order.sortItems === 'STAFF' && j === 0 ? _.sortBy(det, ['structID']) : det
          let text = ''
          const indexText = result.isPrintAddon ? '' : (sizeArr > 1 || (data.tasks && data.tasks.tasks && data.tasks.tasks.length) ? `${i++}. ` : '')
          if (det.length > 1 || data.order.sortItems === 'STAFF') {
            let orderWord = UB.i18n('Виплатити')
            orderWord = result.smallOrderWord ? orderWord : orderWord.toUpperCase()
            text = indexText + `${orderWord} ${HR.nameCase.uncap(det[0]['payElID.printName'] || det[0]['payElID.name'] || '')} ${UB.i18n('працівникам')} ${result.organizationGen}:`
          } else {
            text = ''
          }
          const objItem = {
            text: text,
            toFamily: false,
            stDeps: []
          }
          const objAddon = result.isPrintAddon ? {
            text: UB.i18n(`для надання {0}`, HR.nameCase.uncap(det[0]['payElID.genName'] || det[0]['payElID.name'] || '')),
            type: '',
            stDeps: []
          } : {}

          const stDepts = _.groupBy(det, item => data.order.sortItems === 'STAFF' ? item.structID : 'null')
          _.forEach(stDepts, stItems => {
            stItems = data.order.sortItems === 'STAFF' ? _.sortBy(stItems, ['structID']) : stItems
            const objSt = {
              stName: data.order.sortItems === 'STAFF' ? HR.nameCase.cap(stItems[0].structName || '') : '',
              deps: []
            }
            const depts = _.groupBy(stItems, item => data.order.sortItems === 'STAFF' ? item['employeePositionID.departmentID'] : 'null')
            _.forEach(depts, depItems => {
              const depName = HR.nameCase.cap(depItems[0]['employeePositionID.departmentID.name'] || '')
              let payType = ''
              if (data.order.sortItems === 'STAFF') {
                depItems = depItems.sort(HR.reportUtils.funcOrderTreePathSort)
              }
              if (data.order.sortItems === 'ALPHABET') {
                depItems = depItems.sort(HR.reportUtils.funcOrderFioTabNumSort)
              }

              let npp = 1
              let haveSkipPunkt = false
              let persons = depItems.map(ordItem => {
                if (ordItem.empOrderType === 'TASK') {
                  const task = data.tasks.tasks.find(o => o.ID === ordItem.ID)
                  if (task) {
                    const text = `${task.task}${task['positionName'] ? ` ${task['positionName']}` : ''}${task['employeeName'] ? ` ${task['employeeName']}` : ''}.`
                    return {
                      task: true,
                      text: text,
                      toOrder: true
                    }
                  } else {
                    haveSkipPunkt = true
                    return {
                      text: '',
                      toOrder: false
                    }
                  }
                } else {
                  let orderItem = ordItem
                  if (data.order.sortItems === 'ORDER' && !result.isPrintAddon) {
                    orderItem = data.orderDetEmpl.find(o => o.ID === ordItem.ID)
                  }
                  if (!orderItem) {
                    haveSkipPunkt = true
                    return {
                      text: '',
                      toOrder: false
                    }
                  } else {
                    const posInfo = HR.reportUtils.getInfoItemOrderInCase(orderItem, orderItem.employeeFamilyID ? 'gen' : 'dat', !result.isPrintAddon, result.notUseMiddleNameInOrder)
                    let value = ''
                    let valueText = ''
                    switch (orderItem.payType) {
                      case 'PRC':
                        payType = '%'
                        break
                      case 'SUM':
                        payType = UB.i18n('грн.')
                        break
                      case 'PLAN':
                        payType = UB.i18n('окладів')
                        break
                      case 'AVG':
                        payType = UB.i18n('середньомісячних заробітних плат')
                        break
                      default:
                        payType = ''
                        break
                    }

                    if (orderItem.accrualCount && orderItem.payType === 'PLAN') {
                      value = orderItem.accrualCount
                      valueText = `${orderItem.accrualCount}&nbsp;${AC.dateService.plural('окладу_окладів_окладів', orderItem.accrualCount)}`
                    } else if (orderItem.avgCount && orderItem.payType === 'AVG') {
                      value = orderItem.avgCount
                      valueText = `${orderItem.avgCount === 1 ? '' : orderItem.avgCount + '&nbsp;'}${AC.dateService.plural('середньомісячної заробітної плати_середньомісячних заробітних плат_середньомісячних заробітних плат', orderItem.avgCount)}`
                    } else if (orderItem.accrualRate && orderItem.payType === 'PRC') {
                      value = orderItem.accrualRate
                      valueText = `${orderItem.accrualRate}&nbsp;${AC.dateService.plural('відсоток_відсотків_відсотків', orderItem.accrualRate)}`
                    } else if (orderItem.newValue && orderItem.payType === 'SUM') {
                      value = orderItem.newValue
                      valueText = `${orderItem.newValue}&nbsp;${UB.i18n('грн')}${det.length === 1 ? '' : '.'}`
                    }
                    const tabNum = showTabNum && orderItem['employeeNumberID.tabNum'] ? UB.i18n(`(Таб. №&nbsp;{0})`, orderItem['employeeNumberID.tabNum']) : ''
                    if (result.isPrintAddon || !!orderItem.employeeFamilyID || (det.length === 1 && data.order.sortItems !== 'STAFF')) {
                      return {
                        toOrder: orderItem.toOrder,
                        index: npp++,
                        toFamily: !!orderItem.employeeFamilyID,
                        employeeFamily: orderItem.employeeFamilyID
                          ? (result.isPrintAddon
                            ? result.notUseMiddleNameInOrder ? HR.reportUtils.formatFullNameInOrder(orderItem['employeeFamilyID.peopleID.fullFIO'] || '', { lastNameInUpperCase: false, notUseMiddleNameInOrder: result.notUseMiddleNameInOrder }) : orderItem['employeeFamilyID.peopleID.fullFIO'] || ''
                            : result.notUseMiddleNameInOrder ? HR.reportUtils.formatFullNameInOrder(orderItem['employeeFamilyID.peopleID.datName'] || orderItem['employeeFamilyID.peopleID.fullFIO'] || '', { lastNameInUpperCase: false, notUseMiddleNameInOrder: result.notUseMiddleNameInOrder }) : orderItem['employeeFamilyID.peopleID.datName'] || orderItem['employeeFamilyID.peopleID.fullFIO'] || ''
                          )
                          : '',
                        employeeFamilySexType: orderItem.employeeFamilyID ? orderItem['employeeFamilyID.peopleID.sexType'] === 'W' ? UB.i18n('її') : UB.i18n('його') : '',
                        employeeFamilyNameBackward: orderItem.employeeFamilyID ? (orderItem['employeeID.sexType'] === 'W' ? orderItem['employeeFamilyID.dictKinshipKindID.genNameBackwardFemale'] : orderItem['employeeFamilyID.dictKinshipKindID.genNameBackwardMale']) || '' : '',
                        empName: result.isPrintAddon
                          ? result.notUseMiddleNameInOrder ? HR.reportUtils.formatFullNameInOrder(orderItem['employeeID.fullFIO'], { lastNameInUpperCase: false, notUseMiddleNameInOrder: result.notUseMiddleNameInOrder }) : orderItem['employeeID.fullFIO']
                          : posInfo.empName,
                        deathDate: orderItem.employeeFamilyID && orderItem['employeeID.deathDate'] ? ` (${UB.i18n('дата смерті')} ${AC.dateService.formatDate(orderItem['employeeID.deathDate'])})` : '',
                        posName: posInfo.posName ? (result.isPrintAddon ? posInfo.posName : HR.reportUtils.makePositionName(posInfo.posName, orderItem['employeePositionID.positionID.isOrgBoss'])) : '',
                        value: value,
                        valueText: valueText,
                        dictFundSource: orderItem['dictFundSourceID.genName'] || orderItem['dictFundSourceID.name'] || '',
                        payName: HR.nameCase.uncap(orderItem['payElID.printName'] || orderItem['payElID.name'] || ''),
                        tabNum: tabNum
                      }
                    } else {
                      return {
                        toOrder: orderItem.toOrder,
                        text: `${boldFormatBegin}${posInfo.empName}${tabNum ? ' ' + boldFormatEnd + tabNum : boldFormatEnd}${posInfo.posName ? ', ' + HR.reportUtils.makePositionName(posInfo.posName, orderItem['employeePositionID.positionID.isOrgBoss']) : ''}${valueText ? UB.i18n(', у розмірі ') + valueText : ''}${npp + 1 < det.length ? ';' : '.'}`
                      }
                    }
                  }
                }
              }).filter(el => el.toOrder)

              if (persons.length) {
                if (result.isPrintAddon) {
                  if (persons[0].toFamily) {
                    objItem.toFamily = true
                    objSt.stName = ''
                  }
                  /*
                  result.addons.push({
                    text: UB.i18n(`для надання {0}`, HR.nameCase.uncap(det[0]['payElID.genName'] || det[0]['payElID.name'] || '')),
                    type: payType,
                    data: persons
                  })
                  */
                } else {
                  let text = ''
                  if (det.length === 1) {
                    if (persons[0].toFamily) {
                      objItem.toFamily = true
                      objSt.stName = ''
                      let orderWord = UB.i18n('Надати')
                      orderWord = result.smallOrderWord ? orderWord : orderWord.toUpperCase()
                      text = UB.i18n(`{8} {0} матеріальну допомогу на поховання у зв'язку зі смертю {1} {2}{3}{4}{5} в розмірі {6}{7}.`,
                        boldFormatBegin + persons[0].employeeFamily + boldFormatEnd, persons[0].employeeFamilySexType, persons[0].employeeFamilyNameBackward ? persons[0].employeeFamilyNameBackward + ' ' : '',
                        persons[0].empName + (persons[0].tabNum ? ' ' + persons[0].tabNum : ''), persons[0].posName ? ' ' + HR.nameCase.uncap(persons[0].posName) + orgGen : '',
                        persons[0].deathDate + (persons[0].posName ? ',' : ''), persons[0].valueText,
                        persons[0].dictFundSource ? UB.i18n(' за рахунок {0}', persons[0].dictFundSource) : '', orderWord)
                      persons = []
                    } else if (persons[0].task) {
                      text = persons[0].text
                      persons = []
                    } else {
                      let orderWord = UB.i18n('Виплатити')
                      orderWord = result.smallOrderWord ? orderWord : orderWord.toUpperCase()
                      text = data.order.sortItems === 'STAFF' ? '' : UB.i18n(`{5} {0}{4}, {1}{2} у розмірі {3}.`, boldFormatBegin + persons[0].empName + boldFormatEnd,
                        persons[0].posName ? ' ' + HR.nameCase.uncap(persons[0].posName) + orgGen + ', ' : '', persons[0].payName, persons[0].valueText,
                        persons[0].tabNum ? ' ' + persons[0].tabNum : '', orderWord)
                      persons = data.order.sortItems === 'STAFF' ? persons : []
                    }
                    if (text) {
                      objItem.text = indexText + text
                    }
                  }
                }
              } else {
                if (!result.isPrintAddon && sizeArr > 1 && !haveSkipPunkt) {
                  i++
                }
              }
              if (persons.length) {
                objSt.deps.push({
                  depName: data.order.sortItems !== 'STAFF' || depName === objSt.stName || objItem.toFamily ? '' : depName,
                  data: persons
                })
              }

              if (result.isPrintAddon) {
                objAddon.type = payType
              }
            })
            if (result.isPrintAddon) {
              if (objSt.deps.length) {
                objAddon.stDeps.push(objSt)
              }
            } else {
              if (objSt.deps.length) {
                objItem.stDeps.push(objSt)
              }
            }
          })
          /*
          if (objItem.stDeps.length || (result.isPrintAddon && objAddon.stDeps.length)) {
            result.items.push(objItem)
          }
          */
          if (result.isPrintAddon) {
            if (objAddon.stDeps.length) {
              result.addons.push(objAddon)
            }
          } else {
            if (objItem.text) {
              result.items.push(objItem)
            }
          }
        })
      }
    }
    result.tasks = data.order.sortItems === 'ORDER' && !result.isPrintAddon ? [] : data.tasks.tasks.map(e => ({
      task: `${i === 1 && data.tasks.tasks.length === 1 ? '' : i++ + '. '}${e.task}${e['positionName'] ? ` ${e['positionName']}` : ''}${e['employeeName'] ? ` ${e['employeeName']}` : ''}.`
    }))

    return AC.reportService.removeEmptyValues(result)
  }
}
