<template>
  <div class="myGroupsSettings-panel">
    <div class="topPanel">
      <template>
        <el-card>
          <div class="myGroups__setting">
            <el-tooltip
                effect="dark"
                content="Додати категорію"
                placement="bottom-start" >
              <u-button
                  icon="fa fa-plus-circle"
                  size="small"
                  appearance="inverse"
                  @click="addNewCategory()">
              </u-button>
            </el-tooltip>
          </div>
        </el-card>
      </template>
    </div>
    <div class="myGroups-grid">
      <div class="myGroups_column1">
        <div
            v-for="groupCat in myGroupsColumn1"
            :key="groupCat.catCode"
        >

          <table style="border-collapse: collapse; width: 100%; word-break: normal; font-family: Roboto,Arial,Helvetica,sans-serif ">
            <tbody style="line-height: 1.3; color: #000000; background-color: #FFFFFF;">

            <tr>
              <td style="font-size:16px; vertical-align: bottom; height:24px; padding-top: 5pt; padding-bottom: 7pt">
                <b>{{groupCat.catName}}</b>
                <el-tooltip
                    effect="dark"
                    content="Редагувати"
                    placement="bottom-start" >
                  <u-button
                      icon="fas fa-edit"
                      size="small"
                      appearance="inverse"
                      @click="editCat(groupCat.catCode)">

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
                      @click="deleteCat(groupCat.catCode)">

                  </u-button>
                </el-tooltip>
              </td>
            </tr>
            <tr
                v-for="group in groupCat.rowList"
                :key="group.idx"
            >
              <td>
                <a
                    style="font-size:14px; height:24px; text-decoration: none; color: #2f7c94; "
                    @click="showGroup(group.groupCode)"
                >
                  {{group.groupName}}
                </a>
              </td>
            </tr>
            <tr><td style="height:10px;"></td><td></td><td></td><td></td></tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="myGroups_column2">
        <div
            v-for="groupCat in myGroupsColumn2"
            :key="groupCat.catCode"
        >

          <table style="border-collapse: collapse; width: 100%; word-break: normal; font-family: Roboto,Arial,Helvetica,sans-serif ">
            <tbody
                style="line-height: 1.3; color: #000000; background-color: #FFFFFF;"
            >

            <tr>
              <td style="font-size:16px; vertical-align: bottom; height:24px; padding-top: 5pt; padding-bottom: 7pt">
                <b>{{groupCat.catName}}</b>
                <el-tooltip
                    effect="dark"
                    content="Редагувати"
                    placement="bottom-start" >
                  <u-button
                      icon="fas fa-edit"
                      size="small"
                      appearance="inverse"
                      @click="editCat(groupCat.catCode)">

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
                      @click="deleteCat(groupCat.catCode)">

                  </u-button>
                </el-tooltip>
              </td>
            </tr>
            <tr
                v-for="group in groupCat.rowList"
                :key="group.idx"
            >
              <td>
                <a
                    style="font-size:14px; height:24px; text-decoration: none; color: #2f7c94; "
                    @click="showGroup(group.groupCode)"
                >
                  {{group.groupName}}
                </a>
              </td>
            </tr>
            <tr><td style="height:10px;"></td><td></td><td></td><td></td></tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="myGroups_column3">
        <div
            v-for="groupCat in myGroupsColumn3"
            :key="groupCat.catCode"
        >

          <table style="border-collapse: collapse; width: 100%; word-break: normal; font-family: Roboto,Arial,Helvetica,sans-serif ">
            <tbody
                style="line-height: 1.3; color: #000000; background-color: #FFFFFF;"
            >

            <tr>
              <td style="font-size:16px; vertical-align: bottom; height:24px; padding-top: 5pt; padding-bottom: 7pt">
                <b>{{groupCat.catName}}</b>
                <el-tooltip
                    effect="dark"
                    content="Редагувати"
                    placement="bottom-start" >
                  <u-button
                      icon="fas fa-edit"
                      size="small"
                      appearance="inverse"
                      @click="editCat(groupCat.catCode)">

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
                      @click="deleteCat(groupCat.catCode)">

                  </u-button>
                </el-tooltip>
              </td>
            </tr>
            <tr
                v-for="group in groupCat.rowList"
                :key="group.idx"
            >
              <td>
                <a
                    style="font-size:14px; height:24px; text-decoration: none; color: #2f7c94; "
                    @click="showGroup(group.groupCode)"
                >
                  {{group.groupName}}
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
/* global UB, $App, appAC, AC */
const { Form } = require('@unitybase/adminui-vue')

module.exports.mount = cfg => {
  Form(cfg)
      .instance()
      .mount()
}

export default {
  components: {},
  props: {
    userParams: Object
  },
  data() {
    return {
      myGroupsColumn1: [],
      myGroupsColumn2: [],
      myGroupsColumn3: []
    }
  },
  mounted () {
    this.loadUserGroups()
  },
  methods: {
    async loadUserGroups () {
      this.myGroupsColumn1 = []
      this.myGroupsColumn2 = []
      this.myGroupsColumn3 = []

      const userSettings = await UB.Repository('ac_userSettings')
          .attrs('params')
          .where('userID', '=', $App.connection.userData().userID)
          .selectScalar()

      let myEmployeeGroups = userSettings && userSettings.myEmployeeGroups && userSettings.myEmployeeGroups.find(settings => settings.orgID === appAC.globalOrganization())
      if (myEmployeeGroups && myEmployeeGroups.catList) {
        let colRowCounter = { col1: 0, col2: 0, col3: 0 }
        let groupCodeList = []
        myEmployeeGroups.catList.forEach(el => {
          groupCodeList = groupCodeList.concat(el.rowList)
        })

        let groups = await UB.Repository('hr_employeeGroup')
            .attrs(['ID', 'name'])
            .where('ID', 'in', groupCodeList)
            .orderBy('name')
            .selectAsObject()

        let idx = 1
        for (const cat of myEmployeeGroups.catList) {
          let rowList = []
          for (const groupCode of cat.rowList) {
            rowList.push({
              groupName: groups.find(el => el.ID === groupCode).name,
              groupCode,
              idx: idx++
            })
          }

          let colToInsert = ''
          if(colRowCounter.col1 <= colRowCounter.col2 && colRowCounter.col1 <= colRowCounter.col3) {
            colToInsert = 'myGroupsColumn1'
            colRowCounter.col1 += rowList.length + 1
          } else if (colRowCounter.col2 <= colRowCounter.col3) {
            colToInsert = 'myGroupsColumn2'
            colRowCounter.col2 += rowList.length + 1
          } else {
            colToInsert = 'myGroupsColumn3'
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
    showGroup (groupCode) {
      $App.doCommand({
        cmdType: 'showForm',
        entity: 'hr_employeeGroup',
        formCode: 'hr_employeeGroup',
        instanceID: groupCode
      })
    },
    editCat (catCode) {
      $App.doCommand({
        cmdType: 'showForm',
        formCode: 'hr_employeeGroupsCategory',
        cmpInitConfig: {
          isNewCategory: false,
          catCode: catCode,
          onSelectData: () => {
            const me = this
            me.loadUserGroups()
          }
        }
      })
    },
    deleteCat (catCode) {
      $App.dialogYesNo('Попередження', `Ви справді бажаєте видалити категорію груп?`)
          .then(resp => {
            if (resp) {
              $App.connection.run({
                entity: 'ac_userSettings',
                method: 'deleteCatOrg',
                settingName: 'myEmployeeGroups',
                userID: $App.connection.userData().userID,
                orgID: appAC.globalOrganization(),
                catCode: catCode
              }).then(() => {
                const me = this
                me.loadUserGroups()
              })
            }
          })
    },
    async addNewCategory () {
      $App.doCommand({
        cmdType: 'showForm',
        formCode: 'hr_employeeGroupsCategory',
        cmpInitConfig: {
          isNewCategory: true,
          onSelectData: () => {
            const me = this
            me.loadUserGroups()
          }
        }
      })
    }
  }
}

</script>

<style>
.myGroupsSettings-panel{
  display: grid;
  grid-template-columns: 1fr;
  grid-auto-rows: min-content;
  overflow-y: auto;
  height: 100%;
  grid-gap: 10px;
  padding: 0px;
  grid-template-areas: 'topPanel'
}
.myGroupsSettings-panel:after {
  content: "";
  height: 1px;
  grid-column: 1;
}
.topPanel{
  grid-area: topPanel;
}
.myGroups-grid{
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-auto-rows: min-content;
  overflow-y: auto;
  height: 100%;

  grid-gap: 20px;
  padding: 20px;
  grid-template-areas: 'myGroups_column1 myGroups_column2 myGroups_column3'
}
.myGroups-grid:after {
  content: "";
  height: 1px;
  grid-column: 1 / 1;
}
.myGroups_column1{
  grid-area: myGroups_column1;
}
.myGroups_column2{
  grid-area: myGroups_column2;
}
.myGroups_column3{
  grid-area: myGroups_column3;
}
</style>