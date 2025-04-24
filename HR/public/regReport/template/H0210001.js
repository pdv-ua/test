module.exports = `
<table style="text-align: right; table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; font-size: 14pt;  " cellspacing="0" cellpadding="5" width="1050">
    <tbody>
        <tr>
            <td>Додаток</td>
        </tr>
        <tr>
            <td>до Порядку надання роботодавцями державній службі зайнятості інформації про зайнятість та працевлаштування</td>
        </tr>
        <tr>
            <td>громадян, що мають додаткові гарантії у сприянні працевлаштуванню</td>
        </tr>
        <tr>
            <td>(пункт 2.5)</td>
        </tr>
    </tbody>
</table>

<br> </br>
\t
<table style="text-align: center; table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; font-size: 18pt; " cellspacing="0" cellpadding="5" width="1050">
    <tbody>
        <tr>
            <td style="font-weight: bold">ІНФОРМАЦІЯ</td>
        </tr>
        <tr>
            <td style="font-weight: bold">про зайнятість і працевлаштування громадян, що мають додаткові</td>
        </tr>
        <tr>
            <td style="font-weight: bold">гарантії у сприянні працевлаштуванню за {{#textInput}}DECLAR.DECLARBODY.PERIOD####{"style": "font-weight: bold; font-size: 18pt; width: 50px"}{{{}}}{{/textInput}} рік</td>
        </tr>
    </tbody>
</table>

<br> </br>
\t
<table style="text-align: left; table-layout: fixed;text-align: center; margin-left: 15px; border: 1px solid black; border-collapse: collapse; font-family: TimesNewRoman; font-size: 14pt; " cellspacing="0" cellpadding="5" width="1050">
\t<tbody>
\t\t<tr>
            <td style="border: 1px solid black; width:70%">Подають</td>
            <td style="border: 1px solid black; width:30%">Строк подання</td>
        </tr>
\t\t<tr>
            <td style="border: 1px solid black; text-align: left; width:70%">Підприємства, установи та організації незалежно від форми власності з чисельністю штатних працівників від 8 осіб - регіональному чи базовому центру зайнятості, його філіям (за наявності) незалежно від місцезнаходження</td>
            <td style="border: 1px solid black; text-align: left; width:30%">Щороку не пізніше 01 лютого після звітного року</td>
        </tr>
    </tbody>
</table>\t\t\t

<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; font-size: 14pt; border-right: 1px solid black; border-left: 1px solid black; " cellspacing="0" cellpadding="5" width="1050">
    <tbody>
        <tr>
            <td nowrap="nowrap" width="25%"><b>Респондент:</b></td>
            <td valign="bottom" width="25%">&nbsp;&nbsp;</td>
            <td valign="bottom" width="20%">&nbsp;&nbsp;</td>
            <td valign="bottom" width="30%">&nbsp;&nbsp;</td>
        </tr>
        <tr>
            <td nowrap="nowrap">Код згідно з ЄДРПОУ / ІПН :</td>
            <td class="td_unln" colspan="3" valign="bottom">{{#textInput}}DECLAR.DECLARBODY.FIRM_EDRPOU####{"style": "font-weight: bold; font-size: 14pt;"}{{{}}}{{/textInput}}</td>
        </tr>
        <tr>
            <td nowrap="nowrap">Найменування:</td>
            <td class="td_unln" colspan="3" valign="bottom">{{#textInput}}DECLAR.DECLARBODY.FIRM_NAME####{"style": "font-weight: bold; font-size: 14pt;"}{{{}}}{{/textInput}}</td>
        </tr>
        <tr>
            <td colspan="2" nowrap="nowrap">Місцезнаходження :&nbsp;&nbsp;</td>
            <td class="td_unln" colspan="2">&nbsp;&nbsp;</td>
        </tr>
        <tr class="td_unln">
            <td class="td_unln" colspan="4">{{#textInput}}DECLAR.DECLARBODY.FIRM_ADR####{"style": "font-weight: bold; font-size: 14pt;"}{{{}}}{{/textInput}}</td>
        </tr>
        <tr>
            <td align="center" colspan="4" style="font-size: 14pt;"><i>(поштовий індекс, область / Автономна Республіка Крим, м. Київ, м. Севастополь, район, населений пункт, вулиця/провулок, площа тощо, N будинку/корпусу, N квартири/офісу)</i></td>
            </tbody>
</table>

<table style="text-align: left; table-layout: fixed;text-align: center; margin-left: 15px; font-family: TimesNewRoman; font-size: 14pt; " cellspacing="0" cellpadding="5" width="1050">
    <tbody>
        </tr>
            <td nowrap="nowrap" width="10%" style="border-left: 1px solid black;">Телефон:</td>
            <td class="td_unln" colspan="3" width="30%">{{#textInput}}DECLAR.DECLARBODY.VIK_TEL####{"style": "font-weight: bold; font-size: 14pt;"}{{{}}}{{/textInput}}</td>
            <td nowrap="nowrap" width="15%">Факс: ___________</td>
            <td nowrap="nowrap" width="15%">Електронна пошта:</td>
            <td class="td_unln" colspan="3" valign="bottom" width="30%" style="border-right: 1px solid black;">{{#textInput}}DECLAR.DECLARBODY.VIK_EMAIL####{"style": "font-weight: bold; font-size: 14pt; "}{{{}}}{{/textInput}}  </td>
         <tr>
    </tbody>
</table>

<table style="text-align: left; table-layout: fixed;text-align: center; margin-left: 15px; border: 1px solid black; border-collapse: collapse; font-family: TimesNewRoman; font-size: 14pt; " cellspacing="0" cellpadding="5" width="1050">
\t<tbody>
\t\t<tr>
            <td style="border: 1px solid black; width:75%">Назва показників</td>
            <td style="border: 1px solid black; width:12%">Код рядка</td>
\t\t\t<td style="border: 1px solid black; width:13%">Кількість, осіб</td>
        </tr>
\t\t<tr>
            <td style="border: 1px solid black;">А</td>
            <td style="border: 1px solid black;">Б</td>
\t\t\t<td style="border: 1px solid black;">1</td>
        </tr>
\t\t<tr>
            <td style="border: 1px solid black; text-align: left;">Середньооблікова чисельність штатних працівників за попередній календарний рік - усього*</td>
            <td style="border: 1px solid black;">01</td>
\t\t\t<td style="border: 1px solid black;">{{#textInput}}DECLAR.DECLARBODY.STAFFING_PREVIOUS####{"style": "font-weight: bold; font-size: 14pt;"}{{{}}}{{/textInput}}</td>
        </tr>
\t\t<tr>
            <td style="border: 1px solid black; text-align: left;">Середньооблікова чисельність штатних працівників, що мають додаткові гарантії у сприянні працевлаштуванню відповідно до частини першої статті 14 Закону України "Про зайнятість населення" (крім осіб з інвалідністю), які працювали на умовах повної зайнятості у звітному періоді*</td>
            <td style="border: 1px solid black;">02</td>
\t\t\t<td style="border: 1px solid black;">{{#textInput}}DECLAR.DECLARBODY.STAFFING_ADDGRUARANT####{"style": "font-weight: bold; font-size: 14pt;"}{{{}}}{{/textInput}}</td>
        </tr>
\t\t<tr>
            <td style="border: 1px solid black; text-align: left;">Квота у розмірі 5 % середньооблікової чисельності штатних працівників*</td>
            <td style="border: 1px solid black;">03</td>
\t\t\t<td style="border: 1px solid black;">{{#textInput}}DECLAR.DECLARBODY.STAFFING_QUOTA####{"style": "font-weight: bold; font-size: 14pt;"}{{{}}}{{/textInput}}</td>
\t\t</tr>
\t\t<tr>
            <td style="border: 1px solid black; text-align: left;">Середньооблікова чисельність штатних працівників за звітний рік - усього**</td>
            <td style="border: 1px solid black;">04</td>
\t\t\t<td style="border: 1px solid black;">{{#textInput}}DECLAR.DECLARBODY.STAFFING####{"style": "font-weight: bold; font-size: 14pt;"}{{{}}}{{/textInput}}</td>
\t\t</tr>
\t\t<tr>
            <td style="border: 1px solid black; text-align: left;">Середньооблікова чисельність штатних працівників за звітний рік, яким до настання права на пенсію за віком відповідно до статті 26 Закону України "Про загальнообов'язкове державне пенсійне страхування" залишилося 10 і менше років**</td>
            <td style="border: 1px solid black;">05</td>
\t\t\t<td style="border: 1px solid black;">{{#textInput}}DECLAR.DECLARBODY.STAFFING_PENSION####{"style": "font-weight: bold; font-size: 14pt;"}{{{}}}{{/textInput}}</td>
        </tr>
\t\t<tr>
            <td style="border: 1px solid black; text-align: left;">Чисельність громадян, яких планується працевлаштувати в поточному році у рахунок квоти</td>
            <td style="border: 1px solid black;">06</td>
\t\t\t<td style="border: 1px solid black;">{{#textInput}}DECLAR.DECLARBODY.STAFFING_PLAN####{"style": "font-weight: bold; font-size: 14pt;"}{{{}}}{{/textInput}}</td>
        </tr>
\t</tbody>
</table>

<br> </br>
<br> </br>

<table style="text-align: ltft; table-layout: auto; margin-left: 15px; font-family: TimesNewRoman; font-size: 14pt; " cellspacing="0" cellpadding="5" width="1050">
    <tbody>
        <tr>
            <td>____________</td>
        </tr>
        <tr>
            <td>* Заповнюється підприємствами, установами та організаціями з чисельністю штатних працівників понад 20 осіб.</td>
        </tr>
        <tr>
            <td>** Заповнюється підприємствами, установами та організаціями з чисельністю штатних працівників від 8 до 20 осіб.</td>
        </tr>
    </tbody>
</table>

<br> </br>

<table style="table-layout: fixed;text-align: center; margin-left: 15px; font-family: TimesNewRoman; font-size: 14pt; " cellspacing="0" cellpadding="5" width="1050">
    <tbody>
        <tr>
            <td style=" text-align: left; width:65%">Дата заповнення {{#textInput}}DECLAR.DECLARBODY.DATE####{"style": "font-weight: bold; font-size: 14pt; width: 90px"}{{{}}}{{/textInput}} року <br> Керівник (особа, відповідальна за подання інформації) <br> {{#textInput}}DECLAR.DECLARBODY.VIK####{"style": "font-weight: bold; font-size: 14pt; width: 500px"}{{{}}}{{/textInput}} <br> (прізвище, ім'я, по батькові) </td>
\t\t\t<td style=" text-align: center; width:35%"> <br> <br> ________________ <br> (підпис) </td>
\t\t</tr>
        <tr>
            <td style="text-align: left; width:65%">Дата прийняття ___ ____________ 20__ року <br> Відповідальна особа, яка прийняла інформацію <br> __________________________________ <br> (прізвище, ім'я, по батькові) </td>
\t\t\t<td style="text-align: center; width:35%"> <br> <br> ________________ <br> (підпис) </td>
\t\t</tr>
\t</tbody>
</table>
`
