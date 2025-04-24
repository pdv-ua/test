/* global AC */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onFormDataReady,
  onAfterSave
}

function initComponentStart () {
  const me = this
  me.on('formDataReady', onFormDataReady, me)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
}

function onFormDataReady () {
  const me = this
  if (!me.isEditMode) {
    let searchEntity
    if (me.customParams && me.customParams.searchEntity) {
      searchEntity = me.customParams.searchEntity
    } else if (me.sender && me.sender.ownerCt) {
      let grid = me.sender.ownerCt
      if (grid.customParams && grid.customParams.searchEntity) {
        searchEntity = grid.customParams.searchEntity
      } else {
        let gridStore = grid.getStore()
        let whereList = gridStore && gridStore.ubRequest.whereList
        searchEntity = whereList && whereList.searchEntity && whereList.searchEntity.value
      }
    }
    if (searchEntity) {
      me.record.set('searchEntity', searchEntity)
    } else {
      me.attr.searchEntity.setReadOnly(false)
    }
    me.attr.template.setReadOnly(true)
  }
}

function onAfterSave () {
  const me = this
  if (me.customParams && me.customParams.onSave) {
    me.customParams.onSave(me)
  }
}
