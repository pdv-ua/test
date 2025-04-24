/* global _ UB AC HR appAC */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    let documentOrderType = null
    if (reportParams.caller && reportParams.caller.attr && reportParams.caller.attr.documentOrderType && reportParams.caller.attr.documentOrderType.getValue()) {
      documentOrderType = reportParams.caller.attr.documentOrderType.getValue() || 'ORDER'
    }
    return me.getReportData(reportParams.instanceID, reportParams.params ? reportParams.params.orderExtraID || 0 : 0, documentOrderType).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (ID, orderExtraID, documentOrderType) {
    const me = this
    const result = {
      emblem: HR.reportUtils.getEmblem(),
      funcOrgType: false,
      Accrual: true,
      showTaxCode: false,
      items: []
    }
    const orderExtract = await HR.reportUtils.getEmpOrderExtract(orderExtraID)
    const order = await HR.reportUtils.getEmpOrder(ID)
    if (!order) {
      return {
        emblem: HR.reportUtils.getEmblem()
      }
    }
    const showTabNum = order.showTabNum
    const documentView = AC.settings.get('hrEmpOrderPrintType', order.masterOrganizationID || order.organizationID)
    result.printDocumentView = documentView === documentOrderType ? documentView : documentOrderType
    const responsiblesInfo = await HR.reportUtils.getResponsiblesForOrder(order, result.printDocumentView === 'APPOINTMENT')
    if (!order) {
      return result
    }
    const whereArray = [['empOrderType', 'in', ['APPOINT', 'APPOINT_LIQ', 'APPOINT_MOVE']]]
    const ignoreEmployeePositionID = order.orderState !== 'PROJECT'
    const orderDet = await HR.reportUtils.getEmpOrderDet(ID, order.orderDate || order.entryDate, ['departmentID'], whereArray, true, ignoreEmployeePositionID)
    const orderDetVehicle = await HR.reportUtils.getEmpOrderDet(ID, order.orderDate || order.entryDate, ['departmentID'],
      [['empOrderType', 'in', ['VEHICLEASSIGN']]], true, ignoreEmployeePositionID)
    const appointDet = await UB.Repository('hr_empOrderAppointDet')
      .attrs([
        'ID', 'dateFrom', 'dictAppointKindID.name', 'dictAppointKindID.nameFem', 'mtCount', 'workPlace', 'dateToEmpty', 'empPositionName',
        'employeeID.sexType', 'employeeID',
        'isRankSave', 'isRankAssign', 'isTrialPeriod', 'dateTrialEnd', 'dictRankID.printName', 'dictTrialPeriodID.name',
        'reason', 'accrualSum', 'isTransfer', 'srcOrganizationID.nameGen', 'srcOrganizationID.name', 'srcOrganizationName',
        'vacPositionID', 'vacPositionID.employeeNumberID', 'vacPositionID.employeeID',
        'vacPositionID.employeeID.sexType', 'vacPositionID.employeeID.fullFIO', 'vacPositionID.employeeID.genName',
        'vacPositionID.employeeID.lastName', 'vacPositionID.employeeID.firstName', 'vacPositionID.employeeID.middleName',
        'employeeID.taxCode', 'employeeID.empTaxCodeType', 'posNameAddition',
        // 'dictPositionID.fullNameGen',
        'positionID.positionCategory.name', 'tabNum',
        'dictPositionID', 'dictPositionID.nameGen', 'dictPositionID.nameGenF', 'dictPositionID.name',
        'dictPositionID.nameDat', 'dictPositionID.nameDatF',
        'isByHours', 'planHours', 'workScheduleID.scheduleDescription', 'dictTarifCoeffID', 'dictTarifCoeffID.code',
        'dictFundSourceID', 'dictFundSourceID.genName', 'dictFundSourceID.name',
        'dictEmpCategoryID', 'dictEmpCategoryID.genName', 'dictEmpCategoryID.name',
        'addOrderText'
      ])
      .where('orderID', '=', ID)
      .orderBy('itemIdx')
      .selectAsObject()

    await HR.reportUtils.checkEmployeeChange(order.orderDate, ['lastName', 'firstName', 'middleName', 'fullFIO', 'genName'], appointDet, undefined, 'vacPositionID.employeeID')

    if (result.printDocumentView === 'APPOINTMENT') {
      let titleOrder = (order.titleOrder || '').replace(/&/g, '&nbsp;')
      let titleName = null
      if (appointDet.length === 1) {
        const item = orderDet.filter(el => el.empOrderType !== 'TASK')[0]
        const datEmpInfo = HR.reportUtils.getEmpIncaseInfo(item, 'gen', true)
        titleName = item['employeePositionID.positionID.positionType'] === '4' ? '' : HR.reportUtils.formatShortName(datEmpInfo.empName)
      }
      if (appointDet.length > 1) {
        titleName = UB.i18n(` працівників`)
      }
      result.orderType = UB.i18n('РОЗПОРЯДЖЕННЯ')
      result.mainRespPos = result.printDocumentView === 'APPOINTMENT' && responsiblesInfo.length ? responsiblesInfo[0].respPos || '' : ''

      result.appointmentNumberBlock = [{
        orderDate: AC.dateService.formatDate(order.orderDate) || '________________',
        orderNumber: order.orderNumber || '________________',
        orderIndex: order['dictEmpOrderIndexID.code'] === null ? '' : `/${order['dictEmpOrderIndexID.code']}`
      }]
      result.appointmentTitle = titleOrder
      result.titleName = titleName
      if (order.reason) {
        result.appointmentReason = {
          reason: UB.i18n(`Підстава: {0}.`, order.reason)
        }
      }
      result.appointResponsiblesInfo = responsiblesInfo
    } else {
      let titleOrder = (order.titleOrder || '').replace(/&/g, '&nbsp;')
      if (appointDet.length === 1) {
        const item = orderDet.filter(el => el.empOrderType !== 'TASK')[0]
        const datEmpInfo = HR.reportUtils.getEmpIncaseInfo(item, 'gen', true)
        const titleName = item['employeePositionID.positionID.positionType'] === '4' ? '' : HR.reportUtils.formatShortName(datEmpInfo.empName)
        titleOrder += `${titleOrder && titleName ? '<br/>' : ''}${titleName || ''}`
      }
      if (appointDet.length > 1) {
        titleOrder += UB.i18n(` працівників`)
      }
      result.orderType = orderExtract && orderExtract.ID ? UB.i18n('В И Т Я Г &nbsp;З&nbsp; Н А К А З У') : UB.i18n('Н А К А З')
      result.orderBlock = [{
        organizationName: order.orderOrganizationName
      }]
      result.orderNumberBlock = [{
        orderDate: AC.dateService.getStringFormatDate(order.orderDate, '', '', UB.i18n(' року')),
        city: await HR.reportUtils.getCityName(order.subOrganization ? order.masterOrganizationID : order.organizationID),
        orderNumber: order.orderNumber,
        orderIndex: order['dictEmpOrderIndexID.code'] === null ? '' : `/${order['dictEmpOrderIndexID.code']}`
      }]
      result.titleOrder = titleOrder
      result.printOderDocument = true
      if (order.reason) {
        result.orderReason = {
          reason: UB.i18n(`Підстава: {0}.`, order.reason)
        }
      }
      result.responsiblesInfo = responsiblesInfo
    }

    await HR.reportUtils.getOrderPrintConfig(result, order.subOrganization ? order.masterOrganizationID : order.organizationID)
    const boldFormatBegin = result.normalFullName ? '' : '<b>'
    const boldFormatEnd = result.normalFullName ? '' : '</b>'

    result.preamble = (order.preamble || '').replace(/&/g, '&nbsp;')

    const orgGen = order.subOrganization && (order['organizationID.nameGen'] || order['organizationID.name'])
      ? ' ' + (order['organizationID.nameGen'] || order['organizationID.name']) : ''

    result.funcOrgType = AC.settings.get('hrFuncOrgType', order.masterOrganizationID || order.organizationID) === '1'
    result.showAccrual = AC.settings.get('hrOrderAccrualByStaffTable', order.masterOrganizationID || order.organizationID) === true
    result.showTaxCode = AC.settings.get('hrOrderShowTaxCode', order.masterOrganizationID || order.organizationID) === true
    const showPositionCategory = AC.settings.get('hrOrderРositionCategory', order.masterOrganizationID || order.organizationID) === true

    const useSexType = AC.settings.get('hrUseSexTypeInOrders', order.masterOrganizationID || order.organizationID) === true

    let empOrderFundSource = await UB.Repository('hr_empOrderFundSource')
      .attrs(['paraID', 'dictFundSourceID', 'dictFundSourceID.name', 'dictFundSourceID.genName', 'mtCount'])
      .where('dictFundSourceID.mi_deleteDate', '>=', '#maxdate')
      .where('orderID', '=', ID)
      .selectAsObject()

    let ids = appointDet && appointDet.length > 0 ? _.uniq(appointDet.filter(el => el['vacPositionID.employeeNumberID']).map(el => el['vacPositionID.employeeNumberID'])) : []
    let empLongTermAbsc = await UB.Repository('hr_empLongTermAbsc')
      .attrs(['employeeNumberID', 'dateFrom', 'dateTo', 'orderID', 'paraID'])
      .where('employeeNumberID', 'in', ids)
      .selectAsObject()
    empLongTermAbsc = empLongTermAbsc && empLongTermAbsc.length ? _.groupBy(empLongTermAbsc, 'employeeNumberID') : []

    const orderAcc = await UB.Repository('hr_empOrderAcc')
      .attrs(['payElID.code', 'payElID.name', 'payElID.printName', 'accrualSum', 'accrualRate', 'empOrderDetID', 'dateFrom', 'dateTo'])
      .where('empOrderID', '=', ID)
      .selectAsObject({
        'payElID.name': 'payName',
        'payElID.code': 'payCode',
        'payElID.printName': 'payPrintName'
      })
    const taskDet = await HR.reportUtils.getTask(ID, order.orderDate || order.entryDate, order.showTabNum, result.notUseMiddleNameInOrder)

    ids = appointDet && appointDet.length > 0 ? _.uniq(appointDet.filter(el => el.isByHours).map(el => el.employeeID)) : []
    let empRangeScience = ids && ids.length ? await UB.Repository('hr_empRangeScience')
      .attrs(['employeeID', 'docNumber', 'docDate', 'degreeName', 'dictDegreeID.name', 'dictDegreeID.shortName'])
      .where('employeeID', 'in', ids)
      .selectAsObject() : []
    empRangeScience = empRangeScience.map(row => {
      return Object.assign({}, row, {
        docDateSort: row.docDate || new Date(1, 1, 1)
      })
    })
    empRangeScience = empRangeScience && empRangeScience.length ? _.groupBy(empRangeScience, 'employeeID') : []

    let empAcademStatus = ids && ids.length ? await UB.Repository('hr_empAcademStatus')
      .attrs(['ID', 'employeeID', 'docNumber', 'docDate', 'dictAcademStatusID.name', 'dictAcademStatusID.nameDat', 'setStatus', 'dictAcademStatusID.isOfficial'])
      .where('employeeID', 'in', ids)
      .selectAsObject({
        'dictAcademStatusID.isOfficial': 'isOfficial'
      }) : []
    empAcademStatus = empAcademStatus.map(row => {
      return Object.assign({}, row, {
        docDateSort: row.docDate || new Date(1, 1, 1),
        isOfficialSort: row.isOfficial ? 1 : 2,
        setStatusSort: row.setStatus && row.setStatus === 'BYORG' ? 1 : 2
      })
    })
    empAcademStatus = empAcademStatus && empAcademStatus.length ? _.groupBy(empAcademStatus, 'employeeID') : []

    let employeeWorkbook = ids && ids.length ? await UB.Repository('hr_employeeWorkbook')
      .attrs(['workPosition', 'employeeID', 'dateFrom', 'ID'])
      .where('employeeID', 'in', ids)
      .where('organizationID', '=', order.masterOrganizationID || order.organizationID)
      .selectAsObject() : []
    employeeWorkbook = employeeWorkbook && employeeWorkbook.length ? _.groupBy(employeeWorkbook, 'employeeID') : []

    let empMilitaryRanks = await UB.Repository('hr_empMilitaryRanks')
      .attrs(['ID', 'employeeID', 'dictMilitaryRankID.name', 'dictMilitaryRankID.genName', 'dictMilitaryRankID.datName', 'orderDate'])
      .where('dictMilitaryRankID', 'isNotNull')
      .exists(UB.Repository('hr_empOrderDet')
        .correlation('employeeID', 'employeeID')
        .where('orderID', '=', ID)
      )
      .selectAsObject()
    empMilitaryRanks = _.groupBy(empMilitaryRanks, 'employeeID')

    const mainWork = []
    const fld = appointDet && appointDet.length > 0 ? appointDet.filter(el => el.workPlace === '2') : []
    _.forEach(fld, item => {
      let onDate = item.dateFrom
      if (onDate && AC.dateService.isValid(onDate)) {
        onDate = AC.dateService.shiftDate(onDate)
      } else {
        onDate = appAC.globalApplicationDate()
      }
      if (!_.find(mainWork, { employeeID: item.employeeID, dateFrom: onDate })) {
        mainWork.push({
          employeeID: item.employeeID,
          dateFrom: onDate,
          posName: '',
          femaleName: useSexType && ['employeeID.sexType'] === 'W'
        })
      }
    })

    for (let i = 0; i < mainWork.length; i++) {
      const whereList = [
        ['employeeID', '=', mainWork[i].employeeID],
        ['workPlace', '=', '1'],
        ['dateFrom', '<=', mainWork[i].dateFrom],
        ['dateTo', '>', mainWork[i].dateFrom]
      ]
      const config = {
        fullPositionName: true,
        useSexType: mainWork[i].femaleName,
        showPositionCategory
      }

      mainWork[i].posName = await HR.reportUtils.getPositionNameFromEmployeePositionByParams(whereList, order.organizationID, mainWork[i].dateFrom, 'Acc', config)
    }

    let index = 1
    for (let i = 0; i < orderDet.length; i++) {
      const item = orderDet[i]
      const appointDetRow = _.find(appointDet, { ID: item.ID })
      const toOrder = orderExtract && orderExtract.ID
        ? ((orderExtract.departmentID ? orderExtract.departmentID === item.departmentID : true) && (orderExtract.employeePositionID ? orderExtract.employeePositionID === item.employeePositionID : true))
        : true

      if (appointDetRow) {
        _.merge(appointDetRow, item || [])

        let orderAccRows = orderAcc.filter(el => el.empOrderDetID === appointDetRow.ID)
        if (appointDetRow['vacPositionID.employeeNumberID'] && empLongTermAbsc[appointDetRow['vacPositionID.employeeNumberID']]) {
          const flt = empLongTermAbsc[appointDetRow['vacPositionID.employeeNumberID']].filter(el => el.dateFrom <= AC.dateService.shiftDate(appointDetRow.dateFrom) && el.dateTo >= AC.dateService.shiftDate(appointDetRow.dateFrom))
          if (flt && flt.length) {
            appointDetRow.vacPositionOrderID = flt[0].orderID
            appointDetRow.vacPositionParaID = flt[0].paraID
          }
        }

        const positionCategoryName = showPositionCategory && appointDetRow['positionID.positionCategory.name']
          ? ` (${UB.i18n('категорія посади')}: ${appointDetRow['positionID.positionCategory.name']})`
          : ''
        const newPosName = HR.reportUtils.getInfoItemOrderInCase(appointDetRow, 'gen', false, result.notUseMiddleNameInOrder, '', {
          fullPositionName: appointDetRow['positionID.positionType'] !== '4' // ,
          // yesActualPositionName: appointDetRow.dictEmpCategoryID && item['positionID.positionType'] !== '4'
        })

        // const newPosNameDat = HR.reportUtils.getPosIncaseInfo(item, 'dat', true, item['employeePositionID.positionID.positionType'] !== '4')
        const newPosNameDat = HR.reportUtils.getInfoItemOrderInCase(appointDetRow, 'dat', false, result.notUseMiddleNameInOrder, '', {
          fullPositionName: appointDetRow['positionID.positionType'] !== '4'
        })

        // let isOrgBoss = appointDetRow['employeePositionID.positionID.isOrgBoss']
        if (!newPosName.posName && appointDetRow.workPlace === '4') {
          newPosName.posName = useSexType && appointDetRow['employeeID.sexType'] === 'W'
            ? HR.nameCase.uncap(appointDetRow['dictPositionID.nameGenF'] || appointDetRow['dictPositionID.nameGen'] || appointDetRow['dictPositionID.name'] || '')
            : HR.nameCase.uncap(appointDetRow['dictPositionID.nameGen'] || appointDetRow['dictPositionID.name'] || '')
          // isOrgBoss = false
        }
        const dateFrom = AC.dateService.formatDate(appointDetRow.dateFrom)
        let dictAppointKindName = (appointDetRow['employeeID.sexType'] === 'W' && appointDetRow['dictAppointKindID.nameFem'])
          ? appointDetRow['dictAppointKindID.nameFem'] : appointDetRow['dictAppointKindID.name']
        dictAppointKindName = dictAppointKindName ? ` ${HR.nameCase.uncap(dictAppointKindName)}` : ''
        let transfer = ''
        if (appointDetRow.isTransfer) {
          const org = appointDetRow['srcOrganizationID.nameGen'] || appointDetRow['srcOrganizationID.name'] || appointDetRow.srcOrganizationName || ''
          transfer = UB.i18n(` в порядку переведення{0}`, org ? UB.i18n(' з ') + org : '')
        }
        const list = orderDet.length === 1 && orderDetVehicle.length === 0 && taskDet.tasks.length === 0 ? '' : `${index++}. `
        const textMtCount = result.funcOrgType && appointDetRow.mtCount ? appointDetRow.mtCount === 1 ? UB.i18n(' (на повну ставку)') : UB.i18n(` (на {0}&nbsp;ставки)`, HR.reportUtils.formatAsNumberStr(appointDetRow.mtCount)) : ''
        let workPlace = ''
        if (appointDetRow.workPlace === '2') {
          workPlace = UB.i18n(' за внутрішнім сумісництвом')
        } else if (appointDetRow.workPlace === '3') {
          workPlace = UB.i18n(' за зовнішнім сумісництвом')
        } else if (appointDetRow.workPlace === '4') {
          workPlace = UB.i18n(' поза штатом')
        }

        let vacPosition = ''
        if (appointDetRow.vacPositionID) {
          // Призначення на посаду, якщо там є призначений Працівник, який знаходиться у відпустці, довготривалій відпустці, військовій службі
          let employee = appointDetRow['vacPositionID.employeeID.genName'] || appointDetRow['vacPositionID.employeeID.fullFIO'] ||
            HR.reportUtils.getFullName(appointDetRow['vacPositionID.employeeID.lastName'], appointDetRow['vacPositionID.employeeID.firstName'],
              result.notUseMiddleNameInOrder ? '' : appointDetRow['vacPositionID.employeeID.middleName'], false)
          employee = HR.reportUtils.formatShortNameInOrder(employee, { notUseMiddleNameInOrder: result.notUseMiddleNameInOrder })
          // employee = HR.reportUtils.formatShortName(employee, false, ' ', !!appointDetRow['vacPositionID.employeeID.middleName'])

          const orderDet = await me.findOrderInfo(appointDetRow.vacPositionOrderID, appointDetRow.vacPositionParaID)
          if (orderDet) {
            if (orderDet.empOrderType === 'MILSERVICE') {
              vacPosition = UB.i18n(` на період військової служби {0}, до дня {1} фактичного виходу з військової служби`, employee, appointDetRow['vacPositionID.employeeID.sexType'] === 'W' ? UB.i18n('її') : UB.i18n('його'))
            } else if (orderDet['dictVacationKindID.isTempVacancy']) {
              vacPosition = UB.i18n(` на період {0} {1},`, HR.nameCase.uncap(orderDet['dictVacationKindID.nameGen'] || orderDet['dictVacationKindID.name'] || ''), employee)
              vacPosition += UB.i18n(` до дня {0} фактичного виходу з відпустки`, appointDetRow['vacPositionID.employeeID.sexType'] === 'W' ? UB.i18n('її') : UB.i18n('його'))
            } else {
              vacPosition = UB.i18n(` на період відсутності {0}, до дня {1} фактичного виходу`, employee, appointDetRow['vacPositionID.employeeID.sexType'] === 'W' ? UB.i18n('її') : UB.i18n('його'))
            }
          } else {
            vacPosition = UB.i18n(` на період відсутності {0}, до дня {1} фактичного виходу`, employee, appointDetRow['vacPositionID.employeeID.sexType'] === 'W' ? UB.i18n('її') : UB.i18n('його'))
          }
          if (vacPosition.length && (transfer.length || dictAppointKindName.length)) {
            vacPosition += ','
          }
        }

        const fsData = empOrderFundSource.filter(fsItem => fsItem.paraID === item.ID && fsItem.dictFundSourceID)
        let dictFundSource = []
        fsData.forEach((fsItem, npp) => {
          const last = fsItem.length === 1 || npp === fsData.length - 1
            ? ''
            : npp < fsData.length - 2 ? ', ' : ' та '
          dictFundSource.push(UB.i18n(`{0}&nbsp;{1} за рахунок коштів {2}{3}`, fsItem.mtCount || 0, (fsItem.mtCount || 0) === 1 ? 'ставку' : 'ставки', fsItem['dictFundSourceID.genName'] || fsItem['dictFundSourceID.name'] || '', last))
        })
        const newTabNum = showTabNum && appointDetRow.tabNum ? UB.i18n(`(Таб. №&nbsp;{0})`, appointDetRow.tabNum) : ''

        if (appointDetRow.isByHours) {
          let science = UB.i18n('без наукового ступеня')
          let academ = ''
          let posNameWB = appointDetRow.empPositionName || ''
          if (empRangeScience[item.employeeID]) {
            const el = _.sortBy(empRangeScience[item.employeeID], ['docDateSort', 'ID'])[empRangeScience[item.employeeID].length - 1]
            science = `${el.degreeName || el['dictDegreeID.shortName'] || el['dictDegreeID.name'] || ''}${el.docNumber || el.docDate ? ' (' + UB.i18n('диплом') : ''}` +
              `${el.docNumber ? ' №' + el.docNumber : ''}` + `${el.docDate ? UB.i18n(' від&nbsp;') + AC.dateService.formatDate(el.docDate) : ''}` +
              `${el.docNumber || el.docDate ? ')' : ''}`
          }
          if (empAcademStatus[item.employeeID]) {
            const el = empAcademStatus[item.employeeID].sort(function (a, b) {
              if (a.isOfficialSort < b.isOfficialSort) {
                return -1
              }
              if (a.isOfficialSort > b.isOfficialSort) {
                return 1
              }
              if (a.setStatusSort < b.setStatusSort) {
                return -1
              }
              if (a.setStatusSort > b.setStatusSort) {
                return 1
              }
              // последний по дате
              if (a.docDateSort > b.docDateSort) {
                return -1
              }
              if (a.docDateSort < b.docDateSort) {
                return 1
              }
              // если выше все одинаково, то берет последнюю запись
              if (a.ID > b.ID) {
                return -1
              }
              if (a.ID < b.ID) {
                return 1
              }
              return 0
            })[0]
            academ = `${el['dictAcademStatusID.nameDat'] || el['dictAcademStatusID.name'] || ''}${el.docNumber || el.docDate ? ' (' + UB.i18n('атестат') : ''}` +
              `${el.docNumber ? ' №' + el.docNumber : ''}` + `${el.docDate ? UB.i18n(' від&nbsp;') + AC.dateService.formatDate(el.docDate) : ''}` +
              `${el.docNumber || el.docDate ? ')' : ''}`
          }
          if (!posNameWB && employeeWorkbook[item.employeeID]) {
            const wb = _.sortBy(employeeWorkbook[item.employeeID], ['dateFrom', 'ID'])
            posNameWB = wb[wb.length - 1].workPosition
          }

          const fundSourceText = appointDetRow.isByHours && appointDetRow.dictFundSourceID ? UB.i18n(' за рахунок {0}', appointDetRow['dictFundSourceID.genName'] || appointDetRow['dictFundSourceID.name'] || '') : ''
          let text = `${list}${UB.i18n('ДОЗВОЛИТИ')} ${boldFormatBegin}${HR.reportUtils.formatFullName(appointDetRow['employeeID.datName'] || appointDetRow['employeeID.fullFIO'], true)}` +
            (newTabNum ? ' ' + boldFormatEnd + newTabNum : boldFormatEnd) +
            (science ? ', ' + science : '') + (academ ? ', ' + academ : '') +
            (posNameWB ? UB.i18n(', {0} працює на посаді {1}', appointDetRow['employeeID.sexType'] === 'W' ? UB.i18n('яка') : UB.i18n('який'), posNameWB) : '') +
            (UB.i18n(', виконувати навчальну роботу на посаді ') + newPosName.posName + positionCategoryName) +
            UB.i18n(', на умовах погодинної оплати в обсязі не більш як {0} годин', appointDetRow.planHours) + fundSourceText +
            ` ${UB.i18n('з&nbsp;')}${dateFrom}${appointDetRow.dateToEmpty ? UB.i18n(' по&nbsp;') + AC.dateService.formatDate(appointDetRow.dateToEmpty) : ''}` +
            (appointDetRow.addOrderText ? ' ' + appointDetRow.addOrderText + '.' : '.')
          text = text.replace('</B> ', ' </B>')
          text = text.replace('</B>,', ',</B>&nbsp;')
          text = text.replace('</b> ', ' </b>')
          text = text.replace('</b>,', ',</b>&nbsp;')

          result.items.push({
            toOrder: toOrder,
            indent: 1,
            text: text
          })
        } else {
          let text = ''
          if (item['positionID.positionType'] === '4') {
            const militaryRank = HR.reportUtils.getMilitaryRanks(empMilitaryRanks[item.employeeID], order.orderDate || appAC.globalApplicationDate(), 'genName')
            let orderWord1 = UB.i18n('Зарахувати')
            let orderWord2 = UB.i18n('Вважати')
            orderWord1 = result.smallOrderWord ? orderWord1 : orderWord1.toUpperCase()
            orderWord2 = result.smallOrderWord ? orderWord2 : orderWord2.toUpperCase()

            text = UB.i18n('{0}{12}{1} {2}{11}до списку особового складу {3} на всі види забезпечення, {13} {4}, що {5} справи і посаду та {6} до виконання обов’язків {7}{8} {9}&nbsp;{10}',
              list, militaryRank ? ' ' + militaryRank : '',
              boldFormatBegin + HR.reportUtils.formatFullName(appointDetRow['employeeID.accusativeName'] || appointDetRow['employeeID.fullFIO'], true) + ' ' + boldFormatEnd,
              order['organizationID.nameGen'] || order['organizationID.name'], appointDetRow['employeeID.sexType'] === 'W' ? UB.i18n('такою') : UB.i18n('таким'),
              appointDetRow['employeeID.sexType'] === 'W' ? UB.i18n('прийняла') : UB.i18n('прийняв'), appointDetRow['employeeID.sexType'] === 'W' ? UB.i18n('приступила') : UB.i18n('приступив'),
              newPosName.posName + positionCategoryName, item['positionID.dictMilitaryRankID'] ? UB.i18n(', штатна категорія "') + (item['positionID.dictMilitaryRankID.name'] || '') + '"' : '', UB.i18n('з'),
              dateFrom, newTabNum ? newTabNum + ' ' : '', orderWord1, orderWord2)
          } else {
            const posItem = appointDetRow.workPlace === '2' ? _.find(mainWork, { employeeID: appointDetRow.employeeID, dateFrom: AC.dateService.shiftDate(appointDetRow.dateFrom) }) : undefined
            const mainPosName = posItem ? posItem.posName : ''
            const empName = HR.reportUtils.formatFullName(appointDetRow['employeeID.accusativeName'] || appointDetRow['employeeID.fullFIO'], true)
            let orderWord = result.funcOrgType && ['8', '12'].includes(appointDetRow['positionID.positionType']) ? UB.i18n('Прийняти') : UB.i18n('Призначити')
            orderWord = result.smallOrderWord ? orderWord : orderWord.toUpperCase()

            text = `${list}${orderWord} ${boldFormatBegin}${empName}` +
              (newTabNum ? ' ' + boldFormatEnd + newTabNum : boldFormatEnd) +
              (mainPosName ? ', ' + mainPosName : '') +
              ` ${UB.i18n('з&nbsp;')}${dateFrom}${appointDetRow.dateToEmpty ? UB.i18n(' по&nbsp;') + AC.dateService.formatDate(appointDetRow.dateToEmpty) : ''} ${UB.i18n('на посаду')} ${newPosName.posName + positionCategoryName}${orgGen}${workPlace}${textMtCount}${vacPosition}${transfer}${dictAppointKindName}`
          }
          text = text.replace('</B> ', ' </B>')
          text = text.replace('</B>,', ',</B>&nbsp;')
          text = text.replace('</b> ', ' </b>')
          text = text.replace('</b>,', ',</b>&nbsp;')
          text += (appointDetRow.addOrderText ? ' ' + appointDetRow.addOrderText + '.' : '.')
          result.items.push({
            toOrder: toOrder,
            indent: 1,
            text: text
          })
        }

        if (!appointDetRow.isByHours && appointDetRow.accrualSum && appointDetRow.workPlace !== '4') {
          if (item['positionID.positionType'] === '4') {
            const militaryRank = HR.reportUtils.getMilitaryRanks(empMilitaryRanks[item.employeeID], order.orderDate || appAC.globalApplicationDate(), 'datName')
            let orderWord = UB.i18n('Встановити')
            orderWord = result.smallOrderWord ? orderWord : orderWord.toUpperCase()
            result.items.push({
              toOrder: toOrder,
              indent: 1,
              text: UB.i18n(`{6} {0}{1}{2} {3}&nbsp;{4} посадовий оклад згідно з{5} тарифним розрядом за Єдиною тарифною сіткою розрядів і коефіцієнтів з оплати праці.`,
                militaryRank ? militaryRank + ' ' : '', HR.reportUtils.formatShortName(appointDetRow['employeeID.datName'] || appointDetRow['employeeID.fullFIO'], false),
                newPosNameDat.posName ? ', ' + newPosNameDat.posName + positionCategoryName : '', UB.i18n('з'), dateFrom, appointDetRow['dictTarifCoeffID.code'] ? ' ' + appointDetRow['dictTarifCoeffID.code'] : '',
                orderWord)
            })
          } else {
            result.items.push({
              toOrder: toOrder,
              indent: 1,
              text: UB.i18n(`Встановити {0} посадовий оклад згідно зі штатним розписом`, HR.reportUtils.formatShortName(appointDetRow['employeeID.datName'] || appointDetRow['employeeID.fullFIO'], false)) +
                (result.showAccrual ? UB.i18n(` у розмірі {0}&nbsp;гривень на місяць.`, HR.reportUtils.formatAsCurrency(appointDetRow.accrualSum, appointDetRow.accrualSum === Math.round(appointDetRow.accrualSum) ? 0 : 2)) : '.') +
                (result.funcOrgType && appointDetRow.dictTarifCoeffID ? UB.i18n(` Тарифний розряд - {0}.`, appointDetRow['dictTarifCoeffID.code']) : '')
            })
          }
        }
        if (!appointDetRow.isByHours && dictFundSource.length) {
          result.items.push({
            toOrder: toOrder,
            indent: 1,
            text: UB.i18n(`Оплата праці на {0}.`, dictFundSource.join(''))
          })
        }
        if (!appointDetRow.isByHours && appointDetRow.isTrialPeriod && appointDetRow['dictTrialPeriodID.name']) {
          result.items.push({
            toOrder: toOrder,
            indent: 1,
            text: UB.i18n(`Встановити випробувальний термін строком на {0} (до&nbsp;{1}). `, HR.nameCase.uncap(appointDetRow['dictTrialPeriodID.name']), AC.dateService.formatDate(appointDetRow['dateTrialEnd']))
          })
        }

        let textAboutRankAndExperience = ''
        if (appointDetRow['positionID.positionType'] === '1' && (appointDetRow.isRankSave || appointDetRow.isRankAssign)) {
          const rankName = (appointDetRow['dictRankID.printName'] || '').replace(/ /g, '&nbsp;')
          if (appointDetRow.isRankSave) {
            // textAboutRankAndExperience = UB.i18n(` Взяти до відома, що {0} присвоєно {1} державного службовця.`, HR.reportUtils.formatShortName(appointDetRow['employeeID.datName'] || appointDetRow['employeeID.fullFIO'], false, ' ', !!appointDetRow['employeeID.middleName']), rankName)
            textAboutRankAndExperience = UB.i18n(` Взяти до відома, що {0} присвоєно {1} державного службовця.`, HR.reportUtils.formatShortName(appointDetRow['employeeID.datName'] || appointDetRow['employeeID.fullFIO'], false), rankName)
          }
          if (appointDetRow.isRankAssign) {
            // textAboutRankAndExperience = UB.i18n(` Присвоїти {0} {1} державного службовця.`, HR.reportUtils.formatShortName(appointDetRow['employeeID.datName'] || appointDetRow['employeeID.fullFIO'], false, ' ', !!appointDetRow['employeeID.middleName']), rankName)
            textAboutRankAndExperience = UB.i18n(` Присвоїти {0} {1} державного службовця.`, HR.reportUtils.formatShortName(appointDetRow['employeeID.datName'] || appointDetRow['employeeID.fullFIO'], false), rankName)
          }
        }
        const _employeeExperience = await UB.Repository('hr_empOrderExperience')
          .attrs(['dictExperienceID.name', 'dictExperienceID.printName', 'years', 'months', 'days'])
          .where('empOrderDetID', '=', appointDetRow.ID)
          .selectAsObject()

        if (Array.isArray(_employeeExperience)) {
          textAboutRankAndExperience += _employeeExperience.reduce((acc, el) => acc + ((el.years === 0 && el.months === 0 && el.days === 0)
            ? UB.i18n(` {0} немає.`, el['dictExperienceID.printName'] || el['dictExperienceID.name'])
            : UB.i18n(` {0} станом на&nbsp;{1} становить {2} {3} {4}.`, el['dictExperienceID.name'], dateFrom, AC.dateService.timeWithPlural(el.years, true, 'yy', '&nbsp;'), AC.dateService.timeWithPlural(el.months, true, 'MM', '&nbsp;'), AC.dateService.timeWithPlural(el.days, true, 'dd', '&nbsp;')))
          , '')
        }
        if (!appointDetRow.isByHours && textAboutRankAndExperience.length) {
          result.items.push({
            toOrder: toOrder,
            indent: 1,
            text: textAboutRankAndExperience
          })
        }
        if (!appointDetRow.isByHours && orderAccRows && orderAccRows.length > 0) {
          orderAccRows = _.groupBy(orderAccRows, item => { return item.payCode === '42' })
          _.forEach(orderAccRows, orderAccItems => {
            orderAccItems.forEach((el, idx) => {
              const accrualStr = el.accrualSum
                ? UB.i18n(` у розмірі {0}&nbsp;гривень`, HR.reportUtils.formatAsCurrency(el.accrualSum, el.accrualSum === Math.round(el.accrualSum) ? 0 : 2))
                : (el.accrualRate
                  ? UB.i18n(` у розмірі {0}&nbsp;відсотків`, el.accrualRate) + (result.funcOrgType ? UB.i18n(' окладу') : UB.i18n(' від посадового окладу'))
                  : '')
              const accrualDateFrom = el.dateFrom ? `${UB.i18n('з')}&nbsp;${AC.dateService.formatDate(el.dateFrom)}` : ''
              const accrualDateTo = (!el.dateTo || AC.dateService.isMaxDate(el.dateTo)) ? '' : ` ${UB.i18n('по')}&nbsp;${AC.dateService.formatDate(el.dateTo)}`

              if (orderAccItems.length === 1) {
                result.items.push({
                  toOrder: toOrder,
                  indent: 1,
                  text: el.payCode === '42'
                    ? `${UB.i18n('Виплатити')} ${HR.reportUtils.formatShortName(appointDetRow['employeeID.datName'] || appointDetRow['employeeID.fullFIO'], false)} ${HR.nameCase.uncap(el.payPrintName || el.payName || '')} ${accrualStr}.`
                    : `${UB.i18n('Встановити')} ${HR.reportUtils.formatShortName(appointDetRow['employeeID.datName'] || appointDetRow['employeeID.fullFIO'], false)} ${HR.nameCase.uncap(el.payPrintName || el.payName || '')} ${accrualStr} ${accrualDateFrom}${accrualDateTo !== '' ? accrualDateTo : '.'}`
                })
              } else {
                if (idx === 0) {
                  result.items.push({
                    toOrder: toOrder,
                    indent: 1,
                    text: el.payCode === '42'
                      ? `${UB.i18n('Виплатити')} ${HR.reportUtils.formatShortName(appointDetRow['employeeID.datName'] || appointDetRow['employeeID.fullFIO'], false)}:`
                      : `${UB.i18n('Встановити')} ${HR.reportUtils.formatShortName(appointDetRow['employeeID.datName'] || appointDetRow['employeeID.fullFIO'], false)}:`
                  })
                }
                result.items.push({
                  toOrder: toOrder,
                  indent: 1,
                  text: el.payCode === '42'
                    ? `  - ${HR.nameCase.uncap(el.payPrintName || el.payName || '')} ${accrualStr}${idx === (orderAccItems.length - 1) ? '.' : ';'}`
                    : `  - ${HR.nameCase.uncap(el.payPrintName || el.payName || '')} ${accrualStr} ${accrualDateFrom}${accrualDateTo}${idx === (orderAccItems.length - 1) ? '.' : ';'}`
                })
              }
            })
          })
        }

        if (!appointDetRow.isByHours && result.funcOrgType && appointDetRow.dictFundSourceID) {
          result.items.push({
            toOrder: toOrder,
            text: UB.i18n('Оплата праці за рахунок коштів {0} за фактично відпрацьований час, але не більше {1} ставки.', appointDetRow['dictFundSourceID.genName'] || appointDetRow['dictFundSourceID.name'] || '', HR.reportUtils.formatAsNumberStr(appointDetRow.mtCount)),
            indent: 1
          })
        }

        if (!appointDetRow.isByHours && result.funcOrgType && appointDetRow['workScheduleID.scheduleDescription']) {
          result.items.push({
            toOrder: toOrder,
            text: UB.i18n('Графік роботи: ') + appointDetRow['workScheduleID.scheduleDescription'],
            indent: 1
          })
        }

        if (!appointDetRow.isByHours && result.showTaxCode && appointDetRow['employeeID.taxCode']) {
          let taxCodeInfo = ''
          taxCodeInfo = appointDetRow['employeeID.empTaxCodeType'] === 'TAXCODE'
            ? UB.i18n('Ідентифікаційний номер ')
            : appointDetRow['employeeID.empTaxCodeType'] === 'PASSPORT'
              ? UB.i18n('Серія, номер паспорту ')
              : appointDetRow['employeeID.empTaxCodeType'] === 'IDCARD' ? UB.i18n('Номер ID картки ') : ''
          taxCodeInfo += appointDetRow['employeeID.taxCode'] + '.'
          result.items.push({
            toOrder: toOrder,
            text: taxCodeInfo,
            indent: 0
          })
        }

        if (appointDetRow.reason) {
          result.items.push({
            toOrder: toOrder,
            text: UB.i18n(`Підстава: {0}.`, appointDetRow.reason),
            indent: 0
          })
        }
      }
    }

    const vehicleDet = await UB.Repository('hr_empOrderVehicleassignDet')
      .attrs(['ID', 'employeeID.genName', 'employeeID.accusativeName', 'employeeID.fullFIO', 'employeeID.sexType',
        'dateFrom', 'dateTo', 'vehicleID.description', 'vehicleID.govNum', 'givingType',
        'employeePositionID.dictPositionID.nameOr', 'employeeNumberID.tabNum', 'strVehicle'])
      .where('orderID', '=', ID)
      .orderBy('itemIdx')
      .selectAsObject()

    for (let i = 0; i < orderDetVehicle.length; i++) {
      const vehicleDetRow = _.find(orderDetVehicle, { ID: vehicleDet[i].ID })
      _.merge(vehicleDetRow, vehicleDet[i] || [])

      const boldFormatBegin = '<b>'
      const boldFormatEnd = '</b>'
      const caseCode = vehicleDetRow.givingType === 'ASSIGN' ? 'ins' : 'dat'
      const posInfo = HR.reportUtils.getInfoItemOrderInCase(vehicleDetRow, caseCode, true)
      if (caseCode === 'ins') {
        posInfo.posName = vehicleDetRow['employeePositionID.dictPositionID.nameOr'] || posInfo.posName
      }
      const tabNum = showTabNum && vehicleDetRow['employeeNumberID.tabNum'] ? UB.i18n(`(Таб. №&nbsp;{0})`, vehicleDetRow['employeeNumberID.tabNum']) : ''

      let text = (vehicleDetRow.givingType === 'ASSIGN' ? UB.i18n('ЗАКРІПИТИ з ') : UB.i18n('НАДАТИ з ')) +
        AC.dateService.formatDate(vehicleDetRow.dateFrom) + ' року' +
        (vehicleDetRow.dateTo ? ` по ${AC.dateService.formatDate(vehicleDetRow.dateTo)} року ` : ' ') +
        (vehicleDetRow.givingType === 'ASSIGN' ? ' за ' : '') +
        `${boldFormatBegin}${posInfo.empName || ''}${boldFormatEnd}${tabNum ? ' ' + tabNum : ''}, ${posInfo.posName}` +
        (vehicleDetRow.givingType === 'ASSIGN'
          ? UB.i18n(' автотранспортний засіб ')
          : UB.i18n(' право керування автотранспортним засобом ')) +
          vehicleDetRow['strVehicle'] +
          (vehicleDetRow.givingType === 'ASSIGN'
            ? UB.i18n(' з правом керування та обслуговування даного автотранспортного засобу.')
            : UB.i18n('.'))
      text = text.replace('</B> ', ' </B>')
      text = text.replace('</B>,', ',</B>&nbsp;')
      text = text.replace('</b> ', ' </b>')
      text = text.replace('</b>,', ',</b>&nbsp;')

      result.items.push({
        toOrder: true,
        text: `${index === 1 ? '' : index++ + '. '}${text}`,
        indent: 1
      })
    }

    result.items = result.items.filter(el => el.toOrder)

    result.tasks = taskDet.tasks.map(e => ({
      task: `${index === 1 && taskDet.tasks.length === 1 ? '' : index++ + '. '}${e.task}${e['positionName'] ? ` ${e['positionName']}` : ''}${e['employeeName'] ? ` ${e['employeeName']}` : ''}.`
    }))

    return result
  },
  findOrderInfo: async function (orderID, paraID) {
    const config = [{
      type: 'VACATION',
      ub: 'hr_empOrderVacationListDet',
      attr: ['ID', 'empOrderType', 'dictVacationKindID.nameLoc', 'dictVacationKindID.nameGen', 'dictVacationKindID.name',
        'dictVacationKindID.byArticle', 'dictVacationKindID.isTempVacancy', 'dateFrom', 'dateTo'],
      alias: {}
    }, {
      type: 'VACATIONLONG',
      ub: 'hr_empOrderVacationlongDet',
      attr: ['ID', 'empOrderType', 'dictVacationKindID.nameLoc', 'dictVacationKindID.nameGen', 'dictVacationKindID.name',
        'dictVacationKindID.byArticle', 'dictVacationKindID.isTempVacancy', 'dateFrom', 'dateTo'],
      alias: {}
    }, {
      type: 'VACATIONPROLONGL',
      ub: 'hr_empOrderVacationprolonglDet',
      attr: ['ID', 'empOrderType', 'primeVacationParaID.dictVacationKindID.nameLoc', 'primeVacationParaID.dictVacationKindID.nameGen',
        'primeVacationParaID.dictVacationKindID.name', 'primeVacationParaID.dictVacationKindID.byArticle', 'primeVacationParaID.dictVacationKindID.isTempVacancy',
        'primeVacationParaID.dateFrom', 'dateTo'], // дата начала с оригинального приказа, а дата окончания с приказа продолжения
      alias: {
        'primeVacationParaID.dictVacationKindID.nameLoc': 'dictVacationKindID.nameLoc',
        'primeVacationParaID.dictVacationKindID.nameGen': 'dictVacationKindID.nameGen',
        'primeVacationParaID.dictVacationKindID.name': 'dictVacationKindID.name',
        'primeVacationParaID.dictVacationKindID.byArticle': 'dictVacationKindID.byArticle',
        'primeVacationParaID.dictVacationKindID.isTempVacancy': 'dictVacationKindID.isTempVacancy',
        'primeVacationParaID.dateFrom': 'dateFrom'
      }
    }, {
      type: 'MILSERVICE',
      ub: 'hr_empOrderMilserviceDet',
      attr: ['ID', 'empOrderType', 'dateFrom', 'dateTo'],
      alias: {}
    }]
    if (!orderID || !paraID) {
      return undefined
    }

    const empOrderType = await UB.Repository('hr_empOrderDet')
      .attrs('empOrderType')
      .where('orderID.orderState', 'in', ['POSTED', 'PROCESSED'])
      .where('orderID', '=', orderID)
      .where('ID', '=', paraID)
      .selectScalar()

    const flt = _.find(config, { type: empOrderType })
    if (!flt) {
      return undefined
    }
    const orderDet = await UB.Repository(flt.ub)
      .attrs(flt.attr)
      .where('orderID.orderState', 'in', ['POSTED', 'PROCESSED'])
      .where('ID', '=', paraID)
      .selectSingle(flt.alias)

    return orderDet
  }
}
