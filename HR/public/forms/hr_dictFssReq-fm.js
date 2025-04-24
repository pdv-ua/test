/* global AC $App UB */

exports.formCode = {
  initComponentDone,
  initComponentStart,
  setPayElEntry
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me, ['ubdetailgrid'])
}

function initComponentStart () {
  const me = this
  me.on('beforeclose', beforeClose, me)
  me.on('aftersave', afterSave, me)
}

function beforeClose () {
  const me = this
  me.notRefreshAfterSave = true
}

function afterSave (me) {
  if (me.notRefreshAfterSave) {
    me.notRefreshAfterSave = true
  } else {
    checkPayElIn()
  }
}
function checkPayElIn() {
  UB.Repository('hr_payEl')
    .attrs(['ID', 'description'])
    .where('methodID.code', 'in', ['18', '19', '20', '40', '38', '51', '52', '135', '149'])
    .notExists(UB.Repository('hr_dictFssReqDt')
      .correlation('payElID', 'ID')
      .where('mi_deleteDate', '>=', '#maxdate'))
    .selectAsObject()
    .then(result => {
      if (result.length) {
        $App.dialogInfo(UB.i18n('Види оплати</br> {0} </br>не включено у типи заявок СС. Потрібно включити', result.map(o => o.description).join(',</br>')), UB.i18n('Увага'))
      }
    })
}

function setPayElEntry (me, grid) {
  UB.Repository('hr_dictFssReqDt')
    .attrs(['ID', 'payElID'])
    .where('dictFssReqID', '=', me.instanceID)
    .selectAsObject()
    .then(result => {
      $App.doCommand({
        cmdType: 'showForm',
        formCode: 'hr_payElSelect',
        cmpInitConfig: {
          withPeriod: true,
          payElEntryType: ['PAYMENT'],
          methodCode: ['18', '19', '20', '40', '38', '51', '52', '135', '149'],
          selectData: result.map(o => o.payElID),
          sourceData: result,
          sourceAttr: 'payElID',
          showAfterSave: true,
          onSelectData: (data, wnd) => {
            if (data.remove.length || data.add.length) {
              $App.connection.run({
                entity: 'hr_dictFssReq',
                method: 'checkPayElEntry',
                dictFssReqID: me.instanceID,
                data: JSON.stringify(data)
              }).then((result) => {
                const errors = typeof result.errors === 'string' ? JSON.parse(result.errors) : []
                if (errors.length) {
                  let msg = UB.i18n('Виявлено використання видів оплати:  <br />')
                  errors.forEach(el => {
                    msg += UB.i18n(` "{0}" {1} "{2}"<br />`, el.description, UB.i18n('входить до типу'), el.dictFssReq)
                  })
                  $App.dialogYesNo(UB.i18n('Попередження'), msg + UB.i18n(`<br />{0} "{1}"?`, UB.i18n('Перемістити зазначені види оплати до типу'), me.record.get('description')))
                    .then((result) => {
                      if (result) {
                        $App.connection.run({
                          entity: 'hr_dictFssReq',
                          method: 'updatePayElEntry',
                          dictFssReqID: me.instanceID,
                          movePayEls: true,
                          data: JSON.stringify(data)
                        }).then(() => {
                          checkPayElIn()
                          grid.getStore().load()
                          wnd.close()
                        }).catch(error => {
                          AC.viewUtils.showToast(error.message)
                        })
                      }
                    })
                } else {
                  $App.connection.run({
                    entity: 'hr_dictFssReq',
                    method: 'updatePayElEntry',
                    dictFssReqID: me.instanceID,
                    data: JSON.stringify(data)
                  }).then(() => {
                    checkPayElIn()
                    grid.getStore().load()
                    wnd.close()
                  }).catch(error => {
                    AC.viewUtils.showToast(error.message)
                  })
                }
              })
            }
          }
        }
      })
    })
}
