# Objex


![Tests](https://img.shields.io/badge/tests-Mocha_+_Chai-saddlebrown?logo=mocha&logoColor=white&style=for-the-badge)
![Tests](https://img.shields.io/badge/passed-45_/_45-brightgreen?logo=testcafe&logoColor=white&style=for-the-badge)
<br>
![Dependencies](https://img.shields.io/badge/dependencies-none-brightgreen?style=for-the-badge)
[![NPM version](https://img.shields.io/npm/v/@zhnuggo/objex.svg?style=for-the-badge)](https://www.npmjs.com/package/@zhnuggo/objex)

A library for Object Expressions.

As of right now, there are only "action" object expressions.

You define a list of actions, which can come with their own conditions and
sub-actions, to define a more complicated control flow that might be awkward to
write with regular `if`/`else` statements.

## Contents

- [Quick start](#quick-start)
- [Action properties](#action-properties)
- [Arguments](#arguments)
- [Loop control](#loop-control)
- [Nested action lists](#nested-action-lists)
- [API](#api)

## Quick start
Install using
```bash
npm i @zhnuggo/objex
```

and then include it in your code:

```js
import { Actions } from '@zhnuggo/objex';

const handler = new Actions([
    {
        on: (msg) => msg.startsWith('/help'),
        act: (msg) => console.log('Showing help'),
    },
    {
        on: (msg) => msg.startsWith('/quit'),
        or: (msg) => msg === 'exit',
        act: () => console.log('Goodbye'),
    },
    {
        // No condition: acts as a fallback.
        act: (msg) => console.log(`Unknown input: ${msg}`),
    },
]);

handler.process(['/help']);  // Showing help
handler.process(['exit']);   // Goodbye
handler.process(['hello']);  // Unknown input: hello
```

By default, processing stops after the first action whose condition passes.  
You can use the `checkAll` setting to evaluate every action.

## Action properties

Every property is optional.

| Property    | Receives     | Purpose |
|-------------|--------------|---------|
| `always`    | action args  | Runs first, before any condition is checked, even if the action later fails or is skipped. |
| `not`       | cond args    | If it returns truthy, the action is skipped entirely (`otherwise` is **not** processed). |
| `on`        | cond args    | The main condition. If omitted, the condition counts as passed. |
| `or`        | cond args    | Alternative condition. Only evaluated if `on` failed. |
| `and`       | cond args    | Additional condition. Only evaluated if the condition is still passing. |
| `before`    | n/a          | Array of actions processed before `act` when the condition passes. |
| `act`       | action args  | Executed when the condition passes. |
| `after`     | n/a          | Array of actions processed after `act` when the condition passes. |
| `otherwise` | n/a          | Array of actions processed when the condition fails. |
| `continue`  | n/a          | If `true`, processing continues to the next action after this one passes. |

## Arguments

The `process` method takes a list of default arguments, which can be overridden separately for conditions and actions:

```js
handler.process(['a', 'b']);
// on('a', 'b'), act('a', 'b')

handler.process(['a', 'b'], { condArgs: [1], actArgs: [2, 3] });
// on(1), act(2, 3)
```

- **Condition arguments** (`condArgs`) go to `not`, `on`, `or` and `and`.
- **Action arguments** (`actArgs`) go to `always` and `act`.

Each defaults to `defaultArgs` if not supplied.

## Loop control

| Setting | Behaviour |
|---------|-----------|
| *(default)* | The first passing action runs, then the loop ends. |
| `continue: true` on an action | After that action passes, the loop carries on to the next one. |
| `checkAll: true` in settings | Every action is checked and every passing action runs. |

```js
const actions = new Actions([
    { on: (n) => n > 0, act: () => console.log('positive'), continue: true },
    { on: (n) => n % 2 === 0, act: () => console.log('even') },
]);

actions.process([4]);
// positive
// even
```

Without `continue: true` (or `checkAll`), only `positive` would be logged.

## Nested action lists

`before`, `after` and `otherwise` each take an array of actions, processed with the same rules as the top-level list, including `always`, `not`, `continue` and further nesting. They inherit the parent's `condArgs`, `actArgs` and `checkAll`.

A stopping point inside a nested list only ends *that* list; it never ends the parent loop.

```js
new Actions([
    {
        on: (user) => user.isAdmin,
        before: [{ act: (user) => console.log('Checking permissions') }],
        act: (user) => console.log('Welcome, admin'),
        after: [{ act: (user) => console.log('Logged access') }],
        otherwise: [{ act: (user) => console.log('Access denied') }],
    },
]).process([{ isAdmin: true }]);
// Checking permissions
// Welcome, admin
// Logged access
```

## API

### `new Actions(actions = [])`

Creates an instance. The array is stored as the public `actions` property and is used as the default list for `process`.

### `actions.process(defaultArgs, settings?, actions?)`

| Parameter | Type | Description |
|-----------|------|-------------|
| `defaultArgs` | `any[]` | Arguments given to conditions and actions unless overridden. |
| `settings.condArgs` | `any[]` | Arguments for `not`, `on`, `or`, `and`. Defaults to `defaultArgs`. |
| `settings.actArgs` | `any[]` | Arguments for `always` and `act`. Defaults to `defaultArgs`. |
| `settings.checkAll` | `boolean` | Keep checking after the first passed condition. Defaults to `false`. |
| `actions` | `Action[]` | Process this list instead of `this.actions`. |
