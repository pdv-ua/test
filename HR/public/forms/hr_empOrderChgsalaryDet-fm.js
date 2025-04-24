/* global  HR AC $App UB Ext appAC */
exports.formCode = {
  initComponentStart,
  onBeforeSetLocalStoreData,
  postInit,
  setEmployeePositions,
  setAccrualSumByTarif,
  setAccrualSumByPosition,
  onCheckValidBeforeSaveForm,
  onFormDataReady,
  isAccrualSumAlreadySet
}

function initComponentStart () {
  const me = this
  me.reportMode = 'view'
  me.gridConfig = {
    detailGrids: ['empOrderChgSalPosDet']
  }
  AC.acEditGridManager.init(me)

  me.on('formDataReady', onFormDataReady, me)
}

function onBeforeSetLocalStoreData (me, detail) {
  me.attr.dateFrom.setReadOnly(!!detail.length)
}

function onFormDataReady () {
  const me = this
  me.attr.dictReasonAccrualID.setReadOnly(['ON_RECONCILATION', 'RECONCILED', 'POSTED'].includes(me.orderState))
}

function postInit (me) {
  if (me.customParams && me.customParams.orderForm) {
    me.masterForm = me.orderForm = me.customParams.orderForm
  } else {
    me.masterForm = me.orderForm = me.sender.up('form')
  }
  me.orderState = me.masterForm.record.get('orderState')
  if (me.isNewInstance) {
    me.record.set('empOrderType', 'CHGSALARYEMP')
    me.record.set('orderID', me.masterForm.instanceID)
    me.record.set('dateFrom', AC.dateService.truncTimeToUtcNull(me.orderForm.record.get('orderDate') || new Date()))
    me.record.set('organizationID', me.orderForm.record.get('organizationID'))
    HR.orderManager.setDefaultValues(me)
  }
  me.attr.empOrderChgSalPosDet.isReadOnly = ['ON_RECONCILATION', 'RECONCILED', 'POSTED'].includes(me.orderState)
  me.on('beforeClose', function (a) {
    if (me.sender) {
      let grid = me.sender.onRefresh ? me.sender : (me.sender.panel && me.sender.panel.onRefresh) ? me.sender.panel : null
      if (grid) {
        grid.onRefresh()
      }
    }
  })
  me.attr.empOrderChgSalPosDet.on('changeData', (grid) => {
    me.attr.dateFrom.setReadOnly(!!grid.getStore().count())
  })
}
function onCheckValidBeforeSaveForm () {
  const me = this
  if (!me.attr.empOrderChgSalPosDet.getStore().getCount()) {
    $App.dialogInfo(UB.i18n(`Неможливо зберегти, необхідно додати призначення.`))
    return Promise.resolve(false)
  } else {
    const store = me.attr.empOrderChgSalPosDet.getStore()
    let data = me.attr.empOrderChgSalPosDet.getData()
    const cnt = data.reduce((cnt, item) => item.accrualSum ? ++cnt : cnt, 0)
    if (cnt === 0) {
      $App.dialogInfo(UB.i18n(`Увага! Жодному працівнику не вказано новий оклад, дані не будуть збережені`))
      return Promise.resolve(false)
    }
    Ext.suspendLayouts()
    me.attr.empOrderChgSalPosDet.suspendEvents()
    store.suspendEvents()
    data = me.attr.empOrderChgSalPosDet.getData()
    for (let row = data.length - 1; row >= 0; --row) {
      if (data[row].accrualSum === null || data[row].accrualSum === '') {
        me.attr.empOrderChgSalPosDet.removeDataRow(data[row], row)
      }
    }
    me.attr.empOrderChgSalPosDet.resumeEvents()
    store.resumeEvents()
    Ext.resumeLayouts(true)
    me.attr.empOrderChgSalPosDet.getView().refreshView()
    return Promise.resolve(true)
  }
}
function setEmployeePositions (me) {
  if (['ON_RECONCILATION', 'RECONCILED', 'POSTED'].includes(me.orderState) || !me.attr.dateFrom.isValid() || !me.attr.dateFrom.getValue()) {
    return
  }
  const store = me.attr.empOrderChgSalPosDet.getStore()
  HR.orderManager.empOrderEmployeeSearch({
    selected: store.data.items.map(o => o.get('employeePositionID')),
    orgID: me.record.get('organizationID'),
    onDate: AC.dateService.truncTimeToUtcNull(me.record.get('dateFrom') || appAC.globalApplicationDate()),
    entityID: me.instanceID,
    onSelectData: (data, isDelete) => {
      me.setIsDirty(true)
      if (isDelete) me.attr.empOrderChgSalPosDet.removeAll()
      const addEmployeePosition = []
      const allRecords = store.snapshot || store.data
      me.setLoading(true)
      UB.Repository('hr_employeePositionS')
        .attrs(['ID', 'dateFrom', 'employeeNumberID', 'employeeID', 'description', 'posName', 'positionID',
          'posAccrualSum', 'accrualSum', 'posDateFrom', 'contractType', 'contractType.name', 'dictPositionID',
          'dictPositionValue'])
        .where('ID', 'in', data.map(o => o.employeePositionID))
        .selectAsObject({
          'ID': 'employeePositionID',
          'accrualSum': 'previousAccrualSum'
        }).then(data => {
          data.forEach(row => {
            if (!allRecords.findBy(o => o.get('employeePositionID') === row.employeePositionID)) {
              addEmployeePosition.push({
                orderID: me.record.get('orderID'),
                paraID: me.instanceID,
                organizationID: me.record.get('organizationID'),
                employeeNumberID: row.employeeNumberID,
                employeeID: row.employeeID,
                empPosDateFrom: row.dateFrom,
                'employeePositionID.description': row['description'],
                employeePositionID: row.employeePositionID,
                posName: row.posName,
                positionID: row.positionID,
                posAccrualSum: row.posAccrualSum,
                posDateFrom: row.posDateFrom,
                'employeePositionID.contractType.name': row['contractType.name'],
                previousAccrualSum: row.previousAccrualSum,
                empOrderType: 'CHGSALARYEMP',
                'employeePositionID.dictPositionID': row.dictPositionID,
                'employeePositionID.dictPositionValue': row.dictPositionValue
              })
            }
          })
          me.attr.dateFrom.setReadOnly(allRecords.getCount() || addEmployeePosition.length)
          me.attr.empOrderChgSalPosDet.getStore().insert(allRecords.getCount(), addEmployeePosition)
          me.setLoading(false)
        }, err => {
          me.setLoading(false)
          throw err
        })
    }
  })
}

function askPromise (me) {
  return me.isAccrualSumAlreadySet() ? $App.dialogYesNo(UB.i18n('Увага'), UB.i18n('Встановлені значення окладів будуть очищені. Продовжити?')) : Promise.resolve(true)
}

function setAccrualSumByTarif (me) {
  const store = me.attr.empOrderChgSalPosDet.getStore()
  const allRecords = store.snapshot || store.data

  const employeePositionIDs = []
  allRecords.each(record => {
    if (record.get('employeePositionID')) {
      employeePositionIDs.push(record.get('employeePositionID'))
    }
  })
  if (employeePositionIDs.length) {
    askPromise(me).then(result => {
      if (result) {
        me.setLoading(true)
        UB.Repository('hr_employeePositionS')
          .attrs(['ID', 'dictTarifCoeffID'])
          .where('ID', 'in', employeePositionIDs)
          .selectAsObject()
          .then(employeePositions => {
            const dictTarifCoeffIDs = []
            employeePositions.forEach(row => {
              if (row.dictTarifCoeffID && !dictTarifCoeffIDs.find(o => o === row.dictTarifCoeffID)) {
                dictTarifCoeffIDs.push(row.dictTarifCoeffID)
              }
            })
            if (dictTarifCoeffIDs.length) {
              me.setIsDirty(true)
              UB.Repository('hr_dictTarifCoeffDet')
                .attrs(['dictTarifCoeffID', 'accrualSum'])
                .where('dictTarifCoeffID', 'in', dictTarifCoeffIDs)
                .where('dateFrom', '<=', AC.dateService.truncTimeToUtcNull(me.record.get('dateFrom')))
                .where('dateTo', '>=', AC.dateService.truncTimeToUtcNull(me.record.get('dateFrom')))
                .selectAsObject()
                .then(dictTarifCoeffs => {
                  Ext.suspendLayouts()
                  me.attr.empOrderChgSalPosDet.suspendEvents()
                  store.suspendEvents()
                  allRecords.each(record => {
                    const employeePosition = employeePositions.find(o => o.ID === record.get('employeePositionID'))
                    if (employeePosition && employeePosition.dictTarifCoeffID) {
                      const dictTarifCoeff = dictTarifCoeffs.find(o => o.dictTarifCoeffID === employeePosition.dictTarifCoeffID)
                      if (dictTarifCoeff) {
                        record.set('accrualSum', dictTarifCoeff.accrualSum)
                      }
                    }
                  })
                  me.setLoading(false)
                  me.attr.empOrderChgSalPosDet.resumeEvents()
                  store.resumeEvents()
                  Ext.resumeLayouts(true)
                  me.attr.empOrderChgSalPosDet.getView().refreshView()
                })
            } else {
              me.setLoading(false)
              $App.dialogInfo(UB.i18n('У переліку відсутні призначення з окладами по тарифним розрядам'))
            }
          })
      }
    })
  }
}

function setAccrualSumByPosition () {
  const me = this
  const store = me.attr.empOrderChgSalPosDet.getStore()
  const allRecords = store.snapshot || store.data

  askPromise(me).then(result => {
    if (result) {
      Ext.suspendLayouts()
      me.attr.empOrderChgSalPosDet.suspendEvents()
      store.suspendEvents()
      allRecords.each(record => {
        const newAccrualSum = record.get('posAccrualSum')
        if (newAccrualSum) {
          record.set('accrualSum', newAccrualSum)
        }
      })
      me.setLoading(false)
      me.attr.empOrderChgSalPosDet.resumeEvents()
      store.resumeEvents()
      Ext.resumeLayouts(true)
      me.attr.empOrderChgSalPosDet.getView().refreshView()
    }
  })
}

function isAccrualSumAlreadySet () {
  const me = this
  const store = me.attr.empOrderChgSalPosDet.getStore()
  const allRecords = store.snapshot || store.data
  return !!allRecords.find(o => !!o.get('accrualSum'))
}
