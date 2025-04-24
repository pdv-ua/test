/* global AC UB HR Ext $App _ appAC */
exports.formCode = {
  initComponentStart,
  initUBComponent,
  initComponentDone,
  enableControls,
  doFormDataReady,
  onCheckValidBeforeSaveForm,
  onBeforeSetLocalStoreData,
  beforeGridEdit,
  setExperience
}

function initComponentDone () {
  createActions(this)
  if (AC.entityUtils.isAdmin()) {
    createDevFormActions(this)
  }
}

function initUBComponent () {
  const me = this
  me.sender = me.gridSender
  HR.orderManager.setNextRecordMaker(me, [{
    employeeID: value => me.record.get('employeeID')
  }], 4)
}

function createActions (me) {
  const isAdmin = HR.orderManager.isAdmin()
  if (!isAdmin && !$App.domainInfo.isEntityMethodsAccessible('hr_employeeWorkbook', 'accWorkbookEditAlways')) {
    return
  }
  const tb = me.down('toolbar')
  const allActions = tb && tb.query('[menuId=AllActions]')[0]
  if (!allActions) {
    return
  }

  allActions.menu.add({
    xtype: 'menuseparator'
  })

  allActions.menu.add({
    text: UB.i18n('Редагувати'),
    name: 'actionAllowEdit',
    disabled: !$App.domainInfo.isEntityMethodsAccessible('hr_employeeWorkbook', 'accWorkbookEditAlways'),
    handler: function () {
      let editable = ['workPosition', 'description', 'baseDocument', 'dateTrialEnd', 'isOrgAppoint', 'isOrgDismiss', 'dateFrom']
      editable.forEach(ctrlName => {
        me.attr[ctrlName].setReadOnly(false)
      })
      Ext.defer(() => {
        me.attr.workPosition.focus()
      }, 1)
    }
  })

  me.actionRegenerateName = allActions.menu.add({
    text: UB.i18n('Оновити назву'),
    name: 'actionRegenerateName',
    handler: function () {
      const posID = me.record.get('employeePositionID.positionID')
      if (!posID) {
        return
      }
      $App.connection.run({
        entity: 'hr_employeeWorkbook',
        method: 'getPositionFullName',
        employeePositionID: me.record.get('employeePositionID'),
        onDate: appAC.globalApplicationDate()
      }).then(mParams => {
        if (mParams.positionFullName) {
          me.record.set('workPosition', mParams.positionFullName)
        }
      })
      /*
      let onDate = appAC.globalApplicationDate()
      UB.Repository('hr_position')
        .attrs('fullNameNom')
        .where('mi_data_id', '=', posID)
        .where('mi_dateFrom', '<=', onDate)
        .where('mi_dateTo', '>=', onDate)
        .where('state', '=', 'ACTIVE')
        .selectScalar().then(value => {
          value && me.record.set('workPosition', value)
        })
      */
    }
  })
}

function initComponentStart () {
  let me = this
  me.on('formDataReady', doFormDataReady, me)
  me.on('controlChanged', onControlChanged, me)

  me.gridConfig = {
    detailGrids: ['employeeWorkbookDt']
  }
  AC.acEditGridManager.init(me)
  HR.orderManager.createShowImportAction(me)
}

function onCheckValidBeforeSaveForm () {
  const me = this
  if (!me.record.get('isManualWorkPlace')) {
    let orgName = me.getField('organizationID').getFieldValue('name')
    me.attr.workPlace.setValue(orgName)
    me.record.set('workPlace', orgName)
  } else {
    me.record.set('organizationID', null)
  }
  return Promise.resolve(true)
}

function doFormDataReady () {
  const me = this
  if (me.isNewInstance && me.defaultValues) {
    _.forEach(me.defaultValues, (value, name) => {
      me.record.set(name, value)
    })
  }
  if (me.isNewInstance) {
    if (!me.record.get('employeeID') && me.gridSender && me.gridSender.up('form')) {
      me.record.set('employeeID', me.gridSender.up('form').record.get('employeeID') || me.gridSender.up('form').instanceID)
    }
    me.record.set('isManualWorkPlace', true)
    me.record.set('empWorkPlace', '1')
    me.record.set('mtCount', 1)
  }
  if (!me.record.get('employeePositionID')) {
    me.actionRegenerateName && me.actionRegenerateName.disable()
  }

  const funcOrgType = AC.settings.get('hrFuncOrgType', appAC.globalOrganization())
  /* Сфера діяльності організації - Бюджетна */
  me.attr.mtCount.setVisible(funcOrgType === '1')

  me.down('[name=workPlace]').inputEl.dom.setAttribute('maxlength', 200)
  me.attr.workPlace[me.record.get('isManualWorkPlace') ? 'show' : 'hide']()
  me.attr.organizationID[!me.record.get('isManualWorkPlace') ? 'show' : 'hide']()
  me.attr.workPlace.setValue(me.record.get('workPlace'))
  me.enableControls()
  const grid = AC.gridUtils.getSenderGrid(me)
  if (grid && (grid.readOnly || grid.isReadOnly)) {
    AC.viewUtils.setFormReadOnly(me, true, [], true)
    me.actions['fDelete'].hide()
    me.setActionDisabled('fDelete', true)
    me.down('[name=employeeWorkbookDt]').setReadOnly(true)
  }
}

function onControlChanged (field, value) {
  const me = this
  if (me.formDataReady) {
    switch (field.name) {
      case 'isManualWorkPlace':
        me.attr.workPlace[value ? 'show' : 'hide']()
        me.attr.organizationID[!value ? 'show' : 'hide']()
        break
    }
  }
}

function enableControls () {
  let me = this
  if (me.isNewInstance) {
    return
  }
  const isAuto = this.record.get('isAuto')
  me.query('[attributeName]').forEach(item => {
    if (item.readOnlyIgnoreChange) {
      return
    }
    if (!item.setReadOnly) {
      return
    }
    item.setReadOnly(isAuto)
  })
  const roles = $App.connection.userData().roles.toUpperCase().split(',')
  const canEdit = roles.includes('acc_adminEmpWorkbook'.toUpperCase()) /* || roles.includes('admin'.toUpperCase()) */
  if (isAuto && !canEdit) {
    me.down('[name=workPlace]').setReadOnly(isAuto)
    me.actions.fDelete.setDisabled(isAuto)
  }
}

function onBeforeSetLocalStoreData (me, gridData) {
  HR.employeeTabs.calcWoorkbookExp(gridData)
}

function beforeGridEdit (me, context) {
  if (!context.record.get('dateFrom') && me.attr.dateFrom.getValue() && me.attr.dateFrom.isValid()) {
    context.record.set('dateFrom', AC.dateService.shiftDate(me.attr.dateFrom.getValue()))
    if (!context.record.get('dateTo') && me.attr.dateToEmpty.getValue() && me.attr.dateToEmpty.isValid()) {
      context.record.set('dateTo', AC.dateService.shiftDate(me.attr.dateToEmpty.getValue()))
    }
  }
  if (!context.record.get('coefficient')) context.record.set('coefficient', 1)
}

function setExperience (me) {
  const positionType = me.record.get('positionType')
  if (me.attr.dateFrom.getValue() && me.attr.dateFrom.isValid()) {
    const onDate = AC.dateService.shiftDate(me.attr.dateFrom.getValue()) < AC.dateService.minDate() ? AC.dateService.minDate() : AC.dateService.shiftDate(me.attr.dateFrom.getValue())

    const expByPos = UB.Repository('hr_dictExperienceByPos')
      .attrs(['positionType', 'dictExperienceID', 'dictExperienceID.name'])
      .where('positionType', '=', positionType)
      .where('dictExperienceID.dateFrom', '<=', onDate)
      .where('dictExperienceID.dateTo', '>=', onDate)
      .selectAsObject()

    const expByDef = UB.Repository('hr_dictExperienceByPos')
      .attrs(['positionType', 'dictExperienceID', 'dictExperienceID.name'])
      .where('positionType', '=', null)
      .where('dictExperienceID.dateFrom', '<=', onDate)
      .where('dictExperienceID.dateTo', '>=', onDate)
      .selectAsObject()

    Promise.all([expByPos, expByDef])
      .then(([data, defaultData]) => {
        me.setIsDirty(true)
        const dateFrom = AC.dateService.shiftDate(me.attr.dateFrom.getValue())
        const dateTo = (me.attr.dateToEmpty.getValue() && me.attr.dateToEmpty.isValid()) ? AC.dateService.shiftDate(me.attr.dateToEmpty.getValue()) : null
        const onDate = dateTo || AC.dateService.currentDate()
        const ymd = AC.dateService.getYmd(dateFrom, onDate, true)
        const countDays = dateFrom <= onDate ? (AC.dateService.dateDiff(dateFrom, onDate) || 0) + 1 : 0
        if (!data.length) data = defaultData
        data.forEach(row => {
          const record = {
            'dictExperienceID.name': row['dictExperienceID.name'],
            'dictExperienceID': row.dictExperienceID,
            dateFrom,
            dateTo,
            countDays,
            coefficient: 1,
            countDaysGiven: countDays,
            years: ymd.years,
            months: ymd.months,
            days: ymd.days
          }
          me.attr.employeeWorkbookDt.addNewRecord(record)
        })
      })
  }
}

function createDevFormActions (me) {
  const tb = me.down('toolbar')
  const allActions = tb && tb.query('[menuId=AllActions]')[0]
  if (!allActions) {
    return
  }
  allActions.menu.add({
    xtype: 'menuseparator'
  })
  allActions.menu.add({
    text: 'View data ' + me.entityName,
    handler: function () {
      AC.entityUtils.showgEntity(me.entityName)
    }
  })
}
