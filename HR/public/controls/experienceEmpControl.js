/* global Ext UB AC $App appAC */
Ext.define('HR.controls.experienceEmpControl', {
  extend: 'Ext.panel.Panel',
  alias: 'widget.experienceEmpControl',
  layout: { type: 'vbox', align: 'stretch' },
  dockedItems: [
    {
      xtype: 'toolbar',
      dock: 'top',
      ubID: 'mainToolbar',
      items: [
        {
          xtype: 'ubdatefield',
          name: 'expOnDate',
          fieldLabel: UB.i18n('Стаж станом на (включно)'),
          labelWidth: 200,
          listeners: {
            change: (ctrl) => {
              const me = ctrl.up('experienceEmpControl')
              me.loadEmployeeExperience()
            }
          }
        },
        {
          xtype: 'button',
          tooltip: UB.i18n('Оновити'),
          width: 30,
          ubID: 'refreshExperienceButton',
          iconCls: 'u-icon-refresh',
          cls: 'refresh-action',
          handler: function (btn) {
            const me = btn.up('experienceEmpControl')
            me.loadEmployeeExperience()
          }
        },
        {
          xtype: 'button',
          tooltip: UB.i18n('Додати'),
          ubID: 'addExperienceButton',
          iconCls: 'u-icon-add',
          cls: 'add-new-action',
          disabled: !$App.domainInfo.isEntityMethodsAccessible('hr_employeeExperience', 'addnew'),
          menu: [
            {
              text: UB.i18n('Додати стаж для особи'),
              handler: function (ctrl) {
                const me = ctrl.up('experienceEmpControl')
                me.addExperience(false)
              }
            },
            {
              text: UB.i18n('Додати стаж для призначення'),
              handler: function (ctrl) {
                const me = ctrl.up('experienceEmpControl')
                me.addExperience(true)
              }
            }
          ]
        }
      ]
    }
  ],
  initComponent: function () {
    const me = this
    me.items = [
      {
        name: 'employeeExperiences',
        xtype: 'grid',
        cls: 'ub-entity-grid',
        store: {
          type: 'array',
          store: [],
          fields: [
            { name: 'ID', type: 'int' },
            { name: 'name', type: 'string' },
            { name: 'employeeID', type: 'int' },
            { name: 'employeeNumberID', type: 'int' },
            { name: 'employeeExperienceID', type: 'int' },
            { name: 'dictExperienceID', type: 'int' },
            { name: 'method', type: 'string' },
            { name: 'onDate', type: 'date' },
            { name: 'calcDate', type: 'date' },
            { name: 'startCalcDate', type: 'date' },
            { name: 'years', type: 'int' },
            { name: 'months', type: 'int' },
            { name: 'days', type: 'int' },
            { name: 'autoCalc', type: 'boolean' },
            { name: 'totalDays', type: 'int' },
            { name: 'excludeExperience', type: 'int' }
          ]
        },
        columns: [
          {
            text: UB.i18n('Вид стажу'),
            dataIndex: 'name',
            width: 250
          },
          {
            text: UB.i18n('Приведена дата початку'),
            dataIndex: 'calcDate',
            xtype: 'datecolumn',
            format: 'd.m.Y',
            width: 180,
            align: 'center'
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
            text: UB.i18n('Припинення збільшення з'),
            dataIndex: 'startCalcDate',
            xtype: 'datecolumn',
            format: 'd.m.Y',
            width: 180,
            align: 'center'
          }
        ],
        listeners: {
          afterrender: grid => {
            grid.contextMenu = new Ext.menu.Menu({
              name: 'gridContextMenu',
              items: [
                {
                  text: UB.i18n('Edit') + ' (Ctrl+E)',
                  iconCls: 'fa fa-edit',
                  scope: grid,
                  handler: () => {
                    me.openForm()
                  }
                }
              ]
            })
            grid.keyMap = new Ext.util.KeyMap({
              target: grid.getEl(),
              binding: [
                {
                  key: Ext.EventObject.E,
                  ctrl: true,
                  fn: function (keyCode, e) {
                    e.stopEvent()
                    me.openForm()
                  }
                }
              ]
            })
            grid.getView().on('itemdblclick', () => {
              me.openForm()
            })
          },
          itemcontextmenu: (view, record, item, index, event) => {
            const grid = view.up('grid')
            event.stopEvent()
            grid.contextMenu.showAt(event.getXY())
          }
        },
        viewConfig: {
          getRowClass: function (record) {
            return record.get('autoCalc') ? 'grd-color-blue' : (record.get('employeeNumberID') ? 'grd-color-green' : '')
          }
        }
      }
    ]

    me.loadEmployeeExperience = (isOnlyLoad) => {
      const expOnDate = me.down('[name=expOnDate]')
      if (!expOnDate.isValid() || !expOnDate.getValue()) {
        return Promise.resolve([])
      }
      const onDate = expOnDate.getValue()
      const employeeID = me.attr.form.record.get('employeeID') || me.attr.form.record.get('ID')

      me.setLoading(!isOnlyLoad)
      const employeeNumberID = me.up('form').instanceID
      $App.connection.run({
        entity: 'hr_employeeExperience',
        method: 'loadEmployeeExperience',
        execParams: {
          employeeNumberID: employeeNumberID,
          onDate: onDate,
          organizationID: appAC.globalOrganization()
        }
      }).then(function (result) {
        const data = []
        const experience = result.experience ? JSON.parse(result.experience) : []
        experience.forEach(item => {
          if (item.totalDays > 0) {
            data.push({
              name: item.name,
              onDate: onDate,
              calcDate: item.calcDate,
              startCalcDate: item.startCalcDate,
              dictExperienceID: item.dictExperienceID,
              method: item.method,
              employeeID: employeeID,
              employeeNumberID: item.employeeNumberID,
              employeeExperienceID: item.employeeExperienceID,
              years: item.years,
              months: item.months,
              days: item.days,
              autoCalc: item.autoCalc,
              totalDays: item.totalDays,
              excludeExperience: item.excludeExperience
            })
          }
        })
        me.attr.grid.store.loadData(data)
        me.setLoading(false)
      })
    }

    me.openForm = (isEdit = true, forEmp) => {
      if (me.readOnly) return
      const reco = AC.gridUtils.getCurrentRecord(me.attr.grid)
      $App.doCommand({
        cmdType: 'showForm',
        formCode: 'hr_employeeExperience',
        entity: 'hr_employeeExperience',
        isModal: true,
        instanceID: isEdit ? reco.get('employeeExperienceID') : null,
        sender: me.attr.grid.getView(),
        scope: me.attr.grid,
        cmpInitConfig: {
          parentRecord: isEdit ? reco : null,
          isAddNew: !isEdit,
          calcDate: AC.dateService.shiftDate(me.down('[name=expOnDate]').getValue()),
          employeeID: me.attr.form.record.get('employeeID') || me.attr.form.record.get('ID'),
          employeeNumberID: forEmp || isEdit ? me.up('form').instanceID : null
        },
        onClose: () => { me.loadEmployeeExperience() }
      })
    }

    me.addExperience = (forEmp) => {
      me.openForm(false, forEmp)
    }

    me.on('afterrender', () => {
      me.attr = {
        grid: me.down('[name=employeeExperiences]'),
        expOnDate: me.down('[name=expOnDate]'),
        form: me.up('form')
      }
      me.attr.expOnDate.setValue(AC.dateService.currentDate())
      if (me.readOnly) {
        me.down('[ubID=calcExperienceButton]').hide()
        me.down('[ubID=addExperienceButton]').hide()
        me.attr.expOnDate.disable()
        me.attr.grid.contextMenu.hide()
      }
    }, me)

    me.callParent(arguments)
  }
})
