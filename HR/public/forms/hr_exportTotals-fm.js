/* global Ext $App AC appAC HR UB */
exports.formCode = {
  initComponentDone,
  addBaseActions
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
}

function addBaseActions () {
  let me = this
  me.callParent(arguments)

  me.actions.audit.hide()
  me.actions.fDelete.hide()

  let fillData = me.actions.fillData
  if (!fillData) {
    fillData = new Ext.Action({
      actionId: 'fillData',
      eventId: 'fillData',
      iconCls: 'iconParams',
      text: UB.i18n('Заповнити поля форми сумарними даними з Системи'),
      handler: function () {
        let appointPercent = me.attr.appointPercent.getValue()
        if (!appointPercent) {
          appointPercent = 0
          me.attr.appointPercent.setValue(appointPercent)
        }
        HR.controlService.checkAndSaveForm(me, () => {
          let hrExportCfgFillPublicTotals = AC.settings.get('hrExportCfgFillPublicTotals', null)
          let formData
          if (hrExportCfgFillPublicTotals) {
            formData = {
              orgTotal: me.attr.orgTotal.getValue(),
              orgTotal01: me.attr.orgTotal01.getValue(),
              empTotal: me.attr.empTotal.getValue(),
              empTotal01: me.attr.empTotal01.getValue(),
              fillOrgPrc: me.attr.fillOrgPrc.getValue(),
              fillOrgPrc01: me.attr.fillOrgPrc01.getValue()
            }
          }
          me.setLoading(true)
          $App.connection.run({
            entity: 'hr_exportTotals',
            method: 'fillPublicTotals',
            onDate: appAC.globalApplicationDate(),
            orgTotalAll: me.attr.orgTotalAll.getValue(),
            appointPercent,
            refreshCurrentData: me.attr.refreshCurrentData.getValue(),
            formData
          }).then(result => {
            me.onRefresh()
            me.setLoading(false)
          }, err => {
            me.setLoading(false)
            if (err.config && err.config.timeout) {
              $App.dialogInfo(UB.i18n('Операція виконується на сервері застосувань,\n та потребує додаткового часу для завершення.\n Зачекайте будь ласка, операцію буде виконано'))
            } else {
              throw err
            }
          })
        })
      },
      scope: me
    })
    me.actions.fillData = fillData
  }

  let exportData = me.actions.exportData
  if (!exportData) {
    exportData = new Ext.Action({
      actionId: 'exportData',
      eventId: 'exportData',
      iconCls: 'iconSend',
      text: UB.i18n('Експорт даних'),
      handler: function () {
        me.setLoading(true)
        $App.connection.run({
          entity: 'hr_exportTotals',
          method: 'exportPublicTotals',
          onDate: appAC.globalApplicationDate()
        }).then(mParams => {
          me.exportPath = mParams.resultPath
          let publicTotalsLink = me.down('[name=publicTotalsLink]')
          if (publicTotalsLink) {
            publicTotalsLink.setVisible(true)
          }
          Ext.MessageBox.show({
            title: UB.i18n('Експорт даних'),
            msg: UB.i18n(`Дані експортовано на сервері в файл<br/>'{0}'<br/>та доступні для завантаження в блоці "Експортовані файли"`, me.exportPath),
            buttons: Ext.Msg.OK,
            icon: Ext.MessageBox.INFO
          })
          me.setLoading(false)
        }, err => {
          me.setLoading(false)
          if (err.config && err.config.timeout) {
            $App.dialogInfo(UB.i18n('Операція виконується на сервері застосувань,\n та потребує додаткового часу для завершення.\n Зачекайте будь ласка, операцію буде виконано'))
          } else {
            throw err
          }
        })
      },
      scope: me
    })
    me.actions.exportData = exportData
  }

  let reportData = me.actions.reportData
  if (!reportData) {
    reportData = new Ext.Action({
      actionId: 'reportData',
      eventId: 'reportData',
      iconCls: 'fas fa-file-excel',
      cls: 'green-action',
      text: UB.i18n('Сформувати Excel файл з розшифровкою сумарних даних з Системи'),
      handler: function () {
        me.setLoading(true)
        $App.connection.run({
          entity: 'hr_exportTotals',
          method: 'runOrgReport'
        }).then(mParams => {
          let report = JSON.parse(mParams.data)
          AC.filesService.saveAsByBase64Buffer(report, `ExportDetails.xlsx`, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
          me.setLoading(false)
        })
      },
      scope: me
    })
    me.actions.reportData = reportData
  }
}
