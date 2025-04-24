/* global UB AC appAC HR JsBarcode QRious */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this

    reportParams = (typeof reportParams === 'string') ? JSON.parse(reportParams) : reportParams
    return me.getReportData(reportParams).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (reportParams) {
    const me = this
    const pDate = appAC.globalApplicationDate()
    const result = {
      bossPositionName: '',
      orgName: '',
      bossName: '',
      employeePositionName: '',
      employeeName: '',
      dateRequest: AC.dateService.getStringFormatDate(pDate, '', '', UB.i18n(' р.'))
    }

    const requestData = await UB.Repository('hr_request')
      .attrs(['requestType', 'organizationID', 'requestNumber', 'mi_createDate', 'requestDate', 'organizationID.EDRPOUCode',
        'organizationID.nameGen', 'organizationID.name', 'organizationID.shortName', 'employeeNumberID', 'vacationKindID',
        'employeeNumberID.employeeID.fullFIO', 'employeeNumberID.employeeID.shortFIO', 'vacationKindID.dayAccumCondition',
        'employeeNumberID.employeeID.genName', 'employeeNumberID.employeeID.lastName', 'employeeNumberID.employeeID.firstName',
        'recipientID', 'vacationKindID.name', 'vacationKindID.nameAcc', 'dateFrom', 'dateTo', 'dayCount', 'workDayCount',
        'requestReason', 'lastName', 'firstName', 'middleName', 'reasonDocument', 'requestDescription',
        'vacationKindID.nameGen', 'isMoneyHelp', 'dictRequestKindID.interval', 'dictRequestKindID.countRows'])
      .where('organizationID.mi_dateFrom', '<=', pDate)
      .where('organizationID.mi_dateTo', '>=', pDate)
      .where('organizationID.mi_deleteDate', '>=', '#maxdate')
      .where('organizationID.state', '=', 'ACTIVE')
      .selectById(reportParams.instanceID)
    result.interval = requestData['dictRequestKindID.interval'] || 1.35
    const countRows = requestData['dictRequestKindID.countRows'] === null ? 6 : requestData['dictRequestKindID.countRows']

    result.emptyRows = []
    for (let i = 0; i < countRows; i++) {
      result.emptyRows.push({ value: '' })
    }

    result.dateRequest = requestData.mi_createDate ? AC.dateService.getStringFormatDate(requestData.mi_createDate, '', '', UB.i18n(' р.')) : ''
    result.requestNumber = UB.i18n(`№ {0} від {1}`, requestData.requestNumber, AC.dateService.formatDate(requestData.mi_createDate))
    const { requestType } = requestData
    if (requestData.recipientID) {
      const recipientEmployee = await UB.Repository('hr_employeePositionS')
        .attrs(['ID', 'employeeID.datName', 'employeeID.fullFIO', 'positionID', 'organizationID'])
        .where('ID', '=', requestData.recipientID)
        .selectSingle()

      const respPosition = requestType === 'REQUEST_CHANGE_DATA'
        ? 'signer4PersonData'
        : requestType === 'REQUEST_GET_VACATION'
          ? 'signer4Vac'
          : requestType === 'REQUEST_ARBITARY'
            ? 'signer4FreeForm'
            : ''

      const useFullNamePosition = await UB.Repository('hr_orgRespPosition')
        .attrs('useFullNamePosition')
        .where('dateFrom', 'isNull', undefined, 'dateFromIsNull')
        .where('dateFrom', '<=', pDate, 'dateFromOnDate')
        .where('dateTo', 'isNull', undefined, 'dateToIsNull')
        .where('dateTo', '>=', pDate, 'dateToOnDate')
        .logic('([dateFromIsNull] or [dateFromOnDate]) and ([dateToIsNull] or [dateToOnDate])')
        .where('organizationID', '=', recipientEmployee.organizationID)
        .where('respPosition', '=', respPosition || '')
        .selectScalar()

      result.bossPositionName = recipientEmployee ? await me.getPosName(recipientEmployee.positionID || 0, useFullNamePosition ? ['fullNameDat', 'fullName'] : ['nameDat', 'name'], pDate, true) : ''
      result.bossName = recipientEmployee ? `${HR.reportUtils.getShortFIO(recipientEmployee['employeeID.datName'] || recipientEmployee['employeeID.fullFIO'] || '')} ` : ''
    }
    result.orgName = requestData['organizationID.nameGen'] || requestData['organizationID.name'] || ''
    result.organizationName = requestData['organizationID.shortName'] || requestData['organizationID.name'] || ''

    const { employeeNumberID, vacationKindID } = requestData
    const employeePosition = await UB.Repository('hr_employeePositionS')
      .attrs(['positionID'])
      .where('dateFrom', '<=', pDate)
      .where('dateTo', '>=', pDate)
      .where('employeeNumberID', '=', employeeNumberID)
      .selectScalar()
    result.employeePositionName = await me.getPosName(employeePosition, ['fullNameGen', 'fullName'], pDate, false)

    result.employeeName = `${requestData['employeeNumberID.employeeID.genName'] || requestData['employeeNumberID.employeeID.fullFIO']}`
    if (requestData['employeeNumberID.employeeID.firstName'] && requestData['employeeNumberID.employeeID.lastName']) {
      result.employeeNameFL = `${requestData['employeeNumberID.employeeID.firstName']} ${requestData['employeeNumberID.employeeID.lastName'].toUpperCase()}`
    } else {
      result.employeeNameFL = requestData['employeeNumberID.employeeID.shortFIO'] || ''
    }

    switch (requestType) {
      case 'REQUEST_CHANGE_DATA': {
        result.changeData = [{
          fromFIO: requestData['employeeNumberID.employeeID.fullFIO'] || '',
          toFIO: `${requestData.lastName || ''} ${requestData.firstName || ''} ${requestData.middleName || ''}`,
          requestReason: requestData.requestReason ? UB.i18n(`, у зв'язку із {0}`, HR.nameCase.uncap(requestData.requestReason)) : '',
          reasonDocument: requestData.reasonDocument || ''
        }]
        break
      }
      case 'REQUEST_GET_VACATION': {
        const funcOrgType = AC.settings.get('hrFuncOrgType', appAC.globalOrganization())
        let vacPlanDayCount
        for (let i = 1; i <= 2; i++) {
          vacPlanDayCount = await UB.Repository('hr_empVacationPlan')
            .attrs(['dayCount'])
            .where('employeeNumberID', '=', employeeNumberID)
            .where('dictVacationKindID', '=', vacationKindID)
            .whereIf(i === 1, 'dateFrom', '<=', pDate)
            .whereIf(i === 1, 'dateTo', '>=', pDate)
            .orderBy('dateFrom', 'desc')
            .orderBy('dateTo', 'desc')
            .selectScalar()
          if (vacPlanDayCount !== undefined) {
            i = 2
          }
        }
        let requestText
        const vacKindNameGen = HR.nameCase.uncap(requestData['vacationKindID.nameGen'] || requestData['vacationKindID.name'] || '')
        if (vacPlanDayCount && vacPlanDayCount > requestData.workDayCount) {
          requestText = UB.i18n('частину ') + vacKindNameGen
        } else {
          requestText = HR.nameCase.uncap(requestData['vacationKindID.nameAcc'] || requestData['vacationKindID.name'] || '')
        }
        result.getVacation = [{
          requestText: requestText,
          period: requestData.dateFrom && requestData.dateTo
            ? AC.dateService.dateDiff(requestData.dateFrom, requestData.dateTo)
              ? UB.i18n(`з&nbsp;{0} по&nbsp;{1}`, AC.dateService.formatDate(requestData.dateFrom), AC.dateService.formatDate(requestData.dateTo))
              : UB.i18n(`на&nbsp;{0}`, AC.dateService.formatDate(requestData.dateTo))
            : '',
          days: `${requestData.workDayCount || ''}&nbsp;${AC.dateService.plural(UB.i18n('календарний день_календарних дні_календарних днів'), requestData.workDayCount)}`,
          holidays: requestData['vacationKindID.dayAccumCondition'] === 'noHolidays' ? await me.getHolidaysInfo(requestData.dateFrom, requestData.dateTo, appAC.globalOrganization()) : '',
          requestReason: requestData.requestReason ? UB.i18n(` у зв'язку із {0}`, HR.nameCase.uncap(requestData.requestReason)) : '',
          reasonDocument: requestData.reasonDocument || '',
          moneyHelpText: (funcOrgType === '2' && requestData.isMoneyHelp) ? UB.i18n(' з виплатою грошової допомоги у розмірі середньомісячної заробітної плати') : ''
        }]
        break
      }
      case 'REQUEST_ARBITARY': {
        const requestReason = requestData.requestReason ? UB.i18n(`, у зв'язку із {0}`, HR.nameCase.uncap(requestData.requestReason)) : ''
        let requestDescription = requestData.requestDescription || ''
        if (requestReason && requestDescription) {
          requestDescription = requestDescription.substr(-1)  === '.' ? requestDescription.substr(0, requestDescription.length - 1) : requestDescription
          requestDescription = `${requestDescription}${requestReason}.`
        }
        result.arbitary = [{
          requestDescription: requestDescription,
          reasonDocument: requestData.reasonDocument || ''
        }]
        break
      }
      default: {
        break
      }
    }

    const canvas = document.createElement('canvas')
    JsBarcode(canvas, `${pDate.getFullYear()}${requestData['organizationID.EDRPOUCode']}${requestData.requestNumber.replace(/а-яА-ЯҐЄЇІіґєїЁёa/g, '').padStart(10, '0')}`,
      { format: 'CODE128' })
    result.barCode = canvas.toDataURL('image/png')
    const qr = new QRious({
      value: UB.format('{0}//{1}{2}#{3}', window.location.protocol, window.location.host, window.location.pathname,
        `cmdType=showForm&entity=hr_request&formCode=hr_request&instanceID=${reportParams.instanceID}`)
    })
    result.qrCode = qr.toDataURL()
    result.ownerPkiInfo = reportParams.ownerPkiInfo || ''

    return result
  },
  getPosName: async function (id, attArray, pDate, cap) {
    if (!id) {
      return ''
    }

    let positionName = ''
    for (let k = 0; k < 2; k++) {
      const empPosition = UB.Repository('hr_position')
        .attrs(attArray)
        .where('mi_data_id', '=', id || 0)
        .where('state', '=', 'ACTIVE')
      if (k === 0) {
        empPosition.misc({ __mip_ondate: pDate })
      } else {
        empPosition
          .misc({ __mip_recordhistory_all: true })
          .orderBy('mi_dateFrom', 'desc')
          .orderBy('mi_dateTo', 'desc')
      }
      const empPositionData = await empPosition.selectAsObject()
      if (empPositionData && empPositionData.length > 0) {
        attArray.forEach(el => {
          if (!positionName) {
            positionName = empPositionData[0][el] || ''
          }
        })
        k = 2
      }
    }
    return cap ? HR.nameCase.cap(positionName) : positionName
  },
  getHolidaysInfo: async function (dateFrom, dateTo, orgID) {
    const holidays = await HR.reportUtils.getCalendarHoliday(dateFrom, dateTo, orgID)
    return holidays && holidays.length > 0 ? UB.i18n(' (не враховуючи ') + holidays.map(item => AC.dateService.getStringFormatDate(item, '', '', UB.i18n(' року')).replace(/ /g, '&nbsp;')).join(', ') + (holidays.length === 1 ? UB.i18n(' - святковий день) ') : UB.i18n(' - святкових днів) ')) : ''
  }
}
