// displayOrder 100-199 for column 1
// displayOrder 200-299 for column 2
// displayOrder 300-399 for column 3

/* global $App */
module.exports = [
  {
    desktopCode: 'arm_accDst',
    code: 'accDstFolderOrders',
    isFolder: 1,
    caption: 'Накази з Персоналу',
    caption_uk: 'Накази з Персоналу',
    caption_ru: 'Приказы по Персоналу',
    caption_az: 'İşçi heyəti üzrə əmrlər',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-list-ol',
    displayOrder: 100,
    items: [
      {
        desktopCode: 'arm_accDst',
        parentCode: 'accDstFolderOrders',
        code: 'accDstFolderOrdersMove',
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
            desktopCode: 'arm_accDst',
            parentCode: 'accDstFolderOrdersMove',
            code: 'accDst_empOrderAppointA',
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
            displayOrder: 101
          },
          {
            desktopCode: 'arm_accDst',
            parentCode: 'accDstFolderOrdersMove',
            code: 'accDst_empOrderMoveA',
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
            displayOrder: 102
          },
          {
            desktopCode: 'arm_accDst',
            parentCode: 'accDstFolderOrdersMove',
            code: 'accDst_empOrderDismA',
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
            displayOrder: 103
          },
          {
            desktopCode: 'arm_accDst',
            parentCode: 'accDstFolderOrdersMove',
            code: 'accDst_empOrderActingOrdA',
            isFolder: 0,
            caption: 'Покладання обов`язків',
            caption_uk: 'Покладання обов`язків',
            caption_ru: 'Возложение обязанностей',
            caption_az: 'Vəzifə öhdəliklərinin müəyyən olunması',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_empOrderActingOrdA') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 104
          },
          {
            desktopCode: 'arm_accDst',
            parentCode: 'accDstFolderOrdersMove',
            code: 'accDts_empOrderActingCloseA',
            isFolder: 0,
            caption: 'Припинення виконання обов`язків',
            caption_uk: 'Припинення виконання обов`язків',
            caption_ru: 'Прекращение исполнения обязанностей',
            caption_az: 'Vəzifə öhdəliklərinin yerinə yetirilməsinə xitam verilməsi',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_empOrderActingCloseA') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 105
          },
          {
            desktopCode: 'arm_accDst',
            parentCode: 'accDstFolderOrdersMove',
            code: 'accDst_empOrderRankA',
            isFolder: 0,
            caption: 'Присвоєння рангу',
            caption_uk: 'Присвоєння рангу',
            caption_ru: 'Присвоение ранга',
            caption_az: 'İxtisas dərəcəsinin verilməsi',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_empOrderRankA') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: 'orgType2',
            displayOrder: 106
          },
          {
            desktopCode: 'arm_accDst',
            parentCode: 'accDstFolderOrdersMove',
            code: 'accDst_empOrderPluralistA',
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
            iconCls: 'orgType1',
            displayOrder: 107
          },
          {
            desktopCode: 'arm_accDst',
            parentCode: 'accDstFolderOrdersMove',
            code: 'accDst_empOrderOutpluralA',
            isFolder: 0,
            caption: 'Припинення сумісництва',
            caption_uk: 'Припинення сумісництва',
            caption_ru: 'Прекращение совместительства',
            caption_az: 'Yarımştat işin ləğv edilməsi',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_empOrderOutpluralA') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: 'orgType1',
            displayOrder: 108
          },
          {
            desktopCode: 'arm_accDst',
            parentCode: 'accDstFolderOrdersMove',
            code: 'accDst_empOrderCanceldismA',
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
            iconCls: 'allOrders',
            displayOrder: 109
          },
          {
            desktopCode: 'arm_accDst',
            parentCode: 'accDstFolderOrdersMove',
            code: 'accDst_empOrderAppointMoveA',
            isFolder: 0,
            caption: 'Первинне призначення, переведення',
            caption_uk: 'Первинне призначення, переведення',
            caption_ru: 'Первичное назначение, переведение',
            caption_az: 'İlkin təyinat, keçirilmə',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_empOrderAppointMoveA') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: 'allOrders',
            displayOrder: 110
          },
          {
            desktopCode: 'arm_accDst',
            parentCode: 'accDstFolderOrdersMove',
            code: 'accDst_empOrderStaffTableMove',
            isFolder: 0,
            caption: 'Рознесення змін за штатним розписом',
            caption_uk: 'Рознесення змін за штатним розписом',
            caption_ru: 'Разнесения изменений по штатному расписанию',
            caption_az: 'Ştat cədvəlinə dair dəyişikliklərin yönləndirilməsi',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_empOrderStaffTableMove') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 111
          }
        ]
      },
      {
        desktopCode: 'arm_accDst',
        parentCode: 'accDstFolderOrders',
        code: 'accDstFolderOrdersChgSalary',
        isFolder: 1,
        caption: 'Надбавки, доплати та премії',
        caption_uk: 'Надбавки, доплати та премії',
        caption_ru: 'Надбавки, доплаты и премии',
        caption_az: 'Müavinətlər, əlavələr və mükafatlar',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-money',
        displayOrder: 120,
        items: [
          {
            desktopCode: 'arm_accDst',
            parentCode: 'accDstFolderOrdersChgSalary',
            code: 'accDst_empOrderAddSalaryA',
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
            displayOrder: 121
          },
          {
            desktopCode: 'arm_accDst',
            parentCode: 'accDstFolderOrdersChgSalary',
            code: 'accDst_empOrderBountyA',
            isFolder: 0,
            caption: 'Преміювання',
            caption_uk: 'Преміювання',
            caption_ru: 'Премирование',
            caption_az: 'Mükafatlandırma',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_empOrderBountyA') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 122
          },
          {
            desktopCode: 'arm_accDst',
            parentCode: 'accDstFolderOrdersChgSalary',
            code: 'accDst_empOrderBountyHelpA',
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
            displayOrder: 123
          },
          {
            desktopCode: 'arm_accDst',
            parentCode: 'accDstFolderOrdersChgSalary',
            code: 'accDst_empOrderAddSalaryGovA',
            isFolder: 0,
            caption: 'Встановлення надбавок за вислугу років',
            caption_uk: 'Встановлення надбавок за вислугу років',
            caption_ru: 'Установление надбавок за выслугу лет',
            caption_az: 'İş stajına görə əlavələrin müəyyən olunması',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_empOrderAddSalaryGovA') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 124
          },
          {
            desktopCode: 'arm_accDst',
            parentCode: 'accDstFolderOrdersChgSalary',
            code: 'accDst_empOrderRiskPayA',
            isFolder: 0,
            caption: 'Підвищення оплати за шкідливість',
            caption_uk: 'Підвищення оплати за шкідливість',
            caption_ru: 'Повышение оплаты за вредность',
            caption_az: 'Zərərli iş şəraitinə görə əmək haqqının artırılması',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_empOrderRiskPayA') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: 'orgType1',
            displayOrder: 125
          },
          {
            desktopCode: 'arm_accDst',
            parentCode: 'accDstFolderOrdersChgSalary',
            code: 'accDst_empOrderAddPayA',
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
            iconCls: 'orgType1',
            displayOrder: 126
          },
          {
            desktopCode: 'arm_accDst',
            parentCode: 'accDstFolderOrdersChgSalary',
            code: 'accDst_empOrderCancelSalaryA',
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
            iconCls: 'allOrders',
            displayOrder: 127
          },
          {
            desktopCode: 'arm_accHR',
            parentCode: 'accDstFolderOrdersChgSalary',
            code: 'accDst_empOrderChgsalaryA',
            isFolder: 0,
            caption: 'Встановлення окладів працівникам',
            caption_uk: 'Встановлення окладів працівникам',
            caption_ru: 'Установление окладов работникам',
            caption_az: 'Əməkdaşların vəzifə maaşlarının təyin edilməsi',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_empOrderChgsalaryA') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 128
          }
        ]
      },
      {
        desktopCode: 'arm_accDst',
        parentCode: 'accDstFolderOrders',
        code: 'accDstFolderAllOrdersCheckBox',
        isFolder: 1,
        caption: '-',
        caption_uk: '-',
        caption_ru: '-',
        caption_az: '-',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 150,
        items: [
          {
            desktopCode: 'arm_accDst',
            parentCode: 'accDstFolderAllOrdersCheckBox',
            code: 'accDst_empOrderAllOrders',
            isFolder: 0,
            caption: 'Усі накази',
            caption_uk: 'Усі накази',
            caption_ru: 'Все приказы',
            caption_az: 'Bütün əmrlər',
            cmdCode: null,
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 151
          }
        ]
      },
      {
        desktopCode: 'arm_accDst',
        parentCode: 'accDstFolderOrders',
        code: 'accDstFolderOrdersAbsence',
        isFolder: 1,
        caption: 'Відпустки, відрядження',
        caption_uk: 'Відпустки, відрядження',
        caption_ru: 'Отпуска, командировки',
        caption_az: 'Məzuniyyətlət, ezamiyyətlərlər',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-plane',
        displayOrder: 200,
        items: [
          {
            desktopCode: 'arm_accDst',
            parentCode: 'accDstFolderOrdersAbsence',
            code: 'accDst_empOrderVacationA',
            isFolder: 0,
            caption: 'Відпустки',
            caption_uk: 'Відпустки',
            caption_ru: 'Отпуск',
            caption_az: 'Məzuniyət',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_empOrderVacationA') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 201
          },
          {
            desktopCode: 'arm_accDst',
            parentCode: 'accDstFolderOrdersAbsence',
            code: 'accDst_empOrderVacationProlongA',
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
            displayOrder: 202
          },
          {
            desktopCode: 'arm_accDst',
            parentCode: 'accDstFolderOrdersAbsence',
            code: 'accDst_empOrderVacationRevokeA',
            isFolder: 0,
            caption: 'Відкликання з відпустки',
            caption_uk: 'Відкликання з відпустки',
            caption_ru: 'Отзыв из отпуска',
            caption_az: 'Məzuniyyətdən geri çağırılma',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_empOrderVacationRevokeA') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 203
          },
          {
            desktopCode: 'arm_accDst',
            parentCode: 'accDstFolderOrdersAbsence',
            code: 'accDst_empOrderVacationRetA',
            isFolder: 0,
            caption: 'Вихід із довготривалої відпустки',
            caption_uk: 'Вихід із довготривалої відпустки',
            caption_ru: 'Выход из длительного отпуска',
            caption_az: 'Uzunmüddətli məzuniyyətdən çıxarılma',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_empOrderVacationRetA') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 204
          },
          {
            desktopCode: 'arm_accDst',
            parentCode: 'accDstFolderOrdersAbsence',
            code: 'accDst_empOrderVacationCompA',
            isFolder: 0,
            caption: 'Компенсація відпустки',
            caption_uk: 'Компенсація відпустки',
            caption_ru: 'Компенсация отпуска',
            caption_az: 'Məzuniyyət kompensasiyası',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_empOrderVacationCompA') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 205
          },
          {
            desktopCode: 'arm_accDst',
            parentCode: 'accDstFolderOrdersAbsence',
            code: 'accDst_empOrderMissionA',
            isFolder: 0,
            caption: 'Відрядження',
            caption_uk: 'Відрядження',
            caption_ru: 'Командировка',
            caption_az: 'Ezamiyyət',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_empOrderMissionA') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 206
          },
          {
            desktopCode: 'arm_accDst',
            parentCode: 'accDstFolderOrdersAbsence',
            code: 'accDst_empOrderChangemissionA',
            isFolder: 0,
            caption: 'Зміни наказів про відрядження',
            caption_uk: 'Зміни наказів про відрядження',
            caption_ru: 'Изменения в приказах о командировках',
            caption_az: 'Ezamiyyət',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_empOrderChangemissionA') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 207
          }
        ]
      },
      {
        desktopCode: 'arm_accDst',
        parentCode: 'accDstFolderOrders',
        code: 'accDstFolderOrdersChgWorkSched',
        isFolder: 1,
        caption: 'Режими роботи',
        caption_uk: 'Режими роботи',
        caption_ru: 'Режимы работы',
        caption_az: 'İş rejimi',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-clock-o',
        displayOrder: 208,
        items: [
          {
            desktopCode: 'arm_accDst',
            parentCode: 'accDstFolderOrdersChgWorkSched',
            code: 'accDst_empOrderChgworksched',
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
            displayOrder: 209
          },
          {
            desktopCode: 'arm_accDst',
            parentCode: 'accDstFolderOrdersChgWorkSched',
            code: 'accDst_empOrderWeekendWork',
            isFolder: 0,
            caption: 'Про роботу у вихідні/святкові дні',
            caption_uk: 'Про роботу у вихідні/святкові дні',
            caption_ru: 'О работе в выходные/праздничные дни',
            caption_az: 'Həftə sonları / bayram günləri iş haqqında',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_empOrderWeekendWork') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 210
          },
          {
            desktopCode: 'arm_accDst',
            parentCode: 'accDstFolderOrdersChgWorkSched',
            code: 'accDst_empOrderRelaxDonor',
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
            displayOrder: 211
          },
          {
            desktopCode: 'arm_accDst',
            parentCode: 'accDstFolderOrdersChgWorkSched',
            code: 'accDst_empOrderRelaxHd',
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
            displayOrder: 212
          },
          {
            desktopCode: 'arm_accDst',
            parentCode: 'accDstFolderOrdersChgWorkSched',
            code: 'accDst_empOrderCwsWorkHour',
            isFolder: 0,
            caption: 'Про встановлення робочого часу',
            caption_uk: 'Про встановлення робочого часу',
            caption_ru: 'Об установлении рабочего времени',
            caption_az: 'İş vaxtının müəyyən olunması haqqında',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_empOrderCwsWorkHour') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 213
          },
          {
            desktopCode: 'arm_accDst',
            parentCode: 'accDstFolderOrdersChgWorkSched',
            code: 'accDst_empOrderOverPayA',
            isFolder: 0,
            caption: 'Понаднормова праця',
            caption_uk: 'Понаднормова праця',
            caption_ru: 'Сверхурочная работа',
            caption_az: 'İş vaxtından artıq iş',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_empOrderOverPayA') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: 'orgType1',
            displayOrder: 214
          },
          {
            desktopCode: 'arm_accDst',
            parentCode: 'accDstFolderOrdersChgWorkSched',
            code: 'accDst_empOrderDowntimeA',
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
            displayOrder: 215
          },
          {
            desktopCode: 'arm_accDst',
            parentCode: 'accDstFolderOrdersChgWorkSched',
            code: 'accDst_empOrderRecallA',
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
            displayOrder: 216
          },
          {
            desktopCode: 'arm_accDst',
            parentCode: 'accDstFolderOrdersChgWorkSched',
            code: 'accDst_empOrderAveragePay',
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
            displayOrder: 217
          },
          {
            desktopCode: 'arm_accDst',
            parentCode: 'accDstFolderOrdersChgWorkSched',
            code: 'accDst_empOrderCancelAveragePay',
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
            displayOrder: 218
          }
        ]
      },
      {
        desktopCode: 'arm_accDst',
        parentCode: 'accDstFolderOrders',
        code: 'accDstFolderOrdersTraining',
        isFolder: 1,
        caption: 'Підготовка, навчання',
        caption_uk: 'Підготовка, навчання',
        caption_ru: 'Подготовка, обучение',
        caption_az: 'Hazırlıq, təlim',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-mortar-board',
        displayOrder: 300,
        items: [
          {
            desktopCode: 'arm_accDst',
            parentCode: 'accDstFolderOrdersTraining',
            code: 'accDst_empOrderTrainingA',
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
            displayOrder: 301
          },
          {
            desktopCode: 'arm_accDst',
            parentCode: 'accDstFolderOrdersTraining',
            code: 'accDst_empOrderInternshipA',
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
            iconCls: 'allOrders',
            displayOrder: 302
          }
        ]
      },
      {
        desktopCode: 'arm_accDst',
        parentCode: 'accDstFolderOrders',
        code: 'accDstFolderCertification',
        isFolder: 1,
        caption: 'Атестація',
        caption_uk: 'Атестація',
        caption_ru: 'Аттестация',
        caption_az: 'Attestasiya',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'orgType1',
        displayOrder: 304,
        items: [
          {
            desktopCode: 'arm_accDst',
            parentCode: 'accDstFolderCertification',
            code: 'accDst_empOrderCertificationA',
            isFolder: 0,
            caption: 'Про присвоєння кваліфікації',
            caption_uk: 'Про присвоєння кваліфікації',
            caption_ru: 'О присвоении квалификации',
            caption_az: 'İxtisasın təyin edilməsi haqqında',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_empOrderCertificationA') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: 'orgType1',
            displayOrder: 305
          }
        ]
      },
      {
        desktopCode: 'arm_accDst',
        parentCode: 'accDstFolderOrders',
        code: 'accDstFolderOrdersDisciplinary',
        isFolder: 1,
        caption: 'Дисциплінарна практика',
        caption_uk: 'Дисциплінарна практика',
        caption_ru: 'Дисциплинарная практика',
        caption_az: 'İntizam təcrübəsi',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-trophy',
        displayOrder: 307,
        items: [
          {
            desktopCode: 'arm_accDst',
            parentCode: 'accDstFolderOrdersDisciplinary',
            code: 'accDst_empOrderBonus',
            isFolder: 0,
            caption: 'Нагородження',
            caption_uk: 'Нагородження',
            caption_ru: 'Награждение',
            caption_az: 'Mükafatlandırma',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_empOrderBonusA') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 308
          },
          {
            desktopCode: 'arm_accDst',
            parentCode: 'accDstFolderOrdersDisciplinary',
            code: 'accDst_empOrderReward',
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
            displayOrder: 309
          },
          {
            desktopCode: 'arm_accDst',
            parentCode: 'accDstFolderOrdersDisciplinary',
            code: 'accDst_empOrderPenalty',
            isFolder: 0,
            caption: 'Дисциплінарні стягнення',
            caption_uk: 'Дисциплінарні стягнення',
            caption_ru: 'Дисциплинарное взыскание',
            caption_az: 'İntizam tənbehi',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_empOrderPenaltyA') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 310
          }
        ]
      },
      {
        desktopCode: 'arm_accDst',
        parentCode: 'accDstFolderOrders',
        code: 'accDstFolderOrdersOther',
        isFolder: 1,
        caption: 'Інші накази',
        caption_uk: 'Інші накази',
        caption_ru: 'Другие приказы',
        caption_az: 'Digər əmrlər',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-edit',
        displayOrder: 312,
        items: [
          {
            desktopCode: 'arm_accDst',
            parentCode: 'accDstFolderOrdersOther',
            code: 'accDst_empOrderChgEmployeeA',
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
            displayOrder: 313
          },
          {
            desktopCode: 'arm_accDst',
            parentCode: 'accDstFolderOrdersOther',
            code: 'accDst_empOrderMilServiceA',
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
            displayOrder: 314
          },
          {
            desktopCode: 'arm_accDst',
            parentCode: 'accDstFolderOrdersOther',
            code: 'accDst_empOrderMilServiceRetA',
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
            displayOrder: 315
          },
          {
            desktopCode: 'arm_accDst',
            parentCode: 'accDstFolderOrdersOther',
            code: 'accDst_empOrderTrialProlongA',
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
            displayOrder: 316
          },
          {
            desktopCode: 'arm_accDst',
            parentCode: 'accDstFolderOrdersOther',
            code: 'accDst_empOrderAppointLiqA',
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
            iconCls: 'allOrders',
            displayOrder: 317
          },
          {
            desktopCode: 'arm_accDst',
            parentCode: 'accDstFolderOrdersOther',
            code: 'accDst_timeCostChange',
            isFolder: 0,
            caption: 'Коригування неявок за наказами',
            caption_uk: 'Коригування неявок за наказами',
            caption_ru: 'Корректировка неявок по приказам',
            caption_az: 'Əmrlərə çatışmazlığın düzəldilməsi',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_timeCostChange') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: 'allOrders',
            displayOrder: 318
          },
          {
            desktopCode: 'arm_accDst',
            parentCode: 'accDstFolderOrdersOther',
            code: 'accDst_empOrderCancellationA',
            isFolder: 0,
            caption: 'Скасування',
            caption_uk: 'Скасування',
            caption_ru: 'Отмена приказа',
            caption_az: 'Əmrin ləğvi',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_empOrderCancellationA') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: 'allOrders',
            displayOrder: 319
          },
          {
            desktopCode: 'arm_accDst',
            parentCode: 'accDstFolderOrdersOther',
            code: 'accDst_empOrderCancelParaA',
            isFolder: 0,
            caption: 'Скасування пункту',
            caption_uk: 'Скасування пункту',
            caption_ru: 'Отмена пункта',
            caption_az: 'Əmr maddəsinin ləğvi',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_empOrderCancelParaA') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: 'allOrders',
            displayOrder: 320
          },
          {
            desktopCode: 'arm_accDst',
            parentCode: 'accDstFolderOrdersOther',
            code: 'accDst_HRChangePosition',
            isFolder: 0,
            caption: 'Зміна призначень',
            caption_uk: 'Зміна призначень',
            caption_ru: 'Изменение назначений',
            caption_az: 'Təyinatın dəyişdirilməsi',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_empOrderChgPosition') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: 'allOrders',
            displayOrder: 321
          },
          {
            desktopCode: 'arm_accDst',
            parentCode: 'accDstFolderOrdersOther',
            code: 'accDst_changePosSchLog',
            isFolder: 0,
            caption: 'Журнал змін тимчасових призначень',
            caption_uk: 'Журнал змін тимчасових призначень',
            caption_ru: 'Журнал изменений временных назначений',
            caption_az: 'Müvəqqəti təyinatdakı dəyişikliklər jurnalı',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_changePosSchLog') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: 'allOrders',
            displayOrder: 322
          },
          {
            desktopCode: 'arm_accDst',
            parentCode: 'accDstFolderOrdersOther',
            code: 'accDst_empOrderVehicleassign',
            isFolder: 0,
            caption: 'Про закріплення транспортного засобу',
            caption_uk: 'Про закріплення транспортного засобу',
            caption_ru: 'О закреплении транспортного средства',
            caption_az: 'О закреплении транспортного средства',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_empOrderVehicleassign') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: 'allOrders',
            displayOrder: 330
          },
          {
            desktopCode: 'arm_accDst',
            parentCode: 'accDstFolderOrdersOther',
            code: 'accDst_empOrderMedexaminationA',
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
            displayOrder: 335
          }
        ]
      }
    ]
  }
]
