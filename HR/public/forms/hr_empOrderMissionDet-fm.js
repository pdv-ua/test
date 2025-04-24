/* global $App HR AC moment UB appHR */
exports.formCode = {
  calcPeriod,
  filterPeriod,
  initComponentStart,
  addBaseActions,
  initComponentDone,
  enableControls,
  onRecordLoaded,
  onFormDataReady,
  onBeforeClose,
  onControlChanged,
  setTabs,
  setControls,
  getEmpWarning,
  onBeforeEmpSave,
  setCategoryFilter,
  setTopicFilter,
  setDefCountry,
  setYearInfo
}

function setCategoryFilter (value) {
  const me = this
  if (me.isReadOnly) {
    return
  }
  if (value === undefined) {
    value = me.record.get('groupCategory')
  }
  AC.viewUtils.setFilterValue(me.getField('dictProfCompetencyID'), {
    groupCategory: value
  })
}

function setTopicFilter ({
  value,
  isClearFilter
} = {}) {
  const me = this
  if (me.isReadOnly) {
    return
  }

  let topicCtrl = me.down('[name=dictTrainingTopicName]')
  let req = topicCtrl.getStore().ubRequest
  delete req.whereList
  if (isClearFilter) {
    return
  }
  if (value === undefined) {
    value = me.record.get('dictProfCompetencyID')
  }

  if (value) {
    req.whereList = {
      dictProfCompetency: {
        expression: '[dictProfCompetencyID]',
        condition: 'equal',
        value: value
      }
    }
  }
  topicCtrl.getStore().load()
}

function setTabs () {
  let me = this
  let detailpanel = me.down('[name=detailpanel]')
  let tab = detailpanel.items.items[0]
  let employee = tab.down('[ubID=employee]')
  let acting = tab.down('[ubID=acting]')
  let isGroup = me.record.get('isGroup')

  employee.setVisible(isGroup)
  acting.setVisible(!isGroup)
  tab.setTitle(isGroup ? UB.i18n('Працівники') : UB.i18n(`Виконуючі обов'язки`))
}

function initComponentStart () { // Вызывается прямо перед запуском инициализации формы.
  // В этом событии  можно изменить конфигурацию формы.
  let me = this
  me.orderConfig = {
    detailGrids: []
  }
  /* Якщо з метою навчення */
  let empOrderType = me.customParams.empOrderType
  if (!empOrderType) {
    let senderRecord = AC.gridUtils.getCurrentRecord(me.sender) // Редагування
    if (senderRecord) {
      empOrderType = senderRecord.get('empOrderType')
    }
  }
  if (empOrderType === 'MISSION_TRAINING') {
    let destOrganizationName = AC.viewUtils.dfmDown(me, 'name=destOrganizationName')
    destOrganizationName.fieldLabel = UB.i18n('Заклад освіти')
    destOrganizationName.allowBlank = false
  }
  /* Якщо з метою навчення */

  if (me.customParams.empOrderType === 'MISSION_TRAINING') {
    let destOrganizationName = AC.viewUtils.getDfmItemByAttrName({ form: me, searchValue: 'destOrganizationName', lookupProperty: 'name' })
    destOrganizationName.fieldLabel = UB.i18n('Заклад освіти')
  }

  me.on('afterrender', function () {
    let win = this.window
    if (win) {
      if (!win.height) {
        win.height = 600
      }
      if (!win.width) {
        win.width = 800
      }
    }
    HR.orderManager.disableContextMenuItems(me.down('[attributeName=employeePositionID]'), ['editItem', 'addItem'])
    HR.orderManager.disableContextMenuItems(me.down('[name=destOrganizationName]'), ['editItem', 'addItem'])
    HR.orderManager.disableContextMenuItems(me.down('[name=cityName]'), ['editItem', 'addItem'])
    me.masterForm.makeReasonSelector(me)
  })
  me.on('recordloaded', onRecordLoaded, me)
  me.on('formDataReady', onFormDataReady, me)
  me.on('controlChanged', onControlChanged, me)
  me.on('beforeClose', me.onBeforeClose, me)
  me.onBeforeSave = function () {
    let ctrl = me.down('[name=destOrganizationName]')
    let req = ctrl.getStore().ubRequest
    return UB.Repository(req.entity)
      .attrs('ID')
      .where('name', '=', ctrl.getRawValue())
      .selectScalar()
      .then(ID => {
        me.record.set('destOrganizationID', ID || null)
        ctrl = me.down('[name=cityName]')
        let req = ctrl.getStore().ubRequest
        return UB.Repository(req.entity)
          .attrs('ID', 'description')
          .where('description', '=', ctrl.getRawValue())
          .selectSingle()
          .then(data => {
            me.record.set('cityID', (data && data.ID) || null)
            return true
          })
      })
  }
  me.on('afterSave', function (a) {
    me.down('[ubID=employee]').getStore().load()
  })
}

function initComponentDone () {
  const me = this
  me.masterForm = me.customParams.orderForm || me.sender.up('form')
  me.orderForm = me.masterForm
  me.orderState = me.masterForm.record.get('orderState')

  me.record.store.on('update', (store, reco, oper, modified, eOpts) => {
    let ctrl
    if (modified.includes('destOrganizationID')) {
      ctrl = me.getField('destOrganizationID')
    } else if (modified.includes('cityID')) {
      ctrl = me.getField('cityID')
    }
    if (ctrl && ctrl.getValue() && ctrl.getRawValue()) {
      let nameAttr = (ctrl.attributeName === 'destOrganizationID' ? 'destOrganizationName' : 'cityName')
      me.record.set(nameAttr, ctrl.getRawValue())
      me.getField(nameAttr).setValue(ctrl.getRawValue())
    }
    HR.orderManager.showIf(me)
    HR.orderManager.requiredIf(me)
    HR.orderManager.readOnlyIf(me)
    HR.orderManager.disabledIf(me)
  })

  if (me.orderState === 'PROJECT') {
    HR.orderManager.setNextRecordMaker(me, [
      'dateFrom',
      'dayCount',
      'dateTo',
      'purpose',
      'isGroup',
      {
        destOrganizationID: value => value,
        cityID: value => value,
        destOrganizationName: value => value,
        cityName: value => value,
        organizationID: value => me.masterForm.record.get('organizationID'),
        empOrderType: value => value,
        orderID: value => value
      }
    ], 4)
  }

  const isEnableReasonDoc = AC.settings.get('hrEnableReasonDoc')
  if (isEnableReasonDoc) {
    me.down('[name=reasonDocPanel]').show()
  }
}

function addBaseActions () {
  this.callParent(arguments)
}

function enableControls () {
  let me = this
  me.isReadOnly = me.masterForm.enableParaControls(me, me.query('[allowCustomText]'))
  if (!me.record.get('isGroup')) {
    me.down('[name=hr_empOrderActingDet]').show()
    me.down('[name=yearInfo]').show()
  }
  me.down('[name=detailpanel]').show()
}

function onRecordLoaded () {
  const me = this
  if (me.isNewInstance) {
    me.record.set('organizationID', me.masterForm.record.get('organizationID'))
    me.record.set('isGroup', true)
    me.record.set('empOrderType', me.customParams.empOrderType === 'MISSION_TRAINING' ? 'MISSION_TRAINING' : 'MISSION')
    me.record.set('dayCount', null)
    me.record.set('isNeedReport', true)
    me.record.set('isPrintAddon', me.orderForm.record.get('isAppendix'))
    me.setDefCountry()
  }
  me.masterForm.filterEmployeePosition(me, {
    attrToFilter: 'employeePositionID',
    clearValue: false
  })

  if (me.record.get('empOrderType') === 'MISSION_TRAINING') {
    const funcOrgType = AC.settings.get('hrFuncOrgType', me.record.get('organizationID'))
    if (funcOrgType === '1') {
      /* Сфера діяльності організації = Загальна */
      me.down('[ubID=trainingFieldSet]').show()
    }
    if (funcOrgType === '2') {
      /* Сфера діяльності організації = Державна служба */
      me.down('[ubID=educationFieldSet]').show()
    }
  }

  me.orderForm.setTitleByOrderType(me)
  me.setControls()
  me.enableControls()
  HR.orderManager.setDefaultValues(me)
  const destOrganizationNameCtrl = me.down('[name=destOrganizationName]')
  destOrganizationNameCtrl.setValue(me.record.get('destOrganizationName'))
  destOrganizationNameCtrl.setAllowBlank(me.record.get('empOrderType') !== 'MISSION_TRAINING')
  me.down('[name=cityName]').setValue(me.record.get('cityName'))
  HR.orderManager.requiredIf(me)
  HR.orderManager.readOnlyIf(me)
  HR.orderManager.disabledIf(me)
  me.setTabs()
  if (me.record.get('empOrderType') === 'MISSION_TRAINING') {
    me.setTopicFilter({
      isClearFilter: !me.record.get('isFromCatalog')
    })
    me.setCategoryFilter()
    me.setTopicFilter({
      isClearFilter: !me.record.get('isFromCatalog')
    })
  }
  me.orderForm.isHolidayPay = me.record.get('isHolidayPay')
}

async function onFormDataReady () {
  let me = this
  me.down('[name=yearInfo]').setText(me.record.get('yearInfo'))
  me.getField('employeePositionID').setValueById(me.record.get('employeePositionID'))
  HR.orderManager.disableContextMenuItems(me.getField('employeePositionID'), 'addItem')
  if (me.isNewInstance) {
    me.record.set('orderID', me.masterForm.instanceID)
  }
  me.down('[name=phrase]').inputEl.dom.setAttribute('maxlength', 1000)
  HR.orderManager.disableContextMenuItems(me.getField('employeePositionID'), 'addItem')
  me.orderAttrConfigList = await HR.orderManager.loadOrderAttrConfig(me.record.get('empOrderType'), me.record.get('organizationID'))
  let missionWarnings = me.down('[name=missionWarnings]')
  missionWarnings && missionWarnings.setText('')
  let dateFrom = me.record.get('dateFrom')
  let dateTo = me.record.get('dateTo')
  if (dateFrom && dateTo) {
    const yearBeg = dateFrom.getFullYear()
    const yearEnd = dateTo.getFullYear()
    let maxDayCount = 0
    const result = Number(me.record.get('isInsideCountry') ? (AC.settings.get('hrMaxMissionIntDayCount', me.record.get('organizationID')) || 30)
      : (AC.settings.get('hrMaxMissionExtDayCount', me.record.get('organizationID')) || 60))
    maxDayCount = result || 0
    for (let yy = yearEnd; yy >= yearBeg; yy--) {
      let yearDateBeg = AC.dateService.getYearBegin(yy)
      let yearDateEnd = AC.dateService.getYearEnd(yy)
      let yearDateFrom = (dateFrom > yearDateBeg) ? dateFrom : yearDateBeg
      let yearDateTo = (dateTo < yearDateEnd) ? dateTo : yearDateEnd
      $App.connection.run({
        entity: 'hr_empOrder',
        method: 'getCalendDays',
        dateFrom: yearDateFrom,
        dateTo: yearDateTo
      }).then(mParams => {
        let daysCount = mParams.daysCount || 0
        if (daysCount > maxDayCount) {
          missionWarnings.setText(UB.i18n(`Кількість днів відрядження {0} дн. за {1} рік перевищує встановлений в системі максимальний строк відрядження {2} дн.`, daysCount, yy, maxDayCount))
        }
      })
    }
  }
  HR.orderManager.showIf(me)
  HR.orderManager.disabledIf(me)
}

function onBeforeClose () {
  let me = this
  if (me.sender) {
    me.sender.getStore().load()
  }
}

function onControlChanged (field, value, oldValue) {
  const me = this
  switch (field.name) {
    case 'employeePositionID':
      me.setYearInfo()
      break
    case 'isNeedReport':
      me.record.set('isNeedReport', value)
      me.setControls()
      break
    case 'isInsideCountry':
      me.getField('isNeedReport').setValue(true)
      me.record.set('isNeedReport', true)
      me.setControls()
      me.setDefCountry(value)
      break
    case 'dateFrom':
      if (me.getField('dateFrom').getValue()) {
        me.getField('dateTo').setMinValue(me.getField('dateFrom').getValue())
      }
      break
    case 'dateTo':
      if (me.getField('dateTo').getValue()) {
        me.getField('dateFrom').setMaxValue(me.getField('dateTo').getValue())
      }
      break
    case 'isFromCatalog':
    {
      me.setControls(value)
      me.setCategoryFilter()
      let topicCtrl = me.down('[name=dictTrainingTopicName]')
      me.setTopicFilter({
        isClearFilter: !value
      })
      if (value) {
        topicCtrl.setValue()
      } else {
        me.record.set('groupCategory', null)
        me.record.set('dictProfCompetencyID', null)
      }
      topicCtrl.getStore().load()
      break
    }
    case 'groupCategory':
      me.setCategoryFilter(value)
      me.getField('dictProfCompetencyID').setValue()
      break
    case 'dictProfCompetencyID':
      let topicCtrl = me.down('[name=dictTrainingTopicName]')
      me.setTopicFilter({
        value: value
      })
      if (value) {
        topicCtrl.setValue()
      }
      break
    case 'dictTrainingKindID':
      let trainKindReco = AC.gridUtils.getCurrentRecord(field)
      if (trainKindReco) {
        me.record.set('dictTrainingKindID.trainingLevel', trainKindReco.get('trainingLevel'))
        me.record.set('dictTrainingKindID.dictStaffCatID.name', trainKindReco.get('dictStaffCatID.name'))
      } else {
        me.record.set('dictTrainingKindID.trainingLevel', null)
        me.record.set('dictTrainingKindID.dictStaffCatID.name', null)
      }
      break
    case 'isHolidayPay':
      me.orderForm.isHolidayPay = value
      break
  }
}

function setControls (isShow) {
  let me = this
  let isNeedReport = me.record.get('isNeedReport')
  const phrase = me.down('[name=phrase]')
  phrase.setDisabled(!isNeedReport)
  if (me.record.get('empOrderType') !== 'MISSION_TRAINING') {
    return
  }
  AC.viewUtils.setWhereListProperty(me.down('[name=destOrganizationName]'), [
    ['orgBusinessTypeID.code', '=', 'edu']
  ])

  isShow = isShow === undefined ? me.record.get('isFromCatalog') : isShow
  me.getField('groupCategory').setVisible(isShow)
  me.getField('dictProfCompetencyID').setVisible(isShow)
}

function calcPeriod (ctrl) {
  let me = this
  if (/* ctrl._oldValue !== ctrl.getRawValue() && */ ctrl.getValue()) {
    let dateFrom = me.getField('dateFrom')
    let dateTo = me.getField('dateTo')
    let dayCount = me.getField('dayCount')
    switch (ctrl) {
      case dateFrom:
        if (dayCount.getValue()) {
          dateTo.setValue(moment(dateFrom.getValue()).add(dayCount.getValue() - 1, 'days').toDate())
        } else if (dateTo.getValue()) {
          dayCount.setValue(moment(dateTo.getValue()).diff(moment(dateFrom.getValue()), 'days') + 1)
        }
        break
      case dateTo:
        if (dateFrom.getValue()) {
          dayCount.setValue(moment(dateTo.getValue()).diff(moment(dateFrom.getValue()), 'days') + 1)
        }
        break
      case dayCount:
        if (dateFrom.getValue()) {
          dateTo.setValue(moment(dateFrom.getValue()).add(dayCount.getValue() - 1, 'days').toDate())
        }
        break
    }
  }
}

function filterPeriod () {
  let me = this
  return me.masterForm.getOrgMiDataId().then(orgMiDataId => {
    let p = me.getField('periodID')
    let store = p.getStore()
    AC.viewUtils.setWhereListProperty(p, [
      ['isClosed', '=', false],
      ['orgID', '=', orgMiDataId]
    ], null, ['clearWhereList'])
    if (!orgMiDataId || orgMiDataId === -1) {
      store.loadData([])
      return store
    } else {
      return p.getStore().load().then(() => {
        return store
      })
    }
  })
}

function getEmpWarning (employeeNumberID, employeeID) {
  const me = this
  return $App.connection.run({
    entity: 'hr_empOrderMissionDet',
    method: 'getYearInfo',
    employeeNumberID: employeeNumberID,
    employeeID: employeeID,
    orderID: me.masterForm.instanceID,
    dateFrom: me.getField('dateFrom').getValue()
  }).then(mParams => {
    return mParams.yearInfo
  })
}

function onBeforeEmpSave (resolve, employeeNumberID, employeeID, isEmpAgreed) {
  const me = this
  return $App.connection.run({
    entity: 'hr_empOrderMissionDet',
    method: 'checkYearMissionDays',
    employeeNumberID: employeeNumberID,
    employeeID: employeeID,
    orderID: me.masterForm.instanceID,
    dateFrom: me.getField('dateFrom').getValue(),
    dateTo: me.getField('dateTo').getValue(),
    dayCount: me.getField('dayCount').getValue() || 0,
    isInsideCountry: me.getField('isInsideCountry').getValue(),
    isEmpAgreed: isEmpAgreed,
    orgID: me.record.get('organizationID')
  }).then(mParams => {
    let msg = mParams.result
    if (msg) {
      $App.dialogError(msg + UB.i18n(' Необхідна згода працівника на відрядження'), UB.i18n('msgTypeWarning'))
    }
    return resolve(true)
  })
}

function setDefCountry (isInsideCountry) {
  const me = this
  let isInCountry = (isInsideCountry === undefined)
    ? (me.isNewInstance ? me.record.get('isInsideCountry') : me.getField('isInsideCountry').getValue()) : isInsideCountry
  if (isInCountry) {
    const defCountryID = AC.settings.get('country', null, null)
    /* Присвоєння me.record.set('countryID', defCountryID) призводить до того, що запис me.record переходить в стан dirty
    (хоча інші зміни me.record для полів, які не синхронізуються з контролами до цього не призводить)
    після цього значення orderID не передається на форму вибору працівника і там виникає помилка вставки null
    в поле hr_empOrderEmployeeDet.orderID */
    me.getField('countryID').setValueById(defCountryID)
  }
}

function setYearInfo () {
  const me = this
  const yearInfoLabel = me.down('[name=yearInfo]')
  let reco = AC.gridUtils.getCurrentRecord(me.getField('employeePositionID'))
  if (reco) {
    $App.connection.run({
      entity: 'hr_empOrderMissionDet',
      method: 'getYearInfo',
      employeeNumberID: reco.get('employeeNumberID'),
      employeeID: reco.get('employeeID'),
      orderID: me.masterForm.instanceID,
      dateFrom: me.getField('dateFrom').getValue()
    }).then(mParams => {
      yearInfoLabel.setText(mParams.yearInfo)
    })
  } else {
    yearInfoLabel.setText('')
  }
}
