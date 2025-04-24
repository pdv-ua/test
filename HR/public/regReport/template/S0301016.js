module.exports = `
<table style="table-layout: fixed; margin-left: 1rem; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="920px">
    <tbody>
        <tr>
            <td class="invisible" align="center">
                <h3 style="margin-top: 0.5em; margin-bottom: 0; font-size: 1.1em;"><b>Державне статистичне спостереження</b></h3>
            </td>
        </tr>
        <tr class="spacer">
            <td></td>
        </tr>
        <tr>
            <td class="with-border" align="center" style="font-size: 0.9em;"><b>Статистична конфіденційність забезпечується статтею 29 Закону України "Про офіційну статистику"</b></td>
        </tr>
        <tr class="spacer">
            <td></td>
        </tr>
        <tr>
            <td class="with-border" align="center" style="font-size: 0.9em;"><b>Порушення порядку подання або використання даних державних статистичних спостережень тягне за собою <br clear="none"> відповідальність, яка встановлена статтею 186<sup>3</sup> Кодексу України про адміністративні правопорушення</b></td>
        </tr>
        <tr class="spacer">
            <td></td>
        </tr>
    </tbody>
</table>

<table style="table-layout: fixed; margin-left: 1rem; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="920px">
    <colgroup>
        <col style="width: 30%;">
        <col style="width: 25px;">
        <col style="width: 40%;">
        <col style="width: 25px;">
        <col>
    </colgroup>
    <tbody>
        <tr>
            <td class="with-border" rowspan="2" style="height: 10rem;">
                <div class="td_box_content">
                    <div class="top-content" style="padding: 0.5em;">
                        <span><b>Подають:</b></span>
                        <span>юридичні особи, відокремлені<br/>підрозділи юридичних осіб<br clear="none"></span>
                    </div>
                    <div class="bottom-content" style="padding: 0.5em;">
                        <span> – територіальному органу Держстату</span>
                    </div>
                </div>
            </td>
            <td rowspan="3" style="border-top: none; border-bottom: none;"></td>

            <td class="with-border" align="center" rowspan="3" style="padding-top: 8pt; vertical-align: middle;">
                <h2 style="text-transform: uppercase;">Звіт із праці</h2>
                <span style="font-size: 1.2em;"><b>у <span class="underline" align="center" style="margin-left: 0.3em; margin-right: 0.3em; display: inline-block; width: 10em;"> {{#textInput}}DECLAR.DECLARBODY.PERIOD####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}</span> 20<span class="underline" align="center" style="margin-left: 0; margin-right: 0.3em; display: inline-block; width: 2em;">{{#textInput}}DECLAR.DECLARBODY.PERIOD_YEAR_2SYMBOLS####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}</span> p.</b></span>
                <span align="center" style="font-size: 1em; display: block; margin-right: 4.5em;"><i>(назва звітного місяця)</i></span>
            </td>
            <td rowspan="3" style="border-top: none; border-bottom: none;"></td>

            <td class="with-border">
                <div style="padding: 0.5em; font-size: 0.9em;">
                    <span>Безкоштовний сервіс для<br/>
                    електронного звітування<br/>
                    "Кабінет респондента"<br/>
                    за посиланням:<br/>
                    https://statzvit.ukrstat.gov.ua</span>
                </div>
            </td>
        </tr>
        <tr>
            <td class="with-border" align="center" rowspan="2" valign="middle">
                <div style="padding: 1em; vertical-align: middle;">
                    <span>№ 1-ПВ<br/>
                    (місячна)<br/>
                    ЗАТВЕРДЖЕНО<br/>
                    Наказ Держстату<br/>
                    <span style="font-size: 0.9em;">15 квітня 2024 р. № 117</span></span>
                </div>
            </td>
        </tr>
        <tr>
            <td class="with-border" style="height: 4rem;">
                <div style="padding: 0.5em; margin-bottom: 0.5em;">
                    <span><b>Термін подання:</b><br/>
                    не пізніше 7-го числа місяця,<br>
                    наступного за звітним періодом</span>
                </div>
            </td>
        </tr>
    </tbody>
</table>

<div class="space-gap"></div>

<table class="table-with-border" style="table-layout: fixed; margin-left: 1rem; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="920px">
    <colgroup>
        <col style="width: 30%;">
        <col style="width: 25px;">
        <col>
        <col style="width: 25px;">
        <col style="width: 25px;">
        <col style="width: 25px;">
        <col>
        <col style="width: 25px;">
        <col style="width: 25px;">
    </colgroup>
    <tbody>
        <tr>
            <td align="left" colspan="9" style="padding-left: 0.5em; padding-top: 0.4em;"><span><b>Ідентифікаційні дані респондента</b></span></td>
        </tr>
        <tr>
            <td align="left" style="padding-left: 0.5em; padding-top: 0.4em;">Ідентифікаційний код ЄДРПОУ</td>
            <td></td>
            <td align="center">
                {{#textInputTable8}}DECLAR.DECLARBODY.FIRM_EDRPOU####{"style": "font-weight: bold;"}{{{}}}{{/textInputTable8}}
            </td>
        </tr>
        <tr>
            <td colspan="9" style="padding-left: 0.5em; padding-top: 0.4em; padding-bottom: 0.3em; width: 100%;">
                <div style="width: 100%; display: flex;">
                    <span><b>Найменування</b></span>
                    <span class="underline" style="margin-left: 2em; margin-right: 2em; display: inline-block; min-width: 40em; text-align: center; flex: 1;">
                        <span>{{#textInput}}DECLAR.DECLARBODY.FIRM_NAME####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}</span>
                    </span>
                </div>
            </td>
        </tr>
        <tr class="spacer">
            <td></td>
        </tr>

        <tr>
            <td>&nbsp;&nbsp;</td>
            <td rowspan="21" style="border-left: 1px solid black; border-top: 1px solid black; border-bottom: 1px solid black;">&nbsp;</td>
            <td nowrap="nowrap" style="border-top: 1px solid black; text-align: center; vertical-align: middle; font-size: 0.9em;"><b>Місцезнаходження<br/>(юридична адреса)</b></td>
            <td rowspan="21" style="border-right: 1px solid black; border-top: 1px solid black; border-bottom: 1px solid black;">&nbsp;</td>
            <td rowspan="21">&nbsp;</td>
            <td rowspan="21" style="border-left: 1px solid black; border-top: 1px solid black; border-bottom: 1px solid black;">&nbsp;</td>
            <td nowrap="nowrap" style="border-top: 1px solid black; text-align: center; vertical-align: middle; font-size: 0.9em;"><b>Адреса здійснення діяльності,<br/>щодо якої подається форма<br/>звітності (фактична адреса)</b></td>
            <td rowspan="21" style="border-right: 1px solid black; border-top: 1px solid black; border-bottom: 1px solid black;">&nbsp;</td>
            <td rowspan="21">&nbsp;</td>
        </tr>
        <tr>
            <td style="padding-left: 0.5em;">Поштовий індекс</td>
            <td class="address-cell" style="border: 1px solid black;">{{#textInput}}DECLAR.DECLARBODY.ADDR_J_POST_INDEX####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}</td>
            <td class="address-cell" style="border: 1px solid black;">{{#textInput}}DECLAR.DECLARBODY.ADDR_F_POST_INDEX####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}</td>
        </tr>
        <tr class="spacer-min">
            <td></td>
        </tr>
        <tr>
            <td style="padding-left: 0.5em;">Назва області/АР Крим</td>
            <td class="address-cell" style="border: 1px solid black;">{{#textInput}}DECLAR.DECLARBODY.ADDR_J_REGION####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}</td>
            <td class="address-cell" style="border: 1px solid black;">{{#textInput}}DECLAR.DECLARBODY.ADDR_F_REGION####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}</td>
        </tr>
        <tr class="spacer-min">
            <td></td>
        </tr>
        <tr>
            <td style="padding-left: 0.5em;">Назва району</td>
            <td class="address-cell" style="border: 1px solid black;">{{#textInput}}DECLAR.DECLARBODY.ADDR_J_DISTRICT####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}</td>
            <td class="address-cell" style="border: 1px solid black;">{{#textInput}}DECLAR.DECLARBODY.ADDR_F_DISTRICT####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}</td>
        </tr>
        <tr class="spacer-min">
            <td></td>
        </tr>
        <tr>
            <td style="padding-left: 0.5em;">Назва територіальної громади</td>
            <td class="address-cell" style="border: 1px solid black;">{{#textInput}}DECLAR.DECLARBODY.ADDR_J_TER_GROM####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}</td>
            <td class="address-cell" style="border: 1px solid black;">{{#textInput}}DECLAR.DECLARBODY.ADDR_F_TER_GROM####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}</td>
        </tr>
        <tr class="spacer-min">
            <td></td>
        </tr>
        <tr>
            <td style="padding-left: 0.5em;">Назва населеного пункту</td>
            <td class="address-cell" style="border: 1px solid black;">{{#textInput}}DECLAR.DECLARBODY.ADDR_J_CITY####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}</td>
            <td class="address-cell" style="border: 1px solid black;">{{#textInput}}DECLAR.DECLARBODY.ADDR_F_CITY####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}</td>
        </tr>
        <tr class="spacer-min">
            <td></td>
        </tr>
        <tr>
            <td style="padding-left: 0.5em;">Назва району у місті</td>
            <td class="address-cell" style="border: 1px solid black;">{{#textInput}}DECLAR.DECLARBODY.ADDR_J_CITY_DISTRICT####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}</td>
            <td class="address-cell" style="border: 1px solid black;">{{#textInput}}DECLAR.DECLARBODY.ADDR_F_CITY_DISTRICT####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}</td>
        </tr>
        <tr class="spacer-min">
            <td></td>
        </tr>
        <tr>
            <td style="padding-left: 0.5em;">Назва вулиці/провулку, площі тощо</td>
            <td class="address-cell" style="border: 1px solid black;">{{#textInput}}DECLAR.DECLARBODY.ADDR_J_STEET####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}</td>
            <td class="address-cell" style="border: 1px solid black;">{{#textInput}}DECLAR.DECLARBODY.ADDR_F_STEET####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}</td>
        </tr>
        <tr class="spacer-min">
            <td></td>
        </tr>
        <tr>
            <td style="padding-left: 0.5em;">№ будинку</td>
            <td class="address-cell" style="border: 1px solid black;">{{#textInput}}DECLAR.DECLARBODY.ADDR_J_HOUSE####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}</td>
            <td class="address-cell" style="border: 1px solid black;">{{#textInput}}DECLAR.DECLARBODY.ADDR_F_HOUSE####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}</td>
        </tr>
        <tr class="spacer-min">
            <td></td>
        </tr>
        <tr>
            <td style="padding-left: 0.5em;">№ корпусу</td>
            <td class="address-cell" style="border: 1px solid black;">{{#textInput}}DECLAR.DECLARBODY.ADDR_J_SECTION####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}</td>
            <td class="address-cell" style="border: 1px solid black;">{{#textInput}}DECLAR.DECLARBODY.ADDR_F_SECTION####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}</td>
        </tr>
        <tr class="spacer-min">
            <td></td>
        </tr>
        <tr>
            <td style="padding-left: 0.5em;">№ квартири/офісу</td>
            <td class="address-cell" style="border: 1px solid black;">{{#textInput}}DECLAR.DECLARBODY.ADDR_J_APARTMENT####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}</td>
            <td class="address-cell" style="border: 1px solid black;">{{#textInput}}DECLAR.DECLARBODY.ADDR_F_APARTMENT####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}</td>
        </tr>
        <tr class="spacer-min">
            <td></td>
            <td style="border-bottom: 1px solid black;"></td>
            <td style="border-bottom: 1px solid black;"></td>
        </tr>
        <tr class="spacer">
            <td></td>
        </tr>
    </tbody>
</table>

<table style="table-layout: fixed; margin-left: 1rem; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="920px">
    <tbody>
        <tr>
            <td nowrap="nowrap" width="100%" style="padding-top: 0.5em;">
                <span style="margin-left: 0.5rem; font-size: 0.9em;">Код території відповідно до Кодифікатора адміністративно-територіальних одиниць та територій</span><br/>
                <span style="margin-left: 0.5rem; font-size: 0.9em;">територіальних громад (КАТОТТГ) за адресою здійснення діяльності, щодо якої подається форма звітності</span>
            </td>
        </tr>
        <tr>
            <td>
                <div style="margin-left: 0.5em; margin-top: 0.3em; margin-bottom: 0.3em; display: flex;">
                    {{#textInputTable19}}DECLAR.DECLARBODY.TER_STRUK####{"style": "font-weight: bold;"}{{{}}}{{/textInputTable19}}
                </div>
            </td>
        </tr>
        <tr>
            <td align="left" style="font-size:0.8em;">
                <span style="margin-left: 0.5rem;">(код території визначається автоматично)</span>
            </td>
        </tr>
    </tbody>
</table>

<br clear="none">

<table style="table-layout: fixed; margin-left: 1rem; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="920px">
    <colgroup>
        <col style="width: 100%;">
    </colgroup>
    <tbody>
        <tr>
            <td>
                <span style="padding-left: 1em; padding-right: 1em; display: inline-block; margin-top: 0.3em; margin-bottom: 1em; vertical-align: top;"><b>Номер структурного підрозділу&nbsp;</b></span>
                <span style="display: inline-block; vertical-align: top; position: relative;">
                    <div>
                        {{#textInputTable4}}DECLAR.DECLARBODY.NOMER####{"style": "font-weight: bold;"}{{{}}}{{/textInputTable4}}
                    </div>
                </span>
            </td>
        </tr>
        <tr>
            <td style="width: 100%; display: flex;">
                <span style="padding-left: 1em; margin-bottom: 1em;">Найменування структурного підрозділу</span>
                <span class="underline" align="center" style="flex: 1; margin-left: 1em; margin-right: 1em;">
                    <span>{{#textInput}}DECLAR.DECLARBODY.N_1####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}</span>
                </span>
            </td>
        </tr>
        <tr>
            <td style="width: 100%; display: flex;">
                <span style="padding-left: 1em; margin-bottom: 1em;">Вид економічної діяльності структурного підрозділу</span>
                <span class="underline" align="center" style="flex: 1; margin-left: 1em; margin-right: 1em;">
                    <span>{{#textInput}}DECLAR.DECLARBODY.N_2####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}</span>
                </span>
            </td>
        </tr>
        <tr>
            <td style="text-align: left">
                <span style="padding-left: 1em; padding-right: 1em; display: inline-block; vertical-align: top;">Код виду економічної діяльності за КВЕД структурного підрозділу</span>
                <span style="display: inline-block; vertical-align: top; position: relative; margin-top: -0.3em;">
                    <div>
                        {{#textInputTable5}}DECLAR.DECLARBODY.KVED####{"style": "font-weight: bold;"}{{{}}}{{/textInputTable5}}
                    </div>
                </span>
            </td>
        </tr>
        <tr>
            <td align="center" colspan="3" style="font-size:0.75em; margin-top: 0.5em; padding-bottom: 0.8em; padding-left: 10em;">(код виду економічної діяльності визначається автоматично)</td>
        </tr>
    </tbody>
</table>

<table class="table-with-border" style="table-layout: fixed; margin-left: 1rem; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="920px">
    <colgroup>
        <col style="width: 80%;">
        <col>
    </colgroup>
    <tbody>
        <tr>
            <td align="left" style="padding: 0.5em;"><b>Інформація щодо відсутності даних</b></td>
        </tr>
        <tr>
            <td style="padding: 0.5em;">У випадку відсутності даних необхідно поставити у прямокутнику позначку – <b>V</b></td>
            <td class="bool-box bool-box-top" align="center">
                {{#booleanInput}}DECLAR.DECLARBODY.ZERO_ZVI####{"printType":"box", "style":"width: 3em; left: 0.6em;", "cleanAbsent": ["DECLAR.DECLARBODY.REASON1","DECLAR.DECLARBODY.REASON2","DECLAR.DECLARBODY.REASON3","DECLAR.DECLARBODY.REASON4","DECLAR.DECLARBODY.REASON5","DECLAR.DECLARBODY.REASON6"]}{{{}}}{{/booleanInput}}
            </td>
        </tr>
        <tr>
            <td style="padding: 0.5em;">Зазначте одну з наведених нижче причин відсутності даних:</td>
        </tr>
        <tr>
            <td style="font-size: 0.9em; padding-left: 1.6em; padding-top: 0.3em; padding-bottom: 0;">Одиниця припинена або перебуває в стадії припинення</td>
            <td class="bool-box" align="center" style="padding: 0; margin: 0;">
                {{#booleanInput}}DECLAR.DECLARBODY.REASON2####{"printType":"box", "style":"height: 1.6em;", "checkParent": "DECLAR.DECLARBODY.ZERO_ZVI", "linkedPath": ["DECLAR.DECLARBODY.REASON1","DECLAR.DECLARBODY.REASON3","DECLAR.DECLARBODY.REASON4","DECLAR.DECLARBODY.REASON5","DECLAR.DECLARBODY.REASON6"]}{{{}}}{{/booleanInput}}
            </td>
        </tr>
        <tr class="spacer-min">
            <td></td>
        </tr>
        <tr>
            <td style="font-size: 0.9em; padding-left: 1.6em; padding-top: 0.3em; padding-bottom: 0;">Здійснюється сезонна діяльність або економічна діяльність, пов'язана з тривалим циклом виробництва</td>
            <td class="bool-box" align="center" style="padding: 0; margin: 0;">
                {{#booleanInput}}DECLAR.DECLARBODY.REASON3####{"printType":"box", "style":"height: 1.6em;", "checkParent": "DECLAR.DECLARBODY.ZERO_ZVI", "linkedPath": ["DECLAR.DECLARBODY.REASON1","DECLAR.DECLARBODY.REASON2","DECLAR.DECLARBODY.REASON4","DECLAR.DECLARBODY.REASON5","DECLAR.DECLARBODY.REASON6"]}{{{}}}{{/booleanInput}}
            </td>
        </tr>
        <tr class="spacer-min">
            <td></td>
        </tr>
        <tr>
            <td style="font-size: 0.9em; padding-left: 1.6em; padding-top: 0.3em; padding-bottom: 0;">Тимчасово призупинено економічну діяльність через економічні чинники/карантинні обмеження</td>
            <td class="bool-box" align="center" style="padding: 0; margin: 0;">
                {{#booleanInput}}DECLAR.DECLARBODY.REASON4####{"printType":"box", "style":"height: 1.6em;", "checkParent": "DECLAR.DECLARBODY.ZERO_ZVI", "linkedPath": ["DECLAR.DECLARBODY.REASON1","DECLAR.DECLARBODY.REASON2","DECLAR.DECLARBODY.REASON3","DECLAR.DECLARBODY.REASON5","DECLAR.DECLARBODY.REASON6"]}{{{}}}{{/booleanInput}}
            </td>
        </tr>
        <tr class="spacer-min">
            <td></td>
        </tr>
        <tr>
            <td style="font-size: 0.9em; padding-left: 1.6em; padding-top: 0.3em; padding-bottom: 0;">Проведено чи проводиться реорганізація або передано виробничі фактори іншій одиниці</td>
            <td class="bool-box" align="center" style="padding: 0; margin: 0;">
                {{#booleanInput}}DECLAR.DECLARBODY.REASON5####{"printType":"box", "style":"height: 1.6em;", "checkParent": "DECLAR.DECLARBODY.ZERO_ZVI", "linkedPath": ["DECLAR.DECLARBODY.REASON1","DECLAR.DECLARBODY.REASON2","DECLAR.DECLARBODY.REASON3","DECLAR.DECLARBODY.REASON4","DECLAR.DECLARBODY.REASON6"]}{{{}}}{{/booleanInput}}
            </td>
        </tr>
        <tr class="spacer-min">
            <td></td>
        </tr>
        <tr>
            <td style="font-size: 0.9em; padding-left: 1.6em; padding-top: 0.3em; padding-bottom: 0;">Відсутнє явище, яке спостерігається</td>
            <td class="bool-box" align="center" style="padding: 0; margin: 0;">
                {{#booleanInput}}DECLAR.DECLARBODY.REASON6####{"printType":"box", "style":"height: 1.6em;", "checkParent": "DECLAR.DECLARBODY.ZERO_ZVI", "linkedPath": ["DECLAR.DECLARBODY.REASON1","DECLAR.DECLARBODY.REASON2","DECLAR.DECLARBODY.REASON3","DECLAR.DECLARBODY.REASON4","DECLAR.DECLARBODY.REASON5"]}{{{}}}{{/booleanInput}}
            </td>
        </tr>
        <tr class="spacer-min">
            <td></td>
        </tr>
    </tbody>
</table>

<br clear="none">

<h3 style="margin-top: 2.5rem; margin-bottom: 0.3rem; margin-left: 1.6em; font-size: 1.4rem;"><b>I. Кількість працівників, робочий час і фонд оплати праці</b></h3>
<table class="table-with-border border-cell" style="font-size: 1.2rem; table-layout: fixed; margin-left: 1rem; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="920px">
    <colgroup>
        <col style="width: 70%;">
        <col style="width: 13%;">
        <col>
    </colgroup>
    <tbody>
        <tr>
            <td align="center">Назва показників</td>
            <td align="center">Код <br clear="none">рядка</td>
            <td align="center">За звітний <br clear="none">місяць</td>
        </tr>
        <tr>
            <td align="center">А</td>
            <td align="center">Б</td>
            <td align="center">1</td>
        </tr>
        <tr>
            <td align="left">Фонд оплати праці ycix працівників, тис.грн. <i>(з одним десятковим знаком)</i></td>
            <td align="center">1020</td>
            <td align="center">{{#float1Input}}DECLAR.DECLARBODY.A1020####{"detailData":"A1020"}{{{}}}{{/float1Input}}</td>
        </tr>
        <tr>
            <td align="left">Сума податку з доходів фізичних осіб, що відрахована з фонду оплати праці усіх працівників (крім тимчасової непрацездатності), тис.грн <i>(з одним десятковим знаком)</i></td>
            <td align="center">1030</td>
            <td align="center">{{#float1Input}}DECLAR.DECLARBODY.A1030####{"detailData":"A1030"}{{{}}}{{/float1Input}}</td>
        </tr>
        <tr>
            <td align="left">Середньооблікова кількість штатних працівників, осіб <i>(у цілих числах)</i></td>
            <td align="center">1040</td>
            <td align="center">{{#intInput}}DECLAR.DECLARBODY.A1040####{"detailData":"A1040"}{{{}}}{{/intInput}}</td>
        </tr>
        <tr>
            <td align="left">Кількість відпрацьованого робочого часу штатними працівниками, люд.год <i>(у цілих числах)</i></td>
            <td align="center">1060</td>
            <td align="center">{{#intInput}}DECLAR.DECLARBODY.A1060####{"detailData":"A1060"}{{{}}}{{/intInput}}</td>
        </tr>
        <tr>
            <td align="left">Фонд оплати праці штатних працівників, тис.грн <i>(з одним десятковим знаком)</i> <br/><i>(із ряд.1020)</i></td>
            <td align="center">1070</td>
            <td align="center">{{#float1Input}}DECLAR.DECLARBODY.A1070####{"detailData":"A1070"}{{{}}}{{/float1Input}}</td>
        </tr>
    </tbody>
</table>

<h3 style="margin-top: 1.3em; margin-bottom: 0.8em; margin-left: 1.6em; font-size: 1.2rem;"><b>Пояснення до розділу І</b></h3>
<table class="table-with-border border-cell" style="font-size: 1.1rem; table-layout: fixed; margin-left: 1rem; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="920px">
    <colgroup>
        <col style="width: 45%;">
        <col>
    </colgroup>
    <tbody>
        <tr>
            <td align="center">Назва показників</td>
            <td align="center">Основна причина відхилення</td>
        </tr>
        <tr>
            <td>Середньооблікова кількість штатних працівників <br/>(ряд.1040) + ; – 25% і більше порівняно з попереднім <br/>періодом</td>
            <td align="left" nowrap="nowrap">
                <div style="width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; font-size: 0.9em;">
                    <span style="display: block; text-align: center; border-bottom: 1px solid black; line-height: 1.5em; height: 1lh;">{{#textInput}}DECLAR.DECLARBODY.N1####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}</span>
                    <span style="display: block; text-align: center; border-bottom: 1px solid black; line-height: 1.5em; height: 1lh;"></span>
                    <span style="display: block; text-align: center; line-height: 1.5em; height: 1lh;"></span>
                </div>
            </td>
        </tr>
        <tr>
            <td>Середня заробітна плата штатного працівника <br/>(ряд.1070 / ряд.1040 × 1000) + ; – 10% і більше <br/>порівняно з попереднім періодом</td>
            <td align="left" nowrap="nowrap">
                <div style="width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; font-size: 0.9em;">
                    <span style="display: block; text-align: center; border-bottom: 1px solid black; line-height: 1.5em; height: 1lh;">{{#textInput}}DECLAR.DECLARBODY.N2####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}</span>
                    <span style="display: block; text-align: center; border-bottom: 1px solid black; line-height: 1.5em; height: 1lh;"></span>
                    <span style="display: block; text-align: center; line-height: 1.5em; height: 1lh;"></span>
                </div>
            </td>
        </tr>
    </tbody>
</table>

<div style="margin-top: 4em;"></div>

<table style="font-size: 1em; table-layout: fixed; margin-left: 1rem; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="920px">
    <colgroup>
        <col style="width: 44%;">
        <col style="width: 12%;">
        <col style="width: 44%;">
    </colgroup>
    <tbody>
        <tr>
            <td class="td_unln">&nbsp;</td>
            <td>&nbsp;</td>
            <td align="center" class="td_unln">{{#textInput}}DECLAR.DECLARBODY.RUK####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}</td>
        </tr>
        <tr>
            <td style="border-top: 1px solid black; padding-top: 0.2em;" align="left">Місце підпису керівника (власника) або особи,<br clear="none">відповідальної за достовірність наданої інформації</td>
            <td>&nbsp;</td>
            <td style="border-top: 1px solid black; padding-top: 0.2em;" align="center">(Власне ім’я ПРІЗВИЩЕ)</td>
        </tr>
    </tbody>
</table>

<div style="margin-top: 1.6em;"></div>

<table style="table-layout: fixed; margin-left: 1rem; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="920px">
    <colgroup>
        <col style="width: 44%;">
        <col style="width: 12%;">
        <col style="width: 44%;">
    </colgroup>
    <tbody>
        <tr>
            <td align="left" nowrap="nowrap" style="display: flex;">
                <span style="margin-bottom: 1.2em;">телефон:</span>
                <span class="underline" align="center" style="flex: 1; margin-left: 0.3em; margin-right: 0.3em;">
                    <span>{{#textInput}}DECLAR.DECLARBODY.VIK_TEL####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}</span>
                </span>
            </td>
            <td>&nbsp;</td>
            <td align="left" nowrap="nowrap" style="display: flex;">
                <span style="margin-bottom: 1.2em;">електронна пошта:</span>
                <span class="underline" align="center" style="flex: 1; margin-left: 0.3em; margin-right: 0.3em;">
                    <span>{{#textInput}}DECLAR.DECLARBODY.VIK_EMAIL####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}</span>
                </span>
            </td>
        </tr>
    </tbody>
</table>




<style>
    .box {
        width: 15px;
        height: 15px;
        border: 1px solid black;
        border-radius: 3px;
    }
    td {
        // height: 50px; /* висота рядка */
        // text-align: center;
        // vertical-align: middle;
        vertical-align: top;
        font-size: 16px;
        word-wrap: break-word; /* Працює для багаторядкових текстів */
        white-space: normal; /* Дозволити перенесення */
    }
    .invisible {
        border: none;
    }
    .table-with-border {
        border: 1px solid black;
    }
    .with-border {
        border: 1px solid black;
    }
    .border-cell td {
        border: 1px solid black;
        padding: 0.2em 0.5em 0.2em 0.5em;
        vertical-align: middle;
    }
    .spacer {
        height: 0.5rem;
    }
    .spacer-min {
        height: 0.2rem;
    }

    .input-grid {
      border-collapse: collapse;
    }
    .input-grid td {
      width: 1.5em;
      height: 1.5em;
      border: 1px solid black;
      text-align: center;
    }
    .td_box_content {
        display: flex;
        flex-direction: column;
        justify-content: space-between; /* Верхня група прилипне вверх, нижня вниз */
        height: 100%; /* Займає всю висоту чарунки */
    }
    .top-content {
        display: flex;
        flex-direction: column;
        gap: 2px; /* відступи між елементами */
    }
    .bottom-content {
        margin-top: auto;
    }
    .space-gap {
        height: 1rem;
    }
    .underline {
        border-bottom: 1px solid black;
        height: 100%;
        min-height: 1em;
    }
    .td_box {
        width: 1.2em;
        height: 1.2em;
        display: inline-block;
        border: 1px solid black;
        text-align: center;
        // font-size: 18px;
        line-height: 20px;
        font-weight: bold;
        user-select: none;
    }
    .td_box[data-checked="true"]::before {
        content: "✓";
        color: black;
    }
    h3 {
        font-weight: normal;
    }
    .address-cell {
        padding-left: 0.3em;
        padding-right: 0.3em;
    }
    .bool-box input[type="checkbox"] {
        appearance: none; /* Прибирає стандартний вигляд */
        -webkit-appearance: none;
        -moz-appearance: none;
        width: 1.8em;
        // height: 2.3em;
        border: 1px solid black;
        display: inline-block;
        position: relative;
        cursor: pointer;
    }
    .bool-box input[type="checkbox"]:checked::after {
        // content: "✔";
        content: "V";
        font-size: 1.5em;
        position: absolute;
        top: -0.1em;
        left: 0.2em;
    }
    .bool-box-top input[type="checkbox"]:checked::after {
        left: 0.6em;
    }
    span.boolean-print-value {
        display: none;
    }

    .input-table {
        border-collapse: collapse;
        // border-spacing: 0;
    }
    .input-table td {
        width: 1.3rem;
        height: 1.7rem;
        border: 1px solid black;
        text-align: center;
        // vertical-align: middle;
    }
    .input-table input {
        width: 100%;
        height: 100%;
        border: none;
        text-align: center;
        font-size: 1em;
    }
    .input-table input:focus {
        outline: none;
        // border-bottom: 1px solid black;
    }
    .input-table .narrow-no-border {
        // border-top: none !important;
        // border-bottom: none !important;
        border-top: 1px solid white;
        border-bottom: 1px solid white;
        width: 0.2rem;
        padding-top: 0.4rem;
    }
</style>

`
