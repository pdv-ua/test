/* global UB $App Ext AC appAC */

exports.formCode = {
  initComponentStart,
  initComponentDone,
  initUBComponent,
  onFormDataReady,
  showPasswordChangeDialog,
  addBaseActions,
  showChangeForm,
  changeGridValue
}

function initComponentStart () {
  const me = this
  me.on('controlChanged', onControlChanged, me)
  me.on('formDataReady', onFormDataReady, me)
}

function initComponentDone () {
  const me = this
  me.actions.fDelete.hide()
  AC.viewUtils.setAttr(me)
}

function initUBComponent () {
  let me = this
  let vpnLoginCtrl = this.down('#vpnLogin')
  vpnLoginCtrl.setValue(this.record.get('name'))
  let setPasswordCtrl = this.down('#setPassword')
  let vpnPassCtrl = this.down('#vpnPass')
  setPasswordCtrl.on('click', function () {
    // let login = me.record.get('name')
    let userID = me.record.get('ID')
    let password = vpnPassCtrl.getValue()
    if (!password) {
      $App.dialogInfo(UB.i18n('Необхідно встановити пароль'))
      return
    }
    let promise = Promise.resolve(1)
    if (me.isNewInstance) {
      promise = me.saveForm()
    }
    promise.then(function (res) {
      if (res !== 1) return
      return $App.connection.query({
        entity: 'hr_vpninfo',
        method: 'setpassword',
        execParams: {
          userID: userID,
          password: password
        }
      }).then(function () {
        return $App.dialogInfo(UB.i18n('Пароль встановлено'))
      })
    })
  })
}

function onFormDataReady () {
  const me = this
  const globalOrganization = appAC.globalOrganization()

  AC.viewUtils.setFilterValue(me.attr.employeeNumberID, { orgID: me.record.get('employeeNumberID.orgID') || globalOrganization })
}

function onControlChanged (field, value) {
  const me = this
  if (!me.formDataReady) {
    return
  }
  switch (field.name) {
    case 'employeeNumberID':
      if (value) {
        me.attr.name.setValue(`${field.getFieldValue('orgEDRPOUCode') || ''}_${field.getFieldValue('employeeID.taxCode')}`)
        me.attr.firstName.setValue(field.getFieldValue('employeeID.firstName'))
        me.attr.lastName.setValue(field.getFieldValue('employeeID.lastName'))
        me.attr.fullName.setValue((field.getFieldValue('employeeID.fullFIO') || '').substr(0, 128))
      }
      break
  }
}

function addBaseActions () {
  this.callParent(arguments)
  this.actions.ActionChangePasswordID = new Ext.Action({
    actionId: 'ActionChangePasswordID',
    actionText: UB.i18n('changePassword'),
    hidden: !($App.connection.userData().roles.toUpperCase().split(',').includes('ADMIN') || $App.connection.userData().roles.toUpperCase().split(',').includes('ACCOUNTADMINS')),
    handler: showPasswordChangeDialog.bind(this)
  })
}

function showPasswordChangeDialog () {
  const me = this
  me.saveForm().then(result => {
    if (result !== -1) {
      UB.core.UBApp.doCommand({
        cmdType: 'showForm',
        formCode: 'uba_user-changeUserPassword',
        entity: 'uba_user',
        title: 'changePassword',
        isModal: true,
        props: {
          parentContext: {
            userID: this.instanceID,
            userLogin: this.getField('name').getValue()
          }
        }
      })
    }
  })
}

function showChangeForm (me, grid, attrName, ownerName, entityName, sourceData) {
  UB.Repository(entityName)
    .attrs(['ID', attrName])
    .where(ownerName, '=', me.instanceID)
    .selectAsObject({
      [attrName]: 'value'
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
                entity: 'uba_user',
                method: 'updateDt',
                userID: me.instanceID,
                entityName,
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
function changeGridValue (me, grid) {
  switch (grid.name) {
    case 'usergroup':
      UB.Repository('uba_group')
        .attrs(['ID', 'code', 'name'])
        .orderBy('name')
        .selectAsObject().then(result => {
          result.forEach(row => {
            row.description = `${row.name || ''} (${row.code || ''})`
            delete row.name
            delete row.code
          })
          me.showChangeForm(me, grid, 'groupID', 'userID', 'uba_usergroup', result)
        })
      break
    case 'userrole':
      UB.Repository('uba_role')
        .attrs(['ID', 'name', 'description'])
        .orderBy('description')
        .selectAsObject().then(result => {
          result.forEach(row => {
            row.description = `${row.description || ''} (${row.name || ''})`
            delete row.name
          })
          me.showChangeForm(me, grid, 'roleID', 'userID', 'uba_userrole', result)
        })
      break
    case 'organization':
      UB.Repository('ac_organization')
        .attrs(['ID', 'description'])
        .where('showGlobal', '=', 1)
        .orderBy('description')
        .selectAsObject().then(result => {
          me.showChangeForm(me, grid, 'organizationID', 'userID', 'ac_userOrganization', result)
        })
      break
  }
}
