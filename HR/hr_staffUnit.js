const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const TpManager = require('../AC/modules/documentBuilder/tpManager')
const _ = require('lodash')
const dateService = require('../AC/modules/dataServices/dateService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')
const nameCaseService = require('../HR/modules/nameCaseService')
const entityService = require('../HR/modules/entityService')
const staffService = require('../HR/modules/staffService')
const settingsService = require('../AC/modules/entityServices/settingsService')
const periodService = require('../HR/modules/periodService')
const { generateBase64Str } = require('../AC/modules/dataServices/filesService')

me.on('update:before', ctx => checkIdxNum(ctx))
me.on('insert:before', ctx => checkIdxNum(ctx))

me.entity.addMethod('determineChild')
me.entity.addMethod('liquidate')
me.entity.addMethod('liquidateLite')
me.entity.addMethod('restore')
me.entity.addMethod('restoreChanges')
me.entity.addMethod('copyUnitTree')
me.entity.addMethod('treeSearch')
me.entity.addMethod('selectByDataIDList')
me.entity.addMethod('selectLastDeps')
me.entity.addMethod('selectLastOrgUnits')
me.entity.addMethod('changeIdxNum')
me.entity.addMethod('setIdxNum')
me.entity.addMethod('getPositionCount')
me.entity.addMethod('setPositionCount')
me.entity.addMethod('generateXLSX')
me.entity.addMethod('reNumerateStaffUnit')
me.entity.addMethod('createNewVersion')
me.entity.addMethod('getPositionInfo')
me.entity.addMethod('getVacationEmpPos')
me.entity.addMethod('getVacationRate')
me.entity.addMethod('getTreePathIDs')
me.entity.addMethod('getStaffCount')
me.entity.addMethod('checkUnitRight')
me.entity.addMethod('createEmployeeOrder')
me.entity.addMethod('allowModifyEntity')
me.entity.addMethod('allowCreateEmpOrder')
me.entity.addMethod('getTreeStructure')

me.allowModifyEntity = () => {} // метод для перевірки прав на пряму модифікацію без ШР
me.allowCreateEmpOrder = () => {} // метод для перевірки прав на створення наказів з персоналу

me.createNewVersion = ctx => {
  const mParams = ctx.mParams
  const onDate = mParams.onDate
  const attrsToChange = mParams.attrsToChange || {}

  const entity = UB.Repository(__entityName)
    .attrs(['mi_unityEntity'])
    .selectById(mParams.ID)
  const attrs = Object.keys(global[entity.mi_unityEntity].entity.attributes).filter(attr => attr.indexOf('mi_') !== 0)
  const record = UB.Repository(entity.mi_unityEntity)
    .attrs('*')
    .misc({ __mip_recordhistory_all: true })
    .selectById(mParams.ID)
  let execParams = {}
  const store = UB.DataStore(entity.mi_unityEntity)
  attrs.forEach(attr => {
    if (attrsToChange[attr] !== undefined) {
      execParams[attr] = attrsToChange[attr]
    } else {
      execParams[attr] = record[attr]
    }
  })
  execParams.mi_dateFrom = dateService.shiftDate(onDate)
  execParams.mi_data_id = record.mi_data_id
  execParams.ID = store.generateID()
  execParams.priorID = mParams.ID
  execParams.state = 'NEW'
  if (attrsToChange.mi_treePath === undefined) {
    delete execParams.mi_treePath
  }
  if (attrsToChange.treePath === undefined) {
    delete execParams.treePath
  }
  if (attrsToChange.isSecondaryChanges === undefined) {
    delete execParams.isSecondaryChanges
  }
  delete execParams.fundSourcePositionID

  store.run('insert', {
    execParams: execParams
  })
  mParams.record = UB.Repository(entity.mi_unityEntity).attrs('*').selectById(execParams.ID)
}

me.changeIdxNum = ctx => {
  let data = JSON.parse(ctx.mParams.data)
  data.forEach(item => {
    if (item.idxNum !== item.newIdxNum) {
      UB.DataStore(item.mi_unityEntity).run('update', {
        __skipOptimisticLock: true,
        execParams: {
          ID: item.ID,
          idxNum: item.newIdxNum
        }
      })
    }
  })
}

me.setIdxNum = ctx => {
  const mParams = ctx.mParams
  const execParams = mParams.execParams
  let instanceData
  if (execParams.ID) {
    instanceData = UB.Reposiroty(__entityName)
      .attrs(['idxNum'])
      .selectById(execParams.ID)
  } else {
    instanceData = {}
  }
  if (mParams.dbMethod) {
    mParams.method = mParams.dbMethod
  } else {
    mParams.method = 'insert'
  }
  if (!(ctx.dataStore && ctx.dataStore.entityCode)) {
    ctx.dataStore = { entityCode: mParams.entityCode }
  }
  staffService.setIdxNum(ctx, instanceData)
}

me.treeSearch = function (ctx) {
  const { startID, search, onDate, searchMode, dictFundSourceID, staffTableID } = ctx.mParams
  const sqlDialect = entityBaseService.getSQLDialect()
  const sql = {
    byPath: `
       WITH tree (id, idxNum, parentID, mi_unityEntity, mi_treePath, name)
        AS (
            SELECT ${sqlDialect.dialect === 'MSSQL2012' ? 'top 1000000' : ''} 
            su.mi_data_id id, su.idxNum, su.parentUnitID, su.mi_unityEntity, su.mi_treePath, su.description as name
            FROM hr_staffUnit su left join hr_position pos on su.id = pos.id  
            WHERE 
            su.mi_treePath ${sqlDialect.dialect === 'MSSQL2012' ? 'like' : 'ilike'} CONCAT((select mi_treePath from hr_staffUnit
              where mi_data_id = :startID: and state = 'ACTIVE' and :onDate: between mi_dateFrom and mi_dateTo  and mi_deleteDate >= '9999-12-31'), '%')
            and su.orgID = :startID: and su.mi_deleteDate >= '9999-12-31'
            and ((su.state = 'ACTIVE' and :onDate: between su.mi_dateFrom and su.mi_dateTo) ${staffTableID ? `OR (su.state = 'NEW' and su.staffOrderID = :staffTableID:)` : ''})
            ${dictFundSourceID ? `AND ((su.mi_unityEntity = 'hr_position' AND exists(select 1 from hr_positionFundSource pfs where pfs.positionID = pos.ID and pfs.dictFundSourceID = :dictFundSourceID:)) 
            OR (su.mi_unityEntity!='hr_position' AND pos.dictFundSourceID IS NULL))` : ''}
            and su.description ${sqlDialect.dialect === 'MSSQL2012' ? 'like' : 'ilike'} CONCAT('%', cast( :search: AS CHARACTER VARYING(500)), '%')
            order by su.mi_unityEntity, su.treePath ${sqlDialect.dialect === 'MSSQL2012' ? '' : 'LIMIT 1000000'}
        )
        select mi_treePath "mi_treePath", mi_unityEntity "mi_unityEntity", name from tree
        union all
                select CONCAT(pos.mi_treePath, '/', emp.ID, '/', epos.ID, '/') mi_treePath, 'hr_employee' as mi_unityEntity, 
                CONCAT(emp.fullFIO, ' (', pos.name, ')', case epos.workPlace when '1' then ' ${UB.i18n('основне')}' when '2' then ' ${UB.i18n('за сумісництвом')}' else '' end) as name 
        from hr_employeePosition ePos 
        join hr_position pos on pos.mi_deleteDate >= '9999-12-31' 
            and pos.state = 'ACTIVE' 
            and :onDate: between pos.mi_dateFrom and pos.mi_dateTo  and pos.mi_deleteDate >= '9999-12-31'
            and ePos.positionID = pos.mi_data_id
            and pos.orgID = epos.organizationID
        join hr_employee emp on emp.ID = ePos.employeeID and emp.mi_deleteDate >= '9999-12-31' and emp.fullFIO 
         ${sqlDialect.dialect === 'MSSQL2012' ? 'like' : 'ilike'} CONCAT('%', cast(:search: AS CHARACTER VARYING(500)), '%')
        where ePos.organizationID = :startID: and ePos.isActive = 1 and :onDate: between ePos.dateFrom and ePos.dateTo  and ePos.mi_deleteDate >= '9999-12-31'
          ${dictFundSourceID ? 'and exists(select 1 from hr_empPosFundSource pfs where pfs.dictFundSourceID = :dictFundSourceID: and pfs.employeePositionID=epos.ID)' : ''}    
  `,
    recurs: `
        WITH ${sqlDialect.dialect === 'MSSQL2012' ? '' : 'RECURSIVE'} tree (id, idxNum, parentUnitID, treePath, mi_treePath, name)     
      AS (      
        SELECT mi_data_id as id, idxNum, parentUnitID, 
          CAST(CONCAT('/', idxNum, '/') AS CHARACTER VARYING(500)) AS treePath, mi_treePath, description as name 
         FROM hr_organization
          WHERE parentUnitID is null and :onDate: between mi_dateFrom and mi_dateTo 
          and (state = 'ACTIVE' ${staffTableID ? `OR (state = 'NEW' and staffOrderID = :staffTableID:)` : ''}) and mi_deleteDate >= '9999-12-31'      
      UNION ALL    
          SELECT t.mi_data_id as id, t.idxNum, t.parentUnitID,
           CAST(CONCAT(t1.treePath, t.idxNum, '/') AS CHARACTER VARYING(500)) treePath, t.mi_treePath, t.description AS name     
          FROM hr_organization t             
           INNER JOIN tree t1 ON t1.id = t.parentUnitID        
          WHERE t.mi_deleteDate >= '9999-12-31' and :onDate: between t.mi_dateFrom and t.mi_dateTo 
          and (t.state = 'ACTIVE' ${staffTableID ? `OR (t.state = 'NEW' and t.staffOrderID = :staffTableID:)` : ''})
      )      
      select mi_treePath "mi_treePath", 'hr_organization' as "mi_unityEntity", name from tree 
      where name ${sqlDialect.dialect === 'MSSQL2012' ? `like` : `ilike`} CONCAT('%', cast(:search: AS CHARACTER VARYING(500)), '%')    
  `
  }

  const store = UB.DataStore(__entityName)

  if (searchMode === 'ORG') {
    store.runSQL(sql.recurs, { startID: startID, search: search, onDate: onDate, staffTableID: staffTableID })
  } else {
    store.runSQL(sql.byPath, { startID: startID, search: search, onDate: onDate, dictFundSourceID: dictFundSourceID, staffTableID: staffTableID })
  }
  ctx.mParams.data = store.asJSONObject

  store.freeNative()
}

function checkIdxNum (ctx) {
  const idxNum = ctx.mParams.execParams.idxNum
  if (idxNum > 99999999) {
    throw new UB.UBAbort(`<<<${UB.i18n('Номер за порядком не може бути більшим за 99999999')}>>>`)
  }
}

me.determineChild = function (ctx) {
  const mParams = ctx.mParams
  const master = mParams.master
  const IDList = mParams.IDList
  const onDate = dateService.shiftDate(mParams.onDate)
  const hasChild = []
  const showNode = JSON.parse(mParams.showNode)
  const masterChild = (mParams.masterChild && JSON.parse(mParams.masterChild)) || {
    hr_staffUnit: {
      childList: ['hr_employeePosition', 'hr_staffUnit'],
      childField: ['positionID', 'parentUnitID'],
      childNoHistory: [true],
      childWhere: [
        {
          posStartDate: {
            expression: '[dateFrom]',
            condition: 'lessEqual',
            values: {
              posStartDate: onDate
            }
          },
          posDismissDate: {
            expression: '[dateTo]',
            condition: 'moreEqual',
            values: {
              posDismissDate: onDate
            }
          }
        }
      ]
    },
    hr_organization: {
      childList: ['hr_organization', 'hr_department', 'hr_position'],
      childField: ['parentUnitID', 'parentUnitID', 'parentUnitID']

    },
    hr_department: {
      childList: ['hr_organization', 'hr_department', 'hr_position'],
      childField: ['parentUnitID', 'parentUnitID', 'parentUnitID']
    },
    hr_position: {
      childList: ['hr_employeePosition', 'hr_organization', 'hr_department', 'hr_position'],
      childField: ['positionID', 'parentUnitID', 'parentUnitID', 'parentUnitID'],
      childNoHistory: [true],
      childWhere: [
        {
          posStartDate: {
            expression: '[dateFrom]',
            condition: 'lessEqual',
            values: {
              posStartDate: onDate
            }
          },
          posDismissDate: {
            expression: '[dateTo]',
            condition: 'moreEqual',
            values: {
              posDismissDate: onDate
            }
          }
        }
      ]
    }
  }
  const config = masterChild && masterChild[master]
  const childList = config && config.childList
  if (!(master && global[master] && global[master].entity)) {
    throw new UB.UBAbort('unknown master entity  ' + master)
  }
  childList && childList.forEach((child, idx) => {
    if (!(child && global[child] && global[child].entity)) {
      throw new UB.UBAbort('unknown child entity  ' + child)
    }
    if (hasChild.length === IDList.length) {
      return
    }
    const query = UB.Repository(master).attrs(['ID']).where('ID', 'in', IDList).misc({ __mip_recordhistory_all: true })
      .where('mi_dateFrom', 'lessEqual', onDate, 'dateFrom')
      .where('mi_dateTo', 'moreEqual', onDate, 'dateTo')
      .where('mi_unityEntity', 'in', showNode)
    if (!mParams.orderID) {
      query.where('state', '=', 'ACTIVE')
      // .where('liquidate', '=', 0)
    } else {
      query.where('state', '=', 'ACTIVE', 'active')
        .where('liquidate', '=', 0, 'liqu')
        .where('staffOrderID', '=', mParams.orderID, 'order')
        .notExists(UB.Repository('hr_staffUnit')
          .correlation('mi_data_id', 'mi_data_id')
          .where('staffOrderID', '=', mParams.orderID)
          .where('mi_deleteDate', '>=', '#maxdate'), 'notExist')
        .logic('(([active] and [liqu] and [notExist] and [dateFrom] and [dateTo]) or ([order]))')
    }

    let subquery = UB.Repository(child).correlation(config.childField[idx], (config.masterField && config.masterField[idx]) || 'mi_data_id')
    const childWhere = config.childWhere && config.childWhere[idx]
    const childNoHistory = !!(config.childNoHistory && config.childNoHistory[idx])
    if (!childNoHistory) {
      subquery = subquery.misc({ __mip_ondate: onDate })
    } else {
      subquery = subquery.misc({ __mip_recordhistory_all: true })
    }

    childWhere && (subquery.whereList = _.merge(subquery.whereList, childWhere))

    const
      data = query.exists(subquery).select()
    while (!data.eof) {
      hasChild.push(data.get('ID'))
      data.next()
    }
  })
  mParams.hasChild = JSON.stringify(hasChild)
}

me.liquidate = function (ctx) {
  const mParams = ctx.mParams
  const orgUnit = UB.Repository('hr_staffUnit')
    .attrs(['ID', 'state', 'mi_dateFrom', 'mi_dateTo', 'staffOrderID', 'mi_unityEntity', 'liquidate', 'mi_treePath',
      'mi_data_id', 'orgID'])
    .selectById(mParams.instanceID)
  if (orgUnit.liquidate) {
    return
  }
  const isOrgStructure = mParams.empOrderType === 'ORGSTRUCTURE' && orgUnit['mi_unityEntity'] !== 'hr_position'
  const orgUnits = UB.Repository('hr_staffUnit')
    .attrs(['ID', 'state', 'mi_dateFrom', 'mi_dateTo', 'staffOrderID', 'mi_unityEntity', 'liquidate', 'mi_treePath',
      'mi_data_id'])
    .where('orgID', '=', orgUnit.orgID)
    .where('mi_dateFrom', '<=', dateService.shiftDate(mParams.onDate))
    .where('mi_dateTo', '>=', dateService.shiftDate(mParams.onDate))
    .where('mi_treePath', 'startsWith', orgUnit.mi_treePath)
    .whereIf(isOrgStructure, 'mi_unityEntity', '!=', 'hr_position')
    .where('state', '=', 'ACTIVE', 'active')
    .where('state', '=', 'NEW', 'new')
    .where('staffOrderID', '=', mParams.orderID, 'order')
    .notExists(UB.Repository('hr_staffUnit')
      .correlation('mi_data_id', 'mi_data_id')
      .where('orgID', '=', orgUnit.orgID)
      .where('state', '=', 'NEW')
      .where('[parentUnitID] <> [{master}.parentUnitID]', 'custom')
      .where('staffOrderID', '=', mParams.orderID)
      .where('mi_deleteDate', '>=', '#maxdate')
    )
    .logic('(([order] AND [new]) or ([active]))')
    .misc({ __mip_recordhistory_all: true })
    .orderBy('mi_treePath')
    .selectAsObject()
  const orgUnitsLater = UB.Repository('hr_staffUnit')
    .attrs(['ID', 'state', 'mi_dateFrom', 'mi_dateTo', 'staffOrderID', 'mi_unityEntity', 'liquidate', 'mi_treePath',
      'mi_data_id'])
    .where('orgID', '=', orgUnit.orgID)
    .where('mi_dateFrom', '>', dateService.shiftDate(mParams.onDate))
    .where('mi_dateTo', '>=', '#maxdate')
    .where('mi_treePath', 'startsWith', orgUnit.mi_treePath)
    .whereIf(isOrgStructure, 'mi_unityEntity', '!=', 'hr_position')
    .where('state', '=', 'ACTIVE', 'active')
    .where('ID', '<>', orgUnit.ID)
    .misc({ __mip_recordhistory_all: true })
    .orderBy('mi_treePath')
    .selectAsObject()
  const orgUnitsList = orgUnits.concat(orgUnitsLater)

  if (mParams.dictFundSourceID && orgUnit.mi_unityEntity !== 'hr_position') {
    const posLiquidateIDs = orgUnitsList.filter(o => o.mi_unityEntity === 'hr_position').map(o => o.ID)
    const posData = UB.Repository('hr_position')
      .attrs('ID')
      .where('dictFundSourceID', '<>', mParams.dictFundSourceID, 'dictFundSource')
      .where('dictFundSourceID', 'isNull', undefined, 'dictFundSourceNull')
      .where('ID', 'in', posLiquidateIDs)
      .logic('([dictFundSource] OR [dictFundSourceNull])')
      .selectSingle()
    if (posData) {
      throw new UB.UBAbort(`<<<${UB.i18n('Неможливо ліквідувати підрозділ. Існують посади з іншим джерелом фінансування!')}>>>`)
    }
  }
  orgUnitsList.forEach(row => {
    const store = UB.DataStore(row.mi_unityEntity)
    if (row.state === 'NEW') {
      try {
        store.run('delete', {
          execParams: {
            ID: row.ID
          }
        })
      } catch (e) {}
    } else {
      const newID = store.generateID()
      entityBaseService.cloneInstance(row.mi_unityEntity, row.ID, {
        ID: newID,
        mi_data_id: row.mi_data_id,
        mi_treePath: row.mi_treePath,
        mi_dateFrom: dateService.shiftDate(mParams.onDate),
        mi_dateTo: dateService.maxDate(),
        state: 'NEW',
        staffOrderID: mParams.orderID,
        priorID: row.ID,
        liquidate: 1,
        isSecondaryChanges: null
      }, true)
    }
  })
}

me.liquidateLite = function (ctx) {
  const mParams = ctx.mParams
  const orgUnit = UB.Repository('hr_staffUnit')
    .attrs(['ID', 'state', 'mi_dateFrom', 'mi_dateTo', 'staffOrderID', 'mi_unityEntity', 'liquidate', 'mi_treePath',
      'mi_data_id', 'orgID'])
    .selectById(mParams.instanceID)
  if (orgUnit.liquidate) {
    return
  }
  if (orgUnit.mi_unityEntity === 'hr_position') {
    const store = UB.DataStore('hr_position')
    store.run('update', {
      __skipOptimisticLock: true,
      execParams: {
        ID: mParams.instanceID,
        liquidate: 1,
        mi_dateTo: orgUnit['mi_dateFrom']
      }
    })
    store.freeNative()
  }
  if (orgUnit.mi_unityEntity === 'hr_department') {
    const posStore = UB.DataStore('hr_position')
    const depStore = UB.DataStore('hr_department')
    const orgUnits = UB.Repository('hr_staffUnit')
      .attrs(['ID', 'state', 'mi_dateFrom', 'mi_dateTo', 'staffOrderID', 'mi_unityEntity', 'liquidate', 'mi_treePath', 'mi_data_id'])
      .where('orgID', '=', orgUnit.orgID)
      .where('mi_treePath', 'startsWith', orgUnit.mi_treePath)
      .where('state', '=', 'ACTIVE', 'active')
      .where('liquidate', '=', 0)
      .selectAsObject()
    orgUnits.forEach(row => {
      if (row.mi_unityEntity === 'hr_position') {
        posStore.run('update', {
          __skipOptimisticLock: true,
          execParams: {
            ID: row.ID,
            liquidate: 1,
            mi_dateTo: dateService.shiftDate(row['mi_dateFrom'])
          }
        })
      }
      if (row.mi_unityEntity === 'hr_department') {
        depStore.run('update', {
          __skipOptimisticLock: true,
          execParams: {
            ID: row.ID,
            liquidate: 1,
            mi_dateTo: dateService.shiftDate(row['mi_dateFrom'])
          }
        })
      }
    })
    posStore.freeNative()
    depStore.freeNative()
  }
}

me.restore = function (ctx) {
  const mParams = ctx.mParams
  const orgUnit = UB.Repository('hr_staffUnit')
    .attrs(['ID', 'state', 'staffOrderID', 'mi_unityEntity', 'liquidate', 'mi_data_id'])
    .selectById(mParams.instanceID)

  if (!orgUnit.liquidate || orgUnit.state !== 'NEW') {
    return
  }

  function setLiquidate (ID, miDataID, unityEntity) {
    const child = UB.Repository('hr_staffUnit')
      .attrs(['ID', 'mi_data_id', 'mi_unityEntity'])
      .where('parentUnitID', '=', miDataID)
      .where('staffOrderID', '=', mParams.orderID)
      .where('state', '=', 'NEW')
      .where('liquidate', '=', 1)
      .selectAsObject()

    child.forEach(row => {
      setLiquidate(row.ID, row.mi_data_id, row.mi_unityEntity)
    })
    const store = UB.DataStore(unityEntity)
    store.run('delete', {
      __skipOptimisticLock: true,
      execParams: {
        ID: ID
      }
    })
  }

  setLiquidate(mParams.instanceID, orgUnit.mi_data_id, orgUnit.mi_unityEntity)
}

me.restoreChanges = function (ctx) {
  const mParams = ctx.mParams
  const orgUnit = UB.Repository('hr_staffUnit')
    .attrs(['ID', 'state', 'staffOrderID', 'mi_unityEntity', 'liquidate', 'mi_data_id'])
    .selectById(mParams.instanceID)

  if (orgUnit.state !== 'NEW') {
    return
  }
  const store = UB.DataStore(orgUnit.mi_unityEntity)
  store.run('delete', {
    __skipOptimisticLock: true,
    execParams: {
      ID: mParams.instanceID
    }
  })
}

me.copyUnitTree = function (ctx) {
  const mParams = ctx.mParams
  const sourceID = mParams.sourceID
  const sourceDataID = mParams.sourceDataID
  const newDeptID = mParams.newDeptID
  const treePath = mParams.treePath
  const onDate = dateService.shiftDate(mParams.onDate) || dateService.currentDate()
  const staffTableID = mParams.staffTableID
  const dictFundSourceID = mParams.dictFundSourceID

  const orgID = UB.Repository('hr_staffUnit')
    .attrs('orgID')
    .where('ID', '=', sourceID)
    .selectScalar()
  const copyNamesFromSource = settingsService.getByCode('hrCopyNamesFromSource', orgID)

  const unitData = UB.Repository('hr_staffUnit')
    .attrs(['ID', 'mi_data_id', 'parentUnitID', 'mi_unityEntity', 'code', 'name', 'fullName', 'orgID', 'idxNum'])
    .where('mi_treePath', 'like', treePath + '%')
    .where('mi_deleteDate', '>=', '#maxdate')
    .where('state', '=', 'ACTIVE', 'stateAct')
    .where('mi_dateFrom', '<=', onDate, 'dateFrom')
    .where('mi_dateTo', '>=', onDate, 'dateTo')
    .where('ID', '!=', sourceID)
    .whereIf(mParams.instanceID, 'ID', '!=', mParams.instanceID)
    .where('staffOrderID', '=', staffTableID || 0, 'order')
    .where('mi_unityEntity', 'in', ['hr_department', 'hr_position'])
    .notExists(UB.Repository('hr_staffUnit')
      .correlation('mi_data_id', 'mi_data_id')
      .where('staffOrderID', '=', staffTableID)
      .where('mi_deleteDate', '>=', '#maxdate'),
    'notOtherThanOrder')
    .logic('(([stateAct] AND [dateFrom] AND [dateTo] AND [notOtherThanOrder]) OR [order])')
    .orderBy('mi_treePath')
    .selectAsObject()
  const deptData = UB.Repository('hr_department')
    .attrs(['ID', 'dictDepTypeID', 'departmentKindID', 'nameNom', 'nameGen', 'nameDat', 'nameAcc', 'nameOr', 'nameLoc',
      'nameVoc', 'positionChiefID', 'employeeChiefID', 'curatorID'
    ])
    .where('mi_treePath', 'like', treePath + '%')
    .misc({ __mip_ondate: onDate })
    .orderBy('mi_data_id')
    .selectAsObject()
  const posData = UB.Repository('hr_position')
    .attrs(['ID', 'mi_data_id', 'positionType', 'dictPositionID', 'positionCategory', 'dictStaffCatID', 'dictWagePayID', 'psCategory',
      'dictStatePayID', 'dictFundSourceID', 'payElID', 'nameNom', 'nameGen', 'nameDat', 'nameAcc', 'nameOr', 'nameLoc', 'nameVoc',
      'fullNameNom', 'fullNameGen', 'fullNameDat', 'fullNameAcc', 'fullNameOr', 'fullNameLoc', 'fullNameVoc', 'quantity', 'accrualSum'])
    .where('mi_treePath', 'like', treePath + '%')
    .whereIf(dictFundSourceID, 'dictFundSourceID', '=', dictFundSourceID)
    .misc({ __mip_ondate: onDate })
    .orderBy('mi_data_id')
    .selectAsObject()

  const storeDept = UB.DataStore('hr_department')
  const storePos = UB.DataStore('hr_position')
  const storeAccr = UB.DataStore('hr_positionAccrual')

  unitData.forEach(unit => {
    let unityEntity = unit.mi_unityEntity
    let newID
    let newParentID = unit.parentUnitID
    if (newParentID === sourceDataID) {
      newParentID = newDeptID
    } else {
      let parentUnit = unitData.find(item => item.mi_data_id === newParentID)
      if (parentUnit) {
        newParentID = parentUnit.newID
      }
    }
    if (unityEntity === 'hr_department') {
      let dept = deptData.find(item => item.ID === unit.ID)
      if (dept) {
        newID = storeDept.generateID()
        storeDept.run('insert', {
          execParams: {
            ID: newID,
            state: 'NEW',
            mi_data_id: newID,
            mi_dateFrom: onDate,
            staffOrderID: staffTableID,
            parentUnitID: newParentID,
            code: unit.code,
            name: unit.name,
            fullName: unit.fullName,
            orgID: unit.orgID,
            idxNum: unit.idxNum,
            dictDepTypeID: dept.dictDepTypeID,
            departmentKindID: dept.departmentKindID,
            nameNom: dept.nameNom,
            nameGen: dept.nameGen,
            nameDat: dept.nameDat,
            nameAcc: dept.nameAcc,
            nameOr: dept.nameOr,
            nameLoc: dept.nameLoc,
            nameVoc: dept.nameVoc,
            positionChiefID: dept.positionChiefID,
            employeeChiefID: dept.employeeChiefID,
            curatorID: dept.curatorID
          }
        })
      }
    } else if (unityEntity === 'hr_position') {
      let pos = posData.find(item => item.ID === unit.ID)
      if (pos) {
        const storePosition = UB.DataStore('hr_position')
        const maxNameLength = entityService.getFieldSize(storePosition, 'nameNom') || 256
        const maxFullNameLength = entityService.getFieldSize(storePosition, 'fullNameNom') || 500

        let newCases
        if (copyNamesFromSource) {
          newCases = {}
        } else {
          newCases = nameCaseService.getPositionNameCases(pos.dictPositionID, onDate, unit.orgID, newParentID, staffTableID)
          newCases.fullName = nameCaseService.getPositionFullName(pos.dictPositionID, onDate, unit.orgID, newParentID, staffTableID)
        }
        newID = storePos.generateID()
        storePos.run('insert', {
          sourceID: pos['mi_data_id'],
          execParams: {
            ID: newID,
            state: 'NEW',
            mi_data_id: newID,
            mi_dateFrom: onDate,
            parentUnitID: newParentID,
            staffOrderID: staffTableID,
            code: unit.code,
            name: unit.name,
            fullName: (newCases.fullName || unit.fullName || '').substr(0, maxFullNameLength) || null,
            orgID: unit.orgID,
            idxNum: unit.idxNum,
            positionType: pos.positionType,
            dictPositionID: pos.dictPositionID,
            positionCategory: pos.positionCategory,
            dictStaffCatID: pos.dictStaffCatID,
            dictWagePayID: pos.dictWagePayID,
            psCategory: pos.psCategory,
            dictStatePayID: pos.dictStatePayID,
            dictFundSourceID: pos.dictFundSourceID,
            payElID: pos.payElID,
            nameNom: (newCases.nameNom || pos.nameNom || '').substr(0, maxNameLength) || null,
            nameGen: (newCases.nameGen || pos.nameGen || '').substr(0, maxNameLength) || null,
            nameDat: (newCases.nameDat || pos.nameDat || '').substr(0, maxNameLength) || null,
            nameAcc: (newCases.nameAcc || pos.nameAcc || '').substr(0, maxNameLength) || null,
            nameOr: (newCases.nameOr || pos.nameOr || '').substr(0, maxNameLength) || null,
            nameLoc: (newCases.nameLoc || pos.nameLoc || '').substr(0, maxNameLength) || null,
            nameVoc: (newCases.nameVoc || pos.nameVoc || '').substr(0, maxNameLength) || null,
            fullNameNom: (newCases.fullNameNom || pos.fullNameNom || '').substr(0, maxFullNameLength) || null,
            fullNameGen: (newCases.fullNameGen || pos.fullNameGen || '').substr(0, maxFullNameLength) || null,
            fullNameDat: (newCases.fullNameDat || pos.fullNameDat || '').substr(0, maxFullNameLength) || null,
            fullNameAcc: (newCases.fullNameAcc || pos.fullNameAcc || '').substr(0, maxFullNameLength) || null,
            fullNameOr: (newCases.fullNameOr || pos.fullNameOr || '').substr(0, maxFullNameLength) || null,
            fullNameLoc: (newCases.fullNameLoc || pos.fullNameLoc || '').substr(0, maxFullNameLength) || null,
            fullNameVoc: (newCases.fullNameVoc || pos.fullNameVoc || '').substr(0, maxFullNameLength) || null,
            quantity: pos.quantity,
            accrualSum: pos.accrualSum
          }
        })
        const storeFs = UB.DataStore('hr_positionFundSource')
        UB.Repository('hr_positionFundSource')
          .attrs('ID', 'dictFundSourceID', 'quantity')
          .where('positionID', '=', unit.ID)
          .selectAsObject()
          .forEach(item => {
            storeFs.run('insert', {
              execParams: {
                ID: storeFs.generateID(),
                positionID: newID,
                dictFundSourceID: item.dictFundSourceID,
                quantity: item.quantity,
                isChanged: 0
              }
            })
          })
        if (mParams.withAccruals) {
          const accrual = UB.Repository('hr_positionAccrual')
            .attrs([
              'positionID',
              'payElID',
              'accrualSum',
              'accrualRate',
              'dateFrom',
              'dateTo',
              'staffOrderID',
              'calcSum'
            ])
            .where('positionID', '=', unit.ID).selectAsObject()
          accrual.forEach(item => {
            storeAccr.run('insert', {
              skipUpdatePositionChangesState: true,
              execParams: {
                ID: storeAccr.generateID(),
                positionID: newID,
                payElID: item.payElID,
                accrualSum: item.accrualSum,
                accrualRate: item.accrualRate,
                calcSum: item.calcSum,
                dateFrom: onDate,
                dateTo: dateService.maxDateUTC(),
                staffOrderID: staffTableID
              }
            })
          })
        }
      }
    }
    unit.newID = newID
  })
  if (mParams.withAccruals && staffTableID) {
    const orderClass = UB.Repository('hr_order').attrs('orderClass.entityName').where('ID', '=', staffTableID).selectScalar()
    if (orderClass === 'hr_staffTariffing') {
      const rCtx = {
        mParams: {
          parentUnitID: newDeptID,
          staffTariffingID: staffTableID
        }
      }
      global['hr_staffTariffing'].recalcDepData(rCtx)
    }
  }
  storePos.freeNative()
  storeDept.freeNative()
  mParams.result = true
}

me.getTreePathIDs = function (dataIDList, onDate) {
  const parentIDs = []
  if (!dataIDList) {
    return parentIDs
  }
  const idArray = dataIDList.split(',')
  const parentData = UB.Repository('hr_staffUnit')
    .attrs(['mi_treePath'])
    .where('mi_data_id', 'in', idArray)
    .where('state', '=', 'ACTIVE')
    .misc({ __mip_ondate: onDate })
    .selectAsObject()
  parentData.forEach(itm => {
    let parentItems = itm.mi_treePath.slice(1, -1).split('/')
    parentItems.forEach(id => {
      if (!parentIDs.includes(id)) {
        parentIDs.push(id)
      }
    })
  })
  return parentIDs
}

/**
 * Отримати виборку дерева для масиву посад
 * @param {object} ctx
 * @param {string} ctx.dataIDs список mi_data_id посад через кому
 * @param {number} ctx.orgID ID організації
 * @param {Date} ctx.onDate на дату
 */
me.selectByDataIDList = function (ctx) {
  const mParams = ctx.mParams
  const store = UB.DataStore('hr_staffUnit')
  let dataIDList = mParams.dataIDs || '0'
  let dataIDs = dataIDList.split(',')
  dataIDList = _.uniq(dataIDs).join(',')
  const onDate = dateService.shiftDate(mParams.onDate)
  const parentIDs = me.getTreePathIDs(dataIDList, onDate)

  store.runSQL(`SELECT u.ID "ID", u.mi_data_id, u.parentUnitID "parentUnitID", u.mi_unityEntity "mi_unityEntity", u.code, u.name
    FROM hr_staffUnit u
    WHERE
      u.orgID = :orgID:
      and u.state = 'ACTIVE'
      and u.mi_deleteDate >= '9999-12-31'
      and u.mi_dateFrom <= :onDate:
      and u.mi_dateTo = (select MAX(u2.mi_dateTo) from hr_staffUnit u2
        where u2.orgID = :orgID:
          and u2.state = 'ACTIVE'
          and u2.mi_deleteDate >= '9999-12-31'
          and u2.mi_dateFrom <= :onDate:
          and u2.mi_data_id = u.mi_data_id)
      and u.mi_data_id in (${parentIDs.join(',')})
    ORDER BY u.treePath, u.name   
  `, {
    orgID: mParams.orgID,
    onDate: onDate
  })
  mParams.result = JSON.stringify(store.getAsJsObject())
  store.freeNative()
}

me.selectLastDeps = function (ctx) {
  const mParams = ctx.mParams
  const store = UB.DataStore('hr_staffUnit')
  const sqlDialect = entityBaseService.getSQLDialect()
  store.runSQL(`SELECT u.mi_data_id as "mi_data_id", u.parentUnitID as "parentUnitID", u.code as code, u.fullName as "fullName", 
   u.mi_unityEntity as "mi_unityEntity", u.accrualSum as "accrualSum", u.staffOrderID as "staffOrderID"
    FROM hr_staffUnit u             
    WHERE
      u.orgID = :orgID:
      and u.mi_deleteDate >= '9999-12-31' 
      and u.state = 'ACTIVE' 
      and u.ID = (select ${sqlDialect.top} u2.ID from hr_staffUnit u2 where u2.orgID = :orgID: 
      and u2.mi_data_id = u.mi_data_id 
      and u2.mi_deleteDate >= '9999-12-31' 
      and u2.state = 'ACTIVE'
      order by u2.mi_dateFrom desc ${sqlDialect.limit})    
    ORDER BY u.treePath   
  `, {
    orgID: mParams.orgID
  })

  const data = store.getAsJsObject()
  store.freeNative()

  mParams.resultData = JSON.stringify({
    data
  })
}

me.selectLastOrgUnits = function (ctx) {
  const mParams = ctx.mParams
  const store = UB.DataStore('hr_staffUnit')
  const sqlDialect = entityBaseService.getSQLDialect()
  store.runSQL(`SELECT u.mi_data_id as "mi_data_id", u.parentUnitID as "parentUnitID", u.fullName as "fullName", 
   u.mi_unityEntity as "mi_unityEntity", dep.description as "description"
    FROM hr_staffUnit u 
      LEFT JOIN hr_department dep ON dep.ID = u.ID      
    WHERE
      u.orgID = :orgID:
      and u.mi_deleteDate >= '9999-12-31' 
      and u.state = 'ACTIVE' 
      and u.ID = (select ${sqlDialect.top} u2.ID from hr_staffUnit u2 where u2.orgID = :orgID: 
      and u2.mi_data_id = u.mi_data_id 
      and u2.mi_deleteDate >= '9999-12-31' 
      and u2.state = 'ACTIVE' 
      and u2.mi_dateFrom <= :dateTo:
      order by u2.mi_dateFrom desc ${sqlDialect.limit})    
    ORDER BY u.treePath   
  `, {
    orgID: mParams.orgID,
    dateTo: mParams.dateTo || new Date()
  })

  const data = store.getAsJsObject()
  store.freeNative()

  mParams.resultData = JSON.stringify({
    data
  })
}

me.getPositionCount = function (ctx) {
  const mParams = ctx.mParams
  mParams.resultData = JSON.stringify(positionCountData(mParams))
}

function positionCountData (params) {
  const store = UB.DataStore('hr_staffUnit')
  store.runSQL(`SELECT su.ID "ID", su.mi_data_id, su.mi_unityEntity "mi_unityEntity", su.state, su.description,
   su.parentUnitID "parentUnitID", su.orgID "orgID",
  COALESCE(su.quantity, 0) quantity, 
  su.treePath "treePath", su.mi_treePath "mi_treePath",
  COALESCE((select sum(COALESCE(p.quantity, 0)) FROM hr_position p WHERE p.orgID = :orgID: and p.state = 'ACTIVE'   
   and p.mi_dateFrom <= :onDate: and p.mi_dateTo >= :onDate: AND p.mi_deleteDate>='9999-12-31' and p.mi_treePath like CONCAT(su.mi_treePath, '%')), 0) "quantityFact",
  
  (select sum(COALESCE(cu.quantity, 0)) FROM hr_staffUnit cu WHERE  
  cu.parentUnitID = su.mi_data_id and cu.orgID = :orgID: and cu.mi_deleteDate >= '9999-12-31'
  and (((cu.state='ACTIVE' and
  NOT EXISTS (SELECT 1  FROM hr_staffUnit cue  WHERE cue.mi_data_id = cu.mi_data_id AND cue.staffOrderID = :staffOrderID: AND cue.mi_deleteDate >= '9999-12-31') 
  and cu.mi_dateFrom <= :onDate: and cu.mi_dateTo >= :onDate:) or (cu.staffOrderID = :staffOrderID: and cu.liquidate = 0)))
        and (cu.mi_unityEntity = 'hr_department' or (cu.mi_unityEntity = 'hr_position' and cu.parentUnitID = :orgID:))) 
         "childQuantity",
        
  (select count(cu.ID) FROM hr_staffUnit cu WHERE cu.ID != su.ID and cu.orgID = :orgID: and cu.mi_deleteDate >= '9999-12-31'
   and cu.mi_treePath like CONCAT(su.mi_treePath, '%') and (((cu.state='ACTIVE' and
  NOT EXISTS (SELECT 1  FROM hr_staffUnit cue  WHERE cue.mi_data_id=cu.mi_data_id AND cue.staffOrderID = :staffOrderID: AND cue.mi_deleteDate >= '9999-12-31') 
  and cu.mi_dateFrom <= :onDate: and cu.mi_dateTo >= :onDate:) or (cu.staffOrderID = :staffOrderID: and cu.liquidate = 0)))
        and (cu.mi_unityEntity = 'hr_department' or (cu.mi_unityEntity = 'hr_position' and cu.parentUnitID = :orgID:))) "childCount",
        
   CASE WHEN su.mi_unityEntity = 'hr_department' THEN 
    (select d.quantityLead from hr_department d join hr_dictDepType dt on dt.ID = d.dictDepTypeID where d.mi_data_id = su.mi_data_id and dt.isLead = 1
    and d.orgID = :orgID: and d.mi_deleteDate >= '9999-12-31' and
(((d.state='ACTIVE' and
  NOT EXISTS (SELECT 1  FROM hr_staffUnit cue  WHERE cue.mi_data_id= d.mi_data_id AND cue.staffOrderID = :staffOrderID: AND cue.mi_deleteDate >= '9999-12-31') 
  and d.mi_dateFrom <= :onDate: and d.mi_dateTo >= :onDate:) or (d.staffOrderID = :staffOrderID: and d.liquidate = 0)))
    ) ELSE null END "quantityLead",
  CASE WHEN su.mi_unityEntity = 'hr_department' THEN 
    (select dt.isLead from hr_department d join hr_dictDepType dt on dt.ID = d.dictDepTypeID where d.mi_data_id = su.mi_data_id and dt.isLead = 1
    and d.orgID = :orgID: and d.mi_deleteDate >= '9999-12-31' and
(((d.state='ACTIVE' and
  NOT EXISTS (SELECT 1  FROM hr_staffUnit cue  WHERE cue.mi_data_id= d.mi_data_id AND cue.staffOrderID = :staffOrderID: AND cue.mi_deleteDate >= '9999-12-31') 
  and d.mi_dateFrom <= :onDate: and d.mi_dateTo >= :onDate:) or (d.staffOrderID = :staffOrderID: and d.liquidate = 0)))
    ) ELSE null END "isLead"       
         
             
  FROM hr_staffUnit su  
  WHERE su.orgID = :orgID: AND su.mi_deleteDate>='9999-12-31' 
   AND (su.mi_unityEntity != 'hr_position' or (su.mi_unityEntity = 'hr_position' and su.parentUnitID = :orgID: )) 
   AND (((su.state='ACTIVE' and su.liquidate=0 and 
   NOT EXISTS (SELECT 1  FROM hr_staffUnit sue  WHERE sue.mi_data_id=su.mi_data_id AND sue.staffOrderID = :staffOrderID: AND sue.mi_deleteDate>='9999-12-31') 
   AND su.mi_dateFrom <= :onDate: and su.mi_dateTo >= :onDate:) or (su.staffOrderID = :staffOrderID: and su.liquidate = 0 )))
  ORDER BY su.treePath ASC
  `, {
    orgID: params.orgID,
    onDate: params.onDate,
    staffOrderID: params.staffOrderID
  })
  const data = store.getAsJsObject()
  let orgIdx = -1
  let quantityLead = 0
  data.forEach((row, idx) => {
    quantityLead += (row.quantityLead || 0)
    if (row.mi_unityEntity === 'hr_organization') {
      orgIdx = idx
    }
    row.difference = row.quantity - (row.quantityLead || 0) - (row.childQuantity || 0)
    if (row.parentUnitID && row.parentUnitID !== params.orgID) {
      const parent = data.find(o => o.mi_data_id === row.parentUnitID)
      if (parent) {
        row.parentDescription = parent.description
      }
    }
  })
  if (orgIdx >= 0) {
    data[orgIdx].quantityLead = quantityLead
  }
  store.freeNative()
  return data
}

me.setPositionCount = function (ctx) {
  const mParams = ctx.mParams
  const orgStore = UB.DataStore('hr_organization')
  const depStore = UB.DataStore('hr_department')
  const posStore = UB.DataStore('hr_position')
  const data = JSON.parse(mParams.data)
  data.update.forEach(row => {
    if (row.mi_unityEntity !== 'hr_organization' && (row.quantity !== undefined || row.quantityLead !== undefined)) {
      const orgUnit = UB.Repository('hr_staffUnit')
        .attrs(['ID', 'state', 'mi_dateFrom', 'mi_dateTo', 'staffOrderID', 'mi_unityEntity', 'mi_treePath', 'mi_data_id'])
        .misc({ __mip_recordhistory_all: true })
        .selectById(row.ID)
      if (row.quantity !== undefined || (row.quantityLead !== undefined && orgUnit.mi_unityEntity === 'hr_department')) {
        if (orgUnit.staffOrderID !== mParams.staffOrderID) {
          entityBaseService.cloneInstance(orgUnit.mi_unityEntity, row.ID, Object.assign(Object.assign({
            mi_dateFrom: dateService.shiftDate(mParams.onDate),
            mi_dateTo: dateService.shiftDate(orgUnit.mi_dateTo),
            mi_data_id: orgUnit.mi_data_id,
            mi_treePath: orgUnit.mi_treePath,
            state: 'NEW',
            staffOrderID: mParams.staffOrderID,
            entryOrderID: null
          }, row.quantity !== undefined ? (orgUnit.mi_unityEntity === 'hr_organization' ? { limitEmpNum: row.quantity || 0 } : { quantity: row.quantity || 0 }) : {}),
          (row.quantityLead !== undefined && orgUnit.mi_unityEntity === 'hr_department') ? { quantityLead: row.quantityLead } : {}),
          true, { skipBefore: true })
        } else {
          (orgUnit.mi_unityEntity === 'hr_organization' ? orgStore : orgUnit.mi_unityEntity === 'hr_department' ? depStore : posStore)
            .run('update', {
              __skipOptimisticLock: true,
              execParams: Object.assign(Object.assign({ ID: row.ID },
                row.quantity !== undefined ? (orgUnit.mi_unityEntity === 'hr_organization' ? { limitEmpNum: row.quantity || 0 } : { quantity: row.quantity || 0 }) : {}),
              (row.quantityLead !== undefined && orgUnit.mi_unityEntity === 'hr_department') ? { quantityLead: row.quantityLead } : {})
            })
        }
      }
    }
  })
}

me.generateXLSX = function (ctx) {
  const mParams = ctx.mParams
  const viewData = positionCountData(mParams)
  const doc = new TpManager({
    document: {
      margin: {
        top: 10,
        right: 8,
        bottom: 8,
        left: 20
      },
      align: 'left',
      orientation: '2',
      bottomColontitle: {
        font: {
          name: 'TimesNewRoman',
          type: 'Normal',
          size: 10
        },
        height: 8
      }
    },
    docTable: {
      baseStyle: 'baseBlock',
      font: { size: 9, name: 'TimesNewRoman' },
      align: 'left',
      wordWrap: true,
      allowEmpty: true,
      columns: {
        verticalAlign: 'center',
        config: [{ width: 35 }, { width: 35 }, { width: 10 }, { width: 10 }, { width: 10 }, { width: 10 }, { width: 10 }]
      }
    }
  }, 'xlsx')

  let table = []
  table.push([
    { content: 'Назва' },
    { content: 'Підпорядкування' },
    { content: 'Гранична кількість' },
    { content: 'Керівництво' },
    { content: 'Сума підпорядкованих' },
    { content: 'Різниця' },
    { content: 'Фактична кількість' }

  ])
  viewData.forEach(row => {
    table.push([
      { content: row.description || '',
        style: Object.assign({ },
          (row.quantityFact !== null && (row.mi_unityEntity === 'hr_organization' || row.parentUnitID === row.orgID)) ? { font: { type: 'Bold' } } : {}) },
      { content: row.parentDescription || '',
        style: Object.assign({ },
          (row.quantityFact !== null && (row.mi_unityEntity === 'hr_organization' || row.parentUnitID === row.orgID)) ? { font: { type: 'Bold' } } : {}) },
      { content: row.quantity !== null ? Number(row.quantity || 0) : '',
        style: Object.assign({ align: 'right', format: '0' },
          (row.quantity !== null && (row.mi_unityEntity === 'hr_organization' || row.parentUnitID === row.orgID)) ? { font: { type: 'Bold' } } : {}) },
      { content: row.quantityLead !== null ? Number(row.quantityLead || 0) : '',
        style: Object.assign({ align: 'right', format: '0' },
          (row.quantityLead !== null && (row.mi_unityEntity === 'hr_organization' || row.parentUnitID === row.orgID)) ? { font: { type: 'Bold' } } : {}) },
      { content: row.childQuantity !== null ? Number(row.childQuantity || 0) : '',
        style: Object.assign({ align: 'right', format: '0' },
          (row.childQuantity !== null && (row.mi_unityEntity === 'hr_organization' || row.parentUnitID === row.orgID)) ? { font: { type: 'Bold' } } : {}) },
      { content: (row.difference !== null && row.childCount) ? Number(row.difference || 0) : '',
        style: { align: 'right',
          format: '0',
          font: Object.assign({ color: row.difference < 0 ? 'FF0000' : row.difference > 0 ? '008000' : '000000' },
            (row.difference !== null && (row.mi_unityEntity === 'hr_organization' || row.parentUnitID === row.orgID)) ? { type: 'Bold' } : {}) }
      },
      { content: Number(row.quantityFact || 0),
        style: Object.assign({ align: 'right', format: '0' },
          (row.quantityFact !== null && (row.mi_unityEntity === 'hr_organization' || row.parentUnitID === row.orgID)) ? { font: { type: 'Bold' } } : {}) }
    ])
  })
  doc.table(table, 'docTable')
  mParams.data = JSON.stringify(generateBase64Str(doc.getDocument()))
}

function reNumerateChild (parentUnitID, orgID, onDate, autoSetIdxNum) {
  const child = UB.Repository('hr_staffUnit')
    .attrs(['ID', 'mi_data_id', 'idxNum', 'code', 'mi_unityEntity'])
    .where('parentUnitID', '=', parentUnitID || null)
    .where('orgID', '=', orgID)
    .where('state', '=', 'ACTIVE')
    .where('mi_unityEntity', 'in', ['hr_department', 'hr_position'])
    .where('mi_dateFrom', '<=', onDate)
    .where('mi_dateTo', '>=', onDate)
    .misc({ __mip_ondate: onDate })
    .orderBy('idxNum')
    .selectAsObject()
  let idxNum = 10
  const posStore = UB.DataStore('hr_position')
  const depStore = UB.DataStore('hr_department')
  child.forEach(item => {
    if (autoSetIdxNum && item.mi_unityEntity === 'hr_department') idxNum = parseInt(item.code) || 1
    if (item.mi_unityEntity === 'hr_department') {
      depStore.run('update', {
        __skipOptimisticLock: true,
        execParams: {
          ID: item.ID,
          idxNum: idxNum
        }
      })
    }
    if (item.mi_unityEntity === 'hr_position') {
      posStore.run('update', {
        __skipOptimisticLock: true,
        execParams: {
          ID: item.ID,
          idxNum: idxNum
        }
      })
    }
    reNumerateChild(item.mi_data_id, orgID, onDate, autoSetIdxNum)
    idxNum += 10
  })
  posStore.freeNative()
  depStore.freeNative()
}

me.reNumerateStaffUnit = function (ctx) {
  const mParams = ctx.mParams
  const parentUnitID = mParams.parentUnitID
  if (!parentUnitID) return
  const orgUnit = UB.Repository(__entityName)
    .attrs(['orgID', 'mi_data_id'])
    .selectById(parentUnitID)
  if (!orgUnit) {
    throw new UB.UBAbort(`<<<${UB.i18n('Не знайдено організацію')}>>>`)
  }
  const orgID = orgUnit.orgID
  const onDate = mParams.onDate
  const sqlDialect = entityBaseService.getSQLDialect()
  const store = UB.DataStore(__entityName)
  const setting = UB.Repository('ac_settingsOrg')
    .attrs(['value'])
    .where('organizationID', '=', orgID)
    .where('[constantID.code]', '=', 'hrAutoSetDepIdxNum')
    .selectSingle()
  const autoSetIdxNum = (setting && setting.value === '1') || 0
  reNumerateChild(orgID, orgID, onDate, autoSetIdxNum)

  const sql = `
    
  WITH ${sqlDialect.dialect === 'MSSQL2012' ? '' : 'RECURSIVE'} tree (id, mi_data_id, parentUnitID, mi_unityEntity, mi_treePath, mi_treePathNew, treePath, treePathNew)
    AS (
        SELECT  
          id, 
          mi_data_id, 
          parentUnitID, 
          mi_unityEntity, 
          mi_treePath, 
          CAST(mi_treePath AS NATIONAL CHAR VARYING (1000)) AS "mi_treePathNew", 
          treePath AS "treePath",
          CAST(treePath AS NATIONAL CHAR VARYING (1000)) AS "treePathNew"
        FROM hr_staffUnit
        WHERE mi_data_id = :orgID:
            and orgID = :orgID:
            and mi_deleteDate >= '9999-12-31'
            and :onDate: between mi_dateFrom and mi_dateTo
            and state = 'ACTIVE'
      UNION ALL
        SELECT 
            t.id, 
            t.mi_data_id, 
            t.parentUnitID, 
            t.mi_unityEntity,
            t.mi_treePath, 
            CAST(CONCAT(tree.mi_treePathNew, t.mi_data_id, '/') AS NATIONAL CHAR VARYING (1000)) mi_treePathNew,
            t.treePath, 
            CAST(CONCAT(tree.treePathNew, RIGHT(CONCAT('000000', t.idxNum), 6), '/') AS NATIONAL CHAR VARYING (1000)) treePathNew
        FROM hr_staffUnit t
          INNER JOIN tree ON tree.mi_data_id = t.parentUnitID
          WHERE t.mi_deleteDate >= '9999-12-31'
              and :onDate: between mi_dateFrom and mi_dateTo
              and t.state = 'ACTIVE' and t.mi_unityEntity in ('hr_department', 'hr_position')
    ) 
    SELECT 
      id "ID", 
      mi_data_id "mi_data_id", 
      parentUnitID "parentUnitID", 
      mi_unityEntity "mi_unityEntity", 
      mi_treePath "mi_treePath", 
      mi_treePathNew "mi_treePathNew", 
      treePath "treePath", 
      treePathNew "treePathNew"
    FROM tree
  `
  store.runSQL(sql, {
    orgID: orgID,
    onDate: onDate
  })
  const treeData = store.getAsJsObject()

  treeData.forEach(item => {
    if (!item['treePath'] || item['treePath'] !== item['treePathNew']) {
      store.execSQL(`UPDATE hr_staffUnit SET treePath = :treePathNew: WHERE ID = :ID:`, {
        ID: item.ID,
        treePathNew: item['treePathNew']
      })
      if (item['mi_unityEntity'] === 'hr_position') {
        store.execSQL(`UPDATE hr_position SET treePath = :treePathNew: WHERE ID = :ID:`, {
          ID: item.ID,
          treePathNew: item['treePathNew']
        })
      }
      if (item['mi_unityEntity'] === 'hr_department') {
        store.execSQL(`UPDATE hr_department SET treePath = :treePathNew: WHERE ID = :ID:`, {
          ID: item.ID,
          treePathNew: item['treePathNew']
        })
      }
    }
  })
  store.freeNative()
}

me.getPositionInfo = function (ctx) {
  const mParams = ctx.mParams
  const onDate = dateService.shiftDate(mParams.onDate)
  let position = []
  let employeePosition = []
  const store = UB.DataStore('hr_position')
  if (mParams.IDList.length) {
    if (mParams.dictFundSourceID) {
      store.runSQL(`
        SELECT p.ID "ID", p.mi_data_id, p.positionType "positionType",
        (SELECT COALESCE(SUM(pfs.quantity), 0) FROM hr_positionFundSource pfs WHERE pfs.positionID = p.ID AND pfs.dictFundSourceID = :dictFundSourceID: AND pfs.mi_deleteDate >='9999-12-31') AS "quantity",
        (SELECT COALESCE(SUM(epfs.mtCount), 0) FROM hr_employeePosition ep
            INNER JOIN hr_empPosFundSource epfs ON epfs.employeePositionID = ep.ID
          WHERE ep.positionID = p.mi_data_id AND epfs.dictFundSourceID = :dictFundSourceID:
            AND ep.isActive = 1
            AND ep.dateFrom <= :onDate:
            AND ep.dateTo >= :onDate:
            AND ep.mi_deleteDate >= '9999-12-31'
            AND epfs.mi_deleteDate >= '9999-12-31'
            AND NOT EXISTS (SELECT 1 FROM hr_empLongTermAbsc absc
              WHERE absc.employeeNumberID = ep.employeeNumberID
                AND absc.dateFrom <= :onDate:
                AND absc.dateTo >= :onDate:
                AND absc.mi_deleteDate >= '9999-12-31')
          ) AS "mtCount",
          p.addDescrPosition "addDescrPosition"      
        FROM hr_position p
          WHERE p.ID${entityBaseService.getInExpression('IDList')}
          AND p.mi_deleteDate >= '9999-12-31'  
      `, {
        IDList: mParams.IDList,
        onDate: onDate,
        dictFundSourceID: mParams.dictFundSourceID
      })
      position = store.getAsJsObject()
      position.forEach(item => {
        item.vacancyRate = (item.quantity || 0) - (item.mtCount || 0)
      })
    } else {
      store.runSQL(`
        SELECT p.ID "ID", p.mi_data_id, p.positionType "positionType",
         (SELECT COALESCE(p.quantity, 0) - COALESCE(sum(ep.mtCount), 0) from hr_employeePosition ep where ep.positionID = p.mi_data_id and 
         ep.isActive = 1 and ep.dateFrom <= :onDate: and ep.dateTo >= :onDate: and ep.mi_deleteDate >= '9999-12-31' AND
          NOT EXISTS (SELECT 1  FROM hr_empLongTermAbsc absc WHERE absc.employeeNumberID=ep.employeeNumberID AND
           absc.dateFrom <= :onDate: AND absc.dateTo >= :onDate: AND absc.mi_deleteDate >= '9999-12-31')) "vacancyRate",
          p.addDescrPosition "addDescrPosition"
        FROM hr_position p
        WHERE p.ID${entityBaseService.getInExpression('IDList')}
          AND p.mi_deleteDate >= '9999-12-31'  
      `, {
        IDList: mParams.IDList,
        onDate: onDate
      })
      position = store.getAsJsObject()
    }
  }
  if (mParams.posListID.length) {
    if (mParams.longVacCodes && mParams.longVacCodes.length) {
      store.runSQL(`
  SELECT ep.ID "ID", ep.positionID "positionID",
   (SELECT max(absc.dateTo) FROM hr_empLongTermAbsc absc WHERE absc.employeeNumberID = ep.employeeNumberID AND
     absc.dateFrom <= :onDate: AND absc.dateTo >= :onDate: AND absc.mi_deleteDate >= '9999-12-31') "vacationDateTo",
   (SELECT max(absc.dateTo) FROM hr_empLongTermAbsc absc 
   WHERE absc.employeeNumberID = ep.employeeNumberID AND
     absc.dateFrom <= :onDate: AND absc.dateTo >= :onDate: AND absc.mi_deleteDate >= '9999-12-31'
     and ( exists (select orderDet.id from hr_empOrderVacationListDet orderDet
                   inner join hr_dictVacationKind kind on kind.id = orderDet.dictVacationKindID and kind.code ${entityBaseService.getInExpression('longVacCodes')}
                   where orderDet.orderID = absc.orderID and orderDet.employeeID = ep.employeeID)
         or exists (select orderDet.id from hr_empOrderVacationlongDet orderDet
                    inner join hr_dictVacationKind kind on kind.id = orderDet.dictVacationKindID and kind.code ${entityBaseService.getInExpression('longVacCodes')}
                    where orderDet.orderID = absc.orderID and orderDet.employeeID = ep.employeeID)
          )
     ) "vacationDateToChild"
  FROM hr_employeePosition ep
  WHERE ep.ID${entityBaseService.getInExpression('posListID')}
    AND ep.mi_deleteDate >= '9999-12-31'  
  `, {
        longVacCodes: mParams.longVacCodes,
        posListID: mParams.posListID,
        onDate: onDate
      })
    } else {
      store.runSQL(`
  SELECT ep.ID "ID", ep.positionID "positionID",
   (SELECT max(absc.dateTo) FROM hr_empLongTermAbsc absc WHERE absc.employeeNumberID = ep.employeeNumberID AND
     absc.dateFrom <= :onDate: AND absc.dateTo >= :onDate: AND absc.mi_deleteDate >= '9999-12-31') "vacationDateTo"
  FROM hr_employeePosition ep
  WHERE ep.ID${entityBaseService.getInExpression('posListID')}
    AND ep.mi_deleteDate >= '9999-12-31'  
  `, {
        posListID: mParams.posListID,
        onDate: onDate
      })
    }
    employeePosition = store.getAsJsObject()
  }

  mParams.resultData = JSON.stringify({ position, employeePosition })
  return { position, employeePosition }
}

me.getVacationEmpPos = function (ctx) {
  const mParams = ctx.mParams
  const onDate = dateService.shiftDate(mParams.onDate)
  const employeePositionID = mParams.employeePositionID
  const store = UB.DataStore('hr_employeePosition')
  store.runSQL(`
   SELECT ep.ID "ID", absc.dateFrom "dateFrom", absc.dateTo "dateTo"
   FROM hr_employeePosition ep
   JOIN hr_empLongTermAbsc absc on absc.employeeNumberID = ep.employeeNumberID AND
     absc.dateFrom <= :onDate: AND absc.dateTo >= :onDate: AND absc.mi_deleteDate >= '9999-12-31'
   WHERE ep.positionID = :positionID: AND ep.organizationID = :organizationID: AND ep.isActive =1 AND
   ep.dateFrom <= :onDate: AND ep.dateTo >= :onDate: AND ep.mi_deleteDate >= '9999-12-31'
   ${employeePositionID ? 'AND ep.ID <>:employeePositionID:' : ''}  
  `, {
    organizationID: mParams.organizationID,
    positionID: mParams.positionID,
    employeePositionID,
    onDate: onDate
  })
  const result = store.getAsJsObject()
  if (mParams.orderID && (mParams.empOrderType === 'MOVE' || mParams.empOrderType === 'MOVE_OUTSTAFF')) {
    store.runSQL(`
      SELECT det.employeePositionID "ID", absc.dateFrom "dateFrom", absc.dateTo "dateTo"
        FROM hr_empOrderMoveDet det
          JOIN hr_position pos ON pos.ID=det.positionID
          JOIN hr_empLongTermAbsc absc on absc.employeeNumberID = det.employeeNumberID AND
             absc.dateFrom <= :onDate: AND absc.dateTo >= :onDate: AND absc.mi_deleteDate >= '9999-12-31'
        WHERE det.orderID=:orderID: 
          AND pos.mi_data_id = :positionID:
          AND det.dateFrom <= :onDate: AND det.dateTo >= :onDate:
          AND det.mi_deleteDate >= '9999-12-31'
          ${employeePositionID ? 'AND det.employeePositionID <>:employeePositionID:' : ''}  
          
    `, {
      orderID: mParams.orderID,
      positionID: mParams.positionID,
      employeePositionID,
      onDate: onDate
    })
    const orderEmp = store.getAsJsObject()
    orderEmp.forEach(emp => {
      if (!result.find(o => o.ID === emp.ID)) {
        result.push(emp)
      }
    })
  }
  mParams.resultData = JSON.stringify(result)
}

me.getVacationRate = function (ctx) {
  const mParams = ctx.mParams
  const onDate = dateService.shiftDate(mParams.onDate)
  const store = UB.DataStore('hr_employeePosition')
  store.runSQL(`
  SELECT COALESCE(p.quantity, 0) - 
  ( select COALESCE(sum(ep.mtCount), 0) 
    from hr_employeePosition ep where ep.positionID = p.mi_data_id and ep.isActive = 1 and ep.dateFrom <= :onDate: and
      ep.dateTo >= :onDate: and ep.mi_deleteDate >= '9999-12-31' 
      AND NOT EXISTS (SELECT 1  FROM hr_empLongTermAbsc absc WHERE absc.employeeNumberID=ep.employeeNumberID AND
       absc.dateFrom <= :onDate: AND absc.dateTo >= :onDate: AND absc.mi_deleteDate >= '9999-12-31'
  )) - (
    SELECT COALESCE(sum(det.mtCount), 0) 
      FROM ${mParams.orderEntity} det
      WHERE det.positionID = :positionID: AND det.orderID = :orderID: AND ID <> :orderItemID: and det.mi_deleteDate >= '9999-12-31'
  ) - (
    SELECT COALESCE(sum(det.mtCount), 0) 
      FROM ${mParams.orderEntity} det INNER JOIN hr_empOrder ord ON det.orderID = ord.ID 
      WHERE det.positionID = :positionID: AND det.orderID <> :orderID: AND det.ID <> :orderItemID: and det.dateFrom > :onDate:
       and ord.orderState in ('POSTED', 'PROCESSED') and det.empOrderType in ('APPOINT', 'APPOINT_LIQ', 'APPOINT_MOVE', 'MOVE', 'PLURALIST')
       and det.mi_deleteDate >= '9999-12-31' and ord.mi_deleteDate >= '9999-12-31'
  ) quantity
  FROM hr_position p where p.ID = :positionID:
  `, {
    positionID: mParams.positionID,
    onDate: onDate,
    orderID: mParams.orderID,
    orderItemID: mParams.orderItemID
  })
  const vacancyRate = store.getAsJsObject()
  mParams.vacancyRate = (vacancyRate && vacancyRate.length) ? (vacancyRate[0].quantity || 0) : 0
}

function getStaffData ({ orgStruct, posData, empPosData, parentID, tempVacPosData, onDate, includeChildCount, level = 1 }) {
  const result = {
    parentID: parentID,
    level: level,
    posCount: 0,
    empPosCount: 0,
    vacCount: 0,
    data: []
  }
  const curStruct = orgStruct.filter(el => el.parentUnitID === parentID)
  curStruct.forEach(orgItem => {
    let isDept = orgItem.mi_unityEntity === 'hr_department'
    let obj1 = {
      mi_data_id: orgItem.mi_data_id,
      parentID: parentID,
      name: orgItem.name,
      isDepartment: isDept,
      isPosition: false,
      level: level,
      staffCatID: null,
      staffCatCode: null,
      staffCatName: null,
      posCount: 0,
      empPosCount: 0,
      vacCount: 0,
      quantity: 0,
      catData: {}
    }
    result.data.push(obj1)
    if (!isDept) {
      const posItem = posData.find(itm => itm.ID === orgItem.ID)
      if (posItem) {
        obj1.isPosition = true
        obj1.staffCatID = posItem.dictStaffCatID
        obj1.staffCatCode = posItem['dictStaffCatID.code']
        obj1.staffCatName = posItem['dictStaffCatID.name']
        let posQnt = posItem.quantity || 0
        obj1.posCount = posQnt
        const empPos = empPosData.filter(item => item.positionID === posItem.mi_data_id)
        if (empPos.length === 0) {
          // вакансія
          obj1.vacCount = posQnt
          obj1.quantity = posQnt
        } else {
          let empQntSum = 0
          for (let i = 0; i < empPos.length; i++) {
            let empPosItem = empPos[i]
            let tempVacPosItem = tempVacPosData && tempVacPosData.find(itm => itm.ID === empPosItem.ID)
            let vacDateTo = tempVacPosItem && tempVacPosItem.vacationDateTo && new Date(tempVacPosItem.vacationDateTo)
            let isTempVac = vacDateTo && vacDateTo > onDate
            let empQnt = (!isTempVac && empPosItem.mtCount) || 0
            empQntSum += empPosItem.mtCount || 0
            obj1.empPosCount += empQnt
          }
          if (posQnt > empQntSum) {
            // існують вакантні ставки
            obj1.vacCount = posQnt - empQntSum
          }
          obj1.quantity = obj1.empPosCount + obj1.vacCount
        }
      }
    } else {
      const subTree = getStaffData({ orgStruct, posData, empPosData, parentID: obj1.mi_data_id, tempVacPosData, onDate, includeChildCount, level: level + 1 })
      let hasPos = !!subTree.data.find(itm => itm.isPosition === true && (itm.quantity > 0))
      obj1.hasPos = hasPos
      if (hasPos) {
        result.data.push(...subTree.data)
        subTree.data.forEach(childItem => {
          if (childItem.isPosition && (includeChildCount || childItem.parentID === obj1.mi_data_id)) {
            obj1.posCount += childItem.posCount
            obj1.empPosCount += childItem.empPosCount
            obj1.vacCount += childItem.vacCount
            obj1.quantity += childItem.quantity
            if (childItem.staffCatID) {
              let catItem = obj1.catData[childItem.staffCatID]
              if (!catItem) {
                catItem = {
                  ID: childItem.staffCatID,
                  code: childItem.staffCatCode,
                  name: childItem.staffCatName,
                  posCount: childItem.posCount,
                  empPosCount: childItem.empPosCount,
                  vacCount: childItem.vacCount,
                  quantity: childItem.quantity
                }
                obj1.catData[childItem.staffCatID] = catItem
              } else {
                catItem.posCount += childItem.posCount
                catItem.empPosCount += childItem.empPosCount
                catItem.vacCount += childItem.vacCount
                catItem.quantity += childItem.quantity
              }
            }
          }
        })
      }
    }
  })
  return result
}

/* Отримати масив кількості посад по категоріям персоналу
 * Виклик з клієнта: $App.connection.run({
 *  entity: 'hr_staffUnit',
 *  method: 'getStaffCount',
 *  orgID: 3000001212564,
 *  onDate: new Date(),
 *  noVac: false,
 *  includeChildCount: true
 * }).then(mParams => {
 *   let data = JSON.parse(mParams.result)
 * })
 * @param {object} ctx
 * @param {number} ctx.mParams.orgID організація
 * @param {Date} ctx.mParams.onDate на дату
 * @param {Boolean} ctx.mParams.noVac без вакансій
 * @param {Boolean} ctx.mParams.includeChildCount включати кількість підлеглих підрозділів
 * @return {Array} масив об'єктів { deptID, deptName, catID, catName, quantity }
*/
me.getStaffCount = function (ctx) {
  const mParams = ctx.mParams
  const orgID = mParams.orgID
  const onDate = dateService.shiftDate(mParams.onDate) || dateService.currentDate()
  const noVac = mParams.noVac
  const includeChildCount = mParams.includeChildCount

  const orgStruct = UB.Repository('hr_staffUnit')
    .attrs(['ID', 'mi_data_id', 'parentUnitID', 'idxNum', 'name', 'mi_unityEntity', 'mi_treePath'])
    .where('orgID', '=', orgID)
    .where('liquidate', '=', 0)
    .where('state', '=', 'ACTIVE')
    .where('mi_dateFrom', '<=', onDate)
    .where('mi_dateTo', '>=', onDate)
    .orderBy('idxNum')
    .selectAsObject()
  const posData = UB.Repository('hr_position')
    .attrs(['ID', 'mi_data_id', 'parentUnitID', 'idxNum', 'dictPositionID.fullName', 'dictPositionID.name', 'quantity',
      'dictStaffCatID', 'dictStaffCatID.code', 'dictStaffCatID.name'])
    .where('orgID', '=', orgID)
    .where('liquidate', '=', 0)
    .where('state', '=', 'ACTIVE')
    .misc({ __mip_ondate: onDate })
    .selectAsObject()
  const empPosData = UB.Repository('hr_employeePositionS')
    .attrs(['ID', 'employeeNumberID', 'employeeID', 'employeeID.fullFIO', 'positionID', 'mtCount'])
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
    .selectAsObject()
  const empPosInfoCtx = {
    mParams: {
      IDList: [],
      posListID: empPosData.map(itm => itm.ID),
      onDate: onDate
    }
  }
  global.hr_staffUnit.getPositionInfo(empPosInfoCtx)
  const empPosInfo = JSON.parse(empPosInfoCtx.mParams.resultData)
  const tempVacPosData = empPosInfo && empPosInfo.employeePosition

  const orgTree = getStaffData({ orgStruct, posData, empPosData, tempVacPosData, parentID: orgID, onDate, includeChildCount })
  const res = []
  orgTree.data.filter(itm => itm.isDepartment).forEach(orgItem => {
    Object.keys(orgItem.catData).forEach(key => {
      let catItem = orgItem.catData[key]
      res.push({
        deptID: orgItem.mi_data_id,
        deptName: orgItem.name,
        catID: catItem.ID,
        catCode: catItem.code,
        catName: catItem.name,
        quantity: noVac ? catItem.empPosCount : catItem.quantity
      })
    })
  })

  mParams.result = JSON.stringify(res)
}

/* Перевірити, чи є право на організацію по даній посаді / підрозділу / організації
 * @param {object} ctx
 * @param {number} ctx.mParams.mi_data_id посада / підрозділ / організація
 * @param {number} ctx.mParams.orgID поточна організація
 * @param {Date} ctx.mParams.onDate на дату
 * @param {String} ctx.mParams.entityName сутність
 * @return {Boolean} ctx.mParams.result: true - є право, false - немає */
me.checkUnitRight = function (ctx) {
  const mParams = ctx.mParams
  let isAdmin = entityBaseService.userIsMemberOf({ roleNames: ['admin', 'acc_admSecurity', 'acc_admData'] })
  if (isAdmin) {
    mParams.result = true
    return
  }
  const onDate = dateService.shiftDate(mParams.onDate) || dateService.currentDate()
  let miDataID = mParams.mi_data_id || 0
  if (mParams.entityName === 'hr_organization' && miDataID === -1 && mParams.orgID) {
    // поточна організація
    miDataID = mParams.orgID
  }
  const orgStruct = UB.Repository('hr_staffUnit')
    .attrs(['orgID'])
    .where('mi_data_id', '=', miDataID)
    .where('mi_dateFrom', '<=', onDate)
    .where('mi_dateTo', '>=', onDate)
    .where('orgID', 'in', global.ac_userOrganization.getUserOrgIDsArray())
    .selectAsObject()
  mParams.result = (orgStruct.length > 0)
}

me.createEmployeeOrder = function (ctx) {
  const mParams = ctx.mParams
  const orderNumber = UB.i18n('(проєкт)')
  const orderDate = ctx.mParams.onDate
  const orderClass = UB.Repository('hr_orderClass')
    .attrs('ID')
    .where('entityName', '=', 'hr_empOrder')
    .selectScalar()

  const empOrderStore = UB.DataStore('hr_empOrder')
  const orderID = empOrderStore.generateID()
  empOrderStore.run('insert', {
    execParams: {
      ID: orderID,
      orderNumber: orderNumber,
      orderDate: orderDate,
      entryDate: orderDate,
      organizationID: mParams.organizationID,
      empOrderType: mParams.empOrderType,
      orderClass: orderClass,
      periodID: periodService.getCurrentPeriod(ctx.mParams.organizationID).ID,
      reportSettings: '{"margin":{"top":13.5,"right":-2,"bottom":13.5,"left":2}}'
    }
  })
  empOrderStore.freeNative()

  /*
  let empOrderDetStore
  if (mParams.empOrderType === 'APPOINT') {
    empOrderDetStore = UB.DataStore('hr_empOrderAppointDet')
    const orderDetID = empOrderDetStore.generateID()
    empOrderDetStore.run('insert', {
      execParams: {
        ID: orderDetID,
        orderID: orderID,
        itemIdx: 1,
        empOrderType: 'ADDSALARYGOV',
        organizationID: ctx.mParams.organizationID,
        dateFrom: orderDate,
        payElID: ctx.mParams.payElID,
        isGroup: true
      }
    })
    empOrderDetStore.freeNative()
  }

  const empOrderChgSalEmpDet = UB.DataStore('hr_empOrderChgSalEmpDet')
  empData.forEach(item => {
    const empOrderID = empOrderChgSalEmpDet.generateID()
    empOrderChgSalEmpDet.run('insert', {
      execParams: {
        ID: empOrderID,
        paraID: orderDetID,
        orderID: orderID,
        itemIdx: 1,
        organizationID: ctx.mParams.organizationID,
        employeePositionID: item.employeePositionID,
        employeeNumberID: item.employeeNumberID,
        employeeID: item.employeeID,
        firstName: item.firstName,
        lastName: item.lastName,
        middleName: item.middleName,
        departmentID: item.departmentID,

        payElID: ctx.mParams.payElID,
        empOrderType: 'ADDSALARYGOV',

        positionID: item.positionID,

        dateFrom: dateService.shiftDate(item.setDate) || orderDate,
        dateTo: dateService.maxDate(),
        stageYear: item.stageYear,
        accrualRate: item.rate
      }
    })
  })
  empOrderChgSalEmpDet.freeNative()
  */
  ctx.mParams.orderID = orderID
  return true
}

me.getTreeStructure = function (ctx) {
  const mParams = ctx.mParams
  const store = UB.DataStore('hr_staffUnit')
  const sqlDialect = entityBaseService.getSQLDialect()
  store.runSQL(`SELECT u.mi_data_id as "mi_data_id", u.parentUnitID as "parentUnitID", 
      u.fullName as "fullName", u.name as "name",  u.mi_treePath as "mi_treePath", u.treePath as "treePath",
      ${mParams.needGenName ? 'dep.nameGen as "nameGen",' : ''}  
      u.mi_unityEntity as "mi_unityEntity", dep.description as "description"
    FROM hr_staffUnit u 
      ${mParams.onlyDepartment ? '' : ' LEFT '} JOIN hr_department dep ON dep.ID = u.ID      
    WHERE
      u.orgID = :organizationID:
      and u.mi_deleteDate >= '9999-12-31' 
      and u.state = 'ACTIVE' 
      and u.ID = (select ${sqlDialect.top} u2.ID from hr_staffUnit u2 where u2.orgID = :organizationID: 
      and u2.mi_data_id = u.mi_data_id 
      and u2.mi_deleteDate >= '9999-12-31' 
      and u2.state = 'ACTIVE' 
      and u2.mi_dateFrom <= :onDate:
      order by u2.mi_dateFrom desc ${sqlDialect.limit})    
    ORDER BY u.treePath   
  `, {
    organizationID: mParams.organizationID,
    onDate: mParams.onDate || new Date()
  })

  const data = store.getAsJsObject()
  store.freeNative()
  ctx.mParams.resultData = JSON.stringify(data)
}
