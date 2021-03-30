<script>
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();

  // set any of the props with properties of this options object
  // changing one of the options later will not update the prop!
  export let options = {};

  export let value = options.value ?? 0;
  export let min = options.min ?? -Number.MAX_VALUE;
  export let max = options.max ?? Number.MAX_VALUE;
  export let step = options.step ?? 1;
  export let precision = options.precision ?? undefined;
  precision = precision ?? step;
  export let decimals = options.decimals ?? 0;
  export let horizontal = options.horizontal ?? true;
  export let vertical = options.vertical ?? false;
  export let circular = options.circular ?? false;
  export let editOnClick = options.editOnClick ?? false;
  export let mainStyle = options.mainStyle ?? undefined;
  export let fastStyle = options.fastStyle ?? undefined;
  export let slowStyle = options.slowStyle ?? undefined;
  export let focusStyle = options.focusStyle ?? undefined;
  export let draggingStyle = options.draggingStyle ?? undefined;
  export let editingStyle = options.editingStyle ?? undefined;
  export let cursor = options.cursor ?? undefined;

  let inputElement;
  let focussed = false;
  let stepFactor = 1;
  let dragging = false;
  let clickX, clickY;
  let hasMoved = 0;
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
  let htmlNodeOriginalCursor = htmlNode.style.cursor;
  let defaultCursor;

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
      hasMoved = 0;
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

    hasMoved++;
  }

  function mouseupHandler(e) {
    dispatch('consoleLog', 'mouseup');

    // console.log('up');
    dragging = false;

    if (editOnClick && hasMoved < 2) {
      startEditing();
    }
  }

  function dblclickHandler(e) {
    dispatch('consoleLog', 'dblclick');

    if (!editOnClick) {
      startEditing();
    }
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
      preciseValue = keepInRange(preciseValue);

      dispatch('input', parseFloat(roundToPrecision(preciseValue)));
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
        if (e.key == 'ArrowUp' || e.key == 'ArrowRight') {
          stepValue(10);
        }
        if (e.key == 'ArrowDown' || e.key == 'ArrowLeft') {
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
    style += dragging && draggingStyle ? ';' + draggingStyle : '';
    style += editing && editingStyle ? ';' + editingStyle : '';
    style += !editing ? ';cursor:' + (cursor ?? defaultCursor) : '';
  }

  $: {
    // let cursorClass = horizontal
    //   ? vertical
    //     ? 'move-cursor'
    //     : 'horizontal-cursor'
    //   : 'vertical-cursor';

    defaultCursor = horizontal ? (vertical ? 'move' : 'ew-resize') : 'ns-resize';

    if (dragging) {
      htmlNode.style.cursor = cursor ?? defaultCursor;
      // addClass(htmlNode, cursorClass);
    } else {
      htmlNode.style.cursor = htmlNodeOriginalCursor;
      // removeClass(htmlNode, cursorClass);
    }
  }

  function setValue(val) {
    preciseValue = parseFloat(val);
    preciseValue = keepInRange(preciseValue);

    visibleValue = preciseValue.toFixed(decimals);
    value = roundToPrecision(preciseValue);
    dispatch('input', parseFloat(value));
    dispatch('change', parseFloat(value));
  }

  function stepValue(numSteps) {
    preciseValue = preciseValue ?? parseFloat(visibleValue);
    preciseValue += numSteps * step * stepFactor;
    preciseValue = keepInRange(preciseValue);

    visibleValue = preciseValue.toFixed(decimals);
    value = roundToPrecision(preciseValue);
    dispatch('input', parseFloat(value));
    dispatch('change', parseFloat(value));
  }

  function keepInRange(val) {
    min = parseFloat(min);
    max = parseFloat(max);
    if (circular) {
      let range = max - min;
      if (range === 0) return min;
      let fac = val < min ? Math.ceil((min - val) / range) : 0;
      val = ((val - min + range * fac) % range) + min;
    } else {
      val = Math.min(Math.max(val, min), max);
    }
    return val;
  }

  function roundToPrecision(val) {
    val = Math.round(parseFloat(val) / precision) * precision;
    let dec = precision < 1 ? Math.ceil(-Math.log10(precision)) : 0;
    return parseFloat(val.toFixed(dec));
  }

  function startEditing() {
    if (isTouchDevice) return;
    preciseValue = parseFloat(visibleValue);
    editing = true;
    inputElement?.setSelectionRange(0, 30);
  }

  function stopEditing() {
    if (isTouchDevice) return;
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

<input
  type="text"
  on:mouseenter={mouseenterHandler}
  on:mouseleave={mouseleaveHandler}
  on:mousedown|stopPropagation={mousedownHandler}
  on:touchstart|stopPropagation|preventDefault={touchstartHandler}
  on:dblclick|stopPropagation={dblclickHandler}
  on:focus={focusHandler}
  on:blur={blurHandler}
  on:input={inputHandler}
  {style}
  class={$$props.class}
  class:default={!$$props.class ? true : false}
  class:fast={stepFactor > 1 ? 'fast' : ''}
  class:slow={stepFactor < 1 ? 'slow' : ''}
  class:dragging
  class:editing
  contenteditable={editing ? 'true' : 'false'}
  tabindex="0"
  bind:value={visibleValue}
  bind:this={inputElement}
/>

<!-- class:horizontal-cursor={horizontal && !vertical}
class:vertical-cursor={!horizontal && vertical}
class:move-cursor={horizontal && vertical} -->

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
    padding: 0.25em;
    border: 0.075em solid #0004;
    border-radius: 0.15em;
    text-align: right;
    vertical-align: baseline;
    cursor: initial; /* get rid of the caret cursor in non-editing mode */
  }

  .default:focus {
    border: 0.075em solid #06f;
    outline: none; /* removes the standard focus border */
  }

  .default.fast {
    border-top-width: 0.15em;
    padding-top: 0.175em;
  }

  .default.slow {
    border-bottom-width: 0.15em;
    padding-bottom: 0.175em;
  }

  .default.dragging {
    border-color: #06f;
  }

  .default.editing {
    border: 0.15em solid #06f;
    padding: 0.175em;
    cursor: default;
  }

  /* mandatory css styles, not customizable */

  input {
    user-select: none;
  }

  /* remove text selection background in non-editing mode */
  input:not(.editing)::selection {
    background: #0000;
  }

  input.editing {
    user-select: text;
  }
</style>
