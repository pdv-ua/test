/* global Ext UB AC $App appAC moment */
Ext.define('HR.controls.experienceControl', {
  extend: 'Ext.panel.Panel',
  alias: 'widget.experienceControl',
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
              if (ctrl.skipChange) {
                delete ctrl.skipChange
                return
              }
              const me = ctrl.up('experienceControl')
              me.doLoadExperience()
            }
          }
        },
        {
          xtype: 'button',
          iconCls: 'u-icon-circle-info',
          cls: 'blue-action',
          width: 30,
          margin: '5 5 0 15',
          shadow: 'drop',
          tooltip: UB.i18n('Інформація'),
          handler: function (btn) {
            const me = btn.up('experienceControl')
            const calcMethod = AC.settings.get('hrCalcExperienceMethod', appAC.globalOrganization())
            const msg = calcMethod === 'SIMPLE'
              ? UB.i18n('Варіант обчислення стажу: спрощений - забезпечує розрахунок стажу без переведення періодів стажу з формату рр/мм/дд в дні (з припущенням, що 1 місяць дорівнює 30 дням)')
              : UB.i18n('Варіант обчислення стажу: точний (за кількісттю днів) -  забезпечується обчислення стажу у днях роботи (всі періоди перераховуються у дні роботи; приведена дата визначається за сумою кількості днів)')
            const messages = []
            messages.push(msg)
            if (me.employeeNumberID) {
              messages.push(UB.i18n('Системою передбачений перерахунок стажу лише за період, коли персона працювала в організації.'))
            }
            $App.dialogInfo(messages.join('<br/>'), '')
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
            const me = btn.up('experienceControl')
            me.loadEmployeeExperience()
          }
        },
        {
          xtype: 'button',
          tooltip: UB.i18n('Розрахувати за трудовою книжкою'),
          width: 30,
          ubID: 'calcExperienceButton',
          margin: '5 5 0 15',
          iconCls: 'fas fa-calculator',
          cls: 'fill-action',
          disabled: !$App.domainInfo.isEntityMethodsAccessible('hr_employeeExperience', 'reCalcExperience'),
          handler: function (btn) {
            const me = btn.up('experienceControl')
            me.calcExperience()
          }
        },
        {
          xtype: 'button',
          tooltip: UB.i18n('Додати'),
          ubID: 'addExperienceButtonEx',
          iconCls: 'u-icon-add',
          margin: '5 5 0 15',
          cls: 'add-new-action',
          disabled: !$App.domainInfo.isEntityMethodsAccessible('hr_employeeExperience', 'addnew'),
          menu: [
            {
              text: UB.i18n('Додати стаж для особи'),
              handler: function (ctrl) {
                const me = ctrl.up('experienceControl')
                me.addExperience(false)
              }
            },
            {
              text: UB.i18n('Додати стаж для працівника'),
              handler: function (ctrl) {
                const me = ctrl.up('experienceControl')
                me.addExperience(true)
              }
            }
          ]
        },
        {
          xtype: 'button',
          tooltip: UB.i18n('Додати'),
          width: 30,
          ubID: 'addExperienceButton',
          margin: '5 5 0 15',
          iconCls: 'u-icon-add',
          cls: 'add-new-action',
          disabled: !$App.domainInfo.isEntityMethodsAccessible('hr_employeeExperience', 'addnew'),
          handler: function (btn) {
            const me = btn.up('experienceControl')
            me.addExperience()
          }
        },
        {
          xtype: 'button',
          tooltip: UB.i18n('В архів'),
          width: 30,
          ubID: 'fixExperienceButton',
          margin: '5 5 0 15',
          iconCls: 'fas fa-envelope-open-text',
          cls: 'refresh-action',
          shadow: 'drop',
          handler: function (btn) {
            const me = btn.up('experienceControl')
            me.fixEmployeeExperience()
          }
        }, {
          xtype: 'button',
          tooltip: UB.i18n('Друкувати'),
          iconCls: 'fas fa-print',
          margin: '5 5 0 15',
          cls: 'blue-action',
          menu: [{
            text: UB.i18n('Розрахунок стажу'),
            code: 'hr_printEmployeeWorkbookDtCode6',
            reportCode: 'hr_printEmployeeWorkbookDtCode6',
            handler: function (btn) {
              const me = btn.up('experienceControl')
              $App.doCommand({
                cmdType: 'showReport',
                caption: UB.i18n('Друкована форма.'),
                tabId: 'printDocument_hr_employeeWorkbookDtCode6' + Date.now(),
                target: $App.getViewport().centralPanel,
                cmdData: {
                  reportCode: 'hr_printEmployeeWorkbookDtCode6',
                  reportParams: {
                    instanceID: me.attr.form.record.get('employeeID') || me.attr.form.record.get('ID')
                  },
                  reportOptions: {
                    showParamForm: true,
                    allowExportToExcel: true,
                    isModal: false
                  }
                }
              })
            }
          }, {
            text: UB.i18n('Довідковий розрахунок стажу від вказаної дати'),
            code: 'hr_reportCalcExperience',
            reportCode: 'hr_reportCalcExperience',
            handler: function (btn) {
              const me = btn.up('experienceControl')
              const enID = me.employeeNumberID || 0
              const expOnDateCntr = me.down('[name=expOnDate]')
              const expOnDate = (!expOnDateCntr.isValid() || !expOnDateCntr.getValue()) ? AC.dateService.currentDate() : expOnDateCntr.getValue()

              $App.doCommand({
                cmdType: 'showReport',
                caption: UB.i18n('Друкована форма.'),
                tabId: 'printDocument_hr_reportCalcExperience' + Date.now(),
                target: $App.getViewport().centralPanel,
                cmdData: {
                  reportCode: 'hr_reportCalcExperience',
                  reportParams: {
                    instanceID: me.attr.form.record.get('employeeID') || me.attr.form.record.get('ID'),
                    employeeNumberID: enID,
                    expOnDate: expOnDate
                  },
                  reportOptions: {
                    showParamForm: true,
                    allowExportToExcel: true,
                    isModal: false
                  }
                }
              })
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
        flex: 1,
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
            { name: 'referenceDate', type: 'date' },
            { name: 'years', type: 'int' },
            { name: 'months', type: 'int' },
            { name: 'days', type: 'int' },
            { name: 'modifyUserID', type: 'int' },
            { name: 'modifyUserName', type: 'string' },
            { name: 'modifyDate', type: 'date' },
            { name: 'isFromWorkbook', type: 'boolean' },
            { name: 'isFromWorkbookName', type: 'string' },
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
            text: UB.i18n('Приведена дата початку'),
            dataIndex: 'calcDate',
            xtype: 'datecolumn',
            format: 'd.m.Y',
            width: 180,
            align: 'center'
          },
          {
            text: UB.i18n('Дата закінчення'),
            dataIndex: 'startCalcDate',
            xtype: 'datecolumn',
            format: 'd.m.Y',
            width: 180,
            align: 'center'
          },
          {
            text: UB.i18n('Ким змінено'),
            dataIndex: 'modifyUserName'
          },
          {
            text: UB.i18n('Коли змінено'),
            dataIndex: 'modifyDate',
            xtype: 'datecolumn',
            format: 'd.m.Y H:i',
            width: 180,
            align: 'center'
          },
          {
            text: UB.i18n('Розраховано за трудовою'),
            dataIndex: 'isFromWorkbookName',
            width: 250,
            align: 'center'
          },
          {
            text: UB.i18n('Дата відліку'),
            tooltip: UB.i18n('Дата від якої розрахована приведена дата'),
            dataIndex: 'referenceDate',
            xtype: 'datecolumn',
            format: 'd.m.Y',
            width: 180,
            align: 'center'
          }
        ],
        viewConfig: {
          getRowClass: function (record) {
            return record.get('autoCalc') ? 'grd-color-blue' : (record.get('employeeNumberID') ? 'grd-color-green' : '')
          }
        },
        listeners: {
          afterrender: grid => {
            grid.reload = me.loadEmployeeExperience
            grid.contextMenu = new Ext.menu.Menu({
              name: 'gridContextMenu',
              items: [
                {
                  text: UB.i18n('Edit') + ' (Ctrl+E)',
                  iconCls: 'fa fa-edit',
                  scope: grid,
                  handler: () => {
                    me.openForm(grid)
                  }
                },
                {
                  text: UB.i18n('Delete') + ' (Ctrl+Delete)',
                  iconCls: 'fa fa-trash-o',
                  cls: 'delete-action',
                  scope: grid,
                  handler: () => {
                    me.delExp(grid)
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
                    me.openForm(grid)
                  }
                },
                {
                  key: Ext.EventObject.DELETE,
                  ctrl: true,
                  fn: function (keyCode, e) {
                    e.stopEvent()
                    me.delExp(grid)
                  }
                }
              ]
            })
            grid.getView().on('itemdblclick', () => {
              me.openForm(grid)
            })
          },
          itemcontextmenu: (view, record, item, index, event) => {
            const grid = view.up('grid')
            event.stopEvent()
            grid.contextMenu.showAt(event.getXY())
          }
        }
      }
    ]

    me.doLoadExperience = function () {
      const expOnDate = me.down('[name=expOnDate]')
      if (!expOnDate.isValid() || !expOnDate.getValue()) {
        return
      }
      if (me.employeeNumberID) {
        me.setLoading(true)
        UB.Repository('hr_employeeNumber')
          .attrs('dateFrom')
          .selectById(me.employeeNumberID)
          .then(emp => {
            me.setLoading(false)
            if (emp && emp.dateFrom > expOnDate.getValue()) {
              AC.viewUtils.showToast(UB.i18n('Перерахунок стажу виконується за період роботи в організації.'), '')
              expOnDate.skipChange = true
              expOnDate.setValue(emp.dateFrom)
              Ext.defer(me.loadEmployeeExperience, 300)
            } else {
              me.loadEmployeeExperience()
            }
          }, err => {
            me.setLoading(false)
            throw err
          })
      } else {
        me.loadEmployeeExperience()
      }
    }

    me.calcExperience = () => {
      const expOnDate = me.down('[name=expOnDate]')
      if (!expOnDate.isValid() || !expOnDate.getValue()) {
        return
      }
      const onDate = AC.dateService.shiftDate(expOnDate.getValue())
      const calcMethod = AC.settings.get('hrCalcExperienceMethod', appAC.globalOrganization())
      const msg = calcMethod === 'SIMPLE'
        ? `${UB.i18n('Видалити раніше внесений стаж?')}<br/><br/>${UB.i18n('Для розрахунку стажу за трудовою книжкою використовується середня кількість днів у місяці - 30 днів.')}`
        : UB.i18n('Видалити раніше внесений стаж?')
      $App.dialogYesNo(UB.i18n('Попередження'), msg)
        .then(res => {
          if (res) {
            me.setLoading(true)
            me.attr.grid.store.loadData([])
            const employeeID = me.attr.form.record.get('employeeID') || me.attr.form.record.get('ID')
            return me.loadEmployeeExperience(true).then(expData => {
              $App.connection.run({
                entity: 'hr_employeeExperience',
                method: 'reCalcExperience',
                employeeID,
                onDate,
                organizationID: appAC.globalOrganization(),
                fixData: JSON.stringify(expData)
              }).then((response) => {
                let errorsMessages = JSON.parse(response.messages)
                if (errorsMessages.length) {
                  $App.dialogInfo(`${UB.i18n('Увага!')} </br> ${errorsMessages.join('</br>')}, </br> ${UB.i18n('Перевищує вік працівника!')}`)
                }
                me.setLoading(false)
                me.loadEmployeeExperience().then(() => {
                  me.setLoading(false)
                })
              })
            })
          }
        })
    }

    me.delExp = (grid) => {
      if (!grid) return
      let gridSelection = grid.getSelectionModel().getSelection()
      if (gridSelection.length < 1 || gridSelection[0].get('employeeExperienceID') === 0) return
      $App.dialogYesNo('deletionDialogConfirmCaption', UB.i18n('Буде видалено запис. Ви впевнені?')).then(function (res) {
        if (!res) return
        $App.connection.run({
          entity: 'hr_employeeExperience',
          method: 'delete',
          execParams: { ID: gridSelection[0].get('employeeExperienceID') }
        }).then(() => {
          me.setLoading(false)
          me.loadEmployeeExperience().then(() => {
            me.setLoading(false)
          })
        })
      })
    }

    me.fixEmployeeExperience = () => {
      const doFix = (instanceID = null) => {
        return me.loadEmployeeExperience(true).then(expData => {
          if (expData.length) {
            return $App.doCommand({
              cmdType: 'showForm',
              formCode: 'hr_employeeExperienceFix',
              entity: 'hr_employeeExperienceFix',
              instanceID: instanceID,
              sender: me.attr.form.down('[name=expFixGrid]'),
              cmpInitConfig: {
                expData: expData.filter(o => !o.autoCalc),
                expOnDate: onDate,
                employeeID: employeeID
              }
            })
          } else {
            return Promise.resolve(true)
          }
        })
      }
      const expOnDate = me.down('[name=expOnDate]')
      if (!expOnDate.isValid() || !expOnDate.getValue()) {
        return
      }
      const onDate = expOnDate.getValue()
      const employeeID = me.attr.form.record.get('employeeID') || me.attr.form.record.get('ID')
      UB.Repository('hr_employeeExperienceFix')
        .attrs(['ID', 'employeeID.shortFIO', 'employeeID.fullFIO', 'respEmployeeFIO', 'dateFixExperience'])
        .where('employeeID', '=', employeeID)
        .where('expOnDate', '=', onDate)
        .selectSingle().then(data => {
          if (data) {
            $App.dialogYesNo('Попередження', UB.i18n(`Для працівника {0} станом на {1} вже зафіксовано стаж. Фіксацію виконав користувач {2}, {3}. Оновити розрахунок?`,
              data['employeeID.shortFIO'], moment(onDate).format('DD.MM.YYYY'), data.respEmployeeFIO, moment(data.dateFixExperience).format('DD.MM.YYYY'))
            ).then(isAgree => {
              if (isAgree) {
                doFix(data.ID)
              }
            })
          } else {
            doFix()
          }
        })
    }

    me.loadEmployeeExperience = (isOnlyLoad) => {
      const expOnDate = me.down('[name=expOnDate]')
      if (!expOnDate.isValid() || !expOnDate.getValue()) {
        return Promise.resolve([])
      }
      const onDate = expOnDate.getValue()

      const employeeID = me.attr.form.record.get('employeeID') || me.attr.form.record.get('ID')
      me.setLoading(!isOnlyLoad)

      return $App.connection.run({
        entity: 'hr_employeeExperience',
        method: 'loadEmployeeExperience',
        execParams: {
          employeeNumberID: me.employeeNumberID,
          employeeID: employeeID,
          onDate: onDate,
          orgID: appAC.globalOrganization()
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
              referenceDate: item.referenceDate,
              dictExperienceID: item.dictExperienceID,
              method: item.method,
              employeeID: employeeID,
              employeeNumberID: item.employeeNumberID,
              employeeExperienceID: item.employeeExperienceID,
              years: item.years,
              months: item.months,
              days: item.days,
              autoCalc: item.autoCalc,
              modifyUserName: item.modifyUserName,
              modifyDate: item.modifyDate,
              isFromWorkbookName: item.isFromWorkbookName,
              isFromWorkbook: item.isFromWorkbook,
              totalDays: item.totalDays,
              excludeExperience: item.excludeExperience
            })
          }
        })
        me.attr.grid.store.loadData(data)
        me.setLoading(false)
        return data
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
          employeeNumberID: forEmp || isEdit ? me.employeeNumberID : null
        }
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
        me.down('[ubID=addExperienceButtonEx]').hide()
        me.attr.expOnDate.disable()
        me.attr.grid.contextMenu.hide()
      } else {
        if (me.employeeNumberID) {
          me.down('[ubID=addExperienceButton]').hide()
        } else {
          me.down('[ubID=addExperienceButtonEx]').hide()
        }
      }
      if (me.showContinuousPanel) {
        const el = me.down('[name=continuousExpPanel]')
        if (el && el.show) el.show()
      }
    }, me)

    me.callParent(arguments)
  }
})
