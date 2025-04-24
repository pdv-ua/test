/* global AC HR $App Ext UB appAC */
/* jshint maxerr: 10000 */

exports.formCode = {
  initComponentStart,
  initComponentDone,
  initUBComponent,
  onRecordLoaded,
  onFormDataReady,
  onControlChanged,
  enableControls,
  addBaseActions,
  setTitleByOrderType,
  onBeforeSave,
  filterOrder,
  filterPosition,
  setupControls,
  checkVacSubstitution
}

function filterPosition (isVacancies = this.attr.isVacancies.getValue()) {
  const me = this
  const posCtrl = me.attr.retPositionID
  const datefromCtrl = me.attr.dateFrom
  if (!datefromCtrl.isValid()) {
    posCtrl.setDisabled(true)
    return
  }
  const store = posCtrl.getStore()
  const req = store.ubRequest
  const dateFrom = AC.dateService.truncTimeToUtcNull(datefromCtrl.getValue())
  if (isVacancies) {
    req.orgID = me.record.get('organizationID')
    req.onDate = dateFrom
    req.greaterThanZero = true
    req.skipFundSource = true
    req.__mip_recordhistory_all = true
    req.entity = 'hr_positionVacContest'
    store.entityName = 'hr_positionVacContest'
    req.method = 'selectVacancies'
    req.fieldList = [
      'ID',
      'name',
      'fullNameNom',
      'code',
      'quantity',
      'mtCount',
      'vacCount',
      'indepStructUnit',
      'empList',
      'contestID',
      'contestOrder',
      'contestState',
      'contestPortal'
    ]

    delete req.whereList
  } else {
    req.entity = 'hr_position'
    store.entityName = 'hr_position'
    req.method = 'select'
    req.fieldList = ['ID', 'name', 'fullNameNom']
    req.whereList = {
      organizationID: {
        expression: '[orgID]',
        condition: 'equal',
        value: me.record.get('organizationID')
      },
      mi_dateFrom: {
        expression: '[mi_dateFrom]',
        condition: 'lessEqual',
        value: dateFrom
      },
      mi_dateTo: {
        expression: '[mi_dateTo]',
        condition: 'moreEqual',
        value: dateFrom
      },
      state: {
        expression: '[state]',
        condition: 'equal',
        value: 'ACTIVE'
      }
    }
  }
  store.load()
}

function setupControls () {
  const me = this
  const orderCtrl = me.attr.empOrderVacationLongID
  const dateFromCtrl = me.attr.dateFrom
  const retPositionCtrl = me.attr.retPositionID
  if (!dateFromCtrl.isValid() || (me.isNewInstance && !me.attr.employeePositionID.getValue())) {
    orderCtrl.setDisabled(true)
    retPositionCtrl.setDisabled(true)
  } else {
    retPositionCtrl.setDisabled(false)
  }
  if (me.isReadOnly) {
    me.down('[name=fillVacSubstitutionBtn]').hide()
    me.down('[ubID=btnSelectByTree]').hide()
  }
}

function filterOrder () {
  const me = this
  const orderCtrl = me.attr.empOrderVacationLongID
  const employeeNumberID = me.attr.employeePositionID.getFieldValue('employeeNumberID')
  const store = orderCtrl.getStore()

  store.loadData([])
  if (!employeeNumberID) {
    return Promise.resolve(null)
  }

  AC.viewUtils.setWhereListProperty(orderCtrl, [
    ['employeeNumberID', '=', employeeNumberID],
    ['organizationID', '=', me.record.get('organizationID')]
  ])

  return getLastVacation(me).then(order => {
    if (order) {
      AC.viewUtils.setWhereListProperty(orderCtrl, [
        ['dateFrom', '>=', order.dateFrom]
      ])
      return store.load().then(() => {
        return Promise.resolve(order)
      })
    } else {
      return Promise.resolve(null)
    }
  })
}

function getLastVacation (me) {
  return UB.Repository('hr_empOrderDet')
    .attrs('ID', 'dateFrom', 'dateTo', 'orderID.description')
    .where('empOrderType', 'in', ['VACATIONLONG', 'VACATIONPROLONGL'])
    .where('orderID.orderState', 'in', ['POSTED', 'PROCESSED'])
    .where('organizationID.mi_data_id', '=', me.record.get('organizationID'))
    .whereIf(me.record.get('empOrderVacationLongID'), 'ID', '!=', me.record.get('empOrderVacationLongID'))
    .where('employeeNumberID', '=', me.attr.employeePositionID.getFieldValue('employeeNumberID'))
    .orderBy('dateFrom', 'desc')
    .selectSingle()
}

async function onBeforeSave () {
  const me = this
  me.record.set('positionID', me.attr.employeePositionID.getFieldValue('positionID'))
  const dateFrom = me.record.get('dateFrom')
  const order = await getLastVacation(me)
  if (order && dateFrom < AC.dateService.shiftDate(order.dateFrom)) {
    await $App.dialogError(UB.i18n(`Неможливо зберегти! Є {0} з більш пізньою датою!`, order['orderID.description']), UB.i18n('Увага!'))
    return false
  }
  const dateVacFrom = AC.dateService.truncTimeToUtcNull(me.attr.empOrderVacationLongID.getFieldValue('dateFrom'))
  const dateVacTo = AC.dateService.truncTimeToUtcNull(AC.dateService.addDays(me.attr.empOrderVacationLongID.getFieldValue('dateTo'), 1))
  if (dateFrom < dateVacFrom) {
    await $App.dialogInfo(UB.i18n('Дата виходу з відпустки повинна бути більшою або рівною дати початку відпустки {0}', AC.dateService.formatDate(dateVacFrom)))
    return false
  }
  if (dateFrom > dateVacTo) {
    await $App.dialogInfo(UB.i18n('Дата виходу з відпустки повинна бути меншою або рівною за дату закінчення відпустки {0}', AC.dateService.formatDate(dateVacTo)))
    return false
  }

  const res = await UB.Repository('hr_empOrderVacationretDet')
    .attrs(['ID', 'empOrderVacationLongID', 'orderID.description', 'dateFrom'])
    .where('empOrderVacationLongID', 'equal', me.attr.empOrderVacationLongID.getValue())
    .where('employeePositionID', 'equal', me.attr.employeePositionID.getValue())
    .where('orderID.orderState', 'in', ['POSTED'])
    .where('dateFrom', '>', AC.dateService.shiftDate(me.attr.dateFrom.getValue()))
    .selectSingle()
  if (res) {
    await $App.dialogInfo(`Увага. Працівника ${me.attr.employeePositionID.getFieldValue('description')} виведено з довготривалої відпустки з ${AC.dateService.formatDate(res.dateFrom)} за ${res['orderID.description']}. Для коректної роботи системи потрібно розпровести ${res['orderID.description']} перед проведенням поточного наказу.`)
  }
}

function initComponentStart () {
  let me = this
  me.on('controlChanged', onControlChanged, me)
  me.on('recordloaded', onRecordLoaded, me)
  me.on('formDataReady', onFormDataReady, me)
  me.on('beforesave', onBeforeSave, me)
  me.on('beforeClose', function () {
    let sender = me.sender
    if (sender) {
      let grid = sender.getStore ? me.sender : (sender.panel && sender.panel.getStore) ? sender.panel : null
      if (grid) {
        grid.getStore().load()
      }
    }
    return true
  })
}

function initComponentDone () {
  let me = this
  AC.viewUtils.setAttr(me)

  if (me.customParams.orderForm) {
    me.masterForm = me.orderForm = me.customParams.orderForm
  } else {
    me.masterForm = me.orderForm = me.sender.up('form')
  }
  me.orderState = me.orderForm.record.get('orderState')
}

function initUBComponent () {
  const me = this
  AC.viewUtils.initToolTips(me)
}

function onRecordLoaded () {
  const me = this
  me.orderForm.filterEmployeePosition(me, {
    clearValue: false,
    attrToFilter: 'employeePositionID'
    // params: [['positionID', 'isNotNull']]
  })
  me.setTitleByOrderType()

  if (me.isNewInstance) {
    me.record.set('orderID', me.orderForm.instanceID)
    me.record.set('organizationID', me.orderForm.record.get('organizationID'))
    if (me.customParams.empOrderType) {
      me.record.set('empOrderType', me.customParams.empOrderType)
    }
    const orderDate = AC.dateService.truncTimeToUtcNull(me.orderForm.record.get('orderDate') || me.orderForm.record.get('entryDate'))
    me.record.set('dateFrom', orderDate)
  }

  me.orderForm.makeReasonSelector(me, {
    reasonFieldName: 'reason',
    entityName: 'hr_dictReasonVacation'
  })
  me.orderForm.makeReasonSelector(me, {
    reasonFieldName: 'reasonDoc',
    entityName: 'hr_dictOrderDetReasonDoc'
  })
  me.orderForm.makeReasonSelector(me, {
    reasonFieldName: 'reasonOrder',
    entityName: 'hr_dictOrderDetReasonDoc'
  })
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
  HR.orderManager.setDefaultValues(me)
}

function onFormDataReady () {
  const me = this
  HR.orderManager.disableContextMenuItems(me.attr.employeePositionID, ['addItem', 'editItem'])
  me.enableControls()
  if (!me.isReadOnly) {
    me.filterPosition()
    if (!me.isNewInstance) {
      me.filterOrder()
    }
  }
  HR.orderManager.disableContextMenuItems(me.attr.empOrderVacationLongID, ['showLookup', 'addItem'])
  if (!me.isNewInstance) {
    me.actions.actionMoveOrderId.show()
    me.attr.dateFrom.setMinValue(AC.dateService.shiftDate(me.attr.empOrderVacationLongID.getFieldValue('dateFrom')))
    me.attr.dateFrom.setMaxValue(AC.dateService.addDays(AC.dateService.shiftDate(me.attr.empOrderVacationLongID.getFieldValue('dateTo')), 1))
  }

  me.attr.reasonOrder[AC.settings.get('hrEnableReasonDoc', appAC.globalOrganization()) ? 'show' : 'hide']()
}

function addBaseActions () {
  const me = this
  me.callParent(arguments)
  let actionMoveOrderIdAction = me.actions.actionMoveOrderId
  if (!actionMoveOrderIdAction) {
    actionMoveOrderIdAction = new Ext.Action({
      actionId: 'actionMoveOrderId',
      actionText: UB.i18n('Наказ про переведення'),
      hidden: true,
      handler: () => {
        $App.connection.run({
          entity: 'hr_empOrderVacationretDet',
          method: 'createMoveOrder',
          paraID: me.instanceID
        }).then(mParams => {
          $App.doCommand({
            cmdType: 'showForm',
            formCode: 'hr_empOrder',
            entity: 'hr_empOrder',
            instanceID: mParams.moveOrderID
          })
        })
      }
    })
    me.actions.actionMoveOrderId = actionMoveOrderIdAction
  }
}

function enableControls () {
  let me = this
  me.isReadOnly = me.orderForm.enableParaControls(me)
  me.setupControls()
}

function onControlChanged (field, value, oldValue) {
  const me = this
  if (me.isInternalChange) {
    me.isInternalChange = false
    return
  }
  let orderCtrl = me.attr.empOrderVacationLongID
  const empOrderVacationLongID = me.attr.empOrderVacationLongID
  const retPositionID = me.attr.retPositionID

  switch (field.name) {
    case 'employeePositionID':
      if (field.isNotChange) {
        delete field.isNotChange
        return
      }
      me.checkVacSubstitution(field, value, oldValue).then(result => {
        if (result) {
          orderCtrl.isNotChange = true
          me.record.set('empOrderVacationLongID', null)
          orderCtrl.setValue(null)
          orderCtrl.setDisabled(false)
          me.filterOrder().then(order => {
            if (order) {
              setTimeout(() => {
                me.record.set('empOrderVacationLongID', order.ID)
                orderCtrl.setValueById(order.ID)
                me.attr.dateFrom.isNotChange = true
                me.attr.dateFrom.setValue(AC.dateService.addDays(AC.dateService.shiftDate(order.dateTo), 1))
              }, 200)
            }
          })
        }
      })
      break
    case 'dateFrom':
      if (field.isNotChange) {
        delete field.isNotChange
        return
      }
      if (AC.dateService.isValid(value)) {
        me.checkVacSubstitution(field, value, oldValue).then(result => {
          if (result) {
            empOrderVacationLongID.setDisabled(false)
            retPositionID.setDisabled(false)
            me.filterPosition()
          }
        })
      } else {
        me.record.set('empOrderVacationLongID', null)
        empOrderVacationLongID.setValue(null)
      }
      break
    case 'isVacancies':
      retPositionID.setDisabled(false)
      me.filterPosition(value)
      me.down('[ubID=btnSelectByTree]').setVisible(!value)
      break
    case 'empOrderVacationLongID':
      if (value && field.getFieldValue('dateFrom')) {
        me.attr.dateFrom.setMinValue(AC.dateService.shiftDate(field.getFieldValue('dateFrom')))
        me.attr.dateFrom.setMaxValue(AC.dateService.addDays(AC.dateService.shiftDate(field.getFieldValue('dateTo')), 1))
      } else {
        me.attr.dateFrom.setMinValue()
        me.attr.dateFrom.setMaxValue()
      }
      break
  }
  me.setupControls()
}

function setTitleByOrderType () {
  this.orderForm.setTitleByOrderType(this)
}

function checkVacSubstitution (ctrl, value, oldValue) {
  const me = this
  const grid = me.down('[name=empOrderVacSubstitutionDet]')
  return grid.getStore().load().then(store => {
    if (store.data.length) {
      return $App.dialogYesNo(UB.i18n('Попередження'), UB.i18n('Внесена інформація на вкладці "Припинити роботу працівникам" буде видалена! Продовжити?'))
        .then(result => {
          if (result) {
            return $App.connection.run({
              entity: 'hr_empOrderVacSubstitutionDet',
              method: 'clearVacSubstitutionDet',
              paraID: me.instanceID
            }).then(() => {
              grid.onRefresh()
              return true
            })
          } else {
            me.isInternalChange = true
            try {
              ctrl.setValue(oldValue)
            } finally {
              me.isInternalChange = false
            }
            return false
          }
        })
    }
    return true
  })
}
