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
          const whereArray = [['empOrderType', '=', 'CWSWORKHOUR']]
          const documentView = AC.settings.get('hrEmpOrderPrintType', order.masterOrganizationID || order.organizationID)
          const printDocumentView = documentView === order.documentOrderType ? documentView : order.documentOrderType
          const configObj = { printDocumentView }
          return Promise.all([
            HR.reportUtils.getOrderPrintConfig(configObj, order.subOrganization ? order.masterOrganizationID : order.organizationID),
            HR.reportUtils.getEmpOrderDet(reportParams.instanceID, order.orderDate || order.entryDate, ['departmentID'], whereArray, true),
            UB.Repository('hr_empOrderCwsworkhourDet')
              .attrs(['ID', 'dateFrom', 'dateTo', 'workScheduleID', 'isSaveHoursWork'])
              .where('orderID', '=', reportParams.instanceID)
              .orderBy('itemIdx')
              .selectAsObject(),
            UB.Repository('hr_empOrderEmployeeDet')
              .attrs(['ID', 'employeePositionID', 'employeeID.datName', 'employeeID.fullFIO', 'employeeID.shortFIO', 'paraID'])
              .where('orderID', '=', reportParams.instanceID)
              .orderBy('itemIdx')
              .selectAsObject(),
            HR.reportUtils.getResponsiblesForOrder(order, printDocumentView === 'APPOINTMENT'),
            HR.reportUtils.getCityName(order.subOrganization ? order.masterOrganizationID : order.organizationID),
            UB.Repository('hr_empOrderCwsWorkHourDayDet')
              .attrs([ 'paraID', 'numDay', 'workScheduleID', 'workScheduleID.begins', 'timeFrom', 'timeTo', 'recreationFrom', 'recreationTo' ])
              .where('orderID', '=', reportParams.instanceID)
              .orderBy('paraID')
              .selectAsObject(),
            printDocumentView
          ]).then(([configObj, empOrder, orderDet, employeeDet, respPosInfo, city, workScheduleDays, printDocumentView]) => {
            return Promise.all([
              HR.reportUtils.getTask(reportParams.instanceID, order.orderDate || order.entryDate, order.showTabNum, configObj.notUseMiddleNameInOrder)
            ]).then(([tasks]) => ({
              empOrder,
              orderDet,
              employeeDet,
              tasks,
              respPosInfo,
              city,
              workScheduleDays,
              order,
              orderExtract,
              printDocumentView,
              configObj
            }))
          })
        })
      })
  },

  getParams: async function (data) {
    let titleName
    const showTabNum = data.order.showTabNum
    const days = [UB.i18n('понеділок'), UB.i18n('вівторок'), UB.i18n('середа'), UB.i18n('четверг'), UB.i18n("п'ятниця"), UB.i18n('субота'), UB.i18n('неділя')]

    let index = 0
    const ids = []
    // data.workScheduleDays = data.workScheduleDays && data.workScheduleDays.length ? _.groupBy(data.workScheduleDays.filter(e => ids.indexOf(e.paraID) !== -1), 'paraID') : []
    let orderWord = UB.i18n('Встановити')
    orderWord = data.configObj.smallOrderWord ? orderWord : orderWord.toUpperCase()
    const boldFormatBegin = data.configObj.normalFullName ? '' : '<b>'
    const boldFormatEnd = data.configObj.normalFullName ? '' : '</b>'

    const orgGen = data.order.subOrganization && (data.order['organizationID.nameGen'] || data.order['organizationID.name'])
      ? ' ' + (data.order['organizationID.nameGen'] || data.order['organizationID.name']) : ''
    const params = {
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
      organizationNameGen: data.order.subOrganization
        ? data.order['masterOrganizationID.nameGen'] || data.order['masterOrganizationID.name'] || ''
        : data.order['organizationID.nameGen'] || data.order['organizationID.name'] || '',
      items: [],
      workSchedule: [],
      responsiblesInfo: data.respPosInfo,
      height: _.size(data.workScheduleDays) === 1 ? 'height: 45px;' : ''
    }
    HR.reportUtils.copyToParams(params, data.configObj)

    data.orderDet.forEach(det => {
      const employeeItems = data.employeeDet.filter(o => o.paraID === det.ID)
      if (employeeItems.length) {
        const one = employeeItems.length === 1
        const obj = {
          toOrder: false,
          index: (data.employeeDet && data.employeeDet.length > 1) || (data.tasks && data.tasks.tasks && data.tasks.tasks.length) ? ++index + '. ' : '',
          text: '',
          employeeList: []
        }

        const employeeList = employeeItems.map(e => {
          const item = data.empOrder.find(o => o.ID === e.ID)
          _.merge(e, item || [])
          const toOrder = data.orderExtract && data.orderExtract.ID
            ? ((data.orderExtract.departmentID ? data.orderExtract.departmentID === item.departmentID : true) && (data.orderExtract.employeePositionID ? data.orderExtract.employeePositionID === item.employeePositionID : true))
            : true
          if (toOrder) {
            ids.push(det.ID)
            obj.toOrder = true
          }
          const posInfo = HR.reportUtils.getInfoItemOrderInCase(e, 'dat', true, params.notUseMiddleNameInOrder)
          const tabNum = showTabNum && item['employeeNumberID.tabNum'] ? UB.i18n(`(Таб. №&nbsp;{0})`, item['employeeNumberID.tabNum']) : ''
          return {
            toOrder: toOrder,
            text: `${boldFormatBegin + (posInfo.empName || '')}${tabNum ? ' ' + boldFormatEnd + tabNum : boldFormatEnd}${posInfo && posInfo.posName ? ', ' + posInfo.posName + orgGen + ', ' : ''}`
          }
        })

        obj.text = `${orderWord}${one ? ' ' + employeeList[0].text : ''}` +
           UB.i18n(` на період з&nbsp;{0}{1} тривалість робочого часу{2} згідно графіку, що додається{3}`,
             AC.dateService.formatDate(det.dateFrom), det.dateTo ? ' до&nbsp;' + AC.dateService.formatDate(det.dateTo) : '',
             det.isSaveHoursWork ? ' зі збереженням денної норми робочого часу' : '',
             one ? '.' : ' ' + UB.i18n('працівникам'))

        obj.employeeList = one ? [] : employeeList
        params.items.push(obj)

      }
    })
    if (data.employeeDet.length === 1) {
      titleName = HR.reportUtils.formatShortNameInOrder(data.employeeDet[0]['employeeID.datName'] || data.employeeDet[0]['employeeID.fullFIO'], { notUseMiddleNameInOrder: data.configObj.notUseMiddleNameInOrder })
    } else if (data.employeeDet.length === 0) {
      titleName = ''
    } else {
      titleName = UB.i18n('працівників')
    }
    params.titleOrder =`${data.order.titleOrder || ''}${data.order.titleOrder && titleName ? '<br/>' : ''}${titleName || ''}`.replace(/&/g, '&nbsp;')

    data.workScheduleDays = data.workScheduleDays && data.workScheduleDays.length ? _.groupBy(data.workScheduleDays.filter(e => ids.indexOf(e.paraID) !== -1), 'paraID') : []

    // data.workScheduleDays = data.workScheduleDays.map(x=>new Array(x))
    _.forEach(data.workScheduleDays, item => {
      let obj = {
        workScheduleID: item[0].workScheduleID,
        title: item && item.length && item[0]['workScheduleID.begins'] === 'FROM_WEEKBEGIN' ? UB.i18n('Дні тижня') : UB.i18n('Номер дня'),
        grid: item.map(elem => ({
          days: elem['workScheduleID.begins'] === 'FROM_WEEKBEGIN' ? days[elem.numDay - 1] : `${elem.numDay}`,
          timeFrom: elem.timeFrom || '',
          timeTo: elem.timeTo ? (elem.timeTo === '00:00' ? '24:00' : elem.timeTo) : '',
          recreationFrom: elem.recreationFrom || '',
          recreationTo: elem.recreationTo ? (elem.recreationTo === '00:00' ? '24:00' : elem.recreationTo) : ''
        }))
      }
      if (params.workSchedule.length) {
        const objStr = JSON.stringify(obj)
        const objForFind = params.workSchedule.map(e => {
          return JSON.stringify({
            workScheduleID: e.workScheduleID,
            title: e.title,
            grid: e.grid
          })
        })
        const inx = objForFind.indexOf(objStr)
        if (inx === -1) {
          obj.employees = _.size(data.workScheduleDays) > 1 && item && item.length ? data.employeeDet.filter(e => e.paraID === item[0]['paraID']).map(item => item['employeeID.shortFIO']).join('<br />') : ''
          params.workSchedule.push(obj)
        } else {
          const employees = _.size(data.workScheduleDays) > 1 && item && item.length ? data.employeeDet.filter(e => e.paraID === item[0]['paraID']).map(item => item['employeeID.shortFIO']).join('<br />') : ''
          obj = params.workSchedule[inx]
          obj.employees += employees && employees.length ? '<br />' + employees : ''
        }
      } else {
        obj.employees = _.size(data.workScheduleDays) > 1 && item && item.length ? data.employeeDet.filter(e => e.paraID === item[0]['paraID']).map(item => item['employeeID.shortFIO']).join('<br />') : ''
        params.workSchedule.push(obj)
      }
    })

    params.tasks = data.tasks.tasks.map(e => ({
      task: `${index === 0 && data.tasks.tasks.length === 1 ? '' : ++index + '. '}${e.task}${e['positionName'] ? ` ${e['positionName']}` : ''}${e['employeeName'] ? ` ${e['employeeName']}` : ''}.`
    }))

    if (params.workSchedule.length === 1) {
      params.workSchedule[0].employees = ''
    }

    params.items = params.items.filter(el => el.toOrder)
    params.line = params.workSchedule.length ? '_'.repeat(30) : ''
    return AC.reportService.removeEmptyValues(params)
  }
}
