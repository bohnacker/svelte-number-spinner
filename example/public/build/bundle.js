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

        const globals = (typeof window !== 'undefined'
            ? window
            : typeof globalThis !== 'undefined'
                ? globalThis
                : commonjsGlobal);
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

        const { document: document_1 } = globals;

        function add_css() {
        	var style = element("style");
        	style.id = "svelte-1dc5u64-style";
        	style.textContent = ".default.svelte-1dc5u64{display:inline-block;box-sizing:border-box;font-variant-numeric:tabular-nums;background-color:white;color:black;width:4em;height:1.6em;margin:0px;padding:0.25em;border:0.075em solid #0004;border-radius:0.15em;text-align:right;vertical-align:baseline;cursor:initial}.default.svelte-1dc5u64:focus{border:0.075em solid #06f;outline:none}.default.fast.svelte-1dc5u64{border-top-width:0.15em;padding-top:0.175em}.default.slow.svelte-1dc5u64{border-bottom-width:0.15em;padding-bottom:0.175em}.default.dragging.svelte-1dc5u64{border-color:#06f}.default.editing.svelte-1dc5u64{border:0.15em solid #06f;padding:0.175em;cursor:default}input.svelte-1dc5u64{user-select:none}input.svelte-1dc5u64:not(.editing)::selection{background:#0000}input.editing.svelte-1dc5u64{user-select:text}";
        	append(document_1.head, style);
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
        			attr(input, "class", input_class_value = "" + (null_to_empty(/*$$props*/ ctx[17].class) + " svelte-1dc5u64"));
        			attr(input, "contenteditable", input_contenteditable_value = /*editing*/ ctx[3] ? "true" : "false");
        			attr(input, "tabindex", "0");
        			toggle_class(input, "default", !/*$$props*/ ctx[17].class ? true : false);
        			toggle_class(input, "fast", /*stepFactor*/ ctx[1] > 1 ? "fast" : "");
        			toggle_class(input, "slow", /*stepFactor*/ ctx[1] < 1 ? "slow" : "");
        			toggle_class(input, "dragging", /*dragging*/ ctx[2]);
        			toggle_class(input, "editing", /*editing*/ ctx[3]);
        		},
        		m(target, anchor) {
        			insert(target, input, anchor);
        			set_input_value(input, /*visibleValue*/ ctx[4]);
        			/*input_binding*/ ctx[40](input);

        			if (!mounted) {
        				dispose = [
        					listen(window, "mousemove", function () {
        						if (is_function(/*dragging*/ ctx[2] ? /*mousemoveHandler*/ ctx[8] : "")) (/*dragging*/ ctx[2] ? /*mousemoveHandler*/ ctx[8] : "").apply(this, arguments);
        					}),
        					listen(window, "mouseup", function () {
        						if (is_function(/*dragging*/ ctx[2] ? /*mouseupHandler*/ ctx[9] : "")) (/*dragging*/ ctx[2] ? /*mouseupHandler*/ ctx[9] : "").apply(this, arguments);
        					}),
        					listen(window, "touchmove", function () {
        						if (is_function(/*dragging*/ ctx[2] ? /*mousemoveHandler*/ ctx[8] : "")) (/*dragging*/ ctx[2] ? /*mousemoveHandler*/ ctx[8] : "").apply(this, arguments);
        					}),
        					listen(window, "touchend", function () {
        						if (is_function(/*dragging*/ ctx[2] ? /*mouseupHandler*/ ctx[9] : "")) (/*dragging*/ ctx[2] ? /*mouseupHandler*/ ctx[9] : "").apply(this, arguments);
        					}),
        					listen(window, "mousedown", function () {
        						if (is_function(/*editing*/ ctx[3] ? /*windowdownHandler*/ ctx[11] : "")) (/*editing*/ ctx[3] ? /*windowdownHandler*/ ctx[11] : "").apply(this, arguments);
        					}),
        					listen(window, "touchstart", function () {
        						if (is_function(/*editing*/ ctx[3] ? /*windowdownHandler*/ ctx[11] : "")) (/*editing*/ ctx[3] ? /*windowdownHandler*/ ctx[11] : "").apply(this, arguments);
        					}),
        					listen(window, "keydown", /*keydownHandler*/ ctx[15]),
        					listen(window, "keyup", /*keyupHandler*/ ctx[16]),
        					listen(input, "mouseenter", mouseenterHandler),
        					listen(input, "mouseleave", mouseleaveHandler),
        					listen(input, "mousedown", stop_propagation(/*mousedownHandler*/ ctx[7])),
        					listen(input, "touchstart", stop_propagation(prevent_default(/*touchstartHandler*/ ctx[6]))),
        					listen(input, "dblclick", stop_propagation(/*dblclickHandler*/ ctx[10])),
        					listen(input, "focus", /*focusHandler*/ ctx[12]),
        					listen(input, "blur", /*blurHandler*/ ctx[13]),
        					listen(input, "input", /*inputHandler*/ ctx[14]),
        					listen(input, "input", /*input_input_handler*/ ctx[39])
        				];

        				mounted = true;
        			}
        		},
        		p(new_ctx, dirty) {
        			ctx = new_ctx;

        			if (dirty[0] & /*style*/ 32) {
        				attr(input, "style", /*style*/ ctx[5]);
        			}

        			if (dirty[0] & /*$$props*/ 131072 && input_class_value !== (input_class_value = "" + (null_to_empty(/*$$props*/ ctx[17].class) + " svelte-1dc5u64"))) {
        				attr(input, "class", input_class_value);
        			}

        			if (dirty[0] & /*editing*/ 8 && input_contenteditable_value !== (input_contenteditable_value = /*editing*/ ctx[3] ? "true" : "false")) {
        				attr(input, "contenteditable", input_contenteditable_value);
        			}

        			if (dirty[0] & /*visibleValue*/ 16 && input.value !== /*visibleValue*/ ctx[4]) {
        				set_input_value(input, /*visibleValue*/ ctx[4]);
        			}

        			if (dirty[0] & /*$$props, $$props*/ 131072) {
        				toggle_class(input, "default", !/*$$props*/ ctx[17].class ? true : false);
        			}

        			if (dirty[0] & /*$$props, stepFactor*/ 131074) {
        				toggle_class(input, "fast", /*stepFactor*/ ctx[1] > 1 ? "fast" : "");
        			}

        			if (dirty[0] & /*$$props, stepFactor*/ 131074) {
        				toggle_class(input, "slow", /*stepFactor*/ ctx[1] < 1 ? "slow" : "");
        			}

        			if (dirty[0] & /*$$props, dragging*/ 131076) {
        				toggle_class(input, "dragging", /*dragging*/ ctx[2]);
        			}

        			if (dirty[0] & /*$$props, editing*/ 131080) {
        				toggle_class(input, "editing", /*editing*/ ctx[3]);
        			}
        		},
        		i: noop,
        		o: noop,
        		d(detaching) {
        			if (detaching) detach(input);
        			/*input_binding*/ ctx[40](null);
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
        	const dispatch = createEventDispatcher();
        	let { value = 0 } = $$props;
        	let { min = -Number.MAX_VALUE } = $$props;
        	let { max = Number.MAX_VALUE } = $$props;
        	let { step = 1 } = $$props;
        	let { precision = undefined } = $$props;
        	precision = precision ?? step;
        	let { decimals = 0 } = $$props;
        	let { horizontal = true } = $$props;
        	let { vertical = false } = $$props;
        	let { circular = false } = $$props;
        	let { editOnClick = false } = $$props;
        	let { mainStyle = undefined } = $$props;
        	let { fastStyle = undefined } = $$props;
        	let { slowStyle = undefined } = $$props;
        	let { focusStyle = undefined } = $$props;
        	let { draggingStyle = undefined } = $$props;
        	let { editingStyle = undefined } = $$props;
        	let { cursor = undefined } = $$props;
        	let inputElement;
        	let focussed = false;
        	let stepFactor = 1;
        	let dragging = false;
        	let clickX, clickY;
        	let hasMoved = 0;
        	let visibleValue;
        	let preciseValue;
        	let editing = false;
        	let altPressed = false;
        	let shiftPressed = false;
        	let style;
        	let isTouchDevice = false;
        	visibleValue = setValue(value);
        	preciseValue = setValue(value);
        	let htmlNode = document.querySelector("html");
        	let htmlNodeOriginalCursor = htmlNode.style.cursor;
        	let defaultCursor;

        	function touchstartHandler(e) {
        		dispatch("consoleLog", "touchstart");
        		isTouchDevice = true;
        		mousedownHandler(e);
        	}

        	function mousedownHandler(e) {
        		dispatch("consoleLog", "mousedown");

        		// console.log('down');
        		if (editing) {
        			e.stopPropagation();
        		} else {
        			hasMoved = 0;
        			clickX = isTouchDevice ? e.touches[0].clientX : e.clientX;
        			clickY = isTouchDevice ? e.touches[0].clientY : e.clientY;
        			$$invalidate(2, dragging = true);
        			preciseValue = setValue(value);
        		} //console.log(e.clientX, e.clientY);
        	}

        	function mousemoveHandler(e) {
        		// dispatch('consoleLog', 'mousemove');
        		let actX = isTouchDevice ? e.touches[0].clientX : e.clientX;

        		let actY = isTouchDevice ? e.touches[0].clientY : e.clientY;
        		let distX = horizontal ? actX - clickX : 0;
        		let distY = vertical ? -(actY - clickY) : 0;
        		let stepNum = Math.abs(distX) > Math.abs(distY) ? distX : distY;
        		stepValue(stepNum);
        		clickX = actX;
        		clickY = actY;
        		hasMoved++;
        	}

        	function mouseupHandler(e) {
        		dispatch("consoleLog", "mouseup");

        		// console.log('up');
        		$$invalidate(2, dragging = false);

        		if (editOnClick && hasMoved < 2) {
        			startEditing();
        		}
        	}

        	function dblclickHandler(e) {
        		dispatch("consoleLog", "dblclick");

        		if (!editOnClick) {
        			startEditing();
        		}
        	}

        	function windowdownHandler(e) {
        		dispatch("consoleLog", "window mousedown");

        		// console.log('window mousedown');
        		stopEditing();
        	}

        	function focusHandler(e) {
        		dispatch("consoleLog", "focus");

        		// console.log(inputElement);
        		$$invalidate(35, focussed = true);

        		stopEditing();
        	}

        	function blurHandler(e) {
        		dispatch("consoleLog", "blur");

        		// console.log('blur');
        		$$invalidate(35, focussed = false);

        		stopEditing();
        	}

        	function inputHandler(e) {
        		// console.log(e);
        		let checkValue = parseFloat(inputElement.value);

        		if (!isNaN(checkValue)) {
        			preciseValue = checkValue;
        			preciseValue = keepInRange(preciseValue);
        			dispatch("input", parseFloat(roundToPrecision(preciseValue)));
        		}
        	}

        	function keydownHandler(e) {
        		// console.log(e);
        		if (e.key == "Shift") {
        			$$invalidate(37, shiftPressed = true);
        		}

        		if (e.key == "Alt") {
        			$$invalidate(36, altPressed = true);
        		}
        	}

        	function keyupHandler(e) {
        		// console.log(e)
        		if (e.key == "Shift") {
        			$$invalidate(37, shiftPressed = false);
        		}

        		if (e.key == "Alt") {
        			$$invalidate(36, altPressed = false);
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
        		preciseValue = keepInRange(preciseValue);
        		$$invalidate(4, visibleValue = preciseValue.toFixed(decimals));
        		$$invalidate(18, value = roundToPrecision(preciseValue));
        		dispatch("input", parseFloat(value));
        		dispatch("change", parseFloat(value));
        	}

        	function stepValue(numSteps) {
        		preciseValue = preciseValue ?? parseFloat(visibleValue);
        		preciseValue += numSteps * step * stepFactor;
        		preciseValue = keepInRange(preciseValue);
        		$$invalidate(4, visibleValue = preciseValue.toFixed(decimals));
        		$$invalidate(18, value = roundToPrecision(preciseValue));
        		dispatch("input", parseFloat(value));
        		dispatch("change", parseFloat(value));
        	}

        	function keepInRange(val) {
        		$$invalidate(19, min = parseFloat(min));
        		$$invalidate(20, max = parseFloat(max));

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
        		val = Math.round(parseFloat(val) / precision) * precision;
        		let dec = precision < 1 ? Math.ceil(-Math.log10(precision)) : 0;
        		return parseFloat(val.toFixed(dec));
        	}

        	function startEditing() {
        		if (isTouchDevice) return;
        		preciseValue = parseFloat(visibleValue);
        		$$invalidate(3, editing = true);
        		inputElement?.setSelectionRange(0, 30);
        	}

        	function stopEditing() {
        		if (isTouchDevice) return;
        		$$invalidate(3, editing = false);
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
        			($$invalidate(0, inputElement), $$invalidate(3, editing));
        		});
        	}

        	$$self.$$set = $$new_props => {
        		$$invalidate(17, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
        		if ("value" in $$new_props) $$invalidate(18, value = $$new_props.value);
        		if ("min" in $$new_props) $$invalidate(19, min = $$new_props.min);
        		if ("max" in $$new_props) $$invalidate(20, max = $$new_props.max);
        		if ("step" in $$new_props) $$invalidate(22, step = $$new_props.step);
        		if ("precision" in $$new_props) $$invalidate(21, precision = $$new_props.precision);
        		if ("decimals" in $$new_props) $$invalidate(23, decimals = $$new_props.decimals);
        		if ("horizontal" in $$new_props) $$invalidate(24, horizontal = $$new_props.horizontal);
        		if ("vertical" in $$new_props) $$invalidate(25, vertical = $$new_props.vertical);
        		if ("circular" in $$new_props) $$invalidate(26, circular = $$new_props.circular);
        		if ("editOnClick" in $$new_props) $$invalidate(27, editOnClick = $$new_props.editOnClick);
        		if ("mainStyle" in $$new_props) $$invalidate(28, mainStyle = $$new_props.mainStyle);
        		if ("fastStyle" in $$new_props) $$invalidate(29, fastStyle = $$new_props.fastStyle);
        		if ("slowStyle" in $$new_props) $$invalidate(30, slowStyle = $$new_props.slowStyle);
        		if ("focusStyle" in $$new_props) $$invalidate(31, focusStyle = $$new_props.focusStyle);
        		if ("draggingStyle" in $$new_props) $$invalidate(32, draggingStyle = $$new_props.draggingStyle);
        		if ("editingStyle" in $$new_props) $$invalidate(33, editingStyle = $$new_props.editingStyle);
        		if ("cursor" in $$new_props) $$invalidate(34, cursor = $$new_props.cursor);
        	};

        	$$self.$$.update = () => {
        		if ($$self.$$.dirty[0] & /*editing, dragging, value*/ 262156) {
        			// updaters --------------------------------
        			 {
        				if (!editing && !dragging) {
        					setValue(value);
        				}
        			}
        		}

        		if ($$self.$$.dirty[0] & /*inputElement, editing*/ 9) {
        			 if (inputElement) {
        				$$invalidate(0, inputElement.readOnly = !editing, inputElement);
        			}
        		}

        		if ($$self.$$.dirty[0] & /*editing*/ 8 | $$self.$$.dirty[1] & /*focussed, altPressed, shiftPressed*/ 112) {
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

        		if ($$self.$$.dirty[0] & /*horizontal, vertical, dragging*/ 50331652 | $$self.$$.dirty[1] & /*cursor, defaultCursor*/ 136) {
        			 {
        				// let cursorClass = horizontal
        				//   ? vertical
        				//     ? 'move-cursor'
        				//     : 'horizontal-cursor'
        				//   : 'vertical-cursor';
        				$$invalidate(38, defaultCursor = horizontal
        				? vertical ? "move" : "ew-resize"
        				: "ns-resize");

        				if (dragging) {
        					htmlNode.style.cursor = cursor ?? defaultCursor;
        				} else {
        					htmlNode.style.cursor = htmlNodeOriginalCursor; // addClass(htmlNode, cursorClass);
        				} // removeClass(htmlNode, cursorClass);
        			}
        		}

        		if ($$self.$$.dirty[0] & /*mainStyle, style, editing, stepFactor, fastStyle, slowStyle, dragging*/ 1879048238 | $$self.$$.dirty[1] & /*focussed, focusStyle, draggingStyle, editingStyle, cursor, defaultCursor*/ 159) {
        			 {
        				$$invalidate(5, style = mainStyle ?? "");
        				$$invalidate(5, style += focussed && focusStyle ? ";" + focusStyle : "");

        				$$invalidate(5, style += !editing && stepFactor > 1 && fastStyle
        				? ";" + fastStyle
        				: "");

        				$$invalidate(5, style += !editing && stepFactor < 1 && slowStyle
        				? ";" + slowStyle
        				: "");

        				$$invalidate(5, style += dragging && draggingStyle ? ";" + draggingStyle : "");
        				$$invalidate(5, style += editing && editingStyle ? ";" + editingStyle : "");
        				$$invalidate(5, style += !editing ? ";cursor:" + (cursor ?? defaultCursor) : "");
        			}
        		}
        	};

        	$$props = exclude_internal_props($$props);

        	return [
        		inputElement,
        		stepFactor,
        		dragging,
        		editing,
        		visibleValue,
        		style,
        		touchstartHandler,
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
        		precision,
        		step,
        		decimals,
        		horizontal,
        		vertical,
        		circular,
        		editOnClick,
        		mainStyle,
        		fastStyle,
        		slowStyle,
        		focusStyle,
        		draggingStyle,
        		editingStyle,
        		cursor,
        		focussed,
        		altPressed,
        		shiftPressed,
        		defaultCursor,
        		input_input_handler,
        		input_binding
        	];
        }

        class NumberSpinner extends SvelteComponent {
        	constructor(options) {
        		super();
        		if (!document_1.getElementById("svelte-1dc5u64-style")) add_css();

        		init(
        			this,
        			options,
        			instance,
        			create_fragment,
        			safe_not_equal,
        			{
        				value: 18,
        				min: 19,
        				max: 20,
        				step: 22,
        				precision: 21,
        				decimals: 23,
        				horizontal: 24,
        				vertical: 25,
        				circular: 26,
        				editOnClick: 27,
        				mainStyle: 28,
        				fastStyle: 29,
        				slowStyle: 30,
        				focusStyle: 31,
        				draggingStyle: 32,
        				editingStyle: 33,
        				cursor: 34
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
    	let t7;
    	let hr0;
    	let t8;
    	let div2;
    	let div0;
    	let t9;
    	let br0;
    	let t10;
    	let t11;
    	let t12;
    	let div1;
    	let numberspinner0;
    	let updating_value;
    	let t13;
    	let hr1;
    	let t14;
    	let div5;
    	let div3;
    	let t15;
    	let br1;
    	let t16;
    	let t17;
    	let t18;
    	let div4;
    	let numberspinner1;
    	let updating_value_1;
    	let t19;
    	let hr2;
    	let t20;
    	let div8;
    	let div6;
    	let t21;
    	let br2;
    	let t22;
    	let t23;
    	let t24;
    	let div7;
    	let numberspinner2;
    	let updating_value_2;
    	let t25;
    	let hr3;
    	let t26;
    	let div11;
    	let div9;
    	let t27;
    	let br3;
    	let t28;
    	let t29;
    	let t30;
    	let div10;
    	let numberspinner3;
    	let updating_value_3;
    	let t31;
    	let hr4;
    	let t32;
    	let div14;
    	let div12;
    	let t33;
    	let br4;
    	let t34;
    	let t35;
    	let t36;
    	let div13;
    	let numberspinner4;
    	let updating_value_4;
    	let t37;
    	let hr5;
    	let t38;
    	let div17;
    	let div15;
    	let t39;
    	let br5;
    	let t40;
    	let t41;
    	let br6;
    	let t42;
    	let t43;
    	let t44;
    	let div16;
    	let numberspinner5;
    	let t45;
    	let hr6;
    	let t46;
    	let div22;
    	let div18;
    	let t47;
    	let br7;
    	let t48;
    	let t49;
    	let br8;
    	let t50;
    	let div19;
    	let button0;
    	let t52;
    	let div20;
    	let numberspinner6;
    	let updating_value_5;
    	let t53;
    	let div21;
    	let button1;
    	let t55;
    	let hr7;
    	let current;
    	let mounted;
    	let dispose;

    	function numberspinner0_value_binding(value) {
    		/*numberspinner0_value_binding*/ ctx[8].call(null, value);
    	}

    	let numberspinner0_props = {};

    	if (/*value1*/ ctx[0] !== void 0) {
    		numberspinner0_props.value = /*value1*/ ctx[0];
    	}

    	numberspinner0 = new dist({ props: numberspinner0_props });
    	binding_callbacks.push(() => bind(numberspinner0, "value", numberspinner0_value_binding));

    	function numberspinner1_value_binding(value) {
    		/*numberspinner1_value_binding*/ ctx[9].call(null, value);
    	}

    	let numberspinner1_props = {
    		min: "0",
    		max: "360",
    		vertical: true,
    		circular: true
    	};

    	if (/*value2*/ ctx[1] !== void 0) {
    		numberspinner1_props.value = /*value2*/ ctx[1];
    	}

    	numberspinner1 = new dist({ props: numberspinner1_props });
    	binding_callbacks.push(() => bind(numberspinner1, "value", numberspinner1_value_binding));

    	function numberspinner2_value_binding(value) {
    		/*numberspinner2_value_binding*/ ctx[10].call(null, value);
    	}

    	let numberspinner2_props = {
    		min: "-5",
    		max: "5",
    		step: "0.01",
    		decimals: "2",
    		precision: "0.001",
    		editOnClick: true
    	};

    	if (/*value3*/ ctx[2] !== void 0) {
    		numberspinner2_props.value = /*value3*/ ctx[2];
    	}

    	numberspinner2 = new dist({ props: numberspinner2_props });
    	binding_callbacks.push(() => bind(numberspinner2, "value", numberspinner2_value_binding));

    	function numberspinner3_value_binding(value) {
    		/*numberspinner3_value_binding*/ ctx[11].call(null, value);
    	}

    	let numberspinner3_props = {
    		step: "10",
    		mainStyle: "color:#aaa; width:80px; border-radius:20px",
    		focusStyle: "color:#06f",
    		draggingStyle: "border-color:#f00",
    		editingStyle: "color:#00f; background-color:#06f4",
    		fastStyle: "color:#f00",
    		slowStyle: "color:#0c0",
    		cursor: "url(customcursor.png) 16 16, auto"
    	};

    	if (/*value4*/ ctx[3] !== void 0) {
    		numberspinner3_props.value = /*value4*/ ctx[3];
    	}

    	numberspinner3 = new dist({ props: numberspinner3_props });
    	binding_callbacks.push(() => bind(numberspinner3, "value", numberspinner3_value_binding));

    	function numberspinner4_value_binding(value) {
    		/*numberspinner4_value_binding*/ ctx[12].call(null, value);
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

    	numberspinner5.$on("change", /*change_handler*/ ctx[13]);
    	numberspinner5.$on("input", /*input_handler*/ ctx[14]);

    	function numberspinner6_value_binding(value) {
    		/*numberspinner6_value_binding*/ ctx[16].call(null, value);
    	}

    	let numberspinner6_props = { min: "0" };

    	if (/*value7*/ ctx[7] !== void 0) {
    		numberspinner6_props.value = /*value7*/ ctx[7];
    	}

    	numberspinner6 = new dist({ props: numberspinner6_props });
    	binding_callbacks.push(() => bind(numberspinner6, "value", numberspinner6_value_binding));

    	return {
    		c() {
    			h2 = element("h2");
    			h2.textContent = "Svelte Number Spinner Example";
    			t1 = space();
    			p = element("p");
    			p.innerHTML = `Change the values of the number spinners through mousedrag and arrow keys. Press <i>Alt</i> for smaller steps, <i>Alt+Shift</i> for larger steps. Double click to edit.`;
    			t7 = space();
    			hr0 = element("hr");
    			t8 = space();
    			div2 = element("div");
    			div0 = element("div");
    			t9 = text("Default: no range limits, step = 1");
    			br0 = element("br");
    			t10 = text("Current value is ");
    			t11 = text(/*value1*/ ctx[0]);
    			t12 = space();
    			div1 = element("div");
    			create_component(numberspinner0.$$.fragment);
    			t13 = space();
    			hr1 = element("hr");
    			t14 = space();
    			div5 = element("div");
    			div3 = element("div");
    			t15 = text("Range: 0 - 360, vertical = true (dragging and arrow keys up/down will also change the value), circular = true ");
    			br1 = element("br");
    			t16 = text("Current value is ");
    			t17 = text(/*value2*/ ctx[1]);
    			t18 = space();
    			div4 = element("div");
    			create_component(numberspinner1.$$.fragment);
    			t19 = space();
    			hr2 = element("hr");
    			t20 = space();
    			div8 = element("div");
    			div6 = element("div");
    			t21 = text("step = 0.01, decimals = 2, precision = 0.001, editOnClick = true");
    			br2 = element("br");
    			t22 = text("Current value is ");
    			t23 = text(/*value3*/ ctx[2]);
    			t24 = space();
    			div7 = element("div");
    			create_component(numberspinner2.$$.fragment);
    			t25 = space();
    			hr3 = element("hr");
    			t26 = space();
    			div11 = element("div");
    			div9 = element("div");
    			t27 = text("Individual styling using props.");
    			br3 = element("br");
    			t28 = text("Current value is ");
    			t29 = text(/*value4*/ ctx[3]);
    			t30 = space();
    			div10 = element("div");
    			create_component(numberspinner3.$$.fragment);
    			t31 = space();
    			hr4 = element("hr");
    			t32 = space();
    			div14 = element("div");
    			div12 = element("div");
    			t33 = text("Individual styling using custom class.");
    			br4 = element("br");
    			t34 = text("Current value is ");
    			t35 = text(/*value5*/ ctx[4]);
    			t36 = space();
    			div13 = element("div");
    			create_component(numberspinner4.$$.fragment);
    			t37 = space();
    			hr5 = element("hr");
    			t38 = space();
    			div17 = element("div");
    			div15 = element("div");
    			t39 = text("Get value through input and change events.");
    			br5 = element("br");
    			t40 = text("\n    Current input value is ");
    			t41 = text(/*value6input*/ ctx[5]);
    			br6 = element("br");
    			t42 = text(" \n    Current change value is ");
    			t43 = text(/*value6change*/ ctx[6]);
    			t44 = space();
    			div16 = element("div");
    			create_component(numberspinner5.$$.fragment);
    			t45 = space();
    			hr6 = element("hr");
    			t46 = space();
    			div22 = element("div");
    			div18 = element("div");
    			t47 = text("Test correct updating of the value if changed from outside.");
    			br7 = element("br");
    			t48 = text("\n    Current input value is ");
    			t49 = text(/*value7*/ ctx[7]);
    			br8 = element("br");
    			t50 = space();
    			div19 = element("div");
    			button0 = element("button");
    			button0.textContent = "–";
    			t52 = space();
    			div20 = element("div");
    			create_component(numberspinner6.$$.fragment);
    			t53 = space();
    			div21 = element("div");
    			button1 = element("button");
    			button1.textContent = "+";
    			t55 = space();
    			hr7 = element("hr");
    			attr(hr0, "class", "svelte-nyfz93");
    			attr(div0, "class", "explanation svelte-nyfz93");
    			attr(div1, "class", "right svelte-nyfz93");
    			attr(div2, "class", "row svelte-nyfz93");
    			attr(hr1, "class", "svelte-nyfz93");
    			attr(div3, "class", "explanation svelte-nyfz93");
    			attr(div4, "class", "right svelte-nyfz93");
    			attr(div5, "class", "row svelte-nyfz93");
    			attr(hr2, "class", "svelte-nyfz93");
    			attr(div6, "class", "explanation svelte-nyfz93");
    			attr(div7, "class", "right svelte-nyfz93");
    			attr(div8, "class", "row svelte-nyfz93");
    			attr(hr3, "class", "svelte-nyfz93");
    			attr(div9, "class", "explanation svelte-nyfz93");
    			attr(div10, "class", "right svelte-nyfz93");
    			attr(div11, "class", "row svelte-nyfz93");
    			attr(hr4, "class", "svelte-nyfz93");
    			attr(div12, "class", "explanation svelte-nyfz93");
    			attr(div13, "class", "right svelte-nyfz93");
    			attr(div14, "class", "row svelte-nyfz93");
    			attr(hr5, "class", "svelte-nyfz93");
    			attr(div15, "class", "explanation svelte-nyfz93");
    			attr(div16, "class", "right svelte-nyfz93");
    			attr(div17, "class", "row svelte-nyfz93");
    			attr(hr6, "class", "svelte-nyfz93");
    			attr(div18, "class", "explanation svelte-nyfz93");
    			attr(button0, "class", "svelte-nyfz93");
    			attr(div19, "class", "svelte-nyfz93");
    			attr(div20, "class", "right small-margin svelte-nyfz93");
    			attr(button1, "class", "svelte-nyfz93");
    			attr(div21, "class", "svelte-nyfz93");
    			attr(div22, "class", "row svelte-nyfz93");
    			attr(hr7, "class", "svelte-nyfz93");
    		},
    		m(target, anchor) {
    			insert(target, h2, anchor);
    			insert(target, t1, anchor);
    			insert(target, p, anchor);
    			insert(target, t7, anchor);
    			insert(target, hr0, anchor);
    			insert(target, t8, anchor);
    			insert(target, div2, anchor);
    			append(div2, div0);
    			append(div0, t9);
    			append(div0, br0);
    			append(div0, t10);
    			append(div0, t11);
    			append(div2, t12);
    			append(div2, div1);
    			mount_component(numberspinner0, div1, null);
    			insert(target, t13, anchor);
    			insert(target, hr1, anchor);
    			insert(target, t14, anchor);
    			insert(target, div5, anchor);
    			append(div5, div3);
    			append(div3, t15);
    			append(div3, br1);
    			append(div3, t16);
    			append(div3, t17);
    			append(div5, t18);
    			append(div5, div4);
    			mount_component(numberspinner1, div4, null);
    			insert(target, t19, anchor);
    			insert(target, hr2, anchor);
    			insert(target, t20, anchor);
    			insert(target, div8, anchor);
    			append(div8, div6);
    			append(div6, t21);
    			append(div6, br2);
    			append(div6, t22);
    			append(div6, t23);
    			append(div8, t24);
    			append(div8, div7);
    			mount_component(numberspinner2, div7, null);
    			insert(target, t25, anchor);
    			insert(target, hr3, anchor);
    			insert(target, t26, anchor);
    			insert(target, div11, anchor);
    			append(div11, div9);
    			append(div9, t27);
    			append(div9, br3);
    			append(div9, t28);
    			append(div9, t29);
    			append(div11, t30);
    			append(div11, div10);
    			mount_component(numberspinner3, div10, null);
    			insert(target, t31, anchor);
    			insert(target, hr4, anchor);
    			insert(target, t32, anchor);
    			insert(target, div14, anchor);
    			append(div14, div12);
    			append(div12, t33);
    			append(div12, br4);
    			append(div12, t34);
    			append(div12, t35);
    			append(div14, t36);
    			append(div14, div13);
    			mount_component(numberspinner4, div13, null);
    			insert(target, t37, anchor);
    			insert(target, hr5, anchor);
    			insert(target, t38, anchor);
    			insert(target, div17, anchor);
    			append(div17, div15);
    			append(div15, t39);
    			append(div15, br5);
    			append(div15, t40);
    			append(div15, t41);
    			append(div15, br6);
    			append(div15, t42);
    			append(div15, t43);
    			append(div17, t44);
    			append(div17, div16);
    			mount_component(numberspinner5, div16, null);
    			insert(target, t45, anchor);
    			insert(target, hr6, anchor);
    			insert(target, t46, anchor);
    			insert(target, div22, anchor);
    			append(div22, div18);
    			append(div18, t47);
    			append(div18, br7);
    			append(div18, t48);
    			append(div18, t49);
    			append(div18, br8);
    			append(div22, t50);
    			append(div22, div19);
    			append(div19, button0);
    			append(div22, t52);
    			append(div22, div20);
    			mount_component(numberspinner6, div20, null);
    			append(div22, t53);
    			append(div22, div21);
    			append(div21, button1);
    			insert(target, t55, anchor);
    			insert(target, hr7, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(button0, "click", /*click_handler*/ ctx[15]),
    					listen(button1, "click", /*click_handler_1*/ ctx[17])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (!current || dirty & /*value1*/ 1) set_data(t11, /*value1*/ ctx[0]);
    			const numberspinner0_changes = {};

    			if (!updating_value && dirty & /*value1*/ 1) {
    				updating_value = true;
    				numberspinner0_changes.value = /*value1*/ ctx[0];
    				add_flush_callback(() => updating_value = false);
    			}

    			numberspinner0.$set(numberspinner0_changes);
    			if (!current || dirty & /*value2*/ 2) set_data(t17, /*value2*/ ctx[1]);
    			const numberspinner1_changes = {};

    			if (!updating_value_1 && dirty & /*value2*/ 2) {
    				updating_value_1 = true;
    				numberspinner1_changes.value = /*value2*/ ctx[1];
    				add_flush_callback(() => updating_value_1 = false);
    			}

    			numberspinner1.$set(numberspinner1_changes);
    			if (!current || dirty & /*value3*/ 4) set_data(t23, /*value3*/ ctx[2]);
    			const numberspinner2_changes = {};

    			if (!updating_value_2 && dirty & /*value3*/ 4) {
    				updating_value_2 = true;
    				numberspinner2_changes.value = /*value3*/ ctx[2];
    				add_flush_callback(() => updating_value_2 = false);
    			}

    			numberspinner2.$set(numberspinner2_changes);
    			if (!current || dirty & /*value4*/ 8) set_data(t29, /*value4*/ ctx[3]);
    			const numberspinner3_changes = {};

    			if (!updating_value_3 && dirty & /*value4*/ 8) {
    				updating_value_3 = true;
    				numberspinner3_changes.value = /*value4*/ ctx[3];
    				add_flush_callback(() => updating_value_3 = false);
    			}

    			numberspinner3.$set(numberspinner3_changes);
    			if (!current || dirty & /*value5*/ 16) set_data(t35, /*value5*/ ctx[4]);
    			const numberspinner4_changes = {};

    			if (!updating_value_4 && dirty & /*value5*/ 16) {
    				updating_value_4 = true;
    				numberspinner4_changes.value = /*value5*/ ctx[4];
    				add_flush_callback(() => updating_value_4 = false);
    			}

    			numberspinner4.$set(numberspinner4_changes);
    			if (!current || dirty & /*value6input*/ 32) set_data(t41, /*value6input*/ ctx[5]);
    			if (!current || dirty & /*value6change*/ 64) set_data(t43, /*value6change*/ ctx[6]);
    			if (!current || dirty & /*value7*/ 128) set_data(t49, /*value7*/ ctx[7]);
    			const numberspinner6_changes = {};

    			if (!updating_value_5 && dirty & /*value7*/ 128) {
    				updating_value_5 = true;
    				numberspinner6_changes.value = /*value7*/ ctx[7];
    				add_flush_callback(() => updating_value_5 = false);
    			}

    			numberspinner6.$set(numberspinner6_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(numberspinner0.$$.fragment, local);
    			transition_in(numberspinner1.$$.fragment, local);
    			transition_in(numberspinner2.$$.fragment, local);
    			transition_in(numberspinner3.$$.fragment, local);
    			transition_in(numberspinner4.$$.fragment, local);
    			transition_in(numberspinner5.$$.fragment, local);
    			transition_in(numberspinner6.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(numberspinner0.$$.fragment, local);
    			transition_out(numberspinner1.$$.fragment, local);
    			transition_out(numberspinner2.$$.fragment, local);
    			transition_out(numberspinner3.$$.fragment, local);
    			transition_out(numberspinner4.$$.fragment, local);
    			transition_out(numberspinner5.$$.fragment, local);
    			transition_out(numberspinner6.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(h2);
    			if (detaching) detach(t1);
    			if (detaching) detach(p);
    			if (detaching) detach(t7);
    			if (detaching) detach(hr0);
    			if (detaching) detach(t8);
    			if (detaching) detach(div2);
    			destroy_component(numberspinner0);
    			if (detaching) detach(t13);
    			if (detaching) detach(hr1);
    			if (detaching) detach(t14);
    			if (detaching) detach(div5);
    			destroy_component(numberspinner1);
    			if (detaching) detach(t19);
    			if (detaching) detach(hr2);
    			if (detaching) detach(t20);
    			if (detaching) detach(div8);
    			destroy_component(numberspinner2);
    			if (detaching) detach(t25);
    			if (detaching) detach(hr3);
    			if (detaching) detach(t26);
    			if (detaching) detach(div11);
    			destroy_component(numberspinner3);
    			if (detaching) detach(t31);
    			if (detaching) detach(hr4);
    			if (detaching) detach(t32);
    			if (detaching) detach(div14);
    			destroy_component(numberspinner4);
    			if (detaching) detach(t37);
    			if (detaching) detach(hr5);
    			if (detaching) detach(t38);
    			if (detaching) detach(div17);
    			destroy_component(numberspinner5);
    			if (detaching) detach(t45);
    			if (detaching) detach(hr6);
    			if (detaching) detach(t46);
    			if (detaching) detach(div22);
    			destroy_component(numberspinner6);
    			if (detaching) detach(t55);
    			if (detaching) detach(hr7);
    			mounted = false;
    			run_all(dispose);
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
    	let value7 = 0;

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

    	const click_handler = () => {
    		$$invalidate(7, value7--, value7);
    	};

    	function numberspinner6_value_binding(value) {
    		value7 = value;
    		$$invalidate(7, value7);
    	}

    	const click_handler_1 = () => {
    		$$invalidate(7, value7++, value7);
    	};

    	return [
    		value1,
    		value2,
    		value3,
    		value4,
    		value5,
    		value6input,
    		value6change,
    		value7,
    		numberspinner0_value_binding,
    		numberspinner1_value_binding,
    		numberspinner2_value_binding,
    		numberspinner3_value_binding,
    		numberspinner4_value_binding,
    		change_handler,
    		input_handler,
    		click_handler,
    		numberspinner6_value_binding,
    		click_handler_1
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
