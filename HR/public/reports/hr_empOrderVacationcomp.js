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

    const result = {
      emblem: HR.reportUtils.getEmblem(),
      printDocumentView: printDocumentView,
      titleOrderParams: printDocumentView === 'APPOINTMENT' ? 'padding-left: 34px; ' : '',
      responsiblesInfo: responsiblesInfo,
      orderType: printDocumentView === 'APPOINTMENT'
        ? UB.i18n('РОЗПОРЯДЖЕННЯ')
        : orderExtract && orderExtract.ID ? UB.i18n('В И Т Я Г &nbsp;З&nbsp; Н А К А З У') : UB.i18n('Н А К А З'),
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
      data: []
    }

    await HR.reportUtils.getOrderPrintConfig(result, order.subOrganization ? order.masterOrganizationID : order.organizationID)
    const orgGen = order.subOrganization && (order['organizationID.nameGen'] || order['organizationID.name'])
      ? ' ' + (order['organizationID.nameGen'] || order['organizationID.name']) : ''

    const showTabNum = order.showTabNum // AC.settings.get('hrOrderTabNum', order.masterOrganizationID || order.organizationID) === true
    const experienceWithoutPeriod = AC.settings.get('hrOrderVacExpWithoutPeriod', order.masterOrganizationID || order.organizationID) === true
    const boldFormatBegin = result.normalFullName ? '' : '<b>'
    const boldFormatEnd = result.normalFullName ? '' : '</b>'
    let orderWord = UB.i18n('Виплатити')
    orderWord = result.smallOrderWord ? orderWord : orderWord.toUpperCase()

    const taskDet = await HR.reportUtils.getTask(ID, order.orderDate || order.entryDate, order.showTabNum, result.notUseMiddleNameInOrder)
    const whereArray = [['empOrderType', '=', 'VACATIONCOMP']]
    const orderDet = await HR.reportUtils.getEmpOrderDet(ID, order.orderDate || order.entryDate, ['departmentID'], whereArray, true)
    const copmDet = await UB.Repository('hr_empOrderVacationcompDet')
      .attrs(['ID', 'dateFrom', 'employeeID', 'employeeID.fullFIO', 'employeeID.datName', 'reasonDoc', 'isDetailVacation'])
      .where('orderID', '=', ID)
      .selectAsObject()

    const ids = _.compact(orderDet.map(el => el.employeeID))
    const employeeExperience = ids && ids.length > 0 ? await UB.Repository('hr_employeeExperience')
      .attrs(['ID', 'employeeID', 'dictExperienceID.code', 'calcDate'])
      .where('dictExperienceID.code', '=', '6')
      .where('employeeID', 'in', ids)
      .selectAsObject() : []

    let index = 1
    for (let i = 0; i < orderDet.length; i++) {
      const item = orderDet[i]
      const toOrder = orderExtract && orderExtract.ID
        ? ((orderExtract.departmentID ? orderExtract.departmentID === item.departmentID : true) && (orderExtract.employeePositionID ? orderExtract.employeePositionID === item.employeePositionID : true))
        : true
      const detItem = _.find(copmDet, { ID: item.ID })
      if (detItem) {
        const itemIdxText = copmDet.length === 1 && taskDet.tasks.length === 0 ? '' : `${index++}. `
        const datPosInfo = HR.reportUtils.getInfoItemOrderInCase(item, 'dat', true, result.notUseMiddleNameInOrder)
        // const datName = HR.reportUtils.getShortFIO(datPosInfo.empName)
        const tabNum = showTabNum && item['employeeNumberID.tabNum'] ? UB.i18n(`(Таб. №&nbsp;{0})`, item['employeeNumberID.tabNum']) : ''
        let empVac
        if (detItem.isDetailVacation) {
          empVac = await UB.Repository('hr_empOrderVacationcompListDet')
            .attrs(['dayComp', 'empVacationPeriodID.dateFrom', 'empVacationPeriodID.dateTo', 'empVacationPeriodID.empVacationPlanID.dictVacationKindID.code',
              'empVacationPeriodID.empVacationPlanID.dictVacationKindID.name', 'empVacationPeriodID.empVacationPlanID.dictVacationKindID.nameGen'])
            .where('grantParaID', '=', item.ID)
            .orderBy('empVacationPeriodID.empVacationPlanID.dictVacationKindID.name')
            .orderBy('empVacationPeriodID.dateFrom')
            .orderBy('empVacationPeriodID.dateTo')
            .selectAsObject()

          empVac.forEach(next => {
            next.experience = ''
            if (next['empVacationPeriodID.empVacationPlanID.dictVacationKindID.code'] === 'dState') {
              const empExperience = employeeExperience.find(o => o.employeeID === detItem.employeeID)
              if (experienceWithoutPeriod) {
                if (empExperience && empExperience.calcDate) {
                  const ymd = AC.dateService.getYmd(empExperience.calcDate, next['empVacationPeriodID.dateFrom'] || next.dateFrom, true)
                  next.experience = ` ${ymd.years}&nbsp;${AC.dateService.plural('рік_роки_років', ymd.years)}`
                } else {
                  next.experience = UB.i18n('___ років')
                }
              }
              next.showPeriod = !experienceWithoutPeriod
            } else {
              next.showPeriod = true
            }
          })
        } else {
          empVac = await UB.Repository('hr_empOrderVacationcompListDet')
            .attrs(['sum([dayComp])', 'empVacationPeriodID.empVacationPlanID.dictVacationKindID.name', 'empVacationPeriodID.empVacationPlanID.dictVacationKindID.nameGen'])
            .where('grantParaID', '=', item.ID)
            .groupBy(['empVacationPeriodID.empVacationPlanID.dictVacationKindID.name', 'empVacationPeriodID.empVacationPlanID.dictVacationKindID.nameGen'])
            .orderBy('empVacationPeriodID.empVacationPlanID.dictVacationKindID.name')
            .selectAsObject({
              'sum([dayComp])': 'dayComp'
            })
        }
        empVac = empVac.filter(el => el.dayComp)
        let text = UB.i18n(`{0}{5} {1}{2}{3} грошову компенсацію за невикористані дні відпустки{4}`, itemIdxText, boldFormatBegin + datPosInfo.empName,
          tabNum ? ' ' + boldFormatEnd + tabNum : boldFormatEnd, datPosInfo.posName ? ', ' + datPosInfo.posName + orgGen : '', empVac && empVac.length ? ', а саме:' : '.', orderWord)
        text = text.replace('</b> ', ' </b>')
        result.data.push({
          toOrder: toOrder,
          indent: 1,
          text: text
        })

        empVac.forEach((empVacItem, ind) => {
          if (empVacItem.dayComp) {
            let termStr = `- ${empVacItem.dayComp}&nbsp;${AC.dateService.plural(UB.i18n('календарний день_календарних дні_календарних днів'), empVacItem.dayComp)}  `
            termStr += `${HR.nameCase.uncap(empVacItem['empVacationPeriodID.empVacationPlanID.dictVacationKindID.nameGen'] ||
              empVacItem['empVacationPeriodID.empVacationPlanID.dictVacationKindID.name'] || '')}`
            termStr += empVacItem.experience ? ' ' + empVacItem.experience : ''
            // empVacItem['empVacationPeriodID.dateTo'] = me.getMinDate(empVacItem['empVacationPeriodID.dateTo'], detItem.dateFrom)
            if (detItem.isDetailVacation && empVacItem['empVacationPeriodID.dateFrom'] && empVacItem['empVacationPeriodID.dateTo'] && empVacItem.showPeriod) {
              termStr += UB.i18n(` за період роботи з&nbsp;{0}&nbsp;року по&nbsp;{1}&nbsp;року`,
                AC.dateService.formatDate(empVacItem['empVacationPeriodID.dateFrom']), AC.dateService.formatDate(empVacItem['empVacationPeriodID.dateTo']))
            }
            result.data.push({
              toOrder: toOrder,
              indent: 1,
              text: termStr + ((ind + 1) < empVac.length - 1 ? ';' : '.')
            })
          }
        })

        if (detItem.reasonDoc) {
          result.data.push({
            toOrder: toOrder,
            text: UB.i18n(`Підстава: {0}.`, detItem.reasonDoc),
            indent: 0
          })
        }
      }
    }

    if (copmDet.length === 1) {
      const item = orderDet[0]
      const datEmpInfo = HR.reportUtils.getInfoItemOrderInCase(item, 'dat', false, result.notUseMiddleNameInOrder)
      const titleName = HR.reportUtils.getShortFIO(datEmpInfo.empName)
      result.titleOrder = `${result.titleOrder || ''}${result.titleOrder && titleName ? '<br/>' : ''}${titleName || ''}`
    } else if (copmDet.length > 1) {
      result.titleOrder = `${result.titleOrder || ''}${result.titleOrder ? '<br/>' : ''}${UB.i18n('працівників')}`
    }
    result.data = result.data.filter(el => el.toOrder)

    result.tasks = taskDet.tasks.map(e => ({
      task: `${index === 1 && taskDet.tasks.length === 1 ? '' : index++ + '. '}${e.task}${e['positionName'] ? ` ${e['positionName']}` : ''}${e['employeeName'] ? ` ${e['employeeName']}` : ''}.`
    }))

    return result
  },
  getMinDate: function (d1, d2) {
    if (!d1 || !d2) return null
    return d1 < d2 ? d1 : d2
  }
}
