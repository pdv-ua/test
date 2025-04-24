/// <reference path="./posContestTypes.d.ts" />
const _ = require('lodash')
const UB = require('@unitybase/ub')
const App = UB.App

module.exports = {
  exportPosContest: exportPosContest,
  setPosContestResult: setPosContestResult
}

function exportPosContest ({
  onDate,
  createDateFrom,
  createDateTo,
  states
}) {
  if (!onDate) {
    onDate = new Date()
  }
  const fields = ['ID', 'createDate', 'state', 'positionID', 'positionName', 'organizationName', 'organizationEDRPOUCode',
    'depatmentName', 'positionType', 'psCategory', 'dictStatePay', 'accrualSum', 'positionCategory', 'dateFrom', 'dateTo',
    'departmentBaseName', 'instructionID', 'purposePost', 'positionMainResponsibility', 'positionRight',
    'positionResponsibility', 'workingConditions', 'powers', 'positionServiceCommunication', 'positionSpecReq']

  const posContestDataReq = UB.Repository('hr_listPosContest')
    .attrs(['ID', 'mi_createDate', 'state', 'positionID', 'positionID.fullName', 'organizationID.name', 'organizationID.EDRPOUCode',
      'positionID.mi_data_id', 'positionID.parentUnitID.name', 'positionID.parentUnitID.mi_unityEntity', 'positionID.positionType.name',
      'positionID.psCategory.shortName', 'positionID.dictStatePayID.description', 'positionID.accrualSum', 'positionID.positionCategory.name',
      'dateFrom', 'dateTo', 'paraID.departmentID.name'])
    .whereIf(states && states.length > 0, 'state', 'in', states)
    .whereIf(createDateFrom, 'mi_createDate', '>=', createDateFrom)
    .whereIf(createDateTo, 'mi_createDate', '<=', createDateTo)
    .where('positionID.parentUnitID.state', '=', 'ACTIVE')
    .where('positionID.parentUnitID.mi_deleteDate', '>=', '#maxdate')
    .where('positionID.parentUnitID.mi_dateFrom', '<=', onDate)
    .where('positionID.parentUnitID.mi_dateTo', '>=', onDate)
    // .where('organizationID.mi_dateFrom', '<=', onDate)
    // .where('organizationID.mi_dateTo', '>=', onDate)

  const posContestData = posContestDataReq.selectAsObject()

  const posInstructionData = UB.Repository('hr_positionInstruction')
    .attrs(['ID', 'positionID', 'purposePost', 'workingConditions', 'powers'])
    .where('state', '=', 'VALID')
    .where('mi_deleteDate', '>=', '#maxdate')
    .where('dateFrom', '<=', onDate)
    .where('dateTo', '>=', onDate, 'dateTo')
    .where('dateTo', 'isNull', undefined, 'dateToIsNull')
    .logic('([dateTo] or [dateToIsNull])')
    .selectAsObject()
  const posMainRespData = UB.Repository('hr_positionMainResponsibiliti')
    .attrs(['positionInstructionID', 'description'])
    .where('mi_deleteDate', '>=', '#maxdate')
    .orderBy('positionInstructionID')
    .orderBy('itemIdx')
    .selectAsObject()
  const posRightData = UB.Repository('hr_positionRightResponsibiliti')
    .attrs(['positionInstructionID', 'description'])
    .where('type', '=', 'COMMON')
    .where('mi_deleteDate', '>=', '#maxdate')
    .orderBy('positionInstructionID')
    .orderBy('itemIdx')
    .selectAsObject()
  const posRespData = UB.Repository('hr_positionRightResponsibiliti')
    .attrs(['positionInstructionID', 'description'])
    .where('type', '=', 'DIPLOMATIC')
    .where('mi_deleteDate', '>=', '#maxdate')
    .orderBy('positionInstructionID')
    .orderBy('itemIdx')
    .selectAsObject()
  const posServiceCommunicationData = UB.Repository('hr_positionServiceCommunication')
    .attrs(['positionInstructionID', 'objectsEest', 'subjectsStaff'])
    .where('mi_deleteDate', '>=', '#maxdate')
    .orderBy('positionInstructionID')
    .orderBy('itemIdx')
    .selectAsObject()
  const posSpecReqData = UB.Repository('hr_positionSpecReq')
    .attrs(['positionInstructionID', 'specialRequirements'])
    .where('mi_deleteDate', '>=', '#maxdate')
    .orderBy('positionInstructionID')
    .orderBy('itemIdx')
    .selectAsObject()

  const data = []
  posContestData.forEach(posContestItem => {
    const dataItem = [
      posContestItem.ID, posContestItem.mi_createDate, posContestItem.state, posContestItem.positionID,
      posContestItem['positionID.fullName'], posContestItem['organizationID.name'], posContestItem['organizationID.EDRPOUCode'],
      posContestItem['positionID.parentUnitID.mi_unityEntity'] === 'hr_department' ? posContestItem['positionID.parentUnitID.name'] : null,
      posContestItem['positionID.positionType.name'], posContestItem['positionID.psCategory.shortName'],
      posContestItem['positionID.dictStatePayID.description'], posContestItem['positionID.accrualSum'], posContestItem['positionID.positionCategory.name'],
      posContestItem['dateFrom'], posContestItem['dateTo'], posContestItem['paraID.departmentID.name']
    ]
    const posID = posContestItem['positionID.mi_data_id']
    let instructionID = null
    let purposePost = null
    let workingConditions = null
    let powers = null
    let positionMainResponsibility = null
    let positionRight = null
    let positionResponsibility = null
    let positionServiceCommunication = null
    let positionSpecReq = null
    const instrItem = posInstructionData.find(item => item.positionID === posID)
    if (instrItem) {
      instructionID = instrItem.ID
      purposePost = instrItem.purposePost
      workingConditions = instrItem.workingConditions
      powers = instrItem.powers
      const posMainRespItems = posMainRespData.filter(item => item.positionInstructionID === instructionID)
      if (posMainRespItems.length > 0) {
        positionMainResponsibility = posMainRespItems[0].description
        for (let i = 1; i < posMainRespItems.length; i++) {
          positionMainResponsibility += ';' + posMainRespItems[i].description
        }
      }
      const posRightItems = posRightData.filter(item => item.positionInstructionID === instructionID)
      if (posRightItems.length > 0) {
        positionRight = posRightItems[0].description
        for (let i = 1; i < posRightItems.length; i++) {
          positionRight += ';' + posRightItems[i].description
        }
      }
      const posRespItems = posRespData.filter(item => item.positionInstructionID === instructionID)
      if (posRespItems.length > 0) {
        positionResponsibility = posRespItems[0].description
        for (let i = 1; i < posRespItems.length; i++) {
          positionResponsibility += ';' + posRespItems[i].description
        }
      }
      const posServiceCommunicationItems = posServiceCommunicationData.filter(item => item.positionInstructionID === instructionID)
      if (posServiceCommunicationItems.length > 0) {
        positionServiceCommunication = []
        for (let i = 0; i < posServiceCommunicationItems.length; i++) {
          let objectsEest = posServiceCommunicationItems[i].objectsEest
          let subjectsStaff = posServiceCommunicationItems[i].subjectsStaff
          positionServiceCommunication.push(objectsEest + ';' + subjectsStaff)
        }
      }
      const posSpecReqItems = posSpecReqData.filter(item => item.positionInstructionID === instructionID)
      if (posSpecReqItems.length > 0) {
        positionSpecReq = ''
        for (let i = 0; i < posSpecReqItems.length; i++) {
          let specReq = posSpecReqItems[i].specialRequirements
          if (specReq) {
            positionSpecReq += (positionSpecReq ? ';' : '') + specReq
          }
        }
      }
    }

    dataItem.push(instructionID)
    dataItem.push(purposePost)
    dataItem.push(positionMainResponsibility)
    dataItem.push(positionRight)
    dataItem.push(positionResponsibility)
    dataItem.push(workingConditions)
    dataItem.push(powers)
    dataItem.push(positionServiceCommunication)
    dataItem.push(positionSpecReq)
    data.push(dataItem)
  })
  const dataTable = {
    fields: fields,
    data: data
  }
  return dataTable
}

/**
 * @param {posContestTypes.PosContestResult} json
 */
function setPosContestResult (json) {
  const listPosContestID = updateListPosContest(json)
  const itemsReq = []
  const itemsExist = UB.Repository('hr_listPosContestDet')
    .attrs(['ID', 'mi_modifyDate'])
    .where('listPosContestID', '=', listPosContestID)
    .selectAsObject()

  if (json.winners && json.winners.length > 0) {
    json.winners.forEach(ite => {
      const winnerID = getOrCreateWinner(listPosContestID, json, ite)
      itemsReq.push({ ID: winnerID })
    })
  }

  const itemsToRemove = itemsExist.filter(ite1 => !itemsReq.find(ite2 => ite2.ID === ite1.ID))
  if (itemsToRemove.length > 0) {
    const listPosContestDetStore = UB.DataStore('hr_listPosContestDet')
    itemsToRemove.forEach(ite => {
      listPosContestDetStore.run('delete', {
        execParams: {
          ID: ite.ID,
          mi_modifyDate: ite.mi_modifyDate
        }
      })
    })
  }

  return {}
}

/**
 * @param {posContestTypes.PosContestResult} json
 */
function updateListPosContest (json) {
  const posContestData = UB.Repository('hr_listPosContest')
    .attrs(['ID', 'mi_modifyDate', 'mi_createDate', 'state', 'positionID', 'organizationID', 'portalCode', 'dateClose'])
    .where('ID', '=', json.vacancy_hrmis_id)
    .limit(1)
    .selectSingle()
  if (!posContestData) {
    throw new UB.UBAbort(`<<<${UB.i18n('Вакансія не знайдена vacancy_hrmis_id: {0}', json.vacancy_hrmis_id)}>>>`)
  }
  const posContestStore = UB.DataStore('hr_listPosContest')
  const execParams = {}

  let dateClose = null
  if (json.close_date) {
    dateClose = new Date(json.close_date)
  }
  if (posContestData.dateClose !== dateClose) {
    execParams.dateClose = dateClose
  }
  if (posContestData.portalCode !== json.vacancy_id) {
    execParams.portalCode = json.vacancy_id
  }
  let newStatus = 'other'
  if (json.vacancy_status) {
    if (json.vacancy_status === 'closed') {
      newStatus = 'done'
    }
  }
  if (posContestData.result !== newStatus) {
    execParams.result = newStatus
  }

  if (_.keys(execParams).length > 0) {
    execParams.ID = posContestData.ID
    execParams.mi_modifyDate = posContestData.mi_modifyDate
    posContestStore.run('update', {
      execParams: execParams
    })
  }

  return posContestData.ID
}

/**
 * @param {number} listPosContestID
 * @param {posContestTypes.PosContestResult} json
 * @param {posContestTypes.Winner} winner
 */
function getOrCreateWinner (listPosContestID, json, winner) {
  const posContestData = UB.Repository('hr_listPosContest')
    .attrs(['ID', 'organizationID'])
    .where('ID', '=', listPosContestID)
    .limit(1)
    .selectSingle()

  const organizationID = posContestData.organizationID
  const employeeID = getOrCreateEmployeeByWinner(json, winner, organizationID)

  const found = UB.Repository('hr_listPosContestDet')
    .attrs(['ID', 'mi_modifyDate', 'listPosContestID', 'employeeID', 'winLevel', 'score'])
    .where('listPosContestID', '=', listPosContestID)
    .where('employeeID', '=', employeeID)
    .limit(1)
    .selectSingle()

  const listPosContestDetStore = UB.DataStore('hr_listPosContestDet')

  const execParams = {
    ID: found && found.ID,
    listPosContestID: listPosContestID,
    employeeID: employeeID
  }
  if (!found) {
    const listPosContestDetID = listPosContestDetStore.generateID()
    execParams.ID = listPosContestDetID
  }

  let winLevel = '2'
  if (winner.is_winner) {
    winLevel = '1'
  }
  if (execParams.winLevel !== winLevel) {
    execParams.winLevel = winLevel
  }
  execParams.comment = `${winner.last_name} ${winner.first_name} ${winner.middle_name}`

  if (_.keys(execParams).length > 0) {
    if (!found) {
      listPosContestDetStore.run('insert', {
        execParams: execParams
      })
    } else {
      execParams.mi_modifyDate = found.mi_modifyDate
      listPosContestDetStore.run('update', {
        execParams: execParams
      })
    }
  }

  return execParams.ID
}

/**
 * @param {posContestTypes.PosContestResult} json
 * @param {posContestTypes.Winner} winner
 */
function getOrCreateEmployeeByWinner (json, winner, organizationID) {
  const found = UB.Repository('hr_employee')
    .attrs(['ID', 'taxCode'])
    .where('taxCode', '=', winner.ipn)
    .limit(1)
    .selectSingle()
  const employeeID = (found && found.ID) || createEmployeeByWinner(winner)
  updateEmployeeByWinner(json, winner, organizationID, employeeID)
  return employeeID
}

/**
 * @param {posContestTypes.Winner} winner
 */
function createEmployeeByWinner (winner) {
  const employeeStore = UB.DataStore('hr_employee')

  const employeeID = employeeStore.generateID()
  const execParams = {}

  execParams.ID = employeeID
  execParams.taxCode = winner.ipn

  execParams.firstName = winner.first_name
  execParams.lastName = winner.last_name
  execParams.middleName = winner.middle_name

  execParams.shortFIO = `${winner.last_name} ${winner.first_name[0].toUpperCase()}.${winner.middle_name[0].toUpperCase()}.`
  execParams.fullFIO = `${winner.last_name} ${winner.first_name} ${winner.middle_name}`

  execParams.state = 'NEW'

  let sexType = null
  if (winner.sex === 'жінка') {
    sexType = 'W'
  }
  if (winner.sex === 'чоловік') {
    sexType = 'M'
  }
  if (execParams.sexType !== sexType) {
    execParams.sexType = sexType
  }

  if (winner.birth_date) {
    execParams.birthDate = new Date(winner.birth_date)
  }

  let other = null
  if (winner.marital_status) {
    other = winner.marital_status
  }
  if (execParams.other !== other) {
    execParams.other = other
  }

  employeeStore.run('insert', {
    execParams: execParams
  })

  return employeeID
}

/**
 * @param {posContestTypes.PosContestResult} json
 * @param {posContestTypes.Winner} winner
 * @param {number} organizationID
 * @param {number} employeeID
 */
function updateEmployeeByWinner (json, winner, organizationID, employeeID) {
  const found = UB.Repository('ac_employeeOrg')
    .attrs(['ID'])
    .where('organizationID', '=', organizationID)
    .where('employeeID', '=', employeeID)
    .limit(1)
    .selectSingle()
  if (!found) {
    const employeeOrgStore = UB.DataStore('ac_employeeOrg')
    employeeOrgStore.run('insert', {
      execParams: {
        organizationID: organizationID,
        employeeID: employeeID
      }
    })
  }

  if (!winner.id) {
    throw new UB.UBAbort(`<<<${UB.i18n('winner.id is undefined')}>>>`)
  }

  let dateProfile = null
  if (json.close_date) {
    dateProfile = new Date(json.close_date)
  }
  const execParams = {
    employeeID: employeeID,
    dateProfile: dateProfile,
    externalID: winner.id,
    fullFIO: `${winner.last_name} ${winner.first_name} ${winner.middle_name}`
  }

  const itemExist = UB.Repository('hr_employeeInfoPortalVac')
    .attrs(['ID', 'mi_modifyDate', 'dateProfile', 'externalID', 'fullFIO'])
    .where('employeeID', '=', execParams.employeeID)
    .where('externalID', '=', execParams.externalID)
    .limit(1)
    .selectSingle()

  const employeeInfoPortalVacStore = UB.DataStore('hr_employeeInfoPortalVac')
  if (itemExist) {
    execParams.ID = itemExist.ID
    execParams.mi_modifyDate = itemExist.mi_modifyDate
  } else {
    const employeeID = employeeInfoPortalVacStore.generateID()
    execParams.ID = employeeID
  }

  const winnerStr = JSON.stringify(winner)
  const document = App.blobStores.putContent({
    entity: 'hr_employeeInfoPortalVac',
    attribute: 'document',
    ID: execParams.ID,
    fileName: 'profile.json'
  }, Buffer.from(winnerStr, 'utf-8'))
  execParams.document = JSON.stringify(document)

  if (itemExist) {
    employeeInfoPortalVacStore.run('update', {
      execParams: execParams
    })
  } else {
    employeeInfoPortalVacStore.run('insert', {
      execParams: execParams
    })
  }
}
