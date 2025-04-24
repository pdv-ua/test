// eslint-disable-next-line no-unused-vars
/* global AC HR $App UB Ext _ */

exports.formCode = {
  initComponentDone,
  onControlChanged,
  addBaseActions,
  onBeforeSave
}

function initComponentDone () {
  const me = this
  me.on('formDataReady', formDataReady, me)
  me.on('controlChanged', onControlChanged, me)
}

function onBeforeSave () {
  this.method = undefined
}
function formDataReady () {
  const me = this
  me.getField('colorCell').inputEl.setStyle({
    backgroundColor: '#' + me.record.get('colorCell'),
    color: '#' + me.record.get('colorCell')
  })
  me.getField('colorText').inputEl.setStyle({
    backgroundColor: '#' + me.record.get('colorText'),
    color: '#' + me.record.get('colorText')
  })
}

function onControlChanged (field, value) {
  const me = this
  if (me.formDataReady) {
    switch (field.name) {
      case 'timeCostType':
        if (me.record.get('timeCostType') !== value) {
          switch (value) {
            case 'WORK':
              me.record.set('colorText', '000000')
              break
            case 'FREE':
              me.record.set('colorText', 'FF0000')
              break
            case 'ABSENCE':
              me.record.set('colorText', '0000FF')
              break
            case 'OTHER':
            case 'NOT':
              me.record.set('colorText', null)
              break
          }
          me.getField('isShowWork').setValue(value === 'WORK')
          me.getField('colorText').inputEl.setStyle({
            backgroundColor: '#' + me.record.get('colorText')
          })
        }
        break
    }
  }
}

function addBaseActions () {
  const me = this
  me.callParent(arguments)
  if (!me.actions.settingsDictTimeCost) {
    me.actions.settingsDictTimeCost = new Ext.Action({
      iconCls: 'u-icon-layers',
      scale: 'medium',
      cls: 'fill-action',
      actionId: 'settingsDictTimeCost',
      text: UB.i18n('Налаштувати перетини'),
      eventId: 'settingsDictTimeCost',
      handler: function () {
        me.saveForm().then(result => {
          if (result !== -1) {
            $App.doCommand({
              cmdType: 'showForm',
              formCode: 'hr_settingsDictTimeCost',
              cmpInitConfig: {
                ID: me.instanceID,
                nameDictTimeCost: me.record.get('name'),
                onEditData: () => {
                  me.onRefresh()
                }
              }
            })
          }
        })
      }
    })
  }
}
