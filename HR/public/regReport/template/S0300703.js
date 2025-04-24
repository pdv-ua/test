module.exports = `
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
    <tbody>
        <tr>
            <td width="(100% - 580px)">&nbsp;</td>
            <td align="center" nowrap="nowrap" width="315px" style="border: 1px solid black">Ідентифікаційний код ЄДРПОУ</td>
            <td align="center" width="265px" style="border: 1px solid black">
                {{#textInput}}DECLAR.DECLARBODY.FIRM_EDRPOU####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
            </td>
        </tr>
    </tbody>
</table>
<br clear="none">
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
    <tbody>
        <tr>
            <td width="100%" align="center" colspan="5"><h3>Державне статистичне спостереження<h3></td>
        </tr>
        <tr>
            <td width="125px">&nbsp;</td>
            <td width="(100% - 250px)" align="center" colspan="3" style="padding: 4px; border: 1px solid black"><b>Статистична конфіденційність забезпечується <br clear="none"> статтею 29 Закону України "Про державну статистику"</b></td>
            <td width="125px">&nbsp;</td>
        </tr>
        <tr>
            <td colspan="5">&nbsp;</td>
        </tr>
        <tr>
            <td width="100%" align="center" colspan="5" style="border: 1px solid black"><b>Порушення порядку подання або використання даних державних статистичних спостережень тягне за собою <br clear="none"> відповідальність, яка встановлена статтею 186<sup>3</sup> Кодексу України про адміністративні правопорушення</b></td>
        </tr>
        <tr>
            <td colspan="5">&nbsp;</td>
        </tr>
        
        <tr>
            <td width="100%" align="center" colspan="5" style="padding-top: 8pt;"><h3>Звіт про заробітну плату за професіями окремих працівників" </h3></td>
        </tr>
        <tr>
            <td align="right" width="425px" colspan="2">у</td>
            <td align="center" width="(100% - 850px)" class="td_unln"> {{#textInput}}DECLAR.DECLARBODY.REP_Y####{"style": "font-weight: bold;"}{{{}}}{{/textInput}} </td>
            <td align="left" width="425px" colspan="2"><b>p.</b></td>
        </tr>
        <tr>
            <td colspan="5">&nbsp;</td>
        </tr>
    </tbody>
</table>
<br clear="none">
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
    <tbody>
        <tr>
            <td align="center" class="td_box_1" width="(100% - 580px)" style="border: 1px solid black">Подають:</td>
            <td align="center" class="td_box_1" width="240px" style="border: 1px solid black">Термін подання</td>
            <td align="center" rowspan="2" valign="middle" width="315px"><b>№ 7-ПВ</b><br clear="none">(один раз на чотири роки)<br clear="none">ЗАТВЕРДЖЕНО <br clear="none"> Наказ Держстату <br clear="none"> 17.06.2020 р.№ 183</td>
        </tr>
        <tr align="center" class="td_box_1">
            <td align="left" class="td_box_1" style="border: 1px solid black">юридичні особи, відокремлені підрозділи юридичних осіб <br clear="none"> - територіальному органу Держстату</td>
            <td class="td_box_1" valign="middle" style="border: 1px solid black">не пізніше<br clear="none">31 березня<br clear="none"></td>
        </tr>
    </tbody>
</table>
<br clear="none">
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse; border: 1px solid black" cellspacing="0" cellpadding="0px" width="1050px">
    <tbody>
        <tr>
            <td nowrap="nowrap" width="155px"><b>Респондент:</b></td>
            <td valign="bottom" width="105px">&nbsp;&nbsp;</td>
            <td valign="bottom" width="315px">&nbsp;</td>
            <td valign="bottom" width="(100% - 575px)">&nbsp;</td>
        </tr>
        <tr>
            <td nowrap="nowrap">Найменування:</td>
            <td class="td_unln" colspan="3" valign="bottom">
                {{#textInput}}DECLAR.DECLARBODY.FIRM_NAME####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
            </td>
        </tr>
        
        <tr>
            <td nowrap="nowrap" colspan="2">Місцезнаходження (юридична адреса):</td>
            <td class="td_unln" colspan="2">&nbsp;&nbsp;</td>
        </tr>
        <tr>
            <td class="td_unln" colspan="4" valign="bottom">
                {{#textInput}}DECLAR.DECLARBODY.FIRM_ADR####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
            </td>
        </tr>
        <tr>
            <td align="center" colspan="4" style="font-size:0.75em;"><i>(поштовий індекс, область / АР Крим, район, населений пункт, вулиця / провулок, площа тощо, № будинку / корпусу, № квартири / офісу)</i></td>
        </tr>
        <tr>
            <td colspan="3" nowrap="nowrap">Адреса здійснення діяльності, щодо якої подається форма звітності (фактична адреса):</td>
            <td class="td_unln">&nbsp;&nbsp;</td>
        </tr>
        <tr class="td_unln">
            <td class="td_unln" colspan="4">
                {{#textInput}}DECLAR.DECLARBODY.FIRM_ADR_FIZ####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
            </td>
        </tr>
        <tr>
            <td align="center" colspan="4" style="font-size:0.75em;"><i>(поштовий індекс, область / АР Крим, район, населений пункт, вулиця / провулок, площа тощо, № будинку / корпусу, № квартири / офісу)</i></td>
        </tr>
    </tbody>
</table>
<br clear="none">
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse; border: 0px" cellspacing="0" cellpadding="0px" width="1050px">
    <tbody>
        <tr>
            <td align="center" width="315px" style="padding: 10px">{{#textInput}}DECLAR.DECLARBODY.TER_STRUK{{{}}}{{/textInput}}</td>
            <td width="(100% - 315px)"> - КОАТУУ</td>
        </tr>
        <tr>
            <td align="center"></td>
            <td style="font-size:0.75em;">(фактична адреса визначається автоматично в разі подання форми в електронному вигляді)</td>
        </tr> 
    </tbody>
</table>

<br clear="none">
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse; border: 1px solid black" cellspacing="0" cellpadding="0px" width="1050px">
    <tbody>
        <tr>
            <td align="center" width="(100% - 105px)" style="padding: 4px;"><b>Інформація щодо відсутності даних</b></td>
            <td align="center" width="105px"  style="padding: 4px;"></td>
        </tr>
        <tr>
            <td width="(100% - 105px)">У випадку відсутності даних необхідно поставити у прямокутнику позначку - V</td>
            <td align="center" width="105px" style="padding: 10px"">
            {{#booleanInput}}DECLAR.DECLARBODY.ZERO_ZVI####{"printType":"box", "cleanAbsent": ["DECLAR.DECLARBODY.REASON1","DECLAR.DECLARBODY.REASON2","DECLAR.DECLARBODY.REASON3","DECLAR.DECLARBODY.REASON4","DECLAR.DECLARBODY.REASON5","DECLAR.DECLARBODY.REASON6"]}{{{}}}{{/booleanInput}}</td>
        </tr>
        <tr>
            <td colspan="2" style="padding: 4px;">Зазначте одну з наведених нижче причин відсутності даних:</td>
        </tr>
         <tr>
            <td width="(100% - 105px)">Не здійснюється вид економічної діяльності, який спостерігається</td>
            <td align="center" width="105px" style="padding: 10px"">{{#booleanInput}}DECLAR.DECLARBODY.REASON1####{"printType":"box", "checkParent": "DECLAR.DECLARBODY.ZERO_ZVI", "linkedPath": ["DECLAR.DECLARBODY.REASON2","DECLAR.DECLARBODY.REASON3","DECLAR.DECLARBODY.REASON4","DECLAR.DECLARBODY.REASON5","DECLAR.DECLARBODY.REASON6"]}{{{}}}{{/booleanInput}}</td>
        </tr>
         <tr>
            <td width="(100% - 105px)">Одиниця припинена або перебуває в стадії припинення</td>
            <td align="center" width="105px" style="padding: 10px"">{{#booleanInput}}DECLAR.DECLARBODY.REASON2####{"printType":"box", "checkParent": "DECLAR.DECLARBODY.ZERO_ZVI", "linkedPath": ["DECLAR.DECLARBODY.REASON1","DECLAR.DECLARBODY.REASON3","DECLAR.DECLARBODY.REASON4","DECLAR.DECLARBODY.REASON5","DECLAR.DECLARBODY.REASON6"]}{{{}}}{{/booleanInput}}</td>
        </tr>
         <tr>
            <td>Здійснюється сезонна діяльність або економічна діяльність, пов'язана з тривалим циклом виробництва</td>
            <td align="center" width="105px" style="padding: 10px"">{{#booleanInput}}DECLAR.DECLARBODY.REASON3####{"printType":"box", "checkParent": "DECLAR.DECLARBODY.ZERO_ZVI", "linkedPath": ["DECLAR.DECLARBODY.REASON1","DECLAR.DECLARBODY.REASON2","DECLAR.DECLARBODY.REASON4","DECLAR.DECLARBODY.REASON5","DECLAR.DECLARBODY.REASON6"]}{{{}}}{{/booleanInput}}</td>
        </tr>
         <tr>
            <td width="(100% - 105px)">Тимчасово призупинено економічну діяльність через економічні чинники/карантинні обмеження</td>
            <td align="center" width="105px" style="padding: 10px"">{{#booleanInput}}DECLAR.DECLARBODY.REASON4####{"printType":"box", "checkParent": "DECLAR.DECLARBODY.ZERO_ZVI", "linkedPath": ["DECLAR.DECLARBODY.REASON1","DECLAR.DECLARBODY.REASON2","DECLAR.DECLARBODY.REASON3","DECLAR.DECLARBODY.REASON5","DECLAR.DECLARBODY.REASON6"]}{{{}}}{{/booleanInput}}</td>
        </tr>
         <tr>
            <td width="(100% - 105px)">Проведено чи проводиться реорганізація або передано виробничі фактори іншій одиниці</td>
            <td align="center" width="105px" style="padding: 10px"">{{#booleanInput}}DECLAR.DECLARBODY.REASON5####{"printType":"box", "checkParent": "DECLAR.DECLARBODY.ZERO_ZVI", "linkedPath": ["DECLAR.DECLARBODY.REASON1","DECLAR.DECLARBODY.REASON2","DECLAR.DECLARBODY.REASON3","DECLAR.DECLARBODY.REASON4","DECLAR.DECLARBODY.REASON6"]}{{{}}}{{/booleanInput}}</td>
        </tr>
         <tr>
            <td width="(100% - 105px)">Відсутнє явище, яке спостерігається</td>
            <td align="center" width="105px" style="padding: 10px"">{{#booleanInput}}DECLAR.DECLARBODY.REASON6####{"printType":"box", "checkParent": "DECLAR.DECLARBODY.ZERO_ZVI", "linkedPath": ["DECLAR.DECLARBODY.REASON1","DECLAR.DECLARBODY.REASON2","DECLAR.DECLARBODY.REASON3","DECLAR.DECLARBODY.REASON4","DECLAR.DECLARBODY.REASON5"]}{{{}}}{{/booleanInput}}</td>
        </tr> 
    </tbody>
</table>















<br clear="none">
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
    <tbody>
        <tr>
            <td width="100%" align="center"><h3>Розділ I. Загальна інформація щодо організації оплати праці</h3></td>
        </tr>
        <tr>
            <td width="100%" align="center">(станом на 31 грудня {{DECLAR.DECLARBODY.REP_Y}} року)</td>
        </tr>
    </tbody>
</table>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
    <tbody>
        <tr>
            <td align="center" border="1" valign="middle" width="100px">Код рядка</td>
            <td align="right" border="1" valign="middle" width="(100% - 100px)">Позначається один обраний варіант відповіді "V"</td>
        </tr>
    </tbody>
</table>

<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px" border="0" bordercolor="black" cellspacing="0">
    <tbody>
        <tr>
            <td align="center" width="100px" class="borderDataA">710</td>
            <td align="left" width="(100% - 430px)" class="borderTopBottom">Чи діяв на підприємстві колективний договір?</td>
            
            <td align="right" class="borderTopBottom" width="60px">так</td>
            <td align="center" class="borderTopBottom" width="45px">{{#booleanInput}}DECLAR.DECLARBODY.N1_1####{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.N1_2"]}{{{}}}{{/booleanInput}}</td>
            <td align="left" class="borderTopBottom" width="60px">-1</td>
            
            <td align="right" class="borderTopBottom" width="60px">ні</td>
            <td align="center" class="borderTopBottom" width="45px">{{#booleanInput}}DECLAR.DECLARBODY.N1_2####{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.N1_1"]}{{{}}}{{/booleanInput}}</td>
            <td align="left" class="borderTopBottomRight" width="60px">-2</td>
        </tr>
    </tbody>
</table>
<br clear="none">
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px" border="0" bordercolor="black" cellspacing="0">
    <tbody>
        <tr>
            <td align="center" width="100px" class="borderDataA">720</td>
            <td align="left" width="(100% - 430px)" class="borderTopBottom">Яка форма оплати праці застосовувалась для <br clear="none">більшості (понад 50%) працівників підприємства?</td>
            
            <td align="right" class="borderTopBottom" width="60px">почасова</td>
            <td align="center" class="borderTopBottom" width="45px">{{#booleanInput}}DECLAR.DECLARBODY.N2_1####{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.N2_2"]}{{{}}}{{/booleanInput}}</td>
            <td align="left" class="borderTopBottom" width="60px">-1</td>
            
            <td align="right" class="borderTopBottom" width="60px">відрядна</td>
            <td align="center" class="borderTopBottom" width="45px">{{#booleanInput}}DECLAR.DECLARBODY.N2_2####{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.N2_1"]}{{{}}}{{/booleanInput}}</td>
            <td align="left" class="borderTopBottomRight" width="60px">-2</td>
        </tr>
    </tbody>
</table>
<br clear="none">
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px" border="0" bordercolor="black" cellspacing="0">
    <tbody>
        <tr>
            <td align="center" width="100px" class="borderDataA">730</td>
            <td align="left" width="(100% - 430px)" class="borderTopBottom">Чи застосовувалась для організації оплати праці на <br clear="none">підприємстві тарифна сітка (схема посадових окладів)?</td>
            
            <td align="right" class="borderTopBottom" width="60px">так</td>
            <td align="center" class="borderTopBottom" width="45px">{{#booleanInput}}DECLAR.DECLARBODY.N3_1####{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.N3_2"]}{{{}}}{{/booleanInput}}</td>
            <td align="left" class="borderTopBottom" width="60px">-1</td>
            
            <td align="right" class="borderTopBottom" width="60px">ні</td>
            <td align="center" class="borderTopBottom" width="45px">{{#booleanInput}}DECLAR.DECLARBODY.N3_2####{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.N3_1"]}{{{}}}{{/booleanInput}}</td>
            <td align="left" class="borderTopBottomRight" width="60px">-2</td>
        </tr>
    </tbody>
</table>
<br clear="none">
      
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px" border="0" bordercolor="black" cellspacing="0">
    <tbody>
        <tr>
            <td align="center" class="borderDataA" width="100px" rowspan="3">735</td>
            <td align="left" class="borderTopBottom" width="(100% - 430px)" rowspan="3">Якщо звіт надається також за інших юридичних осіб, <br clear="none">виберіть, будь ласка, відповідний вид їхньої <br clear="none">діяльності з наступних та позначте обраний варіант:</td>
            <td align="left" class="borderTop" width="225px" colspan="4">освіта</td>
            <td align="center" class="borderTop" width="45px">{{#booleanInput}}DECLAR.DECLARBODY.N4_1####{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.N6_1", "DECLAR.DECLARBODY.N5_1"]}{{{}}}{{/booleanInput}}</td>
            <td align="left" class="borderTopRight" width="60px">-1</td>
        </tr>
        <tr>
            <td align="left" width="225px" colspan="4">охорона здоров’я та надання <br clear="none">соціальної допомоги</td>
            <td align="center" width="45px">{{#booleanInput}}DECLAR.DECLARBODY.N5_1####{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.N4_1", "DECLAR.DECLARBODY.N6_1"]}{{{}}}{{/booleanInput}}</td>
            <td align="left" class="borderRight" width="60px">-2</td>
        </tr>
        <tr>
            <td align="left" class="borderBottom" width="225px" colspan="4">діяльність у сфері творчості, <br clear="none">мистецтва та розваг</td>
            <td align="center" class="borderBottom" width="45px">{{#booleanInput}}DECLAR.DECLARBODY.N6_1####{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.N4_1", "DECLAR.DECLARBODY.N5_1"]}{{{}}}{{/booleanInput}}</td>
            <td align="left" class="borderBottomRight" width="60px">-3</td>
        </tr>
    </tbody>
</table>
<br clear="none">

<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
    <tbody>
        <tr>
            <td align="center"><h3>Розділ II. Загальні відомості щодо кількості працівників <br clear="none">та їх відбору для обстеження</h3></td>
        </tr>
    </tbody>
</table>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px" border="1" bordercolor="black" cellspacing="0">
    <tbody>
        <tr>
            <td align="center" valign="middle" width="100px">Код рядка</td>
            <td align="center" valign="middle" width="(100% - 420px)">Назва показників</td>
            <td align="center" valign="middle" width="160px">Жовтень<br clear="none">{{#textInput}}DECLAR.DECLARBODY.REP_NYE####{{{}}}{{/textInput}}</td>
            <td align="center" valign="middle" width="160px">{{#textInput}}DECLAR.DECLARBODY.REP_NY####{{{}}}{{/textInput}}</td>
        </tr>
        <tr>
            <td align="center" valign="middle">А</td>
            <td align="center" valign="middle">Б</td>
            <td align="center" valign="middle">1</td>
            <td align="center" valign="middle">2</td>
        </tr>
        <tr>
            <td align="center">740</td>
            <td>Середньооблікова кількість штатних працівників, осіб<br clear="none"><i>(у цілих числах)</i></td>
            <td align="center">{{#intInput}}DECLAR.DECLARBODY.A740_1{{{}}}{{/intInput}}</td>
            <td align="center">{{#intInput}}DECLAR.DECLARBODY.A740_2{{{}}}{{/intInput}}</td>
        </tr>
        <tr>
            <td align="center">750</td>
            <td>Фонд оплати праці штатних працівників, тисяч гривень <br clear="none"><i>(з одним десятковим знаком)</i></td>
            <td align="center">{{#float1Input}}DECLAR.DECLARBODY.A750_1{{{}}}{{/float1Input}}</td>
            <td align="center">{{#float1Input}}DECLAR.DECLARBODY.A750_2{{{}}}{{/float1Input}}</td>
        </tr>
        <tr>
            <td align="center">760</td>
            <td>Облікова кількість працівників на 31 жовтня, з яких здійснюється відбір, крім тих, які не мали нарахувань із фонду оплати праці за жовтень, або були прийняті на підприємство після 21 жовтня, осіб<br clear="none">(ОК) <i>(у цілих числах)</i></td>
            <td align="center">{{#intInput}}DECLAR.DECLARBODY.A760_1####{"detailData":"A760_1"}{{{}}}{{/intInput}}</td>
            <td align="center">X</td>
        </tr>
        <tr>
            <td align="center">770</td>
            <td>Кількість працівників, які підлягають обстеженню, осіб (КВ)<br clear="none"><i>(у цілих числах) (із рядка 760)</i></td>
            <td align="center">{{#intInput}}DECLAR.DECLARBODY.A770_1####{"detailData":"A770_1"}{{{}}}{{/intInput}}</td>
            <td align="center">X</td>
        </tr>
        <tr>
            <td align="center">780</td>
            <td>Інтервал відбору (ІВ) <i>(з одним десятковим знаком)</i></td>
            <td align="center">{{#float1Input}}DECLAR.DECLARBODY.A780_1{{{}}}{{/float1Input}}</td>
            <td align="center">X</td>
        </tr>
        <tr>
            <td align="center">790</td>
            <td>Порядковий номер першого працівника у вибірці (ПВ)<br clear="none"><i>(у цілих числах)</i></td>
            <td align="center">{{#intInput}}DECLAR.DECLARBODY.A790_1{{{}}}{{/intInput}}</td>
            <td align="center">X</td>
        </tr>      
    </tbody>
</table>

<br clear="none">
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
    <tbody>
        <tr>
            <td align="right" nowrap="nowrap" style="border: 0" >форма № 7-ПВ (один раз на чотири роки)</td>
        </tr>
    </tbody>
</table>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
    <tbody>
        <tr>
            <td width="(100% - 580px)">&nbsp;</td>
            <td align="center" nowrap="nowrap" width="315px" style="border: 1px solid black">Ідентифікаційний код ЄДРПОУ</td>
            <td align="center" width="265px" style="border: 1px solid black">{{#textInput}}DECLAR.DECLARBODY.FIRM_EDRPOU####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}</td>
        </tr>
    </tbody>
</table>
<br clear="none">

<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
    <tbody>
        <tr>
            <td align="center" ><h3>Розділ IІІ. Відомості щодо відібраних працівників</h3></td>
        </tr>
    </tbody>
</table>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; font-size: 10pt; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px" border="0" bordercolor="black" cellspacing="0">
    <tbody>
        <tr>
            <td align="center" valign="middle" width="100px">Код рядка</td>
            <td width="(100% - 795px)">&nbsp;</td>
            <td width="215px">&nbsp;</td>

            <td width="40px" >&nbsp;</td>
            <td width="40px" >&nbsp;</td>
            <td width="40px" >&nbsp;</td>

            <td width="40px" >&nbsp;</td>
            <td width="40px" >&nbsp;</td>
            <td width="40px" >&nbsp;</td>

            <td width="40px" >&nbsp;</td>
            <td width="40px" >&nbsp;</td>
            <td width="40px" >&nbsp;</td>

            <td width="40px" >&nbsp;</td>
            <td width="40px" >&nbsp;</td>
            <td width="40px" >&nbsp;</td>
        </tr>
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7110</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2"><b>Порядковий номер працівника у вибірці (від 1 до КВ)</b><i>(у цілих числах) {{tabNum}}</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#intInput}}DECLAR.DECLARBODY.A7110_1{{{}}}{{/intInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#intInput}}DECLAR.DECLARBODY.A7110_2{{{}}}{{/intInput}}</td>
        </tr>
        <tr>
            <td class="borderDataA" align="left" valign="middle" width="100px"></td>
            <td class="borderDataA" align="center" valign="middle" colspan="14" width="(100% - 100px)"><b>Постійні індивідуальні дані працівника станом на 31 жовтня {{DECLAR.DECLARBODY.REP_Y}} року</b> (позначається один обраний варіант відповіді "ν" або заповнюється)</td>
        </tr>
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7120</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Стать</td>
            <td class="borderTopBottom" align="right" valign="middle" width="40px">чоловік</td>
            <td class="borderTopBottom" align="center" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.A7120_1####{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.A7120_2"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderTopBottom" align="left" valign="middle" width="40px">-1</td>
            <td class="borderTopBottom" align="right" valign="middle" width="40px">жінка</td>
            <td class="borderTopBottom" align="center" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.A7120_2####{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.A7120_1"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderTopBottomRight" align="left" valign="middle" width="40px">-2</td>
            <td class="borderTopBottom" align="right" valign="middle" width="40px">чоловік</td>
            <td class="borderTopBottom" align="center" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.A7120_3####{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.A7120_4"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderTopBottom" align="left" valign="middle" width="40px">-1</td>
            <td class="borderTopBottom" align="right" valign="middle" width="40px">жінка</td>
            <td class="borderTopBottom" align="center" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.A7120_4####{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.A7120_3"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderTopBottomRight" align="left" valign="middle" width="40px">-2</td>
        </tr>
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7130</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Вік, повних років</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#intInput}}DECLAR.DECLARBODY.A7130_1{{{}}}{{/intInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#intInput}}DECLAR.DECLARBODY.A7130_2{{{}}}{{/intInput}}</td>
        </tr>
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px" rowspan="3">7131</td>
            <td class="borderTopBottom" align="left" valign="top" width="(100% - 795px)" rowspan="3">Громадянство:</td>
            <td class="borderTopRight" align="left" valign="middle" width="215px">громадянин України - 1</td>
            <td class="borderTop" align="right" width="80px" colspan="2">&nbsp;</td>
            <td class="borderTop" align="right" width="40px" >{{#booleanInput}}DECLAR.DECLARBODY.A71311_1####{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.A71312_1", "DECLAR.DECLARBODY.A71313_1"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderTopRight" align="left" valign="middle" width="120px" colspan="3">-1</td>
            <td class="borderTop" align="right" width="80px" colspan="2">&nbsp;</td>
            <td class="borderTop" align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.A71311_2####{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.A71312_2", "DECLAR.DECLARBODY.A71313_2"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderTopRight" align="left" valign="middle" width="120px" colspan="3">-1</td>
        </tr>
        <tr>
            <td class="borderRight" align="left" valign="middle" width="215px">іноземець - 2</td>
            <td align="right" width="80px" colspan="2">&nbsp;</td>
            <td align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.A71312_1####{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.A71311_1", "DECLAR.DECLARBODY.A71313_1"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderRight" align="left" valign="middle" width="120px" colspan="3">-2</td>
            <td align="right" width="80px" colspan="2">&nbsp;</td>
            <td align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.A71312_2####{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.A71311_2", "DECLAR.DECLARBODY.A71313_2"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderRight" align="left" valign="middle" width="120px" colspan="3">-2</td>
        </tr>
        <tr>
            <td class="borderBottomRight" align="left" valign="middle" width="215px">особа без громадянства - 3</td>
            <td class="borderBottom" align="right" width="80px" colspan="2">&nbsp;</td>
            <td class="borderBottom" align="right" width="40px" >{{#booleanInput}}DECLAR.DECLARBODY.A71313_1####{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.A71312_1", "DECLAR.DECLARBODY.A71311_1"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderBottomRight" align="left" valign="middle" width="120px" colspan="3">-3</td>
            <td class="borderBottom" align="right" width="80px" colspan="2">&nbsp;</td>
            <td class="borderBottom" align="right" width="40px" >{{#booleanInput}}DECLAR.DECLARBODY.A71313_2####{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.A71312_2", "DECLAR.DECLARBODY.A71311_2"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderBottomRight" align="left" valign="middle" width="120px" colspan="3">-3</td>
        </tr>
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7140</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Стаж роботи на підприємстві, повних років</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#intInput}}DECLAR.DECLARBODY.A7140_1{{{}}}{{/intInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#intInput}}DECLAR.DECLARBODY.A7140_2{{{}}}{{/intInput}}</td>
        </tr>
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px" rowspan="9">7150</td>
            <td class="borderTopBottom" align="left" valign="top" width="215px" rowspan="9">Освіта:</td>
            <td class="borderTopRight" align="left" valign="middle" width="215px">докторантура або її еквівалент - 1</td>
            <td class="borderTop" align="right" width="80px" colspan="2">&nbsp;</td>
            <td class="borderTop" align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.A71501_1####{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.A71502_1", "DECLAR.DECLARBODY.A71503_1", "DECLAR.DECLARBODY.A71504_1", "DECLAR.DECLARBODY.A71505_1", "DECLAR.DECLARBODY.A71506_1", "DECLAR.DECLARBODY.A71507_1", "DECLAR.DECLARBODY.A71508_1", "DECLAR.DECLARBODY.A71509_1"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderTopRight" align="left" valign="middle" width="120px" colspan="3">-1</td>
            <td class="borderTop" align="right" width="80px" colspan="2">&nbsp;</td>
            <td class="borderTop" align="right" width="40px" >{{#booleanInput}}DECLAR.DECLARBODY.A71501_2####{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.A71502_2", "DECLAR.DECLARBODY.A71503_2", "DECLAR.DECLARBODY.A71504_2", "DECLAR.DECLARBODY.A71505_2", "DECLAR.DECLARBODY.A71506_2", "DECLAR.DECLARBODY.A71507_2", "DECLAR.DECLARBODY.A71508_2", "DECLAR.DECLARBODY.A71509_2"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderTopRight" align="left" valign="middle" width="120px" colspan="3">-1</td>
        </tr>
        <tr>
            <td class="borderRight" align="left" valign="middle" width="215px">магістратура або її еквівалент - 2</td>
            <td align="right" width="80px" colspan="2">&nbsp;</td>
            <td align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.A71502_1####{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.A71501_1", "DECLAR.DECLARBODY.A71503_1", "DECLAR.DECLARBODY.A71504_1", "DECLAR.DECLARBODY.A71505_1", "DECLAR.DECLARBODY.A71506_1", "DECLAR.DECLARBODY.A71507_1", "DECLAR.DECLARBODY.A71508_1", "DECLAR.DECLARBODY.A71509_1"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderRight" align="left" valign="middle" width="120px" colspan="3">-2</td>
            <td align="right" width="80px" colspan="2">&nbsp;</td>
            <td align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.A71502_2####{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.A71501_2", "DECLAR.DECLARBODY.A71503_2", "DECLAR.DECLARBODY.A71504_2", "DECLAR.DECLARBODY.A71505_2", "DECLAR.DECLARBODY.A71506_2", "DECLAR.DECLARBODY.A71507_2", "DECLAR.DECLARBODY.A71508_2", "DECLAR.DECLARBODY.A71509_2"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderRight" align="left" valign="middle" width="120px" colspan="3">-2</td>
        </tr>
        <tr>
            <td class="borderRight" align="left" valign="middle" width="215px">бакалаврат або його еквівалент - 3</td>
            <td align="right" width="80px" colspan="2">&nbsp;</td>
            <td align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.A71503_1####{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.A71501_1", "DECLAR.DECLARBODY.A71502_1", "DECLAR.DECLARBODY.A71504_1", "DECLAR.DECLARBODY.A71505_1", "DECLAR.DECLARBODY.A71506_1", "DECLAR.DECLARBODY.A71507_1", "DECLAR.DECLARBODY.A71508_1", "DECLAR.DECLARBODY.A71509_1"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderRight" align="left" valign="middle" width="120px" colspan="3">-3</td>
            <td align="right" width="80px" colspan="2">&nbsp;</td>
            <td align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.A71503_2####{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.A71501_2", "DECLAR.DECLARBODY.A71502_2", "DECLAR.DECLARBODY.A71504_2", "DECLAR.DECLARBODY.A71505_2", "DECLAR.DECLARBODY.A71506_2", "DECLAR.DECLARBODY.A71507_2", "DECLAR.DECLARBODY.A71508_2", "DECLAR.DECLARBODY.A71509_2"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderRight" align="left" valign="middle" width="120px" colspan="3">-3</td>
        </tr>
        <tr>
            <td class="borderRight" align="left" valign="middle" width="215px">короткий цикл вищої освіти - 4</td>
            <td align="right" width="80px" colspan="2">&nbsp;</td>
            <td align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.A71504_1####{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.A71501_1", "DECLAR.DECLARBODY.A71502_1", "DECLAR.DECLARBODY.A71503_1", "DECLAR.DECLARBODY.A71505_1", "DECLAR.DECLARBODY.A71506_1", "DECLAR.DECLARBODY.A71507_1", "DECLAR.DECLARBODY.A71508_1", "DECLAR.DECLARBODY.A71509_1"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderRight" align="left" valign="middle" width="120px" colspan="3">-4</td>
            <td align="right" width="80px" colspan="2">&nbsp;</td>
            <td align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.A71504_2####{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.A71501_2", "DECLAR.DECLARBODY.A71502_2", "DECLAR.DECLARBODY.A71503_2", "DECLAR.DECLARBODY.A71505_2", "DECLAR.DECLARBODY.A71506_2", "DECLAR.DECLARBODY.A71507_2", "DECLAR.DECLARBODY.A71508_2", "DECLAR.DECLARBODY.A71509_2"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderRight" align="left" valign="middle" width="120px" colspan="3">-4</td>
        </tr>
        <tr>
            <td class="borderRight" align="left" valign="middle" width="215px">післясередня не вища освіта - 5</td>
            <td align="right" width="80px" colspan="2">&nbsp;</td>
            <td align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.A71505_1####{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.A71501_1", "DECLAR.DECLARBODY.A71502_1", "DECLAR.DECLARBODY.A71503_1", "DECLAR.DECLARBODY.A71504_1", "DECLAR.DECLARBODY.A71506_1", "DECLAR.DECLARBODY.A71507_1", "DECLAR.DECLARBODY.A71508_1", "DECLAR.DECLARBODY.A71509_1"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderRight" align="left" valign="middle" width="120px" colspan="3">-5</td>
            <td align="right" width="80px" colspan="2">&nbsp;</td>
            <td align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.A71505_2####{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.A71501_2", "DECLAR.DECLARBODY.A71502_2", "DECLAR.DECLARBODY.A71503_2", "DECLAR.DECLARBODY.A71504_2", "DECLAR.DECLARBODY.A71506_2", "DECLAR.DECLARBODY.A71507_2", "DECLAR.DECLARBODY.A71508_2", "DECLAR.DECLARBODY.A71509_2"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderRight" align="left" valign="middle" width="120px" colspan="3">-5</td>
        </tr>
        <tr>
            <td class="borderRight" align="left" valign="middle" width="215px">другий етап середньої освіти - 6</td>
            <td align="right" width="80px" colspan="2">&nbsp;</td>
            <td align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.A71506_1####{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.A71501_1", "DECLAR.DECLARBODY.A71502_1", "DECLAR.DECLARBODY.A71503_1", "DECLAR.DECLARBODY.A71504_1", "DECLAR.DECLARBODY.A71505_1", "DECLAR.DECLARBODY.A71507_1", "DECLAR.DECLARBODY.A71508_1", "DECLAR.DECLARBODY.A71509_1"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderRight" align="left" valign="middle" width="120px" colspan="3">-6</td>
            <td align="right" width="80px" colspan="2">&nbsp;</td>
            <td align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.A71506_2####{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.A71501_2", "DECLAR.DECLARBODY.A71502_2", "DECLAR.DECLARBODY.A71503_2", "DECLAR.DECLARBODY.A71504_2", "DECLAR.DECLARBODY.A71505_2", "DECLAR.DECLARBODY.A71507_2", "DECLAR.DECLARBODY.A71508_2", "DECLAR.DECLARBODY.A71509_2"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderRight" align="left" valign="middle" width="120px" colspan="3">-6</td>
        </tr>
        <tr>
            <td class="borderRight" align="left" valign="middle" width="215px">перший етап середньої освіти - 7</td>
            <td align="right" width="80px" colspan="2">&nbsp;</td>
            <td align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.A71507_1####{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.A71501_1", "DECLAR.DECLARBODY.A71502_1", "DECLAR.DECLARBODY.A71503_1", "DECLAR.DECLARBODY.A71504_1", "DECLAR.DECLARBODY.A71505_1", "DECLAR.DECLARBODY.A71506_1", "DECLAR.DECLARBODY.A71508_1", "DECLAR.DECLARBODY.A71509_1"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderRight" align="left" valign="middle" width="120px" colspan="3">-7</td>
            <td align="right" width="80px" colspan="2">&nbsp;</td>
            <td align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.A71507_2####{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.A71501_2", "DECLAR.DECLARBODY.A71502_2", "DECLAR.DECLARBODY.A71503_2", "DECLAR.DECLARBODY.A71504_2", "DECLAR.DECLARBODY.A71505_2", "DECLAR.DECLARBODY.A71506_2", "DECLAR.DECLARBODY.A71508_2", "DECLAR.DECLARBODY.A71509_2"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderRight" align="left" valign="middle" width="120px" colspan="3">-7</td>
        </tr>
        <tr>
            <td class="borderRight" align="left" valign="middle" width="215px">початкова освіта - 8</td>
            <td align="right" width="80px" colspan="2">&nbsp;</td>
            <td align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.A71508_1####{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.A71501_1", "DECLAR.DECLARBODY.A71502_1", "DECLAR.DECLARBODY.A71503_1", "DECLAR.DECLARBODY.A71504_1", "DECLAR.DECLARBODY.A71505_1", "DECLAR.DECLARBODY.A71506_1", "DECLAR.DECLARBODY.A71507_1", "DECLAR.DECLARBODY.A71509_1"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderRight" align="left" valign="middle" width="120px" colspan="3">-8</td>
            <td align="right" width="80px" colspan="2">&nbsp;</td>
            <td align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.A71508_2####{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.A71501_2", "DECLAR.DECLARBODY.A71502_2", "DECLAR.DECLARBODY.A71503_2", "DECLAR.DECLARBODY.A71504_2", "DECLAR.DECLARBODY.A71505_2", "DECLAR.DECLARBODY.A71506_2", "DECLAR.DECLARBODY.A71507_2", "DECLAR.DECLARBODY.A71509_2"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderRight" align="left" valign="middle" width="120px" colspan="3">-8</td>
        </tr>
        <tr>
            <td class="borderBottomRight" align="left" valign="middle" width="215px">дошкільна освіта - 9</td>
            <td class="borderBottom" align="right" width="80px" colspan="2">&nbsp;</td>
            <td class="borderBottom" align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.A71509_1####{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.A71501_1", "DECLAR.DECLARBODY.A71502_1", "DECLAR.DECLARBODY.A71503_1", "DECLAR.DECLARBODY.A71504_1", "DECLAR.DECLARBODY.A71505_1", "DECLAR.DECLARBODY.A71506_1", "DECLAR.DECLARBODY.A71507_1", "DECLAR.DECLARBODY.A71508_1"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderBottomRight" align="left" valign="middle" width="120px" colspan="3">-9</td>
            <td class="borderBottom" align="right" width="80px" colspan="2">&nbsp;</td>
            <td class="borderBottom" align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.A71509_2####{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.A71501_2", "DECLAR.DECLARBODY.A71502_2", "DECLAR.DECLARBODY.A71503_2", "DECLAR.DECLARBODY.A71504_2", "DECLAR.DECLARBODY.A71505_2", "DECLAR.DECLARBODY.A71506_2", "DECLAR.DECLARBODY.A71507_2", "DECLAR.DECLARBODY.A71508_2"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderBottomRight" align="left" valign="middle" width="120px" colspan="3">-9</td>
        </tr>       
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px" rowspan="2">7160</td>
            <td class="borderTop" align="left" valign="top" width="(100% - 795px)" rowspan="2">Форма оплати праці:</td>
            <td class="borderTopRight" align="left" valign="middle" width="215px">почасова - 1</td>
            <td class="borderTop" align="right" width="80px" colspan="2">&nbsp;</td>
            <td class="borderTop" align="right" width="40px" >{{#booleanInput}}DECLAR.DECLARBODY.A71601_1####{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.A71602_1"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderTopRight" align="left" valign="middle" width="120px" colspan="3">-1</td>
            <td class="borderTop" align="right" width="80px" colspan="2">&nbsp;</td>
            <td class="borderTop" align="right" width="40px" >{{#booleanInput}}DECLAR.DECLARBODY.A71601_2####{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.A71602_2"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderTopRight" align="left" valign="middle" width="120px" colspan="3">-1</td>
        </tr>
        <tr>
            <td class="borderBottomRight" align="left" valign="middle" width="215px">відрядна - 2</td>
            <td class="borderBottom" align="right" width="80px" colspan="2">&nbsp;</td>
            <td class="borderBottom" align="right" width="40px" >{{#booleanInput}}DECLAR.DECLARBODY.A71602_1####{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.A71601_1"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderBottomRight" align="left" valign="middle" width="120px" colspan="3">-2</td>
            <td class="borderBottom" align="right" width="80px" colspan="2">&nbsp;</td>
            <td class="borderBottom" align="right" width="40px" >{{#booleanInput}}DECLAR.DECLARBODY.A71602_2####{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.A71601_2"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderBottomRight" align="left" valign="middle" width="120px" colspan="3">-2</td>
        </tr>
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px" rowspan="2">7170</td>
            <td class="borderTop" align="left" valign="top" width="215px" rowspan="2">Умови робочого часу:</td>
            <td class="borderTopRight" align="left" valign="middle" width="215px">повний робочий день - 1</td>
            <td class="borderTop" align="right" width="80px" colspan="2">&nbsp;</td>
            <td class="borderTop" align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.A71701_1####{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.A71702_1"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderTopRight" align="left" valign="middle" width="120px" colspan="3">-1</td>
            <td class="borderTop" align="right" width="80px" colspan="2">&nbsp;</td>
            <td class="borderTop" align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.A71701_2####{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.A71702_2"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderTopRight" align="left" valign="middle" width="120px" colspan="3">-1</td>
        </tr>
        <tr>
            <td class="borderBottomRight" align="left" valign="middle" width="215px">неповний робочий день - 2</td>
            <td class="borderBottom" align="right" width="80px" colspan="2">&nbsp;</td>
            <td class="borderBottom" align="right" width="40px" >{{#booleanInput}}DECLAR.DECLARBODY.A71702_1####{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.A71701_1"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderBottomRight" align="left" valign="middle" width="120px" colspan="3">-2</td>
            <td class="borderBottom" align="right" width="80px" colspan="2">&nbsp;</td>
            <td class="borderBottom" align="right" width="40px" >{{#booleanInput}}DECLAR.DECLARBODY.A71702_2####{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.A71701_2"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderBottomRight" align="left" valign="middle" width="120px" colspan="3">-2</td>
        </tr>
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7171</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Норма тривалості робочого часу на тиждень, годин</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#float1Input}}DECLAR.DECLARBODY.A7171_1{{{}}}{{/float1Input}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#float1Input}}DECLAR.DECLARBODY.A7171_2{{{}}}{{/float1Input}}</td>
        </tr>
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px" rowspan="3">7180</td>
            <td class="borderTop" align="left" valign="top" width="(100% - 795px)" rowspan="3">Тип трудового договору (контракту):</td>
            <td class="borderTopRight" align="left" valign="middle" width="215px">безстроковий - 1</td>
            <td class="borderTop" align="right" width="80px" colspan="2">&nbsp;</td>
            <td class="borderTop" align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.A71801_1####{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.A71802_1", "DECLAR.DECLARBODY.A71803_1"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderTopRight" align="left" valign="middle" width="120px" colspan="3">-1</td>
            <td class="borderTop" align="right" width="80px" colspan="2">&nbsp;</td>
            <td class="borderTop" align="right" width="40px" >{{#booleanInput}}DECLAR.DECLARBODY.A71801_2####{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.A71802_2", "DECLAR.DECLARBODY.A71803_2"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderTopRight" align="left" valign="middle" width="120px" colspan="3">-1</td>
        </tr>
        <tr>
            <td class="borderRight" align="left" valign="middle" width="215px">на визначений строк - 2</td>
            <td align="right" width="80px" colspan="2">&nbsp;</td>
            <td align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.A71802_1####{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.A71801_1", "DECLAR.DECLARBODY.A71803_1"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderRight" align="left" valign="middle" width="120px" colspan="3">-2</td>
            <td align="right" width="80px" colspan="2">&nbsp;</td>
            <td align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.A71802_2####{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.A71801_2", "DECLAR.DECLARBODY.A71803_2"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderRight" align="left" valign="middle" width="120px" colspan="3">-2</td>
        </tr>
        <tr>
            <td class="borderRight" align="left" valign="middle" width="215px">проходить випробування - 3</td>
            <td align="right" width="80px" colspan="2">&nbsp;</td>
            <td align="right" width="40px" >{{#booleanInput}}DECLAR.DECLARBODY.A71803_1####{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.A71802_1", "DECLAR.DECLARBODY.A71801_1"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderRight" align="left" valign="middle" width="120px" colspan="3">-3</td>
            <td align="right" width="80px" colspan="2">&nbsp;</td>
            <td align="right" width="40px" >{{#booleanInput}}DECLAR.DECLARBODY.A71803_2####{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.A71802_2", "DECLAR.DECLARBODY.A71801_2"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderRight" align="left" valign="middle" width="120px" colspan="3">-3</td>
        </tr>
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7190</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Професія (посада)</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#textInput}}DECLAR.DECLARBODY.A7190_1{{{}}}{{/textInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#textInput}}DECLAR.DECLARBODY.A7190_2{{{}}}{{/textInput}}</td>
        </tr>
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7191</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Код професії заповнюється в органі державної статистики (у разі подання електронної звітності – самостійно)</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#textInput}}DECLAR.DECLARBODY.A7191_1{{{}}}{{/textInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#textInput}}DECLAR.DECLARBODY.A7191_2{{{}}}{{/textInput}}</td>
        </tr>
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7210</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2"><b>Кількість оплаченого робочого часу (без тимчасової непрацездатності) у жовтні {{DECLAR.DECLARBODY.REP_Y}} року, годин</b><i>(у цілих числах)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#intInput}}DECLAR.DECLARBODY.A7210_1{{{}}}{{/intInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#intInput}}DECLAR.DECLARBODY.A7210_2{{{}}}{{/intInput}}</td>
        </tr>
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7220</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Кількість відпрацьованого робочого часу в жовтні {{DECLAR.DECLARBODY.REP_Y}} року, годин <i>(у цілих числах) (із рядка 7210)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#intInput}}DECLAR.DECLARBODY.A7220_1{{{}}}{{/intInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#intInput}}DECLAR.DECLARBODY.A7220_2{{{}}}{{/intInput}}</td>
        </tr>
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7230</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Кількість надурочно відпрацьованого робочого часу в жовтні {{DECLAR.DECLARBODY.REP_Y}} року, годин <i>(у цілих числах) (із рядка 7220)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#intInput}}DECLAR.DECLARBODY.A7230_1{{{}}}{{/intInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#intInput}}DECLAR.DECLARBODY.A7230_2{{{}}}{{/intInput}}</td>
        </tr>
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7310</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2"><b>Кількість оплаченого робочого часу (без тимчасової непрацездатності) у  {{DECLAR.DECLARBODY.REP_Y}} році, годин </b><i>(у цілих числах) (сума рядків 7320, 7340)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#intInput}}DECLAR.DECLARBODY.A7310_1{{{}}}{{/intInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#intInput}}DECLAR.DECLARBODY.A7310_2{{{}}}{{/intInput}}</td>
        </tr>
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7320</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Кількість відпрацьованого робочого часу у {{DECLAR.DECLARBODY.REP_Y}} році, годин <i>(у цілих числах)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#intInput}}DECLAR.DECLARBODY.A7320_1{{{}}}{{/intInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#intInput}}DECLAR.DECLARBODY.A7320_2{{{}}}{{/intInput}}</td>
        </tr>
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7330</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Кількість надурочно відпрацьованого робочого часу у {{DECLAR.DECLARBODY.REP_Y}} році, годин <i>(у цілих числах) (із рядка 7320)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#intInput}}DECLAR.DECLARBODY.A7330_1{{{}}}{{/intInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#intInput}}DECLAR.DECLARBODY.A7330_2{{{}}}{{/intInput}}</td>
        </tr>
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7340</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Кількість невідпрацьованого оплаченого робочого часу (без тимчасової непрацездатності) у {{DECLAR.DECLARBODY.REP_Y}} році, годин <i>(у цілих числах)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#intInput}}DECLAR.DECLARBODY.A7340_1{{{}}}{{/intInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#intInput}}DECLAR.DECLARBODY.A7340_2{{{}}}{{/intInput}}</td>
        </tr>
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7350</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Кількість невідпрацьованого робочого часу з причин щорічних відпусток у {{DECLAR.DECLARBODY.REP_Y}} році, годин <i>(у цілих числах) (із рядка 7340)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#intInput}}DECLAR.DECLARBODY.A7350_1{{{}}}{{/intInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#intInput}}DECLAR.DECLARBODY.A7350_2{{{}}}{{/intInput}}</td>
        </tr>             
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7410</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2"><b>Сума нарахованої заробітної плати в жовтні {{DECLAR.DECLARBODY.REP_Y}} року, гривень </b><i>(із двома десятковими знаками) (≥ сумі рядків 7420, 7430, 7440, 7450)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.A7410_1{{{}}}{{/currencyInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.A7410_2{{{}}}{{/currencyInput}}</td>
        </tr>
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7420</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Сума основної заробітної плати в жовтні {{DECLAR.DECLARBODY.REP_Y}} року, гривень <i>(із двома десятковими знаками)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.A7420_1{{{}}}{{/currencyInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.A7420_2{{{}}}{{/currencyInput}}</td>
        </tr>
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7430</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Сума надбавок та доплат за роботу в багатозмінному та безперервному режимі виробництва, у нічний час у жовтні {{DECLAR.DECLARBODY.REP_Y}} року, гривень <i>(із двома десятковими знаками)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.A7430_1{{{}}}{{/currencyInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.A7430_2{{{}}}{{/currencyInput}}</td>
        </tr>
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7440</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Сума премій та винагород у жовтні {{DECLAR.DECLARBODY.REP_Y}} року, гривень <i>(із двома десятковими знаками)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.A7440_1{{{}}}{{/currencyInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.A7440_2{{{}}}{{/currencyInput}}</td>
        </tr>
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7450</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Сума оплати роботи в надурочний час, у святкові та неробочі дні в жовтні {{DECLAR.DECLARBODY.REP_Y}} року, гривень <i>(із двома десятковими знаками)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.A7450_1{{{}}}{{/currencyInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.A7450_2{{{}}}{{/currencyInput}}</td>
        </tr>
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7510</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2"><b>Сума нарахованої заробітної плати у {{DECLAR.DECLARBODY.REP_Y}} році, гривень </b><i>(із двома десятковими знаками) (≥ сумі рядків 7520, 7530, 7540, 7550, 7560, 7570, 7580)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.A7510_1{{{}}}{{/currencyInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.A7510_2{{{}}}{{/currencyInput}}</td>
        </tr>
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7520</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Сума основної заробітної плати у {{DECLAR.DECLARBODY.REP_Y}} році, гривень <i>(із двома десятковими знаками)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.A7520_1{{{}}}{{/currencyInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.A7520_2{{{}}}{{/currencyInput}}</td>
        </tr>
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7530</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Сума надбавок та доплат за роботу в багатозмінному та безперервному режимі виробництва, у нічний час у {{DECLAR.DECLARBODY.REP_Y}} році, гривень <i>(із двома десятковими знаками)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.A7530_1{{{}}}{{/currencyInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.A7530_2{{{}}}{{/currencyInput}}</td>
        </tr>
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7540</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Сума доплати за роботу у важких і шкідливих умовах та в особливо важких і особливо шкідливих умовах праці у {{DECLAR.DECLARBODY.REP_Y}} році, гривень <i>(із двома десятковими знаками)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.A7540_1{{{}}}{{/currencyInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.A7540_2{{{}}}{{/currencyInput}}</td>
        </tr>
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7550</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Сума премій та винагород у {{DECLAR.DECLARBODY.REP_Y}} році – усього, гривень <i>(із двома десятковими знаками) (≥ сумі рядків 7551, 7552)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.A7550_1{{{}}}{{/currencyInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.A7550_2{{{}}}{{/currencyInput}}</td>
        </tr>
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7551</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Сума премій та винагород, що носять систематичний характер, у {{DECLAR.DECLARBODY.REP_Y}} році, гривень <i>(із двома десятковими знаками) (із рядка 7550)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.A7551_1{{{}}}{{/currencyInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.A7551_2{{{}}}{{/currencyInput}}</td>
        </tr>
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7552</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Сума винагород за підсумками роботи у {{DECLAR.DECLARBODY.REP_Y}} році, щорічні винагороди за вислугу років (стаж роботи), гривень <i>(із двома десятковими знаками) (із рядка 7550)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.A7552_1{{{}}}{{/currencyInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.A7552_2{{{}}}{{/currencyInput}}</td>
        </tr>
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7560</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Сума оплати роботи в надурочний час, у святкові та неробочі дні у {{DECLAR.DECLARBODY.REP_Y}} році, гривень <i>(із двома десятковими знаками)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.A7560_1{{{}}}{{/currencyInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.A7560_2{{{}}}{{/currencyInput}}</td>
        </tr>
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7570</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Сума оплати за невідпрацьований час (без тимчасової непрацездатності) у {{DECLAR.DECLARBODY.REP_Y}} році, гривень <i>(із двома десятковими знаками)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.A7570_1{{{}}}{{/currencyInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.A7570_2{{{}}}{{/currencyInput}}</td>
        </tr>
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7580</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Сума матеріальної допомоги у {{DECLAR.DECLARBODY.REP_Y}} році, гривень <i>(із двома десятковими знаками)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.A7580_1{{{}}}{{/currencyInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.A7580_2{{{}}}{{/currencyInput}}</td>
        </tr>      
    </tbody>
</table>

{{#generatorRows}}T1{{{}}}{{/generatorRows}}

<br clear="none">
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
    <tbody>
        <tr>
            <td class="td_unln" width="45%">&nbsp;</td>
            <td width="10%">&nbsp;</td>
            <td align="center" class="td_unln" width="45%">{{#textInput}}DECLAR.DECLARBODY.VIK_RUK####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}</td>
        </tr>
        <tr>
            <td style="font-size:0.75em; border-top: 1px solid black" align="center">Місце підпису керівника (власника) та/або особи,<br clear="none">відповідальної за достовірність наданої інформації</td>
            <td>&nbsp;</td>
            <td style="font-size:0.75em; border-top: 1px solid black" align="center">(П. І. Б.)</td>
        </tr>
    </tbody>
</table>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
    <tbody>
        <tr>
            <td align="right" nowrap="nowrap" width="10%"><span style="margin-left:5px; font-size:0.75em;">телефон:</span></td>
            <td align="center" class="td_unln" width="240px">{{#textInput}}DECLAR.DECLARBODY.VIK_TEL####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}</td>
            <td align="right" nowrap="nowrap" width="10%"><span style="margin-left:5px; font-size:0.75em;">електронна пошта:</span></td>
            <td class="td_unln" width="240px">{{#textInput}}DECLAR.DECLARBODY.VIK_EMAIL####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}</td>
            <td>&nbsp;</td>
        </tr>
    </tbody>
</table>

<style>
    .borderDataA {
        border: 1px solid #000;
    }
    .borderRightLeft {
        border-right: 1px solid #000;
        border-left: 1px solid #000;
    }
    .borderTopBottom {
        border-top: 1px solid #000;
        border-bottom: 1px solid #000;
    }
    .borderTopRightLeft {
        border-top: 1px solid #000;
        border-right: 1px solid #000;
        border-left: 1px solid #000;
    }
    .borderTopRight {
        border-top: 1px solid #000;
        border-right: 1px solid #000;
    }
    .borderTopBottomLeft {
        border-top: 1px solid #000;
        border-bottom: 1px solid #000;
        border-left: 1px solid #000;
    }
    .borderTopBottomRight{
        border-top: 1px solid #000;
        border-bottom: 1px solid #000;
        border-right: 1px solid #000;
    }
    .borderBottomRight{
        border-bottom: 1px solid #000;
        border-right: 1px solid #000;
    }
    .borderTop {
        border-top: 1px solid #000;
    }
    .borderBottom {
        border-bottom: 1px  solid #000;
    }
    .borderRight {
        border-right: 1px solid #000;
    }
</style>

`