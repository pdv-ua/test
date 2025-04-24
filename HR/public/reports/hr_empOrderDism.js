/* global _ UB AC HR appAC */
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
      emblem: HR.reportUtils.getEmblem(),
      generalOrg: false,
      printDocumentView: printDocumentView,
      titleOrderParams: printDocumentView === 'APPOINTMENT' ? 'padding-left: 34px; ' : '',
      orderType: printDocumentView === 'APPOINTMENT'
        ? UB.i18n('РОЗПОРЯДЖЕННЯ')
        : orderExtract && orderExtract.ID ? UB.i18n('В И Т Я Г &nbsp;З&nbsp; Н А К А З У') : UB.i18n('Н А К А З'),
      responsiblesInfo: responsiblesInfo,
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
          orderIndex: order['dictEmpOrderIndexID.code'] === null ? '' : `/${order['dictEmpOrderIndexID.code']}`,
          orderDate: AC.dateService.getStringFormatDate(order.orderDate, '', ''),
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
      organizationNameGen: order['organizationID.nameGen'] || order['organizationID.name'] || '',
      titleOrder: (order.titleOrder || '').replace(/&/g, '&nbsp;'),
      items: []
    }

    await HR.reportUtils.getOrderPrintConfig(result, order.subOrganization ? order.masterOrganizationID : order.organizationID)
    const boldFormatBegin = result.normalFullName ? '' : '<b>'
    const boldFormatEnd = result.normalFullName ? '' : '</b>'

    const orgGen = order.subOrganization && (order['organizationID.nameGen'] || order['organizationID.name'])
      ? ' ' + (order['organizationID.nameGen'] || order['organizationID.name']) : ''

    result.generalOrg = AC.settings.get('hrFuncOrgType', order.masterOrganizationID || order.organizationID) === '1'
    const experienceWithoutPeriod = AC.settings.get('hrOrderVacExpWithoutPeriod', order.masterOrganizationID || order.organizationID) === true
    const useSexType = AC.settings.get('hrUseSexTypeInOrders', order.masterOrganizationID || order.organizationID) === true

    const taskDet = await HR.reportUtils.getTask(ID, order.orderDate || order.entryDate, order.showTabNum, result.notUseMiddleNameInOrder)

    const whereArray = [['empOrderType', 'in', ['DISM', 'TRANSFER']]]
    let orderDet = await HR.reportUtils.getEmpOrderDet(ID, order.orderDate || order.entryDate, ['employeeNumberID',
      'employeePositionID.mtCount', 'employeePositionID.workPlace', 'departmentID'], whereArray, true)
    const dismDet = await UB.Repository('hr_empOrderDismDet')
      .attrs(['ID', 'dateFrom', 'dictReasonDismID.orderText', 'dictReasonDismID.isDueToDeath', 'cntSeverancePay', 'valuation', 'isTransferVac',
        'unusedVacationDays', 'reason', 'isHandOver', 'byTransfer', 'vacRecalcOrganizationID.name', 'vacRecalcOrganizationID.nameGen', 'vacRecalcDescription',
        'transferOrg.nameLoc', 'transferOrg.name', 'isDetailVacation', 'transferOrgName', 'vacRecalcOrganizationName', 'dictReasonDismID.lawName'
      ])
      .where('orderID', '=', ID)
      .selectAsObject()
    const transferDet = await UB.Repository('hr_empOrderTransferDet')
      .attrs(['ID', 'dateFrom', 'dictReasonDismID.orderText', 'transferOrgID', 'transferOrgID.name', 'transferOrgID.nameGen', 'transferPositionID'])
      .where('orderID', '=', ID)
      .selectAsObject()

    const vacSubstitutionDet = await UB.Repository('hr_empOrderVacSubstitutionDet')
      .attrs(['ID', 'paraID', 'dateFrom', 'dateTo', 'employeePositionID', 'employeePositionID.employeeID.datName', 'employeePositionID.employeeID.fullFIO',
        'employeePositionID.employeeID.sexType'])
      .attrsIf(showTabNum, ['employeePositionID.employeeNumberID.tabNum'])
      .where('orderID', '=', ID)
      .selectAsObject()
    const employeePositionIDs = vacSubstitutionDet && vacSubstitutionDet.length > 0 ? _.uniq(vacSubstitutionDet.map(el => el.employeePositionID)) : []
    let employeePosition = employeePositionIDs && employeePositionIDs.length > 0
      ? await HR.reportUtils.getPromiseEmployeePositionForOrders(employeePositionIDs, order.masterOrganizationID || order.organizationID, order.organizationID, order.orderDate || order.entryDate, ['Gen', 'Dat', 'Acc'], useSexType)
      : []
    employeePosition = employeePosition && employeePosition.length ? _.groupBy(employeePosition, 'ID') : []

    let empMilitaryRanks = await UB.Repository('hr_empMilitaryRanks')
      .attrs(['ID', 'employeeID', 'dictMilitaryRankID.name', 'dictMilitaryRankID.genName', 'orderDate'])
      .where('dictMilitaryRankID', 'isNotNull')
      .exists(UB.Repository('hr_empOrderDet')
        .correlation('employeeID', 'employeeID')
        .where('orderID', '=', ID)
      )
      .selectAsObject()
    empMilitaryRanks = _.groupBy(empMilitaryRanks, 'employeeID')

    let index = 1
    const depIds = _.compact(_.uniq(orderDet.map(el => el.departmentID)))
    let depNames = await HR.reportUtils.getDepartmentsName(depIds, ['name'], order.orderDate || order.entryDate, order.organizationID)

    let ids = _.compact(orderDet.map(el => el.employeeID))
    const employeeExperience = ids && ids.length > 0 ? await UB.Repository('hr_employeeExperience')
      .attrs(['ID', 'employeeID', 'dictExperienceID.code', 'calcDate'])
      .where('dictExperienceID.code', '=', '6')
      .where('employeeID', 'in', ids)
      .selectAsObject() : []

    const transferPosition = []
    let transferItems = transferDet && transferDet.length ? _.groupBy(transferDet, 'transferOrgID') : {}
    _.forEach(transferItems, item => {
      transferPosition.push({
        organizationID: item[0].transferOrgID,
        ids: _.compact(_.uniq(item.map(el => el.transferPositionID))),
        positions: {}
      })
    })
    for (let i = 0; i < transferPosition.length; i++) {
      ids = transferPosition[i].ids
      transferPosition[i].positions = ids && ids.length
        ? await HR.reportUtils.getPositionName(ids, ['fullNameGen', 'nameGen', 'name'], order.orderDate || order.entryDate, transferPosition[i].organizationID, ['isOrgBoss', 'accrualSum'], 'ID')
        : {}
    }

    const cnt = orderDet.filter(item => item.empOrderType === 'DISM' && _.find(dismDet, { ID: item.ID })).length +
      orderDet.filter(item => item.empOrderType === 'TRANSFER' && _.find(transferDet, { ID: item.ID })).length

    orderDet = _.sortBy(orderDet, 'empOrderType')
    for (let i = 0; i < orderDet.length; i++) {
      const item = orderDet[i]
      const { empOrderType } = item
      if (empOrderType === 'DISM') {
        const dismDetItem = _.find(dismDet, { ID: item.ID })
        const toOrder = orderExtract && orderExtract.ID
          ? ((orderExtract.departmentID ? orderExtract.departmentID === item.departmentID : true) && (orderExtract.employeePositionID ? orderExtract.employeePositionID === item.employeePositionID : true))
          : true
        if (dismDetItem) {
          const tabNum = showTabNum && item['employeeNumberID.tabNum'] ? UB.i18n(`(Таб. №&nbsp;{0})`, item['employeeNumberID.tabNum']) : ''
          const accPosInfo = HR.reportUtils.getInfoItemOrderInCase(item, 'acc', true, result.notUseMiddleNameInOrder)
          const insPosInfo = HR.reportUtils.getInfoItemOrderInCase(item, 'ins', false, result.notUseMiddleNameInOrder)
          const accEmpName = accPosInfo.empName
          const insEmpName = insPosInfo.empName
          const datPosInfo = HR.reportUtils.getInfoItemOrderInCase(item, 'dat', false, result.notUseMiddleNameInOrder)
          const datEmpName = datPosInfo.empName
          const genPosInfo = HR.reportUtils.getInfoItemOrderInCase(item, 'gen', false, result.notUseMiddleNameInOrder) // , 'employeePositionID.', { fullPositionName: item['employeePositionID.positionID.positionType'] !== '4' }
          const genEmpName = genPosInfo.empName
          const posName = genPosInfo.posName ? `${result.generalOrg && item['employeePositionID.workPlace'] === '2' ? UB.i18n('&nbsp;по посаді') : UB.i18n('&nbsp;з посади')} ${genPosInfo.posName}` : '' // &nbsp; не удалять!! иначе на пдф некорретно пробел обтображает
          const depName = depNames[item.departmentID] ? HR.nameCase.uncap(depNames[item.departmentID].name) : ''

          const dateFrom = dismDetItem.dateFrom ? ` ${AC.dateService.formatDate(dismDetItem.dateFrom)}` : ''
          let dictReasonDismName = dismDetItem['dictReasonDismID.orderText']
          dictReasonDismName = dictReasonDismName ? HR.nameCase.uncap(dictReasonDismName) : ''
          const tail1 = !dictReasonDismName && dateFrom.endsWith('.') ? '' : '.'
          if (dismDetItem.byTransfer) {
            dictReasonDismName = dismDetItem['dictReasonDismID.lawName'] ? ' ' + UB.i18n(`відповідно до {0}`, dismDetItem['dictReasonDismID.lawName']) + ' ' : ''
            dictReasonDismName += UB.i18n(`у порядку переведення для подальшої роботи у {0}`, dismDetItem['transferOrg.nameLoc'] || dismDetItem['transferOrg.name'] || dismDetItem['transferOrgName'] || '')
          }
          const textMtCount = result.generalOrg && item['employeePositionID.mtCount'] ? item['employeePositionID.mtCount'] === 1 ? UB.i18n(' (повна ставка)') : UB.i18n(` (кількість ставок&nbsp;{0})`, item['employeePositionID.mtCount']) : ''
          const textMtCount2 = result.generalOrg && item['employeePositionID.mtCount'] ? item['employeePositionID.mtCount'] === 1 ? UB.i18n(' повна ставка') : UB.i18n(` кількість ставок&nbsp;{0}`, item['employeePositionID.mtCount']) : ''

          let partTimePos
          let partTimePosStr = ''
          if (item['employeePositionID.workPlace'] === '1') {
            const dateFrom = AC.dateService.truncTimeToUtcNull(dismDetItem.dateFrom)
            // Пошукаемо призначення за сумісництвом
            partTimePos = await UB.Repository('hr_employeePositionS')
              .attrs(['ID', 'employeeNumberID', 'positionID', 'mtCount', 'departmentID'])
              .attrsIf(showTabNum, ['employeeNumberID.tabNum'])
              .where('employeeID', '=', item.employeeID)
              .where('workPlace', '=', '2')
              .where('dateFrom', '<=', dateFrom)
              .where('dateTo', '>=', dateFrom)
              .where('organizationID', '=', order.organizationID)
              .selectAsObject()

            if (partTimePos && partTimePos.length) {
              let ids = _.compact(_.uniq(partTimePos.map(el => el.positionID)))
              const posGen = await HR.reportUtils.getPositionName(ids, useSexType && item['employeeID.sexType'] === 'W' ? ['fullNameGenF', 'nameGenF', 'name'] : ['fullNameGen', 'nameGen', 'name'], order.orderDate || order.entryDate, order.organizationID, ['positionCategory', 'isOrgBoss'])
              const posName = await HR.reportUtils.getPositionName(ids, ['name'], order.orderDate || order.entryDate, order.organizationID, ['positionCategory', 'isOrgBoss'])
              ids = _.compact(_.uniq(partTimePos.map(el => depIds.indexOf(el.departmentID) === -1 ? el.departmentID : 0)))
              const deps = await HR.reportUtils.getDepartmentsName(ids, ['name'], order.orderDate || order.entryDate, order.organizationID)
              if (!_.isEmpty(deps)) {
                depIds.push(...ids)
                depNames = Object.assign(depNames, deps)
              }
              for (let m = 0; m < partTimePos.length; m++) {
                partTimePos[m].posName = posGen[partTimePos[m].positionID] ? HR.reportUtils.makePositionName(posGen[partTimePos[m].positionID].name, posGen[partTimePos[m].positionID].isOrgBoss) + orgGen : ''
                partTimePos[m].textMtCount = result.generalOrg && item['employeePositionID.mtCount'] ? partTimePos[m]['mtCount'] === 1 ? ' (повна ставка)' : ` (кількість ставок&nbsp;${partTimePos[m]['mtCount']})` : ''

                const aTabNum = showTabNum && partTimePos[m]['employeeNumberID.tabNum'] ? UB.i18n(`(Таб. №&nbsp;{0})`, partTimePos[m]['employeeNumberID.tabNum']) : ''
                partTimePosStr += `,${aTabNum ? ' ' + aTabNum : ''} з посади ${partTimePos[m].posName}${partTimePos[m].textMtCount}`

                // для компенсации
                partTimePos[m].depName = depNames[partTimePos[m].departmentID] ? HR.nameCase.uncap(depNames[partTimePos[m].departmentID].name) : ''
                partTimePos[m].posName = posName[partTimePos[m].positionID] ? (partTimePos[m].depName.length ? ', ' : '') + HR.reportUtils.makePositionName(posName[partTimePos[m].positionID].name, posName[partTimePos[m].positionID].isOrgBoss) + orgGen : ''
                partTimePos[m].textMtCount = result.generalOrg && item['employeePositionID.mtCount'] ? (partTimePos[m].posName.length || partTimePos[m].depName.length ? ',' : '') + (partTimePos[m]['mtCount'] === 1 ? ' повна ставка' : ` кількість ставок&nbsp;${partTimePos[m]['mtCount']}`) : ''
              }
            }
          }

          let typeOrder = UB.i18n('Звільнити')
          typeOrder = result.smallOrderWord ? typeOrder : typeOrder.toUpperCase()
          let militaryRank = ''
          if (item['employeePositionID.positionID.positionType'] === '4') {
            typeOrder = UB.i18n('Виключити')
            typeOrder = result.smallOrderWord ? typeOrder : typeOrder.toUpperCase()
            militaryRank = HR.reportUtils.getMilitaryRanks(empMilitaryRanks[item.employeeID], order.orderDate || appAC.globalApplicationDate(), 'genName')
          } else if (result.generalOrg && item['employeePositionID.workPlace'] === '2') {
            typeOrder = UB.i18n('Припинити сумісництво')
            typeOrder = result.smallOrderWord ? typeOrder : typeOrder.toUpperCase()
          } else if (dismDetItem['dictReasonDismID.isDueToDeath']) {
            let orderWord = UB.i18n('Виключити')
            orderWord = result.smallOrderWord ? orderWord : orderWord.toUpperCase()
            typeOrder = UB.i18n('{0} зі списків особового складу', orderWord)
          }
          let text = ''

          if (item['employeePositionID.positionID.positionType'] === '4') {
            // const pName = genPosInfo.posName ? HR.reportUtils.makePositionName(genPosInfo.posName, item['employeePositionID.positionID.isOrgBoss']) : ''
            text = `${typeOrder} ${militaryRank ? militaryRank + ' ' : ''}${accEmpName}${tabNum ? ' ' + boldFormatEnd + tabNum : boldFormatEnd}${genPosInfo.posName ? ', ' + genPosInfo.posName : ''}${orgGen} після здачі справ та посади ${dateFrom} із списків особового складу ${order['organizationID.nameGen'] || order['organizationID.name']} та усіх видів забезпечення ${dictReasonDismName}${tail1}`
          } else if (result.generalOrg && item['employeePositionID.workPlace'] === '2') {
            text = `${typeOrder} ${boldFormatBegin}${genEmpName}${tabNum ? ' ' + boldFormatEnd + tabNum : boldFormatEnd}${posName}${orgGen}${dateFrom} ${dictReasonDismName}.`
          } else {
            text = `${typeOrder} ${boldFormatBegin}${accEmpName}${tabNum ? ' ' + boldFormatEnd + tabNum : boldFormatEnd}${posName}${orgGen}${textMtCount}${partTimePosStr}${dateFrom} ${dictReasonDismName}${tail1}`
          }
          text = text.replace('</b> ', ' </b>')
          text = text.replace('</b>,', ',</b>&nbsp;')

          result.items.push({
            toOrder: toOrder,
            indent: 1,
            index: `${cnt === 1 && taskDet.tasks.length === 0 ? '' : (index++) + '. '}`, // `${index++}. `,
            text: text
          })

          if (item['employeePositionID.positionID.positionType'] === '4') {
            result.items.push({
              toOrder: toOrder,
              indent: 1,
              index: '', // `${cnt === 1 ? (index++) + '. ' : ''}`,
              text: UB.i18n(`Розрахувати {0}{1} по день виключення із списків {2}.`, militaryRank ? militaryRank + ' ' : '', HR.reportUtils.getShortFIO(accEmpName), order['organizationID.nameGen'] || order['organizationID.name'] || '')
            })
          }

          if (dismDetItem.cntSeverancePay) {
            const valuationName = dismDetItem.valuation === 'AVG'
              ? AC.dateService.plural(UB.i18n('середньої місячної заробітної плати_середніх місячних заробітних плат_середніх місячних заробітних плат'), dismDetItem.cntSeverancePay)
              : dismDetItem.valuation === 'MIN'
                ? AC.dateService.plural(UB.i18n('мінімальної заробітної плати_мінімальних заробітних плат_мінімальних заробітних плат'), dismDetItem.cntSeverancePay)
                : ''
            result.items.push({
              toOrder: toOrder,
              indent: 1,
              index: '', // `${cnt === 1 ? (index++) + '. ' : ''}`,
              text: UB.i18n(`Виплатити {0} вихідну допомогу у розмірі {1}{2}.`, HR.reportUtils.getShortFIO(datEmpName), dismDetItem.cntSeverancePay, valuationName ? '&nbsp;' + valuationName : '')
            })
          }

          let empVac
          if (dismDetItem.isDetailVacation) {
            empVac = await UB.Repository('hr_empOrderDismVac')
              .attrs(['dayRecalc', 'dayRestitute', 'empVacationPeriodID.dateFrom', 'empVacationPeriodID.dateTo', 'employeeNumberID.tabNum',
                'dictVacationKindID.code', 'dictVacationKindID.name', 'dictVacationKindID.nameGen', 'employeeNumberID',
                'dictVacationKindID.isYearBeginStart', 'dictVacationKindID.isProportionalCompensate'])
              .where('orderDetID', '=', item.ID)
              .orderBy('dictVacationKindID.name')
              .orderBy('empVacationPeriodID.dateFrom')
              .orderBy('empVacationPeriodID.dateTo')
              .selectAsObject()
            empVac.forEach(next => {
              next.experience = ''
              if (next['dictVacationKindID.code'] === 'dState') {
                const empExperience = employeeExperience.find(o => o.employeeID === item.employeeID)
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
            empVac = await UB.Repository('hr_empOrderDismVac')
              .attrs(['sum([dayRecalc])', 'sum([dayRestitute])', 'employeeNumberID', 'employeeNumberID.tabNum',
                'dictVacationKindID.name', 'dictVacationKindID.nameGen', 'dictVacationKindID.isYearBeginStart', 'dictVacationKindID.isProportionalCompensate'])
              .where('orderDetID', '=', item.ID)
              .groupBy(['employeeNumberID', 'employeeNumberID.tabNum', 'dictVacationKindID.name', 'dictVacationKindID.nameGen', 'dictVacationKindID.isYearBeginStart', 'dictVacationKindID.isProportionalCompensate'])
              .orderBy('dictVacationKindID.name')
              .selectAsObject({
                'sum([dayRecalc])': 'dayRecalc',
                'sum([dayRestitute])': 'dayRestitute'
              })
          }

          if (empVac && empVac.length > 0) {
            const GroupEmpVac = []
            // let showTabNum = false
            if (/* result.generalOrg && */ item['employeePositionID.workPlace'] === '1') {
              // showTabNum = result.generalOrg
              let flt = empVac.filter(el => el.employeeNumberID === item.employeeNumberID)
              if (flt && flt.length) {
                GroupEmpVac.push(flt)
              }
              flt = empVac.filter(el => el.employeeNumberID !== item.employeeNumberID)
              if (flt && flt.length) {
                flt = _.groupBy(_.sortBy(flt, 'employeeNumberID.tabNum'), 'employeeNumberID.tabNum')
                _.forEach(flt, items => {
                  GroupEmpVac.push(items)
                })
              }
            } else {
              GroupEmpVac.push(empVac)
            }

            for (let k = 0; k < 2; k++) {
              let addHead = false
              _.forEach(GroupEmpVac, itemVac => {
                let tabNum = showTabNum ? UB.i18n(`Таб. №&nbsp;{0}`, itemVac[0]['employeeNumberID.tabNum']) : ''
                const fltEmpVac = itemVac.filter(item => (item.dayRestitute && k === 0) || (item.dayRecalc && k === 1 && dismDetItem.isTransferVac))
                fltEmpVac.forEach((empVacItem, ind) => {
                  const aDays = k === 0 ? empVacItem.dayRestitute : empVacItem.dayRecalc
                  if (aDays) {
                    partTimePosStr = ''
                    if (partTimePos && partTimePos.length) {
                      if (empVacItem.employeeNumberID === item.employeeNumberID) {
                        if (showTabNum) {
                          tabNum = tabNum ? tabNum + (textMtCount2.length ? ', ' : '') + textMtCount2 : ''
                        } else {
                          const pName = HR.reportUtils.makePositionName(item['employeePositionID.positionID.fullName'] || item['employeePositionID.positionID.name'] || item['positionID.name'] || '', item['employeePositionID.positionID.isOrgBoss']) + orgGen
                          partTimePosStr = `${UB.i18n('по')} ${depName}${depName.length ? ', ' : ''}${pName}${(pName.length || depName.length) && textMtCount2.length ? ', ' : ''}${textMtCount2}: `
                        }
                      } else {
                        const fltpartTimePos = partTimePos.find(el => el.employeeNumberID === empVacItem.employeeNumberID)
                        if (fltpartTimePos) {
                          if (showTabNum) {
                            tabNum = tabNum ? tabNum + fltpartTimePos.textMtCount : ''
                          } else {
                            partTimePosStr = `${UB.i18n('по')} ${fltpartTimePos.depName || ''}${fltpartTimePos.posName || ''}${fltpartTimePos.textMtCount}: `
                          }
                        }
                      }
                    }
                    let termStr = `- ${partTimePosStr}${aDays}&nbsp;${AC.dateService.plural(UB.i18n('календарний день_календарних дні_календарних днів'), aDays)}  `
                    termStr += `${HR.nameCase.uncap(empVacItem['dictVacationKindID.nameGen'] || empVacItem['dictVacationKindID.name'] || '')}`
                    termStr += empVacItem.experience ? ' ' + empVacItem.experience : ''

                    if (empVacItem['dictVacationKindID.isProportionalCompensate']) {
                      empVacItem['empVacationPeriodID.dateTo'] = me.getMinDate(empVacItem['empVacationPeriodID.dateTo'], dismDetItem.dateFrom)
                    }
                    if (dismDetItem.isDetailVacation && empVacItem['empVacationPeriodID.dateFrom'] && empVacItem['empVacationPeriodID.dateTo'] && empVacItem.showPeriod) {
                      if (empVacItem['dictVacationKindID.isYearBeginStart']) {
                        termStr += UB.i18n(` за&nbsp;{0} рік`, AC.dateService.formatDate(empVacItem['empVacationPeriodID.dateFrom'], 'yyyy'))
                      } else {
                        termStr += UB.i18n(` за період роботи з&nbsp;{0} по&nbsp;{1}`, AC.dateService.formatDate(empVacItem['empVacationPeriodID.dateFrom']), AC.dateService.formatDate(empVacItem['empVacationPeriodID.dateTo']))
                      }
                    }

                    if (!addHead) {
                      let text
                      if (k === 0) {
                        text = UB.i18n(`Виплатити {0} грошову компенсацію за невикористані дні відпустки, а саме:`, HR.reportUtils.getShortFIO(datEmpName))
                      } else {
                        text = UB.i18n(`Перерахувати на рахунок {0}`, dismDetItem['vacRecalcOrganizationID.nameGen'] || dismDetItem['vacRecalcOrganizationID.name'] || dismDetItem['vacRecalcOrganizationName'] || '')
                        text += dismDetItem.vacRecalcDescription ? ` (${dismDetItem.vacRecalcDescription})` : ''
                        text += UB.i18n(` грошову компенсацію за невикористані {0} дні відпусток, а саме:`, HR.reportUtils.getShortFIO(insEmpName))
                      }
                      result.items.push({
                        toOrder: toOrder,
                        indent: 1,
                        index: '', // `${cnt === 1 ? (index++) + '. ' : ''}`,
                        text: `${text}`
                      })
                      addHead = true
                    }
                    if (tabNum) {
                      result.items.push({
                        toOrder: toOrder,
                        indent: 1,
                        index: '',
                        text: tabNum
                        // text: `<font color="blue">${tabNum}</font>`
                      })
                      tabNum = ''
                    }
                    result.items.push({
                      toOrder: toOrder,
                      indent: 1,
                      index: '',
                      text: termStr + (ind < fltEmpVac.length - 1 ? ';' : '.')
                    })
                  }
                })
              })
            }
          }

          if (dismDetItem.isDetailVacation) {
            empVac = await UB.Repository('hr_empOrderDismVac')
              .attrs(['dayReturn', 'empVacationPeriodID.dateFrom', 'empVacationPeriodID.dateTo', 'employeeNumberID.tabNum',
                'dictVacationKindID.code', 'dictVacationKindID.name', 'dictVacationKindID.nameGen', 'employeeNumberID', 'dictVacationKindID.isYearBeginStart'])
              .where('orderDetID', '=', item.ID)
              .where('dayReturn', '>', 0)
              .orderBy('dictVacationKindID.name')
              .orderBy('empVacationPeriodID.dateFrom')
              .orderBy('empVacationPeriodID.dateTo')
              .selectAsObject()
            empVac.forEach(next => {
              next.experience = ''
              if (next['dictVacationKindID.code'] === 'dState') {
                const empExperience = employeeExperience.find(o => o.employeeID === item.employeeID)
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
            empVac = await UB.Repository('hr_empOrderDismVac')
              .attrs(['sum([dayReturn])', 'dictVacationKindID.name', 'dictVacationKindID.nameGen', 'employeeNumberID',
                'employeeNumberID.tabNum', 'dictVacationKindID.isYearBeginStart'])
              .where('orderDetID', '=', item.ID)
              .where('dayReturn', '>', 0)
              .groupBy(['dictVacationKindID.name', 'dictVacationKindID.nameGen', 'employeeNumberID', 'employeeNumberID.tabNum', 'dictVacationKindID.isYearBeginStart'])
              .orderBy('dictVacationKindID.name')
              .selectAsObject({
                'sum([dayReturn])': 'dayReturn'
              })
          }

          if (empVac && empVac.length > 0) {
            const GroupEmpVac = []
            // let showTabNum = false
            if (result.generalOrg && item['employeePositionID.workPlace'] === '1') {
              // showTabNum = true
              let flt = empVac.filter(el => el.employeeNumberID === item.employeeNumberID)
              if (flt && flt.length) {
                GroupEmpVac.push(flt)
              }
              flt = empVac.filter(el => el.employeeNumberID !== item.employeeNumberID)
              if (flt && flt.length) {
                flt = _.groupBy(_.sortBy(flt, 'employeeNumberID.tabNum'), 'employeeNumberID.tabNum')
                _.forEach(flt, items => {
                  GroupEmpVac.push(items)
                })
              }
            } else {
              GroupEmpVac.push(empVac)
            }

            let addHead = false
            _.forEach(GroupEmpVac, itemVac => {
              let tabNum = showTabNum ? UB.i18n(`Таб. №&nbsp;{0}`, itemVac[0]['employeeNumberID.tabNum']) : ''
              itemVac.forEach((empVacItem, ind) => {
                if (empVacItem.dayReturn) {
                  partTimePosStr = ''
                  if (partTimePos && partTimePos.length) {
                    if (empVacItem.employeeNumberID === item.employeeNumberID) {
                      if (showTabNum) {
                        tabNum = tabNum ? tabNum + (textMtCount2.length ? ', ' : '') + textMtCount2 : ''
                      } else {
                        const pName = HR.reportUtils.makePositionName(item['employeePositionID.positionID.fullName'] || item['employeePositionID.positionID.name'] || item['positionID.name'] || '', item['employeePositionID.positionID.isOrgBoss']) + orgGen
                        partTimePosStr = `${UB.i18n('по')} ${depName}${depName.length ? ', ' : ''}${pName}${(pName.length || depName.length) && textMtCount2.length ? ', ' : ''}${textMtCount2}: `
                      }
                    } else {
                      const fltpartTimePos = partTimePos.find(el => el.employeeNumberID === empVacItem.employeeNumberID)
                      if (fltpartTimePos) {
                        if (showTabNum) {
                          tabNum = tabNum ? tabNum + fltpartTimePos.textMtCount : ''
                        } else {
                          partTimePosStr = `${UB.i18n('по')} ${fltpartTimePos.depName || ''}${fltpartTimePos.posName || ''}${fltpartTimePos.textMtCount}: `
                        }
                      }
                    }
                  }

                  let termStr = `- ${partTimePosStr}${empVacItem.dayReturn}&nbsp;${AC.dateService.plural(UB.i18n('календарний день_календарних дні_календарних днів'), empVacItem.dayReturn)}  `
                  termStr += `${HR.nameCase.uncap(empVacItem['dictVacationKindID.nameGen'] || empVacItem['dictVacationKindID.name'] || '')}`
                  termStr += empVacItem.experience ? ' ' + empVacItem.experience : ''
                  if (empVacItem['dictVacationKindID.isProportionalCompensate']) {
                    empVacItem['empVacationPeriodID.dateTo'] = me.getMinDate(empVacItem['empVacationPeriodID.dateTo'], dismDetItem.dateFrom)
                  }
                  if (dismDetItem.isDetailVacation && empVacItem['empVacationPeriodID.dateFrom'] && empVacItem['empVacationPeriodID.dateTo'] && empVacItem.showPeriod) {
                    if (empVacItem['dictVacationKindID.isYearBeginStart']) {
                      termStr += UB.i18n(` за&nbsp;{0} рік`, AC.dateService.formatDate(empVacItem['empVacationPeriodID.dateFrom'], 'yyyy'))
                    } else {
                      termStr += UB.i18n(` за період роботи з&nbsp;{0} по&nbsp;{1}`, AC.dateService.formatDate(empVacItem['empVacationPeriodID.dateFrom']), AC.dateService.formatDate(empVacItem['empVacationPeriodID.dateTo']))
                    }
                  }

                  if (!addHead) {
                    const text = UB.i18n(`Відрахувати із заробітної плати {0} грошову компенсацію за невикористані дні відпустки, що були надані в рахунок невідпрацьованої частини робочого року, а саме:`, HR.reportUtils.getShortFIO(genEmpName))
                    result.items.push({
                      toOrder: toOrder,
                      indent: 1,
                      index: '', // `${cnt === 1 ? (index++) + '. ' : ''}`,
                      text: `${text}`
                    })
                    addHead = true
                  }
                  if (tabNum) {
                    result.items.push({
                      toOrder: toOrder,
                      indent: 1,
                      index: '',
                      text: tabNum
                      // text: `<font color="blue">${tabNum}</font>`
                    })
                    tabNum = ''
                  }
                  result.items.push({
                    toOrder: toOrder,
                    indent: 1,
                    index: '',
                    text: termStr + (ind < empVac.length - 1 ? ';' : '.')
                  })
                }
              })
            })
          }

          if (dismDetItem.isHandOver) {
            result.items.push({
              toOrder: toOrder,
              indent: 1,
              index: '', // `${cnt === 1 ? (index++) + '. ' : ''}`,
              text: UB.i18n(`{0}&nbsp;до звільнення з посади передати справи і довірене у зв’язку з виконанням посадових обов’язків майно, про що скласти відповідний акт.`, HR.reportUtils.getShortFIO(datEmpName))
            })
          }

          const vac = vacSubstitutionDet.filter(item => item.paraID === dismDetItem.ID)
          if (vac.length) {
            let orderVacDet = await UB.Repository('hr_empOrderVacationlongDet')
              .attrs('dictVacationKindID.nameLoc', 'dictVacationKindID.name')
              .where('orderID.orderState', '=', 'POSTED')
              .where('employeeNumberID', '=', item.employeeNumberID)
              .where('dateFrom', '<=', dismDetItem.dateFrom)
              .where('dateTo', '>=', dismDetItem.dateFrom, 'w1')
              .where('dateTo', 'isNull', undefined, 'w2')
              .logic('(([w1]) or ([w2]))')
              .selectSingle({
                'dictVacationKindID.nameLoc': 'nameLoc',
                'dictVacationKindID.name': 'name'
              })
            if (!orderVacDet) {
              orderVacDet = await UB.Repository('hr_dictVacationKind')
                .attrs('nameLoc', 'name')
                .exists(UB.Repository('tim_timeSheet')
                  .correlation('factTimeCostID', 'dictTimeCostID')
                  .attrs(['factTimeCostID'])
                  .where('employeeNumberID', '=', item.employeeNumberID)
                  .where('dateWork', '=', AC.dateService.shiftDate(dismDetItem.dateFrom))
                  .exists(UB.Repository('hr_dictTimeCostGroup')
                    .correlation('dictTimeCostID', 'factTimeCostID')
                    .where('dateFrom', '<=', AC.dateService.shiftDate(dismDetItem.dateFrom))
                    .where('dateTo', '>=', AC.dateService.shiftDate(dismDetItem.dateFrom))
                    .where('mi_deleteDate', '>=', '#maxdate')
                    .where('dictTimeGroupID.code', '=', 'LST_CHD_CARE_VAC')
                    .where('dictTimeGroupID.mi_deleteDate', '>=', '#maxdate'))
                  .where('isActive', '=', 1))
                .selectSingle()
            }
            const vacLoc = orderVacDet ? HR.nameCase.uncap(orderVacDet['nameLoc'] || orderVacDet['name']) || '' : ''

            result.items.push({
              toOrder: toOrder,
              indent: 1,
              index: '',
              text: me.makeVacSubstitution('' /* cnt === 1 ? (index++) + '. ' : '' */, vac, vacLoc, dismDetItem['employeeID.genName'] || dismDetItem['employeeID.fullFIO'],
                dismDetItem['employeeID.sexType'], dismDetItem['employeePositionID.positionID.fullNameGen'] || dismDetItem['employeePositionID.positionID.name'],
                employeePosition, dismDetItem.dateFrom, dismDetItem['positionID.positionType'] === '1', orgGen, showTabNum, result.notUseMiddleNameInOrder)
            })
          }

          if (dismDetItem.reason) {
            result.items.push({
              toOrder: toOrder,
              index: '',
              text: UB.i18n(`Підстава: {0}.`, dismDetItem.reason),
              indent: 0
            })
          }
        }
      }
      if (empOrderType === 'TRANSFER') {
        const dismDetItem = _.find(transferDet, { ID: item.ID })
        const toOrder = orderExtract && orderExtract.ID
          ? ((orderExtract.departmentID ? orderExtract.departmentID === item.departmentID : true) && (orderExtract.employeePositionID ? orderExtract.employeePositionID === item.employeePositionID : true))
          : true
        if (dismDetItem) {
          const accPosInfo = HR.reportUtils.getInfoItemOrderInCase(item, 'acc', true, result.notUseMiddleNameInOrder)
          const accEmpName = accPosInfo.empName
          const genPosInfo = HR.reportUtils.getInfoItemOrderInCase(item, 'gen', false, result.notUseMiddleNameInOrder)
          const posName = genPosInfo.posName || '' // ? ` ${HR.reportUtils.makePositionName(genPosInfo.posName, item['employeePositionID.positionID.isOrgBoss'])}` : ''

          const orgName = order.subOrganization
            ? (order['organizationID.nameGen'] || order['organizationID.name']) ? ' ' + (order['organizationID.nameGen'] || order['organizationID.name']) : ''
            : (order['masterOrganizationID.nameGen'] || order['masterOrganizationID.name']) ? ' ' + (order['masterOrganizationID.nameGen'] || order['masterOrganizationID.name']) : ''

          const dateFrom = dismDetItem.dateFrom ? ` з&nbsp;${AC.dateService.formatDate(AC.dateService.addDays(dismDetItem.dateFrom, 1))}` : ''
          const dictReasonDismName = dismDetItem['dictReasonDismID.orderText'] ? ', ' + HR.nameCase.uncap(dismDetItem['dictReasonDismID.orderText']) : ''

          const toOrgName = dismDetItem['transferOrgID.nameGen'] || dismDetItem['transferOrgID.nameGen'] || ''
          let toPosName = ''
          let toPosAccrualSum = '_________________'
          if (dismDetItem.transferOrgID) {
            let transferInfo = _.find(transferPosition, { organizationID: dismDetItem.transferOrgID })
            if (dismDetItem.transferPositionID && transferInfo.positions[dismDetItem.transferPositionID]) {
              const pos = transferInfo.positions[dismDetItem.transferPositionID]
              toPosName = genPosInfo.posName ? `${UB.i18n(' на посаду ')} ${HR.reportUtils.makePositionName(pos.name, pos.isOrgBoss)}` : ''
              toPosAccrualSum = pos.accrualSum ? HR.reportUtils.formatAsCurrency(pos.accrualSum) + UB.i18n('&nbsp;гривень') : toPosAccrualSum
              toPosAccrualSum = `${UB.i18n(' з посадовим окладом в розмірі ')}${toPosAccrualSum}${UB.i18n(' на місяць')}`
            } else {
              toPosName = UB.i18n(' до')
              toPosAccrualSum = ' з оплатою згідно посадового окладу'
            }
          }
          const tabNum = showTabNum && item['employeeNumberID.tabNum'] ? UB.i18n(`(Таб. №&nbsp;{0})`, item['employeeNumberID.tabNum']) : ''

          let text = `${UB.i18n('ПЕРЕВЕСТИ')} ${boldFormatBegin}${accEmpName}${tabNum ? ' ' + boldFormatEnd + tabNum : boldFormatEnd}${posName ? ' ' + posName : ''}${orgName}${dictReasonDismName},${dateFrom}${toPosName}${toOrgName ? ' ' + toOrgName : ''}${toPosAccrualSum}.`
          text = text.replace('</b> ', ' </b>')
          result.items.push({
            toOrder: toOrder,
            indent: 1,
            index: `${cnt === 1 && taskDet.tasks.length === 0 ? '' : (index++) + '. '}`, // `${index++}. `,
            // index: `${index++}. `,
            text: text
          })
        }
      }
    }

    let title = result.titleOrder || ''
    if (cnt > 0 && !title) {
      if (dismDet.length !== 0 && transferDet.length === 0) {
        title = UB.i18n('Про звільнення')
      }
      if (dismDet.length === 0 && transferDet.length !== 0) {
        title = UB.i18n('Про переведення')
      }
    }
    if (cnt === 1) {
      const item = orderDet.filter(el => el.empOrderType !== 'TASK')[0]
      const genEmpInfo = HR.reportUtils.getInfoItemOrderInCase(item, 'gen', false, result.notUseMiddleNameInOrder)
      const titleName = item['employeePositionID.positionID.positionType'] === '4' ? '' : HR.reportUtils.getShortFIO(genEmpInfo.empName)
      result.titleOrder = `${title || ''}${title && titleName ? '<br/>' : ''}${titleName || ''}`
    } else if (cnt !== 0) {
      // const cnt = orderDet.filter(item => item.empOrderType === 'DISM' && _.find(dismDet, { ID: item.ID })).length +
      //    orderDet.filter(item => item.empOrderType === 'TRANSFER' && _.find(transferDet, { ID: item.ID })).length

      result.titleOrder = UB.i18n(`{0}{1}працівників`, title || '', title ? '<br/>' : '')
    }

    if (result.items.length === 1 && (!taskDet.tasks || taskDet.tasks.length === 0)) {
      result.items[0].index = ''
    }
    result.items = result.items.filter(el => el.toOrder)
    result.tasks = taskDet.tasks.map(e => ({
      task: `${index === 1 && taskDet.tasks.length === 1 ? '' : index++ + '. '} ${e.task}${e['positionName'] ? ` ${e['positionName']}` : ''}${e['employeeName'] ? ` ${e['employeeName']}` : ''}.`
    }))

    return result
  },
  getMinDate: function (d1, d2) {
    if (!d1 || !d2) return null
    return d1 < d2 ? d1 : d2
  },
  makeVacSubstitution: function (index, vacSub, vacNameLoc, fioGen, sexType, positionName, employeePosition, dateFrom, positionType, orgGen, showTabNum, notUseMiddleNameInOrder) {
    const items = []
    const sexTypeVac = vacSub.length === 1 ? (vacSub[0]['employeePositionID.employeeID.sexType'] === 'W' ? UB.i18n('призначеній') : UB.i18n('призначеному')) : UB.i18n('призначеним')
    vacSub.forEach((el) => {
      let posName = ''
      if (employeePosition[el.employeePositionID]) {
        const posInfo = HR.reportUtils.getInfoItemOrderInCase(employeePosition[el.employeePositionID][0], 'dat', true, result.notUseMiddleNameInOrder, '')
        posName = posInfo.posName
      }

      const tabNum = showTabNum && el['employeePositionID.employeeNumberID.tabNum'] ? UB.i18n(`(Таб. №&nbsp;{0})`, el['employeePositionID.employeeNumberID.tabNum']) : ''
      let str = `${HR.reportUtils.formatShortNameInOrder(el['employeePositionID.employeeID.datName'] || el['employeePositionID.employeeID.fullFIO'],
        { notUseMiddleNameInOrder, separator: '&nbsp;' })}`
      str += tabNum ? ' ' + tabNum : ''
      str += posName ? `, ${posName}${orgGen}` : ''
      items.push(str)
    })

    fioGen = HR.reportUtils.formatShortNameInOrder(fioGen, { notUseMiddleNameInOrder, separator: '&nbsp;' })
    return UB.i18n(`{0}ПРОДОВЖИТИ {1}, {2} на цю посаду на період перебування основного працівника `, index, items.join(', '), sexTypeVac) +
        UB.i18n(`{0} у {1}, перебування на цій посаді з&nbsp;{2} `, fioGen, vacNameLoc, AC.dateService.formatDate(AC.dateService.addDays(dateFrom, 1))) +
        UB.i18n(`у зв'язку із звільненням основного працівника {0}.`, fioGen)
  }
}
