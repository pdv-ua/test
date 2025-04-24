module.exports = `
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
    <tbody>
        <tr>
            <td width="45%">&nbsp;</td>
            <td align="center" class="td_box" nowrap="nowrap" width="30%" style="border: 1px solid black">Ідентифікаційний код ЄДРПОУ</td>
            <td align="center" class="td_box" width="25%" style="border: 1px solid black">
                {{#textInput}}DECLAR.DECLARBODY.FIRM_EDRPOU####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
            </td>
        </tr>
    </tbody>
</table>
<br/>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
    <tbody>
        <tr>
            <td align="center" colspan="6"><h3>Державне статистичне спостереження<h3></td>
        </tr>
        <tr>
            <td width="12%">&nbsp;</td>
            <td align="center" colspan="4" style="padding: 4px; border: 1px solid black"><b>Конфіденційність статистичної інформації забезпечується <br clear="none"> статтею 21 Закону України "Про державну статистику"</b></td>
            <td width="12%">&nbsp;</td>
        </tr>
        <tr>
            <td colspan="6">&nbsp;</td>
        </tr>
        <tr>
            <td align="center" colspan="6" style="border: 1px solid black"><b>Порушення порядку подання або використання даних державних статистичних спостережень тягне за собою <br clear="none"> відповідальність, яка встановлена статтею 186<sup>3</sup> Кодексу України про адміністративні правопорушення</b></td>
        </tr>
        <tr>
            <td align="center" colspan="6" style="padding-top: 8pt;"><h3>ЗВІТ ПРО ЗАБОРГОВАНІСТЬ З ОПЛАТИ ПРАЦІ</h3></td>
        </tr>
        <tr>
            <td align="center">&nbsp;</td>
            <td align="right" width="28%">на 1 </td>
            <td align="center" class="td_unln">
                {{#textInput}}DECLAR.DECLARBODY.MY_DATE####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
            </td>
            <td align="center" width="10%">{{#intInput}}DECLAR.DECLARBODY.REP_NYEAR####{"style": "font-weight: bold;"}{{{}}}{{/intInput}}</td>
            <td align="left">року&nbsp;</td>
            <td align="left"></td>
        </tr>
        <tr>
            <td align="center" colspan="2">&nbsp;</td>
            <td align="center" style="font-size:0.75em;"><i>(назва місяця наступного після звітного періоду)</i></td>
            <td align="left" colspan="3">&nbsp;</td>
        </tr>
    </tbody>
</table>
<br clear="none">
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
    <tbody>
        <tr>
            <td align="center" class="td_box_1" width="50%" style="border: 1px solid black">Подають:</td>
            <td align="center" class="td_box_1" width="20%" style="border: 1px solid black">Термін подання</td>
            <td align="center" rowspan="2" valign="middle" width="30%"><b>№ 3-борг</b><br clear="none">(місячна)<br clear="none">ЗАТВЕРДЖЕНО <br clear="none"> Наказ Держстату <br clear="none"> 21.07.2020 № 222</td>
        </tr>
        <tr align="center" class="td_box_1">
            <td align="left" class="td_box_1" style="border: 1px solid black">юридичні особи<br clear="none"> - територіальному органу Держстату</td>
            <td class="td_box_1" valign="middle" style="border: 1px solid black">не пізніше 7-го<br clear="none">числа місяця,<br clear="none">наступного за<br clear="none"> звітним періодом</td>
        </tr>
    </tbody>
</table>
<br clear="none">
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse; border: 1px solid black" cellspacing="0" cellpadding="0px" width="1050px">
    <tbody>
        <tr>
            <td nowrap="nowrap" width="15%"><b>Респондент:</b></td>
            <td valign="bottom" width="10%">&nbsp;&nbsp;</td>
            <td valign="bottom" width="30%">&nbsp;&nbsp;</td>
            <td valign="bottom">&nbsp;&nbsp;</td>
        </tr>
        <tr>
            <td nowrap="nowrap">Найменування:</td>
            <td class="td_unln" colspan="3" valign="bottom">{{#textInput}}DECLAR.DECLARBODY.FIRM_NAME####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}</td>
        </tr>
        <tr>
            <td colspan="2" nowrap="nowrap">Місцезнаходження (юридична адреса):&nbsp;&nbsp;</td>
            <td class="td_unln" colspan="2">&nbsp;&nbsp;</td>
        </tr>
        <tr class="td_unln">
            <td class="td_unln" colspan="4">{{#textInput}}DECLAR.DECLARBODY.FIRM_ADR####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}</td>
        </tr>
        <tr>
            <td align="center" colspan="4" style="font-size:0.75em;"><i>(поштовий індекс, область / АР Крим, район, населений пункт, вулиця / провулок, площа тощо, № будинку / корпусу, № квартири / офісу)</i></td>
        </tr>
        <tr>
            <td colspan="3" nowrap="nowrap">Адреса здійснення діяльності, щодо якої подається форма звітності (фактична адреса):</td>
            <td class="td_unln">&nbsp;&nbsp;</td>
        </tr>
        <tr class="td_unln">
            <td class="td_unln" colspan="4">{{#textInput}}DECLAR.DECLARBODY.FIRM_ADR_FIZ####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}</td>
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
            <td align="center" class="td_box" width="30%" style="padding: 10px">
                {{#textInput}}DECLAR.DECLARBODY.SPATO{{{}}}{{/textInput}}
            </td>
            <td> - КОАТУУ</td>
        </tr>
        <tr>
            <td align="center" width="40%"></td>
            <td style="font-size:0.75em;">(фактична адреса визначається автоматично в разі подання форми в електронному вигляді)</td>
        </tr> 
    </tbody>
</table>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
    <tbody>
        <tr>
            <td align="center" colspan="5"><h3>Розділ I. Інформація про відсутність заборгованості з оплати праці</h3></td>
        </tr>
    </tbody>
</table>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px" border="1" bordercolor="black" cellspacing="0">
    <tbody>
        <tr>
            <td align="center" valign="middle" width="75%">Назва показників</td>
            <td align="center" valign="middle" width="10%">Код рядка</td>
            <td align="center" valign="middle" width="15%">Позначка відповіді</td>
        </tr>
        <tr>
            <td align="center" valign="middle">А</td>
            <td align="center" valign="middle">Б</td>
            <td align="center" valign="middle">1</td>
        </tr>
        <tr>
            <td>На підприємстві (установі, організації) відсутня заборгованість з<br clear="none">виплати заробітної плати та зиплат у зв'язку з тимчасовою непрацездатністю<br clear="none"><i>(якщо у графі 1 є позначка "V", то звіт далі не заповнюється)</i></td>
            <td align="center">2000</td>
            <td align="center">{{#booleanInput}}DECLAR.DECLARBODY.A2000{{{}}}{{/booleanInput}}</td>
        </tr>
    </tbody>
</table>
<br clear="none">
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
    <tbody>
        <tr>
            <td align="center" colspan="5"><h3>Розділ 2. Обсяги заборгованості з оплати праці на підприємстві (установі, організації)</h3></td>
        </tr>
    </tbody>
</table>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px" border="1" bordercolor="black" cellspacing="0">
    <tbody>
        <tr>
            <td align="center" valign="middle" width="75%">Назва показників</td>
            <td align="center" valign="middle" width="10%">Код рядка</td>
            <td align="center" valign="middle" width="15%">Усього</td>
        </tr>
        <tr>
            <td align="center" valign="middle">А</td>
            <td align="center" valign="middle">Б</td>
            <td align="center" valign="middle">1</td>
        </tr>
        <tr>
            <td>Сума зaборгованості з виплати заробітної плати, тис.грн. <i>(з одним десятковим знаком)</i></td>
            <td align="center">2010</td>
            <td align="right">{{#float1Input}}DECLAR.DECLARBODY.A2010_1{{{}}}{{/float1Input}}</td>
        </tr>
        <tr>
            <td>Сума зaборгованості з виплати заробітної плати, утворена у попередні роки, тис.грн. <i>(з одним десятковим знаком) (із ряд. 2010)</i></td>
            <td align="center">2020</td>
            <td align="right">{{#float1Input}}DECLAR.DECLARBODY.A2020_1{{{}}}{{/float1Input}}</td>
        </tr>
        <tr>
            <td>Кількість працівників, яким своєчасно не виплачено заробітну плату, oci6 <i>(у цілих числах)</i></td>
            <td align="center">2030</td>
            <td align="right">{{#intInput}}DECLAR.DECLARBODY.A2030_1{{{}}}{{/intInput}}</td>
        </tr>
        <tr>
            <td>Сума зaборгованості з виплат працівникам у зв'язку з тимчасовою непрацездатністю, уключаючи оплату перших п'яти днів, тис.грн. <i>(з одним десятковим знаком)</i></td>
            <td align="center">2040</td>
            <td align="right">{{#float1Input}}DECLAR.DECLARBODY.A2040_1{{{}}}{{/float1Input}}</td>
        </tr>
        <tr>
            <td>Сума зaборгованості з виплати заробітної плати, яка фінансується за рахунок бюджетних коштів, тис. грн. <i>(з одним десятковим знаком)  (із ряд. 2010)</i></td>
            <td align="center">2050</td>
            <td align="right">{{#float1Input}}DECLAR.DECLARBODY.A2050_1{{{}}}{{/float1Input}}</td>
        </tr>
    </tbody>
</table>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px" border="1" bordercolor="black" cellspacing="0">
    <tbody>
        <tr>
            <td align="center" valign="middle" width="40%">Назва показника</td>
            <td align="center" valign="middle" width="60%">Основна причина відхилення</td>
        </tr>
        <tr>
            <td>Сума зaборгованості з виплати заробітної плати (ряд.2010) більше або менше 25% порівняно з попереднім періодом</td>
            <td>{{#textInput}}DECLAR.DECLARBODY.N1####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}</td>
        </tr>
    </tbody>
</table>
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
            <td align="center" class="td_unln" width="20%">{{#textInput}}DECLAR.DECLARBODY.VIK_TEL####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}</td>
            <td align="right" nowrap="nowrap" width="10%"><span style="margin-left:5px; font-size:0.75em;">електронна пошта:</span></td>
            <td class="td_unln" width="20%">{{#textInput}}DECLAR.DECLARBODY.VIK_EMAIL####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}</td>
            <td>&nbsp;</td>
        </tr>
    </tbody>
</table>
`
