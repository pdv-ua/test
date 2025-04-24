<template>
  <el-card>
    <div class="dashboard__card-title">
    <div>
      Мої завдання
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
    </div>
    <el-table
            :data="tableData"
            style="width: 100%;"
            max-height="260"
            @row-dblclick="rowDblClick"
    >
      <el-table-column
              prop="stageKind"
              label="Тип"

      />
      <el-table-column
              prop="empOrderType"
              label="Документ"

      />
      <el-table-column
              prop="orderDate"
              label="Дата"
      />
      <el-table-column
              prop="orderNumber"
              label="Номер"
      />
    </el-table>
  </el-card>
</template>

<script>
  export default {
    data: () => ({
      tableData: []
    }),
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
        const employeeNumberID = $App.connection.userData().employeeNumberID
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
          })
      },
      rowDblClick (data) {
        $App.doCommand({
          cmdType: 'showForm',
          formCode: 'hr_task-main',
          entity: 'hr_task',
          title: UB.i18n('Завдання'),
          description: UB.i18n('Завдання'),
          tabId: 'hr_task' + data.ID,
          target: $App.getViewport().centralPanel,
          instanceID: data.ID

        })
      }
    }
  }

</script>

