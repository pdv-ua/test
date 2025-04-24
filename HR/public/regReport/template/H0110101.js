module.exports = `
<table style="table-layout: auto; margin-left: 15px; font-family: TimesNewRoman; font-size: 12px; border-collapse: collapse;" cellspacing="0" cellpadding="0" width="1050px">
    <tbody>
        <tr>
            <td style="text-align: right;">Додаток</td>
        </tr>
        <tr>
            <td style="text-align: right;">до форми N 10-ПОІ (річна)</td>
        </tr>
        <tr>
            <td style="text-align: right;">"Звіт про зайнятість і працевлаштування осіб з інвалідністю"</td>
        </tr>
    </tbody>
</table>
<table style="text-align: center; table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; font-size: 13.5px; border-collapse: collapse;" cellspacing="0" cellpadding="0" width="1050px">
    <tbody>
        <tr>
            <td  width="100%">&nbsp;</td>
        </tr>
        <tr>
            <td style="font-weight: bold">ПЕРЕЛІК</td>
        </tr>
        <tr>
            <td style="font-weight: bold">підприємств, що увійшли до складу господарського об'єднання, та/або відокремлених підрозділів роботодавця</td>
        </tr>
        <tr>
            <td style="font-style: italic; font-size: 12px; width: 30%;">(надається роботодавцями, зазначеними в п. 1 Інструкції щодо заповнення форми звітності N 10-ПОІ (річна)<br/>
                "Звіт про зайнятість і працевлаштування осіб з інвалідністю")</th>
        </tr>
        <tr>
            <td>&nbsp;</td>
        </tr>
    </tbody>
</table>
</table>
<table id="table" style="table-layout: auto; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse; border: 1px solid black;" border="1" cellspacing="0" cellpadding="0px" bordercolor="black" width="1050px">
      <thead>
       <tr>
            <td align="center" width="2%" class="no-print">&nbsp;</td>
            <td align="center" width="3%">N з/п</td>
            <td align="center" width="15%">Повна назва підприємств, що увійшли до складу господарського об'єднання, відокремлених підрозділів</td>
            <td align="center" width="20%">Місцезнаходження, телефон підприємств, що увійшли до складу господарського об'єднання, відокремлених підрозділів</td>
            <td align="center" width="10%">Ідентифікаційні коди (за ЄДРПОУ) підприємств, що увійшли до складу господарського об'єднання, відокремлених підрозділів</td>
            <td align="center" width="10%">Середньооблікова кількість штатних працівників облікового складу підприємств, що увійшли до складу господарського об'єднання, осіб</td>
            <td align="center" width="10%">Середньооблікова кількість штатних працівників, яким відповідно до чинного законодавства встановлено інвалідність, підприємств, що увійшли до складу господарського об'єднання, осіб</td>
            <td align="center" width="10%">Кількість робочих місць для працевлаштування осіб з інвалідністю зарахована до нормативу таких робочих місць для підприємств, що увійшли до складу господарського об'єднання</td>
            <td align="center" width="20%">Адреса відділення Фонду соціального захисту інвалідів за місцезнаходженням підприємств, що увійшли до складу господарського об'єднання, відокремлених підрозділів</td>
        </tr>
        <tr>
            <td class="no-print">&nbsp;</td>
            <td align="center">1</td>
            <td align="center">2</td>
            <td align="center">3</td>
            <td align="center">4</td>
            <td align="center">5</td>
            <td align="center">6</td>
            <td align="center">7</td>
            <td align="center">8</td>
        </tr>
        </thead>
            <tbody id="Process">
                {{#generatorRows}}T1{{{mode: "crd"}}}{{/generatorRows}}
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
`
