/* global $App */
module.exports = [
  {
    desktopCode: 'arm_accHR',
    code: 'accHR_empOrderCustom',
    isFolder: 0,
    caption: 'Накази з Персоналу',
    caption_uk: 'Накази з Персоналу',
    caption_ru: 'Приказы по Персоналу',
    caption_az: 'İşçi heyəti əmrləri',
    cmdCode: {
      cmdType: 'showForm',
      formCode: function () { $App.runShortcutCommand('hr_empOrderCustom') }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-list-ol',
    displayOrder: 90
  },
  {
    desktopCode: 'arm_accHR',
    code: 'accHRFolderOrdersMove',
    isFolder: 1,
    caption: 'Загальні накази',
    caption_uk: 'Загальні накази',
    caption_ru: 'Общие приказы',
    caption_az: 'Ümumi əmrlər',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-user-circle-o',
    displayOrder: 100,
    items: [
      {
        desktopCode: 'arm_accHR',
        parentCode: 'accHRFolderOrdersMove',
        code: 'accHR_empOrderAppointA',
        isFolder: 0,
        caption: 'Призначення',
        caption_uk: 'Призначення',
        caption_ru: 'Назначение',
        caption_az: 'Təyinat',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_empOrderAppointA') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 100
      },
      {
        desktopCode: 'arm_accHR',
        parentCode: 'accHRFolderOrdersMove',
        code: 'accHR_empOrderMoveA',
        isFolder: 0,
        caption: 'Переведення',
        caption_uk: 'Переведення',
        caption_ru: 'Перевод',
        caption_az: 'Keçirilmə',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_empOrderMoveA') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 200
      },
      {
        desktopCode: 'arm_accHR',
        parentCode: 'accHRFolderOrdersMove',
        code: 'accHR_empOrderDismA',
        isFolder: 0,
        caption: 'Звільнення',
        caption_uk: 'Звільнення',
        caption_ru: 'Увольнение',
        caption_az: 'İşdən azad olunma',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_empOrderDismA') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 300
      },
      {
        desktopCode: 'arm_accHR',
        parentCode: 'accHRFolderOrdersMove',
        code: 'accHR_empOrderActingOrdA',
        isFolder: 0,
        caption: 'Покладання обов`язків',
        caption_uk: 'Покладання обов`язків',
        caption_ru: 'Возложение обязанностей',
        caption_az: 'Vəzifə öhdəliklərinin müəyyən edilməsi',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_empOrderActingOrdA') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 400
      },
      {
        desktopCode: 'arm_accHR',
        parentCode: 'accHRFolderOrdersMove',
        code: 'accHR_empOrderActingCloseA',
        isFolder: 0,
        caption: 'Припинення виконання обов`язків',
        caption_uk: 'Припинення виконання обов`язків',
        caption_ru: 'Прекращение исполнения обязанностей',
        caption_az: 'Vəzifələrin icrasına xitam verilməsi',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_empOrderActingCloseA') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 450
      },
      {
        desktopCode: 'arm_accHR',
        parentCode: 'accHRFolderOrdersMove',
        code: 'accHR_empOrderRankA',
        isFolder: 0,
        caption: 'Присвоєння рангу',
        caption_uk: 'Присвоєння рангу',
        caption_ru: 'Присвоение ранга',
        caption_az: 'Dərəcnin verilməsi',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_empOrderRankA') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 500
      },
      {
        desktopCode: 'arm_accHR',
        parentCode: 'accHRFolderOrdersMove',
        code: 'accHR_empOrderCanceldismA',
        isFolder: 0,
        caption: 'Поновлення на посаді',
        caption_uk: 'Поновлення на посаді',
        caption_ru: 'Восстановление в должности',
        caption_az: 'Vəzifəyə bərpa olunma',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_empOrderCanceldismA') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 600
      },
      {
        desktopCode: 'arm_accHR',
        parentCode: 'accHRFolderOrdersMove',
        code: 'accHR_empOrderPluralistA',
        isFolder: 0,
        caption: 'Сумісництво та суміщення',
        caption_uk: 'Сумісництво та суміщення',
        caption_ru: 'Совместительство и совмещение',
        caption_az: 'Yarımştat iş',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_empOrderPluralistA') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 700
      },
      {
        desktopCode: 'arm_accHR',
        parentCode: 'accHRFolderOrdersMove',
        code: 'accHR_empOrderOutpluralA',
        isFolder: 0,
        caption: 'Припинення сумісництва',
        caption_uk: 'Припинення сумісництва',
        caption_ru: 'Прекращение совместительства',
        caption_az: 'Yarımştat işin dayandırılması',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_empOrderOutpluralA') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 800
      },
      {
        desktopCode: 'arm_accHR',
        parentCode: 'accHRFolderOrdersMove',
        code: 'accHR_empOrderAppointMoveA',
        isFolder: 0,
        caption: 'Первинне призначення, переведення',
        caption_uk: 'Первинне призначення, переведення',
        caption_ru: 'Первичное назначение, перевод',
        caption_az: 'İlkin təyinat, keçirilmə',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_empOrderAppointMoveA') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 900
      },
      {
        desktopCode: 'arm_accHR',
        parentCode: 'accHRFolderOrdersMove',
        code: 'accHR_empOrderStaffTableMoveA',
        isFolder: 0,
        caption: 'Рознесення змін за штатним розписом',
        caption_uk: 'Рознесення змін за штатним розписом',
        caption_ru: 'Разнесения изменений по штатному расписанию',
        caption_az: 'Ştat cədvəli üzrə dəyişikliklərin qeyd olunması',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_empOrderStaffTableMove') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 950
      }
    ]
  },
  {
    desktopCode: 'arm_accHR',
    code: 'accHRFolderOrdersAbsence',
    isFolder: 1,
    caption: 'Відпустки, відрядження',
    caption_uk: 'Відпустки, відрядження',
    caption_ru: 'Отпуска, командировки',
    caption_az: 'Məzuniyyətlər, ezamiyyətlər',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-plane',
    displayOrder: 200,
    items: [
      {
        desktopCode: 'arm_accHR',
        parentCode: 'accHRFolderOrdersAbsence',
        code: 'accHR_empOrderVacationA',
        isFolder: 0,
        caption: 'Відпустки',
        caption_uk: 'Відпустки',
        caption_ru: 'Отпуск',
        caption_az: 'Məzuniyyət',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_empOrderVacationA') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 100
      },
      {
        desktopCode: 'arm_accHR',
        parentCode: 'accHRFolderOrdersAbsence',
        code: 'accHR_empOrderVacationProlongA',
        isFolder: 0,
        caption: 'Продовження, перенесення, скасування відпустки',
        caption_uk: 'Продовження, перенесення, скасування відпустки',
        caption_ru: 'Продление, перенос, отмена отпуска',
        caption_az: 'Məzuniyətin uzadılması, keçirilməsi, ləğv edilməsi',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_empOrderVacationProlongA') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 200
      },
      {
        desktopCode: 'arm_accHR',
        parentCode: 'accHRFolderOrdersAbsence',
        code: 'accHR_empOrderVacationRevokeA',
        isFolder: 0,
        caption: 'Відкликання з відпустки',
        caption_uk: 'Відкликання з відпустки',
        caption_ru: 'Отзыв из отпуска',
        caption_az: 'Məzuniyətdən geri çağırılma',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_empOrderVacationRevokeA') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 300
      },
      {
        desktopCode: 'arm_accHR',
        parentCode: 'accHRFolderOrdersAbsence',
        code: 'accHR_empOrderVacationRetA',
        isFolder: 0,
        caption: 'Вихід із довготривалої відпустки',
        caption_uk: 'Вихід із довготривалої відпустки',
        caption_ru: 'Выход из длительного отпуска',
        caption_az: 'Uzunmüddətli məzuniyyətdən qayıtma',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_empOrderVacationRetA') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 400
      },
      {
        desktopCode: 'arm_accHR',
        parentCode: 'accHRFolderOrdersAbsence',
        code: 'accHR_empOrderVacationCompA',
        isFolder: 0,
        caption: 'Компенсація відпустки',
        caption_uk: 'Компенсація відпустки',
        caption_ru: 'Компенсация отпуска',
        caption_az: 'Məzuniyət kompensasiyası',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_empOrderVacationCompA') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 500
      },
      {
        desktopCode: 'arm_accHR',
        parentCode: 'accHRFolderOrdersAbsence',
        code: 'accHR_empOrderMissionA',
        isFolder: 0,
        caption: 'Відрядження',
        caption_uk: 'Відрядження',
        caption_ru: 'Командировка',
        caption_az: 'Ezamiyət',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_empOrderMissionA') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 600
      },
      {
        desktopCode: 'arm_accHR',
        parentCode: 'accHRFolderOrdersAbsence',
        code: 'accHR_empOrderChangemissionA',
        isFolder: 0,
        caption: 'Зміни наказів про відрядження',
        caption_uk: 'Зміни наказів про відрядження',
        caption_ru: 'Изменения в приказах о командировках',
        caption_az: 'Ezamiyət',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_empOrderChangemissionA') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 610
      }
    ]
  },
  {
    desktopCode: 'arm_accHR',
    code: 'accHRFolderOrdersChgWorkSched',
    isFolder: 1,
    caption: 'Режими роботи',
    caption_uk: 'Режими роботи',
    caption_ru: 'Режимы работы',
    caption_az: 'İş rejimi',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-clock-o',
    displayOrder: 300,
    items: [
      {
        desktopCode: 'arm_accHR',
        parentCode: 'accHRFolderOrdersChgWorkSched',
        code: 'accHR_empOrderChgworksched',
        isFolder: 0,
        caption: 'Зміна графіку роботи',
        caption_uk: 'Зміна графіку роботи',
        caption_ru: 'Изменение графика работы',
        caption_az: 'İş qrafikinin dəyişdirilməsi',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_empOrderChgworksched') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 100
      },
      {
        desktopCode: 'arm_accHR',
        parentCode: 'accHRFolderOrdersChgWorkSched',
        code: 'accHR_empOrderWeekendWork',
        isFolder: 0,
        caption: 'Про роботу у вихідні/святкові дні',
        caption_uk: 'Про роботу у вихідні/святкові дні',
        caption_ru: 'О работе в выходные/праздничные дни',
        caption_az: 'Həftə sonları / bayram günlərində iş haqqında',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_empOrderWeekendWork') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 200
      },
      {
        desktopCode: 'arm_accHR',
        parentCode: 'accHRFolderOrdersChgWorkSched',
        code: 'accHR_empOrderRelaxHd',
        isFolder: 0,
        caption: 'Про компенсацію за роботу в вихідний день',
        caption_uk: 'Про компенсацію за роботу в вихідний день',
        caption_ru: 'О компенсации за работу в выходной день',
        caption_az: 'İstirahət günü işləməyə görə kompensasiya haqqında',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_empOrderRelaxHd') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 300
      },
      {
        desktopCode: 'arm_accHR',
        parentCode: 'accHRFolderOrdersChgWorkSched',
        code: 'accHR_empOrderRelaxDonor',
        isFolder: 0,
        caption: 'Про день відпочинку за донорство',
        caption_uk: 'Про день відпочинку за донорство',
        caption_ru: 'О дне отдыха за донорство',
        caption_az: 'Donorluğa görə istirahət günü haqqında',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_empOrderRelaxDonor') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 400
      },
      {
        desktopCode: 'arm_accHR',
        parentCode: 'accHRFolderOrdersChgWorkSched',
        code: 'accHR_empOrderCwsWorkHour',
        isFolder: 0,
        caption: 'Про встановлення робочого часу',
        caption_uk: 'Про встановлення робочого часу',
        caption_ru: 'Об установлении рабочего времени',
        caption_az: 'İş vaxtının müəyyən edilməsi haqqında',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_empOrderCwsWorkHour') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 500
      },
      {
        desktopCode: 'arm_accHR',
        parentCode: 'accHRFolderOrdersChgWorkSched',
        code: 'accHR_empOrderOverPayA',
        isFolder: 0,
        caption: 'Понаднормова праця',
        caption_uk: 'Понаднормова праця',
        caption_ru: 'Сверхурочная работа',
        caption_az: 'İş vaxtından əlavə iş',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_empOrderOverPayA') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 600
      },
      {
        desktopCode: 'arm_accHR',
        parentCode: 'accHRFolderOrdersChgWorkSched',
        code: 'accHR_empOrderDowntimeA',
        isFolder: 0,
        caption: 'Простої, тимчасове призупинення',
        caption_uk: 'Простої, тимчасове призупинення',
        caption_ru: 'Простои',
        caption_az: 'Məcburi boş dayanma',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_empOrderDowntimeA') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 700
      },
      {
        desktopCode: 'arm_accHR',
        parentCode: 'accHRFolderOrdersChgWorkSched',
        code: 'accHR_empOrderRecallA',
        isFolder: 0,
        caption: 'Відкликання з відрядження, навчання, простою',
        caption_uk: 'Відкликання з відрядження, навчання, простою',
        caption_ru: 'Отзыв из командировки, учебы, простоя',
        caption_az: 'İşgüzar səfərlərdən, təlimlərdən, fasilələrdən imtina',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_empOrderRecallA') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 800
      },
      {
        desktopCode: 'arm_accHR',
        parentCode: 'accHRFolderOrdersChgWorkSched',
        code: 'accHR_empOrderAveragePay',
        isFolder: 0,
        caption: 'Оплата за середнім',
        caption_uk: 'Оплата за середнім',
        caption_ru: 'Оплата по среднему',
        caption_az: 'Ödəniş orta hesabla',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_empOrderAveragePay') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 900
      },
      {
        desktopCode: 'arm_accHR',
        parentCode: 'accHRFolderOrdersChgWorkSched',
        code: 'accHR_empOrderCancelAveragePay',
        isFolder: 0,
        caption: 'Закінчення оплати по середньому',
        caption_uk: 'Закінчення оплати по середньому',
        caption_ru: 'Окончание оплаты по среднему',
        caption_az: 'Ödənişin sonu orta hesabla',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_empOrderCancelAveragePay') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 1000
      }
    ]
  },
  {
    desktopCode: 'arm_accHR',
    code: 'accHRFolderOrdersChgSalary',
    isFolder: 1,
    caption: 'Надбавки, доплати та премії',
    caption_uk: 'Надбавки, доплати та премії',
    caption_ru: 'Надбавки, доплаты и премии',
    caption_az: 'Müavinətlər, əlavələr və mükafatlar',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-money',
    displayOrder: 400,
    items: [
      {
        desktopCode: 'arm_accHR',
        parentCode: 'accHRFolderOrdersChgSalary',
        code: 'accHR_empOrderAddSalaryA',
        isFolder: 0,
        caption: 'Зміна нарахувань',
        caption_uk: 'Зміна нарахувань',
        caption_ru: 'Изменение начислений',
        caption_az: 'Hesablamaların dəyişdirilməsi',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_empOrderAddSalaryA') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 100
      },
      {
        desktopCode: 'arm_accHR',
        parentCode: 'accHRFolderOrdersChgSalary',
        code: 'accHR_empOrderBountyA',
        isFolder: 0,
        caption: 'Преміювання',
        caption_uk: 'Преміювання',
        caption_ru: 'Премирование',
        caption_az: 'mükafatlandırma',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_empOrderBountyA') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 200
      },
      {
        desktopCode: 'arm_accHR',
        parentCode: 'accHRFolderOrdersChgSalary',
        code: 'accHR_empOrderBountyHelpA',
        isFolder: 0,
        caption: 'Матеріальна допомога',
        caption_uk: 'Матеріальна допомога',
        caption_ru: 'Материальная помощь',
        caption_az: 'Maddi yardım',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_empOrderBountyHelpA') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 250
      },
      {
        desktopCode: 'arm_accHR',
        parentCode: 'accHRFolderOrdersChgSalary',
        code: 'accHR_empOrderAddSalaryGovA',
        isFolder: 0,
        caption: 'Встановлення надбавок за вислугу років',
        caption_uk: 'Встановлення надбавок за вислугу років',
        caption_ru: 'Установление надбавок за выслугу лет',
        caption_az: 'İş stajına görə müavinətlərin müəyyən edilməsi',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_empOrderAddSalaryGovA') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 300
      },
      {
        desktopCode: 'arm_accHR',
        parentCode: 'accHRFolderOrdersChgSalary',
        code: 'accHR_empOrderCancelSalaryA',
        isFolder: 0,
        caption: 'Скасування нарахувань',
        caption_uk: 'Скасування нарахувань',
        caption_ru: 'Отмена начислений',
        caption_az: 'Hesablamaların ləğv edilməsi',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_empOrderCancelSalaryA') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 300
      },
      {
        desktopCode: 'arm_accHR',
        parentCode: 'accHRFolderOrdersChgSalary',
        code: 'accHR_empOrderRiskPayA',
        isFolder: 0,
        caption: 'Підвищення оплати за шкідливість',
        caption_uk: 'Підвищення оплати за шкідливість',
        caption_ru: 'Повышение оплаты за вредность',
        caption_az: 'Zərərli iş şəraitinə görə ödənişin artırılması',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_empOrderRiskPayA') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 600
      },
      {
        desktopCode: 'arm_accHR',
        parentCode: 'accHRFolderOrdersChgSalary',
        code: 'accHR_empOrderAddPayA',
        isFolder: 0,
        caption: 'Оплата додаткової роботи',
        caption_uk: 'Оплата додаткової роботи',
        caption_ru: 'Оплата дополнительной работы',
        caption_az: 'Əlavə iş üçün ödəniş',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_empOrderAddPayA') }
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
    code: 'accHRFolderOrdersTraining',
    isFolder: 1,
    caption: 'Підготовка, навчання',
    caption_uk: 'Підготовка, навчання',
    caption_ru: 'Подготовка, обучение',
    caption_az: 'Hazırlıq, təlim',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-mortar-board',
    displayOrder: 500,
    items: [
      {
        desktopCode: 'arm_accHR',
        parentCode: 'accHRFolderOrdersTraining',
        code: 'accHR_empOrderTrainingA',
        isFolder: 0,
        caption: 'Направлення на навчання',
        caption_uk: 'Направлення на навчання',
        caption_ru: 'Направление на обучение',
        caption_az: 'Təlimə yönləndirmə',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_empOrderTrainingA') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 100
      },
      {
        desktopCode: 'arm_accHR',
        parentCode: 'accHRFolderOrdersTraining',
        code: 'accHR_empOrderInternshipA',
        isFolder: 0,
        caption: 'Стажування',
        caption_uk: 'Стажування',
        caption_ru: 'Стажировка',
        caption_az: 'Staj müddəti',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_empOrderInternshipA') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 200
      }
    ]
  },
  {
    desktopCode: 'arm_accHR',
    code: 'accHRFolderCertification',
    isFolder: 1,
    caption: 'Атестація',
    caption_uk: 'Атестація',
    caption_ru: 'Аттестация',
    caption_az: 'Attestasiya',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fas fa-chalkboard-teacher',
    displayOrder: 550,
    items: [
      {
        desktopCode: 'arm_accHR',
        parentCode: 'accHRFolderCertification',
        code: 'accHR_empOrderCertificationA',
        isFolder: 0,
        caption: 'Про присвоєння кваліфікації',
        caption_uk: 'Про присвоєння кваліфікації',
        caption_ru: 'О присвоении квалификации',
        caption_az: 'İxtisas dərəcəsinin verilməsi haqqında',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_empOrderCertificationA') }
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
    code: 'accHRFolderOrdersDisciplinary',
    isFolder: 1,
    caption: 'Дисциплінарна практика',
    caption_uk: 'Дисциплінарна практика',
    caption_ru: 'Дисциплинарная практика',
    caption_az: 'İntizam təcrübəsi',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-trophy',
    displayOrder: 600,
    items: [
      {
        desktopCode: 'arm_accHR',
        parentCode: 'accHRFolderOrdersDisciplinary',
        code: 'accHR_empOrderBonus',
        isFolder: 0,
        caption: 'Нагородження',
        caption_uk: 'Нагородження',
        caption_ru: 'Награждения',
        caption_az: 'Mükafatlandırma',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_empOrderBonusA') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 100
      },
      {
        desktopCode: 'arm_accHR',
        parentCode: 'accHRFolderOrdersDisciplinary',
        code: 'accHR_empOrderReward',
        isFolder: 0,
        caption: 'Заохочення',
        caption_uk: 'Заохочення',
        caption_ru: 'Поощрение',
        caption_az: 'Həvəsləndirmə',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_empOrderRewardA') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 200
      },
      {
        desktopCode: 'arm_accHR',
        parentCode: 'accHRFolderOrdersDisciplinary',
        code: 'accHR_empOrderPenalty',
        isFolder: 0,
        caption: 'Дисциплінарні стягнення',
        caption_uk: 'Дисциплінарні стягнення',
        caption_ru: 'Дисциплинарное взыскание',
        caption_az: 'İntizam tədbiri',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_empOrderPenaltyA') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 300
      }
    ]
  },
  {
    desktopCode: 'arm_accHR',
    code: 'accHRFolderOrdersOther',
    isFolder: 1,
    caption: 'Інші накази',
    caption_uk: 'Інші накази',
    caption_ru: 'Другие приказы',
    caption_az: 'Digər əmrlər',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-edit',
    displayOrder: 700,
    items: [
      {
        desktopCode: 'arm_accHR',
        parentCode: 'accHRFolderOrdersOther',
        code: 'accHR_empOrderChgEmployeeA',
        isFolder: 0,
        caption: 'Зміна облікових даних',
        caption_uk: 'Зміна облікових даних',
        caption_ru: 'Изменение учетных данных',
        caption_az: 'Uçot məlumatlarının dəyişdirilməsi',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_empOrderChgEmployeeA') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 100
      },
      {
        desktopCode: 'arm_accHR',
        parentCode: 'accHRFolderOrdersOther',
        code: 'accHR_empOrderMilServiceA',
        isFolder: 0,
        caption: 'Військова служба',
        caption_uk: 'Військова служба',
        caption_ru: 'Военная служба',
        caption_az: 'Hərbi xidmət',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_empOrderMilServiceA') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 200
      },
      {
        desktopCode: 'arm_accHR',
        parentCode: 'accHRFolderOrdersOther',
        code: 'accHR_empOrderMilServiceRetA',
        isFolder: 0,
        caption: 'Повернення з військової служби',
        caption_uk: 'Повернення з військової служби',
        caption_ru: 'Возвращение с воинской службы',
        caption_az: 'Hərbi xidmətdən qayıtma',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_empOrderMilServiceRetA') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 300
      },
      {
        desktopCode: 'arm_accHR',
        parentCode: 'accHRFolderOrdersOther',
        code: 'acc_hr_empOrderCancellationA',
        isFolder: 0,
        caption: 'Скасування',
        caption_uk: 'Скасування',
        caption_ru: 'Отмена приказа',
        caption_az: 'Əmrin ləğv edilməsi',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_empOrderCancellationA') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 400
      },
      {
        desktopCode: 'arm_accHR',
        parentCode: 'accHRFolderOrdersOther',
        code: 'acc_hr_empOrderCancelParaA',
        isFolder: 0,
        caption: 'Скасування пункту',
        caption_uk: 'Скасування пункту',
        caption_ru: 'Отмена пункта приказа',
        caption_az: 'Əmr bəndinin ləğv edilməsi',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_empOrderCancelParaA') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 450
      },
      {
        desktopCode: 'arm_accHR',
        parentCode: 'accHRFolderOrdersOther',
        code: 'accHREmpOrderAppointLiqA',
        isFolder: 0,
        caption: 'Призначення на ліквідовані посади',
        caption_uk: 'Призначення на ліквідовані посади',
        caption_ru: 'Назначение на ликвидированные должности',
        caption_az: 'Ləğv olunmuş vəzifələrə təyinat',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_empOrderAppointLiqA') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 500
      },
      {
        desktopCode: 'arm_accHR',
        parentCode: 'accHRFolderOrdersOther',
        code: 'accHREmpOrderTrialProlongA',
        isFolder: 0,
        caption: 'Продовження випробувального терміну',
        caption_uk: 'Продовження випробувального терміну',
        caption_ru: 'Продление испытательного срока',
        caption_az: 'Sınaq müddətinin uzadılması',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_empOrderTrialProlongA') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 600
      },
      {
        desktopCode: 'arm_accHR',
        parentCode: 'accHRFolderOrdersOther',
        code: 'accHRTimeCostChange',
        isFolder: 0,
        caption: 'Коригування неявок за наказами',
        caption_uk: 'Коригування неявок за наказами',
        caption_ru: 'Корректировка неявок по приказам',
        caption_az: 'İş yerində olmamanın əmr əsasında düzəldilməsi',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_timeCostChange') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 350
      },
      {
        desktopCode: 'arm_accHR',
        parentCode: 'accHRFolderOrdersOther',
        code: 'accHRChangePosition',
        isFolder: 0,
        caption: 'Зміна призначень',
        caption_uk: 'Зміна призначень',
        caption_ru: 'Изменение назначений',
        caption_az: 'Təyinat dəyişikliyi',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_empOrderChgPosition') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 650
      },
      {
        desktopCode: 'arm_accHR',
        parentCode: 'accHRFolderOrdersOther',
        code: 'accHRchangePosSchLog',
        isFolder: 0,
        caption: 'Журнал змін тимчасових призначень',
        caption_uk: 'Журнал змін тимчасових призначень',
        caption_ru: 'Журнал изменений временных назначений',
        caption_az: 'Müvəqqəti təyinatların dəyişdirilməsi jurnalı',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_changePosSchLog') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 700
      },
      {
        desktopCode: 'arm_accHR',
        parentCode: 'accHRFolderOrdersOther',
        code: 'accHR_empOrderVehicleassign',
        isFolder: 0,
        caption: 'Закріплення транспортних засобів',
        caption_uk: 'Закріплення транспортних засобів',
        caption_ru: 'Закрепление транспортных средств',
        caption_az: 'Uçot məlumatlarının dəyişdirilməsi',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_empOrderVehicleassign') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 100
      },
      {
        desktopCode: 'arm_accHR',
        parentCode: 'accHRFolderOrdersOther',
        code: 'accHR_empOrderMedexaminationA',
        isFolder: 0,
        caption: 'Компенсація за проходження медогляду',
        caption_uk: 'Компенсація за проходження медогляду',
        caption_ru: 'Компенсація за проходження медогляду',
        caption_az: 'Компенсація за проходження медогляду',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_empOrderMedexaminationA') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 110
      }
    ]
  },
  {
    desktopCode: 'arm_accHR',
    code: 'accHRDictionary',
    isFolder: 0,
    caption: 'Довідники',
    caption_uk: 'Довідники',
    caption_ru: 'Справочники',
    caption_az: 'Soraqçalar',
    cmdCode: {
      cmdType: 'showForm',
      formCode: 'hr_dictListEmpOrder'
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-archive',
    displayOrder: 4000
  },
  {
    desktopCode: 'arm_accAdm',
    code: 'accAdmHRUser',
    isFolder: 0,
    caption: 'Список користувачів організацій',
    caption_uk: 'Список користувачів організацій',
    caption_ru: 'Список пользователей организаций',
    caption_az: 'Təşkilat istifadəçilərinin siyahısı',
    cmdCode: {
      cmdType: 'showForm',
      formCode: function () { $App.runShortcutCommand('hr_user') }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accAdm',
    code: 'accAdmHREmployeeCabList',
    isFolder: 0,
    caption: 'Налаштування картки працівника',
    caption_uk: 'Налаштування картки працівника',
    caption_ru: 'Настройка карточки работника',
    caption_az: 'İşçi kartının qurulması',
    cmdCode: {
      cmdType: 'showForm',
      formCode: function () { $App.runShortcutCommand('hr_employeeCardShortcutList') }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accAdm',
    code: 'accAdmHREmployeeCardSetting',
    isFolder: 0,
    caption: 'Налаштування картки працівника в особистому кабінеті',
    caption_uk: 'Налаштування картки працівника в особистому кабінеті',
    caption_ru: 'Настройка карты работника в личном кабинете',
    caption_az: 'Şəxsi kabinetdə işçinin kartının qurulması',
    cmdCode: {
      cmdType: 'showForm',
      formCode: function () { $App.runShortcutCommand('hr_employeeCardSetting') }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accAdm',
    code: 'accAdmOrderCounter',
    isFolder: 0,
    caption: 'Нумерація наказів',
    caption_uk: 'Нумерація наказів',
    caption_ru: 'Нумерация приказов',
    caption_az: 'Əmrlərin nömrələnməsi',
    cmdCode: {
      cmdType: 'showForm',
      formCode: function () { $App.runShortcutCommand('hr_counter') }
    },
    inWindow: 1,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 6
  },
  {
    desktopCode: 'arm_accAdm',
    code: 'accAdmReportSetParam',
    isFolder: 0,
    caption: 'Налаштування статистичних звітів',
    caption_uk: 'Налаштування статистичних звітів',
    caption_ru: 'Настройка статистических отчетов',
    caption_az: 'Statistik hesabatların tənzimlənməsi',
    cmdCode: {
      cmdType: 'showForm',
      formCode: function () { $App.runShortcutCommand('hr_reportSetParam') }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 7
  },
  {
    desktopCode: 'arm_accAdm',
    code: 'arm_accCfgHrSetup',
    isFolder: 1,
    caption: 'Налагодження управління персоналом',
    caption_ua: 'Налагодження управління персоналом',
    caption_ru: 'Настройка управления персоналом',
    caption_az: 'İşçi heyətin idarə olunmasının müəyyən olunması',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 5,
    items: [
      {
        desktopCode: 'arm_accAdm',
        parentCode: 'arm_accCfgHrSetup',
        code: 'accHrPositionTypeProps',
        isFolder: 0,
        caption: 'Заповнення атрибутів за типом посади (по замовченню)',
        caption_ua: 'Заповнення атрибутів за типом посади (по замовченню)',
        caption_ru: 'Заполнение атрибутов по типу должности (по умолчанию)',
        caption_az: 'Vəzifə növünə görə atributların doldurulması (susmaya görə)',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_positionTypeProps') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 20
      },
      {
        desktopCode: 'arm_accAdm',
        parentCode: 'arm_accCfgHrSetup',
        code: 'accHrEmpOrderDetConfigAttr',
        isFolder: 0,
        caption: 'Параметри налаштування пунктів наказів (можливі значення)',
        caption_ua: 'Параметри налаштування пунктів наказів (можливі значення)',
        caption_ru: 'Параметры настройки пунктов приказов (возможные значения)',
        caption_az: 'Əmr maddələrinin tənzimlənməsinin parametrləri (mümkün dəyərlər)',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_hrEmpOrderDetConfigAttr') }
        },
        inWindow: 1,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 30
      },
      {
        desktopCode: 'arm_accAdm',
        parentCode: 'arm_accCfgHrSetup',
        code: 'accHrDictRequestKind',
        isFolder: 0,
        caption: 'Вид заяв',
        caption_uk: 'Вид заяв',
        caption_ru: 'Вид заявлений',
        caption_az: 'Tətbiqlərin növü',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_dictRequestKind') }
        },
        inWindow: 1,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 35
      },
      {
        desktopCode: 'arm_accAdm',
        parentCode: 'arm_accCfgHrSetup',
        code: 'accHrEmpOrderDetConfigDef',
        isFolder: 0,
        caption: 'Шаблон налаштування пунктів наказів (види оплати)',
        caption_ua: 'Шаблон налаштування пунктів наказів (види оплати)',
        caption_ru: 'Шаблон настройки пунктов приказов (виды оплаты)',
        caption_az: 'Əmr maddələrinin tənzimlənmə şablonu (ödəniş növləri)',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_hrEmpOrderDetConfigDef') }
        },
        inWindow: 1,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 40
      },
      {
        desktopCode: 'arm_accAdm',
        parentCode: 'arm_accCfgHrSetup',
        code: 'accAcSettingsOrgTemplate',
        isFolder: 0,
        caption: 'Шаблон налаштувань констант організації',
        caption_ua: 'Шаблон налаштувань констант організації',
        caption_ru: 'Шаблон настройки констант организации',
        caption_az: 'Təşkilat sabitlərinin tənzimlənmə şablonu',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('ac_settingsOrgTemplate') }
        },
        inWindow: 1,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 50
      },
      {
        desktopCode: 'arm_accAdm',
        parentCode: 'arm_accCfgHrSetup',
        code: 'accDictUniversalRef',
        isFolder: 0,
        caption: 'Шаблони універсальних довідок',
        caption_uk: 'Шаблони універсальних довідок',
        caption_ru: 'Шаблоны универсальных справок',
        caption_az: 'Universal istinadlar şablonları',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_dictUniversalRef') }
        },
        inWindow: 1,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 55
      },
      {
        desktopCode: 'arm_accAdm',
        parentCode: 'arm_accCfgHrSetup',
        code: 'accEmpRefSettings',
        isFolder: 0,
        caption: 'Налаштування відображення довідок в системі',
        caption_uk: 'Налаштування відображення довідок в системі',
        caption_ru: 'Настройка отображения справок в системе',
        caption_az: 'Sistemdə parametrləri göstərməyə kömək edin',
        cmdCode: {
          cmdType: 'showForm',
          formCode: 'hr_empRefSettings',
          entity: 'hr_service',
          tabId: 'hr_empRefSettings',
          props: { showGlobalSettings: true }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 55
      },
      {
        desktopCode: 'arm_accAdm',
        parentCode: 'arm_accCfgHrSetup',
        code: 'accHRFolderEMailTemplate',
        isFolder: 1,
        caption: 'Шаблон повідомлень на E-mail',
        caption_uk: 'Шаблон повідомлень на E-mail',
        caption_ru: 'Шаблон сообщений на E-mail',
        caption_az: 'E-poçt mesajı şablonu',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-cloud-download',
        displayOrder: 60,
        items: [
          {
            desktopCode: 'arm_accAdm',
            parentCode: 'accHRFolderEMailTemplate',
            code: 'accDictMailTmpl',
            isFolder: 0,
            caption: 'За маршрутом узгодження документів',
            caption_uk: 'За маршрутом узгодження документів',
            caption_ru: 'По маршруту согласования документов',
            caption_az: 'Sənədlərin koordinasiya marşrutuna uyğun olaraq',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictMailTmplByRecProc') }
            },
            inWindow: 1,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 1
          },
          {
            desktopCode: 'arm_accAdm',
            parentCode: 'accHRFolderEMailTemplate',
            code: 'accDictMailTmplByEvents',
            isFolder: 0,
            caption: 'За подією',
            caption_uk: 'За подією',
            caption_ru: 'По событием',
            caption_az: 'Hadisələrə görə',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictMailTmplByEvents') }
            },
            inWindow: 1,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 2
          }
        ]
      }
    ]
  },

  {
    desktopCode: 'arm_accAdm',
    code: 'accHRFolderAccessRequest',
    isFolder: 1,
    caption: 'Заявки на надання доступу',
    caption_uk: 'Заявки на надання доступу',
    caption_ru: 'Заявки на предоставление доступа',
    caption_az: 'Giriş icazəsi üçün müraciətlər',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-cloud-download',
    displayOrder: 400,
    items: [
      {
        desktopCode: 'arm_accAdm',
        code: 'accHRAccessRequestPROJECT',
        parentCode: 'accHRFolderAccessRequest',
        isFolder: 0,
        caption: 'Нові',
        caption_uk: 'Нові',
        caption_ru: 'Новые',
        caption_az: 'Yeni',
        cmdType: 'showList',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_accessRequestPROJECT') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 300
      },
      {
        desktopCode: 'arm_accAdm',
        code: 'accHRAccessRequestONRECONCILATION',
        parentCode: 'accHRFolderAccessRequest',
        isFolder: 0,
        caption: 'На погодженні',
        caption_uk: 'На погодженні',
        caption_ru: 'На согласовании',
        caption_az: 'Razılaşdırma üçün',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_accessRequestONRECONCILATION') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 400
      },
      {
        desktopCode: 'arm_accAdm',
        code: 'accHRAccessRequestRECONCILED',
        parentCode: 'accHRFolderAccessRequest',
        isFolder: 0,
        caption: 'Прийняті',
        caption_uk: 'Прийняті',
        caption_ru: 'Принятые',
        caption_az: 'Qəbul edilmiş',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_accessRequestRECONCILED') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 500
      },
      {
        desktopCode: 'arm_accAdm',
        code: 'accHRAccessRequestCANCELED',
        parentCode: 'accHRFolderAccessRequest',
        isFolder: 0,
        caption: 'Відхилені заявки',
        caption_uk: 'Відхилені заявки',
        caption_ru: 'Отклоненные заявки',
        caption_az: 'Ləğv edilmiş müraciətlər',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_accessRequestCANCELED') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 600
      }
    ]
  },
  {
    desktopCode: 'arm_accAdm',
    code: 'accHRFolderSetupOrg',
    isFolder: 1,
    caption: 'Адміністрування системи',
    caption_uk: 'Адміністрування системи',
    caption_ru: 'Администрирование системы',
    caption_az: 'Sistemin idarə olunması',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 500,
    items: [
      {
        desktopCode: 'arm_accAdm',
        parentCode: 'accHRFolderSetupOrg',
        code: 'accAdm_dictTempExecution',
        isFolder: 0,
        caption: 'ТВО за положенням',
        caption_uk: 'ТВО за положенням',
        caption_ru: 'ВИО по положению',
        caption_az: 'Statusa görə vie',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_dictTempExecution') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 100
      },
      {
        desktopCode: 'arm_accAdm',
        parentCode: 'accHRFolderSetupOrg',
        code: 'accAdmSettingsMyOrg',
        isFolder: 0,
        caption: 'Константи організації',
        caption_uk: 'Константи організації',
        caption_ru: 'Константы организации',
        caption_az: 'Təşkilat sabitləri',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('ac_settingsMyOrg') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 200
      },
      {
        desktopCode: 'arm_accAdm',
        parentCode: 'accHRFolderSetupOrg',
        code: 'accAdmEmployeePhoto',
        isFolder: 0,
        caption: 'Завантаження файлів працівників',
        caption_uk: 'Завантаження файлів працівників',
        caption_ru: 'Загрузка файлов работников',
        caption_az: 'Əməkdaşların fotolarının yüklənməsi',
        cmdCode: {
          cmdType: 'showForm',
          formCode: 'hr_empImportPhoto',
          entity: 'ac_service',
          customParams: {
            mode: 'EMP'
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 250
      },
      {
        desktopCode: 'arm_accAdm',
        parentCode: 'accHRFolderSetupOrg',
        code: 'accHrEmpOrderDetConfig',
        isFolder: 0,
        caption: 'Налаштування пунктів наказів (види оплати)',
        caption_uk: 'Налаштування пунктів наказів (види оплати)',
        caption_ru: 'Настройка пунктов приказов (виды оплаты)',
        caption_az: 'Əmr bəndlərinin tənzimlənməsi (ödəniş növləri)',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('arm_hrEmpOrderDetConfig') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 300
      },
      {
        desktopCode: 'arm_accAdm',
        parentCode: 'accHRFolderSetupOrg',
        code: 'accAdmDocPrintSettingsOrg',
        isFolder: 0,
        caption: 'Налаштування друку документів',
        caption_uk: 'Налаштування друку документів',
        caption_ru: 'Налаштування друку документів',
        caption_az: 'Sənədin çap tənzimləmələri',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('ac_docPrintSettingsOrg') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 400
      }
    ]
  },
  {
    desktopCode: 'adm_desktop',
    parentCode: 'adm_folder_UBQ',
    code: 'accAdm_payCalc',
    isFolder: 0,
    caption: 'Перерахунок ЗП',
    caption_uk: 'Перерахунок ЗП',
    caption_ru: 'Пересчет ЗП',
    caption_az: 'Əmək haqqının yenidən hesablanması',
    cmdCode: {
      cmdType: 'showForm',
      formCode: function () { $App.runShortcutCommand('hr_payCalc') }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 100
  },
  {
    desktopCode: 'adm_desktop',
    parentCode: 'adm_folder_UBQ',
    code: 'accAdm_calcQueueLog',
    isFolder: 0,
    caption: 'Запуск перерахунку ЗП',
    caption_uk: 'Запуск перерахунку ЗП',
    caption_ru: 'Запуск перерасчета ЗП',
    caption_az: 'Əmək haqqının yenidən hesablanmasına başlama',
    cmdCode: {
      cmdType: 'showForm',
      formCode: function () { $App.runShortcutCommand('hr_calcQueueLog') }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 200
  },
  {
    desktopCode: 'adm_desktop',
    parentCode: 'adm_folder_UBQ',
    code: 'accAdm_calcQueue',
    isFolder: 0,
    caption: 'Черга перерахунку',
    caption_uk: 'Черга перерахунку',
    caption_ru: 'Очередь перерасчета',
    caption_az: 'Hesablama növbəsi',
    cmdCode: {
      cmdType: 'showForm',
      formCode: function () { $App.runShortcutCommand('hr_calcQueue') }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 200
  },
  {
    desktopCode: 'arm_accHR',
    code: 'accHRFolderStatReports',
    isFolder: 0,
    caption: 'Звіти',
    caption_uk: 'Звіти',
    caption_ru: 'Отчеты',
    caption_az: 'Hesabatlar',
    cmdType: 'showForm',
    formCode: 'ac_shortcutList',
    cmpInitConfig:
            {
              shortcutCode: 'reportsStat',
              caption: 'Звіти',
              // caption_uk: 'Звіти',
              // caption_ru: 'Отчеты',
              tip: 'Звіти'
            },
    inWindow: 1,
    isCollapsed: 0,
    iconCls: 'fa fa-bar-chart-o',
    displayOrder: 3000
  },
  {
    desktopCode: 'arm_accHR',
    code: 'accHR_empOrderAllA',
    isFolder: 0,
    caption: 'Накази (всі)',
    caption_uk: 'Накази (всі)',
    caption_ru: 'Приказы (все)',
    caption_az: 'Əmrlər (hamısı)',
    cmdCode: {
      cmdType: 'showForm',
      formCode: function () { $App.runShortcutCommand('hr_empOrderAllA') }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-search',
    displayOrder: 2000
  },
  {
    desktopCode: 'arm_accHR',
    code: 'accHR_empOrderExtract',
    isFolder: 0,
    caption: 'Витяги з наказів',
    caption_uk: 'Витяги з наказів',
    caption_ru: 'Выписки из приказов',
    caption_az: 'Əmrlərdən çıxarışlar',
    cmdCode: {
      cmdType: 'showForm',
      formCode: function () { $App.runShortcutCommand('hr_empOrderExtract') }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-search',
    displayOrder: 2500
  },
  {
    desktopCode: 'arm_accHR',
    code: 'accHR_settingsEmpOrder',
    isFolder: 0,
    caption: 'Налаштування наказів',
    caption_uk: 'Налаштування наказів',
    caption_ru: 'Настройка приказов',
    caption_az: 'Əmrlərin tənzimlənməsi',
    cmdCode: {
      cmdType: 'showForm',
      formCode: function () { $App.runShortcutCommand('hr_settingsEmpOrder') }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-cog',
    displayOrder: 2050
  },
  {
    desktopCode: 'arm_accHR',
    code: 'accHR_empOrderMeFolderA',
    isFolder: 1,
    caption: 'Мої накази',
    caption_uk: 'Мої накази',
    caption_ru: 'Мои приказы',
    caption_az: 'Mənim əmrlərim',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-user-circle-o',
    displayOrder: 2100,
    items: [
      {
        desktopCode: 'arm_accHR',
        code: 'accHR_empOrderMeOrderA',
        parentCode: 'accHR_empOrderMeFolderA',
        isFolder: 0,
        caption: 'Мої накази',
        caption_uk: 'Мої накази',
        caption_ru: 'Мои приказы',
        caption_az: 'Mənim əmrlərim',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_empOrderMeOrderA') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-calendar',
        displayOrder: 100
      },
      {
        desktopCode: 'arm_accHR',
        code: 'accHR_empOrderMeOrderProjA',
        parentCode: 'accHR_empOrderMeFolderA',
        isFolder: 0,
        caption: 'Мої проєкти',
        caption_uk: 'Мої проєкти',
        caption_ru: 'Мои проєкты',
        caption_az: 'Mənim layihələrim',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_empOrderMeOrderProjA') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-calendar',
        displayOrder: 200
      },
      {
        desktopCode: 'arm_accHR',
        code: 'accHR_empOrderMeOrderTodayA',
        parentCode: 'accHR_empOrderMeFolderA',
        isFolder: 0,
        caption: 'Мої накази за сьогодні',
        caption_uk: 'Мої накази за сьогодні',
        caption_ru: 'Мои приказы за сегодня',
        caption_az: 'Bu gün üçün əmrlərim',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_empOrderMeOrderTodayA') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-calendar-o',
        displayOrder: 300
      },
      {
        desktopCode: 'arm_accHR',
        code: 'accHR_empOrderMeOrderProjTodayA',
        parentCode: 'accHR_empOrderMeFolderA',
        isFolder: 0,
        caption: 'Мої проєкти за сьогодні',
        caption_uk: 'Мої проєкти за сьогодні',
        caption_ru: 'Мои проєкты за сегодня',
        caption_az: 'Bu gün üçün layihələrim',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_empOrderMeOrderProjTodayA') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-calendar-o',
        displayOrder: 400
      }
    ]
  },
  {
    desktopCode: 'arm_accHR',
    code: 'accHR_empSheduledLeaveMessages',
    isFolder: 0,
    caption: 'Повідомлення про заплановану відпустку',
    caption_uk: 'Повідомлення про заплановану відпустку',
    caption_ru: 'Повідомлення про заплановану відпустку',
    caption_az: 'Повідомлення про заплановану відпустку',
    cmdCode: {
      cmdType: 'showForm',
      formCode: function () { $App.runShortcutCommand('hr_empSheduledLeaveMessages') }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-envelope-open-o ',
    displayOrder: 3950
  }
]
