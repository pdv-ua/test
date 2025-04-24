/* global _ UB AC HR UB */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this

    return me.getReportData(reportParams.instanceID).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },

  getReportData: async function (ID) {
    const result = {
      emblem: HR.reportUtils.getEmblem(),
      items: [],
      line: '_'.repeat(30)
    }
    const order = await HR.reportUtils.getEmpOrder(ID, ['organizationID.parentUnitTypeID.code', 'organizationID.nameLoc'])
    if (!order) {
      return result
    }

    await HR.reportUtils.getOrderPrintConfig(result, order.subOrganization ? order.masterOrganizationID : order.organizationID)
    result.orderDate = order.orderDate ? AC.dateService.formatDate(order.orderDate) : '__________'
    result.orderNumber = order.orderNumber
    result.orderIndex = order['dictEmpOrderIndexID.code'] === null ? '' : `/${order['dictEmpOrderIndexID.code']}`
    result.organizationName = order.orderOrganizationName
    result.titleOrder = (order.titleOrder || '').replace(/&/g, '&nbsp;')
    result.preamble = (order.preamble || '').replace(/&/g, '&nbsp;')
    result.isApparat = order['organizationID.parentUnitTypeID.code'] === '1'
    result.city = await HR.reportUtils.getCityName(order['organizationID'])
    if (order.reason) {
      result.orderReason = {
        reason: UB.i18n(`Підстава: {0}.`, order.reason)
      }
    }

    result.responsiblesInfo = await HR.reportUtils.getResponsiblesForOrder(order)

    let index = 1
    const empOrderCompetitionadDet = await UB.Repository('hr_empOrderCompetitionadDet')
      .attrs(['ID', 'empOrderType', /* 'organizationID.nameGen', 'organizationID.nameLoc', 'organizationID.parentUnitTypeID.code', */
        'departmentID', 'departmentID.nameGen', 'departmentID.nameDat', 'departmentID.name', 'needGroupReq'])
      /* .attrs(['*']) */
      .where('orderID', '=', ID)
      .orderBy('itemIdx')
      .selectAsObject()
    const needGroupReq = empOrderCompetitionadDet.some(item => item.needGroupReq)
    const organizationName = order['organizationID.nameGen'] || order['organizationID.name'] || ''
    let posDet = await UB.Repository('hr_empOrderCompetitionadPosDet')
      .attrs(['ID', 'paraID', 'positionID.fullNameGen', 'positionID.fullNameNom', 'positionID.fullName', 'positionID.positionType', 'positionID.psCategory', 'positionID',
        'positionID.isOrgBoss'])
      .where('orderID', '=', ID)
      .where('paraID.mi_deleteDate', '>=', '#maxdate')
      .orderBy('itemIdx')
      .selectAsObject()
    // if (needGroupReq) {
    //   posDet = posDet ? _.groupBy(posDet, 'positionID') : []
    // }
    posDet = posDet ? _.groupBy(posDet, 'paraID') : []
    const positions = []
    _.forEach(empOrderCompetitionadDet, det => {
      if (det.empOrderType === 'COMPETITIONAD') {
        if (det) {
          if (posDet[det.ID] && posDet[det.ID].length === 1 && !needGroupReq) {
            const pos = HR.reportUtils.makePositionName(posDet[det.ID][0]['positionID.fullNameGen'] || posDet[det.ID][0]['positionID.fullName'] || '', posDet[det.ID][0]['employeePositionID.positionID.isOrgBoss'])
            result.items.push({
              indent: 1,
              text: UB.i18n(`{0}. Оголосити конкурс на зайняття вакантної посади {1}.`, index++, pos)
            })
            result.items.push({
              indent: 1,
              text: UB.i18n(`{0}. Затвердити умови проведення конкурсу, що додаються.`, index++)
            })
          } else {
            const posCatMap = []
            if (posDet[det.ID] && Array.isArray(posDet[det.ID])) {
              posDet[det.ID].forEach(item => {
                const psCategoryCode = item['positionID.psCategory']
                let psCategory = null
                const enumItem = UB.core.UBEnumManager.getStore('HR_POSITION_PSCATEGORY').getById(psCategoryCode)
                if (enumItem) {
                  psCategory = `«${enumItem.data.shortName}»`
                }
                posCatMap.push(psCategory)
                const position = {
                  indexPos: positions.length + 1,
                  name: item['positionID.fullNameNom'],
                  positionCategory: psCategory,
                  ID: item['positionID']
                }
                positions.push(position)
              })
            }
            const cat = posCatMap.filter((value, index, self) => self.indexOf(value) === index).filter(item => item !== null)
            result.items.push({
              indent: 1,
              text: UB.i18n(`{0}. Оголосити конкурс на зайняття вакантних посад державної служби категорії {1} в {2} згідно з додатком.`, index++, cat, order['organizationID.parentUnitTypeID.code'] === '1' ? UB.i18n('апараті ') + (order['organizationID.nameGen'] || order['organizationID.name']) : order['organizationID.nameLoc'] || order['organizationID.name'])
            })
            result.items.push({
              indent: 1,
              text: UB.i18n(`{0}. Затвердити умови проведення конкурсів на зазначені посади, що додаються.`, index++)
            })
          }
          if (det.departmentID) {
            result.items.push({
              indent: 1,
              text: UB.i18n(`{0}. {1} забезпечити оприлюднення інформації про проведення конкурсу та перевірку документів поданих кандидатами для участі у конкурсі в установленому законодавством порядку.`, index++, det['departmentID.nameDat'] || det['departmentID.name'] || '')
            })
          }

          if (det.reason) {
            result.items.push({
              text: UB.i18n(`Підстава: {0}.`, det.reason),
              indent: 0
            })
          }
        }
      }
    })

    const groupedPositions = needGroupReq ? positions.reduce((acc, el) => {
      const foundIndex = acc.findIndex(x => x.ID === el.ID)
      if (!~foundIndex) {
        el.count = 1
        acc.push(el)
      } else {
        acc[foundIndex]['count']++
        acc[foundIndex]['name'] = el.name + ` <b>(${acc[foundIndex]['count']} ${AC.viewUtils.declOfNum(acc[foundIndex]['count'], ['посада', 'посади', 'посад'])})</b>`
      }
      return acc
    }, []) : positions

    result.details = positions && positions.length > 0 ? {
      organizationName: organizationName,
      positions: needGroupReq ? groupedPositions : positions
    } : null

    const tasksDet = await HR.reportUtils.getTask(ID, order.orderDate || order.entryDate, order.showTabNum, result.notUseMiddleNameInOrder)
    result.tasks = tasksDet.tasks.map(e => ({
      task: `${index++}. ${e.task}${e['positionName'] ? ` ${e['positionName']}` : ''}${e['employeeName'] ? ` ${e['employeeName']}` : ''}.`
    }))

    return result
  }
}
