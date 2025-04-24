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
      rows: []
    }

    const order = await UB.Repository('hr_order')
      .attrs(['ID', 'orderClass.entityName'])
      .selectById(reportParams.instanceID)

    const requestData = order['orderClass.entityName'] === 'hr_request'
      ? await UB.Repository('hr_request')
        .attrs(['requestNumber', 'requestType.name', 'mi_createDate',
          'organizationID', 'organizationID.shortName', 'organizationID.name', 'organizationID.EDRPOUCode'])
        .selectById(reportParams.instanceID, {
          'requestType.name': 'typeName',
          'requestNumber': 'number',
          'mi_createDate': 'createDate'
        })
      : await UB.Repository('hr_empOrder')
        .attrs(['orderNumber', 'description', 'orderDate',
          'organizationID', 'organizationID.shortName', 'organizationID.name', 'organizationID.EDRPOUCode'])
        .selectById(reportParams.instanceID, {
          'orderNumber': 'number',
          'orderDate': 'createDate'
        })

    requestData.number = requestData.number || ''

    const useActualPositionName = AC.settings.get('hrOrderActualPositionName', requestData.organizationID) === true
    const useSexType = AC.settings.get('hrUseSexTypeInOrders', requestData.organizationID) === true

    result.docInfo = requestData.description
      ? requestData.description
      : UB.i18n(`{0} № {1} від {2}`, requestData.typeName, requestData.number, requestData.createDate ? AC.dateService.formatDate(requestData.createDate) : '_____________')
    result.docNumber = UB.i18n(`№ {0} від {1}`, requestData.number, requestData.createDate ? AC.dateService.formatDate(requestData.createDate) : '_____________')
    result.organizationName = requestData['organizationID.shortName'] || requestData['organizationID.name'] || ''

    const recParticipant = await UB.Repository('hr_recparticipant')
      .attrs(['ID', 'recStageID.stageKind.name', 'executionDate', 'employeePosition', 'employeePosition.positionID',
        'employeePosition.employeeID.lastName', 'employeePosition.employeeID.firstName', 'employeePosition.employeeID.sexType'])
      .attrsIf(useActualPositionName, ['employeePosition.factPosition'])
      .where('docID', '=', reportParams.instanceID)
      .where('recStageID.entityName', '=', 'hr_recstage')
      .orderBy('recStageID.orderIndex')
      .selectAsObject()

    const signatureData = await UB.Repository('hr_empOrderSignature')
      .attrs(['ID', 'participantID', 'signerName', 'signatureDate'])
      .where('participantID', 'isNotNull')
      .where('canceled', '=', false)
      .where('docID', '=', reportParams.instanceID)
      .selectAsObject()

    if (recParticipant.length) {
      let pki
      try {
        pki = await $App.connection.pki()
      } catch (e) {
      }

      const positions = []
      for (let i = 0; i < recParticipant.length; i++) {
        const participantItem = recParticipant[i]
        const participantRow = {
          name: '',
          stageAndDate: (participantItem['recStageID.stageKind.name'] || '') + (participantItem.executionDate ? '<br />' + AC.dateService.formatDate(participantItem.executionDate) : ''),
          kep: '',
          serial: ''
        }
        result.rows.push(participantRow)

        if (participantItem.employeePosition) {
          const empName = `${participantItem['employeePosition.employeeID.firstName'] || ''} ${participantItem['employeePosition.employeeID.lastName'] || ''}`
          let posName = ''
          if (useActualPositionName) {
            posName = participantItem['employeePosition.factPosition'] || ''
          } else if (participantItem['employeePosition.positionID']) {
            const sexTypeF = useSexType && participantItem['employeePosition.employeeID.sexType'] === 'W'
            const posItem = positions.find(el => el.ID === participantItem['employeePosition.positionID'] && el.sexTypeF === sexTypeF)
            if (posItem) {
              posName = posItem.name
            } else {
              posName = await me.getPosName(participantItem['employeePosition.positionID'], pDate, sexTypeF)
              positions.push({
                ID: participantItem['employeePosition.positionID'],
                sexTypeF: sexTypeF,
                name: posName
              })
            }
          }
          participantRow.name = `<b>${empName}</b>${posName && empName ? '<br />' : ''}${posName}`
        }

        const sign = signatureData.find(el => el.participantID === participantItem.ID)
        if (sign) {
          sign.certificateIssuedBy = ''
          sign.certificateSerial = '-'
          let signature
          if (pki) {
            try {
              signature = await $App.connection.getDocument({
                entity: 'hr_empOrderSignature',
                attribute: 'signature',
                ID: sign.ID
              }, {
                bypassCache: true,
                resultIsBinary: true
              })
            } catch (e) {
            }

            if (signature) {
              const verifyResult = await pki.verify(signature, {
                entity: order ? order['orderClass.entityName'] : 'hr_order',
                attribute: 'document',
                ID: reportParams.instanceID })

              if (verifyResult && verifyResult.valid) {
                sign.certificateSerial = verifyResult.certificate.serial || ''
                sign.certificateIssuedBy = verifyResult.certificate.issuedBy.fullName || ''
                sign.signerName = verifyResult.subject.fullName || sign.signerName
                sign.signatureDate = verifyResult.signingTime ? AC.dateService.formatDate(verifyResult.signingTime) : sign.signatureDate
                sign.validPeriod = (verifyResult.certificate.validFrom ? AC.dateService.formatDate(verifyResult.certificate.validFrom) : '') +
                  (verifyResult.certificate.validFrom && verifyResult.certificate.validTo ? '-' : '') +
                  (verifyResult.certificate.validTo ? AC.dateService.formatDate(verifyResult.certificate.validTo) : '')
              }
            }
          }

          participantRow.kep = [
            UB.i18n('Підписано КЕП.') + (sign.signerName ? ' ' + sign.signerName : ''),
            sign.signatureDate ? UB.i18n('Позначка часу:') + ' ' + AC.dateService.formatDate(sign.signatureDate) : '',
            sign.certificateIssuedBy ? UB.i18n('Сертифікат виданий:') + ' ' + sign.certificateIssuedBy : '',
            sign.validPeriod ? UB.i18n('Термін дії ключа:') + ' ' + sign.validPeriod : ''
          ].filter(Boolean).join(' <br />')
          participantRow.serial = sign.certificateSerial || ''
        }
      }
    }
    const canvas = document.createElement('canvas')
    JsBarcode(canvas, `${pDate.getFullYear()}${requestData['organizationID.EDRPOUCode'] || ''}${requestData.number.replace(/[^\d]/g, '').padStart(10, '0')}`,
      { format: 'CODE128' })
    result.barCode = canvas.toDataURL('image/png')
    const qr = new QRious({
      value: UB.format('{0}//{1}{2}#{3}', window.location.protocol, window.location.host, window.location.pathname,
        `cmdType=showForm&entity=hr_request&formCode=hr_request&instanceID=${reportParams.instanceID}`)
    })
    result.qrCode = qr.toDataURL()

    return result
  },
  getPosName: async function (id, pDate, sexTypeF) {
    if (!id) {
      return ''
    }

    let positionName = ''
    for (let k = 0; k < 2; k++) {
      const position = UB.Repository('hr_position')
        .limit(1)
        .attrs('fullNameNom', 'fullName', 'name')
        .attrsIf(sexTypeF, 'fullNameNomF')
        .where('mi_data_id', '=', id || 0)
        .where('state', '=', 'ACTIVE')
      if (k === 0) {
        position.misc({ __mip_ondate: pDate })
      } else {
        position
          .misc({ __mip_recordhistory_all: true })
          .orderBy('mi_dateFrom', 'desc')
          .orderBy('mi_dateTo', 'desc')
      }

      const positionData = await position.selectSingle()
      if (positionData) {
        positionName = sexTypeF
          ? positionData.fullNameNomF || positionData.fullNameNom || positionData.fullName || positionData.name || ''
          : positionData.fullNameNom || positionData.fullName || positionData.name || ''
        k = 2
      }
    }
    return HR.nameCase.cap(positionName)
  }
}
