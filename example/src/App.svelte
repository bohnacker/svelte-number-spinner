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
  let value8 = -2.5;
  let options = { min: -5.5, max: 5.5, step: 1, keyStep: 1, keyStepFast: 2, decimals: 1, speed: 0.04 };
  let value9 = 12 * 60;
  
  // Callback functions for example 9

  // Takes the actual value and returns a formatted time string
  function formatMinutesToTime(minutes) {
    let hours = Math.floor(minutes / 60);
    minutes = minutes % 60;
    return hours.toString().padStart(2, "0") + ":" + minutes.toString().padStart(2, "0");
  }
  function parseTimeToMinutes(timeString) {
    let res = timeString.split(":");
    let hours = parseInt(res[0]);
    hours = Math.min(Math.max(hours, 0), 23);
    let minutes = res[1] ? parseInt(res[1]) : 0;
    minutes = Math.min(Math.max(minutes, 0), 59);
    return hours * 60 + minutes;
  }
</script>

<main>
  <h2>Svelte Number Spinner Example</h2>

  <p>
    Change the values of the number spinners through mousedrag and arrow keys. Press <i>Alt</i> for
    smaller steps, <i>Alt+Shift</i> for larger steps. Click without dragging to edit.
  </p>

  <hr />

  <div class="row">
    <div class="explanation">Default: no range limits, step = 1<br />Current value is {value1}</div>
    <div class="right">
      <NumberSpinner bind:value={value1} />
    </div>
  </div>

  <hr />

  <div class="row">
    <div class="explanation">
      Range: 0 - 360, vertical = true (dragging and arrow keys up/down will also change the value),
      circular = true <br />Current value is {value2}
    </div>
    <div class="right">
      <NumberSpinner bind:value={value2} min="0" max="360" vertical={true} circular={true} />
    </div>
  </div>

  <hr />

  <div class="row">
    <div class="explanation">
      step = 0.01, decimals = 2, precision = 0.001<br />Current value is {value3}
    </div>
    <div class="right">
      <NumberSpinner
        bind:value={value3}
        min="-5"
        max="5"
        step="0.01"
        decimals="2"
        precision="0.001"
        editOnClick={true}
      />
    </div>
  </div>

  <hr />

  <div class="row">
    <div class="explanation">Individual styling using props.<br />Current value is {value4}</div>
    <div class="right">
      <NumberSpinner
        bind:value={value4}
        step="10"
        mainStyle="color:#aaa; width:80px; border-radius:20px"
        focusStyle="color:#06f"
        draggingStyle="border-color:#f00"
        editingStyle="color:#00f; background-color:#06f4"
        fastStyle="color:#f00"
        slowStyle="color:#0c0"
        cursor="url(customcursor.png) 16 16, auto"
      />
    </div>
  </div>

  <hr />

  <div class="row">
    <div class="explanation">
      Individual styling using custom class.<br />Current value is {value5}
    </div>
    <div class="right">
      <NumberSpinner
        bind:value={value5}
        min="0"
        max="1"
        step="0.001"
        decimals="3"
        class="number-spinner-custom"
      />
    </div>
  </div>

  <hr />

  <div class="row">
    <div class="explanation">
      Get value through input and change events.<br />
      Current input value is {value6input}<br />
      Current change value is {value6change}
    </div>
    <div class="right">
      <NumberSpinner
        value={value6}
        min="-100"
        max="100"
        on:change={(ev) => {
          value6change = ev.detail;
        }}
        on:input={(ev) => {
          value6input = ev.detail;
        }}
      />
    </div>
  </div>

  <hr />

  <div class="row">
    <div class="explanation">
      Test correct updating of the value if changed from outside.<br />
      Current value is {value7}<br />
    </div>
    <div>
      <button
        on:click={() => {
          value7--;
        }}>–</button
      >
    </div>
    <div class="right small-margin">
      <NumberSpinner bind:value={value7} min="0" max="12" circular={true} />
    </div>
    <div>
      <button
        on:click={() => {
          value7++;
        }}>+</button
      >
    </div>
  </div>

  <hr />

  <div class="row">
    <div class="explanation">
      Giving some of the props by options object.<br />
      {`{ min: -5.5, max: 5.5, step: 1, keyStep: 1, keyStepFast: 2, decimals: 1, speed: 0.04 }`}<br />
      Current value is {value8}
    </div>
    <div class="right">
      <NumberSpinner bind:value={value8} {options} />
    </div>
  </div>

  <hr />

  <div class="row">
    <div class="explanation">
      Using a callback to format and parse the displayed value.<br />Current value is {value9}
    </div>
    <div class="right">
      <NumberSpinner bind:value={value9} min={0} max={1440} keyStep={15} keyStepSlow={1} keyStepFast={60} circular={true} format={formatMinutesToTime} parse={parseTimeToMinutes}/>
    </div>
  </div>

  <hr />
</main>

<!-- ---------------------------------------------------------------- -->
<style>
  main {
    max-width: 600px;
  }

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
    margin: 0px 40px;
  }
  div.small-margin {
    margin: 0px 10px;
  }

  button {
    margin: 5px;
    height: 1.6em;
    padding: 0 0.4em;
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
    outline: none;
  }

  :global(.number-spinner-custom.fast) {
    background-color: #0ccb;
  }

  :global(.number-spinner-custom.slow) {
    background-color: #66fb;
  }

  :global(.number-spinner-custom.editing) {
    background-color: #f00;
    cursor: default;
  }
</style>
