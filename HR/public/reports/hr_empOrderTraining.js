/* global UB, AC _ HR */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    return me.getReportData(reportParams.instanceID, reportParams.params ? reportParams.params.orderExtraID || 0 : 0).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (ID, orderExtraID) {
    const me = this
    const orderExtract = await HR.reportUtils.getEmpOrderExtract(orderExtraID)
    const order = await HR.reportUtils.getEmpOrder(ID)
    if (!order) {
      return {
        emblem: HR.reportUtils.getEmblem()
      }
    }
    const orderDate = order.orderDate || order.entryDate
    const documentView = AC.settings.get('hrEmpOrderPrintType', order.masterOrganizationID || order.organizationID)
    const printDocumentView = documentView === order.documentOrderType ? documentView : order.documentOrderType
    const responsiblesInfo = await HR.reportUtils.getResponsiblesForOrder(order, printDocumentView === 'APPOINTMENT')
    const showTabNum = order.showTabNum

    const result = {
      titleName: UB.i18n('працівників'),
      emblem: HR.reportUtils.getEmblem(),
      orderDet: [],
      positionType: null,
      positionTypeActing: null,
      addons: [],
      line: '_'.repeat(30),
      printDocumentView: printDocumentView,
      titleOrderParams: printDocumentView === 'APPOINTMENT' ? 'padding-left: 34px; ' : '',
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
      organizationNameGen: order.subOrganization
        ? order['masterOrganizationID.nameGen'] || order['masterOrganizationID.name'] || ''
        : order['organizationID.nameGen'] || order['organizationID.name'] || '',
      titleOrder: (order.titleOrder || '').replace(/&/g, '&nbsp;'),
      preamble: (order.preamble || '').replace(/&/g, '&nbsp;')
    }
    await HR.reportUtils.getOrderPrintConfig(result, order.subOrganization ? order.masterOrganizationID : order.organizationID)
    const boldFormatBegin = result.normalFullName ? '' : '<b>'
    const boldFormatEnd = result.normalFullName ? '' : '</b>'
    let orderWord = UB.i18n('Направити')
    orderWord = result.smallOrderWord ? orderWord : orderWord.toUpperCase()

    const orgGen = order.subOrganization && (order['organizationID.nameGen'] || order['organizationID.name'])
      ? ' ' + (order['organizationID.nameGen'] || order['organizationID.name']) : ''

    result.responsiblesInfo = await HR.reportUtils.getResponsiblesForOrder(order)

    let orderDet = await HR.reportUtils.getEmpOrderDet(ID, orderDate, ['isGroup', 'positionID.positionType', 'departmentID'], [['empOrderType', '=', 'TRAINING']], true)
    const trainingDet = await UB.Repository('hr_empOrderTrainingDet')
      .attrs(['ID', 'dateFrom', 'dateTo', 'dayCount', 'destOrganizationID.nameGen', 'destOrganizationName', 'cityName', 'countryID.name',
        'reason', 'organizationID.nameGen', 'organizationID.name', 'isInsideCountry', 'address', 'dictProfCompDevelopFormID.name',
        'dictSpecialityID.name', 'dictTrainingKindID.orderText', 'lectureCycle',
        'dictTrainingTopicName', 'dictTrainingTopicID.name', 'cityID', 'cityID.name', 'cityID.cityTypeID.code', 'isContinueWork'])
      .where('orderID', '=', ID)
      .orderBy('itemIdx')
      .selectAsObject()
    const actDet = await UB.Repository('hr_empOrderActingDet')
      .attrs(['ID', 'paraID', 'dateFrom', 'dateTo', 'employeePositionID', 'condition', 'payForExtraLoad', 'employeeNumberID.tabNum',
        'payElID.calcAlgorithm', 'positionID.positionType', 'employeeID', 'employeeID.accusativeName', 'employeeID.shortFIO', 'employeeID.fullFIO'])
      .where('orderID', '=', ID)
      .orderBy('itemIdx')
      .selectAsObject()
    await HR.reportUtils.checkEmployeeChange(order.orderDate, ['fullFIO', 'accusativeName', 'shortFIO'], actDet)

    const taskDet = await HR.reportUtils.getTask(ID, order.orderDate || order.entryDate, order.showTabNum, result.notUseMiddleNameInOrder)

    const employeePositionIDs = actDet && actDet.length > 0 ? _.uniq(actDet.map(el => el.employeePositionID)) : []
    const useSexType = AC.settings.get('hrUseSexTypeInOrders', order.masterOrganizationID || order.organizationID) === true
    let employeePosition = employeePositionIDs && employeePositionIDs.length > 0
      ? await HR.reportUtils.getPromiseEmployeePositionForOrders(employeePositionIDs, order.masterOrganizationID || order.organizationID, order.organizationID, order.orderDate || order.entryDate, ['Nom', 'Gen', 'Dat', 'Acc'], useSexType)
      : []
    employeePosition = employeePosition && employeePosition.length > 0 ? _.groupBy(employeePosition, 'ID') : []

    let index = 1
    result.isPrintAddon = order.isAppendix

    for (let i = 0; i < orderDet.length; i++) {
      const item = orderDet[i]
      if (item.isGroup) {
        const trainingDetItem = _.find(trainingDet, { ID: item.ID })
        if (trainingDetItem) {
          trainingDetItem.dictTrainingTopicName = trainingDetItem['dictTrainingTopicName'] || trainingDetItem['dictTrainingTopicID.name'] || ''
          trainingDetItem['destOrganizationName'] = trainingDetItem['destOrganizationID.nameGen'] || trainingDetItem['destOrganizationName'] || ''

          let cityName = trainingDetItem['cityID.name'] || trainingDetItem['cityName'] || ''
          cityName = (cityName.length && trainingDetItem['cityID'] && trainingDetItem['cityID.cityTypeID.code'] ? trainingDetItem['cityID.cityTypeID.code'] : '') + cityName
          let destPoint = UB.i18n(' до ') + trainingDetItem['destOrganizationName']
          if (cityName || trainingDetItem['address']) {
            destPoint = destPoint + ' (' + cityName + (cityName.length && trainingDetItem['address'] && trainingDetItem['address'].length ? ', ' : '') + (trainingDetItem['address'] || '') + ')'
          }

          destPoint += !trainingDetItem.isInsideCountry && trainingDetItem['countryID.name'] ? ` ${trainingDetItem['countryID.name']}` : ''
          let orgNameGen = order['organizationID.nameGen'] || order['organizationID.name']
          orgNameGen = orgNameGen ? ' ' + orgNameGen : ''

          trainingDetItem.isContinueWork = trainingDetItem.isContinueWork ? UB.i18n(' без відриву від роботи') : ''

          const dateFrom = AC.dateService.formatDate(trainingDetItem['dateFrom'])
          const dateTo = trainingDetItem['dateTo'] ? UB.i18n(' по&nbsp;') + AC.dateService.formatDate(trainingDetItem['dateTo']) : ''

          let info = `${trainingDetItem.dictTrainingTopicName ? ' «' + trainingDetItem.dictTrainingTopicName + '»' : ''}` +
            // `${trainingDetItem['dictSpecialityID.name'] ? ' ' + trainingDetItem['dictSpecialityID.name'] : ''}` +
            `${trainingDetItem['lectureCycle'] ? ' ' + trainingDetItem['lectureCycle'] : ''}` +
            `${trainingDetItem['dictProfCompDevelopFormID.name'] || trainingDetItem['dictTrainingKindID.orderText'] ? ' (' : ''}` +
            `${trainingDetItem['dictTrainingKindID.orderText'] ? trainingDetItem['dictTrainingKindID.orderText'] : ''}` +
            `${trainingDetItem['dictProfCompDevelopFormID.name'] && trainingDetItem['dictTrainingKindID.orderText'] ? ', ' : ''}` +
            `${trainingDetItem['dictProfCompDevelopFormID.name'] ? trainingDetItem['dictProfCompDevelopFormID.name'] : ''}` +
            `${trainingDetItem['dictProfCompDevelopFormID.name'] || trainingDetItem['dictTrainingKindID.orderText'] ? ')' : ''}`
          info = (info.length ? UB.i18n(' на цикл') : '') + info
          info += trainingDetItem.isContinueWork
          const itemReason = trainingDetItem.reason ? UB.i18n(`Підстава: {0}.`, trainingDetItem.reason) : ''

          const groupItems = orderDet.filter(itm => itm.paraID === item.ID && itm.ID !== item.ID)
          const groupLen = groupItems.length
          if (groupLen) {
            let singleEmpPosName = ''
            let repTrainingItem = result.isPrintAddon ? _.find(result.orderDet, { destPoint: destPoint + info }) : undefined
            if (!repTrainingItem) {
              repTrainingItem = {
                itemIdxTxt: (index++) + '. ',
                items: [],
                destPoint: destPoint + info,
                countItems: 0,
                itemReason: itemReason,
                new: true
              }
            } else {
              repTrainingItem.new = false
            }
            const addons = result.isPrintAddon ? {
              text: `${UB.i18n('з')}&nbsp;${dateFrom}${dateTo} ${trainingDetItem.dictTrainingTopicName ? `${UB.i18n('на тему')}: «` + trainingDetItem.dictTrainingTopicName + '»' : ''}`,
              // text: `з&nbsp;${dateFrom}${dateTo}${trainingDetItem.isContinueWork} ${trainingDetItem.dictTrainingTopicName ? 'на тему: «' + trainingDetItem.dictTrainingTopicName + '»' : ''}`,
              items: []
            } : []

            let positionType = true //  всі посади Працівників мають тип "Держслужбовець"
            for (let j = 0; j < groupLen; j++) {
              const groupItem = groupItems[j]
              const toOrder = orderExtract && orderExtract.ID
                ? ((orderExtract.departmentID ? orderExtract.departmentID === groupItem.departmentID : true) && (orderExtract.employeePositionID ? orderExtract.employeePositionID === groupItem.employeePositionID : true))
                : true

              positionType = groupItem['positionID.positionType'] === '1' && positionType
              result.positionType = groupItem['positionID.positionType'] === '1' && (result.positionType || true)
              let posInfo = HR.reportUtils.getInfoItemOrderInCase(groupItem, result.isPrintAddon ? 'nom' : 'acc', !result.isPrintAddon, result.notUseMiddleNameInOrder)
              const tabNum = showTabNum && groupItem['employeeNumberID.tabNum'] ? UB.i18n(`(Таб. №&nbsp;{0})`, groupItem['employeeNumberID.tabNum']) : ''
              if (result.isPrintAddon) {
                addons.items.push({
                  toOrder: toOrder,
                  index: addons.items.length + 1,
                  empName: posInfo.empName + (tabNum ? ' ' + tabNum : ''),
                  empID: groupItem.employeePositionID,
                  posName: posInfo.posName ? HR.nameCase.cap(posInfo.posName) + orgGen : '',
                  acting: []
                })
              }
              repTrainingItem.countItems += toOrder ? 1 : 0
              if (groupLen === 1) {
                singleEmpPosName = `${boldFormatBegin}${posInfo.empName}${tabNum ? ' ' + boldFormatEnd + tabNum : boldFormatEnd}${posInfo && posInfo.posName ? ', ' + posInfo.posName + orgGen + ',' : ''}`
                posInfo = HR.reportUtils.getInfoItemOrderInCase(groupItem, 'gen', !result.isPrintAddon, result.notUseMiddleNameInOrder)
                result.titleName = HR.reportUtils.formatShortNameInOrder(posInfo.empName || '', { notUseMiddleNameInOrder: result.notUseMiddleNameInOrder })
              } else {
                if (!result.isPrintAddon) {
                  const endChar = (j + 1 === groupLen) ? '.' : ';'
                  repTrainingItem.items.push({
                    toOrder: toOrder,
                    text: `${boldFormatBegin}${posInfo.empName}${tabNum ? ' ' + boldFormatEnd + tabNum : boldFormatEnd}${posInfo && posInfo.posName ? ', ' + posInfo.posName + orgGen : ''}${endChar}`
                  })
                }
              }
            }
            /*
            if (trainingDetItem.reason && repTrainingItem.items && repTrainingItem.items.length > 1 && !result.isPrintAddon) {
              const toOrder = !!repTrainingItem.items.filter(o => o.toOrder).length
              repTrainingItem.items.push({ toOrder: toOrder, text: `Підстава: ${trainingDetItem.reason}` })
            }
             */

            let accRes
            for (let j = 0; j < groupLen; j++) {
              const missionGroupItem = groupItems[j]
              const toOrder = orderExtract && orderExtract.ID
                ? ((orderExtract.departmentID ? orderExtract.departmentID === missionGroupItem.departmentID : true) && (orderExtract.employeePositionID ? orderExtract.employeePositionID === missionGroupItem.employeePositionID : true))
                : true
              accRes = await me.addActing(missionGroupItem, actDet, result.isPrintAddon ? addons.items : repTrainingItem.items, orderDate, 0, j === groupLen - 1, employeePosition, result.isPrintAddon, index, orgGen, toOrder, showTabNum, result.notUseMiddleNameInOrder)
              if (accRes.length > 0 && !result.isPrintAddon) index++
              if (accRes.length) {
                result.positionTypeActing = accRes.positionType && (result.positionTypeActing || true)
              }
            }

            if (result.isPrintAddon) {
              addons.items.forEach(el => {
                if (!el.acting.length) {
                  el.acting.push({ text: '-' })
                }
              })
              addons.items = addons.items.filter(el => el.toOrder)
              if (addons.items.length) {
                result.addons.push(addons)
              }
            }

            if (repTrainingItem.new) {
              repTrainingItem.positionType = positionType
              if (groupLen === 1) {
                if (result.isPrintAddon) {
                  repTrainingItem.text = UB.i18n(`{4} на навчання{0}{1} {2} {3} згідно з додатком до наказу.`, destPoint, info, positionType ? UB.i18n('державного службовця') : UB.i18n('працівника'), orgNameGen, orderWord)
                  repTrainingItem.itemReason = itemReason

                } else {
                  repTrainingItem.text = `${orderWord} ${singleEmpPosName} на період з&nbsp;${dateFrom}${dateTo} на навчання${destPoint}${info}.`
                  repTrainingItem.itemReason = itemReason
                }
              } else {
                if (result.isPrintAddon) {
                  repTrainingItem.text = UB.i18n(`{4} на навчання{0}{1} {2} {3} за списком визначеним додатком до наказу.`, destPoint, info, positionType ? UB.i18n('державних службовців') : UB.i18n('працівників'), orgNameGen, orderWord)
                  repTrainingItem.itemReason = itemReason
                } else {
                  repTrainingItem.text = UB.i18n(`{3} на період з&nbsp;{0}{1} на навчання{2}`, dateFrom, dateTo, destPoint, orderWord) +
                    `${info} ${positionType ? UB.i18n('державних службовців') : UB.i18n('працівників')} ${orgNameGen}:`
                }
              }
              result.orderDet.push(repTrainingItem)
            } else {
              if (repTrainingItem.positionType && !positionType) { // если появились не держслужбовці, то надо поменять текст.
                repTrainingItem.positionType = positionType
                if (result.isPrintAddon) {
                  repTrainingItem.text = UB.i18n(`{3} на навчання{0} {1} {2} за списком визначеним додатком до наказу.`, destPoint, positionType ? UB.i18n('державних службовців') : UB.i18n('працівників'), orgNameGen, orderWord)
                  repTrainingItem.itemReason = itemReason
                } else {
                  repTrainingItem.text = UB.i18n(`{3} на навчання{0} {1} {2}:`, destPoint, positionType ? UB.i18n('державних службовців') : UB.i18n('працівників'), orgNameGen, orderWord)
                }
              }
            }
          }
        }
      }
    }
    if (result.isPrintAddon && result.orderDet.length > 0 && actDet.length > 0) {
      result.orderDet.push({
        countItems: 1,
        text: (index++) + UB.i18n('. Виконання обов’язків окремих ') + (result.positionType ? UB.i18n('державних службовців') : UB.i18n('працівників')) + UB.i18n(' покласти на осіб, визначених у додатку.')
      })
    }

    if (result.orderDet.length === 1 && actDet.length === 0 && (!taskDet.tasks || taskDet.tasks.length === 0)) {
      result.orderDet[0].itemIdxTxt = ''
    }
    if (result.isPrintAddon) {
      result.orderDet = result.orderDet.filter(el => el.countItems > 0)
    } else {
      for (let i = 0; i < result.orderDet.length; i++) {
        result.orderDet[i].items = result.orderDet[i].items.filter(el => el.toOrder)
      }
      result.orderDet = result.orderDet.filter(el => el.items.length || el.countItems > 0)
    }

    result.titleName = trainingDet.length > 1 ? UB.i18n('працівників') : result.titleName
    result.titleOrder = `${result.titleOrder || ''}${result.titleOrder && result.titleName ? '<br/>' : ''}${result.titleName || ''}`

    result.tasks = taskDet.tasks.map(e => ({
      task: `${index === 1 && taskDet.tasks.length === 1 ? '' : index++ + '. '}${e.task}${e['positionName'] ? ` ${e['positionName']}` : ''}${e['employeeName'] ? ` ${e['employeeName']}` : ''}.`
    }))
    result.positionType = result.positionType ? UB.i18n('Список державних службовців, що направлені на навчання') : UB.i18n('Список працівників, що направлені на навчання')
    result.positionTypeActing = result.positionTypeActing ? UB.i18n('державного службовця') : UB.i18n('працівника')
    return result
  },

  addActing: async function (orderItem, actDet, items, orderDate, groupLen, isLastPar, positions, isPrintAddon, index, orgGen, toOrder, showTabNum, notUseMiddleNameInOrder) {
    const me = this
    const actDetItems = actDet.filter(itm => itm.paraID === orderItem.ID)
    const actDetItemsLen = actDetItems.length
    const positionTypeEmp = orderItem['employeePositionID.positionID.positionType'] === '1'
    let positionType = true

    if (actDetItemsLen > 0) {
      let fld = isPrintAddon ? 'employeeID.nomName' : 'employeeID.genName'
      const actingEmpName = HR.reportUtils.formatShortNameInOrder(orderItem[fld] || orderItem['employeeID.fullFIO'], { notUseMiddleNameInOrder })

      fld = isPrintAddon ? 'employeePositionID.positionID.fullNameNom' : 'employeePositionID.positionID.fullNameGen'
      const fld2 = isPrintAddon ? 'employeePositionID.positionID.nameNom' : 'employeePositionID.positionID.nameGen'
      const actingPosName = (orderItem[fld] || orderItem[fld2] || orderItem['employeePositionID.positionID.name']
        ? HR.reportUtils.makePositionName(orderItem[fld] || orderItem[fld2] || orderItem['employeePositionID.positionID.name'], orderItem['employeePositionID.positionID.isOrgBoss'])
        : '____________________') + orgGen

      if (!groupLen && !isPrintAddon && (actDetItemsLen > 1 || (actDetItemsLen === 1 && actDetItems[0].payForExtraLoad))) {
        items.push({
          toOrder: toOrder,
          text: (index++) + UB.i18n(`. На період навчання {0}:`, actingEmpName)
        })
      }
      for (let j = 0; j < actDetItemsLen; j++) {
        const actDetItem = actDetItems[j]
        let respEmpName = '____________________'
        let respPosName = ''

        if (positions[actDetItem.employeePositionID]) {
          const posInfo = HR.reportUtils.getInfoItemOrderInCase(positions[actDetItem.employeePositionID][0], isPrintAddon ? 'nom' : 'acc', !isPrintAddon, notUseMiddleNameInOrder, '')
          respPosName = posInfo.posName || ''
        }

        respEmpName = isPrintAddon
          ? HR.reportUtils.formatShortNameInOrder(actDetItem['employeeID.shortFIO'] || '', { notUseMiddleNameInOrder })
          : HR.reportUtils.formatShortNameInOrder(actDetItem['employeeID.accusativeName'] || actDetItem['employeeID.shortFIO'] || '', { notUseMiddleNameInOrder })
        positionType = actDetItem['positionID.positionType'] === '1' && positionType
        respPosName = respPosName ? ', ' + respPosName + orgGen : respPosName

        const condition = actDetItem['condition'] ? ' ' + actDetItem['condition'] : ''

        const dateTo = !condition.length && actDetItem['dateTo'] ? UB.i18n(' по&nbsp;') + AC.dateService.formatDate(actDetItem['dateTo']) : ''
        const dateFrom = actDetItem['dateFrom'] ? `${!condition.length && !dateTo.length ? UB.i18n('на') : UB.i18n('з')}&nbsp;${AC.dateService.formatDate(actDetItem['dateFrom'])}` : ''
        respEmpName += showTabNum && actDetItem['employeeNumberID.tabNum'] ? ' ' + UB.i18n(`(Таб. №&nbsp;{0})`, actDetItem['employeeNumberID.tabNum']) : ''

        if (isPrintAddon) {
          const el = _.find(items, { empID: orderItem.employeePositionID })
          const endPoint = j === actDetItemsLen - 1 ? '.' : ';<br />'
          if (el) {
            el.acting.push({
              toOrder: toOrder,
              text: `${respEmpName}${respPosName}${dateFrom || dateTo || condition ? ' (' : ''}${dateFrom}${dateTo}${condition}${dateFrom || dateTo || condition ? ')' : ''}${endPoint}`
            })
          }
        } else {
          // let endPoint = isLastPar && j === actDetItemsLen - 1 && !actDetItem.payForExtraLoad ? '.' : ';'
          let endPoint = j === actDetItemsLen - 1 && !actDetItem.payForExtraLoad ? '.' : ';'
          if (actDetItemsLen === 1 && !actDetItem.payForExtraLoad) {
            items.push({
              toOrder: toOrder,
              text: (index++) + UB.i18n(`. На період навчання {0} виконання обов'язків {1} покласти на {2}{3} {4}{5}{6}{7}`, actingEmpName, actingPosName, respEmpName, respPosName, dateFrom, dateTo, condition, endPoint)
            })
          } else {
            items.push({
              toOrder: toOrder,
              text: UB.i18n(`- виконання обов’язків {0} покласти на {1}{2} {3}{4}{5}{6}`, actingPosName, respEmpName, respPosName, dateFrom, dateTo, condition, endPoint)
            })
            if (actDetItem.payForExtraLoad || (actDetItem['payElID.calcAlgorithm'] && actDetItem['payElID.calcAlgorithm'] === '1')) {
              endPoint = j === actDetItems.length - 1 ? '.' : ';'
              const positionTypeAct = actDetItem['positionID.positionType'] === '1'
              items.push({
                toOrder: toOrder,
                itemIdxTxt: '',
                text: UB.i18n(`- встановити {0} `, HR.reportUtils.formatShortNameInOrder(actDetItem['employeeID.datName'] || actDetItem['employeeID.fullFIO'], { notUseMiddleNameInOrder })) +
                    UB.i18n(`виплату за додаткове навантаження у зв’язку з виконанням обов’язків тимчасово відсутнього {0} `, positionTypeEmp ? UB.i18n('державного службовця') : UB.i18n('працівника')) +
                    me.getExtraLoadInfo(actDetItem.payForExtraLoad, actDetItem['payElID.calcAlgorithm'], positionTypeAct, positionTypeEmp, endPoint)
              })
            }
          }
        }
      }
    }
    return {
      length: actDetItemsLen,
      positionType: positionType
    }
  },

  getExtraLoadInfo: function (payForExtraLoad, calcAlgorithm, positionTypeAct, positionType, end) {
    if (calcAlgorithm === '3') {
      return UB.i18n(`у розмірі {0} відсотків посадового окладу {1}, який заміщує{2}`, payForExtraLoad, positionTypeAct ? 'державного службовця' : 'працівника', end)
    } else if (calcAlgorithm === '1') {
      return UB.i18n(`у розмірі різниці заробітку відсутнього і заміщаючого працівників{0}`, end)
    } else {
      return UB.i18n(`у розмірі {0} відсотків посадового окладу тимчасово відсутнього {1}{2}`, payForExtraLoad, positionType ? 'державного службовця' : 'працівника', end)
    }
  }
}
