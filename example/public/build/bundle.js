var app = (function () {
    'use strict';

    function noop() { }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.wholeText !== data)
            text.data = data;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function createCommonjsModule(fn, basedir, module) {
    	return module = {
    	  path: basedir,
    	  exports: {},
    	  require: function (path, base) {
          return commonjsRequire(path, (base === undefined || base === null) ? module.path : base);
        }
    	}, fn(module, module.exports), module.exports;
    }

    function commonjsRequire () {
    	throw new Error('Dynamic requires are not currently supported by @rollup/plugin-commonjs');
    }

    var dist = createCommonjsModule(function (module, exports) {
    (function (global, factory) {
         module.exports = factory() ;
    }(commonjsGlobal, (function () {
        function noop() { }
        function assign(tar, src) {
            // @ts-ignore
            for (const k in src)
                tar[k] = src[k];
            return tar;
        }
        function run(fn) {
            return fn();
        }
        function blank_object() {
            return Object.create(null);
        }
        function run_all(fns) {
            fns.forEach(run);
        }
        function is_function(thing) {
            return typeof thing === 'function';
        }
        function safe_not_equal(a, b) {
            return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
        }
        function is_empty(obj) {
            return Object.keys(obj).length === 0;
        }
        function exclude_internal_props(props) {
            const result = {};
            for (const k in props)
                if (k[0] !== '$')
                    result[k] = props[k];
            return result;
        }
        function null_to_empty(value) {
            return value == null ? '' : value;
        }

        function append(target, node) {
            target.appendChild(node);
        }
        function insert(target, node, anchor) {
            target.insertBefore(node, anchor || null);
        }
        function detach(node) {
            node.parentNode.removeChild(node);
        }
        function element(name) {
            return document.createElement(name);
        }
        function listen(node, event, handler, options) {
            node.addEventListener(event, handler, options);
            return () => node.removeEventListener(event, handler, options);
        }
        function attr(node, attribute, value) {
            if (value == null)
                node.removeAttribute(attribute);
            else if (node.getAttribute(attribute) !== value)
                node.setAttribute(attribute, value);
        }
        function children(element) {
            return Array.from(element.childNodes);
        }
        function set_input_value(input, value) {
            input.value = value == null ? '' : value;
        }
        function toggle_class(element, name, toggle) {
            element.classList[toggle ? 'add' : 'remove'](name);
        }
        function custom_event(type, detail) {
            const e = document.createEvent('CustomEvent');
            e.initCustomEvent(type, false, false, detail);
            return e;
        }

        let current_component;
        function set_current_component(component) {
            current_component = component;
        }
        function get_current_component() {
            if (!current_component)
                throw new Error('Function called outside component initialization');
            return current_component;
        }
        function createEventDispatcher() {
            const component = get_current_component();
            return (type, detail) => {
                const callbacks = component.$$.callbacks[type];
                if (callbacks) {
                    // TODO are there situations where events could be dispatched
                    // in a server (non-DOM) environment?
                    const event = custom_event(type, detail);
                    callbacks.slice().forEach(fn => {
                        fn.call(component, event);
                    });
                }
            };
        }

        const dirty_components = [];
        const binding_callbacks = [];
        const render_callbacks = [];
        const flush_callbacks = [];
        const resolved_promise = Promise.resolve();
        let update_scheduled = false;
        function schedule_update() {
            if (!update_scheduled) {
                update_scheduled = true;
                resolved_promise.then(flush);
            }
        }
        function add_render_callback(fn) {
            render_callbacks.push(fn);
        }
        let flushing = false;
        const seen_callbacks = new Set();
        function flush() {
            if (flushing)
                return;
            flushing = true;
            do {
                // first, call beforeUpdate functions
                // and update components
                for (let i = 0; i < dirty_components.length; i += 1) {
                    const component = dirty_components[i];
                    set_current_component(component);
                    update(component.$$);
                }
                set_current_component(null);
                dirty_components.length = 0;
                while (binding_callbacks.length)
                    binding_callbacks.pop()();
                // then, once components are updated, call
                // afterUpdate functions. This may cause
                // subsequent updates...
                for (let i = 0; i < render_callbacks.length; i += 1) {
                    const callback = render_callbacks[i];
                    if (!seen_callbacks.has(callback)) {
                        // ...so guard against infinite loops
                        seen_callbacks.add(callback);
                        callback();
                    }
                }
                render_callbacks.length = 0;
            } while (dirty_components.length);
            while (flush_callbacks.length) {
                flush_callbacks.pop()();
            }
            update_scheduled = false;
            flushing = false;
            seen_callbacks.clear();
        }
        function update($$) {
            if ($$.fragment !== null) {
                $$.update();
                run_all($$.before_update);
                const dirty = $$.dirty;
                $$.dirty = [-1];
                $$.fragment && $$.fragment.p($$.ctx, dirty);
                $$.after_update.forEach(add_render_callback);
            }
        }
        const outroing = new Set();
        function transition_in(block, local) {
            if (block && block.i) {
                outroing.delete(block);
                block.i(local);
            }
        }
        function mount_component(component, target, anchor) {
            const { fragment, on_mount, on_destroy, after_update } = component.$$;
            fragment && fragment.m(target, anchor);
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
            after_update.forEach(add_render_callback);
        }
        function destroy_component(component, detaching) {
            const $$ = component.$$;
            if ($$.fragment !== null) {
                run_all($$.on_destroy);
                $$.fragment && $$.fragment.d(detaching);
                // TODO null out other refs, including component.$$ (but need to
                // preserve final state?)
                $$.on_destroy = $$.fragment = null;
                $$.ctx = [];
            }
        }
        function make_dirty(component, i) {
            if (component.$$.dirty[0] === -1) {
                dirty_components.push(component);
                schedule_update();
                component.$$.dirty.fill(0);
            }
            component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
        }
        function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
            const parent_component = current_component;
            set_current_component(component);
            const prop_values = options.props || {};
            const $$ = component.$$ = {
                fragment: null,
                ctx: null,
                // state
                props,
                update: noop,
                not_equal,
                bound: blank_object(),
                // lifecycle
                on_mount: [],
                on_destroy: [],
                before_update: [],
                after_update: [],
                context: new Map(parent_component ? parent_component.$$.context : []),
                // everything else
                callbacks: blank_object(),
                dirty,
                skip_bound: false
            };
            let ready = false;
            $$.ctx = instance
                ? instance(component, prop_values, (i, ret, ...rest) => {
                    const value = rest.length ? rest[0] : ret;
                    if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                        if (!$$.skip_bound && $$.bound[i])
                            $$.bound[i](value);
                        if (ready)
                            make_dirty(component, i);
                    }
                    return ret;
                })
                : [];
            $$.update();
            ready = true;
            run_all($$.before_update);
            // `false` as a special case of no DOM component
            $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
            if (options.target) {
                if (options.hydrate) {
                    const nodes = children(options.target);
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    $$.fragment && $$.fragment.l(nodes);
                    nodes.forEach(detach);
                }
                else {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    $$.fragment && $$.fragment.c();
                }
                if (options.intro)
                    transition_in(component.$$.fragment);
                mount_component(component, options.target, options.anchor);
                flush();
            }
            set_current_component(parent_component);
        }
        /**
         * Base class for Svelte components. Used when dev=false.
         */
        class SvelteComponent {
            $destroy() {
                destroy_component(this, 1);
                this.$destroy = noop;
            }
            $on(type, callback) {
                const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
                callbacks.push(callback);
                return () => {
                    const index = callbacks.indexOf(callback);
                    if (index !== -1)
                        callbacks.splice(index, 1);
                };
            }
            $set($$props) {
                if (this.$$set && !is_empty($$props)) {
                    this.$$.skip_bound = true;
                    this.$$set($$props);
                    this.$$.skip_bound = false;
                }
            }
        }

        /* src/NumberSpinner.svelte generated by Svelte v3.31.2 */

        function add_css() {
        	var style = element("style");
        	style.id = "svelte-8bd7vo-style";
        	style.textContent = ".default.svelte-8bd7vo{display:inline-block;box-sizing:border-box;font-variant-numeric:tabular-nums;background-color:white;color:black;width:60px;height:25px;margin:0px;padding:5px;border:1px solid #0004;border-radius:5px;text-align:right;cursor:initial}.default.svelte-8bd7vo:focus{border:1px solid #06f;outline:none}.default.fast.svelte-8bd7vo{color:tomato}.default.slow.svelte-8bd7vo{color:green}.default.editing.svelte-8bd7vo{border:2px solid #06f;padding:4px;cursor:default}input.svelte-8bd7vo{user-select:none}input.svelte-8bd7vo:not(.editing)::selection{background:#0000}input.editing.svelte-8bd7vo{user-select:text}";
        	append(document.head, style);
        }

        function create_fragment(ctx) {
        	let input;
        	let input_class_value;
        	let input_contenteditable_value;
        	let mounted;
        	let dispose;

        	return {
        		c() {
        			input = element("input");
        			attr(input, "type", "text");
        			attr(input, "style", /*style*/ ctx[5]);
        			attr(input, "class", input_class_value = "" + (null_to_empty(/*$$props*/ ctx[16].class) + " svelte-8bd7vo"));
        			attr(input, "contenteditable", input_contenteditable_value = /*editing*/ ctx[2] ? "true" : "false");
        			attr(input, "tabindex", "0");
        			toggle_class(input, "default", !/*$$props*/ ctx[16].class ? true : false);
        			toggle_class(input, "fast", /*stepFactor*/ ctx[1] > 1 ? "fast" : "");
        			toggle_class(input, "slow", /*stepFactor*/ ctx[1] < 1 ? "slow" : "");
        			toggle_class(input, "editing", /*editing*/ ctx[2]);
        		},
        		m(target, anchor) {
        			insert(target, input, anchor);
        			set_input_value(input, /*visibleValue*/ ctx[4]);
        			/*input_binding*/ ctx[35](input);

        			if (!mounted) {
        				dispose = [
        					listen(window, "mousemove", function () {
        						if (is_function(/*dragging*/ ctx[3] ? /*mousemoveHandler*/ ctx[7] : "")) (/*dragging*/ ctx[3] ? /*mousemoveHandler*/ ctx[7] : "").apply(this, arguments);
        					}),
        					listen(window, "mouseup", function () {
        						if (is_function(/*dragging*/ ctx[3] ? /*mouseupHandler*/ ctx[8] : "")) (/*dragging*/ ctx[3] ? /*mouseupHandler*/ ctx[8] : "").apply(this, arguments);
        					}),
        					listen(window, "mousedown", function () {
        						if (is_function(/*editing*/ ctx[2] ? /*windowdownHandler*/ ctx[10] : "")) (/*editing*/ ctx[2] ? /*windowdownHandler*/ ctx[10] : "").apply(this, arguments);
        					}),
        					listen(window, "keydown", /*keydownHandler*/ ctx[14]),
        					listen(window, "keyup", /*keyupHandler*/ ctx[15]),
        					listen(input, "mouseenter", mouseenterHandler),
        					listen(input, "mouseleave", mouseleaveHandler),
        					listen(input, "mousedown", /*mousedownHandler*/ ctx[6]),
        					listen(input, "dblclick", /*dblclickHandler*/ ctx[9]),
        					listen(input, "focus", /*focusHandler*/ ctx[11]),
        					listen(input, "blur", /*blurHandler*/ ctx[12]),
        					listen(input, "input", /*inputHandler*/ ctx[13]),
        					listen(input, "input", /*input_input_handler*/ ctx[34])
        				];

        				mounted = true;
        			}
        		},
        		p(new_ctx, dirty) {
        			ctx = new_ctx;

        			if (dirty[0] & /*style*/ 32) {
        				attr(input, "style", /*style*/ ctx[5]);
        			}

        			if (dirty[0] & /*$$props*/ 65536 && input_class_value !== (input_class_value = "" + (null_to_empty(/*$$props*/ ctx[16].class) + " svelte-8bd7vo"))) {
        				attr(input, "class", input_class_value);
        			}

        			if (dirty[0] & /*editing*/ 4 && input_contenteditable_value !== (input_contenteditable_value = /*editing*/ ctx[2] ? "true" : "false")) {
        				attr(input, "contenteditable", input_contenteditable_value);
        			}

        			if (dirty[0] & /*visibleValue*/ 16 && input.value !== /*visibleValue*/ ctx[4]) {
        				set_input_value(input, /*visibleValue*/ ctx[4]);
        			}

        			if (dirty[0] & /*$$props, $$props*/ 65536) {
        				toggle_class(input, "default", !/*$$props*/ ctx[16].class ? true : false);
        			}

        			if (dirty[0] & /*$$props, stepFactor*/ 65538) {
        				toggle_class(input, "fast", /*stepFactor*/ ctx[1] > 1 ? "fast" : "");
        			}

        			if (dirty[0] & /*$$props, stepFactor*/ 65538) {
        				toggle_class(input, "slow", /*stepFactor*/ ctx[1] < 1 ? "slow" : "");
        			}

        			if (dirty[0] & /*$$props, editing*/ 65540) {
        				toggle_class(input, "editing", /*editing*/ ctx[2]);
        			}
        		},
        		i: noop,
        		o: noop,
        		d(detaching) {
        			if (detaching) detach(input);
        			/*input_binding*/ ctx[35](null);
        			mounted = false;
        			run_all(dispose);
        		}
        	};
        }

        function mouseenterHandler(e) {
        	
        } // seems not to be very practical to have focus on rollover:
        // inputElement?.focus();

        function mouseleaveHandler(e) {
        	
        }

        function instance($$self, $$props, $$invalidate) {
        	let { value = 0 } = $$props;
        	let { min = -Number.MAX_VALUE } = $$props;
        	let { max = Number.MAX_VALUE } = $$props;
        	let { step = 1 } = $$props;
        	let { decimals = 0 } = $$props;
        	let { width = 60 } = $$props;
        	let { height = 25 } = $$props;
        	let { horizontal = true } = $$props;
        	let { vertical = true } = $$props;

        	let { mainStyle } = $$props,
        		{ fastStyle } = $$props,
        		{ slowStyle } = $$props,
        		{ focusStyle } = $$props,
        		{ editingStyle } = $$props;

        	const dispatch = createEventDispatcher();
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
        	let style;
        	visibleValue = setValue(value);
        	preciseValue = setValue(value);

        	function mousedownHandler(e) {
        		// console.log('down');
        		if (editing) {
        			e.stopPropagation();
        		} else {
        			clickX = e.clientX;
        			clickY = e.clientY;
        			$$invalidate(3, dragging = true);
        			preciseValue = setValue(value);
        		} //console.log(e.clientX, e.clientY);
        	}

        	function mousemoveHandler(e) {
        		let actX = e.clientX;
        		let actY = e.clientY;
        		let distX = horizontal ? actX - clickX : 0;
        		let distY = vertical ? -(actY - clickY) : 0;
        		let stepNum = Math.abs(distX) > Math.abs(distY) ? distX : distY;
        		stepValue(stepNum);
        		clickX = actX;
        		clickY = actY;
        	}

        	function mouseupHandler(e) {
        		// console.log('up');
        		$$invalidate(3, dragging = false);

        		$$invalidate(1, stepFactor = 1);
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
        		$$invalidate(31, focussed = true);

        		stopEditing();
        	}

        	function blurHandler(e) {
        		// console.log('blur');
        		$$invalidate(31, focussed = false);

        		stopEditing();
        	}

        	function inputHandler(e) {
        		// console.log(e);
        		let checkValue = parseFloat(inputElement.value);

        		if (!isNaN(checkValue)) {
        			preciseValue = checkValue;
        			preciseValue = Math.min(preciseValue, max);
        			preciseValue = Math.max(preciseValue, min);
        			dispatch("input", preciseValue.toFixed(decimals));
        		}
        	}

        	function keydownHandler(e) {
        		// console.log(e);
        		if (e.key == "Shift") {
        			$$invalidate(33, shiftPressed = true);
        		}

        		if (e.key == "Alt") {
        			$$invalidate(32, altPressed = true);
        		}
        	}

        	function keyupHandler(e) {
        		// console.log(e)
        		if (e.key == "Shift") {
        			$$invalidate(33, shiftPressed = false);
        		}

        		if (e.key == "Alt") {
        			$$invalidate(32, altPressed = false);
        		}

        		if (focussed) {
        			if (!editing) {
        				if (vertical && e.key == "ArrowUp" || horizontal && e.key == "ArrowRight") {
        					stepValue(10);
        				}

        				if (vertical && e.key == "ArrowDown" || horizontal && e.key == "ArrowLeft") {
        					stepValue(-10);
        				}
        			}

        			if (e.key == "Enter") {
        				if (!editing) {
        					startEditing();
        				} else {
        					stopEditing();
        				}
        			}

        			if (e.key == "Escape") {
        				if (editing) {
        					stopEditing();
        				}
        			}
        		}
        	}

        	function setValue(val) {
        		preciseValue = parseFloat(val);
        		preciseValue = Math.min(preciseValue, max);
        		preciseValue = Math.max(preciseValue, min);
        		$$invalidate(4, visibleValue = preciseValue.toFixed(decimals));
        		$$invalidate(17, value = preciseValue.toFixed(decimals));
        		dispatch("input", value);
        		dispatch("change", value);
        	}

        	function stepValue(numSteps) {
        		preciseValue = preciseValue ?? parseFloat(visibleValue);
        		preciseValue += numSteps * step * stepFactor;
        		preciseValue = Math.min(preciseValue, max);
        		preciseValue = Math.max(preciseValue, min);
        		$$invalidate(4, visibleValue = preciseValue.toFixed(decimals));
        		$$invalidate(17, value = preciseValue.toFixed(decimals));
        		dispatch("input", value);
        		dispatch("change", value);
        	}

        	function startEditing() {
        		preciseValue = parseFloat(visibleValue);
        		$$invalidate(2, editing = true);
        		inputElement?.setSelectionRange(0, 30);
        	}

        	function stopEditing() {
        		$$invalidate(2, editing = false);
        		inputElement?.setSelectionRange(0, 0);
        		preciseValue = parseFloat(visibleValue);
        		setValue(preciseValue);
        	}

        	function input_input_handler() {
        		visibleValue = this.value;
        		$$invalidate(4, visibleValue);
        	}

        	function input_binding($$value) {
        		binding_callbacks[$$value ? "unshift" : "push"](() => {
        			inputElement = $$value;
        			($$invalidate(0, inputElement), $$invalidate(2, editing));
        		});
        	}

        	$$self.$$set = $$new_props => {
        		$$invalidate(16, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
        		if ("value" in $$new_props) $$invalidate(17, value = $$new_props.value);
        		if ("min" in $$new_props) $$invalidate(18, min = $$new_props.min);
        		if ("max" in $$new_props) $$invalidate(19, max = $$new_props.max);
        		if ("step" in $$new_props) $$invalidate(20, step = $$new_props.step);
        		if ("decimals" in $$new_props) $$invalidate(21, decimals = $$new_props.decimals);
        		if ("width" in $$new_props) $$invalidate(22, width = $$new_props.width);
        		if ("height" in $$new_props) $$invalidate(23, height = $$new_props.height);
        		if ("horizontal" in $$new_props) $$invalidate(24, horizontal = $$new_props.horizontal);
        		if ("vertical" in $$new_props) $$invalidate(25, vertical = $$new_props.vertical);
        		if ("mainStyle" in $$new_props) $$invalidate(26, mainStyle = $$new_props.mainStyle);
        		if ("fastStyle" in $$new_props) $$invalidate(27, fastStyle = $$new_props.fastStyle);
        		if ("slowStyle" in $$new_props) $$invalidate(28, slowStyle = $$new_props.slowStyle);
        		if ("focusStyle" in $$new_props) $$invalidate(29, focusStyle = $$new_props.focusStyle);
        		if ("editingStyle" in $$new_props) $$invalidate(30, editingStyle = $$new_props.editingStyle);
        	};

        	$$self.$$.update = () => {
        		if ($$self.$$.dirty[0] & /*inputElement, editing*/ 5) {
        			// updaters --------------------------------
        			 if (inputElement) {
        				$$invalidate(0, inputElement.readOnly = !editing, inputElement);
        			}
        		}

        		if ($$self.$$.dirty[0] & /*editing*/ 4 | $$self.$$.dirty[1] & /*focussed, altPressed, shiftPressed*/ 7) {
        			 {
        				$$invalidate(1, stepFactor = 1);

        				if (focussed && !editing) {
        					if (altPressed && shiftPressed) {
        						$$invalidate(1, stepFactor = 10);
        					} else if (altPressed) {
        						$$invalidate(1, stepFactor = 0.1);
        					}
        				}
        			}
        		}

        		if ($$self.$$.dirty[0] & /*mainStyle, style, focusStyle, editing, stepFactor, fastStyle, slowStyle, editingStyle*/ 2080374822 | $$self.$$.dirty[1] & /*focussed*/ 1) {
        			 {
        				$$invalidate(5, style = mainStyle ?? "");
        				$$invalidate(5, style += focussed && focusStyle ? ";" + focusStyle : "");

        				$$invalidate(5, style += !editing && stepFactor > 1 && fastStyle
        				? ";" + fastStyle
        				: "");

        				$$invalidate(5, style += !editing && stepFactor < 1 && slowStyle
        				? ";" + slowStyle
        				: "");

        				$$invalidate(5, style += editing && editingStyle ? ";" + editingStyle : "");
        			}
        		}
        	};

        	$$props = exclude_internal_props($$props);

        	return [
        		inputElement,
        		stepFactor,
        		editing,
        		dragging,
        		visibleValue,
        		style,
        		mousedownHandler,
        		mousemoveHandler,
        		mouseupHandler,
        		dblclickHandler,
        		windowdownHandler,
        		focusHandler,
        		blurHandler,
        		inputHandler,
        		keydownHandler,
        		keyupHandler,
        		$$props,
        		value,
        		min,
        		max,
        		step,
        		decimals,
        		width,
        		height,
        		horizontal,
        		vertical,
        		mainStyle,
        		fastStyle,
        		slowStyle,
        		focusStyle,
        		editingStyle,
        		focussed,
        		altPressed,
        		shiftPressed,
        		input_input_handler,
        		input_binding
        	];
        }

        class NumberSpinner extends SvelteComponent {
        	constructor(options) {
        		super();
        		if (!document.getElementById("svelte-8bd7vo-style")) add_css();

        		init(
        			this,
        			options,
        			instance,
        			create_fragment,
        			safe_not_equal,
        			{
        				value: 17,
        				min: 18,
        				max: 19,
        				step: 20,
        				decimals: 21,
        				width: 22,
        				height: 23,
        				horizontal: 24,
        				vertical: 25,
        				mainStyle: 26,
        				fastStyle: 27,
        				slowStyle: 28,
        				focusStyle: 29,
        				editingStyle: 30
        			},
        			[-1, -1]
        		);
        	}
        }

        return NumberSpinner;

    })));
    });

    /* example/src/App.svelte generated by Svelte v3.31.2 */

    function create_fragment(ctx) {
    	let h2;
    	let t1;
    	let p;
    	let t8;
    	let table;
    	let tr0;
    	let td0;
    	let t10;
    	let td1;
    	let numberspinner0;
    	let updating_value;
    	let t11;
    	let td2;
    	let t12;
    	let t13;
    	let t14;
    	let tr1;
    	let td3;
    	let t16;
    	let td4;
    	let numberspinner1;
    	let updating_value_1;
    	let t17;
    	let td5;
    	let t18;
    	let t19;
    	let t20;
    	let tr2;
    	let td6;
    	let t22;
    	let td7;
    	let numberspinner2;
    	let updating_value_2;
    	let t23;
    	let td8;
    	let t24;
    	let t25;
    	let t26;
    	let tr3;
    	let td9;
    	let t28;
    	let td10;
    	let numberspinner3;
    	let updating_value_3;
    	let t29;
    	let td11;
    	let t30;
    	let t31;
    	let t32;
    	let tr4;
    	let td12;
    	let t34;
    	let td13;
    	let numberspinner4;
    	let updating_value_4;
    	let t35;
    	let td14;
    	let t36;
    	let t37;
    	let t38;
    	let tr5;
    	let td15;
    	let t40;
    	let td16;
    	let numberspinner5;
    	let t41;
    	let td17;
    	let t42;
    	let t43;
    	let br1;
    	let t44;
    	let t45;
    	let current;

    	function numberspinner0_value_binding(value) {
    		/*numberspinner0_value_binding*/ ctx[7].call(null, value);
    	}

    	let numberspinner0_props = {};

    	if (/*value1*/ ctx[0] !== void 0) {
    		numberspinner0_props.value = /*value1*/ ctx[0];
    	}

    	numberspinner0 = new dist({ props: numberspinner0_props });
    	binding_callbacks.push(() => bind(numberspinner0, "value", numberspinner0_value_binding));

    	function numberspinner1_value_binding(value) {
    		/*numberspinner1_value_binding*/ ctx[8].call(null, value);
    	}

    	let numberspinner1_props = { min: "0", max: "1000", vertical: false };

    	if (/*value2*/ ctx[1] !== void 0) {
    		numberspinner1_props.value = /*value2*/ ctx[1];
    	}

    	numberspinner1 = new dist({ props: numberspinner1_props });
    	binding_callbacks.push(() => bind(numberspinner1, "value", numberspinner1_value_binding));

    	function numberspinner2_value_binding(value) {
    		/*numberspinner2_value_binding*/ ctx[9].call(null, value);
    	}

    	let numberspinner2_props = {
    		min: "-5",
    		max: "5",
    		step: "0.01",
    		decimals: "2"
    	};

    	if (/*value3*/ ctx[2] !== void 0) {
    		numberspinner2_props.value = /*value3*/ ctx[2];
    	}

    	numberspinner2 = new dist({ props: numberspinner2_props });
    	binding_callbacks.push(() => bind(numberspinner2, "value", numberspinner2_value_binding));

    	function numberspinner3_value_binding(value) {
    		/*numberspinner3_value_binding*/ ctx[10].call(null, value);
    	}

    	let numberspinner3_props = {
    		step: "10",
    		mainStyle: "color:#aaa; width:80px; border-radius:20px",
    		focusStyle: "color:#06f",
    		editingStyle: "color:#00f; background-color:#06f4",
    		fastStyle: "color:#f00",
    		slowStyle: "color:#0c0"
    	};

    	if (/*value4*/ ctx[3] !== void 0) {
    		numberspinner3_props.value = /*value4*/ ctx[3];
    	}

    	numberspinner3 = new dist({ props: numberspinner3_props });
    	binding_callbacks.push(() => bind(numberspinner3, "value", numberspinner3_value_binding));

    	function numberspinner4_value_binding(value) {
    		/*numberspinner4_value_binding*/ ctx[11].call(null, value);
    	}

    	let numberspinner4_props = {
    		min: "0",
    		max: "1",
    		step: "0.001",
    		decimals: "3",
    		class: "number-spinner-custom"
    	};

    	if (/*value5*/ ctx[4] !== void 0) {
    		numberspinner4_props.value = /*value5*/ ctx[4];
    	}

    	numberspinner4 = new dist({ props: numberspinner4_props });
    	binding_callbacks.push(() => bind(numberspinner4, "value", numberspinner4_value_binding));

    	numberspinner5 = new dist({
    			props: { value: value6, min: "0", max: "100" }
    		});

    	numberspinner5.$on("change", /*change_handler*/ ctx[12]);
    	numberspinner5.$on("input", /*input_handler*/ ctx[13]);

    	return {
    		c() {
    			h2 = element("h2");
    			h2.textContent = "Svelte Number Spinner Example";
    			t1 = space();
    			p = element("p");

    			p.innerHTML = `Change the values of the number spinners through mousedrag and arrow keys.<br/>
  Press <i>Alt</i> for smaller steps, <i>Alt+Shift</i> for larger steps. Double click to edit.`;

    			t8 = space();
    			table = element("table");
    			tr0 = element("tr");
    			td0 = element("td");
    			td0.textContent = "Standard with no range limits and a step of 1";
    			t10 = space();
    			td1 = element("td");
    			create_component(numberspinner0.$$.fragment);
    			t11 = space();
    			td2 = element("td");
    			t12 = text("Current value is ");
    			t13 = text(/*value1*/ ctx[0]);
    			t14 = space();
    			tr1 = element("tr");
    			td3 = element("td");
    			td3.textContent = "Range from 0 to 1000 and only horizontal dragging and arrow keys left/right will change the value";
    			t16 = space();
    			td4 = element("td");
    			create_component(numberspinner1.$$.fragment);
    			t17 = space();
    			td5 = element("td");
    			t18 = text("Current value is ");
    			t19 = text(/*value2*/ ctx[1]);
    			t20 = space();
    			tr2 = element("tr");
    			td6 = element("td");
    			td6.textContent = "Steps 0.01 and shows the values with a precision of 2 decimals";
    			t22 = space();
    			td7 = element("td");
    			create_component(numberspinner2.$$.fragment);
    			t23 = space();
    			td8 = element("td");
    			t24 = text("Current value is ");
    			t25 = text(/*value3*/ ctx[2]);
    			t26 = space();
    			tr3 = element("tr");
    			td9 = element("td");
    			td9.textContent = "Individual styling using props";
    			t28 = space();
    			td10 = element("td");
    			create_component(numberspinner3.$$.fragment);
    			t29 = space();
    			td11 = element("td");
    			t30 = text("Current value is ");
    			t31 = text(/*value4*/ ctx[3]);
    			t32 = space();
    			tr4 = element("tr");
    			td12 = element("td");
    			td12.textContent = "Individual styling using custom class";
    			t34 = space();
    			td13 = element("td");
    			create_component(numberspinner4.$$.fragment);
    			t35 = space();
    			td14 = element("td");
    			t36 = text("Current value is ");
    			t37 = text(/*value5*/ ctx[4]);
    			t38 = space();
    			tr5 = element("tr");
    			td15 = element("td");
    			td15.textContent = "Retreiving the value using the input and change events";
    			t40 = space();
    			td16 = element("td");
    			create_component(numberspinner5.$$.fragment);
    			t41 = space();
    			td17 = element("td");
    			t42 = text("Current input value is ");
    			t43 = text(/*value6input*/ ctx[5]);
    			br1 = element("br");
    			t44 = text(" \n    Current change value is ");
    			t45 = text(/*value6change*/ ctx[6]);
    			attr(td0, "class", "svelte-1cb7yrb");
    			attr(td1, "class", "svelte-1cb7yrb");
    			attr(td2, "class", "svelte-1cb7yrb");
    			attr(tr0, "class", "svelte-1cb7yrb");
    			attr(td3, "class", "svelte-1cb7yrb");
    			attr(td4, "class", "svelte-1cb7yrb");
    			attr(td5, "class", "svelte-1cb7yrb");
    			attr(tr1, "class", "svelte-1cb7yrb");
    			attr(td6, "class", "svelte-1cb7yrb");
    			attr(td7, "class", "svelte-1cb7yrb");
    			attr(td8, "class", "svelte-1cb7yrb");
    			attr(tr2, "class", "svelte-1cb7yrb");
    			attr(td9, "class", "svelte-1cb7yrb");
    			attr(td10, "class", "svelte-1cb7yrb");
    			attr(td11, "class", "svelte-1cb7yrb");
    			attr(tr3, "class", "svelte-1cb7yrb");
    			attr(td12, "class", "svelte-1cb7yrb");
    			attr(td13, "class", "svelte-1cb7yrb");
    			attr(td14, "class", "svelte-1cb7yrb");
    			attr(tr4, "class", "svelte-1cb7yrb");
    			attr(td15, "class", "svelte-1cb7yrb");
    			attr(td16, "class", "svelte-1cb7yrb");
    			attr(td17, "class", "svelte-1cb7yrb");
    			attr(tr5, "class", "svelte-1cb7yrb");
    			attr(table, "class", "svelte-1cb7yrb");
    		},
    		m(target, anchor) {
    			insert(target, h2, anchor);
    			insert(target, t1, anchor);
    			insert(target, p, anchor);
    			insert(target, t8, anchor);
    			insert(target, table, anchor);
    			append(table, tr0);
    			append(tr0, td0);
    			append(tr0, t10);
    			append(tr0, td1);
    			mount_component(numberspinner0, td1, null);
    			append(tr0, t11);
    			append(tr0, td2);
    			append(td2, t12);
    			append(td2, t13);
    			append(table, t14);
    			append(table, tr1);
    			append(tr1, td3);
    			append(tr1, t16);
    			append(tr1, td4);
    			mount_component(numberspinner1, td4, null);
    			append(tr1, t17);
    			append(tr1, td5);
    			append(td5, t18);
    			append(td5, t19);
    			append(table, t20);
    			append(table, tr2);
    			append(tr2, td6);
    			append(tr2, t22);
    			append(tr2, td7);
    			mount_component(numberspinner2, td7, null);
    			append(tr2, t23);
    			append(tr2, td8);
    			append(td8, t24);
    			append(td8, t25);
    			append(table, t26);
    			append(table, tr3);
    			append(tr3, td9);
    			append(tr3, t28);
    			append(tr3, td10);
    			mount_component(numberspinner3, td10, null);
    			append(tr3, t29);
    			append(tr3, td11);
    			append(td11, t30);
    			append(td11, t31);
    			append(table, t32);
    			append(table, tr4);
    			append(tr4, td12);
    			append(tr4, t34);
    			append(tr4, td13);
    			mount_component(numberspinner4, td13, null);
    			append(tr4, t35);
    			append(tr4, td14);
    			append(td14, t36);
    			append(td14, t37);
    			append(table, t38);
    			append(table, tr5);
    			append(tr5, td15);
    			append(tr5, t40);
    			append(tr5, td16);
    			mount_component(numberspinner5, td16, null);
    			append(tr5, t41);
    			append(tr5, td17);
    			append(td17, t42);
    			append(td17, t43);
    			append(td17, br1);
    			append(td17, t44);
    			append(td17, t45);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const numberspinner0_changes = {};

    			if (!updating_value && dirty & /*value1*/ 1) {
    				updating_value = true;
    				numberspinner0_changes.value = /*value1*/ ctx[0];
    				add_flush_callback(() => updating_value = false);
    			}

    			numberspinner0.$set(numberspinner0_changes);
    			if (!current || dirty & /*value1*/ 1) set_data(t13, /*value1*/ ctx[0]);
    			const numberspinner1_changes = {};

    			if (!updating_value_1 && dirty & /*value2*/ 2) {
    				updating_value_1 = true;
    				numberspinner1_changes.value = /*value2*/ ctx[1];
    				add_flush_callback(() => updating_value_1 = false);
    			}

    			numberspinner1.$set(numberspinner1_changes);
    			if (!current || dirty & /*value2*/ 2) set_data(t19, /*value2*/ ctx[1]);
    			const numberspinner2_changes = {};

    			if (!updating_value_2 && dirty & /*value3*/ 4) {
    				updating_value_2 = true;
    				numberspinner2_changes.value = /*value3*/ ctx[2];
    				add_flush_callback(() => updating_value_2 = false);
    			}

    			numberspinner2.$set(numberspinner2_changes);
    			if (!current || dirty & /*value3*/ 4) set_data(t25, /*value3*/ ctx[2]);
    			const numberspinner3_changes = {};

    			if (!updating_value_3 && dirty & /*value4*/ 8) {
    				updating_value_3 = true;
    				numberspinner3_changes.value = /*value4*/ ctx[3];
    				add_flush_callback(() => updating_value_3 = false);
    			}

    			numberspinner3.$set(numberspinner3_changes);
    			if (!current || dirty & /*value4*/ 8) set_data(t31, /*value4*/ ctx[3]);
    			const numberspinner4_changes = {};

    			if (!updating_value_4 && dirty & /*value5*/ 16) {
    				updating_value_4 = true;
    				numberspinner4_changes.value = /*value5*/ ctx[4];
    				add_flush_callback(() => updating_value_4 = false);
    			}

    			numberspinner4.$set(numberspinner4_changes);
    			if (!current || dirty & /*value5*/ 16) set_data(t37, /*value5*/ ctx[4]);
    			if (!current || dirty & /*value6input*/ 32) set_data(t43, /*value6input*/ ctx[5]);
    			if (!current || dirty & /*value6change*/ 64) set_data(t45, /*value6change*/ ctx[6]);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(numberspinner0.$$.fragment, local);
    			transition_in(numberspinner1.$$.fragment, local);
    			transition_in(numberspinner2.$$.fragment, local);
    			transition_in(numberspinner3.$$.fragment, local);
    			transition_in(numberspinner4.$$.fragment, local);
    			transition_in(numberspinner5.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(numberspinner0.$$.fragment, local);
    			transition_out(numberspinner1.$$.fragment, local);
    			transition_out(numberspinner2.$$.fragment, local);
    			transition_out(numberspinner3.$$.fragment, local);
    			transition_out(numberspinner4.$$.fragment, local);
    			transition_out(numberspinner5.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(h2);
    			if (detaching) detach(t1);
    			if (detaching) detach(p);
    			if (detaching) detach(t8);
    			if (detaching) detach(table);
    			destroy_component(numberspinner0);
    			destroy_component(numberspinner1);
    			destroy_component(numberspinner2);
    			destroy_component(numberspinner3);
    			destroy_component(numberspinner4);
    			destroy_component(numberspinner5);
    		}
    	};
    }

    let value6 = 50;

    function instance($$self, $$props, $$invalidate) {
    	let value1 = 100;
    	let value2 = 500;
    	let value3 = 3.28;
    	let value4 = 0.5;
    	let value5 = 0.5;
    	let value6input = value6;
    	let value6change = value6;

    	function numberspinner0_value_binding(value) {
    		value1 = value;
    		$$invalidate(0, value1);
    	}

    	function numberspinner1_value_binding(value) {
    		value2 = value;
    		$$invalidate(1, value2);
    	}

    	function numberspinner2_value_binding(value) {
    		value3 = value;
    		$$invalidate(2, value3);
    	}

    	function numberspinner3_value_binding(value) {
    		value4 = value;
    		$$invalidate(3, value4);
    	}

    	function numberspinner4_value_binding(value) {
    		value5 = value;
    		$$invalidate(4, value5);
    	}

    	const change_handler = ev => {
    		$$invalidate(6, value6change = ev.detail);
    	};

    	const input_handler = ev => {
    		$$invalidate(5, value6input = ev.detail);
    	};

    	return [
    		value1,
    		value2,
    		value3,
    		value4,
    		value5,
    		value6input,
    		value6change,
    		numberspinner0_value_binding,
    		numberspinner1_value_binding,
    		numberspinner2_value_binding,
    		numberspinner3_value_binding,
    		numberspinner4_value_binding,
    		change_handler,
    		input_handler
    	];
    }

    class App extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance, create_fragment, safe_not_equal, {});
    	}
    }

    var app = new App({
    	target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
