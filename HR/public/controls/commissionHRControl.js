/* global Ext $App UB AC _ appAC HR */
Ext.define('HR.controls.commissionHRControl', {
  extend: 'Ext.panel.Panel',
  alias: 'widget.commissionHR',
  layout: { type: 'vbox', align: 'stretch' },
  initComponent: function () {
    const me = this
    me.items = [
      {
        xtype: 'ubdetailgrid',
        name: 'commissionDetail',
        autoScroll: true,
        pageSize: 10000,
        forceDataLoad: true,
        rowEditing: true,
        notWriteChanges: true,
        disableSearchBar: true,
        hidePagingBar: true,
        lineNumberColumn: 'lineNum',
        hideActions: ['refresh', 'exportXls', 'exportCsv', 'exportHtml', 'showPreview', 'itemLink', 'commandLink'],
        sortableColumns: false,
        enableColumnHide: false,
        loadStoreImmediately: true,
        flex: 1,
        entityConfig: {
          entity: 'hr_commission',
          method: 'select',
          fieldList: [
            {
              name: 'lineNum',
              description: '№',
              config: { width: 7, minWidthChar: 7, maxWidthChar: 7 },
              editor: { minValue: 0, maxValue: 99999, allowExponential: false }
            },
            {
              name: 'employeePositionID.description',
              description: UB.i18n('ПІБ'),
              editor: {
                fieldList: ['ID', 'description', 'organizationID', 'dateFrom', 'dateTo']
              }
            },
            {
              name: 'memberType',
              description: UB.i18n('Тип участника')
            },
            {
              name: 'memberName',
              description: UB.i18n('Найменування учасника')
            },
            {
              name: 'employeePositionID',
              visibility: false
            }
          ]
        },
        masterFields: me.masterFields || ['ID'],
        detailFields: me.detailFields || ['orderID'],
        onBeforeEdit: function (editor, context) {
          const form = context.grid.up('form')
          let filter = []
          if (me.organizationAttribute && form.record.get(me.organizationAttribute)) {
            filter.push(['organizationID', '=', form.record.get(me.organizationAttribute)])
          } else {
            filter.push(['organizationID', '=', appAC.globalOrganization()])
          }
          let onDate
          if (me.dateAttribute) {
            onDate = form.getField(me.dateAttribute).getValue()
          } else if (me.dateRecordField) {
            onDate = form.record.get(me.dateRecordField)
          } else {
            onDate = appAC.globalApplicationDate()
          }
          if (onDate) {
            if (AC.dateService.isValid(onDate)) {
              filter.push(['dateFrom', '<=', onDate])
              filter.push(['dateTo', '>=', onDate])
            }
          }
          if (filter.length) {
            AC.viewUtils.setWhereListProperty(editor.editor.form.findField('employeePositionID.description'),
              filter,
              null,
              ['clearWhereList']
            )
          }
          const chiefCtrl = editor.editor.form.findField('memberType')
          chiefCtrl.on('change', ctrl => {
            const textValue = ctrl.getRawValue()
            const memberNameCtrl = editor.editor.query('[name=memberName]')[0]
            memberNameCtrl.setValue(textValue)
          })
        },
        onValidateEdit: function (editor, context) {
          const empFieldName = 'employeePositionID.description'
          const memberFieldName = 'memberType'
          const data = context.grid.getData()
          const empCtrl = editor.editor.form.findField(empFieldName)
          const chiefCtrl = editor.editor.form.findField(memberFieldName)
          const empName = empCtrl.getValue()
          const chiefValue = chiefCtrl.getValue()
          if (chiefValue === '1' && _.filter(data, { [memberFieldName]: '1' }).length >
            (context.record.get(memberFieldName) === '1' ? 1 : 0)) {
            const errorMessage = UB.i18n(`Позначка 'Голова' може бути встановлена тільки на одному елементі`)
            chiefCtrl.markInvalid(errorMessage)
            $App.dialogInfo(errorMessage)
            return false
          }
          if (_.filter(data, { [empFieldName]: empName }).length >
            (context.record.get(empFieldName) !== empName ? 0 : 1)) {
            const errorMessage = UB.i18n(`Значення "{0}" вже існує`, empName)
            empCtrl.markInvalid(errorMessage)
            $App.dialogInfo(errorMessage)
            return false
          }
          context.grid.enableAction('del')
          return true
        },
        listeners: {
          changeData: function (grid) {
            let me = grid.up('form')
            if (me.setIsDirty) {
              me.setIsDirty(true)
            } else {
              HR.orderManager.setIsDirty(me, true)
            }
          }
        }
      }
    ]
    me.on('afterrender',
      function () {
        const form = me.up('form')
        form.record.store.on('update', (store, reco, oper, modified) => {
          if (!form.formDataReady) { return }
          if (modified.includes(me.commissionIDAttribute)) {
            form.attr.commissionDetail.getStore().removeAll()
            if (form.attr[me.commissionIDAttribute].getValue()) {
              UB.Repository('hr_dictCommissionDt')
                .attrs(['lineNum', 'employeePositionID', 'employeePositionID.description', 'memberType', 'memberType.name'])
                .where('[commissionID]', '=', form.attr[me.commissionIDAttribute].getValue())
                .orderBy('lineNum')
                .selectAsObject().then(function (result) {
                  result.forEach((item) => {
                    delete item.ID
                    delete item.mi_modifyDate
                    item.memberName = item['memberType.name']
                    delete item['memberType.name']
                    form.attr.commissionDetail.addNewRecord(item)
                  })
                })
            }
          }
        })
      }, me)

    me.callParent(arguments)
  }
})