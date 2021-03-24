
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

        const { window: window_1 } = globals;

        function add_css() {
        	var style = element("style");
        	style.id = "svelte-1fd4zek-style";
        	style.textContent = ".default.svelte-1fd4zek{display:inline-block;box-sizing:border-box;font-variant-numeric:tabular-nums;background-color:white;color:black;width:60px;height:25px;margin:0px;padding:5px;border:1px solid #0004;border-radius:5px;text-align:right;cursor:initial}.default.svelte-1fd4zek:focus{border:1px solid #06f;outline:none}.default.fast.svelte-1fd4zek{color:tomato}.default.slow.svelte-1fd4zek{color:green}.default.editing.svelte-1fd4zek{border:2px solid #06f;padding:4px;cursor:default}input.svelte-1fd4zek{user-select:none}input.svelte-1fd4zek:not(.editing)::selection{background:#0000}input.editing.svelte-1fd4zek{user-select:text}";
        	append(document.head, style);
        }

        function create_fragment(ctx) {
        	let input;
        	let input_class_value;
        	let mounted;
        	let dispose;

        	return {
        		c() {
        			input = element("input");
        			attr(input, "type", "text");
        			attr(input, "style", /*style*/ ctx[5]);
        			attr(input, "class", input_class_value = "" + (null_to_empty(/*$$props*/ ctx[16].class) + " svelte-1fd4zek"));
        			attr(input, "tabindex", "0");
        			toggle_class(input, "default", !/*$$props*/ ctx[16].class ? true : false);
        			toggle_class(input, "fast", /*stepFactor*/ ctx[1] > 1 ? "fast" : "");
        			toggle_class(input, "slow", /*stepFactor*/ ctx[1] < 1 ? "slow" : "");
        			toggle_class(input, "editing", /*editing*/ ctx[3]);
        		},
        		m(target, anchor) {
        			insert(target, input, anchor);
        			set_input_value(input, /*visibleValue*/ ctx[4]);
        			/*input_binding*/ ctx[33](input);

        			if (!mounted) {
        				dispose = [
        					listen(window_1, "mousemove", function () {
        						if (is_function(/*dragging*/ ctx[2] ? /*mousemoveHandler*/ ctx[8] : "")) (/*dragging*/ ctx[2] ? /*mousemoveHandler*/ ctx[8] : "").apply(this, arguments);
        					}),
        					listen(window_1, "touchmove", function () {
        						if (is_function(/*dragging*/ ctx[2] ? /*mousemoveHandler*/ ctx[8] : "")) (/*dragging*/ ctx[2] ? /*mousemoveHandler*/ ctx[8] : "").apply(this, arguments);
        					}),
        					listen(window_1, "mouseup", function () {
        						if (is_function(/*dragging*/ ctx[2] ? /*mouseupHandler*/ ctx[9] : "")) (/*dragging*/ ctx[2] ? /*mouseupHandler*/ ctx[9] : "").apply(this, arguments);
        					}),
        					listen(window_1, "touchend", function () {
        						if (is_function(/*dragging*/ ctx[2] ? /*mouseupHandler*/ ctx[9] : "")) (/*dragging*/ ctx[2] ? /*mouseupHandler*/ ctx[9] : "").apply(this, arguments);
        					}),
        					listen(window_1, "mousedown", function () {
        						if (is_function(/*editing*/ ctx[3] ? /*windowdownHandler*/ ctx[10] : "")) (/*editing*/ ctx[3] ? /*windowdownHandler*/ ctx[10] : "").apply(this, arguments);
        					}),
        					listen(window_1, "touchstart", function () {
        						if (is_function(/*editing*/ ctx[3] ? /*windowdownHandler*/ ctx[10] : "")) (/*editing*/ ctx[3] ? /*windowdownHandler*/ ctx[10] : "").apply(this, arguments);
        					}),
        					listen(window_1, "keydown", /*keydownHandler*/ ctx[14]),
        					listen(window_1, "keyup", /*keyupHandler*/ ctx[15]),
        					listen(input, "mousedown", stop_propagation(/*mousedownHandler*/ ctx[6])),
        					listen(input, "touchstart", stop_propagation(/*touchstartHandler*/ ctx[7])),
        					listen(input, "dblclick", stop_propagation(dblclickHandler)),
        					listen(input, "focus", /*focusHandler*/ ctx[11]),
        					listen(input, "blur", /*blurHandler*/ ctx[12]),
        					listen(input, "input", /*inputHandler*/ ctx[13]),
        					listen(input, "input", /*input_input_handler*/ ctx[32])
        				];

        				mounted = true;
        			}
        		},
        		p(new_ctx, dirty) {
        			ctx = new_ctx;

        			if (dirty[0] & /*style*/ 32) {
        				attr(input, "style", /*style*/ ctx[5]);
        			}

        			if (dirty[0] & /*$$props*/ 65536 && input_class_value !== (input_class_value = "" + (null_to_empty(/*$$props*/ ctx[16].class) + " svelte-1fd4zek"))) {
        				attr(input, "class", input_class_value);
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

        			if (dirty[0] & /*$$props, editing*/ 65544) {
        				toggle_class(input, "editing", /*editing*/ ctx[3]);
        			}
        		},
        		i: noop,
        		o: noop,
        		d(detaching) {
        			if (detaching) detach(input);
        			/*input_binding*/ ctx[33](null);
        			mounted = false;
        			run_all(dispose);
        		}
        	};
        }

        async function dblclickHandler(e) {
        	
        } // dispatch('consoleLog', e.type);
        // startEditing();

        function instance($$self, $$props, $$invalidate) {
        	let { value = 0 } = $$props;
        	let { min = -Number.MAX_VALUE } = $$props;
        	let { max = Number.MAX_VALUE } = $$props;
        	let { step = 1 } = $$props;
        	let { decimals = 0 } = $$props;
        	let { horizontal = true } = $$props;
        	let { vertical = true } = $$props;
        	let { mainStyle = undefined } = $$props;
        	let { fastStyle = undefined } = $$props;
        	let { slowStyle = undefined } = $$props;
        	let { focusStyle = undefined } = $$props;
        	let { editingStyle = undefined } = $$props;
        	const dispatch = createEventDispatcher();
        	let inputElement;
        	let focussed = false;
        	let stepFactor = 1;
        	let dragging = false;
        	let hasMoved = 0;
        	let clickX, clickY;
        	let visibleValue;
        	let preciseValue;
        	let editing = false;
        	let altPressed = false;
        	let shiftPressed = false;
        	let style;
        	let isTouchdevice = false;
        	let codeTriggeredBlur = false;
        	let codeTriggeredTouchstart = false;
        	visibleValue = setValue(value);
        	preciseValue = setValue(value);

        	// handlers --------------------------------
        	function mousedownHandler(e) {
        		if (e.type == "mousedown" && isTouchdevice) return;
        		dispatch("consoleLog", e.type);
        		console.log(e);

        		if (editing) {
        			e.stopPropagation();
        		} else {
        			clickX = e.clientX;
        			clickY = e.clientY;
        			$$invalidate(2, dragging = true);
        			hasMoved = 0;
        			preciseValue = setValue(value);
        		} //console.log(e.clientX, e.clientY);
        	}

        	function touchstartHandler(e) {
        		dispatch("consoleLog", e.type);

        		if (!codeTriggeredTouchstart) {
        			isTouchdevice = true;

        			if (editing) {
        				e.stopPropagation();
        			} else {
        				if (!focussed) inputElement?.focus();
        				clickX = e.touches[0].clientX;
        				clickY = e.touches[0].clientY;
        				$$invalidate(2, dragging = true);
        				hasMoved = 0;
        				preciseValue = setValue(value);
        			} //console.log(e.clientX, e.clientY);
        		}
        	}

        	function mousemoveHandler(e) {
        		if (e.type == "mousemove" && isTouchdevice) return;

        		// dispatch('consoleLog', e.type);
        		hasMoved++;

        		let actX, actY;

        		if (e.type == "touchmove") {
        			actX = e.touches[0].clientX;
        			actY = e.touches[0].clientY;
        		} else {
        			actX = e.clientX;
        			actY = e.clientY;
        		}

        		let distX = horizontal ? actX - clickX : 0;
        		let distY = vertical ? -(actY - clickY) : 0;
        		let stepNum = Math.abs(distX) > Math.abs(distY) ? distX : distY;
        		stepValue(stepNum);
        		clickX = actX;
        		clickY = actY;
        	}

        	function mouseupHandler(e) {
        		if (e.type == "mouseup" && isTouchdevice) return;
        		dispatch("consoleLog", e.type);

        		// console.log('up');
        		$$invalidate(2, dragging = false);

        		$$invalidate(1, stepFactor = 1);
        		if (hasMoved < 2) startEditing();
        	}

        	function windowdownHandler(e) {
        		dispatch("consoleLog", "window mousedown");

        		// console.log('window mousedown');
        		stopEditing();
        	}

        	function focusHandler(e) {
        		dispatch("consoleLog", e.type);

        		// console.log(inputElement);
        		if (!codeTriggeredTouchstart) {
        			$$invalidate(29, focussed = true);
        			stopEditing();
        			codeTriggeredTouchstart = false;
        		}
        	}

        	function blurHandler(e) {
        		dispatch("consoleLog", e.type);

        		// console.log('blur');
        		if (!codeTriggeredBlur) {
        			$$invalidate(29, focussed = false);
        			stopEditing();
        			codeTriggeredBlur = false;
        		}
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
        		dispatch("consoleLog", e.type + " " + e.key);

        		// console.log(e);
        		if (e.key == "Shift") {
        			$$invalidate(31, shiftPressed = true);
        		}

        		if (e.key == "Alt") {
        			$$invalidate(30, altPressed = true);
        		}
        	}

        	function keyupHandler(e) {
        		dispatch("consoleLog", e.type + " " + e.key);

        		// console.log(e)
        		if (e.key == "Shift") {
        			$$invalidate(31, shiftPressed = false);
        		}

        		if (e.key == "Alt") {
        			$$invalidate(30, altPressed = false);
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
        		dispatch("consoleLog", "start editing");
        		$$invalidate(3, editing = true);
        		$$invalidate(0, inputElement.readOnly = false, inputElement);
        		$$invalidate(0, inputElement.contentEditable = true, inputElement);

        		if (isTouchdevice) {
        			codeTriggeredBlur = true;
        			inputElement.blur();
        			codeTriggeredTouchstart = true;

        			var evt = new MouseEvent("touchstart",
        			{
        					view: window,
        					bubbles: true,
        					cancelable: true,
        					clientX: 0,
        					clientY: 0
        				}); /* whatever properties you want to give it */

        			inputElement.dispatchEvent(evt);
        		}

        		preciseValue = parseFloat(visibleValue);
        		inputElement?.setSelectionRange(0, 30);
        	}

        	function stopEditing() {
        		dispatch("consoleLog", "stop editing");
        		$$invalidate(3, editing = false);
        		$$invalidate(0, inputElement.readOnly = true, inputElement);
        		$$invalidate(0, inputElement.contentEditable = false, inputElement);
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
        		$$invalidate(16, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
        		if ("value" in $$new_props) $$invalidate(17, value = $$new_props.value);
        		if ("min" in $$new_props) $$invalidate(18, min = $$new_props.min);
        		if ("max" in $$new_props) $$invalidate(19, max = $$new_props.max);
        		if ("step" in $$new_props) $$invalidate(20, step = $$new_props.step);
        		if ("decimals" in $$new_props) $$invalidate(21, decimals = $$new_props.decimals);
        		if ("horizontal" in $$new_props) $$invalidate(22, horizontal = $$new_props.horizontal);
        		if ("vertical" in $$new_props) $$invalidate(23, vertical = $$new_props.vertical);
        		if ("mainStyle" in $$new_props) $$invalidate(24, mainStyle = $$new_props.mainStyle);
        		if ("fastStyle" in $$new_props) $$invalidate(25, fastStyle = $$new_props.fastStyle);
        		if ("slowStyle" in $$new_props) $$invalidate(26, slowStyle = $$new_props.slowStyle);
        		if ("focusStyle" in $$new_props) $$invalidate(27, focusStyle = $$new_props.focusStyle);
        		if ("editingStyle" in $$new_props) $$invalidate(28, editingStyle = $$new_props.editingStyle);
        	};

        	$$self.$$.update = () => {
        		if ($$self.$$.dirty[0] & /*editing, dragging, value*/ 131084) {
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
        				$$invalidate(0, inputElement.contentEditable = editing, inputElement);
        			} // inputElement.readOnly = false;
        			// inputElement.contentEditable = true;
        		}

        		if ($$self.$$.dirty[0] & /*focussed, editing, altPressed*/ 1610612744 | $$self.$$.dirty[1] & /*shiftPressed*/ 1) {
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

        		if ($$self.$$.dirty[0] & /*mainStyle, style, focussed, focusStyle, editing, stepFactor, fastStyle, slowStyle, editingStyle*/ 1056964650) {
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
        		dragging,
        		editing,
        		visibleValue,
        		style,
        		mousedownHandler,
        		touchstartHandler,
        		mousemoveHandler,
        		mouseupHandler,
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
        		if (!document.getElementById("svelte-1fd4zek-style")) add_css();

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
        				horizontal: 22,
        				vertical: 23,
        				mainStyle: 24,
        				fastStyle: 25,
        				slowStyle: 26,
        				focusStyle: 27,
        				editingStyle: 28
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
    	let h2;
    	let t1;
    	let p;
    	let t2;
    	let i0;
    	let t4;
    	let i1;
    	let t6;
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
    		/*numberspinner0_value_binding*/ ctx[9].call(null, value);
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
    		/*numberspinner1_value_binding*/ ctx[10].call(null, value);
    	}

    	let numberspinner1_props = { min: "0", max: "1000", vertical: false };

    	if (/*value2*/ ctx[1] !== void 0) {
    		numberspinner1_props.value = /*value2*/ ctx[1];
    	}

    	numberspinner1 = new dist({
    			props: numberspinner1_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(numberspinner1, "value", numberspinner1_value_binding));

    	function numberspinner2_value_binding(value) {
    		/*numberspinner2_value_binding*/ ctx[11].call(null, value);
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
    		/*numberspinner3_value_binding*/ ctx[12].call(null, value);
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

    	numberspinner3 = new dist({
    			props: numberspinner3_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(numberspinner3, "value", numberspinner3_value_binding));

    	function numberspinner4_value_binding(value) {
    		/*numberspinner4_value_binding*/ ctx[13].call(null, value);
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

    	numberspinner4 = new dist({
    			props: numberspinner4_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(numberspinner4, "value", numberspinner4_value_binding));

    	numberspinner5 = new dist({
    			props: {
    				value: /*value6*/ ctx[8],
    				min: "0",
    				max: "100"
    			},
    			$$inline: true
    		});

    	numberspinner5.$on("change", /*change_handler*/ ctx[14]);
    	numberspinner5.$on("input", /*input_handler*/ ctx[15]);

    	function numberspinner6_value_binding(value) {
    		/*numberspinner6_value_binding*/ ctx[17].call(null, value);
    	}

    	let numberspinner6_props = { min: "0" };

    	if (/*value7*/ ctx[7] !== void 0) {
    		numberspinner6_props.value = /*value7*/ ctx[7];
    	}

    	numberspinner6 = new dist({
    			props: numberspinner6_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(numberspinner6, "value", numberspinner6_value_binding));

    	const block = {
    		c: function create() {
    			h2 = element("h2");
    			h2.textContent = "Svelte Number Spinner Example";
    			t1 = space();
    			p = element("p");
    			t2 = text("Change the values of the number spinners through mousedrag and arrow keys. Press ");
    			i0 = element("i");
    			i0.textContent = "Alt";
    			t4 = text(" for smaller steps, ");
    			i1 = element("i");
    			i1.textContent = "Alt+Shift";
    			t6 = text(" for larger steps. Double click to edit.");
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
    			t15 = text("Range: 0 - 1000, only horizontal dragging and arrow keys left/right will change the value.");
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
    			t21 = text("Step = 0.01, precision = 2 decimals");
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
    			add_location(h2, file, 19, 0, 295);
    			add_location(i0, file, 24, 83, 488);
    			add_location(i1, file, 24, 113, 518);
    			add_location(p, file, 23, 0, 401);
    			attr_dev(hr0, "class", "svelte-hr784q");
    			add_location(hr0, file, 27, 0, 581);
    			add_location(br0, file, 30, 61, 666);
    			attr_dev(div0, "class", "explanation svelte-hr784q");
    			add_location(div0, file, 30, 2, 607);
    			attr_dev(div1, "class", "right svelte-hr784q");
    			add_location(div1, file, 31, 2, 705);
    			attr_dev(div2, "class", "row svelte-hr784q");
    			add_location(div2, file, 29, 0, 587);
    			attr_dev(hr1, "class", "svelte-hr784q");
    			add_location(hr1, file, 36, 0, 785);
    			add_location(br1, file, 39, 117, 926);
    			attr_dev(div3, "class", "explanation svelte-hr784q");
    			add_location(div3, file, 39, 2, 811);
    			attr_dev(div4, "class", "right svelte-hr784q");
    			add_location(div4, file, 40, 2, 965);
    			attr_dev(div5, "class", "row svelte-hr784q");
    			add_location(div5, file, 38, 0, 791);
    			attr_dev(hr2, "class", "svelte-hr784q");
    			add_location(hr2, file, 45, 0, 1077);
    			add_location(br2, file, 48, 62, 1163);
    			attr_dev(div6, "class", "explanation svelte-hr784q");
    			add_location(div6, file, 48, 2, 1103);
    			attr_dev(div7, "class", "right svelte-hr784q");
    			add_location(div7, file, 49, 2, 1202);
    			attr_dev(div8, "class", "row svelte-hr784q");
    			add_location(div8, file, 47, 0, 1083);
    			attr_dev(hr3, "class", "svelte-hr784q");
    			add_location(hr3, file, 54, 0, 1316);
    			add_location(br3, file, 57, 58, 1398);
    			attr_dev(div9, "class", "explanation svelte-hr784q");
    			add_location(div9, file, 57, 2, 1342);
    			attr_dev(div10, "class", "right svelte-hr784q");
    			add_location(div10, file, 58, 2, 1437);
    			attr_dev(div11, "class", "row svelte-hr784q");
    			add_location(div11, file, 56, 0, 1322);
    			attr_dev(hr4, "class", "svelte-hr784q");
    			add_location(hr4, file, 69, 0, 1748);
    			add_location(br4, file, 72, 65, 1837);
    			attr_dev(div12, "class", "explanation svelte-hr784q");
    			add_location(div12, file, 72, 2, 1774);
    			attr_dev(div13, "class", "right svelte-hr784q");
    			add_location(div13, file, 73, 2, 1876);
    			attr_dev(div14, "class", "row svelte-hr784q");
    			add_location(div14, file, 71, 0, 1754);
    			attr_dev(hr5, "class", "svelte-hr784q");
    			add_location(hr5, file, 80, 0, 2034);
    			add_location(br5, file, 84, 46, 2132);
    			add_location(br6, file, 85, 40, 2177);
    			attr_dev(div15, "class", "explanation svelte-hr784q");
    			add_location(div15, file, 83, 2, 2060);
    			attr_dev(div16, "class", "right svelte-hr784q");
    			add_location(div16, file, 88, 2, 2238);
    			attr_dev(div17, "class", "row svelte-hr784q");
    			add_location(div17, file, 82, 0, 2040);
    			attr_dev(hr6, "class", "svelte-hr784q");
    			add_location(hr6, file, 96, 0, 2442);
    			add_location(br7, file, 100, 63, 2557);
    			add_location(br8, file, 101, 35, 2597);
    			attr_dev(div18, "class", "explanation svelte-hr784q");
    			add_location(div18, file, 99, 2, 2468);
    			attr_dev(button0, "class", "svelte-hr784q");
    			add_location(button0, file, 103, 7, 2620);
    			attr_dev(div19, "class", "svelte-hr784q");
    			add_location(div19, file, 103, 2, 2615);
    			attr_dev(div20, "class", "right svelte-hr784q");
    			add_location(div20, file, 104, 2, 2675);
    			attr_dev(button1, "class", "svelte-hr784q");
    			add_location(button1, file, 107, 7, 2760);
    			attr_dev(div21, "class", "svelte-hr784q");
    			add_location(div21, file, 107, 2, 2755);
    			attr_dev(div22, "class", "row svelte-hr784q");
    			add_location(div22, file, 98, 0, 2448);
    			attr_dev(hr7, "class", "svelte-hr784q");
    			add_location(hr7, file, 110, 0, 2821);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h2, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, p, anchor);
    			append_dev(p, t2);
    			append_dev(p, i0);
    			append_dev(p, t4);
    			append_dev(p, i1);
    			append_dev(p, t6);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, hr0, anchor);
    			insert_dev(target, t8, anchor);
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, t9);
    			append_dev(div0, br0);
    			append_dev(div0, t10);
    			append_dev(div0, t11);
    			append_dev(div2, t12);
    			append_dev(div2, div1);
    			mount_component(numberspinner0, div1, null);
    			insert_dev(target, t13, anchor);
    			insert_dev(target, hr1, anchor);
    			insert_dev(target, t14, anchor);
    			insert_dev(target, div5, anchor);
    			append_dev(div5, div3);
    			append_dev(div3, t15);
    			append_dev(div3, br1);
    			append_dev(div3, t16);
    			append_dev(div3, t17);
    			append_dev(div5, t18);
    			append_dev(div5, div4);
    			mount_component(numberspinner1, div4, null);
    			insert_dev(target, t19, anchor);
    			insert_dev(target, hr2, anchor);
    			insert_dev(target, t20, anchor);
    			insert_dev(target, div8, anchor);
    			append_dev(div8, div6);
    			append_dev(div6, t21);
    			append_dev(div6, br2);
    			append_dev(div6, t22);
    			append_dev(div6, t23);
    			append_dev(div8, t24);
    			append_dev(div8, div7);
    			mount_component(numberspinner2, div7, null);
    			insert_dev(target, t25, anchor);
    			insert_dev(target, hr3, anchor);
    			insert_dev(target, t26, anchor);
    			insert_dev(target, div11, anchor);
    			append_dev(div11, div9);
    			append_dev(div9, t27);
    			append_dev(div9, br3);
    			append_dev(div9, t28);
    			append_dev(div9, t29);
    			append_dev(div11, t30);
    			append_dev(div11, div10);
    			mount_component(numberspinner3, div10, null);
    			insert_dev(target, t31, anchor);
    			insert_dev(target, hr4, anchor);
    			insert_dev(target, t32, anchor);
    			insert_dev(target, div14, anchor);
    			append_dev(div14, div12);
    			append_dev(div12, t33);
    			append_dev(div12, br4);
    			append_dev(div12, t34);
    			append_dev(div12, t35);
    			append_dev(div14, t36);
    			append_dev(div14, div13);
    			mount_component(numberspinner4, div13, null);
    			insert_dev(target, t37, anchor);
    			insert_dev(target, hr5, anchor);
    			insert_dev(target, t38, anchor);
    			insert_dev(target, div17, anchor);
    			append_dev(div17, div15);
    			append_dev(div15, t39);
    			append_dev(div15, br5);
    			append_dev(div15, t40);
    			append_dev(div15, t41);
    			append_dev(div15, br6);
    			append_dev(div15, t42);
    			append_dev(div15, t43);
    			append_dev(div17, t44);
    			append_dev(div17, div16);
    			mount_component(numberspinner5, div16, null);
    			insert_dev(target, t45, anchor);
    			insert_dev(target, hr6, anchor);
    			insert_dev(target, t46, anchor);
    			insert_dev(target, div22, anchor);
    			append_dev(div22, div18);
    			append_dev(div18, t47);
    			append_dev(div18, br7);
    			append_dev(div18, t48);
    			append_dev(div18, t49);
    			append_dev(div18, br8);
    			append_dev(div22, t50);
    			append_dev(div22, div19);
    			append_dev(div19, button0);
    			append_dev(div22, t52);
    			append_dev(div22, div20);
    			mount_component(numberspinner6, div20, null);
    			append_dev(div22, t53);
    			append_dev(div22, div21);
    			append_dev(div21, button1);
    			insert_dev(target, t55, anchor);
    			insert_dev(target, hr7, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler*/ ctx[16], false, false, false),
    					listen_dev(button1, "click", /*click_handler_1*/ ctx[18], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*value1*/ 1) set_data_dev(t11, /*value1*/ ctx[0]);
    			const numberspinner0_changes = {};

    			if (!updating_value && dirty & /*value1*/ 1) {
    				updating_value = true;
    				numberspinner0_changes.value = /*value1*/ ctx[0];
    				add_flush_callback(() => updating_value = false);
    			}

    			numberspinner0.$set(numberspinner0_changes);
    			if (!current || dirty & /*value2*/ 2) set_data_dev(t17, /*value2*/ ctx[1]);
    			const numberspinner1_changes = {};

    			if (!updating_value_1 && dirty & /*value2*/ 2) {
    				updating_value_1 = true;
    				numberspinner1_changes.value = /*value2*/ ctx[1];
    				add_flush_callback(() => updating_value_1 = false);
    			}

    			numberspinner1.$set(numberspinner1_changes);
    			if (!current || dirty & /*value3*/ 4) set_data_dev(t23, /*value3*/ ctx[2]);
    			const numberspinner2_changes = {};

    			if (!updating_value_2 && dirty & /*value3*/ 4) {
    				updating_value_2 = true;
    				numberspinner2_changes.value = /*value3*/ ctx[2];
    				add_flush_callback(() => updating_value_2 = false);
    			}

    			numberspinner2.$set(numberspinner2_changes);
    			if (!current || dirty & /*value4*/ 8) set_data_dev(t29, /*value4*/ ctx[3]);
    			const numberspinner3_changes = {};

    			if (!updating_value_3 && dirty & /*value4*/ 8) {
    				updating_value_3 = true;
    				numberspinner3_changes.value = /*value4*/ ctx[3];
    				add_flush_callback(() => updating_value_3 = false);
    			}

    			numberspinner3.$set(numberspinner3_changes);
    			if (!current || dirty & /*value5*/ 16) set_data_dev(t35, /*value5*/ ctx[4]);
    			const numberspinner4_changes = {};

    			if (!updating_value_4 && dirty & /*value5*/ 16) {
    				updating_value_4 = true;
    				numberspinner4_changes.value = /*value5*/ ctx[4];
    				add_flush_callback(() => updating_value_4 = false);
    			}

    			numberspinner4.$set(numberspinner4_changes);
    			if (!current || dirty & /*value6input*/ 32) set_data_dev(t41, /*value6input*/ ctx[5]);
    			if (!current || dirty & /*value6change*/ 64) set_data_dev(t43, /*value6change*/ ctx[6]);
    			if (!current || dirty & /*value7*/ 128) set_data_dev(t49, /*value7*/ ctx[7]);
    			const numberspinner6_changes = {};

    			if (!updating_value_5 && dirty & /*value7*/ 128) {
    				updating_value_5 = true;
    				numberspinner6_changes.value = /*value7*/ ctx[7];
    				add_flush_callback(() => updating_value_5 = false);
    			}

    			numberspinner6.$set(numberspinner6_changes);
    		},
    		i: function intro(local) {
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
    		o: function outro(local) {
    			transition_out(numberspinner0.$$.fragment, local);
    			transition_out(numberspinner1.$$.fragment, local);
    			transition_out(numberspinner2.$$.fragment, local);
    			transition_out(numberspinner3.$$.fragment, local);
    			transition_out(numberspinner4.$$.fragment, local);
    			transition_out(numberspinner5.$$.fragment, local);
    			transition_out(numberspinner6.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h2);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(p);
    			if (detaching) detach_dev(t7);
    			if (detaching) detach_dev(hr0);
    			if (detaching) detach_dev(t8);
    			if (detaching) detach_dev(div2);
    			destroy_component(numberspinner0);
    			if (detaching) detach_dev(t13);
    			if (detaching) detach_dev(hr1);
    			if (detaching) detach_dev(t14);
    			if (detaching) detach_dev(div5);
    			destroy_component(numberspinner1);
    			if (detaching) detach_dev(t19);
    			if (detaching) detach_dev(hr2);
    			if (detaching) detach_dev(t20);
    			if (detaching) detach_dev(div8);
    			destroy_component(numberspinner2);
    			if (detaching) detach_dev(t25);
    			if (detaching) detach_dev(hr3);
    			if (detaching) detach_dev(t26);
    			if (detaching) detach_dev(div11);
    			destroy_component(numberspinner3);
    			if (detaching) detach_dev(t31);
    			if (detaching) detach_dev(hr4);
    			if (detaching) detach_dev(t32);
    			if (detaching) detach_dev(div14);
    			destroy_component(numberspinner4);
    			if (detaching) detach_dev(t37);
    			if (detaching) detach_dev(hr5);
    			if (detaching) detach_dev(t38);
    			if (detaching) detach_dev(div17);
    			destroy_component(numberspinner5);
    			if (detaching) detach_dev(t45);
    			if (detaching) detach_dev(hr6);
    			if (detaching) detach_dev(t46);
    			if (detaching) detach_dev(div22);
    			destroy_component(numberspinner6);
    			if (detaching) detach_dev(t55);
    			if (detaching) detach_dev(hr7);
    			mounted = false;
    			run_all(dispose);
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
    	let value5 = 0.5;
    	let value6 = 50;
    	let value6input = value6;
    	let value6change = value6;
    	let value7 = 0;
    	let name = "hallo";
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

    	$$self.$capture_state = () => ({
    		NumberSpinner: dist,
    		value1,
    		value2,
    		value3,
    		value4,
    		value5,
    		value6,
    		value6input,
    		value6change,
    		value7,
    		name
    	});

    	$$self.$inject_state = $$props => {
    		if ("value1" in $$props) $$invalidate(0, value1 = $$props.value1);
    		if ("value2" in $$props) $$invalidate(1, value2 = $$props.value2);
    		if ("value3" in $$props) $$invalidate(2, value3 = $$props.value3);
    		if ("value4" in $$props) $$invalidate(3, value4 = $$props.value4);
    		if ("value5" in $$props) $$invalidate(4, value5 = $$props.value5);
    		if ("value6" in $$props) $$invalidate(8, value6 = $$props.value6);
    		if ("value6input" in $$props) $$invalidate(5, value6input = $$props.value6input);
    		if ("value6change" in $$props) $$invalidate(6, value6change = $$props.value6change);
    		if ("value7" in $$props) $$invalidate(7, value7 = $$props.value7);
    		if ("name" in $$props) name = $$props.name;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		value1,
    		value2,
    		value3,
    		value4,
    		value5,
    		value6input,
    		value6change,
    		value7,
    		value6,
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
