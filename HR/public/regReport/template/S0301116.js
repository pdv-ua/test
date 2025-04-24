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
            <td align="center" colspan="3" style="padding: 4px; border: 1px solid black"><b>Конфіденційність статистичної інформації забезпечується <br clear="none"> статтею 21 Закону України "Про державну статистику"</b></td>
            <td width="12%">&nbsp;</td>
        </tr>
        <tr>
            <td colspan="5">&nbsp;</td>
        </tr>
        <tr>
            <td align="center" colspan="5" style="border: 1px solid black"><b>Порушення порядку подання або використання даних державних статистичних спостережень тягне за собою <br clear="none"> відповідальність, яка встановлена статтею 186<sup>3</sup> Кодексу України про адміністративні правопорушення</b></td>
        </tr>
        <tr>
            <td align="center" colspan="5" style="padding-top: 8pt;"><h3>Звіт із праці</h3></td>
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
            <td align="center" style="font-size:0.75em;"><i>(звітний квартал)</i></td>
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
            <td align="center" rowspan="2" valign="middle" width="30%"><b>№ 1-ПВ</b><br clear="none">(квартальна)<br clear="none">ЗАТВЕРДЖЕНО <br clear="none"> Наказ Держстату <br clear="none"> 06.07.2018 № 134</td>
        </tr>
        <tr align="center" class="td_box_1">
            <td align="left" class="td_box_1" style="border: 1px solid black">юридичні особи, відокремлені підрозділи юридичних осіб <br clear="none"> - територіальному органу Держстату</td>
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
            <td class="td_unln" colspan="3" valign="bottom">
                <!--<input class="edtCss" id="FIRM_NAME" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:string" style="width:100%;" type="textbox" value="">-->
                {{#textInput}}DECLAR.DECLARBODY.FIRM_NAME####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
            </td>
        </tr>
        <tr>
            <td colspan="2" nowrap="nowrap">Місцезнаходження (юридична адреса):&nbsp;&nbsp;</td>
            <td class="td_unln" colspan="2">&nbsp;&nbsp;</td>
        </tr>
        <tr class="td_unln">
            <td class="td_unln" colspan="4">
                <!--<input class="edtCss" id="FIRM_ADR" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:string" style="width:100%;" type="textbox" value="">-->
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
                <!--<input class="edtCss" id="FIRM_ADR_FIZ" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:string" style="width:100%;" type="textbox" value="">-->
                {{#textInput}}DECLAR.DECLARBODY.FIRM_ADR_FIZ####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
            </td>
        </tr>
        <tr>
            <td align="center" colspan="4" style="font-size:0.75em;"><i>(поштовий індекс, область / АР Крим, район, населений пункт, вулиця / провулок, площа тощо, № будинку / корпусу, № квартири / офісу)</i></td>
        </tr>
    </tbody>
</table>
<br clear="none">
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
    <tbody>
        <tr>
            <td colspan="2">Найменування структурного підрозділу</td>
            <td class="td_unln" width="60%">
                <!--<input class="edtCss" id="N9" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:string" style="width:100%;" type="textbox" value="">-->
                {{#textInput}}DECLAR.DECLARBODY.N9####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
            </td>
        </tr>
        <tr>
            <td width="35%">Вид економічної діяльності </td>
            <td class="td_unln" colspan="2">
                <!--<input class="edtCss" id="N1" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:string" style="width:100%;" type="textbox" value="" lz-ref-id="HKVED" lz-ref-link="N1:alias" lz-ref-type="common">-->
                {{#textInput}}DECLAR.DECLARBODY.N1####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
            </td>
        </tr>
        <tr>
            <td colspan="3">Адреса здійснення діяльності, щодо якої подається форма звітності (фактична адреса):</td>
        </tr>
        <tr>
            <td class="td_unln" colspan="3">
                <!--<input class="edtCss" id="N11" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:string" style="width:100%;" type="textbox" value="">-->
                {{#textInput}}DECLAR.DECLARBODY.N11####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
            </td>
        </tr>
        <tr>
            <td align="center" colspan="3" style="font-size:0.75em;"><i>(область / АР Крим, район, населений пункт, вулиця / провулок, площа тощо, № будинку / корпусу, № квартири / офісу)</i></td>
        </tr>
    </tbody>
</table>
<br clear="none">
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse; border: 1px solid black" cellspacing="0" cellpadding="0px" width="1050px">
    <tbody>
        <tr>
            <td align="center">Номер структурного підрозділу</td>
            <td align="center" class="td_box" width="30%" style="padding: 10px">
                <!--<input class="edtCss" descr_ge="№ структурного підрозділу&gt;=1 (на бланку)" expr_ge="1" id="NOMER" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:integer" style="width:100%;" type="textbox" value="">-->
                {{#intInput}}DECLAR.DECLARBODY.NOMER{{{}}}{{/intInput}}
            </td>
            <td width="40%">&nbsp;&nbsp;</td>
        </tr>
    </tbody>
</table>
<br clear="none">
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
    <tbody>
        <tr>
            <td align="center" colspan="5"><h3>Розділ I. Кількість штатних працівників</h3></td>
        </tr>
    </tbody>
</table>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
    <tbody>
        <tr>
            <td align="right" colspan="5"><i>(осіб (у цілих числах)</i></td>
        </tr>
    </tbody>
</table>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px" border="1" bordercolor="black" cellspacing="0">
    <tbody>
        <tr>
            <td align="center" valign="middle" width="70%">Назва показників</td>
            <td align="center" valign="middle" width="10%">Код рядка</td>
            <td align="center" valign="middle" width="10%">Усього</td>
            <td align="center" valign="middle" width="10%">У т.ч. жінки</td>
        </tr>
        <tr>
            <td align="center" valign="middle">А</td>
            <td align="center" valign="middle">Б</td>
            <td align="center" valign="middle">1</td>
            <td align="center" valign="middle">2</td>
        </tr>
        <tr>
            <td>Кількість прийнятих штатних працівників</td>
            <td align="center">3020</td>
            <td align="right">
                {{#intInput}}DECLAR.DECLARBODY.A3020_1{{{}}}{{/intInput}}
            </td>
            <td align="right">
                {{#intInput}}DECLAR.DECLARBODY.A3020_2{{{}}}{{/intInput}}
            </td>
        </tr>
        <tr>
            <td>Кількість звільнених штатних працівників</td>
            <td align="center">3040</td>
            <td align="right">
                {{#intInput}}DECLAR.DECLARBODY.A3040_1{{{}}}{{/intInput}}
            </td>
            <td align="right">
                {{#intInput}}DECLAR.DECLARBODY.A3040_2{{{}}}{{/intInput}}
            </td>
        </tr>
        <tr>
            <td>Кількість звільнених штатних працівників із причин змін в організації виробництва і праці (реорганізація, скорочення кількості штатних працівників або штату працівників) (із ряд. 3040)</td>
            <td align="center">3050</td>
            <td align="right">
                {{#intInput}}DECLAR.DECLARBODY.A3050_1{{{}}}{{/intInput}}
            </td>
            <td align="right">
                {{#intInput}}DECLAR.DECLARBODY.A3050_2{{{}}}{{/intInput}}
            </td>
        </tr>
        <tr>
            <td>Кількість звільнених штатних працівників із причин плинності кадрів (за власним бажанням, за угодою сторін, порушення трудової дісципліни, ін.) (із ряд. 3040)</td>
            <td align="center">3060</td>
            <td align="right">
                {{#intInput}}DECLAR.DECLARBODY.A3060_1{{{}}}{{/intInput}}
            </td>
            <td align="right">
                {{#intInput}}DECLAR.DECLARBODY.A3060_2{{{}}}{{/intInput}}
            </td>
        </tr>
        <tr>
            <td>Облікова кількість штатних працівників на кінець звітнього періоду</td>
            <td align="center">3070</td>
            <td align="right">
                {{#intInput}}DECLAR.DECLARBODY.A3070_1{{{}}}{{/intInput}}
            </td>
            <td align="right">
                {{#intInput}}DECLAR.DECLARBODY.A3070_2{{{}}}{{/intInput}}
            </td>
        </tr>
        <tr>
            <td colspan="4" align="center">Cтаном на 31 грудня звітнього року (раз на рік у звіті за IV квартал)</td>
        </tr>
        <tr>
            <td>Облікова кількість штатних працівників, прийнятих на умові неповного робочого дня (тижня)</td>
            <td align="center">3080</td>
            <td align="right">
                {{#intInput}}DECLAR.DECLARBODY.A3080_1{{{}}}{{/intInput}}
            </td>
            <td align="right">
                {{#intInput}}DECLAR.DECLARBODY.A3080_2{{{}}}{{/intInput}}
            </td>
        </tr>
        <tr>
            <td>Облікова кількість штатних працівників, які знаходяться у відпустці у зв'язку з вагітністю та пологами</td>
            <td align="center">3090</td>
            <td align=center>x</td>
            <td align="right">
                {{#intInput}}DECLAR.DECLARBODY.A3090_2{{{}}}{{/intInput}}
            </td>
        </tr>
        <tr>
            <td>Облікова кількість штатних працівників, які знаходяться у відпустці по догляду за дитиною до досягнення нею віку, встановленного чинним законодавством</td>
            <td align="center">3100</td>
            <td align="right">
                {{#intInput}}DECLAR.DECLARBODY.A3100_1{{{}}}{{/intInput}}
            </td>
            <td align="right">
                {{#intInput}}DECLAR.DECLARBODY.A3100_2{{{}}}{{/intInput}}
            </td>
        </tr>
    </tbody>
</table>
<br clear="none">
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
    <tbody>
        <tr>
            <td align="center" colspan="5"><h3>Розділ II. Витрати робочого часу штатних працівників</h3></td>
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
            <td align="center" valign="middle" width="70%">Назва показників</td>
            <td align="center" valign="middle" width="10%">Код рядка</td>
            <td align="center" valign="middle" width="10%">Люд.год</td>
            <td align="center" valign="middle" width="10%">Осіб</td>
        </tr>
        <tr>
            <td align="center" valign="middle">А</td>
            <td align="center" valign="middle">Б</td>
            <td align="center" valign="middle">1</td>
            <td align="center" valign="middle">2</td>
        </tr>
        <tr>
            <td>Кількість невідпрацьованого робочого часу через відпустки без збереження заробітної плати (на період припинення виконання робіт)</td>
            <td align="center">4080</td>
            <td align="right">
                {{#intInput}}DECLAR.DECLARBODY.A4080{{{}}}{{/intInput}}
            </td>
            <td align="right">
                {{#intInput}}DECLAR.DECLARBODY.B4080{{{}}}{{/intInput}}
            </td>
        </tr>
        <tr>
            <td>Кількість невідпрацьованого робочого часу через переведення на неповний робочий день (тиждень) з економічних причин</td>
            <td align="center">4090</td>
            <td align="right">
                {{#intInput}}DECLAR.DECLARBODY.A4090{{{}}}{{/intInput}}
            </td>
            <td align="right">
                {{#intInput}}DECLAR.DECLARBODY.B4090{{{}}}{{/intInput}}
            </td>
        </tr>
        <tr>
            <td>Кількість невідпрацьованого робочого часу через массові невиходи на роботу (страйки)</td>
            <td align="center">4100</td>
            <td align="right">
                {{#intInput}}DECLAR.DECLARBODY.A4100{{{}}}{{/intInput}}
            </td>
            <td align="right">
                {{#intInput}}DECLAR.DECLARBODY.B4100{{{}}}{{/intInput}}
            </td>
        </tr>
    </tbody>
</table>
<br clear="none">
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
    <tbody>
        <tr>
            <td align="center" colspan="5"><h3>Розділ lll. Склад фонду оплати праці штатних працівників</h3></td>
        </tr>
    </tbody>
</table>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
    <tbody>
        <tr>
            <td align="right" colspan="5"><i>(тис. грн (з одним десятковим знаком)</i></td>
        </tr>
    </tbody>
</table>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px" border="1" bordercolor="black" cellspacing="0">
    <tbody>
        <tr>
            <td align="center" valign="middle" width="70%">Назва показників</td>
            <td align="center" valign="middle" width="10%">Код рядка</td>
            <td align="center" valign="middle" width="20%">Усього</td>
        </tr>
        <tr>
            <td align="center" valign="middle">А</td>
            <td align="center" valign="middle">Б</td>
            <td align="center" valign="middle">1</td>
        </tr>
        <tr>
            <td>Фонд оплати праці штатних працівників, усього (ряд.5020+ряд.5030+ряд.5060)</td>
            <td align="center">5010</td>
            <td align="right">
                {{#float1Input}}DECLAR.DECLARBODY.A5010{{{}}}{{/float1Input}}
            </td>
        </tr>
        <tr>
            <td>Фонд основної заробітної плати</td>
            <td align="center">5020</td>
            <td align="right">
                {{#float1Input}}DECLAR.DECLARBODY.A5020{{{}}}{{/float1Input}}
            </td>
        </tr>
        <tr>
            <td>Фонд додаткової заробітної плати</td>
            <td align="center">5030</td>
            <td align="right">
                {{#float1Input}}DECLAR.DECLARBODY.A5030{{{}}}{{/float1Input}}
            </td>
        </tr>
        <tr>
            <td>Надбавки та доплати до таріфних ставок та посадових окладів (із ряд 5030)</td>
            <td align="center">5040</td>
            <td align="right">
                {{#float1Input}}DECLAR.DECLARBODY.A5040{{{}}}{{/float1Input}}
            </td>
        </tr>
        <tr>
            <td>Премії та винагороди, що носять систематичний характер (щомісячні, щоквартальні) (із ряд 5030)</td>
            <td align="center">5050</td>
            <td align="right">
                {{#float1Input}}DECLAR.DECLARBODY.A5050{{{}}}{{/float1Input}}
            </td>
        </tr>
        <tr>
            <td>Виплати, пов'язані з індексацією заробітної плати (із ряд 5030)</td>
            <td align="center">5051</td>
            <td align="right">
                {{#float1Input}}DECLAR.DECLARBODY.A5051{{{}}}{{/float1Input}}
            </td>
        </tr>
        <tr>
            <td>Компенсація втрати частини заробітку у зв'язку з порушенням термінів її виплати (із ряд 5030)</td>
            <td align="center">5052</td>
            <td align="right">
                {{#float1Input}}DECLAR.DECLARBODY.A5052{{{}}}{{/float1Input}}
            </td>
        </tr>
        <tr>
            <td>Заохочувальні та компенсаційні виплати</td>
            <td align="center">5060</td>
            <td align="right">
                {{#float1Input}}DECLAR.DECLARBODY.A5060{{{}}}{{/float1Input}}
            </td>
        </tr>
        <tr>
            <td>Матеріальна допомога (із ряд 5060)</td>
            <td align="center">5070</td>
            <td align="right">
                {{#float1Input}}DECLAR.DECLARBODY.A5070{{{}}}{{/float1Input}}
            </td>
        </tr>
        <tr>
            <td>Соціальні пільги, що мають індівідуальний характер (із ряд 5060)</td>
            <td align="center">5080</td>
            <td align="right">
                {{#float1Input}}DECLAR.DECLARBODY.A5080{{{}}}{{/float1Input}}
            </td>
        </tr>
        <tr>
            <td>Оплата за невідпрацьований час (із ряд 5030, 5060)</td>
            <td align="center">5090</td>
            <td align="right">
                {{#float1Input}}DECLAR.DECLARBODY.A5090{{{}}}{{/float1Input}}
            </td>
        </tr>
    </tbody>
</table>
<br clear="none">
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
    <tbody>
        <tr>
            <td align="center" colspan="5"><h3>Розділ lV. Розподіл штатних працівників за розмірами заробітної плати</h3></td>
        </tr>
        <tr>
            <td align="center">&nbsp;</td>
            <td align="right" width="28%">за</td>
            <td align="center" class="td_unln">
                <!--<input class="edtCss" id="REP_PERNM" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:string" style="width:100%;" type="textbox" value="">-->
                {{#textInput}}DECLAR.DECLARBODY.MY_DATE####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
            </td>
            <td align="left" width="28%"><b>p.</b></td>
            <td align="center">&nbsp;</td>
        </tr>
        <tr>
            <td align="center" colspan="5"><i>(останній місяць кварталу)</i></td>
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
        <tr height="0">
            <td width="10%" height="0" style="border: 0px none transparent"></td>
            <td width="30%" height="0" style="border: 0px none transparent"></td>
            <td width="10%" height="0" style="border: 0px none transparent"></td>
            <td width="10%" height="0" style="border: 0px none transparent"></td>
            <td width="20%" height="0" style="border: 0px none transparent"></td>
            <td width="10%" height="0" style="border: 0px none transparent"></td>
            <td width="10%" height="0" style="border: 0px none transparent"></td>
        </tr>
        <tr>
            <td align="center" valign="middle" colspan="5" width="80%" style="border-top: 0px none transparent">Назва показників</td>
            <td align="center" valign="middle" width="10%" style="border-top: 0px none transparent">Код рядка</td>
            <td align="center" valign="middle" width="10%" style="border-top: 0px none transparent">Осіб</td>
        </tr>
        <tr>
            <td align="center" valign="middle" colspan="5">А</td>
            <td align="center" valign="middle">Б</td>
            <td align="center" valign="middle">1</td>
        </tr>
        <tr>
            <td colspan="5">Кількість штатних працівників, яким оплачено 50% і більше робочого часу, встановленного на місяць (сума ряд. 6020 - 6120)</td>
            <td align="center">6010</td>
            <td align="right">
                {{#intInput}}DECLAR.DECLARBODY.A6010{{{}}}{{/intInput}}
            </td>
        </tr>
        <tr>
            <td colspan="5">у тому числі у розмірі, грн:<br>до однієї мінімальної зарплати</td>
            <td align="center">6020</td>
            <td align="right">
                {{#intInput}}DECLAR.DECLARBODY.A6020{{{}}}{{/intInput}}
            </td>
        </tr>
        <tr>
            <td width="10%" style="border-right: none">від</td>
            <td width="30%" style="border-right: none; border-left: none">однієї мінімальної зарплати</td>
            <td width="10%" style="border-right: none; border-left: none">до</td>
            <td width="10%" style="border-right: none; border-left: none">
                {{#currencyInput}}DECLAR.DECLARBODY.K1{{{}}}{{/currencyInput}}
            </td>
            <td width="20%" style="border-left: none">&nbsp;</td>
            <td align="center" width="10%">6030</td>
            <td align="right" width="10%">
                {{#intInput}}DECLAR.DECLARBODY.A6030{{{}}}{{/intInput}}
            </td>
        </tr>
        <tr>
            <td style="border-right: none">від</td>
            <td style="border-right: none; border-left: none">
                {{#currencyInput}}DECLAR.DECLARBODY.N2{{{}}}{{/currencyInput}}
            </td>
            <td style="border-right: none; border-left: none">до</td>
            <td style="border-right: none; border-left: none">
                {{#currencyInput}}DECLAR.DECLARBODY.K2{{{}}}{{/currencyInput}}
            </td>
            <td style="border-left: none">&nbsp;</td>
            <td align="center">6040</td>
            <td align="right">
                {{#intInput}}DECLAR.DECLARBODY.A6040{{{}}}{{/intInput}}
            </td>
        </tr>
        <tr>
            <td style="border-right: none">від</td>
            <td style="border-right: none; border-left: none">
                {{#currencyInput}}DECLAR.DECLARBODY.N3{{{}}}{{/currencyInput}}
            </td>
            <td style="border-right: none; border-left: none">до</td>
            <td style="border-right: none; border-left: none">
                {{#currencyInput}}DECLAR.DECLARBODY.K3{{{}}}{{/currencyInput}}
            </td>
            <td style="border-left: none">&nbsp;</td>
            <td align="center">6050</td>
            <td align="right">
                {{#intInput}}DECLAR.DECLARBODY.A6050{{{}}}{{/intInput}}
            </td>
        </tr>
        <tr>
            <td style="border-right: none">від</td>
            <td style="border-right: none; border-left: none">
                {{#currencyInput}}DECLAR.DECLARBODY.N4{{{}}}{{/currencyInput}}
            </td>
            <td style="border-right: none; border-left: none">до</td>
            <td style="border-right: none; border-left: none">
                {{#currencyInput}}DECLAR.DECLARBODY.K4{{{}}}{{/currencyInput}}
            </td>
            <td style="border-left: none">&nbsp;</td>
            <td align="center">6060</td>
            <td align="right">
                {{#intInput}}DECLAR.DECLARBODY.A6060{{{}}}{{/intInput}}
            </td>
        </tr>
        <tr>
            <td style="border-right: none">від</td>
            <td style="border-right: none; border-left: none">
                {{#currencyInput}}DECLAR.DECLARBODY.N5{{{}}}{{/currencyInput}}
            </td>
            <td style="border-right: none; border-left: none">до</td>
            <td style="border-right: none; border-left: none">
                {{#currencyInput}}DECLAR.DECLARBODY.K5{{{}}}{{/currencyInput}}
            </td>
            <td style="border-left: none">&nbsp;</td>
            <td align="center">6070</td>
            <td align="right">
                {{#intInput}}DECLAR.DECLARBODY.A6070{{{}}}{{/intInput}}
            </td>
        </tr>
        <tr>
            <td style="border-right: none">від</td>
            <td style="border-right: none; border-left: none">
                {{#currencyInput}}DECLAR.DECLARBODY.N6{{{}}}{{/currencyInput}}
            </td>
            <td style="border-right: none; border-left: none">до</td>
            <td style="border-right: none; border-left: none">
                {{#currencyInput}}DECLAR.DECLARBODY.K6{{{}}}{{/currencyInput}}
            </td>
            <td style="border-left: none">&nbsp;</td>
            <td align="center">6080</td>
            <td align="right">
                {{#intInput}}DECLAR.DECLARBODY.A6080{{{}}}{{/intInput}}
            </td>
        </tr>
        <tr>
            <td style="border-right: none">від</td>
            <td style="border-right: none; border-left: none">
                {{#currencyInput}}DECLAR.DECLARBODY.N7{{{}}}{{/currencyInput}}
            </td>
            <td style="border-right: none; border-left: none">до</td>
            <td style="border-right: none; border-left: none">
                {{#currencyInput}}DECLAR.DECLARBODY.K7{{{}}}{{/currencyInput}}
            </td>
            <td style="border-left: none">&nbsp;</td>
            <td align="center">6090</td>
            <td align="right">
                {{#intInput}}DECLAR.DECLARBODY.A6090{{{}}}{{/intInput}}
            </td>
        </tr>
        <tr>
            <td style="border-right: none">від</td>
            <td style="border-right: none; border-left: none">
                {{#currencyInput}}DECLAR.DECLARBODY.N8{{{}}}{{/currencyInput}}
            </td>
            <td style="border-right: none; border-left: none">до</td>
            <td style="border-right: none; border-left: none">
                {{#currencyInput}}DECLAR.DECLARBODY.K8{{{}}}{{/currencyInput}}
            </td>
            <td style="border-left: none">&nbsp;</td>
            <td align="center">6100</td>
            <td align="right">
                {{#intInput}}DECLAR.DECLARBODY.A6100{{{}}}{{/intInput}}
            </td>
        </tr>
        <tr>
            <td style="border-right: none">від</td>
            <td style="border-right: none; border-left: none">
                {{#currencyInput}}DECLAR.DECLARBODY.N12{{{}}}{{/currencyInput}}
            </td>
            <td style="border-right: none; border-left: none">до</td>
            <td style="border-right: none; border-left: none">
                {{#currencyInput}}DECLAR.DECLARBODY.K12{{{}}}{{/currencyInput}}
            </td>
            <td style="border-left: none">&nbsp;</td>
            <td align="center">6110</td>
            <td align="right">
                {{#intInput}}DECLAR.DECLARBODY.A6110{{{}}}{{/intInput}}
            </td>
        </tr>
        <tr>
            <td style="border-right: none">понад</td>
            <td style="border-right: none; border-left: none">
                {{#currencyInput}}DECLAR.DECLARBODY.N10{{{}}}{{/currencyInput}}
            </td>
            <td style="border-right: none; border-left: none">&nbsp;</td>
            <td style="border-right: none; border-left: none">&nbsp;</td>
            <td style="border-left: none">&nbsp;</td>
            <td align="center">6120</td>
            <td align="right">
                {{#intInput}}DECLAR.DECLARBODY.A6120{{{}}}{{/intInput}}
            </td>
        </tr>
        <tr>
            <td colspan="5">Кількість штатних працівників, які повністю відпрацювали місячну норму робочого часу, встановлену на місяць (із рядка 6010)</td>
            <td align="center">6130</td>
            <td align="right">
                {{#intInput}}DECLAR.DECLARBODY.A6130{{{}}}{{/intInput}}
            </td>
        </tr>
        <tr>
            <td colspan="5">Кількість штатних працівників, які повністю відпрацювали місячну норму робочого часу, з нарахованою заробітною платою в межах мінімальної (із рядка 6030)</td>
            <td align="center">6140</td>
            <td align="right">
                {{#intInput}}DECLAR.DECLARBODY.A6140{{{}}}{{/intInput}}
            </td>
        </tr>
        <tr>
            <td colspan="5">Облікова кількість штатних працівників на кінець місяця, яким встановлено тарифну ставку (оклад, посадовий оклад) нижчу від прожиткового рівня, встановленого законодавством для працездатної особи</td>
            <td align="center">6150</td>
            <td align="right">
                {{#intInput}}DECLAR.DECLARBODY.A6150{{{}}}{{/intInput}}
            </td>
        </tr>
    </tbody>
</table>
<br clear="none">
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
    <tbody>
        <tr>
            <td align="center" colspan="5"><h3>Розділ V. Кількість і фонд оплати праці окремих категорій працівників</h3></td>
        </tr>
    </tbody>
</table>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px" border="1" bordercolor="black" cellspacing="0">
    <tbody>
        <tr>
            <td align="center" valign="middle" width="45%">Назва показників</td>
            <td align="center" valign="middle" width="10%">Код рядка</td>
            <td align="center" valign="middle" width="15%">середньооблікова кількість осіб (у цілих числах)</td>
            <td align="center" valign="middle" width="15%">фонд оплати праці, тис.грн. (з одним десятковим знаком)</td>
            <td align="center" valign="middle" width="15%">кількість відпрацьованих людино-годин (у цілих числах)</td>
        </tr>
        <tr>
            <td align="center" valign="middle">А</td>
            <td align="center" valign="middle">Б</td>
            <td align="center" valign="middle">1</td>
            <td align="center" valign="middle">2</td>
            <td align="center" valign="middle">3</td>
        </tr>
        <tr>
            <td align="center" valign="middle" colspan="5">Із середньооблікової кількості штатних працівників:</td>
        </tr>
        <tr>
            <td>жінки</td>
            <td align="center">7010</td>
            <td align="right">
                {{#intInput}}DECLAR.DECLARBODY.A7010{{{}}}{{/intInput}}
            </td>
            <td align="right">
                {{#float1Input}}DECLAR.DECLARBODY.B7010{{{}}}{{/float1Input}}
            </td>
            <td align="right">
                {{#intInput}}DECLAR.DECLARBODY.C7010{{{}}}{{/intInput}}
            </td>
        </tr>
        <tr>
            <td>працівники, оплата праці яких фінансуєтся коштом державного та місцевого бюджету (заповнюють бюджетні установи (розпорядники бюджетних коштів)</td>
            <td align="center">7020</td>
            <td align="right">
                {{#intInput}}DECLAR.DECLARBODY.A7020{{{}}}{{/intInput}}
            </td>
            <td align="right">
                {{#float1Input}}DECLAR.DECLARBODY.B7020{{{}}}{{/float1Input}}
            </td>
            <td align="center">x</td>
        </tr>
        <tr>
            <td align="center" valign="middle" colspan="5">Працівники, які не перебувають в обліковому складі (позаштатні):</td>
        </tr>
        <tr>
            <td>зовнішні сумісники</td>
            <td align="center">7030</td>
            <td align="right">
                {{#intInput}}DECLAR.DECLARBODY.A7030{{{}}}{{/intInput}}
            </td>
            <td align="right">
                {{#float1Input}}DECLAR.DECLARBODY.B7030{{{}}}{{/float1Input}}
            </td>
            <td align="center">x</td>
        </tr>
        <tr>
            <td>працюють за цивільно-правовими договорами</td>
            <td align="center">7040</td>
            <td align="right">
                {{#intInput}}DECLAR.DECLARBODY.A7040{{{}}}{{/intInput}}
            </td>
            <td align="right">
                {{#float1Input}}DECLAR.DECLARBODY.B7040{{{}}}{{/float1Input}}
            </td>
            <td align="center">x</td>
        </tr>
    </tbody>
</table>
<br clear="none">
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
    <tbody>
        <tr>
            <td align="center" colspan="5"><h3>Розділ VI. Інформація про укладання колективних договорів</h3></td>
        </tr>
        <tr>
            <td align="center">&nbsp;</td>
            <td align="right" width="28%">станом на 31 грудня</td>
            <td align="center" class="td_unln">
                {{#intInput}}DECLAR.DECLARBODY.REP_NYEAR{{{}}}{{/intInput}}
            </td>
            <td align="left" width="28%"><b>p.</b></td>
            <td align="center">&nbsp;</td>
        </tr>
        <tr>
            <td align="center" colspan="5"><i>(раз на рік у звіті за IV квартал)</i></td>
        </tr>
    </tbody>
</table>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px" border="1" bordercolor="black" cellspacing="0">
    <tbody>
        <tr>
            <td align="center" valign="middle" width="70%">Назва показників</td>
            <td align="center" valign="middle" width="10%">Код рядка</td>
            <td align="center" valign="middle" width="20%">Усього по підприємству включно з даними по структурних підрозділах</td>
        </tr>
        <tr>
            <td align="center" valign="middle">А</td>
            <td align="center" valign="middle">Б</td>
            <td align="center" valign="middle">1</td>
        </tr>
        <tr>
            <td>Кількість укладених та зареєстровних колективних договорів, од</td>
            <td align="center">8010</td>
            <td align="right">
                {{#intInput}}DECLAR.DECLARBODY.A8010{{{}}}{{/intInput}}
            </td>
        </tr>
        <tr>
            <td>Кількість штатних працівників, які охопллені колективними договорами, осіб (у цілих числах)</td>
            <td align="center">8020</td>
            <td align="right">
                {{#intInput}}DECLAR.DECLARBODY.A8020{{{}}}{{/intInput}}
            </td>
        </tr>
        <tr>
            <td>Розмір мінімальної місячної тарифної ставки (окладу), встановлений у колективному договорі, грн (із двома десятковими знаками)</td>
            <td align="center">8030</td>
            <td align="right">
                {{#currencyInput}}DECLAR.DECLARBODY.A8030{{{}}}{{/currencyInput}}
            </td>
        </tr>
        <tr>
            <td>Розмір мінімальної місячної тарифної ставки (окладу), встановлений у галузевій угоді, грн (із двома десятковими знаками)</td>
            <td align="center">8040</td>
            <td align="right">
                {{#currencyInput}}DECLAR.DECLARBODY.A8040{{{}}}{{/currencyInput}}
            </td>
        </tr>
    </tbody>
</table>       
<br clear="none">
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
    <tbody>
        <tr>
            <td align="center" colspan="5"><h3>Розділ VII. Витрати на утримання робочої сили, що не входять до складу фонду оплати праці за {{{DECLAR.DECLARBODY.REP_PYEAR}}} р. (у звіті за I квартал)</h3></td>
        </tr>
    </tbody>
</table>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px" border="1" bordercolor="black" cellspacing="0">
    <tbody>
        <tr>
            <td align="center" valign="middle" width="70%">Назва показників</td>
            <td align="center" valign="middle" width="10%">Код рядка</td>
            <td align="center" valign="middle" width="20%">Усього по підприємству включно з даними по структурних підрозділах</td>
        </tr>
        <tr>
            <td align="center" valign="middle">А</td>
            <td align="center" valign="middle">Б</td>
            <td align="center" valign="middle">1</td>
        </tr>
        <tr>
            <td>Витрати підприємства на утримання робочої сили, крім тих, які враховані у фонді оплати праці (сума рядків з 9020 до 9060), тис.грн (з одним десятковим знаком)</td>
            <td align="center">9010</td>
            <td align="right">
                {{#float1Input}}DECLAR.DECLARBODY.A9010{{{}}}{{/float1Input}}
            </td>
        </tr>
        <tr>
            <td>Витрати підприємства на соціальне забезпечення працівників, тис.грн(з одним десятковим знаком) (із рядка 9010)</td>
            <td align="center">9020</td>
            <td align="right">
                {{#float1Input}}DECLAR.DECLARBODY.A9020{{{}}}{{/float1Input}}
            </td>
        </tr>
        <tr>
            <td>Витрати підприємства на культурно-побутове обслуговування працівників, тис.грн (з одним десятковим знаком) (із рядка 9010)</td>
            <td align="center">9030</td>
            <td align="right">
                {{#float1Input}}DECLAR.DECLARBODY.A9030{{{}}}{{/float1Input}}
            </td>
        </tr>
        <tr>
            <td>Витрати підприємства на забезпечення працівників житлом, тис.грн (з одним десятковим знаком) (із рядка 9010)</td>
            <td align="center">9040</td>
            <td align="right">
                {{#float1Input}}DECLAR.DECLARBODY.A9040{{{}}}{{/float1Input}}
            </td>
        </tr>
        
        <tr>
            <td>Витрати підприємства на професійне навчання, тис.грн (з одним десятковим знаком) (із рядка 9010)</td>
            <td align="center">9050</td>
            <td align="right">
                {{#float1Input}}DECLAR.DECLARBODY.A9050{{{}}}{{/float1Input}}
            </td>
        </tr>
        <tr>
            <td>Інші витрати на робочу силу, тис.грн (з одним десятковим знаком) (із рядка 9010)</td>
            <td align="center">9060</td>
            <td align="right">
                {{#float1Input}}DECLAR.DECLARBODY.A9060{{{}}}{{/float1Input}}
            </td>
        </tr>
        <tr>
            <td>Середньооблікова кількість штатних працівників підприємства, осіб (у цілих числах)</td>
            <td align="center">9070</td>
            <td align="right">
                {{#intInput}}DECLAR.DECLARBODY.A9070{{{}}}{{/intInput}}
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
                {{#textInput}}DECLAR.DECLARBODY.VIK_RUK####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
                <!--<input class="edtCss" descr_ne="Не заповнено рядок ПІБ керівника (власника) та/або особи, відповідальної за достовірність наданої інформації (на бланку;  обов&#39;язковий)" expr_ne="&#39;&#39;" id="VIK_RUK" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:string" style="width:100%;" type="textbox" value="">-->
            </td>
        </tr>
        <tr>
            <td style="font-size:0.75em; border-top: 1px solid black" align="center">Місце підпису керівника (власника) та/або особи,<br clear="none">відповідальної за достовірність наданої інформації</td>
            <td>&nbsp;</td>
            <td style="font-size:0.75em; border-top: 1px solid black" align="center">(П. І. Б.)</td>
        </tr>
        <tr>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td align="center" class="td_unln">
                <!--<input class="edtCss" id="VIK" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:string" style="width:100%;" type="textbox" value="">-->
                {{#textInput}}DECLAR.DECLARBODY.VIK####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
            </td>
        </tr>
        <tr>
            <td class="td_unln" style="font-size:0.75em; border-top: 1px solid black">&nbsp;</td>
            <td>&nbsp;</td>
            <td style="font-size:0.75em; border-top: 1px solid black" align="center">(П. І. Б.)</td>
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
            <td align="right" nowrap="nowrap" width="10%">
                <span style="margin-left:5px; font-size:0.75em;">факс:</span>
            </td>
            <td class="td_unln" width="20%">
                <!--<input class="edtCss" id="FIRM_FAXORG" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:string" style="width:100%;" type="textbox" value="">-->
                {{#textInput}}DECLAR.DECLARBODY.FIRM_FAXORG####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
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
