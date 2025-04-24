/* global AC UB $App appAC */

exports.formCode = {
  initComponentStart,
  initComponentDone,
  onFormDataReady,
  onControlChanged,
  onBeforeSave
}

function initComponentStart () {
  const me = this
  me.on('formDataReady', onFormDataReady, me)
  me.on('controlChanged', onControlChanged, me)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
}

function onFormDataReady () {
  const me = this
  if (me.isNewInstance) {
    me.record.set('organizationID', appAC.globalOrganization())
  }

  AC.viewUtils.setFilterValue(me.attr.orgAccountID, { organizationID: me.record.get('organizationID') }, ['setDisabled'])
  AC.viewUtils.setFilterValue(me.attr.contrAccountID, { organizationID: me.record.get('contractorID') }, ['setDisabled'])
  AC.viewUtils.setFilterValue(me.attr.commissionOrgAccID, { organizationID: me.record.get('organizationID') }, ['setDisabled'])
  AC.viewUtils.setFilterValue(me.attr.commissionContrAccID, { organizationID: me.record.get('contractorID') }, ['setDisabled'])
  AC.viewUtils.setFilterValue(me.attr.exportMethodID, { orgID: me.record.get('organizationID') || appAC.globalOrganization(), isActive: 1, typeFile: 'filePay' })
  if (me.record.get('organizationID') === appAC.globalOrganization()) {
    UB.Repository('hr_organization')
      .attrs(['ID'])
      .limit(1)
      .where('parentUnitID', '=', appAC.globalOrganization())
      .where('state', '=', 'ACTIVE')
      .selectAsObject()
      .then(result => {
        const hasSubOrg = !!result.length
        if (!hasSubOrg) {
          me.attr.subOrg.setValue(false)
        }
        me.attr.subOrg.setVisible(hasSubOrg)
      })
  } else {
    me.disableEdit()
    me.actions.fDelete.disable()
  }
}

function onControlChanged (field, value) {
  const me = this
  if (!me.formDataReady) {
    return
  }
  switch (field.name) {
    case 'organizationID':
      AC.viewUtils.setFilterValue(me.attr.orgAccountID, { organizationID: value }, ['clearValue', 'setDisabled'])
      AC.viewUtils.setFilterValue(me.attr.commissionOrgAccID, { organizationID: value }, ['clearValue', 'setDisabled'])
      break
    case 'contractorID':
      AC.viewUtils.setFilterValue(me.attr.contrAccountID, { organizationID: value }, ['clearValue', 'setDisabled'])
      AC.viewUtils.setFilterValue(me.attr.commissionContrAccID, { organizationID: value }, ['clearValue', 'setDisabled'])
      break
  }
}

function onBeforeSave () {
  const me = this
  return new Promise(function (resolve) {
    if (me.record.get('isDefault')) {
      UB.Repository('hr_payOut')
        .attrs(['ID'])
        .where('ID', '!=', me.instanceID)
        .where('isDefault', '=', 1)
        .where('organizationID', '=', me.record.get('organizationID'))
        .selectAsObject()
        .then(data => {
          if (data.length) {
            $App.dialogYesNo(UB.i18n('Попередження'), UB.i18n('Основний шаблон для виплати зарплати вже існує! Змінити?'))
              .then(res => {
                if (!res) {
                  me.record.set('isDefault', 0)
                }
                resolve(true)
              })
          } else {
            resolve(true)
          }
        })
    } else {
      resolve(true)
    }
  })
}
