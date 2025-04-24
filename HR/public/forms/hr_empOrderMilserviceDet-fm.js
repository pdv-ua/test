/* global AC HR UB $App appAC Ext */
exports.formCode = {
  controlChanged,
  initComponentStart,
  enableControls,
  initComponentDone,
  onCheckValidBeforeSaveForm,
  recordLoaded,
  setPaymentControls,
  addBaseActions,
  checkDictTimeCost
}

function initComponentStart () { // Вызывается прямо перед запуском инициализации формы.
  // В этом событии  можно изменить конфигурацию формы.
  let me = this
  me.on('controlChanged', controlChanged, me)
  me.on('afterrender', () => {
    me.orderForm.makeReasonSelector && me.orderForm.makeReasonSelector(me)
  })

}

function initComponentDone () {
  const me = this
  if (me.customParams.orderForm) {
    me.masterForm = me.orderForm = me.customParams.orderForm
  } else {
    if (me.sender) {
      me.masterForm = me.orderForm = me.sender.up('form')
    }
  }

  me.orderState = me.orderForm && me.orderForm.record.get('orderState')

  me.onBeforeSave = () => {
    return me.onCheckValidBeforeSaveForm()
  }

  me.on('recordloaded', recordLoaded)
  me.on('formDataReady', async () => {
    HR.orderManager.setTitleByOrderType(me)
    HR.orderManager.showIf(me)
    HR.orderManager.requiredIf(me)
    HR.orderManager.disableContextMenuItems(me.attr.employeePositionID, ['editItem', 'addItem'])
    HR.orderManager.disableContextMenuItems(me.attr.dictTimeCostID, ['editItem', 'addItem'])
    me.orderAttrConfigList = await HR.orderManager.loadOrderAttrConfig(me.record.get('empOrderType'), me.record.get('organizationID'))
    if (!me.isNewInstance) {
      me.orderAttrConfig = HR.orderManager.findOrderAttrConfig(me.orderAttrConfigList, me.attr.employeePositionID.getFieldValue('dictStaffCatID'), me.attr.employeePositionID.getFieldValue('positionType'))
    }
    me.enableControls()
  })

  AC.viewUtils.setAttr(me)

  const isEnableReasonDoc = AC.settings.get('hrEnableReasonDoc')
  if (isEnableReasonDoc) {
    me.down('[name=reasonDocPanel]').show()
  }
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
                        entity: 'hr_empOrderMilserviceDet',
                        method: 'addIntComb',
                        orderID: me.record.get('orderID'),
                        employeePositionIDs: resp,
                        dictTimeCostID: me.attr.dictTimeCostID.getValue(),
                        dateFrom: me.attr.dateFrom.getValue(),
                        dateTo: me.attr.dateTo.getValue(),
                        payElID: me.attr.payElID.getValue(),
                        dictMilitaryDutyID: me.attr.dictMilitaryDutyID.getValue(),
                        isPosReserved: me.attr.isPosReserved.getValue(),
                        isTempStopVacation: me.attr.isTempStopVacation.getValue()
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
                  entity: 'hr_empOrderMilserviceDet',
                  method: 'addIntComb',
                  orderID: me.record.get('orderID'),
                  employeePositionIDs: result.map(o => o.ID),
                  dictTimeCostID: me.attr.dictTimeCostID.getValue(),
                  dateFrom: me.attr.dateFrom.getValue(),
                  dateTo: me.attr.dateTo.getValue(),
                  payElID: me.attr.payElID.getValue(),
                  dictMilitaryDutyID: me.attr.dictMilitaryDutyID.getValue(),
                  isPosReserved: me.attr.isPosReserved.getValue(),
                  isTempStopVacation: me.attr.isTempStopVacation.getValue()
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
              $App.dialogInfo(`Станом на ${AC.dateService.formatDate(me.attr.dateFrom.getValue())}${me.attr.dateTo.getValue() ? ` / ${AC.dateService.formatDate(me.attr.dateTo.getValue())}` : ''} у працівника ${me.attr.employeePositionID.getFieldValue('description')} немає внутрішнього сумісництва`, UB.i18n('Увага'))
              return Promise.resolve(false)
            }
          })
        })
      }
    })
    me.actions.addIntComb = addIntCombAction
  }
}

function enableControls () {
  const me = this
  const isPosted = me.orderForm ? me.orderForm.enableParaControls(me) : true
  if (!me.orderForm) {
    HR.orderManager.enableControls({
      me: me,
      isEnabled: false
    })
  }
  const addIntCombAction = me.actions.addIntComb
  if (addIntCombAction) {
    let workPlace = me.attr.employeePositionID.getFieldValue('workPlace')
    addIntCombAction.setDisabled(!(me.isEditMode && workPlace === '1'))
  }
  if (!isPosted) me.setPaymentControls()
  return isPosted
}

function recordLoaded () {
  const me = this
  if (!me.orderForm) {
    return
  }
  if (me.isNewInstance) {
    me.record.set('dateFrom', AC.dateService.truncTimeToUtcNull(me.orderForm.record.get('orderDate')))
    me.record.set('orderID', me.orderForm.instanceID)
    me.record.set('organizationID', me.orderForm.record.get('organizationID'))
    UB.Repository('hr_dictMilitaryDuty')
      .attrs(['ID'])
      .where('code', '=', '1')
      .selectScalar()
      .then(id => {
        if (id) {
          me.attr.dictMilitaryDutyID.setValueById(id)
        }
      })
  }
  HR.orderManager.showIf(me)
  HR.orderManager.requiredIf(me)
  me.orderForm.filterEmployeePosition(me, {
    attrToFilter: 'employeePositionID'
  })
  me.record.store.on('update', (store, reco, oper, modified, eOpts) => {
    HR.orderManager.showIf(me)
    HR.orderManager.requiredIf(me)
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
}

function controlChanged (field, value, oldValue) {
  let me = this
  switch (field.name) {
    case 'employeePositionID':
      me.orderAttrConfig = HR.orderManager.findOrderAttrConfig(me.orderAttrConfigList, field.getFieldValue('dictStaffCatID'), field.getFieldValue('positionType'))
      me.setPaymentControls(true)
      break
    case 'payElID':
      me.record.set('dictTimeCostID', field.getFieldValue('dictTimeCostID'))
      me.checkDictTimeCost()
      break
  }
}

function onCheckValidBeforeSaveForm () {
  const me = this
  if (me.attr.dateTo.getValue() && me.attr.dateFrom.getValue() > me.attr.dateTo.getValue()) {
    $App.dialogInfo(UB.i18n(`Дата увільнення ${AC.dateService.formatDate(me.attr.dateFrom.getValue())} не може бути більшою за дату прийняття ${AC.dateService.formatDate(me.attr.dateTo.getValue())}!`))
    return Promise.resolve(false)
  }
  if (!me.checkDictTimeCost()) {
    return Promise.resolve(false)
  }
  return $App.connection.run({
    entity: me.entityName,
    method: 'checkCrossTimeSheet',
    employeeNumberID: me.attr.employeePositionID.getFieldValue('employeeNumberID'),
    dictTimeCostID: me.attr.dictTimeCostID.getValue(),
    dateFrom: me.attr.dateFrom.getValue(),
    dateTo: me.attr.dateTo.getValue()
  }).then(mParams => {
    if (mParams.result) {
      const result = JSON.parse(mParams.result)
      if (Array.isArray(result) && result.length) {
        const msg = UB.i18n(`У табелі існують елементи, для яких неможливий перетин з "{0}": `, me.attr.dictTimeCostID.getFieldValue('nameSmall'))
        return $App.dialogYesNo(UB.i18n('Попередження'), msg + result.slice(1, 50).join(', ') + UB.i18n('... Зберегти ?')).then(isAgree => {
          return Promise.resolve(isAgree)
        })
      } else {
        return Promise.resolve(true)
      }
    } else {
      return Promise.resolve(true)
    }
  })
}

function setPaymentControls (isSetValue) {
  const me = this
  const config = me.orderAttrConfig
  if (config) {
    me.attr.payElID.setDisabled(!config.canEditPayElMain)
    // me.attr.dictTimeCostID.setDisabled(!config.canEditDictTimeCost)
    if (isSetValue) {
      me.record.set('payElID', config.payElIDMain)
      // me.record.set('dictTimeCostID', config.dictTimeCostID)
    }
  } else {
    me.attr.payElID.setDisabled(true)
    // me.attr.dictTimeCostID.setDisabled(true)
  }
}

function checkDictTimeCost () {
  const me = this
  if (me.attr.payElID.getValue() && !me.attr.payElID.getFieldValue('dictTimeCostID')) {
    $App.dialogInfo(UB.i18n(`Для вибраного виду оплати у довіднику не встановлений елемент обліку робочого часу. Неможливо коректне заповнення табелю обліку робочого часу. Виберіть інший вид оплати або виправте в довіднику.`))
    return false
  }
  return true
}
