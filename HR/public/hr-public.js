/* global UB $App Ext appAC AC  */
UB.ns('HR')
UB.ns('appHR')

window.HR.orderManager = require('./core/orderManager.js')
window.appHR = require('./core/appHR.js')
window.HR.treeUtils = require('./core/treeUtils.js')
window.HR.employeeTabs = require('./core/employeeTabs.js')
window.HR.numberTabs = require('./core/numberTabs.js')
window.HR.nameCase = require('./core/nameCase.js')
window.HR.elTabs = require('./core/elTabs.js')
window.HR.accrualService = require('./core/accrualService.js')
window.HR.reportUtils = require('./core/reportUtils.js')
window.HR.timeService = require('./core/timeService.js')
window.HR.searchUtils = require('./core/search/searchUtils.js')
window.HR.searchAttrFieldList = require('./core/search/searchAttrFieldList.js')
window.HR.searchAttrWhereList = require('./core/search/searchAttrWhereList.js')
window.HR.controlService = require('./core/controlService.js')
window.HR.reportTab = require('./core/reportTab.js')
window.HR.orgStructReportUtils = require('./core/orgStructReportUtils.js')
window.HR.staffTariffing = require('./core/staffTariffing.js')
window.HR.reminderService = require('./core/reminderService.js')
window.HR.accrualReportCmp = require('./core/accrualReportCmp.js')
window.HR.refSettings = require('./core/refSettingsService.js')

window.HR.findEmployeeForm = () => {
  /* const hasDashboardRole = AC.entityUtils.verifyRightsMethod('hr_service', 'dashboard')
  if (hasDashboardRole) {
    const findEmployeeInit = require('./widgets/findEmployee/init.js')
    findEmployeeInit()
  } */
  const { employeeNumberID } = $App.connection.userData()
  UB.Repository('hr_employeeNumberS')
    .attrs('employeeID')
    .selectById(employeeNumberID).then(employeeNumber => {
      if (employeeNumber) {
        $App.doCommand({
          cmdType: 'showForm',
          entity: 'hrcab_accountingCard',
          instanceID: employeeNumber.employeeID,
          employeeNumberID
        })
      } else {
        UB.showErrorWindow(UB.i18n('emptyTabNum'))
      }
    })
}
window.HR.dashboard = () => {
  const hasDashboardRole = AC.entityUtils.verifyRightsMethod('ac_reminder', 'insert')
  if (hasDashboardRole) {
    const dashboardInit = require('./widgets/dashboard/init.js')
    SystemJS.import('chart.js').then(() => {
      dashboardInit()
    })
    /* UB.Repository('ac_userSettings')
      .attrs(['params'])
      .where('userID', '=', $App.getUserData().userID || null)
      .selectSingle().then(response => {
        const params = response ? response.params : { }
        const dashboardInit = require('./widgets/dashboard/init.js')
        dashboardInit(params)
      }) */
  }
}
window.HR.myReportsForm = () => {
  // const userData = $App.connection.userData()
  const hasDashboardRole = AC.entityUtils.verifyRightsMethod('hr_service', 'dashboard')
  if (hasDashboardRole) {
    const myReportsInit = require('./widgets/myReports/init.js')
    myReportsInit()
  }
}
require('./controls/empNumComboBox.js')
require('./controls/empPositionCombobox.js')
require('./controls/staffTreeControl.js')
require('./controls/treeSearchControl.js')
require('./controls/dataTreeControl.js')
require('./controls/experienceControl.js')
require('./controls/experienceEmpControl.js')
require('./controls/experienceTotalControl.js')
require('./rec/reconcilationPanel.js')
require('./controls/linkButton.js')
require('./controls/signListPanel.js')
require('./controls/reportParamsControl.js')
require('./controls/paramsControl.js')
require('./controls/commissionHRControl.js')
require('./controls/textAreaEditWindow.js')
require('./controls/positionSearchControl.js')
require('./controls/hrMultiSelectBox.js')

UB.inject('models/HR/css/hr.css')
UB.inject('models/HR/css/grid.css')
UB.inject('models/HR/rec/ReconcilationTemplate.js')

// const sidebarButtonsWidget = require('./widgets/sidebarDocButtons.vue').default
if (BOUNDLED_BY_WEBPACK) {
  // webpack MiniCssExtractPlugin extract all styles (for vue SFC), so we need to inject dist/hr_vue_extracted.css
  UB.inject('/models/HR/dist/hr_vue_extracted.css')
}

/* $App.on('applicationReady', () => {
  $App.fireEvent('portal:sidebar:defineSlot', sidebarButtonsWidget, {})
}) */

window.HR.controlService.validateEditPromiseSupport()
window.HR.reportUtils.reportViewerBtnHiding()
window.HR.controlService.fixMultiSelectBox()
window.HR.printSettings = []
window.HR.refSettings.loadSettings()

Ext.override(UB.ux.UBOrgChart, {
  getRepository () {
    return UB.Repository('hr_staffUnit')
      .attrs(['ID', 'mi_data_id', 'code', 'mi_treePath', 'name', 'parentUnitID', 'mi_unityEntity', 'state'])
      .where('state', '=', 'ACTIVE')
      .where('mi_dateTo', '>=', new Date())
      .where('mi_dateFrom', '<=', appAC.globalApplicationDate())
      .orderBy('mi_treePath')
      .whereIf(this.rootTreePath, '[mi_treePath]', 'startWith', this.rootTreePath)
  },

  getAttrCode (attr) {
    switch (attr) {
      case 'ID': return 'mi_data_id'
      case 'label': return 'name'
      case 'parentID': return 'parentUnitID'
      case 'unitType': return 'mi_unityEntity'
    }
  },

  initMetaInfo: function () {
    let me = this
    let unity, orgUnity

    me.orgUnity = {}
    let eName = me.getRepository().entityName
    $App.domainInfo.eachEntity(function (metaObj, metaObjName) {
      if (metaObj.mixins && (unity = metaObj.mixins.unity) && unity.enabled &&
        unity.entity && (unity.entity === eName)) {
        let unitType = metaObj.code
        me.orgUnity[unitType] = orgUnity = { code: metaObjName, unitType: unitType, caption: metaObj.caption }
        switch (unitType) {
          case 'hr_organization':
            orgUnity.image = $App.getImagePath('office.png')
            break
          case 'hr_department':
            orgUnity.image = $App.getImagePath('user-group.png')
            break
          case 'hr_position':
            orgUnity.image = $App.getImagePath('person.png')
            break
        }
      }
    })
  }
})
