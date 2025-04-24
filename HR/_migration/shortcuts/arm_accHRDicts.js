/* global $App */
module.exports = [
  {
    desktopCode: 'arm_accCfg',
    code: 'accHRFolderDictionary',
    isFolder: 1,
    caption: 'Довідники',
    caption_uk: 'Довідники',
    caption_ru: 'Справочники',
    caption_az: 'Soraqçalar',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-archive',
    displayOrder: 4000,
    items: [
      {
        desktopCode: 'arm_accHR',
        parentCode: 'accHRFolderDictionary',
        code: 'accHRFolderDictSick',
        isFolder: 1,
        caption: 'Неявки',
        caption_uk: 'Неявки',
        caption_ru: 'Неявки',
        caption_az: 'İş yerində olmama',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 100,
        items: [
          {
            desktopCode: 'arm_accHR',
            parentCode: 'accHRFolderDictSick',
            code: 'accHR_dictIllnessKind',
            isFolder: 0,
            caption: 'Типи листів непрацездатності',
            caption_uk: 'Типи листів непрацездатності',
            caption_ru: 'Типы больничных листов',
            caption_az: 'Xəstəlik vərəqələrinin növləri',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictIllnessKind') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 100
          },
          {
            desktopCode: 'arm_accHR',
            parentCode: 'accHRFolderDictSick',
            code: 'accHR_dictIllnessReason',
            isFolder: 0,
            caption: 'Причини непрацездатності',
            caption_uk: 'Причини непрацездатності',
            caption_ru: 'Причины нетрудоспособности',
            caption_az: 'İş qabiliyyətinin itirilməsinin səbəbləri',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictIllnessReason') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 200
          },
          {
            desktopCode: 'arm_accHR',
            parentCode: 'accHRFolderDictSick',
            code: 'accHR_dictSicknessDay',
            isFolder: 0,
            caption: 'Обмеження днів сплати для лікарняних',
            caption_uk: 'Обмеження днів сплати для лікарняних',
            caption_ru: 'Ограничение дней уплаты для больничных',
            caption_az: 'Əmək qabiliyyətinin müvəqqəti itirilməsi üçün ödəniş günlərinin məhdudlaşdırılması',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictSicknessDay') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 300
          },
          {
            desktopCode: 'arm_accHR',
            parentCode: 'accHRFolderDictSick',
            code: 'accHR_dictVacationKind',
            isFolder: 0,
            caption: 'Види відпусток',
            caption_uk: 'Види відпусток',
            caption_ru: 'Виды отпусков',
            caption_az: 'Məzuniyyət növləri',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictVacationKind') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 400
          }
        ]
      },
      {
        desktopCode: 'arm_accHR',
        parentCode: 'accHRFolderDictionary',
        code: 'accHRFolderDictContr',
        isFolder: 1,
        caption: 'Контрагенти',
        caption_uk: 'Контрагенти',
        caption_ru: 'Контрагенты',
        caption_az: 'Qarşı tərəflər',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 200,
        items: [
          {
            desktopCode: 'arm_accHR',
            parentCode: 'accHRFolderDictContr',
            code: 'accHR_contractor',
            isFolder: 0,
            caption: 'Контрагенти',
            caption_uk: 'Контрагенти',
            caption_ru: 'Контрагенты',
            caption_az: 'Qarşı tərəflər',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('ac_contractor') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 100
          },
          {
            desktopCode: 'arm_accHR',
            parentCode: 'accHRFolderDictContr',
            code: 'accHR_orgbusinesstype',
            isFolder: 0,
            caption: 'Типи організацій',
            caption_uk: 'Типи організацій',
            caption_ru: 'Типы организаций',
            caption_az: 'Təşkilat növləri',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('cdn_orgbusinesstype') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 200
          },
          {
            desktopCode: 'arm_accHR',
            parentCode: 'accHRFolderDictContr',
            code: 'accHR_corrindex',
            isFolder: 0,
            caption: 'Індекси кореспондентів',
            caption_uk: 'Індекси кореспондентів',
            caption_ru: 'Индексы корреспондентов',
            caption_az: 'Korrespondent indeksləri',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('cdn_corrindex') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 300
          },
          {
            desktopCode: 'arm_accHR',
            parentCode: 'accHRFolderDictContr',
            code: 'accHR_orgownershiptype',
            isFolder: 0,
            caption: 'Форми власності',
            caption_uk: 'Форми власності',
            caption_ru: 'Формы собственности',
            caption_az: 'Mülkiyyət növləri',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('cdn_orgownershiptype') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 400
          },
          {
            desktopCode: 'arm_accHR',
            parentCode: 'accHRFolderDictContr',
            code: 'accHR_contacttype',
            isFolder: 0,
            caption: 'Типи контактів',
            caption_uk: 'Типи контактів',
            caption_ru: 'Типы контактов',
            caption_az: 'Əlaqə növləri',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('cdn_contacttype') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 500
          },
          {
            desktopCode: 'arm_accHR',
            parentCode: 'accHRFolderDictContr',
            code: 'accHR_dictAlternateContractor',
            isFolder: 0,
            caption: 'Альтернативні одержувачі',
            caption_uk: 'Альтернативні одержувачі',
            caption_ru: 'Альтернативные получатели',
            caption_az: 'Alternativ qəbul edənlər',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('ac_dictAlternateContractor') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 600
          },
          {
            desktopCode: 'arm_accHR',
            parentCode: 'accHRFolderDictContr',
            code: 'accHR_bank',
            isFolder: 0,
            caption: 'Банки',
            caption_uk: 'Банки',
            caption_ru: 'Банки',
            caption_az: 'Banklar',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('ac_bank') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 700
          },
          {
            desktopCode: 'arm_accHR',
            parentCode: 'accHRFolderDictContr',
            code: 'accHR_currency',
            isFolder: 0,
            caption: 'Валюти',
            caption_uk: 'Валюти',
            caption_ru: 'Валюты',
            caption_az: 'Valyutalar',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('ac_currency') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 700
          }
        ]
      },
      {
        desktopCode: 'arm_accHR',
        parentCode: 'accHRFolderDictionary',
        code: 'accHRFolderDictBonus',
        isFolder: 1,
        caption: 'Дисциплінарна практика',
        caption_uk: 'Дисциплінарна практика',
        caption_ru: 'Дисциплинарная практика',
        caption_az: 'İntizam təcrübəsi',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 300,
        items: [
          {
            desktopCode: 'arm_accHR',
            parentCode: 'accHRFolderDictBonus',
            code: 'accHR_dictBonusKind',
            isFolder: 0,
            caption: 'Види нагород',
            caption_uk: 'Види нагород',
            caption_ru: 'Виды нагород',
            caption_az: 'Mükafat növləri',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictBonusKind') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 100
          },
          {
            desktopCode: 'arm_accHR',
            parentCode: 'accHRFolderDictBonus',
            code: 'accHR_dictBonusType',
            isFolder: 0,
            caption: 'Типи нагород',
            caption_uk: 'Типи нагород',
            caption_ru: 'Типы наград',
            caption_az: 'Mükafat növləri',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictBonusType') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 200
          },
          {
            desktopCode: 'arm_accHR',
            parentCode: 'accHRFolderDictBonus',
            code: 'accHR_dictBonus',
            isFolder: 0,
            caption: 'Нагороди',
            caption_uk: 'Нагороди',
            caption_ru: 'Награды',
            caption_az: 'Mükafatlar',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictBonus') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 300
          },
          {
            desktopCode: 'arm_accHR',
            parentCode: 'accHRFolderDictBonus',
            code: 'accHR_dictPenalty',
            isFolder: 0,
            caption: 'Стягнення',
            caption_uk: 'Стягнення',
            caption_ru: 'Взыскание',
            caption_az: 'Məsuliyyət tədbirləri',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictPenalty') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 400
          },
          {
            desktopCode: 'arm_accHR',
            parentCode: 'accHRFolderDictBonus',
            code: 'accHR_dictPenaltyReason',
            isFolder: 0,
            caption: 'Причини стягнення',
            caption_uk: 'Причини стягнення',
            caption_ru: 'Причины взыскания',
            caption_az: 'Məsuliyyət tədbirlərinin səbəbləri',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictPenaltyReason') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 500
          }
        ]
      },
      {
        desktopCode: 'arm_accHR',
        parentCode: 'accHRFolderDictionary',
        code: 'accHRFolderDictMilitary',
        isFolder: 1,
        caption: 'Військова служба',
        caption_uk: 'Військова служба',
        caption_ru: 'Военная служба',
        caption_az: 'Hərbi xidmət',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 400,
        items: [
          {
            desktopCode: 'arm_accHR',
            parentCode: 'accHRFolderDictMilitary',
            code: 'accHR_dictMilitaryDuty',
            isFolder: 0,
            caption: 'Військова служба',
            caption_uk: 'Військова служба',
            caption_ru: 'Военная служба',
            caption_az: 'Hərbi xidmət',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictMilitaryDuty') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 100
          }
        ]
      },
      {
        desktopCode: 'arm_accHR',
        parentCode: 'accHRFolderDictionary',
        code: 'accHRFolderDictList',
        isFolder: 1,
        caption: 'Інше',
        caption_uk: 'Інше',
        caption_ru: 'Другое',
        caption_az: 'Digər',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 450,
        items: [
          {
            desktopCode: 'arm_accHR',
            parentCode: 'accHRFolderDictList',
            code: 'accHR_dictContractKind',
            isFolder: 0,
            caption: 'Види договору',
            caption_uk: 'Види договору',
            caption_ru: 'Виды договора',
            caption_az: 'Müqavilə növləri',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictContractKind') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 1010
          },
          {
            desktopCode: 'arm_accHR',
            parentCode: 'accHRFolderDictList',
            code: 'accHR_payEl',
            isFolder: 0,
            caption: 'Види оплати',
            caption_uk: 'Види оплати',
            caption_ru: 'Виды оплаты',
            caption_az: 'Ödəniş növləri',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_payEl') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 1020
          },
          {
            desktopCode: 'arm_accHR',
            parentCode: 'accHRFolderDictList',
            code: 'accHR_dictRankAssignKind',
            isFolder: 0,
            caption: 'Види присвоєння рангу держслужбовцям',
            caption_uk: 'Види присвоєння рангу держслужбовцям',
            caption_ru: 'Виды присвоении ранга госслужащим',
            caption_az: 'Dövlət qulluqçularına ixtisas dərəcələrinin verilmə növləri',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictRankAssignKind') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 1030
          },
          {
            desktopCode: 'arm_accHR',
            parentCode: 'accHRFolderDictList',
            code: 'accHR_dictTask',
            isFolder: 0,
            caption: 'Завдання наказів',
            caption_uk: 'Завдання наказів',
            caption_ru: 'Задачи приказов',
            caption_az: 'Əmr tapşırıqları',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictTask') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 1040
          },
          {
            desktopCode: 'arm_accHR',
            parentCode: 'accHRFolderDictList',
            code: 'accHR_dictEmpOrderIndex',
            isFolder: 0,
            caption: 'Індекси номерів наказів',
            caption_uk: 'Індекси номерів наказів',
            caption_ru: 'Индексы номеров приказов',
            caption_az: 'Əmr nömrələrinin indeksləri',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictEmpOrderIndex') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 1050
          },
          {
            desktopCode: 'arm_accHR',
            parentCode: 'accHRFolderDictList',
            code: 'accHR_dictStaffCat',
            isFolder: 0,
            caption: 'Категорії персоналу',
            caption_uk: 'Категорії персоналу',
            caption_ru: 'Категории персонала',
            caption_az: 'İşçi heyəti kateqoriyaları',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictStaffCat') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 1060
          },
          {
            desktopCode: 'arm_accHR',
            parentCode: 'accHRFolderDictList',
            code: 'accHR_dictStaffSubCat',
            isFolder: 0,
            caption: 'Підкатегорії персоналу',
            caption_uk: 'Підкатегорії персоналу',
            caption_ru: 'Подкатегории персонала',
            caption_az: 'İşçi heyətinin alt kateqoriyaları',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictStaffSubCat') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 1065
          },
          {
            desktopCode: 'arm_accHR',
            parentCode: 'accHRFolderDictList',
            code: 'accHR_dictRestDaySchedule',
            isFolder: 0,
            caption: 'Розпорядок роботи у вихідні/святкові дні',
            caption_uk: 'Розпорядок роботи у вихідні/святкові дні',
            caption_ru: 'Розпорядок роботи у вихідні/святкові дні',
            caption_az: 'Розпорядок роботи у вихідні/святкові дні',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictRestDaySchedule') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 1067
          },
          {
            desktopCode: 'arm_accHR',
            parentCode: 'accHRFolderDictList',
            code: 'accHR_dictOrderDetReason',
            isFolder: 0,
            caption: 'Підстави наказів',
            caption_uk: 'Підстави наказів',
            caption_ru: 'Основания приказов',
            caption_az: 'Əmrlərin əsasları',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictOrderDetReason') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 1070
          },
          {
            desktopCode: 'arm_accHR',
            parentCode: 'accHRFolderDictList',
            code: 'accHR_dictOrderDetReasonDoc',
            isFolder: 0,
            caption: 'Підстави-документи наказів',
            caption_uk: 'Підстави-документи наказів',
            caption_ru: 'Основания-документы приказов',
            caption_az: 'Əmrlərin əsas sənədləri',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictOrderDetReasonDoc') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 1080
          },
          {
            desktopCode: 'arm_accHR',
            parentCode: 'accHRFolderDictList',
            code: 'accHR_dictVacationCorr',
            isFolder: 0,
            caption: 'Підстави коригування відпустки',
            caption_uk: 'Підстави коригування відпустки',
            caption_ru: 'Основания корректировки отпуска',
            caption_az: 'Məzuniyyət düzəlişlərinin əsası',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictVacationCorr') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 1100
          },
          {
            desktopCode: 'arm_accHR',
            parentCode: 'accHRFolderDictList',
            code: 'accHR_dictEventKnowledg',
            isFolder: 0,
            caption: 'Події ознайомлення',
            caption_uk: 'Події ознайомлення',
            caption_ru: 'События ознакомления',
            caption_az: 'Tanışlıq hadisələri',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictEventKnowledg') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 1105
          },
          {
            desktopCode: 'arm_accHR',
            parentCode: 'accHRFolderDictList',
            code: 'accHR_dictActingReason',
            isFolder: 0,
            caption: 'Причина виконання обов\'язків',
            caption_uk: 'Причина виконання обов\'язків',
            caption_ru: 'Причина выполнения обязанностей',
            caption_az: 'Vəzifə öhdəliklərinin yerinə yetirilmə səbəbi',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictActingReason') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 1110
          },
          {
            desktopCode: 'arm_accHR',
            parentCode: 'accHRFolderDictList',
            code: 'accHR_dictReasonDism',
            isFolder: 0,
            caption: 'Причини звільнення',
            caption_uk: 'Причини звільнення',
            caption_ru: 'Причины увольнения',
            caption_az: 'İşdən azad olunma səbəbləri',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictReasonDism') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 1120
          },
          {
            desktopCode: 'arm_accHR',
            parentCode: 'accHRFolderDictList',
            code: 'accHR_dictReasonMoving',
            isFolder: 0,
            caption: 'Причини переміщення',
            caption_uk: 'Причини переміщення',
            caption_ru: 'Причины перемещения',
            caption_az: 'Keçirmə üçün səbəblər',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictReasonMoving') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 1130
          },
          {
            desktopCode: 'arm_accHR',
            parentCode: 'accHRFolderDictList',
            code: 'accHR_dictRank',
            isFolder: 0,
            caption: 'Ранги держслужбовців',
            caption_uk: 'Ранги держслужбовців',
            caption_ru: 'Ранги госслужащих',
            caption_az: 'Dövlət qulluqçularının ixtisas dərəcələri',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictRank') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 1140
          },
          {
            desktopCode: 'arm_accHR',
            parentCode: 'accHRFolderDictList',
            code: 'accHR_dictEmpOrderText',
            isFolder: 0,
            caption: 'Заголовки та Преамбули',
            caption_uk: 'Заголовки та Преамбули',
            caption_ru: 'Заголовки и преамбулы',
            caption_az: 'Başlıqlar və preambulalar',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictEmpOrderText') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 1150
          },
          {
            desktopCode: 'arm_accHR',
            parentCode: 'accHRFolderDictList',
            code: 'accHR_dictTarifCoeff',
            isFolder: 0,
            caption: 'Тарифні розряди, коефіцієнти',
            caption_uk: 'Тарифні розряди, коефіцієнти',
            caption_ru: 'Тарифные разряды, коэффициенты',
            caption_az: 'Tarif kateqoriyaları, əmsallar',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictTarifCoeff') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 1160
          },
          {
            desktopCode: 'arm_accHR',
            parentCode: 'accHRFolderDictList',
            code: 'accHR_dictAppointKind',
            isFolder: 0,
            caption: 'Типи (підстави) призначення',
            caption_uk: 'Типи (підстави) призначення',
            caption_ru: 'Типы (основания) назначения',
            caption_az: 'Təyinat növləri (əsasları)',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictAppointKind') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 1170
          },
          {
            desktopCode: 'arm_accHR',
            parentCode: 'accHRFolderDictList',
            code: 'accHR_dictTempExecution',
            isFolder: 0,
            caption: 'ТВО за положенням',
            caption_uk: 'ТВО за положенням',
            caption_ru: 'ВИО по положению',
            caption_az: 'Statusuna görə vie',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictTempExecution') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 1180
          },
          {
            desktopCode: 'arm_accHR',
            parentCode: 'accHRFolderDictList',
            code: 'accHR_dictRankPsCategory',
            isFolder: 0,
            caption: 'Ранги держслужби по категоріям посад',
            caption_uk: 'Ранги держслужби по категоріям посад',
            caption_ru: 'Ранги госслужбы по категориям должностей',
            caption_az: 'Vəzifə kateqoriyalarına görə dövlət qulluğunun ixtisas dərəcələri',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictRankPsCategory') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 1190
          },
          {
            desktopCode: 'arm_accHR',
            parentCode: 'accHRFolderDictList',
            code: 'accHR_dictMissionPurpose',
            isFolder: 0,
            caption: 'Мета відрядження',
            caption_uk: 'Мета відрядження',
            caption_ru: 'Цель командировки',
            caption_az: 'Ezamiyətin məqsədi',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictMissionPurpose') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 1210
          },
          {
            desktopCode: 'arm_accHR',
            parentCode: 'accHRFolderDictList',
            code: 'accHR_dictMissionPhrase',
            isFolder: 0,
            caption: 'Вимоги до звіту про відрядження',
            caption_uk: 'Вимоги до звіту про відрядження',
            caption_ru: 'Требования к отчету о командировке',
            caption_az: 'Ezamiyət hesabatına dair tələb',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictMissionPhrase') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 1220
          },
          {
            desktopCode: 'arm_accHR',
            parentCode: 'accHRFolderDictList',
            code: 'accHR_dictRankReason',
            isFolder: 0,
            caption: 'Причина присвоєння рангу',
            caption_uk: 'Причина присвоєння рангу',
            caption_ru: 'Причина присвоения ранга',
            caption_az: 'İxtisas dərəcəsinin verilməsinin səbəbi',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictRankReason') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 1230
          },
          {
            desktopCode: 'arm_accHR',
            parentCode: 'accHRFolderDictList',
            code: 'accHR_dictEmpPosAttr',
            isFolder: 0,
            caption: 'Довідник параметрів призначень',
            caption_uk: 'Довідник параметрів призначень',
            caption_ru: 'Справочник параметров назначений',
            caption_az: 'Təyinat parametrlərinin soraqçası',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictEmpPosAttr') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 1240
          },
          {
            desktopCode: 'arm_accHR',
            parentCode: 'accHRFolderDictList',
            code: 'accHR_dictTermContract',
            isFolder: 0,
            caption: 'Термін контракту',
            caption_uk: 'Термін контракту',
            caption_ru: 'Срок контракта',
            caption_az: 'Müqavilənin müddəti',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictTermContract') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 1250
          },
          {
            desktopCode: 'arm_accHR',
            parentCode: 'accHRFolderDictList',
            code: 'accHR_dictParticipantType',
            isFolder: 0,
            caption: 'Вид учасника розсилки',
            caption_uk: 'Вид учасника розсилки',
            caption_ru: 'Вид участника рассылки',
            caption_az: 'Poçt göndərmə iştirakçısının növü',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictParticipantType') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 1260
          },
          {
            desktopCode: 'arm_accHR',
            parentCode: 'accHRFolderDictList',
            code: 'accHR_dictParticipant',
            isFolder: 0,
            caption: 'Учасник розсилки',
            caption_uk: 'Учасник розсилки',
            caption_ru: 'Участник рассылки',
            caption_az: 'Poçt üzvü',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictParticipant') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 1270
          },
          {
            desktopCode: 'arm_accHR',
            parentCode: 'accHRFolderDictList',
            code: 'accHR_dictOrderDetOrderWord',
            isFolder: 0,
            caption: 'Формулювання наказу',
            caption_uk: 'Формулювання наказу',
            caption_ru: 'Формулировка приказа',
            caption_az: 'Sifarişin mətni',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictOrderDetOrderWord') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 1280
          },
          {
            desktopCode: 'arm_accHR',
            parentCode: 'accHRFolderDictList',
            code: 'accHR_dictReasonTempAvgPay',
            isFolder: 0,
            caption: 'Причини тимчасового переведення з оплатою по середньому',
            caption_uk: 'Причини тимчасового переведення з оплатою по середньому',
            caption_ru: 'Причины временного перевода с оплатой по среднему',
            caption_az: 'Orta hesabla ödənişlə müvəqqəti köçürmənin səbəbləri',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictReasonTempAvgPay') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 1290
          }
        ]
      }
    ]
  }
]
