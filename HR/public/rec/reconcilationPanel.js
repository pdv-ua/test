/* global UB, Ext, $App ReconcilationTemplate appAC */
Ext.define('HR.ReconcilationPanel', {
  extend: 'Ext.container.Container',
  alias: 'widget.recpanel',
  layout: {
    type: 'fit'
  },
  overflowY: 'auto',
  isDetail: true,
  getStageName: function (value, metadata, record) {
    return this.participantStage[record.get('ID')]
  },

  setCanEdit: function (canEdit) {
    const me = this
    me.recTree.setReadOnly(!canEdit)
  },

  updateRecStage: function (store, record, action) {
    const sIdx = store.indexOf(record)
    const orderIndex = record.get('orderIndex') || 1
    const nextRec = store.getAt(action === 'up' ? sIdx - 1 : sIdx + 1)
    if (nextRec) {
      Promise.all([
        $App.connection.run({
          entity: 'hr_recstage',
          method: 'update',
          execParams: {
            ID: record.get('ID'),
            orderIndex: action === 'up' ? orderIndex - 1 : orderIndex + 1,
            mi_modifyDate: record.get('mi_modifyDate')
          }
        }),
        $App.connection.run({
          entity: 'hr_recstage',
          method: 'update',
          execParams: {
            ID: nextRec.get('ID'),
            orderIndex: orderIndex,
            mi_modifyDate: nextRec.get('mi_modifyDate')
          }
        })
      ]).then(function () {
        store.reload()
      })
    }
  },

  updateTree: function () {
    if (this.recTree) {
      this.recTree.reloadTree()
      if (this.recTree.editPanel) {
        const form = this.recTree.editPanel.down('form')
        if (form) {
          form.onRefresh()
        }
      }
    }
  },
  onAddItem: function (action, nodeType) {
    const me = this
    const form = me.up('form')
    if (form && form.isDirty()) {
      form.saveForm().then(result => {
        if (result !== -1) {
          addNewItem(action, nodeType)
        }
      })
    } else {
      addNewItem(action, nodeType)
    }

    // + allow add new from any mode as root
    function addNewItem (action, nodeType) {
      // nodeType = 'document'
      const basepanel = me.up('basepanel')
      const editPanel = me.editPanel
      const rootNode = me.getRootNode()
      const parentNode = rootNode
      const toolBar = me.getDockedItems('toolbar[dock="top"]')[0]
      const behavior = me.behaviors[nodeType]
      const initValue = {}
      let promise

      if (basepanel) {
        promise = basepanel.saveForm()
      } else {
        promise = Promise.resolve(1)
      }
      promise.then(function (saveStatus) {
        if (saveStatus < 0) {
          return
        }
        initValue[behavior.parentField] = parentNode.raw.ID
        // initValue.docID = rootNode.raw.ID

        let config = {}
        switch (me.formViewType) {
          case 'window':
            config = {
              formCode: behavior.onAdd,
              cmdType: UB.core.UBCommand.commandType.showForm,
              entity: behavior.entity,
              initValue: initValue,
              isModal: true,
              sender: me,
              eventHandler: Ext.Function.bind(me.eventHandler, me, [], true),
              customParams: {
                parentNode: parentNode
              }
            }
            if (behavior.onAddTitle) {
              config.description = behavior.onAddTitle
            }
            UB.core.UBApp.doCommand(config)
            break
          default:
            editPanel.show().expand()
            config = {
              formCode: behavior.onAdd,
              cmdType: UB.core.UBCommand.commandType.showForm,
              entity: behavior.entity,
              cmpInitConfig: {
                closable: true
              },
              initValue: initValue,
              sender: me,
              eventHandler: Ext.Function.bind(me.eventHandler, me, [], true),
              target: editPanel,
              customParams: {
                parentNode: parentNode
              }
            }
            if (behavior.onAddTitle) {
              config.description = behavior.onAddTitle
            }
            UB.core.UBApp.doCommand(config)
            toolBar.disable()
            me.editing = true
            break
        }
      })
    }
  },
  // - allow add new from any mode as root
  // + lock move executed stage
  doExchange: function (fst, snd, orderEntity) {
    let me = this
    if (!fst.raw.deletable || !snd.raw.deletable) {
      return
    }
    me.__doExchange(fst, snd, orderEntity)
  },
  // - lock move executed stage

  initComponent: function () {
    let me = this
    me.setBehaviors()
    // if (!me.parentField) {
    me.parentField = 'docID'
    // }
    me.recTree = Ext.widget('ubdetailtree', {
      flex: 1,
      xtype: 'ubdetailtree'
    })

    // + allow add new from any mode as root
    me.recTree.un(me.recTree.events.addnew.name, me.recTree.onAddItem, me.recTree)
    me.recTree.on(me.recTree.events.addnew.name, me.onAddItem, me.recTree)
    // - allow add new from any mode as root
    // + lock move executed stage
    me.recTree.__doExchange = me.recTree.doExchange
    me.recTree.doExchange = me.doExchange.bind(me.recTree)
    // - lock move executed stage

    me.recTree.on('reloadtree', () => {
      me.loadData()
    }, me)
    me.recTree.actions[UB.ux.UBDetailTree.actionId.up].show()
    me.recTree.actions[UB.ux.UBDetailTree.actionId.down].show()
    me.on('render', () => {
      ReconcilationTemplate.buildTemplateMenu(me)
    })

    me.items = [
      me.recTree
    ]

    me.on('afterrender', function () {
      // me.up('window').setTitle('Параметри документа')
      // me.createToolbarButtons(me)
    }, me)
    me.on('boxready', function () {
      let hc = Math.round(me.getHeight() / 2)
      me.recTree.editPanel.setHeight(hc < 350 ? 350 : hc)
    }, me)
    me.recTree.editPanel.on('remove', function () {
      me.recTree.reloadTree()
    })
    me.callParent(arguments)
  },

  setValue: function (record, entityName) {
    let me = this
    me.masterRecord = record
    // me.loadParticipant(me.masterRecord.get('ID'))
  },

  onRefreshDetail: function (record, entityName) {
    let me = this
    me.masterRecord = record
    me.recTree.reloadTree()
    // me.loadData()
    // me.loadParticipant(me.masterRecord.get('ID'))
  },

  loadData: function () {
    let me = this
    if (me.loadStarted) {
      return
    }
    me.loadStarted = true
    // me.recTree
    me.root = {
      ID: me.masterRecord.get('ID'),
      nodeType: 'document',
      description: UB.i18n('Маршрут погодження документу'),
      selectable: true,
      deletable: false,
      iconCls: 'iconDoc',
      title: '',
      expanded: true,
      children: []
    }
    Promise.all([
      UB.Repository('hr_recparticipant')
        .attrs(['ID', 'recStageID', 'employeePosition', 'employeePosition.description', 'employeePosition.organizationID.name', 'employeePosition.organizationID', 'tempExecEmpPosition',
          'tempExecEmpPosition.description', 'resolution', 'resolutionText'])
        .where('recStageID.' + me.parentField, '=', me.masterRecord.get('ID'))
        .where('employeePosition.organizationID.mi_dateFrom', 'lessEqual', appAC.globalApplicationDate())
        .where('recStageID.entityName', '=', 'hr_recstage')
        .where('employeePosition.organizationID.mi_dateTo', 'moreEqual', appAC.globalApplicationDate())
        .where('employeePosition.organizationID.state', 'equal', 'ACTIVE')
        .where('employeePosition.organizationID.mi_deleteDate', 'equal', '#maxdate')
        .selectAsObject(),
      UB.Repository('hr_recstage')
        .attrs(['ID', me.parentField, 'mi_modifyDate', 'orderIndex', 'stageKind', 'stagePosition', 'mi_wfState', 'resolutionText'])
        .where('entityName', '=', 'hr_recstage')
        .where(me.parentField, '=', me.masterRecord.get('ID'))
        .orderBy('orderIndex')
        .selectAsObject()
    ]).then(function ([participants, items]) {
      let participantStage = {}
      // NEW, ACCEPTED, REJECTED
      participants.forEach(function (item) {
        let elm = participantStage[item.recStageID]
        let styleRes = ''
        let imageRes = ''
        switch (item.resolution) {
          case 'NEW':
            imageRes = 'fa-user'
            break
          case 'ACCEPTED':
            imageRes = 'fa-check-square-o'
            styleRes = 'style="color: #4CAF50"'
            break
          case 'REJECTED':
            imageRes = 'fa-ban'
            styleRes = 'style="color: #ef0b10"'
            break
        }
        const realParticipant = (item.tempExecEmpPosition && item.employeePosition !== item.tempExecEmpPosition)
          ? ` (тво ${item['tempExecEmpPosition.description']})`
          : ''
        let itemNew = `<span class="ub-person" ${styleRes}><i class="fa ${imageRes}" aria-hidden="true"></i>&nbsp;${item['employeePosition.description']}${item['employeePosition.organizationID'] !== appAC.globalOrganization() ? item['employeePosition.organizationID.name'] : ''}${realParticipant}</span>`
        if (!elm) {
          elm = itemNew
        } else {
          elm += ',&nbsp;&nbsp; ' + itemNew
        }
        participantStage[item.recStageID] = elm
      })

      items.forEach(f => {
        let item = me.createTreeItem(f, participantStage[f.ID])
        me.root.children.push(item)
      })
      me.recTree.applyData(me.root, me.templates, me.behaviors)
      me.loadStarted = false
    }).catch(function (reason) {
      me.loadStarted = false
      throw reason
    })
  },

  createTreeItem: function (data, participant) {
    let item = {
      ID: data.ID,
      // title: data.stageKind === 'SIGN' ? 'Підписання' : 'Візування',
      title: UB.core.UBEnumManager.getStore('HR_RECSTAGEKIND').getById(data.stageKind).get('shortName'),
      nodeType: 'recStage',
      selectable: true,
      deletable: data.mi_wfState === 'NEW',
      normal: data.mi_wfState !== 'WAIT_RESOLUTION', //  && data.mi_wfState !== 'REJECTED',
      waitResolution: data.mi_wfState === 'WAIT_RESOLUTION',
      rejected: data.mi_wfState === 'REJECTED',
      resType: data.resType,
      status: data.mi_wfState,
      resolutionText: data.resolutionText,
      // signer: {
      //   shortFIO: data.get('signerID.employeeID.shortFIO'),
      //     position: data.get('signerID.staffUnitID.name'),
      //     parentCode: data.get('signerID.staffUnitID.parentID.code')
      // },
      // signDate: data.get('signDate'),
      shortText: data.shortText,
      forMyControl: data.forMyControl,
      executionTerm: data.executionTerm,
      executionDate: data.executionDate,
      orderIndex: data.orderIndex,
      orderEntity: 'hr_recstage',
      orderKeyField: data.ID,
      stageKind: data.stageKind,
      stageKindName: data.stageKind === 'SIGN' ? UB.i18n('Підписання') : UB.i18n('Візування'),
      mi_modifyDate: data.mi_modifyDate,
      participant: participant,
      children: []
    }
    return item
  },

  setBehaviors: function () {
    this.behaviors = [
      {
        nodeType: 'document',
        title: UB.i18n('document'),
        onEdit: null,
        onAdd: null,
        allowedChildren: ['recStage']
      },
      {
        nodeType: 'recStage',
        title: UB.i18n('recStageTitle'),
        onEdit: 'hr_recstage',
        onEditTitle: UB.i18n('recStageTitle'),
        onAdd: 'hr_recstage',
        onAddTitle: UB.i18n('recStageTitle'),
        entity: 'hr_recstage',
        parentField: this.parentField,
        allowedMove: true,
        allowedChildren: ['recStage']
      }
    ]
  },

  templates: {
    document: new Ext.XTemplate(
      '<tpl for=".">',
      '<p>',
      '{description}',
      '<tpl for="title">',
      '{.}',
      '</tpl>',
      '</p>',
      '</tpl>'
    ),

    recStage: new Ext.XTemplate(
      '<tpl for=".">',
      '<p>',
      '<tpl if="normal">',
      '<span style="color: #3a8ee6; font-weight: bold;">',
      '{orderIndex}',
      '</tpl>',
      '<tpl if="waitResolution">',
      '<span style="color: #3a8ee6; font-weight: bold;">',
      '<i class="fa fa-clock-o" aria-hidden="true"></i>',
      '</tpl>',
      '</span>',
      /*
      '<span style="padding-left: 15px; color: #5d6166; font-weight: bold;">',
      '{stageKindName}',
      '</span>',
      */
      '<span style="padding-left: 15px; display: inline-block; ">',
      '{participant}',
      '</p>',
      '</tpl>'
    )
  }
}
)
