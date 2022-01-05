<script>
  import { onMount, createEventDispatcher, tick } from "svelte";
  const dispatch = createEventDispatcher();

  // set any of the props with properties of this options object
  // changing one of the options later will not update the prop!
  export let options = {};

  export let value = options.value ?? 0;
  value = parseFloat(value);
  export let min = options.min ?? -1e12;
  min = parseFloat(min);
  export let max = options.max ?? 1e12;
  max = parseFloat(max);
  export let step = options.step ?? 1;
  step = parseFloat(step);
  export let precision = options.precision ?? step;
  precision = parseFloat(precision);

  export let speed = options.speed ?? 1;
  speed = parseFloat(speed);
  export let keyStep = options.keyStep ?? step * 10;
  keyStep = parseFloat(keyStep);
  export let keyStepSlow = options.keyStepSlow ?? step;
  keyStepSlow = parseFloat(keyStepSlow);
  export let keyStepFast = options.keyStepFast ?? step * 100;
  keyStepFast = parseFloat(keyStepFast);

  export let decimals = options.decimals ?? 0;
  decimals = parseFloat(decimals);
  export let format = options.format ?? undefined;
  export let parse = options.parse ?? undefined;

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

  let preciseValue;
  let visibleValue;
  let tmpValue;

  let isTouchDevice = false;

  let dragElement, editElement;
  let dragFocussed = false;
  let editFocussed = false;
  let focussed = false;

  let dragging = false;
  let wasActiveOnClick, hasMoved, clickX, clickY;
  let stepFactor = 1;
  let altPressed = false;
  let shiftPressed = false;

  let editing = false;

  let style;
  let htmlNode = null;
  let htmlNodeOriginalCursor = null;
  let defaultCursor;

  onMount(() => {
    htmlNode = document.querySelector("html");
    htmlNodeOriginalCursor = htmlNode.style.cursor;

    return () => {
      htmlNode.style.cursor = htmlNodeOriginalCursor;
    }
  });

  // update all values (preciseValue, visibleValue)
  updateValues(value);

  function touchstartHandler(ev) {
    dispatch("consoleLog", ev.type);

    isTouchDevice = true;
    dragstartHandler(ev);
  }
  function dragstartHandler(ev) {
    dispatch("consoleLog", ev.type);

    wasActiveOnClick = document.activeElement === dragElement;

    dragging = true;
    dragElement.focus();

    hasMoved = false;
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

    // fire dragstart before value changes
    if (stepNum != 0 && !hasMoved) {
      hasMoved = true;
      dispatch("dragstart");
    }

    stepValue(stepNum * stepFactor);

    clickX = actX;
    clickY = actY;

    // hasMoved++;
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

    if (dragging && hasMoved) {
      dispatch("dragend");
    }

    dragging = false;

    // start editing only if element was already focussed on mousedown and no dragging was done
    if (wasActiveOnClick && !hasMoved) {
      startEditing();
    }
  }

  function dragFocusHandler(ev) {
    dispatch("consoleLog", ev.type);

    dragFocussed = true;
    updateFocussed();
  }
  function dragBlurHandler(ev) {
    dispatch("consoleLog", ev.type);

    dragFocussed = false;
    updateFocussed();
  }
  function editFocusHandler(ev) {
    dispatch("consoleLog", ev.type);

    editFocussed = true;
    updateFocussed();
  }
  function editBlurHandler(ev) {
    dispatch("consoleLog", ev.type);

    editFocussed = false;
    updateFocussed();
    stopEditing();
  }

  function keydownHandler(ev) {
    // prevent submitting if the number spinner is inside a form element
    if (ev.key == "Enter" && (ev.target == dragElement || ev.target == editElement)) {
      ev.preventDefault();
    }

    if (ev.target == dragElement || ev.target == editElement) {
      dispatch("consoleLog", ev.type);
      // console.log(ev);

      // necessary for fast typing when starting edit mode
      // otherwise typed keys while tick() in startEditing() would get lost
      if (ev.key.length == 1) {
        tmpValue = tmpValue ? tmpValue + ev.key : ev.key;
      }
    }

    if (ev.key == "Shift") {
      shiftPressed = true;
    }
    if (ev.key == "Alt") {
      altPressed = true;
    }
  }

  function keyupHandler(ev) {
    if (ev.target == dragElement || ev.target == editElement) {
      dispatch("consoleLog", ev.type);
      // console.log(ev);
    }

    if (ev.key == "Shift") {
      shiftPressed = false;
    }

    if (ev.key == "Alt") {
      altPressed = false;
    }

    if (dragFocussed && !editing) {
      let increment = keyStep;
      if (stepFactor < 1) increment = keyStepSlow;
      if (stepFactor > 1) increment = keyStepFast;

      if (ev.key == "ArrowUp" || ev.key == "ArrowRight") {
        addToValue(increment);
      }
      if (ev.key == "ArrowDown" || ev.key == "ArrowLeft") {
        addToValue(-increment);
      }
      if (ev.key == "Enter") {
        startEditing();
      }
      // also start editing when pressing any non-control keys
      if (ev.key.length == 1) {
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

  // this will init focussed variable
  $: if (dragElement && editElement) {
    updateFocussed();
  }
  async function updateFocussed() {
    await tick();
    if (document.activeElement == dragElement || document.activeElement == editElement) {
      if (!focussed) {
        focussed = true;
        dispatch('focus');
        // console.log("Focus");
      }
    } else {
      if (focussed) {
        focussed = false;
        dispatch('blur');
        // console.log("Blur");
      }
    }
  }

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

    if (htmlNode) {
      if (dragging) {
        htmlNode.style.cursor = cursor ?? defaultCursor;
        // addClass(htmlNode, cursorClass);
      } else {
        htmlNode.style.cursor = htmlNodeOriginalCursor;
        // removeClass(htmlNode, cursorClass);
      }
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
    //preciseValue = parseFloat(visibleValue);

    await tick();

    editElement.focus();
    
    if (tmpValue) {
      visibleValue = tmpValue;
    } else {
      editElement.select();
    }

    dispatch("editstart");
  }

  function stopEditing() {
    if (editing) {
      editing = false;
      tmpValue = undefined;

      if (parse) {
        preciseValue = parse(visibleValue);
        updateValues(preciseValue);
      } else {
        let checkValue = parseFloat(editElement.value);
        if (!isNaN(checkValue)) {
          preciseValue = parseFloat(visibleValue);
          updateValues(preciseValue);
        }
      }

      // Bring focus back to the drag element if editElement was focussed:
      if (document.activeElement === editElement) {
        setTimeout(() => {
          dragElement.focus();
        }, 0);
      }

      dispatch("editend");
    }
  }

  function stepValue(numSteps) {
    preciseValue = preciseValue ?? parseFloat(visibleValue);
    preciseValue += numSteps * step * speed;
    updateValues(preciseValue);
  }

  function addToValue(increment) {
    preciseValue = preciseValue ?? parseFloat(visibleValue);
    preciseValue += increment;
    updateValues(preciseValue);
  }

  function updateValues(val) {
    preciseValue = parseFloat(val);
    preciseValue = keepInRange(preciseValue);

    visibleValue = Math.round((preciseValue - min) / step) * step + min;
    if (format) {
      visibleValue = format(visibleValue);
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
    let frac;

    val = Math.round((parseFloat(val) - min) / precision) * precision + min;

    // number of decimals comes either from the precision prop ...
    let dec = precision < 1 ? Math.ceil(-Math.log10(precision)) : 0;
    // ... or from the number of decimals of the step value
    frac = step.toString().split(".")[1];
    if (frac) dec = Math.max(dec, frac.length);
    // ... or from the number of decimals of the min value
    frac = min.toString().split(".")[1];
    if (frac) dec = Math.max(dec, frac.length);

    return parseFloat(val.toFixed(dec));
  }

  // Helpers ----------------------------------------------------------

  function isInteger(num) {
    return num == Math.round(num);
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
  on:keydown
  on:keypress
  on:keyup
  {style}
  class={$$props.class}
  class:default={!$$props.class ? true : false}
  class:drag={true}
  class:dragging
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
  on:keydown
  on:keypress
  on:keyup
  {style}
  class={$$props.class}
  class:default={!$$props.class ? true : false}
  class:edit={true}
  class:editing
  class:focus={editFocussed}
  class:inactive={!editing}
  type="text"
  bind:this={editElement}
  bind:value={visibleValue}
  inputmode={isInteger(step) && isInteger(min) && min >= 0 ? "numeric" : "text"}
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
