module.exports = `
<style>
    input[value=""]::-webkit-datetime-edit{ color: transparent; }
    input:focus::-webkit-datetime-edit{ color: #000; }
</style>
<!--%pageOrientation:landscape-->
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1485px">
    <tbody>
        <tr align="center">
            <td><b>Таблиця 5. Відомості  про трудові відносини осіб та період проходження військової служби</b></td>
        </tr>
    </tbody>
</table>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1485px">
    <tbody>
        <tr>
            <td width="30%">1. Код за ЄДРПОУ або реєстраційний номер облікової картки платника податків/серія (за наявності) та/або номер паспорта страхувальника*</td>
            <td width="10%">{{#textInput}}DECLAR.DECLARBODY.HTIN####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}</td>
            <td width="50%">2. Код за ЄДРПОУ або реєстраційний номер облікової картки платника податків /серія (за наявності) та/або номер паспорта ліквідованого /припиненого страхувальника* (заповнюється у разі подання звіту правонаступником) </td>
            <td width="10%">{{#textInput}}DECLAR.DECLARBODY.HTIN1####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}</td>
        </tr>
    </tbody>
</table>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1485px">
    <tbody>
        <tr><td class="td_box">{{#textInput}}DECLAR.DECLARBODY.HNAME####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}</td></tr>
        <tr><td align="center">(найменування страхувальника) </td></tr>
    </tbody>
</table>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1485px">
    <tbody>
        <tr>
            <td width="20%">3. Звіт за місяць</td>
            <td class="td_box" width="5%">{{#intInput}}DECLAR.DECLARBODY.HZM{{{}}}{{/intInput}}</td>
            <td align="right" width="10%">pік</td>
            <td class="td_box" width="5%">{{#intInput}}DECLAR.DECLARBODY.HZY{{{}}}{{/intInput}}</td>
            <td align="right" width="10%">4. Тип</td>
            <td align="right" width="10%">початкова</td>
            <td class="td_box" width="5%">{{#booleanInput}}DECLAR.DECLARBODY.HZB{{{}}}{{/booleanInput}}</td>
            <td align="right" width="10%">скасовуюча</td>
            <td class="td_box" width="5%">{{#booleanInput}}DECLAR.DECLARBODY.HZS{{{}}}{{/booleanInput}}</td>
            <td align="right" width="10%">додаткова</td>
            <td class="td_box" width="10%">{{#booleanInput}}DECLAR.DECLARBODY.HZD{{{}}}{{/booleanInput}}</td>
        </tr>
    </tbody>
</table>
<br>
<table id="table" style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse; border: 1px solid black;" border="1" cellspacing="0" cellpadding="0px" bordercolor="black" width="1485px">
    <thead>
    <tr>
        <td align="center" rowspan="2" width="2%" class="no-print">&nbsp;</td>
        <td align="center" rowspan="2" width="2%">№  з/п</td>
        <td align="center" rowspan="2" width="5%">6. Грома- дянин України <br>(1 - так, <br>0 - ні)</td>
        <td align="center" rowspan="2" width="7%">7. Договір ЦПХ за основним місцем роботи або  за сумісництвом <br>(1 - так, 0 -  ні)</td>
        <td align="center" rowspan="2" width="6%">8. Категорія особи ** </td>
        <td align="center" rowspan="2" width="10%">9. Реєстраційний номер облікової картки платника податків або серія (за наявності) та номер паспорта за формою БКNNХХХХХХ/ПХХХХХХХХХ ЗО *</td>
        <td align="center" colspan="3" rowspan="2" width="18%">10. Прізвище, ім'я, по батькові ЗО</td>
        <td align="center" colspan="2" width="10%">11. Період трудових або цивільно-правових відносин, проходження військової служби та відпусток</td>
        <td align="center" width="8%"> 12. Професійна назва роботи</td>
        <td align="center" width="8%"> 14. Код класифікатора  професій</td>
        <td align="center" width="13%">16. Документ підстава про початок, кінець трудових або цивільно - правових відносин, переведення на іншу посаду, роботи та відпусток</td>
        <td align="center" width="11%">18. Дата створення нового робочого місця (штатної одиниці), на яке  у звітному періоді працевлаштований працівник</td>
    </tr>
    <tr>
        <td align="center" width="5%">дата початку</td>
        <td align="center" width="5%">дата закінчення</td>
        <td align="center">13. Код ЗКППТР</td>
        <td align="center">15. Посада</td>
        <td align="center">17. Підстава для припинення трудових або цивільно – правових відносин</td>
        <td align="center">19. Військове звання</td>
    </tr>
    </thead>
    <tbody id="Process">
    {{#generatorRows}}T1{{{}}}{{/generatorRows}}
    </tbody>
</table>
<br>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1485px">
    <tbody>
        <tr>
            <td>
                * Для фізичних осіб, які мають відмітку в паспорті про право здійснювати будь-які платежі за серією (за наявності) 
                та/або номером паспорта, зазначаються: серія та номер БКNNXXXXXX, де БК - константа, що вказує на реєстрацію за 
                паспортними даними; NN - дві українські літери серії паспорта (верхній регістр); XXXXXX - шість цифр номера паспорта
                (з ведучими нулями) або ПХХХХХХХХХ, де П - константа, що вказує на реєстрацію за паспортними даними; 
                ХХХХХХХХХ – дев’ять цифр номера паспорта, що у формі пластикової картки.
            </td>
        </tr>
        <tr>
            <td>
                ** Категорія особи: <br>
                1 – наймані працівники (з трудовою книжкою);<br>
                2 – наймані працівники (без трудової книжки); <br>
                3 – особи, які виконують роботи за договорами цивільно-правового характеру; <br>
                4 – особи,  яким  надано відпустку по догляду за дитиною від трирічного віку  до досягнення нею шестирічного віку;<br>
                5 – особи, яким надано відпустку у зв'язку з вагітністю та пологами;<br>
                6 – особи, яким надано відпустку по догляду за дитиною до досягнення нею трирічного віку <br>
                7- особи, із числа військовослужбовців ,особи рядового і начальницького складу, які отримують  допомогу у зв’язку 
                з вагітністю та пологами; <br>
                8 – особи із числа військовослужбовців, особи рядового і начальницького складу.
            </td>
        </tr>
    </tbody>
</table>
<br>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1485px">
    <tbody>
        <tr>
            <td width="35%">20. Дата формування у страхувальника: </td>
            <td align="center" class="td_box" width="15%">{{#dateInput}}DECLAR.DECLARBODY.HFILL{{{}}}{{/dateInput}}</td>
            <td width="50%">&nbsp;</td>
        </tr>
    </tbody>
</table>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1485px">
  <tbody>
    <tr>
      <td width="10%">21. Керівник</td>
      <td width="2%">&nbsp;</td>
      <td class="td_box" width="10%">{{#textInput}}DECLAR.DECLARBODY.HKBOS{{{}}}{{/textInput}}</td>
      <td width="2%">&nbsp;</td>
      <td class="td_unln" width="5%">&nbsp;</td>
      <td width="2%">&nbsp;</td>
      <td class="td_box" width="10%">{{#textInput}}DECLAR.DECLARBODY.HBOS{{{}}}{{/textInput}}</td>
      <td width="4%">&nbsp;</td>
      <td width="10%">22. Головний бухгалтер</td>
      <t width="2%">&nbsp;</td>
      <td class="td_box" width="10%">{{#textInput}}DECLAR.DECLARBODY.HKBUH{{{}}}{{/textInput}}</td>
      <td width="2%">&nbsp;</td>
      <td class="td_unln" width="5%">&nbsp;</td>
      <td width="2%">&nbsp;</td>
      <td class="td_box" width="10%">{{#textInput}}DECLAR.DECLARBODY.HBUH{{{}}}{{/textInput}}</td>
    </tr>
    <tr>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>(реєстраційний номер облікової картки платника податків та/або серія (за наявності) та номер паспорта*)</td>
      <td>&nbsp;</td>
      <td align="center">
        <font size="-1">(підпис)</font>
      </td>
      <td>&nbsp;</td>
      <td align="center">
        <font size="-1">        (ініціали та прізвище)  </font>
      </td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>(реєстраційний номер облікової картки платника податків та/або серія (за наявності) та номер паспорта*)       </td>
      <td>&nbsp;</td>
      <td align="center">
        <font size="-1">(підпис)</font>
      </td>
      <td>&nbsp;</td>
      <td align="center">
        <font size="-1">(ініціали та прізвище)  </font>
      </td>
    </tr>
  </tbody>
</table>
`
