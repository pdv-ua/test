<template>
  <div style="height:100%; overflow-y: auto;">
    <el-form label-position="left" label-width="180px" class="task-edit__form">
      <el-container>
        <el-header style="margin-top: 10px">
          <u-grid :columns="3" label-position="left">
            <u-form-row label="Організація"  >
              <u-select-entity
                  v-model="organizationID"
                  :repository="getOrgs"
                  display-attribute="description"
                  valueAttribute="ID"
                  remove-default-actions
                  ref="organizationID"
              />
            </u-form-row>
            <u-form-row label="Вид завантаження">
              <u-select-enum
                  v-model="downloadType"
                  e-group="HR_DOWNLOAD_TYPE"
                  @input="this.dictDocKindID = null; clearList()"
              />
            </u-form-row>
            <u-form-row label="Вид документу" v-if="downloadType === 'DOC'" >
              <u-select-entity
                  v-model="dictDocKindID"
                  :repository="getDocKinds"
                  display-attribute="name"
                  valueAttribute="ID"
                  remove-default-actions
                  ref="dictDocKindID"
                  @input="clearList()"
              />
            </u-form-row>

          </u-grid>
        </el-header>
        <el-col>
          <el-form-item label>
            <input
                ref="imgFile"
                type="file"
                :accept="intAccept"
                multiple
                style="display: none;"
                @change="readURL($event);"
            />
            <el-button
                size="mini"
                type="primary"
                :disabled="isLoading"
                @click="downloadFiles($refs.imgFile)"
            >{{downloadType === 'DOC' ? 'Завантажити сканкопії' : 'Завантажити файли фотокарток'}}</el-button>
            <el-button
                size="mini"
                type="primary"
                :disabled="isLoading"
                @click="changeAllPhotos()"
            >{{downloadType === 'DOC' ? 'Змінити всі сканкопії' : 'Змінити всі фото'}}</el-button>
            <el-button
                size="mini"
                type="primary"
                :disabled="isLoading"
                @click="clearList()"
            >Очистити список</el-button>
            <el-button
                size="mini"
                type="primary"
                :disabled="isLoading"
                @click="filterList()"
            >{{showFirstFounded ? 'Показати спочатку незнайдені особи' : 'Показати спочатку знайдені особи'}}</el-button>
          </el-form-item>
          <el-form-item label>
            <el-table v-loading="isLoading" :data="infos" ref="myTable">
              <el-table-column label="" width="40">
                <template slot-scope="scope"><input type="checkbox" id="isChecked" v-model="scope.row.isChecked"></template>
              </el-table-column>
              <el-table-column label="Імя файлу" width="200">
                <template slot-scope="scope">{{scope.row.fileInfo.fileName}}</template>
              </el-table-column>
              <el-table-column label="Зображення нове" width="130">
                <template slot-scope="scope">
                  <img :src="scope.row.fileInfo.url" style="width: 90px; height: 120px;" />
                </template>
              </el-table-column>

              <el-table-column label="Особа" width="500">
                <template slot-scope="scope">
                  <template v-if="!scope.row.people">
                    <span style="color: red;">Особу не знайдено</span>
                  </template>
                  <template v-if="!!scope.row.people">
                    <div>
                      Повне ім'я:
                      <b>{{scope.row.people.fullFIO}}</b>
                    </div>
                    <div>
                      РНОКПП:
                      <b>{{scope.row.people.taxCode}}</b>
                    </div>
                    <div>Табельний номер: {{scope.row.people.tabNum}}</div>
                    <div>Дата народження: {{scope.row.people.birthDate | datetime}}</div>
                    <div>Стать: {{scope.row.people.sexType}}</div>
                    <div>Стан: {{scope.row.people.state}}</div>
                  </template>
                </template>
              </el-table-column>

              <el-table-column label="Зображення старе" width="130">
                <template slot-scope="scope">
                  <template v-if="!scope.row.people">
                    <div></div>
                  </template>
                  <template v-if="!!scope.row.people">
                    <template v-if="!scope.row.people.photoUrl">
                      <span style="color: red;">{{downloadType === 'DOC' ? 'Сканкопія відсутня' : 'Фото відсутнє'}}</span>
                    </template>
                    <template v-if="!!scope.row.people.photoUrl">
                      <img :src="scope.row.people.photoUrl" style="width: 90px; height: 120px;" />
                    </template>
                  </template>
                </template>
              </el-table-column>

              <el-table-column label="Дії" width="150">
                <template slot-scope="scope">
                  <template v-if="!scope.row.people">
                    <div></div>
                  </template>
                  <template v-if="!!scope.row.people">
                    <div>
                      <el-button
                          size="mini"
                          type="primary"
                          :disabled="isLoading"
                          @click="changePhotoByInfo(scope.row)"
                      >{{downloadType === 'DOC' ? 'Змінити сканкопію' : 'Змінити фото'}}</el-button>
                    </div>
                  </template>
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
const _ = require("lodash");
const moment = require("moment");
const { mountUtils, Form } = require("@unitybase/adminui-vue");
const urlCreator = window.URL || window.webkitURL;

export default {
  data() {
    return {
      intAccept: "image/*",
      isLoading: false,
      infos: [],
      showFirstFounded: true,
      downloadType: null,
      dictDocKindID: null,
      organizationID: null
    };
  },
  methods: {
    getOrgs () {
      return this.$UB.Repository('ac_organization')
          .attrs('description', 'ID')
          .where('ID', 'in', $App.connection.userData().userOrg)
          .misc({
            __mip_ondate: appAC.globalApplicationDate()
          })
          .orderBy('description')
    },
    getDocKinds () {
      return this.$UB.Repository('ac_dictDocKind')
          .attrs('ID', 'name', 'code')
          .orderBy('code')
    },
    readURL(event) {
      const me = this;
      const input = event.target;
      /** @type  {FileList} */
      const inputFiles = input && input.files;
      if (inputFiles) {
        this.getFiles(inputFiles);
      }
    },

    /**
     * @param {FileList} inputFiles
     */
    async getFiles(inputFiles) {
      ArrayClear(this.infos);

      await Promise.all(
          _.map(inputFiles, async (/** @type  {File} */ file) => {
            const fileInfo = await getFileData(file);
            const people = await findPeopleByFileName(fileInfo.fileName, this._data);
            this.infos.push({
              fileInfo: fileInfo,
              people: people,
              isChecked: true
            });
          })
      )
    },

    downloadFiles (imgFile) {
      if (this.downloadType === 'DOC' && !this.dictDocKindID) {
        $App.dialogInfo('Оберіть вид документу для завантаження!', UB.i18n('Увага'))
      } else {
        imgFile.click()
      }

    },

   changePhotoByInfo: async function(info, isChangeAll = false) {
      let people = info.people
     if (people) {
       const contentData = info.fileInfo.data;
       if (this._data.downloadType === 'PHOTO') {
         const photoRes = await $App.connection.post("setDocument", contentData, {
           params: {
             entity: "hr_employee",
             attribute: "photo",
             ID: people.ID,
             filename: info.fileInfo.fileName
           },
           headers: { "Content-Type": info.fileInfo.fileType }
         })

         await $App.connection.run({
           entity: "hr_employee",
           method: "update",
           fieldList: ["ID", "photo"],
           __skipOptimisticLock: true,
           execParams: {
             ID: people.ID,
             photo: JSON.stringify(photoRes.data.result)
           }
         }).then(()=> {
           if (!isChangeAll) $App.dialogInfo('Файл успішно змінено')
         })
       } else {
         let employeeDocsID = people.employeeDocsID
         let attachDocID = people.documentID

         if (!employeeDocsID) {
           let employeeDocs = await $App.connection.run({
             entity: 'hr_employeeDocs',
             method: 'insert',
             __skipOptimisticLock: true,
             execParams: {
               employeeID: people.ID,
               dictDocKindID: this._data.dictDocKindID
             }
           })
           employeeDocsID = employeeDocs.execParams.ID
         }
         if (!attachDocID) {
           let attachDoc = await $App.connection.run({
             entity: 'hr_attachDoc',
             method: 'insert',
             __skipOptimisticLock: true,
             execParams: {
               entityID: employeeDocsID,
               caption: info.fileInfo.fileName
             }
           })
           attachDocID = attachDoc.execParams.ID
         }

         const photoRes = await $App.connection.post("setDocument", contentData, {
           params: {
             entity: 'hr_attachDoc',
             attribute: 'document',
             ID: attachDocID,
             filename: info.fileInfo.fileName
           },
           headers: { "Content-Type": info.fileInfo.fileType }
         });
         const resultValue = photoRes.data;
         const docVal = JSON.stringify(resultValue.result);

         await $App.connection.run({
           entity: "hr_attachDoc",
           method: "update",
           fieldList: ["ID", "document"],
           __skipOptimisticLock: true,
           execParams: {
             ID: attachDocID,
             document: docVal
           }
         })
       }

       people = await findPeopleByFileName(info.fileInfo.fileName, this._data);
       info.people = people;
       if (!isChangeAll) $App.dialogInfo('Файл успішно змінено')
     }

   },

    changeAllPhotos() {
      this.infos.forEach((row) => {
        if (row.isChecked) this.changePhotoByInfo(row, true)
      })
      $App.dialogInfo('Вибрані файли успішно змінено!')
    },

    filterList() {
      this.showFirstFounded = !this.showFirstFounded
      this.infos = this.infos.sort((a,b) => a.people && !b.people ? (this.showFirstFounded ? -1 : 1) : (this.showFirstFounded ? 1 : -1))

    },

    clearList() {
      ArrayClear(this.infos)
    }
  },
  mounted () {
    this.organizationID = appAC.globalOrganization()
    this.downloadType = 'PHOTO'
  },
  filters: {
    datetime(str) {
      if (!str || str < 1) {
        return "(n/a)";
      }
      const date = new Date(str);
      return moment(date).format("YYYY-MM-DD HH:mm:ss");
    }
  }
}

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
    entity: "imp_hr_entity" || entity,
    props: {
      customParams: customParams
    }
  }).mount();
};

function ArrayClear(arr) {
  if (arr) {
    while (arr.length > 0) {
      arr.pop();
    }
  }
}

function getFileNameWithoutExt(fileName) {
  const arr = fileName.split(".");
  if (arr.length > 1) {
    arr.pop();
  }
  const res = arr.join(".");
  return res;
}

async function findPeopleByFileName(fileName, data) {
  const name = getFileNameWithoutExt(fileName);

  let taxCode = name;

  if (name.indexOf("_") >= 0) {
    const tmp = name.split("_");
    taxCode = tmp[1];
  }
  let employee = await UB.Repository('hr_employee')
      .attrs(['ID', 'fullFIO', 'sexType', 'taxCode', 'tabNum',
        'recordNumber', 'birthDate', 'birthPlace', 'photo'])
      .where('taxCode', '=', taxCode)
      .selectSingle()
  if (employee && data && data.organizationID) {
    let employeeOrg = await UB.Repository('ac_employeeOrg')
        .attrs(['employeeID'])
        .where('employeeID', '=', employee.ID)
        .where('organizationID', '=', data.organizationID)
        .selectSingle()
    employee = employeeOrg ? employee : null
  }

  if (employee) {
    employee.photoUrl = null;
    let photoJson
    let photoArrayBuffer
    if (data.downloadType === 'PHOTO' && employee.photo) {
      photoJson = JSON.parse(employee.photo)
      try {
        photoArrayBuffer = await $App.connection.getDocument(
            {
              entity: "hr_employee",
              attribute: "photo",
              id: employee.ID
            },
            {
              resultIsBinary: true
            })
      } catch (e) {}
      if (photoArrayBuffer) {
        const blob = new Blob([photoArrayBuffer], {
          type: photoJson.ct
        });
        const url = urlCreator.createObjectURL(blob);
        employee.photoUrl = url;
      }
    } else if (data.downloadType === 'DOC') {
      const employeeDoc = await UB.Repository('hr_employeeDocs')
          .attrs('ID')
          .where('employeeID', '=', employee.ID)
          .where('dictDocKindID', '=', data.dictDocKindID)
          .selectAsArrayOfValues()
      const attachDoc = await UB.Repository('hr_attachDoc')
          .attrs(['ID', 'document', 'entityID'])
          .where('entityID', 'in', employeeDoc || [])
          .selectSingle()
      employee.employeeDocsID = (attachDoc && attachDoc.entityID) || employeeDoc[0]
      if (attachDoc && attachDoc.document) {
        photoJson = JSON.parse(attachDoc.document);
        photoArrayBuffer = await $App.connection.getDocument(
            {
              entity: 'hr_attachDoc',
              attribute: 'document',
              id: attachDoc.ID
            },
            {
              bypassCache: true,
              resultIsBinary: true
            })
        employee.documentID = attachDoc.ID
        const blob = new Blob([photoArrayBuffer], {
          type: photoJson.ct
        });

        const url = urlCreator.createObjectURL(blob);
        employee.photoUrl = url;
      }

    }
  }

  return employee;
}

/**
 * @param {File} inputFile
 * @return {Promise<{fileName: string, fileSize: number, fileType: string, data: ArrayBuffer, url: string}>}
 */
async function getFileData(inputFile) {
  const name = inputFile.name;
  const size = inputFile.size;
  const type = inputFile.type;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", eventLoad => {
      const data = reader.result;
      const blob = new Blob([data], { type: type });
      const url = urlCreator.createObjectURL(blob);

      const result = {
        fileName: name,
        fileSize: size,
        fileType: type,
        data: data,
        url: url
      };

      resolve(result);
    });
    reader.addEventListener("error", eventLoad => {
      reject(new Error(eventLoad.target.error));
    });
    reader.addEventListener("abort", eventLoad => {
      reject(new Error(`abort occurred reading file: ${inputFile.name}`));
    });
    reader.readAsArrayBuffer(inputFile);
  });
}
</script>




