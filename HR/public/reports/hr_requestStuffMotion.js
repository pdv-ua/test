/* global appAC UB AC HR _ */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    reportParams = (typeof reportParams === 'string') ? JSON.parse(reportParams) : reportParams
    return me.getReportData(reportParams.caller).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },

  getReportData: async function (reportParams) {
    const onDate = appAC.globalApplicationDate()
    const requestStuffMotionID = reportParams.instanceID
    const result = {
      orgName: '',
      positionName: '',
      positionCategory: '',
      departmentName: '',
      departmentName2: '',
      requestStaffMotionGoal: '',
      mainChiefPos: '',
      mainChiefName: '',
      items: []
    }

    const requestStuffMotion = await UB.Repository('hr_requestStuffMotion')
      .attrs(['organizationID', 'organizationID.name', 'requestForStuffID.positionID.name', 'requestForStuffID.positionID.psCategory',
        'requestForStuffID.departmentID.name', 'requestForStuffID.departmentID', 'requestStaffMotionGoal'])
      .joinCondition('organizationID.mi_dateFrom', '<=', onDate)
      .joinCondition('organizationID.mi_dateTo', '>=', onDate)
      .joinCondition('organizationID.mi_deleteDate', '>=', '#maxdate')
      .joinCondition('organizationID.state', '=', 'ACTIVE')
      .selectById(requestStuffMotionID)

    result.year = onDate.getFullYear()
    result.orgName = requestStuffMotion['organizationID.name'] || ''
    result.positionName = requestStuffMotion['requestForStuffID.positionID.name'] || ''
    result.positionCategory = requestStuffMotion['requestForStuffID.positionID.psCategory']
      ? `«${UB.core.UBEnumManager.getStore('HR_POSITION_PSCATEGORY').getById(requestStuffMotion['requestForStuffID.positionID.psCategory']).get('name') || ''}» `
      : ''
    result.departmentName = requestStuffMotion['requestForStuffID.departmentID.name'] || ''
    result.departmentName2 = ''
    result.requestStaffMotionGoal = HR.reportUtils.fixOrganizationName(requestStuffMotion['requestStaffMotionGoal'] || '')

    const mainChief = await HR.reportUtils.getOrgBossInfo(requestStuffMotion['organizationID'], onDate, ['employeeID.shortFIO'])
    result.mainChiefPos = mainChief ? mainChief['positionID.name'] : ''
    result.mainChiefName = mainChief ? mainChief['employeeID.shortFIO'] : ''

    const requestStuffExpert = await UB.Repository('hr_requestStuffExpert')
      .attrs(['ID', 'employeePositionID.employeeID.fullFIO', 'employeePositionID.positionID'])
      .where('requestStuffMotionID', '=', requestStuffMotionID)
      .orderBy('employeePositionID.description')
      .selectAsObject()

    const positionIDs = _.uniq(requestStuffExpert.map(item => item['employeePositionID.positionID']))
    const positions = []
    for (let i = 0; i < positionIDs.length; i++) {
      if (!positions[positionIDs[i]]) {
        positions[positionIDs[i]] = { name: '' }
        for (let k = 0; k < 2; k++) {
          const empPosition = UB.Repository('hr_position')
            .attrs('name')
            .where('mi_data_id', '=', positionIDs[i] || 0)
            .where('orgID', '=', requestStuffMotion.organizationID || 0)
            .where('state', '=', 'ACTIVE')
            .where('mi_deleteDate', '>=', '#maxdate')
          if (k === 0) {
            empPosition.misc({ __mip_ondate: onDate })
          } else {
            empPosition
              .misc({ __mip_recordhistory_all: true })
              .orderBy('mi_dateFrom', 'desc')
              .orderBy('mi_dateTo', 'desc')
          }
          const empPositionData = await empPosition.selectAsObject()
          if (empPositionData && empPositionData.length > 0) {
            positions[positionIDs[i]].name = empPositionData[0].name || ''
            k = 2
          }
        }
      }
    }

    let itemIdx = 0
    requestStuffExpert.forEach(item => {
      result.items.push({
        itemIdx: ++itemIdx,
        employeeName: item['employeePositionID.employeeID.fullFIO'] || '',
        positionName: positions[item['employeePositionID.positionID']] ? positions[item['employeePositionID.positionID']].name || '' : ''
      })
    })

    return result
  }
}
