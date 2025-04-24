const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const calcService = require('../HR/modules/calcService')

me.entity.addMethod('updateDictKpiAccrualCond')
me.entity.addMethod('updatePayEl')

me.updateDictKpiAccrualCond = function (ctx) {
  const mParams = ctx.mParams
  const data = JSON.parse(mParams.data)
  const store = UB.DataStore('hr_dictKpiAccrualCond')
  const orgIDs = []
  let allOrg = false
  data.remove.forEach(ID => {
    if (mParams.conditionType === '1') {
      const org = UB.Repository('hr_dictKpiAccrualCond').attrs('orgID').selectById(ID)
      if (org && org.ID && !orgIDs.includes(org.ID)) {
        orgIDs.push(org.ID)
      }
    } else {
      allOrg = true
    }
    store.run('delete', { execParams: { ID: ID } })
    if (mParams.conditionType === '1' && !UB.Repository('hr_dictKpiAccrualCond').attrs(['COUNT(*)']).where('dictKpiAccrualID', '=', mParams.dictKpiAccrualID).where('conditionType', '=', '1').selectScalar()) {
      allOrg = true
    }
  })
  data.add.forEach(ID => {
    store.run('insert', {
      execParams: {
        dictKpiAccrualID: mParams.dictKpiAccrualID,
        conditionType: mParams.conditionType,
        orgID: mParams.conditionType === '1' ? ID : null,
        dictStaffCatID: mParams.conditionType === '2' ? ID : null,
        dictPositionID: mParams.conditionType === '3' ? ID : null,
        departmentID: mParams.conditionType === '4' ? ID : null,
        workPlace: mParams.conditionType === '5' ? ID : null,
        workerType: mParams.conditionType === '6' ? ID : null
      }
    })
    if (mParams.conditionType === '1') {
      if (!orgIDs.includes(ID)) {
        orgIDs.push(ID)
      }
    } else {
      allOrg = true
    }
  })
  if (allOrg) {
    calcService.addCalcQueue({ allOrganization: true, entityName: 'hr_dictKpiAccrual' })
  } else {
    orgIDs.forEach(orgID => {
      calcService.addCalcQueue({ orgID, entityName: 'hr_dictKpiAccrual' })
    })
  }
}

me.updatePayEl = function (ctx) {
  const mParams = ctx.mParams
  const data = JSON.parse(mParams.data)
  const dictKpiAccrualID = mParams.dictKpiAccrualID
  const store = UB.DataStore('hr_dictKpiAccrualPayEl')
  data.remove.forEach(ID => {
    store.run('delete', { execParams: { ID: ID } })
  })
  data.add.forEach(ID => {
    const record = UB.Repository('hr_dictKpiAccrualPayEl')
      .attrs('ID')
      .misc({ __allowSelectSafeDeleted: true })
      .where('dictKpiAccrualID', '=', dictKpiAccrualID)
      .where('payElID', '=', ID)
      .orderBy('ID')
      .selectSingle()
    if (record) {
      store.execSQL(`update hr_dictKpiAccrualPayEl set mi_deleteDate = '9999-12-31', mi_deleteUser = NULL where ID = :ID:`, { ID: record.ID })
    } else {
      store.run('insert', { execParams: {
        dictKpiAccrualID,
        payElID: ID
      } })
    }
  })

  const dictKpiAccrual = UB.Repository('hr_dictKpiAccrual').attrs('excludeOrg').selectById(dictKpiAccrualID)
  const excludeOrg = dictKpiAccrual.excludeOrg
  const orgList = getOrgList(dictKpiAccrualID, excludeOrg)
  if (orgList.length) {
    orgList.forEach(orgID => {
      calcService.addCalcQueue({ orgID, entityName: 'hr_dictKpiAccrual' })
    })
  } else {
    calcService.addCalcQueue({ allOrganization: true, entityName: 'hr_dictKpiAccrual' })
  }
}

function getOrgList (dictKpiAccrualID, excludeOrg) {
  let orgList = UB.Repository('hr_dictKpiAccrualCond')
    .attrs('orgID')
    .where('dictKpiAccrualID', '=', dictKpiAccrualID)
    .where('conditionType', '=', '1')
    .selectAsObject({ 'orgID': 'ID' })
  if (!orgList.length) return []
  if (excludeOrg) {
    orgList = UB.Repository('ac_organization')
      .attrs('ID')
      .where('ID', 'notIn', orgList.map(o => o.ID))
      .selectAsObject()
  }
  return orgList.map(o => o.ID)
}
