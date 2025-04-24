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
      printDocumentView: printDocumentView,
      responsiblesInfo: responsiblesInfo,
      titleOrderParams: printDocumentView === 'APPOINTMENT' ? 'padding-left: 34px; ' : '',
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
      showOrder: printDocumentView !== 'APPOINTMENT',
			mission: [],
      type: { mission_training: false, mission: false },
      emblem: HR.reportUtils.getEmblem(),
      organizationNameGen:  order['organizationID.nameGen'] || order['organizationID.name'] || '',
      titleOrder: (order.titleOrder || '').replace(/&/g, '&nbsp;'),
      preamble: (order.preamble || '').replace(/&/g, '&nbsp;'),
      generalOrg: AC.settings.get('hrFuncOrgType', order.masterOrganizationID || order.organizationID) === '1',
			positionType: null
    }

    await HR.reportUtils.getOrderPrintConfig(result, order.subOrganization ? order.masterOrganizationID : order.organizationID)
    const orgGen = order.subOrganization && (order['organizationID.nameGen'] || order['organizationID.name'])
      ? ' ' + (order['organizationID.nameGen'] || order['organizationID.name']) : ''
    const boldFormatBegin = result.normalFullName ? '' : '<b>'
    const boldFormatEnd = result.normalFullName ? '' : '</b>'

    const orderDet = await HR.reportUtils.getEmpOrderDet(ID, order.orderDate || order.entryDate, ['isGroup', 'departmentID'], [['empOrderType', 'in', ['CHANGEMISSION', 'CANCELMISSION']]], true)

    const changeMissionDet = await UB.Repository('hr_empOrderChangemissionDet')
      .attrs(['ID', 'employeePositionID', 'missionOrderDetID', 'dateFrom', 'dateTo', 'dayCount', 'reason'])
      .where('orderID', '=', ID)
      .orderBy('itemIdx')
      .selectAsObject()

    const cancelMissionDet = await UB.Repository('hr_empOrderCancelmissionDet')
      .attrs(['ID', 'employeePositionID', 'missionOrderDetID', 'reason'])
      .where('orderID', '=', ID)
      .orderBy('itemIdx')
      .selectAsObject()

    const cntDet = changeMissionDet.length + cancelMissionDet.length

    const missionDet = await UB.Repository('hr_empOrderMissionDet')
      .attrs(['ID', 'empOrderType', 'orderID.description', 'dateFrom', 'dateTo', 'dayCount', 'destOrganizationName', 'cityName', 'purpose', 'reason', 'isNeedReport', 'phrase',
        'destOrganizationID.fullNameGen', 'destOrganizationID.fullName', 'isInsideCountry', 'countryID.name',
        'dictSpecialityID.name', 'dictTrainingKindID.name',
        'dictTrainingTopicName', 'dictTrainingTopicID.name', 'dictProfCompDevelopFormID.name',
        'cityID', 'cityID.name', 'cityID.cityTypeID.code', 'dictSpecialtyID.name',
        'cityID.parentAdminUnitID.adminUnitType', 'cityID.parentAdminUnitID.name',
        'cityID.parentAdminUnitID.parentAdminUnitID.adminUnitType', 'cityID.parentAdminUnitID.parentAdminUnitID.name'])
      .exists(UB.Repository('hr_empOrderChangemissionDet')
        .correlation('missionOrderDetID', 'ID')
        .where('mi_deleteDate', '>=', '#maxdate')
        .where('orderID', '=', ID), 'ex1')
      .exists(UB.Repository('hr_empOrderCancelmissionDet')
        .correlation('missionOrderDetID', 'ID')
        .where('mi_deleteDate', '>=', '#maxdate')
        .where('orderID', '=', ID), 'ex2')
      .logic('([ex1] or [ex2])')
      .selectAsObject()

    const actDet = await UB.Repository('hr_empOrderActingDet')
      .attrs(['ID', 'paraID', 'dateFrom', 'dateTo', 'employeePositionID', 'condition', 'payForExtraLoad', 'employeeNumberID.tabNum',
        'employeeID', 'employeeID.accusativeName', 'employeeID.datName', 'employeeID.shortFIO', 'employeeID.fullFIO',
        'payElID', 'payElID.calcAlgorithm', 'positionID.positionType'])
      .where('orderID', '=', ID)
      .orderBy('itemIdx')
      .selectAsObject()
    await HR.reportUtils.checkEmployeeChange(order.orderDate, ['fullFIO', 'accusativeName', 'datName', 'shortFIO'], actDet)

    const priorActDet = await UB.Repository('hr_empOrderActingDet')
      .attrs(['ID', 'paraID.paraID', 'paraID.employeePositionID', 'dateFrom', 'dateTo', 'employeePositionID', 'condition', 'payForExtraLoad', 'employeeNumberID.tabNum',
        'employeeID', 'employeeID.accusativeName', 'employeeID.datName', 'employeeID.shortFIO', 'employeeID.fullFIO',
				'payElID', 'payElID.calcAlgorithm', 'positionID.positionType'])
      .exists(UB.Repository('hr_empOrderChangemissionDet')
        .correlation('missionOrderID', 'orderID')
        .where('mi_deleteDate', '>=', '#maxdate')
        .where('orderID', '=', ID), 'ex1')
      .exists(UB.Repository('hr_empOrderCancelmissionDet')
        .correlation('missionOrderID', 'orderID')
        .where('mi_deleteDate', '>=', '#maxdate')
        .where('orderID', '=', ID), 'ex2')
      .logic('([ex1] or [ex2])')
      .orderBy('itemIdx')
      .selectAsObject({
				'paraID.paraID': 'paraID'
			})
    await HR.reportUtils.checkEmployeeChange(order.orderDate, ['fullFIO', 'accusativeName', 'datName', 'shortFIO'], priorActDet)

    const taskDet = await HR.reportUtils.getTask(ID, order.orderDate || order.entryDate, result.generalOrg ? false : order.showTabNum, result.notUseMiddleNameInOrder)

    const employeePositionIDs = actDet && actDet.length > 0 ? _.uniq(actDet.map(el => el.employeePositionID)) : []
    employeePositionIDs.push(...priorActDet && priorActDet.length > 0 ? _.uniq(priorActDet.map(el => el.employeePositionID)) : [])

    const useSexType = AC.settings.get('hrUseSexTypeInOrders', order.masterOrganizationID || order.organizationID) === true
    let employeePosition = employeePositionIDs && employeePositionIDs.length > 0
      ? await HR.reportUtils.getPromiseEmployeePositionForOrders(employeePositionIDs, order.masterOrganizationID || order.organizationID, order.organizationID, order.orderDate || order.entryDate, ['Gen', 'Acc'], useSexType)
      : []
    employeePosition = employeePosition && employeePosition.length > 0 ? _.groupBy(employeePosition, 'ID') : []


    let employeeTitle = ''

		function getMissionInfo(priorMissionDetItem, training, cancel) {
    	let text = ''
			if (priorMissionDetItem) {
				let cityName = priorMissionDetItem['cityID.name'] || priorMissionDetItem['cityName'] || ''
				cityName = (cityName.length && priorMissionDetItem['cityID'] && priorMissionDetItem['cityID.cityTypeID.code'] ? priorMissionDetItem['cityID.cityTypeID.code'] : '') + cityName
				if (cityName && priorMissionDetItem.isInsideCountry) {
					if (priorMissionDetItem['cityID.parentAdminUnitID.name'] && priorMissionDetItem['cityID.parentAdminUnitID.adminUnitType'] !== 'COUNTRY') {
						cityName += ', ' + priorMissionDetItem['cityID.parentAdminUnitID.name']
						if (priorMissionDetItem['cityID.parentAdminUnitID.parentAdminUnitID.name'] && priorMissionDetItem['cityID.parentAdminUnitID.parentAdminUnitID.adminUnitType'] !== 'COUNTRY') {
							cityName += ', ' + priorMissionDetItem['cityID.parentAdminUnitID.parentAdminUnitID.name']
						}
					}
				}

				let destOrg = priorMissionDetItem['destOrganizationID.fullName'] || priorMissionDetItem['destOrganizationName'] || ''
				destOrg = (!priorMissionDetItem.isInsideCountry && priorMissionDetItem['countryID.name'] ? priorMissionDetItem['countryID.name'] + (destOrg.length ? ', ' : '') : '') + destOrg
				destOrg = destOrg ? `(${destOrg})` : ''

				let destPoint = cityName ? UB.i18n(` до {0}`, cityName) : ''
				if (destOrg) {
					destPoint += destPoint ? ` ${destOrg}` : UB.i18n(` до {0}`, destOrg)
				}
				text += destPoint

				if (training) {
					priorMissionDetItem.dictTrainingTopicName = priorMissionDetItem['dictTrainingTopicName'] || priorMissionDetItem['dictTrainingTopicID.name'] || ''

					if (priorMissionDetItem['dictSpecialtyID.name']) {
						priorMissionDetItem.dictTrainingTopicName += (priorMissionDetItem.dictTrainingTopicName ? ' ' : '') + priorMissionDetItem['dictSpecialtyID.name']
					}

					priorMissionDetItem['dictProfCompDevelopFormID.name'] = priorMissionDetItem['dictProfCompDevelopFormID.name'] || ''
					priorMissionDetItem.dictTrainingTopicName += (priorMissionDetItem['dictProfCompDevelopFormID.name'] && priorMissionDetItem.dictTrainingTopicName ? ' ' : '') + (priorMissionDetItem['dictProfCompDevelopFormID.name'] ? `(${priorMissionDetItem['dictProfCompDevelopFormID.name']})` : '')

					if (result.generalOrgForText && priorMissionDetItem['dictTrainingKindID.name']) {
						priorMissionDetItem.dictTrainingTopicName = UB.i18n(`на {0}`, priorMissionDetItem['dictTrainingKindID.name'])
					}
				} else {
					priorMissionDetItem.dictTrainingTopicName = ''
				}

				const day = AC.dateService.plural(UB.i18n('календарний день_календарних дні_календарних днів'), priorMissionDetItem['dayCount'])
				const dateFrom = AC.dateService.formatDate(priorMissionDetItem['dateFrom'])
				const dateTo = priorMissionDetItem['dateTo'] ? UB.i18n(' по&nbsp;') + AC.dateService.formatDate(priorMissionDetItem['dateTo']) : ''
				let purpose = priorMissionDetItem['purpose'] ? priorMissionDetItem['purpose'] : ''
				if (training && priorMissionDetItem.dictTrainingTopicName.length) {
					purpose += (purpose.length ? ' ' : '') + priorMissionDetItem.dictTrainingTopicName
				}
				purpose = (purpose ? ' ' : '') + (priorMissionDetItem['purpose'] ? UB.i18n('з метою ') : '') + purpose
				const specialty = training && priorMissionDetItem['dictSpecialityID.name'] ? UB.i18n(` зі спеціальності {0}`, priorMissionDetItem['dictSpecialityID.name']) : ''

				text += cancel
					? UB.i18n(` строком на {0}&nbsp;{1} з&nbsp;{2}{3}{4}{5}`, priorMissionDetItem['dayCount'], day, dateFrom, dateTo, purpose, specialty)
					: UB.i18n(` у формулюванні "строком на {0}&nbsp;{1}, з&nbsp;{2}{3}"`, priorMissionDetItem['dayCount'], day, dateFrom, dateTo)
			}
			return text
		}

    let itemIdx = 0
    for (let i = 0; i < orderDet.length; i++) {
      const item = orderDet[i]
      let orderDetItem = cancelMissionDet.find(o => o.ID === item.ID)
			if (!orderDetItem) {
				orderDetItem = changeMissionDet.find(o => o.ID === item.ID)
			}

      if (orderDetItem) {
        _.merge(orderDetItem, item || [])
        let orderWord = orderDetItem.empOrderType === 'CANCELMISSION' ? UB.i18n('Скасувати') : UB.i18n('Змінити')
        orderWord = result.smallOrderWord ? orderWord : orderWord.toUpperCase()

				result.positionType = orderDetItem['employeePositionID.positionID.positionType'] === '1' && (result.positionType || true)
        const toOrder = orderExtract && orderExtract.ID
          ? ((orderExtract.departmentID ? orderExtract.departmentID === orderDetItem.departmentID : true) && (orderExtract.employeePositionID ? orderExtract.employeePositionID === orderDetItem.employeePositionID : true))
          : true

        const priorMissionDetItem = missionDet.find(o => o.ID === orderDetItem.missionOrderDetID)
        const training = priorMissionDetItem && priorMissionDetItem.empOrderType === 'MISSION_TRAINING'
        result.type.mission_training = training ? true : result.type.mission_training
        result.type.mission = priorMissionDetItem && priorMissionDetItem.empOrderType === 'MISSION' ? true : result.type.mission

        const posInfo = HR.reportUtils.getInfoItemOrderInCase(orderDetItem, 'dat', true, result.notUseMiddleNameInOrder)
        const tabNum = showTabNum && item['employeeNumberID.tabNum'] ? UB.i18n(`(Таб. №&nbsp;{0})`, item['employeeNumberID.tabNum']) : ''

        orderDetItem.priorMissionDetDescription = priorMissionDetItem ? ' ' + priorMissionDetItem['orderID.description'] : ''
        let text = orderWord + orderDetItem.priorMissionDetDescription
        text += ` ${UB.i18n(' в частині надання відрядження')} ${boldFormatBegin + (posInfo.empName || '') + boldFormatEnd}${ tabNum ? ' ' + tabNum : ''}${posInfo && posInfo.posName ? ', ' + posInfo.posName + orgGen : ''}`
				text += getMissionInfo(priorMissionDetItem, training, orderDetItem.empOrderType === 'CANCELMISSION')

				if (orderDetItem.empOrderType === 'CHANGEMISSION') {
					const day = AC.dateService.plural(UB.i18n('календарний день_календарних дні_календарних днів'), orderDetItem['dayCount'])
					const dateFrom = AC.dateService.formatDate(orderDetItem['dateFrom'])
					const dateTo = orderDetItem['dateTo'] ? UB.i18n(' по&nbsp;') + AC.dateService.formatDate(orderDetItem['dateTo']) : ''
					text += UB.i18n(` на формулювання "строком на {0}&nbsp;{1}, з&nbsp;{2}{3}"`, orderDetItem['dayCount'], day, dateFrom, dateTo)
				}

        result.mission.push({
          toOrder: toOrder,
          itemIdxTxt: ++itemIdx + '. ',
          text: text + '.',
					twoColumns: result.generalOrg
        })
				if (orderDetItem.reason) {
					result.mission.push({
						toOrder: toOrder,
						itemIdxTxt: '',
						noIndent: 1,
						text: UB.i18n(`Підстава: {0}.`, orderDetItem.reason),
						twoColumns: 0
					})
				}
				orderWord = UB.i18n('Скасувати')
				orderWord = result.smallOrderWord ? orderWord : orderWord.toUpperCase()
				const prActItems = priorMissionDetItem ? priorActDet.filter(el => el['paraID.employeePositionID'] === orderDetItem.employeePositionID	&& el.paraID === priorMissionDetItem.ID) : []
				const actItems = orderDetItem.empOrderType === 'CHANGEMISSION' ? actDet.filter(a => a.paraID === orderDetItem.ID) : []

				if (prActItems.length && !actItems.length) {
					me.cancelActing(orderWord, orderDetItem, prActItems, result.mission, employeePosition, itemIdx, orgGen, toOrder, result.generalOrg, showTabNum, result.notUseMiddleNameInOrder)
				}

				if (orderDetItem.empOrderType === 'CHANGEMISSION' && actItems.length) {

					const isOrgBoss = orderDetItem['employeePositionID.positionID.isOrgBoss']
					if (!prActItems.length) {
						me.addActing(true, orderDetItem, actItems, result.mission, employeePosition, training, itemIdx, result.generalOrg, orgGen, toOrder, isOrgBoss, showTabNum, result.notUseMiddleNameInOrder)
					} else {

						orderWord = UB.i18n('Змінити')
						orderWord = result.smallOrderWord ? orderWord : orderWord.toUpperCase()

						let haveChange = false
						if (actItems.length !== prActItems.length) {
							haveChange = true
						} else {
							actItems.forEach(act => {
								if (haveChange) return
								const prAct = prActItems.find(o => o.employeePositionID === act.employeePositionID)
								if (!prAct) {
									haveChange = true
								} else {
									if (AC.dateService.dateDiff(act.dateFrom, prAct.dateFrom) || AC.dateService.dateDiff(act.dateTo, prAct.dateTo) ||
										act.condition !== prAct.condition || act.payForExtraLoad !== prAct.payForExtraLoad || act.payElID !== prAct.payElID) {
										haveChange = true
									}
								}
							})
						}
						if (haveChange) {
							const chanesActing1 = []
							const chanesActing2 = []

							me.addActing(false, orderDetItem, prActItems, chanesActing1, employeePosition, training, '', result.generalOrg, orgGen, toOrder, isOrgBoss, showTabNum, result.notUseMiddleNameInOrder)
							me.addActing(false, orderDetItem, actItems, chanesActing2, employeePosition, training, '', result.generalOrg, orgGen, toOrder, isOrgBoss, showTabNum, result.notUseMiddleNameInOrder)

							if (chanesActing1.length && chanesActing2.length) {
								chanesActing2[chanesActing2.length - 1].text += '.'

								result.mission.push({
									toOrder: toOrder,
									itemIdxTxt: ++itemIdx + '. ',
									text: orderWord + orderDetItem.priorMissionDetDescription + ' ' + UB.i18n(`в частині встановлення  виконання обов'язків у формулюванні`) +
										(chanesActing1.length === 1 ? ' ' + chanesActing1[0].text : '') +
										(chanesActing1.length === 1 && chanesActing2.length === 1 ? ' ' + UB.i18n(`на формулювання`) + ' ' + chanesActing2[0].text : ''),
									twoColumns: result.generalOrg
								})
								if (chanesActing1.length > 1) {
									result.mission.push(...chanesActing1)
								}

								if (!(chanesActing1.length === 1 && chanesActing2.length === 1)) {
									result.mission.push({
										toOrder: toOrder,
										itemIdxTxt: '',
										noIndent: 1,
										text: UB.i18n(`на формулювання`) + (chanesActing2.length === 1 ? ' ' + chanesActing2[0].text : ''),
										twoColumns: result.generalOrg
									})
								}
								if (chanesActing2.length > 1) {
									result.mission.push(...chanesActing2)
								}
							}
						}

					}
				}

        if (cntDet === 1) {
          const empInfo = HR.reportUtils.getEmpIncaseInfo(orderDetItem, 'gen', false)
          employeeTitle = HR.reportUtils.formatShortNameInOrder(empInfo.empName, { notUseMiddleNameInOrder: result.notUseMiddleNameInOrder })
          if (!result.titleOrder) {
            result.titleOrder = training ? UB.i18n('Про зміну наказу про відрядження з метою навчання') : UB.i18n('Про зміну наказу про відрядження')
          }
        }
      }
    }


    if (cntDet === 1) {
      result.titleOrder = `${result.titleOrder || ''}${result.titleOrder && employeeTitle ? '<br/>' : ''}${employeeTitle}`
    } else if (cntDet !== 0) {
      if (!result.titleOrder) {
        result.titleOrder = result.type.mission_training && !result.type.mission_training
          ? UB.i18n('Про зміну наказу про відрядження з метою навчання')
          : UB.i18n('Про зміну наказу про відрядження')
      }

      result.titleOrder = `${result.titleOrder || ''}${result.titleOrder ? '<br/>' : ''}${/*result.positionType ? UB.i18n('державних службовців') : */UB.i18n('працівників')}`
    }

    if (result.mission.length === 1 && (!taskDet.tasks || taskDet.tasks.length === 0)) {
      result.mission[0].itemIdxTxt = ''
    }

    result.mission = result.mission.filter(el => el.toOrder)

    result.tasks = taskDet.tasks.map(e => ({
      task: `${itemIdx === 0 && taskDet.tasks.length === 1 ? '' : ++itemIdx + '. '}${e.task}${e['positionName'] ? ` ${e['positionName']}` : ''}${e['employeeName'] ? ` ${e['employeeName']}` : ''}.`
    }))

    return result
  },

  cancelActing: function (orderWord, orderItem, priorActItems, items, positions, index, orgGen, toOrder, generalOrg, showTabNum, notUseMiddleNameInOrder) {
    if (!priorActItems.length) return
    const tabNum = showTabNum && orderItem['employeeNumberID.tabNum'] ? UB.i18n(` (Таб. №&nbsp;{0})`, orderItem['employeeNumberID.tabNum']) : ''
    const posInfo = HR.reportUtils.getInfoItemOrderInCase(orderItem, 'gen', false, notUseMiddleNameInOrder)
    posInfo.empName = HR.reportUtils.formatShortNameInOrder(posInfo.empName, { notUseMiddleNameInOrder }) + (tabNum ? ' ' + tabNum : '')

    const actList = priorActItems.map(actDetItem => {
      let respPosName = ''
      if (positions[actDetItem.employeePositionID]) {
        const posInfo = HR.reportUtils.getInfoItemOrderInCase(positions[actDetItem.employeePositionID][0], 'gen', false, notUseMiddleNameInOrder, '')
        respPosName = posInfo.posName || ''
      }

      const tabNum = showTabNum && actDetItem['employeeNumberID.tabNum'] ? UB.i18n(` (Таб. №&nbsp;{0})`, actDetItem['employeeNumberID.tabNum']) : ''
      const respEmpName = HR.reportUtils.formatShortNameInOrder(actDetItem['employeeID.accusativeName'] || actDetItem['employeeID.shortFIO'] || '', { notUseMiddleNameInOrder }) +
        (tabNum ? ' ' + tabNum : '')

      return `${respEmpName}${respPosName ? ' ' + respPosName + orgGen : ''}`
    })

    items.push({
      toOrder: toOrder,
      itemIdxTxt: index ? ++index + '. ' : '',
      text: UB.i18n(`${orderWord} ${orderItem.priorMissionDetDescription} в частині встановлення виконання обов'язків {0}{1}{2}.`, posInfo.empName, posInfo.posName ? ' ' + posInfo.posName + orgGen : '', actList.length ? ' ' + actList.join(', ') : ''),
			twoColumns: generalOrg
    })

  },

	addActing: function (newActing, orderItem, actDetItems, items, positions, training, index, generalOrg, orgGen, toOrder, isOrgBoss, showTabNum, notUseMiddleNameInOrder) {
		const me = this
		const tabNum = showTabNum && orderItem['employeeNumberID.tabNum'] ? UB.i18n(` (Таб. №&nbsp;{0})`, orderItem['employeeNumberID.tabNum']) : ''
		const actingEmpName = HR.reportUtils.formatShortNameInOrder(orderItem['employeeID.genName'] || orderItem['employeeID.fullFIO'], { notUseMiddleNameInOrder }) +
			(tabNum ? ' ' + tabNum : '')
		const actingPosName = (orderItem['employeePositionID.positionID.fullNameGen'] || orderItem['employeePositionID.positionID.nameGen'] || orderItem['employeePositionID.positionID.name']
			? HR.reportUtils.makePositionName(orderItem['employeePositionID.positionID.fullNameGen'] || orderItem['employeePositionID.positionID.nameGen'] || orderItem['employeePositionID.positionID.name'], orderItem['employeePositionID.positionID.isOrgBoss'] || isOrgBoss)
			: '____________________') +
			orgGen
		const positionTypeEmp = orderItem['employeePositionID.positionID.positionType'] === '1'
		let positionType = true

		const actingItems = []
		if (actDetItems.length > 0) {
			for (let j = 0; j < actDetItems.length; j++) {
				const actDetItem = actDetItems[j]
				let respEmpName = '____________________'
				let respPosName = ''

				if (positions[actDetItem.employeePositionID]) {
					const posInfo = HR.reportUtils.getInfoItemOrderInCase(positions[actDetItem.employeePositionID][0], 'acc', true, notUseMiddleNameInOrder, '')
					respPosName = posInfo.posName || ''
				}

				const tabNum = showTabNum && actDetItem['employeeNumberID.tabNum'] ? UB.i18n(` (Таб. №&nbsp;{0})`, actDetItem['employeeNumberID.tabNum']) : ''
				respEmpName = HR.reportUtils.formatShortNameInOrder(actDetItem['employeeID.accusativeName'] || actDetItem['employeeID.shortFIO'] || '', { notUseMiddleNameInOrder }) +
					(tabNum ? ' ' + tabNum : '')
				positionType = actDetItem['positionID.positionType'] === '1' && positionType
				respPosName = respPosName ? (orderItem['employeePositionID.positionID.isOrgBoss'] ? '' : ', ') + respPosName + orgGen : respPosName

				const condition = actDetItem['condition'] ? ' ' + actDetItem['condition'] : ''
				const dateTo = !condition.length && actDetItem['dateTo'] ? UB.i18n(' по&nbsp;') + AC.dateService.formatDate(actDetItem['dateTo']) : ''
				const dateFrom = actDetItem['dateFrom'] ? `${!condition.length && !dateTo.length ? UB.i18n('на') : UB.i18n('з')}&nbsp;${AC.dateService.formatDate(actDetItem['dateFrom'])}` : ''

				if (actDetItems.length === 1 && !actDetItem.payForExtraLoad) {
					if (orderItem['employeePositionID.positionID.isOrgBoss']) {
						actingItems.push({
							toOrder: toOrder,
							itemIdxTxt: 'index',
							text: UB.i18n(`На період перебування у відрядженні{0} виконання обов’язків покладаю на {1}{2}{3}.`, training ? UB.i18n(' на навчання') : '', respPosName, respPosName.length ? ' ' : '', respEmpName),
							twoColumns: generalOrg
						})
					} else {
						actingItems.push({
							toOrder: toOrder,
							itemIdxTxt: 'index',
							text: UB.i18n(`На період відрядження{0} {1} виконання обов'язків {2} покласти на {3}{4} {5}{6}{7}{8}`, training ? UB.i18n(' на навчання') : '', actingEmpName, actingPosName, respEmpName, respPosName, dateFrom, dateTo, condition, ''),
							twoColumns: generalOrg
						})
					}
				} else {
					actingItems.push({
						toOrder: toOrder,
						itemIdxTxt: '',
						text: UB.i18n(`- виконання обов’язків {0}{1}{2} {3}{4}{5}{6}`, orderItem['employeePositionID.positionID.isOrgBoss'] ? UB.i18n('покладаю на ') : actingPosName + UB.i18n(' покласти на '), respEmpName, respPosName, dateFrom, dateTo, condition, ''),
						twoColumns: generalOrg
					})
					if (actDetItem.payForExtraLoad || (actDetItem['payElID.calcAlgorithm'] && actDetItem['payElID.calcAlgorithm'] === '1')) {
						const positionTypeAct = actDetItem['positionID.positionType'] === '1'
						actingItems.push({
							toOrder: toOrder,
							itemIdxTxt: '',
							text: UB.i18n(`- встановити {0} `, HR.reportUtils.formatShortNameInOrder(actDetItem['employeeID.datName'] || actDetItem['employeeID.fullFIO'], { notUseMiddleNameInOrder })) +
								UB.i18n(`виплату за додаткове навантаження у зв’язку з виконанням обов’язків тимчасово відсутнього {0} `, positionTypeEmp ? UB.i18n('державного службовця') : UB.i18n('працівника')) +
								me.getExtraLoadInfo(actDetItem.payForExtraLoad, actDetItem['payElID.calcAlgorithm'], positionTypeAct, positionType, ''),
							twoColumns: generalOrg
						})
					}
				}
			}
		}

		if (actingItems.length > 1) {
			items.push({
				toOrder: toOrder,
				itemIdxTxt: index ? ++index + '. ' : '',
				text: (newActing ? '' : '"') + UB.i18n(`На період відрядження{0} {1}:`, training ? UB.i18n(' на навчання') : '', actingEmpName),
				twoColumns: generalOrg
			})
		}

		actingItems.forEach((el, i) => {
			el.itemIdxTxt = el.itemIdxTxt ? ++index + '. ' : ''
			if (!newActing && i === 0 && actingItems.length === 1) {
				el.text = '"' + el.text
			}
			el.text = el.text + (i + 1 < actingItems.length ? ';' : '.')
			if (!newActing && (i + 1 === actingItems.length)) {
				el.text = el.text + '"'
			}
			items.push(el)
		})

		return {
			length: actDetItems.length,
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
