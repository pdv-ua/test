/* global AC UB $App Ext _ HR appAC */
module.exports = {
  init,
  userHasRole,
  isAdmin,
  setOrderConfig,
  setIsDirty,
  addOrderAction,
  removeHidddenActions,
  enableControls,
  enableGrid,
  createNewOrder,
  doPosting,
  setNextRecordMaker,
  showIf,
  requiredIf,
  readOnlyIf,
  disabledIf,
  setDefaultValues,
  getOrderAccrualGrid,
  getEmployeeParaGrid,
  getActingParaGrid,
  getVacationPlanParaGrid,
  disableContextMenuItems,
  getSalaryGrid,
  getDepPosBlock,
  setDateChecker,
  setTitleByOrderType,
  internalDelete,
  createShowImportAction,
  getPostWarningAllType,
  getPostWarning,
  getBeforePostPromise,
  getCancelPostWarning,
  changeAction,
  calculateDateTrialEnd,
  getHolidays,
  getCalendarChanges,
  isWorkingDay,
  checkRankValue,
  checkRankPsCategory,
  getDetailEntityName,
  empOrderEmployeeSearch,
  doCancelPostingOrderRegistry,
  setOrderRegistryActions,
  setSourceOrderDescription,
  orderRegistryInit,
  orderRegistryPostingSelected,
  checkBoxColumnConfig,
  findOrderAttrConfig,
  loadOrderAttrConfig,
  checkIntCombVac,
  getIntComb,
  findMasterRecord,
  getSelectedOrderRegistry,
  uniqListOfIDs,
  setMasterOrgFilter,
  doCheckStaffList,
  isUserOrdersSubordinate,
  getOrderRegistryRlAction,
  getOrderRegistryEmployeeAction,
  getOrderRegistryDeleteAction,
  getOrderRegistryDimensionAction,
  calcTarifAccrualSum,
  loadOrderFundSource,
  checkOrderFundSource,
  beforeSave,
  beforeClose,
  checkEmpOrderAccDateFrom,
  setMultiOrderButton,
  checkMultiOrgActionState,
  offerToCorrectSeveralPublServRang
}

/**
 * Менеджер управления формой приказов
 * Call function on order
 * postInit - when form record load is finish
 * onAddNewByCurrent - when you create a order based on another order
 * initOrderComponentDone - when component was initialized
 * onFormDataReady - when after form fields are updated
 * onAfterOrderSave - when order saved
 * onPrepareDataBeforeSaveOrder - before data passed to a server for update/insert
 * onCheckValidBeforeSaveOrder - here you can check valid control before save order
 */
function init (me) {
  /* Fires when form record load is finish */
  me.on('recordloaded', onRecordLoaded, me)
  /* Fires on component was initialized */
  me.on('initComponentDone', initComponentDone, me)
  /* Fires when record saved */
  me.on('aftersave', onAfterSave, me)
  /* Fires when data bonded and all form required data loaded */
  me.on('formDataReady', formDataReady, me)
  /* Fires after form fields are updated */
  me.on('updateFields', updateFields, me)
  /* Fires just **after** USER call `save` action (press save button or Ctrl+S shortcut) */
  me.on('manualsaving', manualSaving, me)
  /* Fires just before data passed to a server for update/insert */
  me.on('beforesave', beforeSave, me)
  /* Fires before refresh order */
  me.on('beforeRefresh', beforeRefresh, me)
  /* Fires before close panel */
  me.on('beforeclose', beforeClose, me)
  /* Fires when any binded control changed by user */
  me.on('controlChanged', orderControlChanged, me)

  setOrderConfig(me)

  me.onBeforeSave = onBeforeSave

  me.setIsDirty = function (value) {
    setIsDirty(me, value)
  }

  me.getGridEditState = function () {
    let edit = false
    me.query('ubdetailgrid').forEach(function (grid) {
      if (grid.editingPlugin && grid.editingPlugin.editing) {
        edit = true
      }
    })
    me.query('acGrid').forEach(function (grid) {
      if (_.get(grid.down('grid'), 'editingPlugin.editing')) {
        edit = true
      }
    })
    return edit
  }
  me.isEditable = isEditable
}

function userHasRole (roleName) {
  const roles = $App.connection.userData().roles.toUpperCase().split(',')
  return roles.includes(roleName)
}

function isAdmin () {
  return userHasRole('ADMIN')
}

function setOrderConfig (me) {
  if (!me.orderConfig) {
    me.orderConfig = {
      customAddNewByCurrent: true,
      customPrepareDataBeforeSaveOrder: true,
      customOnAfterOrderSave: true
    }
  }
  if (!me.orderConfig.stateAttrName) {
    me.orderConfig.stateAttrName = 'orderState'
  }
  if (!me.orderConfig.orderDateAttrName) {
    me.orderConfig.orderDateAttrName = 'orderDate'
  }
}

function setIsDirty (me, value) {
  me.setActionDisabled('save', !value)
  me.setActionDisabled('saveAndClose', !value)
  me.record.dirty = value
}

// in other state disable all controls and grid
const allowChangeDocStates = ['PROJECT', 'ON_COMPLETION']

function isEditable () {
  const me = this
  if (me.record) {
    const newState = me.record.get(me.orderConfig.stateAttrName)
    return allowChangeDocStates.includes(newState) && AC.entityUtils.verifyRightsMethod(me.entityName, 'update')
  }
  return true
}

function setDefaultValues (me) {
  if (me.isNewInstance && me.defaultValues) {
    for (const attr in me.defaultValues) {
      // eslint-disable-next-line no-prototype-builtins
      if (me.defaultValues.hasOwnProperty(attr)) {
        const value = me.defaultValues[attr]
        me.record.set(attr, value)
        const ctrl = me.getField(attr)
        if (ctrl && ctrl.setValueById) {
          ctrl.setValueById(value)
        }
      }
    }
  }
}

function setDateChecker (me, { dateFrom, dateTo, fieldToChange }) {
  const isDateValid = aDate => aDate && _.isFunction(aDate.getFullYear)
  dateFrom = dateFrom || (me && me.getField('dateFrom'))
  if (!dateFrom) {
    $App.dialogError('orderManager.setDateChecker() -> Field dateFrom not found', UB.i18n('Помилка'))
    return
  }
  dateTo = dateTo || (me && me.getField('dateTo'))
  if (!dateTo) {
    $App.dialogError('orderManager.setDateChecker() -> Field dateTo not found', UB.i18n('Помилка'))
    return
  }
  if (dateFrom === dateTo) {
    $App.dialogError(UB.i18n('orderManager.setDateChecker() -> Вказані однакові поля dateFrom та dateTo'), UB.i18n('Помилка'))
    return
  }
  fieldToChange = fieldToChange || dateTo
  function checkDates (ctrl) {
    const dateFromValue = dateFrom.getValue()
    const dateToValue = dateTo.getValue()
    try {
      if (isDateValid(dateFromValue) && isDateValid(dateToValue)) {
        if (dateFromValue > dateToValue) {
          $App.dialogError(UB.i18n(`Дата "{0}" не може бути більшою за "{1}"`, dateFrom.fieldLabel || dateFrom.caption ||
            UB.i18n('початку'), dateTo.fieldLabel || dateTo.caption || UB.i18n('дату закінчення')), UB.i18n('Помилка'))
          if (fieldToChange === dateTo) {
            fieldToChange.setValue(dateFromValue)
          } else {
            fieldToChange.setValue(dateToValue)
          }
        }
      }
    } catch (e) { console.error('Ups!', e.message) }
  }
  dateFrom.on('blur', checkDates)
  dateTo.on('blur', checkDates)
}

function setTitleByOrderType (me) {
  const empOrderType = me.customParams.empOrderType || me.record.get('empOrderType')
  let title = UB.core.UBEnumManager.getStore('HR_EMPORDRETYPE').getById(empOrderType).get('shortName')
  if (me.isNewInstance) {
    title += UB.i18n(' (створення)')
  }
  me.setTitle(UB.i18n('Наказ про ') + title)
}

function setNextRecordMaker (me, fieldsToCopy, idx, afterRenderFn, isNextPeriod = false, isNextDay = false) {
  const tb = me.down('toolbar')
  const makeNextRecord = function (prevForm, config) {
    config = config || []
    const defaultValues = {}
    const sender = prevForm.sender

    const fieldsToCopy = _.isArray(config) ? config : config.fieldsToCopy
    prevForm.saveForm()
      .then(function (saveStatus) {
        prevForm.unmaskForm()
        fieldsToCopy.forEach(function (item) {
          let value
          if (_.isObject(item)) {
            const attrs = Object.keys(item)
            attrs.forEach(attrName => {
              value = item[attrName]
              if (_.isFunction(value)) {
                value = value(prevForm.record.get(attrName), prevForm)
              } else if (!_.isUndefined(prevForm.record.data[value])) {
                value = prevForm.record.get(value)
              }
              defaultValues[attrName] = value
            })
          } else {
            defaultValues[item] = prevForm.record.get(item)
          }
        })
        if (saveStatus >= 0) {
          let grid
          if (sender) {
            if (sender.onRefresh) {
              grid = sender
            } else {
              grid = sender.up && (sender.up('[onRefresh]'))
            }
          }
          const store = grid && grid.getStore && grid.getStore()
          // let customParams = _.cloneDeep(prevForm.customParams) || {}
          const customParams = prevForm.customParams
          customParams.fromMakeNextRecord = true
          const runParams = {
            cmdType: 'showForm',
            formCode: prevForm.formCode,
            entity: prevForm.entityName,
            instanceID: null,
            isModal: true,
            tabId: null,
            sender: sender,
            customParams: customParams,
            cmpInitConfig: {
              gridSender: prevForm.gridSender,
              sender: sender,
              defaultValues: defaultValues,
              listeners: {
                afterrender: form => {
                  if (afterRenderFn) {
                    afterRenderFn(form)
                  }
                }
              }
            }
          }
          if (store) {
            // store.load().then(() => {
            $App.doCommand(runParams)
            prevForm.closeWindow(true)
            // })
          } else {
            $App.doCommand(runParams)
            prevForm.closeWindow(true)
          }
        }
      }).catch(e => AC.viewUtils.showToast(UB.i18n('Помилка'), e.message))
  }
  idx = idx || 6
  fieldsToCopy = fieldsToCopy || []

  const wnd = me.getFormWin() || me.up()
  if (!isNextPeriod && !isNextDay) {
    tb.insert(idx,
      Ext.create('Ext.Button', {
        ubID: 'btnNextMenu',
        xtype: 'button',
        text: UB.i18n('Наступний (F7)'),
        handler: function () {
          makeNextRecord(me, fieldsToCopy)
        }
      }))

    return new Ext.util.KeyMap({
      target: (wnd && wnd.getEl()) || me,
      binding: [{
        key: Ext.EventObject.F7,
        fn: function (keyCode, e) {
          makeNextRecord(me, fieldsToCopy)
        }
      }]
    })
  } else if (isNextPeriod) {
    tb.insert(idx,
      Ext.create('Ext.Button', {
        ubID: 'btnNextMenu',
        xtype: 'button',
        text: UB.i18n('Наступний період (F8)'),
        handler: function () {
          makeNextRecord(me, fieldsToCopy)
        }
      }))

    return new Ext.util.KeyMap({
      target: (wnd && wnd.getEl()) || me,
      binding: [{
        key: Ext.EventObject.F8,
        fn: function (keyCode, e) {
          makeNextRecord(me, fieldsToCopy)
        }
      }]
    })
  } else if (isNextDay) {
    tb.insert(idx,
      Ext.create('Ext.Button', {
        ubID: 'btnNextMenu',
        xtype: 'button',
        text: UB.i18n('Наступний день (F9)'),
        handler: function () {
          makeNextRecord(me, fieldsToCopy)
        }
      }))

    return new Ext.util.KeyMap({
      target: (wnd && wnd.getEl()) || me,
      binding: [{
        key: Ext.EventObject.F9,
        fn: function (keyCode, e) {
          makeNextRecord(me, fieldsToCopy)
        }
      }]
    })
  }
}

function onRecordLoaded (record, data) {
  const me = this
  changeAction(me)
  if (me.isNewInstance && data.detail) {
    if (_.isString(data.detail)) {
      me.addNewData = { detail: JSON.parse(data.detail) }
    } else if (_.isObject(data.detail)) {
      me.addNewData = { detail: {} }
      Object.keys(data.detail).forEach((item) => {
        me.addNewData.detail[item] = _.isString(data.detail[item]) ? JSON.parse(data.detail[item]) : data.detail[item]
      })
    }
  }
  if (me.isNewInstance && me.defaultValues) {
    _.forEach(me.defaultValues, (value, name) => {
      if (name !== 'detail') {
        me.record.set(name, value)
        const ctrl = me.attr[name]
        if (ctrl && ctrl.setValueById) {
          ctrl.setValueById(value)
        }
      }
    })
    if (me.defaultValues.detail) {
      me.orderConfig.detailGrids.forEach((detName) => {
        if (me.defaultValues.detail[detName]) {
          const grid = me.down(`[name=${detName}]`)
          grid.store.on('load', () => {
            if (me.isNewInstance) {
              me.defaultValues.detail[detName].forEach((item) => {
                delete item.ID
                delete item.mi_modifyDate
                grid.addNewRecord(item)
              })
              if (grid.GridSummary) {
                grid.GridSummary.dataBind()
              }
              grid.fireEvent('changeData', grid, 'update')
            }
          })
        }
      })
    }
  }
  if (me.isNewInstance && me.addNewData && data.method === 'addnew') {
    me.record.set(me.orderConfig.stateAttrName, 'PROJECT')
    me.getField('orderNumber').setValue(null)
    me.getField(me.orderConfig.orderDateAttrName).setValue(AC.dateService.todayDate())

    if (me.initialConfig.commandConfig.description) {
      me.setTitle(me.initialConfig.commandConfig.description + UB.i18n(' (новий)'))
    }
    if (!me.orderConfig.customAddNewByCurrent) {
      const detail = me.addNewData.detail || null
      if (detail && me.orderConfig.detailGrids) {
        me.orderConfig.detailGrids.forEach((detName) => {
          const grid = me.down(`[name=${detName}]`)
          grid.store.on('load', () => {
            if (me.isNewInstance) {
              detail[detName].forEach((item) => {
                delete item.ID
                delete item.mi_modifyDate
                grid.addNewRecord(item)
              })
              if (grid.GridSummary) {
                grid.GridSummary.dataBind()
              }
              grid.fireEvent('changeData', grid, 'update')
            }
          })
        })
      }
    }
    if (_.isFunction(me.onAddNewByCurrent)) {
      me.onAddNewByCurrent(me.addNewData)
    }
    changeAction(me)
    delete me.addNewData
  }
  me.formData = {}
  me.formData.detail = data.detail ? JSON.parse(data.detail) : []
  if (data.message) {
    $App.dialogInfo(data.message, UB.i18n('Увага'))
  }
  if (_.isFunction(me.postInit)) { me.postInit(me, record, data) }
}

function initComponentDone () {
  const me = this
  const attrTypes = ['ubdetailgrid', 'acGrid']
  if (me.gridConfig && Array.isArray(me.gridConfig.attrs)) {
    attrTypes.push(...me.gridConfig.attrs)
  }
  me.attr = {}
  me.getForm().getFields().items.forEach((item) => {
    if (item.name) {
      me.attr[item.name] = item
    }
    if (item.xtype === 'ubcombobox') {
      item.getFieldValue = function (fieldName) {
        return item.getValue() && item.lastSelection.length ? item.lastSelection[0].get(fieldName) : null
      }
    }
  })
  attrTypes.forEach(attrType => {
    me.query(attrType).forEach((item) => {
      if (item.name) {
        me.attr[item.name] = item;

        (me.attr[item.name].columns || []).forEach((col) => {
          me.attr[item.name + '.' + col.fieldName] = col
        })
      }
    })
  })

  createOrderActions(this)

  if (me.orderConfig.detailGridsConfig) {
    Object.keys(me.orderConfig.detailGridsConfig).forEach(dtName => {
      const dtConfig = me.orderConfig.detailGridsConfig[dtName]

      if (dtConfig.recalcTotalsAfterInit) {
        me.attr[dtName].on('boxready', () => me.attr[dtName].GridSummary.dataBind())
      }

      switch (dtConfig.detailCountShowType) {
        case 'parentTab': {
          let grid = me.attr[dtName]
          let parentElement = grid.up()
          let counterElement = parentElement.xtype === 'tabpanel' ? grid : parentElement

          if (dtConfig.xtype) {
            const component = me.down(`[xtype=${dtConfig.xtype}]`)

            grid = me.down(`[name=${dtName}]`)
            parentElement = component.up()
            counterElement = parentElement.xtype === 'tabpanel' ? component : parentElement
          }

          AC.gridUtils.setGridRowsCounter(grid, counterElement)
          break
        }
      }
    })
  }

  if (_.isFunction(me.initOrderComponentDone)) { me.initOrderComponentDone(me) }
}

function orderControlChanged (field, newValue, oldValue) {
  const me = this
  if (me.formDataReady && _.isFunction(me.onControlChanged)) {
    me.onControlChanged(me, field, newValue, oldValue)
  }
}

function formDataReady () {
  const me = this
  setOrderTitle(me)
  if (me.isNewInstance) {
    if (!_.includes(_.get(me, 'orderConfig.notSetFld'), me.orderConfig.orderDateAttrName)) {
      me.record.set(me.orderConfig.orderDateAttrName, AC.dateService.todayDate())
    }
    if (me.getField('orderNumber')) me.getField('orderNumber').setValue(null)
    me.record.set(me.orderConfig.stateAttrName, 'PROJECT')
  }

  const orderState = me.record.get(me.orderConfig.stateAttrName)
  const isProject = ['PROJECT', 'REJECTED', 'ON_COMPLETION'].includes(orderState) ||
    !(me.orderConfig.stateAttrName in me.record.data)
  _.forEach(me.attr, field => {
    if (_.isFunction(field.setReadOnly) && !field.skipSetReadOnly) {
      let isReadOnly
      if (!me.isInited) {
        if (isProject && AC.entityUtils.verifyRightsMethod(me.entityName, 'update')) {
          if (field.readOnly) {
            field.initReadOnly = field.readOnly
            isReadOnly = field.readOnly
          }
        } else {
          isReadOnly = true
        }
      } else {
        isReadOnly = (isProject && AC.entityUtils.verifyRightsMethod(me.entityName, 'update')) ? (_.isUndefined(field.initReadOnly) ? false : field.initReadOnly) : true
      }
      field.setReadOnly(isReadOnly)
    }
  })
  me.isInited = true
  if (_.isFunction(me.onFormDataReady)) { me.onFormDataReady() }
}

function onAfterSave (me, data) {
  if (me.notRefreshAfterSave) {
    me.notRefreshAfterSave = true
  } else {
    if (me && me.query) {
      me.query('ubdetailgrid').forEach((grid) => {
        grid.onRefresh()
      })
    }
    if (data) {
      me.formData = {}
      me.formData.detail = data.detail ? JSON.parse(data.detail) : []
      if (data.message) {
        $App.dialogInfo(data.message, UB.i18n('Увага'))
      }
    }
  }
  changeAction(me)
  if (_.isFunction(me.onAfterOrderSave)) { me.onAfterOrderSave(data) }
}

function setOrderTitle (me) {
  if (!me.record.get(me.orderConfig.stateAttrName) /* || me.postingInProgress */) {
    delete me.postingInProgress
    return
  }
  if (me.entityName === 'hr_positionInstruction') return
  let title
  if (!me.isNewInstance) {
    title = `${me.record.get('description')} (${UB.core.UBEnumManager.getStore('HR_ORDER_STATE').getById(me.record.get(me.orderConfig.stateAttrName)).data.name})`
    me.setTitle(title.replace(/undefined/g, '?'))
  } else {
    if (me.initialConfig.commandConfig.description) {
      me.setTitle(me.initialConfig.commandConfig.description + ' (' + UB.i18n('Створення') + ')')
    }
  }
}

function updateFields () {
  const me = this
  if (_.isFunction(me.updateFields)) {
    me.updateFields(me)
  }
}

function manualSaving (me, action) {
  if (action && action.length) {
    action = action[0]
  }
  me.notRefreshAfterSave = (action && action.actionId === UB.view.BasePanel.actionId.saveAndClose)
}

function beforeSave (me, params) {
  if (!me.orderConfig.customPrepareDataBeforeSaveOrder) {
    const formData = { detail: {} }
    if (me.orderConfig.detailGrids) {
      me.orderConfig.detailGrids.forEach((item) => {
        const grid = me.down(`[name=${item}]`)
        formData.detail[item] = grid.getAttributeData()
      })
      params.formData = JSON.stringify(formData)
    }
  }
  if (_.isFunction(me.onPrepareDataBeforeSaveOrder)) {
    me.onPrepareDataBeforeSaveOrder(me, params)
  }
}

function onBeforeSave () {
  const me = this
  return new Promise(function (resolve) {
    if (!me.isForcedPreservation && ((!me.isDirty() && !me.record.dirty) || (me.dontSaveEmptyModified && _.isEmpty(me.record.modified)))) {
      return resolve(true)
    }
    if (me.getGridEditState()) {
      $App.dialogInfo(UB.i18n('Необхідно завершити редагування даних'))
      resolve(false)
    } else {
      const orderState = me.record.get(me.orderConfig.stateAttrName)
      const customMessage = me.postMessage || ''
      const message = (orderState !== 'POSTED' || me.canUpdateIfPosted) ? undefined
        : (me.record.modified[me.orderConfig.stateAttrName] === undefined && orderState === 'POSTED'
          ? (me.entityName === 'hr_empOrder' ? UB.i18n('Наказ вже проведено. Перепровести?') : UB.i18n('Документ вже проведено. Перепровести?'))
          : (me.entityName === 'hr_empOrder' ? UB.i18n('Провести наказ?') : UB.i18n('Провести документ?')))
      if (message) {
        me.postingInProgress = true
        $App.dialogYesNo(UB.i18n('Попередження'), customMessage + message)
          .then(function (choice) {
            if (!choice) {
              resolve(false)
            } else {
              if (!checkValidBeforeSaveOrder(me)) {
                resolve(false)
              }

              if (_.isFunction(me.onCheckValidBeforeSaveOrder)) {
                me.onCheckValidBeforeSaveOrder().then((result) => {
                  resolve(result !== false)
                })
              } else {
                resolve(true)
              }
            }
          }
          )
      } else {
        if (!checkValidBeforeSaveOrder(me)) {
          resolve(false)
        }

        if (_.isFunction(me.onCheckValidBeforeSaveOrder)) {
          me.onCheckValidBeforeSaveOrder().then((result) => {
            resolve(result !== false)
          })
        } else {
          resolve(true)
        }
      }
    }
  })
}

function beforeRefresh () {
  const me = this
  me.getForm().getFields().items.forEach((item) => {
    const store = item.getStore && item.getStore()
    if (store) store.clearFilter()
  })
}

function beforeClose (me = null) {
  if (!me) me = this
  me.notRefreshAfterSave = true
}

function changeAction (me) {
  if (!me.orderConfig) {
    setOrderConfig(me)
  }
  if (me.orderActions) {
    if (me.isNewInstance) {
      me.orderActions.actions.forEach(act => {
        if (!me.orderActions || !me.orderActions.skipDisabledNewInstance || !me.orderActions.skipDisabledNewInstance.includes(act)) {
          me.setActionDisabled(act, true)
        }
      })
    } else {
      me.orderActions.actions.forEach(act => {
        me.setActionDisabled(act, !(me.orderActions.state[me.record.get(me.orderConfig.stateAttrName)] && _.includes(me.orderActions.state[me.record.get(me.orderConfig.stateAttrName)].action, act)))
        if (me.entityName === 'hr_empOrder' && act === 'stopReconciliation' && me.record.get(me.orderConfig.stateAttrName) === 'RECONCILED') {
          me.setActionDisabled(act, !AC.entityUtils.verifyRightsMethod('hr_recstage', 'canStopReconciliation'))
        }
      })
    }
  }
}

function addOrderAction (me) {
  if (!me.orderActions) {
    return
  }
  let postingAction = me.actions.postingAction
  if (!postingAction && _.includes(me.orderActions.actions, 'postingAction')) {
    postingAction = new Ext.Action({
      actionId: 'postingAction',
      eventId: 'postingAction',
      cls: 'add-new-action',
      scale: 'medium',
      iconCls: 'iconApprove',
      text: UB.i18n('Провести'),
      hidden: !AC.entityUtils.verifyRightsMethod(me.entityName, 'doPosting'),
      handler: function () {
        if (me.customPosting) {
          me.customPosting(me)
          return
        }
        if (me.beforePosting) {
          me.beforePosting().then(result => {
            if (result) {
              doPosting(me)
            }
          })
        } else {
          doPosting(me)
        }
      },
      scope: me
    })
    me.actions.postingAction = postingAction
  }
  let cancelPostingAction = me.actions.cancelPostingAction
  if (!cancelPostingAction && _.includes(me.orderActions.actions, 'cancelPostingAction')) {
    cancelPostingAction = new Ext.Action({
      actionId: 'cancelPostingAction',
      eventId: 'cancelPostingAction',
      iconCls: 'iconReject',
      cls: 'red-action',
      scale: 'medium',
      text: UB.i18n('Відмінити проведення'),
      hidden: !AC.entityUtils.verifyRightsMethod(me.entityName, 'doCancelPosting'),
      handler: function () {
        if (me.customCancelPosting) {
          me.customCancelPosting(me)
        } else {
          if (me.beforeCancelPosting) {
            me.beforeCancelPosting().then(result => {
              if (result) {
                doCancelPosting(me)
              }
            })
          } else {
            doCancelPosting(me)
          }
        }
      },
      scope: me
    })
    me.actions.cancelPostingAction = cancelPostingAction
  }
  let calculatedAction = me.actions.calculatedAction
  if (!calculatedAction && _.includes(me.orderActions.actions, 'calculatedAction')) {
    calculatedAction = new Ext.Action({
      actionId: 'calculatedAction',
      eventId: 'calculatedAction',
      iconCls: 'iconRun',
      text: UB.i18n('Розрахувати'),
      hidden: !AC.entityUtils.verifyRightsMethod(me.entityName, 'doCalculated'),
      handler: function () {
        if (me.customCalculated) {
          me.customCalculated(me)
        } else {
          doCalculated(me)
        }
      },
      scope: me
    })
    me.actions.calculatedAction = calculatedAction
  }
  let unCalculatedAction = me.actions.unCalculatedAction
  if (!unCalculatedAction && _.includes(me.orderActions.actions, 'unCalculatedAction')) {
    unCalculatedAction = new Ext.Action({
      actionId: 'unCalculatedAction',
      eventId: 'unCalculatedAction',
      iconCls: 'icon-undo',
      text: UB.i18n('Відмінити розрахунок'),
      hidden: !AC.entityUtils.verifyRightsMethod(me.entityName, 'doUnCalculated'),
      handler: function () {
        if (me.customUnCalculated) {
          me.customUnCalculated(me)
        } else {
          doUnCalculated(me)
        }
      },
      scope: me
    })
    me.actions.unCalculatedAction = unCalculatedAction
  }
  let printDocumentAction = me.actions.printDocumentAction
  if (!printDocumentAction && me.orderActions.printDocumentAction) {
    printDocumentAction = new Ext.Action({
      iconCls: 'fas fa-print',
      cls: 'blue-action',
      actionId: 'printDocumentAction',
      text: UB.i18n('Друкувати'),
      eventId: 'printDocumentAction',
      menu: [],
      // hidden: !AC.entityUtils.verifyRightsMethod(me.entityName, 'viewPrintForm'),
      handler: function (btn) {
        if (me.orderActions.reportCodeParam) {
          const reportCode = me.attr[me.orderActions.reportCodeParam].getValue()
          btn.menu.items.items.forEach(item => {
            if (item.report_code.indexOf(`_${reportCode}_`) + 1) {
              item.show()
            } else {
              item.hide()
            }
          })
        }
      }
    })

    me.actions.printDocumentAction = printDocumentAction
    addReportsToPrintDocumentAction({ me })
  }
}
function addReportsToPrintDocumentAction ({ me, version }) {
  const printDocumentAction = me.actions.printDocumentAction
  let hiddenPrint = false
  let report_codeNotInclude = ['hr_docRegVacation_2', 'hr_docRegSickness_edu', 'hr_docRegVacationCompensation_edu', 'hr_docRegBountyHelp_edu', 'hr_docRegSeverancePay_edu']
  if (!AC.settings.get('hrTariffingEducational', appAC.globalOrganization())) {
    report_codeNotInclude.push('hr_docRegVacation_edu', 'hr_docRegSickness_2_edu', 'hr_docRegVacationCompensation_2_edu', 'hr_docRegBountyHelp_2_edu', 'hr_docRegSeverancePay_2_edu')
  }

  UB.Repository('ubs_report').attrs(['name', 'report_code'])
    .where('report_code', 'startWith', (me.orderActions.reportMask || me.entityName) + `_`)
    .whereIf(version, 'report_code', 'contains', version)
    .where('report_code', 'notIn', report_codeNotInclude)
    .orderBy('report_code')
    .selectAsObject().then((reportResult) => {
      if (!reportResult.length) {
        // me.actions.printDocumentAction.setDisabled(true)
        me.actions.printDocumentAction.notReport = true
        return
      }
      reportResult.forEach((item) => {
        if (printDocumentAction && printDocumentAction.items && printDocumentAction.items.length &&
        printDocumentAction.items[0].menu) {
          printDocumentAction.items[0].menu.add(
            {
              text: item.name,
              report_code: item.report_code,
              handler: function () {
                function doReport () {
                  let report = Ext.create('UBS.UBReport', {
                    code: item.report_code,
                    type: 'html',
                    params: { instanceID: me.instanceID }
                  })
                  report.init().then(function () {
                    let transformToXlsx = true
                    if (me.transformToXlsx) {
                      if (Array.isArray(me.transformToXlsx)) {
                        transformToXlsx = me.transformToXlsx.includes(item.report_code)
                      } else {
                        transformToXlsx = me.transformToXlsx
                      }
                    }
                    if (me.reportHiddenActions) {
                      report.hiddenActions = me.reportHiddenActions
                    }
                    let filterMenu = item.report_code.slice(item.report_code.length - 3, item.report_code.length) === 'edu'
                    let sourcessFunding
                    if (filterMenu && !me.isNewInstance && me.attr.accrualAvg) {
                      const accrualDt = me.attr.accrualAvg.getData().filter(o => o.accrualDt && JSON.parse(o.accrualDt).length).map(o => JSON.parse(o.accrualDt))
                      const dictFundSourceIDs = []
                      const dictProgClassIDs = []
                      accrualDt.forEach(o => o.forEach(p => dictFundSourceIDs.push(p.dictFundSourceID)))
                      accrualDt.forEach(o => {
                        o.forEach(p => {
                          if (p && p.dictProgClassID !== null) {
                            dictProgClassIDs.push(p.dictProgClassID)
                          }
                        })
                      })
                      // accrualDt.forEach(o => o.forEach(p => dictProgClassIDs.push(p.dictProgClassID)))
                      sourcessFunding = {
                        dictFundSourceID: dictFundSourceIDs,
                        dictProgClassID: dictProgClassIDs
                      }
                    }
                    let config = {
                      cmdType: 'showForm',
                      formCode: 'ac_documentViewer',
                      caption: UB.i18n('Друкована форма'),
                      cmpInitConfig: { report: report, transformToXlsx },
                      tabId: 'printDocument' + item.report_code + me.instanceID,
                      description: item.name,
                      target: $App.getViewport().centralPanel,
                      instanceID: me.instanceID,
                      filterMenu,
                      sourcessFunding
                    }

                    $App.doCommand(config)
                  })
                }

                if (me.isFormDirty() || me.isNewInstance) {
                  // $App.dialogYesNo(UB.i18n('Попередження'), UB.i18n('Увага! Поточний документ не збережений, ') +
                  // UB.i18n('буде надрукована остання збережена версія. Продовжити друк?'))
                  //   .then(function (choice) {
                  //     if (choice) doReport()
                  //   })
                  me.saveForm().then(res => {
                    if (res !== -1) doReport()
                  })
                } else {
                  doReport()
                }
              }
            }
          )
        }
      })
    })
}
function createShowImportAction (me) {
  const createAction = function () {
    const tb = me.down('toolbar')
    const allActions = tb && tb.query('[menuId=AllActions]')[0]
    if (me.record.get('impSourceID') && allActions) {
      allActions.menu.add({
        text: UB.i18n('Дані по імпорту'),
        name: 'actionShowImport',
        handler: function () {
          $App.doCommand({
            cmdType: 'showForm',
            formCode: 'hr_import-edit',
            cmpInitConfig: {
              entity: me.entityName,
              ID: me.instanceID
            }
          })
        }
      })
    }
    me.un('recordloaded', createAction)
  }
  me.on('recordloaded', createAction)
}

function createOrderActions (me) {
  const tb = me.down('toolbar')
  const allActions = tb && tb.query('[menuId=AllActions]')[0]
  const isCanEdit = () => {
    if (me.entityName === 'hr_empOrder') {
      return me.record.get(me.orderConfig.stateAttrName) !== 'POSTED'
    } else {
      return me.record.get(me.orderConfig.stateAttrName) === 'PROJECT'
    }
  }
  const showNumber = () => {
    const orderNumber = me.getField('orderNumber')
    const orderDate = me.getField(me.orderConfig.orderDateAttrName)
    const dictEmpOrderIndexID = me.getField('dictEmpOrderIndexID')
    if (me.entityName === 'hr_empOrder') {
      const expandTitle = me.down('[expandTitle]')
      if (expandTitle) {
        me.down('tabpanel').setActiveTab(0)
        me.down('[expandTitle]').expand()
      }
      if (me.record.get(me.orderConfig.stateAttrName) !== 'PROJECT') {
        me.record.set('skipCancelReconciliation', 1)
      }
    }
    dictEmpOrderIndexID && dictEmpOrderIndexID.setReadOnly(false)
    orderDate && orderDate.setReadOnly(false)
    orderNumber && Ext.defer(function () {
      orderNumber.setReadOnly(false)
      orderNumber.focus(true, 1000)
    }, 1)
  }

  if (!allActions) {
    return
  }

  allActions.menu.add({
    xtype: 'menuseparator'
  })
  if (!me.orderConfig.hideEditDocNumber) {
    allActions.menu.add({
      text: UB.i18n('Редагувати номер'),
      name: 'actionAllowEditDocNumber',
      handler: function () {
        if (!isCanEdit()) {
          $App.dialogInfo(UB.i18n('Редагування можливе тільки в не проведеному документі'))
          return
        }
        $App.dialogYesNo(UB.i18n('Попередження'), UB.i18n('Редагувати номер?'))
          .then(function (choice) {
            if (choice) {
              showNumber()
            }
          })
      }
    })
  }
  if (!me.orderConfig.hideEditPeriodID) {
    const periodID = me.getField('periodID') || me.getField('periodCalcID')
    if (periodID) {
      allActions.menu.add({
        text: UB.i18n('Редагувати період'),
        name: 'actionAllowEditPeriodID',
        handler: function () {
          $App.dialogYesNo(UB.i18n('Попередження'), UB.i18n('Редагувати період?'))
            .then(function (choice) {
              if (choice) {
                periodID.setReadOnly(false)
              }
            })
        }
      })
    }
  }
}

function doPosting (me) {
  if (me.getGridEditState()) {
    $App.dialogInfo(UB.i18n('Необхідно завершити редагування даних'))
    return
  }
  /* checkAndSaveDocFile - збереження поля document, інакше при помилці валідатора наказу виникає помилка
    blobStores -> fileSystemBlobStore -> persist -> renameSync@fs.js: "Не удается найти указанный файл" */
  checkAndSaveDocFile(me).then(res => {
    if (!res) {
      return Promise.resolve(false)
    }
    const dirty = me.record.dirty
    me.setIsDirty(true)
    const orderState = me.record.get(me.orderConfig.stateAttrName)
    me.record.set(me.orderConfig.stateAttrName, 'POSTED')
    return me.saveForm()
      .then(function (result) {
        if (result !== -1) {
          $App.dialogInfo(UB.i18n('Документ проведено'))
          if (me.afterPosting) {
            me.afterPosting(me)
          }
        } else {
          me.record.set(me.orderConfig.stateAttrName, orderState)
          me.record.dirty = dirty
          me.setIsDirty(dirty)
          changeAction(me)
        }
      }, function (err) {
        if (err) {
          if (err.config && err.config.timeout) {
            me.setLoading(true)
            let timerId = setTimeout(reloadForm, 300000)
            function reloadForm () {
              clearTimeout(timerId)
              me.record.dirty = false
              me.onRefresh()
              me.setLoading(false)
              $App.dialogInfo(UB.i18n('Операція виконується на сервері застосувань,\n та потребує додаткового часу для завершення.\n Зачекайте будь ласка, операцію буде виконано'))
              // $App.dialogInfo(UB.i18n('Документ проведено'))
            }
          } else {
            me.record.set(me.orderConfig.stateAttrName, orderState)
            throw err
          }
        }
      })
  })
}

function doCancelPosting (me) {
  UB.Repository(me.entityName)
    .attrs(me.orderConfig.stateAttrName)
    .selectById(me.instanceID)
    .then(orderData => {
      let orderState
      if (orderData) {
        orderState = orderData[me.orderConfig.stateAttrName]
        const hasPosted = me.record.get('hasPosted')
        if (orderState !== 'POSTED' && !hasPosted) {
          $App.dialogError(UB.i18n('Стан наказу змінено. Оновіть дані.'), UB.i18n('Увага'))
          return
        }
      }
      orderState = orderState || 'PROJECT'
      $App.dialogYesNo(UB.i18n('Попередження'), UB.i18n('Відмінити проведення документу?'))
        .then(function (choice) {
          if (choice) {
            checkAndSaveDocFile(me).then(res => {
              if (!res) {
                return Promise.resolve(false)
              }
              const dirty = me.record.dirty
              me.setIsDirty(true)
              UB.Repository('hr_recstage').attrs('ID')
                .where('mi_wfState', '=', 'COMPLETED')
                .where('docID', '=', me.instanceID)
                .where('entityName', '=', 'hr_recstage')
                .limit(1)
                .selectScalar()
                .then(function (stageID) {
                  me.record.set(me.orderConfig.stateAttrName, stageID ? 'RECONCILED' : 'PROJECT')
                  me.saveForm().then(function (result) {
                    if (result !== -1) {
                      $App.dialogInfo(UB.i18n('Відмінено проведення документу')).then(() => {
                        if (me.afterCancelPosting && _.isFunction(me.afterCancelPosting)) {
                          me.afterCancelPosting()
                        }
                      })
                    } else {
                      me.record.set(me.orderConfig.stateAttrName, orderState)
                      me.record.dirty = dirty
                      me.setIsDirty(dirty)
                      changeAction(me)
                    }
                  }, function (err) {
                    if (err) {
                      if (err.config && err.config.timeout) {
                        me.setLoading(true)
                        let timerId = setTimeout(reloadForm, 120000)
                        function reloadForm () {
                          clearTimeout(timerId)
                          me.record.dirty = false
                          me.onRefresh()
                          me.setLoading(false)
                          $App.dialogInfo(UB.i18n('Відмінено проведення документу')).then(() => {
                            if (me.afterCancelPosting && _.isFunction(me.afterCancelPosting)) {
                              me.afterCancelPosting()
                            }
                          })
                        }
                      } else {
                        me.record.set(me.orderConfig.stateAttrName, orderState)
                        throw err
                      }
                    }
                  })
                })
              // RECONCILED
            })
          }
        })
    })
}

function doCalculated (me) {
  me.setLoading(true)
  $App.connection.run({
    entity: me.entityName,
    method: 'doCalculated',
    instanceID: me.instanceID,
    mi_modifyDate: me.record.get('mi_modifyDate')
  }).then(function (result) {
    me.setLoading(false)
    if (result.resultMessage) {
      $App.dialogInfo(result.resultMessage)
    }
    me.record.dirty = false
    me.onRefresh()
  }, function (err) {
    me.setLoading(false)
    throw err
  })
}

function doUnCalculated (me) {
  $App.dialogYesNo(UB.i18n('Попередження'), UB.i18n('Відмінити розрахунок?'))
    .then(function (choice) {
      if (choice) {
        me.setLoading(true)
        $App.connection.run({
          entity: me.entityName,
          method: 'doUnCalculated',
          instanceID: me.instanceID,
          mi_modifyDate: me.record.get('mi_modifyDate')
        }).then(function (result) {
          me.setLoading(false)
          if (result.resultMessage) {
            $App.dialogInfo(result.resultMessage)
          }
          me.record.dirty = false
          me.onRefresh()
        }, function (err) {
          me.setLoading(false)
          throw err
        })
      }
    })
}

function doCheckStaffList (me) {
  me.setLoading(true)
  return $App.connection.run({
    entity: 'hr_staffTable',
    method: 'doCheckStaffList',
    execParams: {
      ID: me.instanceID
    }
  }).then(function (mParams) {
    me.setLoading(false)
    if (mParams && mParams.warningMessages) {
      const warningMessages = JSON.parse(mParams.warningMessages)
      return warningMessages.length ? $App.dialogInfo(warningMessages.join('<br>')) : Promise.resolve(true)
    }
    return Promise.resolve(true)
  }, function (err) {
    me.setLoading(false)
    return Promise.resolve(true)
  })
}

/**
 * Create new order with default values
 * @param {String} entityName
 * @param {Object} defaultValues
 */
function createNewOrder (entityName, defaultValues, formCode = null) {
  const config = {
    cmdType: 'showForm',
    formCode: formCode || entityName,
    entity: entityName,
    cmpInitConfig: {
      defaultValues: defaultValues
    },
    tabId: entityName + Ext.id(null, 'addNew'),
    target: $App.getViewport().centralPanel
  }
  $App.doCommand(config)
}

function checkValidBeforeSaveOrder (me) {
  const errorMessages = []

  if (!(me.orderConfig && me.orderConfig.detailGrids && me.orderConfig.detailGrids.length > 0)) {
    return true
  }

  me.orderConfig.detailGrids.filter(detailName => (!me.attr[detailName].hidden && me.attr[detailName].xtype === 'ubdetailgrid'))
    .map(detailName => me.attr[detailName])
    .forEach(grid => grid.getData()
      .forEach(row => {
        const props = grid.columns.filter(col => {
          if (!col.isVisible()) {
            return false
          }
          const fldParams = col.editor || (_.isFunction(col.getEditor) && col.getEditor())
          return fldParams.xtype !== 'checkboxfield' && fldParams.allowBlank !== undefined && !fldParams.allowBlank
        }).map(col => ({ caption: col.text, name: col.fieldName }))
        const detailName = grid.up().title || ''
        AC.inspectData.checkRowProps({ row, props, detailName, errorMessages })
      })
    )

  if (errorMessages.length) {
    $App.dialogInfo(errorMessages.join('<br>'))
    return false
  }

  return true
}

function removeHidddenActions (me) {
  if (me.sender && me.sender.ownerCt && me.sender.ownerCt.cmpInitConfig) {
    const hiddenActions = me.sender.ownerCt.cmpInitConfig.hideActions
    if (hiddenActions) {
      hiddenActions.forEach(function (actionID) {
        if (me.actions[actionID]) {
          delete me.actions[actionID]
        }
      })
    }
  }
}

function disableContextMenuItems (ctrl, items) {
  if (!_.isArray(items)) {
    items = [items]
  }
  items.forEach(item => {
    if (ctrl.contextMenu) {
      const menuItem = ctrl.contextMenu.down(`[itemID=${item}]`)
      if (menuItem) {
        menuItem.hide()
        menuItem.setDisabled(true)
      }
    }
  })
}

function getOrderAccrualGrid (entityName, cfg) {
  entityName = entityName || ''
  cfg = cfg || {}
  const customActions = []

  if (!['hr_empOrderDismDet', 'hr_empOrderVacationDet', 'hr_empOrderCertificationDet'].includes(entityName)) {
    customActions.push(
      {
        text: UB.i18n('Додати зі штатного'),
        iconCls: 'fas fa-angle-double-down',
        cls: 'fill-action',
        name: 'fillFromStaff',
        actionId: 'fillFromStaff',
        hidden: ['hr_empOrderDismDet', 'hr_empOrderVacationDet'].includes(entityName),
        disabled: false,
        handler: function (btn) {
          const me = btn.up('form')
          const positionID = me.record.get('positionID')
          if (!positionID) {
            AC.viewUtils.showToast(UB.i18n('Помилка'), UB.i18n('Не вказана посада'))
            return
          }
          const dateFrom = AC.dateService.truncTimeToUtcNull(me.record.get('dateFrom') || me.orderForm.record.get('orderDate'))
          const grid = btn.up('entitygridpanel')
          let dateTo = me.record.get('dateTo')
          if (dateTo) {
            dateTo = AC.dateService.truncTimeToUtcNull(dateTo)
          }
          const doFill = () => {
            const me = btn.up('form')
            me.saveForm().then(result => {
              if (result !== -1) {
                $App.connection.run({
                  entity: 'hr_empOrder',
                  method: 'fillOrderAccrual',
                  empOrderDetID: me.instanceID,
                  orderID: me.record.get('orderID'),
                  positionID: positionID,
                  dateFrom: dateFrom,
                  dateTo: dateTo,
                  uniqueID: AC.dataService.getUniqueInt()
                }).then(() => {
                  grid.onRefresh().then(() => {
                    if (me.onChangeEmpAccData) {
                      me.onChangeEmpAccData(grid)
                    }
                  })
                })
              }
            })
          }
          grid.getStore().load().then(() => {
            if (grid.getStore().getCount()) {
              $App.dialogYesNo(UB.i18n('Попередження'), UB.i18n('Видалити існуючі записи по нарахуванням ?')).then(isAgree => {
                if (isAgree) {
                  doFill()
                }
              })
            } else {
              doFill()
            }
          })
        }
      }
    )

    if (['hr_empOrderMoveDet', 'hr_empOrderProlongationDet'].includes(entityName)) {
      customActions.push(
        {
          text: UB.i18n('Додати нарахування з останнього місця роботи'),
          iconCls: 'fas fa-male',
          cls: 'fill-action',
          name: 'fillWithSave',
          actionId: 'fillWithSave',
          disabled: false,
          handler: function (btn) {
            const me = btn.up('form')
            const dateFrom = AC.dateService.truncTimeToUtcNull(me.record.get('dateFrom') || me.orderForm.record.get('orderDate'))
            const grid = btn.up('entitygridpanel')
            const employeeNumberID = me.attr.employeePositionID.getFieldValue('employeeNumberID')
            if (!employeeNumberID) {
              AC.viewUtils.showToast(UB.i18n('Помилка'), UB.i18n('Не вказаний працівник'))
              return
            }
            const doFill = () => {
              me.saveForm().then(result => {
                if (result !== -1) {
                  $App.connection.run({
                    entity: 'hr_empOrder',
                    method: 'fillOrderAccrualWithSave',
                    empOrderDetID: me.instanceID,
                    empOrderID: me.record.get('orderID'),
                    dateFrom,
                    employeeNumberID,
                    uniqueID: AC.dataService.getUniqueInt()
                  }).then(() => {
                    grid.onRefresh()
                  })
                }
              })
            }
            grid.getStore().load().then(() => {
              if (grid.getStore().getCount()) {
                $App.dialogYesNo(UB.i18n('Попередження'), UB.i18n('Всі внесені в блоці Нарахування дані будуть видалені! Продовжити?')).then(isAgree => {
                  if (isAgree) {
                    doFill()
                  }
                })
              } else {
                doFill()
              }
            })
          }
        }
      )
    }
  }

  if (cfg.customActions && Array.isArray(cfg.customActions)) {
    customActions.push(...cfg.customActions)
  }

  const fieldList = [
    {
      name: 'ID',
      visibility: false
    },
    {
      name: 'empOrderID',
      visibility: false
    },
    {
      name: 'payElID.description',
      visibility: true,
      description: UB.i18n('Елемент оплати'),
      editor: {
        fieldList: ['ID', 'description', 'methodID.valuation', 'methodID.code'],
        gridFieldList: ['description'],
        hideActions: ['addNew', 'addNewByCurrent', 'edit', 'del', 'newVersion'],
        whereList: {
          groupType: {
            expression: '[methodID.methodGroupID.groupType]',
            condition: 'equal',
            value: 'PAYMENT'
          }
        }
      }
    },
    {
      name: 'payElID.methodID.valuation',
      visibility: false
    },
    {
      name: 'payElID.methodID.code',
      visibility: false
    },
    {
      name: 'qtty',
      visibility: entityName === 'hr_empOrderVacationDet',
      description: (entityName === 'hr_empOrderVacationDet' ? UB.i18n('Кільксть середньомісячних заробітків') : UB.i18n('Кільксть')),
      editor: {
        allowBlank: true
      }
    },
    {
      name: 'dateFrom',
      visibility: entityName !== 'hr_empOrderVacationDet',
      editor: {
        allowBlank: true
      }
    },
    {
      name: 'dateToEmpty',
      visibility: entityName !== 'hr_empOrderVacationDet',
      editor: {
        allowBlank: true
      }
    },
    {
      name: 'accrualSum',
      editor: {
        allowBlank: true
      }
    },
    {
      name: 'accrualRate',
      visibility: entityName !== 'hr_empOrderVacationDet',
      editor: {
        allowBlank: true
      }
    },
    {
      name: 'isAutoNotClose',
      visibility: false
    }
  ]

  return {
    name: 'hr_empOrderAcc',
    xtype: 'ubdetailgrid',
    autoScroll: true,
    flex: 1,
    rowEditing: true,
    entityConfig: {
      entity: 'hr_empOrderAcc',
      method: 'select',
      fieldList: fieldList
    },
    masterFields: ['ID'],
    detailFields: ['empOrderDetID'],
    onValidateEdit: function (rowEditor, context) {
      const editor = rowEditor.editor
      const me = editor.up('form')
      const dateFromCtrl = editor.form.findField('dateFrom')
      const dateFrom = new Date(me.record.get('dateFrom'))
      if (dateFromCtrl.getValue() < dateFrom) {
        $App.dialogInfo(UB.i18n('Дата нарахування менше ніж дата початку дії пункту наказу'))
      }
      return true
    },
    onBeforeEdit: function (rowEditor, context) {
      if (context.grid.isEditDisabled) {
        return false
      }
      const editor = rowEditor.editor
      const me = context.grid.up('form')
      const reco = context.record
      if (reco.get('isAutoNotClose')) {
        return false
      }
      if (!reco.get('empOrderID')) {
        reco.set('empOrderID', me.record.get('orderID'))
        reco.set('dateFrom', me.record.get('dateFrom'))
        reco.set('dateToEmpty', me.record.get('dateToEmpty'))
        reco.set('qtty', 1)
        reco.set('isAutoNotClose', 0)
      }
      switch (entityName) {
        case 'hr_empOrderVacationDet' :
          AC.viewUtils.setWhereListProperty(editor.query('[name=payElID.description]')[0],
            [
              ['methodID.methodGroupID.code', 'equal', '7']
            ])
          break
        default:
          AC.viewUtils.setWhereListProperty(editor.query('[name=payElID.description]')[0],
            [
              ['methodID.methodGroupID.code', 'notEqual', 1, 'methodGroupCode'],
              ['methodID.code', 'equal', '74', 'methodCode'],
              ['methodID.methodGroupID.groupType', 'equal', 'PAYMENT']
            ], ['([methodGroupCode] OR [methodCode])'], ['clearWhereList'])
      }
      if (cfg.requiredFields) {
        cfg.requiredFields.forEach(item => {
          const ctrl = editor.query(`[name=${item}]`)[0]
          if (ctrl) {
            ctrl.setAllowBlank(false)
          }
        })
      }
      const accrualSum = editor.query(`[name=accrualSum]`)[0]
      const accrualRate = editor.query(`[name=accrualRate]`)[0]
      const payElIDCtrl = editor.query(`[name=payElID.description]`)[0]

      if (payElIDCtrl) {
        payElIDCtrl.on('change', async ctrl => {
          const method = ctrl.getFieldValue('methodID.code')
          const grid = ctrl.up('[name=hr_empOrderAcc]')
          const me = (grid && grid.up('form')) || null
          let onDate
          switch (method) {
            /*
            case '74':
              reco.set('payElID.methodID.code', '74')
              const dictTarifCoeffID = (me && me.record && me.record.get('dictTarifCoeffID')) || null
              onDate = (me && me.record && me.record.get('dateFrom')) || null
              UB.Repository('hr_dictTarifCoeffDet')
                .attrs(['accrualSum'])
                .where('dictTarifCoeffID', '=', dictTarifCoeffID || null)
                .where('dateFrom', '<=', onDate)
                .where('dateTo', '>=', onDate)
                .selectSingle()
                .then(data => {
                  if (data && data.accrualSum) {
                    accrualSum.setValue(data.accrualSum)
                  }
                })
              break
            */
            case '6':
              let paraID = me.record.get('ID')
              let payElID = ctrl.getFieldValue('ID')
              let orderExp = await UB.Repository('hr_empOrderExperience')
                .attrs(['dictExperienceID.code', 'years', 'months', 'empOrderDetID.dateFrom', 'calcDate'])
                .where('empOrderDetID', '=', paraID)
                .where('dictExperienceID.code', 'in', ['8', // Вислуга в державних органах
                  '6' // Стаж державної служби
                ])
                .orderBy('dictExperienceID.code')
                .selectAsObject({ 'dictExperienceID.code': 'expCode', 'empOrderDetID.dateFrom': 'onDate' })
              if (!orderExp.length) {
                return
              }
              let exp6 = orderExp.find(i => i.expCode === '6')
              let exp8 = orderExp.find(i => i.expCode === '8')
              onDate = AC.dateService.shiftDate(orderExp[0].onDate)
              let years = 0

              if (exp6) {
                if (AC.dateService.shiftDate(exp6.calcDate) >= AC.dateService.shiftDate(new Date(2016, 4, 1))) {
                  years = exp6.years
                } else {
                  years = exp8 ? Math.max(exp8.years, exp6.years) : exp6.years
                }
              } else {
                years = exp8.years
              }
              let payElExperience = await UB.Repository('hr_payElExperience').attrs('*')
                .where('payElID', '=', payElID)
                .where('years', '<=', years)
                .where('dateFrom', '<=', onDate)
                .where('dateTo', '>=', onDate)
                .orderByDesc('years')
                .selectSingle()

              if (!payElExperience && exp6) {
                payElExperience = await UB.Repository('hr_payElExperience').attrs('*')
                  // .where('payElID.methodID.code', '=', '6')
                  .where('payElID', '=', payElID)
                  .where('dateFrom', '<=', onDate)
                  .where('dateTo', '>=', onDate)
                  .where('years', '<=', exp6.years)
                  .orderByDesc('years')
                  .selectSingle()
              }
              if (payElExperience) {
                accrualRate.setValue(payElExperience.rate)
              }
              break
            case '5': // надбавка за ранг
              if (me.entityName === 'hr_empOrderAppointDet' || me.entityName === 'hr_empOrderMoveDet') {
                let dictRankID = null
                onDate = (me && me.record && me.record.get('dateFrom')) || AC.dateService.currentDate()
                dictRankID = me.attr.dictRankID.getValue()
                if (me.attr.isRankSave.getValue()) {
                  const mParams = await $App.connection.run({
                    entity: 'hr_employee',
                    method: 'getNextPublServRang',
                    onDate: new Date(onDate),
                    employeeID: me.entityName === 'hr_empOrderAppointDet' ? me.record.get('employeeID') : me.attr.employeePositionID.getFieldValue('employeeID')
                  })
                  dictRankID = mParams.curRankID || mParams.dictRankID
                }
                if (dictRankID) {
                  const paySum = await UB.Repository('hr_dictSalaryRank')
                    .attrs('paySum')
                    .where('dictRankID', '=', dictRankID)
                    .where('dateFrom', '<=', onDate)
                    .where('dateTo', '>=', onDate)
                    .selectScalar()
                  if (paySum) {
                    accrualSum.setValue(paySum)
                  }
                } else {
                  accrualSum.setValue()
                }
              }
              break
          }
        })
      }

      accrualSum.on('change', ctrl => {
        const val = ctrl.getValue()
        if (val) accrualRate.setValue(null)
      })

      accrualSum.on('blur', ctrl => {
        const grid = ctrl.up('[name=hr_empOrderAcc]')
        const me = (grid && grid.up('form')) || {}
        if (me.entityName === 'hr_empOrderAppointDet' || me.entityName === 'hr_empOrderMoveDet') {
          if (payElIDCtrl && payElIDCtrl.getFieldValue('methodID.code') === '5') {
            const val = ctrl.getValue()
            // const onDate = (me && me.record && me.record.get('dateFrom')) || AC.dateService.currentDate()
            UB.Repository('hr_dictSalaryRank')
              .attrs('ID')
              .where('paySum', '=', val)
              // .where('dateFrom', '<=', onDate)
              // .where('dateTo', '>=', onDate)
              .selectSingle().then(data => {
                if (!data) {
                  AC.viewUtils.showToast(UB.i18n('Увага! Невірна сума надбавки за ранг! Уточніть можливі значення надбавки у довіднику "Надбавки за ранги держслужбовців"'))
                }
              })
          }
        }
      })

      accrualRate.on('change', ctrl => {
        const val = ctrl.getValue()
        if (val) accrualSum.setValue(null)
      })
      return true
    },
    cmpInitConfig: {
      cls: 'multiLineHeaderGrid',
      customInit: function () {
        const grid = this
        const oldOnDel = grid.onDel
        const newOnDel = function () {
          const me = grid.up('form')
          const reco = AC.gridUtils.getCurrentRecord(grid)
          if (reco.get('isAutoNotClose')) {
            return
          }
          if (me.masterForm && me.masterForm.record.get('orderState') !== 'PROJECT' && me.masterForm.record.get('orderState') !== 'ON_COMPLETION') {
            AC.viewUtils.showToast(UB.i18n('Помилка'), UB.i18n('Неможливо видалити запис з наказу не в стані "Проєкт"'))
            return
          }
          oldOnDel.call(grid)
        }
        AC.gridUtils.replaceListener(grid, 'del', grid.onDel, newOnDel)
      },
      onDeterminateForm: function (grid) {},
      customActions: customActions,
      getRowClass: function (record) {
        return record.get('isAutoNotClose') ? 'grd-color-grey-italic' : ''
      }
    }
  }
}

function getSalaryGrid () {
  return {
    layout: 'fit',
    flex: 1,
    items: [{
      xtype: 'ubdetailgrid',
      region: 'south',
      name: 'salaryGrid',
      autoScroll: true,
      hideActions: [],
      rowEditing: true,
      enableColumnHide: false,
      entityConfig: {
        entity: 'hr_empOrderAcc',
        method: 'select',
        fieldList: [
          {
            name: 'ID',
            visibility: false
          },
          {
            name: 'empOrderID',
            visibility: false
          },
          {
            name: 'dateFrom'
          },
          {
            name: 'dateToEmpty'
          },
          {
            name: 'payElID.description',
            description: UB.i18n('Вид оплати'),
            editor: {
              fieldList: ['ID', 'description', 'methodID.methodGroupID.code']
            }
          },
          {
            name: 'accrualSum',
            editor: {
              allowBlank: false
            }
          }
        ],
        whereList: {
          payElID: {
            expression: '[payElID.methodID.methodGroupID.code]',
            condition: 'equal',
            value: 1
          }
        }
      },
      masterFields: ['ID'],
      detailFields: ['empOrderDetID'],
      onBeforeEdit: function (rowEditor, context) {
        if (context.grid.isEditDisabled) {
          return false
        }
        const editor = rowEditor.editor
        const me = editor.up('form')
        const reco = context.record
        if (!reco.get('empOrderID')) {
          if (context.grid.getStore().getCount() > 1) {
            context.grid.onRefresh()
            return false
          }
          reco.set('empOrderID', me.record.get('orderID'))
          reco.set('dateFrom', me.record.get('dateFrom'))
          reco.set('dateToEmpty', me.record.get('dateToEmpty'))
        }
        AC.viewUtils.setFilterValue(editor.query('[name=payElID.description]')[0], { 'methodID.methodGroupID.code': 1 })
        return true
      }
    }]
  }
}

function getEmployeeParaGrid (entityName, config) {
  return _.merge({
    name: 'hr_empOrderEmployeeDet',
    xtype: 'ubdetailgrid',
    paraGrid: true,
    autoScroll: true,
    hidden: true,
    enableColumnHide: false,
    flex: 1,
    entityConfig: {
      entity: 'hr_empOrderEmployeeDet',
      method: 'select',
      fieldList: [
        {
          name: 'employeeFullName',
          description: UB.i18n('ПІБ'),
          visibility: true
        },
        {
          name: 'title',
          description: UB.i18n('Посада')
        },
        {
          name: 'payElID.description',
          description: UB.i18n('Вид оплати'),
          visibility: entityName === 'hr_empOrderMissionDet'
        },
        {
          name: 'dictTimeCostID.nameSmall',
          description: UB.i18n('Елемент обліку робочого часу'),
          visibility: entityName === 'hr_empOrderMissionDet'
        },
        {
          name: 'description',
          description: UB.i18n('Інформація'),
          visibility: entityName !== 'hr_empOrderMissionDet'
        },
        {
          name: 'employeePositionID.workScheduleID.name',
          description: UB.i18n('Графік робочого часу (поточний)'),
          visibility: entityName !== 'hr_empOrderCwsworkhourDet'
        },
        {
          name: 'itemIdx',
          description: '№',
          visibility: false
        },
        {
          name: 'employeeID',
          visibility: false
        },
        {
          name: 'employeeNumberID',
          visibility: false
        }
      ]
    },
    masterFields: entityName === 'hr_empOrder' ? ['ID'] : ['ID', 'orderID'],
    detailFields: entityName === 'hr_empOrder' ? ['orderID'] : ['paraID', 'orderID'],
    listeners: {
      changeData: function (grid, action) {
        // let me = grid.up('form')
        // me.setIsDirty(true)
      },
      render: grid => {
        const me = grid.up('form')
        grid.menu.add([{
          text: UB.i18n('Відкрити картку працівника'),
          ubID: 'itemShowEmployee',
          disabled: !AC.entityUtils.verifyRightsMethod('hr_employee', 'view'),
          handler: function () {
            const reco = AC.gridUtils.getCurrentRecord(grid)
            if (!reco) {
              AC.viewUtils.showToast(UB.i18n('Помилка'), UB.i18n('Не вибраний запис'))
              return
            }

            $App.doCommand({
              cmdType: 'showForm',
              formCode: 'hr_employee',
              entity: 'hr_employee',
              instanceID: reco.get('employeeID'),
              cmpInitConfig: {
                employeeNumberID: reco.get('employeeNumberID')
              }
            })
          }
        },
        {
          text: UB.i18n('Перемістити вище'),
          ubID: 'itemMoveUp',
          hidden: true,
          handler: function () {
            const reco = AC.gridUtils.getCurrentRecord(grid)
            let message
            if (!reco) {
              message = UB.i18n('Не вибраний запис')
            }

            if (message) {
              AC.viewUtils.showToast(UB.i18n('Помилка'), message)
              return
            }
            const ID = reco.get('ID')
            $App.connection.run({
              entity: 'hr_empOrderDet',
              method: 'moveItemUp',
              orderID: me.instanceID,
              ID: ID,
              mi_unityEntity: reco.get('mi_unityEntity'),
              itemIdx: reco.get('itemIdx')
            }).then(mParams => {
              if (mParams.isMoved) {
                const store = grid.getStore()
                store.load(then => {
                  grid.getSelectionModel().select(store.find('ID', ID), true)
                })
              }
            })
          }
        },
        {
          text: UB.i18n('Перемістити нижче'),
          ubID: 'itemMoveUp',
          hidden: true,
          handler: function () {
            const reco = AC.gridUtils.getCurrentRecord(grid)
            let message
            if (!reco) {
              message = UB.i18n('Не вибраний запис')
            }

            if (message) {
              AC.viewUtils.showToast(UB.i18n('Помилка'), message)
              return
            }
            const ID = reco.get('ID')
            $App.connection.run({
              entity: 'hr_empOrderDet',
              method: 'moveItemDown',
              orderID: me.instanceID,
              ID: ID,
              mi_unityEntity: reco.get('mi_unityEntity'),
              itemIdx: reco.get('itemIdx')
            }).then(mParams => {
              const store = grid.getStore()
              store.load(then => {
                grid.getSelectionModel().select(store.find('ID', ID), true)
              })
            })
          }
        },
        {
          text: UB.i18n('Оновити нумерацію'),
          hidden: true,
          ubID: 'enumerateItems',
          handler: function () {
            $App.connection.run({
              entity: 'hr_empOrderDet',
              method: 'enumerateItems',
              orderID: me.instanceID

            }).then(mParams => {
              grid.getStore().load(then => {

              })
            })
          }
        }
        ])
      }
    },
    cmpInitConfig: {
      customInit: function () {
        const grid = this
        const newOnDel = function () {
          const me = grid.up('form')
          const onDel = grid.onDel
          if (me.record.get('orderState') === 'POSTED') {
            AC.viewUtils.showToast(UB.i18n('Помилка'), UB.i18n('Неможливо видалити запис з проведеного наказу'))
            return
          }
          onDel.call(grid)
        }
        AC.gridUtils.replaceListener(grid, 'del', grid.onDel, newOnDel)
        const _doOnEdit = grid.doOnEdit
        grid.doOnEdit = function () {
          grid.isEditMode = true
          _doOnEdit.call(grid)
        }
      },
      onDeterminateForm: function (grid) {
      },
      customParams: {
        entityName: entityName
      },
      _customActions: [{
        text: UB.i18n('Додати списком'),
        actionId: 'addByList',
        iconCls: 'fas fa-angle-double-down',
        cls: 'add-list-action',
        handler: function (btn) {
          const me = btn.up('form')
          const grid = btn.up('ubdetailgrid')
          if (me.isDirty()) {
            me.saveForm()
              .then(function (result) {
                if (result !== -1) {
                  me.fillDetail(grid)
                }
              }, function (err) {
                if (err) {
                  if (err.config && err.config.timeout) {
                    $App.dialogInfo(UB.i18n('Операція виконується на сервері застосувань,\n та потребує додаткового часу для завершення.\n Зачекайте будь ласка, операцію буде виконано'))
                  } else {
                    throw err
                  }
                }
              })
          } else {
            me.fillDetail(grid)
          }
        }
      },
      {
        cls: 'fill-action',
        itemId: 'copyMenu',
        // iconCls: 'icon-check-list',
        iconCls: 'fa fa-copy',
        text: UB.i18n('Копіювати'),
        actionId: 'copyRecord',
        handler: function (btn) {
          const me = btn.up('form')
          const grid = btn.up('ubdetailgrid')
          if (me.isDirty()) {
            $App.dialogInfo(UB.i18n('Необхідно спочатку зберегти дані'))
            return
          }
          const reco = AC.gridUtils.getCurrentRecord(grid)
          $App.doCommand({
            cmdType: 'showForm',
            entity: grid.entityName,
            sender: grid,
            customParams: {
              record: reco
            }
          })
        }
      }
      ]
    }
  }, config)
}

function getActingParaGrid (entityName, config) {
  const orderManager = this
  const conditionData = [{ ID: 1, name: UB.i18n('до виходу на роботу') }, { ID: 2, name: UB.i18n('до призначення на посаду') }]
  return _.merge({
    name: 'hr_empOrderActingDet',
    xtype: 'ubdetailgrid',
    paraGrid: true,
    autoScroll: true,
    hidden: true,
    rowEditing: true,
    enableColumnHide: false,
    dateFromNextDay: false,
    flex: 1,
    entityConfig: {
      entity: 'hr_empOrderActingDet',
      method: 'select',
      fieldList: [
        {
          name: 'itemIdx',
          description: '№',
          config: { align: 'center', width: 60 },
          visibility: true,
          editor: {
            readOnly: true
          }
        },
        {
          name: 'employeePositionID.description',
          description: UB.i18n('Працівник'),
          config: { width: 300 },
          editor: {
            hideActions: ['addNew', 'addNewByCurrent', 'edit', 'del', 'newVersion'],
            listeners: {
              render: function (ctrl) {
                orderManager.disableContextMenuItems(ctrl, ['editItem', 'addItem'])
              }
            }
          }
        },
        {
          name: 'employeePositionID',
          visibility: false
        },
        {
          name: 'employeeID',
          visibility: false
        },
        {
          name: 'dateFrom',
          config: { width: 120 },
          editor: {
            allowBlank: false
          }
        },
        {
          name: 'dateTo',
          config: { width: 120 }
        },
        {
          name: 'condition',
          description: UB.i18n('Умова закінчення'),
          config: { width: 200 },
          editor: {
            xtype: 'combobox',
            name: 'condition',
            store: Ext.create('Ext.data.Store', {
              fields: ['ID', 'name'],
              data: conditionData
            }),
            valueField: 'name',
            displayField: 'name',
            gridFieldList: ['name'],
            allowCustomText: true,
            triggerCls: 'hr-list-trigger',
            typeAhead: false,
            queryMode: 'local',
            forceSelection: true,
            triggerAction: 'all',
            mode: 'local',
            listeners: {
              blur: ctrl => {
                ctrl.setValue(ctrl.rawValue)
                const form = ctrl.up('form')
                const context = form.context
                context && context.record && context.record.set(ctrl.name, ctrl.rawValue)
              },
              select: ctrl => {
                ctrl.setValue(ctrl.rawValue)
                const form = ctrl.up('form')
                const context = form.context
                if (context && context.record) {
                  context.record.set(ctrl.name, ctrl.rawValue)
                  form.down('[name=dateTo]').setValue()
                  context.record.set('dateTo', null)
                }
              }
            }
          }
        },
        {
          name: 'empOrderType',
          visibility: false
        },
        {
          name: 'payForExtraLoad',
          config: { width: 80, align: 'center' },
          visibility: true,
          maxValue: 100,
          minValue: 0
        },
        {
          name: 'payElID.description',
          description: UB.i18n('Вид оплати за заміщення'),
          config: { width: 200 },
          visibility: true,
          editor: {
            fieldList: ['ID', 'description', 'calcAlgorithm', 'code'],
            whereList: {
              methodCode: {
                expression: '[methodID.code]',
                condition: 'in',
                value: ['33']
              }
            }
          }
        },
        {
          name: 'note',
          config: { width: 200 },
          visibility: true
        },
        {
          name: 'payElID.calcAlgorithm',
          description: UB.i18n('Алгоритм'),
          visibility: false
        }
      ],
      orderList: { itemIdx: { expression: 'itemIdx' } }
    },
    onBeforeEdit: function (rowEditor, context) {
      if (context.grid.isEditDisabled) {
        return false
      }
      const editor = rowEditor.editor
      const me = editor.up('form')
      const hrCheckPayElActing = AC.settings.get('hrCheckPayElActing', me.record.get('organizationID') || me.masterForm.record.get('organizationID') || appAC.globalOrganization()) || 0
      if (config.onStartEdit) {
        config.onStartEdit(rowEditor, context)
      }
      if (config.onEdited) {
        rowEditor.on('edit', (rowEditor, context) => {
          config.onEdited(rowEditor, context)
          return true
        })
      } else if (config.hrTypePayElActing && hrCheckPayElActing) {
        rowEditor.on('edit', (rowEditor, context) => {
          if (!context.record.get('payElID')) {
            $App.dialogError(UB.i18n('Не вказано вид оплати за ТВО. Для автоматичної передачі виплати за додаткове навантаження наказу в заробітну плату необхідно заповнити відповідне значення.'), UB.i18n('Помилка'))
          }
          return true
        })
      }
      const reco = context.record
      let dateFrom = AC.dateService.truncTimeToUtcNull(me.record.get('dateFrom') || me.masterForm.record.get('dateFrom'))
      if (context.grid.dateFromNextDay) {
        dateFrom = AC.dateService.addDays(dateFrom, 1)
      }
      const dateTo = AC.dateService.truncTimeToUtcNull(me.record.get('dateTo') || me.record.get('dateToEmpty') || me.masterForm.record.get('dateTo') || me.masterForm.record.get('dateToEmpty'))
      const payElCtrl = editor.query('[name=payElID.description]')[0]
      const payElCtrlStore = payElCtrl.getStore()
      if (!reco.get('ID')) {
        reco.set('dateFrom', dateFrom)
        reco.set('dateTo', dateTo)
        reco.set('paraID', me.record.get('ID'))
        reco.set('empOrderType', 'ACTING')
        reco.set('itemIdx', context.grid.getStore().getCount())
        if (me.orderAttrConfig && me.orderAttrConfig.payElIDReplacement) {
          payElCtrl.setValue(me.orderAttrConfig['payElIDReplacement.description'])
          if (payElCtrlStore.ubRequest && payElCtrlStore.ubRequest.whereList) {
            payElCtrlStore.ubRequest.whereList.description = {
              expression: '[description]',
              condition: '=',
              value: me.orderAttrConfig['payElIDReplacement.description']
            }
            payElCtrlStore.ubRequest.logicalPredicates = ['([description] OR [methodCode])']
          }
          reco.set('payElID', me.orderAttrConfig.payElIDReplacement)
          reco.set('payElID.description', me.orderAttrConfig['payElIDReplacement.description'])
          payElCtrl.setDisabled(!me.orderAttrConfig.canEditPayElReplacement)
        }
      } else {
        if (me.orderAttrConfig && me.orderAttrConfig.payElIDReplacement) {
          if (payElCtrlStore.ubRequest && payElCtrlStore.ubRequest.whereList) {
            payElCtrlStore.ubRequest.whereList.description = {
              expression: '[description]',
              condition: '=',
              value: me.orderAttrConfig['payElIDReplacement.description']
            }
            payElCtrlStore.ubRequest.logicalPredicates = ['([description] OR [methodCode])']
          }
          payElCtrl.setDisabled(!me.orderAttrConfig.canEditPayElReplacement)
        }
      }
      me.orderForm.filterEmployeePosition(me, { ctrlToFilter: editor.query('[name=employeePositionID.description]')[0] })

      if (config.notWriteChanges) {
        me.setIsDirty(true)
      }
      const df = editor.query('[name=dateFrom]')[0]
      const dt = editor.query('[name=dateTo]')[0]
      const condition = editor.query('[name=condition]')[0]
      df.caption = UB.i18n('З дати')
      dt.caption = UB.i18n('По дату')
      setDateChecker(null, {
        dateFrom: df,
        dateTo: dt
      })
      df.on('change', ctrl => {
        if (!ctrl.isValid() || !ctrl.getValue()) {
          return
        }
        let value = AC.dateService.truncTimeToUtcNull(ctrl.getValue())
        if (dateFrom && value < dateFrom) {
          AC.viewUtils.showToast(UB.i18n('Помилка'), UB.i18n('Дата не повинна бути меншою, ніж ') + AC.dateService.formatDate(dateFrom))
          ctrl.setValue(dateFrom)
          return
        }
        if (dateTo && value > dateTo) {
          AC.viewUtils.showToast(UB.i18n('Помилка'), UB.i18n('Дата не повинна бути більшою, ніж ') + AC.dateService.formatDate(dateTo))
          ctrl.setValue(dateFrom || dateTo)
        }
      })
      dt.on('change', ctrl => {
        if (!ctrl.isValid() || !ctrl.getValue()) {
          return
        }
        reco.set('condition', null)
        condition.setValue()
        let value = AC.dateService.truncTimeToUtcNull(ctrl.getValue())
        if (dateFrom && value < dateFrom) {
          AC.viewUtils.showToast(UB.i18n('Помилка'), UB.i18n('Дата не повинна бути меншою, ніж ') + AC.dateService.formatDate(dateFrom))
          ctrl.setValue(dateFrom)
          return
        }
        if (dateTo && value > dateTo) {
          AC.viewUtils.showToast(UB.i18n('Помилка'), UB.i18n('Дата не повинна бути більшою, ніж ') + AC.dateService.formatDate(dateTo))
          ctrl.setValue(dateFrom || dateTo)
        }
      })
    },
    masterFields: entityName === 'hr_empOrder' ? ['ID'] : ['ID', 'orderID'],
    detailFields: entityName === 'hr_empOrder' ? ['orderID'] : ['paraID', 'orderID'],
    listeners: {
      changeData: function (grid, action) {
        // let me = grid.up('form')
        // me.setIsDirty(true)
      },
      render: grid => {
        const me = grid.up('form')
        const hrCheckPayElActing = AC.settings.get('hrCheckPayElActing', me.record.get('organizationID') || me.masterForm.record.get('organizationID') || appAC.globalOrganization()) || 0
        const rowEditor = grid.plugins.find(item => item.clicksToEdit !== undefined)
        if (rowEditor) {
          rowEditor.clicksToEdit = 2
          /* to allow "condition" ubcombobox editing */
          rowEditor.events.validateedit && rowEditor.events.validateedit.listeners && rowEditor.events.validateedit.listeners[0] &&
          rowEditor.un('validateedit', rowEditor.events.validateedit.listeners[0].fn)
          rowEditor.on('validateedit', function (editing, context) {
            let payElID = editing.editor.query('[name=payElID.description]')[0]
            let payForExtraLoad = editing.editor.query('[name=payForExtraLoad]')[0]
            let calcAlgorithm = payElID.getFieldValue('calcAlgorithm')
            if (hrCheckPayElActing && ['2', '3'].includes(calcAlgorithm) && !payForExtraLoad.getValue()) {
              AC.viewUtils.showToast(UB.i18n('Помилка'), UB.i18n('Не заповнений відсоток доплати'))
              return false
            }
            const me = context.grid.up('form')
            if (!me.record.get('employeePositionID') && payElID.getValue() && calcAlgorithm !== '3') {
              $App.dialogInfo(UB.i18n('Не обрано відсутнього працівника, та обрано Вид оплати за заміщеня, залежний від заробітку відсутнього працівника'))
            }
            return true
          })
        }
        grid.menu.add(
          [
            {
              text: UB.i18n('Відкрити картку працівника'),
              iconCls: 'fa fa-male',
              ubID: 'itemShowEmployee',
              disabled: !AC.entityUtils.verifyRightsMethod('hr_employee', 'view'),
              handler: function () {
                const reco = AC.gridUtils.getCurrentRecord(grid)
                if (!reco) {
                  AC.viewUtils.showToast(UB.i18n('Помилка'), UB.i18n('Не вибраний запис'))
                  return
                }
                const ID = reco.get('ID')
                if (!ID) {
                  return
                }
                UB.Repository(grid.entityName)
                  .attrs('employeeNumberID', 'employeeID')
                  .selectById(reco.get('ID'))
                  .then(row => {
                    if (row) {
                      $App.doCommand({
                        cmdType: 'showForm',
                        formCode: 'hr_employee',
                        entity: 'hr_employee',
                        cmpInitConfig: {
                          employeeNumberID: row.employeeNumberID
                        },
                        instanceID: row.employeeID
                      })
                    }
                  })
              }
            },
            {
              text: UB.i18n('Перемістити вище'),
              ubID: 'itemMoveUp',
              iconCls: 'fa fa-arrow-up',
              handler: function () {
                const reco = AC.gridUtils.getCurrentRecord(grid)
                let message
                if (!reco) {
                  message = UB.i18n('Не вибраний запис')
                }
                if (message) {
                  AC.viewUtils.showToast(UB.i18n('Помилка'), message)
                  return
                }
                const ID = reco.get('ID')
                $App.connection.run({
                  entity: 'hr_empOrderDet',
                  method: 'moveItemUp',
                  orderID: me.orderForm.instanceID,
                  ID: ID,
                  mi_unityEntity: 'hr_empOrderActingDet',
                  itemIdx: reco.get('itemIdx')
                }).then(mParams => {
                  if (mParams.isMoved) {
                    const store = grid.getStore()
                    store.load(then => {
                      grid.getSelectionModel().select(store.find('ID', ID), true)
                    })
                  }
                })
              }
            },
            {
              text: UB.i18n('Перемістити нижче'),
              iconCls: 'fa fa-arrow-down',
              ubID: 'itemMoveDown',
              handler: function () {
                const reco = AC.gridUtils.getCurrentRecord(grid)
                let message
                if (!reco) {
                  message = UB.i18n('Не вибраний запис')
                }
                if (message) {
                  AC.viewUtils.showToast(UB.i18n('Помилка'), message)
                  return
                }
                const ID = reco.get('ID')
                $App.connection.run({
                  entity: 'hr_empOrderDet',
                  method: 'moveItemDown',
                  orderID: me.orderForm.instanceID,
                  ID: ID,
                  mi_unityEntity: 'hr_empOrderActingDet',
                  itemIdx: reco.get('itemIdx')
                }).then(mParams => {
                  const store = grid.getStore()
                  store.load(then => {
                    grid.getSelectionModel().select(store.find('ID', ID), true)
                  })
                })
              }
            },
            {
              text: UB.i18n('Оновити нумерацію'),
              iconCls: 'u-icon-refresh',
              ubID: 'enumerateItems',
              handler: function () {
                $App.connection.run({
                  entity: 'hr_empOrderDet',
                  method: 'enumerateItems',
                  orderID: me.orderForm.instanceID,
                  mi_unityEntity: 'hr_empOrderActingDet'
                }).then(mParams => {
                  grid.getStore().load()
                })
              }
            }
          ])
      }
    },
    cmpInitConfig: {
      customInit: function () {
        const grid = this
        const _onDel = grid.onDel
        const _onAddNew = grid.onAddNew
        const newOnDel = function () {
          const me = grid.up('form')
          if (me.record.get('orderState') === 'POSTED') {
            AC.viewUtils.showToast(UB.i18n('Помилка'), UB.i18n('Неможливо видалити запис з проведеного наказу'))
            return
          }
          me.setIsDirty && me.setIsDirty(true)
          _onDel.call(grid)
        }
        const newOnAddNew = function () {
          const me = grid.up('form')
          me.skipValidate = true
          _onAddNew.call(grid)
        }
        AC.gridUtils.replaceListener(grid, 'del', grid.onDel, newOnDel)
        AC.gridUtils.replaceListener(grid, 'addNew', grid.onAddNew, newOnAddNew)
        const _doOnEdit = grid.doOnEdit
        grid.doOnEdit = function () {
          grid.isEditMode = true
          _doOnEdit.call(grid)
        }
      },
      onDeterminateForm: function (grid) {
      }
    },
    optimizeColumnWidth: function () {
      /* do nothing for manual column width tunning */
    }
  }, config)
}

function getVacationPlanParaGrid (entityName, config) {
  return _.merge({
    xtype: 'ubdetailgrid',
    paraGrid: true,
    autoScroll: true,
    rowEditing: true,
    enableColumnHide: false,
    name: 'empOrderVacationPlanGrid',
    flex: 1,
    entityConfig: {
      entity: 'hr_empOrderVacationPlan',
      method: 'select',
      fieldList: [
        {
          name: 'dictVacationKindID.name',
          description: UB.i18n('Вид відпустки'),
          config: { width: 350 },
          editor: {
            fieldList: ['ID', 'name', 'code', 'isDay', 'isProportional'],
            whereList: {
              isDay: {
                expression: '[isDay]',
                condition: '=',
                value: true
              }
            },
            orderList: { orderBy: { expression: 'name', order: 'asc' } }
          }
        },
        {
          name: 'dateFrom',
          description: UB.i18n('Період з'),
          config: { align: 'center', width: 100 }
        },
        {
          name: 'dateTo',
          description: UB.i18n('Період по'),
          config: { align: 'center', width: 100 }
        },
        {
          name: 'dateEndEmpty',
          config: { align: 'center', width: 100 }
        },
        {
          name: 'dayCount',
          description: UB.i18n('Днів'),
          config: { align: 'center', width: 80 },
          editor: { minValue: 0, maxValue: 365, allowExponential: false }
        },
        {
          name: 'isRest',
          config: { align: 'center', width: 180 }
        },
        {
          name: 'isMainPart',
          config: { align: 'center', width: 180 },
          editor: { readOnly: true }
        }
      ]
    },
    onBeforeEdit: function (rowEditor, context) {
      if (context.grid.isEditDisabled) {
        return false
      }
      const editor = rowEditor.editor
      const me = editor.up('form')
      const reco = context.record
      let toSetDefaultValues = !!context.record.phantom
      if (toSetDefaultValues) {
        reco.set('orderDetID', me.record.get('ID'))
      }
      const dictVacationKindIDCtrl = editor.query(`[name=dictVacationKindID.name]`)[0]
      const dateFromCtrl = editor.query(`[name=dateFrom]`)[0]
      const dateToCtrl = editor.query(`[name=dateTo]`)[0]
      const dayCountCtrl = editor.query(`[name=dayCount]`)[0]
      const isRestCtrl = editor.query(`[name=isRest]`)[0]
      const isMainPartCtrl = editor.query(`[name=isMainPart]`)[0]

      const employeeIDCtrl = me.attr.employeeID
      const employeeNumberIDCtrl = me.attr.employeeNumberID
      const positionIDCtrl = me.attr.positionID
      const appointDateCtrl = me.attr.dateFrom
      const dateEndCtrl = me.attr.dateToEmpty
      const empOrderExpGrid = me.down('[name=hr_empOrderExperience]')
      let employeeID = employeeIDCtrl.getValue()
      let employeeNumberID = employeeNumberIDCtrl && employeeNumberIDCtrl.getValue()
      let appointDate = appointDateCtrl.getValue()
      let appointDateEnd = dateEndCtrl && dateEndCtrl.getValue()
      let positionIDReco = AC.gridUtils.getCurrentRecord(positionIDCtrl)
      let positionType = (positionIDReco && positionIDReco.get('positionType')) || '0'
      let onDate = appAC.globalApplicationDate()

      function setPlanData (dictVacationKindID, expCalcDate) {
        $App.connection.run({
          entity: 'hr_empOrderVacationPlan',
          method: 'getVacationPlanData',
          employeeID: employeeID,
          employeeNumberID: employeeNumberID,
          positionType: positionType,
          dictVacationKindID: dictVacationKindID,
          empPosDateFrom: appointDate,
          empPosDateTo: appointDateEnd,
          planDateTo: undefined,
          onDate: onDate,
          expCalcDate: expCalcDate
        }).then(mParams => {
          let result = mParams.result
          if (result) {
            let dateFrom = new Date(result.dateFrom)
            let dateTo = new Date(result.dateTo)
            let dayCount = result.dayCount
            dateFromCtrl.setValue(dateFrom)
            dateToCtrl.setValue(dateTo)
            dayCountCtrl.setValue(dayCount)
          }
        })
      }

      function getExpCalcPlan (empOrderExpGridStore, dictVacationKindID) {
        const stateExpCode = HR.timeService.getConstants().stateExpCode
        let expCalcDate
        const expItems = empOrderExpGridStore && empOrderExpGridStore.data.items
        const stateExpItems = expItems && expItems.filter(itm => itm.get('dictExperienceID.code') === stateExpCode)
        if (stateExpItems && stateExpItems.length > 0) {
          expCalcDate = stateExpItems[0].get('calcDate')
          setPlanData(dictVacationKindID, expCalcDate)
        } else {
          /* в пункті наказу на закладці стажу немає стажу за держслужбу, то шукаємо приведену дату в картці стажу */
          UB.Repository('hr_employeeExperience')
            .attrs(['calcDate'])
            .where('employeeID', '=', employeeID)
            .where('dictExperienceID.code', '=', stateExpCode)
            .selectScalar()
            .then(calcDate => {
              if (calcDate) {
                expCalcDate = calcDate
              }
              setPlanData(dictVacationKindID, expCalcDate)
            })
        }
      }

      function setDates () {
        let dictVacationKindIDReco = AC.gridUtils.getCurrentRecord(dictVacationKindIDCtrl)
        let dictVacationKindID = dictVacationKindIDReco && dictVacationKindIDReco.get('ID')
        let vacCode = dictVacationKindIDReco && dictVacationKindIDReco.get('code')
        let isStateExp = vacCode === 'dState'
        if (isStateExp && empOrderExpGrid) {
          const empOrderExpGridStore = empOrderExpGrid.getStore()
          if (empOrderExpGridStore.getCount() > 0 || empOrderExpGridStore.isLoaded) {
            getExpCalcPlan(empOrderExpGridStore, dictVacationKindID)
          } else {
            empOrderExpGridStore.load(() => {
              getExpCalcPlan(empOrderExpGridStore, dictVacationKindID)
              empOrderExpGridStore.isLoaded = true
            })
          }
        } else {
          getExpCalcPlan(undefined, dictVacationKindID)
        }
      }

      function setIsMainPart () {
        if (isMainPartCtrl.readOnly) {
          return
        }
        let value = dayCountCtrl.getValue()
        if (value) {
          isMainPartCtrl.setValue(value >= HR.timeService.getConstants().yearVacMainPart)
        }
      }

      function enableIsMainPart () {
        let dictVacationKindIDReco = AC.gridUtils.getCurrentRecord(dictVacationKindIDCtrl)
        let vacCode = dictVacationKindIDReco && dictVacationKindIDReco.get('code')
        let isMainPartEnabled = vacCode && vacCode.startsWith('dYear') && isRestCtrl.getValue()
        isMainPartCtrl.setReadOnly(!isMainPartEnabled)
        if (!isMainPartEnabled) {
          isMainPartCtrl.setValue(false)
        }
      }

      dictVacationKindIDCtrl.getStore().on('load', (store) => {
        enableIsMainPart()
      })

      dictVacationKindIDCtrl.on('change', ctrl => {
        setDates()
        enableIsMainPart()
        setIsMainPart()
      })

      isRestCtrl.on('change', ctrl => {
        enableIsMainPart()
        setIsMainPart()
      })

      dayCountCtrl.on('change', (ctrl, value) => {
        setIsMainPart()
      })
    },
    masterFields: ['ID'],
    detailFields: ['orderDetID'],
    cmpInitConfig: {
      customInit: function () {
        const grid = this
        HR.controlService.setValidateEditPromise(grid, (rowEditor, context) => {
          let result = true
          const errors = []
          const editor = rowEditor.editor
          const reco = context.record
          const grid = context.grid
          let gridItems = grid.getStore().data.items
          const form = grid.up('form')
          const dictVacationKindIDCtrl = editor.query(`[name=dictVacationKindID.name]`)[0]
          const dateFromCtrl = editor.query(`[name=dateFrom]`)[0]
          const dateToCtrl = editor.query(`[name=dateTo]`)[0]
          const isRestCtrl = editor.query(`[name=isRest]`)[0]
          const dateEndCtrl = editor.query(`[name=dateEndEmpty]`)[0]
          const employeeIDCtrl = form.attr.employeeID
          let ID = reco.get('ID') || 0
          let dictVacationKindIDReco = AC.gridUtils.getCurrentRecord(dictVacationKindIDCtrl)
          let dictVacationKindID = dictVacationKindIDReco && dictVacationKindIDReco.get('ID')
          let vacCode = dictVacationKindIDReco && dictVacationKindIDReco.get('code')
          let isStateExp = vacCode === 'dState'
          let dateFrom = AC.dateService.shiftDate(dateFromCtrl.getValue())
          let dateTo = AC.dateService.shiftDate(dateToCtrl.getValue())
          let dateEnd = AC.dateService.shiftDate(dateEndCtrl.getValue())
          let isDateFrom = AC.dateService.isValid(dateFrom)
          let isDateTo = AC.dateService.isValid(dateTo)
          let isDateEnd = AC.dateService.isValid(dateEnd)
          let employeeID = employeeIDCtrl.getValue()
          let isRest = isRestCtrl.getValue()
          let dateToMaxValue = AC.dateService.shiftDate(AC.dateService.addDays((AC.dateService.addYears(dateFrom, 1)), -1))

          if (isDateFrom && isDateTo && dateTo > dateToMaxValue) {
            errors.push(UB.i18n('Дата "Період по" не може відрізнятись від "Період з" більше ніж на рік'))
            result = false
          }

          if (isDateFrom && isDateTo && dateFrom > dateTo) {
            errors.push(UB.i18n('Дата "Період з" не може бути більшою за "Період по"'))
            result = false
          }

          if (isDateEnd && isDateTo && dateTo > dateEnd) {
            errors.push(UB.i18n('Дата "Період по" не може бути більшою за "Закінчення права на відпустку"'))
            result = false
          }

          if (dictVacationKindID && isDateFrom && isDateTo) {
            gridItems = gridItems.filter(itm => itm.get('ID') !== ID)
            if (gridItems.length > 0) {
              let dateCrossCheck = false
              let restCheck = isRest
              for (let i = 0; i < gridItems.length; i++) {
                let gridItem = gridItems[i]
                let gridVacKindID = gridItem.get('dictVacationKindID')
                let gridDateFrom = AC.dateService.shiftDate(gridItem.get('dateFrom'))
                let gridDateTo = AC.dateService.shiftDate(gridItem.get('dateTo'))
                let gridIsRest = AC.dateService.shiftDate(gridItem.get('isRest'))
                if (!dateCrossCheck && gridVacKindID === dictVacationKindID && gridDateFrom <= dateTo && gridDateTo >= dateFrom) {
                  dateCrossCheck = true
                  errors.push(UB.i18n('Для цього виду відпустки був внесений період, що перетинається з поточним. Змініть дані.'))
                  result = false
                }
                if (!restCheck && gridVacKindID === dictVacationKindID && !gridIsRest) {
                  restCheck = true
                  errors.push(UB.i18n('Для виду відпустки може бути лише один запис за поточний період. Проставте ознаку "Залишок за попередній період"'))
                }
                if (dateCrossCheck && restCheck) {
                  break
                }
              }
            }
          }

          /* Для відпустки за стаж держслужби - перевірка, чи є працівник держслужбовцем */
          let checkStateVac
          if (isStateExp) {
            checkStateVac = HR.timeService.checkStateVac(undefined, vacCode, dateFrom, employeeID)
            if (!checkStateVac) {
              checkStateVac = Promise.resolve(false)
            }
          }
          HR.orderManager.setIsDirty(form, true)
          return Promise.resolve().then(() => {
            if (checkStateVac) {
              return checkStateVac
            } else {
              return Promise.resolve(true)
            }
          }).then(stateData => {
            if (isStateExp && !stateData) {
              errors.push(UB.i18n('Працівник не є держслужбовцем'))
            }
            if (errors.length > 0) {
              $App.dialogError(errors.join('<br/>'), UB.i18n('Увага!'))
            }
            return Promise.resolve(result)
          })
        })
      },
      enableActions: function () {
        const grid = this
        const form = grid.up('form')
        const isEditable = form.orderForm && (form.orderForm.record.get('orderState') === 'PROJECT' || form.orderForm.record.get('orderState') === 'PROJECT')
        AC.gridUtils.enableCustomAction(grid, 'fillList', isEditable)
        const empOrderType = form.record.get('empOrderType')
        const isTransfer = form.record.get('isTransfer')
        const srcOrganizationID = form.record.get('srcOrganizationID')
        let enableAddBalance = isEditable && isTransfer && srcOrganizationID
        AC.gridUtils.enableCustomAction(grid, 'addBalance', enableAddBalance)
        if (empOrderType !== 'APPOINT') {
          const addBalanceBtn = grid.down('[actionId=addBalance]')
          addBalanceBtn && addBalanceBtn.hide()
        }
      },
      listeners: {
        render: (grid) => {
          const form = grid.up('form')
          grid.enableActions()
          form.on('aftersave', () => {
            grid.enableActions()
          })
        }
      }
    },
    optimizeColumnWidth: function () {
      /* do nothing for manual column width tunning */
    },
    customActions: [
      {
        actionId: 'fillList',
        text: UB.i18n('Додати права на відпустку'),
        iconCls: 'fas fa-angle-double-down',
        cls: 'fill-action',
        handler: function (btn) {
          const me = btn.up('form')
          const grid = btn.up('entitygridpanel')
          grid.setLoading(true)
          let answerPromise
          if (grid.store.getCount() > 0) {
            answerPromise = $App.dialogYesNo(UB.i18n('Увага'), UB.i18n('Всі записи права на відпустку будуть видалені. Продовжити?'))
          } else {
            answerPromise = Promise.resolve(true)
          }
          answerPromise.then(function (res) {
            if (res) {
              HR.orderManager.setIsDirty(me, true)
              HR.controlService.checkAndSaveForm(me, () => {
                const isPluralistOrder = entityName === 'hr_empOrderPluralistDet'
                const employeeID = me.record.get('employeeID')
                const employeeNumberID = me.record.get('employeeNumberID')
                const onDate = appAC.globalApplicationDate()
                const dateFrom = me.attr.dateFrom.getValue()
                const orderDateTo = me.attr.dateToEmpty && me.attr.dateToEmpty.getValue()
                let positionType = me.attr.positionID.getFieldValue('positionType') || '0'
                const isNewTabNum = me.record.get('isNewTabNum')
                let runPromise
                if (isPluralistOrder) {
                  runPromise = $App.connection.run({
                    entity: 'hr_empOrderVacationPlan',
                    method: 'addDefaultPluralistVacationPlan',
                    employeeID: employeeID,
                    employeeNumberID: employeeNumberID,
                    positionType: positionType,
                    dateFrom: dateFrom,
                    dateTo: orderDateTo,
                    orderDetID: me.instanceID,
                    planKindOption: !isNewTabNum ? 'EMPPLAN' : 'PLANDAY',
                    dontClear: false
                  })
                } else {
                  runPromise = $App.connection.run({
                    entity: 'hr_empOrderVacationPlan',
                    method: 'addDefaultVacationPlan',
                    employeeID: employeeID,
                    employeeNumberID: employeeNumberID,
                    positionType: positionType,
                    onDate: onDate,
                    empPosDateFrom: dateFrom,
                    empPosDateTo: orderDateTo,
                    orderDetID: me.instanceID,
                    planKindOption: 'PLANDAY',
                    dontClear: false
                  })
                }
                runPromise.then(mParams => {
                  grid.getStore().load(() => {
                    grid.setLoading(false)
                  })
                  if (mParams.messages) {
                    let msgs = JSON.parse(mParams.messages)
                    if (msgs.length > 0) {
                      $App.dialogInfo(msgs.join('<br>'))
                    }
                  }
                })
              }, () => {
                grid.setLoading(false)
              })
            } else {
              grid.setLoading(false)
            }
          })
        }
      },
      {
        actionId: 'addBalance',
        text: UB.i18n('Додати залишки'),
        iconCls: 'fas fa-chart-pie',
        cls: 'fill-action',
        handler: function (btn) {
          const me = btn.up('form')
          const grid = btn.up('entitygridpanel')
          grid.setLoading(true)
          let answerPromise
          const gridData = grid.store.data.items
          let recalcItem = (gridData.length > 0) && gridData.find(itm => itm.get('isFromOrg'))
          if (recalcItem) {
            answerPromise = $App.dialogYesNo(UB.i18n('Увага'), UB.i18n('Записи з залишком за попередній період будуть видалені. Продовжити?'))
          } else {
            answerPromise = Promise.resolve(true)
          }
          answerPromise.then(function (res) {
            HR.orderManager.setIsDirty(me, true)
            HR.controlService.checkAndSaveForm(me, () => {
              const employeeID = me.record.get('employeeID')
              const srcOrganizationID = me.record.get('srcOrganizationID')
              const onDate = appAC.globalApplicationDate()
              $App.connection.run({
                entity: 'hr_empOrderVacationPlan',
                method: 'addBalance',
                employeeID,
                srcOrganizationID,
                orderDetID: me.instanceID,
                onDate
              }).then(mParams => {
                grid.getStore().load(() => {
                  grid.setLoading(false)
                })
                let msg = mParams.message
                if (msg) {
                  $App.dialogInfo(msg)
                }
              })
            })
          })
        }
      }
    ]
  }, config)
}

function showIf (me) {
  me.query('[showIf]').forEach(ctrl => _.isFunction(ctrl.showIf) && ctrl.setVisible && ctrl.setVisible(ctrl.showIf(ctrl, me)))
}

function requiredIf (me) {
  me.query('[requiredIf]').forEach(ctrl => _.isFunction(ctrl.requiredIf) && ctrl.setAllowBlank && ctrl.setAllowBlank(!ctrl.requiredIf(ctrl, me)))
}

function readOnlyIf (me) {
  me.query('[readOnlyIf]').forEach(ctrl => _.isFunction(ctrl.readOnlyIf) && ctrl.setReadOnly && ctrl.setReadOnly(ctrl.readOnlyIf(ctrl, me)))
}

function disabledIf (me) {
  me.query('[disabledIf]').forEach(ctrl => _.isFunction(ctrl.disabledIf) && ctrl.setDisabled && ctrl.setDisabled(ctrl.disabledIf(ctrl, me)))
}

function enableControls ({ me, isEnabled, controls = [] }) {
  me.query('[attributeName]').forEach(item => {
    if (!item.setReadOnly) {
      return
    }
    !(item.initialConfig && item.initialConfig.readOnly) && item.setReadOnly(!isEnabled)
  })
  controls.forEach(item => {
    if (item.setReadOnly) {
      item.setReadOnly(!isEnabled)
    } else if (item.setDisabled) {
      item.setDisabled(!isEnabled)
    }
  })
  if (!me.isNewInstance) {
    me.actions && me.actions.fDelete.setDisabled(!isEnabled)
  }
  const grids = me.query('entitygridpanel')
  grids.forEach(grid => {
    enableGrid(grid, isEnabled)
  })
  return !isEnabled
}

function enableGrid (grid, isEnabled) {
  const actions = [grid.down('[name=fillFromStaff]'), grid.actions.del, grid.actions.addNew, grid.actions.addNewByCurrent]
  grid.isEditDisabled = !isEnabled
  grid.readOnly = !isEnabled
  actions.forEach(item => {
    if (item) {
      if (!isEnabled || item.forceHidden) {
        item.hide()
      } else {
        item.show()
      }
      item.setDisabled(!isEnabled)
    }
  })
  const customActions = [grid.down('[actionId=copyRecord]'), grid.down('[actionId=addByList]'), grid.down('[actionId=addByType]'), grid.down('[actionId=fillWithSave2]')]
  customActions.forEach(item => {
    if (item) {
      item.setDisabled(!isEnabled)
    }
  })
}

function getDepPosBlock () {
  function showStaffTree (form) {
    const me = form
    if (!me.orderForm) {
      return
    }
    $App.doCommand({
      cmdType: 'showForm',
      formCode: 'hr_staffTreeSelect',
      customParams: {
        organizationID: me.orderForm.record.get('organizationID.mi_data_id'),
        onDate: AC.dateService.truncTimeToUtcNull(me.orderForm.record.get('orderDate')),
        onSelectNodeHandler: function (tree) {
          const record = tree.getCurrentRecord()
          let posID = null
          let depID = null
          const data = record.raw
          const positionCtrl = form.getField('positionID')
          const focusField = positionCtrl
          const onLoadDepartmentData = function () {
            setTimeout(() => {
              me.filterPosition({
                isReload: false,
                isClear: false
              }).then(() => {
                if (posID) {
                  positionCtrl.getStore().load().then(store => positionCtrl.setValueById(posID))
                } else {
                  positionCtrl.setValueById(null)
                }
              })
            }, 10)
          }
          if (me.orderForm.record.get('orderState') === 'PROJECT') {
            const pData = record.parentNode ? record.parentNode.raw : null
            switch (data.nodeType) {
              case 'DEPUNIT':
                depID = data.ID
                break
              case 'POSUNIT':
                posID = data.ID
                if (pData && pData.nodeType === 'DEPUNIT') {
                  depID = pData.ID
                }
                break
            }
            if (posID || depID) {
              me.record.set('departmentID', depID)
              me.getField('departmentID').setValueById(depID, false, onLoadDepartmentData)
            }
          }
          Ext.defer(function () {
            focusField.focus(true)
          }, 500)
          return Promise.resolve(true)
        }
      }

    })
  }

  return {
    layout: {
      type: 'vbox',
      align: 'stretch'
    },
    items: [
      {
        layout: {
          type: 'hbox',
          align: 'middle'
        },
        margin: '0 15 0 0',
        items: [
          {
            attributeName: 'departmentID',
            allowBlank: true,
            flex: 1,
            fieldList: ['name', 'ID', 'mi_data_id'],
            displayField: 'name',
            __mip_recordhistory_all: true,
            listeners: {
              render: ctrl => {
                Ext.create('Ext.util.KeyMap', {
                  key: 9,
                  target: ctrl.getEl(), // this.reason.getEl(),
                  handler: function (key, ev) {
                    const
                      next = ctrl.up('form').down(ev.shiftKey ? '[attributeName=employeeID]' : '[attributeName=positionID]')
                    if (next) {
                      next.inputEl.focus()
                      next.focus(true)
                    }
                  },
                  defaultEventAction: 'stopEvent'
                })
              }
            }
          },
          {
            xtype: 'button',
            cls: 'treeIconNotFocus',
            ubID: 'btnSelectByTree',
            width: 35,
            height: 35,
            margin: '0 2 0 -12',
            listeners: {
              click: function (ctrl) {
                const me = ctrl.up('form')
                showStaffTree(me)
              },
              focus: function setFocused (btn) {
                btn.removeCls('treeIconNotFocus')
                btn.addCls('treeIconFocus')
              },
              blur: function setNotFocused (btn) {
                btn.removeCls('treeIconFocus')
                btn.addCls('treeIconNotFocus')
              },
              render: ctrl => {
                ctrl.setTooltip(UB.i18n('Вибір підрозділу та посади з дерева орг. структури'))
                Ext.create('Ext.util.KeyMap', {
                  key: 9,
                  target: ctrl.getEl(), // this.reason.getEl(),
                  handler: function (key, ev) {
                    const
                      next = ctrl.up('form').down(ev.shiftKey ? '[attributeName=positionID]' : '[attributeName=dateFrom]')
                    next.inputEl.focus()
                    next.focus(true)
                  },
                  defaultEventAction: 'stopEvent'
                })
              }
            }
          }
        ]
      },
      {
        attributeName: 'positionID',
        fieldList: ['name', 'ID', 'mi_data_id', 'positionType', 'accrualSum', 'payElID', 'dictPositionID'],
        flex: 1,
        displayField: 'name',
        __mip_recordhistory_all: true,
        listeners: {
          select: ctrl => {
            // ctrl.up('form').setSalary(ctrl)
          },
          change: ctrl => {
            if (ctrl.getValue()) {
              ctrl.up('form').setSalary(ctrl)
            }
          },
          render: ctrl => {
            Ext.create('Ext.util.KeyMap', {
              key: 9,
              target: ctrl.getEl(), // this.reason.getEl(),
              handler: function (key, ev) {
                const
                  next = ctrl.up('form').down(ev.shiftKey ? '[attributeName=departmentID]' : '[attributeName=dateToEmpty]')
                if (next) {
                  next.inputEl.focus()
                  next.focus(true)
                }
              },
              defaultEventAction: 'stopEvent'
            })
          }
        }
      }
    ]
  }
}

function checkAndSaveDocFile (me) {
  const isDocChanged = AC.dataService.isFieldModified(me.record, 'document')
  if (isDocChanged) {
    return me.saveForm()
  } else {
    return Promise.resolve(true)
  }
}

function internalDelete (me, callBackFn) {
  const deletePromise = []
  let request
  me.lockInterface()
  Promise.all(deletePromise).then(function (res) {
    me.maskForm(2000)
    request = me.formRequestConfig('delete', {
      entity: me.entityName,
      method: 'delete',
      execParams: {
        ID: me.instanceID
      }
    })
    return $App.connection.doDelete(request).then(function (responce) {
      if (me.store && !me.store.isDestroyed) {
        const record = me.store.findRecord('ID', me.instanceID)
        if (record) {
          me.store.remove(record)
        }
      }
      me.isDeleted = true
      callBackFn && callBackFn()
    }).finally(function () {
      me.unmaskForm()
    }).then(function () {
      me.closeForce = true
      me.closeWindow(true)
    })
  }).finally(function () {
    me.unmaskForm()
  })
}

function getPostWarningAllType (me) {
  let warnMessage = ''
  if (!me.record.get('document')) {
    warnMessage = UB.i18n('Увага! Не сформований текст для даного наказу!</br>')
  }
  me.setLoading(true)
  return $App.connection.run({
    entity: 'hr_empOrder',
    method: 'getValidatorWarning',
    validatorFn: 'getPostWarningAllType',
    empOrderType: 'ALL',
    orderID: me.instanceID
  }).then(mParams => {
    me.setLoading(false)
    warnMessage += (mParams.result || '')
    return UB.Repository('hr_recstage')
      .attrs(['ID'])
      .where('docID', '=', me.record.get('ID'))
      .where('mi_wfState', '=', 'NEW')
      .where('entityName', '=', 'hr_recstage')
      .limit(1)
      .selectScalar().then(result => {
        return warnMessage + (result ? UB.i18n('</br>Наказ містить маршрут погодження, але неузгоджений') : '')
      })
  }, (err) => {
    $App.dialogError(err.message)
    me.setLoading(false)
  })
}

/* Повідомлення при збереженні / проведенні: отримати Promise з { postMessage } - повідомлення, що буде при проведенні, resObj.result - блокує (false) чи не блокує (true) проведення */
function getPostWarning (me) {
  const empOrderType = me.record.get('empOrderType')
  const resObj = {
    result: true,
    postMessage: ''
  }

  function checkAllType () {
    return getPostWarningAllType(me).then(message => {
      if (message) {
        resObj.postMessage = message + '<BR>' + resObj.postMessage + '<BR>'
      } else {
        resObj.postMessage += '<BR>'
      }
      return resObj
    })
  }

  async function getPostWarningVacationret () {
    resObj.postMessage += `
      Після проведення даного наказу необхідно привести у відповідність дані, на закладці "Право на відпустку" даному працівнику.<BR>`

    const retPositions = await UB.Repository('hr_empOrderVacationretDet')
      .attrs(['retPositionID.mi_data_id', 'retPositionID', 'dateFrom', 'employeeNumberID'])
      .where('orderID', '=', me.record.get('ID'))
      .selectAsObject({
        'retPositionID.mi_data_id': 'mi_data_id'
      })

    for (const retPosition of retPositions) {
      const retEmployee = await UB.Repository('hr_employeePositionS')
        .attrs(['positionID.name', 'employeeID.fullFIO'])
        .where('positionID', '=', retPosition.mi_data_id)
        .where('dateFrom', '<=', retPosition.dateFrom)
        .where('dateTo', '>=', retPosition.dateFrom)
        .where('positionID.state', '=', 'ACTIVE')
        .where('positionID.mi_deleteDate', '>=', '#maxdate')
        .where('positionID.mi_dateFrom', '<=', retPosition.dateFrom)
        .where('positionID.mi_dateTo', '>=', retPosition.dateFrom)
        .where('employeeNumberID', '!=', retPosition.employeeNumberID)
        .where('vacancyDateFrom', '>=', retPosition.dateFrom, 'vacancyDateFrom')
        .where('vacancyDateTo', '<=', retPosition.dateFrom, 'vacancyDateTo')
        .where('vacancyDateFrom', 'isNull', undefined, 'vacancyDateFromNull')
        .where('vacancyDateTo', 'isNull', undefined, 'vacancyDateToNull')
        .logic('([vacancyDateFrom] OR [vacancyDateTo] OR ([vacancyDateFromNull] AND [vacancyDateToNull]))')
        .orderBy('dateFrom', 'desc')
        .selectAsObject()

      retEmployee.forEach(retEmp => {
        resObj.postMessage += `
          ${UB.i18n('На посаді {0} тимчасово призначений працівник {1}.', retEmp['positionID.name'], retEmp['employeeID.fullFIO'])}
          ${UB.i18n('Необхідно провести наказ про звільнення {0}', retEmp['employeeID.fullFIO'])}.<br />`
      })
    }
    return resObj
  }

  switch (empOrderType) {
    case 'VACATIONRET':
      return getPostWarningVacationret()
    case 'VACATION':
    case 'VACATIONPROLONG':
    case 'MISSION':
    case 'ACTINGORD':
    case 'TRAINING':
    case 'APPOINT':
    case 'CERTIFICATION':
    case 'PLURALIST':
    case 'PROLONGATION':
    case 'MOVE':
    case 'MILSERVICERET':
      me.setLoading(true)
      return $App.connection.run({
        entity: 'hr_empOrder',
        method: 'getValidatorWarning',
        validatorFn: null,
        empOrderType: empOrderType,
        orderID: me.instanceID
      }).then(mParams => {
        me.setLoading(false)
        if (mParams.result) {
          resObj.postMessage = mParams.result
        }
        return checkAllType()
      }, (err) => {
        $App.dialogError(err.message)
        me.setLoading(false)
      })
    default:
      return checkAllType()
  }
}

/* Діалоги / повідомлення перед проведенням */
function getBeforePostPromise (me) {
  const empOrderType = me.record.get('empOrderType')
  let promiseFn
  switch (empOrderType) {
    case 'APPOINT':
      promiseFn = function (resolve) {
        return $App.connection.run({
          entity: 'hr_empOrder',
          method: 'getValidatorWarning',
          validatorFn: 'checkEmpRank4RankSave',
          empOrderType: empOrderType,
          orderID: me.instanceID
        }).then(mParams => {
          if (mParams.result) {
            const msg = mParams.result
            return $App.dialogYesNo(UB.i18n('Попередження'), msg + UB.i18n('<br/>Продовжити?')).then((choice) => {
              return resolve(choice)
            })
          }
          return resolve(true)
        })
      }
      break
    case 'MISSION':
      promiseFn = function (resolve) {
        return $App.connection.run({
          entity: 'hr_empOrderMissionDet',
          method: 'checkYearMissionDays',
          orderID: me.instanceID,
          orgID: me.record.get('organizationID')
        }).then(mParams => {
          let msg = mParams.result
          if (msg) {
            return $App.dialogYesNo(UB.i18n('Попередження'), msg + UB.i18n(' Згода працівника не отримана. Продовжити?'))
              .then((choice) => {
                return resolve(choice)
              })
          } else {
            return resolve(true)
          }
        })
      }
      break
    case 'RANK':
      promiseFn = function (resolve) {
        return $App.connection.run({
          entity: 'hr_empOrderRankDet',
          method: 'checkRankInYear',
          orderID: me.instanceID
        }).then(mParams => {
          let msg = mParams.msg
          if (msg && msg.length) {
            return $App.dialogYesNo(UB.i18n('Попередження'), msg.join('<br>') + UB.i18n('<br>Продовжити?'))
              .then((choice) => {
                return resolve(choice)
              })
          } else {
            return resolve(true)
          }
        })
      }
      break
    case 'ADDSALARYGOV':
      promiseFn = function (resolve) {
        return $App.connection.run({
          entity: 'hr_empOrderAddsalarygovDet',
          method: 'checkAccrualDates',
          execParams: {
            orderID: me.instanceID
          }
        }).then(mParams => {
          let msg = mParams.msg
          if (msg && msg.length) {
            $App.dialogError(msg, UB.i18n('Увага'))
            return resolve(false)
          } else {
            return resolve(true)
          }
        })
      }
      break
    case 'CERTIFICATION':
      promiseFn = function (resolve) {
        const orgBusinessTypeID = AC.settings.get('hrOrgBusinessType', appAC.globalOrganization()) || null
        return UB.Repository('cdn_orgbusinesstype').attrs(['ID', 'code']).selectById(orgBusinessTypeID).then(orgBusinessType => {
          return orgBusinessType && /* orgBusinessType.code === 'med' && */ $App.domainInfo.models.HRMED
            ? UB.Repository('hr_empOrderCertificationDet')
              .attrs(['ID', 'employeePositionID.description'])
              .where('certificationType', '=', 'ASSIGN')
              .where('dictTarifCoeffID', 'isNull')
              .where('orderID', '=', me.instanceID)
              .selectAsObject({
                'employeePositionID.description': 'description'
              }).then(result => {
                if (result.length) {
                  const msg = UB.i18n(`Для працівників {0} не вказано тарифний розряд працівника. Проведення не можливо`, result.map(o => o['description']).join(', '))
                  $App.dialogError(msg, UB.i18n('Увага'))
                  return resolve(false)
                } else {
                  return resolve(true)
                }
              })
            : resolve(true)
        })
      }
      break
    case 'MOVE':
      promiseFn = function (resolve) {
        return UB.Repository('hr_empOrderMoveDet')
          .attrs(['employeePositionID.employeeNumberID.description', 'dateTo', 'employeePositionID.dateTo'])
          .where('dictContractKindID.isTerm', '=', 1)
          .where('dictContractKindID.code', '=', '20')
          .where('[dateTo] > [employeePositionID.dateTo]', 'custom')
          .where('orderID', '=', me.instanceID)
          .selectAsObject({
            'employeePositionID.dateTo': 'appointDateTo',
            'employeePositionID.employeeNumberID.description': 'description'
          }).then((wrongPos) => {
            if (wrongPos.length) {
              let message = ''
              wrongPos.forEach(pos => {
                message += UB.i18n(`Дата закінчення поточного призначення "{0}" працівника {1} наступить раніше ніж дата закінчення дії тимчасових змін за цим пунктом "{2}".`, AC.dateService.formatDate(pos.dateTo), pos['description'], AC.dateService.formatDate(pos.appointDateTo))
              })
              return $App.dialogError(UB.i18n(`{0} Наказ не може бути проведений. Оберіть інші умови призначення.`, message), UB.i18n('Увага!')).then(() => {
                return resolve(false)
              })
            } else {
              getAnotherEmployeePosition(me.attr.hr_empOrderDet.getData()).then(_res => {
                const anotherPositions = _res.filter(x => x !== undefined)
                if (anotherPositions.length) {
                  let message = ''
                  anotherPositions.forEach(pos => {
                    message += UB.i18n(`Для працівника {0} ({1}) вже існує нове призначення створене на підставі {2}.`,
                      pos['pib'], pos['tabNum'], pos['anotherOrder'])
                  })
                  return $App.dialogError(message, UB.i18n('Увага!'))
                    .then(() => {
                      return resolve(false)
                    })
                } else { return resolve(true) }
              })
            }
          })
      }
      break
    case 'PLURALIST':
      promiseFn = function (resolve) {
        return UB.Repository('hr_empOrderPluralistDet')
          .attrs(['employeeNumberID', 'employeeNumberID.description', 'dateTo', 'employeeNumberID.appointDateTo'])
          .where('dictContractKindID.isTerm', '=', 1)
          .where('dictContractKindID.code', '=', '20')
          .where('employeeNumberID', 'isNotNull')
          .where('isChangeActivePos', '=', 1)
          .where('[dateTo] > [employeeNumberID.appointDateTo]', 'custom')
          .where('orderID', '=', me.instanceID)
          .selectAsObject({ 'employeeNumberID.appointDateTo': 'appointDateTo' }).then((wrongPos) => {
            if (wrongPos.length) {
              let message = ''
              wrongPos.forEach(pos => {
                message += UB.i18n(`Дата закінчення поточного призначення "{0}" працівника {1} наступить раніше ніж дата закінчення дії тимчасових змін за цим пунктом "{2}".`, AC.dateService.formatDate(pos.dateTo), pos['employeeNumberID.description'], AC.dateService.formatDate(pos.appointDateTo))
              })
              return $App.dialogError(UB.i18n(`{0}  Наказ не може бути проведений. Оберіть інші умови призначення.`, message), UB.i18n('Увага!')).then(() => {
                return resolve(false)
              })
            }
            return UB.Repository('hr_empOrderPluralistDet')
              .attrs(['ID', 'positionID.positionType', 'employeeID.description'])
              .where('dictTarifCoeffID', 'isNull')
              .where('orderID', '=', me.instanceID)
              .selectAsObject({
                'positionID.positionType': 'positionType',
                'employeeID.description': 'description'
              }).then(data => {
                if (data.length) {
                  let result = []
                  data.forEach(function (o) {
                    if (['7', '8', '12'].includes(o['positionType'])) {
                      result.push(o['description'])
                    }
                  })
                  if (result.length) {
                    const msg = UB.i18n(`Для працівників {0} не вказано тарифний розряд. Провести наказ?`, result.join(', '))
                    return $App.dialogYesNo(UB.i18n('Попередження'), msg)
                      .then((choice) => {
                        return resolve(choice)
                      })
                  } else {
                    return resolve(true)
                  }
                } else {
                  return resolve(true)
                }
              })
          })
      }
      break
    case 'DISM':
      promiseFn = function (resolve) {
        return UB.Repository('hr_empOrderVacSubstitutionDet')
          .attrs(['ID'])
          .where('orderID', '=', me.instanceID)
          .selectSingle().then(exist => {
            if (exist) {
              return $App.connection.run({
                entity: 'hr_empOrderVacSubstitutionDet',
                method: 'validateVacSubstitution',
                execParams: {
                  orderID: me.instanceID
                }
              }).then(mParams => {
                if (mParams.errors && mParams.errors.length) {
                  const msg = mParams.errors.join(', <br/>') + ' ' + UB.i18n(`Проведення не можливо`)
                  $App.dialogError(msg, UB.i18n('Увага'))
                  return resolve(false)
                }
                return resolve(true)
              })
            }
            return resolve(true)
          })
      }
      break
    case 'VACATIONRET':
      promiseFn = function (resolve) {
        return $App.connection.run({
          entity: 'hr_empOrder',
          method: 'getValidatorWarning',
          validatorFn: 'validateVacationRet',
          empOrderType: empOrderType,
          orderID: me.instanceID
        }).then(mParams => {
          if (mParams.result) {
            const msg = mParams.result + `.<br/>${UB.i18n('Проведення не можливо')}.`
            $App.dialogError(msg, UB.i18n('Увага'))
            return resolve(false)
          }
          return resolve(true)
        })
      }
      break
    case 'AVERAGEPAY':
      promiseFn = function (resolve) {
        return $App.connection.run({
          entity: 'hr_empOrder',
          method: 'getValidatorWarning',
          validatorFn: 'validateAveragePay',
          empOrderType: empOrderType,
          orderID: me.instanceID
        }).then(mParams => {
          if (mParams.result) {
            const msg = mParams.result + `.<br/>${UB.i18n('Проведення не можливо')}.`
            $App.dialogError(msg, UB.i18n('Увага'))
            return resolve(false)
          }
          return resolve(true)
        })
      }
      break
    case 'CWSHD':
      promiseFn = function (resolve) {
        return $App.connection.run({
          entity: 'hr_empOrder',
          method: 'getValidatorWarning',
          validatorFn: 'getValidateMessageCWSHD',
          empOrderType: empOrderType,
          orderID: me.instanceID
        }).then(mParams => {
          if (mParams.result) {
            const msg = mParams.result
            return $App.dialogYesNo(UB.i18n('Попередження'), UB.i18n('Для працівників <br/>{0}<br/>вказана дата роботи не є вихідним або святковим днем. Продовжити?', msg))
              .then((choice) => {
                return resolve(choice)
              })
          }
          return resolve(true)
        })
      }
      break
  }
  return new Promise((resolve, reject) => {
    if (promiseFn) {
      return promiseFn(resolve, reject)
    } else {
      return resolve(true)
    }
  })
}

function getAnotherEmployeePosition (orderDet) {
  const requests = []
  orderDet.filter(x => x.empOrderType !== 'TASK').forEach(item => {
    const query = UB.Repository('hr_employeePosition')
      .attrs(['orderID.description'])
      .where('dateTo', '<', AC.dateService.maxDate())
      .where('dateFrom', '>=', AC.dateService.shiftDate(item.dateFrom) || AC.dateService.maxDate())
      .where('ID', '!=', item.employeePositionID)
      .where('employeeNumberID', '=', item.employeeNumberID)
      .selectAsObject().then(res => {
        if (res.length > 0) {
          return {
            pib: item['employeeFullName'],
            tabNum: item['employeeNumberID.tabNum'],
            anotherOrder: res[0]['orderID.description']
          }
        }
      })
    requests.push(query)
  })
  return Promise.all(requests)
}

/* В цьому методі реєструються повідомлення перед відміною проведенням наказу */
function getCancelPostWarning (me) {
  const empOrderType = me.record.get('empOrderType')
  const resObj = {
    result: true,
    message: '',
    isDialog: false
  }
  switch (empOrderType) {
    case 'VACATION':
      return $App.connection.run({
        entity: 'hr_empOrderVacationDet',
        method: 'checkVacPlanIsNotDeleted',
        orderID: me.instanceID
      }).then(mParams => {
        resObj.message = mParams.result
        return resObj
      })
    case 'APPOINT':
      return $App.connection.run({
        entity: 'hr_empOrder',
        method: 'getValidatorWarning',
        validatorFn: 'getCancelPostWarningAPPOINT',
        empOrderType: me.record.get('empOrderType'),
        orderID: me.instanceID
      }).then(mParams => {
        if (mParams.result) {
          const isCanCancelEarlyOrder = AC.entityUtils.verifyRightsMethod(me.entityName, 'canCancelPostingEarlyOrder')
          resObj.message = UB.i18n(`Для працівників {0} наявні призначення, що створені іншими наказами {1}`, mParams.result, !isCanCancelEarlyOrder ? `. ${UB.i18n('Скасування не можливо!')}` : '')
          resObj.isDialog = isCanCancelEarlyOrder
          resObj.result = false
        }
        return resObj
      })
  }
  return resObj
}

async function calculateDateTrialEnd (me, value) {
  const months = me.attr.dictTrialPeriodID.getFieldValue('months')
  if (!months) {
    me.attr.dateTrialEnd.setValue(null)
    return
  }
  const dateFrom = value || me.record.get('dateFrom')
  if (!dateFrom) return
  let dateTrialEnd = AC.dateService.addMonths(dateFrom, months)
  const monthDiff = Math.abs(dateFrom.getFullYear() * 12 + dateFrom.getMonth() - (dateTrialEnd.getFullYear() * 12 + dateTrialEnd.getMonth()))
  if (monthDiff !== months) {
    dateTrialEnd = AC.dateService.lastDayOfMonth(AC.dateService.addMonths(AC.dateService.firstDayOfMonth(dateFrom), months))
  }
  const dateTo = AC.dateService.addMonths(dateTrialEnd, 1)
  const holidays = await getHolidays(dateFrom, dateTo, appAC.globalOrganization())
  const exchanges = await getCalendarChanges(dateFrom, dateTo, appAC.globalOrganization())
  while (!isWorkingDay(dateTrialEnd)) {
    dateTrialEnd = AC.dateService.addDays(dateTrialEnd, 1)
  }
  dateTrialEnd = AC.dateService.truncTimeToUtcNull(dateTrialEnd)
  // check holidays
  while (holidays.find(o => AC.dateService.shiftDate(o).getTime() === dateTrialEnd.getTime())) {
    dateTrialEnd = AC.dateService.addDays(dateTrialEnd, 1)
  }
  // check exchanges
  while (exchanges.find(o => AC.dateService.shiftDate(o.changeDateTo).getTime() === dateTrialEnd.getTime())) {
    dateTrialEnd = AC.dateService.addDays(dateTrialEnd, 1)
  }
  me.attr.dateTrialEnd.setValue(dateTrialEnd)
}

function getHolidays (dateFrom, dateTo, orgID) {
  return $App.connection.run({
    entity: 'hr_calendarHoliday',
    method: 'getHolidays',
    dateFrom: dateFrom,
    dateTo: dateTo,
    orgID: orgID
  }).then(mParams => {
    let holidays = []
    if (mParams.result) {
      holidays = JSON.parse(mParams.result)
    }
    return holidays.map(o => AC.dateService.shiftDate(o))
  })
}

function getCalendarChanges (dateFrom, dateTo, orgID) {
  return UB.Repository('hr_calendarChange')
    .attrs(['changeDateTo'])
    .where('changeDateFrom', '>=', dateFrom, 'changeDateFromGt')
    .where('changeDateFrom', '<=', dateTo, 'changeDateFromLt')
    .where('changeDateTo', '>=', dateTo, 'changeDateToGt')
    .where('changeDateTo', '<=', dateTo, 'changeDateToLt')
    // condition by orgID {
    .where('excludeOrg', '=', 0, 'excOrg')
    .where('excludeOrg', '=', 1, 'inexcOrg')
    .exists(UB.Repository('hr_calendarChangeDt')
      .correlation('calendarChangeID', 'ID')
      .where('orgID', '=', orgID)
      .where('mi_deleteDate', '>=', '#maxdate'),
    'org'
    ).notExists(UB.Repository('hr_calendarChangeDt')
      .correlation('calendarChangeID', 'ID')
      .where('mi_deleteDate', '>=', '#maxdate'),
    'notOrg')
    .notExists(UB.Repository('hr_calendarChangeDt')
      .correlation('calendarChangeID', 'ID')
      .where('orgID', '=', orgID)
      .where('mi_deleteDate', '>=', '#maxdate'),
    'inorg'
    )
    // condition by orgID }
    .logic('(([changeDateFromGt] AND [changeDateFromLt]) OR ([changeDateToGt] AND [changeDateToLt]))' +
    ' AND (([org] AND [excOrg]) OR ([notOrg]) OR ([inorg] AND [inexcOrg]))' // condition by orgID
    )
    .selectAsObject()
}

function isWorkingDay (date) {
  const dayOfWeek = date.getDay()
  return dayOfWeek >= 1 && dayOfWeek <= 5
}

function checkRankValue (me, field, checkNext) {
  const isRankAssign = (me.attr && me.attr.isRankAssign) ? me.attr.isRankAssign.getValue() : true
  if (!me.curRankCode || !isRankAssign) return Promise.resolve(true)
  const rankCode = parseInt(field.getFieldValue('code'))
  if (me.curRankCode === 1) {
    AC.viewUtils.showToast(UB.i18n('Помилка'), UB.i18n('Ранг працівника є найвищим'))
    field.markInvalid(UB.i18n('Ранг працівника є найвищим'))
    return Promise.resolve(false)
  }
  if (rankCode > me.curRankCode) {
    AC.viewUtils.showToast(UB.i18n('Помилка'), UB.i18n('Обраний ранг є нижчим за актуальний ранг працівника'))
    field.markInvalid(UB.i18n('Обраний ранг є нижчим за актуальний ранг працівника'))
    return Promise.resolve(false)
  }
  if (rankCode === me.curRankCode) {
    AC.viewUtils.showToast(UB.i18n('Помилка'), UB.i18n('Обраний ранг відповідає актуальному рангу працівника'))
    field.markInvalid(UB.i18n('Обраний ранг відповідає актуальному рангу працівника'))
    return Promise.resolve(false)
  }
  if (checkNext && rankCode < (me.curRankCode - 1)) {
    return $App.dialogYesNo(UB.i18n('Увага'), UB.i18n('Обраний ранг не є наступним для актуального рангу працівника. Продовжити?'))
  } else {
    return Promise.resolve(true)
  }
}

function checkRankPsCategory (psCategory, rank) {
  return psCategory ? UB.Repository('hr_dictRankPsCategory')
    .attrs(['ID'])
    .where('psCategory', '=', psCategory)
    .where('dictRankID.code', '=', rank)
    .selectSingle().then((data) => {
      if (data === undefined) {
        return $App.dialogYesNo(UB.i18n('Попередження'), UB.i18n('Обраний ранг не відповідає категорії посади держслужбовця. Продовжити?'))
      } else {
        return Promise.resolve(true)
      }
    }) : Promise.resolve(true)
}

function getDetailEntityName (empOrderType, entityName = 'hr_empOrder', tail = 'Det') {
  let resEmpOrderType = ''
  let resEmpOrderType0 = ''
  empOrderType.toLowerCase().split('_').forEach((str, index) => {
    const strPart = str.charAt(0).toUpperCase() + str.slice(1)
    resEmpOrderType += strPart
    if (index === 0) {
      resEmpOrderType0 = strPart
    }
  })
  let result = entityName + resEmpOrderType + tail
  if (!$App.domainInfo.entities[result]) {
    result = entityName + resEmpOrderType0 + tail
  }
  return result
}

/**
 * функція вибору працівників для наказів
 * @param {array} selected - масив з employeePositionID вже обраних працівників
 * @param {string} field - поле, яке потрібно повернути
 * @param {array} department - масив з переданого списку підрозділів [{ value: ..., description: ... }, ... ]
 * @param {array} workPlace - масив з переданого списку значень [{ value: ..., description: ... }, ... ]
 * @param {array} position - масив з переданого списку значень [{ value: ..., description: ... }, ... ]
 * @param {array} positionType - масив з переданого списку значень [{ value: ..., description: ... }, ... ]
 * @param {array} dictStaffCat - масив з переданого списку значень [{ value: ..., description: ... }, ... ]
 * @param {array} contractType - масив з переданого списку значень [{ value: ..., description: ... }, ... ]
 * @param {string} field - поле для пошуку вже обраних працівників, можливі значення [employeePositionID, employeeNumberID]
 * @param {number} orgID - ID організації, якщо не вказано, то глобальна організація
 * @param {date} onDate - дата на яку потрібно вибирати працівників, якщо не вказано, то глобальна дата
 * @param {number} entityID - ID сутності для зберігання параметрів пошуку
 * @param {object} sender - посилання на форму
 * @param {date} dateFrom
 * @param {date} dateTo
 * @param {boolean} uniqueEmployeeNumbers - тільки унікальні таб номери по останній даті призначення
 * @param {boolean} employeeLimitedAccess
 * @param {function} onSelectData - callback функція для отримання обраних записів,
 *                                  передаються два значення:
 *                                    data - масив вибраних записів
 *                                    isDeleteExisting - значення чеккеру "Видалити завантажені"
 */
function empOrderEmployeeSearch ({
  selected = [],
  field = 'employeePositionID',
  orgID,
  onDate,
  entityID,
  sender = null,
  department = [],
  workPlace = [],
  position = [],
  positionType = [],
  dictStaffCat = [],
  contractType = [],
  onSelectData,
  dateFrom,
  dateTo,
  uniqueEmployeeNumbers = false,
  employeeLimitedAccess = false
}) {
  $App.doCommand({
    cmdType: 'showForm',
    formCode: 'hr_empOrderEmployeeSearch',
    sender,
    cmpInitConfig: {
      selected,
      field,
      orgID,
      onDate,
      onSelectData,
      entityID,
      department,
      workPlace,
      position,
      positionType,
      dictStaffCat,
      contractType,
      dateFrom,
      dateTo,
      uniqueEmployeeNumbers,
      employeeLimitedAccess
    }
  })
}

function setOrderRegistryActions (me) {
  if (!me.orderConfig) {
    setOrderConfig(me)
  }
  if (!me.isNewInstance && me.record.get(me.orderConfig.stateAttrName) === 'PROJECT') {
    if (me.record.get('hasPosted')) {
      me.setActionDisabled('cancelPostingAction', false)
    }
    if (!me.record.get('hasProject')) {
      me.setActionDisabled('postingAction', false)
    }
  }
}

function setSourceOrderDescription (me, attrName = 'empOrderID', orderDescription = 'orderDescription') {
  if (me.record.get(attrName) && me.record.get(`${attrName}.description`) && me.attr[orderDescription]) {
    me.attr[orderDescription].setVisible(true)
    me.attr[orderDescription].setReadOnly(true)
    me.attr[orderDescription].setValue(me.record.get(`${attrName}.description`))
    me.attr[orderDescription].inputEl.on('click', function () {
      UB.Repository('hr_order')
        .attrs(['ID', 'orderClass.entityName'])
        .selectById(me.record.get(attrName))
        .then(result => {
          const formCode = result && result['orderClass.entityName']
          const formStore = UB.core.UBStoreManager.getFormStore()
          if (formStore.findRecord('code', formCode, 0, false, true, true)) {
            $App.doCommand({
              cmdType: 'showForm',
              formCode: formCode,
              entity: result['orderClass.entityName'],
              instanceID: me.record.get(attrName) || 0,
              tabId: result['orderClass.entityName'] + (me.record.get(attrName) || 0),
              target: $App.getViewport().centralPanel
            })
          }
        })
    }, me)
  }
}

function orderRegistryInit (me) {
  const tb = me.attr.orderRegistryDt.down('toolbar')
  tb.insert(3,
    Ext.create('Ext.Button', {
      cls: 'add-new-action',
      scale: 'medium',
      iconCls: 'iconApprove',
      tooltip: UB.i18n('Провести вибрані документи'),
      hidden: !AC.entityUtils.verifyRightsMethod(me.entityName, 'doPosting'),
      handler: function () {
        const docRegIDs = getSelectedOrderRegistry(me, false, 'PROJECT')
        if (!docRegIDs.length) {
          return
        }
        const errors = []
        me.saveForm()
          .then(function (result) {
            if (result !== -1) {
              $App.dialogYesNo(UB.i18n('Попередження'), UB.i18n('Провести вибрані документи?'))
                .then(function (choice) {
                  if (choice) {
                    if (me.beforeOrderRegistryPostingSelected) {
                      me.beforeOrderRegistryPostingSelected(me, docRegIDs).then(({ postingDocRegIDs, errorMessages }) => {
                        if (errorMessages && errorMessages.length) {
                          $App.dialogError(errorMessages.join('<br/>'), UB.i18n('Увага!'))
                          return
                        }
                        if (postingDocRegIDs && postingDocRegIDs.length) {
                          me.setLoading(true)
                          orderRegistryPostingSelected(me, postingDocRegIDs, 0, errors)
                        }
                      })
                    } else {
                      me.setLoading(true)
                      orderRegistryPostingSelected(me, docRegIDs, 0, errors)
                    }
                  }
                })
            }
          })
      }
    })
  )
  tb.insert(4,
    Ext.create('Ext.Button', {
      cls: 'red-action',
      scale: 'medium',
      iconCls: 'iconReject',
      tooltip: UB.i18n('Відмінити проведення вибраних документів'),
      hidden: !AC.entityUtils.verifyRightsMethod(me.entityName, 'doCancelPosting'),
      handler: function () {
        const docRegIDs = getSelectedOrderRegistry(me, true, 'POSTED')
        if (!docRegIDs.length) {
          return
        }
        const errors = []
        me.saveForm()
          .then(function (result) {
            if (result !== -1) {
              $App.dialogYesNo(UB.i18n('Попередження'), UB.i18n('Відмінити проведення вибраних документів?'))
                .then(function (choice) {
                  if (choice) {
                    if (me.beforeOrderRegistryCancelPostingSelected) {
                      me.beforeOrderRegistryCancelPostingSelected(me, docRegIDs).then(({ postingDocRegIDs, errorMessages }) => {
                        if (errorMessages && errorMessages.length) {
                          $App.dialogError(errorMessages.join('<br/>'), UB.i18n('Увага!'))
                          return
                        }
                        if (postingDocRegIDs && postingDocRegIDs.length) {
                          me.setLoading(true)
                          orderRegistryCancelPostingSelected(me, postingDocRegIDs, 0, errors)
                        }
                      })
                    } else {
                      me.setLoading(true)
                      orderRegistryCancelPostingSelected(me, docRegIDs, 0, errors)
                    }
                  }
                })
            }
          })
      }
    })
  )
  const store = me.attr.orderRegistryDt.getStore()
  store.on('load', function () {
    const el = me.attr.orderRegistryDt.columns[0].el
    el.removeCls(Ext.baseCSSPrefix + 'grid-hd-checker-on')
  }, me)
  me.customCancelPosting = doCancelPostingOrderRegistry
  me.customPosting = doPostingOrderRegistry
}

function orderRegistryPostingSelected (me, docRegIDs, idx, errors) {
  me.setLoading(true)
  if (idx < docRegIDs.length) {
    $App.connection.run({
      entity: 'hr_orderRegistry',
      method: 'doPostingDocReg',
      execParams: {
        ID: me.instanceID,
        docRegID: docRegIDs[idx]
      }
    }).then(() => {
      orderRegistryPostingSelected(me, docRegIDs, ++idx, errors)
    }).catch((err) => {
      if (err.message.indexOf('HTTP Error 500 - Internal Server Error') < 0) {
        errors.push(err.message)
      }
      orderRegistryPostingSelected(me, docRegIDs, ++idx, errors)
    })
  } else {
    me.setLoading(false)
    me.onRefresh()
    if (errors.length) {
      $App.dialogError(errors.join('<br/>'), UB.i18n('Увага!'))
    }
  }
}

function orderRegistryCancelPostingSelected (me, docRegIDs, idx, errors) {
  me.setLoading(true)
  if (idx < docRegIDs.length) {
    $App.connection.run({
      entity: 'hr_orderRegistry',
      method: 'cancelPostingDocReg',
      execParams: {
        ID: me.instanceID,
        docRegID: docRegIDs[idx]
      }
    }).then(() => {
      orderRegistryCancelPostingSelected(me, docRegIDs, ++idx, errors)
    }).catch((err) => {
      if (err.message.indexOf('HTTP Error 500 - Internal Server Error') < 0) {
        errors.push(err.message)
      }
      orderRegistryCancelPostingSelected(me, docRegIDs, ++idx, errors)
    })
  } else {
    me.setLoading(false)
    me.onRefresh()
    if (errors.length) {
      $App.dialogError(errors.join('<br/>'), UB.i18n('Увага!'))
    }
  }
}

function doCancelPostingOrderRegistry (me) {
  const errors = []
  me.saveForm()
    .then(function (result) {
      if (result !== -1) {
        $App.dialogYesNo(UB.i18n('Попередження'), UB.i18n('Відмінити проведення документу?'))
          .then(function (choice) {
            if (choice) {
              UB.Repository('hr_orderRegistryDt')
                .attrs('orderID')
                .where('orderRegistryID', '=', me.instanceID)
                .where('orderID.orderState', '=', 'POSTED')
                .orderBy('employeeNumberID')
                .orderBy('dateFrom', 'desc')
                .selectAsObject().then(data => {
                  const docRegIDs = uniqListOfIDs(data.map(o => o.orderID), true)
                  if (docRegIDs.length) {
                    if (me.beforeOrderRegistryCancelPostingSelected) {
                      me.beforeOrderRegistryCancelPostingSelected(me, docRegIDs).then(({ postingDocRegIDs, errorMessages }) => {
                        if (errorMessages && errorMessages.length) {
                          $App.dialogError(errorMessages.join('<br/>'), UB.i18n('Увага!'))
                          return
                        }
                        if (postingDocRegIDs && postingDocRegIDs.length) {
                          me.setLoading(true)
                          orderRegistryCancelPostingSelected(me, postingDocRegIDs, 0, errors)
                        }
                      })
                    } else {
                      me.setLoading(true)
                      orderRegistryCancelPostingSelected(me, docRegIDs, 0, errors)
                    }
                  }
                })
            }
          })
      }
    })
}

function doPostingOrderRegistry (me) {
  const errors = []
  me.saveForm()
    .then(function (result) {
      if (result !== -1) {
        $App.dialogYesNo(UB.i18n('Попередження'), UB.i18n('Провести документ?'))
          .then(function (choice) {
            if (choice) {
              UB.Repository('hr_orderRegistryDt')
                .attrs('orderID')
                .where('orderRegistryID', '=', me.instanceID)
                .where('orderID.orderState', '=', 'PROJECT')
                .orderBy('employeeNumberID')
                .orderBy('dateFrom', 'asc')
                .selectAsObject().then(data => {
                  const docRegIDs = uniqListOfIDs(data.map(o => o.orderID))
                  if (docRegIDs.length) {
                    if (me.beforeOrderRegistryPostingSelected) {
                      me.beforeOrderRegistryPostingSelected(me, docRegIDs).then(({ postingDocRegIDs, errorMessages }) => {
                        if (errorMessages && errorMessages.length) {
                          $App.dialogError(errorMessages.join('<br/>'), UB.i18n('Увага!'))
                          return
                        }
                        if (postingDocRegIDs && postingDocRegIDs.length) {
                          me.setLoading(true)
                          orderRegistryPostingSelected(me, postingDocRegIDs, 0, errors)
                        }
                      })
                    } else {
                      me.setLoading(true)
                      orderRegistryPostingSelected(me, docRegIDs, 0, errors)
                    }
                  }
                })
            }
          })
      }
    })
}

function checkBoxColumnConfig () {
  return {
    xtype: 'checkcolumn',
    text: '&#160;',
    tooltip: '',
    cls: Ext.baseCSSPrefix + 'column-header-checkbox custom-header-checkbox ',
    filterable: false,
    sortable: false,
    draggable: false,
    hideable: false,
    menuDisabled: true,
    width: 40,
    listeners: {
      headerclick: function (ct, header) {
        const isChecked = header.el.hasCls(Ext.baseCSSPrefix + 'grid-hd-checker-on')
        header.el.toggleCls(Ext.baseCSSPrefix + 'grid-hd-checker-on')
        ct.grid.getStore().data.items.forEach(item => item.set('checked', !isChecked))
      }
    }
  }
}

function getSelectedOrderRegistry (me, byDesc, orderState) {
  const selected = []
  me.attr.orderRegistryDt.getStore().data.items.forEach(item => {
    if (item.get('checked') && item.get('orderID.orderState') === orderState) {
      const orderID = item.get('orderID')
      if (!selected.find(o => o.ID === orderID)) {
        selected.push({
          ID: orderID,
          employeeNumberID: item.get('employeeNumberID'),
          dateFrom: AC.dateService.shiftDate(item.get('dateFrom'))
        })
      }
    }
  })
  selected.sort((a, b) => {
    if (a.employeeNumberID > b.employeeNumberID) return 1
    else if (a.employeeNumberID < b.employeeNumberID) return -1
    return byDesc ? b.dateFrom - a.dateFrom : a.dateFrom - b.dateFrom
  })
  return selected.map(o => o.ID)
}

function uniqListOfIDs (IDs) {
  return _.uniq(IDs) // .sort((a, b) => byDesc ? b - a : a - b)
}

function findOrderAttrConfig (orderConfig, dictStaffCatID, positionType) {
  return orderConfig.find(o => o.dictStaffCatID && o.dictStaffCatID === dictStaffCatID) ||
    orderConfig.find(o => o.positionType && o.positionType === positionType) ||
    orderConfig.find(o => o.positionType === null && o.dictStaffCatID === null) || null
}

function loadOrderAttrConfig (empOrderType, organizationID) {
  return UB.Repository('hr_empOrderDetConfig')
    .attrs(['empOrderType', 'positionType', 'dictStaffCatID', 'dictTimeCostID', 'dictTimeCostID.description',
      'canEditDictTimeCost', 'canEditPayElAccrual', 'canEditPayElMain', 'canEditPayElAdd', 'canEditPayElReplacement',
      'payElIDAccrual', 'payElIDMain', 'payElIDAdd', 'payElIDReplacement', 'payElIDAccrual.description',
      'payElIDMain.description', 'payElIDAdd.description', 'payElIDReplacement.description',
      'dictTimeCost2ID', 'dictTimeCost2ID.description', 'canEditDictTimeCost2'
    ])
    .whereIf(Array.isArray(empOrderType), 'empOrderType', 'in', empOrderType)
    .whereIf(!Array.isArray(empOrderType), 'empOrderType', '=', (empOrderType === 'MISSION' ? 'MISSION_G' : empOrderType) || null)
    .where('organizationID', '=', organizationID || appAC.globalOrganization())
    .selectAsObject()
}

async function getIntComb (me) {
  const onDate = me.record.get('dateFrom')
  let openTabNum = await UB.Repository('hr_employeeNumberS')
    .attrs(['ID'])
    .where('employeeID', '=', me.record.get('employeeID'))
    .where('orgID', '=', me.record.get('organizationID'))
    .where('ID', '!=', me.attr.employeePositionID.getFieldValue('employeeNumberID'))
    .where('dateFrom', '<=', onDate)
    .where('dateTo', '=', '#maxdate')
    .selectAsObject()
  switch (me.entityName) {
    case 'hr_empOrderMilserviceretDet':
      let existMilserviceDet = await UB.Repository('hr_empOrderMilserviceDet')
        .attrs(['ID', 'employeeNumberID'])
        .where('empOrderType', '=', 'MILSERVICE')
        .where('dateFrom', '<=', onDate)
        .where('dateTo', '>=', AC.dateService.addDays(onDate, -1), 'exp1')
        .where('dateTo', 'isNull', undefined, 'exp2')
        .logic('(([exp1]) or ([exp2]))')
        .where('orderID.orderState', '=', 'POSTED', 'orderStatePOSTED')
        .where('orderID.orderState', '=', 'PROCESSED', 'orderStatePROCESSED')
        .where('mi_deleteDate', '>=', '#maxdate')
        .logic('([orderStatePOSTED] OR [orderStatePROCESSED])')
        .selectAsObject()
      openTabNum = openTabNum.filter(el => existMilserviceDet.find(o => o.employeeNumberID === el.ID))
      break
  }

  return Promise.all(
    openTabNum.map(item => {
      return UB.Repository('hr_employeePositionS')
        .attrs(['ID', 'employeeNumberID', 'dateFrom', 'dateTo', 'employeeNumberID.dateTo', 'description'])
        .where('employeeNumberID', 'in', item.ID)
        .where('workPlace', '=', '2')
        .where('positionID', 'isNotNull')
        .orderBy('dateTo', 'desc')
        .selectSingle()
    })
  ).then(secJobsPositions => {
    return secJobsPositions.filter(el => el)
  })
}

async function checkIntCombVac (me) {
  const onDate = me.record.get('dateFrom')
  const openTabNum = await UB.Repository('hr_employeeNumberS')
    .attrs(['ID'])
    .where('employeeID', '=', me.record.get('employeeID'))
    .where('orgID', '=', me.record.get('organizationID'))
    .where('ID', '!=', me.attr.employeePositionID.getFieldValue('employeeNumberID'))
    .where('dateFrom', '<=', onDate)
    .where('dateTo', '=', '#maxdate')
    .selectAsObject()
  return Promise.all(
    openTabNum.map(item => {
      return UB.Repository('hr_employeePositionS')
        .attrs(['ID', 'employeeNumberID', 'dateFrom', 'dateTo', 'employeeNumberID.dateTo', 'description'])
        .where('employeeNumberID', 'in', item.ID)
        .where('workPlace', '=', '2')
        .where('positionID', 'isNotNull')
        .orderBy('dateTo', 'desc')
        .selectSingle()
    })
  ).then(secJobsPositions => {
    const messages = []
    secJobsPositions.forEach(item => {
      if (item) {
        const dateFrom = AC.dateService.shiftDate(item.dateFrom)
        const dateTo = AC.dateService.shiftDate(item.dateTo)
        const empNumDateTo = AC.dateService.shiftDate(item['employeeNumberID.dateTo'])
        if (dateTo < me.attr.dateFrom.getValue() && AC.dateService.isMaxDate(empNumDateTo)) {
          messages.push(UB.i18n(`У працівника {0} існує закрите призначення з {1} по {2}.`, item.description, AC.dateService.formatDate(dateFrom), AC.dateService.formatDate(dateTo)))
        }
      }
    })
    return messages.length ? $App.dialogYesNo('Увага', messages.join('<br/>') + ` ${UB.i18n('Бажаєте надати відпустку за даними призначеннями?')}`) : true
  })
}

function findMasterRecord (me, grid, fieldName = 'employeePositionID') {
  if (!me.sender) return
  const masterRecord = AC.gridUtils.getCurrentRecord(me.sender)

  function findInStore (store) {
    const pageCount = Math.ceil(store.getTotalCount() / store.pageSize)
    const idx = store.find(fieldName, masterRecord.get(fieldName))
    if (idx < 0 && store.getCount() > 0 && (pageCount <= 0 || store.currentPage < pageCount)) store.nextPage()
    else {
      grid.getSelectionModel().select(store.getAt(idx))
      grid.store.un('load', findInStore)
    }
  }

  if (masterRecord) {
    grid.store.on('load', findInStore)
    grid.store.load()
  }
}

function isUserOrdersSubordinate () {
  const roles = $App.connection.userData().roles.toUpperCase().split(',') || []
  const isAdmin = roles.includes('ADMIN')
  return !isAdmin && !AC.entityUtils.verifyRightsMethod('hr_empOrder', 'canEditOrdersMainOrg') && AC.entityUtils.verifyRightsMethod('hr_empOrder', 'canEditOrdersSubordinate')
}

function isUserOrdersMainOrg () {
  const roles = $App.connection.userData().roles.toUpperCase().split(',') || []
  const isAdmin = roles.includes('ADMIN')
  return !isAdmin && AC.entityUtils.verifyRightsMethod('hr_empOrder', 'canEditOrdersMainOrg') && !AC.entityUtils.verifyRightsMethod('hr_empOrder', 'canEditOrdersSubordinate')
}

function setMasterOrgFilter (grid) {
  const ubRequest = grid.getStore().ubRequest
  if (isUserOrdersSubordinate()) {
    ubRequest.whereList.masterOrg = {
      expression: '[masterOrganizationID] <> [organizationID]',
      condition: 'custom'
    }
  } else if (isUserOrdersMainOrg()) {
    ubRequest.whereList.masterOrg = {
      expression: '[masterOrganizationID] = [organizationID]',
      condition: 'custom'
    }
  }
}

function getOrderRegistryDeleteAction (grid, entityName) {
  return {
    text: UB.i18n('Видалити'),
    scale: 'medium',
    iconCls: 'far fa-trash-alt',
    ubID: 'itemDeleteOrder',
    cls: 'delete-action',
    handler: () => {
      let reco = AC.gridUtils.getCurrentRecord(grid)
      if (reco && reco.get('orderID')) {
        $App.connection.run({
          entity: entityName || reco.get('orderID.orderClass.entityName'),
          method: 'delete',
          execParams: {
            ID: reco.get('orderID')
          }
        }).then(() => {
          grid.onRefresh()
        })
      }
    }
  }
}
function getOrderRegistryDimensionAction () {
  return {
    text: UB.i18n('Аналітика'),
    iconCls: 'el-icon-notebook-2',
    name: 'dimension',
    cls: 'blue-action',
    handler: (context) => {
      const me = context.up('').grid.up('form')
      let record = context.up('').record || AC.gridUtils.getCurrentRecord(me.attr.orderRegistryDt)
      if (record) {
        const accrualDt = record.get('accrualDt')
        if (accrualDt) {
          $App.connection.run({
            entity: 'hr_rl',
            method: 'getDimension',
            params: accrualDt,
            orgID: me.record.get('organizationID')
          }).then(response => {
            const data = JSON.parse(response.resultData)
            $App.doCommand({
              cmdType: 'showForm',
              formCode: 'hr_rlDimension',
              isModal: true,
              cmpInitConfig: {
                defaultValues: data,
                typeData: 'orderRegistryDt'
              }
            })
          })
        }
      }
    }
  }
}

function getOrderRegistryRlAction (grid) {
  return {
    text: UB.i18n('Розрахунковий лист'),
    iconCls: 'el-icon-tickets',
    ubID: 'itemShowRl',
    name: 'itemShowRl',
    handler: function (context) {
      const record = grid ? AC.gridUtils.getCurrentRecord(grid) : context.up('').record
      if (record) {
        $App.doCommand({
          cmdType: 'showForm',
          formCode: 'hr_rl',
          entity: 'hr_rl',
          cmpInitConfig: {
            defaultValues: {
              employeeNumberID: record.get('employeeNumberID')
            }
          },
          tabId: `hr_rl${record.get('employeeNumberID')}`,
          target: $App.getViewport().centralPanel
        })
      }
    }
  }
}

function getOrderRegistryEmployeeAction (grid) {
  return {
    text: UB.i18n('Особовий рахунок'),
    iconCls: 'el-icon-s-custom',
    ubID: 'itemShowEmployee',
    handler: function (context) {
      const record = grid ? AC.gridUtils.getCurrentRecord(grid) : context.up('').record
      if (record) {
        $App.doCommand({
          cmdType: 'showForm',
          formCode: 'hr_employeeNumber',
          entity: 'hr_employeeNumber',
          instanceID: record.get('employeeNumberID'),
          tabId: `hr_employeeNumber-${record.get('employeeNumberID')}`,
          target: $App.getViewport().centralPanel
        })
      }
    }
  }
}

async function calcTarifAccrualSum (me, dictTarifCoeffID, skipCalc) {
  const data = await UB.Repository('hr_dictTarifCoeffDet')
    .attrs(['accrualSum'])
    .where('dictTarifCoeffID', '=', dictTarifCoeffID)
    .where('dateFrom', '<=', me.record.get('dateFrom') || (me.masterForm && me.masterForm.record.get('orderDate')) || appAC.globalApplicationDate())
    .where('dateTo', '>=', me.record.get('dateFrom') || (me.masterForm && me.masterForm.record.get('orderDate')) || appAC.globalApplicationDate())
    .selectSingle()
  if (data && data.accrualSum) {
    const el = me.down('[ubID=accrualLabel]')
    if (el) {
      const labelText = UB.i18n('Сума тарифного окладу: {0}', AC.currencyService.formatAsCurrencyEx(data.accrualSum))
      el.setText(labelText)
    }
    const setAccrualByPosition = AC.settings.get('hrOrderSetAccrualByPosition', appAC.globalOrganization())
    if (skipCalc || setAccrualByPosition !== false) return
    const store = me.down('[name=hr_empOrderAcc]').getStore()
    await store.load()
    let addSum = 0
    if (store.data && store.data.length) {
      addSum = store.data.items.reduce((sum, row) => {
        if (row.get('payElID.methodID.code') === '144') {
          sum += (row.get('accrualRate') ? AC.currencyService.round(data.accrualSum * row.get('accrualRate') / 100) : row.get('accrualSum')) || 0
        }
        return sum
      }, 0)
    }
    me.record.set('accrualSum', AC.currencyService.round(data.accrualSum + addSum))
  }
}

function loadOrderFundSource (me, positionID, isClear, gridName) {
  if (!gridName) gridName = 'positionFundSourceDt'
  const isFundSourceAccounting = AC.settings.get('hrFundSourceAccounting', appAC.globalOrganization())
  if (isFundSourceAccounting === 'STAFF') {
    $App.connection.run({
      entity: 'hr_empOrderFundSource',
      method: 'getOrderFundSourceData',
      paraID: me.instanceID,
      isClear: isClear,
      positionID: positionID || me.record.get('positionID'),
      onDate: me.record.get('dateFrom') || appAC.globalApplicationDate()
    }).then(({ result }) => {
      const data = JSON.parse(result)
      me.attr[gridName].setLocalStoreData(data)
    })
  } else if (isFundSourceAccounting === 'ORDER') {
    UB.Repository('hr_empOrderFundSource')
      .attrs(['ID', 'dictFundSourceID', 'dictFundSourceID.description', 'mtCount', 'dictFundSourceID.mi_deleteUser'])
      .where('paraID', '=', me.instanceID)
      .selectAsObject()
      .then(data => {
        me.attr[gridName].setLocalStoreData(data)
      })
  } else {
    me.attr[gridName].setLocalStoreData([])
  }
}

async function checkOrderFundSource (me, grid) {
  const isFundSourceAccounting = AC.settings.get('hrFundSourceAccounting', appAC.globalOrganization())
  if (!isFundSourceAccounting || me.isFundSourceAccounting === 'WITHOUT') {
    return true
  }
  const data = grid.getData()
  const quantityTotal = AC.currencyService.round(data.reduce((sum, item) => {
    return sum + AC.currencyService.round(item.mtCount)
  }, 0))
  if (data.length && quantityTotal !== me.record.get('mtCount')) {
    await $App.dialogError(UB.i18n('Загальна кількість посад не дорівнює кількості посад по джерелам фінансування!'))
    return false
  }
  if (isFundSourceAccounting === 'STAFF') {
    const fs = data.find(o => o.posVac < o.mtCount)
    if (fs) {
      const delta = (fs.mtCount || 0) - (fs.posVac || 0)
      const isAgree = await $App.dialogYesNo('Попередження', UB.i18n('Увага, кількість ставок посади по джерелу фінансування {0} перевищена на {1}. Продовжити?', fs['dictFundSourceID.description'], AC.currencyService.roundFixed(delta)))
      return isAgree
    }
  }
  return true
}

async function checkEmpOrderAccDateFrom (me, grid) {
  if (!grid) {
    grid = me.down('[name=hr_empOrderAcc]')
  }
  const store = grid.getStore()
  store.ubRequest.currTime = Date.now()
  await store.load()
  if (store.data.items.length && store.data.items.some(el => AC.dateService.formatDate4Sql(el.get('dateFrom')) !== AC.dateService.formatDate4Sql(me.record.get('dateFrom')))) {
    const isAgree = await $App.dialogYesNo('Попередження', UB.i18n(`В Нарахуваннях дата початку дії не співпадає з "Датою початку" призначення. Замінити дату початку дії нарахуваннь?`))
    if (isAgree) {
      await $App.connection.run({
        entity: 'hr_empOrderAcc',
        method: 'replaceDateFrom',
        execParams: {
          empOrderDetID: me.instanceID,
          dateFrom: me.record.get('dateFrom')
        }
      })
    }
  }
}

function setMultiOrderButton (me, idx, callBackFn) {
  const tb = me.down('toolbar')
  tb && tb.insert(idx,
    Ext.create('Ext.Button', {
      ubID: 'addOrderMulti',
      xtype: 'button',
      text: `<span style="color: red">${UB.i18n('Створити для всіх організацій')}</span>`,
      iconCls: 'u-icon-create-version',
      cls: 'red-action',
      hidden: true,
      handler: function () {
        $App.dialogYesNo(UB.i18n('Увага'), UB.i18n('Створити накази для всіх організацій працівника?')).then(result => {
          if (result) {
            HR.controlService.checkAndSaveForm(me, callBackFn)
          }
        })
      }
    })
  )
}

function checkMultiOrgActionState (me, dateFrom) {
  const btn = me.down('[ubID=addOrderMulti]')
  if (me.record.get('employeePositionID') && (dateFrom || me.record.get('dateFrom'))) {
    UB.Repository('hr_employeePositionS')
      .attrs('ID', 'organizationID', 'departmentID', 'positionID', 'employeeNumberID', 'description')
      .where('employeeID', '=', me.attr.employeePositionID.getFieldValue('employeeID'))
      .where('organizationID', '!=', me.record.get('organizationID') || me.masterForm.record.get('organizationID') || appAC.globalOrganization())
      .where('dateFrom', '<=', dateFrom || me.record.get('dateFrom'))
      .where('dateTo', '>=', dateFrom || me.record.get('dateFrom'))
      .limit(1)
      .selectSingle().then(row => {
        btn && btn.setVisible(!!row)
      })
  } else {
    btn && btn.setVisible(false)
  }
}

async function offerToCorrectSeveralPublServRang (me, employeeID, allRankMustClosed = false) {
  const limit = allRankMustClosed ? 0 : 1
  const ranks = await UB.Repository('hr_publServRang')
    .attrs(['ID'])
    .where('[employeeID]', '=', employeeID)
    .where('[dateTo]', '>=', '#maxdate')
    .where('[mi_deleteDate]', '>=', '#maxdate')
    .selectAsObject()

  if (ranks.length > limit) {
    await $App.dialogInfo(UB.i18n('Працівник має декілька активних записів про присвоєння рангу державного службовця. Для збереження пункту наказу необхідно спочатку закрити зайві записи, зазначивши коректну дату закінчення дії.'))
    await $App.doCommand({
      cmdType: 'showList',
      cmdData: {
        params: [{
          entity: 'hr_publServRang',
          method: 'select',
          fieldList: [
            { name: 'employeeID', visibility: false },
            { name: 'dictRankID.name', description: UB.i18n('Ранг') },
            { name: 'dateFrom' },
            { name: 'dateToEmpty' },
            { name: 'dateNext' },
            { name: 'orderNumber' },
            { name: 'orderDate' }
          ],
          whereList: {
            emp: {
              expression: '[employeeID]',
              condition: 'equal',
              value: employeeID
            },
            nodeleted: {
              expression: '[mi_deleteDate]',
              condition: '>=',
              value: '#maxdate'
            }
          }
        }]
      },
      cmpInitConfig: {
        hideActions: ['addNew', 'del']
      }
    })
    return false
  } else {
    return true
  }
}
