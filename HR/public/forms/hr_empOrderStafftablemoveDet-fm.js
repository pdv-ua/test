/* global UB HR AC $App appAC Ext */
exports.formCode = {
  initComponentStart,
  postInit,
  setEmployeePositions,
  onCheckValidBeforeSaveForm,
  onFormDataReady,
  loadFromTariffication
}

function initComponentStart () {
  const me = this
  me.reportMode = 'view'
  me.gridConfig = {
    detailGrids: ['empOrderSTMovePosDet', 'empOrderTarifficationPosDet']
  }
  AC.acEditGridManager.init(me)

  me.on('formDataReady', onFormDataReady, me)
}

function onFormDataReady () {
  const me = this
  const entryDate = AC.dateService.truncTimeToUtcNull(me.masterForm.record.get('entryDate') || new Date())
  AC.viewUtils.setFilterValue(me.attr.staffTableID, {
    orderState: {
      value: ['POSTED'],
      condition: 'in'
    },
    orgID: me.record.get('organizationID') || appAC.globalOrganization(),
    entryDate: {
      value: entryDate,
      condition: '<='
    }
  })
  AC.viewUtils.setFilterValue(me.attr.staffTariffingID, {
    orderState: {
      value: ['POSTED'],
      condition: 'in'
    },
    orgID: me.record.get('organizationID') || appAC.globalOrganization(),
    entryDate: {
      value: entryDate,
      condition: '<='
    }
  })
  let tp = me.down('[ubID=tpDetail]')
  me.attr.staffTableID.setReadOnly(['ON_RECONCILATION', 'RECONCILED', 'POSTED'].includes(me.orderState))
  me.attr.staffTariffingID.setReadOnly(['ON_RECONCILATION', 'RECONCILED', 'POSTED'].includes(me.orderState))
  if (me.record.get('empOrderType') === 'STAFFTABLEMOVE_TARIF') {
    me.attr.staffTableID.hide()
    me.attr.staffTariffingID.show()
    me.attr.staffTableID.setAllowBlank(true)
    tp.items.items[0].tab.hide()
    tp.items.items[1].tab.show()
    me.down('[name=empOrderSTMovePosDet]').hide()
    me.down('[name=empOrderTarifficationPosDet]').show()
  } else {
    me.attr.staffTableID.show()
    me.attr.staffTariffingID.hide()
    me.attr.staffTariffingID.setAllowBlank(true)
    tp.items.items[0].tab.show()
    tp.items.items[1].tab.hide()
    me.down('[name=empOrderSTMovePosDet]').show()
    me.down('[name=empOrderTarifficationPosDet]').hide()
  }
}

function postInit (me) {
  if (me.customParams && me.customParams.orderForm) {
    me.masterForm = me.orderForm = me.customParams.orderForm
  } else {
    me.masterForm = me.orderForm = me.sender.up('form')
  }
  me.orderState = me.masterForm.record.get('orderState')
  if (me.isNewInstance) {
    if (me.customParams.empOrderType === 'STAFFTABLEMOVE_TARIF') {
      me.record.set('empOrderType', 'STAFFTABLEMOVE_TARIF')
    } else {
      me.record.set('empOrderType', 'STAFFTABLEMOVE')
    }
    me.record.set('orderID', me.masterForm.instanceID)
    me.record.set('organizationID', me.orderForm.record.get('organizationID'))
    HR.orderManager.setDefaultValues(me)
  }
  me.attr.empOrderSTMovePosDet.isReadOnly = ['ON_RECONCILATION', 'RECONCILED', 'POSTED'].includes(me.orderState)
  me.attr.empOrderTarifficationPosDet.isReadOnly = ['ON_RECONCILATION', 'RECONCILED', 'POSTED'].includes(me.orderState)
  me.on('beforeClose', function (a) {
    if (me.sender) {
      let grid = me.sender.onRefresh ? me.sender : (me.sender.panel && me.sender.panel.onRefresh) ? me.sender.panel : null
      if (grid) {
        grid.onRefresh()
      }
    }
  })
}

function onCheckValidBeforeSaveForm () {
  const me = this
  if (me.record.get('empOrderType') === 'STAFFTABLEMOVE' && !me.attr.empOrderSTMovePosDet.getStore().getCount()) {
    $App.dialogInfo(UB.i18n(`Неможливо зберегти, необхідно додати призначення.`))
    return Promise.resolve(false)
  }
  if (me.record.get('empOrderType') === 'STAFFTABLEMOVE_TARIF' && !me.attr.empOrderTarifficationPosDet.getStore().getCount()) {
    $App.dialogInfo(UB.i18n(`Неможливо зберегти, необхідно додати призначення.`))
    return Promise.resolve(false)
  }
  return Promise.resolve(true)
}

function setEmployeePositions (me) {
  if (['ON_RECONCILATION', 'RECONCILED', 'POSTED'].includes(me.orderState) || !me.record.get('staffTableID')) {
    return
  }
  $App.doCommand({
    cmdType: 'showForm',
    formCode: 'hr_empOrderStafftablemoveSearch',
    isModal: true,
    cmpInitConfig: {
      staffTableID: me.record.get('staffTableID'),
      onSelect: (data) => {
        me.setIsDirty(true)
        const addEmployeePosition = []
        Ext.suspendLayouts()
        me.attr.empOrderSTMovePosDet.suspendEvents()
        const store = me.attr.empOrderSTMovePosDet.getStore()
        const allRecords = store.snapshot || store.data
        data.forEach(row => {
          if (!allRecords.findBy(o => o.get('employeePositionID') === row.employeePositionID)) {
            addEmployeePosition.push({
              orderID: me.record.get('orderID'),
              paraID: me.instanceID,
              organizationID: me.record.get('organizationID'),
              employeeNumberID: row.employeeNumberID,
              employeeID: row.employeeID,
              empPosDateFrom: row.empPosDateFrom,
              'employeePositionID.employeeID.fullFIO': row['employeeID.fullFIO'],
              employeePositionID: row.employeePositionID,
              posName: row.posName,
              prevPosName: row.prevPosName,
              posFullName: row.posFullName,
              prevPosFullName: row.prevPosFullName,
              posFullNameNom: row.posFullNameNom,
              prevPosFullNameNom: row.prevPosFullNameNom,
              positionID: row.positionID,
              accrualSum: row.accrualSum,
              prevAccrualSum: row.prevAccrualSum,
              'employeePositionID.accrualSum': row.empPosAccrualSum,
              empOrderType: 'STAFFTABLEMOVE'
            })
          }
        })
        me.attr.empOrderSTMovePosDet.getStore().insert(allRecords.getCount(), addEmployeePosition)
        me.attr.empOrderSTMovePosDet.resumeEvents()
        Ext.resumeLayouts()
      }
    }
  })
}

function loadFromTariffication (me) {
  me.setLoading(true)
  $App.connection.run({
    entity: 'hr_staffTariffing',
    method: 'getStaffTariffingMoveEmployees',
    staffTariffingID: me.record.get('staffTariffingID')
  }).then(data => {
    Ext.suspendLayouts()
    me.attr.empOrderTarifficationPosDet.suspendEvents()
    me.setIsDirty(true)
    const store = me.attr.empOrderTarifficationPosDet.getStore()
    store.removeAll()
    const resultData = JSON.parse(data.resultData)
    resultData.forEach(row => {
      row.orderID = me.record.get('orderID')
      row.paraID = me.instanceID
      row.organizationID = me.record.get('organizationID')
      row.empOrderType = 'STAFFTABLEMOVE_TARIF'
      store.insert(store.data.length, row)
    })
    me.attr.empOrderTarifficationPosDet.resumeEvents()
    Ext.resumeLayouts()
  }).finally(() => {
    me.setLoading(false)
  })
}
