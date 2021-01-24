<script>
	import NumberSpinner from "../../dist/index.js";

  let value1 = 100;
  let value2 = 500;
  let value3 = 3.28;
  let value4 = 0.5;
  let value5 = 50;
  let value5input = value5;
  let value5change = value5;

</script>

<h2>Svelte Number Spinner Example</h2>

<p>
  Change the values of the number spinners through mousedrag and arrow keys.<br>
  Press 'Alt' for smaller steps, 'Shift' for larger steps. Double click to edit.
</p>

<table>
  <tr>
    <td>Standard with no range limits and a step of 1</td> 
    <td><NumberSpinner bind:value={value1}></NumberSpinner></td> 
    <td>Current value is {value1}</td> 
  </tr>

  <tr>
    <td>Range from 0 to 1000 and only horizontal dragging and arrow keys left/right will change the value</td>  
    <td><NumberSpinner bind:value={value2} min=0 max=1000 vertical={false}></NumberSpinner></td> 
    <td>Current value is {value2}</td> 
  </tr>

  <tr>
    <td>Steps 0.01 and shows the values with a precision of 2 decimals</td> 
  	<td><NumberSpinner bind:value={value3} min=-5 max=5 step=0.01 decimals=2></NumberSpinner></td> 
    <td>Current value is {value3}</td> 
  </tr>

  <tr>
    <td>Custom class given for individual styling:</td> 
    <td><NumberSpinner bind:value={value4} min=0 max=1 step=0.001 decimals=3 class='number-spinner-custom'></NumberSpinner></td> 
    <td>Current value is {value4}</td> 
  </tr>

  <tr>
    <td>Retreiving the value using the input and change events</td> 
    <td><NumberSpinner value={value5} min=0 max=100 on:change={(ev) => {value5change = ev.detail}} on:input={(ev) => {value5input = ev.detail}}></NumberSpinner></td> 
    <td>Current input value is {value5input}<br> 
    Current change value is {value5change}</td> 
  </tr>


</table>



<style>

  table {
    width: 700px;
    margin-top: 30px;
    padding: 0px;
    table-layout: fixed;
    overflow-x:auto;
    border-collapse: collapse;
  }

  tr {
    border-top: 1px solid #0006;
    border-bottom: 1px solid #0006;
  }

  td {
    margin: 0px;
    padding: 10px 0px;
  }

  td:nth-child(1) {
    width: 50%; 
  }
  td:nth-child(2) {
    width: 20%; 
    text-align: center;
  }
  td:nth-child(3) {
    width: 30%; 
  }

  /* custom class for the number spinner */

  :global(.number-spinner-custom) {
    display: inline-block;
    box-sizing: border-box;
    font-variant-numeric: tabular-nums;
    margin: 0px;
    padding: 3px;
    background-color: #06f9;
    color: white;
    border-radius: 0px;
    border: none;
    text-align: right;
    cursor: initial;
  }

  :global(.number-spinner-custom):focus {
    background-color: #06fb;
    outline-width: 0;
    outline:none;
  }

  :global(.number-spinner-custom).editing {
    background-color: #f00;
    cursor: default;
  }

  :global(.number-spinner-custom)::selection {
    background: #fffa;
  }

  :global(.number-spinner-custom).fast {
    background-color: #0ccb;
  }

  :global(.number-spinner-custom).slow {
    background-color: #66fb;
  }


</style>