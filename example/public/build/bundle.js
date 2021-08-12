
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
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

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

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

    const { console: console_1 } = globals;
    const file$1 = "src/NumberSpinner.svelte";

    function create_fragment$1(ctx) {
    	let button;
    	let t1;
    	let input;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Focus";
    			t1 = space();
    			input = element("input");
    			add_location(button, file$1, 19, 0, 434);
    			attr_dev(input, "type", "text");
    			add_location(input, file$1, 20, 0, 481);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, input, anchor);
    			/*input_binding*/ ctx[3](input);
    			set_input_value(input, /*value*/ ctx[0]);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button, "click", /*focusHandler*/ ctx[2], false, false, false),
    					listen_dev(input, "input", /*input_input_handler*/ ctx[4])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*value*/ 1 && input.value !== /*value*/ ctx[0]) {
    				set_input_value(input, /*value*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(input);
    			/*input_binding*/ ctx[3](null);
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

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("NumberSpinner", slots, []);
    	const dispatch = createEventDispatcher();
    	let { value = 0 } = $$props;

    	// export let min = -Number.MAX_VALUE;
    	// export let max = Number.MAX_VALUE;
    	// export let step = 1;
    	let inputElement;

    	function focusHandler(ev) {
    		console.log(inputElement);
    		inputElement.focus();
    	}

    	const writable_props = ["value"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<NumberSpinner> was created with unknown prop '${key}'`);
    	});

    	function input_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			inputElement = $$value;
    			$$invalidate(1, inputElement);
    		});
    	}

    	function input_input_handler() {
    		value = this.value;
    		$$invalidate(0, value);
    	}

    	$$self.$$set = $$props => {
    		if ("value" in $$props) $$invalidate(0, value = $$props.value);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		dispatch,
    		value,
    		inputElement,
    		focusHandler
    	});

    	$$self.$inject_state = $$props => {
    		if ("value" in $$props) $$invalidate(0, value = $$props.value);
    		if ("inputElement" in $$props) $$invalidate(1, inputElement = $$props.inputElement);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [value, inputElement, focusHandler, input_binding, input_input_handler];
    }

    class NumberSpinner extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { value: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "NumberSpinner",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get value() {
    		throw new Error("<NumberSpinner>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<NumberSpinner>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* example/src/App2.svelte generated by Svelte v3.38.2 */
    const file = "example/src/App2.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[6] = list[i];
    	child_ctx[8] = i;
    	return child_ctx;
    }

    // (34:4) {#if logs[i+1]?.timestamp < log.timestamp - 200}
    function create_if_block(ctx) {
    	let br;

    	const block = {
    		c: function create() {
    			br = element("br");
    			add_location(br, file, 33, 52, 732);
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
    		source: "(34:4) {#if logs[i+1]?.timestamp < log.timestamp - 200}",
    		ctx
    	});

    	return block;
    }

    // (30:2) {#each logs as log, i}
    function create_each_block(ctx) {
    	let t0_value = new Date(/*log*/ ctx[6].timestamp).toLocaleTimeString("de-DE") + "";
    	let t0;
    	let t1;
    	let t2_value = (/*log*/ ctx[6].timestamp % 1000).toString().padStart(3, "0") + "";
    	let t2;
    	let t3;
    	let t4_value = /*log*/ ctx[6].msg + "";
    	let t4;
    	let br;
    	let t5;
    	let if_block_anchor;
    	let if_block = /*logs*/ ctx[2][/*i*/ ctx[8] + 1]?.timestamp < /*log*/ ctx[6].timestamp - 200 && create_if_block(ctx);

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
    			add_location(br, file, 31, 124, 674);
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
    			if (dirty & /*logs*/ 4 && t0_value !== (t0_value = new Date(/*log*/ ctx[6].timestamp).toLocaleTimeString("de-DE") + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*logs*/ 4 && t2_value !== (t2_value = (/*log*/ ctx[6].timestamp % 1000).toString().padStart(3, "0") + "")) set_data_dev(t2, t2_value);
    			if (dirty & /*logs*/ 4 && t4_value !== (t4_value = /*log*/ ctx[6].msg + "")) set_data_dev(t4, t4_value);

    			if (/*logs*/ ctx[2][/*i*/ ctx[8] + 1]?.timestamp < /*log*/ ctx[6].timestamp - 200) {
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
    		source: "(30:2) {#each logs as log, i}",
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
    	let div0;
    	let numberspinner0;
    	let updating_value;
    	let t5;
    	let hr1;
    	let t6;
    	let div1;
    	let numberspinner1;
    	let updating_value_1;
    	let t7;
    	let hr2;
    	let t8;
    	let div2;
    	let current;

    	function numberspinner0_value_binding(value) {
    		/*numberspinner0_value_binding*/ ctx[3](value);
    	}

    	let numberspinner0_props = {};

    	if (/*value1*/ ctx[0] !== void 0) {
    		numberspinner0_props.value = /*value1*/ ctx[0];
    	}

    	numberspinner0 = new NumberSpinner({
    			props: numberspinner0_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(numberspinner0, "value", numberspinner0_value_binding));
    	numberspinner0.$on("consoleLog", /*consoleLog_handler*/ ctx[4]);

    	function numberspinner1_value_binding(value) {
    		/*numberspinner1_value_binding*/ ctx[5](value);
    	}

    	let numberspinner1_props = {};

    	if (/*value2*/ ctx[1] !== void 0) {
    		numberspinner1_props.value = /*value2*/ ctx[1];
    	}

    	numberspinner1 = new NumberSpinner({
    			props: numberspinner1_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(numberspinner1, "value", numberspinner1_value_binding));
    	let each_value = /*logs*/ ctx[2];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			h3 = element("h3");
    			h3.textContent = "Touch 1";
    			t1 = space();
    			p = element("p");
    			p.textContent = "When pressing \"Focus\" input gets focussed and keyboard should come up.";
    			t3 = space();
    			hr0 = element("hr");
    			t4 = space();
    			div0 = element("div");
    			create_component(numberspinner0.$$.fragment);
    			t5 = space();
    			hr1 = element("hr");
    			t6 = space();
    			div1 = element("div");
    			create_component(numberspinner1.$$.fragment);
    			t7 = space();
    			hr2 = element("hr");
    			t8 = space();
    			div2 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			add_location(h3, file, 10, 0, 177);
    			add_location(p, file, 11, 0, 194);
    			attr_dev(hr0, "class", "svelte-bq8nj9");
    			add_location(hr0, file, 13, 0, 273);
    			attr_dev(div0, "class", "row svelte-bq8nj9");
    			add_location(div0, file, 15, 0, 279);
    			attr_dev(hr1, "class", "svelte-bq8nj9");
    			add_location(hr1, file, 19, 0, 423);
    			attr_dev(div1, "class", "row svelte-bq8nj9");
    			add_location(div1, file, 21, 0, 429);
    			attr_dev(hr2, "class", "svelte-bq8nj9");
    			add_location(hr2, file, 25, 0, 495);
    			attr_dev(div2, "class", "console svelte-bq8nj9");
    			add_location(div2, file, 28, 0, 502);
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
    			insert_dev(target, div0, anchor);
    			mount_component(numberspinner0, div0, null);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, hr1, anchor);
    			insert_dev(target, t6, anchor);
    			insert_dev(target, div1, anchor);
    			mount_component(numberspinner1, div1, null);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, hr2, anchor);
    			insert_dev(target, t8, anchor);
    			insert_dev(target, div2, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div2, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const numberspinner0_changes = {};

    			if (!updating_value && dirty & /*value1*/ 1) {
    				updating_value = true;
    				numberspinner0_changes.value = /*value1*/ ctx[0];
    				add_flush_callback(() => updating_value = false);
    			}

    			numberspinner0.$set(numberspinner0_changes);
    			const numberspinner1_changes = {};

    			if (!updating_value_1 && dirty & /*value2*/ 2) {
    				updating_value_1 = true;
    				numberspinner1_changes.value = /*value2*/ ctx[1];
    				add_flush_callback(() => updating_value_1 = false);
    			}

    			numberspinner1.$set(numberspinner1_changes);

    			if (dirty & /*logs, Date*/ 4) {
    				each_value = /*logs*/ ctx[2];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div2, null);
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
    			transition_in(numberspinner0.$$.fragment, local);
    			transition_in(numberspinner1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(numberspinner0.$$.fragment, local);
    			transition_out(numberspinner1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h3);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(p);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(hr0);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(div0);
    			destroy_component(numberspinner0);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(hr1);
    			if (detaching) detach_dev(t6);
    			if (detaching) detach_dev(div1);
    			destroy_component(numberspinner1);
    			if (detaching) detach_dev(t7);
    			if (detaching) detach_dev(hr2);
    			if (detaching) detach_dev(t8);
    			if (detaching) detach_dev(div2);
    			destroy_each(each_blocks, detaching);
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
    	let value1 = 100;
    	let value2 = 33;
    	let logs = [];
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App2> was created with unknown prop '${key}'`);
    	});

    	function numberspinner0_value_binding(value) {
    		value1 = value;
    		$$invalidate(0, value1);
    	}

    	const consoleLog_handler = e => $$invalidate(2, logs = [{ timestamp: Date.now(), msg: e.detail }, ...logs]);

    	function numberspinner1_value_binding(value) {
    		value2 = value;
    		$$invalidate(1, value2);
    	}

    	$$self.$capture_state = () => ({ NumberSpinner, value1, value2, logs });

    	$$self.$inject_state = $$props => {
    		if ("value1" in $$props) $$invalidate(0, value1 = $$props.value1);
    		if ("value2" in $$props) $$invalidate(1, value2 = $$props.value2);
    		if ("logs" in $$props) $$invalidate(2, logs = $$props.logs);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		value1,
    		value2,
    		logs,
    		numberspinner0_value_binding,
    		consoleLog_handler,
    		numberspinner1_value_binding
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
