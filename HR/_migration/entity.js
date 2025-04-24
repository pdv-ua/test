/* UB $App */
module.exports = [
  {
    entity: 'ac_constant',
    identifier: 'code',
    notDelete: true,
    localeAttr: ['comment'],
    attrs: ['code', 'constantGroup', 'type', 'entityName', 'eGroup', 'generalSettings', 'orgSettings', 'empSettings', 'comment'],
    items: [
      ['checkReason', 'empOrder', 'BOOL', null, null, 1, 1, 0, 'Якщо значення константи дорівнює «Так», то при оформленні проєкту наказу буде відбуватись перевірка, чи поле "Підстава" заповнене для даного наказу'],
      ['country', 'general', 'ENTITY', 'cdn_country', null, 1, 0, 0, null],
      ['useCEP', 'empOrder', 'BOOL', null, null, 0, 1, 0, 'Якщо значення дорівнює «Так», то для візування документів користувачі обраної організації обов’язково повинні використовувати КЕП'],
      ['cachingPrivateKey', 'general', 'BOOL', null, null, 0, 1, 0, 'Якщо значення дорівнює «Так», то в процесі підписання документів КЕП користувачами обраної організації Система в межах сесії буде автоматично використовувати файл особистого ключа КЕП та пароль, який був використаний при попередньому підписанні'],
      ['quantityPosition', 'staffOrder', 'INT', null, null, 1, 1, 0, 'Значення константи визначає яке максимальне значення може бути вказано в кількості посад штатного розпису'],
      ['allowDelBusyPositions', 'staffOrder', 'BOOL', null, null, 0, 1, 0, 'Якщо значення дорівнює «Так», то користувачам обраної організації надається можливість в штатному розписі ліквідовувати посади, на які призначені працівники'],
      ['posContestResultUrl', 'integration', 'STRING', null, null, 1, 0, 0, null],
      ['posContestResultState', 'integration', 'ENUM', null, 'HR_STATE_CONTEST', 1, 0, 0, null],
      ['allowDoPosting', 'staffOrder', 'BOOL', null, null, 1, 1, 0, 'Якщо значення дорівнює «Ні», то провести наказ, при даті наказу більшої за поточну дату, користувачам обраної організації стає неможливим'],
      ['needSignedStatement', 'cab', 'BOOL', null, null, 0, 1, 0, 'Якщо значення дорівнює «Так», то для підписання заяв працівника в підсистемі «Особистий кабінет» користувачі обраної організації обов’язково повинні використовувати КЕП'],
      ['employeePayrollTemplates', 'payRoll', 'BOOL', null, null, 1, 1, 0, null],
      ['denyAutoRecOfApp', 'cab', 'BOOL', null, null, 0, 1, 0, 'Якщо значення дорівнює «Так», то заява працівника з "Особистого кабінету" після відправлення одразу спрямовується на візування або підписання працівникам по маршруту погодження заяви зі станом "У роботі". Якщо значення дорівнює «Ні», то заява потрапляє у реєстр «Заяви (на попередню обробку)», який доступний користувачу, якому надано групу ролей "Відповідальний за обробку заяв з особистого кабінету".'],
      ['publicPortalURL', 'integration', 'STRING', null, null, 0, 1, 0, null],
      ['privateCabinetURL', 'cab', 'STRING', null, null, 1, 0, 0, 'Посилання на сайт особистого кабінету'],
      ['onlyOwnerCanEditEmployee', 'hrPayGen', 'BOOL', null, null, 1, 0, 0, 'Якщо значення константи дорівнює «Так», то редагувати Картку Особи мають змогу лише користувачі організації, в якій працівник має діюче призначення'],
      ['manualAccessStaffRequest', 'hrPayGen', 'BOOL', null, null, 0, 1, 0, 'Якщо значення дорівнює «Так», то по «Запитам до інформації за Працівником» до обраної організації-власника даних інформація надаватися автоматично не буде. Для таких запитів необхідно використовувати функціонал погодження запитів, який реалізований в інтерфейсній формі «Запит на доступ інформації за Працівником».'],
      ['hrExportCfgExportPhoto', 'integration', 'BOOL', null, null, 1, 0, 0, 'Якщо значення константи дорівнює «Так», то на сайт Публічного порталу завантажується фото працівника з Системи'],
      ['hrExportCfgExportEmployee', 'integration', 'BOOL', null, null, 1, 0, 0, 'Якщо значення константи дорівнює «Так», то на сайт Публічного порталу завантажуються відкриті дані працівника з Системи'],
      ['hrExportCfgSiteName', 'integration', 'STRING', null, null, 1, 0, 0, null],
      ['hrExportCfgConnect', 'integration', 'STRING', null, null, 1, 0, 0, 'Посилання на сайт Публічного порталу для завантаження даних з Системи'],
      ['hrExportCfgFillPublicTotals', 'integration', 'BOOL', null, null, 1, 0, 0, 'Якщо значення константи дорівнює «Так», то при формуванні файлів Json "publicTotals.json" потрібно виконувати перерахунок даних'],
      ['hrExportCfgUntransferedPosTypes', 'integration', 'STRING', null, null, 1, 0, 0, null],
      ['hrExportPayRollToAccounting', 'payRoll', 'BOOL', null, null, 1, 1, 0, null],
      ['hrDefaultPositionType', 'staffOrder', 'ENUM', null, 'HR_POSITION_TYPE', 0, 1, 0, 'При створенні посади заповнювати за замовчуванням атрибут "Тип посади" значенням з константи'],
      ['hrOrderAccrualByStaffTable', 'empOrder', 'BOOL', null, null, 0, 1, 0, 'Якщо значення дорівнює «Так», то в друкованій формі наказу про призначення виводити суму окладу згідно зі штатним розписом'],
      ['hrFuncOrgType', 'hrPayGen', 'ENUM', null, 'HR_FUNCORG_TYPE', 0, 1, 0, 'Якщо значення константи дорівнює "Державна служба", то при створенні посади відображати блок атрибутів щодо держслужби та розділ держслужби в картці працівника та особи. Якщо значення константи дорівнює "Загальна", то при створенні посади відображати блок атрибутів щодо бюджету. Інші значення - не відображати блок атрибутів.'],
      ['hrEmpOrderMoveRank', 'empOrder', 'BOOL', null, null, 0, 1, 0, 'Якщо значення дорівнює «Так», то в друкованій формі наказу про переведення виводити інформацію про ранг працівника'],
      ['hrEmpOrderMoveAbsentArticle', 'empOrder', 'BOOL', null, null, 0, 1, 0, 'Якщо значення дорівнює «Так», то в друкованій формі наказу про переведення працівника, що знаходиться у довготривалій відпустці та наказу про надання довготривалої відпустки виводити інформацію про статтю, згідно з якою працівнику надано відпустку'],
      ['hrWriteAllPosToWorkBook', 'empOrder', 'BOOL', null, null, 1, 0, 0, 'Якщо значення константи дорівнює «Ні», то в трудову книжку працівника не записуються записи про призначення на посади за внутрішнім сумісництвом при проведенні наказів.'],
      ['hrRoundAccrualStaffTable', 'staffOrder', 'ENUM', null, 'HR_STAFF_TABLE_ROUND', 0, 1, 0, 'Якщо значення константи дорівнює "До копійок", то у звітах штатного розпису обраної організації оклади працівників та суми підсумків округлюються до копійок, інакше - до гривні'],
      ['hrTotalsOnlyIndepStructUnit', 'staffOrder', 'BOOL', null, null, 0, 1, 0, 'Якщо значення дорівнює «Так», то в звітах штатного розпису обраної організації строки підсумків виводяться тільки для самостійних підрозділів'],
      ['hrStaffUnitQuantityRound', 'staffOrder', 'ENUM', null, 'HR_QUANTITY_ROUND', 0, 1, 0, 'Значення константи визначає як буде виконуватися округлення кількості ставок Штатного розпису. Рекомендовано використовувати значення "Значимі значення".'],
      ['hrEmpOrderVacationValidator', 'empOrder', 'BOOL', null, null, 1, 0, 0, 'Якщо значення константи дорівнює «Так», то при виконанні операцій щодо відпусток виконуються перевірки на коректність цієї операції'],
      ['hrMinReCalcDate', 'payRoll', 'DATE', null, null, 1, 1, 0, null],
      ['hrResponsAbbr', 'empOrder', 'STRING', null, null, 0, 1, 0, 'Значення константи використовується в друкованих формах наказів для зазначення посади підписанта наказів, які є виконуючими обов\'язків по іншій посаді.'],
      ['hrAutoSetRecalcDate', 'payRoll', 'BOOL', null, null, 1, 1, 0, null],
      ['hrLinkToBuh', 'payRoll', 'BOOL', null, null, 1, 1, 0, null],
      ['hrIgnoreDoublePosNameCases', 'staffOrder', 'BOOL', null, null, 0, 1, 0, 'Якщо значення дорівнює «Так», то при створенні посади або при оновленні відмінків посади формувати назву штатної позиції та відмінки здвоєних посад за визначеним алгоритмом. Якщо значення дорівнює «Ні», то відмінювати посади звичайним чином.'],
      ['hrDaysBeforeRestorePosition', 'empOrder', 'INT', null, null, 1, 0, 0, 'Значення константи визначає кількість днів до запланованої дати зміни тимчасового призначення, яке повинен змінити Шедулер'],
      ['hrAllowChangeByMigration', 'general', 'BOOL', null, null, 1, 0, 0, 'Якщо значення константи дорівнює «Так», то при завантаженні з файлу (працівники) даних сутності "Стаж роботи" на інтерфейсі присутній чек-бокс "Змінювати завантажені раніше". Якщо значення константи дорівнює «Ні», то ознака "Змінювати завантажені раніше" відсутня на інтерфейсі та, відповідно, при завантажені дані додаються до раніше завантажених даних сутності "Стаж роботи".'],
      ['hrAutoSetDepIdxNum', 'staffOrder', 'BOOL', null, null, 0, 1, 0, 'Якщо значення дорівнює «Так», то при додаванні нового підрозділу поле "Номер за порядком" автозаповнюється значенням з поля "Код" та є доступним для редагування. Якщо значення дорівнює «Ні», то при додаванні нового підрозділу поле "Номер за порядком" також автозаповнюється значенням з поля "Код" та є недоступним для редагування. При обох значеннях константи поле "Номер за порядком" доступне для редагування через меню "Всі дії. Редагування".'],
      ['hrStaffAgreedOrg', 'empOrder', 'ENTITY', 'hr_organization', null, 0, 1, 0, 'Якщо обрана організація, то в звітах Планування штатного розпису в лівому верхньому кутку виводиться назва обраної організації в блоці ПОГОДЖЕНО. Якщо така константа не встановлена, то в блоці ПОГОДЖЕНО виводиться пустий підкреслений рядок.'],
      ['hrStaffChangesMtCountSum', 'empOrder', 'BOOL', null, null, 0, 1, 0, 'Якщо значення константи дорівнює «Так», то в звіті "Перелік змін" при зміні значення атрибуту "Кількість посад" у таблицю переліку змін така посада виводиться тільки один раз. Якщо різниця при редагуванні значення кількості ставок < 0, то рядок з посадою виводити тільки в блоці "Виводиться з штатного розпису", якщо різниця > 0, то рядок з посадою виводити тільки в блоці "Вводиться до штатного розпису". Якщо значення константи дорівнює «Ні», то при зміні значення "Кількість посад" формувати в звіті рядок і в блоці "Виводиться з штатного розпису", і в блоці "Вводиться до штатного розпису".'],
      ['hrOrderTabNum', 'empOrder', 'BOOL', null, null, 0, 1, 0, 'Якщо значення константи дорівнює «Так», то в друкованих формах наказів про відпустки після ПІБ працівника виводиться його табельний номер. Якщо значення константи дорівнює «Ні» або константа відсутня, то в друкованих формах наказів про відпустки не виводиться табельний номер працівника.'],
      ['hrOrderVacEmpGroup', 'empOrder', 'BOOL', null, null, 0, 1, 0, 'Якщо значення константи дорівнює «Так», то формувати друковану форму наказу із групуванням за Працівниками, у яких в Наказі є декілька пунктів з однаковими параметрами'],
      ['hrEmpVacationSchedulerPrevYears', 'hrPayGen', 'INT', null, null, 0, 1, 0, 'Значення константи дорівнює кількості років, яка віднімається від дати 01.01.поточний рік, для визначення початку проміжку часу, що аналізує Шедулер для визначення періодів прав на відпустки, які необхідно додати працівнику. Якщо ця константа вказана, то період пошуку попередніх періодів прав на відпустки починається з дати 01.01.поточний рік мінус вказана кількість років. Якщо не встановлена, то період пошуку починається з поточної дати.'],
      ['hrEmpVacationSchedulerWeeksToEnd', 'hrPayGen', 'INT', null, null, 0, 1, 0, 'Значення константи дорівнює кількості тижнів, яка додається до поточної дати для визначення кінця проміжку часу, що аналізує Шедулер для визначення періодів прав на відпустки, які необхідно додати працівнику. Якщо ця константа вказана, то період пошуку попередніх періодів прав на відпустки закінчується поточною датою плюс вказана кількість тижнів. Якщо не встановлена, то період пошуку закінчується поточною датою плюс один місяць.'],
      ['hrCheckPayElActing', 'empOrder', 'BOOL', null, null, 0, 1, 0, 'Якщо значення константи дорівнює «Так», то Система виконує перевірку про наявність виду оплати за ТВО та за результатами перевірки може виводити повідомлення про помилку. Якщо значення константи дорівнює «Ні» або константа відсутня, то перевірка не виконується.'],
      ['hrDefaultCategoryECBID', 'empOrder', 'ENTITY', 'hr_dictCategoryECB', null, 1, 0, 0, 'При створенні наказів про призначення якщо встановлена ця константа, то заповнювати в наказі поле "Категорія застрахованної особи" значенням констнти. Якщо константа не встановленна, то не заповнювати поле "Категорія застрахованої посади" в наказах про призначення.'],
      ['hrCheckNoPublServ', 'hrPayGen', 'BOOL', null, null, 0, 1, 0, 'Якщо значення константи дорівнює «Так», то при додаванні відпустки за стаж державної служби або періоду відпустки за стаж державної служби працівнику з типом посади не Держслужбовець, не відображати повідомлення: "Працівник не є держслужбовцем". Якщо значення константи дорівнює «Ні» або константа відсутня, то перевірка чи є працівник держслужбовцем виконується.'],
      ['hrOrgBusinessType', 'general', 'ENTITY', 'cdn_orgbusinesstype', null, 0, 1, 0, null],
      ['hrStaffReportMainDepInBold', 'staffOrder', 'BOOL', null, null, 0, 1, 0, 'Структура. Виділяти у звітах управління у складі напівжирним шрифтом'],
      ['hrUseStaffingTable', 'payRoll', 'BOOL', null, null, 1, 1, 0, null],
      ['hrOrderShowTaxCode', 'empOrder', 'BOOL', null, null, 0, 1, 0, 'Якщо значення константи дорівнює "Так", то друкованих формах наказах буде відображатись ідентифікаційний номер'],
      ['hrOrderBonusRoundSum', 'empOrder', 'BOOL', null, null, 0, 1, 0, 'Округлювати суму до гривні в наказах про премії'],
      ['hrStaffTableDisallowLinkToPos', 'staffOrder', 'BOOL', null, null, 1, 0, 0, 'Якщо значення дорівнює «Так», то при плануванні штатних розписів у полі "Підпорядкування" не дозволяти вибирати посади'],
      ['hrOrderVacExpWithoutPeriod', 'empOrder', 'BOOL', null, null, 0, 1, 0, 'Якщо значення константи дорівнює «Так», то в друкованих формах наказів про відпустки будуть виведені тільки роки стажу (без періодів). Якщо значення константи дорівнює «Ні», або константа не внесена, то в друкованих формах наказів про відпустки будуть виведені тільки періоди відпустки, коли надавалася відпустка.'],
      ['hrUseSingleEmployeeTabNum', 'empOrder', 'BOOL', null, null, 0, 1, 0, 'Якщо значення константи дорівнює «Так», то при призначенні працівника табельний номер буде присвоюватись однаковим для всіх призначень працівника (із додатковою нумерацією для різних призначень працівника). Приклад: 7777.1, 7777.2'],
      ['hrTariffingEducational', 'payRoll', 'BOOL', null, null, 1, 1, 0, 'У особових рахунках працівників відображається розділ "Тарифікація". Розрахунок зарплати виконується з урахуванням документів тарифікації.'],
      ['hrProgClassAcc', 'payRoll', 'BOOL', null, null, 1, 1, 0, 'Розподіл зарплати за КПК'],
      ['hrKPI', 'payRoll', 'BOOL', null, null, 1, 1, 0, 'У особових рахунках працівників відображається розділ "KPI". Розрахунок премії може виконуватись з використанням KPI працівника.'],
      ['hrOrderHourDefWorkSchedule', 'empOrder', 'ENTITY', 'hr_workSchedule', null, 0, 1, 0, 'У пункті наказу "Призначення погодинно" буде використовуватись зазначений графік. Якщо ця константа не зазначена, то за замовчанням буде встановлюватись: а) Графік роботи зазначений на  посаді; б) якщо на посаді не зазначений Графік роботи, то поле на наказі автозаповниться Графіком роботи, встановленим у налаштуваннях "Заповнення атрибутів за типом посади (по замовченню)".'],
      ['hrStaffCatByPosition', 'payRoll', 'BOOL', null, null, 1, 1, 0, 'Категорія персоналу у особових рахунках працівників визначається типом посади. Поле "Категорія песоналу" у особових рахунках приховується.'],
      ['hrAutoSetAccrualByScheme', 'staffOrder', 'BOOL', null, null, 0, 1, 0, null],
      ['hrSalarySchemeType', 'staffOrder', 'ENUM', null, 'HR_SALARY_SHEME_TYPE', 0, 1, 0, 'Якщо значення константи дорівнює "за коефіцієнтами", то в Схемі посадових окладів використовуються коефіцієнти для розрахунку окладів від базової суми. Якщо вибрано "без коефіцієнтів", то в Схемі посадових окладів вказуються суми окладів.'],
      ['hrAskStaffTableEntryDate', 'staffOrder', 'BOOL', null, null, 0, 1, 0, null],
      ['setBountyHelpVacationPeriod', 'empOrder', 'BOOL', null, null, 0, 1, 0, null],
      ['hrSearchOrgMode', 'staffOrder', 'ENUM', null, 'HR_SEARCH_ORGMODE', 1, 0, 0, 'Режим пошуку по організаціям'],
      ['hrPrintToBlank', 'hrPayGen', 'BOOL', null, null, 0, 1, 0, 'Якщо значення константи дорівнює «Так», то при друку довідки з місця роботи не буде виводиться шапка (герб, назва організації)'],
      ['hrAllowSameTabNum', 'empOrder', 'BOOL', null, null, 0, 1, 0, null],
      ['hrStaffReportNamePosition', 'staffOrder', 'BOOL', null, null, 0, 1, 0, 'Якщо значення константи дорівнює «Так», то формування штатного розпису буде по штатній позиції, інакше по довіднику посад'],
      ['hrTwoSignatoriesInOrders', 'empOrder', 'BOOL', null, null, 0, 1, 0, 'Два підписанта у наказах'],
      ['hrStaffReportShowAccrual', 'staffOrder', 'BOOL', null, null, 0, 1, 0, 'Якщо значення константи дорівнює «Так», то в штатному розписі буде виводитись інформація про нарахування на посадах'],
      ['hrCopyNamesFromSource', 'staffOrder', 'BOOL', null, null, 0, 1, 0, 'Якщо значення дорівнює "так", то при редагуванні посад у Штатному розписі, будуть оновлюватись назви посад та їх відмінки, тільки при редагуванні поля "Довідник посад" або при створенні нових посад інакше автооновлення буде відбуватись при будь-якій події редагування посади'],
      ['hrDocInfoForOrgstruct', 'staffOrder', 'STRING', null, null, 0, 1, 0, 'Назва документа, яка буде виводитися у шапці зведеного штатного розпису'],
      ['hrShowOtherOrgsTabNums', 'hrPayGen', 'BOOL', null, null, 0, 1, 0, 'Відображати в особових рахунках табельні номери з інших організацій'],
      ['hrFundSourceAccounting', 'hrPayGen', 'ENUM', null, 'HR_FUND_SOURCE_ACC', 1, 1, 0, null],
      ['hrCertificationObligAttrs', 'empOrder', 'ENUM', null, 'HR_CERTIFICATION_OBLIG_ATTRS', 0, 1, 0, 'Присвоєння кваліфікації. Обов`язковість полів.'],
      ['hrTwoApproverInStaffTable', 'staffOrder', 'BOOL', null, null, 0, 1, 0, 'Два затверджуючих ШР'],
      ['hrStaffReportShowTarifCategory', 'staffOrder', 'BOOL', null, null, 0, 1, 0, 'Якщо значення константи дорівнює «Так», то при формуванні зведеного штатного розпису з доплатами та надбавками буде інформація по тарифними розрядам.'],
      ['hrIsExtOrderSignerAvailable', 'empOrder', 'BOOL', null, null, 0, 1, 0, 'Наявність зовнішнього підписанта наказів'],
      ['hrHRMISPayrollReports', 'hrPayGen', 'BOOL', null, null, 0, 1, 0, 'Виключити звіти з обліку робочого часу з окладами (HRMIS)'],
      ['hrOffRecalculate', 'payRoll', 'BOOL', null, null, 1, 1, 0, null],
      ['hrUseReportSettingsParentOrg', 'payRoll', 'ENTITY', 'ac_organization', null, 1, 1, 0, null],
      ['hrUseSignersParentOrg', 'payRoll', 'ENTITY', 'ac_organization', null, 0, 1, 0, null],
      ['hrCheckEmployeeFamily', 'hrPayGen', 'BOOL', null, null, 1, 0, 0, null],
      ['hrEnableReasonDoc', 'empOrder', 'BOOL', null, null, 0, 1, 0, 'Якщо константа "Накази з персоналу. Вносити "Підставу" до пунктів наказів" дорівнює "Так", то на формах пунктів основних наказів буде доступне поле "Підстава", для можливості внесення індивідуальних підстав до кожного пункту наказу'],
      ['hrCreateOrderVacFromVacSheet', 'empOrder', 'BOOL', null, null, 0, 1, 0, 'Створювати накази про відпустки з затверджених графіків надання відпусток'],
      ['hrCalcExperienceMethod', 'hrPayGen', 'ENUM', null, 'HR_CALC_EXPERIENCE_METHOD', 0, 1, 0, 'При варіанті розрахунку "спрощений" - забезпечує розрахунок стажу без переведення періодів стажу з формату рр/мм/дд в дні (з припущенням, що 1 місяць дорівнює 30 дням);  при варіанті  розрахунку "точний" - забезпечується обчислення стажу у днях роботи (всі періоди перераховуються у дні роботи; приведена дата визначається за сумою кількості днів)'],
      ['hrCalcSumPosAccrual', 'staffOrder', 'ENUM', null, 'HR_CALC_POSACCRUAL_METHOD', 1, 1, 0, 'Для значення "Від посадового окладу на посаді без врахування підвищуючих надбавок" - при розрахунку значення надбавки або доплати для посади, базовою сумою для розрахунку вважається оклад з поля "Сума" картки посади"\nДля значення "Від посадового окладу на посаді з врахуванням підвищуючих надбавок" - при розрахунку значення надбавки або доплати для посади, базовою сумою для розрахунку вважається сума значень окладу та тих видів оплат, які вказані в довіднику видів оплат на вкладці бази нарахувань для цієї надбавки або доплати"'],
      ['hrDontCloseTabNumOnTempMove', 'empOrder', 'BOOL', null, null, 0, 1, 0, 'Не закривати табельний номер при тимчасовому переведенні'],
      ['hrShowAccrualMoveCert', 'empOrder', 'BOOL', null, null, 0, 1, 0, 'Якщо константа "Виводити інформацію про доплати та надбавки в наказах про переведення, присвоєння кваліфікації" дорівнює "Так", то в вказаних наказах буде виводитись інформація про надбавки та доплати'],
      ['hrShowAddDescrPerson', 'hrPayGen', 'BOOL', null, null, 0, 1, 0, 'Якщо константа "Виводити додаткову інформацію у списки" дорівнює "Так", то в списках з персоналу та звітах, які формуються з дашбоарду "Списки працівників" робочого столу "Персонал" буде видима колонка "Додаткова інформація".'],
      ['hrPlanIsNewVacation', 'hrPayGen', 'BOOL', null, null, 0, 1, 0, 'Планувати тільки право на відпустку вказаного року'],
      ['hrSkipCheckSalaryLevel', 'staffOrder', 'BOOL', null, null, 0, 1, 0, 'Якщо значення дорівнює "Так", то то при плануванні штатного розпису буде надана можливість встановлення сум окладів, які не відповідають вказаному для даної посади рівню схеми посадових окладів (на вкладці "Зміна окладів" при плануванні ШР)'],
      ['hrTimeSheetReCalcDate', 'payRoll', 'DATE', null, null, 1, 1, 0, null],
      ['hrTaskMessage', 'empOrder', 'BOOL', null, null, 1, 1, 0, 'Якщо вибрано значення "Так", то у системі здійснюється надсилання повідомлень-нагадувань про нові завдання на погодження документів, які надходять користувачу (Користувач може ознайомлюватись із повідомленнями через іконку  "Дзвіночок" у правому верхньому куті екрану'],
      ['hrUseNewPeriodsVacationSchedule', 'empOrder', 'BOOL', null, null, 0, 1, 0, 'Константа відповідає за порядок автоматичного підбору періодів із залишками відпусток при формуванні наказів про надання відпустки із функціоналу планування відпусток'],
      ['hrMaxMissionIntDayCount', 'empOrder', 'INT', null, null, 1, 1, 0, 'Максимальний строк відрядження на рік в межах країни'],
      ['hrMaxMissionExtDayCount', 'empOrder', 'INT', null, null, 1, 1, 0, 'Максимальний строк відрядження на рік за кордон'],
      ['hrMaxDiffWorkExp', 'empOrder', 'INT', null, null, 1, 1, 0, 'Максимальна різніця в днях для розрахунку безперервного загального стажу'],
      ['hrMaxDiffGovExp', 'empOrder', 'INT', null, null, 1, 1, 0, 'Максимальна різніця в днях для розрахунку безперервного стажу державної служби'],
      ['hrShortNamePayEl', 'staffOrder', 'BOOL', null, null, 0, 1, 0, 'Якщо значення константи дорівнює «Так», то в примітках звітів штатного розпису виводити замість повних назв нарахувань їх скорочені назви'],
      ['hrProjectAcc', 'payRoll', 'BOOL', null, null, 1, 1, 0, 'Розподіл зарплати за проєктами'],
      ['hrFundSourceAcc', 'payRoll', 'BOOL', null, null, 1, 1, 0, 'Розподіл зарплати за джерелами фінансування'],
      ['hrUseSexTypeInOrders', 'empOrder', 'BOOL', null, null, 0, 1, 0, 'Накази з персоналу. Враховувати стать у назвах посад.'],
      ['hrStaffTableShowAddDescrPerson', 'staffOrder', 'BOOL', null, null, 0, 1, 0, 'Штатний розпис. Виводити в штатну книгу додаткову інформацію по працівникам.'],
      ['hrOrderActualPositionName', 'hrPayGen', 'BOOL', null, null, 0, 1, 0, 'Виводити назву посади фактичного призначення у тексті наказів та документах'],
      ['hrOrderAllowSelectDictPosition', 'empOrder', 'BOOL', null, null, 0, 1, 0, 'Якщо вибрано значення "Так", то у Наказах про призначення, переведення, сумісництво дозволити вибирати значення Назви посади із Довідника посад (при цьому значення може не відповідати вказаному значенню у Штатній посаді)'],
      ['hrOrderSetAccrualByPosition', 'empOrder', 'BOOL', null, null, 0, 1, 0, 'Якщо вибрано значення "Так", то при призначенні працівника автозаповнювати поле Оклад значенням Окладу з посади'],
      ['hrTimeSheetAdditionalCol', 'timeSheet', 'STRING', null, null, 1, 1, 0, 'Назва додаткової колонки табеля'],
      ['hrSkipCheckDt', 'payRoll', 'BOOL', null, null, 1, 1, 0, null],
      ['hrSinkPosition', 'general', 'BOOL', null, null, 1, 1, 0, null],
      ['hrEmpOrderPrintType', 'empOrder', 'ENUM', null, 'HR_DOCUMENT_APPOINT', 0, 1, 0, 'Види друкованої форми документа наказів. Якщо не вибрано значення, то присвоюється значення "Наказ".'],
      ['hrUseUniversalRequest', 'cab', 'BOOL', null, null, 1, 1, 0, null],
      ['hrEmpOrderAnyNumberSigners', 'empOrder', 'BOOL', null, null, 0, 1, 0, 'При встановленні константи в формах наказів стає доступною сторінка "Підписувачі", де можна додавати довільну кількість підписувачів для подальшого застосування при створенні друкованої форми наказу'],
      ['hrDefaultStudentPosition', 'general', 'ENTITY', 'hr_dictPosition', null, 0, 1, 0, null],
      ['hrTariffReportGroupByCategory', 'general', 'BOOL', null, null, 0, 1, 0, null],
      ['hrEmpOrderNotNullAppointKind', 'empOrder', 'BOOL', null, null, 0, 1, 0, 'Обов`язковість внесення атрибутів наказів для статистичної звітності'],
      ['publicPortalReceiveEmployeeID', 'integration', 'BOOL', null, null, 1, 0, 0, null],
      ['hrMailNotification', 'empOrder', 'BOOL', null, null, 1, 1, 0, 'Якщо вибрано значення "Так", то буде здійснюватися надсилання повідомлень-нагадувань на E-mail користувачів про нові завдання на погодження документів, які надходять користувачу'],
      ['hrReconciliationInDocNet', 'general', 'BOOL', null, null, 1, 1, 0, 'Можливість погодження документів у зовнішній системі'],
      ['hrVacFixMonth', 'empOrder', 'INT', null, null, 0, 1, 0, 'Фіксація відпусток (місяців). При встановленні константи відпустки, які виникли в періодах до встановленого в константі значення, фіксуються в окремому полі та враховуються як використані'],
      ['hrMultiOrganization', 'empOrder', 'BOOL', null, null, 1, 0, 0, 'Вмикається у випадку, коли ведеться мультиорганізаційна структура та працівники мають призначення одночасно в декількох організаціях. Константа впливає на можливість одночасного створення проєктів деяких наказів у всіх організаціях працівника.'],
      ['hrOrderРositionCategory', 'empOrder', 'BOOL', null, null, 1, 0, 0, 'Накази. Виводити у наказах категорію посади.'],
      ['hrCheckAdditionalVacationDays', 'empOrder', 'BOOL', null, null, 0, 1, 0, 'Накази з персоналу. Перевірка надання додаткових днів відпустки.'],
      ['hrDocNetExecutor', 'empOrder', 'STRING', null, null, 1, 1, 0, 'Користувач системи DocNet, що опрацьовує відправлені на погодження документи'],
      ['hrEntryOrgDepSinkPosition', 'payRoll', 'BOOL', null, null, 1, 1, 0, 'Заповнювати аналітику підрозділу підрозділом з головної організації'],
      ['hrStaffTableUseHourlyPay', 'staffOrder', 'BOOL', null, null, 0, 1, 0, 'При включеній константі в звіті "Штатний розпис з доплатами та надбавками (по видам нарахувань)" надається можливість виводити інформацію по позиціям з оплатою по годинам'],
      ['hrDepChiefAllowSelectEmployee', 'general', 'BOOL', null, null, 1, 1, 0, null],
      ['hrExportCfgExperienceType', 'integration', 'ENTITY', 'hr_methodExp', null, 1, 0, 0, null],
      ['publicPortalReceiveEducation', 'integration', 'BOOL', null, null, 1, 0, 0, null],
      ['hrHideEmployeeContact', 'general', 'BOOL', null, null, 0, 1, 0, null],
      ['hrUsePlanByOrg', 'timeSheet', 'ENTITY', 'ac_organization', null, 1, 1, 0, 'Увага!!! При зміні значення табель потрібно переформувати вручну!!!'],
      ['hrSpecialRankByDefault', 'general', 'ENUM', 'null', 'HR_SPECIALRANK_TYPE', 0, 1, 0, null],
      ['hrSeparateRounding', 'staffOrder', 'BOOL', null, null, 0, 1, 0, 'Штатний розпис. При розрахунку Фонду ЗП округлювати окремо оклад та суму нарахувань'],
      ['hrAccrualAvgCalcSumDate', 'payRoll', 'DATE', null, null, 1, 1, 0, null],
      ['hrAccrualAvgCalcTimeDate', 'payRoll', 'DATE', null, null, 1, 1, 0, null],
    ]
  },
  {
    entity: 'hr_orderClass',
    identifier: 'numCode',
    notDelete: true,
    localeAttr: ['description', 'ordersType'],
    attrs: ['numCode', 'description', 'ordersType', 'entityName'],
    items: [
      [101, 'Наказ про зміну штатного розкладу', 'Накази про зміну штатного розкладу', 'hr_staffOrder'],
      [102, 'Штатний розпис', 'Штатний розпис', 'hr_staffTable'],
      [103, 'Ведення організацій', 'Ведення організацій', 'hr_staffOrderOrgStructure'],
      [104, 'Планування структури', 'Планування структури', 'hr_staffTableOrgStructure'],
      [110, 'Тарифікаційний список', 'Тарифікаційний список', 'hr_staffTariffing'],
      [210, 'Листи непрацездатності', 'Листи непрацездатності', 'hr_empOrderSickness'], // ?
      [211, 'Протоколи засідання комісії з соц. страху', 'Протоколи комісій', 'hr_sicknessMeeting'], // ?
      [700, 'Накази зарплати', 'Накази зарплати', 'hr_orderPay'],
      [800, 'Скорочення робочого дня/тижня', 'Скорочення робочого дня/тижня', 'hr_timeSheetChange'], // ?
      [901, 'Універсальний документ', 'Універсальні документи', 'hr_empOrderUni'], // ?
      [1000, 'Наказ з персоналу', 'Наказ з персоналу', 'hr_empOrder'],
      [2000, 'Документи нарахування', 'Документи нарахування', 'hr_orderRegistry'],
      [3000, 'Документи відпустки', 'Документи відпустки', 'hr_docRegVacation'],
      [3001, 'Документи неоплачувана відпустки', 'Документи неоплачувана відпустка', 'hr_docRegVacationUnpaid'],
      [3002, 'Документи Наказ на відрядження', 'Документи Наказ на відрядження', 'hr_docRegBusinessTrip'],
      [3003, 'Документи Компенсація відпустки', 'Документи Компенсація відпустки', 'hr_docRegVacationCompensation'],
      [3004, 'Документи Відпустка по догляду за дитиною до 3-х років', 'Документи  Відпустка по догляду за дитиною до 3-х років', 'hr_docRegVacationKid'],
      [3005, 'Документи на оплату за середнім заробітком', 'Документи на оплату за середнім заробітком', 'hr_docRegAvgPay'],
      [3006, 'Лікарняний', 'Лікарняний', 'hr_docRegSickness'],
      [3007, 'Матеріальна допомога', 'Матеріальна допомога', 'hr_docRegBountyHelp'],
      [3008, 'Допомога на поховання', 'Допомога на поховання', 'hr_docRegFuneral'],
      [3009, 'Документи неоплачувані неявки', 'Документи неоплачувані неявки', 'hr_docRegUnpaidAbsence'],
      [3010, 'Відшкодування вартості поховання', 'Відшкодування вартості поховання', 'hr_docRegFuneralComp'],
      [3011, 'Доплата до середнього заробітку', 'Доплата до середнього заробітку', 'hr_orderRegistrySupAvgEarn'],
      [3012, 'Переведення на легшу роботу', 'Доплата до середнього заробітку', 'hr_orderRegistrySupAvgEarn'],
      [3013, 'Поновлення на посаді', 'Поновлення на посаді', 'hr_docRegRenewal'],
      [3014, 'Заява-розрахунок СС', 'Заява-розрахунок СС', 'hr_sicknessRequis'],
      [3015, 'Погодинна оплата', 'Погодинна оплата', 'hr_docRegHourPay'],
      [3016, 'Документи на тривалу оплату за середнім заробітком', 'Документи на тривалу оплату за середнім заробітком', 'hr_docRegAvgLongPay'],
      [3050, 'Робочі місця тарифікації', 'Робочі місця тарифікації', 'trf_workPlace'],
      [4000, 'Платіжні відомості', 'Платіжні відомості', 'hr_payRoll'],
      [4001, 'Вихідна допомога', 'Вихідна допомога', 'hr_docRegSeverancePay'],
      [4002, 'Оплата за договором ЦПХ', 'Оплата за договором ЦПХ', 'hr_docRegDogCPHPay'],
      [4003, 'Разове нарахування', 'Разове нарахування', 'hr_docRegSinglePay'],
      [4004, 'Разове утримання', 'Разове утримання', 'hr_docRegSingleDeduction'],
      [4005, 'Доплата до середнього заробітку', 'Доплата до середнього заробітку', 'hr_docRegSupAvgEarn'],
      [4006, 'Документ нарахування Переведення на легшу роботу', 'Документ нарахування Переведення на легшу роботу', 'hr_docRegEasyWork'],
      [4007, 'Додаткове благо', 'Додаткове благо', 'hr_docRegBenefit'],
      [4008, 'Нарахування замін', 'Нарахування замін', 'hr_docRegShift'],
      [5000, 'Подання щодо добору персоналу', 'Подання щодо добору персоналу', 'hr_requestStuffMotion'],
      [5001, 'Заявка на добір персоналу', 'Заявка на добір персоналу', 'hr_requestForStuff'],
      [5002, 'Заяви', 'Заяви', 'hr_request'],
      [5003, 'Оцінювання', 'Оцінювання', 'hr_empAssessment'],
      [5004, 'Висновок оцінювання', 'Висновок оцінювання', 'hr_empAssessmentResult'],
      [5005, 'Посадова інструкція', 'Посадова інструкція', 'hr_positionInstruction'],
      [6000, 'Нарахування працівника', 'Нарахування працівника', 'hr_employeeAccrual'],
      [7001, 'Індивідуальний графік роботи', 'Індивідуальний графік роботи', 'wfm_workSheet']
    ]
  },
  {
    entity: 'ac_reminderType',
    identifier: 'code',
    notDelete: true,
    notUpdate: false,
    localeAttr: ['name'],
    attrs: ['code', 'name', 'componentName', 'dataFunc', 'entityMethod', 'params'],
    items: [
      ['birthDays', 'Дні народження', 'reminderEmp', 'HR.reminderService.birthDays', 'birthDays',
        JSON.stringify({
          attr: [
            { name: 'dayCount', dataType: 'Int', caption: 'Кількість днів до події' },
            { name: 'showOnlyCurrentOrg', dataType: 'Boolean', caption: 'Відобразити дані поточної організації' }
          ],
          filterAttr: [
            {
              name: 'onlyAnniversaries',
              dataType: 'Enum',
              associatedEntity: 'ubm_enum',
              enumGroup: 'HR_ONLY_ANNIVERSARIES',
              caption: 'Тільки ювіляри'
            },
            { name: 'depID', dataType: 'hrDepartment', caption: 'Підрозділ' },
            { name: 'dictStaffCatID', dataType: 'Entity', associatedEntity: 'hr_dictStaffCat', caption: 'Категорія персоналу', xtype: 'ubboxselect' }
          ],
          reminderEmpTable: [
            {
              prop: 'fullFIO',
              label: 'ПІБ',
              width: '200'
            },
            {
              prop: 'posName',
              label: 'Посада',
              width: '200'
            },
            {
              prop: 'dateEvent',
              label: 'Дата події',
              width: '80'
            },
            {
              prop: 'fullYears',
              label: 'Років',
              width: '100'
            }
          ],
          reminderEmpTableParams: {
            hideDaysCtrl: true,
            rowDblClickParams: {
              formCode: 'hr_employee',
              entity: 'hr_employee',
              instanceID: true,
              cmpInitConfig: {
                employeeNumberID: true
              }
            }
          }
        })
      ],
      ['endProbationaryPeriod', 'Закінчення випробувального терміну', 'reminderEmp', 'HR.reminderService.endProbationaryPeriod', 'endProbationaryPeriod',
        JSON.stringify({
          attr: [
            { name: 'dayCount', dataType: 'Int', caption: 'Кількість днів до події' },
            { name: 'showOnlyCurrentOrg', dataType: 'Boolean', caption: 'Відобразити дані поточної організації' }
          ],
          filterAttr: [
            { name: 'depID', dataType: 'hrDepartment', caption: 'Підрозділ' },
            { name: 'dictStaffCatID', dataType: 'Entity', associatedEntity: 'hr_dictStaffCat', caption: 'Категорія персоналу', xtype: 'ubboxselect' }
          ],
          reminderEmpTableParams: {
            hideDaysCtrl: true,
            rowDblClickParams: {
              formCode: 'hr_employee',
              entity: 'hr_employee',
              instanceID: true,
              cmpInitConfig: {
                employeeNumberID: true
              }
            }
          }
        })
      ],
      ['parentalLeave', 'Закінчення відпусток (за видами)', 'reminderEmp', 'HR.reminderService.endParentalLeave', 'endParentalLeave',
        JSON.stringify({
          attr: [
            {
              name: 'dictVacationKindID',
              dataType: 'Entity',
              associatedEntity: 'hr_dictVacationKind',
              caption: 'Вид відпустки',
              xtype: 'ubboxselect'
            },
            { name: 'dayCount', dataType: 'Int', caption: 'Кількість днів до події' },
            { name: 'showOnlyCurrentOrg', dataType: 'Boolean', caption: 'Відобразити дані поточної організації' }
          ],
          filterAttr: [
            { name: 'depID', dataType: 'hrDepartment', caption: 'Підрозділ' },
            { name: 'dictStaffCatID', dataType: 'Entity', associatedEntity: 'hr_dictStaffCat', caption: 'Категорія персоналу', xtype: 'ubboxselect' }
          ],
          reminderEmpTableParams: {
            hideDaysCtrl: true,
            rowDblClickParams: {
              formCode: 'hr_employee',
              entity: 'hr_employee',
              instanceID: true,
              cmpInitConfig: {
                employeeNumberID: true
              }
            }
          }
        })
      ],
      ['temporaryAssignment', 'Закінчення тимчасового призначення', 'reminderEmp', 'HR.reminderService.endTemporaryAssignment', 'endTemporaryAssignment',
        JSON.stringify({
          attr: [
            { name: 'dayCount', dataType: 'Int', caption: 'Кількість днів до події' },
            { name: 'showOnlyCurrentOrg', dataType: 'Boolean', caption: 'Відобразити дані поточної організації' }
          ],
          filterAttr: [
            { name: 'depID', dataType: 'hrDepartment', caption: 'Підрозділ' },
            { name: 'dictStaffCatID', dataType: 'Entity', associatedEntity: 'hr_dictStaffCat', caption: 'Категорія персоналу', xtype: 'ubboxselect' }
          ],
          reminderEmpTableParams: {
            hideDaysCtrl: true,
            rowDblClickParams: {
              formCode: 'hr_employee',
              entity: 'hr_employee',
              instanceID: true,
              cmpInitConfig: {
                employeeNumberID: true
              }
            }
          }
        })
      ],
      ['myAudit', 'Мої перевірки', 'reminderEmp', 'HR.reminderService.getMyAudit', 'getMyAudit',
        JSON.stringify({
          attr: [
            { name: 'dayCount', dataType: 'Int', caption: 'Кількість днів до події' }
          ],
          filterAttr: [],
          reminderEmpTableParams: {
            hideOrgCtrl: true,
            rowDblClickParams: {
              formCode: 'wfm_audit',
              entity: 'wfm_audit',
              instanceID: true
            }
          }
        })
      ],
      ['myTasks', 'Мої завдання', 'reminderEmp', 'HR.reminderService.getMyTasks', 'getMyTasks',
        JSON.stringify({
          attr: [
            {
              name: 'stageKind',
              dataType: 'Enum',
              associatedEntity: 'ubm_enum',
              enumGroup: 'HR_RECSTAGEKIND',
              caption: 'Тип завдання',
              xtype: 'ubboxselect'
            },
            {
              name: 'taskState',
              dataType: 'Enum',
              associatedEntity: 'ubm_enum',
              enumGroup: 'HR_TASK_STATES',
              caption: 'Статус завдання',
              xtype: 'ubboxselect'
            }
          ],
          filterAttr: [],
          reminderEmpTable: [
            {
              prop: 'taskType',
              label: 'Тип',
              width: 200
            },
            {
              prop: 'docDescription',
              label: 'Документ',
              width: 200
            },
            {
              prop: 'docDate',
              label: 'Дата',
              width: 80
            },
            {
              prop: 'taskState',
              label: 'Стан'
            }
          ],
          reminderEmpTableParams: {
            hideDaysCtrl: true,
            hideOrgCtrl: true,
            rowDblClickParams: {
              formCode: 'hr_task-main',
              entity: 'hr_task',
              title: 'Завдання',
              description: 'Завдання',
              instanceID: true
            }
          }
        })
      ],
      ['cabRequest', 'Заявки з Кабінету', 'reminderEmp', 'HR.reminderService.getCabRequest', 'getCabRequest',
        JSON.stringify({
          attr: [
            {
              name: 'requestState',
              dataType: 'Enum',
              associatedEntity: 'ubm_enum',
              enumGroup: 'HR_REQUEST_STATE',
              caption: 'Стан заявки',
              xtype: 'ubboxselect'
            },
            { name: 'showOnlyCurrentOrg', dataType: 'Boolean', caption: 'Відобразити дані поточної організації' }
          ],
          filterAttr: [
            { name: 'showOnlyCurrUser', dataType: 'Boolean', caption: 'Тільки мої' },
            { name: 'infoField', dataType: 'labelAttr', text: 'Увага! У випадку вибору параметра "Тільки мої" - всі інші параметри буде проігноровано!' },
            { name: 'depID', dataType: 'hrDepartment', caption: 'Підрозділ' },
            { name: 'dictStaffCatID', dataType: 'Entity', associatedEntity: 'hr_dictStaffCat', caption: 'Категорія персоналу', xtype: 'ubboxselect' }
          ],
          reminderEmpTable: [
            {
              prop: 'requestNumDate',
              label: 'Заява',
              width: 200
            },
            {
              prop: 'fullFIO',
              label: 'Працівник',
              width: 200
            },
            {
              prop: 'requestType',
              label: 'Тип заяви',
              width: 200
            },
            {
              prop: 'term',
              label: 'Термін',
              width: 100
            },
            {
              prop: 'requestState',
              label: 'Стан',
              width: 120
            }
          ],
          reminderEmpTableParams: {
            hideDaysCtrl: true,
            rowDblClickParams: {
              formCode: 'hr_request',
              entity: 'hr_request',
              title: 'Заява працівника',
              description: 'Заява працівника',
              instanceID: true
            }
          }
        })
      ],
      ['timeSheet', 'За елементами табеля', 'reminderEmp', 'HR.reminderService.getTimeSheet', 'getTimeSheet',
        JSON.stringify({
          attr: [
            { name: 'dayCount', dataType: 'Int', caption: 'Кількість днів' },
            {
              name: 'factTimeCostID',
              dataType: 'Entity',
              associatedEntity: 'hr_dictTimeCost',
              caption: 'Елементи невиходу, за якими будувати перелік',
              xtype: 'ubboxselect',
              fieldList: ['ID', 'nameSmall']
            },
            { name: 'showPie', dataType: 'Boolean', caption: 'Графічно' },
            { name: 'infoField', dataType: 'labelAttr', text: 'У графічному режимі буде відображено дані лише за один день.' },
            { name: 'showOnlyCurrentOrg', dataType: 'Boolean', caption: 'Відобразити дані поточної організації' }
          ],
          filterAttr: [
            { name: 'depID', dataType: 'hrDepartment', caption: 'Підрозділ' },
            { name: 'dictStaffCatID', dataType: 'Entity', associatedEntity: 'hr_dictStaffCat', caption: 'Категорія персоналу', xtype: 'ubboxselect' }
          ],
          reminderEmpTable: [
            {
              prop: 'fullFIO',
              label: 'ПІБ',
              width: 200
            },
            {
              prop: 'posName',
              label: 'Посада',
              width: 400
            },
            {
              prop: 'factTimeCostName',
              label: 'Неявка',
              width: 200
            },
            {
              prop: 'dateEvent',
              label: 'Дата події',
              width: 80
            }
          ],
          reminderEmpTableParams: {
            showComponentCode: 'reminderPie',
            hidePieDaysCtrl: true,
            rowDblClickParams: {
              formCode: 'tim_timeSheet',
              entity: 'tim_timeSheet',
              defaultValues: {
                employeeNumberID: true,
                periodID: true
              }
            },
            pieClickParams: {
              cmdType: 'showForm',
              identificator: 'factTimeCostID',
              formTitle: 'За елементами табеля',
              gridData: 'employeeList',
              grid: [
                { name: 'employeeID', hidden: true },
                { name: 'employeeNumberID', hidden: true },
                {
                  name: 'fullFIO',
                  columnConfig: {
                    text: 'Працівник',
                    width: 400
                  }
                },
                {
                  name: 'count',
                  columnConfig: {
                    text: 'Кількість елементів табеля',
                    width: 250
                  }
                }
              ],
              onClickFormCode: 'hr_employee',
              onClickEntity: 'hr_employee',
              onClickInstanceIDAttrName: 'employeeID',
              onClickCmpInitConfig: ['employeeNumberID']
            }
          }
        })
      ],
      ['firedEmps', 'Звільнені (за причинами звільнення)', 'reminderEmp', 'HR.reminderService.getFiredEmps', 'getFiredEmps',
        JSON.stringify({
          attr: [
            { name: 'dayCount', dataType: 'Int', caption: 'За попередніх (днів)' },
            { name: 'showOnlyCurrentOrg', dataType: 'Boolean', caption: 'Відобразити дані поточної організації' }
          ],
          filterAttr: [
            { name: 'dictStaffCatID', dataType: 'Entity', associatedEntity: 'hr_dictStaffCat', caption: 'Категорія персоналу', xtype: 'ubboxselect' }
          ],
          reminderEmpTableParams: {
            showComponentCode: 'reminderPie',
            ctrlTypeCode: 'PIE',
            pieClickParams: {
              cmdType: 'showForm',
              identificator: 'reasonID',
              formTitle: 'Звільнені (за причинами звільнення)',
              gridData: 'employeeList',
              grid: [
                { name: 'ID', hidden: true },
                { name: 'orderID', hidden: true },
                { name: 'dismissOrderEntityName', hidden: true },
                {
                  name: 'empName',
                  columnConfig: {
                    text: 'Працівник',
                    width: 400
                  }
                },
                {
                  name: 'orderDescription',
                  columnConfig: {
                    text: 'Наказ про звільнення',
                    width: 400
                  }
                }
              ],
              onClickFormCode: 'hr_empOrder',
              onClickEntity: 'hr_empOrder',
              onClickInstanceIDAttrName: 'orderID',
              onClickFiredIfConditionCode: 'firedEmps'
            }
          }
        })
      ],
      ['ordersAll', 'Накази', 'reminderEmp', 'HR.reminderService.getOrderAll', 'getOrderAll',
        JSON.stringify({
          attr: [
            { name: 'dayCount', dataType: 'Int', caption: 'Кількість днів' },
            {
              name: 'orderState',
              dataType: 'Enum',
              associatedEntity: 'ubm_enum',
              enumGroup: 'HR_ORDER_STATE',
              caption: 'Стан наказу',
              xtype: 'ubboxselect'
            },
            { name: 'showPie', dataType: 'Boolean', caption: 'Відобразити у вигляді діаграми' },
            { name: 'showOnlyCurrentOrg', dataType: 'Boolean', caption: 'Відобразити лише накази поточної організації' }
          ],
          filterAttr: [],
          reminderEmpTable: [
            {
              prop: 'orderDesccriprion',
              label: 'Наказ',
              width: 400
            },
            {
              prop: 'employeeList',
              label: 'Особи',
              width: 300
            },
            {
              prop: 'orderState',
              label: 'Стан',
              width: 120
            },
            {
              prop: 'mi_createDate',
              label: 'Дата створення',
              width: 80
            }
          ],
          reminderEmpTableParams: {
            showComponentCode: 'reminderPie',
            rowDblClickParams: {
              formCode: 'hr_empOrder',
              entity: 'hr_empOrder',
              instanceID: true
            },
            pieClickParams: {
              cmdType: 'showList',
              entity: 'hr_empOrder',
              fieldList: ['description'],
              wherelist: {
                orgIDList: {
                  expression: '[organizationID]',
                  condition: 'in',
                  value: 'orgIDList'
                },
                mi_createDateFrom: {
                  expression: '[mi_createDate]',
                  condition: 'lessEqual',
                  value: 'dateTo'
                },
                mi_createDateTo: {
                  expression: '[mi_createDate]',
                  condition: 'moreEqual',
                  value: 'dateFrom'
                },
                orderState: {
                  expression: '[orderState]',
                  condition: '=',
                  value: 'orderState'
                }
              }
            }
          }
        })
      ],
      ['empAmount', 'Чисельність персоналу (рік)', 'reminderEmp', 'HR.reminderService.getEmpAmount', 'getEmpAmount',
        JSON.stringify({
          attr: [
            {
              xtype: 'numberfield',
              dataType: 'Number',
              name: 'year',
              fieldLabel: 'Рік',
              weight: 150,
              caption: 'Рік',
              minValue: 2000,
              maxValue: 9999,
              allowBlank: false,
              allowExponential: false,
              hideTrigger: true
            },
            { name: 'showOnlyCurrentOrg', dataType: 'Boolean', caption: 'Відобразити дані поточної організації' }
          ],
          filterAttr: [
            { name: 'dictStaffCatID', dataType: 'Entity', associatedEntity: 'hr_dictStaffCat', caption: 'Категорія персоналу', xtype: 'ubboxselect' }
          ],
          reminderEmpTableParams: {
            showComponentCode: 'reminderLine',
            hideLineDaysCtrl: true,
            ctrlTypeCode: 'LINE'
          }
        })
      ],
      ['retirementData', 'Настання пенсійного віку', 'reminderEmp', 'HR.reminderService.getRetirementData', 'getRetirementData',
        JSON.stringify({
          attr: [
            { name: 'dayCount', dataType: 'Int', caption: 'Кількість днів до події' },
            { name: 'showOnlyCurrentOrg', dataType: 'Boolean', caption: 'Відобразити дані поточної організації' }
          ],
          filterAttr: [
            { name: 'depID', dataType: 'hrDepartment', caption: 'Підрозділ' },
            { name: 'dictStaffCatID', dataType: 'Entity', associatedEntity: 'hr_dictStaffCat', caption: 'Категорія персоналу', xtype: 'ubboxselect' }
          ],
          reminderEmpTableParams: {
            hideDaysCtrl: true,
            rowDblClickParams: {
              formCode: 'hr_employee',
              entity: 'hr_employee',
              instanceID: true,
              cmpInitConfig: {
                employeeNumberID: true
              }
            }
          }
        })
      ],
      ['getReminderOfWorkExperienceData', 'Щомісячне нагадування про стажі', 'reminderEmp', 'HR.reminderService.getReminderOfWorkExperienceData', 'getReminderOfWorkExperienceData',
        JSON.stringify({
          attr: [
            { name: 'showOnlyCurrentOrg', dataType: 'Boolean', caption: 'Відобразити дані поточної організації' },
            {
              name: 'dictExperience',
              dataType: 'Entity',
              associatedEntity: 'hr_dictExperience',
              caption: 'Вид стажу',
              xtype: 'ubboxselect',
              fieldList: ['ID', 'name']
            }
          ],
          filterAttr: [
            { name: 'depID', dataType: 'hrDepartment', caption: 'Підрозділ' },
            { name: 'dictStaffCatID', dataType: 'Entity', associatedEntity: 'hr_dictStaffCat', caption: 'Категорія персоналу', xtype: 'ubboxselect' }
          ],
          reminderEmpTable: [
            {
              prop: 'fullFIO',
              label: 'ПІБ'
            },
            {
              prop: 'posName',
              label: 'Посада'
            },
            {
              prop: 'dateEvent',
              label: 'Дата події'
            },
            {
              prop: 'factTimeCostExp',
              label: 'Збільшення стажу у цьому періоді',
              width: 130,
              sortable: true,
              description: 'У цьому періоді у працівника стаж стане на рік більшим і дорівнюватиме'
            }
          ],
          reminderEmpTableParams: {
            hideDaysCtrl: true,
            hidePeriodMonthCtrl: false,
            hideDictExperienceCtrl: false
          }
        })
      ]
    ]
  },
  {
    entity: 'hr_dictTrialPeriod',
    identifier: 'months',
    notDelete: true,
    localeAttr: ['name'],
    attrs: ['months', 'name'],
    items: [
      [1, 'Один місяць'],
      [2, 'Два місяці'],
      [3, 'Три місяці'],
      [4, 'Чотири місяці'],
      [5, 'П`ять місяців'],
      [6, 'Шість місяців']
    ]
  },
  {
    entity: 'hr_dictGovernmType',
    identifier: 'code',
    notDelete: true,
    localeAttr: ['name'],
    attrs: ['code', 'name'],
    items: [
      ['01', 'Міністерства'],
      ['02', 'Повноваження Президента'],
      ['03', 'ЦОВВ'],
      ['04', 'Колегіальні органи'],
      ['05', 'Інші державні органи'],
      ['06', 'Органи судової влади прокуратури']
    ]
  },
  {
    entity: 'hr_dictFutureOfWork',
    identifier: 'code',
    notDelete: true,
    localeAttr: ['name'],
    attrs: ['code', 'name'],
    items: [
      ['01', 'Індивідуально'],
      ['02', 'Командна робота'],
      ['03', 'Проєктна робота']
    ]
  }
]
