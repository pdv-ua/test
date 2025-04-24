<template>
  <el-form label-position="left" label-width="180px" class="task-edit__form">
    <el-container>
      <el-col>
        <el-form-item label="Стан">
          <ub-enum v-model="state" style="width: 200px;" eGroup="HR_STATE_CONTEST"></ub-enum>
        </el-form-item>
        <el-form-item label="Дата створення з">
          <el-date-picker
            v-model="createDateFrom"
            format="dd.MM.yyyy"
            :picker-options="{
              firstDayOfWeek: 1
            }"
          />
        </el-form-item>
        <el-form-item label="Дата створення по">
          <el-date-picker
            v-model="createDateTo"
            format="dd.MM.yyyy"
            :picker-options="{
              firstDayOfWeek: 1
            }"
          />
        </el-form-item>

        <el-form-item>
          <el-button
            size="mini"
            type="primary"
            :disabled="isLoading"
            @click="invokeGenerateExportShow()"
          >Згенерувати</el-button>
          <el-button
            size="mini"
            type="primary"
            :disabled="isLoading"
            @click="invokeGenerateExportDownload()"
          >Згенерувати в файл</el-button>
        </el-form-item>

        <el-form-item label="Відповідь">
          <div class="task-edit__data-block">
            <el-input v-model="resultData" aria-readonly="true" :rows="28" type="textarea"></el-input>
          </div>
        </el-form-item>
      </el-col>
    </el-container>
  </el-form>
</template>

<script>
function ArrayClear(arr) {
  if (arr) {
    while (arr.length > 0) {
      arr.pop();
    }
  }
}

async function generateResult(states, createDateFrom, createDateTo) {
  const response = await $App.connection.xhr({
    method: "POST",
    url: "getPosContest",
    data: {
      states: states,
      createDateFrom: createDateFrom,
      createDateTo: createDateTo
    }
  });
  const resultData = response.data;
  return resultData;
}

const ubSelect = require("@unitybase/adminui-vue/components/controls/USelectEntity.vue")
  .default;
const ubEnum = require("@unitybase/adminui-vue/components/controls/USelectEnum.vue")
  .default;

export default {
  components: {
    "ub-enum": ubEnum,
    "ub-select": ubSelect
  },
  data: function() {
    return {
      isLoading: false,
      state: null, // 'AGREED',
      createDateFrom: null,
      createDateTo: null,
      resultData: null
    };
  },
  methods: {
    async invokeGenerateExportShow() {
      const state = this.state;
      const createDateFrom = this.createDateFrom;
      const createDateTo = this.createDateTo;
      const states = [];
      if (state && state.length > 0) {
        states.push(state);
      }
      const resultData = await generateResult(
        states,
        createDateFrom,
        createDateTo
      );
      this.resultData = JSON.stringify(resultData, null, 4);
    },

    async invokeGenerateExportDownload() {
      const state = this.state;
      const createDateFrom = this.createDateFrom;
      const createDateTo = this.createDateTo;
      const states = [];
      if (state && state.length > 0) {
        states.push(state);
      }
      const resultData = await generateResult(
        states,
        createDateFrom,
        createDateTo
      );
      this.resultData = JSON.stringify(resultData, null, 4);
      const fileName = "posContest.json";
      AC.filesService.saveAsPlain(this.resultData, fileName);
    }
  }
};

const { mountUtils, Form } = require("@unitybase/adminui-vue");
module.exports.mount = function({
  title,
  entity,
  instanceID,
  formCode,
  rootComponent
}) {
  // mountUtils.mountModal
  Form({
    component: rootComponent,
    title,
    formCode,
    entity: entity
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
