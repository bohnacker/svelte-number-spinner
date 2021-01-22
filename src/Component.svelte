<script>
  import { tick, afterUpdate } from 'svelte';

  export let value = 0;
  export let min = -Number.MAX_VALUE;
  export let max = Number.MAX_VALUE;
  export let step = 1;
  export let decimals = 0;
  export let width = 60;
  export let customClass = undefined;

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

  visibleValue = setValue(value);
  preciseValue = setValue(value);


  // handlers --------------------------------

  function mouseenterHandler(e) {
    inputElement?.focus();
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

    let distX = actX - clickX;
    let distY = -( actY - clickY);

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
  
  function changeHandler(e) {
    //console.log(e)
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

  $: if (inputElement) {
    inputElement.readOnly = !editing;
  }

  $: {
    stepFactor = 1;
    if (focussed) {
      if (shiftPressed) {
        stepFactor = 10;
      } else if (altPressed) {
        stepFactor = 0.1; 
      }       
    }
  }

  function setValue(val) {
    preciseValue = parseFloat(val);
    preciseValue = Math.min(preciseValue, max);
    preciseValue = Math.max(preciseValue, min);

    visibleValue = preciseValue.toFixed(decimals);
    value = preciseValue.toFixed(decimals);
  }

  function stepValue(numSteps) {
    preciseValue = preciseValue ?? parseFloat(visibleValue);
    preciseValue += numSteps * step * stepFactor;
    preciseValue = Math.min(preciseValue, max);
    preciseValue = Math.max(preciseValue, min);

    visibleValue = preciseValue.toFixed(decimals);
    value = preciseValue.toFixed(decimals);
  }

  function startEditing() {
    preciseValue = parseFloat(visibleValue);
    editing = true;
    inputElement.setSelectionRange(0, 30);        
  }

  function stopEditing() {
    editing = false;
    inputElement.setSelectionRange(0, 0);
    preciseValue = parseFloat(visibleValue);
    setValue(preciseValue);     
  }

  // afterUpdate(() => {
  //  inputElement.contentEditable = true;
  //  inputElement.setSelectionRange(0, 0);
  //  inputElement.contentEditable = false;
  // });

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
    style='width:{width}px'
    class={customClass}
    class:default={!customClass ? true : false}
    class:fast={stepFactor > 1 ? 'fast' : ''}
    class:slow={stepFactor < 1 ? 'slow' : ''}
    class:editing
    class:hide-selection={editing ? '' : 'hide-selection  '}
    contenteditable={editing ? 'true' : 'false'} 
    tabindex=0
    bind:value={visibleValue}
    bind:this={inputElement}
    />



<!-- CSS --------------------------------------------------------------->

<style>

  .default {
    margin: 0px;
    display: inline-block;
    box-sizing: border-box;
    font-variant-numeric: tabular-nums;
    border: 1px solid #0004;
    padding: 5px;
    border-radius: 5px;
    background-color: white;
    color: black;
    text-align: right;
    cursor: initial;
  }

  .default:focus {
    border: 1px solid #06f;
    padding: 5px;
    outline-width: 0;
    outline:none;
  }

  .default.editing {
    border: 2px solid #06f;
    padding: 4px;
    cursor: default;
  }

  .default::selection {
    background: #06f3;
  }

  .default.fast {
    color: tomato;
  }

  .default.slow {
    color: green;
  }

  /* mandatory css styles, not customizable */

  input { 
    user-select: none;
  }

  input.hide-selection::selection {
    background: #0000;
  }

  input.editing {
    user-select: text;
  }


</style>




