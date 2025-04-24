
const UB = require('@unitybase/ub')
const dateService = require('../../AC/modules/dataServices/dateService')
const entityBaseService = require('../../AC/modules/entityServices/entityBaseService')
const accrualService = require('../../HR/modules/accrualService')
const settingsService = require('../../AC/modules/entityServices/settingsService')
const payElService = require('../../HR/modules/payElService')

module.exports = {
  setAttr,
  setIdxNum,
  checkUniqueBeforeInsert,
  checkUniqueBeforeUpdate,
  checkParentUnit,
  getEmpAgeSql,
  getPosNameSql,
  getDepNameSql,
  getPosCatShortNameSql,
  getRankNameSql,
  getEmpRankNameSql,
  getDepNameByIDSql,
  getPosNameByIDSql,
  getPosFldOnDateSql,
  getPosEnumFldOnDateSql,
  getDepFldOnDateSql,
  getDepFldOnDateOnlySql,
  getPosCatShortNameByEpIdSql,
  getOrgFldOnDateSql,
  getSecondJobs,
  getSqlEmployeePositionOneWorkPlace,
  getOrganizationClause,
  getDepartmentClause,
  calculatePositionFunds,
  getPlanSumByPosition, // Планова сума по штатним посадам
  getPlanSum, // планова сума по посаді
  getPosCategoryShortNameSql,
  getPosFldOnDateSql2
}

function setIdxNum (ctx, instanceData) {
  const mParams = ctx.mParams
  const execParams = mParams.execParams
  let parentUnitID = execParams.parentUnitID
  const __entityName = ctx.dataStore.entityCode

  if (execParams.idxNum || (instanceData.idxNum && execParams.idxNum !== null)) {
    return
  }
  if (!parentUnitID && mParams.method === 'update') {
    parentUnitID = UB.Repository(__entityName).attrs('parentUnitID').misc({ __mip_recordhistory_all: true })
      .where('ID', '=', execParams.ID)
      .limit(1)
      .selectSingle()
    if (parentUnitID) {
      parentUnitID = parentUnitID.parentUnitID
    }
  }
  const num = UB.Repository(__entityName).attrs('max([idxNum])')
    .where('ID', '<>', execParams.ID || 0)
    .whereIf(parentUnitID, 'parentUnitID', '=', parentUnitID)
    .where('idxNum', '<', 999999)
    .misc({ __mip_recordhistory_all: true })
    .limit(1)
    .selectSingle()
  if (!num || !num['max([idxNum])']) {
    execParams.idxNum = 10
  } else {
    execParams.idxNum = num['max([idxNum])'] + 10
  }
}

/**
 * Проверяет что дата создания родительского элемента меньше чем текущего.
 * Если это не процесс импорта и дата меньше - throw
 *
 * @param {ubMethodParams} ctx
 * @param {object} [previousValues] Instance values BEFORE insert/update operation. Can de passed by caller to prevent
 *   multiple `JSON.parse(ctx.dataStore.asJSONObject)[0]` calls
 */
function checkParentUnit (ctx, previousValues) {
  const execParams = ctx.mParams.execParams
  const instanceData = previousValues === undefined ? (JSON.parse(ctx.dataStore.asJSONObject)[0] || {}) : previousValues
  if (execParams.parentUnitID || execParams.mi_dateFrom) {
    const parentUnitID = execParams.parentUnitID || instanceData.parentUnitID
    if (parentUnitID) {
      const parentDateFrom = UB.Repository('hr_staffUnit')
        .attrs(['min([mi_dateFrom])'])
        .where('mi_data_id', '=', parentUnitID)
        .limit(1)
        .selectSingle()
      if (dateService.shiftDate(parentDateFrom['min([mi_dateFrom])']) > dateService.shiftDate(execParams.mi_dateFrom || instanceData.mi_dateFrom)) {
        if (ctx.mParams.isImportOperation || dateService.shiftDate(execParams.mi_dateFrom || instanceData.mi_dateFrom).getFullYear() < 1982) {
          execParams.mi_dateFrom = dateService.shiftDate(parentDateFrom['min([mi_dateFrom])'])
          let dateTo = execParams.mi_dateTo
          if (dateTo && dateTo !== '#maxdate') {
            dateTo = dateService.shiftDate(dateTo)
            if (dateTo < execParams.mi_dateFrom) {
              execParams.mi_dateTo = execParams.mi_dateFrom
            }
          }
        } else {
          throw new UB.UBAbort(`<<<${UB.i18n('Неможливо створити підпорядкований елемент раніше ніж створений елемент верхнього рівня')}>>>`)
        }
      }
    }
  }
}

/**
 * @param {ubMethodParams} ctx
 */
function checkUniqueBeforeInsert (ctx) {
  if (ctx.mParams.isOrderOperation || ctx.mParams.isImportOperation) {
    return
  }
  const execParams = ctx.mParams.execParams
  if (UB.Repository('hr_staffOrder')
    .attrs(['ID'])
    .where('orderState', '!=', 'PROJECT')
    .where('ID', '=', execParams.staffOrderID)
    .misc({
      __skipRls: true
    })
    .limit(1)
    .selectSingle()) {
    throw new UB.UBAbort(`<<<${UB.i18n('Наказ вже проведено. Виберіть інший наказ')}>>>`)
  }
  if (UB.Repository(ctx.dataStore.entity.name)
    .attrs(['mi_treePath'])
    .where('mi_data_id', '=', execParams.mi_data_id)
    .where('mi_dateFrom', '=', execParams.mi_dateFrom)
    .where('mi_dateTo', '=', execParams.mi_dateTo)
    .where('staffOrderID', '=', execParams.staffOrderID)
    .limit(1)
    .selectSingle()) {
    throw new UB.UBAbort(`<<<${UB.i18n('Вже існують зміни {0} для цього наказу', execParams.name)}>>>`)
  }
}

/**
 * @param {ubMethodParams} ctx
 */
function checkUniqueBeforeUpdate (ctx, previousValues) {
  if (ctx.mParams.isOrderOperation) {
    return
  }
  const execParams = ctx.mParams.execParams
  if (previousValues && previousValues.state === 'NEW' && execParams.state === 'ACTIVE') {
    const dateFrom = execParams.mi_dateFrom || previousValues.mi_dateFrom
    const crossHist = UB.Repository(ctx.dataStore.entity.name)
      .attrs(['mi_dateFrom', 'mi_dateTo', 'description', 'staffOrderID.description'])
      .where('mi_data_id', '=', previousValues.mi_data_id)
      .where('mi_dateFrom', '=', dateFrom)
      .where('state', '=', 'ACTIVE')
      .where('ID', '!=', execParams.ID)
      .limit(1)
      .selectSingle()
    if (crossHist) {
      const histDateFrom = dateService.formatDate(crossHist.mi_dateFrom)
      const parDateFrom = dateService.formatDate(execParams.mi_dateFrom)
      throw new UB.UBAbort(`<<<${UB.i18n('Для оргодиниці "{0}" існують зміни за наказом "{1}" з {2} р., що перетинаються з новим періодом з {3} р.', crossHist.description, crossHist['staffOrderID.description'], histDateFrom, parDateFrom)}>>>`)
    }
  }
}

/**
 * Устанавливает атрибуты КАКИЕ И ЗАЧЕМ ЗНАЕТ ПАВЕЛ К. - он не пишет доку, там что спросите у него
 * @param {ubMethodParams} ctx
 * @param {object} [previousValues] Instance values BEFORE insert/update operation. Can de passed by caller to prevent
 *   multiple `JSON.parse(ctx.dataStore.asJSONObject)[0]` calls
 */
function setAttr (ctx, previousValues) {
  setIdxNum(ctx, previousValues)
  const execParams = ctx.mParams.execParams
  const instanceData = previousValues === undefined ? (JSON.parse(ctx.dataStore.asJSONObject)[0] || {}) : previousValues
  const dateFrom = dateService.shiftDate(dateService.shiftDate(execParams.mi_dateFrom || instanceData.mi_dateFrom))
  let parentTreePath = '/'
  let parentMiTreePath = '/'
  if (!execParams.mi_data_id && !instanceData.mi_data_id) {
    execParams.mi_data_id = execParams.ID
  }

  if (ctx.dataStore.entity.name === 'hr_organization') {
    if (ctx.mParams.method === 'insert') {
      execParams.orgID = execParams.mi_data_id
    }
  } else if (!ctx.mParams.isImportOperation) {
    if (execParams.parentUnitID && (!instanceData.orgID || (execParams.mi_data_id || instanceData.mi_data_id) === execParams.ID) &&
      (execParams.state === 'NEW' || instanceData.state === 'NEW')) {
      const org = UB.Repository('hr_staffUnit')
        .attrs(['orgID'])
        .where('mi_data_id', '=', execParams.parentUnitID)
        .misc({ __allowSelectSafeDeleted: true })
        .orderBy('mi_deleteDate', 'desc')
        .limit(1)
        .selectSingle() || {}
      execParams.orgID = org.orgID
    }
  }

  if (execParams.parentUnitID && !execParams.mi_treePath) {
    let parent = UB.Repository('hr_staffUnit')
      .attrs(['mi_treePath'])
      .where('mi_data_id', '=', execParams.parentUnitID)
      .misc({ __mip_recordhistory_all: true })
    if (!ctx.mParams.isImportOperation) {
      parent = parent.where('mi_dateFrom', '<=', dateFrom, 'dateFrom')
        .where('mi_dateTo', '>=', dateFrom, 'dateTo')
    }
    parent = parent.where('state', '=', 'ACTIVE', 'active')
      .where('liquidate', '=', 0, 'liqu')
      .where('staffOrderID', '=', execParams.staffOrderID || instanceData.staffOrderID, 'order')
      .notExists(UB.Repository('hr_staffUnit')
        .correlation('mi_data_id', 'mi_data_id')
        .where('staffOrderID', '=', execParams.staffOrderID || instanceData.staffOrderID)
        .where('mi_deleteDate', '>=', '#maxdate'),
      'notExist')
    if (!ctx.mParams.isImportOperation) {
      parent = parent.logic('(([active] and [liqu] and [notExist] and [dateFrom] and [dateTo]) or ([order]))')
    } else {
      parent = parent.logic('(([active] and [liqu] and [notExist]) or ([order]))')
    }
    parent = parent.limit(1).selectSingle()
    if (!parent) {
      throw new UB.UBAbort('Не знайдено батьківського елементу')
    }
    parentMiTreePath = parent.mi_treePath
    execParams.mi_treePath = `${parentMiTreePath}${execParams.mi_data_id || instanceData.mi_data_id}/`
  }
  if (!instanceData.mi_treePath && !execParams.mi_treePath) {
    execParams.mi_treePath = `/${execParams.mi_data_id}/`
  }
  if (!execParams.treePath && (execParams.idxNum !== undefined || execParams.parentUnitID)) {
    if (execParams.parentUnitID || (execParams.parentUnitID === undefined && instanceData.parentUnitID)) {
      let parent = UB.Repository('hr_staffUnit')
        .attrs(['mi_treePath', 'treePath'])
        .where('mi_data_id', '=', execParams.parentUnitID || instanceData.parentUnitID)
        .misc({ __mip_recordhistory_all: true })
      if (execParams.state === 'NEW' || (execParams.state === undefined && instanceData.state === 'NEW')) {
        if (!ctx.mParams.isImportOperation) {
          parent = parent.where('mi_dateFrom', '<=', dateFrom, 'dateFrom')
            .where('mi_dateTo', '>=', dateFrom, 'dateTo')
        }
        parent = parent.where('state', '=', 'ACTIVE', 'active')
          .where('liquidate', '=', 0, 'liqu')
          .where('staffOrderID', '=', execParams.staffOrderID || instanceData.staffOrderID, 'order')
          .notExists(UB.Repository('hr_staffUnit')
            .correlation('mi_data_id', 'mi_data_id')
            .where('staffOrderID', '=', execParams.staffOrderID || instanceData.staffOrderID)
            .where('mi_deleteDate', '>=', '#maxdate'),
          'notExist')
        if (!ctx.mParams.isImportOperation) {
          parent = parent.logic('(([active] and [liqu] and [notExist] and [dateFrom] and [dateTo]) or ([order]))')
        } else {
          parent = parent.logic('(([active] and [liqu] and [notExist]) or ([order]))')
        }
      } else {
        parent = parent.where('state', '=', 'ACTIVE')
        if (!ctx.mParams.isImportOperation) {
          parent = parent.where('mi_dateFrom', '<=', dateService.currentTruncDate()).where('mi_dateTo', '>=', dateService.currentTruncDate())
        }
      }
      parent = parent.limit(1).selectSingle()
      parentTreePath = parent ? parent.treePath : '/'
    }
    execParams.treePath = `${parentTreePath}${String((execParams.idxNum !== undefined ? execParams.idxNum : instanceData.idxNum) || '').padStart(6, '0')}/`
  }

  if (((execParams.mi_treePath || execParams.mi_treePath === null) && execParams.mi_treePath !== instanceData.mi_treePath) ||
    ((execParams.treePath || execParams.treePath === null) && execParams.treePath !== instanceData.treePath)) {
    if (execParams.state === 'NEW' || (execParams.state === undefined && instanceData.state === 'NEW')) {
      const child = UB.Repository('hr_staffUnit')
        .attrs(['ID', 'mi_data_id', 'staffOrderID', 'mi_treePath', 'treePath', 'idxNum', 'mi_unityEntity', 'state'])
        .where('parentUnitID', '=', execParams.mi_data_id || instanceData.mi_data_id)
        .where('mi_dateFrom', '<=', dateFrom, 'dateFrom')
        .where('mi_dateTo', '>=', dateFrom, 'dateTo')
        .where('state', '=', 'ACTIVE', 'active')
        .where('liquidate', '=', 0, 'liqu')
        .where('staffOrderID', '=', execParams.staffOrderID || instanceData.staffOrderID, 'order')
        .notExists(UB.Repository('hr_staffUnit')
          .correlation('mi_data_id', 'mi_data_id')
          .where('staffOrderID', '=', execParams.staffOrderID || instanceData.staffOrderID)
          .where('mi_deleteDate', '>=', '#maxdate'),
        'notExist')
        .logic('(([active] and [liqu] and [notExist] and [dateFrom] and [dateTo]) or ([order]))')
        .selectAsObject()

      child.forEach(row => {
        const idxNum = String(row.idxNum || '').padStart(6, '0')
        if ((execParams.mi_treePath && row.mi_treePath !== `${execParams.mi_treePath}${row.mi_data_id}/`) ||
          (execParams.treePath && row.treePath !== `${execParams.treePath}${idxNum}/`)) {
          const store = UB.DataStore(row.mi_unityEntity)
          if (execParams.liquidate === 1 || row.staffOrderID === (execParams.staffOrderID || instanceData.staffOrderID)) {
            store.run('update', {
              __skipOptimisticLock: true,
              execParams: Object.assign(Object.assign({
                ID: row.ID
              }, execParams.mi_treePath ? { mi_treePath: `${execParams.mi_treePath}${row.mi_data_id}/` } : {}),
              execParams.treePath ? { treePath: `${execParams.treePath}${idxNum}/` } : {})
            })
          } else if (row.state === 'ACTIVE' && !child.find(o => (o.state === 'NEW' && o.mi_data_id === row.mi_data_id &&
              o.staffOrderID === (execParams.staffOrderID || instanceData.staffOrderID)))) {
            const newID = store.generateID()
            entityBaseService.cloneInstance(row.mi_unityEntity, row.ID, Object.assign(Object.assign({
              ID: newID,
              mi_data_id: row.mi_data_id,
              mi_dateFrom: dateFrom,
              mi_dateTo: execParams.mi_dateTo || instanceData.mi_dateTo,
              state: 'NEW',
              staffOrderID: execParams.staffOrderID || instanceData.staffOrderID,
              priorID: row.ID
            }, execParams.mi_treePath ? { mi_treePath: `${execParams.mi_treePath}${row.mi_data_id}/` } : { mi_treePath: row.mi_treePath }
            ), execParams.treePath ? { treePath: `${execParams.treePath}${idxNum}/` } : { treePath: row.treePath }), true)
          }
          store.freeNative()
        } else {
          const child = UB.Repository('hr_staffUnit')
            .attrs(['ID', 'mi_data_id', 'staffOrderID', 'mi_treePath', 'treePath', 'idxNum', 'mi_unityEntity', 'state'])
            .where('parentUnitID', '=', execParams.mi_data_id || instanceData.mi_data_id)
            .where('mi_dateFrom', '<=', dateService.currentTruncDate())
            .where('mi_dateTo', '>=', dateService.currentTruncDate())
            .where('state', '=', 'ACTIVE')
            .selectAsObject()
          child.forEach(row => {
            const idxNum = String(row.idxNum || '').padStart(6, '0')
            if (row.treePath !== `${execParams.treePath}${idxNum}/`) {
              const store = UB.DataStore(row.mi_unityEntity)
              store.run('update', {
                __skipOptimisticLock: true,
                execParams: {
                  ID: row.ID,
                  treePath: `${execParams.treePath}${idxNum}/`
                }
              })
              store.freeNative()
            }
          })
        }
      })
    } else if (!execParams.state) {
      const child = UB.Repository('hr_staffUnit')
        .attrs(['ID', 'mi_data_id', 'staffOrderID', 'mi_treePath', 'treePath', 'idxNum', 'mi_unityEntity', 'state'])
        .where('parentUnitID', '=', execParams.mi_data_id || instanceData.mi_data_id)
        .where('mi_dateFrom', '<=', dateService.currentTruncDate())
        .where('mi_dateTo', '>=', dateService.currentTruncDate())
        .where('state', '=', 'ACTIVE')
        .selectAsObject()
      child.forEach(row => {
        const idxNum = String(row.idxNum || '').padStart(6, '0')
        if (row.treePath !== `${execParams.treePath}${idxNum}/`) {
          const store = UB.DataStore(row.mi_unityEntity)
          store.run('update', {
            __skipOptimisticLock: true,
            execParams: {
              ID: row.ID,
              treePath: `${execParams.treePath}${idxNum}/`
            }
          })
          store.freeNative()
        }
      })
    }
  }
}

function getEmpAgeSql (birthDateAlias = 'emp.birthDate', onDateAlias = 'onDate') {
  const sqlDialect = entityBaseService.getSQLDialect()
  return sqlDialect.dialect === 'MSSQL2012'
    ? `(select DATEDIFF(yy, ${birthDateAlias}, :${onDateAlias}:) - CASE WHEN MONTH(:${onDateAlias}:) < MONTH(${birthDateAlias}) THEN 1
    WHEN MONTH(:${onDateAlias}:) > MONTH(${birthDateAlias}) THEN 0 WHEN DAY(:${onDateAlias}:) < DAY(${birthDateAlias}) THEN 1 ELSE 0 END)`
    : `(select date_part('years', AGE(:${onDateAlias}:, ${birthDateAlias})))`
}

function getDepNameByIDSql (depID = 'ep.departmentID', tableDateAlias = 'en', depFieldName = 'name') {
  const sqlDialect = entityBaseService.getSQLDialect()
  return `(select ${sqlDialect.top} dep.${depFieldName} from hr_department dep 
         Where 
         dep.mi_data_id = ${depID} 
         and (dep.mi_dateFrom <= ${tableDateAlias}.dateTo or ${tableDateAlias}.dateTo is null)
         and dep.mi_dateTo >= ${tableDateAlias}.dateFrom 
         and dep.mi_deleteDate >= '9999-12-31' 
         and dep.state = 'ACTIVE' 
         order by dep.mi_dateFrom desc ${sqlDialect.limit})
      `
}

function getPosNameByIDSql (posID = 'ep.positionID', orgID = 'en.orgID', tableDateAlias = 'en', posFieldName = 'name', dictPosID = 'ep.dictPositionID') {
  const sqlDialect = entityBaseService.getSQLDialect()
  return ` (case when ${posID} IS NOT NULL then 
  (select ${sqlDialect.top} posSubQ.${posFieldName} from hr_position posSubQ 
    where posSubQ.mi_data_id = ${posID}  
      and posSubQ.state = 'ACTIVE' 
      and posSubQ.orgID = ${orgID} 
      and (posSubQ.mi_dateFrom <= ${tableDateAlias}.dateTo or ${tableDateAlias}.dateTo is null)
      and posSubQ.mi_dateTo >= ${tableDateAlias}.dateFrom  
      and posSubQ.mi_deleteDate >= '9999-12-31' 
    order by posSubQ.mi_dateFrom desc ${sqlDialect.limit})
  else  
    (select ${sqlDialect.top} dp.${posFieldName} from hr_dictPosition dp where dp.ID = ${dictPosID} and dp.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit}) 
  end) `
}

function getPosFldOnDateSql (dateParam = ':dateTo:', posID = 'ep.positionID', posFieldName = 'name', dictPosID = 'ep.dictPositionID', orgIDs) {
  const sqlDialect = entityBaseService.getSQLDialect()
  const posSubSql = `(select ${sqlDialect.top} posSubQ.${posFieldName}
    from hr_position posSubQ 
    where posSubQ.mi_data_id = ${posID}  
      and posSubQ.state = 'ACTIVE' 
      and posSubQ.mi_dateFrom <= ${dateParam}  
      and posSubQ.mi_deleteDate >= '9999-12-31'
      ${(orgIDs && 'and posSubQ.orgID in (' + orgIDs + ')') || ''}
    order by posSubQ.mi_dateFrom desc ${sqlDialect.limit})`
  let res
  if (dictPosID) {
    res = ` (case when ${posID} IS NOT NULL then 
      ${posSubSql}
    else  
      (select ${sqlDialect.top} dp.${posFieldName} from hr_dictPosition dp where dp.ID = ${dictPosID} and dp.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit}) 
    end)`
  } else {
    res = posSubSql
  }
  return res
}

function getPosFldOnDateSql2 (dateParam = ':dateTo:', posID = 'ep.positionID', posFieldName = 'name', dictPosID = 'ep.dictPositionID', orgIDs) {
  const sqlDialect = entityBaseService.getSQLDialect()
  const posSubSql = `(select ${sqlDialect.top} 
     case when posSubQ.dictPositionID = ${dictPosID} then posSubQ.${posFieldName}
          else (select ${sqlDialect.top} dp.${posFieldName} from hr_dictPosition dp where dp.ID = ${dictPosID} and dp.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit})
          end
    from hr_position posSubQ 
    where posSubQ.mi_data_id = ${posID}  
      and posSubQ.state = 'ACTIVE' 
      and posSubQ.mi_dateFrom <= ${dateParam}  
      and posSubQ.mi_deleteDate >= '9999-12-31'
      ${(orgIDs && 'and posSubQ.orgID in (' + orgIDs + ')') || ''}
    order by posSubQ.mi_dateFrom desc ${sqlDialect.limit})`
  let res
  if (dictPosID) {
    res = ` (case when ${posID} IS NOT NULL then 
      ${posSubSql}
    else  
      (select ${sqlDialect.top} dp.${posFieldName} from hr_dictPosition dp where dp.ID = ${dictPosID} and dp.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit}) 
    end)`
  } else {
    res = posSubSql
  }
  return res
}

function getPosEnumFldOnDateSql (dateParam = ':dateTo:', posID = 'ep.positionID', posFieldName, enumGroup, orgIDs) {
  const sqlDialect = entityBaseService.getSQLDialect()
  if (!posFieldName || !enumGroup) {
    return ''
  }
  return `(select ${sqlDialect.top} e.name
    from hr_position posSubQ 
    join ubm_enum e on e.code = posSubQ.${posFieldName}
      and e.eGroup = '${enumGroup}'
    where posSubQ.mi_data_id = ${posID}  
      and posSubQ.state = 'ACTIVE' 
      and posSubQ.mi_dateFrom <= ${dateParam}  
      and posSubQ.mi_deleteDate >= '9999-12-31'
      ${(orgIDs && 'and posSubQ.orgID in (' + orgIDs + ')') || ''}
    order by posSubQ.mi_dateFrom desc ${sqlDialect.limit})`
}

function getDepFldOnDateOnlySql (dateParam = ':onDate:', depID = 'ep.departmentID', depFieldName = 'name') {
  const sqlDialect = entityBaseService.getSQLDialect()
  return `(select ${sqlDialect.top} dep.${depFieldName} from hr_department dep 
          Where dep.mi_data_id = ${depID}             
            and ${dateParam} between dep.mi_dateFrom and dep.mi_dateTo
            and dep.mi_deleteDate >= '9999-12-31' 
            and dep.state = 'ACTIVE'
            order by dep.mi_dateTo desc
       ${sqlDialect.limit})
      `
}

function getDepFldOnDateSql (dateParam = ':dateTo:', depID = 'ep.departmentID', depFieldName = 'name', orgIDs) {
  const sqlDialect = entityBaseService.getSQLDialect()
  return `(select ${sqlDialect.top} dep.${depFieldName}
           from hr_department dep 
           Where dep.mi_data_id = ${depID}   
             and dep.mi_deleteDate >= '9999-12-31' 
             and dep.mi_dateFrom <= ${dateParam} 
             and dep.state = 'ACTIVE'
             ${(orgIDs && 'and dep.orgID in (' + orgIDs + ')') || ''}
           order by dep.mi_dateFrom desc
           ${sqlDialect.limit}) `
}

function getOrgFldOnDateSql (dateParam = ':onDate:', orgID = 'orgID', orgFieldName = 'name') {
  const sqlDialect = entityBaseService.getSQLDialect()
  return `(select ${sqlDialect.top} org.${orgFieldName} from hr_organization org 
          Where org.mi_data_id = ${orgID}             
            and org.mi_dateFrom <= ${dateParam} 
            and org.mi_deleteDate >= '9999-12-31' 
            and org.state = 'ACTIVE'
            order by org.mi_dateFrom desc
       ${sqlDialect.limit})
      `
}

function getPosCatShortNameByEpIdSql (epPosID = 'ep.positionID', posDate = ':dateTo:', dictPosID = 'ep.dictPositionID') {
  const sqlDialect = entityBaseService.getSQLDialect()
  return `(case when ep.positionID IS NOT NULL 
then  (select ${sqlDialect.top} CONCAT(substring(e.name,1,1), case when stPay.groupN is not null then CONCAT('-', stPay.groupN) else '' end)
  from hr_position pos 
    join ubm_enum e on e.code = pos.psCategory
      and e.eGroup = 'HR_POSITION_PSCATEGORY'
    left join hr_dictStatePay stPay on stPay.ID = pos.dictStatePayID
      and stPay.mi_deleteDate >= '9999-12-31'
  where pos.ID = 
 (select ${sqlDialect.top} posSubQ.ID from hr_position posSubQ               
 Where posSubQ.mi_data_id = ${epPosID}                     
 and posSubQ.mi_dateFrom <= ${posDate}            
 and posSubQ.mi_deleteDate >= '9999-12-31'               
 and posSubQ.state = 'ACTIVE'              
 order by posSubQ.mi_dateFrom desc ${sqlDialect.limit}) 
 and pos.positionType = '1'
 order by pos.mi_dateFrom desc ${sqlDialect.limit})
 else  
 (select ${sqlDialect.top} substring(e.name,1,1)
  from hr_dictPosition dp 
    join ubm_enum e on e.code = dp.psCategory
      and e.eGroup = 'HR_POSITION_PSCATEGORY'    
   where dp.ID = ${dictPosID} and dp.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit}) 
end)  `
}

function getPosNameSql (empNumAlias = 'en', posNameField = 'name') {
  const sqlDialect = entityBaseService.getSQLDialect()
  return `(select ${sqlDialect.top} 
(case when ep.positionID IS NOT NULL then
(select ${sqlDialect.top} posSubQ.${posNameField} from hr_position posSubQ
where posSubQ.mi_data_id = ep.positionID
    and posSubQ.state = 'ACTIVE' 
and posSubQ.mi_dateFrom <= ${empNumAlias}.dateTo and posSubQ.mi_dateTo >= ${empNumAlias}.dateFrom
and posSubQ.mi_deleteDate >= '9999-12-31'
order by posSubQ.mi_dateFrom desc ${sqlDialect.limit})
else
(select ${sqlDialect.top} dp.${posNameField} from hr_dictPosition dp where dp.ID = ep.positionID and dp.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit})
end )
from hr_employeePosition ep    
where ep.employeeNumberID = ${empNumAlias}.ID and ep.isActive = 1 
  and ep.dateFrom <= ${empNumAlias}.dateTo and ep.dateTo >= ${empNumAlias}.dateFrom
  and ep.mi_deleteDate >= '9999-12-31'
  order by ep.dateFrom desc ${sqlDialect.limit})`
}

function getDepNameSql (empNumAlias = 'en', depNameField = 'name') {
  const sqlDialect = entityBaseService.getSQLDialect()
  return `(select ${sqlDialect.top} dep.${depNameField} from hr_employeePosition ep
    join hr_department dep on dep.mi_data_id = ep.departmentID
      and dep.mi_dateFrom <= ${empNumAlias}.dateTo and dep.mi_dateTo >= ${empNumAlias}.dateFrom
      and dep.mi_deleteDate >= '9999-12-31'
  where ep.employeeNumberID = ${empNumAlias}.ID and ep.isActive = 1 
    and ep.dateFrom <= ${empNumAlias}.dateTo and ep.dateTo >= ${empNumAlias}.dateFrom
    and ep.mi_deleteDate >= '9999-12-31'
  order by ep.dateFrom desc ${sqlDialect.limit})`
}

function getPosCatShortNameSql (empNumAlias = 'en') {
  const sqlDialect = entityBaseService.getSQLDialect()
  return `(select ${sqlDialect.top} CONCAT(substring(e.name,1,1), case when stPay.groupN is not null then CONCAT('-', stPay.groupN) else '' end)
  from hr_employeePosition ep 
    join hr_position pos on pos.mi_data_id = ep.positionID
      and pos.mi_dateFrom <= ${empNumAlias}.dateTo and pos.mi_dateTo >= ${empNumAlias}.dateFrom
      and pos.state = 'ACTIVE'
      and pos.positionType = '1'
    join ubm_enum e on e.code = pos.psCategory
      and e.eGroup = 'HR_POSITION_PSCATEGORY'
    left join hr_dictStatePay stPay on stPay.ID = pos.dictStatePayID
      and stPay.mi_deleteDate >= '9999-12-31'
  where ep.employeeNumberID = ${empNumAlias}.ID and ep.isActive = 1  
    and ep.dateFrom <= ${empNumAlias}.dateTo and ep.dateTo >= ${empNumAlias}.dateFrom
    and ep.mi_deleteDate >= '9999-12-31'
  order by ep.dateFrom desc ${sqlDialect.limit})`
}

function getPosCategoryShortNameSql (empNumAlias = 'en') {
  const sqlDialect = entityBaseService.getSQLDialect()
  return `(select ${sqlDialect.top} e.name
  from hr_employeePosition ep 
    join hr_position pos on pos.mi_data_id = ep.positionID
      and pos.mi_dateFrom <= ${empNumAlias}.dateTo and pos.mi_dateTo >= ${empNumAlias}.dateFrom
      and pos.state = 'ACTIVE'
    join ubm_enum e on e.code = pos.positionCategory
      and e.eGroup = 'HR_POSITION_CATEGORY'
  where ep.employeeNumberID = ${empNumAlias}.ID and ep.isActive = 1  
    and ep.dateFrom <= ${empNumAlias}.dateTo and ep.dateTo >= ${empNumAlias}.dateFrom
    and ep.mi_deleteDate >= '9999-12-31'
  order by ep.dateFrom desc ${sqlDialect.limit})`
}

function getRankNameSql (empNumAlias = 'en', dateParamName = ':onDate:') {
  const sqlDialect = entityBaseService.getSQLDialect()
  return `(select ${sqlDialect.top} t.name
  from hr_publServRang r 
    join hr_dictRank t on t.ID = r.dictRankID
      and t.mi_deleteDate >= '9999-12-31'
  where 
    r.employeeID = ${empNumAlias}.employeeID
    and ${dateParamName} between r.dateFrom and r.dateTo 
    and r.mi_deleteDate >= '9999-12-31' 
  order by r.dateFrom desc ${sqlDialect.limit})`
}

function getEmpRankNameSql (empNumAlias = 'emp.ID', dateParamName = ':onDate:') {
  const sqlDialect = entityBaseService.getSQLDialect()
  return `(select ${sqlDialect.top} t.name
  from hr_publServRang r 
    join hr_dictRank t on t.ID = r.dictRankID
      and t.mi_deleteDate >= '9999-12-31'
  where 
    r.employeeID = ${empNumAlias} 
    and ${dateParamName} between r.dateFrom and r.dateTo 
    and r.mi_deleteDate >= '9999-12-31' 
  order by r.dateFrom desc ${sqlDialect.limit})`
}

function getSecondJobs (employeeID, baseEmployeeNumberID, orgID, dateFrom, dateTo) {
  return UB.Repository('hr_employeePositionS')
    .attrs(['employeeNumberID', 'employeeNumberID.dateFrom', 'employeeNumberID.dateTo'])
    .where('employeeID', '=', employeeID)
    .where('employeeNumberID', '!=', baseEmployeeNumberID)
    .where('organizationID', '=', orgID)
    .where('workPlace', '=', '2')
    .where('employeeNumberID.dateFrom', '<=', dateService.shiftDate(dateTo))
    .where('employeeNumberID.dateTo', '>=', dateService.shiftDate(dateFrom))
    .groupBy(['employeeNumberID', 'employeeNumberID.dateFrom', 'employeeNumberID.dateTo'])
    .selectAsObject({
      'employeeNumberID.dateFrom': 'dateFrom',
      'employeeNumberID.dateTo': 'dateTo'
    })
}

function getSqlEmployeePositionOneWorkPlace (dateParamName = ':onDate:', employeePositionAlias = 'ep', workPlaceParam = '') {
  return `
   INNER JOIN ( select min(case when empPos.workPlace is not null then empPos.workPlace else '99' end) as workPlace, employeeID
     from hr_employeePosition empPos
     where empPos.isActive = 1 and empPos.mi_deleteDate >= '9999-12-31'
           and ${dateParamName} between empPos.dateFrom and empPos.dateTo
           ${workPlaceParam ? `and empPos.workPlace = '${workPlaceParam}'` : ''}
     group by empPos.employeeID
   ) ep_uniq ON  ${employeePositionAlias}.employeeID = ep_uniq.employeeID and (case when ${employeePositionAlias}.workPlace is not null then ep.workPlace else '99' end) = ep_uniq.workPlace
`
}

function getOrganizationClause (organizationID, includeChildOrgs, dateAlias = ':onDate:', alias = 'en.orgID') {
  let orgClause = ''

  if (organizationID && includeChildOrgs) {
    orgClause = ` and ${alias} IN (select org.mi_data_id from hr_organization org
      where org.mi_treePath like '%/${organizationID}/%' and org.mi_deleteDate >= '9999-12-31'
        and org.mi_dateFrom <= ${dateAlias} and org.mi_dateTo >= ${dateAlias})`
  } else if (organizationID && !includeChildOrgs) {
    orgClause = ` and ${alias} = :organizationID: `
  }
  return orgClause
}

function getDepartmentClause (departmentID, includeChildDepts, dateAlias = ':onDate:') {
  let depClause = ''
  if (departmentID && includeChildDepts) {
    depClause = ` and ep.departmentID IN (select dep.mi_data_id from hr_department dep
      where dep.mi_treePath like '%${departmentID}%' and dep.state = 'ACTIVE' and dep.mi_deleteDate >= '9999-12-31' 
      and dep.mi_dateFrom <= ${dateAlias} and dep.mi_dateTo >= ${dateAlias})`
  } else if (departmentID && !includeChildDepts) {
    depClause = ` and ep.departmentID = :departmentID: `
  }

  return depClause
}

/**
 * @param positionID
 * @param orgID
 * @param accrualSum
 * @param quantity
 * @param repParams
 * @param roundUpTo
 */
function calculatePositionFunds (positionID, orgID, accrualSum, quantity, repParams, roundUpTo) {
  if (!roundUpTo) {
    roundUpTo = settingsService.getByCode('hrRoundAccrualStaffTable', orgID)
  }
  const accrData = UB.Repository('hr_positionAccrual')
    .attrs(['positionID', 'accrualSum', 'accrualRate', 'payElID', 'payElID.code', 'calcSum'])
    .where('positionID', '=', positionID)
    .where('payElID.methodID.code', '!=', '144')
    .selectAsObject()
  if (!repParams) {
    const parentOrgID = settingsService.getByCode('hrUseReportSettingsParentOrg', orgID)
    repParams = UB.Repository('hr_idParam')
      .attrs(['listParamID.code', 'valuesID'])
      .where('[listParamID.code]', 'in', ['FOZP', 'FDZP', 'ZKV'])
      .where('[orgID]', '=', Number(parentOrgID || orgID))
      .where('[listParamID.mi_deleteUser]', 'isNull')
      .selectAsObject()
  }

  const result = {
    baseSum: accrualService.roundSum(accrualSum || 0, roundUpTo),
    fundBase: 0,
    fundAdd: 0,
    fundOther: 0,
    fundAll: 0
  }
  result.fundBase = accrualService.roundSum(result.baseSum * (quantity || 0), roundUpTo)
  result.fundAdd = 0
  result.fundOther = 0
  result.fundAll = 0
  accrData.forEach(accrPosItem => {
    let payElCode = accrPosItem['payElID.code']
    let repElement = repParams.find(item => item.valuesID === accrPosItem.payElID)
    let calcSum = accrualService.roundSum(accrPosItem.calcSum || 0, roundUpTo) || 0
    let fundSum = accrualService.roundSum(calcSum * (quantity || 0), roundUpTo)
    result.fundAll += fundSum
    if (repElement) {
      let repSetParamCode = repElement['listParamID.code']
      result.fundCode = repSetParamCode
      if (repSetParamCode === 'FOZP') {
        if (payElCode !== '1') {
          result.fundBase += fundSum
        }
      } else if (repSetParamCode === 'FDZP') {
        result.fundAdd += fundSum
      } else if (repSetParamCode === 'ZKV') {
        result.fundOther += fundSum
      }
    }
  })
  return result
}

function getPlanSumByPosition ({ onDate, orgID, positionIDs, positionDataIDs, payElIDs, positionAccrualData, dictTarifCoeffDet, positionData, skipTarifCalc }) {
  const cont = {
    orgID,
    payEl: payElService.getPayElEntrySum()
  }
  if (!positionData) {
    positionData = UB.Repository('hr_position')
      .attrs(['ID', 'mi_data_id', 'payElID', 'accrualSum', 'dictTarifCoeffID', 'mi_dateFrom'])
      .where('orgID', '=', orgID)
      .whereIf(positionIDs, 'ID', 'in', positionIDs)
      .whereIf(positionDataIDs, 'mi_data_id', 'in', positionDataIDs)
      .whereIf(positionDataIDs, 'state', '=', 'ACTIVE')
      .whereIf(onDate, 'mi_dateFrom', '<=', onDate)
      .whereIf(onDate, 'mi_dateTo', '>=', onDate)
      .misc({ __mip_recordhistory_all: true })
      .selectAsObject()
  }
  if (!positionAccrualData) {
    positionAccrualData = UB.Repository('hr_positionAccrual')
      .attrs(['ID', 'positionID', 'payElID', 'accrualSum', 'accrualRate', 'payElID.dictTarifCoeffID'])
      .where('positionID', 'in', positionData.length ? positionData.map(o => o.ID) : [0])
      .selectAsObject()
  }
  if (!dictTarifCoeffDet) {
    dictTarifCoeffDet = UB.Repository('hr_dictTarifCoeffDet')
      .attrs(['dictTarifCoeffID', 'accrualSum', 'dateFrom', 'dateTo'])
      .orderBy('dictTarifCoeffID')
      .orderBy('dateFrom')
      .selectAsObject()
    dictTarifCoeffDet.forEach(row => {
      row.dateFrom = dateService.shiftDate(row.dateFrom)
      row.dateTo = dateService.shiftDate(row.dateTo)
    })
  }
  const calcDate = onDate || dateService.currentDate()
  positionData.forEach(position => {
    const positionAccrual = positionAccrualData.filter(o => o.positionID === position.ID)
    position.planCalcSum = 0
    position.planTarifSum = 0
    position.payEl = []
    let accrualSum = position.accrualSumHour || position.accrualSum
    positionAccrual.sort((a, b) => cont.payEl[b.payElID].payElEntrySum.find(o => o.payElBaseID === a.payElID && o.dateFrom <= calcDate && o.dateTo >= calcDate) ? -1 : 1)
      .forEach(perAccr => {
        let planSum = 0
        if (cont.payEl[perAccr.payElID].method.code === '144') {
          if (perAccr.accrualRate) {
            let dictTarifCoeff
            if (!skipTarifCalc || cont.payEl[perAccr.payElID].dictTarifCoeffID) {
              const miDateFrom = dateService.shiftDate(position.mi_dateFrom)
              const calcDictTarifCoeffID = cont.payEl[perAccr.payElID].dictTarifCoeffID || position.dictTarifCoeffID
              dictTarifCoeff = dictTarifCoeffDet.find(o => o.dictTarifCoeffID === calcDictTarifCoeffID && o.dateFrom <= miDateFrom && o.dateTo >= miDateFrom) || {}
            } else {
              dictTarifCoeff = { accrualSum: position.accrualSum }
            }
            // planSum = (dictTarifCoeff.accrualSum || 0) * perAccr.accrualRate / 100
            const salaryAccrual = { payElID: position.payElID, accrualSum: (dictTarifCoeff.accrualSum || 0), isTarifAccrual: position.isTarifAccrual }
            accrualSum = salaryAccrual.accrualSum
            planSum = getPlanSum(calcDate, cont, perAccr, salaryAccrual, positionAccrual, null, [], false, position.payEl, dictTarifCoeff.accrualSum || 0) * perAccr.accrualRate / 100
          } else {
            planSum = perAccr.accrualSum || 0
          }
          position.planTarifSum = accrualService.round(planSum + position.planTarifSum)
        } else {
          planSum = perAccr.accrualRate
            ? getPlanSum(calcDate, cont, perAccr, position, positionAccrual, null, [], false, position.payEl) * perAccr.accrualRate / 100
            : perAccr.accrualSum
        }
        position.planCalcSum = accrualService.round(planSum + position.planCalcSum)
        if (!payElIDs || payElIDs.includes(perAccr.payElID)) {
          position.payEl.push({
            ID: perAccr.ID,
            payElID: perAccr.payElID,
            planSum,
            rate: perAccr.accrualRate,
            baseSum: perAccr.accrualSum
          })
        }
      })
    position.planAccrualSum = accrualService.round(accrualSum + position.planTarifSum)
  })

  return positionData
}

function getPlanSum (onDate, cont, permanentAccrual, salaryAccrual = {}, permanentAccruals, includPayEl, calcPayEl = [], withPrcent = false, accruals = [], basePlanSum = 0) {
  let planSum = basePlanSum
  const calcPayEls = []
  let accrualSum = salaryAccrual.baseSum || salaryAccrual.accrualSum || 0
  if (salaryAccrual.isTarifAccrual && cont.payEl[permanentAccrual.payElID].method.code === '144') {
    planSum = accrualSum
  }

  calcPayEls.push(...calcPayEl)
  let rate = permanentAccrual.accrualRate
  if (permanentAccrual.accrualSum) {
    return permanentAccrual.accrualSum
  }
  if (['7', '8', '24'].includes(cont.payEl[permanentAccrual.payElID].method.code)) {
    return 0
  }
  if (calcPayEls.find(o => o === permanentAccrual.payElID)) {
    return planSum
  }
  calcPayEls.push(permanentAccrual.payElID)
  const payElEntry = cont.payEl[permanentAccrual.payElID].payElEntrySum.filter(o => o.dateFrom <= onDate && o.dateTo >= onDate)
  if (payElEntry.find(o => o.payElBaseID === salaryAccrual.payElID)) {
    if (includPayEl) {
      includPayEl.push({
        payElID: salaryAccrual.payElID,
        paySum: accrualSum / (withPrcent ? 100 * rate : 1)
      })
    }
    planSum += accrualSum
  }

  permanentAccruals.forEach(perAccr => {
    const payEl = cont.payEl[perAccr.payElID]
    if (payEl.method.groupType === 'PAYMENT' && ![1, 6, 7, 8, 9].includes(payEl.method.groupCode) &&
      !['9', '10', '11', '50', '56', '66', '138'].includes(payEl.method.code) && permanentAccrual.payElID !== payEl.ID &&
      !calcPayEls.find(o => o === payEl.ID) && payElEntry.find(o => o.payElBaseID === payEl.ID)
    ) {
      const sum = getPlanSum(onDate, cont, perAccr, salaryAccrual, permanentAccruals, null, calcPayEls, true, accruals, basePlanSum)
      planSum += sum
      if (includPayEl && sum > 0) {
        includPayEl.push({
          payElID: payEl.ID,
          paySum: sum
        })
      }
    }
  })
  if (withPrcent) {
    planSum = planSum / 100 * (rate || 0)
  }
  return planSum
}
