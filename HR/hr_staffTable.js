const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const TpManager = require('../AC/modules/documentBuilder/tpManager')
const orderService = require('../HR/modules/orderService')
const dateService = require('../AC/modules/dataServices/dateService')
const messageService = require('../HR/modules/messageService')
const { generateBase64Str } = require('../AC/modules/dataServices/filesService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')

me.on('insert:before', beforeInsert)
me.on('insert:after', afterInsert)
me.on('update:before', beforeUpdate)
me.on('delete:before', orderService.beforeDeleteOrder)
me.on('update:after', afterUpdate)
me.on('select:after', afterSelect)

me.entity.addMethod('doPosting')
me.entity.addMethod('doCancelPosting')
me.entity.addMethod('doCheckStaffList')
me.entity.addMethod('canCreateOrder')
me.entity.addMethod('generateXLSX')
me.entity.addMethod('checkQuantity')
me.entity.addMethod('applyOrgStructure')
me.entity.addMethod('getStaffTableMoveEmployees')

me.entity.addMethod('fixEntryOrderState')

me.entity.addMethod('sendNotificationMsg')

me.details = [
  {
    detailName: 'staffTableAccrual',
    entityName: 'hr_staffTableAccrual',
    docIDName: 'staffTableID',
    fieldList: orderService.setFieldListAttribute([
      'positionType', 'dictPositionID.name', 'dictTarifCoeffID.description', 'dictStatePayID.description', 'quantity',
      'previousAccrualSum', 'accrualSum', 'staffTableAccrualID', 'positionID.fullName', 'employeePositionID.employeeID.fullFIO'
    ], ['lineNum']),
    orderBy: ['positionType.name', 'dictPositionID.name']
  }
]

function beforeInsert (ctx) {
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  const execParams = ctx.mParams.execParams
  execParams.entryDate = execParams.orderDate
  orderService.setDefaultAttribute(me.entity.name, execParams, instanceData)
}

function afterInsert (ctx) {
  const execParams = ctx.mParams.execParams
  if (['ACCRUAL', 'ACCRUAL_CHANGES'].includes(execParams.docType)) {
    const staffTableAccruals = []
    const staffTablePosAccruals = []
    const store = UB.DataStore('hr_staffTableAccrual')
    let ID
    UB.Repository('hr_position')
      .attrs(['ID', 'mi_data_id', 'positionType', 'dictPositionID', 'quantity',
        'accrualSum', 'dictTarifCoeffID', 'dictStatePayID'
      ])
      .where('orgID', '=', execParams.orgID)
      .where('state', '=', 'ACTIVE')
      .whereIf(execParams.dictFundSourceID, 'dictFundSourceID', '=', execParams.dictFundSourceID)
      .whereIf(execParams.departmentID, 'mi_treePath', 'like', `%/${execParams.departmentID}/%`)
      .misc({ __mip_ondate: dateService.shiftDate(execParams.orderDate) })
      .orderBy('dictPositionID.name')
      .selectAsObject({
        'accrualSum': 'previousAccrualSum'
      }).forEach(row => {
        let accrual = staffTableAccruals.find(o => o.positionType === row.positionType &&
         o.dictPositionID === row.dictPositionID && o.previousAccrualSum === row.previousAccrualSum &&
          o.dictTarifCoeffID === row.dictTarifCoeffID && o.dictStatePayID === row.dictStatePayID)
        if (accrual) {
          accrual.quantity += (row.quantity || 1)
          ID = accrual.ID
        } else {
          ID = store.generateID()
          accrual = {
            ID,
            staffTableID: execParams.ID,
            positionType: row.positionType,
            dictPositionID: row.dictPositionID,
            quantity: row.quantity,
            dictTarifCoeffID: row.dictTarifCoeffID,
            dictStatePayID: row.dictStatePayID,
            previousAccrualSum: row.previousAccrualSum
          }
          staffTableAccruals.push(accrual)
        }

        const employeePositions = UB.Repository('hr_employeePositionS')
          .attrs(['ID'])
          .where('organizationID', '=', execParams.orgID)
          .where('positionID', '=', row.mi_data_id)
          .where('dateFrom', '<=', dateService.shiftDate(execParams.orderDate))
          .where('dateTo', '>=', dateService.shiftDate(execParams.orderDate))
          .misc({ __skipRls: true })
          .selectSingle()

        staffTablePosAccruals.push({
          staffTableAccrualID: ID,
          staffTableID: execParams.ID,
          positionType: row.positionType,
          dictPositionID: row.dictPositionID,
          quantity: row.quantity,
          dictTarifCoeffID: row.dictTarifCoeffID,
          dictStatePayID: row.dictStatePayID,
          previousAccrualSum: row.previousAccrualSum,
          positionID: row.ID,
          employeePositionID: employeePositions ? employeePositions.ID : null
        })
      })

    staffTableAccruals.forEach(row => {
      store.run('insert', {
        execParams: row
      })
    })
    staffTablePosAccruals.forEach(row => {
      store.run('insert', {
        execParams: row
      })
    })
  }
  ctx.mParams.detail = orderService.getEntityDetail(execParams.ID, me.details)
}

function beforeUpdate (ctx) {
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  const execParams = ctx.mParams.execParams
  if (execParams.orderDate) {
    execParams.entryDate = execParams.orderDate
  }
  orderService.setDefaultAttribute(me.entity.name, execParams, instanceData)
  orderService.checkOrderUpdate(ctx)
  orderService.saveDetails(ctx, me.details)
  if (execParams.entryOrderID && execParams.orderState !== 'PROJECT') {
    const entryOrder = UB.Repository('hr_order')
      .attrs('orderNumber', 'orderDate')
      .selectById(execParams.entryOrderID)
    const description = execParams.description || entityBaseService.getCompositeAttributeValue(ctx, 'description')
    execParams.description = `${description} (${UB.i18n('Наказ №{0} від {1}', entryOrder.orderNumber, dateService.formatDate(entryOrder.orderDate))})`
  }
}

function afterUpdate (ctx) {
  const execParams = ctx.mParams.execParams
  ctx.mParams.detail = orderService.getEntityDetail(execParams.ID, me.details)
  if (execParams.orderState === 'POSTED') {
    me.doPosting(ctx)
  } else if (execParams.orderState === 'PROJECT') {
    me.doCancelPosting(ctx)
  }
}

function afterSelect (ctx) {
  const mParams = ctx.mParams
  if (mParams.ID && !mParams.execParams) {
    mParams.detail = orderService.getEntityDetail(mParams.ID, me.details)
  }
}

me.doPosting = function (ctx) {
  const params = ctx.mParams
  let employees = orderService.doPostingStaffOrder(ctx)
  const store = UB.DataStore('hr_employeeOrder')

  employees.forEach(row => {
    store.run('insert', {
      execParams: {
        orderID: params.execParams.ID,
        employeeID: row.employeeID || null,
        employeeNumberID: row.employeeNumberID || null,
        mi_unityEntity: 'hr_empOrderChgsalaryDet'
      }
    })
  })
}

me.doCancelPosting = function (ctx) {
  const params = ctx.mParams
  orderService.doCancelPostingStaffOrder(ctx)
  const store = UB.DataStore('hr_employeeOrder')

  let employeeOrder = UB.Repository('hr_employeeOrder')
    .attrs('ID')
    .where('orderID', '=', params.execParams.ID)
    .selectAsArrayOfValues()

  employeeOrder.forEach(employeeOrderID => {
    store.run('delete', {
      execParams: {
        ID: employeeOrderID
      }
    })
  })
}

me.canCreateOrder = function () {
}

me.generateXLSX = function (ctx) {
  const mParams = ctx.mParams
  const viewData = JSON.parse(mParams.viewData)
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
        config: [{ width: 20 }, { width: 35 }, { width: 35 }, { width: 35 }, { width: 25 }, { width: 10 }, { width: 15 }, { width: 15 }]
      }
    }
  }, 'xlsx')

  let table = []
  table.push([
    { content: UB.i18n('Тип посади') },
    { content: UB.i18n('Назва посади') },
    { content: UB.i18n('Повна назва посади') },
    { content: UB.i18n('ПІБ') },
    { content: UB.i18n('Тарифна група') },
    { content: UB.i18n('Кількість посад') },
    { content: UB.i18n('Оклад') },
    { content: UB.i18n('Новий оклад') },
    { content: UB.i18n('Джерело фінансування') }
  ])
  viewData.forEach(row => {
    table.push([
      { content: row.positionType || '' },
      { content: row.posName || '' },
      { content: row.fullName || '' },
      { content: row.fullFIO || '' },
      { content: row.statePay || '' },
      { content: row.quantity, style: { format: '@' } },
      { content: row.previousAccrualSum, style: { format: '@' } },
      { content: row.accrualSum, style: { format: '@' } },
      { content: row.dictFundSource || '' }
    ])
  })
  doc.table(table, 'docTable')
  mParams.data = JSON.stringify(generateBase64Str(doc.getDocument()))
}

/**
 * Перевірка розбіжності кількості посад
 * @param {object} ctx
 * @param {number} ctx.mParams.staffTableID плановий штатний розпис
 * @param {number} ctx.mParams.orgID організація
 * @param {date} ctx.mParams.onDate на дату
 */
me.checkQuantity = function (ctx) {
  const mParams = ctx.mParams
  const staffTableID = mParams.staffTableID
  const orgID = mParams.orgID
  const onDate = dateService.shiftDate(mParams.onDate)
  const orgData = UB.Repository('hr_organization')
    .attrs(['limitEmpNum'])
    .where('mi_data_id', '=', orgID)
    .where('mi_dateFrom', '<=', onDate)
    .where('mi_dateTo', '>=', onDate)
    .where('state', '=', 'ACTIVE')
    .selectSingle()
  const limitEmpNum = (orgData && orgData.limitEmpNum) || 0
  if (limitEmpNum === 0) {
    mParams.msg = UB.i18n('Для поточної організації не заповнено поле "Всього працівників"')
    return
  }
  const orgPos = UB.Repository('hr_position')
    .attrs(['SUM([quantity])'])
    .where('liquidate', '=', 0)
    .where('mi_dateFrom', '<=', onDate, 'dateFrom')
    .where('mi_dateTo', '>=', onDate, 'dateTo')
    .where('state', '=', 'ACTIVE', 'active')
    .where('orgID', '=', orgID)
    .where('staffOrderID', '=', staffTableID, 'order')
    .notExists(UB.Repository('hr_staffUnit')
      .correlation('mi_data_id', 'mi_data_id')
      .where('staffOrderID', '=', staffTableID)
      .where('mi_deleteDate', '>=', '#maxdate'),
    'notExist')
    .logic('(([active] and [notExist] and [dateFrom] and [dateTo]) or ([order]))')
    .selectAsObject({
      'SUM([quantity])': 'quantity'
    })
  let msgBuilder = []
  const orgPosQuantity = (orgPos.length && orgPos[0].quantity) || 0
  if (orgPosQuantity < limitEmpNum) {
    msgBuilder.push(UB.i18n(`Загальна кількість посад {0} менша встановленої кількості посад для організації {1}.`, orgPosQuantity, limitEmpNum))
  } else if (orgPosQuantity > limitEmpNum) {
    msgBuilder.push(UB.i18n(`Загальна кількість посад {0} перевищує встановлену кількість посад для організації {1}.`, orgPosQuantity, limitEmpNum))
  } else {
    msgBuilder.push(UB.i18n(`Загальна кількість посад {0} відповідає встановленій кількості посад для організації.`, orgPosQuantity))
  }
  const structDepData = UB.Repository('hr_department')
    .attrs(['mi_data_id', 'name'])
    .where('liquidate', '=', 0)
    .where('mi_dateFrom', '<=', onDate, 'dateFrom')
    .where('mi_dateTo', '>=', onDate, 'dateTo')
    .where('state', '=', 'ACTIVE', 'active')
    .where('orgID', '=', orgID)
    .where('staffOrderID', '=', staffTableID, 'order')
    .notExists(UB.Repository('hr_staffUnit')
      .correlation('mi_data_id', 'mi_data_id')
      .where('staffOrderID', '=', staffTableID)
      .where('mi_deleteDate', '>=', '#maxdate'),
    'notExist')
    .where('parentUnitID.mi_unityEntity', '=', 'hr_organization')
    .where('parentUnitID.mi_dateFrom', '<=', onDate)
    .where('parentUnitID.mi_dateTo', '>=', onDate)
    .where('parentUnitID.state', '=', 'ACTIVE')
    .logic('(([active] and [notExist] and [dateFrom] and [dateTo]) or ([order]))')
    .selectAsObject()
  const depData = UB.Repository('hr_department')
    .attrs(['mi_data_id', 'quantity'])
    .where('liquidate', '=', 0)
    .where('mi_dateFrom', '<=', onDate, 'dateFrom')
    .where('mi_dateTo', '>=', onDate, 'dateTo')
    .where('state', '=', 'ACTIVE', 'active')
    .where('orgID', '=', orgID)
    .where('staffOrderID', '=', staffTableID, 'order')
    .notExists(UB.Repository('hr_staffUnit')
      .correlation('mi_data_id', 'mi_data_id')
      .where('staffOrderID', '=', staffTableID)
      .where('mi_deleteDate', '>=', '#maxdate'),
    'notExist')
    .logic('(([active] and [notExist] and [dateFrom] and [dateTo]) or ([order]))')
    .selectAsObject()
  const depPos = UB.Repository('hr_position')
    .attrs(['mi_treePath', 'quantity'])
    .where('liquidate', '=', 0)
    .where('mi_dateFrom', '<=', onDate, 'dateFrom')
    .where('mi_dateTo', '>=', onDate, 'dateTo')
    .where('state', '=', 'ACTIVE', 'active')
    .where('orgID', '=', orgID)
    .where('staffOrderID', '=', staffTableID, 'order')
    .notExists(UB.Repository('hr_staffUnit')
      .correlation('mi_data_id', 'mi_data_id')
      .where('staffOrderID', '=', staffTableID)
      .where('mi_deleteDate', '>=', '#maxdate'),
    'notExist')
    .logic('(([active] and [notExist] and [dateFrom] and [dateTo]) or ([order]))')
    .selectAsObject()
  let depMsgBuilder = []
  structDepData.forEach(structDep => {
    let depItem = depData.find(itm => itm.mi_data_id === structDep.mi_data_id)
    let depPosItems = depPos.filter(itm => itm.mi_treePath.includes(structDep.mi_data_id.toString()))
    if (depItem) {
      let depQuantity = depItem.quantity || 0
      let depPosQuantity = depPosItems.reduce((qnt, depPosItem) => qnt + (depPosItem.quantity || 0), 0)
      if (depQuantity !== depPosQuantity) {
        depMsgBuilder.push(`- ${structDep.name} - ${depPosQuantity}/${depQuantity}`)
      }
    }
  })
  if (depMsgBuilder.length) {
    depMsgBuilder.unshift(`У наступних структурних підрозділів виявлено розбіжність кількості посад:`)
    msgBuilder = msgBuilder.concat(depMsgBuilder)
  }

  if (msgBuilder.length) {
    mParams.msg = msgBuilder.join('<br>')
  }
}

/**
 * Застосування структури організації до переліку змін
 * @param {object} ctx
 * @param {number} ctx.mParams.staffTableID плановий штатний розпис
 * @param {number} ctx.mParams.orgStructureID структура
 */
me.applyOrgStructure = function (ctx) {
  const mParams = ctx.mParams
  const staffTable = UB.Repository('hr_staffTable').attrs(['ID', 'orderDate', 'orgID']).selectById(mParams.staffTableID)
  const staffTableStore = UB.DataStore('hr_staffTable')
  const orgStore = UB.DataStore('hr_organization')
  const depStore = UB.DataStore('hr_department')
  const posStore = UB.DataStore('hr_position')

  const orgStructureBuilder = UB.Repository('hr_staffUnit')
    .attrs(['ID', 'mi_unityEntity', 'mi_dateFrom', 'mi_dateTo', 'mi_data_id', 'mi_treePath', 'name',
      'parentUnitID', 'isSecondaryChanges', 'liquidate'])
    .where('staffOrderID', '=', mParams.orgStructureID)
    .where('mi_unityEntity', '!=', 'hr_organization')
    .misc({ __mip_recordhistory_all: true })
    .orderBy('mi_treePath')
    .selectAsObject()
  const staffTableBuilder = UB.Repository('hr_staffUnit')
    .attrs(['ID', 'mi_unityEntity'])
    .where('staffOrderID', '=', mParams.staffTableID)
    .misc({ __mip_recordhistory_all: true })
    .orderByDesc('mi_treePath')
    .selectAsObject()
  const entryDate = dateService.shiftDate(staffTable.orderDate)

  staffTableBuilder.forEach(row => {
    (row.mi_unityEntity === 'hr_organization' ? orgStore : row.mi_unityEntity === 'hr_department' ? depStore : posStore).run('delete', {
      execParams: {
        ID: row.ID
      }
    })
  })
  const orgID = staffTable.orgID
  const parentUnit = {}
  orgStructureBuilder.forEach(row => {
    if (row.mi_unityEntity === 'hr_position' && row.parentUnitID !== orgID) {
      console.debug(`skip hr_position ${row.mi_data_id} ${row.name} staffTable`)
    } else {
      const ID = (row.mi_unityEntity === 'hr_organization' ? orgStore : row.mi_unityEntity === 'hr_department' ? depStore : posStore).generateID()
      const miDataID = (row.ID === row.mi_data_id ? ID : row.mi_data_id)
      if (row.ID === row.mi_data_id) {
        parentUnit[row.mi_data_id] = miDataID
      }
      let parentUnitID = row.parentUnitID
      if (parentUnitID && parentUnit[parentUnitID]) {
        parentUnitID = parentUnit[parentUnitID]
      }
      let orgUnit = UB.Repository(row.mi_unityEntity)
        .attrs(['ID', 'priorID'])
        .where('staffOrderID', '=', mParams.staffTableID)
        .where('mi_data_id', '=', row.mi_data_id)
        .where('state', '=', 'NEW')
        .misc({ __mip_recordhistory_all: true })
        .selectSingle()
      if (orgUnit) {
        entityBaseService.updateInstanceFromSource(row.mi_unityEntity, orgUnit.ID, row.ID, {
          priorID: orgUnit.priorID,
          mi_dateFrom: entryDate,
          mi_dateTo: dateService.shiftDate(row.mi_dateTo),
          mi_data_id: miDataID,
          mi_treePath: null,
          treePath: null,
          parentUnitID,
          state: 'NEW',
          staffOrderID: mParams.staffTableID,
          entryOrderID: null,
          linkToSourceID: row.ID
        }, true)
        /* (row.mi_unityEntity === 'hr_organization' ? orgStore : row.mi_unityEntity === 'hr_department' ? depStore : posStore).run('delete', {
          execParams: {
            ID: orgUnit.ID
          }
        }) */
      } else {
        if (dateService.shiftDate(row.mi_dateTo) > entryDate) {
          console.debug(`cloneInstance ${row.mi_data_id} staffTable`)
          const orgUnitNow = UB.Repository(row.mi_unityEntity)
            .attrs(['ID'])
            .where('mi_data_id', '=', miDataID)
            .where('state', '=', 'ACTIVE')
            .where('mi_dateFrom', '<=', entryDate)
            .where('mi_dateTo', '>=', entryDate)
            .misc({ __mip_recordhistory_all: true })
            .selectSingle() || {}
          entityBaseService.cloneInstance(row.mi_unityEntity, row.ID, {
            ID,
            priorID: orgUnitNow.ID || row.priorID,
            mi_dateFrom: entryDate,
            mi_dateTo: dateService.shiftDate(row.mi_dateTo),
            mi_data_id: miDataID,
            mi_treePath: null,
            treePath: null,
            parentUnitID,
            state: 'NEW',
            staffOrderID: mParams.staffTableID,
            entryOrderID: null,
            linkToSourceID: row.ID
          }, true)
        } else {
          console.debug(`skip cloneInstance ${row.mi_data_id} staffTable - ${row.mi_dateTo} < ${entryDate}`)
        }
      }
    }
    if (row.mi_unityEntity === 'hr_department' && row.isSecondaryChanges === 0) {
      if (row.liquidate) {
        const children = UB.Repository('hr_staffUnit')
          .attrs(['ID', 'name', 'mi_data_id', 'staffOrderID', 'mi_treePath', 'mi_unityEntity', 'state', 'description', 'mi_dateTo'])
          .where('parentUnitID', '=', row.mi_data_id)
          .where('mi_dateFrom', '<=', entryDate)
          .where('mi_dateTo', '>=', entryDate)
          .where('state', '=', 'ACTIVE')
          .where('mi_unityEntity', '=', 'hr_position')
          .selectAsObject()
        children.forEach(child => {
          const staffItem = UB.Repository('hr_staffUnit')
            .attrs('ID')
            .where('mi_data_id', '=', child['mi_data_id'])
            .where('staffOrderID', '=', mParams.staffTableID)
            .where('state', '=', 'NEW')
            .misc({ __mip_recordhistory_all: true })
            .misc({ __skipRls: true })
            .limit(1)
            .selectSingle()
          if (staffItem) {
            const store = child.mi_unityEntity === 'hr_organization'
              ? orgStore : (child.mi_unityEntity === 'hr_department' ? depStore : (child.mi_unityEntity === 'hr_position' ? posStore : null))
            if (store) {
              store.run('update', {
                __skipOptimisticLock: true,
                execParams: {
                  ID: staffItem.ID,
                  liquidate: 1,
                  isSecondaryChanges: null
                }
              })
            }
          } else {
            const newID = posStore.generateID()
            entityBaseService.cloneInstance(child.mi_unityEntity, child.ID, {
              ID: newID,
              mi_data_id: child.mi_data_id,
              mi_treePath: child.mi_treePath,
              mi_dateFrom: entryDate,
              mi_dateTo: dateService.maxDate(),
              state: 'NEW',
              staffOrderID: mParams.staffTableID,
              priorID: child.ID,
              liquidate: 1,
              isSecondaryChanges: null
            }, true)
          }
        })
      } else {
        const ctxParams = {
          ID: row.ID,
          name: row.name,
          onDate: entryDate,
          mi_data_id: row.mi_data_id,
          staffOrderID: mParams.staffTableID,
          orgStructureID: mParams.orgStructureID,
          withChild: true
        }
        global['hr_department'].recalcCases({
          mParams: ctxParams
        })
      }
    }
  })
  staffTableStore.run('update', {
    __skipOptimisticLock: true,
    execParams: {
      ID: mParams.staffTableID,
      orgStructureID: mParams.orgStructureID
    }
  })
}

me.getStaffTableMoveEmployees = function (ctx) {
  const mParams = ctx.mParams
  const staffTableID = mParams.staffTableID
  const selectMode = mParams.selectMode || 'all'
  const result = []
  if (staffTableID) {
    const staffTable = UB.Repository('hr_staffTable')
      .attrs(['entryOrderID.entryDate', 'orgID'])
      .selectById(staffTableID)
    const entryDate = staffTable['entryOrderID.entryDate']
    const positionList = UB.Repository('hr_position')
      .attrs(['ID', 'mi_data_id', 'name', 'fullName', 'accrualSum', 'fullNameNom'])
      .where('staffOrderID', '=', staffTableID)
      .misc({ __mip_recordhistory_all: true })
      .selectAsObject()
    positionList.forEach(item => {
      const prevPos = UB.Repository('hr_position')
        .attrs(['name', 'fullName', 'fullNameNom', 'accrualSum'])
        .where('mi_data_id', '=', item.mi_data_id)
        .where('state', '=', 'ACTIVE')
        .where('mi_dateTo', '<', entryDate)
        .misc({ __mip_recordhistory_all: true })
        .orderBy('mi_dateFrom', 'desc')
        .selectSingle()
      if (prevPos) {
        let isAdd = false
        if (selectMode === 'name') {
          isAdd = prevPos.fullName !== item.fullName
        } else if (selectMode === 'fullname') {
          isAdd = prevPos.fullNameNom !== item.fullNameNom
        } else if (selectMode === 'accrual') {
          isAdd = prevPos.accrualSum !== item.accrualSum
        } else {
          isAdd = prevPos.fullName !== item.fullName || prevPos.accrualSum !== item.accrualSum || prevPos.fullNameNom !== item.fullNameNom
        }
        if (isAdd) {
          const empPos = UB.Repository('hr_employeePositionS')
            .attrs(['ID', 'employeeNumberID', 'employeeID', 'employeeID.fullFIO', 'accrualSum'])
            .where('organizationID', '=', staffTable.orgID)
            .where('dateTo', '>=', dateService.shiftDate(entryDate))
            .where('positionID', '=', item.mi_data_id)
            .where('[dateFrom]=[maxDateFrom]', 'custom')
            .orderBy('employeeNumberID')
            .orderBy('dateFrom')
            .selectAsObject({
              'ID': 'employeePositionID',
              'accrualSum': 'empPosAccrualSum'
            })
          empPos.forEach(row => {
            row.positionID = item.ID
            row.prevPosName = prevPos.name
            row.posName = item.name
            row.prevPosFullName = prevPos.fullName
            row.posFullName = item.fullName
            row.prevPosFullNameNom = prevPos.fullNameNom
            row.posFullNameNom = item.fullNameNom
            row.prevAccrualSum = prevPos.accrualSum
            row.accrualSum = item.accrualSum
            result.push(row)
          })
        }
      }
    })
  }
  mParams.result = JSON.stringify(result)
}

me.doCheckStaffList = function (ctx) {
  const mParams = ctx.mParams
  mParams.warningMessages = JSON.stringify(orderService.doCheckStaffList(ctx))
}

me.fixEntryOrderState = function (ctx) {
  const mParams = ctx.mParams
  const staffTableID = mParams.staffTableID
  const errorMessages = []
  if (staffTableID) {
    const empOrder = UB.Repository('hr_empOrder')
      .attrs(['ID', 'orderState'])
      .where('staffTableID', '=', staffTableID)
      .selectSingle()
    if (empOrder && empOrder['orderState'] === 'ON_PROCESSING') {
      const entryOrderID = empOrder['ID']
      const order = UB.Repository('hr_order')
        .attrs('oldOrderState')
        .selectById(entryOrderID) || {}
      const store = UB.DataStore(__entityName)
      store.execSQL(`UPDATE hr_order SET orderState = :orderState: WHERE ID = :ID:`, {
        ID: entryOrderID,
        orderState: order['oldOrderState'] || 'PROJECT'
      })
      store.execSQL(`UPDATE hr_empOrder SET orderState = :orderState: WHERE ID = :ID:`, {
        ID: entryOrderID,
        orderState: order['oldOrderState'] || 'PROJECT'
      })
      const staffTable = UB.Repository('hr_order')
        .attrs('oldOrderState')
        .selectById(staffTableID) || {}
      store.execSQL(`UPDATE hr_order SET orderState = :orderState: WHERE ID = :ID:`, {
        ID: staffTableID,
        orderState: staffTable['oldOrderState'] || 'PROJECT'
      })
      store.execSQL(`UPDATE hr_staffTable SET orderState = :orderState: WHERE ID = :ID:`, {
        ID: staffTableID,
        orderState: staffTable['oldOrderState'] || 'PROJECT'
      })
    } else {
      errorMessages.push(UB.i18n('Наказ не створено або його стан не потребує виправлення'))
    }
  }
  mParams.errorMessages = JSON.stringify(errorMessages)
}

me.sendNotificationMsg = function (ctx) {
  const mParams = ctx.mParams
  const orgID = mParams.orgID
  const instanceID = mParams.instanceID
  const errorMessages = []

  const employeeNumberIDs = UB.Repository('uba_usergroup')
    .attrs(['userID.employeeNumberID'])
    .where('groupID.code', 'in', ['group_chiefPersTelling', 'group_expertsPersTelling'])
    .where('userID.employeeNumberID.orgID', '=', orgID)
    .groupBy(['userID.employeeNumberID'])
    .selectAsObject().map(o => o['userID.employeeNumberID']).filter(o => o)

  messageService.taskMessage({
    orgID: orgID,
    entity: 'hr_staffTable',
    instanceID: instanceID,
    description: UB.i18n('Введено в дію зміни до Штатного розпису'),
    employeeNumberIDs: employeeNumberIDs,
    text: `Введено в дію зміни до Штатного розпису.</br>Відповідальним фахівцям необхідно ознайомитись із змінами та забезпечити</br>рознесення відповідних змін до відповідних призначень працівників.</br>{0}`
  })

  mParams.errorMessages = JSON.stringify(errorMessages)
}
