/* global AC UB appHR appAC _ */
exports.formCode = {
  onFormDataReady,
  initComponentStart,
  initComponentDone,
  onControlChanged,
  changePayEl
}

function initComponentStart () {
  const me = this
  me.on('formDataReady', onFormDataReady, me)
  me.on('controlChanged', onControlChanged, me)
  me.on('beforeClose', function (a) {
    AC.gridUtils.refreshSenderUBGrid(me)
  })
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me, ['label'])
  if (me.isEditable && !me.isEditable()) {
    me.actions.fDelete.hide()
  }
  me.attr.baseSum.on('blur', changeParams)
  me.attr.rate.on('blur', changeParams)
  me.attr.baseSum.on('keypress', onKeypress)
  me.attr.rate.on('keypress', onKeypress)
  if (AC.entityUtils.isAdmin()) {
    createDevFormActions(me)
  }
}

function onKeypress (ctrl, e) {
  if (e.getKey() === e.ENTER) {
    changeParams(ctrl)
  }
}

function changeParams (ctrl) {
  const me = ctrl.up('form')
  const value = ctrl.getValue()
  if (value) {
    switch (ctrl.name) {
      case 'rate':
        me.attr.baseSum.setValue()
        break
      case 'baseSum':
        me.attr.rate.setValue()
        break
    }
  }
}

function onFormDataReady () {
  const me = this
  if (me.isNewInstance && me.defaultValues) {
    _.forEach(me.defaultValues, (value, name) => {
      me.record.set(name, value)
    })
  }
  me.changePayEl(me, me.record.get('payElID.methodID.methodGroupID.code'), me.record.get('payElID.methodID.code'), me.record.get('payElID.notReqReport'))
  me.attr.taxNumber.setValue(me.record.get('contractorID.OKPOCode'))
  me.attr.familyBirthDate.setValue(me.record.get('employeeFamilyID.peopleID.birthDate'))
  if (me.record.get('contractorID') && me.record.get('payElID.methodID.code') !== '31') {
    AC.viewUtils.setFilterValue(me.attr.contrAccountID, { organizationID: me.record.get('contractorID') }, ['setDisabled'])
  }

  me.attr.contractorName.setText(me.record.get('contrAccountID.organizationID.name') || '')
  if (me.record.get('contractorID') !== me.record.get('contrAccountID.organizationID')) {
    me.attr.contractorName.getEl().setStyle({ 'color': '#ff0000' })
  } else {
    me.attr.contractorName.getEl().setStyle({ 'color': '#797c82' })
  }
  if (me.isNewInstance) {
    UB.Repository('hr_employeeNumberSR')
      .attrs(['employeeID'])
      .selectById(me.record.get('employeeNumberID'))
      .then(response => {
        AC.viewUtils.setFilterValue(me.attr.employeeFamilyID, { employeeID: response.employeeID })
      })
  } else {
    AC.viewUtils.setFilterValue(me.attr.employeeFamilyID, { employeeID: me.record.get('employeeNumberID.employeeID') })
  }
  appHR.getPayOutList(appAC.globalOrganization()).then(payOutList => {
    AC.viewUtils.setFilterValue(me.attr.payOutID, { ID: payOutList })
  })
  me.attr.dateFrom.setMinValue(me.attr.employeeNumberID.getFieldValue('dateFrom'))
  if (me.isNewInstance) { me.attr.dateFrom.setValue(AC.dateService.currentDate()) }
  const isBank = me.record.get('paymentMethod') === '1'
  me.attr.personalAccount.setVisible(isBank)
  me.attr.personalSubAccount.setVisible(isBank)
  setPayElWhereListDate(me)
}

function setPayElWhereListDate (me) {
  let payElStore = me.attr.payElID.getStore()
  let dateFrom = me.attr.dateFrom.getValue() || me.attr.dateToEmpty.getValue() || null
  let dateTo = me.attr.dateToEmpty.getValue() || me.attr.dateFrom.getValue() || null
  if (dateFrom && dateTo && me.attr.dateFrom.isValid() && me.attr.dateToEmpty.isValid()) {
    AC.viewUtils.setFilterValue(me.attr.payElID, {
      dateFrom: { value: dateTo, condition: '<=' },
      dateTo: { value: dateFrom, condition: '>=' }
    })
  } else {
    if (payElStore.ubRequest.whereList.dateFrom) delete payElStore.ubRequest.whereList.dateFrom
    if (payElStore.ubRequest.whereList.dateTo) delete payElStore.ubRequest.whereList.dateTo
  }
}

function onControlChanged (field, value) {
  const me = this

  if (!me.formDataReady) {
    return
  }
  let isBank
  switch (field.name) {
    case 'dateFrom':
      if (AC.dateService.isValid(field.value)) {
        me.attr.dateToEmpty.setMinValue(me.attr.dateFrom.getValue())
        setPayElWhereListDate(me)
      }
      break
    case 'dateToEmpty':
      if (AC.dateService.isValid(field.value)) {
        me.attr.dateFrom.setMaxValue(me.attr.dateToEmpty.getValue())
        setPayElWhereListDate(me)
      }
      break
    case 'contractorID':
      isBank = me.record.get('paymentMethod') === '1'
      if (value && isBank) {
        if (!me.attr.contrAccountID.getValue() || me.attr.payElID.getFieldValue('methodID.code') !== '31') {
          UB.Repository('ac_contrAccount').attrs(['ID', 'isbase'])
            .where('organizationID', '=', value).orderByDesc('isbase').selectAsObject().then(res => {
              me.attr.contrAccountID.clearValue()
              me.attr.contrAccountID.store.clearFilter()
              res && (res.length === 1 || res[0].isbase) && me.attr.contrAccountID.setValueById(res[0].ID)
            })
        }
        if (me.attr.payElID.getFieldValue('methodID.code') !== '31') {
          AC.viewUtils.setFilterValue(me.attr.contrAccountID, { organizationID: value }, ['setDisabled'])
        } else {
          me.attr.contrAccountID.getStore().clearFilter()
        }
        me.attr.taxNumber.setValue(field.getFieldValue('OKPOCode'))
      } else if (me.attr.payElID.getFieldValue('methodID.code') !== '31') {
        me.attr.contrAccountID.clearValue()
      }
      if (me.attr.contractorID.getValue() !== me.attr.contrAccountID.getFieldValue('organizationID')) {
        me.attr.contractorName.getEl().setStyle({ 'color': '#ff0000' })
      } else {
        me.attr.contractorName.getEl().setStyle({ 'color': '#797c82' })
      }
      break
    case 'contrAccountID':
      me.attr.contractorName.setText(me.attr.contrAccountID.getFieldValue('organizationID.name') || '')
      if (me.attr.contractorID.getValue() !== me.attr.contrAccountID.getFieldValue('organizationID')) {
        me.attr.contractorName.getEl().setStyle({ 'color': '#ff0000' })
      } else {
        me.attr.contractorName.getEl().setStyle({ 'color': '#797c82' })
      }
      break
    case 'paymentMethod':
      if (value !== me.record.get('paymentMethod')) {
        isBank = value === '1'
        me.attr.contractorID.setValueById(null)
        me.attr.contrAccountID.setValueById(null)
        if (me.attr.payElID.getFieldValue('methodID.methodGroupID.code') === 128) {
          me.attr.payOutID.setVisible(true)
          if (!isBank) me.attr.payOutID.setValue()
          me.attr.contractorID.setVisible(isBank)
          // me.attr.contractorID.setAllowBlank(!isBank)
          me.attr.contrAccountID.setVisible(isBank)
          me.attr.rate.setVisible(['1', '2', '3'].includes(value))
          me.attr.baseSum.setVisible(['1', '2', '3'].includes(value))
          me.down('[name=exportPanel]').setVisible(false)
        } else {
          me.down('[name=exportPanel]').setVisible(isBank)
        }
        if (me.attr.payElID.getFieldValue('methodID.methodGroupID.code') === 129) {
          me.attr.contrAccountID.setVisible(isBank)
          me.attr.payOutID.setVisible(true)
          if (!isBank) me.attr.payOutID.setValue()
        }
        if (me.attr.payElID.getFieldValue('methodID.methodGroupID.code') === 130) {
          me.attr.payOutID.setVisible(true)
          if (!isBank) me.attr.payOutID.setValue()
        }
        me.attr.personalAccount.setValue(null)
        me.attr.personalAccount.setVisible(isBank)
        me.attr.personalSubAccount.setValue(null)
        me.attr.personalSubAccount.setVisible(isBank)
      }
      break
    case 'employeeFamilyID':
      me.attr.familyBirthDate.setValue(field.getFieldValue('peopleID.birthDate'))
      break
    case 'payElID': {
      me.attr.contractorID.clearValue()
      changePayEl(me, field.getFieldValue('methodID.methodGroupID.code'), field.getFieldValue('methodID.code'), field.getFieldValue('notReqReport'))
      const attrs = ['paymentMethod', 'employeeFamilyID', 'familyBirthDate', 'maxRate', 'minRate', 'rate', 'baseSum',
        'debtSum', 'remindSum', 'dateIdxFrom', 'bankID', 'personalAccount', 'personalSubAccount', 'contractorID',
        'contrAccountID', 'taxNumber', 'docNumber', 'docDate']
      attrs.forEach(attrName => {
        me.attr[attrName][me.attr[attrName].setValueById ? 'setValueById' : 'setValue'](null)
      })

      break
    }
    case 'rate':
      if (!me.attr.baseSum.noChange && me.attr.baseSum.getValue()) {
        me.attr.rate.noChange = true
        me.attr.baseSum.setValue(null)
      } else me.attr.baseSum.noChange = false
      break
    case 'baseSum':
      if (!me.attr.rate.noChange && me.attr.rate.getValue()) {
        me.attr.baseSum.noChange = true
        me.attr.rate.setValue(null)
      } else me.attr.rate.noChange = false
      break
  }
}

function changePayEl (me, groupCode, methodCode, notReqReport) {
  ['paymentMethod', 'employeeFamilyID', 'familyBirthDate', 'maxRate', 'minRate', 'rate', 'baseSum', 'debtSum',
    'remindSum', 'dateIdxFrom', 'bankID', 'contractorID', 'contrAccountID', 'taxNumber', 'docNumber', 'docDate',
    'docExecutive', 'execNameDoc', 'namePay'].forEach(attrName => {
    me.attr[attrName].setVisible(false)
    me.attr[attrName].setAllowBlank(true)
  })
  me.attr.payOutID.setVisible(false)
  me.attr.familyBirthDate.setAllowBlank(true)
  me.attr.paymentMethod.setAllowBlank(true)
  if (me.record.get('paymentMethod') !== '4') {
    switch (groupCode) {
      case 128:
        // AC.viewUtils.removeFilterValue(me.attr.contractorID, 'contrType')
        me.attr.paymentMethod.setVisible(true)
        me.attr.payOutID.setVisible(true)
        me.attr.paymentMethod.setAllowBlank(false)
        me.down('[name=exportPanel]').setVisible(false)
        me.attr.contractorID.setVisible(me.record.get('paymentMethod') === '1')
        // me.attr.contractorID.setAllowBlank(!(me.record.get('paymentMethod') === '1'))
        me.attr.contrAccountID.setVisible(me.record.get('paymentMethod') === '1')
        me.attr.contractorName.setVisible(me.record.get('paymentMethod') === '1')
        if (methodCode === '29' && ['1', '2', '3'].includes(me.record.get('paymentMethod'))) {
          me.attr.rate.setVisible(true)
          me.attr.baseSum.setVisible(true)
        }
        break
      case 129:
        me.attr.paymentMethod.setVisible(true)
        me.attr.payOutID.setVisible(true)
        me.attr.paymentMethod.setAllowBlank(false)
        me.down('[name=exportPanel]').setVisible(me.record.get('paymentMethod') === '1')
        me.attr.rate.setVisible(true)
        me.attr.debtSum.setVisible(true)
        me.attr.baseSum.setVisible(true)
        me.attr.remindSum.setVisible(true)
        me.attr.contractorID.setVisible(true)
        me.attr.taxNumber.setVisible(true)
        me.attr.docNumber.setVisible(true)
        me.attr.docDate.setVisible(true)
        me.attr.docExecutive.setVisible(true)
        me.attr.execNameDoc.setVisible(true)
        me.attr.namePay.setVisible(true)
        me.attr.contractorID.setAllowBlank(false)
        switch (methodCode) {
          case '61':
            me.attr.contrAccountID.setVisible(true)
            me.attr.contractorName.setVisible(true)
            me.attr.contractorID.setAllowBlank(!!notReqReport)
            me.attr.docDate.setAllowBlank(!!notReqReport)
            me.attr.docNumber.setAllowBlank(!!notReqReport)
            break
          default:
            // AC.viewUtils.setFilterValue(me.attr.contractorID, { contrType: 'physicalPerson' })
            me.attr.contractorID.setAllowBlank(false)
            me.attr.employeeFamilyID.setVisible(true)
            me.attr.familyBirthDate.setVisible(true)
            me.attr.familyBirthDate.setAllowBlank(false)
            me.attr.dateIdxFrom.setVisible(true)
            me.attr.contrAccountID.setVisible(me.record.get('paymentMethod') === '1')
            me.attr.contractorName.setVisible(me.record.get('paymentMethod') === '1')
            break
        }
        break
      case 133:
        // AC.viewUtils.removeFilterValue(me.attr.contractorID, 'contrType')
        me.attr.rate.setVisible(true)
        me.attr.baseSum.setVisible(true)
        me.attr.debtSum.setVisible(true)
        me.attr.remindSum.setVisible(true)
        me.attr.contractorID.setVisible(true)
        me.attr.contrAccountID.setVisible(true)
        me.attr.contractorName.setVisible(true)
        me.attr.taxNumber.setVisible(true)
        me.attr.docNumber.setVisible(true)
        me.attr.docDate.setVisible(true)

        me.attr.contractorID.setAllowBlank(false)
        break
      case 130:
        if (methodCode !== '32') {
          me.down('[name=exportPanel]').setVisible(me.record.get('paymentMethod') === '1')
          me.attr.paymentMethod.setVisible(true)
          me.attr.payOutID.setVisible(true)
          me.attr.paymentMethod.setAllowBlank(false)
          me.attr.contractorID.setVisible(true)
          me.attr.contrAccountID.setVisible(true)
          me.attr.contractorName.setVisible(true)
          me.attr.taxNumber.setVisible(true)
          me.attr.contractorID.setAllowBlank(true)
          me.attr.namePay.setVisible(true)
        }
        me.attr.rate.setVisible(true)
        me.attr.baseSum.setVisible(true)

        break
    }
  } else {
    me.attr.paymentMethod.setVisible(true)
    me.attr.payOutID.setVisible(true)
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
