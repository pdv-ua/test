/* global Ext AC HR _ UB $App appAC */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onFormDataReady,
  changeOrgValue,
  showChangeOrgForm,
  doRecalcSalaryScheme,
  cancelSalaryScheme,
  raiseSalaryScheme
}

function initComponentStart () {
  const me = this
  me.on('formDataReady', onFormDataReady, me)
}

function initComponentDone () {
  const me = this
  me.on('controlChanged', onControlChanged, me)
  AC.viewUtils.setAttr(me, ['ubdetailgrid'])
  me.attr.gridSalarySchemeLevel.store.ubRequest.method = 'selectOnDate'
  me.attr.gridSalarySchemeLevel.store.ubRequest.onDate = appAC.globalApplicationDate()
  const tb = me.attr.gridSalarySchemeLevel.down('toolbar')
  tb.insert(tb.items.length - 2, {
    xtype: 'datefield',
    name: 'onDate',
    labelWidth: 80,
    width: 200,
    fieldLabel: UB.i18n('На дату'),
    value: appAC.globalApplicationDate(),
    listeners: {
      change: (ctrl, value) => {
        const me = ctrl.up('form')
        if (value && AC.dateService.isValid(value)) {
          me.attr.gridSalarySchemeLevel.store.ubRequest.onDate = value
          me.attr.gridSalarySchemeLevel.onRefresh()
        }
      }
    }
  })
  createActions(me)
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
    text: UB.i18n('Підвищення всіх рівнів'),
    name: 'actionRaiseScheme',
    iconCls: 'fas fa-angle-double-up',
    handler: function () {
      me.raiseSalaryScheme()
    }
  })
  allActions.menu.add({
    text: UB.i18n('Скасувати підвищення'),
    name: 'actionCancelRaising',
    handler: function () {
      me.cancelSalaryScheme()
    }
  })
}

function onFormDataReady () {
  const me = this
  if (me.isNewInstance || me.record.get('schemeType') === '2') {
    me.down('[name=recalcSalarySchemeBtn]').hide()
  } else {
    me.down('[name=recalcSalarySchemeBtn]').show()
  }
  me.attr.roundUpTo.setReadOnly(!me.isNewInstance)
}

function doRecalcSalaryScheme () {
  const me = this
  $App.dialogYesNo(UB.i18n('Увага'), UB.i18n('Буде виконано перерозрахунок сум. Поточні дані будуть видалені! Продовжити?')).then(result => {
    if (result) {
      me.saveForm().then(result => {
        if (result !== -1) {
          me.setLoading(true)
          $App.connection.run({
            entity: 'hr_dictSalaryScheme',
            method: 'recalcSalaryScheme',
            dictSalarySchemeID: me.instanceID
          }).catch(err => {
            AC.viewUtils.showToast(UB.i18n('Помилка'), err.message)
          }).finally(() => {
            me.setLoading(false)
          })
        }
      })
    }
  })
}

function changeOrgValue (me, grid) {
  UB.Repository('hr_organization')
    .attrs(['mi_data_id', 'description'])
    .where('state', '=', 'ACTIVE')
    .orderBy('description')
    .selectAsObject({
      'mi_data_id': 'ID'
    }).then(result => {
      me.showChangeOrgForm(me, grid, result)
    })
}

function showChangeOrgForm (me, grid, sourceData) {
  UB.Repository('hr_dictSalarySchemeOrg')
    .attrs(['ID', 'orgID'])
    .where('dictSalarySchemeID', '=', me.instanceID)
    .selectAsObject({
      'orgID': 'value'
    })
    .then(result => {
      $App.doCommand({
        cmdType: 'showForm',
        formCode: 'hr_elementSelect',
        cmpInitConfig: {
          sourceData,
          selectData: result,
          onSelectData: (data) => {
            if (data.remove.length || data.add.length) {
              $App.connection.run({
                entity: 'hr_dictSalaryScheme',
                method: 'updateSalarySchemeOrg',
                dictSalarySchemeID: me.instanceID,
                data: JSON.stringify(data)
              }).then(() => {
                grid.getStore().load()
              })
            }
          }
        }
      })
    })
}

function onControlChanged (field, value, oldValue) {
  const me = this
  switch (field.name) {
    case 'schemeType':
      if (me.isNewInstance) {
        if (value === '1') {
          me.attr.roundUpTo.setDisabled(false)
          me.attr.roundUpTo.setValue('1')
        } else {
          me.attr.roundUpTo.setDisabled(true)
          me.attr.roundUpTo.setValue()
        }
      }
      break
  }
}

function cancelSalaryScheme () {
  const me = this
  $App.showModal({
    formCode: 'hr_cancelSalarySchemeDate',
    isClosable: true,
    description: UB.i18n('Параметри для зміни схеми посадових окладів')
  }).then(params => {
    if (params && params.dateFrom) {
      me.setLoading(true)
      $App.connection.run({
        entity: 'hr_dictSalaryScheme',
        method: 'cancelSalaryScheme',
        execParams: {
          dictSalarySchemeID: me.instanceID,
          dateFrom: params.dateFrom
        }
      }).then(() => {
        me.setLoading(false)
        me.loadInstance()
      }, (err) => {
        me.setLoading(false)
        throw err
      })
    }
  })
}

function raiseSalaryScheme () {
  const me = this
  $App.showModal({
    formCode: 'hr_raiseSalarySchemeParams',
    isClosable: true,
    description: UB.i18n('Параметри для зміни схеми посадових окладів')
  }).then(params => {
    if (params) {
      params.dictSalarySchemeID = me.instanceID
      me.setLoading(true)
      $App.connection.run({
        entity: 'hr_dictSalaryScheme',
        method: 'raiseSalaryScheme',
        execParams: params
      }).then(() => {
        me.setLoading(false)
        me.loadInstance()
      }, (err) => {
        me.setLoading(false)
        throw err
      })
    }
  })

}
