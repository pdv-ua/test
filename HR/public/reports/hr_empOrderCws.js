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
        const whereArray = [['empOrderType', '=', 'CWS']]
        return Promise.all([
          HR.reportUtils.getEmpOrder(reportParams.instanceID)]).then(([order]) => {
          const documentView = AC.settings.get('hrEmpOrderPrintType', order.masterOrganizationID || order.organizationID)
          const printDocumentView = documentView === order.documentOrderType ? documentView : order.documentOrderType
          const configObj = { printDocumentView }
          return Promise.all([
            HR.reportUtils.getOrderPrintConfig(configObj, order.subOrganization ? order.masterOrganizationID : order.organizationID),
            HR.reportUtils.getEmpOrderDet(reportParams.instanceID, order.orderDate || order.entryDate, ['departmentID'], whereArray, true),
            UB.Repository('hr_empOrderCwsDet')
              .attrs(['ID', 'employeeID.datName', 'employeeID.fullFIO', 'employeeID.shortFIO', 'dateFrom', 'dateTo', 'workScheduleID'])
              .where('orderID', '=', reportParams.instanceID)
              .orderBy('itemIdx')
              .selectAsObject(),
            HR.reportUtils.getResponsiblesForOrder(order, printDocumentView === 'APPOINTMENT'),
            HR.reportUtils.getCityName(order.subOrganization ? order.masterOrganizationID : order.organizationID),
            UB.Repository('hr_workScheduleDays')
              .attrs([ 'numDay', 'workScheduleID', 'workScheduleID.begins', 'timeFrom', 'timeTo', 'recreationFrom', 'recreationTo' ])
              .exists(UB.Repository('hr_empOrderCwsDet')
                .correlation('workScheduleID', 'workScheduleID')
                .where('mi_deleteDate', '>=', '#maxdate')
                .where('orderID', '=', reportParams.instanceID))
              .selectAsObject(),
            UB.Repository('ac_settingsOrg')
              .attrs(['value', 'constantID.code'])
              .where('organizationID', '=', order.masterOrganizationID || order.organizationID)
              .where('[constantID.code]', '=', 'hrFuncOrgType')
              .selectAsObject({
                'constantID.code': 'code'
              }),
            printDocumentView
          ]).then(([configObj, empOrder, orderDet, respPosInfo, city, workScheduleDays, settingsOrg, printDocumentView]) => {
            return Promise.all([
              HR.reportUtils.getTask(reportParams.instanceID, order.orderDate || order.entryDate, order.showTabNum, configObj.notUseMiddleNameInOrder)
            ]).then(([tasks]) => ({
              empOrder,
              orderDet,
              tasks,
              respPosInfo,
              city,
              workScheduleDays,
              order,
              orderExtract,
              settingsOrg,
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
    data.order.titleOrder = data.order.titleOrder || UB.i18n('Про зміну графіку роботи')
    let generalOrg = false
    if (data.settingsOrg) {
      data.settingsOrg = _.groupBy(data.settingsOrg, 'code')
      generalOrg = data.settingsOrg['hrFuncOrgType'] ? data.settingsOrg['hrFuncOrgType'][0].value === '1' : false
    }

    const days = [UB.i18n('Понеділок'), UB.i18n('Вівторок'), UB.i18n('Середа'), UB.i18n('Четвер'), UB.i18n("П'ятниця"), UB.i18n('Субота'), UB.i18n('Неділя')]
    let index = 0
    // список workScheduleID, которые нужно будет выводить
    const ids = [] // data.orderDet.map(e => e.workScheduleID)
    // data.workScheduleDays = data.workScheduleDays && data.workScheduleDays.length ? _.groupBy(data.workScheduleDays.filter(e => ids.indexOf(e.workScheduleID) !== -1), 'workScheduleID') : []

    const orgGen = data.order.subOrganization && (data.order['organizationID.nameGen'] || data.order['organizationID.name'])
      ? ' ' + (data.order['organizationID.nameGen'] || data.order['organizationID.name']) : ''

    let orderWord = UB.i18n('Встановити')
    orderWord = data.configObj.smallOrderWord ? orderWord : orderWord.toUpperCase()
    const boldFormatBegin = data.configObj.normalFullName ? '' : '<b>'
    const boldFormatEnd = data.configObj.normalFullName ? '' : '</b>'

    const params = {
      addons: !generalOrg,
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
      items: data.orderDet.map(e => {
        const item = data.empOrder.find(o => o.ID === e.ID)
        const toOrder = data.orderExtract && data.orderExtract.ID
          ? ((data.orderExtract.departmentID ? data.orderExtract.departmentID === item.departmentID : true) && (data.orderExtract.employeePositionID ? data.orderExtract.employeePositionID === item.employeePositionID : true))
          : true
        if (toOrder) {
          ids.push(e.workScheduleID)
        }

        _.merge(e, item || [])
        const posInfo = HR.reportUtils.getInfoItemOrderInCase(e, 'dat', true, data.configObj.notUseMiddleNameInOrder)
        const tabNum = showTabNum && item['employeeNumberID.tabNum'] ? UB.i18n(`(Таб. №&nbsp;{0})`, item['employeeNumberID.tabNum']) : ''

        let text = `${orderWord} ${boldFormatBegin + (posInfo.empName || '') + boldFormatEnd}${ tabNum ? ' ' + tabNum : ''}${posInfo && posInfo.posName ? ', ' + posInfo.posName + orgGen + ', ' : ''}`
        text += UB.i18n(` на період з&nbsp;{0}{1} тривалість робочого часу згідно графіку`, AC.dateService.formatDate(e.dateFrom), e.dateTo ? UB.i18n(' до&nbsp;') + AC.dateService.formatDate(e.dateTo) : '')
        text += generalOrg ? UB.i18n(` ({0}).`, e['employeePositionID.workPlace'] === '1' ? UB.i18n('основна посада') : UB.i18n('сумісник')) : UB.i18n(', що додається.')
        return {
          toOrder: toOrder,
          index: (data.orderDet && data.orderDet.length > 1) || (data.tasks && data.tasks.tasks && data.tasks.tasks.length) ? ++index + '. ' : '',
          text: text
        }
      }),
      workSchedule: [],
      tasks: data.tasks.tasks.map(e => ({
        task: `${index === 0 && data.tasks.tasks.length === 1 ? '' : ++index + '. '}${e.task}${e['positionName'] ? ` ${e['positionName']}` : ''}${e['employeeName'] ? ` ${e['employeeName']}` : ''}.`
      })),
      responsiblesInfo: data.respPosInfo,
      height: _.size(data.workScheduleDays) === 1 ? 'height: 45px;' : ''
    }
    HR.reportUtils.copyToParams(params, data.configObj)

    if (data.orderDet.length === 1) {
      titleName = HR.reportUtils.formatShortNameInOrder(data.orderDet[0]['employeeID.datName'] || data.orderDet[0]['employeeID.fullFIO'], { notUseMiddleNameInOrder: data.configObj.notUseMiddleNameInOrder })
    } else if (data.orderDet.length === 0) {
      titleName = ''
    } else {
      titleName = UB.i18n('працівників')
    }
    params.titleOrder = `${data.order.titleOrder || ''}${data.order.titleOrder && titleName ? '<br/>' : ''}${titleName || ''}`.replace(/&/g, '&nbsp;')

    if (!generalOrg) {
      data.workScheduleDays = data.workScheduleDays && data.workScheduleDays.length ? _.groupBy(data.workScheduleDays.filter(e => ids.indexOf(e.workScheduleID) !== -1), 'workScheduleID') : []
      _.forEach(data.workScheduleDays, item => {
        params.workSchedule.push({
          title: item && item.length && item[0]['workScheduleID.begins'] === 'FROM_WEEKBEGIN' ? UB.i18n('Дні тижня') : UB.i18n('Номер дня'),
          employees: _.size(data.workScheduleDays) > 1 && item && item.length ? data.orderDet.filter(e => e.workScheduleID === item[0]['workScheduleID']).map(item => item['employeeID.shortFIO']).join('<br />') : '',
          grid: item.map(elem => ({
            days: elem['workScheduleID.begins'] === 'FROM_WEEKBEGIN' ? days[elem.numDay - 1] : `${elem.numDay}`,
            timeFrom: elem.timeFrom || '',
            timeTo: elem.timeTo || '',
            recreationFrom: elem.recreationFrom || '',
            recreationTo: elem.recreationTo || ''
          }))
        })
      })
    }

    params.items = params.items.filter(el => el.toOrder)
    params.line = params.workSchedule.length ? '_'.repeat(30) : ''
    return AC.reportService.removeEmptyValues(params)
  }
}
