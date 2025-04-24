/* global $App */
module.exports = [
  {
    desktopCode: 'arm_accDoc',
    code: 'accDocFolderStaffOrder',
    isFolder: 1,
    caption: 'Штатний розпис',
    caption_uk: 'Штатний розпис',
    caption_ru: 'Штатное расписание',
    caption_az: 'Ştat cədvəli',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-cubes',
    displayOrder: 40,
    items: [
      {
        desktopCode: 'arm_accDoc',
        parentCode: 'accDocFolderStaffOrder',
        code: 'accDoc_taskMyStaffTableA',
        isFolder: 0,
        caption: 'Мої завдання (ШР)',
        caption_uk: 'Мої завдання (ШР)',
        caption_ru: 'Мои задачи (ШР)',
        caption_az: 'Mənim tapşırıqlarım (Ştat cədvəli)',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_taskMyStaffTableA') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-list-alt',
        displayOrder: 310
      },
      {
        desktopCode: 'arm_accDoc',
        parentCode: 'accDocFolderStaffOrder',
        code: 'accDoc_taskMyStaffTableClosedA',
        isFolder: 0,
        caption: 'Виконані завдання (ШР)',
        caption_uk: 'Виконані завдання (ШР)',
        caption_ru: 'Выполненные задания (ШР)',
        caption_az: 'İcra olunmuş tapşırıqlar (Ştat cədvəli)',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_taskMyStaffTableClosedA') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-list-alt',
        displayOrder: 320
      },
      {
        desktopCode: 'arm_accDoc',
        parentCode: 'accDocFolderStaffOrder',
        code: 'accDoc_staffTableRejectedA',
        isFolder: 0,
        caption: 'Відхилені проєкти',
        caption_uk: 'Відхилені проєкти',
        caption_ru: 'Отклоненные проекты',
        caption_az: 'Ləğv edilmiş layihələr',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_staffTableRejectedA') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-list-alt',
        displayOrder: 330
      },
      {
        desktopCode: 'arm_accDoc',
        parentCode: 'accDocFolderStaffOrder',
        code: 'accDoc_staffTableRejectedMyA',
        isFolder: 0,
        caption: 'Відхилені проєкти (мої)',
        caption_uk: 'Відхилені проєкти (мої)',
        caption_ru: 'Отклонены проекты (мои)',
        caption_az: 'Ləğv edilmiş layihələr (mənim)',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_staffTableRejectedMyA') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-list-alt',
        displayOrder: 340
      },
      {
        desktopCode: 'arm_accDoc',
        parentCode: 'accDocFolderStaffOrder',
        code: 'accDoc_staffTableOnCompletionA',
        isFolder: 0,
        caption: 'Проєкти на доопрацювання',
        caption_uk: 'Проєкти на доопрацювання',
        caption_ru: 'Проекты на доработку',
        caption_az: 'Tamamlanma üçün layihələr',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_staffTableOnCompletionA') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-list-alt',
        displayOrder: 350
      },
      {
        desktopCode: 'arm_accDoc',
        parentCode: 'accDocFolderStaffOrder',
        code: 'accDoc_staffTableOnCompletionMyA',
        isFolder: 0,
        caption: 'Проєкти на доопрацювання (мої)',
        caption_uk: 'Проєкти на доопрацювання (мої)',
        caption_ru: 'Проекты на доработку (мои)',
        caption_az: 'Tamamlanmada olan layihələr (mənim)',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_staffTableOnCompletionMyA') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-list-alt',
        displayOrder: 360
      },
      {
        desktopCode: 'arm_accDoc',
        parentCode: 'accDocFolderStaffOrder',
        code: 'accDoc_staffTableOtherOrgA',
        isFolder: 0,
        caption: 'Проєкти на погодження з інших організацій',
        caption_uk: 'Проєкти на погодження з інших організацій',
        caption_ru: 'Проекты на согласование с других организаций',
        caption_az: 'Digər təşkilatlarla razılaşdırma üçün layihələr',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_staffTableOtherOrgA') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-list-alt',
        displayOrder: 370
      }
    ]
  },
  {
    desktopCode: 'arm_accDoc',
    code: 'accDocMyTaskAllEntities',
    caption: 'Мої завдання',
    caption_uk: 'Мої завдання',
    caption_ru: 'Мои задачи',
    caption_az: 'Mənim tapşırıqlarım',
    displayOrder: 10,
    inWindow: 0,
    isCollapsed: 0,
    isFolder: 0,
    iconCls: 'fa fa-pencil',
    cmdCode: {
      cmdType: 'showForm',
      formCode: function () { $App.runShortcutCommand('hr_taskMyAllEntities') }
    }
  },
  {
    desktopCode: 'arm_accDoc',
    code: 'accDocMyTaskCompleteAllEntities',
    caption: 'Виконані завдання (мої)',
    caption_uk: 'Виконані завдання (мої)',
    caption_ru: 'Выполненные задания (мои)',
    caption_az: 'İcra edilmiş tapşırıqlar (mənim)',
    displayOrder: 20,
    inWindow: 0,
    isCollapsed: 0,
    isFolder: 0,
    iconCls: 'fa fa-pencil-square',
    cmdCode: {
      cmdType: 'showForm',
      formCode: function () { $App.runShortcutCommand('hr_taskMyCompleteAllEntities') }
    }
  },
  {
    desktopCode: 'arm_accDoc',
    code: 'accDocFolderOrder',
    isFolder: 1,
    caption: 'Накази з персоналу',
    caption_uk: 'Накази з персоналу',
    caption_ru: 'Приказы по персоналу',
    caption_az: 'İşçi heyəti üzrə əmrlər',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-user-circle-o',
    displayOrder: 30,
    items: [
      {
        desktopCode: 'arm_accDoc',
        parentCode: 'accDocFolderOrder',
        code: 'accDoc_taskMy',
        isFolder: 0,
        caption: 'Мої завдання',
        caption_uk: 'Мої завдання',
        caption_ru: 'Мои задачи',
        caption_az: 'Mənim tapşırıqlarım',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_taskMy') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 1100
      },
      {
        desktopCode: 'arm_accDoc',
        parentCode: 'accDocFolderOrder',
        code: 'accDoc_taskMyComplete',
        isFolder: 0,
        caption: 'Виконані завдання (мої)',
        caption_uk: 'Виконані завдання (мої)',
        caption_ru: 'Выполненные задания (мои)',
        caption_az: 'İcra olunmuş tapşırıqlar (mənim)',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_taskMyComplete') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 1105
      },
      {
        desktopCode: 'arm_accDoc',
        parentCode: 'accDocFolderOrder',
        code: 'accDoc_empOrderRejected',
        isFolder: 0,
        caption: 'Відхилені накази',
        caption_uk: 'Відхилені накази',
        caption_ru: 'Отклоненные приказы',
        caption_az: 'Ləğv edilmiş əmrlər',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_empOrderRejected') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 1110
      },
      {
        desktopCode: 'arm_accDoc',
        parentCode: 'accDocFolderOrder',
        code: 'accDoc_empOrderRejectedMy',
        isFolder: 0,
        caption: 'Відхилені накази (мої)',
        caption_uk: 'Відхилені накази (мої)',
        caption_ru: 'Отклоненные приказы (мои)',
        caption_az: 'Ləğv edilmiş əmrlər (mənim)',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_empOrderRejectedMy') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 1120
      },
      {
        desktopCode: 'arm_accDoc',
        parentCode: 'accDocFolderOrder',
        code: 'accDoc_empOrderOnCompletion',
        isFolder: 0,
        caption: 'Накази на доопрацюванні',
        caption_uk: 'Накази на доопрацюванні',
        caption_ru: 'Приказы на доработке',
        caption_az: 'Tamamlanmada olan əmrlər',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_empOrderOnCompletion') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 1130
      },
      {
        desktopCode: 'arm_accDoc',
        parentCode: 'accDocFolderOrder',
        code: 'accDoc_empOrderOnCompletionMy',
        isFolder: 0,
        caption: 'Накази на доопрацюванні (мої)',
        caption_uk: 'Накази на доопрацюванні (мої)',
        caption_ru: 'Приказы на доработке (мои)',
        caption_az: 'Tamamlanmada olan əmrlər (mənim)',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_empOrderOnCompletionMy') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 1140
      }
    ]
  }
]
