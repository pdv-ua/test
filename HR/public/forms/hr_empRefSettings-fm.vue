<template>
  <div id="refList">
    <div class="toolbar">
      <el-tooltip class="box-item"
                  effect="dark"
                  content="Оновити"
                  placement="bottom-start" >
        <el-button icon="el-icon-refresh" v-on:click="doLoad()"></el-button>
      </el-tooltip>
      <el-tooltip class="box-item"
                  effect="dark"
                  content="Зберегти"
                  placement="bottom-start" >
        <el-button icon="u-icon-save" v-on:click="doSave()" :disabled="isSaveDisabled"></el-button>
      </el-tooltip>
      <div style="display: inline-block;width: 260px;">
        <el-input placeholder="Шукати..." v-model="termText" @keyup.enter.native="search()">
          <el-button slot="append" icon="el-icon-search" @click="search()"></el-button>
          <el-button slot="append" icon="el-icon-delete" @click="clearSearch()"></el-button>
        </el-input>
      </div>
    </div>


    <el-container>
      <el-container>
        <el-main>
          <div class="scrolling-box" style="height: calc(100vh - 220px);">
            <el-table
                :data="refListShown"
            >
              <el-table-column
                  label="Довідка">
                <template slot-scope="scope">
                    <span>
                      <strong>{{ scope.row.name }}</strong>
                      <br>{{ scope.row.description }}
                    </span>
                </template>
              </el-table-column>
              <el-table-column
                  label="Працівники (діючі)"
                  width="280">
                <template slot-scope="scope">
                  <input
                      type="checkbox"
                      :value="scope.row.emp"
                      v-model="scope.row.emp"
                      @click="onChange()"
                  >
                </template>
              </el-table-column>
              <el-table-column
                  label="Особові рахунки"
                  width="280">
                <template slot-scope="scope">
                  <input
                      type="checkbox"
                      :value="scope.row.empNum"
                      v-model="scope.row.empNum"
                      @click="onChange()"
                  >
                </template>
              </el-table-column>
              <el-table-column
                  label="Особовий кабінет"
                  width="280">
                <template slot-scope="scope">
                  <input
                      type="checkbox"
                      :value="scope.row.empCard"
                      v-model="scope.row.empCard"
                      @click="onChange()"
                  >
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-main>
      </el-container>
    </el-container>
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
  components: { },
  props: {},
  data: () => ({
    refList: [],
    existSettingsID: false,
    oldRefList: [],
    isDirty: false,
    searchText: '',
    termText: '',
    organizationID: null,
    testvalue: true,
    options: [ {
      value: false,
      label: 'Ні'
    }, {
      value: true,
      label: 'Так'
    }]
  }),
  computed: {
    refListShown: function () {
      const term = this.searchText ? this.searchText.toLowerCase() : ''
      return this.refList.filter(item => term ? (item.name && (item.name.toLowerCase().indexOf(term) !== -1)) : true )
    },
    isSaveDisabled: function () {
      return !this.isDirty
    }
  },
  mounted () {
    this.doLoad()
    $App.on('ac:app:organizationChanged', (value) => {
      this.doLoad()
    })
    this.$root.$on('data-changed', () => {
      this.isDirty = true
    })
  },
  methods: {
    onChange () {
      this.$root.$emit('data-changed')
    },
    search () {
      this.searchText = this.termText
    },
    clearSearch () {
      this.searchText = ''
      this.termText = ''
    },
    loadRefSettings () {
      let refList = HR.refSettings.getRefList(appAC.globalOrganization())
      let dictUniversalRef = refList.addRefList
      let dictRef = refList.refList
      let empRefSettings = HR.refSettings.getSettings(appAC.globalOrganization())

        this.existSettingsID = empRefSettings && empRefSettings.ID
        let settingsData = (empRefSettings && empRefSettings.settingsData) || {}
        this.refList = dictRef.map(row => {
          return { name: row.name, code: row.code, description: ''}
        })
        dictUniversalRef.forEach(ref => {
          this.refList.push({ name: ref.name, code: ref.code, description: ref.description || '' })
        })
        this.refList.forEach(ref => {
          ref.emp = (settingsData[ref.code] && settingsData[ref.code].empValue) || false
          ref.empNum = (settingsData[ref.code] && settingsData[ref.code].empNumValue) || false
          ref.empCard = (settingsData[ref.code] && settingsData[ref.code].empCardValue) || false
        })
    },
    doLoad () {
      this.organizationID = appAC.globalOrganization()
      this.loadRefSettings()
      this.isDirty = false
    },
    doSave () {
      let settingsData = {}
      this.refList.forEach(ref => {
        if (!settingsData[ref.code]) settingsData[ref.code] = {}
        settingsData[ref.code].empValue = ref.emp
        settingsData[ref.code].empNumValue = ref.empNum
        settingsData[ref.code].empCardValue = ref.empCard
      })

      if (this.existSettingsID) {
        $App.connection.run({
          entity: 'hr_empRefSettings',
          method: 'update',
          __skipOptimisticLock: true,
          execParams: {
            ID: this.existSettingsID,
            settingsData: JSON.stringify(settingsData),
          }
        }).then(() => {
          HR.refSettings.loadSettings().then(() => {
            this.doLoad()
            this.isDirty = false
            this.$message(UB.i18n('Дані збережено'))
          })
        })
      } else {
        $App.connection.run({
          entity: 'hr_empRefSettings',
          method: 'insert',
          __skipOptimisticLock: true,
          execParams: {
            settingsData: JSON.stringify(settingsData),
            organizationID: this.organizationID
          }
        }).then(result => {
          HR.refSettings.loadSettings()
          this.doLoad()
          this.isDirty = false
          this.$message(UB.i18n('Дані збережено'))
        })
      }
    }
  }
}
</script>
<style>
#refList .scrolling-box {
  overflow-y: scroll;
  scroll-behavior: smooth;
}
#refList .toolbar {
  padding: 4px;
  border-bottom: 1px solid #cccccc;
  margin-bottom: 10px;
  top: 0;
}
#refList .toolbar .el-button{
  border: none;
}
#refList .is-current, #refList strong{
  color: #1773cf;
  font-weight: bold;
}
</style>
