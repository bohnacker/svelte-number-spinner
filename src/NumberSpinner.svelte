<script>
  import { createEventDispatcher } from 'svelte';

  export let value = 0;

  let editElement;
  let dragElement;

  // update readonly state of input element
  $: if (dragElement) {
    // dragElement.readOnly = !editing;
    dragElement.readOnly = true;
  }
</script>

<!-- DOM --------------------------------------------------------------->

<svelte:window />

<!-- this is the editable input field -->
<input id="edit" type="text" class:default={true} tabindex="-1" bind:this={editElement} bind:value />

<!-- this is the input field controlled by mouse and touch drag events -->
<input id="drag" type="text" class:default={true} contenteditable={'false'} tabindex="0" bind:this={dragElement} bind:value />

<!-- CSS --------------------------------------------------------------->
<style>
  .default {
    display: inline-block;
    box-sizing: border-box;
    font-variant-numeric: tabular-nums;
    background-color: white;
    color: black;
    width: 4em;
    height: 1.6em;
    margin: 0px;
    padding: 5px;
    border: 1 solid #0004;
    border-radius: 4px;
    text-align: right;
    cursor: initial; /* get rid of the caret cursor in non-editing mode */
  }

  input#drag {
    cursor: initial; /* get rid of the caret cursor in non-editing mode */
    user-select: none;
  }

  input:not(.editing)::selection {
    background: #0000;
  }

  input#edit {
    user-select: text;
  }
</style>
