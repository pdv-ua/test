/* global UB AC appAC */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    return me.getReportData(reportParams).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (reportParams) {
    let instanceID = reportParams.instanceID
    let onDate = reportParams.onDate

    let result = {
      orgName: '',
      orderInfo: '',
      positionName: '',
      departmentName: '',
      departmentName2: '',
      assignmentType: '',
      positionResp: '',
      education: '',
      experience: '',
      comp: [],
      profi: []
    }

    const organizationID = appAC.globalOrganization()
    const orgData = await UB.Repository('hr_organization')
      .attrs(['nameGen', 'name'])
      .where('mi_data_id', '=', organizationID)
      .where('state', '=', 'ACTIVE')
      .misc({ __mip_ondate: onDate })
      .selectSingle()
    result.orgName = orgData ? (orgData.nameGen || orgData.name) : ''

    let requestStuffMotion = await UB.Repository('hr_requestStuffMotion')
      .attrs(['requestForStuffID', 'requestForStuffID.positionID.name', 'requestForStuffID.departmentID.name', 'requestForStuffID.departmentID',
        'orderCompetitionID.orderDate', 'orderCompetitionID.orderNumber', 'requestForStuffID.assignmentType', 'requestForStuffID.positionResp',
        'requestForStuffID.needExperience'])
      .selectById(instanceID)

    result.positionName = (requestStuffMotion && requestStuffMotion['requestForStuffID.positionID.name']) || ''
    result.departmentName = (requestStuffMotion && requestStuffMotion['requestForStuffID.departmentID.name']) || ''
    result.departmentName2 = ''
    result.orderInfo = requestStuffMotion && requestStuffMotion['orderCompetitionID.orderDate']
      ? UB.i18n(`від {0} № {1}`, AC.dateService.formatDate(requestStuffMotion['orderCompetitionID.orderDate']), requestStuffMotion['orderCompetitionID.orderNumber'])
      : ''
    result.assignmentType = requestStuffMotion && requestStuffMotion['requestForStuffID.assignmentType']
      ? UB.core.UBEnumManager.getStore('HR_REQ4STUFF_ASSIGNMENT_TYPE').getById(requestStuffMotion['requestForStuffID.assignmentType']).get('name') || ''
      : ''

    result.positionResp = requestStuffMotion && requestStuffMotion['requestForStuffID.positionResp'] ? (requestStuffMotion['requestForStuffID.positionResp'].replace(/[\u00B6\r\n]/g, '<br/>')) : ''

    if (requestStuffMotion && requestStuffMotion['requestForStuffID']) {
      let requestForStuffID = requestStuffMotion['requestForStuffID']

      let requestStuffEducation = await UB.Repository('hr_requestStuffEducation')
        .attrs(['ID', 'dictEducationLevelID.name', 'dictAreasOfEduID.name', 'dictSpecialtyID.name'])
        .where('requestForStuffID', '=', requestForStuffID)
        .selectAsObject()
      result.education = requestStuffEducation && requestStuffEducation.map(e => [e['dictEducationLevelID.name'] ? e['dictEducationLevelID.name'] : '', e['dictAreasOfEduID.name'] ? e['dictAreasOfEduID.name'] : '', e['dictSpecialtyID.name'] ? e['dictSpecialtyID.name'] : ''].filter(Boolean).join(', ')).join(';<br/>')

      let requestStuffExperience = await UB.Repository('hr_requestStuffExperience')
        .attrs(['ID', 'dictExperienceID.name', 'years', 'months', 'comment'])
        .where('requestForStuffID', '=', requestForStuffID)
        .selectAsObject()
      result.experience = !requestStuffMotion['requestForStuffID.needExperience']
        ? UB.i18n('Не потребує')
        : requestStuffExperience.map(e => `${e['dictExperienceID.name'] ? (e['dictExperienceID.name'] + ': ') : ''}${e['years'] ? `${e['years']}р. ` : ``}${e['months'] ? `${e['months']}м. ` : ``}${e['comment'] ? ` ${e['comment']}` : ``}`).filter(Boolean).join(';<br/>')

      let requestStuffComp = await UB.Repository('hr_requestStuffComp')
        .attrs(['ID', 'dictRequiredParaID.name', 'requirement'])
        .where('requestForStuffID', '=', requestForStuffID)
        .selectAsObject()

      let itemIdx = 0
      requestStuffComp.forEach(item => {
        result.comp.push({
          itemIdx: ++itemIdx,
          name: item['dictRequiredParaID.name'],
          requirement: item['requirement']
        })
      })

      let requestStuffProfi = await UB.Repository('hr_requestStuffProfi')
        .attrs(['ID', 'dictRequiredParaID.name', 'requirement'])
        .where('requestForStuffID', '=', requestForStuffID)
        .selectAsObject()

      itemIdx = 0
      requestStuffProfi.forEach(item => {
        result.profi.push({
          itemIdx: ++itemIdx,
          name: item['dictRequiredParaID.name'],
          requirement: item['requirement']
        })
      })
    }

    return result
  }
}
