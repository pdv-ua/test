<template>
    <el-card>
        <div class="dashboard__card-title">
            <div>
            Заяви (на опрацювання)
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
                    prop="requestNumber"
                    label="Номер заяви"
            />
            <el-table-column
                    prop="mi_createDate"
                    label="Дата створення"
            />
            <el-table-column
                    prop="employeeNumber"
                    label="Працівник"
            />
            <el-table-column
                    prop="requestType"
                    label="Тип заяви"
            />
            <el-table-column
                prop="dateFrom"
                label="Дата з"
           />
            <el-table-column
                    prop="dateTo"
                    label="Дата по"
            />
            <el-table-column
                prop="dayCount"
                label="Днів"
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
        this.loadData()
      },
      loadData () {
        UB.Repository('hr_request')
          .attrs(['ID', 'requestNumber', 'mi_createDate', 'employeeNumberID.description', 'requestType.name',
            'dateFrom', 'dateTo', 'dayCount'])
          .where('organizationID', '=', appAC.globalOrganization())
          .where('requestState', '=', 'AGREED')
          .orderByDesc('requestDate')
          .selectAsObject({
              'employeeNumberID.description': 'employeeNumber',
              'requestType.name': 'requestType'
            }
          ).then(data => {
          data.forEach(row => {
            row.mi_createDate = row.mi_createDate ? AC.dateService.formatDate(row.mi_createDate, 'dd.mm.yyyy hh:nn') : ''
            row.dateFrom = row.dateFrom ? AC.dateService.formatDate(row.dateFrom) : ''
            row.dateTo = row.dateTo ? AC.dateService.formatDate(row.dateTo) : ''
          })
          this.tableData = data
        })
      },
      rowDblClick (data) {
        $App.doCommand({
          cmdType: 'showForm',
          formCode: 'hr_request',
          entity: 'hr_request',
          title: UB.i18n('Заява працівника'),
          description: UB.i18n('Заява працівника'),
          tabId: 'hr_request' + data.ID,
          target: $App.getViewport().centralPanel,
          instanceID: data.ID

        })
      }
    }
  }

</script>
