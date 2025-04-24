/* global Ext AC $App appAC */

Ext.define('HR.controls.experienceTotalControl', {
  extend: 'Ext.panel.Panel',
  alias: 'widget.experienceTotalControl',
  layout: { type: 'vbox', align: 'stretch' },

  initComponent: function () {
    const me = this
    me.items = [
      {
        layout: { type: 'hbox' },
        items: [
          {
            xtype: 'ubdatefield',
            name: 'expTotalOnDate',
            fieldLabel: UB.i18n('Стаж станом на (включно)'),
            labelWidth: 150,
            listeners: {
              change: () => {
                me.loadTotalExperience()
              }
            }
          },
          {
            xtype: 'button',
            tooltip: UB.i18n('Оновити'),
            width: 30,
            ubID: 'refreshExperienceButton',
            margin: '5 5 0 15',
            iconCls: 'u-icon-refresh',
            cls: 'refresh-action',
            shadow: 'drop',
            handler: function (btn) {
              me.loadTotalExperience()
            }
          }
        ]
      },
      {
        name: 'employeeTotalExperiences',
        xtype: 'grid',
        cls: 'ub-entity-grid',
        store: {
          type: 'array',
          store: [],
          fields: [
            { name: 'name', type: 'string' },
            { name: 'years', type: 'int' },
            { name: 'months', type: 'int' },
            { name: 'days', type: 'int' },
            { name: 'countDays', type: 'int' }
          ]
        },
        columns: [
          {
            text: UB.i18n('Вид стажу'),
            dataIndex: 'name',
            width: 250
          },
          {
            text: UB.i18n('Років'),
            dataIndex: 'years',
            width: 100,
            align: 'center'
          },
          {
            text: UB.i18n('Місяців'),
            dataIndex: 'months',
            width: 100,
            align: 'center'
          },
          {
            text: UB.i18n('Днів'),
            dataIndex: 'days',
            width: 100,
            align: 'center'
          },
          {
            text: UB.i18n('Кількість у днях'),
            dataIndex: 'countDays',
            width: 100,
            align: 'right'
          }
        ]
      }
    ]

    me.loadTotalExperience = () => {
      const expOnDate = me.down('[name=expTotalOnDate]')
      if (!expOnDate.isValid() || !expOnDate.getValue()) {
        return
      }
      const onDate = expOnDate.getValue()
      const employeeID = me.attr.form.record.get('employeeID') || me.attr.form.record.get('ID')
      me.setLoading(true)
      $App.connection.run({
        entity: 'hr_employeeExperience',
        method: 'getTotalExperience',
        employeeID: employeeID,
        onDate: onDate,
        orgID: appAC.globalOrganization()
      }).then((data) => {
        me.setLoading(false)
        const methods = [
          {
            code: '1',
            title: UB.i18n('Безперервний стаж (загальний)')
          },
          {
            code: '6',
            title: UB.i18n('Безперервний стаж державної служби')
          },
          {
            code: '3',
            element: 'inOrgExp',
            title: UB.i18n('Стаж у організації (загальний)')
          }
        ]
        const storeData = []
        let experience = []
        try {
          experience = JSON.parse(data.totalExperience)
        } catch (e) { }
        methods.forEach(method => {
          const exp = experience.find(o => o.method === method.code)
          if (exp) {
            storeData.push({
              name: method.title,
              years: exp.years || 0,
              months: exp.months || 0,
              days: exp.days || 0,
              countDays: exp.totalDays || 0
            })
          }
        })
        me.attr.grid.store.loadData(storeData)
      })
    }

    me.on('afterrender', () => {
      me.attr = {
        expOnDate: me.down('[name=expTotalOnDate]'),
        grid: me.down('[name=employeeTotalExperiences]'),
        form: me.up('form')
      }
      me.attr.expOnDate.setValue(AC.dateService.currentDate())
    }, me)

    me.callParent(arguments)
  }
})
