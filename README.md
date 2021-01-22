# svelte-number-spinner

A number spinner component for Svelte. It's a simple input field with a number that can be controlled using the mouse or keyboard. Pressing *Alt* or *Shift* makes steps smaller or bigger.


## Installation

```bash
npm install --save svelte-number-spinner
```
or 
```bash
yarn add svelte-number-spinner
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

| Prop           | Type    | Default     | Description              |
| -------------- | ------- | ----------- | ------------------------ |
| value          | Number  | 0           | Input value              |
| min            | Number  | -MAX_VALUE  | Minimum value            |
| max            | Number  | +MAX_VALUE  | Maximum value            |
| step           | Number  | 1           | Step                     |
| decimals       | Number  | 0           | Number of decimals       | 
| width          | Number  | 60          | Width of the component   |
| customClass    | String  | undefined   | Custom component class   |

<br />

