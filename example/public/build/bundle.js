
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
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
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
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
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function stop_propagation(fn) {
        return function (event) {
            event.stopPropagation();
            // @ts-ignore
            return fn.call(this, event);
        };
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
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
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
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            callbacks.slice().forEach(fn => fn(event));
        }
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
    function tick() {
        schedule_update();
        return resolved_promise;
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
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
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
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
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
        }
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
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
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
            mount_component(component, options.target, options.anchor, options.customElement);
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

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.38.2' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/NumberSpinner.svelte generated by Svelte v3.38.2 */
    const file$1 = "src/NumberSpinner.svelte";

    function create_fragment$1(ctx) {
    	let input0;
    	let input0_class_value;
    	let t;
    	let input1;
    	let input1_class_value;
    	let input1_inputmode_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			input0 = element("input");
    			t = space();
    			input1 = element("input");
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "style", /*style*/ ctx[10]);
    			attr_dev(input0, "class", input0_class_value = "" + (null_to_empty(/*$$props*/ ctx[24].class) + " svelte-xg45mw"));
    			input0.readOnly = true;
    			attr_dev(input0, "contenteditable", false);
    			attr_dev(input0, "tabindex", "0");
    			toggle_class(input0, "default", !/*$$props*/ ctx[24].class ? true : false);
    			toggle_class(input0, "drag", true);
    			toggle_class(input0, "dragging", /*dragging*/ ctx[4]);
    			toggle_class(input0, "fast", /*stepFactor*/ ctx[5] > 1 ? "fast" : "");
    			toggle_class(input0, "slow", /*stepFactor*/ ctx[5] < 1 ? "slow" : "");
    			toggle_class(input0, "focus", /*dragFocussed*/ ctx[2]);
    			toggle_class(input0, "inactive", /*editing*/ ctx[6]);
    			add_location(input0, file$1, 404, 0, 10651);
    			attr_dev(input1, "style", /*style*/ ctx[10]);
    			attr_dev(input1, "class", input1_class_value = "" + (null_to_empty(/*$$props*/ ctx[24].class) + " svelte-xg45mw"));
    			attr_dev(input1, "type", "text");

    			attr_dev(input1, "inputmode", input1_inputmode_value = isInteger(/*step*/ ctx[1]) && isInteger(/*min*/ ctx[0]) && /*min*/ ctx[0] >= 0
    			? "numeric"
    			: "text");

    			toggle_class(input1, "default", !/*$$props*/ ctx[24].class ? true : false);
    			toggle_class(input1, "edit", true);
    			toggle_class(input1, "editing", /*editing*/ ctx[6]);
    			toggle_class(input1, "focus", /*editFocussed*/ ctx[3]);
    			toggle_class(input1, "inactive", !/*editing*/ ctx[6]);
    			add_location(input1, file$1, 429, 0, 11312);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input0, anchor);
    			/*input0_binding*/ ctx[57](input0);
    			set_input_value(input0, /*visibleValue*/ ctx[7]);
    			insert_dev(target, t, anchor);
    			insert_dev(target, input1, anchor);
    			/*input1_binding*/ ctx[59](input1);
    			set_input_value(input1, /*visibleValue*/ ctx[7]);

    			if (!mounted) {
    				dispose = [
    					listen_dev(
    						window,
    						"mousemove",
    						function () {
    							if (is_function(/*dragging*/ ctx[4] ? /*dragmoveHandler*/ ctx[14] : "")) (/*dragging*/ ctx[4] ? /*dragmoveHandler*/ ctx[14] : "").apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					),
    					listen_dev(
    						window,
    						"touchmove",
    						function () {
    							if (is_function(/*dragging*/ ctx[4] ? /*touchmoveHandler*/ ctx[13] : "")) (/*dragging*/ ctx[4] ? /*touchmoveHandler*/ ctx[13] : "").apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					),
    					listen_dev(
    						window,
    						"mouseup",
    						stop_propagation(function () {
    							if (is_function(/*dragging*/ ctx[4]
    							? /*mouseupHandler*/ ctx[16]
    							: /*editBlurHandler*/ ctx[20])) (/*dragging*/ ctx[4]
    							? /*mouseupHandler*/ ctx[16]
    							: /*editBlurHandler*/ ctx[20]).apply(this, arguments);
    						}),
    						false,
    						false,
    						true
    					),
    					listen_dev(
    						window,
    						"touchend",
    						stop_propagation(function () {
    							if (is_function(/*dragging*/ ctx[4]
    							? /*touchendHandler*/ ctx[15]
    							: /*editBlurHandler*/ ctx[20])) (/*dragging*/ ctx[4]
    							? /*touchendHandler*/ ctx[15]
    							: /*editBlurHandler*/ ctx[20]).apply(this, arguments);
    						}),
    						false,
    						false,
    						true
    					),
    					listen_dev(window, "keydown", /*keydownHandler*/ ctx[21], false, false, false),
    					listen_dev(window, "keyup", /*keyupHandler*/ ctx[22], false, false, false),
    					listen_dev(input0, "mousedown", stop_propagation(/*dragstartHandler*/ ctx[12]), false, false, true),
    					listen_dev(input0, "touchstart", stop_propagation(prevent_default(/*touchstartHandler*/ ctx[11])), false, true, true),
    					listen_dev(input0, "dblclick", stop_propagation(dblclickHandler), false, false, true),
    					listen_dev(input0, "focus", /*dragFocusHandler*/ ctx[17], false, false, false),
    					listen_dev(input0, "blur", /*dragBlurHandler*/ ctx[18], false, false, false),
    					listen_dev(input0, "keydown", /*keydown_handler*/ ctx[54], false, false, false),
    					listen_dev(input0, "keypress", /*keypress_handler*/ ctx[55], false, false, false),
    					listen_dev(input0, "keyup", /*keyup_handler*/ ctx[56], false, false, false),
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[58]),
    					listen_dev(input1, "mouseup", stop_propagation(mouseup_handler), false, false, true),
    					listen_dev(input1, "touchend", stop_propagation(touchend_handler), false, false, true),
    					listen_dev(input1, "focus", /*editFocusHandler*/ ctx[19], false, false, false),
    					listen_dev(input1, "blur", /*editBlurHandler*/ ctx[20], false, false, false),
    					listen_dev(input1, "input", /*inputHandler*/ ctx[23], false, false, false),
    					listen_dev(input1, "keydown", /*keydown_handler_1*/ ctx[51], false, false, false),
    					listen_dev(input1, "keypress", /*keypress_handler_1*/ ctx[52], false, false, false),
    					listen_dev(input1, "keyup", /*keyup_handler_1*/ ctx[53], false, false, false),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[60])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty[0] & /*style*/ 1024) {
    				attr_dev(input0, "style", /*style*/ ctx[10]);
    			}

    			if (dirty[0] & /*$$props*/ 16777216 && input0_class_value !== (input0_class_value = "" + (null_to_empty(/*$$props*/ ctx[24].class) + " svelte-xg45mw"))) {
    				attr_dev(input0, "class", input0_class_value);
    			}

    			if (dirty[0] & /*visibleValue*/ 128 && input0.value !== /*visibleValue*/ ctx[7]) {
    				set_input_value(input0, /*visibleValue*/ ctx[7]);
    			}

    			if (dirty[0] & /*$$props, $$props*/ 16777216) {
    				toggle_class(input0, "default", !/*$$props*/ ctx[24].class ? true : false);
    			}

    			if (dirty[0] & /*$$props*/ 16777216) {
    				toggle_class(input0, "drag", true);
    			}

    			if (dirty[0] & /*$$props, dragging*/ 16777232) {
    				toggle_class(input0, "dragging", /*dragging*/ ctx[4]);
    			}

    			if (dirty[0] & /*$$props, stepFactor*/ 16777248) {
    				toggle_class(input0, "fast", /*stepFactor*/ ctx[5] > 1 ? "fast" : "");
    			}

    			if (dirty[0] & /*$$props, stepFactor*/ 16777248) {
    				toggle_class(input0, "slow", /*stepFactor*/ ctx[5] < 1 ? "slow" : "");
    			}

    			if (dirty[0] & /*$$props, dragFocussed*/ 16777220) {
    				toggle_class(input0, "focus", /*dragFocussed*/ ctx[2]);
    			}

    			if (dirty[0] & /*$$props, editing*/ 16777280) {
    				toggle_class(input0, "inactive", /*editing*/ ctx[6]);
    			}

    			if (dirty[0] & /*style*/ 1024) {
    				attr_dev(input1, "style", /*style*/ ctx[10]);
    			}

    			if (dirty[0] & /*$$props*/ 16777216 && input1_class_value !== (input1_class_value = "" + (null_to_empty(/*$$props*/ ctx[24].class) + " svelte-xg45mw"))) {
    				attr_dev(input1, "class", input1_class_value);
    			}

    			if (dirty[0] & /*step, min*/ 3 && input1_inputmode_value !== (input1_inputmode_value = isInteger(/*step*/ ctx[1]) && isInteger(/*min*/ ctx[0]) && /*min*/ ctx[0] >= 0
    			? "numeric"
    			: "text")) {
    				attr_dev(input1, "inputmode", input1_inputmode_value);
    			}

    			if (dirty[0] & /*visibleValue*/ 128 && input1.value !== /*visibleValue*/ ctx[7]) {
    				set_input_value(input1, /*visibleValue*/ ctx[7]);
    			}

    			if (dirty[0] & /*$$props, $$props*/ 16777216) {
    				toggle_class(input1, "default", !/*$$props*/ ctx[24].class ? true : false);
    			}

    			if (dirty[0] & /*$$props*/ 16777216) {
    				toggle_class(input1, "edit", true);
    			}

    			if (dirty[0] & /*$$props, editing*/ 16777280) {
    				toggle_class(input1, "editing", /*editing*/ ctx[6]);
    			}

    			if (dirty[0] & /*$$props, editFocussed*/ 16777224) {
    				toggle_class(input1, "focus", /*editFocussed*/ ctx[3]);
    			}

    			if (dirty[0] & /*$$props, editing*/ 16777280) {
    				toggle_class(input1, "inactive", !/*editing*/ ctx[6]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input0);
    			/*input0_binding*/ ctx[57](null);
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(input1);
    			/*input1_binding*/ ctx[59](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function dblclickHandler(ev) {
    	
    } // dispatch("consoleLog", ev.type);
    // startEditing();

    // Helpers ----------------------------------------------------------
    function isInteger(num) {
    	return num == Math.round(num);
    }

    const mouseup_handler = ev => {
    	
    };

    const touchend_handler = ev => {
    	
    };

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("NumberSpinner", slots, []);
    	const dispatch = createEventDispatcher();
    	let { options = {} } = $$props;
    	let { value = options.value ?? 0 } = $$props;
    	value = parseFloat(value);
    	let { min = options.min ?? -1000000000000 } = $$props;
    	min = parseFloat(min);
    	let { max = options.max ?? 1000000000000 } = $$props;
    	max = parseFloat(max);
    	let { step = options.step ?? 1 } = $$props;
    	step = parseFloat(step);
    	let { precision = options.precision ?? step } = $$props;
    	precision = parseFloat(precision);
    	let { speed = options.speed ?? 1 } = $$props;
    	speed = parseFloat(speed);
    	let { keyStep = options.keyStep ?? step * 10 } = $$props;
    	keyStep = parseFloat(keyStep);
    	let { keyStepSlow = options.keyStepSlow ?? step } = $$props;
    	keyStepSlow = parseFloat(keyStepSlow);
    	let { keyStepFast = options.keyStepFast ?? step * 100 } = $$props;
    	keyStepFast = parseFloat(keyStepFast);
    	let { decimals = options.decimals ?? 0 } = $$props;
    	decimals = parseFloat(decimals);
    	let { format = options.format ?? undefined } = $$props;
    	let { parse = options.parse ?? undefined } = $$props;
    	let { horizontal = options.horizontal ?? true } = $$props;
    	let { vertical = options.vertical ?? false } = $$props;
    	let { circular = options.circular ?? false } = $$props;
    	let { mainStyle = options.mainStyle ?? undefined } = $$props;
    	let { fastStyle = options.fastStyle ?? undefined } = $$props;
    	let { slowStyle = options.slowStyle ?? undefined } = $$props;
    	let { focusStyle = options.focusStyle ?? undefined } = $$props;
    	let { draggingStyle = options.draggingStyle ?? undefined } = $$props;
    	let { editingStyle = options.editingStyle ?? undefined } = $$props;
    	let { cursor = options.cursor ?? undefined } = $$props;
    	let preciseValue;
    	let visibleValue;
    	let isTouchDevice = false;
    	let dragElement, editElement;
    	let dragFocussed = false;
    	let editFocussed = false;
    	let dragging = false;
    	let wasActiveOnClick, hasMoved, clickX, clickY;
    	let stepFactor = 1;
    	let altPressed = false;
    	let shiftPressed = false;
    	let editing = false;
    	let style;
    	let htmlNode = null;
    	let htmlNodeOriginalCursor = null;
    	let defaultCursor;

    	onMount(() => {
    		$$invalidate(48, htmlNode = document.querySelector("html"));
    		$$invalidate(49, htmlNodeOriginalCursor = htmlNode.style.cursor);
    	});

    	// update all values (preciseValue, visibleValue)
    	updateValues(value);

    	function touchstartHandler(ev) {
    		dispatch("consoleLog", ev.type);
    		isTouchDevice = true;
    		dragstartHandler(ev);
    	}

    	function dragstartHandler(ev) {
    		dispatch("consoleLog", ev.type);
    		wasActiveOnClick = document.activeElement === dragElement;
    		$$invalidate(4, dragging = true);
    		dragElement.focus();
    		hasMoved = false;
    		clickX = isTouchDevice ? ev.touches[0].clientX : ev.clientX;
    		clickY = isTouchDevice ? ev.touches[0].clientY : ev.clientY;
    		$$invalidate(4, dragging = true);
    		updateValues(value);
    	}

    	function touchmoveHandler(ev) {
    		// dispatch('consoleLog', ev.type);
    		isTouchDevice = true;

    		dragmoveHandler(ev);
    	}

    	function dragmoveHandler(ev) {
    		// dispatch('consoleLog', ev.type);
    		// ev.preventDefault();
    		let actX = isTouchDevice ? ev.touches[0].clientX : ev.clientX;

    		let actY = isTouchDevice ? ev.touches[0].clientY : ev.clientY;
    		let distX = horizontal ? actX - clickX : 0;
    		let distY = vertical ? -(actY - clickY) : 0;
    		let stepNum = Math.abs(distX) > Math.abs(distY) ? distX : distY;

    		// fire dragstart before value changes
    		if (stepNum != 0 && !hasMoved) {
    			hasMoved = true;
    			dispatch("dragstart");
    		}

    		stepValue(stepNum * stepFactor);
    		clickX = actX;
    		clickY = actY;
    	} // hasMoved++;

    	function touchendHandler(ev) {
    		dispatch("consoleLog", ev.type);
    		mouseupHandler(ev);
    	}

    	function mouseupHandler(ev) {
    		dispatch("consoleLog", ev.type);

    		if (dragging && hasMoved) {
    			dispatch("dragend");
    		}

    		$$invalidate(4, dragging = false);

    		// start editing only if element was already focussed on mousedown and no dragging was done
    		if (wasActiveOnClick && !hasMoved) {
    			startEditing();
    		}
    	}

    	function dragFocusHandler(ev) {
    		dispatch("consoleLog", ev.type);
    		$$invalidate(2, dragFocussed = true);
    	}

    	function dragBlurHandler(ev) {
    		dispatch("consoleLog", ev.type);
    		$$invalidate(2, dragFocussed = false);
    	}

    	function editFocusHandler(ev) {
    		dispatch("consoleLog", ev.type);
    		$$invalidate(3, editFocussed = true);
    	}

    	function editBlurHandler(ev) {
    		dispatch("consoleLog", ev.type);
    		stopEditing();
    	}

    	function keydownHandler(ev) {
    		if (ev.target == dragElement || ev.target == editElement) {
    			dispatch("consoleLog", ev.type);
    		} // console.log(ev);

    		if (ev.key == "Shift") {
    			$$invalidate(47, shiftPressed = true);
    		}

    		if (ev.key == "Alt") {
    			$$invalidate(46, altPressed = true);
    		}
    	}

    	function keyupHandler(ev) {
    		if (ev.target == dragElement || ev.target == editElement) {
    			dispatch("consoleLog", ev.type);
    		} // console.log(ev);

    		if (ev.key == "Shift") {
    			$$invalidate(47, shiftPressed = false);
    		}

    		if (ev.key == "Alt") {
    			$$invalidate(46, altPressed = false);
    		}

    		if (dragFocussed && !editing) {
    			let increment = keyStep;
    			if (stepFactor < 1) increment = keyStepSlow;
    			if (stepFactor > 1) increment = keyStepFast;

    			if (ev.key == "ArrowUp" || ev.key == "ArrowRight") {
    				addToValue(increment);
    			}

    			if (ev.key == "ArrowDown" || ev.key == "ArrowLeft") {
    				addToValue(-increment);
    			}

    			if (ev.key == "Enter") {
    				startEditing();
    			}
    		} else if (editFocussed && editing) {
    			if (ev.key == "Enter" || ev.key == "Escape") {
    				stopEditing();
    			}
    		}
    	}

    	function inputHandler(ev) {
    		// dispatch("consoleLog", ev.type);
    		// console.log(e);
    		let checkValue = parseFloat(editElement.value);

    		if (!isNaN(checkValue)) {
    			preciseValue = checkValue;
    			preciseValue = keepInRange(preciseValue);

    			// console.log("dispatch input: ", preciseValue)
    			dispatch("input", parseFloat(roundToPrecision(preciseValue)));
    		}
    	}

    	async function startEditing() {
    		$$invalidate(6, editing = true);

    		//preciseValue = parseFloat(visibleValue);
    		await tick();

    		editElement.focus();
    		editElement.select();
    		dispatch("editstart");
    	}

    	function stopEditing() {
    		if (editing) {
    			$$invalidate(3, editFocussed = false);
    			$$invalidate(6, editing = false);

    			if (parse) {
    				preciseValue = parse(visibleValue);
    				updateValues(preciseValue);
    			} else {
    				let checkValue = parseFloat(editElement.value);

    				if (!isNaN(checkValue)) {
    					preciseValue = parseFloat(visibleValue);
    					updateValues(preciseValue);
    				}
    			}

    			// Bring focus back to the drag element if editElement was focussed:
    			if (document.activeElement === editElement) {
    				setTimeout(
    					() => {
    						dragElement.focus();
    					},
    					0
    				);
    			}

    			dispatch("editend");
    		}
    	}

    	function stepValue(numSteps) {
    		preciseValue = preciseValue ?? parseFloat(visibleValue);
    		preciseValue += numSteps * step * speed;
    		updateValues(preciseValue);
    	}

    	function addToValue(increment) {
    		preciseValue = preciseValue ?? parseFloat(visibleValue);
    		preciseValue += increment;
    		updateValues(preciseValue);
    	}

    	function updateValues(val) {
    		preciseValue = parseFloat(val);
    		preciseValue = keepInRange(preciseValue);
    		$$invalidate(7, visibleValue = Math.round((preciseValue - min) / step) * step + min);

    		if (format) {
    			$$invalidate(7, visibleValue = format(visibleValue));
    		} else {
    			$$invalidate(7, visibleValue = visibleValue.toFixed(decimals));
    		}

    		$$invalidate(25, value = roundToPrecision(preciseValue));
    		dispatch("input", parseFloat(value));
    		dispatch("change", parseFloat(value));
    	}

    	function keepInRange(val) {
    		$$invalidate(0, min = parseFloat(min));
    		$$invalidate(26, max = parseFloat(max));

    		if (circular) {
    			let range = max - min;
    			if (range === 0) return min;
    			let fac = val < min ? Math.ceil((min - val) / range) : 0;
    			val = (val - min + range * fac) % range + min;
    		} else {
    			val = Math.min(Math.max(val, min), max);
    		}

    		return val;
    	}

    	function roundToPrecision(val) {
    		let frac;
    		val = Math.round((parseFloat(val) - min) / precision) * precision + min;

    		// number of decimals comes either from the precision prop ...
    		let dec = precision < 1 ? Math.ceil(-Math.log10(precision)) : 0;

    		// ... or from the number of decimals of the step value
    		frac = step.toString().split(".")[1];

    		if (frac) dec = Math.max(dec, frac.length);

    		// ... or from the number of decimals of the min value
    		frac = min.toString().split(".")[1];

    		if (frac) dec = Math.max(dec, frac.length);
    		return parseFloat(val.toFixed(dec));
    	}

    	function keydown_handler_1(event) {
    		bubble($$self, event);
    	}

    	function keypress_handler_1(event) {
    		bubble($$self, event);
    	}

    	function keyup_handler_1(event) {
    		bubble($$self, event);
    	}

    	function keydown_handler(event) {
    		bubble($$self, event);
    	}

    	function keypress_handler(event) {
    		bubble($$self, event);
    	}

    	function keyup_handler(event) {
    		bubble($$self, event);
    	}

    	function input0_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			dragElement = $$value;
    			$$invalidate(8, dragElement);
    		});
    	}

    	function input0_input_handler() {
    		visibleValue = this.value;
    		$$invalidate(7, visibleValue);
    	}

    	function input1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			editElement = $$value;
    			$$invalidate(9, editElement);
    		});
    	}

    	function input1_input_handler() {
    		visibleValue = this.value;
    		$$invalidate(7, visibleValue);
    	}

    	$$self.$$set = $$new_props => {
    		$$invalidate(24, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    		if ("options" in $$new_props) $$invalidate(33, options = $$new_props.options);
    		if ("value" in $$new_props) $$invalidate(25, value = $$new_props.value);
    		if ("min" in $$new_props) $$invalidate(0, min = $$new_props.min);
    		if ("max" in $$new_props) $$invalidate(26, max = $$new_props.max);
    		if ("step" in $$new_props) $$invalidate(1, step = $$new_props.step);
    		if ("precision" in $$new_props) $$invalidate(27, precision = $$new_props.precision);
    		if ("speed" in $$new_props) $$invalidate(28, speed = $$new_props.speed);
    		if ("keyStep" in $$new_props) $$invalidate(29, keyStep = $$new_props.keyStep);
    		if ("keyStepSlow" in $$new_props) $$invalidate(30, keyStepSlow = $$new_props.keyStepSlow);
    		if ("keyStepFast" in $$new_props) $$invalidate(31, keyStepFast = $$new_props.keyStepFast);
    		if ("decimals" in $$new_props) $$invalidate(32, decimals = $$new_props.decimals);
    		if ("format" in $$new_props) $$invalidate(34, format = $$new_props.format);
    		if ("parse" in $$new_props) $$invalidate(35, parse = $$new_props.parse);
    		if ("horizontal" in $$new_props) $$invalidate(36, horizontal = $$new_props.horizontal);
    		if ("vertical" in $$new_props) $$invalidate(37, vertical = $$new_props.vertical);
    		if ("circular" in $$new_props) $$invalidate(38, circular = $$new_props.circular);
    		if ("mainStyle" in $$new_props) $$invalidate(39, mainStyle = $$new_props.mainStyle);
    		if ("fastStyle" in $$new_props) $$invalidate(40, fastStyle = $$new_props.fastStyle);
    		if ("slowStyle" in $$new_props) $$invalidate(41, slowStyle = $$new_props.slowStyle);
    		if ("focusStyle" in $$new_props) $$invalidate(42, focusStyle = $$new_props.focusStyle);
    		if ("draggingStyle" in $$new_props) $$invalidate(43, draggingStyle = $$new_props.draggingStyle);
    		if ("editingStyle" in $$new_props) $$invalidate(44, editingStyle = $$new_props.editingStyle);
    		if ("cursor" in $$new_props) $$invalidate(45, cursor = $$new_props.cursor);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		createEventDispatcher,
    		tick,
    		dispatch,
    		options,
    		value,
    		min,
    		max,
    		step,
    		precision,
    		speed,
    		keyStep,
    		keyStepSlow,
    		keyStepFast,
    		decimals,
    		format,
    		parse,
    		horizontal,
    		vertical,
    		circular,
    		mainStyle,
    		fastStyle,
    		slowStyle,
    		focusStyle,
    		draggingStyle,
    		editingStyle,
    		cursor,
    		preciseValue,
    		visibleValue,
    		isTouchDevice,
    		dragElement,
    		editElement,
    		dragFocussed,
    		editFocussed,
    		dragging,
    		wasActiveOnClick,
    		hasMoved,
    		clickX,
    		clickY,
    		stepFactor,
    		altPressed,
    		shiftPressed,
    		editing,
    		style,
    		htmlNode,
    		htmlNodeOriginalCursor,
    		defaultCursor,
    		touchstartHandler,
    		dragstartHandler,
    		touchmoveHandler,
    		dragmoveHandler,
    		dblclickHandler,
    		touchendHandler,
    		mouseupHandler,
    		dragFocusHandler,
    		dragBlurHandler,
    		editFocusHandler,
    		editBlurHandler,
    		keydownHandler,
    		keyupHandler,
    		inputHandler,
    		startEditing,
    		stopEditing,
    		stepValue,
    		addToValue,
    		updateValues,
    		keepInRange,
    		roundToPrecision,
    		isInteger
    	});

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(24, $$props = assign(assign({}, $$props), $$new_props));
    		if ("options" in $$props) $$invalidate(33, options = $$new_props.options);
    		if ("value" in $$props) $$invalidate(25, value = $$new_props.value);
    		if ("min" in $$props) $$invalidate(0, min = $$new_props.min);
    		if ("max" in $$props) $$invalidate(26, max = $$new_props.max);
    		if ("step" in $$props) $$invalidate(1, step = $$new_props.step);
    		if ("precision" in $$props) $$invalidate(27, precision = $$new_props.precision);
    		if ("speed" in $$props) $$invalidate(28, speed = $$new_props.speed);
    		if ("keyStep" in $$props) $$invalidate(29, keyStep = $$new_props.keyStep);
    		if ("keyStepSlow" in $$props) $$invalidate(30, keyStepSlow = $$new_props.keyStepSlow);
    		if ("keyStepFast" in $$props) $$invalidate(31, keyStepFast = $$new_props.keyStepFast);
    		if ("decimals" in $$props) $$invalidate(32, decimals = $$new_props.decimals);
    		if ("format" in $$props) $$invalidate(34, format = $$new_props.format);
    		if ("parse" in $$props) $$invalidate(35, parse = $$new_props.parse);
    		if ("horizontal" in $$props) $$invalidate(36, horizontal = $$new_props.horizontal);
    		if ("vertical" in $$props) $$invalidate(37, vertical = $$new_props.vertical);
    		if ("circular" in $$props) $$invalidate(38, circular = $$new_props.circular);
    		if ("mainStyle" in $$props) $$invalidate(39, mainStyle = $$new_props.mainStyle);
    		if ("fastStyle" in $$props) $$invalidate(40, fastStyle = $$new_props.fastStyle);
    		if ("slowStyle" in $$props) $$invalidate(41, slowStyle = $$new_props.slowStyle);
    		if ("focusStyle" in $$props) $$invalidate(42, focusStyle = $$new_props.focusStyle);
    		if ("draggingStyle" in $$props) $$invalidate(43, draggingStyle = $$new_props.draggingStyle);
    		if ("editingStyle" in $$props) $$invalidate(44, editingStyle = $$new_props.editingStyle);
    		if ("cursor" in $$props) $$invalidate(45, cursor = $$new_props.cursor);
    		if ("preciseValue" in $$props) preciseValue = $$new_props.preciseValue;
    		if ("visibleValue" in $$props) $$invalidate(7, visibleValue = $$new_props.visibleValue);
    		if ("isTouchDevice" in $$props) isTouchDevice = $$new_props.isTouchDevice;
    		if ("dragElement" in $$props) $$invalidate(8, dragElement = $$new_props.dragElement);
    		if ("editElement" in $$props) $$invalidate(9, editElement = $$new_props.editElement);
    		if ("dragFocussed" in $$props) $$invalidate(2, dragFocussed = $$new_props.dragFocussed);
    		if ("editFocussed" in $$props) $$invalidate(3, editFocussed = $$new_props.editFocussed);
    		if ("dragging" in $$props) $$invalidate(4, dragging = $$new_props.dragging);
    		if ("wasActiveOnClick" in $$props) wasActiveOnClick = $$new_props.wasActiveOnClick;
    		if ("hasMoved" in $$props) hasMoved = $$new_props.hasMoved;
    		if ("clickX" in $$props) clickX = $$new_props.clickX;
    		if ("clickY" in $$props) clickY = $$new_props.clickY;
    		if ("stepFactor" in $$props) $$invalidate(5, stepFactor = $$new_props.stepFactor);
    		if ("altPressed" in $$props) $$invalidate(46, altPressed = $$new_props.altPressed);
    		if ("shiftPressed" in $$props) $$invalidate(47, shiftPressed = $$new_props.shiftPressed);
    		if ("editing" in $$props) $$invalidate(6, editing = $$new_props.editing);
    		if ("style" in $$props) $$invalidate(10, style = $$new_props.style);
    		if ("htmlNode" in $$props) $$invalidate(48, htmlNode = $$new_props.htmlNode);
    		if ("htmlNodeOriginalCursor" in $$props) $$invalidate(49, htmlNodeOriginalCursor = $$new_props.htmlNodeOriginalCursor);
    		if ("defaultCursor" in $$props) $$invalidate(50, defaultCursor = $$new_props.defaultCursor);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*editing, dragging, value*/ 33554512) {
    			// updaters --------------------------------
    			{
    				if (!editing && !dragging) {
    					updateValues(value);
    				}
    			}
    		}

    		if ($$self.$$.dirty[0] & /*dragFocussed, editing*/ 68 | $$self.$$.dirty[1] & /*altPressed, shiftPressed*/ 98304) {
    			{
    				$$invalidate(5, stepFactor = 1);

    				if (dragFocussed && !editing) {
    					if (altPressed && shiftPressed) {
    						$$invalidate(5, stepFactor = 10);
    					} else if (altPressed) {
    						$$invalidate(5, stepFactor = 0.1);
    					}
    				}
    			}
    		}

    		if ($$self.$$.dirty[0] & /*dragging*/ 16 | $$self.$$.dirty[1] & /*horizontal, vertical, htmlNode, cursor, defaultCursor, htmlNodeOriginalCursor*/ 933984) {
    			{
    				// let cursorClass = horizontal
    				//   ? vertical
    				//     ? 'move-cursor'
    				//     : 'horizontal-cursor'
    				//   : 'vertical-cursor';
    				$$invalidate(50, defaultCursor = horizontal
    				? vertical ? "move" : "ew-resize"
    				: "ns-resize");

    				if (htmlNode) {
    					if (dragging) {
    						$$invalidate(48, htmlNode.style.cursor = cursor ?? defaultCursor, htmlNode);
    					} else {
    						$$invalidate(48, htmlNode.style.cursor = htmlNodeOriginalCursor, htmlNode); // addClass(htmlNode, cursorClass);
    					} // removeClass(htmlNode, cursorClass);
    				}
    			}
    		}

    		if ($$self.$$.dirty[0] & /*style, dragFocussed, editFocussed, editing, stepFactor, dragging*/ 1148 | $$self.$$.dirty[1] & /*mainStyle, focusStyle, fastStyle, slowStyle, draggingStyle, editingStyle, cursor, defaultCursor*/ 556800) {
    			{
    				$$invalidate(10, style = mainStyle ?? "");

    				$$invalidate(10, style += (dragFocussed || editFocussed) && focusStyle
    				? ";" + focusStyle
    				: "");

    				$$invalidate(10, style += !editing && stepFactor > 1 && fastStyle
    				? ";" + fastStyle
    				: "");

    				$$invalidate(10, style += !editing && stepFactor < 1 && slowStyle
    				? ";" + slowStyle
    				: "");

    				$$invalidate(10, style += dragging && draggingStyle ? ";" + draggingStyle : "");
    				$$invalidate(10, style += editing && editingStyle ? ";" + editingStyle : "");
    				$$invalidate(10, style += !editing ? ";cursor:" + (cursor ?? defaultCursor) : "");
    			}
    		}
    	};

    	$$props = exclude_internal_props($$props);

    	return [
    		min,
    		step,
    		dragFocussed,
    		editFocussed,
    		dragging,
    		stepFactor,
    		editing,
    		visibleValue,
    		dragElement,
    		editElement,
    		style,
    		touchstartHandler,
    		dragstartHandler,
    		touchmoveHandler,
    		dragmoveHandler,
    		touchendHandler,
    		mouseupHandler,
    		dragFocusHandler,
    		dragBlurHandler,
    		editFocusHandler,
    		editBlurHandler,
    		keydownHandler,
    		keyupHandler,
    		inputHandler,
    		$$props,
    		value,
    		max,
    		precision,
    		speed,
    		keyStep,
    		keyStepSlow,
    		keyStepFast,
    		decimals,
    		options,
    		format,
    		parse,
    		horizontal,
    		vertical,
    		circular,
    		mainStyle,
    		fastStyle,
    		slowStyle,
    		focusStyle,
    		draggingStyle,
    		editingStyle,
    		cursor,
    		altPressed,
    		shiftPressed,
    		htmlNode,
    		htmlNodeOriginalCursor,
    		defaultCursor,
    		keydown_handler_1,
    		keypress_handler_1,
    		keyup_handler_1,
    		keydown_handler,
    		keypress_handler,
    		keyup_handler,
    		input0_binding,
    		input0_input_handler,
    		input1_binding,
    		input1_input_handler
    	];
    }

    class NumberSpinner extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(
    			this,
    			options,
    			instance$1,
    			create_fragment$1,
    			safe_not_equal,
    			{
    				options: 33,
    				value: 25,
    				min: 0,
    				max: 26,
    				step: 1,
    				precision: 27,
    				speed: 28,
    				keyStep: 29,
    				keyStepSlow: 30,
    				keyStepFast: 31,
    				decimals: 32,
    				format: 34,
    				parse: 35,
    				horizontal: 36,
    				vertical: 37,
    				circular: 38,
    				mainStyle: 39,
    				fastStyle: 40,
    				slowStyle: 41,
    				focusStyle: 42,
    				draggingStyle: 43,
    				editingStyle: 44,
    				cursor: 45
    			},
    			[-1, -1, -1]
    		);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "NumberSpinner",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get options() {
    		throw new Error("<NumberSpinner>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set options(value) {
    		throw new Error("<NumberSpinner>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get value() {
    		throw new Error("<NumberSpinner>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<NumberSpinner>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get min() {
    		throw new Error("<NumberSpinner>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set min(value) {
    		throw new Error("<NumberSpinner>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get max() {
    		throw new Error("<NumberSpinner>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set max(value) {
    		throw new Error("<NumberSpinner>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get step() {
    		throw new Error("<NumberSpinner>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set step(value) {
    		throw new Error("<NumberSpinner>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get precision() {
    		throw new Error("<NumberSpinner>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set precision(value) {
    		throw new Error("<NumberSpinner>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get speed() {
    		throw new Error("<NumberSpinner>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set speed(value) {
    		throw new Error("<NumberSpinner>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get keyStep() {
    		throw new Error("<NumberSpinner>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set keyStep(value) {
    		throw new Error("<NumberSpinner>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get keyStepSlow() {
    		throw new Error("<NumberSpinner>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set keyStepSlow(value) {
    		throw new Error("<NumberSpinner>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get keyStepFast() {
    		throw new Error("<NumberSpinner>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set keyStepFast(value) {
    		throw new Error("<NumberSpinner>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get decimals() {
    		throw new Error("<NumberSpinner>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set decimals(value) {
    		throw new Error("<NumberSpinner>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get format() {
    		throw new Error("<NumberSpinner>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set format(value) {
    		throw new Error("<NumberSpinner>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get parse() {
    		throw new Error("<NumberSpinner>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set parse(value) {
    		throw new Error("<NumberSpinner>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get horizontal() {
    		throw new Error("<NumberSpinner>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set horizontal(value) {
    		throw new Error("<NumberSpinner>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get vertical() {
    		throw new Error("<NumberSpinner>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set vertical(value) {
    		throw new Error("<NumberSpinner>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get circular() {
    		throw new Error("<NumberSpinner>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set circular(value) {
    		throw new Error("<NumberSpinner>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get mainStyle() {
    		throw new Error("<NumberSpinner>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set mainStyle(value) {
    		throw new Error("<NumberSpinner>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get fastStyle() {
    		throw new Error("<NumberSpinner>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set fastStyle(value) {
    		throw new Error("<NumberSpinner>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get slowStyle() {
    		throw new Error("<NumberSpinner>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set slowStyle(value) {
    		throw new Error("<NumberSpinner>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get focusStyle() {
    		throw new Error("<NumberSpinner>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set focusStyle(value) {
    		throw new Error("<NumberSpinner>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get draggingStyle() {
    		throw new Error("<NumberSpinner>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set draggingStyle(value) {
    		throw new Error("<NumberSpinner>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get editingStyle() {
    		throw new Error("<NumberSpinner>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set editingStyle(value) {
    		throw new Error("<NumberSpinner>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get cursor() {
    		throw new Error("<NumberSpinner>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set cursor(value) {
    		throw new Error("<NumberSpinner>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* example/src/App2.svelte generated by Svelte v3.38.2 */
    const file = "example/src/App2.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[15] = list[i];
    	child_ctx[17] = i;
    	return child_ctx;
    }

    // (24:0) {#if showSpinner}
    function create_if_block_1(ctx) {
    	let div;
    	let numberspinner;
    	let updating_value;
    	let current;

    	function numberspinner_value_binding(value) {
    		/*numberspinner_value_binding*/ ctx[5](value);
    	}

    	let numberspinner_props = {};

    	if (/*value1*/ ctx[1] !== void 0) {
    		numberspinner_props.value = /*value1*/ ctx[1];
    	}

    	numberspinner = new NumberSpinner({
    			props: numberspinner_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(numberspinner, "value", numberspinner_value_binding));
    	numberspinner.$on("consoleLog", /*consoleLog_handler*/ ctx[6]);
    	numberspinner.$on("keydown", /*keydown_handler*/ ctx[7]);
    	numberspinner.$on("keypress", /*keypress_handler*/ ctx[8]);
    	numberspinner.$on("keyup", /*keyup_handler*/ ctx[9]);
    	numberspinner.$on("dragstart", /*dragstart_handler*/ ctx[10]);
    	numberspinner.$on("dragend", /*dragend_handler*/ ctx[11]);
    	numberspinner.$on("editstart", /*editstart_handler*/ ctx[12]);
    	numberspinner.$on("editend", /*editend_handler*/ ctx[13]);

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(numberspinner.$$.fragment);
    			attr_dev(div, "class", "row svelte-bq8nj9");
    			add_location(div, file, 24, 2, 474);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(numberspinner, div, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const numberspinner_changes = {};

    			if (!updating_value && dirty & /*value1*/ 2) {
    				updating_value = true;
    				numberspinner_changes.value = /*value1*/ ctx[1];
    				add_flush_callback(() => updating_value = false);
    			}

    			numberspinner.$set(numberspinner_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(numberspinner.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(numberspinner.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(numberspinner);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(24:0) {#if showSpinner}",
    		ctx
    	});

    	return block;
    }

    // (70:4) {#if logs[i + 1]?.timestamp < log.timestamp - 200}
    function create_if_block(ctx) {
    	let br;

    	const block = {
    		c: function create() {
    			br = element("br");
    			add_location(br, file, 69, 54, 1853);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, br, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(br);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(70:4) {#if logs[i + 1]?.timestamp < log.timestamp - 200}",
    		ctx
    	});

    	return block;
    }

    // (65:2) {#each logs as log, i}
    function create_each_block(ctx) {
    	let t0_value = new Date(/*log*/ ctx[15].timestamp).toLocaleTimeString("de-DE") + "";
    	let t0;
    	let t1;
    	let t2_value = (/*log*/ ctx[15].timestamp % 1000).toString().padStart(3, "0") + "";
    	let t2;
    	let t3;
    	let t4_value = /*log*/ ctx[15].msg + "";
    	let t4;
    	let br;
    	let t5;
    	let if_block_anchor;
    	let if_block = /*logs*/ ctx[3][/*i*/ ctx[17] + 1]?.timestamp < /*log*/ ctx[15].timestamp - 200 && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			t0 = text(t0_value);
    			t1 = text(".");
    			t2 = text(t2_value);
    			t3 = text(" – ");
    			t4 = text(t4_value);
    			br = element("br");
    			t5 = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			add_location(br, file, 67, 36, 1791);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, br, anchor);
    			insert_dev(target, t5, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*logs*/ 8 && t0_value !== (t0_value = new Date(/*log*/ ctx[15].timestamp).toLocaleTimeString("de-DE") + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*logs*/ 8 && t2_value !== (t2_value = (/*log*/ ctx[15].timestamp % 1000).toString().padStart(3, "0") + "")) set_data_dev(t2, t2_value);
    			if (dirty & /*logs*/ 8 && t4_value !== (t4_value = /*log*/ ctx[15].msg + "")) set_data_dev(t4, t4_value);

    			if (/*logs*/ ctx[3][/*i*/ ctx[17] + 1]?.timestamp < /*log*/ ctx[15].timestamp - 200) {
    				if (if_block) ; else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(br);
    			if (detaching) detach_dev(t5);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(65:2) {#each logs as log, i}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let h3;
    	let t1;
    	let p;
    	let t3;
    	let hr0;
    	let t4;
    	let label;
    	let input0;
    	let t5;
    	let t6;
    	let t7;
    	let hr1;
    	let t8;
    	let div0;
    	let numberspinner;
    	let updating_value;
    	let t9;
    	let hr2;
    	let t10;
    	let input1;
    	let t11;
    	let div1;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block = /*showSpinner*/ ctx[0] && create_if_block_1(ctx);

    	function numberspinner_value_binding_1(value) {
    		/*numberspinner_value_binding_1*/ ctx[14](value);
    	}

    	let numberspinner_props = {};

    	if (/*value2*/ ctx[2] !== void 0) {
    		numberspinner_props.value = /*value2*/ ctx[2];
    	}

    	numberspinner = new NumberSpinner({
    			props: numberspinner_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(numberspinner, "value", numberspinner_value_binding_1));
    	let each_value = /*logs*/ ctx[3];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			h3 = element("h3");
    			h3.textContent = "Test App";
    			t1 = space();
    			p = element("p");
    			p.textContent = "The first number spinner listens to custom logging events and displays them on screen for faster\n  debugging on mobile devices.";
    			t3 = space();
    			hr0 = element("hr");
    			t4 = space();
    			label = element("label");
    			input0 = element("input");
    			t5 = text("\n  Show Spinner");
    			t6 = space();
    			if (if_block) if_block.c();
    			t7 = space();
    			hr1 = element("hr");
    			t8 = space();
    			div0 = element("div");
    			create_component(numberspinner.$$.fragment);
    			t9 = space();
    			hr2 = element("hr");
    			t10 = space();
    			input1 = element("input");
    			t11 = space();
    			div1 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			add_location(h3, file, 10, 0, 200);
    			add_location(p, file, 11, 0, 218);
    			attr_dev(hr0, "class", "svelte-bq8nj9");
    			add_location(hr0, file, 16, 0, 358);
    			attr_dev(input0, "type", "checkbox");
    			add_location(input0, file, 19, 2, 376);
    			add_location(label, file, 18, 0, 366);
    			attr_dev(hr1, "class", "svelte-bq8nj9");
    			add_location(hr1, file, 53, 0, 1465);
    			attr_dev(div0, "class", "row svelte-bq8nj9");
    			add_location(div0, file, 55, 0, 1473);
    			attr_dev(hr2, "class", "svelte-bq8nj9");
    			add_location(hr2, file, 59, 0, 1539);
    			attr_dev(input1, "type", "text");
    			input1.value = "Some other normal input field";
    			add_location(input1, file, 61, 0, 1547);
    			attr_dev(div1, "class", "console svelte-bq8nj9");
    			add_location(div1, file, 63, 0, 1608);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h3, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, p, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, hr0, anchor);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, label, anchor);
    			append_dev(label, input0);
    			input0.checked = /*showSpinner*/ ctx[0];
    			append_dev(label, t5);
    			insert_dev(target, t6, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, hr1, anchor);
    			insert_dev(target, t8, anchor);
    			insert_dev(target, div0, anchor);
    			mount_component(numberspinner, div0, null);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, hr2, anchor);
    			insert_dev(target, t10, anchor);
    			insert_dev(target, input1, anchor);
    			insert_dev(target, t11, anchor);
    			insert_dev(target, div1, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(input0, "change", /*input0_change_handler*/ ctx[4]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*showSpinner*/ 1) {
    				input0.checked = /*showSpinner*/ ctx[0];
    			}

    			if (/*showSpinner*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*showSpinner*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block_1(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(t7.parentNode, t7);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			const numberspinner_changes = {};

    			if (!updating_value && dirty & /*value2*/ 4) {
    				updating_value = true;
    				numberspinner_changes.value = /*value2*/ ctx[2];
    				add_flush_callback(() => updating_value = false);
    			}

    			numberspinner.$set(numberspinner_changes);

    			if (dirty & /*logs, Date*/ 8) {
    				each_value = /*logs*/ ctx[3];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div1, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			transition_in(numberspinner.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			transition_out(numberspinner.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h3);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(p);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(hr0);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(label);
    			if (detaching) detach_dev(t6);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(t7);
    			if (detaching) detach_dev(hr1);
    			if (detaching) detach_dev(t8);
    			if (detaching) detach_dev(div0);
    			destroy_component(numberspinner);
    			if (detaching) detach_dev(t9);
    			if (detaching) detach_dev(hr2);
    			if (detaching) detach_dev(t10);
    			if (detaching) detach_dev(input1);
    			if (detaching) detach_dev(t11);
    			if (detaching) detach_dev(div1);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App2", slots, []);
    	let showSpinner = true;
    	let value1 = 100;
    	let value2 = 33;
    	let logs = [];
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App2> was created with unknown prop '${key}'`);
    	});

    	function input0_change_handler() {
    		showSpinner = this.checked;
    		$$invalidate(0, showSpinner);
    	}

    	function numberspinner_value_binding(value) {
    		value1 = value;
    		$$invalidate(1, value1);
    	}

    	const consoleLog_handler = ev => $$invalidate(3, logs = [{ timestamp: Date.now(), msg: ev.detail }, ...logs]);

    	const keydown_handler = ev => {
    		$$invalidate(3, logs = [
    			{
    				timestamp: Date.now(),
    				msg: "keydown key: " + ev.key
    			},
    			...logs
    		]);
    	};

    	const keypress_handler = ev => {
    		$$invalidate(3, logs = [
    			{
    				timestamp: Date.now(),
    				msg: "keypress key: " + ev.key
    			},
    			...logs
    		]);
    	};

    	const keyup_handler = ev => {
    		$$invalidate(3, logs = [
    			{
    				timestamp: Date.now(),
    				msg: "keyup key: " + ev.key
    			},
    			...logs
    		]);
    	};

    	const dragstart_handler = ev => {
    		$$invalidate(3, logs = [
    			{
    				timestamp: Date.now(),
    				msg: "dragstart " + value1
    			},
    			...logs
    		]);
    	};

    	const dragend_handler = ev => {
    		$$invalidate(3, logs = [
    			{
    				timestamp: Date.now(),
    				msg: "dragend " + value1
    			},
    			...logs
    		]);
    	};

    	const editstart_handler = ev => {
    		$$invalidate(3, logs = [{ timestamp: Date.now(), msg: "editstart" }, ...logs]);
    	};

    	const editend_handler = ev => {
    		$$invalidate(3, logs = [{ timestamp: Date.now(), msg: "editend" }, ...logs]);
    	};

    	function numberspinner_value_binding_1(value) {
    		value2 = value;
    		$$invalidate(2, value2);
    	}

    	$$self.$capture_state = () => ({
    		NumberSpinner,
    		showSpinner,
    		value1,
    		value2,
    		logs
    	});

    	$$self.$inject_state = $$props => {
    		if ("showSpinner" in $$props) $$invalidate(0, showSpinner = $$props.showSpinner);
    		if ("value1" in $$props) $$invalidate(1, value1 = $$props.value1);
    		if ("value2" in $$props) $$invalidate(2, value2 = $$props.value2);
    		if ("logs" in $$props) $$invalidate(3, logs = $$props.logs);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		showSpinner,
    		value1,
    		value2,
    		logs,
    		input0_change_handler,
    		numberspinner_value_binding,
    		consoleLog_handler,
    		keydown_handler,
    		keypress_handler,
    		keyup_handler,
    		dragstart_handler,
    		dragend_handler,
    		editstart_handler,
    		editend_handler,
    		numberspinner_value_binding_1
    	];
    }

    class App2 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App2",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    var app = new App2({
    	target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
