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
        return Promise.all([
          HR.reportUtils.getEmpOrder(reportParams.instanceID)]).then(([order]) => {
          const whereArray = order.sortItems === 'ORDER' ? [['empOrderType', 'in', ['TASK', 'BOUNTY']]] : [['empOrderType', '=', 'BOUNTY']]
          const documentView = AC.settings.get('hrEmpOrderPrintType', order.masterOrganizationID || order.organizationID)
          const printDocumentView = documentView === order.documentOrderType ? documentView : order.documentOrderType
          const configObj = { printDocumentView }
          return Promise.all([
            HR.reportUtils.getOrderPrintConfig(configObj, order.subOrganization ? order.masterOrganizationID : order.organizationID),
            HR.reportUtils.getEmpOrderDet(reportParams.instanceID, order.orderDate || order.entryDate, ['departmentID'], whereArray, true),
            UB.Repository('hr_empOrderBountyDet')
              .attrs([ 'ID', 'month', 'year', 'reason', 'orderWord' ])
              .where('orderID', '=', reportParams.instanceID)
              .orderBy('itemIdx')
              .selectAsObject(),
            UB.Repository('hr_empOrderChgSalEmpDet')
              .attrs(['ID', 'entityParaID', 'newValue', 'accrualRate', 'payElID', 'payElID.name', 'payElID.printName', 'payElID.genName', 'employeeID.genName', 'employeeID.fullFIO',
                'payElID.methodID.code', 'valuation', 'accrualCount'])
              .where('orderID', '=', reportParams.instanceID)
              .orderBy('itemIdx')
              .selectAsObject({
                'valuation': 'payType'
              }),
            HR.reportUtils.getResponsiblesForOrder(order, printDocumentView === 'APPOINTMENT', 'hr_empOrderSignDet', true, ['signerOrdBountyAttach']),
            HR.reportUtils.getResponsiblesForOrder(order, printDocumentView === 'APPOINTMENT', 'hr_empOrderSignDet', false, undefined, ['signerOrdBountyAttach']),
            HR.reportUtils.getCityName(order.subOrganization ? order.masterOrganizationID : order.organizationID),
            printDocumentView
          ]).then(([configObj, empOrder, orderDet, orderDetSecond, respPosInfo, respPosInfoAddons, city, printDocumentView]) => {
            const ids = order.sortItems === 'STAFF' || order.sortItems === 'DEPART' ? _.compact(_.uniq(empOrder.map(item => item['employeePositionID.departmentID']))) : []
            return Promise.all([
              HR.reportUtils.getTask(reportParams.instanceID, order.orderDate || order.entryDate, order.showTabNum, configObj.notUseMiddleNameInOrder),
              HR.reportUtils.getDepartmentStructName(ids, order.organizationID, order.orderDate || order.entryDate)
            ]).then(([tasks, departments]) => ({
              empOrder,
              orderDet,
              orderDetSecond,
              tasks,
              respPosInfo,
              respPosInfoAddons,
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
    let titleName
    const showTabNum = data.order.showTabNum

    const orgGen = data.order.subOrganization && (data.order['organizationID.nameGen'] || data.order['organizationID.name'])
      ? ' ' + (data.order['organizationID.nameGen'] || data.order['organizationID.name']) : ''
    const months = [UB.i18n('січень'), UB.i18n('лютий'), UB.i18n('березень'), UB.i18n('квітень'), UB.i18n('травень'), UB.i18n('червень'), UB.i18n('липень'), UB.i18n('серпень'), UB.i18n('вересень'), UB.i18n('жовтень'), UB.i18n('листопад'), UB.i18n('грудень')]
    const result = {
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
      titleOrder: data.order.titleOrder ? data.order.titleOrder.replace(/&/g, '&nbsp;') : UB.i18n('Про преміювання '),
      preamble: (data.order.preamble || '').replace(/&/g, '&nbsp;'),
      organizationNameGen: data.order['organizationID.nameGen'] || data.order['organizationID.name'],
      responsiblesInfo: data.respPosInfo,
      items: [],
      line: '_'.repeat(30),
      isPrintAddon: data.order.isAppendix,
      addons: [],
      responsiblesInfoAddons: data.respPosInfoAddons.length ? data.respPosInfoAddons : data.respPosInfo
    }
    HR.reportUtils.copyToParams(result, data.configObj)

    //    <td style="font-family: TimesNewRoman; font-size: {{fontSize}}pt; text-align: left; padding: 0px 1px 0px 1px; border: 0px; " colspan="4">______________________________</td>
    //      <td style="font-family: TimesNewRoman; font-size: {{fontSize}}pt; text-align: right; padding: 0px 1px 0px 1px; border: 0px; " colspan="4">_____ _________________ ______ р.</td>

    const roundSum = AC.settings.get('hrOrderBonusRoundSum', data.order.masterOrganizationID || data.order.organizationID)

    let salaryTextValue = UB.i18n('окладу_окладів_окладів')
    let salaryTextValueGen = UB.i18n('окладу_окладів_окладів')

    function getText (text, defaulText = UB.i18n('окладу_окладів_окладів')) {
      if (!text) return defaulText
      const arr = text.split('_')
      if (arr.length === 0) return defaulText
      const resultText = []
      if (arr.length === 1) {
        resultText.push(arr[0])
        resultText.push(arr[0])
        resultText.push(arr[0])
      } else if (arr.length === 2) {
        resultText.push(arr[0])
        resultText.push(arr[1])
        resultText.push(arr[1])
      } else {
        resultText.push(arr[0])
        resultText.push(arr[1])
        resultText.push(arr[2])
      }
      return resultText.join('_')
    }

    if (result.salaryText) {
      const values = result.salaryText.split('#')
      if (values && values.length >= 1) {
        salaryTextValue = getText(values[0])
        salaryTextValueGen = getText(values[0])
      }
      if (values && values.length >= 2) {
        salaryTextValueGen = getText(values[1])
      }
    }

    function getPayType (payType, one, accrualCount) {
      let result
      switch (payType) {
        case 'PRC':
          result = '%'
          break
        case 'SUM':
          result = UB.i18n('грн') + (one ? '' : '.')
          break
        case 'PLAN':
          result = accrualCount !== undefined ? AC.dateService.plural(one ? salaryTextValueGen : salaryTextValue, Math.max(accrualCount, 1)) : UB.i18n('окладів')
          break
        default:
          result = ''
          break
      }
      return result
    }
    const getFormatArr = (arr, isPrintAddon, one = false, indexText, indexNpp) => {
      const res = []
      if (data.order.sortItems === 'STAFF' || data.order.sortItems === 'DEPART') {
        arr = arr.sort(HR.reportUtils.funcOrderTreePathSort)
      }
      if (!data.order.sortItems || data.order.sortItems === 'ALPHABET') {
        arr = arr.sort(HR.reportUtils.funcOrderFioTabNumSort)
      }
      arr.forEach(el => {
        const tabNum = showTabNum && el['employeeNumberID.tabNum'] ? UB.i18n(`(Таб.&nbsp;№&nbsp;{0})`, el['employeeNumberID.tabNum']) : ''
        const posInfo = HR.reportUtils.getInfoItemOrderInCase(el, 'dat', true, result.notUseMiddleNameInOrder)
        const position = one ? posInfo.posName : HR.nameCase.cap(el['employeePositionID.positionID.name'] || '')
        const value = (el.payType === 'PLAN' ? el.accrualCount : el.payType === 'SUM' ? HR.reportUtils.formatAsCurrency(el.newValue || 0, roundSum ? 0 : 2, ',', false, '') : el.accrualRate || 0) +
          (isPrintAddon ? '' : '&nbsp;' + getPayType(el.payType, one, el.accrualCount))

        res.push({
          toOrder: el.toOrder,
          npp: (isPrintAddon ? '' : indexText) + (indexNpp++),
          posName: position ? ' ' + position + orgGen : '',
          empName: HR.reportUtils.formatFullNameInOrder(
            one ? el['employeeID.datName'] || el['employeeID.fullFIO'] : el['employeeID.fullFIO'], { notUseMiddleNameInOrder: result.notUseMiddleNameInOrder }) + (tabNum ? ' ' + tabNum : ''),
          value: value,
          fontSizeCustom: !result.ecoPrint && el.newValue && el.newValue > 20000 ? 12 : result.fontSize
        })
      })
      return res
    }

    if (data.orderDetSecond && data.orderDetSecond.length) {
      data.orderDetSecond.forEach(el => {
        const item = data.empOrder.find(o => o.ID === el.ID)
        _.merge(el, item || [])
        el.toOrder = data.orderExtract && data.orderExtract.ID
          ? ((data.orderExtract.departmentID ? data.orderExtract.departmentID === item.departmentID || data.orderExtract.departmentID === item['employeePositionID.departmentID'] : true) && (data.orderExtract.employeePositionID ? data.orderExtract.employeePositionID === item.employeePositionID : true))
          : true
        if (el['employeePositionID.departmentID'] && !el['employeePositionID.departmentID.idxNum'] && !el['employeePositionID.departmentID.name']) {
          el['employeePositionID.departmentID'] = null
        }
        if ((data.order.sortItems === 'STAFF' || data.order.sortItems === 'DEPART') && item['employeePositionID.departmentID'] && data.departments[item['employeePositionID.departmentID']]) {
          el['structID'] = data.departments[item['employeePositionID.departmentID']].treePath // + '_' + data.departments[item['employeePositionID.departmentID']].name
          el['structName'] = data.departments[item['employeePositionID.departmentID']].name
          el['structNameGen'] = data.departments[item['employeePositionID.departmentID']].nameGen
        } else {
          el['structID'] = (data.order.subOrganization ? data.order['masterOrganizationID.treePath'] : data.order['organizationID.treePath']) // + result.organizationName
          el['structName'] = ''
          el['structNameGen'] = ''
        }

        const detItem = data.orderDet.find(o => o.ID === el.entityParaID)
        el['month'] = detItem.month || -1
        el['year'] = detItem.year || 0
        el['reason'] = detItem.reason || ''
        const orderWord = UB.i18n('Встановити')
        el.orderWord = detItem.orderWord ? detItem.orderWord : result.smallOrderWord ? orderWord : orderWord.toUpperCase()

        el.payName = HR.nameCase.uncap(el['payElID.printName'] || el['payElID.name'] || '')
        el.payNameGen = HR.nameCase.uncap(el['payElID.genName'] || el['payElID.name'] || '')

        if (el['payElID.methodID.code'] === '45') { // 45 Квартальна премія
          el.period = el.month >= 1 && el.month <= 12 && el.year
            ? ` ${UB.i18n('за')}&nbsp;${el.month >= 1 && el.month <= 3 ? 'I' : ''}${el.month >= 4 && el.month <= 6 ? 'II' : ''}${el.month >= 7 && el.month <= 9 ? 'III' : ''}${el.month >= 10 && el.month <= 12 ? 'IV' : ''}&nbsp;${UB.i18n('квартал')}&nbsp;${el.year}&nbsp;${UB.i18n('року')}` : ''
        } else if (el['payElID.methodID.code'] === '46') { // 46 Річна премія
          el.period = el.year ? UB.i18n(` за&nbsp;{0}&nbsp;рік`, el.year) : ''
        } else if (el['payElID.methodID.code'] === '47') { // 47 Разова премія
          el.period = ''
        } else {
          el.period = `${(el.month >= 0 && el.month <= 12) || el.year ? UB.i18n(' за') : ''}${el.month >= 0 && el.month <= 12 ? '&nbsp;' + months[el.month - 1] : ''}${el.year ? '&nbsp;' + el.year + (el.month > 0 ? UB.i18n('&nbsp;року') : UB.i18n('&nbsp;рік')) : ''}`
        }
      })
    }

    const cntPunkt = (data.tasks ? data.tasks.tasks.length : 0) + (data.orderDetSecond ? data.orderDetSecond.length : 0)
    if ((data.order.sortItems === 'ORDER' || data.orderDetSecond.length === 1) && !result.isPrintAddon) {
      _.forEach(data.empOrder, (det) => {
        if (det.empOrderType === 'TASK') {
          const orderItem = data.tasks.tasks.find(o => o.ID === det.ID)
          if (orderItem) {
            const text = (cntPunkt === 1 ? '' : `${i++}. `) + `${orderItem.task}${orderItem['positionName'] ? ` ${orderItem['positionName']}` : ''}${orderItem['employeeName'] ? ` ${orderItem['employeeName']}` : ''}.`
            result.items.push({
              text: text,
              showHead: false,
              stDeps: []
            })
          }
        } else {
          const orderItem = data.orderDetSecond.find(o => o.ID === det.ID)
          if (orderItem) {
            let text = cntPunkt === 1 ? '' : `${i++}. `
            const persons = getFormatArr([orderItem], result.isPrintAddon, true, '', 1)
            text += `${orderItem.orderWord} ${orderItem.payName} ${persons[0].empName}${persons[0].posName} ${orderItem.reason ? ' ' + orderItem.reason : ''} ${orderItem.period} ${UB.i18n('у розмірі')} ${persons[0].value}.`
            if (persons[0].toOrder) {
              result.items.push({
                text: text,
                showHead: false,
                stDeps: []
              })
            }
          }
        }
      })
    } else {
      data.orderDetSecond = _.sortBy(data.orderDetSecond, 'payName')
      data.orderDetSecond = _.groupBy(data.orderDetSecond, item => `${item.payElID}/${item.payType}/${item.month}/${item.year}/${item.reason}`)
      let index = 1
      _.forEach(data.orderDetSecond, (payLevel) => {
        const indexText = (data.order.sortItems === 'DEPART' && result.isPrintAddon) || cntPunkt === 1 ? '' : `${i++}.`
        const text = indexText ? indexText + ' ' : ''
        let indexNpp = 1

        payLevel = data.order.sortItems === 'STAFF' || data.order.sortItems === 'DEPART' ? _.sortBy(payLevel, ['structID']) : payLevel
        const objItem = {
          text: data.order.sortItems === 'DEPART' && result.isPrintAddon ? '' : text + `${payLevel[0].orderWord} ${payLevel[0].payName} ${payLevel[0].period} ${UB.i18n('працівникам')} ${result.organizationNameGen}${payLevel[0].reason ? ' ' + payLevel[0].reason : ''}` +
            (result.isPrintAddon ? UB.i18n(` згідно з додатком {0} до цього наказу.`, index) : ' у таких розмірах:'),
          type: getPayType(payLevel[0].payType, true),
          showHead: !result.isPrintAddon,
          stDeps: []
        }
        const objAddon = result.isPrintAddon ? {
          titleAddon: `${UB.i18n('працівників')} ${result.organizationNameGen} ${UB.i18n('для виплати')} ${payLevel[0].payNameGen} ${payLevel[0].period}`,
          type: getPayType(payLevel[0].payType, true),
          stDeps: []
        } : {}
        const stDepts = _.groupBy(payLevel, item => data.order.sortItems === 'STAFF' || data.order.sortItems === 'DEPART' ? item.structID : 'null')
        _.forEach(stDepts, stItems => {
          if (data.order.sortItems === 'DEPART' && result.isPrintAddon) indexNpp = 1
          stItems = data.order.sortItems === 'STAFF' || data.order.sortItems === 'DEPART' ? _.sortBy(stItems, ['structID']) : stItems
          const objSt = {
            stName: data.order.sortItems === 'STAFF' || data.order.sortItems === 'DEPART' ? HR.nameCase.cap(stItems[0].structName || '') : '',
            stNameGen: data.order.sortItems === 'STAFF' || data.order.sortItems === 'DEPART' ? stItems[0].structNameGen || '' : '',
            deps: []
          }
          const depts = _.groupBy(stItems, item => data.order.sortItems === 'STAFF' || data.order.sortItems === 'DEPART' ? item['employeePositionID.departmentID'] : 'null')
          _.forEach(depts, depItems => {
            const depName = HR.nameCase.cap(depItems[0]['employeePositionID.departmentID.name'] || '')
            let persons = getFormatArr(depItems, true, false, '' /* indexText */, indexNpp)
            indexNpp += persons.length
            persons = persons.filter(el => el.toOrder)
            persons = persons.filter(el => el.toOrder)
            if (persons.length) {
              objSt.deps.push({
                depName: (data.order.sortItems !== 'STAFF' && data.order.sortItems !== 'DEPART') || depName === objSt.stName ? '' : depName,
                persons: persons
              })
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

        if (data.order.sortItems === 'DEPART' && result.isPrintAddon && objAddon.stDeps.length) {
          objAddon.stDeps.forEach(stuctureItem => {
            const indexText = cntPunkt === 1 && objAddon.stDeps.length === 1 ? '' : `${i++}.`
            const text = indexText ? indexText + ' ' : ''

            const objItemDepart = {
              text: text + `${payLevel[0].orderWord} ${payLevel[0].payName} ${payLevel[0].period} ${UB.i18n('працівникам')} ${stuctureItem.stNameGen ? stuctureItem.stNameGen + ' ' : ''}${result.organizationNameGen}${payLevel[0].reason ? ' ' + payLevel[0].reason : ''}` +
                (result.isPrintAddon ? UB.i18n(` згідно з додатком {0} до цього наказу.`, index) : ' у таких розмірах:'),
              stDeps: []
            }

            stuctureItem.stName = ''
            const objAddonDepart = {
              number: index,
              titleAddon: `${UB.i18n('працівників')} ${stuctureItem.stNameGen ? stuctureItem.stNameGen + ' ' : ''}${result.organizationNameGen} ${UB.i18n('для виплати')} ${payLevel[0].payNameGen} ${payLevel[0].period}`,
              type: objAddon.type,
              stDeps: [stuctureItem]
            }

            index++

            result.items.push(objItemDepart)
            result.addons.push(objAddonDepart)
          })
        } else {
          if (objItem.stDeps.length || (result.isPrintAddon && objAddon.stDeps.length)) {
            result.items.push(objItem)
          }
          if (result.isPrintAddon) {
            if (objAddon.stDeps.length) {
              objAddon.number = index++
              result.addons.push(objAddon)
            }
          }
        } // DEPART
      })
    }
    result.tasks = data.order.sortItems === 'ORDER' && !result.isPrintAddon ? [] : data.tasks.tasks.map(e => ({
      task: `${cntPunkt === 1 ? '' : i++ + '. '}${e.task}${e['positionName'] ? ` ${e['positionName']}` : ''}${e['employeeName'] ? ` ${e['employeeName']}` : ''}.`
    }))

    if (data.orderDetSecond.length === 1) {
      titleName = HR.reportUtils.formatShortNameInOrder(data.orderDetSecond[0]['employeeID.genName'] || data.orderDetSecond[0]['employeeID.fullFIO'], { notUseMiddleNameInOrder: result.notUseMiddleNameInOrder })
    } else if (data.orderDetSecond.length !== 0) {
      titleName = UB.i18n('працівників ') + result.organizationNameGen
    }
    result.titleOrder = `${result.titleOrder}${result.titleOrder && titleName ? '<br/>' : ''}${titleName || ''}`
    return AC.reportService.removeEmptyValues(result)
  }
}
