<template>
  <el-card>
    <div class="dashboard__settings">
      <el-tooltip
        effect="dark"
        content="Налаштування лівої панелі"
        placement="bottom-start"
      >
        <u-button
          icon="u-icon-list-success"
          size="small"
          appearance="inverse"
          @click="showUserReminder('L')"
        />
      </el-tooltip>
      <el-tooltip
        effect="dark"
        content="Налаштування правої панелі"
        placement="bottom-start"
      >
        <u-button
          icon="u-icon-list-success"
          size="small"
          appearance="inverse"
          @click="showUserReminder('R')"
        />
      </el-tooltip>
      <el-tooltip
        effect="dark"
        content="Редагування нагадувань"
        placement="bottom-start"
      >
        <u-button
          icon="u-icon-setting"
          size="small"
          appearance="inverse"
          @click="showReminder()"
        />
      </el-tooltip>
    </div>
  </el-card>
</template>

<script>
export default {
  data: () => ({

  }),
  mounted () {
    /* this.doLoad()
      $App.on('ac:app:organizationChanged', (value) => {
        this.doLoad()
      }) */
  },
  methods: {
    async showUserReminder (panelSide) {
      const userSettings = await UB.Repository('ac_userSettings')
        .attrs(['ID', 'params'])
        .where('userID', '=', $App.connection.userData().userID || null)
        .where('ID', '!=', AC.dataService.getUniqueInt())
        .selectSingle() || {}
      const sourceData = await UB.Repository('ac_reminder')
        .attrs(['ID', 'name'])
        .where('organizationID', '=', appAC.globalOrganization())
        .where('userID', '=', $App.connection.userData().userID || null, 'userID')
        .where('userID', 'isNull', $App.connection.userData().userID || null, 'userIsNull')
        .logic('([userID] OR [userIsNull])')
        .orderBy('name')
        .selectAsObject({ 'name': 'description' })
      const params = userSettings.params || {}
      const selectData = []
      if (params.reminder && params.reminder[panelSide]) {
        params.reminder[panelSide].forEach(value => {
          selectData.push({ ID: value, value })
        })
      }
      $App.doCommand({
        cmdType: 'showForm',
        formCode: 'ac_elementSelect',
        cmpInitConfig: {
          sourceData,
          selectData,
          onSelectData: (data) => {
            if (data.remove.length || data.add.length) {
              if (!(params.reminder)) {
                params.reminder = {}
              }
              if (!(params.reminder[panelSide])) {
                params.reminder[panelSide] = []
              }
              if (data.remove.length) {
                for (let i = params.reminder[panelSide].length - 1; i >= 0; --i) {
                  if (data.remove.find(o => o === params.reminder[panelSide][i])) {
                    params.reminder[panelSide].splice(i, 1)
                  }
                }
              }
              if (data.add.length) {
                data.add.forEach(ID => {
                  params.reminder[panelSide].push(ID)
                })
              }
              const execParams = {
                params: JSON.stringify(params)
              }
              if (userSettings.ID) {
                execParams.ID = userSettings.ID
              } else {
                execParams.userID = $App.connection.userData().userID
              }
              $App.connection.run({
                entity: 'ac_userSettings',
                __skipOptimisticLock: true,
                method: (userSettings.ID) ? 'update' : 'insert',
                execParams
              })
              this.$root.$emit('refresh')
            }
          }
        }
      })
    },
    showReminder () {
      $App.doCommand({
        cmdType: UB.core.UBCommand.commandType.showForm,
        formCode: 'ac_reminderList',
        cmpInitConfig: {
          onAfterClose: () => {
            this.$root.$emit('refresh')
          }
        }
      })
    }
  }
}

</script>

<style>
.dashboard__settings{

padding: 0px;
margin: 0px;
justify-content: right;
align-items: center;
text-align: right;
}
</style>
