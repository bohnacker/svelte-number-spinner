
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
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
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
        	style.id = "svelte-17pi914-style";
        	style.textContent = ".default.svelte-17pi914{display:inline-block;box-sizing:border-box;font-variant-numeric:tabular-nums;background-color:white;color:black;width:4em;height:1.6em;margin:0px;padding:5px;border:1 solid #0004;border-radius:4px;text-align:right;cursor:initial}.default.svelte-17pi914:focus{border:1px solid #06f;outline:none}.default.fast.svelte-17pi914{color:tomato}.default.slow.svelte-17pi914{color:green}.default.editing.svelte-17pi914{border:2px solid #06f;padding:3px;cursor:default}input.svelte-17pi914{user-select:none}input.svelte-17pi914:not(.editing)::selection{background:#0000}input.editing.svelte-17pi914{user-select:text}input.hide.svelte-17pi914{opacity:0.2}";
        	append(document.head, style);
        }

        function create_fragment(ctx) {
        	let t0;
        	let input0;
        	let input0_pattern_value;
        	let input0_class_value;
        	let t1;
        	let input1;
        	let input1_class_value;
        	let mounted;
        	let dispose;

        	return {
        		c() {
        			t0 = space();
        			input0 = element("input");
        			t1 = space();
        			input1 = element("input");
        			attr(input0, "id", "edit");
        			attr(input0, "type", "text");

        			attr(input0, "pattern", input0_pattern_value = /*min*/ ctx[0] >= 0 && /*step*/ ctx[1] == Math.round(/*step*/ ctx[1])
        			? "[0-9]+"
        			: undefined);

        			attr(input0, "style", /*style*/ ctx[8]);
        			attr(input0, "class", input0_class_value = "" + (null_to_empty(/*$$props*/ ctx[21].class) + " svelte-17pi914"));
        			attr(input0, "tabindex", -1);
        			toggle_class(input0, "default", !/*$$props*/ ctx[21].class ? true : false);
        			toggle_class(input0, "fast", /*stepFactor*/ ctx[3] > 1 ? "fast" : "");
        			toggle_class(input0, "slow", /*stepFactor*/ ctx[3] < 1 ? "slow" : "");
        			toggle_class(input0, "editing", /*editing*/ ctx[4]);
        			toggle_class(input0, "edit", true);
        			toggle_class(input0, "hide", !/*editing*/ ctx[4]);
        			attr(input1, "id", "drag");
        			attr(input1, "type", "text");
        			attr(input1, "style", /*style*/ ctx[8]);
        			attr(input1, "class", input1_class_value = "" + (null_to_empty(/*$$props*/ ctx[21].class) + " svelte-17pi914"));
        			attr(input1, "contenteditable", false);
        			input1.readOnly = "";
        			attr(input1, "tabindex", "0");
        			toggle_class(input1, "default", !/*$$props*/ ctx[21].class ? true : false);
        			toggle_class(input1, "fast", /*stepFactor*/ ctx[3] > 1 ? "fast" : "");
        			toggle_class(input1, "slow", /*stepFactor*/ ctx[3] < 1 ? "slow" : "");
        			toggle_class(input1, "drag", true);
        			toggle_class(input1, "hide", /*editing*/ ctx[4]);
        		},
        		m(target, anchor) {
        			insert(target, t0, anchor);
        			insert(target, input0, anchor);
        			set_input_value(input0, /*visibleValue*/ ctx[7]);
        			/*input0_binding*/ ctx[36](input0);
        			insert(target, t1, anchor);
        			insert(target, input1, anchor);
        			set_input_value(input1, /*visibleValue*/ ctx[7]);
        			/*input1_binding*/ ctx[38](input1);

        			if (!mounted) {
        				dispose = [
        					listen(window, "mousemove", function () {
        						if (is_function(/*dragging*/ ctx[6] ? /*mousemoveHandler*/ ctx[10] : "")) (/*dragging*/ ctx[6] ? /*mousemoveHandler*/ ctx[10] : "").apply(this, arguments);
        					}),
        					listen(window, "touchmove", function () {
        						if (is_function(/*dragging*/ ctx[6] ? /*mousemoveHandler*/ ctx[10] : "")) (/*dragging*/ ctx[6] ? /*mousemoveHandler*/ ctx[10] : "").apply(this, arguments);
        					}),
        					listen(window, "mouseup", function () {
        						if (is_function(/*dragging*/ ctx[6] ? /*mouseupHandler*/ ctx[11] : "")) (/*dragging*/ ctx[6] ? /*mouseupHandler*/ ctx[11] : "").apply(this, arguments);
        					}),
        					listen(window, "touchend", function () {
        						if (is_function(/*dragging*/ ctx[6] ? /*mouseupHandler*/ ctx[11] : "")) (/*dragging*/ ctx[6] ? /*mouseupHandler*/ ctx[11] : "").apply(this, arguments);
        					}),
        					listen(window, "mousedown", function () {
        						if (is_function(/*editing*/ ctx[4] ? /*windowdownHandler*/ ctx[13] : "")) (/*editing*/ ctx[4] ? /*windowdownHandler*/ ctx[13] : "").apply(this, arguments);
        					}),
        					listen(window, "touchstart", function () {
        						if (is_function(/*editing*/ ctx[4] ? /*windowdownHandler*/ ctx[13] : "")) (/*editing*/ ctx[4] ? /*windowdownHandler*/ ctx[13] : "").apply(this, arguments);
        					}),
        					listen(window, "keydown", /*keydownHandler*/ ctx[19]),
        					listen(window, "keyup", /*keyupHandler*/ ctx[20]),
        					listen(input0, "mousedown", stop_propagation(mousedown_handler)),
        					listen(input0, "touchstart", stop_propagation(touchstart_handler), { passive: true }),
        					listen(input0, "input", /*inputHandler*/ ctx[18]),
        					listen(input0, "focus", /*editFocusHandler*/ ctx[16]),
        					listen(input0, "blur", /*editBlurHandler*/ ctx[17]),
        					listen(input0, "input", /*input0_input_handler*/ ctx[35]),
        					listen(input1, "mouseenter", mouseenterHandler),
        					listen(input1, "mouseleave", mouseleaveHandler),
        					listen(input1, "mousedown", stop_propagation(/*mousedownHandler*/ ctx[9])),
        					listen(input1, "touchstart", stop_propagation(/*mousedownHandler*/ ctx[9])),
        					listen(input1, "dblclick", stop_propagation(/*dblclickHandler*/ ctx[12])),
        					listen(input1, "focus", /*dragFocusHandler*/ ctx[14]),
        					listen(input1, "blur", /*dragBlurHandler*/ ctx[15]),
        					listen(input1, "input", /*inputHandler*/ ctx[18]),
        					listen(input1, "input", /*input1_input_handler*/ ctx[37])
        				];

        				mounted = true;
        			}
        		},
        		p(new_ctx, dirty) {
        			ctx = new_ctx;

        			if (dirty[0] & /*min, step*/ 3 && input0_pattern_value !== (input0_pattern_value = /*min*/ ctx[0] >= 0 && /*step*/ ctx[1] == Math.round(/*step*/ ctx[1])
        			? "[0-9]+"
        			: undefined)) {
        				attr(input0, "pattern", input0_pattern_value);
        			}

        			if (dirty[0] & /*style*/ 256) {
        				attr(input0, "style", /*style*/ ctx[8]);
        			}

        			if (dirty[0] & /*$$props*/ 2097152 && input0_class_value !== (input0_class_value = "" + (null_to_empty(/*$$props*/ ctx[21].class) + " svelte-17pi914"))) {
        				attr(input0, "class", input0_class_value);
        			}

        			if (dirty[0] & /*visibleValue*/ 128 && input0.value !== /*visibleValue*/ ctx[7]) {
        				set_input_value(input0, /*visibleValue*/ ctx[7]);
        			}

        			if (dirty[0] & /*$$props, $$props*/ 2097152) {
        				toggle_class(input0, "default", !/*$$props*/ ctx[21].class ? true : false);
        			}

        			if (dirty[0] & /*$$props, stepFactor*/ 2097160) {
        				toggle_class(input0, "fast", /*stepFactor*/ ctx[3] > 1 ? "fast" : "");
        			}

        			if (dirty[0] & /*$$props, stepFactor*/ 2097160) {
        				toggle_class(input0, "slow", /*stepFactor*/ ctx[3] < 1 ? "slow" : "");
        			}

        			if (dirty[0] & /*$$props, editing*/ 2097168) {
        				toggle_class(input0, "editing", /*editing*/ ctx[4]);
        			}

        			if (dirty[0] & /*$$props*/ 2097152) {
        				toggle_class(input0, "edit", true);
        			}

        			if (dirty[0] & /*$$props, editing*/ 2097168) {
        				toggle_class(input0, "hide", !/*editing*/ ctx[4]);
        			}

        			if (dirty[0] & /*style*/ 256) {
        				attr(input1, "style", /*style*/ ctx[8]);
        			}

        			if (dirty[0] & /*$$props*/ 2097152 && input1_class_value !== (input1_class_value = "" + (null_to_empty(/*$$props*/ ctx[21].class) + " svelte-17pi914"))) {
        				attr(input1, "class", input1_class_value);
        			}

        			if (dirty[0] & /*visibleValue*/ 128 && input1.value !== /*visibleValue*/ ctx[7]) {
        				set_input_value(input1, /*visibleValue*/ ctx[7]);
        			}

        			if (dirty[0] & /*$$props, $$props*/ 2097152) {
        				toggle_class(input1, "default", !/*$$props*/ ctx[21].class ? true : false);
        			}

        			if (dirty[0] & /*$$props, stepFactor*/ 2097160) {
        				toggle_class(input1, "fast", /*stepFactor*/ ctx[3] > 1 ? "fast" : "");
        			}

        			if (dirty[0] & /*$$props, stepFactor*/ 2097160) {
        				toggle_class(input1, "slow", /*stepFactor*/ ctx[3] < 1 ? "slow" : "");
        			}

        			if (dirty[0] & /*$$props*/ 2097152) {
        				toggle_class(input1, "drag", true);
        			}

        			if (dirty[0] & /*$$props, editing*/ 2097168) {
        				toggle_class(input1, "hide", /*editing*/ ctx[4]);
        			}
        		},
        		i: noop,
        		o: noop,
        		d(detaching) {
        			if (detaching) detach(t0);
        			if (detaching) detach(input0);
        			/*input0_binding*/ ctx[36](null);
        			if (detaching) detach(t1);
        			if (detaching) detach(input1);
        			/*input1_binding*/ ctx[38](null);
        			mounted = false;
        			run_all(dispose);
        		}
        	};
        }

        // window.setTimeout(() => {
        //   console.log('timeout focus')
        //   dragElement.focus();      
        // }, Math.random() * 4000);
        // handlers --------------------------------
        function mouseenterHandler(e) {
        	
        } // seems not to be very practical to have focus on rollover:
        // dragElement?.focus();

        function mouseleaveHandler(e) {
        	
        }

        const mousedown_handler = () => {
        	
        };

        const touchstart_handler = () => {
        	
        };

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
        	let dragElement, editElement;
        	let dragFocussed = false;
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
        		dispatch("consoleLog", "down " + e.target.id);

        		// console.log('down');
        		if (editing) {
        			e.stopPropagation();
        		} else {
        			clickX = e.clientX;
        			clickY = e.clientY;

        			if (e.type == "touchstart") {
        				clickX = e.touches[0].clientX;
        				clickY = e.touches[0].clientY;
        			}

        			$$invalidate(6, dragging = true);
        			preciseValue = setValue(value);
        		} //console.log(e.clientX, e.clientY);
        	}

        	function mousemoveHandler(e) {
        		e.preventDefault();
        		let actX = e.clientX;
        		let actY = e.clientY;

        		if (e.type == "touchmove") {
        			actX = e.touches[0].clientX;
        			actY = e.touches[0].clientY;
        		}

        		let distX = horizontal ? actX - clickX : 0;
        		let distY = vertical ? -(actY - clickY) : 0;
        		let stepNum = Math.abs(distX) > Math.abs(distY) ? distX : distY;
        		stepValue(stepNum);
        		clickX = actX;
        		clickY = actY;
        	}

        	function mouseupHandler(e) {
        		dispatch("consoleLog", "up " + e.target.id);

        		// console.log('up');
        		$$invalidate(6, dragging = false);

        		$$invalidate(3, stepFactor = 1);
        	}

        	function dblclickHandler(e) {
        		dispatch("consoleLog", "dblClick " + e.target.id);
        		startEditing();
        	} // dragElement.focus();

        	function windowdownHandler(e) {
        		dispatch("consoleLog", "down window");

        		// console.log('window mousedown');
        		stopEditing();
        	}

        	function dragFocusHandler(e) {
        		dispatch("consoleLog", "focus " + e.target.id);

        		// // console.log(dragElement);
        		$$invalidate(32, dragFocussed = true);
        	} // if (!justStartedEditing) {
        	//   stopEditing();      

        	// }
        	// justStartedEditing = false;
        	function dragBlurHandler(e) {
        		dispatch("consoleLog", "blur " + e.target.id);
        		console.log("blur " + e.target.id);
        		$$invalidate(32, dragFocussed = false);
        	} // if (!justStartedEditing) {
        	//   stopEditing();      

        	// }
        	function editFocusHandler(e) {
        		dispatch("consoleLog", "focus " + e.target.id);
        	} // if (!justStartedEditing) {
        	//   stopEditing();      

        	// }
        	// justStartedEditing = false;
        	function editBlurHandler(e) {
        		dispatch("consoleLog", "blur " + e.target.id);
        		console.log("blur " + e.target.id);
        	} // if (!justStartedEditing) {
        	//   stopEditing();      

        	// }
        	function inputHandler(e) {
        		// console.log(e);
        		let checkValue = parseFloat(dragElement.value);

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
        			$$invalidate(34, shiftPressed = true);
        		}

        		if (e.key == "Alt") {
        			$$invalidate(33, altPressed = true);
        		}
        	}

        	function keyupHandler(e) {
        		// console.log(e)
        		if (e.key == "Shift") {
        			$$invalidate(34, shiftPressed = false);
        		}

        		if (e.key == "Alt") {
        			$$invalidate(33, altPressed = false);
        		}

        		if (dragFocussed) {
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
        		val = parseFloat(val);
        		if (!isNaN(val)) preciseValue = val;
        		preciseValue = Math.min(preciseValue, max);
        		preciseValue = Math.max(preciseValue, min);
        		$$invalidate(7, visibleValue = preciseValue.toFixed(decimals));
        		$$invalidate(22, value = preciseValue.toFixed(decimals));
        		dispatch("input", value);
        		dispatch("change", value);
        	}

        	function stepValue(numSteps) {
        		preciseValue = preciseValue ?? parseFloat(visibleValue);
        		preciseValue += numSteps * step * stepFactor;
        		preciseValue = Math.min(preciseValue, max);
        		preciseValue = Math.max(preciseValue, min);
        		$$invalidate(7, visibleValue = preciseValue.toFixed(decimals));
        		$$invalidate(22, value = preciseValue.toFixed(decimals));
        		dispatch("input", value);
        		dispatch("change", value);
        	}

        	async function startEditing() {
        		// console.log('startEditing')
        		// justStartedEditing = true;
        		preciseValue = parseFloat(visibleValue);

        		$$invalidate(4, editing = true);
        		editElement.setSelectionRange(0, 30);
        		editElement.focus();
        	} // window.setTimeout(() => {
        	//   console.log('timeout blur')

        	//   dragElement.blur();
        	//   window.setTimeout(() => {
        	//     console.log('timeout focus')
        	//     dragElement.focus();      
        	//   }, 1000);
        	// }, 1000);
        	function stopEditing() {
        		console.log("stopEditing");
        		dispatch("consoleLog", "stopEditing");
        		$$invalidate(4, editing = false);
        		editElement.setSelectionRange(0, 0);

        		// dragElement.focus();
        		setValue(visibleValue);
        	}

        	function input0_input_handler() {
        		visibleValue = this.value;
        		$$invalidate(7, visibleValue);
        	}

        	function input0_binding($$value) {
        		binding_callbacks[$$value ? "unshift" : "push"](() => {
        			editElement = $$value;
        			$$invalidate(5, editElement);
        		});
        	}

        	function input1_input_handler() {
        		visibleValue = this.value;
        		$$invalidate(7, visibleValue);
        	}

        	function input1_binding($$value) {
        		binding_callbacks[$$value ? "unshift" : "push"](() => {
        			dragElement = $$value;
        			$$invalidate(2, dragElement);
        		});
        	}

        	$$self.$$set = $$new_props => {
        		$$invalidate(21, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
        		if ("value" in $$new_props) $$invalidate(22, value = $$new_props.value);
        		if ("min" in $$new_props) $$invalidate(0, min = $$new_props.min);
        		if ("max" in $$new_props) $$invalidate(23, max = $$new_props.max);
        		if ("step" in $$new_props) $$invalidate(1, step = $$new_props.step);
        		if ("decimals" in $$new_props) $$invalidate(24, decimals = $$new_props.decimals);
        		if ("horizontal" in $$new_props) $$invalidate(25, horizontal = $$new_props.horizontal);
        		if ("vertical" in $$new_props) $$invalidate(26, vertical = $$new_props.vertical);
        		if ("mainStyle" in $$new_props) $$invalidate(27, mainStyle = $$new_props.mainStyle);
        		if ("fastStyle" in $$new_props) $$invalidate(28, fastStyle = $$new_props.fastStyle);
        		if ("slowStyle" in $$new_props) $$invalidate(29, slowStyle = $$new_props.slowStyle);
        		if ("focusStyle" in $$new_props) $$invalidate(30, focusStyle = $$new_props.focusStyle);
        		if ("editingStyle" in $$new_props) $$invalidate(31, editingStyle = $$new_props.editingStyle);
        	};

        	$$self.$$.update = () => {
        		if ($$self.$$.dirty[0] & /*dragElement*/ 4) {
        			// updaters --------------------------------
        			// update readonly state of input element
        			 if (dragElement) {
        				// dragElement.readOnly = !editing;
        				$$invalidate(2, dragElement.readOnly = true, dragElement);
        			}
        		}

        		if ($$self.$$.dirty[0] & /*editing*/ 16 | $$self.$$.dirty[1] & /*dragFocussed, altPressed, shiftPressed*/ 14) {
        			// update stepFactor
        			 {
        				$$invalidate(3, stepFactor = 1);

        				if (dragFocussed && !editing) {
        					if (altPressed && shiftPressed) {
        						$$invalidate(3, stepFactor = 10);
        					} else if (altPressed) {
        						$$invalidate(3, stepFactor = 0.1);
        					}
        				}
        			}
        		}

        		if ($$self.$$.dirty[0] & /*mainStyle, style, focusStyle, editing, stepFactor, fastStyle, slowStyle*/ 2013266200 | $$self.$$.dirty[1] & /*dragFocussed, editingStyle*/ 3) {
        			// update inline style string
        			 {
        				$$invalidate(8, style = mainStyle ?? "");
        				$$invalidate(8, style += dragFocussed && focusStyle ? ";" + focusStyle : "");

        				$$invalidate(8, style += !editing && stepFactor > 1 && fastStyle
        				? ";" + fastStyle
        				: "");

        				$$invalidate(8, style += !editing && stepFactor < 1 && slowStyle
        				? ";" + slowStyle
        				: "");

        				$$invalidate(8, style += editing && editingStyle ? ";" + editingStyle : "");
        			}
        		}
        	};

        	$$props = exclude_internal_props($$props);

        	return [
        		min,
        		step,
        		dragElement,
        		stepFactor,
        		editing,
        		editElement,
        		dragging,
        		visibleValue,
        		style,
        		mousedownHandler,
        		mousemoveHandler,
        		mouseupHandler,
        		dblclickHandler,
        		windowdownHandler,
        		dragFocusHandler,
        		dragBlurHandler,
        		editFocusHandler,
        		editBlurHandler,
        		inputHandler,
        		keydownHandler,
        		keyupHandler,
        		$$props,
        		value,
        		max,
        		decimals,
        		horizontal,
        		vertical,
        		mainStyle,
        		fastStyle,
        		slowStyle,
        		focusStyle,
        		editingStyle,
        		dragFocussed,
        		altPressed,
        		shiftPressed,
        		input0_input_handler,
        		input0_binding,
        		input1_input_handler,
        		input1_binding
        	];
        }

        class NumberSpinner extends SvelteComponent {
        	constructor(options) {
        		super();
        		if (!document.getElementById("svelte-17pi914-style")) add_css();

        		init(
        			this,
        			options,
        			instance,
        			create_fragment,
        			safe_not_equal,
        			{
        				value: 22,
        				min: 0,
        				max: 23,
        				step: 1,
        				decimals: 24,
        				horizontal: 25,
        				vertical: 26,
        				mainStyle: 27,
        				fastStyle: 28,
        				slowStyle: 29,
        				focusStyle: 30,
        				editingStyle: 31
        			},
        			[-1, -1]
        		);
        	}
        }

        return NumberSpinner;

    })));
    });

    /* example/src/App2.svelte generated by Svelte v3.31.2 */
    const file = "example/src/App2.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[4] = list[i];
    	return child_ctx;
    }

    // (18:2) {#each logs as log}
    function create_each_block(ctx) {
    	let t_value = /*log*/ ctx[4] + "";
    	let t;
    	let br;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    			br = element("br");
    			add_location(br, file, 18, 9, 334);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    			insert_dev(target, br, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*logs*/ 2 && t_value !== (t_value = /*log*/ ctx[4] + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(br);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(18:2) {#each logs as log}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div0;
    	let numberspinner;
    	let updating_value;
    	let t0;
    	let hr;
    	let t1;
    	let div1;
    	let current;

    	function numberspinner_value_binding(value) {
    		/*numberspinner_value_binding*/ ctx[2].call(null, value);
    	}

    	let numberspinner_props = {};

    	if (/*value1*/ ctx[0] !== void 0) {
    		numberspinner_props.value = /*value1*/ ctx[0];
    	}

    	numberspinner = new dist({
    			props: numberspinner_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(numberspinner, "value", numberspinner_value_binding));
    	numberspinner.$on("consoleLog", /*consoleLog_handler*/ ctx[3]);
    	let each_value = /*logs*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			create_component(numberspinner.$$.fragment);
    			t0 = space();
    			hr = element("hr");
    			t1 = space();
    			div1 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div0, "class", "row svelte-1ntkr60");
    			add_location(div0, file, 10, 0, 159);
    			attr_dev(hr, "class", "svelte-1ntkr60");
    			add_location(hr, file, 14, 0, 275);
    			attr_dev(div1, "class", "console svelte-1ntkr60");
    			add_location(div1, file, 16, 0, 281);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			mount_component(numberspinner, div0, null);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, hr, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div1, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const numberspinner_changes = {};

    			if (!updating_value && dirty & /*value1*/ 1) {
    				updating_value = true;
    				numberspinner_changes.value = /*value1*/ ctx[0];
    				add_flush_callback(() => updating_value = false);
    			}

    			numberspinner.$set(numberspinner_changes);

    			if (dirty & /*logs*/ 2) {
    				each_value = /*logs*/ ctx[1];
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
    			transition_in(numberspinner.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(numberspinner.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			destroy_component(numberspinner);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(hr);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div1);
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
    	let logs = [];
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App2> was created with unknown prop '${key}'`);
    	});

    	function numberspinner_value_binding(value) {
    		value1 = value;
    		$$invalidate(0, value1);
    	}

    	const consoleLog_handler = e => $$invalidate(1, logs = [...logs, e.detail]);
    	$$self.$capture_state = () => ({ NumberSpinner: dist, value1, logs });

    	$$self.$inject_state = $$props => {
    		if ("value1" in $$props) $$invalidate(0, value1 = $$props.value1);
    		if ("logs" in $$props) $$invalidate(1, logs = $$props.logs);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [value1, logs, numberspinner_value_binding, consoleLog_handler];
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
