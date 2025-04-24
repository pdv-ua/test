/* global AC $App UB */

exports.formCode = {
  initComponentDone,
  setPayElEntry
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me, ['ubdetailgrid'])
}

function setPayElEntry (me, grid) {
  UB.Repository('hr_payElTaxIndivid')
    .attrs(['ID', 'payElID'])
    .where('taxIndividID', '=', me.instanceID)
    .selectAsObject()
    .then(result => {
      $App.doCommand({
        cmdType: 'showForm',
        formCode: 'hr_payElSelect',
        cmpInitConfig: {
          withPeriod: true,
          payElEntryType: ['PAYMENT'],
          selectData: result.map(o => o.payElID),
          sourceData: result,
          sourceAttr: 'payElID',
          showAfterSave: true,
          onSelectData: (data, wnd) => {
            if (data.remove.length || data.add.length) {
              $App.connection.run({
                entity: 'hr_dictTaxIndivid',
                method: 'checkPayElEntry',
                taxIndividID: me.instanceID,
                data: JSON.stringify(data)
              }).then((result) => {
                const errors = typeof result.errors === 'string' ? JSON.parse(result.errors) : []
                if (errors.length) {
                  let msg = UB.i18n('Вид оплати <br />')
                  errors.forEach(el => {
                    msg += UB.i18n(` "{0}" {1} "{2}"<br />`, el.name, UB.i18n('входить до виду доходів'), el.taxIndivid)
                  })
                  $App.dialogYesNo('Попередження', msg + UB.i18n(`<br />{0} "{1}"?`, UB.i18n('Перемістити зазначені види оплати до виду доходів'), me.record.get('name')))
                    .then((result) => {
                      if (result) {
                        $App.connection.run({
                          entity: 'hr_dictTaxIndivid',
                          method: 'updatePayElEntry',
                          taxIndividID: me.instanceID,
                          movePayEls: true,
                          data: JSON.stringify(data)
                        }).then(() => {
                          grid.getStore().load()
                          wnd.close()
                        }).catch(error => {
                          AC.viewUtils.showToast(error.message)
                        })
                      }
                    })
                } else {
                  $App.connection.run({
                    entity: 'hr_dictTaxIndivid',
                    method: 'updatePayElEntry',
                    taxIndividID: me.instanceID,
                    data: JSON.stringify(data)
                  }).then(() => {
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
