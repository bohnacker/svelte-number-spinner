<script>
  import { afterUpdate, tick, createEventDispatcher } from 'svelte';

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

  let dragElement, editElement;
  let dragFocussed = false;
  let editFocussed = false;
  let stepFactor = 1;
  let dragging = false;
  let clickX, clickY;
  let visibleValue;
  let preciseValue;
  let editing = false;
  let justStartedEditing = false;
  let internalEditFocus = false;
  let internalDragFocus = false;
  let altPressed = false;
  let shiftPressed = false;
  let style;

  visibleValue = setValue(value);
  preciseValue = setValue(value);

  // window.setTimeout(() => {
  //   console.log('timeout focus')
  //   dragElement.focus();      
  // }, Math.random() * 4000);


  // handlers --------------------------------

  function mouseenterHandler(e) {
    // seems not to be very practical to have focus on rollover:
    // dragElement?.focus();
  }
  
  function mouseleaveHandler(e) {
  }

  function mousedownHandler(e) {
    dispatch('consoleLog', 'down ' + e.target.id);
    // console.log('down');

    if (editing) { 
      e.stopPropagation();
    } else {
      clickX = e.clientX;
      clickY = e.clientY;
      if (e.type == "touchstart") {
        clickX = e.touches[0].clientX;
        clickY = e.touches[0].clientY;
      }
      dragging = true;
      preciseValue = setValue(value);
      //console.log(e.clientX, e.clientY);
    }
  }
  
  function mousemoveHandler(e) {
    e.preventDefault();

    let actX = e.clientX;
    let actY = e.clientY;
    if (e.type == "touchmove") {
      actX = e.touches[0].clientX;
      actY = e.touches[0].clientY;
    }
    let distX = horizontal ? actX - clickX : 0;
    let distY = vertical ? -( actY - clickY) : 0;

    let stepNum = Math.abs(distX) > Math.abs(distY) ? distX : distY; 

    stepValue(stepNum);

    clickX = actX;
    clickY = actY;
  }
  
  function mouseupHandler(e) {
    dispatch('consoleLog', 'up ' + e.target.id);
    // console.log('up');
    dragging = false;
    stepFactor = 1;
  }

  function dblclickHandler(e) {
    dispatch('consoleLog', 'dblClick ' + e.target.id);
    startEditing();
    // dragElement.focus();
  }

  function windowdownHandler(e) {
    dispatch('consoleLog', 'down window');
    // console.log('window mousedown');
    console.log('calling stopEditing() from windowdownHandler');
    stopEditing();
  }

  function dragFocusHandler(e) {
    dispatch('consoleLog', 'focus ' + e.target.id);
    // // console.log(dragElement);

    dragFocussed = true;
    // if (!justStartedEditing) {
    //   stopEditing();      
    // }
    // justStartedEditing = false;
  }

  function dragBlurHandler(e) {
    dispatch('consoleLog', 'blur ' + e.target.id);
    console.log('blur ' + e.target.id );
    dragFocussed = false;

    // if (!editing) {
    //   stopEditing();
    // }

    if (!internalEditFocus) {
      console.log('calling stopEditing() from dragBlurHandler');
      stopEditing();      
      internalEditFocus = false;
    }
  }
  
  function editFocusHandler(e) {
    dispatch('consoleLog', 'focus ' + e.target.id);
    // // console.log(dragElement);

    editFocussed = true;
    // if (!justStartedEditing) {
    //   stopEditing();      
    // }
    // justStartedEditing = false;
  }

  function editBlurHandler(e) {
    dispatch('consoleLog', 'blur ' + e.target.id);
    console.log('blur ' + e.target.id );

    editFocussed = false;
    console.log('calling stopEditing() from editBlurHandler');
    stopEditing();      
    internalDragFocus = false;

  }

  // function focusFromOutside() {
  //   dispatch('consoleLog', '-----> Focus from outside');    
  // }
  // function focusFromOutside() {
  //   dispatch('consoleLog', '-----> Focus from outside');    
  // }
  // function focusFromOutside() {
  //   dispatch('consoleLog', '-----> Focus from outside');    
  // }



  function inputHandler(e) {
    // console.log(e);
    let checkValue = parseFloat(dragElement.value);

    if (!isNaN(checkValue)) {
      preciseValue = checkValue;
      preciseValue = Math.min(preciseValue, max);
      preciseValue = Math.max(preciseValue, min);

      dispatch('input', preciseValue.toFixed(decimals));
    }
  }

  function keydownHandler(e) {
    dispatch('consoleLog', 'keydown: ' + e.key);

    // console.log(e);
    if (e.key == 'Shift') {
      shiftPressed = true;
    }
    if (e.key == 'Alt') {
      altPressed = true;
    }     
  }

  function keyupHandler(e) {
    dispatch('consoleLog', 'keyup: ' + e.key);

    // console.log(e)
    if (e.key == 'Shift') {
      shiftPressed = false;
    }
    if (e.key == 'Alt') {
      altPressed = false;
    }

    if (dragFocussed) {
      if (vertical && e.key == 'ArrowUp' || horizontal && e.key == 'ArrowRight') {
        stepValue(10);
      }     
      if (vertical && e.key == 'ArrowDown' || horizontal && e.key == 'ArrowLeft') {
        stepValue(-10);
      } 
    }

    if (!editing) {
      if (e.key == 'Enter') {
        startEditing();
      } 

    } else {
      if (e.key == 'Enter') {
        console.log('calling stopEditing() from keyupHandler Enter');
        stopEditing();
        internalDragFocus = true;
        dragElement.focus();
      } 
      if (e.key == 'Escape') {
        console.log('calling stopEditing() from keyupHandler Escape');
        stopEditing();
        internalDragFocus = true; 
        dragElement.focus();
      }     
    }

  }

  // updaters --------------------------------

  // update readonly state of input element
  $: if (dragElement) {
    // dragElement.readOnly = !editing;
    dragElement.readOnly = true;
  }

  // update stepFactor
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

  // update inline style string
  $: {
    style = mainStyle ?? '';
    style += dragFocussed && focusStyle ? ';' + focusStyle : '';
    style += !editing && stepFactor > 1 && fastStyle ? ';' + fastStyle : '';
    style += !editing && stepFactor < 1 && slowStyle ? ';' + slowStyle : '';
    style += editing && editingStyle ? ';' + editingStyle : '';
  }

  function setValue(val) {
    val = parseFloat(val);
    if (!isNaN(val)) preciseValue = val;
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
    console.log('startEditing');
    dispatch('consoleLog', 'startEditing');
    // console.log('startEditing')

    justStartedEditing = true;
    preciseValue = parseFloat(visibleValue);
    editing = true;
    editElement.setSelectionRange(0, 30);

    internalEditFocus = true;
    editElement.focus();

    // window.setTimeout(() => {
    //   console.log('timeout blur')
    //   dragElement.blur();

    //   window.setTimeout(() => {
    //     console.log('timeout focus')
    //     dragElement.focus();      
    //   }, 1000);

    // }, 1000);
  }

  function stopEditing() {
    console.log('stopEditing');
    dispatch('consoleLog', 'stopEditing');

    editing = false;
    editElement.setSelectionRange(0, 0);
    // dragElement.focus();
    setValue(visibleValue); 
    justStartedEditing = false;
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

<svelte:body style={dragging ? "position:fixed; overflow:hidden" : ""} />


<!-- I did a lot of versions to all the functionality in one input element, but didn't succeed -->

<!-- this is the editable input field -->
<input id="edit" type='text' pattern={min>=0 && step==Math.round(step) ? "[0-9]+" : undefined}
    on:mousedown|stopPropagation={() => {}}
    on:touchstart|stopPropagation={() => {}}
    on:input={inputHandler} 
    on:focus={editFocusHandler}
    on:blur={editBlurHandler}
    style={style}
    class={$$props.class}
    class:default={!$$props.class ? true : false}
    class:fast={stepFactor > 1 ? 'fast' : ''}
    class:slow={stepFactor < 1 ? 'slow' : ''}
    class:editing
    class:edit={true}
    class:hide={!editing}
    tabindex={-1}
    bind:value={visibleValue}
    bind:this={editElement}
/>

<!-- this is the input field controlled by mouse and touch drag events -->
<input id="drag" type='text'
    on:mouseenter={mouseenterHandler} 
    on:mouseleave={mouseleaveHandler} 
    on:mousedown|stopPropagation={mousedownHandler} 
    on:touchstart|stopPropagation={mousedownHandler}
    on:dblclick|stopPropagation={dblclickHandler}
    on:focus={dragFocusHandler}
    on:blur={dragBlurHandler}
    on:input={inputHandler} 
    style={style}
    class={$$props.class}
    class:default={!$$props.class ? true : false}
    class:fast={stepFactor > 1 ? 'fast' : ''}
    class:slow={stepFactor < 1 ? 'slow' : ''}
    class:drag={true}
    class:hide={editing}
    contenteditable={false}
    readonly="" 
    tabindex=0
    bind:value={visibleValue}
    bind:this={dragElement}
/>


<!-- 
    on:input={editing ? inputHandler : ''} 
-->
    
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
    padding: 5px;
    border: 1 solid #0004;
    border-radius: 4px;
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
    padding: 3px;
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

  input.hide {
    opacity: 0.2;
  }


</style>




