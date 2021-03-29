<script>
  import NumberSpinner from "../../dist/index.js";

  let value1 = 100;
  let value2 = 500;
  let value3 = 3.28;
  let value4 = 0.5;
  let value5 = 0.5;
  let value6 = 50;
  let value6input = value6;
  let value6change = value6;
  let value7 = 0;
</script>


<h2>Svelte Number Spinner Example</h2>

<!-- <input bind:value={name} placeholder="enter your name"> -->

<p>
  Change the values of the number spinners through mousedrag and arrow keys. Press <i>Alt</i> for smaller steps, <i>Alt+Shift</i> for larger steps. Double click to edit.
</p>

<hr>

<div class="row">
  <div class="explanation">Default: no range limits, step = 1<br>Current value is {value1}</div> 
  <div class="right">
    <NumberSpinner bind:value={value1} />
  </div> 
</div>

<hr>

<div class="row">
  <div class="explanation">Range: 0 - 360, vertical = true (dragging and arrow keys up/down will also change the value), circular = true <br>Current value is {value2}</div> 
  <div class="right">
    <NumberSpinner bind:value={value2} min=0 max=360 vertical={true} circular={true} />
  </div> 
</div>

<hr>

<div class="row">
  <div class="explanation">step = 0.01, decimals = 2, precision = 0.001, editOnClick = true<br>Current value is {value3}</div> 
  <div class="right">
    <NumberSpinner bind:value={value3} min=-5 max=5 step=0.01 decimals=2 precision=0.001 editOnClick={true}/>
  </div> 
</div>

<hr>

<div class="row">
  <div class="explanation">Individual styling using props.<br>Current value is {value4}</div> 
  <div class="right">
    <NumberSpinner bind:value={value4} step=10 
        mainStyle='color:#aaa; width:80px; border-radius:20px' 
        focusStyle='color:#06f'
        draggingStyle='border-color:#f00' 
        editingStyle='color:#00f; background-color:#06f4' 
        fastStyle='color:#f00'
        slowStyle='color:#0c0'
        cursor='url(customcursor.png) 16 16, auto'
    />
  </div> 
</div>

<hr>

<div class="row">
  <div class="explanation">Individual styling using custom class.<br>Current value is {value5}</div> 
  <div class="right">
    <NumberSpinner bind:value={value5} min=0 max=1 step=0.001 decimals=3 
        class='number-spinner-custom' 
    />
  </div> 
</div>

<hr>

<div class="row">
  <div class="explanation">
    Get value through input and change events.<br>
    Current input value is {value6input}<br> 
    Current change value is {value6change}
  </div> 
  <div class="right">
    <NumberSpinner value={value6} min=0 max=100 
        on:change={(ev) => {value6change = ev.detail}} 
        on:input={(ev) => {value6input = ev.detail}} 
    />
  </div> 
</div>

<hr>

<div class="row">
  <div class="explanation">
    Test correct updating of the value if changed from outside.<br>
    Current input value is {value7}<br> 
  </div> 
  <div><button on:click={() => {value7--}}>–</button></div>
  <div class="right small-margin">
    <NumberSpinner bind:value={value7} min=0 />
  </div> 
  <div><button on:click={() => {value7++}}>+</button></div>
</div>

<hr>

<!-- ---------------------------------------------------------------- -->

<style>

  hr {
    margin: 20px 0px;
  }

  div {
    display: flex;
  }
  div.row {
    justify-content: space-between;
    align-items: center;
  }
  div.explanation {
    flex-grow: 6;
  }
  div.right {
    margin:0px 40px;
  }
  div.small-margin {
    margin:0px 10px;
  }

  button {
    margin: 5px;
  }

  /* custom class for the number spinner */

  :global(.number-spinner-custom) {
    display: inline-block;
    box-sizing: border-box;
    font-variant-numeric: tabular-nums;
    width: 60px;
    height: 25px;
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
    background-color: #000;
    outline:none;
  }

  :global(.number-spinner-custom).fast {
    background-color: #0ccb;
  }

  :global(.number-spinner-custom).slow {
    background-color: #66fb;
  }

  :global(.number-spinner-custom).editing {
    background-color: #f00;
    cursor: default;
  }


</style>