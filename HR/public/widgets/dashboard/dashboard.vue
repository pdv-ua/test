<template>
  <div class="dashboard-panel">
    <div class="topSettingsPanel">
      <settings class="dashboard__settings" />
    </div>
    <div class="dashboard-grid">
      <div class="column1">
        <reminder-emp
          v-for="reminder in reminderEmpL"
          :model="reminder"
        />
        <reminder-pie
          v-for="pie in reminderPieL"
          :model="pie"
        />
        <reminder-line
          v-for="line in reminderLineL"
          :model="line"
        />
      </div>
      <div class="column2">
        <reminder-emp
          v-for="reminder in reminderEmpR"
          :model="reminder"
        />
        <reminder-pie
          v-for="pie in reminderPieR"
          :model="pie"
        />
        <reminder-line
          v-for="line in reminderLineR"
          :model="line"
        />
      </div>
    </div>
  </div>
</template>

<script>
const Settings = require('./cards/settings.vue').default
const ChartWork = require('./cards/chartWork.vue').default
const Tasks = require('./cards/tasks.vue').default
const Request = require('./cards/request.vue').default
const ReminderEmp = require('./cards/reminderEmp.vue').default
const ReminderPie = require('./cards/reminderPie.vue').default
const ReminderLine = require('./cards/reminderLine.vue').default

export default {
  components: {
    Settings,
    ChartWork,
    Tasks,
    Request,
    ReminderEmp,
    ReminderPie,
    ReminderLine
  },
  props: {
    userParams: Object
  },
  data: () => ({
    reminderEmpL: [],
    reminderPieL: [],
    reminderLineL: [],
    reminderEmpR: [],
    reminderPieR: [],
    reminderLineR: []
  }),
  mounted () {
    this.doLoad(this.$props.userParams)
    this.$root.$on('refresh', () => {
      this.doLoad()
    })
  },
  methods: {
    async doLoad (params) {
      if (!params) {
        const userSettings = await UB.Repository('ac_userSettings')
          .attrs(['params'])
          .where('userID', '=', $App.connection.userData().userID || null)
          .selectSingle()
        params = userSettings ? userSettings.params : {}
      }

      this.reminderEmpL = []
      this.reminderPieL = []
      this.reminderLineL = []
      this.reminderEmpR = []
      this.reminderPieR = []
      this.reminderLineR = []

      let reminderIDList = []
      if (params.reminder) {
        if (params.reminder['L']) {
          reminderIDList = reminderIDList.concat(params.reminder['L'])
        } else {
          params.reminder['L'] = []
        }
        if (params.reminder['R']) {
          reminderIDList = reminderIDList.concat(params.reminder['R'])
        } else {
          params.reminder['R'] = []
        }
      }
      let reminder = params.reminder
        ? await UB.Repository('ac_reminder')
          .attrs(['ID', 'name', 'reminderTypeID', 'params', 'reminderTypeID.componentName', 'reminderTypeID.dataFunc', 'reminderTypeID.params'])
          .where('organizationID', '=', appAC.globalOrganization())
          .where('ID', 'in', reminderIDList)
          .where('userID', '=', $App.connection.userData().userID || null, 'userID')
          .where('userID', 'isNull', $App.connection.userData().userID || null, 'userIsNull')
          .logic('([userID] OR [userIsNull])')
          .orderBy('name')
          .selectAsObject({ 'reminderTypeID.componentName': 'componentName', 'reminderTypeID.dataFunc': 'dataFunc', 'reminderTypeID.params': 'reminderParams' }) : []

      reminder.forEach(row => {
        let reminderEmpTableParams = row.reminderParams && row.reminderParams.reminderEmpTableParams
        if (reminderEmpTableParams && reminderEmpTableParams.ctrlTypeCode && reminderEmpTableParams.ctrlTypeCode === 'PIE') {
          if (params.reminder['L'].includes(row.ID)) this[reminderEmpTableParams.showComponentCode + 'L'].push(row)
          if (params.reminder['R'].includes(row.ID)) this[reminderEmpTableParams.showComponentCode + 'R'].push(row)
        } else if (reminderEmpTableParams && reminderEmpTableParams.ctrlTypeCode && reminderEmpTableParams.ctrlTypeCode === 'LINE') {
          if (params.reminder['L'].includes(row.ID)) this[reminderEmpTableParams.showComponentCode + 'L'].push(row)
          if (params.reminder['R'].includes(row.ID)) this[reminderEmpTableParams.showComponentCode + 'R'].push(row)
        } else {
          if (reminderEmpTableParams && reminderEmpTableParams.showComponentCode && row.params.attr.showPie || row.params.attr.showLine) {
            if (params.reminder['L'].includes(row.ID)) this[reminderEmpTableParams.showComponentCode + 'L'].push(row)
            if (params.reminder['R'].includes(row.ID)) this[reminderEmpTableParams.showComponentCode + 'R'].push(row)
          } else if (row.componentName) {
            if (params.reminder['L'].includes(row.ID)) this[row.componentName + 'L'].push(row)
            if (params.reminder['R'].includes(row.ID)) this[row.componentName + 'R'].push(row)
          }
        }
      })
    }
  }
}
</script>

<style>
.dashboard-panel {
  display: grid;
  grid-template-columns: 1fr;
  grid-auto-rows: min-content;
  grid-gap: 10px;
  padding: 0px;
  height: 100%;
  grid-template-areas: 'topSettingsPanel';
  overflow-y: auto;
}

.dashboard-panel:after {
  content: "";
  height: 1px;
  grid-column: 1;
}

.dashboard__settings {
  grid-area: settings;
}

.topSettingsPanel {
  grid-area: topSettingsPanel;
}

.dashboard-grid {
  display: flex;
  overflow-y: auto;
  height: 100%;
  padding: 20px;
}

.dashboard-grid:after {
  content: "";
  height: 1px;
  grid-column: 1 / -1;
}

.column1 {
  width: 50%;
  padding-right: 10px;
  margin-bottom: 20px;
  box-sizing: border-box;
}

.column2 {
  width: 50%;
  padding-left: 10px;
  margin-bottom: 20px;
  box-sizing: border-box;
}

</style>
