<script>
  import { createEventDispatcher } from 'svelte';

  export let value = 0;
  export let min = -Number.MAX_VALUE;
  export let max = Number.MAX_VALUE;
  export let step = 1;
  export let decimals = 0;
  export let horizontal = true;
  export let vertical = true;
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
  let hasMoved = 0;
  let clickX, clickY;
  let visibleValue;
  let preciseValue;
  let editing = false;
  let altPressed = false;
  let shiftPressed = false;
  let style;

  let isTouchdevice = false;
  let codeTriggeredBlur = false;
  let codeTriggeredTouchstart = false;

  visibleValue = setValue(value);
  preciseValue = setValue(value);


  // handlers --------------------------------

  function mousedownHandler(e) {
    if (e.type == 'mousedown' && isTouchdevice) return;

    dispatch('consoleLog', e.type);
    console.log(e);

    if (editing) { 
      e.stopPropagation();
    } else {
      clickX = e.clientX;
      clickY = e.clientY;        
      dragging = true;
      hasMoved = 0;
      preciseValue = setValue(value);
      //console.log(e.clientX, e.clientY);
    }
  }
  
  function touchstartHandler(e) {
    dispatch('consoleLog', e.type);
    if (!codeTriggeredTouchstart) {
      isTouchdevice = true;

      if (editing) { 
        e.stopPropagation();
      } else {
        if (!focussed) inputElement?.focus();

        clickX = e.touches[0].clientX;
        clickY = e.touches[0].clientY; 
        dragging = true;
        hasMoved = 0;
        preciseValue = setValue(value);
        //console.log(e.clientX, e.clientY);
      }
    }
  }

  function mousemoveHandler(e) {
    if (e.type == 'mousemove' && isTouchdevice) return;

    // dispatch('consoleLog', e.type);
    
    hasMoved++;

    let actX, actY;
    if (e.type == 'touchmove') {
      actX = e.touches[0].clientX;
      actY = e.touches[0].clientY; 
    } else {
      actX = e.clientX;
      actY = e.clientY;        
    }

    let distX = horizontal ? actX - clickX : 0;
    let distY = vertical ? -( actY - clickY) : 0;

    let stepNum = Math.abs(distX) > Math.abs(distY) ? distX : distY; 

    stepValue(stepNum);

    clickX = actX;
    clickY = actY;
  }

  
  function mouseupHandler(e) {
    if (e.type == 'mouseup' && isTouchdevice) return;
    
    dispatch('consoleLog', e.type);

    // console.log('up');
    dragging = false;
    stepFactor = 1;

    if (hasMoved < 2) startEditing();
  }

  async function dblclickHandler(e) {
    // dispatch('consoleLog', e.type);

    // startEditing();
  }

  function windowdownHandler(e) {
    dispatch('consoleLog', 'window mousedown');

    // console.log('window mousedown');
    stopEditing();
  }

  function focusHandler(e) {
    dispatch('consoleLog', e.type);

    // console.log(inputElement);
    if (!codeTriggeredTouchstart) {
      focussed = true;
      stopEditing();
      codeTriggeredTouchstart = false;
    }
  }

  function blurHandler(e) {
    dispatch('consoleLog', e.type);

    // console.log('blur');
    if (!codeTriggeredBlur) {
      focussed = false;
      stopEditing();
      codeTriggeredBlur = false;
    }
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
    dispatch('consoleLog', e.type + " " + e.key);

    // console.log(e);
    if (e.key == 'Shift') {
      shiftPressed = true;
    }
    if (e.key == 'Alt') {
      altPressed = true;
    }     
  }

  function keyupHandler(e) {
    dispatch('consoleLog', e.type + " " + e.key);

    // console.log(e)
    if (e.key == 'Shift') {
      shiftPressed = false;
    }
    
    if (e.key == 'Alt') {
      altPressed = false;
    }

    if (focussed) {
      if (!editing) {
        if (vertical && e.key == 'ArrowUp' || horizontal && e.key == 'ArrowRight') {
          stepValue(10);
        }     
        if (vertical && e.key == 'ArrowDown' || horizontal && e.key == 'ArrowLeft') {
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
    inputElement.contentEditable = editing;
    // inputElement.readOnly = false;
    // inputElement.contentEditable = true;
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
    dispatch('consoleLog', 'start editing');
    editing = true;
    inputElement.readOnly = false;
    inputElement.contentEditable = true;

    if (isTouchdevice) {
      codeTriggeredBlur = true;
      inputElement.blur();
      codeTriggeredTouchstart = true;
      var evt = new MouseEvent("touchstart", {
        view: window,
        bubbles: true,
        cancelable: true,
        clientX: 0,
        clientY: 0,
        /* whatever properties you want to give it */
      });
      inputElement.dispatchEvent(evt);
    }

    preciseValue = parseFloat(visibleValue);
    inputElement?.setSelectionRange(0, 30);        
  }

  function stopEditing() {
    dispatch('consoleLog', 'stop editing');
    editing = false;
    inputElement.readOnly = true;
    inputElement.contentEditable = false;
    inputElement?.setSelectionRange(0, 0);
    preciseValue = parseFloat(visibleValue);
    setValue(preciseValue);     
  }

</script>


<!-- DOM --------------------------------------------------------------->


<svelte:window 
    on:mousemove={dragging ? mousemoveHandler : ''} 
    on:touchmove={dragging ? mousemoveHandler : ''}
    on:mouseup={dragging ? mouseupHandler : ''}
    on:touchend={dragging ? mouseupHandler : ''}
    on:mousedown={editing ? windowdownHandler : ''}
    on:touchstart={editing ? windowdownHandler : ''}
    on:keydown={keydownHandler}
    on:keyup={keyupHandler}
   />

<input type='text'
    on:mousedown|stopPropagation={mousedownHandler}
    on:touchstart|stopPropagation={touchstartHandler}
    on:dblclick|stopPropagation={dblclickHandler}
    on:focus={focusHandler}
    on:blur={blurHandler}
    on:input={inputHandler}
    style={style}
    class={$$props.class}
    class:default={!$$props.class ? true : false}
    class:fast={stepFactor > 1 ? 'fast' : ''}
    class:slow={stepFactor < 1 ? 'slow' : ''}
    class:editing
    tabindex=0
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
    cursor: initial;            /* get rid of the caret cursor in non-editing mode */
  }

  .default:focus {
    border: 1px solid #06f;
    outline:none;               /* removes the standard focus border */
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




