/**
 * A single action definition processed by {@link Actions.process}.
 *
 * @typeParam C - Argument tuple passed to condition checks (`not`, `on`, `or`, `and`).
 * @typeParam A - Argument tuple passed to executed actions (`always`, `act`).
 */
export interface Action<C extends any[] = any[], A extends any[] = any[]> {
    /** Always runs first, before any condition checks, even if they fail. */
    always?: (...args: A) => void;

    /** If this returns truthy, the action is skipped entirely (no `otherwise`). */
    not?: (...args: C) => boolean;

    /** Main condition. If omitted, the condition is treated as passed. */
    on?: (...args: C) => boolean;

    /** Alternative condition, evaluated only if `on` failed. */
    or?: (...args: C) => boolean;

    /** Additional condition, evaluated only if the condition is still passing. */
    and?: (...args: C) => boolean;

    /** Actions processed before `act` when the condition passes. */
    before?: Action<C, A>[];

    /** Executed when the condition passes. */
    act?: (...args: A) => void;

    /** Actions processed after `act` when the condition passes. */
    after?: Action<C, A>[];

    /** Actions processed when the condition fails. */
    otherwise?: Action<C, A>[];

    /**
     * If strictly `true`, processing continues to the next action
     * after this one passes (instead of ending the loop).
     */
    continue?: boolean;
}

/**
 * Optional settings for {@link Actions.process}.
 *
 * @typeParam C - Argument tuple for conditional checks.
 * @typeParam A - Argument tuple for executed actions.
 */
export interface ProcessSettings<C extends any[] = any[], A extends any[] = any[]> {
    /** Arguments for conditional checks specifically (defaults to `defaultArgs`). */
    condArgs?: C;

    /** Arguments for executed actions specifically (defaults to `defaultArgs`). */
    actArgs?: A;

    /** Whether to keep checking after the first passed condition (default `false`). */
    checkAll?: boolean;
}

export class Actions<C extends any[] = any[], A extends any[] = any[]> {
    /** The actions supplied at initialization. */
    actions: Action<C, A>[];

    constructor(actions?: Action<C, A>[]);

    /**
     * Go through a list of actions, checking conditions and executing
     * the matching actions.
     *
     * @param defaultArgs Arguments supplied to conditions and actions
     *     (overridden by anything in `settings`).
     * @param settings Specific argument lists and processing options.
     * @param actions Optional actions to process instead of `this.actions`.
     */
    process(
        defaultArgs: any[],
        settings?: ProcessSettings<C, A>,
        actions?: Action<C, A>[]
    ): void;
}