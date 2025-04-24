module.exports = `
<!--%pageOrientation:landscape-->
<html><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"></head>
<body>
  <table id="table" style="table-layout: fixed;" width="1100px">
  <tbody>
  <tr><td></td>
  <td colspan="6" class="a-center b">Відмітка про одержання<br/> (штамп контролюючого органу) </td>
<td colspan="12">&nbsp;</td>
<td colspan="5">ЗАТВЕРДЖЕНО<br/>
  Наказ Міністерства фінансів України<br/>
13.01.2015 року № 4</td>
</tr>
<tr><td></td>
<td colspan="4" class="a-center b">
  {{#textInput}}DECLAR.DECLARBODY.HTIN####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
</td>
<td colspan="2">&nbsp;</td>
<td colspan="12">&nbsp;</td>
<td colspan="2">&nbsp;</td>
<td class="b">Стор.</td>
  <td colspan="2" class="a-center b">
  {{#intInput}}DECLAR.DECLARBODY.HPAGES{{{}}}{{/intInput}}
</td>
</tr>
<tr class="fix"><td></td>
  <td colspan="4"></td>
  <td colspan="2"></td>
  <td colspan="12"></td>
  <td colspan="2"></td>
  <td></td>
  <td colspan="2"></td>
  </tr>
  <tr><td></td>
  <td colspan="6">
  (податковий номер юридичної особи (податковий номер або серія та номер паспорта*
самозайнятої фізичної особи))
</td>
  <td colspan="17">&nbsp;</td>
  </tr>
  <tr><td></td>
  <td>&nbsp;</td>
  <td colspan="5">&nbsp;</td>
  <td colspan="12">&nbsp;</td>
  <td colspan="2" class="fw-b">Форма № 1ДФ</td>
  <td class="b">{{#booleanInput}}DECLAR.DECLARBODY.HZ####{"linkedPath": ["DECLAR.DECLARBODY.HZN","DECLAR.DECLARBODY.HZU"]}{{{}}}{{/booleanInput}}</td>
  <td colspan="2" class="b">
    Звітний
    </td>
    </tr>
    <tr><td></td>
    <td class="b a-center">X</td>
  <td colspan="5" class="b">Юридична особа</td>
  <td colspan="12">&nbsp;</td>
  <td colspan="2">&nbsp;</td>
  <td class="b">{{#booleanInput}}DECLAR.DECLARBODY.HZN####{"linkedPath": ["DECLAR.DECLARBODY.HZ","DECLAR.DECLARBODY.HZU"]}{{{}}}{{/booleanInput}}</td>
  <td colspan="2" class="b">
    Звітний новий
  </td>
  </tr>
  <tr><td></td>
  <td class="b">&nbsp;</td>
  <td colspan="5" class="b">Самозайнята фізична особа</td>
  <td colspan="12">&nbsp;</td>
  <td colspan="2">&nbsp;</td>
  <td class="b">{{#booleanInput}}DECLAR.DECLARBODY.HZU####{"linkedPath": ["DECLAR.DECLARBODY.HZ","DECLAR.DECLARBODY.HZN"]}{{{}}}{{/booleanInput}}</td>
  <td colspan="2" class="b">
    Уточнюючий
  </td>
  </tr>
  <tr class="fix"><td></td>
    <td></td>
    <td colspan="5"></td>
    <td colspan="12"></td>
    <td colspan="2"></td>
    <td></td>
    <td colspan="2"></td>
    </tr>
    <tr><td></td>
    <td colspan="4">&nbsp;</td>
  <td colspan="14" class="a-center fw-b" style="font-size: 1.2em;">Податковий розрахунок<br> сум доходу, нарахованого (сплаченого) на користь фізичних осіб, і сум утриманого з них податку</td>
  <td colspan="5">&nbsp;</td>
  </tr>
  <tr><td></td>
  <td colspan="4">&nbsp;</td>
  <td colspan="14" class="a-center bb">
    {{#textInput}}DECLAR.DECLARBODY.HNAME####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
  </td>
  <td colspan="5">&nbsp;</td>
  </tr>
  <tr><td></td>
  <td colspan="4">&nbsp;</td>
  <td colspan="14" class="a-center fs-sm">
    (найменування юридичної особи чи прізвище, ім’я та по батькові самозайнятої фізичної особи)
  </td>
    <td colspan="5">&nbsp;</td>
    </tr>
    <tr><td></td>
    <td colspan="4">&nbsp;</td>
    <td colspan="14" class="a-center bb">
      {{#textInput}}DECLAR.DECLARBODY.HLOC####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
    </td>
    <td colspan="5">&nbsp;</td>
    </tr>
    <tr><td></td>
    <td colspan="4">&nbsp;</td>
    <td colspan="14" class="a-center fs-sm">
      (податкова адреса юридичної особи чи самозайнятої фізичної особи)
    </td>
      <td colspan="5">&nbsp;</td>
      </tr>
      <tr><td></td>
      <td colspan="4">&nbsp;</td>
      <td colspan="14" class="a-center bb">
        {{#textInput}}DECLAR.DECLARBODY.HSTI####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
      </td>
      <td colspan="5">&nbsp;</td>
      </tr>
      <tr><td></td>
      <td colspan="4">&nbsp;</td>
      <td colspan="14" class="a-center fs-sm">
        (найменування контролюючого органу)
      </td>
        <td colspan="5">&nbsp;</td>
        </tr>
        <tr><td></td>
        <td colspan="4">&nbsp;</td>
        <td colspan="4" class="a-right">Звітний період:</td>
        <td class="a-right b">{{#intInput}}DECLAR.DECLARBODY.HZKV{{{}}}{{/intInput}}</td>
        <td>&nbsp;</td>
        <td colspan="2" class="a-center b">{{#intInput}}DECLAR.DECLARBODY.HZY{{{}}}{{/intInput}}</td>
        <td colspan="11">&nbsp;</td>
        </tr>
        <tr><td></td>
        <td colspan="4">&nbsp;</td>
        <td colspan="4">&nbsp;</td>
        <td class="a-center fs-sm">квартал</td>
          <td>&nbsp;</td>
        <td colspan="2" class="a-center fs-sm">рік</td>
          <td colspan="11">&nbsp;</td>
        </tr>
        <tr><td></td>
        <td colspan="6">Працювало за трудовими договорами (контрактами)</td>
        <td colspan="3" class="b">{{#intInput}}DECLAR.DECLARBODY.R00G01I{{{}}}{{/intInput}}</td>
        <td colspan="11">&nbsp;</td>
        </tr>
        <tr><td></td>
        <td colspan="6">Працювало за цивільно-правовими договорами</td>
        <td colspan="3" class="b">{{#intInput}}DECLAR.DECLARBODY.R00G02I{{{}}}{{/intInput}}</td>
        <td colspan="3" class="a-center fw-b">ПОРЦІЯ №</td>
        <td colspan="2" class="b">{{#intInput}}DECLAR.DECLARBODY.R00G03I{{{}}}{{/intInput}}</td>
        <td colspan="6">&nbsp;</td>
        </tr>
        <tr><td></td>
        <td colspan="23">
          &nbsp;
        </td>
          </tr>
          <tr><td></td>
          <td colspan="23" class="b">
            Розділ І. Суми доходу, нарахованого (сплаченого) на користь фізичних осіб, і суми утриманого з них податку
          </td>
          </tr>
          <tr><td></td>
          <td colspan="1" rowspan="2" class="b a-center">№<br>з/п</td>
          <td colspan="5" rowspan="2" class="b a-center">Податковий номер або серія та номер паспорта*</td>
          <td colspan="2" rowspan="2" class="b a-center">Сума нарахованого доходу (грн, коп.)</td>
          <td colspan="2" rowspan="2" class="b a-center">Сума виплаченого доходу (грн, коп.)</td>
          <td colspan="4" class="b a-center">Сума утриманого податку (грн, коп.)</td>
          <td colspan="2" rowspan="2" class="b a-center">Ознака доходу</td>
          <td colspan="4" class="b a-center">Дата</td>
            <td colspan="2" rowspan="2" class="b a-center">Ознака подат. соц. пільги</td>
          <td rowspan="2" class="b a-center">Ознака<br>(0, 1)</td>
            </tr>
            <tr><td></td>
            <td colspan="2"class="b a-center">нарахованого</td>
            <td colspan="2"class="b a-center">перерахованого</td>
            <td colspan="2"class="b a-center">прийняття на роботу</td>
          <td colspan="2"class="b a-center">звільнення з роботи</td>
          </tr>
          <tr><td></td>
          <td colspan="1" class="b a-center">1</td>
            <td colspan="5" class="b a-center">2</td>
            <td colspan="2" class="b a-center">3a</td>
          <td colspan="2" class="b a-center">3</td>
            <td colspan="2" class="b a-center">4a</td>
          <td colspan="2" class="b a-center">4</td>
            <td colspan="2" class="b a-center">5</td>
            <td colspan="2" class="b a-center">6</td>
            <td colspan="2" class="b a-center">7</td>
            <td colspan="2" class="b a-center">8</td>
            <td class="b a-center">9</td>
            </tr>
          {{#generatorRows}}T1{{{mode: "crd"}}}{{/generatorRows}}
          <tr><td></td>
          <td colspan="1" class="b a-center">Всього</td>
            <td colspan="5" class="b a-center">x</td>
            <td colspan="2" class="b a-center">{{#currencyInput}}DECLAR.DECLARBODY.R01G03A{{{}}}{{/currencyInput}}</td>
          <td colspan="2" class="b a-center">{{#currencyInput}}DECLAR.DECLARBODY.R01G03{{{}}}{{/currencyInput}}</td>
          <td colspan="2" class="b a-center">{{#currencyInput}}DECLAR.DECLARBODY.R01G04A{{{}}}{{/currencyInput}}</td>
          <td colspan="2" class="b a-center">{{#currencyInput}}DECLAR.DECLARBODY.R01G04{{{}}}{{/currencyInput}}</td>
          <td colspan="2" class="b a-center">x</td>
            <td colspan="2" class="b a-center">x</td>
            <td colspan="2" class="b a-center">x</td>
            <td colspan="2" class="b a-center">x</td>
            <td class="b a-center">x</td>
            </tr>
            <tr><td></td>
            <td colspan="23" class="b">
            Розділ ІІ. Оподаткування процентів, виграшів (призів) у лотерею та військовий збір
          </td>
          </tr>
          <tr><td></td>
          <td colspan="1" rowspan="2" class="b a-center">x</td>
            <td colspan="5" rowspan="2" class="b a-center">x</td>
            <td colspan="2" rowspan="2" class="b a-center">Загальна сума нарахованого доходу (грн, коп.)</td>
          <td colspan="2" rowspan="2" class="b a-center">Загальна сума виплаченого доходу (грн, коп.)</td>
          <td colspan="4" class="b a-center">Загальна сума утриманого податку, збору (грн, коп.)</td>
          <td colspan="9" rowspan="2" class="b a-center">x</td>
            </tr>
            <tr><td></td>
            <td colspan="2"class="b a-center">нарахованого</td>
            <td colspan="2"class="b a-center">перерахованого</td>
            </tr>
            <tr><td></td>
            <td colspan="1" class="b a-center">x</td>
            <td colspan="5" class="b">Оподаткування процентів</td>
          <td colspan="2" class="b a-center">{{#currencyInput}}DECLAR.DECLARBODY.R0201G03A{{{}}}{{/currencyInput}}</td>
          <td class="b a-center">x</td>
            <td class="b a-center">x</td>
            <td colspan="2" class="b a-center">{{#currencyInput}}DECLAR.DECLARBODY.R0201G04A{{{}}}{{/currencyInput}}</td>
          <td colspan="2" class="b a-center">{{#currencyInput}}DECLAR.DECLARBODY.R0201G04{{{}}}{{/currencyInput}}</td>
          <td colspan="2" class="b a-center">x</td>
            <td colspan="2" class="b a-center">x</td>
            <td colspan="2" class="b a-center">x</td>
            <td colspan="2" class="b a-center">x</td>
            <td class="b a-center">x</td>
            </tr>
            <tr><td></td>
            <td colspan="1" class="b a-center">x</td>
            <td colspan="5" class="b">Оподаткування процентів - виключення<sup>**</sup></td>
          <td colspan="2" class="b a-center">{{#currencyInput}}DECLAR.DECLARBODY.R0202G03A{{{}}}{{/currencyInput}}</td>
          <td class="b a-center">x</td>
            <td class="b a-center">x</td>
            <td colspan="2" class="b a-center">{{#currencyInput}}DECLAR.DECLARBODY.R0202G04A{{{}}}{{/currencyInput}}</td>
          <td colspan="2" class="b a-center">{{#currencyInput}}DECLAR.DECLARBODY.R0202G04{{{}}}{{/currencyInput}}</td>
          <td colspan="2" class="b a-center">x</td>
            <td colspan="2" class="b a-center">x</td>
            <td colspan="2" class="b a-center">x</td>
            <td colspan="2" class="b a-center">x</td>
            <td class="b a-center">x</td>
            </tr>
            <tr><td></td>
            <td colspan="1" class="b a-center">x</td>
            <td colspan="5" class="b">Оподаткування виграшів (призів) у лотерею</td>
          <td colspan="2" class="b a-center">{{#currencyInput}}DECLAR.DECLARBODY.R0203G03A{{{}}}{{/currencyInput}}</td>
          <td colspan="2" class="b a-center">{{#currencyInput}}DECLAR.DECLARBODY.R0203G03{{{}}}{{/currencyInput}}</td>
          <td colspan="2" class="b a-center">{{#currencyInput}}DECLAR.DECLARBODY.R0203G04A{{{}}}{{/currencyInput}}</td>
          <td colspan="2" class="b a-center">{{#currencyInput}}DECLAR.DECLARBODY.R0203G04{{{}}}{{/currencyInput}}</td>
          <td colspan="2" class="b a-center">x</td>
            <td colspan="2" class="b a-center">x</td>
            <td colspan="2" class="b a-center">x</td>
            <td colspan="2" class="b a-center">x</td>
            <td class="b a-center">x</td>
            </tr>
            <tr><td></td>
            <td colspan="1" class="b a-center">x</td>
            <td colspan="5" class="b">Оподаткування виграшів (призів) у лотерею - виключення<sup>***</sup></td>
          <td colspan="2" class="b a-center">{{#currencyInput}}DECLAR.DECLARBODY.R0204G03A{{{}}}{{/currencyInput}}</td>
          <td colspan="2" class="b a-center">{{#currencyInput}}DECLAR.DECLARBODY.R0204G03{{{}}}{{/currencyInput}}</td>
          <td colspan="2" class="b a-center">{{#currencyInput}}DECLAR.DECLARBODY.R0204G04A{{{}}}{{/currencyInput}}</td>
          <td colspan="2" class="b a-center">{{#currencyInput}}DECLAR.DECLARBODY.R0204G04{{{}}}{{/currencyInput}}</td>
          <td colspan="2" class="b a-center">x</td>
            <td colspan="2" class="b a-center">x</td>
            <td colspan="2" class="b a-center">x</td>
            <td colspan="2" class="b a-center">x</td>
            <td class="b a-center">x</td>
            </tr>
            
            {{#generatorRows}}Military{{{mode: "crd"}}}{{/generatorRows}}
            <!--<tr><td></td>-->
            <!--<td colspan="1" class="b a-center">x</td>-->
            <!--<td colspan="5" class="b">Військовий збір</td>-->
          <!--<td colspan="2" class="b a-center">{{#currencyInput}}DECLAR.DECLARBODY.R0205G03A{{{}}}{{/currencyInput}}</td>-->
          <!--<td colspan="2" class="b a-center">{{#currencyInput}}DECLAR.DECLARBODY.R0205G03{{{}}}{{/currencyInput}}</td>-->
          <!--<td colspan="2" class="b a-center">{{#currencyInput}}DECLAR.DECLARBODY.R0205G04A{{{}}}{{/currencyInput}}</td>-->
          <!--<td colspan="2" class="b a-center">{{#currencyInput}}DECLAR.DECLARBODY.R0205G04{{{}}}{{/currencyInput}}</td>-->
          <!--<td colspan="2" class="b a-center">x</td>-->
            <!--<td colspan="2" class="b a-center">x</td>-->
            <!--<td colspan="2" class="b a-center">x</td>-->
            <!--<td colspan="2" class="b a-center">x</td>-->
            <!--<td class="b a-center">x</td>-->
            <!--</tr>-->
            <!--<tr><td></td>-->
            <!--<td colspan="1" class="b a-center">x</td>-->
            <!--<td colspan="5" class="b">Військовий збір - виключення<sup>****</sup></td>-->
          <!--<td colspan="2" class="b a-center">{{#currencyInput}}DECLAR.DECLARBODY.R0206G03A{{{}}}{{/currencyInput}}</td>-->
          <!--<td colspan="2" class="b a-center">{{#currencyInput}}DECLAR.DECLARBODY.R0206G03{{{}}}{{/currencyInput}}</td>-->
          <!--<td colspan="2" class="b a-center">{{#currencyInput}}DECLAR.DECLARBODY.R0206G04A{{{}}}{{/currencyInput}}</td>-->
          <!--<td colspan="2" class="b a-center">{{#currencyInput}}DECLAR.DECLARBODY.R0206G04{{{}}}{{/currencyInput}}</td>-->
          <!--<td colspan="2" class="b a-center">x</td>-->
            <!--<td colspan="2" class="b a-center">x</td>-->
            <!--<td colspan="2" class="b a-center">x</td>-->
            <!--<td colspan="2" class="b a-center">x</td>-->
            <!--<td class="b a-center">x</td>-->
            <!--</tr>-->
            
            
            <tr><td></td>
            <td colspan="23">
            &nbsp;
          </td>
            </tr>
            <tr><td></td>
            <td colspan="2">Кількість рядків<br>(розділ І)</td>
            <td colspan="3" class="b">{{#intInput}}DECLAR.DECLARBODY.R02G01I{{{}}}{{/intInput}}</td>
            <td colspan="3" class="a-center">Кількість фізичних осіб<br>(розділ І)</td>
            <td colspan="2" class="b">{{#intInput}}DECLAR.DECLARBODY.R02G02I{{{}}}{{/intInput}}</td>
            <td colspan="3" class="a-center">Кількість сторінок</td>
            <td colspan="2" class="b">{{#intInput}}DECLAR.DECLARBODY.R02G03I{{{}}}{{/intInput}}</td>
            <td colspan="6">&nbsp;</td>
            </tr>
            <tr><td></td>
            <td colspan="23">
              &nbsp;
            </td>
              </tr>
              <tr><td></td>
              <td colspan="3">Керівник юридичної особи</td>
              <td colspan="3" class="b">{{#textInput}}DECLAR.DECLARBODY.HKBOS{{{}}}{{/textInput}}</td>
              <td>&nbsp;</td>
              <td colspan="2" class="bb">&nbsp;</td>
              <td>&nbsp;</td>
              <td colspan="3" class="bb">{{#textInput}}DECLAR.DECLARBODY.HBOS{{{}}}{{/textInput}}</td>
              <td>&nbsp;</td>
              <td colspan="3" class="bb">{{#textInput}}DECLAR.DECLARBODY.HTELBOS{{{}}}{{/textInput}}</td>
              <td>&nbsp;</td>
              <td colspan="2" class="b">Дата подання</td>
              <td colspan="2" class="b">{{#dateInput}}DECLAR.DECLARBODY.HFILL{{{}}}{{/dateInput}}</td>
              </tr>
              <tr><td></td>
              <td colspan="3">&nbsp;</td>
              <td colspan="3" class="fs-sm a-top">(податковий номер або серія та номер паспорта* керівника юридичної особи)</td>
              <td>&nbsp;</td>
              <td colspan="2" class="fs-sm a-top">(підпис)</td>
                <td>&nbsp;</td>
              <td colspan="3" class="fs-sm a-top">(ініціали, прізвище)</td>
                <td>&nbsp;</td>
              <td colspan="3" class="fs-sm a-top">(тел.)</td>
                <td colspan="5">&nbsp;</td>
              </tr>
              <tr><td></td>
              <td colspan="3">Головний бухгалтер</td>
              <td colspan="3" class="b">{{#textInput}}DECLAR.DECLARBODY.HKBUH{{{}}}{{/textInput}}</td>
              <td>&nbsp;</td>
              <td colspan="2" class="bb">&nbsp;</td>
              <td>&nbsp;</td>
              <td colspan="3" class="bb">{{#textInput}}DECLAR.DECLARBODY.HBUH{{{}}}{{/textInput}}</td>
              <td>&nbsp;</td>
              <td colspan="3" class="bb">{{#textInput}}DECLAR.DECLARBODY.HTELBUH{{{}}}{{/textInput}}</td>
              <td colspan="5">&nbsp;</td>
              </tr>
              <tr><td></td>
              <td colspan="3">&nbsp;</td>
              <td colspan="3" class="fs-sm a-top">(податковий номер або серія та номер паспорта* керівника юридичної особи)</td>
              <td>&nbsp;</td>
              <td colspan="2" class="fs-sm a-top">(підпис)</td>
                <td>&nbsp;</td>
              <td colspan="3" class="fs-sm a-top">(ініціали, прізвище)</td>
                <td>&nbsp;</td>
              <td colspan="3" class="fs-sm a-top">(тел.)</td>
                <td>&nbsp;</td>
              <td colspan="4" class="fw-b">Наведена інформація є правильною</td>
              <td colspan="1">&nbsp;</td>
              </tr>
              <tr><td></td>
              <td colspan="3">Самозайнята фізична особа</td>
              <td colspan="3" class="b">&nbsp;</td>
              <td>&nbsp;</td>
              <td colspan="2" class="bb">&nbsp;</td>
              <td>&nbsp;</td>
              <td colspan="3" class="bb">&nbsp;</td>
              <td>&nbsp;</td>
              <td colspan="3" class="bb">&nbsp;</td>
              <td colspan="5">&nbsp;</td>
              </tr>
              <tr><td></td>
              <td colspan="3">&nbsp;</td>
              <td colspan="3" class="fs-sm a-top">(податковий номер або серія та номер паспорта* керівника юридичної особи)</td>
              <td>&nbsp;</td>
              <td colspan="2" class="fs-sm a-top">(підпис)</td>
                <td>&nbsp;</td>
              <td colspan="3" class="fs-sm a-top">(ініціали, прізвище)</td>
                <td>&nbsp;</td>
              <td colspan="3" class="fs-sm a-top">(тел.)</td>
                <td colspan="6">&nbsp;</td>
              </tr>
              <tr><td></td>
              <td colspan="23">
                &nbsp;
              </td>
                </tr>
                <tr><td></td>
                <td colspan="6">&nbsp;</td>
                <td colspan="10" class="a-top a-center" style="border-top: 1px dashed;">Заповнюється службовими особами контролюючого органу</td>
                <td colspan="7">&nbsp;</td>
                </tr>
                <tr><td></td>
                <td colspan="6" class="fw-b">М. П. (за наявності)</td>
                <td colspan="10" class="b b-2 a-center fs-sm">
                  Відмітка про внесення даних до електронної бази податкової звітності "___" ____________ 20__ року<br>
                <div class="bt" style="margin: 16px 30px 0 30px">Службова особа контролюючого органу (підпис, ініціали, прізвище)</div>
                </td>
                <td colspan="7">&nbsp;</td>
                </tr>
                <tr><td></td>
                <td colspan="23">
                  -----------------------------<br>
                  <sup>*</sup> Виключення інформації щодо військового збору при проведенні коригувань.<br>
                  <sup>**</sup> Для фізичної особи, яка має відмітку в паспорті про право здійснювати будь-які платежі за серією та номером паспорта.<br>
                  <sup>***</sup> Виключення інформації щодо оподаткування процентів при проведенні коригувань.<br>
                  <sup>****</sup> Виключення інформації щодо оподаткування виграшів (призів) у лотерею при проведенні коригувань.
                  </td>
                  </tr>
  </tbody></table>
</body></html>
    <style>
    table {
      font-family: TimesNewRoman;
      border-collapse: collapse;
      border: 0px;
      font-size: 9pt;
    }
    td {
      border2: 1px solid red;
    }
    td {
      padding: 0 2px;
    }
    tr.fix td {
      padding: 0;
    }
  .a-center {
      text-align: center;
    }
  .a-left {
      text-align: left;
    }
  .a-right {
      text-align: right;
    }
  .a-top {
      vertical-align: top;
    }
  .b {
      border: 1px solid black;
    }
  .bt {
      border-top: 1px solid black;
    }
  .bb {
      border-bottom: 1px solid black;
    }
  .b-2 {
      border-width: 2px;
    }
  .fw-b {
      font-weight: bold;
    }
  .fs-sm {
      font-size: 0.9em;
    }
  </style>
`
