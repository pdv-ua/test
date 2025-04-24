/* global UB _ appAC AC HR $App */

module.exports = {
  name: 'mainParams',
  setDefaultValues: async (me) => {
    const organizationID = me.defaultValues.organizationID
    const d = appAC.globalApplicationDate()
    const ctrls = _.keyBy(me.query('[formParams=true]'), 'name')

    ctrls.dateFill.setValue(d)
    const data = await HR.reportUtils.getRespPosition(organizationID, d, ['mainChief', 'accChief'])
    if (data.mainChief.employeeNumberID) {
      ctrls.bosID.setValueById(data.mainChief.employeeNumberID)
    }
    if (data.accChief.employeeNumberID) {
      ctrls.buhID.setValueById(data.accChief.employeeNumberID)
    }
    const sicknessRequisID = me.defaultValues.sourceID
    if (sicknessRequisID) {
      ctrls.sicknessRequisID.setValue(sicknessRequisID)
    }
    if (!ctrls.bosID.getValue() || !ctrls.buhID.getValue()) {
      const regReportID = await UB.Repository('ac_regReport').attrs(['ID'])
        .where('dictRepID', '=', me.record.get('dictRepID'))
        .where('dictRepVersionID', '=', me.record.get('dictRepVersionID'))
        .where('organizationID', '=', me.record.get('organizationID'))
        .orderByDesc('mi_createDate')
        .selectScalar()
      if (regReportID) {
        const contentData = await $App.connection.getDocument({
          entity: 'ac_regReport',
          attribute: 'reportData',
          id: regReportID
        })
        if (contentData && contentData.formParams) {
          if (!ctrls.bosID.getValue()) {
            ctrls.bosID.setValueById(contentData.formParams['bosID'])
          }
          if (!ctrls.buhID.getValue()) {
            ctrls.buhID.setValueById(contentData.formParams['buhID'])
          }
        }
      }
    }

    /* setTimeout(() => {
      me.makeRegReport()
    }, 300) */
  },
  initForm: me => {
    const organizationID = me.record.get('organizationID') || me.defaultValues.organizationID
    const ctrls = _.keyBy(me.query('[formParams=true]'), 'name')
    ctrls.dateFill.on('change', (field, newValue, oldValue) => {
      AC.viewUtils.setFilterValue(ctrls.bosID, {
        orgID: organizationID,
        dateFrom: { value: newValue, condition: '<=' },
        dateTo: { value: newValue, condition: '>=' }
      })
      AC.viewUtils.setFilterValue(ctrls.buhID, {
        orgID: organizationID,
        dateFrom: { value: newValue, condition: '<=' },
        dateTo: { value: newValue, condition: '>=' }
      })
      AC.viewUtils.setFilterValue(ctrls.empRespID1, {
        orgID: organizationID,
        dateFrom: { value: newValue, condition: '<=' },
        dateTo: { value: newValue, condition: '>=' }
      })
      AC.viewUtils.setFilterValue(ctrls.sicknessRequisID, {
        orgID: organizationID
      })
      if (me.isNewInstance) {
        UB.Repository('ac_regReport').attrs(['ID'])
          .where('dictRepID', '=', me.record.get('dictRepID'))
          .where('dictRepVersionID', '=', me.record.get('dictRepVersionID'))
          .where('organizationID', '=', me.record.get('organizationID'))
          .orderByDesc('mi_createDate')
          .selectScalar()
          .then(regReportID => {
            if (regReportID) {
              $App.connection.getDocument({
                entity: 'ac_regReport',
                attribute: 'reportData',
                id: regReportID
              }).then(function (contentData) {
                if (contentData && contentData.formParams) {
                  ctrls.empRespID1.setValueById(contentData.formParams.empRespID1 || null)
                }
              })
            }
          })
      }
    })
  },
  layout: { type: 'hbox' },
  items: [
    {
      layout: { type: 'vbox', align: 'stretch' },
      flex: 1,
      items: [

        { xtype: 'label',
          text: UB.i18n('Заява-розрахунок'),
          cls: 'x-form-item-label',
          margin: '10 0 0 15'
        },
        {
          xtype: 'ubcombobox',
          name: 'sicknessRequisID',
          formParams: true,
          displayField: 'description',
          ubRequest: {
            entity: 'hr_sicknessRequis',
            method: UB.core.UBCommand.methodName.SELECT,
            fieldList: ['ID', 'description']
          },
          allowBlank: false
        },
        {
          xtype: 'ubdatefield',
          name: 'dateFill',
          formParams: true,
          fieldLabel: UB.i18n('Дата подання:'),
          labelWidth: 140,
          allowBlank: false
        }
      ]
    },
    {
      layout: { type: 'vbox', align: 'stretch' },
      flex: 1,
      items: [
        {
          xtype: 'ubcombobox',
          name: 'bosID',
          formParams: true,
          displayField: 'description',
          fieldLabel: UB.i18n('Керівник'),
          ubRequest: {
            entity: 'hr_employeeNumberS',
            method: UB.core.UBCommand.methodName.SELECT,
            fieldList: ['ID', 'description', 'dateFrom', 'dateTo']
          },
          labelWidth: 205,
          allowBlank: false
        },
        {
          xtype: 'ubcombobox',
          name: 'buhID',
          formParams: true,
          displayField: 'description',
          fieldLabel: UB.i18n('Головний бухгалтер'),
          ubRequest: {
            entity: 'hr_employeeNumberS',
            method: UB.core.UBCommand.methodName.SELECT,
            fieldList: ['ID', 'description', 'dateFrom', 'dateTo']
          },
          labelWidth: 205,
          allowBlank: false
        },
        {
          xtype: 'ubcombobox',
          name: 'empRespID1',
          formParams: true,
          displayField: 'description',
          fieldLabel: UB.i18n('Відповідальний'),
          ubRequest: {
            entity: 'hr_employeeNumberS',
            method: UB.core.UBCommand.methodName.SELECT,
            fieldList: ['ID', 'description', 'dateFrom', 'dateTo']
          },
          labelWidth: 205,
          allowBlank: false
        }
      ]
    }
  ]
}
