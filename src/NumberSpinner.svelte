<script>
  import { createEventDispatcher } from 'svelte';
  import { addClass, removeClass } from './dom-helpers';

  export let value = 0;
  export let min = -Number.MAX_VALUE;
  export let max = Number.MAX_VALUE;
  export let step = 1;
  export let decimals = 0;
  export let horizontal = true;
  export let vertical = false;
  export let mainStyle = undefined;
  export let fastStyle = undefined;
  export let slowStyle = undefined;
  export let focusStyle = undefined;
  export let editingStyle = undefined;

  const dispatch = createEventDispatcher();

  let inputElement;
  let focussed = false;
  let stepFactor = 1;
  let dragging = false;
  let clickX, clickY;
  let visibleValue;
  let preciseValue;
  let editing = false;
  let altPressed = false;
  let shiftPressed = false;
  let style;

  let isTouchDevice = false;

  visibleValue = setValue(value);
  preciseValue = setValue(value);

  let htmlNode = document.querySelector('html');

  // handlers --------------------------------

  function mouseenterHandler(e) {
    // seems not to be very practical to have focus on rollover:
    // inputElement?.focus();
  }

  function mouseleaveHandler(e) {}

  function touchstartHandler(e) {
    dispatch('consoleLog', 'touchstart');
    isTouchDevice = true;
    mousedownHandler(e);
  }

  function mousedownHandler(e) {
    dispatch('consoleLog', 'mousedown');

    // console.log('down');
    if (editing) {
      e.stopPropagation();
    } else {
      clickX = isTouchDevice ? e.touches[0].clientX : e.clientX;
      clickY = isTouchDevice ? e.touches[0].clientY : e.clientY;
      dragging = true;
      preciseValue = setValue(value);
      //console.log(e.clientX, e.clientY);
    }
  }

  function mousemoveHandler(e) {
    // dispatch('consoleLog', 'mousemove');
    let actX = isTouchDevice ? e.touches[0].clientX : e.clientX;
    let actY = isTouchDevice ? e.touches[0].clientY : e.clientY;

    let distX = horizontal ? actX - clickX : 0;
    let distY = vertical ? -(actY - clickY) : 0;

    let stepNum = Math.abs(distX) > Math.abs(distY) ? distX : distY;

    stepValue(stepNum);

    clickX = actX;
    clickY = actY;
  }

  function mouseupHandler(e) {
    dispatch('consoleLog', 'mouseup');

    // console.log('up');
    dragging = false;
    stepFactor = 1;
  }

  async function dblclickHandler(e) {
    dispatch('consoleLog', 'dblclick');

    startEditing();
  }

  function windowdownHandler(e) {
    dispatch('consoleLog', 'window mousedown');

    // console.log('window mousedown');
    stopEditing();
  }

  function focusHandler(e) {
    dispatch('consoleLog', 'focus');

    // console.log(inputElement);
    focussed = true;
    stopEditing();
  }

  function blurHandler(e) {
    dispatch('consoleLog', 'blur');

    // console.log('blur');
    focussed = false;
    stopEditing();
  }

  function inputHandler(e) {
    // console.log(e);
    let checkValue = parseFloat(inputElement.value);

    if (!isNaN(checkValue)) {
      preciseValue = checkValue;
      preciseValue = Math.min(preciseValue, max);
      preciseValue = Math.max(preciseValue, min);

      dispatch('input', preciseValue.toFixed(decimals));
    }
  }

  function keydownHandler(e) {
    // console.log(e);
    if (e.key == 'Shift') {
      shiftPressed = true;
    }
    if (e.key == 'Alt') {
      altPressed = true;
    }
  }

  function keyupHandler(e) {
    // console.log(e)
    if (e.key == 'Shift') {
      shiftPressed = false;
    }

    if (e.key == 'Alt') {
      altPressed = false;
    }

    if (focussed) {
      if (!editing) {
        if (
          (vertical && e.key == 'ArrowUp') ||
          (horizontal && e.key == 'ArrowRight')
        ) {
          stepValue(10);
        }
        if (
          (vertical && e.key == 'ArrowDown') ||
          (horizontal && e.key == 'ArrowLeft')
        ) {
          stepValue(-10);
        }
      }

      if (e.key == 'Enter') {
        if (!editing) {
          startEditing();
        } else {
          stopEditing();
        }
      }
      if (e.key == 'Escape') {
        if (editing) {
          stopEditing();
        }
      }
    }
  }

  // updaters --------------------------------

  $: {
    if (!editing && !dragging) {
      setValue(value);
    }
  }

  $: if (inputElement) {
    inputElement.readOnly = !editing;
  }

  $: {
    stepFactor = 1;
    if (focussed && !editing) {
      if (altPressed && shiftPressed) {
        stepFactor = 10;
      } else if (altPressed) {
        stepFactor = 0.1;
      }
    }
  }

  $: {
    style = mainStyle ?? '';
    style += focussed && focusStyle ? ';' + focusStyle : '';
    style += !editing && stepFactor > 1 && fastStyle ? ';' + fastStyle : '';
    style += !editing && stepFactor < 1 && slowStyle ? ';' + slowStyle : '';
    style += editing && editingStyle ? ';' + editingStyle : '';
  }

  $: {
    let cursorClass = horizontal ? (vertical ? 'move-cursor': 'horizontal-cursor'): 'vertical-cursor';
    
    if (dragging) {
      addClass(htmlNode, cursorClass);
    } else {
      removeClass(htmlNode, cursorClass);
    }
  }

  function setValue(val) {
    preciseValue = parseFloat(val);
    preciseValue = Math.min(preciseValue, max);
    preciseValue = Math.max(preciseValue, min);

    visibleValue = preciseValue.toFixed(decimals);
    value = preciseValue.toFixed(decimals);
    dispatch('input', value);
    dispatch('change', value);
  }

  function stepValue(numSteps) {
    preciseValue = preciseValue ?? parseFloat(visibleValue);
    preciseValue += numSteps * step * stepFactor;
    preciseValue = Math.min(preciseValue, max);
    preciseValue = Math.max(preciseValue, min);

    visibleValue = preciseValue.toFixed(decimals);
    value = preciseValue.toFixed(decimals);
    dispatch('input', value);
    dispatch('change', value);
  }

  function startEditing() {
    preciseValue = parseFloat(visibleValue);
    editing = true;
    inputElement?.setSelectionRange(0, 30);
  }

  function stopEditing() {
    editing = false;
    inputElement?.setSelectionRange(0, 0);
    preciseValue = parseFloat(visibleValue);
    setValue(preciseValue);
  }
</script>

<!-- DOM --------------------------------------------------------------->

<svelte:window
  on:mousemove={dragging ? mousemoveHandler : ''}
  on:mouseup={dragging ? mouseupHandler : ''}
  on:touchmove={dragging ? mousemoveHandler : ''}
  on:touchend={dragging ? mouseupHandler : ''}
  on:mousedown={editing ? windowdownHandler : ''}
  on:touchstart={editing ? windowdownHandler : ''}
  on:keydown={keydownHandler}
  on:keyup={keyupHandler}
/>

<svelte:body style="cursor: help;" />

<input
  type="text"
  on:mouseenter={mouseenterHandler}
  on:mouseleave={mouseleaveHandler}
  on:mousedown|stopPropagation={mousedownHandler}
  on:touchstart|stopPropagation={touchstartHandler}
  on:dblclick|stopPropagation={dblclickHandler}
  on:focus={focusHandler}
  on:blur={blurHandler}
  on:input={inputHandler}
  {style}
  class={$$props.class}
  class:default={!$$props.class ? true : false}
  class:fast={stepFactor > 1 ? 'fast' : ''}
  class:slow={stepFactor < 1 ? 'slow' : ''}
  class:horizontal-cursor={horizontal && !vertical}
  class:vertical-cursor={!horizontal && vertical}
  class:move-cursor={horizontal && vertical}
  class:editing
  contenteditable={editing ? 'true' : 'false'}
  tabindex="0"
  bind:value={visibleValue}
  bind:this={inputElement}
/>

<!-- CSS --------------------------------------------------------------->
<style>
  .default {
    display: inline-block;
    box-sizing: border-box;
    font-variant-numeric: tabular-nums;
    background-color: white;
    color: black;
    width: 60px;
    height: 25px;
    margin: 0px;
    padding: 5px;
    border: 1px solid #0004;
    border-radius: 5px;
    text-align: right;
    cursor: initial; /* get rid of the caret cursor in non-editing mode */
  }

  .default:focus {
    border: 1px solid #06f;
    outline: none; /* removes the standard focus border */
  }

  .default.fast {
    color: tomato;
  }

  .default.slow {
    color: green;
  }

  .default.editing {
    border: 2px solid #06f;
    padding: 4px;
    cursor: default;
  }

  /* cursor styling is still a bit of a mess :-( */

  .horizontal-cursor {
    cursor: ew-resize;
  }
  .vertical-cursor {
    cursor: ns-resize;
  }
  .move-cursor {
    cursor: move;
  }
  :global(.horizontal-cursor) {
    cursor: ew-resize;
  }
  :global(.vertical-cursor) {
    cursor: ns-resize;
  }
  :global(.move-cursor) {
    cursor: move;
  }

  /* mandatory css styles, not customizable */

  input {
    user-select: none;
  }

  input:not(.editing)::selection {
    background: #0000;
  }

  input.editing {
    user-select: text;
  }
</style>
