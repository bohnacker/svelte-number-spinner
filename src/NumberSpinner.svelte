<script>
  import { createEventDispatcher, afterUpdate, tick } from 'svelte';

  export let value = 0;

  let editElement;
  let dragElement;

  // afterUpdate(() => {
  //   console.log(dragElement);
  // });

  // update readonly state of input element
  $: if (dragElement) {
    console.log(dragElement);
    dragElement.readOnly = true;
  }


</script>

<!-- DOM --------------------------------------------------------------->


<!-- this is the editable input field -->
<input bind:this={editElement} bind:value id="edit" type="text" class:default={true} tabindex="-1" />

<!-- this is the input field controlled by mouse and touch drag events -->
<input bind:this={dragElement} bind:value id="drag" type="text" tabindex="0" />

<!-- <button on:click={() => console.log(inputElement)}>Hallo</button>

<input type="text" value={123} bind:this={inputElement} /> -->


<!-- CSS --------------------------------------------------------------->
<style>
  input {
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
  }

  input#drag {
    cursor: ew-resize; /* get rid of the caret cursor in non-editing mode */
    user-select: none;
  }
  input#drag::selection {
    cursor: ew-resize; /* get rid of the caret cursor in non-editing mode */
    user-select: none;
    background: #0000;
  }

  input#edit {
    user-select: text;
  }


</style>
