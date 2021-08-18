# svelte-number-spinner

A number spinner component for Svelte. It's a simple input field with a number that can be controlled using the mouse or keyboard. Pressing *Alt* or *Alt+Shift* makes steps smaller or bigger. Clicking on the input field without dragging the mouse or pressing *Enter* starts the normal input mode.

#### New since version 0.6.0
Mobile devices with touch are now also supported which needed some major rework. I had to remove the option to select between double click or simple click to start editing. Now, only simple click is possible.

## Demo

[Number spinner demo on svelte.dev/repl](https://svelte.dev/repl/a73eaa408b804beb9f7a3457926f9829?version=3.31.2)


## Installation

```bash
npm install --save svelte-number-spinner
```

## Usage

```html
<script>
  import NumberSpinner from "svelte-number-spinner";

  let value = 50;
</script>

<NumberSpinner bind:value min=0 max=100 />
```


## Props

| Prop           | Type    | Default     | Description                                         |
| -------------- | ------- | ----------- | --------------------------------------------------- |
| value          | Number  | 0           | Input value                                         |
| min            | Number  | -MAX_VALUE  | Minimum value                                       |
| max            | Number  | +MAX_VALUE  | Maximum value                                       |
| step           | Number  | 1           | Step                                                |
| precision      | Number  | = step      | Precision of value (should be a fraction of step)   |
| decimals       | Number  | 0           | Number of decimals                                  | 
| speed          | Number  | 1           | Speed of value change on mouse drag or key press    |
| horizontal     | Boolean | true        | Change value by dragging horizontally               |
| vertical       | Boolean | false       | Change value by dragging vertically                 |
| circular       | Boolean | false       | Enable circular range (good for angles, hours, ...) |
| cursor         | String  | undefined   | Individual cursor                                   |
| class          | String  | undefined   | Custom component class name                         |
| mainStyle      | String  | undefined   | Custom inline style for general appearance          |
| focusStyle     | String  | undefined   | Custom inline style when focussed                   |
| draggingStyle  | String  | undefined   | Custom inline style when dragging                   |
| editingStyle   | String  | undefined   | Custom inline style when editing                    |
| fastStyle      | String  | undefined   | Custom inline style for fast mode                   |
| slowStyle      | String  | undefined   | Custom inline style for slow mode                   |
| options        | Object  | {}          | Set any of the above props through this object      |


#### Prop `options`

If you have many number spinners that should have the same props you might want to use the `options` object. This sets all of the given props to the respective value. 

The props in the options object are applied when mounting the component. So, changing the options later won't update the props of the number spinner. Plus, the props in the options object will not be modified by the number spinner component. So, `value` should typically not be part of the options. 

Example:

```html
<script>
  import NumberSpinner from "svelte-number-spinner";

  let value1 = 50;
  let value2 = 10;
  let options = {horizontal:false, vertical:true}
</script>

<NumberSpinner bind:value={value1} min=0 max=100 {options} />
<NumberSpinner bind:value={value2} min=-30 max=30 {options} />
```


## Styling

### Styling with custom class name

You can style the component by overriding the default styles by giving a custom class name. If you give your own class name all default styles are removed. So, best would be to take the default styles below, put it in your global css, rename the class and remove and change stuff.

It's recomended to keep the order for `:focus` and `.fast`/`.slow` selectors. Default styles are:

```css
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
```

### Styling with props

If you want to replace just a few of the styles or add some more without removing the default style, it might be easier for you to use the props `mainStyle`, `focusStyle`, `fastStyle`, `slowStyle`, `draggingStyle` and `editingStyle`.

For each of them you can give a style string like `"width:80px; padding-right:10px"`. In the example below only the font color for fast and slow mode are changed:

```html
<script>
  import NumberSpinner from "svelte-number-spinner";
</script>

<NumberSpinner fastStyle="color:orange" slowStyle="color:purple" />
```

## Events

| Event Name     | Callback           | Description                                          |
| -------------- | ------------------ | ---------------------------------------------------- |
| input          | (ev) => ev.detail  | Fires when value changes                             |
| change         | (ev) => ev.detail  | Fires when value changes, won't fire while typing    |

<br />

```html
<script>
  import NumberSpinner from "svelte-number-spinner";

  function handleInput(ev) {
    console.log("Value send by input event:", ev.detail);    
  }

  function handleChange(ev) {
    console.log("Value send by change event:", ev.detail);    
  }
</script>

<NumberSpinner on:input="handleInput" on:change="handleChange" />
```

In most cases you will probably use ```bind:value``` to react to changes of the value. This is more or less the same as listening to the change event. Use the input event if you need to get the changes while the user is typing.


## Develop

```bash
npm run dev
```

This will build the component and start a livereload server for the example. 

