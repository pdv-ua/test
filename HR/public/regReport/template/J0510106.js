module.exports = `<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1485px">
<tr>
    <td width="20%" align="center">Відмітка про отримання<br/>(штамп контролюючого органу)</td>
    <td width="58%"></td>
    <td width="22%">
        Додаток 1<br/>до Податкового розрахунку сум доходу,<br/>нарахованого (сплаченого) на користь<br/>платників податків - фізичних осіб,<br/>і сум утриманого з них податку, а також <br/>сум нарахованого єдиного внеску (Д1)<br/>(пункт 1 розділу IV)
    </td>
</tr>
<tr>
    <td colspan="3">&nbsp;</td>
</tr>
</table>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1485px">
<tr>
    <td class="aroundBorder" width="5%" rowspan="4" align="center">01</td>
    <td class="aroundBorder subtableHedaer" align="center" width="70%" rowspan="4" >
    ВІДОМОСТІ ПРО НАРАХУВАННЯ ЗАРОБІТНОЇ ПЛАТИ (ДОХОДУ, ГРОШОВОГО ЗАБЕЗПЕЧЕННЯ) ЗАСТРАХОВАНИМ ОСОБАМ*
    </td>
    <td class="aroundBorder" width="5%" align="center">011</td>
    <td class="aroundBorder" width="15%" >Звітний<sup>1</sup></td>
    <td class="aroundBorder" width="5%" >
        {{#booleanInput}}DECLAR.DECLARBODY.HZ####{"linkedPath": ["DECLAR.DECLARBODY.HZN","DECLAR.DECLARBODY.HZU"]}{{{}}}{{/booleanInput}}
    </td>
</tr>
<tr>
    <td class="aroundBorder" width="5%" align="center">012</td>
    <td class="aroundBorder" width="15%" >Звітний новий<sup>2</sup></td>
    <td class="aroundBorder" width="5%" >
        {{#booleanInput}}DECLAR.DECLARBODY.HZN####{"linkedPath": ["DECLAR.DECLARBODY.HZ","DECLAR.DECLARBODY.HZU","DECLAR.DECLARBODY.HZD"]}{{{}}}{{/booleanInput}}
    </td>
</tr>
<tr>
    <td class="aroundBorder" width="5%" align="center">013</td>
    <td class="aroundBorder" width="15%" >Уточнюючий<sup>3</sup></td>
    <td class="aroundBorder" width="5%">
        {{#booleanInput}}DECLAR.DECLARBODY.HZU####{"linkedPath": ["DECLAR.DECLARBODY.HZ","DECLAR.DECLARBODY.HZN","DECLAR.DECLARBODY.HZD"]}{{{}}}{{/booleanInput}}
    </td>
</tr>
<tr>
    <td class="aroundBorder" width="5%" align="center">014</td>
    <td class="aroundBorder" width="15%" >Довідковий<sup>4</sup></td>
    <td class="aroundBorder" width="5%">
        {{#booleanInput}}DECLAR.DECLARBODY.HZD####{"linkedPath": ["DECLAR.DECLARBODY.HZN","DECLAR.DECLARBODY.HZU"]}{{{}}}{{/booleanInput}}
    </td>
</tr>
<tr>
    <td colspan="5">&nbsp;</td>
</tr>
</table>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1485px">
<tr>
    <td rowspan="2" class="aroundBorder" width="5%" align="center">02</td>
    <td rowspan="2" class="aroundBorder " width="15%">Звітний (податковий) період<sup>5</sup></td>
    <td class="aroundBorder" width="20%" align="center">{{#intInput}}DECLAR.DECLARBODY.HZY{{{}}}{{/intInput}}</td>
    <td class="aroundBorder" width="20%" align="center">{{#intInput}}DECLAR.DECLARBODY.HZKV{{{}}}{{/intInput}}</td>
    <td class="aroundBorder" width="20%" align="center">{{#intInput}}DECLAR.DECLARBODY.HNM{{{}}}{{/intInput}}</td>
    <td class="aroundBorder" width="20%" align="center">{{#intInput}}DECLAR.DECLARBODY.HNUM1{{{}}}{{/intInput}}</td>
</tr>
<tr>
    <td class="topBorder aroundBorder" width="20%" align="center">(рік)</td>
    <td class="topBorder aroundBorder" width="20%" align="center">(квартал)</td>
    <td class="topBorder aroundBorder" width="20%" align="center">(номер місяця в кварталі)</td>
    <td class="topBorder aroundBorder" width="20%" align="center">(номер додатку до Розрахунку)</td>
</tr>
<tr>
    <td colspan="6">&nbsp;</td>
</tr>
</table>
<table style="table-layout: auto; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1485px">
            <tr>
                <td class="aroundBorder" width="5%" rowspan="3" align="center">03</td>
                <td class="aroundBorder " width="15%" rowspan="3">Платник єдиного внеску</td>
                <td class="aroundBorder" width="80%" align="center" colspan="7">{{#textInput}}DECLAR.DECLARBODY.HNAME####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}</td>
            </tr>
            <tr>
                <td align="right" width="20%"></td>
                <td align="right" width="10%">від </td>
                <td align="center" width="9%">{{#dateInput}}DECLAR.DECLARBODY.HDDGV####{"style": "width: 100px; font-weight: bold;"}{{{}}}{{/dateInput}}</td>
                <td align="center" width="2%">№</td>
                <td align="center" width="9%">{{#textInput}}DECLAR.DECLARBODY.HNDGV####{"style": "width: 200px; text-align: left; font-weight: bold;"}{{{}}}{{/textInput}}</td>
                <td align="center" width="10%"></td>
                <td class="borderRight" align="right" width="40%"></td>
            </tr>
            <tr>
                <td class="aroundBorder" width="80%" align="center" colspan="9">(повне найменування (прізвище, ім’я, по батькові (за наявності) платника згідно з реєстраційними документами, дата та номер договору (угоди))</td>
            </tr>
            
            <tr>
                <td colspan="9">&nbsp;</td>
            </tr>
            </table>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1485px">
<tr>
    <td class="aroundBorder" width="5%" align="center">031</td>
    <td class="aroundBorder " width="70%">Податковий номер<sup>6</sup> або серія (за наявності) та номер паспорта<sup>7</sup> платника єдиного внеску</td>
    <td class="aroundBorder" width="25%" align="center">{{#textInput}}DECLAR.DECLARBODY.HTIN####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}</td>
</tr>
<tr>
    <td class="leftBorder" colspan="5">&nbsp;</td>
</tr>
<tr>
    <td class="aroundBorder" width="5%" align="center">033</td>
    <td class="aroundBorder ">
        Податковий номер ліквідованого платника єдиного внеску (заповнюється у разі подання розрахунку правонаступником при поданні розрахунку з типом «Уточнюючий»<sup>8</sup>)
    </td>
    <td class="aroundBorder">{{#textInput}}DECLAR.DECLARBODY.HTIN1####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}</td>
</tr>
<tr>
    <td class="leftBorder" colspan="5">&nbsp;</td>
</tr>
<tr>
    <td class="aroundBorder" width="5%" align="center">034</td>
    <td class="aroundBorder ">
        Код філії (заповнюється у разі подання платником єдиного внеску відомостей про філію при поданні розрахунку з типом «Уточнюючий»<sup>9</sup>)
    </td>
    <td class="aroundBorder">{{#textInput}}DECLAR.DECLARBODY.HFIL####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}</td>
</tr>
<tr>
    <td class="leftBorder" colspan="5">&nbsp;</td>
</tr>
<tr>
    <td class="aroundBorder" width="5%" rowspan="2" align="center">035</td>
    <td class="aroundBorder ">
        для призначення пенсії <sup>10</sup>
    </td>
    <td class="aroundBorder">{{#booleanInput}}DECLAR.DECLARBODY.H01{{{}}}{{/booleanInput}}</td>
</tr>
<tr>
    <td class="aroundBorder ">
    для призначення інших соціальних виплат <sup>11</sup>
    </td>
    <td class="aroundBorder">{{#booleanInput}}DECLAR.DECLARBODY.H02{{{}}}{{/booleanInput}}</td>
</tr>
<tr>
    <td colspan="5">&nbsp;</td>
</tr>
</table>
<br>
<table id="table" style="table-layout: auto; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse; border: 1px solid black;" border="1" cellspacing="0" cellpadding="0px" bordercolor="black" width="1485px">
  <thead>
    <tr>
      <td align="center" rowspan="2" width="2%" class="no-print">&nbsp;</td>
      <td align="center" rowspan="2" width="2%">04. №  з/п  </td>
      <td align="center" rowspan="2" width="4%"> 05. Грома-<br>дянин Украї-<br>ни <br>(1 - так, <br>0 - ні)</td>
      <td align="center" rowspan="2" width="2%"> 06. Чо-<br>ло-<br>вік - Ч, жін-<br>ка - Ж</td>
      <td align="center" width="10%"> 07. Реєстраційний номер облікової картки платника податків або серія (за наявності) та/або  номер паспорта за формою БКNNХХХХХХ/ПХХХХХХХХХ ЗО *</td>
      <td align="center" width="4%"> 8. Код катего-<br>рії ЗО** </td>
      <td align="center" width="4%"> 09. Код типу нараху-<br>вань *** </td>
      <td align="center" colspan="2" width="9%"> 10. Місяць та рік, за який проведено нарахування**** </td>
      <td align="center" width="6%"> 12. Кількість календарних днів  тимча-<br>сової непра-<br>цездатності </td>
      <td align="center" width="7%"> 14. Кількість  календарних днів перебування у трудових / цивільно-<br>правових відносинах, проходження військової служби протягом  звітного місяця</td>
      <td align="center" width="14%"> 16. Загальна сума нарахованої заробітної плати / доходу,  грошового збезпечення (усього з початку звітного місяця)<br>(грн. коп.) </td>
      <td align="center" rowspan="2" width="13%"> 18. Сума різниці між розміром мінімальної заробітної плати та фактично нарахованою заробітною платою за звітний місяць (із заробітної плати / доходу/грошового забезпечення/) доплата до мінімального страхового внеску  <br>(грн. коп.)</td>
      <td align="center" width="13%"> 19. Сума утриманого єдиного внеску за звітний місяць (із заробітної плати / доходу/грошового забезпечення  <br>(грн. коп.)</td>
      <td align="center" width="5%"> 21. Ознака наявності трудової книжки     <br>      (1-так,  0-ні) </td>
      <td align="center" width="5%"> 22. Ознака неповного робочого часу        <br>     (1-так,  0-ні) </td>
      <td align="center" rowspan="2" width="4%">25. Ознака<sup>17</sup> (0,1)</td>
    </tr>
    <tr>
      <td align="center" colspan="5"> 11. Прізвище Iм'я По батькові ЗО  </td>
      <td align="center"> 13. Кількість календарних  днів без збереження заробітної плати *****  </td>
      <td align="center"> 15. Кількість календаних днів відпустки у зв'язку з вагітністю та пологами </td>
      <td align="center"> 17. Сума нарахованої заробітної плати / доходу  /грошового забезпечення у  межах максимальної величини, на яку нараховується єдиний внесок <br>(грн. коп.) </td>
      <td align="center"> 20. Сума нарахованого єдиного внеску за звітний місяць (на заробітну плату / дохід/грошове забезпечення )<br>(грн. коп.)</td>
      <td align="center"> 23. Ознака наявності спецстажу             <br>      (1-так, 0-ні)  </td>
      <td align="center"> 24. Ознака нового робочого місця            <br>     (1-так,  0-ні) </td>
    </tr>
  </thead>
  <tbody id="Process">
    {{#generatorRows}}T1{{{}}}{{/generatorRows}}
  </tbody>
</table>
<br>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1485px">
            <tr>
                <td>&nbsp;</td>
            </tr>
            <tr>
              <td><sup>1</sup> Якщо Д1 подається в складі Розрахунку з типом «Звітний» (пункт 1 розділу ІІІ Порядку).<br/>
                <sup>2</sup> Якщо Д1 подається в складі Розрахунку з типом «Звітний новий» та містить виключно коригування даних відповідно до передбаченого для цього додатку порядку коригування рядків (абзац п’ятий пункту 6 розділу V Порядку);<br/>
                <sup>3</sup> Якщо Д1 подається в складі Розрахунку з типом «Уточнюючий» та містить виключно коригування даних відповідно до передбаченого для цього додатку порядку коригування рядків (абзац п’ятий пункту 6 розділу V Порядку).<br/>
                <sup>4</sup> Якщо Д1 подається в складі Розрахунку з типом «Звітний» як «Довідковий» з позначкою «призначення пенсії» або «призначення матеріального забезпечення, страхових виплат» призначення пенсії та призначення матеріального забезпечення, страхових виплат.<br/>
                <sup>5</sup> Зазначається звітний (податковий) період (календарний рік), за який подається Розрахунок, квартал, за який формується Розрахунок (цифрове значення від 1 до 4), номер Розрахунку, до якого додається Д5 (відповідає номеру, вказаному у заголовній частині Розрахунку), та номер додатку такого виду в Розрахунку.<br/>
                <sup>6</sup> Зазначається код за ЄДРПОУ платника єдиного внеску або реєстраційний (обліковий) номер платника податків, який присвоюється контролюючими органами, або реєстраційний номер облікової картки платника податків - фізичної особи.<br/>
                <sup>7</sup> Серію (за наявності) та номер паспорта зазначають фізичні особи, які через свої релігійні переконання відмовляються від прийняття реєстраційного номера облікової картки платника податків та офіційно повідомили про це відповідний контролюючий орган і мають відмітку у паспорті.<br/>
                <sup>8</sup> Зазначається код за ЄДРПОУ ліквідованого платника єдиного внеску у разі подання правонаступником Розрахунку з типом «Уточнюючий» за осіб, що перебували в трудових відносинах чи відносинах цивільно-правового характеру з платником, який ліквідований.<br/>
                <sup>9</sup> Зазначається код філії, по застрахованим особам якої виправляються дані за попередній звітний період у разі подання платником податків Розрахунку з типом «Уточнюючий».<br/>
                <sup>10</sup> Зазначається позначка у разі подання Д1 для призначення пенсії застрахованим особам.<br/>
                <sup>11</sup> Зазначається позначка у разі подання Д1 для призначення матеріального забезпечення, страхових виплат.<br/>
                <sup>12</sup> Для ідентифікації застрахованої особи у Пенсійному фонді України для фізичних осіб, які через свої релігійні переконання відмовляються від прийняття реєстраційного номера облікової картки платника податків та офіційно повідомили про це відповідний контролюючий орган і мають відмітку у паспорті,
                 зазначаються: для власників паспорта у формі книжечки серія та номер паспорта у форматі БКNNXXXXXX, де БК - константа, що вказує на реєстрацію в Пенсійному фонді України за паспортними даними; NN - дві українські літери серії паспорта (верхній регістр); 
                 XXXXXX - шість цифр номера паспорта (з ведучими нулями) або для власників паспорта у формі пластикової картки у форматі ПХХХХХХХХХ, де П - константа, що вказує на реєстрацію в Пенсійному фонді України за паспортними даними;
                 ХХХХХХХХХ - дев’ять цифр номера паспорта громадянина України у формі пластикової картки типу ID-1, що містить безконтактний електронний носій.<br/>
                 <sup>13</sup> Код категорії ЗО - обирається з таблиці відповідності кодів категорії застрахованої особи та кодів бази нарахування і розмірів ставок єдиного внеску на загальнообов’язкове державне соціальне страхування (додаток 1 до Порядку).<br/>
                 <sup>14</sup>Код типу нарахувань:<br/><p class='textIndent'>1 - сума заробітної плати (доходу) за виконану роботу (надані послуги), строк виконання яких (якої) перевищує календарний місяць, а також за відпрацьований час після звільнення з роботи або згідно з рішенням суду - середня заробітна плата за вимушений прогул, сума грошового забезпечення - нарахована у попередніх звітних (податкових) періодах;</p>
                 <p class='textIndent'>2 - сума заробітної плати (доходу) грошового забезпечення, нарахована у попередніх звітних (податкових) періодах на підставі бухгалтерських та інших документів, відповідно до яких проводиться нарахування (обчислення) або які підтверджують нарахування (обчислення) заробітної плати (доходу), на яку платником податків самостійно донараховано суму єдиного внеску;<p>
                 <p class='textIndent'>3 - сума заробітної плати (доходу) грошового забезпечення, нарахована у попередніх звітних (податкових) періодах на підставі бухгалтерських та інших документів, відповідно до яких проводиться нарахування (обчислення) або які підтверджують нарахування (обчислення) заробітної плати (доходу), на яку платником податків самостійно зменшено зайво нараховану суму єдиного внеску;<p/>
                 <p class='textIndent'>6 - сума заробітної плати (доходу), нарахована у попередніх звітних (податкових) періодах на підставі бухгалтерських та інших документів, відповідно до яких проводиться нарахування (обчислення) або які підтверджують нарахування (обчислення) заробітної плати (доходу), на яку платником податків самостійно донараховано суму внесків на загальнообов’язкове державне пенсійне страхування за період до 01 січня 2011 року;<p/>
                 <p class='textIndent'>7 - сума заробітної плати (доходу), нарахована у попередніх звітних періодах на підставі бухгалтерських та інших документів, відповідно до яких проводиться нарахування (обчислення) або які підтверджують нарахування (обчислення) заробітної плати (доходу), на яку платником податків самостійно зменшено нараховану суму внесків на загальнообов’язкове державне пенсійне страхування за період до 01 січня 2011 року;<p/>
                 <p class='textIndent'>8 - сума заробітної плати (доходу), нарахована у попередніх звітних (податкових) періодах на підставі бухгалтерських та інших документів, відповідно до яких проводиться нарахування (обчислення) або які підтверджують нарахування (обчислення) заробітної плати (доходу), на яку при перевірці органом Пенсійного фонду України донараховано суму внесків на загальнообов’язкове державне пенсійне страхування за період до 01 січня 2011 року;<p/>
                 <p class='textIndent'>9 - сума заробітної плати (доходу), нарахована у попередніх звітних (податкових) періодах на підставі бухгалтерських та інших документів, відповідно до яких проводиться нарахування (обчислення) або які підтверджують нарахування (обчислення) заробітної плати (доходу), на яку при перевірці органом Пенсійного фонду України зменшено нараховану суму внесків на загальнообов’язкове державне пенсійне страхування за період до 01 січня 2011 року;<p/>
                 <p class='textIndent'>10 - нарахована сума заробітку (доходу) грошового забезпечення за дні відпустки;<br/>
                 <p class='textIndent'>11 - сума заробітної плати (доходу) грошового забезпечення, нарахована у попередніх звітних (податкових) періодах на підставі бухгалтерських та інших документів, відповідно до яких проводиться нарахування (обчислення) або які підтверджують нарахування (обчислення) заробітної плати (доходу), на яку при перевірці податковими органами донараховано суму єдиного внеску;<p/>
                 <p class='textIndent'>12 - сума заробітної плати (доходу) грошового забезпечення, нарахована у попередніх звітних (податкових) періодах на підставі бухгалтерських та інших документів, відповідно до яких проводиться нарахування (обчислення) або які підтверджують нарахування (обчислення) заробітної плати (доходу), на яку при перевірці податковими органами зменшено зайво нараховану суму єдиного внеску;<p/>
                 <p class='textIndent'>13 - сума різниці між розміром мінімальної заробітної плати та фактично нарахованою заробітною платою за звітний місяць (із заробітної плати / доходу, грошового забезпечення).<p/>
                 <p class='textIndent'>14 - сума різниці між розміром мінімальної заробітної плати та фактично нарахованої заробітної плати (доходом) за попередні звітні (податкові) періоди, у зв’язку із здійсненням перерахунку при звільненні працівника за попередні періоди, що пов’язані з уточненням днів використаної наперед відпустки (у зв’язку із сторнуванням).<p/>
                 <p class='textIndent'>15 - грошове забезпечення нараховане в поточному звітному (податковому) періоді за минулий звітний (податковий) період відповідно до Порядку виплати грошового забезпечення військовослужбовцям Збройних Сил України та деяким іншим особа, затвердженого наказом Міністерства оборони України від 07.06.2019 № 260, зареєстрованого в Міністерстві юстиції України 26.06.2018 за № 745/32197.<p/>
                 <sup>15</sup> Місяць та рік, за який проведено нарахування,- реквізит обов’язково повинен бути заповнений.<br/>
                 <sup>16</sup> Кількість календарних днів без збереження заробітної плати - кількість календарних днів.<br/>
                 <sup>17</sup> Відображається ознака «0», якщо рядок потрібно ввести, чи ознака «1», якщо рядок потрібно виключити. Графа 25 заповнюється тільки для «Звітного нового» (при коригуванні сум єдиного внеску та реквізитів) та «Уточнюючого» (виключно при коригуванні реквізитів) цього Додатку.<br/>
                 </td>
            </tr>
          </table>
          <table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1485px">
            <tr>
                <td colspan="5">&nbsp;</td>
            </tr>
        </table>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1485px">
            <tr>
                <td colspan="5">&nbsp;</td>
            </tr>
        </table>
        <table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1485px">
            <tr>
                <td width="10%">
                    Дата подання
                </td>
                <td class="borderDataA" width="20%" align="center">{{#dateInput}}DECLAR.DECLARBODY.HFILL{{{}}}{{/dateInput}}</td>
                <td width="30%">&nbsp;</td>
                <td width="40%" align="right">
                    Наведена інформація є повною і достовірною.
                </td>
            </tr>
            <tr>
                <td colspan="5">&nbsp;</td>
            </tr>
        </table>
        <table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1485px">
            <tr>
                <td width="25%">
                    Керівник (уповноважена особа)/ фізична особа (законний представник)
                </td>
                <td class="borderDataA" width="30%">{{#textInput}}DECLAR.DECLARBODY.HKBOS{{{}}}{{/textInput}}</td>
                <td width="6%">&nbsp;</td>
                <td width="15%">&nbsp;</td>
                <td width="6%">&nbsp;</td>
                <td width="15%">{{#textInput}}DECLAR.DECLARBODY.HBOS{{{}}}{{/textInput}}</td>
                <td width="3%">&nbsp;</td>
            </tr>
            <tr>
                <td>&nbsp;</td>
                <td align="center" class="HKSubtitle">
                    (Реєстраційний номер облікової картки платника податків або серія (за наявності) та номер паспорта<sup>7</sup>)
                <td>&nbsp;</td>
                <td class="topBorder HKSubtitle" align="center">(підпис)</td>
                <td>&nbsp;</td>
                <td class="topBorder HKSubtitle" align="center">(власне ім’я та прізвище)</td>
                <td>&nbsp;</td>
            </tr>
            <tr>
                <td colspan="3">&nbsp;</td>
                <td colspan="4" align="center">
                    М. П. (за наявності)
                <td>
            </tr>
        </table>
        <table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1485px">
            <tr>
                <td width="25%">
                    Головний бухгалтер (особа,відповідальна за ведення бухгалтерського обліку)
                </td>
                <td class="borderDataA" width="30%">{{#textInput}}DECLAR.DECLARBODY.HKBUH{{{}}}{{/textInput}}</td>
                <td width="6%">&nbsp;</td>
                <td width="15%">&nbsp;</td>
                <td width="6%">&nbsp;</td>
                <td width="15%">{{#textInput}}DECLAR.DECLARBODY.HBUH{{{}}}{{/textInput}}</td>
                <td width="3%">&nbsp;</td>
            </tr>
            <tr>
                <td>&nbsp;</td>
                <td align="center" class="HKSubtitle">
                    (Реєстраційний номер облікової картки платника податків або серія (за наявності) та номер паспорта<sup>7</sup>)
                    <td>&nbsp;</td>
                    <td class="topBorder HKSubtitle" align="center">(підпис)</td>
                    <td>&nbsp;</td>
                    <td class="topBorder HKSubtitle" align="center">(власне ім’я та прізвище)</td>
                    <td>&nbsp;</td>
            </tr>
            <tr>
                <td colspan="5">&nbsp;</td>
            </tr>
        </table>
<style>
    .aroundBorder {
        border: 1px solid #000;
    }
    .borderDataA {
        border: 1px solid #000;
    }
    .joinTables {
        border-bottom: 1px solid #000;
        border-right: 1px solid #000;
        border-left: 1px solid #000;
    }
    .postmanAddress {
        padding: 0 40px;
        border-top: 1px solid #000;
        border-bottom: 1px solid #000;
    }
    .subtableHedaer {
        font-weight: 800;
    }
    .topBorder {
        border-top: 1px solid #000;
    }
    .HKSubtitle {
        font-size: 12px;
    }
    .leftBorder {
        border-left: 1px solid #000;
    }
    .borderRight{
        border-right: 1px solid #000;
    }
    .textIndent{
      text-indent: 20px;
    }
</style>`
