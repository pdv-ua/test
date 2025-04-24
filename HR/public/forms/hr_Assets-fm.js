/* global AC appAC */
exports.formCode = {
    initComponentStart,
    initComponentDone,
    onFormDataReady,
    onChange
  }
  

  function initComponentDone () {
    const me = this
    me.getField('code').on('change', me.onChange, me)
    me.getField('name').on('change', me.onChange, me)

    AC.viewUtils.setAttr(me)
  }

  function initComponentStart () {
    const me = this
    me.on('formDataReady', onFormDataReady, me)
  } 
  
  function onFormDataReady () {
    const me = this
    if (me.isNewInstance) {
      me.record.set('organizationID', appAC.globalOrganization())
    }
  }

  function onChange() {
    const me = this
    const name = me.getField('name').getValue()
    const code = me.getField('code').getValue()
    me.getField('description').setValue(name + ' ' + code)
  }
