<script>
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();

  export let value = 0;
  // export let min = -Number.MAX_VALUE;
  // export let max = Number.MAX_VALUE;
  // export let step = 1;

  let inputElement;

  function focusHandler(ev) {
    console.log(inputElement);
    inputElement.focus();
  }
  function blurHandler(ev) {
    console.log(inputElement);
    inputElement.blur();
  }
</script>

<!-- DOM --------------------------------------------------------------->

<button on:click={focusHandler}>Focus</button>
<button on:click={blurHandler}>Blur</button>
<input type="text" bind:this={inputElement} bind:value />

<!-- CSS --------------------------------------------------------------->
<style>
</style>
