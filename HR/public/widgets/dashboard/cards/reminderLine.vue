<template>
  <el-card>
    <div class="dashboard__card-titleLine">
      <div>
        {{ model.name }}
        <el-tooltip
          effect="dark"
          content="Оновити"
          placement="bottom-start"
        >
          <u-button
            icon="el-icon-refresh"
            size="small"
            appearance="inverse"
            @click="doLoad()"
          />
        </el-tooltip>
      </div>
      <div
        v-if="showDaysCtrl"
        class="settings_rightLine"
      >
        <input
          v-model.number="days"
          class="settings_daysLine"
          @keypress="NumbersOnly"
          @change="doLoad"
        > Днів
      </div>
      <div
        v-if="showOrgCtrl"
        class="settings_right"
      >
        <input
          v-model="showOnlyCurrentOrg"
          class="settings_orgLine"
          type="checkbox"
          @change="changeOrgSettings"
        >
        {{ orgSettingsParam }}
      </div>
    </div>
    <u-chart
      ref="chart"
      :chart-data="chartData"
      :type="type"
      :options="options"
      @chart-click="openTasks"
    />
  </el-card>
</template>

<script>
export default {
  name: 'USelectRepositorySrc',
  props: {
    model: Object
  },
  data () {
    return {
      type: 'line',
      chartData: {
        data: {
          labels: null,
          datasets: []
        }
      },
      options: {
        plugins: {
          colors: {
            enabled: true
          }
        },
        scales: {
          x: {
            stacked: true
          },
          y: {
            // stacked: true,
            min: 0
          }
        }
      },
      days: 1,
      showDaysCtrl: false,
      showOrgCtrl: false,
      orgSettingsParam: '',
      showOnlyCurrentOrg: null
    }
  },
  mounted () {
    this.days = (this.$props.model.params.attr && this.$props.model.params.attr.dayCount) || 1
    this.showOnlyCurrentOrg = (this.$props.model.params.attr && this.$props.model.params.attr.showOnlyCurrentOrg)
    this.orgSettingsParam = this.showOnlyCurrentOrg ? 'Поточна організація' : 'Всі організації'
    this.doLoad()
    $App.on('ac:app:organizationChanged', (value) => {
      this.doLoad()
    })
  },
  methods: {
    NumbersOnly (evt) {
      evt = (evt) || window.event
      const charCode = (evt.which) ? evt.which : evt.keyCode
      if (charCode >= 48 && charCode <= 57) {
        return true
      } else {
        evt.preventDefault()
      }
    },
    doLoad () {
      this.organizationID = appAC.globalOrganization()
      this.loadData()
    },
    async loadData () {
      if (this.$props.model.reminderParams && this.$props.model.reminderParams.reminderEmpTableParams) {
        this.showDaysCtrl = !(this.$props.model.reminderParams.reminderEmpTableParams && this.$props.model.reminderParams.reminderEmpTableParams.hideLineDaysCtrl)
        this.showOrgCtrl = !(this.$props.model.reminderParams.reminderEmpTableParams && this.$props.model.reminderParams.reminderEmpTableParams.hideLineOrgCtrl)
      }

      this.chartData.data.labels = []
      this.chartData.data.datasets = []
      const dataFunc = this.$props.model.dataFunc.split('.')
      let chartData = await window[dataFunc[0]][dataFunc[1]][dataFunc[2] + 'LineData'](this.$props.model.ID, appAC.globalOrganization(), this.$props.model.params, this.days || 1, this.showOnlyCurrentOrg)
      const labels = []
      const dataEmployee = []
      const dataPos = []
      chartData.forEach(row => {
        labels.push(row.name)
        dataEmployee.push(row.countEmployee)
        dataPos.push(row.countPos)
      })
      this.options.scales.y.suggestedMax = Math.max(...dataEmployee, ...dataPos) + 20
      this.chartData.data.labels = labels
      this.chartData.data.datasets.push({
        label: 'Чисельність працівників',
        data: dataEmployee,
        borderColor: '#000000',
        backgroundColor: '#ff6384',
        // stack: 'combined',
        type: 'bar'
      })

      this.chartData.data.datasets.push({
        label: 'Чисельність посад',
        data: dataPos,
        borderColor: '#000000',
        backgroundColor: '#36a2eb',
        // stack: 'combined',
        type: 'bar'
      })

      if (typeof this.$refs.chart !== 'undefined') this.$refs.chart.rerenderChart()
    },
    changeOrgSettings () {
      this.orgSettingsParam = this.showOnlyCurrentOrg ? 'Поточна організація' : 'Всі організації'
      this.loadData()
    },
    openTasks (data) {

    }
  }
}
</script>

<style>

    .settings_rightLine{
      padding: 0px;
      margin: 0px;
      font-size: 14px;
      font-weight: 300;
      justify-content: right;
      align-items: center;
      text-align: right;
    }
    .settings_daysLine{
      padding-right: 10px;
      width: 55px;
      border-radius: 4px;
      text-align: center;
      border-color: #c0c3c9;
    }
    .settings_orgLine{
      padding-right: 10px;
      margin-top: 4px;
      width: 55px;
      border-radius: 4px;
      text-align: left;
      border-color: #c0c3c9;
    }
    .dashboard__card-titleLine{
      display: grid;
      grid-template-columns: 2fr 1fr;
      grid-auto-rows: min-content;

      font-size: 17px;
      font-weight: 500;
      padding-bottom: 15px;
    }
</style>
