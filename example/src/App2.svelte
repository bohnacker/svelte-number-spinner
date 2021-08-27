<script>
  import NumberSpinner from "../../src/index.js";
  let showSpinner = true;
  let value1 = 100;
  let value2 = 33;
  let logs = [];
</script>

<!-- ------------------------------------- -->

<h3>Test App</h3>
<p>
  The first number spinner listens to custom logging events and displays them on screen for faster
  debugging on mobile devices.
</p>

<hr />

<label>
  <input type="checkbox" bind:checked={showSpinner} />
  Show Spinner
</label>

{#if showSpinner}
  <div class="row">
    <NumberSpinner
      bind:value={value1}
      on:consoleLog={(ev) => (logs = [{ timestamp: Date.now(), msg: ev.detail }, ...logs])}
      on:keydown={(ev) => {
        logs = [{ timestamp: Date.now(), msg: "keydown key: " + ev.key }, ...logs];
      }}
      on:keypress={(ev) => {
        logs = [{ timestamp: Date.now(), msg: "keypress key: " + ev.key }, ...logs];
      }}
      on:keyup={(ev) => {
        logs = [{ timestamp: Date.now(), msg: "keyup key: " + ev.key }, ...logs];
      }}
      on:editstart={(ev) => {
        logs = [{ timestamp: Date.now(), msg: "editstart" }, ...logs];
      }}
      on:editend={(ev) => {
        logs = [{ timestamp: Date.now(), msg: "editend" }, ...logs];
      }}
    />
  </div>
{/if}

<hr />

<div class="row">
  <NumberSpinner bind:value={value2} />
</div>

<hr />

<input type="text" value="Some other normal input field" />

<div class="console">
  {#each logs as log, i}
    {new Date(log.timestamp).toLocaleTimeString("de-DE")}.{(log.timestamp % 1000)
      .toString()
      .padStart(3, "0")} – {log.msg}<br />

    {#if logs[i + 1]?.timestamp < log.timestamp - 200}<br />{/if}
  {/each}
</div>

<!-- ------------------------------------- -->
<style>
  hr {
    margin: 20px 0px;
  }
  div.row {
    padding-top: 30px;
    text-align: center;
  }
  div.console {
    /*margin:0px 40px;*/
    font-size: 9px;
    line-height: 1.2em;
  }
</style>
