const UB = require('@unitybase/ub')
const periodService = require('../../HR/modules/periodService')
const dateService = require('../../AC/modules/dataServices/dateService')
const algorithmService = require('../../HR/modules/algorithmService')
const accrualService = require('../../HR/modules/accrualService')
const postingService = require('../../HR/modules/postingService')
const algorithmPaySalary = require('../modules/algorithm/paySalary') // Виплата зарплати
const algorithmPrepayment = require('../modules/algorithm/prepayment') // Виплата аванса
const algorithmWithinPeriod = require('../modules/algorithm/withinPeriod') // Виплата в межрасчет
const algorithmPayFSS = require('../modules/algorithm/payFSS') // Виплата за рахунок СС


module.exports = {
  calculatePayment,
  calculatePrepayment,
  calculateWhithinPeriod,
  calculatePayFSS,
  calculateAlimony,
  calculateRequestEmployee,
  calculateFundSource,
  getPayOutList
}

function getPayOutList (orgID, fileldList, optional = {}) {
  const treePath = UB.Repository('hr_organization')
    .attrs('mi_treePath')
    .where('mi_data_id', '=', orgID)
    .where('state', '=', 'ACTIVE')
    .limit(1)
    .selectScalar()
  return UB.Repository('hr_payOut')
    .attrs(fileldList || ['ID', 'name', 'isDefault', 'exportMethodID', 'projectCode', 'branchCode', 'organizationID'])
    .where('organizationID', 'equal', orgID, 'org')
    .where('subOrg', 'equal', 1, 'sub')
    .where('organizationID', 'in', treePath ? treePath.split('/').map(o => Number(o)) : [orgID], 'parent')
    .logic('([org] OR ([parent] AND [sub]))')
    .selectAsObject(optional)
}

function getPayObligatory ({ cont, payObligatory, dateFrom, dateTo }) {
  const payEl = []
  Object.keys(cont.payEl).forEach(payElID => {
    if (cont.payEl[payElID].method.groupType === 'OFFTAKE' && cont.payEl[payElID].payElDepend.length) {
      payEl.push(cont.payEl[payElID])
    }
  })
  cont.org.orgObligatory.forEach(orgObl => {
    let payDepend
    let payType
    payDepend = cont.payFund.filter(o => o.payFundDepend.find(o => o.ownerID === orgObl.ID && dateFrom <= o.dateTo && dateTo >= o.dateFrom))
    if (!payDepend.length) {
      payDepend = payEl.filter(o => o.payElDepend.find(o => o.ownerID === orgObl.ID && dateFrom <= o.dateTo && dateTo >= o.dateFrom))
      payType = 0
    } else { payType = 1 }
    payDepend.forEach(item => {
      payObligatory.push({
        payID: item.ID,
        payType: payType,
        methodCode: item.method ? item.method.code : null,
        name: item.name,
        payObligatoryID: orgObl.ID,
        nameObligatory: orgObl.name,
        contractor: orgObl.contractor,
        contrAccountID: orgObl.contrAccountID,
        contrAccount: orgObl.contrAccount,
        payer: orgObl.payer,
        payObligatoryDep: orgObl.payObligatoryDep
      })
    })
  })
}

function setAccrualPaymentOrder ({ orderParams, accr, payObligatory, payItem, position = {} }) {
  const payObligatoryDep = payObligatory.payObligatoryDep.find(o => (o.departmentID === position.departmentID || !o.departmentID) &&
    (o.positionID === position.positionID || !o.positionID) && (o.dictPositionID === position.dictPositionID || !o.dictPositionID) &&
    (o.employeeNumberID === position.employeeNumberID || !o.employeeNumberID))
  const payOrder = accr.paymentDt.find(o => o.payObligatoryID === payObligatory.payObligatoryID &&
    o.contrAccountID === (payObligatoryDep ? payObligatoryDep.contrAccountID : payObligatory.contrAccountID))
  if (payOrder) {
    payOrder.paySum = accrualService.round(payOrder.paySum + payItem.paySum, 2)
    payOrder.paymentOrderAccDt.push(...algorithmService.correctAccrualDt(payItem.accrualDt || payItem.accrualFundDt || [], payItem.paySum))
    const payOrderDt = payOrder.paymentOrderDt.find(o => o.employeeNumberID === payItem.employeeNumberID)
    if (payOrderDt) {
      payOrderDt.paySum = accrualService.round(payOrderDt.paySum + payItem.paySum, 2)
    } else {
      payOrder.paymentOrderDt.push({
        employeeNumberID: payItem.employeeNumberID,
        'employeeNumberID.description': accr['employeeNumberID.description'],
        paySum: accrualService.round(payItem.paySum, 2)
      })
    }
  } else {
    accr.paymentDt.push({
      payObligatoryID: payObligatory.payObligatoryID,
      paySum: accrualService.round(payItem.paySum, 2),
      periodCalcID: orderParams.periodSalaryID,
      'payObligatoryID.orgName': payObligatory.payer,
      'payObligatoryID.name': payObligatory.nameObligatory,
      'contrAccountID.organizationID.name': payObligatoryDep ? payObligatoryDep.contractor : payObligatory.contractor,
      'contrAccountID.description': payObligatoryDep ? payObligatoryDep.contrAccount : payObligatory.contrAccount,
      contrAccountID: payObligatoryDep ? payObligatoryDep.contrAccountID : payObligatory.contrAccountID,
      paymentOrderAccDt: algorithmService.correctAccrualDt(payItem.accrualDt || payItem.accrualFundDt || [], payItem.paySum),
      paymentOrderDt: [{
        employeeNumberID: payItem.employeeNumberID,
        'employeeNumberID.description': accr['employeeNumberID.description'],
        paySum: accrualService.round(payItem.paySum, 2)
      }]
    })
  }
}

function calculatePayment ({ orgID, cont, orderParams }) {
  const rlService = require('../../HR/modules/rlService')
  const currentPeriod = periodService.getCurrentPeriod(orgID)
  const periodCalc = periodService.getPeriod(orderParams.periodCalcID)
  const periodSalary = periodService.getPeriod(orderParams.periodSalaryID)
  orderParams.paymentOrder = []
  const employeeNumbers = orderParams.accruals.map(o => o.employeeNumberID)

  rlService.loadCalcData({ cont,
    orgID,
    employeeNumbers,
    periodID: orderParams.periodSalaryID,
    loadData: { prop: true,
      dateFrom: periodSalary.dateFrom,
      dateTo: periodSalary.dateTo,
      skipSecondJobs: true,
      skipParentEmployee: true,
      entityList: ['employeePosition']
    } })
  const dictFundSourceList = accrualService.getIDsFromString(orderParams.dictFundSourceList)
  const dictFundSourceFSSU = cont.dict.ac_fundSource.filter(o => o['dictFundTypeID.code'] === '02').map(o => o.ID)
  const dictProgClassList = accrualService.getIDsFromString(orderParams.dictProgClassList)
  const dictProjectList = accrualService.getIDsFromString(orderParams.dictProjectList)
  console.debug(`Payment calc finish load emp data ${dateService.formatDate(dateService.currentDateTime(), 'dd.mm.yyyy hh:nn:ss')}`)
  // Завантаження даних розахункових листів працівників за розрахунковий periodSalary
  accrualService.getAccrualByPeriodForEmployeeNumbers(cont, employeeNumbers, periodSalary.ID)
  console.debug(`Payment calc finish load emp accrual ${dateService.formatDate(dateService.currentDateTime(), 'dd.mm.yyyy hh:nn:ss')}`)
  accrualService.getAccrualFundByPeriodForEmployeeNumbers(cont, employeeNumbers, periodSalary.ID)
  console.debug(`Payment calc finish load emp accrual ${dateService.formatDate(dateService.currentDateTime(), 'dd.mm.yyyy hh:nn:ss')}`)
  if (dictFundSourceList || dictProgClassList || dictProjectList) {
    console.debug(`Payment calc finish load emp balanceOut accrual ${dateService.formatDate(dateService.currentDateTime(), 'dd.mm.yyyy hh:nn:ss')}`)
    accrualService.getAccrualBalanceByFundForEmployeeNumbers(cont, employeeNumbers, periodSalary.priorPeriodID, 'accrualBalance', dictFundSourceList, dictProgClassList, dictProjectList)
    console.debug(`Payment calc finish load emp balance accrual ${dateService.formatDate(dateService.currentDateTime(), 'dd.mm.yyyy hh:nn:ss')}`)
    if (periodSalary.dateFrom > currentPeriod.dateFrom) {
      const addBalance = periodSalary.dateFrom > currentPeriod.dateFrom && orderParams.applyBalance === false ? null : 'accrualBalance'
      accrualService.getAccrualBalanceByFundForEmployeeNumbersNext(cont, employeeNumbers, currentPeriod, periodSalary, 'accrualBalanceOut', addBalance, dictFundSourceList, dictProgClassList, dictProjectList)
      accrualService.getAccrualBalanceByFundForEmployeeNumbersNext(cont, employeeNumbers, currentPeriod, periodSalary, 'accrualBalanceOutAll', addBalance)
    } else {
      accrualService.getAccrualBalanceByFundForEmployeeNumbers(cont, employeeNumbers, currentPeriod.ID, 'accrualBalanceOut', dictFundSourceList, dictProgClassList, dictProjectList)
      accrualService.getAccrualBalanceByFundForEmployeeNumbers(cont, employeeNumbers, currentPeriod.ID, 'accrualBalanceOutAll')
      if (periodSalary.dateFrom < currentPeriod.dateFrom) {
        accrualService.getPaymentInNextPeriod(cont, employeeNumbers, currentPeriod, periodSalary, 'accrualBalanceOut', null, dictFundSourceList, dictProgClassList, dictProjectList)
      }
    }
  } else {
    console.debug(`Payment calc finish load emp balanceOut accrual ${dateService.formatDate(dateService.currentDateTime(), 'dd.mm.yyyy hh:nn:ss')}`)
    accrualService.getAccrualBalanceForEmployeeNumbers(cont, employeeNumbers, periodSalary.priorPeriodID, 'accrualBalance', dictFundSourceFSSU.length ? dictFundSourceFSSU : [0])
    console.debug(`Payment calc finish load emp balance accrual ${dateService.formatDate(dateService.currentDateTime(), 'dd.mm.yyyy hh:nn:ss')}`)
    if (periodSalary.dateFrom > currentPeriod.dateFrom) {
      const addBalance = periodSalary.dateFrom > currentPeriod.dateFrom && orderParams.applyBalance === false ? null : 'accrualBalance'
      accrualService.getAccrualBalanceForEmployeeNumbersNext(cont, employeeNumbers, currentPeriod, periodSalary, 'accrualBalanceOut', addBalance, dictFundSourceFSSU.length ? dictFundSourceFSSU : [0])
      accrualService.getAccrualBalanceForEmployeeNumbersNext(cont, employeeNumbers, currentPeriod, periodSalary, 'accrualBalanceOutAll', addBalance)
    } else {
      accrualService.getAccrualBalanceForEmployeeNumbers(cont, employeeNumbers, currentPeriod.ID, 'accrualBalanceOut', dictFundSourceFSSU.length ? dictFundSourceFSSU : [0])
      accrualService.getAccrualBalanceForEmployeeNumbers(cont, employeeNumbers, currentPeriod.ID, 'accrualBalanceOutAll')
      if (periodSalary.dateFrom < currentPeriod.dateFrom) {
        accrualService.getPaymentInNextPeriod(cont, employeeNumbers, currentPeriod, periodSalary, 'accrualBalanceOut', dictFundSourceFSSU.length ? dictFundSourceFSSU : [0])
      }
    }
  }
  const payObligatory = []
  getPayObligatory({ cont, payObligatory, dateFrom: periodSalary.dateFrom, dateTo: periodSalary.dateTo })
  orderParams.accruals.forEach(accr => {
    if (!(accr.flagsFix & 1 << 22)) {
      accr.accrualDt = []
      accr.paymentDt = []
      accr.taxSum = 0
      accr.baseSum = 0
      let taxSum = 0
      let paidSum = 0
      const offtakeAccrual = []
      if (cont.emp[accr.employeeNumberID]) {
        const position = cont.emp[accr.employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= periodCalc.dateTo && o.dateTo >= periodCalc.dateFrom) ||
          cont.emp[accr.employeeNumberID].prop.employeePositions[cont.emp[accr.employeeNumberID].prop.employeePositions.length - 1] || {}
        accr.balanceSum = (periodSalary.dateFrom > currentPeriod.dateFrom && orderParams.applyBalance === false) ? 0 : (cont.emp[accr.employeeNumberID].accrualBalance || 0)
        cont.emp[accr.employeeNumberID].accrual.forEach(acc => {
          const groupType = cont.payEl[acc.payElID].method.groupType
          if (!(acc.flagsRec & 8192) && acc.periodCalcID === orderParams.periodSalaryID) {
            const koef = groupType === 'PAYMENT' ? 1 : -1
            const accrualDt = []
            if (acc.accrualDt && acc.accrualDt.length) {
              acc.accrualDt.forEach(accDt => {
                delete accDt.ID
                if ((!dictFundSourceFSSU.length || !dictFundSourceFSSU.includes(accDt.dictFundSourceID)) &&
                  (!dictFundSourceList || dictFundSourceList.includes(accDt.dictFundSourceID)) &&
                  (!dictProgClassList || dictProgClassList.includes(accDt.dictProgClassID)) &&
                  (!dictProjectList || dictProjectList.includes(accDt.dictProjectID))
                ) {
                  const dt = Object.assign({}, accDt)
                  dt.paySum = koef * accDt.paySum
                  accr.accrualDt.push(dt)
                  accrualDt.push(accDt)
                } else {
                  acc.paySum = accrualService.round(acc.paySum - accDt.paySum, 2)
                }
              })
              acc.accrualDt = accrualDt
            } else if (dictFundSourceList || dictProgClassList || dictProjectList) {
              acc.paySum = 0
              acc.accrualDt = []
            }
            if (groupType === 'PAYMENT') {
              accr.baseSum = accrualService.round(accr.baseSum + acc.paySum, 2)
            } else if (groupType === 'FORPAY') {
              paidSum = accrualService.round(paidSum + acc.paySum, 2)
            } else if (groupType === 'OFFTAKE') {
              const payObl = payObligatory.find(o => o.payID === acc.payElID)
              accr.taxSum = accrualService.round(accr.taxSum + acc.paySum, 2)
              if (payObl) {
                taxSum = accrualService.round(taxSum + acc.paySum, 2)
                acc.payObligatoryID = payObl.payObligatoryID
                offtakeAccrual.push(acc)
              }
            }
          }
        })
        accr.taxSum = accrualService.round(accr.taxSum + paidSum, 2)
        accr.baseSum = accrualService.round(accr.baseSum, 2)
        accr.planPaySum = accrualService.round((accr.baseSum + accr.balanceSum - accr.taxSum) * (orderParams.rate ? orderParams.rate / 100 : 1), 2)
        if (accr.balanceSum && cont.emp[accr.employeeNumberID].accrualBalanceFundSource) {
          accr.accrualDt.push(...cont.emp[accr.employeeNumberID].accrualBalanceFundSource)
        }

        if (!(accr.flagsFix & 1 << 1)) {
          accr.paySum = accr.planPaySum
        }
        // Контроль выхода на долг:
        if (!(accr.flagsFix & 1 << 21) && accr.paySum > Math.min((cont.emp[accr.employeeNumberID].accrualBalanceOut || 0), (cont.emp[accr.employeeNumberID].accrualBalanceOutAll || 0))) {
          accr.paySum = Math.max(0, Math.min((cont.emp[accr.employeeNumberID].accrualBalanceOut || 0), (cont.emp[accr.employeeNumberID].accrualBalanceOutAll || 0)))
          accr.flagsFix = accr.flagsFix | 1 << 3
        }

        if (accr.paySum < 0.01) {
          accr.paySum = 0
          accr.reason = '1'
        } else {
          accr.reason = '0'
        }
        let payFacts = []
        const payObligatoryStore = UB.DataStore('hr_payObligatory')
        if (!dictFundSourceList && !dictProgClassList && !dictProjectList) {
          payObligatoryStore.runSQL(` SELECT o.id "payObligatoryID", sum(pdt.paySum) "paySum"
                              FROM hr_payObligatory o
                              JOIN hr_paymentOrder p ON p.payObligatoryID = o.ID
                                AND p.payRollID is not null 
                                AND p.payRollID <> :payRollID: 
                              JOIN hr_payRoll pr ON pr.ID = p.payRollID AND pr.mi_deleteDate >= '9999-12-31' 
                              AND pr.orderType not in ('hr_payFSSBank', 'hr_payFSSCash') AND pr.periodSalaryID = :periodID:
                              JOIN hr_paymentOrderDt pdt ON pdt.paymentOrderID = p.ID AND pdt.employeeNumberID = :employeeNumberID:
                              WHERE o.organizationID = :orgID: AND o.mi_deleteDate >= '9999-12-31'
                              GROUP BY o.id
                               `, {
            periodID: periodSalary.ID,
            payRollID: orderParams.orderID,
            employeeNumberID: accr.employeeNumberID,
            orgID
          })
          payFacts = payObligatoryStore.getAsJsObject()
        } else {
          payObligatoryStore.runSQL(`
         SELECT prdt.paymentDt "paymentDt"
         FROM hr_payRoll pr
         JOIN hr_payRollDt prdt on prdt.payRollID = pr.ID  AND prdt.employeeNumberID = :employeeNumberID: AND prdt.mi_deleteDate >= '9999-12-31'
         WHERE pr.organizationID = :orgID: AND pr.periodSalaryID = :periodID: AND pr.ID <> :payRollID: AND 
         pr.orderType not in ('hr_payFSSBank', 'hr_payFSSCash') AND pr.mi_deleteDate >= '9999-12-31' 
         `, {
            periodID: periodSalary.ID,
            payRollID: orderParams.orderID,
            employeeNumberID: accr.employeeNumberID,
            orgID
          })
          payFacts = payObligatoryStore.getAsJsObject()
        }
        if (taxSum) {
          payFacts.forEach(fact => {
            if (!dictFundSourceList && !dictProgClassList && !dictProjectList) {
              const correctAccrual = []
              let correctAccrualSum = 0
              offtakeAccrual.forEach(otAcc => {
                if (fact.payObligatoryID === otAcc.payObligatoryID) {
                  correctAccrual.push(otAcc)
                  correctAccrualSum = accrualService.round(correctAccrualSum + otAcc.paySum, 2)
                }
              })
              if (correctAccrual.length) {
                algorithmService.correctAccrualDt(correctAccrual, correctAccrualSum - fact.paySum, correctAccrualSum)
                taxSum = accrualService.round(taxSum - fact.paySum, 2)
              }
            } else {
              const paymentDts = fact.paymentDt ? JSON.parse(fact.paymentDt) : {}
              paymentDts.forEach(pDt => {
                if (pDt.paymentOrderAccDt) {
                  pDt.paymentOrderAccDt.forEach(pAccDt => {
                    if ((!dictFundSourceList || dictFundSourceList.includes(pAccDt.dictFundSourceID)) &&
                      (!dictProgClassList || dictProgClassList.includes(pAccDt.dictProgClassID)) &&
                      (!dictProjectList || dictProjectList.includes(pAccDt.dictProjectID))
                    ) {
                      let isCorr = false
                      offtakeAccrual.forEach(otAcc => {
                        if (!isCorr && pDt.payObligatoryID === otAcc.payObligatoryID && otAcc.accrualDt) {
                          const exDt = otAcc.accrualDt.find(o => o.dictFundSourceID || o.dictProgCalcID)
                          if (exDt) {
                            exDt.paySum = accrualService.round(exDt.paySum - pAccDt.paySum, 2)
                            otAcc.paySum = accrualService.round(otAcc.paySum - pAccDt.paySum, 2)
                            taxSum = accrualService.round(taxSum - pAccDt.paySum, 2)
                            isCorr = true
                          }
                        }
                      })
                    }
                  })
                }
              })
            }
          })
          offtakeAccrual.forEach(acc => {
            const payObl = payObligatory.find(o => o.payID === acc.payElID)
            if (payObl) {
              if (orderParams.rate) {
                acc.paySum = acc.paySum * orderParams.rate / 100
              }
              setAccrualPaymentOrder({ orderParams, accr, payObligatory: payObl, payItem: acc, position })
            }
          })
        }

        if (accr.paySum !== 0 && !accr.accrualDt.length && (dictFundSourceList || dictProgClassList || dictProjectList)) {
          if (dictFundSourceList) {
            accr.accrualDt = correctBySourceList(accr.accrualDt, accr.paySum, dictFundSourceList, 'dictFundSourceID')
          }
          if (dictProgClassList) {
            accr.accrualDt = correctBySourceList(accr.accrualDt, accr.paySum, dictProgClassList, 'dictProgClassID')
          }
          if (dictProjectList) {
            accr.accrualDt = correctBySourceList(accr.accrualDt, accr.paySum, dictProjectList, 'dictProjectID')
          }
        }
        accr.accrualDt = JSON.stringify(accr.paySum > 0 ? algorithmService.calcGroupSumAccrualDt(accr.accrualDt, accr.paySum) : [])
        if (accr.paySum !== accr.planPaySum) {
          algorithmService.correctAccrualDt(offtakeAccrual, accrualService.round((taxSum || 0) * accr.paySum / accr.planPaySum, 2))
        }
        const accrualFunds = []
        let esvSum = 0

        cont.emp[accr.employeeNumberID].accrualFund.forEach(fund => {
          const payObl = payObligatory.find(o => o.payID === fund.payFundID)
          if (fund.accrualFundDt && fund.accrualFundDt.length) {
            fund.accrualFundDt.forEach(accDt => {
              delete accDt.ID
              if ((dictFundSourceFSSU.length && dictFundSourceFSSU.includes(accDt.dictFundSourceID)) ||
                (dictFundSourceList && !dictFundSourceList.includes(accDt.dictFundSourceID)) ||
                (dictProgClassList && !dictProgClassList.includes(accDt.dictProgClassID)) ||
                (dictProjectList && !dictProjectList.includes(accDt.dictProjectID))
              ) {
                fund.paySum = accrualService.round(fund.paySum - accDt.paySum, 2)
              }
            })
          } else if (dictFundSourceList || dictProgClassList || dictProjectList) {
            fund.paySum = 0
          }
          if (fund.paySum > 0) {
            if (payObl && fund.periodCalcID === orderParams.periodSalaryID) {
              fund.payObligatoryID = payObl.payObligatoryID
              accrualFunds.push(fund)
              esvSum = accrualService.round(esvSum + fund.paySum, 2)
            }
          }
        })
        if (esvSum && accr.paySum > 0) {
          payFacts.forEach(fact => {
            if (!dictFundSourceList && !dictProgClassList && !dictProjectList) {
              const correctAccrual = []
              let correctAccrualSum = 0
              accrualFunds.forEach(otAcc => {
                if (fact.payObligatoryID === otAcc.payObligatoryID) {
                  correctAccrual.push(otAcc)
                  correctAccrualSum = accrualService.round(correctAccrualSum + otAcc.paySum, 2)
                }
              })
              if (correctAccrual.length) {
                algorithmService.correctAccrualDt(correctAccrual, correctAccrualSum - fact.paySum, correctAccrualSum)
              }
            } else {
              const paymentDts = fact.paymentDt ? JSON.parse(fact.paymentDt) : {}
              paymentDts.forEach(pDt => {
                if (pDt.paymentOrderAccDt) {
                  pDt.paymentOrderAccDt.forEach(pAccDt => {
                    if ((dictFundSourceList && dictFundSourceList.includes(pAccDt.dictFundSourceID)) ||
                      (dictProgClassList && dictProgClassList.includes(pAccDt.dictProgClassID)) ||
                      (dictProjectList && dictProjectList.includes(pAccDt.dictProjectID))
                    ) {
                      let isCorr = false
                      accrualFunds.forEach(otAcc => {
                        if (!isCorr && pDt.payObligatoryID === otAcc.payObligatoryID && otAcc.accrualFundDt) {
                          const exDt = otAcc.accrualFundDt.find(o => o.dictFundSourceID || o.dictProgClassID || o.dictProjectID)
                          if (exDt) {
                            exDt.paySum = accrualService.round(exDt.paySum - pAccDt.paySum, 2)
                            otAcc.paySum = accrualService.round(otAcc.paySum - pAccDt.paySum, 2)
                            isCorr = true
                          }
                        }
                      })
                    }
                  })
                }
              })
            }
          })
          accrualFunds.forEach(fund => {
            const payObl = payObligatory.find(o => o.payID === fund.payFundID)
            if (orderParams.rate) {
              fund.paySum = fund.paySum * orderParams.rate / 100
            }
            setAccrualPaymentOrder({ orderParams, accr, payObligatory: payObl, payItem: fund, position })
          })
        }
        accr.paymentDt.forEach(paymentDt => {
          paymentDt.paymentOrderAccDt = algorithmService.calcGroupSumAccrualPaymentDt(paymentDt.paymentOrderAccDt, paymentDt.paySum)
        })

        accr.paymentDt = JSON.stringify(accr.paymentDt)
      } else {
        accr.taxSum = 0
        accr.paySum = 0
        accr.planPaySum = 0
        accr.baseSum = 0
        accr.accrualDt = '[]'
        accr.paymentDt = '[]'
      }
    }
    Object.assign(accr, {
      payElID: orderParams.payElID,
      flagsRec: orderParams.flagsRec || 0,
      dateFrom: periodSalary.dateFrom,
      dateTo: periodSalary.dateTo
    })
    cont.employeeNumberID = accr.employeeNumberID
    Object.assign(accr, algorithmPaySalary.run({ cont, periodCalc, periodSalary, params: accr }))
    if (orderParams.paymentMethod === '2') {
      if (!(accr.flagsFix & 1 << 15) && !(accr.flagsFix & 1 << 16)) {
        accr.paidSum = accr.paySum
        accr.depSum = 0
      } else if ((accr.flagsFix & 1 << 15) && !(accr.flagsFix & 1 << 16)) {
        accr.paidSum = accr.paySum - accr.depSum
      }
      if (!(accr.flagsFix & 1 << 15) && (accr.flagsFix & 1 << 16)) {
        accr.depSum = accr.paySum - accr.paidSum
      }
    }
  })
}

function calculatePrepayment ({ orgID, cont, orderParams }) {
  const rlService = require('../../HR/modules/rlService')
  const periodCalc = periodService.getPeriod(orderParams.periodCalcID)
  const periodSalary = periodService.getPeriod(orderParams.periodSalaryID)
  const currentPeriod = periodService.getCurrentPeriod(orgID)
  const dateFrom = periodSalary.dateFrom
  const dateTo = dateService.addDays(periodSalary.dateFrom, (cont.payEl[orderParams.payElID].prepaymentDay || 15) - 1)
  const typePrepayment = cont.payEl[orderParams.payElID].typePrepayment
  const percPrepayment = cont.payEl[orderParams.payElID].percPrepayment
  const paymentIfNotLess = cont.payEl[orderParams.payElID].paymentIfNotLess
  const employeeNumbers = orderParams.accruals.map(o => o.employeeNumberID)
  // orderParams.applyBalanceEmp
  // orderParams.applyBalanceOrg
  if (employeeNumbers.length) {
    UB.Repository('hr_payRollDt').attrs(['ID', 'employeeNumberID'])
      .where('payRollID.payElID', '=', orderParams.payElID)
      .where('payRollID.periodSalaryID', '=', orderParams.periodSalaryID)
      .where('employeeNumberID', 'in', employeeNumbers)
      .where('payRollID.mi_deleteDate', '>=', '#maxdate')
      .where('reason', '!=', '4')
      .where('payRollID', '!=', orderParams.orderID)
      .whereIf(orderParams.rate && orderParams.rate !== 100, 'payRollID.rate', 'isNull', undefined, 'rateNull')
      .whereIf(orderParams.rate && orderParams.rate !== 100, 'payRollID.rate', '=', 100, 'rate')
      .where('payRollID.dictFundSourceList', 'isNull')
      .where('payRollID.dictProgClassList', 'isNull')
      .where('payRollID.dictProjectList', 'isNull')
      .logic((orderParams.rate && orderParams.rate !== 100) ? '([rate] OR [rateNull])' : '(1 = 1)')
      .selectAsObject().forEach(row => {
        const accrual = orderParams.accruals.find(o => o.employeeNumberID === row.employeeNumberID)
        if (!(accrual.flagsFix & 2)) {
          accrual.reason = '4'
        }
      })
  }
  rlService.loadCalcData({ cont,
    orgID,
    employeeNumbers,
    periodID: orderParams.periodSalaryID,
    loadData: {
      prop: true,
      dateFrom: periodSalary.dateFrom,
      dateTo: periodSalary.dateTo
    } })
  const dictFundSourceFSSU = cont.dict.ac_fundSource.filter(o => o['dictFundTypeID.code'] === '02').map(o => o.ID)
  const dictFundSourceList = accrualService.getIDsFromString(orderParams.dictFundSourceList)
  const dictProgClassList = accrualService.getIDsFromString(orderParams.dictProgClassList)
  const dictProjectList = accrualService.getIDsFromString(orderParams.dictProjectList)
  // Завантаження даних розахункових листів працівників за розрахунковий periodSalary
  accrualService.getAccrualByPeriodForEmployeeNumbers(cont, employeeNumbers, periodSalary.ID)
  if (dictFundSourceList || dictProgClassList || dictProjectList) {
    accrualService.getAccrualBalanceByFundForEmployeeNumbers(cont, employeeNumbers, periodSalary.priorPeriodID, 'accrualBalanceOut', dictFundSourceList, dictProgClassList, dictProjectList)
    accrualService.getAccrualBalanceByFundForEmployeeNumbers(cont, employeeNumbers, periodSalary.ID, 'accrualBalanceOut', dictFundSourceList, dictProgClassList, dictProjectList)
    accrualService.getAccrualBalanceByFundForEmployeeNumbers(cont, employeeNumbers, periodSalary.ID, 'accrualBalanceOutAll', dictFundSourceList, dictProgClassList, dictProjectList)
  } else {
    accrualService.getAccrualBalanceForEmployeeNumbers(cont, employeeNumbers, periodSalary.priorPeriodID, 'accrualBalance', dictFundSourceFSSU.length ? dictFundSourceFSSU : [0])
    accrualService.getAccrualBalanceForEmployeeNumbers(cont, employeeNumbers, periodSalary.ID, 'accrualBalanceOut', dictFundSourceFSSU.length ? dictFundSourceFSSU : [0])
    accrualService.getAccrualBalanceForEmployeeNumbers(cont, employeeNumbers, periodSalary.ID, 'accrualBalanceOutAll')
  }
  const accruals = {}
  orderParams.accruals.forEach(accr => {
    if (!(accr.flagsFix & 1 << 22)) {
      accr.payRetention = {}
      if (accr.paymentMethod === '4') {
        if (!(accr.flagsFix & 2)) {
          accr.reason = '3'
        }
        const empNumIdx = employeeNumbers.findIndex(o => o === accr.employeeNumberID)
        employeeNumbers.splice(empNumIdx, 1)
      } else if (accr.reason === '3') {
        accr.reason = '0'
      }
      if (!['3', '4'].includes(accr.reason)) {
        accr.accrualBalanceOut = cont.emp[accr.employeeNumberID] ? Math.min((cont.emp[accr.employeeNumberID].accrualBalanceOut || 0), (cont.emp[accr.employeeNumberID].accrualBalanceOutAll || 0)) : 0
        if (accr.accrualBalanceOut <= 0) {
          if (!(accr.flagsFix & 2)) {
            accr.reason = '2'
          }
          const empNumIdx = employeeNumbers.findIndex(o => o === accr.employeeNumberID)
          employeeNumbers.splice(empNumIdx, 1)
        } else if (accr.reason === '2') {
          accr.reason = '0'
        }
      }
      cont.employeeNumberID = accr.employeeNumberID
      if (cont.emp[accr.employeeNumberID]) {
        cont.emp[accr.employeeNumberID].permanentAccrual = accrualService.getPermanentAccrual(orgID, accr.employeeNumberID, cont, periodSalary, null, [orderParams.payElID])
        if (accr.payRetentionID) {
          accr.payRetention = cont.emp[accr.employeeNumberID].permanentAccrual.find(o => o.payElID === orderParams.payElID && o.ID === accr.payRetentionID) || {}
        }
      }
      if (!['2', '3', '4'].includes(accr.reason)) {
        let includPayEl = []
        if (typePrepayment === '1' || (accr.payRetention && accr.payRetention.rate)) {
          const accrl = cont.emp[accr.employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= dateTo && o.dateTo >= dateTo)
          const permanentAccrual = {
            payElID: orderParams.payElID,
            dateFrom: cont.payEl[orderParams.payElID].dateFrom,
            dateTo: cont.payEl[orderParams.payElID].dateTo
          }
          accr.baseSum =
            (dictFundSourceList && accrl && accrl.dictFundSourceID && !dictFundSourceList.includes(accrl.dictFundSourceID)) ? 0
              : (dictProgClassList && accrl && accrl.dictProgClassID && !dictProgClassList.includes(accrl.dictProgClassID)) ? 0
                : (dictProjectList && accrl && accrl.dictProjectID && !dictProjectList.includes(accrl.dictProjectID)) ? 0
                  : (accr.payRetention.baseSum || (accrl
                    ? accrualService.round(
                      algorithmService.getPlanSum(dateTo, cont, permanentAccrual, accrl, cont.emp[accr.employeeNumberID].permanentAccrual, includPayEl) *
                  ((accr.payRetention.rate || percPrepayment) ? ((accr.payRetention.rate || percPrepayment) / 100) : 0) *
                  (orderParams.rate ? orderParams.rate / 100 : 1) *
                  (cont.payEl[accrl.payElID].isMtCount ? (accrl.mtCount || 1) : 1), 2)
                    : 0))
          accr.accrualDt = [{
            paySum: accr.baseSum,
            dictFundSourceID: (accrl && accrl.dictFundSourceID) || null,
            dictProgClassID: (accrl && accrl.dictProgClassID) || null,
            dictProjectID: (accrl && accrl.dictProjectID) || null
          }]
          if (accrl) {
            postingService.setDimensionToAccrualDt({ target: accr.accrualDt[0], source: accrl })
          }
          algorithmService.correctAccrualDt(includPayEl, accr.baseSum)
        } else {
          //add pdv ignore method = 47 Премия одноразовая 05.07.2024
          if (cont.payEl[orderParams.payElID].method.code === '29') cont.skipMethodCodes = ['47'];
          //end pdv
          const fact = algorithmService.getFactSum({
            withIncludPayEl: true,
            withDetail: true,
            cont,
            payElID: orderParams.payElID,
            periodCalc: periodSalary,
            periodOnly: periodSalary,
            periodSalary,
            dateFrom,
            dateTo,
            dictFundSourceList,
            dictProgClassList,
            dictProjectList
          })
          //add pdv ignore method = 47 Премия одноразовая 05.07.2024
          cont.skipMethodCodes = null;
          //add pdv ignore method = 47 Премия одноразовая 04.07.2024

          //fact.includPayEl = fact.includPayEl.filter(e => e.source==='trf_accrual')
          //fact.includPayEl = fact.includPayEl.filter(e => cont.payEl[e.payElID].method.code != '47')
          //fact.accrualDt = []
          //fact.includPayEl.forEach(e => fact.accrualDt.push(...e.accrualDt))
          //fact.factSum = fact.accrualDt.reduce((sum,acc) => accrualService.round(sum + acc.paySum,2),0);
        // end pdv
          accr.baseSum = accrualService.round(fact.factSum * (orderParams.rate ? orderParams.rate / 100 : 1), 2)
          accr.accrualDt = orderParams.rate ? algorithmService.correctAccrualDt(fact.accrualDt, accr.baseSum) : fact.accrualDt
          includPayEl = orderParams.rate ? algorithmService.correctAccrualDt(fact.includPayEl, accr.baseSum) : fact.includPayEl
          if (accr.baseSum === 0 && accr.flagsFix & 1 << 1) {
            accr.baseSum = accr.paySum
            const accrl = cont.emp[accr.employeeNumberID].prop.employeePositions.find(o => o.dateTo >= dateTo)
            if (accrl) {
              includPayEl = [{ payElID: accrl.payElID, paySum: accr.baseSum }]
            }
          }
          const payEl = cont.payEl[orderParams.payElID]
          if (payEl.payElTimeCost.length && !dictFundSourceList && !dictProgClassList && !dictProjectList &&
            cont.emp[accr.employeeNumberID].prop.timeSheets.find(o => o.planTimeCostType !== 'FREE' && o.factTimeCostType === 'ABSENCE' &&
              o.dateWork >= dateFrom && o.dateWork <= dateTo && payEl.payElTimeCost.find(c => c.dictTimeCostID === o.factTimeCostID))) {
            const accrl = cont.emp[accr.employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= periodSalary.dateTo && o.dateTo >= periodSalary.dateTo)
            if (accrl && accrl.payElID) {
              const permanentAccrual = {
                payElID: orderParams.payElID,
                dateFrom: periodSalary.dateFrom,
                dateTo: periodSalary.dateTo
              }
              const timeSheets = algorithmService.getTimeSheetByPeriod(periodSalary, cont)
              const payTime = algorithmService.getTimeByTimeSheet({ cont, payElID: accrl.payElID, timeSheets, dateFrom: periodSalary.dateFrom, dateTo: periodSalary.dateTo })
              const timeSheetDays = cont.emp[accr.employeeNumberID].prop.timeSheets.filter(o => o.planTimeCostType !== 'FREE' && o.factTimeCostType === 'ABSENCE' && o.dateWork >= dateFrom && o.dateWork <= dateTo &&
                payEl.payElTimeCost.find(c => c.dictTimeCostID === o.factTimeCostID))
              const planSum = algorithmService.getPlanSum(periodSalary.dateTo, cont, permanentAccrual, accrl) * (accrl.mtCount || 1)
              let addBaseSum = 0
              timeSheetDays.forEach(day => {
                if (cont.payEl[accrl.payElID].payElTimeCost.find(o => o.dictTimeCostID === day.planTimeCostID)) {
                  if (cont.payEl[accrl.payElID].calcProportion === 'DAY') {
                    addBaseSum += (payTime.planDays ? planSum / payTime.planDays : 0)
                  } else {
                    addBaseSum += (payTime.planHours ? planSum / payTime.planHours : 0) * (cont.payEl[accrl.payElID].useTimeSheetBy === 'PLAN' ? day.planHour : day.normHour || 0)
                  }
                }
              })
              if (addBaseSum) {
                accr.baseSum = accrualService.round(accr.baseSum + addBaseSum)
                includPayEl.push({ payElID: accrl.payElID, paySum: addBaseSum })
              }
            }
          }

          if (percPrepayment && payEl.payElEntryMinSum.length && !dictFundSourceList && !dictProgClassList && !dictProjectList &&
            !cont.emp[accr.employeeNumberID].prop.timeSheets.find(o => o.factTimeCostType === 'ABSENCE' && o.dateWork >= dateFrom && o.dateWork <= dateTo)) {
            const accrl = cont.emp[accr.employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= periodSalary.dateTo && o.dateTo >= periodSalary.dateTo)
            if (accrl) {
              const permanentAccrual = {
                payElID: orderParams.payElID,
                dateFrom: periodSalary.dateFrom,
                dateTo: periodSalary.dateTo
              }
              const incPayEl = []
              accr.minBaseSum = accrualService.round(algorithmService.getPlanSum(periodSalary.dateTo, cont, permanentAccrual, accrl, cont.emp[accr.employeeNumberID].permanentAccrual, incPayEl, [], false, null, true) *
                (accrl.mtCount || 1) * percPrepayment / 100, 2)
              if (accr.minBaseSum && accr.minBaseSum > accr.baseSum) {
                accr.baseSum = accr.minBaseSum
                includPayEl = incPayEl
                algorithmService.correctAccrualDt(includPayEl, accr.baseSum)
              }
            }
          }
        }
        if (accr.payRetention && accr.payRetention.baseSum && accr.baseSum !== accr.payRetention.baseSum) {
          accr.baseSum = accr.payRetention.baseSum
          algorithmService.correctAccrualDt(includPayEl, accr.baseSum)
        }

        accruals[accr.employeeNumberID] = []
        const empDateFrom = (cont.emp[accr.employeeNumberID].prop.employeeNumber.dateFrom > dateFrom && cont.emp[accr.employeeNumberID].prop.employeeNumber.dateFrom < dateTo)
          ? cont.emp[accr.employeeNumberID].prop.employeeNumber.dateFrom : null
        const empDateTo = (cont.emp[accr.employeeNumberID].prop.employeeNumber.dateTo > dateFrom && cont.emp[accr.employeeNumberID].prop.employeeNumber.dateTo < dateTo)
          ? cont.emp[accr.employeeNumberID].prop.employeeNumber.dateTo : null
        includPayEl.forEach(payEl => {
          accruals[accr.employeeNumberID].push({
            periodCalcID: orderParams.periodSalaryID,
            periodSalaryID: orderParams.periodSalaryID,
            periodCalc: periodSalary.dateFrom,
            periodSalary: periodSalary.dateFrom,
            employeeNumberID: accr.employeeNumberID,
            payElID: payEl.payElID,
            mask: algorithmService.getFillMaskByPeriod(empDateFrom || dateFrom, empDateTo || dateTo),
            paySum: payEl.paySum,
            dateFrom: empDateFrom || dateFrom,
            dateTo: empDateTo || dateTo,
            accrualDt: accr.accrualDt
          })
        })
      }
    }
  })
  console.debug(`Prepayment calc finish calc accrual PAYMENT ${dateService.formatDate(dateService.currentDateTime(), 'dd.mm.yyyy hh:nn:ss')}`)
  rlService.autoCalculate({ cont, orgID, periodID: orderParams.periodSalaryID, employeeNumbers, calculateProperty: { calcType: 1 << 2, dateFrom, dateTo, accrual: accruals } })
  console.debug(`Prepayment calc finish calc accrual OFFTAKE ${dateService.formatDate(dateService.currentDateTime(), 'dd.mm.yyyy hh:nn:ss')}`)
  const payObligatory = []
  getPayObligatory({ cont, payObligatory, dateFrom: periodSalary.dateFrom, dateTo: periodSalary.dateTo })
  orderParams.paymentOrder = []
  orderParams.accruals.forEach(accr => {
    accr.balanceSum = cont.emp[accr.employeeNumberID].accrualBalance
    if (!(accr.flagsFix & 1 << 22)) {
      if (!['2', '3', '4'].includes(accr.reason)) {
        const offtakeAccrual = []
        const position = cont.emp[accr.employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= periodCalc.dateTo && o.dateTo >= periodCalc.dateFrom) ||
          cont.emp[accr.employeeNumberID].prop.employeePositions[cont.emp[accr.employeeNumberID].prop.employeePositions.length - 1] || {}
        accr.paymentDt = []
        accr.taxSum = cont.emp[accr.employeeNumberID].accrual.reduce((sum, acc) => {
          const payObl = payObligatory.find(o => o.payID === acc.payElID)
          if (payObl && acc.periodCalcID === orderParams.periodSalaryID) {
            sum = accrualService.round(sum + acc.paySum, 2)
            offtakeAccrual.push(acc)
          }
          return sum
        }, 0)

        accr.dopTaxSum = 0
        let dopTaxSumRate = 0
        let dopTaxSum = 0

        if (orderParams.applyAddRetention) {
          cont.emp[accr.employeeNumberID].accrual.forEach(acc => {
            if (acc.periodCalcID === orderParams.periodSalaryID && cont.payEl[orderParams.payElID].payElAddRetention.find(o => o.payElBaseID === acc.payElID)) {
              if (acc.rate) {
                dopTaxSumRate = accrualService.round(dopTaxSumRate + acc.paySum)
              } else {
                dopTaxSum = accrualService.round(dopTaxSum + acc.paySum)
              }
            }
          })
        }

        let baseSum = accr.baseSum
        let taxSum = accr.taxSum

        accr.planPaySum = (orderParams.applyRetention && !(accr.payRetention && accr.payRetention.baseSum) ? (accr.baseSum - accr.taxSum - dopTaxSumRate) : accr.baseSum)
        const baseKoef = accr.baseSum - accr.taxSum - dopTaxSumRate
        let calcSum = accr.flagsFix & 2 ? accr.paySum : accr.planPaySum

        if (accr.flagsFix & 2 && orderParams.applyRetention) {
          accr.planPaySum = accr.paySum
        }
        if (paymentIfNotLess && paymentIfNotLess > 0 && calcSum < paymentIfNotLess) {
          calcSum = accr.paySum = accr.taxSum = accr.dopTaxSum = 0
        }
        if (!(accr.flagsFix & 1 << 21) && calcSum > accr.accrualBalanceOut) {
          calcSum = Math.max(0, accr.accrualBalanceOut)
          accr.paySum = calcSum
          accr.flagsFix = accr.flagsFix | 1 << 3
          accr.taxSum = accrualService.round(accr.taxSum * (calcSum + dopTaxSum) / ((accr.payRetention && accr.payRetention.baseSum) ? accr.baseSum : (baseKoef)), 2)
          dopTaxSumRate = accrualService.round(dopTaxSumRate * (calcSum + dopTaxSum) / (baseKoef), 2)
        } else {
          if (!(accr.flagsFix & 2) && accr.payRetention && accr.payRetention.baseSum) {
            accr.taxSum = accrualService.round(orderParams.applyRetention ? accr.taxSum : accr.taxSum * calcSum / accr.baseSum, 2)
          } else {
            accr.taxSum = accrualService.round(orderParams.applyRetention && !(accr.flagsFix & 2) ? accr.taxSum : accr.taxSum * (calcSum + dopTaxSum) / (baseKoef), 2)
            dopTaxSumRate = accrualService.round((orderParams.applyRetention && !(accr.flagsFix & 2)) ? dopTaxSumRate : dopTaxSumRate * (calcSum + dopTaxSum) / (baseKoef), 2)
          }
        }
        accr.dopTaxSum = accrualService.round(dopTaxSumRate + dopTaxSum)
        accr.baseSum = accrualService.round(calcSum + accr.taxSum + accr.dopTaxSum, 2)

        if (!(accr.flagsFix & 2)) {
          if ((periodSalary.dateFrom <= currentPeriod.dateFrom || (!orderParams.applyBalanceEmp && !orderParams.applyBalanceOrg)) && accr.balanceSum !== 0) {
            calcSum += (orderParams.applyBalanceEmp && accr.balanceSum < 0) ? accr.balanceSum : (orderParams.applyBalanceOrg && accr.balanceSum > 0) ? accr.balanceSum : 0
          }
          accr.paySum = calcSum
          if (accr.paySum < 0.01) {
            accr.paySum = 0
            accr.reason = '1'
          } else {
            accr.reason = '0'
          }
        }
        if (accr.paySum !== 0 && !accr.accrualDt.length && (dictFundSourceList || dictProgClassList || dictProjectList)) {
          if (dictFundSourceList) {
            accr.accrualDt = correctBySourceList(accr.accrualDt, accr.paySum, dictFundSourceList, 'dictFundSourceID')
          }
          if (dictProgClassList) {
            accr.accrualDt = correctBySourceList(accr.accrualDt, accr.paySum, dictProgClassList, 'dictProgClassID')
          }
          if (dictProjectList) {
            accr.accrualDt = correctBySourceList(accr.accrualDt, accr.paySum, dictProjectList, 'dictProjectID')
          }
        }

        accr.accrualDt = JSON.stringify(accr.paySum > 0 ? algorithmService.correctAccrualDt(accr.accrualDt, accr.paySum) : [])

        if (accr.taxSum && accr.paySum > 0) {
          if (accr.taxSum !== taxSum) {
            algorithmService.correctAccrualDt(offtakeAccrual, accr.taxSum)
          }
          offtakeAccrual.forEach(acc => {
            const payObl = payObligatory.find(o => o.payID === acc.payElID)
            if (payObl && acc.periodSalaryID === orderParams.periodSalaryID) {
              setAccrualPaymentOrder({ orderParams, accr, payObligatory: payObl, payItem: acc, position })
            }
          })
        }
        const accrualFunds = []
        let esvSum = 0
        cont.emp[accr.employeeNumberID].accrualFund && cont.emp[accr.employeeNumberID].accrualFund.forEach(fund => {
          const payObl = payObligatory.find(o => o.payID === fund.payFundID)
          if (payObl && fund.periodSalaryID === orderParams.periodSalaryID) {
            accrualFunds.push(fund)
            esvSum = accrualService.round(esvSum + fund.paySum, 2)
          }
        })
        if (esvSum && accr.paySum > 0) {
          if (accr.baseSum !== baseSum) {
            algorithmService.correctAccrualDt(accrualFunds, accrualService.round(esvSum * accr.baseSum / baseSum, 2))
          }
          accrualFunds.forEach(fund => {
            const payObl = payObligatory.find(o => o.payID === fund.payFundID)
            setAccrualPaymentOrder({ orderParams, accr, payObligatory: payObl, payItem: fund, position })
          })
        }
        accr.paymentDt.forEach(paymentDt => {
          paymentDt.paymentOrderAccDt = algorithmService.calcGroupSumAccrualPaymentDt(paymentDt.paymentOrderAccDt, paymentDt.paySum)
        })

        accr.paymentDt = JSON.stringify(accr.paymentDt)
      } else {
        accr.taxSum = 0
        accr.paySum = 0
        accr.planPaySum = 0
        accr.baseSum = 0
        accr.dopTaxSum = 0
        accr.accrualDt = '[]'
        accr.paymentDt = '[]'
      }
    }
    Object.assign(accr, {
      payElID: orderParams.payElID,
      flagsRec: orderParams.flagsRec || 0,
      dateFrom: periodCalc.dateFrom,
      dateTo: periodCalc.dateTo
    })
    Object.assign(accr, algorithmPrepayment.run({ cont, periodCalc, periodSalary, params: accr }))
    if (orderParams.paymentMethod === '2') {
      if (!(accr.flagsFix & 1 << 15) && !(accr.flagsFix & 1 << 16)) {
        accr.paidSum = accr.paySum
        accr.depSum = 0
      } else if ((accr.flagsFix & 1 << 15) && !(accr.flagsFix & 1 << 16)) {
        accr.paidSum = accr.paySum - accr.depSum
      }
      if (!(accr.flagsFix & 1 << 15) && (accr.flagsFix & 1 << 16)) {
        accr.depSum = accr.paySum - accr.paidSum
      }
    }
  })
  console.debug(`Prepayment calc finish ${dateService.formatDate(dateService.currentDateTime(), 'dd.mm.yyyy hh:nn:ss')}`)
}

function correctBySourceList (accrualDt, paySum, sourceIDs, attrName) {
  let source = accrualDt
  let result = []
  if (!source.length) {
    source.push({ paySum })
  }
  source.forEach(aDt => {
    const paySum = aDt.paySum
    sourceIDs && sourceIDs.forEach(ID => {
      const newDt = Object.assign({}, aDt)
      newDt.paySum = accrualService.round(paySum / sourceIDs.length)
      newDt[attrName] = ID
      result.push(newDt)
    })
  })
  return result
}

function calculateWhithinPeriod ({ orgID, cont, orderParams }) {
  const rlService = require('../../HR/modules/rlService')
  const postingService = require('../../HR/modules/postingService')
  const currentPeriod = periodService.getCurrentPeriod(orgID)
  const periodCalc = periodService.getPeriod(orderParams.periodCalcID)
  const periodSalary = periodService.getPeriod(orderParams.periodSalaryID)
  const dateFrom = dateService.shiftDate(periodSalary.dateFrom)
  const dateTo = dateService.shiftDate(periodSalary.dateTo)
  let calcDateFrom = dateService.shiftDate(periodSalary.dateFrom)
  let calcDateTo = dateService.shiftDate(periodSalary.dateFrom)
  orderParams.paymentOrder = []
  const payObligatory = []
  const accruals = []
  getPayObligatory({ cont, payObligatory, dateFrom: periodSalary.dateFrom, dateTo: periodSalary.dateTo })
  const employeeNumbers = [...new Set(orderParams.accruals.map(o => o.employeeNumberID))]
  rlService.loadCalcData({ cont,
    orgID,
    employeeNumbers,
    periodID: orderParams.periodSalaryID,
    loadData: { prop: true, dateFrom: periodSalary.dateFrom, dateTo: periodSalary.dateTo } })
  const dictFundSourceFSSU = cont.dict.ac_fundSource.filter(o => o['dictFundTypeID.code'] === '02').map(o => o.ID)
  const dictFundSourceList = accrualService.getIDsFromString(orderParams.dictFundSourceList)
  const dictProgClassList = accrualService.getIDsFromString(orderParams.dictProgClassList)
  const dictProjectList = accrualService.getIDsFromString(orderParams.dictProjectList)
  console.debug(`Payment calc finish load emp data ${dateService.formatDate(dateService.currentDateTime(), 'dd.mm.yyyy hh:nn:ss')}`)
  // Завантаження даних розахункових листів працівників за розрахунковий periodSalary
  accrualService.getAccrualByPeriodForEmployeeNumbers(cont, employeeNumbers, periodSalary.ID)
  console.debug(`Payment calc finish load emp accrual ${dateService.formatDate(dateService.currentDateTime(), 'dd.mm.yyyy hh:nn:ss')}`)
  accrualService.getAccrualFundByPeriodForEmployeeNumbers(cont, employeeNumbers, periodSalary.ID)
  console.debug(`Payment calc finish load emp accrual ${dateService.formatDate(dateService.currentDateTime(), 'dd.mm.yyyy hh:nn:ss')}`)

  if (dictFundSourceList || dictProgClassList || dictProjectList) {
    if (periodSalary.dateFrom > currentPeriod.dateFrom) {
      const addBalance = periodSalary.dateFrom > currentPeriod.dateFrom && orderParams.applyBalance === false ? null : 'accrualBalance'
      if (addBalance) {
        accrualService.getAccrualBalanceByFundForEmployeeNumbers(cont, employeeNumbers, currentPeriod.ID, 'accrualBalance', dictFundSourceList, dictProgClassList, dictProjectList)
      }
      accrualService.getAccrualBalanceByFundForEmployeeNumbersNext(cont, employeeNumbers, currentPeriod, periodSalary, 'accrualBalanceOut', addBalance, dictFundSourceList, dictProgClassList, dictProjectList)
      accrualService.getAccrualBalanceByFundForEmployeeNumbersNext(cont, employeeNumbers, currentPeriod, periodSalary, 'accrualBalanceOutAll', addBalance)
    } else {
      accrualService.getAccrualBalanceByFundForEmployeeNumbers(cont, employeeNumbers, periodSalary.ID, 'accrualBalanceOut', dictFundSourceList, dictProgClassList, dictProjectList)
      accrualService.getAccrualBalanceByFundForEmployeeNumbers(cont, employeeNumbers, periodSalary.ID, 'accrualBalanceOutAll', dictFundSourceList, dictProgClassList, dictProjectList)
    }
  } else {
    if (periodSalary.dateFrom > currentPeriod.dateFrom) {
      const addBalance = periodSalary.dateFrom > currentPeriod.dateFrom && orderParams.applyBalance === false ? null : 'accrualBalance'
      if (addBalance) {
        accrualService.getAccrualBalanceForEmployeeNumbers(cont, employeeNumbers, currentPeriod.ID, 'accrualBalance', dictFundSourceFSSU.length ? dictFundSourceFSSU : [0])
      }
      accrualService.getAccrualBalanceForEmployeeNumbersNext(cont, employeeNumbers, currentPeriod, periodSalary, 'accrualBalanceOut', addBalance, dictFundSourceFSSU.length ? dictFundSourceFSSU : [0])
      accrualService.getAccrualBalanceForEmployeeNumbersNext(cont, employeeNumbers, currentPeriod, periodSalary, 'accrualBalanceOutAll', addBalance)
    } else {
      accrualService.getAccrualBalanceForEmployeeNumbers(cont, employeeNumbers, periodSalary.ID, 'accrualBalanceOut', dictFundSourceFSSU.length ? dictFundSourceFSSU : [0])
      accrualService.getAccrualBalanceForEmployeeNumbers(cont, employeeNumbers, periodSalary.ID, 'accrualBalanceOutAll')
    }
  }
  console.debug(`Payment calc finish load emp balanceOut accrual ${dateService.formatDate(dateService.currentDateTime(), 'dd.mm.yyyy hh:nn:ss')}`)
  orderParams.accruals.forEach(accr => {
    cont.employeeNumberID = accr.employeeNumberID
    if (!(accr.flagsFix & 1 << 22)) {
      // если нет вида оплаты, принимаем основную систему оплаты для расчета налогов
      if (!accr.orderAcc) {
        accr.orderAcc = []
        let position = cont.emp[accr.employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= dateFrom && o.dateTo >= dateFrom)
        if (!position) {
          position = cont.emp[accr.employeeNumberID].prop.employeePositions[cont.emp[accr.employeeNumberID].prop.employeePositions.length - 1]
        }
        const payElID = position ? position.payElID : orderParams.payElID
        accr.orderAcc.push({
          periodSalaryID: orderParams.periodSalaryID,
          periodCalcID: orderParams.periodCalcID,
          periodSalary: dateFrom,
          periodCalc: periodCalc.dateFrom,
          payElID,
          dateFrom,
          dateTo,
          paySum: accr.paySum,
          accrualDt: payElID ? postingService.getAccrualDt({
            cont,
            params: {
              dateFrom,
              payElID,
              paySum: accr.paySum
            }
          }) : null
        })
      }

      accr.accrualDt = []
      accr.accrualBalanceOut = Math.min((cont.emp[accr.employeeNumberID].accrualBalanceOut || 0), (cont.emp[accr.employeeNumberID].accrualBalanceOutAll || 0))
      accr.orderAcc.forEach(acc => {
        if (!acc.accrualDt) {
          acc.accrualDt = []
        }
        acc.accrualDt.forEach(accDt => {
          delete accDt.ID
          if ((!dictFundSourceFSSU.length || !dictFundSourceFSSU.includes(accDt.dictFundSourceID)) &&
            (!dictFundSourceList || dictFundSourceList.find(ID => ID === accDt.dictFundSourceID)) &&
            (!dictProgClassList || dictProgClassList.find(ID => ID === accDt.dictProgClassID)) &&
            (!dictProjectList || dictProjectList.find(ID => ID === accDt.dictProjectID))
          ) {
            accr.accrualDt.push(accDt)
          } else {
            acc.paySum = accrualService.round(acc.paySum - accDt.paySum, 2)
            accr.baseSum = accrualService.round(accr.baseSum - accDt.paySum, 2)
          }
        })
      })
      accruals[accr.employeeNumberID] = []
      accr.orderAcc.forEach(acc => {
        const empDateFrom = (cont.emp[accr.employeeNumberID].prop.employeeNumber.dateFrom > dateService.shiftDate(acc.dateFrom) && cont.emp[accr.employeeNumberID].prop.employeeNumber.dateFrom < dateService.shiftDate(acc.dateTo))
          ? cont.emp[accr.employeeNumberID].prop.employeeNumber.dateFrom : null
        const empDateTo = (cont.emp[accr.employeeNumberID].prop.employeeNumber.dateTo > dateService.shiftDate(acc.dateFrom) && cont.emp[accr.employeeNumberID].prop.employeeNumber.dateTo < dateService.shiftDate(acc.dateTo))
          ? cont.emp[accr.employeeNumberID].prop.employeeNumber.dateTo : null
        if (acc.paySum) {
          if (acc.periodSalary < calcDateFrom) {
            calcDateFrom = dateService.shiftDate(acc.periodSalary)
          }
          if (acc.periodSalary > calcDateTo) {
            calcDateTo = dateService.shiftDate(acc.periodSalary)
          }
          accruals[accr.employeeNumberID].push({
            periodCalcID: acc.periodSalaryID,
            periodSalaryID: acc.periodSalaryID,
            periodCalc: dateService.shiftDate(acc.periodSalary),
            periodSalary: dateService.shiftDate(acc.periodSalary),
            employeeNumberID: accr.employeeNumberID,
            payElID: acc.payElID,
            mask: algorithmService.getFillMaskByPeriod(empDateFrom || acc.dateFrom, empDateTo || acc.dateTo),
            paySum: acc.paySum,
            dateFrom: empDateFrom || dateService.shiftDate(acc.dateFrom),
            dateTo: empDateTo || dateService.shiftDate(acc.dateTo),
            accrualDt: accr.accrualDt
          })
        }
      })
    }
  })

  rlService.autoCalculate({ cont,
    orgID,
    periodID: orderParams.periodSalaryID,
    employeeNumbers,
    calculateProperty: { calcType: 1 << 2, dateFrom: calcDateFrom, dateTo: dateService.lastDayOfMonth(calcDateTo), accrual: accruals } })
  orderParams.accruals.forEach(accr => {
    if (!(accr.flagsFix & 1 << 22)) {
      const offtakeAccrual = []
      const position = cont.emp[accr.employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= periodCalc.dateTo && o.dateTo >= periodCalc.dateFrom) ||
        cont.emp[accr.employeeNumberID].prop.employeePositions[cont.emp[accr.employeeNumberID].prop.employeePositions.length - 1] || {}
      accr.paymentDt = []
      accr.taxSum = accruals[accr.employeeNumberID].reduce((sum, acc) => {
        if (payObligatory.find(o => o.payID === acc.payElID)) {
          sum = accrualService.round(sum + acc.paySum, 2)
          offtakeAccrual.push(acc)
        }
        return sum
      }, 0)
      accr.dopTaxSum = 0
      let dopTaxSumRate = 0
      let dopTaxSum = 0
      if (orderParams.applyAddRetention) {
        cont.emp[accr.employeeNumberID].accrual.forEach(acc => {
          if (acc.periodCalcID === orderParams.periodSalaryID && cont.payEl[orderParams.payElID].payElAddRetention.find(o => o.payElBaseID === acc.payElID)) {
            if (acc.rate) {
              dopTaxSumRate = accrualService.round(dopTaxSumRate + acc.paySum)
            } else {
              dopTaxSum = accrualService.round(dopTaxSum + acc.paySum)
            }
          }
        })
      }
      const fundsAccrual = []
      const esvSum = cont.emp[accr.employeeNumberID].accrualFund.reduce((sum, acc) => {
        if (payObligatory.find(o => o.payID === acc.payFundID)) {
          sum = accrualService.round(sum + acc.paySum, 2)
          fundsAccrual.push(acc)
        }
        return sum
      }, 0)

      let baseSum = accr.baseSum
      let taxSum = accr.taxSum
      const baseKoef = accr.baseSum - accr.taxSum - dopTaxSumRate
      accr.planPaySum = (orderParams.applyRetention ? (baseKoef) : accr.baseSum) * orderParams.rate / 100
      let calcSum = accr.flagsFix & 2 ? accr.paySum : accr.planPaySum
      if (!(accr.flagsFix & 1 << 21) && calcSum > accr.accrualBalanceOut) {
        calcSum = Math.max(0, accr.accrualBalanceOut)
        accr.paySum = calcSum
        accr.flagsFix = (accr.flagsFix | 1 << 3)
        accr.taxSum = accrualService.round(accr.taxSum * (calcSum + dopTaxSum) / (baseKoef), 2)
        dopTaxSumRate = accrualService.round(dopTaxSumRate * (calcSum + dopTaxSum) / (baseKoef), 2)
      } else {
        accr.taxSum = accrualService.round((orderParams.applyRetention && !(accr.flagsFix & 2)) ? accr.taxSum * orderParams.rate / 100 : accr.taxSum * (calcSum + dopTaxSum) / (baseKoef), 2)
        dopTaxSumRate = accrualService.round((orderParams.applyRetention && !(accr.flagsFix & 2)) ? dopTaxSumRate : dopTaxSumRate * (calcSum + dopTaxSum) / (baseKoef), 2)
      }
      accr.dopTaxSum = accrualService.round(dopTaxSumRate + dopTaxSum)
      algorithmService.correctAccrualDt(offtakeAccrual, accr.taxSum)
      algorithmService.correctAccrualDt(fundsAccrual, accrualService.round(esvSum * (calcSum + accr.taxSum + accr.dopTaxSum) / accr.baseSum, 2))
      accr.baseSum = accrualService.round(calcSum + accr.taxSum + accr.dopTaxSum, 2)
      accr.paySum = calcSum
      accr.planPaySum = (accr.docSum ? accrualService.round(accr.planPaySum, 2) : 0)
      accr.accrualDt = JSON.stringify(accr.paySum > 0 ? algorithmService.calcGroupSumAccrualDt(accr.accrualDt, accr.paySum) : [])

      if (accr.taxSum && accr.paySum > 0) {
        if (accr.taxSum !== taxSum) {
          algorithmService.correctAccrualDt(offtakeAccrual, accr.taxSum)
        }
        offtakeAccrual.forEach(acc => {
          const payObl = payObligatory.find(o => o.payID === acc.payElID)
          if (payObl) {
            setAccrualPaymentOrder({ orderParams, accr, payObligatory: payObl, payItem: acc, position })
          }
        })
      }
      if (esvSum && accr.paySum > 0) {
        if (accr.baseSum !== baseSum) {
          algorithmService.correctAccrualDt(fundsAccrual, accrualService.round(esvSum * accr.baseSum / baseSum, 2))
        }
        fundsAccrual.forEach(fund => {
          const payObl = payObligatory.find(o => o.payID === fund.payFundID)
          if (payObl) {
            setAccrualPaymentOrder({ orderParams, accr, payObligatory: payObl, payItem: fund, position })
          }
        })
      }
      accr.paymentDt.forEach(paymentDt => {
        paymentDt.paymentOrderAccDt = algorithmService.calcGroupSumAccrualPaymentDt(paymentDt.paymentOrderAccDt, paymentDt.paySum)
      })
      accr.paymentDt = JSON.stringify(accr.paymentDt)
    }
    Object.assign(accr, {
      payElID: orderParams.payElID,
      dateFrom: dateFrom,
      dateTo: dateTo,
      mask: algorithmService.getFillMaskByPeriod(dateFrom, dateTo)
    })
    Object.assign(accr, algorithmWithinPeriod.run({ cont, periodCalc, periodSalary, params: accr }))
    if (orderParams.paymentMethod === '2') {
      if (!(accr.flagsFix & 1 << 15) && !(accr.flagsFix & 1 << 16)) {
        accr.paidSum = accr.paySum
        accr.depSum = 0
      } else if ((accr.flagsFix & 1 << 15) && !(accr.flagsFix & 1 << 16)) {
        accr.paidSum = accr.paySum - accr.depSum
      }
      if (!(accr.flagsFix & 1 << 15) && (accr.flagsFix & 1 << 16)) {
        accr.depSum = accr.paySum - accr.paidSum
      }
    }
  })
}

function calculatePayFSS ({ orgID, cont, orderParams }) {
  const rlService = require('../../HR/modules/rlService')
  const periodCalc = periodService.getPeriod(orderParams.periodCalcID)
  const periodSalary = periodService.getPeriod(orderParams.periodSalaryID)
  const currentPeriod = periodService.getCurrentPeriod(orgID)
  const employeeNumbers = orderParams.accruals.map(o => o.employeeNumberID)
  const dateFrom = dateService.shiftDate(periodSalary.dateFrom)
  const dateTo = dateService.shiftDate(periodSalary.dateTo)
  const payObligatory = []
  orderParams.paymentOrder = []
  getPayObligatory({ cont, payObligatory, dateFrom: periodSalary.dateFrom, dateTo: periodSalary.dateTo })
  rlService.autoCalculate({ cont, orgID, periodID: orderParams.periodSalaryID, employeeNumbers, calculateProperty: { calcType: 1 << 2, dateFrom, dateTo, accrual: orderParams.emp } })
  
  const dictFundSourceFSSU = cont.dict.ac_fundSource.filter(o => o['dictFundTypeID.code'] === '02').map(o => o.ID)
  accrualService.getAccrualBalanceByFundForEmployeeNumbers(cont, employeeNumbers, currentPeriod.ID, 'accrualBalanceOut', dictFundSourceFSSU.length ? dictFundSourceFSSU : [0])
  orderParams.accruals.forEach(accr => {
    const accrual = algorithmService.getAccrualForPayFSS(cont.emp[accr.employeeNumberID].accrual, orgID, accr.employeeNumberID, periodCalc.ID)
    cont.emp[accr.employeeNumberID].accrual = accrual
    let offtakeAccrual = []
    const position = cont.emp[accr.employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= periodCalc.dateTo && o.dateTo >= periodCalc.dateFrom) ||
      cont.emp[accr.employeeNumberID].prop.employeePositions[cont.emp[accr.employeeNumberID].prop.employeePositions.length - 1] || {}
    accr.paymentDt = []
    accr.taxSum = 0
    if (cont.emp[accr.employeeNumberID] && cont.emp[accr.employeeNumberID].accrual) {
      accr.taxSum = cont.emp[accr.employeeNumberID].accrual.reduce((sum, acc) => {
        if (payObligatory.find(o => o.payID === acc.payElID)) {
          sum = accrualService.round(sum + acc.paySum, 2)
          offtakeAccrual.push(acc)
        }
        return sum
      }, 0)
    }

    accr.paySum = accr.baseSum - accr.taxSum
    if (accr.paySum < 0.01) {
      accr.paySum = 0
    }
    if (Math.abs(accr.paySum - (cont.emp[accr.employeeNumberID].accrualBalanceOut || 0)) < 5) {
      accr.paySum = accrualService.round(accr.paySum - (accr.paySum - (cont.emp[accr.employeeNumberID].accrualBalanceOut || 0)))
      accr.taxSum = accrualService.round(accr.baseSum - accr.paySum)
      offtakeAccrual = algorithmService.correctAccrualDt(offtakeAccrual, accr.taxSum)
    }
    accr.offtakeAccrual = []
    offtakeAccrual.forEach(offAccr => {
      accr.offtakeAccrual.push({
        payElID: offAccr.payElID,
        paySum: offAccr.paySum
      })
    })
    accr.offtakeAccrual = JSON.stringify(accr.offtakeAccrual)
    accr.accrualDt = JSON.stringify(accr.paySum > 0 ? algorithmService.calcGroupSumAccrualDt(accr.accrualDt, accr.paySum, true) : [])
    offtakeAccrual.forEach(acc => {
      const payObl = payObligatory.find(o => o.payID === acc.payElID)
      if (payObl) {
        setAccrualPaymentOrder({ orderParams, accr, payObligatory: payObl, payItem: acc, position })
      }
    })
    if (cont.emp[accr.employeeNumberID] && cont.emp[accr.employeeNumberID].accrualFund) {
      cont.emp[accr.employeeNumberID].accrualFund.forEach(acc => {
        const payObl = payObligatory.find(o => o.payID === acc.payFundID)
        if (payObl) {
          setAccrualPaymentOrder({ orderParams, accr, payObligatory: payObl, payItem: acc, position })
        }
      })
    }
    accr.paymentDt.forEach(paymentDt => {
      paymentDt.paymentOrderAccDt = algorithmService.calcGroupSumAccrualPaymentDt(paymentDt.paymentOrderAccDt, paymentDt.paySum)
    })
    accr.paymentDt = JSON.stringify(accr.paymentDt)
    Object.assign(accr, {
      payElID: orderParams.payElID,
      flagsRec: orderParams.flagsRec || 0,
      dateFrom: dateFrom,
      dateTo: dateTo
    })
    Object.assign(accr, algorithmPayFSS.run({ cont, periodCalc, periodSalary, params: accr }))
  })
}

function calculateAlimony ({ orgID, cont, orderParams }) {
  const rlService = require('../../HR/modules/rlService')
  const periodCalc = periodService.getPeriod(orderParams.periodCalcID)
  const periodSalary = periodService.getPeriod(orderParams.periodSalaryID)
  const employeeNumbers = orderParams.accruals.map(o => o.employeeNumberID)
  rlService.loadCalcData({ cont,
    orgID,
    employeeNumbers,
    periodID: orderParams.periodSalaryID,
    loadData: { prop: true, dateFrom: periodSalary.dateFrom, dateTo: periodSalary.dateTo } })
  console.debug(`Payment calc finish load emp data ${dateService.formatDate(dateService.currentDateTime(), 'dd.mm.yyyy hh:nn:ss')}`)
  // Завантаження даних розахункових листів працівників за розрахунковий periodSalary
  accrualService.getAccrualByPeriodForEmployeeNumbers(cont, employeeNumbers, periodSalary.ID, null, orderParams.payElID)
  console.debug(`Payment calc finish load emp accrual ${dateService.formatDate(dateService.currentDateTime(), 'dd.mm.yyyy hh:nn:ss')}`)

  orderParams.paymentOrder = []
  orderParams.accruals = orderParams.accruals.filter(o => o.payRetentionID)
  orderParams.accruals.forEach(accr => {
    const accrual = cont.emp[accr.employeeNumberID].accrual.find(o => o.periodSalaryID === orderParams.periodSalaryID &&
      o.payElID === orderParams.payElID && o.sourceID === accr.payRetentionID && !(o.flagsRec & 2)) || {}
    accr.paymentDt = '[]'
    if (accrual) {
      accr.rlAccrual = JSON.stringify(accrual)
      delete accrual.ID
      if (accr.flagsFix & 1 << 1) {
        accrual.paySum = accr.paySum
        accrual.repaymentSum = Math.min(accrual.paySum, accr.repaymentSum)
        accrual.repaymentDebtSum = Math.max(0, accrual.paySum - accrual.repaymentSum)
      }
      if (!accrual.paySum) {
        accr.paySum = 0
        accr.mask = 0
        accr.periodSalary = periodSalary.dateFrom
      }
      Object.assign(accr, accrual)
      accr.periodCalcID = periodCalc.ID
      accr.periodCalc = periodCalc.dateFrom
      accr.reason = accr.paySum > 0 ? '0' : '1'
      if (orderParams.paymentMethod === '2') {
        if (!(accr.flagsFix & 1 << 15) && !(accr.flagsFix & 1 << 16)) {
          accr.paidSum = accr.paySum
          accr.depSum = 0
        } else if ((accr.flagsFix & 1 << 15) && !(accr.flagsFix & 1 << 16)) {
          accr.paidSum = accr.paySum - accr.depSum
        }
        if (!(accr.flagsFix & 1 << 15) && (accr.flagsFix & 1 << 16)) {
          accr.depSum = accr.paySum - accr.paidSum
        }
      }
      if (typeof accr.accrualDt === 'string') {
        accr.accrualDt = JSON.parse(accr.accrualDt)
      }
      accr.accrualDt = JSON.stringify(algorithmService.correctAccrualDt(accr.accrualDt || [], orderParams.paymentMethod === '2' ? accr.paidSum : accr.paySum))
    } else {
      accr.remove = true
    }
  })
}
function calculateRequestEmployee ({ orgID, cont, orderParams }) {
  const rlService = require('../../HR/modules/rlService')
  const periodCalc = periodService.getPeriod(orderParams.periodCalcID)
  const periodSalary = periodService.getPeriod(orderParams.periodSalaryID)
  const employeeNumbers = orderParams.accruals.map(o => o.employeeNumberID)
  rlService.loadCalcData({ cont,
    orgID,
    employeeNumbers,
    periodID: orderParams.periodSalaryID,
    loadData: { prop: true, dateFrom: periodSalary.dateFrom, dateTo: periodSalary.dateTo } })
  console.debug(`Payment calc finish load emp data ${dateService.formatDate(dateService.currentDateTime(), 'dd.mm.yyyy hh:nn:ss')}`)
  // Завантаження даних розахункових листів працівників за розрахунковий periodSalary
  accrualService.getAccrualByPeriodForEmployeeNumbers(cont, employeeNumbers, periodSalary.ID, null, orderParams.payElID)
  console.debug(`Payment calc finish load emp accrual ${dateService.formatDate(dateService.currentDateTime(), 'dd.mm.yyyy hh:nn:ss')}`)

  orderParams.paymentOrder = []
  orderParams.accruals = orderParams.accruals.filter(o => o.payRetentionID)
  orderParams.accruals.forEach(accr => {
    const accrual = cont.emp[accr.employeeNumberID].accrual.find(o => o.periodSalaryID === orderParams.periodSalaryID &&
      o.payElID === orderParams.payElID && o.sourceID === accr.payRetentionID && !(o.flagsRec & 2)) || {}
    accr.paymentDt = '[]'
    if (accrual) {
      accr.rlAccrual = JSON.stringify(accrual)
      delete accrual.ID
      if (accr.flagsFix & 1 << 1) {
        accrual.paySum = accr.paySum
      }
      if (!accrual.paySum) {
        accr.paySum = 0
        accr.mask = 0
        accr.periodSalary = periodSalary.dateFrom
      }
      Object.assign(accr, accrual)
      accr.periodCalcID = periodCalc.ID
      accr.periodCalc = periodCalc.dateFrom
      accr.reason = accr.paySum > 0 ? '0' : '1'
      if (orderParams.paymentMethod === '2') {
        if (!(accr.flagsFix & 1 << 15) && !(accr.flagsFix & 1 << 16)) {
          accr.paidSum = accr.paySum
          accr.depSum = 0
        } else if ((accr.flagsFix & 1 << 15) && !(accr.flagsFix & 1 << 16)) {
          accr.paidSum = accr.paySum - accr.depSum
        }
        if (!(accr.flagsFix & 1 << 15) && (accr.flagsFix & 1 << 16)) {
          accr.depSum = accr.paySum - accr.paidSum
        }
      }
      if (typeof accr.accrualDt === 'string') {
        accr.accrualDt = JSON.parse(accr.accrualDt)
      }
      accr.accrualDt = JSON.stringify(algorithmService.correctAccrualDt(accr.accrualDt || [], orderParams.paymentMethod === '2' ? accr.paidSum : accr.paySum))
    } else {
      accr.remove = true
    }
  })
}

function calculateFundSource ({ orgID, cont, orderParams }) {
  const rlService = require('../../HR/modules/rlService')
  const periodCalc = periodService.getPeriod(orderParams.periodCalcID)
  const periodSalary = periodService.getPeriod(orderParams.periodSalaryID)
  const dateFrom = periodSalary.dateFrom
  const dateTo = periodSalary.dateFrom
  const employeeNumbers = orderParams.accruals.map(o => o.employeeNumberID)
  const payEl = cont.payEl[orderParams.payElID]
  rlService.loadCalcData({ cont,
    orgID,
    employeeNumbers,
    periodID: orderParams.periodSalaryID,
    loadData: { prop: true, dateFrom: periodSalary.dateFrom, dateTo: periodSalary.dateTo } })
  const dictFundSourceFSSU = cont.dict.ac_fundSource.filter(o => o['dictFundTypeID.code'] === '02').map(o => o.ID)
  console.debug(`Prepayment calc finish load emp data ${dateService.formatDate(dateService.currentDateTime(), 'dd.mm.yyyy hh:nn:ss')}`)
  // Завантаження даних розахункових листів працівників за розрахунковий periodSalary
  accrualService.getAccrualByPeriodForEmployeeNumbers(cont, employeeNumbers, periodSalary.ID)
  console.debug(`Prepayment calc finish load emp accrual ${dateService.formatDate(dateService.currentDateTime(), 'dd.mm.yyyy hh:nn:ss')}`)
  if (payEl.dictFundSourceID || payEl.dictProgClassID || payEl.dictProjectID) {
    accrualService.getAccrualBalanceByFundForEmployeeNumbers(cont, employeeNumbers, periodSalary.ID, 'accrualBalanceFundSource',
      payEl.dictFundSourceID ? [payEl.dictFundSourceID] : null,
      payEl.dictProgClassID ? [payEl.dictProgClassID] : null,
      payEl.dictProjectID ? [payEl.dictProjectID] : null
    )
    accrualService.getAccrualBalanceByFundForEmployeeNumbers(cont, employeeNumbers, periodSalary.priorPeriodID, 'accrualBalanceIn',
      payEl.dictFundSourceID ? [payEl.dictFundSourceID] : null,
      payEl.dictProgClassID ? [payEl.dictProgClassID] : null,
      payEl.dictProjectID ? [payEl.dictProjectID] : null
    )
  } else {
    accrualService.getAccrualBalanceForEmployeeNumbers(cont, employeeNumbers, periodSalary.ID, 'accrualBalanceFundSource', dictFundSourceFSSU.length ? dictFundSourceFSSU : [0])
    accrualService.getAccrualBalanceForEmployeeNumbers(cont, employeeNumbers, periodSalary.ID, 'accrualBalanceIn', dictFundSourceFSSU.length ? dictFundSourceFSSU : [0])
  }

  console.debug(`Prepayment calc finish load emp balance accrual ${dateService.formatDate(dateService.currentDateTime(), 'dd.mm.yyyy hh:nn:ss')}`)
  const accruals = {}

  orderParams.accruals.forEach(accr => {
    if (!(accr.flagsFix & 1 << 22)) {
      accr.payRetention = {}
      accr.baseSumAll = 0
      accr.taxSumAll = 0
      accr.rollSumAll = 0
      accruals[accr.employeeNumberID] = []
      accr.accrualDt = []
      if (!['2', '3', '4'].includes(accr.reason)) {
        cont.emp[accr.employeeNumberID].accrual.forEach(acc => {
          const groupType = cont.payEl[acc.payElID].method.groupType
          if (!(acc.flagsRec & 8192) && acc.periodCalcID === orderParams.periodSalaryID && acc.accrualDt &&
            (!orderParams.periodSalarySelectID || acc.periodSalaryID === orderParams.periodSalarySelectID) && acc.accrualDt.length) {
            const accrualDt = []
            let paySumDt = 0
            acc.accrualDt.forEach(accDt => {
              if ((!payEl.dictFundSourceID || accDt.dictFundSourceID === payEl.dictFundSourceID) &&
                (!payEl.dictProgClassID || accDt.dictProgClassID === payEl.dictProgClassID) &&
                (!payEl.dictProjectID || accDt.dictProjectID === payEl.dictProjectID)) {
                paySumDt = accrualService.round(paySumDt + accDt.paySum, 2)
                accrualDt.push(Object.assign({}, accDt))
              }
            })
            if (paySumDt !== 0) {
              if (groupType === 'PAYMENT') {
                accr.baseSumAll = accrualService.round(accr.baseSumAll + paySumDt, 2)
                accruals[accr.employeeNumberID].push({
                  periodCalcID: orderParams.periodSalaryID,
                  periodSalaryID: orderParams.periodSalaryID,
                  periodCalc: periodSalary.dateFrom,
                  periodSalary: periodSalary.dateFrom,
                  employeeNumberID: accr.employeeNumberID,
                  payElID: acc.payElID,
                  mask: algorithmService.getFillMaskByPeriod(dateFrom, dateTo),
                  paySum: paySumDt,
                  dateFrom: dateFrom,
                  dateTo: dateTo,
                  accrualDt: accrualDt
                })
              } else if (groupType === 'FORPAY') {
                accr.rollSumAll = accrualService.round(accr.rollSumAll + paySumDt, 2)
              } else if (groupType === 'OFFTAKE') {
                accr.taxSumAll = accrualService.round(accr.taxSumAll + paySumDt, 2)
              }
            }
          }
        })
      }
      accr.incomingDebtSum = cont.emp[accr.employeeNumberID].accrualBalanceIn || 0
      if (accr.incomingDebtSum && cont.emp[accr.employeeNumberID].accrualBalanceInFundSource) {
        accr.accrualDt.push(...cont.emp[accr.employeeNumberID].accrualBalanceInFundSource)
      }
      accr.planPaySum = accr.baseSumAll - accr.rollSumAll - accr.taxSumAll + accr.incomingDebtSum
      accr.baseSum = accr.planPaySum
      accruals[accr.employeeNumberID].forEach(acc => {
        acc.accrualDt.forEach(accDt => {
          accr.accrualDt.push(Object.assign({}, accDt))
        })
      })
    }
  })

  console.debug(`Prepayment calc finish calc accrual PAYMENT ${dateService.formatDate(dateService.currentDateTime(), 'dd.mm.yyyy hh:nn:ss')}`)
  rlService.autoCalculate({ cont, orgID, periodID: orderParams.periodSalaryID, employeeNumbers, calculateProperty: { calcType: 1 << 2, dateFrom, dateTo: periodSalary.dateTo, accrual: accruals } })
  console.debug(`Prepayment calc finish calc accrual OFFTAKE ${dateService.formatDate(dateService.currentDateTime(), 'dd.mm.yyyy hh:nn:ss')}`)
  const payObligatory = []
  getPayObligatory({ cont, payObligatory, dateFrom: periodSalary.dateFrom, dateTo: periodSalary.dateTo })
  orderParams.paymentOrder = []
  orderParams.accruals.forEach(accr => {
    if (!(accr.flagsFix & 1 << 22)) {
      if (!['2', '3', '4'].includes(accr.reason)) {
        const offtakeAccrual = []
        const position = cont.emp[accr.employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= periodCalc.dateTo && o.dateTo >= periodCalc.dateFrom) ||
          cont.emp[accr.employeeNumberID].prop.employeePositions[cont.emp[accr.employeeNumberID].prop.employeePositions.length - 1] || {}
        accr.paymentDt = []
        accr.taxSum = cont.emp[accr.employeeNumberID].accrual.reduce((sum, acc) => {
          const payObl = payObligatory.find(o => o.payID === acc.payElID)
          if (payObl) {
            sum = accrualService.round(sum + acc.paySum, 2)
            offtakeAccrual.push(acc)
          }
          return sum
        }, 0)
        let taxSum = accr.taxSum
        accr.planPaySum = orderParams.applyRetention ? accr.baseSum : accr.baseSum - accr.taxSum
        let calcSum = accr.flagsFix & 2 ? accr.paySum : accr.planPaySum
        if (accr.rollSumAll !== 0) {
          accr.taxSum = accrualService.round(accr.taxSum / (accr.baseSumAll - accr.taxSumAll) * (accr.baseSumAll - accr.rollSumAll - accr.taxSumAll), 2)
        }

        if (calcSum > Math.min((cont.emp[accr.employeeNumberID].accrualBalanceFundSource || 0), (cont.emp[accr.employeeNumberID].accrualBalanceFundSource || 0))) {
          calcSum = Math.max(0, Math.min((cont.emp[accr.employeeNumberID].accrualBalanceFundSource || 0), (cont.emp[accr.employeeNumberID].accrualBalanceFundSource || 0)))
          accr.paySum = calcSum
          accr.flagsFix = (accr.flagsFix | 1 << 3) | 1 << 21
          accr.taxSum = accrualService.round(accr.taxSum * calcSum / (orderParams.applyRetention ? accr.baseSum : (accr.baseSum - accr.taxSum)), 2)
        } else {
          accr.taxSum = accrualService.round(accr.taxSum * calcSum / (orderParams.applyRetention ? accr.baseSum : (accr.baseSum - accr.taxSum)), 2)
        }

        if (!(accr.flagsFix & 2)) {
          accr.paySum = calcSum
          if (accr.paySum < 0.01) {
            accr.paySum = 0
            accr.reason = '1'
          } else {
            accr.reason = '0'
          }
        }

        accr.accrualDt = JSON.stringify(accr.paySum > 0 ? algorithmService.calcGroupSumAccrualDt(accr.accrualDt, accr.paySum, true) : [])

        if (accr.taxSum && accr.paySum > 0) {
          if (accr.taxSum !== taxSum) {
            algorithmService.correctAccrualDt(offtakeAccrual, accr.taxSum)
          }
          offtakeAccrual.forEach(acc => {
            const payObl = payObligatory.find(o => o.payID === acc.payElID)
            if (payObl && acc.periodSalaryID === orderParams.periodSalaryID) {
              setAccrualPaymentOrder({ orderParams, accr, payObligatory: payObl, payItem: acc, position })
            }
          })
        }
        const accrualFunds = []
        let esvSum = 0
        cont.emp[accr.employeeNumberID].accrualFund && cont.emp[accr.employeeNumberID].accrualFund.forEach(fund => {
          const payObl = payObligatory.find(o => o.payID === fund.payFundID)
          if (payObl) {
            accrualFunds.push(fund)
            esvSum = accrualService.round(esvSum + fund.paySum, 2)
          }
        })
        if (esvSum && accr.paySum > 0) {
          algorithmService.correctAccrualDt(accrualFunds, accrualService.round((esvSum / (accr.baseSumAll - accr.taxSumAll) * (accr.baseSumAll - accr.rollSumAll - accr.taxSumAll)) *
              calcSum / (orderParams.applyRetention ? accr.baseSum : (accr.baseSum - accr.taxSum)), 2))
          accrualFunds.forEach(fund => {
            const payObl = payObligatory.find(o => o.payID === fund.payFundID)
            setAccrualPaymentOrder({ orderParams, accr, payObligatory: payObl, payItem: fund, position })
          })
        }
        accr.baseSum = accrualService.round(calcSum + accr.taxSum, 2)
        accr.paymentDt.forEach(paymentDt => {
          paymentDt.paymentOrderAccDt = algorithmService.calcGroupSumAccrualPaymentDt(paymentDt.paymentOrderAccDt, paymentDt.paySum)
        })
        accr.paymentDt = JSON.stringify(accr.paymentDt)
      } else {
        accr.taxSum = 0
        accr.paySum = 0
        accr.planPaySum = 0
        accr.baseSum = 0
        accr.accrualDt = '[]'
        accr.paymentDt = '[]'
      }
    }
    Object.assign(accr, {
      payElID: orderParams.payElID,
      flagsRec: orderParams.flagsRec || 0,
      dateFrom: periodCalc.dateFrom,
      dateTo: periodCalc.dateTo
    })
    Object.assign(accr, algorithmPrepayment.run({ cont, periodCalc, periodSalary, params: accr }))
    if (orderParams.paymentMethod === '2') {
      if (!(accr.flagsFix & 1 << 15) && !(accr.flagsFix & 1 << 16)) {
        accr.paidSum = accr.paySum
        accr.depSum = 0
      } else if ((accr.flagsFix & 1 << 15) && !(accr.flagsFix & 1 << 16)) {
        accr.paidSum = accr.paySum - accr.depSum
      }
      if (!(accr.flagsFix & 1 << 15) && (accr.flagsFix & 1 << 16)) {
        accr.depSum = accr.paySum - accr.paidSum
      }
    }
  })
  console.debug(`payFundSource calc finish ${dateService.formatDate(dateService.currentDateTime(), 'dd.mm.yyyy hh:nn:ss')}`)
}
