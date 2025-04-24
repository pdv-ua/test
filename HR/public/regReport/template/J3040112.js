module.exports = `
<!--%pageOrientation:landscape-->
<!-- background: aqua -->
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
     <tr>
         <td width="45%">1. Звіт за місяць</td>
         <td class="td_box" width="15%">
            {{#intInput}}DECLAR.DECLARBODY.HZM{{{}}}{{/intInput}}
         </td>
         <td align="right" width="10%">pік</td>
         <td class="td_box" width="20%">
            {{#intInput}}DECLAR.DECLARBODY.HZY{{{}}}{{/intInput}}
         </td>
         <td width="10%">&nbsp;</td>
      </tr>
</table>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
   <tbody>
      <tr>
         <td width="50%">2. Код за ЄДРПОУ або податковий  номер/серія (за наявності) та/або номер паспорта страхувальника*</td>
         <td width="45%">
            {{#textInput}}DECLAR.DECLARBODY.HTIN####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
         </td>
         <td width="5%">&nbsp;</td>
      </tr>
      <tr>
         <td>3. Код за ЄДРПОУ або податковий  номер/серія (за наявності) та/або номер паспорта ліквідованого страхувальника*  (заповнюється у разі подання звіту правонаступником)</td>
         <td>
            {{#textInput}}DECLAR.DECLARBODY.HTIN1####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
         </td>
      </tr>
   </tbody>
</table>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
   <tbody>
      <tr>
         <td width="10%"><b>Страхувальник </b></td>
         <td class="td_box">
            {{#textInput}}DECLAR.DECLARBODY.HNAME####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
         </td>
      </tr>
      <tr>
         <td>&nbsp;</td>
         <td align="center">(найменування страхувальника або прізвище, ім'я, по батькові - для фізичної особи – підприємця, особи, яка провадить незалежну професійну діяльність) </td>
      </tr>
   </tbody>
</table>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
   <tbody>
      <tr>
         <td width="50%">4. Код основного виду економічної діяльності </td>
         <td width="20%">
            {{#textInput}}DECLAR.DECLARBODY.HKVED####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
         </td>
         <td width="30%">&nbsp;</td>
      </tr>
   </tbody>
</table>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
   <tbody>
      <tr>
         <td width="50%"><b>5. Бюджетна установа </b></td>
         <td width="2%" align="left">
            {{#booleanInput}}DECLAR.DECLARBODY.H01{{{}}}{{/booleanInput}}
         </td>
         <td width="48%">&nbsp;</td>
      </tr>
      <tr>
         <td><b>6. Підприємство, організація всеукраїнської громадської організації інвалідів, зокрема товариств УТОГ,  УТОС </b></td>
         <td align="left">
            {{#booleanInput}}DECLAR.DECLARBODY.H02{{{}}}{{/booleanInput}}
         </td>
         <td>&nbsp;</td>
      </tr>
      <tr>
         <td><b>7. Підприємство, організація громадської  організації інвалідів         </b><i> (позначка “х” вноситься в клітинку відповідного варіанта)    </i></td>
         <td align="left">
            {{#booleanInput}}DECLAR.DECLARBODY.H03{{{}}}{{/booleanInput}}
         </td>
         <td>&nbsp;</td>
      </tr>
   </tbody>
</table>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
   <tbody>
      <tr>
         <td width="15%"><b>8. Міністерство, інший  центральний органви конавчої влади </b></td>
         <td align="center" class="td_box" width="30%">
            {{#textInput}}DECLAR.DECLARBODY.HSPODU####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
         </td>
         <td width="5%">&nbsp;</td>
         <td width="25%">15. Середньооблікова кількість штатних  працівників за звітний період, осіб </td>
         <td align="center" class="td_box" width="20%">
            {{#intInput}}DECLAR.DECLARBODY.HNACTL{{{}}}{{/intInput}}
         </td>
      </tr>
      <tr>
         <td><b>9. Місцезнаходження (місце проживання) </b></td>
         <td>
            {{#textInput}}DECLAR.DECLARBODY.HLOC####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
         </td>
         <td>&nbsp;</td>
         <td>у тому числі:  <br>працівників,  яким відповідно до чинного законодавства встановлено інвалідність, осіб </td>
         <td align="center" class="td_box">
            {{#intInput}}DECLAR.DECLARBODY.HNACTL1{{{}}}{{/intInput}}
         </td>
      </tr>
      <tr>
         <td><b>тел. _  </b></td>
         <td>
            {{#textInput}}DECLAR.DECLARBODY.HTEL####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
         </td>
         <td>&nbsp;</td>
         <td>працівників, що мають додаткові гарантії у сприянні працевлаштуванню </td>
         <td align="center" class="td_box">
            {{#intInput}}DECLAR.DECLARBODY.HNACTL2{{{}}}{{/intInput}}
         </td>
      </tr>
      <tr>
         <td><b>10. Організаційно-правова форма господарювання </b></td>
         <td>
            {{#textInput}}DECLAR.DECLARBODY.HKOPFG####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
         </td>
         <td>&nbsp;</td>
         <td>&nbsp;</td>
         <td align="center">&nbsp;</td>
      </tr>
      <tr>
         <td><b>11. № реєстрації страхувальника</b></td>
         <td>
            {{#textInput}}DECLAR.DECLARBODY.HNREG####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
         </td>
         <td>&nbsp;</td>
         <td>Облікова кількість штатних працівників  </td>
         <td align="center" class="td_box">
            {{#intInput}}DECLAR.DECLARBODY.HNACTL3{{{}}}{{/intInput}}
         </td>
      </tr>
      <tr>
         <td>&nbsp;</td>
         <td>&nbsp;</td>
         <td>&nbsp;</td>
         <td> Кількість осіб, які виконували роботи (надавали послуги) за договорами цивільно-правового  характеру </td>
         <td align="center" class="td_box">
            {{#intInput}}DECLAR.DECLARBODY.HNACTL4{{{}}}{{/intInput}}
         </td>
      </tr>
      <tr>
         <td><b>12. Назва банку </b></td>
         <td>
            {{#textInput}}DECLAR.DECLARBODY.HBANKNAME####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
         </td>
         <td>&nbsp;</td>
         <td>Кількість застрахованих осіб у звітному періоді, яким  нараховано заробітну плату/(крім осіб, яким у звітному періоді нараховано грошове забезпечення)</td>
         <td align="center" class="td_box">
            {{#intInput}}DECLAR.DECLARBODY.HNACTL5{{{}}}{{/intInput}}
         </td>
      </tr>
      <tr>
         <td><b>13. МФО  </b></td>
         <td class="td_box">
            {{#textInput}}DECLAR.DECLARBODY.HMFO####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
         </td>
         <td>&nbsp;</td>
         <td>у тому числі: <br> чоловіків </td>
         <td align="center" class="td_box">
            {{#intInput}}DECLAR.DECLARBODY.HNACTL6{{{}}}{{/intInput}}
         </td>
      </tr>
      <tr>
      <td><b>№ п/рахунку   </b></td>
         <td>
            {{#textInput}}DECLAR.DECLARBODY.HBANKACC####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
         </td>
         <td>&nbsp;</td>
         <td>жінок </td>
         <td align="center" class="td_box">
            {{#intInput}}DECLAR.DECLARBODY.HNACTL7{{{}}}{{/intInput}}
         </td>
      </tr>
      <tr>
         <td>&nbsp;</td>
         <td>&nbsp;</td>
         <td>&nbsp;</td>
         <td align="center" colspan="2"><i>(показники кількості працівників зазначаються в цілих одиницях) </i></td>
      </tr>
      <tr>
         <td><b>14. Кількість створених нових робочих місць  у звітному періоді   </b></td>
         <td class="td_box">
            {{#intInput}}DECLAR.DECLARBODY.H014G1{{{}}}{{/intInput}}
         </td>
         <td>&nbsp;</td>
         <td>&nbsp;</td>
         <td>&nbsp;</td>
      </tr>
   </tbody>
</table>
<br>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
   <tbody>
      <tr align="center">
         <td><b>Таблиця 1. Нарахування єдиного внеску</b></td>
      </tr>
   </tbody>
</table>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px" border="1" bordercolor="black" cellspacing="0">
   <tbody>
      <tr>
         <td align="center" width="5%"> № з/п</td>
         <td align="center" width="85%"> Назва показника</td>
         <td align="center" width="10%"> Сума (грн.)</td>
      </tr>
      <tr>
         <td align="center"> 1 </td>
         <td align="center"> 2 </td>
         <td align="center"> 3 </td>
      </tr>
      <tr>
         <td align="center"> 1</td>
         <td>
            <b>Загальна сума нарахованої заробітної плати, винагород за виконану роботу (надані послуги) за 
            цивільно-правовими договорами, оплати допомоги по тимчасовій непрацездатності та допомоги у зв’язку з вагітністю 
            та пологами, усього (р. 1.1 + р. 1.2 + р. 1.3 + р. 1.4 + р. 1.5)     </b>
         </td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R01G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 1.1</td>
         <td> сума нарахованої заробітної плати  </td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R011G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 1.2</td>
         <td> сума винагород за договорами цивільно-правового характеру </td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R012G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 1.3</td>
         <td>сума оплати перших п’яти днів тимчасової непрацездатності, що здійснюється за рахунок коштів роботодавця</td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R013G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 1.4</td>
         <td>сума допомоги по тимчасовій непрацездатності, яка виплачується за рахунок коштів фонду соціального страхування</td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R014G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 1.5</td>
         <td> сума допомоги у зв'язку з вагітністю та пологами</td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R015G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 2</td>
         <td>
            <b>Сума нарахованої заробітної плати, винагород за виконану роботу (надані послуги) за цивільно-правовими
            договорами, оплати допомоги по тимчасовій непрацездатності, допомоги у зв’язку з вагітністю та пологами та додаткової
            бази нарахування, на яку нараховується єдиний внесок, усього (р. 2.1 + р. 2.2 + р. 2.3 + р. 2.4 + р. 2.5)</b>
         </td>
         <td align="right">
           {{#currencyInput}}DECLAR.DECLARBODY.R02G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 2.1</td>
         <td>роботодавцями (22,0 %)</td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R021G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 2.2</td>
         <td>підприємствами, установами і організаціями працюючим особам з інвалідністю (8,41 %)</td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R022G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 2.3</td>
         <td>підприємствами та організаціями всеукраїнських громадських організацій осіб з інвалідністю, зокрема товариствами УТОГ та УТОС (5,3 %)</td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R023G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 2.4</td>
         <td>підприємствами та організаціями громадських організацій осіб з інвалідністю, працюючим особам з інвалідністю (5,5 %)</td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R024G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 2.5</td>
         <td>Додаткова база нарахування єдиного внеску (22,0 %)</td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R025G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 3</td>
         <td><b>Нараховано єдиного внеску, усього (р. 3.1 + р. 3.2 + р. 3.3 + р. 3.4 + р. 3.5)</b></td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R03G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 3.1</td>
         <td>на суми нарахованої роботодавцями заробітної плати, винагороди за виконані роботи (надані послуги) 
         за цивільно-правовими договорами, оплати допомоги по тимчасовій непрацездатності та допомоги у зв’язку з вагітністю 
         та пологами (22,0 %)</td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R031G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 3.2</td>
         <td>на суми заробітної плати, нарахованої підприємствами, установами і організаціями працюючим особам з інвалідністю (8,41 %)</td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R032G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 3.2.1</td>
         <td>на суми заробітної плати, нарахованої підприємствами, установами і організаціями працюючим особам 
         з інвалідністю (22 %)</td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R0321G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 3.3</td>
         <td>на суми заробітної плати, нарахованої підприємствами та організаціями всеукраїнських громадських організацій 
         осіб з інвалідністю, зокрема товариствами УТОГ та УТОС (5,3 %) </td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R033G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 3.3.1</td>
         <td>на суми заробітної плати, нарахованої підприємствами та організаціями всеукраїнських громадських організацій 
         осіб з інвалідністю, зокрема товариствами УТОГ та УТОС (22 %)</td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R0331G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 3.4</td>
         <td>на суми заробітної плати, нарахованої  підприємствами та організаціями громадських організацій осіб з інвалідністю,
         працюючим особам з інвалідністю (5,5 %)</td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R034G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 3.4.1</td>
         <td>на суми заробітної плати, нарахованої підприємствами та організаціями громадських організацій осіб з інвалідністю
         (за умов, визначених частиною чотирнадцятою статті 8 Закону України «Про збір та облік єдиного внеску на 
         загальнообов’язкове державне соціальне страхування»), працюючим особам з інвалідністю (22 %)</td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R0341G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 3.5</td>
         <td>на суми різниці між розміром  мінімальної заробітної плати та фактично нарахованої заробітної плати 
         роботодавцями (22,0 %)</td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R035G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 4</td>
         <td>
         <b>Донараховано та/або доутримано єдиний внесок у зв’язку з виправленням помилки, допущеної в попередніх 
         звітних періодах (р.4.1 + р. 4.2 + р. 4.3) </b>
         </td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R04G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 4.1</td>
         <td>
         <b>Донараховано єдиний внесок (крім сум, зазначених у р. 4.2) </b>
         </td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R041G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 4.1.1</td>
         <td>22,0 %, 36,76-49,7 %, в т. ч. донараховано до мінімальної заробітної плати</td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R04101G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 4.1.2</td>
         <td>36,3 %, в т. ч. донараховано до мінімальної заробітної плати</td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R04102G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 4.1.3</td>
         <td>45,96 %, в т. ч. донараховано до мінімальної заробітної плати</td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R04103G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 4.1.4</td>
         <td>8,41 % </td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R04104G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
      <td align="center"> 4.1.5</td>
         <td>5,3 %</td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R04105G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 4.1.6</td>
         <td>5,5 %</td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R04106G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 4.1.7</td>
         <td>34,7 %  </td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R04107G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 4.1.8</td>
         <td>33,2 %, в т. ч. донараховано до мінімальної заробітної плати</td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R04108G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 4.1.9</td>
         <td>36,76-49,7 % х коефіцієнт </td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R04109G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 4.1.10</td>
         <td>36,3 % х коефіцієнт </td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R04110G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 4.1.11</td>
         <td>45,96  % х коефіцієнт </td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R04111G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 4.1.12</td>
         <td>34,7 % х коефіцієнт </td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R04112G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 4.1.13</td>
         <td>33,2 % х коефіцієнт </td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R04113G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 4.2</td>
         <td>
         <b>Донараховано єдиний внесок за попередні звітні періоди внаслідок збільшення класу професійного ризику 
         виробництва</b>
         </td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R042G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 4.3</td>
         <td><b> Додатково утримано єдиний внесок</b></td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R043G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 4.3.1</td>
         <td>3,6   % </td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R04301G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 4.3.2</td>
         <td>2,85 %</td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R04302G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 4.3.3</td>
         <td>6,1 % </td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R04303G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 4.3.4</td>
         <td>2,6 %</td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R04304G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 4.3.5</td>
         <td>2 % </td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R04305G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 4.4</td>
         <td>
         <b>Сума виплат, на яку донараховано єдиний  внесок </b>
         </td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R044G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center">&nbsp;</td>
         <td>Зміст помилки<br>
            {{#textInput}}DECLAR.DECLARBODY.R044G2S{{{}}}{{/textInput}}
         </td>
         <td align="right">&nbsp;</td>
      </tr>
      <tr>
         <td align="center"> 5</td>
         <td>
         <b>Зменшено суму єдиного внеску у зв’язку з виправленням помилки, допущеної в попередніх  звітних періодах
         (р. 5.1 + р. 5.2 + р. 5.3)</b>
         </td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R05G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 5.1</td>
         <td>
         <b>Зменшено нарахування (крім сум, зазначених у р. 5.2)</b>
         </td>
         <td align="right">
           {{#currencyInput}}DECLAR.DECLARBODY.R051G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 5.1.1</td>
         <td>22,0 %, 36,76-49,7 %, в т. ч. зменшено, виходячи з розміру мінімальної заробітної плати</td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R05101G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 5.1.2</td>
         <td>36,3 %, в т. ч. зменшено, виходячи з розміру мінімальної заробітної плати</td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R05102G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 5.1.3</td>
         <td>45,96 %, в т. ч. зменшено, виходячи з розміру мінімальної заробітної плати</td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R05103G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 5.1.4</td>
         <td>8,41 %</td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R05104G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 5.1.5</td>
         <td>5,3 %</td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R05105G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 5.1.6</td>
         <td>5,5 %</td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R05106G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 5.1.7</td>
         <td>34,7 % </td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R05107G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 5.1.8</td>
         <td>33,2 %, в т. ч. зменшено, виходячи з розміру мінімальної заробітної плати</td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R05108G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 5.1.9</td>
         <td>(36,76-49,7 %) х коефіцієнт  </td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R05109G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 5.1.10</td>
         <td>36,3 % х коефіцієнт  </td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R05110G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 5.1.11</td>
         <td>45,96 % х коефіцієнт  </td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R05111G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 5.1.12</td>
         <td>34,7 % х коефіцієнт  </td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R05112G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
      <td align="center"> 5.1.13</td>
      <td>33,2 % х коефіцієнт   </td>
      <td align="right">
        {{#currencyInput}}DECLAR.DECLARBODY.R05113G3{{{}}}{{/currencyInput}}
      </td>
      </tr>
      <tr>
         <td align="center"> 5.2</td>
         <td>
         <b>Зменшено суму єдиного внеску за попередні звітні періоди внаслідок зменшення класу професійного ризику 
         виробництва</b>
         </td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R052G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 5.3</td>
         <td>
         <b>Зменшено утримань</b>
         </td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R053G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 5.3.1</td>
         <td>3,6 %</td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R05301G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 5.3.2</td>
         <td>2,85 %</td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R05302G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 5.3.3</td>
         <td>6,1 %</td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R05303G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 5.3.4</td>
         <td>2,6 %</td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R05304G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
      <td align="center"> 5.3.5</td>
         <td>2 %</td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R05305G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 5.4</td>
         <td>
         <b>Сума виплат, на яку зайво нараховано єдиний внесок</b>
         </td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R054G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center">&nbsp;</td>
         <td>Зміст помилки<br>
            {{#textInput}}DECLAR.DECLARBODY.R054G2S{{{}}}{{/textInput}}
         </td>
         <td align="right">&nbsp;</td>
      </tr>
      <tr>
         <td align="center"> 6</td>
         <td>
         <b>Загальна сума єдиного внеску, що підлягає сплаті, всього (р. 3 + р. 4  – р. 5)<br>
         у тому числі </b>
         </td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R06G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 6.1</td>
         <td>р. 3.1.+ р. 3.5 + р. 4.1.1 + р. 4.1.9 – р. 5.1.1 – р. 5.1.9 (22,0 %, 36,76–49,7 %) </td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R0601G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 6.2</td>
         <td>р. 4.1.2 + р. 4.1.10 – р. 5.1.2 – р. 5.1.10  (36,3 %)</td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R0602G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 6.3</td>
         <td>р. 4.1.3 + р. 4.1.11– р. 5.1.3 – р. 5.1.11  (45,96 %)</td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R0603G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 6.4</td>
         <td>р. 3.2 + р. 4.1.4 – р. 5.1.4  (8,41 %)</td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R0604G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 6.5</td>
         <td>р. 3.3 + р. 4.1.5 – р. 5.1.5 (5,3 %)</td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R0605G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 6.6</td>
         <td>р. 3.4 + р. 4.1.6 – р. 5.1.6 (5,5 %)</td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R0606G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 6.7</td>
         <td>р. 4.1.7 + р. 4.1.12 – р. 5.1.7 – р. 5.1.12 (34,7 %)</td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R0607G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 6.8</td>
         <td>р. 4.1.8 + р. 4.1.13 – р. 5.1.8 - р. 5.1.13 (33,2 %)</td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R0608G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 6.9</td>
         <td>р. 4.3.1– р. 5.3.1 (3,6 %)</td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R0609G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 6.10</td>
         <td>р. 4.3.2 – р. 5.3.2 (2,85 %)</td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R0610G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 6.11</td>
         <td>р. 4.3.3 – р. 5.3.3 (6,1 %)</td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R0611G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 6.12</td>
         <td>р. 4.3.4 – р. 5.3.4 (2,6 %)</td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R0612G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 6.13</td>
         <td>р. 4.3.5 – р. 5.3.5 (2 %)</td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R0613G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
      <tr>
         <td align="center"> 6.14</td>
         <td>р. 4.2 – р. 5.2</td>
         <td align="right">
            {{#currencyInput}}DECLAR.DECLARBODY.R0614G3{{{}}}{{/currencyInput}}
         </td>
      </tr>
   </tbody>
</table>
<table border="0" width="100%">
   <tbody>
      <tr>
         <td>* Для фізичних осіб, які мають відмітку в паспорті про право здійснювати будь-які платежі за серією та номером паспорта.</td>
      </tr>
   </tbody>
</table>
<br>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
   <tbody>
      <tr>
         <td width="85%">Дата формування у страхувальника </td>
         <td align="center" class="td_box" width="10%">
            {{#dateInput}}DECLAR.DECLARBODY.HFILL{{{}}}{{/dateInput}}
         </td>
      </tr>
   </tbody>
</table>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
  <tbody>
    <tr>
      <td width="15%">Керівник  </td>
      <td width="5%">&nbsp;</td>
      <td class="td_box" width="30%">
        {{#textInput}}DECLAR.DECLARBODY.HKBOS{{{}}}{{/textInput}}
      </td>
      <td width="5%">&nbsp;</td>
      <td class="td_unln" width="10%">&nbsp;</td>
      <td width="5%">&nbsp;</td>
      <td class="td_box" width="30%">
         {{#textInput}}DECLAR.DECLARBODY.HBOS{{{}}}{{/textInput}}
      </td>
    </tr>
    <tr>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>(реєстраційний номер облікової картки платника податків та/або серія (за наявності) та номер паспорта*)      </td>
      <td>&nbsp;</td>
      <td align="center">
        <font size="-1">(підпис)</font>
      </td>
      <td>&nbsp;</td>
      <td align="center">
        <font size="-1">        (ініціали та прізвище)  </font>
      </td>
    </tr>
    <tr>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
    </tr>
    <tr>
      <td>Головний бухгалтер</td>
      <td>&nbsp;</td>
      <td class="td_box">
        {{#textInput}}DECLAR.DECLARBODY.HKBUH{{{}}}{{/textInput}}
      </td>
      <td>&nbsp;</td>
      <td class="td_unln">&nbsp;</td>
      <td>&nbsp;</td>
      <td class="td_box">
        {{#textInput}}DECLAR.DECLARBODY.HBUH{{{}}}{{/textInput}}
      </td>
    </tr>
    <tr>
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
