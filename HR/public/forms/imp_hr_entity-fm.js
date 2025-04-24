exports.formCode = {
  loadEntityList,
  initComponentStart,
  fillRecord
}
/* global Ext AC $App */

function fillRecord (ctrl) {
  let me = this
  let entityName = ctrl.getValue()
  me.record.set('caption', AC.entityUtils.getEntityCaption(entityName))
  me.record.set('name', entityName)
  me.record.set('description', entityName + ' (' + AC.entityUtils.getEntityCaption(entityName) + ')')
}

function loadEntityList () {
  let me = this
  let storeData

  storeData = Object.keys($App.domainInfo.entities)
    .filter(entityName => entityName.startsWith('hr_'))
    .map(entityName => ({
      text: entityName + ' (' + AC.entityUtils.getEntityCaption(entityName) + ')',
      value: entityName,
      caption: AC.entityUtils.getEntityCaption(entityName)
    }))

  const dict = me.down('[name=dict]')
  dict.store = Ext.create('Ext.data.Store', {
    fields: ['text', 'value', 'caption'],
    data: storeData
  })
}

function initComponentStart () { // Вызывается прямо перед запуском инициализации формы.
  // В этом событии  можно изменить конфигурацию формы.
  let me = this
  me.on('afterrender', function () {
    me.loadEntityList()
  })
  me.on('recordloaded', function () {
    const dict = me.down('[name=dict]')
    dict.setValue(me.record.get('name'))
  })
}
