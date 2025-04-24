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
      emblem: HR.reportUtils.getEmblem(),
      positionType: null,
      positionTypeActing: null,
      isPrintAddon: false,
      addons: [],
      type: { mission_training: false, mission: false },
      isNeedReport: false,
      line: '_'.repeat(30),
      funcOrgType: false, // 'Загальна' сфера діяльності організації
      organizationNameGen:  order['organizationID.nameGen'] || order['organizationID.name'] || '',
      titleOrder: (order.titleOrder || '').replace(/&/g, '&nbsp;'),
      preamble: (order.preamble || '').replace(/&/g, '&nbsp;'),
      generalOrg: AC.settings.get('hrFuncOrgType', order.masterOrganizationID || order.organizationID) === '1'
    }
    result.generalOrgForText = result.generalOrg

    await HR.reportUtils.getOrderPrintConfig(result, order.subOrganization ? order.masterOrganizationID : order.organizationID)
    const orgGen = order.subOrganization && (order['organizationID.nameGen'] || order['organizationID.name'])
      ? ' ' + (order['organizationID.nameGen'] || order['organizationID.name']) : ''
    const boldFormatBegin = result.normalFullName ? '' : '<b>'
    const boldFormatEnd = result.normalFullName ? '' : '</b>'

    const orderDet = await HR.reportUtils.getEmpOrderDet(ID, order.orderDate || order.entryDate, ['isGroup', 'departmentID'], [['empOrderType', 'in', ['MISSION', 'MISSION_TRAINING']]], true)

    const missionDet = await UB.Repository('hr_empOrderMissionDet')
      .attrs(['ID', 'dateFrom', 'dateTo', 'dayCount', 'destOrganizationName', 'cityName', 'purpose', 'reason', 'isNeedReport', 'phrase',
        'destOrganizationID.fullNameGen', 'destOrganizationID.fullName', 'isInsideCountry', 'countryID.name',
        'dictSpecialityID.name', 'dictTrainingKindID.name',
        'dictTrainingTopicName', 'dictTrainingTopicID.name', 'dictProfCompDevelopFormID.name',
        'cityID', 'cityID.name', 'cityID.cityTypeID.code', 'dictSpecialtyID.name',
        'cityID.parentAdminUnitID.adminUnitType', 'cityID.parentAdminUnitID.name',
        'cityID.parentAdminUnitID.parentAdminUnitID.adminUnitType', 'cityID.parentAdminUnitID.parentAdminUnitID.name'
      ])
      .where('orderID', '=', ID)
      .orderBy('itemIdx')
      .selectAsObject()
    const actDet = await UB.Repository('hr_empOrderActingDet')
      .attrs(['ID', 'paraID', 'dateFrom', 'dateTo', 'employeePositionID', 'condition', 'payForExtraLoad', 'employeeNumberID.tabNum',
        'employeeID', 'employeeID.accusativeName', 'employeeID.datName', 'employeeID.shortFIO', 'employeeID.fullFIO',
        'payElID.calcAlgorithm', 'positionID.positionType'])
      .where('orderID', '=', ID)
      .orderBy('itemIdx')
      .selectAsObject()
    await HR.reportUtils.checkEmployeeChange(order.orderDate, ['fullFIO', 'accusativeName', 'datName', 'shortFIO'], actDet)

    const taskDet = await HR.reportUtils.getTask(ID, order.orderDate || order.entryDate, result.generalOrg ? false : order.showTabNum, result.notUseMiddleNameInOrder)

    const finSource = await UB.Repository('hr_missionFinSource')
      .attrs(['ID', 'paraID', 'dictMissionCostCategoryID.name', 'organizationID.nameGen', 'organizationID.name', 'organizationName'])
      .where('orderID', '=', ID)
      .selectAsObject()

    let matTransfer = await UB.Repository('hr_empOrderMaterialtransferDet')
      .attrs(['ID', 'employeePositionID', 'toEmployeePositionID', 'departmentID',
        'employeePositionID.employeeID', 'employeePositionID.employeeID.genName', 'employeePositionID.employeeID.fullFIO',
        'toEmployeePositionID.employeeID', 'toEmployeePositionID.employeeID.datName', 'toEmployeePositionID.employeeID.fullFIO'])
      .where('orderID', '=', ID)
      .orderBy('itemIdx')
      .selectAsObject()
    await HR.reportUtils.checkEmployeeChange(order.orderDate, ['fullFIO', 'genName'], matTransfer, undefined, 'employeePositionID.employeeID')
    await HR.reportUtils.checkEmployeeChange(order.orderDate, ['fullFIO', 'datName'], matTransfer, undefined, 'toEmployeePositionID.employeeID')

    const commission = await UB.Repository('hr_commission')
      .attrs(['orderDetID', 'employeePositionID.employeeID', 'employeePositionID.employeeID.fullFIO', 'memberType.name'])
      .where('orderID', '=', ID)
      .where('memberType.mi_deleteDate', '>=', '#maxdate')
      .orderBy('memberType')
      .orderBy('lineNum')
      .selectAsObject()
    await HR.reportUtils.checkEmployeeChange(order.orderDate, ['fullFIO'], commission, undefined, 'employeePositionID.employeeID')

    const employeePositionIDs = matTransfer && matTransfer.length > 0 ? _.uniq(matTransfer.map(el => el.toEmployeePositionID)) : []
    employeePositionIDs.push(...matTransfer && matTransfer.length > 0 ? _.uniq(matTransfer.map(el => el.employeePositionID)) : [])
    employeePositionIDs.push(...actDet && actDet.length > 0 ? _.uniq(actDet.map(el => el.employeePositionID)) : [])
    const useSexType = AC.settings.get('hrUseSexTypeInOrders', order.masterOrganizationID || order.organizationID) === true
    let employeePosition = employeePositionIDs && employeePositionIDs.length > 0
      ? await HR.reportUtils.getPromiseEmployeePositionForOrders(employeePositionIDs, order.masterOrganizationID || order.organizationID, order.organizationID, order.orderDate || order.entryDate, ['Nom', 'Gen', 'Dat', 'Acc'], useSexType)
      : []
    employeePosition = employeePosition && employeePosition.length > 0 ? _.groupBy(employeePosition, 'ID') : []

    const orgRespPosition = []

    matTransfer = matTransfer && matTransfer.length ? _.groupBy(matTransfer, item => {
      return orderDet.find(el => el.employeePositionID === item.employeePositionID) ? item.employeePositionID : 0
    }) : []

    const flt = orderDet.filter(item => _.find(missionDet, { ID: item.ID }))
    const orderDetFiltered = flt.filter(item => orderDet.filter(itm => itm.paraID === item.ID && itm.ID !== item.ID).length > 0)
    result.isPrintAddon = result.generalOrg ? false : order.isAppendix // missionDet.filter(item => item.isPrintAddon && _.find(orderDetFiltered, {ID: item.ID})).length >= 1

    let isMoreEmp = orderDetFiltered.length > 1
    let employeeTitle = ''

    let itemIdx = 0
    for (let i = 0; i < orderDet.length; i++) {
      const item = orderDet[i]
      const missionDetItem = missionDet.find(o => o.ID === item.ID)
      if (missionDetItem) {
        const finSourceItem = finSource.filter(o => o.paraID === item.ID)
        const training = item['empOrderType'] === 'MISSION_TRAINING'
        result.type.mission_training = item['empOrderType'] === 'MISSION_TRAINING' ? true : result.type.mission_training
        result.type.mission = item['empOrderType'] === 'MISSION' ? true : result.type.mission

        let cityName = missionDetItem['cityID.name'] || missionDetItem['cityName'] || ''
        cityName = (cityName.length && missionDetItem['cityID'] && missionDetItem['cityID.cityTypeID.code'] ? missionDetItem['cityID.cityTypeID.code'] : '') + cityName
        if (cityName && missionDetItem.isInsideCountry) {
          if (missionDetItem['cityID.parentAdminUnitID.name'] && missionDetItem['cityID.parentAdminUnitID.adminUnitType'] !== 'COUNTRY') {
            cityName += ', ' + missionDetItem['cityID.parentAdminUnitID.name']
            if (missionDetItem['cityID.parentAdminUnitID.parentAdminUnitID.name'] && missionDetItem['cityID.parentAdminUnitID.parentAdminUnitID.adminUnitType'] !== 'COUNTRY') {
              cityName += ', ' + missionDetItem['cityID.parentAdminUnitID.parentAdminUnitID.name']
            }
          }
        }

        let destOrg = missionDetItem['destOrganizationID.fullName'] || missionDetItem['destOrganizationName'] || ''
        destOrg = (!missionDetItem.isInsideCountry && missionDetItem['countryID.name'] ? missionDetItem['countryID.name'] + (destOrg.length ? ', ' : '') : '') + destOrg

        if (result.generalOrgForText) {
          destOrg = destOrg ? UB.i18n(`в {0}`, destOrg) : ''
        } else {
          destOrg = destOrg ? `(${destOrg})` : ''
        }

        let destPoint = cityName ? UB.i18n(` до {0}`, cityName) : ''
        if (destOrg) {
          destPoint += destPoint ? ` ${destOrg}` : UB.i18n(` до {0}`, destOrg)
        }

        const missionGroupItems = orderDet.filter(itm => itm.paraID === item.ID && itm.ID !== item.ID)
        if (item.isGroup && missionGroupItems && missionGroupItems.length) {
          if (training) {
            missionDetItem.dictTrainingTopicName = missionDetItem['dictTrainingTopicName'] || missionDetItem['dictTrainingTopicID.name'] || ''
            // missionDetItem.dictTrainingTopicName = missionDetItem.dictTrainingTopicName ? `"${missionDetItem.dictTrainingTopicName}"` : ''

            if (!result.generalOrgForText && missionDetItem['dictSpecialtyID.name']) {
              missionDetItem.dictTrainingTopicName += (missionDetItem.dictTrainingTopicName ? ' ' : '') + missionDetItem['dictSpecialtyID.name']
            }

            missionDetItem['dictProfCompDevelopFormID.name'] = missionDetItem['dictProfCompDevelopFormID.name'] || ''
            missionDetItem.dictTrainingTopicName += (missionDetItem['dictProfCompDevelopFormID.name'] && missionDetItem.dictTrainingTopicName ? ' ' : '') + (missionDetItem['dictProfCompDevelopFormID.name'] ? `(${missionDetItem['dictProfCompDevelopFormID.name']})` : '')

            if (result.generalOrgForText && missionDetItem['dictTrainingKindID.name']) {
              missionDetItem.dictTrainingTopicName = UB.i18n(`на {0}`, missionDetItem['dictTrainingKindID.name'])
            }
          } else {
            missionDetItem.dictTrainingTopicName = ''
          }

          const day = AC.dateService.plural(UB.i18n('календарний день_календарних дні_календарних днів'), missionDetItem['dayCount'])
          const dateFrom = AC.dateService.formatDate(missionDetItem['dateFrom'])
          const dateTo = missionDetItem['dateTo'] ? UB.i18n(' по&nbsp;') + AC.dateService.formatDate(missionDetItem['dateTo']) : ''
          let purpose = missionDetItem['purpose'] ? missionDetItem['purpose'] : ''
          if (training && missionDetItem.dictTrainingTopicName.length) {
            purpose += (purpose.length ? ' ' : '') + missionDetItem.dictTrainingTopicName
          }
          const specialty = result.generalOrgForText && training && missionDetItem['dictSpecialityID.name'] ? UB.i18n(` зі спеціальності {0}`, missionDetItem['dictSpecialityID.name']) : ''

          const groupLen = missionGroupItems.length
          isMoreEmp = (groupLen > 1) // true
          // result.generalOrg = groupLen === 1 ? false : result.generalOrg // UBHR-20333

          const addons = result.isPrintAddon ? {
            countryName: !missionDetItem.isInsideCountry && missionDetItem['countryID.name'] ? missionDetItem['countryID.name'] : '',
            cityName: cityName,
            orgName: missionDetItem['destOrganizationID.fullName'] || missionDetItem['destOrganizationName'] || '',
            purpose: purpose,
            items: []
          } : []
          purpose = (purpose ? ' ' : '') + (missionDetItem['purpose'] ? UB.i18n('з метою ') : '') + purpose
          let genOrgObj
          if (result.generalOrg) {
            genOrgObj = {
              toOrder: true,
              itemIdxTxt: ++itemIdx + '. ',
              text: UB.i18n(`{0} працівників {1}{2}`, training ? UB.i18n('НАПРАВИТИ') : UB.i18n('ВІДРЯДИТИ'), result.organizationNameGen, destPoint) +
               UB.i18n(` строком на {0}&nbsp;{1} з&nbsp;{2}{3}{4}{5}:`, missionDetItem['dayCount'], day, dateFrom, dateTo, purpose, specialty),
              twoColumns: 0
            }
            result.mission.push(genOrgObj)
          }

          let countToOrder = 0
          for (let j = 0; j < groupLen; j++) {
            const missionGroupItem = missionGroupItems[j]
            const toOrder = orderExtract && orderExtract.ID
              ? ((orderExtract.departmentID ? orderExtract.departmentID === missionGroupItem.departmentID : true) && (orderExtract.employeePositionID ? orderExtract.employeePositionID === missionGroupItem.employeePositionID : true))
              : true
            countToOrder += toOrder ? 1 : 0
            const isOrgBoss = missionGroupItem['employeePositionID.positionID.isOrgBoss']
            missionGroupItem['employeePositionID.positionID.isOrgBoss'] = result.isPrintAddon || groupLen > 1 || isMoreEmp ? false : missionGroupItem['employeePositionID.positionID.isOrgBoss']
            result.showOrder = result.showOrder ? !missionGroupItem['employeePositionID.positionID.isOrgBoss'] : false
            result.positionType = missionGroupItem['employeePositionID.positionID.positionType'] === '1' && (result.positionType || true)

            const posInfo = HR.reportUtils.getInfoItemOrderInCase(missionGroupItem, result.isPrintAddon ? 'nom' : 'acc', !result.isPrintAddon, result.notUseMiddleNameInOrder)
            const posName = (posInfo.posName.length > 0) ? ', ' + HR.reportUtils.makePositionName(posInfo.posName, isOrgBoss) + orgGen : ''
            const empInfo = HR.reportUtils.getEmpIncaseInfo(missionGroupItem, 'gen', true)
            employeeTitle = HR.reportUtils.formatShortNameInOrder(empInfo.empName, { notUseMiddleNameInOrder: result.notUseMiddleNameInOrder })
            const datEmpInfo = HR.reportUtils.getEmpIncaseInfo(missionGroupItem, 'dat', true)

            let finSource = ''
            if (finSourceItem && finSourceItem.length > 0) {
              finSource = finSourceItem.map(item => {
                const org = item['organizationID.nameGen'] || item['organizationID.name'] || item['organizationName'] || ''
                return ` ${item['dictMissionCostCategoryID.name'] || ''} ${org ? UB.i18n(' здійснюється за рахунок ') + org : ''}`
              }).join(', ')
            }

            const actDetItems = actDet.filter(itm => itm.paraID === missionGroupItem.ID)
            let lastChar = result.generalOrg && ((j < groupLen - 1) || actDetItems.length ||
              (missionDetItem.isNeedReport && missionDetItem.phrase) || finSource.length ||
              (matTransfer[missionGroupItem.employeePositionID] && matTransfer[missionGroupItem.employeePositionID].length))
              ? ';' : '.'
            const tabNum = showTabNum && missionGroupItem['employeeNumberID.tabNum'] ? UB.i18n(`(Таб. №&nbsp;{0})`, missionGroupItem['employeeNumberID.tabNum']) : ''

            if (result.isPrintAddon) {
              addons.items.push({
                toOrder: toOrder,
                index: addons.items.length + 1,
                empName: posInfo.empName + (tabNum ? ' ' + tabNum : ''),
                empID: missionGroupItem.employeePositionID,
                posName: posInfo.posName ? posInfo.posName + orgGen : '',
                period: UB.i18n(`з&nbsp;{0}{1} ({2}&nbsp;{3})`, dateFrom, dateTo, missionDetItem['dayCount'], day),
                finSource: finSource || UB.i18n(`за рахунок {0}`, result.organizationNameGen),
                acting: []
              })
            } else {
              // В довіднику "Відповідальні особи організації" знайти для поточної організації записи де "Відповідальна особа"= "Керівник організації"
              let mainChief = _.find(orgRespPosition, { positionID: missionGroupItem['employeePositionID.positionID'], organizationID: missionGroupItem['organizationID'] })
              if (!mainChief) {
                const respData = await UB.Repository('hr_orgRespPosition')
                  .attrs(['positionID', 'organizationID'])
                  .where('positionID', '=', missionGroupItem['employeePositionID.positionID'])
                  .where('organizationID', '=', missionGroupItem['organizationID'])
                  .where('[dateFrom]', '<=', missionDetItem['dateFrom'])
                  .where('[dateTo]', '>=', missionDetItem['dateFrom'], 'dt1')
                  .where('[dateTo]', 'isNull', undefined, 'dt2')
                  .where('respPosition', 'in', 'mainChief')
                  .where('mi_deleteDate', '>=', '#maxdate')
                  .logic('([dt1] OR [dt2])')
                  .selectAsObject()
                if (respData && respData.length) {
                  orgRespPosition.push({
                    isBoss: true,
                    positionID: missionGroupItem['employeePositionID.positionID'],
                    organizationID: missionGroupItem['organizationID']
                  })
                  mainChief = true
                } else {
                  orgRespPosition.push({
                    isBoss: false,
                    positionID: missionGroupItem['employeePositionID.positionID'],
                    organizationID: missionGroupItem['organizationID']
                  })
                }
              } else {
                mainChief = mainChief.isBoss
              }
              missionGroupItem['employeePositionID.positionID.isOrgBoss'] = mainChief
              let orderWord = missionGroupItem['employeePositionID.positionID.isOrgBoss']
                ? UB.i18n('Відбуваю')
                : training && result.generalOrgForText ? UB.i18n('Направити') : UB.i18n('Відрядити')
              orderWord = result.smallOrderWord ? orderWord : orderWord.toUpperCase()

              result.mission.push({
                toOrder: toOrder,
                itemIdxTxt: result.generalOrg ? isMoreEmp ? `${itemIdx}.${j + 1}. ` : '' : ++itemIdx + '. ',
                text: result.generalOrg
                  ? `${boldFormatBegin}${posInfo.empName}${boldFormatEnd}${posName}${lastChar}`
                  : (missionGroupItem['employeePositionID.positionID.isOrgBoss'] ? orderWord + ' ' : `${orderWord} ${boldFormatBegin}${posInfo.empName}${tabNum ? ' ' + boldFormatEnd + tabNum : boldFormatEnd}`) +
                    `${missionGroupItem['employeePositionID.positionID.isOrgBoss'] ? '' /* posInfo.posName */ : posName}` +
                    UB.i18n(`{0} строком на {1}&nbsp;{2},`, destPoint, missionDetItem['dayCount'], day) +
                    UB.i18n(` з&nbsp;{0}{1}{2}{3}.`, dateFrom, dateTo, purpose, specialty),
                twoColumns: result.generalOrg,
                noIndent: 1
              })
            }
            if (result.generalOrg) {
              missionGroupItem['employeePositionID.positionID.isOrgBoss'] = false // ignore this
            }

            lastChar = result.generalOrg && ((j < groupLen - 1) ||
            (missionDetItem.isNeedReport && missionDetItem.phrase) || finSource.length ||
            (matTransfer[missionGroupItem.employeePositionID] && matTransfer[missionGroupItem.employeePositionID].length))
              ? ';' : '.'
            const accRes = await me.addActing(missionGroupItem, actDetItems, result.isPrintAddon ? addons.items : result.mission, order.orderDate || order.entryDate, employeePosition, result.isPrintAddon, training, result.generalOrg || isMoreEmp ? '' : itemIdx, result.generalOrg, lastChar, orgGen, toOrder, isOrgBoss, showTabNum, result.notUseMiddleNameInOrder)
            if (accRes.length) {
              result.positionTypeActing = accRes.positionType && (result.positionTypeActing || true)
            }
            if (!result.isPrintAddon && !isMoreEmp && !result.generalOrg && accRes.length > 0) {
              ++itemIdx
            }
            if (missionDetItem.isNeedReport && missionDetItem.phrase) {
              result.isNeedReport = true
              if (!result.isPrintAddon) {
                result.mission.push({
                  toOrder: toOrder,
                  itemIdxTxt: result.generalOrg || isMoreEmp ? '' : ++itemIdx + '. ',
                  text: HR.reportUtils.formatShortNameInOrder(datEmpInfo.empName, { notUseMiddleNameInOrder: result.notUseMiddleNameInOrder }) + ' ' + missionDetItem.phrase + lastChar,
                  twoColumns: result.generalOrg
                })
              }
            }

            lastChar = result.generalOrg && ((j < groupLen - 1) ||
            (matTransfer[missionGroupItem.employeePositionID] && matTransfer[missionGroupItem.employeePositionID].length))
              ? ';' : '.'
            if (!result.isPrintAddon && finSource.length) {
              result.mission.push({
                toOrder: toOrder,
                itemIdxTxt: result.generalOrg || isMoreEmp ? '' : ++itemIdx + '. ',
                text: UB.i18n(`Фінансування {0}{1}`, finSource, lastChar),
                twoColumns: isMoreEmp ? result.generalOrg : false
              })
            }

            lastChar = result.generalOrg && (j < groupLen - 1) ? ';' : '.'
            if (!result.isPrintAddon && matTransfer[missionGroupItem.employeePositionID]) {
              const cnt = me.getMatTransferInfo(result.mission, matTransfer[missionGroupItem.employeePositionID], commission, employeePosition, result.generalOrg || isMoreEmp ? '' : itemIdx, result.generalOrg, lastChar, orgGen, toOrder, showTabNum, result.notUseMiddleNameInOrder)
              itemIdx += cnt
              // чтобы избежать задвоения вывода инфрмации о мат. ценностях для сотрудника, если он в приказе более одного раза
              matTransfer[missionGroupItem.employeePositionID] = []
            }

            if (!result.generalOrg && missionDetItem.reason) {
              result.mission.push({
                itemIdxTxt: '',
                toOrder: toOrder,
                text: UB.i18n(`Підстава: {0}.`, missionDetItem.reason),
                twoColumns: 0
              })
            }
          }
          if (result.generalOrg && countToOrder === 0) {
            genOrgObj.toOrder = false
          }
          if (result.generalOrg && missionDetItem.reason) {
            result.mission.push({
              itemIdxTxt: '',
              toOrder: genOrgObj.toOrder,
              text: UB.i18n(`Підстава: {0}.`, missionDetItem.reason),
              twoColumns: 0
            })
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
        }
      }
    }

    if (result.isPrintAddon && result.addons.length > 0) {
      let orderWord = UB.i18n('Відрядити')
      orderWord = result.smallOrderWord ? orderWord : orderWord.toUpperCase()
      if (result.type.mission) {
        result.mission.push({
          toOrder: true,
          itemIdxTxt: ++itemIdx + '. ',
          text: UB.i18n(`{2} {0} {1} згідно із додатком.`, result.positionType ? UB.i18n('державних службовців') : UB.i18n('працівників'), result.organizationNameGen, orderWord),
          twoColumns: 0
        })
      }
      if (result.type.mission_training) {
        result.mission.push({
          toOrder: true,
          itemIdxTxt: ++itemIdx + '. ',
          text: UB.i18n(`{2} {0} {1} на навчання згідно із додатком.`, result.positionType ? 'державних службовців' : 'працівників', result.organizationNameGen, orderWord),
          twoColumns: 0
        })
      }
    }
    if (result.isPrintAddon && result.addons.length > 0 && actDet.length > 0) {
      result.mission.push({
        toOrder: true,
        itemIdxTxt: ++itemIdx + '. ',
        text: UB.i18n('Виконання обов’язків окремих ') + (result.positionType ? UB.i18n('державних службовців') : UB.i18n('працівників')) + UB.i18n(' покласти на осіб, визначених у додатку.'),
        twoColumns: 0
      })
    }
    if (result.isPrintAddon && result.addons.length > 0 && result.isNeedReport) {
      result.mission.push({
        toOrder: true,
        itemIdxTxt: ++itemIdx + '. ',
        text: (result.positionType ? UB.i18n('Державним службовцям') : UB.i18n('Працівникам')) + UB.i18n(`, направленим у відрядження{0}, подати звіт про відрядження в установленому законодавством порядку.`, result.training ? UB.i18n(' на навчання') : ''),
        twoColumns: 0
      })
    }

    if (missionDet.length === 1 && !isMoreEmp) {
      result.titleOrder = `${result.titleOrder || ''}${result.titleOrder && employeeTitle ? '<br/>' : ''}${employeeTitle}`
    } else if (missionDet.length !== 0) {
      if (result.titleOrder) {
        result.titleOrder = `${result.titleOrder || ''}${result.titleOrder ? '<br/>' : ''}${UB.i18n('працівників')}`
      }
    }

    if (!result.isPrintAddon && matTransfer[0]) {
      for (let i = 0; i < matTransfer[0].length; i++) {
        const item = matTransfer[0][i]
        item.toOrder = orderExtract && orderExtract.ID
          ? ((orderExtract.departmentID ? orderExtract.departmentID === item.departmentID : true) && (orderExtract.employeePositionID ? orderExtract.employeePositionID === item.employeePositionID : true))
          : true
      }

      const cnt = me.getMatTransferInfo(result.mission, matTransfer[0], commission, employeePosition, itemIdx, false, '..', orgGen, true, showTabNum, result.notUseMiddleNameInOrder)
      itemIdx += cnt
    }
    if (result.mission.length === 1 && actDet.length === 0 && (!taskDet.tasks || taskDet.tasks.length === 0)) {
      result.mission[0].itemIdxTxt = ''
    }

    result.mission = result.mission.filter(el => el.toOrder)

    result.organizationNameGen = order.subOrganization
      ? order['masterOrganizationID.nameGen'] || order['masterOrganizationID.name'] || ''
      : order['organizationID.nameGen'] || order['organizationID.name'] || ''

    result.tasks = taskDet.tasks.map(e => ({
      task: `${itemIdx === 0 && taskDet.tasks.length === 1 ? '' : ++itemIdx + '. '}${e.task}${e['positionName'] ? ` ${e['positionName']}` : ''}${e['employeeName'] ? ` ${e['employeeName']}` : ''}.`
    }))
    result.positionType = UB.i18n(`{0}, що направляються у відрядження`, result.positionType ? UB.i18n('Державні службовці') : UB.i18n('Працівники'))
    result.positionTypeActing = result.positionTypeActing ? UB.i18n('державного службовця') : UB.i18n('працівника')
    return result
  },

  getMatTransferInfo: function (res, matTransfer, commission, employeePosition, index, generalOrg, lastChar, orgGen, toOrder, showTabNum, notUseMiddleNameInOrder) {
    if (!matTransfer) {
      return 0
    }
    matTransfer.forEach((matTransItem, indx) => {
      const toEmpName = HR.reportUtils.formatShortNameInOrder(matTransItem['toEmployeePositionID.employeeID.datName'] || matTransItem['toEmployeePositionID.employeeID.fullFIO'] || '', { notUseMiddleNameInOrder })
      const tabNumTo = showTabNum && matTransItem['toEmployeePositionID.employeeNumberID.tabNum'] ? UB.i18n(` (Таб. №&nbsp;{0})`, matTransItem['toEmployeePositionID.employeeNumberID.tabNum']) : ''
      let toPosName = ''
      if (employeePosition[matTransItem.toEmployeePositionID]) {
        const posInfo = HR.reportUtils.getInfoItemOrderInCase(employeePosition[matTransItem.toEmployeePositionID][0], 'dat', false, notUseMiddleNameInOrder, '')
        toPosName = posInfo.posName || ''
      }
      const fromEmpName = HR.reportUtils.formatShortNameInOrder(matTransItem['employeePositionID.employeeID.genName'] || matTransItem['employeePositionID.employeeID.fullFIO'] || '', { notUseMiddleNameInOrder })
      const tabNumFrom = showTabNum && matTransItem['employeeNumberID.tabNum'] ? UB.i18n(` (Таб. №&nbsp;{0})`, matTransItem['employeeNumberID.tabNum']) : ''
      let fromPosName = ''
      if (employeePosition[matTransItem.employeePositionID]) {
        const posInfo = HR.reportUtils.getInfoItemOrderInCase(employeePosition[matTransItem.employeePositionID][0], 'gen', false, notUseMiddleNameInOrder, '')
        fromPosName = posInfo.posName || ''
      }
      const header = UB.i18n(`{0}{1}, прийняти матеріальні цінності від {2}{3} по акту прийому-передачі`, toEmpName + (tabNumTo ? ' ' + tabNumTo : ''), toPosName ? ', ' + toPosName + orgGen : '', fromEmpName + (tabNumFrom ? ' ' + tabNumFrom : ''), fromPosName ? ', ' + fromPosName + orgGen : '')
      const members = []
      commission.filter(el => el.orderDetID === matTransItem.ID).forEach(item => {
        members.push(`${HR.reportUtils.formatShortNameInOrder(item['employeePositionID.employeeID.fullFIO'] || '', { notUseMiddleNameInOrder })}${item['memberType.name'] ? ' - ' + HR.nameCase.uncap(item['memberType.name']) : ''}`)
      })
      res.push({
        toOrder: lastChar === '..' ? matTransItem.toOrder : toOrder,
        itemIdxTxt: index || lastChar === '..' ? ++index + '. ' : '',
        text: UB.i18n(`{0}{1}. Акт прийому-передачі подати в бухгалтерію`, header, members.length ? UB.i18n(' при участі комісії у складі: ') + members.join(', ') : '') +
            `${lastChar === '..' ? '.' : indx < matTransfer.length - 1 ? ';' : lastChar}`,
        twoColumns: generalOrg
      })
    })
    return index ? matTransfer.length : 0
  },

  addActing: async function (orderItem, actDetItems, items, orderDate, positions, isPrintAddon, training, index, generalOrg, lastChar, orgGen, toOrder, isOrgBoss, showTabNum, notUseMiddleNameInOrder) {
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
    if (actDetItems.length > 0) {
      if (!isPrintAddon && (actDetItems.length > 1 || (actDetItems.length === 1 && actDetItems[0].payForExtraLoad))) {
        items.push({
          toOrder: toOrder,
          itemIdxTxt: index ? ++index + '. ' : '',
          text: UB.i18n(`На період відрядження{0} {1}:`, training ? UB.i18n(' на навчання') : '', actingEmpName),
          twoColumns: generalOrg
        })
      }
      for (let j = 0; j < actDetItems.length; j++) {
        const actDetItem = actDetItems[j]
        let respEmpName = '____________________'
        let respPosName = ''

        if (positions[actDetItem.employeePositionID]) {
          const posInfo = HR.reportUtils.getInfoItemOrderInCase(positions[actDetItem.employeePositionID][0], isPrintAddon ? 'nom' : 'acc', !isPrintAddon, notUseMiddleNameInOrder, '')
          respPosName = posInfo.posName || ''
        }

        const tabNum = showTabNum && actDetItem['employeeNumberID.tabNum'] ? UB.i18n(` (Таб. №&nbsp;{0})`, actDetItem['employeeNumberID.tabNum']) : ''
        respEmpName = (isPrintAddon
          ? HR.reportUtils.formatShortNameInOrder(actDetItem['employeeID.shortFIO'] || '', { notUseMiddleNameInOrder })
          : HR.reportUtils.formatShortNameInOrder(actDetItem['employeeID.accusativeName'] || actDetItem['employeeID.shortFIO'] || '', { notUseMiddleNameInOrder })) +
          (tabNum ? ' ' + tabNum : '')
        positionType = actDetItem['positionID.positionType'] === '1' && positionType
        respPosName = respPosName ? (orderItem['employeePositionID.positionID.isOrgBoss'] ? '' : ', ') + respPosName + orgGen : respPosName

        const condition = actDetItem['condition'] ? ' ' + actDetItem['condition'] : ''
        const dateTo = !condition.length && actDetItem['dateTo'] ? UB.i18n(' по&nbsp;') + AC.dateService.formatDate(actDetItem['dateTo']) : ''
        const dateFrom = actDetItem['dateFrom'] ? `${!condition.length && !dateTo.length ? UB.i18n('на') : UB.i18n('з')}&nbsp;${AC.dateService.formatDate(actDetItem['dateFrom'])}` : ''

        if (isPrintAddon) {
          const el = _.find(items, { empID: orderItem.employeePositionID })
          const endPoint = j === actDetItems.length - 1 ? '.' : ';<br />'
          if (el) {
            el.acting.push({
              text: `${respEmpName}${respPosName}${dateFrom || dateTo || condition ? ' (' : ''}${dateFrom}${dateTo}${condition}${dateFrom || dateTo || condition ? ')' : ''}${endPoint}`
            })
          }
        } else {
          if (actDetItems.length === 1 && !actDetItem.payForExtraLoad) {
            if (orderItem['employeePositionID.positionID.isOrgBoss']) {
              items.push({
                toOrder: toOrder,
                itemIdxTxt: index ? ++index + '. ' : '',
                text: UB.i18n(`На період перебування у відрядженні{0} виконання обов’язків покладаю на {1}{2}{3}.`, training ? UB.i18n(' на навчання') : '', respPosName, respPosName.length ? ' ' : '', respEmpName),
                twoColumns: generalOrg
              })
            } else {
              items.push({
                toOrder: toOrder,
                itemIdxTxt: index ? ++index + '. ' : '',
                text: UB.i18n(`На період відрядження{0} {1} виконання обов'язків {2} покласти на {3}{4} {5}{6}{7}{8}`, training ? UB.i18n(' на навчання') : '', actingEmpName, actingPosName, respEmpName, respPosName, dateFrom, dateTo, condition, lastChar),
                twoColumns: generalOrg
              })
            }
          } else {
            let endPoint = j === actDetItems.length - 1 && !actDetItem.payForExtraLoad ? lastChar : ';'
            items.push({
              toOrder: toOrder,
              itemIdxTxt: '',
              text: UB.i18n(`- виконання обов’язків {0}{1}{2} {3}{4}{5}{6}`, orderItem['employeePositionID.positionID.isOrgBoss'] ? UB.i18n('покладаю на ') : actingPosName + UB.i18n(' покласти на '), respEmpName, respPosName, dateFrom, dateTo, condition, endPoint),
              twoColumns: generalOrg
            })
            if (actDetItem.payForExtraLoad || (actDetItem['payElID.calcAlgorithm'] && actDetItem['payElID.calcAlgorithm'] === '1')) {
              endPoint = j === actDetItems.length - 1 ? lastChar : ';'
              const positionTypeAct = actDetItem['positionID.positionType'] === '1'
              items.push({
                toOrder: toOrder,
                itemIdxTxt: '',
                text: UB.i18n(`- встановити {0} `, HR.reportUtils.formatShortNameInOrder(actDetItem['employeeID.datName'] || actDetItem['employeeID.fullFIO'], { notUseMiddleNameInOrder })) +
                    UB.i18n(`виплату за додаткове навантаження у зв’язку з виконанням обов’язків тимчасово відсутнього {0} `, positionTypeEmp ? UB.i18n('державного службовця') : UB.i18n('працівника')) +
                    me.getExtraLoadInfo(actDetItem.payForExtraLoad, actDetItem['payElID.calcAlgorithm'], positionTypeAct, positionType, endPoint),
                twoColumns: generalOrg
              })
            }
          }
        }
      }
    }
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
