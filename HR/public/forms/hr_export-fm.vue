<template>
  <!-- 
{
  entity: 'hr_exportPubCfg',
  identifier: 'ID',
  notDelete: true,
  notUpdate: false,
  attrs: ['ID', 'exportPhoto', 'exportEmployee', 'siteName', 'connect'],
  items: [
    [1, 1, 1, 'Портал', 'http://hrmis-p.tst.acc.unitybase.info/api/upload-json']
  ]
}
  -->

  <div style="height:100%; overflow-y: auto;">
    <el-form label-position="left" label-width="480px" class="task-edit__form">
      <el-col>
        <el-collapse v-model="activeNames">
          <el-collapse-item :title="titleText" name="1">
            <el-form-item>
              <template slot="label">
                <label><ub-enum-description eGroup="AC_CONSTANT" value="hrExportCfgExportPhoto"></ub-enum-description></label>
              </template>
              <!-- <a slot="label" href="#" @click="invokeSettings('hrExportCfgExportPhoto')"></a> -->
              <input readonly type="text" role="spinbutton" class="x-form-field ub-require-control-u x-form-text x-form-field-text" data-errorqtip="" style="width: 100%;" :value="hrExportCfgExportPhoto | boolType">
            </el-form-item>
            <el-form-item>
              <template slot="label">
                <label><ub-enum-description eGroup="AC_CONSTANT" value="hrExportCfgExportEmployee"></ub-enum-description></label>
              </template>
              <input readonly type="text" role="spinbutton" class="x-form-field ub-require-control-u x-form-text x-form-field-text" data-errorqtip="" style="width: 100%;" :value="hrExportCfgExportEmployee | boolType">
            </el-form-item>
            <el-form-item>
              <template slot="label">
                <label><ub-enum-description eGroup="AC_CONSTANT" value="hrExportCfgSiteName"></ub-enum-description></label>
              </template>
              <input readonly type="text" role="spinbutton" class="x-form-field ub-require-control-u x-form-text x-form-field-text" data-errorqtip="" style="width: 100%;" :value="hrExportCfgSiteName | boolType">
            </el-form-item>
            <el-form-item>
              <template slot="label">
                <label><ub-enum-description eGroup="AC_CONSTANT" value="hrExportCfgConnect"></ub-enum-description></label>
              </template>
              <input readonly type="text" role="spinbutton" class="x-form-field ub-require-control-u x-form-text x-form-field-text" data-errorqtip="" style="width: 100%;" :value="hrExportCfgConnect | boolType">
            </el-form-item>
            <el-form-item>
              <template slot="label">
                <label><ub-enum-description eGroup="AC_CONSTANT" value="hrExportCfgFillPublicTotals"></ub-enum-description></label>
              </template>
              <input readonly type="text" role="spinbutton" class="x-form-field ub-require-control-u x-form-text x-form-field-text" data-errorqtip="" style="width: 100%;" :value="hrExportCfgFillPublicTotals | boolType">
            </el-form-item>
          </el-collapse-item>
        </el-collapse>
      </el-col>
    </el-form>
    <el-form label-position="left" label-width="180px" class="task-edit__form">
      <el-col>
        <el-form-item>
          <el-button
            size="mini"
            type="primary"
            :disabled="isLoading"
            @click="invokeDownload()"
          >{{downloadTxt}}</el-button>
          <el-button
            size="mini"
            type="primary"
            :disabled="!viewData.isCompleteDate"
            @click="invokeSend()"
          >{{sendTxt}}</el-button>
          <span
            v-if="!!viewData.isCompleteSendDate"
          >{{dataSendTxt}} {{viewData.isCompleteSendDate | datetime}}</span>
        </el-form-item>

        <el-form-item v-if="!!viewData.isCompleteDate" :label="exportedFilesTxt">
          <div>
            <span>{{downloadedTxt}} {{viewData.isCompleteDate | datetime}}</span>
          </div>
          <div>
            <span>{{dataExportedTxt}} '{{viewData.exportPath}}' {{allowToDownloadTxt}}</span>
          </div>

          <template v-for="(files, name) in viewData.filesGroup">
            <fieldset :key="name">
              <legend>{{name}}</legend>
              <template v-for="(fileName) in files">
                <div :key="fileName">
                  <a href="#" @click="invokeGetFile(fileName)">{{fileName}}</a>
                </div>
              </template>
            </fieldset>
          </template>
        </el-form-item>
      </el-col>
    </el-form>
  </div>
</template>

<script>
function ArrayClear(arr) {
  if (arr) {
    while (arr.length > 0) {
      arr.pop();
    }
  }
}

function ArrayRemoveItem(arr, item) {
  if (posContest) {
    const found = arr.find(ite => ite === item);
    if (found) {
      const newArr = arr.filter(ite => ite !== found);
      ArrayClear(arr);
      newArr.forEach(ite => arr.push(ite));
    }
  }
}

async function fillViewData(viewData) {
  viewData.isCompleteDate = null;
  viewData.isCompleteSendDate = null;

  viewData.exportPath = null;
  viewData.files = null;
  viewData.filesGroup = null;

  const onDate = appAC.globalApplicationDate();
  const mParams = await $App.connection.run({
    entity: "hr_export",
    method: "exportPublicData",
    onDate: onDate
  });
  const result = mParams.result;

  const exportPath = result.path;
  const files = result.files;
  const filesGroup = result.filesGroup;

  viewData.exportPath = exportPath;
  viewData.files = files;

  let tempFileGroup = {}
  for (let files in filesGroup) {
    tempFileGroup[UB.i18n(files)] = filesGroup[files]
  }
  viewData.filesGroup = tempFileGroup
  viewData.isCompleteDate = new Date();
}

async function hrExportSendData(viewData) {
  const uploadFileName = "uploadData.json";
  const mParams = await $App.connection.run({
    entity: "hr_export",
    method: "uploadPublicData",
    path: viewData.exportPath,
    filesGroup: viewData.filesGroup,
    uploadFileName: uploadFileName
  });

  viewData.isCompleteSendDate = new Date();
}

const enumDescription = require("./../controls/enumDescription.vue").default;

const _ = require("lodash");
const moment = require("moment");

export default {
  components: {
    "ub-enum-description": enumDescription
  },
  props: {
    customParams: Object
  },
  data: function() {
    const hrExportCfgExportPhoto = AC.settings.get(
      "hrExportCfgExportPhoto",
      null,
      null
    );
    const hrExportCfgExportEmployee = AC.settings.get(
      "hrExportCfgExportEmployee",
      null,
      null
    );
    const hrExportCfgSiteName = AC.settings.get(
      "hrExportCfgSiteName",
      null,
      null
    );
    const hrExportCfgConnect = AC.settings.get(
      "hrExportCfgConnect",
      null,
      null
    );
    const hrExportCfgFillPublicTotals = AC.settings.get(
      "hrExportCfgFillPublicTotals",
      null,
      null
    );
    return {
      isLoading: false,

      titleText: UB.i18n('Налаштування взаємодії (константи)'),
      downloadedTxt: UB.i18n('Завантажено'),
      downloadTxt: UB.i18n('Завантажити'),
      sendTxt: UB.i18n('Надіслати'),
      dataSendTxt: UB.i18n('Дані відіслано'),
      exportedFilesTxt: UB.i18n('Експортовані файли'),
      allowToDownloadTxt: UB.i18n('та доступні для завантаження в блоці "Експортовані файли"'),
      dataExportedTxt: UB.i18n('Дані експортовано на сервері в папку'),

      activeNames: null,

      hrExportCfgExportPhoto: hrExportCfgExportPhoto,
      hrExportCfgExportEmployee: hrExportCfgExportEmployee,
      hrExportCfgSiteName: hrExportCfgSiteName,
      hrExportCfgConnect: hrExportCfgConnect,
      hrExportCfgFillPublicTotals: hrExportCfgFillPublicTotals,
      viewData: {}
    };
  },
  created() {
    // this.changeState(true);
  },
  watch: {
    // state() {
    //   this.changeState(true);
    // }
  },

  methods: {
    async changeState() {
      this.isLoading = true;
      this.isLoading = false;
    },

    invokeDownload() {
      Promise.resolve().then(async () => {
        this.isLoading = true;
        try {
          await fillViewData(this.viewData);
        } finally {
          this.isLoading = false;
        }
      });
    },

    invokeGetFile(fileName) {
      Promise.resolve().then(async () => {
        this.isLoading = true;
        try {
          const mParams = await $App.connection.run({
            entity: "hr_export",
            method: "getJsonFile",
            path: this.viewData.exportPath,
            fileName: fileName
          });
          if (mParams.resultData) {
            AC.filesService.saveAsPlain(mParams.resultData, fileName);
          }
        } finally {
          this.isLoading = false;
        }
      });
    },

    invokeSend() {
      Promise.resolve().then(async () => {
        this.isLoading = true;
        try {
          await hrExportSendData(this.viewData);
        } finally {
          this.isLoading = false;
        }
      });
    },

    async invokeSettings(code) {
      const ac_constant = await UB.Repository("ac_constant")
        .attrs(["ID", "code"])
        .where("code", "=", code)
        .selectSingle();
      if (ac_constant) {
        const ac_settings = await UB.Repository("ac_settings")
          .attrs(["ID", "constantID"])
          .where("constantID", "=", ac_constant.ID)
          .selectSingle();
        if (ac_settings) {
          $App.doCommand({
            cmdType: "showForm",
            entity: "ac_settings",
            instanceID: ac_settings.ID
          });
        } else {
          $App.doCommand({
            cmdType: "showForm",
            entity: "ac_settings",
            customParams: {
              constantID: ac_constant.ID
            }
          });
        }
      }
    }
  },

  filters: {
    datetime(str) {
      if (!str) {
        return "(n/a)";
      }
      const date = new Date(str);
      return moment(date).format("YYYY-MM-DD HH:mm:ss");
    },
    boolType(str) {
      if (str === true) {
        return UB.i18n('Yes');
      }
      if (str === false) {
        return UB.i18n('No');
      }
      if (str && str.length > 0) {
        return str;
      }
      return "Не визначено";
    },
  }
};

const { mountUtils, Form } = require("@unitybase/adminui-vue");
module.exports.mount = function({
  title,
  entity,
  instanceID,
  formCode,
  rootComponent,
  customParams
}) {
  // mountUtils.mountModal
  Form({
    component: rootComponent,
    title,
    formCode,
    entity: entity,
    props: {
      customParams: customParams
    }
  }).mount();
};
</script>

<style>
.task-edit__form {
  padding: 10px 10px;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
}

.task-edit__buttons {
  display: flex;
  justify-content: center;
  margin: 30px;
}

.task-edit__additional-block {
  display: inline-block;
  height: 100%;
}

.task-edit__main-block {
  display: inline-block;
  width: 480px;
  height: 406px;
}

.task-edit__additional-block__items {
  height: 270px;
  overflow: auto;
  margin-bottom: 20px;
}

.task-edit__additional-templates {
  margin-bottom: 5px;
}

.task-edit__buttons button {
  margin-left: 5px;
}

.task-edit__main-block__more-texts {
  color: #aeb1b8;
  font-size: 22px;
}

.task-edit__main-block__more-texts:hover {
  color: #409eff;
  transition: 0.15s;
}

.task-edit .el-dialog__body {
  padding: 10px 40px;
}

.task-edit .el-dialog__header {
  padding: 20px 40px 10px;
}

.task-edit__data-block {
  width: 440px;
}

.task-edit__executors-block {
  height: 180px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 15px 10px 15px 15px;
  overflow: auto;
}

.task-edit__executor {
  display: flex;
  justify-content: start;
  cursor: pointer;
}

.task-edit__executor-row :hover {
  color: black;
}

.task-edit__executor-row + .task-edit__executor-row {
  margin-top: 10px;
}

.task-edit__data-block__top-left {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  align-content: space-between;
}
</style>
