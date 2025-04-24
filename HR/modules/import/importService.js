const UB = require('@unitybase/ub')
const iconv = require('iconv-lite')
const App = UB.App
const Session = UB.Session
const importConfig = require('../import/importConfig')
const dateService = require('../../../AC/modules/dataServices/dateService')
const periodService = require('../../../HR/modules/periodService')
const accrualService = require('../../../HR/modules/accrualService')
const csvLoader = require('../import/csvLoader')
const payElService = require('../../../HR/modules/payElService')
const timeSheetService = require('../../../TIM/modules/timeSheetService')
const timService = require('../../../HR/modules/timService')
const paySummaryService = require('../../../HR/modules/paySummaryService')
const algorithmService = require('../../../HR/modules/algorithmService')
const entityBaseService = require('../../../AC/modules/entityServices/entityBaseService')
const calendarService = require('../../../HR/modules/calendarService')

module.exports = {
  loadFileData,
  doImport,
  loadFileDataEx,
  getDependenceOrg,
  getDependenceEmployeeOrg,
  getAttrOrg,
  getRowOrgID
}
function loadFileDataEx (params, data) {
  let result = []
  csvLoader.DETECT_TYPES = false
  csvLoader.QUOTE = null
  const csvStr = iconv.decode(Buffer.from(data), params.encoding)
  csvLoader.parse(csvStr, ';', rowData => {
    result.push(rowData)
  })
  csvLoader.DETECT_TYPES = true
  return result
}

function loadFileData (params, data) {
  const errorMessages = []
  const importParams = importConfig.getEntityConfig(params.entityName)
  const hrImportName = ['hr_studentCard'].includes(importParams.entityName) ? 'hr_importStudentCSV' : 'hr_importPlan'
  let store = UB.DataStore(importParams.impEntityName)
  let storeMap = UB.DataStore('hr_importMap')
  let storePlan = UB.DataStore(hrImportName)
  let storeLog = UB.DataStore('hr_importLog')
  const db = App.dbConnections[App.domainInfo.entities.ubm_enum.connectionName]
  let importPlan = UB.Repository(hrImportName).attrs(['ID'])
    .where('orgID', '=', params.orgID)
    .where('entityName', '=', importParams.entityName)
    .whereIf(params.appCode, 'appCode', '=', params.appCode)
    .orderBy('sortOrder')
    .selectSingle()
  const startLoad = new Date()
  storePlan.run('update', {
    __skipOptimisticLock: true,
    __skipSelectAfterUpdate: true,
    __skipUsingAllFieldsForSelectBeforeUpdate: true,
    __skipRls: true,
    __skipAclRls: true,
    execParams: {
      ID: importPlan.ID,
      state: '5',
      fileName: params.fileName,
      startLoad: startLoad,
      finishLoad: null
    }
  })

  store.execSQL(`DELETE FROM ${importParams.impEntityName} WHERE orgID = :orgID: `, { orgID: params.orgID })
  storeLog.execSQL(`DELETE FROM hr_importLog WHERE orgID = :orgID: and entityName = :entityName:`,
    { orgID: params.orgID, entityName: importParams.entityName })
  App.dbCommit()
  let importMap = []
  let mapType = 1
  /* if (['hr_accrualDt', 'hr_accrualFundDt'].includes(importParams.entityName)) {
    storeMap.execSQL(`DELETE FROM hr_importMap WHERE orgID = :orgID: and entityName = :entityName:`,
      { orgID: params.orgID, entityName: importParams.entityName })
  } */
  if (['hr_accrual', 'hr_accrualFund', 'hr_studentCard'].includes(importParams.entityName)) {
    storeMap.execSQL(`DELETE FROM hr_importMap WHERE orgID = :orgID: and entityName = :entityName:`,
      { orgID: params.orgID, entityName: importParams.entityName })
    mapType = 2
  } else {
    importMap = UB.Repository('hr_importMap')
      .attrs('*').where('orgID', '=', params.orgID)
      .where('entityName', '=', importParams.entityName)
      .orderBy('inputID')
      .selectAsObject()
  }
  let attrRow
  let impParams = UB.Repository('hr_importParams')
    .attrs(['*'])
    .where('orgID', '=', params.orgID)
    .selectSingle()
  if (!impParams) {
    impParams = {
      isAddNew: 1,
      isUpdate: 1,
      addTimeSheet: 1,
      notUpdateDays: 1,
      notUpdateHour: 1
    }
  }
  const dependenceOrg = impParams.isOrgList ? getDependenceOrg(params.orgID) : null
  const dependenceEmployeeOrg = impParams.isOrgList ? getDependenceEmployeeOrg(params.orgID) : null

  try {
    console.log(`Start import buffer to string start`)
    const csvStr = iconv.decode(Buffer.from(data), params.encoding)
    console.log(`Start import buffer to string start`)
    const attributes = App.domainInfo.entities[importParams.impEntityName].attributes
    csvLoader.DETECT_TYPES = false
    csvLoader.QUOTE = null
    let count = 1
    const existIDs = {}
    csvLoader.parse(csvStr, ';', setRow)
    csvLoader.DETECT_TYPES = true
    // eslint-disable-next-line no-inner-declarations

    function setRow (rowData) {
      if (!attrRow) {
        attrRow = makeCamelCaseNames(rowData, Object.keys(attributes))
      } else {
        const row = {}
        for (let i = 0; i < rowData.length; i++) {
          if (attrRow[i] === 'impID' && !rowData[i]) {} else if (attrRow[i] === 'orgID' || attrRow[i] === 'subOrgID') {
            if (attributes.impOrgID) {
              row.impOrgID = rowData[i]
            }
          } else if (attributes[attrRow[i]] && attrRow[i] !== 'ID') {
            row[attrRow[i]] = (rowData[i] === 'NULL' || rowData[i] === 'null') ? null : attributes[attrRow[i]].dataType === 'String' ? rowData[i].replace(/[\u0007]/gi, '') : rowData[i]
            if (importParams.inAttrConfig && importParams.inAttrConfig[attrRow[i]]) {
              row[attrRow[i]] = importParams.inAttrConfig[attrRow[i]](row[attrRow[i]], params.orgID, importParams.entityName, row, impParams)
            }
          } else if (attrRow[i] === 'ID') {
            row.impID = rowData[i]
          } else if (attributes.additionalData) {
            const additionalData = row.additionalData ? JSON.parse(row.additionalData) : []
            additionalData.push({ name: attrRow[i], value: rowData[i] })
            row.additionalData = JSON.stringify(additionalData)
          }
        }
        if (!existIDs[`${row.impOrgID || params.orgID}_${row.impID}`]) {
          existIDs[`${row.impOrgID || params.orgID}_${row.impID}`] = true
          if (importParams.setDefaultValueOnLoad) {
            importParams.setDefaultValueOnLoad(row, params.orgID, importParams)
          }
          delete row.ID
          delete row.orgID
          delete row.subOrgID

          const insertRow = () => {
            row.orgID = params.orgID
            if (importParams.pkGenerator) {
              row.ID = accrualService.getID(importParams.pkGenerator, 1000)
            }
            store.run('insert', {
              __skipOptimisticLock: true,
              __skipSelectAfterInsert: true,
              __skipRls: true,
              __skipAclRls: true,
              execParams: row
            })
            if (mapType === 1) {
              let rowOrgID = params.orgID
              if (impParams.isOrgList && row && row.impOrgID) {
                const attrOrg = getAttrOrg(row)
                if (attrOrg) {
                  rowOrgID = getRowOrgID(row, dependenceOrg, dependenceEmployeeOrg)
                }
              }
              const output = (importParams.exists && importParams.map !== false) ? (importParams.exists(row, importParams, rowOrgID) || {}) : {}
              const mapRow = accrualService.binarySearch(importMap, Number(row.impID), 0, importMap.length - 1, 'inputID')
              if (mapRow) {
                storeMap.run('update', {
                  __skipOptimisticLock: true,
                  __skipSelectAfterUpdate: true,
                  __skipRls: true,
                  __skipAclRls: true,
                  execParams: {
                    ID: mapRow.ID,
                    inputCode: row[importParams.codeAttr] || null,
                    inputName: row[importParams.nameAttr] || null,
                    outputID: mapRow.outputID || output.ID || null,
                    outputCode: mapRow.outputCode || output[importParams.codeAttr] || null,
                    outputName: mapRow.outputName || output[importParams.nameAttr] || null
                  }
                })
              } else {
                storeMap.run('insert', {
                  __skipOptimisticLock: true,
                  __skipSelectAfterInsert: true,
                  __skipRls: true,
                  __skipAclRls: true,
                  execParams: {
                    orgID: params.orgID,
                    entityName: importParams.entityName,
                    inputID: row.impID,
                    inputCode: row[importParams.codeAttr] || null,
                    inputName: row[importParams.nameAttr] || null,
                    outputID: output.ID || null,
                    outputCode: output[importParams.codeAttr] || null,
                    outputName: output[importParams.nameAttr] || null
                  }
                })
              }
            } else {
              storeMap.run('insert', {
                __skipOptimisticLock: true,
                __skipSelectAfterInsert: true,
                __skipRls: true,
                __skipAclRls: true,
                execParams: {
                  orgID: params.orgID,
                  entityName: importParams.entityName,
                  inputID: row.impID,
                  inputCode: null,
                  inputName: null,
                  outputID: row.ID,
                  outputCode: null,
                  outputName: null
                }
              })
            }
            console.log(`import row ${count} impID ${row.impID}`)
          }
          try {
            db.savepointWrap(insertRow)
          } catch (error) {
            errorMessages.push(`ID(${row.impID}) ${error.message}`)
            console.log(`import row ${count} impID ${row.impID}`)
          }
          count++
          if (count % 1000 === 0) {
            App.dbCommit()
            store.freeNative()
            storeMap.freeNative()
            storePlan.freeNative()
            storeLog.freeNative()
            store = UB.DataStore(importParams.impEntityName)
            storeMap = UB.DataStore('hr_importMap')
            storePlan = UB.DataStore(hrImportName)
            storeLog = UB.DataStore('hr_importLog')
          }
        } else {
          errorMessages.push(`ID(${row.impID}) Вже існує в файлі завантаження, запис не додано`)
        }
      }
    }
  } catch (error) {
    errorMessages.push(error.message)
  }
  const finishLoad = new Date()
  storePlan.run('update', {
    __skipOptimisticLock: true,
    __skipSelectAfterUpdate: true,
    __skipUsingAllFieldsForSelectBeforeUpdate: true,
    __skipRls: true,
    __skipAclRls: true,
    execParams: {
      ID: importPlan.ID,
      state: errorMessages.length ? '1' : '2',
      fileName: params.fileName,
      finishLoad: finishLoad,
      attrList: attrRow ? JSON.stringify(attrRow) : null
    }
  })

  errorMessages.forEach(row => {
    storeLog.run('insert', {
      __skipOptimisticLock: true,
      __skipSelectAfterInsert: true,
      __skipRls: true,
      __skipAclRls: true,
      execParams: {
        orgID: params.orgID,
        entityName: importParams.entityName,
        description: row.substring(0, 1999)
      }
    })
  })
  return { state: errorMessages.length ? '1' : '2', logCount: errorMessages.length, startLoad, finishLoad }
}

function doImport (planID, params = { isAddNew: 1, isUpdate: 1 }) {
  let result
  const storePlan = params.isStudentCard ? UB.DataStore('hr_importStudentCSV') : UB.DataStore('hr_importPlan')
  const storeLog = UB.DataStore('hr_importLog')
  const importPlan = UB.Repository(params.isStudentCard ? 'hr_importStudentCSV' : 'hr_importPlan')
    .attrs(['ID', 'orgID', 'entityName', 'impEntityName', 'entityDescription', 'fileName', 'entityType', 'state', 'makeImport', 'appCode', 'attrList'])
    .selectById(planID)
  importPlan.attrList = importPlan.attrList ? JSON.parse(importPlan.attrList) : null
  const importParams = importConfig.getEntityConfig(importPlan.entityName, importPlan.appCode)
  const startImport = new Date()
  storePlan.run('update', {
    __skipOptimisticLock: true,
    __skipSelectAfterUpdate: true,
    __skipUsingAllFieldsForSelectBeforeUpdate: true,
    __skipRls: true,
    __skipAclRls: true,
    execParams: {
      ID: importPlan.ID,
      state: '6',
      startImport: startImport,
      finishImport: null
    }
  })
  storeLog.execSQL(`DELETE FROM hr_importLog WHERE orgID = :orgID: and entityName = :entityName:`,
    { orgID: importPlan.orgID, entityName: importPlan.entityName })
  App.dbCommit()
  if (importParams.entityType === '3') {
    result = setTimeSheet(importParams, importPlan.orgID, params)
  } else if (importParams.entityType === '5') {
    const importMap = UB.Repository('hr_importMap').attrs(['ID', 'inputID', 'outputID'])
      .where('orgID', '=', importPlan.orgID)
      .where('entityName', '=', importPlan.entityName)
      .orderBy('inputID')
      .selectAsObject()
    const entityData = importParams.loadData ? importParams.loadData(importPlan.orgID)
      : UB.Repository(importParams.impEntityName).attrs(['*']).where('orgID', '=', importPlan.orgID).selectAsObject()
    if (importMap.length) {
      entityData.forEach(row => {
        const mapRow = accrualService.binarySearch(importMap, Number(row.impID), 0, importMap.length - 1, 'inputID')
        row.map = mapRow
      })
    }
    if (entityData.length) {
      result = studentDataImport(importParams, entityData, importPlan.orgID, params)
    } else {
      result = {
        state: '4',
        logCount: 0
      }
    }
  } else {
    const loadMethod = getLoadMethod(importParams.loadMethod, params)
    if (loadMethod === 'accrualOrgListSQL') {
      result = accrualOrgListSQL(importParams, importPlan.orgID, params)
    } else if (loadMethod === 'accrualSQL') {
      result = dictAccrualSQL(importParams, importPlan.orgID, params)
    } else if (loadMethod === 'accrualFundSQL') {
      result = dictAccrualFundSQL(importParams, importPlan.orgID, params)
    } else if (loadMethod === 'accrualFundOrgListSQL') {
      result = accrualFundOrgListSQL(importParams, importPlan.orgID, params)
    } else if (loadMethod !== 'accrual') {
      const importMap = UB.Repository('hr_importMap').attrs(['ID', 'inputID', 'outputID'])
        .where('orgID', '=', importPlan.orgID)
        .where('entityName', '=', importPlan.entityName)
        .orderBy('inputID')
        .selectAsObject()
      const entityData = importParams.loadData ? importParams.loadData(importPlan.orgID)
        : UB.Repository(importParams.impEntityName).attrs(['*']).where('orgID', '=', importPlan.orgID).selectAsObject()
      if (loadMethod !== 'accrual' && importMap.length) {
        entityData.forEach(row => {
          const mapRow = accrualService.binarySearch(importMap, Number(row.impID), 0, importMap.length - 1, 'inputID')
          row.map = mapRow
        })
      }
      if (importParams.beforeImport) {
        importParams.beforeImport(importPlan.orgID)
      }
      if (entityData.length) {
        switch (loadMethod) {
          case 'org': {
            result = orgUnitImport(importParams, entityData, importPlan.orgID, params, importPlan)
            break
          }
          case 'dict': {
            result = dictImport(importParams, entityData, importPlan.orgID, params, importPlan)
            break
          }
          case 'detail': {
            result = dictImportDt(importParams, entityData, importPlan.orgID, params, importPlan)
            break
          }
          case 'skipLoad': {
            result = {
              state: '4',
              logCount: 0
            }
          }
        }
      } else {
        result = {
          state: '4',
          logCount: 0
        }
      }
    } else {
      result = dictAccrual(importParams, importPlan.orgID, params, importPlan)
    }
  }
  result.startImport = startImport
  result.finishImport = new Date()
  storePlan.run('update', {
    __skipOptimisticLock: true,
    __skipSelectAfterUpdate: true,
    __skipUsingAllFieldsForSelectBeforeUpdate: true,
    __skipRls: true,
    __skipAclRls: true,
    execParams: {
      ID: importPlan.ID,
      state: result.state,
      finishImport: result.finishImport
    }
  })
  if (result.errorMessages && result.errorMessages.length) {
    result.errorMessages.forEach(row => {
      storeLog.run('insert', {
        __skipOptimisticLock: true,
        __skipSelectAfterInsert: true,
        __skipRls: true,
        __skipAclRls: true,
        execParams: {
          orgID: importPlan.orgID,
          entityName: importPlan.entityName,
          description: row.substring(0, 1999)
        }
      })
    })
  }
  App.dbCommit()
  return { state: result.state, logCount: result.logCount }
}

function orgUnitImport (importParams, insertData, orgID, params, importPlan) {
  const errorMessages = []
  const db = App.dbConnections[App.domainInfo.entities.ubm_enum.connectionName]
  if (insertData.length) {
    const organization = UB.Repository('hr_organization').attrs(['ID', 'mi_data_id', 'mi_dateFrom']).where('mi_data_id', '=', orgID).where('state', '=', 'ACTIVE').orderBy('mi_dateFrom').limit(1).selectSingle()
    const onDate = importParams.entityName === 'hr_organization' ? dateService.minDate() : dateService.shiftDate(organization.mi_dateFrom)
    const orgUnitStore = UB.DataStore(importParams.entityName)
    const importMapStore = UB.DataStore('hr_importMap')
    const staffOrder = UB.DataStore('hr_staffOrder')
    const integrateMapStore = UB.DataStore('ac_integrateMap')
    const orderID = staffOrder.generateID()
    const orgDateFrom = {}
    staffOrder.run('insert', {
      __skipOptimisticLock: true,
      isImport: true,
      isImportOperation: true,
      execParams: {
        ID: orderID,
        orgID,
        orderState: 'PROJECT',
        orderDate: onDate,
        entryDate: onDate,
        textOrder: `Імпорт ${importParams.entityDescription}`
      }
    })
    const dependence = getDependence(importParams.dependence, orgID)
    const dependenceOrg = params.isOrgList && importParams.entityName !== 'hr_organization' ? getDependenceOrg(orgID) : null

    const sortInsertData = importParams.entityName === 'hr_position'
      ? insertData
      : insertData.filter(o => !o.parentUnitID || !insertData.find(u => u.impID === o.parentUnitID))

    if (importParams.entityName !== 'hr_position') {
      const setChild = (parentIDs) => {
        const child = insertData.filter(o => parentIDs.includes(o.parentUnitID))
        if (child.length) {
          sortInsertData.push(...child)
          setChild(child.map(o => o.impID))
        }
      }
      setChild(sortInsertData.map(o => o.impID))
    }
    sortInsertData.forEach(row => {
      let exception
      let externalID = row.externalID
      let extrnlSystmCode = row.extrnlSystmCode
      if ((!row.externalID && row.extrnlSystmCode) || (row.externalID && !row.extrnlSystmCode) || (row.externalID && row.extrnlSystmCode && !Number.isInteger(row.externalID))) {
        exception = UB.i18n(`ID({0}) Відсутній один з обов'язкових атрибутів (extrnlSystmCode або externalID)`, row.impID)
        errorMessages.push(exception)
      }
      delete row.externalID
      delete row.extrnlSystmCode
      let rowOrgID = orgID
      let rowDateFrom = row.mi_dateFrom ? dateService.shiftDate(row.mi_dateFrom) : dateService.shiftDate(onDate)
      if (params.isOrgList && row.impOrgID) {
        if (getAttrOrg(row)) {
          rowOrgID = getRowOrgID(row, dependenceOrg, null)
          if (!rowOrgID) {
            exception = UB.i18n(`ID({0}) Не знайдено організацію в таблиці відповідності`, row.impID)
            errorMessages.push(exception)
          } else {
            if (!orgDateFrom[rowOrgID]) {
              const subOrganization = UB.Repository('hr_organization').attrs(['ID', 'mi_data_id', 'mi_dateFrom']).where('mi_data_id', '=', rowOrgID).where('state', '=', 'ACTIVE').orderBy('mi_dateFrom').limit(1).selectSingle()
              orgDateFrom[rowOrgID] = subOrganization ? dateService.shiftDate(subOrganization.mi_dateFrom) : dateService.shiftDate(onDate)
            }
            if (!row.mi_dateFrom) {
              rowDateFrom = orgDateFrom[rowOrgID]
            }
          }
        }
      }
      let errorData = UB.i18n(`ID({0}) impOrgID({1}) rowOrgID({2}) parentUnitID({3})`, row.impID, row.impOrgID, rowOrgID, row.parentUnitID)
      delete row.impOrgID

      if (importParams.attrsConfig) {
        Object.keys(importParams.attrsConfig).forEach(attrKey => {
          row[attrKey] = importParams.attrsConfig[attrKey](row[attrKey], orgID, rowOrgID)
        })
      }
      if (importParams.dependence) {
        Object.keys(importParams.dependence).forEach(attrKey => {
          if (row[attrKey] !== null && row[attrKey] !== undefined) {
            const attrID = row[attrKey]
            const mapRow = accrualService.binarySearch(dependence[attrKey], Number(row[attrKey]), 0, dependence[attrKey].length - 1, 'inputID')
            row[attrKey] = mapRow ? mapRow.outputID : null
            if (row[attrKey] === null) {
              errorMessages.push(UB.i18n(`ID({0}) Не знайдено значення {1} з ID {2} в таблиці відповідності`, row.impID, attrKey, attrID))
            }
          }
        })
      }

      function setAdditionalData (instanceID, additionalData, params) {
        let store = UB.DataStore(params.additionalData.entity)
        store.execSQL(`UPDATE ${params.additionalData.entity} SET mi_deleteUser = :userID:, mi_deleteDate = '2000-01-01' 
                       WHERE ${params.additionalData.attrKey} = :instanceID: AND mi_deleteDate >= '9999-12-31' `,
        { instanceID })
        if (additionalData) {
          const addParams = JSON.parse(additionalData)
          addParams.forEach(execParams => {
            execParams[params.additionalData.attrKey] = instanceID
            store.run('insert', {
              execParams
            })
          })
        }
      }
      if (!exception) {
        const insertRow = () => {
          delete row.impID
          const map = row.map
          delete row.map
          let entityID
          if (map && map.outputID) {
            if (params.isUpdate) {
              row.ID = map.outputID
              if (row.name) {
                row.name = row.name.replace(/\n/g, '')
              }
              // if (importParams.entityName === 'hr_organization') {
              //  delete row.orgID
              // } else {
              row.orgID = rowOrgID
              // }

              const additionalData = row.additionalData
              delete row.additionalData
              if (importPlan.attrList) {
                Object.keys(row).forEach(attrName => {
                  if (!importPlan.attrList.includes(attrName === 'orgID' ? 'impOrgID' : attrName)) {
                    delete row[attrName]
                  }
                })
              }
              orgUnitStore.run('update', {
                isImport: true,
                isImportOperation: true,
                __skipOptimisticLock: true,
                execParams: row
              })
              entityID = row.ID
              if (importParams.additionalData) {
                setAdditionalData(row.ID, additionalData, importParams)
              }
            }
          } else {
            if (params.isAddNew) {
              row.ID = orgUnitStore.generateID()
              entityID = row.ID
              row.mi_data_id = row.ID
              row.staffOrderID = orderID
              row.mi_dateFrom = rowDateFrom
              row.state = 'NEW'
              if (importParams.entityName === 'hr_organization') {
                row.orgID = row.ID
              } else {
                row.orgID = rowOrgID
              }
              if (importParams.entityName === 'hr_department' && !row.parentUnitID) {
                row.parentUnitID = row.orgID
              }
              const additionalData = row.additionalData
              delete row.additionalData
              orgUnitStore.run('insert', {
                isImport: true,
                isImportOperation: true,
                execParams: row
              })
              importMapStore.run('update', {
                __skipOptimisticLock: true,
                __skipSelectAfterUpdate: true,
                __skipUsingAllFieldsForSelectBeforeUpdate: true,
                __skipRls: true,
                __skipAclRls: true,
                execParams: {
                  ID: map.ID,
                  outputID: row.ID,
                  outputCode: row[importParams.codeAttr],
                  outputName: row[importParams.nameAttr]
                }
              })
              if (importParams.additionalData) {
                setAdditionalData(row.ID, additionalData, importParams)
              }
            }
          }

          if (externalID && extrnlSystmCode && entityID) {
            const integrateMap = UB.Repository('ac_integrateMap')
              .attrs(['ID'])
              .where('extrnlSystmCode', '=', extrnlSystmCode)
              .where('externalID', '=', externalID)
              .selectSingle()
            if (!integrateMap) {
              integrateMapStore.run('insert', {
                __skipOptimisticLock: true,
                execParams: {
                  internalID: entityID,
                  entityName: importParams.entityName,
                  extrnlSystmCode: extrnlSystmCode,
                  externalID: externalID
                }
              })
            }
          }
        }
        try {
          db.savepointWrap(insertRow)
        } catch (error) {
          exception = `${errorData} ${error.message}`
        }
      }
      if (exception) {
        errorMessages.push(exception)
      }
    })
    const postOrder = () => {
      staffOrder.run('update', {
        __skipOptimisticLock: true,
        isImport: true,
        isImportOperation: true,
        execParams: {
          ID: orderID,
          orderState: 'POSTED',
          entryDate: onDate
        }
      })
    }
    try {
      db.savepointWrap(postOrder)
    } catch (error) {
      errorMessages.push(`Проведення ${error.message}`)
    }
  }
  return {
    state: errorMessages.length ? '3' : '4',
    logCount: errorMessages.length,
    errorMessages
  }
}

function getDependence (dependence, orgID) {
  const result = {}
  if (dependence) {
    Object.keys(dependence).forEach(attrKey => {
      result[attrKey] = UB.Repository('hr_importMap')
        .attrs('ID', 'inputID', 'outputID').where('orgID', '=', orgID)
        .where('entityName', '=', dependence[attrKey])
        .orderBy('inputID')
        .selectAsObject()
    })
  }

  return result
}

function clearLostLinks (entityName, orgID, errorMessages = null) {
  try {
    const store = UB.DataStore('hr_importMap')
    UB.Repository('hr_importMap')
      .attrs('ID')
      .where('orgID', '=', orgID)
      .where('entityName', '=', entityName)
      .where('outputID', 'isNotNull')
      .notExists(
        UB.Repository(entityName)
          .correlation('ID', 'outputID')
      ).selectAsObject()
      .forEach(lost => {
        store.run('update', { execParams: { ID: lost.ID, outputID: null } })
      })
  } catch (error) {
    if (errorMessages !== null) {
      errorMessages.push(`clearLostLinks(${entityName}, ${orgID}): ${error.message}`)
    }
    console.log(`clearLostLinks(${entityName}, ${orgID}): ${error.message}`)
  }
}

function studentDataImport (importParams, insertData, orgID, params) {
  const errorMessages = []
  const db = App.dbConnections[App.domainInfo.entities.ubm_enum.connectionName]
  if (insertData.length) {
    let orderStore = UB.DataStore('hr_orderPay')
    const orderID = orderStore.generateID()
    orderStore.run('insert', {
      execParams: {
        ID: orderID,
        orderState: 'POSTED',
        entryDate: dateService.currentDate(),
        description: 'Імпортований список студентів'
      }
    })
    insertData.forEach(studentData => {
      const createStudentCard = () => {
        if (!studentData.tabNum || !studentData.empTaxCodeType || !studentData.dateFromStudy ||
            !studentData.taxCode || !studentData.lastName || !studentData.firstName || !studentData.groupNum ||
            !studentData.semester || !studentData.dateFromGroup || !studentData.typeStudy || !studentData.formStudy
        ) {
          throw new Error('Invalid data')
        }
        let employee = UB.Repository('hr_employee')
          .attrs(['ID', 'fullFIO'])
          .where('taxCode', '=', studentData.taxCode)
          .selectSingle()
        if (!employee) {
          const employeeStore = UB.DataStore('hr_employee')
          const addressStore = UB.DataStore('ac_address')
          const employeeBenefitsStore = UB.DataStore('hr_employeeBenefits')
          const employeeDocsStore = UB.DataStore('hr_employeeDocs')
          const employeeID = employeeStore.generateID()
          employee = { ID: employeeID }
          let execParams = { ID: employee.ID, organizationID: orgID }

          execParams.firstName = studentData.firstName
          execParams.lastName = studentData.lastName
          execParams.shortFIO = `${studentData.lastName} ${studentData.firstName[0].toUpperCase()}.${studentData.middleName ? studentData.middleName[0].toUpperCase() + '.' : ''}`
          execParams.fullFIO = `${studentData.lastName} ${studentData.firstName}${studentData.middleName ? ' ' + studentData.middleName : ''}`
          employee.fullFIO = execParams.fullFIO
          execParams.description = execParams.fullFIO
          execParams.taxCode = studentData.taxCode
          execParams.empTaxCodeType = studentData.empTaxCodeType
          execParams.tabNum = studentData.tabNum
          let dictTaxCodeReason = UB.Repository('hr_dictTaxCodeReason')
            .attrs(['ID'])
            .where('code', '=', '02')
            .selectSingle()
          execParams.dictTaxCodeReasonID = dictTaxCodeReason.ID

          if (studentData.middleName) execParams.middleName = studentData.middleName
          if (studentData.sexType) execParams.tabNum = studentData.sexType
          if (studentData.email) execParams.tabNum = studentData.email
          if (studentData.phoneMobile) execParams.phoneMobile = studentData.phoneMobile
          if (studentData.citizenship) {
            let citizenship = UB.Repository('cdn_country')
              .attrs(['ID'])
              .where('name', '=', studentData.citizenship)
              .selectSingle()
            if (citizenship) execParams.citizenshipID = citizenship.ID
          }

          let execAddressParams = {
            ownerID: employee.ID
          }
          let country = UB.Repository('cdn_country').attrs(['ID'])
            .where('code', '=', 'UKR')
            .selectSingle()

          execAddressParams.countryID = country.ID
          if (studentData.addressType) execAddressParams.addressType = studentData.addressType
          if (studentData.address) execAddressParams.address = studentData.address

          let employeeBenefitsParams = null
          if (studentData.benefitsKind && studentData.dateFromBenefits) {
            let dictBenefitsKind = UB.Repository('hr_dictBenefitsKind')
              .attrs(['ID'])
              .where('name', '=', studentData.benefitsKind)
              .selectSingle()
            if (dictBenefitsKind) {
              employeeBenefitsParams = {
                employeeID: employee.ID,
                taxLimitID: dictBenefitsKind.ID,
                dateFrom: studentData.dateFromBenefits
              }
              if (studentData.dateToBenefits) employeeBenefitsParams.dateTo = studentData.dateToBenefits
            }
          }

          let employeeDocsParams = {
            employeeID: employee.ID
          }
          if (studentData.docSeries) employeeDocsParams.docSeries = studentData.docSeries
          if (studentData.passNumber) employeeDocsParams.docNumber = studentData.passNumber
          if (studentData.docIssuedDate) employeeDocsParams.docIssuedDate = studentData.docIssuedDate
          if (studentData.docIssued) employeeDocsParams.docIssued = studentData.docIssued

          employeeStore.run('insert', { execParams })
          if (employeeBenefitsParams) {
            employeeBenefitsStore.run('insert', {
              execParams: employeeBenefitsParams
            })
          }
          if (execAddressParams) {
            addressStore.run('insert', {
              execParams: execAddressParams
            })
          }
          if (employeeDocsParams) {
            employeeDocsStore.run('insert', {
              execParams: employeeDocsParams
            })
          }

          App.dbCommit()
        }

        let employeeNumber = UB.Repository('hr_employeeNumber')
          .attrs(['ID'])
          .where('orgID', '=', orgID)
          .where('employeeID', '=', employee.ID)
          .where('tabNum', '=', studentData.tabNum)
          .selectSingle()

        if (!employeeNumber) {
          const employeeNumberStore = UB.DataStore('hr_employeeNumber')
          const empLongTermAbscStore = UB.DataStore('hr_empLongTermAbsc')
          const studStipendStore = UB.DataStore('hr_studStipend')
          const studEducationKindStore = UB.DataStore('hr_studEducationKind')
          const studEducationHistoryStore = UB.DataStore('hr_studEducationHistory')
          const employeeNumberID = employeeNumberStore.generateID()
          employeeNumber = { ID: employeeNumberID }
          let execParams = { ID: employeeNumber.ID, employeeID: employee.ID, orgID: orgID, kind: 'STUD' }

          execParams.tabNum = studentData.tabNum
          execParams.orderID = orderID
          const tabNumList = String(execParams.tabNum || '0').match(/\d+/g)
          execParams.tabNumSort = Array.isArray(tabNumList) ? Number(`${(tabNumList[0] || '0').substring(0, 12)}.${((tabNumList[1] || '0').padStart(6, '0')).substring(0, 6)}`) : 0
          execParams.tabNumMain = Array.isArray(tabNumList) ? Number((tabNumList[0] || '0').substring(0, 12)) : 0
          execParams.tabNumIndex = Array.isArray(tabNumList) ? Number((tabNumList[1] || '0').substring(0, 6)) : 0
          execParams.description = employee.fullFIO + ' [' + (execParams.tabNum || '') + ']'
          execParams.dateFrom = new Date(Math.min(new Date(studentData.dateFromGroup), new Date(studentData.dateFromStudy)))

          let empLongTermAbscParams = null
          if (studentData.dateFromVacation && studentData.dateToVacation) {
            empLongTermAbscParams = {
              organizationID: orgID,
              employeeNumberID: employeeNumber.ID,
              dateFrom: studentData.dateFromVacation,
              dateTo: studentData.dateToVacation
            }
          }

          let studStipendParams = null
          if (studentData.averageScore && studentData.typeStipend && studentData.dateFromScore) {
            studStipendParams = {
              employeeID: employee.ID,
              employeeNumberID: employeeNumber.ID,
              dateFrom: studentData.dateFromScore,
              dateTo: dateService.maxDate(),
              averageScore: parseInt(studentData.averageScore) || 0
            }

            let dictTypeStipend = UB.Repository('hr_dictTypeStipend')
              .attrs(['ID'])
              .where('code', '=', studentData.typeStipend)
              .selectSingle()
            if (dictTypeStipend) { studStipendParams.typeStipend = dictTypeStipend.ID } else {
              const dictTypeStipendStore = UB.DataStore('hr_dictTypeStipend')
              const dictTypeStipendID = dictTypeStipendStore.generateID()
              dictTypeStipendStore.run('insert', {
                execParams: {
                  ID: dictTypeStipendID,
                  code: studentData.typeStipend,
                  description: studentData.typeStipend
                }
              })
              studStipendParams.typeStipend = dictTypeStipendID
            }
          }

          let studEducationKindParams = null
          if (studentData.tabNum && studentData.dateFromStudy && studentData.typeStudy && studentData.formStudy) {
            studEducationKindParams = {
              employeeID: employee.ID,
              employeeNumberID: employeeNumber.ID,
              tabNum: studentData.tabNum,
              dateFrom: studentData.dateFromScore,
              dateTo: dateService.maxDate(),
              formStudy: studentData.formStudy
            }
            let dictTypeStudy = UB.Repository('hr_dictTypeStudy')
              .attrs(['ID'])
              .where('code', '=', studentData.typeStudy)
              .selectSingle()
            if (dictTypeStudy) { studEducationKindParams.typeStudy = dictTypeStudy.ID } else {
              const dictTypeStudyStore = UB.DataStore('hr_dictTypeStudy')
              const dictTypeStudyID = dictTypeStudyStore.generateID()
              dictTypeStudyStore.run('insert', {
                execParams: {
                  ID: dictTypeStudyID,
                  code: studentData.typeStudy,
                  description: studentData.typeStudy
                }
              })
              studEducationKindParams.typeStudy = dictTypeStudyID
            }
          }

          let studEducationHistoryParams = null
          if (studentData.dateFromGroup && studentData.semester && studentData.groupNum) {
            studEducationHistoryParams = {
              employeeID: employee.ID,
              employeeNumberID: employeeNumber.ID,
              dateFrom: studentData.dateFromGroup,
              dateTo: dateService.maxDate(),
              semester: parseInt(studentData.semester) || 0
            }
            let group = UB.Repository('hr_dictStudGroup')
              .attrs(['ID'])
              .where('name', '=', studentData.groupNum)
              .selectSingle()
            if (group) { studEducationHistoryParams.groupID = group.ID } else {
              const dictStudGroupStore = UB.DataStore('hr_dictStudGroup')
              const groupID = dictStudGroupStore.generateID()
              dictStudGroupStore.run('insert', {
                execParams: {
                  ID: groupID,
                  code: studentData.groupNum,
                  description: studentData.groupNum
                }
              })
              studEducationHistoryParams.groupID = groupID
            }
          }

          employeeNumberStore.run('insert', { execParams })
          if (empLongTermAbscParams) {
            empLongTermAbscStore.run('insert', { execParams: empLongTermAbscParams })
          }
          if (studStipendParams) {
            studStipendStore.run('insert', { execParams: studStipendParams })
          }
          if (studEducationKindParams) {
            studEducationKindStore.run('insert', { execParams: studEducationKindParams })
          }
          if (studEducationHistoryParams) {
            studEducationHistoryStore.run('insert', { execParams: studEducationHistoryParams })
          }
          App.dbCommit()
        }

        let employeePosition = UB.Repository('hr_employeePosition')
          .attrs(['ID'])
          .where('organizationID', '=', orgID)
          .where('employeeID', '=', employee.ID)
          .where('employeeNumberID', '=', employeeNumber.ID).limit(1)
          .selectSingle()

        if (!employeePosition) {
          const employeePositionStore = UB.DataStore('hr_employeePosition')
          const employeePositionID = employeePositionStore.generateID()
          employeePosition = { ID: employeePositionID }
          let execParams = { ID: employeePosition.ID, employeeID: employee.ID, employeeNumberID: employeeNumber.ID, organizationID: orgID }
          execParams.dateFrom = new Date(Math.min(new Date(studentData.dateFromGroup), new Date(studentData.dateFromStudy)))
          execParams.orderID = orderID
          employeePositionStore.run('insert', { execParams })
          App.dbCommit()
        }
      }
      try {
        db.savepointWrap(createStudentCard)
      } catch (error) {
        errorMessages.push(error.message)
      }
    })
  }

  return {
    state: errorMessages.length ? '3' : '4',
    logCount: errorMessages.length,
    errorMessages
  }
}

function dictImport (importParams, insertData, orgID, params, importPlan) {
  const errorMessages = []
  clearLostLinks(importParams.entityName, orgID, errorMessages)
  if (importParams.entityName === 'hr_employeePosition' && params.updateByStaff) {
    let store = UB.DataStore('hr_employeePosition')
    store.execSQL(`UPDATE hr_employeePosition SET mi_deleteUser = :userID:, mi_deleteDate = '2000-01-01' 
  WHERE organizationID = :orgID: AND mi_deleteDate >= '9999-12-31' 
  and ID NOT IN (SELECT m1.outputID from hr_importMap m1 where m1.orgID = :orgID: and m1.entityName = 'hr_employeePosition' and m1.outputID is not null)`,
    { orgID: orgID })
  }
  const db = App.dbConnections[App.domainInfo.entities.ubm_enum.connectionName]
  if (insertData.length) {
    let dictStore = UB.DataStore(importParams.entityName)
    let importMapStore = UB.DataStore('hr_importMap')
    let defaultValues
    if (importParams.defaultValues) {
      defaultValues = {}
      Object.keys(importParams.defaultValues).forEach(attrName => {
        defaultValues[attrName] = importParams.defaultValues[attrName](orgID)
      })
    }
    if (importParams.onBeforeImport) {
      importParams.onBeforeImport(importParams.entityName, orgID)
    }

    let impID
    let count = 1
    const dependence = getDependence(importParams.dependence, orgID)
    const dependenceOrg = params.isOrgList ? getDependenceOrg(orgID) : null
    const dependenceEmployeeOrg = params.isOrgList ? getDependenceEmployeeOrg(orgID) : null
    insertData.forEach((row, idx) => {
      const insertRow = () => {
        let added = true
        const map = row.map
        delete row.map
        delete row.orgID
        impID = row.impID
        if (defaultValues) {
          Object.assign(row, defaultValues)
        }
        if (!importParams.skipSetDate && global[importParams.entityName].entity.attributes.dateFrom && !row.dateFrom) {
          row.dateFrom = dateService.minDate()
        }
        if (!importParams.skipSetDate && global[importParams.entityName].entity.attributes.dateTo && !row.dateTo) {
          row.dateTo = dateService.maxDate()
        }
        if (importParams.entityName === 'hr_employeePosition') {
          if (insertData[idx + 1] && insertData[idx + 1].employeeNumberID === row.employeeNumberID &&
            dateService.shiftDate(row.dateTo) >= dateService.shiftDate(insertData[idx + 1].dateFrom)) {
            if (dateService.shiftDate(row.dateFrom).getTime() === dateService.shiftDate(insertData[idx + 1].dateFrom).getTime() &&
              dateService.shiftDate(row.dateTo).getTime() === dateService.shiftDate(insertData[idx + 1].dateTo).getTime()) {
              added = false
            } else {
              row.dateTo = dateService.addDays(dateService.shiftDate(insertData[idx + 1].dateFrom), -1)
            }
          }
        }

        if (importParams.dependence && added) {
          Object.keys(importParams.dependence).forEach(attrKey => {
            if (row[attrKey] !== null && row[attrKey] !== undefined) {
              const attrID = row[attrKey]
              const mapRow = accrualService.binarySearch(dependence[attrKey], Number(row[attrKey]), 0, dependence[attrKey].length - 1, 'inputID')
              row[attrKey] = mapRow ? mapRow.outputID : null
              if (row[attrKey] === null) {
                errorMessages.push(UB.i18n(`ID({0}) Не знайдено значення {1} з ID {2} в таблиці відповідності`, impID, attrKey, attrID))
                if (!global[importParams.entityName].entity.attributes[attrKey].allowNull) {
                  added = false
                }
              }
            }
          })
        }
        if (importParams.outAttrConfig && added) {
          Object.keys(importParams.outAttrConfig).forEach(attrKey => {
            row[attrKey] = importParams.outAttrConfig[attrKey](row[attrKey], orgID, row)
          })
        }

        let rowOrgID = orgID
        if (params.isOrgList && row.impOrgID) {
          const attrOrg = getAttrOrg(row)
          if (attrOrg) {
            rowOrgID = getRowOrgID(row, dependenceOrg, dependenceEmployeeOrg)
            if (rowOrgID) {
              row[attrOrg] = rowOrgID
              if (importPlan.attrList) {
                importPlan.attrList.push(attrOrg)
              }
            } else {
              errorMessages.push(UB.i18n(`ID({0}) Не знайдено організацію в таблиці відповідності`, impID))
              added = false
            }
          }
        }
        delete row.impOrgID

        if (importParams.checkAddRow && added) {
          added = importParams.checkAddRow(rowOrgID, row, map, impID, errorMessages)
        }
        const beforeInsert = (importParams.beforeInsert && added) ? importParams.beforeInsert(rowOrgID, row, importParams, params, map) : null
        delete row.impID

        if (importParams.removeAttr && added) {
          importParams.removeAttr.forEach(attrName => {
            delete row[attrName]
          })
        }
        let externalID = row.externalID
        let extrnlSystmCode = row.extrnlSystmCode
        if ((!row.externalID && row.extrnlSystmCode) || (row.externalID && !row.extrnlSystmCode) || (row.externalID && row.extrnlSystmCode && !Number.isInteger(row.externalID))) {
          added = false
          errorMessages.push(UB.i18n(`ID({0}) Відсутній один з обов'язкових атрибутів (extrnlSystmCode або externalID)`, row.impID))
        }
        if (importParams.entityName !== 'ac_integrateMap') {
          delete row.externalID
          delete row.extrnlSystmCode
        }

        let entityID
        if (added) {
          if (importParams.checkBeforeInsert) {
            importParams.checkBeforeInsert(rowOrgID, row)
          }
          if (map && map.outputID) {
            if (params.isUpdate) {
              row.ID = map.outputID
              if (importParams.removeAttrBeforeUpdate) {
                importParams.removeAttrBeforeUpdate.forEach(attrName => {
                  if (!row[attrName]) {
                    delete row[attrName]
                  }
                })
              }
              if (importPlan.attrList) {
                Object.keys(row).forEach(attrName => {
                  if (!importPlan.attrList.includes(attrName) &&
                    (!['d0', 'd0Value'].includes(attrName) || (['d0', 'd0Value'].includes(attrName) && !importPlan.attrList.includes('dictCostTypeID')))) {
                    delete row[attrName]
                  }
                })
              }
              dictStore.run('update', { isImport: true, __skipOptimisticLock: true, execParams: row })
              entityID = row.ID
            }
          } else {
            if (params.isAddNew) {
              row.ID = dictStore.generateID()
              dictStore.run('insert', { isImport: true, execParams: row })
              if (importParams.detailScript) {
                importParams.detailScript(row, rowOrgID)
              }
              entityID = row.ID
              importMapStore.run('update', {
                __skipOptimisticLock: true,
                __skipSelectAfterUpdate: true,
                __skipUsingAllFieldsForSelectBeforeUpdate: true,
                __skipRls: true,
                __skipAclRls: true,
                execParams: {
                  ID: map.ID,
                  outputID: row.ID,
                  outputCode: row[importParams.codeAttr],
                  outputName: row[importParams.nameAttr]
                }
              })
            }
          }
          if (externalID && extrnlSystmCode && entityID && importParams.entityName !== 'ac_integrateMap') {
            const integrateMap = UB.Repository('ac_integrateMap')
              .attrs(['ID'])
              .where('extrnlSystmCode', '=', extrnlSystmCode)
              .where('externalID', '=', externalID)
              .selectSingle()
            if (!integrateMap) {
              const integrateMapStore = UB.DataStore('ac_integrateMap')
              integrateMapStore.run('insert', {
                __skipOptimisticLock: true,
                execParams: {
                  internalID: entityID,
                  entityName: importParams.entityName,
                  extrnlSystmCode: extrnlSystmCode,
                  externalID: externalID
                }
              })
            }
          }
        }
        if (importParams.afterInsert) {
          importParams.afterInsert(rowOrgID, row, importParams, params, map, beforeInsert, errorMessages, impID)
        }
        console.log(`import row ${count} impID ${impID}`)
      }
      try {
        db.savepointWrap(insertRow)
      } catch (error) {
        errorMessages.push(`ID(${impID}) ${error.message}`)
        console.log(`import row ${count} impID ${impID} Error`)
      }
      count++
      if (count % 1000 === 0) {
        App.dbCommit()
        dictStore.freeNative()
        importMapStore.freeNative()
        dictStore = UB.DataStore(importParams.entityName)
        importMapStore = UB.DataStore('hr_importMap')
      }
    })
  }

  if (importParams.entityName === 'hr_employeePosition' && params.updateByStaff) {
    let store = UB.DataStore('hr_employeePosition')
    const employeeNumbers = UB.Repository('hr_employeeNumberS')
      .attrs(['ID', 'dateFrom', 'dateTo'])
      .where('orgID', '=', orgID)
      .selectAsObject()
    employeeNumbers.forEach(employeeNumber => {
      store.runSQL(`SELECT p.ID AS "ID", p.dateFrom AS "dateFrom", p.dateTo AS "dateTo", p.departmentID AS "departmentID",
       p.positionID AS "positionID", p.dictPositionID AS "dictPositionID", p.dictWagePayID AS "dictWagePayID",
       p.workPlace AS "workPlace", p.dictRankID AS "dictRankID", p.contractType AS "contractType", p.dictContractKindID AS "dictContractKindID",
       p.planDateTo AS "planDateTo", p.dictTarifCoeffID AS "dictTarifCoeffID", p.isResponsible AS "isResponsible",
       p.paraID AS "paraID", p.orderID AS "orderID", p.changeOrderID AS "changeOrderID"
      FROM hr_employeePosition p 
      JOIN hr_importMap m1 on m1.orgID = :orgID: and m1.entityName = 'hr_employeePosition' and m1.outputID = p.ID
    WHERE p.employeeNumberID = :employeeNumberID: AND p.mi_deleteDate >= '9999-12-31'
    ORDER BY p.dateTo desc
    `, {
        orgID: orgID,
        employeeNumberID: employeeNumber.ID
      })
      const payData = store.getAsJsObject()
      if (payData.length) {
        const payEmployeePositionID = payData[0].ID
        store.runSQL(`SELECT p.ID AS "ID", p.dateFrom AS "dateFrom", p.departmentID AS "departmentID", p.positionID AS "positionID",
         p.dictPositionID AS "dictPositionID", p.dictWagePayID AS "dictWagePayID", p.workPlace AS "workPlace",
         p.dictRankID AS "dictRankID", p.contractType AS "contractType", p.dictContractKindID AS "dictContractKindID",
         p.planDateTo AS "planDateTo", p.dictTarifCoeffID AS "dictTarifCoeffID", p.isResponsible AS "isResponsible",
         p.paraID AS "paraID", p.orderID AS "orderID", p.changeOrderID AS "changeOrderID", 
         p.accountID AS "accountID", p.d0, p.d1, p.d2, p.d3, p.d4, p.d5, p.d6, p.d7, p.d8, p.d9,
         p.d0Value AS "d0Value", p.d1Value AS "d1Value", p.d2Value AS "d2Value", p.d3Value AS "d3Value", p.d4Value AS "d4Value",
         p.d5Value AS "d5Value", p.d6Value AS "d6Value", p.d7Value AS "d7Value", p.d8Value AS "d8Value", p.d9Value AS "d9Value"
      FROM hr_employeePosition p 
    LEFT JOIN hr_importMap m1 on m1.orgID = :orgID: and m1.entityName = 'hr_employeePosition' and m1.outputID = p.ID
    WHERE p.employeeNumberID = :employeeNumberID: AND p.mi_deleteDate = '2000-01-01' and m1.ID IS NULL
    and p.dateFrom <= :dateFrom: and p.dateTo >= :dateFrom:
    ORDER BY p.dateTo desc
    `, {
          orgID: orgID,
          employeeNumberID: employeeNumber.ID,
          dateFrom: dateService.shiftDate(payData[0].dateFrom),
          dateTo: dateService.shiftDate(payData[0].dateTo)
        })
        const hrData = store.getAsJsObject()
        if (hrData.length) {
          const hrEmployeePosition = hrData[0]
          const hrEmployeePositionID = hrData[0].ID
          store.execSQL(`UPDATE hr_employeePosition SET 
        departmentID = :departmentID:, positionID = :positionID:, dictPositionID = :dictPositionID:, dictWagePayID = :dictWagePayID:,
        workPlace = :workPlace:, dictRankID = :dictRankID:, 
        contractType = :contractType:, dictContractKindID = :dictContractKindID:, planDateTo = :planDateTo:,
        dictTarifCoeffID = :dictTarifCoeffID:, isResponsible = :isResponsible:, paraID = :paraID:, orderID = :orderID:, changeOrderID = :changeOrderID:,
        accountID = :accountID:, d0 = :d0:, d1 = :d1:, d2 = :d2:, d3 = :d3:, d4 = :d4:, d5 = :d5:, d6 = :d6:, d7 = :d7:, d8 = :d8:, d9 = :d9:,
        d0Value = :d0Value:, d1Value = :d1Value:, d2Value = :d2Value:, d3Value = :d3Value:, d4Value = :d4Value:, d5Value = :d5Value:,
        d6Value = :d6Value:, d7Value = :d7Value:, d8Value = :d8Value:, d9Value = :d9Value:
        WHERE ID = :ID: `, {
            ID: payEmployeePositionID,
            departmentID: hrEmployeePosition.departmentID,
            positionID: hrEmployeePosition.positionID,
            dictPositionID: hrEmployeePosition.dictPositionID,
            dictWagePayID: hrEmployeePosition.dictWagePayID,
            workPlace: hrEmployeePosition.workPlace,
            dictRankID: hrEmployeePosition.dictRankID,
            contractType: hrEmployeePosition.contractType,
            dictContractKindID: hrEmployeePosition.dictContractKindID,
            planDateTo: hrEmployeePosition.planDateTo,
            dictTarifCoeffID: hrEmployeePosition.dictTarifCoeffID,
            isResponsible: hrEmployeePosition.isResponsible,
            paraID: hrEmployeePosition.paraID,
            orderID: hrEmployeePosition.orderID,
            changeOrderID: hrEmployeePosition.changeOrderID,
            accountID: hrEmployeePosition.accountID,
            d0: hrEmployeePosition.d0,
            d1: hrEmployeePosition.d1,
            d2: hrEmployeePosition.d2,
            d3: hrEmployeePosition.d3,
            d4: hrEmployeePosition.d4,
            d5: hrEmployeePosition.d5,
            d6: hrEmployeePosition.d6,
            d7: hrEmployeePosition.d7,
            d8: hrEmployeePosition.d8,
            d9: hrEmployeePosition.d9,
            d0Value: hrEmployeePosition.d0Value,
            d1Value: hrEmployeePosition.d1Value,
            d2Value: hrEmployeePosition.d2Value,
            d3Value: hrEmployeePosition.d3Value,
            d4Value: hrEmployeePosition.d4Value,
            d5Value: hrEmployeePosition.d5Value,
            d6Value: hrEmployeePosition.d6Value,
            d7Value: hrEmployeePosition.d7Value,
            d8Value: hrEmployeePosition.d8Value,
            d9Value: hrEmployeePosition.d9Value
          })
          store.execSQL(`UPDATE hr_employeeWorkbook SET employeePositionID = :payEmployeePositionID: WHERE employeePositionID = :hrEmployeePositionID: `, {
            payEmployeePositionID,
            hrEmployeePositionID
          })
          payData.forEach(row => {
            if (row.ID !== payEmployeePositionID) {
              const hrPos = hrData.find(o => dateService.shiftDate(o.dateFrom).getTime() === dateService.shiftDate(row.dateFrom).getTime() && o.ID !== hrEmployeePositionID)
              if (hrPos) {
                store.execSQL(`UPDATE hr_employeePosition SET 
                contractType = :contractType:, paraID = :paraID:, orderID = :orderID:, dictContractKindID = :dictContractKindID:,
                workPlace = :workPlace:, dictWagePayID = :dictWagePayID:
                WHERE ID = :ID: `, {
                  ID: row.ID,
                  contractType: hrPos.contractType,
                  paraID: hrPos.paraID,
                  orderID: hrPos.orderID,
                  dictContractKindID: hrPos.dictContractKindID,
                  workPlace: hrPos.workPlace,
                  dictWagePayID: hrPos.dictWagePayID
                })
              }
            }
          })
          hrData.forEach(row => {
            store.execSQL(`UPDATE hr_employeePosition SET mi_deleteUser = :userID:, mi_deleteDate = '2000-01-01' WHERE ID = :ID:`,
              { ID: row.ID, userID: Session.uData.userID })
          })
        }
      }
    })
    store.runSQL(`select n.ID AS "ID", n.description from hr_employeeNumber n
    where n.orgID = :orgID: and n.mi_deleteDate >= '9999-12-31'
    and EXISTS (SELECT 1 from  hr_employeePosition p WHERE p.employeeNumberID = n.ID AND p.mi_deleteDate = '2000-01-01')
    and NOT EXISTS (SELECT 1 from  hr_employeePosition p 
    JOIN hr_importMap m1 ON  m1.outputID = p.ID AND m1.orgID = :orgID: and m1.entityName = 'hr_employeePosition'  WHERE p.employeeNumberID = n.ID)`,
    { orgID: orgID })
    const restoreData = store.getAsJsObject()
    restoreData.forEach(empNum => {
      errorMessages.push(`Відновленно всі призначення працівника ${empNum.description}`)
      store.execSQL(`UPDATE hr_employeePosition SET mi_deleteUser = null, mi_deleteDate = '9999-12-31' 
  WHERE organizationID = :orgID: AND employeeNumberID = :employeeNumberID: AND mi_deleteDate = '2000-01-01'`,
      { orgID: orgID, employeeNumberID: empNum.ID })
    })
    if (params.updateByStaffDate) {
      store.runSQL(`SELECT description FROM hr_employeePosition 
  WHERE organizationID = :orgID: AND mi_deleteDate = '2000-01-01' and dateFrom >= :dateFrom: 
  and ID NOT IN (SELECT m1.outputID from hr_importMap m1 where m1.orgID = :orgID: and m1.entityName = 'hr_employeePosition' and m1.outputID is not null)`,
      { orgID: orgID, dateFrom: dateService.shiftDate(params.updateByStaffDate) })
      const restorePositionData = store.getAsJsObject()
      restorePositionData.forEach(empPos => {
        errorMessages.push(`Відновленно призначення ${empPos.description}`)
      })
      store.execSQL(`UPDATE hr_employeePosition SET mi_deleteUser = null, mi_deleteDate = '9999-12-31' 
  WHERE organizationID = :orgID: AND mi_deleteDate = '2000-01-01' and dateFrom >= :dateFrom: 
  and ID NOT IN (SELECT m1.outputID from hr_importMap m1 where m1.orgID = :orgID: and m1.entityName = 'hr_employeePosition' and m1.outputID is not null)`,
      { orgID: orgID, dateFrom: dateService.shiftDate(params.updateByStaffDate) })
    }
  }

  return {
    state: errorMessages.length ? '3' : '4',
    logCount: errorMessages.length,
    errorMessages
  }
}

function dictImportDt (importParams, insertData, orgID, params, importPlan) {
  const errorMessages = []
  const db = App.dbConnections[App.domainInfo.entities.ubm_enum.connectionName]
  if (insertData.length) {
    let dictStore = UB.DataStore(importParams.entityName)
    let importMapStore = UB.DataStore('hr_importMap')
    let defaultValues
    if (importParams.defaultValues) {
      defaultValues = {}
      Object.keys(importParams.defaultValues).forEach(attrName => {
        defaultValues[attrName] = importParams.defaultValues[attrName](orgID)
      })
    }
    if (importParams.onBeforeImport) {
      importParams.onBeforeImport(dictStore, orgID)
    }
    if (importParams.parentAttrIdentifier) {
      const removeIdent = []
      const parents = UB.Repository('hr_importMap')
        .attrs('ID', 'inputID', 'outputID').where('orgID', '=', orgID)
        .where('entityName', '=', importParams.parentEntityName)
        .orderBy('inputID')
        .selectAsObject()
      const store = UB.DataStore(importParams.entityName)
      insertData.forEach(row => {
        const identValue = accrualService.binarySearch(parents, Number(row[importParams.parentAttrIdentifier]), 0, parents.length - 1, 'inputID')
        if (identValue && !removeIdent.includes(identValue.outputID)) {
          const build = UB.Repository(importParams.entityName)
            .attrs(['ID'])
            .where(importParams.parentAttrIdentifier, '=', identValue.outputID)
            .selectAsObject()
          build.forEach(item => {
            store.run('delete', { isImport: true, execParams: { ID: item.ID } })
          })
          removeIdent.push(identValue.outputID)
        }
      })
    }

    let impID
    let count = 1
    const dependence = getDependence(importParams.dependence, orgID)
    const dependenceOrg = params.isOrgList ? getDependenceOrg(orgID) : null
    const dependenceEmployeeOrg = params.isOrgList ? getDependenceEmployeeOrg(orgID) : null
    insertData.forEach(row => {
      const insertRow = () => {
        let added = true
        const map = row.map
        delete row.map
        delete row.orgID
        impID = row.impID
        delete row.impID
        if (defaultValues) {
          Object.assign(row, defaultValues)
        }
        if (global[importParams.entityName].entity.attributes.dateFrom && !row.dateFrom) {
          row.dateFrom = dateService.minDate()
        }
        if (global[importParams.entityName].entity.attributes.dateTo && !row.dateTo) {
          row.dateTo = dateService.maxDate()
        }
        if (importParams.dependence) {
          Object.keys(importParams.dependence).forEach(attrKey => {
            if (row[attrKey] !== null && row[attrKey] !== undefined) {
              const attrID = row[attrKey]
              const mapRow = accrualService.binarySearch(dependence[attrKey], Number(row[attrKey]), 0, dependence[attrKey].length - 1, 'inputID')
              row[attrKey] = mapRow ? mapRow.outputID : null
              if (row[attrKey] === null) {
                errorMessages.push(UB.i18n(`ID({0}) Не знайдено значення {1} з ID {2} в таблиці відповідності`, impID, attrKey, attrID))
                if (!global[importParams.entityName].entity.attributes[attrKey].allowNull) {
                  added = false
                }
              }
            }
          })
        }

        let rowOrgID = orgID
        if (params.isOrgList && row.impOrgID) {
          const attrOrg = getAttrOrg(row)
          if (attrOrg) {
            rowOrgID = getRowOrgID(row, dependenceOrg, dependenceEmployeeOrg)
            if (rowOrgID) {
              row[attrOrg] = rowOrgID
            } else {
              errorMessages.push(UB.i18n(`ID({0}) Не знайдено організацію в таблиці відповідності`, impID))
              added = false
            }
          }
        }
        delete row.impOrgID

        if (added && params.isAddNew) {
          row.ID = dictStore.generateID()
          dictStore.run('insert', { isImport: true, execParams: row })
          importMapStore.run('update', {
            __skipOptimisticLock: true,
            __skipSelectAfterUpdate: true,
            __skipUsingAllFieldsForSelectBeforeUpdate: true,
            __skipRls: true,
            __skipAclRls: true,
            execParams: {
              ID: map.ID,
              outputID: row.ID,
              outputCode: row[importParams.codeAttr],
              outputName: row[importParams.nameAttr]
            }
          })
          if (importParams.detailScript) {
            importParams.detailScript(row, rowOrgID)
          }
        }
        console.log(`import row ${count} impID ${impID}`)
      }
      try {
        db.savepointWrap(insertRow)
      } catch (error) {
        errorMessages.push(`ID(${impID}) ${error.message}`)
        console.log(`import row ${count} impID ${impID} Error`)
      }
      count++
      if (count % 1000 === 0) {
        App.dbCommit()
        dictStore.freeNative()
        importMapStore.freeNative()
        dictStore = UB.DataStore(importParams.entityName)
        importMapStore = UB.DataStore('hr_importMap')
      }
    })
  }
  return {
    state: errorMessages.length ? '3' : '4',
    logCount: errorMessages.length,
    errorMessages
  }
}

function dictAccrualFundSQL (importParams, orgID, params) {
  let storeLog = UB.DataStore('hr_importLog')
  let dictStore = UB.DataStore(importParams.entityName)
  let importMapStore = UB.DataStore('hr_importMap')
  let errorMessagesCount = 0
  const currentPeriod = periodService.getCurrentPeriod(orgID)
  const db = App.dbConnections[App.domainInfo.entities.ubm_enum.connectionName]
  const insertRow = () => {
    let calcPeriodFrom
    let calcPeriodTo
    if (params.periodFromID) {
      calcPeriodFrom = periodService.getPeriod(params.periodFromID).dateFrom
    }
    if (params.periodToID) {
      calcPeriodTo = periodService.getPeriod(params.periodToID).dateFrom
    }
    if (!params.notDeleteAccrual) {
      if (importParams.withDetail) {
        dictStore.execSQL(`DELETE FROM ${importParams.entityName}Dt WHERE ${importParams.entityName.replace('hr_', '')}ID in
    (SELECT d.ID FROM ${importParams.entityName} d JOIN hr_dictPeriod p ON p.ID = d.periodCalcID where d.orgID = :orgID: 
     ${calcPeriodFrom ? ' AND p.dateFrom >= :calcPeriodFrom: ' : ''}
    ${calcPeriodTo ? ' AND p.dateFrom <= :calcPeriodTo: ' : ''}
    )`,
        { orgID: orgID, calcPeriodFrom, calcPeriodTo })
      }
      dictStore.execSQL(`DELETE FROM ${importParams.entityName} WHERE ID in
    (SELECT d.ID FROM ${importParams.entityName} d JOIN hr_dictPeriod p ON p.ID = d.periodCalcID where d.orgID = :orgID: 
     ${calcPeriodFrom ? ' AND p.dateFrom >= :calcPeriodFrom: ' : ''}
    ${calcPeriodTo ? ' AND p.dateFrom <= :calcPeriodTo: ' : ''}
    )`,
      { orgID: orgID, calcPeriodFrom, calcPeriodTo })
    }
    const periodFrom = UB.Repository(importParams.impEntityName)
      .attrs(importParams.withDetail ? ['MIN([periodCalc])', 'MIN([periodSalary])'] : ['MIN([periodCalc])']).where('orgID', '=', orgID)
      .limit(1)
      .selectSingle()
    const startDate = dateService.firstDayOfMonth(Math.min(periodFrom['MIN([periodCalc])'] ? dateService.shiftDate(periodFrom['MIN([periodCalc])']) : dateService.currentDate(),
      periodFrom['MIN([periodSalary])'] ? dateService.shiftDate(periodFrom['MIN([periodSalary])']) : dateService.currentDate()))
    periodService.createPeriod({ orgID, onDate: dateService.currentDate(), setCurrent: false, startDate })
    dictStore.execSQL(`insert into hr_accrualFund (ID, periodCalcID, periodSalaryID, periodCalc, periodSalary, employeeNumberID, payFundID, sourceSum, baseSum, addMinSum, rate, paySum, orgID) 
                          select a1.ID,p1.ID periodCalcID, p2.ID periodSalaryID, a1.periodCalc, a1.periodSalary,  m2.outputID employeeNumberID,
                             m1.outputID payFundID, a1.sourceSum, a1.baseSum, a1.addMinSum, a1.rate, coalesce(a1.paySum, 0), :orgID: orgID
                      from hr_importAccrualFund a1
                              inner join hr_importMap m1 on m1.orgID = :orgID: and m1.entityName = 'hr_payFund' and m1.inputID = a1.payFundID and m1.outputID is not null
                              inner join hr_dictPeriod p1 on p1.orgID = :orgID: and p1.dateFrom = a1.periodCalc and p1.mi_deleteDate >= '9999-12-31'
                              inner join hr_dictPeriod p2 on p2.orgID = :orgID: and p2.dateFrom = a1.periodSalary and p2.mi_deleteDate >= '9999-12-31'
                              inner join hr_importMap m2 on m2.orgID = :orgID: and m2.entityName = 'hr_employeeNumber' and m2.inputID = a1.employeeNumberID and m2.outputID is not null
                              join hr_employeeNumber n on n.ID = m2.outputID and n.mi_deleteDate >= '9999-12-31'
                      where a1.orgID = :orgID: AND a1.periodCalc < :periodCalc: 
                       ${calcPeriodFrom ? 'AND a1.periodCalc >= :calcPeriodFrom:' : ''}
                            ${calcPeriodTo ? 'AND a1.periodCalc <= :calcPeriodTo:' : ''}
                      `,
    {
      orgID: orgID,
      periodCalc: currentPeriod.dateFrom,
      calcPeriodFrom,
      calcPeriodTo
    })
    importMapStore.execSQL(`update hr_importMap SET
    outputID = subquery.ID
    FROM (select ID, impID from hr_importAccrualFund where orgID = :orgID: AND periodCalc < :periodCalc:) AS subquery
    WHERE hr_importMap.inputID = subquery.impID AND hr_importMap.orgID = :orgID: AND hr_importMap.entityName = 'hr_accrualFund';`,
    { orgID: orgID, periodCalc: currentPeriod.dateFrom })
  }
  try {
    db.savepointWrap(insertRow)
  } catch (error) {
    errorMessagesCount++
    storeLog.run('insert', {
      __skipOptimisticLock: true,
      __skipSelectAfterInsert: true,
      __skipRls: true,
      __skipAclRls: true,
      execParams: {
        orgID: orgID,
        entityName: importParams.entityName,
        description: `${error.message}`.substring(0, 1999)
      }
    })
  }
  return {
    state: errorMessagesCount ? '3' : '4',
    logCount: errorMessagesCount,
    errorMessages: []
  }
}

function dictAccrualSQL (importParams, orgID, params) {
  let storeLog = UB.DataStore('hr_importLog')
  let dictStore = UB.DataStore(importParams.entityName)
  let importMapStore = UB.DataStore('hr_importMap')
  const currentPeriod = periodService.getCurrentPeriod(orgID)
  let errorMessagesCount = 0
  const db = App.dbConnections[App.domainInfo.entities.ubm_enum.connectionName]
  const insertRow = () => {
    let calcPeriodFrom
    let calcPeriodTo
    if (params.periodFromID) {
      calcPeriodFrom = periodService.getPeriod(params.periodFromID).dateFrom
    }
    if (params.periodToID) {
      calcPeriodTo = periodService.getPeriod(params.periodToID).dateFrom
    }
    if (!params.notDeleteAccrual) {
      if (importParams.withDetail) {
        dictStore.execSQL(`DELETE FROM ${importParams.entityName}Dt WHERE ${importParams.entityName.replace('hr_', '')}ID in
    (SELECT d.ID FROM ${importParams.entityName} d JOIN hr_dictPeriod p ON p.ID = d.periodCalcID 
    where d.orgID = :orgID: AND (p.isClosed = 1 OR d.flagsRec & 8 = 8)
    ${calcPeriodFrom ? ' AND p.dateFrom >= :calcPeriodFrom: ' : ''}
    ${calcPeriodTo ? ' AND p.dateFrom <= :calcPeriodTo: ' : ''}
    )`,
        { orgID: orgID, calcPeriodFrom, calcPeriodTo })

        if (importParams.entityName === 'hr_accrual') {
          dictStore.execSQL(`DELETE FROM hr_taxIndividAcc WHERE accrualID in
    (SELECT d.ID FROM ${importParams.entityName} d JOIN hr_dictPeriod p ON p.ID = d.periodCalcID 
    where d.orgID = :orgID: AND (p.isClosed = 1 OR d.flagsRec & 8 = 8)
    ${calcPeriodFrom ? ' AND p.dateFrom >= :calcPeriodFrom: ' : ''}
    ${calcPeriodTo ? ' AND p.dateFrom <= :calcPeriodTo: ' : ''}
    )`,
          { orgID: orgID, calcPeriodFrom, calcPeriodTo })

          dictStore.execSQL(`DELETE FROM hr_accrualAvg WHERE accrualID in
    (SELECT d.ID FROM ${importParams.entityName} d JOIN hr_dictPeriod p ON p.ID = d.periodCalcID 
    where d.orgID = :orgID: AND (p.isClosed = 1 OR d.flagsRec & 8 = 8)
    ${calcPeriodFrom ? ' AND p.dateFrom >= :calcPeriodFrom: ' : ''}
    ${calcPeriodTo ? ' AND p.dateFrom <= :calcPeriodTo: ' : ''}
    )`,
          { orgID, calcPeriodFrom, calcPeriodTo })
        }
      }
      dictStore.execSQL(`DELETE FROM ${importParams.entityName} WHERE ID in
    (SELECT d.ID FROM ${importParams.entityName} d JOIN hr_dictPeriod p ON p.ID = d.periodCalcID 
    where d.orgID = :orgID: AND (p.isClosed = 1 OR d.flagsRec & 8 = 8)
    ${calcPeriodFrom ? ' AND p.dateFrom >= :calcPeriodFrom: ' : ''}
    ${calcPeriodTo ? ' AND p.dateFrom <= :calcPeriodTo: ' : ''}
    )`,
      { orgID: orgID, calcPeriodFrom, calcPeriodTo })
    }
    const periodFrom = UB.Repository(importParams.impEntityName)
      .attrs(importParams.withDetail ? ['MIN([periodCalc])', 'MIN([periodSalary])'] : ['MIN([periodCalc])']).where('orgID', '=', orgID)
      .limit(1)
      .selectSingle()

    const startDate = dateService.firstDayOfMonth(Math.min(periodFrom['MIN([periodCalc])'] ? dateService.shiftDate(periodFrom['MIN([periodCalc])']) : dateService.currentDate(),
      periodFrom['MIN([periodSalary])'] ? dateService.shiftDate(periodFrom['MIN([periodSalary])']) : dateService.currentDate()))
    periodService.createPeriod({ orgID, onDate: dateService.currentDate(), setCurrent: false, startDate })

    importMapStore.runSQL(`select a1.ID "ID", pl.ID "elID", a1.payElID "payElID" , n.ID "numID", a1.employeeNumberID "employeeNumberID", a1.periodCalc "periodCalc"
                  from hr_importAccrual a1
                          LEFT JOIN hr_importMap m1 on m1.orgID = :orgID: and m1.entityName = 'hr_payEl' and m1.inputID = a1.payElID and m1.outputID is not null
                          LEFT JOIN hr_payEl pl ON pl.ID = m1.outputID
                          LEFT JOIN hr_importMap m2 on m2.orgID = :orgID: and m2.entityName = 'hr_employeeNumber' and m2.inputID = a1.employeeNumberID and m2.outputID is not null
                          LEFT JOIN hr_employeeNumber n on n.ID = m2.outputID and n.mi_deleteDate >= '9999-12-31'
                          where a1.orgID = :orgID: AND (pl.ID is NULL OR n.ID is NULL OR a1.periodCalc >= :periodCalc:)
                            ${calcPeriodFrom ? 'AND a1.periodCalc >= :calcPeriodFrom:' : ''}
                            ${calcPeriodTo ? 'AND a1.periodCalc <= :calcPeriodTo:' : ''}`,
    {
      orgID,
      periodCalc: currentPeriod.dateFrom,
      calcPeriodFrom,
      calcPeriodTo
    })
    const logData = importMapStore.getAsJsObject()
    logData.forEach(row => {
      errorMessagesCount++
      let message = ''
      if (!row.elID) {
        message = `${message}${message.length ? ' ' : ''} Не знайдено вид оплати payElID = ${row.payElID}`
      }
      if (!row.numID) {
        message = `${message}${message.length ? ' ' : ''} Не знайдено працівника employeeNumberID = ${row.employeeNumberID}`
      }
      if (row.periodCalc && dateService.shiftDate(row.periodCalc) >= currentPeriod.dateFrom) {
        message = `${message}${message.length ? ' ' : ''} Розрахунковий період більше або дорівнює поточному`
      }

      storeLog.run('insert', {
        __skipOptimisticLock: true,
        __skipSelectAfterInsert: true,
        __skipRls: true,
        __skipAclRls: true,
        execParams: {
          orgID: orgID,
          entityName: importParams.entityName,
          description: `ID(${row.ID}) ${message}`.substring(0, 1999)
        }
      })
    })

    dictStore.execSQL(`insert into hr_accrual (
                          ID, payElID, baseSum, paySum, days, hours, periodCalcID, periodSalaryID, employeeNumberID, rate, calculateDate,
                          periodCalc, periodSalary, flagsRec, flagsFix, planHours, planDays, mask, maskAdd, mtCount, dateFrom, dateTo, linkToParentID, linkToChildID,
                          source, sourceID, paymentID, avgCalcType, dateFromAvg, dateToAvg, koef, minSalarySum, sumAvg,
                          planSumAvg, incomingDebtSum, repaymentDebtSum, calculatedSum, repaymentSum, hoursByDays, planHoursByDays,
                          employeeNumberPartID,orderDateFrom, orderDateTo, isAvg, extraRate ,basePayment, orgID,
                          dictFundSourceID, dictProgClassID)
                      select a1.ID,
                          m1.outputID payElID, a1.baseSum, coalesce(a1.paySum, 0) paySum, a1.days, a1.hours,
                          p1.ID periodCalcID, p2.ID periodSalaryID,
                          m2.outputID employeeNumberID
                          ,a1.rate, a1.calculateDate, a1.periodCalc, a1.periodSalary,
                           ((CASE WHEN (COALESCE(a1.flagsRec, 8) & 4096) = 4096 THEN (a1.flagsRec | 8192) ELSE COALESCE(a1.flagsRec, 8) END) | 
                           (CASE WHEN :fixedUser: = 1 AND (mg.groupType <> 'OFFTAKE' OR p2.isClosed = 1) THEN 4 ELSE 0 END) | 
                          (CASE WHEN coalesce(a1.paySum, 0) < 0 THEN 512 ELSE 0 END) | (CASE WHEN pl.ignoreInCalcPay = 1 THEN 8192 ELSE 0 END))   flagsRec, 
                          COALESCE(a1.flagsFix,0) flagsFix, a1.planHours, a1.planDays, 
                          COALESCE(a1.mask, 0) mask, 
                          COALESCE(a1.maskAdd, 0) maskAdd, mtCount, 
                          (CASE WHEN (a1.dateFrom >= p2.dateFrom AND a1.dateFrom <= p2.dateTo) THEN a1.dateFrom ELSE p2.dateFrom END) dateFrom,
                          (CASE WHEN (a1.dateTo >= p2.dateFrom AND a1.dateTo <= p2.dateTo) THEN a1.dateTo ELSE p2.dateTo END) dateTo,
                          a1.linkToParentID, a1.linkToChildID, a1.source, m3.outputID sourceID,
                          a1.paymentID, a1.avgCalcType, a1.dateFromAvg, a1.dateToAvg, a1.koef, a1.minSalarySum, a1.sumAvg,
                          a1.planSumAvg, a1.incomingDebtSum, a1.repaymentDebtSum, a1.calculatedSum, a1.repaymentSum, a1.hoursByDays, a1.planHoursByDays,
                          m4.outputID employeeNumberPartID , a1.orderDateFrom, a1.orderDateTo, a1.isAvg, a1.extraRate, a1.basePayment, :orgID: orgID,
                          m5.outputID dictFundSourceID, m6.outputID dictProgClassID
                  from hr_importAccrual a1
                          inner join hr_importMap m1 on m1.orgID = :orgID: and m1.entityName = 'hr_payEl' and m1.inputID = a1.payElID and m1.outputID is not null
                          JOIN hr_payEl pl ON pl.ID = m1.outputID
                          JOIN hr_method m on pl.methodID = m.ID 
                          JOIN hr_methodGroup mg on m.methodGroupID = mg.ID      
                          inner join hr_dictPeriod p1 on p1.orgID = :orgID: and p1.dateFrom = a1.periodCalc and p1.mi_deleteDate >= '9999-12-31'
                          inner join hr_dictPeriod p2 on p2.orgID = :orgID: and p2.dateFrom = a1.periodSalary and p2.mi_deleteDate >= '9999-12-31'
                          inner join hr_importMap m2 on m2.orgID = :orgID: and m2.entityName = 'hr_employeeNumber' and m2.inputID = a1.employeeNumberID and m2.outputID is not null
                          join hr_employeeNumber n on n.ID = m2.outputID and n.mi_deleteDate >= '9999-12-31'
                          left join hr_importMap m3 on m3.orgID = :orgID: and m3.entityName = a1.source and m3.inputID = a1.sourceID
                          left join hr_importMap m4 on m4.orgID = :orgID: and m4.entityName = 'hr_employeeNumber' and m4.inputID = a1.employeeNumberPartID
                          left join hr_importMap m5 on m5.orgID = :orgID: and m5.entityName = 'ac_fundSource' and m5.inputID = a1.dictFundSourceID
                          left join hr_importMap m6 on m6.orgID = :orgID: and m6.entityName = 'ac_dictProgClass' and m6.inputID = a1.dictProgClassID
                          where a1.orgID = :orgID: AND a1.periodCalc < :periodCalc:
                            ${calcPeriodFrom ? 'AND a1.periodCalc >= :calcPeriodFrom:' : ''}
                            ${calcPeriodTo ? 'AND a1.periodCalc <= :calcPeriodTo:' : ''}
                          `,
    {
      orgID,
      periodCalc: currentPeriod.dateFrom,
      fixedUser: params.fixedUser ? 1 : 0,
      calcPeriodFrom,
      calcPeriodTo
    })
    importMapStore.execSQL(`update hr_importMap SET
    outputID = subquery.ID
    FROM (select ID, impID from hr_importAccrual where orgID = :orgID: AND periodCalc < :periodCalc:) AS subquery
    WHERE hr_importMap.inputID = subquery.impID AND hr_importMap.orgID = :orgID: AND hr_importMap.entityName = 'hr_accrual';`,
    { orgID: orgID, periodCalc: currentPeriod.dateFrom })
  }
  try {
    db.savepointWrap(insertRow)
  } catch (error) {
    errorMessagesCount++
    storeLog.run('insert', {
      __skipOptimisticLock: true,
      __skipSelectAfterInsert: true,
      __skipRls: true,
      __skipAclRls: true,
      execParams: {
        orgID: orgID,
        entityName: importParams.entityName,
        description: `${error.message}`.substring(0, 1999)
      }
    })
  }
  return {
    state: errorMessagesCount ? '3' : '4',
    logCount: errorMessagesCount,
    errorMessages: []
  }
}

function dictAccrual (importParams, orgID, params) {
  const selectCount = 10000
  let errorMessagesCount = 0
  let storeLog = UB.DataStore('hr_importLog')
  let dictStore = UB.DataStore(importParams.entityName)
  let importMapStore = UB.DataStore('hr_importMap')
  const db = App.dbConnections[App.domainInfo.entities.ubm_enum.connectionName]
  const dependenceOrg = params.isOrgList ? getDependenceOrg(orgID) : null
  const dependenceEmployeeOrg = params.isOrgList ? getDependenceEmployeeOrg(orgID) : null
  if (dependenceOrg && dependenceOrg.hr_organization) {
    dependenceOrg.hr_organization.forEach(depOrg => {
      if (depOrg.outputID) {
        dictStore.execSQL(`DELETE FROM ${importParams.entityName} WHERE employeeNumberID in 
  (select en.ID from  hr_employeeNumber en where en.orgID = :orgID:)
  `,
        { orgID: depOrg.outputID })
      }
    })
  }

  dictStore.execSQL(`DELETE FROM ${importParams.entityName} WHERE employeeNumberID in 
  (select en.ID from  hr_employeeNumber en where en.orgID = :orgID:)
  `,
  { orgID: orgID })
  let defaultValues
  if (importParams.defaultValues) {
    defaultValues = {}
    Object.keys(importParams.defaultValues).forEach(attrName => {
      defaultValues[attrName] = importParams.defaultValues[attrName](orgID)
    })
  }
  const periodFrom = UB.Repository(importParams.impEntityName)
    .attrs(importParams.withDetail ? ['MIN([periodCalc])', 'MIN([periodSalary])'] : ['MIN([periodCalc])'])
    .where('orgID', '=', orgID)
    .limit(1)
    .selectSingle()
  const startDate = dateService.firstDayOfMonth(Math.min(periodFrom['MIN([periodCalc])'] ? dateService.shiftDate(periodFrom['MIN([periodCalc])']) : dateService.currentDate(),
    periodFrom['MIN([periodSalary])'] ? dateService.shiftDate(periodFrom['MIN([periodSalary])']) : dateService.currentDate()))
  periodService.createPeriod({ orgID, onDate: dateService.currentDate(), setCurrent: false, startDate })
  const periodsOrg = {}
  if (dependenceOrg && dependenceOrg.hr_organization) {
    dependenceOrg.hr_organization.forEach(depOrg => {
      if (depOrg.outputID) {
        periodsOrg[depOrg.outputID] = {}
        UB.Repository('hr_dictPeriod')
          .attrs(['ID', 'dateFrom'])
          .where('orgID', '=', depOrg.outputID)
          .orderBy('dateFrom')
          .selectAsObject().forEach(period => {
            periodsOrg[depOrg.outputID][dateService.formatDate(period.dateFrom)] = period.ID
          })
      }
    })
  }

  // const periods = {}
  periodsOrg[orgID] = {}
  UB.Repository('hr_dictPeriod')
    .attrs(['ID', 'dateFrom'])
    .where('orgID', '=', orgID)
    .orderBy('dateFrom')
    .selectAsObject().forEach(period => {
      periodsOrg[orgID][dateService.formatDate(period.dateFrom)] = period.ID
    })
  const dependence = getDependence(importParams.dependence, orgID)

  const sources = getDependence({
    hr_employeeAccrual: 'hr_employeeAccrual',
    hr_payRetention: 'hr_payRetention',
    hr_payPerm: 'hr_payPerm',
    hr_employeePosition: 'hr_employeePosition'
  }, orgID)

  function setAccrual (start) {
    let insertData = UB.Repository(importParams.impEntityName).attrs(['*'])
      .where('orgID', '=', orgID)
      .start(start)
      .limit(selectCount)
      .selectAsObject()
    if (insertData.length) {
      let impID
      let count = 1
      insertData.forEach(row => {
        const insertRow = () => {
          let added = true
          row.ID = dictStore.generateID()
          delete row.orgID
          impID = row.impID
          delete row.impID
          delete row.map
          if (defaultValues) {
            Object.assign(row, defaultValues)
          }

          if (importParams.entityName === 'hr_accrual') {
            if (!row.mask) {
              row.mask = 0
            }
            if (!row.dateFrom) {
              row.dateFrom = dateService.shiftDate(row.periodSalary)
            }
            if (!row.dateTo) {
              row.dateTo = dateService.lastDayOfMonth(row.periodSalary)
            }
            row.dateFrom = dateService.shiftDate(Math.max(dateService.shiftDate(row.dateFrom), dateService.shiftDate(row.periodSalary)))
            row.dateTo = dateService.shiftDate(Math.min(dateService.shiftDate(row.dateTo), dateService.lastDayOfMonth(row.periodSalary)))
            if (row.flagsRec & 4096) {
              row.flagsRec = row.flagsRec | 8192
            }
          }
          if (importParams.dependence) {
            Object.keys(importParams.dependence).forEach(attrKey => {
              if (row[attrKey] !== null && row[attrKey] !== undefined) {
                const attrID = row[attrKey]
                const mapRow = accrualService.binarySearch(dependence[attrKey], Number(row[attrKey]), 0, dependence[attrKey].length - 1, 'inputID')
                row[attrKey] = mapRow ? mapRow.outputID : null
                if (row[attrKey] === null) {
                  errorMessagesCount++
                  storeLog.run('insert', {
                    __skipOptimisticLock: true,
                    __skipSelectAfterInsert: true,
                    __skipRls: true,
                    __skipAclRls: true,
                    execParams: {
                      orgID: orgID,
                      entityName: importParams.entityName,
                      description: UB.i18n(`ID({0}) Не знайдено значення {1} з ID {2} в таблиці відповідності`, impID, attrKey, attrID).substring(0, 1999)
                    }
                  })
                  if (!global[importParams.entityName].entity.attributes[attrKey].allowNull) {
                    added = false
                  }
                }
              }
            })
          }
          if (params.isOrgList) {
            const empOrgID = getRowOrgID(row, dependenceOrg, dependenceEmployeeOrg)
            if (row.periodCalc) {
              row.periodCalcID = periodsOrg[empOrgID || orgID][dateService.formatDate(row.periodCalc)]
            }
            if (row.periodSalary) {
              row.periodSalaryID = periodsOrg[empOrgID || orgID][dateService.formatDate(row.periodSalary)]
            }
          } else {
            if (row.periodCalc) {
              row.periodCalcID = periodsOrg[orgID][dateService.formatDate(row.periodCalc)]
            }
            if (row.periodSalary) {
              row.periodSalaryID = periodsOrg[orgID][dateService.formatDate(row.periodSalary)]
            }
          }
          if (importParams.removeAttr) {
            importParams.removeAttr.forEach(attrName => {
              delete row[attrName]
            })
          }

          let rowOrgID = orgID
          if (params.isOrgList && row.impOrgID) {
            const attrOrg = getAttrOrg(row)
            if (attrOrg) {
              rowOrgID = getRowOrgID(row, dependenceOrg, dependenceEmployeeOrg)
              if (!rowOrgID) {
                errorMessagesCount++
                storeLog.run('insert', {
                  __skipOptimisticLock: true,
                  __skipSelectAfterInsert: true,
                  __skipRls: true,
                  __skipAclRls: true,
                  execParams: {
                    orgID: orgID,
                    entityName: importParams.entityName,
                    description: UB.i18n(`ID({0}) Не знайдено організацію в таблиці відповідності`, impID).substring(0, 1999)
                  }
                })
                added = false
              } else {
                row[attrOrg] = rowOrgID
              }
            }
          }
          delete row.impOrgID

          if (row.source) {
            if (row.sourceID) {
              const attrID = row.sourceID
              const mapRow = accrualService.binarySearch(sources[row.source], Number(row.sourceID), 0, sources[row.source].length - 1, 'inputID')
              row.sourceID = mapRow ? mapRow.outputID : null
              if (row.sourceID === null) {
                errorMessagesCount++
                storeLog.run('insert', {
                  __skipOptimisticLock: true,
                  __skipSelectAfterInsert: true,
                  __skipRls: true,
                  __skipAclRls: true,
                  execParams: {
                    orgID: orgID,
                    entityName: importParams.entityName,
                    description: UB.i18n(`ID({0}) Не знайдено значення sourceID з ID {1} в таблиці відповідності`, impID, attrID).substring(0, 1999)
                  }
                })
              }
            }
          }
          if (added) {
            dictStore.run('insert', {
              __skipOptimisticLock: true,
              __skipSelectAfterInsert: true,
              __skipRls: true,
              __skipAclRls: true,
              isImport: true,
              execParams: row
            })
            if (importParams.entityName === 'hr_accrual') {
              const outputID = UB.Repository('hr_importMap')
                .attrs('ID')
                .where('orgID', '=', orgID)
                .where('inputID', '=', impID)
                .where('entityName', '=', 'hr_accrual')
                .selectScalar()
              if (outputID) {
                importMapStore.run('update', {
                  __skipOptimisticLock: true,
                  __skipSelectAfterUpdate: true,
                  __skipUsingAllFieldsForSelectBeforeUpdate: true,
                  __skipRls: true,
                  __skipAclRls: true,
                  execParams: {
                    ID: outputID,
                    outputID: row.ID
                  }
                })
              }
            }
          }
          console.log(`import row ${count} impID ${impID}`)
        }
        try {
          db.savepointWrap(insertRow)
        } catch (error) {
          errorMessagesCount++
          storeLog.run('insert', {
            __skipOptimisticLock: true,
            __skipSelectAfterInsert: true,
            __skipRls: true,
            __skipAclRls: true,
            execParams: {
              orgID: orgID,
              entityName: importParams.entityName,
              description: `ID(${impID}) ${error.message}`.substring(0, 1999)
            }
          })

          console.log(`import row ${count} impID ${impID} Error`)
        }
        count++
        if (count % 1000 === 0) {
          App.dbCommit()
          dictStore.freeNative()
          storeLog.freeNative()
          importMapStore.freeNative()
          dictStore = null
          storeLog = null
          dictStore = UB.DataStore(importParams.entityName)
          storeLog = UB.DataStore('hr_importLog')
          importMapStore = UB.DataStore('hr_importMap')
        }
      })
    }
    if (insertData.length === selectCount) {
      insertData = null
      setAccrual(start + selectCount)
    }
  }
  setAccrual(0)
  return {
    state: errorMessagesCount ? '3' : '4',
    logCount: errorMessagesCount,
    errorMessages: []
  }
}

function setTimeSheet (importParams, mainOrgID, params) {
  let errorMessagesCount = 0
  const cont = {}
  cont.payEl = payElService.getPayEl({ orgID: mainOrgID })

  const orgIDs = params.withSubOrg
    ? UB.Repository('hr_organization')
      .attrs(['mi_data_id'])
      .where('state', '=', 'ACTIVE')
      .where('mi_treePath', 'like', `%/${mainOrgID}/%`)
      .where('mi_dateFrom', '<=', dateService.currentDate())
      .where('mi_dateTo', '>=', dateService.currentDate())
      .groupBy('mi_data_id')
      .misc({ __mip_recordhistory_all: true })
      .selectAsObject().map(o => o.mi_data_id)
    : [mainOrgID]

  let periodTFrom = params.periodTFromID ? periodService.getPeriod(params.periodTFromID) : null
  let periodTTo = params.periodTToID ? periodService.getPeriod(params.periodTToID) : null

  orgIDs.forEach(orgID => {
    let includeNumberID = []
    if (params.tabNums && params.tabNums !== '') {
      includeNumberID = UB.Repository('hr_employeeNumberS')
        .attrs(['ID'])
        .where('tabNum', 'in', params.tabNums.split(','))
        .where('orgID', '=', orgID)
        .selectAsObject().map(o => o.ID)
      if (!includeNumberID.length) {
        throw new UB.UBAbort(`<<<${UB.i18n('Не знайдено жодного пацівника з таким табельним номером')}>>>`)
      }
    }
    const currentPeriod = periodService.getCurrentPeriod(orgID)
    if (!currentPeriod.ID) {
      return
    }
    let store = UB.DataStore('tim_timeSheet')
    let storeSum = UB.DataStore('tim_timeSheet')
    let orderStore = UB.DataStore('hr_orderPay')
    let protocolStore = UB.DataStore('hr_importProtocol')
    protocolStore.execSQL(`DELETE FROM hr_importProtocol WHERE orgID = :orgID: and entityName = :entityName:`, {
      orgID: orgID,
      entityName: importParams.entityName
    })
    const maxDate = UB.Repository('hr_accrual')
      .attrs(['MIN([periodCalcID.dateFrom])', 'MAX([periodCalcID.dateFrom])', 'MAX([periodSalaryID.dateFrom])'])
      .where('orgID', '=', orgID)
      .limit(1)
      .selectSingle() || {}
    const minDateBalance = UB.Repository('hr_accrualBalance')
      .attrs(['MIN([periodCalcID.dateFrom])'])
      .where('employeeNumberID.orgID', '=', orgID)
      .limit(1)
      .selectScalar()
    const minSummarySheet = UB.Repository('hr_payCalcSummarySheet')
      .attrs(['MIN([periodID.dateFrom])'])
      .where('orgID', '=', orgID)
      .limit(1)
      .selectScalar()

    maxDate.dateFrom = dateService.shiftDate(Math.min(dateService.addMonths(currentPeriod.dateFrom, -13), maxDate['MIN([periodCalcID.dateFrom])']
      ? dateService.shiftDate(maxDate['MIN([periodCalcID.dateFrom])']) : currentPeriod.dateFrom))
    if (minDateBalance && maxDate.dateFrom > dateService.shiftDate(minDateBalance)) {
      maxDate.dateFrom = dateService.shiftDate(minDateBalance)
    }
    if (minSummarySheet && maxDate.dateFrom > dateService.shiftDate(minSummarySheet)) {
      maxDate.dateFrom = dateService.shiftDate(minSummarySheet)
    }
    maxDate.dateTo = dateService.addDays(currentPeriod.dateFrom, -1)
    maxDate.dateSalaryTo = dateService.shiftDate(Math.max(dateService.addMonths(currentPeriod.dateTo, 1), maxDate['MAX([periodSalaryID.dateFrom])']
      ? dateService.shiftDate(maxDate['MAX([periodSalaryID.dateFrom])']) : currentPeriod.dateTo))

    if (periodTFrom) {
      maxDate.dateFrom = periodTFrom.dateFrom
    }
    if (periodTTo) {
      maxDate.dateTo = periodTTo.dateTo
      maxDate.dateSalaryTo = periodTTo.dateTo
    }

    let reCalcPeriod = periodService.getPeriodsByDate(orgID, maxDate.dateFrom, maxDate.dateSalaryTo)
    const holidays = calendarService.getHolidays(maxDate.dateFrom, maxDate.dateSalaryTo, orgID)
    const workSchedules = UB.Repository('hr_workSchedule').attrs(['ID']).selectAsObject()
    App.dbCommit()
    if (importParams.entityName === 'schedules') {
      workSchedules.forEach(workSchedule => {
        try {
          timeSheetService.calcPlan({
            workScheduleID: workSchedule.ID,
            organizationID: orgID,
            calcDateFrom: maxDate.dateFrom,
            calcDateTo: maxDate.dateSalaryTo,
            runCalcTimeSheet: false
          })
        } catch (error) {
          errorMessagesCount++
          protocolStore.run('insert', {
            __skipOptimisticLock: true,
            __skipSelectAfterInsert: true,
            __skipRls: true,
            __skipAclRls: true,
            execParams: {
              orgID: orgID,
              entityName: importParams.entityName,
              operationDate: new Date(),
              description: `${error.message}`.substring(0, 1999)
            }
          })
          console.log(`${error.message}`)
        }
      })
    }
    global.gc()
    const dictTimeCostCorID = UB.Repository('hr_dictTimeCost').attrs(['ID'])
      .where('code', '=', entityBaseService.langCodei18n('Кор')).orderBy('ID').selectScalar()
    const dictTimeCostWorkID = UB.Repository('hr_dictTimeCost').attrs(['ID'])
      .where('timeCostType', '=', 'WORK').where('code', '=', entityBaseService.langCodei18n('РбДн')).orderBy('ID').selectScalar()
    if (importParams.entityName === 'timesheet' || importParams.entityName === 'removeCorrect') {
      protocolStore.run('insert', {
        __skipOptimisticLock: true,
        __skipSelectAfterInsert: true,
        __skipRls: true,
        __skipAclRls: true,
        execParams: {
          orgID: orgID,
          entityName: importParams.entityName,
          operationDate: new Date(),
          description: `Очищення даних табеля`
        }
      })
      App.dbCommit()
      store.execSQL(`DELETE FROM tim_timeSheet WHERE ID in (
                 SELECT ts.ID FROM tim_timeSheet ts
                 LEFT JOIN hr_order o ON o.ID = ts.orderID AND o.empOrderType IS NULL
                 LEFT JOIN hr_orderClass c ON c.ID = o.orderClass AND (c.entityName = 'hr_orderPay' OR c.entityName = 'hr_employeeAccrual')
                 JOIN hr_employeeNumber en ON en.ID = ts.employeeNumberID AND en.orgID = :orgID:
                 WHERE  ts.isCorrection = 0 and ts.isCanceled = 0 and (ts.orderID IS NULL OR c.ID IS NOT NULL)
                 ${includeNumberID.length ? `and en.ID${entityBaseService.getInExpression('includeNumberID')}` : ''}
                 ${periodTFrom ? ' and ts.dateWork >= :dateFrom: ' : ''}
                 ${periodTTo ? ' and ts.dateWork <= :dateTo: ' : ''}
                 )`, {
        orgID: orgID,
        includeNumberID,
        dateFrom: periodTFrom ? periodTTo.dateFrom : null,
        dateTo: periodTTo ? periodTTo.dateTo : null
      })
      store.execSQL(`UPDATE tim_timeSheet
                   SET isActive = 0 WHERE ID in (
                 SELECT ts.ID FROM tim_timeSheet ts
                 JOIN hr_employeeNumber en ON en.ID = ts.employeeNumberID AND en.orgID = :orgID:
                 WHERE isActive = 1
                 ${includeNumberID.length ? `and en.ID${entityBaseService.getInExpression('includeNumberID')}` : ''}
                 ${periodTFrom ? ' and ts.dateWork >= :dateFrom: ' : ''}
                 ${periodTTo ? ' and ts.dateWork <= :dateTo: ' : ''}
                 )`, {
        orgID: orgID,
        includeNumberID,
        dateFrom: periodTFrom ? periodTTo.dateFrom : null,
        dateTo: periodTTo ? periodTTo.dateTo : null
      })
      protocolStore.run('insert', {
        __skipOptimisticLock: true,
        __skipSelectAfterInsert: true,
        __skipRls: true,
        __skipAclRls: true,
        execParams: {
          orgID: orgID,
          entityName: importParams.entityName,
          operationDate: new Date(),
          description: `Формування даних табеля`
        }
      })
      App.dbCommit()
      const orderID = orderStore.generateID()
      orderStore.run('insert', {
        execParams: {
          ID: orderID,
          orderState: 'POSTED',
          entryDate: dateService.currentDate(),
          description: 'Імпортовані дані'
        }
      })
      const dictTimeCost = UB.Repository('hr_dictTimeCost').attrs(['ID']).where('[code]', '=', entityBaseService.langCodei18n('Ні')).limit(1).selectScalar()
      reCalcPeriod.forEach(period => {
        store.runSQL(`SELECT en.ID "ID" from hr_employeeNumber en where en.orgID = :orgID: ${includeNumberID.length
          ? `AND en.ID${entityBaseService.getInExpression('includeNumberID')}` : ''}
        AND en.dateTo >= :dateFrom:
      AND (EXISTS (SELECT a.ID FROM hr_accrual a where a.employeeNumberID = en.ID AND a.periodSalary >= :dateFrom: AND a.periodSalary <= :dateTo:)
            OR (en.dateFrom <= :dateTo: AND en.dateTo >= :dateFrom:))
                `, { orgID: orgID, dateFrom: period.dateFrom, dateTo: period.dateTo, includeNumberID })
        const empNnms = store.getAsJsObject().map(o => o.ID)

        try {
          timeSheetService.fillTimeSheet({
            organizationID: orgID,
            periodID: period.ID,
            employeeNumbers: empNnms,
            checkPeriod: false,
            skipEmployeePosition: true,
            isImport: !!period.isClosed
          })
          protocolStore.run('insert', {
            __skipOptimisticLock: true,
            __skipSelectAfterInsert: true,
            __skipRls: true,
            __skipAclRls: true,
            execParams: {
              orgID: orgID,
              entityName: importParams.entityName,
              operationDate: new Date(),
              description: `Формування даних табеля ${period.name} завершено. Кількість працівників ${empNnms.length}`
            }
          })
          App.dbCommit()
          if (dictTimeCost) {
            store.runSQL(`SELECT en.ID "ID", en.dateFrom "dateFrom", en.dateTo "dateTo" from hr_employeeNumber en
                 where en.orgID = :orgID: ${includeNumberID.length
    ? `and en.ID${entityBaseService.getInExpression('includeNumberID')}` : ''}
                 AND ((en.dateFrom > :dateFrom: AND en.dateFrom <= :dateTo:)
                 OR (en.dateTo >= :dateFrom: AND en.dateTo < :dateTo:))`,
            { orgID: orgID, dateFrom: period.dateFrom, dateTo: period.dateTo, includeNumberID })
            const empDate = store.getAsJsObject()
            empDate.forEach(emp => {
              emp.dateFrom = dateService.shiftDate(emp.dateFrom)
              emp.dateTo = dateService.shiftDate(emp.dateTo)
              let date = dateService.shiftDate(period.dateFrom)
              let dateTo = dateService.shiftDate(period.dateTo)
              const timeSheetParams = []
              while (date <= dateTo) {
                if (!(emp.dateFrom <= date && emp.dateTo >= date)) {
                  timeSheetParams.push({
                    orderID: orderID,
                    employeeNumberID: emp.ID,
                    periodID: period.ID,
                    dateWork: date,
                    factTimeCostID: dictTimeCost,
                    factHour: 0
                  })
                }
                date = dateService.nextDay(date)
              }
              try {
                timService.setTimeSheet(timeSheetParams, true)
              } catch (error) {
                if (error.message !== 'UBAbortError') {
                  errorMessagesCount++
                  protocolStore.run('insert', {
                    __skipOptimisticLock: true,
                    __skipSelectAfterInsert: true,
                    __skipRls: true,
                    __skipAclRls: true,
                    execParams: {
                      orgID: orgID,
                      entityName: importParams.entityName,
                      operationDate: new Date(),
                      employeeNumberID: emp.ID,
                      description: `${error.message}`.substring(0, 1999)
                    }
                  })
                  console.log(`${error.message}`)
                }
              }
            })
          }
        } catch (error) {
          errorMessagesCount++
          protocolStore.run('insert', {
            __skipOptimisticLock: true,
            __skipSelectAfterInsert: true,
            __skipRls: true,
            __skipAclRls: true,
            execParams: {
              orgID: orgID,
              entityName: importParams.entityName,
              operationDate: new Date(),
              description: `${error.message}`.substring(0, 1999)
            }
          })
          console.log(`${error.message}`)
        }
        App.dbCommit()
      })

      if (importParams.entityName !== 'removeCorrect') {
        protocolStore.run('insert', {
          __skipOptimisticLock: true,
          __skipSelectAfterInsert: true,
          __skipRls: true,
          __skipAclRls: true,
          execParams: {
            orgID: orgID,
            entityName: importParams.entityName,
            operationDate: new Date(),
            description: `Формування невиходів по розрахунковим листам`
          }
        })
        App.dbCommit()
        if (params.addTimeSheet) {
          const employeeNumbers = UB.Repository('hr_employeeNumberS')
            .attrs(['ID', 'employeeID'])
            .whereIf(includeNumberID.length, 'ID', 'in', includeNumberID)
            .where('orgID', '=', orgID)
            .orderBy('workPlace')
            .selectAsObject({
              'ID': 'employeeNumberID'
            })
          const payElIDs = UB.Repository('hr_payEl')
            .attrs(['ID'])
            .where('dictTimeCostWorkID', 'isNotNull', undefined, 'dictTimeCostWork')
            .where('dictTimeCostAvgID', 'isNotNull', undefined, 'dictTimeCostAvg')
            .where('dictTimeCostID', 'isNotNull', undefined, 'dictTimeCost')
            .logic('( [dictTimeCostWork]  or [dictTimeCostAvg] or [dictTimeCost] )')
            .selectAsObject().map(o => o.ID)
          reCalcPeriod = periodService.getPeriodsByDate(orgID, maxDate.dateFrom, maxDate.dateTo)
          employeeNumbers.forEach(empNum => {
            try {
              const accruals = UB.Repository('hr_accrual')
                .attrs(['ID', 'periodCalcID', 'periodSalaryID', 'periodCalc', 'periodSalary', 'dateFrom', 'dateTo', 'payElID',
                  'payElID.dictTimeCostWorkID', 'payElID.dictTimeCostAvgID', 'payElID.dictTimeCostID',
                  'payElID.dictTimeCostWorkID.isFactHour', 'payElID.dictTimeCostAvgID.isFactHour', 'payElID.dictTimeCostID.isFactHour',
                  'mask', 'maskAdd', 'flagsRec', 'flagsFix', 'planHours', 'planDays', 'days', 'hours', 'payElID.methodID.code', 'paySum'])
                .where('employeeNumberID', '=', empNum.employeeNumberID)
                .where('periodSalary', '>=', maxDate.dateFrom)
                .where('periodSalary', '<=', maxDate.dateSalaryTo)
                .where('periodCalcID', '!=', currentPeriod.ID)
                .where('payElID', 'in', payElIDs.length ? payElIDs : [0])
                .where(`((flagsRec & 1024 != 1024) and (flagsRec & 8192 != 8192) and (flagsRec & 4096 != 4096))`, 'custom')
                .orderBy('ID')
                .orderBy('dateFrom')
                .selectAsObject()
              const accrualGroups = []
              const employeePositions = UB.Repository('hr_employeePositionS')
                .attrs(['ID', 'employeeID', 'employeeNumberID', 'organizationID', 'dateFrom', 'dateTo', 'workPlace'])
                .where('employeeNumberID', '=', empNum.employeeNumberID)
                .orderBy('dateFrom')
                .selectAsObject()
              employeePositions.forEach(row => {
                row.dateFrom = dateService.shiftDate(row.dateFrom)
                row.dateTo = dateService.shiftDate(row.dateTo)
              })

              accruals.forEach(accr => {
                accr.dateFrom = accr.dateFrom ? dateService.shiftDate(accr.dateFrom) : dateService.shiftDate(accr.periodSalary)
                accr.dateTo = accr.dateTo ? dateService.shiftDate(accr.dateTo) : dateService.lastDayOfMonth(accr.periodSalary)
                const group = accrualGroups.find(o => o.payElID === accr.payElID && o.periodSalaryID === accr.periodSalaryID &&
                  accr.dateFrom <= o.dateTo && accr.dateTo >= o.dateFrom)
                if (!accr.mask && !accr.maskAdd) {
                  if (/* accr.days !== 0 && */ accr.dateFrom && accr.dateTo) {
                    accr.mask = algorithmService.getFillMaskByPeriod(
                      dateService.shiftDate(Math.max(accr.dateFrom, dateService.shiftDate(accr.periodSalary))),
                      dateService.shiftDate(Math.min(accr.dateTo, dateService.lastDayOfMonth(accr.periodSalary))))
                  } else {
                    accr.mask = 0
                  }
                }
                if (!accr.maskAdd) {
                  accr.maskAdd = 0
                }
                if (group) {
                  if (group.reversalMask || accr.reversalMaskAdd) {
                    if ((accr.flagsRec & 512) || accr.days < 0) {
                      group.reversalMask = accr.mask | group.reversalMask
                      group.reversalMaskAdd = accr.maskAdd | group.reversalMaskAdd
                    } else {
                      group.mask = accr.mask & ~group.reversalMask
                      group.maskAdd = accr.maskAdd & ~group.reversalMaskAdd
                      group.reversalMask = 0
                      accr.reversalMaskAdd = 0
                    }
                  } else {
                    group.mask = ((accr.flagsRec & 512) || accr.days < 0) ? (group.mask & ~accr.mask) : (group.mask | accr.mask)
                    group.maskAdd = ((accr.flagsRec & 512) || accr.days < 0) ? (group.maskAdd & ~accr.maskAdd) : (group.maskAdd | accr.maskAdd)
                  }
                } else {
                  if ((accr.flagsRec & 512) || accr.days < 0) {
                    accr.reversalMask = accr.mask || 0
                    accr.reversalMaskAdd = accr.maskAdd || 0
                    accr.mask = 0
                    accr.maskAdd = 0
                  }
                  accrualGroups.push(accr)
                }
              })
              const orderTimeSheet = UB.Repository('tim_timeSheet')
                .attrs(['dateWork', 'factTimeCostID'])
                .where('employeeNumberID', '=', empNum.employeeNumberID)
                .where('factTimeCostID.timeCostType', '=', 'ABSENCE')
                .selectAsObject()

              const secondJobs = UB.Repository('hr_employeePositionS')
                .attrs(['employeeNumberID', 'employeeNumberID.dateFrom', 'employeeNumberID.dateTo'])
                .where('employeeID', '=', empNum.employeeID)
                .where('employeeNumberID', '!=', empNum.employeeNumberID)
                .where('organizationID', '=', orgID)
                .where('workPlace', '=', '2')
                .groupBy(['employeeNumberID', 'employeeNumberID.dateFrom', 'employeeNumberID.dateTo'])
                .selectAsObject()
              secondJobs.forEach(secJob => {
                secJob.orderTimeSheet = UB.Repository('tim_timeSheet')
                  .attrs(['dateWork', 'factTimeCostID'])
                  .where('employeeNumberID', '=', secJob.employeeNumberID)
                  .where('factTimeCostID.timeCostType', '=', 'ABSENCE')
                  .selectAsObject()
              })

              accrualGroups.forEach(accr => {
                const timeSheetParams = []
                /*  if (!accr.mask && accr.dateFrom && accr.dateTo) {
                  accr.mask = algorithmService.getFillMaskByPeriod(dateService.shiftDate(accr.dateFrom), dateService.shiftDate(accr.dateTo))
                } */
                if (accr.mask > 0 && (accr['payElID.dictTimeCostID'] || (accr['payElID.methodID.code'] === '21' && (accr['payElID.dictTimeCostWorkID'] || accr['payElID.dictTimeCostAvgID'])))) {
                  let dateFrom = dateService.shiftDate(accr.periodSalary)
                  let dateTo = dateService.lastDayOfMonth(accr.periodSalary)
                  let date = dateService.shiftDate(dateFrom)
                  for (let day = dateFrom.getDate(); day <= dateTo.getDate(); day++) {
                    const factTimeCostID = accr['payElID.methodID.code'] !== '21'
                      ? accr['payElID.dictTimeCostID']
                      : (accr.flagsRec & 1 << 8) ? accr['payElID.dictTimeCostAvgID'] : accr['payElID.dictTimeCostWorkID']

                    if (((accr.mask & 1 << (date.getDate() - 1)) || (accr.maskAdd & 1 << (date.getDate() - 1))) &&
                      !orderTimeSheet.find(ots => ots.factTimeCostID === factTimeCostID && dateService.shiftDate(ots.dateWork).getTime() === date.getTime())) {
                      let factHour = 0
                      if ((accr['payElID.methodID.code'] === '21' && !accr.paySum) ||
                        accr['payElID.dictTimeCostWorkID.isFactHour'] || accr['payElID.dictTimeCostAvgID.isFactHour'] || accr['payElID.dictTimeCostID.isFactHour']) {
                        factHour = UB.Repository('tim_timeSheet')
                          .attrs(['factHour'])
                          .where('employeeNumberID', '=', empNum.employeeNumberID)
                          .where('dateWork', '=', date)
                          .where('isSchedule', '=', 1)
                          .selectScalar() || 0
                      }
                      timeSheetParams.push({
                        orderID,
                        employeeNumberID: empNum.employeeNumberID,
                        periodID: accr.periodCalcID,
                        dateWork: date,
                        factTimeCostID: factTimeCostID,
                        factHour,
                        import: true
                      })
                    }
                    date = dateService.addDays(date, 1)
                  }
                  if (cont.payEl[accr.payElID].includeSecondJobs &&
                    employeePositions.filter(o => o.dateFrom <= dateTo && o.dateTo >= dateFrom && o.workPlace === '1')) {
                    secondJobs.forEach(secEmp => {
                      if (dateService.shiftDate(secEmp['employeeNumberID.dateFrom']) <= dateService.lastDayOfMonth(accr.periodSalary) &&
                        dateService.shiftDate(secEmp['employeeNumberID.dateTo']) >= dateService.shiftDate(accr.periodSalary)) {
                        let dateFrom = dateService.shiftDate(Math.max(dateService.shiftDate(secEmp['employeeNumberID.dateFrom']), dateService.shiftDate(accr.periodSalary)))
                        let dateTo = dateService.shiftDate(Math.min(dateService.shiftDate(secEmp['employeeNumberID.dateTo']), dateService.lastDayOfMonth(accr.periodSalary)))
                        let date = dateService.shiftDate(dateFrom)
                        for (let day = dateFrom.getDate(); day <= dateTo.getDate(); day++) {
                          const factTimeCostID = accr['payElID.methodID.code'] !== '21'
                            ? accr['payElID.dictTimeCostID']
                            : (accr.flagsRec & 1 << 8) ? accr['payElID.dictTimeCostAvgID'] : accr['payElID.dictTimeCostWorkID']
                          if (((accr.mask & 1 << (date.getDate() - 1)) || (accr.maskAdd & 1 << (date.getDate() - 1))) &&
                            !secEmp.orderTimeSheet.find(ots => ots.factTimeCostID === factTimeCostID && dateService.shiftDate(ots.dateWork).getTime() === date.getTime())) {
                            let factHour = 0
                            if ((accr['payElID.methodID.code'] === '21' && !accr.paySum) ||
                              accr['payElID.dictTimeCostWorkID.isFactHour'] || accr['payElID.dictTimeCostAvgID.isFactHour'] || accr['payElID.dictTimeCostID.isFactHour']) {
                              factHour = UB.Repository('tim_timeSheet')
                                .attrs(['factHour'])
                                .where('employeeNumberID', '=', secEmp.employeeNumberID)
                                .where('dateWork', '=', date)
                                .where('isSchedule', '=', 1)
                                .selectScalar() || 0
                            }
                            timeSheetParams.push({
                              orderID,
                              employeeNumberID: secEmp.employeeNumberID,
                              periodID: accr.periodCalcID,
                              dateWork: date,
                              factTimeCostID: factTimeCostID,
                              factHour,
                              import: true
                            })
                          }
                          date = dateService.addDays(date, 1)
                        }
                      }
                    })
                  }
                }
                if (timeSheetParams.length) {
                  try {
                    timService.setTimeSheet(timeSheetParams, true)
                  } catch (error) {
                    if (error.message !== 'UBAbortError') {
                      errorMessagesCount++
                      protocolStore.run('insert', {
                        __skipOptimisticLock: true,
                        __skipSelectAfterInsert: true,
                        __skipRls: true,
                        __skipAclRls: true,
                        execParams: {
                          orgID: orgID,
                          entityName: importParams.entityName,
                          operationDate: new Date(),
                          employeeNumberID: empNum.employeeNumberID,
                          description: `${error.message}`.substring(0, 1999)
                        }
                      })
                      console.log(`${error.message}`)
                    }
                  }
                }
              })
              const timeSheetCorrect = UB.Repository('tim_timeSheet')
                .attrs(['dateWork'])
                .where('employeeNumberID', '=', empNum.employeeNumberID)
                .where('dateWork', '>=', maxDate.dateFrom)
                .where('dateWork', '<=', maxDate.dateTo)
                .where('isCorrection', '=', 1)
                .where('isActive', '=', 1)
                .selectAsObject()
              const workAccruals = UB.Repository('hr_accrual')
                .attrs(['ID', 'periodCalcID', 'periodSalaryID', 'periodCalc', 'periodSalary', 'dateFrom', 'dateTo', 'payElID',
                  'mask', 'maskAdd', 'flagsRec', 'flagsFix', 'planHours', 'planDays', 'days', 'hours'])
                .where('employeeNumberID', '=', empNum.employeeNumberID)
                .where('periodSalary', '>=', maxDate.dateFrom)
                .where('periodCalc', '<', maxDate.dateTo)
                .where('payElID.methodID.code', 'in', ['1', '2', '63', '77', '138', '146', '147', '156'])
                .where(`((flagsRec & 1024 != 1024) and (flagsRec & 8192 != 8192) and (flagsRec & 4096 != 4096) )`, 'custom')
                .orderBy('ID')
                .selectAsObject()
              const accrualWorkGroups = []
              workAccruals.forEach(accr => {
                const group = accrualWorkGroups.find(o => o.payElID === accr.payElID && o.periodSalaryID === accr.periodSalaryID)
                if (!accr.mask && !accr.maskAdd) {
                  if (accr.dateFrom && accr.dateTo) {
                    accr.mask = algorithmService.getFillMaskByPeriod(
                      dateService.shiftDate(Math.max(dateService.shiftDate(accr.dateFrom), dateService.shiftDate(accr.periodSalary))),
                      dateService.shiftDate(Math.min(dateService.shiftDate(accr.dateTo), dateService.lastDayOfMonth(accr.periodSalary))))
                  } else {
                    accr.mask = 0
                  }
                }
                if (!accr.maskAdd) {
                  accr.maskAdd = 0
                }
                if (group) {
                  group.mask = ((accr.flagsRec & 512) || accr.days < 0) ? (group.mask & ~accr.mask) : (group.mask | accr.mask)
                  group.maskAdd = ((accr.flagsRec & 512) || accr.days < 0) ? (group.maskAdd & ~accr.maskAdd) : (group.maskAdd | accr.maskAdd)
                  group.normDayPay = Math.max(accr.planDays || 0, group.normDayPay)
                  group.normHourPay = Math.max(accr.planHours || 0, group.normHourPay)
                  group.dayPay += accr.days
                  group.hourPay += accr.hours
                } else {
                  accr.normDayPay = (((accr.flagsRec & 512) || accr.days < 0) ? -1 : 1) * (accr.planDays || 0)
                  accr.normHourPay = (((accr.flagsRec & 512) || accr.days < 0) ? -1 : 1) * (accr.planHours || 0)
                  accr.dayPay = (accr.days || 0)
                  accr.hourPay = (accr.hours || 0)
                  accrualWorkGroups.push(accr)
                }
              })
              accrualWorkGroups.forEach(accr => {
                if (accr.maskAdd > 0) {
                  let dateFrom = dateService.shiftDate(accr.periodSalary)
                  let dateTo = dateService.lastDayOfMonth(accr.periodSalary)
                  let date = dateService.shiftDate(dateFrom)
                  if (!timeSheetCorrect.find(o => dateFrom <= dateService.shiftDate(o.dateWork) && dateTo >= dateService.shiftDate(o.dateWork))) {
                    for (let day = dateFrom.getDate(); day <= dateTo.getDate(); day++) {
                      if ((accr.maskAdd & 1 << (date.getDate() - 1))) {
                        const timeSheet = UB.Repository('tim_timeSheet')
                          .attrs(['ID'])
                          .where('employeeNumberID', '=', empNum.employeeNumberID)
                          .where('dateWork', '=', date)
                          .where('isSchedule', '=', 1)
                          .where('factTimeCostID.timeCostType', '=', 'WORK')
                          .limit(1)
                          .selectSingle()
                        if (timeSheet && dictTimeCostCorID) {
                          storeSum.execSQL(`UPDATE tim_timeSheet SET
                   factTimeCostID = :dictTimeCostCorID:,
                   factHour = 0,
                   factHourNight = 0,
                   factHourEvening = 0
                   WHERE ID = :ID:`,
                          { ID: timeSheet.ID, dictTimeCostCorID })
                        }
                      }
                      date = dateService.addDays(date, 1)
                    }
                  }
                }
              })
              reCalcPeriod.forEach(period => {
                if (!timeSheetCorrect.find(o => period.dateFrom <= dateService.shiftDate(o.dateWork) && period.dateTo >= dateService.shiftDate(o.dateWork))) {
                  const notWorkAccrual = UB.Repository('hr_accrual')
                    .attrs(['ID'])
                    .where('employeeNumberID', '=', empNum.employeeNumberID)
                    .where('periodSalaryID', '=', period.ID)
                    .where('payElID.methodID.code', 'in', ['1', '2', '63', '77', '138', '146', '147', '156'])
                    .where(`((flagsRec & 1024 != 1024) and (flagsRec & 8192 != 8192) and (flagsRec & 4096 != 4096) )`, 'custom')
                    .limit(1)
                    .selectSingle()
                  if (!notWorkAccrual) {
                    accrualWorkGroups.push({
                      periodSalaryID: period.ID,
                      normDayPay: 0,
                      normHourPay: 0,
                      dayPay: 0,
                      hourPay: 0
                    })
                  }
                }
              })
              reCalcPeriod.forEach(period => {
                if (!timeSheetCorrect.find(o => period.dateFrom <= dateService.shiftDate(o.dateWork) && period.dateTo >= dateService.shiftDate(o.dateWork))) {
                  const accrualWorks = accrualWorkGroups.filter(o => o.periodSalaryID === period.ID)
                  if (accrualWorks.length) {
                    storeSum.runSQL(` 
                 SELECT 
                   SUM(CASE WHEN t.planHour > 0 THEN 1 ELSE 0 END) AS "normDaySheet",
                   SUM(CASE WHEN t.planHour > 0 THEN planHour ELSE 0 END) AS "normHourSheet",
                   SUM(CASE WHEN (ws.isDayAsPlan = 0 AND t.factHour > 0) OR (ws.isDayAsPlan = 1 AND tcf.timeCostType in ('WORK', 'FREE') AND tcp.timeCostType = 'WORK') THEN 1 ELSE 0 END) AS "daySheet",
                   SUM(CASE WHEN (ws.isDayAsPlan = 0 AND t.factHour > 0) OR (ws.isDayAsPlan = 1 AND tcf.timeCostType in ('WORK', 'FREE') AND tcp.timeCostType = 'WORK') THEN factHour ELSE 0 END) AS "hourSheet",
                   SUM(CASE WHEN ws.isDayAsPlan = 1 THEN 1 ELSE 0 END) AS "isDayAsPlanDays"
                 FROM tim_timeSheet t
                 JOIN hr_dictTimeCost tcf ON tcf.ID = t.factTimeCostID 
                 JOIN hr_dictTimeCost tcp ON tcp.ID = t.planTimeCostID 
                 JOIN tim_plan pl ON pl.ID = t.planID
                 JOIN hr_workSchedule ws ON ws.ID = pl.workScheduleID
                 WHERE t.employeeNumberID = :employeeNumberID: AND t.isActive = 1 AND t.dateWork >= :dateFrom: AND t.dateWork <= :dateTo:
                  AND ((ws.isDayAsPlan = 0 AND tcf.timeCostType = 'WORK' AND t.factHour > 0) OR (ws.isDayAsPlan = 1 AND tcf.timeCostType in ('WORK', 'FREE')))
                 -- AND tcf.timeCostType = 'WORK' 
                 AND t.mi_deleteDate >= '9999-12-31'`,
                    {
                      employeeNumberID: empNum.employeeNumberID,
                      dateFrom: period.dateFrom,
                      dateTo: period.dateTo
                    })
                    const timeSheetData = storeSum.getAsJsObject()[0]
                    let normDayPay = 0
                    let normHourPay = 0
                    let dayPay = 0
                    let hourPay = 0
                    accrualWorks.forEach(row => {
                      normDayPay += row.normDayPay
                      normHourPay += row.normHourPay
                      dayPay += row.dayPay
                      hourPay += row.hourPay
                    })

                    if (Math.abs(dayPay - timeSheetData.daySheet) > 0.0001 || Math.abs(hourPay - timeSheetData.hourSheet) > 0.0001) {
                      if (!params.notUpdateDays) {
                        if (dayPay < timeSheetData.daySheet) {
                          const countDay = timeSheetData.daySheet - dayPay
                          const timeSheet = dictTimeCostCorID ? (!timeSheetData.isDayAsPlanDays ? UB.Repository('tim_timeSheet')
                            .attrs(['ID', 'factHour'])
                            .where('employeeNumberID', '=', empNum.employeeNumberID)
                            .where('dateWork', '>=', period.dateFrom)
                            .where('dateWork', '<=', period.dateTo)
                            .where('isSchedule', '=', 1)
                            .where('isActive', '=', 1)
                            .where('factTimeCostID.timeCostType', '=', 'WORK')
                            .where('factHour', '>', 0)
                            .orderBy('dateWork')
                            .limit(countDay)
                            .selectAsObject()
                            : UB.Repository('tim_timeSheet')
                              .attrs(['ID', 'factHour'])
                              .where('employeeNumberID', '=', empNum.employeeNumberID)
                              .where('dateWork', '>=', period.dateFrom)
                              .where('dateWork', '<=', period.dateTo)
                              .where('isSchedule', '=', 1)
                              .where('isActive', '=', 1)
                              .where('factTimeCostID.timeCostType', 'in', ['WORK', 'FREE'])
                              .where('planTimeCostID.timeCostType', '=', 'WORK')
                              .orderBy('dateWork')
                              .limit(countDay)
                              .selectAsObject()) : []
                          timeSheetData.daySheet -= timeSheet.length
                          timeSheet.forEach(sheet => {
                            timeSheetData.hourSheet -= sheet.factHour
                            storeSum.execSQL(`UPDATE tim_timeSheet SET
                   factTimeCostID = :dictTimeCostCorID:,
                   factHour = 0,
                   factHourNight = 0,
                   factHourEvening = 0
                   WHERE ID = :ID:`,
                            { ID: sheet.ID, dictTimeCostCorID: dictTimeCostCorID })
                          })
                        } else if (dayPay > timeSheetData.daySheet && !timeSheetData.isDayAsPlanDays) {
                          const countDay = dayPay - timeSheetData.daySheet
                          const hour = params.notUpdateHour ? 0 : accrualService.round((hourPay - timeSheetData.hourSheet) / (countDay))
                          const timeSheet = dictTimeCostWorkID ? UB.Repository('tim_timeSheet')
                            .attrs(['ID', 'dateWork'])
                            .where('employeeNumberID', '=', empNum.employeeNumberID)
                            .where('dateWork', '>=', period.dateFrom)
                            .where('dateWork', '<=', period.dateTo)
                            .where('isSchedule', '=', 1)
                            .where('isActive', '=', 1)
                            .where('factTimeCostID.timeCostType', 'in', ['FREE', 'WORK'])
                            .where('factHour', '=', 0)
                            .orderBy('dateWork')
                            .limit(countDay)
                            .selectAsObject() : []
                          timeSheetData.daySheet += timeSheet.length
                          timeSheet.forEach(sheet => {
                            const dateWork = dateService.shiftDate(sheet.dateWork)
                            if (!holidays.find(o => o.getTime() === dateWork.getTime())) {
                              timeSheetData.hourSheet += hour
                              storeSum.execSQL(`UPDATE tim_timeSheet SET
                             factTimeCostID = :dictTimeCostWorkID:,
                             factHour = :hour:
                             WHERE ID = :ID:`,
                              { ID: sheet.ID, dictTimeCostWorkID, hour })
                            }
                          })
                        }
                      }
                      if (!params.notUpdateHour) {
                        if (timeSheetData.isDayAsPlanDays) {
                          timeSheetData.hourSheet = UB.Repository('tim_timeSheet')
                            .attrs(['sum([factHour])'])
                            .where('employeeNumberID', '=', empNum.employeeNumberID)
                            .where('dateWork', '>=', period.dateFrom)
                            .where('dateWork', '<=', period.dateTo)
                            .where('isSchedule', '=', 1)
                            .where('isActive', '=', 1)
                            .where('factTimeCostID.timeCostType', 'in', ['WORK', 'FREE'])
                            .where('planTimeCostID.timeCostType', 'in', ['WORK', 'FREE'])
                            .where('factHour', '>', 0)
                            .selectScalar()
                        }

                        if (hourPay !== timeSheetData.hourSheet) {
                          const koef = hourPay / timeSheetData.hourSheet
                          const timeSheet = dictTimeCostCorID ? (!timeSheetData.isDayAsPlanDays ? UB.Repository('tim_timeSheet')
                            .attrs(['ID', 'factHour'])
                            .where('employeeNumberID', '=', empNum.employeeNumberID)
                            .where('dateWork', '>=', period.dateFrom)
                            .where('dateWork', '<=', period.dateTo)
                            .where('isSchedule', '=', 1)
                            .where('isActive', '=', 1)
                            .where('factTimeCostID.timeCostType', '=', 'WORK')
                            .where('factHour', '>', 0)
                            .orderBy('dateWork')
                            .selectAsObject()
                            : UB.Repository('tim_timeSheet')
                              .attrs(['ID', 'factHour'])
                              .where('employeeNumberID', '=', empNum.employeeNumberID)
                              .where('dateWork', '>=', period.dateFrom)
                              .where('dateWork', '<=', period.dateTo)
                              .where('isSchedule', '=', 1)
                              .where('isActive', '=', 1)
                              .where('factTimeCostID.timeCostType', 'in', ['WORK', 'FREE'])
                              .where('planTimeCostID.timeCostType', 'in', ['WORK', 'FREE'])
                              .where('factHour', '>', 0)
                              .orderBy('dateWork')
                              .selectAsObject()) : []
                          let sumHour = 0
                          timeSheet.forEach(sheet => {
                            timeSheetData.hourSheet -= sheet.factHour
                            sheet.factHour = accrualService.round(sheet.factHour * koef)
                            sumHour += sheet.factHour
                            timeSheetData.hourSheet += sheet.factHour
                            storeSum.execSQL(`UPDATE tim_timeSheet SET
                   factHour = :factHour:
                   WHERE ID = :ID:`,
                            { ID: sheet.ID, factHour: sheet.factHour })
                          })
                          if (sumHour !== hourPay && timeSheet.length) {
                            timeSheetData.hourSheet += (hourPay - sumHour)
                            storeSum.execSQL(`UPDATE tim_timeSheet SET
                   factHour = :factHour:
                   WHERE ID = :ID:`,
                            { ID: timeSheet[0].ID, factHour: timeSheet[0].factHour + (hourPay - sumHour) })
                          }
                        }
                      }
                      if (Math.abs(dayPay - timeSheetData.daySheet) > 0.0001 || Math.abs(hourPay - timeSheetData.hourSheet) > 0.0001) {
                        protocolStore.run('insert', {
                          __skipOptimisticLock: true,
                          __skipSelectAfterInsert: true,
                          __skipRls: true,
                          __skipAclRls: true,
                          execParams: {
                            orgID: orgID,
                            entityName: importParams.entityName,
                            operationDate: new Date(),
                            employeeNumberID: empNum.employeeNumberID,
                            periodID: period.ID,
                            normDayPay,
                            normDaySheet: timeSheetData.normDaySheet,
                            normHourPay,
                            normHourSheet: timeSheetData.normHourSheet,
                            dayPay,
                            daySheet: timeSheetData.daySheet,
                            hourPay,
                            hourSheet: timeSheetData.hourSheet,
                            description: `Розбіжності часу за оплатами та за табелем`
                          }
                        })
                      }
                    }
                  }
                }
              })

              App.dbCommit()
              store.freeNative()
              orderStore.freeNative()
              protocolStore.freeNative()
              storeSum.freeNative()
              store = null
              orderStore = null
              protocolStore = null
              storeSum = null
              storeSum = UB.DataStore('tim_timeSheet')
              store = UB.DataStore('tim_timeSheet')
              orderStore = UB.DataStore('hr_orderPay')
              protocolStore = UB.DataStore('hr_importProtocol')
            } catch (error) {
              errorMessagesCount++
              protocolStore.run('insert', {
                __skipOptimisticLock: true,
                __skipSelectAfterInsert: true,
                __skipRls: true,
                __skipAclRls: true,
                execParams: {
                  orgID: orgID,
                  entityName: importParams.entityName,
                  operationDate: new Date(),
                  employeeNumberID: empNum.employeeNumberID,
                  description: `${error.message}`.substring(0, 1999)
                }
              })
              console.log(`${error.message}`)
            }
          })
        }
      }
    }
    global.gc()
    if (importParams.entityName === 'balance') {
      let runStore = UB.DataStore('hr_accrualBalance')
      if (periodTFrom) {
        reCalcPeriod = periodService.getPeriodsByDate(orgID, periodTFrom.dateFrom, dateService.addDays(currentPeriod.dateFrom, -1))
      }
      reCalcPeriod.forEach(period => {
        if (period.dateFrom < currentPeriod.dateFrom) {
          try {
            store.runSQL(`SELECT a.ID as "employeeNumberID" from hr_employeeNumber a where a.orgID = :orgID: AND a.dateFrom <= :dateTo: 
                   ${includeNumberID.length ? `and a.ID${entityBaseService.getInExpression('includeNumberID')}` : ''}
                   AND (NOT EXISTS ( SELECT 1 from hr_accrualBalance b where b.periodCalcID = :periodCalcID: AND
                    b.employeeNumberID = a.ID AND b.isImport = 1 ) OR :periodCalcID: = :lastClosePeriodID:) GROUP BY a.ID`,
            {
              orgID,
              dateFrom: period.dateFrom,
              dateTo: period.dateTo,
              periodCalcID: period.ID,
              lastClosePeriodID: 0/* currentPeriod.priorPeriodID */,
              includeNumberID
            })
            const employeeNumbersBalance = store.getAsJsObject()
            employeeNumbersBalance.forEach(emp => {
              runStore.execSQL(`DELETE FROM hr_accrualBalance WHERE employeeNumberID  = :employeeNumberID: AND periodCalcID = :periodCalcID:`,
                { employeeNumberID: emp.employeeNumberID, periodCalcID: period.ID })
              const priorAccrualBalance = UB.Repository('hr_accrualBalance')
                .attrs(['ID', 'sumTo', 'dictFundSourceID', 'dictProgClassID'])
                .where('employeeNumberID', '=', emp.employeeNumberID)
                .where('periodCalcID', '=', period.priorPeriodID)
                .selectAsObject()
              const balanceDt = []
              let dictFundSourceID = null
              let dictProgClassID = null
              if (priorAccrualBalance.length) {
                if (priorAccrualBalance.length === 1) {
                  dictFundSourceID = priorAccrualBalance[0].dictFundSourceID || null
                  dictProgClassID = priorAccrualBalance[0].dictProgClassID || null
                } else {
                  protocolStore.run('insert', {
                    __skipOptimisticLock: true,
                    __skipSelectAfterInsert: true,
                    __skipRls: true,
                    __skipAclRls: true,
                    execParams: {
                      orgID: orgID,
                      entityName: importParams.entityName,
                      operationDate: new Date(),
                      employeeNumberID: emp.employeeNumberID,
                      description: UB.i18n(`Вхідне сальдо періода {0} має декілька значень`, period.name)
                    }
                  })
                }
              }
              let priorSum = 0
              priorAccrualBalance.forEach(row => {
                if (row.sumTo !== 0) {
                  priorSum += row.sumTo
                  balanceDt.push({
                    sumFrom: row.sumTo,
                    sumTo: row.sumTo,
                    dictFundSourceID: row.dictFundSourceID,
                    dictProgClassID: row.dictProgClassID,
                    employeeNumberID: emp.employeeNumberID,
                    periodCalcID: period.ID,
                    sumPlus: 0,
                    sumMinus: 0,
                    sumPay: 0
                  })
                }
              })
              const accrual = UB.Repository('hr_accrual')
                .attrs(['*', 'payElID.ignoreInCalcPay'])
                .where('employeeNumberID', '=', emp.employeeNumberID)
                .where('periodCalcID', '=', period.ID)
                .where(`((flagsRec & 8192 != 8192) and (flagsRec & 4096 != 4096))`, 'custom')
                .selectAsObject({ 'payElID.ignoreInCalcPay': 'ignoreInCalcPay' })

              const accrualDt = UB.Repository('hr_accrualDt')
                .attrs(['accrualID', 'paySum', 'dictFundSourceID', 'dictProgClassID'])
                .where('accrualID', 'in', accrual.map(o => o.ID))
                .selectAsObject()

              accrual.forEach(accr => {
                if (!accr.ignoreInCalcPay) {
                  const accrDt = accrualDt.filter(o => o.accrualID === accr.ID)
                  if (!accrDt.length) {
                    accrDt.push({
                      accrualID: accr.ID,
                      paySum: accr.paySum,
                      dictFundSourceID,
                      dictProgClassID
                    })
                  }
                  let sumDt = 0
                  accrDt.forEach(row => {
                    sumDt = accrualService.round(sumDt + row.paySum)
                  })
                  if (sumDt !== accr.paySum) {
                    accrDt[0].paySum = accrualService.round(accrDt[0].paySum + accr.paySum - sumDt)
                  }
                  accrDt.forEach(det => {
                    const balance = balanceDt.find(o => o.dictFundSourceID === det.dictFundSourceID && o.dictProgClassID === det.dictProgClassID)
                    if (balance) {
                      balance.sumPlus += cont.payEl[accr.payElID].method.groupType === 'PAYMENT' ? (det.paySum || 0) : 0
                      balance.sumMinus += cont.payEl[accr.payElID].method.groupType === 'OFFTAKE' ? (det.paySum || 0) : 0
                      balance.sumPay += cont.payEl[accr.payElID].method.groupType === 'FORPAY' ? (det.paySum || 0) : 0
                      balance.sumTo = balance.sumFrom + balance.sumPlus - balance.sumMinus - balance.sumPay
                    } else {
                      balanceDt.push({
                        sumFrom: 0,
                        sumTo: (cont.payEl[accr.payElID].method.groupType === 'PAYMENT' ? 1 : -1) * (det.paySum || 0),
                        dictFundSourceID: det.dictFundSourceID,
                        dictProgClassID: det.dictProgClassID,
                        employeeNumberID: emp.employeeNumberID,
                        periodCalcID: period.ID,
                        sumPlus: cont.payEl[accr.payElID].method.groupType === 'PAYMENT' ? (det.paySum || 0) : 0,
                        sumMinus: cont.payEl[accr.payElID].method.groupType === 'OFFTAKE' ? (det.paySum || 0) : 0,
                        sumPay: cont.payEl[accr.payElID].method.groupType === 'FORPAY' ? (det.paySum || 0) : 0
                      })
                    }
                  })
                }
              })
              let sumTo = 0
              balanceDt.forEach(accrDt => {
                accrDt.sumFrom = accrualService.round(accrDt.sumFrom)
                accrDt.sumPlus = accrualService.round(accrDt.sumPlus)
                accrDt.sumMinus = accrualService.round(accrDt.sumMinus)
                accrDt.sumPay = accrualService.round(accrDt.sumPay)
                accrDt.sumTo = accrualService.round(accrDt.sumTo)
                sumTo += accrDt.sumTo
                accrDt.ID = accrualService.getID('S_HR_ACCRUALBALANCE')
                runStore.run('insert', {
                  __skipOptimisticLock: true,
                  __skipSelectAfterInsert: true,
                  __skipRls: true,
                  __skipAclRls: true,
                  execParams: accrDt
                })
              })
              if (priorSum === 0 && sumTo !== 0) {
                protocolStore.run('insert', {
                  __skipOptimisticLock: true,
                  __skipSelectAfterInsert: true,
                  __skipRls: true,
                  __skipAclRls: true,
                  execParams: {
                    orgID: orgID,
                    entityName: importParams.entityName,
                    operationDate: new Date(),
                    employeeNumberID: emp.employeeNumberID,
                    description: UB.i18n(`Вхідне сальдо = 0 вихідне = {0} період {1}`, sumTo, period.name)
                  }
                })
              }
            })
            paySummaryService.savePeriodOrgBalance(orgID, period)
            paySummaryService.savePeriodOrgEntry(orgID, period)
          } catch (error) {
            errorMessagesCount++
            protocolStore.run('insert', {
              __skipOptimisticLock: true,
              __skipSelectAfterInsert: true,
              __skipRls: true,
              __skipAclRls: true,
              execParams: {
                orgID: orgID,
                entityName: importParams.entityName,
                operationDate: new Date(),
                description: `${error.message}`.substring(0, 1999)
              }
            })
            console.log(`${error.message}`)
          }
        }
        App.dbCommit()
        store.freeNative()
        runStore.freeNative()
        store = null
        runStore = null
        store = UB.DataStore('tim_timeSheet')
        runStore = UB.DataStore('hr_accrualBalance')
      })
    }
  })
  return {
    state: errorMessagesCount ? '3' : '4',
    logCount: errorMessagesCount,
    errorMessages: []
  }
}

function getDependenceOrg (orgID) {
  return getDependence({ hr_organization: 'hr_organization' }, orgID)
}

function getDependenceEmployeeOrg (orgID) {
  const store = UB.DataStore('hr_employeeNumber')
  store.runSQL(
    `select n1.ID "ID", n1.orgID "orgID"
    from hr_employeeNumber n1
    inner join hr_importMap m1 on m1.entityName = 'hr_employeeNumber'
      and m1.outputID = n1.ID
      and m1.orgID = :orgID:`,
    { orgID })
  return store.getAsJsObject()
}

function getRowOrgID (row, dependenceOrg, dependenceEmployeeOrg) {
  if (row.impOrgID && dependenceOrg) {
    const org = dependenceOrg.hr_organization.find(o => o.inputID === Number(row.impOrgID))
    if (org && org.outputID) {
      return org.outputID
    }
  }
  if (row.employeeNumberID && dependenceEmployeeOrg) {
    const emp = dependenceEmployeeOrg.find(o => o.ID === Number(row.employeeNumberID))
    if (emp && emp.orgID) {
      return emp.orgID
    }
  }
  return null
}

function getAttrOrg (row) {
  return row.hasOwnProperty('orgID')
    ? 'orgID'
    : row.hasOwnProperty('organizationID')
      ? 'organizationID'
      : null
}

function getLoadMethod (loadMethod, params) {
  if (params.isOrgList) {
    switch (loadMethod) {
      case 'accrualSQL': return 'accrualOrgListSQL'
      case 'accrualFundSQL': return 'accrualFundOrgListSQL'
      default: return loadMethod
    }
  }
  return loadMethod
}
function accrualFundOrgListSQL (importParams, orgID, params) {
  let storeLog = UB.DataStore('hr_importLog')
  let dictStore = UB.DataStore(importParams.entityName)
  let importMapStore = UB.DataStore('hr_importMap')
  let errorMessagesCount = 0
  const currentPeriod = periodService.getCurrentPeriod(orgID)
  const db = App.dbConnections[App.domainInfo.entities.ubm_enum.connectionName]
  const insertRow = () => {
    let calcPeriodFrom
    let calcPeriodTo
    if (params.periodFromID) {
      calcPeriodFrom = periodService.getPeriod(params.periodFromID).dateFrom
    }
    if (params.periodToID) {
      calcPeriodTo = periodService.getPeriod(params.periodToID).dateFrom
    }
    if (!params.notDeleteAccrual) {
      if (importParams.withDetail) {
        dictStore.execSQL(`DELETE FROM ${importParams.entityName}Dt WHERE ${importParams.entityName.replace('hr_', '')}ID in
    (SELECT d.ID FROM ${importParams.entityName} d JOIN hr_dictPeriod p ON p.ID = d.periodCalcID 
    where d.orgID in (SELECT n1.orgID from hr_importAccrualFund a1
 inner join hr_importMap m2 on m2.orgID = :orgID: and m2.entityName = 'hr_employeeNumber' and m2.inputID = a1.employeeNumberID and m2.outputID is not null
        inner join hr_employeeNumber n1 on n1.ID = m2.outputID and n1.mi_deleteDate >= '9999-12-31'
        where a1.orgID = :orgID:
        GROUP by n1.orgID) AND p.isClosed = 1
    ${calcPeriodFrom ? ' AND p.dateFrom >= :calcPeriodFrom: ' : ''}
    ${calcPeriodTo ? ' AND p.dateFrom <= :calcPeriodTo: ' : ''}
    )`,
        { orgID: orgID, calcPeriodFrom, calcPeriodTo })
      }
      dictStore.execSQL(`DELETE FROM ${importParams.entityName} WHERE ID in
    (SELECT d.ID FROM ${importParams.entityName} d JOIN hr_dictPeriod p ON p.ID = d.periodCalcID 
    where d.orgID in (SELECT n1.orgID from hr_importAccrualFund a1
 inner join hr_importMap m2 on m2.orgID = :orgID: and m2.entityName = 'hr_employeeNumber' and m2.inputID = a1.employeeNumberID and m2.outputID is not null
        inner join hr_employeeNumber n1 on n1.ID = m2.outputID and n1.mi_deleteDate >= '9999-12-31'
        where a1.orgID = :orgID:
        GROUP by n1.orgID) AND p.isClosed = 1
     ${calcPeriodFrom ? ' AND p.dateFrom >= :calcPeriodFrom: ' : ''}
    ${calcPeriodTo ? ' AND p.dateFrom <= :calcPeriodTo: ' : ''}
    )`,
      { orgID: orgID, calcPeriodFrom, calcPeriodTo })
    }
    const periodFrom = UB.Repository(importParams.impEntityName)
      .attrs(importParams.withDetail ? ['MIN([periodCalc])', 'MIN([periodSalary])'] : ['MIN([periodCalc])']).where('orgID', '=', orgID)
      .limit(1)
      .selectSingle()
    const startDate = dateService.firstDayOfMonth(Math.min(periodFrom['MIN([periodCalc])'] ? dateService.shiftDate(periodFrom['MIN([periodCalc])']) : dateService.currentDate(),
      periodFrom['MIN([periodSalary])'] ? dateService.shiftDate(periodFrom['MIN([periodSalary])']) : dateService.currentDate()))
    periodService.createPeriod({ orgID, onDate: dateService.currentDate(), setCurrent: false, startDate })
    dictStore.execSQL(`insert into hr_accrualFund (ID, periodCalcID, periodSalaryID, periodCalc, periodSalary, employeeNumberID, payFundID, sourceSum, baseSum, addMinSum, rate, paySum, orgID) 
                          select a1.ID,p1.ID periodCalcID, p2.ID periodSalaryID, a1.periodCalc, a1.periodSalary,  m2.outputID employeeNumberID,
                             m1.outputID payFundID, a1.sourceSum, a1.baseSum, a1.addMinSum, a1.rate, coalesce(a1.paySum, 0), n.orgID
                      from hr_importAccrualFund a1
                              inner join hr_importMap m2 on m2.orgID = :orgID: and m2.entityName = 'hr_employeeNumber' and m2.inputID = a1.employeeNumberID and m2.outputID is not null
                              join hr_employeeNumber n on n.ID = m2.outputID and n.mi_deleteDate >= '9999-12-31'
                              inner join hr_importMap m1 on m1.orgID = :orgID: and m1.entityName = 'hr_payFund' and m1.inputID = a1.payFundID and m1.outputID is not null
                              inner join hr_dictPeriod p1 on p1.orgID = n.orgID and p1.dateFrom = a1.periodCalc and p1.mi_deleteDate >= '9999-12-31'
                              inner join hr_dictPeriod p2 on p2.orgID = n.orgID and p2.dateFrom = a1.periodSalary and p2.mi_deleteDate >= '9999-12-31'
                              
                              
                      where a1.orgID = :orgID: AND a1.periodCalc < :periodCalc: 
                       ${calcPeriodFrom ? 'AND a1.periodCalc >= :calcPeriodFrom:' : ''}
                            ${calcPeriodTo ? 'AND a1.periodCalc <= :calcPeriodTo:' : ''}
                      `,
    {
      orgID: orgID,
      periodCalc: currentPeriod.dateFrom,
      calcPeriodFrom,
      calcPeriodTo
    })
    importMapStore.execSQL(`update hr_importMap SET
    outputID = subquery.ID
    FROM (select ID, impID from hr_importAccrualFund where orgID in (
          select m1.outputID
          from hr_importMap m1
          where m1.entityName = 'hr_organization'
            and m1.outputID is not null
            and m1.orgID = :orgID:) AND periodCalc < :periodCalc:) AS subquery
    WHERE hr_importMap.inputID = subquery.impID AND hr_importMap.orgID = :orgID: AND hr_importMap.entityName = 'hr_accrualFund';`,
    { orgID: orgID, periodCalc: currentPeriod.dateFrom })
  }
  try {
    db.savepointWrap(insertRow)
  } catch (error) {
    errorMessagesCount++
    storeLog.run('insert', {
      __skipOptimisticLock: true,
      __skipSelectAfterInsert: true,
      __skipRls: true,
      __skipAclRls: true,
      execParams: {
        orgID: orgID,
        entityName: importParams.entityName,
        description: `${error.message}`.substring(0, 1999)
      }
    })
  }
  return {
    state: errorMessagesCount ? '3' : '4',
    logCount: errorMessagesCount,
    errorMessages: []
  }
}

function accrualOrgListSQL (importParams, orgID, params) {
  const storeLog = UB.DataStore('hr_importLog')
  const dictStore = UB.DataStore(importParams.entityName)
  const importMapStore = UB.DataStore('hr_importMap')
  let errorMessagesCount = 0
  const currentPeriod = periodService.getCurrentPeriod(orgID)
  const db = App.dbConnections[App.domainInfo.entities.ubm_enum.connectionName]
  const insertRow = () => {
    let calcPeriodFrom
    let calcPeriodTo
    if (params.periodFromID) {
      calcPeriodFrom = periodService.getPeriod(params.periodFromID).dateFrom
    }
    if (params.periodToID) {
      calcPeriodTo = periodService.getPeriod(params.periodToID).dateFrom
    }

    if (!params.notDeleteAccrual) {
      dictStore.execSQL(
        `DELETE FROM hr_accrualDt
      WHERE accrualID in (
        SELECT d.ID
        FROM hr_accrual d JOIN hr_dictPeriod p ON p.ID = d.periodCalcID
        where d.orgID in (
           SELECT n1.orgID from hr_importAccrual a1
 inner join hr_importMap m2 on m2.orgID = :orgID: and m2.entityName = 'hr_employeeNumber' and m2.inputID = a1.employeeNumberID and m2.outputID is not null
        inner join hr_employeeNumber n1 on n1.ID = m2.outputID and n1.mi_deleteDate >= '9999-12-31'
        where a1.orgID = :orgID:
        GROUP by n1.orgID)  AND (p.isClosed = 1 OR d.flagsRec & 8 = 8) 
        ${calcPeriodFrom ? ' AND p.dateFrom >= :calcPeriodFrom: ' : ''}
        ${calcPeriodTo ? ' AND p.dateFrom <= :calcPeriodTo: ' : ''}
      )`, { orgID: orgID, calcPeriodFrom, calcPeriodTo })

      dictStore.execSQL(
        `DELETE FROM hr_accrualAvg
      WHERE accrualID in (
        SELECT d.ID
        FROM hr_accrual d JOIN hr_dictPeriod p ON p.ID = d.periodCalcID
        where d.orgID in (
           SELECT n1.orgID from hr_importAccrual a1
 inner join hr_importMap m2 on m2.orgID = :orgID: and m2.entityName = 'hr_employeeNumber' and m2.inputID = a1.employeeNumberID and m2.outputID is not null
        inner join hr_employeeNumber n1 on n1.ID = m2.outputID and n1.mi_deleteDate >= '9999-12-31'
        where a1.orgID = :orgID:
        GROUP by n1.orgID) AND (p.isClosed = 1 OR d.flagsRec & 8 = 8)
         ${calcPeriodFrom ? ' AND p.dateFrom >= :calcPeriodFrom: ' : ''}
        ${calcPeriodTo ? ' AND p.dateFrom <= :calcPeriodTo: ' : ''}
      )`, { orgID: orgID, calcPeriodFrom, calcPeriodTo })

      dictStore.execSQL(
        `DELETE FROM hr_taxIndividAcc
      WHERE accrualID in (
        SELECT d.ID
        FROM hr_accrual d JOIN hr_dictPeriod p ON p.ID = d.periodCalcID
        where d.orgID in (
           SELECT n1.orgID from hr_importAccrual a1
 inner join hr_importMap m2 on m2.orgID = :orgID: and m2.entityName = 'hr_employeeNumber' and m2.inputID = a1.employeeNumberID and m2.outputID is not null
        inner join hr_employeeNumber n1 on n1.ID = m2.outputID and n1.mi_deleteDate >= '9999-12-31'
        where a1.orgID = :orgID:
        GROUP by n1.orgID) AND (p.isClosed = 1 OR d.flagsRec & 8 = 8)
         ${calcPeriodFrom ? ' AND p.dateFrom >= :calcPeriodFrom: ' : ''}
        ${calcPeriodTo ? ' AND p.dateFrom <= :calcPeriodTo: ' : ''}
      )`, { orgID: orgID, calcPeriodFrom, calcPeriodTo })

      dictStore.execSQL(
        `DELETE FROM hr_accrual
      WHERE ID in (
        SELECT d.ID
        FROM hr_accrual d JOIN hr_dictPeriod p ON p.ID = d.periodCalcID
        where d.orgID in (
           SELECT n1.orgID from hr_importAccrual a1
 inner join hr_importMap m2 on m2.orgID = :orgID: and m2.entityName = 'hr_employeeNumber' and m2.inputID = a1.employeeNumberID and m2.outputID is not null
        inner join hr_employeeNumber n1 on n1.ID = m2.outputID and n1.mi_deleteDate >= '9999-12-31'
        where a1.orgID = :orgID:
        GROUP by n1.orgID) AND (p.isClosed = 1 OR d.flagsRec & 8 = 8)
         ${calcPeriodFrom ? ' AND p.dateFrom >= :calcPeriodFrom: ' : ''}
        ${calcPeriodTo ? ' AND p.dateFrom <= :calcPeriodTo: ' : ''}
        )`,
        { orgID: orgID, calcPeriodFrom, calcPeriodTo })
    }
    const periodFrom = UB.Repository(importParams.impEntityName)
      .attrs(importParams.withDetail ? ['MIN([periodCalc])', 'MIN([periodSalary])'] : ['MIN([periodCalc])']).where('orgID', '=', orgID)
      .limit(1)
      .selectSingle()
    const startDate = dateService.firstDayOfMonth(Math.min(periodFrom['MIN([periodCalc])'] ? dateService.shiftDate(periodFrom['MIN([periodCalc])']) : dateService.currentDate(),
      periodFrom['MIN([periodSalary])'] ? dateService.shiftDate(periodFrom['MIN([periodSalary])']) : dateService.currentDate()))
    periodService.createPeriod({ orgID, onDate: dateService.currentDate(), setCurrent: false, startDate })

    importMapStore.runSQL(`select a1.ID "ID", pl.ID "elID", a1.payElID "payElID" , n.ID "numID", a1.employeeNumberID "employeeNumberID", a1.periodCalc "periodCalc"
                  from hr_importAccrual a1
                          LEFT JOIN hr_importMap m1 on m1.orgID = :orgID: and m1.entityName = 'hr_payEl' and m1.inputID = a1.payElID and m1.outputID is not null
                          LEFT JOIN hr_payEl pl ON pl.ID = m1.outputID
                          LEFT JOIN hr_importMap m2 on m2.orgID = :orgID: and m2.entityName = 'hr_employeeNumber' and m2.inputID = a1.employeeNumberID and m2.outputID is not null
                          LEFT JOIN hr_employeeNumber n on n.ID = m2.outputID and n.mi_deleteDate >= '9999-12-31'
                          where a1.orgID = :orgID: AND (pl.ID is NULL OR n.ID is NULL OR a1.periodCalc >= :periodCalc:)
                            ${calcPeriodFrom ? 'AND a1.periodCalc >= :calcPeriodFrom:' : ''}
                            ${calcPeriodTo ? 'AND a1.periodCalc <= :calcPeriodTo:' : ''}`,
    {
      orgID,
      periodCalc: currentPeriod.dateFrom,
      calcPeriodFrom,
      calcPeriodTo
    })
    const logData = importMapStore.getAsJsObject()
    logData.forEach(row => {
      errorMessagesCount++
      let message = ''
      if (!row.elID) {
        message = `${message}${message.length ? ' ' : ''} Не знайдено вид оплати payElID = ${row.payElID}`
      }
      if (!row.numID) {
        message = `${message}${message.length ? ' ' : ''} Не знайдено працівника employeeNumberID = ${row.employeeNumberID}`
      }
      if (row.periodCalc && dateService.shiftDate(row.periodCalc) >= currentPeriod.dateFrom) {
        message = `${message}${message.length ? ' ' : ''} Розрахунковий період більше або дорівнює поточному`
      }

      storeLog.run('insert', {
        __skipOptimisticLock: true,
        __skipSelectAfterInsert: true,
        __skipRls: true,
        __skipAclRls: true,
        execParams: {
          orgID: orgID,
          entityName: importParams.entityName,
          description: `ID(${row.ID}) ${message}`.substring(0, 1999)
        }
      })
    })

    dictStore.execSQL(
      `insert into hr_accrual (
        ID, payElID, baseSum, paySum, days, hours, periodCalcID, periodSalaryID, employeeNumberID, rate, calculateDate,
        periodCalc, periodSalary, flagsRec, flagsFix, planHours, planDays, mask, maskAdd, mtCount, dateFrom, dateTo, linkToParentID, linkToChildID,
        source, sourceID, paymentID, avgCalcType, dateFromAvg, dateToAvg, koef, minSalarySum, sumAvg,
        planSumAvg, incomingDebtSum, repaymentDebtSum, calculatedSum, repaymentSum, hoursByDays, planHoursByDays,
        employeeNumberPartID,orderDateFrom, orderDateTo, isAvg, extraRate ,basePayment, orgID, 
        dictFundSourceID, dictProgClassID)
      select a1.ID, m1.outputID payElID, a1.baseSum, coalesce(a1.paySum, 0) paySum, a1.days, a1.hours, p1.ID periodCalcID, p2.ID periodSalaryID,
        m2.outputID employeeNumberID, a1.rate, a1.calculateDate, a1.periodCalc, a1.periodSalary,
       ((CASE WHEN (COALESCE(a1.flagsRec, 8) & 4096) = 4096 THEN (a1.flagsRec | 8192) ELSE COALESCE(a1.flagsRec, 8) END) |
       (CASE WHEN :fixedUser: = 1 AND (mg.groupType <> 'OFFTAKE' OR p2.isClosed = 1) THEN 4 ELSE 0 END) | 
          (CASE WHEN coalesce(a1.paySum, 0) < 0 THEN 512 ELSE 0 END) | (CASE WHEN pl.ignoreInCalcPay = 1 THEN 8192 ELSE 0 END)) flagsRec, 
        COALESCE(a1.flagsFix,0) flagsFix, a1.planHours, a1.planDays, COALESCE(a1.mask, 0) mask, COALESCE(a1.maskAdd, 0) maskAdd, mtCount, 
        (CASE WHEN (a1.dateFrom >= p2.dateFrom AND a1.dateFrom <= p2.dateTo) THEN a1.dateFrom ELSE p2.dateFrom END) dateFrom,
        (CASE WHEN (a1.dateTo >= p2.dateFrom AND a1.dateTo <= p2.dateTo) THEN a1.dateTo ELSE p2.dateTo END) dateTo,
        a1.linkToParentID, a1.linkToChildID, a1.source, m3.outputID sourceID, a1.paymentID, a1.avgCalcType, a1.dateFromAvg, a1.dateToAvg,
        a1.koef, a1.minSalarySum, a1.sumAvg, a1.planSumAvg, a1.incomingDebtSum, a1.repaymentDebtSum, a1.calculatedSum, a1.repaymentSum,
        a1.hoursByDays, a1.planHoursByDays, m4.outputID employeeNumberPartID , a1.orderDateFrom, a1.orderDateTo, a1.isAvg, a1.extraRate,
        a1.basePayment,
        n1.orgID, 
        m5.outputID dictFundSourceID, m6.outputID dictProgClassID
      from hr_importAccrual a1
        inner join hr_importMap m1 on m1.orgID = :orgID: and m1.entityName = 'hr_payEl' and m1.inputID = a1.payElID and m1.outputID is not null
        JOIN hr_payEl pl ON pl.ID = m1.outputID
        JOIN hr_method m on pl.methodID = m.ID 
        JOIN hr_methodGroup mg on m.methodGroupID = mg.ID  
        inner join hr_importMap m2 on m2.orgID = :orgID: and m2.entityName = 'hr_employeeNumber' and m2.inputID = a1.employeeNumberID and m2.outputID is not null
        inner join hr_employeeNumber n1 on n1.ID = m2.outputID and n1.mi_deleteDate >= '9999-12-31'
        inner join hr_dictPeriod p1 on p1.orgID = n1.orgID and p1.dateFrom = a1.periodCalc and p1.mi_deleteDate >= '9999-12-31'
        inner join hr_dictPeriod p2 on p2.orgID = n1.orgID and p2.dateFrom = a1.periodSalary and p2.mi_deleteDate >= '9999-12-31'
        left join hr_importMap m3 on m3.orgID = :orgID: and m3.entityName = a1.source and m3.inputID = a1.sourceID
        left join hr_importMap m4 on m4.orgID = :orgID: and m4.entityName = 'hr_employeeNumber' and m4.inputID = a1.employeeNumberPartID
        left join hr_importMap m5 on m5.orgID = :orgID: and m5.entityName = 'ac_fundSource' and m5.inputID = a1.dictFundSourceID
        left join hr_importMap m6 on m6.orgID = :orgID: and m6.entityName = 'ac_dictProgClass' and m6.inputID = a1.dictProgClassID
      where a1.orgID = :orgID: AND a1.periodCalc < :periodCalc:
      ${calcPeriodFrom ? 'AND a1.periodCalc >= :calcPeriodFrom:' : ''}
      ${calcPeriodTo ? 'AND a1.periodCalc <= :calcPeriodTo:' : ''}
      `, { orgID: orgID,
        periodCalc: currentPeriod.dateFrom,
        fixedUser: params.fixedUser ? 1 : 0,
        calcPeriodFrom,
        calcPeriodTo
      })
    importMapStore.execSQL(`update hr_importMap SET
    outputID = subquery.ID
    FROM (select ID, impID from hr_importAccrual where orgID in (
          select m1.outputID
          from hr_importMap m1
          where m1.entityName = 'hr_organization'
            and m1.outputID is not null
            and m1.orgID = :orgID:) AND periodCalc < :periodCalc:) AS subquery
    WHERE hr_importMap.inputID = subquery.impID AND hr_importMap.orgID = :orgID: AND hr_importMap.entityName = 'hr_accrual';`,
    { orgID: orgID, periodCalc: currentPeriod.dateFrom })
  }
  try {
    db.savepointWrap(insertRow)
  } catch (error) {
    errorMessagesCount++
    storeLog.run('insert', {
      __skipOptimisticLock: true,
      __skipSelectAfterInsert: true,
      __skipRls: true,
      __skipAclRls: true,
      execParams: {
        orgID: orgID,
        entityName: importParams.entityName,
        description: `${error.message}`.substring(0, 1999)
      }
    })
  }
  return {
    state: errorMessagesCount ? '3' : '4',
    logCount: errorMessagesCount,
    errorMessages: []
  }
}

function makeCamelCaseNames (namesToFix, camelCaseNames) {
  return namesToFix.map(name => camelCaseNames.find(attrName => attrName.toUpperCase() === name.toUpperCase()) || name)
}
