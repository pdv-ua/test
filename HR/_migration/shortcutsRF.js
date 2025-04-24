/* global $App */
module.exports = [
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'ac_dictCostType',
    isFolder: 0,
    caption: 'Місце виникнення витрат',
    caption_uk: 'Місце виникнення витрат',
    caption_ru: 'Место возникновения затрат',
    caption_az: 'Xərc sahələri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'ac_dictCostType',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' },
          { name: 'fullName' },
          { name: 'dictBalanceUnitID.description', description: `{{UB.i18n('Балансова одиниця')}}` },
          { name: 'dictActivityTypeID.description', description: `{{UB.i18n('Вид діяльності')}}` },
          { name: 'dictCostPlaceTypeID.description', description: `{{UB.i18n('Тип місця виникнення витрат')}}` },
          { name: 'dictDepCostKindID.description', description: `{{UB.i18n('Вид підрозділу')}}` },
          { name: 'dictCostPlaceNumberID.description', description: `{{UB.i18n('Порядковий номер місця виникнення витрат')}}` },
          { name: 'accountID.description', description: `{{UB.i18n('Рахунок витрат')}}` },
          { name: 'calcScheme' },
          { name: 'mvp' },
          { name: 'levelCode' },
          { name: 'dateFromEmpty' },
          { name: 'dateToEmpty' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'ac_dictDocKind',
    isFolder: 0,
    caption: 'Види документів',
    caption_uk: 'Види документів',
    caption_ru: 'Виды документов',
    caption_az: 'Sənəd növləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'ac_dictDocKind',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' },
          { name: 'docType' },
          { name: 'vacationKindID.description', description: `{{UB.i18n('Вид відпустки')}}` }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1,
    cmpInitConfig: {
      customActions: [
        {
          tooltip: 'Масова обробка',
          text: 'Масова обробка',
          iconCls: 'fas fa-tasks',
          handler: function (btn) {
            $App.doCommand({
              cmdType: 'showForm',
              formCode: 'ac_entityListEditor',
              cmpInitConfig: {
                entityListGrid: btn.up('[entityName=ac_dictDocKind]'),
                isSimpleEntity: true,
                showRestoreModeCheckbox: false
              }
            })
          }
        }
      ]
    }
  }
]
