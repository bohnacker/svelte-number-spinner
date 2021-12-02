<script>
  import NumberSpinner from "../../src/index.js";

  let value = 100;

  function keydownHandler(ev) {
    console.log(ev);
  }
  function handleOnSubmit(ev) {
    console.log(ev);
  }
</script>

<!-- ------------------------------------- -->

<svelte:window
  on:keydown={keydownHandler}
/>

<h3>Test App</h3>

<form on:submit={handleOnSubmit}>
  <label for="name">Name:</label>
  <input type="text" name="name" id="name">
  <input type="submit" value="Submit">

  <div class="row">
    <NumberSpinner bind:value />
  </div>
  
</form>




<!-- ------------------------------------- -->
<style>

  div.row {
    padding-top: 30px;
    text-align: center;
  }
  
</style>
