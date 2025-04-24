const UB = require('@unitybase/ub')
const App = UB.App
// const argv = require('@unitybase/base').argv
const path = require('path')
const docxService = require('../../../AC/modules/documentBuilder/docxService')
const dateService = require('../../../AC/modules/dataServices/dateService')
const settingsService = require('../../../AC/modules/entityServices/settingsService')
const nameCaseService = require('../nameCaseService')
const _ = require('lodash')

module.exports = {
  getDocx
}

function getDocx (params) {
  if (!params.code) {
    return null
  }
  const configDir = process.configPath
  const templatePath = path.join(configDir, App.domainInfo.models.HR.path, 'modules', 'template')
  switch (params.code) {
    case 'osobovaKartka':
      return osobovaKartka(params, templatePath)
    case 'dergSlugOsobovaKartka':
      return dergSlugOsobovaKartka(params, templatePath)
    case 'dergSlugOsobovaKartka2020':
      return dergSlugOsobovaKartka2020(params, templatePath)
    case 'empOrderOath':
      return empOrderOath(params, templatePath)
    case 'empOrderCommitment':
      return empOrderCommitment(params, templatePath)
    case 'empOrderCivilMemo':
      return empOrderCivilMemo(params, templatePath)
    case 'empOath':
      return empOath(params, templatePath)
    case 'empCivilMemo':
      return empCivilMemo(params, templatePath)
    case 'empCommitment':
      return empCommitment(params, templatePath)
    case 'povidomZminaOblikData':
      return povidomZminaOblikData(params, templatePath)
    case 'biografDovidka':
      return biografDovidka(params, templatePath)
    case 'agreementProcessingData':
      return agreementProcessingData(params, templatePath)
  }
}

function biografDovidka (params, templatePath) {
  const data = {}
  let sFileName = 'БІОГРАФІЧНА ДОВІДКА'
  let requestAttrs = ['fullFIO', 'shortFIO', 'birthDate', 'citizenshipID.name', 'oathDate', 'birthPlace']
  const ignoreAttrs = ['shortFIO']
  const employee = UB.Repository('hr_employee')
    .attrs(requestAttrs)
    .selectById(params.employeeID)
  setData(data, employee, requestAttrs, ['birthDate', 'oathDate'], ignoreAttrs)

  if (employee && employee.shortFIO) {
    sFileName = UB.i18n(`БІОГРАФІЧНА ДОВІДКА {0}`, employee.shortFIO)
  }

  const org = UB.Repository('hr_organization')
    .attrs(['name', 'nameLoc', 'nameNom'])
    .where('mi_data_id', '=', params.orgID)
    .where('state', '=', 'ACTIVE')
    .misc({ __mip_ondate: params.onDate })
    .orderBy('mi_dateFrom', 'desc')
    .limit(1)
    .selectSingle()
  const orgName = org.nameLoc || org.nameNom || org.name || ''

  const useActualPositionName = settingsService.getByCode('hrOrderActualPositionName', params.orgID) === true
  const useSexType = settingsService.getByCode('hrUseSexTypeInOrders', params.orgID) === true

  // посада, структурний підрозділ, найменування органу, в якому працює
  requestAttrs = ['ID', 'employeeID', 'employeeID.sexType', 'dateFrom', 'orgName', 'psCatName', 'positionID', 'dictPositionID', 'positionID.mi_treePath']
  if (useActualPositionName) {
    requestAttrs.push('dictPositionID.nameOr')
    if (useSexType) {
      requestAttrs.push('dictPositionID.nameOrF')
    }
    requestAttrs.push('dictPositionID.name')
    requestAttrs.push('dictEmpCategoryID.genName')
    requestAttrs.push('dictEmpCategoryID.name')
    requestAttrs.push('posNameAddition')
  }

  const position = UB.Repository('hr_employeePositionS')
    .attrs(requestAttrs)
    .where('employeeID', '=', params.employeeID)
    .whereIf(params.tabNumID, 'employeeNumberID', '=', params.tabNumID)
    .whereIf(params.orgID, 'positionID.orgID', '=', params.orgID)
    .where('dateFrom', '<=', params.onDate)
    .orderBy('dateFrom', 'desc')
    .limit(1)
    .selectSingle()

  data['pos'] = []
  if (position) {
    let strPosition = position.positionID ? getPositionInfo(useSexType && position['employeeID.sexType'] === 'W' ? ['fullNameOrF', 'fullNameOr', 'fullName', 'name'] : ['fullNameOr', 'fullName', 'name'], position.positionID, params.orgID, params.onDate, 'mi_data_id') : ''

    const department = position['positionID.mi_treePath'] ? UB.Repository('hr_department')
      .attrs(['name', 'nameGen'])
      .where('mi_data_id', 'in', _.compact(position['positionID.mi_treePath'].split('/')).map(o => Number(o)))
      .where('state', '=', 'ACTIVE')
      .where('orgID', '=', params.orgID || 0)
      .misc({
        __mip_ondate: params.onDate
      })
      .orderBy('mi_treePath', 'desc')
      .selectAsObject() : []

    let depName = ''
    department.forEach(dep => {
      const name = dep['nameGen'] || dep['name'] || ''
      depName += (depName ? ' ' : '') + name
    })
    depName = nameCaseService.removeDuplicateWords(depName)

    if (useActualPositionName && position.dictPositionID) {
      const dictName = useSexType && position['employeeID.sexType'] === 'W'
        ? position['dictPositionID.nameOrF'] || position['dictPositionID.nameOr'] || position['dictPositionID.name']
        : position['dictPositionID.nameOr'] || position['dictPositionID.name']
      const pos = nameCaseService.removeDuplicateWords([dictName, position.posNameAddition, position['dictEmpCategoryID.genName'] || position['dictEmpCategoryID.name'], depName].filter(Boolean).join(' ') || '')
      strPosition = pos || strPosition
    }

    data['psCategory'] = position.positionID ? getPositionInfo(['psCategory.shortName'], position.positionID, params.orgID, params.onDate, 'mi_data_id') : ''

    const arrPosition = getSliceStrArr(`${strPosition}${orgName ? ' у ' + orgName : ''}`, [65, 70, 70, 70])
    data['position1'] = arrPosition[0] || ''
    // data['position2'] = arrPosition[1] || ''

    for (let i = 1; i < arrPosition.length; i++) {
      if (arrPosition[i] && arrPosition[i].length) {
        data['pos'].push({
          posName: arrPosition[i]
        })
      }
    }
  } else {
    data['position1'] = ''
    // data['position2'] = ''
    data['psCategory'] = ''
  }

  // Workbook
  requestAttrs = ['workPosition', 'workPlace', 'dateFrom', 'dateTo']
  const works = UB.Repository('hr_employeeWorkbook')
    .attrs(requestAttrs)
    .where('employeeID', '=', params.employeeID)
    .where('mi_deleteDate', '>=', '#maxdate')
    .orderBy('dateFrom', 'asc')
    .selectAsObject()

  data.workbook = []
  if (works) {
    works.forEach((work, index) => {
      const obj = {
        workPeriod: '',
        posWork: ''
      }
      obj.posWork = [work['workPosition'], work['workPlace']].filter(Boolean).join(', ')

      const posDateFrom = new Date(work['dateFrom'])
      let posM = posDateFrom.getMonth() + 1
      posM = posM < 10 ? '0' + posM : posM
      obj.workPeriod = `${posM}.${posDateFrom.getFullYear()} - `

      if (work['dateTo']) {
        if (index === works.length - 1) {
          if (!dateService.isMaxDate(work['dateTo'])) {
            const posDateTo = (new Date(work['dateTo']))
            let posMT = posDateTo.getMonth() + 1
            posMT = posMT < 10 ? '0' + posMT : posMT
            obj.workPeriod += `${posMT}.${posDateTo.getFullYear()}`
          } else {
            obj.workPeriod += 'до цього часу'
          }
        } else {
          if (!dateService.isMaxDate(work['dateTo'])) {
            const posDateTo = (new Date(work['dateTo']))
            let posMT = posDateTo.getMonth() + 1
            posMT = posMT < 10 ? '0' + posMT : posMT
            obj.workPeriod += `${posMT}.${posDateTo.getFullYear()}`
          }
        }
      }
      data.workbook.push(obj)
    })
  } else {
    const obj = {
      workPeriod: '___________________',
      posWork: '__________________________________________'
    }
    data.workbook.push(obj)
  }

  // Education
  requestAttrs = ['dictEducationLevelID.name', 'educationName', 'dateTo',
    'dictSpecialtyID.name', 'qualification', 'dictDegreeID.name']
  const education = UB.Repository('hr_employeeEducation')
    .attrs(requestAttrs)
    .where('employeeID', '=', params.employeeID)
    .orderBy('dictEducationLevelID.level', 'asc')
    .selectAsObject()

  data['rangeScience'] = ''
  if (education) {
    let strEducation = ''
    education.forEach((ed, index) => {
      const separator = education.length - 1 !== index ? '; ' : ''
      if (ed['dateTo']) ed['dateTo'] = dateService.formatDate(ed['dateTo'])
      strEducation += [ed['dictEducationLevelID.name'], ed['educationName'],
        ed['dateTo'], ed['dictSpecialtyID.name'], ed['qualification']].filter(Boolean).join(', ') + separator

      const rangeScienceSepar = data['rangeScience'].length > 0 ? '; ' : ''
      data['rangeScience'] += ed['dictDegreeID.name'] ? rangeScienceSepar + ed['dictDegreeID.name'] : ''
    })
    data['education'] = strEducation || 'немає'
  } else {
    data['education'] = 'немає'
  }

  const arrEducation = getSliceStrArr(data['education'], [65, 70, 70, 70, 70, 70, 70, 70, 70, 70])
  data['education1'] = arrEducation[0] || ''

  data['edu'] = []
  for (let i = 1; i < arrEducation.length; i++) {
    if (arrEducation[i] && arrEducation[i].length) {
      data['edu'].push({
        education: arrEducation[i]
      })
    }
  }

  // RangeScience,
  requestAttrs = ['dictDegreeID.name', 'dictBranchScienceID.name', 'dictSpecialtyID.name']
  const rangeScience = UB.Repository('hr_empRangeScience')
    .attrs(requestAttrs)
    .where('employeeID', '=', params.employeeID)
    .where('mi_deleteDate', '>=', '#maxdate')
    .where('dictDegreeID.mi_deleteDate', '>=', '#maxdate')
    .where('dictBranchScienceID.mi_deleteDate', '>=', '#maxdate')
    .joinCondition('dictSpecialtyID.mi_deleteDate', '>=', '#maxdate')
    .selectAsObject()
  if (rangeScience) {
    rangeScience.forEach(item => {
      const separator = data['rangeScience'].length > 0 ? '; ' : ''
      const str = [item['dictDegreeID.name'], item['dictBranchScienceID.name'],
        item['dictSpecialtyID.name']].filter(Boolean).join(', ')
      data['rangeScience'] += str.length > 0 ? (separator + str) : ''
    })
  }

  // AcademStatus
  requestAttrs = ['dictAcademStatusID.name']
  let academStatus = ''
  const academStatusData = UB.Repository('hr_empAcademStatus')
    .attrs(requestAttrs)
    .where('employeeID', '=', params.employeeID)
    .where('mi_deleteDate', '>=', '#maxdate')
    .where('dictAcademStatusID.mi_deleteDate', '>=', '#maxdate')
    .selectAsObject()
  if (academStatusData) {
    academStatusData.forEach(item => {
      const separator = academStatus.length > 0 ? '; ' : ''
      const str = item['dictAcademStatusID.name'] || ''
      academStatus += str.length > 0 ? (separator + str) : ''
    })
  }

  if (!academStatus.length && !data['rangeScience'].length) {
    data['rangeScience'] = 'немає'
  } else {
    data['rangeScience'] = (data['rangeScience'] || 'науковий ступінь - немає') + '; ' + (academStatus || 'вчені звання - немає')
  }

  // languages
  requestAttrs = ['employeeID', 'dictLanguageID.name', 'dictLanguageLevelID.level']
  const languages = UB.Repository('hr_employeeLanguage')
    .attrs(requestAttrs)
    .where('employeeID', '=', params.employeeID)
    .selectAsObject()
  if (languages) {
    let langStr = ''
    languages.forEach((item, index) => {
      const separator = languages.length - 1 !== index ? ', ' : ''
      langStr += [uncap(item['dictLanguageID.name']), item['dictLanguageLevelID.level']].filter(Boolean).join(' - ') + separator
    })
    data['languages'] = langStr
  } else {
    data['languages'] = ''
  }

  // rank
  requestAttrs = ['dictRankID.name', 'dateFrom']
  const lastRankID = UB.Repository('hr_publServRang')
    .attrs(['dictRankID'])
    .where('employeeID', '=', params.employeeID)
    .where('dictRankID.mi_deleteDate', '>=', '#maxdate')
    .where('mi_deleteDate', '>=', '#maxdate')
    .where('dateFrom', '<=', params.onDate)
    .where('dateTo', '>=', params.onDate)
    .limit(1)
    .orderBy('dictRankID.code')
    .selectScalar()
  const rank = lastRankID ? UB.Repository('hr_publServRang')
    .attrs(requestAttrs)
    .where('employeeID', '=', params.employeeID)
    .where('dictRankID.mi_deleteDate', '>=', '#maxdate')
    .where('mi_deleteDate', '>=', '#maxdate')
    .where('dictRankID', '=', lastRankID)
    .limit(1)
    .orderBy('dateFrom')
    .selectSingle() : undefined
  setData(data, rank, requestAttrs, ['dateFrom'])

  // general experience
  requestAttrs = ['employeeID', 'calcDate']
  let experienceRes = UB.Repository('hr_employeeExperience')
    .attrs(requestAttrs)
    .where('employeeID', '=', params.employeeID)
    // .where('dictExperienceID.code', '=', '1')
    .where('dictExperienceID.methodExpID.code', '=', 1)
    .where('dictExperienceID.mi_deleteDate', '>=', '#maxdate')
    .where('dictExperienceID.methodExpID.mi_deleteDate', '>=', '#maxdate')
    .where('employeeNumberID', 'isNull', undefined, 'empNumNull')
    .orderByDesc('employeeNumberID')

  if (params.tabNumID) {
    experienceRes.where('employeeNumberID', '=', params.tabNumID, 'empNum')
      .logic('([empNum] OR [empNumNull])')
  }
  experienceRes = experienceRes.limit(1).selectSingle()

  let strExpGeneral = ''
  if (experienceRes && experienceRes['calcDate']) {
    const ymd = dateService.getYmd(experienceRes.calcDate, params.onDate, true)
    strExpGeneral = `${ymd.years} ${dateService.plural('рік_роки_років', ymd.years)} ` +
      `${ymd.months} ${dateService.plural('місяць_місяці_місяців', ymd.months)} ` +
      `${ymd.days} ${dateService.plural('день_дні_днів', ymd.days)}`
  }
  data['experienceGeneral'] = strExpGeneral

  // derg experience
  requestAttrs = ['employeeID', 'calcDate']
  experienceRes = UB.Repository('hr_employeeExperience')
    .attrs(requestAttrs)
    .where('employeeID', '=', params.employeeID)
    // .where('dictExperienceID.code', '=', '6')
    .where('dictExperienceID.methodExpID.code', '=', 6)
    .where('dictExperienceID.mi_deleteDate', '>=', '#maxdate')
    .where('dictExperienceID.methodExpID.mi_deleteDate', '>=', '#maxdate')
    .where('employeeNumberID', 'isNull', undefined, 'empNumNull')
    .orderByDesc('employeeNumberID')

  if (params.tabNumID) {
    experienceRes.where('employeeNumberID', '=', params.tabNumID, 'empNum')
      .logic('([empNum] OR [empNumNull])')
  }
  experienceRes = experienceRes.limit(1).selectSingle()

  let strExpServant = ''
  if (experienceRes && experienceRes['calcDate']) {
    const ymd = dateService.getYmd(experienceRes.calcDate, params.onDate, true)
    strExpServant = `${ymd.years} ${dateService.plural('рік_роки_років', ymd.years)} ` +
      `${ymd.months} ${dateService.plural('місяць_місяці_місяців', ymd.months)} ` +
      `${ymd.days} ${dateService.plural('день_дні_днів', ymd.days)}`
  }
  data['experienceServant'] = strExpServant

  // onDate
  data['onDate'] = dateService.formatDate(params.onDate)

  // respEmployeePositionID
  if (params.respEmployeePositionID) {
    requestAttrs = ['employeeID.shortFIO', 'employeeID.firstName', 'employeeID.lastName', 'positionID.fullNameNom', 'positionID.fullName', 'positionID.name', 'employeeID',
      'positionID', 'dictPositionID', 'employeeID.sexType']
    if (useSexType) {
      requestAttrs.push('positionID.fullNameNomF')
    }

    if (useActualPositionName) {
      requestAttrs.push('positionID.mi_treePath')
      requestAttrs.push('dictPositionID.nameNom')
      if (useSexType) {
        requestAttrs.push('dictPositionID.nameNomF')
      }
      requestAttrs.push('dictPositionID.name')
      requestAttrs.push('dictEmpCategoryID.genName')
      requestAttrs.push('dictEmpCategoryID.name')
      requestAttrs.push('posNameAddition')
    }

    let respEmployee
    respEmployee = UB.Repository('hr_employeePositionS')
      .attrs(requestAttrs)
      .where('ID', '=', params.respEmployeePositionID)
      .where('positionID.mi_dateFrom', '<=', params.onDate)
      .where('positionID.mi_dateTo', '>=', params.onDate)
      .where('positionID.mi_deleteDate', '>=', '#maxdate')
      .where('positionID.state', '=', 'ACTIVE')
      .limit(1)
      .selectSingle()
    data.respEmployeeName = (respEmployee['employeeID.firstName'] || '') + (respEmployee['employeeID.firstName'] && respEmployee['employeeID.lastName'] ? ' ' : '') + (respEmployee['employeeID.lastName'] || '').toUpperCase()
    if (!data.respEmployeeName) {
      data.respEmployeeName = respEmployee['employeeID.shortFIO'] || ''
    }
    data.respEmployeePos = respEmployee['positionID.fullName'] || respEmployee['positionID.name'] || ''

    if (params.respPositionID && respEmployee.positionID && params.respPositionID !== respEmployee.positionID) {
      const responsAbbr = UB.Repository('ac_settingsOrg')
        .attrs(['value'])
        .where('organizationID', '=', params.orgID || 0)
        .where('[constantID.code]', '=', 'hrResponsAbbr')
        .selectScalar() || 'В.о.'

      const respPositionFull = params.respPositionID ? getPositionInfo(useSexType && respEmployee['employeeID.sexType'] === 'W' ? ['fullNameGenF', 'fullNameGen', 'fullName', 'name'] : ['fullNameGen', 'fullName', 'name'], params.respPositionID, params.orgID, params.onDate, 'mi_data_id') : ''
      if (respPositionFull) {
        data.respEmployeePos = responsAbbr + ' ' + respPositionFull
      }
    } else {
      data.respEmployeePos = useSexType && respEmployee['employeeID.sexType'] === 'W'
        ? respEmployee['positionID.fullNameNomF'] || respEmployee['positionID.fullNameNom'] || respEmployee['positionID.name'] || ''
        : respEmployee['positionID.fullNameNom'] || respEmployee['positionID.fullName'] || respEmployee['positionID.name'] || ''
      if (useActualPositionName && respEmployee.dictPositionID) {
        const dictName = useSexType && respEmployee['employeeID.sexType'] === 'W'
          ? respEmployee['dictPositionID.nameNomF'] || respEmployee['dictPositionID.nameNom'] || respEmployee['dictPositionID.name']
          : respEmployee['dictPositionID.nameNom'] || respEmployee['dictPositionID.name']

        const department = respEmployee['positionID.mi_treePath'] ? UB.Repository('hr_department')
          .attrs(['name', 'nameGen'])
          .where('mi_data_id', 'in', _.compact(respEmployee['positionID.mi_treePath'].split('/')).map(o => Number(o)))
          .where('state', '=', 'ACTIVE')
          .where('orgID', '=', params.orgID || 0)
          .misc({
            __mip_ondate: params.onDate
          })
          .orderBy('mi_treePath', 'desc')
          .selectAsObject() : []

        let depName = ''
        department.forEach(dep => {
          const name = dep['nameGen'] || dep['name'] || ''
          depName += (depName ? ' ' : '') + name
        })
        depName = nameCaseService.removeDuplicateWords(depName)

        const pos = nameCaseService.removeDuplicateWords([dictName, respEmployee.posNameAddition, respEmployee['dictEmpCategoryID.genName'] || respEmployee['dictEmpCategoryID.name'], depName].filter(Boolean).join(' ') || '')
        data.respEmployeePos = pos || data.respEmployeePos
      }
      data.respEmployeePos = cap(data.respEmployeePos)
    }
  } else {
    data.respEmployeeName = ''
    data.respEmployeePos = ''
  }

  // bonuses
  requestAttrs = ['dictBonusID.name']
  const bonuses = UB.Repository('hr_employeeBonus')
    .attrs(requestAttrs)
    .where('employeeID', '=', params.employeeID)
    .where('mi_deleteDate', '>=', '#maxdate')
    .selectAsObject()
  if (bonuses) {
    let strBonuses = ''
    bonuses.forEach((item, index) => {
      const separator = (index + 1 === bonuses.length || bonuses.length <= 1) || !item['dictBonusID.name'] ? '' : ', '
      strBonuses += item['dictBonusID.name'] ? item['dictBonusID.name'] : ''
      strBonuses += separator
    })
    data['bonuses'] = strBonuses || 'немає'
  } else {
    data['bonuses'] = 'немає'
  }

  // Penalty,
  requestAttrs = ['dictPenaltyID.name', 'dictPenaltyReasonID.name', 'docIssued']
  const penalty = UB.Repository('hr_employeePenalty')
    .attrs(requestAttrs)
    .where('employeeID', '=', params.employeeID)
    .where('mi_deleteDate', '>=', '#maxdate')
    .where('dictPenaltyID.mi_deleteDate', '>=', '#maxdate')
    .where('dictPenaltyReasonID.mi_deleteDate', '>=', '#maxdate')
    .selectAsObject()
  let strPenalty = ''
  if (penalty) {
    penalty.forEach((item, index) => {
      const separator = penalty.length - 1 !== index ? '; ' : ''
      strPenalty += [item['dictPenaltyID.name'], item['dictPenaltyReasonID.name'], item['docIssued']].filter(Boolean).join(', ') + separator
    })

    data['penalty'] = strPenalty
  } else {
    data['penalty'] = ''
  }

  const result = docxService.generateDocxDocument({
    templatePath: path.join(templatePath, 'biografDovidka.docx'),
    fileName: sFileName,
    data,
    entityName: 'hr_employee',
    ID: params.instanceID
  })

  const docs = [
    {
      fileContent: JSON.stringify(result.stringContent),
      fileName: sFileName
    }
  ]

  return JSON.stringify(docs)
}

function povidomZminaOblikData (params, templatePath) {
  const data = {}
  let sFileName = 'Повідомлення про зміну облікових даних'

  // let organizationID = params.orgID
  // let curTabNumID = params.tabNumID
  // let curDate = params.onDate

  let requestAttrs = ['fullFIO', 'shortFIO', 'birthDate']
  let ignoreAttrs = ['shortFIO']
  const employee = UB.Repository('hr_employee')
    .attrs(requestAttrs)
    .selectById(params.employeeID)
  setData(data, employee, requestAttrs, ['birthDate'], ignoreAttrs)

  if (employee && employee.shortFIO) {
    sFileName = UB.i18n(`Повідомлення {0}`, employee.shortFIO)
  }

  // military   1, 3, 11
  requestAttrs = ['office', 'dictMilitarySpecialityID.name', 'dictMilitaryRankID.name', 'docSeries', 'docNumber', 'dateIssue']
  ignoreAttrs = ['shortFIO']
  let military = null
  military = UB.Repository('hr_empStateMilitary')
    .attrs(requestAttrs)
    .where('employeeID', '=', params.employeeID)
    .where('mi_deleteDate', '>=', '#maxdate')
    .orderBy('mi_createDate', 'desc')
    .limit(1)
    .selectSingle()
  setData(data, military, requestAttrs, [], ignoreAttrs)

  if (military && military['dateIssue']) {
    const issueDate = new Date(military['dateIssue'])

    data['day'] = issueDate.getDate()
    data['month'] = getMonthName(issueDate.getMonth() + 1)
    data['year'] = (issueDate.getFullYear().toString()).slice(2, 4)
  } else {
    data['day'] = ''
    data['month'] = ''
    data['year'] = ''
  }

  if (military && military['office']) {
    const arrOffice = getSliceStrArr(military['office'], [36])
    data['office1'] = arrOffice[0] || ''
    data['office2'] = arrOffice[1] || ''
  } else {
    data['office1'] = ''
    data['office2'] = ''
  }

  // fact address 12
  requestAttrs = ['ownerID', 'address', 'addressType']
  const factAddress = UB.Repository('ac_address')
    .attrs(requestAttrs)
    .where('ownerID', '=', params.employeeID)
    .where('addressType', '=', '1')
    .limit(1)
    .selectSingle()
  if (factAddress && factAddress['address']) {
    const arrFactAddress = getSliceStrArr(factAddress['address'], [41])
    data['factAddress1'] = arrFactAddress[0] || ''
    data['factAddress2'] = arrFactAddress[1] || ''
  } else {
    data['factAddress1'] = ''
    data['factAddress2'] = ''
  }

  requestAttrs = ['employeeID.shortFIO', 'positionID.name']
  let respEmployee = null
  respEmployee = UB.Repository('hr_employeePositionS')
    .attrs(requestAttrs)
    .where('ID', '=', params.respEmployeePositionID)
    .where('positionID.mi_dateFrom', '<=', params.onDate)
    .where('positionID.mi_dateTo', '>=', params.onDate)
    .where('positionID.mi_deleteDate', '>=', '#maxdate')
    .where('positionID.state', '=', 'ACTIVE')
    .limit(1)
    .selectSingle()
  setData(data, respEmployee, requestAttrs)

  const result = docxService.generateDocxDocument({
    templatePath: path.join(templatePath, 'povidomZminaOblikData.docx'),
    fileName: sFileName,
    data,
    entityName: 'hr_employee',
    ID: params.instanceID
  })

  const docs = [
    {
      fileContent: JSON.stringify(result.stringContent),
      fileName: sFileName
    }
  ]

  return JSON.stringify(docs)
}

function empOath (params, templatePath) {
  const data = {}
  let sFileName = 'Присяга'

  const requestAttrs = ['fullFIO', 'shortFIO']
  const ignoreAttrs = ['shortFIO']
  const employee = UB.Repository('hr_employee')
    .attrs(requestAttrs)
    .selectById(params.instanceID)
  setData(data, employee, requestAttrs, ignoreAttrs)

  if (employee && employee.shortFIO) {
    sFileName = UB.i18n(`Присяга {0}`, employee.shortFIO)
  }

  const result = docxService.generateDocxDocument({
    templatePath: path.join(templatePath, 'empOrderOath.docx'),
    fileName: sFileName,
    data,
    entityName: 'hr_employee',
    ID: params.instanceID
  })

  const docs = [
    {
      fileContent: JSON.stringify(result.stringContent),
      fileName: sFileName
    }
  ]

  return JSON.stringify(docs)
}

function empCivilMemo (params, templatePath) {
  const data = {}
  const sFileName = UB.i18n(`Пам'ятка державним службовцям`)

  const result = docxService.generateDocxDocument({
    templatePath: path.join(templatePath, 'empOrderCivilMemo.docx'),
    fileName: sFileName,
    data,
    entityName: 'hr_employee',
    ID: params.instanceID
  })

  const docs = [
    {
      fileContent: JSON.stringify(result.stringContent),
      fileName: sFileName
    }
  ]

  return JSON.stringify(docs)
}

function empCommitment (params, templatePath) {
  const data = {}
  let sFileName = 'Зобов\'язання'
  const employee = UB.Repository('hr_employee')
    .attrs(['fullFIO', 'shortFIO'])
    .selectById(params.instanceID)
  if (employee && employee.shortFIO) {
    sFileName = UB.i18n(`Зобов'язання {0}`, employee.shortFIO)
  }
  data.empFullFIO = employee['fullFIO'] || ''

  let order
  for (let k = 0; k < 2; k++) {
    order = UB.Repository('hr_employeePositionS')
      .attrs(['orderID.respEmployeePositionID.positionID.fullNameDat', 'orderID.respEmployeePositionID.employeeID.datName',
        'orderID.respEmployeePositionID.positionID.fullName', 'orderID.respEmployeePositionID.employeeID.fullFIO'])
      .where('employeeNumberID', '=', params.tabNumID)
      .where('organizationID', '=', params.orgID)
      .where('mi_deleteDate', '>=', '#maxdate')
      .where('orderID.mi_deleteDate', '>=', '#maxdate')
      .where('dateFrom', '<=', params.onDate)
      .where('dateTo', '>=', params.onDate)
      .whereIf(k === 0, 'orderID.respEmployeePositionID.positionID.mi_dateFrom', '<=', params.onDate)
      .whereIf(k === 0, 'orderID.respEmployeePositionID.positionID.mi_dateTo', '>=', params.onDate)
      .where('orderID.respEmployeePositionID.positionID.mi_deleteDate', '>=', '#maxdate')
      .where('orderID.respEmployeePositionID.positionID.state', '=', 'ACTIVE')
      .orderBy('dateFrom', 'desc')
      .orderBy('orderID.respEmployeePositionID.positionID.mi_dateFrom', 'desc')
      .orderBy('orderID.respEmployeePositionID.positionID.mi_dateTo', 'desc')
      .selectAsObject()
    if (order && order.length) {
      k = 2
    }
  }

  if (order.length) {
    data.respPosition = order[0]['orderID.respEmployeePositionID.positionID.fullNameDat'] || order[0]['orderID.respEmployeePositionID.positionID.fullName'] || ''
    data.respEmployee = order[0]['orderID.respEmployeePositionID.employeeID.datName'] || order[0]['orderID.respEmployeePositionID.employeeID.fullFIO'] || ''
  } else {
    data.respPosition = ''
    data.respEmployee = ''
  }

  for (let k = 0; k < 2; k++) {
    order = UB.Repository('hr_employeePositionS')
      .attrs(['positionID.fullName', 'positionID.fullNameNom'])
      .where('employeeNumberID', '=', params.tabNumID)
      .where('organizationID', '=', params.orgID)
      .where('employeeID.mi_deleteDate', '>=', '#maxdate')
      .where('positionID.state', '=', 'ACTIVE')
      .where('positionID.mi_deleteDate', '>=', '#maxdate')
      .whereIf(k === 0, 'positionID.mi_dateFrom', '<=', params.onDate)
      .whereIf(k === 0, 'positionID.mi_dateTo', '>=', params.onDate)
      .orderBy('positionID.mi_dateFrom', 'desc')
      .orderBy('positionID.mi_dateTo', 'desc')
      .selectAsObject()
    if (order && order.length) {
      k = 2
    }
  }

  if (order.length) {
    data.empPositionFullName = order[0]['positionID.fullNameNom'] || order[0]['positionID.fullName']
  } else {
    data.empPositionFullName = ''
  }

  const result = docxService.generateDocxDocument({
    templatePath: path.join(templatePath, 'empOrderCommitment.docx'),
    fileName: sFileName,
    data,
    entityName: 'hr_employee',
    ID: params.instanceID
  })

  const docs = [
    {
      fileContent: JSON.stringify(result.stringContent),
      fileName: sFileName
    }
  ]

  return JSON.stringify(docs)
}

function empOrderCivilMemo (params, templatePath) {
  const data = {}
  const sFileName = UB.i18n(`Пам'ятка державним службовцям`)

  const result = docxService.generateDocxDocument({
    templatePath: path.join(templatePath, 'empOrderCivilMemo.docx'),
    fileName: sFileName,
    data,
    entityName: 'hr_empOrder',
    ID: params.instanceID
  })

  const docs = [
    {
      fileContent: JSON.stringify(result.stringContent),
      fileName: sFileName
    }
  ]

  return JSON.stringify(docs)
}

function dergSlugOsobovaKartka (params, templatePath) {
  const data = {}
  let sFileName = 'Unknown'

  const organizationID = params.orgID
  const curTabNumID = params.tabNumID
  // let curDate = params.onDate

  const org = UB.Repository('hr_organization')
    .attrs(['name', 'EDRPOUCode'])
    .where('mi_data_id', '=', params.orgID)
    .where('state', '=', 'ACTIVE')
    .misc({ __mip_ondate: params.onDate })
    .orderBy('mi_dateFrom', 'desc')
    .limit(1)
    .selectSingle()
  data.orgName = org.name
  data.orgEDRPOUCode = org.EDRPOUCode || ''

  let requestAttrs = ['ID', 'employeeID', 'dateFrom', 'dateTo', 'orderID', 'orderID.description', 'employeeNumberID.tabNum']
  const position = UB.Repository('hr_employeePositionS')
    .attrs(requestAttrs)
    .where('employeeID', '=', params.instanceID)
    .where('employeeNumberID', '=', curTabNumID)
    .where('organizationID', '=', organizationID)
    .where('orderID.empOrderType', 'in', ['APPOINT', 'MOVE', 'APPOINT_LIQ', 'CANCELDISM'])
    .where('orderID.mi_deleteDate', '>=', '#maxdate')
    .where('employeeNumberID.mi_deleteDate', '>=', '#maxdate')
    .orderBy('dateFrom', 'desc')
    .limit(1)
    .selectSingle()
  setData(data, position, ['employeeNumberID.tabNum', 'orderID.description'])

  const dateStart = position && position['dateFrom'] ? position['dateFrom'] : null

  // employee general 5, 6, 8, 9, 10, 12, 15, 22, 35, 46, 47, 48, pt 18
  requestAttrs = ['firstName', 'lastName', 'middleName', 'photo', 'shortFIO', 'sexType',
    'taxCode', 'dayBirthDate', 'monthBirthDate', 'yearBirthDate',
    'citizenshipID.name', 'dictMaritalStatusKindID.name', 'phoneMobile', 'scientificWorks', 'isCitizen', 'deputy', 'isInitiated', 'birthPlace',
    'oathDate', 'oathOrgName']
  let ignoreAttrs = ['shortFIO', 'sexType', 'scientificWorks', 'isCitizen', 'isInitiated', 'deputy', 'oathDate', 'oathOrgName']
  const employee = UB.Repository('hr_employee')
    .attrs(requestAttrs)
    .selectById(params.instanceID)
  setData(data, employee, requestAttrs, ignoreAttrs)
  if (employee && employee['birthPlace']) {
    const arrBirthPlace = getSliceStrArr(employee['birthPlace'], [20])
    data['birthPlace1'] = arrBirthPlace[0] || ''
    data['birthPlace2'] = arrBirthPlace[1] || ''
  } else {
    data['birthPlace1'] = ''
    data['birthPlace2'] = ''
  }

  if (employee && employee['scientificWorks']) {
    const arrScientificWorks = getSliceStrArr(employee['scientificWorks'], [62])
    data['scientificWorks1'] = arrScientificWorks[0] || ''
    data['scientificWorks2'] = arrScientificWorks[1] || ''
  } else {
    data['scientificWorks1'] = ''
    data['scientificWorks2'] = ''
  }

  if (employee) {
    data['isCitizen'] = employee['isCitizen'] ? 'Так' : 'Нi'
  } else {
    data['isCitizen'] = ''
  }

  if (employee) {
    let str = ''
    if (employee['sexType'] && employee['sexType'] === 'M') {
      str = 'ознайомлений та зобов’язуюсь їх дотримуватись'
    } else if (employee['sexType'] && employee['sexType'] === 'W') {
      str = 'ознайомлена та зобов’язуюсь їх дотримуватись'
    } else {
      str = 'ознайомлений(а) та зобов’язуюсь їх дотримуватись'
    }
    data['isInitiated'] = employee['isInitiated'] ? str : ''
  } else {
    data['isInitiated'] = ''
  }

  if (employee && employee['deputy']) {
    data['deputy1'] = employee['deputy'].slice(0, 75)
    data['deputy2'] = employee['deputy'].slice(75)
  } else {
    data['deputy1'] = ''
    data['deputy2'] = ''
  }

  if (employee) {
    sFileName = employee.shortFIO
    if (employee.photo) {
      data.image = ''
      data.photo = ''
    } else {
      data.photo = 'мiсце для фотокартки'
    }
  }

  // pt 18
  if (employee) {
    employee.oathDate = employee.oathDate ? dateService.formatDate(employee.oathDate) : null
    data['oathGeneral'] = [employee.oathDate, employee.oathOrgName].filter(Boolean).join(' ')
  } else {
    data['oathGeneral'] = ''
  }

  // familyMembers 16
  requestAttrs = ['employeeID', 'peopleID.fullFIO', 'dictKinshipKindID.name']
  const familyMembers = UB.Repository('hr_employeeFamily')
    .attrs(requestAttrs)
    .where('employeeID', '=', params.instanceID)
    .selectAsObject()
  let famStr = ''
  if (familyMembers) {
    if (data['dictMaritalStatusKindID.name'].length > 0) { data['dictMaritalStatusKindID.name'] = data['dictMaritalStatusKindID.name'] + ', ' }

    familyMembers.forEach((item, index) => {
      const separator = index + 1 === familyMembers.length || familyMembers.length <= 1 ? '' : ', '
      famStr += `${item['dictKinshipKindID.name']} ${item['peopleID.fullFIO']}` + separator
    })
    const arrFamilyMembers = getSliceStrArr(famStr, [40, 40, 40])
    data['family1'] = arrFamilyMembers[0] || ''
    data['family2'] = arrFamilyMembers[1] || ''
    data['family3'] = arrFamilyMembers[2] || ''
    data['family4'] = arrFamilyMembers[3] || ''
  } else {
    data['family1'] = ''
    data['family2'] = ''
    data['family3'] = ''
    data['family4'] = ''
  }

  // fact address 13
  requestAttrs = ['ownerID', 'address', 'addressType']
  const factAddress = UB.Repository('ac_address')
    .attrs(requestAttrs)
    .where('ownerID', '=', params.instanceID)
    .where('addressType', '=', '1')
    .limit(1)
    .selectSingle()
  if (factAddress && factAddress['address']) {
    const arrAddressFact = getSliceStrArr(factAddress['address'], [7])
    data['addressFact1'] = arrAddressFact[0] || ''
    data['addressFact2'] = arrAddressFact[1] || ''
  } else {
    data['addressFact1'] = ''
    data['addressFact2'] = ''
  }

  // legal address 14
  requestAttrs = ['ownerID', 'address', 'addressType']
  const legalAddress = UB.Repository('ac_address')
    .attrs(requestAttrs)
    .where('ownerID', '=', params.instanceID)
    .where('addressType', '=', '2')
    .limit(1)
    .selectSingle()
  if (legalAddress && legalAddress['address']) {
    const arrAddressLegal = getSliceStrArr(legalAddress['address'], [18, 38])
    data['addressLegal1'] = arrAddressLegal[0] || ''
    data['addressLegal2'] = arrAddressLegal[1] || ''
    data['addressLegal3'] = arrAddressLegal[2] || ''
  } else {
    data['addressLegal1'] = ''
    data['addressLegal2'] = ''
    data['addressLegal3'] = ''
  }

  // passport 17, 18, 19
  requestAttrs = ['ID', 'employeeID', 'dictDocKindID.name', 'docSeries', 'docNumber', 'docIssued', 'docIssuedDate', 'state']
  ignoreAttrs = ['ID', 'employeeID', 'state']
  const passport = UB.Repository('hr_employeeDocs')
    .attrs(requestAttrs)
    .where('employeeID', '=', params.instanceID)
    .where('dictDocKindID.docType.name', 'in', ['Паспорт', 'паспорт', 'ПАСПОРТ'])
    .where('state', '=', '1')
    .limit(1)
    .selectSingle()
  if (passport) {
    if (passport['docIssued']) {
      const arrDocIssued = getSliceStrArr(passport['docIssued'], [27, 40])
      passport['docIssued1'] = arrDocIssued[0] || ''
      passport['docIssued2'] = arrDocIssued[1] || ''
      passport['docIssued3'] = arrDocIssued[2] || ''
    }
    if (passport['docIssuedDate']) {
      passport['docIssuedDate'] = dateService.formatDate(passport['docIssuedDate'])
    }
  }
  requestAttrs = ['dictDocKindID.name', 'docSeries', 'docNumber', 'docIssued1', 'docIssued2', 'docIssued3', 'docIssuedDate']
  setData(data, passport, requestAttrs)

  // languages 21
  requestAttrs = ['employeeID', 'dictLanguageID.name', 'dictLanguageLevelID.level']
  const languages = UB.Repository('hr_employeeLanguage')
    .attrs(requestAttrs)
    .where('employeeID', '=', params.instanceID)
    .selectAsObject()
  if (languages) {
    let langStr = ''
    languages.forEach((item, index) => {
      if (item['dictLanguageID.name'] && item['dictLanguageLevelID.level']) {
        langStr += `${item['dictLanguageID.name']} ${item['dictLanguageLevelID.level']}`
      } else if (item['dictLanguageID.name'] && !item['dictLanguageLevelID.level']) {
        langStr += item['dictLanguageID.name']
      }

      const separator = index + 1 === languages.length || languages.length <= 1 ? '' : ', '
      langStr += separator
    })

    const arrLanguage = getSliceStrArr(langStr, [7])
    data['language1'] = arrLanguage[0] || ''
    data['language2'] = arrLanguage[1] || ''
  } else {
    data['language1'] = ''
    data['language2'] = ''
  }

  // education 24-30
  requestAttrs = ['ID', 'employeeID', 'educationName', 'dateFrom', 'dateTo', 'dictSpecialtyID.name', 'qualification',
    'docNumber', 'employeeDocID.docIssuedDate']
  const education = UB.Repository('hr_employeeEducation')
    .attrs(requestAttrs)
    .where('employeeID', '=', params.instanceID)
    .selectAsObject()

  if (education) {
    education.forEach(item => {
      item['docDate'] = item['employeeDocID.docIssuedDate']
    })
    changeDateToYear(education, 'dateFrom')
    changeDateToYear(education, 'dateTo')
  }
  setTableData(data, education, ['educationName', 'dateFrom', 'dateTo', 'dictSpecialtyID.name', 'qualification',
    'docNumber', 'docDate'], 'education', 3, ['docDate'])

  // scinceLevel 31-34
  requestAttrs = ['ID', 'employeeID', 'dictDegreeID.name', 'docDate', 'docNumber']
  const scinceLevel = UB.Repository('hr_empRangeScience')
    .attrs(requestAttrs)
    .where('employeeID', '=', params.instanceID)
    .selectAsObject()

  if (scinceLevel) {
    // changeDateToYear(education, 'dateFrom', 'Year')
    changeDateToYear(scinceLevel, 'docDate', 'Year')
  }
  const scinceLevelAttrs = ['ID', 'employeeID', 'dictDegreeID.name', 'docDateYear', 'docDate', 'docNumber']
  setTableData(data, scinceLevel, scinceLevelAttrs, 'scinceLevel', 3, ['docDate'])

  // military   (42), 43, 44, 45, 46, 47, 48, 49, 50
  requestAttrs = ['ID', 'employeeID', 'dictMilitaryRankID.name', 'dictCategMilitaryID.name', 'dictMilitarySpecialityID.name',
    'dictMilitarySuitableID.name', 'office', 'dictStateMilitaryID.code', 'groupAccounting.name', 'composition.name']
  let military = null

  military = UB.Repository('hr_empStateMilitary')
    .attrs(requestAttrs)
    .where('employeeID', '=', params.instanceID)
    .limit(1)
    .selectSingle()

  requestAttrs = ['groupAccounting.name', 'dictCategMilitaryID.name', 'composition.name', 'dictMilitaryRankID.name', 'office']
  setData(data, military, requestAttrs)

  if (military && military['dictMilitarySpecialityID.name']) {
    const arrMilitarySpeciality = getSliceStrArr(military['dictMilitarySpecialityID.name'], [10])
    data['dictMilitarySpeciality1'] = arrMilitarySpeciality[0] || ''
    data['dictMilitarySpeciality2'] = arrMilitarySpeciality[1] || ''
  } else {
    data['dictMilitarySpeciality1'] = ''
    data['dictMilitarySpeciality2'] = ''
  }

  if (military && military['dictMilitarySuitableID.name']) {
    const arrMilitarySuitable = getSliceStrArr(military['dictMilitarySuitableID.name'], [16])
    data['dictMilitarySuitable1'] = arrMilitarySuitable[0] || ''
    data['dictMilitarySuitable2'] = arrMilitarySuitable[1] || ''
  } else {
    data['dictMilitarySuitable1'] = ''
    data['dictMilitarySuitable2'] = ''
  }

  if (military && military['office']) {
    const arrMilitaryOffice = getSliceStrArr(military['office'], [40])
    data['office1'] = arrMilitaryOffice[0] || ''
    data['office2'] = arrMilitaryOffice[1] || ''
  } else {
    data['office1'] = ''
    data['office2'] = ''
  }

  if (military && military['dictStateMilitaryID.code']) {
    if (military['dictStateMilitaryID.code'] === '4') {
      data.specMilitary = 'Так'
    } else {
      data.specMilitary = 'Нi'
    }
  } else {
    data.specMilitary = ''
  }

  requestAttrs = ['ID', 'employeeID', 'dictBenefitsKindID.name', 'docDate', 'docNumber', 'issued', '']
  const benefits = UB.Repository('hr_employeeBenefits')
    .attrs(requestAttrs)
    .where('employeeID', '=', params.instanceID)
    .where('mi_deleteDate', '>=', '#maxdate')
    .where('dictBenefitsKindID.mi_deleteDate', '>=', '#maxdate')
    .selectAsObject()

  let benefitsDocs
  if (benefits && benefits.length > 0) {
    const bs = benefits.map(item => item.ID)
    benefitsDocs = UB.Repository('hr_employeeBenefitsDoc')
      .attrs(['employeeDocID.description', 'employeeBenefitID'])
      .where('employeeID', '=', params.instanceID)
      .where('employeeDocID.mi_deleteDate', '>=', '#maxdate')
      .where('employeeBenefitID', 'in', bs)
      .selectAsObject()
  }

  let benefitsStr = ''
  benefits.forEach((item, index) => {
    const bendocs = benefitsDocs ? benefitsDocs.filter(el => el['employeeBenefitID'] === item['ID']) : null

    const bdoc = bendocs ? bendocs.map(dc => dc['employeeDocID.description']).filter(Boolean).join(', ') : null
    const separator = index + 1 === benefits.length || benefits.length <= 1 ? '' : '; '
    benefitsStr += [item['dictBenefitsKindID.name'], item['docNumber'], dateService.formatDate(item['docDate']), item['issued'], bdoc].filter(Boolean).join(', ') + separator
  })

  if (benefitsStr.length > 0) {
    const arrBenefit = getSliceStrArr(benefitsStr, [80])
    data['benefit1'] = arrBenefit[0] || ''
    data['benefit2'] = arrBenefit[1] || ''
  } else {
    data['benefit1'] = ''
    data['benefit2'] = ''
  }

  // rank
  if (dateStart) {
    requestAttrs = ['ID', 'employeeID', 'dictRankID.name', 'dateFrom', 'dateTo']
    const rank = UB.Repository('hr_publServRang')
      .attrs(requestAttrs)
      .where('employeeID', '=', params.instanceID)
      .where('dictRankID.mi_deleteDate', '>=', '#maxdate')
      .where('mi_deleteDate', '>=', '#maxdate')
      .where('dateFrom', '<=', dateStart)
      .where('dateTo', '>=', dateStart)
      .limit(1)
      .selectSingle()

    requestAttrs = ['dictRankID.name']
    setData(data, rank, requestAttrs)
  } else {
    data['dictRankID.name'] = ''
  }

  // CertificatnUp 58-63
  requestAttrs = ['ID', 'employeeID', 'educationName', 'dateFrom', 'dateTo', 'trainingDirection', 'docNumber', 'docDate']
  const certificatnUp = UB.Repository('hr_empCertificatnUp')
    .attrs(requestAttrs)
    .where('employeeID', '=', params.instanceID)
    .where('mi_deleteDate', '>=', '#maxdate')
    .selectAsObject()
  setTableData(data, certificatnUp, requestAttrs, 'certificatnUp', 8, ['dateFrom', 'dateTo', 'docDate'])

  // Mission 64-67
  requestAttrs = ['ID', 'employeeID', 'countryID.name', 'dateFrom', 'dateTo', 'orderID.description']
  const missions = UB.Repository('hr_empOrderMissionDet')
    .attrs(requestAttrs)
    .where('employeeID', '=', params.instanceID)
    .where('isInsideCountry', '=', false)
    .where('employeeNumberID', '=', curTabNumID)
    .where('mi_deleteDate', '>=', '#maxdate')
    .selectAsObject()
  setTableData(data, missions, requestAttrs, 'mission', 4, ['dateFrom', 'dateTo'])

  requestAttrs = ['ID', 'employeeID', 'dateFrom', 'workPosition', 'rank', 'positionCategory', 'appointReason', 'appointOrder']
  const empPositions = UB.Repository('hr_employeeWorkbook')
    .attrs(requestAttrs)
    .where('employeeID', '=', params.instanceID)
    .where('positionType', '=', '1')
    .where('organizationID', '=', organizationID)
    .orderBy('dateFrom', 'asc')
    .selectAsObject()

  empPositions.forEach(item => {
    item['rank'] = [item['positionCategory'], item['rank']].filter(Boolean).join(', ')
  })

  requestAttrs = ['dateFrom', 'workPosition', 'rank', 'dictRankID.name', 'appointReason', 'appointOrder']
  setTableData(data, empPositions, requestAttrs, 'empPositions', 23, ['dateFrom'])

  // vacations 71-75
  requestAttrs = ['ID', 'employeeID', 'dateFrom', 'dateTo', 'orderID.orderDate',
    'orderID.orderNumberFullView', 'dictVacationKindID.name', 'empVacationPeriodID.description' ]
  const vacations = curTabNumID ? UB.Repository('hr_employeeVacation')
    .attrs(requestAttrs)
    .where('employeeID', '=', params.instanceID)
    .where('employeeNumberID', '=', curTabNumID)
    .where('mi_deleteDate', '>=', '#maxdate')
    .where('orderID.mi_deleteDate', '>=', '#maxdate')
    .where('dictVacationKindID.mi_deleteDate', '>=', '#maxdate')
    .where('orderID.orderState', 'in', ['POSTED', 'PROCESSED'])
    .selectAsObject({
      'dictVacationKindID.name': 'vacationKind',
      'empVacationPeriodID.description': 'empVacationPeriod',
      'orderID.orderNumberFullView': 'orderNumber',
      'orderID.orderDate': 'orderDate',
      'orderID.reason': 'vreason'
    }) : []

  if (vacations && vacations.length) {
    vacations.forEach(item => {
      item.empVacationPeriod = item.empVacationPeriod || ''
      if (item.orderDate && item.orderNumber) {
        item.orderDateNumber = UB.i18n(`№ {0} вiд {1}`, item.orderNumber, dateService.formatDate(item.orderDate))
      } else {
        item.orderDateNumber = ''
      }
    })
  }

  const attrsTableVacations = ['dateFrom', 'dateTo', 'vreason', 'vacationKind', 'empVacationPeriod', 'orderDateNumber']
  setTableData(data, _.sortBy(vacations, ['dateFrom', 'dateTo']), attrsTableVacations, 'vacation', 27, ['dateFrom', 'dateTo'])

  /*
  requestAttrs = ['ID', 'employeeID', 'employeeNumberID', 'dateFrom', 'dateTo', 'orderID.orderDate', 'orderID.orderNumber', 'orderID', 'orderID.orderState',
    'orderID.orderNumberFull', 'dictVacationKindID.name', 'orderID.reason', 'empVacationPeriodID' ]
  let vacations = []
  if (curTabNumID) {
    let vacations1 = null
    vacations1 = UB.Repository('hr_empOrderVacationListDet')
      .attrs(requestAttrs)
      .where('employeeID', '=', params.instanceID)
      .where('employeeNumberID', '=', curTabNumID)
      .where('orderID.mi_deleteDate', '>=', '#maxdate')
      .where('dictVacationKindID.mi_deleteDate', '>=', '#maxdate')
      .where('orderID.orderState', 'in', ['POSTED', 'PROCESSED'])
      .selectAsObject({
        'dictVacationKindID.name': 'vacationKind',
        'orderID.reason': 'vreason'
      })

    let vacations2 = null
    const v2requestAttrs = ['ID', 'employeeID', 'employeeNumberID', 'dateFrom', 'dateTo', 'orderID.orderDate', 'orderID.orderNumber', 'orderID', 'orderID.orderState',
      'orderID.orderNumberFull', 'dictVacationKindID.name', 'orderID.reason' ]
    vacations2 = UB.Repository('hr_empOrderVacationprolongDet')
      .attrs(v2requestAttrs)
      .where('employeeID', '=', params.instanceID)
      .where('employeeNumberID', '=', curTabNumID)
      .where('mi_deleteDate', '>=', '#maxdate')
      .where('orderID.mi_deleteDate', '>=', '#maxdate')
      .where('dictVacationKindID.mi_deleteDate', '>=', '#maxdate')
      .where('orderID.orderState', 'in', ['POSTED', 'PROCESSED'])
      .selectAsObject({
        'dictVacationKindID.name': 'vacationKind',
        'orderID.reason': 'vreason'
      })

    let vacations3 = null
    vacations3 = UB.Repository('hr_empOrderVacationlongDet')
      .attrs(v2requestAttrs)
      .where('employeeID', '=', params.instanceID)
      .where('employeeNumberID', '=', curTabNumID)
      .where('mi_deleteDate', '>=', '#maxdate')
      .where('orderID.mi_deleteDate', '>=', '#maxdate')
      .where('dictVacationKindID.mi_deleteDate', '>=', '#maxdate')
      .where('orderID.orderState', 'in', ['POSTED', 'PROCESSED'])
      .selectAsObject({
        'dictVacationKindID.name': 'vacationKind',
        'orderID.reason': 'vreason'
      })

    const vac = [vacations1, vacations2, vacations3].filter(v => v && v.length > 0)
    vacations = vac[0] || ''
    if (vac.length === 3) {
      vacations = [...vac[0], ...vac[1], ...vac[2]]
    } if (vac.length === 2) {
      vacations = [...vac[0], ...vac[1]]
    } else {
      vacations = vac[0] || ''
    }
  }

  let orderDateNumber = null
  // let empVacationPeriod = null
  if (vacations) {
    vacations.forEach(item => {
      // orderDateNumber
      if (item['orderID.orderDate'] && item['orderID.orderNumberFull']) {
        orderDateNumber = `№ ${item['orderID.orderNumberFull']} вiд ${dateService.formatDate(item['orderID.orderDate'])}`
      }
      item['orderDateNumber'] = orderDateNumber

      if (item['empVacationPeriodID']) {
        const vacationPeriod = UB.Repository('hr_empVacationPeriod')
            .attrs(['dateFrom', 'dateTo'])
            .selectById(item['empVacationPeriodID'])

        if (vacationPeriod) {
          item['empVacationPeriod'] = `${dateService.formatDate(vacationPeriod['dateFrom'])} - ${dateService.formatDate(vacationPeriod['dateTo'])}`
        }
      }
    })
  }

  const attrsTableVacations = ['dateFrom', 'dateTo', 'vreason', 'vacationKind', 'empVacationPeriod', 'orderDateNumber']
  setTableData(data, vacations, attrsTableVacations, 'vacation', 27, ['dateFrom', 'dateTo'])
  */

  // Rewards 76-77
  requestAttrs = ['ID', 'employeeID', 'bonusID.name', 'description']
  let rewards = UB.Repository('hr_empOrderRewardDet')
    .attrs(requestAttrs)
    .where('employeeID', '=', params.instanceID)
    .where('employeeNumberID', '=', curTabNumID)
    .where('mi_deleteDate', '>=', '#maxdate')
    .where('bonusID.mi_deleteDate', '>=', '#maxdate')
    .selectAsObject()

  requestAttrs = ['ID', 'employeeID', 'bonusID.name', 'description']
  const bonuses = UB.Repository('hr_empOrderBonusDet')
    .attrs(requestAttrs)
    .where('employeeID', '=', params.instanceID)
    .where('employeeNumberID', '=', curTabNumID)
    .where('mi_deleteDate', '>=', '#maxdate')
    .where('bonusID.mi_deleteDate', '>=', '#maxdate')
    .selectAsObject()

  const arrRewards = [rewards, bonuses].filter(Boolean)
  if (arrRewards.length === 2) {
    rewards = arrRewards[0].concat(arrRewards[1])
  } else if (arrRewards.length === 1) {
    rewards = arrRewards[0] || ''
  }
  requestAttrs = ['bonusID.name', 'description']
  setTableData(data, rewards, requestAttrs, 'rewards', 8)

  // Penalties 78-83
  // requestAttrs = ['ID', 'employeeID', 'dictPenaltyID.name', 'dictPenaltyReasonID.name']
  requestAttrs = ['ID', 'employeeID', 'dictPenaltyID.name', 'reason']
  const penalties = UB.Repository('hr_empOrderPenaltyDet')
    .attrs(requestAttrs)
    .where('employeeID', '=', params.instanceID)
    .where('employeeNumberID', '=', curTabNumID)
    .where('mi_deleteDate', '>=', '#maxdate')
    .where('dictPenaltyID.mi_deleteDate', '>=', '#maxdate')
    .selectAsObject()

  requestAttrs = ['dictPenaltyID.name', 'reason']
  setTableData(data, penalties, requestAttrs, 'penalties', 5)

  // firing
  requestAttrs = ['ID', 'employeeID', 'dateTo', 'dischargeReason']
  const firing = UB.Repository('hr_employeeWorkbook')
    .attrs(requestAttrs)
    .where('employeeID', '=', params.instanceID)
    .where('mi_deleteDate', '>=', '#maxdate')
    .where('employeePositionID.employeeNumberID', '=', curTabNumID)
    .where('employeePositionID.positionID.positionType', '=', '1')
    .where('employeePositionID.positionID.mi_dateFrom', '<=', params.onDate)
    .where('employeePositionID.positionID.mi_dateTo', '>=', params.onDate)
    .where('employeePositionID.positionID.mi_deleteDate', '>=', '#maxdate')
    .where('employeePositionID.positionID.state', '=', 'ACTIVE')
    .orderBy('dateFrom', 'desc')
    .limit(1)
    .selectSingle()
  if (firing) {
    data['dateTo'] = firing['dateTo'] ? dateService.formatDate(firing['dateTo']) : ''

    if (firing['dischargeReason']) {
      const arrDischargeReason = getSliceStrArr(firing['dischargeReason'], [86, 111, 111])
      data['dischargeReason1'] = arrDischargeReason[0] || ''
      data['dischargeReason2'] = arrDischargeReason[1] || ''
      data['dischargeReason3'] = arrDischargeReason[2] || ''
      data['dischargeReason4'] = arrDischargeReason[3] || ''
    } else {
      data['dateTo'] = ''
      data['dischargeReason1'] = ''
      data['dischargeReason2'] = ''
      data['dischargeReason3'] = ''
      data['dischargeReason4'] = ''
    }
  } else {
    data['dateTo'] = ''
    data['dischargeReason1'] = ''
    data['dischargeReason2'] = ''
    data['dischargeReason3'] = ''
    data['dischargeReason4'] = ''
  }

  // experience 19
  let expRequestAttrs = ['daysGeneral', 'monthsGeneral', 'yearsGeneral']
  const experienceGeneral = {}
  expRequestAttrs.forEach(attr => { experienceGeneral[attr] = '0' })

  if (dateStart) {
    requestAttrs = ['employeeID', 'calcDate']
    let experienceRes = null
    experienceRes = UB.Repository('hr_employeeExperience')
      .attrs(requestAttrs)
      .where('employeeID', '=', params.instanceID)
      .where('dictExperienceID.methodExpID.code', '=', 1)
      .where('dictExperienceID.mi_deleteDate', '>=', '#maxdate')
      .where('dictExperienceID.methodExpID.mi_deleteDate', '>=', '#maxdate')
      .where('employeeNumberID', '=', params.tabNumID, 'empNum')
      .where('employeeNumberID', 'isNull', undefined, 'empNumNull')
      .logic('([empNum] OR [empNumNull])')
      .orderByDesc('employeeNumberID')
      .limit(1)
      .selectSingle()

    if (experienceRes && experienceRes['calcDate']) {
      const ymd = dateService.getYmd(experienceRes.calcDate, dateStart, true)
      experienceGeneral['daysGeneral'] = ymd.days + ''
      experienceGeneral['monthsGeneral'] = ymd.months + ''
      experienceGeneral['yearsGeneral'] = ymd.years + ''
    }
  }
  setData(data, experienceGeneral, expRequestAttrs)

  // experience 20
  expRequestAttrs = ['daysServant', 'monthsServant', 'yearsServant']
  const experienceServant = {}
  expRequestAttrs.forEach(attr => { experienceServant[attr] = '0' })

  if (dateStart) {
    requestAttrs = ['employeeID', 'calcDate']
    let experienceRes = null
    experienceRes = UB.Repository('hr_employeeExperience')
      .attrs(requestAttrs)
      .where('employeeID', '=', params.instanceID)
      .where('dictExperienceID.methodExpID.code', '=', 6)
      .where('dictExperienceID.mi_deleteDate', '>=', '#maxdate')
      .where('dictExperienceID.methodExpID.mi_deleteDate', '>=', '#maxdate')
      .where('employeeNumberID', '=', params.tabNumID, 'empNum')
      .where('employeeNumberID', 'isNull', undefined, 'empNumNull')
      .logic('([empNum] OR [empNumNull])')
      .orderByDesc('employeeNumberID')
      .limit(1)
      .selectSingle()

    if (experienceRes && experienceRes['calcDate']) {
      const ymd = dateService.getYmd(experienceRes.calcDate, dateStart, true)
      experienceServant['daysServant'] = ymd.days + ''
      experienceServant['monthsServant'] = ymd.months + ''
      experienceServant['yearsServant'] = ymd.years + ''
    }
  }
  setData(data, experienceServant, expRequestAttrs)

  // Workbook
  requestAttrs = ['workPosition', 'workPlace', 'dateFrom', 'dateTo']
  const works = UB.Repository('hr_employeeWorkbook')
    .attrs(requestAttrs)
    .where('employeeID', '=', params.instanceID)
    .where('mi_deleteDate', '>=', '#maxdate')
    .orderBy('dateFrom', 'asc')
    .selectAsObject({
      'dateFrom': 'wDateFrom',
      'dateTo': 'wDateTo'
    })

  if (works) {
    works.forEach((work) => {
      work.wPos = [work['workPosition'], work['workPlace']].filter(Boolean).join(', ')
    })
  }
  setTableData(data, works, [ 'wPos', 'wDateFrom', 'wDateTo' ], 'workbook', 27, ['wDateFrom', 'wDateTo'])

  const result = docxService.generateDocxDocument({
    templatePath: path.join(templatePath, 'dergSlugOsobovaKartka_Old.docx'),
    fileName: sFileName,
    data,
    entityName: 'hr_employee',
    ID: params.instanceID,
    withImage: true,
    imageAttr: 'photo'
  })

  const docs = [
    {
      fileContent: JSON.stringify(result.stringContent),
      fileName: sFileName
    }
  ]

  return JSON.stringify(docs)
}

function dergSlugOsobovaKartka2020 (params, templatePath) {
  const data = {}
  let sFileName = 'Unknown'
  const organizationID = params.orgID || 0
  const curTabNumID = params.tabNumID || 0
  const yearOnDate = dateService.formatDate(params.onDate, 'yyyy') || 0

  const org = UB.Repository('hr_organization')
    .attrs(['name', 'EDRPOUCode'])
    .where('mi_data_id', '=', organizationID)
    .where('state', '=', 'ACTIVE')
    .misc({ __mip_ondate: params.onDate })
    .orderBy('mi_dateFrom', 'desc')
    .limit(1)
    .selectSingle()
  data.orgName = org.name
  data.orgEDRPOUCode = org.EDRPOUCode || ''

  let requestAttrs = ['ID', 'employeeID', 'dateFrom', 'dateTo', 'orderID', 'orderID.description', 'employeeNumberID.tabNum']
  const position = UB.Repository('hr_employeePositionS')
    .attrs(requestAttrs)
    .where('employeeID', '=', params.instanceID)
    .where('employeeNumberID', '=', curTabNumID)
    .where('organizationID', '=', organizationID)
    .where('orderID.empOrderType', 'in', ['APPOINT', 'MOVE', 'APPOINT_LIQ', 'CANCELDISM'])
    .where('orderID.mi_deleteDate', '>=', '#maxdate')
    .where('employeeNumberID.mi_deleteDate', '>=', '#maxdate')
    .orderBy('dateFrom', 'desc')
    .limit(1)
    .selectSingle()
  setData(data, position, ['employeeNumberID.tabNum', 'orderID.description'])

  const dateStart = position && position['dateFrom'] ? position['dateFrom'] : null

  requestAttrs = ['ID', 'employeeID', 'appointOrder']
  const empPositions = UB.Repository('hr_employeeWorkbook')
    .attrs(requestAttrs)
    .where('employeeID', '=', params.instanceID)
    .where('positionType', '=', '1')
    .where('organizationID', '=', organizationID)
    .where('isOrgAppoint', '=', 1)
    .orderBy('dateFrom', 'desc')
    .limit(1)
    .selectSingle()
  setData(data, empPositions, ['appointOrder'])

  // employee general 5, 6, 8, 9, 10, 12, 15, 22, 35, 46, 47, 48, pt 18
  requestAttrs = ['firstName', 'lastName', 'middleName', 'photo', 'shortFIO', 'sexType',
    'taxCode', 'dayBirthDate', 'monthBirthDate', 'yearBirthDate',
    'citizenshipID.name', 'dictMaritalStatusKindID.name', 'phoneMobile', 'scientificWorks', 'isCitizen', 'deputy', 'isInitiated', 'birthPlace',
    'oathDate', 'oathOrgName', 'empOrderAppoint']
  let ignoreAttrs = ['shortFIO', 'sexType', 'scientificWorks', 'isCitizen', 'isInitiated', 'deputy', 'oathDate', 'oathOrgName']
  const employee = UB.Repository('hr_employee')
    .attrs(requestAttrs)
    .selectById(params.instanceID)
  setData(data, employee, requestAttrs, ignoreAttrs)

  data.appointOrder = employee && employee.empOrderAppoint ? employee.empOrderAppoint : data.appointOrder

  if (employee && employee['birthPlace']) {
    const arrBirthPlace = getSliceStrArr(employee['birthPlace'], [20])
    data['birthPlace1'] = arrBirthPlace[0] || ''
    data['birthPlace2'] = arrBirthPlace[1] || ''
  } else {
    data['birthPlace1'] = ''
    data['birthPlace2'] = ''
  }

  sFileName = employee ? employee.shortFIO : ''

  requestAttrs = ['value']
  const employeeContact = UB.Repository('hr_employeeContact')
    .attrs(requestAttrs)
    .where('value', 'isNotNull')
    .where('contactTypeID.code', '=', 'email')
    .where('employeeID', '=', params.instanceID)
    .selectAsObject()
  data['email'] = employeeContact && employeeContact.length ? employeeContact.map(el => el.value).join('; ') : ''

  // legal, fact address 6
  requestAttrs = ['ownerID', 'addressEmpType', 'address', 'postIndex', 'regionID.name', 'cityID.name', 'cityID.cityTypeID.code', 'districtID.name',
    'streetType.shortName', 'street', 'section', 'house', 'apartment', 'addressEmpType.name']

  const addressData = UB.Repository('ac_address')
    .attrs(requestAttrs)
    .where('ownerID', '=', params.instanceID)
    .where('addressEmpType', 'in', ['1', '2']) // 1 fact, 2 legal
    .selectAsObject()

  let factAddress = addressData.filter(el => el.addressEmpType === '1')
  let factAddressEmpTypeName = ''
  if (factAddress && factAddress.length) {
    /*
    const item = factAddress[0]
    factAddress = _.compact([item.postIndex, item['regionID.name'], `${item['cityID.cityTypeID.code']||''}${item['cityID.name']||''}`,
    item['districtID.name'], `${item['streetType.shortName']||''}${item['street']||''}`, item.section, item.house, item.apartment]).join(', ')
     */
    factAddressEmpTypeName = factAddress[0]['addressEmpType.name'] ? factAddress[0]['addressEmpType.name'] + ': ' : ''
    factAddress = factAddress[0]['address']
  } else {
    factAddress = ''
  }

  let legalAddress = addressData.filter(el => el.addressEmpType === '2')
  let legalAddressEmpTypeName = ''
  if (legalAddress && legalAddress.length) {
    /*
    const item = legalAddress[0]
    legalAddress = _.compact([item.postIndex, item['regionID.name'], `${item['cityID.cityTypeID.code']||''}${item['cityID.name']||''}`,
      item['districtID.name'], `${item['streetType.shortName']||''}${item['street']||''}`, item.section, item.house, item.apartment]).join(', ')
    */
    legalAddressEmpTypeName = legalAddress[0]['addressEmpType.name'] ? legalAddress[0]['addressEmpType.name'] + ': ' : ''
    legalAddress = legalAddress[0]['address']
  } else {
    legalAddress = ''
  }

  if (factAddress && legalAddress && factAddress !== legalAddress) {
    legalAddress = legalAddressEmpTypeName + legalAddress + '; ' + factAddressEmpTypeName + factAddress
  } else if (legalAddress || factAddress) {
    legalAddress = factAddress ? factAddressEmpTypeName + factAddress : legalAddressEmpTypeName + legalAddress
  }

  if (legalAddress && legalAddress.length) {
    legalAddress = getSliceStrArr(legalAddress, [84])
    data['address1'] = legalAddress[0] || ''
    data['address2'] = legalAddress[1] || ''
  } else {
    data['address1'] = ''
    data['address2'] = ''
  }

  // passport
  requestAttrs = ['ID', 'employeeID', 'dictDocKindID.name', 'docSeries', 'docNumber', 'docIssued', 'docIssuedDate', 'state']
  ignoreAttrs = ['ID', 'employeeID', 'state']
  const passport = UB.Repository('hr_employeeDocs')
    .attrs(requestAttrs)
    .where('employeeID', '=', params.instanceID)
    .where('dictDocKindID.docType.name', 'in', ['Паспорт', 'паспорт', 'ПАСПОРТ'])
    .where('state', '=', '1')
    .limit(1)
    .selectSingle()
  if (passport) {
    if (passport['docIssued']) {
      const arrDocIssued = getSliceStrArr(passport['docIssued'], [27, 40])
      passport['docIssued1'] = arrDocIssued[0] || ''
      passport['docIssued2'] = arrDocIssued[1] || ''
      passport['docIssued3'] = arrDocIssued[2] || ''
    }
    if (passport['docIssuedDate']) {
      passport['docIssuedDate'] = dateService.formatDate(passport['docIssuedDate'])
    }
  }
  requestAttrs = ['dictDocKindID.name', 'docSeries', 'docNumber', 'docIssued1', 'docIssued2', 'docIssued3', 'docIssuedDate']
  setData(data, passport, requestAttrs)

  // education 7
  requestAttrs = ['ID', 'employeeID', 'dictEducationLevelID.name', 'dictSpecialtyID.name',
    'docNumber', 'docSeries', 'dictEducationLevelID.educationType']
  const education = UB.Repository('hr_employeeEducation')
    .attrs(requestAttrs)
    .where('employeeID', '=', params.instanceID)
    .where('dictEducationLevelID.educationType', '=', '1')
    .selectAsObject()

  setTableData(data, education, ['educationName', 'dictEducationLevelID.name', 'dictSpecialtyID.name',
    'docNumber', 'docSeries'], 'education', education.length + 2)

  // benefits 8
  requestAttrs = ['ID', 'employeeID', 'dictBenefitsKindID.type', 'dictBenefitsKindID.name']
  let benefits = UB.Repository('hr_employeeBenefits')
    .attrs(requestAttrs)
    .where('employeeID', '=', params.instanceID)
    .where('mi_deleteDate', '>=', '#maxdate')
    .where('dictBenefitsKindID.mi_deleteDate', '>=', '#maxdate')
    .where('dateFrom', '<=', params.onDate)
    .where('dateTo', '>=', params.onDate)
    .selectAsObject({
      'dictBenefitsKindID.type': 'type'
    })

  requestAttrs = ['employeeDocID.description']
  const benefitsDocs = benefits && benefits.length ? UB.Repository('hr_employeeBenefitsDoc')
    .attrs(requestAttrs)
    .where('employeeBenefitID', 'in', benefits.map(el => el.ID))
    .where('mi_deleteDate', '>=', '#maxdate')
    .selectAsObject() : []

  data.benefitsDocsStr = benefitsDocs && benefitsDocs.length ? benefitsDocs.map(el => el['employeeDocID.description']).join(', ') : ''
  benefits = benefits && benefits.length ? _.groupBy(benefits, item => {
    return ['1', '3', '4', '5', '6', '7', '8'].indexOf(item.type) >= 0 ? item.type : 'null'
  }) : []
  data['b1'] = benefits['1'] ? '+' : ''
  data['b2'] = benefits['4'] ? '+' : ''
  data['b3'] = benefits['5'] ? '+' : ''
  data['b4'] = benefits['3'] ? '+' : ''
  data['b5'] = benefits['6'] ? '+' : ''
  data['b6'] = benefits['8'] ? '+' : ''
  data['b7'] = benefits['7'] ? '+' : ''
  data['b8'] = benefits['null'] ? '+' : ''
  let b8Info = benefits['null'] ? benefits['null'].map(el => el['dictBenefitsKindID.name']).join(', ') : ''
  if (b8Info.length) {
    b8Info = getSliceStrArr(b8Info, [27])
    data['b8Info1'] = b8Info[0] || ''
    data['b8Info2'] = b8Info[1] || ''
  } else {
    data['b8Info1'] = ''
    data['b8Info2'] = ''
  }

  // rank and military 8
  data['rank'] = ''
  data['military'] = ''
  if (dateStart) {
    requestAttrs = ['ID', 'employeeID', 'dictRankID.name', 'dictRankID.rankType', 'dictRankID.rankType.name']
    const rank = UB.Repository('hr_publServRang')
      .attrs(requestAttrs)
      .where('employeeID', '=', params.instanceID)
      .where('dictRankID.mi_deleteDate', '>=', '#maxdate')
      .where('mi_deleteDate', '>=', '#maxdate')
      .where('dateFrom', '<=', dateStart)
      .where('dateTo', '>=', dateStart)
      .selectAsObject()

    data['rank'] = rank.map(el => {
      return UB.i18n(`Ранг {0}: {1}`, el['dictRankID.rankType'] === 'COMMON' ? 'державної служби' : el['dictRankID.rankType.name'], el['dictRankID.name'] || '')
    }).join(', ')
  } else {
    data['rank'] = ''
  }

  requestAttrs = ['ID', 'employeeID', 'dictMilitaryRankID.name', 'docSeries', 'docNumber', 'docIssuer', 'dateIssue',
    'dictMilitarySuitableID.name', 'officeFact', 'office']
  const military = UB.Repository('hr_empStateMilitary')
    .attrs(requestAttrs)
    .where('employeeID', '=', params.instanceID)
    .selectSingle({
      'docSeries': 'milDocSeries',
      'docNumber': 'milDocNumber',
      'dateIssue': 'milDateIssue'
    })

  requestAttrs = ['dictMilitaryRankID.name', 'dictMilitarySuitableID.name', 'milDocSeries', 'milDocNumber', 'milDateIssue']
  setData(data, military, requestAttrs, ['milDateIssue'])

  if (military) {
    data['military'] = military['dictMilitaryRankID.name']
  }

  if (military && military.docIssuer) {
    const arr = getSliceStrArr(military.docIssuer, [27, 40])
    data['milDocIssuer1'] = arr[0] || ''
    data['milDocIssuer2'] = arr[1] || ''
    data['milDocIssuer3'] = arr[2] || ''
  } else {
    data['milDocIssuer1'] = ''
    data['milDocIssuer2'] = ''
    data['milDocIssuer3'] = ''
  }

  if (military && military.officeFact) {
    const arr = getSliceStrArr(military.officeFact, [20])
    data['milOfficeFact1'] = arr[0] || ''
    data['milOfficeFact2'] = arr[1] || ''
  } else {
    data['milOfficeFact1'] = ''
    data['milOfficeFact2'] = ''
  }
  if (military && military.office) {
    const arr = getSliceStrArr(military.office, [30])
    data['milOffice1'] = arr[0] || ''
    data['milOffice2'] = arr[1] || ''
  } else {
    data['milOffice1'] = ''
    data['milOffice2'] = ''
  }

  // 12
  if (employee) {
    employee.oathDate = employee.oathDate ? dateService.formatDate(employee.oathDate) : null
    data['oathGeneral'] = [employee.oathDate, employee.oathOrgName].filter(Boolean).join(', ')
  } else {
    data['oathGeneral'] = ''
  }

  // experience 14
  const expRequestAttrs = ['daysServant', 'monthsServant', 'yearsServant']
  const experienceServant = {}
  expRequestAttrs.forEach(attr => {
    experienceServant[attr] = '0'
  })

  experienceServant['dS'] = 'днів'
  experienceServant['mS'] = 'місяців'
  experienceServant['yS'] = 'років'
  if (dateStart) {
    requestAttrs = ['employeeID', 'calcDate']
    let experienceRes = null
    experienceRes = UB.Repository('hr_employeeExperience')
      .attrs(requestAttrs)
      .where('employeeID', '=', params.instanceID)
      .where('dictExperienceID.methodExpID.code', '=', 6)
      .where('dictExperienceID.mi_deleteDate', '>=', '#maxdate')
      .where('dictExperienceID.methodExpID.mi_deleteDate', '>=', '#maxdate')
      .where('employeeNumberID', '=', params.tabNumID, 'empNum')
      .where('employeeNumberID', 'isNull', undefined, 'empNumNull')
      .logic('([empNum] OR [empNumNull])')
      .orderByDesc('employeeNumberID')
      .limit(1)
      .selectSingle()

    if (experienceRes && experienceRes['calcDate']) {
      const ymd = dateService.getYmd(experienceRes.calcDate, dateStart, true)
      experienceServant['daysServant'] = ymd.days + ''
      experienceServant['monthsServant'] = ymd.months + ''
      experienceServant['yearsServant'] = ymd.years + ''
      experienceServant['dS'] = dateService.plural('день_дні_днів', ymd.days)
      experienceServant['mS'] = dateService.plural('місяць_місяці_місяців', ymd.months)
      experienceServant['yS'] = dateService.plural('рік_роки_років', ymd.years)
    }
  }
  setData(data, experienceServant, expRequestAttrs.concat(['dS', 'mS', 'yS']))

  // firing
  requestAttrs = ['ID', 'employeeID', 'dateTo', 'dischargeReason', 'dismOrder']
  const firing = UB.Repository('hr_employeeWorkbook')
    .attrs(requestAttrs)
    .where('employeeID', '=', params.instanceID)
    .where('mi_deleteDate', '>=', '#maxdate')
    .where('employeePositionID.employeeNumberID', '=', curTabNumID)
    .where('employeePositionID.positionID.positionType', '=', '1')
    .where('employeePositionID.positionID.mi_dateFrom', '<=', params.onDate)
    .where('employeePositionID.positionID.mi_dateTo', '>=', params.onDate)
    .where('employeePositionID.positionID.mi_deleteDate', '>=', '#maxdate')
    .where('employeePositionID.positionID.state', '=', 'ACTIVE')
    .orderBy('dateFrom', 'desc')
    .limit(1)
    .selectSingle()
  if (firing) {
    data['dateTo'] = firing['dateTo'] ? dateService.formatDate(firing['dateTo']) : ''
    data['dismOrder'] = firing['dismOrder'] || ''

    if (firing['dischargeReason']) {
      const arrDischargeReason = getSliceStrArr(firing['dischargeReason'], [18, 40])
      data['dischargeReason1'] = arrDischargeReason[0] || ''
      data['dischargeReason2'] = arrDischargeReason[1] || ''
      data['dischargeReason3'] = arrDischargeReason[2] || ''
    } else {
      data['dateTo'] = ''
      data['dismOrder'] = ''
      data['dischargeReason1'] = ''
      data['dischargeReason2'] = ''
      data['dischargeReason3'] = ''
    }
  } else {
    data['dateTo'] = ''
    data['dismOrder'] = ''
    data['dischargeReason1'] = ''
    data['dischargeReason2'] = ''
    data['dischargeReason3'] = ''
  }

  // Addons 1
  // из трудовой книжки брать такие записи, у которых "у которых Створений автоматично " = "Ні"  и организация = поточна организация и запись относится
  // к блоку записей последнего назначения в эту организацию, который вычислим по флажку "Э призначенням"
  const appointmentsLastDate = UB.Repository('hr_employeeWorkbook')
    .attrs('dateFrom')
    .where('employeeID', '=', params.instanceID)
    .where('organizationID', '=', organizationID)
    .where('isOrgAppoint', '=', 1)
    .orderBy('dateFrom', 'desc')
    .selectScalar()

  requestAttrs = ['ID', 'employeeID', 'appointOrder', 'dateFrom', 'workPosition']
  const appointWB = appointmentsLastDate ? UB.Repository('hr_employeeWorkbook')
    .attrs(requestAttrs)
    .where('employeeID', '=', params.instanceID)
    .where('organizationID', '=', organizationID)
    .where('isAuto', '=', 0)
    .where('dateFrom', '>=', appointmentsLastDate)
    .orderBy('dateFrom')
    .selectAsObject() : []

  appointWB.forEach(item => {
    item.order = item.appointOrder || ''
    item.position = item.workPosition || ''
    item.rank = ''
    item.reason = ''
    item.dateFrom = item.dateFrom ? dateService.formatDate(item.dateFrom) : ''
  })

  requestAttrs = ['ID', 'employeeID', 'dateFrom', 'dateTo', 'positionID', 'orderID', 'orderID.description', 'dictRankID.name', 'paraID']
  let employeePosition = UB.Repository('hr_employeePositionS')
    .attrs(requestAttrs)
    .where('employeeID', '=', params.instanceID)
    .where('employeeNumberID', '=', curTabNumID)
    .where('organizationID', '=', organizationID)
    .where('orderID.empOrderType', 'in', ['APPOINT', 'APPOINT_LIQ'])
    .where('orderID.mi_deleteDate', '>=', '#maxdate')
    .where('employeeNumberID.mi_deleteDate', '>=', '#maxdate')
    .orderBy('dateFrom', 'desc')
    .limit(1)
    .selectSingle()

  data.employeeOrders = []
  if (employeePosition) {
    const appoint = UB.Repository('hr_empOrderAppointDet')
      .attrs('dictAppointKindID.name')
      .where('ID', '=', employeePosition.paraID || 0)
      .selectScalar() || ''

    const positionIDs = []
    data.employeeOrders.push({
      onDate: employeePosition.dateFrom,
      dateFrom: employeePosition.dateFrom && !dateService.isMaxDate(employeePosition.dateFrom) ? dateService.formatDate(employeePosition.dateFrom) : '',
      positionID: employeePosition.positionID || 0,
      position: '',
      // position: employeePosition['positionID.name'] || ''
      rank: employeePosition['dictRankID.name'] || '',
      order: employeePosition['orderID.description'] || '',
      reason: appoint
    })
    if (employeePosition.dateFrom && employeePosition.positionID) {
      positionIDs.push({
        onDate: employeePosition.dateFrom,
        positionID: employeePosition.positionID
      })
    }

    if (employeePosition.dateFrom) {
      let lastRank = employeePosition['dictRankID.name'] || ''
      let lastPosition = employeePosition.positionID // employeePosition['positionID.name'] || ''

      requestAttrs = ['ID', 'employeeID', 'dateFrom', 'dateTo', 'positionID', 'orderID', 'orderID.description', 'dictRankID.name', 'paraID']
      employeePosition = UB.Repository('hr_employeePositionS')
        .attrs(requestAttrs)
        .where('employeeID', '=', params.instanceID)
        .where('employeeNumberID', '=', curTabNumID)
        .where('dateFrom', '>=', employeePosition.dateFrom)
        .where('organizationID', '=', organizationID)
        .where('orderID.empOrderType', 'in', ['MOVE', 'CANCELDISM'])
        .where('orderID.mi_deleteDate', '>=', '#maxdate')
        .where('employeeNumberID.mi_deleteDate', '>=', '#maxdate')
        .orderBy('dateFrom', 'desc')
        .selectAsObject()
      employeePosition.forEach(item => {
        const move = UB.Repository('hr_empOrderMoveDet')
          .attrs('dictReasonMovingKindID.name')
          .where('ID', '=', item.paraID || 0)
          .selectScalar() || ''

        if (lastRank !== (item['dictRankID.name'] || '') || (lastPosition !== item.positionID)) {
          data.employeeOrders.push({
            onDate: item.dateFrom,
            dateFrom: item.dateFrom && !dateService.isMaxDate(item.dateFrom) ? dateService.formatDate(item.dateFrom) : '',
            positionID: item.positionID || 0,
            position: '', // item['positionID.name'] || ''
            rank: item['dictRankID.name'] || '',
            order: item['orderID.description'] || '',
            reason: move
          })
          lastRank = item['dictRankID.name'] || ''
          lastPosition = item.positionID // employeePosition['positionID.name'] || ''
          if (item.dateFrom && item.positionID && !_.find(positionIDs, { onDate: item.dateFrom, positionID: item.positionID })) {
            positionIDs.push({
              onDate: item.dateFrom,
              positionID: item.positionID
            })
          }
        }
      })
    }

    const positions = {}
    for (let i = 0; i < positionIDs.length; i++) {
      const item = positionIDs[i]
      if (item.positionID && !positions[item.positionID]) {
        positions[item.positionID] = []
        for (let k = 0; k < 2; k++) {
          const posInfoData = UB.Repository('hr_position')
            .attrs(['name', 'fullName', 'psCategory.name'])
            .where('ID', '=', item.positionID)
            .where('orgID', '=', organizationID)
            .where('state', '=', 'ACTIVE')
            .where('mi_deleteDate', '>=', '#maxdate')
            .whereIf(k === 0, 'mi_dateFrom', '<=', item.onDate)
            .whereIf(k === 0, 'mi_dateTo', '>=', item.onDate)
            .orderBy('mi_dateFrom', 'desc')
            .orderBy('mi_dateTo', 'desc')
            .limit(1)
            .selectSingle()
          if (posInfoData) {
            data.employeeOrders.filter(el => (el.onDate === item.onDate) && (el.positionID === item.positionID)).forEach(el => {
              el.position = posInfoData.fullName || posInfoData.name || ''
              if (posInfoData['psCategory.name']) {
                el.rank = posInfoData['psCategory.name'] + (el.rank ? '; ' : '') + el.rank
              }
            })
            k = 2
          }
        }
      }
    }
  }
  data.employeeOrders = appointWB.concat(_.sortBy(data.employeeOrders, 'onDate'))
  data.employeeOrders.push({ dateFrom: '', position: '', rank: '', order: '', reason: '' })
  data.employeeOrders.push({ dateFrom: '', position: '', rank: '', order: '', reason: '' })

  // Addons 2
  requestAttrs = ['ID', 'employeeID', 'dictTrainingTopicName', 'dictTrainingTopicID.name', 'ects',
    'dictProfCompDevelopFormID.trainingKind', 'dictProfCompDevelopFormID.trainingKind.name',
    'dictProfCompDevelopFormID.name', 'dictProfCompetencyID.name', 'docType.name', 'docNumber', 'docSeries', 'docDate', 'dateTo']
  let empCertificatnUp = UB.Repository('hr_empCertificatnUp')
    .attrs(requestAttrs)
    .where('employeeID', '=', params.instanceID)
    .where('organizationID', '=', organizationID)
    .where('dictProfCompDevelopFormID.trainingKind', 'in', ['1', '2', '3'])
    .orderBy('dateTo', 'asc')
    .selectAsObject({
      'dictProfCompDevelopFormID.trainingKind': 'trainingKind',
      'dictProfCompDevelopFormID.trainingKind.name': 'trainingName',
      'dictProfCompDevelopFormID.name': 'profName',
      'dictProfCompetencyID.name': 'competency'
    })

  requestAttrs = ['ID', 'employeeID', 'dictSpecialtyID.name', 'qualification',
    'dictEducationLevelID.name', 'educationForm.name', 'educationName', 'dateTo',
    'employeeDocID.description', 'dictDocKindID.name', 'docNumber', 'docSeries', 'dateIssue']
  const employeeEducation = UB.Repository('hr_employeeEducation')
    .attrs(requestAttrs)
    .where('employeeID', '=', params.instanceID)
    .where('dictEducationLevelID.educationType', 'in', ['1', '4']) // Вища та Інші
    .orderBy('dateTo', 'asc')
    .selectAsObject() || []

  empCertificatnUp = empCertificatnUp.map(row => {
    const doc = _.compact([row.docSeries, row.docNumber, row.docDate ? dateService.formatDate(row.docDate) : '']).join(' ')

    return Object.assign({}, row, {
      eduYear: row.dateTo ? dateService.formatDate(row.dateTo, 'yyyy') : '',
      educationName: '',
      dictTrainingTopicName: row.dictTrainingTopicName || row['dictTrainingTopicID.name'] || '',
      ects: row.ects ? Number.parseFloat(String(row.ects).replace(/,/g, '.')) || 0 : 0,
      type: row.trainingKind,
      typeName: row.trainingKind === '1' ? UB.i18n('Стажування') : (row.trainingKind === '2' ? UB.i18n('Самоосвіта') : UB.i18n('Підвищення кваліфікації')),
      docInfo: `${row['docType.name'] || ''}${doc ? ' (' : ''}${doc}${doc ? ')' : ''}`
    })
  })

  if (employeeEducation && employeeEducation.length) {
    employeeEducation.forEach(row => {
      let docInfo = row['employeeDocID.description'] || ''
      if (!docInfo && (row['dictDocKindID.name'] || row.docNumber || row.docSeries || row.dateIssue)) {
        docInfo = [row['dictDocKindID.name'], row.docNumber, row.docSeries, row.dateIssue ? dateService.formatDate(row.dateIssue) : ''].filter(Boolean).join(' ')
      }
      let dictTrainingTopicName = [row['dictSpecialtyID.name'], row.qualification].filter(Boolean).join(' ')
      if (row['dictEducationLevelID.name'] || row['educationForm.name']) {
        dictTrainingTopicName += ' (' + uncap(row['dictEducationLevelID.name'] || '') + (row['dictEducationLevelID.name'] && row['educationForm.name'] ? ': ' : '') + uncap(row['educationForm.name'] || '') + ')'
      }
      empCertificatnUp.push({
        eduYear: row.dateTo ? dateService.formatDate(row.dateTo, 'yyyy') : '',
        profName: '',
        competency: '',
        educationName: row.educationName || '',
        dictTrainingTopicName: dictTrainingTopicName || '',
        ects: 0,
        type: 0,
        typeName: UB.i18n('Підготовка'),
        docInfo: docInfo
      })
    })
  }

  empCertificatnUp = empCertificatnUp && empCertificatnUp.length ? _.groupBy(empCertificatnUp, 'eduYear') : {}
  data.addons2 = []
  if (yearOnDate && !empCertificatnUp[yearOnDate]) {
    empCertificatnUp[yearOnDate] = [{
      eduYear: yearOnDate
    }]
  }
  _.forEach(empCertificatnUp, itemsByYear => {
    const obj = {
      eduYear: itemsByYear[0].eduYear
    }
    const itemsByTypes = itemsByYear && itemsByYear.length ? _.groupBy(itemsByYear, 'type') : {}
    if (!itemsByTypes['0']) {
      itemsByTypes['0'] = [{ eduYear: obj.eduYear, typeName: UB.i18n('Підготовка'), ects: 0 }]
    }
    if (!itemsByTypes['3']) {
      itemsByTypes['3'] = [{ eduYear: obj.eduYear, typeName: UB.i18n('Підвищення кваліфікації'), ects: 0 }]
    }
    if (!itemsByTypes['1']) {
      itemsByTypes['1'] = [{ eduYear: obj.eduYear, typeName: UB.i18n('Стажування'), ects: 0 }]
    }
    if (!itemsByTypes['2']) {
      itemsByTypes['2'] = [{ eduYear: obj.eduYear, typeName: UB.i18n('Самоосвіта'), ects: 0 }]
    }

    obj.totalCertificat0 = itemsByTypes['0'].reduce((result, item) => (result + item.ects), 0)
    obj.totalCertificat1 = itemsByTypes['1'].reduce((result, item) => (result + item.ects), 0)
    obj.totalCertificat2 = itemsByTypes['2'].reduce((result, item) => (result + item.ects), 0)
    obj.totalCertificat3 = itemsByTypes['3'].reduce((result, item) => (result + item.ects), 0)
    obj.totalCertificat = obj.totalCertificat0 + obj.totalCertificat1 + obj.totalCertificat2 + obj.totalCertificat3

    requestAttrs = ['typeName', 'dictTrainingTopicName', 'profName', 'competency', 'ects', 'docInfo', 'educationName', 'eduYear']
    setTableData(obj, itemsByTypes['0'], requestAttrs, 'certificat0', itemsByTypes['0'].length + 2, [], obj.eduYear && obj.eduYear === yearOnDate)
    setTableData(obj, itemsByTypes['1'], requestAttrs, 'certificat1', itemsByTypes['1'].length + 2, [], obj.eduYear && obj.eduYear === yearOnDate)
    setTableData(obj, itemsByTypes['2'], requestAttrs, 'certificat2', itemsByTypes['2'].length + 2, [], obj.eduYear && obj.eduYear === yearOnDate)
    setTableData(obj, itemsByTypes['3'], requestAttrs, 'certificat3', itemsByTypes['3'].length + 2, [], obj.eduYear && obj.eduYear === yearOnDate)
    data.addons2.push(obj)
  })

  // Addons 3
  requestAttrs = ['ID', 'employeeID', 'dateFrom', 'dateTo', 'avgValue', 'assessmentValue.name']
  const empAssessment = UB.Repository('hr_empAssessment')
    .attrs(requestAttrs)
    .where('employeeID', '=', params.instanceID)
    .where('avgValue', 'isNotNull', '', 'v1')
    .where('assessmentValue', 'isNotNull', '', 'v2')
    .logic('([v1] or [v2])')
    .where('organizationID', '=', organizationID)
    .orderBy('dateFrom', 'asc')
    .selectAsObject()

  data.empAssessment = empAssessment.map(item => {
    return {
      period: (item.dateFrom ? dateService.formatDate(item.dateFrom) : '') +
          (item.dateFrom && item.dateTo ? ' - ' : '') +
          (item.dateTo ? dateService.formatDate(item.dateTo) : ''),
      avgValue: (item['avgValue'] || '') + (item['assessmentValue.name'] ? ` (${item['assessmentValue.name']})` : '')
    }
  })
  data.empAssessment.push({ period: '', avgValue: '' })
  data.empAssessment.push({ period: '', avgValue: '' })

  // Addons 4
  requestAttrs = ['ID', 'employeeID', 'dateFrom', 'dateTo', 'dayCount', 'orderID.orderDate',
    'orderID.orderNumberFullView', 'dictVacationKindID.name', 'empVacationPeriodID.description' ]
  const vacations = curTabNumID ? UB.Repository('hr_employeeVacation')
    .attrs(requestAttrs)
    .where('employeeID', '=', params.instanceID)
    .where('employeeNumberID', '=', curTabNumID)
    .where('mi_deleteDate', '>=', '#maxdate')
    .where('orderID.mi_deleteDate', '>=', '#maxdate')
    .where('dictVacationKindID.mi_deleteDate', '>=', '#maxdate')
    .where('orderID.orderState', 'in', ['POSTED', 'PROCESSED'])
    .selectAsObject({
      'dictVacationKindID.name': 'vacationName',
      'empVacationPeriodID.description': 'periodName',
      'orderID.orderNumberFullView': 'orderNumber',
      'orderID.orderDate': 'orderDate'
    }) : []

  if (vacations && vacations.length) {
    vacations.forEach(item => {
      item.periodName = item.periodName || ''
      if (item.orderDate && item.orderNumber) {
        item.orderDateNumber = `${dateService.formatDate(item.orderDate)}, ${item.orderNumber}`
      } else {
        item.orderDateNumber = ''
      }
    })
  }
  const attrsTableVacations = ['dateFrom', 'dateTo', 'vacationName', 'periodName', 'dayCount', 'orderDateNumber']
  setTableData(data, _.sortBy(vacations, ['dateFrom', 'dateTo']), attrsTableVacations, 'vacation', vacations.length + 2, ['dateFrom', 'dateTo'])

  // Addons 5
  requestAttrs = ['ID', 'employeeID', 'countryID.name', 'dateFrom', 'dateTo', 'orderID.description']
  const missions = UB.Repository('hr_employeeMission')
    .attrs(requestAttrs)
    .where('employeeID', '=', params.instanceID)
    .where('isInsideCountry', '=', false)
    .where('employeeNumberID', '=', curTabNumID)
    .where('mi_deleteDate', '>=', '#maxdate')
    .selectAsObject()
  setTableData(data, missions, requestAttrs, 'mission', missions.length + 2, ['dateFrom', 'dateTo'])

  // Addons 6
  requestAttrs = ['ID', 'employeeID', 'dictBonusID.name', 'docNumber', 'docIssuedDate']
  const bonus = UB.Repository('hr_employeeBonus')
    .attrs(requestAttrs)
    .where('employeeID', '=', params.instanceID)
    // .where('employeeNumberID', '=', curTabNumID)
    .where('mi_deleteDate', '>=', '#maxdate')
    .selectAsObject({
      'dictBonusID.name': 'name'
    })
  if (bonus && bonus.length) {
    bonus.forEach(item => {
      item.periodName = item.periodName || ''
      if (item.docNumber || item.docIssuedDate) {
        item.docInfo = UB.i18n(`Наказ{0}{1}`, item.docNumber ? ' № ' + item.docNumber : '', item.docIssuedDate ? ' від ' + dateService.formatDate(item.docIssuedDate) : '')
      } else {
        item.docInfo = ''
      }
    })
  }

  requestAttrs = ['name', 'docInfo']
  setTableData(data, bonus, requestAttrs, 'bonus', bonus.length + 2)

  // Addons 7
  requestAttrs = ['ID', 'employeeID', 'dictPenaltyReasonID.name', 'dictPenaltyID.name', 'docIssuedDate', 'dateClosed']
  const penalty = UB.Repository('hr_employeePenalty')
    .attrs(requestAttrs)
    .where('employeeID', '=', params.instanceID)
    // .where('employeeNumberID', '=', curTabNumID)
    .where('mi_deleteDate', '>=', '#maxdate')
    .selectAsObject({
      'dictPenaltyReasonID.name': 'reason',
      'dictPenaltyID.name': 'name'
    })

  requestAttrs = ['reason', 'name', 'docIssuedDate', 'dateClosed']
  setTableData(data, penalty, requestAttrs, 'penalty', penalty.length + 2, ['docIssuedDate', 'dateClosed'])

  const result = docxService.generateDocxDocument({
    templatePath: path.join(templatePath, 'dergSlugOsobovaKartka.docx'),
    fileName: sFileName,
    data,
    entityName: 'hr_employee',
    ID: params.instanceID,
    withImage: true,
    imageAttr: 'photo'
  })

  const docs = [
    {
      fileContent: JSON.stringify(result.stringContent),
      fileName: sFileName
    }
  ]

  return JSON.stringify(docs)
}

function empOrderCommitment (params, templatePath) {
  const data = {}
  let sFileName = 'Unknown'

  let requestAttrs = ['respEmployeePositionID.positionID.fullNameDat', 'respEmployeePositionID.employeeID.datName',
    'respEmployeePositionID.positionID.fullName', 'respEmployeePositionID.employeeID.fullFIO']
  const respEmployee = UB.Repository('hr_empOrder')
    .attrs(requestAttrs)
    .where('respEmployeePositionID.positionID.mi_dateFrom', '<=', params.onDate)
    .where('respEmployeePositionID.positionID.mi_dateTo', '>=', params.onDate)
    .where('respEmployeePositionID.positionID.mi_deleteDate', '>=', '#maxdate')
    .where('respEmployeePositionID.positionID.state', '=', 'ACTIVE')
    .selectById(params.instanceID)

  if (respEmployee && respEmployee['respEmployeePositionID.positionID.fullNameDat']) {
    data.respPosition = respEmployee['respEmployeePositionID.positionID.fullNameDat']
  } else if (respEmployee && respEmployee['respEmployeePositionID.positionID.fullName']) {
    data.respPosition = respEmployee['respEmployeePositionID.positionID.fullName']
  } else {
    data.respPosition = ''
  }

  if (respEmployee && respEmployee['respEmployeePositionID.employeeID.datName']) {
    data.respEmployee = respEmployee['respEmployeePositionID.employeeID.datName']
  } else if (respEmployee && respEmployee['respEmployeePositionID.employeeID.fullFIO']) {
    data.respEmployee = respEmployee['respEmployeePositionID.employeeID.fullFIO']
  } else {
    data.respEmployee = ''
  }

  requestAttrs = ['firstName', 'lastName', 'middleName', 'positionID.fullName']
  const employees = UB.Repository('hr_empOrderDet')
    .attrs(requestAttrs)
    .where('orderID', '=', params.instanceID)
    .selectAsObject()

  const docs = []

  let empFullFIO = ''
  employees.forEach(item => {
    if (item['middleName']) {
      sFileName = UB.i18n(`Зобов'язання {0} {1}.{2}`, item.lastName, item['firstName'].charAt(0).toUpperCase(), item['middleName'].charAt(0).toUpperCase())
      empFullFIO = `${item.lastName} ${item.firstName} ${item.middleName}`
    } else {
      sFileName = UB.i18n(`Зобов'язання {0} {1}`, item.lastName, item['firstName'].charAt(0).toUpperCase())
      empFullFIO = `${item.lastName} ${item.firstName}`
    }
    data['empFullFIO1'] = empFullFIO.slice(0, 26)
    data['empFullFIO2'] = empFullFIO.slice(26)

    if (item['positionID.fullName']) {
      data['empPositionFullName1'] = item['positionID.fullName'].slice(0, 26)
      data['empPositionFullName2'] = item['positionID.fullName'].slice(26, 52)
      data['empPositionFullName3'] = item['positionID.fullName'].slice(52)
    } else {
      data['empPositionFullName1'] = ''
      data['empPositionFullName2'] = ''
      data['empPositionFullName3'] = ''
    }

    const result = docxService.generateDocxDocument({
      templatePath: path.join(templatePath, 'empOrderCommitment.docx'),
      fileName: sFileName,
      data,
      entityName: 'hr_empOrder',
      ID: params.instanceID
    })

    docs.push(
      {
        fileContent: JSON.stringify(result.stringContent),
        fileName: sFileName
      })
  })

  return JSON.stringify(docs)
}

function empOrderOath (params, templatePath) {
  const data = {}
  let sFileName = 'Unknown'

  const requestAttrs = ['firstName', 'lastName', 'middleName']
  const employees = UB.Repository('hr_empOrderDet')
    .attrs(requestAttrs)
    .where('orderID', '=', params.instanceID)
    .selectAsObject()

  const docs = []
  employees.forEach(item => {
    if (item['middleName']) {
      sFileName = UB.i18n(`Присяга {0} {1}.{2}`, item.lastName, item['firstName'].charAt(0).toUpperCase(), item['middleName'].charAt(0).toUpperCase())
      data.fullFIO = `${item.lastName} ${item.firstName} ${item.middleName}`
    } else {
      sFileName = UB.i18n(`Присяга {0} {1}`, item.lastName, item['firstName'].charAt(0).toUpperCase())
      data.fullFIO = `${item.lastName} ${item.firstName}`
    }

    const result = docxService.generateDocxDocument({
      templatePath: path.join(templatePath, 'empOrderOath.docx'),
      fileName: sFileName,
      data,
      entityName: 'hr_empOrder',
      ID: params.instanceID
    })

    docs.push(
      {
        fileContent: JSON.stringify(result.stringContent),
        fileName: sFileName
      })
  })

  return JSON.stringify(docs)
}

function osobovaKartka (params, templatePath) {
  const data = {}
  let sFileName = 'Unknown'

  // employee general 5, 6, 8, 9, 10, 11, 12, 13, 14
  let requestAttrs = ['firstName', 'lastName', 'middleName', 'photo', 'shortFIO',
    'sexType.name', 'taxCode', 'dayBirthDate', 'monthBirthDate', 'yearBirthDate',
    'citizenshipID.name', 'dictMaritalStatusKindID.name']
  let ignoreAttrs = ['shortFIO']
  const employee = UB.Repository('hr_employee')
    .attrs(requestAttrs)
    .selectById(params.instanceID)
  setData(data, employee, requestAttrs, ignoreAttrs)

  if (employee) {
    sFileName = employee.shortFIO
    if (employee.photo) {
      data.image = ''
      data.photo = ''
    } else {
      data.photo = 'мiсце для фотокартки'
    }

    if (employee['sexType.name']) {
      data['sexType.name'] = employee['sexType.name'].toLowerCase()
    }
  }

  const organizationID = params.orgID
  const curTabNumID = params.tabNumID

  // organization 1,2, tabNum 4
  requestAttrs = ['ID', 'employeeID', 'organizationID', 'organizationID.name', 'organizationID.EDRPOUCode', 'dateFrom', 'dateTo',
    'employeeNumberID', 'employeeNumberID.tabNum', 'orderID', 'orderID.orderNumber']
  const organization = UB.Repository('hr_employeePositionS')
    .attrs(requestAttrs)
    .where('employeeID', '=', params.instanceID)
    // .where('dateFrom', '<=', params.onDate)
    // .where('dateTo', '>=', params.onDate)
    .where('organizationID', '=', organizationID)
    .where('employeeNumberID', '=', curTabNumID)
    .orderBy('dateFrom', 'desc')
    .limit(1)
    .selectSingle()
  setData(data, organization, ['organizationID.name', 'organizationID.EDRPOUCode', 'employeeNumberID.tabNum'])

  // start work date 3, 28, worker type 7
  requestAttrs = ['dateFrom', 'workerType']
  const empPosStart = UB.Repository('hr_employeePositionS')
    .attrs(requestAttrs)
    .where('employeeID', '=', params.instanceID)
    .where('organizationID', '=', organizationID)
    .where('mi_deleteDate', '>=', '#maxdate')
    .where('isActive', '=', 1)
    .orderBy('dateFrom', 'asc')
    .limit(1)
    .selectSingle()
  // set workExp date
  const sDateFrom = empPosStart && empPosStart['dateFrom'] ? empPosStart['dateFrom'] : null
  setParseDate(data, sDateFrom, 'workExp')

  // set fillDateFrom
  data['fillDateFrom'] = empPosStart && empPosStart['dateFrom'] ? dateService.formatDate(empPosStart['dateFrom']) : ''

  // set workerType
  let workerType = ''
  if (empPosStart && empPosStart['workerType']) {
    if (empPosStart['workerType'] === '1') {
      workerType = 'основна'
    } else {
      workerType = 'за сумісництвом'
    }
  }
  data['workerType'] = workerType

  // employeeWorkbook 26,27, 30
  requestAttrs = ['workPlace', 'workPosition', 'dateTo', 'employeePositionID', 'employeePositionID.organizationID',
    'dischargeReason', 'employeePositionID.workerType.name']
  ignoreAttrs = ['employeeID', 'dateTo']
  let work = null
  if (sDateFrom) {
    const work1 = UB.Repository('hr_employeeWorkbook')
      .attrs(requestAttrs)
      .where('employeeID', '=', params.instanceID)
      .where('employeePositionID', 'isNull')
      .where('dateTo', '<=', sDateFrom)
      .orderBy('dateTo', 'desc')
      .limit(1)
      .selectSingle()

    const work2 = UB.Repository('hr_employeeWorkbook')
      .attrs(requestAttrs)
      .where('employeeID', '=', params.instanceID)
      .where('employeePositionID', 'isNotNull')
      .where('employeePositionID.organizationID', 'isNotNull')
      .where('employeePositionID.workPlace', '!=', '2', 'work_place1')
      .where('employeePositionID.workPlace', '!=', '3', 'work_place')
      .logic('(([work_place1]) and ([work_place]))')
      .where('dateTo', '<=', sDateFrom)
      .orderBy('dateTo', 'desc')
      .limit(1)
      .selectSingle()

    if (work1 && work2) {
      const work1Date = new Date(work1['dateTo'])
      const work2Date = new Date(work2['dateTo'])
      work = work1Date > work2Date ? work1 : work2
    } else if (work1 && !work2) {
      work = work1
    } else if (!work1 && work2) {
      work = work2
    }
  }

  requestAttrs = ['workPlace', 'workPosition', 'dischargeReason']
  setData(data, work, requestAttrs, ignoreAttrs)

  const sLastDateTo = work && work['dateTo'] ? work['dateTo'] : null
  setParseDate(data, sLastDateTo, 'lastWork')

  // experience 29
  requestAttrs = ['employeeID', 'dictExperienceID.name', 'calcDate']
  let experienceRes = null

  if (curTabNumID) {
    experienceRes = UB.Repository('hr_employeeExperience')
      .attrs(requestAttrs)
      .where('employeeID', '=', params.instanceID)
      // .where('dictExperienceID.code', '=', 1)
      .where('dictExperienceID.methodExpID.code', '=', 1)
      .where('dictExperienceID.mi_deleteDate', '>=', '#maxdate')
      .where('dictExperienceID.methodExpID.mi_deleteDate', '>=', '#maxdate')
      .where('employeeNumberID', '=', params.tabNumID, 'empNum')
      .where('employeeNumberID', 'isNull', undefined, 'empNumNull')
      .logic('([empNum] OR [empNumNull])')
      .orderByDesc('employeeNumberID')
      .limit(1)
      .selectSingle()
  }
  requestAttrs = ['days', 'months', 'years']
  const experience = {}
  requestAttrs.forEach(attr => { experience[attr] = '0' })

  if (experienceRes && experienceRes['calcDate']) {
    const ymd = dateService.getYmd(experienceRes.calcDate, sDateFrom || params.onDate, true)
    experience['days'] = ymd.days + ''
    experience['months'] = ymd.months + ''
    experience['years'] = ymd.years + ''
  }
  setData(data, experience, requestAttrs)

  // familyMembers 33,34,35
  requestAttrs = ['employeeID', 'dictKinshipKindID.name', 'peopleID.fullFIO', 'peopleID.birthDate']
  const familyMembers = UB.Repository('hr_employeeFamily')
    .attrs(requestAttrs)
    .where('employeeID', '=', params.instanceID)
    .selectAsObject()
  if (familyMembers) {
    changeDateToYear(familyMembers, 'peopleID.birthDate')
  }
  setTableData(data, familyMembers, requestAttrs, 'familyMembers', 4)

  // fact address 36
  requestAttrs = ['ownerID', 'address', 'addressType']
  const factAddress = UB.Repository('ac_address')
    .attrs(requestAttrs)
    .where('ownerID', '=', params.instanceID)
    .where('addressType', '=', '1')
    .limit(1)
    .selectSingle()
  data['addressFact'] = factAddress && factAddress['address'] ? factAddress['address'] : ''

  // legal address 37
  requestAttrs = ['ownerID', 'address', 'addressType']
  const legalAddress = UB.Repository('ac_address')
    .attrs(requestAttrs)
    .where('ownerID', '=', params.instanceID)
    .where('addressType', '=', '2')
    .limit(1)
    .selectSingle()
  if (legalAddress && legalAddress['address']) {
    data['addressLegal1'] = legalAddress['address'].slice(0, 68)
    data['addressLegal2'] = legalAddress['address'].slice(68)
  } else {
    data['addressLegal1'] = ''
    data['addressLegal2'] = ''
  }

  // education 15, 16, 17, 18, 19, 20, 21,    22, 23, 24, 25
  requestAttrs = ['ID', 'employeeID', 'dictEducationLevelID.educationKind', 'dictEducationLevelID.name', 'educationName', 'dateTo', 'dictDocKindID.name', 'docNumber',
    'educationForm.name', 'dictSpecialtyID.name', 'qualification', 'dictDegreeID.name']
  const baseEducation = UB.Repository('hr_employeeEducation')
    .attrs(requestAttrs)
    .where('employeeID', '=', params.instanceID)
    .where('dictEducationLevelID.educationKind', '=', '1')
    .selectAsObject()

  if (baseEducation) {
    baseEducation.forEach(item => {
      item['docDate'] = item['dateTo']
    })
    changeDateToYear(baseEducation, 'docDate')
  }

  const attrsTableBaseEducation1 = ['educationName', 'docNumber', 'docDate']
  setTableData(data, baseEducation, attrsTableBaseEducation1, 'baseEducation1', 4)

  const attrsTableBaseEducation2 = ['dictSpecialtyID.name', 'qualification', 'educationForm.name']
  setTableData(data, baseEducation, attrsTableBaseEducation2, 'baseEducation2', 4)

  const afterEducation = UB.Repository('hr_employeeEducation')
    .attrs(requestAttrs)
    .where('employeeID', '=', params.instanceID)
    .where('dictEducationLevelID.educationKind', '=', '2')
    .selectAsObject()
  if (afterEducation) {
    afterEducation.forEach(item => {
      item['docDate'] = item['dateTo']
    })
    changeDateToYear(afterEducation, 'docDate', 'Year')
    for (const value of afterEducation) {
      if (value['docNumber'] && value['docDate']) {
        value['docNumber'] = value['docNumber'] + ', '
      }
    }
  }
  const attrsTableAfterEducation = ['educationName', 'docNumber', 'docDate', 'docDateYear', 'dictDegreeID.name']
  setTableData(data, afterEducation, attrsTableAfterEducation, 'afterEducation', 4, ['docDate'])

  // passport 38 -41
  requestAttrs = ['ID', 'employeeID', 'dictDocKindID.name', 'docSeries', 'docNumber', 'docIssued', 'docIssuedDate', 'state']
  ignoreAttrs = ['ID', 'employeeID', 'state']
  const passport = UB.Repository('hr_employeeDocs')
    .attrs(requestAttrs)
    .where('employeeID', '=', params.instanceID)
    .where('dictDocKindID.docType.name', 'in', ['Паспорт', 'паспорт', 'ПАСПОРТ'])
    .where('state', '=', '1')
    .limit(1)
    .selectSingle()
  if (passport) {
    if (passport['docIssued']) {
      passport['docIssued1'] = passport['docIssued'].slice(0, 16)
      passport['docIssued2'] = passport['docIssued'].slice(16)
    }
    if (passport['docIssuedDate']) {
      passport['docIssuedDate'] = dateService.formatDate(passport['docIssuedDate'])
    }
  }
  requestAttrs = ['dictDocKindID.name', 'docSeries', 'docNumber', 'docIssued1', 'docIssued2', 'docIssuedDate']
  setData(data, passport, requestAttrs)

  // profEducation
  requestAttrs = ['ID', 'employeeID', 'dictEducationLevelID.educationKind', 'educationName', 'dateFrom', 'dateTo', 'dictDocKindID.name',
    'educationForm.name']
  ignoreAttrs = ['employeeID', 'dictEducationLevelID.name']
  const profEducation = UB.Repository('hr_employeeEducation')
    .attrs(requestAttrs)
    .where('employeeID', '=', params.instanceID)
    .where('dictEducationLevelID.educationKind', '=', '3')
    .selectAsObject()
  const attrsTableProfEducation = ['educationName', 'dateFrom', 'dateTo', 'dictDocKindID.name', 'educationForm.name']

  // из трудовой книжки брать такие записи, у которых "у которых Створений автоматично " = "Ні"  и организация = поточна организация и запись относится
  // к блоку записей последнего назначения в эту организацию, который вычислим по флажку "Э призначенням"
  const appointmentsLastDate = UB.Repository('hr_employeeWorkbook')
    .attrs('dateFrom')
    .where('employeeID', '=', params.instanceID)
    .where('organizationID', '=', organizationID)
    .where('isOrgAppoint', '=', 1)
    .orderBy('dateFrom', 'desc')
    .selectScalar()

  requestAttrs = ['ID', 'employeeID', 'appointOrder', 'dateFrom', 'workPosition', 'dictProfessionID.code']
  const appointWB = appointmentsLastDate ? UB.Repository('hr_employeeWorkbook')
    .attrs(requestAttrs)
    .where('employeeID', '=', params.instanceID)
    .where('organizationID', '=', organizationID)
    .where('isAuto', '=', 0)
    .where('dateFrom', '>=', appointmentsLastDate)
    .orderBy('dateFrom')
    .selectAsObject() : []

  appointWB.forEach(item => {
    item.orderDescription = item.appointOrder || ''
    item.positionName = item.workPosition || ''
    item.professionCode = item['dictProfessionID.code'] || ''
    item.departmentName = ''
    item.accrualSum = ''
  })

  requestAttrs = ['ID', 'employeeID', 'employeeID.sexType', 'dateFrom', 'depName', 'positionID', 'dictPositionID',
    'accrualSum', 'payElID.name', 'orderID', 'orderID.orderDate', 'orderID.orderNumber']
  const useActualPositionName = settingsService.getByCode('hrOrderActualPositionName', organizationID) === true
  const useSexType = settingsService.getByCode('hrUseSexTypeInOrders', params.orgID) === true
  if (useActualPositionName) {
    requestAttrs.push('dictPositionID.nameNom')
    if (useSexType) {
      requestAttrs.push('dictPositionID.nameNomF')
    }
    requestAttrs.push('dictPositionID.name')
    requestAttrs.push('dictEmpCategoryID.genName')
    requestAttrs.push('dictEmpCategoryID.name')
    requestAttrs.push('posNameAddition')
  }

  let appointments = UB.Repository('hr_employeePositionS')
    .attrs(requestAttrs)
    .where('employeeID', '=', params.instanceID)
    .where('employeeNumberID', '=', curTabNumID)
    .where('organizationID', '=', organizationID)
    .where('orderID.empOrderType', 'in', ['APPOINT_MOVE', 'APPOINT', 'MOVE', 'APPOINT_LIQ', 'CANCELDISM', 'PLURALIST'])
    .where('orderID.orderState', 'in', ['POSTED', 'PROCESSED'])
    .where('orderID.mi_deleteDate', '>=', '#maxdate')
    .where('payElID.mi_deleteDate', '>=', '#maxdate')
    .orderBy('dateFrom', 'asc')
    .selectAsObject({
      'depName': 'departmentName'
    }) || []

  const professionCodes = {}
  appointments.forEach(item => {
    if (item['orderID.orderDate'] && item['orderID.orderNumber']) {
      item.orderDescription = UB.i18n(`{0} вiд {1}`, item['orderID.orderNumber'], dateService.formatDate(item['orderID.orderDate']))
    } else {
      item.orderDescription = ''
    }
    item.accrualSum = item['payElID.name'] === 'Оклад' ? item.accrualSum : ''
    item.positionName = item.positionID ? getPositionInfo(useSexType && item['employeeID.sexType'] === 'W' ? ['nameNomF', 'nameNom', 'name'] : ['nameNom', 'name'], item.positionID, organizationID, item.dateFrom, 'mi_data_id') : ''

    if (useActualPositionName && item.dictPositionID) {
      const dictName = useSexType && item['employeeID.sexType'] === 'W'
        ? item['dictPositionID.nameNomF'] || item['dictPositionID.nameNom'] || item['dictPositionID.name']
        : item['dictPositionID.nameNom'] || item['dictPositionID.name']
      const pos = nameCaseService.removeDuplicateWords([dictName, item.posNameAddition, item['dictEmpCategoryID.genName'] || item['dictEmpCategoryID.name']].filter(Boolean).join(' ') || '')
      item.positionName = pos || item.positionName
    }

    if (professionCodes[item.dictPositionID]) {
      item.professionCode = professionCodes[item.dictPositionID]
    } else {
      item.professionCode = UB.Repository('hr_dictPosition')
        .attrs(['dictProfessionID.code'])
        .where('ID', '=', item.dictPositionID)
        .selectScalar() || ''
      professionCodes[item.dictPositionID] = item.professionCode
    }
  })
  const attrsTableAppointments = ['dateFrom', 'departmentName', 'positionName', 'professionCode', 'accrualSum', 'orderDescription']

  // vacations 64-68
  requestAttrs = ['ID', 'employeeID', 'employeeNumberID', 'dateFrom', 'dateTo', 'orderID.orderDate', 'orderID.orderNumber']
  let vacations = null
  if (curTabNumID) {
    vacations = UB.Repository('hr_empOrderVacationDet')
      .attrs(requestAttrs)
      .where('employeeID', '=', params.instanceID)
      .where('employeeNumberID', '=', curTabNumID)
      .selectAsObject()
  }

  let orderDateNumber = null
  if (vacations) {
    vacations.forEach(item => {
      // orderDateNumber
      if (item['orderID.orderDate'] && item['orderID.orderNumber']) {
        orderDateNumber = UB.i18n(`{0} вiд {1}`, item['orderID.orderNumber'], dateService.formatDate(item['orderID.orderDate']))
      } else if (item['orderID.orderDate'] && !item['orderID.orderNumber']) {
        // orderDateNumber = dateService.formatDate(item['orderDate'])
      } else if (!item['orderID.orderDate'] && item['orderID.orderNumber']) {
        // orderDateNumber = vacations.orderNumber
      }
      // let orderDateNumber = vacations && vacations.orderDate && vacations.orderNumber ? `${vacations.orderNumber} вiд ${dateService.formatDate(vacations.orderDate)}` : null
      item['orderDateNumber'] = orderDateNumber

      // vacation type
      const vacationKind = UB.Repository('hr_empOrderVacationListDet')
        .attrs(['paraID', 'dictVacationKindID.name', 'empVacationPeriodID.description'])
        .where('paraID', '=', item['ID'])
        .limit(1)
        .selectSingle()

      item['vacationKind'] = vacationKind ? vacationKind['dictVacationKindID.name'] : null
      item['vacationPeriod'] = vacationKind ? vacationKind['empVacationPeriodID.description'] : null
    })
  }

  const attrsTableVacations = ['dateFrom', 'dateTo', 'orderDateNumber', 'vacationKind', 'empVacationPeriod', 'vacationPeriod']

  let lenEdu = 13
  let lenApp = 12
  let lenVac = 18
  appointments = appointWB.concat(appointments)
  if (profEducation.length || appointments.length || vacations.length) {
    lenEdu = profEducation.length > 5 ? profEducation.length + 1 : 9
    lenApp = appointments.length > 4 ? appointments.length + 1 : 8
    lenVac = vacations.length > 7 ? vacations.length + 1 : 14
  }
  setTableData(data, profEducation, attrsTableProfEducation, 'profEducation', lenEdu, ['dateFrom', 'dateTo'])
  setTableData(data, appointments, attrsTableAppointments, 'appointment', lenApp, ['dateFrom'])
  setTableData(data, vacations, attrsTableVacations, 'vacation', lenVac, ['dateFrom', 'dateTo'])

  // firing 70
  requestAttrs = ['ID', 'employeeID', 'dateFrom', 'dictReasonDismID.name']
  let firing = null
  if (curTabNumID) {
    firing = UB.Repository('hr_empOrderDismDet')
      .attrs(requestAttrs)
      .where('employeeID', '=', params.instanceID)
      .where('employeeNumberID', '=', curTabNumID)
      .limit(1)
      .selectSingle()
  }

  if (firing && firing['dateFrom'] && firing['dictReasonDismID.name']) {
    data['firing'] = `${dateService.formatDate(firing['dateFrom'])}, ${firing['dictReasonDismID.name']}`
  } else if (firing && !firing['dateFrom'] && firing['dictReasonDismID.name']) {
    data['firing'] = firing['dictReasonDismID.name']
  } else if ((firing && firing['dateFrom'] && !firing['dictReasonDismID.name'])) {
    data['firing'] = dateService.formatDate(firing['dateFrom'])
  } else {
    data['firing'] = ''
  }

  // military   (42), 43, 44, 45, 46, 47, 48, 49, 50
  // firing 70
  requestAttrs = ['ID', 'employeeID', 'dictMilitaryRankID.name', 'dictCategMilitaryID.name', 'dictMilitarySpecialityID.name',
    'dictMilitarySuitableID.name', 'office', 'dictStateMilitaryID.code', 'groupAccounting.name', 'composition.name', 'officeFact']
  let military = null
  if (curTabNumID) {
    military = UB.Repository('hr_empStateMilitary')
      .attrs(requestAttrs)
      .where('employeeID', '=', params.instanceID)
      .limit(1)
      .selectSingle()
  }
  requestAttrs = ['dictMilitaryRankID.name', 'dictMilitarySpecialityID.name', 'dictMilitarySuitableID.name', 'office',
    'groupAccounting.name', 'composition.name', 'officeFact']
  setData(data, military, requestAttrs)

  if (military && military['dictCategMilitaryID.name']) {
    data['dictCategMilitary1'] = military['dictCategMilitaryID.name'].slice(0, 26)
    data['dictCategMilitary2'] = military['dictCategMilitaryID.name'].slice(26)
  } else {
    data['dictCategMilitary1'] = ''
    data['dictCategMilitary2'] = ''
  }

  if (military && military['office']) {
    data['office1'] = military['office'].slice(0, 10)
    data['office2'] = military['office'].slice(10)
  } else {
    data['office1'] = ''
    data['office2'] = ''
  }

  if (military && military['dictStateMilitaryID.code']) {
    if (military['dictStateMilitaryID.code'] === '04') {
      data.specMilitary = 'Так'
    } else {
      data.specMilitary = 'Нi'
    }
  } else {
    data.specMilitary = ''
  }

  const result = docxService.generateDocxDocument({
    templatePath: path.join(templatePath, 'osobovaKartka.docx'),
    fileName: sFileName,
    data,
    entityName: 'hr_employee',
    ID: params.instanceID,
    withImage: true,
    imageAttr: 'photo'
  })

  const docs = [
    {
      fileContent: JSON.stringify(result.stringContent),
      fileName: sFileName
    }
  ]

  return JSON.stringify(docs)
}

function agreementProcessingData (params, templatePath) {
  const data = {}
  let sFileName = 'Згода '

  let requestAttrs = ['fullFIO', 'shortFIO', 'birthDate', 'sexType']
  let ignoreAttrs = ['shortFIO', 'sexType']
  const employee = UB.Repository('hr_employee')
    .attrs(requestAttrs)
    .selectById(params.instanceID)
  setData(data, employee, requestAttrs, ['birthDate'], ignoreAttrs)
  if (employee) {
    sFileName += employee.shortFIO
  }
  data.birthInfo = employee.sexType === 'W' ? 'народилась' : 'народився'

  requestAttrs = ['ID', 'employeeID', 'dictDocKindID.name', 'docSeries', 'docNumber', 'docIssued', 'docIssuedDate', 'state']
  ignoreAttrs = ['ID', 'employeeID', 'state']
  const passport = UB.Repository('hr_employeeDocs')
    .attrs(requestAttrs)
    .where('employeeID', '=', params.instanceID)
    .where('dictDocKindID.docType.name', 'in', ['Паспорт', 'паспорт', 'ПАСПОРТ'])
    .where('state', '=', '1')
    .limit(1)
    .selectSingle()
  if (passport) {
    if (passport['docIssuedDate']) {
      passport['docIssuedDate'] = dateService.formatDate(passport['docIssuedDate'])
    }
  }

  requestAttrs = ['dictDocKindID.name', 'docSeries', 'docNumber', 'docIssued', 'docIssuedDate']
  setData(data, passport, requestAttrs)

  data.issuedText = [data.docIssued ? '' : 'ким', data.docIssuedDate ? '' : 'коли'].filter(Boolean).join(', ')
  data.issuedText = data.issuedText ? ` (${data.issuedText})` : ''

  data.fullFIO = data.fullFIO ? data.fullFIO.trim() : '_'.repeat(30)
  data.birthDate = data.birthDate || '_'.repeat(10)
  data['dictDocKindID.name'] = data['dictDocKindID.name'] || '_'.repeat(20)
  data.docSeries = data.docSeries || '_'.repeat(4)
  data.docNumber = data.docNumber || '_'.repeat(10)
  data.docIssued = data.docIssued || '_'.repeat(30)
  data.docIssuedDate = data.docIssuedDate || '_'.repeat(10)

  const result = docxService.generateDocxDocument({
    templatePath: path.join(templatePath, 'agreement.docx'),
    fileName: sFileName,
    data,
    entityName: 'hr_employee',
    ID: params.instanceID
  })

  const docs = [{
    fileContent: JSON.stringify(result.stringContent),
    fileName: sFileName
  }]

  return JSON.stringify(docs)
}
function setParseDate (data, sOriginDate, attrsPrefix) {
  const suffixs = ['Day', 'Month', 'Year']
  const fullAttrNames = []
  suffixs.forEach(item => { fullAttrNames.push([`${attrsPrefix}${item}`]) })

  const parseDate = {}
  fullAttrNames.forEach(item => { parseDate[item] = null })
  if (sOriginDate) {
    const aDate = new Date(sOriginDate)
    parseDate[fullAttrNames[0]] = aDate.getDate()
    parseDate[fullAttrNames[1]] = getMonthName(aDate.getMonth() + 1)
    parseDate[fullAttrNames[2]] = aDate.getFullYear()
  }
  setData(data, parseDate, fullAttrNames, [])
}

function setTableData (data, requestData, requestAttrs, tableName, minRowsCount, formatDateAttrs = [], needAddRows = true) {
  if (!data[tableName]) {
    data[tableName] = []
  }

  if (!requestData || requestData.length === 0) {
    for (let i = 0; i < minRowsCount; i++) {
      const obj = {}
      requestAttrs.forEach(item => {
        obj[item] = ' '
      })
      data[tableName].push(obj)
    }
  } else {
    let nAddRows = 0
    if (requestData.length >= minRowsCount) {
      nAddRows += 2
    } else if (requestData.length === minRowsCount - 1) {
      nAddRows++
    } else {
      nAddRows += minRowsCount - requestData.length
    }

    requestData.forEach(item => {
      const obj = {}
      requestAttrs.forEach(attr => {
        if (item[attr]) {
          obj[attr] = item[attr]
          if (formatDateAttrs.includes(attr)) {
            obj[attr] = !dateService.isMaxDate(item[attr]) ? dateService.formatDate(item[attr]) : ''
          }
        } else {
          obj[attr] = ''
        }
      })
      data[tableName].push(obj)
    })
    if (needAddRows) {
      for (let i = 0; i < nAddRows; i++) {
        const obj = {}
        requestAttrs.forEach(item => {
          obj[item] = ' '
        })
        data[tableName].push(obj)
      }
    }
  }
}

function setData (data, requestData, requestAttrs, formatDateAttrs = [], ignorAttrs = []) {
  if (!requestData) {
    requestData = {}
    requestAttrs.forEach(function (value) {
      requestData[value] = null
    })
  }

  requestAttrs.forEach(attr => {
    const ignore = ignorAttrs.find(el => el === attr)
    if (!ignore) {
      if (requestData[attr]) {
        data[attr] = requestData[attr]

        if (formatDateAttrs.includes(attr)) {
          data[attr] = dateService.formatDate(requestData[attr])
        }

        if (attr === 'monthBirthDate') {
          data[attr] = getMonthName(requestData[attr])
        }
      } else {
        data[attr] = ''
      }
    }
  })
}

function getMonthName (numberMonth) {
  const months = ['сiчня', 'лютого', 'березня', 'квiтня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня']
  return months[numberMonth - 1]
}

function changeDateToYear (arr, attrName, suffixName = '') {
  arr.forEach(item => {
    if (item[attrName]) {
      item[attrName + suffixName] = new Date(item[attrName]).getFullYear()
    }
  })
}

function getSliceStrArr (strData, arrLength) {
  const re = /\s(\S*)$/
  const res = []
  const resFull = []
  let start = 0
  let end = 0
  let failedReg = 0

  for (let i = 0; i < arrLength.length; i++) {
    end = arrLength[i] + start
    let str = strData.slice(start, end + 1)

    if (str.length < arrLength[i] + 1) {
      start = strData.length
      end = strData.length + 1
      res.push(str)
      continue
    }

    const arrRegResult = re.exec(str)
    if (arrRegResult) {
      if (arrRegResult[1].length === 0) {
        str = strData.slice(start, end)
        res.push(str)
        start = end + 1
      }
      if (arrRegResult[1].length > 0) {
        end = end - (str.length - arrRegResult['index'] - 1)
        str = strData.slice(start, end)
        res.push(str)
        start = end + 1
      }
    } else {
      res.push('')
      failedReg++
    }
  }
  if (failedReg > 1) {
    arrLength.forEach(len => {
      end = len + start
      const str = strData.slice(start, end)
      resFull.push(str)
      start = end
    })
    resFull.push(strData.slice(start))
    return resFull
  } else {
    res.push(strData.slice(start))
    return res
  }
}

function uncap (str) {
  return typeof str === 'string' ? str.charAt(0).toLowerCase() + str.slice(1) : str
}

function cap (str) {
  return typeof str === 'string' ? str.charAt(0).toUpperCase() + str.slice(1) : str
}

function getPositionInfo (fieldListPosition, positionID, organizationID, onDate, fieldName = 'ID') {
  let positionName = ''
  for (let k = 0; k < 2; k++) {
    const posInfo = UB.Repository('hr_position')
      .attrs(fieldListPosition)
      .whereIf(organizationID, 'orgID', '=', organizationID)
      .where('state', '=', 'ACTIVE')
      .where('mi_deleteDate', '>=', '#maxdate')
      .where(fieldName, '=', positionID || 0)
    if (k === 0) {
      posInfo
        .where('mi_dateFrom', '<=', onDate)
        .where('mi_dateTo', '>=', onDate)
    } else {
      posInfo
        .misc({ __mip_recordhistory_all: true })
        .orderBy('mi_dateFrom', 'desc')
        .orderBy('mi_dateTo', 'desc')
    }
    const posInfoData = posInfo.limit(1).selectSingle()
    if (posInfoData) {
      fieldListPosition.forEach(el => {
        if (!positionName) {
          positionName = posInfoData[el] || ''
        }
      })
      k = 2
    }
  }
  return positionName
}
