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

<input type="text" bind:this={inputElement} bind:value contenteditable={false}/>

<!-- CSS --------------------------------------------------------------->
<style>
</style>
