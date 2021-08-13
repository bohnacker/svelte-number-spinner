<script>
  import { createEventDispatcher, tick } from "svelte";
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

  function dblclickHandler(ev) {
    editing = true;
    editElement.focus();
    // Don't know, if it's better to select everything by default or not.
    editElement.select(0, 30);
  }

  function touchendHandler(ev) {
    mouseupHandler(ev);
  }
  function mouseupHandler(ev) {
    dragging = false;
  }

  // function focusHandler(ev) {
  //   console.log(inputElement);
  //   inputElement.focus();
  // }
  async function editBlurHandler(ev) {
    editing = false;

    // bring focus back to the drag element if the body was clicked
    setTimeout(() => {
      console.log(document.activeElement);
      if (document.activeElement === document.body) {
        dragElement.focus();
      }
    }, 0);

    // This doesn't work, but would be more elegant svelte-like:
    // await tick();
    // console.log(document.activeElement);
    // if (document.activeElement === document.body) {
    //   dragElement.focus();
    // }
  }
</script>

<!-- DOM --------------------------------------------------------------->

<svelte:window
  on:mouseup|stopPropagation={dragging ? mouseupHandler : ""}
  on:touchend|stopPropagation={dragging ? touchendHandler : ""}
/>

<input
  type="text"
  on:mousedown|stopPropagation={mousedownHandler}
  on:touchstart|stopPropagation={touchstartHandler}
  on:dblclick|stopPropagation={dblclickHandler}
  class="drag"
  class:active={!editing}
  bind:this={dragElement}
  bind:value
  readonly={true}
/>
<input
  class="edit"
  on:blur={editBlurHandler}
  class:active={editing}
  type="text"
  bind:this={editElement}
  bind:value
/>

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
  .drag {
    color: royalblue;
  }
  .edit {
    color: crimson;
  }
</style>
