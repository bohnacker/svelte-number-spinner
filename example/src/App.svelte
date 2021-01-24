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

<p>
  Standard with no range limits and a step of 1: 
  <NumberSpinner bind:value={value1}></NumberSpinner><br>
  Current value is {value1}.
</p>

<p>
  Range from 0 to 1000: 
  <NumberSpinner bind:value={value2} min=0 max=1000></NumberSpinner><br>
  Current value is {value2}.
</p>

<p>
  Steps 0.01 and shows the values with a precision of 2 decimals:
	<NumberSpinner bind:value={value3} min=-5 max=5 step=0.01 decimals=2></NumberSpinner><br>
  Current value is {value3}.
</p>

<p>
  Custom class given for individual styling:
  <NumberSpinner bind:value={value4} min=0 max=1 step=0.001 decimals=3 customClass='number-spinner-custom'></NumberSpinner><br>
  Current value is {value4}.
</p>

<p>
  Retreiving the value using the input and change events:
  <NumberSpinner value={value5} min=0 max=100 on:change={(ev) => {value5change = ev.detail}} on:input={(ev) => {value5input = ev.detail}}></NumberSpinner><br>
  Current input value is {value5input}.<br> 
  Current change value is {value5change}.
</p>





<style>

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
    border-top: 2px solid #fa0;
    padding-top: 1px;
  }

  :global(.number-spinner-custom).slow {
    border-bottom: 2px solid #fa0;
    padding-bottom: 1px;
  }


</style>