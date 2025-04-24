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
            <td align="right" width="28%">у</td>
            <td align="center" class="td_unln">
                <!--<input class="edtCss" id="REP_PERNM" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:string" style="width:100%;" type="textbox" value="">-->
                {{#textInput}}DECLAR.DECLARBODY.REP_PERNM####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
            </td>
            <td align="left" width="28%"><b>p.</b></td>
            <td align="center">&nbsp;</td>
        </tr>
        <tr>
            <td align="center" colspan="2">&nbsp;</td>
            <td align="center" style="font-size:0.75em;"><i>(назва звітного місяця)</i></td>
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
            <td align="center" rowspan="2" valign="middle" width="30%"><b>№ 1-ПВ</b><br clear="none">(місячна)<br clear="none">ЗАТВЕРДЖЕНО <br clear="none"> Наказ Держстату <br clear="none"> 10.06.2016 № 90</td>
        </tr>
        <tr align="center" class="td_box_1">
            <td align="left" class="td_box_1" style="border: 1px solid black">юридичні особи, відокремлені підрозділи юридичних осіб за<br clear="none"> переліком, визначеним органами державної статистики <br clear="none"> - територіальному органу Держстату</td>
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
                {{#textInput}}DECLAR.DECLARBODY.N_1####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
            </td>
        </tr>
        <tr>
            <td width="35%">Вид економічної діяльності </td>
            <td class="td_unln" colspan="2">
                <!--<input class="edtCss" id="N1" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:string" style="width:100%;" type="textbox" value="" lz-ref-id="HKVED" lz-ref-link="N1:alias" lz-ref-type="common">-->
                {{#textInput}}DECLAR.DECLARBODY.N_2####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
            </td>
        </tr>
        <tr>
            <td colspan="3">Адреса здійснення діяльності, щодо якої подається форма звітності (фактична адреса):</td>
        </tr>
        <tr>
            <td class="td_unln" colspan="3">
                <!--<input class="edtCss" id="N11" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:string" style="width:100%;" type="textbox" value="">-->
                {{#textInput}}DECLAR.DECLARBODY.N_3####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
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
            <td align="center" colspan="5"><h3>Розділ I. Кількість працівників, робочий час і фонд оплати праці</h3></td>
        </tr>
    </tbody>
</table>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="840px" border="1" bordercolor="black" cellspacing="0">
    <tbody>
        <tr>
            <td align="center" valign="middle" width="80%">Назва показників</td>
            <td align="center" valign="middle" width="10%">Код <br clear="none">рядка</td>
            <td align="center" valign="middle" width="10%">За звітний місяць</td>
        </tr>
        <tr>
            <td align="center" valign="middle">А</td>
            <td align="center" valign="middle" width="5%">Б</td>
            <td align="center" valign="middle" width="15%">1</td>
        </tr>
        <tr>
            <td>Фонд оплати праці ycix працівників, тис.грн. (з одним десятковим знаком)</td>
            <td align="center">1020</td>
            <td align="right">
               {{#float1Input}}DECLAR.DECLARBODY.A1020{{{}}}{{/float1Input}}
            </td>
        </tr>
        <tr>
            <td>Сума податку з доходів фізичних oci6, що вирахована з фонду оплати праці ycix працівників (крім тимчасової непрацездатності), тис. грн. (з одним десятковим знаком)</td>
            <td align="center">1030</td>
            <td align="right">
                {{#float1Input}}DECLAR.DECLARBODY.A1030{{{}}}{{/float1Input}}
            </td>
        </tr>
        <tr>
            <td>Середньооблікова кількість штатних працівників, oci6 (у цілих числах)</td>
            <td align="center">1040</td>
            <td align="right">
                {{#intInput}}DECLAR.DECLARBODY.A1040{{{}}}{{/intInput}}
            </td>
        </tr>
        <tr>
            <td>Кількість відпрацьованого робочого часу штатними працівниками, люд.год (у цілих числах)</td>
            <td align="center">1060</td>
            <td align="right">
                {{#intInput}}DECLAR.DECLARBODY.A1060{{{}}}{{/intInput}}
            </td>
        </tr>
        <tr>
            <td>Фонд оплати праці штатних працівників, тис. грн. (з одним десятковим знаком) (із ряд. 1020)</td>
            <td align="center">1070</td>
            <td align="right">
                {{#float1Input}}DECLAR.DECLARBODY.A1070{{{}}}{{/float1Input}}
            </td>
        </tr>
    </tbody>
</table>
<br clear="none">
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
    <tbody>
        <tr>
            <td align="center" colspan="5"><h3>Пояснення до розділу І</h3></td>
        </tr>
    </tbody>
</table>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px" border="1" bordercolor="black" cellspacing="0">
    <tbody>
        <tr>
            <td align="center" valign="middle" width="50%">Назва показника</td>
            <td align="center" valign="middle" width="50%">Основна причина відхилення</td>
        </tr>
        <tr>
            <td>Середньооблкова кількість штатних працівників (ряд. 1040 гр. 1) +;-25% i більше порівняно з попереднім періодом</td>
            <td>
                <!--<input class="edtCss" descr_ge="Рядок 3020 гр.1 &gt;= Рядок 3020 гр.2 (на бланку)" expr_ge="^A3020_2" id="A3020_1" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:integer" style="width:100%;" type="textbox" value="">-->
                {{#textInput}}DECLAR.DECLARBODY.N1####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
            </td>
        </tr>
        <tr>
            <td>Середня заробітна плата штатного працівника (ряд. 1070/ряд.1040*1000) +;-10% i більше порівняно з попереднім періодом</td>
            <td>
                <!--<input class="edtCss" descr_ge="Рядок 3020 гр.1 &gt;= Рядок 3020 гр.2 (на бланку)" expr_ge="^A3020_2" id="A3020_1" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:integer" style="width:100%;" type="textbox" value="">-->
                {{#textInput}}DECLAR.DECLARBODY.N2####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
            </td>
        </tr>
    </tbody>
</table>
<br clear="none">
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
    <tbody>
        <tr>
            <td align="center" colspan="5"><h3>Розділ ll. Заборгованіть перед працівниками iз заробітной плати та виплат iз соціального страхування</h3></td>
        </tr>
    </tbody>
</table>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
    <tbody>
        <tr>
            <td align="right" width="40%">на</td>
            <td class="td_unln" width="15%">
                <!--<input class="edtCss" id="REP_PER1" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:string" style="width:100%;" type="textbox" value="">-->
                {{#textInput}}DECLAR.DECLARBODY.REP_PER1####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
            </td>
            <td class="td_unln" width="5%">
                <!--<input class="edtCss" id="REP_NYE" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:string" style="width:100%;" type="textbox" value="">-->
                {{#intInput}}DECLAR.DECLARBODY.REP_NYE{{{}}}{{/intInput}}
            </td>
            <td align="left" width="40%">p.</td>
        </tr>
        <tr>
            <td align="center">&nbsp;</td>
            <td align="center" colspan="2" style="font-size:0.75em; border-top: 1px solid black">(назва місяця наступного після звітного періоду)</td>
            <td align="left">&nbsp;</td>
        </tr>
    </tbody>
</table>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px" border="1" bordercolor="black" cellspacing="0">
    <tbody>
        <tr>
            <td align="center" valign="middle" width="80%">Назва показників</td>
            <td align="center" valign="middle" width="10%">Код <br clear="none">рядка</td>
            <td align="center" valign="middle" width="10%">Усього</td>
        </tr>
        <tr>
            <td align="center" valign="middle">А</td>
            <td align="center" valign="middle" width="5%">Б</td>
            <td align="center" valign="middle" width="15%">1</td>
        </tr>
        <tr>
            <td>Сума зaборгованості з виплати заробітної плати, тис.грн.  (з одним десятковим знаком)</td>
            <td align="center">2010</td>
            <td align="right">
                <!--<input class="edtCss" descr_ge="Рядок 3020 гр.1 &gt;= Рядок 3020 гр.2 (на бланку)" expr_ge="^A3020_2" id="A3020_1" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:integer" style="width:100%;" type="textbox" value="">-->
                {{#float1Input}}DECLAR.DECLARBODY.A2010{{{}}}{{/float1Input}}
            </td>
        </tr>
        <tr>
            <td>Сума зaборгованості з виплати заробітної плати, утворена у попередні роки, тис.грн. (з одним десятковим знаком) (із ряд. 2010)</td>
            <td align="center">2020</td>
            <td align="right">
                <!--<input class="edtCss" descr_ge="Рядок 3020 гр.1 &gt;= Рядок 3020 гр.2 (на бланку)" expr_ge="^A3020_2" id="A3020_1" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:integer" style="width:100%;" type="textbox" value="">-->
                {{#float1Input}}DECLAR.DECLARBODY.A2020{{{}}}{{/float1Input}}
            </td>
        </tr>
        <tr>
            <td>Кількість працівників, яким своєчасно не виплачено заробітну плату, oci6  (у цілих числах)</td>
            <td align="center">2030</td>
            <td align="right">
                <!--<input class="edtCss" descr_ge="Рядок 3020 гр.1 &gt;= Рядок 3020 гр.2 (на бланку)" expr_ge="^A3020_2" id="A3020_1" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:integer" style="width:100%;" type="textbox" value="">-->
                {{#intInput}}DECLAR.DECLARBODY.A2030{{{}}}{{/intInput}}
            </td>
        </tr>
        <tr>
            <td>Сума зaборгованості з виплат працівникам у зв'язку з тимчасовою непрацездатністю, уключаючи оплату перших п'яти днів, тис.грн. (з одним десятковим знаком)</td>
            <td align="center">2040</td>
            <td align="right">
                <!--<input class="edtCss" descr_ge="Рядок 3020 гр.1 &gt;= Рядок 3020 гр.2 (на бланку)" expr_ge="^A3020_2" id="A3020_1" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:integer" style="width:100%;" type="textbox" value="">-->
                {{#float1Input}}DECLAR.DECLARBODY.A2040{{{}}}{{/float1Input}}
            </td>
        </tr>
        <tr>
            <td>Сума зaборгованості з виплати заробітної плати, яка фінансується за рахунок бюджетних коштів, тис. грн.  (з одним десятковим знаком)  (із ряд. 2010)</td>
            <td align="center">2050</td>
            <td align="right">
                <!--<input class="edtCss" descr_ge="Рядок 3020 гр.1 &gt;= Рядок 3020 гр.2 (на бланку)" expr_ge="^A3020_2" id="A3020_1" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:integer" style="width:100%;" type="textbox" value="">-->
                {{#float1Input}}DECLAR.DECLARBODY.A2050{{{}}}{{/float1Input}}
            </td>
        </tr>
        <tr>
            <td>Сума зaборгованості з виплати заробітної плати, яка фінансується за рахунок коштів місцевих бюджетів, тис.грн    (з одним десятковим знаком) (із ряд. 2050)</td>
            <td align="center">2060</td>
            <td align="right">
                <!--<input class="edtCss" descr_ge="Рядок 3020 гр.1 &gt;= Рядок 3020 гр.2 (на бланку)" expr_ge="^A3020_2" id="A3020_1" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:integer" style="width:100%;" type="textbox" value="">-->
                {{#float1Input}}DECLAR.DECLARBODY.A2060{{{}}}{{/float1Input}}
            </td>
        </tr>
        <tr>
            <td>Сума зaборгованості з компенсаціонних виплат працівникам, як постраждали внаслідок Чорнобильської катастрофи, тис. грн.  (з одним десятковим знаком) (із ряд. 2050)</td>
            <td align="center">2070</td>
            <td align="right">
                <!--<input class="edtCss" descr_ge="Рядок 3020 гр.1 &gt;= Рядок 3020 гр.2 (на бланку)" expr_ge="^A3020_2" id="A3020_1" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:integer" style="width:100%;" type="textbox" value="">-->
                {{#float1Input}}DECLAR.DECLARBODY.A2070{{{}}}{{/float1Input}}
            </td>
        </tr>
    </tbody>
</table>
<br clear="none">
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
    <tbody>
        <tr>
            <td align="center" colspan="5"><h3>Пояснення до розділу ІІ</h3></td>
        </tr>
    </tbody>
</table>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px" border="1" bordercolor="black" cellspacing="0">
    <tbody>
        <tr>
            <td align="center" valign="middle">Назва показника</td>
            <td align="center" valign="middle">Основна причина відхилення</td>
        </tr>
        <tr>
            <td>Сума зaборгованості з виплати заробітної плати (ряд.2010) +;-25% i більше порівняно з попереднім періодом</td>
            <td>
                <!--<input class="edtCss" descr_ge="Рядок 3020 гр.1 &gt;= Рядок 3020 гр.2 (на бланку)" expr_ge="^A3020_2" id="A3020_1" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:integer" style="width:100%;" type="textbox" value="">-->
                {{#textInput}}DECLAR.DECLARBODY.N3####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
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
