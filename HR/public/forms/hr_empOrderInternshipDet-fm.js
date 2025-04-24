/* global  HR AC $App UB */
exports.formCode = {
  isValidDate,
  setTitleByOrderType,
  initComponentStart,
  enableControls,
  initComponentDone,
  onControlChanged
}

function onControlChanged (ctrl, value, oldValue) {
  const me = this
  switch (ctrl.name) {
    case 'payElID':
      let valuationValue = me.attr.payElID.getFieldValue('methodID.valuation')
      me.attr.valuationType.store.clearFilter()
      if (valuationValue) {
        switch (valuationValue) {
          case 'SUM':
          case 'RATE':
            AC.viewUtils.setFilterValue(me.attr.valuationType, { code: [valuationValue] })
            break
          case 'SUMRATE':
            AC.viewUtils.setFilterValue(me.attr.valuationType, { code: ['SUM', 'RATE'] })
            break
        }
      }
      me.attr.valuationType.setValue(value && valuationValue && ['SUM', 'RATE'].includes(valuationValue) ? valuationValue : null)
      break
    case 'valuationType':
      me.down('[name=valyationLabel]').update(value ? (value === 'SUM' ? 'грн' : '%') : '')
      break
  }
}

function isValidDate (d) {
  return d instanceof Date && !isNaN(d)
}

function setTitleByOrderType () {
  this.orderForm.setTitleByOrderType(this)
}

function initComponentStart () { // Вызывается прямо перед запуском инициализации формы.
  // В этом событии  можно изменить конфигурацию формы.
  let me = this
  me.on('afterrender', function () {
    HR.orderManager.setDateChecker(me, {
      dateFrom: me.getField('dateFrom'),
      dateTo: me.getField('dateTo')
    })
    me.up('window').on('____beforeclose', win => {
      if (win.canClose) {
        win.canClose = false
        return true
      }
      let grid = me.down('[name=hr_empOrderInternshipListDet]')

      win.canClose = !grid || grid.getStore().getCount() !== 0
      if (win.canClose) {
        win.close()
        return true
      }
      grid.getStore().load().then(store => {
        if (store.getCount() === 0) {
          $App.dialogYesNo(UB.i18n('Попередження'), UB.i18n('Не вказано розмір матеріальної допомоги. Продовжити?'))
            .then(res => {
              if (res) {
                win.canClose = true
                win.close()
              } else {
                me.down('[ubID=tpDetail]').setActiveTab(1)
              }
            })
        } else {
          win.canClose = true
          win.close()
        }
      })

      return false
    })
  })

  me.on('controlChanged', onControlChanged, me)
}

function enableControls () {
  const me = this
  me.orderForm.enableParaControls(me)
}

function initComponentDone () {
  let me = this
  let sender = me.sender
  AC.viewUtils.setAttr(me)
  if (me.customParams.orderForm) {
    me.masterForm = me.orderForm = me.customParams.orderForm
  } else {
    me.masterForm = me.orderForm = me.sender.up('form')
  }
  if (me.orderForm) {
    me.orderState = me.orderForm.record.get('orderState')
  } else {
    me.orderState = 'PROJECT'
  }

  me.on('beforeClose', function (a) {
    if (sender) {
      let grid = sender.onRefresh ? me.sender : (sender.panel && sender.panel.onRefresh) ? sender.panel : null
      if (grid) {
        grid.onRefresh()
      }
    }
  })
  me.on('formDataReady', async () => {
    HR.orderManager.disableContextMenuItems(me.getField('employeePositionID'), ['addItem', 'editItem'])
    if (me.isNewInstance) {
      me.attr.internshipType.setValue('0')
      const orderConfig = await UB.Repository('hr_empOrderDetConfig')
        .attrs(['payElIDMain'])
        .where('empOrderType', '=', me.customParams.empOrderType || null)
        .where('organizationID', '=', me.orderForm.record.get('organizationID'))
        .orderBy('mi_createDate', 'desc')
        .selectSingle()
      if (orderConfig && orderConfig.payElIDMain) {
        me.record.set('payElID', orderConfig.payElIDMain)
      }
    } else {
      let valuationValue = me.attr.payElID.getFieldValue('methodID.valuation')
      if (valuationValue) {
        switch (valuationValue) {
          case 'SUM':
          case 'RATE':
            AC.viewUtils.setFilterValue(me.attr.valuationType, { code: [valuationValue] })
            break
          case 'SUMRATE':
            AC.viewUtils.setFilterValue(me.attr.valuationType, { code: ['SUM', 'RATE'] })
            break
        }
      }
      me.down('[name=valyationLabel]').update(me.attr.valuationType.getValue() ? (me.attr.valuationType.getValue() === 'SUM' ? 'грн' : '%') : '')
    }

    me.enableControls()
  })
  me.on('recordloaded', function (a) {
    let
      me = this

    if (me.isNewInstance) {
      if (me.orderForm) {
        me.record.set('orderID', me.orderForm.instanceID)
        me.record.set('dateFrom', AC.dateService.truncTimeToUtcNull(me.orderForm.record.get('orderDate')))
        me.record.set('organizationID', me.orderForm.record.get('organizationID'))
      }
      if (me.customParams.empOrderType) {
        me.record.set('empOrderType', me.customParams.empOrderType)
      }
    }
    if (me.orderForm) {
      if (me.getField('employeePositionID')) {
        me.orderForm.filterEmployeePosition(me, {
          clearValue: false,
          attrToFilter: 'employeePositionID'
        })
      }
      if (me.getField('departmentID')) {
        return me.orderForm.filterDepartment({
          form: me,
          isReload: false,
          isClear: false,
          orgAttr: 'organizationID'
        })
      }
      me.setTitleByOrderType()
    }
    me.record.store.on('update', (store, reco, oper, modified, eOpts) => {
      HR.orderManager.showIf(me)
      HR.orderManager.requiredIf(me)
      HR.orderManager.disabledIf(me)
    })

    me.onBeforeSave = () => {
      return Promise.resolve(true)
    }
    if (me.orderForm) {
      me.orderForm.makeReasonSelector(me)
      me.orderForm.makeReasonSelector(me, {
        reasonFieldName: 'reasonDoc',
        entityName: 'hr_dictOrderDetReasonDoc'

      })
    }
    HR.orderManager.setDefaultValues(me)
    HR.orderManager.showIf(me)
    HR.orderManager.requiredIf(me)
    HR.orderManager.disabledIf(me)
    HR.orderManager.setDateChecker(me, {
      dateFrom: me.getField('dateFrom'),
      dateTo: me.getField('dateTo')
    })
  })
}
