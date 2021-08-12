<script>
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();

  export let value = 0;
  // export let min = -Number.MAX_VALUE;
  // export let max = Number.MAX_VALUE;
  // export let step = 1;

  let dragging = false;
  let editing = false;
  let inputElement;

  // just for initialisation
  $: if (inputElement) {
    inputElement.readOnly = true;
    inputElement.style.userSelect = "none";
  }

  function mousedownHandler(ev) {
    dragging = true;
    console.log(dragging);
  }
  function touchstartHandler(ev) {
    dragging = true;
    console.log(dragging);
  }

  function mouseupHandler(ev) {
    dragging = false;

   // inputElement.blur();
    inputElement.readOnly = false;
    inputElement.style.userSelect = "";
    inputElement.contentEditable = true;
   // inputElement.focus();

    console.log(inputElement);
  }
  function touchendHandler(ev) {
    dragging = false;

    inputElement.blur();
    inputElement.readOnly = false;
    inputElement.style.userSelect = "";
    inputElement.focus();

    console.log(dragging);
  }

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

<svelte:window
  on:mouseup={dragging ? mouseupHandler : ""}
  on:touchend={dragging ? touchendHandler : ""}
/>

<input
  type="text"
  bind:value
  on:mousedown={mousedownHandler}
  on:touchstart={touchstartHandler}
  bind:this={inputElement}
/>

<!-- CSS --------------------------------------------------------------->
<style>
</style>
