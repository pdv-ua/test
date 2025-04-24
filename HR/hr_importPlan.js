const UB = require('@unitybase/ub')
const Session = UB.Session
const App = UB.App
const queryString = require('querystring')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const importConfig = require('../HR/modules/import/importConfig')
const importService = require('../HR/modules/import/importService')
const dateService = require('../AC/modules/dataServices/dateService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')
const { generateBase64Str } = require('../AC/modules/dataServices/filesService')

App.registerEndpoint('loadImportData', loadData, true)
App.registerEndpoint('loadImportDataEx', loadDataEx, true)

me.entity.addMethod('getImportPlan')
me.entity.addMethod('doImport')
me.entity.addMethod('doImportNumbers')
me.entity.addMethod('doImportRaiseSalary')
me.entity.addMethod('doImportWorkPlace')
me.entity.addMethod('doEmptyNumbers')
me.entity.addMethod('uploadTemplatesCsv')
me.entity.addMethod('importDelete')
me.entity.addMethod('migrationCheck')
me.entity.addMethod('correctMistakes')

/**
 * @param {THTTPRequest} req
 * @param {THTTPResponse} resp
 */
function loadDataEx (req, resp) {
  if (req.method !== 'POST') {
    return resp.badRequest('invalid HTTP verb' + req.method)
  }
  let params = queryString.parse(req.parameters)
  let data = req.read('bin')

  let result = importService.loadFileDataEx(params, data)
  resp.statusCode = 200
  resp.writeHead('Content-Type: application/json;charset=UTF-8')
  resp.writeEnd(JSON.stringify(result))
  data = null
}

function loadData (req, resp) {
  if (req.method !== 'POST') {
    return resp.badRequest('invalid HTTP verb' + req.method)
  }
  let params = queryString.parse(req.parameters)
  let data = req.read('bin')

  let result = importService.loadFileData(params, data)
  resp.statusCode = 200
  resp.writeHead('Content-Type: application/json;charset=UTF-8')
  resp.writeEnd(result)
  data = null
}

me.getImportPlan = function (ctx) {
  const mParams = ctx.mParams
  let addNewPlan = false
  const store = UB.DataStore('hr_importPlan')
  const config = importConfig.getConfig(mParams.appCode)
  const planBuilder = UB.Repository('hr_importPlan')
    .attrs(['ID', 'orgID', 'entityName', 'impEntityName', 'entityDescription', 'fileName', 'entityType', 'state',
      'makeImport', 'startLoad', 'finishLoad', 'startImport', 'finishImport',
      'loadDataType', 'sortOrder'].concat(mParams.isMapping ? ['mapNullCount'] : ['logCount']))
    .where('orgID', '=', mParams.orgID)
  if (mParams.appCode) {
    planBuilder.where('appCode', '=', mParams.appCode)
  } else {
    planBuilder.where('appCode', 'isNull')
  }
  const exc = []
  if (mParams.isMapping) {
    Object.keys(config).forEach(item => {
      if (config[item].map === false) {
        exc.push(config[item].entityName)
      }
    })
    if (exc.length) {
      planBuilder.where('entityName', 'notIn', exc)
    }
  }

  const importPlan = planBuilder.orderBy('sortOrder').selectAsObject()
  if (!mParams.isMapping) {
    Object.keys(config).forEach(item => {
      const plan = importPlan.find(o => o.entityName === config[item].entityName)
      if (!plan) {
        addNewPlan = true
        store.run('insert', {
          execParams: {
            orgID: mParams.orgID,
            entityName: config[item].entityName,
            entityDescription: config[item].entityDescription,
            entityType: config[item].entityType,
            makeImport: 0, // config[item].entityType !== '3' ? 1 : 0,
            sortOrder: config[item].sortOrder,
            impEntityName: config[item].impEntityName,
            appCode: mParams.appCode || null,
            loadDataType: config[item].loadDataType || '1'
          }
        })
      } else if (plan.entityDescription !== config[item].entityDescription || plan.sortOrder !== config[item].sortOrder || plan.loadDataType !== config[item].loadDataType) {
        plan.entityDescription = config[item].entityDescription
        plan.sortOrder = config[item].sortOrder
        addNewPlan = true
        store.run('update', {
          __skipOptimisticLock: true,
          execParams: {
            ID: plan.ID,
            loadDataType: config[item].loadDataType || '1',
            entityDescription: config[item].entityDescription,
            sortOrder: config[item].sortOrder
          }
        })
      }
    })
  }
  const userLang = Session.uData.lang
  let plan = !addNewPlan ? importPlan : planBuilder.selectAsObject()

  plan.forEach(el => {
    let entity = config[el.entityName]
    if (entity) {
      el.entityDescription = entity[`entityDescription_${userLang}`] ? entity[`entityDescription_${userLang}`] : entity[`entityDescription`]
    }
  })

  mParams.resultData = JSON.stringify(plan)
}

me.doImport = function (ctx) {
  const mParams = ctx.mParams
  const importPlan = JSON.parse(mParams.importPlan)
  let params = UB.Repository('hr_importParams')
    .attrs(['*'])
    .where('orgID', '=', mParams.orgID)
    .selectSingle()
  if (!params) {
    params = {
      isAddNew: 1,
      isUpdate: 1,
      addTimeSheet: 1,
      notUpdateDays: 1,
      notUpdateHour: 1
    }
  }

  importPlan.forEach(row => {
    Object.assign(row, importService.doImport(row.planID, params))
  })
  mParams.resultData = JSON.stringify(importPlan)
}

me.doImportNumbers = function (ctx) {
  const mParams = ctx.mParams
  const data = JSON.parse(mParams.data)
  const store = UB.DataStore('hr_employeeNumber')
  const employeeNumbers = UB.Repository('hr_employeeNumberS')
    .attrs(['ID', 'employeeID.taxCode'])
    .where('orgID', '=', mParams.orgID)
    .selectAsObject()

  employeeNumbers.forEach(row => {
    const empNum = data.find(o => o.taxCode === row['employeeID.taxCode'])
    if (empNum && empNum.tabNum && empNum.tabNum !== '') {
      store.run('update', {
        __skipOptimisticLock: true,
        isImport: true,
        execParams: {
          ID: row.ID,
          tabNum: empNum.tabNum
        }
      })
    }
  })

  mParams.resultData = 1
}

me.doImportRaiseSalary = function (ctx) {
  const mParams = ctx.mParams
  const data = JSON.parse(mParams.data)
  const store = UB.DataStore('hr_employeePosition')
  const orgID = mParams.orgID
  data.forEach(row => {
    const dateFrom = dateService.shiftDate(row.dateFrom)
    const innerEmployeeNumberID = importConfig.getImpMapValue(row.employeeNumberID, orgID, 'hr_employeeNumber')
    if (innerEmployeeNumberID) {
      const empPos = UB.Repository('hr_employeePositionS')
        .attrs(['ID'])
        .where('employeeNumberID', '=', innerEmployeeNumberID)
        .where('dateTo', '>=', dateFrom)
        .selectAsObject()
      empPos.forEach(item => {
        store.run('update', {
          __skipOptimisticLock: true,
          execParams: {
            ID: item.ID,
            raiseSalary: dateService.shiftDate(row.raiseSalary)
          }
        })
      })
    }
  })
  mParams.resultData = 1
}

me.doImportWorkPlace = function (ctx) {
  const mParams = ctx.mParams
  const data = JSON.parse(mParams.data)
  const store = UB.DataStore('hr_employeePosition')
  const orgID = mParams.orgID
  data.forEach(row => {
    if (row.workPlace) {
      if (row.employeePositionID) {
        const innerEmployeePositionID = importConfig.getImpMapValue(row.employeePositionID, orgID, 'hr_employeePosition')
        if (innerEmployeePositionID) {
          store.execSQL(` UPDATE hr_employeePosition SET workPlace = :workPlace: WHERE ID = :ID:`,
            { ID: innerEmployeePositionID, workPlace: row.workPlace })
        }
      } else if (row.employeeNumberID) {
        const innerEmployeeNumberID = importConfig.getImpMapValue(row.employeeNumberID, orgID, 'hr_employeeNumber')
        if (innerEmployeeNumberID) {
          const empPos = UB.Repository('hr_employeePositionS')
            .attrs(['ID'])
            .where('employeeNumberID', '=', innerEmployeeNumberID)
            .selectAsObject()
          empPos.forEach(item => {
            store.execSQL(` UPDATE hr_employeePosition SET workPlace = :workPlace: WHERE ID = :ID:`,
              { ID: item.ID, workPlace: row.workPlace })
          })
        }
      }
    }
  })
  mParams.resultData = 1
}

me.uploadTemplatesCsv = function (ctx) {
  const { mParams } = ctx
  const files = []
  let importPlans
  if (mParams.isUploadAll) {
    importPlans = UB.Repository('hr_importPlan')
      .attrs(['entityDescription', 'impEntityName'])
      .where('orgID', '=', mParams.orgID)
      .selectAsObject()
  } else {
    importPlans = UB.Repository('hr_importPlan')
      .attrs(['entityDescription', 'impEntityName'])
      .where('ID', 'in', mParams.importPlanIDs)
      .where('orgID', '=', mParams.orgID)
      .selectAsObject()
  }

  importPlans.forEach(importPlan => {
    if (importPlan.impEntityName) {
      let data = Object.keys(App.domainInfo.entities[importPlan.impEntityName].attributes)
      for (let idx = data.length - 1; idx > 0; idx--) {
        if ((data[idx].startsWith('mi_') && !['mi_dateFrom', 'mi_dateTo'].includes(data[idx])) || ['impID', 'orgID'].includes(data[idx])) {
          data.splice(idx, 1)
        }
      }
      files.push({
        data: generateBase64Str(data.join(';'), 'win1251'),
        fileName: importPlan.entityDescription
      })
    }
  })

  mParams.files = JSON.stringify(files)
}

me.doEmptyNumbers = function (ctx) {
  const mParams = ctx.mParams
  const data = JSON.parse(mParams.data)
  const resultData = []

  const employeeNumbers = UB.Repository('hr_employeeNumberS')
    .attrs(['employeeID.taxCode', 'description'])
    .where('orgID', '=', mParams.orgID)
    .selectAsObject({
      'employeeID.taxCode': 'taxCode'
    })

  employeeNumbers.forEach(row => {
    const empNum = data.find(o => o.taxCode === row.taxCode)
    if (!empNum) {
      resultData.push(row)
    }
  })

  mParams.resultData = JSON.stringify(resultData)
}

me.importDelete = function (ctx) {
  const mParams = ctx.mParams
  const store = UB.DataStore('hr_importMap')
  // const storeDelete = UB.DataStore(mParams.entityName)
  const deleteDate = new Date()
  let params = UB.Repository('hr_importParams').attrs(['*']).where('orgID', '=', mParams.orgID).selectSingle()
  if (!params) {
    params = { isAddNew: 1, isUpdate: 1 }
  }
  const dimensionID = UB.Repository('gl_dimension').attrs(['ID']).where('entityName', '=', mParams.entityName).selectScalar()

  if (!params || !params.isOrgDelete) {
    if (dimensionID) {
      store.execSQL(`UPDATE gl_dimValue SET mi_deleteUser = 10, mi_deleteDate = :deleteDate: 
  WHERE dimension = :dimensionID: AND ID in (SELECT outputID FROM hr_importMap WHERE orgID = :orgID: AND entityName = :entityName: AND outputID IS NOT NULL )`,
      { dimensionID, orgID: mParams.orgID, entityName: mParams.entityName, deleteDate })
    }
    if (global[mParams.entityName].entity.attributes.mi_deleteDate) {
      store.execSQL(`UPDATE ${mParams.entityName} SET mi_deleteUser = 10, mi_deleteDate = :deleteDate:
  WHERE ID in (SELECT outputID FROM hr_importMap WHERE orgID = :orgID: AND entityName = :entityName: AND outputID IS NOT NULL )`,
      { orgID: mParams.orgID, entityName: mParams.entityName, deleteDate })
    } else {
      store.execSQL(`DELETE FROM ${mParams.entityName}
  WHERE ID in (SELECT outputID FROM hr_importMap WHERE orgID = :orgID: AND entityName = :entityName: AND outputID IS NOT NULL )`,
      { orgID: mParams.orgID, entityName: mParams.entityName })
    }
    if (['org_organization', 'hr_department', 'hr_position'].includes(mParams.entityName)) {
      store.execSQL(`UPDATE hr_staffUnit SET mi_deleteUser = 10, mi_deleteDate = :deleteDate:
  WHERE ID in (SELECT outputID FROM hr_importMap WHERE orgID = :orgID: AND entityName = :entityName: AND outputID IS NOT NULL )`,
      { orgID: mParams.orgID, entityName: mParams.entityName, deleteDate })
      store.execSQL(`UPDATE org_unit SET mi_deleteUser = 10, mi_deleteDate = :deleteDate:
  WHERE ID in (SELECT outputID FROM hr_importMap WHERE orgID = :orgID: AND entityName = :entityName: AND outputID IS NOT NULL )`,
      { orgID: mParams.orgID, entityName: mParams.entityName, deleteDate })
      if (['hr_department'].includes(mParams.entityName)) {
        store.execSQL(`UPDATE org_department SET mi_deleteUser = 10, mi_deleteDate = :deleteDate: 
  WHERE ID in (SELECT outputID FROM hr_importMap WHERE orgID = :orgID: AND entityName = :entityName: AND outputID IS NOT NULL )`,
        { orgID: mParams.orgID, entityName: mParams.entityName, deleteDate })
      }
      if (['hr_organization'].includes(mParams.entityName)) {
        store.execSQL(`UPDATE ac_organization  SET mi_deleteUser = 10, mi_deleteDate = :deleteDate:
  WHERE ID in (SELECT outputID FROM hr_importMap WHERE orgID = :orgID: AND entityName = :entityName: AND outputID IS NOT NULL )`,
        { orgID: mParams.orgID, entityName: mParams.entityName, deleteDate })
        store.execSQL(`UPDATE org_organization  SET mi_deleteUser = 10, mi_deleteDate = :deleteDate:
  WHERE ID in (SELECT outputID FROM hr_importMap WHERE orgID = :orgID: AND entityName = :entityName: AND outputID IS NOT NULL )`,
        { orgID: mParams.orgID, entityName: mParams.entityName, deleteDate })
      }
    } else if (mParams.entityName === 'hr_employee') {
      store.execSQL(`UPDATE org_employee SET mi_deleteUser = 10, mi_deleteDate = :deleteDate: 
  WHERE ID in (SELECT outputID FROM hr_importMap WHERE orgID = :orgID: AND entityName = :entityName: AND outputID IS NOT NULL )`,
      { orgID: mParams.orgID, entityName: mParams.entityName, deleteDate })
      store.execSQL(`UPDATE ac_employeeOrg SET mi_deleteUser = 10, mi_deleteDate = :deleteDate: 
  WHERE employeeID in (SELECT outputID FROM hr_importMap WHERE orgID = :orgID: AND entityName = :entityName: AND outputID IS NOT NULL )`,
      { orgID: mParams.orgID, entityName: mParams.entityName, deleteDate })
    } else if (mParams.entityName === 'hr_empVacationPeriod') {
      store.execSQL(`UPDATE hr_empVacationPlan SET mi_deleteUser = 10, mi_deleteDate = :deleteDate:
  WHERE ID in (SELECT p.empVacationPlanID FROM ${mParams.entityName} p WHERE p.ID in (SELECT outputID FROM hr_importMap WHERE orgID = :orgID: AND entityName = :entityName: AND outputID IS NOT NULL ))`,
      { orgID: mParams.orgID, entityName: mParams.entityName, deleteDate })
    } else if (mParams.entityName === 'ac_bank') {
      store.execSQL(`UPDATE cdn_bank SET mi_deleteUser = 10, mi_deleteDate = :deleteDate: 
  WHERE ID in (SELECT outputID FROM hr_importMap WHERE orgID = :orgID: AND entityName = :entityName: AND outputID IS NOT NULL )`,
      { orgID: mParams.orgID, entityName: mParams.entityName, deleteDate })
    }

    store.execSQL(`UPDATE hr_importMap SET outputID = null, outputCode = null, outputName = null
  WHERE orgID = :orgID: AND entityName = :entityName: AND outputID IS NOT NULL`,
    { orgID: mParams.orgID, entityName: mParams.entityName })
  } else {
    if (global[mParams.entityName].entity.attributes.orgID || global[mParams.entityName].entity.attributes.organizationID) {
      const orgAttr = global[mParams.entityName].entity.attributes.orgID ? 'orgID' : 'organizationID'
      if (dimensionID) {
        store.execSQL(`UPDATE gl_dimValue SET mi_deleteUser = 10, mi_deleteDate = :deleteDate: 
  WHERE dimension = :dimensionID: AND ID in (SELECT m.outputID FROM hr_importMap m
  JOIN ${mParams.entityName} j ON j.ID = m.outputID
  WHERE j.${orgAttr} = :orgID: AND m.entityName = :entityName: AND m.outputID IS NOT NULL )`,
        { dimensionID, orgID: mParams.orgID, entityName: mParams.entityName, deleteDate })
      }
      if (global[mParams.entityName].entity.attributes.mi_deleteDate) {
        store.execSQL(`UPDATE ${mParams.entityName} SET mi_deleteUser = 10, mi_deleteDate = :deleteDate:
  WHERE ID in (SELECT m.outputID FROM hr_importMap m
  JOIN ${mParams.entityName} j ON j.ID = m.outputID
  WHERE j.${orgAttr} = :orgID: AND m.entityName = :entityName: AND m.outputID IS NOT NULL )`,
        { orgID: mParams.orgID, entityName: mParams.entityName, deleteDate })
      } else {
        store.execSQL(`DELETE FROM ${mParams.entityName}
  WHERE ID in (SELECT m.outputID FROM hr_importMap m
  JOIN ${mParams.entityName} j ON j.ID = m.outputID
  WHERE j.${orgAttr} = :orgID: AND m.entityName = :entityName: AND m.outputID IS NOT NULL )`,
        { orgID: mParams.orgID, entityName: mParams.entityName })
      }
      if (['org_organization', 'hr_department', 'hr_position'].includes(mParams.entityName)) {
        store.execSQL(`UPDATE hr_staffUnit SET mi_deleteUser = 10, mi_deleteDate = :deleteDate:
  WHERE ID in (SELECT m.outputID FROM hr_importMap m
  JOIN ${mParams.entityName} j ON j.ID = m.outputID
  WHERE j.${orgAttr} = :orgID: AND m.entityName = :entityName: AND m.outputID IS NOT NULL )`,
        { orgID: mParams.orgID, entityName: mParams.entityName, deleteDate })
        store.execSQL(`UPDATE org_unit SET mi_deleteUser = 10, mi_deleteDate = :deleteDate:
  WHERE ID in (SELECT m.outputID FROM hr_importMap m
  JOIN ${mParams.entityName} j ON j.ID = m.outputID
  WHERE j.${orgAttr} = :orgID: AND m.entityName = :entityName: AND m.outputID IS NOT NULL )`,
        { orgID: mParams.orgID, entityName: mParams.entityName, deleteDate })
        if (['hr_department'].includes(mParams.entityName)) {
          store.execSQL(`UPDATE org_department SET mi_deleteUser = 10, mi_deleteDate = :deleteDate: 
  WHERE ID in (SELECT m.outputID FROM hr_importMap m
  JOIN ${mParams.entityName} j ON j.ID = m.outputID
  WHERE j.${orgAttr} = :orgID: AND m.entityName = :entityName: AND m.outputID IS NOT NULL )`,
          { orgID: mParams.orgID, entityName: mParams.entityName, deleteDate })
        }
        if (['hr_organization'].includes(mParams.entityName)) {
          store.execSQL(`UPDATE ac_organization  SET mi_deleteUser = 10, mi_deleteDate = :deleteDate:
  WHERE ID in (SELECT m.outputID FROM hr_importMap m
  JOIN ${mParams.entityName} j ON j.ID = m.outputID
  WHERE j.${orgAttr} = :orgID: AND m.entityName = :entityName: AND m.outputID IS NOT NULL )`,
          { orgID: mParams.orgID, entityName: mParams.entityName, deleteDate })
          store.execSQL(`UPDATE org_organization  SET mi_deleteUser = 10, mi_deleteDate = :deleteDate:
  WHERE ID in (SELECT m.outputID FROM hr_importMap m
  JOIN ${mParams.entityName} j ON j.ID = m.outputID
  WHERE j.${orgAttr} = :orgID: AND m.entityName = :entityName: AND m.outputID IS NOT NULL )`,
          { orgID: mParams.orgID, entityName: mParams.entityName, deleteDate })
        }
      } else if (mParams.entityName === 'hr_employee') {
        store.execSQL(`UPDATE org_employee SET mi_deleteUser = 10, mi_deleteDate = :deleteDate: 
  WHERE ID in (SELECT m.outputID FROM hr_importMap m
  JOIN ${mParams.entityName} j ON j.ID = m.outputID
  WHERE j.${orgAttr} = :orgID: AND m.entityName = :entityName: AND m.outputID IS NOT NULL )`,
        { orgID: mParams.orgID, entityName: mParams.entityName, deleteDate })
        store.execSQL(`UPDATE ac_employeeOrg SET mi_deleteUser = 10, mi_deleteDate = :deleteDate: 
  WHERE employeeID in (SELECT m.outputID FROM hr_importMap m
  JOIN ${mParams.entityName} j ON j.ID = m.outputID
  WHERE j.${orgAttr} = :orgID: AND m.entityName = :entityName: AND m.outputID IS NOT NULL )`,
        { orgID: mParams.orgID, entityName: mParams.entityName, deleteDate })
      } else if (mParams.entityName === 'hr_empVacationPeriod') {
        store.execSQL(`UPDATE hr_empVacationPlan SET mi_deleteUser = 10, mi_deleteDate = :deleteDate:
  WHERE ID in (SELECT p.empVacationPlanID FROM ${mParams.entityName} p WHERE p.ID in 
  (SELECT m.outputID FROM hr_importMap m
  JOIN ${mParams.entityName} j ON j.ID = m.outputID
  WHERE j.${orgAttr} = :orgID: AND m.entityName = :entityName: AND m.outputID IS NOT NULL ))`,
        { orgID: mParams.orgID, entityName: mParams.entityName, deleteDate })
      } else if (mParams.entityName === 'ac_bank') {
        store.execSQL(`UPDATE cdn_bank SET mi_deleteUser = 10, mi_deleteDate = :deleteDate: 
  WHERE ID in (SELECT m.outputID FROM hr_importMap m
  JOIN ${mParams.entityName} j ON j.ID = m.outputID
  WHERE j.${orgAttr} = :orgID: AND m.entityName = :entityName: AND m.outputID IS NOT NULL )`,
        { orgID: mParams.orgID, entityName: mParams.entityName, deleteDate })
      }

      store.execSQL(`UPDATE hr_importMap SET outputID = null, outputCode = null, outputName = null
  WHERE ID in (SELECT m.outputID FROM hr_importMap m
  JOIN ${mParams.entityName} j ON j.ID = m.outputID
  WHERE j.${orgAttr} = :orgID: AND m.entityName = :entityName: AND m.outputID IS NOT NULL )`,
      { orgID: mParams.orgID, entityName: mParams.entityName })
    } else {
      throw new UB.UBAbort(`<<<${UB.i18n('Увага! Очищення можливо тільки під організацією, з якої вони були завантажені!  Параметр Розподіл за списком організацій=Ні')}>>>`)
    }
  }

  /* const importMap = UB.Repository('hr_importMap')
    .attrs(['ID', 'orgID', 'entityName', 'outputID'])
    .where('orgID', '=', mParams.orgID)
    .where('entityName', '=', mParams.entityName)
    .where('outputID', 'isNotNull')
    .selectAsObject()
  importMap.forEach(row => {
    storeDelete.run('delete', {
      execParams: {
        ID: row.outputID
      }
    })
    store.run('update', {
      execParams: {
        ID: row.ID,
        outputID: null,
        outputCode: null,
        outputName: null
      }
    })
  }) */
}

me.migrationCheck = function (ctx) {
  const mParams = ctx.mParams
  const sqlDialect = entityBaseService.getSQLDialect()
  const store = UB.DataStore(mParams.impEntityName)
  const result = []
  if (mParams.impEntityName === 'hr_importAccrual') {
    const sql1 = ` select hr_importAccrual.impID as "impID" from hr_importAccrual
                  join hr_importMap on hr_importAccrual.payElID = hr_importMap.inputID and hr_importAccrual.orgID = hr_importMap.orgID 
                  join hr_payEl on hr_payEl.ID = hr_importMap.outputID
                  join hr_method on hr_method.ID = hr_payEl.methodID
                  where hr_importAccrual.orgID = ${mParams.orgID}
                  and hr_importMap.entityName = 'hr_payEl'
                  and hr_method.code in ('63', '138', '1', '2')
                  and hr_importAccrual.days = 0`
    store.runSQL(sql1, {})
    let res = store.getAsJsObject()
    res.forEach(item => {
      item.value = UB.i18n('Помилка! Не вказана кількість днів')
      result.push(item)
    })
    const sql2 = ` select hr_importAccrual.impID as "impID" from hr_importAccrual
                  join hr_importMap on hr_importAccrual.payElID = hr_importMap.inputID and hr_importAccrual.orgID = hr_importMap.orgID
                  join hr_payEl on hr_payEl.ID = hr_importMap.outputID
                  join hr_method on hr_method.ID = hr_payEl.methodID
                  where hr_importAccrual.orgID = ${mParams.orgID}
                  and hr_importMap.entityName = 'hr_payEl'
                  and hr_method.code in ('63', '138', '1', '2')
                  and hr_importAccrual.days > 0
                  and cast(hr_importAccrual.hours as int) = 0 `
    store.runSQL(sql2, {})
    let res2 = store.getAsJsObject()
    res2.forEach(item => {
      item.value = UB.i18n('Помилка! Не вказана кількість годин')
      result.push(item)
    })
    const sql3 = ` select distinct (hr_importAccrual.impID) as "impID" from hr_importAccrual
                  join hr_importMap on hr_importAccrual.payElID = hr_importMap.inputID and hr_importAccrual.orgID = hr_importMap.orgID
                  join hr_payEl on hr_payEl.ID = hr_importMap.outputID
                  join hr_method on hr_method.ID = hr_payEl.methodID
                  where hr_importAccrual.orgID = ${mParams.orgID}
                  and hr_importMap.entityName = 'hr_payEl'
                  and hr_method.code in ('13', '14', '15', '17', '18', '19', '20', '21', '23', '40', '41', '44', '48', '54', '57', '58', '67', '68', '73', '134', '140', '149', '142')
                  and (hr_importAccrual.dateFrom is NULL or hr_importAccrual.dateTo is NULL) 
                  and hr_importaccrual.flagsrec <> 1032`
    store.runSQL(sql3, {})
    let res3 = store.getAsJsObject()
    res3.forEach(item => {
      item.value = UB.i18n('Помилка! Не вказана дата початку та дата закінчення для неявок')
      result.push(item)
    })
    const sql4 = ` select hr_importAccrual.impID as "impID" from  hr_importAccrual
                    inner join  hr_importMap ON  hr_importAccrual.orgID=hr_importMap.orgID and entityName = 'hr_payEl' 
                    and outputID is not null AND  hr_importAccrual.payElID=hr_importMap.inputID  
                    and  hr_importAccrual.orgID = hr_importMap.orgID 
                    inner join   hr_payEl on outputID=hr_payEl.ID
                    inner join  hr_method  on methodID=hr_method.ID
                    where hr_importAccrual.orgID = ${mParams.orgID} 
                    and (cast(hr_importAccrual.dateFrom as date) is not null and cast(hr_importAccrual.dateTo as date) is not NULL) 
                    and cast(hr_importAccrual.dateFrom as date) > cast(hr_importAccrual.dateTo as DATE) `
    store.runSQL(sql4, {})
    let res4 = store.getAsJsObject()
    res4.forEach(item => {
      item.value = UB.i18n('Помилка! Дата початку > дата закічення')
      result.push(item)
    })
    const sql5 = ` with tmp as (
                select  employeeNumberID, hr_importAccrual.payElID, periodCalc, periodSalary, cast(hr_importAccrual.dateFrom as date) dateFrom, cast(hr_importAccrual.dateTo as date) dateTo
                from hr_importAccrual
                inner join hr_importMap on hr_importAccrual.orgID= ${mParams.orgID} and hr_importAccrual.orgID=hr_importMap.orgID and entityName = 'hr_payEl' and outputID is not null and hr_importAccrual.payElID=hr_importMap.inputID
                inner join hr_payEl on outputID=hr_payEl.ID
                inner join hr_method on methodID=hr_method.ID
                where hr_method.code in ('13','14','15','17','18','19','20','21','23','40','41','44','48','54','57','58','67','68','73','134','140','149','142')
                and (cast(hr_importAccrual.dateFrom as date) is not null or cast(hr_importAccrual.dateTo as date) is not null) and (paySum>=0 or paySum is NULL)
                group by employeeNumberID, hr_importAccrual.payElID, periodCalc, periodSalary, cast(hr_importAccrual.dateFrom as date), cast(hr_importAccrual.dateTo as date)
                having count(*)>1
              )
                select hr_importAccrual.impID from hr_importAccrual
                join tmp ON hr_importAccrual.employeeNumberID = tmp.employeeNumberID
                and  hr_importAccrual.payElID = tmp.payElID
                and  hr_importAccrual.periodCalc = tmp.periodCalc
                and  hr_importAccrual.periodSalary = tmp.periodSalary
                and  hr_importAccrual.dateFrom = tmp.dateFrom
                and  hr_importAccrual.dateTo = tmp.dateTo
                where hr_importAccrual.orgID = ${mParams.orgID} `
    store.runSQL(sql5, {})
    let res5 = store.getAsJsObject()
    res5.forEach(item => {
      item.value = UB.i18n('Помилка! Дублювання записів')
      result.push(item)
    })
    if (sqlDialect.dialect === 'MSSQL2012') {
      const sql6 = ` with tmp as (
                  SELECT case WHEN cast(hr_importAccrual.dateTo as int) > cast(pc.dateTo as int) THEN cast(pc.dateTo as int) ELSE cast(hr_importAccrual.dateTo as int) END as LEAST,
                  case WHEN cast(hr_importAccrual.dateFrom as int) > cast(pc.dateFrom as int) THEN cast(hr_importAccrual.dateFrom as int) ELSE cast(pc.dateFrom as int) END as GREATEST,
                  hr_importAccrual.ID
                  FROM  hr_importAccrual
                  inner JOIN  hr_importMap ON  hr_importAccrual.orgID=${mParams.orgID} AND  hr_importAccrual.orgID=hr_importMap.orgID 
                  and entityName = 'hr_payEl' and outputID is not null AND  hr_importAccrual.payElID=hr_importMap.inputID  
                  inner join  hr_payEl on outputID=hr_payEl.ID 
                  inner join  hr_method  on methodID=hr_method.ID
                  inner join  hr_dictPeriod pc  on  hr_importAccrual.orgID=pc.orgID and periodCalc=pc.dateFrom
                  where  hr_method .code in ('13','14','15','17','18','19','20','21','23','40','41','44','48','54','57','58','67','68','73','134','140','149','142')
                  and (cast(hr_importAccrual.dateFrom as date) is not null and cast(hr_importAccrual.dateTo as date) IS not NULL) 
                  AND paySum>=300
                  )
                  SELECT hr_importAccrual.impID as "impID" FROM  hr_importAccrual
                  inner JOIN  hr_importMap ON  hr_importAccrual.orgID=${mParams.orgID} AND  hr_importAccrual.orgID=hr_importMap.orgID 
                  and entityName = 'hr_payEl' and outputID is not null AND  hr_importAccrual.payElID=hr_importMap.inputID
                  inner join  hr_payEl on outputID=hr_payEl.ID 
                  inner join  hr_method  on methodID=hr_method.ID
                  inner join  hr_dictPeriod pc  on  hr_importAccrual.orgID=pc.orgID and periodCalc=pc.dateFrom
                  inner join tmp ON tmp.ID = hr_importAccrual.ID
                  where  hr_method .code in ('13','14','15','17','18','19','20','21','23','40','41','44','48','54','57','58','67','68','73','134','140','149','142')
                  and (cast(hr_importAccrual.dateFrom as date) is not null and cast(hr_importAccrual.dateTo as date) IS not NULL) 
                  AND paySum>=300
                  AND ((tmp.LEAST - tmp.GREATEST + 1 - days) > 3) or ((tmp.LEAST - tmp.GREATEST + 1 - days) < 0)`
      store.runSQL(sql6, {})
      let res6 = store.getAsJsObject()
      res6.forEach(item => {
        item.value = UB.i18n('Помилка! кількість днів в запису не відповідає кількості днів між датами початку та кінця')
        result.push(item)
      })
    } else {
      const sql6 = ` with tmp as (
                  SELECT case WHEN cast(hr_importAccrual.dateTo as date) > cast(pc.dateTo as date) THEN cast(pc.dateTo as date) ELSE cast(hr_importAccrual.dateTo as date) END as LEAST,
                  case WHEN cast(hr_importAccrual.dateFrom as date) > cast(pc.dateFrom as date) THEN cast(hr_importAccrual.dateFrom as date) ELSE cast(pc.dateFrom as date) END as GREATEST,
                  hr_importAccrual.ID
                  FROM hr_importAccrual
                  inner JOIN hr_importMap ON  hr_importAccrual.orgID=${mParams.orgID} AND  hr_importAccrual.orgID=hr_importMap.orgID
                  and entityName = 'hr_payEl' and outputID is not null AND  hr_importAccrual.payElID=hr_importMap.inputID
                  inner join hr_payEl on outputID=hr_payEl.ID
                  inner join hr_method  on methodID=hr_method.ID
                  inner join hr_dictPeriod pc  on  hr_importAccrual.orgID=pc.orgID and periodCalc=pc.dateFrom
                  where  hr_method .code in ('13','14','15','17','18','19','20','21','23','40','41','44','48','54','57','58','67','68','73','134','140','149','142')
                  and (cast(hr_importAccrual.dateFrom as date) is not null and cast(hr_importAccrual.dateTo as date) IS not NULL)
                  AND paySum>=300
                )
                  SELECT hr_importAccrual.impID as "impID" FROM  hr_importAccrual
                  inner JOIN hr_importMap ON  hr_importAccrual.orgID=${mParams.orgID} AND  hr_importAccrual.orgID=hr_importMap.orgID
                  and entityName = 'hr_payEl' and outputID is not null AND  hr_importaccrual.payElID=hr_importMap.inputID
                  inner join hr_payEl on outputID=hr_payEl.ID
                  inner join hr_method  on methodID=hr_method.ID
                  inner join hr_dictPeriod pc  on  hr_importAccrual.orgID=pc.orgID and periodCalc=pc.dateFrom
                  inner join tmp ON tmp.ID = hr_importAccrual.ID
                  where  hr_method .code in ('13','14','15','17','18','19','20','21','23','40','41','44','48','54','57','58','67','68','73','134','140','149','142')
                  and (cast(hr_importAccrual.dateFrom as date) is not null and cast(hr_importAccrual.dateTo as date) IS not NULL)
                  AND paySum>=300
                  AND (tmp.LEAST - tmp.GREATEST + 1 - days)>3`
      store.runSQL(sql6, {})
      let res6 = store.getAsJsObject()
      res6.forEach(item => {
        item.value = UB.i18n('Помилка! кількість днів в запису не відповідає кількості днів між датами початку та кінця')
        result.push(item)
      })
    }
    const sql7 = ` select distinct (hr_importAccrual.impID) as "impID" from hr_importAccrual
                  join hr_importMap on hr_importAccrual.payElID = hr_importMap.inputID and hr_importAccrual.orgID = hr_importMap.orgID
                  join hr_payEl on hr_payEl.ID = hr_importMap.outputID
                  join hr_method on hr_method.ID = hr_payEl.methodID
                  where hr_importAccrual.orgID = ${mParams.orgID}
                  and hr_importMap.entityName = 'hr_payEl'
                  and hr_method.code in ('12', '45', '46', '65')
                  and (hr_importAccrual.dateFrom is NULL or hr_importAccrual.dateTo is NULL) 
                  and hr_importAccrual.flagsrec <> 1032`
    store.runSQL(sql7, {})
    let res7 = store.getAsJsObject()
    res7.forEach(item => {
      item.value = UB.i18n('Помилка! Не вказана дата початку та дата закінчення для премій')
      result.push(item)
    })
    ctx.mParams.res = JSON.stringify(result)
  }
  if (mParams.impEntityName === 'hr_importEmployeePosition') {
    const sqlEmpPos = ` select distinct (tabNum) as "impID" from hr_employeeNumber
                  left join hr_employeePosition  ON hr_employeeNumber.ID = hr_employeePosition.employeeNumberID and hr_employeePosition.mi_deleteUser is NULL
                  where hr_employeeNumber.orgID = ${mParams.orgID}
                  and hr_employeePosition.ID is NULL
                  and hr_employeeNumber.mi_deleteUser is NULL `
    store.runSQL(sqlEmpPos, {})
    let resEmpPos = store.getAsJsObject()
    resEmpPos.forEach(item => {
      item.value = UB.i18n('Помилка! Відсутнє призначення')
      result.push(item)
    })
    ctx.mParams.res = JSON.stringify(result)
  }
}

me.correctMistakes = function (ctx) {
  const mParams = ctx.mParams
  const posStore = UB.DataStore('hr_employeePosition')
  const empStore = UB.DataStore('hr_employeeNumber')
  const orderStore = UB.DataStore('hr_orderPay')
  if (mParams.impEntityName === 'hr_importEmployeePosition') {
    const employeeNumber = ` select hr_employeeNumber.ID as "ID", hr_employeeNumber.employeeID as "employeeID", hr_employeeNumber.dateFrom as "dateFrom", hr_employeeNumber.dateTo as "dateTo" from hr_employeeNumber
                  left join hr_employeePosition  ON hr_employeeNumber.ID = hr_employeePosition.employeeNumberID and hr_employeePosition.mi_deleteUser is NULL
                  where hr_employeeNumber.orgID = ${mParams.orgID}
                  and hr_employeePosition.ID is NULL
                  and hr_employeeNumber.mi_deleteUser is NULL `
    empStore.runSQL(employeeNumber, {})
    let resEmployeeNumber = empStore.getAsJsObject()
    resEmployeeNumber.forEach(item => {
      const orderPayID = orderStore.generateID()
      orderStore.run('insert', {
        execParams: {
          ID: orderPayID,
          orderState: 'POSTED',
          empOrderType: 'APPOINT',
          entryDate: item.dateFrom,
          orderDate: item.dateFrom,
          orderNumber: 'Імпортовані дані',
          description: 'Імпортовані дані'
        }
      })
      posStore.run('insert', {
        isImport: true,
        execParams: {
          employeeNumberID: item.ID,
          employeeID: item.employeeID,
          organizationID: mParams.orgID,
          dateFrom: item.dateFrom,
          dateTo: item.dateTo,
          orderID: orderPayID
        }
      })
    })
  }
}
