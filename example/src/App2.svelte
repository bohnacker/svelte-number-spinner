<script>
  import NumberSpinner from "../../dist/index.js";
  let value1 = 100;
  let value2 = 33;
  let logs = [];
  
</script>

<!-- ------------------------------------- -->

<div class="row">
  <NumberSpinner bind:value={value1} on:consoleLog={(e) => logs = [{timestamp:Date.now(), msg:e.detail}, ...logs]} />
</div>

<hr>

<div class="row">
  <NumberSpinner bind:value={value2} />
</div>

<hr>


<div class="console">
  {#each logs as log, i}

    {log.msg}<br>

    {#if logs[i+1]?.timestamp < log.timestamp - 200}<br>{/if}
    
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
  }
</style>