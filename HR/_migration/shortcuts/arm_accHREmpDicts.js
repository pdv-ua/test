/* global $App */
module.exports = [
  {
    desktopCode: 'arm_accCfg',
    code: 'accHREmpFolderDictionary',
    isFolder: 1,
    caption: 'Довідники Персонал',
    caption_uk: 'Довідники Персонал',
    caption_ru: 'Справочники Персонал',
    caption_az: 'Maaş soraqçaları',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-folder',
    displayOrder: 800,
    items: [
      {
        desktopCode: 'arm_accHREmp',
        parentCode: 'accHREmpFolderDictionary',
        code: 'accHREmpFolderDictVacation',
        isFolder: 1,
        caption: 'Відпустки',
        caption_uk: 'Відпустки',
        caption_ru: 'Отпуска',
        caption_az: 'Məzuniyyətlər',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 100,
        items: [
          {
            desktopCode: 'arm_accHREmp',
            parentCode: 'accHREmpFolderDictVacation',
            code: 'accHREmp_dictVacationKind',
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
            displayOrder: 100
          },
          {
            desktopCode: 'arm_accHREmp',
            parentCode: 'accHREmpFolderDictVacation',
            code: 'accHREmp_dictVacationPlanDayList',
            isFolder: 0,
            caption: 'Дні відпустки за видами відпустки та типами посад',
            caption_uk: 'Дні відпустки за видами відпустки та типами посад',
            caption_ru: 'Дни отпуска по видам отпуска и типами должностей',
            caption_az: 'Vəzifə və məzuniyyət növlərinə görə mzəuniyyət günləri',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictVacationPlanDayList') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 200
          },
          {
            desktopCode: 'arm_accHREmp',
            parentCode: 'accHREmpFolderDictVacation',
            code: 'accHREmp_dictImpartibleVac',
            isFolder: 0,
            caption: 'Тривалість неподільних частин відпусток',
            caption_uk: 'Тривалість неподільних частин відпусток',
            caption_ru: 'Продолжительность неделимых частей отпусков',
            caption_az: 'Məzuniyyətin bölünməyən hissələrinin müddəti',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictImpartibleVac') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 300
          },
          {
            desktopCode: 'arm_accHREmp',
            parentCode: 'accHREmpFolderDictVacation',
            code: 'accHREmp_dictVacCompException',
            isFolder: 0,
            caption: 'Виключення при компенсації відпусток',
            caption_uk: 'Виключення при компенсації відпусток',
            caption_ru: 'Исключения при компенсации отпусков',
            caption_az: 'Məzuniyyət kompensasiyası istisnaları',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictVacCompException') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 400
          }
        ]
      },
      {
        desktopCode: 'arm_accHREmp',
        parentCode: 'accHREmpFolderDictionary',
        code: 'accHREmpFolderDictMilitary',
        isFolder: 1,
        caption: 'Військовий облік',
        caption_uk: 'Військовий облік',
        caption_ru: 'Воинский учет',
        caption_az: 'Hərbi qeydiyyat',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 200,
        items: [
          {
            desktopCode: 'arm_accHREmp',
            parentCode: 'accHREmpFolderDictMilitary',
            code: 'accHREmp_dictCategMilitary',
            isFolder: 0,
            caption: 'Категорії обліку військовозобов\'язаних',
            caption_uk: 'Категорії обліку військовозобов\'язаних',
            caption_ru: 'Категории учета военнообязанных',
            caption_az: 'Hərbi mükəlləfiyyətlərin qeydiyyat növləri',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictCategMilitary') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 10
          },
          {
            desktopCode: 'arm_accHREmp',
            parentCode: 'accHREmpFolderDictMilitary',
            code: 'accHREmp_dictStateMilitary',
            isFolder: 0,
            caption: 'Стани обліку військовозобов\'язаних',
            caption_uk: 'Стани обліку військовозобов\'язаних',
            caption_ru: 'Состояния учета военнообязанных',
            caption_az: 'Hərbi mükəlləfiyyətlilərin qeydiyyat vəziyyəti',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictStateMilitary') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 20
          },
          {
            desktopCode: 'arm_accHREmp',
            parentCode: 'accHREmpFolderDictMilitary',
            code: 'accHREmp_dictMilitaryRank',
            isFolder: 0,
            caption: 'Військові звання',
            caption_uk: 'Військові звання',
            caption_ru: 'Воинские звания',
            caption_az: 'Hərbi rütbələr',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictMilitaryRank') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 30
          },
          {
            desktopCode: 'arm_accHREmp',
            parentCode: 'accHREmpFolderDictMilitary',
            code: 'accHREmp_dictMilitarySpeciality',
            isFolder: 0,
            caption: 'Військово-облікові спеціальності',
            caption_uk: 'Військово-облікові спеціальності',
            caption_ru: 'Военно-учетные специальности',
            caption_az: 'Hərbi qeydiyyat ixtisasları',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictMilitarySpeciality') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 40
          },
          {
            desktopCode: 'arm_accHREmp',
            parentCode: 'accHREmpFolderDictMilitary',
            code: 'accHREmp_dictMilitarySuitable',
            isFolder: 0,
            caption: 'Придатність до військової служби',
            caption_uk: 'Придатність до військової служби',
            caption_ru: 'Категории годности к военной службе',
            caption_az: 'Hərbi xidmətə yaralılıq növləri',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictMilitarySuitable') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 50
          },
          {
            desktopCode: 'arm_accHREmp',
            parentCode: 'accHREmpFolderDictMilitary',
            code: 'accHREmp_dictMilitaryProfile',
            isFolder: 0,
            caption: 'Профілі підготовки офіцерів запасу',
            caption_uk: 'Профілі підготовки офіцерів запасу',
            caption_ru: 'Профили подготовки офицеров запаса',
            caption_az: 'Ehtiyatda olan zabitlərin təlim istiqamətləri',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictMilitaryProfile') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 60
          },
          {
            desktopCode: 'arm_accHREmp',
            parentCode: 'accHREmpFolderDictMilitary',
            code: 'accHREmp_dictMilitaryGroup',
            isFolder: 0,
            caption: 'Групи обліку військовозобов\'язаних',
            caption_uk: 'Групи обліку військовозобов\'язаних',
            caption_ru: 'Группы учета военнообязанных',
            caption_az: 'Hərbi mükəlləfiyyətlilərin qeydiyyat qrupları',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictMilitaryGroup') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 70
          },
          {
            desktopCode: 'arm_accHREmp',
            parentCode: 'accHREmpFolderDictMilitary',
            code: 'accHREmp_dictNomMilitaryRank',
            isFolder: 0,
            caption: 'Номенклатура військових звань',
            caption_uk: 'Номенклатура військових звань',
            caption_ru: 'Номенклатура военных званий',
            caption_az: 'Hərbi rütbələrin nomenklaturası',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictNomMilitaryRank') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 80
          },
          {
            desktopCode: 'arm_accHREmp',
            parentCode: 'accHREmpFolderDictMilitary',
            code: 'accHREmp_dictNomMilitaryRankKind',
            isFolder: 0,
            caption: 'Типи номенклатур військових звань',
            caption_uk: 'Типи номенклатур військових звань',
            caption_ru: 'Типы номенклатур военных званий',
            caption_az: 'Hərbi rütbələrin nomenklaturalarının növləri',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictNomMilitaryRankKind') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 90
          },
          {
            desktopCode: 'arm_accHREmp',
            parentCode: 'accHREmpFolderDictMilitary',
            code: 'accHREmp_dictTermMilitaryContract',
            isFolder: 0,
            caption: 'Термін контракту військової служби',
            caption_uk: 'Термін контракту військової служби',
            caption_ru: 'Срок контракта военной службы',
            caption_az: 'Hərbi xidmət müqaviləsinin müddəti',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictTermMilitaryContract') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 100
          }
        ]
      },
      {
        desktopCode: 'arm_accHREmp',
        parentCode: 'accHREmpFolderDictionary',
        code: 'accHREmpFolderDictSearch',
        isFolder: 1,
        caption: 'Пошук',
        caption_uk: 'Пошук',
        caption_ru: 'Поиск',
        caption_az: 'Axtarış',
        inWindow: 0,
        isCollapsed: 0,
        displayOrder: 300,
        items: [
          {
            desktopCode: 'arm_accHREmp',
            parentCode: 'accHREmpFolderDictSearch',
            code: 'accHREmp_empSearchTemplates',
            isFolder: 0,
            caption: 'Шаблони для пошуку працівників',
            caption_uk: 'Шаблони для пошуку працівників',
            caption_ru: 'Шаблоны для поиска работников',
            caption_az: 'Əməkdaş axtarışı üçün şablonlar',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_searchEmployeeTemplates') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 10
          },
          {
            desktopCode: 'arm_accHREmp',
            parentCode: 'accHREmpFolderDictSearch',
            code: 'accHREmp_personSearchTemplates',
            isFolder: 0,
            caption: 'Шаблони для пошуку осіб',
            caption_uk: 'Шаблони для пошуку осіб',
            caption_ru: 'Шаблоны для поиска физических лиц',
            caption_az: 'Şəxslərin axtarışı üçün şablonlar',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_searchPersonTemplates') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 20
          },
          {
            desktopCode: 'arm_accHREmp',
            parentCode: 'accHREmpFolderDictSearch',
            code: 'accHREmp_positionSearchTemplates',
            isFolder: 0,
            caption: 'Шаблони для пошуку посад',
            caption_uk: 'Шаблони для пошуку посад',
            caption_ru: 'Шаблоны для поиска по должности',
            caption_az: 'Vəzifə axtarışı üçün şablonlar',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_searchPositionTemplates') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 30
          }
        ]
      },
      {
        desktopCode: 'arm_accHREmp',
        parentCode: 'accHREmpFolderDictionary',
        code: 'accHREmpFolderDictEducation',
        isFolder: 1,
        caption: 'Освіта',
        caption_uk: 'Освіта',
        caption_ru: 'Образование',
        caption_az: 'Təhsil',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 400,
        items: [
          {
            desktopCode: 'arm_accHREmp',
            parentCode: 'accHREmpFolderDictEducation',
            code: 'accHREmp_dictEducationLevel',
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
            displayOrder: 100
          },
          {
            desktopCode: 'arm_accHREmp',
            parentCode: 'accHREmpFolderDictEducation',
            code: 'accHREmp_dictAcademStatus',
            isFolder: 0,
            caption: 'Вчені звання',
            caption_uk: 'Вчені звання',
            caption_ru: 'Ученые звания',
            caption_az: 'Elmi dərəcələr',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictAcademStatus') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 200
          },
          {
            desktopCode: 'arm_accHREmp',
            parentCode: 'accHREmpFolderDictEducation',
            code: 'accHREmp_dictBranchScience',
            isFolder: 0,
            caption: 'Галузі науки',
            caption_uk: 'Галузі науки',
            caption_ru: 'Области науки',
            caption_az: 'Elm sahələri',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictBranchScience') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 300
          },
          {
            desktopCode: 'arm_accHREmp',
            parentCode: 'accHREmpFolderDictEducation',
            code: 'accHREmp_specialty',
            isFolder: 0,
            caption: 'Спеціальності',
            caption_uk: 'Спеціальності',
            caption_ru: 'Специальности',
            caption_az: 'İxtisaslar',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_specialty') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 400
          },
          {
            desktopCode: 'arm_accHREmp',
            parentCode: 'accHREmpFolderDictEducation',
            code: 'accHREmp_dictLanguage',
            isFolder: 0,
            caption: 'Іноземні мови',
            caption_uk: 'Іноземні мови',
            caption_ru: 'Иностранные языки',
            caption_az: 'Xarici dillər',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictLanguage') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 500
          },
          {
            desktopCode: 'arm_accHREmp',
            parentCode: 'accHREmpFolderDictEducation',
            code: 'accHREmp_dictLanguageLevel',
            isFolder: 0,
            caption: 'Рівні володіння мовами',
            caption_uk: 'Рівні володіння мовами',
            caption_ru: 'Уровни владения языками',
            caption_az: 'Dil bilikləri səviyyəsi',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictLanguageLevel') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 600
          },
          {
            desktopCode: 'arm_accHREmp',
            parentCode: 'accHREmpFolderDictEducation',
            code: 'accHREmp_dictDegree',
            isFolder: 0,
            caption: 'Наукові ступені',
            caption_uk: 'Наукові ступені',
            caption_ru: 'Научные степени',
            caption_az: 'Elmi pillələr',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictDegree') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 700
          },
          {
            desktopCode: 'arm_accHREmp',
            parentCode: 'accHREmpFolderDictEducation',
            code: 'accHREmp_dictAreasOfEducation',
            isFolder: 0,
            caption: 'Напрями освіти',
            caption_uk: 'Напрями освіти',
            caption_ru: 'Направления образования',
            caption_az: 'Təhsil istiqamətləri',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictAreasOfEducation') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 800
          },
          {
            desktopCode: 'arm_accHREmp',
            parentCode: 'accHREmpFolderDictEducation',
            code: 'accHREmp_dictProfCompDevelopForm',
            isFolder: 0,
            caption: 'Форми підвищення рівня професійної компетентності',
            caption_uk: 'Форми підвищення рівня професійної компетентності',
            caption_ru: 'Формы повышения уровня профессиональной компетентности',
            caption_az: 'Peşəkar səriştə səviyyəsinin artırılması formaları',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictProfCompDevelopForm') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 900
          },
          {
            desktopCode: 'arm_accHREmp',
            parentCode: 'accHREmpFolderDictEducation',
            code: 'accHREmp_dictTrainingKind',
            isFolder: 0,
            caption: 'Вид професійної підготовки',
            caption_uk: 'Вид професійної підготовки',
            caption_ru: 'Вид профессиональной подготовки',
            caption_az: 'Peşə təhsili növü',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictTrainingKind') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 1000
          },
          {
            desktopCode: 'arm_accHREmp',
            parentCode: 'accHREmpFolderDictEducation',
            code: 'accHREmp_dictPublicationKind',
            isFolder: 0,
            caption: 'Вид публікації',
            caption_uk: 'Вид публікації',
            caption_ru: 'Вид публикации',
            caption_az: 'Nəşrin növü',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictPublicationKind') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 1100
          }
        ]
      },
      {
        desktopCode: 'arm_accHREmp',
        parentCode: 'accHREmpFolderDictionary',
        code: 'accHREmpFolderDictRecruiting',
        isFolder: 1,
        caption: 'Рекрутинг',
        caption_uk: 'Рекрутинг',
        caption_ru: 'Рекрутинг',
        caption_az: 'Рекрутинг(аз)',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 410,
        items: [
          {
            desktopCode: 'arm_accHREmp',
            parentCode: 'accHREmpFolderDictRecruiting',
            code: 'accHREmp_dictTypeOfEmployment',
            isFolder: 0,
            caption: 'Вид найму',
            caption_uk: 'Вид найму',
            caption_ru: 'Вид найма',
            caption_az: 'Вид найму (az)',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () {
                $App.runShortcutCommand('hr_dictTypeOfEmployment')
              }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 1050
          },
          {
            desktopCode: 'arm_accHREmp',
            parentCode: 'accHREmpFolderDictRecruiting',
            code: 'accHREmp_dictTypeOfSourceOfEmployment',
            isFolder: 0,
            caption: 'Вид джерела найму',
            caption_uk: 'Вид джерела найму',
            caption_ru: 'Вид источника найма',
            caption_az: 'Вид джерела найму (az)',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictTypeOfSourceOfEmployment') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 1090
          }
        ]
      },
      {
        desktopCode: 'arm_accHREmp',
        parentCode: 'accHREmpFolderDictionary',
        code: 'accHREmpFolderDictBonus',
        isFolder: 1,
        caption: 'Дисциплінарна практика',
        caption_uk: 'Дисциплінарна практика',
        caption_ru: 'Дисциплинарная практика',
        caption_az: 'İntizam təcrübəsi',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 500,
        items: [
          {
            desktopCode: 'arm_accHREmp',
            parentCode: 'accHREmpFolderDictBonus',
            code: 'accHREmp_dictBonusKind',
            isFolder: 0,
            caption: 'Види нагород',
            caption_uk: 'Види нагород',
            caption_ru: 'Виды наград',
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
            desktopCode: 'arm_accHREmp',
            parentCode: 'accHREmpFolderDictBonus',
            code: 'accHREmp_dictBonusType',
            isFolder: 0,
            caption: 'Типи нагород',
            caption_uk: 'Типи нагород',
            caption_ru: 'Типы наград',
            caption_az: 'Mükafat alt növləri',
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
            desktopCode: 'arm_accHREmp',
            parentCode: 'accHREmpFolderDictBonus',
            code: 'accHREmp_dictBonus',
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
            desktopCode: 'arm_accHREmp',
            parentCode: 'accHREmpFolderDictBonus',
            code: 'accHREmp_dictPenalty',
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
            desktopCode: 'arm_accHREmp',
            parentCode: 'accHREmpFolderDictBonus',
            code: 'accHREmp_dictPenaltyReason',
            isFolder: 0,
            caption: 'Причини стягнення',
            caption_uk: 'Причини стягнення',
            caption_ru: 'Причины взыскания',
            caption_az: 'Məsuliyyətə cəlb olunma səbəbləri',
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
        desktopCode: 'arm_accHREmp',
        parentCode: 'accHREmpFolderDictionary',
        code: 'accHREmpFolderDictAnother',
        isFolder: 1,
        caption: 'Інше',
        caption_uk: 'Інше',
        caption_ru: 'Прочее',
        caption_az: 'Digər',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 600,
        items: [
          {
            desktopCode: 'arm_accHREmp',
            parentCode: 'accHREmpFolderDictAnother',
            code: 'accHREmp_dictNameCase',
            isFolder: 0,
            caption: 'Налаштування відмінків',
            caption_uk: 'Налаштування відмінків',
            caption_ru: 'Настройка падежей',
            caption_az: 'Halların tənzimlənməsi',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictNameCase') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 100
          },
          {
            desktopCode: 'arm_accHREmp',
            parentCode: 'accHREmpFolderDictAnother',
            code: 'accHREmp_dictTaskScore',
            isFolder: 0,
            caption: 'Бали за завдання',
            caption_uk: 'Бали за завдання',
            caption_ru: 'Баллы за задание',
            caption_az: 'Tapşırıq üzrə qiymətlər',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictTaskScore') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 100
          },
          {
            desktopCode: 'arm_accHREmp',
            parentCode: 'accHREmpFolderDictAnother',
            code: 'accHREmp_Assets',
            isFolder: 0,
            caption: 'Майно організації',
            caption_uk: 'Майно організації',
            caption_ru: 'Майно організації',
            caption_az: 'Майно організації',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_Assets') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 100
          },
          {
            desktopCode: 'arm_accHREmp',
            parentCode: 'accHREmpFolderDictAnother',
            code: 'accHREmp_dictCheckMedical',
            isFolder: 0,
            caption: 'Тип медогляду',
            caption_uk: 'Тип медогляду',
            caption_ru: 'Тип медосмотра',
            caption_az: 'Tibbi müayinənin növü',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictCheckMedical') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 110
          },
          {
            desktopCode: 'arm_accHREmp',
            parentCode: 'accHREmpFolderDictAnother',
            code: 'accHREmp_dictResultMedical',
            isFolder: 0,
            caption: 'Результати медогляду',
            caption_uk: 'Результати медогляду',
            caption_ru: 'Результаты медосмотра',
            caption_az: 'Tibbi müayinənin nəticələri',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictResultMedical') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 120
          },
          {
            desktopCode: 'arm_accHREmp',
            parentCode: 'accHREmpFolderDictAnother',
            code: 'accHREmp_dictAddInfKind',
            isFolder: 0,
            caption: 'Види додаткової інформації',
            caption_uk: 'Види додаткової інформації',
            caption_ru: 'Виды дополнительной информации',
            caption_az: 'Əlavə məlumat növləri',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictAddInfKind') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 200
          },
          {
            desktopCode: 'arm_accHREmp',
            parentCode: 'accHREmpFolderDictAnother',
            code: 'accHREmp_dictDisabilityType',
            isFolder: 0,
            caption: 'Види інвалідності',
            caption_uk: 'Види інвалідності',
            caption_ru: 'Виды инвалидности',
            caption_az: 'Əlillik növləri',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictDisabilityType') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 300
          },
          {
            desktopCode: 'arm_accHREmp',
            parentCode: 'accHREmpFolderDictAnother',
            code: 'accHREmp_dictBenefitsKind',
            isFolder: 0,
            caption: 'Види пільг',
            caption_uk: 'Види пільг',
            caption_ru: 'Виды льгот',
            caption_az: 'İmtiyaz növləri',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictBenefitsKind') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 400
          },
          {
            desktopCode: 'arm_accHREmp',
            parentCode: 'accHREmpFolderDictAnother',
            code: 'accHREmp_dictExperience',
            isFolder: 0,
            caption: 'Стаж роботи',
            caption_uk: 'Стаж роботи',
            caption_ru: 'Стаж работы',
            caption_az: 'İş stajı',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictExperience') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 500
          },
          {
            desktopCode: 'arm_accHREmp',
            parentCode: 'accHREmpFolderDictAnother',
            code: 'accHREmp_dictExperienceByPos',
            isFolder: 0,
            caption: 'Стаж за типами посад',
            caption_uk: 'Стаж за типами посад',
            caption_ru: 'Стаж по типам должностей',
            caption_az: 'Vəzifə növləri üzrə staj',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictExperienceByPos') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 500
          },
          {
            desktopCode: 'arm_accHREmp',
            parentCode: 'accHREmpFolderDictAnother',
            code: 'accHREmp_dictDocKind',
            isFolder: 0,
            caption: 'Види документів',
            caption_uk: 'Види документів',
            caption_ru: 'Виды документов',
            caption_az: 'Sənəd növləri',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('ac_dictDocKind') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 500
          },
          {
            desktopCode: 'arm_accHREmp',
            parentCode: 'accHREmpFolderDictAnother',
            code: 'accHREmp_dictCompetency',
            isFolder: 0,
            caption: 'Компетенції',
            caption_uk: 'Компетенції',
            caption_ru: 'Компетенции',
            caption_az: 'Bacarıqlar',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictCompetency') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 600
          },
          {
            desktopCode: 'arm_accHREmp',
            parentCode: 'accHREmpFolderDictAnother',
            code: 'accHREmp_dictCauseOfDeath',
            isFolder: 0,
            caption: 'Причини смерті',
            caption_uk: 'Причини смерті',
            caption_ru: 'Причины смерти',
            caption_az: 'Ölüm səbəbləri',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictCauseOfDeath') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 700
          },
          {
            desktopCode: 'arm_accHREmp',
            parentCode: 'accHREmpFolderDictAnother',
            code: 'accHREmp_dictKinshipKind',
            isFolder: 0,
            caption: 'Ступені споріднення',
            caption_uk: 'Ступені споріднення',
            caption_ru: 'Степени родства',
            caption_az: 'Qohumluq dərəcələri',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictKinshipKind') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 800
          },
          {
            desktopCode: 'arm_accHREmp',
            parentCode: 'accHREmpFolderDictAnother',
            code: 'accHREmp_dictPensionType',
            isFolder: 0,
            caption: 'Типи пенсії',
            caption_uk: 'Типи пенсії',
            caption_ru: 'Типы пенсии',
            caption_az: 'Təqaüd növləri',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictPensionType') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 900
          },
          {
            desktopCode: 'arm_accHREmp',
            parentCode: 'accHREmpFolderDictAnother',
            code: 'accHREmp_contacttype',
            isFolder: 0,
            caption: 'Типи контактів',
            caption_uk: 'Типи контактів',
            caption_ru: 'Типы контактов',
            caption_az: 'Təqaüd növləri',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('cdn_contacttype') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 900
          },
          {
            desktopCode: 'arm_accHREmp',
            parentCode: 'accHREmpFolderDictAnother',
            code: 'accHREmp_dictCategAssets',
            isFolder: 0,
            caption: 'Категорії майна',
            caption_uk: 'Категорії майна',
            caption_ru: 'Категории имущества',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictCategAssets') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 900
          },
          {
            desktopCode: 'arm_accHREmp',
            parentCode: 'accHREmpFolderDictAnother',
            code: 'accHREmp_dictPensionAge',
            isFolder: 0,
            caption: 'Вік виходу на пенсію',
            caption_uk: 'Вік виходу на пенсію',
            caption_ru: 'Возраст выхода на пенсию',
            caption_az: 'Təqaüdə çıxma yaşı',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictPensionAge') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 950
          },
          {
            desktopCode: 'arm_accHREmp',
            parentCode: 'accHREmpFolderDictAnother',
            code: 'accTim_dictTimeGroup',
            isFolder: 0,
            caption: 'Групи елементів обліку робочого часу',
            caption_uk: 'Групи елементів обліку робочого часу',
            caption_ru: 'Группы элементов учета рабочего времени',
            caption_az: 'İş vaxtı qeydiyyatının elementləri qrupları',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictTimeGroup') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 1000
          },
          {
            desktopCode: 'arm_accHREmp',
            parentCode: 'accHREmpFolderDictAnother',
            code: 'accHR_addDescrPerson',
            isFolder: 0,
            caption: 'Складові додаткової інформації працівника',
            caption_uk: 'Складові додаткової інформації працівника',
            caption_ru: 'Составляющие дополнительной информации работника',
            caption_az: 'Əlavə işçi məlumatının komponentləri',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_addDescrPerson') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 1050
          },
          {
            desktopCode: 'arm_accHREmp',
            parentCode: 'accHREmpFolderDictAnother',
            code: 'accHREmp_dictTypeAsset',
            isFolder: 0,
            caption: 'Вид майна',
            caption_uk: 'Вид майна',
            caption_ru: 'Вид майна',
            caption_az: 'Вид майна (az)',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictTypeAsset') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 1050
          },
          {
            desktopCode: 'arm_accHREmp',
            parentCode: 'accHREmpFolderDictAnother',
            code: 'accHREmp_dictGroupAssets',
            isFolder: 0,
            caption: 'Група майна',
            caption_uk: 'Група майна',
            caption_ru: 'Группа имущества',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictGroupAssets') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 1050
          },
          {
            desktopCode: 'arm_accHREmp',
            parentCode: 'accHREmpFolderDictAnother',
            code: 'accHREmp_trans_vehicle',
            isFolder: 0,
            caption: 'Транспортні засоби організації',
            caption_uk: 'Транспортні засоби організації',
            caption_ru: 'Транспортные средства организации',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('dc_trans_vehicle') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 1055
          },
          {
            desktopCode: 'arm_accHREmp',
            parentCode: 'accHREmpFolderDictAnother',
            code: 'accHREmp_dictSpecialRank',
            isFolder: 0,
            caption: 'Спеціальне звання',
            caption_uk: 'Спеціальне звання',
            caption_ru: 'Специальное звание',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictSpecialRank') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 1060
          },
          {
            desktopCode: 'arm_accHREmp',
            parentCode: 'accHREmpFolderDictAnother',
            code: 'accHREmp_dictRankReason',
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
            displayOrder: 1065
          },
          {
            desktopCode: 'arm_accHREmp',
            parentCode: 'accHREmpFolderDictAnother',
            code: 'accHREmp_dictRank',
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
            displayOrder: 1070
          },
          {
            desktopCode: 'arm_accHREmp',
            parentCode: 'accHREmpFolderDictAnother',
            code: 'accHREmp_dictRankPsCategory',
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
            displayOrder: 1075
          }
        ]
      },
      {
        desktopCode: 'arm_accHREmp',
        parentCode: 'accHREmpFolderDictionary',
        code: 'accHREmpFolderDictAudit',
        isFolder: 1,
        caption: 'Перевірки',
        caption_uk: 'Перевірки',
        caption_ru: 'Проверки',
        caption_az: 'Yoxlamalar',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 700,
        items: [
          {
            desktopCode: 'arm_accHREmp',
            parentCode: 'accHREmpFolderDictAudit',
            code: 'accHREmp_outgoingFalseFact',
            isFolder: 0,
            caption: 'Факти подання неправдивої інформації',
            caption_uk: 'Факти подання неправдивої інформації',
            caption_ru: 'Факты представления недостоверной информации',
            caption_az: 'Yanlış məlumatların təqdim edilməsi faktları',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_outgoingFalseFact') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 100
          },
          {
            desktopCode: 'arm_accHREmp',
            parentCode: 'accHREmpFolderDictAudit',
            code: 'accHREmp_dictAuditOrg',
            isFolder: 0,
            caption: 'Організації спецперевірок',
            caption_uk: 'Організації спецперевірок',
            caption_ru: 'Организации спецпроверок',
            caption_az: 'Xüsusi yoxlama təşkilatı',
            cmdCode: {
              cmdType: 'showForm',
              formCode: function () { $App.runShortcutCommand('hr_dictAuditOrg') }
            },
            inWindow: 0,
            isCollapsed: 0,
            iconCls: '',
            displayOrder: 200
          }
        ]
      }
    ]
  }
]
