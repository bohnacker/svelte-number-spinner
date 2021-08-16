<script>
  import { createEventDispatcher, tick } from "svelte";
  const dispatch = createEventDispatcher();

  // set any of the props with properties of this options object
  // changing one of the options later will not update the prop!
  export let options = {};

  export let value = options.value ?? 0;
  export let min = options.min ?? -Number.MAX_VALUE;
  export let max = options.max ?? Number.MAX_VALUE;
  export let step = options.step ?? 1;
  export let precision = options.precision ?? step;
  export let decimals = options.decimals ?? 0;
  export let speed = options.speed ?? 1;
  export let horizontal = options.horizontal ?? true;
  export let vertical = options.vertical ?? false;
  export let circular = options.circular ?? false;

  let preciseValue;
  let visibleValue;

  let isTouchDevice = false;

  let dragElement, editElement;
  let dragFocussed = false;
  let editFocussed = false;

  let dragging = false;
  let hasMoved, clickX, clickY;
  let stepFactor = 1;
  
  let editing = false;
  
  // update all values (preciseValue, visibleValue)
  updateValues(value);

  function touchstartHandler(ev) {
    dispatch('consoleLog', ev.type);

    isTouchDevice = true;
    dragstartHandler(ev);
  }
  function dragstartHandler(ev) {
    dispatch('consoleLog', ev.type);

    dragging = true;
    dragElement.focus();

    hasMoved = 0;
    clickX = isTouchDevice ? ev.touches[0].clientX : ev.clientX;
    clickY = isTouchDevice ? ev.touches[0].clientY : ev.clientY;
    dragging = true;
    updateValues(value);
  }

  function touchmoveHandler(ev) {
    // dispatch('consoleLog', ev.type);

    isTouchDevice = true;
    dragmoveHandler(ev);
  }
  function dragmoveHandler(ev) {
    // dispatch('consoleLog', ev.type);

    // ev.preventDefault();

    let actX = isTouchDevice ? ev.touches[0].clientX : ev.clientX;
    let actY = isTouchDevice ? ev.touches[0].clientY : ev.clientY;

    let distX = horizontal ? actX - clickX : 0;
    let distY = vertical ? -(actY - clickY) : 0;

    let stepNum = Math.abs(distX) > Math.abs(distY) ? distX : distY;

    stepValue(stepNum);

    clickX = actX;
    clickY = actY;

    hasMoved++;
  }

  async function dblclickHandler(ev) {
    dispatch('consoleLog', ev.type);

    editing = true;
    await tick();
    editElement.focus();
    // Don't know, if it's better to select everything by default or not.
    editElement.select();
    // editElement.setSelectionRange(0, 30);
  }

  function touchendHandler(ev) {
    dispatch('consoleLog', ev.type);

    mouseupHandler(ev);
  }
  function mouseupHandler(ev) {
    dispatch('consoleLog', ev.type);

    dragging = false;
  }

  function dragFocusHandler(ev) {
    dispatch('consoleLog', ev.type);

    dragFocussed = true;
  }
  function dragBlurHandler(ev) {
    dispatch('consoleLog', ev.type);

    dragFocussed = false;
  }
  function editFocusHandler(ev) {
    dispatch('consoleLog', ev.type);

    editFocussed = true;
  }
  async function editBlurHandler(ev) {
    dispatch('consoleLog', ev.type);

    editFocussed = false;
    editing = false;

    // bring focus back to the drag element if the body was clicked
    setTimeout(() => {
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

  function startEditing() {}

  function stopEditing() {}

  function stepValue(numSteps) {
    preciseValue = preciseValue ?? parseFloat(visibleValue);
    preciseValue += numSteps * step * stepFactor * speed;
    updateValues(preciseValue);
  }

  function addToValue(increment) {
    preciseValue = preciseValue ?? parseFloat(visibleValue);
    preciseValue += increment * stepFactor;
    updateValues(preciseValue);
  }

  function updateValues(val) {
    preciseValue = parseFloat(val);
    preciseValue = keepInRange(preciseValue);

    visibleValue = Math.round(preciseValue / step) * step;
    visibleValue = visibleValue.toFixed(decimals);
    
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

</script>

<!-- DOM --------------------------------------------------------------->

<svelte:window
  on:mousemove={dragging ? dragmoveHandler : ""}
  on:touchmove={dragging ? touchmoveHandler : ""}
  on:mouseup|stopPropagation={dragging ? mouseupHandler : editBlurHandler}
  on:touchend|stopPropagation={dragging ? touchendHandler : editBlurHandler}
/>

<input
  type="text"
  on:mousedown|stopPropagation={dragstartHandler}
  on:touchstart|stopPropagation|preventDefault={touchstartHandler}
  on:dblclick|stopPropagation={dblclickHandler}
  on:focus={dragFocusHandler}
  on:blur={dragBlurHandler}
  class="drag"
  class:active={!editing}
  class:focus={dragFocussed}
  bind:this={dragElement}
  bind:value
  readonly={true}
  contenteditable={false}
  tabindex="0"
/>
<input
  class="edit"
  on:mouseup|stopPropagation={(ev) => {
    console.log(ev);
  }}
  on:touchend|stopPropagation={(ev) => {
    console.log(ev);
  }}
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
    text-align: right;
  }

  .focus {
    border: 2px solid dodgerblue;
    padding: 4px;
    outline: none; /* removes the standard focus border */
  }

  .drag {
    user-select: none;
    color: royalblue;
    cursor: ew-resize;
  }
  .edit {
    color: crimson;
    cursor: default;
  }

  /* mandatory css styles, not customizable */

  /* remove text selection background in non-editing mode */
  .drag::selection {
    background: #0000;
  }

  .active {
    display: inline-block;
  }
</style>
