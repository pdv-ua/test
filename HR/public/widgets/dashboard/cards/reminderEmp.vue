<template>
  <el-card>
    <div class="dashboard__card-title">
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
        <el-tooltip
          effect="dark"
          content="Прийняти обрані"
          placement="bottom-start"
          class="blue_action-buttom"
        >
          <u-button
            v-if="massProcessingMyTask"
            icon="far fa-paper-plane"
            size="small"
            appearance="inverse"
            :disabled="isMassprocessingButtonDisabled"
            :class="{ 'blurred-button': isMassprocessingButtonDisabled }"
            @click="onClickApprove()"
          >
            &nbsp;&nbsp;Прийняти обрані {{ selectedRowsCount }}
          </u-button>
        </el-tooltip>
        <div style="display: inline-block;">
          <u-form-row>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div
                v-if="showOrgCtrl"
                style="display: flex; justify-content: space-between; align-items: center;"
              >
                <span style="margin: 0 10px;">{{ orgSettingsParam }}</span>
                <input
                  v-model="showOnlyCurrentOrg"
                  class="settings_org"
                  type="checkbox"
                  @change="changeOrgSettings"
                >
              </div>
              <div
                v-if="showPeriodMonthCtrl"
                style="display: flex; justify-content: space-between; align-items: center;"
              >
                <label for="periodMonth">{{ $ut('Період') }}</label>
                <u-select-entity
                  id="periodMonth"
                  v-model="periodMonth"
                  :repository="getPeriodMonth"
                  display-attribute="name"
                  remove-default-actions
                  style="width: 185px; margin-left: 10px;"
                  @input="changePeriodMonth()"
                />
              </div>
              <div
                v-if="showDictExperienceCtrl"
                style="display: flex; justify-content: space-between; align-items: center; opacity: 0.5; margin-left: 15px; "
              >
                <label for="dictExperience">{{ $ut('Вид стажу') }}</label>
                <u-select-entity
                  id="dictExperience"
                  v-model="dictExperience"
                  :repository="getDictExperience"
                  display-attribute="name"
                  style="width: 200px; margin-left: 10px;"
                  remove-default-actions
                  readonly
                  @input="changeDictExperience()"
                />
              </div>
              <div
                v-if="showDaysCtrl"
                style="display: flex; justify-content: space-between; align-items: center;"
              >
                <label for="days">{{ $ut('Днів') }}</label>
                <input
                  id="days"
                  v-model.number="days"
                  class="settings_days"
                  @keypress="NumbersOnly"
                  @change="changeDays"
                >
              </div>
            </div>
          </u-form-row>
        </div>
        </u-form-row>
      </div>
    </div>
    </div>
    <el-table
      v-loading="loadStatus"
      :data="tableData"
      style="width: 100%;"
      max-height="260"
      @row-dblclick="rowDblClick"
      @selection-change="handleCheckboxClick"
    >
      <el-table-column
        v-if="massProcessingMyTask"
        type="selection"
      />
      <el-table-column
        v-for="column in columnList"
        :key="column.prop"
        :prop="column.prop"
        :label="column.label"
        :sortable="column.sortable"
        :width="column.width"
      />
    </el-table>
  </el-card>
</template>

<script>

export default {
  props: {
    model: Object
  },
  data: () => ({
    tableData: [],
    columnList: [],
    days: 1,
    showDaysCtrl: false,
    showOrgCtrl: false,
    rowCountLine: '',
    orgSettingsParam: '',
    showOnlyCurrentOrg: null,
    loadStatus: false,
    periodMonth: null,
    showPeriodMonthCtrl: false,
    dictExperience: null,
    showDictExperienceCtrl: false,
    massProcessingMyTask: false,
    selectedRows: [],
    isMassprocessingButtonDisabled: true,
    selectedRowsCount: ''
  }),
  async mounted () {
    this.days = (this.$props.model.params.attr && this.$props.model.params.attr.dayCount) || 1
    this.showOnlyCurrentOrg = (this.$props.model.params.attr && this.$props.model.params.attr.showOnlyCurrentOrg)
    this.orgSettingsParam = this.showOnlyCurrentOrg ? 'Поточна організація' : 'Всі організації'
    let myperiodMonth = await appHR.getPeriodOnDate(appAC.globalOrganization(), appAC.globalApplicationDate())
    this.periodMonth = (this.$props.model.params.attr && this.$props.model.params.attr.periodMonth) || myperiodMonth.ID
    this.dictExperience = (this.$props.model.params.attr && this.$props.model.params.attr.dictExperience) || null
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
      this.loadData()
    },
    handleCheckboxClick (selectedRows) {
      this.selectedRows = selectedRows.filter(o => o.taskStateCode === 'NEW').map(o => o.ID)
      this.selectedRowsCount = this.selectedRows.length ? `(${this.selectedRows.length})` : ''
      this.isMassprocessingButtonDisabled = !selectedRows.find(o => o.taskStateCode === 'NEW')
    },
    onClickApprove () {
      this.$UB.Repository('ac_settingsOrg')
        .attrs(['value'])
        .where('organizationID', '=', appAC.globalOrganization())
        .where('[constantID.code]', '=', 'useCEP')
        .selectScalar()
        .then(r => r === '1').then(useCEPValue => {
          if (useCEPValue) {
            this.$UB.Repository('hr_task')
              .attrs(['ID', 'docID', 'docID.orderClass.entityName', 'participantID'])
              .where('ID', 'in', this.selectedRows)
              .selectAsObject({ 'docID.orderClass.entityName': 'entityName' })
              .then((res) => {
                isSignatureProcess(res).then((res, rej) => {
                  if (res) {
                    $App.dialogInfo(res)
                    this.loadData()
                  }
                })
              })
          } else {
            $App.connection.run({
              entity: 'hr_task',
              method: 'massProcessingTasks',
              IDs: JSON.stringify(this.selectedRows),
              resolution: 'ACCEPTED'
            })
          }
        }).then(() => this.doLoad())
    },
    async loadData () {
      this.loadStatus = true
      this.columnList = []
      if (this.$props.model.reminderParams && this.$props.model.reminderParams.reminderEmpTable) {
        this.showDaysCtrl = !(this.$props.model.reminderParams.reminderEmpTableParams && this.$props.model.reminderParams.reminderEmpTableParams.hideDaysCtrl)
        this.showOrgCtrl = !(this.$props.model.reminderParams.reminderEmpTableParams && this.$props.model.reminderParams.reminderEmpTableParams.hideOrgCtrl)
        this.showPeriodMonthCtrl = (this.$props.model.reminderParams.reminderEmpTableParams && this.$props.model.reminderParams.reminderEmpTableParams.hidePeriodMonthCtrl === false)
        this.showDictExperienceCtrl = (this.$props.model.reminderParams.reminderEmpTableParams && this.$props.model.reminderParams.reminderEmpTableParams.hideDictExperienceCtrl === false)
        this.$props.model.reminderParams.reminderEmpTable.forEach(col => {
          this.columnList.push({
            prop: col.prop,
            label: col.label,
            sortable: col.sortable,
            width: col.width
          })
        })

        if (!this.showOnlyCurrentOrg) {
          this.columnList.push({
            prop: 'rowOrgName',
            label: 'Організація'
          })
        }
      } else {
        this.showDaysCtrl = true
        this.showOrgCtrl = true
        this.showPeriodMonthCtrl = false
        this.showDictExperienceCtrl = false
        this.columnList = [
          {
            prop: 'fullFIO',
            label: 'ПІБ',
            width: '300'
          },
          {
            prop: 'posName',
            label: 'Посада',
            width: '300'
          },
          {
            prop: 'dateEvent',
            label: 'Дата події',
            width: '180'
          }
        ]
        if (!this.showOnlyCurrentOrg) {
          this.columnList.push({
            prop: 'rowOrgName',
            label: 'Організація'
          })
        }
      }

      const dataFunc = this.$props.model.dataFunc.split('.')
      this.tableData = await window[dataFunc[0]][dataFunc[1]][dataFunc[2]](this.$props.model.ID, appAC.globalOrganization(), this.$props.model.params, this.days, this.showOnlyCurrentOrg, this.periodMonth)
      this.massProcessingMyTask = $App.connection.userData().roles.toUpperCase().split(',').includes('ACC_MASSPROCESSINGMYTASK') && this.tableData.some(o => o.taskStateCode === 'NEW')
      this.isMassprocessingButtonDisabled = true
      this.rowCountLine = this.tableData.length ? `(${this.tableData.length})` : ''
      this.loadStatus = false
    },
    changeDays () {
      this.loadData()
    },
    changePeriodMonth () {
      this.$props.model.params.attr.periodMonth = this.periodMonth
      this.loadData()
    },
    changeDictExperience () {
      this.$props.model.params.filterAttr.dictExperience = this.dictExperience
      this.loadData()
    },
    changeOrgSettings () {
      this.$props.model.params.attr.showOnlyCurrentOrg = this.showOnlyCurrentOrg
      this.orgSettingsParam = this.showOnlyCurrentOrg ? 'Поточна організація' : 'Всі організації'
      this.loadData()
    },
    rowDblClick (data) {
      if (this.$props.model.reminderParams && this.$props.model.reminderParams.reminderEmpTableParams && this.$props.model.reminderParams.reminderEmpTableParams.rowDblClickParams) {
        let rowDblClickParams = this.$props.model.reminderParams.reminderEmpTableParams.rowDblClickParams
        if (rowDblClickParams.entity && rowDblClickParams.formCode) {
          let execParams = {
            cmdType: 'showForm',
            formCode: rowDblClickParams.formCode,
            entity: rowDblClickParams.entity,
            target: $App.getViewport().centralPanel,
            tabId: rowDblClickParams.entity + data.ID
          }
          if (rowDblClickParams.instanceID) execParams.instanceID = data.ID
          if (rowDblClickParams.title) execParams.title = UB.i18n(rowDblClickParams.title)
          if (rowDblClickParams.description) execParams.description = UB.i18n(rowDblClickParams.description)
          if (rowDblClickParams.cmpInitConfig && Object.keys(rowDblClickParams.cmpInitConfig).length) {
            const cmpInitConfig = {}
            Object.keys(rowDblClickParams.cmpInitConfig).forEach(attr => {
              if (data[attr]) cmpInitConfig[attr] = data[attr]
            })
            if (Object.keys(cmpInitConfig).length) execParams.cmpInitConfig = cmpInitConfig
          }
          if (rowDblClickParams.defaultValues && Object.keys(rowDblClickParams.defaultValues).length) {
            const defaultValues = {}
            Object.keys(rowDblClickParams.defaultValues).forEach(attr => {
              if (data[attr]) defaultValues[attr] = data[attr]
            })
            if (Object.keys(defaultValues).length) execParams.cmpInitConfig = { defaultValues }
          }

          $App.doCommand(execParams)
        }
      }
    },
    getPeriodMonth () {
      return this.$UB.Repository('hr_dictPeriod')
        .attrs('ID', 'name')
        .where('orgID', '=', appAC.globalOrganization())
        .orderByDesc('dateFrom')
    },
    getDictExperience () {
      return this.$UB.Repository('hr_dictExperience')
        .attrs('ID', 'name')
    }
  }
}
function asyncOperation (item, pki, privateKey, ownerInfo, serverTime) {
  let signatureID
  return $App.connection.getDocument({
    entity: item.entityName,
    attribute: 'document',
    ID: item.docID
  }, {
    bypassCache: true, resultIsBinary: true
  }).then(docBin => {
    const signedDoc = pki.sign(docBin, true)
    return signedDoc
  }).then(function (binSignature) {
    return $App.connection.addNewAsObject({
      entity: 'hr_empOrderSignature',
      fieldList: ['ID']
    }).then(rec => {
      signatureID = rec.ID

      return $App.connection.setDocument(binSignature, {
        entity: 'hr_empOrderSignature',
        attribute: 'signature',
        ID: signatureID,
        filename: signatureID + '.p7s'
      })
    })
  }).then(signatureJSON => {
    return $App.connection.runTrans([{
      entity: 'hr_empOrderSignature',
      method: 'insert',
      execParams: {
        ID: signatureID,
        docID: item.docID,
        participantID: item.participantID,
        signature: signatureJSON
      }
    }, {
      entity: 'hr_task',
      method: 'setResolution',
      ID: item.ID,
      resolution: 'ACCEPTED'
    },
    {
      entity: 'hr_empOrdListAppruv',
      method: 'updateEmpOrdListAppruvList',
      taskID: item.ID
    }
    ])
  })
}
async function isSignatureProcess (items) {
  let pki = await $App.connection.pki()
  const privateKey = await pki.readPrivateKey()
  const ownerInfo = await pki.getPrivateKeyOwnerInfo()
  const serverTime = await $App.connection.run({
    entity: 'hr_request',
    method: 'getCurrentTime'
  })
  const ownerPkiInfo = UB.i18n(`Підписано КЕП<br/>{0}<br/>{1}`, ownerInfo.GetSubjFullName(), serverTime.currentStrTime)

  let result = await items.reduce(async (prev, cur) => {
    try {
      return await asyncOperation(cur, pki, privateKey, ownerInfo, serverTime)
    } catch (error) {
      console.error()
    }
  }, Promise.resolve())
  const cachingPrivateKey = AC.settings.get('cachingPrivateKey', appAC.globalOrganization())
  if (!cachingPrivateKey) {
    pki.closePrivateKey()
  }
  return ownerPkiInfo
}
</script>
<style>
    .settings_right{
        padding: 0px;
        margin: 0px;
        font-size: 14px;
        font-weight: 300;
        justify-content: right;
        align-items: center;
        text-align: right;
    }
    .settings_days{
          padding-right: 10px;
          width: 55px;
          border-radius: 4px;
          text-align: center;
          border-color: #c0c3c9;
          margin-left: 10px;
    }
    .settings_org{
          padding-right: 10px;
          margin-top: 4px;
          width: 55px;
          border-radius: 4px;
          text-align: left;
          border-color: #c0c3c9;
    }
    .settings_PeriodMonth{
          margin-right: 10px;
    }
    .dashboard__card-title{
      display: grid;
      grid-template-columns: 2fr;
      grid-auto-rows: min-content;

      font-size: 17px;
      font-weight: 500;
      padding-bottom: 15px;
    }
    .blue_action-buttom{
      color: #0e41a0;
    }
    .blurred-button {
      color: #091c3f;
      filter: blur(.5px);
    }
</style>
