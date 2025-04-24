module.exports = `
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; font-size: 12px; border-collapse: collapse;" cellspacing="0" cellpadding="0" width="1050px">
    <tbody>
        <tr>
            <td width="55%">&nbsp;</td>
            <td>ЗАТВЕРДЖЕНО</td>
        </tr>
        <tr>
            <td width="55%">&nbsp;</td>
            <td>Наказ Міністерства соціальної політики України</td>
        </tr>
        <tr>
            <td width="55%">&nbsp;</td>
            <td>22 червня 2018 року № 928</td>
        </tr>
    </tbody>
</table>
<table style="text-align: center; table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; font-size: 13.5px; border-collapse: collapse;" cellspacing="0" cellpadding="0" width="1050px">
    <tbody>
        <tr>
            <td  width="100%">&nbsp;</td>
        </tr>
        <tr>
            <td style="font-weight: bold">Розрахунок видатків, пов'язаних із виплатою компенсацій та допомоги і наданням пільг, відповідно до Закону</td>
        </tr>
        <tr>
            <td style="font-weight: bold">України "Про статус і соціальний захист громадян, які постраждали внаслідок Чорнобильської катастрофи"</td>
        </tr>
        <tr>
            <td style="font-weight: bold">(форма № 3)</th>
        </tr>
    </tbody>
</table>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; font-size: 12px; border-collapse: collapse;" cellspacing="0" cellpadding="0" width="1050px">
    <tbody>
        <tr>
            <td width="35%">&nbsp;</td>
            <td width="40%" align="center">
                {{#textInput}}DECLAR.DECLARBODY.HEDRPLOU####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
            </td>
            <td width="8%" style="text-align: right;">Станом на </td>
            <td width="17%" align="center">
                {{#textInput}}DECLAR.DECLARBODY.HDATE####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
            </td>
        </tr>
        <tr>
            <td>&nbsp;</td>
            <td style="padding-left: 60px; font-size: 10px;">(назва підприємства, код за ЄДРПОУ)</td>
            <td style="text-align: right;padding-right: 55px; font-size: 10px;">&nbsp;</td>
        </tr>
        <tr>
            <td>&nbsp;</td>
        </tr>
    </tbody>
</table>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; font-size: 12px; border-collapse: collapse;" cellspacing="0" cellpadding="0" width="1050px">
    <tbody>   
        <tr>
            <td rowspan="2" colspan="1" width="300px" style="border: 1px solid #000; text-align: center; padding: 2px;">Напрями використання коштів</td>
            <td rowspan="1" colspan="2" style="border: 1px solid #000; text-align: center; padding: 2px;">Кількість осіб, які отримують виплати</td>
            <td rowspan="1" colspan="1" style="border: 1px solid #000; text-align: center; padding: 2px;">Середній розмір виплати</td>
            <td rowspan="1" colspan="2" style="border: 1px solid #000; text-align: center; padding: 2px;">Нараховано до виплати</td>
            <td rowspan="1" colspan="2" style="border: 1px solid #000; text-align: center; padding: 2px;">Сума зареєстрованої кредиторської заборгованості на звітну дату</td>
        </tr>
        <tr>
            <td rowspan="1" colspan="1" style="border: 1px solid #000; text-align: center; padding: 2px;">з початку року</td>
            <td rowspan="1" colspan="1" style="border: 1px solid #000; text-align: center; padding: 2px;">на звітну дату</td>
            <td rowspan="1" colspan="1" style="border: 1px solid #000; text-align: center; padding: 2px;">&nbsp;</td>
            <td rowspan="1" colspan="1" style="border: 1px solid #000; text-align: center; padding: 2px;">з початку року</td>
            <td rowspan="1" colspan="1" style="border: 1px solid #000; text-align: center; padding: 2px;">на звітну дату</td>
            <td rowspan="1" colspan="1" style="border: 1px solid #000; text-align: center; padding: 2px;">всього</td>
            <td rowspan="1" colspan="1" style="border: 1px solid #000; text-align: center; padding: 2px;">прострочена</td>
        </tr>
        <tr>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">1</td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">2</td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">3</td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">4</td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">5</td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">6</td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">7</td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">8</td>
        </tr>
        <tr>
            <td style="border: 1px solid #000; text-align: left; padding: 2px; font-weight: bold">
                Виплати підвищених стипендій, надання щорічної та додаткової відпусток, збереження заробітної плати у разі переведення на нижчеоплачувану роботу та у зв’язку з відселенням громадянам, які постраждали внаслідок Чорнобильської катастрофи
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F12{{{}}}{{/intInput}}
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F13{{{}}}{{/intInput}}
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F14{{{}}}{{/intInput}}
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F15{{{}}}{{/intInput}}
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F16{{{}}}{{/intInput}}
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F17{{{}}}{{/intInput}}
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F18{{{}}}{{/intInput}}
            </td>
        </tr>
        <tr>
            <td style="border: 1px solid #000; text-align: left; padding: 2px;">у тому чіслі</td>
            <td style="border: 1px solid #000; padding: 2px;">&nbsp;</td>
            <td style="border: 1px solid #000; padding: 2px;">&nbsp;</td>
            <td style="border: 1px solid #000; padding: 2px;">&nbsp;</td>
            <td style="border: 1px solid #000; padding: 2px;">&nbsp;</td>
            <td style="border: 1px solid #000; padding: 2px;">&nbsp;</td>
            <td style="border: 1px solid #000; padding: 2px;">&nbsp;</td>
            <td style="border: 1px solid #000; padding: 2px;">&nbsp;</td>
        </tr>
        <tr>
            <td style="border: 1px solid #000; text-align: left; padding: 2px;">
                отримання додаткової відпустки (14 робочих / 16 календарних днів на рік) - усього
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F121{{{}}}{{/intInput}}
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F131{{{}}}{{/intInput}}
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F141{{{}}}{{/intInput}}
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F151{{{}}}{{/intInput}}
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F161{{{}}}{{/intInput}}
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F171{{{}}}{{/intInput}}
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F181{{{}}}{{/intInput}}
            </td>
        </tr>
        <tr>
            <td style="border: 1px solid #000; text-align: left; padding: 2px;">з них :</td>
            <td style="border: 1px solid #000; padding: 2px;">&nbsp;</td>
            <td style="border: 1px solid #000; padding: 2px;">&nbsp;</td>
            <td style="border: 1px solid #000; padding: 2px;">&nbsp;</td>
            <td style="border: 1px solid #000; padding: 2px;">&nbsp;</td>
            <td style="border: 1px solid #000; padding: 2px;">&nbsp;</td>
            <td style="border: 1px solid #000; padding: 2px;">&nbsp;</td>
            <td style="border: 1px solid #000; padding: 2px;">&nbsp;</td>
        </tr>
        <tr>
            <td style="border: 1px solid #000; text-align: left; padding: 2px;">
                категорія  I (пункт 22 статті 20 Закону)
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F1211{{{}}}{{/intInput}}
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F1311{{{}}}{{/intInput}}
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F1411{{{}}}{{/intInput}}
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F1511{{{}}}{{/intInput}}
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F1611{{{}}}{{/intInput}}
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F1711{{{}}}{{/intInput}}
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F1811{{{}}}{{/intInput}}
            </td>
        </tr>
        <tr>
            <td style="border: 1px solid #000; text-align: left; padding: 2px;">
                категорія  II  (пункт 1статті 21 (22-20) Закону)
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F1212{{{}}}{{/intInput}}
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F1312{{{}}}{{/intInput}}
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F1412{{{}}}{{/intInput}}
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F1512{{{}}}{{/intInput}}
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F1612{{{}}}{{/intInput}}
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F1712{{{}}}{{/intInput}}
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F1812{{{}}}{{/intInput}}
            </td>
        </tr>
        <tr>
            <td style="border: 1px solid #000; text-align: left; padding: 2px;">
                одному із батьків дитини-інваліда або особи, яка їх замінює (пункт 3 частини третьої статті 30 Закону)
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F1213{{{}}}{{/intInput}}
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F1313{{{}}}{{/intInput}}
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F1413{{{}}}{{/intInput}}
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F1513{{{}}}{{/intInput}}
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F1613{{{}}}{{/intInput}}
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F1713{{{}}}{{/intInput}}
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F1813{{{}}}{{/intInput}}
            </td>
        </tr>
        <tr>
            <td style="border: 1px solid #000; text-align: left; padding: 2px; font-weight: bold">
                Компенсація за шкоду, заподіяну здоров’ю, та допомоги на оздоровлення, у разі звільнення з роботи громадян, які постраждали внаслідок Чорнобильської катастрофи
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F62{{{}}}{{/intInput}}
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F63{{{}}}{{/intInput}}
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F64{{{}}}{{/intInput}}
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F65{{{}}}{{/intInput}}
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F66{{{}}}{{/intInput}}
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F67{{{}}}{{/intInput}}
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F68{{{}}}{{/intInput}}
            </td>
        </tr>
        <tr>
            <td style="border: 1px solid #000; text-align: left; padding: 2px;">у тому чіслі</td>
            <td style="border: 1px solid #000; padding: 2px;">&nbsp;</td>
            <td style="border: 1px solid #000; padding: 2px;">&nbsp;</td>
            <td style="border: 1px solid #000; padding: 2px;">&nbsp;</td>
            <td style="border: 1px solid #000; padding: 2px;">&nbsp;</td>
            <td style="border: 1px solid #000; padding: 2px;">&nbsp;</td>
            <td style="border: 1px solid #000; padding: 2px;">&nbsp;</td>
            <td style="border: 1px solid #000; padding: 2px;">&nbsp;</td>
        </tr>
        <tr>
            <td style="border: 1px solid #000; text-align: left; padding: 2px;">
                Виплата у разі вивільнення працівників у зв’язку з ліквідацією, реорганізацією, перепрофілюванням підприємства, установи, організації, скорочення чисельності або штату працівників допомоги в розмірі трикратної середньомісячної заробітної плати або штату працівників, а також збереження за їх бажанням посадового окладу, тарифної ставки (окладу) на новому місці роботи відповідно до пункту 7 частини першої статті 20, пункту 1 частини першої статті 21, пункту 1 частини першої статті 22 Закону - усього
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F621{{{}}}{{/intInput}}
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F631{{{}}}{{/intInput}}
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F641{{{}}}{{/intInput}}
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F651{{{}}}{{/intInput}}
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F661{{{}}}{{/intInput}}
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F671{{{}}}{{/intInput}}
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F681{{{}}}{{/intInput}}
            </td>
        </tr>
        <tr>
            <td style="border: 1px solid #000; text-align: left; padding: 2px;">з них :</td>
            <td style="border: 1px solid #000;  padding: 2px;">&nbsp;</td>
            <td style="border: 1px solid #000;  padding: 2px;">&nbsp;</td>
            <td style="border: 1px solid #000;  padding: 2px;">&nbsp;</td>
            <td style="border: 1px solid #000;  padding: 2px;">&nbsp;</td>
            <td style="border: 1px solid #000;  padding: 2px;">&nbsp;</td>
            <td style="border: 1px solid #000;  padding: 2px;">&nbsp;</td>
            <td style="border: 1px solid #000;  padding: 2px;">&nbsp;</td>
        </tr>
        <tr>
            <td style="border: 1px solid #000; text-align: left; padding: 2px;">
                категорія I ( пункт 7статті 20 Закону)
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F6211{{{}}}{{/intInput}}
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F6311{{{}}}{{/intInput}}
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F6411{{{}}}{{/intInput}}
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F6511{{{}}}{{/intInput}}
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F6611{{{}}}{{/intInput}}
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F6711{{{}}}{{/intInput}}
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F6811{{{}}}{{/intInput}}
            </td>
        </tr>
        <tr>
            <td style="border: 1px solid #000; text-align: left; padding: 2px;">
                категорія II ( пункт 1 (7-20) статті 21 Закону)
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F6212{{{}}}{{/intInput}}
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F6312{{{}}}{{/intInput}}
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F6412{{{}}}{{/intInput}}
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F6512{{{}}}{{/intInput}}
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F6612{{{}}}{{/intInput}}
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F6712{{{}}}{{/intInput}}
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F6812{{{}}}{{/intInput}}
            </td>
        </tr>
        <tr>
            <td style="border: 1px solid #000; text-align: left; padding: 2px;">
                категорія III - для учасників ліквідації наслідків аварії на ЧАЕС  (пункт 1 (7-20) статті 22 Закону)
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F6213{{{}}}{{/intInput}}
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F6313{{{}}}{{/intInput}}
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F6413{{{}}}{{/intInput}}
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F6513{{{}}}{{/intInput}}
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F6613{{{}}}{{/intInput}}
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F6713{{{}}}{{/intInput}}
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F6813{{{}}}{{/intInput}}
            </td>
        </tr>
        <tr>
            <td style="border: 1px solid #000; text-align: left; padding: 2px; font-weight: bold">Всього</td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F2{{{}}}{{/intInput}}
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F3{{{}}}{{/intInput}}
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F4{{{}}}{{/intInput}}
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F5{{{}}}{{/intInput}}
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F6{{{}}}{{/intInput}}
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F7{{{}}}{{/intInput}}
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 2px;">
                {{#intInput}}DECLAR.DECLARBODY.F8{{{}}}{{/intInput}}
            </td>
        </tr>
        <tr>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
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
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; font-size: 12px; border-collapse: collapse;" cellspacing="0" cellpadding="0" width="1050px">
    <tbody>
        <tr>
            <td width="50px">&nbsp;</td>
            <td width="360px" align="center">
                {{#textInput}}DECLAR.DECLARBODY.PBOS####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
            </td>
            <td width="30px">&nbsp;</td>
            <td width="250px" align="center">
                {{#textInput}}DECLAR.DECLARBODY.HBOS####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
            </td>
            <td width="30px">&nbsp;</td>
            <td width="208px">&nbsp;</td>
        </tr>
        <tr>
            <td>&nbsp;</td>
            <td style="text-align: center; font-size: 10px; border-top: 1px solid black">(керівник підприємства)</td>
            <td>&nbsp;</td>
            <td style="text-align: center; font-size: 10px; border-top: 1px solid black">(П.І.Б.)</td>
            <td>&nbsp;</td>
            <td style="text-align: center; font-size: 10px; border-top: 1px solid black">(підпис)</td>
        </tr>
        <tr>
            <td>&nbsp;</td>
            <td align="center">
                {{#textInput}}DECLAR.DECLARBODY.PBUH####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
            </td>
            <td>&nbsp;</td>
            <td align="center">
                {{#textInput}}DECLAR.DECLARBODY.HBUH####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
            </td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
        </tr>
        <tr>
            <td>&nbsp;</td>
            <td style="text-align: center; font-size: 10px; border-top: 1px solid black">(головний бухгалтер підприємства)</td>
            <td>&nbsp;</td>
            <td style="text-align: center; font-size: 10px; border-top: 1px solid black">(П.І.Б.)</td>
            <td>&nbsp;</td>
            <td style="text-align: center; font-size: 10px; border-top: 1px solid black">(підпис)</td>
        </tr>
        <tr>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>М.П.</td>
        </tr>
    </tbody>
</table>

`
