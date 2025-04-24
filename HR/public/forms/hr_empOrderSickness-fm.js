/* global UB HR appAC appHR AC $App Ext */
exports.formCode = {
  initOrderComponentDone,
  initComponentStart,
  onFormDataReady,
  onControlChanged,
  filterParentID,
  filterEmployeeFamilyID,
  initParentID,
  setEmpOrderSicknessDt,
  addBaseActions,
  checkOrderState,
  setDays,
  calcStanding,
  beforePosting,
  onCheckValidBeforeSaveOrder,
  setEmployeeFilter
}

function addBaseActions () {
  const me = this
  me.orderActions = {
    actions: ['fDelete', 'postingAction', 'cancelPostingAction'],
    state: {
      PROJECT: { action: ['postingAction', 'fDelete'] },
      POSTED: { action: ['cancelPostingAction'] },
      PROCESSED: { action: [] }
    }
  }

  me.callParent(arguments)
  HR.orderManager.addOrderAction(me)

  me.actions.subEmpAction = new Ext.Action({
    actionId: 'subEmpAction',
    eventId: 'subEmpAction',
    iconCls: 'u-icon-copy',
    cls: 'add-currect-action',
    tooltip: UB.i18n('Додати для сумісників'),
    text: UB.i18n('Додати для сумісників'),
    handler: function () {
      me.setLoading(true)
      $App.connection.run({
        entity: 'hr_empOrderSickness',
        method: 'addSubEmpOrder',
        params: {
          orderID: me.instanceID
        }
      }).then(response => {
        me.setLoading(false)
        const resultData = JSON.parse(response.resultData)
        if (resultData.length) {
          resultData.forEach(orderID => {
            $App.doCommand({
              cmdType: 'showForm',
              entityName: 'hr_empOrderSickness',
              entity: 'hr_empOrderSickness',
              isModal: false,
              tabId: 'hr_empOrderSickness' + orderID,
              target: $App.getViewport().centralPanel,
              instanceID: orderID
            })
          })
        } else {
          AC.viewUtils.showToast(UB.i18n('Виконано'))
        }
      }, (err) => {
        me.setLoading(false)
        throw err
      })
    }
  })
  me.actions.remarkAction = new Ext.Action({
    actionId: 'remarkAction',
    eventId: 'remarkAction',
    iconCls: 'u-icon-list-success',
    cls: 'blue-action',
    tooltip: UB.i18n('Зауваження'),
    text: UB.i18n('Зауваження'),
    handler: function () {
      $App.doCommand({
        entity: 'hr_sicknessLog',
        cmdType: 'showList',
        description: UB.i18n('Зауваження'),
        isModal: true,
        hideActions: ['edit', 'del', 'addNewByCurrent', 'addNew', 'itemSelect'],
        cmdData: {
          params: [{
            entity: 'hr_sicknessLog',
            method: 'select',
            fieldList: [
              { name: 'loadDate' },
              { name: 'msgType' },
              { name: 'periodCalcID.name', description: UB.i18n('Розрахунковий період завантаження') },
              { name: 'userID.name', description: UB.i18n('Користувач') },
              { name: 'employee' },
              { name: 'description' }
            ],
            whereList: {
              orgID: {
                expression: '[orgID]',
                condition: 'equal',
                value: appAC.globalOrganization()
              },
              empOrderSicknessID: {
                expression: '[empOrderSicknessID]',
                condition: 'equal',
                value: me.instanceID
              }
            },
            orderList: {
              loadDate: { expression: '[loadDate]', order: 'DESC' },
              msgType: { expression: '[msgType]', order: 'ASC' },
              employee: { expression: '[employee]', order: 'ASC' },
              description: { expression: '[description]', order: 'ASC' }
            }
          }]
        }
      })
    },
    scope: me
  })
}

function initComponentStart () {
  const me = this
  me.orderConfig = {
    hideEditDocNumber: true,
    hideEditPeriodID: true,
    detailGrids: ['empOrderSicknessDt']
  }
  HR.orderManager.init(me)
}
function onAttrKeypress (ctrl, e) {
  if (e.getKey() === e.ENTER) {
    changeParams(ctrl)
  }
}

function initOrderComponentDone (me) {
  ['dateFrom', 'standingYearMonth', 'standingAllYear', 'percentWork', 'dateTo', 'dateFirst'].forEach(attrName => {
    me.attr[attrName].on('blur', changeParams)
    me.attr[attrName].on('keypress', onAttrKeypress)
  })
  const tb = me.down('toolbar')
  const allActions = tb && tb.query('[menuId=AllActions]')[0]
  if (allActions) {
    allActions.menu.add({
      text: 'Перевірка стану документу',
      handler: function () {
        me.checkOrderState()
      }
    })
  }
}

function validateDateFirst (me) {
  if (!me.attr.parentID.getValue() && me.attr.dateFrom.getValue() && me.attr.dateFirst.getValue() &&
    me.attr.dateFrom.getValue().getTime() !== me.attr.dateFirst.getValue().getTime()) {
    me.attr.dateFirst.inputEl.setStyle({ color: '#ff0000' })
  } else {
    me.attr.dateFirst.inputEl.setStyle({ color: '#1b1b1b' })
  }
}

function changeParams (ctrl) {
  const me = ctrl.up('form')
  if (me.record.get('orderState') !== 'PROJECT' || ctrl.readOnly) {
    return
  }
  const flagsFix = me.record.get('flagsFix')
  const value = ctrl.getValue()
  switch (ctrl.name) {
    case 'dateTo':
      me.attr.dateFrom.setMaxValue(me.attr.dateTo.getValue())
      me.setDays(me)
      me.setEmpOrderSicknessDt(me)
      break
    case 'dateFrom':
      if (value && ctrl.calcValue !== value) {
        me.attr.dateTo.setMinValue(me.attr.dateFrom.getValue())
        if (!me.attr.parentID.getValue()) {
          me.attr.dateFirst.setValue(AC.dateService.unshiftDate(me.attr.dateFrom.getValue()))
          checkDictIllnessReason(me)
        }
        setParams(me)
        ctrl.calcValue = value
      }
      break
    case 'dateFirst':
      validateDateFirst(me)
      checkDictIllnessReason(me)
      break
    case 'standingAllYear':
    case 'standingYearMonth':
    case 'percentWork':
      if (ctrl.calcValue !== value) {
        if (value) {
          me.record.set('flagsFix', flagsFix | ctrl.flagsFix)
        } else {
          me.record.set('flagsFix', flagsFix & ~ctrl.flagsFix)
        }
        setParams(me)
      }
      break
  }
}

function onFormDataReady () {
  const me = this
  const orgID = appAC.globalOrganization()

  if (me.isNewInstance) {
    me.record.set('employeeNumberID', me.record.get('employeePosition.employeeNumberID'))
    me.record.set('illnessKind', '1')
    me.record.set('organizationID', orgID)

    appHR.getCurrentPeriod(orgID)
      .then(({ ID }) => me.attr.periodID.setValueById(ID))

    // setDictIllnessReason(me, me.record.get('illnessKind'))
  } else {
    me.attr.dateFrom.setMaxValue(me.attr.dateTo.getValue())
    me.attr.dateTo.setMinValue(me.attr.dateFrom.getValue())
    me.filterEmployeeFamilyID(me.record)
    AC.viewUtils.setWhereListProperty(me.attr.illnessReasonID, [
      ['illnessKind', '=', me.record.get('illnessKind')],
      ['dateFrom', '<=', AC.dateService.unshiftDate(me.record.get('dateFirst') || me.record.get('dateTo'))],
      ['dateTo', '>=', AC.dateService.unshiftDate(me.record.get('dateFirst') || me.record.get('dateFrom'))]
    ], undefined, [])
    if (me.record.get('parentID')) {
      me.attr.standingYearMonth.setDisabled(true)
      me.attr.standingAllYear.setDisabled(true)
      me.attr.percentWork.setDisabled(true)
      if (me.attr.parentID.getFieldValue('employeeFamilyID')) {
        me.attr.employeeFamilyID.setDisabled(true)
      }
    }
    validateDateFirst(me)
    me.attr.illnessReasonID.setReadOnly(me.record.get('parentID') && me.record.get('parentID.illnessKind') === me.record.get('illnessKind'))
  }
  const isPosted = me.record.get('orderState') !== 'PROJECT'
  me.attr.standingYearMonth.calcValue = me.record.get('standingYearMonth')
  me.attr.standingAllYear.calcValue = me.record.get('standingAllYear')
  me.attr.percentWork.calcValue = me.record.get('percentWork')
  UB.Repository('hr_sicknessMeetingDt')
    .attrs(['ID', 'sicknessMeetingID.description'])
    .where('empOrderSicknessID', '=', me.instanceID)
    .where('sicknessMeetingID.mi_deleteDate', '=', '#maxdate')
    .selectSingle().then(res => {
      if (res && res['sicknessMeetingID.description']) {
        me.down('[name=addedToProtocolLabel]').setText(res['sicknessMeetingID.description'])
      } else {
        me.down('[name=addedToProtocolLabel]').setText('')
      }
    })

  me.down('[name=standingAllInYearLabel]').setText(me.record.get('standingAllYear') ? (('0' + Math.floor(me.record.get('standingAllYear') / 12)).substr(-2, 2) + 'р.' + ('0' + (me.record.get('standingAllYear') - Math.floor(me.record.get('standingAllYear') / 12) * 12)).substr(-2, 2) + 'м') : '')
  /*
  if (me.record.get('employeeNumberID.dateFrom') && me.record.get('dateFrom')) {
    me.down('[name=workLess6monthsLabel]').setText(AC.dateService.monthDiff(me.record.get('employeeNumberID.dateFrom'), me.record.get('dateFrom')) < 6 ? UB.i18n('Менше 6 місяців') : '')
  }
  */
  if (me.record.get('standingYearMonth') && me.record.get('dateFrom')) {
    me.down('[name=workLess6monthsLabel]').setText(me.record.get('standingYearMonth') < 6 ? UB.i18n('Менше 6 місяців') : '')
  }
  if (isPosted) {
    me.attr.serie.setAllowBlank(true)
    me.attr.employeeFamilyID.setAllowBlank(true)
    me.attr.illnessReasonID.setReadOnly(true)
  } else {
    me.setEmployeeFilter(me.attr.dismissed.getValue())
    me.filterParentID(me)
    me.initParentID(me.record)
    setSerieCtrlState(me, me.record.get('illnessKind'))
  }
  me.actions.subEmpAction.setDisabled(!AC.entityUtils.verifyRightsMethod('hr_empOrderSickness', 'addSubEmpOrder') || !(me.record.get('orderState') === 'POSTED' && me.record.get('employeePositionID.workPlace') === '1' && !me.record.get('illnessReasonID.payElFSSUID.includeSecondJobs')))
}

function setEmployeeFilter (showDismissed = false) {
  const me = this
  const orderDate = AC.dateService.truncTimeToUtcNull(me.attr.orderDate.getValue())
  if (showDismissed) {
    AC.viewUtils.setWhereListProperty(me.attr.employeePositionID, [
      ['organizationID', '=', appAC.globalOrganization()],
      ['dateFrom', '<=', orderDate],
      ['dateTo', '<', orderDate],
      ['[dateTo] = [maxDateTo]', 'custom', undefined]
    ])
  } else {
    AC.viewUtils.setWhereListProperty(me.attr.employeePositionID, [
      ['organizationID', '=', appAC.globalOrganization()],
      ['dateFrom', '<=', orderDate],
      ['dateTo', '>=', orderDate]
    ])
  }
}

function setSerieCtrlState (me, value) {
  me.attr.serie.setDisabled(value !== '1')
  me.attr.serie.setAllowBlank(value !== '1')
}

function setDictIllnessReason (me, value) {
  AC.viewUtils.setWhereListProperty(me.attr.illnessReasonID, [
    ['illnessKind', '=', value || me.record.get('illnessKind')],
    ['dateFrom', '<=', AC.dateService.unshiftDate(me.record.get('dateFirst') || me.record.get('dateFrom') || AC.dateService.todayDate())],
    ['dateTo', '>=', AC.dateService.unshiftDate(me.record.get('dateFirst') || me.record.get('dateFrom') || AC.dateService.todayDate())]
  ], undefined, ['clearValue', 'clearStore', 'clearWhereList'])
  UB.Repository('hr_dictIllnessReason')
    .attrs(['ID'])
    .where('illnessKind', '=', value || me.record.get('illnessKind'))
    .where('dateFrom', '<=', AC.dateService.unshiftDate(me.record.get('dateFirst') || me.record.get('dateFrom') || AC.dateService.todayDate()))
    .where('dateTo', '>=', AC.dateService.unshiftDate(me.record.get('dateFirst') || me.record.get('dateFrom') || AC.dateService.todayDate()))
    .orderBy('orderN')
    .selectScalar().then(dictIllnessReasonID => {
      if (dictIllnessReasonID) {
        me.record.set('illnessReasonID', dictIllnessReasonID)
      }
    })
}
function checkDictIllnessReason (me) {
  if (me.attr.illnessReasonID.getValue()) {
    if (!(AC.dateService.unshiftDate(me.attr.illnessReasonID.getFieldValue('dateFrom')) <= AC.dateService.unshiftDate(me.attr.dateFrom.getValue()) &&
        AC.dateService.unshiftDate(me.attr.illnessReasonID.getFieldValue('dateTo')) >= AC.dateService.unshiftDate(me.attr.dateFrom.getValue()))) {
      $App.dialogInfo('Увага! Період дії вказаної причини непрацездатності не відповідає даті початку первинного лікарняного!')
      setDictIllnessReason(me, me.record.get('illnessKind'))
    }
  } else {
    setDictIllnessReason(me, me.record.get('illnessKind'))
  }
}

function onControlChanged (me, field, value) {
  switch (field.name) {
    case 'illnessKind':
      if (value !== me.record.get('illnessKind')) {
        me.calcStanding()
        // setDictIllnessReason(me, value)
        if (value !== '1') {
          me.attr.serie.setValue()
        }
        setSerieCtrlState(me, value)
      }
      if (value) {
        AC.viewUtils.setWhereListProperty(me.attr.illnessReasonID, [
          ['illnessKind', '=', value],
          ['dateFrom', '<=', AC.dateService.unshiftDate(me.record.get('dateFirst') || me.record.get('dateTo'))],
          ['dateTo', '>=', AC.dateService.unshiftDate(me.record.get('dateFirst') || me.record.get('dateFrom'))]
        ], undefined, ['clearStore'])
      }
      if (me.attr.parentID.getValue() && me.attr.parentID.getFieldValue('illnessKind') === value) {
        me.attr.illnessReasonID.setValueById(me.attr.parentID.getFieldValue('illnessReasonID'))
        me.attr.illnessReasonID.setReadOnly(true)
      } else {
        me.attr.illnessReasonID.setReadOnly(false)
      }
      break
    case 'employeePositionID':
      me.record.set('employeeID', me.attr.employeePositionID.getFieldValue('employeeID'))
      me.record.set('employeeNumberID', me.attr.employeePositionID.getFieldValue('employeeNumberID'))
      me.record.set('employeeFamilyID')
      me.attr.isOnlyFOP.setValue(me.attr.employeePositionID.getFieldValue('workPlace') !== '1')
      me.filterParentID(me)
      if (value) {
        me.initParentID(me.record)
      } else {
        me.record.set('parentID')
      }
      me.calcStanding()
      me.filterEmployeeFamilyID(me.record)
      break
    case 'parentID':
      const parentID = me.attr.parentID.getValue()
      if (parentID) {
        me.record.set('illnessReasonID', me.attr.parentID.getFieldValue('illnessReasonID'))
        me.record.set('standingYearMonth', me.attr.parentID.getFieldValue('standingYearMonth'))
        me.record.set('standingAllYear', me.attr.parentID.getFieldValue('standingAllYear'))
        me.record.set('standingAllInYear', me.attr.parentID.getFieldValue('standingAllInYear'))
        me.record.set('percentWork', me.attr.parentID.getFieldValue('percentWork'))
        me.record.set('dateFrom', AC.dateService.shiftDate(AC.dateService.addDays(me.attr.parentID.getFieldValue('dateTo'), 1)))
        me.attr.isOnlyFOP.setValue(me.attr.parentID.getFieldValue('isOnlyFOP'))
        me.attr.illnessReasonID.setReadOnly(me.attr.parentID.getFieldValue('illnessKind') === me.record.get('illnessKind'))
        me.attr.standingYearMonth.setDisabled(true)
        me.attr.standingAllYear.setDisabled(true)
        me.attr.percentWork.setDisabled(true)
        if (me.attr.parentID.getFieldValue('employeeFamilyID')) {
          me.record.set('employeeFamilyID', me.attr.parentID.getFieldValue('employeeFamilyID'))
          me.attr.employeeFamilyID.setDisabled(true)
        }
        if (me.attr.parentID.getFieldValue('parentID')) {
          me.record.set('firstID', me.attr.parentID.getFieldValue('firstID'))
          me.attr.dateFirst.setValue(AC.dateService.unshiftDate(me.attr.parentID.getFieldValue('firstID.dateFrom')))
        } else {
          me.record.set('firstID', parentID)
          me.attr.dateFirst.setValue(AC.dateService.unshiftDate(me.attr.parentID.getFieldValue('dateFrom')))
        }
        me.setEmpOrderSicknessDt(me)
        checkDictIllnessReason(me)
      } else {
        me.record.set('illnessReasonID')
        me.record.set('standingYearMonth')
        me.record.set('standingAllYear')
        me.record.set('standingAllInYear')
        me.record.set('percentWork')
        me.record.set('employeeFamilyID', null)
        me.record.set('firstID', null)
        me.attr.dateFirst.setValue(AC.dateService.unshiftDate(me.attr.dateFrom.getValue()))
        me.attr.illnessReasonID.setReadOnly(false)
        me.attr.standingYearMonth.setDisabled(false)
        me.attr.standingAllYear.setDisabled(false)
        me.attr.percentWork.setDisabled(false)
        me.setEmpOrderSicknessDt(me)
        checkDictIllnessReason(me)
      }
      break
    case 'orderDate':
      if (AC.dateService.isValid(me.attr.orderDate.getValue())) {
        me.setEmployeeFilter(me.attr.dismissed.getValue())
      }
      break
    case 'illnessReasonID':
      me.record.set('employeeFamilyID')
      me.attr.employeeFamilyID.setDisabled(me.attr.illnessReasonID.getFieldValue('payElFSSUID.methodID.code') !== '19')
      me.attr.employeeFamilyID.setAllowBlank(me.attr.illnessReasonID.getFieldValue('payElFSSUID.methodID.code') !== '19')
      me.calcStanding()
      me.setEmpOrderSicknessDt(me)
      break
    case 'isOnlyFOP':
      me.setEmpOrderSicknessDt(me)
      break
  }
}

function setParams (me) {
  me.setDays(me)
  me.calcStanding()
  me.setEmpOrderSicknessDt(me)
}

function setDays (me) {
  const { dateFrom, dateTo } = me.attr
  if (dateFrom.getValue() && dateFrom.isValid() && dateTo.getValue() && dateTo.isValid()) {
    const dateFromTime = dateFrom.getValue().getTime()
    const dateToTime = dateTo.getValue().getTime()
    const oneDay = 1000 * 60 * 60 * 24

    const days = (dateToTime - dateFromTime) / oneDay
    me.record.set('days', days + 1)
  } else {
    me.record.set('days')
  }
}

function calcStanding () {
  const me = this

  if (!me.attr.dateFrom.isValid()) return

  switch (me.attr.illnessKind.getValue()) {
    case '1':
    case '3':
      if (['employeePositionID', 'dateFrom', 'illnessReasonID']
        .filter(attrName => !me.attr[attrName].getValue()).length) {
        return
      }
      const params = {
        organizationID: me.record.get('organizationID'),
        sicknessDateFrom: me.attr.dateFrom.getValue(),
        employeeNumberID: me.attr.employeePositionID.getFieldValue('employeeNumberID'),
        illnessReasonID: me.attr.illnessReasonID.getValue(),
        employeeFamilyID: me.attr.employeeFamilyID.getValue(),
        standingYearMonth: me.attr.standingYearMonth.getValue(),
        standingAll: me.attr.standingAllYear.getValue(),
        rate: me.attr.percentWork.getValue(),
        flagsFix: me.record.get('flagsFix') || 0,
        method: '4'
      }
      me.setLoading(UB.i18n('Перерахунок. Зачекайте'))
      $App.connection.run({
        entity: 'hr_empOrderSickness',
        method: 'getExpirienceAndRate',
        params: JSON.stringify(params)
      }).then(response => {
        const parentID = me.attr.parentID.getValue()
        me.attr.standingYearMonth.calcValue = parentID ? me.attr.parentID.getFieldValue('standingYearMonth') : response.resultData.standingYearMonth
        me.attr.standingYearMonth.setValue(me.attr.standingYearMonth.calcValue)
        const standingAll = parentID ? me.attr.parentID.getFieldValue('standingAllYear') : response.resultData.standingAll
        me.attr.standingAllYear.calcValue = standingAll
        me.attr.standingAllYear.setValue(me.attr.standingAllYear.calcValue)
        me.attr.standingAllInYear.setValue(parentID ? me.attr.parentID.getFieldValue('standingAllInYear') : response.resultData.standingAllInYear)
        me.attr.percentWork.calcValue = parentID ? me.attr.parentID.getFieldValue('percentWork') : response.resultData.rate
        me.attr.percentWork.setValue(me.attr.percentWork.calcValue)
        me.attr.employeeSickLimitID.setValue(response.resultData.employeeSickLimitID)
        me.down('[name=standingAllInYearLabel]').setText(standingAll ? (('0' + Math.floor(standingAll / 12)).substr(-2, 2) + 'р.' + ('0' + (standingAll - Math.floor(standingAll / 12) * 12)).substr(-2, 2) + 'м') : '')
        me.down('[name=workLess6monthsLabel]').setText(response.resultData.workLess6months ? response.resultData.workLess6months : '')
        me.setLoading(false)
      })
      break
    case '2':
      me.attr.standingYearMonth.setValue()
      me.attr.standingAllYear.setValue()
      me.attr.standingAllInYear.setValue()
      me.attr.percentWork.setValue()
      me.attr.employeeSickLimitID.setValue()
      me.down('[name=standingAllInYearLabel]').setText()
      me.down('[name=workLess6monthsLabel]').setText()
      break
  }
}

function filterParentID (me) {
  me.setLoading(true)
  $App.connection.run({
    entity: 'hr_employeeNumber',
    method: 'getParentEmpNumbers',
    employeeNumberID: me.record.get('employeeNumberID') || 0
  }).then(mParams => {
    me.setLoading(false)
    const parentEmpNumbers = mParams.parentEmpNumbers ? JSON.parse(mParams.parentEmpNumbers) : []
    const empNumberIDs = parentEmpNumbers.map(o => o.employeeNumberID)
    empNumberIDs.push(me.record.get('employeeNumberID') || 0)
    const whereList = [
      ['employeeNumberID', 'in', empNumberIDs]
    ]
    if (me.isEditMode) {
      whereList.push(['ID', '!=', me.instanceID])
    }
    AC.viewUtils.setWhereListProperty(me.attr.parentID,
      whereList,
      null,
      ['clearStore', 'clearWhereList']
    )
  }, err => {
    me.setLoading(false)
    throw err
  })
}

function filterEmployeeFamilyID () {
  const me = this
  AC.viewUtils.setWhereListProperty(me.attr.employeeFamilyID,
    [ ['employeeID', '=', me.record.get('employeeID') || 0] ],
    null,
    ['clearStore', 'clearWhereList']
  )
}

function initParentID (reco) {
  const me = this
  const orderState = reco.get('orderState')
  const isNewState = (!orderState || orderState === 'PROJECT')
  if (!isNewState) {
    return
  }

  UB.Repository('hr_empOrderSickness')
    .attrs(['ID'])
    .where('employeeID', '=', reco.get('employeeID') || 0)
    .where('nextNumber', '=', me.attr.number.getValue() || '0')
    .where('orderDate', '<=', me.attr.orderDate.getValue() || AC.dateService.maxDateUTC())
    .orderBy('dateTo', 'desc')
    .selectAsObject()
    .then(res => {
      if (res.length) {
        me.attr.parentID.setValueById(res[0].ID)
      }
    })
}

function setEmpOrderSicknessDt (me) {
  if (!me.attr.dateFrom.getValue() || !me.attr.dateFrom.isValid() || !me.attr.dateTo.getValue() || !me.attr.dateTo.isValid()) { return }
  if (me.attr.empOrderSicknessDt.editingPlugin.editing) me.attr.empOrderSicknessDt.editingPlugin.cancelEdit()

  const store = me.attr.empOrderSicknessDt.getStore()
  const dateFrom = AC.dateService.unshiftDate(me.attr.dateFrom.getValue())
  const dateTo = AC.dateService.unshiftDate(me.attr.dateTo.getValue())
  const dateFirst = AC.dateService.unshiftDate(me.attr.dateFirst.getValue())
  let recModifyMin
  let recModifyMax
  const maxDayFOP = me.attr.illnessReasonID.getFieldValue('maxDayFOP') || 0
  const isOnlyFOP = me.attr.isOnlyFOP.getValue()
  let maxDateFop = AC.dateService.addDays(AC.dateService.truncTimeToUtcNull(dateFirst), maxDayFOP - 1)
  if (maxDateFop > dateTo) {
    maxDateFop = dateTo
  }
  if (!store.getCount()) {
    if (isOnlyFOP) {
      if (AC.dateService.shiftDate(dateFrom) <= AC.dateService.shiftDate(maxDateFop)) {
        me.attr.empOrderSicknessDt.addNewRecord(
          {
            dateFrom: AC.dateService.shiftDate(dateFrom),
            dateTo: AC.dateService.shiftDate(maxDateFop),
            illnessRegime: '1',
            empOrderSicknessID: me.instanceID
          }
        )
      }
      const dateFrom6 = AC.dateService.shiftDate(dateFrom) <= AC.dateService.shiftDate(maxDateFop) ? AC.dateService.addDays(maxDateFop, 1) : AC.dateService.shiftDate(dateFrom)
      if (dateFrom6 <= dateTo) {
        me.attr.empOrderSicknessDt.addNewRecord(
          {
            dateFrom: dateFrom6,
            dateTo: AC.dateService.shiftDate(dateTo),
            illnessRegime: '6',
            empOrderSicknessID: me.instanceID
          }
        )
      }
    } else {
      me.attr.empOrderSicknessDt.addNewRecord(
        {
          dateFrom: AC.dateService.shiftDate(dateFrom),
          dateTo: AC.dateService.shiftDate(dateTo),
          illnessRegime: '1',
          empOrderSicknessID: me.instanceID
        }
      )
    }
  } else {
    if (isOnlyFOP) {
      store.each(record => {
        if (AC.dateService.unshiftDate(record.get('dateFrom')) > maxDateFop) {
          store.remove(record)
        } else if (AC.dateService.unshiftDate(record.get('dateTo')) > maxDateFop) {
          record.set('dateTo', maxDateFop)
        }
      })
      if (dateTo > maxDateFop) {
        me.attr.empOrderSicknessDt.addNewRecord(
          {
            dateFrom: AC.dateService.addDays(maxDateFop, 1),
            dateTo: AC.dateService.shiftDate(dateTo),
            illnessRegime: '6',
            empOrderSicknessID: me.instanceID
          }
        )
      }
    }

    store.each(record => {
      const recordDateFrom = AC.dateService.unshiftDate(record.get('dateFrom'))
      const recordDateTo = AC.dateService.unshiftDate(record.get('dateTo'))
      if (recordDateFrom > dateTo || recordDateTo < dateFrom) {
        store.remove(record)
      } else {
        if (dateFrom > recordDateFrom && dateFrom <= recordDateTo) { record.set('dateFrom', AC.dateService.shiftDate(dateFrom)) }
        if (dateTo >= recordDateFrom && dateTo < recordDateTo) { record.set('dateTo', AC.dateService.shiftDate(dateTo)) }
      }
      if (recModifyMin === undefined || record.get('dateFrom') < recModifyMin.get('dateFrom')) { recModifyMin = record }
      if (recModifyMax === undefined || record.get('dateTo') > recModifyMax.get('dateTo')) { recModifyMax = record }
      if (!isOnlyFOP) {
        if (record.get('illnessRegime') === '6') {
          record.set('illnessRegime', '1')
        }
      }
    })
    if (recModifyMin !== undefined && recModifyMin.get('dateFrom') > dateFrom) { recModifyMin.set('dateFrom', AC.dateService.shiftDate(dateFrom)) }
    if (recModifyMax !== undefined && recModifyMax.get('dateTo') < dateTo) { recModifyMax.set('dateTo', AC.dateService.shiftDate(dateTo)) }
  }
}

function beforePosting () {
  const me = this
  return $App.connection.run({
    entity: 'hr_employeeNumber',
    method: 'checkDateWork',
    employeeNumberID: me.record.get('employeeNumberID'),
    onDate: AC.dateService.shiftDate(me.record.get('dateFrom'))
  }).then(response => {
    me.postMessage = !response.isValid ? UB.i18n('На дату початку лікарняного особа ще не працювала в організації! ') : ''
    return true
  })
}

function checkOrderState () {
  const me = this
  if (me.record.get('orderState') === 'PROCESSED') {
    me.setLoading(true)
    UB.Repository('hr_sicknessMeetingDt')
      .attrs('sicknessMeetingID', 'sicknessMeetingID.mi_deleteDate')
      .where('empOrderSicknessID', '=', me.instanceID)
      .where('sicknessMeetingID.mi_deleteDate', '>=', '#maxdate')
      .selectAsObject().then(result => {
        me.setLoading(false)
        if (!result.length) {
          $App.dialogInfo(UB.i18n('Стан документу не корректний! Буде автоматично змінено на "Проведено"!')).then(() => {
            $App.connection.run({
              entity: 'hr_empOrderSickness',
              method: 'fixOrderState',
              empOrderSicknessID: me.instanceID,
              checkState: 'PROCESSED',
              newState: 'POSTED'
            }).then(() => {
              me.loadInstance()
            })
          })
        } else {
          $App.dialogInfo(UB.i18n('Стан документу корректний'))
        }
      }).catch(e => {
        me.setLoading(false)
      })
  } else if (me.record.get('orderState') === 'POSTED') {
    me.setLoading(true)
    UB.Repository('hr_sicknessMeetingDt')
      .attrs('sicknessMeetingID', 'sicknessMeetingID.mi_deleteDate')
      .where('empOrderSicknessID', '=', me.instanceID)
      .where('sicknessMeetingID.mi_deleteDate', '>=', '#maxdate')
      .selectAsObject().then(result => {
        me.setLoading(false)
        if (result.length) {
          $App.dialogInfo(UB.i18n('Стан документу не корректний! Буде автоматично змінено на "Опрацьовано"!')).then(() => {
            $App.connection.run({
              entity: 'hr_empOrderSickness',
              method: 'fixOrderState',
              empOrderSicknessID: me.instanceID,
              checkState: 'POSTED',
              newState: 'PROCESSED'
            }).then(() => {
              me.loadInstance()
            })
          })
        } else {
          $App.dialogInfo(UB.i18n('Стан документу корректний'))
        }
      }).catch(e => {
        me.setLoading(false)
      })
  } else {
    $App.dialogInfo(UB.i18n('Стан документу корректний'))
  }
}

async function onCheckValidBeforeSaveOrder () {
  const me = this
  const skipCheck = me.record.get('orderState') === 'PROJECT' && me.record.modified && me.record.modified.orderState === 'POSTED'
  if (!skipCheck && me.record.get('illnessKind') !== me.attr.illnessReasonID.getFieldValue('illnessKind')) {
    await $App.dialogError(UB.i18n(`Причина непрацездатності не відповідає типу документа!`), 'Увага')
    return false
  }
  if (me.record.get('parentID')) {
    const doc = await UB.Repository('hr_empOrderSickness')
      .attrs('ID', 'description')
      .where('parentID', '=', me.record.get('parentID'))
      .where('ID', '!=', me.instanceID)
      .limit(1)
      .selectSingle()
    if (doc) {
      const timeSheetDay = await UB.Repository('tim_timeSheet')
        .attrs('ID')
        .where('orderID', '=', doc.ID)
        .where('isCanceled', '=', 0)
        .limit(1)
        .selectSingle()
      if (timeSheetDay) {
        await $App.dialogError(UB.i18n(`Попередній лист - "${me.attr.parentID.getFieldValue('description')}" вже вказано як первинний для лікарняного "${doc.description}". Збереження не можливо!`), 'Увага')
        return false
      }
    }
  }
  return true
}
