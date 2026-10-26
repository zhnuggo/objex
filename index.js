/**
 * A single action definition processed by {@link Actions#process}.
 *
 * @template {any[]} [C=any[]]
 *     Argument tuple passed to condition checks (`not`, `on`, `or`, `and`).
 * @template {any[]} [A=any[]]
 *     Argument tuple passed to executed actions (`always`, `act`).
 *
 * @typedef {Object} Action
 * @property {(...args: A) => void} [always]
 *     Always runs first, before any condition checks, even if they fail.
 * @property {(...args: C) => boolean} [not]
 *     If this returns truthy, the action is skipped entirely
 *     (`otherwise` is not processed).
 * @property {(...args: C) => boolean} [on]
 *     Main condition. If omitted, the condition is treated as passed.
 * @property {(...args: C) => boolean} [or]
 *     Alternative condition, evaluated only if `on` failed.
 * @property {(...args: C) => boolean} [and]
 *     Additional condition, evaluated only if the condition is still passing.
 * @property {Action<C, A>[]} [before]
 *     Actions processed before `act` when the condition passes.
 * @property {(...args: A) => void} [act]
 *     Executed when the condition passes.
 * @property {Action<C, A>[]} [after]
 *     Actions processed after `act` when the condition passes.
 * @property {Action<C, A>[]} [otherwise]
 *     Actions processed when the condition fails.
 * @property {boolean} [continue]
 *     If strictly `true`, processing continues to the next action after
 *     this one passes (instead of ending the loop).
 */

/**
 * Optional settings for {@link Actions#process}.
 *
 * @template {any[]} [C=any[]]
 *     Argument tuple for conditional checks.
 * @template {any[]} [A=any[]]
 *     Argument tuple for executed actions.
 *
 * @typedef {Object} ProcessSettings
 * @property {C} [condArgs]
 *     Arguments for conditional checks specifically
 *     (defaults to `defaultArgs`).
 * @property {A} [actArgs]
 *     Arguments for executed actions specifically
 *     (defaults to `defaultArgs`).
 * @property {boolean} [checkAll]
 *     Whether to keep checking after the first passed condition
 *     (default `false`).
 */

/**
 * @template {any[]} [C=any[]]
 *     Argument tuple passed to condition checks.
 * @template {any[]} [A=any[]]
 *     Argument tuple passed to executed actions.
 */
export class Actions {
    /**
     * The actions supplied at initialization.
     *
     * @type {Action<C, A>[]}
     */
    actions;

    /**
     * @param {Action<C, A>[]} [actions=[]]
     *     The actions to process by default.
     */
    constructor(actions = []) {
        this.actions = actions;
    }

    /**
     * Go through a list of actions, checking conditions and executing
     * the matching actions.
     *
     * @param {any[]} defaultArgs
     *     Arguments supplied to conditions and actions
     *     (overridden by anything in `settings`).
     * @param {ProcessSettings<C, A>} [settings]
     *     Specific argument lists and processing options:
     * - condArgs: Arguments for conditional checks specifically.
     * - actArgs: Arguments for executed actions specifically.
     * - checkAll: Whether to keep checking after the first passed
     *   condition (default `false`).
     * @param {Action<C, A>[]} [actions]
     *     An optional array of actions to process instead.
     *     Defaults to whatever was supplied during initialization.
     * @returns {void}
     */
    process(defaultArgs, { condArgs, actArgs, checkAll } = {}, actions) {
        if (condArgs === undefined) {
            condArgs = defaultArgs;
        }

        if (actArgs === undefined) {
            actArgs = defaultArgs;
        }

        if (checkAll === undefined) {
            checkAll = false;
        }

        // Default to actions provided during initialization.
        if (actions === undefined) {
            actions = this.actions;
        }

        for (const action of actions) {
            // ALWAYS runs before any checks.
            if (action.always !== undefined) {
                action.always(...actArgs);
            }

            // Short-circuit end action if NOT clause true.
            if (action.not !== undefined && action.not(...condArgs)) {
                continue;
            }

            let conditionPassed = true;

            // ON is optional, to allow for ACT-only actions, such as using
            // BEFORE->ACT to put an preparatory action that only runs
            // when the main conditional is true.
            if (action.on !== undefined) {
                conditionPassed = action.on(...condArgs);
            }

            // Attempt OR clause if available.
            if (action.or !== undefined) {
                conditionPassed ||= action.or(...condArgs);
            }

            // Compare with AND clause if available.
            if (action.and !== undefined) {
                conditionPassed &&= action.and(...condArgs);
            }

            // Execute ACT if provided, and then kill loop.
            if (conditionPassed) {
                // BEFORE is processed before the main ACT.
                if (action.before !== undefined) {
                    this.process(defaultArgs, {
                        condArgs,
                        actArgs,
                        checkAll
                    }, action.before);
                }

                if (action.act !== undefined) {
                    action.act(...actArgs);
                }

                // AFTER is processed after the main ACT.
                if (action.after !== undefined) {
                    this.process(defaultArgs, {
                        condArgs,
                        actArgs,
                        checkAll
                    }, action.after);
                }

                if (!checkAll && action.continue !== true) {
                    break;
                }
            }
            // Execute a provided OTHERWISE when condition fails.
            else if (action.otherwise !== undefined) {
                this.process(defaultArgs, {
                    condArgs,
                    actArgs,
                    checkAll
                }, action.otherwise);
            }
        }
    }
}