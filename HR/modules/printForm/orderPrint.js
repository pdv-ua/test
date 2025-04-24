const UB = require('@unitybase/ub')
const App = UB.App
const path = require('path')
const docxService = require('../../../AC/modules/documentBuilder/docxService')
const dateService = require('../../../AC/modules/dataServices/dateService')
const nameCaseService = require('../nameCaseService')
const settingsService = require('../../../AC/modules/entityServices/settingsService')
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
    case 'vacationNotification':
      return vacationNotification(params, templatePath)
  }
}

function vacationNotification (params, templatePath) {
  const data = {}
  let sFileName = 'Повідомлення про заплановану відпустку'
  const useActualPositionName = settingsService.getByCode('hrOrderActualPositionName', params.orgID) === true
  const useSexType = settingsService.getByCode('hrUseSexTypeInOrders', params.orgID) === true

  const order = UB.Repository('hr_empOrder')
    .attrs('masterOrganizationID', 'organizationID')
    .selectById(params.orderID)

  const orgID = order.organizationID || order.masterOrganizationID

  const org = UB.Repository('hr_organization')
    .attrs(['name', 'nameNom'])
    .where('mi_data_id', '=', orgID)
    .where('state', '=', 'ACTIVE')
    .misc({ __mip_ondate: params.onDate })
    .orderBy('mi_dateFrom', 'desc')
    .limit(1)
    .selectSingle()
  const dataItem = {
    orgName: (org.name || org.name || '').toUpperCase(),
    city: getCityName(orgID)
  }

  // respEmployeePositionID
  if (params.respEmployeePositionID) {
    const requestAttrs = ['employeeID.shortFIO', 'employeeID.firstName', 'employeeID.middleName', 'employeeID.lastName', 'positionID.fullNameNom', 'positionID.fullName', 'positionID.name', 'employeeID',
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
    dataItem.respEmployeeName = getShortName(respEmployee['employeeID.lastName'], respEmployee['employeeID.middleName'], respEmployee['employeeID.firstName'], respEmployee['employeeID.shortFIO'] )
    dataItem.respEmployeePos = respEmployee['positionID.fullName'] || respEmployee['positionID.name'] || ''

    if (params.respPositionID && respEmployee.positionID && params.respPositionID !== respEmployee.positionID) {
      const responsAbbr = UB.Repository('ac_settingsOrg')
        .attrs(['value'])
        .where('organizationID', '=', params.orgID || 0)
        .where('[constantID.code]', '=', 'hrResponsAbbr')
        .selectScalar() || 'В.о.'

      const respPositionFull = params.respPositionID ? getPositionInfo(useSexType && respEmployee['employeeID.sexType'] === 'W' ? ['fullNameGenF', 'fullNameGen', 'fullName', 'name'] : ['fullNameGen', 'fullName', 'name'], params.respPositionID, params.orgID, params.onDate, 'mi_data_id') : ''
      if (respPositionFull) {
        dataItem.respEmployeePos = responsAbbr + ' ' + respPositionFull
      }
    } else {
      dataItem.respEmployeePos = useSexType && respEmployee['employeeID.sexType'] === 'W'
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
        dataItem.respEmployeePos = pos || dataItem.respEmployeePos
      }
      dataItem.respEmployeePos = nameCaseService.capitalize(dataItem.respEmployeePos)
    }
  } else {
    dataItem.respEmployeeName = ''
    dataItem.respEmployeePos = ''
  }

  const orderDet = UB.Repository('hr_empOrderDet')
    .attrs('ID', 'empOrderType')
    .where('empOrderType', 'in', ['VACATION', 'VACATIONLONG'])
    .where('orderID', '=', params.orderID)
    .orderBy('ID')
    .selectAsObject({
      'employeeID.fullFIO': 'fullFIO'
    })

  const vacDet = UB.Repository('hr_empOrderVacationListDet')
    .attrs(['paraID', 'employeeID.fullFIO', 'employeeID.firstName', 'employeeID.lastName', 'employeeID.middleName', 'employeeID.shortFIO',
      'dateFrom', 'dateTo', 'dayCount', 'dictVacationKindID.nameGen', 'dictVacationKindID.name'])
    .where('orderID', '=', params.orderID)
    .selectAsObject({
      'employeeID.fullFIO': 'fullName'
    })
  const vacLongDet = UB.Repository('hr_empOrderVacationlongDet')
    .attrs(['ID', 'employeeID.fullFIO', 'employeeID.firstName', 'employeeID.lastName', 'employeeID.middleName', 'employeeID.shortFIO',
      'dateFrom', 'dateTo', 'dayCount', 'dictVacationKindID.nameGen', 'dictVacationKindID.name'])
    .where('orderID', '=', params.orderID)
    .selectAsObject({
      'employeeID.fullFIO': 'fullName'
    })

  data['rows'] = []
  let index = 1
  orderDet.forEach(item => {
    const det = item.empOrderType === 'VACATION'
      ? vacDet.filter(o => o.paraID === item.ID)
      : vacLongDet.filter(o => o.ID === item.ID)
    if (det.length) {
      det.forEach(detItem => {
        data.rows.push(Object.assign({}, dataItem, {
          vacationName: detItem['dictVacationKindID.nameGen'] || detItem['dictVacationKindID.name'] || '',
          fullName: detItem.fullName || '',
          name: getShortName(detItem['employeeID.lastName'], detItem['employeeID.middleName'], detItem['employeeID.firstName'], detItem['employeeID.shortFIO']),
          period: (dateService.dateDiff(detItem.dateFrom, detItem.dateTo)
            ? UB.i18n(`з {0} по {1}`, dateService.formatDate(detItem.dateFrom) + ' ' + UB.i18n('року'), dateService.formatDate(detItem.dateTo) + ' ' + UB.i18n('року')) + ' ' + UB.i18n('включно')
            : UB.i18n(`на {0}`, dateService.formatDate(detItem.dateTo) + ' ' + UB.i18n('року'))),
          days: `${detItem.dayCount} ${dateService.plural(UB.i18n('календарний день_календарних дні_календарних днів'), detItem.dayCount)}`,
          lineSeparator: (index % 2) !== 0 ? '_ '.repeat(65) : '',
          needNewPage: (index % 2) === 0 ? [{ value: ' ' }] : []
        }))
        index++
      })
    }
  })
  if (data.rows.length) {
    data.rows[data.rows.length - 1].lineSeparator = ''
    data.rows[data.rows.length - 1].needNewPage = []
  }

  data['dayDate'] = params.dateReport ? dateService.formatDate(params.dateReport, 'dd') : ''
  data['monthDate'] = params.dateReport ? dateService.formatDate(params.dateReport, 'mmm') : ''
  data['yearDate'] = params.dateReport ? dateService.formatDate(params.dateReport, 'yyyy') : ''

  const result = docxService.generateDocxDocument({
    templatePath: path.join(templatePath, 'vacNotification.docx'),
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
function getShortName (lastName, middleName, firstName, shortFIO) {
  const shortName = (firstName ? firstName.charAt(0).toUpperCase() + '.' : '') + (middleName ? middleName.charAt(0).toUpperCase() + '.' : '') + (lastName ? (firstName || middleName ? ' ' : '') + lastName : '')
  return shortName || shortFIO || ''
}

function getCityName (orgID) {
  let orgAddr = UB.Repository('ac_address')
    .attrs(['cityID.name', 'cityID.cityTypeID.code', 'addressType'])
    .where('ownerID', '=', orgID)
    .selectAsObject()

  let cityname = ((orgAddr && orgAddr[0]) ? orgAddr[0]['cityID.name'] : '') || ''
  if (orgAddr && orgAddr.length) {
    orgAddr = _.groupBy(orgAddr, 'addressType')
    if (orgAddr[2]) {
      cityname = (orgAddr[2][0]['cityID.cityTypeID.code'] || '') + (orgAddr[2][0]['cityID.cityTypeID.code'] ? ' ' : '') + orgAddr[2][0]['cityID.name'] || ''
    } else if (orgAddr[1]) {
      cityname = (orgAddr[1][0]['cityID.cityTypeID.code'] || '') + (orgAddr[1][0]['cityID.cityTypeID.code'] ? ' ' : '') + orgAddr[1][0]['cityID.name'] || ''
    }
  }
  return cityname
}