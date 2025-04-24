<template>
  <div style="height:100%; overflow-y: auto;">
    <el-form label-position="left" label-width="180px" class="task-edit__form">
      <el-container>
        <el-col>
          <el-form-item label="URL">
            <el-row style="display: flex;">
              <el-col style="flex: 1;">
                <ub-enum
                  value="posContestResultUrl"
                  eGroup="AC_CONSTANT"
                  style="width: 500px;"
                  disabled="true"
                ></ub-enum>
              </el-col>
              <el-col style="flex: 1;">
              </el-col>
              <el-col style="flex: 100;">
                <div>{{posContestResultUrl}}</div>
              </el-col>
            </el-row>
          </el-form-item>
          <el-form-item label="Стан">

            <el-row style="display: flex;">
              <el-col style="flex: 1;">
                <ub-enum
                  value="posContestResultState"
                  eGroup="AC_CONSTANT"
                  style="width: 500px;"
                  disabled="true"
                ></ub-enum>
              </el-col>
              <el-col style="flex: 1;">
              </el-col>
              <el-col style="flex: 100;">
                <ub-enum v-model="state" :disabled="isLoading" style="width: 200px;" eGroup="HR_STATE_CONTEST"></ub-enum>
              </el-col>
            </el-row>

            <el-button
              size="mini"
              type="primary"
              :disabled="isLoading"
              @click="invokeRequestAll()"
            >Надіслати запит</el-button>
          </el-form-item>
          <el-form-item label="Знайдено карток">
            <div>Всього: {{posContestItems.length}}</div>
            <div>Оброблено: {{posContestItemsOk.length}}</div>
            <div>Помилок: {{posContestItemsError.length}}</div>
          </el-form-item>
          <el-form-item>
            <span v-if="isCompleteDate">Завантажено {{isCompleteDate | datetime}}</span>
          </el-form-item>
          <el-form-item label="Елементи">
            <el-table v-loading="isLoading" :data="posContestItemsView">
              <el-table-column label="state" width="100">
                <template slot-scope="scope">{{scope.row.state}}</template>
              </el-table-column>
              <el-table-column label="Наказ" width="400">
                <template slot-scope="scope">{{scope.row['orderID.description']}}</template>
              </el-table-column>
              <el-table-column label="Посада" width="400">
                <template slot-scope="scope">
                  <div>{{scope.row['paraID.description']}}</div>
                  <div>{{scope.row['organizationID.description']}}</div>
                  <div>{{scope.row['positionID.name']}}</div>
                </template>
              </el-table-column>

              <el-table-column label="Результат конкурсу" width="200">
                <template slot-scope="scope">
                  <div>Дата проведення з: {{scope.row['dateFrom'] | datetime}} - {{scope.row['dateTo'] | datetime}}</div>
                  <div>Стан результату: {{scope.row['result']}}</div>
                  <div>Код на порталі вакансій: {{scope.row['portalCode']}}</div>
                  <div>Дата закриття вакансії: {{scope.row['dateClose'] | datetime}}</div>
                </template>
              </el-table-column>
              <el-table-column label="*" width="200">
                <template slot-scope="scope">
                  <div>ID: {{scope.row.ID}}</div>
                  <div>{{getState(scope.row)}}</div>
                  <div>
                    <el-button
                      size="mini"
                      type="primary"
                      :disabled="isLoading"
                      @click="invokeRequestByID(scope.row)"
                    >Надіслати запит</el-button>
                  </div>
                  <div>
                    <input
                      ref="imgFile"
                      type="file"
                      :accept="intAccept"
                      style="display: none;"
                      @change="readURL($event);"
                    />
                    <el-button
                      size="mini"
                      type="primary"
                      :disabled="isLoading"
                      @click="$refs.imgFile.click()"
                    >Завантажити з файлу</el-button>
                  </div>
                </template>
              </el-table-column>
            </el-table>
          </el-form-item>
        </el-col>
      </el-container>
    </el-form>
  </div>
</template>

<script>
/**
 * @param {File} inputFile
 * @return {Promise<{fileName: string, fileSize: number, fileType: string, data: string}>}
 */
async function getFileData(inputFile) {
  const name = inputFile.name;
  const size = inputFile.size;
  const type = inputFile.type;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", eventLoad => {
      const data = reader.result;

      const result = {
        fileName: name,
        fileSize: size,
        fileType: type,
        data: data
      };

      resolve(result);
    });

    reader.readAsText(inputFile);
  });
}

/**
 * @param {File} file
 */
async function importPosContestResultFromFile(file) {
  const fileInfo = await getFileData(file);
  await $App.connection.run({
    entity: "hr_export",
    method: "setPosContestResult",
    data: fileInfo.data
  });
}

/**
 * @param {FileList} files
 */
async function importPosContestResultFromFileList(files) {
  if (files && files.length > 0) {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      await importPosContestResultFromFile(file);
    }
  }
}

/**
 * @param {number} posContestID
 */
async function requestPosContestResultByID(posContestID) {
  await $App.connection.run({
    entity: "hr_export",
    method: "requestPosContestResultByID",
    execParams: {
      ID: posContestID
    }
  });
}

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

async function posContestItemsFill(posContestItems, state, posContestID) {
  const onDate = appAC.globalApplicationDate();
  const items = await UB.Repository("hr_listPosContest")
    .attrs([
      "ID",
      "orderID.description",
      "paraID.description",
      "organizationID.description",
      "positionID.name",
      "state",
      "dateFrom",
      "dateTo",
      "result",
      "portalCode",
      "dateClose"
    ])
    .orderBy("dateFrom")
    .whereIf(!posContestID, "state", "=", state)
    .whereIf(!!posContestID, "ID", "=", posContestID)
    .selectAsObject();

  ArrayClear(posContestItems);
  items.forEach(ite => {
    ite.status = null;
    posContestItems.push(ite);
  });
}

const ubSelect = require("@unitybase/adminui-vue/components/controls/USelectEntity.vue")
  .default;
const ubEnum = require("@unitybase/adminui-vue/components/controls/USelectEnum.vue")
  .default;

const moment = require("moment");

export default {
  components: {
    "ub-enum": ubEnum,
    "ub-select": ubSelect
  },
  props: {
    customParams: Object
  },
  data: function() {
    const defaultState = AC.settings.get("posContestResultState", null, null); //'AGREED'
    const constDefaultUrl = AC.settings.get("posContestResultUrl", null, null);
    return {
      intAccept: "application/json",
      isLoading: false,
      isCompleteDate: null,
      state: defaultState,
      posContestResultUrl: constDefaultUrl,
      posContestItems: [],
      posContestItemsOk: [],
      posContestItemsError: [],
      posContestItemsView: [],
      itemsState: []
    };
  },
  created() {
    this.changeState(true);
  },
  watch: {
    state() {
      this.changeState(true);
    }
  },

  methods: {
    readURL(event) {
      const me = this;
      const input = event.target;
      /** @type  {FileList} */
      const inputFiles = input && input.files;
      Promise.resolve().then(async () => {
        this.isLoading = true;
        try {
          await importPosContestResultFromFileList(inputFiles);
          this.isCompleteDate = new Date();
        } catch (error) {
          this.isCompleteDate = null;
          throw error;
        } finally {
          this.isLoading = false;
        }
        await this.changeState();
      });
    },
    async changeState(clearOld = false) {
      await Promise.resolve().then(async () => {
        this.isLoading = true;
        const posContestID =
          (this.customParams && this.customParams.posContestID) || null;
        try {
          await posContestItemsFill(
            this.posContestItems,
            this.state,
            posContestID
          );
          ArrayClear(this.posContestItemsView);
          if (clearOld) {
            ArrayClear(this.posContestItemsError);
          }
          if (posContestID) {
            const found = this.posContestItems.find(
              ite => ite.ID === posContestID
            );
            this.addViewItemView(found);
          }
          this.posContestItemsError.forEach(ite => {
            this.addViewItemError(ite);
          });
        } finally {
          this.isLoading = false;
        }
      });
    },
    invokeRequestAll() {
      Promise.resolve().then(async () => {
        this.isLoading = true;
        this.isCompleteDate = null;
        try {
          await Promise.all(
            this.posContestItems.map(async posContest => {
              const posContestID = posContest.ID;
              try {
                await requestPosContestResultByID(posContestID);
                this.setState(posContest, "OK");
                this.addViewItemOk(posContest);
              } catch (error) {
                this.setState(posContest, error.message);
                this.addViewItemError(posContest);
              }
            })
          );
          this.isCompleteDate = new Date();
        } finally {
          this.isLoading = false;
        }
        await this.changeState();
      });
    },
    invokeRequestByID(posContest) {
      Promise.resolve().then(async () => {
        this.isLoading = true;
        this.isCompleteDate = null;
        try {
          const posContestID = posContest.ID;
          try {
            await requestPosContestResultByID(posContestID);
            this.setState(posContest, "OK");
            this.addViewItemOk(posContest);
          } catch (error) {
            this.setState(posContest, error.message);
            this.addViewItemError(posContest);
          }

          this.isCompleteDate = new Date();
        } finally {
          this.isLoading = false;
        }
        await this.changeState();
      });
    },
    setState(posContest, message) {
      const found = this.itemsState.find(
        ite => ite.posContestID === posContest.ID
      );
      if (!found) {
        this.itemsState.push({
          posContestID: posContest.ID,
          message: message
        });
      } else {
        found.message = message;
      }
    },
    getState(posContest) {
      const found =
        posContest &&
        this.itemsState.find(ite => ite.posContestID === posContest.ID);
      return found && found.message;
    },
    addViewItemView(posContest) {
      if (posContest) {
        const foundRoot = this.posContestItems.find(
          ite => ite.ID === posContest.ID
        );
        if (foundRoot) {
          const found = this.posContestItemsView.find(
            ite => ite.ID === foundRoot.ID
          );
          if (!found) {
            this.posContestItemsView.push(foundRoot);
          }
        }
      }
    },
    addViewItemOk(posContest) {
      if (posContest) {
        const found = this.posContestItemsView.find(
          ite => ite.ID === posContest.ID
        );
        if (found) {
          ArrayRemoveItem(this.posContestItemsView, found);
        }
      }
      if (posContest) {
        const found = this.posContestItemsError.find(
          ite => ite.ID === posContest.ID
        );
        if (found) {
          ArrayRemoveItem(this.posContestItemsError, found);
        }
      }
      // if (posContest) {
      //   const found = this.posContestItemsOk.find(ite => ite.ID === posContest.ID)
      //   if (found) {
      //     ArrayRemoveItem(this.posContestItemsOk, found)
      //   }
      // }

      if (posContest) {
        const foundRoot = this.posContestItems.find(
          ite => ite.ID === posContest.ID
        );
        if (foundRoot) {
          const found = this.posContestItemsOk.find(
            ite => ite.ID === foundRoot.ID
          );
          if (!found) {
            this.posContestItemsOk.push(foundRoot);
          }
        }
      }
    },
    addViewItemError(posContest) {
      // if (posContest) {
      //   const found = this.posContestItemsView.find(ite => ite.ID === posContest.ID)
      //   if (found) {
      //     ArrayRemoveItem(this.posContestItemsView, found)
      //   }
      // }
      // if (posContest) {
      //   const found = this.posContestItemsError.find(ite => ite.ID === posContest.ID)
      //   if (found) {
      //     ArrayRemoveItem(this.posContestItemsError, found)
      //   }
      // }
      if (posContest) {
        const found = this.posContestItemsOk.find(
          ite => ite.ID === posContest.ID
        );
        if (found) {
          ArrayRemoveItem(this.posContestItemsOk, found);
        }
      }

      if (posContest) {
        const foundRoot = this.posContestItems.find(
          ite => ite.ID === posContest.ID
        );
        if (foundRoot) {
          const found = this.posContestItemsError.find(
            ite => ite.ID === foundRoot.ID
          );
          if (!found) {
            this.posContestItemsError.push(foundRoot);
          }
        }
        if (foundRoot) {
          const found = this.posContestItemsView.find(
            ite => ite.ID === foundRoot.ID
          );
          if (!found) {
            this.posContestItemsView.push(foundRoot);
          }
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
    }
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
