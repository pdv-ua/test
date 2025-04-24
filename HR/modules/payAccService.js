const UB = require('@unitybase/ub')
const settingsService = require('../../AC/modules/entityServices/settingsService')
const dateService = require('../../AC/modules/dataServices/dateService')
const glCore = require('../../GL/modules/glCore')
const accrualService = require('../../HR/modules/accrualService')
const algorithmService = require('../../HR/modules/algorithmService')
const entityBaseService = require('../../AC/modules/entityServices/entityBaseService')
const payRollService = require('../../HR/modules/payRollService')
module.exports = {
  exportToAcc,
  cancelExportToAcc,
  checkAccDocument,
  getTimeByPeriod,
  getSumByPeriod
}

/**
 * Експорт платіжок в бухгалтерію
 * @param payRollID ID
 */
function exportToAcc (payRollID) {
  const coa = glCore.getCOA()
  const payRoll = UB.Repository('hr_payRoll')
    .attrs(['ID', 'organizationID', 'paymentMethod.name', 'description', 'orderNumber', 'orderDate',
      'payElID.methodID.code', 'payOutID', 'payOutID.orgAccountID', 'payOutID.contractorID', 'payOutID.contractorID.OKPOCode',
      'payOutID.contractorID.orgBusinessTypeID.isGovAuthority', 'payOutID.contrAccountID', 'periodSalaryID.dateFrom'])
    .selectById(payRollID) || {}
  const organizationID = payRoll.organizationID
  if (global['sia_docBasePayRoll'] && settingsService.get('hrExportPayRollToAccounting', organizationID, null)) {
    const entityName = `sia_docBasePayRoll`
    if (UB.Repository(entityName).attrs(['ID']).where('docIntegrationID', '=', payRollID).selectScalar()) {
      throw new UB.UBAbort(`<<<${UB.i18n('Дані документу {0} (ID: {1}) вже існують у системі.', payRoll.description, payRollID)}`)
    }
    const hrEntryOrgDepSinkPosition = settingsService.getByCode('hrEntryOrgDepSinkPosition', organizationID)
    const hrProgClassAcc = settingsService.getByCode('hrProgClassAcc', organizationID)
    const fundSources = UB.Repository('ac_fundSource').attrs(['ID', 'name']).selectAsObject()
    let dictFundSources = []
    if (hrEntryOrgDepSinkPosition) {
      const treePath = UB.Repository('hr_organization')
        .attrs('mi_treePath')
        .where('mi_data_id', '=', organizationID)
        .where('state', '=', 'ACTIVE')
        .limit(1)
        .selectScalar()
      dictFundSources = UB.Repository('ac_dictFundSource').attrs(['ID', 'fundSourceID', 'dictProgClassID']).where('organizationID', 'in', treePath ? treePath.split('/').map(o => Number(o)) : [organizationID]).where('fundSourceID', 'isNotNull').selectAsObject()
    } else {
      dictFundSources = UB.Repository('ac_dictFundSource').attrs(['ID', 'fundSourceID', 'dictProgClassID']).where('organizationID', '=', organizationID).where('fundSourceID', 'isNotNull').selectAsObject()
    }

    /* const dictFundSources = UB.Repository('ac_dictFundSource').attrs(['ID', 'fundSourceID', 'dictProgClassID.code']).where('organizationID', '=', organizationID).selectAsObject()
    const fundSources = UB.Repository('ac_fundSource').attrs(['ID', 'name']).selectAsObject() */
    const payOut = payRollService.getPayOutList(organizationID, ['ID', 'orgAccountID', 'contractorID', 'contractorID.OKPOCode',
      'contractorID.orgBusinessTypeID.isGovAuthority', 'contrAccountID', 'isDefault', 'organizationID'], {})
    const payOutDef = payOut.find(o => o.isDefault && o.organizationID === organizationID) || payOut.find(o => o.isDefault) || {}

    const respEmployeeID = UB.Session.uData.hrEmployeeID || null
    const payObligatorys = UB.Repository('hr_payObligatory')
      .attrs(['ID', 'organizationID', 'orgAccountID', 'contractorID', 'contrAccountID', 'type',
        'contractorID.OKPOCode', 'contractorID.orgBusinessTypeID.isGovAuthority', 'name' ])
      .selectAsObject()

    const paymentOrderAccDt = UB.Repository('hr_paymentOrderAccDt').attrs(['*', 'paymentOrderID.payObligatoryID',
      'paymentOrderID.contrAccountID', 'paymentOrderID.contrAccountID.organizationID',
      'paymentOrderID.contrAccountID.organizationID.orgBusinessTypeID.isGovAuthority', 'paymentOrderID.contrAccountID.organizationID.OKPOCode'
    ])
      .where('paymentOrderID.payRollID', '=', payRollID)
      .orderBy('paymentOrderID.payObligatoryID')
      .orderBy('paymentOrderID.contrAccountID')
      .selectAsObject({
        'paymentOrderID.contrAccountID.organizationID.orgBusinessTypeID.isGovAuthority': 'isGovAuthority',
        'paymentOrderID.contrAccountID.organizationID.OKPOCode': 'OKPOCode'

      })

    const operationKinds = UB.Repository('gl_operationKind')
      .attrs(['ID', 'code', 'name'])
      .where('docClass.entityName', '=', 'sia_docBasePayRoll')
      .selectAsObject()
    const operationKindIDs = operationKinds.map(o => o.ID)
    const defaultAccounts = operationKindIDs.length ? UB.Repository('ac_operationAccount')
      .attrs(['operationKindID', 'accountID'])
      .where('operationKindID', 'in', operationKindIDs)
      .where('attrID.attrName', '=', 'accountID')
      .selectAsObject() : []
    const docBasePayRoll = []
    const resultPayObligatory = {}
    paymentOrderAccDt.forEach(row => {
      const payObligatoryID = `${row['paymentOrderID.payObligatoryID']}_${row['paymentOrderID.contrAccountID']}`
      if (!resultPayObligatory[payObligatoryID]) {
        resultPayObligatory[payObligatoryID] = {
          payObligatoryID: row['paymentOrderID.payObligatoryID'],
          contractorID: row['paymentOrderID.contrAccountID.organizationID'],
          contrAccountID: row['paymentOrderID.contrAccountID'],
          isGovAuthority: row.isGovAuthority,
          OKPOCode: row.OKPOCode,
          detail: []
        }
      }
      const payObligatory = payObligatorys.find(o => o.ID === row['paymentOrderID.payObligatoryID'])
      const operationKind = payObligatory.type === '1' ? '7' : (payObligatory.type === '3' ? '8' : (payObligatory.type === '2' ? '9' : null))
      if (!operationKind) {
        throw new UB.UBAbort(`<<<${UB.i18n('Передача платіжної відомості у бухгалтерію.\nВ довіднику "Обов\'язкові платежі" не заповнено тип платежу, для {0}', payObligatory.name)}>>>`)
      }
      const operKind = operationKinds.find(o => o.code === operationKind) || {}
      const defaultAccount = defaultAccounts.find(o => o.operationKindID === operKind.ID)
      const dictFundSource = row.dictFundSourceID ? dictFundSources.find(o => o.fundSourceID === row.dictFundSourceID && (!hrProgClassAcc || o.dictProgClassID === row.dictProgClassID)) : null
      if (row.dictFundSourceID && !dictFundSource) {
        throw new UB.UBAbort(`<<<${UB.i18n('Передача платіжної відомості у бухгалтерію. Не знайдено відповідність джерела фінансування "{0}" в довіднику джерел фінансування бухгалтерії.', fundSources.find(o => o.ID === row.dictFundSourceID).name)}>>>`)
      }
      row.dictFundSourceID = dictFundSource ? dictFundSource.ID : null
      const payDoc = {
        accountID: null,
        dictFundSourceID: row.dictFundSourceID || null,
        totalSum: row.paySum
      }
      if (defaultAccount) {
        payDoc.accountID = defaultAccount.accountID
        const accountKt = coa.byId[defaultAccount.accountID]
        accountKt.dims.forEach((dim, idx) => {
          payDoc[`d${idx}`] = dim.ID
          let isSetValue = false
          for (let i = 0; i < 10; i++) {
            if (row[`d${i}`] && row[`d${i}`] === dim.ID && row[`d${i}Value`]) {
              payDoc[`d${idx}Value`] = row[`d${i}Value`]
              isSetValue = true
              return
            }
          }
          if (!isSetValue) {
            payDoc[`d${idx}Value`] = null
          }
        })
      }

      let addPay = true
      resultPayObligatory[payObligatoryID].detail.forEach(pay => {
        if (addPay && pay.accountID === payDoc.accountID && pay.dictFundSourceID === payDoc.dictFundSourceID) {
          let add = true
          for (let i = 0; i < 10; i++) {
            if (pay[`d${i}`] !== payDoc[`d${i}`] || pay[`d${i}Value`] !== payDoc[`d${i}Value`]) {
              add = false
            }
          }
          if (add) {
            pay.totalSum = accrualService.round(pay.totalSum + payDoc.totalSum)
            addPay = false
          }
        }
      })
      if (addPay) {
        resultPayObligatory[payObligatoryID].detail.push(payDoc)
      }
    })
    const resultPayRollDt = []
    const payRollDt = UB.Repository('hr_payRollDt')
      .attrs(['ID', 'payRetentionID', 'employeePayOutID', 'payOutID', 'paySum', 'accrualDt',
        'payRetentionID.payOutID', 'employeePayOutID.payOutID',
        'payOutID.orgAccountID', 'payOutID.contractorID', 'payOutID.contractorID.OKPOCode',
        'payOutID.contractorID.orgBusinessTypeID.isGovAuthority', 'payOutID.contrAccountID',
        'payRetentionID.payOutID.orgAccountID', 'payRetentionID.payOutID.contractorID', 'payRetentionID.payOutID.contractorID.OKPOCode',
        'payRetentionID.payOutID.contractorID.orgBusinessTypeID.isGovAuthority', 'payRetentionID.payOutID.contrAccountID',
        'employeePayOutID.payOutID.orgAccountID', 'employeePayOutID.payOutID.contractorID', 'employeePayOutID.payOutID.contractorID.OKPOCode',
        'employeePayOutID.payOutID.contractorID.orgBusinessTypeID.isGovAuthority', 'employeePayOutID.payOutID.contrAccountID'
      ])
      .where('payRollID', '=', payRollID)
      .selectAsObject()
    let payElOperationKind = '1'
    switch (payRoll['payElID.methodID.code']) {
      case '28':
        payElOperationKind = '1' // Виплата заробітної плати
        break
      case '29':
        payElOperationKind = '2' // Аванс
        break
      case '30':
        payElOperationKind = '3' // Виплата у міжрозрахунковий період
        break
      case '53':
        payElOperationKind = '4' // Виплата за рахунок СС
        break
      case '31':
        payElOperationKind = '5' // Алименты
        break
      case '61':
        payElOperationKind = '6' // Утримання за виконавчими листами
        break
      case '62':
        payElOperationKind = '10' // Перерахування за заявою працівника
        break
      case '75':
        payElOperationKind = '11' // Виплата за джерелом фінансування
        break
    }

    const payElOperKind = operationKinds.find(o => o.code === payElOperationKind) || {}
    const payElDefaultAccount = defaultAccounts.find(o => o.operationKindID === payElOperKind.ID)
    payRollDt.forEach(row => {
      if (row.paySum > 0) {
        const accrualDt = algorithmService.correctAccrualDt(row.accrualDt ? JSON.parse(row.accrualDt) : [{ paySum: row.paySum }], row.paySum)
        if (!accrualDt.length) {
          accrualDt.push({ paySum: row.paySum })
        }

        accrualDt.forEach(row => {
          const dictFundSource = row.dictFundSourceID ? dictFundSources.find(o => o.fundSourceID === row.dictFundSourceID) : null
          row.dictFundSourceID = dictFundSource ? dictFundSource.ID : null
          if (row.dictFundSourceID && !dictFundSource) {
            throw new UB.UBAbort(`<<<${UB.i18n('Передача платіжної відомості у бухгалтерію. Не знайдено відповідність джерела фінансування "{0}" в довіднику джерел фінансування бухгалтерії.', fundSources.find(o => o.ID === row.dictFundSourceID).name)}>>>`)
          }

          const payDoc = {
            accountID: null,
            dictFundSourceID: row.dictFundSourceID || null,
            totalSum: row.paySum,
            contractorID: row['payRetentionID.payOutID'] ? row['payRetentionID.payOutID.contractorID']
              : row['employeePayOutID.payOutID'] ? row['employeePayOutID.payOutID.contractorID']
                : row.payOutID ? row['payOutID.contractorID']
                  : payRoll.payOutID ? payRoll['payOutID.contractorID']
                    : payOutDef ? payOutDef.contractorID : null,
            orgAccountID: row['payRetentionID.payOutID'] ? row['payRetentionID.payOutID.orgAccountID']
              : row['employeePayOutID.payOutID'] ? row['employeePayOutID.payOutID.orgAccountID']
                : row.payOutID ? row['payOutID.orgAccountID']
                  : payRoll.payOutID ? payRoll['payOutID.orgAccountID']
                    : payOutDef ? payOutDef.orgAccountID : null,
            contrAccountID: row['payRetentionID.payOutID'] ? row['payRetentionID.payOutID.contrAccountID']
              : row['employeePayOutID.payOutID'] ? row['employeePayOutID.payOutID.contrAccountID']
                : row.payOutID ? row['payOutID.contrAccountID']
                  : payRoll.payOutID ? payRoll['payOutID.contrAccountID']
                    : payOutDef ? payOutDef.contrAccountID : null,
            isGovAuthority: row['payRetentionID.payOutID'] ? row['payRetentionID.payOutID.contractorID.orgBusinessTypeID.isGovAuthority']
              : row['employeePayOutID.payOutID'] ? row['employeePayOutID.payOutID.contractorID.orgBusinessTypeID.isGovAuthority']
                : row.payOutID ? row['payOutID.contractorID.orgBusinessTypeID.isGovAuthority']
                  : payRoll.payOutID ? payRoll['payOutID.contractorID.orgBusinessTypeID.isGovAuthority']
                    : payOutDef ? payOutDef['contractorID.orgBusinessTypeID.isGovAuthority'] : null,
            OKPOCode: row['payRetentionID.payOutID'] ? row['payRetentionID.payOutID.contractorID.OKPOCode']
              : row['employeePayOutID.payOutID'] ? row['employeePayOutID.payOutID.contractorID.OKPOCode']
                : row.payOutID ? row['payOutID.contractorID.OKPOCode']
                  : payRoll.payOutID ? payRoll['payOutID.contractorID.OKPOCode']
                    : payOutDef ? payOutDef['contractorID.OKPOCode'] : null

          }
          if (payElDefaultAccount) {
            payDoc.accountID = payElDefaultAccount.accountID
            const accountKt = coa.byId[payElDefaultAccount.accountID]
            accountKt.dims.forEach((dim, idx) => {
              payDoc[`d${idx}`] = dim.ID
              let isSetValue = false
              for (let i = 0; i < 10; i++) {
                if (row[`d${i}`] && row[`d${i}`] === dim.ID && row[`d${i}Value`]) {
                  payDoc[`d${idx}Value`] = row[`d${i}Value`]
                  isSetValue = true
                  return
                }
              }
              if (!isSetValue) {
                payDoc[`d${idx}Value`] = null
              }
            })
          }
          let addPay = true
          resultPayRollDt.forEach(pay => {
            if (addPay && pay.accountID === payDoc.accountID && pay.dictFundSourceID === payDoc.dictFundSourceID &&
              pay.contractorID === payDoc.contractorID && pay.orgAccountID === payDoc.orgAccountID &&
              pay.contrAccountID === payDoc.contrAccountID && pay.isGovAuthority === payDoc.isGovAuthority &&
              pay.OKPOCode === payDoc.OKPOCode) {
              let add = true
              for (let i = 0; i < 10; i++) {
                if (pay[`d${i}`] !== payDoc[`d${i}`] || pay[`d${i}Value`] !== payDoc[`d${i}Value`]) {
                  add = false
                }
              }
              if (add) {
                pay.totalSum = accrualService.round(pay.totalSum + payDoc.totalSum)
                addPay = false
              }
            }
          })
          if (addPay) {
            resultPayRollDt.push(payDoc)
          }
        })
      }
    })

    Object.keys(resultPayObligatory).forEach(payObligatoryID => {
      const payObligatory = payObligatorys.find(o => o.ID === resultPayObligatory[payObligatoryID].payObligatoryID)
      const operationKind = payObligatory.type === '1' ? '7' : (payObligatory.type === '3' ? '8' : (payObligatory.type === '2' ? '9' : null))
      if (!operationKind) {
        throw new UB.UBAbort(`<<<${UB.i18n('В довіднику "Обов\'язкові платежі" не заповнено тип платежу, для {0}', payObligatory.name)}>>>`)
      }
      const operKind = operationKinds.find(o => o.code === operationKind) || {}
      resultPayObligatory[payObligatoryID].detail.forEach(doc => {
        let purposePayment = ''
        const dictFundSource = doc.dictFundSourceID ? dictFundSources.find(o => o.ID === doc.dictFundSourceID) : {}
        if (resultPayObligatory[payObligatoryID].isGovAuthority) {
          purposePayment += (purposePayment !== '' ? ';' : '') + '*;101;' + resultPayObligatory[payObligatoryID].OKPOCode
        }
        if (dictFundSource['dictProgClassID.code']) {
          purposePayment += (purposePayment !== '' ? ';' : '') + (dictFundSource['dictProgClassID.code'] || '')
        }
        purposePayment += `${purposePayment !== '' ? ';' : ''} ${payRoll['description']}, ${payRoll['orderNumber']} від ${dateService.formatDate(payRoll['orderDate'])}`
        doc.docExNumber = payRoll.orderNumber
        doc.docExDate = payRoll.orderDate
        doc.docDate = payRoll.orderDate
        doc.organizationID = payRoll.organizationID
        doc.operationKindID = operKind.ID || null
        doc.docIntegrationID = payRollID
        doc.docName = `${operKind.name} від ${dateService.formatDate(payRoll['periodSalaryID.dateFrom'], 'dd.mm.yyyy')}`
        doc.posDescription = (payRoll.description || '').substring(0, 200)
        doc.purposePayment = purposePayment
        doc.docState = 'PROJECT'
        doc.respEmployeeID = respEmployeeID
        doc.contractorID = resultPayObligatory[payObligatoryID].contractorID
        doc.orgAccountID = payObligatory.orgAccountID
        doc.contrAccountID = resultPayObligatory[payObligatoryID].contrAccountID
        docBasePayRoll.push(doc)
      })
    })

    resultPayRollDt.forEach(doc => {
      let purposePayment = ''
      const dictFundSource = (doc.dictFundSourceID ? dictFundSources.find(o => o.ID === doc.dictFundSourceID) : {}) || {}
      if (doc.isGovAuthority) {
        purposePayment += (purposePayment !== '' ? ';' : '') + '*;101;' + (doc.OKPOCode || '')
      }
      if (dictFundSource['dictProgClassID.code']) {
        purposePayment += (purposePayment !== '' ? ';' : '') + (dictFundSource['dictProgClassID.code'] || '')
      }
      purposePayment += `${purposePayment !== '' ? ';' : ''} ${payRoll['description']}, ${payRoll['orderNumber']} від ${dateService.formatDate(payRoll['orderDate'])}`
      doc.docExNumber = payRoll.orderNumber
      doc.docExDate = payRoll.orderDate
      doc.docDate = payRoll.orderDate
      doc.organizationID = payRoll.organizationID
      doc.operationKindID = payElOperKind.ID || null
      doc.docIntegrationID = payRollID
      doc.docName = `${payElOperKind.name} від ${dateService.formatDate(payRoll['periodSalaryID.dateFrom'], 'dd.mm.yyyy')}`
      doc.posDescription = payRoll.description
      doc.purposePayment = purposePayment
      doc.docState = 'PROJECT'
      doc.respEmployeeID = respEmployeeID
      delete doc.isGovAuthority
      delete doc.OKPOCode
      docBasePayRoll.push(doc)
    })
    const storeEntity = UB.DataStore(entityName)
    docBasePayRoll.forEach(doc => {
      storeEntity.run('insert', {
        execParams: doc
      })
    })
  }
}

/**
 * Відміна експорту платіжок в бухгалтерію
 * @param payRollID
 */
function cancelExportToAcc (payRollID) {
  const organizationID = UB.Repository('hr_payRoll')
    .attrs(['organizationID'])
    .where('ID', '=', payRollID)
    .selectScalar() || null
  if (global['sia_docBasePayRoll'] && settingsService.get('hrExportPayRollToAccounting', organizationID, null)) {
    const entityName = 'sia_docBasePayRoll'
    const store = UB.DataStore(entityName)
    const data = UB.Repository(entityName).attrs(['ID', 'docState', 'docNumber', 'docDate']).where('docIntegrationID', '=', payRollID).selectAsObject()
    const errorMessages = []
    data.forEach(item => {
      if (item.docState !== 'PROJECT') {
        errorMessages.push(UB.i18n(`Документ {0} від {1} в стані проведений.`, item.docNumber, dateService.formatDate(item.docDate)))
      }
    })
    if (errorMessages.length) {
      throw new UB.UBAbort(`<<<${UB.i18n('Неможливо відкликати документ<br>{0}', errorMessages.join('<br>'))}>>>`)
    }
    data.forEach(item => {
      store.run('delete', {
        __skipOptimisticLock: true,
        execParams: {
          ID: item.ID
        }
      })
    })
  }
}

/**
 * Запит на їнформацію о документі в бухгалтерії
 * @param payRollID
 */
function checkAccDocument (payRollID) {
  if (global['sia_docBasePayRoll'] && settingsService.get('hrExportCfgFillPublicTotals', null, null)) {
    const docBasePayRoll = UB.Repository('sia_docPayOrderOut').attrs(['ID', 'docState', 'totalSum', 'docNumber', 'docDate'])
      .where('docIntegrationID', '=', payRollID).selectAsObject()

    return docBasePayRoll.map((docBase, index) => {
      const rec = {
        ID: docBase.ID,
        recNumber: index + 1,
        docBaseNumber: docBase['docNumber'],
        docBaseDate: docBase['docDate'],
        docPayOrderNumber: null,
        docPayOrderDate: null,
        actualPaymentDate: null
      }
      const docPayOrderOut = UB.Repository('sia_docPayOrderOut').attrs(['ID', 'docState', 'totalSum', 'docNumber', 'docDate', 'actualPaymentDate'])
        .where('docBasePayRollID', '=', docBase.ID).limit(1).selectSingle()
      if (docBase.docState === 'PROJECT') {
        rec.description = 'Документ-підстава не проведено'
      } else {
        if (!docPayOrderOut) {
          rec.description = 'Платіжна інструкція не створена'
        } else {
          rec.docPayOrderNumber = docPayOrderOut['docNumber']
          rec.docPayOrderDate = docPayOrderOut['docDate']
          rec.actualPaymentDate = docPayOrderOut['actualPaymentDate']
          if (docPayOrderOut.docState === 'PROJECT') {
            rec.description = 'Платіжна інструкція не проведена'
          } else {
            if (docPayOrderOut.totalSum !== docBase.totalSum) {
              rec.description = 'Сума Платіжного доручення не співпадає із сумою зв\'язаного Документа-підстави (відомість)'
            } else {
              rec.description = 'Платіжного доручення створено та проведено'
            }
          }
        }
      }
      return rec
    })
  }
}
function getTimeByPeriod ({ orgID, dateFrom, dateTo, departments = [], dictStaffCats = [], withChild = 1 }) {
  let store = UB.DataStore('tim_timeSheet')
  const SQL = `
  SELECT 
    ep.departmentID AS "departmentID", c.code, d.mi_treePath AS "mi_treePath",
    SUM(CASE WHEN t.factHour > 0 THEN factHour ELSE 0 END) AS "hour"
   FROM tim_timeSheet t
   JOIN hr_dictTimeCost tc ON tc.ID = t.factTimeCostID
   JOIN hr_employeeNumber n ON n.ID = t.employeeNumberID
   LEFT JOIN hr_employeePosition ep ON ep.employeeNumberID = n.ID AND ep.dateFrom <= t.dateWork AND ep.dateTo >= t.dateWork AND ep.isActive = 1 AND ep.mi_deleteDate >= '9999-12-31' 
   LEFT JOIN hr_department d ON d.mi_data_id = ep.departmentID AND t.dateWork between d.mi_dateFrom AND d.mi_dateTo AND d.mi_deleteDate >= '9999-12-31' AND d.state = 'ACTIVE' 
   LEFT JOIN hr_position p ON p.mi_data_id = ep.positionID AND t.dateWork between p.mi_dateFrom AND p.mi_dateTo AND p.mi_deleteDate >= '9999-12-31' AND p.state = 'ACTIVE' 
   LEFT JOIN hr_dictStaffCat c ON c.ID = p.dictStaffCatID AND c.mi_deleteDate >= '9999-12-31'
   WHERE t.dateWork >= :dateFrom: AND t.dateWork <= :dateTo:
   AND n.orgID = :orgID: and n.mi_deleteDate >= '9999-12-31'
   AND tc.timeCostType = 'WORK' AND t.isActive = 1 AND t.mi_deleteDate >= '9999-12-31'
   GROUP BY ep.departmentID, c.code, d.mi_treePath
   ORDER BY d.mi_treePath
`
  store.runSQL(SQL, {
    orgID,
    dateFrom: dateService.shiftDate(dateFrom),
    dateTo: dateService.shiftDate(dateTo)
  })
  const data = store.getAsJsObject().filter(item => {
    return (!departments.length || departments.includes(item.departmentID)) && (!dictStaffCats.length || dictStaffCats.includes(item.code))
  })

  if (withChild) {
    data.forEach(row => {
      row.hour = data.reduce((res, item) => {
        if (item.code === row.code && item.mi_treePath && item.mi_treePath.indexOf(row.mi_treePath) >= 0) {
          res = accrualService.round(res + item.hour, 4)
        }
        return res
      }, 0)
    })
  }
  return data
}

function getSumByPeriod ({ orgID, typePeriod = 1, dateFrom, dateTo, departments, dictStaffCats, withChild }) {
  let store = UB.DataStore('hr_accrual')
  const sqlDialect = entityBaseService.getSQLDialect()
  store.runSQL(` 
                 SELECT ep.departmentID AS "departmentID", d.mi_treePath AS "mi_treePath", c.code, a.payElID AS "payElID", pe.name AS "payELName",
                 SUM(adt.paySum) AS "paySum", s.ID AS "dictFundSourceID"
                 FROM hr_accrual a
                 JOIN hr_dictPeriod dp ON dp.ID = ${typePeriod === 1 ? 'a.periodCalcID' : 'a.periodSalaryID'} AND dp.orgID = :orgID:
                 JOIN hr_employeeNumber n ON n.ID = a.employeeNumberID AND n.orgID = :orgID: and n.mi_deleteDate >= '9999-12-31'
                 JOIN hr_payEl pe ON pe.ID = a.payElID 
                 JOIN hr_method m ON m.ID = pe.methodID
                 JOIN hr_methodGroup mg ON mg.ID = m.methodGroupID AND mg.groupType = 'PAYMENT'
                 LEFT JOIN hr_employeePosition ep ON ep.employeeNumberID = n.ID AND ep.isActive = 1
                       AND ep.ID = (SELECT ${sqlDialect.top} ep2.ID FROM hr_employeePosition ep2
                       WHERE ep2.employeeNumberID = ep.employeeNumberID AND ep2.isActive = 1 AND ep2.mi_deleteDate >= '9999-12-31' 
                       AND ep2.dateFrom <= dp.dateTo ORDER by ep2.dateFrom desc ${sqlDialect.limit})
                  LEFT JOIN hr_department d ON d.mi_data_id = ep.departmentID AND d.state = 'ACTIVE' AND d.mi_deleteDate >= '9999-12-31'
                       AND d.ID = (SELECT ${sqlDialect.top} d2.ID FROM hr_department d2
                       WHERE d2.mi_data_id = ep.departmentID AND d2.state = 'ACTIVE' AND d2.mi_deleteDate >= '9999-12-31' 
                       AND d2.mi_dateFrom <= dp.dateTo ORDER by d2.mi_dateFrom desc ${sqlDialect.limit})
                 LEFT JOIN hr_position p ON p.mi_data_id = ep.positionID AND p.state = 'ACTIVE' AND p.mi_deleteDate >= '9999-12-31'
                       AND p.ID = (SELECT ${sqlDialect.top} p2.ID FROM hr_position p2
                       WHERE p2.mi_data_id = ep.positionID AND p2.state = 'ACTIVE' AND p2.mi_deleteDate >= '9999-12-31' 
                       AND p2.mi_dateFrom <= dp.dateTo ORDER by p2.mi_dateFrom desc ${sqlDialect.limit})
                 LEFT JOIN hr_dictStaffCat c ON c.ID = p.dictStaffCatID AND c.mi_deleteDate >= '9999-12-31'
                 LEFT JOIN hr_accrualDt adt ON adt.accrualID = a.ID
                 LEFT JOIN ac_dictFundSource s ON s.fundSourceID = adt.dictFundSourceID and s.organizationID = :orgID: and s.mi_deleteDate >= '9999-12-31'
                 WHERE a.orgID = :orgID: AND dp.dateTo >= :dateFrom: AND dp.dateFrom <= :dateTo: AND a.flagsRec & 8192 = 0
                 ${(departments && departments.length) ? ` AND ep.departmentID ${entityBaseService.getInExpression('departments')}` : ''}
                 ${(dictStaffCats && dictStaffCats.length) ? ` AND c.code ${entityBaseService.getInExpression('dictStaffCats')}` : ''}
                 GROUP BY ep.departmentID, d.mi_treePath, c.code, a.payElID, pe.name, s.ID
                 HAVING SUM(adt.paySum) <> 0
                 ORDER BY d.mi_treePath, c.code, pe.name`,
  {
    orgID,
    dateFrom: dateService.shiftDate(dateFrom),
    dateTo: dateService.shiftDate(dateTo),
    departments,
    dictStaffCats
  })
  const data = store.getAsJsObject()
  if (withChild) {
    data.forEach(row => {
      row.paySum = data.reduce((res, item) => {
        if (item.code === row.code && item.payElID === row.payElID && item.dictFundSourceID === row.dictFundSourceID && item.mi_treePath.indexOf(row.mi_treePath) >= 0) {
          res = accrualService.round(res + (item.paySum || 0))
        }
        return res
      }, 0)
    })
  }
  return data
}
