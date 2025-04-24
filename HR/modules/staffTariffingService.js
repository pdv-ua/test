const UB = require('@unitybase/ub')
const accrualService = require('../../HR/modules/accrualService')
const staffService = require('../../HR/modules/staffService')
const employeeService = require('../../HR/modules/employeeService')
const orgService = require('../../HR/modules/orgService')
const dateService = require('../../AC/modules/dataServices/dateService')

module.exports = {
  calculateStaffTariffing
}

function calculateStaffTariffing ({ cont, onDate, payElIDs = [], posData, empPosData, dictFundSourceID, depFilter,
  skipFillPosBaseSum, skipFillEmpBaseSum, skipCalcAccruals, onlyByTarif = true, useHourlyPay = false, normHour = 0 }) {
  const result = {}

  if (!payElIDs.length) {
    payElIDs.push(0)
  }
  const orgID = cont.orgID || 0

  const payElList = UB.Repository('hr_payEl')
    .attrs(['ID', 'dictExperienceID', 'methodID.code', 'description'])
    .where('ID', 'in', payElIDs)
    .selectAsObject()

  result.payElIDs = payElIDs

  result.dictTarifCoeffDet = UB.Repository('hr_dictTarifCoeffDet')
    .attrs(['dictTarifCoeffID', 'accrualSum'])
    .where('dateFrom', '<=', onDate)
    .where('dateTo', '>=', onDate)
    .selectAsObject()

  const tarifData = {}
  result.dictTarifCoeffDet.forEach(item => {
    tarifData[item.dictTarifCoeffID] = item.accrualSum || 0
  })
  result.tarifData = tarifData
  cont.tarifData = tarifData

  const orgAccruals = orgService.getOrgAccrual(orgID, payElIDs, onDate, onDate)

  if (posData) {
    result.posData = posData
  } else {
    result.posData = dictFundSourceID
      ? UB.Repository('hr_positionFundSource')
        .attrs(['positionID', 'positionID.mi_data_id', 'positionID.parentUnitID', 'positionID.idxNum',
          'positionID.dictPositionID.fullName', 'positionID.dictPositionID.name', 'quantity', 'positionID.name',
          'positionID.mi_dateFrom', 'positionID.mi_dateTo', 'positionID.dictStaffCatID', 'positionID.dictStaffCatID.code',
          'positionID.payElID', 'positionID.payElID.methodID.code', 'positionID.accrualSum', 'positionID.dictStaffCatID.name', 'positionID.dictPositionID',
          'positionID.dictTarifCoeffID', 'positionID.dictTarifCoeffID.code', 'positionID.nameAddition',
          'positionID.dictPositionID.dictProfessionID.code', 'positionID.positionChiefID'
        ])
        .where('dictFundSourceID', '=', dictFundSourceID)
        .where('positionID.orgID', '=', orgID)
        .where('positionID.liquidate', '=', 0)
        .where('positionID.state', '=', 'ACTIVE')
        .whereIf(depFilter, 'positionID.mi_treePath', 'like', `%/${depFilter}/%`)
        .misc({ __mip_ondate: onDate })
        .selectAsObject({
          'positionID': 'ID',
          'positionID.mi_data_id': 'mi_data_id',
          'positionID.name': 'name',
          'positionID.parentUnitID': 'parentUnitID',
          'positionID.idxNum': 'idxNum',
          'positionID.dictPositionID.fullName': 'dictPositionID.fullName',
          'positionID.dictPositionID.name': 'dictPositionID.name',
          'positionID.accrualSum': 'accrualSum',
          'positionID.dictStaffCatID': 'dictStaffCatID',
          'positionID.dictStaffCatID.code': 'dictStaffCatID.code',
          'positionID.dictStaffCatID.name': 'dictStaffCatID.name',
          'positionID.dictTarifCoeffID': 'dictTarifCoeffID',
          'positionID.dictTarifCoeffID.code': 'tarifCode',
          'positionID.mi_dateFrom': 'mi_dateFrom',
          'positionID.mi_dateTo': 'mi_dateTo',
          'positionID.payElID': 'payElID',
          'positionID.dictPositionID': 'dictPositionID',
          'positionID.nameAddition': 'nameAddition',
          'positionID.dictPositionID.dictProfessionID.code': 'profCode',
          'positionID.payElID.methodID.code': 'payMethodCode'
        })
      : UB.Repository('hr_position')
        .attrs(['ID', 'mi_data_id', 'parentUnitID', 'idxNum', 'dictPositionID.fullName', 'dictPositionID.name',
          'mi_dateFrom', 'mi_dateTo', 'name', 'nameAddition', 'quantity', 'payElID', 'dictPositionID', 'accrualSum',
          'dictStaffCatID', 'dictStaffCatID.code', 'dictStaffCatID.name', 'dictTarifCoeffID', 'dictTarifCoeffID.code',
          'dictPositionID.dictProfessionID.code', 'payElID.methodID.code'
        ])
        .where('orgID', '=', orgID)
        .where('liquidate', '=', 0)
        .where('state', '=', 'ACTIVE')
        .whereIf(depFilter, 'mi_treePath', 'like', `%/${depFilter}/%`)
        .misc({ __mip_ondate: onDate })
        .selectAsObject({
          'dictTarifCoeffID.code': 'tarifCode',
          'dictPositionID.dictProfessionID.code': 'profCode',
          'payElID.methodID.code': 'payMethodCode'
        })
  }

  function getEmpPosData (dictFundSourceID) {
    let res = UB.Repository('hr_employeePositionSR')
      .attrs(['ID', 'employeeNumberID', 'employeeID', 'employeeID.fullFIO', 'positionID', 'mtCount', 'accrualSum',
        'workPlace', 'workPlace.name', 'dictTarifCoeffID', 'dictTarifCoeffID.code', 'fundSources', 'departmentID', 'dictPositionID',
        'positionID.dictStaffCatID', 'workerType', 'payElID', 'dictEmpCategoryID', 'employeeNumberID.description',
        'employeeNumberID.tabNum', 'description', 'dateFrom', 'dateTo', 'payElID.methodID.code',
        'dictEmpCategoryID.name', 'dictEmpCategoryID.shortName'
      ])
      .where('isActive', '=', true)
      .where('organizationID', '=', orgID)
      .where('dateFrom', '<=', onDate)
      .where('dateTo', '>=', onDate)
      .where('employeeNumberID.dateFrom', '<=', onDate)
      .where('employeeNumberID.dateTo', '>=', onDate)
      .where('employeeNumberID.mi_deleteDate', '>=', '#maxdate')
      .where('positionID.mi_dateFrom', '<=', onDate)
      .where('positionID.mi_dateTo', '>=', onDate)
      .where('positionID.state', '=', 'ACTIVE')
      .where('positionID.mi_deleteDate', '>=', '#maxdate')
      .whereIf(depFilter, 'positionID.mi_treePath', 'like', `%/${depFilter}/%`)
      .notExists(UB.Repository('hr_empLongTermAbsc')
        .correlation('employeeNumberID', 'employeeNumberID')
        .where('organizationID', '=', orgID)
        .where('dateFrom', '<=', onDate)
        .where('dateTo', '>=', onDate)
        .where('mi_deleteDate', '>=', '#maxdate'))
    if (dictFundSourceID) {
      res = res.exists(UB.Repository('hr_empPosFundSource')
        .where('dictFundSourceID', '=', dictFundSourceID)
        .where('mi_deleteDate', '>=', '#maxdate')
        .correlation('employeePositionID', 'ID'))
    }
    return res
  }

  const dictEmpCatTarifPos = UB.Repository('hr_dictEmpCatTarifPos')
    .attrs('dictPositionID', 'dictTarifCoeffID')
    .where('dateFrom', '<=', onDate)
    .where('dateTo', '>=', onDate)
    .where('organizationID', '=', orgID, 'org')
    .where('organizationID', 'isNull', undefined, 'orgNull')
    .groupBy(['dictPositionID', 'dictTarifCoeffID'])
    .logic('([org] OR [orgNull])')
    .selectAsObject()

  if (empPosData) {
    result.empPosData = empPosData
  } else {
    result.empPosData = getEmpPosData(dictFundSourceID).selectAsObject({
      'employeeID.fullFIO': 'fullFIO',
      'dictTarifCoeffID.code': 'tarifCode',
      'positionID.dictStaffCatID': 'dictStaffCatID',
      'dictEmpCategoryID.name': 'dictEmpCategoryName',
      'dictEmpCategoryID.shortName': 'dictEmpCategorySName',
      'payElID.methodID.code': 'payMethodCode'
    })
  }
  const posQnt = {}
  result.empPosData.forEach(emp => {
    posQnt[emp.positionID] = (posQnt[emp.positionID] || 0) + emp.mtCount
    emp.categoryInfo = emp.dictEmpCategorySName || emp.dictEmpCategoryName || ''
  })

  const calcPosData = []
  let positionAccrualData = []

  if (!posData) {
    result.posData.forEach(pos => {
      if (!skipFillPosBaseSum) {
        pos.basepay = pos.dictTarifCoeffID || onlyByTarif ? tarifData[pos.dictTarifCoeffID] : pos.accrualSum
        pos.basepay = (onlyByTarif ? pos.basepay : pos.basepay || pos.accrualSum) || 0
        pos.basepayHour = useHourlyPay ? pos.payMethodCode === '2' ? pos.basepay * normHour : pos.basepay : 0
      }
      pos.accruals = []
      if (pos.quantity !== posQnt[pos.mi_data_id]) {
        if (!skipFillPosBaseSum) {
          const tarifPos = dictEmpCatTarifPos.filter(o => o.dictPositionID === pos.dictPositionID)
          pos.basepay = tarifPos.length ? accrualService.round(tarifPos.reduce((sum, row) => {
            const summa = row.dictTarifCoeffID || onlyByTarif ? tarifData[row.dictTarifCoeffID] : pos.accrualSum
            sum += (onlyByTarif ? summa : summa || pos.accrualSum) || 0
            return sum
          }, 0) / (tarifPos.length || 1), 0) : onlyByTarif ? 0 : pos.accrualSum
          pos.basepayHour = useHourlyPay ? pos.payMethodCode === '2' ? pos.basepay * normHour : pos.basepay : 0
        }
        calcPosData.push({
          ID: pos.ID,
          mi_data_id: pos.mi_data_id,
          dictPositionID: pos.dictPositionID,
          payElID: pos.payElID,
          accrualSum: pos.basepay,
          accrualSumHour: pos.basepayHour,
          dictTarifCoeffID: pos.dictTarifCoeffID,
          mi_dateFrom: pos.mi_dateFrom,
          isTarifAccrual: true
        })
      }
    })
    if (calcPosData.length) {
      const dictPosPayEl = UB.Repository('hr_dictPositionPayEl')
        .attrs('dictPositionID', 'payElID', 'valuation', 'value')
        .where('dictPositionID', 'in', calcPosData.map(o => o.dictPositionID))
        .where('dateFrom', '<=', onDate)
        .where('dateTo', '>=', onDate)
        .selectAsObject()
      calcPosData.forEach(row => {
        dictPosPayEl.filter(o => o.dictPositionID === row.dictPositionID).forEach(acc => {
          positionAccrualData.push(
            {
              positionID: row.ID,
              payElID: acc.payElID,
              accrualSum: acc.valuation === 'SUM' ? (acc.value || 0) : 0,
              accrualRate: acc.valuation === 'RATE' ? (acc.value || 0) : 0
            }
          )
        })
      })
    }
  } else {
    posData.forEach(pos => {
      calcPosData.push({
        ID: pos.ID,
        mi_data_id: pos.mi_data_id,
        dictPositionID: pos.dictPositionID,
        payElID: pos.payElID,
        accrualSum: pos.basepay,
        accrualSumHour: useHourlyPay ? pos.payMethodCode === '2' ? pos.basepay * normHour : pos.basepay : 0,
        dictTarifCoeffID: pos.dictTarifCoeffID,
        mi_dateFrom: pos.mi_dateFrom,
        isTarifAccrual: true
      })
      pos.accruals.forEach(acc => {
        positionAccrualData.push(
          {
            positionID: pos.ID,
            payElID: acc.payElID,
            accrualSum: acc.baseSum,
            accrualRate: acc.rate
          }
        )
      })
    })
  }

  if (!skipCalcAccruals) {
    const positionAccruals = calcPosData.length ? staffService.getPlanSumByPosition({
      onDate,
      orgID,
      positionData: calcPosData,
      positionAccrualData,
      skipTarifCalc: true
    }) : []

    result.posData.forEach(pos => {
      const posAcc = positionAccruals.find(o => o.ID === pos.ID)
      pos.accruals = posAcc ? posAcc.payEl : []
    })
  }

  const employeeIDs = result.empPosData.map(o => o.employeeID)

  const dictEmpCategory = {}
  UB.Repository('hr_dictEmpCategory')
    .attrs('ID', 'name', 'shortName')
    .selectAsObject().forEach(row => {
      dictEmpCategory[row.ID] = { name: row.name, shortName: row.shortName }
    })

  const empPermanentAccruals = UB.Repository('hr_employeeAccrual')
    .attrs(['employeeNumberID', 'payElID', 'accrualSum', 'accrualRate', 'dateFrom', 'dateTo'])
    .where('payElID', 'in', payElIDs)
    .where('dateFrom', '<=', onDate)
    .where('dateTo', '>=', onDate)
    .selectAsObject()

  const eduData = result.empPosData.length ? UB.Repository('hr_employeeEducation')
    .attrs(['employeeID', 'dictEducationLevelID.educationType'])
    .where('dictEducationLevelID.educationType', '=', '1')
    .where('employeeID', 'in', employeeIDs)
    .selectAsObject({
      'dictEducationLevelID.educationType': 'educationType'
    }) : []

  const scienceData = result.empPosData.length ? UB.Repository('hr_empRangeScience')
    .attrs(['employeeID', 'dictDegreeID.name', 'dictDegreeID.shortName', 'dictBranchScienceID.name', 'dictBranchScienceID.shortName'])
    .where('employeeID', 'in', employeeIDs)
    .orderBy('employeeID')
    .orderBy('docDate', 'desc')
    .orderBy('ID', 'desc')
    .selectAsObject({
      'dictDegreeID.name': 'name',
      'dictDegreeID.shortName': 'shortName',
      'dictBranchScienceID.name': 'branchScienceName',
      'dictBranchScienceID.shortName': 'branchScienceShortName'
    }) : []

  const empExpData = UB.Repository('hr_employeeExperience')
    .attrs(['employeeID', 'dictExperienceID', 'calcDate'])
    .where('employeeID', 'in', employeeIDs)
    .selectAsObject()

  const empRankData = UB.Repository('hr_publServRang')
    .attrs(['employeeID', 'dictRankID'])
    .where('employeeID', 'in', employeeIDs)
    .where('dateFrom', '<=', onDate)
    .where('dateTo', '>=', onDate)
    .selectAsObject()

  const employeeBonus = UB.Repository('hr_employeeBonus')
    .attrs(['employeeID', 'dictBonusID.name', 'dictBonusID.abbr'])
    .where('employeeID', 'in', employeeIDs)
    .where('dictBonusID.bonusKindID.name', '=', 'Почесне звання')
    .orderBy('employeeID')
    .orderBy('docIssuedDate', 'desc')
    .orderBy('ID', 'desc')
    .selectAsObject({
      'dictBonusID.name': 'name',
      'dictBonusID.abbr': 'abbr'
    })

  let scienceItem, bonusItem
  let extraPosNameData
  result.empPosData.forEach(emp => {
    extraPosNameData = []
    if (emp.dictEmpCategoryID && dictEmpCategory[emp.dictEmpCategoryID]) {
      extraPosNameData.push(dictEmpCategory[emp.dictEmpCategoryID].shortName || dictEmpCategory[emp.dictEmpCategoryID].name)
    }
    if (!skipFillEmpBaseSum) {
      emp.basepay = emp.dictTarifCoeffID || onlyByTarif ? tarifData[emp.dictTarifCoeffID] : emp.accrualSum
      emp.basepay = (onlyByTarif ? emp.basepay : emp.basepay || emp.accrualSum) || 0
      emp.baseSum = emp.basepay
      emp.basepayHour = useHourlyPay ? emp.payMethodCode === '2' ? emp.basepay * normHour : emp.basepay : 0
    }
    emp.hasHighEdu = eduData.find(o => o.employeeID === emp.employeeID)
    scienceItem = scienceData.find(o => o.employeeID === emp.employeeID)
    emp.scienceName = scienceItem ? /* scienceItem.name */ `${scienceItem.shortName || scienceItem.name}${scienceItem.branchScienceShortName || scienceItem.branchScienceName}` : null
    if (scienceItem) {
      extraPosNameData.push(`${scienceItem.shortName || scienceItem.name}${scienceItem.branchScienceShortName || scienceItem.branchScienceName}`)
    }
    bonusItem = employeeBonus.find(o => o.employeeID === emp.employeeID)
    if (bonusItem) {
      extraPosNameData.push(bonusItem.abbr || bonusItem.name)
    }
    if (extraPosNameData.length) {
      emp.extraPosName = extraPosNameData.join(', ')
    }
    emp.expData = empExpData.filter(o => o.employeeID === emp.employeeID).map(o => {
      return {
        dictExperienceID: o.dictExperienceID,
        ymd: dateService.getYmd(o.calcDate, onDate, true)
      }
    })
    const rankItem = empRankData.find(o => o.employeeID === emp.employeeID)
    emp.dictRankID = rankItem ? rankItem.dictRankID : null

    if (dictFundSourceID) {
      const fundSources = JSON.parse(emp.fundSources)
      const fs = fundSources.find(o => o.dictFundSourceID === dictFundSourceID)
      emp.mtCount = fs ? fs.mtCount : 0
    }

    if (!empPosData) {
      emp.permanentAccruals = []
      emp.permanentAccruals.push(...empPermanentAccruals.filter(o => o.employeeNumberID === emp.employeeNumberID).map(o => {
        const pe = payElList.find(e => e.ID === o.payElID)
        return {
          payElID: o.payElID,
          payEl: pe ? pe.description : '',
          source: 'hr_employeeAccrual',
          baseSum: o.accrualSum || 0,
          rate: o.accrualRate
        }
      }))

      orgAccruals.forEach(acc => {
        let isAdd = true
        if ((acc.excludeDepartment && acc.department.includes(emp.departmentID)) || (!acc.excludeDepartment && acc.department.length && !acc.department.includes(emp.departmentID))) {
          isAdd = false
        }
        if (isAdd && ((acc.excludePosition && acc.position.includes(emp.dictPositionID)) || (!acc.excludePosition && acc.position.length && !acc.position.includes(emp.dictPositionID)))) {
          isAdd = false
        }
        if (isAdd && ((acc.excludeStaff && acc.category.includes(emp.dictStaffCatID)) || (!acc.excludeStaff && acc.category.length && !acc.category.includes(emp.dictStaffCatID)))) {
          isAdd = false
        }
        if (isAdd && ((acc.excludeWorkPlace && acc.workPlace.includes(emp.workPlace)) || (!acc.excludeWorkPlace && acc.workPlace.length && !acc.workPlace.includes(emp.workPlace)))) {
          isAdd = false
        }
        if (isAdd && ((acc.excludeWorkerType && acc.workerType.includes(emp.workerType)) || (!acc.excludeWorkerType && acc.workerType.length && !acc.workerType.includes(emp.workerType)))) {
          isAdd = false
        }

        if (isAdd) {
          const empAccr = emp.permanentAccruals.filter(o => o.payElID === acc.payElID).sort((a, b) => (a.dateFrom.getTime() - b.dateFrom.getTime()))
          if (!empAccr.length) {
            const pe = payElList.find(e => e.ID === acc.payElID)
            emp.permanentAccruals.push(
              {
                payElID: acc.payElID,
                payEl: pe ? pe.description : '',
                source: 'hr_payPerm',
                baseSum: acc.paySum || 0,
                rate: acc.rate
              }
            )
          }
        }
      })
      delete emp.fundSources
    }
  })

  if (!skipCalcAccruals) {
    result.empPosData.forEach(emp => {
      emp.permanentAccruals.forEach(pAccr => {
        const planSum = employeeService.getPlanSum(onDate, cont, pAccr, emp, emp.permanentAccruals, [], true)
        pAccr.paySum = accrualService.round(planSum)
        if (emp.mtCount === 1) {
          pAccr.paySumForCount = pAccr.paySum
        } else {
          const planSum = employeeService.getPlanSum(onDate, cont, pAccr, emp, emp.permanentAccruals, [], true, 0, true)
          pAccr.paySumForCount = accrualService.round(planSum)

        }
      })
    })
  }

  return result
}
