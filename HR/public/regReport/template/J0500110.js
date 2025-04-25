
module.exports = `
<!--%pageOrientation:landscape-->
<!-- background: aqua -->
<html>
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    </head>
    <body>
        <table data-table="01" style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
            <tr>
                <td width="33%" align="center">
                    Відмітка про отримання<br/>(штамп контролюючого органу)
                </td>
                <td width="33%"></td>
                <td width="33%">
                    ЗАТВЕРДЖЕНО<br/>Наказ Міністерства фінансів України<br/>13 січня 2015 року № 4<br/>(у редакції наказу<br/>Міністерства фінансів України<br/>від 24 січня 2025 року № 39)
                </td>
            </tr>
            <tr>
                <td colspan="3">&nbsp;</td>
            </tr>
        </table>
        <table data-table="02" style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
            <tr>
                <td class="aroundBorder" width="5%" rowspan="3" align="center">01</td>
                <td class="aroundBorder" width="70%" rowspan="3" >
                    ПОДАТКОВИЙ РОЗРАХУНОК СУМ ДОХОДУ, НАРАХОВАНОГО (СПЛАЧЕНОГО) НА КОРИСТЬ ПЛАТНИКІВ ПОДАТКІВ - ФІЗИЧНИХ ОСІБ, І СУМ УТРИМАНОГО З НИХ ПОДАТКУ, А ТАКОЖ СУМ НАРАХОВАНОГО ЄДИНОГО ВНЕСКУ
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
        <table data-table="03" style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
            <tr>
                <td class="aroundBorder" width="5%" align="center">02</td>
                <td class="aroundBorder" width="35%">Звітний (податковий) період<sup>4</sup></td>
                <td class="aroundBorder" width="15%" align="center">{{#intSpanInput}}DECLAR.DECLARBODY.HZY{{{}}}{{/intSpanInput}}</td>
                <td class="aroundBorder" width="20%" align="center">{{#intSpanInput}}DECLAR.DECLARBODY.PERIOD_MONTH{{{}}}{{/intSpanInput}}</td>
                <td class="aroundBorder" width="25%" align="center">{{#intSpanInput}}DECLAR.DECLARBODY.HNUM{{{}}}{{/intSpanInput}}</td>
            </tr>
            <tr>
                <td class="" width="5%" align="center">&nbsp;</td>
                <td class="" width="35%">&nbsp;</td>
                <td class="topBorder" width="15%" align="center">(рік)</td>
                <td class="topBorder" width="20%" align="center">(місяць)</td>
                <td class="topBorder" width="25%" align="center">(номер Розрахунку)</td>
            </tr>
            <tr>
                <td colspan="5">&nbsp;</td>
            </tr>
        </table>
        <table data-table="04" style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
            <tr>
                <td class="aroundBorder" width="5%" align="center" rowspan="2">03</td>
                <td class="aroundBorder" width="15%" rowspan="2">Платник<sup>5</sup></td>
                <td class="borderTopRightLeft" width="80%"  align="center" colspan="7">
                   {{#textInput}}DECLAR.DECLARBODY.HNAME####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}</td>
            </tr>
            <tr>
                <td align="right" width="30%"></td>
                <td align="right" width="10%">від </td>
                <td align="center" width="9%">{{#dateInput}}DECLAR.DECLARBODY.HDDGV####{"style": "width: 100px; font-weight: bold;"}{{{}}}{{/dateInput}}</td>
                <td align="center" width="2%">№</td>
                <td align="center" width="9%">{{#textInput}}DECLAR.DECLARBODY.HNDGV####{"style": "width: 200px; text-align: left; font-weight: bold;"}{{{}}}{{/textInput}}</td>
                <td align="center" width="10%"></td>
                <td class="borderRight" align="right" width="30%"></td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center" colspan="11">
                    повне найменування (прізвище, ім’я, по батькові (за наявності) платника згідно з реєстраційними документами, дата та номер договору (угоди))
                </td>
            </tr>
            <tr>
                <td colspan="9">&nbsp;</td>
            </tr>
        </table>
        <table data-table="05" style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
            <tr>
                <td class="aroundBorder" width="5%" align="center">031</td>
                <td class="aroundBorder" width="50%">
                    Податковий номер<sup>6</sup> або серія (за наявності) та номер паспорта<sup>7</sup> платника
                </td>
                <td class="aroundBorder" width="45%" align="center">{{#textInput}}DECLAR.DECLARBODY.HTIN####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}</td>
            </tr>
            <tr>
                <td colspan="5">&nbsp;</td>
            </tr>
        </table>        
        <table data-table="06" style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
            <tr>
                <td class="aroundBorder" width="5%" align="center">032</td>
                <td class="aroundBorder" width="30%" align="center">{{#textInput}}DECLAR.DECLARBODY.HKATOTTG####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}</td>
                <td class="aroundBorder" width="65%">Код адміністративно-територіальної одиниці за Кодифікатором адміністративно територіальних одиниць та територій територіальних громад, затвердженим наказом, затвердженого наказом Міністерства розвитку громад та територій України від 26 листопада 2020 року № 290 (в редакції наказу Міністерства розвитку громад, територій та інфраструктури України від 12 січня 2021 року № 3) (КАТОТТГ)</td>
            </tr>
            <tr>
                <td colspan="5">&nbsp;</td>
            </tr>
        </table>
        <table data-table="07" style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
            <tr>
                <td class="aroundBorder" width="5%" rowspan="3" align="center">033</td>
                <td class="aroundBorder" colspan="2">
                    Відокремлений підрозділ юридичної особи (якщо Розрахунок подається податковий агент за відокремлений підрозділ)
                </td>
            </tr>
            <tr>
                <td class="aroundBorder" colspan="2">{{#textInput}}DECLAR.DECLARBODY.HNAME1####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center" colspan="2">
                    (повне найменування відокремленого підрозділу)
                </td>
            </tr>
        </table>
        <table data-table="08" style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
            <tr>
                <td class="joinTables" width="5%" align="center">034</td>
                <td class="joinTables" width="75%">
                    Податковий номер ліквідованого платника єдиного внеску (заповнюється у разі подання розрахунку правонаступником при поданні розрахунку з типом «Уточнюючий»<sup>8</sup>)
                </td>
                <td class="joinTables" width="20%">{{#textInput}}DECLAR.DECLARBODY.HTIN1####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">035</td>
                <td class="aroundBorder">
                    Код філії (заповнюється у разі подання платником єдиного внеску відомостей про філію при поданні розрахунку з типом «Уточнюючий»<sup>9</sup>)
                </td>
                <td class="aroundBorder">{{#textInput}}DECLAR.DECLARBODY.HFIL####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}</td>
            </tr>
        </table>
        <table data-table="09" style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
            <tr>
                <td class="joinTables" width="5%" rowspan="4" align="center">04</td>
                <td class="joinTables" width="50%">Податкова адреса</td>
                <td class="joinTables" width="25%">Поштовий індекс</td>
                <td class="joinTables" width="20%" align="center">{{#intInput}}DECLAR.DECLARBODY.HZIP####{"style": "font-weight: bold;"}{{{}}}{{/intInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" rowspan="3">{{#textInput}}DECLAR.DECLARBODY.HLOC####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}</td>
                <td class="aroundBorder">Телефон</td>
                <td class="aroundBorder">{{#textInput}}DECLAR.DECLARBODY.HTEL####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder">Факс</td>
                <td class="aroundBorder">{{#textInput}}DECLAR.DECLARBODY.HFAX####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder">Електронна адреса</td>
                <td class="aroundBorder">{{#textInput}}DECLAR.DECLARBODY.HEMAIL####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}</td>
            </tr>
        </table>
        <table data-table="010" style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
            <tr>
                <td class="joinTables" width="5%" align="center" rowspan="2">05</td>
                <td width="20%" align="left">Розрахунок подається до</td>
                <td width="75%" align="left">{{#textInput}}DECLAR.DECLARBODY.HSTI####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center" colspan="2">
                    (найменування контролюючого органу, до якого подається Розрахунок)
                </td>
            </tr>
        </table>
        <table data-table="011" style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
            <tr>
                <td class="joinTables" width="5%" align="center">06</td>
                <td class="joinTables" width="65%">Інформація про додатки, що додаються до Розрахунку та є його невід’ємною частиною</td>
                <td class="joinTables" width="18%" align="center">наявність<br/>додатків (відмітка<br/>"Х" у разі<br/>наявності додатка)</td>
                <td class="joinTables" width="12%" align="center">кількість аркушів</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">061</td>
                <td class="aroundBorder">
                    Відомості про нарахування заробітної плати (доходу, грошового забезпечення) застрахованим особам
                <td class="aroundBorder" align="center">{{#DECLAR.DECLARBODY.R061G3}}X{{/DECLAR.DECLARBODY.R061G3}}</td>
                <td class="aroundBorder" align="center">{{#intSpanInput}}DECLAR.DECLARBODY.R061G4{{{}}}{{/intSpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">062</td>
                <td class="aroundBorder">
                    Відомості про осіб, які доглядають за дитиною до досягнення нею трирічного віку та відповідно до закону отримують допомогу по догляду за дитиною до досягнення нею трирічного віку та/або при народженні дитини, при усиновленні дитини, та осіб із числа непрацюючих працездатних батьків, усиновителів, опікунів, піклувальників, які фактично здійснюють догляд за дитиною з інвалідністю, дитиною, хворою на тяжке перинатальне ураження нервової системи, тяжку вроджену ваду розвитку, рідкісне орфанне захворювання, онкологічне, онкогематологічне захворювання, дитячий церебральний параліч, тяжкий психічний розлад, цукровий діабет I типу (інсулінозалежний), гостре або хронічне захворювання нирок IV ступеня, за дитиною, яка отримала тяжку травму, потребує трансплантації органа, потребує паліативної допомоги, якій не встановлено інвалідність, а також непрацюючих працездатних осіб, які здійснюють догляд за особою з інвалідністю I групи або за особою похилого віку, яка за висновком медичного закладу потребує постійного стороннього догляду або досягла 80-річного віку, якщо такі непрацюючі працездатні особи отримують допомогу, надбавку або компенсацію відповідно до законодавства, та нарахування сум єдиного внеску за патронатних вихователів, батьків-вихователів дитячих будинків сімейного типу, прийомних батьків, якщо вони отримують грошове забезпечення відповідно до законодавства
                </td>
                 <td class="aroundBorder" align="center">{{#intSpanInput}}DECLAR.DECLARBODY.R062G3{{{}}}{{/intSpanInput}}</td>
                <td class="aroundBorder" align="center">{{#intSpanInput}}DECLAR.DECLARBODY.R062G3{{{}}}{{/intSpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">063</td>
                <td class="aroundBorder">Відомості про осіб, які проходять строкову військову службу</td>
                 <td class="aroundBorder" align="center">{{#intSpanInput}}DECLAR.DECLARBODY.R063G3{{{}}}{{/intSpanInput}}</td>
                <td class="aroundBorder" align="center">{{#intSpanInput}}DECLAR.DECLARBODY.R063G4{{{}}}{{/intSpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">064</td>
                <td class="aroundBorder">Відомості про суми нарахованого доходу, утриманого та сплаченого податку на доходи фізичних осіб та військового збору</td>
                 <td class="aroundBorder" align="center">{{#DECLAR.DECLARBODY.R064G3}}X{{/DECLAR.DECLARBODY.R064G3}}</td>
                <td class="aroundBorder" align="center">{{#intSpanInput}}DECLAR.DECLARBODY.R064G4{{{}}}{{/intSpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">065</td>
                <td class="aroundBorder">Відомості про трудові відносини осіб та період проходження військової служби</td>
                 <td class="aroundBorder" align="center">{{#DECLAR.DECLARBODY.R065G3}}X{{/DECLAR.DECLARBODY.R065G3}}</td>
                <td class="aroundBorder" align="center">{{#intSpanInput}}DECLAR.DECLARBODY.R065G4{{{}}}{{/intSpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">066</td>
                <td class="aroundBorder">Відомості про наявність підстав для обліку стажу окремим категоріям осіб відповідно до законодавства</td>
                 <td class="aroundBorder" align="center">{{#DECLAR.DECLARBODY.R066G3}}X{{/DECLAR.DECLARBODY.R066G3}}</td>
                <td class="aroundBorder" align="center">{{#intSpanInput}}DECLAR.DECLARBODY.R066G4{{{}}}{{/intSpanInput}}</td>
            </tr>
            <tr>
                <td class="joinTables" width="5%" align="center">07</td>
                <td class="joinTables" width="65%">Код основного виду економічної діяльності</td>
                <td class="joinTables" width="18%" align="center">{{#intInput}}DECLAR.DECLARBODY.HKVED####{"style": "font-weight: bold;"}{{{}}}{{/intInput}}</td>
                <td class="joinTables" width="12%" align="center"></td>
                  
            </tr>
            <tr>
                <td class="joinTables" align="center">08</td>
                <td class="joinTables" colspan="2">Клас професійного ризику виробництва</td>
                <td class="joinTables" align="center">
                    {{#textInput}}DECLAR.DECLARBODY.CLASSRISK{{{}}}{{/textInput}}
                </td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">09</td>
                <td class="aroundBorder">
                    Ознака платника єдиного внеску
                </td>
                <td class="aroundBorder" align="center" colspan="2">
                    Відмітка «х»<br/>про відповідну ознаку
                </td>
            </tr>
            <tr>
                <td class="joinTables" align="center">091</td>
                <td class="joinTables">Роботодавець</td>
                <td class="joinTables align="center">{{#booleanInput}}DECLAR.DECLARBODY.R091G3{{{}}}{{/booleanInput}}</td>
                <td class="joinTables" align="center">&nbsp;</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">092</td>
                <td class="aroundBorder">Бюджетна установа</td>
                <td class="aroundBorder" align="center">{{#booleanInput}}DECLAR.DECLARBODY.R092G3{{{}}}{{/booleanInput}}</td>
                <td class="aroundBorder" align="center">&nbsp;</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">093</td>
                <td class="aroundBorder">Підприємство, організація всеукраїнської громадської організації інвалідів, зокрема Українського товариства глухих та Українського товариства сліпих (далі – УТОГ та УТОС)</td>
                <td class="aroundBorder" align="center">{{#booleanInput}}DECLAR.DECLARBODY.R093G3{{{}}}{{/booleanInput}}</td>
                <td class="aroundBorder" align="center">&nbsp;</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">094</td>
                <td class="aroundBorder">Підприємство, організація громадської організації  осіб з інвалідністю</td>
                <td class="aroundBorder" align="center">{{#booleanInput}}DECLAR.DECLARBODY.R094G3{{{}}}{{/booleanInput}}</td>
                <td class="aroundBorder" align="center">&nbsp;</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">095</td>
                <td class="aroundBorder">Резидент Дія Сіті</td>
                <td class="aroundBorder" align="center">{{#booleanInput}}DECLAR.DECLARBODY.R095G3{{{}}}{{/booleanInput}}</td>
                <td class="aroundBorder" align="center">&nbsp;</td>
            </tr>
        </table>
        <table data-table="1" style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
            <tr>
                <td class="joinTables" width="5%" align="center">10</td>
                <td class="joinTables" width="65%">Чисельність працівників</td>
                <td class="joinTables" width="30%" align="center">Показники кількості<br/>працівників<br/>в цілих одиницях)</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">101</td>
                <td class="aroundBorder">Середньооблікова кількість штатних працівників за звітний період, осіб</td>
                <td class="aroundBorder" align="center">{{#intSpanInput}}DECLAR.DECLARBODY.R101G3{{{}}}{{/intSpanInput}}</td>
            </tr>
             <tr>
                <td class="aroundBorder" colspan="3">у т. ч. </td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">101.1</td>
                <td class="aroundBorder">працівників, яким відповідно до чинного законодавства встановлено інвалідність, осіб</td>
                <td class="aroundBorder" align="center">{{#intSpanInput}}DECLAR.DECLARBODY.R102G3{{{}}}{{/intSpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">101.2</td>
                <td class="aroundBorder">працівників, що мають додаткові гарантії в сприянні працевлаштуванню</td>
                <td class="aroundBorder" align="center">{{#intSpanInput}}DECLAR.DECLARBODY.R103G3{{{}}}{{/intSpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">102</td>
                <td class="aroundBorder">Облікова кількість штатних працівників</td>
                <td class="aroundBorder" align="center">{{#intSpanInput}}DECLAR.DECLARBODY.R104G3{{{}}}{{/intSpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">103</td>
                <td class="aroundBorder">Кількість застрахованих осіб у звітному періоді, яким нараховано заробітну плату/(крім осіб, яким у звітному періоді нараховано грошове забезпечення)</td>
                <td class="aroundBorder" align="center">{{#intSpanInput}}DECLAR.DECLARBODY.R105G3{{{}}}{{/intSpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">104</td>
                <td class="aroundBorder">Кількість застрахованих осіб, яким у звітному періоді нараховано грошове забезпечення</td>
                <td class="aroundBorder" align="center">{{#intSpanInput}}DECLAR.DECLARBODY.R106G3{{{}}}{{/intSpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">105</td>
                <td class="aroundBorder">Кількість застрахованих осіб у звітному періоді з числа непрацюючих інших з подружжя працівників дипломатичної служби, яким нараховано єдиний внесок</td>
                <td class="aroundBorder" align="center">{{#intSpanInput}}DECLAR.DECLARBODY.R107G3{{{}}}{{/intSpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">106</td>
                <td class="aroundBorder">Жінок</td>
                <td class="aroundBorder" align="center">{{#intSpanInput}}DECLAR.DECLARBODY.R108G3{{{}}}{{/intSpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">107</td>
                <td class="aroundBorder">Чоловіків</td>
                <td class="aroundBorder" align="center">{{#intSpanInput}}DECLAR.DECLARBODY.R109G3{{{}}}{{/intSpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">108</td>
                <td class="aroundBorder">Кількість створених нових робочих місць у звітному періоді</td>
                <td class="aroundBorder" align="center">{{#intSpanInput}}DECLAR.DECLARBODY.R110G3{{{}}}{{/intSpanInput}}</td>
            </tr>
        </table>
        <table data-table="2" style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
            <tr>
                <td colspan="3">&nbsp;</td>
            </tr>
        </table>
        <table data-table="3" style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
            <tr>
                <td class="aroundBorder" width="5%" align="center">Код рядка</td>
                <td class="aroundBorder subtableHedaer" width="65%" align="center">
                    І. Нарахування доходу та єдиного внеску за найманих працівників 
                </td>
                <td class="aroundBorder" width="30%" align="center">(грн, коп.)</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">1</td>
                <td class="aroundBorder">Загальна сума нарахованого доходу, усього (р. 1.1 + р. 1.2 +р. 1.3 + р. 1.4 + р. 1.5)</td>
                <td class="aroundBorder" align="center">{{#currencyInput}}DECLAR.DECLARBODY.R0101G3{{{}}}{{/currencyInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">1.1</td>
                <td class="aroundBorder">сума нарахованої заробітної плати</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R01011G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">1.2</td>
                <td class="aroundBorder">сума винагороди за договорами цивільно-правового характеру</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R01012G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">1.3</td>
                <td class="aroundBorder">сума оплати перших п’яти днів тимчасової непрацездатності, що здійснюється за рахунок коштів платника податків</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R01013G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">1.4</td>
                <td class="aroundBorder">сума допомоги по тимчасовій непрацездатності, яка виплачується за рахунок коштів Пенсійного фонду України</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R01014G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">1.5</td>
                <td class="aroundBorder">сума допомоги у зв’язку з вагітністю та пологами</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R01015G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">1.6</td>
                <td class="aroundBorder">сума нарахованої заробітної плати за найманих працівників, призваних під час мобілізації на військову службу до Збройних Сил України,
які не отримували доходи у вигляді грошового забезпечення<sup class="sup">10</sup> з них:</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R01016G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
             <tr>
                <td class="aroundBorder" align="center">1.6.1</td>
                <td class="aroundBorder">5,3%</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R010161G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
             <tr>
                <td class="aroundBorder" align="center">1.6.2</td>
                <td class="aroundBorder">5,5%</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R010162G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
             <tr>
                <td class="aroundBorder" align="center">1.6.3</td>
                <td class="aroundBorder">22%</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R010163G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
            
        </table>
        <table data-table="4" style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
            <tr>
                <td class="joinTables" width="5%" align="center">2</td>
                <td class="joinTables" width="65%">Сума нарахованого доходу у межах максимальної величини, на яку нараховується<br/>єдиний внесок, усього (р. 2.1 + р. 2.2 + р. 2.3 + р. 2.4 + р. 2.5)</td>
                <td class="joinTables" width="30%" align="center">{{#currencyInput}}DECLAR.DECLARBODY.R0102G3{{{}}}{{/currencyInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">2.1</td>
                <td class="aroundBorder">Роботодавцями (22 %)</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R01021G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">2.2</td>
                <td class="aroundBorder">Підприємствами, установами і організаціями, фізичними особами - підприємцями,<br/>у тому числі тими, які обрали спрощену систему оподаткування, працюючим особам з інвалідністю (8,41 %)</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R01022G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">2.3</td>
                <td class="aroundBorder">Підприємствами та організаціями всеукраїнських громадських організацій осіб з інвалідністю, зокрема товариств УТОГ, УТОС (5,3 %)</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R01023G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">2.4</td>
                <td class="aroundBorder">Підприємствами та організаціями громадських організацій осіб з інвалідністю,<br/>працюючим особам з інвалідністю (5,5 %)</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R01024G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">2.5</td>
                <td class="aroundBorder">додаткова база нарахування єдиного внеску (22 %)</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R01025G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">2.6</td>
                <td class="aroundBorder">за найманих працівників, призваних під час мобілізації на військову службу до Збройних Сил України, які не отримували доходи у вигляді
грошового забезпечення<sup class="sup">10</sup> з них:</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R01026G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">2.6.1</td>
                <td class="aroundBorder">5,3%</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R010261G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">2.6.2</td>
                <td class="aroundBorder">5,5%</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R010262G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">2.6.3</td>
                <td class="aroundBorder">22%</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R010263G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
        </table>
        <table data-table="5" style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
            <tr>
                <td class="joinTables" width="5%" align="center">3</td>
                <td class="joinTables" width="65%">Нараховано єдиного внеску, усього (р. 3.1 +р. 3.2 + р. 3.3 + р. 3.4 + р. 3.5 + р. 3.6)</td>
                <td class="joinTables" width="30%" align="center">{{#currencyInput}}DECLAR.DECLARBODY.R0103G3{{{}}}{{/currencyInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">3.1</td>
                <td class="aroundBorder">на суми нарахованої роботодавцями заробітної плати, винагороди за виконані роботи (надані послуги) за цивільно-правовими договорами, оплати допомоги по тимчасовій непрацездатності та допомоги у зв’язку з вагітністю та пологами (22,0 %)</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R01031G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">3.2</td>
                <td class="aroundBorder">на суми заробітної плати, нарахованої підприємствами, установами і організаціями,<br/>у тому числі фізичними особами - підприємцями, у т. ч. тими, які обрали<br/>спрощену систему оподаткування працюючим особам з інвалідністю (8,41 %)</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R01032G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">3.2.1</td>
                <td class="aroundBorder">на суми заробітної плати, нарахованої підприємствами, установами і організаціями, працюючим особам з інвалідністю (22 %)</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R010321G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">3.3</td>
                <td class="aroundBorder">на суми заробітної плати, нарахованої підприємствами та організаціями<br/>всеукраїнських громадських організацій осіб з інвалідністю,<br/>зокрема товариствами УТОГ та УТОС (5,3 %)</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R01033G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">3.3.1</td>
                <td class="aroundBorder">на суми заробітної плати, нарахованої підприємствами та організаціями<br/>всеукраїнських громадських організацій осіб з інвалідністю,<br/>зокрема товариствами УТОГ та УТОС (22 %)</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R010331G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">3.4</td>
                <td class="aroundBorder">на суми заробітної плати, нарахованої підприємствами та організаціями<br/>громадських організацій осіб з інвалідністю, працюючим особам з інвалідністю (5,5 %)</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R01034G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">3.4.1</td>
                <td class="aroundBorder">на суми заробітної плати, нарахованої підприємствами та організаціями<br/>громадських організацій осіб з інвалідністю(за умов, визначених частиною чотирнадцятою статті 8 Закону України «Про збір та облік єдиного внеску на загальнообов’язкове державне соціальне страхування»), працюючим особам з інвалідністю (22 %)</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R010341G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">3.5</td>
                <td class="aroundBorder">на суми різниці між розміром мінімальної заробітної плати<br/>та фактично нарахованої заробітної плати роботодавцями (22,0 %)</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R01035G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">3.6</td>
                <td class="aroundBorder">на суми мінімальної заробітної плати непрацюючому іншого з подружжя працівника дипломатичної служби (22 %)</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R01036G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">3.7</td>
                <td class="aroundBorder">на суму нарахованої заробітної плати за найманих працівників, призваних під час мобілізації на військову службу до Збройних Сил України, які не отримували доходи у вигляді грошового забезпечення<sup class="sup">10</sup> з них:</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R01037G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">3.7.1</td>
                <td class="aroundBorder">5,3%</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R010371G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">3.7.2</td>
                <td class="aroundBorder">5,5%</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R010372G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">3.7.3</td>
                <td class="aroundBorder">22%</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R010373G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
            
        </table>
        <table data-table="6" style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
            <tr>
                <td class="joinTables" width="5%" align="center">4</td>
                <td class="joinTables" width="65%">Донараховано та/або доутримано єдиного внеску у зв’язку з виправленням помилок, допущених в попередніх звітних періодах (рядок 4.1 + рядок 4.2 + рядок 4.3)</td>
                <td class="joinTables" width="30%" align="center">{{#currencyInput}}DECLAR.DECLARBODY.R0104G3{{{}}}{{/currencyInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">4.1</td>
                <td class="aroundBorder">Донараховано єдиного внеску у зв’язку з виправленням помилки, допущеної в попередніх звітних періодах, з них:</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R01041G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">4.1.1</td>
                <td class="aroundBorder">8,41%</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R010411G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">4.1.2</td>
                <td class="aroundBorder">5,3%</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R010412G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">4.1.3</td>
                <td class="aroundBorder">5,5%</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R010413G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">4.2</td>
                <td class="aroundBorder">Донараховано єдиний внесок за попередні звітні періоди внаслідок збільшення класу професійного ризику</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R01042G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">4.3</td>
                <td class="aroundBorder">Додатково утримано єдиного внеску за попередні звітні періоди</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R01043G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
             <tr>
                <td class="aroundBorder" align="center">4.4</td>
                <td class="aroundBorder">Донараховано єдиного внеску у зв’язку з виправленням помилки, допущеної в попередніх звітних періодах за найманих працівників,
призваних під час мобілізації на військову службу до Збройних Сил України, які не отримували доходи у вигляді грошового забезпечення<sup class="sup">10</sup>
з них:</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R01044G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">4.4.1</td>
                <td class="aroundBorder">5,3%</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R010441G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
             <tr>
                <td class="aroundBorder" align="center">4.4.2</td>
                <td class="aroundBorder">5,5%</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R010442G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
             <tr>
                <td class="aroundBorder" align="center">4.4.3</td>
                <td class="aroundBorder">22%</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R010443G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">5</td>
                <td class="aroundBorder">Сума пені, яка нарахована платником єдиного внеску самостійно відповідно до частини другої статті 25 Закону України «Про збір та облік єдиного внеску на загальнообов’язкове державне соціальне страхування» що підлягає сплаті за звітний місяць</td>
                <td class="aroundBorder" colspan="3" align="center">{{#currencyInput}}DECLAR.DECLARBODY.R0105G3{{{}}}{{/currencyInput}}</td>
                
            </tr>
            <tr>
                <td class="aroundBorder" align="center">5.1</td>
                <td class="aroundBorder">Реєстраційний номер Розрахунку, в якому заповнено некоректні показники самостійно нарахованої пені (заповнюється у разі допущення помилки при самостійному нарахуванні пені для зменшення самостійно визначеної суми пені до сплати)</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R01051G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
        </table>
        <table data-table="8" style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
            <tr>
                <td class="joinTables" width="5%" align="center">6</td>
                <td class="joinTables" width="65%">Сума на яку зменшено суму нарахувань та/ або утримань з єдиного внеску у зв’язку з виправленням помилки, допущеної в попередніх звітних періодах (рядок 6.1 + рядок 6.2 + рядок 6.3)</td>
                <td class="joinTables" width="30%" align="center">{{#currencyInput}}DECLAR.DECLARBODY.R0106G3{{{}}}{{/currencyInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">6.1</td>
                <td class="aroundBorder">Зменшено суму нарахувань з єдиного внеску у зв’язку з виправленням помилки, допущеної в попередніх звітних періодах та/або у зв’язку з уточненням<br/>проведеним поза межами звітного періоду, з них:</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R01061G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">6.1.1</td>
                <td class="aroundBorder">8,41%</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R010611G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">6.1.2</td>
                <td class="aroundBorder">5,3%</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R010612G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">6.1.3</td>
                <td class="aroundBorder">5,5%</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R010613G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">6.2</td>
                <td class="aroundBorder">Зменшено суму єдиного внеску за попередні звітні періоди внаслідок зменшення класу професійного ризику</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R01062G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">6.3</td>
                <td class="aroundBorder">Зменшено суму утримань за попередні звітні періоди</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R01063G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">6.4</td>
                <td class="aroundBorder">Зменшено суму нарахувань з єдиного внеску у зв’язку з виправленням помилки, допущеної в попередніх звітних періодах за найманих
працівників, призваних під час мобілізації на військову службу до Збройних Сил України, які не отримували доходи у вигляді грошового
забезпечення<sup class="sup">10</sup> з них:</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R01064G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
             <tr>
                <td class="aroundBorder" align="center">6.4.1</td>
                <td class="aroundBorder">5,3%</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R010641G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
             <tr>
                <td class="aroundBorder" align="center">6.4.2</td>
                <td class="aroundBorder">5,5%</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R010642G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
             <tr>
                <td class="aroundBorder" align="center">6.4.3</td>
                <td class="aroundBorder">22%</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R010643G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
        </table>
        <table data-table="9" style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
            <tr>
                <td class="joinTables" width="5%" align="center">7</td>
                <td class="joinTables" width="65%">Загальна сума єдиного внеску, що підлягає сплаті, усього (р. 3 + р. 4 – р. 6)</td>
                <td class="joinTables" width="30%" align="center">{{#currencyInput}}DECLAR.DECLARBODY.R0107G3{{{}}}{{/currencyInput}}</td>
            </tr>
            <tr>
                <td colspan="3">&nbsp;</td>
            </tr>
        </table>
        <table data-table="10" style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
        <tr style="visibility: hidden; height: 0;">
            <td  width="5%" align="center" style="visibility: hidden; height: 0;"></td>
            <td  width="65%" style="visibility: hidden; height: 0;"></td>
            <td  width="30%" align="center" style="visibility: hidden; height: 0;"></td>
        </tr>
        <tr>
            <td class="aroundBorder subtableHedaer" align="center" colspan="2">ІІ. Нарахування грошового забезпечення та єдиного внеску за військовослужбовців, поліцейських, осіб рядового і начальницького складу та на суми допомоги військовослужбовцям-жінкам у зв’язку з вагітністю та пологами (крім військовослужбовців строкової військової служби)</td>
            <td class="aroundBorder" align="center">(грн, коп.)</td>
        </tr>
            <tr>
                <td class="aroundBorder subtableHedaer" colspan="3" align="center">Сума нарахованого грошового забезпечення військовослужбовців, поліцейських, осіб рядового і начальницького складу (крім військовослужбовців строкової військової служби)</td>
            </tr>
            <tr>
                <td class="aroundBorder"  align="center">1</td>
                <td class="aroundBorder" >Сума грошового забезпечення (без обмеження максимальною величиною, на яку нараховується єдиний внесок)</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R0201G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">2</td>
                <td class="aroundBorder">Сума грошового забезпечення, на яку нараховується єдиний внесок (у межах максимальної величини бази нарахування єдиного внеску), та додаткової бази нарахування (рядок 2.1 + рядок 2.2)</td>
                <td class="aroundBorder" align="center">{{#currencyInput}}DECLAR.DECLARBODY.R0202G3{{{}}}{{/currencyInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">2.1</td>
                <td class="aroundBorder">Сума грошового забезпечення, на яку нараховується єдиний внесок<br/>(у межах максимальної величини бази нарахування єдиного внеску)</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R02021G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">2.2</td>
                <td class="aroundBorder">Додаткова база нарахування єдиного внеску</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R02022G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder subtableHedaer" colspan="3" align="center">
                    Сума нарахованої допомоги  військовослужбовцям-жінкам у зв’язку з вагітністю та пологами:
                </td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">3</td>
                <td class="aroundBorder">Сума допомоги військовослужбовцям-жінкам</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R0203G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">4</td>
                <td class="aroundBorder">Сума допомоги військовослужбовцям-жінкам, на яку нараховується єдиний внесок<br/>(у межах максимальної величини бази нарахування єдиного внеску (р. 4.1 + р. 4.2))</td>
                <td class="aroundBorder" align="center">{{#currencyInput}}DECLAR.DECLARBODY.R0204G3{{{}}}{{/currencyInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">4.1</td>
                <td class="aroundBorder">Сума допомоги військовослужбовцям-жінкам, на яку нараховується єдиний внесок<br/>(у межах максимальної величини бази нарахування єдиного внеску)</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R02041G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">4.2</td>
                <td class="aroundBorder">Додаткова база нарахування єдиного внеску</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R02042G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
            <tr>
                <td colspan="3">&nbsp;</td>
            </tr>
            <tr>
                <td class="aroundBorder subtableHedaer" colspan="3" align="center">
                    Сума нарахованого єдиного внеску на грошове забезпечення військовослужбовців, поліцейських, осіб рядового і начальницького складу та на суми допомоги  військовослужбовцям-жінкам у зв’язку з вагітністю та пологами (крім військовослужбовців строкової військової служби)
                </td>
            </tr>
        </table>
        <table data-table="11" style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
            <tr>
                <td class="joinTables" width="5%" align="center">5</td>
                <td class="joinTables" width="65%">На суми грошового забезпечення (рядок 5.1 + рядок 5.2)</td>
                <td class="joinTables" width="30%" align="center">{{#currencyInput}}DECLAR.DECLARBODY.R0205G3{{{}}}{{/currencyInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">5.1</td>
                <td class="aroundBorder">Нараховано єдиного внеску (22,0 %);</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R02051G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">5.2</td>
                <td class="aroundBorder">Нараховано на суми різниці між розміром мінімальної заробітної плати та фактично нарахованого грошового забезпечення (22,0 %);</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R02052G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">6</td>
                <td class="aroundBorder">Донараховано та/або доутримано єдиного внеску у зв’язку з виправленням помилок, допущених в попередніх звітних періодах (рядок 6.1 + рядок 6.2)</td>
                <td class="aroundBorder" align="center">{{#currencyInput}}DECLAR.DECLARBODY.R0206G3{{{}}}{{/currencyInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">6.1</td>
                <td class="aroundBorder">Донараховано єдиний внесок у зв’язку з виправленням помилки, допущеної в попередніх звітних періодах</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R02061G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">6.2</td>
                <td class="aroundBorder">Додатково утримано єдиного внеску за попередні звітні періоди</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R02062G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">7</td>
                <td class="aroundBorder">Сума пені, яка нарахована платником єдиного внеску самостійно відповідно<br/>до частини другої статті 25 Закону України «Про збір та облік єдиного внеску на загальнообов’язкове державне соціальне страхування» що підлягає сплаті<br/>за звітний місяць</td>
                <td class="aroundBorder" align="center">{{#currencyInput}}DECLAR.DECLARBODY.R0207G3{{{}}}{{/currencyInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">7.1</td>
                <td class="aroundBorder">Реєстраційний номер Розрахунку, в якому заповнено некоректні показники самостійно нарахованої пені (заповнюється у разі допущення помилки при самостійному нарахуванні пені для зменшення самостійно визначеної суми пені до сплати)</td>
                <td class="aroundBorder" align="center">{{#intSpanInput}}{{/intSpanInput}}</td>
            </tr>
        </table>
        <table data-table="13" style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
            <tr>
                <td class="joinTables" width="5%" align="center">8</td>
                <td class="joinTables" width="65%">Зменшено суму єдиного внеску у зв’язку з виправленням помилки, допущеної в попередніх звітних періодах (рядок 8.1 + рядок 8.2)</td>
                <td class="joinTables" width="30%" align="center">{{#currencyInput}}DECLAR.DECLARBODY.R0208G3{{{}}}{{/currencyInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">8.1</td>
                <td class="aroundBorder">Зменшено грошового забезпечення у зв’язку з виправленням помилки, допущеної в попередніх звітних періодах</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R02081G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">8.2</td>
                <td class="aroundBorder">Зменшено суму утримань за попередні звітні періоди</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R02082G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
        </table>
        <table data-table="14" style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
            <tr>
                <td class="joinTables" width="5%" align="center">9</td>
                <td class="joinTables" width="65%">Нараховано єдиного внеску на суми допомоги  військовослужбовцям-жінкам (рядок 9.1 + рядок 9.2)</td>
                <td class="joinTables" width="30%" align="center">{{#currencyInput}}DECLAR.DECLARBODY.R0209G3{{{}}}{{/currencyInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">9.1</td>
                <td class="aroundBorder">нараховано єдиного внеску (22,0 %)</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R02091G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">9.2</td>
                <td class="aroundBorder">нараховано на суми різниці між розміром мінімальної заробітної плати та фактично нарахованою сумою допомоги військовослужбовцям-жінкам у зв’язку з вагітністю та пологами (22,0 %)</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R02092G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
        </table>
        <table data-table="15" style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
            <tr>
                <td class="joinTables" width="5%" align="center">10</td>
                <td class="joinTables" width="65%">Донараховано єдиного внеску на суми допомоги військовослужбовцям-жінкам у зв’язку з виправленням помилок, допущених в попередніх звітних періодах (рядок 10.1 + рядок 10.2)</td>
                <td class="joinTables" width="30%" align="center">{{#currencyInput}}DECLAR.DECLARBODY.R02010G3{{{}}}{{/currencyInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">10.1</td>
                <td class="aroundBorder">Донараховано єдиного внеску на суми допомоги військовослужбовцям-жінкам у зв’язку з виправленням помилок, допущених в попередніх звітних періодах</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R020101G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">10.2</td>
                <td class="aroundBorder">Додатково утримано єдиного внеску за попередні звітні періоди (2 %)</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R020102G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">11</td>
                <td class="aroundBorder">Сума пені, яка нарахована платником єдиного внеску самостійно відповідно до частини другої статті 25 розділу VI Закону України «Про збір та облік єдиного внеску на загальнообов’язкове державне соціальне страхування» що підлягає сплаті за звітний місяць</td>
                <td class="aroundBorder align="center">{{#currencyInput}}DECLAR.DECLARBODY.R02011G3{{{}}}{{/currencyInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">11.1</td>
                <td class="aroundBorder">Реєстраційний номер Розрахунку, в якому заповнено некоректні показники самостійно нарахованої пені (заповнюється у разі допущення помилки при самостійному нарахуванні пені для зменшення самостійно визначеної суми пені до сплати)</td>
                <td class="aroundBorder" align="center">{{#intSpanInput}}{{/intSpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">12</td>
                <td class="aroundBorder">Зменшено єдиного внеску на суми допомоги військовослужбовцям-жінкам у зв’язку з виправленням помилки, допущеної в попередніх звітних періодах (рядок 12.1 + рядок 12.2)</td>
                <td class="aroundBorder" align="center">{{#currencyInput}}DECLAR.DECLARBODY.R02012G3{{{}}}{{/currencyInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">12.1</td>
                <td class="aroundBorder">Зменшено єдиного внеску на суми допомоги військовослужбовцям-жінкам у зв’язку з виправленням помилки, допущеної в попередніх звітних періодах (22 %, 33,2 %, у т.ч. виходячи з розміру мінімальної заробітної плати)</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R020121G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">12.2</td>
                <td class="aroundBorder">Зменшено суму утримань за попередні звітні періоди (2 %)</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R020122G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">13</td>
                <td class="aroundBorder">Загальна сума єдиного внеску з сум грошового забезпечення, що підлягає сплаті, усього (р. 5 + р. 6 – р. 8)</td>
                <td class="aroundBorder" align="center">{{#currencyInput}}DECLAR.DECLARBODY.R02013G3{{{}}}{{/currencyInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">14</td>
                <td class="aroundBorder">Загальна сума єдиного внеску з сум допомоги військовослужбовцям-жінкам у зв’язку з вагітністю та пологами, що підлягає сплаті (рядок 9 + рядок 10 – рядок 12)</td>
                <td class="aroundBorder" align="center">{{#currencyInput}}DECLAR.DECLARBODY.R02014G3{{{}}}{{/currencyInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder subtableHedaer" colspan="2" align="center">ІІІ. Нарахування грошового забезпечення та єдиного внеску за патронатних вихователів, батьків-вихователів та прийомних батьків</td>
                <td class="aroundBorder" align="center">(грн коп.)</td>
            </tr>
        </table>
        <table data-table="17" style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
            <tr>
                <td class="joinTables" align="center" width="5%">1</td>
                <td class="joinTables" width="65%">Сума грошового забезпечення відповідно до законодавства, на яку нараховується єдиний внесок</td>
                <td class="joinTables" width="30%" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R0301G3{{{}}}{{/currencySpanInput}}</td>
            <tr>
                <td class="aroundBorder" align="center">2</td>
                <td class="aroundBorder">Сума нарахованого єдиного внеску для патронатних вихователів, батьків-вихователів та прийомних батьків на суми грошового забезпечення відповідно до законодавства:</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R0302G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">3</td>
                <td class="aroundBorder">Донараховано єдиний внесок у зв’язку з виправленням помилки, допущеної в попередніх звітних періодах</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R0303G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">4</td>
                <td class="aroundBorder">Зменшено суму єдиного внеску у зв’язку з виправленням помилки, допущеної в попередніх звітних періодах</td>
                <td class="aroundBorder" align="center">{{#currencySpanInput}}DECLAR.DECLARBODY.R0304G3{{{}}}{{/currencySpanInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">5</td>
                <td class="aroundBorder">Сума пені, яка нарахована платником єдиного внеску самостійно відповідно до частини другої статті 25 Закону України «Про збір та облік єдиного внеску на загальнообов’язкове державне соціальне страхування» що підлягає сплаті за звітний місяць</td>
               <td class="aroundBorder" align="center">{{#currencyInput}}DECLAR.DECLARBODY.R0305G3{{{}}}{{/currencyInput}}</td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">5.1</td>
                <td class="aroundBorder">Реєстраційний номер Розрахунку, в якому заповнено некоректні показники самостійно нарахованої пені (заповнюється у разі допущення помилки при самостійному нарахуванні пені для зменшення самостійно визначеної суми пені до сплати)</td>
                <td class="aroundBorder" align="center"></td>
            </tr>
            <tr>
                <td class="aroundBorder" align="center">6</td>
                <td class="aroundBorder">Сума єдиного внеску, що підлягає сплаті усього (р. 2 + р. 3 – р. 4)</td>
                <td class="aroundBorder" align="center">{{#currencyInput}}DECLAR.DECLARBODY.R0306G3{{{}}}{{/currencyInput}}</td>
            </tr>
        </table>
        <table data-table="18" style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
            <tr>
               <td class="" width="8%"></td>
               <td style="text-align: left; font-size: 8pt;" align="left" width="82%">Доповнення до податкового Розрахунку (заповнюється і подається відповідно до пункту 46.4 статті 46 глави 2 розділу ІІ Податкового кодексу України) на</td>
               <td class="" align="center" width="5%">{{#intSpanInput}}DECLAR.DECLARBODY.HJAR{{{}}}{{/intSpanInput}}</td>
               <td style="text-align: left; font-size: 8pt;" align="left" width="5%"> арк.</td>
            </tr>
            <tr>
                <td colspan="4">&nbsp;</td>
            </tr>
        </table>
         <table id="table" data-table="19" style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
         <thead>
            <tr>
                <td align="center" rowspan="2" width="3%" class="no-print">&nbsp;</td>
                <td class="aroundBorder" width="8%" align="center">№ з/п</td>
                <td class="aroundBorder" width="89%" align="center">Зміст доповнення</td>
            </tr>
             </thead>
            <tbody id="Process">
                {{#generatorRows}}T1{{{}}}{{/generatorRows}}
            </tbody>
        </table>
        <table data-table="20" style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
             <tr>
                <td colspan="4">&nbsp;</td>
            </tr>
            <tr>
                <td width="25%">Дата подання</td>
                <td class="borderDataA" width="20%" align="center">{{#dateInput}}DECLAR.DECLARBODY.HFILL{{{}}}{{/dateInput}}</td>
                <td width="10%">&nbsp;</td>
                <td width="45%">Наведена інформація є повною і достовірною.</td>
            </tr>
            <tr>
                <td colspan="4">&nbsp;</td>
            </tr>
        </table>
        <table data-table="21" style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
            <tr>
                <td width="218px">Керівник (уповноважена особа)/фізична особа (законний представник)</td>
                <td width="30px">&nbsp;</td>
                <td class="borderDataA" width="30%" align="center">{{#textInput}}DECLAR.DECLARBODY.HKBOS{{{}}}{{/textInput}}</td>
                <td width="30px">&nbsp;</td>
                <td width="calc(15% - 30px)">&nbsp;</td>
                <td width="30px">&nbsp;</td>
                <td width="calc(30% - 30px)" align="center">{{#textInput}}DECLAR.DECLARBODY.HBOS{{{}}}{{/textInput}}</td>
                <td width="30px">&nbsp;</td>
            </tr>
            <tr>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td align="center">(Реєстраційний номер облікової картки платника<br/>податків або серія (за наявності) та номер паспорта)</td>
                <td>&nbsp;</td>
                <td class="topBorder" align="center">(підпис)</td>
                <td>&nbsp;</td>
                <td class="topBorder" align="center">(власне ім’я та прізвище)</td>
                <td>&nbsp;</td>
            </tr>
            <tr>
                <td colspan="4">&nbsp;</td>
                <td colspan="3" align="center">М. П. (за наявності)<td>
            </tr>
            <tr>
                <td colspan="8">&nbsp;</td>
            </tr>
        </table>
        <table data-table="22" style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
            <tr>
                <td width="218px">
                    Головний бухгалтер (особа,відповідальна за ведення бухгалтерського обліку)
                </td>
                <td width="30px">&nbsp;</td>
                <td class="borderDataA" width="30%" align="center">{{#textInput}}DECLAR.DECLARBODY.HKBUH{{{}}}{{/textInput}}</td>
                <td width="30px">&nbsp;</td>
                <td width="calc(15% - 30px)">&nbsp;</td>
                <td width="30px">&nbsp;</td>
                <td width="calc(30% - 30px)" align="center">{{#textInput}}DECLAR.DECLARBODY.HBUH{{{}}}{{/textInput}}</td>
                <td width="30px">&nbsp;</td>
            </tr>
            <tr>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td align="center">(Реєстраційний номер облікової картки платника<br/>податків або серія (за наявності) та номер паспорта)</td>
                <td>&nbsp;</td>
                <td class="topBorder" align="center">(підпис)</td>
                <td>&nbsp;</td>
                <td class="topBorder" align="center">(власне ім’я та прізвище)</td>
                <td>&nbsp;</td>
            </tr>
            <tr>
                <td colspan="8">&nbsp;</td>
            </tr>
            <tr>
                <td colspan="8">&nbsp;</td>
            </tr>
        </table>
        <div class="aroundBorder paddingContainer5 linksContainer">
            <div class="link">
                <div><sup class="sup">1</sup>Розрахунок, який подається за звітний (податковий) період першим (пункт 1 розділу ІІІ Порядку заповнення та подання податковими агентами Податкового розрахунку сум доходу, нарахованого (сплаченого) на користь платників податків – фізичних осіб, і сум утриманого з них податку, а також сум нарахованого єдиного внеску, затвердженого наказом Міністерства фінансів України від 13 січня 2015 року № 4, зареєстрованого в Міністерстві юстиції України 30 січня 2015 року за № 111/26556 (у редакції наказу Міністерства фінансів України від 24 січня 2025 року № 39).</div>
            </div>
            <div class="link">
                <div><sup class="sup">2</sup>Розрахунок, який подається подається наступним за звітний (податковий) період до закінчення граничного строку подання з даними про уточнення в сумах нарахованого податку на доходи фізичних осіб, військового збору, єдиного внеску та/або реквізитах.</div>
            </div>
            <div class="link">
                <div><sup class="sup">3</sup>Розрахунок, який подається подається після закінчення граничного строку подання для відповідного звітного (податкового) періоду з даними про уточнення в сумах нарахованого податку на доходи фізичних осіб, військового збору, єдиного внеску та/або реквізитах.</div>
            </div>
            <div class="link">
                <div><sup class="sup">4</sup>Вказується звітний (податковий) період (календарний рік) та місяць (цифрове значення від 1 до 12) за який подається Розрахунок, а також обов’язково зазначається номер Розрахунку (в хронологічному порядку незалежно від типу Розрахунку). </div>
            </div>
            <div class="link">
                <div><sup class="sup">5</sup>Платник - податковий агент та платник єдиного внеску.</div>
            </div>
            <div class="link">
                <div><sup class="sup">6</sup>Зазначається код за ЄДРПОУ платника або реєстраційний (обліковий) номер платника податків, який присвоюється контролюючими органами, або реєстраційний номер облікової картки платника податків - фізичної особи.</div>
            </div>
            <div class="link">
                <div><sup class="sup">7</sup>Серію (за наявності) та номер паспорта зазначають фізичні особи, які через свої релігійні переконання відмовляються від прийняття реєстраційного номера облікової картки платника податків та офіційно повідомили про це відповідний контролюючий орган і мають відмітку у паспорті.</div>
            </div>
            <div class="link">
                <div><sup class="sup">8</sup>Зазначається код за ЄДРПОУ ліквідованого платника єдиного внеску у разі подання правоноступником Розрахунку з типом Уточнюючий» за осіб,що перебували у трудових відносинах чи відносинах цивільно-правового характеру з платником єдиного внеску, який ліквідований.</div>
            </div>
            <div class="link">
                <div><sup class="sup">9</sup>Код філії (заповнюється у разі подання платником єдиного внеску відомостей про філію при поданні розрахунку з типом «Уточнюючий».</div>
            </div>
             <div class="link">
                <div><sup class="sup">10</sup>Заповнюється роботодавцями - платниками єдиного податку, які обрали спрощену систему оподаткування - фізичними особами - підприємцями, які належать до другої та третьої груп платників єдиного податку, а також юридичними особами, які належать до третьої групи платників єдиного податку за найманих працівників, призваних під час мобілізації на військову службу до Збройних Сил України, які не отримували доходи у вигляді грошового забезпечення, у період мобілізації, визначеної Указом Президента України від 24 лютого 2022 року № 65 «Про загальну мобілізацію», затвердженим Законом України від 03 березня 2022 № 2105-ІХ.</div>
            </div>
        </div>
        <div class="joinTables serviceControlContainer" align="center">
            <div class="borderBottomDashed">&nbsp;</div>
            <div class="lh25">Заповнюється службовими особами контролюючого органу</div>
            <div class="lh25">Відмітка про внесення даних до електронної бази податкової звітності «_____» ______________ 20____ року</div>
            <div class="borderBottomSolid marginRightLeft25">&nbsp;</div>
            <div>&nbsp;</div>
            <div class="lh25">Службова особа контролюючого органу (власне ім’я та прізвище)</div>
            <div>&nbsp;</div>
        </div>
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
    .link {
        display: flex;
    }
    sup {
        vertical-align: super;
        font-size: smaller;
    }
    .sup {
        margin-right: 20px;
    }
    .borderBottomDashed {
        border-bottom: 1px  dashed #000;
    }
    .borderBottomSolid {
        border-bottom: 1px  solid #000;
    }
    .marginRightLeft25 {
        margin: 0 25px;
    }
    .lh25 {
        line-height: 2.5;
    }
    .paddingContainer5 {
        padding: 5px;
    }
    .borderRightLeft {
        border-right: 1px solid #000;
        border-left: 1px solid #000;
    }
    .borderTopRightLeft {
        border-top: 1px solid #000;
        border-right: 1px solid #000;
        border-left: 1px solid #000;
    }
    .borderRight {
        border-right: 1px solid #000;
    }
    .linksContainer {
        max-width: 1053px;
    }
    .serviceControlContainer {
        max-width: 1063px;
    }
</style>
`
