/* global AC HR appAC UB $App */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onFormDataReady,
  loadByCategory
}

function initComponentStart () {
  const me = this
  me.on('formDataReady', onFormDataReady, me)
  me.on('controlChanged', controlChanged, me)
  me.on('afterrender', () => {
    HR.orderManager.disableContextMenuItems(me.getField('positionType'), [ 'editItem', 'showLookup', 'addItem' ])
    HR.orderManager.disableContextMenuItems(me.getField('positionCategory'), [ 'editItem', 'showLookup', 'addItem' ])
    HR.orderManager.disableContextMenuItems(me.getField('psCategory'), [ 'editItem', 'showLookup', 'addItem' ])
  })
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
  me.setPayEl = setPayEl
}

function onFormDataReady () {
  const me = this
  if (!me.isNewInstance) {
    setControlsByPositionType(me, me.record.get('positionType'))
    setControlsByPaymentType(me, me.record.get('paymentType'))
  }
  AC.viewUtils.setWhereListProperty(me.attr.dictStaffSubCatID, [
    ['dictStaffCatID', 'isNull', undefined, 'dictNull'],
    ['dictStaffCatID', '=', me.record.get('dictStaffCatID') || 0, 'dictValue']
  ], ['([dictNull] OR [dictValue])'], [])
  AC.viewUtils.setWhereListProperty(me.attr.dictSpecialtyID, [
    ['specialityType', '=', '2']
  ], undefined, [])
  AC.viewUtils.setWhereListProperty(me.attr.dictSalarySchemeLevelID, [
    ['dateFrom', '<=', appAC.globalApplicationDate()],
    ['dateTo', '>=', appAC.globalApplicationDate()]
  ], undefined, [])
  const hrTariffingEducational = AC.settings.get('hrTariffingEducational', appAC.globalOrganization())
  me.attr.workScheduleID[hrTariffingEducational ? 'hide' : 'show']()
  me.attr.workNormID[hrTariffingEducational ? 'show' : 'hide']()
}

function controlChanged (field, value) {
  const me = this
  if (me.formDataReady) {
    switch (field.name) {
      case 'paymentType':
        setControlsByPaymentType(me, value)
        break
      case 'dictProfessionID':
        const fieldValue = (field.getValue() && field.lastSelection.length > 0) ? field.lastSelection[0] : null
        if (fieldValue) {
          /*
          const fieldAttrs = ['name', 'nameGen', 'nameDat', 'nameAcc', 'nameOr', 'nameLoc', 'nameVoc']
          fieldAttrs.forEach(attrName => {
            me.attr[attrName].setValue(fieldValue.get(attrName))
            me.attr[attrName.replace('name', 'fullName')].setValue(fieldValue.get(attrName))
          })
          */
          me.attr.dictWagePayID.setValueById(fieldValue.get('dictWagePayID'))
          me.attr.positionCategory.setValue(fieldValue.get('code')[0])
          me.attr.psCategory.setValue(fieldValue.get('psCategory'))
        }
        break
      case 'positionType':
        setControlsByPositionType(me, value)
        break
      case 'dictStaffCatID':
        AC.viewUtils.setWhereListProperty(me.attr.dictStaffSubCatID, [
          ['dictStaffCatID', 'isNull', undefined, 'dictNull'],
          ['dictStaffCatID', '=', value || 0, 'dictValue']
        ], ['([dictNull] OR [dictValue])'], ['clearValue', 'clearStore'])
        break
    }
  }
}

function setControlsByPositionType (me, value) {
  const isStateService = value === '1' // Держслужбовець
  me.attr.dictWagePayID.setDisabled(!isStateService)
  me.attr.psCategory.setDisabled(!isStateService)
  me.attr.dictStatePayID.setDisabled(!isStateService)

  if (!isStateService) {
    me.attr.dictWagePayID.setValue(null)
    me.attr.psCategory.setValue(null)
    me.attr.dictStatePayID.setValue(null)
  }
  const isTariff = ['8', '12'].includes(value) // Працівник за тарифним розрядом
  const attrsHide = ['dictWagePayID', 'psCategory', 'dictStatePayID']
  attrsHide.forEach(attrName => {
    me.attr[attrName].setVisible(!isTariff)
  })

  const attrsShow = ['dictSpecialtyID', 'dictEmpCategoryID', 'dictTarifCoeffID']
  attrsShow.forEach(attrName => {
    me.attr[attrName].setVisible(isTariff)
  })
}

function setControlsByPaymentType (me, value) {
  const tabs = me.down('[name=tabs]')
  const child = tabs.child('[name=tabAccrualSum]')
  const { tab } = child
  if (tab) {
    if (value === 'ACCRUAL') {
      tab.show()
    } else {
      const activeTab = tabs.getActiveTab()
      if (activeTab.name === 'tabAccrualSum') {
        tabs.setActiveTab(0)
      }
      tab.hide()
    }
  }
}

function setPayEl (grid) {
  const me = this
  UB.Repository('hr_dictPositionPayEl')
    .attrs(['ID', 'payElID'])
    .where('dictPositionID', '=', me.instanceID)
    .selectAsObject()
    .then(result => {
      $App.doCommand({
        cmdType: 'showForm',
        formCode: 'hr_payElSelect',
        cmpInitConfig: {
          withPeriod: true,
          payElEntryType: ['PAYMENT'],
          methodGroupCode: ['1', '2'],
          selectData: result.map(o => o.payElID),
          sourceData: result,
          sourceAttr: 'payElID',
          onSelectData: (data) => {
            if (data.remove.length || data.add.length) {
              data.dictPositionID = me.instanceID
              $App.connection.run({
                entity: 'hr_dictPositionPayEl',
                method: 'updatePayEl',
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

function loadByCategory (grid) {
  const me = this
  if (me.record.get('dictStaffCatID')) {
    me.setLoading(true)
    $App.connection.run({
      entity: 'hr_dictPositionPayEl',
      method: 'loadByCategory',
      dictPositionID: me.instanceID,
      organizationID: appAC.globalOrganization(),
      onDate: appAC.globalApplicationDate(),
      dictStaffCatID: me.record.get('dictStaffCatID')
    }).then(mParams => {
      me.setLoading(false)
      if (mParams.itemsCount) {
        grid.onRefresh()
      } else {
        $App.dialogError(UB.i18n('Не заповнений довідник "Нарахування за категоріями персоналу"'))
      }
    }, err => {
      me.setLoading(false)
      throw err
    })
  } else {
    $App.dialogError(UB.i18n('Немає інформації про категорію персоналу посади'))
  }
}
