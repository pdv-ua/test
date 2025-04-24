module.exports = `
<!--%pageOrientation:landscape-->
<!-- background: aqua -->
<html>
<table style="table-layout: auto; margin-left: 15px; font-family: TimesNewRoman; font-size: 12px; border-collapse: collapse;" cellspacing="0" cellpadding="0" width="1050px">
    <tbody>
        <tr>
            <td style="text-align: right;">Додаток до Звіту про зайнятість і працевлаштування громадян, що мають</td>
        </tr>
        <tr>
            <td style="text-align: right;">додаткові гарантії у сприянні працевлаштуванню за {{#textInput}}DECLAR.DECLARBODY.PERIOD####{"style": "font-size: 10pt; width: 35px"}{{{}}}{{/textInput}} рік</td>
        </tr>
    </tbody>
</table>
<table style="text-align: center; table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; font-size: 13.5px; border-collapse: collapse;" cellspacing="0" cellpadding="0" width="1050px">
    <tbody>
        <tr>
            <td width="50%">&nbsp;</td>
            <td width="5%">&nbsp;</td>
            <td width="45%">&nbsp;</td>
        </tr>
        <tr>
          <td style="font-weight: bold" width="50%" align="right">Список квотників, фактично працюючих в</td>
          <td colspan="2" style="font-weight: bold" width="50%" align="left">{{#textInput}}DECLAR.DECLARBODY.FIRM_NAME####{"style": "font-weight: bold; font-size: 12pt;"}{{{}}}{{/textInput}}</td>
        </tr>
        <tr>
          <td style="font-weight: bold"; width="50%"; align="right";>за</td>
          <td style="font-weight: bold"; width="5%"; align="center";>{{#textInput}}DECLAR.DECLARBODY.PERIOD####{"style": "font-weight: bold; font-size: 12pt; width: 35px"}{{{}}}{{/textInput}}</td>
          <td style="font-weight: bold"; width="40%"; align="left";>рік</td>
        </tr>
        <tr>
            <td  width="100%"; colspan="3";>&nbsp;</td>
        </tr>
    </tbody>
</table>
</table>
<table style="table-layout: auto;text-align: center; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
    <tbody >
\t        <tr>
            <td nowrap="nowrap" width="3%">&nbsp;&nbsp;</td>
            <td valign="nowrap" width="17%">&nbsp;&nbsp;</td>
            <td valign="nowrap" width="10%">&nbsp;&nbsp;</td>
            <td valign="nowrap" width="10%">&nbsp;&nbsp;</td>
\t\t\t<td nowrap="nowrap" width="10%">&nbsp;&nbsp;</td>
            <td valign="nowrap" width="10%">&nbsp;&nbsp;</td>
            <td valign="nowrap" width="10%">&nbsp;&nbsp;</td>
            <td valign="nowrap" width="10%">&nbsp;&nbsp;</td>
\t\t\t<td valign="nowrap" width="10%">&nbsp;&nbsp;</td>
            <td valign="nowrap" width="10%">&nbsp;&nbsp;</td>
        </tr>
\t\t
        <tr style="border: 1px solid black;">
            <td style="border: 1px solid black; width: 50px;" rowspan="2">N з/п</td>
            <td style="border: 1px solid black;" rowspan="2">ПІБ квотника</td>
            <td style="border: 1px solid black;" rowspan="2">Дата та номер наказу про прийняття на роботу</td>
            <td style="border: 1px solid black;">Жінки з дитиною до 6 років</td>
            <td style="border: 1px solid black;">Одинокі матері з дітьми до 14 років або дітьми інвалідами</td>
            <td style="border: 1px solid black;" colspan="3">Молодь яка закінчила або припинила навчання у школі або вищому навчальному закладі</td>
            <td style="border: 1px solid black;">Молодь яка звільнилася з військової або альтернативної служби</td>
\t\t\t<td style="border: 1px solid black;">Особи передпенсійного віку</td>
        </tr>
\t\t\t<tr style="border: 1px solid black;">
            <td style="border: 1px solid black;">Дата народження дитини</td>
            <td style="border: 1px solid black;">Дата народження дитини</td>
            <td style="border: 1px solid black;">Дата народження особи</td>
            <td style="border: 1px solid black;">Дата закінчення навчального закладу</td>
            <td style="border: 1px solid black;">Назва навчального закладу</td>
            <td style="border: 1px solid black;">Дата звільнення зі служби</td>
            <td style="border: 1px solid black;">Дата народження особи</td>
        </tr>
        <tr style="border: 1px solid black;">
            <td style="border: 1px solid black;">1</td>
            <td style="border: 1px solid black;">2</td>
            <td style="border: 1px solid black;">3</td>
            <td style="border: 1px solid black;">4</td>
            <td style="border: 1px solid black;">5</td>
            <td style="border: 1px solid black;">6</td>
            <td style="border: 1px solid black;">7</td>
            <td style="border: 1px solid black;">8</td>
            <td style="border: 1px solid black;">9</td>
            <td style="border: 1px solid black;">10</td>
        </tr>
        </thead>
        <tbody id="Process">
                {{#generatorRows}}T1{{{}}}{{/generatorRows}}
        </tbody>
</table>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; font-size: 12px; border-collapse: collapse;" cellspacing="0" cellpadding="0" width="1050px">
    <tbody>
        <tr>
            <td>&nbsp;</td>
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
</html>
`
