/* global UB _ Ext AC HR $App */

module.exports = {
  name: 'mainParams',
  setDefaultValues: async (me) => {
    const organizationID = me.defaultValues.organizationID
    const dictRepType = me.defaultValues.dictRepType || {}
    const d = new Date()
    const ctrls = _.keyBy(me.query('[formParams=true]'), 'name')

    const res = await UB.Repository('hr_organization')
      .attrs(['dictSprStiID', 'EDRPOUCode'])
      .where('mi_data_id', '=', organizationID)
      .where('state', '=', 'ACTIVE')
      .selectSingle()
    ctrls.PERIOD_MONTH.setValue(dictRepType['dictRepTypeID.periodMonth'])
    ctrls.C_DOC_STAN.getStore().load()
    ctrls.C_DOC_STAN.setValue('1')
    ctrls.C_DOC_CNT.setValue(1)
    ctrls.C_DOC_TYPE.setValue(0)
    ctrls.hkstiOrig.setValueById(res.dictSprStiID)
    ctrls.hkstiCopy.setValueById(res.dictSprStiID)
    ctrls.HFILL.setValue(d)
    ctrls.FORM_TYPE.setValue('HZB')
    const data = await HR.reportUtils.getRespPosition(organizationID, d, ['mainChief', 'accChief'])
    if (data.mainChief.employeeNumberID) {
      ctrls.bosID.setValueById(data.mainChief.employeeNumberID)
    }
    if (data.accChief.employeeNumberID) {
      ctrls.buhID.setValueById(data.accChief.employeeNumberID)
    }
    if (!ctrls.hkstiOrig.getValue() || !ctrls.hkstiCopy.getValue() || !ctrls.bosID.getValue() || !ctrls.buhID.getValue()) {
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
          if (!ctrls.hkstiOrig.getValue()) {
            ctrls.hkstiOrig.setValueById(contentData.formParams['hkstiOrig'])
          }
          if (!ctrls.hkstiCopy.getValue()) {
            ctrls.hkstiCopy.setValueById(contentData.formParams['hkstiCopy'])
          }
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
                ctrls.isInclude5.setValue(!!contentData.formParams.isInclude5 || false)
              }
            })
          }
        })
    }

    ctrls.HFILL.on('change', (field, newValue, oldValue) => {
      UB.Repository('hr_employeePositionS')
        .where('[organizationID]', '=', organizationID)
        .where('[dateFrom]', '<=', newValue)
        .where('[dateTo]', '>=', newValue)
        .attrs(['employeeNumberID'])
        .selectAsObject().then(positions => {
          const empNumIDs = positions.map(position => position.employeeNumberID)
          AC.viewUtils.setFilterValue(ctrls.bosID, {
            orgID: organizationID,
            ID: empNumIDs
          }, [])
          AC.viewUtils.setFilterValue(ctrls.buhID, {
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
        },
        {
          xtype: 'combobox',
          name: 'FORM_TYPE',
          formParams: true,
          fieldLabel: UB.i18n('Тип форми'),
          valueField: 'code',
          displayField: 'name',
          store: Ext.create('Ext.data.Store', {
            fields: ['code', 'name'],
            data: [
              { 'code': 'HZB', 'name': UB.i18n('початкова (1)') },
              { 'code': 'HZS', 'name': UB.i18n('скасовуюча (2)') },
              { 'code': 'HZD', 'name': UB.i18n('додаткова (3)') }
            ]
          }),
          labelWidth: 300,
          allowBlank: false
        },
        {
          xtype: 'checkbox',
          name: 'isInclude5',
          formParams: true,
          value: false,
          labelWidth: 300,
          fieldLabel: UB.i18n('Відображати переведення у таблиці 5')
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
        },
        {
          xtype: 'ubcombobox',
          name: 'bosID',
          formParams: true,
          displayField: 'description',
          fieldLabel: UB.i18n('Керівник'),
          ubRequest: {
            entity: 'hr_employeeNumberS',
            method: UB.core.UBCommand.methodName.SELECT,
            fieldList: ['ID', 'description']
          },
          labelWidth: 350,
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
            fieldList: ['ID', 'description']
          },
          labelWidth: 350,
          allowBlank: false
        }
      ]
    }
  ]
}
