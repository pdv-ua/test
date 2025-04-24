/* global UB AC appAC $App Ext _ HR */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onFormDataReady,
  filterFields,
  setVacationDays,
  setVacationDateTo,
  addBaseActions,
  formPrintDocument,
  getReportName,
  onBeforeSave,
  makeOrderReason,
  refreshOrderData
}

function initComponentStart () {
  const me = this
  me.on('formDataReady', onFormDataReady, me)
  me.on('controlChanged', onControlChanged, me)
  me.orderActions = {
    actions: ['fDelete', 'startReconciliation', 'stopReconciliation', 'toCompletion', 'renewTask'],
    state: {
      PROJECT: {
        action: ['fDelete', 'startReconciliation']
      },
      ON_RECONCILATION: {
        action: ['stopReconciliation']
      },
      REJECTED: {
        action: ['fDelete', 'startReconciliation']
      },
      RECONCILED: {
        action: []
      },
      RETURNED_FROM_RECONCILATION: {
        action: ['toCompletion', 'renewTask']
      },
      ON_COMPLETION: {
        action: ['fDelete', 'startReconciliation']
      },
      NEW: {
        action: ['fDelete', 'startReconciliation', 'stopReconciliation', 'toCompletion', 'renewTask']
      },
      POSTED: {
        action: []
      },
      PROCESSED: {
        action: []
      },
      SENDED: {
        action: ['agreedAction', 'rejectAction', 'startReconciliation', 'stopReconciliation', 'fDelete']
      },
      AGREED: {
        action: ['rejectAction']
      },
      COMPLITED: {
        action: ['fDelete', 'startReconciliation']
      }
    }
  }
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
  createActions(me)
  me.pdfSigned = false
}

/**
 * @event onFormDataReady
 * Fires when data bonded and all form required data loaded (combobox data, details data e.t.c.)
 */
function onFormDataReady () {
  const me = this
  if (me.isNewInstance) {
    if (!me.record.get('organizationID')) {
      me.record.set('organizationID', appAC.globalOrganization())
    }
    if (!me.record.get('requestDate')) {
      me.record.set('requestDate', AC.dateService.todayDate())
    }
  } else {
    me.attr.requestType.setReadOnly(true)
  }
  const readOnly = ['ON_RECONCILATION', 'RECONCILED', 'POSTED'].includes(me.record.get('orderState')) || me.record.get('requestState') === 'COMPLITED'
  me.attr.attachment.setReadOnly(readOnly)
  filterFields(me.record.get('requestType'), me)
  createOrderActionCheckVisible(me)
  HR.orderManager.changeAction(me)
  changeActionByRequestState(me)
  checkDocumentSignature(me)
  AC.viewUtils.setWhereListProperty(me.attr.orderID, [
    ['organizationID', '=', appAC.globalOrganization()]
  ])
}

function changeActionByRequestState (me) {
  const stateActions = ['agreedAction', 'rejectAction', 'fDelete']
  if (me.isNewInstance) {
    stateActions.forEach(act => {
      me.setActionDisabled(act, true)
    })
  } else {
    stateActions.forEach(act => {
      me.setActionDisabled(act, !(me.orderActions.state[me.record.get('requestState')] && _.includes(me.orderActions.state[me.record.get('requestState')].action, act)))
    })
  }
}

async function checkDocumentSignature (me) {
  const signData = await UB.Repository('hr_empOrderSignature').attrs(['ID', 'signerName', 'signatureDate'])
    .where('docID', '=', me.instanceID)
    .where('canceled', '=', false)
    .selectSingle()
  if (signData && signData.ID) {
    me.pdfSigned = true
    HR.reportTab.setReportMode(me, 'view')
  }
}

function onControlChanged (field, value) {
  const me = this
  if (!me.formDataReady || me.isInnerChange) {
    return
  }
  switch (field.name) {
    case 'requestType':
      filterFields(value, me)
      createOrderActionCheckVisible(me)
      break
    case 'dateFrom':
    case 'dateTo':
    case 'vacationKindID':
      me.setVacationDays()
      break
    case 'dayCount':
      me.setVacationDateTo()
      break
  }
}

function setVacationDays () {
  let me = this
  let dateFrom = me.attr.dateFrom.getValue()
  let dateTo = me.attr.dateTo.getValue()
  let dayCountCtrl = me.attr.dayCount
  if (!AC.dateService.isValid(dateFrom) || !AC.dateService.isValid(dateTo)) {
    me.isInnerChange = true
    try {
      dayCountCtrl.setValue(null)
    } finally {
      me.isInnerChange = false
    }
    return
  }
  let dictVacationKindID = me.attr.vacationKindID.getValue()
  me.isInnerChange = true
  $App.connection.run({
    entity: 'hr_empOrder',
    method: 'getCalendDays4Vac',
    dateFrom: dateFrom,
    dateTo: dateTo,
    dictVacationKindID: dictVacationKindID,
    // monkey request prevention
    currTime: Date.now()
  }).then(mParams => {
    try {
      dayCountCtrl.setValue(mParams.daysCount)
    } finally {
      me.isInnerChange = false
    }
    me.record.set('dayCount', mParams.daysCount)
  })
}

function setVacationDateTo () {
  let me = this
  let dateFrom = me.attr.dateFrom.getValue()
  let dateToCtrl = me.attr.dateTo
  let dayCount = me.attr.dayCount.getValue()
  if (!AC.dateService.isValid(dateFrom) || !dayCount) {
    me.isInnerChange = true
    try {
      dateToCtrl.setValue(null)
    } finally {
      me.isInnerChange = false
    }
    return
  }
  let dictVacationKindID = me.attr.vacationKindID.getValue()
  $App.connection.run({
    entity: 'hr_empOrder',
    method: 'getCalendDateTo4Vac',
    dateFrom: dateFrom,
    dayCount: dayCount,
    dictVacationKindID: dictVacationKindID,
    // monkey request prevention
    currTime: Date.now()
  }).then(mParams => {
    let dateTo = new Date(mParams.dateTo)
    if (AC.dateService.isValid(dateTo)) {
      me.isInnerChange = true
      try {
        dateToCtrl.setValue(dateTo)
      } finally {
        me.isInnerChange = false
      }
      me.record.set('dateTo', dateTo)
    }
  })
}

/**
 * variable field object for filter
 */
const variableFields = {
  ALL_FIELDS: ['lastName', 'firstName', 'middleName', 'vacationKindID', 'dateFrom', 'dateTo', 'requestKind', 'requestDescription', 'dayCount'],
  REQUEST_CHANGE_DATA: ['lastName', 'firstName', 'middleName'],
  REQUEST_GET_VACATION: ['vacationKindID', 'dateFrom', 'dateTo', 'dayCount'],
  REQUEST_ARBITARY: ['requestKind', 'requestDescription'],
  REQUEST_UNIVERSAL: []
}

/**
 * filter fields
 */
function filterFields (requestType, me) {
  variableFields.ALL_FIELDS.map(item => {
    me.attr[item].hide()
  })
  variableFields[requestType].map(item => {
    me.attr[item].show()
  })
  if (requestType === 'REQUEST_UNIVERSAL') {
    me.attr.dateFrom[me.record.get('dictRequestKindID.isDateFrom') ? 'show' : 'hide']()
    me.attr.dateTo[me.record.get('dictRequestKindID.isDateTo') ? 'show' : 'hide']()
  }
}

function addBaseActions () {
  let me = this
  me.callParent(arguments)

  let createOrderAction = me.actions.createOrderAction
  if (!createOrderAction) {
    createOrderAction = new Ext.Action({
      iconCls: 'iconCreateDoc',
      actionId: 'createOrderAction',
      text: UB.i18n('Створити проєкт наказу'),
      eventId: 'createOrderAction',
      hidden: false,
      handler: () => {
        me.saveForm().then(result => {
          if (result !== -1) {
            if (!me.record.get('document')) {
              $App.dialogError(UB.i18n('Необхідно сформувати текст наказу. Перейдіть на закладку "Документ" та натисніть "Формувати"'), UB.i18n('msgTypeWarning'))
              return
            }
            const requestType = me.record.get('requestType')
            if (requestType === 'REQUEST_CHANGE_DATA') {
              createOrderFormCHANGE(me)
            }
            if (requestType === 'REQUEST_GET_VACATION') {
              createOrderFormVACATION(me)
            }
          }
        })
      }
    })
    me.actions.createOrderAction = createOrderAction
  }
  me.actions.toCompletion = new Ext.Action({
    iconCls: 'fas fa-thumbs-down',
    cls: 'blue-action',
    tooltip: UB.i18n('На доопрацювання'),
    text: UB.i18n('На доопрацювання'),
    actionId: 'toCompletion',
    handler: function () {
      $App.connection.run({
        entity: 'hr_recstage',
        method: 'cancelReconciliation',
        docID: me.record.get('ID')
      }).then(function () {
        return me.loadInstance()
      }).then(function () {
        me.down('recpanel').updateTree()
        return $App.dialogInfo(UB.i18n('Документ повернуто на доопрацювання. Всі резолюції було відмінено'))
      })
    }
  })

  function docontinueReconciliation () {
    Ext.Msg.prompt(UB.i18n('Відновити погодження'),
      UB.i18n('Буде відновлено погодження з етапу на якому було відхилого погодженя. Введіть повідомлення для користвача, який відхилив погодження:'),
      function (btn, text) {
        if (btn === 'ok' && text) {
          $App.connection.run({
            entity: 'hr_recstage',
            method: 'continueReconciliation',
            docID: me.record.get('ID'),
            comments: text
          }).then(function () {
            return me.loadInstance()
          }).then(function () {
            me.down('recpanel').updateTree()
            return $App.dialogInfo(UB.i18n('Узгодження продовжено згідно встановленому маршруту'))
          })
        } else if (btn === 'ok' && !text) {
          docontinueReconciliation()
        }
      }, me, true)
  }

  me.actions.renewTask = new Ext.Action({
    iconCls: 'fas fa-thumbs-up',
    cls: 'blue-action',
    tooltip: UB.i18n('Відновити погодження'),
    text: UB.i18n('Відновити погодження'),
    actionId: 'renewTask',
    handler: function () {
      docontinueReconciliation('ON_RECONCILATION')
    }
  })

  me.actions.startReconciliation = new Ext.Action({
    iconCls: 'fas fa-handshake',
    cls: 'blue-action',
    tooltip: UB.i18n('Розпочати узгодження'),
    text: UB.i18n('Розпочати узгодження'),
    actionId: 'startReconciliation',
    handler: function () {
      me.saveForm().then(result => {
        if (result !== -1) {
          if (!me.record.get('document')) {
            $App.dialogError(UB.i18n('Необхідно сформувати текст наказу. Перейдіть на закладку "Документ" та натисніть "Формувати"'), UB.i18n('msgTypeWarning'))
            return
          }
          $App.connection.run({
            entity: 'hr_recstage',
            method: 'startReconciliation',
            docID: me.record.get('ID')
          })
            .then(me.loadInstance())
            .then(() => {
              HR.reportTab.setReportMode(me, 'view')
              me.down('recpanel').updateTree()
              return $App.dialogInfo(UB.i18n('Узгодження розпочато згідно встановленому маршруту'))
            })
          me.record.set('requestState', 'INPROGRESS')
        }
      })
    }
  })

  me.actions.stopReconciliation = new Ext.Action({
    iconCls: 'fas fa-stop',
    cls: 'blue-action',
    tooltip: UB.i18n('Відмінити узгодження'),
    text: UB.i18n('Відмінити узгодження'),
    actionId: 'stopReconciliation',
    handler: function () {
      $App.dialogYesNo(UB.i18n('Узгодження буде завершено та відмінено всі задачі. Продовжити?'))
        .then(function (res) {
          if (res) {
            $App.connection.run({
              entity: 'hr_recstage',
              method: 'stopReconciliation',
              docID: me.record.get('ID')
            })
              .then(me.loadInstance())
              .then(function () {
                me.down('recpanel').updateTree()
                return $App.dialogInfo(UB.i18n('Узгодження відмінено'))
              })
            me.record.set('requestState', 'NEW')
          }
        })
    }
  })

  me.actions.agreedAction = new Ext.Action({
    actionId: 'agreedAction',
    eventId: 'agreedAction',
    cls: 'add-new-action',
    scale: 'medium',
    iconCls: 'iconApprove',
    text: UB.i18n('Погодити'),
    handler: function () {
      if (me.isDirty()) {
        me.saveForm().then(result => {
          if (result !== -1) {
            changeRequestState(me, 'AGREED')
          }
        })
      } else {
        changeRequestState(me, 'AGREED')
      }
    }
  })

  me.actions.rejectAction = new Ext.Action({
    actionId: 'rejectAction',
    eventId: 'rejectAction',
    iconCls: 'iconReject',
    cls: 'red-action',
    scale: 'medium',
    text: UB.i18n('Відхилити'),
    handler: function () {
      if (me.isDirty()) {
        me.saveForm().then(result => {
          if (result !== -1) {
            changeRequestState(me, 'REJECTED')
          }
        })
      } else {
        changeRequestState(me, 'REJECTED')
      }
    }
  })
}

function changeRequestState (me, newState) {
  const oldState = me.attr.requestState.getValue()
  if (newState === 'AGREED' && me.record.get('dictRequestKindID.procRule') && me.record.get('dictRequestKindID.procRule') === 'TIMESHEET') {
    me.record.set('requestState', 'COMPLITED')
  } else {
    me.record.set('requestState', newState)
  }
  if (newState === 'REJECTED') {
    me.record.set('requestResponse', 'NEGATIVE')
  }

  me.saveForm().then(result => {
    if (result === -1) {
      me.attr.requestState.setValue(oldState)
      me.loadInstance()
    }
  }).catch(error => {
    AC.viewUtils.showToast(UB.i18n('Помилка'), error.message)
    me.loadInstance()
  })
}

function createActions (me) {
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
    handler: function () {
      me.attr.requestState.setReadOnly(false)
    }
  })
}

function createOrderActionCheckVisible (form) {
  const createOrderAction = form.actions.createOrderAction
  if (createOrderAction) {
    const requestType = form.record.get('requestType')
    const orderID = form.record.get('orderID')
    const requestState = form.record.get('requestState')
    const isAGREED = requestState === 'AGREED'

    createOrderAction.setHidden(true)
    createOrderAction.setDisabled(true)
    if (requestType === 'REQUEST_CHANGE_DATA') {
      createOrderAction.setHidden(false)
      if (!orderID && isAGREED) {
        createOrderAction.setDisabled(false)
      }
    }
    if (requestType === 'REQUEST_GET_VACATION') {
      createOrderAction.setHidden(false)
      if (!orderID && isAGREED) {
        createOrderAction.setDisabled(false)
      }
    }
  }
}

function getEmployeePositionID (employeeNumberID, onDate) {
  onDate = onDate || new Date()
  return Promise.resolve().then(() => {
    return UB.Repository('hr_employeePositionS')
      .attrs(['ID', 'organizationID', 'employeeID'])
      .where('employeeNumberID', '=', employeeNumberID)
      .where('dateFrom', '<=', onDate)
      .where('dateTo', '>=', onDate)
      .selectSingle().then((ite) => {
        return {
          employeePositionID: ite && ite.ID,
          organizationID: ite && ite.organizationID,
          employeeID: ite && ite.employeeID
        }
      })
  })
}

function makeOrderReason () {
  function getShortFIO (fullFIO) {
    fullFIO = fullFIO.replace(/[«´»„“‘’"'`]/gi, `’`).replace(/\s+/g, ' ').trim()
    let lastName = fullFIO.split(' ')[0]
    let firstName = fullFIO.split(' ')[1] || ''
    let middleName = fullFIO.split(' ')[2] || ''
    if (firstName) {
      firstName = firstName.substr(0, 1).toUpperCase() + '.'
    }
    if (middleName) {
      middleName = middleName.substr(0, 1).toUpperCase() + '.'
    }
    return (lastName + ' ' + firstName + middleName).trim()
  }

  const me = this
  const employeeNumberIDCtrl = me.getField('employeeNumberID')
  const date = AC.dateService.formatDate(me.record.get('mi_createDate'))
  let empName = getShortFIO(employeeNumberIDCtrl.getFieldValue('employeeID.genName') || employeeNumberIDCtrl.getFieldValue('employeeID.fullFIO')) || ''
  let result = UB.i18n(`{0} {1} № {2} від {3} `, me.getField('requestType').getRawValue(), empName, me.getField('requestNumber').getValue(), date)
  return result
}

function createOrderFormCHANGE (formRequest) {
  const employeeNumberID = formRequest.record.get('employeeNumberID')

  return getEmployeePositionID(employeeNumberID).then((employeePos) => {
    const organizationID = employeePos.organizationID

    return showCreateForm({
      formRequest: formRequest,
      entityName: 'hr_empOrder',
      initialFieldValues: {
        // ID: orderID,
        empOrderType: 'CHGEMPLOYEE',
        organizationID: organizationID,
        parentOrderID: formRequest.record.get('ID'),
        reason: formRequest.makeOrderReason()
      },
      customParams: {
        empOrderType: 'CHGEMPLOYEE'
      },
      showInModal: false,
      tabId: 'tmp1'
    }).then(formOrder => {
      return new Promise((resolve, reject) => {
        formOrder.on('recordloaded', (a) => {
          if (formOrder.isDetailCreated) {
            return
          }
          formOrder.isDetailCreated = true
          createOrderFormCHANGEDet(formRequest, formOrder).then(resolve).catch(reject)
        })
        formOrder.on('afterSave', () => {
          formRequest.refreshOrderData()
        })
      })
    })
  })
}

function createOrderFormCHANGEDet (formRequest, formOrder) {
  const orderID = formOrder.record.get('ID')
  const employeeNumberID = formRequest.record.get('employeeNumberID')

  return getEmployeePositionID(employeeNumberID).then((employeePos) => {
    const grid = formOrder.down('[name=hr_empOrderDet]')

    const employeePositionID = employeePos.employeePositionID
    const organizationID = employeePos.organizationID

    return showCreateForm({
      formRequest: formRequest,
      entityName: 'hr_empOrderChgemployeeDet',
      initialFieldValues: {
        empOrderType: 'CHGEMPLOYEE',
        orderID: orderID,
        organizationID: organizationID,
        parentOrderID: formRequest.record.get('ID'),
        reason: formRequest.makeOrderReason()
      },
      customParams: {
        empOrderType: 'CHGEMPLOYEE',
        orderForm: formOrder
      },
      showInModal: true,
      sender: grid,
      tabId: 'tmp2'
    }).then(formOrderDet => {
      const onBeforeSaveOld = formOrderDet.onBeforeSave
      formOrderDet.onBeforeSave = () => {
        const pp = new Promise((resolve, reject) => {
          return formOrder.saveForm().then(result => {
            if (result >= 0) {
              return Promise.resolve().then(() => {
                if (onBeforeSaveOld) {
                  return onBeforeSaveOld.call(formOrderDet)
                }
              }).then(() => {
                resolve()
              }).catch(error => {
                reject(error)
              })
            }
          })
        }).then(() => {
          const orderField = formRequest.getField('orderID')
          orderField.setValueById(orderID)
          formRequest.record.set('orderID', orderID)
          formRequest.record.set('requestState', 'COMPLITED')
          return formRequest.saveForm()
        })
        return pp
      }

      const lastName = formRequest.record.get('lastName')
      const firstName = formRequest.record.get('firstName')
      const middleName = formRequest.record.get('middleName')

      function changeFullFIO () {
        const lastName = formOrderDet.getField('lastName').getValue()
        const firstName = formOrderDet.getField('firstName').getValue()
        const middleName = formOrderDet.getField('middleName').getValue()
        let gender = formOrderDet.record.get('sexType')
        gender = gender === 'W' ? 'female' : gender === 'M' ? 'male' : null

        const ff = ['genName', 'datName', 'accusativeName', 'insName', 'locName', 'vocName']
        HR.nameCase.getNameCase(lastName, firstName, middleName, gender).then(nc => {
          ff.forEach(item => {
            const value = nc.getSurName(item) + ' ' + nc.getName(item) + ' ' + nc.getLastName(item)
            formOrderDet.record.set(item, value)
            const field = formOrderDet.getField(item)
            field.setValue(value)
          })
        })
      }

      let fieldTaxCodeFired = true
      formOrderDet.on('employeePositionChanged', () => {
        const val = formOrderDet.record.get('employeePositionID')
        if (!val) {
          return
        }
        if (!fieldTaxCodeFired) {
          fieldTaxCodeFired = true

          formOrderDet.getField('lastName').setValue(lastName)
          formOrderDet.getField('firstName').setValue(firstName)
          formOrderDet.getField('middleName').setValue(middleName)

          formOrderDet.record.set('lastName', lastName)
          formOrderDet.record.set('firstName', firstName)
          formOrderDet.record.set('middleName', middleName)

          changeFullFIO()
        }
      })

      let formDataReadyFired = false
      formOrderDet.on('formDataReady', () => {
        if (!formDataReadyFired) {
          formDataReadyFired = true

          const employeePositionField = formOrderDet.getField('employeePositionID')
          employeePositionField.store.load().then(() => {
            fieldTaxCodeFired = false
            employeePositionField.setValueById(employeePositionID)
          })
        }
      })
    })
  })
}

function createOrderFormVACATION (formRequest) {
  const employeeNumberID = formRequest.record.get('employeeNumberID')
  const dateFrom = formRequest.record.get('dateFrom')
  return getEmployeePositionID(employeeNumberID, dateFrom).then((employeePos) => {
    const organizationID = employeePos.organizationID

    return Promise.resolve().then(() => {
      return showCreateForm({
        formRequest: formRequest,
        entityName: 'hr_empOrder',
        initialFieldValues: {
          // ID: orderID,
          empOrderType: 'VACATION',
          organizationID: organizationID,
          parentOrderID: formRequest.record.get('ID'),
          reason: formRequest.makeOrderReason()
        },
        defaultValues: {
          organizationID: organizationID
        },
        customParams: {
          organizationID: organizationID,
          empOrderType: 'VACATION'
        },
        showInModal: false,
        tabId: 'tmp1'
      }).then(formOrder => {
        return new Promise((resolve, reject) => {
          formOrder.on('recordloaded', (a) => {
            if (formOrder.isDetailCreated) {
              return
            }
            formOrder.isDetailCreated = true
            createOrderFormVACATIONDet(formRequest, formOrder).then(resolve).catch(reject)
          })
          formOrder.on('afterSave', () => {
            formRequest.refreshOrderData()
          })
        })
      })
    })
  })
}

function createOrderFormVACATIONDet (formRequest, formOrder) {
  if (!formOrder.isNewInstance) {
    return
  }
  const isDay = formRequest.getField('vacationKindID').getFieldValue('isDay')
  const orderID = formOrder.record.get('ID')
  const employeeNumberID = formRequest.record.get('employeeNumberID')
  const dictVacationKindID = formRequest.record.get('vacationKindID')
  const dateFrom = formRequest.record.get('dateFrom')
  const dateTo = formRequest.record.get('dateTo')
  const dayCount = formRequest.record.get('dayCount')
  const requestReason = formRequest.record.get('requestReason')
  const reasonDocument = formRequest.record.get('reasonDocument')

  return getEmployeePositionID(employeeNumberID, dateFrom).then((employeePos) => {
    const employeePositionID = employeePos.employeePositionID
    const organizationID = employeePos.organizationID
    const employeeID = employeePos.employeeID
    const grid = formOrder.down('[name=hr_empOrderDet]')

    return showCreateForm({
      entityName: isDay ? 'hr_empOrderVacationDet' : 'hr_empOrderVacationlongDet',
      formRequest: formRequest,
      initialFieldValues: {
        empOrderType: isDay ? 'VACATION' : 'VACATIONLONG',
        orderID: orderID,
        organizationID: organizationID,
        parentOrderID: formRequest.record.get('ID'),
        reason: requestReason,
        employeePositionID: employeePositionID,
        dictVacationKindID: dictVacationKindID,
        dateFrom: dateFrom,
        dateTo: dateTo,
        reasonDoc: reasonDocument,
        dayCount: dayCount
      },
      customParams: {
        empOrderType: isDay ? 'VACATION' : 'VACATIONLONG',
        orderForm: formOrder
      },
      showInModal: true,
      sender: grid,
      tabId: 'tmp2',
      onInit: function (form) {
        let me = form
        me.on('initComponentDone', () => {
          // let empOrderVacationListDet = me.down('[name=empOrderVacationListDet]')
          // empOrderVacationListDet.notWriteChanges = true
        })
      }
    }).then(formOrderDet => {
      formOrderDet.isFirstRun = true

      const fieldEmployeePositionID = formOrderDet.getField('employeePositionID')
      let fieldTaxCodeFired = true
      formOrderDet.on('recordloaded', function () {
        const me = formOrderDet
        if (me.isNewInstance) {
          me.record.set('employeePositionID', employeePositionID)
          fieldEmployeePositionID.setValueById(employeePositionID, true, function () {
            me.record.set('employeeNumberID', employeeNumberID)
            me.record.set('employeeID', employeeID)

            setTimeout(function () {
              formOrderDet.saveForm().then(result => {
                setTimeout(function () {
                  me.fillVacationListA && me.fillVacationListA(dictVacationKindID)
                }, 100)
              })
            }, 100)
          })
        }
      })

      const onBeforeSaveOld = formOrderDet.onBeforeSave
      formOrderDet.onBeforeSave = () => {
        if (formOrderDet.isFirstRun) {
          const result = new Promise((resolve, reject) => {
            return formOrder.saveForm().then(result => {
              if (result >= 0) {
                return Promise.resolve().then(() => {
                  if (onBeforeSaveOld) {
                    return onBeforeSaveOld.call(formOrderDet)
                  }
                }).then(() => {
                  resolve(true)
                }).catch(error => {
                  reject(error)
                })
              }
            })
          }).then((res) => {
            if (!res) {
              return res
            }
            const orderField = formRequest.getField('orderID')
            orderField.setValueById(orderID)
            formRequest.record.set('orderID', orderID)
            formRequest.record.set('requestState', 'COMPLITED')
            formRequest.record.set('requestResponse', 'POSITIVE')
            return formRequest.saveForm()
          })
          return result
        } else if (onBeforeSaveOld) {
          return onBeforeSaveOld.call(formOrderDet)
        } else {
          return Promise.resolve(true)
        }
      }

      formOrderDet.on('aftersave', (form) => {
        if (form.isFirstRun) {
          form.isFirstRun = false
          let grid = form.down('[name=empOrderVacationListDet]')
          if (!grid) {
            return
          }
          let items = grid.store.data.items
          for (let i = 0; i < items.length; i++) {
            let item = items[i]
            item.paraID = form.instanceID
          }
          grid.notWriteChanges = false
          AC.gridUtils.insertRowsOfStore(grid)
        }
      })

      fieldEmployeePositionID.on('change', () => {
        if (!fieldTaxCodeFired) {
          formOrderDet.isInnerChange = true
          try {
            formOrderDet.getField('dateFrom').setValue(dateFrom)
            formOrderDet.getField('dateTo').setValue(dateTo)
            formOrderDet.getField('dayCount').setValue(dayCount)
            formOrderDet.getField('reason').setValue(requestReason)
            formOrderDet.getField('reasonDoc').setValue(reasonDocument)

            formOrderDet.record.set('dateFrom', dateFrom)
            formOrderDet.record.set('dateTo', dateTo)
            formOrderDet.record.set('dayCount', dayCount)
            formOrderDet.record.set('reason', requestReason)
            formOrderDet.record.set('reasonDoc', reasonDocument)
          } finally {
            formOrderDet.isInnerChange = false
            fieldTaxCodeFired = true
          }
        }
      })
    })
  })
}

function formPrintDocument (me, code, reportType, reportCode) {
  me.setLoading(true)
  $App.connection.run({
    entity: 'hr_request',
    method: 'viewPrintForm',
    params: {
      code: code,
      type: 'report',
      reportCode: reportCode,
      reportType: reportType,
      instanceID: me.instanceID
    }
  }).then(function (result) {
    me.setLoading(false)

    let reportDesc = me.initialConfig.commandConfig.description
    let report = Ext.create('UBS.UBReport', {
      code: result.params.reportCode,
      type: result.params.reportType,
      params: {
        instanceID: me.instanceID,
        reportDescription: reportDesc
      }
    })
    $App.doCommand({
      cmdType: 'showForm',
      formCode: 'ac_documentViewer',
      caption: UB.i18n('Друкована форма'),
      cmpInitConfig: {
        report: report
      },
      tabId: 'printDocument_' + result.params.reportCode + '_' + me.instanceID,
      description: reportDesc,
      target: $App.getViewport().centralPanel
    })
  }).then(function () {
    me.setLoading(false)
  })
}

/**
 * @param {{entityName: string, formCode: string, initialFieldValues: {[x]:string}, customParams: {[x]:string}, sender: any, showInModal: boolean, tabId: string}} options
 * @return {Promise<UBForm>} initChildForm
 */
function showCreateForm (options) {
  return new Promise((resolve, reject) => {
    function showForm (config) {
      const newConfig = _.merge({
        cmdType: 'showForm',
        entity: options.entityName
      }, config)

      if (options.showInModal) {
        newConfig.isModal = true
      } else {
        newConfig.tabId = options.tabId
        newConfig.target = $App.getViewport().centralPanel
      }

      $App.doCommand(newConfig)
    }
    const commandConfig = {
      formCode: options.formCode,
      initialFieldValues: options.initialFieldValues,
      customParams: options.customParams,
      sender: options.sender,
      cmpInitConfig: {
        initComponentStart () {
          const me = this
          if (options.onInit) {
            options.onInit(me)
          }
          resolve(me)
        },
        externalInitComponentStart (me) {
          resolve(me)
        },
        externalOnAfterOrderSave: function (oForm) {
          if (oForm.entityName === 'hr_empOrder' && !oForm.attachmentSaved) {
            $App.connection.run({
              entity: 'hr_orderAttachment',
              method: 'saveParentAttachments',
              parentOrderID: options.formRequest.record.get('ID'),
              ID: oForm.record.get('ID'),
              parentEntityName: 'hr_request'
            }).then(mParams => {
              oForm.down('[xtype=docAttachment]').onRefresh()
              oForm.attachmentSaved = true
            })
          }
        }
      }
    }

    showForm(commandConfig)
  })
}

function getReportName () {
  return 'hr_printRequest'
}

function onBeforeSave () {
  const me = this
  if (!me.record.get('docText')) {
    return Promise.resolve(true)
  }
  return HR.reportTab.saveReport(me)
}

function refreshOrderData () {
  const me = this
  let id = me.attr.orderID.getValue()
  me.attr.orderID.clearValue()
  me.attr.orderID.setValueById(id)
}
