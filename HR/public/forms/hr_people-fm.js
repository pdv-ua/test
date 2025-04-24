/* global AC UBS UB $App */
exports.formCode = {
  initUBComponent,
  initComponentStart,
  initComponentDone,
  onFormDataReady
}

function initComponentStart () {
  let me = this
  me.on('formDataReady', onFormDataReady, me)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
  const isCheckEmployeeFamily = AC.settings.get('hrCheckEmployeeFamily')
  if (isCheckEmployeeFamily) {
    me.attr['taxCode'].on('blur', checkTaxCode)
  }
}

function onFormDataReady () {
  const me = this
  if (me.isNewInstance) {
    if (me.sender && me.sender.up('form')) {
      me.record.set('employeeID', me.sender.up('form').record.get('employeeID'))
    } else {
      const parentForm = AC.viewUtils.getControlForm(me)
      if (parentForm && parentForm.record.get('employeeID')) {
        me.record.set('employeeID', parentForm.record.get('employeeID'))
      }
    }
    if (me.defaultValues) {
      if (me.defaultValues.lastName) {
        me.attr.lastName.setValue(me.defaultValues.lastName)
      }
      if (me.defaultValues.firstName) {
        me.attr.firstName.setValue(me.defaultValues.firstName)
      }
      if (me.defaultValues.middleName) {
        me.attr.middleName.setValue(me.defaultValues.middleName)
      }
    }
  }
}

function initUBComponent () {
  const me = this
  me.dataBind = {
    fullFIO: {
      value: '({lastName} || "?") + " " + ({firstName} || "?") + ({middleName} ? " " + {middleName}:"")'
    },
    shortFIO: {
      value: '({lastName} || "?") + " " + ({firstName} || "?")[0].toUpperCase() + "." + ({middleName} ? {middleName}[0].toUpperCase() + "." : "")'
    }
  }
  UBS.dataBinder.applyBinding(me)
}

function checkTaxCode (ctrl) {
  const me = ctrl.up('form')
  const taxCode = ctrl.getValue()
  if (!taxCode) return
  me.setLoading(true)
  UB.Repository('hr_employee')
    .attrs(['ID', 'firstName', 'lastName', 'middleName', 'sexType', 'birthDate', 'fullFIO', 'shortFIO'])
    .where('taxCode', '=', taxCode)
    .selectSingle().then(emp => {
      if (emp) {
        let employeeFullFIO = ''
        if (me.sender && me.sender.up('form')) {
          employeeFullFIO = me.sender.up('form').record.get('employeeID.fullFIO')
        } else {
          const parentForm = AC.viewUtils.getControlForm(me)
          if (parentForm && parentForm.record.get('employeeID')) {
            employeeFullFIO = parentForm.record.get('employeeID.fullFIO')
          }
        }
        $App.dialogYesNo('Увага', UB.i18n('У системі наявна інформація про особу з даним РНОКПП {0} {1}, Дата народження: {2}. Чи знайдена особа являється членом родини {3}?', taxCode, emp.fullFIO, emp.birthDate ? AC.dateService.formatDate(emp.birthDate) : '?', employeeFullFIO || ''))
          .then(result => {
            if (result) {
              me.record.set('firstName', emp.firstName)
              me.record.set('lastName', emp.lastName)
              me.record.set('middleName', emp.middleName)
              me.record.set('fullFIO', emp.fullFIO)
              me.record.set('shortFIO', emp.shortFIO)
              me.record.set('sexType', emp.sexType)
              me.record.set('birthDate', emp.birthDate)
              me.record.set('linkEmployeeID', emp.ID)
            }
          })
      }
    }).finally(() => {
      me.setLoading(false)
    })
}
