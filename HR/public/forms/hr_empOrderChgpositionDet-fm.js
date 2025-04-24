/* global HR AC $App appAC UB */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  postInit,
  setEmployeePositions,
  onCheckValidBeforeSaveForm,
  onControlChanged,
  beforeGridEdit,
  onValidateEdit,
  onRecordLoaded
}

function initComponentStart () {
  const me = this
  me.reportMode = 'view'
  me.gridConfig = {
    detailGrids: ['empOrderChgPositionAttrsDet', 'empOrderChgPositionEmpDet']
  }

  me.on('recordloaded', onRecordLoaded, me)
  me.on('beforeClose', function (a) {
    AC.gridUtils.refreshSenderUBGrid(me)
  })
  AC.acEditGridManager.init(me)
  me.isEditable = function isEditable () {
    const me = this
    if (me.masterForm && me.masterForm.record) {
      const newState = me.masterForm.record.get('orderState')
      return ['PROJECT', 'ON_COMPLETION'].includes(newState) && AC.entityUtils.verifyRightsMethod(me.entityName, 'update')
    }
    return true
  }
}

function initComponentDone () {
  const me = this
  me.on('controlChanged', onControlChanged, me)
}

function postInit (me) {
  if (me.customParams && me.customParams.orderForm) {
    me.masterForm = me.orderForm = me.customParams.orderForm
  } else {
    me.masterForm = me.orderForm = me.sender.up('form')
  }
  me.orderState = me.masterForm.record.get('orderState')
  const allowedActions = []
  if (AC.entityUtils.verifyRightsMethod(me.entityName, 'canUpdateEmployeePosition')) {
    allowedActions.push('UPDATE')
  }
  if (AC.entityUtils.verifyRightsMethod(me.entityName, 'canCreateEmployeePosition')) {
    allowedActions.push('CREATE')
  }
  if (me.isNewInstance) {
    me.record.set('empOrderType', 'CHGPOSITION')
    me.record.set('orderID', me.masterForm.instanceID)
    if (allowedActions.includes('CREATE')) me.record.set('actionType', 'CREATE')
    me.record.set('organizationID', me.orderForm.record.get('organizationID'))
    HR.orderManager.setDefaultValues(me)
  }
  const isReadOnly = ['ON_RECONCILATION', 'RECONCILED', 'POSTED'].includes(me.orderState) || (!me.masterForm || !me.masterForm.allowChangeDocument())
  me.attr.empOrderChgPositionAttrsDet.setReadOnly(isReadOnly)
  me.attr.empOrderChgPositionEmpDet.setReadOnly(isReadOnly)
  if (isReadOnly) {
    me.attr.empOrderChgPositionAttrsDet.onItemDoubleClick = function () {}
    AC.viewUtils.setFormReadOnly(me, true)
    me.actions.fDelete.setDisabled(true)
  }

  setPlanDateState(me, me.record.get('isTemporary'))
  setControlsByActionType(me, me.record.get('actionType'))

  if (!isReadOnly) {
    me.attr['actionType'].store.filter({
      filterFn: function (item) { return allowedActions.includes(item.get('code')) }
    })
  }

  /*me.on('beforeClose', function (a) {
    if (me.sender) {
      let grid = me.sender.onRefresh ? me.sender : (me.sender.panel && me.sender.panel.onRefresh) ? me.sender.panel : null
      if (grid) {
        grid.onRefresh()
      }
    }
  })*/
}

function onCheckValidBeforeSaveForm () {
  const me = this
  if (!me.attr.empOrderChgPositionEmpDet.getStore().getCount()) {
    $App.dialogInfo(UB.i18n(`Неможливо зберегти, необхідно додати призначення.`))
    return Promise.resolve(false)
  } else if (!me.attr.empOrderChgPositionAttrsDet.getStore().getCount()) {
    $App.dialogInfo(UB.i18n(`Неможливо зберегти, необхідно додати параметри зміни.`))
    return Promise.resolve(false)
  } else {
    const attr = me.attr.empOrderChgPositionAttrsDet.getStore().data.items[0]
    let description = ''
    if (me.record.get('actionType') === 'CREATE') {
      description = UB.i18n('З ') + AC.dateService.formatDate(me.record.get('dateFrom'))
      if (me.record.get('isTemporary')) {
        description += UB.i18n(' по ') + AC.dateService.formatDate(me.record.get('planDateTo'))
      }
    }
    description += `, ${attr.get('dictEmpPosAttrID.name')} - "${attr.get('newValueText') || ''}"`
    const store = me.attr.empOrderChgPositionEmpDet.getStore()
    me.attr.empOrderChgPositionEmpDet.getData().forEach((data, idx) => {
      const record = store.getAt(idx)
      record.set('description', description)
    })
    return Promise.resolve(true)
  }
}

function setEmployeePositions (me) {
  if (['ON_RECONCILATION', 'RECONCILED', 'POSTED'].includes(me.orderState)) {
    return
  }
  const store = me.attr.empOrderChgPositionEmpDet.getStore()
  HR.orderManager.empOrderEmployeeSearch({
    selected: store.data.items.map(o => o.get('employeePositionID')),
    orgID: me.record.get('organizationID'),
    onDate: AC.dateService.truncTimeToUtcNull(me.record.get('dateFrom') || appAC.globalApplicationDate()),
    entityID: me.instanceID,
    onSelectData: (data, isDelete) => {
      me.setIsDirty(true)
      if (isDelete) me.attr.empOrderChgPositionEmpDet.removeAll()
      const addEmployeePosition = []
      const store = me.attr.empOrderChgPositionEmpDet.getStore()
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
            employeePositionID: row.employeePositionID,
            'employeePositionID.description': row.description,
            firstName: row['employeeID.firstName'],
            lastName: row['employeeID.lastName'],
            middleName: row['employeeID.middleName'],
            empOrderType: me.record.get('empOrderType'),
            title: row.posName
          })
        }
      })
      me.attr.empOrderChgPositionEmpDet.getStore().insert(allRecords.getCount(), addEmployeePosition)
    }
  })
}

function setPlanDateState (me, enabled) {
  me.attr.planDateTo.setDisabled(!enabled)
  me.attr.planDateTo.setAllowBlank(!enabled)
  if (!enabled) me.attr.planDateTo.setValue()
}

function setControlsByActionType (me, value) {
  if (value === 'UPDATE') {
    me.attr.dateFrom.setValue()
    me.attr.isTemporary.setValue(false)
  }
  me.attr.dateFrom.setAllowBlank(value === 'UPDATE')
  me.attr.dateFrom.setDisabled(value === 'UPDATE')
  me.attr.isTemporary.setDisabled(value === 'UPDATE')
}

function onControlChanged (field, value) {
  const me = this
  switch (field.name) {
    case 'isTemporary':
      setPlanDateState(me, value)
      break
    case 'actionType':
      setControlsByActionType(me, value)
      break
  }
}

function beforeGridEdit (control, context) {
  const me = this
  if (['ON_RECONCILATION', 'RECONCILED', 'POSTED'].includes(me.record.get('orderState'))) {
    return false
  }
  AC.viewUtils.setWhereListProperty(context.column.field, [
    [ 'organizationID', '=', me.record.get('organizationID') ],
    [ 'dateFrom', '<=', me.record.get('dateFrom') || appAC.globalApplicationDate() ],
    [ 'dateTo', '>=', me.record.get('dateFrom') || appAC.globalApplicationDate() ]
  ])
  context.column.field.on('change', (ctrl) => {
    context.record.set('orderID', me.record.get('orderID'))
    context.record.set('paraID', me.instanceID)
    context.record.set('organizationID', me.record.get('organizationID'))
    context.record.set('employeeNumberID', ctrl.getFieldValue('employeeNumberID'))
    context.record.set('employeeID', ctrl.getFieldValue('employeeID'))
    context.record.set('empOrderType', me.record.get('empOrderType'))
    context.record.set('employeePositionID.description', ctrl.getFieldValue('description'))
    context.record.set('firstName', ctrl.getFieldValue('employeeID.firstName'))
    context.record.set('lastName', ctrl.getFieldValue('employeeID.lastName'))
    context.record.set('middleName', ctrl.getFieldValue('employeeID.middleName'))
    context.record.set('title', ctrl.getFieldValue('posName'))
  })
}

function onValidateEdit (editor, context) {
  const data = context.grid.getData()
  if (data.find(o => o.employeePositionID === context.column.field.getFieldValue('ID'))) {
    AC.viewUtils.showToast(UB.i18n(`Працівника {0} вже додано до наказу!`, context.column.field.getValue()))
    const store = context.grid.getStore()
    store.data.items.forEach(item => {
      if (!item.get('employeePositionID')) {
        store.remove(item)
      }
    })
    return false
  }
}

function onRecordLoaded (record, data) {
  const me = this
  me.orderState = (me.masterForm && me.masterForm.record.get('orderState')) || 'POSTED'
  let isProject = me.orderState === 'PROJECT'
  if (isProject && !me.isNextRecordMakerExists) {
    me.isNextRecordMakerExists = true
    HR.orderManager.setNextRecordMaker(me, [
      'dictReasonDismID',
      {
        isExternal: value => value,
        bonusID: value => value,
        organizationID: value => me.masterForm.record.get('organizationID'),
        empOrderType: value => value,
        orderID: value => value
      }
    ], 4)
  }
}
