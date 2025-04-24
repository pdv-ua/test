/* global UB Ext */

Ext.define('reconciliationTreeBuilder', function () {
  const recTree = {
    singleton: true
  }

  /**
   * Starts building Reconciliation Tree and applying it to component with treeID
   * @param {Ext.data.Model} document document record from Form
   * @param {String} treeID id of tree component (uses in sender.query)
   * @param {Object} sender panel, from which this method is called
   * @return {*}
   */
  recTree.start = function (document, treeID, sender) {
    this.treeID = treeID
    this.sender = sender
    this.document = document
    return this.loadTreeData()
  }

  /**
   * Returns array of templates for Reconciliation Tree
   * @return {Object} with attributes type: Ext.XTemplate
   */
  recTree.getTemplates = function () {
    // return DOC.treeTemplates.getReconciliationTreeTemplates()
  }

  /**
   * Returns config of behavour for Reconciliation Tree
   * @return {Array}
   * attributes of returning objects:
   * nodeType, title, onEdit, onAdd, allowedChildren
   */
  recTree.getBehaviors = function (root) {
    // return DOC.treeBehaviors.getReconciliationTreeBehavior(root)
  }

  /**
   * Loading data for resolution tree and starts tree building (storeLoaded() function) in callback
   * @private
   */
  recTree.loadTreeData = function () {
    const me = this
    const ID = me.document.get('ID')
    return Promise.all([
      UB.Repository('hr_recstage').attrs(['ID',
        'docID',
        'mi_wfState',
        'stageKind',
        'stageKind.name',
        'orderIndex',
        'mi_modifyDate'])
        .where('docID', '=', ID)
        .where('entityName', '=', 'hr_recstage')
        .select(),
      UB.Repository('hr_recparticipant').attrs(['ID',
        'recStageID',
        'positionID',
        'positionID.caption',
        'positionID.name',
        'positionID.code',
        'positionID.parentUnitID.code',
        'mi_wfState',
        // 'recStageTemplateID',
        'executionDate',
        'employeePosition.employeeID.shortFIO',
        'plannedOrgUnitCaption',
        'executionComment'])
        .where('recStageID.docID', '=', ID)
        .where('recStageID.entityName', '=', 'hr_recstage')
        .select(),
      UB.Repository('hr_task').attrs(['ID',
        'mi_wfState',
        'positionID.caption',
        'employeePositionID.employeeID.shortFIO',
        'positionID',
        'comments',
        'plannedOrgUnitCaption',
        'isMainTask'])
        .where('docID', '=', ID)
        .where('participantID.recStageID.entityName', '=', 'hr_recstage')
        .select()
    ]).then(([recstages, recparticipants, tasks]) => {
      me.storeLoaded(recstages, recparticipants, tasks)
    })
  }

  /**
   * Function, that is called by loadTreeData callback. Builds tree (templates, behaviors, root) and applies it to component with treeID
   * @private
   */
  recTree.storeLoaded = function (recstages, recparticipants, tasks) {
    const me = this
    const root = me.buildTree(recstages, recparticipants, tasks)
    const templates = me.getTemplates(root)
    const behaviors = me.getBehaviors(root)
    const tree = me.sender.query('ubdetailtree[ubID="' + me.treeID + '"]')[0]
    if (tree) {
      tree.applyData(root, templates, behaviors)
      const rootNode = tree.getRootNode()
      if (rootNode.raw.shortText && rootNode.raw.shortText.indexOf('</') !== -1) {
        rootNode.set('cls', 'doc-my-row-for-rootNodeIsHTML')
      }
    }
  }

  function formTaskObject (task) {
    let resObj = {}

    const caption = task.get('positionID.caption')

    const captionEOS = task.get('employeePosition.employeeID.shortFIO') ? task.get('plannedOrgUnitCaption') : task.get('orgUnitEOSID.employeeID.shortFIO')

    const shortFIO = caption ? caption.split('(')[0] : null

    let titleString = shortFIO ? shortFIO.substring(0, shortFIO.length - 1) : ''

    resObj.titleString = titleString
    resObj.mi_wfState = task.get('mi_wfState')
    resObj.isMainTask = task.get('isMainTask')
    resObj.orgUnitID = task.get('orgUnitID')
    resObj.comments = task.get('comments')
    resObj.ID = task.get('ID')
    return resObj
  }

  /**
   * Builds tree structure and returns root object
   * @private
   * @param stores
   * @return {{ID: *, nodeType: string, selectable: boolean, deletable: boolean, title: *, regNumber: *, regDate: *, shortText: *, caption: *, expanded: boolean, children: Array}}
   */
  recTree.buildTree = function (recstages, recparticipants, tasks) {
    const document = this.document
    const recStageTemplateType = document.get('recStageTemplateType')

    const recStages = recstage
    const recParticipant = UB.LocalDataStore.selectResultToArrayOfObjects(stores.find(item => item.entity === 'doc_recparticipant')) || []
    const docConsiderations = UB.LocalDataStore.selectResultToArrayOfObjects(stores.find(item => item.entity === 'doc_considerationtask')) || []

    let root

    /*
    let displayExecutionDateOnTree = false
    const settings = UBS.Settings.findByKey('doc.reconciliation.displayExecutionDateOnTree')
    if (settings) {
      displayExecutionDateOnTree = JSON.parse(settings.settingValue)
    }
    */
    let considerations = []

    tasks.forEach(task => {
      // temporary method before refactor data loaders in resolutionTreeBuilder
      task.get = function (fName) { return this[fName] }
      considerations.push(DOC.treeNodesFormer.formConsiderationObject(currConsideration))
    })

    if (considerations.length) {
      document.consideration = considerations
    }

    // Заполняем данные рута по документу
    root = DOC.treeNodesFormer.formDocumentNode(document)
    // for localized rectemplateStage keys show it's localized value in red font color
    if (recStageTemplateType &&
      UB.i18n('recStagemsg_' + recStageTemplateType) !== ('recStagemsg_' + recStageTemplateType)
    ) {
      root.shortText = UB.i18n('recStagemsg_' + recStageTemplateType)
      root.textColor = 'red'
      root.recStageTemplateType = recStageTemplateType
    }

    // Сортируем все сторы
    recStages.remoteSort = false
    recParticipant.remoteSort = false
    recStages.sort((a, b) => a.ID - b.ID)
    recParticipant.sort((a, b) => a.recStageID - b.recStageID)
    dexParticipant.sort((a, b) => a.recStageID - b.recStageID)
    // ПЕРЕБОР ЭТАПОВ СОГЛАСОВАНИЯ
    recStages.forEach(currRecStage => {
      const currRecParticipants = recParticipant.filter(participant => participant.recStageID === currRecStage.ID)
      const currDexParticipants = dexParticipant.filter(participant => participant.recStageID === currRecStage.ID)
      const currRecStageNode = DOC.treeNodesFormer.formRecStageNode(currRecStage, currRecParticipants, currDexParticipants, displayExecutionDateOnTree, root)
      currRecStageNode.displayExecutionDateOnTree = displayExecutionDateOnTree
      root.children.push(currRecStageNode)
    })
    root.children.sort(function (a, b) {
      return a.orderIndex - b.orderIndex
    })

    return root
  }

  recTree.isAvailiableEditTree = function (docState) {
    let isAvailable = false
    const roles = UB.core.UBApp.connection.userData().roles.split(',')
    if (docState) {
      if (['NEW', 'ONCOMPLETION', 'CORRECTED'].includes(docState)) {
        isAvailable = true
      } else if ((docState === 'ONCORRECTION') && (roles.indexOf('correctors') !== -1)) {
        isAvailable = true
      } else if (this.sender && this.sender.entityName === 'dex_recdoc' &&
        ['ONCONSIDERATION', 'ONEXECUTION', 'CONFIRMED', 'REJECTED'].includes(docState)) {
        isAvailable = true
      }
    }
    return isAvailable
  }

  return recTree
})
