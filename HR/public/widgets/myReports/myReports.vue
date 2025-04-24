<template>
  <div class="settings-panel">
    <div class="topPanel">
        <settings class="myReports__settings"/>
    </div>
    <div class="myReports-grid">
      <div class="myReports_column1">
        <div
            v-for="reportCat in reportsColumn1"
            :key="reportCat.catCode"
        >

          <table style="border-collapse: collapse; width: 100%; word-break: normal; font-family: Roboto,Arial,Helvetica,sans-serif ">
            <tbody
                style="line-height: 1.3; color: #000000; background-color: #FFFFFF;"
            >

            <tr>
              <td style="font-size:16px; vertical-align: bottom; height:24px; padding-top: 5pt; padding-bottom: 7pt">
                <b>{{reportCat.catName}}</b>
                <el-tooltip
                    effect="dark"
                    content="Редагувати"
                    placement="bottom-start" >
                  <u-button
                      icon="fas fa-edit"
                      size="small"
                      appearance="inverse"
                      @click="editCat(reportCat.catCode)">

                  </u-button>
                </el-tooltip>
                <el-tooltip
                    effect="dark"
                    content="Видалити"
                    placement="bottom-start" >
                  <u-button
                      icon="fa fa-trash-o"
                      size="small"
                      appearance="inverse"
                      @click="deleteCat(reportCat.catCode)">

                  </u-button>
                </el-tooltip>
              </td>
            </tr>
            <tr
                v-for="report in reportCat.rowList"
                :key="report.idx"
            >
              <td>
                <a
                    style="font-size:14px; height:24px; text-decoration: none; color: #2f7c94; "
                    @click="showReport(report.reportCode)"
                >
                  {{report.reportName}}
                </a>
              </td>
            </tr>
            <tr><td style="height:10px;"></td><td></td><td></td><td></td></tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="myReports_column2">
        <div
            v-for="reportCat in reportsColumn2"
            :key="reportCat.catCode"
        >

          <table style="border-collapse: collapse; width: 100%; word-break: normal; font-family: Roboto,Arial,Helvetica,sans-serif ">
            <tbody
                style="line-height: 1.3; color: #000000; background-color: #FFFFFF;"
            >

            <tr>
              <td style="font-size:16px; vertical-align: bottom; height:24px; padding-top: 5pt; padding-bottom: 7pt">
                <b>{{reportCat.catName}}</b>
                <el-tooltip
                    effect="dark"
                    content="Редагувати"
                    placement="bottom-start" >
                  <u-button
                      icon="fas fa-edit"
                      size="small"
                      appearance="inverse"
                      @click="editCat(reportCat.catCode)">

                  </u-button>
                </el-tooltip>
                <el-tooltip
                    effect="dark"
                    content="Видалити"
                    placement="bottom-start" >
                  <u-button
                      icon="fa fa-trash-o"
                      size="small"
                      appearance="inverse"
                      @click="deleteCat(reportCat.catCode)">

                  </u-button>
                </el-tooltip>
              </td>
            </tr>
            <tr
                v-for="report in reportCat.rowList"
                :key="report.idx"
            >
              <td>
                <a
                    style="font-size:14px; height:24px; text-decoration: none; color: #2f7c94; "
                    @click="showReport(report.reportCode)"
                >
                  {{report.reportName}}
                </a>
              </td>
            </tr>
            <tr><td style="height:10px;"></td><td></td><td></td><td></td></tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="myReports_column3">
        <div
            v-for="reportCat in reportsColumn3"
            :key="reportCat.catCode"
        >

          <table style="border-collapse: collapse; width: 100%; word-break: normal; font-family: Roboto,Arial,Helvetica,sans-serif ">
            <tbody
                style="line-height: 1.3; color: #000000; background-color: #FFFFFF;"
            >

            <tr>
              <td style="font-size:16px; vertical-align: bottom; height:24px; padding-top: 5pt; padding-bottom: 7pt">
                <b>{{reportCat.catName}}</b>
                <el-tooltip
                    effect="dark"
                    content="Редагувати"
                    placement="bottom-start" >
                  <u-button
                      icon="fas fa-edit"
                      size="small"
                      appearance="inverse"
                      @click="editCat(reportCat.catCode)">

                  </u-button>
                </el-tooltip>
                <el-tooltip
                    effect="dark"
                    content="Видалити"
                    placement="bottom-start" >
                  <u-button
                      icon="fa fa-trash-o"
                      size="small"
                      appearance="inverse"
                      @click="deleteCat(reportCat.catCode)">

                  </u-button>
                </el-tooltip>
              </td>
            </tr>
            <tr
                v-for="report in reportCat.rowList"
                :key="report.idx"
            >
              <td>
                <a
                    style="font-size:14px; height:24px; text-decoration: none; color: #2f7c94; "
                    @click="showReport(report.reportCode)"
                >
                  {{report.reportName}}
                </a>
              </td>
            </tr>
            <tr><td style="height:10px;"></td><td></td><td></td><td></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
const Settings = require('./cards/settings.vue').default


export default {
  components: {
    Settings
  },
  props: {
    userParams: Object
  },
  data() {
    return {
      reportsColumn1: [],
      reportsColumn2: [],
      reportsColumn3: []
    }
  },
  mounted () {
    this.loadUserReports()
  },
  methods: {
    async loadUserReports (params) {
      this.reportsColumn1 = []
      this.reportsColumn2 = []
      this.reportsColumn3 = []

      const userSettings = await UB.Repository('ac_userSettings')
          .attrs('params')
          .where('userID', '=', $App.connection.userData().userID)
          .selectScalar()
      if (userSettings && userSettings.myReports && userSettings.myReports.catList) {
        let colRowCounter = { col1: 0, col2: 0, col3: 0 }
        let reportCodeList = []
        userSettings.myReports.catList.forEach(el => {

          if (el.reportList) {
            el.rowList = el.reportList
            delete el.reportList
          }
          reportCodeList = reportCodeList.concat(el.rowList)
        })
        let shortcuts = await UB.Repository('ubm_navshortcut').attrs(['code', 'caption']).where('code', 'in', reportCodeList).selectAsObject()


        let idx = 1
        for (const cat of userSettings.myReports.catList) {
          let rowList = []

          for (const reportCode of cat.rowList) {
            rowList.push({
              reportName: shortcuts.find(el => el.code === reportCode).caption,
              reportCode,
              idx: idx++
            })
          }

          let colToInsert = ''
          if(colRowCounter.col1 <= colRowCounter.col2 && colRowCounter.col1 <= colRowCounter.col3) {
            colToInsert = 'reportsColumn1'
            colRowCounter.col1 += rowList.length + 1
          } else if (colRowCounter.col2 <= colRowCounter.col3) {
            colToInsert = 'reportsColumn2'
            colRowCounter.col2 += rowList.length + 1
          } else {
            colToInsert = 'reportsColumn3'
            colRowCounter.col3 += rowList.length + 1
          }
          this[colToInsert].push({
            catName: cat.catName,
            catCode: cat.catCode,
            rowList
          })
        }
      }

    },
    showReport (reportCode) {
      const store = UB.core.UBStoreManager.getNavigationShortcutStore()
      const shortcut = _.find(store.data.items, item => {
        return item.get('code') === reportCode
      })

      $App.runShortcutCommand(shortcut.get('code'), shortcut.get('inWindow'))
    },
    editCat (catCode) {
      $App.doCommand({
        cmdType: 'showForm',
        formCode: 'hr_myReportsCategory',
        cmpInitConfig: {
          isNewCategory: false,
          catCode: catCode,
          onSelectData: () => {
            const me = this
            me.loadUserReports()
          }
        }
      })
    },
    deleteCat (catCode) {
      $App.dialogYesNo('Попередження', `Ви справді бажаєте видалити категорію звітів?`)
          .then(resp => {
            if (resp) {
              $App.connection.run({
                entity: 'ac_userSettings',
                method: 'deleteCat',
                settingName: 'myReports',
                userID: $App.connection.userData().userID,
                catCode: catCode
              }).then(() => {
                const me = this
                me.loadUserReports()
              })
            }
          })
    }
  }
}
</script>

<style>


.settings-panel{
  display: grid;
  grid-template-columns: 1fr;
  grid-auto-rows: min-content;
  overflow-y: auto;
  height: 100%;
  grid-gap: 10px;
  padding: 0px;
  grid-template-areas: 'topPanel'
}
.settings-panel:after {
  content: "";
  height: 1px;
  grid-column: 1;
}
.myReports__settings{
  grid-area: settings;
}
.topPanel{
  grid-area: topPanel;
}



.myReports-grid{
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-auto-rows: min-content;
  overflow-y: auto;
  height: 100%;

  grid-gap: 20px;
  padding: 20px;
  grid-template-areas: 'myReports_column1 myReports_column2 myReports_column3'
}
.myReports-grid:after {
  content: "";
  height: 1px;
  grid-column: 1 / 1;
}
.myReports_column1{
  grid-area: myReports_column1;
}
.myReports_column2{
  grid-area: myReports_column2;
}
.myReports_column3{
  grid-area: myReports_column3;
}

</style>
