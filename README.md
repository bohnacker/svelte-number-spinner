# svelte-number-spinner

A number spinner component for Svelte. It's a simple input field with a number that can be controlled using the mouse or keyboard. Pressing *Alt* or *Alt+Shift* makes steps smaller or bigger.

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

| Prop           | Type    | Default     | Description                                 |
| -------------- | ------- | ----------- | ------------------------------------------- |
| value          | Number  | 0           | Input value                                 |
| min            | Number  | -MAX_VALUE  | Minimum value                               |
| max            | Number  | +MAX_VALUE  | Maximum value                               |
| step           | Number  | 1           | Step                                        |
| decimals       | Number  | 0           | Number of decimals                          | 
| horizontal     | Boolean | true        | Change value by dragging horizontally       |
| vertical       | Boolean | true        | Change value by dragging vertically         |
| class          | String  | undefined   | Custom component class name                 |
| mainStyle      | String  | undefined   | Custom inline style for general appearance  |
| focusStyle     | String  | undefined   | Custom inline style when focussed           |
| editingStyle   | String  | undefined   | Custom inline style when editing            |
| fastStyle      | String  | undefined   | Custom inline style for fast mode           |
| slowStyle      | String  | undefined   | Custom inline style for slow mode           |


## Styling

### Styling with custom class name

You can style the component by overriding the default styles by giving a custom class name. If you give your own class name all default styles are removed. So, best would be to take the default styles below, put it in your global css, rename the class and remove what you don't need.

It's recomended to keep the order for `:focus` and `.fast`/`.slow` selectors. Default styles are:

```css
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

```

### Styling with props

If you want to replace just a few of the styles or add some more without removing the default style, it might be easier for you to use the props `mainStyle`, `focusStyle`, `fastStyle`, `slowStyle` and `editingStyle`.

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

