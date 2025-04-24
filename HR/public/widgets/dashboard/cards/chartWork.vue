<template>
    <el-card>
        <div>
        <div class="dashboard__card-title">Працівники
            <el-tooltip
                    effect="dark"
                    content="Оновити"
                    placement="bottom-start" >
                <u-button
                        icon="el-icon-refresh"
                        size="small"
                        appearance="inverse"
                        @click="doLoad()">

                </u-button>
            </el-tooltip>
        </div>

            <u-chart
                    ref="chart"
                    :chart-data="chartData"
                    :type="type"
                    :options="options"
                    @chart-click="openTasks"

            />
        </div>

    </el-card>
</template>

<script>
  export default {
    data () {
      return {
        type: 'pie',
        chartData: {
          data: {
            labels: null,
            datasets: [],
            clickData: []

            //labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
            /*datasets: [{
              //label: 'Example DataSet',
              data: [],//[65, 59, 80, 81, 56, 55, 40],
            }]*/
          }
        },
        options: {
          /*elements: {
            line: {
              fill: true
            }
          },*/
          plugins: {
            colors: {
              enabled: true
            }
          },
          color: [
            'red',    // color for data at index 0
            'blue',   // color for data at index 1
            'green',  // color for data at index 2
            'black',  // color for data at index 3
            //...
          ]
        }

      }
    },
    mounted () {
      this.doLoad()
      $App.on('ac:app:organizationChanged', (value) => {
        this.doLoad()
      })
    },
    methods: {
      doLoad () {
        this.organizationID = appAC.globalOrganization()
        this.loadData()
      },
      loadData () {
        /*this.chartData.data.labels = ['dsfsf', 'sfaaf']
        this.chartData.data.datasets.push({data: [56, 47]})*/
        this.chartData.data.labels = []
        this.chartData.data.datasets = []

        UB.Repository('tim_timeSheet')
          .attrs(['count([factTimeCostID.nameSmall])', 'factTimeCostID.nameSmall'])
          .where('employeeNumberID.orgID', '=', appAC.globalOrganization())
          .where('isActive', '=', 1)
          .where('dateWork', '=', AC.dateService.shiftDate(appAC.globalApplicationDate()))
          .groupBy(['factTimeCostID.nameSmall'])
          .selectAsObject({
            'count([factTimeCostID.nameSmall])' : 'count',
            'factTimeCostID.nameSmall': 'name'
          })
          .then(timeSheets => {
            const labels = []
            const data = []
            const backgroundColor = [
              '#ff6384', '#36a2eb', '#cc65fe', '#ffce56',
              '#241fff',
              '#ff1c1f',
              '#8bffbf',
              '#ff4cc3'
          ]
            timeSheets.forEach(row => {
              labels.push(row.name)
              data.push(row.count)
            })
            this.chartData.data.labels = labels
            this.chartData.data.datasets.push({ data, backgroundColor })

            if (typeof this.$refs.chart !== 'undefined') this.$refs.chart.rerenderChart()
          })


        //if (typeof this.$refs.chart !== 'undefined') this.$refs.chart.rerenderChart()
      /* this.chartData = {
          data: {
            labels: ['Jan1', 'Feb1', 'Mar1', 'Apr1', 'May', 'Jun', 'Jul'],
            datasets: [{
              label: 'Example DataSet',
              data: [65, 59, 80, 81, 56, 55, 40],
            }]
          }
        }*/
       /* const employeeNumberID = $App.connection.userData().employeeNumberID
        UB.Repository('hr_empOrderActingDet')
          .attrs('paraID.positionID.mi_data_id')
          .where('employeeNumberID', '=', employeeNumberID || 0)
          .where('orderID.orderState', '=', 'POSTED')
          .where('dateFrom', '<=', AC.dateService.shiftDate(appAC.globalApplicationDate()))
          .where('dateTo', '>=', AC.dateService.shiftDate(appAC.globalApplicationDate()))
          .selectAsObject()
          .then(positions => {
            const pos = positions ? positions.map(p => p['paraID.positionID.mi_data_id']) : [0]
            return Promise.all([
              UB.Repository('hr_dictTempExecution')
                .attrs('employeePositionTempID.employeeNumberID')
                .where('employeePositionID.employeeNumberID', '=', employeeNumberID || 0)
                .where('dateFrom', '<=', AC.dateService.shiftDate(appAC.globalApplicationDate()))
                .where('dateTo', '>=', AC.dateService.shiftDate(appAC.globalApplicationDate()))
                .where('employeePositionTempID.employeeNumberID', 'isNotNull')
                .selectAsObject(),
              UB.Repository('hr_employeePositionS')
                .attrs('employeeNumberID')
                .where('positionID', 'in', pos)
                .selectAsObject(),
              UB.Repository('hr_empOrderDet')
                .attrs('paraID.employeeNumberID')
                .where('empOrderType', '=', 'ACTING')
                .where('orderID.orderState', '=', 'POSTED')
                .where('employeeNumberID', '=', employeeNumberID || 0)
                .where('dateFrom', '<=', AC.dateService.shiftDate(appAC.globalApplicationDate()), 'df')
                .where('dateFrom', 'isNull', undefined, 'dfn')
                .where('dateTo', '>=', AC.dateService.shiftDate(appAC.globalApplicationDate()), 'dt')
                .where('dateTo', 'isNull', undefined, 'dtn')
                .logic('(([df] or [dfn]) and ([dt] or [dtn]))')
                .selectAsObject()
            ])
          })
          .then(([dictTempExecution, p2, empOrderDet]) => {
            const dictTempExecutionIds = dictTempExecution ? dictTempExecution.map(i => i['employeePositionTempID.employeeNumberID'] || 0) : 0
            const employeePositionIDs = p2 ? p2.map(i => i['employeeNumberID'] || 0) : 0
            const empOrderEmpIDs = empOrderDet ? empOrderDet.map(i => i['paraID.employeeNumberID'] || 0) : 0
            UB.Repository('hr_task')
              .attrs(['ID', 'participantID.recStageID.stageKind.name', 'docID.empOrderType.name', 'docID.orderDate', 'docID.orderNumber'])
              .where('mi_wfState', '=', 'NEW')
              .where('employeePositionID.employeeNumberID', 'in', [employeeNumberID || 0, ...dictTempExecutionIds, ...employeePositionIDs, ...empOrderEmpIDs])
              .selectAsObject({
                  'participantID.recStageID.stageKind.name': 'stageKind',
                  'docID.empOrderType.name': 'empOrderType',
                  'docID.orderDate': 'orderDate',
                  'docID.orderNumber': 'orderNumber'
                }
              ).then(data => {
              data.forEach(row => {
                row.orderDate = row.orderDate ? AC.dateService.formatDate(row.orderDate) : ''
              })
              this.tableData = data
            })
          })*/
      },
      openTasks (data) {

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
      },

    }
  }

</script>

<style>


</style>
