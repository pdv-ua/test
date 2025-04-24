module.exports = `
<table style="table-layout: auto; margin-left: 15px; font-family: TimesNewRoman; font-size: 12px; border-collapse: collapse;" cellspacing="0" cellpadding="0" width="1050px">
    <tbody>
        <tr>
            <td width="75%">&nbsp;</td>
            <td>ЗАТВЕРДЖЕНО</td>
        </tr>
        <tr>
            <td width="55%">&nbsp;</td>
            <td>Наказ Міністерства соціальної політики України</td>
        </tr>
        <tr>
            <td width="55%">&nbsp;</td>
            <td>27 серпня 2020 року N 591</td>
        </tr>
    </tbody>
</table>
<table style="text-align: center; table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; font-size: 13.5px; border-collapse: collapse;" cellspacing="0" cellpadding="0" width="1050px">
    <tbody>
        <tr>
            <td width="100%" colspan="7">&nbsp;</td>
        </tr>
        <tr>
            <td style="font-weight: bold" colspan="7">ЗВІТНІСТЬ</td>
        </tr>
        <tr>
            <td style="font-weight: bold" colspan="7">Звіт про зайнятість і працевлаштування осіб з інвалідністю</td>
        </tr>
        <tr>
            <td style="font-weight: bold;text-align: right;" colspan="3">за</th>
            <td style="font-weight: bold">{{#intInput}}DECLAR.DECLARBODY.HZY{{{}}}{{/intInput}}</th>
            <td style="font-weight: bold;text-align: left;" colspan="3">рік</th>
        </tr>
    </tbody>
</table>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; font-size: 12px; border-collapse: collapse;" cellspacing="0" cellpadding="0" width="1050px">
    <tbody>   
        <tr>
            <td colspan="1" width="300px" style="border: 1px solid #000; text-align: center; padding: 2px;">Подають</td>
            <td colspan="1" style="border: 1px solid #000; text-align: center; padding: 2px;">Термін подання</td>
            <td rowspan="2" colspan="1" style="text-align: center; padding: 2px;"><span style="font-weight: bold">Форма N 10-ПОІ<br/>(річна)</span><br/>ЗАТВЕРДЖЕНО<br/>
                Наказ Міністерства соціальної політики України<br/>
                27 серпня 2020 року N 591<br/>
                за погодженням з Держстатом
            </td>
        </tr>
        <tr>
            <td colspan="1" style="border: 1px solid #000; text-align: center; padding: 2px;">Підприємства, установи, організації, у тому числі підприємства, організації громадських організацій осіб з інвалідністю, фізичні особи, що використовують найману працю, - відділенню Фонду соціального захисту інвалідів за своїм місцезнаходженням</td>
            <td colspan="1" style="border: 1px solid #000; text-align: center; padding: 2px;">не пізніше ніж 1 березня року, наступного за звітним</td>
        </tr>
        <tr>
            <td>&nbsp;</td>
        </tr>
</table>
<table style="table-layout: auto; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse; border: 1px solid black" cellspacing="0" cellpadding="0px" width="1050px">
    <tbody>
        <tr>
            <td nowrap="nowrap" width="15%"><b>Респондент:</b></td>
            <td valign="bottom" width="10%">&nbsp;&nbsp;</td>
            <td valign="bottom" width="30%">&nbsp;&nbsp;</td>
            <td valign="bottom">&nbsp;&nbsp;</td>
        </tr>
        <tr>
            <td nowrap="nowrap">Найменування юридичної особи / прізвище, ім'я, по батькові (за наявності) фізичної особи:</td>
            <td width="100%" class="td_unln" colspan="3" valign="bottom">{{#textInput}}DECLAR.DECLARBODY.FIRM_NAME####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}</td>
        </tr>
        <tr>
            <td colspan="2" nowrap="nowrap">Місцезнаходження / Місце проживання: &nbsp;&nbsp;</td>
            <td class="td_unln" colspan="2">&nbsp;&nbsp;</td>
        </tr>
        <tr class="td_unln">
            <td class="td_unln" colspan="4">{{#textInput}}DECLAR.DECLARBODY.FIRM_ADR####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}</td>
        </tr>
        <tr>
            <td align="center" colspan="4" style="font-size:0.75em;"><i>(вулиця (провулок, площа тощо), N будинку / корпусу, N квартири / офісу, населений пункт, район, область / Автономна Республіка Крим, поштовий індекс)</i></td>
        </tr>
        <tr>
            <td colspan="3" nowrap="nowrap">Адреса здійснення діяльності, щодо якої подається форма звітності:</td>
            <td class="td_unln">&nbsp;&nbsp;</td>
        </tr>
        <tr class="td_unln">
            <td class="td_unln" colspan="4">{{#textInput}}DECLAR.DECLARBODY.FIRM_ADR_FIZ####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}</td>
        </tr>
        <tr>
            <td align="center" colspan="4" style="font-size:0.75em;"><i>(вулиця (провулок, площа тощо), N будинку / корпусу, N квартири / офісу, населений пункт, район, область / Автономна Республіка Крим, поштовий індекс)</i></td>
        </tr>
    </tbody>
</table>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; font-size: 12px; border-collapse: collapse;" cellspacing="0" cellpadding="0" width="1050px">
    <tbody>
        <tr>
            <td>&nbsp;</td>
        </tr>
    </tbody>
</table>
<table style="table-layout: fixed;text-align: center; margin-left: 15px; border: 1px solid black;font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
    <tbody >
        <tr style="border: 1px solid black;">
            <td style="border: 1px solid black;font-weight: bold; text-align: center;" colspan="6">Коди організації-респондента</td>
        </tr>
        <tr style="border: 1px solid black;">
            <td style="border: 1px solid black;">за ЄДРПОУ / реєстраційний номер облікової картки платника податків або серія (за наявності) та номер паспорта*</td>
            <td style="border: 1px solid black;">території (КОАТУУ)</td>
            <td style="border: 1px solid black;">виду економічної діяльності (КВЕД)</td>
            <td style="border: 1px solid black;">ознаки неприбутковості відповідно до Реєстру неприбуткових установ та організацій</td>
            <td style="border: 1px solid black;">організаційно-правової форми господарювання (ДК 002:2004; КОПФГ)</td>
            <td style="border: 1px solid black;">форми фінансування бюджет - 1, госпрозрахунок - 2, за рахунок членських внесків - 3, змішана - 4)</td>
        </tr>
        <tr style="border: 1px solid black;">
            <td style="border: 1px solid black;">1</td>
            <td style="border: 1px solid black;">2</td>
            <td style="border: 1px solid black;">3</td>
            <td style="border: 1px solid black;">4</td>
            <td style="border: 1px solid black;">5</td>
            <td style="border: 1px solid black;">6</td>
        </tr>
        <tr>
            <td style="border: 1px solid black;">{{#textInput}}DECLAR.DECLARBODY.EDRPOU####{{{}}}{{/textInput}}</td>
            <td style="border: 1px solid black;">{{#textInput}}DECLAR.DECLARBODY.KOATUU####{{{}}}{{/textInput}}</td>
            <td style="border: 1px solid black;">{{#textInput}}DECLAR.DECLARBODY.KVED####{{{}}}{{/textInput}}</td>
            <td style="border: 1px solid black;">{{#textInput}}DECLAR.DECLARBODY.ONPR####{{{}}}{{/textInput}}</td>
            <td style="border: 1px solid black;">{{#textInput}}DECLAR.DECLARBODY.KOPFD####{{{}}}{{/textInput}}</td>
            <td style="border: 1px solid black;">{{#textInput}}DECLAR.DECLARBODY.FFINANCE####{{{}}}{{/textInput}}</td>
        </tr>
    </tbody>
</table>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; font-size: 12px; border-collapse: collapse;" cellspacing="0" cellpadding="0" width="1050px">
    <tbody>
        <tr>
            <td>&nbsp;</td>
        </tr>
    </tbody>
</table>
<table style="table-layout: auto; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
    <tbody>
        <tr>
            <td width="15%">Найменування банку</td>
            <td class="td_unln" colspan="5">
                {{#textInput}}DECLAR.DECLARBODY.CAPTION####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
            </td>
        </tr>
        <tr>
            <td width="10%">Код банку</td>
            <td class="td_unln" colspan="3">
                {{#textInput}}DECLAR.DECLARBODY.MFO####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
            </td> 
            <td width="20%" colspan="1">№ поточного рахунку</td>
            <td class="td_unln" colspan="1">
                {{#textInput}}DECLAR.DECLARBODY.ACCOUNT####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
            </td>
        </tr>
    </tbody>
    <tr>
        <td>&nbsp;</td>
    </tr>
</table>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; font-size: 12px; border-collapse: collapse;" cellspacing="0" cellpadding="0" width="1050px">
    <tbody>
        <tr>
            <td>&nbsp;</td>
        </tr>
    </tbody>
</table>
<table style="table-layout: auto;text-align: center; margin-left: 15px; border: 1px solid black;font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
    <tbody >
        <tr style="border: 1px solid black; font-weight: bold;">
            <td style="border: 1px solid black;font-weight: bold; text-align: center;" colspan="15">Кількість працівників та фонд оплати праці</td>
        </tr>
        <tr style="border: 1px solid black; font-weight: bold;">
            <td style="border: 1px solid black;" rowspan="3">&nbsp;</td>
            <td style="border: 1px solid black;" rowspan="3">Код рядка</td>
            <td style="border: 1px solid black;" rowspan="3">Факт-ично за рік</td>
            <td style="border: 1px solid black;" colspan="2">З них</td>
            <td style="border: 1px solid black;" colspan="4">Місце проживання</td>
            <td style="border: 1px solid black;" colspan="6">За віком (повних років)</td>
        </tr>
        <tr style="border: 1px solid black; font-weight: bold;">
            <td style="border: 1px solid black;" rowspan="2">чоло-віки</td>
            <td style="border: 1px solid black;" rowspan="2">жінки</td>
            <td style="border: 1px solid black;" colspan="2">у місті</td>
            <td style="border: 1px solid black;" colspan="2">у сільських населених пунктах та селищах міського типу</td>
            <td style="border: 1px solid black;" colspan="2">від 18 до 35 років</td>
            <td style="border: 1px solid black;" colspan="2">від 36 до 60 років</td>
            <td style="border: 1px solid black;" colspan="2">понад 60 років</td>
        </tr>
        <tr style="font-weight: bold;">
            <td style="border: 1px solid black;" >чоло-віки</td>
            <td style="border: 1px solid black;" >жінки</td>
            <td style="border: 1px solid black;" >чоло-віки</td>
            <td style="border: 1px solid black;" >жінки</td>
            <td style="border: 1px solid black;" >чоло-віки</td>
            <td style="border: 1px solid black;" >жінки</td>
            <td style="border: 1px solid black;" >чоло-віки</td>
            <td style="border: 1px solid black;" >жінки</td>
            <td style="border: 1px solid black;" >чоло-віки</td>
            <td style="border: 1px solid black;" >жінки</td>
        </tr>
        <tr style="font-weight: bold;">
            <td style="border: 1px solid black;" >A</td>
            <td style="border: 1px solid black;" >Б</td>
            <td style="border: 1px solid black;" >1</td>
            <td style="border: 1px solid black;" >2</td>
            <td style="border: 1px solid black;" >3</td>
            <td style="border: 1px solid black;" >4</td>
            <td style="border: 1px solid black;" >5</td>
            <td style="border: 1px solid black;" >6</td>
            <td style="border: 1px solid black;" >7</td>
            <td style="border: 1px solid black;" >8</td>
            <td style="border: 1px solid black;" >9</td>
            <td style="border: 1px solid black;" >10</td>
            <td style="border: 1px solid black;" >11</td>
            <td style="border: 1px solid black;" >12</td>
            <td style="border: 1px solid black;" >13</td>
        </tr>
        <tr>
            <td style="border: 1px solid black;" >Середньооблікова кількість штатних працівників облікового складу, осіб</td>
            <td style="border: 1px solid black;" >01</td>
            <td style="border: 1px solid black;" >{{#intInput}}DECLAR.DECLARBODY.B0101{{{}}}{{/intInput}}</td>
            <td style="border: 1px solid black;" >{{#intInput}}DECLAR.DECLARBODY.B0102{{{}}}{{/intInput}}</td>
            <td style="border: 1px solid black;" >{{#intInput}}DECLAR.DECLARBODY.B0103{{{}}}{{/intInput}}</td>
            <td style="border: 1px solid black;" >{{#intInput}}DECLAR.DECLARBODY.B0104{{{}}}{{/intInput}}</td>
            <td style="border: 1px solid black;" >{{#intInput}}DECLAR.DECLARBODY.B0105{{{}}}{{/intInput}}</td>
            <td style="border: 1px solid black;" >{{#intInput}}DECLAR.DECLARBODY.B0106{{{}}}{{/intInput}}</td>
            <td style="border: 1px solid black;" >{{#intInput}}DECLAR.DECLARBODY.B0107{{{}}}{{/intInput}}</td>
            <td style="border: 1px solid black;" >{{#intInput}}DECLAR.DECLARBODY.B0108{{{}}}{{/intInput}}</td>
            <td style="border: 1px solid black;" >{{#intInput}}DECLAR.DECLARBODY.B0109{{{}}}{{/intInput}}</td>
            <td style="border: 1px solid black;" >{{#intInput}}DECLAR.DECLARBODY.B0110{{{}}}{{/intInput}}</td>
            <td style="border: 1px solid black;" >{{#intInput}}DECLAR.DECLARBODY.B0111{{{}}}{{/intInput}}</td>
            <td style="border: 1px solid black;" >{{#intInput}}DECLAR.DECLARBODY.B0112{{{}}}{{/intInput}}</td>
            <td style="border: 1px solid black;" >{{#intInput}}DECLAR.DECLARBODY.B0113{{{}}}{{/intInput}}</td>
        </tr>
        <tr >
            <td style="border: 1px solid black;" >з них: середньооблікова кількість штатних працівників, яким відповідно до чинного законодавства встановлено інвалідність, осіб</td>
            <td style="border: 1px solid black;" >02</td>
            <td style="border: 1px solid black;" >{{#intInput}}DECLAR.DECLARBODY.B0201{{{}}}{{/intInput}}</td>
            <td style="border: 1px solid black;" >{{#intInput}}DECLAR.DECLARBODY.B0202{{{}}}{{/intInput}}</td>
            <td style="border: 1px solid black;" >{{#intInput}}DECLAR.DECLARBODY.B0203{{{}}}{{/intInput}}</td>
            <td style="border: 1px solid black;" >{{#intInput}}DECLAR.DECLARBODY.B0204{{{}}}{{/intInput}}</td>
            <td style="border: 1px solid black;" >{{#intInput}}DECLAR.DECLARBODY.B0205{{{}}}{{/intInput}}</td>
            <td style="border: 1px solid black;" >{{#intInput}}DECLAR.DECLARBODY.B0206{{{}}}{{/intInput}}</td>
            <td style="border: 1px solid black;" >{{#intInput}}DECLAR.DECLARBODY.B0207{{{}}}{{/intInput}}</td>
            <td style="border: 1px solid black;" >{{#intInput}}DECLAR.DECLARBODY.B0208{{{}}}{{/intInput}}</td>
            <td style="border: 1px solid black;" >{{#intInput}}DECLAR.DECLARBODY.B0209{{{}}}{{/intInput}}</td>
            <td style="border: 1px solid black;" >{{#intInput}}DECLAR.DECLARBODY.B0210{{{}}}{{/intInput}}</td>
            <td style="border: 1px solid black;" >{{#intInput}}DECLAR.DECLARBODY.B0211{{{}}}{{/intInput}}</td>
            <td style="border: 1px solid black;" >{{#intInput}}DECLAR.DECLARBODY.B0212{{{}}}{{/intInput}}</td>
            <td style="border: 1px solid black;" >{{#intInput}}DECLAR.DECLARBODY.B0213{{{}}}{{/intInput}}</td>
        </tr>
        <tr >
            <td style="border: 1px solid black;" >Кількість осіб з інвалідністю - штатних працівників, які повинні працювати на робочих місцях, створених відповідно до вимог статті 19 Закону України "Про основи соціальної захищеності осіб з інвалідністю в Україні"</td>
            <td style="border: 1px solid black;" >03</td>
            <td style="border: 1px solid black;" >{{#intInput}}DECLAR.DECLARBODY.B03{{{}}}{{/intInput}}</td>
            <td style="border: 1px solid black;" >x</td>
            <td style="border: 1px solid black;" >x</td>
            <td style="border: 1px solid black;" >x</td>
            <td style="border: 1px solid black;" >x</td>
            <td style="border: 1px solid black;" >x</td>
            <td style="border: 1px solid black;" >x</td>
            <td style="border: 1px solid black;" >x</td>
            <td style="border: 1px solid black;" >x</td>
            <td style="border: 1px solid black;" >x</td>
            <td style="border: 1px solid black;" >x</td>
            <td style="border: 1px solid black;" >x</td>
            <td style="border: 1px solid black;" >x</td>
        </tr>
        <tr >
            <td style="border: 1px solid black;" >Фонд оплати праці штатних працівників, тис. грн</td>
            <td style="border: 1px solid black;" >04</td>
            <td style="border: 1px solid black;" >{{#float1Input}}DECLAR.DECLARBODY.B04{{{}}}{{/float1Input}}</td>
            <td style="border: 1px solid black;" >x</td>
            <td style="border: 1px solid black;" >x</td>
            <td style="border: 1px solid black;" >x</td>
            <td style="border: 1px solid black;" >x</td>
            <td style="border: 1px solid black;" >x</td>
            <td style="border: 1px solid black;" >x</td>
            <td style="border: 1px solid black;" >x</td>
            <td style="border: 1px solid black;" >x</td>
            <td style="border: 1px solid black;" >x</td>
            <td style="border: 1px solid black;" >x</td>
            <td style="border: 1px solid black;" >x</td>
            <td style="border: 1px solid black;" >x</td>
        </tr>
        <tr >
            <td style="border: 1px solid black;" >Середньорічна заробітна плата штатного працівника, тис. грн (з одним десятковим знаком)</td>
            <td style="border: 1px solid black;" >05</td>
            <td style="border: 1px solid black;" >{{#float1Input}}DECLAR.DECLARBODY.B05{{{}}}{{/float1Input}}</td>
            <td style="border: 1px solid black;" >x</td>
            <td style="border: 1px solid black;" >x</td>
            <td style="border: 1px solid black;" >x</td>
            <td style="border: 1px solid black;" >x</td>
            <td style="border: 1px solid black;" >x</td>
            <td style="border: 1px solid black;" >x</td>
            <td style="border: 1px solid black;" >x</td>
            <td style="border: 1px solid black;" >x</td>
            <td style="border: 1px solid black;" >x</td>
            <td style="border: 1px solid black;" >x</td>
            <td style="border: 1px solid black;" >x</td>
            <td style="border: 1px solid black;" >x</td>
        </tr>
        <tr >
            <td style="border: 1px solid black;" >Сума коштів адміністративно-господарських санкцій за невиконання нормативу робочих місць для працевлаштування осіб з інвалідністю, тис. грн (з одним десятковим знаком)</td>
            <td style="border: 1px solid black;" >06</td>
            <td style="border: 1px solid black;" >{{#float1Input}}DECLAR.DECLARBODY.B06{{{}}}{{/float1Input}}</td>
            <td style="border: 1px solid black;" >x</td>
            <td style="border: 1px solid black;" >x</td>
            <td style="border: 1px solid black;" >x</td>
            <td style="border: 1px solid black;" >x</td>
            <td style="border: 1px solid black;" >x</td>
            <td style="border: 1px solid black;" >x</td>
            <td style="border: 1px solid black;" >x</td>
            <td style="border: 1px solid black;" >x</td>
            <td style="border: 1px solid black;" >x</td>
            <td style="border: 1px solid black;" >x</td>
            <td style="border: 1px solid black;" >x</td>
            <td style="border: 1px solid black;" >x</td>
        </tr>
    </tbody>
</table>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; font-size: 12px; border-collapse: collapse;" cellspacing="0" cellpadding="0" width="1050px">
    <tbody>
        <tr>
            <td>&nbsp;</td>
        </tr>
    </tbody>
</table>
<table style="table-layout: auto; margin-left: 15px; font-family: TimesNewRoman; font-size: 12px; border-collapse: collapse;" cellspacing="0" cellpadding="0" width="1050px">
    <tbody>
        <tr>
            <td>&nbsp;</td>
        </tr>
        <tr>
            <td width="30px">&nbsp;</td>
            <td width="45%" align="center">
                {{#textInput}}DECLAR.DECLARBODY.PBOS####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
            </td>
            <td width="30px">&nbsp;</td>
            <td width="45%" align="center">
                {{#textInput}}DECLAR.DECLARBODY.VIK####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
            </td>
        </tr>
        <tr>
            <td>&nbsp;</td>
            <td style="text-align: center; font-size: 10px; border-top: 1px solid black">(підпис керівника (власника) та/або осіб, відповідальних за заповнення форми звітності)</td>
            <td>&nbsp;</td>
            <td style="text-align: center; font-size: 10px; border-top: 1px solid black">(Власне ім'я ПРІЗВИЩЕ)</td>
            <td>&nbsp;</td>
        </tr>
        <tr>
            <td>&nbsp;</td>
        </tr>
    </tbody>
</table>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
    <tbody>
        <tr>
            <td>&nbsp;</td>
        </tr>
        <tr>
            <td align="right" nowrap="nowrap" width="10%">
                <span style="margin-left:5px; font-size:0.75em;">телефон:</span>
            </td>
            <td align="center" class="td_unln" width="20%"> {{#textInput}}DECLAR.DECLARBODY.VIK_TEL####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
            </td>
            <td align="right" nowrap="nowrap" width="10%">
                <span style="margin-left:5px; font-size:0.75em;">факс:</span>
            </td>
            <td class="td_unln" width="20%"> {{#textInput}}DECLAR.DECLARBODY.FIRM_FAXORG####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
            </td>
            <td align="right" nowrap="nowrap" width="10%">
                <span style="margin-left:5px; font-size:0.75em;">електронна пошта:</span>
            </td>
            <td class="td_unln" width="20%">{{#textInput}}DECLAR.DECLARBODY.VIK_EMAIL####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
            </td>
            <td>&nbsp;</td>
        </tr>
    </tbody>
</table>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
    <tbody>
        <tr>
            <td>&nbsp;</td>
        </tr>
        <tr>
            <td>&nbsp;</td>
        </tr>
        <tr>
            <td>
              * Фізичні особи, які через свої релігійні переконання відмовились від прийняття реєстраційного номера облікової картки платника податків, повідомили про це відповідний контролюючий орган і мають відмітку в паспорті.
            </td>
        </tr>
    </tbody>
</table>
`
