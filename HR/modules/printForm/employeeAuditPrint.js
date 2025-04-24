const UB = require('@unitybase/ub')
const App = UB.App
const argv = require('@unitybase/base').argv
const path = require('path')
const docxService = require('../../../AC/modules/documentBuilder/docxService')
const dateService = require('../../../AC/modules/dataServices/dateService')
const Session = require('@unitybase/ub').Session
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
    case 'zgodaProvedSpecPerev':
      return zgodaProvedSpecPerev(params, templatePath)
    case 'zapitPerevVidom':
      return zapitPerevVidom(params, templatePath)
    case 'dovidkaResultSpecPerev':
      return dovidkaResultSpecPerev(params, templatePath)
    case 'zapitProvedPerev':
      return zapitProvedPerev(params, templatePath)
    case 'povidPochatokPerev':
      return povidPochatokPerev(params, templatePath)
    case 'dovidkaResultPerev':
      return dovidkaResultPerev(params, templatePath)
  }
}

function zgodaProvedSpecPerev (params, templatePath) {
  const data = {}
  let sFileName = 'Згода на проведення спеціальної перевірки'

  // employee general 1,2
  let requestAttrs = ['fullFIO', 'shortFIO', 'birthDate', 'taxCode', 'birthPlace']
  const ignoreAttrs = ['shortFIO']
  const employee = UB.Repository('hr_employee')
    .attrs(requestAttrs)
    .selectById(params.employeeID)
  setData(data, employee, requestAttrs, ['birthDate'], ignoreAttrs)
  data['positionName'] = getPositionInfo(['fullNameGen', 'fullName', 'name'], params.positionID, params.orgID, params.controlDate || params.onDate)

  if (employee) {
    sFileName = `${employee.shortFIO} ${sFileName}`
  }

  // fact address 5
  requestAttrs = ['ownerID', 'address', 'addressType']
  const factAddress = UB.Repository('ac_address')
    .attrs(requestAttrs)
    .where('ownerID', '=', params.employeeID)
    .where('addressType', '=', '1')
    .limit(1)
    .selectSingle()
  if (factAddress && factAddress['address']) {
    const arr = getSliceStrArr(factAddress['address'], [55])
    data['factAddress1'] = arr[0] || ''
    data['factAddress2'] = arr[1] || ''
  } else {
    data['factAddress1'] = ''
    data['factAddress2'] = ''
  }

  // legal address 4
  requestAttrs = ['ownerID', 'address', 'addressType']
  const legalAddress = UB.Repository('ac_address')
    .attrs(requestAttrs)
    .where('ownerID', '=', params.employeeID)
    .where('addressType', '=', '2')
    .limit(1)
    .selectSingle()
  if (legalAddress && legalAddress['address']) {
    const arr = getSliceStrArr(legalAddress['address'], [46])
    data['legalAddress1'] = arr[0] || ''
    data['legalAddress2'] = arr[1] || ''
  } else {
    data['legalAddress1'] = ''
    data['legalAddress2'] = ''
  }

  // organization 8
  data['organization'] = getOrganizationInfo(['nameGen', 'name'], params.orgID, params.controlDate || params.onDate)
  if (data['organization']) {
    const arr = getSliceStrArr(data['organization'], [75])
    data['organization1'] = arr[0] || ''
    data['organization2'] = arr[1] || ''
  } else {
    data['organization1'] = ''
    data['organization2'] = ''
  }

  data['ingoingDate'] = params.ingoingDate

  const result = docxService.generateDocxDocument({
    templatePath: path.join(templatePath, 'zgodaProvedSpecPerev.docx'),
    fileName: sFileName,
    data,
    entityName: 'hr_employeeDocAuditDt',
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

function zapitPerevVidom (params, templatePath) {
  const data = {}
  // organization 2
  data['organization'] = getOrganizationInfo(['nameGen', 'name'], params.orgID, params.controlDate || params.onDate)

  // post address orginization
  let requestAttrs = ['address']
  let orgNameAdress = data['organization']
  const postOrgAddress = UB.Repository('ac_address')
    .attrs(requestAttrs)
    .where('ownerID', '=', params.orgID)
    .where('addressType', '=', '3')
    .limit(1)
    .selectSingle()
  if (postOrgAddress) {
    if (orgNameAdress) {
      orgNameAdress += `, ${postOrgAddress['address']}`
    } else {
      orgNameAdress += postOrgAddress['address']
    }
  }
  const arr = getSliceStrArr(orgNameAdress, [87])
  data['organizationNameAdress1'] = arr[0] || ''
  data['organizationNameAdress2'] = arr[1] || ''

  // employee general 4
  requestAttrs = ['fullFIO', 'shortFIO', 'accusativeName', 'birthDate', 'taxCode', 'birthPlace']
  const ignoreAttrs = ['shortFIO', 'accusativeName']
  const employee = UB.Repository('hr_employee')
    .attrs(requestAttrs)
    .selectById(params.employeeID)
  setData(data, employee, requestAttrs, ['birthDate'], ignoreAttrs)
  data['accFullFIO'] = employee['accusativeName'] || employee['fullFIO'] || ''

  // if (employee) {
  //  sFileName = `${employee.shortFIO} ${sFileName}`
  // }

  // legal address 9
  requestAttrs = ['address']
  const legalAddress = UB.Repository('ac_address')
    .attrs(requestAttrs)
    .where('ownerID', '=', params.employeeID)
    .where('addressType', '=', '2')
    .limit(1)
    .selectSingle()
  data['legalAddress'] = legalAddress ? legalAddress['address'] : ''

  // fact address 10
  requestAttrs = ['address']
  const factAddress = UB.Repository('ac_address')
    .attrs(requestAttrs)
    .where('ownerID', '=', params.employeeID)
    .where('addressType', '=', '1')
    .limit(1)
    .selectSingle()
  if (factAddress) {
    if (legalAddress && legalAddress['address']) {
      data['factAddress'] = `, ${factAddress['address']}`
    } else {
      data['factAddress'] = factAddress['address']
    }
  } else {
    data['factAddress'] = ''
  }

  // passport 8
  requestAttrs = ['docSeries', 'docNumber', 'docIssued', 'docIssuedDate']
  const passport = UB.Repository('hr_employeeDocs')
    .attrs(requestAttrs)
    .where('employeeID', '=', params.employeeID)
    .where('dictDocKindID.name', '=', 'паспорт')
    .where('state', '=', '1')
    .limit(1)
    .selectSingle()
  let str = ''
  for (const item in passport) {
    str += `${item === 'docIssuedDate' ? dateService.formatDate(passport[item]) : passport[item]} `
  }
  data['passport'] = str

  // employeeWorkbook 26,27, 30
  requestAttrs = ['workPlace']
  let work = null
  const work1 = UB.Repository('hr_employeeWorkbook')
    .attrs(requestAttrs)
    .where('employeeID', '=', params.employeeID)
    // .where('employeePositionID', 'isNull')
    .orderBy('dateTo', 'desc')
    .limit(1)
    .selectSingle()

  const work2 = UB.Repository('hr_employeeWorkbook')
    .attrs(requestAttrs)
    .where('employeeID', '=', params.employeeID)
    // .where('employeePositionID', 'isNotNull')
    .where('employeePositionID.organizationID', 'isNotNull')
    .where('employeePositionID.workPlace', '!=', '2', 'work_place1')
    .where('employeePositionID.workPlace', '!=', '3', 'work_place')
    .logic('(([work_place1]) and ([work_place]))')
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
  setData(data, work, requestAttrs)

  // respPos, respFIO
  requestAttrs = ['positionID', 'positionID.name']
  const respPos = UB.Repository('hr_orgRespPosition')
    .attrs(requestAttrs)
    .where('mi_deleteDate', '>=', '#maxdate')
    .where('respPosition', '=', 'mainChief')
    .where('organizationID', '=', params.orgID)
    // .where('dateFrom', '<=', params.controlDate || params.onDate)
    // .where('dateTo', '>=', params.controlDate || params.onDate)
    .exists(UB.Repository('hr_position')
      .correlation('mi_data_id', 'positionID')
      .where('state', '=', 'ACTIVE')
      .where('mi_deleteDate', '>=', '#maxdate')
      .misc({
        __mip_ondate: params.controlDate || params.onDate
      })
    )
    .limit(1)
    .selectSingle()
  data['respPos'] = respPos ? respPos['positionID.name'] : ''

  if (respPos && respPos['positionID']) {
    requestAttrs = ['employeeID.shortFIO']
    const respFIO = UB.Repository('hr_employeePositionS')
      .attrs(requestAttrs)
      .where('mi_deleteDate', '>=', '#maxdate')
      .where('organizationID', '=', params.orgID)
      .where('positionID', '=', respPos['positionID'])
      // .where('dateFrom', '<=', params.controlDate || params.onDate)
      // .where('dateTo', '>=', params.controlDate || params.onDate)
      .limit(1)
      .selectSingle()
    data['respFIO'] = respFIO ? respFIO['employeeID.shortFIO'] : ''
  } else {
    data['respFIO'] = ''
  }

  // organizationAudit
  let docAuditDt = UB.Repository('hr_employeeDocAuditDt')
    .attrs('organizationAuditName')
    .whereIf(params.organizationAudit, 'organizationAuditID', '=', params.organizationAudit)
    .where('employeeDocAuditID', '=', params.instanceID)
    .selectAsObject()
  if (!docAuditDt || !docAuditDt.length) {
    docAuditDt = [{
      organizationAuditName: ''
    }]
  }

  const docs = []
  docAuditDt.forEach(item => {
    const sFileName = `${employee && employee.shortFIO ? employee.shortFIO + ' ' : ''}${item.organizationAuditName ? item.organizationAuditName + ' ' : ''}${UB.i18n('Запит про перевірку відомостей щодо особи')}`
    data.organizationAudit = item.organizationAuditName || ''
    const result = docxService.generateDocxDocument({
      templatePath: path.join(templatePath, 'zapitPerevVidom.docx'),
      fileName: sFileName,
      data,
      entityName: 'hr_employee',
      ID: params.instanceID
    })
    docs.push({
      fileContent: JSON.stringify(result.stringContent),
      fileName: sFileName
    })
  })

  /*
  const docs = [
    {
      fileContent: JSON.stringify(result.stringContent),
      fileName: sFileName
    }
  ]
   */

  return JSON.stringify(docs)
}

function dovidkaResultSpecPerev (params, templatePath) {
  const data = {}
  let sFileName = 'Довідка про результати спецперевірки'

  // employee general 1
  let requestAttrs = ['fullFIO', 'genName', 'accusativeName', 'shortFIO', 'birthDate', 'birthPlace']
  const ignoreAttrs = ['shortFIO', 'genName', 'accusativeName']
  const employee = UB.Repository('hr_employee')
    .attrs(requestAttrs)
    .selectById(params.employeeID)
  setData(data, employee, requestAttrs, ['birthDate'], ignoreAttrs)
  data['genFullFIO'] = employee['genName'] || employee['fullFIO'] || ''
  data['accFullFIO'] = employee['accusativeName'] || employee['fullFIO'] || ''

  if (employee) {
    sFileName = `${employee.shortFIO} ${sFileName}`
  }

  data['positionName'] = getPositionInfo(['fullNameGen', 'fullName', 'name'], params.positionID, params.orgID, params.controlDate || params.onDate)

  // organization 3, 4
  data['organizationGen'] = getOrganizationInfo(['nameGen', 'name'], params.orgID, params.controlDate || params.onDate)
  data['organizationOr'] = getOrganizationInfo(['nameOr', 'name'], params.orgID, params.controlDate || params.onDate)

  if (data['organizationGen']) {
    const arr = getSliceStrArr(data['organizationGen'], [75])
    data['organizationGen1'] = arr[0] || ''
    data['organizationGen2'] = arr[1] || ''
  } else {
    data['organizationGen1'] = ''
    data['organizationGen2'] = ''
  }
  if (data['organizationOr']) {
    const arr = getSliceStrArr(data['organizationOr'], [55])
    data['organizationOr1'] = arr[0] || ''
    data['organizationOr2'] = arr[1] || ''
  } else {
    data['organizationOr1'] = ''
    data['organizationOr2'] = ''
  }

  // fact address 5
  requestAttrs = ['ownerID', 'address', 'addressType']
  const factAddress = UB.Repository('ac_address')
    .attrs(requestAttrs)
    .where('ownerID', '=', params.employeeID)
    .where('addressType', '=', '1')
    .limit(1)
    .selectSingle()
  if (factAddress && factAddress['address']) {
    // getSliceStrArr (strData, arrLength)
    const arr = getSliceStrArr(factAddress['address'], [55])
    data['factAddress1'] = arr[0] || ''
    data['factAddress2'] = arr[1] || ''
  } else {
    data['factAddress1'] = ''
    data['factAddress2'] = ''
  }

  // legal address 4
  requestAttrs = ['ownerID', 'address', 'addressType']
  const legalAddress = UB.Repository('ac_address')
    .attrs(requestAttrs)
    .where('ownerID', '=', params.employeeID)
    .where('addressType', '=', '2')
    .limit(1)
    .selectSingle()
  if (legalAddress && legalAddress['address']) {
    const arr = getSliceStrArr(legalAddress['address'], [38])
    data['legalAddress1'] = arr[0] || ''
    data['legalAddress2'] = arr[1] || ''
  } else {
    data['legalAddress1'] = ''
    data['legalAddress2'] = ''
  }

  // organizationAudit 13
  const docAuditDt = UB.Repository('hr_employeeDocAuditDt')
    .attrs('organizationAuditName')
    .whereIf(params.organizationAudit, 'organizationAuditID', '=', params.organizationAudit)
    .where('employeeDocAuditID', '=', params.instanceID)
    .selectAsObject()
  data['organizationAudit'] = docAuditDt && docAuditDt.length > 0 ? docAuditDt.map(item => item.organizationAuditName).join(', ') : ''
  if (data['organizationAudit']) {
    const arr = getSliceStrArr(data['organizationAudit'], [55])
    data['organizationAudit1'] = arr[0] || ''
    data['organizationAudit2'] = arr[1] || ''
    data['organizationAudit3'] = arr[2] || ''
  } else {
    data['organizationAudit1'] = ''
    data['organizationAudit2'] = ''
    data['organizationAudit3'] = ''
  }

  // resultFactID
  if (params.resultFactID) {
    requestAttrs = ['name']
    const resultFactFalse = UB.Repository('hr_outgoingFalseFact')
      .attrs(requestAttrs)
      .selectById(params.resultFactID)
    data['resultFact'] = resultFactFalse['name'].toLowerCase() || ''
  } else {
    data['resultFact'] = ''
  }

  // respPos, respFIO
  requestAttrs = ['positionID', 'positionID.name']
  const respPos = UB.Repository('hr_orgRespPosition')
    .attrs(requestAttrs)
    .where('mi_deleteDate', '>=', '#maxdate')
    .where('respPosition', '=', 'mainChief')
    .where('organizationID', '=', params.orgID)
    // .where('dateFrom', '<=', params.controlDate || params.onDate)
    // .where('dateTo', '>=', params.controlDate || params.onDate)
    .exists(UB.Repository('hr_position')
      .correlation('mi_data_id', 'positionID')
      .where('state', '=', 'ACTIVE')
      .where('mi_deleteDate', '>=', '#maxdate')
      .misc({
        __mip_ondate: params.controlDate || params.onDate
      })
    )
    .limit(1)
    .selectSingle()
  data['respPos'] = respPos ? respPos['positionID.name'] : ''

  if (respPos && respPos['positionID']) {
    requestAttrs = ['employeeID.shortFIO']
    const respFIO = UB.Repository('hr_employeePositionS')
      .attrs(requestAttrs)
      .where('mi_deleteDate', '>=', '#maxdate')
      .where('organizationID', '=', params.orgID)
      .where('positionID', '=', respPos['positionID'])
      // .where('dateFrom', '<=', params.controlDate || params.onDate)
      // .where('dateTo', '>=', params.controlDate || params.onDate)
      .limit(1)
      .selectSingle()
    data['respFIO'] = respFIO ? respFIO['employeeID.shortFIO'] : ''
  } else {
    data['respFIO'] = ''
  }
  const result = docxService.generateDocxDocument({
    templatePath: path.join(templatePath, 'dovidkaResultSpecPerev.docx'),
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

function zapitProvedPerev (params, templatePath) {
  const data = {}

  // employee general
  let requestAttrs = ['fullFIO', 'genName', 'shortFIO', 'birthDate', 'taxCode', 'birthPlace']
  const ignoreAttrs = ['shortFIO', 'genName']
  const employee = UB.Repository('hr_employee')
    .attrs(requestAttrs)
    .selectById(params.employeeID)
  setData(data, employee, requestAttrs, ['birthDate'], ignoreAttrs)
  data['genNameFull'] = employee['genName'] || employee['fullFIO'] || ''

  // passport
  requestAttrs = ['ID', 'employeeID', 'dictDocKindID.name', 'docSeries', 'docNumber', 'docIssued', 'docIssuedDate', 'state']
  const passport = UB.Repository('hr_employeeDocs')
    .attrs(requestAttrs)
    .where('employeeID', '=', params.employeeID)
    .where('dictDocKindID.name', '=', 'паспорт')
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

  // legal address
  requestAttrs = ['ownerID', 'address', 'addressType']
  const legalAddress = UB.Repository('ac_address')
    .attrs(requestAttrs)
    .where('ownerID', '=', params.employeeID)
    .where('addressType', '=', '2')
    .limit(1)
    .selectSingle()
  if (legalAddress && legalAddress['address']) {
    const arr = getSliceStrArr(legalAddress['address'], [46])
    data['legalAddress1'] = arr[0] || ''
    data['legalAddress2'] = arr[1] || ''
  } else {
    data['legalAddress1'] = ''
    data['legalAddress2'] = ''
  }

  // посада, структурний підрозділ, найменування органу, в якому працює
  data['position'] = getPositionInfo(['fullName', 'name'], params.positionID, params.orgID, params.controlDate || params.onDate)
  data['organization'] = getOrganizationInfo(['name'], params.orgID, params.controlDate || params.onDate)
  data['position'] = [data['position'], data['organization']].join(', ')

  // respPos, respFIO
  const respEmployee = getRespEmployee(params.orgID, params.onDate)
  data['respPos'] = respEmployee ? respEmployee['positionID.name'] : ''
  data['respFIO'] = respEmployee ? respEmployee['employeeID.shortFIO'] : ''

  if (Session.userID) {
    const owner = UB.Repository('uba_user')
      .attrs(['employeeNumberID.employeeID.shortFIO', 'employeeNumberID.employeeID.phoneWorking', 'employeeNumberID.employeeID.phoneMobile'])
      .selectById(Session.userID)
    const userName = owner['employeeNumberID.employeeID.shortFIO'] || ''
    const userPhone = owner['employeeNumberID.employeeID.phoneWorking'] || owner['employeeNumberID.employeeID.phoneMobile'] || ''
    data['userInfo'] = owner ? `${userName} ${userPhone}` : ''
  } else {
    data['userInfo'] = ''
  }

  // organizationAudit
  let orgIDs = []
  const docAuditDt = UB.Repository('hr_employeeDocAuditDt')
    .attrs('organizationAuditID.contractorID', 'organizationAuditName')
    .whereIf(params.organizationAudit, 'organizationAuditID', '=', params.organizationAudit)
    .where('employeeDocAuditID', '=', params.instanceID)
    .selectAsObject({
      'organizationAuditID.contractorID': 'ID',
      'organizationAuditName': 'name'
    })
  orgIDs = _.uniq(docAuditDt.map(item => item.ID))
  const orgInfo = []
  if (orgIDs && orgIDs.length > 0) {
    let auditLegalAddress = UB.Repository('ac_address')
      .attrs(['ownerID', 'address', 'addressType'])
      .where('ownerID', 'in', orgIDs)
      .where('addressType', '=', '2')
      .selectAsObject()
    auditLegalAddress = auditLegalAddress && auditLegalAddress.length > 0 ? _.groupBy(auditLegalAddress, 'ownerID') : []

    docAuditDt.forEach(item => {
      const el = {
        organizationAudit: item.name || '',
        auditLegalAddress1: '',
        auditLegalAddress2: ''
      }
      if (auditLegalAddress[item.ID]) {
        const arr = getSliceStrArr(auditLegalAddress[item.ID][0]['address'], [46])
        el.auditLegalAddress1 = arr[0] || ''
        el.auditLegalAddress2 = arr[1] || ''
      }
      orgInfo.push(el)
    })
  } else {
    orgInfo.push({
      organizationAudit: '',
      auditLegalAddress1: '',
      auditLegalAddress2: ''
    })
  }

  const docs = []
  orgInfo.forEach(item => {
    const sFileName = `${employee && employee.shortFIO ? employee.shortFIO + ' ' : ''}${item.organizationAudit ? item.organizationAudit + ' ' : ''}${UB.i18n('Запит про проведення перевірки')}`
    data.organizationAudit = item.organizationAudit
    data.auditLegalAddress1 = item.auditLegalAddress1
    data.auditLegalAddress2 = item.auditLegalAddress2
    const result = docxService.generateDocxDocument({
      templatePath: path.join(templatePath, 'zapitProvedPerev.docx'),
      fileName: sFileName,
      data,
      entityName: 'hr_employeeDocAuditDt',
      ID: params.instanceID
    })

    docs.push({
      fileContent: JSON.stringify(result.stringContent),
      fileName: sFileName
    })
  })

  return JSON.stringify(docs)
}

function povidPochatokPerev (params, templatePath) {
  const data = {}
  let sFileName = 'Повідомлення про початок перевірки'

  // employee general
  const requestAttrs = ['fullFIO', 'genName', 'shortFIO', 'birthDate', 'taxCode', 'birthPlace']
  const ignoreAttrs = ['shortFIO', 'genName']
  const employee = UB.Repository('hr_employee')
    .attrs(requestAttrs)
    .selectById(params.employeeID)
  setData(data, employee, requestAttrs, ['birthDate'], ignoreAttrs)
  data['genNameFull'] = employee['genName'] || employee['fullFIO'] || ''

  if (employee) {
    sFileName = `${employee.shortFIO} ${sFileName}`
  }

  // посада, структурний підрозділ, найменування органу, в якому працює
  data['position'] = getPositionInfo(['fullNameGen', 'fullName', 'name'], params.positionID, params.orgID, params.controlDate || params.onDate)
  data['organization'] = getOrganizationInfo(['nameGen', 'name'], params.orgID, params.controlDate || params.onDate)
  data['position'] = [data['position'], data['organization']].join(', ')

  // respPos, respFIO
  const respEmployee = getRespEmployee(params.orgID, params.onDate)
  data['respPos'] = respEmployee ? respEmployee['positionID.name'] : ''
  data['respFIO'] = respEmployee ? respEmployee['employeeID.shortFIO'] : ''

  data['outgoingDate'] = params.outgoingDate ? dateService.formatDate(params.outgoingDate) : ''

  if (Session.userID) {
    const owner = UB.Repository('uba_user')
      .attrs(['employeeNumberID.employeeID.shortFIO', 'employeeNumberID.employeeID.phoneWorking', 'employeeNumberID.employeeID.phoneMobile'])
      .selectById(Session.userID)
    const userName = owner['employeeNumberID.employeeID.shortFIO'] || ''
    const userPhone = owner['employeeNumberID.employeeID.phoneWorking'] || owner['employeeNumberID.employeeID.phoneMobile'] || ''
    data['userInfo'] = owner ? `${userName} ${userPhone}` : ''
  } else {
    data['userInfo'] = ''
  }

  const result = docxService.generateDocxDocument({
    templatePath: path.join(templatePath, 'povidPochatokPerev.docx'),
    fileName: sFileName,
    data,
    entityName: 'hr_employeeDocAuditDt',
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

function dovidkaResultPerev (params, templatePath) {
  const data = {}

  // employee general
  let requestAttrs = ['fullFIO', 'shortFIO', 'birthDate', 'taxCode', 'birthPlace', 'genName', 'insName', 'accusativeName']
  const ignoreAttrs = ['shortFIO', 'genName', 'insName', 'accusativeName']
  const employee = UB.Repository('hr_employee')
    .attrs(requestAttrs)
    .selectById(params.employeeID)
  setData(data, employee, requestAttrs, ['birthDate'], ignoreAttrs)
  data['genName'] = formatShortName(employee['genName'] || employee['fullFIO'])
  data['insName'] = formatShortName(employee['insName'] || employee['fullFIO'])
  data['accusativeName'] = formatShortName(employee['accusativeName'] || employee['fullFIO'])
  data['genNameFull'] = employee['genName'] || employee['fullFIO']

  // passport
  requestAttrs = ['ID', 'employeeID', 'dictDocKindID.name', 'docSeries', 'docNumber', 'docIssued', 'docIssuedDate', 'state']
  // ignoreAttrs = ['ID', 'employeeID', 'state']
  const passport = UB.Repository('hr_employeeDocs')
    .attrs(requestAttrs)
    .where('employeeID', '=', params.employeeID)
    .where('dictDocKindID.name', '=', 'паспорт')
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

  // legal address
  requestAttrs = ['ownerID', 'address', 'addressType']
  const legalAddress = UB.Repository('ac_address')
    .attrs(requestAttrs)
    .where('ownerID', '=', params.employeeID)
    .where('addressType', '=', '2')
    .limit(1)
    .selectSingle()
  if (legalAddress && legalAddress['address']) {
    const arr = getSliceStrArr(legalAddress['address'], [46])
    data['legalAddress1'] = arr[0] || ''
    data['legalAddress2'] = arr[1] || ''
  } else {
    data['legalAddress1'] = ''
    data['legalAddress2'] = ''
  }

  // посада, структурний підрозділ, найменування органу, в якому працює
  data['position'] = getPositionInfo(['fullName', 'name'], params.positionID, params.orgID, params.controlDate || params.onDate)
  data['organization'] = getOrganizationInfo(['name'], params.orgID, params.controlDate || params.onDate)
  data['position'] = [data['position'], data['organization']].join(', ')

  // respPos, respFIO
  const respEmployee = getRespEmployee(params.orgID, params.onDate)
  data['respPos'] = respEmployee ? respEmployee['positionID.name'] : ''
  data['respFIO'] = respEmployee ? respEmployee['employeeID.shortFIO'] : ''

  data['curDate'] = dateService.formatDate(new Date())

  // organizationAudit
  const orgInfo = UB.Repository('hr_employeeDocAuditDt')
    .attrs('organizationAuditName')
    .whereIf(params.organizationAudit, 'organizationAuditID', '=', params.organizationAudit)
    .where('employeeDocAuditID', '=', params.instanceID)
    .selectAsObject()
  if (!orgInfo.length) { orgInfo.push({ organizationAuditName: '' }) }
  const docs = []
  orgInfo.forEach(item => {
    const sFileName = `${employee && employee.shortFIO ? employee.shortFIO + ' ' : ''}${item.organizationAuditName ? item.organizationAuditName + ' ' : ''}${UB.i18n('Довідка про результати перевірки')}`
    data['organizationAudit'] = item.organizationAuditName
    const result = docxService.generateDocxDocument({
      templatePath: path.join(templatePath, 'dovidkaResultPerev.docx'),
      fileName: sFileName,
      data,
      entityName: 'hr_employeeDocAuditDt',
      ID: params.instanceID
    })

    docs.push({
      fileContent: JSON.stringify(result.stringContent),
      fileName: sFileName
    })
  })
  return JSON.stringify(docs)
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
      } else {
        data[attr] = ''
      }
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

function formatShortName (fullName) {
  const parts = fullName.split(' ')
  let result = parts[0]
  if (parts[1]) {
    result += ' ' + parts[1].charAt(0).toUpperCase() + '.'
    if (parts[2]) {
      result += parts[2].charAt(0).toUpperCase() + '.'
    }
  }
  return result
}

function getRespEmployee (orgID, onDate) {
  return UB.Repository('hr_employeePositionS')
    .attrs(['ID', 'employeeID.shortFIO', 'employeeID.fullFIO', 'positionID.name'])
    .where('organizationID', '=', orgID)
    .where('dateFrom', '<=', onDate)
    .where('dateTo', '>=', onDate)
    .where('positionID.state', '=', 'ACTIVE')
    .where('positionID.isOrgBoss', '=', 1)
    .where('positionID.mi_dateFrom', '<=', onDate)
    .where('positionID.mi_dateTo', '>=', onDate)
    .where('positionID.mi_deleteDate', '>=', '#maxdate')
    .where('employeeID.mi_deleteDate', '>=', '#maxdate')
    .limit(1)
    .selectSingle()
}

function getPositionInfo (fieldListPosition, positionID, organizationID, onDate) {
  let positionName = ''
  for (let k = 0; k < 2; k++) {
    const posInfo = UB.Repository('hr_position')
      .attrs(fieldListPosition)
      .whereIf(organizationID, 'orgID', '=', organizationID)
      .where('state', '=', 'ACTIVE')
      .where('mi_deleteDate', '>=', '#maxdate')
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
    const posInfoData = posInfo.selectById(positionID || 0)
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

function getOrganizationInfo (fieldListPosition, orgID, onDate) {
  let organizationName = ''
  for (let k = 0; k < 2; k++) {
    const orgInfo = UB.Repository('hr_organization')
      .attrs(fieldListPosition)
      .where('mi_data_id', '=', orgID)
      .where('state', '=', 'ACTIVE')
      .where('mi_deleteDate', '>=', '#maxdate')
    if (k === 0) {
      orgInfo
        .where('mi_dateFrom', '<=', onDate)
        .where('mi_dateTo', '>=', onDate)
    } else {
      orgInfo
        .misc({ __mip_recordhistory_all: true })
        .orderBy('mi_dateFrom', 'desc')
        .orderBy('mi_dateTo', 'desc')
    }
    const orgInfoData = orgInfo.selectAsObject()
    if (orgInfoData && orgInfoData.length > 0) {
      fieldListPosition.forEach(el => {
        if (!organizationName) {
          organizationName = orgInfoData[0][el] || ''
        }
      })
      k = 2
    }
  }
  return organizationName
}
