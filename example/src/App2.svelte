<script>
	import NumberSpinner from "../../dist/index.js";

  let value1 = 100;
  let logs = [];
  
</script>

<!-- ------------------------------------- -->

<div class="row">
  <NumberSpinner bind:value={value1} on:consoleLog={(e) => logs = [...logs, e.detail]} />
</div>

<hr>

<div class="console">
  {#each logs as log}
    {log}<br>
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
    font-size: 10px;
    /*margin:0px 40px;*/

  }

</style>