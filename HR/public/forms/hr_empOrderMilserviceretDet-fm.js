/* global HR AC appAC UB $App Ext */
exports.formCode = {
  getEmpOrderType,
  initComponentStart,
  filterOrderPara,
  initUBComponent,
  initComponentDone,
  enableControls,
  onAfterOrderSave,
  onBeforeSave,
  addBaseActions
}

function onBeforeSave () {
  const me = this
  return new Promise(function (resolve) {
    UB.Repository('hr_empOrderMilserviceretDet')
      .attrs(['ID', 'sourceParaID', 'orderID.description', 'dateFrom'])
      .where('sourceParaID', 'equal', me.attr.sourceParaID.getValue())
      .where('employeePositionID', 'equal', me.attr.employeePositionID.getValue())
      .where('orderID.orderState', 'in', ['POSTED'])
      .where('dateFrom', '>', AC.dateService.shiftDate(me.attr.dateFrom.getValue()))
      .selectAsObject()
      .then(res => {
        if (res.length) {
          $App.dialogInfo(`Увага. Працівника ${me.attr.employeePositionID.getFieldValue('description')} повернуто з військової служби з ${AC.dateService.formatDate(res[0].dateFrom)} за ${res[0]['orderID.description']}. Для коректної роботи системи потрібно розпровести ${res[0]['orderID.description']} перед проведенням поточного наказу.`)
          resolve(true)
        }
      })
  })
}

function addBaseActions () {
  const me = this
  me.callParent(arguments)
  let addIntCombAction = me.actions.addIntComb
  if (!addIntCombAction) {
    addIntCombAction = new Ext.Action({
      actionId: 'addIntComb',
      eventId: 'addIntComb',
      text: UB.i18n('Наказ на сумісника'),
      iconCls: 'fa fa-clone',
      handler: function () {
        return HR.controlService.checkAndSaveForm(me, function () {
          return HR.orderManager.getIntComb(me).then(result => {
            if (result && result.length) {
              if (result.length > 1) {
                return $App.doCommand({
                  cmdType: 'showForm',
                  formCode: 'hr_empOrderIntCombSelect',
                  isModal: true,
                  entity: 'hr_empOrderIntCombSelect',
                  cmpInitConfig: {
                    defaultValues: {
                      employeePositions: result
                    },
                    onSave: (resp) => {
                      resp = resp.split(',').map(o => parseInt(o)).filter(o => o)
                      if (!resp.length) return
                      return $App.connection.run({
                        entity: 'hr_empOrderMilserviceretDet',
                        method: 'addIntComb',
                        orderID: me.record.get('orderID'),
                        employeePositionIDs: resp,
                        dateFrom: me.attr.dateFrom.getValue()
                      }).then((mParams) => {
                        if (mParams.msg) {
                          $App.dialogInfo(mParams.msg, UB.i18n('Увага'))
                          return
                        }
                        if (mParams.res) {
                          const grid = AC.gridUtils.getSenderGrid(me)
                          me.closeWindow(true)
                          HR.controlService.selectAndEdit(grid, { idxCode: 'last' })
                          grid.onRefresh()
                        }
                      })
                    }
                  },
                  tabId: `hr_empOrderIntCombSelect`
                })
              } else {
                return $App.connection.run({
                  entity: 'hr_empOrderMilserviceretDet',
                  method: 'addIntComb',
                  orderID: me.record.get('orderID'),
                  employeePositionIDs: result.map(o => o.ID),
                  dateFrom: me.attr.dateFrom.getValue()
                }).then((mParams) => {
                  if (mParams.msg) {
                    $App.dialogInfo(mParams.msg, UB.i18n('Увага'))
                    return
                  }
                  if (mParams.res) {
                    const grid = AC.gridUtils.getSenderGrid(me)
                    me.closeWindow(true)
                    HR.controlService.selectAndEdit(grid, { idxCode: 'last' })
                    grid.onRefresh()
                  }
                })
              }
            } else {
              $App.dialogInfo(`Станом на ${AC.dateService.formatDate(me.attr.dateFrom.getValue())} у працівника ${me.attr.employeePositionID.getFieldValue('description')} немає внутрішнього сумісництва`, UB.i18n('Увага'))
              return Promise.resolve(false)
            }
          })
        })
      }
    })
    me.actions.addIntComb = addIntCombAction
  }
}

function getEmpOrderType () {
  return this.customParams.empOrderType || this.record.get('empOrderType')
}

function initComponentStart () { // Вызывается прямо перед запуском инициализации формы.
  // В этом событии  можно изменить конфигурацию формы.
  let me = this
  me.on('afterrender', function () {
    me.orderForm.makeReasonSelector && me.orderForm.makeReasonSelector(me)
    me.orderConfig = {
      detailGrids: []
    }
  })
  me.on('formDataReady', function () {
    HR.orderManager.disableContextMenuItems(me.getField('employeePositionID'), ['addItem', 'editItem'])
    HR.orderManager.disableContextMenuItems(me.down('[attributeName=sourceParaID]'), ['editItem', 'addItem'])
    setEmployeePositionFilter(me, me.record.get('dateFrom'), false)
  })
  me.on('recordloaded', function (a) {
    let me = this
    if (me.isNewInstance) {
      me.record.set('organizationID', me.masterForm.record.get('organizationID'))
      me.record.set('dateFrom', AC.dateService.truncTimeToUtcNull(me.masterForm.record.get('orderDate')))
      me.record.set('orderID', me.masterForm.instanceID)
      me.record.set('empOrderType', me.customParams.empOrderType)
    } else {
      me.customParams.empOrderType = me.record.get('empOrderType')
      me.filterOrderPara({
        employeeNumberID: me.record.get('employeePositionID.employeeNumberID'),
        isClear: false,
        isReload: false
      })
    }
    me.on('beforesave', onBeforeSave, me)
    me.enableControls()
    HR.orderManager.setDefaultValues(me)
    HR.orderManager.showIf(me)
    HR.orderManager.requiredIf(me)
    HR.orderManager.disabledIf(me)
    HR.orderManager.setTitleByOrderType(me)
  })
  me.onBeforeSave = () => {
    return Promise.resolve(true)
  }
  me.on('controlChanged', function (field, value) {
    switch (field.name) {
      case 'dateFrom':
        if (value && field.isValid()) {
          setEmployeePositionFilter(me, value)
        }
        break
      case 'employeePositionID':
        me.filterOrderPara({
          employeeNumberID: field.getFieldValue('employeeNumberID'),
          isClear: true,
          isReload: true
        })
        break
    }
  }, me)
}
function filterOrderPara ({
  employeeNumberID,
  isClear = false,
  isReload = false
} = {}) {
  let me = this
  let para = me.getField('sourceParaID')
  AC.viewUtils.setWhereListProperty(para, [
    ['employeeNumberID', '=', employeeNumberID]
  ])
  if (isClear) {
    para.setValue()
  }
  if (isReload) {
    para.getStore().load()
  }
  me.getField('sourceParaID').setDisabled(!employeeNumberID)
}

function initUBComponent () { // Вызывается после окончания привязки данных к элементам формы. Непосредственно перед formDataReady  и перед снятием блокировки формы (затемнение) .

}

function initComponentDone () {
  let me = this
  if (me.customParams.orderForm) {
    me.orderForm = me.orderForm = me.masterForm = me.customParams.orderForm
  } else {
    me.masterForm = me.orderForm = me.sender.up('form')
  }
  me.record.store.on('update', (store, reco, oper, modified, eOpts) => {

  })

  AC.viewUtils.setAttr(me)

  me.orderState = me.orderForm.record.get('orderState')
  if (me.orderState === 'PROJECT') {
    HR.orderManager.setNextRecordMaker(me, [{
      organizationID: value => me.orderForm.record.get('organizationID'),
      empOrderType: value => value,
      orderID: value => value,
      dateFrom: value => AC.dateService.truncTimeToUtcNull(value),
      isPaymentProp: value => value
    }], 4)
    /*    me.masterForm.filterEmployeePosition(me, {
      attrToFilter: 'employeePositionID'
    })
*/ }

  const isEnableReasonDoc = AC.settings.get('hrEnableReasonDoc')
  if (isEnableReasonDoc) {
    me.down('[name=reasonDocPanel]').show()
  }
}

function enableControls () {
  return this.masterForm.enableParaControls(this)
}

function onAfterOrderSave () {
  const me = this
  me.enableControls()
}

function setEmployeePositionFilter (me, dateFrom = me.record.get('dateFrom'), isClearValue = true) {
  UB.Repository('hr_employeeNumberS')
    .attrs(['ID'])
    .where('orgID', '=', me.record.get('organizationID'))
    .where('dateFrom', '<=', dateFrom || appAC.globalApplicationDate())
    .where('dateTo', '>=', dateFrom || appAC.globalApplicationDate())
    .exists(UB.Repository('hr_empOrderMilserviceDet')
      .attrs(['ID'])
      .correlation('employeeNumberID', 'ID')
      .where('empOrderType', '=', 'MILSERVICE')
      .where('dateFrom', '<=', dateFrom || appAC.globalApplicationDate())
      .where('dateTo', '>=', AC.dateService.addDays(dateFrom, -1) || appAC.globalApplicationDate(), 'exp1')
      .where('dateTo', 'isNull', undefined, 'exp2')
      .logic('(([exp1]) or ([exp2]))')
      .where('orderID.orderState', '=', 'POSTED', 'orderStatePOSTED')
      .where('orderID.orderState', '=', 'PROCESSED', 'orderStatePROCESSED')
      .where('mi_deleteDate', '>=', '#maxdate')
      .logic('([orderStatePOSTED] OR [orderStatePROCESSED])')
    )
    .selectAsArrayOfValues().then((res) => {
      if (me.getField('employeePositionID').getStore() || me.getField('employeePositionID').store) {
        AC.viewUtils.setWhereListProperty(me.getField('employeePositionID'), [
          ['organizationID', '=', me.record.get('organizationID')],
          ['employeeNumberID', 'IN', res.length ? res : [0]],
          ['dateFrom', '<=', dateFrom || appAC.globalApplicationDate()],
          ['dateTo', '>=', dateFrom || appAC.globalApplicationDate()]
        ], null, isClearValue ? ['clearValue', 'clearStore'] : ['clearStore'])
      }
    })
}
