const UB = require('@unitybase/ub')
const App = UB.App
const path = require('path')
const docxService = require('../../../AC/modules/documentBuilder/docxService')
const dateService = require('../../../AC/modules/dataServices/dateService')
const currencyService = require('../../../AC/public/core/currencyService')
const accrualService = require('../../../HR/modules/accrualService')
const payRollService = require('../../../HR/modules/payRollService')
const settingsService = require('../../../AC/modules/entityServices/settingsService')

const _ = require('lodash')

module.exports = {
  getPayFormFSS,
  getPayForm53,
  payRollBank,
  payRollByAlimony,
  getСalcApplication
}
function payRollBank (params) {
  let res
  switch (params.type) {
    case 'pdf':
      res = JSON.stringify(getDataPayRollBank(params))
      break
  }
  return res
}

function payRollByAlimony (params) {
  let res
  switch (params.type) {
    case 'pdf':
      res = JSON.stringify(getDataPayRollByAlimony(params))
      break
  }
  return res
}

function getСalcApplication (params) {
  let res
  switch (params.type) {
    case 'pdf':
      res = JSON.stringify(getDataСalcApplication(params))
      break
  }
  return res
}

function getPayForm53 (params) {
  let res
  switch (params.type) {
    case 'pdf':
      res = JSON.stringify(getDataPayForm53(params))
      break
    case 'docx':
      const configDir = process.configPath
      const templatePath = path.join(configDir, App.domainInfo.models.HR.path, 'modules', 'template', 'payForm53.docx')
      res = payForm53Docx(params, getDataPayForm53(params), templatePath)
      break
  }

  return res
}

function getPayFormFSS (params) {
  return JSON.stringify(getDataPayFormFSS(params))
}

function payForm53Docx (params, payRollData, templatePath) {
  let sFileName = 'payForm53'

  const result = docxService.generateDocxDocument({
    templatePath: templatePath,
    fileName: sFileName,
    data: payRollData,
    entityName: 'hr_payRoll',
    ID: params.instanceID,
    options: {
      nullGetter: function nullGetter (part) {
        if (!part.module) {
          return ''
        }
        if (part.module === 'rawxml') {
          return ''
        }
        return ''
      }
    }
  })
  return JSON.stringify({
    fileContent: JSON.stringify(result.stringContent),
    fileName: payRollData.description
  })
}

function getDataByBank (orgID, payRollDtData, payOutID) {
  const employeePayOutIDs = []
  const payRetentionIDs = []
  const employeeNumberIDs = []
  const payOut = payRollService.getPayOutList(orgID, ['ID', 'name', 'isDefault', 'exportMethodID', 'projectCode', 'branchCode',
    'contractorID.OKPOCode', 'contractorID.name', 'contrAccountID.code', 'contrAccountID.bankID.name', 'organizationID'], {
    'exportMethodID': 'exportMethod',
    'contractorID.OKPOCode': 'bankOKPOCode',
    'contrAccountID.bankID.name': 'bankName',
    'contrAccountID.code': 'bankAccount'
  })
  const payOutDef = payOut.find(o => o.isDefault && o.organizationID === orgID) || payOut.find(o => o.isDefault)
  payRollDtData.forEach(row => {
    employeeNumberIDs.push(row.employeeNumberID)
    if (row.payRetentionID) {
      payRetentionIDs.push(row.payRetentionID)
    } else if (row.employeePayOutID) {
      employeePayOutIDs.push(row.employeePayOutID)
    }
  })
  const payRetention = payRetentionIDs.length ? UB.Repository('hr_payRetention').attrs(['ID', 'payOutID', 'exportMethodID', 'personalAccount', 'personalSubAccount', 'projectCode', 'branchCode'])
    .where('ID', 'in', payRetentionIDs).misc({ __allowSelectSafeDeleted: true }).selectAsObject({ 'exportMethodID': 'exportMethod' }) : []
  const employeePayOut = employeePayOutIDs.length ? UB.Repository('hr_employeePayOut').attrs(['ID', 'payOutID', 'exportMethodID', 'personalAccount', 'personalSubAccount', 'projectCode', 'branchCode'])
    .where('ID', 'in', employeePayOutIDs).misc({ __allowSelectSafeDeleted: true }).selectAsObject({ 'exportMethodID': 'exportMethod', 'payOutID.name': 'name' }) : []
  const exportData = {}
  payRollDtData.forEach(row => {
    let add = false
    if (row.payRetentionID) {
      const payRetentionData = payRetention.find(o => o.ID === row.payRetentionID)
      add = true
      if (payRetentionData) {
        let payOutID
        if (payRetentionData.payOutID) {
          const payOutData = payOut.find(o => o.ID === payRetentionData.payOutID)
          if (payOutData) {
            payOutID = payOutData.ID
          }
        } else if (row.payOutID) {
          const payOutData = payOut.find(o => o.ID === row.payOutID)
          if (payOutData) {
            payOutID = payOutData.ID
          }
        }
        if (!payOutID && payOutDef && payOutDef.exportMethod) {
          payOutID = payOutDef.ID
        }
        if (payOutID) {
          if (!exportData[`${payOutID}`]) {
            exportData[`${payOutID}`] = []
          }
          exportData[`${payOutID}`].push(row)
        } else {
          if (!exportData[`2`]) {
            exportData[`2`] = [row]
          } else {
            exportData[`2`].push(row)
          }
        }
      }
    } else if (row.employeePayOutID) {
      const employeePayOutData = employeePayOut.find(o => o.ID === row.employeePayOutID)
      let payOutID
      add = true
      if (employeePayOutData) {
        if (employeePayOutData.payOutID) {
          const payOutData = payOut.find(o => o.ID === employeePayOutData.payOutID)
          if (payOutData) {
            payOutID = payOutData.ID
          }
        } else if (row.payOutID) {
          const payOutData = payOut.find(o => o.ID === row.payOutID)
          if (payOutData) {
            payOutID = payOutData.ID
          }
        }
      }
      if (!payOutID && payOutDef && payOutDef.exportMethod) {
        payOutID = payOutDef.ID
      }
      if (payOutID) {
        if (!exportData[`${payOutID}`]) {
          exportData[`${payOutID}`] = []
        }
        exportData[`${payOutID}`].push(row)
      } else {
        if (!exportData[`2`]) {
          exportData[`2`] = [row]
        } else {
          exportData[`2`].push(row)
        }
      }
    } else if (row.payOutID) {
      const payOutData = payOut.find(o => o.ID === row.payOutID)
      if (payOutData) {
        add = true
        if (payOutData.ID) {
          if (!exportData[`${payOutData.ID}`]) {
            exportData[`${payOutData.ID}`] = []
          }
          exportData[`${payOutData.ID}`].push(row)
        } else {
          if (!exportData[`2`]) {
            exportData[`2`] = [row]
          } else {
            exportData[`2`].push(row)
          }
        }
      }
    }
    if (!add) {
      if (payOutID) {
        const payOutData = payOut.find(o => o.ID === payOutID)
        if (payOutData) {
          if (payOutData.ID) {
            if (!exportData[`${payOutData.ID}`]) {
              exportData[`${payOutData.ID}`] = []
            }
            exportData[`${payOutData.ID}`].push(row)
          } else {
            if (!exportData[`2`]) {
              exportData[`2`] = [row]
            } else {
              exportData[`2`].push(row)
            }
          }
        }
      } else if (payOutDef) {
        if (payOutDef.ID) {
          if (!exportData[`${payOutDef.ID}`]) {
            exportData[`${payOutDef.ID}`] = []
          }
          exportData[`${payOutDef.ID}`].push(row)
        } else {
          if (!exportData[`2`]) {
            exportData[`2`] = [row]
          } else {
            exportData[`2`].push(row)
          }
        }
      } else {
        if (!exportData[`2`]) {
          exportData[`2`] = [row]
        } else {
          exportData[`2`].push(row)
        }
      }
    }
  })
  const result = []

  Object.keys(exportData).forEach(expData => {
    const payOutData = payOut.find(o => o.ID === Number(expData)) || {}
    result.push({
      bankOKPOCode: payOutData.bankOKPOCode || '',
      bankName: payOutData.bankName || payOutData.name || '',
      bankAccount: payOutData.bankAccount || '',
      employee: exportData[expData]
    })
  })
  return result
}

function getDataPayRollBank (params) {
  let orderDate,
    orderDay,
    orderMonth,
    orderYear

  const payRollData = UB.Repository('hr_payRoll')
    .attrs('description', 'organizationID', 'organizationID.fullName', 'organizationID.EDRPOUCode', 'departmentID.name',
      'periodCalcID.dateFrom', 'periodCalcID.dateTo', 'orderDate', 'periodSalaryID.dictMonthID.name',
      'periodSalaryID.pYear', 'orderNumber', 'paymentMethod', 'payElID.printName', 'payElID.name', 'departmentID', 'dictFundSourceList')
    .where('ID', '=', params.instanceID)
    .where('organizationID.state', '=', 'ACTIVE')
    .where('[organizationID.mi_dateFrom] <= [periodCalcID.dateTo]', 'custom')
    .orderByDesc('organizationID.mi_dateFrom')
    .orderByDesc('departmentID.mi_dateFrom')
    .limit(1)
    .selectSingle({
      'organizationID.EDRPOUCode': 'EDRPOUCode',
      'organizationID.fullName': 'orgName',
      'departmentID.name': 'depName',
      'periodCalcID.dateFrom': 'dateFrom',
      'periodCalcID.dateTo': 'dateTo',
      'periodSalaryID.dictMonthID.name': 'periodSalaryM',
      'periodSalaryID.pYear': 'periodSalaryY'
    })
  payRollData.isDepName = false
  if (payRollData.departmentID) {
    payRollData.isDepName = true
    payRollData.depName = `${payRollData.depName || ''}${payRollData.includeSubDep ? ' (з підлеглими)' : ''}`
  }
  payRollData.isFundName = !!payRollData.dictFundSourceList
  if (payRollData.isFundName) {
    payRollData.dictFundSourceList = payRollData.dictFundSourceList.split(',')
    let fundSources = UB.Repository('ac_fundSource')
      .attrs(['description'])
      .where('ID', 'in', payRollData.dictFundSourceList)
      .selectAsObject()
    payRollData.fundSourceNames = fundSources[0].description
    fundSources = fundSources.slice(1)
    fundSources.forEach(el => {
      payRollData.fundSourceNames += `, ${el.description}`
    })
  }
  let respPerson = {}
  if (payRollData) {
    respPerson = getRespPerson(payRollData)
    payRollData.dateFrom = dateService.formatDate(payRollData.dateFrom)
    payRollData.dateTo = dateService.formatDate(payRollData.dateTo)
    payRollData.payElName = payRollData['payElID.printName'] || payRollData['payElID.name']
    if (payRollData.EDRPOUCode) {
      payRollData.EDRPOUCode.split('').forEach((item, i) => {
        payRollData[`code${i + 1}`] = item
      })
    }

    if (payRollData.orderDate) {
      payRollData.orderDate = dateService.formatDate(dateService.shiftDate(payRollData.orderDate), 'dd.mm.yyyy')
      orderDate = payRollData.orderDate.split('.')
      orderDay = orderDate[0]
      orderMonth = orderDate[1]
      orderYear = orderDate[2]
    }
  }

  const payRollDtData = UB.Repository('hr_payRollDt')
    .attrs('employeeNumberID.personalAccount', 'employeeNumberID.kind', 'employeeNumberID.tabNum', 'employeeNumberID.employeeID.fullFIO', 'employeeNumberID.employeeID.taxCode',
      'paySum', 'paidSum', 'depSum', 'payRetentionID', 'employeePayOutID', 'payOutID')
    .where('payRollID', '=', params.instanceID)
    .where('paySum', '>', 0)
    .orderBy('employeeNumberID.tabNumSort')
    .selectAsObject({
      'employeeNumberID.tabNum': 'tabNum',
      'employeeNumberID.personalAccount': 'personalAccount',
      'employeeNumberID.employeeID.fullFIO': 'fullFIO',
      'employeeNumberID.employeeID.taxCode': 'taxCode',
      'employeeNumberID.kind': 'empKind'
    })

  let dictSigner = []
  if (params.signerCode && payRollData) {
    let orgID = settingsService.get('hrUseSignersParentOrg',payRollData.organizationID)
    if(!orgID) orgID = payRollData.organizationID

    dictSigner = UB.Repository('hr_dictSigners')
      .attrs(['ID', 'departmentID', 'employeePositionID', 'employeeNumberID.employeeID.shortFIO', 'orderN', 'signerName', 'positionName'])
      .where('orgID', '=', orgID)
      .where('signerCode', '=', params.signerCode)
      .whereIf(!payRollData.departmentID, 'departmentID', 'isNull')
      .whereIf(payRollData.departmentID, 'departmentID', '=', payRollData.departmentID)
      .orderBy('orderN')
      .selectAsObject({
        'employeeNumberID.employeeID.shortFIO': 'signerShortName'
      }) || []
  }
  const resultData = getDataByBank(payRollData.organizationID, payRollDtData)
  const banks = []
  let isStudent = true
  const bankSumWords = currencyService.currencyToWordsUkr(0)
  resultData.forEach((bankData, index) => {
    const pages = [{ pageNum: 1, payRollDt: [] }]
    // SOE === 'Signer On Each'
    const pagesSOE = [{ pageNum: 1, payRollDtSOE: [] }]
    let idx = 0
    let idxSOE = 0
    let pageSum = 0
    let pagesSOESum = 0
    let addRow = 0
    let addSOERow = 0
    let signersRowCount = 1
    if (dictSigner.length) {
      dictSigner.forEach(signer => {
        if (signer.signerName && signer.signerName.length > 56) {
          signersRowCount += Math.floor(signer.signerName.length / 56) + ((signer.signerName.length % 56) > 0 ? 1 : 0)
          signersRowCount++
        } else {
          signersRowCount += 2
        }
      })
    }
    const payRollDtSumData = {
      paySum: 0,
      paidSum: 0,
      depSum: 0
    }
    bankData.employee.forEach((row, i) => {
      if (!row.empKind || (row.empKind && row.empKind !== 'STUD')) isStudent = false
      payRollDtSumData.paySum = accrualService.round(payRollDtSumData.paySum + row.paySum)
      payRollDtSumData.paidSum = accrualService.round(payRollDtSumData.paidSum + row.paidSum)
      payRollDtSumData.depSum = accrualService.round(payRollDtSumData.depSum + row.depSum)

      if (((idx === 0 ? 9 : 1) + (pages[idx].payRollDt.length + addRow)) >= 57) {
        pages[idx].pageSum = pageSum.toFixed(2)
        pages[idx].isPageBreak = true
        pageSum = 0
        idx++
        pages.push({ pageNum: idx + 1, payRollDt: [] })
        addRow = 0
      }
      // 9 + 2 + 40 + 7 >= 57 // 58 >= 57
      if (((idxSOE === 0 ? 9 : 1) + (pagesSOE[idxSOE].payRollDtSOE.length + addSOERow) + signersRowCount) >= 57) {
        pagesSOE[idxSOE].pageSum = pagesSOESum.toFixed(2)
        pagesSOE[idxSOE].isPageBreak = true
        pagesSOESum = 0
        idxSOE++
        pagesSOE.push({ pageNum: idxSOE + 1, payRollDtSOE: [] })
        addSOERow = 0
      }

      pageSum = accrualService.round(pageSum + (row.paySum ? row.paySum : 0))
      pagesSOESum = accrualService.round(pagesSOESum + (row.paySum ? row.paySum : 0))
      row.paySum = row.paySum ? row.paySum.toFixed(2) : '0.00'
      row.rowNum = i + 1
      pages[idx].payRollDt.push(row)
      pagesSOE[idxSOE].payRollDtSOE.push(row)
      row.personalAccount = row.personalAccount || ''

      row.fullFIO = row.fullFIO || ''

      if (row.fullFIO.length >= 50 || row.personalAccount.length >= 20) {
        let rowCount = 0
        if (row.fullFIO.length >= 50) {
          let fullFIO = ''
          let lastLineLength = 0
          row.fullFIO.split(' ').forEach(word => {
            if ((lastLineLength + word.length + 1) < 50) {
              fullFIO = fullFIO.length > 0 ? `${fullFIO} ${word}` : word
              lastLineLength = fullFIO.length
            } else {
              fullFIO = `${fullFIO}</br>${word}`
              lastLineLength = word.length
              rowCount++
            }
          })
          row.fullFIO = fullFIO
        }
        if (row.personalAccount.length >= 20) {
          rowCount = Math.max((Math.floor(row.personalAccount.length / 19) + ((row.personalAccount.length % 19) > 0 ? 1 : 0)), rowCount) - 1
        }

        addRow += (rowCount)
        addSOERow += (rowCount)
      }
    })

    if (((idx === 0 ? 9 : 1) + (pages[idx].payRollDt.length + addRow) + signersRowCount) >= 56) {
      idx++
      pages.push({ pageNum: idx + 1, payRollDt: [] })
      pages[idx - 1].pageSum = (pageSum - Number(pages[idx - 1].payRollDt[pages[idx - 1].payRollDt.length - 1].paySum)).toFixed(2)
      pages[idx].pageSum = pages[idx - 1].payRollDt[pages[idx - 1].payRollDt.length - 1].paySum
      pages[idx].payRollDt.push(pages[idx - 1].payRollDt[pages[idx - 1].payRollDt.length - 1])
      pages[idx - 1].payRollDt.splice(pages[idx - 1].payRollDt.length - 1, 1)
      pages[idx - 1].isPageBreak = true
    } else {
      pages[idx].pageSum = pageSum.toFixed(2)
    }
    if (((idxSOE === 0 ? 9 : 1) + (pagesSOE[idxSOE].payRollDtSOE.length + addSOERow) + signersRowCount) >= 56) {
      idxSOE++
      pagesSOE.push({ pageNum: idxSOE + 1, payRollDtSOE: [] })
      pagesSOE[idxSOE - 1].pageSum = (pagesSOESum - Number(pagesSOE[idxSOE - 1].payRollDtSOE[pagesSOE[idxSOE - 1].payRollDtSOE.length - 1].paySum)).toFixed(2)
      pagesSOE[idxSOE].pageSum = pagesSOE[idxSOE - 1].payRollDtSOE[pagesSOE[idxSOE - 1].payRollDtSOE.length - 1].paySum
      pagesSOE[idxSOE].payRollDtSOE.push(pagesSOE[idxSOE - 1].payRollDtSOE[pagesSOE[idxSOE - 1].payRollDtSOE.length - 1])
      pagesSOE[idxSOE - 1].payRollDtSOE.splice(pagesSOE[idxSOE - 1].payRollDtSOE.length - 1, 1)
      pagesSOE[idxSOE - 1].isPageBreak = true
    } else {
      pagesSOE[idxSOE].pageSum = pagesSOESum.toFixed(2)
    }

    pagesSOE[idxSOE].isLastPage = true
    if (payRollData.paymentMethod === '1') payRollDtSumData.paidSum = payRollDtSumData.paySum
    const paySumFull = currencyService.currencyShortToWordsUkr(payRollDtSumData['paySum'])
    const paySumFullWords = currencyService.currencyToWordsUkr(payRollDtSumData['paySum'])
    Object.keys(payRollDtSumData).forEach(item => {
      payRollDtSumData[item] = payRollDtSumData[item] ? Number(payRollDtSumData[item]).toFixed(2) : ''
    })

    pages[idx].paySum = payRollDtSumData.paySum
    pagesSOE[idxSOE].paySum = payRollDtSumData.paySum
    banks.push(Object.assign({
      bankOKPOCode: bankData.bankOKPOCode || '',
      bankName: bankData.bankName || '',
      bankAccount: bankData.bankAccount || '',
      isBankBreak: index !== (resultData.length - 1)
    },
    payRollData,
    payRollDtSumData,
    respPerson,
    {
      orderDay,
      orderMonth,
      orderYear,
      isStudent,
      showOrderDay: !!orderDay,
      paySumFull,
      paySumFullWords,
      bankSumWords,
      signers: dictSigner,
      signersRowCount,
      pages,
      pagesSOE
    }))
  })
  return { banks }
}

function getDataPayRollByAlimony (params) {
  let orderDate,
    orderDay,
    orderMonth,
    orderYear

  const payRollData = UB.Repository('hr_payRoll')
    .attrs('description', 'organizationID', 'organizationID.fullName', 'organizationID.EDRPOUCode', 'departmentID.name',
      'periodCalcID.dateFrom', 'periodCalcID.dateTo', 'orderDate', 'periodSalaryID.dictMonthID.name',
      'periodSalaryID.pYear', 'orderNumber', 'paymentMethod', 'payElID.printName', 'payElID.name', 'departmentID', 'dictFundSourceList')
    .where('ID', '=', params.instanceID)
    .where('organizationID.state', '=', 'ACTIVE')
    .where('[organizationID.mi_dateFrom] <= [periodCalcID.dateTo]', 'custom')
    .orderByDesc('organizationID.mi_dateFrom')
    .orderByDesc('departmentID.mi_dateFrom')
    .limit(1)
    .selectSingle({
      'organizationID.EDRPOUCode': 'EDRPOUCode',
      'organizationID.fullName': 'orgName',
      'departmentID.name': 'depName',
      'periodCalcID.dateFrom': 'dateFrom',
      'periodCalcID.dateTo': 'dateTo',
      'periodSalaryID.dictMonthID.name': 'periodSalaryM',
      'periodSalaryID.pYear': 'periodSalaryY'
    })
  payRollData.isDepName = false
  if (payRollData.departmentID) {
    payRollData.isDepName = true
    payRollData.depName = `${payRollData.depName || ''}${payRollData.includeSubDep ? ' (з підлеглими)' : ''}`
  }
  payRollData.isFundName = !!payRollData.dictFundSourceList
  if (payRollData.isFundName) {
    payRollData.dictFundSourceList = payRollData.dictFundSourceList.split(',')
    let fundSources = UB.Repository('ac_fundSource')
      .attrs(['description'])
      .where('ID', 'in', payRollData.dictFundSourceList)
      .selectAsObject()
    payRollData.fundSourceNames = fundSources[0].description
    fundSources = fundSources.slice(1)
    fundSources.forEach(el => {
      payRollData.fundSourceNames += `, ${el.description}`
    })
  }
  let respPerson = {}
  if (payRollData) {
    respPerson = getRespPerson(payRollData)
    payRollData.dateFrom = dateService.formatDate(payRollData.dateFrom)
    payRollData.dateTo = dateService.formatDate(payRollData.dateTo)
    payRollData.payElName = payRollData['payElID.printName'] || payRollData['payElID.name']
    if (payRollData.EDRPOUCode) {
      payRollData.EDRPOUCode.split('').forEach((item, i) => {
        payRollData[`code${i + 1}`] = item
      })
    }

    if (payRollData.orderDate) {
      payRollData.orderDate = dateService.formatDate(dateService.shiftDate(payRollData.orderDate), 'dd.mm.yyyy')
      orderDate = payRollData.orderDate.split('.')
      orderDay = orderDate[0]
      orderMonth = orderDate[1]
      orderYear = orderDate[2]
    }
  }

  const payRollDtData = UB.Repository('hr_payRollDt')
    .attrs('employeeNumberID.personalAccount', 'employeeNumberID.kind', 'employeeNumberID.tabNum',
      'employeeNumberID.employeeID.fullFIO', 'employeeNumberID.employeeID.taxCode',
      'paySum', 'paidSum', 'depSum',
      'payRetentionID',
      'payRetentionID.contrAccountID.organizationID.name',
      'payRetentionID.contrAccountID.code',
      'payRetentionID.contrAccountID.bankID.name',
      'payRetentionID.contrAccountID.organizationID.OKPOCode',
      'employeePayOutID', 'payOutID')
    .where('payRollID', '=', params.instanceID)
    .where('paySum', '>', 0)
    .orderBy('employeeNumberID.tabNumSort')
    .selectAsObject({
      'employeeNumberID.tabNum': 'tabNum',
      'employeeNumberID.personalAccount': 'personalAccount',
      'employeeNumberID.employeeID.fullFIO': 'fullFIO',
      'employeeNumberID.employeeID.taxCode': 'taxCode',
      'employeeNumberID.kind': 'empKind',
      'payRetentionID.contrAccountID.organizationID.name': 'contrAgent',
      'payRetentionID.contrAccountID.code': 'accountForTransfer',
      'payRetentionID.contrAccountID.bankID.name': 'bankForTransfer',
      'payRetentionID.contrAccountID.organizationID.OKPOCode': 'contrAgentCode'
    })

  let dictSigner = []
  if (params.signerCode && payRollData) {
    dictSigner = UB.Repository('hr_dictSigners')
      .attrs(['ID', 'departmentID', 'employeePositionID', 'employeeNumberID.employeeID.shortFIO', 'orderN', 'signerName', 'positionName'])
      .where('orgID', '=', payRollData.organizationID)
      .where('signerCode', '=', params.signerCode)
      .whereIf(!payRollData.departmentID, 'departmentID', 'isNull')
      .whereIf(payRollData.departmentID, 'departmentID', '=', payRollData.departmentID)
      .orderBy('orderN')
      .selectAsObject({
        'employeeNumberID.employeeID.shortFIO': 'signerShortName'
      }) || []
  }
  const resultData = getDataByBank(payRollData.organizationID, payRollDtData)
  const banks = []
  let isStudent = true
  const bankSumWords = currencyService.currencyToWordsUkr(0)
  resultData.forEach((bankData, index) => {
    const pages = [{ pageNum: 1, payRollDt: [] }]
    // SOE === 'Signer On Each'
    const pagesSOE = [{ pageNum: 1, payRollDtSOE: [] }]
    let idx = 0
    let idxSOE = 0
    let pageSum = 0
    let pagesSOESum = 0
    let addRow = 0
    let addSOERow = 0
    let signersRowCount = 1
    if (dictSigner.length) {
      dictSigner.forEach(signer => {
        if (signer.signerName && signer.signerName.length > 56) {
          signersRowCount += Math.floor(signer.signerName.length / 56) + ((signer.signerName.length % 56) > 0 ? 1 : 0)
          signersRowCount++
        } else {
          signersRowCount += 2
        }
      })
    }
    const payRollDtSumData = {
      paySum: 0,
      paidSum: 0,
      depSum: 0
    }
    bankData.employee.forEach((row, i) => {
      if (!row.empKind || (row.empKind && row.empKind !== 'STUD')) isStudent = false
      payRollDtSumData.paySum = accrualService.round(payRollDtSumData.paySum + row.paySum)
      payRollDtSumData.paidSum = accrualService.round(payRollDtSumData.paidSum + row.paidSum)
      payRollDtSumData.depSum = accrualService.round(payRollDtSumData.depSum + row.depSum)

      if (((idx === 0 ? 9 : 1) + (pages[idx].payRollDt.length + addRow)) >= 57) {
        pages[idx].pageSum = pageSum.toFixed(2)
        pages[idx].isPageBreak = true
        pageSum = 0
        idx++
        pages.push({ pageNum: idx + 1, payRollDt: [] })
        addRow = 0
      }
      // 9 + 2 + 40 + 7 >= 57 // 58 >= 57
      if (((idxSOE === 0 ? 9 : 1) + (pagesSOE[idxSOE].payRollDtSOE.length + addSOERow) + signersRowCount) >= 57) {
        pagesSOE[idxSOE].pageSum = pagesSOESum.toFixed(2)
        pagesSOE[idxSOE].isPageBreak = true
        pagesSOESum = 0
        idxSOE++
        pagesSOE.push({ pageNum: idxSOE + 1, payRollDtSOE: [] })
        addSOERow = 0
      }

      pageSum = accrualService.round(pageSum + (row.paySum ? row.paySum : 0))
      pagesSOESum = accrualService.round(pagesSOESum + (row.paySum ? row.paySum : 0))
      row.paySum = row.paySum ? row.paySum.toFixed(2) : '0.00'
      row.rowNum = i + 1
      pages[idx].payRollDt.push(row)
      pagesSOE[idxSOE].payRollDtSOE.push(row)
      row.personalAccount = row.personalAccount || ''

      row.fullFIO = row.fullFIO || ''

      if (row.fullFIO.length >= 50 || row.personalAccount.length >= 20) {
        let rowCount = 0
        if (row.fullFIO.length >= 50) {
          let fullFIO = ''
          let lastLineLength = 0
          row.fullFIO.split(' ').forEach(word => {
            if ((lastLineLength + word.length + 1) < 50) {
              fullFIO = fullFIO.length > 0 ? `${fullFIO} ${word}` : word
              lastLineLength = fullFIO.length
            } else {
              fullFIO = `${fullFIO}</br>${word}`
              lastLineLength = word.length
              rowCount++
            }
          })
          row.fullFIO = fullFIO
        }
        if (row.personalAccount.length >= 20) {
          rowCount = Math.max((Math.floor(row.personalAccount.length / 19) + ((row.personalAccount.length % 19) > 0 ? 1 : 0)), rowCount) - 1
        }

        addRow += (rowCount)
        addSOERow += (rowCount)
      }
    })

    if (((idx === 0 ? 9 : 1) + (pages[idx].payRollDt.length + addRow) + signersRowCount) >= 56) {
      idx++
      pages.push({ pageNum: idx + 1, payRollDt: [] })
      pages[idx - 1].pageSum = (pageSum - Number(pages[idx - 1].payRollDt[pages[idx - 1].payRollDt.length - 1].paySum)).toFixed(2)
      pages[idx].pageSum = pages[idx - 1].payRollDt[pages[idx - 1].payRollDt.length - 1].paySum
      pages[idx].payRollDt.push(pages[idx - 1].payRollDt[pages[idx - 1].payRollDt.length - 1])
      pages[idx - 1].payRollDt.splice(pages[idx - 1].payRollDt.length - 1, 1)
      pages[idx - 1].isPageBreak = true
    } else {
      pages[idx].pageSum = pageSum.toFixed(2)
    }
    if (((idxSOE === 0 ? 9 : 1) + (pagesSOE[idxSOE].payRollDtSOE.length + addSOERow) + signersRowCount) >= 56) {
      idxSOE++
      pagesSOE.push({ pageNum: idxSOE + 1, payRollDtSOE: [] })
      pagesSOE[idxSOE - 1].pageSum = (pagesSOESum - Number(pagesSOE[idxSOE - 1].payRollDtSOE[pagesSOE[idxSOE - 1].payRollDtSOE.length - 1].paySum)).toFixed(2)
      pagesSOE[idxSOE].pageSum = pagesSOE[idxSOE - 1].payRollDtSOE[pagesSOE[idxSOE - 1].payRollDtSOE.length - 1].paySum
      pagesSOE[idxSOE].payRollDtSOE.push(pagesSOE[idxSOE - 1].payRollDtSOE[pagesSOE[idxSOE - 1].payRollDtSOE.length - 1])
      pagesSOE[idxSOE - 1].payRollDtSOE.splice(pagesSOE[idxSOE - 1].payRollDtSOE.length - 1, 1)
      pagesSOE[idxSOE - 1].isPageBreak = true
    } else {
      pagesSOE[idxSOE].pageSum = pagesSOESum.toFixed(2)
    }

    pagesSOE[idxSOE].isLastPage = true
    if (payRollData.paymentMethod === '1') payRollDtSumData.paidSum = payRollDtSumData.paySum
    const paySumFull = currencyService.currencyShortToWordsUkr(payRollDtSumData['paySum'])
    const paySumFullWords = currencyService.currencyToWordsUkr(payRollDtSumData['paySum'])
    Object.keys(payRollDtSumData).forEach(item => {
      payRollDtSumData[item] = payRollDtSumData[item] ? Number(payRollDtSumData[item]).toFixed(2) : ''
    })

    pages[idx].paySum = payRollDtSumData.paySum
    pagesSOE[idxSOE].paySum = payRollDtSumData.paySum
    banks.push(Object.assign({
      bankOKPOCode: bankData.bankOKPOCode || '',
      bankName: bankData.bankName || '',
      bankAccount: bankData.bankAccount || '',
      isBankBreak: index !== (resultData.length - 1)
    },
    payRollData,
    payRollDtSumData,
    respPerson,
    {
      orderDay,
      orderMonth,
      orderYear,
      isStudent,
      showOrderDay: !!orderDay,
      paySumFull,
      paySumFullWords,
      bankSumWords,
      signers: dictSigner,
      signersRowCount,
      pages,
      pagesSOE
    }))
  })
  return { banks }
}

function getDataСalcApplication (params) {
  const payRoll = UB.Repository('hr_payRoll')
    .attrs('ID', 'description', 'organizationID', 'organizationID.fullName', 'organizationID.EDRPOUCode', 'departmentID.name', 'includeSubDep', 'dictMultiGroupID', 'dictMultiGroupID.name', 'includeSubDepGroup',
      'periodCalcID.dateFrom', 'periodCalcID.dateTo', 'orderDate', 'periodSalaryID.dictMonthID.name',
      'periodSalaryID.pYear', 'orderNumber', 'paymentMethod', 'payElID.printName', 'payElID.name', 'departmentID', 'dictFundSourceList')
    .where('ID', '=', params.instanceID)
    .where('organizationID.state', '=', 'ACTIVE')
    .where('[organizationID.mi_dateFrom] <= [periodCalcID.dateTo]', 'custom')
    .orderByDesc('organizationID.mi_dateFrom')
    .selectSingle({
      'organizationID.EDRPOUCode': 'EDRPOUCode',
      'organizationID.fullName': 'orgName',
      'departmentID.name': 'departmentName',
      'dictMultiGroupID.name': 'dictMultiGroupName',
      'periodCalcID.dateFrom': 'dateFrom',
      'periodCalcID.dateTo': 'dateTo',
      'periodSalaryID.dictMonthID.name': 'periodSalaryM',
      'periodSalaryID.pYear': 'periodSalaryY'
    })
  payRoll.isDepName = false
  if (payRoll.departmentID) {
    payRoll.isDepName = true
    payRoll.depName = `${payRoll.departmentName}${payRoll.includeSubDep ? ' (з підлеглими)' : ''}`
  }

  payRoll.isFundName = !!payRoll.dictFundSourceList
  if (payRoll.isFundName) {
    payRoll.dictFundSourceList = payRoll.dictFundSourceList.split(',')
    let fundSources = UB.Repository('ac_fundSource')
      .attrs(['description'])
      .where('ID', 'in', payRoll.dictFundSourceList)
      .selectAsObject()
    payRoll.fundSourceNames = fundSources[0].description
    fundSources = fundSources.slice(1)
    fundSources.forEach(el => {
      payRoll.fundSourceNames += `, ${el.description}`
    })
  }
  if (payRoll) {
    payRoll.dateFrom = dateService.formatDate(payRoll.dateFrom)
    payRoll.dateTo = dateService.formatDate(payRoll.dateTo)
    payRoll.payElName = payRoll['payElID.printName'] || payRoll['payElID.name']

    if (payRoll.orderDate) {
      payRoll.orderDate = dateService.formatDate(dateService.shiftDate(payRoll.orderDate), 'dd.mm.yyyy')
    }
  }
  const payRollDtData = UB.Repository('hr_payRollDt')
    .attrs('ID', 'employeeNumberID.personalAccount', 'employeeNumberID.tabNum', 'employeeNumberID.employeeID.fullFIO', 'employeeNumberID.employeeID.taxCode',
      'paySum', 'paidSum', 'depSum', 'payRetentionID', 'employeePayOutID', 'payOutID', 'payOutID.name', 'payOutID.contractorID.description',
      'payRetentionID.payOutID.name', 'payRetentionID.payOutID', 'employeePayOutID.payOutID.name', 'employeePayOutID.payOutID', 'paymentDt', 'dopTaxSum'
    )
    .where('payRollID', '=', params.instanceID)
    .where('paySum', '>', 0)
    .orderBy('employeeNumberID.tabNumSort')
    .selectAsObject({
      'employeeNumberID.tabNum': 'tabNum',
      'employeeNumberID.personalAccount': 'personalAccount',
      'employeeNumberID.employeeID.fullFIO': 'fullFIO',
      'employeeNumberID.employeeID.taxCode': 'taxCode'
    })
  let data = []
  let allPaymentDt = []
  payRollDtData.forEach(el => {
    el.payOutIDValue = el.payOutID || el['payRetentionID.payOutID'] || el['employeePayOutID.payOutID']
    el.payOutNameValue = el['payOutID.name'] || el['payRetentionID.payOutID.name'] || el['employeePayOutID.payOutID.name']
    let paymentDt = JSON.parse(el.paymentDt)
    let payOutData = data.find(d => d.payOutID === el.payOutIDValue)
    if (!payOutData) {
      let payOut = UB.Repository('hr_payOut').attrs('ID', 'contractorID.description').selectById(el.payOutIDValue)
      data.push({
        payOutID: el.payOutIDValue,
        payOutName: el.payOutNameValue,
        contractorDesc: (payOut && payOut['contractorID.description']) || '',
        payRollDtSum: el.paySum,
        paymentDt: [],
        paymentDtSum: 0,
        dopTaxAllSum: el.dopTaxSum || 0,
        payRollDtList: [el]
      })
      payOutData = data.find(d => d.payOutID === el.payOutIDValue)
    } else {
      payOutData.payRollDtList.push(el)
      payOutData.payRollDtSum += el.paySum
      payOutData.dopTaxAllSum += el.dopTaxSum
    }
    paymentDt.forEach(payment => {
      let paymentDtList = payOutData.paymentDt.find(pay => pay.payObligatoryID === payment.payObligatoryID && pay.contrAccountName === payment['contrAccountID.organizationID.name'])
      if (!paymentDtList) {
        payment.payObligatoryName = payment['payObligatoryID.name']
        payment.contrAccountName = payment['contrAccountID.organizationID.name']
        payOutData.paymentDt.push(payment)
      } else {
        paymentDtList.paySum += payment.paySum
      }
      payOutData.paymentDtSum += payment.paySum

      let allPaymentDtList = allPaymentDt.find(pay => pay.payObligatoryID === payment.payObligatoryID)
      if (!allPaymentDtList) {
        payment.payObligatoryName = payment['payObligatoryID.name']
        payment.contrAccountName = payment['contrAccountID.organizationID.name']
        allPaymentDt.push(payment)
      } else {
        allPaymentDtList.paySum += payment.paySum
      }
    })
  })

  let allPaymentDtSum = 0
  let allPayRollDtSum = 0
  let allSumToRecount = 0
  let allDopTaxSum = 0
  let allSum = 0
  data.map(el => {
    el.blockSumToRecount = el.paymentDtSum + el.payRollDtSum
    el.blockSum = el.blockSumToRecount + el.dopTaxAllSum
    allPaymentDtSum += el.paymentDtSum
    allPayRollDtSum += el.payRollDtSum
    allSumToRecount += el.blockSumToRecount
    allDopTaxSum += el.dopTaxAllSum
    allSum += el.blockSum
    return el
  })

  return Object.assign(payRoll, {
    data,
    paymentMethod: payRoll.paymentMethod === '1' ? 'До перерахунку на карткові рахунки' : 'До виплати',
    allPayRollDtSum,
    allPaymentDtSum,
    allPaymentDt,
    allSumToRecount,
    allDopTaxSum,
    allSum
  })
}

function getDataPayFormFSS (params) {
  let orderDay, orderMonth, orderYear
  let respPersonFSS = {}
  const payRollDataFSS = getPayRollDataFSS(params)
  const orderDate = payRollDataFSS.orderDate ? dateService.formatDate(dateService.shiftDate(payRollDataFSS.orderDate), 'dd mmm yyyy') : ''
  const store = UB.DataStore('hr_payRoll')
  const SQL = getFSSSQL()
  store.runSQL(SQL, params)
  const accrualDataFSS = JSON.parse(store.asJSONObject)
  if (payRollDataFSS) {
    respPersonFSS = getRespPerson(payRollDataFSS)
  }
  const { orgName, orderNumber, paymentDate, periodSalary } = payRollDataFSS
  const { mainChiefPosName, mainChiefFullFIO, accChiefPosName, accChiefFullFIO } = respPersonFSS
  const formattingStartDate = dateService.formatDate(dateService.shiftDate(new Date()), 'dd mmm yyyy')
  const formattingStartTime = dateService.formatDate(new Date(), 'hh:mm')
  const pageResult = getPagesFSS(accrualDataFSS)
  const { pages, pagesCounter } = pageResult
  const data = {
    formattingStartDate,
    formattingStartTime,
    mainChiefPosName,
    mainChiefFullFIO,
    accChiefPosName,
    accChiefFullFIO,
    isShowAccChief: accChiefFullFIO || accChiefPosName,
    payRollDataFSS,
    accrualDataFSS,
    respPersonFSS,
    pagesCounter,
    periodSalary,
    orderNumber,
    paymentDate,
    orderMonth,
    orderYear,
    orderDate,
    orderDay,
    orgName,
    pages
  }
  return Object.assign(data)
}

function getPagesFSS (data) {
  const pages = [{ pageNum: 1, listData: [] }]
  let listRowsCounterMax, listRowsCounterMaxLastPage
  let listRowsCounterFirstPage = 32
  let listRowsCounterPage = 34
  let rowIndex = 0
  let addRow = 0
  let dataRowsLength = 0
  let listRowsCounter = 0
  data.forEach(row => {
    row.sickDate = dateService.formatDate(row.sickDate, 'dd.mm.yyyy')
    listRowsCounterMax = rowIndex === 0 ? listRowsCounterFirstPage : listRowsCounterPage
    listRowsCounterMaxLastPage = listRowsCounterMax - 3
    row.periodSalaryName = dateService.formatDate(row.periodSalaryName, 'mm.yyyy')
    listRowsCounter = dataRowsLength + addRow
    if (row.fullFIO.length >= 40) {
      if (listRowsCounter < listRowsCounterMax - 3) {
        addRows(2)
      } else {
        pages[rowIndex].isPageBreak2 = true
        updatePages([row])
        return
      }
    } else if (row.fullFIO.length >= 25) {
      if (listRowsCounter < listRowsCounterMax - 2) {
        addRows(1)
      } else {
        pages[rowIndex].isPageBreak1 = true
        updatePages([row])
        return
      }
    }
    listRowsCounter = dataRowsLength + addRow
    if (listRowsCounter <= listRowsCounterMax) {
      dataRowsLength++
    } else {
      pages[rowIndex].isPageBreak = true
      updatePages([])
    }
    listRowsCounter = dataRowsLength + addRow
    if (listRowsCounter < listRowsCounterMax) {
      pages[rowIndex].listData.push(row)
    } else {
      pages[rowIndex].isPageBreak1 = true
      updatePages([row])
    }
    dataRowsLength = pages[rowIndex].listData.length
  })
  const lastDataIndex = (pages[pages.length - 1].pageNum) - 1
  const lastDataLength = pages[rowIndex].listData.length
  if (lastDataLength > listRowsCounterMaxLastPage) {
    if (lastDataLength === listRowsCounterMax) {
      pages[rowIndex].isPageBreak = true
    } else {
      const lastRow = pages[lastDataIndex].listData[lastDataLength - 1]
      pages[lastDataIndex].listData.pop()
      const pageBreakCounter = listRowsCounterMax - pages[lastDataIndex].listData.length
      switch (pageBreakCounter) {
        case 1:
          pages[rowIndex].isPageBreak1 = true
          break
        case 2:
          pages[rowIndex].isPageBreak2 = true
          break
        case 3:
          pages[rowIndex].isPageBreak3 = true
          break
        default:
          break
      }
      addNewData([lastRow])
    }
  }

  function updatePages (array) {
    pages[rowIndex].addRow = addRow
    pages[rowIndex].dataRowsLength = dataRowsLength
    addNewData(array)
  }

  function addRows (number) {
    const result = addRow + number
    addRow = result
  }

  function addNewData (data) {
    rowIndex++
    pages.push({ pageNum: rowIndex + 1, listData: data })
    addRow = 0
    dataRowsLength = 0
  }

  const pagesCounter = pages[pages.length - 1].pageNum
  return { pages, pagesCounter }
}

function getRespPerson (payRollData) {
  const respPerson = {}
  const orgRespPosition = UB.Repository('hr_orgRespPosition')
    .where('[organizationID]', '=', payRollData.organizationID)
    .where('[dateFrom]', '<=', dateService.shiftDate(payRollData.dateTo))
    .where('[dateTo]', '>=', dateService.shiftDate(payRollData.dateTo), 'dt1')
    .where('[dateTo]', 'isNull', undefined, 'dt2')
    .where('respPosition', 'in', ['mainChief', 'accChief'])
    .logic('([dt1] OR [dt2])')
    .attrs(['respPosition', 'positionID'])
    .misc({ __mip_recordhistory_all: true })
    .selectAsObject()
  orgRespPosition.forEach(resp => {
    const pos = UB.Repository('hr_employeePositionS')
      .where('[organizationID]', '=', payRollData.organizationID)
      .where('[dateFrom]', '<=', dateService.shiftDate(payRollData.dateTo))
      .where('[positionID]', '=', resp.positionID)
      .attrs(['employeeID.fullFIO', 'posName', 'employeeID', 'ID'])
      .orderByDesc('dateTo')
      .misc({ __mip_recordhistory_all: true })
      .limit(1)
      .selectSingle()
    const dataEx = pos ? UB.Repository('hr_dictTempExecution')
      .attrs(['employeePositionID.employeeID.fullFIO'])
      .where('employeePositionTempID', '=', pos.ID, 'w1')
      .where('employeePositionTempID.employeeID', '=', pos.employeeID, 'w2')
      .where('employeePositionTempID.positionID', '=', resp.positionID, 'w3')
      .logic('([w1] OR ([w2] and [w3]))')
      .where('organizationID', '=', payRollData.organizationID || 0)
      .where('dateFrom', '<=', dateService.shiftDate(payRollData.dateTo))
      .where('dateTo', '>=', dateService.shiftDate(payRollData.dateTo))
      .orderBy('numQueue')
      .limit(1)
      .selectSingle() : null
    let nameGen

    if (dataEx) {
      nameGen = UB.Repository('hr_position')
        .attrs(['nameGen'])
        .where('orgID', '=', payRollData.organizationID)
        .where('mi_data_id', '=', resp.positionID)
        .where('state', '=', 'ACTIVE')
        .misc({ __mip_recordhistory_all: true })
        .orderByDesc('mi_dateFrom')
        .selectScalar()
      const responsAbbr = UB.Repository('ac_settingsOrg')
        .attrs(['value'])
        .where('organizationID', '=', payRollData.organizationID)
        .where('[constantID.code]', '=', 'hrResponsAbbr')
        .selectScalar() || 'В.о.'
      if (nameGen) {
        nameGen = nameGen.toLowerCase()
      }
      pos.posName = (responsAbbr) + ' ' + (nameGen || pos.posName || '')
    }

    if (pos) {
      respPerson[`${resp.respPosition}PosName`] = pos.posName || ''
      respPerson[`${resp.respPosition}FullFIO`] = dataEx ? (dataEx['employeePositionID.employeeID.fullFIO']) : (pos['employeeID.fullFIO'] || '')
    }
  })
  return respPerson
}

function getPayRollDataFSS (params) {
  const data = UB.Repository('hr_payRoll')
    .attrs('organizationID', 'organizationID.name', 'orderDate', 'periodSalaryID.name',
      'orderNumber', 'paymentDate', 'periodCalcID.dateTo')
    .where('ID', '=', params.instanceID)
    .where('organizationID.state', '=', 'ACTIVE')
    .where('[organizationID.mi_dateFrom] <= [periodCalcID.dateTo]', 'custom')
    .orderByDesc('organizationID.mi_dateFrom')
    .selectSingle({
      'periodCalcID.dateTo': 'dateTo',
      'organizationID.name': 'orgName',
      'periodSalaryID.name': 'periodSalary'
    })
  return data
}

function getFSSSQL () {
  return `
  select 
   ROW_NUMBER() OVER(ORDER BY n1.tabNum) AS "rowNum",
    n1.tabNum "tabNum", --Таб.№
    e1.fullFIO "fullFIO",  --Прізвище І.Б.
    ps1.dateFrom "periodSalaryName", --Обліковий період
    CONCAT(COALESCE(drs1.seria, ''), drs1.orderNumber) "sickSeriaNumber", --Лікарняний лист - Номер
    drs1.orderDate "sickDate", --Лікарняний лист - Дата
    dir1.code "dictIllnessCode",
    a1.days "accPayDays", -- дні оплачені
    a1.days "accCalendarDays", -- дні календарні
    round(a1.baseSum, 2) "accBaseSum", -- Середній заробіток
    a1.rate "accRate", -- Відсоток оплати
    a1.paySum "accPaySum", -- сума лікарняного
    round(incomeTax.paySum * a1.paySum / rd1.baseSum, 2) "incomeTaxSum", -- розрахована сума ПДФО працівнику по лікарняному
    round(militaryTax.paySum * a1.paySum / rd1.baseSum, 2)  "militaryTaxSum", -- розрахована сума Військового збору працівника по лікарняному
    round(rd1.paySum * a1.paySum / rd1.baseSum, 2)  "payRollDtPaySum", --До виплати в Задаче - розрахована сума виплати працівнику по лікарняним
    round(socialTax.paySum * a1.paySum / rd1.baseSum, 2)  "socialTaxSum" -- розрахована сума ЕСВ працівнику
    from hr_accrual a1
    inner join hr_payEl pe1 on pe1.ID = a1.payElID
    inner join hr_employeeNumber n1 on n1.ID = a1.employeeNumberID
    inner join hr_employee e1 on e1.ID = n1.employeeID
    inner join hr_sicknessRequisAccrual ra1 on ra1.accrualID = a1.ID
    inner join hr_sicknessRequisDt sd1 on sd1.ID = ra1.sicknessRequisDtID AND sd1.mi_deleteDate >= '9999-12-31'
    inner join hr_sicknessRequis sr1 on sr1.ID = sd1.sicknessRequisID AND sr1.mi_deleteDate >= '9999-12-31'
    inner join hr_RollRequis rr1 on rr1.sicknessRequisID = sr1.ID
    inner join hr_payRoll pr1 on pr1.ID = rr1.payRollID AND pr1.mi_deleteDate >= '9999-12-31'
    inner join hr_payRollDt rd1 on rd1.payRollID = pr1.ID 
      AND rd1.employeeNumberID = a1.employeeNumberID 
      AND rd1.mi_deleteDate >= '9999-12-31'
      AND rd1.paySum > 0
    left join hr_docRegSickness drs1 on drs1.ID = a1.orderID AND drs1.mi_deleteDate >= '9999-12-31'
    left join hr_dictIllnessReason dir1 on dir1.ID = drs1.dictIllnessReasonID
    left join hr_dictPeriod ps1 on ps1.ID = a1.periodSalaryID and ps1.mi_deleteDate >= '9999-12-31'
    
    left join (
      select od1.employeeNumberID, sum(od1.paySum) paySum
      from hr_paymentOrderDt od1
      inner join hr_paymentOrder po1 on po1.ID = od1.paymentOrderID
      inner join hr_payObligatory ob1 on ob1.ID = po1.payObligatoryID
      where po1.payRollID = :instanceID:
        and ob1.type = '1' -- 1 - ПДФО
      group by od1.employeeNumberID
    ) incomeTax on incomeTax.employeeNumberID = a1.employeeNumberID
    left join (
      select od2.employeeNumberID, sum(od2.paySum) paySum
      from hr_paymentOrderDt od2
      inner join hr_paymentOrder po2 on po2.ID = od2.paymentOrderID
      inner join hr_payObligatory ob2 on ob2.ID = po2.payObligatoryID
      where po2.payRollID = :instanceID:
        and ob2.type = '2' -- 2 - Військовий збір
      group by od2.employeeNumberID
    ) militaryTax on militaryTax.employeeNumberID = a1.employeeNumberID
    left join (
      select od3.employeeNumberID, sum(od3.paySum) paySum
      from hr_paymentOrderDt od3
      inner join hr_paymentOrder po3 on po3.ID = od3.paymentOrderID
      inner join hr_payObligatory ob3 on ob3.ID = po3.payObligatoryID
      where po3.payRollID = :instanceID:
        and ob3.type = '3' -- 3 - ЄСВ
      group by od3.employeeNumberID
    ) socialTax on socialTax.employeeNumberID = a1.employeeNumberID
    where pr1.ID = :instanceID:
    order by tabNumSort,
    a1.periodSalary, a1.dateFrom`
}

function getDataPayForm53 (params) {
  let data = {}
  let orderDate,
    orderDay,
    orderMonth,
    orderYear

  const payRollData = UB.Repository('hr_payRoll')
    .attrs('description', 'organizationID', 'organizationID.name', 'organizationID.EDRPOUCode', 'departmentID.name',
      'periodCalcID.dateFrom', 'periodCalcID.dateTo', 'orderDate', 'periodSalaryID.dictMonthID.name', 'includeSubDep',
      'periodSalaryID.pYear', 'orderNumber', 'paymentMethod')
    .where('ID', '=', params.instanceID)
    .where('organizationID.state', '=', 'ACTIVE')
    .where('[organizationID.mi_dateFrom] <= [periodCalcID.dateTo]', 'custom')
    .orderByDesc('organizationID.mi_dateFrom')
    .selectSingle({
      'organizationID.EDRPOUCode': 'EDRPOUCode',
      'organizationID.name': 'orgName',
      'departmentID.name': 'depName',
      'periodCalcID.dateFrom': 'dateFrom',
      'periodCalcID.dateTo': 'dateTo',
      'periodSalaryID.dictMonthID.name': 'periodSalaryM',
      'periodSalaryID.pYear': 'periodSalaryY'
    })
  payRollData.depName = payRollData.depName ? `${payRollData.depName}${payRollData.includeSubDep ? ' (з підлеглими)' : ''}` : null
  let respPerson
  if (payRollData) {
    respPerson = _.keyBy(UB.Repository('ac_orgRespPerson')
      .attrs('emponstaffID.employeeID.fullFIO', 'responsiblePerson')
      .where('responsiblePerson', 'in', ['chief', 'accountantChief'])
      .where('organizationID', '=', payRollData.organizationID)
      .where('[dateFrom]', '<=', dateService.shiftDate(payRollData.dateTo))
      .orderByDesc('dateFrom')
      .selectAsObject(), 'responsiblePerson')

    payRollData.dateFrom = dateService.formatDate(payRollData.dateFrom)
    payRollData.dateTo = dateService.formatDate(payRollData.dateTo)

    if (payRollData.EDRPOUCode) {
      payRollData.EDRPOUCode.split('').forEach((item, i) => {
        payRollData[`code${i + 1}`] = item
      })
    }

    if (payRollData.orderDate) {
      orderDate = dateService.formatDate(dateService.shiftDate(payRollData.orderDate), 'dd.mmm.yyyy').split('.')
      orderDay = orderDate[0]
      orderMonth = orderDate[1]
      orderYear = orderDate[2]
    }
  }

  const payRollDtSumData = UB.Repository('hr_payRollDt')
    .attrs('sum([paySum])', 'sum([paidSum])', 'sum([depSum])')
    .where('payRollID', '=', params.instanceID)
    .selectSingle({
      'sum([paySum])': 'paySum',
      'sum([paidSum])': 'paidSum',
      'sum([depSum])': 'depSum'
    })

  if (payRollData.paymentMethod === '1') payRollDtSumData.paidSum = payRollDtSumData.paySum

  const paySumFull = currencyService.currencyShortToWordsUkr(payRollDtSumData['paySum'])
  Object.keys(payRollDtSumData).forEach(item => {
    payRollDtSumData[item] = payRollDtSumData[item] ? Number(payRollDtSumData[item]).toFixed(2) : ''
  })

  const payRollDtData = UB.Repository('hr_payRollDt')
    .attrs('row_number() over (order by [ID])', 'employeeNumberID.tabNum',
      'employeeNumberID.employeeID.fullFIO', 'paySum')
    .where('payRollID', '=', params.instanceID)
    .where('paySum', '>', 0)
    .selectAsObject({
      'row_number() over (order by [ID])': 'rowNum',
      'employeeNumberID.tabNum': 'tabNum',
      'employeeNumberID.employeeID.fullFIO': 'fullFIO'
    })

  payRollDtData.forEach(item => {
    item.paySum = item.paySum ? item.paySum.toFixed(2) : '0.00'
  })

  return Object.assign(data,
    payRollData,
    payRollDtSumData,
    {
      orderDay,
      orderMonth,
      orderYear,
      showOrderDay: !!orderDay,
      chief: respPerson && respPerson['chief'] ? respPerson['chief']['emponstaffID.employeeID.fullFIO'] : '',
      accountantChief: respPerson && respPerson['accountantChief'] ? respPerson['accountantChief']['emponstaffID.employeeID.fullFIO'] : '',
      paySumFull,
      payRollDt: payRollDtData,
      isPayMethod2: payRollData.paymentMethod === '2'
    })
}
