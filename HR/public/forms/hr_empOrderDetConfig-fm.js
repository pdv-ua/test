/* global UB appAC AC _ HR AC */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  controlChanged,
  setControls
}

const attrList = ['dictTimeCostID', 'canEditDictTimeCost', 'payElIDAccrual', 'canEditPayElAccrual', 'payElIDMain', 'canEditPayElMain', 'payElIDAdd',
  'canEditPayElAdd', 'payElIDReplacement', 'canEditPayElReplacement', 'dictTimeCost2ID', 'canEditDictTimeCost2']

function initComponentStart () {
  const me = this
  me.on('controlChanged', controlChanged, me)
  me.on('recordloaded', onRecordLoaded, me)
  me.on('afterrender', () => {
    HR.orderManager.disableContextMenuItems(me.getField('positionType'), [ 'editItem', 'showLookup', 'addItem' ])
    HR.orderManager.disableContextMenuItems(me.getField('dictStaffCatID'), [ 'editItem', 'showLookup', 'addItem' ])
  })
}

function controlChanged (field, value) {
  const me = this
  switch (field.name) {
    case 'empOrderType':
      me.setControls(value)
      break
  }
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
}

function setControls (empOrderType) {
  const me = this
  // me.record.set('empOrderType', empOrderType)
  attrList.forEach(attrName => {
    me.attr[attrName].setDisabled(true)
  })
  if (empOrderType === 'DISM') {
    AC.viewUtils.setWhereListProperty(me.attr.payElIDAccrual, [], undefined, ['clearWhereList'])
  } else {
    AC.viewUtils.setWhereListProperty(me.attr.payElIDAccrual, [
      ['methodID.methodGroupID.code', 'equal', '1']
    ])
  }
  if (empOrderType) {
    UB.Repository('hr_empOrderDetConfigAttr')
      .attrs('attrName')
      .where('empOrderType', '=', empOrderType)
      .selectAsObject().then(data => {
        data.forEach(row => {
          switch (row.attrName) {
            case 'dictTimeCostID':
              me.attr.dictTimeCostID.setDisabled(false)
              me.attr.canEditDictTimeCost.setDisabled(false)
              break
            case 'dictTimeCost2ID':
              me.attr.dictTimeCost2ID.setDisabled(false)
              me.attr.canEditDictTimeCost2.setDisabled(false)
              break
            case 'payElIDAccrual':
              me.attr.payElIDAccrual.setDisabled(false)
              me.attr.canEditPayElAccrual.setDisabled(false)
              break
            case 'payElIDMain':
              me.attr.payElIDMain.setDisabled(false)
              me.attr.canEditPayElMain.setDisabled(false)
              break
            case 'payElIDAdd':
              me.attr.payElIDAdd.setDisabled(false)
              me.attr.canEditPayElAdd.setDisabled(false)
              break
            case 'payElIDReplacement':
              me.attr.payElIDReplacement.setDisabled(false)
              me.attr.canEditPayElReplacement.setDisabled(false)
              break
          }
        })
        attrList.forEach(attrName => {
          if (me.attr[attrName].disabled) me.attr[attrName].setValue()
        })
      })
  }
}

function onRecordLoaded () {
  const me = this
  UB.Repository('hr_dictOrderRef')
    .attrs(['empOrderItemType'])
    .selectAsObject().then(data => {
      AC.viewUtils.setWhereListProperty(me.attr.empOrderType, [
        ['code', 'in', _.uniq(data.map(o => o.empOrderItemType))]
      ])
    })
  if (me.isNewInstance) {
    me.record.set('organizationID', me.isDefault ? null : appAC.globalOrganization())
    const positionType = me.record.get('positionType')
    if (typeof positionType === 'number') {
      me.record.set('positionType', String(positionType))
    }
  }
  me.setControls(me.record.get('empOrderType'))
}
