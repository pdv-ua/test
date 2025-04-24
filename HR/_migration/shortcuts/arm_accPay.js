/* global $App */
module.exports = [
  {
    desktopCode: 'arm_accCfg',
    code: 'hrPayDictTop',
    isFolder: 1,
    caption: 'Довідники ЗП',
    caption_uk: 'Довідники ЗП',
    caption_ru: 'Справочники ЗП',
    caption_az: 'Maaş soraqçaları',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-folder',
    displayOrder: 800,
    items: [
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hrPayDictTop',
        code: 'hrPayDictionary',
        isFolder: 1,
        caption: 'Довідники',
        caption_uk: 'Довідники',
        caption_ru: 'Справочники',
        caption_az: 'Soraqçalar',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-folder',
        displayOrder: 800,
        items: [
          {
            desktopCode: 'arm_accCfg',
            parentCode: 'hrPayDictionary',
            code: 'accPay_maxBaseECB',
            isFolder: 0,
            caption: 'База нарахування ЄСВ',
            caption_uk: 'База нарахування ЄСВ',
            caption_ru: 'База начисления ЕСВ',
            caption_az: 'ERU hesablama bazası',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_maxBaseECB') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 40
          },
          {
            desktopCode: 'arm_accCfg',
            parentCode: 'hrPayDictionary',
            code: 'accPay_dictTaxIndivid',
            isFolder: 0,
            caption: 'Види доходів фізичних осіб',
            caption_uk: 'Види доходів фізичних осіб',
            caption_ru: 'Виды доходов физических лиц',
            caption_az: 'Fiziki şəxslərin gəlir növləri',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictTaxIndivid') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 50
          },
          {
            desktopCode: 'arm_accCfg',
            parentCode: 'hrPayDictionary',
            code: 'accPay_dictSumFuneral',
            isFolder: 0,
            caption: 'Допомога на поховання СС',
            caption_uk: 'Допомога на поховання СС',
            caption_ru: 'Пособие на погребение СС',
            caption_az: 'DSMF dəfn pulu',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictSumFuneral') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 51
          },
          {
            desktopCode: 'arm_accCfg',
            parentCode: 'hrPayDictionary',
            code: 'accPay_dictIndexSalary',
            isFolder: 0,
            caption: 'Індекс споживчих цін',
            caption_uk: 'Індекс споживчих цін',
            caption_ru: 'Индекс потребительских цен',
            caption_az: 'İstehlakçı qiymətləri indeksi',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictIndexSalary') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 60
          },
          {
            desktopCode: 'arm_accCfg',
            parentCode: 'hrPayDictionary',
            code: 'accPay_dictTimeCost',
            isFolder: 0,
            caption: 'Елементи обліку робочого часу',
            caption_uk: 'Елементи обліку робочого часу',
            caption_ru: 'Элементы учета рабочего времени',
            caption_az: 'Vaxt izləmə elementləri',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictTimeCost') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 61
          },
          {
            desktopCode: 'arm_accCfg',
            parentCode: 'hrPayDictionary',
            code: 'accPay_dictTimeCostInt',
            isFolder: 0,
            caption: 'Можливий перетин елементів обліку',
            caption_uk: 'Можливий перетин елементів обліку',
            caption_ru: 'Возможное пересечение элементов учета',
            caption_az: 'Mühasibat elementlərinin mümkün kəsişməsi',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictTimeCostInt') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 62
          },
          {
            desktopCode: 'arm_accCfg',
            parentCode: 'hrPayDictionary',
            code: 'accPay_Сalendar',
            isFolder: 0,
            caption: 'Календар',
            caption_uk: 'Календар',
            caption_ru: 'Календарь',
            caption_az: 'Təqvim',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('tim_calendar') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 70
          },
          {
            desktopCode: 'arm_accCfg',
            parentCode: 'hrPayDictionary',
            code: 'accPay_dictSalaryMinSize',
            isFolder: 0,
            caption: 'Мінімальна зарплата',
            caption_uk: 'Мінімальна зарплата',
            caption_ru: 'Минимальная зарплата',
            caption_az: 'Minimum əmək haqqı',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictSalaryMinSize') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 80
          },
          {
            desktopCode: 'arm_accCfg',
            parentCode: 'hrPayDictionary',
            code: 'accPay_dictExperienceSpec',
            isFolder: 0,
            caption: 'Підстави обліку спецстажу',
            caption_uk: 'Підстави обліку спецстажу',
            caption_ru: 'Основания учета спецстажа',
            caption_az: 'Xüsusi təcrübənin uçotu üçün əsaslar',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictExperienceSpec') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 85
          },
          {
            desktopCode: 'arm_accCfg',
            parentCode: 'hrPayDictionary',
            code: 'accPay_taxLimitList',
            isFolder: 0,
            caption: 'Пільги ПДФО',
            caption_uk: 'Пільги ПДФО',
            caption_ru: 'Льготы ПДФО',
            caption_az: 'Gəlir vergisi imtiyazları',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_taxLimitList') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 90
          },
          {
            desktopCode: 'arm_accCfg',
            parentCode: 'hrPayDictionary',
            code: 'accPay_dictSickLimit',
            isFolder: 0,
            caption: 'Пільги для лікарняних',
            caption_uk: 'Пільги для лікарняних',
            caption_ru: 'Льготы для больничных',
            caption_az: 'Xəstəliyə görə müavinətlər',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictSickLimit') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 93
          },
          {
            desktopCode: 'arm_accCfg',
            parentCode: 'hrPayDictionary',
            code: 'accPay_dictSicknessCause',
            isFolder: 0,
            caption: 'Причини розбіжності суми для лікарняних',
            caption_uk: 'Причини розбіжності суми для лікарняних',
            caption_ru: 'Причины расхождения суммы для больничных',
            caption_az: 'Xəstəlik məzuniyyətinin məbləğindəki uyğunsuzluğun səbəbləri',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictSicknessCause') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 94
          },
          {
            desktopCode: 'arm_accCfg',
            parentCode: 'hrPayDictionary',
            code: 'accPay_dictIllnessReason',
            isFolder: 0,
            caption: 'Причини непрацездатності',
            caption_uk: 'Причини непрацездатності',
            caption_ru: 'Причины нетрудоспособности',
            caption_az: 'İş qabiliyyətinin itirilməsinin səbəbləri',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () {
                $App.runShortcutCommand('hr_dictIllnessReason')
              }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 95
          },
          {
            desktopCode: 'arm_accCfg',
            parentCode: 'hrPayDictionary',
            code: 'accPay_dictLivingCost',
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
            displayOrder: 100
          },
          {
            desktopCode: 'arm_accCfg',
            parentCode: 'hrPayDictionary',
            code: 'accPay_dictSalaryRank',
            isFolder: 0,
            caption: 'Надбавки за ранги держслужбовців',
            caption_uk: 'Надбавки за ранги держслужбовців',
            caption_ru: 'Надбавки за ранги госслужащих',
            caption_az: 'Dövlət qulluqçuları dərəcələrinə görə müavinətlər',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictSalaryRank') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 110
          },
          {
            desktopCode: 'arm_accCfg',
            parentCode: 'hrPayDictionary',
            code: 'accPay_dictTypeTaxECB',
            isFolder: 0,
            caption: 'Ставки ЄСВ',
            caption_uk: 'Ставки ЄСВ',
            caption_ru: 'Ставки ЕСВ',
            caption_az: 'Birdəfəlik sosial müavinət dərəcələri',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictTypeTaxECB') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 115
          },
          {
            desktopCode: 'arm_accCfg',
            parentCode: 'hrPayDictionary',
            code: 'accPay_taxRate',
            isFolder: 0,
            caption: 'Ставки ПДФО',
            caption_uk: 'Ставки ПДФО',
            caption_ru: 'Ставки ПДФО',
            caption_az: 'Gəlir vergisi dərəcələri',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_taxRate') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 210
          },
          {
            desktopCode: 'arm_accCfg',
            parentCode: 'hrPayDictionary',
            code: 'accPay_dictTarifCoeff',
            isFolder: 0,
            caption: 'Тарифні розряди',
            caption_uk: 'Тарифні розряди',
            caption_ru: 'Тарифные разряды',
            caption_az: 'Tarif kateqoriyaları',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictTarifCoeff') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 213
          },
          {
            desktopCode: 'arm_accCfg',
            parentCode: 'hrPayDictionary',
            code: 'accPay_dictFssReq',
            isFolder: 0,
            caption: 'Типи заявок СС',
            caption_uk: 'Типи заявок СС',
            caption_ru: 'Типы заявок СС',
            caption_az: 'DSMF ərizələrinin növləri',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictFssReq') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 214
          },
          {
            desktopCode: 'arm_accCfg',
            parentCode: 'hrPayDictionary',
            code: 'accPay_dictWorkType',
            isFolder: 0,
            caption: 'Види робіт',
            caption_uk: 'Види робіт',
            caption_ru: 'Виды работ',
            caption_az: 'İş növləri',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictWorkType') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 215
          },
          {
            desktopCode: 'arm_accCfg',
            parentCode: 'hrPayDictionary',
            code: 'accPay_dictMultiGroup',
            isFolder: 0,
            caption: 'Групи підрозділів для меню',
            caption_uk: 'Групи підрозділів для меню',
            caption_ru: 'Групи підрозділів для меню',
            caption_az: 'Menyu üçün qrupların siyahısı',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictMultiGroup') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 216
          },
          {
            desktopCode: 'arm_accCfg',
            parentCode: 'hrPayDictionary',
            code: 'accPay_dictStipendAmount',
            isFolder: 0,
            caption: 'Розмір стипендії',
            caption_uk: 'Розмір стипендії',
            caption_ru: 'Размер стипендии',
            caption_az: 'Təqaüdün ölçüsü',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictStipendAmount') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 217
          },
          {
            desktopCode: 'arm_accCfg',
            parentCode: 'hrPayDictionary',
            code: 'accPay_dictTypeStipend',
            isFolder: 0,
            caption: 'Тип стипендії',
            caption_uk: 'Тип стипендії',
            caption_ru: 'Тип стипендии',
            caption_az: 'Təqaüd növü',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictTypeStipend') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 218
          },
          {
            desktopCode: 'arm_accCfg',
            parentCode: 'hrPayDictionary',
            code: 'accPay_dictTypeStudy',
            isFolder: 0,
            caption: 'Вид навчання',
            caption_uk: 'Вид навчання',
            caption_ru: 'Вид обучения',
            caption_az: 'Təlim növü',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictTypeStudy') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 219
          },
          {
            desktopCode: 'arm_accCfg',
            parentCode: 'hrPayDictionary',
            code: 'accPay_dictEducLevel',
            isFolder: 0,
            caption: 'Освітній рівень',
            caption_uk: 'Освітній рівень',
            caption_ru: 'Образовательный уровень',
            caption_az: 'Təhsil səviyyəsi',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictEducLevel') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 220
          },
          {
            desktopCode: 'arm_accCfg',
            parentCode: 'hrPayDictionary',
            code: 'accPay_dictStudGroup',
            isFolder: 0,
            caption: 'Групи навчання',
            caption_uk: 'Групи навчання',
            caption_ru: 'Группы обучения',
            caption_az: 'Tədris qrupları',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictStudGroup') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 221
          },
          {
            desktopCode: 'arm_accCfg',
            parentCode: 'hrPayDictionary',
            code: 'accPay_AllDict',
            isFolder: 0,
            caption: 'Усі довідники...',
            caption_uk: 'Усі довідники...',
            caption_ru: 'Все справочники ...',
            caption_az: 'Bütün soraqçalar ...',
            cmdType: 'showForm',
            formCode: 'ac_shortcutList',
            cmpInitConfig:
              {
                shortcutCode: 'dictionaryCfg',
                caption: 'Довідники',
                caption_uk: 'Довідники',
                caption_ru: 'Справочники',
                tip: 'Довідники'
              },
            inWindow: 1,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 290
          }
        ]
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hrPayDictTop',
        code: 'hrPaySettings',
        isFolder: 1,
        caption: 'Налаштування',
        caption_uk: 'Налаштування',
        caption_ru: 'Настройки',
        caption_az: 'Tənzimləmələr',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-cogs',
        displayOrder: 900,
        items: [
          {
            desktopCode: 'arm_accCfg',
            parentCode: 'hrPaySettings',
            code: 'accPay_bank',
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
            displayOrder: 5
          },
          {
            desktopCode: 'arm_accCfg',
            parentCode: 'hrPaySettings',
            code: 'accPay_payEl',
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
            displayOrder: 20
          },
          {
            desktopCode: 'arm_accCfg',
            parentCode: 'hrPaySettings',
            code: 'accPay_workSchedule',
            isFolder: 0,
            caption: 'Графіки робочого часу',
            caption_uk: 'Графіки робочого часу',
            caption_ru: 'Графики рабочего времени',
            caption_az: 'İş vaxtı cədvəlləri',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_workSchedule') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 40
          },
          {
            desktopCode: 'arm_accCfg',
            parentCode: 'hrPaySettings',
            code: 'accPay_dictCategoryECB',
            isFolder: 1,
            caption: 'Категорії застрахованих осіб',
            caption_uk: 'Категорії застрахованих осіб',
            caption_ru: 'Категории застрахованных лиц',
            caption_az: 'Sığortalıların kateqoriyaları',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictCategoryECB') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 45
          },
          {
            desktopCode: 'arm_accCfg',
            parentCode: 'hrPaySettings',
            code: 'accPay_dictStaffCat',
            isFolder: 0,
            caption: 'Категорії персоналу',
            caption_uk: 'Категорії персоналу',
            caption_ru: 'Категории персонала',
            caption_az: 'İşçi heyətin kateqoriyası',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictStaffCat') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 50
          },
          {
            desktopCode: 'arm_accCfg',
            parentCode: 'hrPaySettings',
            code: 'accPay_dictStaffSubCat',
            isFolder: 0,
            caption: 'Підкатегорії персоналу',
            caption_uk: 'Підкатегорії персоналу',
            caption_ru: 'Подкатегории персонала',
            caption_az: 'İşçi heyətin alt kateqoriyaları',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictStaffSubCat') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 53
          },
          {
            desktopCode: 'arm_accCfg',
            parentCode: 'hrPaySettings',
            code: 'accPay_contractor',
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
            displayOrder: 55
          },
          {
            desktopCode: 'arm_accCfg',
            parentCode: 'hrPaySettings',
            code: 'accPay_department',
            isFolder: 0,
            caption: 'Підрозділи',
            caption_uk: 'Підрозділи',
            caption_ru: 'Подразделения',
            caption_az: 'Struktur vahidləri',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_departmentSalary') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: 'fa fa-home',
            displayOrder: 56
          },
          {
            desktopCode: 'arm_accCfg',
            parentCode: 'hrPaySettings',
            code: 'accPay_position',
            isFolder: 0,
            caption: 'Посади',
            caption_uk: 'Посади',
            caption_ru: 'Должности',
            caption_az: 'Vəzifələr',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictPosition') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: 'fa fa-home',
            displayOrder: 57
          },
          {
            desktopCode: 'arm_accCfg',
            parentCode: 'hrPaySettings',
            code: 'accPay_method',
            isFolder: 0,
            caption: 'Методи розрахунку видів оплати',
            caption_uk: 'Методи розрахунку видів оплати',
            caption_ru: 'Методы расчета видов оплаты',
            caption_az: 'Əmək haqqı növlərinin hesablanması metodları',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_method') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 60
          },
          {
            desktopCode: 'arm_accCfg',
            parentCode: 'hrPaySettings',
            code: 'accPay_payFundMethod',
            isFolder: 0,
            caption: 'Методи розрахунку нарахувань на зарплату',
            caption_uk: 'Методи розрахунку нарахувань на зарплату',
            caption_ru: 'Методы расчета начислений на зарплату',
            caption_az: 'Əmək haqqının hesablanması metodları',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_payFundMethod') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 60
          },
          {
            desktopCode: 'arm_accCfg',
            parentCode: 'hrPaySettings',
            code: 'accPay_dictKpiAccrual',
            isFolder: 0,
            caption: 'Нарахування за KPI',
            caption_uk: 'Нарахування за KPI',
            caption_ru: 'Начисления по KPI',
            caption_az: 'KPI hesablamaları',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictKpiAccrual') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 65
          },
          {
            desktopCode: 'arm_accCfg',
            parentCode: 'hrPaySettings',
            code: 'accPay_payFund',
            isFolder: 0,
            caption: 'Нарахування на зарплату',
            caption_uk: 'Нарахування на зарплату',
            caption_ru: 'Начисления на зарплату',
            caption_az: 'Əmək haqqı',
            cmdType: 'showList',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_payFund') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 70
          },
          {
            desktopCode: 'arm_accCfg',
            parentCode: 'hrPaySettings',
            code: 'accPay_payObligatory',
            isFolder: 0,
            caption: "Обов'язкові платежі при виплаті зарплати",
            caption_uk: 'Обов\'язкові платежі при виплаті зарплати',
            caption_ru: 'Обязательные платежи при выплате зарплаты',
            caption_az: 'Əmək haqqı verilərkən məcburi ödənişlər',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_payObligatory') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 90
          },
          {
            desktopCode: 'arm_accCfg',
            parentCode: 'hrPaySettings',
            code: 'accPay_dictWorkOperation',
            isFolder: 0,
            caption: 'Операційно-трудові нормативи',
            caption_uk: 'Операційно-трудові нормативи',
            caption_ru: 'Операционно-трудовые нормативы',
            caption_az: 'Əməliyyat və əmək standartları',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictWorkOperation') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 93
          },
          {
            desktopCode: 'arm_accCfg',
            parentCode: 'hrPaySettings',
            code: 'accPay_settingsPayRoll',
            isFolder: 0,
            caption: 'Параметри обліку зарплати',
            caption_uk: 'Параметри обліку зарплати',
            caption_ru: 'Параметры учета зарплаты',
            caption_az: 'Əmək haqqı parametrləri',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_settingsPayRoll') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 95
          },
          {
            desktopCode: 'arm_accCfg',
            parentCode: 'hrPaySettings',
            code: 'accPay_payPerm',
            isFolder: 0,
            caption: 'Постійні нарахування',
            caption_uk: 'Постійні нарахування',
            caption_ru: 'Постоянные начисления',
            caption_az: 'Daimi hesablamalar',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_payPerm') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 100
          },
          {
            desktopCode: 'arm_accCfg',
            parentCode: 'hrPaySettings',
            code: 'accPay_payPermHold',
            isFolder: 0,
            caption: 'Постійні утримання',
            caption_uk: 'Постійні утримання',
            caption_ru: 'Постоянные удержания',
            caption_az: 'Mütəmadi saxlanmalar',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_payPermHold') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 110
          },
          {
            desktopCode: 'arm_accCfg',
            parentCode: 'hrPaySettings',
            code: 'accPay_fundPerm',
            isFolder: 0,
            caption: 'Постійні нарахування на ЗП',
            caption_uk: 'Постійні нарахування на ЗП',
            caption_ru: 'Постоянные начисления на ЗП',
            caption_az: 'ZP-yə daimi hesablamalar',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_fundPerm') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 120
          },
          {
            desktopCode: 'arm_accCfg',
            parentCode: 'hrPaySettings',
            code: 'accPay_timPlan',
            isFolder: 0,
            caption: 'Розклад роботи',
            caption_uk: 'Розклад роботи',
            caption_ru: 'Расписание работы',
            caption_az: 'İş cədvəli',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('tim_plan') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 135
          },
          {
            desktopCode: 'arm_accCfg',
            parentCode: 'hrPaySettings',
            code: 'accPay_dictExperience',
            isFolder: 0,
            caption: 'Стаж роботи',
            caption_uk: 'Стаж роботи',
            caption_ru: 'Стаж работы',
            caption_az: 'İş təcrübəsi',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictExperience') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 140
          },
          {
            desktopCode: 'arm_accCfg',
            parentCode: 'hrPaySettings',
            code: 'accPay_dictTech',
            isFolder: 0,
            caption: 'Технологічні карти',
            caption_uk: 'Технологічні карти',
            caption_ru: 'Технологические карты',
            caption_az: 'Texnoloji kartlar',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictTech') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 145
          },
          {
            desktopCode: 'arm_accCfg',
            parentCode: 'hrPaySettings',
            code: 'accPay_entryOperation',
            isFolder: 0,
            caption: 'Типові операції',
            caption_uk: 'Типові операції',
            caption_ru: 'Типовые операции',
            caption_az: 'Tipik əməliyyatlar',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_entryOperation') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 155
          },
          {
            desktopCode: 'arm_accCfg',
            parentCode: 'hrPaySettings',
            code: 'accPay_accrualReportPrintSettings',
            isFolder: 0,
            caption: 'Налаштування друку довідок',
            caption_uk: 'Налаштування друку довідок',
            caption_ru: 'Налаштування друку довідок',
            caption_az: 'Налаштування друку довідок',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_accrualReportPrintSettings') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 157
          },
          {
            desktopCode: 'arm_accCfg',
            parentCode: 'hrPaySettings',
            code: 'accPay_exportMethod',
            isFolder: 0,
            caption: 'Файли експорту',
            caption_uk: 'Файли експорту',
            caption_ru: 'Файлы экспорта',
            caption_az: 'Faylları ixrac edin',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_exportMethod') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 160
          },
          {
            desktopCode: 'arm_accCfg',
            parentCode: 'hrPaySettings',
            code: 'accPay_dictSicknessDay',
            isFolder: 0,
            caption: 'Обмеження днів сплати для лікарняних',
            caption_uk: 'Обмеження днів сплати для лікарняних',
            caption_ru: 'Ограничение дней уплаты для больничных',
            caption_az: 'Xəstəlik məzuniyyəti üçün ödəniş günlərinin məhdudlaşdırılması',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictSicknessDay') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 165
          },
          {
            desktopCode: 'arm_accCfg',
            parentCode: 'hrPaySettings',
            code: 'accPay_payOut',
            isFolder: 0,
            caption: 'Шаблони виплати',
            caption_uk: 'Шаблони виплати',
            caption_ru: 'Шаблоны выплаты',
            caption_az: 'Ödəmə şablonları',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_payOut') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 165
          },
          {
            desktopCode: 'arm_accCfg',
            parentCode: 'hrPaySettings',
            code: 'accPay_payDim',
            isFolder: 0,
            caption: 'Шифр витрат',
            caption_uk: 'Шифр витрат',
            caption_ru: 'Шифр затрат',
            caption_az: 'Xərc maddəsi',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_payDim') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 170
          },
          {
            desktopCode: 'arm_accCfg',
            parentCode: 'hrPaySettings',
            code: 'accPay_groupReport',
            isFolder: 0,
            caption: 'Протоколи групи звітів',
            caption_uk: 'Протоколи групи звітів',
            caption_ru: 'Протоколы группы отчетов',
            caption_az: 'Qrup protokollarını bildirin',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_groupReport') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 175
          }
        ]
      }
    ]
  }
]
