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
  export let mainStyle = options.mainStyle ?? undefined;
  export let fastStyle = options.fastStyle ?? undefined;
  export let slowStyle = options.slowStyle ?? undefined;
  export let focusStyle = options.focusStyle ?? undefined;
  export let draggingStyle = options.draggingStyle ?? undefined;
  export let editingStyle = options.editingStyle ?? undefined;
  export let cursor = options.cursor ?? undefined;
  export let format = options.format ?? undefined;

  let preciseValue;
  let visibleValue;

  let isTouchDevice = false;

  let dragElement, editElement;
  let dragFocussed = false;
  let editFocussed = false;

  let dragging = false;
  let hasMoved, clickX, clickY;
  let stepFactor = 1;
  let altPressed = false;
  let shiftPressed = false;

  let editing = false;

  let style;
  let htmlNode = document.querySelector("html");
  let htmlNodeOriginalCursor = htmlNode.style.cursor;
  let defaultCursor;

  // update all values (preciseValue, visibleValue)
  updateValues(value);

  function touchstartHandler(ev) {
    dispatch("consoleLog", ev.type);

    isTouchDevice = true;
    dragstartHandler(ev);
  }
  function dragstartHandler(ev) {
    dispatch("consoleLog", ev.type);

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

  function dblclickHandler(ev) {
    // dispatch("consoleLog", ev.type);
    // startEditing();
  }

  function touchendHandler(ev) {
    dispatch("consoleLog", ev.type);

    mouseupHandler(ev);
  }
  function mouseupHandler(ev) {
    dispatch("consoleLog", ev.type);

    dragging = false;

    if (hasMoved < 2) {
      startEditing();
    }
  }

  function dragFocusHandler(ev) {
    dispatch("consoleLog", ev.type);

    dragFocussed = true;
  }
  function dragBlurHandler(ev) {
    dispatch("consoleLog", ev.type);

    dragFocussed = false;
  }
  function editFocusHandler(ev) {
    dispatch("consoleLog", ev.type);

    editFocussed = true;
  }
  async function editBlurHandler(ev) {
    dispatch("consoleLog", ev.type);

    stopEditing();
  }

  function keydownHandler(ev) {
    // dispatch("consoleLog", ev.type);
    // console.log(e);

    if (ev.key == "Shift") {
      shiftPressed = true;
    }
    if (ev.key == "Alt") {
      altPressed = true;
    }
  }

  function keyupHandler(ev) {
    // dispatch("consoleLog", ev.type);
    // console.log(e)

    if (ev.key == "Shift") {
      shiftPressed = false;
    }

    if (ev.key == "Alt") {
      altPressed = false;
    }

    if (dragFocussed && !editing) {
      // increment should at least be step
      let increment = Math.max(step, step * Math.round(10 * speed));

      if (ev.key == "ArrowUp" || ev.key == "ArrowRight") {
        addToValue(increment);
      }
      if (ev.key == "ArrowDown" || ev.key == "ArrowLeft") {
        addToValue(-increment);
      }
      if (ev.key == "Enter") {
        startEditing();
      }
    } else if (editFocussed && editing) {
      if (ev.key == "Enter" || ev.key == "Escape") {
        stopEditing();
      }
    }
  }

  function inputHandler(ev) {
    // dispatch("consoleLog", ev.type);
    // console.log(e);

    let checkValue = parseFloat(editElement.value);

    if (!isNaN(checkValue)) {
      preciseValue = checkValue;
      preciseValue = keepInRange(preciseValue);
      // console.log("dispatch input: ", preciseValue)
      dispatch("input", parseFloat(roundToPrecision(preciseValue)));
    }
  }

  // updaters --------------------------------

  $: {
    if (!editing && !dragging) {
      updateValues(value);
    }
  }

  $: {
    stepFactor = 1;
    if (dragFocussed && !editing) {
      if (altPressed && shiftPressed) {
        stepFactor = 10;
      } else if (altPressed) {
        stepFactor = 0.1;
      }
    }
  }

  $: {
    // let cursorClass = horizontal
    //   ? vertical
    //     ? 'move-cursor'
    //     : 'horizontal-cursor'
    //   : 'vertical-cursor';

    defaultCursor = horizontal ? (vertical ? "move" : "ew-resize") : "ns-resize";

    if (dragging) {
      htmlNode.style.cursor = cursor ?? defaultCursor;
      // addClass(htmlNode, cursorClass);
    } else {
      htmlNode.style.cursor = htmlNodeOriginalCursor;
      // removeClass(htmlNode, cursorClass);
    }
  }

  $: {
    style = mainStyle ?? "";
    style += (dragFocussed || editFocussed) && focusStyle ? ";" + focusStyle : "";
    style += !editing && stepFactor > 1 && fastStyle ? ";" + fastStyle : "";
    style += !editing && stepFactor < 1 && slowStyle ? ";" + slowStyle : "";
    style += dragging && draggingStyle ? ";" + draggingStyle : "";
    style += editing && editingStyle ? ";" + editingStyle : "";
    style += !editing ? ";cursor:" + (cursor ?? defaultCursor) : "";
  }

  async function startEditing() {
    editing = true;
    preciseValue = parseFloat(visibleValue);

    await tick();

    editElement.focus();
    editElement.select();
  }

  function stopEditing() {
    editFocussed = false;
    editing = false;

    let checkValue = parseFloat(editElement.value);
    if (!isNaN(checkValue)) {
      preciseValue = parseFloat(visibleValue);
      updateValues(preciseValue);
    }

    // Interaction variation: bring focus back to the drag element if the body was clicked:

    // setTimeout(() => {
    //   if (document.activeElement === document.body || document.activeElement === editElement) {
    //     dragElement.focus();
    //   }
    // }, 0);

    // This doesn't work (maybe document.activeElement is updated even later), but would be more elegant svelte-like:
    // await tick();
    // console.log(document.activeElement);
    // if (document.activeElement === document.body) {
    //   dragElement.focus();
    // }
  }

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
    if (format) {
      visibleValue = format(visibleValue)
    } else {  
      visibleValue = visibleValue.toFixed(decimals);
    }

    value = roundToPrecision(preciseValue);

    dispatch("input", parseFloat(value));
    dispatch("change", parseFloat(value));
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
  on:keydown={keydownHandler}
  on:keyup={keyupHandler}
/>

<input
  type="text"
  on:mousedown|stopPropagation={dragstartHandler}
  on:touchstart|stopPropagation|preventDefault={touchstartHandler}
  on:dblclick|stopPropagation={dblclickHandler}
  on:focus={dragFocusHandler}
  on:blur={dragBlurHandler}
  {style}
  class={$$props.class}
  class:default={!$$props.class ? true : false}
  class:drag={true}
  class:dragging={dragging}
  class:fast={stepFactor > 1 ? "fast" : ""}
  class:slow={stepFactor < 1 ? "slow" : ""}
  class:focus={dragFocussed}
  class:inactive={editing}
  bind:this={dragElement}
  bind:value={visibleValue}
  readonly={true}
  contenteditable={false}
  tabindex="0"
/>
<input
  on:mouseup|stopPropagation={(ev) => {}}
  on:touchend|stopPropagation={(ev) => {}}
  on:focus={editFocusHandler}
  on:blur={editBlurHandler}
  on:input={inputHandler}
  {style}
  class={$$props.class}
  class:default={!$$props.class ? true : false}
  class:edit={true}
  class:editing={editing}
  class:focus={editFocussed}
  class:inactive={!editing}
  type="text"
  bind:this={editElement}
  bind:value={visibleValue}
  inputmode={step == Math.round(step) && min >= 0 ? "numeric" : "text"}
/>

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
    cursor: ew-resize;
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
    border-color: #04c;
  }

  .default.editing {
    cursor: initial;
  }


  /* mandatory css styles, not customizable */

  .drag {
    user-select: none;
  }

  .drag::selection {
    /* remove text selection background in non-editing mode */
    background: #0000;
  }

  .inactive {
    display: none !important;
  }
</style>
