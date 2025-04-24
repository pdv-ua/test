const UB = require('@unitybase/ub')
const App = UB.App
const dateService = require('../../../AC/modules/dataServices/dateService')
const storeService = require('../../../AC/modules/entityServices/storeService')

module.exports = {
  importStudData
}

function toDate (dateStr) {
  if (typeof dateStr === 'string') {
    const p = dateStr.indexOf('+')
    return dateService.shiftDate(p === -1 ? dateStr : dateStr.substring(0, p))
  } else {
    return dateStr
  }
}

function importStudData (studentData, orgID, mode, params, dateFromStipend, type) {
  const store = UB.DataStore('hr_importStudentLog')
  const newID = store.generateID()
  const documentData = studentData.length ? storeService.writeJsonToDocument('hr_importStudentLog', 'document', `${newID}.json`, newID, studentData) : null
  store.run('insert', {
    execParams: {
      ID: newID,
      orgID: orgID,
      importDate: new Date(),
      params: JSON.stringify(params),
      result: null,
      type: type || null,
      resultMessage: UB.i18n('Завантажено {0} записів', studentData.length),
      document: documentData
    }
  })
  App.dbCommit()
  let result = {}
  let message = null
  if (mode === 'dismiss') {
    result = importDismissed(studentData, orgID)
    message = UB.i18n('Завантажено записів: {0}, закрито: {1}, записів з помилками: {2}', studentData.length, result.deleted.length, result.error.length)
  } else {
    result = importActive(studentData, orgID, params, dateFromStipend)
    message = UB.i18n('Завантажено записів: {0}, додано: {1}, оновлено: {2}, видалено: {3}, записів з помилками: {4}', studentData.length, result.inserted.length, result.updated.length, result.deleted.length, result.error.length)
  }
  store.run('update', {
    __skipOptimisticLock: true,
    execParams: {
      ID: newID,
      result: JSON.stringify(result),
      resultMessage: message
    }
  })
  App.dbCommit()
  return {
    instanceID: newID,
    recordCount: studentData.length
  }
}

function getDictionaryID (dict, value, attr = 'code') {
  const item = dict.find(o => o[attr] === value)
  return item ? item.ID : null
}

function importActive (importData, orgID, params = null, dateFromStipend) {
  const result = {
    inserted: [],
    updated: [],
    deleted: [],
    error: []
  }

  const db = App.dbConnections[App.domainInfo.entities.ubm_enum.connectionName]

  let empStore, empAddressStore, empDocStore, empNumStore, studEduKindStore, studEduHistStore, studGroupStore,
    studVacStore, typeStudyStore, educLevelStore, studStipendStore, typeStipendStore, empOrgStore, empChangeStore,
    empAccrualStore

  const empStudList = UB.Repository('hr_employeeNumberS')
    .attrs(['ID', 'tabNum', 'dateFrom', 'dateTo', 'employeeID'])
    .where('orgID', '=', orgID)
    .where('kind', '=', 'STUD')
    .selectAsObject()

  const countries = UB.Repository('cdn_country')
    .attrs('ID', 'name')
    .selectAsObject()
  const dictTypeStudy = UB.Repository('hr_dictTypeStudy')
    .attrs('ID', 'code')
    .selectAsObject()
  const dictStudGroup = UB.Repository('hr_dictStudGroup')
    .attrs('ID', 'code', 'departmentID')
    .selectAsObject()
  const dictTypeStipend = UB.Repository('hr_dictTypeStipend')
    .attrs('ID', 'code', 'name', 'orderN')
    .selectAsObject()
  const dictEducLevel = UB.Repository('hr_dictEducLevel')
    .attrs('ID', 'code')
    .selectAsObject()
  const dictStipendAmount = UB.Repository('hr_dictStipendAmount')
    .attrs('ID', 'dictTypeStipendID', 'dateFrom', 'dateTo', 'accrualSum', 'averageScoreMin', 'averageScoreMax', 'payElID')
    .where('orgID', '=', orgID)
    .selectAsObject()
  dictStipendAmount.forEach(row => {
    row.dateFrom = dateService.shiftDate(row.dateFrom)
    row.dateTo = dateService.shiftDate(row.dateTo)
  })

  const dictDocKindPassportID = UB.Repository('ac_dictDocKind')
    .attrs('ID')
    .where('docType', '=', '1')
    .orderBy('code')
    .selectScalar() || null
  const defCountryID = UB.Repository('cdn_country').attrs('ID').where('code', '=', 'UKR').selectScalar() || null

  const createStore = function () {
    empStore = UB.DataStore('hr_employee')
    empAddressStore = UB.DataStore('ac_address')
    empDocStore = UB.DataStore('hr_employeeDocs')
    empNumStore = UB.DataStore('hr_employeeNumber')
    studEduKindStore = UB.DataStore('hr_studEducationKind')
    studEduHistStore = UB.DataStore('hr_studEducationHistory')
    studGroupStore = UB.DataStore('hr_dictStudGroup')
    studVacStore = UB.DataStore('hr_empLongTermAbsc')
    typeStudyStore = UB.DataStore('hr_dictTypeStudy')
    educLevelStore = UB.DataStore('hr_dictEducLevel')
    studStipendStore = UB.DataStore('hr_studStipend')
    typeStipendStore = UB.DataStore('hr_dictTypeStipend')
    empOrgStore = UB.DataStore('ac_employeeOrg')
    empChangeStore = UB.DataStore('hr_employeeChange')
    empAccrualStore = UB.DataStore('hr_employeeAccrual')
  }

  const freeStore = function () {
    empStore && empStore.freeNative()
    empAddressStore && empAddressStore.freeNative()
    empDocStore && empDocStore.freeNative()
    empNumStore && empNumStore.freeNative()
    studEduKindStore && studEduKindStore.freeNative()
    studEduHistStore && studEduHistStore.freeNative()
    studGroupStore && studGroupStore.freeNative()
    studVacStore && studVacStore.freeNative()
    typeStudyStore && typeStudyStore.freeNative()
    educLevelStore && educLevelStore.freeNative()
    studStipendStore && studStipendStore.freeNative()
    typeStipendStore && typeStipendStore.freeNative()
    empOrgStore && empOrgStore.freeNative()
    empChangeStore && empChangeStore.freeNative()
    empAccrualStore && empAccrualStore.freeNative()
  }

  const getFullFIO = (row) => `${row.lastName || '?'} ${row.firstName || '?'}${row.middleName ? ' ' + row.middleName : ''}`
  const getShortFIO = (row) => `${row.lastName || '?'} ${(row.firstName || '?')[0].toUpperCase() + '.'}${row.middleName ? row.middleName[0].toUpperCase() + '.' : ''}`

  function processRow (row, idx, tabNum, employeeID, employeeNumberID, empStud) {
    const dateFrom = toDate(row['dateFormStudy'])

    let phoneMobile = row.phoneMobile || null
    let phoneWorking = row.phoneWorking || null
    let phoneHome = row.phoneHome || null
    let citizenshipID = row.citizenship ? getDictionaryID(countries, row.citizenship, 'name') : defCountryID
    if (row.phones && Array.isArray(row.phones)) {
      // Тип телефону. Можливі значення 1- домашній, 2-робочий, 3-мобільний
      const phH = row.phones.filter(o => String(o['phoneType']) === '1')
      const phW = row.phones.filter(o => String(o['phoneType']) === '2')
      const phM = row.phones.filter(o => String(o['phoneType']) === '3')
      phoneHome = phH.length ? phH.map(o => o['phoneNumber']).join(', ') : null
      phoneWorking = phW.length ? phW.map(o => o['phoneNumber']).join(', ') : null
      phoneMobile = phM.length ? phM.map(o => o['phoneNumber']).join(', ') : null
    } else if (row.phoneMobile) {
      phoneMobile = row.phoneMobile
    }
    const fullFIO = getFullFIO(row)
    const shortFIO = getShortFIO(row)
    const studGroup = row['group'] || '?'

    const empParams = {
      firstName: row.firstName,
      lastName: row.lastName,
      middleName: row.middleName,
      birthDate: toDate(row['birthdate'] || row['birthDate']) || null,
      sexType: row.sexType,
      fullFIO,
      shortFIO,
      email: row.email || null,
      phoneMobile,
      phoneWorking,
      phoneHome,
      citizenshipID
    }
    const attrs = [
      'firstName',
      'lastName',
      'middleName',
      'shortFIO',
      'fullFIO',
      'genName',
      'datName',
      'accusativeName',
      'insName',
      'locName',
      'vocName'
    ]
    attrs.forEach(item => {
      if (empParams[item]) {
        empParams[item] = empParams[item].trim().replace(/[«´»„“‘’'"`]/gi, `’`)
      }
    })
    const taxCode = row['taxCode'] || (row['docSeries'] && row['passNumber'] ? `${row['docSeries']}${row['passNumber']}` : (row['passNumber'] || null))
    const empTaxCodeType = row['taxCode'] ? (row['empTaxCodeType'] || 'TAXCODE') : (row['docSeries'] ? 'PASSPORT' : 'IDCARD')
    if (!employeeID) {
      if (!taxCode) {
        result.error.push({
          row: idx,
          message: UB.i18n('{0} {1} (Група {2}) - не заповнений параметр taxCode', fullFIO, tabNum, studGroup)
        })
        return
      }
      employeeID = UB.Repository('hr_employee')
        .attrs('ID')
        .where('taxCode', '=', taxCode)
        .whereIf(row.empTaxCodeType, 'empTaxCodeType', '=', empTaxCodeType)
        .selectScalar()
    }
    if (!employeeID) {
      employeeID = empStore.generateID()

      empParams.ID = employeeID
      empParams.taxCode = taxCode
      empParams.empTaxCodeType = empTaxCodeType || 'TAXCODE'
      empParams.organizationID = orgID

      empStore.run('insert', {
        execParams: empParams
      })
    } else {
      if (row['dateChangeName']) {
        const dateChangeName = toDate(row['dateChangeName'])
        const empCur = UB.Repository('hr_employee')
          .attrs('ID', 'firstName', 'lastName', 'middleName', 'shortFIO', 'fullFIO')
          .selectById(employeeID)
        if (empCur && (empCur['firstName'] !== empParams['firstName'] || empCur['lastName'] !== empParams['lastName'] || empCur['middleName'] !== empParams['middleName'])) {
          empChangeStore.run('insert', {
            studForm: true,
            execParams: {
              employeeID,
              orderDate: dateChangeName,
              organizationID: orgID,
              shortFIO: empParams['shortFIO'],
              fullFIO: empParams['fullFIO'],
              firstName: empParams['firstName'],
              lastName: empParams['lastName'],
              middleName: empParams['middleName'],
              shortFIOOld: empCur['shortFIO'],
              fullFIOOld: empCur['fullFIO'],
              firstNameOld: empCur['firstName'],
              lastNameOld: empCur['lastName'],
              middleNameOld: empCur['middleName']
            }
          })
        }
      }
      empParams.ID = employeeID
      empStore.run('update', {
        __skipOptimisticLock: true,
        execParams: empParams
      })
      result.updated.push({
        row: idx,
        message: UB.i18n('{0} {1} (Група {2})', fullFIO, tabNum, studGroup)
      })
    }
    const empOrg = UB.Repository('ac_employeeOrg')
      .attrs('ID')
      .where('employeeID', '=', employeeID)
      .where('organizationID', '=', orgID)
      .limit(1)
      .selectSingle()
    if (!empOrg) {
      empOrgStore.run('insert', {
        execParams: {
          employeeID,
          organizationID: orgID
        }
      })
    }
    if (!employeeNumberID && row.studentEd && row.tabNum) {
      const empByTabNum = UB.Repository('hr_employeeNumberS')
        .attrs('ID', 'dateTo')
        .where('orgID', '=', orgID)
        .where('employeeID', '=', employeeID)
        .where('tabNum', '=', String(row.tabNum))
        .limit(1)
        .selectSingle()
      if (empByTabNum) {
        employeeNumberID = empByTabNum.ID
        empNumStore.run('update', {
          __skipOptimisticLock: true,
          execParams: {
            ID: employeeNumberID,
            tabNum: String(row.studentEd),
            dateTo: dateService.maxDate()
          }
        })
      }
    }
    if (!employeeNumberID) {
      employeeNumberID = empNumStore.generateID()
      empNumStore.run('insert', {
        isImport: true,
        __skipSelectAfterInsert: true,
        __skipRls: true,
        __skipAclRls: true,
        execParams: {
          ID: employeeNumberID,
          employeeID,
          orgID: orgID,
          tabNum: tabNum,
          dateFrom,
          kind: 'STUD'
        }
      })
      result.inserted.push({
        row: idx,
        message: UB.i18n('{0} {1} (Група {2})', fullFIO, tabNum, studGroup)
      })
    } else if (empStud && !dateService.isMaxDate(empStud.dateTo)) {
      empNumStore.run('update', {
        __skipOptimisticLock: true,
        execParams: {
          ID: employeeNumberID,
          dateTo: dateService.maxDate()
        }
      })
    }
    if (row['address']) {
      const addr = UB.Repository('ac_address')
        .attrs('ID', 'address')
        .where('ownerID', '=', employeeID)
        .where('addressType', '=', '1')
        .limit(1)
        .selectSingle()
      if (!addr) {
        empAddressStore.run('insert', {
          execParams: {
            ownerID: employeeID,
            addressType: '1',
            countryID: defCountryID,
            address: row.address
          }
        })
      } else if (row['address'] !== addr['address']) {
        empAddressStore.run('update', {
          __skipOptimisticLock: true,
          execParams: {
            ID: addr.ID,
            address: row.address
          }
        })
      }
    }
    if (row['passNumber']) {
      const docIssuedDate = row['docIssuedDate'] ? toDate(row['docIssuedDate']) : null
      const docPassport = UB.Repository('hr_employeeDocs')
        .attrs('ID', 'docSeries', 'docNumber', 'docIssued', 'docIssuedDate', 'docValidUntil')
        .where('employeeID', '=', employeeID)
        .where('dictDocKindID', '=', dictDocKindPassportID)
        .where('docValidUntil', 'isNull', undefined, 'docValidNull')
        .where('docValidUntil', '>=', docIssuedDate || dateService.currentDate(), 'docValidTo')
        .where('docIssuedDate', '<=', docIssuedDate || dateService.currentDate(), 'docValidFrom')
        .logic('([docValidNull] OR ([docValidTo] AND [docValidFrom]))')
        .limit(1)
        .selectSingle()
      let isCreate = false
      if (docPassport) {
        if (docPassport['docNumber'] !== row['passNumber'] || docPassport['docSeries'] !== (row['docSeries'] || null)) {
          isCreate = true
          if (docIssuedDate) {
            const docValidUntilNew = dateService.addDays(docIssuedDate, -1)
            empDocStore.run('update', {
              __skipOptimisticLock: true,
              execParams: {
                ID: docPassport['ID'],
                docValidUntil: !docPassport['docIssuedDate'] || dateService.shiftDate(docPassport['docIssuedDate']) < docValidUntilNew ? docValidUntilNew : docPassport['docIssuedDate']
              }
            })
          }
        } else {
          if (docPassport['docIssued'] !== row['docIssued'] || (docIssuedDate && dateService.shiftDate(docPassport['docIssuedDate']).getTime() !== docIssuedDate.getTime())) {
            empDocStore.run('update', {
              __skipOptimisticLock: true,
              execParams: {
                ID: docPassport['ID'],
                docIssued: row['docIssued'],
                docIssuedDate: docIssuedDate
              }
            })
          }
        }
      } else {
        isCreate = true
      }
      if (isCreate) {
        empDocStore.run('insert', {
          execParams: {
            employeeID,
            dictDocKindID: dictDocKindPassportID,
            docSeries: row['docSeries'],
            docNumber: row['passNumber'],
            docIssued: row['docIssued'],
            docIssuedDate: docIssuedDate
          }
        })
      }
    }
    if (row['typeStudy']) {
      let typeStudyID = getDictionaryID(dictTypeStudy, String(row['typeStudy']))
      if (!typeStudyID) {
        typeStudyID = typeStudyStore.generateID()
        const newItem = {
          ID: typeStudyID,
          code: row['typeStudy'],
          name: row['typeStudy']
        }
        typeStudyStore.run('insert', {
          execParams: newItem
        })
        dictTypeStudy.push(newItem)
      }
      let levelID = row['level'] ? getDictionaryID(dictEducLevel, String(row['level'])) : null
      if (row['level'] && !levelID) {
        levelID = educLevelStore.generateID()
        const newItem = {
          ID: levelID,
          code: String(row['level']),
          name: String(row['level'])
        }
        educLevelStore.run('insert', {
          execParams: newItem
        })
        dictEducLevel.push(newItem)
      }
      if (typeStudyID) {
        const studEduKindItem = UB.Repository('hr_studEducationKind')
          .attrs('ID', 'typeStudy', 'formStudy', 'dictLevelID', 'dateFrom', 'dateTo')
          .where('employeeNumberID', '=', employeeNumberID)
          .where('dateFrom', '<=', dateFrom)
          .where('dateTo', '>=', dateFrom)
          .limit(1)
          .selectSingle()
        if (!studEduKindItem || studEduKindItem['typeStudy'] !== typeStudyID || studEduKindItem['formStudy'] !== row['formStudy'] || studEduKindItem['dictLevelID'] !== levelID) {
          if (studEduKindItem && dateService.shiftDate(studEduKindItem['dateFrom']).getTime() === dateFrom.getTime()) {
            studEduKindStore.run('update', {
              __skipOptimisticLock: true,
              execParams: {
                ID: studEduKindItem['ID'],
                tabNum: String(row.tabNum || row.studentEd),
                typeStudy: typeStudyID,
                formStudy: row['formStudy'],
                dictLevelID: levelID
              }
            })
          } else {
            const studKind = UB.Repository('hr_studEducationKind')
              .attrs('ID', 'dateFrom')
              .where('employeeNumberID', '=', employeeNumberID)
              .where('dateFrom', '<=', dateFrom, 'dateFrom')
              .where('dateTo', '>=', dateFrom, 'dateTo')
              .where('dateTo', '>=', '#maxdate', 'maxdate')
              .logic('(([dateFrom] AND [dateTo]) OR [maxdate])')
              .selectAsObject()
            const dateTo = dateService.addDays(dateFrom, -1)
            studKind.forEach(item => {
              studEduKindStore.run('update', {
                __skipOptimisticLock: true,
                execParams: {
                  ID: item.ID,
                  dateTo: dateService.shiftDate(item['dateFrom']) < dateTo ? dateTo : dateService.shiftDate(item['dateFrom'])
                }
              })
            })
            studEduKindStore.run('insert', {
              execParams: {
                employeeNumberID,
                employeeID,
                tabNum: String(row.tabNum || row.studentEd),
                dateFrom,
                typeStudy: typeStudyID,
                formStudy: row['formStudy'],
                dictLevelID: levelID
              }
            })
          }
        }
      }
    }
    if (row['group']) {
      const dateFromGroup = toDate(row['dateFromGroup']) || dateFrom
      let groupID = getDictionaryID(dictStudGroup, row['group'])
      if (!groupID) {
        groupID = studGroupStore.generateID()
        const newItem = {
          ID: groupID,
          code: row['group'],
          name: row['group']
        }
        studGroupStore.run('insert', {
          execParams: newItem
        })
        dictStudGroup.push(newItem)
      }
      const semester = Number(row['semester']) || null
      const groupItem = dictStudGroup.find(o => o.ID === groupID)
      const departmentID = groupItem ? (groupItem['departmentID'] || null) : null
      const studEduHistItem = UB.Repository('hr_studEducationHistory')
        .attrs('ID', 'dateFrom', 'dateTo', 'semester', 'groupID', 'departmentID')
        .where('employeeNumberID', '=', employeeNumberID)
        .where('dateFrom', '<=', dateFromGroup)
        .where('dateTo', '>=', dateFromGroup)
        .limit(1)
        .selectSingle()
      if (!studEduHistItem || studEduHistItem['groupID'] !== groupID || studEduHistItem['semester'] !== semester || studEduHistItem['departmentID'] !== departmentID) {
        if (studEduHistItem && dateService.shiftDate(studEduHistItem).getTime() === dateFromGroup.getTime()) {
          studEduHistStore.run('update', {
            __skipOptimisticLock: true,
            execParams: {
              ID: studEduHistItem['ID'],
              semester,
              groupID,
              departmentID
            }
          })
        } else {
          const dateTo = dateService.addDays(dateFromGroup, -1)
          const studGroup = UB.Repository('hr_studEducationHistory')
            .attrs('ID', 'dateFrom')
            .where('employeeNumberID', '=', employeeNumberID)
            .where('dateFrom', '<=', dateFromGroup, 'dateFrom')
            .where('dateTo', '>=', dateFromGroup, 'dateTo')
            .where('dateTo', '>=', '#maxdate', 'maxdate')
            .logic('(([dateFrom] AND [dateTo]) OR [maxdate])')
            .selectAsObject()
          studGroup.forEach(item => {
            studEduHistStore.run('update', {
              __skipOptimisticLock: true,
              execParams: {
                ID: item.ID,
                dateTo: dateService.shiftDate(item['dateFrom']) < dateTo ? dateTo : dateService.shiftDate(item['dateFrom'])
              }
            })
          })
          studEduHistStore.run('insert', {
            execParams: {
              employeeNumberID,
              employeeID,
              groupID,
              dateFrom: dateFromGroup,
              semester,
              departmentID
            }
          })
        }
      } else if (!dateService.isMaxDate(studEduHistItem.dateTo)) {
        studEduHistStore.run('update', {
          __skipOptimisticLock: true,
          execParams: {
            ID: studEduHistItem.ID,
            dateTo: dateService.maxDate()
          }
        })
      }
    }
    if (row['scholarschips'] && Array.isArray(row['scholarschips']) && row['scholarschips'].length > 1) {
      // check and create typeStipend
      row['scholarschips'].forEach(item => {
        const typeStipend = item['typeStipend'] ? String(item['typeStipend']) : null
        const nameStipend = item['nameStipend'] ? String(item['nameStipend']).trim() : null
        if (typeStipend && nameStipend) {
          let typeStipendID = null
          const dictTypeStipendItem = dictTypeStipend.find(o => o.code === typeStipend && o.name === nameStipend)
          typeStipendID = dictTypeStipendItem ? dictTypeStipendItem.ID : null
          if (!typeStipendID) {
            typeStipendID = typeStipendStore.generateID()
            const newItem = {
              ID: typeStipendID,
              code: typeStipend,
              name: nameStipend
            }
            typeStipendStore.run('insert', {
              execParams: newItem
            })
            newItem.orderN = UB.Repository('hr_dictTypeStipend').attrs('orderN').where('ID', '=', typeStipendID).selectScalar() || 0
            dictTypeStipend.push(newItem)
            item.typeStipendID = typeStipendID
            item.orderN = newItem.orderN
            result.error.push({
              row: idx,
              message: UB.i18n('{0} {1} (Група {2}) - вказаний тип стипендії {3} "{4}" не знайдено в довіднику', fullFIO, tabNum, studGroup, typeStipend, nameStipend)
            })
          } else {
            item.typeStipendID = typeStipendID
            item.orderN = dictTypeStipendItem.orderN || 0
          }
        } else {
          result.error.push({
            row: idx,
            message: UB.i18n('{0} {1} (Група {2}) - не вказано тип або назву стипендії', fullFIO, tabNum, studGroup)
          })
        }
      })
      row['scholarschips'].sort((a, b) => a.orderN - b.orderN)
      const studStipend = UB.Repository('hr_studStipend')
        .attrs('ID', 'dateFrom')
        .where('employeeNumberID', '=', employeeNumberID)
        .where('dateFrom', '<=', dateFromStipend)
        .where('dateTo', '>=', dateFromStipend)
        .selectAsObject()
      studStipend.forEach((item, idx) => {
        if (dateService.shiftDate(item.dateFrom).getTime() !== dateFromStipend.getTime() || idx > 0) {
          studStipendStore.run('update', {
            __skipOptimisticLock: true,
            execParams: {
              ID: item['ID'],
              dateTo: dateService.shiftDate(item.dateFrom) < dateFromStipend ? dateService.addDays(dateFromStipend, -1) : dateService.shiftDate(item.dateFrom)
            }
          })
        }
      })
      row['scholarschips'].forEach((item, idx) => {
        if (item.typeStipendID) {
          const stipendAmountItem = dictStipendAmount.find(o => o.dictTypeStipendID === item.typeStipendID && o.dateFrom <= dateFromStipend && dateFromStipend <= o.dateTo)
          const sumStipend = stipendAmountItem ? (stipendAmountItem['accrualSum'] || 0) : 0

          const studStipendItem = UB.Repository('hr_studStipend')
            .attrs('ID', 'sumStipend', 'averageScore', 'dateFrom', 'dateTo', 'typeStipend')
            .where('employeeNumberID', '=', employeeNumberID)
            .where('dateFrom', '<=', dateFromStipend)
            .where('dateTo', '>=', dateFromStipend)
            .where('typeStipend', '=', item.typeStipendID)
            .where('[dateFrom]<>[dateTo]', 'custom')
            .limit(1)
            .selectSingle()
          if (!studStipendItem || sumStipend !== studStipendItem['sumStipend']) {
            if (studStipendItem && dateService.shiftDate(studStipendItem['dateFrom']).getTime() === dateFromStipend.getTime()) {
              studStipendStore.run('update', {
                __skipOptimisticLock: true,
                execParams: {
                  ID: studStipendItem.ID,
                  typeStipend: item.typeStipendID,
                  averageScore: row['averageScore'],
                  sumStipend
                }
              })
            } else {
              let employeeAccrualID = null
              if (idx > 0 && stipendAmountItem && stipendAmountItem.payElID) {
                employeeAccrualID = empAccrualStore.generateID()
                empAccrualStore.run('insert', {
                  execParams: {
                    ID: employeeAccrualID,
                    employeeNumberID,
                    employeeID,
                    dateFrom: dateFromStipend,
                    dateTo: dateService.maxDate(),
                    payElID: stipendAmountItem.payElID,
                    accrualSum: sumStipend
                  }
                })
              }
              studStipendStore.run('insert', {
                skipCreateEmpPos: idx > 0,
                execParams: {
                  employeeNumberID,
                  employeeID,
                  dateFrom: dateFromStipend,
                  dateTo: dateService.maxDate(),
                  typeStipend: item.typeStipendID,
                  averageScore: row['averageScore'],
                  employeeAccrualID,
                  sumStipend
                }
              })
              if (studStipendItem && dateService.shiftDate(studStipendItem['dateFrom']) < dateFromStipend) {
                studStipendStore.run('update', {
                  __skipOptimisticLock: true,
                  execParams: {
                    ID: studStipendItem.ID,
                    dateTo: dateService.addDays(dateFromStipend, -1)
                  }
                })
              }
            }
          }
          if (studStipendItem && studStipendItem['averageScore'] !== row['averageScore']) {
            studStipendStore.run('update', {
              __skipOptimisticLock: true,
              execParams: {
                ID: studStipendItem.ID,
                averageScore: row['averageScore'] || null
              }
            })
          }
        }
      })
    } else if (row['typeStipend'] || (row['scholarschips'] && Array.isArray(row['scholarschips']) && row['scholarschips'].length === 1)) {
      if (row['scholarschips'] && Array.isArray(row['scholarschips']) && row['scholarschips'].length === 1) {
        row['typeStipend'] = row['scholarschips'][0]['typeStipend']
        row['nameStipend'] = row['scholarschips'][0]['nameStipend']
      }
      const studStipend = UB.Repository('hr_studStipend')
        .attrs('ID', 'dateFrom')
        .where('employeeNumberID', '=', employeeNumberID)
        .where('dateFrom', '<=', dateFromStipend)
        .where('dateTo', '>=', dateFromStipend)
        .selectAsObject()
      studStipend.forEach((item, idx) => {
        if (dateService.shiftDate(item.dateFrom).getTime() !== dateFromStipend.getTime() || idx > 0) {
          studStipendStore.run('update', {
            __skipOptimisticLock: true,
            execParams: {
              ID: item['ID'],
              dateTo: dateService.shiftDate(item.dateFrom) < dateFromStipend ? dateService.addDays(dateFromStipend, -1) : dateService.shiftDate(item.dateFrom)
            }
          })
        }
      })
      let typeStipendID = null
      const typeStipend = row['typeStipend'] ? String(row['typeStipend']) : null
      const nameStipend = row['nameStipend'] ? String(row['nameStipend']).trim() : null
      if (typeStipend && nameStipend) {
        const dictTypeStipendItem = dictTypeStipend.find(o => o.code === typeStipend && o.name === nameStipend)
        typeStipendID = dictTypeStipendItem ? dictTypeStipendItem.ID : null
        if (!typeStipendID) {
          typeStipendID = typeStipendStore.generateID()
          const newItem = {
            ID: typeStipendID,
            code: typeStipend,
            name: nameStipend
          }
          typeStipendStore.run('insert', {
            execParams: newItem
          })
          dictTypeStipend.push(newItem)
          result.error.push({
            row: idx,
            message: UB.i18n('{0} {1} (Група {2}) - вказаний тип стипендії {3} "{4}" не знайдено в довіднику', fullFIO, tabNum, studGroup, typeStipend, nameStipend)
          })
        }
      } else {
        result.error.push({
          row: idx,
          message: UB.i18n('{0} {1} (Група {2}) - не вказано тип або назву стипендії', fullFIO, tabNum, studGroup)
        })
      }
      const stipendAmountItem = dictStipendAmount.find(o => o.dictTypeStipendID === typeStipendID && o.dateFrom <= dateFromStipend && dateFromStipend <= o.dateTo)
      const sumStipend = stipendAmountItem ? (stipendAmountItem['accrualSum'] || 0) : (Number(row['sumStipend']) || 0)

      const studStipendItem = UB.Repository('hr_studStipend')
        .attrs('ID', 'sumStipend', 'averageScore', 'dateFrom', 'dateTo', 'typeStipend')
        .where('employeeNumberID', '=', employeeNumberID)
        // .where('typeStipend', '=', typeStipendID)
        .where('dateFrom', '<=', dateFromStipend)
        .where('dateTo', '>=', dateFromStipend)
        .where('[dateFrom]<>[dateTo]', 'custom')
        .limit(1)
        .selectSingle()
      if (!studStipendItem || sumStipend !== studStipendItem['sumStipend'] || typeStipendID !== studStipendItem['typeStipend']) {
        if (studStipendItem && dateService.shiftDate(studStipendItem['dateFrom']).getTime() === dateFromStipend.getTime()) {
          studStipendStore.run('update', {
            __skipOptimisticLock: true,
            execParams: {
              ID: studStipendItem.ID,
              typeStipend: typeStipendID,
              averageScore: row['averageScore'],
              sumStipend
            }
          })
        } else {
          studStipendStore.run('insert', {
            execParams: {
              employeeNumberID,
              employeeID,
              dateFrom: dateFromStipend,
              dateTo: dateService.maxDate(),
              typeStipend: typeStipendID,
              averageScore: row['averageScore'],
              sumStipend
            }
          })
          if (studStipendItem && dateService.shiftDate(studStipendItem['dateFrom']) < dateFromStipend) {
            studStipendStore.run('update', {
              __skipOptimisticLock: true,
              execParams: {
                ID: studStipendItem.ID,
                dateTo: dateService.addDays(dateFromStipend, -1)
              }
            })
          }
        }
      }
      if (studStipendItem && studStipendItem['averageScore'] !== row['averageScore']) {
        studStipendStore.run('update', {
          __skipOptimisticLock: true,
          execParams: {
            ID: studStipendItem.ID,
            averageScore: row['averageScore'] || null
          }
        })
      }
    } else {
      const studStipend = UB.Repository('hr_studStipend')
        .attrs('ID', 'typeStipend', 'dateFrom', 'dateTo')
        .where('employeeNumberID', '=', employeeNumberID)
        .where('dateFrom', '<=', dateFromStipend)
        .where('dateTo', '>=', dateFromStipend)
        .selectAsObject()
      const dateTo = dateService.addDays(dateFromStipend, -1)
      let isAdd = true
      studStipend.forEach(item => {
        if (dateService.shiftDate(item.dateFrom).getTime() === dateFromStipend.getTime() && dateService.isMaxDate(dateService.shiftDate(item.dateTo))) {
          isAdd = false
        } else {
          studStipendStore.run('update', {
            __skipOptimisticLock: true,
            execParams: {
              ID: item.ID,
              dateTo: dateService.shiftDate(item['dateFrom']) < dateTo ? dateTo : item['dateFrom']
            }
          })
        }
      })
      if (isAdd) {
        studStipendStore.run('insert', {
          execParams: {
            employeeNumberID,
            employeeID,
            dateFrom: dateFromStipend,
            dateTo: dateService.maxDate(),
            typeStipend: null,
            averageScore: 0,
            sumStipend: 0
          }
        })
      }
    }
    if (row['dateFromVacation'] && row['dateToVacation']) {
      const vacDateFrom = toDate(row['dateFromVacation'])
      const vacDateTo = toDate(row['dateToVacation'])
      const vacItem = UB.Repository('hr_empLongTermAbsc')
        .attrs('ID')
        .where('employeeNumberID', '=', employeeNumberID)
        .where('organizationID', '=', orgID)
        .where('dateFrom', '=', vacDateFrom)
        .where('dateTo', '=', vacDateTo)
        .limit(1)
        .selectSingle()
      if (!vacItem) {
        studVacStore.run('insert', {
          execParams: {
            employeeNumberID,
            organizationID: orgID,
            dateFrom: vacDateFrom,
            dateTo: vacDateTo
          }
        })
      }
    }
  }

  createStore()

  importData.forEach((row, idx) => {
    let tabNum = row.studentEd || row.tabNum
    const fullFIO = getFullFIO(row)
    const studGroup = row['group'] || '?'
    if (tabNum && row['dateFormStudy']) {
      tabNum = String(tabNum)
      const empStud = empStudList.find(o => o.tabNum === tabNum)

      let employeeID
      let employeeNumberID
      if (empStud) {
        employeeID = empStud.employeeID
        employeeNumberID = empStud.ID
      }

      const importRow = () => {
        processRow(row, idx, tabNum, employeeID, employeeNumberID, empStud)
      }
      App.dbCommit()
      try {
        db.savepointWrap(importRow)
      } catch (error) {
        App.dbRollback()
        result.error.push({
          row: idx,
          message: UB.i18n('{0} {1} (Група {2}) - помилка опрацювання {3}', fullFIO, tabNum, studGroup, error.message)
        })
        console.log('###', error.stack)
      }
    } else {
      if (!tabNum) {
        result.error.push({
          row: idx,
          message: UB.i18n('{0} (Група {1}) - не заповнений параметр studentEd', fullFIO, studGroup)
        })
      } else {
        if (!row['dateFormStudy']) {
          result.error.push({
            row: idx,
            message: UB.i18n('{0} {1} (Група {2}) - не заповнений параметр dateFormStudy', fullFIO, tabNum, studGroup)
          })
        }
        if (!row['taxCode']) {
          result.error.push({
            row: idx,
            message: UB.i18n('{0} {1} (Група {2}) - не заповнений параметр taxCode', fullFIO, tabNum, studGroup)
          })
        }
      }
    }

    if (idx % 1000 === 0) {
      freeStore()
      createStore()
    }
  })

  if (params) {
    App.dbCommit()
    const dateTo = dateService.addDays(dateFromStipend, -1) || dateService.currentDate()
    let studentListQuery = UB.Repository('hr_employeeNumberS')
      .attrs(['ID', 'tabNum', 'dateFrom', 'dateTo', 'employeeID', 'employeeID.fullFIO'])
      .where('orgID', '=', orgID)
      .where('kind', '=', 'STUD')
      .where('dateFrom', '<=', dateTo)
      .where('dateTo', '>', dateTo)
    if (params.typeStudy || params.formStudy) {
      studentListQuery = studentListQuery.exists(UB.Repository('hr_studEducationKind')
        .correlation('employeeNumberID', 'ID')
        .whereIf(params.formStudy, 'formStudy', '=', params.formStudy)
        .whereIf(params.typeStudy, 'typeStudy.code', '=', params.typeStudy)
        .where('mi_deleteDate', '>=', '#maxdate')
      )
    }
    if (params.semester && Array.isArray(params.semester) && params.semester.length) {
      studentListQuery = studentListQuery.exists(UB.Repository('hr_studEducationHistory')
        .correlation('employeeNumberID', 'ID')
        .where('semester', 'in', params.semester.map(o => Number(o)))
        .where('mi_deleteDate', '>=', '#maxdate')
      )
    }
    const studentList = studentListQuery.selectAsObject()
    studentList.forEach((row, idx) => {
      const stud = importData.find(o => String(o.studentEd) === row.tabNum || String(o.tabNum) === row.tabNum)
      if (!stud) {
        result.deleted.push({
          row: idx,
          message: UB.i18n('{0} {1}', row['employeeID.fullFIO'], row.tabNum)
        })
        empNumStore.run('update', {
          __skipOptimisticLock: true,
          execParams: {
            ID: row.ID,
            dateTo
          }
        })
        const studEduKind = UB.Repository('hr_studEducationKind')
          .attrs('ID')
          .where('employeeNumberID', '=', row.ID)
          .where('dateFrom', '<=', dateTo)
          .where('dateTo', '>=', dateTo)
          .selectAsObject()
        studEduKind.forEach(item => {
          studEduKindStore.run('update', {
            __skipOptimisticLock: true,
            execParams: {
              ID: item.ID,
              dateTo
            }
          })
        })
        const studEduHist = UB.Repository('hr_studEducationHistory')
          .attrs('ID')
          .where('employeeNumberID', '=', row.ID)
          .where('dateFrom', '<=', dateTo)
          .where('dateTo', '>=', dateTo)
          .selectAsObject()
        studEduHist.forEach(item => {
          studEduHistStore.run('update', {
            __skipOptimisticLock: true,
            execParams: {
              ID: item.ID,
              dateTo
            }
          })
        })
        const studStipend = UB.Repository('hr_studStipend')
          .attrs('ID')
          .where('employeeNumberID', '=', row.ID)
          .where('dateFrom', '<=', dateTo)
          .where('dateTo', '>=', dateTo)
          .selectAsObject()
        studStipend.forEach(item => {
          studStipendStore.run('update', {
            __skipOptimisticLock: true,
            execParams: {
              ID: item.ID,
              dateTo
            }
          })
        })
      }
    })
  }

  freeStore()

  return result
}

function importDismissed (importData, orgID) {
  const result = {
    inserted: [],
    updated: [],
    deleted: [],
    error: []
  }
  const studEduKindStore = UB.DataStore('hr_studEducationKind')
  const studEduHistStore = UB.DataStore('hr_studEducationHistory')
  const studStipendStore = UB.DataStore('hr_studStipend')
  const empNumberStore = UB.DataStore('hr_employeeNumber')
  let studGroup

  importData.forEach((row, idx) => {
    const tabNum = row.studentEd || row.tabNum
    const dateTo = toDate(row['dateTo'])
    if (tabNum && dateTo) {
      const empStud = UB.Repository('hr_employeeNumber')
        .attrs(['ID', 'employeeID.fullFIO', 'dateTo'])
        .where('orgID', '=', orgID)
        .where('tabNum', '=', String(tabNum))
        .limit(1)
        .selectSingle()
      if (empStud) {
        if (dateService.shiftDate(empStud['dateTo']) > dateTo) {
          empNumberStore.run('update', {
            __skipOptimisticLock: true,
            execParams: {
              ID: empStud['ID'],
              dateTo
            }
          })
          studGroup = ''
          const employeeNumberID = empStud['ID']
          const studEduKind = UB.Repository('hr_studEducationKind')
            .attrs('ID')
            .where('employeeNumberID', '=', employeeNumberID)
            .where('dateFrom', '<=', dateTo)
            .where('dateTo', '>=', dateTo)
            .selectAsObject()
          studEduKind.forEach(row => {
            studEduKindStore.run('update', {
              __skipOptimisticLock: true,
              execParams: {
                ID: row.ID,
                dateTo
              }
            })
          })
          const studEduHist = UB.Repository('hr_studEducationHistory')
            .attrs('ID', 'groupID.code')
            .where('employeeNumberID', '=', employeeNumberID)
            .where('dateFrom', '<=', dateTo)
            .where('dateTo', '>=', dateTo)
            .selectAsObject()
          studEduHist.forEach(row => {
            studGroup = row['groupID.code']
            studEduHistStore.run('update', {
              __skipOptimisticLock: true,
              execParams: {
                ID: row.ID,
                dateTo
              }
            })
          })
          const studStipend = UB.Repository('hr_studStipend')
            .attrs('ID')
            .where('employeeNumberID', '=', employeeNumberID)
            .where('dateFrom', '<=', dateTo)
            .where('dateTo', '>=', dateTo)
            .selectAsObject()
          studStipend.forEach(row => {
            studStipendStore.run('update', {
              __skipOptimisticLock: true,
              execParams: {
                ID: row.ID,
                dateTo
              }
            })
          })
          result.deleted.push({
            row: idx,
            message: UB.i18n('{0} {1} (Група {2})', empStud['employeeID.fullFIO'], tabNum, studGroup)
          })
        } else {
          result.error.push({
            row: idx,
            message: UB.i18n('{0} {1} - картка закрита більш ранньою датою', tabNum, empStud['employeeID.fullFIO'])
          })
        }
      } else {
        result.error.push({
          row: idx,
          message: UB.i18n('Не знайдено запис з номером {0}', tabNum)
        })
      }
    } else {
      result.error.push({
        row: idx,
        message: UB.i18n('Не вказано studentEd або dateTo')
      })
    }
  })

  studEduKindStore.freeNative()
  studEduHistStore.freeNative()
  studStipendStore.freeNative()

  return result
}
