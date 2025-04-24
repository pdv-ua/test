/* global Ext $App UB AC HR appAC _ */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onClose,
  addBaseActions,
  onRecordLoaded,
  onFormDataReady,
  controlChanged
}

function initComponentStart () {
  const me = this
  me.on('formDataReady', onFormDataReady, me)
  me.on('controlChanged', controlChanged, me)
  me.on('recordloaded', onRecordLoaded, me)

  me.mainAttrs = ['idxNum', 'name', 'nameEng', 'fullName', 'dictAreasActivityID', 'parentUnitTypeID', 'jurisdiction',
    'dictGovernmTypeID', 'tarifGroupID', 'powerBranch', 'taxCode', 'limitEmpDocBasis', 'limitEmpCivServ', 'limitEmpNum',
    'doNotTransfer', 'conditionalName', 'shortName', 'dictFundSourceID', 'depClassExpID', 'webAddress','dictOrgGroupId']
  me.caseAttrName = ['nameNom', 'nameGen', 'nameDat', 'nameAcc', 'nameOr', 'nameLoc', 'nameVoc']
  me.regAttrs = ['hkved', 'hkoatuu', 'hkopfg', 'hkou', 'FCCUCode', 'kpol', 'riv', 'dgoznNpr', 'decisionDate', 'decisionNumber',
    'hkvedS', 'hkoatuuS', 'hkopfgS', 'hkouS', 'FCCUName', 'dictSprStiID', 'dictDksuID', 'ECBCode', 'classRisk', 'FSZIAddress',
  'showGlobal']
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
  createActions(me)
}

function onClose () {
  const me = this
  if (me.afterClose) {
    me.afterClose()
  }
}

function addBaseActions () {
  const me = this
  me.callParent(arguments)
  let { createNewVersion } = me.actions
  if (!createNewVersion) {
    createNewVersion = new Ext.Action({
      actionId: 'createNewVersion',
      eventId: 'createNewVersion',
      iconCls: 'iconCreateDoc',
      text: UB.i18n('Внести зміни'),
      hidden: true,
      handler: function () {
        HR.treeUtils.newVersionOrg(me.instanceID)
      },
      scope: me
    })
    me.actions.createNewVersion = createNewVersion
  }
}

function createActions (me) {
  const tb = me.down('toolbar')
  const allActions = tb && tb.query('[menuId=AllActions]')[0]
  if (!allActions) { return }
  if (!AC.entityUtils.verifyRightsMethod(me.entityName, 'allowEditAll') && !AC.entityUtils.verifyRightsMethod(me.entityName, 'allowEditOwn')) {
    return
  }

  const customReadOnly = me.customSettings && me.customSettings.readOnly
  if (!customReadOnly) {
    allActions.menu.add({
      xtype: 'menuseparator'
    })
    allActions.menu.add({
      text: UB.i18n('Редагувати'),
      name: 'actionAllowEdit',
      iconCls: 'iconEdit',
      handler: function () {
        if (!AC.entityUtils.verifyRightsMethod(me.entityName, 'allowEditAll') && !AC.entityUtils.verifyRightsMethod(me.entityName, 'allowEditOwn')) {
          $App.dialogError(UB.i18n('Недостатньо прав для редагування'))
        } else if (AC.entityUtils.verifyRightsMethod(me.entityName, 'allowEditOwn') && me.record.get('state') !== 'NEW' && !$App.connection.userData().userOrg.some(org => org === me.record.get('mi_data_id'))) {
          $App.dialogError(UB.i18n('Організація недоступна для редагування'))
        } else {
          me.mainAttrs.forEach(ctrlName => {
            me.attr[ctrlName].setReadOnly(false)
          })
          me.caseAttrName.forEach(ctrlName => {
            me.attr[ctrlName].setReadOnly(false)
          })
          me.regAttrs.forEach(ctrlName => {
            me.attr[ctrlName].setReadOnly(false)
          })
          me.query('ubdetailgrid').forEach(grid => {
            if (grid.name === 'addressesDetail') {
              grid.setReadOnly(false)
            }
            if (grid.name === 'orgAccountDetail') {
              grid.setReadOnly(me.record.get('state') !== 'ACTIVE')
            }
          })
        }
      }
    })
  }
}

function onRecordLoaded (record) {
  const me = this
  if (me.isNewInstance && me.defaultValues) {
    _.forEach(me.defaultValues, (value, name) => {
      me.record.set(name, value)
    })
  }

  const miDataId = me.record.get('mi_data_id')
  if (!miDataId) {
    me.record.set('mi_data_id', me.instanceID)
  }
  me.attr.parentUnitID.setDisabled(!record.get('staffOrderID'))

  let onDate = appAC.globalApplicationDate()
  HR.treeUtils.getOrgPosCount({ dataItem: { mi_data_id: miDataId }, onDate: onDate }).then(item => {
    const posQuantity = me.down('[name=posQuantity]')
    posQuantity.setText(item.quantity)
    return HR.treeUtils.getOrgEmpPosCount({ dataItem: { mi_data_id: miDataId }, onDate: onDate })
  }).then(item => {
    const empPosQuantity = me.down('[name=empPosQuantity]')
    empPosQuantity.setText(item.quantity)
  })
}

function onFormDataReady () {
  const me = this
  me.attr.limitEmpCivServ.setMaxValue(9999999999)
  me.attr.limitEmpNum.setMaxValue(9999999999)
  const isCanEdit = AC.entityUtils.verifyRightsMethod(me.entityName, 'allowEditAll') ||
    (AC.entityUtils.verifyRightsMethod(me.entityName, 'allowEditOwn') &&
      ($App.connection.userData().userOrg.some(org => org === me.record.get('mi_data_id') || me.record.get('state') === 'NEW'))
    )
  const readOnly = !me.isNewInstance && (me.record.get('state') === 'ACTIVE' || me.record.get('staffOrderID.orderState') === 'POSTED' || !isCanEdit) && !me.isDirectCreate
  AC.viewUtils.setFormReadOnly(
    me,
    readOnly,
    me.isDirectCreate ? ['staffOrderID', 'entryOrderID'] : ['mi_dateFrom', 'dateToEmpty', 'staffOrderID', 'entryOrderID']
  )
  me.query('ubdetailgrid').forEach(grid => {
    if (grid.name !== 'basicFunc') {
      grid.setReadOnly(readOnly)
    } else {
      grid.setReadOnly(!isCanEdit)
    }
    if (grid.name === 'orgAccountDetail') {
      grid.setReadOnly((me.record.get('state') === 'NEW' && me.record.get('mi_data_id') === me.instanceID) || !isCanEdit)
    }
  })

  AC.viewUtils.setFilterValue(me.attr.staffOrderID, { orderState: 'PROJECT' })
  if (me.record.get('staffOrderID.entryDate')) {
    AC.viewUtils.setWhereListProperty(me.attr.parentUnitID,
      [
        ['state', '=', 'ACTIVE', 'active'],
        ['state', '=', 'NEW', 'new'],
        ['mi_dateFrom', '<=', AC.dateService.shiftDate(me.record.get('staffOrderID.entryDate'))],
        ['mi_dateTo', '>', AC.dateService.shiftDate(me.record.get('staffOrderID.entryDate'))],
        ['staffOrderID', '=', me.record.get('staffOrderID'), 'order'],
        ['mi_data_id', '!=', me.record.get('mi_data_id')]
      ],
      ['([active] OR ([new] AND [order]))']
    )
  }
  me.actions.createNewVersion.setDisabled(!readOnly)

  me.storedData = {}

  me.caseAttrName.forEach(attrName => {
    me.storedData[attrName] = me.record.get(attrName)
  })
}

function controlChanged (field, value) {
  const me = this
  if (me.formDataReady) {
    switch (field.name) {
      case 'staffOrderID':
        me.attr.mi_dateFrom.setValue(field.getFieldValue('entryDate'))
        if (value) {
          const entryDate = AC.dateService.shiftDate(field.getFieldValue('entryDate'))
          let clearValue = true
          if (me.attr.parentUnitID.getValue() &&
            ((new Date(me.attr.parentUnitID.getFieldValue('mi_dateFrom')) <= entryDate) &&
              (me.attr.parentUnitID.getFieldValue('state') === 'ACTIVE' || me.attr.parentUnitID.getFieldValue('staffOrderID') === value))
          ) {
            clearValue = false
          }
          AC.viewUtils.setWhereListProperty(me.attr.parentUnitID,
            [
              ['state', '=', 'ACTIVE', 'active'],
              ['state', '=', 'NEW', 'new'],
              ['mi_dateFrom', '<=', entryDate],
              ['mi_dateTo', '>', entryDate],
              ['staffOrderID', '=', value, 'order'],
              ['mi_data_id', '!=', me.record.get('mi_data_id')]
            ],
            ['([active] OR ([new] AND [order]))'],
            clearValue ? ['clearWhereList', 'clearValue', 'clearStore'] : []
          )
        }
        me.attr.parentUnitID.setDisabled(!value)
        break
      case 'name':
        me.attr.fullName.setValue(value)
        if (!me.storedData.nameNom) me.attr.nameNom.setValue(value)
        if (!me.storedData.nameGen) me.attr.nameGen.setValue(value)
        if (!me.storedData.nameDat) me.attr.nameDat.setValue(value)
        if (!me.storedData.nameAcc) me.attr.nameAcc.setValue(value)
        if (!me.storedData.nameOr) me.attr.nameOr.setValue(value)
        if (!me.storedData.nameLoc) me.attr.nameLoc.setValue(value)
        if (!me.storedData.nameVoc) me.attr.nameVoc.setValue(value)
        break
    }
  }
}
