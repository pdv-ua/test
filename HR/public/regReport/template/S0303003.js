module.exports = `
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
    <tbody>
        <tr>
            <td width="45%">&nbsp;</td>
            <td align="center" class="td_box" nowrap="nowrap" width="30%" style="border: 1px solid black">Ідентифікаційний код ЄДРПОУ</td>
            <td align="center" class="td_box" width="25%" style="border: 1px solid black">
                <!--<input class="edtCss" id="FIRM_EDRPOU" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:string" style="width:100%;" type="textbox" value="">-->
                {{#textInput}}DECLAR.DECLARBODY.FIRM_EDRPOU####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
            </td>
        </tr>
    </tbody>
</table>
<br/>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
    <tbody>
        <tr>
            <td align="center" colspan="5"><h3>Державне статистичне спостереження<h3></td>
        </tr>
        <tr>
            <td width="12%">&nbsp;</td>
            <td align="center" colspan="3" style="padding: 4px; border: 1px solid black"><b>Статистична конфіденційність забезпечується <br clear="none"> статтею 29 Закону України "Про державну статистику"</b></td>
            <td width="12%">&nbsp;</td>
        </tr>
        <tr>
            <td colspan="5">&nbsp;</td>
        </tr>
        <tr>
            <td align="center" colspan="5" style="border: 1px solid black"><b>Порушення порядку подання або використання даних державних статистичних спостережень тягне за собою <br clear="none"> відповідальність, яка встановлена статтею 186<sup>3</sup> Кодексу України про адміністративні правопорушення</b></td>
        </tr>
        <tr>
            <td colspan="5">&nbsp;</td>
        </tr>
        <tr>
            <td align="center" colspan="5">Безкоштовний сервіс для електронного звітування "Кабінет респондента" за посиланням: https://statzvit.ukrstat.gov.ua/</td>
        </tr>
        
        <tr>
            <td align="center" colspan="5" style="padding-top: 8pt;"><h3>ЗВІТ ПРО ВИТРАТИ НА УТРИМАННЯ РОБОЧОЇ СИЛИ</h3></td>
        </tr>
        <tr>
            <td align="center">&nbsp;</td>
            <td align="right" width="28%">за</td>
            <td align="center" class="td_unln">
                <!--<input class="edtCss" id="REP_PERNM" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:string" style="width:100%;" type="textbox" value="">-->
                {{#textInput}}DECLAR.DECLARBODY.REP_PERNM####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
            </td>
            <td align="left" width="28%"><b>p.</b></td>
            <td align="center">&nbsp;</td>
        </tr>
        <tr>
            <td align="center" colspan="2">&nbsp;</td>
            <td align="left" colspan="2">&nbsp;</td>
        </tr>
    </tbody>
</table>
<br clear="none">
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
    <tbody>
        <tr>
            <td align="center" class="td_box_1" width="50%" style="border: 1px solid black">Подають:</td>
            <td align="center" class="td_box_1" width="20%" style="border: 1px solid black">Термін подання</td>
            <td align="center" rowspan="2" valign="middle" width="30%"><b>№ 1-РС</b><br clear="none">(один раз на чотири роки)<br clear="none">ЗАТВЕРДЖЕНО <br clear="none"> Наказ Держстату <br clear="none"> 23 серпня 2022 р.№ 227 <br clear="none"> (зі змінами, внесеними <br clear="none"> наказом держстату 
            <br clear="none"> від 10 листопада 2022р.№ 279</td>
        </tr>
        <tr align="center" class="td_box_1">
            <td align="left" class="td_box_1" style="border: 1px solid black">юридичні особи, відокремлені підрозділи юридичних осіб <br clear="none"> - територіальному органу Держстату</td>
            <td class="td_box_1" valign="middle" style="border: 1px solid black">не пізніше<br clear="none">7 квітня<br clear="none"></td>
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
            <td class="td_unln" colspan="3" valign="bottom">
                <!--<input class="edtCss" id="FIRM_NAME" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:string" style="width:100%;" type="textbox" value="">-->
                {{#textInput}}DECLAR.DECLARBODY.FIRM_NAME####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
            </td>
        </tr>
        
        <tr>
            <td nowrap="nowrap" colspan="2">Місцезнаходження (юридична адреса):</td>
            <td class="td_unln" colspan="2" valign="bottom">
                <!--<input class="edtCss" id="FIRM_NAME" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:string" style="width:100%;" type="textbox" value="">-->
                {{#textInput}}DECLAR.DECLARBODY.FIRM_ADR####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
            </td>
        </tr>
        <tr>
            <td align="center" colspan="4" style="font-size:0.75em;"><i>(поштовий індекс, область / АР Крим, район, населений пункт, вулиця / провулок, площа тощо, № будинку / корпусу, № квартири / офісу)</i></td>
        </tr>
        <tr>
            <td nowrap="nowrap">Територіальна громада:</td>
            <td class="td_unln" colspan="3" valign="bottom">
                <!--<input class="edtCss" id="FIRM_NAME" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:string" style="width:100%;" type="textbox" value="">-->
                {{#textInput}}DECLAR.DECLARBODY.TER_GROM1####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
            </td>
        </tr>
        <tr>
            <td colspan="3" nowrap="nowrap">Адреса здійснення діяльності, щодо якої подається форма звітності (фактична адреса):</td>
            <td class="td_unln">&nbsp;&nbsp;</td>
        </tr>
        <tr class="td_unln">
            <td class="td_unln" colspan="4">
                <!--<input class="edtCss" id="FIRM_ADR_FIZ" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:string" style="width:100%;" type="textbox" value="">-->
                {{#textInput}}DECLAR.DECLARBODY.FIRM_ADR_FIZ####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
            </td>
        </tr>
        <tr>
            <td align="center" colspan="4" style="font-size:0.75em;"><i>(поштовий індекс, область / АР Крим, район, населений пункт, вулиця / провулок, площа тощо, № будинку / корпусу, № квартири / офісу)</i></td>
        </tr>
        <tr>
            <td nowrap="nowrap">Територіальна громада:</td>
            <td class="td_unln" colspan="3" valign="bottom">
                <!--<input class="edtCss" id="FIRM_NAME" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:string" style="width:100%;" type="textbox" value="">-->
                {{#textInput}}DECLAR.DECLARBODY.TER_GROM2####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
            </td>
        </tr>
    </tbody>
</table>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
    <tbody>
        <tr>
            <td><b>Код території відповідно до: Класифікатора адміністративно-територіальних одиниць та територій <br>територіальних громад (КАТОТТГ) за адресою здійснення діяльності, щодо якої подається форма звітності</b></td>
        </tr>
        <tr>
            <td class="td_unln">
                <!--<input class="edtCss" id="N9" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:string" style="width:100%;" type="textbox" value="">-->
                {{#textInput}}DECLAR.DECLARBODY.AREACODE_KATOTTG####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
            </td>
        </tr>
        <tr>
            <td align="center" style="font-size:0.75em;"><i>(код території визначається автоматично в разі подання форми в електронному вигляді)</i></td>
        </tr>
    </tbody>
</table>
<br clear="none">
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
    <tbody>
        <tr>
            <td style="width: 25%; text-decoration: underline; font-size: 75%;">Для бюджетних установ</td>
        </tr>
    </tbody>
</table>
<br clear="none">
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
    <tbody>
        <tr>
            <td width="50%">Номер зведеного звіту/підпорядкованої установи</td>
            <td class="td_unln" colspan="2">
                <!--<input class="edtCss" id="N1" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:string" style="width:100%;" type="textbox" value="" lz-ref-id="HKVED" lz-ref-link="N1:alias" lz-ref-type="common">-->
                {{#textInput}}DECLAR.DECLARBODY.NOMER####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
            </td>
        </tr>
        <tr>
            <td width="50%">Вид економічної діяльності, щодо якого подається звіт</td>
            <td class="td_unln" colspan="2">
                <!--<input class="edtCss" id="N1" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:string" style="width:100%;" type="textbox" value="" lz-ref-id="HKVED" lz-ref-link="N1:alias" lz-ref-type="common">-->
                {{#textInput}}DECLAR.DECLARBODY.KVEDNM####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
            </td>
        </tr>
        <tr>
            <td width="50%" style="text-align: left">Код виду економічної діяльності за КВЕД</td>
            <td class="td_unln" colspan="2">
                <!--<input class="edtCss" id="N1" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:string" style="width:100%;" type="textbox" value="" lz-ref-id="HKVED" lz-ref-link="N1:alias" lz-ref-type="common">-->
                {{#intInput}}DECLAR.DECLARBODY.KVED1####{"style": "font-weight: bold;"}{{{}}}{{/intInput}}
            </td>
        </tr>
        <tr>
            <td align="center" colspan="3" style="font-size:0.75em;"><i>(код виду економічної діяльності визначається автоматично в разі подання форми в електронному вигляді)</i></td>
        </tr>
    </tbody>
</table>


<br clear="none">
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse; border: 1px solid black" cellspacing="0" cellpadding="0px" width="1050px">
    <tbody>
        <tr>
            <td align="center" width="90%" style="padding: 4px;"><b>Інформація щодо відсутності даних</b></td>
            <td align="center" width="10%"  style="padding: 4px;"></td>
        </tr>
        <tr>
            <td width="90%">У випадку відсутності даних необхідно поставити у прямокутнику позначку - v</td>
            <td align="center" class="td_box" width="10%" style="padding: 10px"">
            {{#booleanInput}}DECLAR.DECLARBODY.ZERO_ZVI####{"printType":"box", "cleanAbsent": ["DECLAR.DECLARBODY.REASON1","DECLAR.DECLARBODY.REASON2","DECLAR.DECLARBODY.REASON3","DECLAR.DECLARBODY.REASON4","DECLAR.DECLARBODY.REASON5","DECLAR.DECLARBODY.REASON6"]}{{{}}}{{/booleanInput}}</td>
        </tr>
        <tr>
            <td colspan="2" style="padding: 4px;">Зазначте одну з наведених нижче причин відсутності даних:</td>
        </tr>
         <tr>
            <td width="90%">Не здійснюється вид економічної діяльності, який спостерігається</td>
            <td align="center" class="td_box" width="10%" style="padding: 10px"">{{#booleanInput}}DECLAR.DECLARBODY.REASON1####{"printType":"box", "checkParent": "DECLAR.DECLARBODY.ZERO_ZVI", "linkedPath": ["DECLAR.DECLARBODY.REASON2","DECLAR.DECLARBODY.REASON3","DECLAR.DECLARBODY.REASON4","DECLAR.DECLARBODY.REASON5","DECLAR.DECLARBODY.REASON6"]}{{{}}}{{/booleanInput}}</td>
        </tr>
         <tr>
            <td width="90%">Одиниця припинена або перебуває в стадії припинення</td>
            <td align="center" class="td_box" width="10%" style="padding: 10px"">{{#booleanInput}}DECLAR.DECLARBODY.REASON2####{"printType":"box", "checkParent": "DECLAR.DECLARBODY.ZERO_ZVI", "linkedPath": ["DECLAR.DECLARBODY.REASON1","DECLAR.DECLARBODY.REASON3","DECLAR.DECLARBODY.REASON4","DECLAR.DECLARBODY.REASON5","DECLAR.DECLARBODY.REASON6"]}{{{}}}{{/booleanInput}}</td>
        </tr>
         <tr>
            <td>Здійснюється сезонна діяльність або економічна діяльність, пов'язана з тривалим циклом виробництва</td>
            <td align="center" class="td_box" width="10%" style="padding: 10px"">{{#booleanInput}}DECLAR.DECLARBODY.REASON3####{"printType":"box", "checkParent": "DECLAR.DECLARBODY.ZERO_ZVI", "linkedPath": ["DECLAR.DECLARBODY.REASON1","DECLAR.DECLARBODY.REASON2","DECLAR.DECLARBODY.REASON4","DECLAR.DECLARBODY.REASON5","DECLAR.DECLARBODY.REASON6"]}{{{}}}{{/booleanInput}}</td>
        </tr>
         <tr>
            <td>Тимчасово призупинено економічну діяльність через економічні чинники/карантинні обмеження</td>
            <td align="center" class="td_box" width="10%" style="padding: 10px"">{{#booleanInput}}DECLAR.DECLARBODY.REASON4####{"printType":"box", "checkParent": "DECLAR.DECLARBODY.ZERO_ZVI", "linkedPath": ["DECLAR.DECLARBODY.REASON1","DECLAR.DECLARBODY.REASON2","DECLAR.DECLARBODY.REASON3","DECLAR.DECLARBODY.REASON5","DECLAR.DECLARBODY.REASON6"]}{{{}}}{{/booleanInput}}</td>
        </tr>
         <tr>
            <td>Проведено чи проводиться реорганізація або передано виробничі фактори іншій одиниці</td>
            <td align="center" class="td_box" width="10%" style="padding: 10px"">{{#booleanInput}}DECLAR.DECLARBODY.REASON5####{"printType":"box", "checkParent": "DECLAR.DECLARBODY.ZERO_ZVI", "linkedPath": ["DECLAR.DECLARBODY.REASON1","DECLAR.DECLARBODY.REASON2","DECLAR.DECLARBODY.REASON3","DECLAR.DECLARBODY.REASON4","DECLAR.DECLARBODY.REASON6"]}{{{}}}{{/booleanInput}}</td>
        </tr>
         <tr>
            <td>Відсутнє явище, яке спостерігається</td>
            <td align="center" class="td_box" width="10%" style="padding: 10px"">{{#booleanInput}}DECLAR.DECLARBODY.REASON6####{"printType":"box", "checkParent": "DECLAR.DECLARBODY.ZERO_ZVI", "linkedPath": ["DECLAR.DECLARBODY.REASON1","DECLAR.DECLARBODY.REASON2","DECLAR.DECLARBODY.REASON3","DECLAR.DECLARBODY.REASON4","DECLAR.DECLARBODY.REASON5"]}{{{}}}{{/booleanInput}}</td>
        </tr> 
    </tbody>
</table>















<br clear="none">
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
    <tbody>
        <tr>
            <td align="left" colspan="5"><h3>Розділ I. Кількість та робочий час працівників за звітний рік</h3></td>
        </tr>
    </tbody>
</table>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
    <tbody>
        <tr>
            <td align="right" colspan="5"><i>(у цілих числах)</i></td>
        </tr>
    </tbody>
</table>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px" border="1" bordercolor="black" cellspacing="0">
    <tbody>
        <tr>
            <td align="center" valign="middle" width="30%">Назва показника</td>
            <td align="center" valign="middle" width="10%">Код рядка</td>
            <td align="center" valign="middle" width="20%">Працівники з повною зайнятістю</td>
            <td align="center" valign="middle" width="20%">Працівники з частковою зайнятістю</td>
            <td align="center" valign="middle" width="20%">Учні/стажисти</td>
        </tr>
        <tr>
            <td align="center" valign="middle">А</td>
            <td align="center" valign="middle">Б</td>
            <td align="center" valign="middle">1</td>
            <td align="center" valign="middle">2</td>
            <td align="center" valign="middle">3</td>
        </tr>
        <tr>
            <td>Кількість осіб</td>
            <td align="center">01</td>
            <td align="right">
                {{#intInput}}DECLAR.DECLARBODY.A010_1####{"detailData":"A010_1"}{{{}}}{{/intInput}}
            </td>
            <td align="right">
                {{#intInput}}DECLAR.DECLARBODY.A010_2####{"detailData":"A010_2"}{{{}}}{{/intInput}}
            </td>
            <td align="right">
                {{#intInput}}DECLAR.DECLARBODY.A010_3####{"detailData":"A010_3"}{{{}}}{{/intInput}}
            </td>
        </tr>
        <tr>
            <td>Кількість відпрацьованих годин (ряд.02 <= ряд.03)</td>
            <td align="center">02</td>
            <td align="right">
                {{#intInput}}DECLAR.DECLARBODY.A020_1####{"detailData":"A020_1"}{{{}}}{{/intInput}}
            </td>
            <td align="right">
                {{#intInput}}DECLAR.DECLARBODY.A020_2####{"detailData":"A020_2"}{{{}}}{{/intInput}}
            </td>
            <td align="right">
                {{#intInput}}DECLAR.DECLARBODY.A020_3####{"detailData":"A020_3"}{{{}}}{{/intInput}}
            </td>
        </tr>
        <tr>
            <td>Кількість оплачених годин</td>
            <td align="center">03</td>
            <td align="right">
                {{#intInput}}DECLAR.DECLARBODY.A030_1####{"detailData":"A030_1"}{{{}}}{{/intInput}}
            </td>
            <td align="right">
                {{#intInput}}DECLAR.DECLARBODY.A030_2####{"detailData":"A030_2"}{{{}}}{{/intInput}}
            </td>
            <td align="right">
                {{#intInput}}DECLAR.DECLARBODY.A030_3####{"detailData":"A030_3"}{{{}}}{{/intInput}}
            </td>
        </tr>
    </tbody>
</table>
<br clear="none">
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
    <tbody>
        <tr>
            <td align="left" colspan="5"><h3>Розділ II. Витрати на утримання робочої сили за звітний рік</h3></td>
        </tr>
    </tbody>
    <tbody>
        <tr>
            <td align="left" colspan="5"><h3>Інформація за категоріями працівників</h3></td>
        </tr>
    </tbody>
</table>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
    <tbody>
        <tr>
            <td align="right" colspan="5"><i>(тис. грн з одним десятковим знаком)</i></td>
        </tr>
    </tbody>
</table>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px" border="1" bordercolor="black" cellspacing="0">
    <tbody>
        <tr>
            <td align="center" valign="middle" width="70%">Назва показника</td>
            <td align="center" valign="middle" width="10%">Код рядка</td>
            <td align="center" valign="middle" width="20%">Усього (працівники з повною та частковою зайнятістю)</td>
            <td align="center" valign="middle" width="20%">Учні стажисти</td>
        </tr>
        <tr>
            <td align="center" valign="middle">А</td>
            <td align="center" valign="middle">Б</td>
            <td align="center" valign="middle">1</td>
            <td align="center" valign="middle">2</td>
        </tr>
        <tr>
            <td>Прямі виплати, надбавки та доплати, що виплачуються в кожному платіжному періоді працівникам</td>
            <td align="center">10</td>
            <td align="right">
                {{#float1Input}}DECLAR.DECLARBODY.A10_1####{"detailData":"A10_1"}{{{}}}{{/float1Input}}
            </td>
            <td align="center">X</td>
        </tr>
        <tr>
            <td>Прямі виплати, надбавки та доплати, що виплачуються не в кожному розрахунковому періоді працівникам</td>
            <td align="center">11</td>
            <td align="right">
                {{#float1Input}}DECLAR.DECLARBODY.A11_1####{"detailData":"A11_1"}{{{}}}{{/float1Input}}
            </td>
            <td align="center">X</td>
        </tr>
        <tr>
            <td>Внески до фондів заощаджень, створених для працівників</td>
            <td align="center">12</td>
            <td align="right">
                {{#float1Input}}DECLAR.DECLARBODY.A12_1####{"detailData":"A12_1"}{{{}}}{{/float1Input}}
            </td>
            <td align="center">X</td>
        </tr>
        <tr>
            <td>Оплата за невідпрацьований час працівникам</td>
            <td align="center">13</td>
            <td align="right">
                {{#float1Input}}DECLAR.DECLARBODY.A13_1####{"detailData":"A13_1"}{{{}}}{{/float1Input}}
            </td>
            <td align="center">X</td>
        </tr>
        <tr>
            <td>Заробітна плата працівників у натуральній формі</td>
            <td align="center">14</td>
            <td align="right">
                {{#float1Input}}DECLAR.DECLARBODY.A14_1####{"detailData":"A14_1"}{{{}}}{{/float1Input}}
            </td>
            <td align="center">X</td>
        </tr>
        <tr>
            <td>Заробітна плата учнів/стажистів</td>
            <td align="center">15</td>
            <td align="center">X</td>
            <td align="right">
                {{#float1Input}}DECLAR.DECLARBODY.A15_2{{{}}}{{/float1Input}}
            </td>
        </tr>
        <tr>
            <td>Внески роботодавця на обов’язкове соціальне страхування працівників (уключаючи єдиний внесок на загальнообов’язкове державне соціальне страхування)</td>
            <td align="center">16</td>
            <td align="right">
                {{#float1Input}}DECLAR.DECLARBODY.A16_1####{"detailData":"A16_1"}{{{}}}{{/float1Input}}
            </td>
            <td align="right">
                {{#float1Input}}DECLAR.DECLARBODY.A16_2####{"detailData":"A16_2"}{{{}}}{{/float1Input}}
            </td>
        </tr>
        <tr>
            <td>Внески роботодавця на соціальне страхування працівників</td>
            <td align="center">17</td>
            <td align="right">
                {{#float1Input}}DECLAR.DECLARBODY.A17_1####{"detailData":"A17_1"}{{{}}}{{/float1Input}}
            </td>
            <td align="center">X</td> 
        </tr>
        <tr>
            <td>Прямі соціальні виплати роботодавця</td>
            <td align="center">18</td>
            <td align="right">
                {{#float1Input}}DECLAR.DECLARBODY.A18_1####{"detailData":"A18_1"}{{{}}}{{/float1Input}}
            </td>
            <td align="center">X</td> 
        </tr>
        
    </tbody>
</table>
<br clear="none">
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
    <tbody>
        <tr>
            <td align="center" colspan="4"><h3>Інформація в цілому по підприємству (відокремленому підрозділу)</h3></td>
        </tr>
    </tbody>
</table>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
    <tbody>
        <tr>
            <td align="right" colspan="5"><i>(тис. грн з одним десятковим знаком)</i></td>
        </tr>
    </tbody>
</table>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px" border="1" bordercolor="black" cellspacing="0">
    <tbody>
        <tr>
            <td align="center" valign="middle" width="45%">Назва показника</td>
            <td align="center" valign="middle" width="10%">Код рядка</td>
            <td align="center" valign="middle" width="15%">Усього</td>
        </tr>
        <tr>
            <td align="center" valign="middle">А</td>
            <td align="center" valign="middle">Б</td>
            <td align="center" valign="middle">1</td>
        </tr>
        <tr>
            <td align="left">Витрати на професійне навчання</td>
            <td align="center">19</td>
            <td align="right">
                {{#intInput}}DECLAR.DECLARBODY.A19_1{{{}}}{{/intInput}}
            </td>
        </tr>
        <tr>
            <td align="left">Інші витрати на утримання робочої сили</td>
            <td align="center">20</td>
            <td align="right">
                {{#intInput}}DECLAR.DECLARBODY.A20_1{{{}}}{{/intInput}}
            </td>
        </tr>
        <tr>
            <td align="left">Податки, що належать до витрат на утримання робочої сили</td>
            <td align="center">21</td>
            <td align="right">
                {{#intInput}}DECLAR.DECLARBODY.A21_1{{{}}}{{/intInput}}
            </td>
        </tr>
        <tr>
            <td align="left">Субсидії, які одержує роботодавець</td>
            <td align="center">22</td>
            <td align="right">
                {{#intInput}}DECLAR.DECLARBODY.A22_1{{{}}}{{/intInput}}
            </td>
        </tr>
    </tbody>
</table>     

<br clear="none">
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
    <tbody>
        <tr>
            <td class="td_unln" width="45%">&nbsp;</td>
            <td width="10%">&nbsp;</td>
            <td align="center" class="td_unln" width="45%">
                {{#textInput}}DECLAR.DECLARBODY.RUK####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
                <!--<input class="edtCss" descr_ne="Не заповнено рядок ПІБ керівника (власника) та/або особи, відповідальної за достовірність наданої інформації (на бланку;  обов&#39;язковий)" expr_ne="&#39;&#39;" id="VIK_RUK" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:string" style="width:100%;" type="textbox" value="">-->
            </td>
        </tr>
        <tr>
            <td style="font-size:0.75em; border-top: 1px solid black" align="center">Місце підпису керівника (власника) або особи,<br clear="none">відповідальної за достовірність наданої інформації</td>
            <td>&nbsp;</td>
            <td style="font-size:0.75em; border-top: 1px solid black" align="center">(Власне ім'я ПРІЗВИЩЕ)</td>
        </tr>
    </tbody>
</table>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
    <tbody>
        <tr>
            <td align="right" nowrap="nowrap" width="10%">
                <span style="margin-left:5px; font-size:0.75em;">телефон:</span>
            </td>
            <td align="center" class="td_unln" width="20%">
                <!--<input class="edtCss" descr_ne="Не заповнено рядок контактний номер телефону керівника(власника) та/або особи, відповідальної за достовірність наданої інформації (на бланку;  обов&#39;язковий)" expr_ne="&#39;&#39;" id="VIK_TEL" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:string" style="width:100%;" type="textbox" value="">-->
                {{#textInput}}DECLAR.DECLARBODY.VIK_TEL####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
            </td>
            <td align="right" nowrap="nowrap" width="30%">
                <span style="margin-left:5px; font-size:0.75em;">&nbsp;</span>
            </td>
            <td align="right" nowrap="nowrap" width="10%">
                <span style="margin-left:5px; font-size:0.75em;">електронна пошта:</span>
            </td>
            <td class="td_unln" width="20%">
                <!--<input class="edtCss" descr_ne="Не заповнено рядок адреса електронної пошти (на бланку;  обов&#39;язковий)" expr_ne="&#39;&#39;" id="VIK_EMAIL" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:string" style="width:100%;" type="textbox" value="">-->
                {{#textInput}}DECLAR.DECLARBODY.VIK_EMAIL####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
            </td>
            <td>&nbsp;</td>
        </tr>
    </tbody>
</table>
`
