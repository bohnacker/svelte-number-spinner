<script>
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();

  export let value = 0;
  // export let min = -Number.MAX_VALUE;
  // export let max = Number.MAX_VALUE;
  // export let step = 1;

  let dragging = false;
  let editing = false;
  let isTouchDevice = false;
  let dragElement, editElement;

  function touchstartHandler(ev) {
    isTouchDevice = true;
    mousedownHandler(ev);
  }
  function mousedownHandler(ev) {
    dragging = true;
  }

  function touchendHandler(ev) {
    mouseupHandler(ev);
  }
  function mouseupHandler(ev) {
    dragging = false;
    editing = true;
    editElement.focus();
  }

  // function focusHandler(ev) {
  //   console.log(inputElement);
  //   inputElement.focus();
  // }
  // function blurHandler(ev) {
  //   console.log(inputElement);
  //   inputElement.blur();
  // }
</script>

<!-- DOM --------------------------------------------------------------->

<svelte:window 
on:mouseup|stopPropagation={mouseupHandler}
on:touchend|stopPropagation={touchendHandler}

/>

<input
  type="text"
  on:mousedown|stopPropagation={mousedownHandler}
  on:touchstart|stopPropagation={touchstartHandler}
  class="drag"
  class:active={!editing}
  bind:this={dragElement}
  bind:value
  readonly={true}
/>
<input class="edit" class:active={editing} type="text" bind:this={editElement} bind:value />

<!-- CSS --------------------------------------------------------------->
<style>
  input {
    display: inline-block;
    width: 120px;
    opacity: 0.3;
  }
  input.drag {
    user-select: none;
  }

  .active {
    opacity: 1;
  }
</style>
