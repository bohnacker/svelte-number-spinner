<script>
  import { createEventDispatcher, tick } from "svelte";
  const dispatch = createEventDispatcher();

  export let value = 0;
  // export let min = -Number.MAX_VALUE;
  // export let max = Number.MAX_VALUE;
  // export let step = 1;

  let isTouchDevice = false;

  let dragging = false;
  let editing = false;
  let dragElement, editElement;
  let dragFocussed = false;
  let editFocussed = false;

  function touchstartHandler(ev) {
    isTouchDevice = true;
    mousedownHandler(ev);
  }
  function mousedownHandler(ev) {
    dragging = true;
    dragElement.focus();
  }

  async function dblclickHandler(ev) {
    editing = true;
    await tick();
    editElement.focus();
    // Don't know, if it's better to select everything by default or not.
    editElement.select();
    // editElement.setSelectionRange(0, 30);
  }

  function touchendHandler(ev) {
    mouseupHandler(ev);
  }
  function mouseupHandler(ev) {
    dragging = false;
  }

  function dragFocusHandler(ev) {
    dragFocussed = true;
  }
  function dragBlurHandler(ev) {
    dragFocussed = false;
  }
  function editFocusHandler(ev) {
    editFocussed = true;
  }

  async function editBlurHandler(ev) {
    //console.log(ev);
    editFocussed = false;
    editing = false;

    // bring focus back to the drag element if the body was clicked
    setTimeout(() => {
      console.log(document.activeElement);
      dispatch('consoleLog', ev.type);
      dispatch('consoleLog', document.activeElement);

      if (document.activeElement === document.body || document.activeElement === editElement) {
        dragElement.focus();
      }
    }, 0);

    // This doesn't work (maybe document.activeElement is updated even later), but would be more elegant svelte-like:
    // await tick();
    // console.log(document.activeElement);
    // if (document.activeElement === document.body) {
    //   dragElement.focus();
    // }
  }

  function startEditing() {

  }

  function stopEditing() {
    
  }

</script>

<!-- DOM --------------------------------------------------------------->

<svelte:window
  on:mouseup|stopPropagation={dragging ? mouseupHandler : editBlurHandler}
  on:touchend|stopPropagation={dragging ? touchendHandler : editBlurHandler}
/>

<input
  type="text"
  on:mousedown|stopPropagation={mousedownHandler}
  on:touchstart|stopPropagation={touchstartHandler}
  on:dblclick|stopPropagation={dblclickHandler}
  on:focus={dragFocusHandler}
  on:blur={dragBlurHandler}
  class="drag"
  class:active={!editing}
  class:focus={dragFocussed}
  bind:this={dragElement}
  bind:value
  readonly={true}
  tabindex="0"
/>
<input
  class="edit"
  on:focus={editFocusHandler}
  on:blur={editBlurHandler}
  class:active={editing}
  class:focus={editFocussed}
  type="text"
  bind:this={editElement}
  bind:value
/>

<!-- CSS --------------------------------------------------------------->
<style>
  input {
    display: none;
    width: 120px;
    box-sizing: border-box;
    padding: 5px;
  }

  .focus {
    border: 2px solid dodgerblue;
    padding: 4px;
    outline: none; /* removes the standard focus border */
  }

  .drag {
    user-select: none;
    color: royalblue;
  }
  .edit {
    color: crimson;
  }

  .active {
    display: inline-block;
  }
</style>
