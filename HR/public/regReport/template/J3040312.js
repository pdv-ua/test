module.exports = `
<!--%pageOrientation:landscape-->
<!-- background: aqua -->
<html><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"></head><body><table border="0" width="40%">
<tbody><tr>
<td width="35%">1. Звіт за місяць</td>
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
<td width="15%">2. Код за ЄДРПОУ або податковий  номер/серія (за наявності) та/або номер паспорта страхувальника*</td>
<td class="td_box" width="10%">
<input class="edtCss" id="HTIN" lz-type="DGHTINJ" type="textbox" value="">
</td>
</tr>
<tr>
<td width="15%">. Код за ЄДРПОУ або податковий  номер/серія (за наявності) та/або номер паспорта 
ліквідованого/припиненого страхувальника  (заповнюється у разі подачі звіту правонаступником)       </td>
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
<b>Таблиця 3. Нарахування єдиного внеску на загальнообов'язкове державне 
соціальне страхування за осіб, які проходять строкову військову службу </b>
</td>
</tr>
</tbody></table>
<table border="1" bordercolor="black" cellspacing="0" width="100%">
<tbody><tr>
<td align="center" rowspan="2" width="55%"> Назва показника</td>
<td align="center" rowspan="2" width="10%">Кількість осіб, яким нараховане грошове забезпечення у звітному місяці  </td>
<td align="center" colspan="3">Нараховано єдиного внеску (грн.) </td>
</tr>
<tr>
<td align="center" width="10%"> у звітному місяці </td>
<td align="center" width="10%"> у  тому числі   за попередні звітні  періоди  </td>
<td align="center" width="10%"> з початку року  </td>
</tr>
<tr>
<td align="center"> 1 </td>
<td align="center"> 2 </td>
<td align="center"> 3 </td>
<td align="center"> 4 </td>
<td align="center"> 5 </td>
</tr>
<tr>
<td> Особи, які проходять строкову військову службу у Збройних Силах України, інших утворених відповідно 
до закону військових формуваннях, Службі безпеки України та службу в органах і підрозділах цивільного захисту</td>
<td align="right">
<input class="edtCss" descr_eq="" expr_eq="CountUniques(false,&#39;J3040612.T1RXXXXG8&#39;,&#39;^J3040612.T1RXXXXG8&#39;)" id="R01G2" lz-minoccurs="0" lz-nillable="true" lz-type="xs:nonNegativeInteger" type="textbox" value="">
</td>
<td align="right">
<input class="edtCss" descr_eq="" expr_eq="^J3040912.R01G14)" id="R01G3" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">
</td>
<td align="right">
<input class="edtCss" id="R01G4" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">
</td>
<td align="right">
<input class="edtCss" id="R01G5" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">
</td>
</tr>
</tbody></table>
<br>
<table border="0" width="100%">
<tbody><tr>
<td>* Для фізичних осіб, які мають відмітку в паспорті про право здійснювати будь-які платежі за серією 
та номером паспорта.</td>
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
<td>(податковий номер або серія (за наявності) та/або номер паспорта*)       </td>
<td>&nbsp;</td>
<td align="center">
<font size="-1">(підпис)</font>
</td>
<td>&nbsp;</td>
<td align="center">
<font size="-1">(ініціали та прізвище)</font>
</td>
</tr>
<tr>
<td>М. П. <br> (за наявності)</td>
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
<td>(податковий номер або серія (за наявності) та/або номер паспорта*)       </td>
<td>&nbsp;</td>
<td align="center">
<font size="-1">(підпис)</font>
</td>
<td>&nbsp;</td>
<td align="center">
<font size="-1">(ініціали та прізвище)</font>
</td>
</tr>
</tbody></table>
</body></html>
`
