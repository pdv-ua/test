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
          const onDate = AC.dateService.truncTimeToUtcNull(order.orderDate || order.entryDate)
          const whereArray = order.sortItems === 'ORDER' ? [['empOrderType', 'in', ['TASK', 'CWSHD', 'CWSHDGRP']]] : [['empOrderType', 'in', ['CWSHD', 'CWSHDGRP']]]
          const documentView = AC.settings.get('hrEmpOrderPrintType', order.masterOrganizationID || order.organizationID)
          const printDocumentView = documentView === order.documentOrderType ? documentView : order.documentOrderType
          const configObj = { printDocumentView }
          return Promise.all([
            HR.reportUtils.getOrderPrintConfig(configObj, order.subOrganization ? order.masterOrganizationID : order.organizationID),
            HR.reportUtils.getEmpOrderDet(reportParams.instanceID, onDate, ['departmentID'], whereArray, true),
            HR.reportUtils.getResponsiblesIncaseInfo(reportParams.instanceID, onDate),
            UB.Repository('hr_empOrderCwshdDet')
              .attrs(['ID', 'employeeID.fullFIO', 'employeeID.genName', 'dateFrom', 'typeCompensation', 'dateRest', 'byRequest', 'workHours', 'restDayScheduleDesc'])
              .where('orderID', '=', reportParams.instanceID)
              .orderBy('dateFrom')
              .selectAsObject(),
            UB.Repository('hr_empOrderCwshdgrpDet')
              .attrs(['ID', 'dateFrom', 'typeCompensation', 'byRequest', 'restDayScheduleDesc'])
              .where('orderID', '=', reportParams.instanceID)
              .orderBy('dateFrom')
              .selectAsObject(),
            UB.Repository('hr_empOrderCwshdgrpEmp')
              .attrs(['ID', 'paraID', 'employeeID.fullFIO', 'employeeID.genName', 'dateRest', 'workHours'])
              .where('orderID', '=', reportParams.instanceID)
              .orderBy('dateFrom')
              .selectAsObject(),
            HR.reportUtils.getResponsiblesForOrder(order, printDocumentView === 'APPOINTMENT'),
            HR.reportUtils.getCityName(order.subOrganization ? order.masterOrganizationID : order.organizationID),
            printDocumentView
          ]).then(([configObj, empOrder, orderResp, orderDet, orderDetGroup, orderDetEmp, respPosInfo, city, printDocumentView]) => {
            const dates = _.sortBy(orderDet, 'dateFrom').map(el => el.dateFrom)
            const dateFrom = dates && dates.length ? AC.dateService.shiftDate(dates[0]) : null
            const dateTo = dates && dates.length ? AC.dateService.shiftDate(dates[dates.length - 1]) : null
            const ids = _.compact(_.uniq(empOrder.map(item => item['employeePositionID.departmentID'])))
            // const ids = _.compact(_.uniq(empOrder.map(item => item['employeePositionID.positionID.parentUnitID'])))
            return Promise.all([
              HR.reportUtils.getTask(reportParams.instanceID, order.orderDate || order.entryDate, order.showTabNum, configObj.notUseMiddleNameInOrder),
              HR.reportUtils.getCalendarHoliday(dateFrom, dateTo, order.organizationID),
              HR.reportUtils.getDepartmentStructName(ids, order.organizationID, order.orderDate || order.entryDate)
            ]).then(([tasks, holiday, departments]) => ({
              empOrder,
              orderResp,
              orderDet,
              orderDetGroup,
              orderDetEmp,
              tasks,
              respPosInfo,
              city,
              order,
              holiday,
              departments,
              orderExtract,
              printDocumentView,
              configObj
            }))
          })
        })
      })
  },

  getParams: async function (data) {
    let index = 0
    let titleName = ''
    const showTabNum = data.order.showTabNum

    const orgGen = data.order.subOrganization && (data.order['organizationID.nameGen'] || data.order['organizationID.name'])
      ? ' ' + (data.order['organizationID.nameGen'] || data.order['organizationID.name']) : ''
    const result = {
      isPrintAddon: data.order.isAppendix,
      line: '_'.repeat(30),
      emblem: HR.reportUtils.getEmblem(),
      printDocumentView: data.printDocumentView,
      titleOrderParams: data.printDocumentView === 'APPOINTMENT' ? 'padding-left: 34px; ' : '',
      orderType: data.printDocumentView === 'APPOINTMENT'
        ? UB.i18n('РОЗПОРЯДЖЕННЯ')
        : data.orderExtract && data.orderExtract.ID ? UB.i18n('В И Т Я Г &nbsp;З&nbsp; Н А К А З У') : UB.i18n('Н А К А З'),
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
      preamble: (data.order.preamble || '').replace(/&/g, '&nbsp;'),
      organizationGen: data.order['organizationID.nameGen'] || data.order['organizationID.name'],
      data: [],
      addons: [],
      responsiblesInfo: data.respPosInfo
    }
    HR.reportUtils.copyToParams(result, data.configObj)
    const boldFormatBegin = result.normalFullName ? '' : '<b>'
    const boldFormatEnd = result.normalFullName ? '' : '</b>'
    let orderWord = UB.i18n('Залучити')
    orderWord = result.smallOrderWord ? orderWord : orderWord.toUpperCase()

    if (result.isPrintAddon) {
      data.order.sortItems = undefined
    }

    _.forEach(data.orderDet, element => {
      const el = data.empOrder.find(o => o.ID === element.ID)
      _.merge(element, el || [])
      element.toOrder = data.orderExtract && data.orderExtract.ID
        ? ((data.orderExtract.departmentID ? data.orderExtract.departmentID === element.departmentID : true) && (data.orderExtract.employeePositionID ? data.orderExtract.employeePositionID === element.employeePositionID : true))
        : true
      if (data.departments[element['employeePositionID.departmentID']]) {
        element.depNameGen = data.departments[element['employeePositionID.departmentID']].nameGen
        element.depName = data.departments[element['employeePositionID.departmentID']].name
        element.depSortBy = data.departments[element['employeePositionID.departmentID']].treePath
      } else {
        element.depNameGen = data.order['organizationID.nameGen'] || data.order['organizationID.name'] || ''
        element.depName = data.order.sortItems === 'STAFF' ? '' : data.order['organizationID.name'] || ''
        element.depSortBy = ''
      }
    })
    _.forEach(data.orderDetEmp, element => {
      const groupDet = data.orderDetGroup.find(o => o.ID === element.paraID)
      if (groupDet) {
        ['dateFrom', 'typeCompensation', 'byRequest', 'restDayScheduleDesc'].forEach(attrName => {
          element[attrName] = groupDet[attrName]
        })

        const el = data.empOrder.find(o => o.ID === element.ID)
        _.merge(element, el || [])
        element.toOrder = data.orderExtract && data.orderExtract.ID
          ? ((data.orderExtract.departmentID ? data.orderExtract.departmentID === element.departmentID : true) && (data.orderExtract.employeePositionID ? data.orderExtract.employeePositionID === element.employeePositionID : true))
          : true
        if (data.departments[element['employeePositionID.departmentID']]) {
          element.depNameGen = data.departments[element['employeePositionID.departmentID']].nameGen
          element.depName = data.departments[element['employeePositionID.departmentID']].name
          element.depSortBy = data.departments[element['employeePositionID.departmentID']].treePath
        } else {
          element.depNameGen = data.order['organizationID.nameGen'] || data.order['organizationID.name'] || ''
          element.depName = data.order.sortItems === 'STAFF' ? '' : data.order['organizationID.name'] || ''
          element.depSortBy = ''
        }
        data.orderDet.push(element)
      }
    })

    const day = {
      weekday: false,
      holiday: false
    }
    let orderDet = result.isPrintAddon ? {} : _.groupBy(data.orderDet, 'employeePositionID')

    if (!result.isPrintAddon && (_.size(orderDet) === 1 || data.order.sortItems === 'ORDER')) { // приказ по 1 соруднику
      const cntPunkt = (data.tasks.tasks ? data.tasks.tasks.length : 0) + (data.orderDet ? _.size(orderDet) : 0)
      orderDet = data.order.sortItems === 'ORDER'
        ? _.groupBy(data.empOrder.filter(item => data.orderDet.find(o => o.ID === item.ID) || data.tasks.tasks.find(o => o.ID === item.ID)),
          el => { return el.empOrderType === 'TASK' ? el.ID : el.employeePositionID })
        : orderDet

      _.forEach(orderDet, items => {
        if (items[0].empOrderType === 'TASK') {
          const orderItem = data.tasks.tasks.find(o => o.ID === items[0].ID)
          if (orderItem) {
            const text = `${cntPunkt === 1 ? '' : `${++index}. `}${orderItem.task}${orderItem['positionName'] ? ` ${orderItem['positionName']}` : ''}${orderItem['employeeName'] ? ` ${orderItem['employeeName']}` : ''}.`
            result.data.push({
              text: text,
              rows: []
            })
          }
        } else {
          const elements = data.order.sortItems === 'ORDER'
            ? data.orderDet.filter(el => el.employeePositionID === items[0].employeePositionID)
            : items
          const item = elements[0]

          const toOrder = elements.filter(el => el.toOrder).length
          if (toOrder > 0) {
            let posInfoAcc = HR.reportUtils.getInfoItemOrderInCase(item, 'acc', true, result.notUseMiddleNameInOrder)
            let posInfoGen = HR.reportUtils.getInfoItemOrderInCase(item, 'gen', true, result.notUseMiddleNameInOrder)
            const tabNum = showTabNum && item['employeeNumberID.tabNum'] ? UB.i18n(`(Таб. №&nbsp;{0})`, item['employeeNumberID.tabNum']) : ''

            let daysInfo = elements.length === 1 ? '' : UB.i18n('вихідні дні')
            const compensationH = []
            const compensationM = []
            for (let i = 0; i < elements.length; i++) {
              let dateFrom = AC.dateService.formatDate(elements[i].dateFrom)
              const aDate = AC.dateService.shiftDate(elements[i].dateFrom)
              const isHolidayDay = data.holiday && data.holiday.length && data.holiday.find(item => {
                return item.getTime() === aDate.getTime()
              })
              const textHolidayDay = isHolidayDay ? UB.i18n('святковий') : UB.i18n('вихідний')
              const workHoursText = (elements[i]['workHours'] ? ' ' + UB.i18n('на') + ' ' + elements[i]['workHours'] + ' ' + AC.dateService.plural(UB.i18n('робочу годину_робочих годин_робочих годин'), elements[i]['workHours']) : '') +
                (elements[i]['restDayScheduleDesc'] ? ', ' + elements[i]['restDayScheduleDesc'] : '')

              if (isHolidayDay) {
                day.holiday = true
              } else {
                day.weekday = true
              }
              daysInfo += (elements.length === 1
                ? UB.i18n('{0} день {1}', textHolidayDay, dateFrom)
                : (i === 0 ? ' ' : ', ') + dateFrom) + workHoursText

              if (elements.length === 1) {
                titleName = data.order.titleOrder
                  ? HR.reportUtils.formatShortNameInOrder(posInfoGen.empName, { notUseMiddleNameInOrder: result.notUseMiddleNameInOrder })
                  : UB.i18n(`у {0} день {1} {2}`, textHolidayDay, dateFrom, HR.reportUtils.formatShortNameInOrder(posInfoGen.empName, { notUseMiddleNameInOrder: result.notUseMiddleNameInOrder }))
              }

              if (elements[i].typeCompensation === 'MONEY') {
                compensationM.push({
                  day: dateFrom + workHoursText,
                  type: `${elements.length === 1 ? textHolidayDay : UB.i18n('вихідний')} день`
                })
              } else {
                compensationH.push({
                  day: dateFrom,
                  type: `${elements.length === 1 ? textHolidayDay : UB.i18n('вихідний')} день`,
                  dateRest: !elements[i].byRequest && elements[i].dateRest ? elements[i].dateRest : null
                })
              }
            }
            if (elements.length > 1) {
              titleName = data.order.titleOrder ? HR.reportUtils.formatShortName(posInfoGen.empName) : UB.i18n(`у вихідні дні {0}`, HR.reportUtils.formatShortName(posInfoGen.empName))
            }

            result.data.push({
              text: ++index + '. ' + UB.i18n(`{4} {0}{3}{1} до роботи у {2}.`, boldFormatBegin + posInfoAcc.empName + boldFormatEnd, posInfoAcc.posName ? ', ' + posInfoAcc.posName + orgGen : '', daysInfo, tabNum ? ' ' + tabNum : '', orderWord),
              rows: []
            })
            if (compensationM.length) {
              result.data.push({
                text: (cntPunkt !== 1 ? '' : ++index + '. ') + UB.i18n(`Компенсувати роботу у {0} {1} згідно ст. 107 КЗпП України – провести оплату праці в подвійному розмірі.`, compensationM.length === 1 ? compensationM[0].type : UB.i18n('вихідні дні'), compensationM.map(el => el.day).join(', ')),
                rows: []
              })
            }
            if (compensationH.length) {
              let restDays = compensationH.filter(el => el.dateRest)
              if (restDays.length) {
                const days = restDays.map(el => el.day).join(', ')
                restDays = _.sortBy(restDays, 'dateRest')
                const text = UB.i18n(` - наданням {0} відпочинку: {1}`, restDays.length === 1 ? UB.i18n('іншого дня') : UB.i18n('інших днів'), restDays.map(el => AC.dateService.formatDate(el.dateRest)).join(', '))
                result.data.push({
                  text: (cntPunkt !== 1 ? '' : ++index + '. ') + UB.i18n(`Компенсувати роботу у {0} {1}, за згодою сторін, згідно ст. 72 КЗпП України{2}.`, restDays.length === 1 ? `${UB.i18n('вихідний')} день` : UB.i18n('вихідні дні'), days || '', text),
                  rows: []
                })
              }
              restDays = compensationH.filter(el => !el.dateRest)
              if (restDays.length) {
                const text = UB.i18n(` - наданням {0} відпочинку за заявою працівника`, restDays.length === 1 ? UB.i18n('іншого дня') : UB.i18n('інших днів'))
                result.data.push({
                  text: (cntPunkt !== 1 ? '' : ++index + '. ') + UB.i18n(`Компенсувати роботу у {0}, за згодою сторін, згідно ст. 72 КЗпП України{1}.`, restDays.length === 1 ? `${UB.i18n('вихідний')} день` : UB.i18n('вихідні дні'), text),
                  rows: []
                })
              }
            }
          } else {
            ++index
          }
        }
      })
    } else {
      orderDet = _.groupBy(_.sortBy(data.orderDet, 'dateFrom'), function (item) {
        return AC.dateService.formatDate(item.dateFrom) + (result.isPrintAddon ? '' : '/' + item.restDayScheduleDesc || '')
      })
      const cntPunkt = (data.tasks.tasks ? data.tasks.tasks.length : 0) + (data.orderDet ? _.size(orderDet) : 0)
      let compensationH = []
      let compensationM = []
      _.forEach(orderDet, elements => {
        let person = []
        let text
        const item = elements[0]
        const dateFrom = AC.dateService.formatDate(item.dateFrom)
        const aDate = AC.dateService.shiftDate(item.dateFrom)
        const isHolidayDay = data.holiday && data.holiday.length && data.holiday.find(item => {
          return item.getTime() === aDate.getTime()
        })
        const textHolidayDay = isHolidayDay ? UB.i18n('святковий') : UB.i18n('вихідний')
        if (isHolidayDay) {
          day.holiday = true
        } else {
          day.weekday = true
        }
        const toOrder = elements.filter(el => el.toOrder).length
        if (!data.order.titleOrder && _.size(orderDet) === 1) {
          titleName = UB.i18n(`у {0} день {1}`, textHolidayDay, dateFrom)
        }
        const addObj = {}
        if (result.isPrintAddon) {
          text = UB.i18n(`{2} до роботи у {0} день {1} працівників, за списком згідно з додатком.`, textHolidayDay, dateFrom, orderWord)
          if (toOrder > 0) {
            result.data.push({
              text: `${cntPunkt ? ++index + '. ' : ''}${text}`,
              rows: []
            })
          } else {
            ++index
          }
          addObj.text = UB.i18n(`Список<br/> працівників залучених до роботи у {0} день {1}`, textHolidayDay, dateFrom)
          addObj.data = []
        }

        let departmets = []
        if (!data.order.sortItems || data.order.sortItems === 'STAFF') {
          departmets = _.sortBy(elements, 'depSortBy')
          departmets = _.groupBy(departmets, 'depSortBy')
        } else {
          departmets = _.groupBy(elements, 'null')
        }

        _.forEach(departmets, stItems => {
          // dep = _.sortBy(dep, 'employeePositionID.positionID.treePath')
          stItems = !data.order.sortItems || data.order.sortItems === 'STAFF' ? _.sortBy(stItems, ['departmentID.treePath']) : stItems

          if (result.isPrintAddon) {
            person = stItems.map((item, npp) => {
              const posInfo = HR.reportUtils.getInfoItemOrderInCase(item, 'nom', true, result.notUseMiddleNameInOrder)
              const tabNum = showTabNum && item['employeeNumberID.tabNum'] ? UB.i18n(`(Таб. №&nbsp;{0})`, item['employeeNumberID.tabNum']) : ''
              return {
                toOrder: item.toOrder,
                index: npp + 1,
                empName: (posInfo.empName || '') + (tabNum ? ' ' + tabNum : ''),
                posName: posInfo.posName ? HR.nameCase.cap(posInfo.posName) + orgGen : '',
                description: item.typeCompensation === 'MONEY'
                  ? UB.i18n('грошова компенсація у розмірі та порядку, визначених законодавством про працю.')
                  : item.dateRest ? UB.i18n(`надання дня відпочинку {0}.`, AC.dateService.formatDate(item.dateRest)) : UB.i18n('надання іншого дня відпочинку за заявою.')
              }
            })
            person = person.filter(el => el.toOrder)
            if (person.length) {
              addObj.data.push({
                dep: stItems[0].depName,
                persons: person
              })
            }
          } else {
            const indexItem = cntPunkt ? ++index : ''
            text = indexItem + (indexItem ? '. ' : '') + (!data.order.sortItems
              ? UB.i18n(`{3} до роботи у {0} день {1}{4} працівників {2}:`, textHolidayDay, dateFrom, stItems[0].depNameGen, orderWord, stItems[0]['restDayScheduleDesc'] ? ' ' + stItems[0]['restDayScheduleDesc'] : '')
              : UB.i18n(`{2} до роботи у {0} день {1}{3} працівників:`, textHolidayDay, dateFrom, orderWord, stItems[0]['restDayScheduleDesc'] ? ' ' + stItems[0]['restDayScheduleDesc'] : ''))
            const objSt = {
              stName: data.order.sortItems === 'STAFF' ? HR.nameCase.cap(stItems[0].depName || '') : '',
              deps: []
            }
            const depts = _.groupBy(stItems, item => data.order.sortItems === 'STAFF' ? item['employeePositionID.departmentID.name'] : 'null')
            _.forEach(depts, depItems => {
              const depName = HR.nameCase.cap(depItems[0]['employeePositionID.departmentID.name'] || '')
              if (data.order.sortItems || data.order.sortItems === 'STAFF') {
                depItems = depItems.sort(HR.reportUtils.funcOrderTreePathSort)
              }
              if (data.order.sortItems === 'ALPHABET') {
                depItems = depItems.sort(HR.reportUtils.funcOrderFioTabNumSort)
              }
              const objDep = {
                depName: data.order.sortItems !== 'STAFF' || depName === objSt.stName ? '' : depName,
                items: []
              }

              person = depItems.map((item, npp) => {
                let posInfo = HR.reportUtils.getInfoItemOrderInCase(item, 'dat', true, result.notUseMiddleNameInOrder)
                const tabNum = showTabNum && item['employeeNumberID.tabNum'] ? UB.i18n(`(Таб. №&nbsp;{0})`, item['employeeNumberID.tabNum']) : ''
                const workHoursText = item['workHours'] ? ' ' + UB.i18n('на') + ' ' + item['workHours'] + ' ' + AC.dateService.plural(UB.i18n('робочу годину_робочих годин_робочих годин'), item['workHours']) : ''
                if (item.typeCompensation === 'MONEY') {
                  compensationM.push({
                    toOrder: item.toOrder,
                    sortBy: item['employeePositionID.positionID.treePath'],
                    employeePositionID: item.employeePositionID,
                    person: posInfo.empName,
                    day: item.dateFrom,
                    workHoursText
                  })
                } else {
                  compensationH.push({
                    toOrder: item.toOrder,
                    sortBy: item['employeePositionID.positionID.treePath'],
                    person: posInfo.empName,
                    dateRest: !item.byRequest && item.dateRest ? item.dateRest : null
                  })
                }
                posInfo = HR.reportUtils.getInfoItemOrderInCase(item, 'acc', true, result.notUseMiddleNameInOrder)
                return {
                  toOrder: item.toOrder,
                  itemText: `${npp + 1}. ${boldFormatBegin + posInfo.empName}${tabNum ? ' ' + boldFormatEnd + tabNum : boldFormatEnd}${posInfo.posName ? ', ' + posInfo.posName + orgGen : ''}${workHoursText}${npp === depItems.length - 1 ? '.' : ';'}`
                }
              })
              person = person.filter(el => el.toOrder)
              if (person.length) {
                objDep.items = person.map(p => {
                  return { itemText: indexItem + '.' + p.itemText }
                })
              }
              if (objDep.items.length) {
                objSt.deps.push(objDep)
              }
            })
            if (objSt.deps.length) {
              result.data.push({
                text: text,
                rows: objSt
              })
            }
          }
        })
        if (result.isPrintAddon && addObj.data.length) {
          result.addons.push(addObj)
        }
      })

      if (!result.isPrintAddon) {
        if (compensationM.length) {
          const toOrder = compensationM.filter(el => el.toOrder).length
          if (toOrder) {
            compensationM = _.sortBy(compensationM, ['sortBy', 'day'])
            let person = []
            for (let i = 0; i < compensationM.length; i++) {
              let objPerson = _.find(person, { employeePositionID: compensationM[i].employeePositionID })
              if (objPerson) {
                objPerson.itemText += ', ' + AC.dateService.formatDate(compensationM[i].day) + compensationM[i].workHoursText
              } else {
                person.push({
                  employeePositionID: compensationM[i].employeePositionID,
                  toOrder: compensationM[i].toOrder,
                  itemText: `${compensationM[i].person} ${UB.i18n('за')} ${AC.dateService.formatDate(compensationM[i].day)}${compensationM[i].workHoursText}`
                })
              }
            }
            const indexItem = ++index
            person.forEach((p, npp) => {
              p.itemText = indexItem + '.' + (npp + 1) + '. ' + p.itemText + (npp === person.length - 1 ? '.' : ';')
            })
            person = person.filter(el => el.toOrder)

            result.data.push({
              text: indexItem + '. ' + UB.i18n('Компенсувати роботу у вихідні дні згідно ст. 107 КЗпП України – провести оплату праці в подвійному розмірі працівникам:'),
              rows: [{
                stName: '',
                deps: [{
                  depName: '',
                  items: person
                }]
              }]
            })
          } else {
            ++index
          }
        }

        if (compensationH.length) {
          // Если дата отдыха указана
          let list = _.sortBy(compensationH.filter(el => el.dateRest), ['dateRest', 'sortBy'])
          if (list.length) {
            const toOrder = list.filter(el => el.toOrder).length
            if (toOrder) {
              list = _.groupBy(list, 'dateRest')
              let person = []
              const indexItem = ++index
              let npp = 1
              const sizeList = _.size(list)
              _.forEach(list, elements => {
                const toOrder = elements.filter(el => el.toOrder).length
                if (toOrder) {
                  person.push({
                    itemText: `${indexItem + '.'}${npp}. ${elements[0].dateRest ? AC.dateService.formatDate(elements[0].dateRest) + ' - ' : ''}${_.uniq(elements.map(e => e.person)).join(', ')}${npp === sizeList ? '.' : ';'}`
                  })
                }
                npp++
              })
              result.data.push({
                text: indexItem + '. ' + UB.i18n('Компенсувати роботу у вихідні дні, за згодою сторін, згідно ст. 72 КЗпП України - наданням іншого дня відпочинку працівникам: '),
                rows: [{
                  stName: '',
                  deps: [{
                    depName: '',
                    items: person
                  }]
                }]
              })
            } else {
              ++index
            }
          }

          // Если дата отдыха не указана
          list = _.sortBy(compensationH.filter(el => !el.dateRest), ['sortBy'])
          if (list.length) {
            const toOrder = list.filter(el => el.toOrder).length
            if (toOrder) {
              const indexItem = ++index + '. '
              result.data.push({
                text: indexItem + UB.i18n('Компенсувати роботу у вихідні дні, за згодою сторін, згідно ст. 72 КЗпП України - наданням іншого дня відпочинку за заявою працівникам: {0}.', _.uniq(list.filter(el => el.toOrder).map(el => el.person)).join(', ')),
                rows: []
              })
            } else {
              ++index
            }
          }
        }
      }

      if (!data.order.titleOrder && _.size(orderDet) > 1) {
        if (day.weekday && day.holiday) {
          titleName = UB.i18n('у вихідні та святкові дні')
        } else if (day.weekday) {
          titleName = UB.i18n('у вихідні дні')
        } else if (day.holiday) {
          titleName = UB.i18n('у святкові дні')
        }
      }
    }

    result.titleOrder = data.order.titleOrder || UB.i18n('Про залучення до роботи')
    result.titleOrder = `${result.titleOrder}${titleName ? '<br/>' : ''}${titleName || ''}`
    result.tasks = data.order.sortItems === 'ORDER' ? [] : data.tasks.tasks.map(e => ({
      task: `${index === 0 && data.tasks.tasks.length === 1 ? '' : ++index + '. '}${e.task}${e['positionName'] ? ` ${e['positionName']}` : ''}${e['employeeName'] ? ` ${e['employeeName']}` : ''}.`
    }))

    return AC.reportService.removeEmptyValues(result)
  }
}
