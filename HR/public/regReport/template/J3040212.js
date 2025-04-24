module.exports = `
<!--%pageOrientation:landscape-->
<!-- background: aqua -->
<html><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"></head><body><table border="0" width="40%">
<tbody><tr>
<td width="45%">1. Звіт за місяць</td>
<td class="td_box" width="5%">
<input class="edtCss" id="HZM" lz-type="DGMonth" type="textbox" value="">
</td>
<td align="right" width="15%">pік</td>
<td class="td_box" width="5%">
<input class="edtCss" id="HZY" lz-type="DGYear" type="textbox" value="">
</td>
</tr>
</tbody></table>
<table border="0" width="80%">
<tbody><tr>
<td width="15%">2. Код за ЄДРПОУ або податковий номер/ серія (за наявності) та/або номер паспорта страхувальника.</td>
<td class="td_box" width="10%">
<input class="edtCss" id="HTIN" lz-type="DGHTINJ" type="textbox" value="">
</td>
</tr>
<tr>
<td width="15%">3. Код за ЄДРПОУ або податковий номер/ серія (за наявності) та/або номер паспорта ліквідованого/припиненого страхувальника (заповнюється у разі подання звіту правонаступником)</td>
<td class="td_box" width="10%">
<input class="edtCss" id="HTIN1" lz-minoccurs="0" lz-nillable="true" lz-type="DGLong" type="textbox" value="">
</td>
</tr>
</tbody></table>
<table border="0" cellspacing="4" width="100%">
<tbody><tr>
<td width="10%">
<b>Страхувальник </b>
</td>
<td class="td_box">
<input id="HNAME" lz-type="DGHNAME" style="width:100%;" value="">
</td>
</tr>
<tr>
<td>&nbsp;</td>
<td align="center">(найменування страхувальника) </td>
</tr>
</tbody></table>
<br>
<table border="0" width="100%">
<tbody><tr align="center">
<td>
<b>Таблиця 2. Нарахування єдиного внеску на загальнообов'язкове державне соціальне страхування 
за деякі категорії застрахованих осіб </b>
<br>
(заповнюється районними (міськими) управліннями праці та соціального захисту населення)  </td>
</tr>
</tbody></table>
<table border="0" width="100%">
<tbody><tr align="center">
<td>
<b>Розділ I </b>
</td>
</tr>
</tbody></table>
<table border="1" bordercolor="black" cellspacing="0" width="100%">
<tbody><tr>
<td align="center" rowspan="2" width="5%"> № з/п</td>
<td align="center" rowspan="2" width="55%"> Назва показника</td>
<td align="center" rowspan="2" width="10%">Кількість осіб, яким нарахована виплата у звітному місяці </td>
<td align="center" colspan="3">Нараховано єдиного внеску (грн.) </td>
</tr>
<tr>
<td align="center" width="10%"> у звітному місяці </td>
<td align="center" width="10%">у  тому числі   за попередні звітні  періоди  </td>
<td align="center" width="10%">з початку року  </td>
</tr>
<tr>
<td align="center"> 1 </td>
<td align="center"> 2 </td>
<td align="center"> 3 </td>
<td align="center"> 4 </td>
<td align="center"> 5 </td>
<td align="center"> 6 </td>
</tr>
<tr>
<td align="center"> 1</td>
<td> Особи, які доглядають за дитиною до досягнення нею трирічного віку та/або при народженні дитини 
та відповідно до закону отримують допомогу по догляду за дитиною до досягнення нею трирічного віку та/або 
при народженні дитини, усиновленні дитини</td>
<td align="right">
<input class="edtCss" descr_eq="" expr_eq="CountUniques(true,&#39;J3040612.T1RXXXXG8S&#39;,&#39;^J3040612.T1RXXXXG9==20&#39;)" id="R0101G3" lz-minoccurs="0" lz-nillable="true" lz-type="xs:nonNegativeInteger" type="textbox" value="">
</td>
<td align="right">
<input class="edtCss" descr_eq="" expr_eq="SUMF($(^J3040612.T1RXXXXG9==20)?^J3040612.T1RXXXXG17:&#39;&#39;$)" id="R0101G4" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">
</td>
<td align="right">
<input class="edtCss" id="R0101G5" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">
</td>
<td align="right">
<input class="edtCss" id="R0101G6" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">
</td>
</tr>
<tr>
<td align="center"> 2</td>
<td>Непрацюючі працездатні батьки, усиновителі, опікуни, піклувальники, які фактично здійснюють догляд 
за дитиною з інвалідністю та отримують допомогу, надбавку або компенсацію відповідно до законодавства </td>
<td align="right">
<input class="edtCss" descr_eq="" expr_eq="CountUniques(true,&#39;J3040612.T1RXXXXG8S&#39;,&#39;^J3040612.T1RXXXXG9==21&#39;)" id="R0102G3" lz-minoccurs="0" lz-nillable="true" lz-type="xs:nonNegativeInteger" type="textbox" value="">
</td>
<td align="right">
<input class="edtCss" descr_eq="" expr_eq="SUMF($(^J3040612.T1RXXXXG9==21)?^J3040612.T1RXXXXG17:&#39;&#39;$)" id="R0102G4" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">
</td>
<td align="right">
<input class="edtCss" id="R0102G5" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">
</td>
<td align="right">
<input class="edtCss" id="R0102G6" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">
</td>
</tr>
<tr>
<td align="center"> 3</td>
<td> Непрацюючі працездатні особи, що здійснюють догляд за особою з інвалідністю I групи та отримують допомогу, 
надбавку  або компенсацію відповідно до законодавства  </td>
<td align="right">
<input class="edtCss" descr_eq="" expr_eq="CountUniques(true,&#39;J3040612.T1RXXXXG8S&#39;,&#39;^J3040612.T1RXXXXG9==33&#39;)" id="R0103G3" lz-minoccurs="0" lz-nillable="true" lz-type="xs:nonNegativeInteger" type="textbox" value="">
</td>
<td align="right">
<input class="edtCss" descr_eq="" expr_eq="SUMF($(^J3040612.T1RXXXXG9==33)?^J3040612.T1RXXXXG17:&#39;&#39;$)" id="R0103G4" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">
</td>
<td align="right">
<input class="edtCss" id="R0103G5" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">
</td>
<td align="right">
<input class="edtCss" id="R0103G6" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">
</td>
</tr>
<tr>
<td align="center"> 4</td>
<td> Непрацюючі працездатні особи, які здійснюють догляд за особою похилого віку, яка за висновком медичного 
закладу потребує постійного стороннього догляду або досягла 80-річного віку, та отримують допомогу, надбавку або 
компенсацію відповідно до законодавства  </td>
<td align="right">
<input class="edtCss" descr_eq="" expr_eq="CountUniques(true,&#39;J3040612.T1RXXXXG8S&#39;,&#39;^J3040612.T1RXXXXG9==34&#39;)" id="R0104G3" lz-minoccurs="0" lz-nillable="true" lz-type="xs:nonNegativeInteger" type="textbox" value="">
</td>
<td align="right">
<input class="edtCss" descr_eq="" expr_eq="SUMF($(^J3040612.T1RXXXXG9==34)?^J3040612.T1RXXXXG17:&#39;&#39;$)" id="R0104G4" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">
</td>
<td align="right">
<input class="edtCss" id="R0104G5" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">
</td>
<td align="right">
<input class="edtCss" id="R0104G6" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">
</td>
</tr>
<tr>
<td align="center"> 5</td>
<td>
<b>Разом (рядки 1 + 2 + 3 + 4) </b>
</td>
<td align="center"> X    </td>
<td align="right">
<input class="edtCss" descr_eq="Розділ I. Рядок 5 кол.4 =  р.1 кол.4 + р.2 кол.4 + р.3 кол.4 + р.4 кол.4" expr_eq="^R0101G4+^R0102G4+^R0103G4+^R0104G4" id="R0105G4" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">
</td>
<td align="right">
<input class="edtCss" descr_eq="Розділ I. Рядок 5 кол.5 =  р.1 кол.5 + р.2 кол.5 + р.3 кол.5 + р.4 кол.5" expr_eq="^R0101G5+^R0102G5+^R0103G5+^R0104G5" id="R0105G5" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">
</td>
<td align="right">
<input class="edtCss" descr_eq="Розділ I. Рядок 5 кол.6 =  р.1 кол.6 + р.2 кол.6 + р.3 кол.6 + р.4 кол.6" expr_eq="^R0101G6+^R0102G6+^R0103G6+^R0104G6" id="R0105G6" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">
</td>
</tr>
<tr>
<td align="center"> 6</td>
<td>
<b>Патронатні вихователі, батьки-вихователі дитячих будинків сімейного  типу та прийомні батьки, що 
отримують грошове забезпечення відповідно до законодавства, у тому числі </b>
</td>
<td align="right">
<input class="edtCss" id="R0106G3" lz-minoccurs="0" lz-nillable="true" lz-type="xs:nonNegativeInteger" type="textbox" value="">
</td>
<td align="center"> X    </td>
<td align="center"> X    </td>
<td align="center"> X    </td>
</tr>
<tr>
<td align="center"> 6.1</td>
<td>
<b>Патронатні вихователі, батьки-вихователі дитячих будинків сімейного типу та прийомні батьки, 
що отримують грошове забезпечення відповідно до законодавства, які не працюють </b>
</td>
<td align="right">
<input class="edtCss" id="R01061G3" lz-minoccurs="0" lz-nillable="true" lz-type="xs:nonNegativeInteger" type="textbox" value="">
</td>
<td align="center"> X    </td>
<td align="center"> X    </td>
<td align="center"> X    </td>
</tr>
</tbody></table>
<br>
<table border="0" width="100%">
<tbody><tr align="center">
<td colspan="6">
<b>Розділ II </b>
<br>
Розрахунок суми єдиного внеску, що підлягає сплаті за патронатних вихователів, батьків-вихователів та прийомних батьків </td>
</tr>
</tbody></table>
<table border="1" bordercolor="black" cellspacing="0" width="100%">
<tbody><tr>
<td align="center" width="5%"> № з/п</td>
<td align="center" width="85%"> Назва показника</td>
<td align="center" width="10%">Сума </td>
</tr>
<tr>
<td align="center"> 1 </td>
<td align="center"> 2 </td>
<td align="center"> 3 </td>
</tr>
<tr>
<td align="center"> 1</td>
<td> Сума грошового забезпечення, на яку нараховується єдиний внесок   </td>
<td align="right">
<input class="edtCss" id="R0201G3" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">
</td>
</tr>
<tr>
<td align="center"> 2</td>
<td> Нараховано єдиного внеску   </td>
<td align="right">
<input class="edtCss" id="R0202G3" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">
</td>
</tr>
<tr>
<td align="center"> 3</td>
<td> Збільшено єдиний внесок за попередні звітні періоди  </td>
<td align="right">
<input class="edtCss" id="R0203G3" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">
</td>
</tr>
<tr>
<td align="center"> 3.1</td>
<td> Сума грошового забезпечення, на яку збільшено єдиний внесок </td>
<td align="right">
<input class="edtCss" id="R02031G3" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">
</td>
</tr>
<tr>
<td align="center"> 4</td>
<td> Зменшено єдиний внесок за попередні звітні періоди   </td>
<td align="right">
<input class="edtCss" id="R0204G3" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">
</td>
</tr>
<tr>
<td align="center"> 4.1</td>
<td> Сума грошового забезпечення, на яку зменшено єдиний внесок</td>
<td align="right">
<input class="edtCss" id="R02041G3" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">
</td>
</tr>
<tr>
<td align="center"> 5</td>
<td>
<b>Разом (рядки 2 + 3 - 4)</b>
</td>
<td align="right">
<input class="edtCss" descr_eq="Розділ II. Рядок 5 =  ряд.2 + ряд.3 - ряд.4" expr_eq="^R0202G3+^R0203G3-^R0204G3" id="R0205G3" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">
</td>
</tr>
</tbody></table>
<table border="0" width="100%">
<tbody><tr>
<td>* Для фізичних осіб, які мають відмітку в паспорті про право здійснювати будь-які платежі за серією 
та номером паспорта. </td>
</tr>
</tbody></table>
<table border="0" width="40%">
<tbody><tr>
<td width="85%">Дата формування у страхувальника </td>
<td align="center" class="td_box" width="10%">
<input class="edtCss" id="HFILL" lz-type="DGDate" type="textbox" value="">
</td>
</tr>
</tbody></table>
<table border="0" width="100%">
<tbody><tr>
<td width="15%">Керівник  </td>
<td width="5%">&nbsp;</td>
<td class="td_box" width="15%">
<input class="edtCss" id="HKBOS" lz-type="DGLong" type="textbox" value="">
</td>
<td width="5%">&nbsp;</td>
<td class="td_unln" width="10%">&nbsp;</td>
<td width="5%">&nbsp;</td>
<td class="td_box" width="45%">
<input id="HBOS" lz-type="DGHBOS" style="width:100%;" value="">
</td>
</tr>
<tr>
<td>&nbsp;</td>
<td>&nbsp;</td>
<td>(податковий номер/серія (за наявності) та/або номер паспорта*)        </td>
<td>&nbsp;</td>
<td align="center">
<font size="-1">(підпис)</font>
</td>
<td>&nbsp;</td>
<td align="center">
<font size="-1">(ініціали та прізвище)  </font>
</td>
</tr>
<tr>
<td>М. П. <br> (за наявності) </td>
<td>&nbsp;</td>
<td>&nbsp;</td>
<td>&nbsp;</td>
<td>&nbsp;</td>
</tr>
<tr>
<td>Головний бухгалтер</td>
<td>&nbsp;</td>
<td class="td_box">
<input class="edtCss" id="HKBUH" lz-minoccurs="0" lz-nillable="true" lz-type="DGLong" type="textbox" value="">
</td>
<td>&nbsp;</td>
<td class="td_unln">&nbsp;</td>
<td>&nbsp;</td>
<td class="td_box">
<input id="HBUH" lz-minoccurs="0" lz-nillable="true" lz-type="DGHBUH" style="width:100%;" value="">
</td>
</tr>
<tr>
<td>&nbsp;</td>
<td>&nbsp;</td>
<td>(податковий номер/серія (за наявності) та/або номер паспорта*)       </td>
<td>&nbsp;</td>
<td align="center">
<font size="-1">(підпис)</font>
</td>
<td>&nbsp;</td>
<td align="center">
<font size="-1">(ініціали та прізвище)  </font>
</td>
</tr>
</tbody></table>
</body></html>`
