const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const staffService = require('../HR/modules/staffService')
const dateService = require('../AC/modules/dataServices/dateService')
const currencyService = require('../AC/modules/dataServices/currencyService')
const entityService = require('../HR/modules/entityService')
const orderService = require('../HR/modules/orderService')
const nameCaseService = require('../HR/modules/nameCaseService')
const settingsService = require('../AC/modules/entityServices/settingsService')
const accrualService = require('../HR/modules/accrualService')
const _ = require('lodash')

me.on('insert:before', beforeInsert)
me.on('insert:after', afterInsert)
me.on('update:before', beforeUpdate)
me.on('delete:before', beforeDelete)
me.on('update:after', afterUpdate)
me.on('select:after', afterSelect)

me.entity.addMethod('getSupervisorPosition')
me.entity.addMethod('accPositionEditAlways') // права для доступу до кнопки Редагувати (в меню Всі дії)
me.entity.addMethod('copyPosition')
me.entity.addMethod('newVersionPosition')
me.entity.addMethod('getFullName')
me.entity.addMethod('getNameCases')
me.entity.addMethod('joinPositionFundSource')
me.entity.addMethod('calcFunds')
me.entity.addMethod('updateFunds')
me.entity.addMethod('updateAllPosFunds')
me.entity.addMethod('updateAddDescription')
me.entity.addMethod('updateAllPosAddDescription')
me.entity.addMethod('getPlanSumByPosition')

// eslint-disable-next-line no-unused-vars
const cases = ['Nom', 'Gen', 'Dat', 'Acc', 'Or', 'Loc', 'Voc']

me.details = [
  {
    detailName: 'positionEducation',
    entityName: 'hr_positionEducation',
    docIDName: 'positionID',
    fieldList: orderService.setFieldListAttribute([
      'dictEducationLevelID.name', 'dictAreasOfEduID.name', 'dictSpecialtyID.name'
    ], ['lineNum'])
  },
  {
    detailName: 'positionExperience',
    entityName: 'hr_positionExperience',
    docIDName: 'positionID',
    fieldList: orderService.setFieldListAttribute([
      'dictExperienceID.name', 'years', 'months', 'comment'
    ], ['lineNum'])
  },
  {
    detailName: 'positionProfi',
    entityName: 'hr_positionProfi',
    docIDName: 'positionID',
    fieldList: orderService.setFieldListAttribute([
      'dictRequiredParaID.name', 'requirement'
    ], ['lineNum'])
  },
  {
    detailName: 'positionPcLiteracy',
    entityName: 'hr_positionPcLiteracy',
    docIDName: 'positionID',
    fieldList: orderService.setFieldListAttribute([
      'dictLevelUsePcID.name', 'soft', 'comment'
    ], ['lineNum'])
  },
  {
    detailName: 'positionDegreeLevel',
    entityName: 'hr_positionDegreeLevel',
    docIDName: 'positionID',
    fieldList: orderService.setFieldListAttribute([
      'dictDegreeID.name', 'dictBranchScienceID.name'
    ], ['lineNum'])
  },
  {
    detailName: 'positionAcademStatus',
    entityName: 'hr_positionAcademStatus',
    docIDName: 'positionID',
    fieldList: orderService.setFieldListAttribute([
      'dictAcademStatusID.name', 'dictSpecialtyID.name'
    ], ['lineNum'])
  },
  {
    detailName: 'positionFundSourceDt',
    entityName: 'hr_positionFundSource',
    docIDName: 'positionID',
    detIDName: 'positionID',
    fieldList: orderService.setFieldListAttribute([
      'dictFundSourceID', 'dictFundSourceID.description', 'quantity', 'dictFundSourceID.mi_deleteUser'
    ], ['lineNum'])
  },
  {
    detailName: 'positionAccrualDt',
    entityName: 'hr_positionAccrual',
    docIDName: 'positionID',
    detIDName: 'positionID',
    fieldList: orderService.setFieldListAttribute([
      'payElID', 'payElID.description', 'accrualSum', 'accrualRate', 'staffOrderID'
    ], ['lineNum'])
  },
  {
    detailName: 'tariffAccrualDt',
    entityName: 'hr_positionAccrual',
    docIDName: 'positionID',
    detIDName: 'positionID',
    fieldList: orderService.setFieldListAttribute([
      'payElID', 'payElID.description', 'accrualSum', 'accrualRate', 'staffOrderID', 'payElID.dictTarifCoeffID'
    ], ['lineNum'])
  }
]

const attrsToCopy = [
  'positionType',
  'dictPositionID',
  'code',
  'name',
  'fullName',
  'parentUnitID',
  'positionCategory',
  'dictStaffCatID',
  'dictWagePayID',
  'psCategory',
  'dictStatePayID',
  'dictFundSourceID',
  'payElID',
  'nameNom',
  'nameGen',
  'nameDat',
  'nameAcc',
  'nameOr',
  'nameLoc',
  'nameVoc',
  'fullNameNom',
  'fullNameGen',
  'fullNameDat',
  'fullNameAcc',
  'fullNameOr',
  'fullNameLoc',
  'fullNameVoc',
  'accrualSum',
  'quantity',
  'orgID',
  'workScheduleID',
  'idxNum',
  'mi_data_id',
  'personalType',
  'dictStaffSubCatID',
  'isOrgBoss',
  'reformer',
  'dictPositionKindID',
  'dictPositionGroupID',
  'paymentType',
  'dictSalarySchemeLevelID',
  'dictCostTypeID',
  'dictTarifCoeffID',
  'dictMilitaryRankID',
  'dictMilitarySpecialityID',
  'dictSpecialtyID',
  'dictEmpCategoryID',
  'dictAcademStatusID',
  'comment'
]

/**
 * Права на редагування посади
 */
me.accPositionEditAlways = () => {}

function setChangesKind (ctx, method) {
  const execParams = ctx.mParams.execParams
  if (execParams.isSecondaryChanges !== undefined && execParams.isSecondaryChanges !== null) {
    return
  }
  if (ctx.mParams.isOrderOperation) {
    return
  }

  if (method === 'update') {
    if (execParams.accrualSum !== undefined || execParams.quantity !== undefined || execParams.dictPositionID !== undefined || execParams.name !== undefined || execParams.parentUnitID !== undefined) {
      execParams.isSecondaryChanges = 0
    } else {
      const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || { }
      if (instanceData.isSecondaryChanges === null) {
        execParams.isSecondaryChanges = 1
      }
    }
    return
  }
  if (execParams.mi_data_id === execParams.ID || execParams.liquidate) {
    execParams.isSecondaryChanges = 0
    return
  }

  const prevRecord = (execParams.priorID) ? UB.Repository(__entityName)
    .attrs(['accrualSum', 'quantity', 'dictPositionID', 'name', 'parentUnitID'])
    .where('ID', '=', execParams.priorID)
    .misc({ __mip_recordhistory_all: true })
    .selectSingle() : null
  if (!prevRecord || prevRecord.accrualSum !== execParams.accrualSum || prevRecord.quantity !== execParams.quantity ||
    prevRecord.dictPositionID !== execParams.dictPositionID || prevRecord.name !== execParams.name || prevRecord.parentUnitID !== execParams.parentUnitID) {
    execParams.isSecondaryChanges = 0
  } else {
    execParams.isSecondaryChanges = 1
  }
}

function setCases (ctx) {
  const mParams = ctx.mParams
  const execParams = mParams.execParams
  const baseNames = ['name', 'nameNom', 'nameGen', 'nameDat', 'nameAcc', 'nameOr', 'nameLoc', 'nameVoc']
  const baseFullNames = baseNames.map(item => 'fullN' + item.substr(1, 100))
  const names = []
  const fullNames = []
  baseNames.forEach(attrName => {
    if (!execParams[attrName]) {
      names.push(attrName)
    }
  })
  baseFullNames.forEach(attrName => {
    if (!execParams[attrName]) {
      fullNames.push(attrName)
    }
  })
  if (!execParams.dictPositionID || !execParams.parentUnitID) {
    return
  }
  const parent = UB.Repository('hr_staffUnit').attrs('mi_treePath').selectById(execParams.parentUnitID)
  const profession = UB.Repository('hr_dictPosition')
    .attrs(['name', 'nameGen', 'nameDat', 'nameAcc', 'nameOr', 'nameLoc', 'nameVoc'])
    .where('ID', '=', execParams.dictPositionID)
    .selectSingle()
  const department = UB.Repository('hr_department')
    .attrs(['nameGen'])
    .where('mi_data_id', 'in', _.compact(parent.mi_treePath.split('/')).map(o => Number(o)))
    // .where('state', '=', 'ACTIVE')
    .where('orgID', '=', execParams.orgID)
    .misc({
      __mip_ondate: dateService.shiftDate(execParams.mi_dateFrom)
    })
    .orderBy('mi_treePath', 'desc')
    .selectAsObject()
  const depName = department[0] ? department[0].nameGen : ''
  fullNames.forEach((item, idx) => {
    execParams[item] = profession[names[idx]] || profession.name
  })
  if (department.length) {
    department.forEach(dep => {
      fullNames.forEach(item => {
        if (item !== 'fullName') {
          execParams[item] += (' ' + dep.nameGen)
        }
      })
    })
    fullNames.forEach(item => {
      execParams[item] = nameCaseService.removeDuplicateWords(execParams[item])
    })
  }
  names.forEach(item => {
    execParams[item] = profession[item] || profession.name
  })
  if (depName) {
    names.forEach(item => {
      if (item !== 'name') {
        execParams[item] = nameCaseService.removeDuplicateWords(execParams[item] + ' ' + depName)
      }
    })
  }
}

function getAddDescription (positionID) {
  const pos = UB.Repository('hr_position')
    .attrs(['ID', 'orgID', 'workScheduleID', 'workScheduleID.description', 'dictMilitaryRankID', 'dictMilitaryRankID.name',
      'dictSalarySchemeLevelID', 'dictSalarySchemeLevelID.description', 'fundTotal', 'dictAcademStatusID', 'dictAcademStatusID.name',
      'dictTarifCoeffID', 'dictTarifCoeffID.code', 'dictTarifCoeffID.name', 'paymentType', 'dictEmpCategoryID',
      'dictEmpCategoryID.name', 'mi_minDateFrom', 'positionCategory', 'positionCategory.name']
    )
    .misc({ __mip_recordhistory_all: true })
    .selectById(positionID)
  const addParams = []
  if (pos) {
    const addDescrParam = UB.Repository('hr_addDescrPosition')
      .attrs('idxNum', 'value', 'name')
      .where('organizationID', '=', pos.orgID)
      .orderBy('idxNum')
      .selectAsObject()

    addDescrParam.forEach(param => {
      const nameParam = param.name || ''
      let value
      if (param.value === 'ACCRUALS') {
        const posAccruals = UB.Repository('hr_positionAccrual')
          .attrs(['payElID', 'payElID.code', 'payElID.shortPrintName', 'accrualSum', 'accrualRate'])
          .where('positionID', '=', positionID)
          .selectAsObject()
        const accruals = []
        posAccruals.forEach(item => {
          const value = item.accrualSum || item.accrualRate || 0
          const unit = item.accrualRate ? '%' : UB.i18n('грн')
          accruals.push(`${item['payElID.shortPrintName'] || item['payElID.code']}(${accrualService.round(value)}${unit})`)
        })
        if (accruals.length) {
          value = accruals.join(',')
        }
      }
      if (param.value === 'WORK_SCHEDULE' && pos.workScheduleID) {
        value = pos['workScheduleID.description']
      }
      if (param.value === 'MILITARY_RANK' && pos.dictMilitaryRankID) {
        value = pos['dictMilitaryRankID.name']
      }
      if (param.value === 'SALARY_SCHEME_LEVEL' && pos.dictSalarySchemeLevelID && pos.paymentType === 'SCHEME') {
        value = pos['dictSalarySchemeLevelID.description']
      }
      if (param.value === 'FUND_TOTAL' && pos.fundTotal) {
        value = currencyService.formatAsCurrencyEx(pos.fundTotal)
      }
      if (param.value === 'FUND_SOURCES') {
        const fundSources = []
        UB.Repository('hr_positionFundSource')
          .attrs(['dictFundSourceID.nominalName', 'dictFundSourceID.code', 'quantity'])
          .where('positionID', '=', positionID)
          .selectAsObject()
          .forEach(fs => {
            fundSources.push(`${fs['dictFundSourceID.nominalName'] || fs['dictFundSourceID.code']}(${accrualService.round(fs.quantity)})`)
          })
        if (fundSources.length) {
          value = fundSources.join(',')
        }
      }
      if (param.value === 'ACADEM_STATUS' && pos.dictAcademStatusID) {
        value = pos['dictAcademStatusID.name']
      }
      if (param.value === 'TARIF_COEFF' && pos.dictTarifCoeffID) {
        value = pos['dictTarifCoeffID.code']
      }
      if (param.value === 'EMP_CATEGORY' && pos.dictEmpCategoryID) {
        value = pos['dictEmpCategoryID.name']
      }
      if (param.value === 'MIN_DATE_FROM' && pos['mi_minDateFrom']) {
        value = dateService.formatDate(dateService.shiftDate(pos['mi_minDateFrom']))
      }
      if (param.value === 'POSITION_CATEGORY' && pos.positionCategory) {
        value = pos['positionCategory.name']
      }
      if (value) {
        addParams.push(`${nameParam}${value}`)
      }
    })
  }
  return addParams.length ? addParams.join('; ') : null
}

function afterInsert (ctx) {
  const execParams = ctx.mParams.execParams
  const priorID = execParams.priorID
  if (priorID) {
    const calcAccrualType = settingsService.getByCode('hrCalcSumPosAccrual', execParams.orgID)
    const ds = UB.DataStore('hr_positionAccrual')
    const accrual = UB.Repository('hr_positionAccrual')
      .attrs(['positionID', 'payElID', 'accrualSum', 'accrualRate', 'calcSum', 'dateFrom', 'dateTo',
        'staffOrderID', 'payElID.methodID.code'])
      .where('positionID', '=', execParams.priorID).selectAsObject()
    const onDate = dateService.shiftDate(execParams.mi_dateFrom)
    let tarifAccrualSum = 0
    if (execParams.paymentType === 'TARIF' && execParams.dictTarifCoeffID) {
      tarifAccrualSum = UB.Repository('hr_dictTarifCoeffDet')
        .attrs(['accrualSum'])
        .where('dictTarifCoeffID', '=', execParams.dictTarifCoeffID)
        .where('dateFrom', '<=', onDate)
        .where('dateTo', '>=', onDate)
        .selectScalar() || 0
    }
    accrual.forEach(item => {
      let calcSum = item.calcSum
      if (execParams.accrualSum !== undefined) {
        calcSum = item.accrualRate ? ((execParams.accrualSum || 0) * item.accrualRate / 100 || null) : item.accrualSum
        if (item['payElID.methodID.code'] === 144) {
          calcSum = item.accrualRate ? tarifAccrualSum * item.accrualRate / 100 : item.accrualSum
        }
      }
      ds.run('insert', {
        skipRecalcFunds: true,
        skipUpdatePositionChangesState: true,
        execParams: {
          ID: ds.generateID(),
          positionID: execParams.ID,
          payElID: item.payElID,
          accrualSum: item.accrualSum,
          accrualRate: item.accrualRate,
          calcSum,
          dateFrom: execParams.mi_dateFrom,
          dateTo: execParams.mi_dateTo || dateService.maxDateUTC(),
          staffOrderID: execParams.staffOrderID
        }
      })
    })
    if (calcAccrualType === 'ACCRUAL') {
      const positionData = staffService.getPlanSumByPosition({
        onDate,
        orgID: execParams.orgID,
        positionIDs: [execParams.ID]
      })
      positionData.forEach(position => {
        position.payEl.forEach(accrual => {
          ds.execSQL(`UPDATE hr_positionAccrual SET calcSum = :calcSum: WHERE ID = :ID:`, {
            ID: accrual.ID,
            calcSum: accrual.planSum || 0
          })
        })
      })
    }
    if (!ctx.mParams.formData) {
      const storeFs = UB.DataStore('hr_positionFundSource')
      const fundSource = UB.Repository('hr_positionFundSource')
        .attrs(['positionID', 'dictFundSourceID', 'quantity'])
        .where('positionID', '=', execParams.priorID)
        .selectAsObject()
      fundSource.forEach(item => {
        storeFs.run('insert', {
          execParams: {
            ID: storeFs.generateID(),
            positionID: execParams.ID,
            dictFundSourceID: item.dictFundSourceID,
            quantity: item.quantity,
            isChanged: 1
          }
        })
      })
    }
  }
  orderService.saveDetails(ctx, me.details, { docID: execParams.mi_data_id, orderDetID: execParams.ID })
  if (execParams.addDescrPosition === undefined) {
    execParams.addDescrPosition = getAddDescription(execParams.ID) || null
    const store = UB.DataStore('hr_position')
    store.execSQL('UPDATE hr_position  set addDescrPosition = :addDescrPosition: WHERE ID = :ID:', { ID: execParams.ID, addDescrPosition: execParams.addDescrPosition })
  }

  const funds = staffService.calculatePositionFunds(execParams.ID, execParams.orgID, execParams.accrualSum || 0, execParams.quantity || 0)
  execParams.fundBasePay = funds.fundBase
  execParams.fundAddPay = funds.fundAdd
  execParams.fundOtherPay = funds.fundOther
  execParams.fundTotal = funds.fundAll

  UB.DataStore(__entityName).run('update', {
    __skipOptimisticLock: true,
    __skipSelectAfterUpdate: true,
    skipBefore: true,
    execParams: {
      ID: execParams.ID,
      fundBasePay: funds.fundBase,
      fundAddPay: funds.fundAdd,
      fundOtherPay: funds.fundOther,
      fundTotal: funds.fundAll
    }
  })

  if (execParams.priorID) {
    let isChangedAccrualSum = 0 // (execParams.accrualSum && execParams.accrualSum !== ctx.previousValues.accrualSum) ? 1 : 0
    const prevRecord = UB.Repository(__entityName).attrs('accrualSum')
      .where('ID', '=', execParams.priorID)
      .misc({ __mip_recordhistory_all: true })
      .selectSingle()
    if (!prevRecord || prevRecord.accrualSum !== execParams.accrualSum) {
      isChangedAccrualSum = 1
    }

    const store = UB.DataStore('hr_positionFundSource')
    const priorFS = isChangedAccrualSum === 0 ? UB.Repository('hr_positionFundSource')
      .attrs('ID', 'dictFundSourceID', 'quantity')
      .where('positionID', '=', execParams.priorID)
      .selectAsObject() : []

    UB.Repository('hr_positionFundSource')
      .attrs('ID', 'dictFundSourceID', 'quantity')
      .where('positionID', '=', execParams.ID)
      .selectAsObject()
      .forEach(item => {
        let isChanged
        if (isChangedAccrualSum === 0) {
          const fs = priorFS.find(o => o.dictFundSourceID === item.dictFundSourceID)
          isChanged = !fs || fs.quantity !== item.quantity ? 1 : 0
        } else {
          isChanged = isChangedAccrualSum
        }
        if (isChanged === 0) {
          store.run('update', {
            __skipOptimisticLock: true,
            __skipSelectAfterUpdate: true,
            skipBefore: true,
            execParams: {
              ID: item.ID,
              isChanged: isChanged
            }
          })
        }
      })
  }
  if (execParams.staffOrderID) {
    const orderClass = UB.Repository('hr_order').attrs('orderClass.entityName').where('ID', '=', execParams.staffOrderID).selectScalar()
    if (orderClass === 'hr_staffTariffing') {
      const tariffStore = UB.DataStore('hr_staffTariffingPos')
      let accrualDt = null
      if (ctx.mParams.sourceID) {
        accrualDt = UB.Repository('hr_staffTariffingPos')
          .attrs('accrualDt')
          .where('positionID', '=', ctx.mParams.sourceID)
          .where('staffTariffingID', '=', execParams.staffOrderID)
          .where('isVacancy', '=', 1)
          .selectScalar() || null
      }
      if (!accrualDt) {
        const accruals = []
        const dictPosPayEl = UB.Repository('hr_dictPositionPayEl')
          .attrs('dictPositionID', 'payElID', 'valuation', 'value')
          .where('dictPositionID', '=', execParams.dictPositionID)
          .where('dateFrom', '<=', execParams.mi_dateFrom)
          .where('dateTo', '>=', execParams.mi_dateFrom)
          .selectAsObject()
        dictPosPayEl.forEach(acc => {
          accruals.push({
            payElID: acc.payElID,
            baseSum: acc.valuation === 'SUM' ? (acc.value || 0) : 0,
            rate: acc.valuation === 'RATE' ? (acc.value || 0) : 0,
            planSum: 0
          })
        })
        accrualDt = JSON.stringify(accruals)
      }
      tariffStore.run('insert', {
        execParams: {
          positionID: execParams['mi_data_id'],
          dictPositionID: execParams['dictPositionID'],
          dateFrom: execParams['mi_dateFrom'],
          dateTo: execParams['mi_dateTo'],
          staffTariffingID: execParams.staffOrderID,
          accrualDt,
          isVacancy: 1,
          mtCount: execParams.quantity
        }
      })
    }
  }
  ctx.mParams.detail = orderService.getEntityDetail(execParams.ID, me.details)
}

function beforeInsert (ctx) {
  if (ctx.mParams.isImportOperation) {
    setCases(ctx)
  }
  if (ctx.mParams.execParams.state === 'LIQ') {
    ctx.mParams.execParams.state = 'NEW'
  }
  if (ctx.mParams.execParams.quantity === null) {
    ctx.mParams.execParams.quantity = 0
  }
  if (ctx.mParams.skipBefore) {
    return
  }
  if ((ctx.mParams.isDirectCreate) && !ctx.mParams.execParams.staffOrderID) {
    createStaffOrder(ctx)
  }
  setChangesKind(ctx, 'insert')
  const previousValues = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  entityService.setAttrs(ctx, true, previousValues)
  staffService.checkParentUnit(ctx, previousValues)
  staffService.setAttr(ctx, previousValues)
  staffService.checkUniqueBeforeInsert(ctx, previousValues)
  entityService.fixLineBreaks(ctx, ['name', 'fullName', 'description', 'caption'])
  entityService.removeExtraChars(ctx, ['code', 'name', 'fullName', 'description', 'nameAddition', 'caption', 'nameEng',
    'nameNom', 'nameGen', 'nameDat', 'nameAcc', 'nameOr', 'nameLoc', 'nameVoc', 'fullNameNom', 'fullNameGen', 'fullNameDat',
    'fullNameAcc', 'fullNameOr', 'fullNameLoc', 'fullNameVoc', 'nameNomF', 'nameGenF', 'nameDatF', 'nameAccF', 'nameOrF',
    'nameLocF', 'nameVocF', 'fullNameNomF', 'fullNameGenF', 'fullNameDatF', 'fullNameAccF', 'fullNameOrF', 'fullNameLocF',
    'fullNameVocF', 'nameEngF', 'fullNameEng', 'fullNameEngF'
  ])
}

function createStaffOrder (ctx) {
  const execParams = ctx.mParams.execParams
  const orderUnityStore = UB.DataStore('hr_order')
  orderUnityStore.run('insert', {
    execParams: {
      ID: execParams.ID,
      orderDate: execParams.mi_dateFrom,
      orderState: 'POSTED',
      entryDate: execParams.mi_dateFrom,
      organizationID: execParams.orgID || null
    }
  })
  execParams.staffOrderID = execParams.ID
}

function beforeUpdate (ctx) {
  if (ctx.mParams.execParams.quantity === null) {
    ctx.mParams.execParams.quantity = 0
  }
  if (ctx.mParams.skipBefore) {
    return
  }
  setChangesKind(ctx, 'update')
  const previousValues = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  entityService.setAttrs(ctx, true, previousValues)
  staffService.checkParentUnit(ctx, previousValues)
  staffService.setAttr(ctx, previousValues)
  staffService.checkUniqueBeforeUpdate(ctx, previousValues)
  ctx.previousValues = previousValues
  orderService.saveDetails(ctx, me.details, { docID: ctx.mParams.execParams.mi_data_id || previousValues.mi_data_id, orderDetID: ctx.mParams.execParams.ID })
  const execParams = ctx.mParams.execParams
  if (execParams.accrualSum || execParams.quantity || execParams.accrualSum !== previousValues.accrualSum || execParams.quantity !== previousValues.quantity) {
    const calcAccrualType = settingsService.getByCode('hrCalcSumPosAccrual', execParams.orgID || previousValues.orgID)
    const onDate = dateService.shiftDate(execParams.mi_dateFrom || previousValues.mi_dateFrom)
    const accrualSum = execParams.accrualSum !== undefined ? execParams.accrualSum : previousValues.accrualSum
    const quantity = execParams.quantity !== undefined ? execParams.quantity : previousValues.quantity
    const accrualStore = UB.DataStore('hr_positionAccrual')
    if (calcAccrualType === 'ACCRUAL') {
      const positionData = staffService.getPlanSumByPosition({
        onDate,
        orgID: execParams.orgID || previousValues.orgID,
        positionData: [{
          ID: execParams.ID,
          mi_data_id: execParams.mi_data_id || previousValues.mi_data_id,
          payElID: execParams.payElID !== undefined ? execParams.payElID : previousValues.payElID,
          accrualSum: execParams.accrualSum !== undefined ? execParams.accrualSum : previousValues.accrualSum,
          dictTarifCoeffID: execParams.dictTarifCoeffID !== undefined ? execParams.dictTarifCoeffID : previousValues.dictTarifCoeffID,
          mi_dateFrom: execParams.mi_dateFrom || previousValues.mi_dateFrom
        }]
      })
      positionData.forEach(position => {
        position.payEl.forEach(accrual => {
          accrualStore.execSQL(`UPDATE hr_positionAccrual SET calcSum = :calcSum: WHERE ID = :ID:`, {
            ID: accrual.ID,
            calcSum: accrual.planSum || 0
          })
        })
      })
    } else {
      const posAccruals = UB.Repository('hr_positionAccrual')
        .attrs(['ID', 'accrualRate', 'accrualSum'])
        .where('positionID', '=', execParams.ID)
        .where('payElID.methodID.code', '!=', '144')
        .selectAsObject()
      posAccruals.forEach(row => {
        accrualStore.execSQL(`UPDATE hr_positionAccrual SET calcSum = :calcSum: WHERE ID = :ID:`, {
          ID: row.ID,
          calcSum: row.accrualRate ? (accrualSum * row.accrualRate / 100 || null) : row.accrualSum
        })
      })
      if (execParams.paymentType === 'TARIF' || (execParams.paymentType === undefined && previousValues['paymentType'] === 'TARIF')) {
        const dictTarifCoeffID = execParams.dictTarifCoeffID || previousValues['dictTarifCoeffID']
        const dictTarifAccruals = UB.Repository('hr_dictTarifCoeffDet')
          .attrs(['dictTarifCoeffID', 'accrualSum'])
          .where('dateFrom', '<=', onDate)
          .where('dateTo', '>=', onDate)
          .selectAsObject()
        const tarifAccruals = UB.Repository('hr_positionAccrual')
          .attrs(['ID', 'accrualRate', 'accrualSum', 'calcSum', 'payElID.dictTarifCoeffID'])
          .where('positionID', '=', execParams.ID)
          .where('payElID.methodID.code', '=', '144')
          .selectAsObject()
        const accrualStore = UB.DataStore('hr_positionAccrual')
        tarifAccruals.forEach(row => {
          let dictTarif = null
          if (row['payElID.dictTarifCoeffID']) {
            dictTarif = dictTarifAccruals.find(o => o.dictTarifCoeffID === row['payElID.dictTarifCoeffID'])
          } else {
            dictTarif = dictTarifAccruals.find(o => o.dictTarifCoeffID === dictTarifCoeffID)
          }
          let tarifAccrualSum = dictTarif ? (dictTarif.accrualSum || 0) : 0
          accrualStore.execSQL(`UPDATE hr_positionAccrual SET calcSum = :calcSum: WHERE ID = :ID:`, {
            ID: row.ID,
            calcSum: row.accrualRate ? tarifAccrualSum * row.accrualRate / 100 : row.accrualSum
          })
        })
      }
    }
    const funds = staffService.calculatePositionFunds(ctx.mParams.execParams.ID, ctx.mParams.execParams.orgID || previousValues.orgID, accrualSum, quantity)
    ctx.mParams.execParams.fundBasePay = funds.fundBase
    ctx.mParams.execParams.fundAddPay = funds.fundAdd
    ctx.mParams.execParams.fundOtherPay = funds.fundOther
    ctx.mParams.execParams.fundTotal = funds.fundAll
  }
  entityService.fixLineBreaks(ctx, ['name', 'fullName', 'description', 'caption'])
  entityService.removeExtraChars(ctx, ['code', 'name', 'fullName', 'description', 'nameAddition', 'caption', 'nameEng',
    'nameNom', 'nameGen', 'nameDat', 'nameAcc', 'nameOr', 'nameLoc', 'nameVoc', 'fullNameNom', 'fullNameGen', 'fullNameDat',
    'fullNameAcc', 'fullNameOr', 'fullNameLoc', 'fullNameVoc', 'nameNomF', 'nameGenF', 'nameDatF', 'nameAccF', 'nameOrF',
    'nameLocF', 'nameVocF', 'fullNameNomF', 'fullNameGenF', 'fullNameDatF', 'fullNameAccF', 'fullNameOrF', 'fullNameLocF',
    'fullNameVocF', 'nameEngF', 'fullNameEng', 'fullNameEngF'
  ])
}

function beforeDelete (ctx) {
  if (ctx.mParams.isOrderOperation) {
    return
  }
  if (ctx.mParams.skipBefore) {
    return
  }
  const instanceData = ctx.dataStore
  if (instanceData.get('state') !== 'NEW') {
    throw new UB.UBAbort(`<<<${UB.i18n('Неможливо видалити діючу посаду.')}>>>`)
  }
  const orgUnits = UB.Repository('hr_staffUnit')
    .attrs(['ID', 'state', 'mi_dateFrom', 'mi_dateTo', 'staffOrderID', 'mi_unityEntity', 'liquidate', 'mi_treePath',
      'mi_data_id'])
    .where('orgID', '=', instanceData.get('orgID'))
    .where('mi_treePath', 'startsWith', instanceData.get('mi_treePath'))
    .where('state', '=', 'NEW')
    .where('staffOrderID', '=', instanceData.get('staffOrderID'))
    .where('ID', '!=', instanceData.get('ID'))
    .misc({ __mip_recordhistory_all: true })
    .orderByDesc('mi_treePath')
    .selectAsObject()
  orgUnits.forEach(row => {
    const store = UB.DataStore(row.mi_unityEntity)
    if (row.state === 'NEW') {
      store.run('delete', {
        execParams: {
          ID: row.ID
        }
      })
    }
  })
  if (instanceData.staffOrderID) {
    const orderClass = UB.Repository('hr_order').attrs('orderClass.entityName').where('ID', '=', instanceData.staffOrderID).selectScalar()
    if (orderClass === 'hr_staffTariffing') {
      const tariffStore = UB.DataStore('hr_staffTariffingPos')
      UB.Repository('hr_staffTariffingPos')
        .attrs('ID')
        .where('staffTariffingID', '=', instanceData.staffOrderID)
        .where('positionID', '=', instanceData['mi_data_id'])
        .selectAsObject()
        .forEach(row => {
          tariffStore.run('delete', {
            execParams: {
              ID: row.ID
            }
          })
        })
    }
  }
}

function afterUpdate (ctx) {
  const execParams = ctx.mParams.execParams
  if (execParams.addDescrPosition === undefined) {
    const formData = ctx.mParams.formData ? JSON.parse(ctx.mParams.formData) : {} || {}
    const isFundSourceChanged = formData.detail && (formData.detail['positionFundSourceDt'].insert.length ||
      formData.detail['positionFundSourceDt'].update.length ||
      formData.detail['positionFundSourceDt'].del.length
    )
    if (isFundSourceChanged ||
      execParams.workScheduleID !== undefined ||
      execParams.dictMilitaryRankID !== undefined ||
      execParams.dictSalarySchemeLevelID !== undefined ||
      execParams.fundTotal !== undefined
    ) {
      execParams.addDescrPosition = getAddDescription(execParams.ID) || null
      const store = UB.DataStore('hr_position')
      store.execSQL('UPDATE hr_position  set addDescrPosition = :addDescrPosition: WHERE ID = :ID:', { ID: execParams.ID, addDescrPosition: execParams.addDescrPosition })
    }
  }
  if (ctx.previousValues && execParams.name && ctx.previousValues.name !== execParams.name && execParams.state === 'ACTIVE' && (ctx.previousValues.state === 'ACTIVE' || ctx.previousValues.state === 'NEW')) {
    const curDate = new Date()
    UB.Repository('hr_employeePositionS')
      .attrs('ID')
      .where('dateFrom', '<=', curDate)
      .where('dateTo', '>=', curDate)
      .where('positionID', '=', execParams.mi_data_id || ctx.previousValues.mi_data_id)
      .selectAsObject()
      .forEach((item) => {
        UB.DataStore('hr_employeePosition').run('update', {
          __skipOptimisticLock: true,
          __skipSelectAfterUpdate: true,
          execParams: {
            ID: item.ID,
            description: null
          }
        })
      })
  }
  if (ctx.previousValues && execParams.accrualSum && execParams.accrualSum !== ctx.previousValues.accrualSum) {
    const store = UB.DataStore('hr_positionFundSource')
    UB.Repository('hr_positionFundSource')
      .attrs('ID')
      .where('positionID', '=', execParams.ID)
      .selectAsObject()
      .forEach(item => {
        store.run('update', {
          __skipOptimisticLock: true,
          __skipSelectAfterUpdate: true,
          skipBefore: true,
          execParams: {
            ID: item.ID,
            isChanged: 1
          }
        })
      })
  }
  ctx.mParams.detail = orderService.getEntityDetail(execParams.ID, me.details)
}

function afterSelect (ctx) {
  const mParams = ctx.mParams
  if (mParams.ID && !mParams.execParams) {
    ctx.mParams.detail = orderService.getEntityDetail(mParams.ID, me.details)
  }
}

me.calcFunds = function (ctx) {
  const mParams = ctx.mParams
  const positionID = mParams.positionID
  const orgID = mParams.orgID
  const posItem = UB.Repository('hr_position')
    .attrs(['ID', 'accrualSum', 'quantity'])
    .misc({ __mip_recordhistory_all: true })
    .selectById(positionID) || {}
  const funds = staffService.calculatePositionFunds(positionID, orgID, mParams.accrualSum || posItem.accrualSum || 0, mParams.quantity || posItem.quantity || 0)
  mParams.resultData = JSON.stringify(funds)
  return funds
}

me.getIndepStructUnit = function (onDate, positionID) {
  if (!positionID) return null
  const posData = UB.Repository('hr_position')
    .attrs(['orgID', 'mi_treePath'])
    .where('mi_data_id', '=', positionID)
    .where('state', '=', 'ACTIVE')
    .misc({ __mip_ondate: onDate })
    .selectSingle()

  if (!posData) return null

  const treeList = posData['mi_treePath'].split('/').filter(o => o).map(o => parseInt(o))
  const indepStruct = UB.Repository('hr_department')
    .attrs(['ID', 'mi_data_id', 'name'])
    .where('orgID', '=', posData.orgID)
    .where('state', '=', 'ACTIVE')
    .where('mi_data_id', 'in', treeList)
    .misc({ __mip_ondate: onDate })
    .orderBy('mi_treePath')
    .selectSingle()

  let indepSuperData = null
  if (indepStruct) {
    indepSuperData = UB.Repository('hr_position')
      .attrs(['ID', 'mi_data_id'])
      .where('parentUnitID', '=', indepStruct['mi_data_id'])
      .where('state', '=', 'ACTIVE')
      .misc({ __mip_ondate: onDate })
      .orderBy('idxNum')
      .selectSingle()
  }
  return {
    indepStruct: indepStruct || null,
    headIndStrUnitPos: indepSuperData || null
  }
}

/**
 * Отримати адресат для заяви
 * @param {object} ctx
 * @param {Date} ctx.onDate на дату
 * @param {number} ctx.positionID посада
 * @return {Boolean} supervisor адресат
 */
me.getSupervisorPosition = function (ctx) {
  const onDate = ctx.mParams.onDate ? dateService.shiftDate(ctx.mParams.onDate) : dateService.currentDate()
  const positionID = ctx.mParams.positionID
  let res = null
  const indep = me.getIndepStructUnit(onDate, positionID)
  const parent = UB.Repository('hr_position')
    .attrs(['parentUnitID', 'parentUnitID.parentUnitID'])
    .where('mi_data_id', '=', positionID)
    .where('state', '=', 'ACTIVE')
    .where('parentUnitID.state', '=', 'ACTIVE')
    .misc({ __mip_ondate: onDate })
    .selectSingle()

  if (parent && parent.parentUnitID) {
    const supervisorData = UB.Repository('hr_position')
      .attrs(['ID', 'mi_data_id'])
      .where('parentUnitID', '=', parent.parentUnitID)
      .where('state', '=', 'ACTIVE')
      .misc({ __mip_ondate: onDate })
      .orderBy('idxNum')
      .selectSingle()
    if (supervisorData.mi_data_id === positionID && parent['parentUnitID.parentUnitID']) {
      const parentSuperData = UB.Repository('hr_position')
        .attrs(['ID', 'mi_data_id'])
        .where('parentUnitID', '=', parent['parentUnitID.parentUnitID'])
        .where('state', '=', 'ACTIVE')
        .misc({ __mip_ondate: onDate })
        .orderBy('idxNum')
        .selectSingle()
      res = parentSuperData || null
    } else {
      res = supervisorData || null
    }
  }
  ctx.mParams.supervisor = res
  ctx.mParams.indepStruct = indep ? indep.indepStruct : null
  ctx.mParams.headIndStrUnitPos = indep ? indep.headIndStrUnitPos : null
}

/**
 * Нова версія посади
 * @param {object} ctx
 * @param {number} ctx.sourceID посада
 * @param {date} ctx.onDate з дати
 * @param {object} ctx.attrValues значення
 * @param {number} ctx.staffOrderID наказ
 */
me.newVersionPosition = function (ctx) {
  const mParams = ctx.mParams
  if (!mParams.sourceID) return
  const store = UB.DataStore('hr_position')
  const sourcePosition = UB.Repository('hr_position')
    .attrs(attrsToCopy)
    .selectById(mParams.sourceID)
  sourcePosition.mi_dateFrom = dateService.shiftDate(mParams.onDate) || dateService.currentDate()
  sourcePosition.staffOrderID = mParams.staffOrderID
  sourcePosition.priorID = mParams.sourceID
  mParams.newID = store.generateID()
  sourcePosition.ID = mParams.newID
  store.run('insert', { execParams: Object.assign(sourcePosition, mParams.attrValues ? JSON.parse(mParams.attrValues) : {}) })
}

/**
 * Копіювати посаду
 * @param {object} ctx
 * @param {number} ctx.sourceID посада
 * @param {number} ctx.copyNumber кількість
 * @param {number} ctx.parentUnitID підпорядкування
 * @param {number} ctx.staffTableID наказ
 */
me.copyPosition = function (ctx) {
  const mParams = ctx.mParams
  if (!mParams.sourceID) return

  const onDate = dateService.shiftDate(mParams.onDate) || dateService.currentDate()
  const sourcePosition = UB.Repository('hr_position')
    .attrs('*')
    .misc({ __mip_ondate: onDate })
    .selectById(mParams.sourceID)
  const copyNumber = mParams.copyNumber ? parseInt(mParams.copyNumber) : 1
  if (sourcePosition) {
    const newPos = {}
    attrsToCopy.forEach(a => {
      newPos[a] = sourcePosition[a]
    })

    const store = UB.DataStore('hr_position')
    const maxNameLength = entityService.getFieldSize(store, 'nameNom') || 256
    const maxFullNameLength = entityService.getFieldSize(store, 'fullNameNom') || 500

    const copyNamesFromSource = settingsService.getByCode('hrCopyNamesFromSource', sourcePosition.orgID)
    if (!copyNamesFromSource) {
      const newCases = nameCaseService.getPositionNameCases(sourcePosition.dictPositionID, onDate, sourcePosition.orgID, mParams.parentUnitID, mParams.staffTableID)
      newCases.fullName = nameCaseService.getPositionFullName(sourcePosition.dictPositionID, onDate, sourcePosition.orgID, mParams.parentUnitID, mParams.staffTableID)
      newPos.fullName = nameCaseService.capitalize((newCases.fullName || sourcePosition.fullName || '').substring(0, maxFullNameLength))
      cases.forEach(_case => {
        newPos['name' + _case] = (newCases['name' + _case] || sourcePosition['name' + _case] || '').substring(0, maxNameLength) || null
        newPos['fullName' + _case] = (newCases['fullName' + _case] || sourcePosition['fullName' + _case] || '').substring(0, maxNameLength) || null
      })
    }
    const ds = UB.DataStore('hr_positionAccrual')

    const storeFs = UB.DataStore('hr_positionFundSource')
    const fundSource = UB.Repository('hr_positionFundSource')
      .attrs(['positionID', 'dictFundSourceID', 'quantity'])
      .where('positionID', '=', mParams.sourceID)
      .selectAsObject()

    newPos.parentUnitID = mParams.parentUnitID
    newPos.staffOrderID = mParams.staffTableID
    newPos.mi_dateFrom = onDate
    for (let i = 0; i < copyNumber; i++) {
      const newID = store.generateID()
      newPos.ID = newID
      newPos.mi_data_id = newID
      delete newPos.idxNum
      store.run('insert', {
        sourceID: sourcePosition['mi_data_id'],
        execParams: newPos
      })
      if (mParams.withAccruals) {
        const accrual = UB.Repository('hr_positionAccrual')
          .attrs([
            'positionID',
            'payElID',
            'accrualSum',
            'accrualRate',
            'calcSum',
            'dateFrom',
            'dateTo',
            'staffOrderID'
          ])
          .where('positionID', '=', mParams.sourceID).selectAsObject()
        accrual.forEach(item => {
          ds.run('insert', {
            skipRecalcFunds: true,
            skipUpdatePositionChangesState: true,
            execParams: {
              ID: ds.generateID(),
              positionID: newID,
              payElID: item.payElID,
              accrualSum: item.accrualSum,
              accrualRate: item.accrualRate,
              calcSum: item.calcSum,
              dateFrom: newPos.mi_dateFrom,
              dateTo: newPos.mi_dateTo || dateService.maxDateUTC(),
              staffOrderID: newPos.staffOrderID
            }
          })
        })
        const funds = staffService.calculatePositionFunds(newID, newPos['orgID'], newPos['accrualSum'] || 0, newPos['quantity'] || 0)
        store.run('update', {
          __skipOptimisticLock: true,
          __skipSelectAfterUpdate: true,
          skipBefore: true,
          execParams: {
            ID: newID,
            fundBasePay: funds.fundBase,
            fundAddPay: funds.fundAdd,
            fundOtherPay: funds.fundOther,
            fundTotal: funds.fundAll
          }
        })
      }
      fundSource.forEach(item => {
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
    }
  }
}

me.getFullName = function (ctx) {
  const mParams = ctx.mParams
  if (!mParams.dictPositionID || !mParams.orgID || !mParams.parentUnitID) return
  const fullName = nameCaseService.getPositionFullName(mParams.dictPositionID, dateService.shiftDate(mParams.onDate) || dateService.currentDate(), mParams.orgID, mParams.parentUnitID, mParams.staffOrderID, mParams.nameAddition)
  ctx.mParams.fullName = nameCaseService.removeDuplicateWords(fullName || '')
}

me.getNameCases = function (ctx) {
  const mParams = ctx.mParams
  const nameCases = nameCaseService.getPositionNameCases(mParams.dictPositionID, dateService.shiftDate(mParams.onDate), mParams.orgID, mParams.parentUnitID, mParams.staffOrderID, mParams.nameAddition)
  ctx.mParams.nameCases = JSON.stringify(nameCases)
}

me.joinPositionFundSource = function (ctx) {
  const mParams = ctx.mParams
  const targetPositionID = mParams.targetID
  const sourcePositionID = mParams.sourceID
  if (!targetPositionID || !sourcePositionID) return
  const onDate = dateService.shiftDate(mParams.onDate) || dateService.currentDate()
  const targetPos = UB.Repository(__entityName)
    .attrs(['ID', 'mi_data_id', 'quantity'])
    .selectById(targetPositionID)
  const sourcePos = UB.Repository(__entityName)
    .attrs(['ID', 'mi_data_id', 'mi_dateFrom', 'mi_dateTo'])
    .selectById(sourcePositionID)
  if (!targetPos) {
    throw new UB.UBAbort(`<<<${UB.i18n('Посаду-отримувач не знайдено')}>>>`)
  }
  if (!sourcePos) {
    throw new UB.UBAbort(`<<<${UB.i18n('Посаду не знайдено')}>>>`)
  }
  const targetFundSources = UB.Repository('hr_positionFundSource')
    .attrs(['ID', 'dictFundSourceID', 'quantity'])
    .where('positionID', '=', targetPositionID)
    .selectAsObject()
  let totalQuantity = targetFundSources.reduce((sum, item) => {
    return sum + accrualService.round(item.quantity)
  }, 0)
  const sourceFundSources = UB.Repository('hr_positionFundSource')
    .attrs(['ID', 'dictFundSourceID', 'quantity'])
    .where('positionID', '=', sourcePositionID)
    .selectAsObject()

  if (sourceFundSources.length) {
    const storeFs = UB.DataStore('hr_positionFundSource')
    const storePos = UB.DataStore('hr_position')
    sourceFundSources.forEach(item => {
      const fs = targetFundSources.find(o => o.dictFundSourceID === item.dictFundSourceID)
      totalQuantity += accrualService.round(item.quantity)
      if (fs) {
        storeFs.run('update', {
          __skipOptimisticLock: true,
          execParams: {
            ID: fs.ID,
            quantity: accrualService.round(fs.quantity + item.quantity)
          }
        })
      } else {
        storeFs.run('insert', {
          execParams: {
            ID: storeFs.generateID(),
            positionID: targetPositionID,
            dictFundSourceID: item.dictFundSourceID,
            quantity: item.quantity,
            isChanged: 0
          }
        })
      }
    })
    storePos.run('update', {
      __skipOptimisticLock: true,
      execParams: {
        ID: targetPositionID,
        quantity: totalQuantity
      }
    })
    storePos.run('update', {
      __skipOptimisticLock: true,
      execParams: {
        ID: sourcePositionID,
        mi_dateTo: sourcePos.mi_dateFrom,
        liquidate: 1
      }
    })
    const store = UB.DataStore('hr_employeePosition')
    const empPos = UB.Repository('hr_employeePositionS')
      .attrs('ID')
      .where('positionID', '=', sourcePos['mi_data_id'])
      .where('dateFrom', '<=', onDate, 'dateFrom')
      .where('dateTo', '>=', onDate, 'dateTo')
      .where('dateFrom', '>=', onDate, 'dateFuture')
      .where('isActive', '=', 1)
      .logic('(([dateFrom] and [dateTo]) or ([dateFuture]))')
      .selectAsObject()
    empPos.forEach(row => {
      store.run('update', {
        __skipOptimisticLock: true,
        execParams: {
          ID: row.ID,
          positionID: targetPos['mi_data_id']
        }
      })
    })
  }
}

me.updateAddDescription = function (ctx) {
  const positionID = ctx.mParams.positionID
  const store = UB.DataStore(__entityName)
  store.run('update', {
    __skipOptimisticLock: true,
    __skipSelectAfterUpdate: true,
    skipBefore: true,
    execParams: {
      ID: positionID,
      addDescrPosition: getAddDescription(positionID) || null
    }
  })
}

me.updateAllPosAddDescription = function (ctx) {
  const onDate = dateService.shiftDate(ctx.mParams.onDate)
  const orgID = ctx.mParams.orgID
  const posList = UB.Repository(__entityName)
    .attrs('ID')
    .where('orgID', '=', orgID || -1)
    .where('state', '=', 'ACTIVE')
    .misc({ __mip_ondate: onDate })
    .selectAsObject()
  const store = UB.DataStore(__entityName)
  posList.forEach(pos => {
    store.run('update', {
      __skipOptimisticLock: true,
      __skipSelectAfterUpdate: true,
      skipBefore: true,
      execParams: {
        ID: pos.ID,
        addDescrPosition: getAddDescription(pos.ID) || null
      }
    })
  })
}

me.updateFunds = function (ctx) {
  const positionID = ctx.mParams.positionID
  const posItem = UB.Repository('hr_position')
    .attrs(['ID', 'accrualSum', 'quantity', 'orgID'])
    .misc({ __mip_recordhistory_all: true })
    .selectById(positionID || -1)
  if (posItem) {
    const funds = staffService.calculatePositionFunds(positionID, posItem.orgID, posItem.accrualSum, posItem.quantity)
    UB.DataStore('hr_position').run('update', {
      __skipOptimisticLock: true,
      __skipSelectAfterUpdate: true,
      skipBefore: true,
      execParams: {
        ID: positionID,
        fundBasePay: funds.fundBase,
        fundAddPay: funds.fundAdd,
        fundOtherPay: funds.fundOther,
        fundTotal: funds.fundAll
      }
    })
  }
}

function getSum (value, rate, basePay) {
  return rate ? accrualService.round((basePay || 0) * rate / 100) : (value || 0)
}

me.updateAllPosFunds = function (ctx) {
  const onDate = dateService.shiftDate(ctx.mParams.onDate)
  const orgID = ctx.mParams.orgID
  const posList = UB.Repository(__entityName)
    .attrs(['ID', 'accrualSum', 'quantity'])
    .where('orgID', '=', orgID || -1)
    .where('state', '=', 'ACTIVE')
    .misc({ __mip_ondate: onDate })
    .selectAsObject()
  const dictTarifCoeffDet = UB.Repository('hr_dictTarifCoeffDet')
    .attrs(['dictTarifCoeffID', 'accrualSum', 'dateFrom', 'dateTo'])
    .orderBy('dictTarifCoeffID')
    .orderBy('dateFrom')
    .selectAsObject()
  dictTarifCoeffDet.forEach(row => {
    row.dateFrom = dateService.shiftDate(row.dateFrom)
    row.dateTo = dateService.shiftDate(row.dateTo)
  })
  const positionIDs = posList.map(o => o.ID)
  const calcAccrualType = settingsService.getByCode('hrCalcSumPosAccrual', orgID)
  const roundUpTo = settingsService.getByCode('hrRoundAccrualStaffTable', orgID)
  const store = UB.DataStore(__entityName)
  if (positionIDs.length) {
    if (calcAccrualType === 'ACCRUAL') {
      const positionData = staffService.getPlanSumByPosition({ onDate, orgID, positionIDs, dictTarifCoeffDet })
      const accrualStore = UB.DataStore('hr_positionAccrual')
      positionData.forEach(position => {
        position.payEl.forEach(accrual => {
          accrualStore.execSQL(`UPDATE hr_positionAccrual SET calcSum = :calcSum: WHERE ID = :ID:`, {
            ID: accrual.ID,
            calcSum: accrual.planSum || 0
          })
        })
      })
    } else {
      const accrData = UB.Repository('hr_positionAccrual')
        .attrs(['ID', 'positionID.mi_dateFrom', 'positionID.accrualSum', 'accrualSum', 'accrualRate', 'calcSum',
          'positionID.dictTarifCoeffID', 'payElID.methodID.code', 'payElID.dictTarifCoeffID'])
        .where('positionID', 'in', positionIDs)
        .selectAsObject()
      accrData.forEach(accrPosItem => {
        let calcSum = 0
        if (accrPosItem['payElID.methodID.code'] === '144') {
          const miDateFrom = dateService.shiftDate(accrData['positionID.mi_dateFrom'])
          const calcDictTarifCoeffID = accrPosItem['payElID.dictTarifCoeffID'] || accrPosItem['positionID.dictTarifCoeffID']
          const dictTarifCoeff = dictTarifCoeffDet.find(o => o.dictTarifCoeffID === calcDictTarifCoeffID && o.dateFrom <= (miDateFrom || onDate) && o.dateTo >= (miDateFrom || onDate)) || {}
          calcSum = getSum(accrPosItem.accrualSum, accrPosItem.accrualRate, (dictTarifCoeff.accrualSum || 0)) || 0
        } else {
          calcSum = getSum(accrPosItem.accrualSum, accrPosItem.accrualRate, accrPosItem['positionID.accrualSum']) || 0
        }
        store.execSQL(`UPDATE hr_positionAccrual SET calcSum = :calcSum: WHERE ID = :ID:`, {
          ID: accrPosItem.ID,
          calcSum
        })
      })
    }
  }

  const parentOrgID = settingsService.getByCode('hrUseReportSettingsParentOrg', orgID)
  const repParams = UB.Repository('hr_idParam')
    .attrs(['listParamID.code', 'valuesID'])
    .where('[listParamID.code]', 'in', ['FOZP', 'FDZP', 'ZKV'])
    .where('[orgID]', '=', Number(parentOrgID || orgID))
    .where('[listParamID.mi_deleteUser]', 'isNull')
    .selectAsObject()

  posList.forEach(pos => {
    const funds = staffService.calculatePositionFunds(pos.ID, pos.orgID, pos.accrualSum, pos.quantity, repParams, roundUpTo)
    store.run('update', {
      __skipOptimisticLock: true,
      __skipSelectAfterUpdate: true,
      skipBefore: true,
      execParams: {
        ID: pos.ID,
        fundBasePay: funds.fundBase,
        fundAddPay: funds.fundAdd,
        fundOtherPay: funds.fundOther,
        fundTotal: funds.fundAll
      }
    })
  })
}

me.getPlanSumByPosition = function (ctx) {
  const mParams = ctx.mParams
  const params = JSON.parse(mParams.params)
  params.onDate = dateService.shiftDate(params.onDate)
  const result = staffService.getPlanSumByPosition(params)
  mParams.resultData = JSON.stringify(result)
}
