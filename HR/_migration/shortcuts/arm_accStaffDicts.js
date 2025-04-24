/* global $App */
module.exports = [
  {
    desktopCode: 'arm_accCfg',
    code: 'accStaffFolderDictionary',
    isFolder: 1,
    caption: 'Довідники Оргструктура',
    caption_uk: 'Довідники Оргструктура',
    caption_ru: 'Справочники Оргструктура',
    caption_az: 'Kataloqlar Təşkilat strukturu',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-folder',
    displayOrder: 2000,
    items: [
      {
        desktopCode: 'arm_accStaff',
        parentCode: 'accStaffFolderDictionary',
        code: 'accStaffFolderPositions',
        isFolder: 1,
        caption: 'Посади',
        caption_uk: 'Посади',
        caption_ru: 'Должности',
        caption_az: 'Vəzifələr',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 100,
        items: [
          {
            desktopCode: 'arm_accStaff',
            parentCode: 'accStaffFolderPositions',
            code: 'accStaff_dictPosition',
            isFolder: 0,
            caption: 'Довідник посад',
            caption_uk: 'Довідник посад',
            caption_ru: 'Справочник должностей',
            caption_az: 'Vəzifələrin soraqçası',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictPosition') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 229
          },
          {
            desktopCode: 'arm_accStaff',
            parentCode: 'accStaffFolderPositions',
            code: 'accStaff_dictProfession',
            isFolder: 0,
            caption: 'Класифікатори професій',
            caption_uk: 'Класифікатори професій',
            caption_ru: 'Классификаторы профессий',
            caption_az: 'Peşə təsnifatları',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictProfession') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 230
          },
          {
            desktopCode: 'arm_accStaff',
            parentCode: 'accStaffFolderPositions',
            code: 'accStaff_dictWagePay',
            isFolder: 0,
            caption: 'Типи посад держслужбовців',
            caption_uk: 'Типи посад держслужбовців',
            caption_ru: 'Типы должностей госслужащих',
            caption_az: 'Dövlət qulluğu vəzifələrinin növləri',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictWagePay') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 253
          },
          {
            desktopCode: 'arm_accStaff',
            parentCode: 'accStaffFolderPositions',
            code: 'accStaff_categPayEl',
            isFolder: 0,
            caption: 'Нарахування для категорій посад',
            caption_uk: 'Нарахування для категорій посад',
            caption_ru: 'Начисления для категорий должностей',
            caption_az: 'Vəzifə kateqoriyalarına görə hesablamalar',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_categPayEl') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 254
          },
          {
            desktopCode: 'arm_accStaff',
            parentCode: 'accStaffFolderPositions',
            code: 'accStaff_dictEmpCategory',
            isFolder: 0,
            caption: 'Кваліфікаційна категорія персоналу',
            caption_uk: 'Кваліфікаційна категорія персоналу',
            caption_ru: 'Квалификационная категория персонала',
            caption_az: 'İşçi heyətin ixtisas kateqoriyaları',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictEmpCategory') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 330
          },
          {
            desktopCode: 'arm_accStaff',
            parentCode: 'accStaffFolderPositions',
            code: 'accStaff_dictPositionGroup',
            isFolder: 0,
            caption: 'Підстави змін окладів',
            caption_uk: 'Група посади',
            caption_ru: 'Группа должности',
            caption_az: 'Vəzifə qrupları',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictPositionGroup') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 350
          },
          {
            desktopCode: 'arm_accStaff',
            parentCode: 'accStaffFolderPositions',
            code: 'accStaff_dictPositionKind',
            isFolder: 0,
            caption: 'Вид посади',
            caption_uk: 'Вид посади',
            caption_ru: 'Вид должности',
            caption_az: 'Vəzifə növü',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictPositionKind') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 360
          },
          {
            desktopCode: 'arm_accStaff',
            parentCode: 'accStaffFolderPositions',
            code: 'accStaff_dictNameAddition',
            isFolder: 0,
            caption: 'Доповнення до назви',
            caption_uk: 'Доповнення до назви',
            caption_ru: 'Дополнение к названию',
            caption_az: 'Başlığa əlavə',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictNameAddition') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 435
          },
          {
            desktopCode: 'arm_accStaff',
            parentCode: 'accStaffFolderPositions',
            code: 'accStaff_addDescrPosition',
            isFolder: 0,
            caption: 'Складові додаткової інформації посади',
            caption_uk: 'Складові додаткової інформації посади',
            caption_ru: 'Составляющие дополнительной информации должности',
            caption_az: 'Əlavə iş məlumatının komponentləri',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_addDescrPosition') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 440
          }
        ]
      },
      {
        desktopCode: 'arm_accStaff',
        parentCode: 'accStaffFolderDictionary',
        code: 'accStaffFolderTerritory',
        isFolder: 1,
        caption: 'Адмінистративно-територіальний устрій',
        caption_uk: 'Адмінистративно-територіальний устрій',
        caption_ru: 'Административно-территориальное устройство',
        caption_az: 'İnzibati-ərazi sistemi',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 200,
        items: [
          {
            desktopCode: 'arm_accStaff',
            parentCode: 'accStaffFolderTerritory',
            code: 'accStaff_dictCountry',
            isFolder: 0,
            caption: 'Країни',
            caption_uk: 'Країни',
            caption_ru: 'Страны',
            caption_az: 'Ölkələr',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('ac_dictCountry') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 270
          },
          {
            desktopCode: 'arm_accStaff',
            parentCode: 'accStaffFolderTerritory',
            code: 'accStaff_dictRegion',
            isFolder: 0,
            caption: 'Регіони',
            caption_uk: 'Регіони',
            caption_ru: 'Регионы',
            caption_az: 'Bölgələr',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('ac_dictRegion') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 280
          },
          {
            desktopCode: 'arm_accStaff',
            parentCode: 'accStaffFolderTerritory',
            code: 'accStaff_dictCity',
            isFolder: 0,
            caption: 'Населені пункти',
            caption_uk: 'Населені пункти',
            caption_ru: 'Населенные пункты',
            caption_az: 'Yaşayış məntəqələri',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('ac_dictCity') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 290
          }
        ]
      },
      {
        desktopCode: 'arm_accStaff',
        parentCode: 'accStaffFolderDictionary',
        code: 'accStaffFolderOrgsAndDeps',
        isFolder: 1,
        caption: 'Організації та підрозділи',
        caption_uk: 'Організації та підрозділи',
        caption_ru: 'Организации и подразделения',
        caption_az: 'Təşkilatlar və bölmələr',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 300,
        items: [
          {
            desktopCode: 'arm_accStaff',
            parentCode: 'accStaffFolderOrgsAndDeps',
            code: 'accStaff_dictParentUnitType',
            isFolder: 0,
            caption: 'Типи підпорядкування',
            caption_uk: 'Типи підпорядкування',
            caption_ru: 'Типы подчинения',
            caption_az: 'Subordinasiya növləri',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictParentUnitType') }
            },
            inWindow: 0,
            isCollapsed: 0,
            displayOrder: 226
          },
          {
            desktopCode: 'arm_accStaff',
            parentCode: 'accStaffFolderOrgsAndDeps',
            code: 'accStaff_dictBasicFunctn',
            isFolder: 0,
            caption: 'Основні функції організацій та підрозділів',
            caption_uk: 'Основні функції організацій та підрозділів',
            caption_ru: 'Основные функции организаций и подразделений',
            caption_az: 'Təşkilatın və struktur vahidlərinin əsas funksiyaları',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictBasicFunctn') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 228
          },
          {
            desktopCode: 'arm_accStaff',
            parentCode: 'accStaffFolderOrgsAndDeps',
            code: 'accStaff_dictDepType',
            isFolder: 0,
            caption: 'Типи підрозділів (персонал)',
            caption_uk: 'Типи підрозділів (персонал)',
            caption_ru: 'Типы подразделений (персонал)',
            caption_az: 'Struktur vahidlərinin növləri (işçi heyəti)',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictDepType') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 250
          },
          {
            desktopCode: 'arm_accStaff',
            parentCode: 'accStaffFolderOrgsAndDeps',
            code: 'accStaff_dictGovernmType',
            isFolder: 0,
            caption: 'Типи організації державних органів',
            caption_uk: 'Типи організації державних органів',
            caption_ru: 'Типы организации государственных органов',
            caption_az: 'Dövlət orqanlarının təşkilati hüquqi formaları',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictGovernmType') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 300
          },
          {
            desktopCode: 'arm_accStaff',
            parentCode: 'accStaffFolderOrgsAndDeps',
            code: 'accStaff_departmentKind',
            isFolder: 0,
            caption: 'Види підрозділів',
            caption_uk: 'Види підрозділів',
            caption_ru: 'Виды подразделений',
            caption_az: 'Struktur vahidlərinin növləri',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_departmentKind') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 310
          },
          {
            desktopCode: 'arm_accStaff',
            parentCode: 'accStaffFolderOrgsAndDeps',
            code: 'accStaff_dictRespEmployee',
            isFolder: 0,
            caption: 'Відповідальні особи організації',
            caption_uk: 'Відповідальні особи організації',
            caption_ru: 'Ответственные лица организации',
            caption_az: 'Təşkilatın məsul şəxsləri',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_orgRespPosition') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 320
          }
        ]
      },
      {
        desktopCode: 'arm_accStaff',
        parentCode: 'accStaffFolderDictionary',
        code: 'accStaffFolderTariffing',
        isFolder: 1,
        caption: 'Тарифікація',
        caption_uk: 'Тарифікація',
        caption_ru: 'Тарификация',
        caption_az: 'Qiymətləndirmə',
        inWindow: 0,
        isCollapsed: 0,
        displayOrder: 350,
        items: [
          {
            desktopCode: 'arm_accStaff',
            parentCode: 'accStaffFolderTariffing',
            code: 'accStaff_dictEmpCatTarifPos',
            isFolder: 0,
            caption: 'Категорії та тарифні розряди посад',
            caption_uk: 'Категорії та тарифні розряди посад',
            caption_ru: 'Категории и тарифные разряды должностей',
            caption_az: 'Vəzifələrin kateqoriyaları və tarif səviyyələri',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictEmpCatTarifPos') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 100
          },
          {
            desktopCode: 'arm_accStaff',
            parentCode: 'accStaffFolderTariffing',
            code: 'accStaff_dictStaffCatAccrual',
            isFolder: 0,
            caption: 'Нарахування за категоріями персоналу',
            caption_uk: 'Нарахування за категоріями персоналу',
            caption_ru: 'Начисление по категориям персонала',
            caption_az: 'Kadrlar kateqoriyalarına görə ödənişlər',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictStaffCatAccrual') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 200
          },
          {
            desktopCode: 'arm_accStaff',
            parentCode: 'accStaffFolderTariffing',
            code: 'accStaff_dictTariffingPayEl',
            isFolder: 0,
            caption: 'Види оплат тарифікаційного списку',
            caption_uk: 'Види оплат тарифікаційного списку',
            caption_ru: 'Виды оплат тарификационного списка',
            caption_az: 'Tarif siyahısı ödənişlərinin növləri',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictTariffingPayEl') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 300
          }
        ]
      },
      {
        desktopCode: 'arm_accStaff',
        parentCode: 'accStaffFolderDictionary',
        code: 'accStaffFolderOther',
        isFolder: 1,
        caption: 'Інше',
        caption_uk: 'Інше',
        caption_ru: 'Другое',
        caption_az: 'Digər',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 400,
        items: [
          {
            desktopCode: 'arm_accStaff',
            parentCode: 'accStaffFolderOther',
            code: 'accStaff_dictTarifCoeff',
            isFolder: 0,
            caption: 'Тарифні розряди, коефіцієнти',
            caption_uk: 'Тарифні розряди, коефіцієнти',
            caption_ru: 'Тарифные разряды, коэффициенты',
            caption_az: 'Tarif dərəcələri, əmsallar',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictTarifCoeff') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 220
          },
          {
            desktopCode: 'arm_accStaff',
            parentCode: 'accStaffFolderOther',
            code: 'accStaff_dictTariffGroup',
            isFolder: 0,
            caption: 'Тарифні групи організацій',
            caption_uk: 'Тарифні групи організацій',
            caption_ru: 'Тарифные группы организаций',
            caption_az: 'Təşkilatların tarif qrupları',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictTariffGroup') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 225
          },
          {
            desktopCode: 'arm_accStaff',
            parentCode: 'accStaffFolderOther',
            code: 'accStaff_dictLivingCost',
            isFolder: 0,
            caption: 'Прожитковий мінімум',
            caption_uk: 'Прожитковий мінімум',
            caption_ru: 'Прожиточный минимум',
            caption_az: 'Yaşayış minimumu',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictLivingCost') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 240
          },
          /* {
             desktopCode: 'arm_accStaff',
             parentCode: 'accStaffFolderOther',
             code: 'accStaff_dictSheetSigner',
             isFolder: 0,
             caption: 'ТНалаштування підписантів табеля',
             caption_uk: 'Налаштування підписантів табеля',
             caption_ru: 'Настройка подписантов табеля',
             caption_az: 'Hesabat kartı imzalayanların konfiqurasiyası',
             cmdCode: {
               cmdType: 'showForm',
               formCode: function () { $App.runShortcutCommand('hr_dictSheetSigner') }
             },
             inWindow: 0,
             isCollapsed: 0,
             iconCls: '',
             displayOrder: 252
           }, */
          {
            desktopCode: 'arm_accStaff',
            parentCode: 'accStaffFolderOther',
            code: 'accStaff_dictHarmfulKind',
            isFolder: 0,
            caption: 'Види шкідливих умов праці',
            caption_uk: 'Види шкідливих умов праці',
            caption_ru: 'Виды вредных условий труда',
            caption_az: 'Zərərli iş şəraitinin növləri',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictHarmfulKind') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 255
          },
          {
            desktopCode: 'arm_accStaff',
            parentCode: 'accStaffFolderOther',
            code: 'accStaff_dictEducationLevel',
            isFolder: 0,
            caption: 'Рівні освіти',
            caption_uk: 'Рівні освіти',
            caption_ru: 'Уровни образования',
            caption_az: 'Təhsil səviyyələri',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictEducationLevel') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 265
          },
          {
            desktopCode: 'arm_accStaff',
            parentCode: 'accStaffFolderOther',
            code: 'accStaff_dictStatePay',
            isFolder: 0,
            caption: 'Групи оплати праці держслужбовців',
            caption_uk: 'Групи оплати праці держслужбовців',
            caption_ru: 'Группы оплаты труда госслужащих',
            caption_az: 'Dövlət qulluqçularının əməyin ödənilməsi qrupu',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictStatePay') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 267
          },
          {
            desktopCode: 'arm_accStaff',
            parentCode: 'accStaffFolderOther',
            code: 'accStaff_dictFutureOfWork',
            isFolder: 0,
            caption: 'Особливості роботи',
            caption_uk: 'Особливості роботи',
            caption_ru: 'Особенности работы',
            caption_az: 'İşin xüsusiyyətləri',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictFutureOfWork') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 305
          },
          {
            desktopCode: 'arm_accStaff',
            parentCode: 'accStaffFolderOther',
            code: 'accStaff_dictReasonAccrual',
            isFolder: 0,
            caption: 'Підстави змін окладів',
            caption_uk: 'Підстави змін окладів',
            caption_ru: 'Основания изменений окладов',
            caption_az: 'Maaş dəyişiklikləri üçün əsas',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictReasonAccrual') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 340
          },
          {
            desktopCode: 'arm_accStaff',
            parentCode: 'accStaffFolderOther',
            code: 'accStaff_dictSalaryScheme',
            isFolder: 0,
            caption: 'Схема посадових окладів',
            caption_uk: 'Схема посадових окладів',
            caption_ru: 'Схема должностных окладов',
            caption_az: 'Vəzifə maaşlarının sxemi',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictSalaryScheme') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 370
          },
          {
            desktopCode: 'arm_accStaff',
            parentCode: 'accStaffFolderOther',
            code: 'accStaff_dictCostType',
            isFolder: 0,
            caption: 'Місце виникнення витрат (МВВ)',
            caption_uk: 'Місце виникнення витрат (МВВ)',
            caption_ru: 'Место возникновения затрат (МВЗ)',
            caption_az: 'Xərc mənbələri (XM)',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('ac_dictCostType') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 380
          },
          {
            desktopCode: 'arm_accStaff',
            parentCode: 'accStaffFolderOther',
            code: 'accStaff_dictBalanceUnit',
            isFolder: 0,
            caption: 'Балансові одиниці',
            caption_uk: 'Балансові одиниці',
            caption_ru: 'Балансовые единицы',
            caption_az: 'Balans vahidləri',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictBalanceUnit') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 390
          },
          {
            desktopCode: 'arm_accStaff',
            parentCode: 'accStaffFolderOther',
            code: 'accStaff_dictCostPlaceType',
            isFolder: 0,
            caption: 'Тип місця виникнення витрат',
            caption_uk: 'Тип місця виникнення витрат',
            caption_ru: 'Тип места возникновения затрат',
            caption_az: 'Xərc mənbələri növü',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictCostPlaceType') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 400
          },
          {
            desktopCode: 'arm_accStaff',
            parentCode: 'accStaffFolderOther',
            code: 'accStaff_dictActivityType',
            isFolder: 0,
            caption: 'Види діяльності',
            caption_uk: 'Види діяльності',
            caption_ru: 'Виды деятельности',
            caption_az: 'Fəaliyyət növləri',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('ac_dictActivityType') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 410
          },
          {
            desktopCode: 'arm_accStaff',
            parentCode: 'accStaffFolderOther',
            code: 'accStaff_dictDepCostKind',
            isFolder: 0,
            caption: 'Вид підрозділу МВВ',
            caption_uk: 'Вид підрозділу МВВ',
            caption_ru: 'Вид подразделения МВЗ',
            caption_az: 'Struktur vahidinin növü XM',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictDepCostKind') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 420
          },
          {
            desktopCode: 'arm_accStaff',
            parentCode: 'accStaffFolderOther',
            code: 'accStaff_dictCostPlaceNumber',
            isFolder: 0,
            caption: 'Порядкові номера місця виникнення витрат',
            caption_uk: 'Порядкові номера місця виникнення витрат',
            caption_ru: 'Порядковые номера места возникновения затрат',
            caption_az: 'Xərc mənbələrinin ardıcıllıq nömrələri',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictCostPlaceNumber') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 430
          },
          {
            desktopCode: 'arm_accStaff',
            parentCode: 'accStaffFolderOther',
            code: 'accStaff_dictSalarySchemeLevel',
            isFolder: 0,
            caption: 'Рівень посадового окладу',
            caption_uk: 'Рівень посадового окладу',
            caption_ru: 'Уровень должностного оклада',
            caption_az: 'Уровень должностного оклада',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictSalarySchemeLevel') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 440
          }
        ]
      }
    ]
  }
]
