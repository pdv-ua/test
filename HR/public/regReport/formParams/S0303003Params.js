/* global UB _ AC HR $App */

module.exports = {
  name: 'mainParams',
  setDefaultValues: async (me) => {
    const organizationID = me.defaultValues.organizationID
    const d = new Date()
    const ctrls = _.keyBy(me.query('[formParams=true]'), 'name')
    ctrls.PERIOD_YEAR.setValue(me.defaultValues.repYear)
    ctrls.C_DOC_CNT.setValue(1)
    ctrls.HFILL.setValue(d)

    const data = await HR.reportUtils.getRespPosition(organizationID, d, ['mainChief', 'accChief'])
    if (data.accChief.employeeNumberID) {
      ctrls.respID.setValueById(data.accChief.employeeNumberID)
    }
    if (!ctrls.respID.getValue()) {
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
          if (!ctrls.respID.getValue()) {
            ctrls.respID.setValueById(contentData.formParams['respID'])
          }
        }
      }
    }
  },
  initForm: me => {
    const organizationID = me.record.get('organizationID') || me.defaultValues.organizationID
    const ctrls = _.keyBy(me.query('[formParams=true]'), 'name')
    ctrls.HFILL.on('change', (field, newValue, oldValue) => {
      UB.Repository('hr_employeePositionS')
        .where('[organizationID]', '=', organizationID)
        .where('[dateFrom]', '<=', newValue)
        .where('[dateTo]', '>=', newValue)
        .attrs(['employeeNumberID'])
        .selectAsObject().then(positions => {
          const empNumIDs = positions.map(position => position.employeeNumberID)
          AC.viewUtils.setFilterValue(ctrls.respID, {
            orgID: organizationID,
            ID: empNumIDs
          }, [])
        })
    })
  },
  layout: { type: 'hbox' },
  items: [
    {
      layout: { type: 'vbox', align: 'stretch' },
      flex: 1,
      items: [
        {
          xtype: 'textfield',
          name: 'PERIOD_YEAR',
          fieldLabel: UB.i18n(`Звітний рік`),
          formParams: true,
          readOnly: true,
          labelWidth: 300,
          allowBlank: false
        },
        {
          xtype: 'textfield',
          name: 'C_DOC_CNT',
          formParams: true,
          fieldLabel: UB.i18n('Номер однотипного документа в періоді'),
          labelWidth: 300,
          allowBlank: false
        }
      ]
    },
    {
      layout: { type: 'vbox', align: 'stretch' },
      flex: 2,
      items: [
        {
          xtype: 'ubdatefield',
          name: 'HFILL',
          formParams: true,
          fieldLabel: UB.i18n('Дата подання:'),
          labelWidth: 350,
          allowBlank: false
        },
        {
          xtype: 'ubcombobox',
          name: 'respID',
          formParams: true,
          displayField: 'description',
          fieldLabel: UB.i18n('Відповідальна особа'),
          ubRequest: {
            entity: 'hr_employeeNumberS',
            method: UB.core.UBCommand.methodName.SELECT,
            fieldList: ['ID', 'description']
          },
          labelWidth: 350,
          allowBlank: false
        }
      ]
    }
  ]
}
