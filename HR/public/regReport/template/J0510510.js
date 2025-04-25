module.exports = `
<!--%pageOrientation:landscape-->
<!-- background: aqua -->
<html>
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    </head>
    <body>
        <table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1485px">
            <tr>
                <td width="20%" align="center">Відмітка про отримання<br/>(штамп контролюючого органу)</td>
                <td width="58%"></td>
                <td width="22%">Додаток 5<br/>до Податкового розрахунку сум доходу,<br/>нарахованого (сплаченого) на користь<br/>платників податків - фізичних осіб,<br/>і сум утриманого з них податку, а також <br/>сум нарахованого єдиного внеску (Д5)<br/>(пункт 5 розділу IV)</td>
            </tr>
            <tr>
                <td colspan="3">&nbsp;</td>
            </tr>
        </table>
        <table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1485px">
            <tr>
                <td class="aroundBorder" width="5%" rowspan="3" align="center">01</td>
                <td class="aroundBorder subtableHedaer" align="center" width="70%" rowspan="3" >
                    Відомості про трудові відносини осіб та період проходження військової служби
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
                <td colspan="5">&nbsp;</td>
            </tr>
        </table>
        <table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1485px">
         <tr>
            <td rowspan="2" class="aroundBorder" width="5%" align="center">02</td>
            <td rowspan="2" class="aroundBorder " width="15%">Звітний (податковий) період<sup>4</sup></td>
            <td class="aroundBorder" width="20%" align="center">{{#intInput}}DECLAR.DECLARBODY.HZY{{{}}}{{/intInput}}</td>
            <td class="aroundBorder" width="20%" align="center">{{#intInput}}DECLAR.DECLARBODY.PERIOD_MONTH{{{}}}{{/intInput}}</td>
            <td class="aroundBorder" width="40%" align="center" rowspan="2"></td>
        </tr>
        <tr>
            <td class="topBorder aroundBorder" width="20%" align="center">(рік)</td>
            <td class="topBorder aroundBorder" width="20%" align="center">(місяць)</td>
        </tr>
            <tr>
                <td colspan="5">&nbsp;</td>
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
                <td class="aroundBorder" width="80%" colspan="7" align="center">(повне найменування (прізвище, ім’я, по батькові (за наявності) платника згідно з реєстраційними документами, дата та номер договору (угоди))</td>
            </tr>
            
            <tr>
                <td colspan="9">&nbsp;</td>
            </tr>
        </table>
        <table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1485px">
            <tr>
                <td class="aroundBorder" width="5%" align="center">031</td>
                <td class="aroundBorder" width="70%">Податковий номер<sup>5</sup> або серія (за наявності) та номер паспорта<sup>6</sup> платника єдиного внеску</td>
                <td class="aroundBorder" width="25%" align="center">{{#textInput}}DECLAR.DECLARBODY.HTIN####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}</td>
            </tr>
            <tr>
                <td class="leftBorder" colspan="5">&nbsp;</td>
            </tr>
                        <tr>
                <td class="aroundBorder" width="5%" align="center">032</td>
                <td class="aroundBorder" width="70%">Податковий номер  ліквідованого платника єдиного внеску (заповнюється у разі подання розрахунку правонаступником
                при поданні розрахунку з типом «Уточнюючий»<sup>7</sup>)</td>
                <td class="aroundBorder" width="25%" align="center">{{#textInput}}DECLAR.DECLARBODY.HTIN1####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}</td>
            </tr>
            <tr>
                <td class="leftBorder" colspan="5">&nbsp;</td>
            </tr>
            <tr>
                <td class="aroundBorder" width="5%" align="center">033</td>
                <td class="aroundBorder" width="70%">Код філії (заповнюється у разі подання платником єдиного внеску відомостей про філію при поданні розрахунку з типом «Уточнюючий»<sup>8</sup></td>
                <td class="aroundBorder" width="25%" align="center">{{#textInput}}DECLAR.DECLARBODY.HFIL####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}</td>
            </tr>
            <tr>
                <td colspan="5">&nbsp;</td>
            </tr>
        </table>
        <table id="table" style="table-layout: auto; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse; border: 1px solid black;" border="1" cellspacing="0" cellpadding="0px" bordercolor="black" width="1485px">
            <thead>
            <tr>
                <td align="center" rowspan="2" width="2%" class="no-print">&nbsp;</td>
                <td align="center" rowspan="2" width="2%">04 №  з/п</td>
                <td class="rotated" rowspan="2" width="5%">05 Громадянин України (1 - так, 0 - ні)</td>
                <td align="center" rowspan="2" width="7%">06 Договір ЦПХ за основним місцем роботи або  за сумісництвом <br>(1 - так, 0 -  ні)</td>
                <td align="center" rowspan="2" width="6%">07 Категорія особи<sup>9</sup> </td>
                <td align="center" rowspan="2" width="10%">08 Реєстраційний номер облікової картки платника податків або серія (за наявності) та номер паспорта за формою БКNNХХХХХХ/ПХХХХХХХХХ застрахованої особи<sup>10</sup></td>
                <td align="center" colspan="3" rowspan="2" width="18%">09 Прізвище, ім'я, по батькові застрахованої особи</td>
                <td align="center" colspan="2" width="10%">10 Період трудових або цивільно-правових відносин, проходження військової служби та відпусток</td>
                <td align="center" width="10%">11 Внутрішній сумісник (1 - так, 0 - ні)</td>
                <td align="center" width="8%"> 13 Професійна назва роботи</td>
                <td align="center" width="8%"> 14 Код класифікатора  професій</td>
                <td align="center" width="13%">16 Документ підстава про початок, кінець трудових або цивільно - правових відносин, переведення на іншу посаду, роботи та відпусток</td>
                <td align="center" width="11%">18 Дата створення нового робочого місця (штатної одиниці), на яке  у звітному періоді працевлаштований працівник</td>
                <td align="center" rowspan="2" width="2%">20 Ознака<sup>11</sup> (0,1)</td>
            </tr>
            <tr>
                <td align="center" width="5%">дата початку (за формою ДДММРРРР)</td>
                <td align="center" width="5%">дата закінчення (за формою ДДММРРРР)</td>
                <td align="center">12 Переведено, призначено на іншу посаду або роботу, переміщено до іншого підрозділу (1 - так, 0 - ні)</td>
                <td align="center" colspan="2">15 Посада</td>
                <td align="center">17 Підстава для припинення трудових або цивільно – правових відносин</td>
                <td align="center">19 Військове звання</td>
            </tr>
            </thead>
            <tbody id="Process">
                {{#generatorRows}}T1{{{}}}{{/generatorRows}}
            </tbody>
        </table>
          <table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1485px">
            <tr>
                <td>&nbsp;</td>
            </tr>
            <tr>
              <td><sup>1</sup> Якщо Д5 подається в складі Розрахунку з типом «Звітний» (пункт 1 розділу ІІІ Порядку).<br/>
                <sup>2</sup> Якщо Д5 подається в складі Розрахунку з типом «Звітний новий» та містить виключно коригування даних відповідно до передбаченого для цього додатку порядку коригування рядків (абзац п’ятий пункту 7 розділу V Порядку);<br/>
                <sup>3</sup> Якщо Д5 подається в складі Розрахунку з типом «Уточнюючий» та містить виключно коригування даних відповідно до передбаченого для цього додатку порядку коригування рядків (абзац п’ятий пункту 7 розділу V Порядку).<br/>
                <sup>4</sup> Зазначається звітний (податковий) період (календарний рік) та місяць (цифрове значення від 1 до 12) за який подається Розрахунок<br/>
                <sup>5</sup> Зазначається код згідно з ЄДРПОУ платника єдиного внеску або реєстраційний (обліковий) номер платника податків, який присвоюється контролюючими органами, або реєстраційний номер облікової картки платника податків - фізичної особи.<br/>
                <sup>6</sup> Серію (за наявності) та номер паспорта зазначають фізичні особи, які через свої релігійні переконання відмовляються від прийняття реєстраційного номера облікової картки платника податків та офіційно повідомили про це відповідний контролюючий орган і мають відмітку у паспорті.<br/>
                <sup>7</sup> Зазначається код згідно з ЄДРПОУ ліквідованого платника єдиного внеску у разі подання правонаступником Розрахунку з типом «Уточнюючий» за осіб, що перебували в трудових відносинах чи відносинах цивільно-правового характеру з платником, який ліквідований.<br/>
                <sup>8</sup> Зазначається код філії, по застрахованим особам якої виправляються дані за попередній звітний період у разі подання платником податків Розрахунку з типом «Уточнюючий».<br/>
                <sup>9</sup> Категорія особи: 1 - наймані працівники (з трудовою книжкою); 2 - наймані працівники (без трудової книжки); 3 - особи, які виконують роботи за договорами цивільно-правового характеру; 4 - особи, яким надано відпустку по догляду за дитиною від трирічного віку до досягнення нею шестирічного віку; 
                5 - особи, яким надано відпустку у зв’язку з вагітністю та пологами; 6 - особи, яким надано відпустку по догляду за дитиною до досягнення нею трирічного віку; 7 - особи, із числа військовослужбовців, особи рядового і начальницького складу, 
                які отримують допомогу у зв’язку з вагітністю та пологами; 8 - особи із числа військовослужбовців, особи рядового і начальницького складу; 9-особи, які є гіг-спеціалістами за гіг-контрактом.<br/>
                <sup>10</sup> Для ідентифікації застрахованої особи у Пенсійному фонді України для фізичних осіб, які через свої релігійні переконання відмовляються від прийняття реєстраційного номера облікової картки платника податків та офіційно повідомили про це відповідний контролюючий орган і мають відмітку у паспорті,
                 зазначаються: для власників паспорта у формі книжечки серія та номер паспорта у форматі БКNNXXXXXX, де БК - константа, що вказує на реєстрацію в Пенсійному фонді України за паспортними даними; NN - дві українські літери серії паспорта (верхній регістр); 
                 XXXXXX - шість цифр номера паспорта (з ведучими нулями) або для власників паспорта у формі пластикової картки у форматі ПХХХХХХХХХ, де П - константа, що вказує на реєстрацію в Пенсійному фонді України за паспортними даними;
                 ХХХХХХХХХ - дев’ять цифр номера паспорта громадянина України у формі пластикової картки типу ID-1, що містить безконтактний електронний носій.<br/>
                 <sup>11</sup> Відображається ознака «0», якщо рядок потрібно ввести, чи ознака «1», якщо рядок потрібно виключити. Графа 20 заповнюється для «Звітного нового» та «Уточнюючого» Розрахунків.
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
                <td width="10%">Дата подання</td>
                <td class="borderDataA" width="20%" align="center">{{#dateInput}}DECLAR.DECLARBODY.HFILL{{{}}}{{/dateInput}}</td>
                <td width="30%">&nbsp;</td>
                <td width="40%" align="right">Наведена інформація є повною і достовірною.</td>
            </tr>
            <tr>
                <td colspan="5">&nbsp;</td>
            </tr>
        </table>
        <table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1485px">
            <tr>
                <td width="25%">Керівник (уповноважена особа)/ фізична особа (законний представник)</td>
                <td class="borderDataA" width="30%">{{#textInput}}DECLAR.DECLARBODY.HKBOS{{{}}}{{/textInput}}</td>
                <td width="6%">&nbsp;</td>
                <td width="15%">&nbsp;</td>
                <td width="6%">&nbsp;</td>
                <td width="15%">{{#textInput}}DECLAR.DECLARBODY.HBOS{{{}}}{{/textInput}}</td>
                <td width="3%">&nbsp;</td>
            </tr>
            <tr>
                <td>&nbsp;</td>
                <td align="center" class="HKSubtitle">(Реєстраційний номер облікової картки платника податків або серія (за наявності) та номер паспорта<sup>7</sup>)</td>
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
                <td width="25%">Головний бухгалтер (особа,відповідальна за ведення бухгалтерського обліку)</td>
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
                    (Реєстраційний номер облікової картки платника податків або серія (за наявності) та номер паспорта<sup>7</sup>)</td>
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
    </body>
</html>
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
    .rotated {
        writing-mode: tb-rl !important;
    }
</style>
`
