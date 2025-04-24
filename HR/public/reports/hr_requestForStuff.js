/* global UB, AC _ HR */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this

    return me.getReportData(reportParams.instanceID).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (requestForStuffID) {
    let result = {
      stuffEducation: '',
      experience: '',
      stuffProf: '',
      stuffComp: '',
      stuffPri: '',
      stuffPcLiteracy: ''
    }

    let requestForStuff = await UB.Repository('hr_requestForStuff')
      .attrs(['positionID.name', 'assignmentType.name', 'positionResp', 'positionInstruction', 'sphereOfResp', 'futuresOfWork.name',
        'descOfExtRelatins', 'needExperience', 'dictLevelUsePcID.name', 'positionID.parentUnitID.mi_unityEntity', 'positionID.parentUnitID.name'])
      .where('ID', '=', requestForStuffID)
      .selectSingle({
        'positionID.name': 'positionName',
        'assignmentType.name': 'assignmentType',
        'positionResp': 'positionResp',
        'positionInstruction': 'positionInstruction',
        'sphereOfResp': 'sphereOfResp',
        'futuresOfWork.name': 'futuresOfWork',
        'descOfExtRelatins': 'descOfExtRelatins',
        'needExperience': 'needExperience',
        'dictLevelUsePcID.name': 'dictLevelUsePc'
      })

    result.positionName = requestForStuff['positionName'] || ''
    result.assignmentType = requestForStuff['assignmentType'] || ''

    result.positionResp = (requestForStuff && requestForStuff['positionResp']) ? requestForStuff['positionResp'].replace(/[\u00B6\r\n]/g, '<br/>') : ''

    result.positionInstruction = (requestForStuff && requestForStuff['positionInstruction']) ? requestForStuff['positionInstruction'].replace(/[\u00B6\r\n]/g, '<br/>') : ''

    result.sphereOfResp = requestForStuff && requestForStuff['sphereOfResp'] ? requestForStuff['sphereOfResp'] : ''
    if (result.sphereOfResp && requestForStuff['sphereOfResp'].indexOf('\n') !== -1) {
      result.sphereOfResp = requestForStuff['sphereOfResp'].replace(/[\u00B6\r\n]/g, '<br/>')
    } else if (result.sphereOfResp && requestForStuff['sphereOfResp'].indexOf(';') !== -1) {
      result.sphereOfResp = requestForStuff['sphereOfResp'].replace(/[;]/g, ';<br/>')
    } else if (result.sphereOfResp && requestForStuff['sphereOfResp'].indexOf(',') !== -1) {
      result.sphereOfResp = requestForStuff['sphereOfResp'].replace(/[,]/g, ',<br/>')
    }

    // result.sphereOfResp = (requestForStuff && requestForStuff['sphereOfResp']) ? requestForStuff['sphereOfResp'].replace(/[\u00B6\r\n]/g, '<br/>') : ''
    // result.sphereOfResp = (requestForStuff && requestForStuff['sphereOfResp']) ? requestForStuff['sphereOfResp'].replace(/[,]/g, ',<br/>') : ''
    // result.sphereOfResp = (requestForStuff && requestForStuff['sphereOfResp']) ? requestForStuff['sphereOfResp'].replace(/[;]/g, ';<br/>') : ''

    result.futuresOfWork = requestForStuff['futuresOfWork'] || ''

    result.descOfExtRelatins = requestForStuff && requestForStuff['descOfExtRelatins'] ? requestForStuff['descOfExtRelatins'] : ''
    if (result.descOfExtRelatins && requestForStuff['descOfExtRelatins'].indexOf('\n') !== -1) {
      result.descOfExtRelatins = requestForStuff['descOfExtRelatins'].replace(/[\u00B6\r\n]/g, '<br/>')
    } else if (result.descOfExtRelatins && requestForStuff['descOfExtRelatins'].indexOf(';') !== -1) {
      result.descOfExtRelatins = requestForStuff['descOfExtRelatins'].replace(/[;]/g, ';<br/>')
    } else if (result.descOfExtRelatins && requestForStuff['descOfExtRelatins'].indexOf(',') !== -1) {
      result.descOfExtRelatins = requestForStuff['descOfExtRelatins'].replace(/[,]/g, ',<br/>')
    }

    if (requestForStuff['positionID.parentUnitID.mi_unityEntity'] === 'hr_department' && requestForStuff['positionID.parentUnitID.name']) {
      result.positionName += ` ${requestForStuff['positionID.parentUnitID.name']}`
    }
    let requestStuffEducation = await UB.Repository('hr_requestStuffEducation')
      .attrs(['dictEducationLevelID.name', 'dictAreasOfEduID.name', 'dictSpecialtyID.name'])
      .where('requestForStuffID', '=', requestForStuffID)
      .selectAsObject()
    let separator = ''
    result.stuffEducationTable = []
    requestStuffEducation.forEach((item, index) => {
      separator = index < requestStuffEducation.length - 1 ? '; ' : ''
      result.stuffEducationTable.push({ stuffEducation:
            [item['dictEducationLevelID.name'], item['dictAreasOfEduID.name'], item['dictSpecialtyID.name']].filter(Boolean).join(', ') + separator })
    })

    result.experienceTable = []
    if (requestForStuff['needExperience']) {
      let requestStuffExperience = await UB.Repository('hr_requestStuffExperience')
        .attrs(['dictExperienceID.name', 'years', 'months', 'comment'])
        .where('requestForStuffID', '=', requestForStuffID)
        .selectAsObject()
      separator = ''
      requestStuffExperience.forEach((item, index) => {
        separator = index < requestStuffExperience.length - 1 ? '; ' : ''
        let strExp = ''
        strExp += item['dictExperienceID.name'] || ''
        strExp += item['dictExperienceID.name'] && (item['years'] || item['months'] || item['comment']) ? ': ' : ''
        strExp += item['years'] ? `${item['years']} р.` : ''
        strExp += item['months'] ? ` ${item['months']} м.` : ''
        strExp += item['comment'] ? ` ${item['comment']}` : ''
        strExp += item['dictExperienceID.name'] || item['years'] || item['months'] || item['comment'] ? separator : ''
        if (strExp.length > 0) result.experienceTable.push({ experience: strExp })
      })
    } else {
      result.experienceTable.push({ experience: UB.i18n('Не потребує') })
    }

    let requestStuffProf = await UB.Repository('hr_requestStuffProfi')
      .attrs(['dictRequiredParaID.name', 'requirement'])
      .where('requestForStuffID', '=', requestForStuffID)
      .selectAsObject()
    separator = ''
    result.stuffProfTable = []
    let reqNames = requestStuffProf.map(item =>
      item['dictRequiredParaID.name']
    )
    let reqNamesSet = new Set(reqNames)
    reqNamesSet.forEach(item => {
      let obj = { stuffProfReqName: item, stuffProfGroup: [] }
      let req = requestStuffProf.filter(el => el['dictRequiredParaID.name'] === item)
      req.forEach(r => {
        if (r['requirement']) obj.stuffProfGroup.push({ stuffProfReq: `- ${r['requirement']}` })
      })
      result.stuffProfTable.push(obj)
    })

    // result.stuffPcLiteracy = requestForStuff['dictLevelUsePc']
    let requestStuffPcLiteracy = await UB.Repository('hr_requestStuffPcLiteracy')
      .attrs(['dictLevelUsePcID.name', 'soft', 'comment'])
      .where('requestForStuffID', '=', requestForStuffID)
      .selectAsObject()
    separator = ''
    result.stuffPcLiteracyTable = []
    requestStuffPcLiteracy.forEach((item, index) => {
      separator = index < requestStuffPcLiteracy.length - 1 ? '; ' : ''
      let strPC = ''
      strPC += item['dictLevelUsePcID.name'] || ''
      strPC += item['dictLevelUsePcID.name'] && (item['soft'] || item['comment']) ? ': ' : ''
      strPC += item['soft'] ? `${item['soft']}` : ''
      strPC += item['soft'] && item['comment'] ? ` - ${item['comment']}` : ''
      strPC += !item['soft'] && item['comment'] ? ` ${item['comment']}` : ''
      strPC += strPC.length > 0 && (item['dictLevelUsePcID.name'] || item['soft'] || item['comment']) ? separator : ''

      if (strPC.length > 0) result.stuffPcLiteracyTable.push({ stuffPcLiteracy: strPC })
    })

    let requestStuffComp = await UB.Repository('hr_requestStuffComp')
      .attrs(['dictRequiredParaID.name', 'requirement'])
      .where('requestForStuffID', '=', requestForStuffID)
      .selectAsObject()
    separator = ''
    result.stuffCompTable = []

    let reqCompNames = requestStuffComp.map(item =>
      item['dictRequiredParaID.name']
    )
    let reqCompNamesSet = new Set(reqCompNames)
    reqCompNamesSet.forEach(item => {
      let obj = { stuffCompName: item, stuffCompGroup: [] }

      let req = requestStuffComp.filter(el => el['dictRequiredParaID.name'] === item)
      req.forEach(r => {
        if (r['requirement']) obj.stuffCompGroup.push({ stuffCompReq: `- ${r['requirement']}` })
      })
      result.stuffCompTable.push(obj)
    })

    let requestStuffPrivat = await UB.Repository('hr_requestStuffPrivat')
      .attrs(['requirement'])
      .where('requestForStuffID', '=', requestForStuffID)
      .selectAsObject()
    separator = ''
    result.stuffPriTable = []
    requestStuffPrivat.forEach((item, index) => {
      separator = index < requestStuffPrivat.length - 1 ? '; ' : ''
      let strStuffPri = ''
      strStuffPri += item['requirement'] ? item['requirement'] + separator : ''
      if (strStuffPri.length > 0) result.stuffPriTable.push({ stuffPri: strStuffPri })
    })

    return result
  }
}
