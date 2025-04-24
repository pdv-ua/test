/* global UB $App appAC */
// eslint-disable-next-line no-unused-vars
class ReconcilationTemplate {
  static buildTemplateMenu (recPanel) {
    const me = ReconcilationTemplate
    const parentForm = recPanel.up('form')
    const empOrderType = parentForm.record.get('empOrderType')
    const organizationID = parentForm.record.get('organizationID') || appAC.globalOrganization()
    const docID = parentForm.record.get('ID')
    recPanel._docID = docID
    recPanel._empOrderType = empOrderType
    const templateBtn = recPanel.down('[actionId=byTemplate]') || recPanel.down('toolbar').add({
      xtype: 'button',
      text: UB.i18n('По шаблону'),
      actionId: 'byTemplate',
      menu: {
        items: [
        ]
      }
    })
    templateBtn.menu.removeAll(true)
    templateBtn.menu.add(
      {
        text: UB.i18n('Створити шаблон'),
        iconCls: 'fas fa-plus-circle',
        handler: () => {
          me.createTemplate(recPanel)
        }
      })
    UB.Repository('hr_recstageTemplate').attrs(['ID', 'name'])
      .where('organizationID', '=', organizationID, 'organizationID')
      .where('organizationID', 'isNull', '', 'orgIsNull')
      .where('empOrderType', '=', empOrderType, 'empOrderType')
      .where('empOrderType', 'isNull', '', 'typeIsNull')
      .logic('(([organizationID] OR [orgIsNull]) AND ([empOrderType] OR [typeIsNull]))')
      .orderBy('name')
      .selectAsObject().then(data => {
        data.forEach((item, idx) => {
          if (idx === 0) {
            templateBtn.menu.add(
              {
                xtype: 'menuseparator'
              })
          }
          item._docID = docID
          templateBtn.menu.add({
            text: item.name,
            handler: () => {
              me.replaceFromTemplate(item, recPanel)
            },
            menu: {
              items: [
                {
                  text: UB.i18n('Редагувати'),
                  iconCls: 'fas fa-edit',
                  handler: () => {
                    me.editTemplate(item, recPanel)
                  }
                },
                {
                  text: UB.i18n('Додати нижче'),
                  iconCls: 'fas fa-plus-circle',
                  handler: () => {
                    me.addFromTemplate(item, recPanel)
                  }
                },
                {
                  text: UB.i18n('Видалити'),
                  iconCls: 'far fa-trash-alt',
                  handler: () => {
                    me.deleteTemplate(item, recPanel)
                  }
                }
              ]
            }
          })
        })
      })
  }
  static editTemplate (templateRecord, recPanel) {
    $App.doCommand({
      cmdType: 'showForm',
      // formCode: 'hr_recstageTemplate',
      entity: 'hr_recstageTemplate',
      instanceID: templateRecord.ID,
      cmpInitConfig: {
        recPanel: recPanel,
        initComponentDone: function () {
          let me = this
          me.on('beforeClose', function () {
            ReconcilationTemplate.buildTemplateMenu(recPanel)
          })
        }
      }
    })
  }
  static createTemplate (recPanel) {
    UB.Repository('hr_recstage').attrs('ID')
      .where('docID', '=', recPanel._docID)
      .where('entityName', '=', 'hr_recstage')
      .selectScalar()
      .then(ID => {
        if (!ID) {
          $App.dialogError(UB.i18n('Неможливо створити шаблон маршруту, оскільки у документі відсутні етапи й виконавці.<br>Додайте етапи та виконавців і після цього створюйте шаблон маршруту'), UB.i18n('Помилка'))
          return
        }
        $App.doCommand({
          cmdType: 'showForm',
          // formCode: 'hr_recstageTemplate',
          entity: 'hr_recstageTemplate',
          instanceID: null,
          cmpInitConfig: {
            recPanel: recPanel,
            initComponentDone: function () {
              let me = this
              me.on('beforeClose', function () {
                ReconcilationTemplate.buildTemplateMenu(recPanel)
              })
            }
          }
        })
      })
  }
  static addFromTemplate (templateRecord, recPanel) {
    $App.connection.run({
      entity: 'hr_recstageTemplate',
      method: 'loadFromTemplate',
      recstageTemplateID: templateRecord.ID,
      docID: templateRecord._docID,
      isDeleteExisting: false
    }).then(mParams => {
      recPanel.recTree.onRefreshDetail()
    })
  }
  static replaceFromTemplate (templateRecord, recPanel) {
    UB.Repository('hr_recstage').attrs('ID')
      .where('docID', '=', recPanel._docID)
      .where('entityName', '=', 'hr_recstage')
      .selectScalar()
      .then(ID => {
        let message = `Замінити існуючий маршрут маршрутом з шаблону "${templateRecord.name}"?`
        let promise = ID ? $App.dialogYesNo(UB.i18n('Попередження'), message) : Promise.resolve(true)
        promise.then(result => {
          if (result) {
            $App.connection.run({
              entity: 'hr_recstageTemplate',
              method: 'loadFromTemplate',
              recstageTemplateID: templateRecord.ID,
              docID: templateRecord._docID,
              isDeleteExisting: true
            }).then(mParams => {
              recPanel.recTree.onRefreshDetail()
            })
          }
        })
      })
  }

  static deleteTemplate (templateRecord, recPanel) {
    $App.dialogYesNo('Попередження', `Дійсно видалити шаблон "${templateRecord.name}"?`)
      .then(res => {
        if (res) {
          $App.connection.run({
            entity: 'hr_recstageTemplate',
            method: 'delete',
            execParams: {
              ID: templateRecord.ID
            }
          }).then(mParams => {
            ReconcilationTemplate.buildTemplateMenu(recPanel)
          })
        }
      })
  }
}
