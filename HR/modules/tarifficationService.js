const UB = require('@unitybase/ub')
const payElService = require('../../HR/modules/payElService')
const periodService = require('../../HR/modules/periodService')
const dateService = require('../../AC/modules/dataServices/dateService')
const algorithmService = require('../../HR/modules/algorithmService')
const accrualService = require('../../HR/modules/accrualService')
const algorithmShift = require('../modules/algorithm/shift')
const algorithmSurcharge = require('../modules/algorithm/surcharge')
const experienceService = require('../../HR/modules/experienceService')

module.exports = {
  calculateShift,
  getWorkPlace,
  getPositions,
  calcPositions,
  calcEmployeeExperience,
  getDictAccrualDt,
  getDictTarifCoeff,
  sortAccruals
}

function getLastPositions ({ documentID, employeeNumberID, dateFrom, dateTo }, setDescription) {
  const document = UB.Repository('trf_document').attrs(['type']).where('ID', '=', documentID).selectSingle()
  const onDate = getLastWorkPlaceDate(document.type, employeeNumberID, dateFrom, dateTo) || getLastWorkPlaceDate(null, employeeNumberID, dateFrom, dateTo)
  if (!onDate) { return [] }
  const ID = getLastWorkPlaceID(document.type, employeeNumberID, onDate) || getLastWorkPlaceID(null, employeeNumberID, onDate)
  if (!ID) { return [] }
  const positions = UB.Repository('trf_position')
    .attrs(['ID', 'accrualSum', 'rate', 'workPlaceID',
      'dictPositionID', 'dictSubjectID', 'dictQualificationID',
      'dictEducationRankID', 'dictRankID', 'dictTarifCoeffID',
      // 'workScheduleID',
      'workNormID',
      'dictPartID',
      'dictEducationLevelID', 'dictFundSourceID', 'dictProgClassID'
    ].concat(setDescription
      ? ['workPlaceID.employeeNumberID.employeeID', 'workPlaceID.employeeNumberID',
        'workPlaceID.dateFrom', 'workPlaceID.dateTo', 'dictPositionID.caption', 'dictSubjectID.description',
        'dictFundSourceID.name',
        'dictProgClassID.description',
        // 'workScheduleID.name',
        'workNormID.weekHours',
        'dictTarifCoeffID.name']
      : []))
    .where('workPlaceID.ID', '=', ID)
    .orderBy('posIndex')
    .selectAsObject()
  if (positions.length) {
    positions.forEach(p => {
      p.accrual = getAccrulasData(p.ID) || []
      p.ID = null
    })
  }
  return positions
}

function getAccrulasData (ID) {
  const accruals = UB.Repository('trf_accrual')
    .attrs(['positionID', 'payElID', 'dictPupilID', 'baseSum',
      'hours', 'accrualSum', 'rate', 'flagsFix', 'experienceYears', 'experienceMonths',
      'accrualRate'
    ])
    .where('positionID', '=', ID)
    .selectAsObject()
  return accruals
}

function getEmpPosition (setDescription, employeeNumberID, dateFrom, dateTo) {
  const data = UB.Repository('hr_employeePositionS')
    .attrs(['dictPositionID', 'dictFundSourceID', 'dictTarifCoeffID', 'dictProgClassID', 'dictRankID', 'dictPositionID.workNormID',
      'dictQualificationID', 'workScheduleID.daysWork']
      .concat(setDescription
        ? ['dictPositionID.caption', 'dictFundSourceID.name', 'dictProgClassID.description', 'dictPositionID.workNormID.weekHours', 'dictTarifCoeffID.name', 'dictRankID.description']
        : []))
    .where('employeeNumberID', '=', employeeNumberID)
    .where('dateTo', '>=', dateFrom)
    .where('dateFrom', '<=', dateTo)
    .where('dictPositionID', 'isNotNull')
    .orderBy('dateFrom')
    .selectSingle({
      'dictPositionID.workNormID': 'workNormID',
      'dictPositionID.workNormID.weekHours': 'workNormID.weekHours'
    })
  if (!data) { return null }
  if (!data.dictRankID) {
    const employeeNumber = UB.Repository('hr_employeeNumberSR').attrs('employeeID').where('ID', '=', employeeNumberID).selectSingle()
    if (employeeNumber) {
      const publServRang = UB.Repository('hr_publServRang')
        .attrs(['dictRankID']
          .concat(setDescription ? ['dictRankID.description'] : []))
        .where('employeeID', '=', employeeNumber.employeeID)
        .where('dateTo', '>=', dateFrom)
        .where('dateFrom', '<=', dateFrom)
        .orderBy('dateFrom')
        .limit(1)
        .selectSingle()
      if (publServRang) {
        data.dictRankID = publServRang.dictRankID
        if (setDescription) {
          data['dictRankID.description'] = publServRang['dictRankID.description']
        }
      }
    }
  }
  return data
}

function getPostedWorkPlace (documentType, employeeNumberID, onDate) {
  const workPlace = UB.Repository('trf_workPlace')
    .attrs(['departmentID', 'dictPositionID'])
    .where('employeeNumberID', '=', employeeNumberID)
    .where('state', '=', 'POSTED')
    .where('documentID.type', '=', documentType)
    .where('dateFrom', '<=', onDate)
    .where('dateTo', '>=', onDate)
    .orderBy('dateFrom')
    .limit(1)
    .selectSingle()
  return workPlace
}

function getEmployeeWorkPlace (employeeNumberID, onDate) {
  const workPlace = UB.Repository('hr_employeePositionS')
    .attrs(['departmentID', 'dictPositionID', 'positionID.dictPositionID'])
    .where('employeeNumberID', '=', employeeNumberID)
    .where('dateTo', '>=', onDate)
    .where('dateFrom', '<=', onDate)
    .orderBy('dateFrom')
    .limit(1)
    .selectSingle()
  return workPlace ? {
    departmentID: workPlace.departmentID,
    dictPositionID: workPlace.dictPositionID || workPlace['positionID.dictPositionID']
  } : null
}

function getWorkPlace (documentType, employeeNumberID, onDate) {
  if (employeeNumberID && onDate) {
    return /* getPostedWorkPlace(documentType, employeeNumberID, onDate) || */ getEmployeeWorkPlace(employeeNumberID, onDate)
  } else {
    return null
  }
}

function getPositions (orgID, workPlace, params = {}) {
  if (workPlace.employeeNumberID) {
    let positions = getLastPositions(workPlace, params.setDescription)
    if (!positions.length) {
      const empPosition = getEmpPosition(params.setDescription, workPlace.employeeNumberID, workPlace.dateFrom, workPlace.dateTo)
      positions = empPosition ? [empPosition] : []
    }
    positions.forEach(pos => {
      if (!pos.accrual) {
        pos.accrual = []
      }
    })
    return positions
  } else if (workPlace.dictPositionID) {
    const position = UB.Repository('hr_dictPosition')
      .attrs(['ID', 'dictTarifCoeffID']
        .concat(params.setDescription ? ['caption', 'dictTarifCoeffID.name'] : []))
      .where('ID', '=', workPlace.dictPositionID)
      .where('dateTo', '>=', workPlace.dateFrom)
      .where('dateFrom', '<=', workPlace.dateTo)
      .selectSingle({
        'ID': 'dictPositionID',
        'caption': 'dictPositionID.caption'
      })
    if (position) {
      position.accrual = []
      return [position]
    }
    return []
  }
}

function getDictAccrualDt ({ orgID, payElID }) {
  const condition = UB.Repository('trf_dictAccrualCond')
    .attrs(['dictAccrualDtID', 'conditionType', 'orgID', 'dictPositionID', 'dictQualificationID', 'dictSubjectID', 'dictPupilID'])
    .selectAsObject()
  const dict = UB.Repository('trf_dictAccrualDt')
    .attrs(['ID', 'dictAccrualID', 'dictAccrualID.payElID', 'dateFrom', 'dateTo', 'calcRuleID',
      'excludeOrg', 'excludePosition', 'excludeQualification', 'excludeSubject', 'excludePupil',
      // 'orgID', 'dictPositionID',
      // 'dictQualificationID',
      // 'dictSubjectID', 'dictPupilID',
      'rate','sumCalc','maxRate', 'isAutoAdd', 'isAutoHours'])
    .where('dictAccrualID.mi_deleteDate', '>=', '#maxdate')
    .whereIf(payElID, 'dictAccrualID.payElID', '=', payElID)
    // .where('[orgID]', 'isNull', undefined, 'orgIDIsNull')
    // .where('[orgID]', '=', orgID, 'orgIDequal')
    // .logic('([orgIDIsNull] OR [orgIDequal])')
    .selectAsObject({
      'dictAccrualID.payElID': 'payElID'
    })
  dict.forEach(row => {
    row.dateFrom = dateService.shiftDate(row.dateFrom)
    row.dateTo = dateService.shiftDate(row.dateTo)
    row.orgList = condition.filter(o => o.dictAccrualDtID === row.ID && o.conditionType === '1').map(o => o.orgID)
    row.positionList = condition.filter(o => o.dictAccrualDtID === row.ID && o.conditionType === '3').map(o => o.dictPositionID)
    row.qualificationList = condition.filter(o => o.dictAccrualDtID === row.ID && o.conditionType === '8').map(o => o.dictQualificationID)
    row.subjectList = condition.filter(o => o.dictAccrualDtID === row.ID && o.conditionType === '9').map(o => o.dictSubjectID)
    row.pupilList = condition.filter(o => o.dictAccrualDtID === row.ID && o.conditionType === '10').map(o => o.dictPupilID)
    row.calcRuleID = row.calcRuleID || '1'
  })
  // const result = dict.sort((a, b) => {
  //   return a.payElID !== b.payElID ? a.payElID - b.payElID
  //     : a.orgID !== b.orgID ? a.orgID - b.orgID
  //       : a.dictPositionID !== b.dictPositionID ? a.dictPositionID - b.dictPositionID
  //         : a.dictQualificationID !== b.dictQualificationID ? a.dictQualificationID - b.dictQualificationID
  //           : a.dictSubjectID !== b.dictSubjectID ? a.dictSubjectID - b.dictSubjectID
  //             : a.dictPupilID !== b.dictPupilID ? a.dictPupilID - b.dictPupilID
  //               : a.ID - b.ID
  // }).reverse()
  // return result
  if (orgID) {
    return dict.filter(row => {
      return row.orgList.length === 0 ||
        (row.excludeOrg && row.orgList.findIndex(o => o === orgID) < 0) ||
        (!row.excludeOrg && row.orgList.findIndex(o => o === orgID) >= 0)
    })
  }
  return dict
}

function getDictTarifCoeffDet () {
  // Тарифні розряди, коефіцієнти (оклади)
  const dict = UB.Repository('hr_dictTarifCoeffDet')
    .attrs(['ID', 'dictTarifCoeffID', 'accrualSum', 'dateFrom', 'dateTo', 'dictTarifCoeffID.koef',
      'dictTarifCoeffID.dateFrom', 'dictTarifCoeffID.dateTo'])
    .where('dictTarifCoeffID.mi_deleteDate', '>=', '#maxdate')
    .selectAsObject({
      'dictTarifCoeffID.koef': 'koef',
      'dictTarifCoeffID.dateFrom': 'dictTarifCoeffDateFrom',
      'dictTarifCoeffID.dateTo': 'dictTarifCoeffDateTo'
    })
  dict.forEach(row => {
    row.dateFrom = dateService.shiftDate(row.dateFrom)
    row.dateTo = dateService.shiftDate(row.dateTo)
    row.dictTarifCoeffDateFrom = dateService.shiftDate(row.dictTarifCoeffDateFrom)
    row.dictTarifCoeffDateTo = dateService.shiftDate(row.dictTarifCoeffDateTo)
  })
  return dict
}

function loadDict ({ orgID }) {
  const result = {}
  result.hr_dictTarifCoeffDet = getDictTarifCoeffDet()
  result.trf_dictEducationRankRate = UB.Repository('trf_dictEducationRankRate')
    .attrs(['ID', 'dictEducationRankID', 'rate', 'dateFrom', 'dateTo'])
    .where('dictEducationRankID.mi_deleteDate', '>=', '#maxdate')
    .selectAsObject()
  result.trf_dictEducationRankRate.forEach(row => {
    row.dateFrom = dateService.shiftDate(row.dateFrom)
    row.dateTo = dateService.shiftDate(row.dateTo)
  })
  result.trf_dictAccrual = UB.Repository('trf_dictAccrual')
    .attrs(['payElID', 'payElID.methodID.code'])
    .selectAsObject()
  result.trf_dictAccrualDt = getDictAccrualDt({ orgID })
  result.hr_dictSalaryRank = UB.Repository('hr_dictSalaryRank')
    .attrs(['ID', 'dictRankID', 'dateFrom', 'dateTo', 'paySum'])
    .where('dictRankID.mi_deleteDate', '>=', '#maxdate')
    .selectAsObject()
  result.hr_dictSalaryRank.forEach(row => {
    row.dateFrom = dateService.shiftDate(row.dateFrom)
    row.dateTo = dateService.shiftDate(row.dateTo)
  })
  result.hr_workSchedule = UB.Repository('hr_workSchedule').attrs(['ID', 'weekHours', 'weekDays']).selectAsObject()
  result.trf_workNorm = UB.Repository('trf_workNorm').attrs(['ID', 'weekHours']).selectAsObject()
  result.trf_dictPupil = UB.Repository('trf_dictPupil').attrs(['ID', 'name']).selectAsObject()
  result.hr_dictPositionDt = UB.Repository('hr_dictPositionDt').attrs(['ID', 'dictPositionID', 'dateFrom', 'dateTo', 'accrualSum']).selectAsObject()
  result.hr_dictPositionDt.forEach(row => {
    row.dateFrom = dateService.shiftDate(row.dateFrom)
    row.dateTo = dateService.shiftDate(row.dateTo)
  })
  result.trf_tariffSheetDt = getTariffSheetDt()
  result.trf_dictPartMain = UB.Repository('trf_dictPart').attrs(['ID', 'name']).where('isMain', '=', '1').limit(1).selectSingle()

  return result
}

function getStructureAccrual () {
  return {
    payElID: null,
    dictPupilID: null,
    baseSum: null,
    experienceYears: null,
    experienceMonths: null,
    accrualRate: null,
    rate: null,
    hours: null,
    accrualSum: null,
    flagsFix: 0
  }
}

function getStructurePosition () {
  return {
    ID: null,
    accrual: [],
    dictEducationLevelID: null,
    dictEducationRankID: null,
    dictQualificationID: null,
    dictRankID: null,
    dictPositionID: null,
    dictSubjectID: null,
    dictTarifCoeffID: null,
    dictFundSourceID: null,
    dictProgClassID: null,
    // workScheduleID: null,
    workNormID: null,
    dictPartID: null,
    rate: null,
    accrualSum: null,
    comment: null
  }
}

function getStructurePositionExtra () {
  return {
    'dictPositionID.caption': null,
    'dictEducationRankID.description': null,
    'dictSubjectID.description': null,
    'dictTarifCoeffID.name': null,
    'dictFundSourceID.name': null,
    'dictProgClassID.description': null,
    // 'workScheduleID.name': null
    'workNormID.weekHours': null,
    'dictPartID.name': null
  }
}

function sortAccruals ({ cont, accrual, onDate }) {
  const result = accrual.sort((a, b) =>
    cont.payEl[a.payElID].method.code === '143' ? -1
      : cont.payEl[b.payElID].method.code === '143' ? 1
        : cont.payEl[a.payElID].method.code === '144' ? -1
          : cont.payEl[b.payElID].method.code === '144' ? 1
            : cont.payEl[a.payElID].method.code === '152' ? -1
              : cont.payEl[b.payElID].method.code === '152' ? 1
                : cont.payEl[a.payElID].method.code === '145' ? -1
                  : cont.payEl[b.payElID].method.code === '145' ? 1
                    : (a.dictPupilID || Number.MAX_VALUE) === (b.dictPupilID || Number.MAX_VALUE)
                      ? cont.payEl[a.payElID].method.code === '146' ? -1
                        : cont.payEl[b.payElID].method.code === '146' ? 1
                          : cont.payEl[a.payElID].method.code === '147' ? -1
                            : cont.payEl[b.payElID].method.code === '147' ? 1
                              : cont.payEl[a.payElID].method.code === '156' ? -1
                                : cont.payEl[b.payElID].method.code === '156' ? 1
                                  : cont.payEl[b.payElID].payElEntryTime.find(o => o.payElBaseID === a.payElID && o.dateFrom <= onDate && o.dateTo >= onDate) ? -1
                                    : Number(String(cont.payEl[a.payElID].code || '').replace(/[^\d]/g, '') || 0) - Number(String(cont.payEl[b.payElID].code || '').replace(/[^\d]/g, '') || 0)
                      : (a.dictPupilID || Number.MAX_VALUE) - (b.dictPupilID || Number.MAX_VALUE)
  )
  // result.forEach((accr, idx) => {
  //   accr.priority = idx + 1
  // })
  return result
}

function setBaseAccruals ({ orgID, cont, onDate, workPlace, position, accruals, params }) {
  const employeePosition = cont.employeeNumberID ? cont.emp[cont.employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= onDate && o.dateTo >= onDate) : null
  const payElID = employeePosition && employeePosition.payElID && cont.dict.trf_dictAccrual.find(o => o.payElID === employeePosition.payElID) ? employeePosition.payElID : null
  if (employeePosition && employeePosition.dictPositionID === position.dictPositionID && payElID && cont.payEl[payElID].method.code === '1') {
    if (!accruals.find(o => cont.payEl[o.payElID].method.code === '1')) {
      const accrual = Object.assign(getStructureAccrual(), { payElID })
      accruals.push(accrual)
      pushSubAccruals(orgID, cont, position, accruals, accrual, onDate, params)
    }
  } else if (position.dictTarifCoeffID) {
    if (!accruals.find(o => cont.payEl[o.payElID].method.code === '143')) {
      const payElID = payElService.findPayElByMethod({ cont, methodCode: '143', onDate })
      if (payElID) {
        accruals.push(Object.assign(getStructureAccrual(), { payElID }))
      }
    }
    if (position.dictEducationRankID && !accruals.find(o => cont.payEl[o.payElID].method.code === '152')) {
      cont.dict.trf_dictAccrual.forEach(o => {
        if (o['payElID.methodID.code'] === '152' && !accruals.find(a => a.payElID === o.payElID)) {
          const dictAccrualDt = findDictAccrualDt(cont.dict.trf_dictAccrualDt, o.payElID, orgID, position.dictPositionID, position.dictQualificationID, position.dictSubjectID, null, onDate)
          if (dictAccrualDt && dictAccrualDt.isAutoAdd) {
            accruals.push(Object.assign(getStructureAccrual(), { payElID: o.payElID }))
          }
        }
      })
    }

    cont.dict.trf_dictAccrual.forEach(o => {
      if (o['payElID.methodID.code'] === '144' && !accruals.find(a => a.payElID === o.payElID)) {
        const dictAccrualDt = findDictAccrualDt(cont.dict.trf_dictAccrualDt, o.payElID, orgID, position.dictPositionID, position.dictQualificationID, position.dictSubjectID, null, onDate)
        if (dictAccrualDt && dictAccrualDt.isAutoAdd) {
          accruals.push(Object.assign(getStructureAccrual(), { payElID: o.payElID }))
        }
      }
    })

    if (!accruals.find(o => cont.payEl[o.payElID].method.code === '145')) {
      const payElID = payElService.findPayElByMethod({ cont, methodCode: '145', onDate })
      if (payElID) {
        accruals.push(Object.assign(getStructureAccrual(), { payElID }))
      }
    }
    if (!accruals.find(o => ['147', '156'].includes(cont.payEl[o.payElID].method.code) || ['147', '156'].includes(cont.payEl[o.payElID].method.code))) {
      if (workPlace.employeeNumberID && position.dictPositionID && cont.emp[cont.employeeNumberID]) {
        if (employeePosition && employeePosition.payElID && employeePosition.dictPositionID === position.dictPositionID && ['146', '147', '156'].includes(cont.payEl[employeePosition.payElID].method.code)) {
          const accrual = Object.assign(getStructureAccrual(), { payElID: employeePosition.payElID })
          accruals.push(accrual)
          pushSubAccruals(orgID, cont, position, accruals, accrual, onDate, params)
        }
      }
    }
  } else {
    if (!accruals.find(o => cont.payEl[o.payElID].method.code === '1')) {
      if (workPlace.employeeNumberID && position.dictPositionID && cont.emp[cont.employeeNumberID]) {
        if (employeePosition && employeePosition.payElID && employeePosition.dictPositionID === position.dictPositionID &&
          cont.payEl[employeePosition.payElID].method.code === '1' && cont.dict.trf_dictAccrual.find(o => o.payElID === employeePosition.payElID)) {
          const accrual = Object.assign(getStructureAccrual(), { payElID: employeePosition.payElID })
          accruals.push(accrual)
          pushSubAccruals(orgID, cont, position, accruals, accrual, onDate, params)
        }
      }
    }
  }
}

function pushSubAccruals (orgID, cont, position, accruals, ledAccrual, onDate, params, nextInternalId = 255) {
  const methodCodes = cont.payEl[ledAccrual.payElID].method.code === '146' ? ['148', '4', '6', '5', '154', '155'] : ['4', '6', '5']
  if (methodCodes.length) {
    cont.dict.trf_dictAccrual
      .filter(accr => methodCodes.includes(accr['payElID.methodID.code']))
      .forEach(accr => {
        if (accr['payElID.methodID.code'] === '5') {
          if (position.dictRankID) {
            if (!accruals.find(o => o.payElID === accr.payElID) &&
              (cont.payEl[accr.payElID].payElEntryTime.find(o => o.dateFrom <= onDate && o.dateTo >= onDate && o.payElBaseID === ledAccrual.payElID) ||
                cont.payEl[accr.payElID].payElEntrySum.find(o => o.dateFrom <= onDate && o.dateTo >= onDate && o.payElBaseID === ledAccrual.payElID))) {
              const subAccrual = Object.assign({}, ledAccrual, {
                internalId: 'gen' + (++nextInternalId),
                payElID: accr.payElID,
                dictPupilID: null,
                hours: null,
                flagsFix: 0,
                autoPushed: true
              })
              if (params.setDescription) {
                subAccrual['payElID.methodID.code'] = cont.payEl[accr.payElID].method.code
                subAccrual['payElID.description'] = cont.payEl[accr.payElID].description
              }
              accruals.push(subAccrual)
            }
          }
        } else {
          const dictAccrualDt = findDictAccrualDt(cont.dict.trf_dictAccrualDt, accr.payElID, orgID, position.dictPositionID, position.dictQualificationID, position.dictSubjectID, ledAccrual.dictPupilID, onDate)
          if (dictAccrualDt.isAutoAdd) {
            if (cont.payEl[accr.payElID].isAutoCalc &&
              !accruals.find(o => o.payElID === accr.payElID && (o.dictPupilID === ledAccrual.dictPupilID || cont.payEl[accr.payElID].method.code !== '148')) &&
              (cont.payEl[accr.payElID].payElEntryTime.find(o => o.dateFrom <= onDate && o.dateTo >= onDate && o.payElBaseID === ledAccrual.payElID) ||
                cont.payEl[accr.payElID].payElEntrySum.find(o => o.dateFrom <= onDate && o.dateTo >= onDate && o.payElBaseID === ledAccrual.payElID))) {
              const subAccrual = Object.assign({}, ledAccrual, {
                internalId: 'gen' + (++nextInternalId),
                payElID: accr.payElID,
                dictPupilID: cont.payEl[accr.payElID].method.code === '148' ? ledAccrual.dictPupilID : null,
                hours: dictAccrualDt.isAutoHours ? ledAccrual.hours : null,
                flagsFix: 0,
                autoPushed: true
              })
              if (params.setDescription) {
                subAccrual['payElID.methodID.code'] = cont.payEl[accr.payElID].method.code
                subAccrual['payElID.description'] = cont.payEl[accr.payElID].description
              }
              accruals.push(subAccrual)
            }
          }
        }
      })
  }
}

function addSubAccruals ({ orgID, cont, onDate, position, params }) {
  if (position.justInsertedAccrualIDs) { // Only for the just inserted accruals
    position.accrual.forEach(ledAccrual => {
      if (position.justInsertedAccrualIDs.includes(ledAccrual.internalId)) { // Only for the just inserted accruals
        if (['1', '146', '147', '156'].includes(cont.payEl[ledAccrual.payElID].method.code)) {
          // const nextInternalId = position.justInsertedAccrualIDs.reduce((max, item) => (max > item ? max : item))
          // pushSubAccruals(cont, position.accrual, ledAccrual, onDate, params, nextInternalId)
          pushSubAccruals(orgID, cont, position, position.accrual, ledAccrual, onDate, params)
        }
      }
    })
  }
}

/**
 * Зміна основної посади працівника у робочому місці тарифікації
 * @param workPlace {Object} Робоче місце тарифікації
 * @param positions {Array} Посадові місця робочого місця тарифікації
 * @param employeePosition {Object} Посада у особовому рахунку працівника, на дату початку робочого місця
 * Увага!
 * Може змінювати workPlace.dictPositionID
 * Може видаляти або змінювати елементи масиву positions
 */
function setWorkPlaceMainPosition (cont, onDate, workPlace, positions, employee, params = {}) {
  const employeePosition = employee.prop.employeePositions.find(o => o.dateFrom <= onDate && o.dateTo >= onDate)
  // Змінено посаду працівника
  if (employeePosition && employeePosition.dictPositionID && workPlace.dictPositionID !== employeePosition.dictPositionID) {
    // Якщо не знайдено нову посаду у посадах тарифікації:
    if (!positions.find(pos => pos.dictPositionID === employeePosition.dictPositionID)) {
      // створити нову посаду
      let positionExtraData = {}
      // Изменение должности происходит относительно нечасто. Поэтому, чтобы не перегружать кэшированные справочники (loadDict) наименованиями,
      // подгружаем необходимые дополнительные сведения запросом. Это происходит только в интерактиве, поэтому допустимо. В пакетных расчётах
      // параметр setDescription будет === false
      const extraData = UB.Repository('hr_employeePositionS')
        .attrs(['dictPositionID.workNormID'].concat(params.setDescription ? [
          'dictPositionID.name', 'dictPositionID.caption', 'dictFundSourceID.name', 'dictProgClassID.description',
          'dictPositionID.workNormID.weekHours', 'workScheduleID.daysWork'
        ] : []))
        .where('ID', '=', employeePosition.ID)
        .selectSingle({
          'dictPositionID.workNormID': 'workNormID',
          'dictPositionID.workNormID.weekHours': 'workNormID.weekHours'
        })
      if (params.setDescription) {
        positionExtraData = Object.assign(getStructurePositionExtra())
        positionExtraData['dictPositionID.name'] = extraData['dictPositionID.name']
        positionExtraData['dictPositionID.caption'] = extraData['dictPositionID.caption']
        positionExtraData['dictFundSourceID.name'] = extraData['dictFundSourceID.name']
        positionExtraData['dictProgClassID.description'] = extraData['dictProgClassID.description']
        positionExtraData['workNormID.weekHours'] = extraData['workNormID.weekHours']
        positionExtraData['dictPartID.name'] = cont.dict.trf_dictPartMain.name
      }
      const newPosition = Object.assign(getStructurePosition(), {
        workPlaceID: workPlace.ID,
        dictPositionID: employeePosition.dictPositionID,
        dictFundSourceID: employeePosition.dictFundSourceID,
        dictProgClassID: employeePosition.dictProgClassID,
        dictTarifCoeffID: null, // employeePosition.dictTarifCoeffID,
        workNormID: extraData.workNormID,
        dictPartID: cont.dict.trf_dictPartMain.ID,
        rate: null, // employeePosition.mtCount,
        accrual: []
      }, positionExtraData)
      // newPosition.internalId = 'gen' + (positions.reduce((a, b) => { return Math.max(a, Number(b.internalId) || 0) }, 0) + 1)
      positions.push(newPosition)
    }

    // Стара посада:
    const deleteOldPosition = true // !employeePositions.find(pos => pos.dictPositionID === workPlace.dictPositionID && pos.dateFrom < onDate)
    if (deleteOldPosition) {
      for (let i = positions.length - 1; i >= 0; i--) {
        if (positions[i].dictPositionID === workPlace.dictPositionID) {
          positions.splice(i, 1)
        }
      }
    } else {
      // очистити розрахунок по старій основній посаді
      positions.forEach(pos => {
        if (pos.dictPositionID === workPlace.dictPositionID) {
          pos.accrual = []
        }
      })
    }

    // Зробити нову посаду основною
    workPlace.dictPositionID = employeePosition.dictPositionID
    return true
  }
  return false
}

function setDictPupilID ({ cont, accruals }) {
  accruals.forEach(accr => {
    if (cont.payEl[accr.payElID] && cont.payEl[accr.payElID].method.code === '148' && !(accr.flagsFix & 1 << 6)) {
      const ledAccrual = getLedAccrual(cont, accr, accruals)
      if (ledAccrual) {
        accr.dictPupilID = ledAccrual.dictPupilID
      }
    }
  })
}

/**
 * Розрахунок Посадові місця тарифікації
 * @param orgID {Number} Організація
 * @param workPlace {Object} Робоче місце тарифікації
 * @param positions {Array} Посадові місця тарифікації.
 */
function calcPositions ({ cont = {}, orgID, workPlace, positions, params = {} }) {
  if (!cont.payEl) {
    cont.payEl = payElService.getPayEl({ orgID })
  }
  if (!cont.dict) {
    cont.dict = loadDict({ orgID })
  }

  if (!cont.emp) {
    cont.emp = {}
  }
  let onDate = dateService.shiftDate(workPlace.dateFrom)
  cont.employeeNumberID = workPlace.employeeNumberID
  if (cont.employeeNumberID) {
    cont.emp[cont.employeeNumberID] = { prop: getEmpData(cont.employeeNumberID) }
  }

  positions = sortPositions(positions, workPlace.dictPositionID)

  if (cont.employeeNumberID) {
    onDate = dateService.shiftDate(Math.max(cont.emp[cont.employeeNumberID].prop.employeeNumber.dateFrom, onDate))
    workPlace.dateFrom = onDate
    if (!setWorkPlaceMainPosition(cont, onDate, workPlace, positions, cont.emp[cont.employeeNumberID], params)) {
      updateWorkPlaceMainPosition(onDate, positions, cont.emp[cont.employeeNumberID], params)
    }
    updatePositionEducation(onDate, positions, cont.emp[cont.employeeNumberID])
  }

  // Разметка массива начислений:
  // - добавление записей обязательных и зависимых видов оплаты
  // - сортировка массива начислений - важно для последовательности расчёта зависимых видов оплаты
  positions.forEach(position => {
    const dictTarifCoeff = getDictTarifCoeff({
      cont,
      tariffSheetID: null,
      onDate,
      dictEducationLevelID: position.dictEducationLevelID,
      dictStaffSubCatID: position.dictStaffSubCatID, // || cont.emp[cont.employeeNumberID].dictStaffSubCatID,
      dictQualificationID: position.dictQualificationID
    })
    if (dictTarifCoeff.ID) {
      position.dictTarifCoeffID = dictTarifCoeff.ID
      if (params.setDescription) {
        position['dictTarifCoeffID.name'] = dictTarifCoeff.name
      }
    }
    if (!position.dictPartID) {
      position.dictPartID = cont.dict.trf_dictPartMain.ID
      if (params.setDescription) {
        position['dictPartID.name'] = cont.dict.trf_dictPartMain.name
      }
    }
    if (position.dictPositionID) {
      const empPosition = getEmpPosition(params.setDescription, cont.employeeNumberID, onDate, onDate)
      if (empPosition) {
        const dictPosition = UB.Repository('hr_dictPosition')
          .attrs(['workNormID', 'positionType', 'workNormID.weekHours'])
          .where('ID', '=', position.dictPositionID)
          .selectSingle()
        if (dictPosition.positionType === '1' && cont.employeeNumberID && !position.dictRankID) { // Держслужбовець
          position.dictRankID = empPosition.dictRankID
        } else if (!position.workNormID && dictPosition && dictPosition.workNormID) {
          position.workNormID = dictPosition.workNormID
          if (params.setDescription) {
            position['workNormID.weekHours'] = dictPosition['workNormID.weekHours']
          }
        }
      }
    }
    if (!position.accrual.length || position.change) {
      setBaseAccruals({ orgID, cont, onDate, workPlace, position, accruals: position.accrual, params })
    }
    setDictPupilID({ cont, accruals: position.accrual })
    addSubAccruals({ orgID, cont, onDate, position, params })
    position.accrual = sortAccruals({ cont, accrual: position.accrual, onDate })
  })

  // 1 часть расчёта:
  // - расчёт тарифа, повышения и системы оплаты для определения количества ставок по должностям
  // - расчёт итогового количества ставок по должностям, от него зависит дальнейший расчёт надбавок и доплат
  params.include = ['1', '143', '144', '152', '145', '146', '147', '156']
  params.exclude = null
  positions.forEach(position => {
    recalcAccrual({ orgID, cont, onDate, workPlace, position, accrual: position.accrual, params })
    position.rate = position.accrual.reduce((rate, acc) => {
      rate += ['146', '147', '156', '1'].includes(cont.payEl[acc.payElID].method.code) ? (acc.accrualRate || 0) : 0
      return rate
    }, 0)
  })

  // 2 часть расчёта:
  // - расчёт надбавок и доплат
  // - расчёт Всего начислено по должностям
  params.exclude = params.include
  params.include = null
  params.positions = positions
  params.maxRate = []
  positions.forEach(position => {
    recalcAccrual({ orgID, cont, onDate, workPlace, position, accrual: position.accrual, params })
    removeEmptyAutoPushedAccruals(position.accrual)
    position.accrualSum = accrualService.round(position.accrual.reduce((sum, acc) => {
      sum += !['143', '144', '145', '152'].includes(cont.payEl[acc.payElID].method.code) ? (acc.accrualSum || 0) : 0
      return sum
    }, 0))
  })

  // 3 часть расчёта:
  // - добавление постоянных отпусков
  if (cont.employeeNumberID) {
    const vacation = setVacation(cont.payEl, workPlace, positions, cont.emp[cont.employeeNumberID].prop.employeeAccrual, params)
    // - для фактической тарификации, если её период внутри периода отпуска - обнуляем суммы начислений
    if (vacation && workPlace.type === 'FACT' && vacation.dateFrom <= workPlace.dateFrom && vacation.dateTo >= workPlace.dateTo) {
      positions.forEach(position => {
        position.accrual.forEach(accrual => {
          accrual.accrualSum = 0
        })
      })
    }
  }
}

function getBaseSum (cont, accrual, calcRuleID, accrualList, onDate) {
  let baseSum = 0
  switch (calcRuleID) {
    case '1': {
      baseSum = accrualList.reduce((sum, acc) => {
        sum += cont.payEl[accrual.payElID].payElEntrySum.find(o =>
          o.payElBaseID === acc.payElID && o.dateFrom <= onDate && o.dateTo >= onDate) &&
        (accrual.dictPupilID === null || (acc.dictPupilID || 0) === (accrual.dictPupilID || 0))
          ? (acc.accrualSum || 0) : 0
        return sum
      }, 0)
      break
    }
    case '2':
    case '4':
    case '5': {
      baseSum = accrualList.reduce((sum, acc) => {
        sum += ['143'].includes(cont.payEl[acc.payElID].method.code) ? (acc.accrualSum || 0) : 0
        return sum
      }, 0)
      break
    }
    case '3':
    case '6':
    case '7':
    case '8': {
      baseSum = accrualList.reduce((sum, acc) => {
        sum += ['145'].includes(cont.payEl[acc.payElID].method.code) ? (acc.accrualSum || 0) : 0
        return sum
      }, 0)
      break
    }
    case '9': {
      baseSum = accrualList.reduce((sum, acc) => {
        const el = cont.dict.trf_dictAccrualDt.find(e => e.peyElID === acc.peyElID && e.calcRuleID === '9')
        if (el) return el.sumCalc
      }, 0)
      break
    }
  }
  return accrualService.round(baseSum, 6)
}

function getTarif (cont, dictTarifCoeffID, onDate) {
  const dictTarifCoeffDet = cont.dict.hr_dictTarifCoeffDet.find(o =>
    o.dictTarifCoeffID === dictTarifCoeffID &&
    o.dateFrom <= onDate && o.dateTo >= onDate && o.dictTarifCoeffDateFrom <= onDate && o.dictTarifCoeffDateTo >= onDate)
  return dictTarifCoeffDet ? dictTarifCoeffDet.accrualSum : 0
}

function applyMaxRate (accr, dictMaxRate, dictAccrual, dictPositionID) {
  accr.flagsFix &= ~(1 << 5) // - "Контроль превышения максимального количества ставок"
  const maxRate = getMaxAccrualRate(accr.payElID, accr.accrualRate, dictMaxRate, dictAccrual, dictPositionID)
  if (accr.accrualRate !== maxRate) {
    accr.accrualRate = maxRate
    accr.flagsFix &= ~(1 << 1) // - "Количество ставок откорректировано вручную"
    accr.flagsFix |= (1 << 5) // + "Контроль превышения максимального количества ставок"
  }
}

function getMaxAccrualRate (payElID, accrualRate, dictMaxRate, dictAccrual, dictPositionID) {
  dictPositionID = 0 // 03/12/2021 Зауваження ДУО: контроль по усім штатним позиціям (посадовим місцям), незалежно від посади
  // Ограничение по 1 ставке для каждой должности
  if (accrualRate && accrualRate > 1 && ['4', '6'].includes(dictAccrual.calcRuleID)) {
    accrualRate = 1
  }
  // Ограничение по 1 ставке для всех должностей в совокупности
  let accrualMaxRate = ['5', '7'].includes(dictAccrual.calcRuleID) ? 1 : 0
  if (dictAccrual.maxRate) { accrualMaxRate = accrualMaxRate ? Math.min(accrualMaxRate, dictAccrual.maxRate) : dictAccrual.maxRate }
  if (accrualMaxRate) {
    let index = dictMaxRate.findIndex(o => o.payElID === payElID && o.dictPositionID === dictPositionID)
    if (index < 0) {
      index = dictMaxRate.push({
        payElID: payElID,
        dictPositionID,
        maxRate: accrualMaxRate
      }) - 1
    }
    if (index >= 0) {
      const maxRate = Math.min(accrualRate, dictMaxRate[index].maxRate)
      if (accrualRate !== maxRate) {
        accrualRate = maxRate
      }
      dictMaxRate[index].maxRate -= maxRate
    }
  }
  return accrualRate
}

function getLedAccrual (cont, forAccrual, allAccruals) {
  let index = allAccruals.findIndex(led => {
    return ['146', '147', '156'].includes(cont.payEl[led.payElID].method.code) &&
      led.dictPupilID === forAccrual.dictPupilID &&
      cont.payEl[forAccrual.payElID].payElEntryTime.find(o => o.payElBaseID === led.payElID) // !== null
  })
  if (index >= 0) {
    return allAccruals[index]
  }
  if (!(forAccrual.flagsFix & (1 << 6))) {
    index = allAccruals.findIndex(led => {
      return ['146', '147', '156'].includes(cont.payEl[led.payElID].method.code) &&
        cont.payEl[forAccrual.payElID].payElEntryTime.find(o => o.payElBaseID === led.payElID) &&
        !allAccruals.find(sub => {
          return sub.payElID === forAccrual.payElID && sub.dictPupilID === led.dictPupilID
        })
    })
    if (index >= 0) {
      return allAccruals[index]
    }
  }
  return null
}

function removeEmptyAutoPushedAccruals (accrual) {
  if (accrual.length) {
    for (let i = accrual.length - 1; i >= 0; i--) {
      if (accrual[i].autoPushed) {
        if (!accrual[i].rate) {
          accrual.splice(i, 1)
        } else {
          delete accrual[i].autoPushed
        }
      }
    }
  }
}

function getDictPositionAccrualSum (cont, dictPositionID, onDate) {
  const position = cont.dict.hr_dictPositionDt.find(o => o.dictPositionID === dictPositionID && o.dateFrom <= onDate && o.dateTo >= onDate)
  return position ? position.accrualSum : null
}

function recalcAccrual ({ orgID, cont, onDate, workPlace, position, accrual, params = {} }) {
  accrual.forEach(accr => {
    if (!(params.include && !params.include.includes(cont.payEl[accr.payElID].method.code)) &&
      !(params.exclude && params.exclude.includes(cont.payEl[accr.payElID].method.code))) {
      switch (cont.payEl[accr.payElID].method.code) {
        case '1': {
          const pos = cont.employeeNumberID ? cont.emp[cont.employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= onDate && o.dateTo >= onDate) : null
          const basePos = pos && (cont.payEl[accr.payElID].method.code === cont.payEl[pos.payElID].method.code) ? pos : null
          if (!(accr.flagsFix & 1 << 0)) {
            const dictPositionAccrualSum = getDictPositionAccrualSum(cont, position.dictPositionID, onDate)
            accr.baseSum = dictPositionAccrualSum || (basePos ? basePos.accrualSum : 0)
          }
          if (!(accr.flagsFix & 1 << 1)) {
            accr.accrualRate = basePos && basePos.rate ? basePos.rate : 1
          }
          if (!(accr.flagsFix & 1 << 4)) {
            accr.accrualSum = accrualService.round(accr.baseSum * accr.accrualRate)
          }
          break
        }
        case '4':
        case '154':
        case '155': {
          const dictAccrualDt = findDictAccrualDt(cont.dict.trf_dictAccrualDt, accr.payElID, orgID, position.dictPositionID, position.dictQualificationID, position.dictSubjectID, accr.dictPupilID, onDate)
          
          if (!(accr.flagsFix & 1 << 1)) {
            accr.accrualRate = ['1', '2', '3'].includes(dictAccrualDt.calcRuleID) ? 1 : position.rate
            if (dictAccrualDt && dictAccrualDt.calcRuleID === '9') {
              if (!dictAccrualDt.rate) dictAccrualDt.rate =  100
              const wplace = cont.emp[cont.employeeNumberID].prop.employeePositions[cont.emp[cont.employeeNumberID].prop.employeePositions.length - 1].workPlace
              let allSubjects = false
              if (position.posIndex === 1 && params.positions.length > 1) {
               const alls = params.positions.reduce((sum,pos) => {sum+=pos.dictSubjectID === position.dictSubjectID?1:0
                return sum
                },0)
                if (alls === params.positions.length) allSubjects = true
                if (!allSubjects) {
                  const allp = params.positions.reduce((sum,pos) => {sum+=pos.dictPositionID === position.dictPositionID?1:0
                  return sum
                  },0)
                  if (allp === params.positions.length) allSubjects = true
                }
              }
              if (position.posIndex === 1 && position.rate<1 && (!wplace || wplace==='1') && !allSubjects) accr.accrualRate = 1
            }
          }
          applyMaxRate(accr, params.maxRate, dictAccrualDt, position.dictPositionID)
          if (!(accr.flagsFix & 1 << 0)) {
            accr.baseSum = dictAccrualDt && dictAccrualDt.calcRuleID === '9' ? dictAccrualDt.sumCalc : getBaseSum(cont, accr, dictAccrualDt.calcRuleID, accrual, onDate)
            accr.baseSum = accr.baseSum * accr.accrualRate
          }
          if (!(accr.flagsFix & 1 << 2)) {
            accr.rate = dictAccrualDt ? (dictAccrualDt.rate || 0) : 0
          }
          if (!accr.rate && !(accr.flagsFix & 1 << 0)) {
            accr.baseSum = 0
          }
          if (!(accr.flagsFix & 1 << 4)) {
            accr.accrualSum = accrualService.round(accr.baseSum * accr.rate / 100)
          }
          break
        }
        case '5': {
          const dictAccrualDt = findDictAccrualDt(cont.dict.trf_dictAccrualDt, accr.payElID, orgID, position.dictPositionID, position.dictQualificationID, position.dictSubjectID, accr.dictPupilID, onDate)
          if (!(accr.flagsFix & 1 << 1)) {
            accr.accrualRate = position.rate
          }
          applyMaxRate(accr, params.maxRate, dictAccrualDt, position.dictPositionID)
          if (!(accr.flagsFix & 1 << 0)) {
            if (position.dictRankID) {
              const dictSalaryRank = cont.dict.hr_dictSalaryRank.find(o => o.dictRankID === position.dictRankID &&
                o.dateFrom <= onDate && o.dateTo >= onDate)
              accr.baseSum = dictSalaryRank ? (dictSalaryRank.paySum || 0) : 0
              accr.baseSum = accr.baseSum * accr.accrualRate
            } else {
              accr.baseSum = 0
            }
          }
          if (!(accr.flagsFix & 1 << 2)) {
            accr.rate = dictAccrualDt ? (dictAccrualDt.rate || 100) : 100
          }
          if (!accr.rate && !(accr.flagsFix & 1 << 0)) {
            accr.baseSum = 0
          }
          if (!(accr.flagsFix & 1 << 4)) {
            accr.accrualSum = accrualService.round(accr.baseSum * accr.rate / 100)
          }
          break
        }
        case '6': {
          const dictAccrualDt = findDictAccrualDt(cont.dict.trf_dictAccrualDt, accr.payElID, orgID, position.dictPositionID, position.dictQualificationID, position.dictSubjectID, accr.dictPupilID, onDate)
          if (!(accr.flagsFix & 1 << 1)) {
            accr.accrualRate = ['1', '2', '3'].includes(dictAccrualDt.calcRuleID) ? 1 : position.rate
          }
          applyMaxRate(accr, params.maxRate, dictAccrualDt, position.dictPositionID)
          if (!(accr.flagsFix & 1 << 0)) {
            accr.baseSum = getBaseSum(cont, accr, dictAccrualDt.calcRuleID, accrual, onDate)
            accr.baseSum = accr.baseSum * accr.accrualRate
          }
          if (!(accr.flagsFix & 1 << 2)) {
            const experience = cont.employeeNumberID ? algorithmService.getExpirience(cont, accr.payElID, onDate, true) : null
            accr.rate = experience ? experience.rate : 0
          }
          if (!accr.rate && !(accr.flagsFix & 1 << 0)) {
            accr.baseSum = 0
          }
          if (!(accr.flagsFix & 1 << 4)) {
            accr.accrualSum = accrualService.round(accr.baseSum * accr.rate / 100)
          }
          break
        }
        case '143': {
          if (!(accr.flagsFix & 1 << 0)) {
            if (position.dictTarifCoeffID) {
              const dictTarifCoeffDet = cont.dict.hr_dictTarifCoeffDet.find(o => o.dictTarifCoeffID === position.dictTarifCoeffID &&
                o.dateFrom <= onDate && o.dateTo >= onDate)
              accr.baseSum = dictTarifCoeffDet ? dictTarifCoeffDet.accrualSum : 0
            } else {
              accr.baseSum = 0
            }
          }
          if (!(accr.flagsFix & 1 << 2)) {
            const dictAccrualDt = findDictAccrualDt(cont.dict.trf_dictAccrualDt, accr.payElID, orgID, position.dictPositionID, position.dictQualificationID, position.dictSubjectID, null, onDate)
            accr.rate = dictAccrualDt ? (dictAccrualDt.rate || 100) : 100 // Коефіцієнт
          }
          if (!accr.rate && !(accr.flagsFix & 1 << 0)) {
            accr.baseSum = 0
          }
          if (!(accr.flagsFix & 1 << 4)) {
            accr.accrualSum = accrualService.round(accr.baseSum * accr.rate / 100) // Коефіцієнт
          }
          accr.hours = null
          accr.dictPupilID = null
          accr.accrualRate = null
          break
        }
        case '144': {
          const dictAccrualDt = findDictAccrualDt(cont.dict.trf_dictAccrualDt, accr.payElID, orgID, position.dictPositionID, position.dictQualificationID, position.dictSubjectID, accr.dictPupilID, onDate)
          if (!(accr.flagsFix & 1 << 0)) {
            accr.baseSum = cont.payEl[accr.payElID].dictTarifCoeffID
              ? getTarif(cont, cont.payEl[accr.payElID].dictTarifCoeffID, onDate)
              : getBaseSum(cont, accr, '2', accrual, onDate)
          }
          if (!(accr.flagsFix & 1 << 2)) {
            accr.rate = dictAccrualDt ? (dictAccrualDt.rate || 0) : 0
          }
          if (!accr.rate && !(accr.flagsFix & 1 << 0)) {
            accr.baseSum = 0
          }
          if (!(accr.flagsFix & 1 << 4)) {
            accr.accrualSum = accrualService.round(accr.baseSum * accr.rate / 100)
          }
          accr.hours = null
          accr.dictPupilID = null
          accr.accrualRate = null
          break
        }
        case '145': {
          if (!(accr.flagsFix & 1 << 4)) {
            accr.accrualSum = accrualService.round(accrual.reduce((sum, acc) => {
              sum += ['143', '144', '152'].includes(cont.payEl[acc.payElID].method.code) ? (acc.accrualSum || 0) : 0
              return sum
            }, 0))
          }
          accr.rate = null
          accr.baseSum = null
          accr.hours = null
          accr.dictPupilID = null
          accr.accrualRate = null
          break
        }
        case '146': {
          if (!(accr.flagsFix & 1 << 0)) {
            accr.baseSum = accrual.reduce((sum, acc) => {
              sum += ['143', '144', '152'].includes(cont.payEl[acc.payElID].method.code) ? (acc.accrualSum || 0) : 0
              return sum
            }, 0)
          }

          let weekHours = 0
          // if (position.workScheduleID) {
          //   const workSchedule = cont.dict.hr_workSchedule.find(o => o.ID === position.workScheduleID)
          //   weekHours = workSchedule ? (workSchedule.weekHours || 0) : 0
          // }
          if (position.workNormID) {
            const workNorm = cont.dict.trf_workNorm.find(o => o.ID === position.workNormID)
            weekHours = workNorm ? (workNorm.weekHours || 0) : 0
          }

          if (!(accr.flagsFix & 1 << 3)) {
            // const usedHours = accrual.reduce((a, b) => { return (b !== accr && cont.payEl[b.payElID].method.code === '146') ? a + b.hours : a }, 0)
            // accr.hours = Math.max(0, weekHours - usedHours)
            accr.hours = 0
          }
          if (!(accr.flagsFix & 1 << 1)) {
            accr.accrualRate = weekHours === 0 ? 0 : accr.hours / weekHours
            // accr.accrualRate = accrualService.round(accr.accrualRate, 4)
            // accr.accrualRate = accrualService.trunc(accr.accrualRate, 6)
          }
          if (!(accr.flagsFix & 1 << 4)) {
            accr.accrualSum = accrualService.round(accr.baseSum * accr.accrualRate)
          }
          break
        }
        case '156':
        case '147': {
          if (!(accr.flagsFix & 1 << 2)) {
            accr.rate = 100
          }
          if (!(accr.flagsFix & 1 << 0)) {
            accr.baseSum = accrual.reduce((sum, acc) => {
              sum += ['143', '144', '152'].includes(cont.payEl[acc.payElID].method.code) ? (acc.accrualSum || 0) : 0
              return sum
            }, 0)
            accr.baseSum = accr.baseSum * accr.rate / 100
          }
          if (!(accr.flagsFix & 1 << 1)) {
            accr.accrualRate = 1
          }
          if (!(accr.flagsFix & 1 << 4)) {
            accr.accrualSum = accrualService.round(accr.baseSum * accr.accrualRate)
          }
          break
        }
        case '148': {
          const dictAccrualDt = findDictAccrualDt(cont.dict.trf_dictAccrualDt, accr.payElID, orgID, position.dictPositionID, position.dictQualificationID, position.dictSubjectID, accr.dictPupilID, onDate)
          const ledAccrual = getLedAccrual(cont, accr, accrual)
          if (!(accr.flagsFix & 1 << 6) && ledAccrual) {
            accr.dictPupilID = ledAccrual.dictPupilID
          }
          let weekHours = 0
          // if (position.workScheduleID) {
          //   const workSchedule = cont.dict.hr_workSchedule.find(o => o.ID === position.workScheduleID)
          //   weekHours = workSchedule ? (workSchedule.weekHours || 0) : 0
          // }
          if (position.workNormID) {
            const workNorm = cont.dict.trf_workNorm.find(o => o.ID === position.workNormID)
            weekHours = workNorm ? (workNorm.weekHours || 0) : 0
          }

          if (!(accr.flagsFix & 1 << 1)) {
            accr.accrualRate = 100
          }

          const isAutoHours = dictAccrualDt ? dictAccrualDt.isAutoHours : false

          if (!(accr.flagsFix & 1 << 3)) {
            accr.hours = isAutoHours && ledAccrual ? ledAccrual.hours : null // weekHours
          }

          // Для пед.надбавки спеціальна обробка обмеження кількості ставок
          accr.flagsFix &= ~(1 << 5)
          if (weekHours && accr.hours) {
            let accrualRate = accr.hours / weekHours
            // accrualRate = accrualService.round(accrualRate, 4)
            // accrualRate = accrualService.trunc(accrualRate, 6)
            const maxAccrualRate = getMaxAccrualRate(accr.payElID, accrualRate, params.maxRate, dictAccrualDt, position.dictPositionID)
            if (accrualRate !== maxAccrualRate) {
              accrualRate = maxAccrualRate
              accr.flagsFix &= ~(1 << 1)
              accr.flagsFix |= (1 << 5)
              accr.hours = isAutoHours && (ledAccrual && ledAccrual.hours) ? weekHours * accrualRate : null
            }
          }

          if (!(accr.flagsFix & 1 << 0)) {
            accr.baseSum = getBaseSum(cont, accr, dictAccrualDt.calcRuleID, accrual, onDate)
            accr.baseSum = accr.baseSum * (accr.accrualRate / 100)
            if (dictAccrualDt.calcRuleID !== '1') {
              let accrualRate = weekHours ? accr.hours / weekHours : 0
              // accrualRate = accrualService.round(accrualRate, 4)
              // accrualRate = accrualService.trunc(accrualRate, 6)
              accr.baseSum = accr.baseSum * accrualRate
            }
          }
          if (!(accr.flagsFix & 1 << 2)) {
            accr.rate = dictAccrualDt ? (dictAccrualDt.rate || 0) : 0
          }
          if (!(accr.flagsFix & 1 << 4)) {
            accr.accrualSum = accrualService.round(accr.baseSum * (accr.rate / 100))
          }
          break
        }
        case '152': {
          const dictAccrual = findDictAccrualDt(cont.dict.trf_dictAccrualDt, accr.payElID, orgID, position.dictPositionID, position.dictQualificationID, position.dictSubjectID, accr.dictPupilID, onDate)
          if (!(accr.flagsFix & 1 << 0)) {
            accr.baseSum = cont.payEl[accr.payElID].dictTarifCoeffID
              ? getTarif(cont, cont.payEl[accr.payElID].dictTarifCoeffID, onDate)
              : getBaseSum(cont, accr, '2', accrual, onDate)
          }
          if (!(accr.flagsFix & 1 << 2)) {
            if (position.dictEducationRankID) {
              const dictEducationRankRate = cont.dict.trf_dictEducationRankRate.find(o => o.dictEducationRankID === position.dictEducationRankID &&
                o.dateFrom <= onDate && o.dateTo >= onDate)
              accr.rate = dictEducationRankRate ? (dictEducationRankRate.rate || 0) : 0
            } else {
              accr.rate = dictAccrual ? (dictAccrual.rate || 0) : 0
            }
          }
          if (!accr.rate && !(accr.flagsFix & 1 << 0)) {
            accr.baseSum = 0
          }
          if (!(accr.flagsFix & 1 << 4)) {
            accr.accrualSum = accrualService.round(accr.baseSum * accr.rate / 100)
          }
          accr.hours = null
          accr.dictPupilID = null
          accr.accrualRate = null
          break
        }
      }
      // Атрибуты, для которых нужно читать наименования, могут быть определены в процессе расчёта,
      // например Категория учащихся - из записи ведущей системы оплаты.
      // Перенёс заполнение наименований после расчёта.
      if (params.setDescription) {
        accr['payElID.description'] = cont.payEl[accr.payElID].description
        accr['payElID.methodID.code'] = cont.payEl[accr.payElID].method.code
        accr['dictPupilID.name'] = accr.dictPupilID ? cont.dict.trf_dictPupil.find(o => o.ID === accr.dictPupilID).name : ''
      }
    }
  })
}

function findDictAccrualDt (dict, payElID, orgID, dictPositionID, dictQualificationID, dictSubjectID, dictPupilID, onDate) {
  const dictAccrualDt = dict.find(row => {
    return row.payElID === payElID && row.dateFrom <= onDate && row.dateTo >= onDate &&
      (row.orgList.length === 0 || (row.excludeOrg && !row.orgList.includes(orgID)) || (!row.excludeOrg && row.orgList.includes(orgID))) &&
      (row.positionList.length === 0 || (row.excludePosition && !row.positionList.includes(dictPositionID)) || (!row.excludePosition && row.positionList.includes(dictPositionID))) &&
      (row.qualificationList.length === 0 || (row.excludeQualification && !row.qualificationList.includes(dictQualificationID)) || (!row.excludeQualification && row.qualificationList.includes(dictQualificationID))) &&
      (row.subjectList.length === 0 || (row.excludeSubject && !row.subjectList.includes(dictSubjectID)) || (!row.excludeSubject && row.subjectList.includes(dictSubjectID))) &&
      (row.pupilList.length === 0 || (row.excludePupil && !row.pupilList.includes(dictPupilID)) || (!row.excludePupil && row.pupilList.includes(dictPupilID)))
  })
  return dictAccrualDt || { calcRuleID: '1' }
}

function getEmpData (employeeNumberID) {
  const result = {}
  result.employeeNumber = UB.Repository('hr_employeeNumberSR').attrs(['ID', 'employeeID', 'orgID', 'dateFrom', 'dateTo', 'payOutID', 'personalAccount']).selectById(employeeNumberID)
  if (result.employeeNumber) {
    result.employeeNumber.dateFrom = dateService.shiftDate(result.employeeNumber.dateFrom)
    result.employeeNumber.dateTo = dateService.shiftDate(result.employeeNumber.dateTo)
    result.employeePositions = UB.Repository('hr_employeePositionS')
      .attrs(['ID', 'employeeID', 'employeeNumberID', 'organizationID', 'departmentID', 'positionID', 'dateFrom', 'dateTo',
        'workScheduleID', 'workScheduleID.daysWork',
        'dictPositionID.workNormID',
        'dictPositionID.workNormID.weekHours',
        'mtCount', 'dictStaffCatID', 'workerType', 'workPlace', 'dictFundSourceID', 'dictProgClassID', 'dictCategoryECBID',
        'contractType', 'dictContractKindID', 'dictTarifCoeffID', 'payElID', 'accrualSum', 'raiseSalary', 'isIndex',
        'dictPositionID', 'accountID', 'd0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9',
        'd0Value', 'd1Value', 'd2Value', 'd3Value', 'd4Value', 'd5Value', 'd6Value', 'd7Value', 'd8Value', 'd9Value', 'dictStaffCatID.accCategory',
        'mi_modifyDate'
      ])
      .where('employeeNumberID', '=', employeeNumberID)
      .orderBy('dateFrom')
      .selectAsObject({
        'dictPositionID.workNormID': 'workNormID',
        'dictPositionID.workNormID.weekHours': 'workNormID.weekHours'
      })
    result.employeePositions.forEach(row => {
      row.dateFrom = dateService.shiftDate(row.dateFrom)
      row.dateTo = dateService.shiftDate(row.dateTo)
    })

    result.workBookDet = UB.Repository('hr_employeeWorkbookDt')
      .attrs(['ID', 'dateFrom', 'dateTo', 'dictExperienceID', 'coefficient'])
      .where('employeeWorkbookID.employeeID', '=', employeeNumberID)
      .orderBy('dateFrom')
      .selectAsObject()
    result.workBookDet.forEach(row => {
      row.dateFrom = dateService.shiftDate(row.dateFrom)
      row.dateTo = dateService.shiftDate(row.dateTo)
    })

    result.experience = []
    result.experienceDt = []
    const experience = UB.Repository('hr_employeeExperience')
      .attrs(['ID', 'dictExperienceID', 'calcDate', 'employeeNumberID', 'employeeID', 'startCalcDate'])
      .where('employeeID', '=', result.employeeNumber.employeeID)
      .where('employeeNumberID', '=', employeeNumberID, 'empNum')
      .where('employeeNumberID', 'isNull', undefined, 'empNumNull')
      .where('dictExperienceID.mi_deleteDate', '>=', '#maxdate')
      .logic('([empNum] OR [empNumNull])')
      .orderBy('dictExperienceID')
      .orderByDesc('employeeNumberID')
      .selectAsObject()

    const experienceDetails = UB.Repository('hr_employeeExperienceDt')
      .attrs(['ID', 'employeeExperienceID.employeeID', 'employeeExperienceID.employeeNumberID',
        'employeeExperienceID.dictExperienceID', 'dateFrom', 'dateTo', 'koef'])
      .where('employeeExperienceID', 'in', experience.map(o => o.ID))
      .where('employeeExperienceID.mi_deleteDate', '>=', '#maxdate')
      .selectAsObject({
        'employeeExperienceID.dictExperienceID': 'dictExperienceID',
        'employeeExperienceID.employeeID': 'employeeID',
        'employeeExperienceID.employeeNumberID': 'employeeNumberID'
      })
    experience.forEach(row => {
      row.calcDate = dateService.shiftDate(row.calcDate)
      if (row.employeeNumberID || !experience.find(o => o.dictExperienceID === row.dictExperienceID && !!o.employeeNumberID)) {
        result.experience.push(row)
        experienceDetails.filter(o => o.employeeNumberID === row.employeeNumberID && o.dictExperienceID === row.dictExperienceID).forEach(det => {
          result.experienceDt.push(det)
        })
      }
    })

    result.education = UB.Repository('hr_employeeEducation')
      .attrs(['ID', 'dictEducationLevelID', 'isMain', 'mi_modifyDate'])
      .where('employeeID', '=', result.employeeNumber.employeeID)
      .where('dictEducationLevelID', 'isNotNull')
      .orderByDesc('isMain')
      .selectAsObject()

    result.employeeAccrual = UB.Repository('hr_employeeAccrual')
      .attrs(['ID', 'payElID', 'dateFrom', 'dateTo'])
      .where('employeeNumberID', '=', employeeNumberID, 'empNum')
      .orderBy('dateFrom')
      .selectAsObject()
    result.employeeAccrual.forEach(row => {
      row.dateFrom = dateService.shiftDate(row.dateFrom)
      row.dateTo = dateService.shiftDate(row.dateTo)
    })
  }

  return result
}

function calculateShift (orderParams) {
  const cont = {}
  const errorMessages = []
  const orgID = orderParams.orgID
  const rlService = require('../../HR/modules/rlService')
  // Дані працівника (призначення, нарахування, табель)
  rlService.getCalcAccrual(cont, orgID, [orderParams.employeeNumberID], orderParams.periodCalcID, `Order: ${orderParams.orderID} `, {
    prop: true,
    accrual: false,
    skipSecondJobs: false
  })
  if (!cont.dict) { cont.dict = loadDict({ orgID }) }
  cont.employeeNumberID = orderParams.employeeNumberID
  const periodSalary = periodService.getPeriod(orderParams.periodSalaryID)
  const periodCalc = cont.periodCalc || periodService.getPeriod(orderParams.periodCalcID)
  orderParams.dateFrom = dateService.shiftDate(Math.max(cont.emp[cont.employeeNumberID].prop.employeeNumber.startWork, periodSalary.dateFrom, dateService.shiftDate(orderParams.dateFrom)))
  orderParams.dateTo = dateService.shiftDate(Math.min(cont.emp[cont.employeeNumberID].prop.employeeNumber.finishWork, periodSalary.dateTo, dateService.shiftDate(orderParams.dateTo)))
  const accruals = []
  if (cont.emp[cont.employeeNumberID].prop && cont.emp[cont.employeeNumberID].prop.employeeNumber && cont.emp[cont.employeeNumberID].prop.employeeNumber.empWorkPlace === '5' &&
    cont.emp[cont.employeeNumberID].prop.employeeNumber.mainEmpNumberID) {
    orderParams.mainEmpNumberID = cont.emp[cont.employeeNumberID].prop.employeeNumber.mainEmpNumberID
  }
  const employeePosition = cont.emp[cont.employeeNumberID].prop.employeePositions.find(pos => pos.dateFrom <= orderParams.dateFrom && pos.dateTo >= orderParams.dateFrom) || {}
  const trfPositions = getShiftPositions(orderParams.mainEmpNumberID || orderParams.employeeNumberID, employeePosition.dictPositionID || 0, orderParams.dateFrom, orderParams.dateTo, errorMessages) // makeShiftPositions(orderParams)
  let extraAccruals = orderParams.payElIDs && orderParams.payElIDs.length ? orderParams.payElIDs : []
  if (orderParams.accruals && orderParams.accruals.length) {
    extraAccruals = extraAccruals.concat(orderParams.accruals.map(o => o.payElID))
  }
  // Нарахування, що додаються автоматично у документ Заміна при створенні документу
  if (orderParams.addAutoAccruals) {
    payElService.filterPayEl({ cont, methodCodes: ['4', '6'] })
      .forEach(ID => {
        if (cont.payEl[ID].isAutoCalc &&
          cont.payEl[ID].payElEntryTime.find(o => o.dateFrom <= orderParams.dateFrom && o.dateTo >= orderParams.dateFrom && o.payElBaseID === orderParams.payElID)) {
          extraAccruals.push(ID)
        }
      })
  }

  extraAccruals = extraAccruals
    .filter(o => o !== orderParams.payElID)
    .filter((o, index, self) => { return self.indexOf(o) === index })
  const timeSheets = algorithmService.getTimeSheetByPeriod(periodSalary, cont)

  const workSchedule = cont.dict.hr_workSchedule.find(o => o.ID === employeePosition.workScheduleID)
  const workNorm = cont.dict.trf_workNorm.find(o => o.ID === orderParams.workNormID)

  /* if (!orderParams.trfPositionID && trfPositions && trfPositions.length) {
    orderParams.workNormID = trfPositions[0].workNormID
    orderParams.dictTarifCoeffID = trfPositions[0].dictTarifCoeffID
    orderParams.trfPositionID = trfPositions[0].ID
  } */
  const planTime = getShiftPlanTime(orgID, employeePosition.workScheduleID, orderParams.rateType, periodSalary.dateFrom)

  if (workSchedule && workNorm && workSchedule.weekHours && workNorm.weekHours && workSchedule.weekHours !== workNorm.weekHours) {
    planTime.hours = accrualService.round(planTime.hours * workNorm.weekHours / workSchedule.weekHours)
  }

  trfPositions.forEach((position) => {
    // const workNorm = getShiftWorkNorm(cont, orderParams.workNormID || position.workNormID, orderParams.rateType, position.dateFrom)
    // Main accrual
    const mainAccrual = makeShiftAccrual(cont, orderParams.employeeNumberID, orderParams.payElID, position, orderParams.accruals)
    mainAccrual.dateFrom = dateService.shiftDate(Math.max(mainAccrual.dateFrom, orderParams.dateFrom))
    mainAccrual.dateTo = dateService.shiftDate(Math.min(mainAccrual.dateTo, orderParams.dateTo))
    if (mainAccrual.dateFrom > mainAccrual.dateTo) { return }
    mainAccrual.planDays = planTime.days
    mainAccrual.planHours = planTime.hours // workNorm
    if (!(mainAccrual.flagsFix & 1)) {
      const baseAccrual = position.accrual.find(o => cont.payEl[o.payElID].method.code === '145') || position.accrual.find(o => cont.payEl[o.payElID].method.code === '143')
      mainAccrual.baseSum = baseAccrual ? baseAccrual.accrualSum : 0
      if (!mainAccrual.baseSum) {
        if (!cont.dict.hr_dictTarifCoeffDet) cont.dict.hr_dictTarifCoeffDet = getDictTarifCoeffDet()
        mainAccrual.baseSum = getTarif(cont, orderParams.dictTarifCoeffID || position.dictTarifCoeffID, orderParams.dateFrom)
      }
    }
    mainAccrual.rate = !(mainAccrual.flagsFix & 1 << 9) ? 100 : mainAccrual.rate
    const payTime = algorithmService.getTimeByTimeSheet({ cont, payElID: mainAccrual.payElID, timeSheets, dateFrom: position.dateFrom, dateTo: position.dateTo })
    mainAccrual.flagsRec |= 1 << 1
    mainAccrual.flagsRec &= ~(1 << 5)
    mainAccrual.flagsRec |= (orderParams.calcTimeType === 'HOUR' ? 1 << 5 : 0)
    mainAccrual.days = orderParams.days // || ((mainAccrual.flagsFix & (1 << 6)) ? mainAccrual.days : Math.min(payTime.days, mainAccrual.planDays))
    mainAccrual.hours = orderParams.hours // || ((mainAccrual.flagsFix & (1 << 7)) ? mainAccrual.hours : workNorm * mainAccrual.days / mainAccrual.planDays)
    mainAccrual.mask = payTime.mask
    mainAccrual.hoursByDays = payTime.hoursByDays
    mainAccrual.planHoursByDays = payTime.planHoursByDays
    if (!(mainAccrual.flagsFix & 1 << 14) && position.dictFundSourceID) {
      mainAccrual.dictFundSourceID = position.dictFundSourceID
      mainAccrual['dictFundSourceID.name'] = position['dictFundSourceID.name']
    }
    if (!(mainAccrual.flagsFix & 1 << 24) && position.dictProgClassID) {
      mainAccrual.dictProgClassID = position.dictProgClassID
      mainAccrual['dictProgClassID.name'] = position['dictProgClassID.name']
    }
    Object.assign(mainAccrual, algorithmShift.run({
      cont,
      periodCalc,
      periodSalary: periodCalc,
      params: mainAccrual,
      dictFundSourceID: mainAccrual.dictFundSourceID,
      dictProgClassID: mainAccrual.dictProgClassID,
      sourceAccr: {
        dictFundSourceID: mainAccrual.dictFundSourceID,
        dictProgClassID: mainAccrual.dictProgClassID
      }
    }))
    accruals.push(mainAccrual)

    if (!orderParams.planDays) { orderParams.planDays = mainAccrual.planDays }
    if (!orderParams.planHours) { orderParams.planHours = mainAccrual.planHours }
    if (!orderParams.days) { orderParams.days = mainAccrual.days }
    if (!orderParams.hours) { orderParams.hours = mainAccrual.hours }

    // Extra accruals
    cont.emp[cont.employeeNumberID].accrual = [mainAccrual] // для подальшого розрахунку вихідної суми від факту
    extraAccruals.sort((a, b) => cont.payEl[b].payElEntrySum.find(o => o.payElBaseID === a && o.dateFrom <= position.dateTo && o.dateTo >= position.dateFrom) ? -1 : 1)
      .forEach(payElID => {
        const extraAccrual = makeShiftAccrual(cont, orderParams.employeeNumberID, payElID, position, orderParams.accruals)
        extraAccrual.dateFrom = dateService.shiftDate(Math.max(extraAccrual.dateFrom, mainAccrual.dateFrom))
        extraAccrual.dateTo = dateService.shiftDate(Math.min(extraAccrual.dateTo, mainAccrual.dateTo))
        if (extraAccrual.dateFrom > extraAccrual.dateTo) { return }
        const trfExtraAccrual = position.accrual.find(o => o.payElID === payElID && o.dateFrom <= extraAccrual.dateTo && o.dateTo >= extraAccrual.dateFrom)
        if (!orderParams.reload || trfExtraAccrual) {
          let accrualDt = mainAccrual.accrualDt
          if (!(extraAccrual.flagsFix & 1)) {
            const fact = algorithmService.getFactSum({
              withDetail: true,
              cont,
              payElID,
              periodCalc: periodCalc,
              periodSalary: periodCalc,
              dateFrom: extraAccrual.dateFrom,
              dateTo: extraAccrual.dateTo
            })
            if (fact.accrualDt) {
              accrualDt = fact.accrualDt
            }
            extraAccrual.baseSum = mainAccrual.baseSum // fact.factSum
          }
          if (!(extraAccrual.flagsFix & 1 << 9)) {
            if (cont.payEl[payElID].method.code === '6') {
              const experience = cont.employeeNumberID ? algorithmService.getExpirience(cont, payElID, extraAccrual.dateFrom, true) : null
              extraAccrual.rate = experience ? experience.rate : 0
            } else if (trfExtraAccrual && trfExtraAccrual.rate) {
              extraAccrual.rate = trfExtraAccrual.rate
            } else {
              if (!cont.dict) {
                cont.dict = loadDict({ orgID })
              }
              if (!cont.dict.trf_dictAccrualDt) {
                cont.dict.trf_dictAccrualDt = getDictAccrualDt({ orgID })
              }
              const dictAccrualDt = findDictAccrualDt(cont.dict.trf_dictAccrualDt, payElID, orgID, position.dictPositionID, position.dictQualificationID, null, null, extraAccrual.dateFrom)
              if (dictAccrualDt) {
                extraAccrual.rate = dictAccrualDt.rate
              }
            }
          }
          extraAccrual.flagsRec |= 1 << 1
          extraAccrual.flagsRec &= ~(1 << 5)
          extraAccrual.flagsRec |= (orderParams.calcTimeType === 'HOUR' ? 1 << 5 : 0)
          extraAccrual.planDays = (extraAccrual.flagsFix & (1 << 4)) ? extraAccrual.planDays : mainAccrual.planDays
          extraAccrual.planHours = (extraAccrual.flagsFix & (1 << 5)) ? extraAccrual.planDays : mainAccrual.planHours
          extraAccrual.days = (extraAccrual.flagsFix & (1 << 6)) ? extraAccrual.days : mainAccrual.days
          extraAccrual.hours = (extraAccrual.flagsFix & (1 << 7)) ? extraAccrual.hours : mainAccrual.hours
          extraAccrual.mask = mainAccrual.mask
          extraAccrual.hoursByDays = mainAccrual.hoursByDays
          extraAccrual.planHoursByDays = mainAccrual.planHoursByDays
          if (!(extraAccrual.flagsFix & 1 << 14) && position.dictFundSourceID) {
            extraAccrual.dictFundSourceID = position.dictFundSourceID
            extraAccrual['dictFundSourceID.name'] = position['dictFundSourceID.name']
          }
          if (!(extraAccrual.flagsFix & 1 << 24) && position.dictProgClassID) {
            extraAccrual.dictProgClassID = position.dictProgClassID
            extraAccrual['dictProgClassID.name'] = position['dictProgClassID.name']
          }
          Object.assign(extraAccrual,
            algorithmSurcharge.run({
              cont,
              periodCalc,
              periodSalary: periodCalc,
              params: extraAccrual,
              sourceAccr: accrualDt
            })
          )
          accruals.push(extraAccrual)
          cont.emp[cont.employeeNumberID].accrual.push(extraAccrual) // для подальшого розрахунку вихідної суми від факту
        }
      })
  })
  accruals.forEach(o => {
    o.dateFrom = dateService.unshiftDate(o.dateFrom)
    o.dateTo = dateService.unshiftDate(o.dateTo)
    o['payElID.methodID.code'] = cont.payEl[o.payElID].method.code
    o['payElID.description'] = cont.payEl[o.payElID].description
  })
  orderParams.accruals = sortAccruals({ cont, accrual: accruals, onDate: orderParams.dateFrom })
  orderParams.docError = errorMessages.length ? errorMessages.join(';') : null
  return orderParams
}

/**
 * Розрахунок стажів працівника для Тарифікації.
 * Перелік стажів обмежується тими, що використовуються у Надбавках і доплатах Тарифікації (trf_dictAccrual).
 * @param employeeNumberID {Number}
 * @param onDate {Date}
 * @returns {Array} Повертає масив Стажі працівника [{ID, years, months, days}], де кількість років > 0 або місяців > 0
 */
function calcEmployeeExperience (params = {}) {
  const employeeExperience = []
  if (!params.employeeNumberID || !params.onDate) return employeeExperience
  const dictExperience = UB.Repository('trf_dictAccrual').attrs(['payElID.dictExperienceID'])
    .where('payElID.mi_deleteDate', '>=', '#maxdate')
    .where('payElID.dateFrom', '<=', params.onDate)
    .where('payElID.dateTo', '>=', params.onDate)
    .joinCondition('payElID.dictExperienceID.mi_deleteDate', '>=', '#maxdate')
    .joinCondition('payElID.dictExperienceID.dateFrom', '<=', params.onDate)
    .joinCondition('payElID.dictExperienceID.dateTo', '>=', params.onDate)
    .groupBy('payElID.dictExperienceID')
    .selectAsObject({ 'payElID.dictExperienceID': 'dictExperienceID' })
  if (dictExperience) {
    dictExperience.forEach(o => {
      const exp = experienceService.calculateExperience(params.employeeNumberID, o.dictExperienceID, params.onDate)
      if (exp.years || exp.months) {
        employeeExperience.push({ ID: o.dictExperienceID, years: exp.years, months: exp.months, days: exp.days })
      }
    })
  }
  return employeeExperience
}

/**
 * Оновлення основної посади працівника у робочому місці тарифікації
 * @param onDate {Date} Дата розрахунку
 * @param positions {Array} Посадові місця робочого місця тарифікації
 * @param employee Відомості працівника: Призначення працівника, Освіта, Стаж і т.і.
 * Увага!
 * Може змінювати елементи масиву positions
 */
function updateWorkPlaceMainPosition (onDate, positions, employee, params = {}) {
  let isUpdated = false
  const employeePosition = employee.prop.employeePositions.find(o => o.dateFrom <= onDate && o.dateTo >= onDate)
  // Тільки для основної посади працівника
  if (employeePosition && employeePosition.dictPositionID) {
    positions.forEach((pos) => {
      if (pos.dictPositionID === employeePosition.dictPositionID) {
        if (employeePosition.dictTarifCoeffID && pos.dictTarifCoeffID !== employeePosition.dictTarifCoeffID &&
          pos.mi_modifyDate && pos.mi_modifyDate < employeePosition.mi_modifyDate) {
          pos.dictTarifCoeffID = employeePosition.dictTarifCoeffID
          isUpdated = true
        }
        // if (employeePosition.workScheduleID && pos.workScheduleID !== employeePosition.workScheduleID &&
        //   pos.mi_modifyDate && pos.mi_modifyDate < employeePosition.mi_modifyDate) {
        //   pos.workScheduleID = employeePosition.workScheduleID
        //   isUpdated = true
        // }
        if (employeePosition.workNormID && pos.workNormID !== employeePosition.workNormID &&
          pos.mi_modifyDate && pos.mi_modifyDate < employeePosition.mi_modifyDate) {
          pos.workNormID = employeePosition.workNormID
          isUpdated = true
        }
        if (employeePosition.dictFundSourceID && pos.dictFundSourceID !== employeePosition.dictFundSourceID &&
          pos.mi_modifyDate && pos.mi_modifyDate < employeePosition.mi_modifyDate) {
          pos.dictFundSourceID = employeePosition.dictFundSourceID
          isUpdated = true
        }
        if (employeePosition.dictProgClassID && pos.dictProgClassID !== employeePosition.dictProgClassID &&
          pos.mi_modifyDate && pos.mi_modifyDate < employeePosition.mi_modifyDate) {
          pos.dictProgClassID = employeePosition.dictProgClassID
          isUpdated = true
        }
        if (employeePosition.dictRankID && pos.dictRankID !== employeePosition.dictRankID &&
          pos.mi_modifyDate && pos.mi_modifyDate < employeePosition.mi_modifyDate) {
          pos.dictRankID = employeePosition.dictRankID
          isUpdated = true
        }
        if (params.setDescription && isUpdated) {
          // Изменение должности происходит относительно нечасто. Поэтому, чтобы не перегружать кэшированные справочники (loadDict) наименованиями,
          // подгружаем необходимые дополнительные сведения запросом. Это происходит только в интерактиве, поэтому допустимо. В пакетных расчётах
          // параметр setDescription будет === false
          const extraData = UB.Repository('hr_employeePositionS')
            .attrs(['dictTarifCoeffID.name', 'workScheduleID.name', 'dictPositionID.workNormID.weekHours',
              'dictFundSourceID.name', 'dictProgClassID.description',
              'dictRankID.description'])
            .where('ID', '=', employeePosition.ID)
            .selectSingle()
          pos['dictTarifCoeffID.name'] = extraData['dictTarifCoeffID.name']
          // pos['workScheduleID.name'] = extraData['workScheduleID.name']
          pos['workNormID.weekHours'] = extraData['dictPositionID.workNormID.weekHours']
          pos['dictFundSourceID.name'] = extraData['dictFundSourceID.name']
          pos['dictProgClassID.description'] = extraData['dictProgClassID.description']
          pos['dictRankID.description'] = extraData['dictRankID.description']
        }
      }
    })
  }
}

function getLastWorkPlaceDate (docType, employeeNumberID, dateFrom, dateTo) {
  const result = UB.Repository('trf_workPlace')
    .attrs('MAX([dateTo])')
    .where('employeeNumberID', '=', employeeNumberID)
    .where('state', '=', 'POSTED')
    .whereIf(docType, 'documentID.type', '=', docType)
    .where('dateFrom', '<=', dateTo)
    .where('dateTo', '>=', dateFrom)
    .selectSingle({ 'MAX([dateTo])': 'maxDateTo' })
  return result ? result.maxDateTo : null
}

function getLastWorkPlaceID (docType, employeeNumberID, onDate) {
  const result = UB.Repository('trf_workPlace')
    .attrs('MAX([ID])')
    .where('employeeNumberID', '=', employeeNumberID)
    .where('state', '=', 'POSTED')
    .whereIf(docType, 'documentID.type', '=', docType)
    .where('dateFrom', '<=', onDate)
    .where('dateTo', '>=', onDate)
    .selectSingle({ 'MAX([ID])': 'ID' })
  return result ? result.ID : null
}

function getTariffSheetDt () {
  const result = UB.Repository('trf_tariffSheetDt')
    .attrs(['ID', 'tariffSheetID', 'dateFrom', 'dateTo', 'dictEducationLevelID', 'degreeCondition', 'dictStaffSubCatID', 'staffSubCatCondition', 'dictQualificationID', 'qualificationCondition', 'dictTarifCoeffID', 'dictTarifCoeffID.name'])
    .where('tariffSheetID.mi_deleteDate', '>=', '9999-12-31')
    .selectAsObject()
  result.forEach(row => {
    row.dateFrom = dateService.shiftDate(row.dateFrom)
    row.dateTo = dateService.shiftDate(row.dateTo)
  })
  return result.sort((a, b) => a.tariffSheetID !== b.tariffSheetID
    ? a.tariffSheetID - b.tariffSheetID
    : a.dateFrom !== b.dateFrom
      ? a.dateFrom - b.dateFrom
      : a.dictEducationLevelID !== b.dictEducationLevelID
        ? a.dictEducationLevelID - b.dictEducationLevelID
        : a.dictStaffSubCatID !== b.dictStaffSubCatID
          ? a.dictStaffSubCatID - b.dictStaffSubCatID
          : a.dictQualificationID - b.dictQualificationID
  ).reverse()
}

function getDictTarifCoeff ({ cont, tariffSheetID, onDate, dictEducationLevelID, dictStaffSubCatID, dictQualificationID }) {
  const dict = cont && cont.dict ? cont.dict.trf_tariffSheetDt : getTariffSheetDt()
  const found = dict.find(o => {
    if (tariffSheetID && tariffSheetID !== o.tariffSheetID) { return false }
    if (onDate && (onDate < o.dateFrom || onDate > o.dateTo)) { return false }
    if (o.dictEducationLevelID) {
      if (o.degreeCondition === '1' && o.dictEducationLevelID !== dictEducationLevelID) { return false }
      if (o.degreeCondition === '2' && o.dictEducationLevelID === dictEducationLevelID) { return false }
    }
    if (o.dictStaffSubCatID) {
      if (o.staffSubCatCondition === '1' && o.dictStaffSubCatID !== dictStaffSubCatID) { return false }
      if (o.staffSubCatCondition === '2' && o.dictStaffSubCatID === dictStaffSubCatID) { return false }
    }
    if (o.dictQualificationID) {
      if (o.qualificationCondition === '1' && o.dictQualificationID !== dictQualificationID) { return false }
      if (o.qualificationCondition === '2' && o.dictQualificationID === dictQualificationID) { return false }
    }
    return true
  })
  return found ? { ID: found.dictTarifCoeffID, name: found['dictTarifCoeffID.name'] } : {}
}

/**
 * Оновлення основної посади працівника у робочому місці тарифікації
 * @param onDate {Date} Дата розрахунку
 * @param positions {Array} Посадові місця робочого місця тарифікації
 * @param employee Відомості працівника: Призначення працівника, Освіта, Стаж і т.і.
 * Увага!
 * Може змінювати елементи масиву positions
 */
function updatePositionEducation (onDate, positions, employee) {
  const education = employee.prop.education.length ? employee.prop.education[0] : null
  if (education) {
    positions.forEach((pos) => {
      if (education.dictEducationLevelID && pos.dictEducationLevelID !== education.dictEducationLevelID &&
        (!pos.mi_modifyDate || pos.mi_modifyDate < education.mi_modifyDate)) {
        pos.dictEducationLevelID = education.dictEducationLevelID
      }
    })
  }
}

function getShiftPositions (employeeNumberID, dictPositionID, dateFrom, dateTo, errorMessages) {
  let errorDateTo
  let trfPositions = UB.Repository('trf_position')
    .attrs(['ID',
      'dictFundSourceID',
      'dictFundSourceID.name',
      'dictProgClassID',
      'dictProgClassID.name',
      'dictTarifCoeffID', 'workNormID',
      'rate', 'workPlaceID', 'dictPositionID', 'workPlaceID.dateFrom', 'workPlaceID.dateTo'])
    .where('workPlaceID.employeeNumberID', '=', employeeNumberID)
    .where('workPlaceID.state', '=', 'POSTED')
    .where('workPlaceID.dateFrom', '<=', dateFrom)
    .where('workPlaceID.dateTo', '>=', dateFrom)
    .where('workPlaceID.documentID.type', '=', 'FACT')
    .where('workPlaceID.mi_deleteDate', '>=', '#maxdate')
    .where('workPlaceID.documentID.mi_deleteDate', '>=', '#maxdate')
    .where('dictPositionID', '=', dictPositionID)
    .orderBy('workPlaceID.dateFrom')
    .orderBy('posIndex')
    .selectAsObject({
      'workPlaceID.dateFrom': 'dateFrom',
      'workPlaceID.dateTo': 'dateTo'
    })

  // remove the same positions
  trfPositions = trfPositions.filter((pos, index, self) => {
    return self.findIndex(o => o.dictPositionID === pos.dictPositionID && o.dateFrom === pos.dateFrom) === index
  })
  trfPositions.forEach((position) => {
    if (!errorDateTo && dateService.shiftDate(position.dateTo) < dateTo) {
      errorMessages.push(`Увага! З ${dateService.formatDate(dateService.addDays(dateService.shiftDate(position.dateTo), 1))} у працівника змінилась тарифікація!`)
      errorDateTo = position.dateTo
    }
    position.dateFrom = dateService.shiftDate(Math.max(dateService.shiftDate(position.dateFrom), dateFrom))
    position.dateTo = dateService.shiftDate(Math.min(dateService.shiftDate(position.dateTo), dateTo))
    position.accrual = UB.Repository('trf_accrual')
      .attrs(['ID', 'payElID', 'payElID.methodID.code', 'baseSum', 'experienceYears', 'experienceMonths', 'rate', 'accrualSum', 'accrualRate', 'dictPupilID', 'dictPupilID.name', 'positionID.workPlaceID.dateFrom', 'positionID.workPlaceID.dateTo'])
      .where('positionID', '=', position.ID)
      .selectAsObject({
        'payElID.method.code': 'methodCode',
        'positionID.workPlaceID.dateFrom': 'dateFrom',
        'positionID.workPlaceID.dateTo': 'dateTo'
      })
    position.accrual.forEach(item => {
      item.dateFrom = dateService.shiftDate(item.dateFrom)
      item.dateTo = dateService.shiftDate(item.dateTo)
    })
    position.baseSum = position.accrual.reduce((a, b) => { return a + b['payElID.methodID.code'] === '145' ? b['baseSum'] : 0 }, 0)
  })
  trfPositions = trfPositions.filter((element, index, array) => {
    return !array.find(o => o.ID !== element.ID && o.dateFrom === element.dateFrom && (o.baseSum > element.baseSum || o.ID > element.ID))
  }).sort((a, b) => { return a.dateFrom - b.dateFrom })
  return trfPositions
}

function makeShiftAccrual (cont, employeeNumberID, payElID, position, accruals) {
  const found = accruals.find(o => {
    return o.payElID === payElID &&
      dateService.shiftDate(o.dateFrom) <= position.dateTo &&
      dateService.shiftDate(o.dateTo) >= position.dateFrom
  })
  if (found) {
    delete found.ID
    delete found.idx
    found.dateFrom = dateService.shiftDate(found.dateFrom)
    found.dateTo = dateService.shiftDate(found.dateTo)
    return found
  }
  return {
    payElID,
    dateFrom: position.dateFrom,
    dateTo: position.dateTo,
    flagsRec: 0,
    flagsFix: 0,
    baseSum: 0,
    rate: 100,
    employeeNumberID,
    'payElID.description': cont.payEl[payElID].description
  }
}

function getShiftPlanTime (orgID, workScheduleID, rateType, onDate) {
  if (workScheduleID) {
    if (rateType === 'AVERAGE') {
      const df = dateService.firstDayOfYear(onDate)
      const dt = dateService.lastDayOfYear(onDate)
      const planTime = algorithmService.getPlanTime(orgID, workScheduleID, df, dt)
      return {
        days: accrualService.round(planTime.days / 12, 2),
        hours: accrualService.round(planTime.hours / 12, 2)
      }
    } else {
      const df = dateService.firstDayOfMonth(onDate)
      const dt = dateService.lastDayOfMonth(onDate)
      const planTime = algorithmService.getPlanTime(orgID, workScheduleID, df, dt)
      return {
        days: planTime.days,
        hours: accrualService.round(planTime.hours)
      }
    }
  }
  return {}
}
function getShiftWorkNorm (cont, workNormID, rateType, onDate) {
  /* if (workNormID) {
    const year = onDate.getFullYear()
    const workNormDt = cont.dict.trf_workNormDt.find(o => o.workNormID === workNormID && o.year === year)
    if (workNormDt) {
      if (rateType === 'AVERAGE') {
        return workNormDt.avg
      } else {
        const month = onDate.getMonth()
        return workNormDt['m' + (month + 1)]
      }
    }
  } */
  return 0
}

/**
 * Додавання постійних відпусток у масиви нарахування тарифікації positions.accrual
 * @param payEl {Array} довідник Види оплати
 * @param workPlace {Object} Робоче місце тарифікації
 * @param positions {Array} Посадові місця робочого місця тарифікації
 * @param employeeAccrual {Object} Постійні нарахування працівника
 * @returns {Object} Дата початку та дата кінця відпустки
 */
function setVacation (payEl, workPlace, positions, employeeAccrual, params = {}, nextInternalId = 500) {
  const actualVacationIDs = []
  const vacations = employeeAccrual.filter(o => o.dateFrom <= workPlace.dateTo && o.dateTo >= workPlace.dateFrom &&
    ['14', '57', '140', '15'].includes(payEl[o.payElID].method.code))
  let dateFrom = null
  let dateTo = null
  vacations.forEach(vacation => {
    dateFrom = dateFrom ? Math.min(dateFrom, vacation.dateFrom) : vacation.dateFrom
    dateTo = dateTo ? Math.max(dateTo, vacation.dateTo) : vacation.dateTo
    positions.forEach(position => {
      let accrual = position.accrual.find(o => o.employeeAccrualID === vacation.ID)
      if (!accrual) {
        accrual = Object.assign(getStructureAccrual(), {
          internalId: 'gen' + (++nextInternalId),
          payElID: vacation.payElID,
          flagsFix: 0,
          // autoPushed: true,
          employeeAccrualID: vacation.ID
        })
        position.accrual.push(accrual)
      }
      if (params.setDescription) {
        accrual['payElID.methodID.code'] = payEl[vacation.payElID].method.code
        accrual['payElID.description'] = payEl[vacation.payElID].description
        accrual['employeeAccrualID.dateFrom'] = dateService.unshiftDate(vacation.dateFrom)
        accrual['employeeAccrualID.dateTo'] = dateService.unshiftDate(vacation.dateTo)
      }
    })
    actualVacationIDs.push(vacation.ID)
  })
  positions.forEach(position => {
    for (let i = position.accrual.length - 1; i >= 0; i--) {
      if (position.accrual[i].employeeAccrualID &&
        !actualVacationIDs.find(o => o === position.accrual[i].employeeAccrualID)) {
        position.accrual.splice(i, 1)
      }
    }
  })
  return vacations.length ? { dateFrom, dateTo } : null
}

function sortPositions (positions, mainDictPositionID) {
  let maxIndex = positions.reduce((a, b) => Math.max(a, b.posIndex || 0), 0)
  positions.forEach(o => { if (!o.posIndex) { o.posIndex = ++maxIndex } })
  const sorted = positions.sort((a, b) =>
    a.posIndex - b.posIndex
  )
  sorted.forEach((o, index) => { o.posIndex = index + 1 })
  return sorted
}

function makeShiftPositions (params) {
  const dictPositionID = params.dictPositionID || params.mainDictPositionID || null
  if (!dictPositionID) { return [] }
  return [{
    dictFundSourceID: params.dictFundSourceID || null,
    dictProgClassID: params.dictProgClassID || null,
    dictTarifCoeffID: params.dictTarifCoeffID || null,
    workNormID: params.workNormID || null,
    rate: params.rate || 1,
    workPlaceID: null,
    dictPositionID: params.dictPositionID || params.mainDictPositionID || null,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    accrual: []
  }]
}
