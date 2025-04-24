const dateService = require('../../AC/modules/dataServices/dateService')
const algorithmService = require('../../HR/modules/algorithmService')
const accrualService = require('../../HR/modules/accrualService')
const glCore = require('../../GL/modules/glCore')
const _ = require('lodash')
module.exports = {
  getDimension,
  getAccrualDt,
  getAccrualFundDt,
  setDimensionFromSource,
  setDimensionToAccrualDt,
  correctPosFundSource
}

let deparmentDimensionID
let dictProjectDimensionID
let dictProgClassDimensionID

function setDimensionToAccrualDt ({ target, source }) {
  for (let i = 0; i < 10; i++) {
    if (source[`d${i}`] && source[`d${i}Value`]) {
      target[`d${i}`] = source[`d${i}`]
      target[`d${i}Value`] = source[`d${i}Value`]
    }
  }
}

function addDimensionToAccrualDt ({ target, source }) {
  for (let i = 0; i < 10; i++) {
    if (source[`d${i}`]) {
      let add = true
      let idx = -1
      for (let j = 0; j < 10; j++) {
        if (target[`d${j}`] === source[`d${i}`]) {
          add = false
        }
        if (!target[`d${j}`] && idx === -1) {
          idx = j
        }
      }
      if (add) {
        target[`d${idx}`] = source[`d${i}`]
      }
    }
  }
}

function removeEmptyDimension ({ target }) {
  for (let i = 0; i < 10; i++) {
    if (target[`d${i}`] && !target[`d${i}Value`]) {
      target[`d${i}`] = null
    }
  }
}

function setCustomDimension ({ target, dimensionValue }) {
  if (dimensionValue) {
    const coa = glCore.getCOA()
    const dimValue = {}
    Object.keys(dimensionValue).forEach(dimCode => {
      if (dimensionValue[dimCode] && coa.dims[dimCode]) {
        dimValue[coa.dims[dimCode].ID] = dimensionValue[dimCode]
      }
    })
    for (let i = 0; i < 10; i++) {
      if (target[`d${i}`] && !target[`d${i}Value`] && dimValue[target[`d${i}`]]) {
        target[`d${i}Value`] = dimValue[target[`d${i}`]]
      }
    }
  }
}

function setDimensionFromSource ({ target, source, attrName = 'd', replace = false }) {
  if (!source) {
    return
  }
  for (let i = 0; i < 10; i++) {
    if (target[`d${i}`] && (!target[`d${i}Value`] || replace)) {
      for (let j = 0; j < 10; j++) {
        if (source[`${attrName}${j}`] === target[`d${i}`] && source[`${attrName}${j}Value`]) {
          target[`d${i}Value`] = source[`${attrName}${j}Value`]
        }
      }
    }
  }
}

function setDimensionDepartment ({ target, source, replace = false }) {
  if (!source || !source.departmentID) {
    return
  }
  if (deparmentDimensionID === undefined) {
    const coa = glCore.getCOA()
    deparmentDimensionID = coa.dims.org_department ? coa.dims.org_department.ID : 0
  }
  if (deparmentDimensionID > 0) {
    for (let i = 0; i < 10; i++) {
      if (target[`d${i}`] && target[`d${i}`] === deparmentDimensionID && (!target[`d${i}Value`] || replace)) {
        target[`d${i}Value`] = source.departmentID
      }
    }
  }
}

function setDimensionProgClass ({ target, source, replace = false }) {
  if (!source || !source.dictProgClassID) {
    return
  }
  if (dictProgClassDimensionID === undefined) {
    const coa = glCore.getCOA()
    dictProgClassDimensionID = coa.dims.ac_dictProgClass ? coa.dims.ac_dictProgClass.ID : 0
  }
  if (dictProgClassDimensionID > 0) {
    for (let i = 0; i < 10; i++) {
      if (target[`d${i}`] && target[`d${i}`] === dictProgClassDimensionID && (!target[`d${i}Value`] || replace)) {
        target[`d${i}Value`] = source.dictProgClassID
      }
    }
  }
}

function setDimensionProject ({ target, source, replace = false }) {
  if (!source || !source.dictProjectID) {
    return
  }
  if (dictProjectDimensionID === undefined) {
    const coa = glCore.getCOA()
    dictProjectDimensionID = coa.dims.ac_dictProject ? coa.dims.ac_dictProject.ID : 0
  }
  if (dictProjectDimensionID > 0) {
    for (let i = 0; i < 10; i++) {
      if (target[`d${i}`] && target[`d${i}`] === dictProjectDimensionID && (!target[`d${i}Value`] || replace)) {
        target[`d${i}Value`] = source.dictProjectID
      }
    }
  }
}
/**
 *
 * @param cont
 * @param orderMethod (['payDim' - Шифр витрат, 'accountID' - Рахунок витрат, 'entryOperationIDDt' - Типова операція]
 * @param accountID
 * @returns {{}}
 */
function getDimension ({ cont, orderMethod = [], entryAcc, accountID }) {
  const coa = glCore.getCOA()
  const dimension = []
  orderMethod.forEach(method => {
    switch (method) {
      case 'payDim': {
        cont.dict.hr_payDim.forEach(dim => {
          if (!dimension.find(o => o.dimensionID === dim.dimension)) {
            dimension.push({
              dimensionID: dim.dimension,
              code: coa.dimsById[dim.dimension].code,
              value: null
            })
          }
        })
        break
      }
      case 'accountID': {
        const account = coa.byId[accountID]
        if (account) {
          account.dims.forEach(dim => {
            if (dim && !dimension.find(o => o.dimensionID === dim.ID)) {
              dimension.push({
                dimensionID: dim.ID,
                code: dim.code,
                value: null
              })
            }
          })
        }
        break
      }
      case 'entryOperationIDDt': {
        entryAcc.forEach(acc => {
          for (let i = 0; i < 10; i++) {
            if (acc[`dimensionDt${i}`] && coa.dimsById[acc[`dimensionDt${i}`]]) {
              const dim = dimension.find(o => o.dimensionID === acc[`dimensionDt${i}`])
              if (!dim) {
                dimension.push({
                  dimensionID: acc[`dimensionDt${i}`],
                  code: coa.dimsById[acc[`dimensionDt${i}`]].code,
                  value: null
                })
              }
            }
            if (acc[`dimensionKt${i}`] && coa.dimsById[acc[`dimensionKt${i}`]]) {
              const dim = dimension.find(o => o.dimensionID === acc[`dimensionKt${i}`])
              if (!dim) {
                dimension.push({
                  dimensionID: acc[`dimensionKt${i}`],
                  code: coa.dimsById[acc[`dimensionKt${i}`]].code,
                  value: null
                })
              }
            }
          }
        })
        break
      }
    }
  })
  const resultDimension = {}

  let i = 0
  dimension.sort((a, b) => a.dimensionID - b.dimensionID).forEach(dim => {
    resultDimension[`d${i}`] = dim.dimensionID
    resultDimension[`d${i}Value`] = dim.value
    i++
  })
  return resultDimension
}

function getAccrualFundDt ({ cont, accrFund, period }) {
  let resultAccrualDt = accrFund.accrualFundDt
  const payFound = cont.payFund.find(o => o.ID === accrFund.payFundID)
  const position = cont.emp[cont.employeeNumberID] ? (_.findLast(cont.emp[cont.employeeNumberID].prop.employeePositions, o =>
    o.dateFrom <= period.dateTo && o.dateTo >= period.dateFrom) ||
    cont.emp[cont.employeeNumberID].prop.employeePositions[cont.emp[cont.employeeNumberID].prop.employeePositions.length - 1] || {}) : {}
  const entryAcc = payFound.entryOperationID ? cont.dict.hr_entryAcc.filter(entry => entry.entryOperationID === payFound.entryOperationID &&
    (!entry.entryAccDt || (
      (!entry.entryAccDt.org || !entry.entryAccDt.org.length || (entry.excludeOrg && !entry.entryAccDt.org.includes(cont.orgID)) || (!entry.excludeOrg && entry.entryAccDt.org.includes(cont.orgID))) &&
      (!entry.entryAccDt.dep || !entry.entryAccDt.dep.length || (entry.excludeDepartment && !entry.entryAccDt.dep.includes(position.departmentID)) || (!entry.excludeDepartment && entry.entryAccDt.dep.includes(position.departmentID))) &&
      (!entry.entryAccDt.wp || !entry.entryAccDt.wp.length || (entry.excludeWorkPlace && !entry.entryAccDt.wp.includes(position.workPlace)) || (!entry.excludeWorkPlace && entry.entryAccDt.wp.includes(position.workPlace)))
    ))) : []
  const dictFundSourceID = payFound.dictFundSourceID || (entryAcc.length === 1 && entryAcc[0].dictFundSourceID) || null
  const dictProgClassID = payFound.dictProgClassID || (entryAcc.length === 1 && entryAcc[0].dictProgClassID) || null
  const dictProjectID = payFound.dictProjectID || (entryAcc.length === 1 && entryAcc[0].dictProjectID) || null
  const departmentID = position.departmentID || null
  const accountID = position.accountID
  if (!resultAccrualDt || !resultAccrualDt.length) {
    resultAccrualDt = [Object.assign(getDimension({
      cont,
      orderMethod: ['payDim', 'accountID', 'entryOperationIDDt'],
      entryAcc,
      accountID
    }), { paySum: accrFund.paySum, sourceSum: 0, baseSum: 0, payElID: position.payElID, dictFundSourceID, dictProgClassID })]
  }
  let optionalDictFundSourceID = null
  let optionalDictProjectID = null
  let optionalDictProgClassID = null
  let hasPosFundSources = false
  let hasPosProject = false
  let hasPosProgClass = false
  if (!dictFundSourceID && !position.fundSources) {
    optionalDictFundSourceID = (entryAcc.length === 1 && entryAcc[0].dictFundSourceID) || null
  }
  if (!dictFundSourceID && position.fundSources && position.fundSources.length && position.fundSources.find(o => o.dictFundSourceID)) {
    optionalDictFundSourceID = position.fundSources.length === 1 ? position.fundSources[0].dictFundSourceID : null
    if (position.fundSources.length > 1) {
      hasPosFundSources = true
    }
  }
  if (!dictProjectID && !position.fundSources) {
    optionalDictProjectID = (entryAcc.length === 1 && entryAcc[0].dictProjectID) || null
  }
  if (!dictProjectID && position.fundSources && position.fundSources.length && position.fundSources.find(o => o.dictProjectID)) {
    optionalDictProjectID = position.fundSources.length === 1 ? position.fundSources[0].dictProjectID : null
    if (position.fundSources.length > 1) {
      hasPosProject = true
    }
  }
  if (!dictProgClassID && !position.fundSources) {
    optionalDictProgClassID = (entryAcc.length === 1 && entryAcc[0].dictProgClassID) || null
  }
  if (!dictProgClassID && position.fundSources && position.fundSources.length && position.fundSources.find(o => o.dictProgClassID)) {
    optionalDictProgClassID = position.fundSources.length === 1 ? position.fundSources[0].dictProgClassID : null
    if (position.fundSources.length > 1) {
      hasPosProgClass = true
    }
  }
  resultAccrualDt.forEach(row => {
    if (dictFundSourceID) {
      row.dictFundSourceID = dictFundSourceID
    }
    if (!row.dictFundSourceID) {
      row.dictFundSourceID = optionalDictFundSourceID
    }
    if (dictProjectID) {
      row.dictProjectID = dictProjectID
    }
    if (!row.dictProjectID) {
      row.dictProjectID = optionalDictProjectID
    }
    if (dictProgClassID) {
      row.dictProgClassID = dictProgClassID
    }
    if (!row.dictProgClassID) {
      row.dictProgClassID = optionalDictProgClassID
    }
    if (!row.departmentID) {
      row.departmentID = departmentID
    }
    if (!row.accountID) {
      row.accountID = accountID
    }
    if (!row.accountID && entryAcc.length === 1 && entryAcc[0].accountDtID) {
      row.accountID = entryAcc[0].accountDtID
    }
    const dimension = getDimension({
      cont,
      orderMethod: ['payDim', 'accountID', 'entryOperationIDDt'],
      entryAcc,
      accountID: row.accountID
    })
    addDimensionToAccrualDt({ target: row, source: dimension })
    setDimensionFromSource({ target: row, source: position })
    if (entryAcc.length === 1) {
      setDimensionFromSource({ target: row, source: entryAcc[0], attrName: 'dimensionDt' })
    }
    setCustomDimension({
      target: row,
      dimensionValue: {
        org_employee: cont.emp[cont.employeeNumberID].prop.employeeNumber.employeeID,
        ac_dictMonth: period.dictMonthID || null
      }
    })
    removeEmptyDimension({ target: row })
  })
 /* if (hasPosFundSources || hasPosProject || hasPosProgClass) {
    resultAccrualDt = correctPosFundSource(resultAccrualDt, position.fundSources, position.mtCount, true)
  }*/
  resultAccrualDt = algorithmService.calcGroupSumAccrualFundDt(resultAccrualDt, accrFund.paySum)

  if (!dictFundSourceID && payFound.payFundSource.length) {
    if (!payFound.excludeFundSource) {
      const existFundSource = []
      let foundPaySum = 0
      resultAccrualDt.forEach(row => {
        if (row.dictFundSourceID && payFound.payFundSource.find(o => o.dictFundSourceID === row.dictFundSourceID)) {
          existFundSource.push(row)
          foundPaySum = accrualService.round(foundPaySum + row.paySum)
        }
      })
      if (!existFundSource.length) {
        let hasPosFundSources = false
        let optionalDictFundSourceID = null
        if (position.fundSources) {
          optionalDictFundSourceID = position.fundSources.length === 1 ? position.fundSources[0].dictFundSourceID : null
          if (position.fundSources.length > 1) {
            hasPosFundSources = true
          }
        }
        resultAccrualDt.forEach(row => {
          row.dictFundSourceID = hasPosFundSources ? null : optionalDictFundSourceID
        })
        if (hasPosFundSources || hasPosProject || hasPosProgClass) {
          resultAccrualDt = correctPosFundSource(resultAccrualDt, position.fundSources, position.mtCount, true)
        }
        resultAccrualDt = algorithmService.calcGroupSumAccrualFundDt(resultAccrualDt, accrFund.paySum)
      } else {
        const accrCount = resultAccrualDt.length
        for (let i = accrCount - 1; i >= 0; i--) {
          const accDt = resultAccrualDt[i]
          if (!accDt.dictFundSourceID || !payFound.payFundSource.find(o => o.dictFundSourceID === accDt.dictFundSourceID)) {
            existFundSource.forEach(fundSource => {
              resultAccrualDt.push(Object.assign(Object.assign({}, accDt), {
                dictFundSourceID: fundSource.dictFundSourceID,
                paySum: accrualService.round(accDt.paySum / (foundPaySum || 1) * fundSource.paySum)
              }))
            })
            resultAccrualDt.splice(i, 1)
          }
        }
        resultAccrualDt = algorithmService.calcGroupSumAccrualFundDt(resultAccrualDt, accrFund.paySum)
      }
    } else {
      const existFundSource = []
      let foundPaySum = 0
      let foundBaseSum = 0
      let foundSourceSum = 0
      resultAccrualDt.forEach(row => {
        if (!row.dictFundSourceID || !payFound.payFundSource.find(o => o.dictFundSourceID === row.dictFundSourceID)) {
          existFundSource.push(row)
          foundPaySum = accrualService.round(foundPaySum + row.paySum)
          foundBaseSum = accrualService.round(foundBaseSum + row.baseSum)
          foundSourceSum = accrualService.round(foundSourceSum + row.sourceSum)
        }
      })
      if (!existFundSource.length) {
        let hasPosFundSources = false
        let optionalDictFundSourceID = null
        if (position.fundSources) {
          optionalDictFundSourceID = position.fundSources.length === 1 ? position.fundSources[0].dictFundSourceID : null
          if (position.fundSources.length > 1) {
            hasPosFundSources = true
          }
        }
        resultAccrualDt.forEach(row => {
          row.dictFundSourceID = hasPosFundSources ? null : optionalDictFundSourceID
        })
        if (hasPosFundSources || hasPosProject || hasPosProgClass) {
          resultAccrualDt = correctPosFundSource(resultAccrualDt, position.fundSources, position.mtCount, true)
        }
        resultAccrualDt = algorithmService.calcGroupSumAccrualFundDt(resultAccrualDt, accrFund.paySum)
      } else {
        const accrCount = resultAccrualDt.length
        for (let i = accrCount - 1; i >= 0; i--) {
          const accDt = resultAccrualDt[i]
          if (accDt.dictFundSourceID && payFound.payFundSource.find(o => o.dictFundSourceID === accDt.dictFundSourceID)) {
            existFundSource.forEach(fundSource => {
              resultAccrualDt.push(Object.assign(Object.assign({}, accDt), {
                dictFundSourceID: fundSource.dictFundSourceID,
                paySum: accrualService.round(accDt.paySum / (foundPaySum || 1) * fundSource.paySum),
                baseSum: accrualService.round(accDt.baseSum / (foundBaseSum || 1) * fundSource.baseSum),
                sourceSum: accrualService.round(accDt.sourceSum / (foundSourceSum || 1) * fundSource.sourceSum)
              }))
            })
            resultAccrualDt.splice(i, 1)
          }
        }
        resultAccrualDt = algorithmService.calcGroupSumAccrualFundDt(resultAccrualDt, accrFund.paySum)
      }
    }
  }
  return resultAccrualDt
}

function getAccrualDt ({ cont, params, sourceAccr }) {
  sourceAccr = sourceAccr || {}
  let resultAccrualDt
  const payEl = cont.payEl[params.payElID]
  const position = cont.emp[cont.employeeNumberID] ? (_.findLast(cont.emp[cont.employeeNumberID].prop.employeePositions, o =>
    o.dateFrom <= dateService.shiftDate(params.dateTo || params.dateFrom) && o.dateTo >= dateService.shiftDate(params.dateFrom)) ||
    cont.emp[cont.employeeNumberID].prop.employeePositions[cont.emp[cont.employeeNumberID].prop.employeePositions.length - 1] || {}) : {}
  const entryAcc = payEl.entryOperationID ? cont.dict.hr_entryAcc.filter(entry => entry.entryOperationID === payEl.entryOperationID &&
    (!entry.entryAccDt || (
      (!entry.entryAccDt.org || !entry.entryAccDt.org.length || (entry.excludeOrg && !entry.entryAccDt.org.includes(cont.orgID)) || (!entry.excludeOrg && entry.entryAccDt.org.includes(cont.orgID))) &&
      (!entry.entryAccDt.dep || !entry.entryAccDt.dep.length || (entry.excludeDepartment && !entry.entryAccDt.dep.includes(position.departmentID)) || (!entry.excludeDepartment && entry.entryAccDt.dep.includes(position.departmentID))) &&
      (!entry.entryAccDt.wp || !entry.entryAccDt.wp.length || (entry.excludeWorkPlace && !entry.entryAccDt.wp.includes(position.workPlace)) || (!entry.excludeWorkPlace && entry.entryAccDt.wp.includes(position.workPlace)))
    ))) : []
  switch (payEl.method.code) {
    case '1': // Погодинна за окладом
    case '2': // Оплата за тарифом
    case '3': // Оплата за договором ЦПХ
    case '42': // Разове нарахування
    case '43': // Разове утримання
    case '63': // Відрядна оплата
    case '77': // Стипендія
    case '137': // Оплата простою
    case '141': // Додаткове благо
    case '146': // Педагогічне навантаження
    case '147': // Адміністративна зарплата
    case '150': // Заміна
    case '151': // Сума для розрахунку середнього заробітку
    case '156': // Зарплата вихователя
    case '159': // Змінний бригадний наряд
    {
      const perSource = sourceAccr && sourceAccr.perAccr ? sourceAccr.perAccr : {}
      let dictFundSourceID = params.flagsFix & 1 << 14 ? params.dictFundSourceID
        : (params.dictFundSourceID || perSource.dictFundSourceID || ((sourceAccr && sourceAccr.dictFundSourceID) || null) || payEl.dictFundSourceID || null)
      let dictProjectID = params.flagsFix & 1 << 25 ? params.dictProjectID
        : (params.dictProjectID || perSource.dictProjectID || ((sourceAccr && sourceAccr.dictProjectID) || null) || payEl.dictProjectID || null)
      let dictProgClassID = params.flagsFix & 1 << 24 ? params.dictProgClassID
        : (params.dictProgClassID || perSource.dictProgClassID || (sourceAccr && sourceAccr.dictProgClassID) || payEl.dictProgClassID || null)
      /* // Аналітика із Тарифікації
      if (payEl.method.code === '137' && cont.emp[cont.employeeNumberID].prop.useTariffing) {
        const payElBase = cont.payEl[params.payElID].payElEntrySum
          .filter(o => dateService.shiftDate(o.dateFrom) <= params.dateFrom && dateService.shiftDate(o.dateTo) >= params.dateTo)
          .map(o => o.payElBaseID)
        sourceAccr.accrualDt = algorithmService.getAccrualDtByTariffing(cont, payElBase, params.periodSalary)
      } */
      let hasPosFundSources = false
      let hasPosProject = false
      let hasPosProgClass = false
      if (!dictFundSourceID && !position.fundSources) {
        dictFundSourceID = (entryAcc.length === 1 && entryAcc[0].dictFundSourceID) || null
      }
      if (!dictFundSourceID && position.fundSources) {
        dictFundSourceID = position.fundSources.length === 1 ? (position.fundSources[0].dictFundSourceID || null) : null
        if (position.fundSources.length > 1) {
          hasPosFundSources = true
        }
      }
      if (!dictProjectID && !position.fundSources) {
        dictProjectID = (entryAcc.length === 1 && entryAcc[0].dictProjectID) || null
      }
      if (!dictProjectID && position.fundSources) {
        dictProjectID = position.fundSources.length === 1 ? (position.fundSources[0].dictProjectID || null) : null
        if (position.fundSources.length > 1) {
          hasPosProject = true
        }
      }
      if (!dictProgClassID && !position.fundSources) {
        dictProgClassID = (entryAcc.length === 1 && entryAcc[0].dictProgClassID) || null
      }
      if (!dictProgClassID && position.fundSources) {
        dictProgClassID = position.fundSources.length === 1 ? (position.fundSources[0].dictProgClassID || null) : null
        if (position.fundSources.length > 1) {
          hasPosProgClass = true
        }
      }
      let accountID = null
      if (entryAcc.length === 1 && entryAcc[0].accountDtID) {
        accountID = entryAcc[0].accountDtID
      }
      if (position && !accountID && position.accountID) {
        accountID = position.accountID
      }
      if (perSource && !accountID && perSource.accountID) {
        accountID = perSource.accountID
      }
      if (params.flagsFix & 1 << 17 && params.accrualDt) {
        resultAccrualDt = algorithmService.calcGroupSumAccrualDt((typeof params.accrualDt === 'string') ? JSON.parse(params.accrualDt) : params.accrualDt, params.paySum, true)
        resultAccrualDt.forEach(row => {
          row.departmentID = position ? position.departmentID : null
        })
      } else /* if (payEl.method.code === '137' && sourceAccr && sourceAccr.accrualDt && sourceAccr.accrualDt.length && cont.emp[cont.employeeNumberID].prop.useTariffing) {
        sourceAccr.accrualDt.forEach(row => {
          if (dictFundSourceID) {
            row.dictFundSourceID = dictFundSourceID
          }
          if (!row.dictFundSourceID) {
            row.dictFundSourceID = dictFundSourceID || null
          }
          if (dictProjectID) {
            row.dictProjectID = dictProjectID
          }
          if (!row.dictProjectID) {
            row.dictProjectID = dictProjectID || null
          }
          if (dictProgClassID) {
            row.dictProgClassID = dictProgClassID
          }
          if (!row.dictProgClassID) {
            row.dictProgClassID = dictProgClassID || null
          }
          if (!row.departmentID) {
            row.departmentID = position ? position.departmentID : null
          }
          if (accountID) {
            row.accountID = accountID
          }

          if (!row.accountID) {
            row.accountID = position.accountID
          }
          const dimension = getDimension({
            cont,
            orderMethod: ['payDim', 'accountID', 'entryOperationIDDt'],
            entryAcc,
            accountID: row.accountID
          })
          addDimensionToAccrualDt({ target: row, source: dimension })
          setDimensionFromSource({ target: row, source: position })
          setDimensionFromSource({ target: row, source: perSource })
          if (entryAcc.length === 1) {
            setDimensionFromSource({ target: row, source: entryAcc[0], attrName: 'dimensionDt' })
          }
          setDimensionDepartment({ target: row, source: position })
          setCustomDimension({
            target: row,
            dimensionValue: {
              org_employee: cont.emp[cont.employeeNumberID].prop.employeeNumber.employeeID,
              hr_dictPeriod: sourceAccr && sourceAccr.periodCalc && sourceAccr.periodCalc.ID
            }
          })
          // removeEmptyDimension({ target: row })
        })
        if (hasPosFundSources || hasPosProject) {
          sourceAccr.accrualDt = correctPosFundSource(sourceAccr.accrualDt, position.fundSources, position.mtCount)
        }
        sourceAccr.accrualDt.forEach(accDt => {
          setDimensionProject({ target: accDt, source: accDt, replace: true })
          removeEmptyDimension({ target: accDt })
        })
        resultAccrualDt = algorithmService.calcGroupSumAccrualDt(sourceAccr.accrualDt, params.paySum, true)
        resultAccrualDt = correctFundSource(resultAccrualDt, params, payEl, position, dictFundSourceID)
      } else */ {
        const accrualDt = {
          departmentID: position ? position.departmentID : null,
          dictFundSourceID: dictFundSourceID,
          dictProgClassID: dictProgClassID,
          dictProjectID: dictProjectID,
          accountID: accountID,
          paySum: params.paySum
        }
        const dimension = getDimension({
          cont,
          orderMethod: ['payDim', 'accountID', 'entryOperationIDDt'],
          entryAcc,
          accountID
        })
        setDimensionFromSource({ target: dimension, source: position })
        if (entryAcc.length === 1) {
          setDimensionFromSource({ target: dimension, source: entryAcc[0], attrName: 'dimensionDt' })
        }
        setDimensionDepartment({ target: dimension, source: position })
        if (perSource) {
          setDimensionFromSource({ target: dimension, source: perSource })
        }
        setCustomDimension({
          target: dimension,
          dimensionValue: {
            org_employee: cont.emp[cont.employeeNumberID].prop.employeeNumber.employeeID,
            hr_dictPeriod: sourceAccr && sourceAccr.periodCalc && sourceAccr.periodCalc.ID
          }
        })
        resultAccrualDt = [accrualDt]
        if (hasPosFundSources || hasPosProject || hasPosProgClass) {
          resultAccrualDt = correctPosFundSource(resultAccrualDt, position.fundSources, position.mtCount)
        }
        resultAccrualDt.forEach(accDt => {
          setDimensionProject({ target: dimension, source: accDt, replace: true })
          setDimensionProgClass({ target: dimension, source: accDt, replace: false })
          setDimensionToAccrualDt({ target: accDt, source: dimension })
        })

        resultAccrualDt = correctFundSource(resultAccrualDt, params, payEl, position, dictFundSourceID)
      }
      break
    }
    case '4': // Постійна надбавка
    case '5': // Надбавка за ранг
    case '6': // Надбавка за вислугу років'
    case '7': // Доплата за роботу у вечірній час
    case '8': // Доплата за роботу у нічний час
    case '9': // Доплата за роботу в надурочний час
    case '10': // Доплата за роботу в святковий день
    case '11': // Оплата за роботу у вихідний день
    case '12': // Щомісячна премія
    case '24': // Індексація доходу
    case '25': // Доплата до мінімальної зарплати
    case '33': // Доплата за заміщення
    case '45': // Квартальна премія
    case '46': // Річна премія
    case '47': // Разова премія
    case '49': // Доплата до мінімальної зарплати
    case '50': // Доплата до середнього заробітку
    case '51': // Доплата переведення на легшу роботу
    case '56': // Доплата до повного робочого дня
    case '65': // Премія за період
    case '138': // Переробітокg
    case '148': // Педагогічна надбавка (перевірка зошитів)
    case '153': // Доплата за роботу у шкідливих умовах за табелем
    case '154': // Надбавка за класне керівництво
    case '155': // Надбавка за групу продовженого дня
    case '204': // Доплата до чистої суми з обмеженням
    case '205': // Премія чистою сумою з обмеженням
    case '206': // Премія за чистим заробітком за період
    case '207': // Доплата за особливі години роботи
    case '208': // Спеціальні методи розрахунку звільненим
    {
      if (['12', '24','25', '50', '51', '49', '148', '154', '155', '204', '205', '208'].includes(payEl.method.code) || (['4', '6', '33', '45', '46', '47', '65'].includes(payEl.method.code) && payEl.calcSumType === 'FACT')) {
        const perSource = sourceAccr && sourceAccr.perAccr ? sourceAccr.perAccr : {}
        const dictFundSourceID = params.flagsFix & 1 << 14 ? params.dictFundSourceID
          : (params.dictFundSourceID || perSource.dictFundSourceID || payEl.dictFundSourceID || null)
        const dictProjectID = params.flagsFix & 1 << 14 ? params.dictProjectID
          : (params.dictProjectID || perSource.dictProjectID || payEl.dictProjectID || null)
        const dictProgClassID = params.flagsFix & 1 << 14 ? params.dictProgClassID
          : (params.dictProgClassID || perSource.dictProgClassID || payEl.dictProgClassID || null)
        const departmentID = position.departmentID || null
        const accountID = ((entryAcc.length === 1 && entryAcc[0].accountDtID) ? entryAcc[0].accountDtID : perSource.accountID) || null
        if (params.flagsFix & 1 << 17 && params.accrualDt) {
          resultAccrualDt = algorithmService.calcGroupSumAccrualDt((typeof params.accrualDt === 'string') ? JSON.parse(params.accrualDt) : params.accrualDt, params.paySum, true)
          resultAccrualDt.forEach(row => {
            row.departmentID = position ? position.departmentID : null
          })
        } else {
          // Аналітика із Тарифікації
          if (cont.emp[cont.employeeNumberID].prop.useTariffing && (!sourceAccr.accrualDt || !sourceAccr.accrualDt.length) && perSource.source !== 'trf_accrual') {
            const payElBase = cont.payEl[params.payElID].payElEntrySum
              .filter(o => dateService.shiftDate(o.dateFrom) <= params.dateFrom && dateService.shiftDate(o.dateTo) >= params.dateTo)
              .map(o => o.payElBaseID)
            sourceAccr.accrualDt = algorithmService.getAccrualDtByTariffing(cont, payElBase, params.periodSalary)
          }
          if (!sourceAccr.accrualDt || !sourceAccr.accrualDt.length) {
            sourceAccr.accrualDt = [Object.assign(getDimension({
              cont,
              orderMethod: ['payDim', 'accountID', 'entryOperationIDDt'],
              entryAcc,
              accountID
            }), { paySum: params.paySum })]
          }
          let hasPosFundSources = false
          let optionalDictFundSourceID = null

          if (!dictFundSourceID && !position.fundSources) {
            optionalDictFundSourceID = (entryAcc.length === 1 && entryAcc[0].dictFundSourceID) || null
          }
          if (!dictFundSourceID && position.fundSources) {
            optionalDictFundSourceID = position.fundSources.length === 1 ? (position.fundSources[0].dictFundSourceID || null) : null
            if (position.fundSources.length > 1) {
              hasPosFundSources = true
            }
          }
          let hasPosProject = false
          let optionalDictProjectID = null
          if (!dictProjectID && !position.fundSources) {
            optionalDictProjectID = (entryAcc.length === 1 && entryAcc[0].dictProjectID) || null
          }
          if (!dictProjectID && position.fundSources) {
            optionalDictProjectID = position.fundSources.length === 1 ? (position.fundSources[0].dictProjectID || null) : null
            if (position.fundSources.length > 1) {
              hasPosProject = true
            }
          }
          let hasPosProgClass = false
          let optionalDictProgClassID = null
          if (!dictProgClassID && !position.fundSources) {
            optionalDictProgClassID = (entryAcc.length === 1 && entryAcc[0].dictProgClassID) || null
          }
          if (!dictProgClassID && position.fundSources) {
            optionalDictProgClassID = position.fundSources.length === 1 ? (position.fundSources[0].dictProgClassID || null) : null
            if (position.fundSources.length > 1) {
              hasPosProgClass = true
            }
          }
          sourceAccr.accrualDt.forEach(row => {
            if (params.rate) {
              row.paySum = accrualService.round(row.paySum * (params.rate || 0) / 100, 2)
            }
            if (dictFundSourceID) {
              row.dictFundSourceID = dictFundSourceID
            }
            if (!row.dictFundSourceID) {
              row.dictFundSourceID = optionalDictFundSourceID || null
            }
            if (dictProjectID) {
              row.dictProjectID = dictProjectID
            }
            if (!row.dictProjectID) {
              row.dictProjectID = optionalDictProjectID || null
            }
            if (dictProgClassID) {
              row.dictProgClassID = dictProgClassID
            }
            if (!row.dictProgClassID) {
              row.dictProgClassID = optionalDictProgClassID || null
            }
            if (!row.departmentID) {
              row.departmentID = departmentID
            }
            if (accountID) {
              row.accountID = accountID
            }

            if (!row.accountID) {
              row.accountID = position.accountID
            }
            const dimension = getDimension({
              cont,
              orderMethod: ['payDim', 'accountID', 'entryOperationIDDt'],
              entryAcc,
              accountID: row.accountID
            })
            addDimensionToAccrualDt({ target: row, source: dimension })
            setDimensionFromSource({ target: row, source: position })
            setDimensionFromSource({ target: row, source: perSource })
            if (entryAcc.length === 1) {
              setDimensionFromSource({ target: row, source: entryAcc[0], attrName: 'dimensionDt' })
            }
            setDimensionDepartment({ target: row, source: position })
            setCustomDimension({
              target: row,
              dimensionValue: {
                org_employee: cont.emp[cont.employeeNumberID].prop.employeeNumber.employeeID,
                hr_dictPeriod: sourceAccr && sourceAccr.periodCalc && sourceAccr.periodCalc.ID
              }
            })
            // removeEmptyDimension({ target: row })
          })
          if (hasPosFundSources || hasPosProject || hasPosProgClass) {
            sourceAccr.accrualDt = correctPosFundSource(sourceAccr.accrualDt, position.fundSources, position.mtCount)
          }
          sourceAccr.accrualDt.forEach(accDt => {
            setDimensionProject({ target: accDt, source: accDt, replace: true })
            setDimensionProgClass({ target: accDt, source: accDt, replace: false })
            removeEmptyDimension({ target: accDt })
          })
          resultAccrualDt = algorithmService.calcGroupSumAccrualDt(sourceAccr.accrualDt, params.paySum, true)
          resultAccrualDt = correctFundSource(resultAccrualDt, params, payEl, position, dictFundSourceID)
        }
      } else {
        const perSource = sourceAccr && sourceAccr.perAccr ? sourceAccr.perAccr : {}
        // Аналітика із Тарифікації
        if (cont.emp[cont.employeeNumberID].prop.useTariffing && !sourceAccr.leadAccr && perSource.source !== 'trf_accrual') {
          const payElBase = cont.payEl[params.payElID].payElEntrySum
            .filter(o => dateService.shiftDate(o.dateFrom) <= params.dateFrom && dateService.shiftDate(o.dateTo) >= params.dateTo)
            .map(o => o.payElBaseID)
          const tariffingAccrualDt = algorithmService.getAccrualDtByTariffing(cont, payElBase, params.periodSalary)
          sourceAccr.leadAccr = {
            paySum: tariffingAccrualDt.reduce((a, b) => { return a + b.paySum }, 0),
            accrualDt: tariffingAccrualDt
          }
        }
        const leadSource = sourceAccr && sourceAccr.leadAccr && sourceAccr.leadAccr.accrualDt && sourceAccr.leadAccr.accrualDt.length ? sourceAccr.leadAccr.accrualDt : []
        if (leadSource.length && !leadSource.find(o => o.paySum)) {
          leadSource.forEach(ls => {
            ls.paySum = params.paySum / (leadSource.length || 1)
          })
        }
        let dictFundSourceID = params.flagsFix & 1 << 14 ? params.dictFundSourceID
          : (params.dictFundSourceID || perSource.dictFundSourceID || payEl.dictFundSourceID || null)
        let dictProjectID = params.flagsFix & 1 << 25 ? params.dictProjectID
          : (params.dictProjectID || perSource.dictProjectID || payEl.dictProjectID || null)
        let dictProgClassID = params.flagsFix & 1 << 24 ? params.dictProgClassID
          : (params.dictProgClassID || perSource.dictProgClassID || payEl.dictProgClassID || null)
        let hasPosFundSources = false

        if (!dictFundSourceID && !position.fundSources) {
          dictFundSourceID = (entryAcc.length === 1 && entryAcc[0].dictFundSourceID) || null
        }
        if (!dictFundSourceID && position.fundSources) {
          dictFundSourceID = position.fundSources.length === 1 ? (position.fundSources[0].dictFundSourceID || null) : null
          if (position.fundSources.length > 1) {
            hasPosFundSources = true
          }
        }
        let hasPosDictProject = false
        if (!dictProjectID && !position.fundSources) {
          dictProjectID = (entryAcc.length === 1 && entryAcc[0].dictProjectID) || null
        }
        if (!dictProjectID && position.fundSources) {
          dictProjectID = position.fundSources.length === 1 ? (position.fundSources[0].dictProjectID || null) : null
          if (position.fundSources.length > 1) {
            hasPosDictProject = true
          }
        }
        let hasPosDictProgClass = false
        if (!dictProgClassID && !position.fundSources) {
          dictProgClassID = (entryAcc.length === 1 && entryAcc[0].dictProgClassID) || null
        }
        if (!dictProgClassID && position.fundSources) {
          dictProgClassID = position.fundSources.length === 1 ? (position.fundSources[0].dictProgClassID || null) : null
          if (position.fundSources.length > 1) {
            hasPosDictProgClass = true
          }
        }

        let accountID = null
        if (entryAcc.length === 1 && entryAcc[0].accountDtID) {
          accountID = entryAcc[0].accountDtID
        }
        if (params.flagsFix & 1 << 17 && params.accrualDt) {
          resultAccrualDt = algorithmService.calcGroupSumAccrualDt((typeof params.accrualDt === 'string') ? JSON.parse(params.accrualDt) : params.accrualDt, params.paySum, true)
          resultAccrualDt.forEach(row => {
            row.departmentID = position ? position.departmentID : null
          })
        } else {
          resultAccrualDt = []
          if (leadSource.length) {
            leadSource.forEach(leadDt => {
              if (leadDt.paySum) {
                const accrualDt = {
                  departmentID: leadDt.departmentID || position.departmentID || null,
                  dictFundSourceID: dictFundSourceID || leadDt.dictFundSourceID,
                  dictProgClassID: dictProgClassID || leadDt.dictProgClassID,
                  dictProjectID: dictProjectID || leadDt.dictProjectID,
                  accountID: perSource.accountID || leadDt.accountID || position.accountID || null,
                  paySum: sourceAccr.leadAccr.paySum ? accrualService.round(params.paySum * leadDt.paySum / (sourceAccr.leadAccr.paySum || 1)) : leadDt.paySum
                }
                const dimension = getDimension({
                  cont,
                  orderMethod: ['payDim', 'accountID', 'entryOperationIDDt'],
                  entryAcc,
                  accountID: perSource.accountID || leadDt.accountID || position.accountID || null
                })
                setDimensionFromSource({ target: dimension, source: leadDt })
                setDimensionFromSource({ target: dimension, source: position })
                setDimensionFromSource({ target: dimension, source: perSource })
                if (entryAcc.length === 1) {
                  setDimensionFromSource({ target: dimension, source: entryAcc[0], attrName: 'dimensionDt' })
                }
                setDimensionDepartment({ target: dimension, source: position })
                setCustomDimension({
                  target: dimension,
                  dimensionValue: {
                    org_employee: cont.emp[cont.employeeNumberID].prop.employeeNumber.employeeID,
                    hr_dictPeriod: sourceAccr && sourceAccr.periodCalc && sourceAccr.periodCalc.ID
                  }
                })
                setDimensionToAccrualDt({ target: accrualDt, source: dimension })
                resultAccrualDt.push(accrualDt)
              }
            })
            resultAccrualDt = algorithmService.calcGroupSumAccrualDt(resultAccrualDt, params.paySum, true)
          } else {
            const accrualDt = {
              departmentID: position.departmentID || null,
              dictFundSourceID,
              dictProgClassID,
              dictProjectID,
              accountID: perSource.accountID || position.accountID || null,
              paySum: params.paySum
            }
            const dimension = getDimension({
              cont,
              orderMethod: ['payDim', 'accountID', 'entryOperationIDDt'],
              entryAcc,
              accountID
            })
            setDimensionFromSource({ target: dimension, source: position })
            setDimensionFromSource({ target: dimension, source: perSource })
            if (entryAcc.length === 1) {
              setDimensionFromSource({ target: dimension, source: entryAcc[0], attrName: 'dimensionDt' })
            }
            setDimensionDepartment({ target: dimension, source: position })
            setCustomDimension({
              target: dimension,
              dimensionValue: {
                org_employee: cont.emp[cont.employeeNumberID].prop.employeeNumber.employeeID,
                hr_dictPeriod: sourceAccr && sourceAccr.periodCalc && sourceAccr.periodCalc.ID
              }
            })
            // setDimensionToAccrualDt({ target: accrualDt, source: dimension })
            resultAccrualDt = [accrualDt]
            if (hasPosFundSources || hasPosDictProject || hasPosDictProgClass) {
              resultAccrualDt = correctPosFundSource(resultAccrualDt, position.fundSources, position.mtCount)
            }
            resultAccrualDt.forEach(accDt => {
              setDimensionProject({ target: dimension, source: accDt, replace: true })
              setDimensionProgClass({ target: dimension, source: accDt, replace: false })
              setDimensionToAccrualDt({ target: accDt, source: dimension })
            })
          }
          resultAccrualDt = correctFundSource(resultAccrualDt, params, payEl, position, dictFundSourceID)
        }
      }
      break
    }
    case '13': // Відпустка
    case '67': // Навчальна відпустка
    case '142': // Чорнобильска відпустка
    case '14': // Відпустка по догляду за дитиною до 3-х років
    case '57': // Відпустка по догляду за дитиною до 6-х років
    case '140': // Відпустка по догляду за дитиною-інвалідом до 16/18 років
    case '15': // Відпустка без утримання
    case '16': // Компенсація відпустки
    case '71': // Залишок відпустки
    case '17': // Лікарняні за рахунок підприємства
    case '18': // Лікарняні за рахунок СС
    case '19': // Лікарняний по догляду  за рахунок СС
    case '20': // Лікарняний по вагітності  за рахунок СС
    case '21': // Відрядження
    case '22': // Вихідна допомога
    case '23': // Державні обов\'язки (оплата за середнім заробітком)
    case '68': // Військові збори
    case '36': // Матеріальна допомога
    case '37': // Матеріальна допомога на оздоровлення
    case '40': // Лікарняний по нещасному випадку за рахунок СС
    case '41': // Непідтверджений лікарняний
    case '73': // Донорські дні
    case '44': // Оплата за середнім заробітком
    case '149': // Лікарняний ізоляція від COVID-19
    case '58': // Поновлення на посаді
    case '201': // Резерв відпусток
    case '202': // Резерв відпусток
    case '203': // Інвентаризація резерва відпусток
    {
      const perSource = sourceAccr && sourceAccr.perAccr ? sourceAccr.perAccr : {}
      const dictFundSourceID = params.flagsFix & 1 << 14 ? params.dictFundSourceID
        : (payEl.dictFundSourceID || perSource.dictFundSourceID || null)
      const dictProjectID = params.flagsFix & 1 << 25 ? params.dictProjectID
        : (payEl.dictProjectID || perSource.dictProjectID || null)
      const dictProgClassID = params.flagsFix & 1 << 24 ? params.dictProgClassID : (payEl.dictProgClassID || perSource.dictProgClassID || null)
      const departmentID = position.departmentID || null
      let accountID = position.accountID
      if (perSource && !accountID && perSource.accountID) {
        accountID = perSource.accountID
      }
      if (params.flagsFix & 1 << 17 && params.accrualDt) {
        resultAccrualDt = algorithmService.calcGroupSumAccrualDt((typeof params.accrualDt === 'string') ? JSON.parse(params.accrualDt) : params.accrualDt, params.paySum, true)
        resultAccrualDt.forEach(row => {
          row.departmentID = position ? position.departmentID : null
          setDimensionDepartment({ target: row, source: { departmentID }, replace: true })
        })
      } else {
        if (!sourceAccr.accrualDt || !sourceAccr.accrualDt.length) {
          if (!accountID && entryAcc.length === 1 && entryAcc[0].accountDtID) {
            accountID = entryAcc[0].accountDtID
          }
          sourceAccr.accrualDt = [Object.assign(getDimension({
            cont,
            orderMethod: ['payDim', 'accountID', 'entryOperationIDDt'],
            entryAcc,
            accountID
          }), { paySum: params.paySum, accountID })]
        }
        let hasPosFundSources = false
        let optionalDictFundSourceID = null
        if (!dictFundSourceID && !position.fundSources) {
          optionalDictFundSourceID = (entryAcc.length === 1 && entryAcc[0].dictFundSourceID) || null
        }
        if (!dictFundSourceID && position.fundSources) {
          optionalDictFundSourceID = position.fundSources.length === 1 ? (position.fundSources[0].dictFundSourceID || null) : null
          if (position.fundSources.length > 1) {
            hasPosFundSources = true
          }
        }
        let hasPosDictProject = false
        let optionalDictDictProjectID = null
        if (!dictProjectID && !position.fundSources) {
          optionalDictDictProjectID = (entryAcc.length === 1 && entryAcc[0].dictProjectID) || null
        }
        if (!dictProjectID && position.fundSources) {
          optionalDictDictProjectID = position.fundSources.length === 1 ? (position.fundSources[0].dictProjectID || null) : null
          if (position.fundSources.length > 1) {
            hasPosDictProject = true
          }
        }
        let hasPosDictProgClass = false
        let optionalDictProgClassID = null
        if (!dictProgClassID && !position.fundSources) {
          optionalDictProgClassID = (entryAcc.length === 1 && entryAcc[0].dictProgClassID) || null
        }
        if (!dictProgClassID && position.fundSources) {
          optionalDictProgClassID = position.fundSources.length === 1 ? (position.fundSources[0].dictProgClassID || null) : null
          if (position.fundSources.length > 1) {
            hasPosDictProgClass = true
          }
        }
        sourceAccr.accrualDt.forEach(row => {
          if (dictFundSourceID) {
            row.dictFundSourceID = dictFundSourceID
          }
          if (!row.dictFundSourceID) {
            row.dictFundSourceID = optionalDictFundSourceID
          }
          if (dictProjectID) {
            row.dictProjectID = dictProjectID
          }
          if (!row.dictProjectID) {
            row.dictProjectID = optionalDictDictProjectID
          }
          if (!row.dictProgClassID) {
            row.dictProgClassID = dictProgClassID || optionalDictProgClassID
          }
          // if (!row.departmentID) {
          row.departmentID = departmentID
          setDimensionDepartment({ target: row, source: { departmentID }, replace: true })
          // }
          if (!row.accountID) {
            row.accountID = position.accountID
          }
          if (!row.accountID && entryAcc.length === 1 && entryAcc[0].accountDtID) {
            row.accountID = entryAcc[0].accountDtID
          }
          if (params.paySum === 0) {
            row.dictFundSourceID = null
            row.dictProjectID = null
            row.dictProgClassID = null
          }

          const dimension = getDimension({
            cont,
            orderMethod: ['payDim', 'accountID', 'entryOperationIDDt'],
            entryAcc,
            accountID: row.accountID
          })

          addDimensionToAccrualDt({ target: row, source: dimension })
          setDimensionFromSource({ target: row, source: position })
          if (entryAcc.length === 1) {
            setDimensionFromSource({ target: row, source: entryAcc[0], attrName: 'dimensionDt' })
          }
          setDimensionDepartment({ target: row, source: position })
          if (perSource) {
            setDimensionFromSource({ target: row, source: perSource, replace: true })
          }
          setCustomDimension({
            target: row,
            dimensionValue: {
              org_employee: cont.emp[cont.employeeNumberID].prop.employeeNumber.employeeID,
              hr_dictPeriod: sourceAccr && sourceAccr.periodCalc && sourceAccr.periodCalc.ID
            }
          })
          // removeEmptyDimension({ target: row })
        })
        if (!dictFundSourceID || !cont.dict.ac_fundSource.find(o => o.ID === dictFundSourceID && o['dictFundTypeID.code'] === '02')) {
          const dictFundSourceFSSU = cont.dict.ac_fundSource ? cont.dict.ac_fundSource.filter(o => o['dictFundTypeID.code'] === '02').map(o => o.ID) : []
          if (dictFundSourceFSSU.length) {
            for (let i = sourceAccr.accrualDt.length - 1; i >= 0; i--) {
              if (dictFundSourceFSSU.includes(sourceAccr.accrualDt[i].dictFundSourceID)) {
                sourceAccr.accrualDt[i].dictFundSourceID = null
              }
            }
          }
        }
        if ((hasPosFundSources || hasPosDictProject || hasPosDictProgClass) && params.paySum !== 0) {
          sourceAccr.accrualDt = correctPosFundSource(sourceAccr.accrualDt, position.fundSources, position.mtCount)
        }
        sourceAccr.accrualDt.forEach(accDt => {
          setDimensionProject({ target: accDt, source: accDt, replace: true })
          setDimensionProgClass({ target: accDt, source: accDt, replace: false })
          removeEmptyDimension({ target: accDt })
        })
        resultAccrualDt = algorithmService.calcGroupSumAccrualDt(sourceAccr.accrualDt, params.paySum, true)
      }
      resultAccrualDt = correctFundSource(resultAccrualDt, params, payEl, position, dictFundSourceID)
      break
    }
    case '28': // Виплата заробітної плати
    case '29': // Аванс
    case '30': // Виплата в міжрозрахунковий період
    case '53': // Виплата за рахунок СС
    case '75': // Виплата за джерелом фінансування
    {
      const dictFundSourceID = params.flagsFix & 1 << 14 ? params.dictFundSourceID : (payEl.dictFundSourceID || null)
      const dictProjectID = params.flagsFix & 1 << 25 ? params.dictProjectID : (payEl.dictProjectID || null)
      const dictProgClassID = params.flagsFix & 1 << 24 ? params.dictProgClassID : (payEl.dictProgClassID || null)
      const departmentID = position.departmentID || null
      if (params.flagsFix & 1 << 17 && params.accrualDt) {
        params.accrualDt = (typeof params.accrualDt === 'string') ? JSON.parse(params.accrualDt) : params.accrualDt
        resultAccrualDt = algorithmService.calcGroupSumAccrualDt(params.accrualDt, params.paySum)
        resultAccrualDt.forEach(row => {
          row.departmentID = position ? position.departmentID : null
        })
      } else {
        const dimension = getDimension({
          cont,
          orderMethod: ['payDim', 'accountID', 'entryOperationIDDt'],
          entryAcc
        })
        if (!sourceAccr.accrualDt || !sourceAccr.accrualDt.length) {
          let hasPosFundSources = false
          let optionalDictFundSourceID = null
          let optionalDictProjectID = null
          let optionalDictProgClassID = null
          if (position.fundSources) {
            optionalDictFundSourceID = position.fundSources.length === 1 ? (position.fundSources[0].dictFundSourceID || null) : null
            optionalDictProjectID = position.fundSources.length === 1 ? (position.fundSources[0].dictProjectID || null) : null
            optionalDictProgClassID = position.fundSources.length === 1 ? (position.fundSources[0].dictProgClassID || null) : null
            if (position.fundSources.length > 1) {
              hasPosFundSources = true
            }
          }
          sourceAccr.accrualDt = [Object.assign(dimension, {
            paySum: params.paySum,
            dictFundSourceID: optionalDictFundSourceID || null,
            dictProjectID: optionalDictProjectID || null,
            dictProgClassID: optionalDictProgClassID || null
          })]
          if (hasPosFundSources) {
            sourceAccr.accrualDt = correctPosFundSource(sourceAccr.accrualDt, position.fundSources, position.mtCount)
          }
          sourceAccr.accrualDt.forEach(accDt => {
            setDimensionProject({ target: accDt, source: accDt, replace: true })
            setDimensionProgClass({ target: accDt, source: accDt, replace: false })
          })
        }
        sourceAccr.accrualDt.forEach(row => {
          if (dictFundSourceID) {
            row.dictFundSourceID = dictFundSourceID
          }
          if (!row.dictFundSourceID) {
            row.dictFundSourceID = (entryAcc.length === 1 && entryAcc[0].dictFundSourceID) || null
          }
          if (dictProjectID) {
            row.dictProjectID = dictProjectID
          }
          if (!row.dictProjectID) {
            row.dictProjectID = (entryAcc.length === 1 && entryAcc[0].dictProjectID) || null
          }
          if (dictProgClassID) {
            row.dictProgClassID = dictProgClassID
          }
          if (!row.dictProgClassID) {
            row.dictProgClassID = (entryAcc.length === 1 && entryAcc[0].dictProgClassID) || null
          }
          if (!row.departmentID) {
            row.departmentID = departmentID
          }
          addDimensionToAccrualDt({ target: row, source: dimension })
          setDimensionFromSource({ target: row, source: position })
          if (entryAcc.length === 1) {
            setDimensionFromSource({ target: row, source: entryAcc[0], attrName: 'dimensionDt' })
          }
          setDimensionDepartment({ target: row, source: position })
          setCustomDimension({
            target: row,
            dimensionValue: {
              org_employee: cont.emp[cont.employeeNumberID] ? cont.emp[cont.employeeNumberID].prop.employeeNumber.employeeID : null,
              hr_dictPeriod: sourceAccr && sourceAccr.periodCalc && sourceAccr.periodCalc.ID
            }
          })
          setDimensionProject({ target: row, source: row, replace: true })
          setDimensionProgClass({ target: row, source: row, replace: false })
          removeEmptyDimension({ target: row })
        })
        resultAccrualDt = algorithmService.calcGroupSumAccrualDt(sourceAccr.accrualDt, params.paySum)
        resultAccrualDt = correctFundSource(resultAccrualDt, params, payEl, position, dictFundSourceID)
      }
      break
    }
    case '26': // ПДФО
    case '27': // Війсковий збір
    case '31': // Аліменти
    case '32': // Профспілковий внесок
    case '61': // Утримання за виконавчими листами
    case '62': // Перерахування за заявою працівника
    {
      const departmentID = position.departmentID || null
      const dictFundSourceID = params.flagsFix & 1 << 14 ? params.dictFundSourceID : (payEl.dictFundSourceID || null)
      const dictProjectID = params.flagsFix & 1 << 25 ? params.dictProjectID : (payEl.dictProjectID || null)
      const dictProgClassID = params.flagsFix & 1 << 24 ? params.dictProgClassID : (payEl.dictProgClassID || null)
      if (params.flagsFix & 1 << 17 && params.accrualDt) {
        resultAccrualDt = algorithmService.calcGroupSumAccrualDt((typeof params.accrualDt === 'string') ? JSON.parse(params.accrualDt) : params.accrualDt, params.paySum, true)
        resultAccrualDt.forEach(row => {
          row.departmentID = position ? position.departmentID : null
        })
      } else {
        const dimension = getDimension({
          cont,
          orderMethod: ['entryOperationIDDt'],
          entryAcc
        })
        if (!sourceAccr.accrualDt || !sourceAccr.accrualDt.length) {
          let hasPosFundSources = false
          let optionalDictFundSourceID = null
          let optionalDictProjectID = null
          let optionalDictProgClassID = null
          if (position.fundSources) {
            optionalDictFundSourceID = position.fundSources.length === 1 ? (position.fundSources[0].dictFundSourceID || null) : null
            optionalDictProjectID = position.fundSources.length === 1 ? (position.fundSources[0].dictProjectID || null) : null
            optionalDictProgClassID = position.fundSources.length === 1 ? (position.fundSources[0].dictProgClassID || null) : null
            if (position.fundSources.length > 1) {
              hasPosFundSources = true
            }
          }
          sourceAccr.accrualDt = [Object.assign(dimension, {
            paySum: params.paySum,
            dictFundSourceID: dictFundSourceID || optionalDictFundSourceID || null,
            dictProjectID: dictProjectID || optionalDictProjectID || null,
            dictProgClassID: dictProgClassID || optionalDictProgClassID || null
          })]
          if (hasPosFundSources) {
            sourceAccr.accrualDt = correctPosFundSource(sourceAccr.accrualDt, position.fundSources, position.mtCount)
          }
          sourceAccr.accrualDt.forEach(accDt => {
            setDimensionProject({ target: accDt, source: accDt, replace: true })
          })
        }

        sourceAccr.accrualDt.forEach(row => {
          if (dictFundSourceID) {
            row.dictFundSourceID = dictFundSourceID
          }
          if (!row.dictFundSourceID) {
            row.dictFundSourceID = (entryAcc.length === 1 && entryAcc[0].dictFundSourceID) || null
          }
          if (dictProjectID) {
            row.dictProjectID = dictProjectID
          }
          if (!row.dictProjectID) {
            row.dictProjectID = (entryAcc.length === 1 && entryAcc[0].dictProjectID) || null
          }
          if (!row.dictProgClassID) {
            row.dictProgClassID = dictProgClassID || (entryAcc.length === 1 && entryAcc[0].dictProgClassID) || null
          }
          if (!row.departmentID) {
            row.departmentID = departmentID
          }
          addDimensionToAccrualDt({ target: row, source: dimension })
          setDimensionFromSource({ target: row, source: position })
          if (entryAcc.length === 1) {
            setDimensionFromSource({ target: row, source: entryAcc[0], attrName: 'dimensionDt' })
          }
          setDimensionDepartment({ target: row, source: position })
          setCustomDimension({
            target: row,
            dimensionValue: {
              org_employee: cont.emp[cont.employeeNumberID].prop.employeeNumber.employeeID,
              hr_dictPeriod: sourceAccr && sourceAccr.periodCalc && sourceAccr.periodCalc.ID
            }
          })
          setDimensionProject({ target: row, source: row, replace: true })
          setDimensionProgClass({ target: row, source: row, replace: false })
          removeEmptyDimension({ target: row })
        })
        resultAccrualDt = algorithmService.calcGroupSumAccrualDt(sourceAccr.accrualDt, params.paySum, true)
      }
      resultAccrualDt = correctFundSource(resultAccrualDt, params, payEl, position, dictFundSourceID)
      break
    }
    case '38': // Матеріальна допомога на поховання  за рахунок СС'
    case '135': // Відшкодування вартості поховання  за рахунок СС'
    {
      let hasPosFundSources = false
      let optionalDictFundSourceID = null
      let optionalDictProjectID = null
      let optionalDictProgClassID = null
      if (position.fundSources) {
        optionalDictFundSourceID = position.fundSources.length === 1 ? (position.fundSources[0].dictFundSourceID || null) : null
        optionalDictProjectID = position.fundSources.length === 1 ? (position.fundSources[0].dictProjectID || null) : null
        optionalDictProgClassID = position.fundSources.length === 1 ? (position.fundSources[0].dictProgClassID || null) : null
        if (position.fundSources.length > 1) {
          hasPosFundSources = true
        }
      }
      const dictFundSourceID = params.flagsFix & 1 << 14 ? params.dictFundSourceID : (payEl.dictFundSourceID || optionalDictFundSourceID || null)
      const dictProjectID = params.flagsFix & 1 << 14 ? params.dictProjectID : (payEl.dictProjectID || optionalDictProjectID || null)
      const dictProgClassID = params.flagsFix & 1 << 24 ? params.dictProgClassID : (payEl.dictProgClassID || optionalDictProgClassID || null)
      const departmentID = position.departmentID || null
      const accountID = ((entryAcc.length === 1 && entryAcc[0].accountDtID) ? entryAcc[0].accountDtID : position.accountID) || null
      if (params.flagsFix & 1 << 17 && params.accrualDt) {
        resultAccrualDt = algorithmService.calcGroupSumAccrualDt((typeof params.accrualDt === 'string') ? JSON.parse(params.accrualDt) : params.accrualDt, params.paySum, true)
        resultAccrualDt.forEach(row => {
          row.departmentID = position ? position.departmentID : null
        })
      } else {
        if (!sourceAccr.accrualDt || !sourceAccr.accrualDt.length) {
          sourceAccr.accrualDt = [Object.assign(getDimension({
            cont,
            orderMethod: ['payDim', 'entryOperationIDDt'],
            entryAcc
          }), { paySum: params.paySum })]
        }
        if (hasPosFundSources) {
          sourceAccr.accrualDt = correctPosFundSource(sourceAccr.accrualDt, position.fundSources, position.mtCount)
        }
        sourceAccr.accrualDt.forEach(row => {
          if (dictFundSourceID) {
            row.dictFundSourceID = dictFundSourceID
          }
          if (!row.dictFundSourceID) {
            row.dictFundSourceID = (entryAcc.length === 1 && entryAcc[0].dictFundSourceID) || null
          }
          if (dictProjectID) {
            row.dictProjectID = dictProjectID
          }
          if (!row.dictProjectID) {
            row.dictProjectID = (entryAcc.length === 1 && entryAcc[0].dictProjectID) || null
          }
          if (!row.dictProgClassID) {
            row.dictProgClassID = dictProgClassID || (entryAcc.length === 1 && entryAcc[0].dictProgClassID) || null
          }
          if (!row.departmentID) {
            row.departmentID = departmentID
          }
          if (accountID) {
            row.accountID = accountID
          }

          if (!row.accountID) {
            row.accountID = position.accountID
          }
          setDimensionFromSource({ target: row, source: position })
          if (entryAcc.length === 1) {
            setDimensionFromSource({ target: row, source: entryAcc[0], attrName: 'dimensionDt' })
          }
          setDimensionDepartment({ target: row, source: position })
          setCustomDimension({
            target: row,
            dimensionValue: {
              org_employee: cont.emp[cont.employeeNumberID].prop.employeeNumber.employeeID,
              hr_dictPeriod: sourceAccr && sourceAccr.periodCalc && sourceAccr.periodCalc.ID
            }
          })
          setDimensionProject({ target: row, source: row, replace: true })
          setDimensionProgClass({ target: row, source: row, replace: false })
          removeEmptyDimension({ target: row })
        })
        resultAccrualDt = algorithmService.calcGroupSumAccrualDt(sourceAccr.accrualDt, params.paySum, true)
        resultAccrualDt = correctFundSource(resultAccrualDt, params, payEl, position, dictFundSourceID)
      }
      break
    }
  }

  return resultAccrualDt
}

function correctFundSource (resultAccrualDt, params, payEl, position, dictFundSourceID) {
  if (!dictFundSourceID && payEl.payElFundSource.length && !(params.flagsFix & 1 << 17)) {
    if (!payEl.excludeFundSource) {
      const existFundSource = []
      let foundPaySum = 0
      resultAccrualDt.forEach(row => {
        if (row.dictFundSourceID && payEl.payElFundSource.find(o => o.dictFundSourceID === row.dictFundSourceID)) {
          existFundSource.push(row)
          foundPaySum = accrualService.round(foundPaySum + row.paySum)
        }
      })
      if (!existFundSource.length) {
        let hasPosFundSources = false
        let optionalDictFundSourceID = null
        if (position.fundSources) {
          optionalDictFundSourceID = position.fundSources.length === 1 ? (position.fundSources[0].dictFundSourceID || null) : null
          if (position.fundSources.length > 1) {
            hasPosFundSources = true
          }
        }
        resultAccrualDt.forEach(row => {
          row.dictFundSourceID = hasPosFundSources ? null : optionalDictFundSourceID
        })
        if (hasPosFundSources) {
          resultAccrualDt = correctPosFundSource(resultAccrualDt, position.fundSources, position.mtCount)
        }
        resultAccrualDt = algorithmService.calcGroupSumAccrualDt(resultAccrualDt, params.paySum, true)
      } else {
        const accrCount = resultAccrualDt.length
        for (let i = accrCount - 1; i >= 0; i--) {
          const accDt = resultAccrualDt[i]
          if (!accDt.dictFundSourceID || !payEl.payElFundSource.find(o => o.dictFundSourceID === accDt.dictFundSourceID)) {
            existFundSource.forEach(fundSource => {
              resultAccrualDt.push(Object.assign(Object.assign({}, accDt), {
                dictFundSourceID: fundSource.dictFundSourceID,
                paySum: accrualService.round(accDt.paySum / (foundPaySum || 1) * fundSource.paySum)
              }))
            })
            resultAccrualDt.splice(i, 1)
          }
        }
        resultAccrualDt = algorithmService.calcGroupSumAccrualDt(resultAccrualDt, params.paySum, true)
      }
    } else {
      const existFundSource = []
      let foundPaySum = 0
      resultAccrualDt.forEach(row => {
        if (!row.dictFundSourceID || !payEl.payElFundSource.find(o => o.dictFundSourceID === row.dictFundSourceID)) {
          existFundSource.push(row)
          foundPaySum = accrualService.round(foundPaySum + row.paySum)
        }
      })
      resultAccrualDt = algorithmService.calcGroupSumAccrualDt(resultAccrualDt, params.paySum, true)
      if (!existFundSource.length) {
        let hasPosFundSources = false
        let optionalDictFundSourceID = null
        if (position.fundSources) {
          optionalDictFundSourceID = position.fundSources.length === 1 ? (position.fundSources[0].dictFundSourceID || null) : null
          if (position.fundSources.length > 1) {
            hasPosFundSources = true
          }
        }
        resultAccrualDt.forEach(row => {
          row.dictFundSourceID = hasPosFundSources ? null : optionalDictFundSourceID
        })
        if (hasPosFundSources) {
          resultAccrualDt = correctPosFundSource(resultAccrualDt, position.fundSources, position.mtCount)
        }
        resultAccrualDt = algorithmService.calcGroupSumAccrualDt(resultAccrualDt, params.paySum, true)
      } else {
        const accrCount = resultAccrualDt.length
        for (let i = accrCount - 1; i >= 0; i--) {
          const accDt = resultAccrualDt[i]
          if (accDt.dictFundSourceID && payEl.payElFundSource.find(o => o.dictFundSourceID === accDt.dictFundSourceID)) {
            existFundSource.forEach(fundSource => {
              resultAccrualDt.push(Object.assign(Object.assign({}, accDt), {
                dictFundSourceID: fundSource.dictFundSourceID,
                paySum: accrualService.round(accDt.paySum / (foundPaySum || 1) * fundSource.paySum)
              }))
            })
            resultAccrualDt.splice(i, 1)
          }
        }
        resultAccrualDt = algorithmService.calcGroupSumAccrualDt(resultAccrualDt, params.paySum, true)
      }
    }
  }
  return resultAccrualDt
}

function correctPosFundSource (accrualDt, fundSources, mtCount, isFund = false) {
  const resultAccrualDt = []
  accrualDt.forEach(row => {
    const fundSource = fundSources.find(o => o.dictFundSourceID)
    const project = fundSources.find(o => o.dictProjectID)
    const progClass = fundSources.find(o => o.dictProgClassID)
    if ((row.dictFundSourceID && row.dictProjectID && row.dictProgClassID) || !fundSources.find(o => o.dictFundSourceID || o.dictProjectID || o.dictProgClassID) ||
      ((!row.dictFundSourceID && !fundSource) && (!row.dictProjectID && !project) && (!row.dictProgClassID && !progClass))
    // (row.dictFundSourceID && !fundSources.find(o => o.dictProjectID)) || (row.dictProjectID && !fundSources.find(o => o.dictFundSourceID))
    ) {
      resultAccrualDt.push(row)
    } else {
      const accDt = []
      if (!row.dictProgClassID) {
        fundSources.forEach(fundSource => {
          const newDt = Object.assign({}, row)
          newDt.paySum = accrualService.round(newDt.paySum / (mtCount || 1) * fundSource.mtCount)
          if (isFund) {
            newDt.sourceSum = accrualService.round(newDt.sourceSum / (mtCount || 1) * fundSource.mtCount)
            newDt.baseSum = accrualService.round(newDt.baseSum / (mtCount || 1) * fundSource.mtCount)
          }
          newDt.dictFundSourceID = row.dictFundSourceID || fundSource.dictFundSourceID
          newDt.dictProjectID = row.dictProjectID || fundSource.dictProjectID
          newDt.dictProgClassID = row.dictProgClassID || fundSource.dictProgClassID
          accDt.push(newDt)
        }) 
      } else {
        const fundSource = fundSources.find(fs => {
          return fs.dictProgClassID === row.dictProgClassID
        })
        if (!fundSource) return
        const newDt = Object.assign({}, row)
        newDt.paySum = accrualService.round(newDt.paySum / (mtCount || 1) * fundSource.mtCount)
        if (isFund) {
          newDt.sourceSum = accrualService.round(newDt.sourceSum / (mtCount || 1) * fundSource.mtCount)
          newDt.baseSum = accrualService.round(newDt.baseSum / (mtCount || 1) * fundSource.mtCount)
        }
        newDt.dictFundSourceID = row.dictFundSourceID || fundSource.dictFundSourceID
        newDt.dictProjectID = row.dictProjectID || fundSource.dictProjectID
        newDt.dictProgClassID = row.dictProgClassID || fundSource.dictProgClassID
        accDt.push(newDt)
      }
      if (isFund) {
        resultAccrualDt.push(...algorithmService.calcGroupSumAccrualFundDt(accDt, row.paySum))
      } else {
        resultAccrualDt.push(...algorithmService.correctAccrualDt(accDt, row.paySum))
      }
    }
  })
  return resultAccrualDt
}
