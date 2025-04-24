exports.formCode = {
  attrValueChanged,
  loadAttrList,
  initComponentDone
}
/* global UB $App Ext AC */
function attrValueChanged (attrs) {
  let me = this
  let entityName = me.getField('entityID').getFieldValue('name')
  if (!entityName) {
    return
  }
  let attrName = attrs.getValue()
  let attr = $App.domainInfo.entities[entityName].attributes[attrName]
  if (!attr) {
    return
  }
  let associatedEntity
  let valueID = me.down('[name=valueID]')
  let valueEnum = me.down('[name=valueEnum]')
  if (valueID) {
    me.remove(valueID)
  }
  switch (attr.dataType) {
    case 'Entity':
      valueEnum.hide()
      me.getField('valueName').hide()
      associatedEntity = $App.domainInfo.entities[attr.associatedEntity]
      let displayField =
        (associatedEntity.descriptionAttribute) ||
        (associatedEntity.attributes['description'] && 'description') ||
        (associatedEntity.attributes['name'] && 'name') || 'ID'
      valueID = Ext.create('UB.ux.form.field.UBComboBox', {
        fieldList: ['ID', displayField],
        name: 'valueID',
        fieldLabel: UB.i18n('Значення (довідник)'),
        ubRequest: {
          fieldList: [displayField, 'ID'],
          entity: attr.associatedEntity,
          method: UB.core.UBCommand.methodName.SELECT
        },
        valueField: 'ID',
        displayField: displayField,
        listeners: {
          select: function (ctrl) {
            let me = ctrl.up('form')
            me.record.set('valueID', ctrl.getValue())
            me.record.set('valueName', ctrl.getFieldValue(ctrl.displayField))
          }
        }
      })
      me.add(valueID)
      valueID.store.load().then(() => {
        UB.Repository(attr.associatedEntity).attrs(displayField, 'ID')
          .selectById(me.record.get('valueID')).then(data => {
            if (data) {
              valueID.setValueById(me.record.get('valueID'))
            }
          })
      })
      break
    case 'Enum':
      valueEnum.show()
      AC.viewUtils.setWhereListProperty(valueEnum, [
        ['eGroup', 'equal', attr.enumGroup]
      ])
      me.getField('valueName').hide()
      break
    default:
      valueEnum.hide()
      me.getField('valueName').show()
  }
}
function loadAttrList ({
  ctrl,
  isClear = false
}) {
  let me = this
  let entityName = ctrl.getFieldValue('name')
  const dict = me.down('[name=attrs]')
  dict.store.loadData([])
  if (!entityName) {
    return
  }
  let attrs = $App.domainInfo.entities[entityName].attributes
  let storeData = Object.keys(attrs)
    .filter(attr => {
      let cs = attrs[attr].customSettings || {}
      return !attr.startsWith('mi_') && !attr.startsWith('imp') && !attr.startsWith('description') &&
                !cs.importMapDisabled &&
                attr !== 'ID' &&
                attr !== 'fullFIO' &&
                attr !== 'taxCode' &&
                attr !== 'employeeID' &&
                attrs[attr].dataType !== 'Date' &&
                attrs[attr].dataType !== 'DateTime'
    })
    .map(attr => ({
      text: attr + ' (' + attrs[attr].caption + ')',
      value: attr
    }))
  dict.store.loadData(storeData)
  if (isClear) {
    dict.setValue()
  }
}
function initComponentDone () {
  let
    me = this
  let valueEnum = me.down('[name=valueEnum]')
  me.on('recordloaded', function (a) {
    let
      me = this
    me.loadAttrList({
      ctrl: me.getField('entityID'),
      isClear: false
    })
    setTimeout(function () {
      me.down('[name=attrs]').setValue(me.record.get('attrName'))
      valueEnum.getStore().load().then(store => {
        valueEnum.setValue(me.record.get('valueEnum'))
      })
      me.attrValueChanged(me.down('[name=attrs]'))
    }, 500)
  })
}
