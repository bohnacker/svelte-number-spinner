<script>
  import { createEventDispatcher } from 'svelte';

  export let value = 0;
</script>

<!-- DOM --------------------------------------------------------------->

<svelte:window />

<!-- this is the editable input field -->
<input id="edit" type="text" tabindex="-1" bind:value />

<!-- this is the input field controlled by mouse and touch drag events -->
<input id="drag" type="text" contenteditable="false" tabindex="0" bind:value />

<!-- CSS --------------------------------------------------------------->
<style>

  input#drag {
    user-select: none;
  }

  input:not(.editing)::selection {
    background: #0000;
  }

  input#edit {
    user-select: text;
  }
</style>
