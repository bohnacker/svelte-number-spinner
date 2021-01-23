
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
    function children(element) {
        return Array.from(element.childNodes);
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

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.31.2' }, detail)));
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
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
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
        function set_style(node, key, value, important) {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
        function toggle_class(element, name, toggle) {
            element.classList[toggle ? 'add' : 'remove'](name);
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
        	style.id = "svelte-124gum3-style";
        	style.textContent = ".default.svelte-124gum3{margin:0px;display:inline-block;box-sizing:border-box;font-variant-numeric:tabular-nums;border:1px solid #0004;padding:5px;border-radius:5px;background-color:white;color:black;text-align:right;cursor:initial}.default.svelte-124gum3:focus{border:1px solid #06f;padding:5px;outline-width:0;outline:none}.default.editing.svelte-124gum3{border:2px solid #06f;padding:4px;cursor:default}.default.svelte-124gum3::selection{background:#06f3}.default.fast.svelte-124gum3{color:tomato}.default.slow.svelte-124gum3{color:green}input.svelte-124gum3{user-select:none}input.hide-selection.svelte-124gum3::selection{background:#0000}input.editing.svelte-124gum3{user-select:text}";
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
        			set_style(input, "width", /*width*/ ctx[0] + "px");
        			attr(input, "class", input_class_value = "" + (null_to_empty(/*customClass*/ ctx[1]) + " svelte-124gum3"));
        			attr(input, "contenteditable", input_contenteditable_value = /*editing*/ ctx[3] ? "true" : "false");
        			attr(input, "tabindex", "0");
        			toggle_class(input, "default", !/*customClass*/ ctx[1] ? true : false);
        			toggle_class(input, "fast", /*stepFactor*/ ctx[4] > 1 ? "fast" : "");
        			toggle_class(input, "slow", /*stepFactor*/ ctx[4] < 1 ? "slow" : "");
        			toggle_class(input, "editing", /*editing*/ ctx[3]);
        			toggle_class(input, "hide-selection", /*editing*/ ctx[3] ? "" : "hide-selection  ");
        		},
        		m(target, anchor) {
        			insert(target, input, anchor);
        			set_input_value(input, /*visibleValue*/ ctx[6]);
        			/*input_binding*/ ctx[26](input);

        			if (!mounted) {
        				dispose = [
        					listen(window, "mousemove", function () {
        						if (is_function(/*dragging*/ ctx[5] ? /*mousemoveHandler*/ ctx[9] : "")) (/*dragging*/ ctx[5] ? /*mousemoveHandler*/ ctx[9] : "").apply(this, arguments);
        					}),
        					listen(window, "mouseup", function () {
        						if (is_function(/*dragging*/ ctx[5] ? /*mouseupHandler*/ ctx[10] : "")) (/*dragging*/ ctx[5] ? /*mouseupHandler*/ ctx[10] : "").apply(this, arguments);
        					}),
        					listen(window, "mousedown", function () {
        						if (is_function(/*editing*/ ctx[3] ? /*windowdownHandler*/ ctx[12] : "")) (/*editing*/ ctx[3] ? /*windowdownHandler*/ ctx[12] : "").apply(this, arguments);
        					}),
        					listen(window, "keydown", /*keydownHandler*/ ctx[15]),
        					listen(window, "keyup", /*keyupHandler*/ ctx[16]),
        					listen(input, "mouseenter", /*mouseenterHandler*/ ctx[7]),
        					listen(input, "mouseleave", mouseleaveHandler),
        					listen(input, "mousedown", /*mousedownHandler*/ ctx[8]),
        					listen(input, "dblclick", /*dblclickHandler*/ ctx[11]),
        					listen(input, "focus", /*focusHandler*/ ctx[13]),
        					listen(input, "blur", /*blurHandler*/ ctx[14]),
        					listen(input, "input", /*input_input_handler*/ ctx[25])
        				];

        				mounted = true;
        			}
        		},
        		p(new_ctx, dirty) {
        			ctx = new_ctx;

        			if (dirty[0] & /*width*/ 1) {
        				set_style(input, "width", /*width*/ ctx[0] + "px");
        			}

        			if (dirty[0] & /*customClass*/ 2 && input_class_value !== (input_class_value = "" + (null_to_empty(/*customClass*/ ctx[1]) + " svelte-124gum3"))) {
        				attr(input, "class", input_class_value);
        			}

        			if (dirty[0] & /*editing*/ 8 && input_contenteditable_value !== (input_contenteditable_value = /*editing*/ ctx[3] ? "true" : "false")) {
        				attr(input, "contenteditable", input_contenteditable_value);
        			}

        			if (dirty[0] & /*visibleValue*/ 64 && input.value !== /*visibleValue*/ ctx[6]) {
        				set_input_value(input, /*visibleValue*/ ctx[6]);
        			}

        			if (dirty[0] & /*customClass, customClass*/ 2) {
        				toggle_class(input, "default", !/*customClass*/ ctx[1] ? true : false);
        			}

        			if (dirty[0] & /*customClass, stepFactor*/ 18) {
        				toggle_class(input, "fast", /*stepFactor*/ ctx[4] > 1 ? "fast" : "");
        			}

        			if (dirty[0] & /*customClass, stepFactor*/ 18) {
        				toggle_class(input, "slow", /*stepFactor*/ ctx[4] < 1 ? "slow" : "");
        			}

        			if (dirty[0] & /*customClass, editing*/ 10) {
        				toggle_class(input, "editing", /*editing*/ ctx[3]);
        			}

        			if (dirty[0] & /*customClass, editing*/ 10) {
        				toggle_class(input, "hide-selection", /*editing*/ ctx[3] ? "" : "hide-selection  ");
        			}
        		},
        		i: noop,
        		o: noop,
        		d(detaching) {
        			if (detaching) detach(input);
        			/*input_binding*/ ctx[26](null);
        			mounted = false;
        			run_all(dispose);
        		}
        	};
        }

        function mouseleaveHandler(e) {
        	
        }

        function instance($$self, $$props, $$invalidate) {
        	let { value = 0 } = $$props;
        	let { min = -Number.MAX_VALUE } = $$props;
        	let { max = Number.MAX_VALUE } = $$props;
        	let { step = 1 } = $$props;
        	let { decimals = 0 } = $$props;
        	let { width = 60 } = $$props;
        	let { customClass = undefined } = $$props;
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
        	visibleValue = setValue(value);
        	preciseValue = setValue(value);

        	// handlers --------------------------------
        	function mouseenterHandler(e) {
        		inputElement?.focus();
        	}

        	function mousedownHandler(e) {
        		// console.log('down');
        		if (editing) {
        			e.stopPropagation();
        		} else {
        			clickX = e.clientX;
        			clickY = e.clientY;
        			$$invalidate(5, dragging = true);
        			preciseValue = setValue(value);
        		} //console.log(e.clientX, e.clientY);
        	}

        	function mousemoveHandler(e) {
        		let actX = e.clientX;
        		let actY = e.clientY;
        		let distX = actX - clickX;
        		let distY = -(actY - clickY);
        		let stepNum = Math.abs(distX) > Math.abs(distY) ? distX : distY;
        		stepValue(stepNum);
        		clickX = actX;
        		clickY = actY;
        	}

        	function mouseupHandler(e) {
        		// console.log('up');
        		$$invalidate(5, dragging = false);

        		$$invalidate(4, stepFactor = 1);
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
        		$$invalidate(22, focussed = true);

        		stopEditing();
        	}

        	function blurHandler(e) {
        		// console.log('blur');
        		$$invalidate(22, focussed = false);

        		stopEditing();
        	}

        	function keydownHandler(e) {
        		// console.log(e);
        		if (e.key == "Shift") {
        			$$invalidate(24, shiftPressed = true);
        		}

        		if (e.key == "Alt") {
        			$$invalidate(23, altPressed = true);
        		}
        	}

        	function keyupHandler(e) {
        		// console.log(e)
        		if (e.key == "Shift") {
        			$$invalidate(24, shiftPressed = false);
        		}

        		if (e.key == "Alt") {
        			$$invalidate(23, altPressed = false);
        		}

        		if (focussed) {
        			if (!editing) {
        				if (e.key == "ArrowUp" || e.key == "ArrowRight") {
        					stepValue(10);
        				}

        				if (e.key == "ArrowDown" || e.key == "ArrowLeft") {
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
        		$$invalidate(6, visibleValue = preciseValue.toFixed(decimals));
        		$$invalidate(17, value = preciseValue.toFixed(decimals));
        	}

        	function stepValue(numSteps) {
        		preciseValue = preciseValue ?? parseFloat(visibleValue);
        		preciseValue += numSteps * step * stepFactor;
        		preciseValue = Math.min(preciseValue, max);
        		preciseValue = Math.max(preciseValue, min);
        		$$invalidate(6, visibleValue = preciseValue.toFixed(decimals));
        		$$invalidate(17, value = preciseValue.toFixed(decimals));
        	}

        	function startEditing() {
        		preciseValue = parseFloat(visibleValue);
        		$$invalidate(3, editing = true);
        		inputElement.setSelectionRange(0, 30);
        	}

        	function stopEditing() {
        		$$invalidate(3, editing = false);
        		inputElement.setSelectionRange(0, 0);
        		preciseValue = parseFloat(visibleValue);
        		setValue(preciseValue);
        	}

        	function input_input_handler() {
        		visibleValue = this.value;
        		$$invalidate(6, visibleValue);
        	}

        	function input_binding($$value) {
        		binding_callbacks[$$value ? "unshift" : "push"](() => {
        			inputElement = $$value;
        			($$invalidate(2, inputElement), $$invalidate(3, editing));
        		});
        	}

        	$$self.$$set = $$props => {
        		if ("value" in $$props) $$invalidate(17, value = $$props.value);
        		if ("min" in $$props) $$invalidate(18, min = $$props.min);
        		if ("max" in $$props) $$invalidate(19, max = $$props.max);
        		if ("step" in $$props) $$invalidate(20, step = $$props.step);
        		if ("decimals" in $$props) $$invalidate(21, decimals = $$props.decimals);
        		if ("width" in $$props) $$invalidate(0, width = $$props.width);
        		if ("customClass" in $$props) $$invalidate(1, customClass = $$props.customClass);
        	};

        	$$self.$$.update = () => {
        		if ($$self.$$.dirty[0] & /*inputElement, editing*/ 12) {
        			// updaters --------------------------------
        			 if (inputElement) {
        				$$invalidate(2, inputElement.readOnly = !editing, inputElement);
        			}
        		}

        		if ($$self.$$.dirty[0] & /*focussed, shiftPressed, altPressed*/ 29360128) {
        			 {
        				$$invalidate(4, stepFactor = 1);

        				if (focussed) {
        					if (shiftPressed) {
        						$$invalidate(4, stepFactor = 10);
        					} else if (altPressed) {
        						$$invalidate(4, stepFactor = 0.1);
        					}
        				}
        			}
        		}
        	};

        	return [
        		width,
        		customClass,
        		inputElement,
        		editing,
        		stepFactor,
        		dragging,
        		visibleValue,
        		mouseenterHandler,
        		mousedownHandler,
        		mousemoveHandler,
        		mouseupHandler,
        		dblclickHandler,
        		windowdownHandler,
        		focusHandler,
        		blurHandler,
        		keydownHandler,
        		keyupHandler,
        		value,
        		min,
        		max,
        		step,
        		decimals,
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
        		if (!document.getElementById("svelte-124gum3-style")) add_css();

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
        				width: 0,
        				customClass: 1
        			},
        			[-1, -1]
        		);
        	}
        }

        return NumberSpinner;

    })));
    });

    /* example/src/App.svelte generated by Svelte v3.31.2 */
    const file = "example/src/App.svelte";

    function create_fragment(ctx) {
    	let p0;
    	let t0;
    	let br0;
    	let t1;
    	let t2;
    	let p1;
    	let t3;
    	let numberspinner0;
    	let updating_value;
    	let br1;
    	let t4;
    	let t5;
    	let t6;
    	let t7;
    	let p2;
    	let t8;
    	let numberspinner1;
    	let updating_value_1;
    	let br2;
    	let t9;
    	let t10;
    	let t11;
    	let t12;
    	let p3;
    	let t13;
    	let numberspinner2;
    	let updating_value_2;
    	let br3;
    	let t14;
    	let t15;
    	let t16;
    	let t17;
    	let p4;
    	let t18;
    	let numberspinner3;
    	let updating_value_3;
    	let br4;
    	let t19;
    	let t20;
    	let t21;
    	let current;

    	function numberspinner0_value_binding(value) {
    		/*numberspinner0_value_binding*/ ctx[4].call(null, value);
    	}

    	let numberspinner0_props = {};

    	if (/*value1*/ ctx[0] !== void 0) {
    		numberspinner0_props.value = /*value1*/ ctx[0];
    	}

    	numberspinner0 = new dist({
    			props: numberspinner0_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(numberspinner0, "value", numberspinner0_value_binding));

    	function numberspinner1_value_binding(value) {
    		/*numberspinner1_value_binding*/ ctx[5].call(null, value);
    	}

    	let numberspinner1_props = { min: "0", max: "1000" };

    	if (/*value2*/ ctx[1] !== void 0) {
    		numberspinner1_props.value = /*value2*/ ctx[1];
    	}

    	numberspinner1 = new dist({
    			props: numberspinner1_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(numberspinner1, "value", numberspinner1_value_binding));

    	function numberspinner2_value_binding(value) {
    		/*numberspinner2_value_binding*/ ctx[6].call(null, value);
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

    	numberspinner2 = new dist({
    			props: numberspinner2_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(numberspinner2, "value", numberspinner2_value_binding));

    	function numberspinner3_value_binding(value) {
    		/*numberspinner3_value_binding*/ ctx[7].call(null, value);
    	}

    	let numberspinner3_props = {
    		min: "0",
    		max: "1",
    		step: "0.001",
    		decimals: "3",
    		customClass: "number-spinner-custom"
    	};

    	if (/*value4*/ ctx[3] !== void 0) {
    		numberspinner3_props.value = /*value4*/ ctx[3];
    	}

    	numberspinner3 = new dist({
    			props: numberspinner3_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(numberspinner3, "value", numberspinner3_value_binding));

    	const block = {
    		c: function create() {
    			p0 = element("p");
    			t0 = text("Change the values of the number spinners through mousedrag and arrow keys.");
    			br0 = element("br");
    			t1 = text("\n  Press 'Alt' for smaller steps, 'Shift' for larger steps. Double click to edit.");
    			t2 = space();
    			p1 = element("p");
    			t3 = text("Standard with no range limits and a step of 1: \n  ");
    			create_component(numberspinner0.$$.fragment);
    			br1 = element("br");
    			t4 = text("\n  Current value is ");
    			t5 = text(/*value1*/ ctx[0]);
    			t6 = text(".");
    			t7 = space();
    			p2 = element("p");
    			t8 = text("Range from 0 to 1000: \n  ");
    			create_component(numberspinner1.$$.fragment);
    			br2 = element("br");
    			t9 = text("\n  Current value is ");
    			t10 = text(/*value2*/ ctx[1]);
    			t11 = text(".");
    			t12 = space();
    			p3 = element("p");
    			t13 = text("Steps 0.01 and shows the values with a precision of 2 decimals:\n\t");
    			create_component(numberspinner2.$$.fragment);
    			br3 = element("br");
    			t14 = text("\n  Current value is ");
    			t15 = text(/*value3*/ ctx[2]);
    			t16 = text(".");
    			t17 = space();
    			p4 = element("p");
    			t18 = text("Custom class given for individual styling:\n  ");
    			create_component(numberspinner3.$$.fragment);
    			br4 = element("br");
    			t19 = text("\n  Current value is ");
    			t20 = text(/*value4*/ ctx[3]);
    			t21 = text(".");
    			add_location(br0, file, 11, 76, 233);
    			add_location(p0, file, 10, 0, 153);
    			add_location(br1, file, 17, 53, 432);
    			add_location(p1, file, 15, 0, 325);
    			add_location(br2, file, 23, 68, 569);
    			add_location(p2, file, 21, 0, 472);
    			add_location(br3, file, 29, 86, 765);
    			add_location(p3, file, 27, 0, 609);
    			add_location(br4, file, 35, 123, 977);
    			add_location(p4, file, 33, 0, 805);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p0, anchor);
    			append_dev(p0, t0);
    			append_dev(p0, br0);
    			append_dev(p0, t1);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, p1, anchor);
    			append_dev(p1, t3);
    			mount_component(numberspinner0, p1, null);
    			append_dev(p1, br1);
    			append_dev(p1, t4);
    			append_dev(p1, t5);
    			append_dev(p1, t6);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, p2, anchor);
    			append_dev(p2, t8);
    			mount_component(numberspinner1, p2, null);
    			append_dev(p2, br2);
    			append_dev(p2, t9);
    			append_dev(p2, t10);
    			append_dev(p2, t11);
    			insert_dev(target, t12, anchor);
    			insert_dev(target, p3, anchor);
    			append_dev(p3, t13);
    			mount_component(numberspinner2, p3, null);
    			append_dev(p3, br3);
    			append_dev(p3, t14);
    			append_dev(p3, t15);
    			append_dev(p3, t16);
    			insert_dev(target, t17, anchor);
    			insert_dev(target, p4, anchor);
    			append_dev(p4, t18);
    			mount_component(numberspinner3, p4, null);
    			append_dev(p4, br4);
    			append_dev(p4, t19);
    			append_dev(p4, t20);
    			append_dev(p4, t21);
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
    			if (!current || dirty & /*value1*/ 1) set_data_dev(t5, /*value1*/ ctx[0]);
    			const numberspinner1_changes = {};

    			if (!updating_value_1 && dirty & /*value2*/ 2) {
    				updating_value_1 = true;
    				numberspinner1_changes.value = /*value2*/ ctx[1];
    				add_flush_callback(() => updating_value_1 = false);
    			}

    			numberspinner1.$set(numberspinner1_changes);
    			if (!current || dirty & /*value2*/ 2) set_data_dev(t10, /*value2*/ ctx[1]);
    			const numberspinner2_changes = {};

    			if (!updating_value_2 && dirty & /*value3*/ 4) {
    				updating_value_2 = true;
    				numberspinner2_changes.value = /*value3*/ ctx[2];
    				add_flush_callback(() => updating_value_2 = false);
    			}

    			numberspinner2.$set(numberspinner2_changes);
    			if (!current || dirty & /*value3*/ 4) set_data_dev(t15, /*value3*/ ctx[2]);
    			const numberspinner3_changes = {};

    			if (!updating_value_3 && dirty & /*value4*/ 8) {
    				updating_value_3 = true;
    				numberspinner3_changes.value = /*value4*/ ctx[3];
    				add_flush_callback(() => updating_value_3 = false);
    			}

    			numberspinner3.$set(numberspinner3_changes);
    			if (!current || dirty & /*value4*/ 8) set_data_dev(t20, /*value4*/ ctx[3]);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(numberspinner0.$$.fragment, local);
    			transition_in(numberspinner1.$$.fragment, local);
    			transition_in(numberspinner2.$$.fragment, local);
    			transition_in(numberspinner3.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(numberspinner0.$$.fragment, local);
    			transition_out(numberspinner1.$$.fragment, local);
    			transition_out(numberspinner2.$$.fragment, local);
    			transition_out(numberspinner3.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p0);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(p1);
    			destroy_component(numberspinner0);
    			if (detaching) detach_dev(t7);
    			if (detaching) detach_dev(p2);
    			destroy_component(numberspinner1);
    			if (detaching) detach_dev(t12);
    			if (detaching) detach_dev(p3);
    			destroy_component(numberspinner2);
    			if (detaching) detach_dev(t17);
    			if (detaching) detach_dev(p4);
    			destroy_component(numberspinner3);
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
    	validate_slots("App", slots, []);
    	let value1 = 100;
    	let value2 = 500;
    	let value3 = 3.28;
    	let value4 = 0.5;
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

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

    	$$self.$capture_state = () => ({
    		NumberSpinner: dist,
    		value1,
    		value2,
    		value3,
    		value4
    	});

    	$$self.$inject_state = $$props => {
    		if ("value1" in $$props) $$invalidate(0, value1 = $$props.value1);
    		if ("value2" in $$props) $$invalidate(1, value2 = $$props.value2);
    		if ("value3" in $$props) $$invalidate(2, value3 = $$props.value3);
    		if ("value4" in $$props) $$invalidate(3, value4 = $$props.value4);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		value1,
    		value2,
    		value3,
    		value4,
    		numberspinner0_value_binding,
    		numberspinner1_value_binding,
    		numberspinner2_value_binding,
    		numberspinner3_value_binding
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    var app = new App({
    	target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
