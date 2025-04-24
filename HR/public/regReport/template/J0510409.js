module.exports = `
<!--%pageOrientation:landscape-->
<!-- background: aqua -->
<html>
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    </head>
    <body>
        <table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
            <tr>
                <td width="33%" align="center">Відмітка про отримання<br/>(штамп контролюючого органу)</td>
                <td width="33%"></td>
                <td width="33%">
                    ЗАТВЕРДЖЕНО<br/>Наказ Міністерства фінансів України<br/>13 січня 2015 року № 4<br/>(у редакції наказу<br/>Міністерства фінансів України<br/>15 грудня 2020 року № 773)
                </td>
            </tr>
            <tr>
                <td colspan="3">&nbsp;</td>
            </tr>
        </table>
        <table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
            <tr>
                <td class="aroundBorder" width="5%" rowspan="3" align="center">01</td>
                <td class="aroundBorder" width="70%" rowspan="3" >
                    Відомості про суми нарахованого доходу, утриманого та сплаченого податку на доходи фізичних осіб та військового збору
                </td>
                <td class="aroundBorder" width="5%" align="center">011</td>
                <td class="aroundBorder" width="15%" >Звітний</td>
                <td class="aroundBorder" width="5%" >
                    {{#booleanInput}}DECLAR.DECLARBODY.HZ####{"linkedPath": ["DECLAR.DECLARBODY.HZN","DECLAR.DECLARBODY.HZU"]}{{{}}}{{/booleanInput}}
                </td>
            </tr>
            <tr>
                <td class="aroundBorder" width="5%" align="center">012</td>
                <td class="aroundBorder" width="15%" >Звітний новий</td>
                <td class="aroundBorder" width="5%" >
                    {{#booleanInput}}DECLAR.DECLARBODY.HZN####{"linkedPath": ["DECLAR.DECLARBODY.HZ","DECLAR.DECLARBODY.HZU"]}{{{}}}{{/booleanInput}}
                </td>
            </tr>
            <tr>
                <td class="aroundBorder" width="5%" align="center">013</td>
                <td class="aroundBorder" width="15%" >Уточнюючий</td>
                <td class="aroundBorder" width="5%">
                    {{#booleanInput}}DECLAR.DECLARBODY.HZU####{"linkedPath": ["DECLAR.DECLARBODY.HZ","DECLAR.DECLARBODY.HZN"]}{{{}}}{{/booleanInput}}
                </td>
            </tr>
            <tr>
                <td colspan="5">&nbsp;</td>
            </tr>
        </table>
        <table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
            <tr>
                <td rowspan="2" class="aroundBorder" width="5%" align="center">02</td>
                <td rowspan="2" class="aroundBorder" width="15%">Звітний (податковий) період</td>
                <td class="aroundBorder" width="10%" align="center">{{#intInput}}DECLAR.DECLARBODY.HZY{{{}}}{{/intInput}}</td>
                <td class="aroundBorder" width="15%" align="center">{{#intInput}}DECLAR.DECLARBODY.HZKV{{{}}}{{/intInput}}</td>
                <td class="aroundBorder" width="20%" align="center">{{#intInput}}DECLAR.DECLARBODY.HNM{{{}}}{{/intInput}}</td>
                <td class="aroundBorder" width="15%" align="center">{{#intInput}}DECLAR.DECLARBODY.HNUM{{{}}}{{/intInput}}</td>
                <td class="aroundBorder" width="20%" align="center">{{#intInput}}DECLAR.DECLARBODY.HNUM1{{{}}}{{/intInput}}</td>
            </tr>
            <tr>
                <td class="topBorder aroundBorder" width="10%" align="center">(рік)</td>
                <td class="topBorder aroundBorder" width="15%" align="center">(квартал)</td>
                <td class="topBorder aroundBorder" width="20%" align="center">(номер місяця в кварталі)</td>
                <td class="topBorder aroundBorder" width="15%" align="center">(номер Розрахунку)</td>
                <td class="topBorder aroundBorder" width="20%" align="center">(номер додатку до Розрахунку)</td>
            </tr>
            <tr>
                <td colspan="5">&nbsp;</td>
            </tr>
        </table>
        <table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
            <tr>
                <td class="aroundBorder" width="5%" rowspan="2" align="center">03</td>
                <td class="aroundBorder" width="25%" rowspan="2">Податковий агент</td>
                <td class="aroundBorder" width="70%" align="center">{{#textInput}}DECLAR.DECLARBODY.HNAME####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}</td>
            </tr>
            <tr>
                <td class="topBorder" align="center">(повне найменування юридичної особи чи прізвище, ім’я та побатькові самозайнятої фізичної особи)</td>
            </tr>
            <tr>
                <td colspan="3">&nbsp;</td>
            </tr>
        </table>
        <table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
            <tr>
                <td class="aroundBorder" width="5%" align="center">031</td>
                <td class="aroundBorder" width="70%">Податковий номер<sup>1</sup> або серія (за наявності) та номер паспорта платника податків<sup>2</sup></td>
                <td class="aroundBorder" width="25%" align="center">{{#textInput}}DECLAR.DECLARBODY.HTIN####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}</td>
            </tr>
            <tr>
                <td colspan="5">&nbsp;</td>
            </tr>
        </table>
        <table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
            <tr>
                <td class="aroundBorder" width="5%" align="center">032</td>
                <td class="aroundBorder" width="28%" align="center">{{#textInput}}DECLAR.DECLARBODY.HKATOTTG####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}</td>
                <td class="aroundBorder" width="67%">Кодифікатор адміністративно-територіальних одиниць та територій територіальних громад за<br/>
                    місцезнаходженням податкового агента або відокремленного підрозділу, якщо Розрахунок<br/>
                    подається за відокремлений підрозділ</td>
            </tr>
            <tr>
                <td colspan="5">&nbsp;</td>
            </tr>
        </table>    
        <table class='topBorder' style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
            <tr>
                <td class="joinTables" width="5%" align="center">04</td>
                <td class="joinTables" width="50%">Працювало за трудовими договорами (контрактами) (ознака 101)</td>
                <td class="joinTables" width="12%" align="center">{{#intInput}}DECLAR.DECLARBODY.R00G01I{{{}}}{{/intInput}}</td>
                <td class="joinTables" width="33%" align="center"></td>
            </tr>
        </table>
        <table style="table-layout: auto; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
            <tr>
                <td class="joinTables" width="5%" align="center">05</td>
                <td class="joinTables" width="50%">Працювало за цивільно-правовими договорами (ознака 102)</td>
                <td class="joinTables" width="12%" align="center">{{#textInput}}DECLAR.DECLARBODY.R00G02I{{{}}}{{/textInput}}</td>
                <td class="joinTables" width="33%" align="center"></td>
            </tr>
            <tr>
                <td colspan="4">&nbsp;</td>
            </tr>
        </table>
        <table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
            <tr>
                <td colspan="5" align="right">(грн коп.)</td>
            </tr>
            <tr>
                <td colspan="5">&nbsp;</td>
            </tr>
        </table>
        <table id="tableT1" style="table-layout: auto; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse; border: 1px solid black;" border="1" cellspacing="0" cellpadding="0px" bordercolor="black" width="1050px">
        <thead>   
        <tr>
                <td  rowspan="3" width="8%" align="center" class="no-print">06</td>
                <td align="center" width="93%" class="joinTables subtableHedaer" colspan="13">Розділ І. Персоніфіковані дані про суми нарахованого (виплаченого) на користь фізичних осіб доходу та нарахованих<br/>
                (перерахованих) до бюджету податку на доходи фізичних осіб та військового збору
                </td>
            </tr>
            <tr>
                <td align="center" rowspan="2"  width="3%">No з/п</td>
                <td align="center" rowspan="2"  width="20%">Реєстраційний номер <br/> облікової картки <br/> платника податків <br/> або серія (за <br/> наявності) та <br/>номер паспорта<sup>2</sup></td>
                <td align="center" colspan="2" width="13%">Сума доходу</td>
                <td align="center" colspan="2"  width="15%">Сума податку на<br/> доходи фізичнихо сіб</td>
                <td align="center" colspan="2"   width="15%">Сума військового<br/> збору</td>
                <td align="center" rowspan="2"   width="3%">Ознака <br/> доходу</td>
                <td align="center" colspan="2"   width="15%">Дата</td>
                <td align="center" rowspan="2"   width="3%">Ознака подат. соц. пільги</td>
                <td align="center" rowspan="2"   width="3%">Ознака (0, 1)</td>
            </tr>
            <tr>
                <td align="center"    width="6.5%">нарахо-<br/>ваного</td>
                <td align="center"    width="6.5%">виплаче-<br/>ного</td>
                <td align="center"    width="7.5%">нарахо-<br/>ваного</td>
                <td align="center"    width="7.5%">перера-<br/>хованого</td>
                <td align="center"    width="7.5%">нарахо-<br/>вано</td>
                <td align="center"    width="7.5%">перера-<br/>ховано</td>
                <td align="center"    width="7.5%">прийняття на роботу (дд.мм.рррр)</td>
                <td align="center"    width="7.5%">звільнення з роботи (дд.мм.рррр)</td>
            </tr>
            </thead>
            <tbody id="Process">
                {{#generatorRows}}T1{{{mode: "crd"}}}{{/generatorRows}}
            </tbody>
        </table>
        <table>
            <tr>
                <td colspan="5">&nbsp;</td>
            </tr>
        </table>
        <table class="topBorder" style="table-layout: auto; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="890px">  
            <tr>
                <td class="joinTables" rowspan="9" width="5%" align="center">07</td>
                <td class="joinTables subtableHedaer" width="85%" colspan="6" align="center">Розділ ІІ. Зведені дані про оподаткування процентів, виграшів (призів)<br/> у лотерею</td>
                <td class="joinTables" width="10%">(грн коп.)</td>
            </tr>
            <tr>
                <td class="joinTables" rowspan="2"  align="center">Показник</td>
                <td class="joinTables" colspan="2"  align="center">Загальна сума доходу</td>
                <td class="joinTables" colspan="2"  align="center">Загальна сума податку<br/> на доходи фізичних осіб</td>
                <td class="joinTables" colspan="2"  align="center">Загальна сума<br/> військового збору</td>
            </tr>
            <tr>
                <td class="joinTables" align="center">нарахованого</td>
                <td class="joinTables" align="center">виплаченого</td>
                <td class="joinTables" align="center">нарахованого</td>
                <td class="joinTables" align="center">перерахованого</td>
                <td class="joinTables" align="center">нараховано</td>
                <td class="joinTables" align="center">перераховано</td>
            </tr>
            <tr>
                <td class="joinTables" align="center">Оподаткування процентів</td>
                <td class="joinTables" align="center">{{#currencyInput}}DECLAR.DECLARBODY.R0201G03A{{{}}}{{/currencyInput}}</td>
                <td class="joinTables" align="center">x</td>
                <td class="joinTables" align="center">{{#currencyInput}}DECLAR.DECLARBODY.R0201G04A{{{}}}{{/currencyInput}}</td>
                <td class="joinTables" align="center">{{#currencyInput}}DECLAR.DECLARBODY.R0201G04{{{}}}{{/currencyInput}}</td>
                <td class="joinTables" align="center">{{#currencyInput}}DECLAR.DECLARBODY.R0201G5A{{{}}}{{/currencyInput}}</td>
                <td class="joinTables" align="center">{{#currencyInput}}DECLAR.DECLARBODY.R0201G5{{{}}}{{/currencyInput}}</td>
            </tr>
            <tr>
                <td class="joinTables" align="center">Оподаткування процентів<br/>-виключення<sup>3</sup></td>
                <td class="joinTables" align="center">{{#currencyInput}}DECLAR.DECLARBODY.R0202G03A{{{}}}{{/currencyInput}}</td>
                <td class="joinTables" align="center">x</td>
                <td class="joinTables" align="center">{{#currencyInput}}DECLAR.DECLARBODY.R0202G04A{{{}}}{{/currencyInput}}</td>
                <td class="joinTables" align="center">{{#currencyInput}}DECLAR.DECLARBODY.R0202G04{{{}}}{{/currencyInput}}</td>
                <td class="joinTables" align="center">{{#currencyInput}}DECLAR.DECLARBODY.R0202G5A{{{}}}{{/currencyInput}}</td>
                <td class="joinTables" align="center">{{#currencyInput}}DECLAR.DECLARBODY.R0202G5{{{}}}{{/currencyInput}}</td>
            </tr>
            <tr>
                <td class="joinTables" align="center">Оподаткування виграшів<br/>(призів) у лотерею</td>
                <td class="joinTables" align="center">{{#currencyInput}}DECLAR.DECLARBODY.R0203G03A{{{}}}{{/currencyInput}}</td>
                <td class="joinTables" align="center">{{#currencyInput}}DECLAR.DECLARBODY.R0203G03{{{}}}{{/currencyInput}}</td>
                <td class="joinTables" align="center">{{#currencyInput}}DECLAR.DECLARBODY.R0203G04A{{{}}}{{/currencyInput}}</td>
                <td class="joinTables" align="center">{{#currencyInput}}DECLAR.DECLARBODY.R0203G04{{{}}}{{/currencyInput}}</td>
                <td class="joinTables" align="center">{{#currencyInput}}DECLAR.DECLARBODY.R0203G5A{{{}}}{{/currencyInput}}</td>
                <td class="joinTables" align="center">{{#currencyInput}}DECLAR.DECLARBODY.R0203G5{{{}}}{{/currencyInput}}</td>
            </tr>
            <tr>
                <td class="joinTables" align="center">Оподаткування виграшів<br/>(призів) у лотерею - <br/>виключення<sup>4</sup></td>
                <td class="joinTables" align="center">{{#currencyInput}}DECLAR.DECLARBODY.R0204G03A{{{}}}{{/currencyInput}}</td>
                <td class="joinTables" align="center">{{#currencyInput}}DECLAR.DECLARBODY.R0204G03{{{}}}{{/currencyInput}}</td>
                <td class="joinTables" align="center">{{#currencyInput}}DECLAR.DECLARBODY.R0204G04A{{{}}}{{/currencyInput}}</td>
                <td class="joinTables" align="center">{{#currencyInput}}DECLAR.DECLARBODY.R0204G04{{{}}}{{/currencyInput}}</td>
                <td class="joinTables" align="center">{{#currencyInput}}DECLAR.DECLARBODY.R0204G5A{{{}}}{{/currencyInput}}</td>
                <td class="joinTables" align="center">{{#currencyInput}}DECLAR.DECLARBODY.R0204G5{{{}}}{{/currencyInput}}</td>
            </tr>
            <tr>
                <td class="joinTables" align="center">Військовий збір<sup>5</sup></td>
                <td class="joinTables" align="center">{{#currencyInput}}DECLAR.DECLARBODY.R0205G03A{{{}}}{{/currencyInput}}</td>
                <td class="joinTables" align="center">{{#currencyInput}}DECLAR.DECLARBODY.R0205G03{{{}}}{{/currencyInput}}</td>
                <td class="joinTables" align="center">{{#currencyInput}}DECLAR.DECLARBODY.R0205G04A{{{}}}{{/currencyInput}}</td>
                <td class="joinTables" align="center">{{#currencyInput}}DECLAR.DECLARBODY.R0205G04{{{}}}{{/currencyInput}}</td>
                <td class="joinTables" align="center">{{#currencyInput}}DECLAR.DECLARBODY.R0205G5A{{{}}}{{/currencyInput}}</td>
                <td class="joinTables" align="center">{{#currencyInput}}DECLAR.DECLARBODY.R0205G5{{{}}}{{/currencyInput}}</td>
            </tr>
            <tr>
                <td class="joinTables" align="center">Військовий збір - <br/>виключення<sup>6</sup></td>
                <td class="joinTables" align="center">{{#currencyInput}}DECLAR.DECLARBODY.R0206G03A{{{}}}{{/currencyInput}}</td>
                <td class="joinTables" align="center">{{#currencyInput}}DECLAR.DECLARBODY.R0206G03{{{}}}{{/currencyInput}}</td>
                <td class="joinTables" align="center">{{#currencyInput}}DECLAR.DECLARBODY.R0206G04A{{{}}}{{/currencyInput}}</td>
                <td class="joinTables" align="center">{{#currencyInput}}DECLAR.DECLARBODY.R0206G04{{{}}}{{/currencyInput}}</td>
                <td class="joinTables" align="center">{{#currencyInput}}DECLAR.DECLARBODY.R0206G5A{{{}}}{{/currencyInput}}</td>
                <td class="joinTables" align="center">{{#currencyInput}}DECLAR.DECLARBODY.R0206G5{{{}}}{{/currencyInput}}</td>
            </tr>
            <tr>
                <td colspan="5">&nbsp;</td>
            </tr>
        </table>
        <table id="tableT3" style="table-layout: auto; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse; border: 1px solid black;" border="1" cellspacing="0" cellpadding="0px" bordercolor="black" width="1050px">
       
        <tr>
                <td  rowspan="3" width="8%" align="center" class="no-print">08</td>
                <td align="center" width="93%" class="joinTables subtableHedaer" colspan="14">Розділ ІІІ. Розгорнута інформація про бюджетні гранти
                </td>
            </tr>
            <tr>
                <td align="center" rowspan="2"  width="3%">No з/п</td>
                <td align="center" rowspan="2"  width="20%">Реєстраційний номер <br/> облікової картки <br/> платника податків <br/> або серія (за <br/> наявності) та <br/>номер паспорта<sup>2</sup></td>
                 <td align="center" colspan="5" width="35%">Відомості про укладені договори з надання бюджетних грантів</td>
                 <td align="center" colspan="2" width="13%">Сума гранту, грн. коп.</td>
                 <td align="center" colspan="2" width="13%">Використання сум гранту</td>
                 <td align="center" colspan="2" width="13%">Повернуто коштів</td>
                 <td align="center" rowspan="2" width="3%">Ознака (0, 1)</td>
            </tr>
            <tr>
                <td align="center" width="7%">номер<br/>договору</td>
                <td align="center" width="7%">дата складання</td>
                <td align="center" width="7%">граничний термін виконання</td>
                <td align="center" width="7%">цільове призначення гранту</td>
                <td align="center" width="7%">дата виконання</td>
                <td align="center" width="6.5%">згідно договору</td>
                <td align="center" width="6.5%">фактично надано</td>
                <td align="center" width="6.5%">за цільовим призначенням, грн. коп.</td>
                <td align="center" width="6.5%">не за цільовим призначенням, грн. коп.</td>
                <td align="center" width="6.5%">всього</td>
                <td align="center" width="6.5%">в т. ч. у зв'язку з нецільо-<br/>вим викори-<br/>станням</td>
            </tr>
           
                {{#generatorRows}}T3{{{}}}{{/generatorRows}}
        
        </table>
         <table>
            <tr>
                <td colspan="5">&nbsp;</td>
            </tr>
        </table>
        

        <table style="table-layout: auto; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
            <tr>
                <td width="15%">
                    Кількість рядків (розділ І)
                </td>
                <td class="borderDataA" width="14%" align="center">{{#intInput}}DECLAR.DECLARBODY.R02G01I{{{}}}{{/intInput}}</td>
                <td width="2%">&nbsp;</td>
                <td width="20%">
                    Кількість фізичних осіб (розділ І)
                </td>
                <td class="borderDataA" width="12%" align="center">{{#intInput}}DECLAR.DECLARBODY.R02G02I{{{}}}{{/intInput}}</td>
                <td width="2%">&nbsp;</td>
                <td width="11%">
                    Кількість сторінок
                </td>
                <td class="borderDataA" width="10%" align="center">{{#intInput}}DECLAR.DECLARBODY.R02G03I{{{}}}{{/intInput}}</td>
            </tr>
            <tr>
                <td colspan="5">&nbsp;</td>
            </tr>
        </table>
        <table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
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
        <table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
            <tr>
                <td width="25%">
                    Керівник (уповноважена особа)/ фізична особа (законний представник)
                </td>
                <td class="borderDataA" width="30%">{{#textInput}}DECLAR.DECLARBODY.HKBOS{{{}}}{{/textInput}}</td>
                <td width="3%">&nbsp;</td>
                <td width="15%">&nbsp;</td>
                <td width="3%">&nbsp;</td>
                <td width="21%">{{#textInput}}DECLAR.DECLARBODY.HBOS{{{}}}{{/textInput}}</td>
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
        <table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
            <tr>
                <td width="25%">
                    Головний бухгалтер (особа,відповідальна за ведення бухгалтерського обліку)
                </td>
                <td class="borderDataA" width="30%">{{#textInput}}DECLAR.DECLARBODY.HKBUH{{{}}}{{/textInput}}</td>
                <td width="3%">&nbsp;</td>
                <td width="15%">&nbsp;</td>
                <td width="3%">&nbsp;</td>
                <td width="21%">{{#textInput}}DECLAR.DECLARBODY.HBUH{{{}}}{{/textInput}}</td>
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
                <td colspan="5">&nbsp;</td>
            </tr>
        </table>
        <table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
            <tr>
                <td colspan="5"><sup>1</sup> Зазначається код за ЄДРПОУ платника податку або реєстраційний (обліковий) номер платника податків, який присвоюється<br/>
                контролюючими органами, або реєстраційний номер облікової картки платника податків - фізичної особи.<br/>
                <sup>2</sup> Серія (за наявності) та номер паспорта зазначаються для фізичних осіб, які через свої релігійні переконання відмовляються від прийняття</br>
                реєстраційного номера облікової картки платника податків та офіційно повідомили про це відповідний контролюючий орган і мають відмітку<br/>
                у паспорті.<br/>
                <sup>3</sup> Виключення інформації щодо оподаткування процентів при проведенні коригувань.<br/>
                <sup>4</sup> Виключення інформації щодо оподаткування виграшів (призів) у лотерею при проведенні коригувань.</br>
                <sup>5</sup> Заповнюється виключно для проведення коригування податкових розрахунків за минулі періоди до 01.01.2021.<br/>
                <sup>6</sup> Заповнюється виключно для проведення коригування податкових розрахунків за минулі періоди до 01.01.2021.
                </td>
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
</style>
`
