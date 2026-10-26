import { expect } from 'chai';
import { Actions } from '../index.js';

/**
 * Minimal spy: records calls and returns a fixed value (or the result of a function).
 */
function spy(ret) {
    const fn = (...args) => {
        fn.calls.push(args);
        return typeof ret === 'function' ? ret(...args) : ret;
    };

    fn.calls = [];
    return fn;
}

/** Spy that also pushes `label` onto a shared log, for ordering checks. */
function logged(log, label, ret) {
    return spy((...args) => {
        log.push(label);
        return typeof ret === 'function' ? ret(...args) : ret;
    });
}

describe('Actions', () => {
    describe('constructor', () => {
        it('defaults to an empty actions list', () => {
            expect(new Actions().actions).to.deep.equal([]);
        });

        it('stores the supplied actions', () => {
            const list = [{ act() {} }];
            expect(new Actions(list).actions).to.equal(list);
        });
    });

    describe('process()', () => {
        it('does nothing (and does not throw) with no actions', () => {
            expect(() => new Actions().process([])).not.to.throw();
        });

        describe('argument handling', () => {
            it('spreads defaultArgs into conditions and actions', () => {
                const on = spy(true);
                const act = spy();
                new Actions([{ on, act }]).process([1, 2]);
                expect(on.calls).to.deep.equal([[1, 2]]);
                expect(act.calls).to.deep.equal([[1, 2]]);
            });

            it('uses condArgs for conditions instead of defaultArgs', () => {
                const on = spy(true);
                const act = spy();
                new Actions([{ on, act }]).process([1], { condArgs: ['c'] });
                expect(on.calls).to.deep.equal([['c']]);
                expect(act.calls).to.deep.equal([[1]]);
            });

            it('uses actArgs for actions instead of defaultArgs', () => {
                const on = spy(true);
                const act = spy();
                new Actions([{ on, act }]).process([1], { actArgs: ['a'] });
                expect(on.calls).to.deep.equal([[1]]);
                expect(act.calls).to.deep.equal([['a']]);
            });

            it('applies condArgs to NOT', () => {
                const not = spy(false);
                new Actions([{ not, act() {} }])
                    .process([1], { condArgs: ['c'] });
                expect(not.calls).to.deep.equal([['c']]);
            });

            it('applies condArgs to OR (ON false so OR is evaluated)', () => {
                const or = spy(false);
                new Actions([{ on: () => false, or, act() {} }])
                    .process([1], { condArgs: ['c'] });
                expect(or.calls).to.deep.equal([['c']]);
            });

            it('applies condArgs to AND (ON true so AND is evaluated)', () => {
                const and = spy(true);
                new Actions([{ on: () => true, and, act() {} }])
                    .process([1], { condArgs: ['c'] });
                expect(and.calls).to.deep.equal([['c']]);
            });
        });

        describe('condition logic', () => {
            it('runs act when ON is true', () => {
                const act = spy();
                new Actions([{ on: () => true, act }]).process([]);
                expect(act.calls).to.have.length(1);
            });

            it('does not run act when ON is false', () => {
                const act = spy();
                new Actions([{ on: () => false, act }]).process([]);
                expect(act.calls).to.have.length(0);
            });

            it('treats a missing ON as passed (ACT-only actions)', () => {
                const act = spy();
                new Actions([{ act }]).process([]);
                expect(act.calls).to.have.length(1);
            });

            it('skips the action entirely when NOT is true', () => {
                const on = spy(true);
                const act = spy();
                const otherwise = { act: spy() };
                new Actions([{ not: () => true, on, act, otherwise: [otherwise] }])
                    .process([]);
                expect(on.calls).to.have.length(0);
                expect(act.calls).to.have.length(0);
                expect(otherwise.act.calls).to.have.length(0);
            });

            it('continues evaluating when NOT is false', () => {
                const act = spy();
                new Actions([{ not: () => false, on: () => true, act }]).process([]);
                expect(act.calls).to.have.length(1);
            });

            it('NOT skipping an action does not stop later actions', () => {
                const act = spy();
                new Actions([
                    { not: () => true, act: () => {} },
                    { act }
                ]).process([]);
                expect(act.calls).to.have.length(1);
            });

            it('OR rescues a failed ON', () => {
                const act = spy();
                new Actions([{ on: () => false, or: () => true, act }]).process([]);
                expect(act.calls).to.have.length(1);
            });

            it('fails when both ON and OR are false', () => {
                const act = spy();
                new Actions([{ on: () => false, or: () => false, act }]).process([]);
                expect(act.calls).to.have.length(0);
            });

            it('AND must also be true when ON is true', () => {
                const act = spy();
                new Actions([{ on: () => true, and: () => false, act }]).process([]);
                expect(act.calls).to.have.length(0);
            });

            it('passes when ON and AND are both true', () => {
                const act = spy();
                new Actions([{ on: () => true, and: () => true, act }]).process([]);
                expect(act.calls).to.have.length(1);
            });

            it('evaluates AND after OR: (on || or) && and', () => {
                const act = spy();
                new Actions([{
                    on: () => false,
                    or: () => true,
                    and: () => false,
                    act
                }]).process([]);
                expect(act.calls).to.have.length(0);
            });
        });

        describe('loop control', () => {
            it('stops after the first passing action by default', () => {
                const first = spy();
                const second = spy();
                new Actions([{ act: first }, { act: second }]).process([]);
                expect(first.calls).to.have.length(1);
                expect(second.calls).to.have.length(0);
            });

            it('moves on to later actions when earlier ones fail', () => {
                const second = spy();
                new Actions([{ on: () => false, act() {} }, { act: second }])
                    .process([]);
                expect(second.calls).to.have.length(1);
            });

            it('continues past a passing action marked continue: true', () => {
                const first = spy();
                const second = spy();
                new Actions([{ act: first, continue: true }, { act: second }])
                    .process([]);
                expect(first.calls).to.have.length(1);
                expect(second.calls).to.have.length(1);
            });

            it('only honours continue when strictly true', () => {
                const second = spy();
                new Actions([{ act() {}, continue: 'yes' }, { act: second }])
                    .process([]);
                expect(second.calls).to.have.length(0);
            });

            it('runs every passing action when checkAll is true', () => {
                const a = spy();
                const b = spy();
                const c = spy();
                new Actions([{ act: a }, { act: b }, { on: () => false, act: c }])
                    .process([], { checkAll: true });
                expect(a.calls).to.have.length(1);
                expect(b.calls).to.have.length(1);
                expect(c.calls).to.have.length(0);
            });

            it('defaults checkAll to false', () => {
                const second = spy();
                new Actions([{ act() {} }, { act: second }]).process([], {});
                expect(second.calls).to.have.length(0);
            });
        });

        describe('ALWAYS', () => {
            it('runs even when the condition fails', () => {
                const always = spy();
                new Actions([{ always, on: () => false, act() {} }]).process([]);
                expect(always.calls).to.have.length(1);
            });

            it('runs even when NOT short-circuits the action', () => {
                const always = spy();
                new Actions([{ always, not: () => true }]).process([]);
                expect(always.calls).to.have.length(1);
            });

            it('runs before any condition is checked', () => {
                const log = [];
                new Actions([{
                    always: logged(log, 'always'),
                    not: logged(log, 'not', false),
                    on: logged(log, 'on', true),
                    act: logged(log, 'act')
                }]).process([]);
                expect(log).to.deep.equal(['always', 'not', 'on', 'act']);
            });

            it('runs for actions that come after a passing action only if the loop continues', () => {
                const always = spy();
                new Actions([{ act() {} }, { always }]).process([]);
                expect(always.calls).to.have.length(0);

                new Actions([{ act() {} }, { always }]).process([], { checkAll: true });
                expect(always.calls).to.have.length(1);
            });
        });

        describe('BEFORE / AFTER', () => {
            it('runs BEFORE, then ACT, then AFTER', () => {
                const log = [];
                new Actions([{
                    before: [{ act: logged(log, 'before') }],
                    act: logged(log, 'act'),
                    after: [{ act: logged(log, 'after') }]
                }]).process([]);
                expect(log).to.deep.equal(['before', 'act', 'after']);
            });

            it('does not run BEFORE or AFTER when the condition fails', () => {
                const before = spy();
                const after = spy();
                new Actions([{
                    on: () => false,
                    before: [{ act: before }],
                    after: [{ act: after }],
                    act() {}
                }]).process([]);
                expect(before.calls).to.have.length(0);
                expect(after.calls).to.have.length(0);
            });

            it('passes the same args to nested actions', () => {
                const before = spy();
                const beforeOn = spy(true);
                new Actions([{
                    before: [{ on: beforeOn, act: before }],
                    act() {}
                }]).process([1, 2], { condArgs: ['c'], actArgs: ['a'] });
                expect(beforeOn.calls).to.deep.equal([['c']]);
                expect(before.calls).to.deep.equal([['a']]);
            });

            it('honours nested conditions', () => {
                const before = spy();
                new Actions([{
                    before: [{ on: () => false, act: before }],
                    act() {}
                }]).process([]);
                expect(before.calls).to.have.length(0);
            });

            it('works with BEFORE/AFTER and no ACT', () => {
                const log = [];
                new Actions([{
                    before: [{ act: logged(log, 'before') }],
                    after: [{ act: logged(log, 'after') }]
                }]).process([]);
                expect(log).to.deep.equal(['before', 'after']);
            });

            it('a break inside a nested list does not stop the outer loop with checkAll', () => {
                const outerSecond = spy();
                new Actions([
                    { before: [{ act() {} }, { act() {} }], act() {} },
                    { act: outerSecond }
                ]).process([], { checkAll: true });
                expect(outerSecond.calls).to.have.length(1);
            });

            it('propagates checkAll to nested lists', () => {
                const b1 = spy();
                const b2 = spy();
                new Actions([{
                    before: [{ act: b1 }, { act: b2 }],
                    act() {}
                }]).process([], { checkAll: true });
                expect(b1.calls).to.have.length(1);
                expect(b2.calls).to.have.length(1);
            });
        });

        describe('OTHERWISE', () => {
            it('runs when the condition fails', () => {
                const otherwise = spy();
                const act = spy();
                new Actions([{
                    on: () => false,
                    act,
                    otherwise: [{ act: otherwise }]
                }]).process([]);
                expect(act.calls).to.have.length(0);
                expect(otherwise.calls).to.have.length(1);
            });

            it('does not run when the condition passes', () => {
                const otherwise = spy();
                new Actions([{
                    on: () => true,
                    act() {},
                    otherwise: [{ act: otherwise }]
                }]).process([]);
                expect(otherwise.calls).to.have.length(0);
            });

            it('receives the same args as the parent', () => {
                const otherwise = spy();
                new Actions([{
                    on: () => false,
                    otherwise: [{ act: otherwise }]
                }]).process([1], { actArgs: ['a'] });
                expect(otherwise.calls).to.deep.equal([['a']]);
            });

            it('does not stop the outer loop', () => {
                const next = spy();
                new Actions([
                    { on: () => false, otherwise: [{ act() {} }] },
                    { act: next }
                ]).process([]);
                expect(next.calls).to.have.length(1);
            });
        });

        describe('actions override parameter', () => {
            it('processes the supplied list instead of this.actions', () => {
                const own = spy();
                const override = spy();
                new Actions([{ act: own }]).process([], undefined, [{ act: override }]);
                expect(own.calls).to.have.length(0);
                expect(override.calls).to.have.length(1);
            });

            it('falls back to this.actions when undefined', () => {
                const own = spy();
                new Actions([{ act: own }]).process([], {}, undefined);
                expect(own.calls).to.have.length(1);
            });
        });

        describe('robustness', () => {
            it('tolerates an action with no recognised keys', () => {
                expect(() => new Actions([{}]).process([])).not.to.throw();
            });

            it('does not mutate the actions list', () => {
                const list = [{ act() {} }];
                const actions = new Actions(list);
                actions.process([]);
                expect(actions.actions).to.equal(list);
                expect(list).to.have.length(1);
            });
        });
    });
});