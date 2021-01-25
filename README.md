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

<NumberSpinner bind:value min=0 max=100 ></NumberSpinner>
```

<br />

## Props

| Prop           | Type    | Default     | Description                             |
| -------------- | ------- | ----------- | --------------------------------------- |
| value          | Number  | 0           | Input value                             |
| min            | Number  | -MAX_VALUE  | Minimum value                           |
| max            | Number  | +MAX_VALUE  | Maximum value                           |
| step           | Number  | 1           | Step                                    |
| decimals       | Number  | 0           | Number of decimals                      | 
| width          | Number  | 60          | Width of the component                  |
| height         | Number  | 25          | Height of the component                 |
| horizontal     | Boolean | true        | Change value by dragging horizontally   |
| vertical       | Boolean | true        | Change value by dragging vertically     |
| class          | String  | undefined   | Custom component class name             |

<br />

## Events

| Event Name     | Callback           | Description                                          |
| -------------- | ------------------ | ---------------------------------------------------- |
| input          | (ev) => ev.detail  | Fires when value changes                             |
| change         | (ev) => ev.detail  | Fires when value changes, won't fire while typing    |

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

<NumberSpinner on:input="handleInput" on:change="handleChange" ></NumberSpinner>
```

In most cases you will probably use ```bind:value``` to react to changes of the value. This is more or less the same as listening to the change event. Use the input event if you need to get the changes while the user is typing.

<br />


