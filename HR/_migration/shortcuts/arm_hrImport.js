/* global */
module.exports = [
  {
    desktopCode: 'arm_accImport',
    code: 'accImportFolderHR',
    isFolder: 1,
    caption: 'Персонал',
    caption_uk: 'Персонал',
    caption_ru: 'Персонал',
    caption_az: 'İşçi heyəti',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-cloud-download',
    displayOrder: 2,
    items: [
      {
        desktopCode: 'arm_accImport',
        parentCode: 'accImportFolderHR',
        code: 'accImport_staff',
        isFolder: 0,
        caption: 'Завантаження з файлу (Оргструктура)',
        caption_uk: 'Завантаження з файлу (Оргструктура)',
        caption_ru: 'Загрузка из файла (Оргструктура)',
        caption_az: 'Fayldan yükləmə (Təşkilati struktur)',
        cmdCode: {
          cmdType: 'showForm',
          formCode: 'hr_empImport',
          customParams: {
            mode: 'STAFF'
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 100
      },
      {
        desktopCode: 'arm_accImport',
        parentCode: 'accImportFolderHR',
        code: 'accImport_employee',
        isFolder: 0,
        caption: 'Завантаження з файлу (працівники)',
        caption_uk: 'Завантаження з файлу (працівники)',
        caption_ru: 'Загрузка из файла (работники)',
        caption_az: 'Fayldan yükləmə (əməkdaşlar)',
        cmdCode: {
          cmdType: 'showForm',
          formCode: 'hr_empImport',
          customParams: {
            mode: 'EMP'
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 200
      },
      {
        desktopCode: 'arm_accImport',
        parentCode: 'accImportFolderHR',
        code: 'accImportDict',
        isFolder: 0,
        caption: 'Імпорт довідників',
        caption_uk: 'Імпорт довідників',
        caption_ru: 'Импорт справочников',
        caption_az: 'Soraqçaların import',
        cmdCode: {
          cmdType: 'showForm',
          formCode: 'hr_import-plan'
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 200
      },
      {
        desktopCode: 'arm_accImport',
        parentCode: 'accImportFolderHR',
        code: 'accImport_employeePhoto',
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
        displayOrder: 200
      },
      {
        desktopCode: 'arm_accImport',
        parentCode: 'accImportFolderHR',
        code: 'accImport_map',
        isFolder: 0,
        caption: 'Таблиця відповідності довідників',
        caption_uk: 'Таблиця відповідності довідників',
        caption_ru: 'Таблица соответствия справочников',
        caption_az: 'Soraqçaların istinad cədvəli',
        cmdType: 'showList',
        cmdData: {
          params: [{
            entity: 'imp_hr_map',
            method: 'select',
            fieldList: [
              { name: 'entityID.name', description: `{{UB.i18n('Сутність')}}` },
              { name: 'attrName' },
              { name: 'srcValue' },
              { name: 'valueName', description: `{{UB.i18n('Значення')}}` }
            ]
          }]
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 300
      }
    ]
  },
  {
    desktopCode: 'arm_accImport',
    code: 'accImportFolderSA',
    isFolder: 1,
    caption: 'Зарплата',
    caption_uk: 'Зарплата',
    caption_ru: 'Зарплата',
    caption_az: 'Maaş',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-cloud-download',
    displayOrder: 3,
    items: [
      {
        desktopCode: 'arm_accImport',
        parentCode: 'accImportFolderSA',
        code: 'accImport_payImport',
        isFolder: 0,
        caption: 'Імпорт даних',
        caption_uk: 'Імпорт даних',
        caption_ru: 'Импорт данных',
        caption_az: 'Məlumatların importu',
        cmdType: 'showForm',
        formCode: 'hr_importPlan',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-cloud-download',
        displayOrder: 1
      },
      {
        desktopCode: 'arm_accImport',
        parentCode: 'accImportFolderSA',
        code: 'accImport_studImport',
        isFolder: 0,
        caption: 'Імпорт списку студентів',
        caption_uk: 'Імпорт списку студентів',
        caption_ru: 'Импорт списка студентов',
        caption_az: 'Tələbə siyahısının importu',
        cmdType: 'showForm',
        formCode: 'hr_importStud',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-cloud-download',
        displayOrder: 1
      }
    ]
  },
  {
    desktopCode: 'arm_accImport',
    code: 'accImportFolderSpecSA',
    isFolder: 1,
    caption: 'Спеціальні рішення',
    caption_uk: 'Спеціальні рішення',
    caption_ru: 'Специальные решения',
    caption_az: 'Xüsusi həllər',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-cloud-download',
    displayOrder: 20,
    items: [
      {
        desktopCode: 'arm_accImport',
        parentCode: 'accImportFolderSpecSA',
        code: 'accImport_payImportCustom',
        isFolder: 0,
        caption: 'Рішення для обробки даних',
        caption_uk: 'Рішення для обробки даних',
        caption_ru: 'Решения для обработки данных',
        caption_az: 'Məlumat emalı həlləri',
        cmdType: 'showForm',
        formCode: 'hr_importCustom',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-cloud-download',
        displayOrder: 10
      },
      {
        desktopCode: 'arm_accImport',
        parentCode: 'accImportFolderSpecSA',
        code: 'accImport_employeeNumberCorrection',
        isFolder: 0,
        caption: 'Коригування Особових рахунків',
        caption_uk: 'Коригування Особових рахунків',
        caption_ru: 'Корректировка Личных счетов',
        caption_az: 'Şəxsi hesabların düzəlişi',
        cmdType: 'showForm',
        formCode: 'hr_employeeNumberCorrection',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-cloud-download',
        displayOrder: 15
      },
      {
        desktopCode: 'arm_accImport',
        parentCode: 'accImportFolderSpecSA',
        code: 'accImport_payImportNumber',
        isFolder: 0,
        caption: 'Заповнення табельних номерів',
        caption_uk: 'Заповнення табельних номерів',
        caption_ru: 'Заполнение табельных номеров',
        caption_az: 'Tabel nömrələrinin doldurulması',
        cmdType: 'showForm',
        formCode: 'hr_importNumber',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-cloud-download',
        displayOrder: 20
      },
      {
        desktopCode: 'arm_accImport',
        parentCode: 'accImportFolderSpecSA',
        code: 'accImport_payImportRaiseSalary',
        isFolder: 0,
        caption: 'Заповнення даних призначення',
        caption_uk: 'Заповнення даних призначення',
        caption_ru: 'Заполнение данных назначения',
        caption_az: 'İndeksləşdirmə üçün gəlir artımı məlumatlarının doldurulması',
        cmdType: 'showForm',
        formCode: 'hr_importRaiseSalary',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-cloud-download',
        displayOrder: 30
      },
      {
        desktopCode: 'arm_accImport',
        parentCode: 'accImportFolderSpecSA',
        code: 'accImport_empOrderCalcSpec',
        isFolder: 0,
        caption: 'Опрацювання наказів з персоналу',
        caption_uk: 'Опрацювання наказів з персоналу',
        caption_ru: 'Разработка приказов по персоналу',
        caption_az: 'İşçi heyəti üçün əmrlərin tamamlanması',
        cmdType: 'showForm',
        formCode: 'hr_empOrderForCalcSpec',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-cloud-download',
        displayOrder: 40
      },
      {
        desktopCode: 'arm_accImport',
        parentCode: 'accImportFolderSpecSA',
        code: 'accImport_detFormForRLAndSal',
        isFolder: 0,
        caption: 'Підготовка системи для роботи без міграції даних по ЗП',
        caption_uk: 'Підготовка системи для роботи без міграції даних по ЗП',
        caption_ru: 'Подготовка системы для работы без миграции данных по ЗП',
        caption_az: 'Sistemin ZP-yə uyğun olaraq məlumat miqrasiyası olmadan işləməyə hazırlanması',
        cmdType: 'showForm',
        formCode: 'hr_detFormForRLAndSal',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-cloud-download',
        displayOrder: 50
      }
    ]
  },
  {
    desktopCode: 'arm_accImport',
    code: 'accImportFolderExtrnl',
    isFolder: 1,
    caption: 'Інтеграція з зовнішніми системами',
    caption_uk: 'Інтеграція з зовнішніми системами',
    caption_ru: 'Интеграция с внешними системами',
    caption_az: 'Xarici sistemlərlə inteqrasiya',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-cloud-download',
    displayOrder: 30,
    items: [
      {
        desktopCode: 'arm_accImport',
        code: 'accImport_IntegrateMap',
        parentCode: 'accImportFolderExtrnl',
        isFolder: 0,
        caption: 'Таблиця відповідності',
        caption_uk: 'Таблиця відповідності',
        caption_ru: 'Таблица соответствия',
        caption_az: 'Yazışma masası',
        cmdType: 'showForm',
        formCode: 'hr_integrateMap',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fas fa-exchange-alt',
        displayOrder: 10
      },
      {
        desktopCode: 'arm_accImport',
        parentCode: 'accImportFolderExtrnl',
        code: 'accImport_SynchronizedData',
        isFolder: 0,
        caption: 'Інформація про синхронізовані дані',
        caption_uk: 'Інформація про синхронізовані дані',
        caption_ru: 'Информация о синхронизированных данных',
        caption_az: 'Інформація про синхронізовані дані',
        cmdType: 'showForm',
        formCode: 'hr_importSynchronizedData',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-cloud-download',
        displayOrder: 20
      }
    ]
  }
]
