<template>
  <el-card>
    <div class="dashboard__card-titlePie">
      <div>
        {{ model.name }} {{ rowCountLine }}
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
        class="settings_rightPie"
      >
        <input
          v-model.number="days"
          class="settings_daysPie"
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
          class="settings_orgPie"
          type="checkbox"
          @change="changeOrgSettings"
        >
        {{ orgSettingsParam }}
      </div>
    </div>

    <!--        <div class="remCenter">
        <div class="remMaxWidth">-->
    <u-chart
      ref="chart"
      :chart-data="chartData"
      :type="type"
      :options="options"
    />
    <!--        </div>
        </div>-->
  </el-card>
</template>

<script>
export default {
  props: {
    model: Object
  },
  data () {
    return {
      type: 'pie',
      chartData: {
        data: {
          labels: null,
          datasets: [],
          clickData: []
        }
      },
      options: {
        maintainAspectRatio: false,
        onClick: (event, elemData, chart) => {
          const { datasets, labels } = chart.data
          elemData.map((elem) => {
            const { datasetIndex, index } = elem
            const areaData = {
              data: datasets[datasetIndex].data[index],
              label: labels[index],
              param: datasets[datasetIndex].params[index]
            }
            let model = datasets[datasetIndex].model || {}
            if (areaData.param && model && model.reminderParams && model.reminderParams.reminderEmpTableParams && model.reminderParams.reminderEmpTableParams.pieClickParams) {
              let params = JSON.parse(JSON.stringify(model.reminderParams.reminderEmpTableParams.pieClickParams))

              switch (params.cmdType) {
                case 'showList':
                  for (let whereParam in params.wherelist) {
                    if (!['isNull', 'isNotNull'].includes(params.wherelist[whereParam].condition)) {
                      params.wherelist[whereParam].value = areaData.param[params.wherelist[whereParam].value]
                    }
                  }
                  $App.doCommand({
                    cmdType: 'showList',
                    tabId: params.entity + 'pieList' + index,
                    target: $App.getViewport().centralPanel,
                    hideActions: ['addNew', 'addNewByCurrent', 'edit', 'del', 'newVersion'],
                    cmdData: {
                      params: [
                        {
                          entity: params.entity,
                          method: 'select',
                          fieldList: params.fieldList,
                          whereList: params.wherelist
                        }
                      ]
                    }
                  })
                  break
                case 'showForm':
                  $App.doCommand({
                    cmdType: 'showForm',
                    formCode: 'hr_reminderList',
                    target: $App.getViewport().centralPanel,
                    tabId: 'hr_reminderList' + areaData.param[params.identificator],
                    cmpInitConfig: {
                      data: areaData.param,
                      params
                    }
                  })
                  break
              }
            }
          })
        },
        plugins: {
          colors: {
            enabled: true
          },
          legend: {
            position: 'right'
          }
        },
        color: [
          'red', // color for data at index 0
          'blue', // color for data at index 1
          'green', // color for data at index 2
          'black' // color for data at index 3
          // ...
        ]
      },
      days: 1,
      showDaysCtrl: false,
      showOrgCtrl: false,
      rowCountLine: '',
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
        this.showDaysCtrl = !(this.$props.model.reminderParams.reminderEmpTableParams && this.$props.model.reminderParams.reminderEmpTableParams.hidePieDaysCtrl)
        this.showOrgCtrl = !(this.$props.model.reminderParams.reminderEmpTableParams && this.$props.model.reminderParams.reminderEmpTableParams.hidePieOrgCtrl)
      }
      this.chartData.data.labels = []
      this.chartData.data.datasets = []
      const dataFunc = this.$props.model.dataFunc.split('.')
      let chartData = await window[dataFunc[0]][dataFunc[1]][dataFunc[2] + 'PieData'](this.$props.model.ID, appAC.globalOrganization(), this.$props.model.params, this.days || 1, this.showOnlyCurrentOrg)
      const labels = []
      const data = []
      const params = []
      const backgroundColor = [
        '#ff6384', '#36a2eb', '#cc65fe', '#ffce56',
        '#241fff',
        '#ff1c1f',
        '#8bffbf',
        '#ff4cc3'
      ]
      chartData.forEach(row => {
        labels.push(row.name)
        data.push(row.count)
        params.push(row)
      })
      this.chartData.data.labels = labels
      this.chartData.data.datasets.push({ data, params, backgroundColor, model: this.$props.model })

      if (typeof this.$refs.chart !== 'undefined') this.$refs.chart.rerenderChart()
      let rowCount = 0
      this.chartData.data.datasets[0].data.forEach(o => rowCount += o)
      this.rowCountLine = rowCount ? `(${rowCount})` : ''
    },
    changeOrgSettings () {
      this.orgSettingsParam = this.showOnlyCurrentOrg ? 'Поточна організація' : 'Всі організації'
      this.loadData()
    },
    getColors (index) {
      const colors = {
        red: 'rgb(255, 99, 132)',
        green: 'rgb(75, 192, 192)'
      }

      const namedColor = [
        colors.green,
        colors.red
      ]

      return namedColor[index]
    }

  }
}

</script>

<style>
    .remMaxWidth{
        max-width: 450px;
        max-height: 450px;
    }
    .remCenter{
        width: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
     }
    .settings_rightPie{
      padding: 0px;
      margin: 0px;
      font-size: 14px;
      font-weight: 300;
      justify-content: right;
      align-items: center;
      text-align: right;
    }
    .settings_daysPie{
      padding-right: 10px;
      width: 55px;
      border-radius: 4px;
      text-align: center;
      border-color: #c0c3c9;
    }
    .settings_orgPie{
      padding-right: 10px;
      margin-top: 4px;
      width: 55px;
      border-radius: 4px;
      text-align: left;
      border-color: #c0c3c9;
    }
    .dashboard__card-titlePie{
      display: grid;
      grid-template-columns: 2fr 1fr 1fr;
      grid-auto-rows: min-content;

      font-size: 17px;
      font-weight: 500;
      padding-bottom: 15px;
    }
</style>
