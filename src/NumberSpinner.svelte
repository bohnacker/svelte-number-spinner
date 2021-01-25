<script>
  import { createEventDispatcher } from 'svelte';

  export let value = 0;
  export let min = -Number.MAX_VALUE;
  export let max = Number.MAX_VALUE;
  export let step = 1;
  export let decimals = 0;
  export let horizontal = true;
  export let vertical = true;
  export let mainStyle, fastStyle, slowStyle, focusStyle, editingStyle;

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

  visibleValue = setValue(value);
  preciseValue = setValue(value);


  // handlers --------------------------------

  function mouseenterHandler(e) {
    // seems not to be very practical to have focus on rollover:
    // inputElement?.focus();
  }
  
  function mouseleaveHandler(e) {
  }

  function mousedownHandler(e) {
    // console.log('down');
    if (editing) { 
      e.stopPropagation();
    } else {
      clickX = e.clientX;
      clickY = e.clientY;
      dragging = true;
      preciseValue = setValue(value);
      //console.log(e.clientX, e.clientY);
    }
  }
  
  function mousemoveHandler(e) {
    let actX = e.clientX;
    let actY = e.clientY;

    let distX = horizontal ? actX - clickX : 0;
    let distY = vertical ? -( actY - clickY) : 0;

    let stepNum = Math.abs(distX) > Math.abs(distY) ? distX : distY; 

    stepValue(stepNum);

    clickX = actX;
    clickY = actY;
  }
  
  function mouseupHandler(e) {
    // console.log('up');
    dragging = false;
    stepFactor = 1;
  }

  async function dblclickHandler(e) {
    startEditing();
  }

  function windowdownHandler(e) {
    // console.log('window mousedown');
    stopEditing();
  }

  function focusHandler(e) {
    // console.log(inputElement);
    focussed = true;
    stopEditing();
  }

  function blurHandler(e) {
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
    on:mousedown={editing ? windowdownHandler : ''}
    on:keydown={keydownHandler}
    on:keyup={keyupHandler}
   />

<input type='text'
    on:mouseenter={mouseenterHandler} 
    on:mouseleave={mouseleaveHandler} 
    on:mousedown={mousedownHandler} 
    on:dblclick={dblclickHandler}
    on:focus={focusHandler}
    on:blur={blurHandler}
    on:input={inputHandler}
    style={style}
    class={$$props.class}
    class:default={!$$props.class ? true : false}
    class:fast={stepFactor > 1 ? 'fast' : ''}
    class:slow={stepFactor < 1 ? 'slow' : ''}
    class:editing
    contenteditable={editing ? 'true' : 'false'} 
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
    cursor: initial;
  }

  .default:focus {
    border: 1px solid #06f;
    outline:none;       /* removes the standard focus border */
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




