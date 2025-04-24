/* global UB, _ */

module.exports = {
  name: 'mainParams',
  setDefaultValues: me => {
    const organizationID = me.defaultValues.organizationID
    const dictRepType = me.defaultValues.dictRepType || {}
    UB.Repository('hr_organization')
      .attrs(['dictSprStiID', 'EDRPOUCode'])
      .where('mi_data_id', '=', organizationID)
      .where('state', '=', 'ACTIVE')
      .selectSingle().then(res => {
        const ctrls = _.keyBy(me.query('[formParams=true]'), 'name')
        ctrls.TIN.setValue(res.EDRPOUCode)
        ctrls.PERIOD_MONTH.setValue(dictRepType['dictRepTypeID.periodMonth'])
        ctrls.C_DOC_STAN.getStore().load()
        ctrls.C_DOC_STAN.setValue('1')
        ctrls.C_DOC_CNT.setValue(1)
        ctrls.C_DOC_TYPE.setValue(0)
        ctrls.hkstiOrig.setValueById(res.dictSprStiID)
        ctrls.hkstiCopy.setValueById(res.dictSprStiID)
        ctrls.HFILL.setValue(new Date())
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
          name: 'TIN',
          fieldLabel: UB.i18n(`Код суб'єкта господарювання`),
          formParams: true,
          readOnly: true,
          labelWidth: 300,
          allowBlank: false
        },
        {
          xtype: 'textfield',
          name: 'PERIOD_MONTH',
          fieldLabel: UB.i18n(`Звітний місяць`),
          formParams: true,
          readOnly: true,
          labelWidth: 300,
          allowBlank: false
        },
        {
          xtype: 'ubcombobox',
          name: 'C_DOC_STAN',
          formParams: true,
          fieldLabel: UB.i18n('Стан документа'),
          valueField: 'code',
          displayField: 'name',
          ubRequest: {
            entity: 'ubm_enum',
            method: UB.core.UBCommand.methodName.SELECT,
            fieldList: ['code', 'name', 'eGroup', 'sortOrder'],
            whereList: {
              eGroup: {
                expression: '[eGroup]',
                condition: 'equal',
                values: { 'eGroup': 'AC_DOC_STAN' }
              }
            },
            idProperty: 'code',
            autoLoad: true
          },
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
          xtype: 'textfield',
          name: 'C_DOC_TYPE',
          formParams: true,
          fieldLabel: UB.i18n('Номер нового звітного (уточнюючого) документа'),
          labelWidth: 350,
          allowBlank: false
        },
        {
          xtype: 'ubcombobox',
          name: 'hkstiOrig',
          formParams: true,
          displayField: 'description',
          fieldLabel: UB.i18n('Код ДПІ, до якого подається оригінал документа'),
          ubRequest: {
            entity: 'ac_dictSprSti',
            method: UB.core.UBCommand.methodName.SELECT,
            fieldList: ['ID', 'nameSti', 'hksti', 'description']
          },
          labelWidth: 350,
          allowBlank: false
        },
        {
          xtype: 'ubcombobox',
          name: 'hkstiCopy',
          formParams: true,
          displayField: 'description',
          fieldLabel: UB.i18n('Код ДПІ, до якого подається копія документа'),
          ubRequest: {
            entity: 'ac_dictSprSti',
            method: UB.core.UBCommand.methodName.SELECT,
            fieldList: ['ID', 'nameSti', 'hksti', 'description']
          },
          labelWidth: 350,
          allowBlank: false
        },
        {
          xtype: 'ubdatefield',
          name: 'HFILL',
          formParams: true,
          fieldLabel: UB.i18n('Дата подання:'),
          labelWidth: 350,
          allowBlank: false
        }
      ]
    }
  ]
}
