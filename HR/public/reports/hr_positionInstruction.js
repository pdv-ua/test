/* global HR, UB, AC, appAC */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this

    return me.getReportData(reportParams.instanceID).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (ID) {
    const result = {
      orgName: '',
      workingConditions: '',
      purposePost: '',
      indepStructUnitName: '',
      supervisorPosName: '',
      headIndStrUnitPosName: '',
      coordActUnitPosName: '',
      responsibiliti: [],
      approvePosName: '',
      approveFIO: '',
      signerSupervisorPosName: '',
      signerHeadIndStrUnitPosName: '',
      signerCoordActUnitPosName: ''
    }

    const instruction = await UB.Repository('hr_positionInstruction')
      .attrs(['workingConditions', 'purposePost', 'requirements', 'positionID', 'indepStructUnitID', 'supervisorPosID',
        'headIndStrUnitPosID', 'coordActUnitPosID', 'employeePositionID', 'showSigners'])
      .selectById(ID)

    const responsibiliti = await UB.Repository('hr_positionMainResponsibiliti')
      .attrs(['itemIdx', 'description'])
      .where('positionInstructionID', '=', ID)
      .orderBy('itemIdx')
      .selectAsObject()

    let responsibilitiRight = await UB.Repository('hr_positionRightResponsibiliti')
      .attrs(['itemIdx', 'description'])
      .where('positionInstructionID', '=', ID)
      .where('type', '=', 'COMMON')
      .orderBy('itemIdx')
      .selectAsObject()

    const communication = await UB.Repository('hr_positionServiceCommunication')
      .attrs(['itemIdx', 'objectsEest', 'subjectsStaff'])
      .where('positionInstructionID', '=', ID)
      .orderBy('itemIdx')
      .selectAsObject()

    const pDate = appAC.globalApplicationDate()
    let posData = await UB.Repository('hr_position')
      .attrs(['ID', 'fullName', 'psCategory.name', 'parentUnitID.name', 'orgID.name', 'orgID.nameGen'])
      .where('mi_data_id', '=', instruction.positionID || 0)
      .joinCondition('orgID.mi_dateFrom', '<=', pDate)
      .joinCondition('orgID.mi_dateTo', '>=', pDate)
      .joinCondition('orgID.mi_deleteDate', '>=', '#maxdate')
      .joinCondition('parentUnitID.mi_dateFrom', '<=', pDate)
      .joinCondition('parentUnitID.mi_dateTo', '>=', pDate)
      .joinCondition('parentUnitID.mi_deleteDate', '>=', '#maxdate')
      .joinCondition('parentUnitID.state', '=', 'ACTIVE')
      .misc({ __mip_ondate: pDate })
      .orderBy('state')
      .selectAsObject()
    posData = posData && posData.length > 0 ? posData[0] : []

    if (instruction.showSigners && instruction.employeePositionID) {
      const approveEmp = await UB.Repository('hr_employeePositionS')
        .attrs(['ID', 'positionID.name', 'employeeID.firstName', 'employeeID.lastName'])
        .where('ID', '=', instruction.employeePositionID)
        .joinCondition('positionID.mi_dateFrom', '<=', pDate)
        .joinCondition('positionID.mi_dateTo', '>=', pDate)
        .joinCondition('positionID.mi_deleteDate', '>=', '#maxdate')
        .joinCondition('positionID.state', '=', 'ACTIVE')
        .joinCondition('employeeID.mi_deleteDate', '>=', '#maxdate')
        .selectSingle()

      result.approvePosName = approveEmp && approveEmp['positionID.name'] ? approveEmp['positionID.name'] : ''
      result.approveFIO = approveEmp && approveEmp['employeeID.firstName'] && approveEmp['employeeID.lastName']
        ? `${approveEmp['employeeID.firstName']} ${approveEmp['employeeID.lastName']}` : ''
    }

    const acquaintanceList = await UB.Repository('hr_positionInstructionAcqList')
      .attrs(['employeePositionID.employeeID.fullFIO'])
      .where('positionInstructionID', '=', ID)
      .selectAsObject({
        'employeePositionID.employeeID.fullFIO': 'fio'
      })

    const respEmps = [ instruction.supervisorPosID, instruction.headIndStrUnitPosID, instruction.coordActUnitPosID ].filter(Boolean)
      .filter((el, index, arr) => arr.indexOf(el) === index)
    if (respEmps.length > 0) {
      const remps = await HR.reportUtils.getPositionName(respEmps, ['fullName', 'name'], pDate)
      if (remps[instruction.supervisorPosID]) {
        result.supervisorPosName = remps[instruction.supervisorPosID].name || ''
        if (instruction.showSigners) result.signerSupervisorPosName = remps[instruction.supervisorPosID].name || ''
      }
      if (remps[instruction.headIndStrUnitPosID]) {
        result.headIndStrUnitPosName = remps[instruction.headIndStrUnitPosID].name || ''
        if (instruction.showSigners) result.signerHeadIndStrUnitPosName = remps[instruction.headIndStrUnitPosID].name || ''
      }
      if (remps[instruction.coordActUnitPosID]) {
        result.coordActUnitPosName = remps[instruction.coordActUnitPosID].name || ''
        if (instruction.showSigners) result.signerCoordActUnitPosName = remps[instruction.coordActUnitPosID].name || ''
      }
    }
    if (instruction.indepStructUnitID) {
      result.indepStructUnitName = await UB.Repository('hr_department')
        .attrs(['fullName'])
        .where('mi_data_id', '=', instruction.indepStructUnitID)
        .where('state', '=', 'ACTIVE')
        .misc({ __mip_ondate: pDate })
        .selectScalar()
    }

    responsibiliti.forEach((row, index) => {
      row.description = row.description ? row.description.replace(/\n/g, '<br />') : ''
      row.index = index + 1
    })

    while (responsibiliti.length < 10) {
      responsibiliti.push({
        index: responsibiliti.length + 1,
        description: ''
      })
    }

    const borderT = 'border-top-width: 1px; border-top-style: solid; '
    const borderB = 'border-bottom-width: 1px; border-bottom-style: solid; '
    const borderRL = 'border-right-width: 1px; border-right-style: solid; border-left-width: 1px; border-left-style: solid;'
    responsibilitiRight = responsibilitiRight.map((row, index) => {
      return Object.assign({}, row, {
        index: index + 1,
        border: responsibilitiRight.length === 1 ? 'border: 1px solid;'
          : borderRL + (index === 0 ? borderT : '') + (index === responsibilitiRight.length - 1 ? borderB : '')
      })
    })
    result.rightsHeight = responsibilitiRight && responsibilitiRight.length === 1 ? 'style="height: 60px;"' : ''

    result.orgName = posData['orgID.nameGen'] || posData['orgID.name'] || ''
    result.workingConditions = instruction.workingConditions ? instruction.workingConditions.replace(/\n/g, '<br />') : ''
    result.purposePost = instruction.purposePost ? instruction.purposePost.replace(/\n/g, '<br />') : ''
    result.responsibiliti = responsibiliti
    result.posName = posData.fullName || ''
    result.requirements = instruction.requirements ? instruction.requirements.replace(/\n/g, '<br />') : ''
    result.categoryName = posData['psCategory.name'] || ''
    result.unitName = posData['parentUnitID.name'] || ''
    result.rights = responsibilitiRight
    result.communication = communication.map(item => `${item.objectsEest || ''} ${item.subjectsStaff || ''}`).join(' <br /> ')
    result.acquaintanceList = acquaintanceList && acquaintanceList.length > 0 ? acquaintanceList.map(item => { return { fio: HR.reportUtils.formatShortName(item.fio, false) } }) : [{ fio: '' }]
    return result
  }
}
