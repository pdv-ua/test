/* global UB AC HR appAC $App _ */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    reportParams = (typeof reportParams === 'string') ? JSON.parse(reportParams) : reportParams
    return me.getData(reportParams).then(data => AC.reportService.generateReport(me.getParams(data), me))
  },
  getData: async function (reportParams) {
    const pDate = appAC.globalApplicationDate()
    const orgID = appAC.globalOrganization()
    const useSexType = AC.settings.get('hrUseSexTypeInOrders', orgID) === true
    const reportViewCode = reportParams.reportViewCode || ''

    // const respPosInfo = await HR.orgStructReportUtils.getSingerInfo(reportParams.respEmployeePositionID, undefined, pDate)
    const respPosInfo = reportParams.respEmployeePositionID
      ? await HR.reportUtils.getPromiseEmployeePositionForOrders([reportParams.respEmployeePositionID], orgID, orgID, pDate, ['Nom'], false, useSexType, reportViewCode === 'dovidkaZMiscyaRoboty2' || reportViewCode === 'dovidkaZMiscyaRoboty3')
      : []
    const respPosInfo1 = reportParams.respEmployeePosition1ID
      ? await HR.reportUtils.getPromiseEmployeePositionForOrders([reportParams.respEmployeePosition1ID], orgID, orgID, pDate, ['Nom'], false, useSexType, reportViewCode === 'dovidkaZMiscyaRoboty2' || reportViewCode === 'dovidkaZMiscyaRoboty3')
      : []

    const orgToName = reportParams.orgToName ? UB.i18n('до ') + reportParams.orgToName : UB.i18n('за місцем вимоги')
    const workSchedule = reportParams.workSchedule || ''
    let employeeNumberRs = UB.Repository('hr_employeeNumberS')
      .attrs(['ID', 'dateFrom', 'dateTo', 'orgID.name', 'orgID.nameNom', 'orgID.nameLoc', 'appointOrderID.orderNumber', 'appointOrderID.orderDate',
        'appointOrderDetID.dateFrom'])
    let epmPos = UB.Repository('hr_employeePositionS')
      .attrs(['ID', 'workPlace', 'dateTo', 'changeOrderID', 'changeOrderID.orderDate', 'changeOrderID.orderNumber'])
      .where('organizationID', '=', orgID)
      .where('employeeID', '=', reportParams.employeeID)
      .whereIf(reportViewCode !== 'dovidkaZMiscyaRoboty3', 'dateFrom', '<=', pDate)
      .whereIf(reportViewCode !== 'dovidkaZMiscyaRoboty3', 'dateTo', '>', pDate)
      .whereIf(reportViewCode === 'dovidkaZMiscyaRoboty3', 'dateTo', '<=', pDate)
      .limit(1)
      .orderBy('dateFrom')

    if (reportParams.employeeNumberID) {
      epmPos.where('employeeNumberID', '=', reportParams.employeeNumberID)
      employeeNumberRs = employeeNumberRs.where('ID', '=', reportParams.employeeNumberID)
        .where('orgID.state', '=', 'ACTIVE')
        .where('orgID.mi_dateFrom', '<=', pDate)
        .where('orgID.mi_dateTo', '>=', pDate)
        .where('orgID.mi_deleteDate', '=', AC.dateService.maxDate())
    } else {
      epmPos.where('workPlace', '=', '1')
      employeeNumberRs = employeeNumberRs.where('employeeID', '=', reportParams.employeeID)
        .where('orgID', '=', orgID)
        .where('dateFrom', '<=', pDate)
        .where('dateTo', '>=', pDate)
        .where('orgID.state', '=', 'ACTIVE')
        .where('orgID.mi_dateFrom', '<=', pDate)
        .where('orgID.mi_dateTo', '>=', pDate)
        .where('orgID.mi_deleteDate', '=', AC.dateService.maxDate())
    }
    return Promise.all([
      UB.Repository('hr_employee')
        .attrs(['datName', 'shortFIO', 'sexType', 'firstName', 'middleName', 'lastName', 'insName'])
        .selectById(reportParams.employeeID),
      employeeNumberRs.orderBy('dateFrom', 'asc')
        .selectSingle(),
      UB.Repository('hr_employeeNumberS')
        .attrs(['employeeID.firstName', 'employeeID.lastName', 'employeeID.phoneMobile', 'employeeID.phoneWorking'])
        .where('employeeID.mi_deleteDate', '>=', '#maxdate')
        .whereIf(reportParams.needExecutorCheck, 'ID', '=', $App.connection.userData().employeeNumberID || 0)
        .whereIf(!reportParams.needExecutorCheck, 'ID', '=', 0)
        .selectSingle({
          'employeeID.firstName': 'firstName',
          'employeeID.lastName': 'lastName',
          'employeeID.phoneMobile': 'phoneMobile',
          'employeeID.phoneWorking': 'phoneWorking'
        }),
      UB.Repository('hr_empOrderVacationListDet')
        .attrs(['dateFrom', 'dictVacationKindID.nameLoc', 'dictVacationKindID.name'])
        .where('empOrderType', '=', 'VACATION')
        .where('orderID', '=', reportParams.orderID || 0)
        .where('employeeID', '=', reportParams.employeeID)
        .selectSingle(),
      UB.Repository('hr_empOrderVacationlongDet')
        .attrs(['dateFrom', 'dictVacationKindID.nameLoc', 'dictVacationKindID.name'])
        .where('empOrderType', '=', 'VACATIONLONG')
        .where('orderID', '=', reportParams.orderID || 0)
        .where('employeeID', '=', reportParams.employeeID)
        .selectSingle(),
      UB.Repository('hr_empOrderDet')
        .attrs(['dateFrom', 'dateTo'])
        .where('empOrderType', '=', 'MISSION')
        .where('orderID', '=', reportParams.orderID || 0)
        .where('employeeID', '=', reportParams.employeeID)
        .selectSingle(),
      epmPos.selectSingle(),
      UB.Repository('hr_employeeVacation')
        .attrs(['dateFrom', 'dateTo', 'dictVacationKindID.nameLoc', 'dictVacationKindID.name', 'orderNumber', 'orderDate'])
        .where('employeeNumberID', '=', reportParams.employeeNumberID || 0)
        .where('dictVacationKindID.code', 'in', ['dCh6Y', 'dCh3Y'])
        .orderBy('dateFrom')
        .selectAsObject()
    ]).then(([employee, employeeNumber, executorEmployee, orderVacation, orderVacationLong, orderMission, employeePosition, employeeVacation]) => {
      const workPlace = employeePosition && employeePosition.workPlace ? employeePosition.workPlace === '1' ? [employeePosition.workPlace] : [employeePosition.workPlace, '1'] : ['1']
      let dismissOrderText = ''
      if (employeePosition && employeePosition.changeOrderID && employeePosition.dateTo && AC.dateService.maxDate().getTime() !== AC.dateService.shiftDate(employeePosition.dateTo).getTime()) {
        dismissOrderText = employeePosition['changeOrderID.orderNumber'] && employeePosition['changeOrderID.orderDate'] ? UB.i18n(` (наказ № {0} від {1}&nbsp;року)`, employeePosition['changeOrderID.orderNumber'], AC.dateService.formatDate(employeePosition['changeOrderID.orderDate'])) : ''
      }
      return Promise.all([
        UB.Repository('hr_employeeWorkbook')
          .attrs(['dateFrom', 'dateTo', 'appointOrder', 'workPosition', 'employeePositionID', 'isOrgAppoint', 'empWorkPlace', 'dismOrder', 'isOrgDismiss'])
          .where('employeeID', '=', reportParams.employeeID)
          .where('organizationID', '=', orgID)
          .whereIf(workPlace.length === 1, 'empWorkPlace', '=', workPlace[0])
          .whereIf(workPlace.length > 1, 'empWorkPlace', 'in', workPlace)
          .where('dateFrom', '<=', pDate)
          .orderBy('dateFrom', 'asc')
          .selectAsObject(),
        UB.Repository('hr_publServRang')
          .attrs(['dictRankID.printName'])
          .where('employeeID', '=', reportParams.employeeID)
          .where('dateFrom', '<=', pDate)
          .where('dateTo', '>=', pDate).limit(1)
          .selectSingle()
      ]).then(([workBook, servRank, dismissOrderText]) => {
        const workBookLastRec = workBook.length && workBook[workBook.length - 1]
        const employeePositionID = employeePosition && employeePosition.ID ? employeePosition.ID : workBookLastRec && workBookLastRec['employeePositionID']
        return Promise.all([
          HR.reportUtils.getPromiseEmployeePositionForOrders([employeePositionID], orgID, orgID, pDate, ['Gen', 'Dat'], useSexType)
        ]).then(([employeeInfo]) => ({
          employee,
          employeeNumber,
          executorEmployee,
          workBook,
          servRank,
          employeeInfo,
          orderVacation,
          orderVacationLong,
          orderMission,
          respPosInfo,
          respPosInfo1,
          orgToName,
          reportViewCode,
          dismissOrderText,
          workSchedule,
          employeeVacation
        }))
      })
    })
  },
  getParams: function (data) {
    const datNameObj = HR.reportUtils.getEmpIncaseInfo(data.employee, 'dat', true)
    const datName = datNameObj.empName
    const govSrvCat = []
    const govSrvRank = []
    let posName = '____________________'
    let posNameDat = '____________________'
    const firstWorkRec = data.workBook ? _.find(data.workBook, el => el.isOrgAppoint) || data.workBook[0] : undefined
    const dismissWorkRec = data.workBook ? _.findLast(data.workBook, el => el.isOrgDismiss) : undefined
    const lastWorkRec = data.workBook.length ? data.workBook[data.workBook.length - 1] : undefined
    const emplInfo = data.employeeInfo ? data.employeeInfo[0] : undefined // data.employeeInfo || data.employeeInfoLast

    const generalOrg = AC.settings.get('hrFuncOrgType', appAC.globalOrganization()) === '1'

    if (emplInfo) {
      let posInfo = HR.reportUtils.getInfoItemOrderInCase(emplInfo, 'dat', false, false, '')
      posNameDat = posInfo.posName ? posInfo.posName : lastWorkRec ? lastWorkRec['workPosition'] || '' : ''
      posInfo = HR.reportUtils.getInfoItemOrderInCase(emplInfo, 'gen', false, false, '')
      posName = posInfo.posName ? posInfo.posName : lastWorkRec ? lastWorkRec['workPosition'] || '' : ''

      if (emplInfo['positionID.positionType'] === '1') {
        let psCat = emplInfo['positionID.psCategory.name']
        psCat = psCat ? psCat.charAt(0) : '________'
        govSrvCat.push({
          psCategory: psCat,
          groupN: emplInfo['positionID.dictStatePayID.groupN'] || '____'
        })
        if (data.servRank) {
          let rankName = data.servRank['dictRankID.printName']
          const serialStr = AC.currencyService.getSerialNum(rankName)
          if (serialStr) {
            rankName += ` (${serialStr})`
          }
          rankName = rankName ? rankName + '' : '____'
          govSrvRank.push({
            datNameShort: HR.reportUtils.formatShortName(datName),
            rankName: rankName
          })
        }
      }
    }
    const vacOrMission = []
    const orgNameLoc = data.employeeNumber ? data.employeeNumber['orgID.nameLoc'] || data.employeeNumber['orgID.name'] : '____________________'
    if (data.reportViewCode === 'dovidkaZMiscyaRobotyPregnVac') {
      let dateFrom = '____________'
      let vacation = '_______________________________________'
      if (data.orderVacation || data.orderVacationLong) {
        dateFrom = data.orderVacation ? data.orderVacation['dateFrom'] : data.orderVacationLong['dateFrom']
        dateFrom = dateFrom ? AC.dateService.formatDate(dateFrom) : '____________'
        vacation = data.orderVacation ? data.orderVacation['dictVacationKindID.nameLoc'] || data.orderVacation['dictVacationKindID.name'] || vacation
          : data.orderVacationLong['dictVacationKindID.nameLoc'] || data.orderVacationLong['dictVacationKindID.name'] || vacation
      }
      const fio = data.employee.insName ? HR.reportUtils.getShortFIO(data.employee.insName) : data.employee.shortFIO
      vacOrMission.push({ text: UB.i18n(`З {0} перебуває у {1}. На період відпустки за {2} зберігається посада.`, dateFrom, HR.nameCase.uncap(vacation), fio || '') })
    } else if (data.reportViewCode === 'dovidkaZMiscyaRobotyMission') {
      const byHeOrShe = data.employee && data.employee.sexType === 'W' ? UB.i18n('нею') : UB.i18n('ним')
      let dateFrom = '________________'
      let dateTo = '________________ '
      if (data.orderMission) {
        dateFrom = data.orderMission['dateFrom'] ? AC.dateService.formatDate(data.orderMission['dateFrom']) : dateFrom
        dateTo = data.orderMission['dateTo'] ? AC.dateService.formatDate(data.orderMission['dateTo']) + '&nbsp;' : dateTo
      }
      vacOrMission.push({ text: UB.i18n(`На період відрядження з {0} до {1}року за {2} зберігається робоче місце та заробітна плата. Після повернення {3} продовжить свою трудову діяльність у {4}.`, dateFrom, dateTo, byHeOrShe, data.employee.shortFIO, orgNameLoc) })
    }
    let orgDateFrom
    if (firstWorkRec && firstWorkRec.dateFrom) {
      orgDateFrom = firstWorkRec.dateFrom
    } else if (data.employeeNumber) {
      orgDateFrom = data.employeeNumber['appointOrderDetID.dateFrom'] || data.employeeNumber.dateFrom
    }
    let appointOrder = ''
    if (firstWorkRec) {
      if (firstWorkRec.appointOrder) {
        appointOrder = UB.i18n(` ({0}{1}{2})`, firstWorkRec.appointOrder.toLowerCase().indexOf(UB.i18n('наказ')) === -1 ? UB.i18n('наказ') + ' ' : '', firstWorkRec.appointOrder, firstWorkRec.appointOrder.toLowerCase().indexOf('від ') === -1 ? ' від ' + AC.dateService.formatDate(firstWorkRec.dateFrom) + ' р.' : '')
        appointOrder = appointOrder.replace(UB.i18n('Наказ'), UB.i18n('наказ'))
        appointOrder = appointOrder.replace('( ', '(')
      } else {
        appointOrder = UB.i18n(` (наказ від {0} р.)`, AC.dateService.formatDate(firstWorkRec.dateFrom))
      }
    } else {
      appointOrder = data.employeeNumber && data.employeeNumber['appointOrderID.orderNumber'] && data.employeeNumber['appointOrderID.orderDate']
        ? UB.i18n(` (наказ № {0} від {1}&nbsp;року)`, data.employeeNumber['appointOrderID.orderNumber'], AC.dateService.formatDate(data.employeeNumber['appointOrderID.orderDate'])) : ''
    }

    let dismissOrder = ''
    let dismissDate = ''
    if (data.reportViewCode === 'dovidkaZMiscyaRoboty3') {
      if (dismissWorkRec) {
        dismissDate = dismissWorkRec.dateTo ? AC.dateService.getStringFormatDate(dismissWorkRec.dateTo, '', '', UB.i18n(' року')).replace(/ /g, '&nbsp;') : '________________'
        if (dismissWorkRec.dismOrder) {
          dismissOrder = UB.i18n(` ({0}{1}{2})`, dismissWorkRec.dismOrder.toLowerCase().indexOf(UB.i18n('наказ')) === -1 ? UB.i18n('наказ') + ' ' : '', dismissWorkRec.dismOrder, dismissWorkRec.dismOrder.toLowerCase().indexOf('від ') === -1 ? ' від ' + AC.dateService.formatDate(dismissWorkRec.dateTo) + ' р.' : '')
          dismissOrder = dismissOrder.replace(UB.i18n('Наказ'), UB.i18n('наказ'))
          dismissOrder = dismissOrder.replace('( ', '(')
        } else {
          dismissOrder = UB.i18n(` (наказ від {0} р.)`, AC.dateService.formatDate(dismissWorkRec.dateTo))
        }
      } else {
        dismissOrder = data.dismissOrderText
        dismissDate = data.employeeNumber && data.employeeNumber.dateTo && AC.dateService.maxDate().getTime() !== AC.dateService.shiftDate(data.employeeNumber.dateTo).getTime() ? AC.dateService.getStringFormatDate(data.employeeNumber.dateTo, '', '', UB.i18n(' року')).replace(/ /g, '&nbsp;') : '________________'
      }
    }

    const dateFrom = orgDateFrom ? AC.dateService.getStringFormatDate(orgDateFrom, '', '', UB.i18n(' року')).replace(/ /g, '&nbsp;') : '________________'
    const params = {
      printToBlank: AC.settings.get('hrPrintToBlank', appAC.globalOrganization()),
      mainText: data.reportViewCode === 'dovidkaZMiscyaRoboty2'
        ? UB.i18n(`Видана <b>{0}</b> {1} у тому, що {2} дійсно працює в {3} з {4}{5} по теперішній час.`, datName, posNameDat, data.employee.sexType === 'W' ? 'вона' : 'він', orgNameLoc, dateFrom, appointOrder)
        : data.reportViewCode === 'dovidkaZMiscyaRoboty3'
          ? UB.i18n(`Видана <b>{0}</b> у тому, що {1} дійсно {2} в {3} з {4} на посаді {5}{6} по {7}{8}.`, datName, data.employee.sexType === 'W' ? 'вона' : 'він', data.employee.sexType === 'W' ? 'працювала' : 'працював', orgNameLoc, dateFrom, posName, appointOrder, dismissDate, dismissOrder || '')
          : generalOrg
            ? UB.i18n(`Видана <b>{0}</b> у тому, що {1} дійсно працює в {2}{3} на посаді {4}.`, datName, data.employee.sexType === 'W' ? 'вона' : 'він', orgNameLoc, appointOrder, posName)
            : UB.i18n(`Надана <b>{0}</b> в тому, що {1} дійсно з {2} по теперішній час працює в {3}{4} та станом на {5} обіймає посаду {6}.`, datName, data.employee.sexType === 'W' ? 'вона' : 'він', dateFrom, orgNameLoc, appointOrder, AC.dateService.formatDate(appAC.globalApplicationDate()) + '&nbsp;року', posName),
      organizationName: data.employeeNumber ? HR.reportUtils.fixOrganizationName(data.employeeNumber['orgID.nameNom'] || data.employeeNumber['orgID.name'] || '').toUpperCase() : '',
      orgNameLoc: orgNameLoc,
      emblem: HR.reportUtils.getEmblem(),
      govSrvCat: data.reportViewCode === 'dovidkaZMiscyaRoboty2' || data.reportViewCode === 'dovidkaZMiscyaRoboty3' ? [] : govSrvCat,
      govSrvRank: data.reportViewCode === 'dovidkaZMiscyaRoboty2' || data.reportViewCode === 'dovidkaZMiscyaRoboty3' ? [] : govSrvRank,
      workSchedule: data.reportViewCode === 'dovidkaZMiscyaRoboty2' && data.workSchedule && data.workSchedule ? UB.i18n(`Графік роботи: {0}`, data.workSchedule) : '',
      additionalText: data.reportViewCode === 'dovidkaZMiscyaRoboty3' ? UB.i18n('Довідка видана на підставі книг наказів та особової картки ф. П-2.') : '',
      vcationData: data.reportViewCode === 'dovidkaZMiscyaRoboty3' ? data.employeeVacation.map(el => {
        return {
          text: UB.i18n('З') + ' ' + (el.dateFrom ? AC.dateService.getStringFormatDate(el.dateFrom, '', '', UB.i18n(' року')).replace(/ /g, '&nbsp;') : '____________') +
            ' ' + UB.i18n('по') + ' ' + (el.dateTo ? AC.dateService.getStringFormatDate(el.dateTo, '', '', UB.i18n(' року')).replace(/ /g, '&nbsp;') : '____________') +
            (data.employee.sexType === 'W' ? ' перебувала' : ' перебував') + ' ' + UB.i18n('у') + ' ' +
            (el['dictVacationKindID.nameLoc'] || el['dictVacationKindID.name'] || '_____________') +
            (el.orderNumber && el.orderDate ? UB.i18n(` (наказ № {0} від {1}&nbsp;року)`, el.orderNumber, AC.dateService.formatDate(el.orderDate)) : '') + '.'
        }
      }) : [],
      respPos: UB.i18n('Начальник Відділу управління персоналом'),
      respName: '__________________',
      orgToName: data.orgToName,
      vacOrMission: vacOrMission,
      appointOrder: appointOrder,
      execInfo: {
        name: data.executorEmployee ? (data.executorEmployee.firstName ? data.executorEmployee.firstName.charAt(0).toUpperCase() + '.' : '') +
            (data.executorEmployee.lastName || '') : '',
        phone: data.executorEmployee ? (data.executorEmployee.phoneWorking || data.executorEmployee.phoneMobile || '') : ''
      }
    }
    if (data.reportViewCode === 'dovidkaZMiscyaRoboty3') {
      params.vcationData.push({ text: `${data.employeeVacation && data.employeeVacation.length ? 'Інших відпусток' : 'Відпусток'} без збереження заробітної плати не надавалось.` })
    }

    if (data.respPosInfo && data.respPosInfo.length) {
      const posInfo = HR.reportUtils.getInfoItemOrderInCase(data.respPosInfo[0], data.reportViewCode === 'dovidkaZMiscyaRoboty2' || data.reportViewCode === 'dovidkaZMiscyaRoboty3' ? 'Nom' : '', false, false, '',
        { useIsOrgBoss: false, notActualPositionName: data.reportViewCode === 'dovidkaZMiscyaRoboty2' || data.reportViewCode === 'dovidkaZMiscyaRoboty3' })
      params.respPos = posInfo.posName || params.respPos
      params.respName = [data.respPosInfo[0]['employeeID.firstName'], (data.respPosInfo[0]['employeeID.lastName'] || '').toUpperCase()].join(' ') || params.respName
    }
    if (data.respPosInfo1 && data.respPosInfo1.length && (data.respPosInfo && data.respPosInfo.length && (data.respPosInfo1[0]['ID'] !== data.respPosInfo[0]['ID']))) {
      const posInfo = HR.reportUtils.getInfoItemOrderInCase(data.respPosInfo1[0], data.reportViewCode === 'dovidkaZMiscyaRoboty2' || data.reportViewCode === 'dovidkaZMiscyaRoboty3' ? 'Nom' : '', false, false, '',
        { useIsOrgBoss: false, notActualPositionName: data.reportViewCode === 'dovidkaZMiscyaRoboty2' || data.reportViewCode === 'dovidkaZMiscyaRoboty3' })
      params.respPos1 = posInfo.posName || ''
      params.respName1 = [data.respPosInfo1[0]['employeeID.firstName'], (data.respPosInfo1[0]['employeeID.lastName'] || '').toUpperCase()].join(' ') || params.respName1
      params.respPos1 = HR.nameCase.cap(params.respPos1)
      params.secondResp = true
    }
    params.respPos = HR.nameCase.cap(params.respPos)

    return AC.reportService.removeEmptyValues(params)
  }
}
